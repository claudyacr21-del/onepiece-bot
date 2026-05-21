const { EmbedBuilder } = require("discord.js");
const { readPlayers, updatePlayerAtomic } = require("../playerStore");
const { getNextResetTime } = require("./pullReset");

const RESET_CHANNEL_ID = process.env.RESET_CHANNEL_ID || "";
const RESET_PING_ROLE_ID = process.env.RESET_PING_ROLE_ID || "";

const USER_REMINDER_CHECK_INTERVAL_MS = Number(
  process.env.RESET_USER_REMINDER_CHECK_INTERVAL_MS || 60 * 1000
);

const RESET_SEND_DELAY_MS = 3 * 1000;

let serviceStarted = false;
let globalResetTimer = null;
let userReminderInterval = null;

function formatDiscordTimestamp(timestampMs, style = "R") {
  return `<t:${Math.floor(Number(timestampMs || Date.now()) / 1000)}:${style}>`;
}

function getReminderState(player) {
  const existing =
    player?.cooldownReminders && typeof player.cooldownReminders === "object"
      ? player.cooldownReminders
      : {};

  return {
    dailyNotifiedAt: Number(existing.dailyNotifiedAt || 0),
    treasureNotifiedAt: Number(existing.treasureNotifiedAt || 0),
    voteNotifiedAt: Number(existing.voteNotifiedAt || 0),
    fightNotifiedAt: Number(existing.fightNotifiedAt || 0),
    bossNotifiedAt: Number(existing.bossNotifiedAt || 0),
    updatedAt: Number(existing.updatedAt || 0),
  };
}

function getCooldownTargets(player) {
  const cooldowns = player?.cooldowns || {};

  return [
    {
      type: "daily",
      key: "dailyNotifiedAt",
      readyAt: Number(cooldowns.daily || 0),
      command: "op daily",
      title: "🎁 Daily Reward Is Ready!",
      description:
        "Your daily reward cooldown is finished.\nUse `op daily` in the server to claim it.",
      color: 0x2ecc71,
      footer: "One Piece Bot • Daily Reminder",
    },
    {
      type: "treasure",
      key: "treasureNotifiedAt",
      readyAt: Number(cooldowns.treasure || 0),
      command: "op treasure",
      title: "🧰 Treasure Is Ready!",
      description:
        "Your Mother Flame treasure cooldown is finished.\nUse `op treasure` in the server to claim it.",
      color: 0xe67e22,
      footer: "One Piece Bot • Treasure Reminder",
    },
    {
      type: "vote",
      key: "voteNotifiedAt",
      readyAt: Number(cooldowns.vote || 0),
      command: "op vote",
      title: "🗳️ Vote Is Ready!",
      description:
        "Your Top.gg vote cooldown is finished.\nUse `op vote` in the server, then vote again to claim the reward.",
      color: 0x8e44ad,
      footer: "One Piece Bot • Vote Reminder",
    },
    {
      type: "fight",
      key: "fightNotifiedAt",
      readyAt: Math.max(
        Number(cooldowns.fight || 0),
        Number(cooldowns.fightMotherFlame || 0),
        Number(cooldowns.fightVivreCard || 0)
      ),
      command: "op fight",
      title: "⚔️ Fight Is Ready!",
      description:
        "Your fight cooldown is finished.\nUse `op fight` in the server to battle again.",
      color: 0xc0392b,
      footer: "One Piece Bot • Fight Reminder",
    },
    {
      type: "boss",
      key: "bossNotifiedAt",
      readyAt: Number(cooldowns.boss || 0),
      command: "op boss",
      title: "👑 Boss Battle Is Ready!",
      description:
        "Your boss cooldown is finished.\nUse `op boss` in the server to challenge a boss again.",
      color: 0xf1c40f,
      footer: "One Piece Bot • Boss Reminder",
    },
  ];
}

function shouldSendReminder(target, reminderState, now) {
  const readyAt = Number(target.readyAt || 0);

  if (!readyAt) return false;
  if (readyAt > now) return false;

  const alreadyNotifiedAt = Number(reminderState[target.key] || 0);

  return alreadyNotifiedAt !== readyAt;
}

async function sendUserDm(client, userId, target) {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return false;

  const embed = new EmbedBuilder()
    .setColor(target.color)
    .setTitle(target.title)
    .setDescription(target.description)
    .setFooter({ text: target.footer })
    .setTimestamp();

  const sent = await user.send({ embeds: [embed] }).catch(() => null);
  return Boolean(sent);
}

