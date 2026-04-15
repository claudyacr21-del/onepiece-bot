const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const weapons = require("../data/weapons");

function normalize(text) {
  return String(text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function findMatchingCard(cards, query) {
  const q = normalize(query);

  return (
    cards.find((card) => {
      if (card.cardRole === "boost") return false;

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

      return fields.some((value) => value === q);
    }) ||
    cards.find((card) => {
      if (card.cardRole === "boost") return false;

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
    }) ||
    null
  );
}

function findMatchingWeapon(query) {
  const q = normalize(query);

  const exact = weapons.find((weapon) => {
    const fields = [weapon.name, weapon.code, weapon.type]
      .filter(Boolean)
      .map((value) => normalize(value));

    return fields.some((value) => value === q);
  });

  if (exact) return exact;

  return (
    weapons.find((weapon) => {
      const fields = [weapon.name, weapon.code, weapon.type]
        .filter(Boolean)
        .map((value) => normalize(value));

      return fields.some((value) => value.includes(q));
    }) || null
  );
}

function splitCardAndWeaponInput(rawArgs) {
  if (!rawArgs.length) return null;

  const joined = rawArgs.join(" ").trim();
  const normalizedJoined = normalize(joined);

  const weaponCandidates = [...weapons].sort((a, b) => {
    const aLen = normalize(a.name || "").length;
    const bLen = normalize(b.name || "").length;
    return bLen - aLen;
  });

  for (const weapon of weaponCandidates) {
    const weaponName = normalize(weapon.name);
    if (!normalizedJoined.endsWith(weaponName)) continue;

    const cardPart = joined.slice(0, joined.length - weapon.name.length).trim();
    if (!cardPart) continue;

    return {
      cardName: cardPart,
      weaponName: weapon.name
    };
  }

  return null;
}

module.exports = {
  name: "wp",
  aliases: ["weapon", "equipweapon"],
  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op wp <card name> <weapon name>`");
    }

    const split = splitCardAndWeaponInput(args);

    if (!split) {
      return message.reply("Usage: `op wp <card name> <weapon name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const ownedCards = Array.isArray(player.cards) ? player.cards : [];
    const ownedWeapons = Array.isArray(player.weapons) ? player.weapons : [];

    const card = findMatchingCard(ownedCards, split.cardName);
    if (!card) {
      return message.reply(`No battle card found matching \`${split.cardName}\`.`);
    }

    const weaponData = findMatchingWeapon(split.weaponName);
    if (!weaponData) {
      return message.reply(`No weapon found matching \`${split.weaponName}\`.`);
    }

    const ownedWeapon = ownedWeapons.find((item) => item.code === weaponData.code);
    if (!ownedWeapon || Number(ownedWeapon.amount || 0) <= 0) {
      return message.reply(`You do not own \`${weaponData.name}\`.`);
    }

    const allowedOwners = Array.isArray(weaponData.owners) ? weaponData.owners : [];
    if (allowedOwners.length && !allowedOwners.includes(card.code)) {
      return message.reply(`\`${weaponData.name}\` cannot be equipped to \`${card.displayName || card.name}\`.`);
    }

    const updatedCards = ownedCards.map((entry) => {
      if (entry.instanceId !== card.instanceId) return entry;
      return {
        ...entry,
        equippedWeapon: weaponData.name
      };
    });

    updatePlayer(message.author.id, {
      cards: updatedCards
    });

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("🗡️ Weapon Equipped")
      .setDescription(
        [
          `**Card:** ${card.displayName || card.name}`,
          `**Weapon:** ${weaponData.name}`,
          weaponData.type ? `**Type:** \`${weaponData.type}\`` : null,
          weaponData.rarity ? `**Rarity:** \`${weaponData.rarity}\`` : null,
          "",
          "The weapon has been equipped successfully."
        ].filter(Boolean).join("\n")
      )
      .setFooter({ text: "One Piece Bot • Weapon Equip" });

    return message.reply({ embeds: [embed] });
  }
};