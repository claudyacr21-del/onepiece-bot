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

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

module.exports = {
  name: "removecard",
  aliases: [],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const userId = String(args.shift() || "").trim();
    const query = args.join(" ").trim();

    if (!userId || !query) {
      return message.reply("Usage: `op removecard <userId> <battle card code or exact name>`");
    }

    const players = readPlayers();
    if (!players[userId]) {
      return message.reply(`User not found: \`${userId}\``);
    }

    players[userId].cards = Array.isArray(players[userId].cards) ? players[userId].cards : [];

    const idx = players[userId].cards.findIndex((card) => {
      if (card?.cardRole !== "battle") return false;
      return (
        normalize(card?.code) === normalize(query) ||
        normalize(card?.name) === normalize(query) ||
        normalize(card?.displayName) === normalize(query)
      );
    });

    if (idx === -1) {
      return message.reply("Battle card not found.");
    }

    const removed = players[userId].cards[idx];
    players[userId].cards.splice(idx, 1);
    writePlayers(players);

    return message.reply(`Removed battle card \`${removed.displayName || removed.name}\` from \`${userId}\`.`);
  },
};