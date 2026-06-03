const fs = require("fs");
const path = require("path");

const BASE_MAX_MEMBERS = 6;
const MAX_CREW_SLOT_PERK_LEVEL = 4;
const MAX_MEMBERS = BASE_MAX_MEMBERS + MAX_CREW_SLOT_PERK_LEVEL;

function getPirateMemberLimit(raw) {
  const level = Math.max(
    0,
    Math.min(
      MAX_CREW_SLOT_PERK_LEVEL,
      Math.floor(Number(raw?.perks?.crewSlotBoost || 0))
    )
  );

  return BASE_MAX_MEMBERS + level;
}
const STORE_VERSION = 1;
const PIRATE_STATE_KEY = "pirates";
let dbReady = false;
let saveQueue = Promise.resolve();
const {
  USE_POSTGRES,
  loadJsonStateFromDb,
  saveJsonStateToDb,
} = require("./jsonStateDb");
const dataDir =
  process.env.PIRATE_DATA_DIR ||
  process.env.PLAYER_DATA_DIR ||
  path.join(__dirname, "..", "data");

const filePath = path.join(dataDir, "pirates.json");

let cache = null;

function ensureFile() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      JSON.stringify({ version: STORE_VERSION, pirates: {}, invites: {} }, null, 2),
      "utf8"
    );
  }
}

function cloneJson(value) {
  return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : {};
}

function safeParse(raw) {
  if (!raw || !String(raw).trim()) return {};
  return JSON.parse(raw);
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 32);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

