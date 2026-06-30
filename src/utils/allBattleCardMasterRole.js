const { readPlayers } = require("../playerStore");
const rawCards = require("../data/cards");

let allBattleCardMasterRoleRunning = false;

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^_+|_+$/g, "");
}

function getCardCode(card) {
  return normalizeText(
    card?.code ||
      card?.baseCode ||
      card?.cardCode ||
      card?.name ||
      card?.displayName ||
      card?.cardName
  );
}

function isBattleCard(card) {
  const role = String(card?.cardRole || card?.role || "battle")
    .toLowerCase()
    .trim();

  return role !== "boost";
}

function getRequiredBattleCardCodes() {
  const codes = new Set();

  for (const card of Array.isArray(rawCards) ? rawCards : []) {
    if (!card || !isBattleCard(card)) continue;

    const code = getCardCode(card);
    if (!code) continue;

    codes.add(code);
  }

  return [...codes];
}

function getCardStage(card) {
  const numericStage = Number(card?.evolutionStage || card?.stageLevel || 0);

  if (Number.isFinite(numericStage) && numericStage > 0) {
    return Math.max(1, Math.floor(numericStage));
  }

  const key = String(card?.evolutionKey || card?.form || card?.stage || "")
    .toUpperCase()
    .trim();

  const matched = key.match(/M([123])/);
  if (matched) return Number(matched[1]);

  return 1;
}

function getCardLevel(card) {
  return Math.max(
    0,
    Number(card?.level || 0),
    Number(card?.currentLevel || 0),
    Number(card?.lvl || 0)
  );
}

function isM3Level100(card) {
  return getCardStage(card) >= 3 && getCardLevel(card) >= 100;
}

function buildPlayerMasteredBattleCardCodeSet(player) {
  const mastered = new Set();
  const cards = Array.isArray(player?.cards) ? player.cards : [];

  for (const card of cards) {
    if (!card || !isBattleCard(card)) continue;
    if (!isM3Level100(card)) continue;

    const code = getCardCode(card);
    if (!code) continue;

    mastered.add(code);
  }

  return mastered;
}

function getMissingBattleCardCodes(player, requiredCodes) {
  const mastered = buildPlayerMasteredBattleCardCodeSet(player);

  return requiredCodes.filter((code) => !mastered.has(code));
}

function isAllBattleCardsM3Level100(player, requiredCodes) {
  if (!requiredCodes.length) return false;

  return getMissingBattleCardCodes(player, requiredCodes).length === 0;
}

async function syncAllBattleCardMasterRole(client, reason = "manual") {
  if (allBattleCardMasterRoleRunning) return;

  const roleId = String(process.env.ALL_BATTLECARD_M3_LV100_ROLE_ID || "").trim();

  if (!roleId) {
    return;
  }

  const guildId =
    process.env.ONEPIECE_MAIN_GUILD_ID ||
    process.env.SUPPORT_GUILD_ID ||
    process.env.GUILD_ID ||
    process.env.SERVER_ID ||
    "";

  if (!guildId) {
    console.warn("[ALL BATTLECARD MASTER ROLE] Missing guild id env.");
    return;
  }

  allBattleCardMasterRoleRunning = true;

  try {
    const guild =
      client.guilds.cache.get(guildId) ||
      (await client.guilds.fetch(guildId).catch(() => null));

    if (!guild) {
      console.warn("[ALL BATTLECARD MASTER ROLE] Guild not found:", guildId);
      return;
    }

    const role =
      guild.roles.cache.get(roleId) ||
      (await guild.roles.fetch(roleId).catch(() => null));

    if (!role) {
      console.warn("[ALL BATTLECARD MASTER ROLE] Role not found:", roleId);
      return;
    }

    const players = readPlayers();
    const requiredCodes = getRequiredBattleCardCodes();
    const removeWhenLost =
      String(process.env.ALL_BATTLECARD_M3_LV100_REMOVE_WHEN_LOST || "false")
        .toLowerCase()
        .trim() === "true";

    let checked = 0;
    let eligible = 0;
    let added = 0;
    let removed = 0;
    let missingMember = 0;

    for (const [userId, player] of Object.entries(players || {})) {
      if (String(userId || "").startsWith("__")) continue;

      checked += 1;

      const qualifies = isAllBattleCardsM3Level100(player, requiredCodes);

      if (qualifies) eligible += 1;

      const member =
        guild.members.cache.get(userId) ||
        (await guild.members.fetch(userId).catch(() => null));

      if (!member) {
        if (qualifies) missingMember += 1;
        continue;
      }

      const hasRole = member.roles.cache.has(roleId);

      if (qualifies && !hasRole) {
        await member.roles.add(roleId, "All battle cards M3 Level 100");
        added += 1;
        continue;
      }

      if (!qualifies && hasRole && removeWhenLost) {
        await member.roles.remove(roleId, "No longer has all battle cards M3 Level 100");
        removed += 1;
      }
    }

    console.log(
      `[ALL BATTLECARD MASTER ROLE] Sync complete via ${reason}. ` +
        `Required=${requiredCodes.length}, Checked=${checked}, Eligible=${eligible}, ` +
        `Added=${added}, Removed=${removed}, MissingMember=${missingMember}`
    );
  } catch (error) {
    console.error("[ALL BATTLECARD MASTER ROLE ERROR]", error);
  } finally {
    allBattleCardMasterRoleRunning = false;
  }
}

function startAllBattleCardMasterRoleSync(client) {
  const roleId = String(process.env.ALL_BATTLECARD_M3_LV100_ROLE_ID || "").trim();

  if (!roleId) {
    console.log("[ALL BATTLECARD MASTER ROLE] Disabled. Missing ALL_BATTLECARD_M3_LV100_ROLE_ID.");
    return;
  }

  const intervalMs = Math.max(
    60_000,
    Number(process.env.ALL_BATTLECARD_M3_LV100_SYNC_MS || 600000)
  );

  syncAllBattleCardMasterRole(client, "startup").catch((error) => {
    console.error("[ALL BATTLECARD MASTER ROLE STARTUP ERROR]", error);
  });

  setInterval(() => {
    syncAllBattleCardMasterRole(client, "interval").catch((error) => {
      console.error("[ALL BATTLECARD MASTER ROLE INTERVAL ERROR]", error);
    });
  }, intervalMs);

  console.log(
    `[ALL BATTLECARD MASTER ROLE] Scheduler active. Check every ${intervalMs}ms.`
  );
}

module.exports = {
  startAllBattleCardMasterRoleSync,
  syncAllBattleCardMasterRole,
  getRequiredBattleCardCodes,
  getMissingBattleCardCodes,
  isAllBattleCardsM3Level100,
};