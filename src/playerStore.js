const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { syncMergedCardsInPlayer } = require("./utils/mergeCards");
const persistentDir = process.env.PLAYER_DATA_DIR || path.join(__dirname, "data");
const fallbackDir = path.join(__dirname, "data");

const PULL_SLOT_SCHEMA_VERSION = 4;
const PLAYER_STORE_MODE = String(process.env.PLAYER_STORE_MODE || "").toLowerCase();
const USE_POSTGRES = PLAYER_STORE_MODE === "postgres" && Boolean(process.env.DATABASE_URL);

const PLAYER_DB_SNAPSHOT_SAVE_ENABLED =
  String(process.env.PLAYER_DB_SNAPSHOT_SAVE_ENABLED || "true").toLowerCase() !== "false";

const PLAYER_DB_SNAPSHOT_ERROR_LOG_ENABLED =
  String(process.env.PLAYER_DB_SNAPSHOT_ERROR_LOG_ENABLED || "false").toLowerCase() === "true";

let playersCache = null;
let persistedCache = {};
let dbPool = null;
let dbReady = false;
let playerStoreFlushInterval = null;
const playerSaveQueues = new Map();
let playerStoreShutdownDrainInstalled = false;

function getPendingPlayerSavePromises() {
  return [...playerSaveQueues.values()].filter(Boolean);
}

async function drainPlayerStoreSaves(timeoutMs = 60000) {
  const deadline = Date.now() + Math.max(1000, Number(timeoutMs || 60000));

  while (getPendingPlayerSavePromises().length && Date.now() < deadline) {
    const pending = getPendingPlayerSavePromises();
    const left = Math.max(1000, deadline - Date.now());

    await Promise.race([
      Promise.allSettled(pending),
      new Promise((resolve) => setTimeout(resolve, Math.min(5000, left))),
    ]);
  }
}

function startPlayerStoreAutoFlush() {
  if (playerStoreFlushInterval) return;

  const intervalMs = Math.max(
    30000,
    Number(process.env.PLAYER_DB_FLUSH_INTERVAL_MS || 60000)
  );

  playerStoreFlushInterval = setInterval(() => {
    drainPlayerStoreSaves(Number(process.env.PLAYER_DB_AUTO_FLUSH_TIMEOUT_MS || 15000))
      .catch((error) => {
        console.error("[PLAYER STORE AUTO DRAIN ERROR]", error);
      });
  }, intervalMs);

  if (typeof playerStoreFlushInterval.unref === "function") {
    playerStoreFlushInterval.unref();
  }

  console.log(`[PLAYER STORE] Auto save drain active every ${intervalMs}ms.`);
}

function installPlayerStoreShutdownDrain() {
  if (playerStoreShutdownDrainInstalled) return;
  playerStoreShutdownDrainInstalled = true;

  const drainAndExit = async (signal) => {
    try {
      console.log(`[PLAYER STORE] ${signal} received. Draining pending player saves...`);
      await flushPlayerStoreNow(Number(process.env.PLAYER_DB_SHUTDOWN_DRAIN_MS || 60000));
      console.log("[PLAYER STORE] Pending player saves drained.");
    } catch (error) {
      console.error("[PLAYER STORE] Failed while draining pending saves.", error);
    } finally {
      process.exit(0);
    }
  };

  process.once("SIGTERM", () => drainAndExit("SIGTERM"));
  process.once("SIGINT", () => drainAndExit("SIGINT"));
}

function isSystemStoreKey(userId) {
  return String(userId || "").startsWith("__");
}

function normalizeStoreRecord(userId, data, username = "Unknown") {
  if (isSystemStoreKey(userId)) {
    return cloneJson(data || {});
  }

  return normalizePlayer(data || {}, username || data?.username || "Unknown");
}

function enqueuePlayerSnapshotSave(userId, player) {
  if (!PLAYER_DB_SNAPSHOT_SAVE_ENABLED) {
    return Promise.resolve(null);
  }

  const id = String(userId);

  const initialSnapshot = normalizeStoreRecord(
    id,
    player,
    player?.username || "Unknown"
  );

  const previous = playerSaveQueues.get(id) || Promise.resolve();

  const next = previous
    .catch(() => {})
    .then(async () => {
      if (!USE_POSTGRES || !dbReady) return null;

      const latestPlayers = playersCache || readPlayers();
      const latestRaw = latestPlayers?.[id] || initialSnapshot;

      const latestSnapshot = normalizeStoreRecord(
        id,
        latestRaw,
        latestRaw?.username || initialSnapshot?.username || "Unknown"
      );

      const safeSnapshot = isSystemStoreKey(id)
        ? cloneJson(latestSnapshot || {})
        : normalizePlayer(
            latestSnapshot,
            latestSnapshot?.username || "Unknown"
          );

      const saved = await upsertOnePlayerToPostgres(id, safeSnapshot);

      if (saved) {
        persistedCache[id] = cloneJson(safeSnapshot);
      }

      return safeSnapshot;
    })
    .catch((error) => {
      if (PLAYER_DB_SNAPSHOT_ERROR_LOG_ENABLED) {
        console.error("[PLAYER DB SNAPSHOT SAVE ERROR]", {
          userId: id,
          message: error?.message || error,
        });
      }
      return null;
    })
    .finally(() => {
      if (playerSaveQueues.get(id) === next) {
        playerSaveQueues.delete(id);
      }
    });

  playerSaveQueues.set(id, next);
  return next;
}

