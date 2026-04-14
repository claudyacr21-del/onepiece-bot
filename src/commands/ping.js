module.exports = {
  name: "ping",
  async execute(message) {
    return message.reply("Pong! Bot is working.");
  }
};