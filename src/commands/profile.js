const { EmbedBuilder } = require("discord.js");
const { getPlayer, readPlayers } = require("../playerStore");
const { findPirateByUser, getRole } = require("../utils/pirateStore");
const {
  isPremiumUser,
  isLitePremiumUser,
} = require("../utils/premiumAccess");
const {
  PROFILE_BADGES,
  getRaidPrestigeBadgeEmoji,
} = require("../data/profileBadges");
const { hydrateCard } = require("../utils/evolution");
const { getPlayerCombatCards } = require("../utils/combatStats");
const { isMergeCard, getMergeFixedPower } = require("../utils/mergeCards");
const { getShipByCode, SHIPS } = require("../data/ships");
const weaponsDb = require("../data/weapons");
const devilFruitsDb = require("../data/devilFruits");

const DEFAULT_START_ISLAND = "Foosha Village";

const ARENA_START_RANK = 500;
const ARENA_POINTS_PER_RANK = 10;
const ARENA_TOTAL_RANKS = 500;
const ARENA_TOP_BOT_POINTS = 300;
const ARENA_POINT_STEP = 1;

const BOT_NAMES = [
  "Pirate King Bot",
  "Yonko Bot",
  "Fleet Admiral Bot",
  "Revolutionary Bot",
  "Warlord Bot",
  "CP0 Bot",
  "Supernova Bot",
  "Commander Bot",
  "Vice Admiral Bot",
  "New World Bot",
  "Grand Line Bot",
  "Marine Hero Bot",
  "Shichibukai Bot",
  "Worst Generation Bot",
  "Cipher Pol Bot",
  "Sky Island Bot",
  "Fishman Bot",
  "Dressrosa Bot",
  "Wano Samurai Bot",
  "Egghead Bot",
];

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function countTotalAmount(list) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
}

function getProfileImage(message) {
  return (
    message.member?.displayAvatarURL?.({ extension: "png", size: 512 }) ||
    message.author.displayAvatarURL({ extension: "png", size: 512 })
  );
}

async function isServerBooster(message) {
  try {
    const mainGuildId =
      process.env.ONEPIECE_MAIN_GUILD_ID ||
      process.env.MAIN_SERVER_ID ||
      process.env.SUPPORT_GUILD_ID ||
      process.env.SUPPORT_SERVER_ID ||
      null;

    let member = null;

    if (
      mainGuildId &&
      message.guild &&
      String(message.guild.id) === String(mainGuildId) &&
      message.member
    ) {
      member = message.member;
    }

    if (!member && mainGuildId && message.client?.guilds) {
      const guild =
        message.client.guilds.cache.get(String(mainGuildId)) ||
        (await message.client.guilds.fetch(String(mainGuildId)).catch(() => null));

      if (guild) {
        member =
          guild.members.cache.get(String(message.author.id)) ||
          (await guild.members.fetch(String(message.author.id)).catch(() => null));
      }
    }

    if (!member && message.member) {
      member = message.member;
    }

    return Boolean(member?.premiumSince || member?.premiumSinceTimestamp);
  } catch (_) {
    return false;
  }
}

function getHydratedCards(player) {
  return (Array.isArray(player.cards) ? player.cards : [])
    .map(hydrateCard)
    .filter(Boolean);
}

function isProfileMergeCard(card) {
  return isMergeCard(card);
}

function getProfileCardPower(card) {
  if (isProfileMergeCard(card)) {
    return getMergeFixedPower(card);
  }

  return Number(
    card.teamPower ||
      card.currentPower ||
      card.finalPower ||
      card.power ||
      Math.floor(
        Number(card.atk || card.finalAtk || card.displayAtk || 0) * 1.4 +
          Number(card.hp || card.finalHp || card.displayHp || 0) * 0.22 +
          Number(card.speed || card.spd || card.finalSpeed || card.displaySpeed || 0) * 9
      )
  );
}

function getRarityPower(rarity) {
  return (
    {
      C: 400,
      B: 800,
      A: 1400,
      S: 2400,
      SS: 3800,
      UR: 5600,
    }[String(rarity || "").toUpperCase()] || 400
  );
}

function getWeaponPowerByRarityAndLevel(rarity, level = 0) {
  return getRarityPower(rarity) + Math.max(0, Number(level || 0)) * 250;
}

