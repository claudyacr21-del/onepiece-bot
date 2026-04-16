require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
} = require("discord.js");
const { startTopggWebhookServer } = require("./topggWebhook");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const PREFIX = String(process.env.PREFIX || "op").toLowerCase();
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.name, command);

  if (Array.isArray(command.aliases)) {
    for (const alias of command.aliases) {
      client.commands.set(alias, command);
    }
  }
}

client.once("clientReady", () => {
  console.log(`${client.user.tag} is online!`);
});

client.on("messageCreate", async (message) => {
  try {
    if (message.partial) {
      try { await message.fetch(); } catch (_) {}
    }

    if (message.channel?.partial) {
      try { await message.channel.fetch(); } catch (_) {}
    }

    if (!message.author || message.author.bot) return;
    if (typeof message.content !== "string") return;

    const content = message.content.trim();
    if (!content) return;
    if (!content.toLowerCase().startsWith(PREFIX)) return;

    const sliced = content.slice(PREFIX.length).trim();
    if (!sliced) return;

    const args = sliced.split(/\s+/);
    const commandName = (args.shift() || "").toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    await command.execute(message, args);
  } catch (error) {
    console.error("Command error:", error);
    try {
      await message.reply("An error occurred while running that command.");
    } catch (_) {}
  }
});

startTopggWebhookServer(client);
client.login(process.env.DISCORD_TOKEN);