function cloneJson(value) {
  return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : {};
}

function getCardIdentityKey(card, index = -1) {
  const direct = String(card?.instanceId || card?.uid || card?.uniqueId || card?.cardInstanceId || "")
    .toLowerCase()
    .trim();

  if (direct) return `instance:${direct}`;

  const code = String(card?.code || card?.baseCode || card?.name || card?.displayName || card?.cardName || "")
    .toLowerCase()
    .trim();

  const role = String(card?.cardRole || card?.role || "battle")
    .toLowerCase()
    .trim();

  const stage = String(card?.evolutionKey || card?.evolutionStage || card?.form || card?.stage || "M1")
    .toLowerCase()
    .trim();

  const rarity = String(card?.rarity || card?.currentTier || "")
    .toLowerCase()
    .trim();

  const created = String(card?.createdAt || card?.obtainedAt || card?.pulledAt || "")
    .toLowerCase()
    .trim();

  const legacyId = String(card?.id || "")
    .toLowerCase()
    .trim();

  if (code || legacyId) {
    return [
      "fingerprint",
      role,
      code || legacyId,
      stage,
      rarity,
      created,
      index >= 0 ? `idx${index}` : "",
    ]
      .filter(Boolean)
      .join(":");
  }

  return index >= 0 ? `unknown:${index}` : "";
}

function getStackIdentityKey(item) {
  return String(item?.code || item?.name || item?.id || "")
    .toLowerCase()
    .trim();
}

function getCardStageNumber(card) {
  const stageValue = Number(card?.evolutionStage || 0);

  if (Number.isFinite(stageValue) && stageValue > 0) {
    return Math.max(1, Math.min(3, Math.floor(stageValue)));
  }

  const key = String(card?.evolutionKey || card?.form || card?.stage || "")
    .toUpperCase()
    .trim();

  const matched = key.match(/M([123])/);
  if (matched) return Number(matched[1]);

  return 1;
}

function withCardStage(card, stage) {
  const safeStage = Math.max(1, Math.min(3, Math.floor(Number(stage || 1))));

  return {
    ...card,
    evolutionStage: safeStage,
    evolutionKey: `M${safeStage}`,
  };
}

function mergeNoRollbackCard(incomingCard, persistedCard) {
  if (!persistedCard) return incomingCard;
  if (!incomingCard) return persistedCard;

  const incomingStage = getCardStageNumber(incomingCard);
  const persistedStage = getCardStageNumber(persistedCard);
  const finalStage = Math.max(incomingStage, persistedStage);

  const merged = {
    ...incomingCard,
  };

  if (persistedStage > incomingStage) {
    merged.evolutionForms =
      incomingCard.evolutionForms || persistedCard.evolutionForms;
    merged.stageStats = incomingCard.stageStats || persistedCard.stageStats;
    merged.stats = incomingCard.stats || persistedCard.stats;
    merged.stageImages = incomingCard.stageImages || persistedCard.stageImages;
  }

  merged.level = Math.max(
    Number(incomingCard.level || 0),
    Number(persistedCard.level || 0)
  );

  merged.currentLevel = Math.max(
    Number(incomingCard.currentLevel || 0),
    Number(persistedCard.currentLevel || 0)
  );

  merged.lvl = Math.max(
    Number(incomingCard.lvl || 0),
    Number(persistedCard.lvl || 0)
  );

  merged.raidPrestige = Math.max(
    Number(incomingCard.raidPrestige || 0),
    Number(persistedCard.raidPrestige || 0)
  );

  return withCardStage(merged, finalStage);
}

function mergeCardsNoRollback(incomingCards, persistedCards, options = {}) {
  const preserveMissingCards = Boolean(options.preserveMissingCards);
  const incomingList = Array.isArray(incomingCards) ? incomingCards : [];
  const persistedList = Array.isArray(persistedCards) ? persistedCards : [];

  const persistedByKey = new Map();

  for (const [index, card] of persistedList.entries()) {
    const key = getCardIdentityKey(card, index);
    if (!key) continue;
    persistedByKey.set(key, card);
  }

  const usedKeys = new Set();

  const merged = incomingList.map((card, index) => {
    const key = getCardIdentityKey(card, index);
    const persistedCard = key ? persistedByKey.get(key) : null;

    if (key) usedKeys.add(key);

    return mergeNoRollbackCard(card, persistedCard);
  });

  if (preserveMissingCards) {
    for (const [index, card] of persistedList.entries()) {
      const key = getCardIdentityKey(card, index);
      if (!key || usedKeys.has(key)) continue;
      merged.push(card);
    }
  }

  return merged;
}

