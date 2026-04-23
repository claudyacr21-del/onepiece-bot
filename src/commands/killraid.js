const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getRoom, deleteRoom } = require("../utils/partyRooms");

module.exports = {
  name: "killraid",
  aliases: ["clearraid", "endraid"],

  async execute(message) {
    const hostId = String(message.author.id);
    const room = getRoom(hostId);

    if (!room) {
      return message.reply("You do not have any active raid room.");
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`killraid_confirm_${hostId}`)
        .setLabel("Kill Raid")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`killraid_cancel_${hostId}`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Success)
    );

    const sent = await message.reply({
      content: "Are you sure you want to kill the raid? Your raid ticket WILL NOT be returned.",
      components: [row],
    });

    const collector = sent.createMessageComponentCollector({
      time: 60_000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== hostId) {
        return interaction.reply({
          content: "Only the raid host can use these buttons.",
          ephemeral: true,
        });
      }

      if (interaction.customId === `killraid_cancel_${hostId}`) {
        collector.stop("cancelled");
        return interaction.update({
          content: "Kill raid cancelled.",
          components: [],
        });
      }

      if (interaction.customId === `killraid_confirm_${hostId}`) {
        const activeRoom = getRoom(hostId);

        if (!activeRoom) {
          collector.stop("missing");
          return interaction.update({
            content: "You do not have any active raid room.",
            components: [],
          });
        }

        try {
          deleteRoom(hostId);
          collector.stop("confirmed");
          return interaction.update({
            content: `Your active raid room has been cleared. (**${activeRoom.bossName || "Unknown Boss"}**)`,
            components: [],
          });
        } catch (error) {
          collector.stop("error");
          return interaction.update({
            content: "Failed to clear your active raid room.",
            components: [],
          });
        }
      }
    });

    collector.on("end", async (_collected, reason) => {
      if (["confirmed", "cancelled", "missing", "error"].includes(reason)) return;

      try {
        await sent.edit({
          content: "Kill raid request expired.",
          components: [],
        });
      } catch {}
    });
  },
};