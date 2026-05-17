const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPlayer } = require("../playerStore");
const { getFragmentStorageBonus } = require("../utils/passiveBoosts");

const PAGE_SIZE = 8;
const COLOR = 0x8e44ad;
const BASE_FRAGMENT_STORAGE = 200;
const MAX_FRAGMENT_STORAGE = 500;
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

function getStorageInfo(player, fragments) {
  const total = (Array.isArray(fragments) ? fragments : []).reduce(
    (sum, item) => sum + getFragmentAmount(item),
    0
  );

  const bonus = Number(getFragmentStorageBonus(player) || 0);
  const max = Math.min(BASE_FRAGMENT_STORAGE + bonus, MAX_FRAGMENT_STORAGE);

  return {
    total,
    max,
    bonus,
  };
}

function sortFragments(fragments) {
  const rarityOrder = {
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
      (rarityOrder[formatRarity(b?.rarity)] || 0) -
      (rarityOrder[formatRarity(a?.rarity)] || 0);

    if (rarityDiff !== 0) return rarityDiff;

    return getDisplayName(a).localeCompare(getDisplayName(b));
  });
}

function isExactRarityQuery(query) {
  return VALID_RARITIES.has(String(query || "").trim().toUpperCase());
}

function filterFragments(fragments, query) {
  const list = Array.isArray(fragments) ? fragments : [];

  if (!query) return list;

  const rawQuery = String(query || "").trim();
  const upperQuery = rawQuery.toUpperCase();
  const normalizedQuery = normalize(rawQuery);

  if (isExactRarityQuery(rawQuery)) {
    return list.filter((fragment) => formatRarity(fragment?.rarity) === upperQuery);
  }

  return list.filter((fragment) => {
    const fields = [
      fragment?.code,
      fragment?.name,
      fragment?.displayName,
      fragment?.title,
      fragment?.category,
      fragment?.rarity,
      fragment?.weaponCode,
      fragment?.cardCode,
      fragment?.sourceCode,
    ]
      .map(normalize)
      .filter(Boolean);

    return fields.some(
      (field) =>
        field === normalizedQuery ||
        field.includes(normalizedQuery) ||
        normalizedQuery.includes(field)
    );
  });
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
  const storage = getStorageInfo(player, allFragments);
  const memberAvatar = getMemberAvatar(message);

  const lines = pageItems.length
    ? pageItems.map((fragment) => {
        const icon = getFragmentIcon(fragment);
        const name = getDisplayName(fragment);
        const amount = getFragmentAmount(fragment).toLocaleString("en-US");
        const rarity = formatRarity(fragment?.rarity);
        const category = String(fragment?.category || "fragment");

        return `${icon} **${name}** x${amount} • ${rarity} • ${category}`;
      })
    : ["No fragments found."];

  const description = [
    "Fragments are used to summon and upgrade battle cards, boost cards, and weapons.",
    searchQuery ? `**Search:** \`${searchQuery}\`` : null,
    "",
    ...lines,
    "",
    `**Fragment Storage:** ${storage.total}/${storage.max}`,
    storage.bonus > 0 ? `**Storage Bonus:** +${storage.bonus}` : null,
    `**Visibility Mode:** ${isPrivate ? "Private" : "Public"}`,
  ]
    .filter(Boolean)
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
          ephemeral: true,
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
            ephemeral: true,
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