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
const cardsData = require("../data/cards");

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[<@!>]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

function findTemplate(cardOrQuery) {
  const query =
    typeof cardOrQuery === "string"
      ? cardOrQuery
      : cardOrQuery?.code ||
        cardOrQuery?.displayName ||
        cardOrQuery?.name ||
        cardOrQuery?.variant ||
        "";

  const q = normalize(query);
  const qc = normalizeCode(query);

  return (
    cardsData.find((card) => normalizeCode(card.code) === qc) ||
    cardsData.find((card) => normalize(card.displayName || card.name) === q) ||
    cardsData.find((card) => normalize(card.name) === q) ||
    cardsData.find((card) => normalize(card.variant) === q) ||
    null
  );
}

function getStageImageOnly(card, stage = 1) {
  if (!card) return null;

  const finalStage = Number(stage || 1);
  const stageKey = `M${finalStage}`;

  return (
    card.evolutionForms?.[finalStage - 1]?.image ||
    card.stageImages?.[stageKey] ||
    card.images?.[stageKey] ||
    card.awakenImages?.[stageKey] ||
    card.forms?.[stageKey]?.image ||
    card[stageKey]?.image ||
    card[`image${stageKey}`] ||
    card[`imageM${finalStage}`] ||
    card[`m${finalStage}Image`] ||
    null
  );
}

function getTargetStageImage(card, stage = 1, previousCard = null) {
  const finalStage = Number(stage || 1);

  const template =
    findTemplate(card) ||
    findTemplate(previousCard) ||
    null;

  const templateStageImage = getStageImageOnly(template, finalStage);
  if (templateStageImage) return templateStageImage;

  const currentStageImage = getStageImageOnly(card, finalStage);
  if (currentStageImage) return currentStageImage;

  const previousStageImage = getStageImageOnly(previousCard, finalStage);
  if (previousStageImage) return previousStageImage;

  if (finalStage === 1) {
    return (
      card?.image ||
      card?.thumbnail ||
      template?.image ||
      template?.thumbnail ||
      previousCard?.image ||
      previousCard?.thumbnail ||
      null
    );
  }

  return null;
}

function getFormName(card, stage = null) {
  const finalStage = Number(stage || card?.evolutionStage || 1);
  const template = findTemplate(card);

  return (
    template?.evolutionForms?.[finalStage - 1]?.name ||
    card?.evolutionForms?.[finalStage - 1]?.name ||
    card?.variant ||
    card?.displayName ||
    card?.name ||
    "Unknown"
  );
}

function getBoostEffectText(card, stage = 1) {
  if (!card || card.cardRole !== "boost") return "";

  const template = findTemplate(card);
  const source = template || card;

  const existingText =
    source.effectText ||
    source.boostDescription ||
    source.description ||
    source.effect ||
    card.effectText ||
    card.boostDescription ||
    card.description ||
    card.effect ||
    "";

  if (existingText) return existingText;

  const boostType = String(card.boostType || source.boostType || "").toLowerCase();
  const target = card.boostTarget || source.boostTarget || "team";
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

  const suffix = ["atk", "hp", "spd", "speed", "exp", "dmg"].includes(boostType)
    ? "%"
    : "";

  if (!boostType) {
    return "No boost effect description.";
  }

  return `Increase ${target} ${boostType.toUpperCase()} by ${value}${suffix}.`;
}

function buildConfirmEmbed(owned, currentStage, nextStage) {
  const nextImage = getTargetStageImage(owned, nextStage, owned);

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

function buildSuccessEmbed(result, previousOwned) {
  const card = result.target;
  const targetStage = Number(card.evolutionStage || 1);
  const targetImage = getTargetStageImage(card, targetStage, previousOwned);

  const baseLines = [
    `**${card.displayName || card.name}** reached **M${targetStage}**`,
    `**Form:** ${getFormName(card, targetStage)}`,
    `**Tier:** ${card.currentTier || card.rarity}`,
    `**Power:** ${Number(card.currentPower || 0).toLocaleString("en-US")}`,
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
          `ATK: ${Number(card.atk || 0).toLocaleString("en-US")}`,
          `HP: ${Number(card.hp || 0).toLocaleString("en-US")}`,
          `SPD: ${Number(card.speed || 0).toLocaleString("en-US")}`,
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
        const freshOwned = findOwnedCard(fresh.cards || [], query);
        const result = awakenOwnedCard(fresh, query);

        updatePlayer(message.author.id, {
          cards: result.updatedCards,
          fragments: result.updatedFragments,
          berries: result.berries,
        });

        await interaction.update({
          embeds: [buildSuccessEmbed(result, freshOwned)],
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