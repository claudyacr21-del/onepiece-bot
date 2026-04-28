const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const { readPlayers } = require("../playerStore");
const { getNextResetTime } = require("./pullReset");

const DATA_DIR = process.env.PLAYER_DATA_DIR || "/data";
const STATE_FILE = path.join(DATA_DIR, "reset-reminders.json");

const RESET_CHANNEL_ID = process.env.RESET_CHANNEL_ID || "";
const RESET_PING_ROLE_ID = process.env.RESET_PING_ROLE_ID || "";

const DAILY_CHECK_INTERVAL_MS = 60 * 1000;
const RESET_SEND_DELAY_MS = 3 * 1000;

function ensureStateFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify(
        {
          lastGlobalResetNotifiedAt: 0,
          userCooldowns: {},
        },
        null,
        2
      ),
      "utf8"
    );
  }
}

function readState() {
  ensureStateFile();

  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8").trim();
    return raw
      ? JSON.parse(raw)
      : {
          lastGlobalResetNotifiedAt: 0,
          userCooldowns: {},
        };
  } catch (error) {
    console.error("[RESET REMINDER STATE READ ERROR]", error);

    return {
      lastGlobalResetNotifiedAt: 0,
      userCooldowns: {},
    };
  }
}

function writeState(state) {
  ensureStateFile();

  const tempPath = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tempPath, STATE_FILE);
}

function formatDiscordTimestamp(timestampMs, style = "R") {
  return `<t:${Math.floor(Number(timestampMs || Date.now()) / 1000)}:${style}>`;
}

async function sendGlobalPullResetNotification(client) {
  if (!RESET_CHANNEL_ID) {
    console.warn("[RESET REMINDER] Missing RESET_CHANNEL_ID.");
    return;
  }

  const channel = await client.channels.fetch(RESET_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    console.warn("[RESET REMINDER] Reset channel was not found.");
    return;
  }

  const roleMention = RESET_PING_ROLE_ID ? `<@&${RESET_PING_ROLE_ID}>` : "@Reset Ping";

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🔄 Pull Reset Is Now Live!")
    .setDescription(
      [
        "🎯 You can pull again in commands channels!",
        "",
        "• Pull slots have been refreshed globally.",
        "• Use `op pull` or `op pa` if you have access.",
        "",
        `⏳ Next reset: ${formatDiscordTimestamp(getNextResetTime(Date.now()), "R")}`,
      ].join("\n")
    )
    .setFooter({ text: "One Piece Bot • Global Pull Reset" });

  await channel.send({
    content: `${roleMention} Reset is now live! You can pull in commands channels!`,
    embeds: [embed],
    allowedMentions: RESET_PING_ROLE_ID
      ? {
          roles: [RESET_PING_ROLE_ID],
        }
      : undefined,
  });
}

function scheduleNextGlobalReset(client) {
  const now = Date.now();
  const nextResetAt = getNextResetTime(now);
  const delay = Math.max(RESET_SEND_DELAY_MS, nextResetAt - now + RESET_SEND_DELAY_MS);

  setTimeout(async () => {
    try {
      const state = readState();

      if (Number(state.lastGlobalResetNotifiedAt || 0) < nextResetAt) {
        await sendGlobalPullResetNotification(client);

        state.lastGlobalResetNotifiedAt = nextResetAt;
        writeState(state);
      }
    } catch (error) {
      console.error("[GLOBAL RESET NOTIFICATION ERROR]", error);
    } finally {
      scheduleNextGlobalReset(client);
    }
  }, delay);
}

async function sendUserDm(client, userId, type) {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return false;

  const isDaily = type === "daily";

  const embed = new EmbedBuilder()
    .setColor(isDaily ? 0x2ecc71 : 0xe67e22)
    .setTitle(isDaily ? "🎁 Daily Reward Is Ready!" : "💎 Treasure Is Ready!")
    .setDescription(
      isDaily
        ? "Your daily reward cooldown is finished.\nUse `op daily` in the server to claim it."
        : "Your Mother Flame treasure cooldown is finished.\nUse `op treasure` in the server to claim it."
    )
    .setFooter({
      text: isDaily
        ? "One Piece Bot • Daily Reminder"
        : "One Piece Bot • Treasure Reminder",
    });

  await user.send({ embeds: [embed] }).catch(() => null);
  return true;
}

async function checkUserCooldownReminders(client) {
  const players = readPlayers();
  const state = readState();

  if (!state.userCooldowns || typeof state.userCooldowns !== "object") {
    state.userCooldowns = {};
  }

  const now = Date.now();
  let changed = false;

  for (const [userId, player] of Object.entries(players)) {
    const cooldowns = player?.cooldowns || {};
    const dailyReadyAt = Number(cooldowns.daily || 0);
    const treasureReadyAt = Number(cooldowns.treasure || 0);

    if (!state.userCooldowns[userId]) {
      state.userCooldowns[userId] = {};
    }

    const userState = state.userCooldowns[userId];

    if (
      dailyReadyAt > 0 &&
      dailyReadyAt <= now &&
      Number(userState.dailyNotifiedAt || 0) !== dailyReadyAt
    ) {
      await sendUserDm(client, userId, "daily");
      userState.dailyNotifiedAt = dailyReadyAt;
      changed = true;
    }

    if (
      treasureReadyAt > 0 &&
      treasureReadyAt <= now &&
      Number(userState.treasureNotifiedAt || 0) !== treasureReadyAt
    ) {
      await sendUserDm(client, userId, "treasure");
      userState.treasureNotifiedAt = treasureReadyAt;
      changed = true;
    }
  }

  if (changed) {
    writeState(state);
  }
}

function startResetReminderService(client) {
  scheduleNextGlobalReset(client);

  checkUserCooldownReminders(client).catch((error) => {
    console.error("[COOLDOWN REMINDER READY CHECK ERROR]", error);
  });

  setInterval(() => {
    checkUserCooldownReminders(client).catch((error) => {
      console.error("[COOLDOWN REMINDER INTERVAL ERROR]", error);
    });
  }, DAILY_CHECK_INTERVAL_MS);

  console.log("[RESET REMINDER] Service started.");
}

module.exports = {
  startResetReminderService,
};