function mergeStackNoRollback(incomingList, persistedList, options = {}) {
  const preserveMissingItems = Boolean(options.preserveMissingItems);
  const preserveHigherAmount = Boolean(options.preserveHigherAmount);
  const incoming = Array.isArray(incomingList) ? incomingList : [];
  const persisted = Array.isArray(persistedList) ? persistedList : [];
  const persistedByKey = new Map();

  for (const item of persisted) {
    const key = getStackIdentityKey(item);
    if (!key) continue;
    persistedByKey.set(key, item);
  }

  const usedKeys = new Set();

  const merged = incoming
    .map((item) => {
      const key = getStackIdentityKey(item);
      const oldItem = key ? persistedByKey.get(key) : null;
      if (key) usedKeys.add(key);

      if (!oldItem) return item;

      const incomingAmount = Math.max(0, Number(item.amount || 0));
      const oldAmount = Math.max(0, Number(oldItem.amount || 0));
      const finalAmount = preserveHigherAmount
        ? Math.max(incomingAmount, oldAmount)
        : incomingAmount;

      return {
        ...oldItem,
        ...item,
        amount: finalAmount,
      };
    })
    .filter((item) => Number(item?.amount || 0) > 0);

  if (preserveMissingItems) {
    for (const item of persisted) {
      const key = getStackIdentityKey(item);
      if (!key || usedKeys.has(key)) continue;
      if (Number(item?.amount || 0) <= 0) continue;
      merged.push(item);
    }
  }

  return merged;
}

function normalizePrestigeCardCode(card) {
  const code = String(card?.code || card?.baseCode || "")
    .toLowerCase()
    .trim();

  const name = String(card?.displayName || card?.name || "")
    .toLowerCase()
    .trim();

  if (code === "imu" || name === "imu") return "imu";

  return (
    code ||
    name
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  );
}

function mergeRaidPrestigeBankMax(incomingBank, persistedBank) {
  const incoming =
    incomingBank && typeof incomingBank === "object" ? incomingBank : {};
  const persisted =
    persistedBank && typeof persistedBank === "object" ? persistedBank : {};

  const merged = {
    ...persisted,
    ...incoming,
  };

  for (const key of new Set([...Object.keys(persisted), ...Object.keys(incoming)])) {
    const oldEntry = persisted[key] || {};
    const newEntry = incoming[key] || {};
    const oldPrestige = Math.max(0, Math.min(200, Number(oldEntry.raidPrestige || 0)));
    const newPrestige = Math.max(0, Math.min(200, Number(newEntry.raidPrestige || 0)));

    merged[key] = {
      ...oldEntry,
      ...newEntry,
      raidPrestige: Math.max(oldPrestige, newPrestige),
    };
  }

  return merged;
}

function syncRaidPrestigeBankToCards(player) {
  if (!player || typeof player !== "object") return player;

  const bank =
    player.raidPrestigeBank && typeof player.raidPrestigeBank === "object"
      ? player.raidPrestigeBank
      : {};

  if (!Object.keys(bank).length) return player;

  const cards = Array.isArray(player.cards)
    ? player.cards.map((card) => {
        const bankCode = normalizePrestigeCardCode(card);
        const bankEntry = bankCode ? bank[bankCode] : null;
        const bankPrestige = Math.max(0, Math.min(200, Number(bankEntry?.raidPrestige || 0)));
        const cardPrestige = Math.max(0, Math.min(200, Number(card?.raidPrestige || 0)));

        if (bankPrestige <= cardPrestige) return card;

        return {
          ...card,
          raidPrestige: bankPrestige,
        };
      })
    : player.cards;

  return {
    ...player,
    cards,
  };
}

