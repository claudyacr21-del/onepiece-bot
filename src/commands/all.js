const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const cards = require("../data/cards");

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function getCardPower(card) {
  const atk = Number(card.atk || 0);
  const hp = Number(card.hp || 0);
  const speed = Number(card.speed || 0);

  return Math.floor((atk * 1.4) + (hp * 0.22) + (speed * 9));
}

function getRarityOrder(rarity) {
  const map = {
    UR: 5,
    S: 4,
    A: 3,
    B: 2,
    C: 1
  };

  return map[rarity] || 0;
}

function getRarityBadgeUrl(rarity) {
  const badges = {
    C: "https://cdn.discordapp.com/attachments/1493204525975076944/1493206778739949679/C.png?ex=69de20ae&is=69dccf2e&hm=ea4a3ad6d0431f20b5469fa07b1a908b7fea87bc634ad88207ec5c857376f5ab&",
    B: "https://cdn.discordapp.com/attachments/1493204525975076944/1493206778454872094/B.png?ex=69de20ae&is=69dccf2e&hm=01cafdb339ff901f49435b2f1eb4c82f010ad999010c5f137fc8b44f8768d4ac&",
    A: "https://cdn.discordapp.com/attachments/1493204525975076944/1493206778169528430/A.png?ex=69de20ae&is=69dccf2e&hm=e797f93352047664c42ba344c1952acc7e081025084fc63b0c1449465b61d400&",
    S: "https://cdn.discordapp.com/attachments/1493204525975076944/1493206777830047834/S.png?ex=69de20ae&is=69dccf2e&hm=1a8a3689e8c5c859ce7f0c861dd1a69f4e3a61c6d045821aaa0097960067add2&",
    UR: "https://cdn.discordapp.com/attachments/1493204525975076944/1493206779050332371/UR.png?ex=69dec96e&is=69dd77ee&hm=5741989996bead05060a9c97c5d424d81e148932d3f89b23aae0ee1f7a947053&"
  };

  return badges[rarity] || badges.C;
}

function getPlaceholderImage(name = "Card") {
  const text = encodeURIComponent(name);
  return `https://dummyimage.com/512x768/1e1e1e/ffffff.png&text=${text}`;
}

function buildBattleCardEmbed(card, index, total) {
  const displayName = card.displayName || card.name || "Unknown Card";

  return new EmbedBuilder()
    .setColor(0x16a085)
    .setTitle(displayName)
    .setDescription(
      [
        `${card.title || card.variant || "No Title"}`,
        "",
        `**Power:** \`${formatNumber(getCardPower(card))}\``,
        `**Health:** \`${formatNumber(card.hp || 0)}\``,
        `**Speed:** \`${formatNumber(card.speed || 0)}\``,
        `**Attack:** \`${formatNumber(card.atk || 0)}\``,
        `**Type:** \`${card.type || "Combat"}\``,
        `**Source:** \`${card.source || card.arc || "Unknown"}\``
      ].join("\n")
    )
    .setThumbnail(getRarityBadgeUrl(card.rarity || "C"))
    .setImage(card.image || getPlaceholderImage(displayName))
    .setFooter({ text: `Battle Card ${index + 1} of ${total}` });
}

function buildBoostCardEmbed(card, index, total) {
  const displayName = card.displayName || card.name || "Unknown Boost Card";

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(displayName)
    .setDescription(
      [
        `${card.title || card.variant || "Passive Card"}`,
        "",
        `**Role:** \`Passive Boost\``,
        `**Boost Type:** \`${card.boostType || "Unknown"}\``,
        `**Boost Value:** \`${formatNumber(card.boostValue || 0)}\``,
        `**Target:** \`${card.boostTarget || "account"}\``,
        `**Source:** \`${card.source || card.arc || "Unknown"}\``
      ].join("\n")
    )
    .setThumbnail(getRarityBadgeUrl(card.rarity || "C"))
    .setImage(card.image || getPlaceholderImage(displayName))
    .setFooter({ text: `Boost Card ${index + 1} of ${total}` });
}

function buildButtons(index, total, mode) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`all_prev_${mode}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId(`all_next_${mode}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === total - 1)
  );
}

module.exports = {
  name: "all",
  aliases: ["allcards", "cardlist"],
  async execute(message, args) {
    const mode = args[0]?.toLowerCase() === "boost" ? "boost" : "battle";

    const filteredCards = mode === "boost"
      ? cards.filter((card) => card.cardRole === "boost")
      : cards.filter((card) => card.cardRole !== "boost");

    if (!filteredCards.length) {
      return message.reply(mode === "boost"
        ? "No boost cards are registered in the game yet."
        : "No battle cards are registered in the game yet.");
    }

    const sortedCards = [...filteredCards].sort((a, b) => {
      const rarityDiff = getRarityOrder(b.rarity) - getRarityOrder(a.rarity);
      if (rarityDiff !== 0) return rarityDiff;

      return getCardPower(b) - getCardPower(a);
    });

    let currentIndex = 0;

    const sentMessage = await message.reply({
      embeds: [
        mode === "boost"
          ? buildBoostCardEmbed(sortedCards[currentIndex], currentIndex, sortedCards.length)
          : buildBattleCardEmbed(sortedCards[currentIndex], currentIndex, sortedCards.length)
      ],
      components: [buildButtons(currentIndex, sortedCards.length, mode)]
    });

    const collector = sentMessage.createMessageComponentCollector({
      time: 120000
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "This card menu belongs to someone else.",
          ephemeral: true
        });
      }

      if (interaction.customId === `all_prev_${mode}`) {
        currentIndex = Math.max(0, currentIndex - 1);
      }

      if (interaction.customId === `all_next_${mode}`) {
        currentIndex = Math.min(sortedCards.length - 1, currentIndex + 1);
      }

      await interaction.update({
        embeds: [
          mode === "boost"
            ? buildBoostCardEmbed(sortedCards[currentIndex], currentIndex, sortedCards.length)
            : buildBattleCardEmbed(sortedCards[currentIndex], currentIndex, sortedCards.length)
        ],
        components: [buildButtons(currentIndex, sortedCards.length, mode)]
      });
    });
  }
};