const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { hydrateCard, findCardTemplate } = require("../utils/evolution");
const { isMergeCard, buildMergedCard, getMergeSourceCodes } = require("../utils/mergeCards");
const { applyCustomSkinToCard } = require("../utils/customSkins");
const activeRaidReadyNotices = new Set();
const {
  getPlayerCombatBoosts,
} = require("../utils/combatStats");
const {
  getRoom,
  hasActiveRoom,
  createRaidRoom,
  addParticipant,
  startRoom,
  deleteRoom,
} = require("../utils/partyRooms");

const raidBossImages = require("../config/raidBossImages");
const weaponsDb = require("../data/weapons");
const devilFruitsDb = require("../data/devilFruits");
const { applyPirateRewardBonuses } = require("../utils/rewardBonuses");
const {
  getServerTagPerks,
} = require("../utils/serverTagPerks");

const RAID_ROOM_TIMEOUT_MS = 30 * 60 * 1000;
const RAID_LOBBY_IDLE_REFUND_MS = 2 * 60 * 1000;
const RAID_PICK_TIMEOUT_MS = 60 * 1000;
const MAX_BATTLE_LOG_LINES = 2;

const activeRaidActionLocks = new Set(); const activeRaidLobbyLocks = new Set(); const activeRaidJoinLocks = new Set(); const activeRaidStartLocks = new Set();

async function safeDeferInteraction(interaction) {
  try {
    if (!interaction || interaction.deferred || interaction.replied) return true;

    await interaction.deferUpdate();
    return true;
  } catch (error) {
    const code = error?.code;
    const message = String(error?.message || "");

    if (code !== 10062 && code !== 40060 && !message.includes("Unknown interaction")) {
      console.error("[raid defer interaction failed]", error?.message || error);
    }

    return false;
  }
}

async function safeDeferReplyInteraction(interaction) {
  try {
    if (!interaction || interaction.deferred || interaction.replied) return true;

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    return true;
  } catch (error) {
    const code = error?.code;
    const message = String(error?.message || "");

    if (code !== 10062 && code !== 40060 && !message.includes("Unknown interaction")) {
      console.error("[raid defer reply failed]", error?.message || error);
    }

    return false;
  }
}

async function safeReplyOrEdit(interaction, payload = {}) {
  try {
    if (!interaction) return null;

    const wantsEphemeral = payload.ephemeral !== false;
    const cleanPayload = {
      ...payload,
    };

    delete cleanPayload.ephemeral;

    const safePayload = wantsEphemeral
      ? {
          ...cleanPayload,
          flags: cleanPayload.flags || MessageFlags.Ephemeral,
        }
      : cleanPayload;

    if (interaction.replied) {
      return await interaction.followUp(safePayload);
    }

    if (interaction.deferred) {
      try {
        return await interaction.editReply(cleanPayload);
      } catch (_) {
        return await interaction.followUp(safePayload);
      }
    }

    return await interaction.reply(safePayload);
  } catch (error) {
    const code = error?.code;
    const message = String(error?.message || "");

    if (code !== 10062 && code !== 40060 && !message.includes("Unknown interaction")) {
      console.error("[raid interaction reply/edit failed]", error?.message || error);
    }

    return null;
  }
}

async function safeInteractionUpdate(interaction, payload) {
  try {
    if (!interaction) return null;

    if (!interaction.deferred && !interaction.replied) {
      return await interaction.update(payload);
    }

    if (interaction.message) {
      return await interaction.message.edit(payload);
    }

    return await interaction.editReply(payload);
  } catch (error) {
    const code = error?.code;
    const message = String(error?.message || "");

    if (code !== 10062 && code !== 40060 && !message.includes("Unknown interaction")) {
      console.error("[raid interaction update failed]", error?.message || error);
    }

    try {
      if (interaction?.message) {
        return await interaction.message.edit(payload);
      }
    } catch (editError) {
      console.error("[raid interaction update fallback failed]", editError?.message || editError);
    }

    return null;
  }
}

async function replyRoomExpired(interaction) {
  await safeDeferReplyInteraction(interaction);
  return safeReplyOrEdit(interaction, {
    content:
      "This raid room is no longer active. Railway may have restarted or the raid room expired. Please create a new raid with `op raid <boss>`.",
  });
}

async function safeEditRaidMessage(message, payload) {
  try {
    if (!message) return false;
    await message.edit(payload);
    return true;
  } catch (error) {
    console.error("[raid message edit failed]", error?.message || error);
    return false;
  }
}


const __fightSystem5ActionLocks = new Set();

function __getActionLockKey(interaction) {
  return [
    interaction?.message?.id || "no-message",
    interaction?.user?.id || "no-user",
  ].join(":");
}

async function __tryStartAction(interaction, safeDeferFn = null) {
  const key = __getActionLockKey(interaction);

  if (__fightSystem5ActionLocks.has(key)) {
    if (typeof safeDeferFn === "function") {
      await safeDeferFn(interaction).catch(() => null);
    }
    return {
      ok: false,
      key,
    };
  }

  __fightSystem5ActionLocks.add(key);

  return {
    ok: true,
    key,
  };
}

function __endAction(key) {
  if (!key) return;
  __fightSystem5ActionLocks.delete(key);
}

function safeDeleteRaidRoom(hostId, reason = "unknown") {
  try {
    const room = getRoom(hostId);
    if (!room) return false;

    deleteRoom(hostId);

    if (room.roomId) {
      activeRaidReadyNotices.delete(String(room.roomId));
    }

    return true;
  } catch (error) {
    console.error("[raid safe delete room failed]", error?.message || error);
    return false;
  }
}

function clampEmbedText(text, max = 3900) {
  const value = String(text || "");

  if (value.length <= max) return value;

  return `${value.slice(0, Math.max(0, max - 40))}\n\n...display truncated`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRaidCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^_+|_+$/g, "");
}

function normalizeRaidText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function getRaidCardDisplayNameByCode(code) {
  const template = findCardTemplate(code);
  return String(template?.displayName || template?.name || code || "").trim();
}

function getWeaponOwnerCodes(weapon) {
  const values = [
    weapon?.ownerCode,
    weapon?.ownerCardCode,
    weapon?.cardCode,
    weapon?.characterCode,
    weapon?.userCode,
    weapon?.knownUserCode,
    weapon?.knownUser,
    weapon?.owner,
    weapon?.user,
    weapon?.character,
    ...(Array.isArray(weapon?.owners) ? weapon.owners : []),
    ...(Array.isArray(weapon?.ownerCodes) ? weapon.ownerCodes : []),
    ...(Array.isArray(weapon?.users) ? weapon.users : []),
  ];

  const out = new Set();

  for (const value of values) {
    if (!value) continue;

    if (typeof value === "object") {
      const nested = [
        value.code,
        value.cardCode,
        value.characterCode,
        value.name,
        value.displayName,
      ];

      for (const item of nested) {
        const code = normalizeRaidCode(item);
        const text = normalizeRaidText(item);
        if (code) out.add(code);
        if (text) out.add(text);
      }

      continue;
    }

    const code = normalizeRaidCode(value);
    const text = normalizeRaidText(value);

    if (code) out.add(code);
    if (text) out.add(text);
  }

  return out;
}

function getWeaponOwnerMatchKeys(cardCode) {
  const template = findCardTemplate(cardCode) || {};
  const keys = new Set();

  const values = [
    cardCode,
    template.code,
    template.name,
    template.displayName,
    template.title,
  ];

  for (const value of values) {
    const code = normalizeRaidCode(value);
    const text = normalizeRaidText(value);

    if (code) keys.add(code);
    if (text) keys.add(text);
  }

  return keys;
}

function weaponMatchesCardCode(weapon, cardCode) {
  const ownerCodes = getWeaponOwnerCodes(weapon);
  const matchKeys = getWeaponOwnerMatchKeys(cardCode);

  for (const key of matchKeys) {
    if (ownerCodes.has(key)) return true;
  }

  return false;
}

function getRaidRewardSourceCodesFromBoss(bossInfo) {
  const bossCard =
    bossInfo?.template ||
    bossInfo?.card ||
    bossInfo?.bossCard ||
    bossInfo ||
    {};

  if (!isMergeCard(bossCard)) {
    const code = normalizeRaidCode(
      bossCard?.code ||
        bossInfo?.bossCode ||
        bossInfo?.code
    );

    return code ? [code] : [];
  }

  return getMergeSourceCodes(bossCard)
    .map((code) => normalizeRaidCode(code))
    .filter(Boolean);
}

function getRaidWeaponPoolForBoss(bossInfo) {
  const sourceCodes = getRaidRewardSourceCodesFromBoss(bossInfo);

  if (!sourceCodes.length) {
    return [];
  }

  const pool = weaponsDb.filter((weapon) => {
    if (!weapon) return false;
    if (weapon.raidOnly) return false;
    if (String(weapon.source || "").toLowerCase() === "empty_throne_raid_writ") return false;
    if (String(weapon.source || "").toLowerCase() === "gold_raid_ticket") return false;

    return sourceCodes.some((code) => weaponMatchesCardCode(weapon, code));
  });

  return pool;
}

function getRaidWeaponPoolLabel(bossInfo) {
  const sourceCodes = getRaidRewardSourceCodesFromBoss(bossInfo);

  if (!sourceCodes.length) return "Boss Card";

  if (!isMergeCard(bossInfo?.template || bossInfo || {})) {
    return getRaidCardDisplayNameByCode(sourceCodes[0]);
  }

  return sourceCodes
    .map(getRaidCardDisplayNameByCode)
    .filter(Boolean)
    .join(" / ");
}

