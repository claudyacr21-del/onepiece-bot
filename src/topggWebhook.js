const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("./playerStore");

let serverStarted = false;

const VOTE_BERRY_REWARD = 5000;
const VOTE_PULL_RESET_REWARD = 1;
const DISCORDLIST_LEGEND_BOX_REWARD = 2;
const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const RAID_TICKET_STREAK_TARGET = 25;

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

function getDiscordListToken(req) {
  const authorization = String(
    req?.get?.("Authorization") ||
      req?.get?.("authorization") ||
      req?.headers?.authorization ||
      req?.headers?.["x-webhook-signature"] ||
      req?.headers?.["x-signature"] ||
      ""
  )
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (authorization) {
    return authorization;
  }

  const body = req?.body;

  if (typeof body === "string") {
    return body.trim();
  }

  return String(
    body?.token ||
      body?.jwt ||
      body?.authorization ||
      body?.data?.token ||
      body?.data?.jwt ||
      ""
  ).trim();
}

function verifyDiscordListPayload(req) {
  const secret = String(
    process.env.DISCORDLIST_WEBHOOK_SECRET || ""
  ).trim();

  if (!secret) {
    throw new Error(
      "DISCORDLIST_WEBHOOK_SECRET is not configured."
    );
  }

  const token = getDiscordListToken(req);

  if (!token) {
    console.log("[DISCORDLIST] Request parsing debug:", {
      bodyType: typeof req?.body,
      bodyLength:
        typeof req?.body === "string"
          ? req.body.length
          : 0,
      contentType:
        req?.headers?.["content-type"] || null,
      authorizationHeader:
        Boolean(req?.headers?.authorization),
    });

    throw new Error(
      "DiscordList JWT token was not found in the request body."
    );
  }

  return jwt.verify(token, secret, {
    algorithms: ["HS256"],
  });
}

function getDiscordListUserId(payload) {
  const candidates = [
    payload?.data?.user,
    payload?.data?.voter,

    payload?.data?.user?.platform_id,
    payload?.data?.user?.discord_id,
    payload?.data?.user?.discordId,
    payload?.data?.user?.id,

    payload?.data?.voter?.platform_id,
    payload?.data?.voter?.discord_id,
    payload?.data?.voter?.discordId,
    payload?.data?.voter?.id,

    payload?.data?.user_id,
    payload?.data?.userId,
    payload?.data?.voter_id,
    payload?.data?.voterId,

    payload?.user,
    payload?.voter,

    payload?.user?.platform_id,
    payload?.user?.discord_id,
    payload?.user?.discordId,
    payload?.user?.id,

    payload?.voter?.platform_id,
    payload?.voter?.discord_id,
    payload?.voter?.discordId,
    payload?.voter?.id,

    payload?.user_id,
    payload?.userId,
    payload?.voter_id,
    payload?.voterId,

    payload?.discord_id,
    payload?.discordId,
    payload?.sub,
  ];

  const found = candidates.find((value) => {
    return /^\d{15,25}$/.test(
      String(value || "").trim()
    );
  });

  return found
    ? String(found).trim()
    : "";
}

function getDiscordListEventId(payload, userId) {
  const eventId =
    payload?.data?.id ||
    payload?.data?.event_id ||
    payload?.data?.eventId ||
    payload?.data?.vote_id ||
    payload?.data?.voteId ||
    payload?.event_id ||
    payload?.eventId ||
    payload?.vote_id ||
    payload?.voteId ||
    payload?.jti ||
    payload?.id ||
    "";

  if (eventId) {
    return String(eventId);
  }

  const timestamp =
    payload?.data?.created_at ||
    payload?.data?.createdAt ||
    payload?.data?.timestamp ||
    payload?.created_at ||
    payload?.createdAt ||
    payload?.timestamp ||
    payload?.iat ||
    Date.now();

  return `${userId}:${timestamp}`;
}

function getDiscordListUsername(payload) {
  return String(
    payload?.data?.user?.username ||
      payload?.data?.user?.name ||
      payload?.data?.voter?.username ||
      payload?.data?.voter?.name ||
      payload?.user?.username ||
      payload?.user?.name ||
      payload?.voter?.username ||
      payload?.voter?.name ||
      payload?.username ||
      "Unknown"
  );
}

