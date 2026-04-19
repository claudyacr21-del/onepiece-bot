const { writePlayers } = require("../playerStore");

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
  name: "resetall",
  aliases: [],

  async execute(message) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    writePlayers({});
    return message.reply("All player data has been reset.");
  },
};