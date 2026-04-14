const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

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

function findOwnedCardByName(cards, query) {
  const lowerQuery = query.toLowerCase();

  return cards.find((card) => {
    const displayName = String(card.displayName || "").toLowerCase();
    const name = String(card.name || "").toLowerCase();
    const title = String(card.title || "").toLowerCase();
    const code = String(card.code || "").toLowerCase();

    return (
      displayName.includes(lowerQuery) ||
      name.includes(lowerQuery) ||
      title.includes(lowerQuery) ||
      code.includes(lowerQuery)
    );
  });
}

function buildUsageEmbed(username) {
  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle(`${username}'s Card`)
    .setDescription("Use this command to inspect one card that you own.")
    .addFields({
      name: "Usage",
      value: "`op mci <card name>`",
      inline: false
    })
    .setFooter({ text: "One Piece Bot • My Card Information" });
}

function buildOwnedCardEmbed(ownerName, card) {
  const displayName = card.displayName || card.name || "Unknown Card";
  const isBoost = card.cardRole === "boost";

  const description = isBoost
    ? [
        `## ${displayName}`,
        `${card.title || card.variant || "Passive Card"}`,
        "",
        `**Role:** \`Passive Boost\``,
        `**Boost Type:** \`${card.boostType || "Unknown"}\``,
        `**Boost Value:** \`${formatNumber(card.boostValue || 0)}\``,
        `**Target:** \`${card.boostTarget || "account"}\``,
        `**Description:** ${card.boostDescription || "No description"}`
      ].join("\n")
    : [
        `## ${displayName}`,
        `${card.title || card.variant || "No Title"}`,
        "",
        `**Level:** \`${card.level || 1}\``,
        `**Power:** \`${formatNumber(getCardPower(card))}\``,
        `**Health:** \`${formatNumber(card.hp || 0)}\``,
        `**Speed:** \`${formatNumber(card.speed || 0)}\``,
        `**Attack:** \`${formatNumber(card.atk || 0)}\``,
        `**Weapon:** \`${card.weapon || "None"}\``,
        `**Devil Fruit:** \`${card.devilFruit || "None"}\``,
        `**Type:** \`${card.type || "Combat"}\``,
        `**Kills:** \`${formatNumber(card.kills || 0)}\``,
        `**Fragments:** \`${formatNumber(card.fragments || 0)}\``
      ].join("\n");

  return new EmbedBuilder()
    .setColor(isBoost ? 0x9b59b6 : 0xc0392b)
    .setTitle(`${ownerName}'s Card`)
    .setDescription(description)
    .setThumbnail(getRarityBadgeUrl(card.rarity || "C"))
    .setImage(card.image || getPlaceholderImage(displayName))
    .setFooter({ text: `This card belongs to ${ownerName}` });
}

module.exports = {
  name: "mci",
  aliases: ["mycardinfo"],
  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const cards = player.cards || [];

    if (cards.length === 0) {
      return message.reply("You do not own any cards yet.");
    }

    if (!args.length) {
      return message.reply({ embeds: [buildUsageEmbed(player.username)] });
    }

    const query = args.join(" ");
    const card = findOwnedCardByName(cards, query);

    if (!card) {
      return message.reply(`You do not own a card matching \`${query}\`.`);
    }

    return message.reply({
      embeds: [buildOwnedCardEmbed(player.username, card)]
    });
  }
};