function addBox(list, box) {
  const boxes = Array.isArray(list)
    ? list.map((entry) => ({ ...entry }))
    : [];

  const index = boxes.findIndex(
    (entry) =>
      String(entry?.code || "").toLowerCase() ===
      String(box?.code || "").toLowerCase()
  );

  if (index === -1) {
    boxes.push({
      code: box.code,
      name: box.name,
      amount: Math.max(
        1,
        Math.floor(Number(box.amount || 1))
      ),
      rarity: box.rarity || "S",
      type: box.type || "Box",
    });

    return boxes;
  }

  boxes[index] = {
    ...boxes[index],
    amount:
      Math.max(
        0,
        Math.floor(Number(boxes[index].amount || 0))
      ) +
      Math.max(
        1,
        Math.floor(Number(box.amount || 1))
      ),
  };

  return boxes;
}

async function sendDiscordListVoteDm(
  client,
  userId,
  reward
) {
  try {
    const user = await client.users.fetch(userId);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("DiscordList.gg Vote Reward")
      .setDescription(
        [
          "✅ Thanks for voting for One Piece Bot on DiscordList.gg!",
          "",
          `📦 Legend Resource Box: +${Number(
            reward.legendBoxes || 0
          ).toLocaleString("en-US")}`,
          "",
          `Total DiscordList Votes: ${Number(
            reward.totalVotes || 0
          ).toLocaleString("en-US")}`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • DiscordList.gg",
      });

    await user.send({
      embeds: [embed],
    });
  } catch (error) {
    console.warn(
      "[DISCORDLIST] Failed to send vote DM:",
      error?.message || error
    );
  }
}

async function handleDiscordListVote(
  client,
  payload
) {
  const userId = getDiscordListUserId(payload);

  if (!userId) {
    console.warn(
      "[DISCORDLIST] Missing Discord user ID.",
      {
        payloadKeys: Object.keys(payload || {}),
        dataKeys: Object.keys(payload?.data || {}),
        payload,
      }
    );

    return {
      ok: false,
      reason: "missing_user_id",
    };
  }

  const eventId = getDiscordListEventId(
    payload,
    userId
  );

  const username =
    getDiscordListUsername(payload);

  let reward = null;
  let duplicate = false;

  updatePlayerAtomic(
    userId,
    (fresh) => {
      const previous =
        fresh?.discordListVote &&
        typeof fresh.discordListVote === "object"
          ? fresh.discordListVote
          : {};

      const processedIds = Array.isArray(
        previous.processedIds
      )
        ? previous.processedIds.map(String)
        : [];

      if (
        eventId &&
        processedIds.includes(String(eventId))
      ) {
        duplicate = true;
        return fresh;
      }

      const now = Date.now();
      const nextTotalVotes =
        Math.max(
          0,
          Math.floor(Number(previous.totalVotes || 0))
        ) + 1;

      const nextBoxes = addBox(
        fresh.boxes,
        {
          code: "legend_resource_box",
          name: "Legend Resource Box",
          amount: DISCORDLIST_LEGEND_BOX_REWARD,
          rarity: "S",
          type: "Box",
        }
      );

      const nextProcessedIds = eventId
        ? [
            ...processedIds,
            String(eventId),
          ].slice(-100)
        : processedIds.slice(-100);

      reward = {
        legendBoxes:
          DISCORDLIST_LEGEND_BOX_REWARD,

        totalVotes:
          nextTotalVotes,
      };

      return {
        ...fresh,

        username:
          fresh.username ||
          username,

        boxes:
          nextBoxes,

        discordListVote: {
          totalVotes:
            nextTotalVotes,

          lastVoteAt:
            now,

          cooldownUntil:
            now + VOTE_COOLDOWN_MS,

          lastEventId:
            String(eventId || ""),

          processedIds:
            nextProcessedIds,
        },
      };
    },
    username
  );

  if (duplicate) {
    console.log(
      "[DISCORDLIST] Duplicate vote ignored:",
      {
        userId,
        eventId,
      }
    );

    return {
      ok: true,
      duplicate: true,
    };
  }

  if (!reward) {
    console.warn(
      "[DISCORDLIST] Vote reward was not generated:",
      {
        userId,
        eventId,
      }
    );

    return {
      ok: false,
      reason: "reward_not_generated",
    };
  }

  await sendDiscordListVoteDm(
    client,
    userId,
    reward
  );

  console.log(
    "[DISCORDLIST] Vote reward granted:",
    {
      userId,
      eventId,
      legendBoxes:
        DISCORDLIST_LEGEND_BOX_REWARD,
    }
  );

  return {
    ok: true,
    duplicate: false,
    userId,
    eventId,
    reward,
  };
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
          ...(Number(reward.raidTickets || 0) > 0
            ? [
                "",
                "🎉 **Vote Streak Bonus Unlocked!**",
                `🎫 Raid Ticket: +${reward.raidTickets}`,
              ]
            : []),
          "",
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

      let updatedTickets = addTicket(fresh.tickets || [], {
        code: "pull_reset_ticket",
        name: "Pull Reset Ticket",
        amount: VOTE_PULL_RESET_REWARD,
        rarity: "A",
        type: "Ticket",
      });

      const raidTicketReward =
        nextStreak > 0 && nextStreak % RAID_TICKET_STREAK_TARGET === 0 ? 1 : 0;

      if (raidTicketReward > 0) {
        updatedTickets = addTicket(updatedTickets, {
          code: "raid_ticket",
          name: "Raid Ticket",
          amount: raidTicketReward,
          rarity: "A",
          type: "Ticket",
        });
      }

      const nextProcessedIds = eventId
        ? [...processedIds, eventId].slice(-50)
        : processedIds.slice(-50);

      reward = {
        berries: VOTE_BERRY_REWARD,
        pullResetTickets: VOTE_PULL_RESET_REWARD,
        raidTickets: raidTicketReward,
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
    raidTickets: reward.raidTickets,
    ignoredWeight: body?.data?.weight || body?.isWeekend || null,
    cooldownUntil: reward.cooldownUntil,
  });
}

