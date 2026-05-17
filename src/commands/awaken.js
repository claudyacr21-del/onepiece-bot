const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPlayer, updatePlayer } = require("../playerStore");
const {
  awakenOwnedCard,
  findCardTemplate,
  hydrateCard,
  getBoostStageValue,
} = require("../utils/evolution");
const { getCardImage } = require("../config/assetLinks");

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function findOwnedCardByCodeOnly(cardsOwned, query) {
  const q = normalizeCode(query);
  const list = Array.isArray(cardsOwned) ? cardsOwned : [];

  const exact = list.find((card) => normalizeCode(card.code) === q);
  if (exact) return hydrateCard(exact);

  const startsWith = list.find((card) => normalizeCode(card.code).startsWith(q));
  if (startsWith) return hydrateCard(startsWith);

  return null;
}

function findCardTemplateSafe(card) {
  const code = String(card?.code || "").trim();

  if (code) {
    const byCode = findCardTemplate(code);
    if (byCode) return byCode;
  }

  const keys = [
    card?.displayName,
    card?.name,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const key of keys) {
    const found = findCardTemplate(key);
    if (found) return found;
  }

  return card;
}

function getStageKey(stage) {
  return `M${Number(stage || 1)}`;
}

function getStageForm(template, stage) {
  const index = Number(stage || 1) - 1;
  return template?.evolutionForms?.[index] || null;
}

function getStageCard(card, stage) {
  const template = findCardTemplateSafe(card);
  const stageKey = getStageKey(stage);

  return hydrateCard({
    ...card,

    // canonical template must win over old/corrupted owned data
    ...template,

    code: template?.code || card?.code,
    displayName:
      template?.displayName ||
      card?.displayName ||
      template?.name ||
      card?.name,
    name: template?.name || card?.name,

    evolutionStage: stage,
    evolutionKey: stageKey,

    // force canonical image containers from template, not owned card
    image: template?.image || card?.image || "",
    stageImages: template?.stageImages || {},
    evolutionForms: template?.evolutionForms || [],
  });
}

function getStageImage(card, stage) {
  const stageKey = getStageKey(stage);
  const template = findCardTemplateSafe(card);
  const form = getStageForm(template, stage);

  // 1. canonical form/stage image from card template
  const templateStageImage =
    form?.image ||
    template?.stageImages?.[stageKey] ||
    template?.images?.[stageKey] ||
    template?.forms?.[stageKey]?.image;

  if (templateStageImage) return templateStageImage;

  // 2. exact asset link by owned card code first
  const cardCode = String(card?.code || template?.code || "").trim();
  const assetImage = cardCode ? getCardImage(cardCode, stageKey, "") : "";

  if (assetImage) return assetImage;

  // 3. fallback only to canonical template image
  return template?.image || "";
}

function getFormName(card, stage) {
  const template = findCardTemplateSafe(card);
  const stageCard = getStageCard(card, stage);
  const form = getStageForm(template, stage);

  return (
    form?.name ||
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
      return message.reply("Usage: `op awaken <card code>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const owned = findOwnedCardByCodeOnly(player.cards || [], query);

    if (!owned) {
      return message.reply("You do not own that card code.");
    }

    if (Number(owned.evolutionStage || 1) >= 3) {
      return message.reply("This card is already at M3.");
    }

    const currentStage = Number(owned.evolutionStage || 1);
    const nextStage = currentStage + 1;

    try {
      const validationPlayer = cloneDeep(player);
      awakenOwnedCard(validationPlayer, owned.code);
    } catch (error) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Awaken Failed")
            .setDescription(
              [
                `**${owned.displayName || owned.name || owned.code}** cannot awaken to **M${nextStage}** yet.`,
                "",
                "**Missing / Error Detail**",
                String(error?.message || "Unknown awaken requirement error."),
                "",
                `Use \`op ci ${owned.name}\` to check the full requirements.`,
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
        const result = awakenOwnedCard(fresh, owned.code);

        updatePlayer(message.author.id, {
          cards: result.updatedCards,
          fragments: result.updatedFragments,
          berries: result.berries,
          gems: result.gems,
        });

        await interaction.update({
          embeds: [buildSuccessEmbed(result)],
          components: [],
        });

        collector.stop("done");
      } catch (error) {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Awaken Failed")
              .setDescription(
                [
                  `**${owned.displayName || owned.name || owned.code}** cannot awaken right now.`,
                  "",
                  "**Missing / Error Detail**",
                  String(error?.message || "Unknown awaken requirement error."),
                  "",
                  `Use \`op ci ${owned.code}\` to check the full requirements.`,
                ].join("\n")
              )
          ],
          components: [],
        });

        collector.stop("fail");
      }
    });
  },
};