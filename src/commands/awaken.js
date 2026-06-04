const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const {
  awakenOwnedCard,
  findCardTemplate,
  hydrateCard,
  getBoostStageValue,
} = require("../utils/evolution");
const { getCardImage } = require("../config/assetLinks");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");

function isIgnorableInteractionError(error) {
  const code = Number(error?.code || error?.rawError?.code || 0);
  const message = String(error?.message || "");

  return (
    code === 10062 ||
    code === 40060 ||
    message.includes("Unknown interaction") ||
    message.includes("Interaction has already been acknowledged")
  );
}

async function safeInteractionReply(interaction, payload = {}) {
  try {
    if (!interaction) return null;

    const cleanPayload = {
      ...payload,
      flags: payload.flags || MessageFlags.Ephemeral,
    };

    delete cleanPayload.ephemeral;

    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(cleanPayload).catch(() => null);
    }

    return await interaction.reply(cleanPayload);
  } catch (error) {
    if (!isIgnorableInteractionError(error)) {
      console.error("[AWAKEN INTERACTION REPLY ERROR]", error);
    }

    return null;
  }
}

async function safeInteractionUpdate(interaction, payload = {}) {
  try {
    if (!interaction) return null;

    if (!interaction.replied && !interaction.deferred) {
      return await interaction.update(payload);
    }

    if (interaction.message) {
      return await interaction.message.edit(payload);
    }

    return await interaction.editReply(payload);
  } catch (error) {
    if (!isIgnorableInteractionError(error)) {
      console.error("[AWAKEN INTERACTION UPDATE ERROR]", error);
    }

    try {
      if (interaction?.message) {
        return await interaction.message.edit(payload);
      }
    } catch (editError) {
      if (!isIgnorableInteractionError(editError)) {
        console.error("[AWAKEN MESSAGE EDIT FALLBACK ERROR]", editError);
      }
    }

    return null;
  }
}

async function safeStopCollector(collector, reason) {
  try {
    if (collector && !collector.ended) {
      collector.stop(reason);
    }
  } catch (_) {}
}

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s,&]+/g, "")
    .replace(/\s+/g, " ");
}

function scoreOwnedCardQuery(card, query) {
  const q = normalizeCode(query);
  if (!q) return 0;

  const fields = [
    card?.instanceId,
    card?.id,
    card?.code,
    card?.name,
    card?.displayName,
    card?.title,
    String(card?.code || "").replace(/_/g, " "),
  ]
    .map(normalizeCode)
    .filter(Boolean);

  let best = 0;

  for (const field of fields) {
    if (field === q) {
      best = Math.max(best, 1000 + field.length);
    } else if (field.startsWith(q)) {
      best = Math.max(best, 800 + q.length);
    } else if (field.includes(q)) {
      best = Math.max(best, 500 + q.length);
    } else {
      const qWords = q.split(" ").filter(Boolean);
      const fieldWords = field.split(" ").filter(Boolean);

      if (qWords.length && qWords.every((word) => fieldWords.includes(word))) {
        best = Math.max(best, 350 + qWords.join("").length);
      }
    }
  }

  return best;
}

