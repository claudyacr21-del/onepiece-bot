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
const {
  initPatreonRoleStore,
  syncExpiredPatreonRoles,
} = require("./utils/patreonRoleStore");
const { initPirateStore } = require("./utils/pirateStore");
const { runPirateWeeklyResetIfNeeded } = require("./utils/pirateWeekly");
const { startResetReminderService } = require("./utils/resetReminderService");
const { startAutoReloadService } = require("./utils/autoReload");
const { initRedeemCodeStore } = require("./utils/redeemCodeStore");
const { maybeSpawnMarineEvent } = require("./utils/marineEvent");
const channelRules = require("./config/channelRules");
const {
  readPlayers,
  writePlayers,
  initPlayerStore,
  flushPlayerStoreNow,
  flushPlayerNow,
} = require("./playerStore");
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

const FAST_COMMAND_NAMES = new Set([
  "pull",
  "pa",
  "pullall",
  "pullinfo",
]);

const ONEPIECE_MAIN_GUILD_ID =
  process.env.ONEPIECE_MAIN_GUILD_ID ||
  process.env.SUPPORT_GUILD_ID ||
  process.env.GUILD_ID ||
  process.env.SERVER_ID ||
  "";

const commandCooldowns = new Map();
const processedMessageIds = new Set();

let pirateWeeklyResetRunning = false;

async function checkPirateWeeklyReset(reason = "interval") {
  if (pirateWeeklyResetRunning) return;
  pirateWeeklyResetRunning = true;

  try {
    const result = await runPirateWeeklyResetIfNeeded();

    if (result?.didReset) {
      console.log(
        `[PIRATE WEEKLY RESET] Completed via ${reason}. Bucket: ${result.currentBucket}. Rewards: ${Array.isArray(result.rewards) ? result.rewards.length : 0}`
      );
      await sendPirateWeeklyResetNotification(result, reason);
    } else if (result?.initialized) {
      console.log(
        `[PIRATE WEEKLY RESET] Initialized bucket via ${reason}: ${result.currentBucket}`
      );
    }
  } catch (error) {
    console.error("[PIRATE WEEKLY RESET ERROR]", error);
  } finally {
    pirateWeeklyResetRunning = false;
  }
}


async function sendPirateWeeklyResetNotification(result, reason = "interval") {
  const channelId = String(process.env.PIRATE_WEEKLY_RESET_LOG_CHANNEL_ID || "").trim();
  if (!channelId || !result?.didReset) return;

  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || typeof channel.send !== "function") {
      console.warn("[PIRATE WEEKLY RESET] Log channel not found or cannot send:", channelId);
      return;
    }

    const rewards = Array.isArray(result.rewards) ? result.rewards : [];
    const rewardCount = rewards.length;

    const topRewards = rewards
      .slice(0, 10)
      .map((reward, index) => {
        const pirateName = reward.pirateName || "Unknown Pirate";
        const rank = reward.rank || "?";
        const userId = reward.userId || "Unknown";
        const tokens = reward.tokens || 0;
        const role = reward.role || "crew";

        return `${index + 1}. **${pirateName}** • Rank #${rank} • <@${userId}> • ${role} • +${tokens} tokens`;
      })
      .join("\n");

    await channel.send({
      embeds: [
        {
          color: 0xf1c40f,
          title: "🏴‍☠️ Pirate Weekly Reset Completed",
          description: [
            `**Bucket:** ${result.currentBucket || "Unknown"}`,
            `**Triggered By:** ${reason}`,
            `**Reward Entries:** ${rewardCount}`,
            "",
            topRewards || "No reward entries.",
            rewardCount > 10 ? `\n...and **${rewardCount - 10}** more reward entries.` : "",
          ].join("\n"),
          footer: {
            text: "One Piece Bot • Pirate Weekly Reset",
          },
          timestamp: new Date().toISOString(),
        },
      ],
      allowedMentions: {
        parse: [],
      },
    });
  } catch (error) {
    console.error("[PIRATE WEEKLY RESET NOTIFY ERROR]", error);
  }
}

function startPirateWeeklyResetScheduler() {
  const intervalMs = Math.max(
    60_000,
    Number(process.env.PIRATE_WEEKLY_RESET_CHECK_MS || 60000)
  );

  checkPirateWeeklyReset("startup").catch((error) => {
    console.error("[PIRATE WEEKLY RESET STARTUP ERROR]", error);
  });

  setInterval(() => {
    checkPirateWeeklyReset("interval").catch((error) => {
      console.error("[PIRATE WEEKLY RESET INTERVAL ERROR]", error);
    });
  }, intervalMs);

  console.log(`[PIRATE WEEKLY RESET] Scheduler active. Check every ${intervalMs}ms.`);
}


