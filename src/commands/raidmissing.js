const { getRoom, getMissingUsers } = require("../utils/partyRooms");
const { EmbedBuilder } = require("discord.js");

function getAdminIds() {
  return String(
    process.env.ADMIN_USER_IDS ||
      process.env.DISCORD_OWNER_ID ||
      process.env.BOT_OWNER_ID ||
      ""
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function isAdmin(userId) {
  return getAdminIds().includes(String(userId));
}

module.exports = {
  name: "raidmissing",
  aliases: ["rm"],

  async execute(message) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const room = getRoom(message.author.id);
    if (!room) {
      return message.reply("You do not have an active raid/party room.");
    }

    try {
      const missing = getMissingUsers(message.author.id);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle(`Missing Users • ${room.bossName}`)
            .setDescription(
              missing.length
                ? missing.map((id, i) => `${i + 1}. <@${id}>`).join("\n")
                : "Everyone in the team has already joined battle."
            ),
        ],
      });
    } catch (error) {
      return message.reply(error.message || "Failed to check missing users.");
    }
  },
};