const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const persistentDir = process.env.PLAYER_DATA_DIR || path.join(__dirname, "data");
const fallbackDir = path.join(__dirname, "data");

const PULL_SLOT_SCHEMA_VERSION = 4;
const PLAYER_STORE_MODE = String(process.env.PLAYER_STORE_MODE || "").toLowerCase();
const USE_POSTGRES = PLAYER_STORE_MODE === "postgres" && Boolean(process.env.DATABASE_URL);

let playersCache = null;
let persistedCache = {};
let dbPool = null;
let dbReady = false;

function cloneJson(value) {
  return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : {};
}

function setPlayersCache(value) {
  playersCache = value && typeof value === "object" ? value : {};
  return playersCache;
}

function setPersistedCache(value) {
  persistedCache = cloneJson(value || {});
  return persistedCache;
}

function getDbPool() {
  if (!USE_POSTGRES) return null;

  if (!dbPool) {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.PLAYER_DB_POOL_MAX || 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    dbPool.on("error", (error) => {
      console.error("[PLAYER DB POOL ERROR]", error);
    });
  }

  return dbPool;
}

async function ensurePlayersTable() {
  const pool = getDbPool();
  if (!pool) return;

  await pool.query(`
    create table if not exists players (
      user_id text primary key,
      username text,
      data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    create index if not exists players_username_idx
    on players (username);
  `);

  await pool.query(`
    create index if not exists players_updated_at_idx
    on players (updated_at);
  `);
}

async function loadPlayersFromPostgres() {
  const pool = getDbPool();
  if (!pool) return {};

  await ensurePlayersTable();

  const result = await pool.query("select user_id, data from players");
  const players = {};

  for (const row of result.rows || []) {
    players[String(row.user_id)] = row.data || {};
  }

  return players;
}

async function getPlayerFromPostgres(userId) {
  const pool = getDbPool();
  if (!pool || !dbReady) return null;

  await ensurePlayersTable();

  const result = await pool.query(
    "select data from players where user_id = $1 limit 1",
    [String(userId)]
  );

  return result.rows?.[0]?.data || null;
}

async function upsertOnePlayerToPostgres(userId, data) {
  const pool = getDbPool();
  if (!pool || !dbReady) return false;

  await ensurePlayersTable();

  await pool.query(
    `
    insert into players (user_id, username, data, updated_at)
    values ($1, $2, $3::jsonb, now())
    on conflict (user_id) do update
    set username = excluded.username,
        data = excluded.data,
        updated_at = now()
    `,
    [String(userId), data?.username || "Unknown", JSON.stringify(data || {})]
  );

  return true;
}

async function updateOnePlayerInPostgresAtomic(userId, username, mutator) {
  const pool = getDbPool();
  if (!pool || !dbReady) return null;

  await ensurePlayersTable();

  const id = String(userId);
  const client = await pool.connect();

  try {
    await client.query("begin");

    const selected = await client.query(
      "select data from players where user_id = $1 for update",
      [id]
    );

    const dbPlayer = selected.rows?.[0]?.data || null;
    const currentPlayer = dbPlayer
      ? normalizePlayer(dbPlayer, username)
      : getDefaultPlayer(username);

    const result =
      typeof mutator === "function" ? mutator(cloneJson(currentPlayer)) : currentPlayer;

    const nextPlayer = normalizePlayer(
      result || currentPlayer,
      currentPlayer.username || username
    );

    await client.query(
      `
      insert into players (user_id, username, data, updated_at)
      values ($1, $2, $3::jsonb, now())
      on conflict (user_id) do update
      set username = excluded.username,
          data = excluded.data,
          updated_at = now()
      `,
      [id, nextPlayer.username || username || "Unknown", JSON.stringify(nextPlayer)]
    );

    await client.query("commit");

    const players = readPlayers();
    players[id] = nextPlayer;
    setPersistedCache({
      ...(persistedCache || {}),
      [id]: nextPlayer,
    });
    writePlayersLocalBackupOnly(players);

    return nextPlayer;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("[PLAYER DB ATOMIC UPDATE ERROR]", error);
    return null;
  } finally {
    client.release();
  }
}

