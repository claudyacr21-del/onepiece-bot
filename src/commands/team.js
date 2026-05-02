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

function getStageLabel(card) {
  return card.evolutionKey || `M${Number(card.evolutionStage || 1)}`;
}

function getCardName(card) {
  return card.displayName || card.name || "Unknown";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function getTotalPower(teamCards) {
  return teamCards.reduce((sum, card) => sum + getPower(card), 0);
}

function formatSlot(card, index) {
  if (!card) {
    return [
      `**${index + 1}. Empty Slot**`,
      "```ansi\n[2;30mNo battle card assigned.[0m\n```",
    ].join("\n");
  }

  const rarity = card.currentTier || card.rarity || "C";
  const stage = getStageLabel(card);
  const power = getPower(card);
  const level = Number(card.level || 1);
  const atk = Number(card.atk || 0);
  const hp = Number(card.hp || 0);
  const speed = Number(card.speed || 0);

  return [
    `**${index + 1}. ${getCardName(card)}**  \`${rarity}\` • \`${stage}\``,
    [
      "```ansi",
      `[2;33mPWR[0m ${formatNumber(power)}  [2;36mLV[0m ${level}`,
      `[2;31mATK[0m ${formatNumber(atk)}  [2;32mHP[0m ${formatNumber(hp)}  [2;34mSPD[0m ${formatNumber(speed)}`,
      "```",
    ].join("\n"),
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

    const filledCards = teamCards.filter(Boolean);
    const totalPower = getTotalPower(filledCards);
    const avatar = getMemberAvatar(message);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setAuthor({
        name: `${player.username}'s Battle Team`,
        iconURL: avatar,
      })
      .setDescription(
        [
          "## ⚔️ Battle Lineup",
          `**Total Power:** \`${formatNumber(totalPower)}\``,
          `**Team Slots:** \`${filledCards.length}/3\``,
          "",
          teamCards.map((card, index) => formatSlot(card, index)).join("\n"),
          "",
          "## 🛠️ Commands",
          "`op add <slot> <card>` — add card",
          "`op remove <slot>` — remove card",
          "`op swap <slot1> <slot2>` — swap position",
        ].join("\n")
      )
      .setThumbnail(avatar)
      .setFooter({
        text: "One Piece Bot • Team",
        iconURL: avatar,
      });

    return message.reply({
      embeds: [embed],
    });
  },
};