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

function parseUserId(value) {
  return String(value || "")
    .replace(/[<@!>]/g, "")
    .trim();
}

module.exports = {
  name: "resetuser",
  aliases: [],

  async execute(message, args = []) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const userId =
      message.mentions.users.first()?.id ||
      parseUserId(args[0]);

    if (!userId) {
      return message.reply({
        content: "Usage: `op resetuser <@user/user_id>`",
        allowedMentions: { repliedUser: false },
      });
    }

    if (String(userId) === String(message.author.id)) {
      return message.reply({
        content: "You cannot reset your own data with this command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const players = readPlayers();

    if (!players[String(userId)]) {
      return message.reply({
        content: `User not found: \`${userId}\``,
        allowedMentions: { repliedUser: false },
      });
    }

    delete players[String(userId)];
    writePlayers(players);

    return message.reply({
      content: `Deleted user data: \`${userId}\``,
      allowedMentions: { repliedUser: false },
    });
  },
};