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
const { findMergeCard } = require("../data/mergeCardData");

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
    .replace(/\s+/g, " ");
}

function scoreOwnedCardQuery(card, query) {
  const q = normalizeCode(query);
  if (!q) return 0;

  const fields = [
    card?.name,
    card?.displayName,
    String(card?.code || "").replace(/_/g, " "),
  ]
    .map(normalizeCode)
    .filter(Boolean);

  let best = 0;

  for (const field of fields) {
    if (field === q) best = Math.max(best, 1000 + field.length);
    else if (field.startsWith(q)) best = Math.max(best, 800 + q.length);
    else if (field.includes(q)) best = Math.max(best, 500 + q.length);
    else {
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
    `**Power:** ${Number(card.currentPower || card.power || 0).toLocaleString(
      "en-US"
    )}`,
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

function findOwnedMergeCard(player, mergeCard) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];
  const wantedCode = normalizeCode(mergeCard?.code);
  const wantedName = normalizeCode(mergeCard?.name);

  return (
    cards.find((card) => {
      const role = String(card?.cardRole || "").toLowerCase();
      const code = normalizeCode(card?.code);
      const name = normalizeCode(card?.name || card?.displayName);

      return role === "merge" && (code === wantedCode || name === wantedName);
    }) || null
  );
}

function getOwnedMergeStage(card) {
  const key = String(card?.evolutionKey || "").toUpperCase();
  const match = key.match(/M([123])/);

  if (match) return Number(match[1]);

  return Math.max(1, Math.min(3, Number(card?.evolutionStage || 1)));
}

function hasMergeKeyStage(player, mergeCard, requiredStage = 1) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];
  const keyCode = normalizeCode(mergeCard?.keyCardCode);
  const keyName = normalizeCode(mergeCard?.keyCardName);

  return cards.some((card) => {
    const code = normalizeCode(card?.code);
    const name = normalizeCode(card?.name || card?.displayName);
    const isKey =
      code === keyCode ||
      name === keyName ||
      name.includes(keyName) ||
      keyName.includes(name);

    return isKey && getOwnedMergeStage(card) >= Number(requiredStage || 1);
  });
}

function makePseudoFragmentCard(fragmentName) {
  return {
    code: fragmentName,
    name: fragmentName,
    displayName: fragmentName,
  };
}

function isMatchingMergeFragment(frag, fragmentName) {
  const card = makePseudoFragmentCard(fragmentName);
  const cardCode = normalizeCode(card.code);
  const cardName = normalizeCode(card.displayName);

  const fragCode = normalizeCode(frag?.code);
  const fragName = normalizeCode(frag?.name || frag?.displayName);
  const fragCardCode = normalizeCode(
    frag?.cardCode ||
      frag?.sourceCode ||
      frag?.characterCode ||
      frag?.sourceCardCode ||
      frag?.targetCode
  );

  return (
    fragCode === cardCode ||
    fragCardCode === cardCode ||
    fragName === cardName ||
    fragName === `${cardName} fragment` ||
    fragName.includes(cardName) ||
    cardName.includes(fragName)
  );
}

function getMergeFragmentMatches(fragments, fragmentName) {
  return (Array.isArray(fragments) ? fragments : [])
    .map((frag, index) => ({
      frag,
      index,
      amount: Number(frag?.amount || 0),
    }))
    .filter(
      (entry) =>
        entry.amount > 0 && isMatchingMergeFragment(entry.frag, fragmentName)
    );
}

function getTotalMergeFragments(fragments, fragmentName) {
  return getMergeFragmentMatches(fragments, fragmentName).reduce(
    (total, entry) => total + Number(entry.amount || 0),
    0
  );
}

function consumeMergeFragmentsByName(fragments, fragmentName, amount) {
  const arr = Array.isArray(fragments) ? [...fragments] : [];
  let remainingToConsume = Number(amount || 0);

  const matches = getMergeFragmentMatches(arr, fragmentName).sort(
    (a, b) => b.amount - a.amount
  );

  const totalOwned = matches.reduce((total, entry) => total + entry.amount, 0);

  if (totalOwned < amount) return null;

  for (const match of matches) {
    if (remainingToConsume <= 0) break;

    const currentIndex = arr.findIndex((entry) => entry === match.frag);
    if (currentIndex < 0) continue;

    const currentAmount = Number(arr[currentIndex]?.amount || 0);
    const take = Math.min(currentAmount, remainingToConsume);
    const left = currentAmount - take;

    remainingToConsume -= take;

    if (left <= 0) {
      arr.splice(currentIndex, 1);
    } else {
      arr[currentIndex] = {
        ...arr[currentIndex],
        amount: left,
      };
    }
  }

  return arr;
}

