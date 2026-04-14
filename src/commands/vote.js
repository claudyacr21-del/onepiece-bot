const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");

const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const TOPGG_URL = "https://top.gg/";

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

function formatRemaining(ms) {
  if (ms <= 0) return "Now";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return "Now";
}

function getVoteReward(streak) {
  const base = {
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
    tickets: []
  };

  if (streak >= 5) {
    base.berries += 1500;
    base.gems += 5;
  }

  if (streak >= 10) {
    base.materials.push({
      name: "Enhancement Stone",
      amount: 3,
      rarity: "B",
      code: "enhancement_stone",
      type: "Material",
      description: "A stone used to strengthen growth systems."
    });
  }

  if (streak % 20 === 0 && streak > 0) {
    base.berries += 5000;
    base.gems += 20;
    base.tickets.push({
      name: "Pull Reset Ticket",
      amount: 1,
      rarity: "A",
      code: "pull_reset_ticket",
      type: "Ticket",
      description: "Resets your pull usage manually."
    });
    base.materials.push({
      name: "Rare Resource Box",
      amount: 1,
      rarity: "B",
      code: "rare_resource_box",
      type: "Box",
      description: "A better box with improved rewards."
    });
  }

  return base;
}

module.exports = {
  name: "vote",
  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const voteData = player.vote || {
      streak: 0,
      totalVotes: 0,
      lastVoteAt: null
    };
    const cooldowns = player.cooldowns || {};
    const now = Date.now();
    const canClaim = !cooldowns.vote || Number(cooldowns.vote) <= now;

    if (args[0]?.toLowerCase() === "claim") {
      if (!canClaim) {
        return message.reply(`You cannot claim vote reward yet. Next vote: ${formatRemaining(Number(cooldowns.vote) - now)}`);
      }

      const newStreak = Number(voteData.streak || 0) + 1;
      const newTotalVotes = Number(voteData.totalVotes || 0) + 1;
      const reward = getVoteReward(newStreak);

      let updatedMaterials = [...(player.materials || [])];
      let updatedTickets = [...(player.tickets || [])];
      let updatedBoxes = [...(player.boxes || [])];

      for (const material of reward.materials) {
        if (material.type === "Box") {
          updatedBoxes = addOrIncrease(updatedBoxes, material);
        } else {
          updatedMaterials = addOrIncrease(updatedMaterials, material);
        }
      }

      for (const ticket of reward.tickets) {
        updatedTickets = addOrIncrease(updatedTickets, ticket);
      }

      updatePlayer(message.author.id, {
        berries: Number(player.berries || 0) + reward.berries,
        gems: Number(player.gems || 0) + reward.gems,
        materials: updatedMaterials,
        tickets: updatedTickets,
        boxes: updatedBoxes,
        vote: {
          streak: newStreak,
          totalVotes: newTotalVotes,
          lastVoteAt: now
        },
        cooldowns: {
          ...cooldowns,
          vote: now + VOTE_COOLDOWN_MS
        }
      });

      const rewardLines = [
        `↪ Berries: +${Number(reward.berries).toLocaleString("en-US")}`,
        `↪ Gems: +${Number(reward.gems).toLocaleString("en-US")}`
      ];

      reward.materials.forEach((item) => {
        rewardLines.push(`↪ ${item.name} x${item.amount}`);
      });

      reward.tickets.forEach((item) => {
        rewardLines.push(`↪ ${item.name} x${item.amount}`);
      });

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("🗳️ Vote Reward Claimed")
        .setDescription(
          [
            `↪ Vote Streak: ${newStreak}`,
            `↪ Total Votes: ${newTotalVotes}`,
            "",
            "**Rewards**",
            ...rewardLines,
            "",
            `↪ Next Vote: ${formatRemaining(VOTE_COOLDOWN_MS)}`
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • Vote Reward" });

      return message.reply({ embeds: [embed] });
    }

    const nextVoteText = canClaim ? "Ready now" : formatRemaining(Number(cooldowns.vote) - now);
    const milestoneLeft = 20 - (Number(voteData.streak || 0) % 20 || 20);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("🗳️ Vote Information")
      .setDescription(
        [
          `↪ Vote Streak: ${Number(voteData.streak || 0)}`,
          `↪ Total Votes: ${Number(voteData.totalVotes || 0)}`,
          `↪ Next Vote: ${nextVoteText}`,
          `↪ Milestone Bonus In: ${milestoneLeft} vote(s)`,
          "",
          "**How it works**",
          "↪ Use the button below to vote for the bot.",
          "↪ After voting, use `op vote claim` to claim your reward.",
          "↪ Every 20 streak votes gives an extra reward bonus."
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Vote System" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Vote")
        .setStyle(ButtonStyle.Link)
        .setURL(TOPGG_URL)
    );

    return message.reply({
      embeds: [embed],
      components: [row]
    });
  }
};