async function updateTwoPlayersInPostgresAtomic(
  userIdA,
  userIdB,
  usernameA,
  usernameB,
  mutator
) {
  const pool = getDbPool();
  if (!pool || !dbReady) return null;

  await ensurePlayersTable();

  const idA = String(userIdA);
  const idB = String(userIdB);
  const ids = [idA, idB].sort();

  const client = await pool.connect();

  try {
    await client.query("begin");

    const selected = await client.query(
      "select user_id, data from players where user_id = any($1::text[]) for update",
      [ids]
    );

    const map = new Map(
      (selected.rows || []).map((row) => [String(row.user_id), row.data || {}])
    );

    const playerA = map.has(idA)
      ? normalizePlayer(map.get(idA), usernameA)
      : getDefaultPlayer(usernameA);

    const playerB = map.has(idB)
      ? normalizePlayer(map.get(idB), usernameB)
      : getDefaultPlayer(usernameB);

    const result =
      typeof mutator === "function"
        ? mutator(cloneJson(playerA), cloneJson(playerB))
        : { playerA, playerB };

    const nextA = normalizePlayer(result?.playerA || playerA, playerA.username || usernameA);
    const nextB = normalizePlayer(result?.playerB || playerB, playerB.username || usernameB);

    await client.query(
      `
      insert into players (user_id, username, data, updated_at)
      values ($1, $2, $3::jsonb, now())
      on conflict (user_id) do update
      set username = excluded.username,
          data = excluded.data,
          updated_at = now()
      `,
      [idA, nextA.username || usernameA || "Unknown", JSON.stringify(nextA)]
    );

    await client.query(
      `
      insert into players (user_id, username, data, updated_at)
      values ($1, $2, $3::jsonb, now())
      on conflict (user_id) do update
      set username = excluded.username,
          data = excluded.data,
          updated_at = now()
      `,
      [idB, nextB.username || usernameB || "Unknown", JSON.stringify(nextB)]
    );

    await client.query("commit");

    const players = readPlayers();
    players[idA] = nextA;
    players[idB] = nextB;
    setPersistedCache({
      ...(persistedCache || {}),
      [idA]: nextA,
      [idB]: nextB,
    });
    writePlayersLocalBackupOnly(players);

    return {
      playerA: nextA,
      playerB: nextB,
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("[PLAYER DB ATOMIC TWO UPDATE ERROR]", error);
    return null;
  } finally {
    client.release();
  }
}

async function flushChangedPlayersToPostgres(data) {
  if (!USE_POSTGRES || !dbReady) return;

  const safeData = data && typeof data === "object" ? data : {};
  const changed = [];

  for (const [userId, player] of Object.entries(safeData)) {
    const before = JSON.stringify(persistedCache?.[userId] || null);
    const after = JSON.stringify(player || null);

    if (before !== after) {
      changed.push([userId, player]);
    }
  }

  if (!changed.length) return;

  for (const [userId, player] of changed) {
    await upsertOnePlayerToPostgres(userId, normalizePlayer(player, player?.username || "Unknown"));
    persistedCache[userId] = cloneJson(player);
  }
}

function resolveFilePath() {
  try {
    fs.mkdirSync(persistentDir, { recursive: true });
    return path.join(persistentDir, "players.json");
  } catch (error) {
    console.warn("Could not use persistent player data dir, falling back to local data dir.", error);
    fs.mkdirSync(fallbackDir, { recursive: true });
    return path.join(fallbackDir, "players.json");
  }
}

const filePath = resolveFilePath();

function getLastGoodBackupPath() {
  return `${filePath}.lastgood.bak`;
}

function ensureFile() {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "{}", "utf8");
  }
}

function safeParseJson(raw) {
  if (!raw || !String(raw).trim()) return {};
  return JSON.parse(raw);
}

function readBackupPlayers() {
  const backupPath = getLastGoodBackupPath();
  if (!fs.existsSync(backupPath)) return {};

  try {
    return safeParseJson(fs.readFileSync(backupPath, "utf8"));
  } catch (error) {
    console.error("Failed to read last-good players backup.", error);
    return {};
  }
}

function readPlayers() {
  if (playersCache) return playersCache;

  ensureFile();

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return setPlayersCache(safeParseJson(raw));
  } catch (error) {
    console.error("players.json is invalid. Trying last-good backup.", error);

    try {
      const brokenRaw = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
      fs.writeFileSync(`${filePath}.broken.${Date.now()}.bak`, brokenRaw, "utf8");
    } catch (backupError) {
      console.error("Failed to back up broken players.json.", backupError);
    }

    const backupPlayers = readBackupPlayers();

    if (backupPlayers && Object.keys(backupPlayers).length > 0) {
      try {
        writePlayersLocalBackupOnly(backupPlayers);
      } catch (restoreError) {
        console.error("Failed to restore last-good players backup.", restoreError);
      }

      return setPlayersCache(backupPlayers);
    }

    return setPlayersCache({});
  }
}

function writePlayersLocalBackupOnly(data) {
  ensureFile();

  const safeData = data && typeof data === "object" ? data : {};
  setPlayersCache(safeData);

  const serialized = JSON.stringify(safeData, null, 2);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;

  fs.writeFileSync(tempPath, serialized, "utf8");
  fs.renameSync(tempPath, filePath);

  try {
    fs.writeFileSync(getLastGoodBackupPath(), serialized, "utf8");
  } catch (error) {
    console.error("Failed to write last-good players backup.", error);
  }
}

function writePlayers(data) {
  const safeData = data && typeof data === "object" ? data : {};

  writePlayersLocalBackupOnly(safeData);

  if (USE_POSTGRES && dbReady) {
    flushChangedPlayersToPostgres(safeData).catch((error) => {
      console.error("[PLAYER DB CHANGED FLUSH ERROR]", error);
    });
  }
}