function getMergeStageImage(mergeCard, stage) {
  const stageKey = getStageKey(stage);
  return mergeCard?.stageImages?.[stageKey] || mergeCard?.image || "";
}

function getMergeMasteryName(mergeCard, stage) {
  return (
    mergeCard?.masteryNames?.[Number(stage || 1) - 1] ||
    mergeCard?.name ||
    "Merge Card"
  );
}

function getMergeAwakenRequirement(mergeCard, nextStage) {
  return mergeCard?.awakenRequirements?.[Number(nextStage)] || null;
}

function validateMergeAwakenRequirement(player, mergeCard, ownedMerge, nextStage) {
  const req = getMergeAwakenRequirement(mergeCard, nextStage);

  if (!req) {
    throw new Error(`Merge awaken requirement for M${nextStage} was not found.`);
  }

  const missing = [];
  const fragments = Array.isArray(player?.fragments) ? player.fragments : [];

  const keyStage = Number(req.keyStage || nextStage);

  if (!hasMergeKeyStage(player, mergeCard, keyStage)) {
    missing.push(`${mergeCard.keyCardName || mergeCard.keyCardCode} M${keyStage}`);
  }

  const berriesNeed = Number(req.berries || 0);
  const berriesOwned = Number(player?.berries || 0);

  if (berriesOwned < berriesNeed) {
    missing.push(
      `Berries ${berriesOwned.toLocaleString("en-US")}/${berriesNeed.toLocaleString("en-US")}`
    );
  }

  const gemsNeed = Number(req.gems || 0);
  const gemsOwned = Number(player?.gems || 0);

  if (gemsOwned < gemsNeed) {
    missing.push(
      `Gems ${gemsOwned.toLocaleString("en-US")}/${gemsNeed.toLocaleString("en-US")}`
    );
  }

  for (const fragReq of req.fragments || []) {
    const owned = getTotalMergeFragments(fragments, fragReq.fragmentName);
    const need = Number(fragReq.amount || 0);

    if (owned < need) {
      missing.push(`${fragReq.fragmentName} Fragment ${owned}/${need}`);
    }
  }

  if (missing.length) {
    throw new Error(missing.map((line) => `• ${line}`).join("\n"));
  }

  return req;
}

function applyMergeAwaken(player, mergeCard, ownedMerge, nextStage) {
  const req = validateMergeAwakenRequirement(player, mergeCard, ownedMerge, nextStage);
  const stageKey = getStageKey(nextStage);

  let updatedFragments = Array.isArray(player.fragments)
    ? player.fragments.map((fragment) => ({ ...fragment }))
    : [];

  for (const fragReq of req.fragments || []) {
    const consumed = consumeMergeFragmentsByName(
      updatedFragments,
      fragReq.fragmentName,
      Number(fragReq.amount || 0)
    );

    if (!consumed) {
      throw new Error(`Failed to consume ${fragReq.fragmentName} Fragment.`);
    }

    updatedFragments = consumed;
  }

  const updatedCards = (Array.isArray(player.cards) ? player.cards : []).map((card) => {
    if (String(card?.instanceId || "") !== String(ownedMerge?.instanceId || "")) {
      return card;
    }

    return {
      ...card,
      evolutionStage: Number(nextStage),
      evolutionKey: stageKey,
      currentTier: "M",
      rarity: "M",
      image: getMergeStageImage(mergeCard, nextStage),
      stageImages: mergeCard.stageImages || card.stageImages || {},
      masteryNames: mergeCard.masteryNames || card.masteryNames || [],
      name: mergeCard.name,
      displayName: mergeCard.name,
      title: mergeCard.title || mergeCard.name,
    };
  });

  const target =
    updatedCards.find(
      (card) => String(card?.instanceId || "") === String(ownedMerge?.instanceId || "")
    ) || ownedMerge;

  return {
    target,
    updatedCards,
    updatedFragments,
    berries: Number(player.berries || 0) - Number(req.berries || 0),
    gems: Number(player.gems || 0) - Number(req.gems || 0),
    requirement: req,
  };
}