function getFruitPowerByRarity(rarity) {
  return getRarityPower(rarity);
}

function findWeaponTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    weaponsDb.find((item) => normalize(item.code) === q) ||
    weaponsDb.find((item) => normalize(item.name) === q) ||
    weaponsDb.find((item) => normalize(item.code).includes(q)) ||
    weaponsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function findFruitTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    devilFruitsDb.find((item) => normalize(item.code) === q) ||
    devilFruitsDb.find((item) => normalize(item.name) === q) ||
    devilFruitsDb.find((item) => normalize(item.code).includes(q)) ||
    devilFruitsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function getAllOwnedCardsPower(player) {
  const cards = getHydratedCards(player);

  return cards.reduce((sum, card) => {
    return sum + getProfileCardPower(card);
  }, 0);
}

function getInventoryWeaponsPower(player) {
  const inventoryWeapons = Array.isArray(player.weapons) ? player.weapons : [];

  return inventoryWeapons.reduce((sum, entry) => {
    const template = findWeaponTemplate(entry.code || entry.name);
    if (!template) return sum;

    const amount = Math.max(0, Number(entry.amount || 0));
    const level = Math.max(0, Number(entry.upgradeLevel || 0));

    return sum + getWeaponPowerByRarityAndLevel(template.rarity, level) * amount;
  }, 0);
}

function getEquippedWeaponsPower(player) {
  const cards = Array.isArray(player.cards) ? player.cards : [];

  return cards.reduce((sum, rawCard) => {
    const equipped = Array.isArray(rawCard.equippedWeapons)
      ? rawCard.equippedWeapons
      : [];

    const equippedPower = equipped.reduce((sub, entry) => {
      const template = findWeaponTemplate(entry.code || entry.name);
      if (!template) return sub;

      return (
        sub +
        getWeaponPowerByRarityAndLevel(
          template.rarity,
          Number(entry.upgradeLevel || 0)
        )
      );
    }, 0);

    return sum + equippedPower;
  }, 0);
}

function getInventoryFruitsPower(player) {
  const inventoryFruits = Array.isArray(player.devilFruits)
    ? player.devilFruits
    : [];

  return inventoryFruits.reduce((sum, entry) => {
    const template = findFruitTemplate(entry.code || entry.name);
    if (!template) return sum;

    const amount = Math.max(0, Number(entry.amount || 0));

    return sum + getFruitPowerByRarity(template.rarity) * amount;
  }, 0);
}

function getEquippedFruitsPower(player) {
  const cards = Array.isArray(player.cards) ? player.cards : [];

  return cards.reduce((sum, rawCard) => {
    if (!rawCard.equippedDevilFruit) return sum;

    const template = findFruitTemplate(
      rawCard.equippedDevilFruitName || rawCard.equippedDevilFruit
    );

    if (!template) return sum;

    return sum + getFruitPowerByRarity(template.rarity);
  }, 0);
}

function getCollectionPower(player) {
  return (
    getAllOwnedCardsPower(player) +
    getInventoryWeaponsPower(player) +
    getEquippedWeaponsPower(player) +
    getInventoryFruitsPower(player) +
    getEquippedFruitsPower(player)
  );
}

function getTeamUnits(player) {
  const cards = getPlayerCombatCards(player);
  const slots = Array.isArray(player?.team?.slots)
    ? player.team.slots.slice(0, 3)
    : [null, null, null];

  return slots
    .map((instanceId) => {
      if (!instanceId) return null;

      return (
        cards.find(
          (card) =>
            String(card.instanceId) === String(instanceId) &&
            String(card.cardRole || "").toLowerCase() !== "boost"
        ) || null
      );
    })
    .filter(Boolean);
}

function getTeamPower(player) {
  return getTeamUnits(player).reduce(
    (sum, card) => sum + getProfileCardPower(card),
    0
  );
}

function getTotalPower(player) {
  return getCollectionPower(player);
}

function getStoryProgress(player) {
  const cleared = Array.isArray(player?.story?.clearedIslandBosses)
    ? player.story.clearedIslandBosses.length
    : 0;

  const currentIsland = player.currentIsland || DEFAULT_START_ISLAND;

  return `${cleared} bosses • ${currentIsland}`;
}

