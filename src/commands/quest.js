const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { applyGlobalPullReset } = require("../utils/pullReset");

function countTotalAmount(list) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
}

function hasClaimedDailyToday(player) {
  const cooldown = Number(player?.cooldowns?.daily || 0);
  return cooldown > Date.now();
}

function getTotalPullsUsed(player) {
  return (
    Number(player?.pulls?.base?.used || 0) +
    Number(player?.pulls?.supportMember?.used || 0) +
    Number(player?.pulls?.booster?.used || 0) +
    Number(player?.pulls?.owner?.used || 0) +
    Number(player?.pulls?.patreon?.used || 0) +
    Number(player?.pulls?.baccaratCard?.used || 0) +
    Number(player?.pulls?.baccaratFruit?.used || 0)
  );
}

function buildQuestList(player) {
  const cards = Array.isArray(player.cards) ? player.cards : [];
  const battleCards = cards.filter((card) => card.cardRole !== "boost");
  const boostCards = cards.filter((card) => card.cardRole === "boost");

  const totalPullsUsed = getTotalPullsUsed(player);
  const totalFruits = countTotalAmount(player.devilFruits);
  const totalWeapons = countTotalAmount(player.weapons);

  return [
    {
      title: "Claim Daily Reward",
      done: hasClaimedDailyToday(player),
      progress: hasClaimedDailyToday(player) ? "1/1" : "0/1"
    },
    {
      title: "Use 3 Pulls",
      done: totalPullsUsed >= 3,
      progress: `${Math.min(totalPullsUsed, 3)}/3`
    },
    {
      title: "Own 3 Battle Cards",
      done: battleCards.length >= 3,
      progress: `${Math.min(battleCards.length, 3)}/3`
    },
    {
      title: "Own 1 Boost Card",
      done: boostCards.length >= 1,
      progress: `${Math.min(boostCards.length, 1)}/1`
    },
    {
      title: "Own 1 Weapon or 1 Devil Fruit",
      done: totalWeapons >= 1 || totalFruits >= 1,
      progress: totalWeapons >= 1 || totalFruits >= 1 ? "1/1" : "0/1"
    }
  ];
}

module.exports = {
  name: "quest",
  aliases: ["quests"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const resetState = applyGlobalPullReset(player);
    if (resetState.wasReset) {
      updatePlayer(message.author.id, { pulls: resetState.pulls });
      player.pulls = resetState.pulls;
    }

    const questList = buildQuestList(player);

    const completed = questList.filter((quest) => quest.done).length;
    const total = questList.length;
    const left = Math.max(0, total - completed);

    updatePlayer(message.author.id, {
      quests: {
        ...(player.quests || {}),
        daily: {
          total,
          completed
        },
        totalClears: Number(player?.quests?.totalClears || 0)
      }
    });

    const lines = questList.map((quest, index) => {
      const status = quest.done ? "✅" : "⬜";
      return `${status} ${index + 1}. ${quest.title} — \`${quest.progress}\``;
    });

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("📜 Daily Quest List")
      .setDescription(
        [
          `**Completed:** \`${completed}/${total}\``,
          `**Quest Left:** \`${left}/${total}\``,
          "",
          ...lines
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Quests" });

    return message.reply({ embeds: [embed] });
  }
};