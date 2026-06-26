const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const {
  getPlayer,
  updatePlayerAtomic,
  flushPlayerNow,
} = require("../playerStore");
const {
  normalizeCode,
  isUrl,
  findOwnedCardByQuery,
  getCardDisplayName,
} = require("../utils/customSkins");
const { hydrateCard } = require("../utils/evolution");

function isAdmin(message) {
  const adminIds = String(
    process.env.ADMIN_IDS ||
      process.env.OWNER_IDS ||
      process.env.BOT_OWNER_IDS ||
      process.env.BOT_OWNER_ID ||
      ""
  )
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);

  if (adminIds.includes(String(message.author.id))) return true;

  return Boolean(
    message.member?.permissions?.has(PermissionsBitField.Flags.Administrator)
  );
}

function makeSkinTitle(targetUser) {
  const name =
    targetUser?.globalName ||
    targetUser?.username ||
    "Player";

  return `${name}'s Exclusive Skin`;
}

function parseSkinArgsByOwnedCard(player, args) {
  const image = [...args].reverse().find((arg) => isUrl(arg));

  if (!image) return null;

  const imageIndex = args.findIndex((arg) => arg === image);
  const beforeImage = args.slice(0, imageIndex).map(String).filter(Boolean);

  if (beforeImage.length < 2) return null;

  const candidates = [];

  for (let i = 1; i < beforeImage.length; i++) {
    const cardQuery = beforeImage.slice(0, i).join(" ").trim();
    const skinName = beforeImage.slice(i).join(" ").trim();

    if (!cardQuery || !skinName) continue;

    const card = findOwnedCardByQuery(player, cardQuery);

    if (!card) continue;

    candidates.push({
      card,
      cardQuery,
      skinName,
      image,
      score: cardQuery.split(/\s+/).length,
    });
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.score - a.score);

  return candidates[0];
}

module.exports = {
  name: "addskin",

  async execute(message, args) {
    if (!isAdmin(message)) {
      return message.reply({
        content: "Only admins can use this command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const targetUser = message.mentions.users.first();

    if (!targetUser) {
      return message.reply({
        content:
          "Usage: `op addskin @user <card name/code> <skin name> <image/gif url>`\nExample: `op addskin @user lzs Sesshomaru https://cdn.discordapp.com/file.gif`",
        allowedMentions: { repliedUser: false },
      });
    }

    const argsWithoutMention = args.filter((arg) => {
      const raw = String(arg || "");
      return !raw.includes(targetUser.id);
    });

    const previewPlayer = getPlayer(targetUser.id, targetUser.username);
    const parsed = parseSkinArgsByOwnedCard(previewPlayer, argsWithoutMention);

    if (!parsed) {
      return message.reply({
        content:
          [
            "Could not detect the card and skin name.",
            "",
            "Usage:",
            "`op addskin @user <card name/code> <skin name> <image/gif url>`",
            "",
            "Examples:",
            "`op addskin @user lzs Sesshomaru https://cdn.discordapp.com/file.gif`",
            "`op addskin @user monster trio Rimuru https://cdn.discordapp.com/file.gif`",
          ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    if (!isUrl(parsed.image)) {
      return message.reply({
        content: "Image/GIF must be a valid URL.",
        allowedMentions: { repliedUser: false },
      });
    }

    const hydratedPreviewCard = hydrateCard(parsed.card) || parsed.card;
    const originalName = getCardDisplayName(hydratedPreviewCard);
    const skinTitle = makeSkinTitle(targetUser);

    let totalVariants = 0;
    let finalCardCode = normalizeCode(hydratedPreviewCard.code);

    try {
      updatePlayerAtomic(
        targetUser.id,
        (fresh) => {
          const freshParsed = parseSkinArgsByOwnedCard(fresh, argsWithoutMention);

          if (!freshParsed?.card) {
            throw new Error(
              `Target user does not own a card matching \`${parsed.cardQuery}\`.`
            );
          }

          const hydratedCard = hydrateCard(freshParsed.card) || freshParsed.card;
          const key = normalizeCode(hydratedCard.code);

          if (!key) {
            throw new Error("Card code is missing, cannot save skin.");
          }

          const customSkins =
            fresh.customSkins && typeof fresh.customSkins === "object"
              ? { ...fresh.customSkins }
              : {};

          const currentSet = customSkins[key] || {
            cardCode: key,
            originalName: getCardDisplayName(hydratedCard),
            activeIndex: 0,
            variants: [],
          };

          const variants = Array.isArray(currentSet.variants)
            ? [...currentSet.variants]
            : [];

          if (variants.length >= 20) {
            throw new Error("This card already has the maximum 20 skin slots.");
          }

          variants.push({
            name: parsed.skinName,
            title: skinTitle,
            image: parsed.image,
            addedBy: String(message.author.id),
            addedAt: Date.now(),
          });

          totalVariants = variants.length;
          finalCardCode = key;

          customSkins[key] = {
            ...currentSet,
            cardCode: key,
            originalName: currentSet.originalName || getCardDisplayName(hydratedCard),
            activeIndex: Number(currentSet.activeIndex || 0),
            variants,
          };

          return {
            ...fresh,
            customSkins,
          };
        },
        targetUser.username
      );

      await flushPlayerNow(
        targetUser.id,
        Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000)
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to add custom skin.",
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle("Custom Skin Added")
          .setDescription(
            [
              `**User:** <@${targetUser.id}>`,
              `**Card Code:** \`${finalCardCode}\``,
              `**Skinned Character:** ${originalName}`,
              `**Skin Name:** ${parsed.skinName}`,
              `**Skin Title:** ${skinTitle}`,
              `**Skin Slots:** ${totalVariants}/20`,
              "",
              `View: \`op showskins ${parsed.skinName}\``,
              `Set: \`op setskin ${totalVariants} ${parsed.skinName}\``,
            ].join("\n")
          )
          .setImage(parsed.image)
          .setFooter({ text: "One Piece Bot • Custom Skins" }),
      ],
      allowedMentions: {
        repliedUser: false,
        parse: [],
      },
    });
  },
};