async function checkUserCooldownReminders(client) {
  const players = readPlayers();
  const now = Date.now();

  for (const [userId, player] of Object.entries(players || {})) {
    const reminderState = getReminderState(player);
    const targets = getCooldownTargets(player);

    const readyTargets = targets.filter((target) =>
      shouldSendReminder(target, reminderState, now)
    );

    if (!readyTargets.length) continue;

    const nextReminderState = {
      ...reminderState,
      updatedAt: now,
    };

    let changed = false;

    for (const target of readyTargets) {
      const sent = await sendUserDm(client, userId, target);

      /*
        Mark as notified even if DM fails.
        This prevents spam every minute for users with closed DMs.
        When the cooldown is refreshed to a new timestamp, reminder can send again.
      */
      nextReminderState[target.key] = Number(target.readyAt || 0);
      changed = true;

      if (!sent) {
        console.warn(
          `[RESET REMINDER] Could not DM user ${userId} for ${target.type}. Marked as notified to prevent spam.`
        );
      }
    }

    if (!changed) continue;

    try {
      updatePlayerAtomic(
        userId,
        (freshPlayer) => ({
          ...freshPlayer,
          cooldownReminders: {
            ...getReminderState(freshPlayer),
            ...nextReminderState,
          },
        }),
        player?.username || "Unknown"
      );
    } catch (error) {
      console.error("[RESET REMINDER SAVE ERROR]", error);
    }
  }
}

async function sendGlobalPullResetNotification(client) {
  if (!RESET_CHANNEL_ID) {
    console.warn("[RESET REMINDER] Missing RESET_CHANNEL_ID.");
    return false;
  }

  const channel = await client.channels.fetch(RESET_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    console.warn("[RESET REMINDER] Reset channel was not found.");
    return false;
  }

  const roleMention = RESET_PING_ROLE_ID ? `<@&${RESET_PING_ROLE_ID}>` : "@Reset Ping";

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🔁 Pull Reset Is Now Live!")
    .setDescription(
      [
        "You can pull again in command channels!",
        "",
        "• Pull slots have been refreshed globally.",
        "• Use `op pull` or `op pa` if you have access.",
        "",
        `⏳ Next reset: ${formatDiscordTimestamp(getNextResetTime(Date.now()), "R")}`,
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Global Pull Reset",
    })
    .setTimestamp();

  await channel.send({
    content: `${roleMention} Reset is now live! You can pull in command channels!`,
    embeds: [embed],
    allowedMentions: RESET_PING_ROLE_ID
      ? {
          roles: [RESET_PING_ROLE_ID],
          repliedUser: false,
        }
      : {
          parse: [],
          repliedUser: false,
        },
  });

  return true;
}

function getGlobalResetState() {
  const players = readPlayers();
  const systemId = "__system__";
  const systemPlayer = players[systemId] || {};

  return {
    systemId,
    lastGlobalResetNotifiedAt: Number(
      systemPlayer?.resetReminders?.lastGlobalResetNotifiedAt || 0
    ),
  };
}

function saveGlobalResetState(nextResetAt) {
  updatePlayerAtomic(
    "__system__",
    (player) => ({
      ...player,
      username: "System",
      resetReminders: {
        ...(player.resetReminders || {}),
        lastGlobalResetNotifiedAt: Number(nextResetAt || 0),
        updatedAt: Date.now(),
      },
    }),
    "System"
  );
}

function scheduleNextGlobalReset(client) {
  const now = Date.now();
  const nextResetAt = getNextResetTime(now);
  const delay = Math.max(RESET_SEND_DELAY_MS, nextResetAt - now + RESET_SEND_DELAY_MS);

  if (globalResetTimer) {
    clearTimeout(globalResetTimer);
    globalResetTimer = null;
  }

  globalResetTimer = setTimeout(async () => {
    try {
      const state = getGlobalResetState();

      if (Number(state.lastGlobalResetNotifiedAt || 0) < nextResetAt) {
        const sent = await sendGlobalPullResetNotification(client);

        if (sent) {
          saveGlobalResetState(nextResetAt);
        }
      }
    } catch (error) {
      console.error("[GLOBAL RESET NOTIFICATION ERROR]", error);
    } finally {
      scheduleNextGlobalReset(client);
    }
  }, delay);
}

function startResetReminderService(client) {
  if (serviceStarted) {
    console.warn("[RESET REMINDER] Service already started. Skipping duplicate start.");
    return;
  }

  serviceStarted = true;

  scheduleNextGlobalReset(client);

  checkUserCooldownReminders(client).catch((error) => {
    console.error("[COOLDOWN REMINDER READY CHECK ERROR]", error);
  });

  userReminderInterval = setInterval(() => {
    checkUserCooldownReminders(client).catch((error) => {
      console.error("[COOLDOWN REMINDER INTERVAL ERROR]", error);
    });
  }, USER_REMINDER_CHECK_INTERVAL_MS);

  console.log("[RESET REMINDER] User cooldown reminders enabled.");
  console.log("[RESET REMINDER] Service started.");
}

module.exports = {
  startResetReminderService,
};