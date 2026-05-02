const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");

function getPower(card) {
  return Number(
    card.currentPower ||
      Math.floor(
        Number(card.atk || 0) * 1.4 +
          Number(card.hp || 0) * 0.22 +
          Number(card.speed || 0) * 9
      )
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function getMemberAvatar(message) {
  return (
    message.member?.displayAvatarURL?.({
      extension: "png",
      size: 512,
    }) ||
    message.author.displayAvatarURL({
      extension: "png",
      size: 512,
    })
  );
}

function getMastery(card) {
  return card.evolutionKey || `M${Number(card.evolutionStage || 1)}`;
}

function getCardName(card) {
  return card.displayName || card.name || "Unknown";
}

function buildSlotLine(card, index) {
  if (!card) {
    return `\`${index + 1}.\` **Empty Slot**\n↪ No card assigned`;
  }

  const rarity = card.currentTier || card.rarity || "C";
  const mastery = getMastery(card);
  const level = Number(card.level || 1);
  const power = getPower(card);

  return [
    `\`${index + 1}.\` **${getCardName(card)}**`,
    `↪ \`${rarity}\` • \`${mastery}\` • Lv \`${level}\``,
    `↪ Power: \`${formatNumber(power)}\``,
  ].join("\n");
}

module.exports = {
  name: "team",
  aliases: ["lineup"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const cards = (Array.isArray(player.cards) ? player.cards : [])
      .map(hydrateCard)
      .filter(Boolean);

    const team = player.team || {
      slots: [null, null, null],
    };

    const teamCards = team.slots.map((instanceId) => {
      if (!instanceId) return null;

      return (
        cards.find(
          (entry) =>
            String(entry.instanceId) === String(instanceId) &&
            String(entry.cardRole || "").toLowerCase() !== "boost"
        ) || null
      );
    });

    const totalPower = teamCards
      .filter(Boolean)
      .reduce((sum, card) => sum + getPower(card), 0);

    const avatar = getMemberAvatar(message);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setAuthor({
        name: `${player.username}'s Battle Team`,
        iconURL: avatar,
      })
      .setDescription(
        [
          "## ⚔️ Battle Team",
          `**Total Power:** \`${formatNumber(totalPower)}\``,
          "",
          teamCards.map((card, index) => buildSlotLine(card, index)).join("\n\n"),
          "",
          "Use `op add <slot> <card>` • `op remove <slot>` • `op swap <slot1> <slot2>`",
        ].join("\n")
      )
      .setThumbnail(avatar)
      .setFooter({
        text: "One Piece Bot • Team",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};