const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

function normalize(text) {
  return String(text || "").toLowerCase().trim().replace(/\s+/g, " ");
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

function findOwnedCards(cards, query) {
  const q = normalize(query);

  return cards.filter((card) => {
    const fields = [
      card.displayName,
      card.name,
      card.title,
      card.code,
      card.variant,
      card.arc
    ]
      .filter(Boolean)
      .map((value) => normalize(value));

    return fields.some((value) => value.includes(q));
  });
}

function getPower(card) {
  return Number(card.atk || 0) + Number(card.hp || 0) + Number(card.speed || 0);
}

module.exports = {
  name: "mci",
  aliases: ["mycardinfo", "myci"],
  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op mci <card name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const ownedCards = Array.isArray(player.cards) ? player.cards : [];
    const query = args.join(" ");

    const matches = findOwnedCards(ownedCards, query);

    if (!matches.length) {
      return message.reply(`You do not own any card matching \`${query}\`.`);
    }

    const card = matches[0];
    const isBoost = card.cardRole === "boost";
    const valueSuffix = ["atk", "hp", "spd", "exp", "dmg"].includes(card.boostType) ? "%" : "";

    const embed = new EmbedBuilder()
      .setColor(isBoost ? 0xf39c12 : 0x8e44ad)
      .setTitle(`🃏 ${card.displayName || card.name}`)
      .setDescription(
        [
          `**Rarity:** \`${card.rarity || "C"}\``,
          card.title ? `**Title:** \`${card.title}\`` : null,
          card.arc ? `**Arc:** \`${card.arc}\`` : null,
          card.faction ? `**Faction:** \`${card.faction}\`` : null,
          card.variant ? `**Variant:** \`${card.variant}\`` : null,
          `**Role:** \`${isBoost ? "Boost Card" : "Battle Card"}\``,
          "",
          !isBoost ? `**ATK:** \`${card.atk || 0}\`` : null,
          !isBoost ? `**HP:** \`${card.hp || 0}\`` : null,
          !isBoost ? `**SPD:** \`${card.speed || 0}\`` : null,
          !isBoost ? `**Power:** \`${getPower(card)}\`` : null,
          !isBoost ? `**Kills:** \`${Number(card.kills || 0)}\`` : null,
          "",
          isBoost ? `**Boost Type:** \`${card.boostType || "None"}\`` : null,
          isBoost ? `**Boost Value:** \`${card.boostValue || 0}${valueSuffix}\`` : null,
          isBoost ? `**Boost Target:** \`${card.boostTarget || "account"}\`` : null,
          isBoost && card.boostDescription ? `**Description:** ${card.boostDescription}` : null,
          "",
          `**Weapon:** \`${card.equippedWeapon || card.weapon || "None"}\``,
          `**Devil Fruit:** \`${card.equippedDevilFruit || card.devilFruit || "None"}\``,
          `**Equip Type:** \`${card.equipType || "None"}\``
        ].filter(Boolean).join("\n")
      )
      .setThumbnail(getRarityBadgeUrl(card.rarity))
      .setFooter({ text: "One Piece Bot • My Card Info" });

    if (card.image) {
      embed.setImage(card.image);
    }

    return message.reply({ embeds: [embed] });
  }
};