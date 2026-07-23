const { Pool } = require("pg");
const { EmbedBuilder } = require("discord.js");
const { readPlayers } = require("../playerStore");
const {
  getCurrentResetStartTime,
  RESET_INTERVAL_HOURS,
} = require("./pullReset");

const RESET_CHANNEL_ID = process.env.RESET_CHANNEL_ID || "";
const RESET_PING_ROLE_ID = process.env.RESET_PING_ROLE_ID || "";

const USER_REMINDER_CHECK_INTERVAL_MS = Number(
  process.env.RESET_USER_REMINDER_CHECK_INTERVAL_MS || 60 * 1000
);

const RESET_SEND_DELAY_MS = 3 * 1000;

const RESET_INTERVAL_MS = RESET_INTERVAL_HOURS * 60 * 60 * 1000;
const RESET_CHECK_INTERVAL_MS = Number(
  process.env.RESET_GLOBAL_CHECK_INTERVAL_MS || 60 * 1000
);
const RESET_PING_GRACE_MS = Number(
  process.env.RESET_PING_GRACE_MS || 60 * 60 * 1000
);

function getCurrentGlobalResetAt(now = Date.now()) {
  const current = Number(getCurrentResetStartTime(now) || 0);

  if (!current || !Number.isFinite(current)) {
    return 0;
  }

  let resetAt = current;

  while (resetAt + RESET_INTERVAL_MS <= now) {
    resetAt += RESET_INTERVAL_MS;
  }

  return resetAt;
}

function getNextGlobalResetAt(now = Date.now()) {
  const current = getCurrentGlobalResetAt(now);

  if (!current) {
    return Date.now() + RESET_INTERVAL_MS;
  }

  let next = current + RESET_INTERVAL_MS;

  while (next <= now) {
    next += RESET_INTERVAL_MS;
  }

  return next;
}

let serviceStarted = false;
let globalResetTimer = null;
let globalResetCheckInterval = null;
let userReminderInterval = null;
let lastGlobalResetNoticeAt = 0;

let reminderPool = null;
let reminderDbReady = false;
let reminderDbInitStarted = false;

function getReminderPool() {
  if (!process.env.DATABASE_URL) return null;

  if (!reminderPool) {
    reminderPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    reminderPool.on("error", (error) => {
      console.error("[RESET REMINDER DB POOL ERROR]", error?.message || error);
      reminderDbReady = false;
    });
  }

  return reminderPool;
}

async function ensureReminderTables() {
  if (reminderDbReady) return true;
  if (reminderDbInitStarted) return false;

  const pool = getReminderPool();
  if (!pool) return false;

  reminderDbInitStarted = true;

  try {
    await pool.query(`
      create table if not exists cooldown_reminder_states (
        user_id text not null,
        reminder_type text not null,
        last_cooldown_at bigint not null default 0,
        last_notified_at bigint not null default 0,
        was_pending boolean not null default false,
        updated_at timestamptz not null default now(),
        primary key (user_id, reminder_type)
      );
    `);

    await pool.query(`
      create index if not exists cooldown_reminder_states_updated_at_idx
      on cooldown_reminder_states (updated_at);
    `);

    await pool.query(`
      create table if not exists cooldown_reminder_events (
        id bigserial primary key,
        user_id text not null,
        reminder_type text not null,
        ready_at bigint not null,
        sent_at timestamptz not null default now(),
        unique (user_id, reminder_type, ready_at)
      );
    `);

    await pool.query(`
      create index if not exists cooldown_reminder_events_user_idx
      on cooldown_reminder_events (user_id);
    `);

    await pool.query(`
      create index if not exists cooldown_reminder_events_sent_at_idx
      on cooldown_reminder_events (sent_at);
    `);

    await pool.query(`
      delete from cooldown_reminder_events
      where sent_at < now() - interval '30 days';
    `);

    reminderDbReady = true;
    console.log("[RESET REMINDER] Supabase reminder lock ready.");
    return true;
  } catch (error) {
    console.error("[RESET REMINDER DB INIT ERROR]", error);
    reminderDbReady = false;
    return false;
  } finally {
    reminderDbInitStarted = false;
  }
}

async function getReminderState(userId, reminderType) {
  try {
    const pool = getReminderPool();
    if (!pool) return null;

    if (!reminderDbReady) {
      await ensureReminderTables();
    }

    if (!reminderDbReady) return null;

    const result = await pool.query(
      `
      select user_id, reminder_type, last_cooldown_at, last_notified_at, was_pending
      from cooldown_reminder_states
      where user_id = $1 and reminder_type = $2
      limit 1
      `,
      [String(userId), String(reminderType)]
    );

    return result.rows?.[0] || null;
  } catch (error) {
    reminderDbReady = false;
    console.error("[RESET REMINDER GET STATE ERROR]", error?.message || error);
    return null;
  }
}