async function initPlayerStore() {
  ensureFile();

  if (!USE_POSTGRES) {
    readPlayers();
    setPersistedCache(playersCache || {});
    console.log("[PLAYER STORE] File mode active.");
    return;
  }

  try {
    const dbPlayers = await loadPlayersFromPostgres();

    if (dbPlayers && Object.keys(dbPlayers).length > 0) {
      setPlayersCache(dbPlayers);
      setPersistedCache(dbPlayers);
      writePlayersLocalBackupOnly(dbPlayers);
      dbReady = true;

      console.log(`[PLAYER STORE] Postgres mode active. Loaded ${Object.keys(dbPlayers).length} players.`);
      return;
    }

    const filePlayers = readPlayers();

    if (filePlayers && Object.keys(filePlayers).length > 0) {
      setPlayersCache(filePlayers);
      setPersistedCache({});
      dbReady = true;
      await flushChangedPlayersToPostgres(filePlayers);
      setPersistedCache(filePlayers);

      console.log(`[PLAYER STORE] Postgres mode active. Seeded ${Object.keys(filePlayers).length} players from file.`);
      return;
    }

    setPlayersCache({});
    setPersistedCache({});
    dbReady = true;

    console.log("[PLAYER STORE] Postgres mode active. No players found yet.");
  } catch (error) {
    console.error("[PLAYER STORE] Failed to initialize Postgres mode. Falling back to file mode.", error);
    dbReady = false;
    readPlayers();
    setPersistedCache(playersCache || {});
  }
}

function normalizeNamedList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return {
          name: entry,
          amount: 1,
        };
      }

      if (!entry || typeof entry !== "object") return null;

      return {
        ...entry,
        name: entry.name || "Unknown Item",
        amount: Number(entry.amount) > 0 ? Number(entry.amount) : 1,
        rarity: entry.rarity || undefined,
        code: entry.code || undefined,
        image: entry.image || "",
        type: entry.type || undefined,
        upgradeLevel: Number(entry.upgradeLevel || 0),
        statPercent: entry.statPercent || entry.baseStatPercent || undefined,
        baseStatPercent: entry.baseStatPercent || entry.statPercent || undefined,
        ownerBonusPercent: entry.ownerBonusPercent || undefined,
        statBonus: entry.statBonus || undefined,
        owners: Array.isArray(entry.owners) ? entry.owners : undefined,
        description: entry.description || undefined,
        boostBonus: entry.boostBonus || undefined,
        category: entry.category || undefined,
        weaponCode: entry.weaponCode || undefined,
        cardCode: entry.cardCode || undefined,
        sourceCode: entry.sourceCode || undefined,
        power: entry.power || undefined,
      };
    })
    .filter(Boolean);
}

function normalizeFragmentList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

      return {
        ...entry,
        name: entry.name || "Unknown Fragment",
        amount: Number(entry.amount) > 0 ? Number(entry.amount) : 0,
        rarity: entry.rarity || "C",
        category: entry.category || "battle",
        code: entry.code || undefined,
        image: entry.image || "",
        weaponCode: entry.weaponCode || undefined,
        cardCode: entry.cardCode || undefined,
        sourceCode: entry.sourceCode || undefined,
      };
    })
    .filter((entry) => Number(entry.amount || 0) > 0);
}

function normalizeAutoLevel(autoLevel) {
  const rawCards = Array.isArray(autoLevel?.cards)
    ? autoLevel.cards
    : Array.isArray(autoLevel)
    ? autoLevel
    : [];

  return {
    cards: rawCards
      .map((entry) => {
        if (typeof entry === "string") {
          return {
            code: null,
            name: entry,
          };
        }

        if (!entry || typeof entry !== "object") return null;

        return {
          code: entry.code || null,
          name: entry.name || entry.displayName || "Unknown Card",
        };
      })
      .filter(Boolean),
  };
}

function normalizeAutoSac(autoSac) {
  const rawRarities = autoSac?.rarities || {};
  const rawCards = Array.isArray(autoSac?.cards) ? autoSac.cards : [];
  const rawSafeCards = Array.isArray(autoSac?.safeCards) ? autoSac.safeCards : [];

  const normalizeSacEntry = (entry) => {
    if (typeof entry === "string") {
      return {
        code: null,
        name: entry,
        rarity: "C",
        mode: "all",
      };
    }

    if (!entry || typeof entry !== "object") return null;

    return {
      code: entry.code || null,
      name: entry.name || entry.displayName || "Unknown Card",
      rarity: entry.rarity || "C",
      mode: entry.mode || "all",
    };
  };

  const normalizeSafeEntry = (entry) => {
    if (typeof entry === "string") {
      return {
        code: null,
        name: entry,
        rarity: "C",
      };
    }

    if (!entry || typeof entry !== "object") return null;

    return {
      code: entry.code || null,
      name: entry.name || entry.displayName || "Unknown Card",
      rarity: entry.rarity || "C",
    };
  };

  return {
    rarities: {
      C: Boolean(rawRarities.C),
      B: Boolean(rawRarities.B),
      A: Boolean(rawRarities.A),
      S: Boolean(rawRarities.S),
      SS: Boolean(rawRarities.SS),
      UR: Boolean(rawRarities.UR),
    },
    cards: rawCards.map(normalizeSacEntry).filter(Boolean),
    safeCards: rawSafeCards.map(normalizeSafeEntry).filter(Boolean),
  };
}

function makeStableInstanceId(card, index = 0) {
  const code = String(card?.code || card?.name || card?.displayName || "card")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const stage = Number(card?.evolutionStage || 1);
  const level = Number(card?.level || 1);

  return `${code}_legacy_${stage}_${level}_${index}`;
}

