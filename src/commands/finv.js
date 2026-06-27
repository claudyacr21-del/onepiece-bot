const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { getPlayer } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { getPirateFragmentStorageBonus } = require("../utils/pirateBoosts");
const cardsData = require("../data/cards");
const weaponsData = require("../data/weapons");
const PAGE_SIZE = 8;
const COLOR = 0x8e44ad;
const BASE_FRAGMENT_STORAGE = 200;
const MAX_FRAGMENT_STORAGE = 5000;
const VALID_RARITIES = new Set(["C", "B", "A", "S", "SS", "UR"]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function formatRarity(rarity) {
  return String(rarity || "C").toUpperCase();
}

function getDisplayName(fragment) {
  return (
    fragment?.displayName ||
    fragment?.name ||
    fragment?.title ||
    String(fragment?.code || "Unknown Fragment")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
  );
}

function getFragmentAmount(fragment) {
  const amount = Number(fragment?.amount || 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function normalizeFragmentCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeFragmentName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['".]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function isValidRarity(value) {
  return VALID_RARITIES.has(String(value || "").toUpperCase()) || String(value || "").toUpperCase() === "M";
}

function getCatalogRarity(entry) {
  const rarity = String(
    entry?.currentTier ||
      entry?.tier ||
      entry?.rarity ||
      entry?.baseTier ||
      entry?.baseRarity ||
      "C"
  ).toUpperCase();

  return isValidRarity(rarity) ? rarity : "C";
}

function getFragmentCatalogMatch(fragment) {
  const category = String(fragment?.category || "").toLowerCase();
  const codeKeys = [
    fragment?.code,
    fragment?.cardCode,
    fragment?.sourceCode,
    fragment?.weaponCode,
    String(fragment?.code || "").replace(/^fragment_/i, ""),
    String(fragment?.code || "").replace(/_fragment$/i, ""),
  ]
    .map(normalizeFragmentCode)
    .filter(Boolean);

  const nameKeys = [
    fragment?.displayName,
    fragment?.name,
    fragment?.title,
    String(fragment?.name || "").replace(/\s+fragment$/i, ""),
    String(fragment?.displayName || "").replace(/\s+fragment$/i, ""),
  ]
    .map(normalizeFragmentName)
    .filter(Boolean);

  if (category === "weapon") {
    return (
      (Array.isArray(weaponsData) ? weaponsData : []).find((weapon) => {
        const weaponCodes = [
          weapon?.code,
          weapon?.id,
          weapon?.name,
        ]
          .map(normalizeFragmentCode)
          .filter(Boolean);

        const weaponNames = [
          weapon?.name,
          weapon?.displayName,
          weapon?.title,
        ]
          .map(normalizeFragmentName)
          .filter(Boolean);

        return (
          codeKeys.some((key) => weaponCodes.includes(key)) ||
          nameKeys.some((key) => weaponNames.includes(key))
        );
      }) || null
    );
  }

  return (
    (Array.isArray(cardsData) ? cardsData : []).find((card) => {
      const cardCodes = [
        card?.code,
        card?.baseCode,
        card?.id,
      ]
        .map(normalizeFragmentCode)
        .filter(Boolean);

      const cardNames = [
        card?.displayName,
        card?.name,
        card?.title,
        card?.variant,
      ]
        .map(normalizeFragmentName)
        .filter(Boolean);

      return (
        codeKeys.some((key) => cardCodes.includes(key)) ||
        nameKeys.some((key) => cardNames.includes(key))
      );
    }) || null
  );
}

function getDisplayRarity(fragment) {
  const matched = getFragmentCatalogMatch(fragment);

  if (matched) {
    return getCatalogRarity(matched);
  }

  return formatRarity(fragment?.rarity);
}

function getStorageInfo(player, fragments, userId) {
  const total = fragments.reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0)), 0);
  const passiveBoosts = getPassiveBoostSummary(player);
  const passiveBonus = Math.max(0, Number(passiveBoosts?.fragmentStorageBonus || 0));
  const pirateBonus = Math.max(0, Number(getPirateFragmentStorageBonus(userId) || 0));
  const bonus = passiveBonus + pirateBonus;
  const max = Math.min(MAX_FRAGMENT_STORAGE, BASE_FRAGMENT_STORAGE + bonus);

  return {
    total,
    max,
    bonus,
    passiveBonus,
    pirateBonus,
  };
}

