const fs = require("fs");
const path = require("path");

const persistentDir = process.env.PLAYER_DATA_DIR || "/data";
const fallbackDir = path.join(__dirname, "..", "data");

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

function readPatreonRoles() {
  ensureFile();

  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("[PATREON ROLE STORE] Invalid JSON, resetting.", error);
    fs.writeFileSync(filePath, "{}", "utf8");
    return {};
  }
}

function writePatreonRoles(data) {
  ensureFile();

  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function setPatreonRole(userId, payload) {
  const data = readPatreonRoles();

  data[String(userId)] = {
    userId: String(userId),
    roleId: String(payload.roleId),
    guildId: String(payload.guildId),
    grantedBy: String(payload.grantedBy || ""),
    grantedAt: Number(payload.grantedAt || Date.now()),
    expiresAt: Number(payload.expiresAt || Date.now()),
  };

  writePatreonRoles(data);

  return data[String(userId)];
}

function removePatreonRole(userId) {
  const data = readPatreonRoles();

  delete data[String(userId)];

  writePatreonRoles(data);
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
  readPatreonRoles,
  writePatreonRoles,
  setPatreonRole,
  removePatreonRole,
  syncExpiredPatreonRoles,
};