function normalizeCards(value) {
  if (!Array.isArray(value)) return [];

  return value.map((card, index) => {
    const equippedWeapons = Array.isArray(card.equippedWeapons)
      ? card.equippedWeapons.map((w) => ({
          ...w,
          name: w?.name || "Unknown Weapon",
          code: w?.code || null,
          rarity: w?.rarity || undefined,
          type: w?.type || undefined,
          image: w?.image || "",
          description: w?.description || undefined,
          owners: Array.isArray(w?.owners) ? w.owners : undefined,
          upgradeLevel: Number(w?.upgradeLevel || 0),
          statPercent: w?.statPercent || w?.baseStatPercent || undefined,
          baseStatPercent: w?.baseStatPercent || w?.statPercent || undefined,
          statBonus: {
            atk: Number(w?.statBonus?.atk || 0),
            hp: Number(w?.statBonus?.hp || 0),
            speed: Number(w?.statBonus?.speed || 0),
          },
        }))
      : [];

    const legacySingleWeapon =
      !equippedWeapons.length && (card.equippedWeapon || card.equippedWeaponCode)
        ? [
            {
              name: card.equippedWeaponName || card.equippedWeapon || "Unknown Weapon",
              code: card.equippedWeaponCode || null,
              upgradeLevel: Number(card.equippedWeaponLevel || 0),
              statBonus: {
                atk: Number(card?.weaponBonus?.atk || 0),
                hp: Number(card?.weaponBonus?.hp || 0),
                speed: Number(card?.weaponBonus?.speed || 0),
              },
            },
          ]
        : [];

    const finalEquippedWeapons = equippedWeapons.length ? equippedWeapons : legacySingleWeapon;

    const totalWeaponBonus = finalEquippedWeapons.reduce(
      (acc, w) => {
        acc.atk += Number(w?.statBonus?.atk || 0);
        acc.hp += Number(w?.statBonus?.hp || 0);
        acc.speed += Number(w?.statBonus?.speed || 0);
        return acc;
      },
      {
        atk: 0,
        hp: 0,
        speed: 0,
      }
    );

    const stableInstanceId = card.instanceId || card.id || makeStableInstanceId(card, index);

    return {
      ...card,
      instanceId: String(stableInstanceId),
      level: Number(card.level) > 0 ? Number(card.level) : 1,
      exp: Number(card.exp ?? card.xp) >= 0 ? Number(card.exp ?? card.xp) : 0,
      xp: Number(card.xp ?? card.exp) >= 0 ? Number(card.xp ?? card.exp) : 0,
      kills: Number(card.kills) >= 0 ? Number(card.kills) : 0,
      fragments: Number(card.fragments) >= 0 ? Number(card.fragments) : 0,
      raidPrestige: Math.max(0, Math.min(200, Number(card.raidPrestige || 0))),
      image: card.image || "",
      equippedWeapons: finalEquippedWeapons,
      equippedWeapon: finalEquippedWeapons.length
        ? finalEquippedWeapons.map((w) => w.name).join(", ")
        : null,
      equippedWeaponCode:
        finalEquippedWeapons.length === 1 ? finalEquippedWeapons[0].code : null,
      equippedWeaponLevel:
        finalEquippedWeapons.length === 1
          ? Number(finalEquippedWeapons[0].upgradeLevel || 0)
          : Number(card.equippedWeaponLevel || 0),
      weaponBonus: totalWeaponBonus,
      equippedDevilFruit: card.equippedDevilFruit || null,
      equippedDevilFruitCode: card.equippedDevilFruitCode || null,
      equippedDevilFruitName: card.equippedDevilFruitName || null,
    };
  });
}

function normalizePullSlot(slot, fallbackMax) {
  return {
    used: Number(slot?.used) >= 0 ? Number(slot.used) : 0,
    max: Number(slot?.max) >= 0 ? Number(slot.max) : fallbackMax,
  };
}

function normalizePulls(pulls) {
  const rawBucket = pulls?.lastResetBucket;
  const lastResetBucket =
    typeof rawBucket === "string" && rawBucket.trim()
      ? rawBucket.trim()
      : Number.isInteger(rawBucket)
      ? rawBucket
      : null;

  return {
    base: normalizePullSlot(pulls?.base, 6),
    supportMember: normalizePullSlot(pulls?.supportMember, 1),
    booster: normalizePullSlot(pulls?.booster, 1),
    owner: normalizePullSlot(pulls?.owner, 1),
    patreon: normalizePullSlot(pulls?.patreon, 3),
    vivreCard: normalizePullSlot(pulls?.vivreCard, 1),
    baccaratCard: normalizePullSlot(pulls?.baccaratCard, 3),
    baccaratFruit: normalizePullSlot(pulls?.baccaratFruit, 2),
    lastResetBucket,
    slotSchemaVersion: Number(pulls?.slotSchemaVersion || 0),
  };
}

function normalizeBoosts(boosts) {
  return {
    pullSlot: Number(boosts?.pullSlot) || 0,
    daily: Number(boosts?.daily) || 0,
    atk: Number(boosts?.atk) || 0,
    hp: Number(boosts?.hp) || 0,
    spd: Number(boosts?.spd) || 0,
    exp: Number(boosts?.exp) || 0,
    dmg: Number(boosts?.dmg) || 0,
    motherFlameFight: Number(boosts?.motherFlameFight) || 0,
  };
}

