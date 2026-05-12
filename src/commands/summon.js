const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { createOwnedCard } = require("../utils/evolution");
const rawCards = require("../data/cards");

const SUMMON_FRAGMENT_COST = 25;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getCardName(card) {
  return card.displayName || card.name || "Unknown Card";
}

function getBattleCards() {
  return rawCards.filter(
    (card) => String(card.cardRole || "").toLowerCase() === "battle"
  );
}

function findBattleCard(query) {
  const q = normalize(query);
  if (!q) return null;

  const cards = getBattleCards();

  return (
    cards.find((card) => normalize(card.code) === q) ||
    cards.find((card) => normalize(getCardName(card)) === q) ||
    cards.find((card) => normalize(card.code).includes(q)) ||
    cards.find((card) => normalize(getCardName(card)).includes(q)) ||
    null
  );
}

function findFragmentIndex(fragments, card) {
  const cardCode = normalize(card.code);
  const cardName = normalize(getCardName(card));

  return fragments.findIndex((frag) => {
    const fragCode = normalize(frag.code);
    const fragName = normalize(frag.name);

    return (
      fragCode === cardCode ||
      fragName === cardName ||
      fragName.includes(cardName) ||
      cardName.includes(fragName)
    );
  });
}

function alreadyOwnsCard(player, card) {
  const code = normalize(card.code);

  return (Array.isArray(player.cards) ? player.cards : []).some(
    (owned) => normalize(owned.code) === code
  );
}

function getCardImage(card, ownedCard = null) {
  return (
    ownedCard?.evolutionForms?.[0]?.image ||
    ownedCard?.stageImages?.M1 ||
    ownedCard?.image ||
    card?.evolutionForms?.[0]?.image ||
    card?.stageImages?.M1 ||
    card?.image ||
    null
  );
}

function buildConfirmRows(userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`summon_confirm_${userId}`)
        .setLabel("Summon")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`summon_cancel_${userId}`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

module.exports = {
  name: "summon",
  aliases: ["summoncard"],

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply(
        [
          "Usage: `op summon <battle card name>`",
          "Example: `op summon luffy`",
          "",
          `Cost: **${SUMMON_FRAGMENT_COST}x self fragments**`,
        ].join("\n")
      );
    }

    const player = getPlayer(message.author.id, message.author.username);
    const card = findBattleCard(query);

    if (!card) {
      return message.reply(`Battle card matching \`${query}\` was not found.`);
    }

    if (String(card.cardRole || "").toLowerCase() !== "battle") {
      return message.reply("Only battle cards can be summoned.");
    }

    if (alreadyOwnsCard(player, card)) {
      return message.reply(`You already own **${getCardName(card)}**.`);
    }

    const fragments = Array.isArray(player.fragments) ? [...player.fragments] : [];
    const fragmentIndex = findFragmentIndex(fragments, card);

    if (fragmentIndex === -1) {
      return message.reply(
        `You need **${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment** to summon this card.`
      );
    }

    const ownedFragments = Number(fragments[fragmentIndex].amount || 0);

    if (ownedFragments < SUMMON_FRAGMENT_COST) {
      return message.reply(
        `You need **${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment**.\nYou currently have **${ownedFragments}x**.`
      );
    }

    const rarity = String(card.baseTier || card.rarity || "C").toUpperCase();

    const confirmMessage = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("✨ Confirm Card Summon")
          .setDescription(
            [
              `**Card:** ${getCardName(card)}`,
              `**Rarity:** ${rarity}`,
              `**Cost:** ${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment`,
              `**Your Fragments:** ${ownedFragments}`,
              `**Remaining After Summon:** ${ownedFragments - SUMMON_FRAGMENT_COST}`,
              "",
              "Press **Summon** to confirm or **Cancel** to stop.",
            ].join("\n")
          )
          .setImage(getCardImage(card))
          .setFooter({ text: "One Piece Bot • Summon Confirm" }),
      ],
      components: buildConfirmRows(message.author.id),
    });

    const collector = confirmMessage.createMessageComponentCollector({
      time: 60_000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can use this summon confirmation.",
          ephemeral: true,
        });
      }

      if (interaction.customId === `summon_cancel_${message.author.id}`) {
        collector.stop("cancelled");
        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle("Summon Cancelled")
              .setDescription("No fragments were consumed."),
          ],
          components: [],
        });
      }

      if (interaction.customId !== `summon_confirm_${message.author.id}`) return;

      const fresh = getPlayer(message.author.id, message.author.username);

      if (alreadyOwnsCard(fresh, card)) {
        collector.stop("owned");
        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Summon Failed")
              .setDescription(`You already own **${getCardName(card)}**.`),
          ],
          components: [],
        });
      }

      const freshFragments = Array.isArray(fresh.fragments)
        ? [...fresh.fragments]
        : [];
      const freshFragmentIndex = findFragmentIndex(freshFragments, card);

      if (freshFragmentIndex === -1) {
        collector.stop("missing");
        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Summon Failed")
              .setDescription(
                `You no longer have **${getCardName(card)} Fragment**.`
              ),
          ],
          components: [],
        });
      }

      const freshOwnedFragments = Number(
        freshFragments[freshFragmentIndex].amount || 0
      );

      if (freshOwnedFragments < SUMMON_FRAGMENT_COST) {
        collector.stop("missing");
        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Summon Failed")
              .setDescription(
                `You need **${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment**.\nYou currently have **${freshOwnedFragments}x**.`
              ),
          ],
          components: [],
        });
      }

      if (freshOwnedFragments === SUMMON_FRAGMENT_COST) {
        freshFragments.splice(freshFragmentIndex, 1);
      } else {
        freshFragments[freshFragmentIndex] = {
          ...freshFragments[freshFragmentIndex],
          amount: freshOwnedFragments - SUMMON_FRAGMENT_COST,
        };
      }

      const ownedCard = createOwnedCard(card);
      const updatedCards = [...(fresh.cards || []), ownedCard];

      updatePlayer(message.author.id, {
        cards: updatedCards,
        fragments: freshFragments,
      });

      collector.stop("confirmed");

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("✨ Card Summoned")
            .setDescription(
              [
                `**Card:** ${getCardName(card)}`,
                `**Rarity:** ${rarity}`,
                `**Cost:** ${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment`,
                `**Remaining Fragments:** ${
                  freshOwnedFragments - SUMMON_FRAGMENT_COST
                }`,
                "",
                "The card has been added to your collection.",
              ].join("\n")
            )
            .setImage(getCardImage(card, ownedCard))
            .setFooter({ text: "One Piece Bot • Summon" }),
        ],
        components: [],
      });
    });

    collector.on("end", async (_collected, reason) => {
      if (["confirmed", "cancelled", "owned", "missing"].includes(reason)) return;

      try {
        await confirmMessage.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle("Summon Expired")
              .setDescription("No fragments were consumed."),
          ],
          components: [],
        });
      } catch {}
    });
  },
};