let readyStarted = false;
let dedupePool = null;
let dedupeReady = false;
let dedupeInitStarted = false;
let dedupeDisabledUntil = 0;

function getDedupePool() {
  const enabled = String(process.env.MESSAGE_DEDUPE_ENABLED || "false").toLowerCase() === "true";

  // Keep dedupe disabled unless explicitly enabled.
  // If Supabase is slow, DB-backed dedupe can block commands.
  if (!enabled) return null;

  if (!enabled) return null;
  if (!process.env.DATABASE_URL) return null;

  if (Date.now() < dedupeDisabledUntil) return null;

  if (!dedupePool) {
    dedupePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.MESSAGE_DEDUPE_POOL_MAX || 1),
      idleTimeoutMillis: Number(process.env.MESSAGE_DEDUPE_IDLE_TIMEOUT_MS || 10000),
      connectionTimeoutMillis: Number(process.env.MESSAGE_DEDUPE_CONNECT_TIMEOUT_MS || 2000),
      query_timeout: Number(process.env.MESSAGE_DEDUPE_QUERY_TIMEOUT_MS || 3000),
      statement_timeout: Number(process.env.MESSAGE_DEDUPE_STATEMENT_TIMEOUT_MS || 3000),
      maxUses: Number(process.env.MESSAGE_DEDUPE_MAX_USES || 500),
    });

    dedupePool.on("error", (error) => {
      console.error("[MESSAGE DEDUPE DB POOL ERROR]", error);
      dedupeReady = false;
      dedupeDisabledUntil = Date.now() + 60_000;
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
    dedupeDisabledUntil = Date.now() + 60_000;
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

  const dedupeEnabled =
    String(process.env.MESSAGE_DEDUPE_ENABLED || "false").toLowerCase() === "true";

  const failOpen =
    String(process.env.MESSAGE_DEDUPE_FAIL_OPEN || "false").toLowerCase() === "true";

  const pool = getDedupePool();

  // Kalau dedupe OFF, local memory dedupe saja.
  // Aman hanya kalau benar-benar 1 instance bot.
  if (!dedupeEnabled) {
    return true;
  }

  // Kalau dedupe ON tapi pool tidak ada / sedang circuit breaker,
  // jangan proses command supaya tidak reply 2x dari multi-instance.
  if (!pool) {
    console.warn("[MESSAGE DEDUPE BLOCKED] Dedupe pool unavailable. Command skipped to prevent duplicate replies.");
    return failOpen;
  }

  try {
    if (!dedupeReady) {
      await ensureMessageDedupeTable();
    }

    if (!dedupeReady) {
      console.warn("[MESSAGE DEDUPE BLOCKED] Dedupe table not ready. Command skipped to prevent duplicate replies.");
      return failOpen;
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
    const errorMessage = String(error?.message || "");

    if (errorMessage.includes("Query read timeout")) {
      console.warn("[MESSAGE DEDUPE BLOCKED] Supabase query timeout. Command skipped to prevent duplicate replies.");
    } else {
      console.error("[MESSAGE DEDUPE CLAIM ERROR]", error);
    }

    dedupeReady = false;
    dedupeDisabledUntil = Date.now() + 15_000;

    return failOpen;
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

  if (!ONEPIECE_MAIN_GUILD_ID || !message.client?.guilds?.cache) {
    return message;
  }

  const mainGuild =
    message.client.guilds.cache.get(ONEPIECE_MAIN_GUILD_ID) ||
    (await message.client.guilds.fetch(ONEPIECE_MAIN_GUILD_ID).catch(() => null));

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

function isAdminBypassUser(message) {
  const ownerIds = getOwnerIds();
  const userId = String(message?.author?.id || "");
  const guild = getCommandGuild(message);
  const member = getCommandMember(message);

  const isBotOwner = ownerIds.includes(userId);
  const isServerOwner = guild && String(guild.ownerId) === userId;
  const isAdminPerm = member?.permissions?.has?.("Administrator");

  const roleIds = String(process.env.ADMIN_ROLE_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const hasAdminRole = roleIds.length && member?.roles?.cache
    ? roleIds.some((roleId) => member.roles.cache.has(roleId))
    : false;

  return Boolean(isBotOwner || isServerOwner || isAdminPerm || hasAdminRole);
}

function getPlayerAdminBan(player) {
  const ban = player?.adminBan && typeof player.adminBan === "object" ? player.adminBan : null;
  if (!ban || !ban.active) return null;

  return {
    active: true,
    reason: String(ban.reason || "No reason provided."),
    bannedBy: String(ban.bannedBy || ""),
    bannedAt: Number(ban.bannedAt || 0),
  };
}

function getDisabledCommandStore() {
  const players = readPlayers();
  const raw =
    players.__disabled_commands && typeof players.__disabled_commands === "object"
      ? players.__disabled_commands
      : {};

  return {
    disabled: Array.isArray(raw.disabled)
      ? raw.disabled.map(normalizeCommandName).filter(Boolean)
      : [],
  };
}

function isCommandDisabledByAdmin(commandName, command) {
  const protectedCommands = new Set([
    "disable",
    "enable",
    "disabledcmds",
    "maintenance",
    "banuser",
    "unbanuser",
    "baninfo",
    "help",
  ]);

  const typed = normalizeCommandName(commandName);
  const real = normalizeCommandName(command?.name);

  if (protectedCommands.has(typed) || protectedCommands.has(real)) {
    return false;
  }

  const store = getDisabledCommandStore();
  return store.disabled.includes(typed) || store.disabled.includes(real);
}

function isBanBypassCommand(commandName, command) {
  const allowed = new Set([
    "banuser",
    "unbanuser",
    "baninfo",
    "maintenance",
    "help",
  ]);

  const typed = normalizeCommandName(commandName);
  const real = normalizeCommandName(command?.name);

  return allowed.has(typed) || allowed.has(real);
}

function createPlayerBanMessage(ban) {
  const lines = [
    "You are banned from using this bot.",
    `Reason: ${ban.reason || "No reason provided."}`,
  ];

  if (ban.bannedAt) {
    lines.push(`Banned At: <t:${Math.floor(Number(ban.bannedAt) / 1000)}:F>`);
  }

  return lines.join("\n");
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
  await flushPlayerNow(userId, Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000));

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
  startAutoReloadService(client);
startPirateWeeklyResetScheduler();
  
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

    if (!parsed) {
      if (message.guild) {
        setImmediate(() => {
          trackMessageMilestone(message).catch((error) => {
            console.error("[MESSAGE MILESTONE ERROR]", error);
          });

          maybeSpawnMarineEvent(client, message).catch((error) => {
            console.error("[MARINE EVENT ERROR]", error);
          });
        });
      }

      return;
    }

    const isFastCommand = FAST_COMMAND_NAMES.has(normalizeCommandName(parsed.commandName));

    if (message.guild && !isFastCommand) {
      setImmediate(() => {
        trackMessageMilestone(message).catch((error) => {
          console.error("[MESSAGE MILESTONE ERROR]", error);
        });

        maybeSpawnMarineEvent(client, message).catch((error) => {
          console.error("[MARINE EVENT ERROR]", error);
        });
      });
    }

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

    const playersForBanCheck = readPlayers();
    const commandUserForBanCheck = playersForBanCheck[String(message.author.id)];
    const activeAdminBan = getPlayerAdminBan(commandUserForBanCheck);

    if (
      activeAdminBan &&
      !isAdminBypassUser(message) &&
      !isBanBypassCommand(commandName, command)
    ) {
      await message.reply({
        content: createPlayerBanMessage(activeAdminBan),
        allowedMentions: {
          repliedUser: false,
        },
      });
      return;
    }

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

    if (isCommandDisabledByAdmin(commandName, command) && !isAdminBypassUser(message)) {
      await message.reply({
        content: `\`op ${commandName}\` is currently disabled by admins.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
      return;
    }

    const cooldownKey = `${message.author.id}:${command.name || commandName}`;
    const now = Date.now();
    const isFastCommandCooldownBypass =
      FAST_COMMAND_NAMES.has(normalizeCommandName(command.name)) ||
      FAST_COMMAND_NAMES.has(normalizeCommandName(commandName));

    if (!isFastCommandCooldownBypass) {
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
    }

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

  const commandFlushMs = Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 0);

  if (commandFlushMs > 0) {
    flushPlayerNow(message.author.id, commandFlushMs).catch((error) => {
      console.error("[PLAYER DB COMMAND FLUSH ERROR]", {
        userId: String(message.author.id),
        message: error?.message || error,
      });
    });
  }
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
    if (String(process.env.LOG_IGNORED_INTERACTIONS || "false").toLowerCase() === "true") {
      console.warn("[IGNORED DISCORD INTERACTION ERROR]", error?.message || error);
    }
    return;
  }

  console.error("[UNHANDLED REJECTION]", error);
});

process.on("uncaughtException", (error) => {
  if (isIgnorableDiscordInteractionError(error)) {
    if (String(process.env.LOG_IGNORED_INTERACTIONS || "false").toLowerCase() === "true") {
      console.warn("[IGNORED DISCORD INTERACTION EXCEPTION]", error?.message || error);
    }
    return;
  }

  console.error("[UNCAUGHT EXCEPTION]", error);
});

initPlayerStore()
  .then(() => initPatreonRoleStore())
  .then(() => initPirateStore())
  .then(() => initRedeemCodeStore())
  .then(() => client.login(process.env.DISCORD_TOKEN))
  .catch((error) => {
    console.error("[STORE INIT FATAL]", error);
    process.exit(1);
  });