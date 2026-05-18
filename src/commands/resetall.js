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

  async execute(message, args = []) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const confirm = String(args[0] || "").trim();

    if (confirm !== "CONFIRM") {
      return message.reply({
        content: [
          "This command deletes **ALL player data**.",
          "To confirm, use:",
          "`op resetall CONFIRM`",
        ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    writePlayers({});

    return message.reply({
      content: "All player data has been reset.",
      allowedMentions: { repliedUser: false },
    });
  },
};