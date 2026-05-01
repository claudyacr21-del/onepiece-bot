const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPlayer } = require("../playerStore");
const { getFragmentStorageInfo } = require("../utils/autoSac");

const PAGE_SIZE = 8;
const COLOR = 0x8e44ad;

function formatRarity(rarity) {
  return String(rarity || "C").toUpperCase();
}

function getStorageInfo(player, fragments) {
  return getFragmentStorageInfo(player, fragments);
}

function sortFragments(fragments) {
  const rarityOrder = { UR: 6, SS: 5, S: 4, A: 3, B: 2, C: 1 };

  return [...fragments].sort((a, b) => {
    const amountDiff = Number(b.amount || 0) - Number(a.amount || 0);
    if (amountDiff !== 0) return amountDiff;

    const rarityDiff =
      (rarityOrder[String(b.rarity || "").toUpperCase()] || 0) -
      (rarityOrder[String(a.rarity || "").toUpperCase()] || 0);
    if (rarityDiff !== 0) return rarityDiff;

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function filterFragments(fragments, query) {
  if (!query) return fragments;

  const lowerQuery = String(query).toLowerCase();

  return fragments.filter((fragment) => {
    const name = String(fragment.name || "").toLowerCase();
    const code = String(fragment.code || "").toLowerCase();
    const category = String(fragment.category || "").toLowerCase();
    const rarity = String(fragment.rarity || "").toLowerCase();

    return (
      name.includes(lowerQuery) ||
      code.includes(lowerQuery) ||
      category.includes(lowerQuery) ||
      rarity.includes(lowerQuery)
    );
  });
}

function getFragmentIcon(fragment) {
  const category = String(fragment.category || "").toLowerCase();
  const rarity = formatRarity(fragment.rarity);

  if (category === "boost") return "💠";

  const rarityIcon = {
    UR: "🌈",
    SS: "🔱",
    S: "🔥",
    A: "💎",
    B: "🔷",
    C: "🧩",
  };

  return rarityIcon[rarity] || "🧩";
}

function getMemberAvatar(message) {
  return (
    message.member?.displayAvatarURL({
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
  const storage = getStorageInfo(player, Array.isArray(player.fragments) ? player.fragments : []);
  const memberAvatar = getMemberAvatar(message);

  const lines = pageItems.length
    ? pageItems.map((fragment, index) => {
        const icon = getFragmentIcon(fragment);
        const amount = Number(fragment.amount || 0).toLocaleString("en-US");
        const rarity = formatRarity(fragment.rarity);

        return `${start + index + 1}. ${icon} **${fragment.name}** — \`${amount}x\` (${rarity})`;
      })
    : ["No fragments found."];

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`${message.member?.displayName || message.author.username}'s Fragment Storage`)
    .setDescription(
      [
        "Fragments are used to upgrade cards and boost cards.",
        searchQuery ? `\n**Search:** \`${searchQuery}\`` : "",
        "",
        lines.join("\n"),
        "",
        `**Fragment Storage:** ${storage.total}/${storage.max}`,
        `**Visibility Mode:** ${isPrivate ? "Private" : "Public"}`,
      ].join("\n")
    )
    .setThumbnail(memberAvatar)
    .setFooter({
      text: `Page ${safePage + 1}/${totalPages} • ${sorted.length} fragment entries`,
      iconURL: memberAvatar,
    });

  return { embed, totalPages, safePage };
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
    const searchQuery = args.length ? args.join(" ") : "";
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

      await interaction.update({
        embeds: [pageData.embed],
        components: [buildButtons(currentPage, pageData.totalPages, isPrivate)],
      });
    });
  },
};