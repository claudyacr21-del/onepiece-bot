const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { readPlayers, writePlayers, getPlayer } = require("../playerStore");
const { hydrateCard, findCardTemplate } = require("../utils/evolution");
const {
  getRoom,
  hasActiveRoom,
  createRaidRoom,
  addParticipant,
  startRoom,
} = require("../utils/partyRooms");
const raidBossImages = require("../config/raidBossImages");

const RAID_ROOM_TIMEOUT_MS = 10 * 60 * 1000;
const RAID_PICK_TIMEOUT_MS = 60 * 1000;
const RAID_TICKET_CODE = "raid_ticket";
const RAID_TICKET_NAME = "Raid Ticket";

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
  return `${"🟩".repeat(filled)}${"⬛".repeat(empty)}`;
}

function tierWeight(tier) {
  return (
    {
      C: 1,
      B: 2,
      A: 3,
      S: 4,
      SS: 5,
      UR: 6,
    }[String(tier || "").toUpperCase()] || 2
  );
}

function findRaidTicketEntry(tickets = []) {
  return (
    ensureArray(tickets).find((entry) => {
      const code = normalize(entry?.code);
      const name = normalize(entry?.name);
      return code === RAID_TICKET_CODE || name === normalize(RAID_TICKET_NAME);
    }) || null
  );
}

function consumeOneRaidTicket(player) {
  const tickets = ensureArray(player?.tickets).map((t) => ({ ...t }));
  const idx = tickets.findIndex((entry) => {
    const code = normalize(entry?.code);
    const name = normalize(entry?.name);
    return code === RAID_TICKET_CODE || name === normalize(RAID_TICKET_NAME);
  });

  if (idx === -1) {
    return { ok: false, tickets: ensureArray(player?.tickets) };
  }

  const current = Number(tickets[idx].amount || 0);
  if (current <= 0) {
    return { ok: false, tickets: ensureArray(player?.tickets) };
  }

  if (current === 1) {
    tickets.splice(idx, 1);
  } else {
    tickets[idx].amount = current - 1;
  }

  return { ok: true, tickets };
}

function getSavedRaidTeam(player) {
  return ensureArray(player?.raidTeam?.members)
    .map((id) => String(id))
    .filter(Boolean);
}

function getBattleTeamCards(player) {
  const cards = ensureArray(player?.cards).map(hydrateCard).filter(Boolean);
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
    atk: Number(synced.atk || 0),
    hp: Number(synced.hp || 0),
    speed: Number(synced.speed || 0),
    currentPower: Number(synced.currentPower || 0),
    currentTier: String(synced.currentTier || synced.rarity || ""),
    evolutionStage: Number(synced.evolutionStage || 1),
    image: String(synced.image || ""),
    cardRole: String(synced.cardRole || "battle"),
  };
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