async function saveReminderState(userId, reminderType, patch = {}) {
  try {
    const pool = getReminderPool();
    if (!pool) return false;

    if (!reminderDbReady) {
      await ensureReminderTables();
    }

    if (!reminderDbReady) return false;

    const lastCooldownAt = Number(patch.lastCooldownAt || 0);
    const lastNotifiedAt = Number(patch.lastNotifiedAt || 0);
    const wasPending = Boolean(patch.wasPending);

    await pool.query(
      `
      insert into cooldown_reminder_states (
        user_id, reminder_type, last_cooldown_at, last_notified_at, was_pending, updated_at
      )
      values ($1, $2, $3, $4, $5, now())
      on conflict (user_id, reminder_type)
      do update set
        last_cooldown_at = excluded.last_cooldown_at,
        last_notified_at = excluded.last_notified_at,
        was_pending = excluded.was_pending,
        updated_at = now()
      `,
      [
        String(userId),
        String(reminderType),
        lastCooldownAt,
        lastNotifiedAt,
        wasPending,
      ]
    );

    return true;
  } catch (error) {
    reminderDbReady = false;
    console.error("[RESET REMINDER SAVE STATE ERROR]", error?.message || error);
    return false;
  }
}

async function claimReminderEventOnce(userId, reminderType, readyAt) {
  try {
    const pool = getReminderPool();
    const ready = Number(readyAt || 0);

    if (!pool || !userId || !reminderType || !ready) return false;

    if (!reminderDbReady) {
      await ensureReminderTables();
    }

    if (!reminderDbReady) return false;

    const result = await pool.query(
      `
      insert into cooldown_reminder_events (user_id, reminder_type, ready_at)
      values ($1, $2, $3)
      on conflict (user_id, reminder_type, ready_at)
      do nothing
      returning id
      `,
      [String(userId), String(reminderType), ready]
    );

    return result.rowCount > 0;
  } catch (error) {
    reminderDbReady = false;
    console.error("[RESET REMINDER CLAIM EVENT ERROR]", error?.message || error);
    return false;
  }
}

async function shouldSendGlobalResetNotification(resetAt) {
  const readyAt = Number(resetAt || 0);

  if (!readyAt) {
    return false;
  }

  if (lastGlobalResetNoticeAt === readyAt) {
    return false;
  }

  let claimed = false;

  try {
    claimed = await claimReminderEventOnce("__global__", "pull_reset", readyAt);
  } catch (error) {
    console.error("[GLOBAL RESET CLAIM ERROR]", error);
  }

  if (!claimed) {
    console.warn(
      `[RESET REMINDER] Global reset notification already claimed or DB lock unavailable for ${readyAt}. Skipping send to prevent reload spam.`
    );
    return false;
  }

  return true;
}

function formatDiscordTimestamp(timestampMs, style = "R") {
  const ms = Number(timestampMs || 0);

  if (!Number.isFinite(ms) || ms <= 0) {
    return "Unknown";
  }

  const seconds = Math.floor(ms / 1000);
  const safeStyle = String(style || "R").replace(/[^tTdDfFR]/g, "") || "R";

  return `<t:${seconds}:${safeStyle}>`;
}