function findOwnedCardByNameOrCode(cardsOwned, query) {
  const list = Array.isArray(cardsOwned) ? cardsOwned : [];

  const scored = list
    .map((card) => ({
      card,
      score: scoreOwnedCardQuery(card, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? hydrateCard(scored[0].card) : null;
}

function findCardTemplateSafe(card) {
  const code = String(card?.code || "").trim();

  if (code) {
    const byCode = findCardTemplate(code);
    if (byCode) return byCode;
  }

  const keys = [card?.displayName, card?.name]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const key of keys) {
    const found = findCardTemplate(key);
    if (found) return found;
  }

  return card;
}

function stripTemplateOnlyFields(card) {
  const clean = cloneDeep(card || {});

  delete clean.awakenRequirements;
  delete clean.evolutionRequirements;
  delete clean.requirements;
  delete clean.requiredCards;
  delete clean.requiredBoosts;
  delete clean.cardsText;
  delete clean.boostsText;

  return clean;
}

function findOwnedCardIndexByNameOrCode(cardsOwned, query) {
  const list = Array.isArray(cardsOwned) ? cardsOwned : [];

  const scored = list
    .map((card, index) => ({
      index,
      score: scoreOwnedCardQuery(card, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].index : -1;
}

function findLatestTemplateForAwaken(ownedCard, query) {
  const keys = [
    ownedCard?.code,
    String(ownedCard?.code || "").replace(/_/g, " "),
    ownedCard?.displayName,
    ownedCard?.name,
    ownedCard?.title,
    ownedCard?.variant,
    query,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const key of keys) {
    const found = findCardTemplate(key);
    if (found && String(found?.code || "").trim()) return found;
  }

  return null;
}

function mergeOwnedProgressIntoLatestTemplate(ownedCard, template) {
  const clean = stripTemplateOnlyFields(ownedCard);
  if (!template) return clean;

  return {
    ...cloneDeep(template),

    instanceId: clean.instanceId,
    ownerId: clean.ownerId,

    level: clean.level,
    currentLevel: clean.currentLevel,
    lvl: clean.lvl,
    xp: clean.xp,
    exp: clean.exp,
    kills: clean.kills,
    fragments: clean.fragments,
    raidPrestige: clean.raidPrestige,

    evolutionStage: clean.evolutionStage,
    evolutionKey: clean.evolutionKey,

    currentTier: clean.currentTier || template.currentTier || template.rarity,
    rarity: clean.rarity || template.rarity,

    equippedWeapons: clean.equippedWeapons || [],
    equippedWeapon: clean.equippedWeapon || null,
    equippedWeaponName: clean.equippedWeaponName || null,
    equippedWeaponCode: clean.equippedWeaponCode || null,
    equippedWeaponLevel: clean.equippedWeaponLevel || 0,

    equippedDevilFruit: clean.equippedDevilFruit || null,
    equippedDevilFruitName: clean.equippedDevilFruitName || null,

    cardRole: template.cardRole || clean.cardRole,
    role: template.role || clean.role,
    category: template.category || clean.category,
  };
}

function preparePlayerForLatestAwakenTemplate(player, query) {
  const prepared = cloneDeep(player || {});
  prepared.cards = Array.isArray(prepared.cards)
    ? prepared.cards.map(stripTemplateOnlyFields)
    : [];

  const targetIndex = findOwnedCardIndexByNameOrCode(prepared.cards, query);

  if (targetIndex === -1) return prepared;

  const ownedCard = prepared.cards[targetIndex];
  const latestTemplate = findLatestTemplateForAwaken(ownedCard, query);

  if (latestTemplate) {
    prepared.cards[targetIndex] = mergeOwnedProgressIntoLatestTemplate(
      ownedCard,
      latestTemplate
    );
  }

  return prepared;
}

function getAwakenTargetQuery(owned, originalQuery) {
  return (
    owned?.code ||
    owned?.displayName ||
    owned?.name ||
    owned?.title ||
    originalQuery
  );
}

function formatAwakenErrorDetail(error) {
  const raw = String(error?.message || "Unknown awaken requirement error.")
    .replace(/^Missing requirements:\s*/i, "")
    .replace(/^\*\*?Missing \/ Error Detail\*\*?\s*/i, "")
    .trim();

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const seen = new Set();
  const unique = [];

  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }

  return unique.length ? unique.join("\n") : "Unknown awaken requirement error.";
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
    image: template?.image || card?.image || "",
    stageImages: template?.stageImages || {},
    evolutionForms: template?.evolutionForms || [],
  });
}

function getStageImage(card, stage) {
  const stageKey = getStageKey(stage);
  const template = findCardTemplateSafe(card);
  const form = getStageForm(template, stage);

  const templateStageImage =
    form?.image ||
    template?.stageImages?.[stageKey] ||
    template?.images?.[stageKey] ||
    template?.forms?.[stageKey]?.image;

  if (templateStageImage) return templateStageImage;

  const cardCode = String(card?.code || template?.code || "").trim();
  const assetImage = cardCode ? getCardImage(cardCode, stageKey, "") : "";

  if (assetImage) return assetImage;

  return template?.image || card?.image || "";
}

function getFormName(card, stage) {
  const template = findCardTemplateSafe(card);
  const stageCard = getStageCard(card, stage);
  const form = getStageForm(template, stage);

  return (
    form?.name ||
    form?.formTitle ||
    form?.specialName ||
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
  const form =
    stageCard?.evolutionForms?.[stage - 1] ||
    template?.evolutionForms?.[stage - 1];

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

function applyBoostedDisplayStats(card, boosts = {}) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") {
    return card;
  }

  return {
    ...card,
    atk: Math.floor(Number(card.atk || 0) * (1 + Number(boosts.atk || 0) / 100)),
    hp: Math.floor(Number(card.hp || 0) * (1 + Number(boosts.hp || 0) / 100)),
    speed: Math.floor(
      Number(card.speed || 0) * (1 + Number(boosts.spd || 0) / 100)
    ),
  };
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function buildSuccessEmbed(result, player) {
  const rawCard = hydrateCard(result.target);
  const boosts = getPassiveBoostSummary(player);
  const card = applyBoostedDisplayStats(rawCard, boosts);
  const targetStage = Number(card.evolutionStage || 1);
  const targetImage = getStageImage(card, targetStage);

  const baseLines = [
    `**${card.displayName || card.name}** reached **M${targetStage}**`,
    `**Form:** ${getFormName(card, targetStage)}`,
    `**Tier:** ${card.currentTier || card.rarity}`,
    `**Power:** ${Number(card.currentPower || card.power || 0).toLocaleString("en-US")}`,
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
          `ATK: ${formatAtkRange(card.atk)}`,
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
    const owned = findOwnedCardByNameOrCode(player.cards || [], query);

    if (!owned) {
      return message.reply({
        content: "You do not own that card.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (Number(owned.evolutionStage || 1) >= 3) {
      return message.reply("This card is already at M3.");
    }

    const currentStage = Number(owned.evolutionStage || 1);

    const nextStage = currentStage + 1;

    const awakenTargetQuery = getAwakenTargetQuery(owned, query);

    try {

    const validationPlayer = preparePlayerForLatestAwakenTemplate(player, awakenTargetQuery);

    awakenOwnedCard(validationPlayer, awakenTargetQuery);

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
                formatAwakenErrorDetail(error),
                "",
                `Use \`op ci ${owned.code || owned.displayName || owned.name || query}\` then press **(i)** to check the same requirement panel.`,
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
        return safeInteractionReply(interaction, {
          content: "Only you can control this awaken action.",
        });
      }

      if (interaction.customId === "awaken_cancel") {
        await safeInteractionUpdate(interaction, {
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle("Awaken Cancelled")
              .setDescription("No changes were made."),
          ],
          components: [],
        });

        await safeStopCollector(collector, "cancel");
        return;
      }

      if (interaction.customId !== "awaken_yes") {
        return safeInteractionReply(interaction, {
          content: "Invalid awaken action.",
        });
      }

      try {
        let awakenResult = null;
        let freshPlayerForDisplay = null;

        updatePlayerAtomic(
          message.author.id,
          (fresh) => {
            const preparedFresh = preparePlayerForLatestAwakenTemplate(fresh, awakenTargetQuery);
            awakenResult = awakenOwnedCard(preparedFresh, awakenTargetQuery);

            freshPlayerForDisplay = {
              ...preparedFresh,
              cards: awakenResult.updatedCards,
              fragments: awakenResult.updatedFragments,
              berries: awakenResult.berries,
              gems: awakenResult.gems,
            };

            return freshPlayerForDisplay;
          },
          message.author.username
        );

        await safeInteractionUpdate(interaction, {
          embeds: [buildSuccessEmbed(awakenResult, freshPlayerForDisplay)],
          components: [],
        });

        await safeStopCollector(collector, "done");
      } catch (error) {
        await safeInteractionUpdate(interaction, {
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Awaken Failed")
              .setDescription(
                [
                  `**${owned.displayName || owned.name || owned.code}** cannot awaken right now.`,
                  "",
                  "**Missing / Error Detail**",
                  formatAwakenErrorDetail(error),
                  "",
                  `Use \`op ci ${owned.code || owned.displayName || owned.name || query}\` then press **(i)** to check the same requirement panel.`,
                ].join("\n")
              ),
          ],
          components: [],
        });

        await safeStopCollector(collector, "fail");
      }
    });
  },
};