const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const cards = require("../data/cards");

const RARITY_ORDER = {
  UR: 5,
  S: 4,
  A: 3,
  B: 2,
  C: 1
};

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

function getPower(card) {
  return Number(card.atk || 0) + Number(card.hp || 0) + Number(card.speed || 0);
}

function sortCards(list) {
  return [...list].sort((a, b) => {
    const rarityDiff = (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
    if (rarityDiff !== 0) return rarityDiff;

    const powerDiff = getPower(b) - getPower(a);
    if (powerDiff !== 0) return powerDiff;

    return String(a.displayName || a.name || "").localeCompare(String(b.displayName || b.name || ""));
  });
}

function buildBattleEmbed(card, index, total) {
  const embed = new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("🃏 All Battle Cards")
    .setDescription(
      [
        `**Name:** ${card.displayName || card.name}`,
        `**Rarity:** \`${card.rarity}\``,
        card.title ? `**Title:** \`${card.title}\`` : null,
        card.arc ? `**Arc:** \`${card.arc}\`` : null,
        card.faction ? `**Faction:** \`${card.faction}\`` : null,
        card.type ? `**Type:** \`${card.type}\`` : null,
        card.variant ? `**Variant:** \`${card.variant}\`` : null,
        "",
        `**ATK:** \`${card.atk || 0}\``,
        `**HP:** \`${card.hp || 0}\``,
        `**SPD:** \`${card.speed || 0}\``,
        `**Power:** \`${getPower(card)}\``,
        "",
        `**Weapon:** \`${card.weapon || "None"}\``,
        `**Devil Fruit:** \`${card.devilFruit || "None"}\``,
        `**Equip Type:** \`${card.equipType || "None"}\``
      ].filter(Boolean).join("\n")
    )
    .setThumbnail(getRarityBadgeUrl(card.rarity))
    .setImage(card.image || getPlaceholderImage(card.displayName || card.name || "Battle Card"))
    .setFooter({ text: `Battle Card ${index + 1}/${total}` });

  return embed;
}

function buildBoostEmbed(card, index, total) {
  const valueSuffix = ["atk", "hp", "spd", "exp", "dmg"].includes(card.boostType) ? "%" : "";

  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("✨ All Boost Cards")
    .setDescription(
      [
        `**Name:** ${card.displayName || card.name}`,
        `**Rarity:** \`${card.rarity}\``,
        card.title ? `**Title:** \`${card.title}\`` : null,
        card.arc ? `**Arc:** \`${card.arc}\`` : null,
        card.faction ? `**Faction:** \`${card.faction}\`` : null,
        card.variant ? `**Variant:** \`${card.variant}\`` : null,
        "",
        `**Boost Type:** \`${card.boostType || "None"}\``,
        `**Boost Value:** \`${card.boostValue || 0}${valueSuffix}\``,
        `**Boost Target:** \`${card.boostTarget || "account"}\``,
        card.boostDescription ? `**Description:** ${card.boostDescription}` : null,
        "",
        `**Devil Fruit:** \`${card.devilFruit || "None"}\``,
        `**Equip Type:** \`${card.equipType || "Passive"}\``
      ].filter(Boolean).join("\n")
    )
    .setThumbnail(getRarityBadgeUrl(card.rarity))
    .setImage(card.image || getPlaceholderImage(card.displayName || card.name || "Boost Card"))
    .setFooter({ text: `Boost Card ${index + 1}/${total}` });

  return embed;
}

function buildButtons(page, total, isBoostMode) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`all_prev_${isBoostMode ? "boost" : "battle"}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`all_next_${isBoostMode ? "boost" : "battle"}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= total - 1)
  );
}

module.exports = {
  name: "all",
  aliases: ["cardsall"],
  async execute(message, args) {
    const isBoostMode = String(args[0] || "").toLowerCase() === "boost";

    const filteredCards = sortCards(
      cards.filter((card) =>
        isBoostMode ? card.cardRole === "boost" : card.cardRole !== "boost"
      )
    );

    if (!filteredCards.length) {
      return message.reply(isBoostMode ? "No boost cards found." : "No battle cards found.");
    }

    let page = 0;

    const buildEmbed = () => {
      const card = filteredCards[page];
      return isBoostMode
        ? buildBoostEmbed(card, page, filteredCards.length)
        : buildBattleEmbed(card, page, filteredCards.length);
    };

    const reply = await message.reply({
      embeds: [buildEmbed()],
      components: [buildButtons(page, filteredCards.length, isBoostMode)]
    });

    const collector = reply.createMessageComponentCollector({
      time: 10 * 60 * 1000
    });

    collector.on("collect", async (interaction) => {
      if (
        interaction.customId !== `all_prev_${isBoostMode ? "boost" : "battle"}` &&
        interaction.customId !== `all_next_${isBoostMode ? "boost" : "battle"}`
      ) {
        return;
      }

      if (interaction.customId.startsWith("all_prev_")) {
        page = Math.max(0, page - 1);
      }

      if (interaction.customId.startsWith("all_next_")) {
        page = Math.min(filteredCards.length - 1, page + 1);
      }

      await interaction.update({
        embeds: [buildEmbed()],
        components: [buildButtons(page, filteredCards.length, isBoostMode)]
      });
    });

    collector.on("end", async () => {
      try {
        await reply.edit({
          components: []
        });
      } catch (error) {
        // ignore
      }
    });
  }
};