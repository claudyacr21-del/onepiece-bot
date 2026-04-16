const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getAllCards, createOwnedCard, rollBaseTier } = require("../utils/evolution");

module.exports = {
  name: "pull",
  aliases: ["gacha"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const cost = 2500;
    if (Number(player.berries || 0) < cost) {
      return message.reply(`You need **${cost.toLocaleString("en-US")}** berries to pull.`);
    }

    const allCards = getAllCards();
    const battlePool = allCards.filter((c) => c.cardRole === "battle");
    const boostPool = allCards.filter((c) => c.cardRole === "boost");
    const contentRoll = Math.random() * 100;
    const contentType = contentRoll < 80 ? "battle" : "boost";
    const baseTier = rollBaseTier();
    const pool = (contentType === "battle" ? battlePool : boostPool).filter((c) => c.baseTier === baseTier);

    if (!pool.length) return message.reply("Pull pool is empty.");

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const owned = createOwnedCard(picked);

    updatePlayer(message.author.id, {
      berries: Number(player.berries || 0) - cost,
      cards: [...(player.cards || []), owned],
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("🎴 Pull Result")
          .setDescription(
            [
              `You spent **${cost.toLocaleString("en-US")}** berries.`,
              "",
              `**${owned.displayName || owned.name}**`,
              `**Role:** ${owned.cardRole}`,
              `**Base Tier:** ${owned.baseTier}`,
              `**Current Form:** ${owned.evolutionKey} • ${owned.evolutionForms[0].name}`,
              `**Current Tier:** ${owned.currentTier}`,
              "",
              `**ATK:** ${owned.atk}`,
              `**HP:** ${owned.hp}`,
              `**SPD:** ${owned.speed}`,
              "",
              "Use `op ci <card name>` to inspect full M1 / M2 / M3 path.",
            ].join("\n")
          )
          .setImage(owned.image || null),
      ],
    });
  },
};