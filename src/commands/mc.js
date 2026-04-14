const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getBoostCards } = require("../utils/passiveBoosts");

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function getCardPower(card) {
  if (card.cardRole === "boost") return 0;

  const atk = Number(card.atk || 0);
  const hp = Number(card.hp || 0);
  const speed = Number(card.speed || 0);
  const level = Number(card.level || 1);

  return Math.floor((atk * 1.4) + (hp * 0.22) + (speed * 9) + (level * 12));
}

function getRarityOrder(rarity) {
  const map = { UR: 5, S: 4, A: 3, B: 2, C: 1, EV: 6, M: 5, SS: 4 };
  return map[String(rarity || "").toUpperCase()] || 0;
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

function sortAllCards(cards) {
  return [...cards].sort((a, b) => {
    const powerDiff = getCardPower(b) - getCardPower(a);
    if (powerDiff !== 0) return powerDiff;

    const rarityDiff = getRarityOrder(b.rarity) - getRarityOrder(a.rarity);
    if (rarityDiff !== 0) return rarityDiff;

    return String(a.displayName || a.name || "").localeCompare(String(b.displayName || b.name || ""));
  });
}

function buildOwnedCardEmbed(ownerName, card, index, total) {
  const displayName = card.displayName || card.name || "Unknown Card";

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle(`${ownerName}'s Card`)
    .setDescription(
      [
        `## ${displayName}`,
        `${card.title || card.variant || "No Title"}`,
        "",
        `**Power:** \`${formatNumber(getCardPower(card))}\``,
        `**Health:** \`${formatNumber(card.hp || 0)}\``,
        `**Speed:** \`${formatNumber(card.speed || 0)}\``,
        `**Attack:** \`${formatNumber(card.atk || 0)}\``,
        `**Type:** \`${card.type || "Combat"}\``,
        `**Source:** \`${card.source || card.arc || "Unknown"}\``,
        `**Level:** \`${card.level || 1}\``,
        `**Kills:** \`${formatNumber(card.kills || 0)}\``
      ].join("\n")
    )
    .setThumbnail(getRarityBadgeUrl(card.rarity || "C"))
    .setImage(card.image || getPlaceholderImage(displayName))
    .setFooter({ text: `Owned by ${ownerName} • Card ${index + 1} of ${total}` });
}

function buildBoostCardEmbed(ownerName, card, index, total) {
  const displayName = card.displayName || card.name || "Unknown Boost Card";

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`${ownerName}'s Boost Card`)
    .setDescription(
      [
        `## ${displayName}`,
        `${card.title || card.variant || "Passive Card"}`,
        "",
        `**Role:** \`Passive Boost\``,
        `**Boost Type:** \`${card.boostType || "Unknown"}\``,
        `**Boost Value:** \`${formatNumber(card.boostValue || 0)}\`${["atk","hp","spd","exp","dmg"].includes(card.boostType) ? "%" : ""}`,
        `**Target:** \`${card.boostTarget || "account"}\``,
        `**Description:** ${card.boostDescription || "No description"}`
      ].join("\n")
    )
    .setThumbnail(getRarityBadgeUrl(card.rarity || "C"))
    .setImage(card.image || getPlaceholderImage(displayName))
    .setFooter({ text: `Owned by ${ownerName} • Boost Card ${index + 1} of ${total}` });
}

function buildTextModeEmbed(ownerName, cards, page) {
  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const start = safePage * PAGE_SIZE;
  const pageCards = cards.slice(start, start + PAGE_SIZE);

  const lines = pageCards.map((card) => {
    const rarity = card.rarity || "C";
    const name = card.displayName || card.name || "Unknown";
    const level = Number(card.level || 1);
    const power = getCardPower(card);

    if (card.cardRole === "boost") {
      const suffix = ["atk","hp","spd","exp","dmg"].includes(card.boostType)
        ? `%`
        : "";
      return [
        `**${rarity} ${name}** | Passive | ${card.boostType}:${card.boostValue || 0}${suffix}`,
        `↪ ${card.boostDescription || "No description"}`
      ].join("\n");
    }

    return [
      `**${rarity} ${name}** | Pow ${power} | HP ${card.hp || 0} | SPD ${card.speed || 0}`,
      `↪ ATK ${card.atk || 0} | Lv ${level} | Kills ${card.kills || 0}`
    ].join("\n");
  });

  return new EmbedBuilder()
    .setColor(0x7f8c8d)
    .setTitle(`${ownerName}'s Card Collection`)
    .setDescription(
      [
        "You are viewing your collection in text mode!",
        "",
        lines.join("\n\n")
      ].join("\n")
    )
    .setFooter({ text: `This card collection belongs to ${ownerName} • Page ${safePage + 1}/${totalPages}` });
}

function buildButtons(index, total, mode) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`mc_prev_${mode}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId(`mc_next_${mode}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === total - 1)
  );
}

module.exports = {
  name: "mc",
  aliases: ["mycards", "mycollection"],
  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const sub = args[0]?.toLowerCase() || "";

    if (sub === "text") {
      const cards = sortAllCards(player.cards || []);

      if (!cards.length) {
        return message.reply("You do not own any cards yet.");
      }

      let currentPage = 0;
      const PAGE_SIZE = 6;
      const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));

      const sentMessage = await message.reply({
        embeds: [buildTextModeEmbed(player.username, cards, currentPage)],
        components: [buildButtons(currentPage, totalPages, "text")]
      });

      const collector = sentMessage.createMessageComponentCollector({ time: 120000 });

      collector.on("collect", async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: "This card menu belongs to someone else.",
            ephemeral: true
          });
        }

        if (interaction.customId === "mc_prev_text") {
          currentPage = Math.max(0, currentPage - 1);
        }

        if (interaction.customId === "mc_next_text") {
          currentPage = Math.min(totalPages - 1, currentPage + 1);
        }

        await interaction.update({
          embeds: [buildTextModeEmbed(player.username, cards, currentPage)],
          components: [buildButtons(currentPage, totalPages, "text")]
        });
      });

      return;
    }

    const mode = sub === "boost" ? "boost" : "battle";

    const list = mode === "boost"
      ? getBoostCards(player)
      : (player.cards || []).filter((card) => card.cardRole !== "boost");

    if (list.length === 0) {
      return message.reply(mode === "boost"
        ? "You do not own any boost cards yet."
        : "You do not own any battle cards yet. Use `op pull` first.");
    }

    const sortedCards = sortAllCards(list);
    let currentIndex = 0;

    const sentMessage = await message.reply({
      embeds: [
        mode === "boost"
          ? buildBoostCardEmbed(player.username, sortedCards[currentIndex], currentIndex, sortedCards.length)
          : buildOwnedCardEmbed(player.username, sortedCards[currentIndex], currentIndex, sortedCards.length)
      ],
      components: [buildButtons(currentIndex, sortedCards.length, mode)]
    });

    const collector = sentMessage.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "This card menu belongs to someone else.",
          ephemeral: true
        });
      }

      if (interaction.customId === `mc_prev_${mode}`) {
        currentIndex = Math.max(0, currentIndex - 1);
      }

      if (interaction.customId === `mc_next_${mode}`) {
        currentIndex = Math.min(sortedCards.length - 1, currentIndex + 1);
      }

      await interaction.update({
        embeds: [
          mode === "boost"
            ? buildBoostCardEmbed(player.username, sortedCards[currentIndex], currentIndex, sortedCards.length)
            : buildOwnedCardEmbed(player.username, sortedCards[currentIndex], currentIndex, sortedCards.length)
        ],
        components: [buildButtons(currentIndex, sortedCards.length, mode)]
      });
    });
  }
};