const fs = require("fs");
const path = require("path");

const {
  USE_POSTGRES,
  loadJsonStateFromDb,
  saveJsonStateToDb,
} = require("./jsonStateDb");

const PATREON_STATE_KEY = "patreon_roles";

const persistentDir = process.env.PLAYER_DATA_DIR || "/data";
const fallbackDir = path.join(__dirname, "..", "data");

let cache = null;
let dbReady = false;
let saveQueue = Promise.resolve();

function resolveDir() {
  try {
    fs.mkdirSync(persistentDir, { recursive: true });
    return persistentDir;
  } catch {
    fs.mkdirSync(fallbackDir, { recursive: true });
    return fallbackDir;
  }
}

const dataDir = resolveDir();
const filePath = path.join(dataDir, "patreonRoles.json");

function ensureFile() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "{}", "utf8");
  }
}

function safeParseJson(raw) {
  if (!raw || !String(raw).trim()) return {};
  return JSON.parse(raw);
}

function normalizeEntry(userId, payload = {}) {
  return {
    userId: String(payload.userId || userId),
    roleId: String(payload.roleId || ""),
    guildId: String(payload.guildId || ""),
    grantedBy: String(payload.grantedBy || ""),
    grantedAt: Number(payload.grantedAt || Date.now()),
    expiresAt: Number(payload.expiresAt || Date.now()),
  };
}

function normalizePatreonRoles(raw = {}) {
  const data = {};

  for (const [userId, entry] of Object.entries(raw || {})) {
    if (!entry) continue;
    data[String(userId)] = normalizeEntry(userId, entry);
  }

  return data;
}

function readFileStore() {
  ensureFile();

  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    return normalizePatreonRoles(raw ? safeParseJson(raw) : {});
  } catch (error) {
    console.error("[PATREON ROLE STORE] Invalid JSON, resetting.", error);
    fs.writeFileSync(filePath, "{}", "utf8");
    return {};
  }
}

function writeFileStore(data) {
  ensureFile();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data || {}, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function readPatreonRoles() {
  if (cache) return cache;
  cache = readFileStore();
  return cache;
}

function writePatreonRoles(data) {
  cache = normalizePatreonRoles(data || {});

  if (USE_POSTGRES && dbReady) {
    saveQueue = saveQueue
      .catch(() => {})
      .then(() => saveJsonStateToDb(PATREON_STATE_KEY, cache))
      .catch((error) => {
        console.error("[PATREON ROLE STORE DB SAVE ERROR]", error);
      });

    return;
  }

  writeFileStore(cache);
}

async function initPatreonRoleStore() {
  ensureFile();

  if (!USE_POSTGRES) {
    cache = readFileStore();
    console.log("[PATREON ROLE STORE] File mode active.");
    return;
  }

  try {
    const dbState = await loadJsonStateFromDb(PATREON_STATE_KEY);

    if (dbState && Object.keys(dbState || {}).length > 0) {
      cache = normalizePatreonRoles(dbState);
      dbReady = true;
      console.log("[PATREON ROLE STORE] Postgres mode active.");
      return;
    }

    const allowFileSeed =
      String(process.env.PATREON_STORE_ALLOW_FILE_SEED || "false").toLowerCase() ===
      "true";

    if (allowFileSeed) {
      const fileState = readFileStore();

      if (fileState && Object.keys(fileState).length > 0) {
        cache = normalizePatreonRoles(fileState);
        dbReady = true;
        await saveJsonStateToDb(PATREON_STATE_KEY, cache);
        console.log("[PATREON ROLE STORE] Seeded file data to Postgres.");
        return;
      }
    }

    cache = {};
    dbReady = true;
    await saveJsonStateToDb(PATREON_STATE_KEY, cache);
    console.log("[PATREON ROLE STORE] Postgres mode active. No roles found yet.");
  } catch (error) {
    console.error("[PATREON ROLE STORE] Failed to initialize Postgres mode.", error);
    dbReady = false;
    cache = readFileStore();
  }
}

function setPatreonRole(userId, payload) {
  const data = readPatreonRoles();

  data[String(userId)] = normalizeEntry(userId, {
    ...payload,
    userId: String(userId),
  });

  writePatreonRoles(data);
  return data[String(userId)];
}

function removePatreonRole(userId) {
  const data = readPatreonRoles();
  delete data[String(userId)];
  writePatreonRoles(data);
}

function getActivePatreonRole(userId) {
  const data = readPatreonRoles();
  const entry = data[String(userId)];

  if (!entry) return null;
  if (Number(entry.expiresAt || 0) <= Date.now()) return null;

  return entry;
}

function hasActivePatreonRole(userId) {
  return Boolean(getActivePatreonRole(userId));
}

async function syncExpiredPatreonRoles(client) {
  const data = readPatreonRoles();
  const now = Date.now();
  let changed = false;

  for (const [userId, entry] of Object.entries(data)) {
    if (Number(entry.expiresAt || 0) > now) continue;

    const guild =
      client.guilds.cache.get(String(entry.guildId)) ||
      (await client.guilds.fetch(String(entry.guildId)).catch(() => null));

    if (guild) {
      const member = await guild.members.fetch(String(userId)).catch(() => null);

      if (member && entry.roleId && member.roles.cache.has(String(entry.roleId))) {
        await member.roles
          .remove(String(entry.roleId), "Mother Flame Patreon expired")
          .catch((error) => {
            console.warn(
              "[PATREON ROLE STORE] Failed removing expired role:",
              error?.message || error
            );
          });
      }
    }

    delete data[userId];
    changed = true;
  }

  if (changed) {
    writePatreonRoles(data);
  }
}

module.exports = {
  initPatreonRoleStore,
  readPatreonRoles,
  writePatreonRoles,
  setPatreonRole,
  removePatreonRole,
  getActivePatreonRole,
  hasActivePatreonRole,
  syncExpiredPatreonRoles,
};