function getCooldownTargets(player) {
  const cooldowns = player?.cooldowns || {};

  return [
    {
      type: "daily",
      readyAt: Number(cooldowns.daily || 0),
      title: "🎁 Daily Reward Is Ready!",
      description:
        "Your daily reward cooldown is finished.\nUse `op daily` in the server to claim it.",
      color: 0x2ecc71,
      footer: "One Piece Bot • Daily Reminder",
    },
    {
      type: "vote",
      readyAt: Number(cooldowns.vote || 0),
      title: "🗳️ Vote Is Ready!",
      description:
        "Your Top.gg vote cooldown is finished.\nUse `op vote` in the server, then vote again to claim the reward.",
      color: 0x8e44ad,
      footer: "One Piece Bot • Vote Reminder",
    },
    {
      type: "treasure",
      readyAt: Number(cooldowns.treasure || 0),
      title: "🧰 Treasure Is Ready!",
      description:
        "Your Mother Flame treasure cooldown is finished.\nUse `op treasure` in the server to claim it.",
      color: 0xe67e22,
      footer: "One Piece Bot • Treasure Reminder",
    },
  ];
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

async function handleReminderTarget(client, userId, target, now) {
  const readyAt = Number(target.readyAt || 0);

  if (!readyAt) {
    return;
  }

  const state = await getReminderState(userId, target.type);

  const lastCooldownAt = Number(state?.last_cooldown_at || 0);
  const lastNotifiedAt = Number(state?.last_notified_at || 0);
  const wasPending = Boolean(state?.was_pending);

  /*
    Kalau cooldown masih jalan:
    - Simpan/arm reminder dengan timestamp cooldown itu.
    - Nanti setelah timestamp ini selesai, baru boleh kirim 1x.
  */
  if (readyAt > now) {
    if (!state || lastCooldownAt !== readyAt || !wasPending) {
      await saveReminderState(userId, target.type, {
        lastCooldownAt: readyAt,
        lastNotifiedAt,
        wasPending: true,
      });
    }

    return;
  }

  /*
    Kalau bot baru start dan cooldown sudah ready dari awal:
    - Jangan kirim reminder.
    - Tandai sudah tidak pending supaya tidak spam player yang op cd-nya sudah "Now".
  */
  if (!state) {
    await saveReminderState(userId, target.type, {
      lastCooldownAt: readyAt,
      lastNotifiedAt: readyAt,
      wasPending: false,
    });

    return;
  }

  /*
    Reminder hanya dikirim kalau:
    - Sebelumnya cooldown ini pernah terdeteksi sedang pending.
    - Timestamp cooldown yang selesai sama dengan timestamp yang di-arm.
    - Timestamp ini belum pernah dinotifikasi.
  */
  const shouldSend =
    wasPending &&
    lastCooldownAt === readyAt &&
    lastNotifiedAt !== readyAt &&
    readyAt <= now;

  if (!shouldSend) {
    if (lastNotifiedAt !== readyAt || wasPending) {
      await saveReminderState(userId, target.type, {
        lastCooldownAt: readyAt,
        lastNotifiedAt: Math.max(lastNotifiedAt, readyAt),
        wasPending: false,
      });
    }

    return;
  }

  const claimed = await claimReminderEventOnce(userId, target.type, readyAt);

  if (!claimed) {
    await saveReminderState(userId, target.type, {
      lastCooldownAt: readyAt,
      lastNotifiedAt: readyAt,
      wasPending: false,
    });

    return;
  }

  const sent = await sendUserDm(client, userId, target);

  await saveReminderState(userId, target.type, {
    lastCooldownAt: readyAt,
    lastNotifiedAt: readyAt,
    wasPending: false,
  });

  if (!sent && String(process.env.RESET_REMINDER_DEBUG || "false").toLowerCase() === "true") {
    console.warn(
      `[RESET REMINDER] Could not DM user ${userId} for ${target.type}. Marked as notified to prevent spam.`
    );
  }
}

async function checkUserCooldownReminders(client) {
    if (String(process.env.RESET_REMINDER_USER_CHECK_ENABLED || "false").toLowerCase() !== "true") {
      return;
    }
  const players = readPlayers();
  const now = Date.now();

  for (const [userId, player] of Object.entries(players || {})) {
    if (userId === "__system__" || userId === "__global__") continue;

    const targets = getCooldownTargets(player);

    for (const target of targets) {
      try {
        await handleReminderTarget(client, userId, target, now);
      } catch (error) {
        console.error(
          `[RESET REMINDER USER CHECK ERROR] user=${userId} type=${target.type}`,
          error
        );
      }
    }
  }
}

async function sendGlobalPullResetNotification(client, resetAt = Date.now()) {
  if (!client) {
    console.warn("[RESET REMINDER] Missing Discord client.");
    return false;
  }

  if (!RESET_CHANNEL_ID) {
    console.warn("[RESET REMINDER] Missing RESET_CHANNEL_ID.");
    return false;
  }

  const readyState = {
    readyAt: client.readyAt ? client.readyAt.toISOString?.() || String(client.readyAt) : "null",
    wsStatus: client.ws?.status ?? "unknown",
    uptime: client.uptime ?? 0,
  };

  if (typeof client.isReady === "function" && !client.isReady()) {
    console.warn(
      `[RESET REMINDER] Client isReady=false, but will try channel fetch anyway. readyAt=${readyState.readyAt} wsStatus=${readyState.wsStatus} uptime=${readyState.uptime}`
    );
  }

  const channel = await client.channels
    .fetch(RESET_CHANNEL_ID, {
      force: true,
    })
    .catch((error) => {
      console.error(
        "[RESET REMINDER] Failed to fetch reset channel:",
        error?.message || error
      );
      return null;
    });

  if (!channel || !channel.isTextBased()) {
    console.warn(
      `[RESET REMINDER] Reset channel was not found or is not text based: ${RESET_CHANNEL_ID}`
    );
    return false;
  }

  const resetTimestamp = formatDiscordTimestamp(resetAt, "t");
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
        `🕒 Reset cycle: every **${RESET_INTERVAL_HOURS} hours**`,
        `📌 Reset time: ${resetTimestamp}`,
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Global Pull Reset",
    })
    .setTimestamp(new Date(resetAt));

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

  console.log(
    `[RESET REMINDER] Global pull reset notification sent. channel=${RESET_CHANNEL_ID} resetAt=${resetAt}`
  );

  return true;
}

