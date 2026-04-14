const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getBoostCards } = require("../utils/passiveBoosts");

const PAGE_SIZE = 6;

function buildBoostEmbed(username, cards, page) {
  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const start = safePage * PAGE_SIZE;
  const pageCards = cards.slice(start, start + PAGE_SIZE);

  const description = pageCards.length
    ? pageCards.map((card, index) => {
        return [
          `**${start + index + 1}. ${card.displayName || card.name}** [${card.rarity || "C"}]`,
          `Type: \`${card.boostType || "Unknown"}\``,
          `Value: \`${card.boostValue || 0}\``,
          `Target: \`${card.boostTarget || "account"}\``,
          `${card.boostDescription || "No description"}`
        ].join("\n");
      }).join("\n\n")
    : "You do not own any boost cards yet.";

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`${username}'s Boost Cards`)
    .setDescription(description)
    .setFooter({ text: `Page ${safePage + 1}/${totalPages} • Total Boost Cards: ${cards.length}` });

  return { embed, totalPages, safePage };
}

function buildButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("boost_prev")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId("boost_next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages - 1)
  );
}

module.exports = {
  name: "boost",
  aliases: ["boosts"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const boostCards = getBoostCards(player);

    let currentPage = 0;
    const initial = buildBoostEmbed(player.username, boostCards, currentPage);

    const sentMessage = await message.reply({
      embeds: [initial.embed],
      components: boostCards.length ? [buildButtons(initial.safePage, initial.totalPages)] : []
    });

    if (!boostCards.length) return;

    const collector = sentMessage.createMessageComponentCollector({
      time: 120000
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "This boost menu belongs to someone else.",
          ephemeral: true
        });
      }

      if (interaction.customId === "boost_prev") {
        currentPage = Math.max(0, currentPage - 1);
      }

      if (interaction.customId === "boost_next") {
        currentPage += 1;
      }

      const pageData = buildBoostEmbed(player.username, boostCards, currentPage);
      currentPage = pageData.safePage;

      await interaction.update({
        embeds: [pageData.embed],
        components: [buildButtons(currentPage, pageData.totalPages)]
      });
    });
  }
};