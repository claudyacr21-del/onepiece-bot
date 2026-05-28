const { readPlayers, writePlayers } = require("../playerStore");

const STORE_KEY = "__patreon_roles__";

function getStoreRoot() {
  const players = readPlayers();

  if (!players[STORE_KEY] || typeof players[STORE_KEY] !== "object") {
    players[STORE_KEY] = {
      username: "Patreon Role Store",
      roles: {},
      updatedAt: Date.now(),
    };
    writePlayers(players);
  }

  if (!players[STORE_KEY].roles || typeof players[STORE_KEY].roles !== "object") {
    players[STORE_KEY].roles = {};
  }

  return {
    players,
    store: players[STORE_KEY],
  };
}

function normalizeTier(value) {
  const tier = String(value || "mother_flame").toLowerCase().trim();

  if (tier === "vivre_card" || tier === "vivrecard" || tier === "vivre" || tier === "vc") {
    return "vivre_card";
  }

  return "mother_flame";
}

function normalizeEntry(userId, entry = {}) {
  return {
    userId: String(userId),
    tier: normalizeTier(entry.tier),
    roleId: String(entry.roleId || ""),
    guildId: String(entry.guildId || ""),
    grantedBy: String(entry.grantedBy || ""),
    grantedAt: Number(entry.grantedAt || Date.now()),
    expiresAt: Number(entry.expiresAt || Date.now()),
  };
}

function readPatreonRoles() {
  const { store } = getStoreRoot();
  const output = {};

  for (const [userId, entry] of Object.entries(store.roles || {})) {
    if (!entry || typeof entry !== "object") continue;
    output[String(userId)] = normalizeEntry(userId, entry);
  }

  return output;
}

function writePatreonRoles(data) {
  const { players, store } = getStoreRoot();

  const clean = {};

  for (const [userId, entry] of Object.entries(data || {})) {
    if (!entry || typeof entry !== "object") continue;
    clean[String(userId)] = normalizeEntry(userId, entry);
  }

  players[STORE_KEY] = {
    ...store,
    username: "Patreon Role Store",
    roles: clean,
    updatedAt: Date.now(),
  };

  writePlayers(players);
}

function setPatreonRole(userId, payload) {
  const data = readPatreonRoles();

  data[String(userId)] = normalizeEntry(userId, {
    userId: String(userId),
    tier: payload?.tier || "mother_flame",
    roleId: payload?.roleId || "",
    guildId: payload?.guildId || "",
    grantedBy: payload?.grantedBy || "",
    grantedAt: Number(payload?.grantedAt || Date.now()),
    expiresAt: Number(payload?.expiresAt || Date.now()),
  });

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
          .remove(String(entry.roleId), "Patreon premium expired")
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