function looksLikeDiscordUserId(value) {
  return /^\d{15,25}$/.test(String(value || "").trim());
}

function cleanArenaUsername(value) {
  const text = String(value || "").trim();

  if (!text || looksLikeDiscordUserId(text)) return null;
  if (/^<@!?\d{15,25}>$/.test(text)) return null;

  return text;
}

function getProfileArenaDisplayName(message, userId, raw = {}) {
  const id = String(userId || "");

  const memberName = cleanArenaUsername(
    message?.guild?.members?.cache?.get(id)?.displayName
  );

  const userName = cleanArenaUsername(
    message?.client?.users?.cache?.get(id)?.username
  );

  const storedName =
    cleanArenaUsername(raw?.displayName) ||
    cleanArenaUsername(raw?.globalName) ||
    cleanArenaUsername(raw?.username) ||
    cleanArenaUsername(raw?.name) ||
    cleanArenaUsername(raw?.tag);

  return memberName || userName || storedName || `Player ${id.slice(-4)}`;
}

function firstPositiveProfileArenaNumber(...values) {
  for (const value of values) {
    const n = Number(value || 0);

    if (Number.isFinite(n) && n > 0) {
      return Math.floor(n);
    }
  }

  return 0;
}

function getProfileArenaCardAtk(card) {
  return Math.max(
    1,
    firstPositiveProfileArenaNumber(
      card?.atk,
      card?.displayAtk,
      card?.combatAtk,
      card?.finalAtk,
      card?.battleAtk,
      card?.teamAtk,
      card?.totalAtk,
      card?.baseAtk
    )
  );
}

function getProfileArenaCardHp(card) {
  return Math.max(
    1,
    firstPositiveProfileArenaNumber(
      card?.hp,
      card?.maxHp,
      card?.displayHp,
      card?.combatHp,
      card?.finalHp,
      card?.battleHp,
      card?.teamHp,
      card?.totalHp,
      card?.baseHp
    )
  );
}

function getProfileArenaCardSpeed(card) {
  return Math.max(
    1,
    firstPositiveProfileArenaNumber(
      card?.speed,
      card?.spd,
      card?.displaySpeed,
      card?.combatSpeed,
      card?.finalSpeed,
      card?.battleSpeed,
      card?.teamSpeed,
      card?.totalSpeed,
      card?.baseSpeed
    )
  );
}

function getProfileArenaPower(card) {
  if (isMergeCard(card)) return 100000;

  return Math.max(
    0,
    firstPositiveProfileArenaNumber(
      card?.battlePower,
      card?.combatPower,
      card?.teamPower,
      card?.currentPower,
      card?.finalPower,
      card?.displayPower,
      card?.power,
      card?.basePower,
      Math.floor(
        getProfileArenaCardAtk(card) * 1.4 +
          getProfileArenaCardHp(card) * 0.22 +
          getProfileArenaCardSpeed(card) * 9
      )
    )
  );
}

function getFastProfileArenaTeamCards(raw) {
  const cards = Array.isArray(raw?.cards) ? raw.cards : [];
  const slots = Array.isArray(raw?.team?.slots)
    ? raw.team.slots.slice(0, 3)
    : [];

  if (slots.filter(Boolean).length < 3 || cards.length < 3) return [];

  return slots
    .map((instanceId) =>
      cards.find(
        (card) =>
          String(card?.instanceId || "") === String(instanceId || "") &&
          String(card?.cardRole || "").toLowerCase() !== "boost"
      )
    )
    .filter(Boolean);
}

function getFastProfileArenaTeamPower(cards) {
  return (Array.isArray(cards) ? cards : []).reduce((total, card) => {
    const hydrated = hydrateCard(card) || card;
    return total + getProfileArenaPower(hydrated);
  }, 0);
}

