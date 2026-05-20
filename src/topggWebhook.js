const express = require("express");
const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("./playerStore");

let serverStarted = false;

const VOTE_BERRY_REWARD = 5000;
const VOTE_PULL_RESET_REWARD = 1;
const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000;

function getDataDir() {
  return process.env.PLAYER_DATA_DIR || "/data";
}

function addTicket(list, ticket) {
  const arr = Array.isArray(list) ? [...list] : [];

  const index = arr.findIndex((entry) => String(entry.code) === String(ticket.code));

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + Number(ticket.amount || 1),
    };
    return arr;
  }

  arr.push({
    code: ticket.code,
    name: ticket.name,
    amount: Number(ticket.amount || 1),
    rarity: ticket.rarity,
    type: ticket.type,
  });

  return arr;
}

function getVoteUserId(body) {
  return (
    body?.data?.user?.platform_id ||
    body?.data?.user?.id ||
    body?.user ||
    body?.userId ||
    body?.user_id ||
    null
  );
}

function getVoteEventId(body, userId) {
  return (
    body?.data?.id ||
    body?.id ||
    body?.voteId ||
    `${userId}:${body?.data?.created_at || body?.created_at || body?.query || Date.now()}`
  );
}

function isVotePayload(body) {
  if (!body || typeof body !== "object") return false;

  if (body.type === "vote.create") return true;
  if (body.type === "upvote") return true;
  if (body.event === "vote.create") return true;

  return false;
}

function isTestPayload(body) {
  if (!body || typeof body !== "object") return false;

  if (body.type === "webhook.test") return true;
  if (body.type === "test") return true;
  if (body.event === "webhook.test") return true;

  return false;
}

function checkAuthorization(req) {
  const expected = process.env.TOPGG_WEBHOOK_AUTH;

  if (!expected) return true;

  const received =
    req.get("Authorization") ||
    req.get("authorization") ||
    req.get("X-TopGG-Authorization") ||
    req.get("x-topgg-authorization") ||
    "";

  return String(received) === String(expected);
}

async function sendVoteDm(client, userId, reward) {
  try {
    const user = await client.users.fetch(userId);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setDescription(
        [
          "✅ Thanks for voting for One Piece Bot!",
          "",
          `💰 Berries: +${reward.berries.toLocaleString("en-US")}`,
          `🎟️ Pull Reset Ticket: +${reward.pullResetTickets}`,
          `🔥 Vote Streak: ${reward.streak}`,
          `🗳️ Total Votes: ${reward.totalVotes}`,
        ].join("\n")
      );

    await user.send({ embeds: [embed] });
  } catch (error) {
    console.warn("[TOPGG] Failed to send vote DM:", error?.message || error);
  }
}

async function handleVote(client, body) {
  const userId = getVoteUserId(body);

  if (!userId) {
    console.warn("[TOPGG] Missing user id:", body);
    return;
  }

  const eventId = getVoteEventId(body, userId);
  const username =
    body?.data?.user?.name ||
    body?.data?.user?.username ||
    body?.username ||
    body?.userName ||
    "Unknown";

  let reward = null;
  let duplicate = false;

  updatePlayerAtomic(
    userId,
    (fresh) => {
      const previousVote = fresh.vote || {};
      const processedIds = Array.isArray(previousVote.processedIds)
        ? previousVote.processedIds
        : [];

      if (eventId && processedIds.includes(eventId)) {
        duplicate = true;
        return fresh;
      }

      const now = Date.now();
      const lastVoteAt = Number(previousVote.lastVoteAt || 0);
      const streakExpired = lastVoteAt > 0 && now - lastVoteAt > 36 * 60 * 60 * 1000;

      const nextStreak = streakExpired ? 1 : Number(previousVote.streak || 0) + 1;
      const nextTotalVotes = Number(previousVote.totalVotes || 0) + 1;

      const updatedTickets = addTicket(fresh.tickets || [], {
        code: "pull_reset_ticket",
        name: "Pull Reset Ticket",
        amount: VOTE_PULL_RESET_REWARD,
        rarity: "A",
        type: "Ticket",
      });

      const nextProcessedIds = eventId
        ? [...processedIds, eventId].slice(-50)
        : processedIds.slice(-50);

      reward = {
        berries: VOTE_BERRY_REWARD,
        pullResetTickets: VOTE_PULL_RESET_REWARD,
        streak: nextStreak,
        totalVotes: nextTotalVotes,
        cooldownUntil: now + VOTE_COOLDOWN_MS,
      };

      return {
        ...fresh,
        username: fresh.username || username,
        berries: Number(fresh.berries || 0) + VOTE_BERRY_REWARD,
        tickets: updatedTickets,
        cooldowns: {
          ...(fresh.cooldowns || {}),
          vote: now + VOTE_COOLDOWN_MS,
        },
        vote: {
          streak: nextStreak,
          totalVotes: nextTotalVotes,
          lastVoteAt: now,
          processedIds: nextProcessedIds,
          lastEventId: eventId,
        },
      };
    },
    username
  );

  if (duplicate) {
    console.log("[TOPGG] Duplicate vote ignored:", eventId);
    return;
  }

  if (!reward) {
    console.warn("[TOPGG] Vote reward was not generated:", { userId, eventId });
    return;
  }

  await sendVoteDm(client, userId, reward);

  console.log("[TOPGG] Vote reward granted:", {
    userId,
    eventId,
    berries: VOTE_BERRY_REWARD,
    pullResetTickets: VOTE_PULL_RESET_REWARD,
    ignoredWeight: body?.data?.weight || body?.isWeekend || null,
    cooldownUntil: reward.cooldownUntil,
  });
}

