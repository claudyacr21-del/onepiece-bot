const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { readPlayers, writePlayers, getPlayer } = require("../playerStore");
const { hydrateCard, findCardTemplate } = require("../utils/evolution");
const {
  getRoom,
  hasActiveRoom,
  createRaidRoom,
  addParticipant,
  startRoom,
  deleteRoom,
} = require("../utils/partyRooms");

const RAID_ROOM_TIMEOUT_MS = 10 * 60 * 1000;
const RAID_MAX_USERS = 10; // including host
const RAID_TICKET_CODE = "raid_ticket";
const RAID_TICKET_NAME = "Raid Ticket";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function findRaidTicketEntry(tickets = []) {
  return ensureArray(tickets).find((entry) => {
    const code = normalize(entry?.code);
    const name = normalize(entry?.name);
    return code === RAID_TICKET_CODE || name === normalize(RAID_TICKET_NAME);
  }) || null;
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
      return cards.find(
        (card) => String(card.instanceId) === String(instanceId) && card.cardRole === "battle"
      ) || null;
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

function getBossNameFromQuery(query) {
  const template = findCardTemplate(query);
  if (template && template.cardRole === "battle") {
    return {
      bossCode: template.code,
      bossName: template.displayName || template.name,
      bossImage: template.image || "",
    };
  }

  const q = normalize(query);
  if (q === "five elders" || q === "five_elders" || q === "five_elders_combined") {
    return {
      bossCode: "five_elders_combined",
      bossName: "Five Elders",
      bossImage: "",
    };
  }

  return null;
}

function buildRaidEmbed(hostName, room, ended = false) {
  const participants = ensureArray(room?.participants);
  const guestCount = participants.filter((p) => String(p.userId) !== String(room.hostId)).length;
  const joinedLines = participants.length
    ? participants.map((p, i) => {
        const cards = ensureArray(p.selectedCards).map((c) => c.name || c.code).join(", ");
        return `${i + 1}. ${p.username} • ${cards || "No card selected"}`;
      })
    : ["None"];

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🤝 Raid Room")
    .setDescription(
      [
        `**Host:** ${hostName}`,
        `**Boss:** ${room.bossName}`,
        `**Status:** ${room.status}`,
        `**Joined Guests:** ${guestCount}/9`,
        `**Host counts in battle:** Yes`,
        `**Raid Ticket Consumed:** ${room.ticketConsumed ? "Yes" : "No"}`,
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
    .setFooter({
      text: ended ? "Raid room closed" : "Join Battle to enter • Host only can Start Raid",
    });
}

function buildRaidRows(room, ended = false) {
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
        .setDisabled(ended),
      new ButtonBuilder()
        .setCustomId(`raid_cancel_${room.roomId}`)
        .setLabel("Cancel Raid")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(ended)
    ),
  ];
}

module.exports = {
  name: "raid",
  aliases: [],

  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) {
      return message.reply("Usage: `op raid <boss>`");
    }

    const host = getPlayer(message.author.id, message.author.username);

    if (hasActiveRoom(message.author.id)) {
      return message.reply("You already have an active raid/party room.");
    }

    const bossInfo = getBossNameFromQuery(query);
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
    const hostId = String(message.author.id);
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
      ticketConsumed: true,
      whitelist,
    });

    const sent = await message.reply({
      embeds: [buildRaidEmbed(message.author.username, room, false)],
      components: buildRaidRows(room, false),
    });

    const collector = sent.createMessageComponentCollector({
      time: RAID_ROOM_TIMEOUT_MS,
    });

    collector.on("collect", async (interaction) => {
      const active = getRoom(message.author.id);
      if (!active || String(active.roomId) !== String(room.roomId)) {
        return interaction.reply({
          content: "This raid room is no longer active.",
          ephemeral: true,
        });
      }

      if (interaction.customId === `raid_cancel_${room.roomId}`) {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: "Only the host can cancel this raid.",
            ephemeral: true,
          });
        }

        deleteRoom(message.author.id);

        await interaction.update({
          embeds: [buildRaidEmbed(message.author.username, room, true)],
          components: buildRaidRows(room, true),
        });

        collector.stop("cancelled");
        return;
      }

      if (interaction.customId === `raid_start_${room.roomId}`) {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: "Only the host can start this raid.",
            ephemeral: true,
          });
        }

        try {
          const started = startRoom(message.author.id);

          await interaction.update({
            embeds: [buildRaidEmbed(message.author.username, started, true)],
            components: buildRaidRows(started, true),
          });

          collector.stop("started");
          return;
        } catch (error) {
          return interaction.reply({
            content: error.message || "Failed to start raid.",
            ephemeral: true,
          });
        }
      }

      if (interaction.customId === `raid_join_${room.roomId}`) {
        const joiningPlayer = getPlayer(interaction.user.id, interaction.user.username);
        const teamCards = getBattleTeamCards(joiningPlayer);

        if (!teamCards.length) {
          return interaction.reply({
            content: "You need at least 1 battle card in your current team to join this raid.",
            ephemeral: true,
          });
        }

        const options = teamCards.slice(0, 3).map((card) =>
          new StringSelectMenuOptionBuilder()
            .setLabel((card.displayName || card.name || "Unknown").slice(0, 100))
            .setDescription(
              `M${card.evolutionStage || 1} • ${card.currentTier || card.rarity || "C"} • Power ${Number(card.currentPower || 0)}`
                .slice(0, 100)
            )
            .setValue(String(card.instanceId))
        );

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`raid_pick_${room.roomId}`)
            .setPlaceholder("Choose 1 battle card")
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options)
        );

        return interaction.reply({
          content: `Pick 1 battle card for raid against ${active.bossName}.`,
          components: [row],
          ephemeral: true,
        });
      }

      if (interaction.customId === `raid_pick_${room.roomId}`) {
        const joiningPlayer = getPlayer(interaction.user.id, interaction.user.username);
        const teamCards = getBattleTeamCards(joiningPlayer);
        const pickedId = interaction.values?.[0];

        const picked = teamCards.find((card) => String(card.instanceId) === String(pickedId));
        if (!picked) {
          return interaction.update({
            content: "Selected card not found in your current team.",
            components: [],
          });
        }

        try {
          const updated = addParticipant(message.author.id, {
            userId: String(interaction.user.id),
            username: interaction.user.username,
            selectedCards: [toRoomCard(picked)],
          });

          await interaction.update({
            content: `Joined raid with ${picked.displayName || picked.name}.`,
            components: [],
          });

          await sent.edit({
            embeds: [buildRaidEmbed(message.author.username, updated, false)],
            components: buildRaidRows(updated, false),
          });

          return;
        } catch (error) {
          return interaction.update({
            content: error.message || "Failed to join raid.",
            components: [],
          });
        }
      }
    });

    collector.on("end", async () => {
      const active = getRoom(message.author.id);
      const endedRoom = active && String(active.roomId) === String(room.roomId) ? active : room;

      try {
        await sent.edit({
          embeds: [buildRaidEmbed(message.author.username, endedRoom, true)],
          components: buildRaidRows(endedRoom, true),
        });
      } catch (_) {}
    });
  },
};