function buildMergeConfirmEmbed(mergeCard, ownedMerge, currentStage, nextStage) {
  const image = getMergeStageImage(mergeCard, nextStage);
  const req = getMergeAwakenRequirement(mergeCard, nextStage) || {};

  const embed = new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle(`🔗 Awaken Merge ${mergeCard.name}`)
    .setDescription(
      [
        `Current: **M${currentStage}**`,
        `Next: **M${nextStage}** • ${getMergeMasteryName(mergeCard, nextStage)}`,
        "",
        "**Required Cost**",
        `Berries: ${Number(req.berries || 0).toLocaleString("en-US")}`,
        `Gems: ${Number(req.gems || 0).toLocaleString("en-US")}`,
        "",
        "**Required Fragments**",
        ...(req.fragments || []).map(
          (entry) => `• ${entry.fragmentName} Fragment x${entry.amount}`
        ),
        "",
        `Key Card: **${mergeCard.keyCardName} M${req.keyStage || nextStage}**`,
        "",
        "Press **Yes** to awaken or **Cancel** to stop.",
      ].join("\n")
    );

  if (image) embed.setImage(image);
  return embed;
}

function buildMergeSuccessEmbed(result, mergeCard) {
  const card = result.target;
  const targetStage = Number(card.evolutionStage || 1);
  const image = getMergeStageImage(mergeCard, targetStage);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🔗 Merge Awaken Success")
    .setDescription(
      [
        `**${mergeCard.name}** reached **M${targetStage}**`,
        `**Form:** ${getMergeMasteryName(mergeCard, targetStage)}`,
        `**Tier:** M`,
        "",
        `**Berries Left:** ${Number(result.berries || 0).toLocaleString("en-US")}`,
        `**Gems Left:** ${Number(result.gems || 0).toLocaleString("en-US")}`,
      ].join("\n")
    );

  if (image) embed.setImage(image);
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

    const mergeCardByQuery = findMergeCard(query);
    const owned = mergeCardByQuery
      ? findOwnedMergeCard(player, mergeCardByQuery)
      : findOwnedCardByNameOrCode(player.cards || [], query);

    if (!owned) {
      return message.reply({
        content: mergeCardByQuery
          ? `You do not own **${mergeCardByQuery.name}**.`
          : "You do not own that card.",
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

    const mergeCard =
      mergeCardByQuery ||
      (String(owned?.cardRole || "").toLowerCase() === "merge"
        ? findMergeCard(owned.code || owned.name || owned.displayName)
        : null);

    if (mergeCard) {
      try {
        validateMergeAwakenRequirement(player, mergeCard, owned, nextStage);
      } catch (error) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Merge Awaken Failed")
              .setDescription(
                [
                  `**${mergeCard.name}** cannot awaken to **M${nextStage}** yet.`,
                  "",
                  "**Missing / Error Detail**",
                  String(error?.message || "Unknown merge awaken requirement error."),
                  "",
                  `Use \`op ci ${mergeCard.aliases?.[0] || mergeCard.code}\` to check the full requirements.`,
                ].join("\n")
              ),
          ],
        });
      }

      const sent = await message.reply({
        embeds: [buildMergeConfirmEmbed(mergeCard, owned, currentStage, nextStage)],
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

          updatePlayerAtomic(
            message.author.id,
            (fresh) => {
              const freshOwned = findOwnedMergeCard(fresh, mergeCard);

              if (!freshOwned) {
                throw new Error(`You do not own **${mergeCard.name}**.`);
              }

              awakenResult = applyMergeAwaken(fresh, mergeCard, freshOwned, nextStage);

              return {
                ...fresh,
                cards: awakenResult.updatedCards,
                fragments: awakenResult.updatedFragments,
                berries: awakenResult.berries,
                gems: awakenResult.gems,
              };
            },
            message.author.username
          );

          await safeInteractionUpdate(interaction, {
            embeds: [buildMergeSuccessEmbed(awakenResult, mergeCard)],
            components: [],
          });
          await safeStopCollector(collector, "done");
        } catch (error) {
          await safeInteractionUpdate(interaction, {
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("Merge Awaken Failed")
                .setDescription(
                  [
                    `**${mergeCard.name}** cannot awaken right now.`,
                    "",
                    "**Missing / Error Detail**",
                    String(error?.message || "Unknown merge awaken requirement error."),
                    "",
                    `Use \`op ci ${mergeCard.aliases?.[0] || mergeCard.code}\` to check the full requirements.`,
                  ].join("\n")
                ),
            ],
            components: [],
          });
          await safeStopCollector(collector, "fail");
        }
      });

      return;
    }

    try {
      const validationPlayer = cloneDeep(player);
      awakenOwnedCard(validationPlayer, query);
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
            awakenResult = awakenOwnedCard(fresh, query);

            freshPlayerForDisplay = {
              ...fresh,
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
                  String(error?.message || "Unknown awaken requirement error."),
                  "",
                  `Use \`op ci ${owned.displayName || owned.name || query}\` to check the full requirements.`,
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