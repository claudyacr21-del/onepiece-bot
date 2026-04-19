const { readPlayers, writePlayers } = require("../playerStore");

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
  name: "resetuser",
  aliases: [],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const userId = String(args.shift() || "").trim();

    if (!userId) {
      return message.reply("Usage: `op resetuser <userId>`");
    }

    const players = readPlayers();

    if (!players[userId]) {
      return message.reply(`User not found: \`${userId}\``);
    }

    delete players[userId];
    writePlayers(players);

    return message.reply(`Deleted user data: \`${userId}\``);
  },
};