function mergeEventStoreNoRollback(incomingEvents, persistedEvents) {
  const incoming =
    incomingEvents && typeof incomingEvents === "object" && !Array.isArray(incomingEvents)
      ? incomingEvents
      : {};

  const persisted =
    persistedEvents && typeof persistedEvents === "object" && !Array.isArray(persistedEvents)
      ? persistedEvents
      : {};

  const merged = {
    ...persisted,
    ...incoming,
  };

  const ryumaKey = "ryuma_global_boss";

  if (incoming[ryumaKey] || persisted[ryumaKey]) {
    const oldRyuma =
      persisted[ryumaKey] && typeof persisted[ryumaKey] === "object"
        ? persisted[ryumaKey]
        : {};

    const newRyuma =
      incoming[ryumaKey] && typeof incoming[ryumaKey] === "object"
        ? incoming[ryumaKey]
        : {};

    const oldWindow = Number(oldRyuma.attackWindowStartedAt || 0);
    const newWindow = Number(newRyuma.attackWindowStartedAt || 0);
    const sameWindow = oldWindow && newWindow && oldWindow === newWindow;

    const useNewWindow = newWindow >= oldWindow;

    merged[ryumaKey] = {
      ...oldRyuma,
      ...newRyuma,

      damage: Math.max(
        Number(oldRyuma.damage || 0),
        Number(newRyuma.damage || 0)
      ),

      joinedAt: Math.max(
        Number(oldRyuma.joinedAt || 0),
        Number(newRyuma.joinedAt || 0)
      ),

      attackWindowStartedAt: useNewWindow ? newWindow : oldWindow,

      attacksUsed: sameWindow
        ? Math.max(Number(oldRyuma.attacksUsed || 0), Number(newRyuma.attacksUsed || 0))
        : useNewWindow
          ? Number(newRyuma.attacksUsed || 0)
          : Number(oldRyuma.attacksUsed || 0),

      claimedPersonalMilestones: Array.from(new Set([
        ...(Array.isArray(oldRyuma.claimedPersonalMilestones) ? oldRyuma.claimedPersonalMilestones : []),
        ...(Array.isArray(newRyuma.claimedPersonalMilestones) ? newRyuma.claimedPersonalMilestones : []),
      ])).map(Number),

      claimedBonusMilestones: Array.from(new Set([
        ...(Array.isArray(oldRyuma.claimedBonusMilestones) ? oldRyuma.claimedBonusMilestones : []),
        ...(Array.isArray(newRyuma.claimedBonusMilestones) ? newRyuma.claimedBonusMilestones : []),
      ])).map(Number),

      claimedGlobalMilestones: Array.from(new Set([
        ...(Array.isArray(oldRyuma.claimedGlobalMilestones) ? oldRyuma.claimedGlobalMilestones : []),
        ...(Array.isArray(newRyuma.claimedGlobalMilestones) ? newRyuma.claimedGlobalMilestones : []),
      ])).map(Number),

      shopPurchases: {
        ...(oldRyuma.shopPurchases || {}),
        ...(newRyuma.shopPurchases || {}),
      },

      cardHp: useNewWindow
        ? {
            ...(oldRyuma.cardHp || {}),
            ...(newRyuma.cardHp || {}),
          }
        : {
            ...(newRyuma.cardHp || {}),
            ...(oldRyuma.cardHp || {}),
          },

      cardHpWindowStartedAt: Math.max(
        Number(oldRyuma.cardHpWindowStartedAt || 0),
        Number(newRyuma.cardHpWindowStartedAt || 0)
      ),
    };
  }

  return merged;
}

function mergePlayerNoRollback(incomingPlayer, persistedPlayer, options = {}) {
  if (!persistedPlayer) return incomingPlayer;
  if (!incomingPlayer) return persistedPlayer;

  const preserveMissingCards = Boolean(options.preserveMissingCards);
  const preserveMissingItems = Boolean(options.preserveMissingItems);

  const shouldPreserveCards =
    preserveMissingCards && !Array.isArray(incomingPlayer.cards);

  function shouldPreserveStack(key) {
    return preserveMissingItems && !Array.isArray(incomingPlayer?.[key]);
  }

  return syncRaidPrestigeBankToCards({
    ...incomingPlayer,

    customSkins: normalizeCustomSkins(
      incomingPlayer.customSkins || persistedPlayer.customSkins
    ),

    adminBan: normalizeAdminBan(
      incomingPlayer.adminBan || persistedPlayer.adminBan
    ),

    pirateTokens: Math.max(
      0,
      Math.floor(
        Math.max(
          Number(incomingPlayer.pirateTokens || 0),
          Number(persistedPlayer.pirateTokens || 0)
        )
      )
    ),

    ryumaTokens: Math.max(
      0,
      Math.floor(
        Math.max(
          Number(incomingPlayer.ryumaTokens || 0),
          Number(persistedPlayer.ryumaTokens || 0)
        )
      )
    ),

    events: mergeEventStoreNoRollback(incomingPlayer.events, persistedPlayer.events),

    cards: mergeCardsNoRollback(
      incomingPlayer.cards,
      persistedPlayer.cards,
      {
        preserveMissingCards: shouldPreserveCards,
      }
    ),

    weapons: mergeStackNoRollback(incomingPlayer.weapons, persistedPlayer.weapons, {
      preserveMissingItems: shouldPreserveStack("weapons"),
      preserveHigherAmount: false,
    }),

    devilFruits: mergeStackNoRollback(incomingPlayer.devilFruits, persistedPlayer.devilFruits, {
      preserveMissingItems: shouldPreserveStack("devilFruits"),
      preserveHigherAmount: false,
    }),

    tickets: mergeStackNoRollback(incomingPlayer.tickets, persistedPlayer.tickets, {
      preserveMissingItems: shouldPreserveStack("tickets"),
      preserveHigherAmount: false,
    }),

    boxes: mergeStackNoRollback(incomingPlayer.boxes, persistedPlayer.boxes, {
      preserveMissingItems: shouldPreserveStack("boxes"),
      preserveHigherAmount: false,
    }),

    items: mergeStackNoRollback(incomingPlayer.items, persistedPlayer.items, {
      preserveMissingItems: shouldPreserveStack("items"),
      preserveHigherAmount: false,
    }),

    materials: mergeStackNoRollback(incomingPlayer.materials, persistedPlayer.materials, {
      preserveMissingItems: shouldPreserveStack("materials"),
      preserveHigherAmount: false,
    }),

    fragments: mergeStackNoRollback(incomingPlayer.fragments, persistedPlayer.fragments, {
      preserveMissingItems: shouldPreserveStack("fragments"),
      preserveHigherAmount: false,
    }),

    raidPrestigeBank: mergeRaidPrestigeBankMax(
      incomingPlayer.raidPrestigeBank,
      persistedPlayer.raidPrestigeBank
    ),
  });
}

