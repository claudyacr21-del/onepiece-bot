const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ensureDailyQuestState, DAILY_FINAL_REWARD } = require("../utils/questProgress");

module.exports = {
  name: "quest",
  aliases: ["quests", "q"],
  async execute(message) {
    let player = getPlayer(message.author.id, message.author.username);
    const ensured = ensureDailyQuestState(player);
    player = ensured.player;

    if (ensured.changed) {
      updatePlayer(message.author.id, {
        quests: player.quests,
      });
    }

    const quests = player.quests?.dailyState?.quests || [];
    const completed = quests.filter((q) => q.completed).length;
    const total = quests.length;
    const rewardClaimed = Boolean(player.quests?.dailyState?.rewardClaimed);

    const lines = quests.map((q, i) => {
      const icon = q.completed ? "✅" : "🕒";
      return `${i + 1}. ${icon} **${q.label}** — ${q.progress}/${q.target}`;
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("📜 Daily Quests")
          .setDescription(
            [
              `**Progress:** ${completed}/${total}`,
              `**Final Reward:** ${DAILY_FINAL_REWARD.berries.toLocaleString("en-US")} berries + ${DAILY_FINAL_REWARD.gems} gems`,
              `**Auto Claimed:** ${rewardClaimed ? "Yes" : "No"}`,
              "",
              ...lines,
            ].join("\n")
          )
          .setFooter({ text: "Daily quests are random and do not repeat the same category in one day." }),
      ],
    });
  },
};