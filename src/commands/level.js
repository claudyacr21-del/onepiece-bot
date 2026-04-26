const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");

const LEVEL_CAPS_BY_STAGE = {
  1: 50,
  2: 85,
  3: 100,
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getCardName(card) {
  return card.displayName || card.name || card.code || "Unknown Card";
}

function getCardStage(card) {
  return Math.max(1, Math.min(3, Number(card?.evolutionStage || 1)));
}

function getLevelCap(card) {
  return LEVEL_CAPS_BY_STAGE[getCardStage(card)] || 50;
}

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of candidates) {
    const candidate = normalize(raw);
    if (!candidate) continue;

    if (candidate === q) best = Math.max(best, 1000 + candidate.length);
    else if (candidate.startsWith(q)) best = Math.max(best, 700 + q.length);
    else if (candidate.includes(q)) best = Math.max(best, 400 + q.length);
    else {
      const qWords = q.split(" ").filter(Boolean);

      if (qWords.length && qWords.every((word) => candidate.includes(word))) {
        best = Math.max(best, 250 + qWords.join("").length);
      }
    }
  }

  return best;
}

function findOwnedBattleCard(cards, query) {
  const scored = (Array.isArray(cards) ? cards : [])
    .filter((card) => String(card.cardRole || "battle").toLowerCase() !== "boost")
    .map((card, index) => ({
      card,
      index,
      score: scoreQuery(query, [
        card.code,
        card.name,
        card.displayName,
        card.variant,
        card.type,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0] : null;
}

function findFragmentIndex(fragments, card) {
  const cardCode = normalize(card.code);
  const cardName = normalize(card.displayName || card.name);

  return (Array.isArray(fragments) ? fragments : []).findIndex((fragment) => {
    const fragmentCode = normalize(fragment.code);
    const fragmentName = normalize(fragment.name || fragment.displayName);

    return (
      (cardCode && fragmentCode && fragmentCode === cardCode) ||
      (cardName && fragmentName && fragmentName === cardName) ||
      (cardCode && fragmentName && fragmentName === cardCode) ||
      (cardName && fragmentCode && fragmentCode === cardName)
    );
  });
}

module.exports = {
  name: "level",
  aliases: ["lvl"],

  async execute(message, args) {
    const mode = String(args[0] || "").toLowerCase();
    const count = Math.floor(Number(args[1] || 0));
    const query = args.slice(2).join(" ").trim();

    if (!["frag", "fragment", "fragments"].includes(mode) || !count || count <= 0 || !query) {
      return message.reply(
        [
          "Usage: `op level frag <count> <card>`",
          "Example: `op level frag 1 luffy`",
        ].join("\n")
      );
    }

    const player = getPlayer(message.author.id, message.author.username);
    const found = findOwnedBattleCard(player.cards || [], query);

    if (!found) {
      return message.reply("You do not own that battle card.");
    }

    const card = found.card;
    const cardIndex = found.index;
    const currentLevel = Math.max(1, Number(card.level || 1));
    const levelCap = getLevelCap(card);
    const stage = getCardStage(card);

    if (currentLevel >= levelCap) {
      return message.reply(
        `**${getCardName(card)}** is already level locked at **${currentLevel}/${levelCap}** for M${stage}.\nAwaken it first to continue leveling.`
      );
    }

    const fragments = Array.isArray(player.fragments) ? [...player.fragments] : [];
    const fragmentIndex = findFragmentIndex(fragments, card);

    if (fragmentIndex === -1) {
      return message.reply(`You do not have any fragment for **${getCardName(card)}**.`);
    }

    const ownedFragments = Math.max(0, Number(fragments[fragmentIndex].amount || 0));

    if (ownedFragments <= 0) {
      return message.reply(`You do not have any fragment for **${getCardName(card)}**.`);
    }

    const possibleLevelGain = Math.min(count, ownedFragments, levelCap - currentLevel);

    if (possibleLevelGain <= 0) {
      return message.reply(
        `**${getCardName(card)}** cannot gain more levels right now.`
      );
    }

    const updatedCards = [...(player.cards || [])];
    const nextLevel = currentLevel + possibleLevelGain;

    updatedCards[cardIndex] = {
      ...card,
      level: nextLevel,
      exp: nextLevel >= levelCap ? 0 : Number(card.exp || card.xp || 0),
      xp: nextLevel >= levelCap ? 0 : Number(card.exp || card.xp || 0),
    };

    fragments[fragmentIndex] = {
      ...fragments[fragmentIndex],
      amount: ownedFragments - possibleLevelGain,
    };

    const updatedFragments = fragments.filter((fragment) => Number(fragment.amount || 0) > 0);

    updatePlayer(message.author.id, {
      cards: updatedCards,
      fragments: updatedFragments,
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("⬆️ Card Level Up")
      .setDescription(
        [
          `**Card:** ${getCardName(card)}`,
          `**Stage:** M${stage}`,
          `**Level:** ${currentLevel} → ${nextLevel}/${levelCap}`,
          `**Fragments Used:** ${possibleLevelGain}`,
          `**Fragments Left:** ${ownedFragments - possibleLevelGain}`,
          "",
          nextLevel >= levelCap
            ? `🔒 Level cap reached for M${stage}. Awaken this card to continue.`
            : "Level up complete.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Level",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};