function normalizeQuests(quests) {
  const rawDailyState = quests?.dailyState || {};
  const dayKey = rawDailyState.dayKey || rawDailyState.dateKey || null;

  const progress = {
    ...(rawDailyState.counters || {}),
    ...(rawDailyState.progress || {}),
  };

  const normalizedDailyState = {
    dayKey,
    dateKey: dayKey,
    rewardClaimed: Boolean(rawDailyState.rewardClaimed),
    quests: Array.isArray(rawDailyState.quests) ? rawDailyState.quests : [],
    questRewardsClaimed: Array.isArray(rawDailyState.questRewardsClaimed)
      ? rawDailyState.questRewardsClaimed
      : [],
    progress: {
      dailyClaims: Number(progress.dailyClaims || 0),
      pullsUsed: Number(progress.pullsUsed || 0),
      boxesOpened: Number(progress.boxesOpened || 0),
      resetTicketsUsed: Number(progress.resetTicketsUsed || 0),
      fightsPlayed: Number(progress.fightsPlayed || 0),
      fightsWon: Number(progress.fightsWon || 0),
      bossFights: Number(progress.bossFights || 0),
      bossesDefeated: Number(progress.bossesDefeated || 0),
      craftsDone: Number(progress.craftsDone || 0),
      weaponUpgrades: Number(progress.weaponUpgrades || 0),
      arenaMatches: Number(progress.arenaMatches || 0),
      arenaWins: Number(progress.arenaWins || 0),
      cardLevels: Number(progress.cardLevels || 0),
      rumBeerUsed: Number(progress.rumBeerUsed || 0),
    },
    counters: {
      dailyClaims: Number(progress.dailyClaims || 0),
      pullsUsed: Number(progress.pullsUsed || 0),
      boxesOpened: Number(progress.boxesOpened || 0),
      resetTicketsUsed: Number(progress.resetTicketsUsed || 0),
      fightsPlayed: Number(progress.fightsPlayed || 0),
      fightsWon: Number(progress.fightsWon || 0),
      bossFights: Number(progress.bossFights || 0),
      bossesDefeated: Number(progress.bossesDefeated || 0),
      craftsDone: Number(progress.craftsDone || 0),
      weaponUpgrades: Number(progress.weaponUpgrades || 0),
      arenaMatches: Number(progress.arenaMatches || 0),
      arenaWins: Number(progress.arenaWins || 0),
      cardLevels: Number(progress.cardLevels || 0),
      rumBeerUsed: Number(progress.rumBeerUsed || 0),
    },
  };

  return {
    daily: {
      total: Number(quests?.daily?.total) > 0 ? Number(quests.daily.total) : 5,
      completed:
        Number(quests?.daily?.completed) >= 0 ? Number(quests.daily.completed) : 0,
      left: Number(quests?.daily?.left) >= 0 ? Number(quests.daily.left) : undefined,
      lastSyncedAt: Number(quests?.daily?.lastSyncedAt || 0),
    },
    dailyState: normalizedDailyState,
    instantQuest: {
      dayKey: quests?.instantQuest?.dayKey || null,
      used: Number(quests?.instantQuest?.used || 0),
      completedQuestIds: Array.isArray(quests?.instantQuest?.completedQuestIds)
        ? quests.instantQuest.completedQuestIds
        : [],
    },
    totalClears: Number(quests?.totalClears) >= 0 ? Number(quests.totalClears) : 0,
  };
}

function normalizeCooldowns(cooldowns) {
  return {
    daily: cooldowns?.daily ?? null,
    fight: cooldowns?.fight ?? null,
    fightMotherFlame: cooldowns?.fightMotherFlame ?? null,
    fightVivreCard: cooldowns?.fightVivreCard ?? null,
    boss: cooldowns?.boss ?? null,
    pullReset: cooldowns?.pullReset ?? null,
    ship: cooldowns?.ship ?? null,
    vote: cooldowns?.vote ?? null,
    treasure: cooldowns?.treasure ?? null,
  };
}

function normalizeRaidTeam(raidTeam) {
  return {
    members: Array.isArray(raidTeam?.members)
      ? [...new Set(raidTeam.members.map(String).filter(Boolean))].slice(0, 9)
      : [],
  };
}

function normalizeVote(vote) {
  return {
    streak: Number(vote?.streak) >= 0 ? Number(vote.streak) : 0,
    totalVotes: Number(vote?.totalVotes) >= 0 ? Number(vote.totalVotes) : 0,
    lastVoteAt: vote?.lastVoteAt || null,
    lastEventId: vote?.lastEventId || null,
    processedIds: Array.isArray(vote?.processedIds)
      ? vote.processedIds.map(String).slice(-50)
      : [],
  };
}

function normalizeTeam(team) {
  const slots = Array.isArray(team?.slots) ? team.slots.slice(0, 3) : [];

  while (slots.length < 3) {
    slots.push(null);
  }

  return {
    slots: slots.map((slot) => (slot ? String(slot) : null)),
  };
}

