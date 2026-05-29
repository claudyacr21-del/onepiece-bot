const { EmbedBuilder } = require("discord.js");
const { getPlayer, readPlayers } = require("../playerStore");
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
    return sum + Number(card.currentPower || 0);
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
    (sum, card) => sum + Number(card?.currentPower || 0),
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

function getBotName(index) {
  const base = BOT_NAMES[index % BOT_NAMES.length];
  const cycle = Math.floor(index / BOT_NAMES.length);

  return cycle === 0 ? base : `${base} ${cycle + 1}`;
}

function getBotPoints(index) {
  return Math.max(0, ARENA_TOP_BOT_POINTS - index * ARENA_POINT_STEP);
}

function getBotWins(points) {
  return Math.max(0, Math.floor(Number(points || 0) / 10));
}

function getBotLosses(index) {
  return Math.floor(index / 25);
}

function buildProfileArenaBots(count = ARENA_TOTAL_RANKS) {
  return Array.from({ length: count }, (_, index) => {
    const points = getBotPoints(index);

    return {
      id: `arena_bot_${String(index + 1).padStart(3, "0")}`,
      username: getBotName(index),
      points,
      wins: getBotWins(points),
      losses: getBotLosses(index),
      matches: getBotWins(points) + getBotLosses(index),
      isBot: true,
    };
  });
}

function getArenaRankFromPoints(points) {
  const safePoints = Math.max(0, Number(points || 0));

  return Math.max(
    1,
    ARENA_START_RANK - Math.floor(safePoints / ARENA_POINTS_PER_RANK)
  );
}

function getArenaLeaderboardRankForUser(userId, playersMap) {
  const realPlayers = Object.entries(playersMap || {})
    .map(([id, player]) => ({
      id,
      username: player.username || "Unknown",
      points: Number(player?.arena?.points || 0),
      wins: Number(player?.arena?.wins || 0),
      losses: Number(player?.arena?.losses || 0),
      matches: Number(player?.arena?.matches || 0),
      isBot: false,
    }))
    .filter((entry) => {
      return (
        entry.matches > 0 ||
        entry.points > 0 ||
        entry.wins > 0 ||
        entry.losses > 0
      );
    });

  const botCount = Math.max(0, ARENA_TOTAL_RANKS - realPlayers.length);

  const rows = [...buildProfileArenaBots(botCount), ...realPlayers]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      if (a.isBot !== b.isBot) return a.isBot ? -1 : 1;

      return String(a.username).localeCompare(String(b.username));
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return rows.find((row) => String(row.id) === String(userId))?.rank || null;
}

function formatArenaRank(points, userId = null) {
  const rank = userId
    ? getArenaLeaderboardRankForUser(userId, readPlayers() || {})
    : null;

  return `#${rank || getArenaRankFromPoints(points)}`;
}

function getArenaSummary(player, userId = null) {
  const arena = player?.arena || {};
  const points = Number(arena.points || 0);

  return {
    points,
    rank: formatArenaRank(points, userId),
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

function getCardStatistics(player) {
  const cards = getHydratedCards(player);

  return {
    totalCards: cards.length,
    mastery1Cards: cards.filter(
      (card) => Number(card?.evolutionStage || 1) === 1
    ).length,
    mastery2Cards: cards.filter(
      (card) => Number(card?.evolutionStage || 1) === 2
    ).length,
    mastery3Cards: cards.filter(
      (card) => Number(card?.evolutionStage || 1) === 3
    ).length,
    boostCards: cards.filter(
      (card) => String(card?.cardRole || "").toLowerCase() === "boost"
    ).length,
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

function safeLocaleNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

module.exports = {
  name: "profile",

  async execute(message) {
    try {
      const player = getPlayer(message.author.id, message.author.username);

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
      const arena = getArenaSummary(player, message.author.id);
      const ship = getShipSummary(player);
      const cardStats = getCardStatistics(player);
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
            line("Pirates", player?.pirates?.name || "Coming Soon"),
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
            line("Boost Cards", cardStats.boostCards),
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