function pickRaidWeaponRewardForBoss(bossInfo) {
  const pool = getRaidWeaponPoolForBoss(bossInfo);

  if (!pool.length) {
    return null;
  }

  return pool[Math.floor(Math.random() * pool.length)] || null;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function userMention(userId) {
  const id = String(userId || "").replace(/\D/g, "");
  return id ? `<@${id}>` : String(userId || "Unknown");
}

function getJoinedUserIds(room) {
  return new Set(
    ensureArray(room?.participants)
      .filter((participant) => ensureArray(participant.selectedCards).length > 0)
      .map((participant) => String(participant.userId))
  );
}

function getMissingNonHostRaidUsers(room) {
  const hostId = String(room?.hostId || "");
  const joined = getJoinedUserIds(room);

  return ensureArray(room?.whitelist)
    .map(String)
    .filter((id) => id && id !== hostId && !joined.has(id));
}

async function notifyHostIfRaidReady(message, room) {
  if (!message?.channel || !room?.roomId) return;

  const hostId = String(room.hostId || "");
  if (!hostId) return;

  const missingNonHost = getMissingNonHostRaidUsers(room);

  if (missingNonHost.length > 0) return;

  const joinedCount = getSelectedParticipantCount(room);
  if (joinedCount <= 0) return;

  const noticeKey = String(room.roomId);
  if (activeRaidReadyNotices.has(noticeKey)) return;

  activeRaidReadyNotices.add(noticeKey);

  await message.channel
    .send({
      content: `📣 ${userMention(
        hostId
      )} all raid members have joined. You can start the raid now.`,
      allowedMentions: {
        users: [hostId],
        repliedUser: false,
      },
    })
    .catch(() => null);
}

function randomInt(min, max) {
  const a = Math.floor(Number(min || 0));
  const b = Math.floor(Number(max || 0));

  if (b <= a) return a;

  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function makeHpBar(current, max, size = 16) {
  const safeMax = Math.max(1, Number(max || 1));
  const safeCur = Math.max(0, Math.min(safeMax, Number(current || 0)));
  const filled = Math.round((safeCur / safeMax) * size);
  const empty = Math.max(0, size - filled);

  return `${"█".repeat(filled)}${"░".repeat(empty)}`;
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);

  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function formatDisplayStat(value) {
  return Number(value || 0).toLocaleString("en-US");
}

const RAID_COUNT_MAX = 999;

const activeRaidCountByUser = new Map();

function getRaidCountUserKey(userId) {
  return String(userId || "");
}

function getRaidCountState(player) {
  const raw = player?.raidCountState;

  if (!raw || typeof raw !== "object") {
    return {
      enabled: false,
      total: 0,
      left: 0,
      used: 0,
      startedAt: 0,
      updatedAt: 0,
    };
  }

  const total = Math.max(0, Math.floor(Number(raw.total || 0)));
  const left = Math.max(0, Math.floor(Number(raw.left || 0)));
  const used = Math.max(0, Math.floor(Number(raw.used || 0)));

  return {
    enabled: Boolean(raw.enabled) && left > 0,
    total,
    left,
    used,
    startedAt: Number(raw.startedAt || 0),
    updatedAt: Number(raw.updatedAt || 0),
  };
}

function formatRaidCountLine(state) {
  const count = getRaidCountState(state);

  if (!count.enabled) return "Raid Count: inactive";

  return `Raid Count: ${count.left}/${count.total} left`;
}

function setRaidCountForUser(userId, username, amount) {
  const safeAmount = Math.max(
    0,
    Math.min(RAID_COUNT_MAX, Math.floor(Number(amount || 0)))
  );

  const userKey = getRaidCountUserKey(userId);
  let nextState = null;

  if (safeAmount <= 0) {
    nextState = {
      enabled: false,
      total: 0,
      left: 0,
      used: 0,
      startedAt: 0,
      updatedAt: Date.now(),
    };

    activeRaidCountByUser.delete(userKey);
  } else {
    nextState = {
      enabled: true,
      total: safeAmount,
      left: safeAmount,
      used: 0,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };

    activeRaidCountByUser.set(userKey, nextState);
  }

  updatePlayerAtomic(
    String(userId),
    (fresh) => ({
      ...(fresh || {}),
      raidCountState: nextState,
    }),
    username || "Unknown"
  );

  return nextState;
}

function consumeRaidCountForUser(userId, username) {
  const userKey = getRaidCountUserKey(userId);

  let result = {
    activeBefore: false,
    consumed: false,
    total: 0,
    leftBefore: 0,
    leftAfter: 0,
    used: 0,
    completed: false,
  };

  let nextState = null;

  updatePlayerAtomic(
    String(userId),
    (fresh) => {
      const player = fresh || {};
      const runtimeState = activeRaidCountByUser.get(userKey);
      const current = getRaidCountState(
        runtimeState?.enabled ? { raidCountState: runtimeState } : player
      );

      if (!current.enabled || current.left <= 0) {
        activeRaidCountByUser.delete(userKey);

        result = {
          activeBefore: false,
          consumed: false,
          total: current.total,
          leftBefore: current.left,
          leftAfter: current.left,
          used: current.used,
          completed: false,
        };

        return player;
      }

      const leftAfter = Math.max(0, current.left - 1);
      const used = Math.max(0, current.used + 1);
      const completed = leftAfter <= 0;

      nextState = {
        enabled: !completed,
        total: current.total,
        left: leftAfter,
        used,
        startedAt: current.startedAt || Date.now(),
        updatedAt: Date.now(),
      };

      if (completed) {
        activeRaidCountByUser.delete(userKey);
      } else {
        activeRaidCountByUser.set(userKey, nextState);
      }

      result = {
        activeBefore: true,
        consumed: true,
        total: current.total,
        leftBefore: current.left,
        leftAfter,
        used,
        completed,
      };

      return {
        ...player,
        raidCountState: nextState,
      };
    },
    username || "Unknown"
  );

  return result;
}

function buildRaidCountEmbed(message, countState) {
  const state = getRaidCountState({ raidCountState: countState });

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("Raid Count")
    .setDescription(
      [
        `User: <@${message.author.id}>`,
        state.enabled
          ? `Counter started: **${state.left}/${state.total} left**`
          : "Counter disabled.",
        "",
        "Every time this user creates a raid room, the counter will decrease by 1.",
        "",
        "Tracked commands:",
        "`op raid`, `op craid`, `op graid`, `op throne`, `op mraid`",
      ].join("\n")
    );
}

function firstPositiveRaidNumber(...values) {
  for (const value of values) {
    const n = Number(value || 0);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }

  return 0;
}

function getRaidCardAtk(card) {
  return Math.max(
    1,
    firstPositiveRaidNumber(
      card?.atk,
      card?.displayAtk,
      card?.combatAtk,
      card?.finalAtk,
      card?.battleAtk,
      card?.teamAtk,
      card?.totalAtk,
      card?.baseAtk
    )
  );
}

function getRaidCardHp(card) {
  return Math.max(
    1,
    firstPositiveRaidNumber(
      card?.hp,
      card?.maxHp,
      card?.displayHp,
      card?.combatHp,
      card?.finalHp,
      card?.battleHp,
      card?.teamHp,
      card?.totalHp,
      card?.baseHp
    )
  );
}

function getRaidCardSpeed(card) {
  return Math.max(
    1,
    firstPositiveRaidNumber(
      card?.speed,
      card?.spd,
      card?.displaySpeed,
      card?.combatSpeed,
      card?.finalSpeed,
      card?.battleSpeed,
      card?.teamSpeed,
      card?.totalSpeed,
      card?.baseSpeed
    )
  );
}

function getRaidDisplayPower(card) {
  if (isMergeCard(card)) return 100000;

  return Math.max(
    0,
    firstPositiveRaidNumber(
      card?.battlePower,
      card?.combatPower,
      card?.teamPower,
      card?.currentPower,
      card?.finalPower,
      card?.displayPower,
      card?.power,
      card?.basePower,
      Math.floor(
        getRaidCardAtk(card) * 1.4 +
          getRaidCardHp(card) * 0.22 +
          getRaidCardSpeed(card) * 9
      )
    )
  );
}

function applyBoostedRaidDisplayStats(card, boosts = {}) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") return card;

  const baseAtk = getRaidCardAtk(card);
  const baseHp = getRaidCardHp(card);
  const baseSpeed = getRaidCardSpeed(card);
  const basePower = getRaidDisplayPower(card);

  const boosted = {
    ...card,
    atk: Math.floor(baseAtk * (1 + Number(boosts.atk || 0) / 100)),
    hp: Math.floor(baseHp * (1 + Number(boosts.hp || 0) / 100)),
    maxHp: Math.floor(baseHp * (1 + Number(boosts.hp || 0) / 100)),
    speed: Math.floor(baseSpeed * (1 + Number(boosts.spd || 0) / 100)),
  };

  boosted.currentPower = basePower;
  boosted.power = basePower;
  boosted.battlePower = basePower;
  boosted.combatPower = basePower;
  boosted.teamPower = basePower;

  return boosted;
}

function getRaidModeConfig(commandName) {
  const cmd = String(commandName || "").toLowerCase();

  if (cmd === "mraid") {
  return {
    allowed: new Set(["M"]),
    ticketCode: "mythic_raid_ticket",
    ticketName: "Mythic Raid Ticket",
    label: "Mythic Raid Ticket",
    modeName: "Mythic Merge Raid",
  };
  }

  if (cmd === "throne") {
    return {
      allowed: new Set(["S"]),
      ticketCode: "empty_throne_raid_writ",
      ticketName: "Empty Throne Raid Writ",
      label: "Empty Throne Raid Writ",
      modeName: "Empty Throne Raid",
      fixedBossCode: "imu",
    };
  }

  if (cmd === "craid") {
    return {
      allowed: new Set(["C", "B"]),
      ticketCode: "common_raid_ticket",
      ticketName: "Common Raid Ticket",
      label: "Common Raid Ticket",
      modeName: "Common Raid",
    };
  }

  if (cmd === "graid") {
    return {
      allowed: new Set(["S"]),
      ticketCode: "gold_raid_ticket",
      ticketName: "Gold Raid Ticket",
      label: "Gold Raid Ticket",
      modeName: "Gold Raid",
    };
  }

  return {
    allowed: new Set(["A"]),
    ticketCode: "raid_ticket",
    ticketName: "Raid Ticket",
    label: "Raid Ticket",
    modeName: "Raid",
  };
}

function isLuffyRaidBoss(bossInfo) {
  const code = String(
    bossInfo?.bossCode ||
      bossInfo?.template?.code ||
      bossInfo?.template?.id ||
      ""
  ).toLowerCase();

  const name = String(
    bossInfo?.bossName ||
      bossInfo?.template?.displayName ||
      bossInfo?.template?.name ||
      ""
  ).toLowerCase();

  return (
    code === "luffy" ||
    code === "monkey_d_luffy" ||
    code.includes("luffy") ||
    name.includes("luffy")
  );
}

function getEffectiveRaidMode(usedCommand, bossInfo, raidMode) {
  const command = String(usedCommand || "").toLowerCase();

  if (command === "graid" && isLuffyRaidBoss(bossInfo)) {
    return {
      ...raidMode,
      allowed: new Set(["A"]),
      ticketCode: "gold_raid_ticket",
      ticketName: "Gold Raid Ticket",
      label: "Gold Raid Ticket",
      modeName: "Special Luffy Gold Raid",
      specialGoldRaidBoss: "luffy",
      rewardTier: "S",
    };
  }

  return raidMode;
}

const TRADE_LOCKED_RAID_TICKET_CODES = Object.freeze({
  common_raid_ticket: "tl_common_raid_ticket",
  raid_ticket: "tl_raid_ticket",
  gold_raid_ticket: "tl_gold_raid_ticket",
});

function getTradeLockedRaidTicketCode(raidMode) {
  const normalCode = String(
    raidMode?.ticketCode || ""
  ).toLowerCase();

  return TRADE_LOCKED_RAID_TICKET_CODES[normalCode] || "";
}

function getTradeLockedRaidTicketName(raidMode) {
  const names = {
    common_raid_ticket: "TL Common Raid Ticket",
    raid_ticket: "TL Raid Ticket",
    gold_raid_ticket: "TL Gold Raid Ticket",
  };

  return (
    names[String(raidMode?.ticketCode || "").toLowerCase()] ||
    `TL ${raidMode?.ticketName || "Raid Ticket"}`
  );
}

function findTicketEntry(tickets = [], raidMode) {
  const entries = ensureArray(tickets);

  const tradeLockedCode =
    getTradeLockedRaidTicketCode(raidMode);

  const tradeLockedName =
    getTradeLockedRaidTicketName(raidMode);

  const tradeLockedEntry =
    entries.find((entry) => {
      const code = normalize(entry?.code);
      const name = normalize(entry?.name);

      return (
        Number(entry?.amount || 0) > 0 &&
        (
          code === normalize(tradeLockedCode) ||
          name === normalize(tradeLockedName)
        )
      );
    }) || null;

  if (tradeLockedEntry) {
    return tradeLockedEntry;
  }

  return (
    entries.find((entry) => {
      const code = normalize(entry?.code);
      const name = normalize(entry?.name);

      return (
        Number(entry?.amount || 0) > 0 &&
        (
          code === normalize(raidMode.ticketCode) ||
          name === normalize(raidMode.ticketName)
        )
      );
    }) || null
  );
}

function consumeOneTicket(player, raidMode) {
  const tickets = ensureArray(player?.tickets).map(
    (ticket) => ({ ...ticket })
  );

  const selectedTicket =
    findTicketEntry(tickets, raidMode);

  if (!selectedTicket) {
    return {
      ok: false,
      tickets: ensureArray(player?.tickets),
      consumedTicket: null,
    };
  }

  const selectedCode = String(
    selectedTicket.code || ""
  ).toLowerCase();

  const selectedName = String(
    selectedTicket.name || raidMode.ticketName || "Raid Ticket"
  );

  const index = tickets.findIndex((entry) => {
    const code = String(entry?.code || "").toLowerCase();
    const name = normalize(entry?.name);

    return (
      code === selectedCode ||
      (
        !selectedCode &&
        name === normalize(selectedName)
      )
    );
  });

  if (index === -1) {
    return {
      ok: false,
      tickets: ensureArray(player?.tickets),
      consumedTicket: null,
    };
  }

  const current = Number(tickets[index].amount || 0);

  if (current <= 0) {
    return {
      ok: false,
      tickets: ensureArray(player?.tickets),
      consumedTicket: null,
    };
  }

  const consumedTicket = {
    code:
      tickets[index].code ||
      selectedCode ||
      raidMode.ticketCode,

    name:
      tickets[index].name ||
      selectedName ||
      raidMode.ticketName,

    type: tickets[index].type || "Ticket",

    rarity: tickets[index].rarity || null,

    tradeable:
      tickets[index].tradeable !== undefined
        ? tickets[index].tradeable
        : !selectedCode.startsWith("tl_"),

    untradeable:
      tickets[index].untradeable === true ||
      selectedCode.startsWith("tl_"),

    tradeLocked:
      tickets[index].tradeLocked === true ||
      selectedCode.startsWith("tl_"),

    amount: 1,
  };

  if (current === 1) {
    tickets.splice(index, 1);
  } else {
    tickets[index].amount = current - 1;
  }

  return {
    ok: true,
    tickets,
    consumedTicket,
  };
}

function refundOneTicket(
  player,
  raidMode,
  consumedTicket = null
) {
  const tickets = ensureArray(player?.tickets).map(
    (ticket) => ({ ...ticket })
  );

  const refundTicket = consumedTicket
    ? {
        ...consumedTicket,
        amount: 1,
      }
    : {
        code: raidMode.ticketCode,
        name: raidMode.ticketName,
        type: "Ticket",
        amount: 1,
      };

  const refundCode = String(
    refundTicket.code || raidMode.ticketCode || ""
  ).toLowerCase();

  const refundName = String(
    refundTicket.name || raidMode.ticketName || "Raid Ticket"
  );

  const index = tickets.findIndex((entry) => {
    const code = String(entry?.code || "").toLowerCase();
    const name = normalize(entry?.name);

    return (
      code === refundCode ||
      (
        !refundCode &&
        name === normalize(refundName)
      )
    );
  });

  if (index === -1) {
    tickets.push({
      ...refundTicket,
      code: refundCode || raidMode.ticketCode,
      name: refundName,
      type: refundTicket.type || "Ticket",
      amount: 1,
    });

    return tickets;
  }

  tickets[index] = {
    ...tickets[index],
    ...refundTicket,
    amount: Number(tickets[index].amount || 0) + 1,
  };

  return tickets;
}

function refundRaidTicketIfUnused(userId, username, raidMode, room) {
  if (!room?.ticketConsumed) return false;
  if (String(room?.status || "") === "active") return false;

  let refunded = false;

  updatePlayerAtomic(
    userId,
    (fresh) => {
      refunded = true;

      return {
        ...fresh,
        tickets: refundOneTicket(
          fresh,
          raidMode,
          room?.consumedTicket || null
        ),
      };
    },
    username || "Unknown"
  );

  return refunded;
}

function getSavedRaidTeam(player) {
  return ensureArray(player?.raidTeam?.members)
    .map((id) => String(id))
    .filter(Boolean);
}

function getRaidCardIdentity(card) {
  const instanceId = String(card?.instanceId || "").trim();

  if (instanceId) {
    return `instance:${instanceId}`;
  }

  const code = String(card?.code || card?.characterCode || "").toLowerCase().trim();
  const name = String(card?.displayName || card?.name || "").toLowerCase().trim();

  if (code) {
    return `code:${code}`;
  }

  return `name:${name}`;
}

function dedupeRaidCards(cards) {
  const seen = new Set();
  const result = [];

  for (const card of ensureArray(cards)) {
    const key = getRaidCardIdentity(card);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(card);
  }

  return result;
}

function isSameRaidCard(a, b) {
  if (!a || !b) return false;

  const aInstance = String(a.instanceId || "").trim();
  const bInstance = String(b.instanceId || "").trim();

  if (aInstance && bInstance && aInstance === bInstance) {
    return true;
  }

  const aKey = getRoomCardConflictKey(a);
  const bKey = getRoomCardConflictKey(b);

  return Boolean(aKey && bKey && aKey === bKey);
}

function getRaidBaseBattleCards(player) {
  const safePlayer = player || { cards: [] };
  const combatBoosts = getPlayerCombatBoosts(safePlayer);

  const cards = (Array.isArray(safePlayer?.cards) ? safePlayer.cards : [])
    .map((rawCard) => {
      const card = hydrateCard(rawCard);
      if (!card) return null;

      const syncedCard = isMergeCard(card)
        ? buildMergedCard(safePlayer, card)
        : card;

      const boostedCard = applyBoostedRaidDisplayStats(syncedCard, combatBoosts);

      // Skin only changes display. Stats must stay from the boosted owned card.
      const displayCard = applyCustomSkinToCard(safePlayer, boostedCard);

      return {
        ...displayCard,

        atk: getRaidCardAtk(boostedCard),
        hp: getRaidCardHp(boostedCard),
        maxHp: getRaidCardHp(boostedCard),
        speed: getRaidCardSpeed(boostedCard),

        displayAtk: getRaidCardAtk(boostedCard),
        displayHp: getRaidCardHp(boostedCard),
        displaySpeed: getRaidCardSpeed(boostedCard),

        battleAtk: getRaidCardAtk(boostedCard),
        battleHp: getRaidCardHp(boostedCard),
        battleMaxHp: getRaidCardHp(boostedCard),
        battleSpeed: getRaidCardSpeed(boostedCard),

        currentPower: getRaidDisplayPower(boostedCard),
        power: getRaidDisplayPower(boostedCard),
        battlePower: getRaidDisplayPower(boostedCard),
        combatPower: getRaidDisplayPower(boostedCard),
        teamPower: getRaidDisplayPower(boostedCard),

        passiveBoostsApplied: {
          atk: Number(combatBoosts.atk || 0),
          hp: Number(combatBoosts.hp || 0),
          spd: Number(combatBoosts.spd || 0),
          dmg: Number(combatBoosts.dmg || 0),
          exp: Number(combatBoosts.exp || 0),
        },
      };
    })
    .filter(
      (card) =>
        card &&
        String(card.cardRole || "").toLowerCase() === "battle"
    );

  return dedupeRaidCards(cards);
}

function getBattleTeamCards(player) {
  const cards = getRaidBaseBattleCards(player);
  const slots = Array.isArray(player?.team?.slots)
    ? player.team.slots.slice(0, 3)
    : [];

  const selected = slots
    .map((instanceId) => {
      if (!instanceId) return null;

      return (
        cards.find(
          (card) =>
            String(card.instanceId) === String(instanceId) &&
            String(card.cardRole || "").toLowerCase() === "battle"
        ) || null
      );
    })
    .filter(Boolean);

  return dedupeRaidCards(selected);
}

function toRoomCard(card) {
  const synced = {
    ...(card || {}),
  };

  const hasCustomSkin = Boolean(synced.hasCustomSkin);
  const skinName = hasCustomSkin
    ? String(synced.skinName || synced.displayName || synced.name || "")
    : "";

  const skinImage = hasCustomSkin
    ? String(synced.skinImage || synced.image || "")
    : "";

  const originalDisplayName = String(
    synced.originalDisplayName ||
      synced.skinnedCharacter ||
      synced.displayName ||
      synced.name ||
      ""
  );

  const atk = getRaidCardAtk(synced);
  const hp = getRaidCardHp(synced);
  const speed = getRaidCardSpeed(synced);
  const power = getRaidDisplayPower(synced);

  return {
    instanceId: String(synced.instanceId || ""),
    code: String(synced.code || ""),
    name: String(
      hasCustomSkin
        ? skinName || synced.displayName || synced.name || "Unknown"
        : synced.displayName || synced.name || "Unknown"
    ),
    displayName: String(synced.displayName || synced.name || "Unknown"),
    evolutionStage: Number(synced.evolutionStage || 1),
    evolutionKey: String(synced.evolutionKey || `M${Number(synced.evolutionStage || 1)}`),
    currentTier: String(synced.currentTier || synced.rarity || ""),
    rarity: String(synced.currentTier || synced.rarity || ""),
    image: String(hasCustomSkin ? skinImage || synced.image || "" : synced.image || ""),
    cardRole: String(synced.cardRole || "battle"),

    atk,
    hp,
    maxHp: hp,
    speed,
    displayAtk: atk,
    displayHp: hp,
    displaySpeed: speed,
    battleAtk: atk,
    battleHp: hp,
    battleMaxHp: hp,
    battleSpeed: speed,

    currentPower: power,
    power,
    battlePower: power,
    combatPower: power,
    teamPower: power,

    passiveBoostsApplied: {
      atk: Number(synced.passiveBoostsApplied?.atk || 0),
      hp: Number(synced.passiveBoostsApplied?.hp || 0),
      spd: Number(synced.passiveBoostsApplied?.spd || 0),
      dmg: Number(synced.passiveBoostsApplied?.dmg || 0),
      exp: Number(synced.passiveBoostsApplied?.exp || 0),
    },

    hasCustomSkin,
    skinName,
    skinTitle: String(synced.skinTitle || ""),
    skinImage,
    originalDisplayName,
    skinnedCharacter: String(synced.skinnedCharacter || originalDisplayName || ""),
    cardConflictKey: getRoomCardConflictKey({
      ...synced,
      hasCustomSkin,
      skinName,
      skinImage,
    }),
  };
}

function getFreshOwnedBattleCard(userId, username, picked) {
  const player = getPlayer(userId, username);
  const cards = getRaidBaseBattleCards(player);

  const byInstance = cards.find(
    (card) =>
      String(card.instanceId || "") === String(picked?.instanceId || "") &&
      String(card.cardRole || "").toLowerCase() === "battle"
  );

  if (byInstance) {
    return byInstance;
  }

  const pickedCode = String(picked?.code || "").toLowerCase().trim();

  if (!pickedCode) {
    return null;
  }

  const byCodeMatches = cards.filter(
    (card) =>
      String(card.code || "").toLowerCase().trim() === pickedCode &&
      String(card.cardRole || "").toLowerCase() === "battle"
  );

  if (byCodeMatches.length === 1) {
    return byCodeMatches[0];
  }

  return null;
}

function buildBattleRoster(room) {
  const participants = ensureArray(room?.participants).filter(
    (participant) => ensureArray(participant.selectedCards).length > 0
  );

  const roster = [];

  for (const participant of participants) {
    const pickedCards = dedupeRaidCards(ensureArray(participant.selectedCards));

    for (const picked of pickedCards) {
      const displayed = {
        ...(picked || {}),
      };

      if (!displayed.instanceId || !displayed.code) continue;

      const alreadyAdded = roster.some(
        (member) =>
          String(member.userId || "") === String(participant.userId || "") &&
          isSameRaidCard(member, displayed)
      );

      if (alreadyAdded) continue;

      const hasCustomSkin = Boolean(displayed.hasCustomSkin || picked?.hasCustomSkin);

      roster.push({
        userId: String(participant.userId),
        username: String(participant.username || "Unknown"),
        instanceId: String(displayed.instanceId || ""),
        code: String(displayed.code || ""),
        name: String(
          hasCustomSkin
            ? displayed.skinName ||
                picked?.skinName ||
                displayed.displayName ||
                picked?.name ||
                displayed.name ||
                "Unknown"
            : displayed.displayName || displayed.name || picked?.name || "Unknown"
        ),
        atk: Number(displayed.battleAtk || displayed.atk || getRaidCardAtk(displayed)),
        maxHp: Number(displayed.battleMaxHp || displayed.maxHp || displayed.hp || getRaidCardHp(displayed)),
        hp: Number(displayed.battleHp || displayed.hp || displayed.maxHp || getRaidCardHp(displayed)),
        speed: Number(displayed.battleSpeed || displayed.speed || getRaidCardSpeed(displayed)),
        currentPower: Number(displayed.battlePower || displayed.currentPower || getRaidDisplayPower(displayed)),
        battleAtk: Number(displayed.battleAtk || displayed.atk || getRaidCardAtk(displayed)),
        battleHp: Number(displayed.battleHp || displayed.hp || displayed.maxHp || getRaidCardHp(displayed)),
        battleMaxHp: Number(displayed.battleMaxHp || displayed.maxHp || displayed.hp || getRaidCardHp(displayed)),
        battleSpeed: Number(displayed.battleSpeed || displayed.speed || getRaidCardSpeed(displayed)),
        battlePower: Number(displayed.battlePower || displayed.currentPower || getRaidDisplayPower(displayed)),
        currentTier: String(displayed.currentTier || displayed.rarity || ""),
        evolutionStage: Number(displayed.evolutionStage || 1),
        image: String(
          hasCustomSkin
            ? displayed.skinImage || picked?.skinImage || displayed.image || ""
            : displayed.image || ""
        ),

        hasCustomSkin,
        skinName: String(displayed.skinName || picked?.skinName || ""),
        skinTitle: String(displayed.skinTitle || picked?.skinTitle || ""),
        skinImage: String(displayed.skinImage || picked?.skinImage || ""),
        originalDisplayName: String(
          displayed.originalDisplayName || picked?.originalDisplayName || ""
        ),
        skinnedCharacter: String(
          displayed.skinnedCharacter || picked?.skinnedCharacter || ""
        ),
        cardConflictKey: getRoomCardConflictKey(displayed.hasCustomSkin ? displayed : picked),
        passiveBoostsApplied: {
          atk: Number(displayed.passiveBoostsApplied?.atk || 0),
          hp: Number(displayed.passiveBoostsApplied?.hp || 0),
          spd: Number(displayed.passiveBoostsApplied?.spd || 0),
          dmg: Number(displayed.passiveBoostsApplied?.dmg || 0),
          exp: Number(displayed.passiveBoostsApplied?.exp || 0),
        },
        alive: true,
      });
    }
  }

  return roster.sort(
    (a, b) => Number(b.currentPower || 0) - Number(a.currentPower || 0)
  );
}

function getRaidBossImage(code) {
  return raidBossImages[String(code || "").toLowerCase()] || "";
}

function resolveRaidBoss(query) {
  const template = findCardTemplate(query);

  if (!template || String(template.cardRole || "").toLowerCase() !== "battle") {
    return null;
  }

  return {
    bossCode: template.code,
    bossName: template.displayName || template.name,
    bossImage: getRaidBossImage(template.code),
    template,
  };
}

function getRaidBossModeMultiplier(raidMode = {}) {
  const ticketCode = String(raidMode?.ticketCode || "").toLowerCase();
  const fixedBossCode = String(raidMode?.fixedBossCode || "").toLowerCase();
  const modeName = String(raidMode?.modeName || "").toLowerCase();

  if (
    ticketCode === "empty_throne_raid_writ" ||
    fixedBossCode === "imu" ||
    modeName.includes("throne")
  ) {
    return {
      hp: 3,
      speed: 2,
      atk: 3,
    };
  }

  if (ticketCode === "gold_raid_ticket" || modeName.includes("gold")) {
    return {
      hp: 1.5,
      speed: 1.5,
      atk: 2,
    };
  }

  if (ticketCode === "mythic_raid_ticket" || modeName.includes("mythic")) {
    return {
      hp: 4.5,
      speed: 2,
      atk: 4.5,
    };
  }

  return {
    hp: 1.5,
    speed: 1.5,
    atk: 1.5,
  };
}

function deriveRaidBossStats(template, raidMode = {}) {
  const hydrated = hydrateCard(template);
  const tier = String(hydrated.rarity || hydrated.currentTier || "B").toUpperCase();
  const modeMultiplier = getRaidBossModeMultiplier(raidMode);

  const profile =
    {
      C: {
        hp: 11000,
        speed: 380,
        atkMin: 380,
        atkMax: 560,
      },
      B: {
        hp: 15000,
        speed: 240,
        atkMin: 400,
        atkMax: 700,
      },
      A: {
        hp: 21000,
        speed: 400,
        atkMin: 500,
        atkMax: 1000,
      },
      S: {
        hp: 26000,
        speed: 660,
        atkMin: 700,
        atkMax: 1200,
      },
      M: {
        hp: 36000,
        speed: 760,
        atkMin: 950,
        atkMax: 1600,
      },
    }[tier] || {
      hp: 12500,
      speed: 240,
      atkMin: 260,
      atkMax: 520,
    };

  const baseAtk = Number(hydrated.atk || 120);
  const baseHp = Number(hydrated.hp || 900);
  const baseSpeed = Number(hydrated.speed || 60);
  const basePower = Number(
    hydrated.powerCaps?.M3 || hydrated.currentPower || hydrated.basePower || 0
  );

  const rawMaxHp = Math.floor(profile.hp + baseHp * 2.8 + basePower * 1.2);
  const rawSpeed = Math.floor(profile.speed + baseSpeed * 0.9);
  const rawAtkMin = Math.floor(profile.atkMin + baseAtk * 0.8 + basePower * 0.025);
  const rawAtkMax = Math.floor(profile.atkMax + baseAtk * 1.2 + basePower * 0.05);

  const maxHp = Math.floor(rawMaxHp * modeMultiplier.hp);
  const speed = Math.floor(rawSpeed * modeMultiplier.speed);
  const atkMin = Math.floor(rawAtkMin * modeMultiplier.atk);
  const atkMax = Math.floor(rawAtkMax * modeMultiplier.atk);

  return {
    code: hydrated.code,
    name: hydrated.displayName || hydrated.name || "Unknown Boss",
    tier,
    hp: maxHp,
    maxHp,
    speed,
    atkMin,
    atkMax,
    image: getRaidBossImage(hydrated.code),
  };
}

function buildLobbyEmbed(hostName, room, ended = false, bossStats = null) {
  const participants = ensureArray(room?.participants);

  const joinedLines = participants.length
    ? participants.map((participant, index) => {
        const picked = ensureArray(participant.selectedCards)
          .map((card) => card.skinName || card.name || card.code)
          .join(", ");

        return `${index + 1}. ${participant.username} • ${
          picked || "No card selected"
        }`;
      })
    : ["None"];

  const bossStatLine = bossStats
    ? `❤️ ${Number(bossStats.maxHp || bossStats.hp || 0)}/${Number(
        bossStats.maxHp || bossStats.hp || 0
      )} | SPD ${Number(bossStats.speed || 0)} | ATK ${Number(
        bossStats.atkMin || 0
      )}-${Number(bossStats.atkMax || 0)}`
    : "Not loaded";

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("Raid Room")
    .setDescription(
      [
        `**Host:** ${hostName}`,
        `**Boss:** ${room.bossName}`,
        `**Status:** ${room.status || "waiting"}`,
        `**Ticket Used:** ${room.ticketConsumed ? "Yes" : "No"}`,
        "",
        "**Boss Stats**",
        bossStatLine,
        "",
        "**Joined Participants**",
        ...joinedLines,
        "",
        "**Rules**",
        isThroneRoom(room)
          ? "• Throne Raid max 4 users total: 1 host + 3 crew"
          : "• Max 10 users total including host",
        isThroneRoom(room)
          ? "• Each user joins directly with 3 battle cards from team slots"
          : "• Each user joins with 1 battle card",
        isThroneRoom(room)
          ? "• Total max 12 cards in Throne Raid"
          : "• The same character code cannot be used twice in the same raid",
      ].join("\n")
    )
    .setImage(room.bossImage || null)
    .setFooter({
      text: ended
        ? "Raid room closed"
        : "Join Battle to enter • Host only can Start Raid",
    });
}

function buildLobbyRows(room, ended = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`raid_join_${room.roomId}`)
        .setLabel("Join Battle")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(ended),
      new ButtonBuilder()
        .setCustomId(`raid_start_${room.roomId}`)
        .setLabel("Start Raid")
        .setStyle(ButtonStyle.Success)
        .setDisabled(ended)
    ),
  ];
}