function makePirateId(name) {
  const base = slugify(name) || "pirate";
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}_${rand}`;
}

function normalizeMaterialKey(value) {
  const key = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const aliases = {
    cola: "cola_engine_part",
    engine: "cola_engine_part",
    cola_engine: "cola_engine_part",
    cola_engine_part: "cola_engine_part",

    enhancement: "enhancement_stone",
    stone: "enhancement_stone",
    enhancement_stone: "enhancement_stone",

    wood: "hardwood",
    hard_wood: "hardwood",
    hardwood: "hardwood",

    iron: "iron_plating",
    iron_plate: "iron_plating",
    iron_plating: "iron_plating",

    cloth: "sail_cloth",
    sail: "sail_cloth",
    sail_cloth: "sail_cloth",

    steel: "iron_plating",
    rope: "sail_cloth",
    gunpowder: "enhancement_stone",
    scrap: "hardwood",
    ship_part: "hardwood",
    rare_ship_part: "cola_engine_part",
  };

  return aliases[key] || key;
}

function normalizeRaidState(rawRaids) {
  const raids = {};

  if (!rawRaids || typeof rawRaids !== "object") {
    return raids;
  }

  for (const [tierKey, raid] of Object.entries(rawRaids)) {
    if (!raid || typeof raid !== "object") continue;

    const lastAttackAt = {};

    if (raid.lastAttackAt && typeof raid.lastAttackAt === "object") {
      for (const [userId, timestamp] of Object.entries(raid.lastAttackAt)) {
        const safeUserId = String(userId || "");
        const safeTimestamp = Number(timestamp || 0);

        if (!safeUserId || safeTimestamp <= 0) continue;
        lastAttackAt[safeUserId] = safeTimestamp;
      }
    }

    const contributors = {};

    if (raid.contributors && typeof raid.contributors === "object") {
      for (const [userId, data] of Object.entries(raid.contributors)) {
        const safeUserId = String(userId || "");
        if (!safeUserId) continue;

        contributors[safeUserId] = {
          damage: Math.max(0, Math.floor(Number(data?.damage || 0))),
          points: Math.max(0, Math.floor(Number(data?.points || 0))),
          attacks: Math.max(0, Math.floor(Number(data?.attacks || 0))),
          lastAttackAt: Number(data?.lastAttackAt || 0),
        };
      }
    }

    raids[String(tierKey)] = {
      hpLeft: Math.max(0, Math.floor(Number(raid.hpLeft || 0))),
      defeated: Boolean(raid.defeated),
      defeatedAt: Number(raid.defeatedAt || 0),
      clearRewardedAt: Number(raid.clearRewardedAt || 0),
      totalDamage: Math.max(0, Math.floor(Number(raid.totalDamage || 0))),
      contributors,
      lastAttackAt,
    };
  }

  return raids;
}

function normalizePirate(raw) {
  const now = Date.now();
  const memberLimit = getPirateMemberLimit(raw);

  const members = Array.isArray(raw?.members)
    ? [...new Set(raw.members.map(String).filter(Boolean))].slice(0, memberLimit)
    : [];

  const leaderId = String(raw?.leaderId || members[0] || "");
  const viceLeaderId =
    raw?.viceLeaderId && String(raw.viceLeaderId) !== leaderId
      ? String(raw.viceLeaderId)
      : null;

  const finalMembers = [...new Set([leaderId, ...members].filter(Boolean))].slice(
    0,
    memberLimit
  );

  const storageMaterials = {};
  const rawMaterials = raw?.storage?.materials || {};
  for (const [code, item] of Object.entries(rawMaterials)) {
    const key = normalizeMaterialKey(code || item?.code || item?.name);
    const amount = Math.floor(Number(item?.amount || 0));
    if (!key || amount <= 0) continue;
    storageMaterials[key] = {
      code: key,
      name: item?.name || key.replace(/_/g, " "),
      amount,
    };
  }

  return {
    id: String(raw?.id || makePirateId(raw?.name || "pirate")),
    name: normalizeName(raw?.name || "Unnamed Pirates"),
    createdAt: Number(raw?.createdAt || now),
    updatedAt: Number(raw?.updatedAt || now),
    leaderId,
    viceLeaderId: finalMembers.includes(viceLeaderId) ? viceLeaderId : null,
    members: finalMembers,
    memberLimit,
    level: Math.max(1, Math.min(100, Math.floor(Number(raw?.level || 1)))),
    weeklyPoints: Math.max(0, Math.floor(Number(raw?.weeklyPoints || 0))),
    totalPoints: Math.max(0, Math.floor(Number(raw?.totalPoints || 0))),
    storage: {
      berries: Math.max(0, Math.floor(Number(raw?.storage?.berries || 0))),
      materials: storageMaterials,
    },
    perks: raw?.perks && typeof raw.perks === "object" ? raw.perks : {},
    raids: normalizeRaidState(raw?.raids || {}),
    lastWeeklyReward:
      raw?.lastWeeklyReward && typeof raw.lastWeeklyReward === "object"
        ? raw.lastWeeklyReward
        : null,
    logs: Array.isArray(raw?.logs) ? raw.logs.slice(-25) : [],
  };
}

function normalizeState(raw) {
  const pirates = {};
  for (const [id, pirate] of Object.entries(raw?.pirates || {})) {
    const normalized = normalizePirate({ ...pirate, id: pirate?.id || id });
    if (normalized.leaderId) pirates[normalized.id] = normalized;
  }

  const invites = {};
  const now = Date.now();
  for (const [userId, invite] of Object.entries(raw?.invites || {})) {
    const expiresAt = Number(invite?.expiresAt || 0);
    if (!invite?.pirateId || expiresAt <= now) continue;
    invites[String(userId)] = {
      pirateId: String(invite.pirateId),
      invitedBy: invite.invitedBy ? String(invite.invitedBy) : null,
      expiresAt,
    };
  }

  return {
    version: STORE_VERSION,
    pirates,
    invites,
    lastWeeklyResetAt: Number(raw?.lastWeeklyResetAt || 0),
  };
}

function readPirateState() {
  if (cache) return cache;
  ensureFile();

  try {
    cache = normalizeState(safeParse(fs.readFileSync(filePath, "utf8")));
    return cache;
  } catch (error) {
    console.error("[PIRATE STORE READ ERROR]", error);
    const brokenPath = `${filePath}.broken.${Date.now()}.bak`;

    try {
      fs.copyFileSync(filePath, brokenPath);
    } catch (_) {}

    cache = normalizeState({});
    writePirateState(cache);
    return cache;
  }
}

function writePirateState(state) {
  ensureFile();

  cache = normalizeState(state || {});

  if (USE_POSTGRES && dbReady) {
    saveQueue = saveQueue
      .catch(() => {})
      .then(() => saveJsonStateToDb(PIRATE_STATE_KEY, cache))
      .catch((error) => {
        console.error("[PIRATE STORE DB SAVE ERROR]", error);
      });

    return cache;
  }

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(cache, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);

  return cache;
}

async function initPirateStore() {
  ensureFile();

  if (!USE_POSTGRES) {
    readPirateState();
    console.log("[PIRATE STORE] File mode active.");
    return;
  }

  try {
    const dbState = await loadJsonStateFromDb(PIRATE_STATE_KEY);

    if (dbState && Object.keys(dbState || {}).length > 0) {
      cache = normalizeState(dbState);
      dbReady = true;
      console.log("[PIRATE STORE] Postgres mode active.");
      return;
    }

    const allowFileSeed =
      String(process.env.PIRATE_STORE_ALLOW_FILE_SEED || "false").toLowerCase() ===
      "true";

    if (allowFileSeed) {
      const fileState = readPirateState();

      if (fileState && Object.keys(fileState.pirates || {}).length > 0) {
        cache = normalizeState(fileState);
        dbReady = true;
        await saveJsonStateToDb(PIRATE_STATE_KEY, cache);
        console.log("[PIRATE STORE] Seeded pirates from file to Postgres.");
        return;
      }
    }

    cache = normalizeState({});
    dbReady = true;
    await saveJsonStateToDb(PIRATE_STATE_KEY, cache);
    console.log("[PIRATE STORE] Postgres mode active. No pirates found yet.");
  } catch (error) {
    console.error("[PIRATE STORE] Failed to initialize Postgres mode.", error);
    dbReady = false;
    readPirateState();
  }
}

function findPirateByUser(userId) {
  const id = String(userId || "");
  const state = readPirateState();
  return (
    Object.values(state.pirates).find((pirate) =>
      (pirate.members || []).map(String).includes(id)
    ) || null
  );
}

function findPirateByNameOrId(query) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return null;

  const state = readPirateState();
  if (state.pirates[q]) return state.pirates[q];

  return (
    Object.values(state.pirates).find((pirate) => {
      const name = String(pirate.name || "").toLowerCase();
      return (
        String(pirate.id || "").toLowerCase() === q ||
        name === q ||
        name.includes(q)
      );
    }) || null
  );
}

function createPirate({ name, leaderId }) {
  const state = readPirateState();
  const cleanName = normalizeName(name);

  if (!cleanName || cleanName.length < 3) {
    throw new Error("Pirate name must be at least 3 characters.");
  }

  if (findPirateByUser(leaderId)) {
    throw new Error("You are already in a pirate/guild.");
  }

  const duplicate = Object.values(state.pirates).find(
    (pirate) => String(pirate.name || "").toLowerCase() === cleanName.toLowerCase()
  );

  if (duplicate) {
    throw new Error("That pirate/guild name is already used.");
  }

  const id = makePirateId(cleanName);
  const pirate = normalizePirate({
    id,
    name: cleanName,
    leaderId: String(leaderId),
    members: [String(leaderId)],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  state.pirates[id] = pirate;
  writePirateState(state);
  return pirate;
}

function updatePirate(pirateId, mutator) {
  const state = readPirateState();
  const id = String(pirateId || "");
  const current = state.pirates[id];

  if (!current) {
    throw new Error("Pirate/guild not found.");
  }

  const next = normalizePirate({
    ...current,
    ...(typeof mutator === "function" ? mutator(cloneJson(current)) : current),
    id,
    updatedAt: Date.now(),
  });

  state.pirates[id] = next;
  writePirateState(state);
  return next;
}

function deletePirate(pirateId) {
  const state = readPirateState();
  delete state.pirates[String(pirateId || "")];

  for (const [userId, invite] of Object.entries(state.invites || {})) {
    if (String(invite?.pirateId || "") === String(pirateId || "")) {
      delete state.invites[userId];
    }
  }

  writePirateState(state);
}

function createInvite({ pirateId, targetUserId, invitedBy, durationMs = 24 * 60 * 60 * 1000 }) {
  const state = readPirateState();
  const pirate = state.pirates[String(pirateId || "")];

  if (!pirate) throw new Error("Pirate/guild not found.");

  state.invites[String(targetUserId)] = {
    pirateId: pirate.id,
    invitedBy: invitedBy ? String(invitedBy) : null,
    expiresAt: Date.now() + durationMs,
  };

  writePirateState(state);
  return state.invites[String(targetUserId)];
}

function consumeInvite(targetUserId, pirateId) {
  const state = readPirateState();
  const invite = state.invites[String(targetUserId || "")];

  if (!invite) return null;
  if (Number(invite.expiresAt || 0) <= Date.now()) {
    delete state.invites[String(targetUserId || "")];
    writePirateState(state);
    return null;
  }

  if (pirateId && String(invite.pirateId) !== String(pirateId)) {
    return null;
  }

  delete state.invites[String(targetUserId || "")];
  writePirateState(state);
  return invite;
}

function isLeader(pirate, userId) {
  return String(pirate?.leaderId || "") === String(userId || "");
}

function isViceLeader(pirate, userId) {
  return String(pirate?.viceLeaderId || "") === String(userId || "");
}

function isOfficer(pirate, userId) {
  return isLeader(pirate, userId) || isViceLeader(pirate, userId);
}

function getRole(pirate, userId) {
  if (isLeader(pirate, userId)) return "Leader";
  if (isViceLeader(pirate, userId)) return "Vice Leader";
  return "Crew";
}

module.exports = {
  MAX_MEMBERS,
  BASE_MAX_MEMBERS,
  MAX_CREW_SLOT_PERK_LEVEL,
  getPirateMemberLimit,
  normalizeMaterialKey,
  readPirateState,
  writePirateState,
  findPirateByUser,
  findPirateByNameOrId,
  createPirate,
  updatePirate,
  deletePirate,
  createInvite,
  consumeInvite,
  isLeader,
  isViceLeader,
  isOfficer,
  getRole,
  initPirateStore,
};