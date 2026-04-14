const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

module.exports = {
  name: "quest",
  aliases: ["quests"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const total = Number(player.quests?.daily?.total || 5);
    const completed = Number(player.quests?.daily?.completed || 0);

    const questList = [
      {
        name: "Win 3 side fights",
        progress: Math.min(completed, 3),
        target: 3,
        reward: "Berries x2,000"
      },
      {
        name: "Pull 1 time",
        progress: completed >= 1 ? 1 : 0,
        target: 1,
        reward: "Basic Box x1"
      },
      {
        name: "Claim daily reward",
        progress: completed >= 2 ? 1 : 0,
        target: 1,
        reward: "Gems x25"
      },
      {
        name: "Use 1 material",
        progress: completed >= 3 ? 1 : 0,
        target: 1,
        reward: "Enhancement Stone x2"
      },
      {
        name: "Defeat 1 boss or mini boss",
        progress: completed >= 4 ? 1 : 0,
        target: 1,
        reward: "Pull Reset Ticket Fragment x1"
      }
    ].slice(0, total);

    const lines = questList.map((quest, index) => {
      const done = quest.progress >= quest.target ? "✅" : "⬜";
      return [
        `${done} **${index + 1}. ${quest.name}**`,
        `Progress: \`${quest.progress}/${quest.target}\``,
        `Reward: \`${quest.reward}\``
      ].join("\n");
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("📜 Quest Information")
      .setDescription(lines.join("\n\n"))
      .setFooter({ text: "One Piece Bot • Quest List" });

    return message.reply({ embeds: [embed] });
  }
};