async function checkAndSendGlobalResetNotification(
  client,
  reason = "interval",
  forcedResetAt = null
) {
  const now = Date.now();
  const currentResetAt = Number(forcedResetAt || getCurrentGlobalResetAt(now));

  if (!currentResetAt) {
    console.warn("[RESET REMINDER] Could not resolve current global reset time.");
    return false;
  }

  /*
    Important:
    - Startup / interval checks must NOT send old reset pings after bot reload.
    - Only the scheduled timer is allowed to send the reset ping.
    - If the reset time already passed while the bot was offline, skip it.
  */
  if (!forcedResetAt && reason !== "timer") {
    return false;
  }

  const resetAgeMs = now - currentResetAt;

  if (resetAgeMs < RESET_SEND_DELAY_MS) {
    return false;
  }

  if (resetAgeMs > RESET_PING_GRACE_MS && !forcedResetAt) {
    return false;
  }

  const shouldSend = await shouldSendGlobalResetNotification(currentResetAt);

  if (!shouldSend) {
    return false;
  }

  const sent = await sendGlobalPullResetNotification(client, currentResetAt);

  if (!sent) {
    console.warn(
      `[RESET REMINDER] Global reset notification not sent via ${reason}. It will not spam on reload.`
    );
    return false;
  }

  lastGlobalResetNoticeAt = currentResetAt;

  console.log(
    `[RESET REMINDER] Global reset notification marked sent. resetAt=${currentResetAt} reason=${reason}`
  );

  return true;
}

function startGlobalResetChecker(client) {
  if (globalResetCheckInterval) {
    clearInterval(globalResetCheckInterval);
    globalResetCheckInterval = null;
  }

  /*
    Do not send global reset ping on startup.
    Startup checks caused old reset pings to be sent again after bot reload.
    Future reset pings are handled by scheduleNextGlobalReset().
  */
  globalResetCheckInterval = setInterval(() => {
    checkAndSendGlobalResetNotification(client, "interval").catch((error) => {
      console.error("[GLOBAL RESET INTERVAL CHECK ERROR]", error);
    });
  }, RESET_CHECK_INTERVAL_MS);

  console.log(
    `[RESET REMINDER] Global reset checker started. checkEvery=${Math.round(
      RESET_CHECK_INTERVAL_MS / 1000
    )}s grace=${Math.round(RESET_PING_GRACE_MS / 1000)}s startupSend=false.`
  );
}

function scheduleNextGlobalReset(client) {
  const now = Date.now();
  const nextResetAt = getNextGlobalResetAt(now);
  const delay = Math.max(
    RESET_SEND_DELAY_MS,
    nextResetAt - now + RESET_SEND_DELAY_MS
  );

  if (globalResetTimer) {
    clearTimeout(globalResetTimer);
    globalResetTimer = null;
  }

  const nextResetWib = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(nextResetAt));

  console.log(
    `[RESET REMINDER] Next global reset ping scheduled in ${Math.round(
      delay / 1000
    )}s for ${new Date(nextResetAt).toISOString()} / ${nextResetWib} WIB every ${RESET_INTERVAL_HOURS}h.`
  );

  globalResetTimer = setTimeout(async () => {
    try {
      await checkAndSendGlobalResetNotification(
        client,
        "timer",
        Number(nextResetAt)
      );
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

  ensureReminderTables().catch((error) => {
    console.error("[RESET REMINDER TABLE INIT ERROR]", error);
  });

  scheduleNextGlobalReset(client);
  startGlobalResetChecker(client);

  checkUserCooldownReminders(client).catch((error) => {
    console.error("[COOLDOWN REMINDER READY CHECK ERROR]", error);
  });

  userReminderInterval = setInterval(() => {
    checkUserCooldownReminders(client).catch((error) => {
      console.error("[COOLDOWN REMINDER INTERVAL ERROR]", error);
    });
  }, USER_REMINDER_CHECK_INTERVAL_MS);

  console.log("[RESET REMINDER] User cooldown reminders enabled for daily/vote/treasure only.");
  console.log("[RESET REMINDER] Reminder triggers only once after a tracked cooldown finishes.");
  console.log("[RESET REMINDER] Service started.");
  console.log(
    `[RESET REMINDER] Global channel=${RESET_CHANNEL_ID || "missing"} role=${
      RESET_PING_ROLE_ID || "missing"
    } interval=${RESET_INTERVAL_HOURS}h schedule=00:00/08:00/16:00 WIB.`
  );
}

module.exports = {
  startResetReminderService,
};