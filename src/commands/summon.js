const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { createOwnedCard } = require("../utils/evolution");
const rawCards = require("../data/cards");
const weaponsDb = require("../data/weapons");

const SUMMON_FRAGMENT_COST = 25;
const SUMMONABLE_CARD_ROLES = new Set(["battle", "boost"]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function findWeaponByNameOnly(query) {
  const q = normalize(query);
  if (!q) return null;

  const scored = weaponsDb
    .map((weapon) => {
      const name = normalize(weapon.name);
      let score = 0;

      if (name === q) score = 1000;
      else if (name.startsWith(q)) score = 700;
      else if (name.includes(q)) score = 400;
      else {
        const words = q.split(" ").filter(Boolean);
        if (words.length && words.every((word) => name.includes(word))) {
          score = 250;
        }
      }

      return { weapon, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].weapon : null;
}

function getWeaponFragmentCode(weapon) {
  return `weapon_fragment_${String(weapon.code || "").toLowerCase()}`;
}

function getWeaponFragmentEntry(fragments, weapon) {
  const fragmentCode = normalize(getWeaponFragmentCode(weapon));
  const weaponCode = normalize(weapon.code);
  const weaponName = normalize(`${weapon.name} Fragment`);

  return (Array.isArray(fragments) ? fragments : []).find((entry) => {
    const entryCode = normalize(entry.code);
    const entryName = normalize(entry.name || entry.displayName);
    const entryWeaponCode = normalize(entry.weaponCode);

    return (
      entryCode === fragmentCode ||
      entryWeaponCode === weaponCode ||
      entryName === weaponName
    );
  });
}

function consumeWeaponFragments(fragments, weapon, amount) {
  const arr = [...(Array.isArray(fragments) ? fragments : [])];
  const entry = getWeaponFragmentEntry(arr, weapon);
  if (!entry) return null;

  const index = arr.indexOf(entry);
  const current = Number(entry.amount || 0);

  if (current < amount) return null;

  if (current === amount) arr.splice(index, 1);
  else arr[index] = { ...entry, amount: current - amount };

  return arr;
}

function addSummonedWeapon(weapons, weapon) {
  const arr = [...(Array.isArray(weapons) ? weapons : [])];
  const index = arr.findIndex(
    (entry) => normalize(entry.code) === normalize(weapon.code)
  );

  if (index >= 0) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + 1,
    };
    return arr;
  }

  arr.push({
    code: weapon.code,
    name: weapon.name,
    rarity: weapon.rarity || "C",
    type: weapon.type || "Weapon",
    image: weapon.image || "",
    statPercent: weapon.statPercent || { atk: 0, hp: 0, speed: 0 },
    ownerBonusPercent: weapon.ownerBonusPercent || { atk: 0, hp: 0, speed: 0 },
    owners: weapon.owners || [],
    description: weapon.description || "",
    amount: 1,
    upgradeLevel: 0,
  });

  return arr;
}

function getCardName(card) {
  return card.displayName || card.name || "Unknown Card";
}

function getCardRole(card) {
  return String(card?.cardRole || "battle").toLowerCase();
}

function isSummonableCard(card) {
  return SUMMONABLE_CARD_ROLES.has(getCardRole(card));
}

function getSummonableCards() {
  return rawCards.filter(isSummonableCard);
}

function findSummonableCard(query) {
  const q = normalize(query);
  if (!q) return null;

  const cards = getSummonableCards();

  return (
    cards.find((card) => normalize(card.code) === q) ||
    cards.find((card) => normalize(getCardName(card)) === q) ||
    cards.find((card) => normalize(card.code).includes(q)) ||
    cards.find((card) => normalize(getCardName(card)).includes(q)) ||
    null
  );
}

function findFragmentIndex(fragments, card) {
  const cardCode = normalize(card.code);
  const cardName = normalize(getCardName(card));

  return fragments.findIndex((frag) => {
    const fragCode = normalize(frag.code);
    const fragName = normalize(frag.name || frag.displayName);

    return (
      fragCode === cardCode ||
      fragName === cardName ||
      fragName.includes(cardName) ||
      cardName.includes(fragName)
    );
  });
}

function alreadyOwnsCard(player, card) {
  const code = normalize(card.code);

  return (Array.isArray(player.cards) ? player.cards : []).some(
    (owned) => normalize(owned.code) === code
  );
}

function getRoleLabel(card) {
  const role = getCardRole(card);
  if (role === "boost") return "Boost Card";
  return "Battle Card";
}

function getSummonImage(ownedCard, card) {
  return (
    ownedCard?.evolutionForms?.[0]?.image ||
    ownedCard?.stageImages?.M1 ||
    ownedCard?.image ||
    card?.evolutionForms?.[0]?.image ||
    card?.stageImages?.M1 ||
    card?.image ||
    null
  );
}

module.exports = {
  name: "summon",

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply(
        [
          "Usage: `op summon <card>`",
          "Example: `op summon luffy`",
          "Example: `op summon baccarat`",
          "",
          `Cost: **${SUMMON_FRAGMENT_COST}x self fragments**`,
          "Summonable: **Battle Cards** and **Boost Cards**",
        ].join("\n")
      );
    }

    const player = getPlayer(message.author.id, message.author.username);
    const card = findSummonableCard(query);

    const weaponTemplate = findWeaponByNameOnly(query);

    if (weaponTemplate) {
      const cost = 25;
      const fragmentEntry = getWeaponFragmentEntry(player.fragments || [], weaponTemplate);
      const ownedAmount = Number(fragmentEntry?.amount || 0);

      if (ownedAmount < cost) {
        return message.reply({
          content: `You need **${cost}x ${weaponTemplate.name} Fragment** to summon this weapon.\nCurrent: **${ownedAmount}/${cost}**`,
          allowedMentions: { repliedUser: false },
        });
      }

      const updatedFragments = consumeWeaponFragments(
        player.fragments || [],
        weaponTemplate,
        cost
      );

      const updatedWeapons = addSummonedWeapon(player.weapons || [], weaponTemplate);

      updatePlayer(message.author.id, {
        fragments: updatedFragments,
        weapons: updatedWeapons,
      });

      return message.reply({
        content: `✅ Summoned weapon **${weaponTemplate.name}** using **${cost}x ${weaponTemplate.name} Fragment**.`,
        allowedMentions: { repliedUser: false },
      });
    }

    if (!card) {
      return message.reply(
        `Battle/Boost card matching \`${query}\` was not found.`
      );
    }

    if (!isSummonableCard(card)) {
      return message.reply("Only battle cards and boost cards can be summoned.");
    }

    if (alreadyOwnsCard(player, card)) {
      return message.reply(`You already own **${getCardName(card)}**.`);
    }

    const fragments = Array.isArray(player.fragments) ? [...player.fragments] : [];
    const fragmentIndex = findFragmentIndex(fragments, card);

    if (fragmentIndex === -1) {
      return message.reply(
        `You need **${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment** to summon this card.`
      );
    }

    const ownedFragments = Number(fragments[fragmentIndex].amount || 0);

    if (ownedFragments < SUMMON_FRAGMENT_COST) {
      return message.reply(
        `You need **${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment**.\nYou currently have **${ownedFragments}x**.`
      );
    }

    const remainingFragments = ownedFragments - SUMMON_FRAGMENT_COST;

    if (remainingFragments <= 0) {
      fragments.splice(fragmentIndex, 1);
    } else {
      fragments[fragmentIndex] = {
        ...fragments[fragmentIndex],
        amount: remainingFragments,
      };
    }

    const ownedCard = createOwnedCard(card);
    const updatedCards = [...(player.cards || []), ownedCard];

    updatePlayer(message.author.id, {
      cards: updatedCards,
      fragments,
    });

    const rarity = String(card.baseTier || card.rarity || "C").toUpperCase();

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(getCardRole(card) === "boost" ? 0x9b59b6 : 0xf1c40f)
          .setTitle("✨ Card Summoned")
          .setDescription(
            [
              `**Card:** ${getCardName(card)}`,
              `**Type:** ${getRoleLabel(card)}`,
              `**Rarity:** ${rarity}`,
              `**Cost:** ${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment`,
              `**Remaining Fragments:** ${remainingFragments}`,
              "",
              "The card has been added to your collection.",
            ].join("\n")
          )
          .setImage(getSummonImage(ownedCard, card))
          .setFooter({ text: "One Piece Bot • Summon" }),
      ],
    });
  },
};