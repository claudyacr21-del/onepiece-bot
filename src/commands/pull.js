const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getAllPullableCards, createOwnedCardFromTemplate, rollBaseTier } = require("../utils/evolution");

module.exports = {
  name: "pull",
  aliases: ["gacha"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const cost = 2500;
    if (Number(player.berries || 0) < cost) {
      return message.reply(`You need **${cost.toLocaleString("en-US")}** berries to pull.`);
    }

    const allCards = getAllPullableCards();
    const baseTier = rollBaseTier();
    const pool = allCards.filter((c) => c.baseTier === baseTier);
    if (!pool.length) return message.reply("Pull pool is empty.");

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const ownedCard = createOwnedCardFromTemplate(picked);

    updatePlayer(message.author.id, {
      berries: Number(player.berries || 0) - cost,
      cards: [...(player.cards || []), ownedCard],
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
              `**${ownedCard.displayName || ownedCard.name}**`,
              `**Role:** ${ownedCard.cardRole}`,
              `**Base Tier:** ${ownedCard.baseTier}`,
              `**Current Form:** ${ownedCard.evolutionKey} • ${ownedCard.evolutionForms[0].name}`,
              `**Current Rarity:** ${ownedCard.currentTier}`,
              "",
              `**ATK:** ${ownedCard.atk}`,
              `**HP:** ${ownedCard.hp}`,
              `**SPD:** ${ownedCard.speed}`,
              "",
              "Use `op ci <card name>` to inspect M1 / M2 / M3 path.",
            ].join("\n")
          )
          .setImage(ownedCard.image || null),
      ],
    });
  },
};