function buildPickRows(roomId, cards) {
  const row = new ActionRowBuilder();

  for (let index = 0; index < 3; index++) {
    const card = cards[index];

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          card
            ? `raid_pick_${roomId}_${card.instanceId}`
            : `raid_pick_${roomId}_empty_${index}`
        )
        .setLabel(
          card
            ? `${index + 1} ${card.skinName || card.displayName || card.name}`.slice(0, 80)
            : `Empty Slot ${index + 1}`
        )
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!card)
    );
  }

  return [row];
}

function buildThroneConfirmRows(roomId, userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`raid_throne_confirm_${roomId}_${userId}`)
        .setLabel("Join with team")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`raid_throne_cancel_${roomId}_${userId}`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

function getThroneCardDisplayName(card) {
  return String(card?.displayName || card?.name || "Unknown").trim();
}

function formatThroneTeamPreview(cards) {
  return cards
    .map((card) => `🖼️ ${getThroneCardDisplayName(card)}`)
    .join("\n");
}

function isThroneRoom(room) {
  return String(room?.bossCode || "").toLowerCase() === "imu";
}

function getMaxRaidUsers(room) {
  return isThroneRoom(room) ? 4 : 10;
}

function getThroneNonHostJoinedCount(room) {
  const hostId = String(room?.hostId || "");

  return ensureArray(room?.participants).filter(
    (participant) =>
      String(participant.userId || "") !== hostId &&
      ensureArray(participant.selectedCards).length > 0
  ).length;
}