function normalizeMessageMilestones(messageMilestones) {
  const progress = messageMilestones?.progress || {};
  const claims = messageMilestones?.claims || {};
  const legacyMessages = Number(messageMilestones?.totalMessages || messageMilestones?.messages || 0);

  return {
    messages: legacyMessages,
    totalMessages: legacyMessages,
    progress: {
      gems: Number(progress.gems || 0),
      resetToken: Number(progress.resetToken || 0),
      rareResourceBox: Number(progress.rareResourceBox || 0),
      raidTicket: Number(progress.raidTicket || 0),
      goldRaidTicket: Number(progress.goldRaidTicket || 0),
    },
    claims: {
      gems: Number(claims.gems || 0),
      resetToken: Number(claims.resetToken || 0),
      rareResourceBox: Number(claims.rareResourceBox || 0),
      raidTicket: Number(claims.raidTicket || 0),
      goldRaidTicket: Number(claims.goldRaidTicket || 0),
    },
    completed: Array.isArray(messageMilestones?.completed) ? messageMilestones.completed : [],
    lastCompleted: Array.isArray(messageMilestones?.lastCompleted)
      ? messageMilestones.lastCompleted
      : [],
    lastRewardAt: Number(messageMilestones?.lastRewardAt || 0),
    updatedAt: Number(messageMilestones?.updatedAt || 0),
  };
}

function normalizeStats(stats) {
  return {
    wins: Number(stats?.wins) >= 0 ? Number(stats.wins) : 0,
    losses: Number(stats?.losses) >= 0 ? Number(stats.losses) : 0,
    winStreak: Number(stats?.winStreak) >= 0 ? Number(stats.winStreak) : 0,
    bestWinStreak:
      Number(stats?.bestWinStreak) >= 0 ? Number(stats.bestWinStreak) : 0,
    cardsPulled: Number(stats?.cardsPulled) >= 0 ? Number(stats.cardsPulled) : 0,
  };
}

function normalizeArena(arena) {
  return {
    points: Number(arena?.points) >= 0 ? Number(arena.points) : 0,
    wins: Number(arena?.wins) >= 0 ? Number(arena.wins) : 0,
    losses: Number(arena?.losses) >= 0 ? Number(arena.losses) : 0,
    draws: Number(arena?.draws) >= 0 ? Number(arena.draws) : 0,
    streak: Number(arena?.streak) >= 0 ? Number(arena.streak) : 0,
    bestStreak: Number(arena?.bestStreak) >= 0 ? Number(arena.bestStreak) : 0,
    matches: Number(arena?.matches) >= 0 ? Number(arena.matches) : 0,
    dailyDateKey: arena?.dailyDateKey || null,
    dailyUses: Number(arena?.dailyUses) >= 0 ? Number(arena.dailyUses) : 0,
  };
}

function normalizeShip(ship, currentIsland) {
  const unlocked =
    Array.isArray(ship?.unlockedIslands) && ship.unlockedIslands.length
      ? ship.unlockedIslands
      : ["foosha_village"];

  let shipCode = ship?.shipCode || "small_boat";
  let tier = Number(ship?.tier || 1);

  if (tier <= 1) {
    shipCode = "small_boat";
    tier = 1;
  }

  return {
    shipCode,
    tier,
    sea: ship?.sea || "East Blue",
    nextTravelAt: Number(ship?.nextTravelAt || 0),
    unlockedIslands: unlocked,
    currentPort: ship?.currentPort || currentIsland || "Foosha Village",
  };
}

function normalizeStory(story) {
  const bossPhases = story?.bossPhases || {};

  return {
    clearedIslandBosses: Array.isArray(story?.clearedIslandBosses)
      ? story.clearedIslandBosses
      : [],
    bossPhases: {
      egghead: {
        phase1Cleared: Boolean(bossPhases?.egghead?.phase1Cleared),
        phase2Cleared: Boolean(bossPhases?.egghead?.phase2Cleared),
        completed: Boolean(bossPhases?.egghead?.completed),
      },
      elbaf: {
        phase1Cleared: Boolean(bossPhases?.elbaf?.phase1Cleared),
        phase2Cleared: Boolean(bossPhases?.elbaf?.phase2Cleared),
        completed: Boolean(bossPhases?.elbaf?.completed),
      },
    },
  };
}

function normalizeRaidPrestigeBank(value) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = {};

  for (const [rawCode, rawEntry] of Object.entries(raw)) {
    const code = String(rawEntry?.code || rawCode || "").toLowerCase().trim();
    if (!code) continue;

    const prestige = Math.max(
      0,
      Math.min(
        200,
        Number(
          rawEntry?.raidPrestige ??
            rawEntry?.prestige ??
            rawEntry?.amount ??
            rawEntry ??
            0
        )
      )
    );

    result[code] = {
      ...(rawEntry && typeof rawEntry === "object" ? rawEntry : {}),
      code,
      name: rawEntry?.name || rawEntry?.displayName || code,
      displayName: rawEntry?.displayName || rawEntry?.name || code,
      raidPrestige: prestige,
      updatedAt: Number(rawEntry?.updatedAt || 0),
    };
  }

  return result;
}

function normalizeStorage(storage, storageLimit) {
  return {
    max: Number(storage?.max || storageLimit || 250),
  };
}

