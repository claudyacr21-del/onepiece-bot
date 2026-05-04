const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { readPlayers, writePlayers, getPlayer } = require("../playerStore");
const { hydrateCard, findCardTemplate } = require("../utils/evolution");
const {
  getPlayerCombatCards,
  getPlayerCombatBoosts,
  applyDamageBoost,
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

const RAID_ROOM_TIMEOUT_MS = 10 * 60 * 1000;
const RAID_PICK_TIMEOUT_MS = 60 * 1000;
const MAX_BATTLE_LOG_LINES = 2;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
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

function getRaidModeConfig(commandName) {
  const cmd = String(commandName || "").toLowerCase();

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

function getSavedRaidTeam(player) {
  return ensureArray(player?.raidTeam?.members)
    .map((id) => String(id))
    .filter(Boolean);
}

function getBattleTeamCards(player) {
  const cards = getPlayerCombatCards(player).filter(
    (card) => String(card.cardRole || "").toLowerCase() === "battle"
  );

  const slots = Array.isArray(player?.team?.slots)
    ? player.team.slots.slice(0, 3)
    : [];

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
  const cards = getPlayerCombatCards(player).filter(
    (card) => String(card.cardRole || "").toLowerCase() === "battle"
  );

  const byInstance = cards.find(
    (card) =>
      String(card.instanceId) === String(picked?.instanceId || "") &&
      String(card.cardRole || "").toLowerCase() === "battle"
  );

  if (byInstance) return byInstance;

  const byCode = cards.find(
    (card) =>
      String(card.code || "").toLowerCase() ===
        String(picked?.code || "").toLowerCase() &&
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

        return {
          userId: String(participant.userId),
          username: String(participant.username || "Unknown"),
          instanceId: String(fresh.instanceId || ""),
          code: String(fresh.code || ""),
          name: String(fresh.displayName || fresh.name || picked?.name || "Unknown"),
          atk: Number(fresh.atk || 0),
          maxHp: Number(fresh.hp || 1),
          hp: Number(fresh.hp || 1),
          speed: Number(fresh.speed || 0),
          currentPower: Number(fresh.currentPower || 0),
          currentTier: String(fresh.currentTier || fresh.rarity || ""),
          evolutionStage: Number(fresh.evolutionStage || 1),
          image: String(fresh.image || ""),
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
    .sort((a, b) => {
      const speedDiff = Number(b.speed || 0) - Number(a.speed || 0);
      if (speedDiff !== 0) return speedDiff;

      return Number(b.currentPower || 0) - Number(a.currentPower || 0);
    });
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

function deriveRaidBossStats(template) {
  const hydrated = hydrateCard(template);
  const tier = String(hydrated.rarity || hydrated.currentTier || "B").toUpperCase();

  const profile =
    {
      C: {
        hp: 9000,
        speed: 180,
        atkMin: 180,
        atkMax: 360,
      },
      B: {
        hp: 12500,
        speed: 240,
        atkMin: 260,
        atkMax: 520,
      },
      A: {
        hp: 17500,
        speed: 340,
        atkMin: 380,
        atkMax: 760,
      },
      S: {
        hp: 24000,
        speed: 460,
        atkMin: 520,
        atkMax: 1020,
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

  const maxHp = Math.floor(profile.hp + baseHp * 2.8 + basePower * 1.2);
  const speed = Math.floor(profile.speed + baseSpeed * 0.9);
  const atkMin = Math.floor(profile.atkMin + baseAtk * 0.8 + basePower * 0.025);
  const atkMax = Math.floor(profile.atkMax + baseAtk * 1.2 + basePower * 0.05);

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
        "• Max 10 users total including host",
        "• Each user joins with 1 battle card",
        "• The same character code cannot be used twice in the same raid",
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

function buildBattleState(room, bossTemplate) {
  const members = buildBattleRoster(room);

  return {
    roomId: room.roomId,
    hostId: room.hostId,
    hostName: room.hostName,
    members,
    boss: {
      ...deriveRaidBossStats(bossTemplate),
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
    usedThisCycle: [],
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

function getMemberActionKey(member) {
  return `${String(member?.userId || "")}:${String(member?.instanceId || "")}`;
}

function isMemberUsedThisCycle(state, member) {
  return ensureArray(state.usedThisCycle).includes(getMemberActionKey(member));
}

function getAliveMemberIds(state) {
  return getAliveMembers(state).map((member) => getMemberActionKey(member));
}

function resetActionCycleIfReady(state) {
  const aliveIds = getAliveMemberIds(state);

  if (!aliveIds.length) return;

  const usedAliveIds = ensureArray(state.usedThisCycle).filter((id) =>
    aliveIds.includes(String(id))
  );

  if (usedAliveIds.length >= aliveIds.length) {
    state.usedThisCycle = [];
    state.round = Number(state.round || 1) + 1;
  }
}

function buildBattleEmbed(state) {
  const boss = state.boss;
  const alive = getAliveMembers(state);

  const raidLines = ensureArray(state.members).length
    ? state.members.map((member, index) => {
        const isDead = Number(member.hp || 0) <= 0;
        const hpIcon = isDead ? "☠️" : "❤️";
        const alreadyUsed = isMemberUsedThisCycle(state, member);
        const status = isDead ? "DEFEATED" : alreadyUsed ? "USED" : "READY";

        return [
          `**${index + 1}. ${member.name}** • ${member.username}`,
          `${hpIcon} ${Math.max(0, Number(member.hp || 0))}/${Number(
            member.maxHp || 0
          )} | SPD ${Number(member.speed || 0)} | ATK ${formatAtkRange(
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
      text: `Round ${state.round} • Used cards are disabled until other alive cards act`,
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
          )} • ${status}`,
        ].join("\n");
      })
    : ["None"];

  return new EmbedBuilder()
    .setColor(playersWon ? 0x2ecc71 : 0xe74c3c)
    .setTitle(playersWon ? "Raid Victory" : "Raid Defeat")
    .setDescription(
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
                  ? `• ${reward.username}: **${reward.cardName}** not owned, prestige not added.`
                  : `• ${reward.username}'s **${reward.cardName}**: ${reward.before}/200 → ${reward.after}/200`
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
    chunk.push({ member: state.members[index], index });

    if (chunk.length === 5 || index === state.members.length - 1) {
      const row = new ActionRowBuilder();

      for (const item of chunk) {
        const member = item.member;
        const memberIndex = item.index;
        const isDead = Number(member.hp || 0) <= 0;
        const alreadyUsed = isMemberUsedThisCycle(state, member);

        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`raid_act_${state.roomId}_${memberIndex}`)
            .setLabel(`${memberIndex + 1} ${member.name}`.slice(0, 80))
            .setStyle(
              isDead || alreadyUsed ? ButtonStyle.Secondary : ButtonStyle.Success
            )
            .setDisabled(Boolean(isDead || alreadyUsed))
        );
      }

      rows.push(row);
      chunk = [];
    }
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

function getRaidRewardConfig(tier) {
  const key = String(tier || "C").toUpperCase();

  const configs = {
    C: {
      berries: [1200, 2000],
      gems: [1, 1],
      fragments: 1,
      weaponChance: 7,
      fruitChance: 3,
    },
    B: {
      berries: [2500, 4000],
      gems: [1, 2],
      fragments: 1,
      weaponChance: 7,
      fruitChance: 3,
    },
    A: {
      berries: [6000, 9000],
      gems: [2, 4],
      fragments: 1,
      weaponChance: 7,
      fruitChance: 3,
    },
    S: {
      berries: [12000, 18000],
      gems: [4, 7],
      fragments: 1,
      weaponChance: 7,
      fruitChance: 3,
    },
  };

  return configs[key] || configs.C;
}

function findLinkedRaidItem(db, boss) {
  const list = flattenDb(db);
  const bossCode = normalizeText(boss?.code || boss?.bossCode || "");
  const bossName = normalizeText(boss?.name || boss?.bossName || "");

  return (
    list.find(
      (item) =>
        normalizeText(item.ownerCode || item.owner || item.cardCode) === bossCode
    ) ||
    list.find(
      (item) =>
        normalizeText(item.ownerName || item.owner || item.cardName) === bossName
    ) ||
    list.find((item) => bossCode && normalizeText(item.code || "").includes(bossCode)) ||
    list.find((item) => bossName && normalizeText(item.name || "").includes(bossName)) ||
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

function addRaidWeapon(weapons, weapon) {
  return addAmountEntry(
    weapons,
    {
      code: weapon.code,
      name: weapon.name,
      rarity: weapon.rarity || "C",
      image: weapon.image || "",
      upgradeLevel: 0,
    },
    1
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
  const players = readPlayers();
  const boss = state.boss || {};
  const bossTier = String(
    boss.rarity || boss.currentTier || boss.tier || "C"
  ).toUpperCase();
  const config = getRaidRewardConfig(bossTier);

  const linkedWeapon = findLinkedRaidItem(weaponsDb, boss);
  const linkedFruit = findLinkedRaidItem(devilFruitsDb, boss);

  const rewards = [];

  for (const member of ensureArray(state.members)) {
    const userId = String(member.userId || "");
    const player = players[userId];

    if (!player) continue;

    const berries = randomInt(config.berries[0], config.berries[1]);
    const gems = randomInt(config.gems[0], config.gems[1]);
    const fragments = config.fragments;
    const gotWeapon = Boolean(linkedWeapon && randomChance(config.weaponChance));
    const gotFruit = Boolean(linkedFruit && randomChance(config.fruitChance));

    players[userId] = {
      ...player,
      berries: Number(player.berries || 0) + berries,
      gems: Number(player.gems || 0) + gems,
      fragments: addRaidBossFragment(player.fragments, boss, fragments),
      weapons: gotWeapon ? addRaidWeapon(player.weapons, linkedWeapon) : player.weapons,
      devilFruits: gotFruit
        ? addRaidFruit(player.devilFruits, linkedFruit)
        : player.devilFruits,
    };

    rewards.push({
      userId,
      username: member.username || player.username || "Unknown",
      berries,
      gems,
      fragments,
      bossName: boss.name || boss.bossName || "Raid Boss",
      weapon: gotWeapon ? linkedWeapon.name : null,
      fruit: gotFruit ? linkedFruit.name : null,
    });
  }

  writePlayers(players);
  return rewards;
}

function formatRaidWinRewardLines(state) {
  const rewards = ensureArray(state.winRewards);

  if (!rewards.length) {
    return ["• Reward data was not found."];
  }

  return rewards.map((reward) => {
    const extras = [];

    if (reward.weapon) extras.push(`⚔️ ${reward.weapon}`);
    if (reward.fruit) extras.push(`🍈 ${reward.fruit}`);

    return [
      `• **${reward.username}**`,
      `+${Number(reward.berries || 0).toLocaleString("en-US")} berries`,
      `+${Number(reward.gems || 0).toLocaleString("en-US")} gems`,
      `+${Number(reward.fragments || 0)} ${reward.bossName} fragment`,
      extras.length ? `Bonus: ${extras.join(" • ")}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  });
}

function addRaidPrestigeToWinnerCards(state) {
  const players = readPlayers();
  const rewards = [];
  const boss = state.boss || {};
  const bossCode = String(boss.code || boss.bossCode || "").toLowerCase();
  const bossName = String(boss.name || boss.bossName || "").toLowerCase();

  for (const member of ensureArray(state.members)) {
    const userId = String(member.userId || "");
    const player = players[userId];

    if (!player) continue;

    const cards = ensureArray(player.cards).map((card) => ({ ...card }));

    const index = cards.findIndex((card) => {
      const cardCode = String(card.code || "").toLowerCase();
      const cardName = String(card.displayName || card.name || "").toLowerCase();

      return (
        (bossCode && cardCode === bossCode) ||
        (bossName && cardName === bossName)
      );
    });

    if (index === -1) {
      rewards.push({
        userId,
        username: member.username || player.username || "Unknown",
        cardName: boss.name || boss.bossName || "Raid Boss",
        before: 0,
        after: 0,
        missing: true,
      });

      continue;
    }

    const before = Math.max(
      0,
      Math.min(200, Number(cards[index].raidPrestige || 0))
    );
    const after = Math.min(200, before + 1);

    cards[index].raidPrestige = after;

    players[userId] = {
      ...player,
      cards,
    };

    rewards.push({
      userId,
      username: member.username || player.username || "Unknown",
      cardName:
        cards[index].displayName ||
        cards[index].name ||
        boss.name ||
        "Raid Boss",
      before,
      after,
      capped: after >= 200,
      missing: false,
    });
  }

  writePlayers(players);
  return rewards;
}

function finalizeRaidBattle(state) {
  if (state.winner === "players") {
    const winRewards = giveRaidWinRewards(state);
    const prestigeRewards = addRaidPrestigeToWinnerCards(state);

    state.winRewards = winRewards;
    state.prestigeRewards = prestigeRewards;

    pushBattleLog(state, "Raid cleared.");
    pushBattleLog(state, "Rewards and prestige were given.");
  } else {
    pushBattleLog(state, "All raid members were defeated.");
  }
}

function handleRaidAttack(state, actor) {
  const boss = state.boss;
  const combatLogs = [];

  const baseDamage = randomInt(
    Math.floor(Number(actor.atk || 1) * 0.85),
    Math.floor(Number(actor.atk || 1) * 1.15)
  );

  const damage = applyDamageBoost(baseDamage, actor.passiveBoostsApplied || {});
  boss.hp = Math.max(0, Number(boss.hp || 0) - damage);

  combatLogs.push(
    `⚔️ ${actor.name} dealt ${damage.toLocaleString("en-US")} damage to ${boss.name}.`
  );

  state.usedThisCycle = [
    ...new Set([...ensureArray(state.usedThisCycle), getMemberActionKey(actor)]),
  ];

  if (checkEndState(state)) {
    state.log = combatLogs.slice(-MAX_BATTLE_LOG_LINES);
    return;
  }

  const target = chooseBossTarget(state);

  if (target) {
    const bossDamage = randomInt(boss.atkMin, boss.atkMax);
    target.hp = Math.max(0, Number(target.hp || 0) - bossDamage);

    combatLogs.push(
      `💢 ${boss.name} hit ${target.name} for ${bossDamage.toLocaleString("en-US")}.`
    );
  }

  state.log = combatLogs.slice(-MAX_BATTLE_LOG_LINES);

  checkEndState(state);

  if (!state.finished) {
    resetActionCycleIfReady(state);
  }
}

module.exports = {
  name: "raid",
  aliases: ["craid", "graid"],

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply(
        "Usage: `op craid <boss>` / `op raid <boss>` / `op graid <boss>`"
      );
    }

    const raw = String(message.content || "").trim().split(/\s+/);
    const usedCommandRaw = String(raw[1] || "").toLowerCase();
    const usedCommand = ["craid", "raid", "graid"].includes(usedCommandRaw)
      ? usedCommandRaw
      : "raid";
    const raidMode = getRaidModeConfig(usedCommand);

    const hostId = String(message.author.id);
    const host = getPlayer(hostId, message.author.username);

    if (hasActiveRoom(hostId)) {
      return message.reply("You already have an active raid/party room.");
    }

    const bossInfo = resolveRaidBoss(query);

    if (!bossInfo) {
      return message.reply("Raid boss not found.");
    }

    const bossTier = String(
      bossInfo?.template?.rarity || bossInfo?.template?.currentTier || "B"
    ).toUpperCase();

    if (!raidMode.allowed.has(bossTier)) {
      if (usedCommand === "craid") {
        return message.reply("craid only supports C and B battle card raid bosses.");
      }

      if (usedCommand === "graid") {
        return message.reply("graid only supports S battle card raid bosses.");
      }

      return message.reply("raid only supports A battle card raid bosses.");
    }

    const ticketEntry = findTicketEntry(host.tickets, raidMode);

    if (!ticketEntry || Number(ticketEntry.amount || 0) <= 0) {
      return message.reply(`You do not have any ${raidMode.label}.`);
    }

    const consumed = consumeOneTicket(host, raidMode);

    if (!consumed.ok) {
      return message.reply(`Failed to consume ${raidMode.label}.`);
    }

    const players = readPlayers();

    players[hostId] = {
      ...players[hostId],
      tickets: consumed.tickets,
    };

    writePlayers(players);

    const whitelist = getSavedRaidTeam(host);

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
    });

    const bossPreviewStats = deriveRaidBossStats(bossInfo.template);

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
        return interaction.reply({
          content: "This raid room is no longer active.",
          ephemeral: true,
        });
      }

      if (interaction.customId === `raid_join_${room.roomId}`) {
        const userId = String(interaction.user.id);
        const isHost = userId === hostId;
        const whitelistIds = ensureArray(activeRoom.whitelist).map(String);

        if (!isHost && !whitelistIds.includes(userId)) {
          return interaction.reply({
            content: "You are not in the host's saved raid team.",
            ephemeral: true,
          });
        }

        const joiningPlayer = getPlayer(userId, interaction.user.username);
        const teamCards = getBattleTeamCards(joiningPlayer);

        if (!teamCards.length) {
          return interaction.reply({
            content:
              "You need at least 1 battle card in your current team to join this raid.",
            ephemeral: true,
          });
        }

        await interaction.reply({
          content: `Pick 1 battle card for raid against ${activeRoom.bossName}.`,
          components: buildPickRows(room.roomId, teamCards),
          ephemeral: true,
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
          return pickInteraction.update({
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

          await pickInteraction.update({
            content: `Joined raid with ${picked.displayName || picked.name}.`,
            components: [],
          });

          await lobbyMessage.edit({
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

          await message.channel.send(
            `${interaction.user.username} joined the raid with **${
              picked.displayName || picked.name
            }**.`
          );
        } catch (error) {
          return pickInteraction.update({
            content: error.message || "Failed to join raid.",
            components: [],
          });
        }

        return;
      }

      if (interaction.customId === `raid_start_${room.roomId}`) {
        if (String(interaction.user.id) !== hostId) {
          return interaction.reply({
            content: "Only the host can start this raid.",
            ephemeral: true,
          });
        }

        let startedRoom;

        try {
          startedRoom = startRoom(hostId);
        } catch (error) {
          return interaction.reply({
            content: error.message || "Failed to start raid.",
            ephemeral: true,
          });
        }

        const joinedCount = ensureArray(startedRoom.participants).filter(
          (participant) => ensureArray(participant.selectedCards).length > 0
        ).length;

        if (joinedCount < 1) {
          return interaction.reply({
            content: "No participants have joined yet.",
            ephemeral: true,
          });
        }

        const battleState = buildBattleState(startedRoom, bossInfo.template);

        if (!battleState.members.length) {
          try {
            deleteRoom(hostId);
          } catch {}

          return interaction.reply({
            content:
              "Failed to sync raid participants from latest card data.\nPlease re-open raid and join again.",
            ephemeral: true,
          });
        }

        const invalidMember = battleState.members.find(
          (member) => Number(member.atk || 0) <= 0 || Number(member.maxHp || 0) <= 1
        );

        if (invalidMember) {
          try {
            deleteRoom(hostId);
          } catch {}

          return interaction.reply({
            content:
              "A raid card failed to sync correctly.\nPlease re-open raid and join again.",
            ephemeral: true,
          });
        }

        await interaction.update({
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

        battleMessage = await message.channel.send({
          embeds: [buildBattleEmbed(battleState)],
          components: buildBattleRows(battleState),
        });

        const battleCollector = battleMessage.createMessageComponentCollector({
          time: RAID_ROOM_TIMEOUT_MS,
        });

        battleCollector.on("collect", async (button) => {
          if (
            !String(button.customId).startsWith(`raid_act_${battleState.roomId}_`)
          ) {
            return;
          }

          const memberIndex = Number(
            String(button.customId).replace(`raid_act_${battleState.roomId}_`, "")
          );

          const actor = battleState.members[memberIndex];

          if (!actor || Number(actor.hp || 0) <= 0) {
            return button.reply({
              content: "That card can no longer act.",
              ephemeral: true,
            });
          }

          if (String(button.user.id) !== hostId) {
            return button.reply({
              content: "Only the raid host can control this raid battle.",
              ephemeral: true,
            });
          } 

          if (isMemberUsedThisCycle(battleState, actor)) {
            return button.reply({
              content:
                "This raid card already acted. Choose another ready card first.",
              ephemeral: true,
            });
          }

          handleRaidAttack(battleState, actor);

          if (battleState.finished) {
            finalizeRaidBattle(battleState);

            try {
              deleteRoom(hostId);
            } catch {}

            battleCollector.stop("finished");

            return button.update({
              embeds: [buildResultEmbed(battleState)],
              components: [],
            });
          }

          return button.update({
            embeds: [buildBattleEmbed(battleState)],
            components: buildBattleRows(battleState),
          });
        });

        battleCollector.on("end", async (_, reason) => {
          if (reason === "finished") return;

          if (battleState.finished) return;

          battleState.finished = true;
          battleState.winner = "timeout";
          pushBattleLog(battleState, "Raid timed out.");

          try {
            deleteRoom(hostId);
          } catch {}

          try {
            await battleMessage.edit({
              embeds: [buildResultEmbed(battleState)],
              components: [],
            });
          } catch {}
        });
      }
    });

    lobbyCollector.on("end", async () => {
      const activeRoom = getRoom(hostId);

      if (!activeRoom || String(activeRoom.roomId) !== String(room.roomId)) return;
      if (battleMessage) return;

      try {
        deleteRoom(hostId);
      } catch {}

      try {
        await lobbyMessage.edit({
          embeds: [buildLobbyEmbed(message.author.username, activeRoom, true, bossPreviewStats)],
          components: buildLobbyRows(activeRoom, true),
        });
      } catch {}
    });
  },
};