function hasReservedHostSlotAvailable(room, userId) {
  if (!isThroneRoom(room)) return true;

  const hostId = String(room?.hostId || "");
  const isHost = String(userId || "") === hostId;

  if (isHost) return true;

  const maxUsers = getMaxRaidUsers(room);
  const nonHostLimit = Math.max(0, maxUsers - 1);

  return getThroneNonHostJoinedCount(room) < nonHostLimit;
}

function getSelectedParticipantCount(room) {
  return ensureArray(room?.participants).filter(
    (participant) => ensureArray(participant.selectedCards).length > 0
  ).length;
}

function hasParticipantJoined(room, userId) {
  return ensureArray(room?.participants).some(
    (participant) =>
      String(participant.userId || "") === String(userId || "") &&
      ensureArray(participant.selectedCards).length > 0
  );
}

function getThroneTeamCards(player) {
  return getBattleTeamCards(player).slice(0, 3);
}

function getRoomCardConflictKey(card) {
  const explicitKey = String(card?.cardConflictKey || "").trim();
  if (explicitKey) return explicitKey;

  const originalCode = String(card?.code || card?.characterCode || card?.cardCode || "")
    .toLowerCase()
    .trim();

  const skinName = String(card?.skinName || card?.customSkinName || "")
    .toLowerCase()
    .trim();

  const skinImage = String(card?.skinImage || "")
    .toLowerCase()
    .trim();

  const name = String(card?.name || card?.displayName || "")
    .toLowerCase()
    .trim();

  const instanceId = String(card?.instanceId || "").trim();

  // Custom skin aktif:
  // same card code + beda skin = boleh join bareng.
  // same card code + same skin = duplicate.
  if (card?.hasCustomSkin && originalCode && (skinName || skinImage)) {
    return ["skin", originalCode, skinName, skinImage]
      .filter(Boolean)
      .join(":");
  }

  if (originalCode) return `code:${originalCode}`;
  if (name) return `name:${name}`;
  if (instanceId) return `instance:${instanceId}`;

  return "";
}

function findRaidRoomCardConflict(room, cards, userId = null) {
  const incomingCards = ensureArray(cards);
  const incomingKeys = new Map();

  for (const card of incomingCards) {
    const key = getRoomCardConflictKey(card);
    if (!key) continue;

    incomingKeys.set(key, card);
  }

  if (!incomingKeys.size) return null;

  for (const participant of ensureArray(room?.participants)) {
    if (userId && String(participant.userId || "") === String(userId || "")) {
      continue;
    }

    for (const existingCard of ensureArray(participant.selectedCards)) {
      const key = getRoomCardConflictKey(existingCard);

      if (key && incomingKeys.has(key)) {
        return {
          existingCard,
          incomingCard: incomingKeys.get(key),
          participant,
        };
      }
    }
  }

  return null;
}

function buildBattleState(
  room,
  bossTemplate,
  raidMode = {},
  client = null
) {
  const members = buildBattleRoster(room).map((member) => ({
    ...member,
    actionCooldown: 0,
  }));

  return {
    roomId: room.roomId,
    client,
    hostId: room.hostId,
    hostName: room.hostName,
    raidMode: {
      ticketCode: raidMode.ticketCode,
      ticketName: raidMode.ticketName,
      label: raidMode.label,
      modeName: raidMode.modeName,
      rewardTier: raidMode.rewardTier || null,
      specialGoldRaidBoss: raidMode.specialGoldRaidBoss || null,
    },
    members,
    boss: {
      ...deriveRaidBossStats(bossTemplate, raidMode),
      bossCode: bossTemplate.code,
      bossName: bossTemplate.displayName || bossTemplate.name,
      rarity: bossTemplate.rarity || bossTemplate.currentTier || bossTemplate.baseTier || "C",
      currentTier: bossTemplate.currentTier || bossTemplate.rarity || bossTemplate.baseTier || "C",
      mergeSourceCodes: getMergeSourceCodes(bossTemplate),
    },
    round: 1,
    turnCount: 0,
    log: ["Raid battle started."],
    finished: false,
    winner: null,
  };
}

function pushBattleLog(state, line) {
  state.log.push(line);

  if (state.log.length > MAX_BATTLE_LOG_LINES) {
    state.log = state.log.slice(-MAX_BATTLE_LOG_LINES);
  }
}

function getAliveMembers(state) {
  return ensureArray(state.members).filter((member) => Number(member.hp || 0) > 0);
}

function getMemberActionCooldown(member) {
  return Math.max(0, Number(member?.actionCooldown || 0));
}

function isMemberOnActionCooldown(member) {
  return getMemberActionCooldown(member) > 0;
}

function tickActionCooldownsAfterAttack(state, actor) {
  const aliveMembers = getAliveMembers(state);

  if (aliveMembers.length <= 1) {
    for (const member of aliveMembers) {
      member.actionCooldown = 0;
    }

    state.turnCount = Number(state.turnCount || 0) + 1;
    return;
  }

  for (const member of ensureArray(state.members)) {
    if (Number(member.hp || 0) <= 0) {
      member.actionCooldown = 0;
      continue;
    }

    if (member === actor) continue;

    member.actionCooldown = Math.max(0, Number(member.actionCooldown || 0) - 1);
  }

  if (actor && Number(actor.hp || 0) > 0) {
    actor.actionCooldown = 1;
  }

  state.turnCount = Number(state.turnCount || 0) + 1;
}

function canAdvanceRaidTurn(state) {
  const alive = getAliveMembers(state);

  if (alive.length <= 1) return false;

  return alive.every((member) => isMemberOnActionCooldown(member));
}

function advanceRaidTurn(state) {
  for (const member of getAliveMembers(state)) {
    member.actionCooldown = 0;
  }

  state.round = Number(state.round || 1) + 1;
  pushBattleLog(state, "New raid turn started.");
}

function buildBattleEmbed(state) {
  const boss = state.boss;
  const alive = getAliveMembers(state);

  const raidLines = ensureArray(state.members).length
    ? state.members.map((member, index) => {
        const isDead = Number(member.hp || 0) <= 0;
        const hpIcon = isDead ? "☠️" : "❤️";
        const cooldown = getMemberActionCooldown(member);
        const status = isDead ? "DEFEATED" : cooldown > 0 ? `⏳ CD ${cooldown}` : "READY";

        return [
          `**${index + 1}. ${member.name}** • ${member.username}`,
          `${hpIcon} ${Math.max(0, Number(member.hp || 0))}/${Number(
            member.maxHp || 0
          )} | SPD ${formatDisplayStat(member.speed)} | ATK ${formatAtkRange(
            member.atk
          )} | ${status}`,
        ].join("\n");
      })
    : ["None"];

  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle(`${boss.name}'s Raid Battle`)
    .setDescription("Selection Phase\nSelect a character to attack!")
    .addFields(
      {
        name: "Boss",
        value: [
          `${makeHpBar(boss.hp, boss.maxHp)}`,
          `❤️ ${Math.max(0, boss.hp)}/${boss.maxHp} | SPD ${boss.speed} | ATK ${
            boss.atkMin
          }-${boss.atkMax}`,
        ].join("\n"),
      },
      {
        name: `Raid Team (${alive.length}/${state.members.length} alive)`,
        value: raidLines.join("\n\n").slice(0, 1024),
      },
      {
        name: "Battle Log",
        value: state.log.length
          ? state.log
              .slice(-MAX_BATTLE_LOG_LINES)
              .map((line) => `• ${line}`)
              .join("\n")
              .slice(0, 1024)
          : "No actions yet.",
      }
    )
    .setImage(boss.image || null)
    .setFooter({
      text: `Round ${state.round} • Each card has 1-turn cooldown after attacking`,
    });
}

function buildResultEmbed(state) {
  const boss = state.boss;
  const playersWon = state.winner === "players";
  const alive = getAliveMembers(state);

  const raidLines = ensureArray(state.members).length
    ? state.members.map((member, index) => {
        const isDead = Number(member.hp || 0) <= 0;
        const hpIcon = isDead ? "☠️" : "❤️";
        const status = isDead ? "DEFEATED" : "SURVIVED";

        return [
          `**${index + 1}. ${member.name}** • ${member.username}`,
          `${hpIcon} ${Math.max(0, Number(member.hp || 0))}/${Number(
            member.maxHp || 0
          )} | SPD ${formatDisplayStat(member.speed)} | ATK ${formatAtkRange(
            member.atk
          )} | ${status}`,
        ].join("\n");
      })
    : ["None"];

  return new EmbedBuilder()
    .setColor(playersWon ? 0x2ecc71 : 0xe74c3c)
    .setTitle(playersWon ? "Raid Victory" : "Raid Defeat")
    .setDescription(
      clampEmbedText(
        [
          `**Result:** ${playersWon ? "WIN" : "LOSE"}`,
          `**Boss:** ${boss.name}`,
          `**Final Boss HP:** ${Math.max(0, Number(boss.hp || 0))}/${Number(
            boss.maxHp || 0
          )}`,
          `**Survivors:** ${alive.length}/${state.members.length}`,
          "",
          "## Raid Team Result",
          ...raidLines,
          "",
          "## Raid Win Rewards",
          ...(playersWon
            ? formatRaidWinRewardLines(state)
            : ["• No reward because raid was lost."]),
          "",
          "## Raid Prestige Rewards",
          ...(playersWon
            ? ensureArray(state.prestigeRewards).length
              ? ensureArray(state.prestigeRewards).map((reward) =>
                  reward.missing
                    ? `• Host ${reward.username}: **${reward.cardName}** prestige not added${reward.reason ? ` (${reward.reason})` : "."}`
                    : `• Host ${reward.username}'s **${reward.cardName}**: ${reward.before}/200 → ${reward.after}/200`
                )
              : ["• Prestige reward data was not found."]
            : ["• No prestige reward because raid was lost."]),
          "",
          "## Final Log",
          ...(state.log.length
            ? state.log.slice(-MAX_BATTLE_LOG_LINES).map((line) => `• ${line}`)
            : ["No final log."]),
        ].join("\n")
      )
    )
    .setImage(boss.image || null)
    .setFooter({
      text: playersWon
        ? "One Piece Bot • Raid Complete"
        : "One Piece Bot • Raid Failed",
    });
}

function buildBattleRows(state) {
  if (state.finished) return [];

  const rows = [];
  let chunk = [];

  for (let index = 0; index < state.members.length; index++) {
    chunk.push({
      member: state.members[index],
      index,
    });

    if (chunk.length === 5 || index === state.members.length - 1) {
      const row = new ActionRowBuilder();

      for (const item of chunk) {
        const member = item.member;
        const memberIndex = item.index;
        const isDead = Number(member.hp || 0) <= 0;
        const isCooldown = isMemberOnActionCooldown(member);

        let buttonStyle = ButtonStyle.Success;
        let labelPrefix = `${memberIndex + 1}`;

        if (isDead) {
          buttonStyle = ButtonStyle.Danger;
          labelPrefix = `☠️ ${memberIndex + 1}`;
        } else if (isCooldown) {
          buttonStyle = ButtonStyle.Primary;
          labelPrefix = `⏳ ${memberIndex + 1}`;
        }

        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`raid_act_${state.roomId}_${memberIndex}`)
            .setLabel(`${labelPrefix} ${member.name}`.slice(0, 80))
            .setStyle(buttonStyle)
            .setDisabled(Boolean(isDead || isCooldown))
        );
      }

      rows.push(row);
      chunk = [];
    }
  }

  if (canAdvanceRaidTurn(state)) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`raid_next_${state.roomId}`)
          .setLabel("Next Turn")
          .setStyle(ButtonStyle.Secondary)
      )
    );
  }

  return rows;
}

function buildRaidProcessingEmbed(state) {
  const boss = state.boss || {};
  const alive = getAliveMembers(state);

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("⏳ Processing Raid Result...")
    .setDescription(
      clampEmbedText(
        [
          "Saving raid rewards, prestige, fragments, EXP, and room cleanup.",
          "Please wait a moment.",
          "",
          "Do not click the buttons again.",
          "",
          `**Boss:** ${boss.name || "Raid Boss"}`,
          `**Final Boss HP:** ${Math.max(0, Number(boss.hp || 0))}/${Number(
            boss.maxHp || 0
          )}`,
          `**Survivors:** ${alive.length}/${ensureArray(state.members).length}`,
          "",
          "## Final Action",
          ...(state.log.length
            ? state.log.slice(-MAX_BATTLE_LOG_LINES).map((line) => `• ${line}`)
            : ["• Final raid action is being processed."]),
        ].join("\n")
      )
    )
    .setImage(boss.image || null)
    .setFooter({
      text: "One Piece Bot • Saving Raid Result",
    });
}

