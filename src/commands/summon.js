const { EmbedBuilder } = require("discord.js");
const { readPlayers, writePlayers, getPlayer } = require("../playerStore");
const { createOwnedCard } = require("../utils/evolution");
const rawCards = require("../data/cards");
const weaponsDb = require("../data/weapons");
const { getWeaponImage, getRarityBadge } = require("../config/assetLinks");

const SUMMON_FRAGMENT_COST = 15;
const SUMMONABLE_CARD_ROLES = new Set(["battle", "boost"]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
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

function scoreNameOnly(query, names) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of names.filter(Boolean)) {
    const name = normalize(raw);
    if (!name) continue;

    if (name === q) best = Math.max(best, 1000 + name.length);
    else if (name.startsWith(q)) best = Math.max(best, 750 + q.length);
    else if (name.includes(q)) best = Math.max(best, 500 + q.length);
    else {
      const words = q.split(" ").filter(Boolean);
      if (words.length && words.every((word) => name.includes(word))) {
        best = Math.max(best, 300 + words.join("").length);
      }
    }
  }

  return best;
}

function findSummonableCard(query) {
  const scored = rawCards
    .filter(isSummonableCard)
    .map((card) => ({
      card,
      score: scoreNameOnly(query, [card.displayName, card.name]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].card : null;
}

function findWeaponByNameOnly(query) {
  const scored = weaponsDb
    .map((weapon) => ({
      weapon,
      score: scoreNameOnly(query, [weapon.name]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].weapon : null;
}

function findCardFragmentIndex(fragments, card) {
  const cardCode = normalize(card.code);
  const cardName = normalize(getCardName(card));

  return fragments.findIndex((frag) => {
    const fragCode = normalize(frag.code);
    const fragName = normalize(frag.name || frag.displayName);

    return (
      fragCode === cardCode ||
      fragName === cardName ||
      fragName === `${cardName} fragment` ||
      fragName.includes(cardName) ||
      cardName.includes(fragName)
    );
  });
}

function getWeaponFragmentCode(weapon) {
  return `weapon_fragment_${String(weapon.code || "").toLowerCase()}`;
}

function findWeaponFragmentIndex(fragments, weapon) {
  const fragmentCode = normalize(getWeaponFragmentCode(weapon));
  const weaponCode = normalize(weapon.code);
  const weaponName = normalize(weapon.name);
  const fragmentName = normalize(`${weapon.name} Fragment`);

  return fragments.findIndex((frag) => {
    const fragCode = normalize(frag.code);
    const fragName = normalize(frag.name || frag.displayName);
    const fragWeaponCode = normalize(frag.weaponCode);

    return (
      fragCode === fragmentCode ||
      fragWeaponCode === weaponCode ||
      fragName === fragmentName ||
      fragName === weaponName
    );
  });
}

function consumeFragments(fragments, index, amount) {
  const arr = Array.isArray(fragments) ? [...fragments] : [];
  const owned = Number(arr[index]?.amount || 0);

  if (index < 0 || owned < amount) return null;

  const remaining = owned - amount;

  if (remaining <= 0) {
    arr.splice(index, 1);
  } else {
    arr[index] = {
      ...arr[index],
      amount: remaining,
    };
  }

  return {
    fragments: arr,
    remaining,
  };
}

function alreadyOwnsCard(player, card) {
  const code = normalize(card.code);

  return (Array.isArray(player.cards) ? player.cards : []).some(
    (owned) => normalize(owned.code) === code
  );
}

function isImuCard(card) {
  const code = normalize(card?.code);
  const name = normalize(getCardName(card));

  return code === "imu" || name === "imu";
}

function hasLuffyM3(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];

  return cards.some((owned) => {
    const code = normalize(owned?.code);
    const name = normalize(owned?.displayName || owned?.name);
    const stage = Number(owned?.evolutionStage || 1);
    const key = String(owned?.evolutionKey || "").toUpperCase();

    const isLuffy =
      code.includes("luffy") ||
      name.includes("luffy") ||
      name.includes("monkey d luffy");

    const isM3 = stage >= 3 || key === "M3";

    return isLuffy && isM3;
  });
}

function getSpecialSummonRequirementError(player, card) {
  if (isImuCard(card) && !hasLuffyM3(player)) {
    return [
      `You cannot summon **${getCardName(card)}** yet.`,
      "",
      "**Special Requirement:**",
      "You must own **Monkey D. Luffy Mastery 3** first.",
    ].join("\n");
  }

  return null;
}

function alreadyOwnsWeapon(player, weapon) {
  const code = normalize(weapon.code);

  return (Array.isArray(player.weapons) ? player.weapons : []).some(
    (owned) => normalize(owned.code) === code
  );
}

function addWeaponToInventory(weapons, weapon) {
  const arr = Array.isArray(weapons) ? [...weapons] : [];
  const index = arr.findIndex((entry) => normalize(entry.code) === normalize(weapon.code));

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + 1,
    };

    return arr;
  }

  arr.push({
    code: weapon.code,
    name: weapon.name,
    amount: 1,
    rarity: weapon.rarity || "C",
    type: weapon.type || "Weapon",
    image: weapon.image || "",
    statPercent: weapon.statPercent || { atk: 0, hp: 0, speed: 0 },
    baseStatPercent: weapon.baseStatPercent || weapon.statPercent || undefined,
    ownerBonusPercent: weapon.ownerBonusPercent || { atk: 0, hp: 0, speed: 0 },
    owners: Array.isArray(weapon.owners) ? weapon.owners : [],
    description: weapon.description || "",
    upgradeLevel: 0,
  });

  return arr;
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
      return message.reply({
        content: [
          "Usage: `op summon <card/weapon name>`",
          "Example: `op summon luffy`",
          "Example: `op summon baccarat`",
          "Example: `op summon kikoku`",
          "",
          `Cost: **${SUMMON_FRAGMENT_COST}x self fragments**`,
          "Summonable: **Battle Cards**, **Boost Cards**, and **Weapons**",
        ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    getPlayer(message.author.id, message.author.username);

    const players = readPlayers();
    const userId = String(message.author.id);
    const player = players[userId];

    if (!player) {
      return message.reply({
        content: "Player data was not found. Please try again.",
        allowedMentions: { repliedUser: false },
      });
    }

    const fragments = Array.isArray(player.fragments) ? [...player.fragments] : [];

    const card = findSummonableCard(query);

    if (card) {
      if (alreadyOwnsCard(player, card)) {
        return message.reply({
          content: `You already own **${getCardName(card)}**.`,
          allowedMentions: { repliedUser: false },
        });
      }

      const requirementError = getSpecialSummonRequirementError(player, card);

      if (requirementError) {
        return message.reply({
          content: requirementError,
          allowedMentions: { repliedUser: false },
        });
      }

      const fragmentIndex = findCardFragmentIndex(fragments, card);

      if (fragmentIndex === -1) {
        return message.reply({
          content: `You need **${SUMMON_FRAGMENT_COST}x ${getCardName(
            card
          )} Fragment** to summon this card.`,
          allowedMentions: { repliedUser: false },
        });
      }

      const ownedFragments = Number(fragments[fragmentIndex].amount || 0);

      if (ownedFragments < SUMMON_FRAGMENT_COST) {
        return message.reply({
          content: `You need **${SUMMON_FRAGMENT_COST}x ${getCardName(
            card
          )} Fragment**.\nYou currently have **${ownedFragments}x**.`,
          allowedMentions: { repliedUser: false },
        });
      }

      const consumed = consumeFragments(fragments, fragmentIndex, SUMMON_FRAGMENT_COST);
      const ownedCard = createOwnedCard(card);

      players[userId] = {
        ...player,
        cards: [...(player.cards || []), ownedCard],
        fragments: consumed.fragments,
      };

      writePlayers(players);

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
                `**Remaining Fragments:** ${consumed.remaining}`,
                "",
                "The card has been added to your collection.",
              ].join("\n")
            )
            .setImage(getSummonImage(ownedCard, card))
            .setFooter({ text: "One Piece Bot • Summon" }),
        ],
        allowedMentions: { repliedUser: false },
      });
    }

    const weapon = findWeaponByNameOnly(query);

    if (weapon) {
      if (alreadyOwnsWeapon(player, weapon)) {
        return message.reply({
          content: `You already own **${weapon.name}**.`,
          allowedMentions: { repliedUser: false },
        });
      }

      const fragmentIndex = findWeaponFragmentIndex(fragments, weapon);

      if (fragmentIndex === -1) {
        return message.reply({
          content: `You need **${SUMMON_FRAGMENT_COST}x ${weapon.name} Fragment** to summon this weapon.`,
          allowedMentions: { repliedUser: false },
        });
      }

      const ownedFragments = Number(fragments[fragmentIndex].amount || 0);

      if (ownedFragments < SUMMON_FRAGMENT_COST) {
        return message.reply({
          content: `You need **${SUMMON_FRAGMENT_COST}x ${weapon.name} Fragment**.\nYou currently have **${ownedFragments}x**.`,
          allowedMentions: { repliedUser: false },
        });
      }

      const consumed = consumeFragments(fragments, fragmentIndex, SUMMON_FRAGMENT_COST);

      players[userId] = {
        ...player,
        weapons: addWeaponToInventory(player.weapons || [], weapon),
        fragments: consumed.fragments,
      };

      writePlayers(players);

      const rarity = String(weapon.rarity || "C").toUpperCase();

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("⚔️ Weapon Summoned")
        .setDescription(
          [
            `**Weapon:** ${weapon.name}`,
            `**Type:** ${weapon.type || "Weapon"}`,
            `**Rarity:** ${rarity}`,
            `**Cost:** ${SUMMON_FRAGMENT_COST}x ${weapon.name} Fragment`,
            `**Remaining Fragments:** ${consumed.remaining}`,
            "",
            "The weapon has been added to your weapon inventory.",
          ].join("\n")
        )
        .setThumbnail(getRarityBadge(rarity) || null)
        .setImage(getWeaponImage(weapon.code, weapon.image || "") || weapon.image || null)
        .setFooter({ text: "One Piece Bot • Summon" });

      return message.reply({
        embeds: [embed],
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      content: `Battle card, boost card, or weapon matching \`${query}\` was not found.`,
      allowedMentions: { repliedUser: false },
    });
  },
};