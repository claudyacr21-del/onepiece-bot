const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { isPremiumUser } = require("../utils/premiumAccess");
const {
  PROFILE_BADGES,
  getRaidPrestigeBadgeEmoji,
} = require("../data/profileBadges");
const { hydrateCard } = require("../utils/evolution");
const { getShipByCode, SHIPS } = require("../data/ships");

const DEFAULT_START_ISLAND = "Foosha Village";
const ARENA_START_RANK = 500;
const ARENA_POINTS_PER_RANK = 10;

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
}

function getHydratedCards(player) {
  return (Array.isArray(player.cards) ? player.cards : [])
    .map(hydrateCard)
    .filter(Boolean);
}

function getTeamUnits(player) {
  const cards = getHydratedCards(player);
  const slots = Array.isArray(player?.team?.slots)
    ? player.team.slots
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
  return getHydratedCards(player).reduce(
    (sum, card) => sum + Number(card?.currentPower || 0),
    0
  );
}

function getStoryProgress(player) {
  const cleared = Array.isArray(player?.story?.clearedIslandBosses)
    ? player.story.clearedIslandBosses.length
    : 0;

  const currentIsland = player.currentIsland || DEFAULT_START_ISLAND;

  return `${cleared} bosses • ${currentIsland}`;
}

function getArenaRankFromPoints(points) {
  const safePoints = Math.max(0, Number(points || 0));
  return Math.max(
    1,
    ARENA_START_RANK - Math.floor(safePoints / ARENA_POINTS_PER_RANK)
  );
}

function formatArenaRank(points) {
  return `#${getArenaRankFromPoints(points)}`;
}

function getArenaSummary(player) {
  const arena = player?.arena || {};
  const points = Number(arena.points || 0);

  return {
    points,
    rank: formatArenaRank(points),
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

  return badges.length ? badges.join(" ") : "None";
}

function line(label, value) {
  return `↪ ${label}: \`${value}\``;
}

function rawLine(label, value) {
  return `↪ ${label}: ${value}`;
}

module.exports = {
  name: "profile",
  aliases: ["pf", "me"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const totalFragments = countTotalAmount(player.fragments);
    const isMotherFlame = await isPremiumUser(message);
    const booster = await isServerBooster(message);
    const captainBadges = getCaptainBadges(player, {
      isMotherFlame,
      isBooster: booster,
    });
    const totalPower = getTotalPower(player);
    const teamPower = getTeamPower(player);
    const storyProgress = getStoryProgress(player);
    const arena = getArenaSummary(player);
    const ship = getShipSummary(player);
    const cardStats = getCardStatistics(player);
    const avatar = getProfileImage(message);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setAuthor({
        name: `${player.username}'s Profile`,
        iconURL: avatar,
      })
      .setDescription(
        [
          "**🌊 Captain**",
          line("Island", player.currentIsland || DEFAULT_START_ISLAND),
          line("Premium", isMotherFlame ? "Mother Flame" : "Normal"),
          line("Clan", player?.clan?.name || "Coming Soon"),
          line("Ship", `${ship.name} • Tier ${ship.tier}`),
          rawLine("Badges", captainBadges),
          "",
          "**💰 Wallet**",
          line("Berries", Number(player.berries || 0).toLocaleString("en-US")),
          line("Gems", Number(player.gems || 0).toLocaleString("en-US")),
          "",
          "**🃏 Cards**",
          line("Cards Owned", cardStats.totalCards),
          line("Mastery 1 Cards", cardStats.mastery1Cards),
          line("Mastery 2 Cards", cardStats.mastery2Cards),
          line("Mastery 3 Cards", cardStats.mastery3Cards),
          line("Boost Cards", cardStats.boostCards),
          line("Fragments", totalFragments),
          "",
          "**🧩 Progress**",
          line("Total Power", totalPower.toLocaleString("en-US")),
          line("Team Power", teamPower.toLocaleString("en-US")),
          line("Story", storyProgress),
          "",
          "**⚔️ Arena**",
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
    });
  },
};