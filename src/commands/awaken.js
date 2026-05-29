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
const cardsData = require("../data/cards");

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

  const keys = [card?.displayName, card?.name]
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

  return template?.image || "";
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

function isMonsterTrioOwnedCard(card) {
  if (cardsData.isMonsterTrioCard?.(card)) return true;

  const code = normalizeCode(card?.code);
  const name = normalizeCode(card?.displayName || card?.name || card?.title);

  return code === "lzs" || name === "monster trio";
}

function getOwnedStage(card) {
  const key = String(card?.evolutionKey || "").toUpperCase();
  const match = key.match(/M([123])/);

  if (match) return Number(match[1]);

  return Math.max(1, Math.min(3, Number(card?.evolutionStage || 1)));
}

function getMonsterTrioTemplate() {
  return (
    cardsData.MONSTER_TRIO_CARD ||
    (Array.isArray(cardsData)
      ? cardsData.find((card) => String(card?.code || "").toLowerCase() === "lzs")
      : null)
  );
}

function getMonsterTrioRequirement(nextStage) {
  const template = getMonsterTrioTemplate();
  return template?.awakenRequirements?.[`M${nextStage}`] || null;
}

function entryMatchesRequirement(entry, requirement) {
  const reqValues = [
    requirement?.code,
    requirement?.name,
    requirement?.displayName,
    requirement?.cardName,
    requirement?.title,
  ]
    .map(normalizeCode)
    .filter(Boolean);

  const entryValues = [
    entry?.code,
    entry?.name,
    entry?.displayName,
    entry?.cardName,
    entry?.title,
  ]
    .map(normalizeCode)
    .filter(Boolean);

  if (!reqValues.length || !entryValues.length) return false;

  return reqValues.some((req) =>
    entryValues.some(
      (owned) => owned === req || owned.includes(req) || req.includes(owned)
    )
  );
}

function hasRequiredCardStage(player, requirement) {
  const list = Array.isArray(player?.cards) ? player.cards : [];
  const requiredStage = Number(requirement?.stage || 1);

  return list.some((card) => {
    if (!entryMatchesRequirement(card, requirement)) return false;
    return getOwnedStage(card) >= requiredStage;
  });
}

function getFragmentAmount(fragment) {
  return Number(fragment?.amount ?? fragment?.count ?? fragment?.quantity ?? 0) || 0;
}

function getMergeFragmentMatches(fragments, requirement) {
  const list = Array.isArray(fragments) ? fragments : [];

  return list
    .map((fragment, index) => ({
      fragment,
      index,
      amount: getFragmentAmount(fragment),
    }))
    .filter(
      (entry) =>
        entry.amount > 0 && entryMatchesRequirement(entry.fragment, requirement)
    );
}

function getTotalMergeFragments(fragments, requirement) {
  return getMergeFragmentMatches(fragments, requirement).reduce(
    (total, entry) => total + entry.amount,
    0
  );
}

function consumeMergeFragments(fragments, requirement, amount) {
  const arr = Array.isArray(fragments)
    ? fragments.map((fragment) => ({ ...fragment }))
    : [];

  const matches = getMergeFragmentMatches(arr, requirement).sort((a, b) => {
    const aExact = normalizeCode(a.fragment?.code) === normalizeCode(requirement?.code) ? 1 : 0;
    const bExact = normalizeCode(b.fragment?.code) === normalizeCode(requirement?.code) ? 1 : 0;

    if (bExact !== aExact) return bExact - aExact;
    return b.amount - a.amount;
  });

  const totalOwned = matches.reduce((total, entry) => total + entry.amount, 0);
  if (totalOwned < amount) return null;

  let leftToConsume = Number(amount || 0);

  for (const match of matches) {
    if (leftToConsume <= 0) break;

    const idx = arr.findIndex((entry) => entry === match.fragment);
    if (idx < 0) continue;

    const current = getFragmentAmount(arr[idx]);
    const take = Math.min(current, leftToConsume);
    const left = current - take;

    leftToConsume -= take;

    if (left <= 0) {
      arr.splice(idx, 1);
    } else {
      arr[idx] = {
        ...arr[idx],
        amount: left,
      };

      if ("count" in arr[idx]) arr[idx].count = left;
      if ("quantity" in arr[idx]) arr[idx].quantity = left;
    }
  }

  return arr;
}

