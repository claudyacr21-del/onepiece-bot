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
const { syncArenaRankRoles } = require("./utils/arenaRankRoles");
const { syncExpiredPatreonRoles } = require("./utils/patreonRoleStore");
const channelRules = require("./config/channelRules");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const PREFIX = String(process.env.PREFIX || "op").toLowerCase();

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));

  client.commands.set(command.name, command);

  if (Array.isArray(command.aliases)) {
    for (const alias of command.aliases) {
      client.commands.set(alias, command);
    }
  }
}

function normalizeCommandName(value) {
  return String(value || "").toLowerCase().trim();
}

function getAllowedCommandsForChannel(channelId) {
  const rules = channelRules?.restrictedChannels || {};
  const allowed = rules[String(channelId)] || null;

  return Array.isArray(allowed)
    ? allowed.map(normalizeCommandName).filter(Boolean)
    : null;
}

function getBlockedCommandsForChannel(channelId) {
  const rules = channelRules?.blockedCommands || {};
  const blocked = rules[String(channelId)] || null;

  return Array.isArray(blocked)
    ? blocked.map(normalizeCommandName).filter(Boolean)
    : null;
}

function isCommandAllowedInChannel({ message, commandName, command }) {
  const channelId = String(message.channel?.id || "");
  const allowedCommands = getAllowedCommandsForChannel(channelId);
  const blockedCommands = getBlockedCommandsForChannel(channelId);

  const alwaysAllowed = Array.isArray(channelRules?.alwaysAllowedCommands)
    ? channelRules.alwaysAllowedCommands.map(normalizeCommandName).filter(Boolean)
    : [];

  const typedCommand = normalizeCommandName(commandName);
  const realCommandName = normalizeCommandName(command?.name);

  const isAlwaysAllowed =
    alwaysAllowed.includes(typedCommand) ||
    alwaysAllowed.includes(realCommandName);

  if (isAlwaysAllowed) {
    return {
      allowed: true,
      mode: "always",
    };
  }

  if (Array.isArray(allowedCommands)) {
    const allowed =
      allowedCommands.includes(typedCommand) ||
      allowedCommands.includes(realCommandName);

    return {
      allowed,
      mode: "allowlist",
    };
  }

  if (Array.isArray(blockedCommands)) {
    const blocked =
      blockedCommands.includes(typedCommand) ||
      blockedCommands.includes(realCommandName);

    return {
      allowed: !blocked,
      mode: "blocklist",
    };
  }

  return {
    allowed: true,
    mode: "none",
  };
}

client.once("clientReady", async () => {
  console.log(`[READY] Logged in as ${client.user.tag} (${client.user.id})`);

  startTopggWebhookServer(client);

  syncArenaRankRoles(client).catch((error) => {
    console.error("[ARENA RANK ROLES READY SYNC ERROR]", error);
  });

  setInterval(() => {
    syncArenaRankRoles(client).catch((error) => {
      console.error("[ARENA RANK ROLES INTERVAL SYNC ERROR]", error);
    });
  }, 10 * 60 * 1000);

  syncExpiredPatreonRoles(client).catch((error) => {
    console.error("[PATREON ROLE READY SYNC ERROR]", error);
  });

  setInterval(() => {
    syncExpiredPatreonRoles(client).catch((error) => {
      console.error("[PATREON ROLE INTERVAL SYNC ERROR]", error);
    });
  }, 10 * 60 * 1000);
});

client.on("messageCreate", async (message) => {
  try {
    if (message.partial) {
      try {
        await message.fetch();
      } catch (_) {}
    }

    if (message.channel?.partial) {
      try {
        await message.channel.fetch();
      } catch (_) {}
    }

    if (!message.author || message.author.bot) return;
    if (typeof message.content !== "string") return;

    const content = message.content.trim();

    if (!content) return;
    if (!content.toLowerCase().startsWith(PREFIX)) return;

    const sliced = content.slice(PREFIX.length).trim();

    if (!sliced) {
      await message.reply("Type a command after the prefix.\nExample: `op help`");
      return;
    }

    const args = sliced.split(/\s+/);
    const commandName = (args.shift() || "").toLowerCase();
    const command = client.commands.get(commandName);

    if (!command) {
      await message.reply(`Unknown command: \`${commandName}\``);
      return;
    }

    const channelCheck = isCommandAllowedInChannel({
      message,
      commandName,
      command,
    });

    if (!channelCheck.allowed) {
      if (channelCheck.mode === "blocklist") {
        await message.reply("Command ini diblokir di channel ini.");
        return;
      }

      await message.reply("Command ini tidak boleh dipakai di channel ini.");
      return;
    }

    await command.execute(message, args);
  } catch (error) {
    console.error("[COMMAND ERROR]", error);

    try {
      await message.reply("An error occurred while running that command.");
    } catch (_) {}
  }
});

client.on("error", (err) => {
  console.error("[CLIENT ERROR]", err);
});

client.on("warn", (info) => {
  console.warn("[CLIENT WARN]", info);
});

client.login(process.env.DISCORD_TOKEN);