require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  ActivityType,
} = require("discord.js");

const { startTopggWebhookServer } = require("./topggWebhook");
const { syncArenaRankRoles } = require("./utils/arenaRankRoles");
const { syncExpiredPatreonRoles } = require("./utils/patreonRoleStore");
const { startResetReminderService } = require("./utils/resetReminderService");
const { initRedeemCodeStore } = require("./utils/redeemCodeStore");
const { maybeSpawnMarineEvent } = require("./utils/marineEvent");
const channelRules = require("./config/channelRules");
const { readPlayers, writePlayers, initPlayerStore } = require("./playerStore");
const { isMaintenanceActive } = require("./utils/maintenanceStore");
const { createMaintenanceEmbed } = require("./commands/maintenance");
const {
  isEligibleMilestoneChat,
  incrementMessageMilestone,
  applyMessageMilestoneRewards,
} = require("./utils/messageMilestones");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
  allowedMentions: {
    parse: ["users", "roles"],
    repliedUser: false,
  },
});

const PREFIX = String(process.env.PREFIX || "op").toLowerCase();
const COMMAND_COOLDOWN_MS = 3000;

const MAIN_GUILD_ID =
  process.env.MAIN_GUILD_ID ||
  process.env.SUPPORT_GUILD_ID ||
  process.env.GUILD_ID ||
  process.env.SERVER_ID ||
  "";

const commandCooldowns = new Map();
const processedMessageIds = new Set();

let readyStarted = false;
let dedupePool = null;
let dedupeReady = false;
let dedupeInitStarted = false;

function getDedupePool() {
  const enabled =
    String(process.env.MESSAGE_DEDUPE_ENABLED || "false").toLowerCase() === "true";

  if (!enabled) return null;
  if (!process.env.DATABASE_URL) return null;

  if (!dedupePool) {
    dedupePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    dedupePool.on("error", (error) => {
      console.error("[MESSAGE DEDUPE DB POOL ERROR]", error);
    });
  }

  return dedupePool;
}

async function ensureMessageDedupeTable() {
  if (dedupeReady) return true;
  if (dedupeInitStarted) return false;

  const pool = getDedupePool();
  if (!pool) return false;

  dedupeInitStarted = true;

  try {
    await pool.query(`
      create table if not exists bot_processed_messages (
        message_id text primary key,
        user_id text,
        command_name text,
        created_at timestamptz not null default now()
      );
    `);

    await pool.query(`
      create index if not exists bot_processed_messages_created_at_idx
      on bot_processed_messages (created_at);
    `);

    await pool.query(`
      delete from bot_processed_messages
      where created_at < now() - interval '2 days';
    `);

    dedupeReady = true;
    console.log("[MESSAGE DEDUPE] Supabase message lock ready.");
    return true;
  } catch (error) {
    console.error("[MESSAGE DEDUPE INIT ERROR]", error);
    dedupeReady = false;
    return false;
  } finally {
    dedupeInitStarted = false;
  }
}

async function claimMessageOnce(message, commandName = "") {
  const messageId = String(message?.id || "");
  if (!messageId) return false;

  if (processedMessageIds.has(messageId)) return false;

  processedMessageIds.add(messageId);

  setTimeout(() => {
    processedMessageIds.delete(messageId);
  }, 60_000);

  const pool = getDedupePool();

  if (!pool) {
    return true;
  }

  try {
    if (!dedupeReady) {
      await ensureMessageDedupeTable();
    }

    if (!dedupeReady) {
      return true;
    }

    const result = await pool.query(
      `
      insert into bot_processed_messages (message_id, user_id, command_name)
      values ($1, $2, $3)
      on conflict (message_id) do nothing
      returning message_id
      `,
      [
        messageId,
        String(message?.author?.id || ""),
        String(commandName || ""),
      ]
    );

    return result.rowCount > 0;
  } catch (error) {
    console.error("[MESSAGE DEDUPE CLAIM ERROR]", error);
    return true;
  }
}