function validateMonsterTrioAwaken(player, owned, nextStage) {
  const req = getMonsterTrioRequirement(nextStage);

  if (!req) {
    throw new Error(`Monster Trio requirement for M${nextStage} was not found.`);
  }

  const missing = [];
  const fragments = Array.isArray(player?.fragments) ? player.fragments : [];

  const levelOwned = Number(owned?.level || owned?.currentLevel || owned?.lvl || 1);
  const levelNeed = Number(req.minLevel || 0);

  if (levelOwned < levelNeed) {
    missing.push(`Level ${levelOwned}/${levelNeed}`);
  }

  const berriesOwned = Number(player?.berries || 0);
  const berriesNeed = Number(req.berries || 0);

  if (berriesOwned < berriesNeed) {
    missing.push(
      `Berries ${berriesOwned.toLocaleString("en-US")}/${berriesNeed.toLocaleString("en-US")}`
    );
  }

  const gemsOwned = Number(player?.gems || 0);
  const gemsNeed = Number(req.gems || 0);

  if (gemsOwned < gemsNeed) {
    missing.push(
      `Gems ${gemsOwned.toLocaleString("en-US")}/${gemsNeed.toLocaleString("en-US")}`
    );
  }

  for (const cardReq of req.cards || []) {
    if (!hasRequiredCardStage(player, cardReq)) {
      missing.push(`${cardReq.name || cardReq.code} M${cardReq.stage || 1}`);
    }
  }

  for (const fragReq of req.mergeFragments || []) {
    const ownedAmount = getTotalMergeFragments(fragments, fragReq);
    const needAmount = Number(fragReq.amount || 0);

    if (ownedAmount < needAmount) {
      missing.push(`${fragReq.name || fragReq.code} Fragment ${ownedAmount}/${needAmount}`);
    }
  }

  if (missing.length) {
    throw new Error(missing.map((line) => `• ${line}`).join("\n"));
  }

  return req;
}

function applyMonsterTrioAwaken(player, owned, nextStage) {
  const req = validateMonsterTrioAwaken(player, owned, nextStage);
  const stageKey = getStageKey(nextStage);
  const template = getMonsterTrioTemplate() || owned;

  let updatedFragments = Array.isArray(player.fragments)
    ? player.fragments.map((fragment) => ({ ...fragment }))
    : [];

  for (const fragReq of req.mergeFragments || []) {
    const consumed = consumeMergeFragments(
      updatedFragments,
      fragReq,
      Number(fragReq.amount || 0)
    );

    if (!consumed) {
      throw new Error(`Failed to consume ${fragReq.name || fragReq.code} Fragment.`);
    }

    updatedFragments = consumed;
  }

  const updatedCards = (Array.isArray(player.cards) ? player.cards : []).map((card) => {
    const sameInstance =
      String(card?.instanceId || card?.id || "") ===
      String(owned?.instanceId || owned?.id || "");

    const sameCodeFallback =
      !owned?.instanceId &&
      !owned?.id &&
      String(card?.code || "").toLowerCase() === "lzs";

    if (!sameInstance && !sameCodeFallback) return card;

    return {
      ...card,
      code: "lzs",
      name: "Monster Trio",
      displayName: "Monster Trio",
      title: "Monster Trio",
      rarity: "M",
      currentTier: "M",
      baseTier: "M",
      originalTier: "M",
      baseRarity: "M",
      cardRole: "battle",
      type: "Merge Battle",
      isMonsterTrio: true,
      isMergeBattleCard: true,
      mergeBattleCode: "lzs",
      mergeMembers: template.mergeMembers || [
        "luffy_straw_hat",
        "zoro_pirate_hunter",
        "sanji_black_leg",
      ],
      mergeStatPercent: 50,
      canPull: false,
      canPA: false,
      summonOnly: true,
      requireRoadPoneglyph: true,
      evolutionStage: Number(nextStage),
      evolutionKey: stageKey,
      image: template?.stageImages?.[stageKey] || template?.image || card?.image || "",
      stageImages: template?.stageImages || card?.stageImages || {},
      evolutionForms: template?.evolutionForms || card?.evolutionForms || [],
      awakenRequirements: template?.awakenRequirements || card?.awakenRequirements || {},
    };
  });

  const target =
    updatedCards.find((card) => {
      const sameInstance =
        String(card?.instanceId || card?.id || "") ===
        String(owned?.instanceId || owned?.id || "");

      return sameInstance || String(card?.code || "").toLowerCase() === "lzs";
    }) || owned;

  return {
    target,
    updatedCards,
    updatedFragments,
    berries: Number(player.berries || 0) - Number(req.berries || 0),
    gems: Number(player.gems || 0) - Number(req.gems || 0),
    requirement: req,
  };
}

