const express = require("express");
const { getPlayer, updatePlayer } = require("./playerStore");

let serverStarted = false;

const BOT_ID = "1492759342972407869";
const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const DUPLICATE_GUARD_MS = 11 * 60 * 60 * 1000;

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const idx = arr.findIndex((x) => String(x.code) === String(item.code));

  if (idx !== -1) {
    arr[idx] = {
      ...arr[idx],
      amount: Number(arr[idx].amount || 0) + Number(item.amount || 1),
    };
    return arr;
  }

  arr.push({ ...item, amount: Number(item.amount || 1) });
  return arr;
}

function getDiscordUserId(payload) {
  return (
    payload?.data?.user?.platform_id ||
    payload?.data?.user?.id ||
    payload?.user ||
    payload?.userId ||
    null
  );
}

function getDiscordUsername(payload) {
  return payload?.data?.user?.name || "Unknown";
}

function isTestWebhook(payload) {
  return String(payload?.type || "").toLowerCase() === "webhook.test";
}

function isVoteWebhook(payload) {
  return (
    String(payload?.type || "").toLowerCase() === "vote.create" ||
    Boolean(payload?.user) ||
    Boolean(payload?.data?.user?.platform_id)
  );
}

async function notifyUser(client, userId, message) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(message);
  } catch (_) {}
}

function pickRandomStreakBox() {
  const randomBoxes = [
    {
      code: "basic_resource_box",
      name: "Basic Resource Box",
      amount: 2,
      rarity: "C",
      type: "Box",
    },
    {
      code: "treasure_material_pack",
      name: "Treasure Material Pack",
      amount: 2,
      rarity: "B",
      type: "Box",
    },
    {
      code: "rare_resource_box",
      name: "Rare Resource Box",
      amount: 1,
      rarity: "A",
      type: "Box",
    },
  ];

  return randomBoxes[Math.floor(Math.random() * randomBoxes.length)];
}

function applyVoteReward(player, weight = 1) {
  const vote = player.vote || {};
  const now = Date.now();
  const safeWeight = Math.max(1, Number(weight || 1));

  const currentStreak = Number(vote.streak || 0) + safeWeight;
  const totalVotes = Number(vote.totalVotes || 0) + safeWeight;

  let tickets = [...(player.tickets || [])];
  let boxes = [...(player.boxes || [])];

  const baseBerries = 5000 * safeWeight;

  tickets = addOrIncrease(tickets, {
    code: "pull_reset_ticket",
    name: "Pull Reset Ticket",
    amount: safeWeight,
    rarity: "A",
    type: "Ticket",
  });

  let bonusText = "";

  if (currentStreak > 0 && currentStreak % 20 === 0) {
    const pickedBox = pickRandomStreakBox();
    boxes = addOrIncrease(boxes, pickedBox);
    bonusText = `\n🎁 20 vote streak bonus: ${pickedBox.name} x${pickedBox.amount}`;
  }

  return {
    update: {
      berries: Number(player.berries || 0) + baseBerries,
      tickets,
      boxes,
      vote: {
        streak: currentStreak,
        totalVotes,
        lastVoteAt: now,
      },
      cooldowns: {
        ...(player.cooldowns || {}),
        vote: now + VOTE_COOLDOWN_MS,
      },
    },
    rewardText: [
      "✅ Thanks for voting for One Piece Bot!",
      "",
      `💰 Berries: +${baseBerries.toLocaleString("en-US")}`,
      `🎟️ Pull Reset Ticket: +${safeWeight}`,
      `🔥 Vote Streak: ${currentStreak}`,
      `📊 Total Votes: ${totalVotes}`,
      bonusText,
    ].join("\n"),
  };
}

function startTopggWebhookServer(client) {
  if (serverStarted) return;
  serverStarted = true;

  const app = express();
  app.use(express.json());

  app.get("/", (_, res) => {
    res.status(200).send("onepiece-bot ok");
  });

  app.get("/health", (_, res) => {
    res.status(200).json({
      ok: true,
      bot: client?.user?.tag || null,
    });
  });

  app.post("/topgg", async (req, res) => {
    try {
      const expectedAuth = String(process.env.TOPGG_WEBHOOK_AUTH || "");
      const incomingAuth = String(req.headers.authorization || "");

      if (expectedAuth && incomingAuth !== expectedAuth) {
        return res.status(401).json({ ok: false, error: "Invalid authorization" });
      }

      const payload = req.body || {};
      console.log("[TOPGG] Payload:", payload);

      if (isTestWebhook(payload)) {
        return res.status(200).json({ ok: true, test: true });
      }

      if (!isVoteWebhook(payload)) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      const userId = getDiscordUserId(payload);
      const username = getDiscordUsername(payload);
      const weight = Math.max(1, Number(payload?.data?.weight || payload?.weight || 1));

      if (!userId) {
        return res.status(200).json({ ok: true, ignored: "missing_user_id" });
      }

      const player = getPlayer(userId, username);
      const now = Date.now();
      const voteCooldown = Number(player?.cooldowns?.vote || 0);
      const lastVoteAt = Number(player?.vote?.lastVoteAt || 0);

      if (voteCooldown > now || (lastVoteAt > 0 && now - lastVoteAt < DUPLICATE_GUARD_MS)) {
        console.log(`[TOPGG] Duplicate vote ignored for ${userId}.`);
        return res.status(200).json({
          ok: true,
          ignored: "duplicate_vote",
        });
      }

      const reward = applyVoteReward(player, weight);
      updatePlayer(userId, reward.update);

      await notifyUser(client, userId, reward.rewardText);

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[TOPGG] Webhook error:", error);
      return res.status(200).json({ ok: false });
    }
  });

  const port = Number(process.env.PORT || process.env.WEBHOOK_PORT || 3000);
  const host = "0.0.0.0";

  app.listen(port, host, () => {
    console.log(`[WEB] Listening on ${host}:${port}`);
  });
}

module.exports = { startTopggWebhookServer };