function sortFragments(fragments) {
  const rarityOrder = {
    M: 7,
    UR: 6,
    SS: 5,
    S: 4,
    A: 3,
    B: 2,
    C: 1,
  };

  return [...(Array.isArray(fragments) ? fragments : [])].sort((a, b) => {
    const amountDiff = getFragmentAmount(b) - getFragmentAmount(a);
    if (amountDiff !== 0) return amountDiff;

    const rarityDiff =
      (rarityOrder[getDisplayRarity(b)] || 0) -
      (rarityOrder[getDisplayRarity(a)] || 0);

    if (rarityDiff !== 0) return rarityDiff;

    return getDisplayName(a).localeCompare(getDisplayName(b));
  });
}

function isExactRarityQuery(query) {
  return VALID_RARITIES.has(String(query || "").trim().toUpperCase());
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function getFragmentSearchNames(fragment) {
  const category = String(fragment?.category || "").toLowerCase();
  const rawName = String(fragment?.name || fragment?.displayName || "").trim();
  const rawCode = String(fragment?.code || "").trim();

  const cleanName = rawName.replace(/\s+fragment$/i, "").trim();

  const baseNames = [rawName, cleanName, rawCode];

  if (category !== "weapon") {
    return baseNames.map(normalizeSearch).filter(Boolean);
  }

  const cleanCode = rawCode
    .replace(/^weapon_fragment_/i, "")
    .replace(/_fragment$/i, "")
    .trim();

  return [
    rawName,
    cleanName,
    rawCode,
    cleanCode,
    fragment?.weaponCode,
    fragment?.sourceCode,
  ]
    .map(normalizeSearch)
    .filter(Boolean);
}

function fragmentMatchesQuery(fragment, query) {
  const q = normalizeSearch(query);
  if (!q) return true;

  const names = getFragmentSearchNames(fragment);

  return names.some((name) => {
    if (name === q) return true;
    if (name.startsWith(q)) return true;

    const qWords = q.split(" ").filter(Boolean);
    if (qWords.length && qWords.every((word) => name.split(" ").includes(word))) {
      return true;
    }

    return false;
  });
}

function filterFragments(fragments, query) {
  const list = Array.isArray(fragments) ? fragments : [];

  if (!query) return list;

  const rawQuery = String(query || "").trim();
  const upperQuery = rawQuery.toUpperCase();

  if (isExactRarityQuery(rawQuery)) {
    return list.filter((fragment) => getDisplayRarity(fragment) === upperQuery);
  }

  return list.filter((fragment) => fragmentMatchesQuery(fragment, rawQuery));
}

function getFragmentIcon(fragment) {
  const category = String(fragment?.category || "").toLowerCase();

  if (category === "weapon") return "⚔️";
  if (category === "boost") return "✨";
  if (category === "battle") return "🎴";

  return "🧩";
}

function getMemberAvatar(message) {
  return (
    message.member?.displayAvatarURL?.({
      extension: "png",
      size: 512,
    }) ||
    message.author.displayAvatarURL({
      extension: "png",
      size: 512,
    })
  );
}

function buildPageEmbed(message, player, fragments, currentPage, isPrivate, searchQuery) {
  const sorted = sortFragments(fragments);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 0), totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);
  const allFragments = Array.isArray(player.fragments) ? player.fragments : [];
  const storage = getStorageInfo(player, allFragments, message.author.id);
  const memberAvatar = getMemberAvatar(message);

  const lines = pageItems.length
    ? pageItems.map((fragment) => {
        const icon = getFragmentIcon(fragment);
        const name = getDisplayName(fragment);
        const amount = getFragmentAmount(fragment).toLocaleString("en-US");
        const rarity = getDisplayRarity(fragment);
        const category = String(fragment?.category || "fragment").toLowerCase();

        return `${icon} **${name}** x${amount} • ${rarity} • ${category}`;
      })
    : ["No fragments found."];

  const description = [
    "Fragments are used to summon and upgrade battle cards, boost cards, and weapons.",
    "",
    searchQuery ? `**Search:** \`${searchQuery}\`` : null,
    searchQuery ? "" : null,
    ...lines,
    "",
    `**Fragment Storage:** ${storage.total}/${storage.max}`,
    storage.bonus > 0 ? `**Storage Bonus:** +${storage.bonus}` : null,
    `**Visibility Mode:** ${isPrivate ? "Private" : "Public"}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(
      `${message.member?.displayName || message.author.username}'s Fragment Storage`
    )
    .setDescription(description)
    .setThumbnail(memberAvatar)
    .setFooter({
      text: `Page ${safePage + 1}/${totalPages} • ${sorted.length} fragment entries`,
      iconURL: memberAvatar,
    });

  return {
    embed,
    totalPages,
    safePage,
  };
}