function compareProfileArenaEntries(a, b) {
  const pointsA = Number(a?.points || 0);
  const pointsB = Number(b?.points || 0);

  if (pointsB !== pointsA) return pointsB - pointsA;

  const winsA = Number(a?.wins || 0);
  const winsB = Number(b?.wins || 0);

  if (winsB !== winsA) return winsB - winsA;

  const lossesA = Number(a?.losses || 0);
  const lossesB = Number(b?.losses || 0);

  if (lossesA !== lossesB) return lossesA - lossesB;

  const streakA = Number(a?.streak || 0);
  const streakB = Number(b?.streak || 0);

  if (streakB !== streakA) return streakB - streakA;

  const teamPowerA = Number(a?.teamPower || 0);
  const teamPowerB = Number(b?.teamPower || 0);

  if (teamPowerB !== teamPowerA) return teamPowerB - teamPowerA;

  if (Boolean(a?.isBot) !== Boolean(b?.isBot)) {
    return a?.isBot ? 1 : -1;
  }

  return String(a?.username || "").localeCompare(String(b?.username || ""));
}

function buildProfileFastArenaLeaderboard(message) {
  const allPlayers = readPlayers() || {};

  return Object.entries(allPlayers || {})
    .map(([userId, raw]) => {
      const id = String(userId || "");

      if (!id || id.startsWith("__")) return null;
      if (id === String(message?.client?.user?.id || "")) return null;

      const teamCards = getFastProfileArenaTeamCards(raw);
      if (teamCards.length !== 3) return null;

      const arena = raw?.arena || {};

      return {
        userId: id,
        username: getProfileArenaDisplayName(message, id, raw),
        points: Number(arena?.points || 0),
        wins: Number(arena?.wins || 0),
        losses: Number(arena?.losses || 0),
        draws: Number(arena?.draws || 0),
        matches: Number(arena?.matches || 0),
        streak: Number(arena?.streak || 0),
        isBot: false,
        teamPower: getFastProfileArenaTeamPower(teamCards),
      };
    })
    .filter(Boolean)
    .sort(compareProfileArenaEntries)
    .slice(0, ARENA_TOTAL_RANKS)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function getArenaRankFromLeaderboard(leaderboard, userId) {
  const found = (Array.isArray(leaderboard) ? leaderboard : []).find(
    (entry) => String(entry.userId) === String(userId)
  );

  return found?.rank || Math.min(
    ARENA_TOTAL_RANKS,
    (Array.isArray(leaderboard) ? leaderboard.length : 0) + 1
  );
}

function getArenaRankFromPoints(points) {
  const safePoints = Math.max(0, Number(points || 0));

  return Math.max(
    1,
    ARENA_START_RANK - Math.floor(safePoints / ARENA_POINTS_PER_RANK)
  );
}

function formatArenaRank(points, userId = null, message = null) {
  const rank =
    userId && message
      ? getArenaRankFromLeaderboard(
          buildProfileFastArenaLeaderboard(message),
          userId
        )
      : null;

  return `#${rank || getArenaRankFromPoints(points)}`;
}

function getArenaSummary(player, userId = null, message = null) {
  const arena = player?.arena || {};
  const points = Number(arena.points || 0);

  return {
    points,
    rank: formatArenaRank(points, userId, message),
    wins: Number(arena.wins || 0),
    losses: Number(arena.losses || 0),
    streak: Number(arena.streak || 0),
    bestStreak: Number(arena.bestStreak || 0),
  };
}

function getShipSummary(player) {
  const shipState = player?.ship || {};
  const tier = Number(shipState.tier || 1);
  const shipByCode = getShipByCode(shipState.shipCode || "");
  const shipByTier = SHIPS.find((ship) => Number(ship.tier || 1) === tier);

  const resolvedShip =
    shipByCode && shipByCode.code !== "small_boat"
      ? shipByCode
      : shipByTier || shipByCode;

  return {
    name: resolvedShip?.name || shipState.name || "Small Boat",
    tier: Number(resolvedShip?.tier || tier || 1),
  };
}

function isProfileBoostEntry(entry) {
  const role = String(entry?.cardRole || entry?.role || "").toLowerCase();
  const category = String(entry?.category || "").toLowerCase();

  return (
    role === "boost" ||
    category === "boost" ||
    Boolean(entry?.boostType) ||
    Boolean(entry?.boostTarget) ||
    Boolean(entry?.effectText)
  );
}

function getProfileEntryKey(entry, fallbackIndex = 0) {
  return String(
    entry?.instanceId ||
      entry?.id ||
      entry?.code ||
      entry?.cardCode ||
      entry?.name ||
      entry?.displayName ||
      `unknown_${fallbackIndex}`
  )
    .toLowerCase()
    .trim();
}

function uniqueProfileEntries(entries) {
  const seen = new Set();
  const out = [];

  for (const [index, entry] of (Array.isArray(entries) ? entries : []).entries()) {
    if (!entry) continue;

    const key = getProfileEntryKey(entry, index);
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(entry);
  }

  return out;
}

function getLiveProfileBattleCards(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];

  return cards.filter((card) => !isProfileBoostEntry(card));
}