function startTopggWebhookServer(client) {
  if (serverStarted) return;
  serverStarted = true;

  const app = express();

  app.use(
    express.text({
      type: [
        "text/plain",
        "application/jwt",
        "application/octet-stream",
      ],
      limit: "2mb",
    })
  );

  app.use(
    express.json({
      limit: "2mb",
    })
  );

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

  app.post("/discordlist", async (req, res) => {
    try {
      console.log(
        "[DISCORDLIST] Webhook body received:",
        {
          bodyType: typeof req.body,
          bodyLength:
            typeof req.body === "string"
              ? req.body.length
              : 0,
          contentType:
            req.headers?.["content-type"] || null,
        }
      );

      const payload =
        verifyDiscordListPayload(req);

      console.log(
        "[DISCORDLIST] Verified payload:",
        JSON.stringify(payload)
      );

      const payloadType = String(
        payload?.type ||
          payload?.event ||
          payload?.data?.type ||
          payload?.data?.event ||
          ""
      ).toLowerCase();

      const isTest =
        payloadType.includes("test") ||
        payload?.test === true ||
        payload?.data?.test === true;

      if (isTest) {
        console.log(
          "[DISCORDLIST] Webhook test accepted."
        );

        return res.status(200).json({
          ok: true,
          test: true,
        });
      }

      const result =
        await handleDiscordListVote(
          client,
          payload
        );

      if (!result?.ok) {
        console.warn(
          "[DISCORDLIST] Vote was accepted but no reward was granted:",
          result
        );

        return res.status(200).json({
          ok: true,
          processed: false,
          reason:
            result?.reason ||
            "unknown_payload",
        });
      }

      return res.status(200).json({
        ok: true,
        processed: true,
        duplicate:
          Boolean(result.duplicate),
      });
    } catch (error) {
      console.error(
        "[DISCORDLIST] Webhook error:",
        error?.stack ||
          error?.message ||
          error
      );

      return res.status(200).json({
        ok: false,
        error:
          error?.message ||
          "invalid_webhook",
      });
    }
  });

  const port = Number(process.env.PORT || process.env.WEBHOOK_PORT || 10000);
  const host = "0.0.0.0";

  app.listen(port, host, () => {
    console.log(`[WEB] Listening on ${host}:${port}`);
    console.log(
      `[TOPGG] Webhook endpoint ready at /topgg`
    );

    console.log(
      `[DISCORDLIST] Webhook endpoint ready at /discordlist`
    );
  });
}

module.exports = {
  startTopggWebhookServer,
};