async function attachMainServerContext(message) {
  message.commandGuild = message.guild || null;
  message.commandMember = message.member || null;
  message.mainGuild = null;
  message.mainMember = null;
  message.resolvedGuild = message.guild || null;
  message.resolvedMember = message.member || null;
  message.isDMCommand = !message.guild;

  if (!MAIN_GUILD_ID || !message.client?.guilds?.cache) {
    return message;
  }

  const mainGuild =
    message.client.guilds.cache.get(MAIN_GUILD_ID) ||
    (await message.client.guilds.fetch(MAIN_GUILD_ID).catch(() => null));

  if (!mainGuild) {
    return message;
  }

  message.mainGuild = mainGuild;
  message.resolvedGuild = mainGuild;

  const mainMember =
    mainGuild.members.cache.get(message.author.id) ||
    (await mainGuild.members.fetch(message.author.id).catch(() => null));

  message.mainMember = mainMember || null;
  message.resolvedMember = message.mainMember || message.member || null;

  return message;
}

function getCommandGuild(message) {
  return message?.mainGuild || message?.guild || null;
}

function getCommandMember(message) {
  return message?.mainMember || message?.member || null;
}

global.getCommandGuild = getCommandGuild;
global.getCommandMember = getCommandMember;

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));

  if (!command?.name || typeof command.execute !== "function") {
    console.warn(`[COMMAND LOAD SKIPPED] ${file} is missing name/execute.`);
    continue;
  }

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
    alwaysAllowed.includes(typedCommand) || alwaysAllowed.includes(realCommandName);

  if (isAlwaysAllowed) {
    return { allowed: true, mode: "always" };
  }

  if (Array.isArray(allowedCommands)) {
    const allowed =
      allowedCommands.includes(typedCommand) || allowedCommands.includes(realCommandName);

    return { allowed, mode: "allowlist" };
  }

  if (Array.isArray(blockedCommands)) {
    const blocked =
      blockedCommands.includes(typedCommand) || blockedCommands.includes(realCommandName);

    return { allowed: !blocked, mode: "blocklist" };
  }

  return { allowed: true, mode: "none" };
}

function parsePrefixedCommand(content) {
  const raw = String(content || "").trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  if (lower === PREFIX) {
    return { commandName: "", args: [] };
  }

  const prefixWithSpace = `${PREFIX} `;

  if (!lower.startsWith(prefixWithSpace)) {
    return null;
  }

  const sliced = raw.slice(PREFIX.length).trim();
  const parts = sliced.split(/\s+/).filter(Boolean);
  const commandName = String(parts.shift() || "").toLowerCase();

  return { commandName, args: parts };
}