function mergePlayerStoreForWrite(incomingStore = {}) {
  const incoming =
    incomingStore && typeof incomingStore === "object" && !Array.isArray(incomingStore)
      ? incomingStore
      : {};

  const persisted =
    persistedCache && typeof persistedCache === "object" && !Array.isArray(persistedCache)
      ? persistedCache
      : {};

  const merged = {
    ...persisted,
  };

  for (const [userId, value] of Object.entries(incoming)) {
    const id = String(userId);

    if (isSystemStoreKey(id)) {
      // System rows like __lucky_week_event__, __marine_event_channels__,
      // __disabled_commands__, etc must be saved exactly as the command set them.
      // Do not merge them with old persisted data or OFF can rollback to ON.
      merged[id] = cloneJson(value || {});
      continue;
    }

    const incomingPlayer = normalizePlayer(
      value || {},
      value?.username || persisted[id]?.username || "Unknown"
    );

    const persistedPlayer = persisted[id]
      ? normalizePlayer(
          persisted[id],
          persisted[id]?.username || incomingPlayer.username || "Unknown"
        )
      : null;

    merged[id] = mergePlayerNoRollback(incomingPlayer, persistedPlayer, {
      preserveMissingCards: true,
      preserveMissingItems: true,
    });
  }

  return merged;
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
      max: Number(process.env.PLAYER_DB_POOL_MAX || 20),
      idleTimeoutMillis: Number(process.env.PLAYER_DB_IDLE_TIMEOUT_MS || 30000),
      connectionTimeoutMillis: Number(process.env.PLAYER_DB_CONNECT_TIMEOUT_MS || 3000),
      query_timeout: Number(process.env.PLAYER_DB_QUERY_TIMEOUT_MS || 12000),
      statement_timeout: Number(process.env.PLAYER_DB_STATEMENT_TIMEOUT_MS || 12000),
    });

    dbPool.on("error", (error) => {
      console.error("[PLAYER DB POOL ERROR]", error);
    });
  }

  return dbPool;
}

let ensurePlayersTablePromise = null;

