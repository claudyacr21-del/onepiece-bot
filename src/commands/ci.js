const { EmbedBuilder } = require("discord.js");
const cards = require("../data/cards");

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function getCardPower(card) {
  if (card.cardRole === "boost") return 0;

  const atk = Number(card.atk || 0);
  const hp = Number(card.hp || 0);
  const speed = Number(card.speed || 0);

  return Math.floor((atk * 1.4) + (hp * 0.22) + (speed * 9));
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

function findCard(query) {
  const lowerQuery = String(query).toLowerCase();

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

module.exports = {
  name: "ci",
  aliases: ["cardinfo"],
  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op ci <card name>`");
    }

    const query = args.join(" ");
    const card = findCard(query);

    if (!card) {
      return message.reply(`No card found matching \`${query}\`.`);
    }

    const isBoost = card.cardRole === "boost";

    const embed = new EmbedBuilder()
      .setColor(isBoost ? 0x9b59b6 : 0x16a085)
      .setTitle(card.displayName || card.name)
      .setDescription(
        isBoost
          ? [
              `${card.title || card.variant || "Passive Card"}`,
              "",
              `**Role:** \`Passive Boost\``,
              `**Boost Type:** \`${card.boostType || "Unknown"}\``,
              `**Boost Value:** \`${card.boostValue || 0}\`${["atk","hp","spd","exp","dmg"].includes(card.boostType) ? "%" : ""}`,
              `**Target:** \`${card.boostTarget || "account"}\``,
              `**Arc:** \`${card.arc || "Unknown"}\``,
              `**Faction:** \`${card.faction || "Unknown"}\``
            ].join("\n")
          : [
              `${card.title || card.variant || "No Title"}`,
              "",
              `**Power:** \`${formatNumber(getCardPower(card))}\``,
              `**Health:** \`${formatNumber(card.hp || 0)}\``,
              `**Speed:** \`${formatNumber(card.speed || 0)}\``,
              `**Attack:** \`${formatNumber(card.atk || 0)}\``,
              `**Type:** \`${card.type || "Combat"}\``,
              `**Arc:** \`${card.arc || "Unknown"}\``,
              `**Faction:** \`${card.faction || "Unknown"}\``,
              `**Weapon:** \`${card.weapon || "None"}\``,
              `**Devil Fruit:** \`${card.devilFruit || "None"}\``
            ].join("\n")
      )
      .setThumbnail(getRarityBadgeUrl(card.rarity || "C"))
      .setImage(card.image || getPlaceholderImage(card.displayName || card.name || "Card"))
      .setFooter({ text: "One Piece Bot • Card Information" });

    return message.reply({ embeds: [embed] });
  }
};