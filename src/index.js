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
  partials: [Partials.Channel, Partials.Message],
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
      try { await message.fetch(); } catch (e) { console.error("Failed to fetch partial message:", e); }
    }

    if (message.channel?.partial) {
      try { await message.channel.fetch(); } catch (e) { console.error("Failed to fetch partial channel:", e); }
    }

    if (!message.author || message.author.bot) return;
    if (typeof message.content !== "string") return;

    const isDM = !message.guild;
    console.log(`[MSG] ${isDM ? "DM" : "GUILD"} from ${message.author.tag}: ${message.content}`);

    const content = message.content.trim();
    if (!content) return;
    if (!content.toLowerCase().startsWith(PREFIX)) return;

    const sliced = content.slice(PREFIX.length).trim();
    if (!sliced) {
      await message.reply("Type a command after the prefix. Example: `op help`");
      return;
    }

    const args = sliced.split(/\s+/);
    const commandName = (args.shift() || "").toLowerCase();
    const command = client.commands.get(commandName);

    if (!command) {
      await message.reply(`Unknown command: \`${commandName}\``);
      return;
    }

    await command.execute(message, args);
  } catch (error) {
    console.error("Command error:", error);
    try {
      await message.reply("An error occurred while running that command.");
    } catch (replyError) {
      console.error("Reply failed:", replyError);
    }
  }
});

startTopggWebhookServer(client);
client.login(process.env.DISCORD_TOKEN);