async function ensurePlayersTable() {
  const pool = getDbPool();
  if (!pool) return;

  if (ensurePlayersTablePromise) {
    return ensurePlayersTablePromise;
  }

  ensurePlayersTablePromise = (async () => {
    await pool.query(`
      create table if not exists players (
        user_id text primary key,
        username text,
        data jsonb not null default '{}'::jsonb,
        updated_at timestamptz not null default now()
      );
    `);

    await pool.query(`
      create index if not exists players_username_idx on players (username);
    `);

    await pool.query(`
      create index if not exists players_updated_at_idx on players (updated_at);
    `);
  })().catch((error) => {
    ensurePlayersTablePromise = null;
    throw error;
  });

  return ensurePlayersTablePromise;
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

  const id = String(userId);
  const safeData = normalizeStoreRecord(id, data || {}, data?.username || "Unknown");

  await pool.query(
    `
    insert into players (user_id, username, data, updated_at)
    values ($1, $2, $3::jsonb, now())
    on conflict (user_id)
    do update set
      username = excluded.username,
      data = excluded.data,
      updated_at = now()
    `,
    [id, safeData?.username || "Unknown", JSON.stringify(safeData || {})]
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
      mergePlayerNoRollback(result || currentPlayer, dbPlayer || currentPlayer, {
        preserveMissingCards: true,
        preserveMissingItems: true,
      }),
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

    // DB save completed. Do not overwrite playersCache here.
    // The command path already updated cache immediately; a delayed DB commit
    // must not rollback newer in-memory command results.
    setPersistedCache({
      ...(persistedCache || {}),
      [id]: nextPlayer,
    });

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

    const nextA = normalizePlayer(
      mergePlayerNoRollback(result?.playerA || playerA, playerA, {
        preserveMissingCards: true,
        preserveMissingItems: true,
      }),
      playerA.username || usernameA
    );

    const nextB = normalizePlayer(
      mergePlayerNoRollback(result?.playerB || playerB, playerB, {
        preserveMissingCards: true,
        preserveMissingItems: true,
      }),
      playerB.username || usernameB
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

    // DB save completed. Do not overwrite playersCache here.
    // The command path already updated cache immediately; a delayed DB commit
    // must not rollback newer in-memory command results.
    setPersistedCache({
      ...(persistedCache || {}),
      [idA]: nextA,
      [idB]: nextB,
    });

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

  const safeData = mergePlayerStoreForWrite(data);
  const changed = [];

  for (const [userId, player] of Object.entries(safeData)) {
    const latestPlayers = playersCache || safeData;
    const latestRaw = latestPlayers?.[userId] || player;

    const normalized = normalizeStoreRecord(
      userId,
      latestRaw,
      latestRaw?.username || player?.username || "Unknown"
    );

    const before = JSON.stringify(persistedCache?.[userId] || null);
    const after = JSON.stringify(normalized || null);

    if (before !== after) {
      changed.push([userId, normalized]);
    }
  }

  if (!changed.length) return;

  for (const [userId, normalized] of changed) {
    const latestPlayers = playersCache || safeData;
    const latestRaw = latestPlayers?.[userId] || normalized;

    const latestNormalized = normalizeStoreRecord(
      userId,
      latestRaw,
      latestRaw?.username || normalized?.username || "Unknown"
    );

    await upsertOnePlayerToPostgres(userId, latestNormalized);
    persistedCache[userId] = cloneJson(latestNormalized);
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

function writePlayers(data) {
  const incomingStore = data && typeof data === "object" ? data : {};
  const currentStore =
    playersCache && typeof playersCache === "object" ? playersCache : {};

  const safeData =
    incomingStore === currentStore
      ? currentStore
      : mergePlayerStoreForWrite(incomingStore);

  setPlayersCache(safeData);

  if (USE_POSTGRES && dbReady) {
    const dirtyIds = new Set();

    for (const [userId, player] of Object.entries(safeData)) {
      const normalized = normalizeStoreRecord(
        userId,
        player,
        player?.username || "Unknown"
      );

      const before = JSON.stringify(persistedCache?.[userId] || null);
      const after = JSON.stringify(normalized || null);

      if (before !== after) {
        dirtyIds.add(String(userId));
      }
    }

    if (!dirtyIds.size) {
      return;
    }

    const pending = [];

    for (const userId of dirtyIds) {
      const player = safeData[userId];
      if (!player) continue;
      pending.push(enqueuePlayerSnapshotSave(userId, player));
    }

    if (pending.length) {
      Promise.allSettled(pending).catch((error) => {
        console.error("[PLAYER DB QUEUED WRITE ERROR]", error);
      });
    }

    return;
  }

  if (PLAYER_STORE_MODE === "postgres") {
    console.error(
      "[PLAYER STORE] Refusing writePlayers file fallback while postgres mode is required."
    );
    return;
  }

  writePlayersLocalBackupOnly(safeData);
}

async function initPlayerStore() {
  ensureFile();
  installPlayerStoreShutdownDrain();

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
      dbReady = true;
      startPlayerStoreAutoFlush();
      console.log(`[PLAYER STORE] Postgres mode active. Loaded ${Object.keys(dbPlayers).length} players.`);
      return;
    }

    const allowFileSeed =
      String(process.env.PLAYER_STORE_ALLOW_FILE_SEED || "false").toLowerCase() === "true";

    if (allowFileSeed) {
      const filePlayers = readPlayers();

      if (filePlayers && Object.keys(filePlayers).length > 0) {
        setPlayersCache(filePlayers);
        setPersistedCache({});
        dbReady = true;
        startPlayerStoreAutoFlush();
        await flushChangedPlayersToPostgres(filePlayers);
        setPersistedCache(filePlayers);
        console.log(`[PLAYER STORE] Postgres mode active. Seeded ${Object.keys(filePlayers).length} players from file.`);
        return;
      }
    }

    setPlayersCache({});
    setPersistedCache({});
    dbReady = true;
    startPlayerStoreAutoFlush();
    console.log("[PLAYER STORE] Postgres mode active. No players found yet.");
    return;
  } catch (error) {
  console.error("[PLAYER STORE] Failed to initialize Postgres mode.", error);
  dbReady = false;

  if (PLAYER_STORE_MODE === "postgres") {
    throw error;
  }

  console.error("[PLAYER STORE] Falling back to file mode.");
  readPlayers();
  setPersistedCache(playersCache || {});
  }
}

function normalizeNamedList(value, options = {}) {
  if (!Array.isArray(value)) return [];

  const allowZeroAmount = Boolean(options.allowZeroAmount);

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return {
          name: entry,
          amount: 1,
        };
      }

      if (!entry || typeof entry !== "object") return null;

      const rawAmount = Number(entry.amount);
      const amount = allowZeroAmount
        ? Math.max(0, Number.isFinite(rawAmount) ? rawAmount : 0)
        : Number.isFinite(rawAmount) && rawAmount > 0
          ? rawAmount
          : 1;

      return {
        ...entry,
        name: entry.name || "Unknown Item",
        amount,
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
    .filter(Boolean)
    .filter((entry) => allowZeroAmount || Number(entry.amount || 0) > 0);
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

function normalizeEventStore(events) {
  return events && typeof events === "object" && !Array.isArray(events)
    ? cloneJson(events)
    : {};
}

function normalizeCustomSkins(customSkins) {
  const raw =
    customSkins && typeof customSkins === "object" && !Array.isArray(customSkins)
      ? customSkins
      : {};

  const result = {};

  for (const [rawKey, rawEntry] of Object.entries(raw)) {
    const key = String(rawKey || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!key || !rawEntry || typeof rawEntry !== "object") continue;

    const variants = Array.isArray(rawEntry.variants)
      ? rawEntry.variants
          .map((skin) => ({
            name: String(skin?.name || "").trim(),
            title: String(skin?.title || "").trim(),
            image: String(skin?.image || "").trim(),
            addedBy: skin?.addedBy ? String(skin.addedBy) : null,
            addedAt: Number(skin?.addedAt || 0),
          }))
          .filter((skin) => skin.name && skin.image)
          .slice(0, 20)
      : [];

    if (!variants.length) continue;

    const activeIndex = Math.max(
      0,
      Math.min(Number(rawEntry.activeIndex || 0), variants.length - 1)
    );

    result[key] = {
      cardCode: String(rawEntry.cardCode || key),
      originalName: String(rawEntry.originalName || ""),
      activeIndex,
      variants,
    };
  }

  return result;
}

function normalizeAdminBan(adminBan) {
  if (!adminBan || typeof adminBan !== "object" || Array.isArray(adminBan)) {
    return {
      active: false,
      reason: "",
      bannedBy: null,
      bannedAt: null,
      unbannedBy: null,
      unbannedAt: null,
    };
  }

  return {
    active: Boolean(adminBan.active),
    reason: String(adminBan.reason || ""),
    bannedBy: adminBan.bannedBy ? String(adminBan.bannedBy) : null,
    bannedAt: Number.isFinite(Number(adminBan.bannedAt))
      ? Number(adminBan.bannedAt)
      : null,
    unbannedBy: adminBan.unbannedBy ? String(adminBan.unbannedBy) : null,
    unbannedAt: Number.isFinite(Number(adminBan.unbannedAt))
      ? Number(adminBan.unbannedAt)
      : null,
  };
}

function normalizePlayer(player = {}, username = "Unknown") {
  const currentIsland = player.currentIsland || "Foosha Village";

  return {
    username: player.username || username,
    customSkins: normalizeCustomSkins(player.customSkins),
    adminBan: normalizeAdminBan(player.adminBan),
    berries: typeof player.berries === "number" ? player.berries : 1000,
    gems: typeof player.gems === "number" ? player.gems : 100,

    pirateTokens: Math.max(
      0,
      Math.floor(Number(player.pirateTokens || 0))
    ),

    ryumaTokens: Math.max(
      0,
      Math.floor(Number(player.ryumaTokens || 0))
    ),

    currentIsland,
    messageMilestones: normalizeMessageMilestones(player.messageMilestones),
    dailyLastClaim: player.dailyLastClaim || null,
    cards: syncMergedCardsInPlayer({ cards: normalizeCards(player.cards) }).cards,
    fragments: normalizeFragmentList(player.fragments),
    autoLevel: normalizeAutoLevel(player.autoLevel),
    autoSac: normalizeAutoSac(player.autoSac),
    items: normalizeNamedList(player.items),
    weapons: normalizeNamedList(player.weapons),
    devilFruits: normalizeNamedList(player.devilFruits),
    boxes: normalizeNamedList(player.boxes),
    tickets: normalizeNamedList(player.tickets, { allowZeroAmount: true }),
    materials: normalizeNamedList(player.materials),
    events: normalizeEventStore(player.events),
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
      customSkins: {},
      adminBan: {
        active: false,
        reason: "",
        bannedBy: null,
        bannedAt: null,
        unbannedBy: null,
        unbannedAt: null,
      },
      berries: 1000,
      gems: 100,
      pirateTokens: 0,
      ryumaTokens: 0,
      events: {},
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
      tickets: [],
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
    const createdPlayer = normalizePlayer(getDefaultPlayer(username), username);
    players[id] = createdPlayer;
    setPlayersCache(players);

  if (USE_POSTGRES && dbReady) {
    enqueuePlayerSnapshotSave(id, createdPlayer);
  } else {
    if (PLAYER_STORE_MODE === "postgres") {
      console.error("[PLAYER STORE] Refusing file fallback write while postgres mode is required.", {
        userId: id,
        action: "create_player",
      });
    } else {
      writePlayersLocalBackupOnly(players);
    }
  }

    return createdPlayer;
  }

  const normalizedPlayer = normalizePlayer(players[id], username);
  players[id] = normalizedPlayer;
  setPlayersCache(players);

  return normalizedPlayer;
}

function updatePlayer(userId, newData) {
  return updatePlayerAtomic(
    userId,
    (currentPlayer) => ({
      ...currentPlayer,
      ...(newData || {}),
    }),
    newData?.username || "Unknown"
  );
}

function updatePlayerAtomic(userId, mutator, username = "Unknown") {
  const players = readPlayers();
  const id = String(userId);

  const currentPlayer = players[id]
    ? normalizePlayer(players[id], username)
    : getDefaultPlayer(username);

  const result =
    typeof mutator === "function"
      ? mutator(cloneJson(currentPlayer))
      : currentPlayer;

  const nextPlayer = normalizePlayer(
    result || currentPlayer,
    currentPlayer.username || username
  );

  players[id] = nextPlayer;
  setPlayersCache(players);

  if (USE_POSTGRES && dbReady) {
    enqueuePlayerSnapshotSave(id, nextPlayer);
  } else {
    if (PLAYER_STORE_MODE === "postgres") {
      console.error("[PLAYER STORE] Refusing file fallback write while postgres mode is required.", {
        userId: id,
        action: "update_player_atomic",
      });
    } else {
      writePlayersLocalBackupOnly(players);
    }
  }

  return nextPlayer;
}

function updateTwoPlayersAtomic(userIdA, userIdB, mutator, usernameA = "Unknown", usernameB = "Unknown") {
  if (USE_POSTGRES && dbReady) {
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
    setPlayersCache(players);

    // Save final snapshots. Do not rerun two-player mutator on stale DB data.
    enqueuePlayerSnapshotSave(idA, nextA);
    enqueuePlayerSnapshotSave(idB, nextB);

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
  setPlayersCache(players);

  if (PLAYER_STORE_MODE === "postgres") {
    console.error("[PLAYER STORE] Refusing two-player file fallback while postgres mode is required.", {
      userIdA: idA,
      userIdB: idB,
    });
  } else {
    writePlayers(players);
  }

  return {
    playerA: nextA,
    playerB: nextB,
  };
}

async function flushPlayerStoreNow(timeoutMs = 30000) {
  const safeTimeout = Math.max(1000, Number(timeoutMs || 30000));

  try {
    if (USE_POSTGRES && dbReady) {
      const deadline = Date.now() + safeTimeout;

      await drainPlayerStoreSaves(Math.max(1000, deadline - Date.now()));

      const latestPlayers = readPlayers();

      await flushChangedPlayersToPostgres(latestPlayers);

      return true;
    }

    const players = readPlayers();

    if (PLAYER_STORE_MODE === "postgres") {
      console.error(
        "[PLAYER STORE] Refusing flush file fallback while postgres mode is required."
      );
      return false;
    }

    writePlayersLocalBackupOnly(players);
    return true;
  } catch (error) {
    console.error("[PLAYER STORE FLUSH NOW ERROR]", error);
    return false;
  }
}

async function flushPlayerNow(userId, timeoutMs = 8000) {
  const id = String(userId || "");
  if (!id) return false;

  const safeTimeout = Math.max(1000, Number(timeoutMs || 8000));

  try {
    if (!USE_POSTGRES || !dbReady) {
      if (PLAYER_STORE_MODE === "postgres") {
        console.error("[PLAYER STORE] Refusing single-player flush without postgres readiness.", {
          userId: id,
        });
        return false;
      }

      writePlayersLocalBackupOnly(readPlayers());
      return true;
    }

    const players = readPlayers();
    const latestRaw = players?.[id];

    if (!latestRaw) return true;

    const latestNormalized = normalizeStoreRecord(
      id,
      latestRaw,
      latestRaw?.username || "Unknown"
    );

    await Promise.race([
      upsertOnePlayerToPostgres(id, latestNormalized),
      new Promise((resolve) => setTimeout(resolve, safeTimeout)),
    ]);

    persistedCache[id] = cloneJson(latestNormalized);

    return true;
  } catch (error) {
    console.error("[PLAYER STORE FLUSH PLAYER ERROR]", {
      userId: id,
      message: error?.message || error,
    });
    return false;
  }
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
  flushPlayerStoreNow,
  flushPlayerNow,
  drainPlayerStoreSaves,
  filePath,
};