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
  hydrateCard,
} = require("../utils/evolution");

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function formatReqEntry(entry) {
  if (!entry) return "Unknown";

  if (typeof entry === "string") {
    return entry
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  return `${entry.name || entry.code} M${Number(entry.stage || 1)}`;
}

function findOwnedByCode(player, code) {
  const targetCode = normalize(code);

  return (Array.isArray(player.cards) ? player.cards : [])
    .map(hydrateCard)
    .filter(Boolean)
    .find((card) => normalize(card.code) === targetCode) || null;
}

function getFragmentAmount(player, card) {
  const code = normalize(card?.code);
  const name = normalize(card?.displayName || card?.name);

  const globalAmount = (Array.isArray(player.fragments) ? player.fragments : [])
    .filter((entry) => {
      const entryCode = normalize(entry.code);
      const entryName = normalize(entry.name || entry.displayName);

      return (
        (code && entryCode === code) ||
        (name && entryName === name) ||
        (code && entryName === code) ||
        (name && entryCode === name)
      );
    })
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const cardAmount = Number(card?.fragments || 0);

  return globalAmount + cardAmount;
}

function checkRequirement(player, card, req) {
  const missing = [];

  const berriesOwned = Number(player.berries || 0);
  const berriesNeed = Number(req.berries || 0);

  if (berriesOwned < berriesNeed) {
    missing.push(
      `Berries: ${berriesOwned.toLocaleString("en-US")}/${berriesNeed.toLocaleString("en-US")}`
    );
  }

  const fragmentsOwned = getFragmentAmount(player, card);
  const fragmentsNeed = Number(req.selfFragments || 0);

  if (fragmentsOwned < fragmentsNeed) {
    missing.push(
      `Self Fragments: ${fragmentsOwned}/${fragmentsNeed}x ${card.displayName || card.name}`
    );
  }

  if (card.cardRole === "battle") {
    const levelOwned = Number(card.level || 1);
    const levelNeed = Number(req.minLevel || 0);

    if (levelOwned < levelNeed) {
      missing.push(`Min Level: ${levelOwned}/${levelNeed}`);
    }
  }

  for (const entry of Array.isArray(req.cards) ? req.cards : []) {
    const owned = findOwnedByCode(player, entry.code);
    const stageNeed = Number(entry.stage || 1);

    if (!owned) {
      missing.push(`Battle Card: ${formatReqEntry(entry)} not owned`);
      continue;
    }

    if (Number(owned.evolutionStage || 1) < stageNeed) {
      missing.push(
        `Battle Card: ${owned.displayName || owned.name} M${Number(owned.evolutionStage || 1)}/M${stageNeed}`
      );
    }
  }

  for (const entry of Array.isArray(req.boosts) ? req.boosts : []) {
    const owned = findOwnedByCode(player, entry.code);
    const stageNeed = Number(entry.stage || 1);

    if (!owned) {
      missing.push(`Boost Card: ${formatReqEntry(entry)} not owned`);
      continue;
    }

    if (Number(owned.evolutionStage || 1) < stageNeed) {
      missing.push(
        `Boost Card: ${owned.displayName || owned.name} M${Number(owned.evolutionStage || 1)}/M${stageNeed}`
      );
    }
  }

  return {
    canProceed: missing.length === 0,
    missing,
  };
}

function reqText(player, card, req) {
  const berriesOwned = Number(player.berries || 0);
  const berriesNeed = Number(req.berries || 0);

  const fragmentsOwned = getFragmentAmount(player, card);
  const fragmentsNeed = Number(req.selfFragments || 0);

  const lines = [
    `Berries: ${berriesOwned.toLocaleString("en-US")}/${berriesNeed.toLocaleString("en-US")}`,
    `Self Fragments: ${fragmentsOwned}/${fragmentsNeed}x ${card.displayName || card.name}`,
    card.cardRole === "battle"
      ? `Min Level: ${Number(card.level || 1)}/${Number(req.minLevel || 0)}`
      : "Min Level: Not required",
  ];

  if (Array.isArray(req.cards) && req.cards.length) {
    lines.push(`Battle Cards: ${req.cards.map(formatReqEntry).join(", ")}`);
  }

  if (Array.isArray(req.boosts) && req.boosts.length) {
    lines.push(`Boost Cards: ${req.boosts.map(formatReqEntry).join(", ")}`);
  }

  if (req.text) {
    lines.push(req.text);
  }

  return lines.join("\n");
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

    const check = checkRequirement(player, owned, req);

    const description = [
      `Current: **M${owned.evolutionStage}**`,
      `Next: **M${nextStage}** • ${owned.evolutionForms?.[nextStage - 1]?.name || "Unknown"}`,
      "",
      reqText(player, owned, req),
      "",
      check.canProceed
        ? "Press **Yes** to proceed or **Cancel** to stop."
        : [
            "**Missing Requirements**",
            ...check.missing.map((line) => `↪ ${line}`),
            "",
            "You cannot awaken this card yet.",
          ].join("\n"),
    ].join("\n");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("awaken_yes")
        .setLabel("Yes")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!check.canProceed),
      new ButtonBuilder()
        .setCustomId("awaken_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    );

    const sent = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(check.canProceed ? 0xf1c40f : 0xe74c3c)
          .setTitle(`✨ Awaken ${owned.displayName || owned.name}`)
          .setDescription(description),
      ],
      components: [row],
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
              .setDescription(
                [
                  `**${result.target.displayName || result.target.name}** reached **M${result.target.evolutionStage}**`,
                  `**Form:** ${result.target.evolutionForms?.[result.target.evolutionStage - 1]?.name || "Unknown"}`,
                  `**Tier:** ${result.target.currentTier || result.target.rarity}`,
                  `**Power:** ${result.target.currentPower || 0}`,
                  "",
                  `ATK: ${result.target.atk}`,
                  `HP: ${result.target.hp}`,
                  `SPD: ${result.target.speed}`,
                ].join("\n")
              ),
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
              .setDescription(err.message || "Unknown awaken error."),
          ],
          components: [],
        });

        collector.stop("fail");
      }
    });
  },
};