function buildLobbyEmbed(hostName, room, ended = false, bossStats = null) {
  const participants = ensureArray(room?.participants);

  const joinedLines = participants.length
    ? participants.map((p, i) => {
        const picked = ensureArray(p.selectedCards)
          .map((c) => c.name || c.code)
          .join(", ");
        return `${i + 1}. ${p.username} • ${picked || "No card selected"}`;
      })
    : ["None"];

  const bossStatLine = bossStats
    ? `❤️ ${Number(bossStats.maxHp || bossStats.hp || 0)}/${Number(
        bossStats.maxHp || bossStats.hp || 0
      )} | 👟 ${Number(bossStats.speed || 0)} | ⚔️ ${Number(
        bossStats.atkMin || 0
      )}-${Number(bossStats.atkMax || 0)}`
    : "Not loaded";

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("🤝 Raid Room")
    .setDescription(
      [
        `**Host:** ${hostName}`,
        `**Boss:** ${room.bossName}`,
        `**Status:** ${room.status || "waiting"}`,
        `**Raid Ticket Consumed:** ${room.ticketConsumed ? "Yes" : "No"}`,
        "",
        "**Boss Stats**",
        bossStatLine,
        "",
        "**Joined Participants**",
        ...joinedLines,
        "",
        "Rules:",
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

  for (let i = 0; i < 3; i++) {
    const card = cards[i];
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(card ? `raid_pick_${roomId}_${card.instanceId}` : `raid_pick_${roomId}_empty_${i}`)
        .setLabel(card ? `${i + 1} ${card.displayName || card.name}`.slice(0, 80) : `Empty Slot ${i + 1}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!card)
    );
  }

  return [row];
}

function deriveRaidBossStats(template) {
  const hydrated = hydrateCard(template);
  const tier = String(
    hydrated.currentTier ||
      hydrated.rarity ||
      hydrated.baseTier ||
      "B"
  ).toUpperCase();

  const rarityScale =
    {
      C: 10,
      B: 12,
      A: 15,
      S: 18,
      SS: 23,
      UR: 30,
    }[tier] || 12;

  const baseAtk = Number(hydrated.atk || hydrated.baseAtk || 250);
  const baseHp = Number(hydrated.hp || hydrated.baseHp || 1500);
  const baseSpd = Number(hydrated.speed || hydrated.baseSpeed || 150);
  const basePower = Number(
    hydrated.powerCaps?.M3 || hydrated.currentPower || hydrated.basePower || 0
  );

  const maxHp = Math.floor(
    Math.max(baseHp * rarityScale * 8, basePower * 18, 35000)
  );
  const speed = Math.floor(
    Math.max(baseSpd * (rarityScale / 2.2), basePower * 0.55, 1800)
  );
  const atkMin = Math.floor(
    Math.max(baseAtk * (rarityScale / 2.8), basePower * 0.18, 650)
  );
  const atkMax = Math.floor(
    Math.max(baseAtk * (rarityScale / 1.4), basePower * 0.34, 1800)
  );

  return {
    code: hydrated.code,
    name: hydrated.displayName || hydrated.name || "Unknown Boss",
    tier,
    maxHp,
    hp: maxHp,
    speed,
    atkMin,
    atkMax,
    image: getRaidBossImage(hydrated.code),
  };
}

function buildBattleRoster(room) {
  const participants = ensureArray(room?.participants);

  return participants
    .flatMap((p) =>
      ensureArray(p.selectedCards).map((card) => ({
        userId: String(p.userId),
        username: String(p.username || "Unknown"),
        instanceId: String(card.instanceId || ""),
        code: String(card.code || ""),
        name: String(card.name || card.code || "Unknown"),
        atk: Number(card.atk || 0),
        maxHp: Number(card.hp || 1),
        hp: Number(card.hp || 1),
        speed: Number(card.speed || 0),
        currentPower: Number(card.currentPower || 0),
        currentTier: String(card.currentTier || ""),
        evolutionStage: Number(card.evolutionStage || 1),
        alive: true,
      }))
    )
    .sort((a, b) => {
      const spd = Number(b.speed || 0) - Number(a.speed || 0);
      if (spd !== 0) return spd;
      return Number(b.currentPower || 0) - Number(a.currentPower || 0);
    });
}

function buildBattleState(room, bossTemplate) {
  return {
    roomId: room.roomId,
    hostId: room.hostId,
    hostName: room.hostName,
    boss: deriveRaidBossStats(bossTemplate),
    members: buildBattleRoster(room),
    round: 1,
    log: ["Raid battle started."],
    finished: false,
    winner: null,
  };
}

function pushBattleLog(state, line) {
  state.log.push(line);
  if (state.log.length > 8) {
    state.log = state.log.slice(state.log.length - 8);
  }
}

function getAliveMembers(state) {
  return state.members.filter((m) => Number(m.hp || 0) > 0);
}

function buildBattleEmbed(state) {
  const boss = state.boss;
  const alive = getAliveMembers(state);

  const raidLines = state.members.length
    ? state.members.map((m, i) => {
        const isDead = Number(m.hp || 0) <= 0;
        const label = isDead ? "☠️" : "❤️";
        return [
          `**${i + 1}. ${m.name}** • ${m.username}`,
          `${label} ${Math.max(0, Number(m.hp || 0))}/${Number(m.maxHp || 0)} | 👟 ${Number(
            m.speed || 0
          )} | ⚔️ ${Math.floor(Number(m.atk || 0) * 0.85)}-${Math.floor(Number(m.atk || 0) * 1.15)}`,
        ].join("\n");
      })
    : ["None"];

  const statusText = state.finished
    ? state.winner === "players"
      ? "Raid Cleared!"
      : "Raid Failed!"
    : "Selection Phase\nSelect a character to deploy for battle!";

  return new EmbedBuilder()
    .setColor(state.finished ? (state.winner === "players" ? 0x2ecc71 : 0xe74c3c) : 0xe67e22)
    .setTitle(`${boss.name}'s Boss Battle`)
    .setDescription(statusText)
    .addFields(
      {
        name: "Boss",
        value: [
          `${makeHpBar(boss.hp, boss.maxHp)}`,
          `❤️ ${Math.max(0, boss.hp)}/${boss.maxHp} | 👟 ${boss.speed} | ⚔️ ${boss.atkMin}-${boss.atkMax}`,
        ].join("\n"),
      },
      {
        name: `Raid Team (${alive.length}/${state.members.length} alive)`,
        value: raidLines.join("\n\n").slice(0, 1024),
      },
      {
        name: "Battle Log",
        value: state.log.length ? state.log.map((x) => `• ${x}`).join("\n").slice(0, 1024) : "No actions yet.",
      }
    )
    .setImage(boss.image || null)
    .setFooter({
      text: state.finished
        ? state.winner === "players"
          ? "Raid complete"
          : "Raid failed"
        : `Round ${state.round} • Choose 1 card to attack`,
    });
}

function buildBattleRows(state) {
  if (state.finished) return [];

  const alive = getAliveMembers(state);
  const rows = [];
  let chunk = [];

  for (let i = 0; i < alive.length; i++) {
    chunk.push(alive[i]);

    if (chunk.length === 5 || i === alive.length - 1) {
      const row = new ActionRowBuilder();

      for (const member of chunk) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`raid_act_${state.roomId}_${member.instanceId}`)
            .setLabel(`${state.members.indexOf(member) + 1} ${member.name}`.slice(0, 80))
            .setStyle(ButtonStyle.Success)
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
  if (state.boss.hp <= 0) {
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

module.exports = {
  name: "raid",
  aliases: [],

  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: `op raid <boss>`");

    const hostId = String(message.author.id);
    const host = getPlayer(hostId, message.author.username);

    if (hasActiveRoom(hostId)) {
      return message.reply("You already have an active raid/party room.");
    }

    const bossInfo = resolveRaidBoss(query);
    if (!bossInfo) {
      return message.reply("Raid boss not found.");
    }

    const ticketEntry = findRaidTicketEntry(host.tickets);
    if (!ticketEntry || Number(ticketEntry.amount || 0) <= 0) {
      return message.reply("You do not have any Raid Ticket.");
    }

    const consumed = consumeOneRaidTicket(host);
    if (!consumed.ok) {
      return message.reply("Failed to consume Raid Ticket.");
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
    let battleCollector = null;

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
            content: "You need at least 1 battle card in your current team to join this raid.",
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
            filter: (i) =>
              i.user.id === interaction.user.id &&
              String(i.customId).startsWith(`raid_pick_${room.roomId}_`),
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
            embeds: [buildLobbyEmbed(message.author.username, updatedRoom, false, bossPreviewStats)],
            components: buildLobbyRows(updatedRoom, false),
          });

          await message.channel.send(
            `${interaction.user.username} joined the raid with **${picked.displayName || picked.name}**.`
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

        const joinedCount = ensureArray(startedRoom.participants).length;
        if (joinedCount < 1) {
          return interaction.reply({
            content: "No participants have joined yet.",
            ephemeral: true,
          });
        }

        const battleState = buildBattleState(startedRoom, bossInfo.template);

        await interaction.update({
          embeds: [buildLobbyEmbed(message.author.username, startedRoom, true, bossPreviewStats)],
          components: buildLobbyRows(startedRoom, true),
        });

        battleMessage = await message.channel.send({
          embeds: [buildBattleEmbed(battleState)],
          components: buildBattleRows(battleState),
        });

        battleCollector = battleMessage.createMessageComponentCollector({
          time: RAID_ROOM_TIMEOUT_MS,
        });

        battleCollector.on("collect", async (btn) => {
          if (!String(btn.customId).startsWith(`raid_act_${battleState.roomId}_`)) {
            return;
          }

          const instanceId = String(btn.customId).replace(
            `raid_act_${battleState.roomId}_`,
            ""
          );

          const actor = battleState.members.find(
            (m) => String(m.instanceId) === instanceId
          );

          if (!actor || Number(actor.hp || 0) <= 0) {
            return btn.reply({
              content: "That card can no longer act.",
              ephemeral: true,
            });
          }

          const canControl =
            String(btn.user.id) === String(actor.userId) ||
            String(btn.user.id) === hostId;

          if (!canControl) {
            return btn.reply({
              content: "You can only use your own raid card.",
              ephemeral: true,
            });
          }

          const damage = randomInt(
            Math.floor(Number(actor.atk || 0) * 0.85),
            Math.floor(Number(actor.atk || 0) * 1.15)
          );

          battleState.boss.hp = Math.max(0, battleState.boss.hp - damage);
          pushBattleLog(
            battleState,
            `${actor.username} used ${actor.name} and dealt ${damage} damage.`
          );

          if (!checkEndState(battleState)) {
            const target = chooseBossTarget(battleState);

            if (target) {
              const bossDamage = randomInt(
                Number(battleState.boss.atkMin || 0),
                Number(battleState.boss.atkMax || 0)
              );

              target.hp = Math.max(0, Number(target.hp || 0) - bossDamage);

              pushBattleLog(
                battleState,
                `${battleState.boss.name} hit ${target.name} (${target.username}) for ${bossDamage} damage.`
              );

              if (target.hp <= 0) {
                pushBattleLog(
                  battleState,
                  `${target.name} (${target.username}) has been defeated.`
                );
              }
            }

            checkEndState(battleState);
          }

          if (!battleState.finished) {
            battleState.round += 1;
          } else if (battleState.winner === "players") {
            pushBattleLog(battleState, "Raid cleared.");
          } else {
            pushBattleLog(battleState, "All raid members have been defeated.");
          }

          await btn.update({
            embeds: [buildBattleEmbed(battleState)],
            components: buildBattleRows(battleState),
          });

          if (battleState.finished) {
            battleCollector.stop("finished");
          }
        });

        battleCollector.on("end", async () => {
          if (!battleMessage) return;
          try {
            await battleMessage.edit({
              embeds: battleMessage.embeds?.length
                ? battleMessage.embeds
                : undefined,
              components: [],
            });
          } catch {}
        });

        lobbyCollector.stop("started");
      }
    });

    lobbyCollector.on("end", async () => {
      try {
        if (!battleMessage) {
          const activeRoom = getRoom(hostId) || room;
          await lobbyMessage.edit({
            embeds: [buildLobbyEmbed(message.author.username, activeRoom, true, bossPreviewStats)],
            components: buildLobbyRows(activeRoom, true),
          });
        }
      } catch {}
    });
  },
};