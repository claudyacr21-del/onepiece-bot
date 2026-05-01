const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPlayer, updatePlayer } = require("../playerStore");
const {
  findOwnedCard,
  awakenOwnedCard,
  getBoostStageValue,
} = require("../utils/evolution");

function formatReqEntry(entry) {
  if (!entry) return "Unknown";

  if (typeof entry === "string") {
    return entry
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  return `${entry.name || entry.code} M${Number(entry.stage || 1)}`;
}

function getBoostEffectText(card, stage = 1) {
  if (!card || card.cardRole !== "boost") return "";

  const boostType = String(card.boostType || "").toLowerCase();
  const target = card.boostTarget || "team";
  const value = getBoostStageValue(card, stage);

  if (boostType === "fragmentstorage" || boostType === "fragment_storage") {
    return `Increase ${target} fragment storage by ${value}.`;
  }

  if (boostType === "pullchance" || boostType === "pull_chance") {
    return `Increase ${target} pull chance by ${value}%.`;
  }

  if (boostType === "daily") {
    return `Increase ${target} daily reward quality by ${value}.`;
  }

  const suffix = ["atk", "hp", "spd", "exp", "dmg"].includes(boostType)
    ? "%"
    : "";

  if (!boostType) {
    return card.boostDescription || card.effectText || "No boost effect description.";
  }

  return `Increase ${target} ${boostType.toUpperCase()} by ${value}${suffix}.`;
}

function reqText(card, req) {
  return [
    `Berries: ${Number(req.berries || 0).toLocaleString("en-US")}`,
    `Self Fragments: ${Number(req.selfFragments || 0)}x ${
      card.displayName || card.name
    }`,
    card.cardRole === "battle"
      ? `Min Level: ${Number(req.minLevel || 0)}`
      : "Min Level: Not required",
    req.cards?.length
      ? `Battle Cards: ${req.cards.map(formatReqEntry).join(", ")}`
      : null,
    req.boosts?.length
      ? `Boost Cards: ${req.boosts.map(formatReqEntry).join(", ")}`
      : null,
    req.text || null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSuccessDescription(result) {
  const card = result.target;
  const stage = Number(card.evolutionStage || 1);
  const formName =
    card.evolutionForms?.[stage - 1]?.name ||
    card.variant ||
    card.displayName ||
    card.name ||
    "Unknown";

  const baseLines = [
    `**${card.displayName || card.name}** reached **M${stage}**`,
    `**Form:** ${formName}`,
    `**Tier:** ${card.currentTier || card.rarity}`,
    `**Power:** ${Number(card.currentPower || 0).toLocaleString("en-US")}`,
    "",
  ];

  if (card.cardRole === "boost") {
    const effectText = card.effectText || getBoostEffectText(card, stage);

    return [
      ...baseLines,
      "**Boost Effect**",
      effectText || "No boost effect description.",
    ].join("\n");
  }

  return [
    ...baseLines,
    `ATK: ${Number(card.atk || 0).toLocaleString("en-US")}`,
    `HP: ${Number(card.hp || 0).toLocaleString("en-US")}`,
    `SPD: ${Number(card.speed || 0).toLocaleString("en-US")}`,
  ].join("\n");
}

module.exports = {
  name: "awaken",
  aliases: ["evolve"],

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply("Usage: `op awaken <card name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const owned = findOwnedCard(player.cards || [], query);

    if (!owned) {
      return message.reply("You do not own that card.");
    }

    if (Number(owned.evolutionStage || 1) >= 3) {
      return message.reply("This card is already at M3.");
    }

    const nextStage = Number(owned.evolutionStage || 1) + 1;
    const req = owned.awakenRequirements?.[`M${nextStage}`];

    if (!req) {
      return message.reply("No awaken requirement found.");
    }

    const sent = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle(`✨ Awaken ${owned.displayName || owned.name}`)
          .setDescription(
            [
              `Current: **M${owned.evolutionStage}**`,
              `Next: **M${nextStage}** • ${
                owned.evolutionForms?.[nextStage - 1]?.name || "Unknown"
              }`,
              "",
              reqText(owned, req),
              "",
              "Press **Yes** to proceed or **Cancel** to stop.",
            ].join("\n")
          ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("awaken_yes")
            .setLabel("Yes")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("awaken_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
        ),
      ],
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only you can control this awaken action.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "awaken_cancel") {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle("Awaken Cancelled")
              .setDescription("No changes were made."),
          ],
          components: [],
        });

        collector.stop("cancel");
        return;
      }

      try {
        const fresh = getPlayer(message.author.id, message.author.username);
        const result = awakenOwnedCard(fresh, query);

        updatePlayer(message.author.id, {
          cards: result.updatedCards,
          fragments: result.updatedFragments,
          berries: result.berries,
        });

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle("✨ Awaken Success")
              .setDescription(buildSuccessDescription(result)),
          ],
          components: [],
        });

        collector.stop("done");
      } catch (err) {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Awaken Failed")
              .setDescription(err.message),
          ],
          components: [],
        });

        collector.stop("fail");
      }
    });
  },
};