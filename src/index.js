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
    for (const alias of command.aliases) client.commands.set(alias, command);
  }
}

client.once("clientReady", async () => {
  console.log(`[READY] Logged in as ${client.user.tag} (${client.user.id})`);
  try {
    const app = await client.application.fetch();
    console.log(`[APP] Application ID: ${app.id}`);
  } catch (e) {
    console.error("[APP] Failed to fetch application:", e);
  }
});

client.on("messageCreate", async (message) => {
  try {
    if (message.partial) {
      try { await message.fetch(); } catch (e) { console.error("[PARTIAL MESSAGE]", e); }
    }
    if (message.channel?.partial) {
      try { await message.channel.fetch(); } catch (e) { console.error("[PARTIAL CHANNEL]", e); }
    }

    const isDM = !message.guild;
    console.log(`[EVENT] messageCreate | ${isDM ? "DM" : "GUILD"} | ${message.author?.tag} | ${message.content}`);

    if (!message.author || message.author.bot) return;
    if (typeof message.content !== "string") return;

    const content = message.content.trim();
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
    console.error("[COMMAND ERROR]", error);
    try {
      await message.reply("An error occurred while running that command.");
    } catch (replyError) {
      console.error("[REPLY ERROR]", replyError);
    }
  }
});

client.on("channelCreate", (channel) => {
  console.log(`[EVENT] channelCreate | type=${channel?.type} | id=${channel?.id}`);
});

client.on("error", (err) => {
  console.error("[CLIENT ERROR]", err);
});

client.on("warn", (info) => {
  console.warn("[CLIENT WARN]", info);
});

startTopggWebhookServer(client);
client.login(process.env.DISCORD_TOKEN);