function startTopggWebhookServer(client) {
  if (serverStarted) return;
  serverStarted = true;

  const app = express();

  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_, res) => {
    res.status(200).send("onepiece-bot ok");
  });

  app.get("/health", (_, res) => {
    res.status(200).json({
      ok: true,
      bot: client?.user?.tag || null,
      hosting: "render",
      store: process.env.PLAYER_STORE_MODE || "file",
    });
  });

  app.get("/healthz", (_, res) => {
    res.status(200).json({
      ok: true,
      bot: client?.user?.tag || null,
      hosting: "render",
      store: process.env.PLAYER_STORE_MODE || "file",
    });
  });

  app.get("/backup-players", (req, res) => {
    try {
      const backupToken = process.env.BACKUP_TOKEN || "";

      if (!backupToken || req.query.token !== backupToken) {
        return res.status(403).send("Forbidden");
      }

      const dataDir = getDataDir();
      const filePath = path.join(dataDir, "players.json");

      if (!fs.existsSync(filePath)) {
        return res.status(404).send(`players.json not found at ${filePath}`);
      }

      return res.download(filePath, "players.json");
    } catch (error) {
      console.error("[BACKUP PLAYERS ERROR]", error);
      return res.status(500).send(String(error?.stack || error));
    }
  });

  app.get("/backup-lastgood", (req, res) => {
    try {
      const backupToken = process.env.BACKUP_TOKEN || "";

      if (!backupToken || req.query.token !== backupToken) {
        return res.status(403).send("Forbidden");
      }

      const dataDir = getDataDir();
      const filePath = path.join(dataDir, "players.json.lastgood.bak");

      if (!fs.existsSync(filePath)) {
        return res.status(404).send(`players.json.lastgood.bak not found at ${filePath}`);
      }

      return res.download(filePath, "players.json.lastgood.bak");
    } catch (error) {
      console.error("[BACKUP LASTGOOD ERROR]", error);
      return res.status(500).send(String(error?.stack || error));
    }
  });

  app.post("/topgg", async (req, res) => {
    try {
      if (!checkAuthorization(req)) {
        console.warn("[TOPGG] Unauthorized webhook request.");
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const body = req.body || {};
      console.log("[TOPGG] Vote payload received:", body);

      if (isTestPayload(body)) {
        return res.status(200).json({ ok: true, test: true });
      }

      if (!isVotePayload(body)) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      await handleVote(client, body);

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[TOPGG] Webhook error:", error);
      return res.status(200).json({ ok: false, error: "handled" });
    }
  });

  const port = Number(process.env.PORT || process.env.WEBHOOK_PORT || 10000);
  const host = "0.0.0.0";

  app.listen(port, host, () => {
    console.log(`[WEB] Listening on ${host}:${port}`);
    console.log(`[TOPGG] Webhook endpoint ready at /topgg`);
  });
}

module.exports = {
  startTopggWebhookServer,
};