function normalizePlayer(player = {}, username = "Unknown") {
  const currentIsland = player.currentIsland || "Foosha Village";

  return {
    username: player.username || username,
    berries: typeof player.berries === "number" ? player.berries : 1000,
    gems: typeof player.gems === "number" ? player.gems : 100,
    currentIsland,
    messageMilestones: normalizeMessageMilestones(player.messageMilestones),
    dailyLastClaim: player.dailyLastClaim || null,
    cards: normalizeCards(player.cards),
    fragments: normalizeFragmentList(player.fragments),
    autoLevel: normalizeAutoLevel(player.autoLevel),
    autoSac: normalizeAutoSac(player.autoSac),
    items: normalizeNamedList(player.items),
    weapons: normalizeNamedList(player.weapons),
    devilFruits: normalizeNamedList(player.devilFruits),
    boxes: normalizeNamedList(player.boxes),
    tickets: normalizeNamedList(player.tickets),
    materials: normalizeNamedList(player.materials),
    pity: {
      pullPity: Number(player?.pity?.pullPity) >= 0 ? Number(player.pity.pullPity) : 0,
      normalAPity:
        Number(player?.pity?.normalAPity) >= 0 ? Number(player.pity.normalAPity) : 0,
      normalSPity:
        Number(player?.pity?.normalSPity) >= 0 ? Number(player.pity.normalSPity) : 0,
      premiumSPity:
        Number(player?.pity?.premiumSPity) >= 0
          ? Number(player.pity.premiumSPity)
          : 0,
    },
    pulls: normalizePulls(player.pulls),
    boosts: normalizeBoosts(player.boosts),
    quests: normalizeQuests(player.quests),
    cooldowns: normalizeCooldowns(player.cooldowns),
    vote: normalizeVote(player.vote),
    team: normalizeTeam(player.team),
    raidTeam: normalizeRaidTeam(player.raidTeam),
    stats: normalizeStats(player.stats),
    arena: normalizeArena(player.arena),
    ship: normalizeShip(player.ship, currentIsland),
    story: normalizeStory(player.story),
    raidPrestigeBank: normalizeRaidPrestigeBank(player.raidPrestigeBank),
    storage: normalizeStorage(player.storage, player.storageLimit),
    clan: {
      name: player?.clan?.name || null,
      role: player?.clan?.role || "member",
    },
  };
}

function getDefaultPlayer(username) {
  return normalizePlayer(
    {
      username,
      berries: 1000,
      gems: 100,
      currentIsland: "Foosha Village",
      messageMilestones: {
        messages: 0,
        updatedAt: 0,
      },
      dailyLastClaim: null,
      cards: [],
      fragments: [],
      autoLevel: {
        cards: [],
      },
      autoSac: {
        rarities: {
          C: false,
          B: false,
          A: false,
          S: false,
          SS: false,
          UR: false,
        },
        cards: [],
        safeCards: [],
      },
      items: [],
      weapons: [],
      devilFruits: [],
      boxes: [],
      materials: [],
      tickets: [
        {
          code: "common_raid_ticket",
          name: "Common Raid Ticket",
          amount: 0,
        },
        {
          code: "raid_ticket",
          name: "Raid Ticket",
          amount: 0,
        },
        {
          code: "gold_raid_ticket",
          name: "Gold Raid Ticket",
          amount: 0,
        },
        {
          code: "empty_throne_raid_writ",
          name: "Empty Throne Raid Writ",
          amount: 0,
        },
      ],
      pity: {
        pullPity: 0,
        normalAPity: 0,
        normalSPity: 0,
        premiumSPity: 0,
      },
      pulls: {
        base: { used: 0, max: 6 },
        supportMember: { used: 0, max: 1 },
        booster: { used: 0, max: 1 },
        owner: { used: 0, max: 1 },
        patreon: { used: 0, max: 3 },
        vivreCard: { used: 0, max: 1 },
        baccaratCard: { used: 0, max: 3 },
        baccaratFruit: { used: 0, max: 2 },
        lastResetBucket: null,
        slotSchemaVersion: PULL_SLOT_SCHEMA_VERSION,
      },
      boosts: {
        pullSlot: 0,
        daily: 0,
        atk: 0,
        hp: 0,
        spd: 0,
        exp: 0,
        dmg: 0,
        motherFlameFight: 0,
      },
      quests: {
        daily: {
          total: 5,
          completed: 0,
        },
        dailyState: {
          dayKey: null,
          dateKey: null,
          rewardClaimed: false,
          quests: [],
          questRewardsClaimed: [],
          counters: {
            dailyClaims: 0,
            pullsUsed: 0,
            boxesOpened: 0,
            resetTicketsUsed: 0,
            fightsPlayed: 0,
            fightsWon: 0,
            bossFights: 0,
            bossesDefeated: 0,
            craftsDone: 0,
            weaponUpgrades: 0,
            arenaMatches: 0,
            arenaWins: 0,
            cardLevels: 0,
            rumBeerUsed: 0,
          },
          progress: {
            dailyClaims: 0,
            pullsUsed: 0,
            boxesOpened: 0,
            resetTicketsUsed: 0,
            fightsPlayed: 0,
            fightsWon: 0,
            bossFights: 0,
            bossesDefeated: 0,
            craftsDone: 0,
            weaponUpgrades: 0,
            arenaMatches: 0,
            arenaWins: 0,
            cardLevels: 0,
            rumBeerUsed: 0,
          },
        },
        instantQuest: {
          dayKey: null,
          used: 0,
          completedQuestIds: [],
        },
        totalClears: 0,
      },
      cooldowns: {
        daily: null,
        fight: null,
        fightMotherFlame: null,
        fightVivreCard: null,
        boss: null,
        pullReset: null,
        ship: null,
        vote: null,
        treasure: null,
      },
      vote: {
        streak: 0,
        totalVotes: 0,
        lastVoteAt: null,
        lastEventId: null,
        processedIds: [],
      },
      team: {
        slots: [null, null, null],
      },
      raidTeam: {
        members: [],
      },
      stats: {
        wins: 0,
        losses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        cardsPulled: 0,
      },
      arena: {
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        streak: 0,
        bestStreak: 0,
        matches: 0,
        dailyDateKey: null,
        dailyUses: 0,
      },
      ship: {
        shipCode: "small_boat",
        tier: 1,
        sea: "East Blue",
        nextTravelAt: 0,
        unlockedIslands: ["foosha_village"],
        currentPort: "Foosha Village",
      },
      story: {
        clearedIslandBosses: [],
        bossPhases: {
          egghead: {
            phase1Cleared: false,
            phase2Cleared: false,
            completed: false,
          },
          elbaf: {
            phase1Cleared: false,
            phase2Cleared: false,
            completed: false,
          },
        },
      },
      storage: {
        max: 250,
      },
      clan: {
        name: null,
        role: "member",
      },
    },
    username
  );
}

