const express = require("express");
const crypto = require("crypto");
const { getPlayer, updatePlayer } = require("./playerStore");

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const index = arr.findIndex((entry) => entry.code === item.code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + Number(item.amount || 1)
    };
    return arr;
  }

  arr.push({
    name: item.name,
    amount: Number(item.amount || 1),
    rarity: item.rarity || "C",
    code: item.code,
    image: item.image || "",
    type: item.type || "Item",
    description: item.description || ""
  });

  return arr;
}

function getVoteReward(streak) {
  const reward = {
    berries: 4000,
    gems: 15,
    materials: [
      {
        name: "Treasure Material Pack",
        amount: 2,
        rarity: "B",
        code: "treasure_material_pack",
        type: "Material",
        description: "A set of useful treasure materials."
      }
    ],
    boxes: [],
    tickets: []
  };

  if (streak >= 5) {
    reward.berries += 1500;
    reward.gems += 5;
  }

  if (streak >= 10) {
    reward.materials.push({
      name: "Enhancement Stone",
      amount: 3,
      rarity: "B",
      code: "enhancement_stone",
      type: "Material",
      description: "A stone used to strengthen growth systems."
    });
  }

  if (streak % 20 === 0 && streak > 0) {
    reward.berries += 5000;
    reward.gems += 20;
    reward.tickets.push({
      name: "Pull Reset Ticket",
      amount: 1,
      rarity: "A",
      code: "pull_reset_ticket",
      type: "Ticket",
      description: "Resets your pull usage manually."
    });
    reward.boxes.push({
      name: "Rare Resource Box",
      amount: 1,
      rarity: "B",
      code: "rare_resource_box",
      type: "Box",
      description: "A better box with improved rewards."
    });
  }

  return reward;
}

function verifyTopggSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [k, v] = part.split("=");
      return [k?.trim(), v?.trim()];
    })
  );

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

function startTopggWebhookServer(client) {
  const app = express();

  app.use("/webhooks/topgg", express.raw({ type: "*/*" }));

  app.post("/webhooks/topgg", async (req, res) => {
    try {
      const rawBody = req.body.toString("utf8");
      const signatureHeader = req.headers["x-topgg-signature"];
      const secret = process.env.TOPGG_WEBHOOK_SECRET;

      const validV2 = verifyTopggSignature(rawBody, signatureHeader, secret);
      const validLegacy =
        req.headers.authorization &&
        secret &&
        req.headers.authorization === secret;

      if (!validV2 && !validLegacy) {
        return res.status(401).send("Invalid signature");
      }

      const body = JSON.parse(rawBody);

      const userId =
        body?.user ||
        body?.id ||
        body?.data?.user?.id ||
        body?.data?.user ||
        body?.data?.id;

      if (!userId) {
        return res.status(400).send("Missing user id");
      }

      res.status(200).send("ok");

      const user = await client.users.fetch(String(userId)).catch(() => null);
      const username = user?.username || `User-${userId}`;

      const player = getPlayer(String(userId), username);
      const voteData = player.vote || {
        streak: 0,
        totalVotes: 0,
        lastVoteAt: null
      };

      const newStreak = Number(voteData.streak || 0) + 1;
      const newTotalVotes = Number(voteData.totalVotes || 0) + 1;
      const reward = getVoteReward(newStreak);

      let updatedMaterials = [...(player.materials || [])];
      let updatedTickets = [...(player.tickets || [])];
      let updatedBoxes = [...(player.boxes || [])];

      for (const item of reward.materials) {
        updatedMaterials = addOrIncrease(updatedMaterials, item);
      }

      for (const item of reward.tickets) {
        updatedTickets = addOrIncrease(updatedTickets, item);
      }

      for (const item of reward.boxes) {
        updatedBoxes = addOrIncrease(updatedBoxes, item);
      }

      updatePlayer(String(userId), {
        username,
        berries: Number(player.berries || 0) + reward.berries,
        gems: Number(player.gems || 0) + reward.gems,
        materials: updatedMaterials,
        tickets: updatedTickets,
        boxes: updatedBoxes,
        vote: {
          streak: newStreak,
          totalVotes: newTotalVotes,
          lastVoteAt: Date.now()
        }
      });

      if (user) {
        const rewardLines = [
          `Berries: +${reward.berries.toLocaleString("en-US")}`,
          `Gems: +${reward.gems.toLocaleString("en-US")}`
        ];

        reward.materials.forEach((item) => {
          rewardLines.push(`${item.name} x${item.amount}`);
        });

        reward.tickets.forEach((item) => {
          rewardLines.push(`${item.name} x${item.amount}`);
        });

        reward.boxes.forEach((item) => {
          rewardLines.push(`${item.name} x${item.amount}`);
        });

        await user.send(
          [
            "🗳️ Thanks for voting on top.gg!",
            `Vote Streak: ${newStreak}`,
            `Total Votes: ${newTotalVotes}`,
            "",
            "Your rewards:",
            ...rewardLines
          ].join("\n")
        ).catch(() => null);
      }

      console.log(`Top.gg vote processed for user ${userId}`);
    } catch (error) {
      console.error("Top.gg webhook error:", error);
      if (!res.headersSent) {
        return res.status(500).send("server error");
      }
    }
  });

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Top.gg webhook listening on port ${port}`);
  });
}

module.exports = {
  startTopggWebhookServer
};