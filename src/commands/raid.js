const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { hydrateCard, findCardTemplate } = require("../utils/evolution");
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

const RAID_ROOM_TIMEOUT_MS = 30 * 60 * 1000;
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

function getRaidDisplayPower(card) {
  return Number(
    card?.currentPower ||
      card?.power ||
      Math.floor(
        Number(card?.atk || 0) * 1.4 +
          Number(card?.hp || 0) * 0.22 +
          Number(card?.speed || 0) * 9
      )
  );
}

function applyBoostedRaidDisplayStats(card, boosts = {}) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") return card;

  const boosted = {
    ...card,
    atk: Math.floor(Number(card.atk || 0) * (1 + Number(boosts.atk || 0) / 100)),
    hp: Math.floor(Number(card.hp || 0) * (1 + Number(boosts.hp || 0) / 100)),
    speed: Math.floor(Number(card.speed || 0) * (1 + Number(boosts.spd || 0) / 100)),
  };

  boosted.currentPower = getRaidDisplayPower({
    ...boosted,
    currentPower: 0,
    power: 0,
  });
  boosted.power = boosted.currentPower;

  return boosted;
}

function getRaidModeConfig(commandName) {
  const cmd = String(commandName || "").toLowerCase();

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

function findTicketEntry(tickets = [], raidMode) {
  return (
    ensureArray(tickets).find((entry) => {
      const code = normalize(entry?.code);
      const name = normalize(entry?.name);

      return (
        code === normalize(raidMode.ticketCode) ||
        name === normalize(raidMode.ticketName)
      );
    }) || null
  );
}

function consumeOneTicket(player, raidMode) {
  const tickets = ensureArray(player?.tickets).map((ticket) => ({ ...ticket }));

  const index = tickets.findIndex((entry) => {
    const code = normalize(entry?.code);
    const name = normalize(entry?.name);

    return (
      code === normalize(raidMode.ticketCode) ||
      name === normalize(raidMode.ticketName)
    );
  });

  if (index === -1) {
    return {
      ok: false,
      tickets: ensureArray(player?.tickets),
    };
  }

  const current = Number(tickets[index].amount || 0);

  if (current <= 0) {
    return {
      ok: false,
      tickets: ensureArray(player?.tickets),
    };
  }

  if (current === 1) {
    tickets.splice(index, 1);
  } else {
    tickets[index].amount = current - 1;
  }

  return {
    ok: true,
    tickets,
  };
}

function refundOneTicket(player, raidMode) {
  const tickets = ensureArray(player?.tickets).map((ticket) => ({ ...ticket }));
  const ticketCode = String(raidMode.ticketCode || "").toLowerCase();

  const index = tickets.findIndex((entry) => {
    const code = String(entry?.code || "").toLowerCase();
    const name = String(entry?.name || "").toLowerCase();

    return (
      code === ticketCode ||
      name === String(raidMode.ticketName || "").toLowerCase()
    );
  });

  if (index === -1) {
    tickets.push({
      code: raidMode.ticketCode,
      name: raidMode.ticketName,
      type: "ticket",
      amount: 1,
    });

    return tickets;
  }

  tickets[index] = {
    ...tickets[index],
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
        tickets: refundOneTicket(fresh, raidMode),
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

function getRaidBaseBattleCards(player) {
  return (Array.isArray(player?.cards) ? player.cards : [])
    .map((card) => hydrateCard(card))
    .filter(
      (card) =>
        card &&
        String(card.cardRole || "").toLowerCase() === "battle"
    );
}

function getBattleTeamCards(player) {
  const cards = getRaidBaseBattleCards(player);
  const slots = Array.isArray(player?.team?.slots) ? player.team.slots.slice(0, 3) : [];

  return slots
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
}

function toRoomCard(card) {
  const synced = hydrateCard(card);

  return {
    instanceId: String(synced.instanceId || ""),
    code: String(synced.code || ""),
    name: String(synced.displayName || synced.name || "Unknown"),
    evolutionStage: Number(synced.evolutionStage || 1),
    currentTier: String(synced.currentTier || synced.rarity || ""),
    image: String(synced.image || ""),
    cardRole: String(synced.cardRole || "battle"),
  };
}

function getFreshOwnedBattleCard(userId, username, picked) {
  const player = getPlayer(userId, username);
  const cards = getRaidBaseBattleCards(player);

  const byInstance = cards.find(
    (card) =>
      String(card.instanceId) === String(picked?.instanceId || "") &&
      String(card.cardRole || "").toLowerCase() === "battle"
  );

  if (byInstance) return byInstance;

  const byCode = cards.find(
    (card) =>
      String(card.code || "").toLowerCase() === String(picked?.code || "").toLowerCase() &&
      String(card.cardRole || "").toLowerCase() === "battle"
  );

  if (byCode) return byCode;

  return null;
}

function buildBattleRoster(room) {
  const participants = ensureArray(room?.participants).filter(
    (participant) => ensureArray(participant.selectedCards).length > 0
  );

  return participants
    .flatMap((participant) =>
      ensureArray(participant.selectedCards).map((picked) => {
        const fresh = getFreshOwnedBattleCard(
          String(participant.userId),
          String(participant.username || "Unknown"),
          picked
        );

        if (!fresh) return null;

        const player = getPlayer(
          String(participant.userId),
          String(participant.username || "Unknown")
        );
        const boosts = getPlayerCombatBoosts(player);
        const displayed = applyBoostedRaidDisplayStats(fresh, boosts);

        return {
          userId: String(participant.userId),
          username: String(participant.username || "Unknown"),
          instanceId: String(displayed.instanceId || ""),
          code: String(displayed.code || ""),
          name: String(displayed.displayName || displayed.name || picked?.name || "Unknown"),
          atk: Number(displayed.atk || 0),
          maxHp: Number(displayed.hp || 1),
          hp: Number(displayed.hp || 1),
          speed: Number(displayed.speed || 0),
          currentPower: Number(displayed.currentPower || getRaidDisplayPower(displayed)),
          currentTier: String(displayed.currentTier || displayed.rarity || ""),
          evolutionStage: Number(displayed.evolutionStage || 1),
          image: String(displayed.image || ""),
          passiveBoostsApplied: {
            atk: Number(boosts.atk || 0),
            hp: Number(boosts.hp || 0),
            spd: Number(boosts.spd || 0),
            dmg: Number(boosts.dmg || 0),
            exp: Number(boosts.exp || 0),
          },
          alive: true,
        };
      })
    )
    .filter(Boolean)
    .sort((a, b) => Number(b.currentPower || 0) - Number(a.currentPower || 0));
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
      hp: 2.4,
      speed: 1.35,
      atk: 1.65,
    };
  }

  if (ticketCode === "gold_raid_ticket" || modeName.includes("gold")) {
    return {
      hp: 1.4,
      speed: 1.2,
      atk: 1.1,
    };
  }

  return {
    hp: 1,
    speed: 1,
    atk: 1,
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
          .map((card) => card.name || card.code)
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
          ? "• Throne Raid max 4 users total including host"
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
            ? `${index + 1} ${card.displayName || card.name}`.slice(0, 80)
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

function buildBattleState(room, bossTemplate, raidMode = {}) {
  const members = buildBattleRoster(room).map((member) => ({
    ...member,
    actionCooldown: 0,
  }));

  return {
    roomId: room.roomId,
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
      rarity:
        bossTemplate.rarity ||
        bossTemplate.currentTier ||
        bossTemplate.baseTier ||
        "C",
      currentTier:
        bossTemplate.currentTier ||
        bossTemplate.rarity ||
        bossTemplate.baseTier ||
        "C",
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
      gems: 30,
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
      weaponChance: 40,
      fruitChance: 1,
    },
    S: {
      berries: 15000,
      gems: 20,
      fragments: 1,
      weaponChance: 35,
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

function giveRaidWinRewards(state) {
  const boss = state.boss || {};
  const bossTier = String(
    boss.rarity || boss.currentTier || boss.tier || "C"
  ).toUpperCase();

  const config = getRaidRewardConfig(bossTier, boss, state.raidMode);
  const linkedWeapon = findLinkedRaidItem(weaponsDb, boss);
  const linkedFruit = findLinkedRaidItem(devilFruitsDb, boss);
  const hostId = String(state.hostId || "");

  const rewards = [];
  const rewardedUsers = new Set();

  for (const member of ensureArray(state.members)) {
    const userId = String(member.userId || "");
    if (!userId || rewardedUsers.has(userId)) continue;

    rewardedUsers.add(userId);

    const isHost = hostId && userId === hostId;
    const berries = Number(config.berries || 0);
    const gems = Number(config.gems || 0);
    const fragments = isHost ? Number(config.fragments || 0) : 0;
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
                  addRaidBossFragment(fresh.fragments, boss, fragments),
                  linkedWeapon,
                  1
                )
              : addRaidBossFragment(fresh.fragments, boss, fragments)
            : fresh.fragments,
          devilFruits: gotFruit
            ? addRaidFruit(fresh.devilFruits, linkedFruit)
            : fresh.devilFruits,
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
      fragments,
      bossName: boss.name || boss.bossName || "Raid Boss",
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

    if (reward.isHost && Number(reward.fragments || 0) > 0) {
      lines.push(`+${Number(reward.fragments || 0)} ${reward.bossName} fragment`);
    }

    const extras = [];

    if (reward.weapon) extras.push(`⚔️ ${reward.weapon} Fragment x1`);
    if (reward.fruit) extras.push(`🍈 ${reward.fruit}`);

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

module.exports = {
  name: "raid",
  aliases: ["craid", "graid", "throne"],

  async execute(message, args) {
    const raw = String(message.content || "").trim().split(/\s+/);
    const usedCommandRaw = String(raw[1] || "").toLowerCase();
    const usedCommand = ["craid", "raid", "graid", "throne"].includes(usedCommandRaw)
      ? usedCommandRaw
      : "raid";

    let raidMode = getRaidModeConfig(usedCommand);
    const query = raidMode.fixedBossCode || args.join(" ").trim();

    if (!query) {
      return message.reply(
        "Usage: `op craid <boss>` / `op raid <boss>` / `op graid <boss>` / `op throne`"
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

    try {
      updatePlayerAtomic(
        hostId,
        (fresh) => {
          const consumed = consumeOneTicket(fresh, raidMode);

          if (!consumed.ok) {
            throw new Error(`Failed to consume ${raidMode.label}.`);
          }

          consumedTickets = consumed.tickets;

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
      whitelist,
      cardsPerUser: isThroneRaid ? 3 : 1,
      maxParticipants: isThroneRaid ? 4 : 10,
      uniqueCardCodesOnly: !isThroneRaid,
    });

    const bossPreviewStats = deriveRaidBossStats(bossInfo.template, raidMode);

    const lobbyMessage = await message.reply({
      embeds: [buildLobbyEmbed(message.author.username, room, false, bossPreviewStats)],
      components: buildLobbyRows(room, false),
    });

    const lobbyCollector = lobbyMessage.createMessageComponentCollector({
      time: RAID_ROOM_TIMEOUT_MS,
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

        if (joinedCount >= maxRaidUsers) {
          return safeReplyOrEdit(interaction, {
            content: isThroneRoom(activeRoom)
              ? "This Throne Raid is already full. Max 4 users / 12 cards."
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

            if (latestJoinedCount >= latestMaxRaidUsers) {
              return safeInteractionUpdate(confirmInteraction, {
                content: "This Throne Raid is already full. Max 4 users / 12 cards.",
                components: [],
              });
            }

            const updatedRoom = addParticipant(hostId, {
              userId,
              username: interaction.user.username,
              selectedCards: throneCards.map(toRoomCard),
            });

            await safeInteractionUpdate(confirmInteraction, {
              content: [
                `${interaction.user.username} joined the raid with`,
                formatThroneTeamPreview(throneCards),
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
                  formatThroneTeamPreview(throneCards),
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
          battleState = buildBattleState(startedRoom, bossInfo.template, raidMode);
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
                ? "Raid room closed • Ticket refunded because raid did not start"
                : "Raid room closed",
            }),
          ],
          components: buildLobbyRows(activeRoom, true),
        });
      } catch {}

      if (refunded) {
        await message.channel
          .send({
            content: `↩️ ${userMention(hostId)} raid did not start, so **${raidMode.label}** was refunded.`,
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