function getLiveProfileBoostCards(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];
  const boostCards = Array.isArray(player?.boostCards) ? player.boostCards : [];
  const boosts = Array.isArray(player?.boosts) ? player.boosts : [];

  return uniqueProfileEntries([
    ...cards.filter(isProfileBoostEntry),
    ...boostCards,
    ...boosts,
  ]);
}

function getLiveProfileCardStage(card) {
  const rawStage = Number(card?.evolutionStage || 0);
  if (Number.isFinite(rawStage) && rawStage >= 1 && rawStage <= 3) {
    return rawStage;
  }

  const rawKey = String(card?.evolutionKey || card?.form || card?.stage || "").toUpperCase();
  const matched = rawKey.match(/M([123])/);
  if (matched) return Number(matched[1]);

  const hydrated = hydrateCard(card) || card;
  const hydratedStage = Number(hydrated?.evolutionStage || 0);
  if (Number.isFinite(hydratedStage) && hydratedStage >= 1 && hydratedStage <= 3) {
    return hydratedStage;
  }

  const hydratedKey = String(
    hydrated?.evolutionKey ||
      hydrated?.form ||
      hydrated?.stage ||
      ""
  ).toUpperCase();

  const hydratedMatched = hydratedKey.match(/M([123])/);
  if (hydratedMatched) return Number(hydratedMatched[1]);

  return 1;
}

function getProfileCardUniqueKey(card, index = 0, source = "cards") {
  return String(
    card?.instanceId ||
      card?.id ||
      card?.cardId ||
      card?.code ||
      card?.cardCode ||
      card?.name ||
      card?.displayName ||
      `${source}_${index}`
  )
    .toLowerCase()
    .trim();
}

function getAllLiveProfileCards(player) {
  const rawSources = [
    ...(Array.isArray(player?.cards) ? player.cards : []),
    ...(Array.isArray(player?.boostCards) ? player.boostCards : []),
    ...(Array.isArray(player?.boosts) ? player.boosts : []),
  ];

  const seen = new Set();
  const cards = [];

  for (const [index, rawCard] of rawSources.entries()) {
    if (!rawCard) continue;

    const key = getProfileCardUniqueKey(rawCard, index, "profile");
    if (seen.has(key)) continue;

    seen.add(key);
    cards.push(hydrateCard(rawCard) || rawCard);
  }

  return cards;
}

function getProfileCardStage(card) {
  const directStage = Number(card?.evolutionStage || 0);
  if (Number.isFinite(directStage) && directStage >= 1 && directStage <= 3) {
    return directStage;
  }

  const key = String(card?.evolutionKey || card?.form || card?.stage || "")
    .toUpperCase()
    .trim();

  const matched = key.match(/M([123])/);
  if (matched) return Number(matched[1]);

  return 1;
}

function getCardStatistics(player) {
  const cards = getAllLiveProfileCards(player);

  return {
    totalCards: cards.length,
    mastery1Cards: cards.filter((card) => getProfileCardStage(card) === 1).length,
    mastery2Cards: cards.filter((card) => getProfileCardStage(card) === 2).length,
    mastery3Cards: cards.filter((card) => getProfileCardStage(card) === 3).length,
  };
}