function buildMonsterTrioConfirmEmbed(owned, currentStage, nextStage) {
  const req = getMonsterTrioRequirement(nextStage) || {};
  const image = getStageImage(owned, nextStage);

  const embed = new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("🔥 Awaken Monster Trio")
    .setDescription(
      [
        `Current: **M${currentStage}**`,
        `Next: **M${nextStage}** • Monster Trio`,
        "",
        "**Required Cost**",
        `Berries: ${Number(req.berries || 0).toLocaleString("en-US")}`,
        `Gems: ${Number(req.gems || 0).toLocaleString("en-US")}`,
        `Level: ${Number(req.minLevel || 0)}`,
        "",
        "**Required Card**",
        ...(req.cards || []).map((entry) => `• ${entry.name || entry.code} M${entry.stage || 1}`),
        "",
        "**Required Fragments**",
        ...(req.mergeFragments || []).map(
          (entry) => `• ${entry.name || entry.code} Fragment x${entry.amount}`
        ),
        "",
        "Press **Yes** to awaken or **Cancel** to stop.",
      ].join("\n")
    );

  if (image) embed.setImage(image);
  return embed;
}

function buildMonsterTrioSuccessEmbed(result) {
  const card = result.target;
  const targetStage = Number(card.evolutionStage || 1);
  const image = getStageImage(card, targetStage);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🔥 Monster Trio Awaken Success")
    .setDescription(
      [
        `**Monster Trio** reached **M${targetStage}**`,
        `**Form:** Monster Trio`,
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
    const isMonsterTrio = isMonsterTrioOwnedCard(owned);

    if (isMonsterTrio) {
      try {
        validateMonsterTrioAwaken(player, owned, nextStage);
      } catch (error) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Monster Trio Awaken Failed")
              .setDescription(
                [
                  `**Monster Trio** cannot awaken to **M${nextStage}** yet.`,
                  "",
                  "**Missing / Error Detail**",
                  String(error?.message || "Unknown Monster Trio awaken requirement error."),
                  "",
                  "`op ci lzs` untuk cek requirement lengkap.",
                ].join("\n")
              ),
          ],
        });
      }

      const sent = await message.reply({
        embeds: [buildMonsterTrioConfirmEmbed(owned, currentStage, nextStage)],
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
              const freshOwned = findOwnedCardByNameOrCode(fresh.cards || [], query);

              if (!freshOwned || !isMonsterTrioOwnedCard(freshOwned)) {
                throw new Error("You do not own **Monster Trio**.");
              }

              awakenResult = applyMonsterTrioAwaken(fresh, freshOwned, nextStage);

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
            embeds: [buildMonsterTrioSuccessEmbed(awakenResult)],
            components: [],
          });
          await safeStopCollector(collector, "done");
        } catch (error) {
          await safeInteractionUpdate(interaction, {
            embeds: [
              new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("Monster Trio Awaken Failed")
                .setDescription(
                  [
                    "**Monster Trio** cannot awaken right now.",
                    "",
                    "**Missing / Error Detail**",
                    String(error?.message || "Unknown Monster Trio awaken requirement error."),
                    "",
                    "`op ci lzs` untuk cek requirement lengkap.",
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