function getOwnerIds() {
  return String(
    process.env.BOT_OWNER_IDS ||
      process.env.OWNER_IDS ||
      process.env.BOT_OWNER_ID ||
      process.env.ADMIN_USER_IDS ||
      ""
  )
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isMaintenanceBypassUser(message) {
  const ownerIds = getOwnerIds();

  const isBotOwner = ownerIds.includes(String(message.author.id));
  const guild = getCommandGuild(message);
  const isServerOwner =
    guild && String(guild.ownerId) === String(message.author.id);

  return Boolean(isBotOwner || isServerOwner);
}

function createDefaultPlayerForMilestone(message) {
  return {
    username: message.author.username,
    berries: 1000,
    gems: 100,
    cards: [],
    fragments: [],
    boxes: [],
    tickets: [],
    materials: [],
    items: [],
    weapons: [],
    devilFruits: [],
    messageMilestones: {
      messages: 0,
      updatedAt: 0,
    },
  };
}

async function trackMessageMilestone(message) {
  if (!isEligibleMilestoneChat(message, PREFIX)) return;

  const players = readPlayers();
  const userId = String(message.author.id);

  const player = players[userId] || createDefaultPlayerForMilestone(message);
  const milestoneState = incrementMessageMilestone(player);

  const result = applyMessageMilestoneRewards(
    {
      ...player,
      username: message.author.username || player.username,
    },
    milestoneState
  );

  players[userId] = result.player;
  writePlayers(players);

  if (Array.isArray(result.rewards) && result.rewards.length) {
    await message.channel
      .send({
        content: [
          `🎉 <@${message.author.id}> reached a **Message Milestone**!`,
          ...result.rewards.map((line) => `↪ ${line}`),
        ].join("\n"),
        allowedMentions: {
          users: [message.author.id],
          roles: [],
          repliedUser: false,
        },
      })
      .catch((error) => {
        console.error("[MESSAGE MILESTONE NOTIFY ERROR]", error);
      });
  }
}

client.once("clientReady", async () => {
  if (readyStarted) {
    console.warn("[READY] Duplicate ready event ignored.");
    return;
  }

  readyStarted = true;

  console.log(`[READY] Logged in as ${client.user.tag} (${client.user.id})`);

  if (String(process.env.MESSAGE_DEDUPE_ENABLED || "false").toLowerCase() === "true") {
    await ensureMessageDedupeTable();
  }

  client.user.setPresence({
    status: "online",
    activities: [
      {
        name: "Type op help to become Pirate King!",
        type: ActivityType.Playing,
      },
    ],
  });

  startTopggWebhookServer(client);
  startResetReminderService(client);

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

    const parsed = parsePrefixedCommand(message.content);

    if (parsed) {
      const shouldProcess = await claimMessageOnce(message, parsed.commandName || "");
      if (!shouldProcess) return;
    } else {
      if (processedMessageIds.has(String(message.id))) return;
      processedMessageIds.add(String(message.id));
      setTimeout(() => processedMessageIds.delete(String(message.id)), 60_000);
    }

    if (message.guild) {
      try {
        await trackMessageMilestone(message);
      } catch (error) {
        console.error("[MESSAGE MILESTONE ERROR]", error);
      }

      await maybeSpawnMarineEvent(client, message);
    }

    if (!parsed) return;

    const { commandName, args } = parsed;

    if (!commandName) {
      await message.reply("Type a command after the prefix.\nExample: `op help`");
      return;
    }

    const command = client.commands.get(commandName);

    if (!command) {
      await message.reply(`Unknown command: \`${commandName}\``);
      return;
    }

    await attachMainServerContext(message);

    if (
      isMaintenanceActive() &&
      !isMaintenanceBypassUser(message) &&
      normalizeCommandName(command.name) !== "maintenance"
    ) {
      await message.reply({
        embeds: [createMaintenanceEmbed()],
      });
      return;
    }

    const cooldownKey = `${message.author.id}:${command.name || commandName}`;
    const now = Date.now();
    const lastUsed = commandCooldowns.get(cooldownKey) || 0;
    const remainingMs = COMMAND_COOLDOWN_MS - (now - lastUsed);

    if (remainingMs > 0) {
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      await message.reply(
        `⏳ Please wait **${remainingSeconds}s** before using \`${PREFIX} ${commandName}\` again.`
      );

      return;
    }

    commandCooldowns.set(cooldownKey, now);

    setTimeout(() => {
      if (commandCooldowns.get(cooldownKey) === now) {
        commandCooldowns.delete(cooldownKey);
      }
    }, COMMAND_COOLDOWN_MS + 250);

    if (message.guild) {
      const channelCheck = isCommandAllowedInChannel({
        message,
        commandName,
        command,
      });

      if (!channelCheck.allowed) {
        await message.reply("This command is not allowed on this channel.");
        return;
      }
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

function isIgnorableDiscordInteractionError(error) {
  const code = Number(error?.code || error?.rawError?.code || 0);
  const status = Number(error?.status || error?.rawError?.status || 0);
  const message = String(error?.message || "");
  const errno = String(error?.errno || error?.cause?.errno || "");
  const requestCode = String(error?.requestBody?.code || "");

  return (
    code === 10062 ||
    code === 40060 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    errno === "ECONNRESET" ||
    errno === "ETIMEDOUT" ||
    errno === "EAI_AGAIN" ||
    requestCode === "UND_ERR_SOCKET" ||
    message.includes("Unknown interaction") ||
    message.includes("Interaction has already been acknowledged") ||
    message.includes("Service Unavailable") ||
    message.includes("Bad Gateway") ||
    message.includes("Gateway Timeout")
  );
}

process.on("unhandledRejection", (error) => {
  if (isIgnorableDiscordInteractionError(error)) {
    console.warn("[IGNORED DISCORD INTERACTION ERROR]", error?.message || error);
    return;
  }

  console.error("[UNHANDLED REJECTION]", error);
});

process.on("uncaughtException", (error) => {
  if (isIgnorableDiscordInteractionError(error)) {
    console.warn("[IGNORED DISCORD INTERACTION EXCEPTION]", error?.message || error);
    return;
  }

  console.error("[UNCAUGHT EXCEPTION]", error);
});

initPlayerStore()
  .then(() => initRedeemCodeStore())
  .then(() => client.login(process.env.DISCORD_TOKEN))
  .catch((error) => {
    console.error("[PLAYER STORE INIT FATAL]", error);
    process.exit(1);
  });