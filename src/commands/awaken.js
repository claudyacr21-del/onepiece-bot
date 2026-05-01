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
  findCardTemplate,
  hydrateCard,
  getBoostStageValue,
} = require("../utils/evolution");
const { getCardImage } = require("../config/assetLinks");

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getStageCard(card, stage) {
  const template = findCardTemplate(card?.code || card?.displayName || card?.name) || card;

  return hydrateCard({
    ...template,
    ...card,
    evolutionStage: stage,
    evolutionKey: `M${stage}`,
  });
}

function getStageImage(card, stage) {
  const stageKey = `M${stage}`;
  const template = findCardTemplate(card?.code || card?.displayName || card?.name) || card;
  const stageCard = getStageCard(template, stage);

  return (
    stageCard?.evolutionForms?.[stage - 1]?.image ||
    template?.evolutionForms?.[stage - 1]?.image ||
    stageCard?.stageImages?.[stageKey] ||
    template?.stageImages?.[stageKey] ||
    getCardImage(
      template?.code || card?.code,
      stageKey,
      stageCard?.stageImages?.[stageKey] ||
        template?.stageImages?.[stageKey] ||
        stageCard?.image ||
        template?.image ||
        card?.image ||
        ""
    ) ||
    stageCard?.image ||
    template?.image ||
    card?.image ||
    ""
  );
}

function getFormName(card, stage) {
  const template = findCardTemplate(card?.code || card?.displayName || card?.name) || card;
  const stageCard = getStageCard(template, stage);

  return (
    stageCard?.evolutionForms?.[stage - 1]?.name ||
    template?.evolutionForms?.[stage - 1]?.name ||
    stageCard?.variant ||
    template?.variant ||
    card?.variant ||
    card?.displayName ||
    card?.name ||
    "Unknown"
  );
}

function getBoostEffectText(card, stage = 1) {
  if (!card || card.cardRole !== "boost") return "";

  const template = findCardTemplate(card?.code || card?.displayName || card?.name) || card;
  const stageCard = getStageCard(template, stage);
  const form = stageCard?.evolutionForms?.[stage - 1] || template?.evolutionForms?.[stage - 1];

  const existingText =
    form?.effectText ||
    stageCard?.effectText ||
    template?.effectText ||
    card?.effectText ||
    form?.boostDescription ||
    stageCard?.boostDescription ||
    template?.boostDescription ||
    card?.boostDescription ||
    "";

  if (existingText) return existingText;

  const boostType = String(
    stageCard?.boostType || template?.boostType || card?.boostType || ""
  ).toLowerCase();

  const target =
    stageCard?.boostTarget ||
    template?.boostTarget ||
    card?.boostTarget ||
    "team";

  const value = getBoostStageValue(stageCard || card, stage);

  if (boostType === "fragmentstorage" || boostType === "fragment_storage") {
    return `Increase ${target} fragment storage by ${value}.`;
  }

  if (boostType === "pullchance" || boostType === "pull_chance") {
    return `Increase ${target} pull chance by ${value}%.`;
  }

  if (boostType === "daily") {
    return `Increase ${target} daily reward quality by ${value}.`;
  }

  const suffix = ["atk", "hp", "spd", "speed", "exp", "dmg"].includes(boostType)
    ? "%"
    : "";

  if (!boostType) return "No boost effect description.";

  return `Increase ${target} ${boostType.toUpperCase()} by ${value}${suffix}.`;
}

function buildConfirmEmbed(owned, currentStage, nextStage) {
  const nextImage = getStageImage(owned, nextStage);

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`✨ Awaken ${owned.displayName || owned.name}`)
    .setDescription(
      [
        `Current: **M${currentStage}**`,
        `Next: **M${nextStage}** • ${getFormName(owned, nextStage)}`,
        "",
        "All requirements are ready.",
        "Press **Yes** to awaken or **Cancel** to stop.",
      ].join("\n")
    );

  if (nextImage) embed.setImage(nextImage);

  return embed;
}

function buildSuccessEmbed(result) {
  const card = result.target;
  const targetStage = Number(card.evolutionStage || 1);
  const targetImage = getStageImage(card, targetStage);
  const stageCard = getStageCard(card, targetStage);

  const baseLines = [
    `**${card.displayName || card.name}** reached **M${targetStage}**`,
    `**Form:** ${getFormName(card, targetStage)}`,
    `**Tier:** ${stageCard.currentTier || card.currentTier || card.rarity}`,
    `**Power:** ${Number(stageCard.currentPower || card.currentPower || 0).toLocaleString("en-US")}`,
    "",
  ];

  const description =
    card.cardRole === "boost"
      ? [
          ...baseLines,
          "**Boost Effect**",
          getBoostEffectText(card, targetStage),
        ].join("\n")
      : [
          ...baseLines,
          `ATK: ${Number(stageCard.atk || card.atk || 0).toLocaleString("en-US")}`,
          `HP: ${Number(stageCard.hp || card.hp || 0).toLocaleString("en-US")}`,
          `SPD: ${Number(stageCard.speed || card.speed || 0).toLocaleString("en-US")}`,
        ].join("\n");

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("✨ Awaken Success")
    .setDescription(description);

  if (targetImage) embed.setImage(targetImage);

  return embed;
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

    const currentStage = Number(owned.evolutionStage || 1);
    const nextStage = currentStage + 1;

    try {
      const validationPlayer = cloneDeep(player);
      awakenOwnedCard(validationPlayer, query);
    } catch (_) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Awaken Failed")
            .setDescription(
              [
                `**${owned.displayName || owned.name}** cannot awaken to **M${nextStage}** yet.`,
                "",
                `Use \`op ci ${owned.displayName || owned.name}\` to check the full requirements.`,
              ].join("\n")
            ),
        ],
      });
    }

    const sent = await message.reply({
      embeds: [buildConfirmEmbed(owned, currentStage, nextStage)],
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
          embeds: [buildSuccessEmbed(result)],
          components: [],
        });

        collector.stop("done");
      } catch (_) {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Awaken Failed")
              .setDescription(
                [
                  `**${owned.displayName || owned.name}** cannot awaken right now.`,
                  "",
                  `Use \`op ci ${owned.displayName || owned.name}\` to check the full requirements.`,
                ].join("\n")
              ),
          ],
          components: [],
        });

        collector.stop("fail");
      }
    });
  },
};