function chooseBossTarget(state) {
  const alive = getAliveMembers(state);
  if (!alive.length) return null;

  return alive[randomInt(0, alive.length - 1)];
}

function checkEndState(state) {
  if (Number(state.boss.hp || 0) <= 0) {
    state.finished = true;
    state.winner = "players";
    return true;
  }

  if (!getAliveMembers(state).length) {
    state.finished = true;
    state.winner = "boss";
    return true;
  }

  return false;
}

function flattenDb(db) {
  if (Array.isArray(db)) return db;

  if (db && typeof db === "object") {
    return Object.values(db).flatMap((entry) => {
      if (Array.isArray(entry)) return entry;
      if (entry && typeof entry === "object") return [entry];
      return [];
    });
  }

  return [];
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function randomChance(percent) {
  return Math.random() * 100 < Number(percent || 0);
}

function getRaidRewardConfig(tier, boss = null, raidMode = null) {
  const bossCode = String(boss?.code || boss?.bossCode || "").toLowerCase();
  const bossName = String(boss?.name || boss?.bossName || "").toLowerCase();
  const rewardTier = String(raidMode?.rewardTier || tier || "C").toUpperCase();

  if (bossCode === "imu" || bossName.includes("imu")) {
    return {
      berries: 25000,
      gems: 40,
      fragments: 1,
      weaponChance: 35,
      fruitChance: 1,
    };
  }

  const configs = {
    C: {
      berries: 5000,
      gems: 10,
      fragments: 1,
      weaponChance: 50,
      fruitChance: 1,
    },
    B: {
      berries: 5000,
      gems: 10,
      fragments: 1,
      weaponChance: 50,
      fruitChance: 1,
    },
    A: {
      berries: 10000,
      gems: 15,
      fragments: 1,
      weaponChance: 45,
      fruitChance: 1,
    },
    S: {
      berries: 15000,
      gems: 25,
      fragments: 1,
      weaponChance: 35,
      fruitChance: 1,
    },
    M: {
      berries: 50000,
      gems: 50,
      fragments: 1,
      universalS: 2,
      weaponChance: 100,
      fruitChance: 1,
    },
  };

  return configs[rewardTier] || configs.C;
}

function findLinkedRaidItem(db, boss) {
  const list = flattenDb(db);

  const bossCode = normalizeText(
    boss?.code ||
      boss?.bossCode ||
      boss?.cardCode ||
      boss?.id ||
      ""
  );

  const bossName = normalizeText(
    boss?.name ||
      boss?.bossName ||
      boss?.displayName ||
      boss?.cardName ||
      ""
  );

  if (!bossCode && !bossName) return null;

  function getItemOwnerCodes(item) {
    return [
      item.ownerCode,
      item.cardCode,
      item.characterCode,
      item.knownUserCode,
      item.userCode,
      item.equippedByCode,
      ...(Array.isArray(item.owners) ? item.owners : []),
      ...(Array.isArray(item.ownerCodes) ? item.ownerCodes : []),
    ]
      .map(normalizeText)
      .filter(Boolean);
  }

  function getItemOwnerNames(item) {
    return [
      item.ownerName,
      item.cardName,
      item.characterName,
      item.knownUser,
      item.knownUserName,
      item.user,
      item.userName,
      item.owner,
      item.ownerDisplayName,
      item.equippedBy,
      ...(Array.isArray(item.ownerNames) ? item.ownerNames : []),
      ...(Array.isArray(item.knownUsers) ? item.knownUsers : []),
    ]
      .map(normalizeText)
      .filter(Boolean);
  }

  return (
    list.find((item) => bossCode && getItemOwnerCodes(item).includes(bossCode)) ||
    list.find((item) => bossName && getItemOwnerNames(item).includes(bossName)) ||
    list.find((item) => {
      const code = normalizeText(item.code || "");
      const name = normalizeText(item.name || "");

      return (
        (bossCode && code.includes(bossCode)) ||
        (bossName && name.includes(bossName))
      );
    }) ||
    null
  );
}

function findLinkedRaidItems(db, boss) {
  const list = flattenDb(db);
  const bossCode = normalizeText(
    boss?.code || boss?.bossCode || boss?.cardCode || boss?.id || ""
  );
  const bossName = normalizeText(
    boss?.name || boss?.bossName || boss?.displayName || boss?.cardName || ""
  );

  if (!bossCode && !bossName) return [];

  function getItemOwnerCodes(item) {
    return [
      item.ownerCode,
      item.cardCode,
      item.characterCode,
      item.knownUserCode,
      item.userCode,
      item.equippedByCode,
      ...(Array.isArray(item.owners) ? item.owners : []),
      ...(Array.isArray(item.ownerCodes) ? item.ownerCodes : []),
    ]
      .map(normalizeText)
      .filter(Boolean);
  }

  function getItemOwnerNames(item) {
    return [
      item.ownerName,
      item.cardName,
      item.characterName,
      item.knownUser,
      item.knownUserName,
      item.user,
      item.userName,
      item.owner,
      item.ownerDisplayName,
      item.equippedBy,
      ...(Array.isArray(item.ownerNames) ? item.ownerNames : []),
      ...(Array.isArray(item.knownUsers) ? item.knownUsers : []),
    ]
      .map(normalizeText)
      .filter(Boolean);
  }

  const matches = list.filter((item) => {
    const ownerCodes = getItemOwnerCodes(item);
    const ownerNames = getItemOwnerNames(item);
    const code = normalizeText(item.code || "");
    const name = normalizeText(item.name || "");

    return (
      (bossCode && ownerCodes.includes(bossCode)) ||
      (bossName && ownerNames.includes(bossName)) ||
      (bossCode && code.includes(bossCode)) ||
      (bossName && name.includes(bossName))
    );
  });

  const seen = new Set();

  return matches.filter((item) => {
    const key = String(item.code || item.name || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickRandomLinkedRaidItem(db, boss) {
  const items = findLinkedRaidItems(db, boss);
  if (!items.length) return null;

  return items[Math.floor(Math.random() * items.length)];
}

function isMythicMergeRaid(stateOrMode = {}) {
 const raidMode = stateOrMode?.raidMode || stateOrMode || {};
 const ticketCode = String(raidMode?.ticketCode || "").toLowerCase();
 const modeName = String(raidMode?.modeName || "").toLowerCase();

 return ticketCode === "mythic_raid_ticket" || modeName.includes("mythic");
}

function getMergeRaidComponentBosses(boss = {}) {
  const bossCode = String(boss.code || boss.bossCode || boss.cardCode || "").toLowerCase();
  const bossName = String(boss.name || boss.bossName || boss.displayName || "").toLowerCase();

  const template =
    findCardTemplate(bossCode) ||
    findCardTemplate(bossName) ||
    findCardTemplate(boss.code) ||
    findCardTemplate(boss.bossCode) ||
    null;

  const mergeSourceCodes = [
    ...getMergeSourceCodes(boss),
    ...getMergeSourceCodes(template),
    ...ensureArray(boss.mergeSourceCodes),
    ...ensureArray(template?.mergeSourceCodes),
  ]
    .map((code) => String(code || "").trim())
    .filter(Boolean);

  const uniqueSourceCodes = [...new Set(mergeSourceCodes.map((code) => code.toLowerCase()))];

  if (uniqueSourceCodes.length) {
    return uniqueSourceCodes.map((componentCode) => {
      const componentTemplate = findCardTemplate(componentCode);

      if (componentTemplate) {
        return {
          code: componentTemplate.code,
          bossCode: componentTemplate.code,
          cardCode: componentTemplate.code,
          name: componentTemplate.displayName || componentTemplate.name || componentTemplate.code,
          bossName: componentTemplate.displayName || componentTemplate.name || componentTemplate.code,
          displayName: componentTemplate.displayName || componentTemplate.name || componentTemplate.code,
          rarity: componentTemplate.rarity || componentTemplate.currentTier || componentTemplate.baseTier || "C",
          currentTier: componentTemplate.currentTier || componentTemplate.rarity || componentTemplate.baseTier || "C",
          image: componentTemplate.image || "",
        };
      }

      return {
        code: componentCode,
        bossCode: componentCode,
        cardCode: componentCode,
        name: componentCode,
        bossName: componentCode,
        displayName: componentCode,
      };
    });
  }

  const rawComponents = [
    ...ensureArray(boss.components),
    ...ensureArray(boss.mergeComponents),
    ...ensureArray(boss.requiredCards),
    ...ensureArray(boss.materialCards),
    ...ensureArray(template?.components),
    ...ensureArray(template?.mergeComponents),
    ...ensureArray(template?.requiredCards),
    ...ensureArray(template?.materialCards),
  ];

  return rawComponents
    .map((entry) => {
      if (typeof entry === "string") {
        const componentTemplate = findCardTemplate(entry);

        if (componentTemplate) {
          return {
            code: componentTemplate.code,
            bossCode: componentTemplate.code,
            cardCode: componentTemplate.code,
            name: componentTemplate.displayName || componentTemplate.name || componentTemplate.code,
            bossName: componentTemplate.displayName || componentTemplate.name || componentTemplate.code,
            displayName: componentTemplate.displayName || componentTemplate.name || componentTemplate.code,
            rarity: componentTemplate.rarity || componentTemplate.currentTier || componentTemplate.baseTier || "C",
            currentTier: componentTemplate.currentTier || componentTemplate.rarity || componentTemplate.baseTier || "C",
            image: componentTemplate.image || "",
          };
        }

        return {
          code: entry,
          bossCode: entry,
          cardCode: entry,
          name: entry,
          bossName: entry,
          displayName: entry,
        };
      }

      const rawCode =
        entry?.code ||
        entry?.cardCode ||
        entry?.bossCode ||
        entry?.id ||
        entry?.name ||
        "";

      const componentTemplate = findCardTemplate(rawCode);

      if (componentTemplate) {
        return {
          code: componentTemplate.code,
          bossCode: componentTemplate.code,
          cardCode: componentTemplate.code,
          name: componentTemplate.displayName || componentTemplate.name || componentTemplate.code,
          bossName: componentTemplate.displayName || componentTemplate.name || componentTemplate.code,
          displayName: componentTemplate.displayName || componentTemplate.name || componentTemplate.code,
          rarity: componentTemplate.rarity || componentTemplate.currentTier || componentTemplate.baseTier || "C",
          currentTier: componentTemplate.currentTier || componentTemplate.rarity || componentTemplate.baseTier || "C",
          image: componentTemplate.image || "",
        };
      }

      return {
        code: rawCode,
        bossCode: rawCode,
        cardCode: rawCode,
        name: entry?.displayName || entry?.name || rawCode,
        bossName: entry?.displayName || entry?.name || rawCode,
        displayName: entry?.displayName || entry?.name || rawCode,
        rarity: entry?.rarity || entry?.currentTier || "C",
        currentTier: entry?.currentTier || entry?.rarity || "C",
        image: entry?.image || "",
      };
    })
    .filter((entry) => entry.code || entry.name);
}

function getMergeRaidOriginalBossPool(boss = {}) {
  const components = getMergeRaidComponentBosses(boss);

  if (!components.length) {
    return [];
  }

  return components
    .map((component) => {
      const template = findCardTemplate(
        component.code ||
          component.bossCode ||
          component.cardCode ||
          component.name ||
          component.bossName ||
          ""
      );

      if (template) {
        return {
          code: template.code,
          bossCode: template.code,
          name: template.displayName || template.name,
          bossName: template.displayName || template.name,
          rarity: template.rarity || template.currentTier || template.baseTier || "C",
          currentTier: template.currentTier || template.rarity || template.baseTier || "C",
          image: template.image || "",
        };
      }

      return {
        code: component.code || component.bossCode || "",
        bossCode: component.code || component.bossCode || "",
        name: component.name || component.bossName || "",
        bossName: component.name || component.bossName || "",
        rarity: component.rarity || component.currentTier || "C",
        currentTier: component.currentTier || component.rarity || "C",
        image: component.image || "",
      };
    })
    .filter((entry) => entry.code || entry.name);
}

function pickRandomLinkedMergeRaidItem(db, boss) {
 const components = getMergeRaidComponentBosses(boss);
 if (!components.length) return pickRandomLinkedRaidItem(db, boss);

 const pool = components.flatMap((component) => findLinkedRaidItems(db, component));
 if (!pool.length) return null;

 const seen = new Set();
 const unique = pool.filter((item) => {
  const key = String(item.code || item.name || "").toLowerCase();
  if (!key || seen.has(key)) return false;
  seen.add(key);
  return true;
 });

 if (!unique.length) return null;
 return unique[Math.floor(Math.random() * unique.length)];
}

function addUniversalSReward(items, amount = 2) {
 return addAmountEntry(
  items,
  {
   code: "universal_s",
   name: "Universal S Fragment",
   rarity: "S",
   type: "universal",
  },
  amount
 );
}

function addAmountEntry(list, payload, amount = 1) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(payload.code || payload.name || "").toLowerCase();

  const index = arr.findIndex(
    (entry) =>
      String(entry.code || "").toLowerCase() === code ||
      normalizeText(entry.name) === normalizeText(payload.name)
  );

  if (index >= 0) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + Number(amount || 1),
    };
  } else {
    arr.push({
      ...payload,
      amount: Number(amount || 1),
    });
  }

  return arr;
}

function addRaidBossFragment(fragments, boss, amount) {
  return addAmountEntry(
    fragments,
    {
      code: boss.code || boss.bossCode,
      name: boss.name || boss.bossName,
      rarity: boss.rarity || boss.currentTier || boss.tier || "C",
      category: "battle",
      image: boss.image || "",
    },
    amount
  );
}

function addRaidWeaponFragment(fragments, weapon, amount = 1) {
  return addAmountEntry(
    fragments,
    {
      code: `weapon_fragment_${weapon.code}`,
      name: `${weapon.name} Fragment`,
      rarity: weapon.rarity || "C",
      category: "weapon",
      image: weapon.image || "",
      weaponCode: weapon.code,
    },
    amount
  );
}

function addRaidFruit(devilFruits, fruit) {
  return addAmountEntry(
    devilFruits,
    {
      code: fruit.code,
      name: fruit.name,
      rarity: fruit.rarity || "C",
      image: fruit.image || "",
    },
    1
  );
}

function getHostRewardBossPool(state, fallbackBoss = {}) {
  const hostId = String(state?.hostId || "");

  const hostMember = ensureArray(state?.members).find(
    (member) => String(member?.userId || "") === hostId
  );

  const hostCards = ensureArray(hostMember?.selectedCards)
    .map((card) => ({
      code: card.code || card.bossCode || card.cardCode || "",
      bossCode: card.code || card.bossCode || card.cardCode || "",
      name: card.name || card.displayName || card.bossName || "",
      bossName: card.name || card.displayName || card.bossName || "",
      rarity:
        card.rarity ||
        card.currentTier ||
        fallbackBoss.rarity ||
        fallbackBoss.currentTier ||
        "C",
      currentTier:
        card.currentTier ||
        card.rarity ||
        fallbackBoss.currentTier ||
        fallbackBoss.rarity ||
        "C",
      image: card.image || "",
    }))
    .filter((card) => card.code || card.name);

  return hostCards.length ? hostCards.slice(0, 3) : [fallbackBoss];
}

function pickRandomRewardBoss(bossPool, fallbackBoss = {}) {
  const pool = ensureArray(bossPool).filter(
    (boss) => boss && (boss.code || boss.name || boss.bossCode || boss.bossName)
  );

  if (!pool.length) {
    return fallbackBoss;
  }

  return pool[Math.floor(Math.random() * pool.length)] || fallbackBoss;
}

function pickRandomLinkedRaidItemFromBossPool(db, bossPool, fallbackBoss = {}) {
  const pool = ensureArray(bossPool).flatMap((boss) =>
    findLinkedRaidItems(db, boss)
  );

  const seen = new Set();

  const unique = pool.filter((item) => {
    const key = String(item?.code || item?.name || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length) {
    return unique[Math.floor(Math.random() * unique.length)] || null;
  }

  return pickRandomLinkedRaidItem(db, fallbackBoss);
}

function getMythicRaidDropBossPool(state = {}, boss = {}) {
  const hostRewardBossPool = getHostRewardBossPool(state, boss);
  const originalBossPool = getMergeRaidOriginalBossPool(boss);

  const mergeSourcePool = ensureArray(boss?.mergeSourceCodes)
    .map((code) => {
      const template = findCardTemplate(code);

      if (template) {
        return {
          code: template.code,
          bossCode: template.code,
          cardCode: template.code,
          name: template.displayName || template.name || template.code,
          bossName: template.displayName || template.name || template.code,
          displayName: template.displayName || template.name || template.code,
          rarity: template.rarity || template.currentTier || template.baseTier || "C",
          currentTier: template.currentTier || template.rarity || template.baseTier || "C",
          image: template.image || "",
        };
      }

      return {
        code,
        bossCode: code,
        cardCode: code,
        name: code,
        bossName: code,
        displayName: code,
      };
    })
    .filter((entry) => entry.code || entry.name);

  const pool = [
    ...originalBossPool,
    ...mergeSourcePool,
    ...hostRewardBossPool,
    boss,
  ];

  const seen = new Set();

  return pool.filter((entry) => {
    const key = normalizeText(
      entry?.code ||
        entry?.bossCode ||
        entry?.cardCode ||
        entry?.name ||
        entry?.bossName ||
        entry?.displayName ||
        ""
    );

    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function pickMythicRaidWeaponDrop(state, boss) {
  const mythicBossPool = getMythicRaidDropBossPool(state, boss);

  if (!mythicBossPool.length) {
    return pickRandomLinkedRaidItem(weaponsDb, boss);
  }

  return pickRandomLinkedRaidItemFromBossPool(
    weaponsDb,
    mythicBossPool,
    boss
  );
}

function pickMythicRaidFruitDrop(state, boss) {
  const mythicBossPool = getMythicRaidDropBossPool(state, boss);

  if (!mythicBossPool.length) {
    return pickRandomLinkedRaidItem(devilFruitsDb, boss);
  }

  return pickRandomLinkedRaidItemFromBossPool(
    devilFruitsDb,
    mythicBossPool,
    boss
  );
}

function giveRaidWinRewards(state) {
  const boss = state.boss || {};
  const bossTier = String(
    boss.rarity || boss.currentTier || boss.tier || "C"
  ).toUpperCase();

  const config = getRaidRewardConfig(bossTier, boss, state.raidMode);
  const isMergeRaid = isMythicMergeRaid(state);
  const hostRewardBossPool = getHostRewardBossPool(state, boss);
  const mergeOriginalBossPool = isMergeRaid ? getMergeRaidOriginalBossPool(boss) : [];
  const fragmentRewardBossPool = isMergeRaid
    ? mergeOriginalBossPool
    : hostRewardBossPool;

  const linkedFragmentBoss = pickRandomRewardBoss(
    fragmentRewardBossPool,
    isMergeRaid ? mergeOriginalBossPool[0] : boss
  );

  const linkedWeapon = isMergeRaid
    ? pickMythicRaidWeaponDrop(state, boss)
    : pickRandomLinkedRaidItemFromBossPool(
        weaponsDb,
        hostRewardBossPool,
        boss
      );

  const linkedFruit = isMergeRaid
    ? pickMythicRaidFruitDrop(state, boss)
    : pickRandomLinkedRaidItemFromBossPool(
        devilFruitsDb,
        hostRewardBossPool,
        boss
      );
  const hostId = String(state.hostId || "");

  const rewards = [];
  const rewardedUsers = new Set();

  for (const member of ensureArray(state.members)) {
    const userId = String(member.userId || "");
    if (!userId || rewardedUsers.has(userId)) continue;

    rewardedUsers.add(userId);

    const isHost = hostId && userId === hostId;

    const baseBerries = Math.max(
      0,
      Math.floor(Number(config.berries || 0))
    );

    const baseGems = Math.max(
      0,
      Math.floor(Number(config.gems || 0))
    );

    const boostedRewards = applyPirateRewardBonuses(userId, {
      berries: baseBerries,
      gems: baseGems,
    });

    const discordUser =
      state.client?.users?.cache?.get(userId) || null;

    const serverTagPerks = getServerTagPerks(discordUser);

    const serverTagBonusBerries = serverTagPerks.active
      ? Math.floor(
          baseBerries *
            (Number(
              serverTagPerks.berryIncomeBonusPercent || 0
            ) /
              100)
        )
      : 0;

    const serverTagBonusGems = serverTagPerks.active
      ? Math.floor(
          baseGems *
            (Number(
              serverTagPerks.gemIncomeBonusPercent || 0
            ) /
              100)
        )
      : 0;

    const berries =
      Number(boostedRewards.berries || 0) +
      serverTagBonusBerries;

    const gems =
      Number(boostedRewards.gems || 0) +
      serverTagBonusGems;

    const fragments = isHost && !isMergeRaid ? Number(config.fragments || 0) : 0;
    const universalS = isMergeRaid ? Number(config.universalS || 0) : 0;
    const gotWeapon = Boolean(isHost && linkedWeapon && randomChance(config.weaponChance));
    const gotFruit = Boolean(isHost && linkedFruit && randomChance(config.fruitChance));

    let username = member.username || "Unknown";

    updatePlayerAtomic(
      userId,
      (fresh) => {
        username = member.username || fresh.username || "Unknown";

        return {
        ...fresh,
        berries: Number(fresh.berries || 0) + berries,
        gems: Number(fresh.gems || 0) + gems,
        fragments: isHost
          ? gotWeapon
            ? addRaidWeaponFragment(
                fragments > 0
                  ? addRaidBossFragment(fresh.fragments, linkedFragmentBoss, fragments)
                  : fresh.fragments,
                linkedWeapon,
                1
              )
            : fragments > 0
              ? addRaidBossFragment(fresh.fragments, linkedFragmentBoss, fragments)
              : fresh.fragments
          : fresh.fragments,
          items: isMergeRaid && universalS > 0
            ? addUniversalSReward(fresh.items, universalS)
            : fresh.items,
        devilFruits: gotFruit ? addRaidFruit(fresh.devilFruits, linkedFruit) : fresh.devilFruits,
        };
      },
      member.username || "Unknown"
    );

    rewards.push({
      userId,
      username,
      isHost,
      berries,
      gems,

      serverTagBonusBerries,
      serverTagBonusGems,

      serverTagBerryBonusPercent: Number(
        serverTagPerks.berryIncomeBonusPercent || 0
      ),

      serverTagGemBonusPercent: Number(
        serverTagPerks.gemIncomeBonusPercent || 0
      ),

      fragments,
      universalS,
      bossName:
        linkedFragmentBoss.name ||
        linkedFragmentBoss.bossName ||
        boss.name ||
        boss.bossName ||
        "Raid Boss",
      weapon: gotWeapon ? linkedWeapon.name : null,
      fruit: gotFruit ? linkedFruit.name : null,
    });
  }

  return rewards;
}

function formatRaidWinRewardLines(state) {
  const rewards = ensureArray(state.winRewards);

  if (!rewards.length) {
    return ["• Reward data was not found."];
  }

  return rewards.map((reward) => {
    const lines = [
      `• **${reward.username}**${reward.isHost ? " 👑 Host" : ""}`,
      `+${Number(reward.berries || 0).toLocaleString("en-US")} berries`,
      `+${Number(reward.gems || 0).toLocaleString("en-US")} gems`,
    ];

    if (Number(reward.serverTagBonusBerries || 0) > 0) {
      lines.push(
        `🏷️ Server Tag Berry Bonus (${Number(
          reward.serverTagBerryBonusPercent || 0
        )}%): +${Number(
          reward.serverTagBonusBerries || 0
        ).toLocaleString("en-US")} berries`
      );
    }

    if (Number(reward.serverTagBonusGems || 0) > 0) {
      lines.push(
        `🏷️ Server Tag Gem Bonus (${Number(
          reward.serverTagGemBonusPercent || 0
        )}%): +${Number(
          reward.serverTagBonusGems || 0
        ).toLocaleString("en-US")} gems`
      );
    }

    if (reward.isHost && Number(reward.fragments || 0) > 0) {
      lines.push(
        `+${Number(reward.fragments || 0)} ${reward.bossName} fragment`
      );
    }

    if (Number(reward.universalS || 0) > 0) {
      lines.push(
        `+Universal S x${Number(reward.universalS || 0)}`
      );
    }

    const extras = [];

    if (reward.weapon) {
      extras.push(`⚔️ ${reward.weapon} Fragment x1`);
    }

    if (reward.fruit) {
      extras.push(`🍈 ${reward.fruit}`);
    }

    if (reward.isHost && extras.length) {
      lines.push(`Host Bonus: ${extras.join(" • ")}`);
    }

    return lines.join(" | ");
  });
}

function isImuThroneRaid(state, boss) {
  const raidMode = state?.raidMode || {};
  const bossCode = String(boss?.code || boss?.bossCode || "").toLowerCase();
  const bossName = String(boss?.name || boss?.bossName || "").toLowerCase();
  const ticketCode = String(raidMode?.ticketCode || "").toLowerCase();
  const fixedBossCode = String(raidMode?.fixedBossCode || "").toLowerCase();
  const modeName = String(raidMode?.modeName || "").toLowerCase();

  return (
    bossCode === "imu" ||
    bossName.includes("imu") ||
    fixedBossCode === "imu" ||
    ticketCode === "empty_throne_raid_writ" ||
    modeName.includes("throne")
  );
}

function normalizePrestigeBankCode(boss) {
  const code = String(boss?.code || boss?.bossCode || "").toLowerCase().trim();
  const name = String(boss?.name || boss?.bossName || "").toLowerCase().trim();

  if (code === "imu" || name.includes("imu")) return "imu";
  return code || name.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function addRaidPrestigeToWinnerCards(state) {
  const rewards = [];
  const boss = state.boss || {};
  const bossCode = String(boss.code || boss.bossCode || "").toLowerCase();
  const bossName = String(boss.name || boss.bossName || "").toLowerCase();
  const hostId = String(state.hostId || "");
  const allowBankedPrestige = isImuThroneRaid(state, boss);
  const bankCode = normalizePrestigeBankCode(boss);

  if (!hostId) {
    return [
      {
        userId: "",
        username: "Host",
        cardName: boss.name || boss.bossName || "Raid Boss",
        before: 0,
        after: 0,
        missing: true,
        reason: "Raid host data was not found.",
      },
    ];
  }

  const hostMember =
    ensureArray(state.members).find((member) => String(member.userId || "") === hostId) ||
    null;

  let prestigeReward = null;

  updatePlayerAtomic(
    hostId,
    (fresh) => {
      const cards = ensureArray(fresh.cards).map((card) => ({ ...card }));
      const index = cards.findIndex((card) => {
        const cardCode = String(card.code || "").toLowerCase();
        const cardName = String(card.displayName || card.name || "").toLowerCase();

        return (
          (bossCode && cardCode === bossCode) ||
          (bossName && cardName === bossName)
        );
      });

      const bank = {
        ...(fresh.raidPrestigeBank && typeof fresh.raidPrestigeBank === "object"
          ? fresh.raidPrestigeBank
          : {}),
      };

      const existingBank = bankCode ? bank[bankCode] || {} : {};
      const bankPrestige = Math.max(
        0,
        Math.min(200, Number(existingBank?.raidPrestige || 0))
      );

      if (index === -1) {
        if (!allowBankedPrestige || !bankCode) {
          prestigeReward = {
            userId: hostId,
            username: hostMember?.username || fresh.username || "Host",
            cardName: boss.name || boss.bossName || "Raid Boss",
            before: 0,
            after: 0,
            missing: true,
            reason: "Host does not own the raid boss card.",
          };

          return fresh;
        }

        const before = bankPrestige;
        const after = Math.min(200, before + 1);

        bank[bankCode] = {
          ...existingBank,
          code: bankCode,
          name: boss.name || boss.bossName || "Imu",
          displayName: boss.name || boss.bossName || "Imu",
          raidPrestige: after,
          source: "throne",
          updatedAt: Date.now(),
        };

        prestigeReward = {
          userId: hostId,
          username: hostMember?.username || fresh.username || "Host",
          cardName: boss.name || boss.bossName || "Imu",
          before,
          after,
          missing: false,
          banked: true,
          reason: "Throne / Imu prestige was banked because host does not own the card yet.",
        };

        return {
          ...fresh,
          raidPrestigeBank: bank,
        };
      }

      const ownedBefore = Math.max(
        0,
        Math.min(200, Number(cards[index].raidPrestige || 0))
      );

      const before = allowBankedPrestige
        ? Math.max(ownedBefore, bankPrestige)
        : ownedBefore;

      const after = Math.min(200, before + 1);

      cards[index].raidPrestige = after;

      if (allowBankedPrestige && bankCode) {
        bank[bankCode] = {
          ...existingBank,
          code: bankCode,
          name: cards[index].displayName || cards[index].name || boss.name || "Imu",
          displayName:
            cards[index].displayName || cards[index].name || boss.name || "Imu",
          raidPrestige: after,
          source: "throne",
          updatedAt: Date.now(),
        };
      }

      prestigeReward = {
        userId: hostId,
        username: hostMember?.username || fresh.username || "Host",
        cardName: cards[index].displayName || cards[index].name || boss.name || "Raid Boss",
        before,
        after,
        missing: false,
        banked: false,
      };

      return {
        ...fresh,
        cards,
        raidPrestigeBank: allowBankedPrestige ? bank : fresh.raidPrestigeBank,
      };
    },
    hostMember?.username || "Host"
  );

  if (prestigeReward) rewards.push(prestigeReward);

  return rewards;
}

function finalizeRaidBattle(state) {
  if (state.winner === "players") {
    try {
      const winRewards = giveRaidWinRewards(state);
      state.winRewards = winRewards;
    } catch (error) {
      console.error("[raid reward error]", error);
      state.winRewards = [];
      pushBattleLog(state, "Raid cleared, but reward sync failed.");
    }

    try {
      const prestigeRewards = addRaidPrestigeToWinnerCards(state);
      state.prestigeRewards = prestigeRewards;
    } catch (error) {
      console.error("[raid prestige error]", error);
      state.prestigeRewards = [];
      pushBattleLog(state, "Raid prestige sync failed.");
    }

    pushBattleLog(state, "Raid cleared.");
    pushBattleLog(state, "Rewards and prestige were processed.");
  } else {
    pushBattleLog(state, "All raid members were defeated.");
  }
}

function performRaidMemberAttack(state, actor, combatLogs) {
  const boss = state.boss;

  const baseDamage = randomInt(
    Math.floor(Number(actor.atk || 1) * 0.85),
    Math.floor(Number(actor.atk || 1) * 1.15)
  );

  const damage = baseDamage;

  boss.hp = Math.max(0, Number(boss.hp || 0) - damage);

  combatLogs.push(
    `⚔️ ${actor.name} dealt ${damage.toLocaleString("en-US")} damage to ${
      boss.name
    }.`
  );
}

function performRaidBossAttack(state, target, combatLogs) {
  const boss = state.boss;

  if (!target || Number(target.hp || 0) <= 0) return;

  const bossDamage = randomInt(boss.atkMin, boss.atkMax);

  target.hp = Math.max(0, Number(target.hp || 0) - bossDamage);

  combatLogs.push(
    `💢 ${boss.name} hit ${target.name} for ${bossDamage.toLocaleString(
      "en-US"
    )}${Number(target.hp || 0) <= 0 ? " and defeated them" : ""}.`
  );
}

function handleRaidAttack(state, actor) {
  const combatLogs = [];

  if (!actor || Number(actor.hp || 0) <= 0) {
    combatLogs.push("That raid member cannot attack right now.");
    state.log = combatLogs.slice(-MAX_BATTLE_LOG_LINES);
    return;
  }

  if (isMemberOnActionCooldown(actor)) {
    combatLogs.push(`${actor.name} is still on cooldown.`);
    state.log = combatLogs.slice(-MAX_BATTLE_LOG_LINES);
    return;
  }

  performRaidMemberAttack(state, actor, combatLogs);

  if (checkEndState(state)) {
    state.log = combatLogs.slice(-MAX_BATTLE_LOG_LINES);
    return;
  }

  const target = chooseBossTarget(state);

  if (target) {
    performRaidBossAttack(state, target, combatLogs);
  }

  tickActionCooldownsAfterAttack(state, actor);

  state.log = combatLogs.slice(-MAX_BATTLE_LOG_LINES);

  checkEndState(state);
}

async function handleRaidCountCommand(message, args) {
  const sub = String(args[0] || "").toLowerCase();

  if (["off", "stop", "reset", "clear", "0"].includes(sub)) {
    const nextState = setRaidCountForUser(
      message.author.id,
      message.author.username,
      0
    );

    return message.reply({
      embeds: [buildRaidCountEmbed(message, nextState)],
      allowedMentions: { repliedUser: false },
    });
  }

  if (["status", "check", "info"].includes(sub)) {
    const userKey = getRaidCountUserKey(message.author.id);
    const runtimeState = activeRaidCountByUser.get(userKey);
    const player = getPlayer(message.author.id, message.author.username);
    const state = getRaidCountState(
      runtimeState?.enabled ? { raidCountState: runtimeState } : player
    );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("Raid Count Status")
          .setDescription(
            [
              `User: <@${message.author.id}>`,
              state.enabled
                ? `Current counter: **${state.left}/${state.total} left**`
                : "Raid Count is inactive.",
              "",
              "Set a new counter with:",
              "`op raidcount <amount>`",
            ].join("\n")
          ),
      ],
      allowedMentions: { repliedUser: false },
    });
  }

  const amount = Math.floor(Number(args[0] || 0));

  if (!amount || amount < 0) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Raid Count")
          .setDescription(
            [
              "Usage:",
              "`op raidcount <amount>`",
              "`op raidcount status`",
              "`op raidcount off`",
              "",
              "Example:",
              "`op raidcount 5`",
            ].join("\n")
          ),
      ],
      allowedMentions: { repliedUser: false },
    });
  }

  const nextState = setRaidCountForUser(
    message.author.id,
    message.author.username,
    amount
  );

  return message.reply({
    embeds: [buildRaidCountEmbed(message, nextState)],
    allowedMentions: { repliedUser: false },
  });
}

module.exports = {
  name: "raid",
  aliases: ["craid", "graid", "throne", "mraid", "raidcount"],

  async execute(message, args) {
    const raw = String(message.content || "").trim().split(/\s+/);
    const usedCommandRaw = String(raw[1] || "").toLowerCase();
    if (usedCommandRaw === "raidcount") {
      return handleRaidCountCommand(message, args);
    }
    const usedCommand = ["craid", "raid", "graid", "throne", "mraid"].includes(usedCommandRaw)
      ? usedCommandRaw
      : "raid";

    let raidMode = getRaidModeConfig(usedCommand);
    const query = raidMode.fixedBossCode || args.join(" ").trim();

    if (!query) {
      return message.reply(
        "Usage: `op craid <boss>` / `op raid <boss>` / `op graid <boss>` / `op throne` / `op mraid <merge boss>`"
      );
    }

    const hostId = String(message.author.id);
    const host = getPlayer(hostId, message.author.username);

    if (hasActiveRoom(hostId)) {
      return message.reply("You already have an active raid/party room.");
    }

    const bossInfo = resolveRaidBoss(query);
    if (!bossInfo) {
      return message.reply("Raid boss not found.");
    }

    if (isLuffyRaidBoss(bossInfo) && usedCommand !== "graid") {
      return message.reply(
        "Luffy raid is a **Gold Raid special boss**.\nUse: `op graid luffy`"
      );
    }

    raidMode = getEffectiveRaidMode(usedCommand, bossInfo, raidMode);

    const resolvedBossCode = String(
      bossInfo?.bossCode ||
        bossInfo?.template?.code ||
        bossInfo?.template?.id ||
        ""
    ).toLowerCase();

    if (
      resolvedBossCode === "imu" &&
      raidMode.ticketCode !== "empty_throne_raid_writ"
    ) {
      return message.reply(
        "Imu Raid requires **Empty Throne Raid Writ**. Gold Raid Ticket cannot be used for Imu."
      );
    }

    const bossTier = String(
      bossInfo?.template?.rarity || bossInfo?.template?.currentTier || "B"
    ).toUpperCase();

    if (!raidMode.allowed.has(bossTier)) {
      if (usedCommand === "craid") {
        return message.reply("craid only supports C and B battle card raid bosses.");
      }

      if (usedCommand === "graid") {
        return message.reply(
          "graid only supports S battle card raid bosses. Special exception: `op graid luffy`."
        );
      }

      if (usedCommand === "throne") {
        return message.reply("throne only supports Imu raid with Empty Throne Raid Writ.");
      }

      return message.reply("raid only supports A battle card raid bosses. Luffy must use `op graid luffy`.");
    }

    const ticketEntry = findTicketEntry(host.tickets, raidMode);

    if (!ticketEntry || Number(ticketEntry.amount || 0) <= 0) {
      return message.reply(`You do not have any ${raidMode.label}.`);
    }

    let consumedTickets = null;
    let consumedTicket = null;

    try {
      updatePlayerAtomic(
        hostId,
        (fresh) => {
          const consumed = consumeOneTicket(fresh, raidMode);

          if (!consumed.ok) {
            throw new Error(`Failed to consume ${raidMode.label}.`);
          }

          consumedTickets = consumed.tickets;
          consumedTicket = consumed.consumedTicket;

          return {
            ...fresh,
            tickets: consumedTickets,
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply(error.message || `Failed to consume ${raidMode.label}.`);
    }

    host.tickets = consumedTickets;

    const whitelist = getSavedRaidTeam(host);
    const isThroneRaid = usedCommand === "throne";

    const room = createRaidRoom({
      hostId,
      hostName: message.author.username,
      guildId: String(message.guildId || ""),
      channelId: String(message.channelId || ""),
      bossCode: bossInfo.bossCode,
      bossName: bossInfo.bossName,
      bossImage: bossInfo.bossImage || "",
      ticketConsumed: true,
      consumedTicket,
      whitelist,
      cardsPerUser: isThroneRaid ? 3 : 1,
      maxParticipants: isThroneRaid ? 4 : 10,
      uniqueCardCodesOnly: !isThroneRaid,
    });

    const raidCountResult = consumeRaidCountForUser(
      hostId,
      message.author.username
    );

    if (raidCountResult.consumed) {
      await message.channel
        .send({
          content: raidCountResult.completed
            ? `✅ Raid Count completed: **0/${raidCountResult.total} left**`
            : `🔢 Raid Count: **${raidCountResult.leftAfter}/${raidCountResult.total} left**`,
          allowedMentions: {
            repliedUser: false,
          },
        })
        .catch(() => null);
    }

    const bossPreviewStats = deriveRaidBossStats(bossInfo.template, raidMode);

    const lobbyMessage = await message.reply({
      embeds: [
        buildLobbyEmbed(message.author.username, room, false, bossPreviewStats),
      ],
      components: buildLobbyRows(room, false),
    });

    const lobbyCollector = lobbyMessage.createMessageComponentCollector({
      time: RAID_ROOM_TIMEOUT_MS,
      idle: RAID_LOBBY_IDLE_REFUND_MS,
    });

    let battleMessage = null;

    lobbyCollector.on("collect", async (interaction) => {
    const activeRoom = getRoom(hostId);

      if (!activeRoom || String(activeRoom.roomId) !== String(room.roomId)) {
        await safeDeferReplyInteraction(interaction);
      return safeReplyOrEdit(interaction, {
        content: "This raid room is no longer active.",
      });
      }

      if (interaction.customId === `raid_join_${room.roomId}`) {
        const joinDeferred = await safeDeferReplyInteraction(interaction);

        if (!joinDeferred) {
          return;
        }

        const userId = String(interaction.user.id);
        const isHost = userId === hostId;
        const whitelistIds = ensureArray(activeRoom.whitelist).map(String);

        if (!isHost && !whitelistIds.includes(userId)) {
          return safeReplyOrEdit(interaction, {
            content: "You are not in the host's saved raid team.",
          });
        }

        const joiningPlayer = getPlayer(userId, interaction.user.username);
        const teamCards = getBattleTeamCards(joiningPlayer);

        if (hasParticipantJoined(activeRoom, userId)) {
          return safeReplyOrEdit(interaction, {
            content: "You already joined this raid.",
          });
        }

        const maxRaidUsers = getMaxRaidUsers(activeRoom);
        const joinedCount = getSelectedParticipantCount(activeRoom);

        if (joinedCount >= maxRaidUsers || !hasReservedHostSlotAvailable(activeRoom, userId)) {
          return safeReplyOrEdit(interaction, {
            content: isThroneRoom(activeRoom)
              ? "This Throne Raid is already full for non-host players. The last slot is reserved for the host."
              : "This raid room is already full.",
          });
        }

        if (isThroneRoom(activeRoom)) {
          const throneCards = getThroneTeamCards(joiningPlayer);

          if (throneCards.length < 3) {
            return safeReplyOrEdit(interaction, {
              content:
                "Throne Raid requires **3 battle cards** in your current team slots.",
            });
          }

          const thronePreviewConflict = findRaidRoomCardConflict(
            activeRoom,
            throneCards,
            userId
          );

          if (thronePreviewConflict) {
            const conflictName =
              thronePreviewConflict.existingCard?.name ||
              thronePreviewConflict.existingCard?.displayName ||
              thronePreviewConflict.incomingCard?.name ||
              thronePreviewConflict.incomingCard?.displayName ||
              "this card";

            return safeReplyOrEdit(interaction, {
              content: `**${conflictName}** is already used in this Throne Raid room. Please change your team first.`,
            });
          }

          await safeReplyOrEdit(interaction, {
            content: [
              `${interaction.user.username}, this is the team that will be deployed for this battle, press button to confirm`,
              formatThroneTeamPreview(throneCards),
            ].join("\n"),
            components: buildThroneConfirmRows(room.roomId, userId),
          });

          const confirmReply = await interaction.fetchReply();
          let confirmInteraction;

          try {
            confirmInteraction = await confirmReply.awaitMessageComponent({
              time: RAID_PICK_TIMEOUT_MS,
              filter: (button) =>
                button.user.id === interaction.user.id &&
                (
                  button.customId === `raid_throne_confirm_${room.roomId}_${userId}` ||
                  button.customId === `raid_throne_cancel_${room.roomId}_${userId}`
                ),
            });
          } catch {
            return;
          }

          if (confirmInteraction.customId === `raid_throne_cancel_${room.roomId}_${userId}`) {
            return safeInteractionUpdate(confirmInteraction, {
              content: "Throne Raid join cancelled.",
              components: [],
            });
          }

          try {
            const latestRoom = getRoom(hostId);

            if (!latestRoom || String(latestRoom.roomId) !== String(room.roomId)) {
              return safeInteractionUpdate(confirmInteraction, {
                content: "This raid room is no longer active.",
                components: [],
              });
            }

            if (hasParticipantJoined(latestRoom, userId)) {
              return safeInteractionUpdate(confirmInteraction, {
                content: "You already joined this raid.",
                components: [],
              });
            }

            const latestMaxRaidUsers = getMaxRaidUsers(latestRoom);
            const latestJoinedCount = getSelectedParticipantCount(latestRoom);

            if (
              latestJoinedCount >= latestMaxRaidUsers ||
              !hasReservedHostSlotAvailable(latestRoom, userId)
            ) {
              return safeInteractionUpdate(confirmInteraction, {
                content: "This Throne Raid is already full for non-host players. The last slot is reserved for the host.",
                components: [],
              });
            }

            const latestThroneCards = getThroneTeamCards(getPlayer(userId, interaction.user.username));

            if (latestThroneCards.length < 3) {
              return safeInteractionUpdate(confirmInteraction, {
                content: "Throne Raid requires **3 battle cards** in your current team slots.",
                components: [],
              });
            }

            const throneConfirmConflict = findRaidRoomCardConflict(
              latestRoom,
              latestThroneCards,
              userId
            );

            if (throneConfirmConflict) {
              const conflictName =
                throneConfirmConflict.existingCard?.name ||
                throneConfirmConflict.existingCard?.displayName ||
                throneConfirmConflict.incomingCard?.name ||
                throneConfirmConflict.incomingCard?.displayName ||
                "this card";

              return safeInteractionUpdate(confirmInteraction, {
                content: `**${conflictName}** is already used in this Throne Raid room. Please change your team first.`,
                components: [],
              });
            }

            const updatedRoom = addParticipant(hostId, {
              userId,
              username: interaction.user.username,
              selectedCards: latestThroneCards.map(toRoomCard),
            });

            await safeInteractionUpdate(confirmInteraction, {
              content: [
                `${interaction.user.username} joined the raid with`,
                formatThroneTeamPreview(latestThroneCards),
              ].join("\n"),
              components: [],
            });

            await safeEditRaidMessage(lobbyMessage, {
              embeds: [
                buildLobbyEmbed(
                  message.author.username,
                  updatedRoom,
                  false,
                  bossPreviewStats
                ),
              ],
              components: buildLobbyRows(updatedRoom, false),
            });

            await message.channel
              .send(
                [
                  `${interaction.user.username} joined the raid with`,
                  formatThroneTeamPreview(latestThroneCards),
                ].join("\n")
              )
              .catch(() => null);

            await notifyHostIfRaidReady(message, updatedRoom);
          } catch (error) {
            return safeInteractionUpdate(confirmInteraction, {
              content: error.message || "Failed to join Throne Raid.",
              components: [],
            });
          }

          return;
        }

        if (!teamCards.length) {
          return safeReplyOrEdit(interaction, {
            content:
              "You need at least 1 battle card in your current team to join this raid.",
          });
        }

        await safeReplyOrEdit(interaction, {
          content: `Pick 1 battle card for raid against ${activeRoom.bossName}.`,
          components: buildPickRows(room.roomId, teamCards),
        });

        const pickReply = await interaction.fetchReply();
        let pickInteraction;

        try {
          pickInteraction = await pickReply.awaitMessageComponent({
            time: RAID_PICK_TIMEOUT_MS,
            filter: (button) =>
              button.user.id === interaction.user.id &&
              String(button.customId).startsWith(`raid_pick_${room.roomId}_`),
          });
        } catch {
          return;
        }

        const pickedId = String(pickInteraction.customId).replace(
          `raid_pick_${room.roomId}_`,
          ""
        );

        const picked = teamCards.find(
          (card) => String(card.instanceId) === pickedId
        );

        if (!picked) {
          return safeInteractionUpdate(pickInteraction, {
            content: "Selected card not found in your current team.",
            components: [],
          });
        }

        try {
          const updatedRoom = addParticipant(hostId, {
            userId,
            username: interaction.user.username,
            selectedCards: [toRoomCard(picked)],
          });

          await safeInteractionUpdate(pickInteraction, {
            content: `Joined raid with ${picked.displayName || picked.name}.`,
            components: [],
          });

          await safeEditRaidMessage(lobbyMessage, {
            embeds: [
              buildLobbyEmbed(
                message.author.username,
                updatedRoom,
                false,
                bossPreviewStats
              ),
            ],
            components: buildLobbyRows(updatedRoom, false),
          });

          await message.channel
            .send(
              `${interaction.user.username} joined the raid with **${
                picked.displayName || picked.name
              }**.`
            )
            .catch(() => null);

          await notifyHostIfRaidReady(message, updatedRoom);
        } catch (error) {
          return safeInteractionUpdate(pickInteraction, {
            content: error.message || "Failed to join raid.",
            components: [],
          });
        }

        return;
      }

      if (interaction.customId === `raid_start_${room.roomId}`) {
        if (String(interaction.user.id) !== hostId) {
          await safeDeferReplyInteraction(interaction);
        return safeReplyOrEdit(interaction, {
          content: "Only the host can start this raid.",
        });
        }

        const startDeferred = await safeDeferReplyInteraction(interaction);

        if (!startDeferred) {
          return;
        }

        const latestRoom = getRoom(hostId);

        if (!latestRoom || String(latestRoom.roomId) !== String(room.roomId)) {
          return safeReplyOrEdit(interaction, {
            content: "This raid room is no longer active.",
          });
        }

        if (!hasParticipantJoined(latestRoom, hostId)) {
          return safeReplyOrEdit(interaction, {
            content: "Host must join the raid first before starting the raid.",
          });
        }

        let startedRoom;

        try {
          startedRoom = startRoom(hostId);
        } catch (error) {
          return safeReplyOrEdit(interaction, {
            content: error.message || "Failed to start raid.",
          });
        }

        const joinedCount = getSelectedParticipantCount(startedRoom);
        const maxRaidUsers = getMaxRaidUsers(startedRoom);

        if (joinedCount < 1) {
          return safeReplyOrEdit(interaction, {
            content: "No participants have joined yet.",
          });
        }

        if (joinedCount > maxRaidUsers) {
          return safeReplyOrEdit(interaction, {
            content: isThroneRoom(startedRoom)
              ? "Throne Raid can only have max 4 users."
              : "This raid has too many participants.",
          });
        }

        let battleState;

        try {
          battleState = buildBattleState(
            startedRoom,
            bossInfo.template,
            raidMode,
            message.client
          );
        } catch (error) {
          console.error("[raid build battle state error]", error);

          try {
            safeDeleteRaidRoom(hostId, "raid-flow");
          } catch {}

          return safeReplyOrEdit(interaction, {
            content:
              "Failed to build raid battle state.\nPlease re-open raid and try again.",
          });
        }

        if (!battleState.members.length) {
          try {
            safeDeleteRaidRoom(hostId, "raid-flow");
          } catch {}

          return safeReplyOrEdit(interaction, {
            content:
              "Failed to sync raid participants from latest card data.\nPlease re-open raid and join again.",
          });
        }

        const invalidMember = battleState.members.find(
          (member) => Number(member.atk || 0) <= 0 || Number(member.maxHp || 0) <= 1
        );

        if (invalidMember) {
          try {
            safeDeleteRaidRoom(hostId, "raid-flow");
          } catch {}

          return safeReplyOrEdit(interaction, {
            content:
              "A raid card failed to sync correctly.\nPlease re-open raid and join again.",
          });
        }

        await safeReplyOrEdit(interaction, {
          content: "Starting raid battle...",
        });

        await safeEditRaidMessage(lobbyMessage, {
          embeds: [
            buildLobbyEmbed(
              message.author.username,
              startedRoom,
              true,
              bossPreviewStats
            ),
          ],
          components: buildLobbyRows(startedRoom, true),
        });

        battleMessage = await message.channel
          .send({
            embeds: [buildBattleEmbed(battleState)],
            components: buildBattleRows(battleState),
          })
          .catch((error) => {
            console.error("[raid battle message send failed]", error);
            return null;
          });

        if (!battleMessage) {
          try {
            safeDeleteRaidRoom(hostId, "raid-flow");
          } catch {}

          return safeReplyOrEdit(interaction, {
            content:
              "Failed to send raid battle message.\nYour room was closed. If the raid does not start, ticket will be refunded on room cleanup.",
          });
        }

        const battleCollector = battleMessage.createMessageComponentCollector({
          time: RAID_ROOM_TIMEOUT_MS,
        });

        battleCollector.on("collect", async (button) => {
          const customId = String(button.customId || "");

          if (
            !customId.startsWith(`raid_act_${battleState.roomId}_`) &&
            customId !== `raid_next_${battleState.roomId}`
          ) {
            return;
          }

          if (String(button.user.id) !== hostId) {
            await safeDeferReplyInteraction(button);

            return safeReplyOrEdit(button, {
              content: "Only the raid host can control this raid battle.",
            });
          }

          const lockKey = String(battleState.roomId);

          if (activeRaidActionLocks.has(lockKey)) {
            await safeDeferReplyInteraction(button);
        return safeReplyOrEdit(button, {
          content: "Raid action is still processing. Please wait a moment.",
        });
          }

          activeRaidActionLocks.add(lockKey);

          try {
            const deferred = await safeDeferInteraction(button);

            if (!deferred) {
              return;
            }

            if (battleState.finished) {
              return safeEditRaidMessage(battleMessage, {
                embeds: [buildResultEmbed(battleState)],
                components: [],
              });
            }

            if (customId === `raid_next_${battleState.roomId}`) {
              if (!canAdvanceRaidTurn(battleState)) {
                pushBattleLog(battleState, "There are still ready raid cards.");

                return safeEditRaidMessage(battleMessage, {
                  embeds: [buildBattleEmbed(battleState)],
                  components: buildBattleRows(battleState),
                });
              }

              advanceRaidTurn(battleState);

              return safeEditRaidMessage(battleMessage, {
                embeds: [buildBattleEmbed(battleState)],
                components: buildBattleRows(battleState),
              });
            }

            const memberIndex = Number(
              customId.replace(`raid_act_${battleState.roomId}_`, "")
            );

            if (!Number.isInteger(memberIndex) || memberIndex < 0) {
              pushBattleLog(battleState, "Invalid raid action.");

              return safeEditRaidMessage(battleMessage, {
                embeds: [buildBattleEmbed(battleState)],
                components: buildBattleRows(battleState),
              });
            }

            const actor = battleState.members[memberIndex];

            if (!actor || Number(actor.hp || 0) <= 0) {
              pushBattleLog(battleState, "That card can no longer act.");

              return safeEditRaidMessage(battleMessage, {
                embeds: [buildBattleEmbed(battleState)],
                components: buildBattleRows(battleState),
              });
            }

            if (isMemberOnActionCooldown(actor)) {
              pushBattleLog(battleState, `${actor.name} is still on cooldown.`);

              return safeEditRaidMessage(battleMessage, {
                embeds: [buildBattleEmbed(battleState)],
                components: buildBattleRows(battleState),
              });
            }

            handleRaidAttack(battleState, actor);

            if (battleState.finished) {
              await safeEditRaidMessage(battleMessage, {
                embeds: [buildRaidProcessingEmbed(battleState)],
                components: [],
              });

              finalizeRaidBattle(battleState);

              try {
                safeDeleteRaidRoom(hostId, "raid-flow");
              } catch (error) {
                console.error("[raid delete room error]", error);
              }

              battleCollector.stop("finished");

              return safeEditRaidMessage(battleMessage, {
                embeds: [buildResultEmbed(battleState)],
                components: [],
              });
            }

            return safeEditRaidMessage(battleMessage, {
              embeds: [buildBattleEmbed(battleState)],
              components: buildBattleRows(battleState),
            });
          } catch (error) {
            console.error("[raid battle interaction error]", error);

            pushBattleLog(battleState, "Battle interaction error. Please try again.");

            return safeEditRaidMessage(battleMessage, {
              embeds: [buildBattleEmbed(battleState)],
              components: buildBattleRows(battleState),
            });
          } finally {
            activeRaidActionLocks.delete(lockKey);
          }
        });

        battleCollector.on("end", async (_, reason) => {
          if (reason === "finished") return;
          if (battleState.finished) return;

          battleState.finished = true;
          battleState.winner = "timeout";
          pushBattleLog(battleState, "Raid timed out.");

          try {
            safeDeleteRaidRoom(hostId, "raid-flow");
          } catch {}

          await safeEditRaidMessage(battleMessage, {
            embeds: [buildResultEmbed(battleState)],
            components: [],
          });
        });

        return;
      }
    });

    lobbyCollector.on("end", async () => {
      const activeRoom = getRoom(hostId);

      if (!activeRoom || String(activeRoom.roomId) !== String(room.roomId)) return;
      if (battleMessage) return;

      let refunded = false;

      try {
        refunded = refundRaidTicketIfUnused(
          hostId,
          message.author.username,
          raidMode,
          activeRoom
        );
      } catch (error) {
        console.error("[raid ticket refund error]", error);
      }

      try {
        safeDeleteRaidRoom(hostId, "raid-flow");
      } catch {}

      try {
        await lobbyMessage.edit({
          embeds: [
            buildLobbyEmbed(
              message.author.username,
              {
                ...activeRoom,
                ticketConsumed: refunded ? false : activeRoom.ticketConsumed,
              },
              true,
              bossPreviewStats
            ).setFooter({
              text: refunded
                ? "Raid room closed • Ticket refunded because raid did not start within 5 minutes"
                : "Raid room closed",
            }),
          ],
          components: buildLobbyRows(activeRoom, true),
        });
      } catch {}

      if (refunded) {
        await message.channel
          .send({
          content: `↩️ ${userMention(
            hostId
          )} raid did not start within 5 minutes, so **${
            activeRoom?.consumedTicket?.name ||
            raidMode.label
          }** was refunded.`,
            allowedMentions: {
              users: [hostId],
              repliedUser: false,
            },
          })
          .catch(() => null);
      }
    });
  },
};