function getPlayer(userId, username) {
  const players = readPlayers();
  const id = String(userId);

  if (!players[id]) {
    players[id] = getDefaultPlayer(username);
    writePlayers(players);
    return players[id];
  }

  return normalizePlayer(players[id], username);
}

function updatePlayer(userId, newData) {
  return updatePlayerAtomic(
    userId,
    (currentPlayer) => ({
      ...currentPlayer,
      ...newData,
    }),
    newData?.username || "Unknown"
  );
}

function updatePlayerAtomic(userId, mutator, username = "Unknown") {
  if (USE_POSTGRES && dbReady) {
    const updatedFromDb = null;

    /*
      This synchronous command structure cannot await everywhere.
      To prevent rollback, we still update local cache immediately,
      then trigger a DB-row atomic update using latest DB row.
    */
    updateOnePlayerInPostgresAtomic(userId, username, mutator).catch((error) => {
      console.error("[PLAYER DB ATOMIC UPDATE ASYNC ERROR]", error);
    });

    const players = readPlayers();
    const id = String(userId);
    const currentPlayer = players[id]
      ? normalizePlayer(players[id], username)
      : getDefaultPlayer(username);

    const result =
      typeof mutator === "function" ? mutator(cloneJson(currentPlayer)) : currentPlayer;

    const nextPlayer = normalizePlayer(result || currentPlayer, currentPlayer.username || username);
    players[id] = nextPlayer;
    writePlayersLocalBackupOnly(players);

    return nextPlayer;
  }

  const players = readPlayers();
  const id = String(userId);
  const currentPlayer = players[id]
    ? normalizePlayer(players[id], username)
    : getDefaultPlayer(username);

  const result =
    typeof mutator === "function" ? mutator(cloneJson(currentPlayer)) : currentPlayer;

  const nextPlayer = normalizePlayer(result || currentPlayer, currentPlayer.username || username);
  players[id] = nextPlayer;
  writePlayers(players);
  return nextPlayer;
}

function updateTwoPlayersAtomic(userIdA, userIdB, mutator, usernameA = "Unknown", usernameB = "Unknown") {
  if (USE_POSTGRES && dbReady) {
    updateTwoPlayersInPostgresAtomic(
      userIdA,
      userIdB,
      usernameA,
      usernameB,
      mutator
    ).catch((error) => {
      console.error("[PLAYER DB ATOMIC TWO UPDATE ASYNC ERROR]", error);
    });

    const players = readPlayers();
    const idA = String(userIdA);
    const idB = String(userIdB);

    const playerA = players[idA]
      ? normalizePlayer(players[idA], usernameA)
      : getDefaultPlayer(usernameA);

    const playerB = players[idB]
      ? normalizePlayer(players[idB], usernameB)
      : getDefaultPlayer(usernameB);

    const result =
      typeof mutator === "function"
        ? mutator(cloneJson(playerA), cloneJson(playerB))
        : { playerA, playerB };

    const nextA = normalizePlayer(result?.playerA || playerA, playerA.username || usernameA);
    const nextB = normalizePlayer(result?.playerB || playerB, playerB.username || usernameB);

    players[idA] = nextA;
    players[idB] = nextB;
    writePlayersLocalBackupOnly(players);

    return {
      playerA: nextA,
      playerB: nextB,
    };
  }

  const players = readPlayers();
  const idA = String(userIdA);
  const idB = String(userIdB);

  const playerA = players[idA]
    ? normalizePlayer(players[idA], usernameA)
    : getDefaultPlayer(usernameA);

  const playerB = players[idB]
    ? normalizePlayer(players[idB], usernameB)
    : getDefaultPlayer(usernameB);

  const result =
    typeof mutator === "function"
      ? mutator(cloneJson(playerA), cloneJson(playerB))
      : { playerA, playerB };

  const nextA = normalizePlayer(result?.playerA || playerA, playerA.username || usernameA);
  const nextB = normalizePlayer(result?.playerB || playerB, playerB.username || usernameB);

  players[idA] = nextA;
  players[idB] = nextB;
  writePlayers(players);

  return {
    playerA: nextA,
    playerB: nextB,
  };
}

module.exports = {
  readPlayers,
  writePlayers,
  getPlayer,
  updatePlayer,
  updatePlayerAtomic,
  updateTwoPlayersAtomic,
  normalizePlayer,
  initPlayerStore,
  filePath,
};