function getCaptainBadges(player, options = {}) {
  const badges = [];
  const seen = new Set();

  function addBadge(emoji) {
    if (!emoji || seen.has(emoji)) return;
    seen.add(emoji);
    badges.push(emoji);
  }

  if (options.isMotherFlame) {
    addBadge(PROFILE_BADGES.motherFlame);
  }

  if (options.isVivreCard) {
    addBadge(PROFILE_BADGES.vivreCard);
  }

  if (options.isBooster) {
    addBadge(PROFILE_BADGES.serverBooster);
  }

  const cards = getHydratedCards(player);

  for (const card of cards) {
    if (String(card.cardRole || "").toLowerCase() === "boost") continue;

    const prestige = Number(card.raidPrestige || 0);
    if (prestige < 200) continue;

    addBadge(getRaidPrestigeBadgeEmoji(card));
  }

  if (!badges.length) return "None";

  const visibleBadges = badges.slice(0, 18);
  const hiddenCount = Math.max(0, badges.length - visibleBadges.length);

  return hiddenCount
    ? `${visibleBadges.join(" ")} +${hiddenCount} more`
    : visibleBadges.join(" ");
}

function line(label, value) {
  return `↪ ${label}: \`${value}\``;
}

function rawLine(label, value) {
  return `↪ ${label}: ${value}`;
}

function formatPirateProfileLine(userId) {
  const pirate = findPirateByUser(userId);

  if (!pirate) {
    return "None";
  }

  const role = getRole(pirate, userId) || "Crew";
  const roleText = String(role || "Crew")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return `${pirate.name} ( ${roleText} )`;
}

function safeLocaleNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function getProfilePirateName(userId) {
  try {
    const pirate = findPirateByUser(userId);
    return pirate?.name || "Not Joined";
  } catch (_) {
    return "Not Joined";
  }
}

module.exports = {
  name: "profile",

  async execute(message) {
    try {
      const player = getPlayer(message.author.id, message.author.username);
      const pirateProfileText = formatPirateProfileLine(message.author.id);
      const totalFragments = countTotalAmount(player.fragments);

      const isMotherFlame = await isPremiumUser(message).catch(() => false);
      const isVivreCard = await isLitePremiumUser(message).catch(() => false);
      const booster = await isServerBooster(message).catch(() => false);

      const captainBadges = getCaptainBadges(player, {
        isMotherFlame,
        isVivreCard,
        isBooster: booster,
      });

      const totalPower = getTotalPower(player);
      const teamPower = getTeamPower(player);
      const storyProgress = getStoryProgress(player);
      const arena = getArenaSummary(player, message.author.id, message);
      const ship = getShipSummary(player);
      const cardStats = getCardStatistics(player);
      const pirateName = getProfilePirateName(message.author.id);
      const avatar = getProfileImage(message);

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setAuthor({
          name: `${player.username || message.author.username}'s Profile`,
          iconURL: avatar,
        })
        .setDescription(
          [
            "🌊 **Captain**",
            line("Island", player.currentIsland || DEFAULT_START_ISLAND),
            line(
              "Premium",
              isMotherFlame ? "Mother Flame" : isVivreCard ? "Vivre Card" : "Normal"
            ),
            line("Pirates", pirateProfileText),
            line("Ship", `${ship.name} • Tier ${ship.tier}`),
            rawLine("Badges", captainBadges),
            "",
            "💰 **Wallet**",
            line("Berries", safeLocaleNumber(player.berries)),
            line("Gems", safeLocaleNumber(player.gems)),
            "",
            "🃏 **Cards**",
            line("Cards Owned", cardStats.totalCards),
            line("Mastery 1 Cards", cardStats.mastery1Cards),
            line("Mastery 2 Cards", cardStats.mastery2Cards),
            line("Mastery 3 Cards", cardStats.mastery3Cards),
            line("Fragments", totalFragments),
            "",
            "🧩 **Progress**",
            line("Total Power", safeLocaleNumber(totalPower)),
            line("Team Power", safeLocaleNumber(teamPower)),
            line("Story", storyProgress),
            "",
            "⚔️ **Arena**",
            line("Rank", arena.rank),
            line("Points", arena.points),
            line("Record", `${arena.wins}W / ${arena.losses}L`),
            line("Streak", arena.streak),
            line("Best Streak", arena.bestStreak),
          ].join("\n")
        )
        .setThumbnail(avatar)
        .setFooter({
          text: "One Piece Bot • Profile",
        });

      return message.reply({
        embeds: [embed],
        allowedMentions: {
          repliedUser: false,
        },
      });
    } catch (error) {
      console.error("[PROFILE COMMAND ERROR]", error);

      return message.reply({
        content: `❌ Failed to load profile: \`${error.message || "Unknown error"}\``,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }
  },
};