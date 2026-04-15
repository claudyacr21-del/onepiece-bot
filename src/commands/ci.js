const { EmbedBuilder } = require("discord.js");
const cards = require("../data/cards");
const weapons = require("../data/weapons");
const devilFruits = require("../data/devilFruits");

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

function getPlaceholderImage(name = "Item") {
  const text = encodeURIComponent(name);
  return `https://dummyimage.com/512x768/1e1e1e/ffffff.png&text=${text}`;
}

function getPower(card) {
  return Number(card.atk || 0) + Number(card.hp || 0) + Number(card.speed || 0);
}

function findBestMatch(list, query, fields) {
  const q = normalize(query);

  const exact = list.find((item) =>
    fields.some((field) => normalize(item[field]).replace(/\s+/g, " ") === q)
  );
  if (exact) return exact;

  const partial = list.find((item) =>
    fields.some((field) => normalize(item[field]).includes(q))
  );
  if (partial) return partial;

  return null;
}

function buildCardEmbed(card) {
  const isBoost = card.cardRole === "boost";
  const valueSuffix = ["atk", "hp", "spd", "exp", "dmg"].includes(card.boostType) ? "%" : "";

  const embed = new EmbedBuilder()
    .setColor(isBoost ? 0xf39c12 : 0x8e44ad)
    .setTitle(`🃏 Card Info • ${card.displayName || card.name}`)
    .setDescription(
      [
        `**Category:** \`${isBoost ? "Boost Card" : "Battle Card"}\``,
        `**Rarity:** \`${card.rarity || "C"}\``,
        card.title ? `**Title:** \`${card.title}\`` : null,
        card.arc ? `**Arc:** \`${card.arc}\`` : null,
        card.faction ? `**Faction:** \`${card.faction}\`` : null,
        card.variant ? `**Variant:** \`${card.variant}\`` : null,
        card.type ? `**Type:** \`${card.type}\`` : null,
        "",
        !isBoost ? `**ATK:** \`${card.atk || 0}\`` : null,
        !isBoost ? `**HP:** \`${card.hp || 0}\`` : null,
        !isBoost ? `**SPD:** \`${card.speed || 0}\`` : null,
        !isBoost ? `**Power:** \`${getPower(card)}\`` : null,
        "",
        isBoost ? `**Boost Type:** \`${card.boostType || "None"}\`` : null,
        isBoost ? `**Boost Value:** \`${card.boostValue || 0}${valueSuffix}\`` : null,
        isBoost ? `**Boost Target:** \`${card.boostTarget || "account"}\`` : null,
        isBoost && card.boostDescription ? `**Description:** ${card.boostDescription}` : null,
        "",
        `**Weapon:** \`${card.weapon || "None"}\``,
        `**Devil Fruit:** \`${card.devilFruit || "None"}\``,
        `**Equip Type:** \`${card.equipType || "None"}\``,
        `**Code:** \`${card.code || "none"}\``
      ].filter(Boolean).join("\n")
    )
    .setThumbnail(getRarityBadgeUrl(card.rarity))
    .setImage(card.image || getPlaceholderImage(card.displayName || card.name || "Card"))
    .setFooter({ text: "One Piece Bot • Database Card Info" });

  return embed;
}

function buildWeaponEmbed(weapon) {
  const statBonus = weapon.statBonus || {};

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🗡️ Weapon Info • ${weapon.name}`)
    .setDescription(
      [
        `**Rarity:** \`${weapon.rarity || "C"}\``,
        weapon.type ? `**Type:** \`${weapon.type}\`` : null,
        "",
        `**ATK Bonus:** \`${Number(statBonus.atk || 0)}\``,
        `**HP Bonus:** \`${Number(statBonus.hp || 0)}\``,
        `**SPD Bonus:** \`${Number(statBonus.speed || 0)}\``,
        "",
        weapon.description ? `**Description:** ${weapon.description}` : null,
        Array.isArray(weapon.owners) && weapon.owners.length
          ? `**Owners:** \`${weapon.owners.join(", ")}\``
          : null,
        `**Code:** \`${weapon.code || "none"}\``
      ].filter(Boolean).join("\n")
    )
    .setThumbnail(getRarityBadgeUrl(weapon.rarity))
    .setImage(weapon.image || getPlaceholderImage(weapon.name || "Weapon"))
    .setFooter({ text: "One Piece Bot • Database Weapon Info" });

  return embed;
}

function buildFruitEmbed(fruit) {
  const statBonus = fruit.statBonus || {};

  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle(`🍎 Devil Fruit Info • ${fruit.name}`)
    .setDescription(
      [
        `**Rarity:** \`${fruit.rarity || "C"}\``,
        fruit.type ? `**Type:** \`${fruit.type}\`` : null,
        "",
        `**ATK Bonus:** \`${Number(statBonus.atk || 0)}\``,
        `**HP Bonus:** \`${Number(statBonus.hp || 0)}\``,
        `**SPD Bonus:** \`${Number(statBonus.speed || 0)}\``,
        "",
        fruit.description ? `**Description:** ${fruit.description}` : null,
        Array.isArray(fruit.owners) && fruit.owners.length
          ? `**Owners:** \`${fruit.owners.join(", ")}\``
          : null,
        `**Code:** \`${fruit.code || "none"}\``
      ].filter(Boolean).join("\n")
    )
    .setThumbnail(getRarityBadgeUrl(fruit.rarity))
    .setImage(fruit.image || getPlaceholderImage(fruit.name || "Devil Fruit"))
    .setFooter({ text: "One Piece Bot • Database Devil Fruit Info" });

  return embed;
}

module.exports = {
  name: "ci",
  aliases: ["cardinfo", "dbinfo"],
  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op ci <card / devil fruit / weapon name>`");
    }

    const query = args.join(" ");

    const cardMatch = findBestMatch(cards, query, [
      "displayName",
      "name",
      "title",
      "code",
      "variant",
      "arc"
    ]);

    if (cardMatch) {
      return message.reply({ embeds: [buildCardEmbed(cardMatch)] });
    }

    const fruitMatch = findBestMatch(devilFruits, query, [
      "name",
      "code",
      "type",
      "description"
    ]);

    if (fruitMatch) {
      return message.reply({ embeds: [buildFruitEmbed(fruitMatch)] });
    }

    const weaponMatch = findBestMatch(weapons, query, [
      "name",
      "code",
      "type",
      "description"
    ]);

    if (weaponMatch) {
      return message.reply({ embeds: [buildWeaponEmbed(weaponMatch)] });
    }

    return message.reply(`No card, devil fruit, or weapon found matching \`${query}\`.`);
  }
};