function buildButtons(currentPage, totalPages, isPrivate) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("finv_prev")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage <= 0),
    new ButtonBuilder()
      .setCustomId("finv_next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId("finv_toggle_mode")
      .setLabel(isPrivate ? "Private" : "Public")
      .setStyle(isPrivate ? ButtonStyle.Danger : ButtonStyle.Success)
  );
}

module.exports = {
  name: "finv",
  aliases: ["fragmentinv", "fragments"],

  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const allFragments = Array.isArray(player.fragments) ? player.fragments : [];
    const searchQuery = args.length ? args.join(" ").trim() : "";
    const filteredFragments = filterFragments(allFragments, searchQuery);

    let currentPage = 0;
    let isPrivate = true;

    const initial = buildPageEmbed(
      message,
      player,
      filteredFragments,
      currentPage,
      isPrivate,
      searchQuery
    );

    const sentMessage = await message.reply({
      embeds: [initial.embed],
      components: [buildButtons(initial.safePage, initial.totalPages, isPrivate)],
      allowedMentions: {
        repliedUser: false,
      },
    });

    const collector = sentMessage.createMessageComponentCollector({
      time: 120000,
    });

    collector.on("collect", async (interaction) => {
      const isOwner = interaction.user.id === message.author.id;

      if (isPrivate && !isOwner) {
        return interaction.reply({
          content: "This fragment menu is private right now.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === "finv_prev") {
        currentPage = Math.max(0, currentPage - 1);
      }

      if (interaction.customId === "finv_next") {
        currentPage += 1;
      }

      if (interaction.customId === "finv_toggle_mode") {
        if (!isOwner) {
          return interaction.reply({
            content: "Only the owner can change the visibility mode.",
            flags: MessageFlags.Ephemeral,
          });
        }

        isPrivate = !isPrivate;
      }

      const refreshedPlayer = getPlayer(message.author.id, message.author.username);
      const refreshedFragments = filterFragments(
        Array.isArray(refreshedPlayer.fragments) ? refreshedPlayer.fragments : [],
        searchQuery
      );

      const pageData = buildPageEmbed(
        message,
        refreshedPlayer,
        refreshedFragments,
        currentPage,
        isPrivate,
        searchQuery
      );

      currentPage = pageData.safePage;

      return interaction.update({
        embeds: [pageData.embed],
        components: [buildButtons(currentPage, pageData.totalPages, isPrivate)],
      });
    });

    collector.on("end", async () => {
      try {
        const refreshedPlayer = getPlayer(message.author.id, message.author.username);
        const refreshedFragments = filterFragments(
          Array.isArray(refreshedPlayer.fragments) ? refreshedPlayer.fragments : [],
          searchQuery
        );

        const pageData = buildPageEmbed(
          message,
          refreshedPlayer,
          refreshedFragments,
          currentPage,
          isPrivate,
          searchQuery
        );

        await sentMessage.edit({
          embeds: [pageData.embed],
          components: [],
        });
      } catch (_) {}
    });
  },
};