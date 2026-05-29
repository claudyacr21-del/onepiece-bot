const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");
const { createOwnedCard } = require("../utils/evolution");
const rawCards = require("../data/cards");
const weaponsDb = require("../data/weapons");
const {
  MONSTER_TRIO_CARD,
  hydrateMonsterTrioBattleCard,
  findMonsterTrioMemberCards,
} = require("../data/cards");
const { getWeaponImage, getRarityBadge } = require("../config/assetLinks");

const SUMMON_FRAGMENT_COST = 15;
const MONSTER_TRIO_FRAGMENT_COST = 50;
const SUMMONABLE_CARD_ROLES = new Set(["battle", "boost"]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s,&]+/g, "")
    .replace(/\s+/g, " ");
}

function getCardName(card) {
  return card.displayName || card.name || "Unknown Card";
}

function getCardRole(card) {
  return String(card?.cardRole || "battle").toLowerCase();
}

function isSummonableCard(card) {
  if (!card) return false;

  const code = normalize(card.code);
  if (code === "lzs") return false;

  if (card.canPull === false && card.canPA === false && card.summonOnly === true) {
    return code !== "lzs";
  }

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
      score: scoreNameOnly(query, [card.displayName, card.name, card.code]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].card : null;
}

function findWeaponByNameOnly(query) {
  const scored = weaponsDb
    .map((weapon) => ({
      weapon,
      score: scoreNameOnly(query, [weapon.name, weapon.code]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].weapon : null;
}

function isMatchingCardFragment(frag, card) {
  const cardCode = normalize(card?.code);
  const cardName = normalize(getCardName(card));

  const fragCode = normalize(frag?.code);
  const fragName = normalize(frag?.name || frag?.displayName);
  const fragCardCode = normalize(
    frag?.cardCode ||
      frag?.sourceCode ||
      frag?.characterCode ||
      frag?.sourceCardCode ||
      frag?.targetCode
  );

  return (
    fragCode === cardCode ||
    fragCardCode === cardCode ||
    fragName === cardName ||
    fragName === `${cardName} fragment` ||
    fragName.includes(cardName) ||
    cardName.includes(fragName)
  );
}

function getCardFragmentMatches(fragments, card) {
  return (Array.isArray(fragments) ? fragments : [])
    .map((frag, index) => ({
      frag,
      index,
      amount: Number(frag?.amount || frag?.count || frag?.quantity || 0),
    }))
    .filter((entry) => entry.amount > 0 && isMatchingCardFragment(entry.frag, card));
}

function getTotalCardFragments(fragments, card) {
  return getCardFragmentMatches(fragments, card).reduce(
    (total, entry) => total + Number(entry.amount || 0),
    0
  );
}

function consumeCardFragments(fragments, card, amount) {
  const arr = Array.isArray(fragments) ? [...fragments] : [];
  let remainingToConsume = Number(amount || 0);

  const matches = getCardFragmentMatches(arr, card).sort((a, b) => {
    const aExactCode = normalize(a.frag?.code) === normalize(card?.code) ? 1 : 0;
    const bExactCode = normalize(b.frag?.code) === normalize(card?.code) ? 1 : 0;

    if (bExactCode !== aExactCode) return bExactCode - aExactCode;
    return b.amount - a.amount;
  });

  const totalOwned = matches.reduce((total, entry) => total + entry.amount, 0);

  if (totalOwned < amount) {
    return null;
  }

  for (const match of matches) {
    if (remainingToConsume <= 0) break;

    const currentIndex = arr.findIndex((entry) => entry === match.frag);
    if (currentIndex < 0) continue;

    const currentAmount = Number(
      arr[currentIndex]?.amount ||
        arr[currentIndex]?.count ||
        arr[currentIndex]?.quantity ||
        0
    );

    const take = Math.min(currentAmount, remainingToConsume);
    const left = currentAmount - take;

    remainingToConsume -= take;

    if (left <= 0) {
      arr.splice(currentIndex, 1);
    } else {
      arr[currentIndex] = {
        ...arr[currentIndex],
        amount: left,
      };

      if ("count" in arr[currentIndex]) arr[currentIndex].count = left;
      if ("quantity" in arr[currentIndex]) arr[currentIndex].quantity = left;
    }
  }

  return {
    fragments: arr,
    remaining: totalOwned - amount,
  };
}

function getWeaponFragmentCode(weapon) {
  return `weapon_fragment_${String(weapon.code || "").toLowerCase()}`;
}

function isMatchingWeaponFragment(frag, weapon) {
  const fragmentCode = normalize(getWeaponFragmentCode(weapon));
  const weaponCode = normalize(weapon?.code);
  const weaponName = normalize(weapon?.name);
  const fragmentName = normalize(`${weapon?.name || ""} Fragment`);

  const fragCode = normalize(frag?.code);
  const fragName = normalize(frag?.name || frag?.displayName);
  const fragWeaponCode = normalize(
    frag?.weaponCode ||
      frag?.sourceCode ||
      frag?.sourceWeaponCode ||
      frag?.targetCode
  );

  return (
    fragCode === fragmentCode ||
    fragCode === weaponCode ||
    fragWeaponCode === weaponCode ||
    fragName === fragmentName ||
    fragName === weaponName ||
    fragName.includes(weaponName) ||
    weaponName.includes(fragName)
  );
}

function getWeaponFragmentMatches(fragments, weapon) {
  return (Array.isArray(fragments) ? fragments : [])
    .map((frag, index) => ({
      frag,
      index,
      amount: Number(frag?.amount || frag?.count || frag?.quantity || 0),
    }))
    .filter((entry) => entry.amount > 0 && isMatchingWeaponFragment(entry.frag, weapon));
}

function getTotalWeaponFragments(fragments, weapon) {
  return getWeaponFragmentMatches(fragments, weapon).reduce(
    (total, entry) => total + Number(entry.amount || 0),
    0
  );
}

function consumeWeaponFragments(fragments, weapon, amount) {
  const arr = Array.isArray(fragments) ? [...fragments] : [];
  let remainingToConsume = Number(amount || 0);

  const matches = getWeaponFragmentMatches(arr, weapon).sort((a, b) => {
    const aExactCode = normalize(a.frag?.code) === normalize(getWeaponFragmentCode(weapon)) ? 1 : 0;
    const bExactCode = normalize(b.frag?.code) === normalize(getWeaponFragmentCode(weapon)) ? 1 : 0;

    if (bExactCode !== aExactCode) return bExactCode - aExactCode;
    return b.amount - a.amount;
  });

  const totalOwned = matches.reduce((total, entry) => total + entry.amount, 0);

  if (totalOwned < amount) {
    return null;
  }

  for (const match of matches) {
    if (remainingToConsume <= 0) break;

    const currentIndex = arr.findIndex((entry) => entry === match.frag);
    if (currentIndex < 0) continue;

    const currentAmount = Number(
      arr[currentIndex]?.amount ||
        arr[currentIndex]?.count ||
        arr[currentIndex]?.quantity ||
        0
    );

    const take = Math.min(currentAmount, remainingToConsume);
    const left = currentAmount - take;

    remainingToConsume -= take;

    if (left <= 0) {
      arr.splice(currentIndex, 1);
    } else {
      arr[currentIndex] = {
        ...arr[currentIndex],
        amount: left,
      };

      if ("count" in arr[currentIndex]) arr[currentIndex].count = left;
      if ("quantity" in arr[currentIndex]) arr[currentIndex].quantity = left;
    }
  }

  return {
    fragments: arr,
    remaining: totalOwned - amount,
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
    statPercent: weapon.statPercent || {
      atk: 0,
      hp: 0,
      speed: 0,
    },
    baseStatPercent: weapon.baseStatPercent || weapon.statPercent || undefined,
    ownerBonusPercent: weapon.ownerBonusPercent || {
      atk: 0,
      hp: 0,
      speed: 0,
    },
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

function isMonsterTrioQuery(query) {
  const q = normalize(query);

  return (
    q === "lzs" ||
    q === "monster trio" ||
    q === "luffy zoro sanji" ||
    q === "luffy zoro and sanji" ||
    q === "luffy zoro sanji monster trio"
  );
}

function makePseudoCard(code, name) {
  return {
    code,
    name,
    displayName: name,
  };
}

const MONSTER_TRIO_FRAGMENT_REQUIREMENTS = [
  {
    label: "Luffy",
    code: "luffy_straw_hat",
    name: "Monkey D. Luffy",
    amount: MONSTER_TRIO_FRAGMENT_COST,
    pseudoCards: [
      makePseudoCard("luffy_straw_hat", "Monkey D. Luffy"),
      makePseudoCard("luffy", "Luffy"),
      makePseudoCard("monkey_d_luffy", "Monkey D. Luffy"),
    ],
  },
  {
    label: "Zoro",
    code: "zoro_pirate_hunter",
    name: "Roronoa Zoro",
    amount: MONSTER_TRIO_FRAGMENT_COST,
    pseudoCards: [
      makePseudoCard("zoro_pirate_hunter", "Roronoa Zoro"),
      makePseudoCard("zoro", "Zoro"),
      makePseudoCard("roronoa_zoro", "Roronoa Zoro"),
    ],
  },
  {
    label: "Sanji",
    code: "sanji_black_leg",
    name: "Sanji",
    amount: MONSTER_TRIO_FRAGMENT_COST,
    pseudoCards: [
      makePseudoCard("sanji_black_leg", "Sanji"),
      makePseudoCard("sanji", "Sanji"),
      makePseudoCard("vinsmoke_sanji", "Vinsmoke Sanji"),
    ],
  },
];

function getMonsterTrioOwnedFragments(fragments, requirement) {
  return requirement.pseudoCards.reduce((best, card) => {
    return Math.max(best, getTotalCardFragments(fragments, card));
  }, 0);
}

function consumeMonsterTrioFragments(fragments, requirement) {
  let current = Array.isArray(fragments) ? fragments : [];

  const sortedPseudoCards = [...requirement.pseudoCards].sort((a, b) => {
    const aOwned = getTotalCardFragments(current, a);
    const bOwned = getTotalCardFragments(current, b);
    return bOwned - aOwned;
  });

  for (const pseudoCard of sortedPseudoCards) {
    const consumed = consumeCardFragments(current, pseudoCard, requirement.amount);
    if (consumed) return consumed;
  }

  return null;
}

function ownsRoadPoneglyph(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];

  return cards.some((card) => {
    const code = normalize(card?.code);
    const name = normalize(card?.displayName || card?.name || card?.title);

    return (
      code === "road poneglyph" ||
      code === "road_poneglyph" ||
      name === "road poneglyph" ||
      name.includes("road poneglyph")
    );
  });
}

function alreadyOwnsMonsterTrio(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];

  return cards.some((card) => {
    const code = normalize(card?.code);
    const name = normalize(card?.displayName || card?.name || card?.title);

    return (
      code === "lzs" ||
      name === "monster trio" ||
      name.includes("luffy zoro sanji")
    );
  });
}

function getMonsterTrioMissingMembers(player) {
  const members = findMonsterTrioMemberCards(player);

  return members
    .filter((entry) => !entry.card)
    .map((entry) => {
      if (normalize(entry.code).includes("luffy")) return "Luffy";
      if (normalize(entry.code).includes("zoro")) return "Zoro";
      if (normalize(entry.code).includes("sanji")) return "Sanji";
      return entry.code;
    });
}

function createOwnedMonsterTrio(player) {
  const base = hydrateMonsterTrioBattleCard(player, MONSTER_TRIO_CARD);
  const owned = createOwnedCard(base);
  const now = Date.now();
  const instanceId = `lzs_${now}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    ...owned,
    ...base,
    id: instanceId,
    instanceId,
    code: "lzs",
    name: "Monster Trio",
    displayName: "Monster Trio",
    title: "Monster Trio",
    rarity: "M",
    currentTier: "M",
    baseTier: "M",
    originalTier: "M",
    baseRarity: "M",
    cardRole: "battle",
    type: "Merge Battle",
    isMonsterTrio: true,
    isMergeBattleCard: true,
    mergeBattleCode: "lzs",
    mergeMembers: ["luffy_straw_hat", "zoro_pirate_hunter", "sanji_black_leg"],
    mergeStatPercent: 50,
    canPull: false,
    canPA: false,
    summonOnly: true,
    requireRoadPoneglyph: true,
    evolutionStage: 1,
    evolutionKey: "M1",
    level: Number(owned?.level || 1),
    exp: Number(owned?.exp || 0),
    fragments: Number(owned?.fragments || 0),
    obtainedAt: now,
    source: "Summon",
  };
}

function getMonsterTrioSummonStatus(player, fragments) {
  const missingMembers = getMonsterTrioMissingMembers(player);

  const fragmentStatus = MONSTER_TRIO_FRAGMENT_REQUIREMENTS.map((req) => ({
    ...req,
    owned: getMonsterTrioOwnedFragments(fragments, req),
  }));

  return {
    hasRoadPoneglyph: ownsRoadPoneglyph(player),
    missingMembers,
    fragmentStatus,
    missingFragments: fragmentStatus.filter((entry) => entry.owned < entry.amount),
  };
}

module.exports = {
  name: "summon",

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply({
        content: [
          "Usage: `op summon <name>`",
          "Example: `op summon luffy`",
          "Example: `op summon baccarat`",
          "Example: `op summon kikoku`",
          "Example: `op summon lzs`",
          "",
          `Cost: **${SUMMON_FRAGMENT_COST}x self fragments**`,
          "Monster Trio/LZS Cost: **50x Luffy Fragment + 50x Zoro Fragment + 50x Sanji Fragment + Road Poneglyph card**",
          "Summonable: **Battle Cards**, **Boost Cards**, and **Weapons**",
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const isMonsterTrioSummon = isMonsterTrioQuery(query);
    const card = isMonsterTrioSummon ? null : findSummonableCard(query);
    const weapon = isMonsterTrioSummon || card ? null : findWeaponByNameOnly(query);

    if (!isMonsterTrioSummon && !card && !weapon) {
      return message.reply({
        content: `Battle card, boost card, or weapon matching \`${query}\` was not found.`,
        allowedMentions: { repliedUser: false },
      });
    }

    let summonedType = "";
    let summonedName = "";
    let summonedRarity = "C";
    let remainingFragments = 0;
    let ownedCard = null;
    let weaponImage = null;
    let weaponBadge = null;
    let weaponType = null;
    let cardRoleLabel = null;
    let monsterTrioConsumedLines = [];

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const fragments = Array.isArray(fresh.fragments)
            ? fresh.fragments.map((fragment) => ({ ...fragment }))
            : [];

          if (isMonsterTrioSummon) {
            if (alreadyOwnsMonsterTrio(fresh)) {
              throw new Error("You already own **Monster Trio**.");
            }

            const status = getMonsterTrioSummonStatus(fresh, fragments);

            if (!status.hasRoadPoneglyph) {
              throw new Error(
                [
                  "You cannot summon **Monster Trio** yet.",
                  "",
                  "**Special Requirement:**",
                  "You must own **Road Poneglyph** first.",
                ].join("\n")
              );
            }

            if (status.missingMembers.length) {
              throw new Error(
                [
                  "You cannot summon **Monster Trio** yet.",
                  "",
                  "**Required Original Cards:**",
                  "You must own **Luffy**, **Zoro**, and **Sanji** first.",
                  "",
                  `Missing: ${status.missingMembers.join(", ")}`,
                ].join("\n")
              );
            }

            if (status.missingFragments.length) {
              throw new Error(
                [
                  "You need these fragments to summon **Monster Trio**:",
                  "",
                  ...status.fragmentStatus.map(
                    (entry) => `• ${entry.label} Fragment: ${entry.owned}/${entry.amount}`
                  ),
                ].join("\n")
              );
            }

            let nextFragments = fragments;

            for (const req of MONSTER_TRIO_FRAGMENT_REQUIREMENTS) {
              const consumed = consumeMonsterTrioFragments(nextFragments, req);

              if (!consumed) {
                throw new Error(`Failed to consume ${req.label} fragments.`);
              }

              nextFragments = consumed.fragments;
              monsterTrioConsumedLines.push(`${req.label} Fragment x${req.amount}`);
            }

            ownedCard = createOwnedMonsterTrio(fresh);
            summonedType = "monster_trio";
            summonedName = "Monster Trio";
            summonedRarity = "M";
            remainingFragments = 0;

            return {
              ...fresh,
              cards: [...(fresh.cards || []), ownedCard],
              fragments: nextFragments,
            };
          }

          if (card) {
            if (alreadyOwnsCard(fresh, card)) {
              throw new Error(`You already own **${getCardName(card)}**.`);
            }

            const requirementError = getSpecialSummonRequirementError(fresh, card);

            if (requirementError) {
              throw new Error(requirementError);
            }

            const ownedFragments = getTotalCardFragments(fragments, card);

            if (ownedFragments <= 0) {
              throw new Error(
                `You need **${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment** to summon this card.`
              );
            }

            if (ownedFragments < SUMMON_FRAGMENT_COST) {
              throw new Error(
                `You need **${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment**.\nYou currently have **${ownedFragments}x**.`
              );
            }

            const consumed = consumeCardFragments(fragments, card, SUMMON_FRAGMENT_COST);

            if (!consumed) {
              throw new Error("Failed to consume fragments.");
            }

            ownedCard = createOwnedCard(card);
            summonedType = "card";
            summonedName = getCardName(card);
            summonedRarity = String(card.baseTier || card.rarity || "C").toUpperCase();
            remainingFragments = consumed.remaining;
            cardRoleLabel = getRoleLabel(card);

            return {
              ...fresh,
              cards: [...(fresh.cards || []), ownedCard],
              fragments: consumed.fragments,
            };
          }

          if (alreadyOwnsWeapon(fresh, weapon)) {
            throw new Error(`You already own **${weapon.name}**.`);
          }

          const ownedFragments = getTotalWeaponFragments(fragments, weapon);

          if (ownedFragments <= 0) {
            throw new Error(
              `You need **${SUMMON_FRAGMENT_COST}x ${weapon.name} Fragment** to summon this weapon.`
            );
          }

          if (ownedFragments < SUMMON_FRAGMENT_COST) {
            throw new Error(
              `You need **${SUMMON_FRAGMENT_COST}x ${weapon.name} Fragment**.\nYou currently have **${ownedFragments}x**.`
            );
          }

          const consumed = consumeWeaponFragments(fragments, weapon, SUMMON_FRAGMENT_COST);

          if (!consumed) {
            throw new Error("Failed to consume fragments.");
          }

          summonedType = "weapon";
          summonedName = weapon.name;
          summonedRarity = String(weapon.rarity || "C").toUpperCase();
          remainingFragments = consumed.remaining;
          weaponType = weapon.type || "Weapon";
          weaponImage = getWeaponImage(weapon.code, weapon.image || "") || weapon.image || null;
          weaponBadge = getRarityBadge(summonedRarity) || null;

          return {
            ...fresh,
            weapons: addWeaponToInventory(fresh.weapons || [], weapon),
            fragments: consumed.fragments,
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to summon.",
        allowedMentions: { repliedUser: false },
      });
    }

    if (summonedType === "monster_trio") {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8e44ad)
            .setTitle("🔥 Monster Trio Summoned")
            .setDescription(
              [
                `**Card:** ${summonedName}`,
                `**Type:** Battle Card`,
                `**Rarity:** ${summonedRarity}`,
                `**Source:** Road Poneglyph`,
                "",
                "**Consumed Fragments:**",
                ...monsterTrioConsumedLines.map((line) => `• ${line}`),
                "",
                "**Special Logic:**",
                "Stats are calculated from **50% Luffy + 50% Zoro + 50% Sanji**.",
                "Weapon and Devil Fruit display are inherited from the original three cards.",
                "",
                "The card has been added to your collection.",
              ].join("\n")
            )
            .setImage(getSummonImage(ownedCard, MONSTER_TRIO_CARD))
            .setFooter({
              text: "One Piece Bot • Monster Trio Summon",
            }),
        ],
        allowedMentions: { repliedUser: false },
      });
    }

    if (summonedType === "card") {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(getCardRole(card) === "boost" ? 0x9b59b6 : 0xf1c40f)
            .setTitle("✨ Card Summoned")
            .setDescription(
              [
                `**Card:** ${summonedName}`,
                `**Type:** ${cardRoleLabel}`,
                `**Rarity:** ${summonedRarity}`,
                `**Cost:** ${SUMMON_FRAGMENT_COST}x ${summonedName} Fragment`,
                `**Remaining Fragments:** ${remainingFragments}`,
                "",
                "The card has been added to your collection.",
              ].join("\n")
            )
            .setImage(getSummonImage(ownedCard, card))
            .setFooter({
              text: "One Piece Bot • Summon",
            }),
        ],
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("⚔️ Weapon Summoned")
          .setDescription(
            [
              `**Weapon:** ${summonedName}`,
              `**Type:** ${weaponType}`,
              `**Rarity:** ${summonedRarity}`,
              `**Cost:** ${SUMMON_FRAGMENT_COST}x ${summonedName} Fragment`,
              `**Remaining Fragments:** ${remainingFragments}`,
              "",
              "The weapon has been added to your weapon inventory.",
            ].join("\n")
          )
          .setThumbnail(weaponBadge)
          .setImage(weaponImage)
          .setFooter({
            text: "One Piece Bot • Summon",
          }),
      ],
      allowedMentions: { repliedUser: false },
    });
  },
};