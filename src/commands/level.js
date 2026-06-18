const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  getPlayer,
  updatePlayerAtomic,
  flushPlayerNow,
} = require("../playerStore");
const { incrementQuestCounter } = require("../utils/questProgress");
const { isMergeCard, buildMergedCard } = require("../utils/mergeCards");
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

function safeStat(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function scaleStatByLevelGain(value, levelGain, percentPerLevel) {
  const base = Math.max(0, Math.floor(safeStat(value, 0)));
  const gain = Math.max(0, Math.floor(safeStat(levelGain, 0)));
  const percent = Math.max(0, safeStat(percentPerLevel, 0));

  if (base <= 0 || gain <= 0 || percent <= 0) return base;

  return Math.max(1, Math.floor(base * (1 + (gain * percent) / 100)));
}

function recalcPowerFromStats(card) {
  const atk = Math.max(0, Math.floor(safeStat(card.atk, 0)));
  const hp = Math.max(0, Math.floor(safeStat(card.hp, 0)));
  const speed = Math.max(0, Math.floor(safeStat(card.speed || card.spd, 0)));

  const calculated = Math.floor(atk * 1.4 + hp * 0.22 + speed * 9);
  const oldPower = Math.max(0, Math.floor(safeStat(card.currentPower || card.power, 0)));

  return Math.max(oldPower, calculated);
}

function applyLevelStats(card, levelGain) {
  const gain = Math.max(0, Math.floor(Number(levelGain || 0)));

  if (!card || gain <= 0) return card;

  const nextAtk = scaleStatByLevelGain(card.atk, gain, 1);
  const nextHp = scaleStatByLevelGain(card.hp, gain, 1);
  const nextSpeed = scaleStatByLevelGain(card.speed || card.spd, gain, 0.5);

  const nextCard = {
    ...card,
    atk: nextAtk,
    hp: nextHp,
    speed: nextSpeed,
    spd: nextSpeed,
    displayAtk: nextAtk,
    displayHp: nextHp,
    displaySpeed: nextSpeed,
    combatAtk: nextAtk,
    combatHp: nextHp,
    combatSpeed: nextSpeed,
  };

  const nextPower = recalcPowerFromStats(nextCard);

  return {
    ...nextCard,
    currentPower: nextPower,
    power: nextPower,
  };
}

function applyLevelStatsWithMergeSupport(player, cardIndex, card, levelGain) {
  if (!card) return card;

  if (!isMergeCard(card)) {
    return applyLevelStats(card, levelGain);
  }

  const stage = getCardStage(card);
  const cards = Array.isArray(player?.cards) ? [...player.cards] : [];

  if (cardIndex >= 0 && cardIndex < cards.length) {
    cards[cardIndex] = card;
  }

  const rebuilt = buildMergedCard(
    {
      ...(player || {}),
      cards,
    },
    card,
    stage
  );

  return {
    ...(rebuilt || card),

    // Keep the level state from the level command.
    level: card.level,
    currentLevel: card.currentLevel,
    lvl: card.lvl,
    exp: card.exp,
    xp: card.xp,

    // Merge card power stays fixed by design.
    power: rebuilt?.power || card.power,
    currentPower: rebuilt?.currentPower || card.currentPower,
    finalPower: rebuilt?.finalPower || card.finalPower,
    displayPower: rebuilt?.displayPower || card.displayPower,
    combatPower: rebuilt?.combatPower || card.combatPower,
    teamPower: rebuilt?.teamPower || card.teamPower,
    battlePower: rebuilt?.battlePower || card.battlePower,
    totalPower: rebuilt?.totalPower || card.totalPower,
  };
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
    .map((card, index) => {
      const role = String(card?.cardRole || "battle").toLowerCase();

      return {
        card,
        index,
        role,
        score: scoreQuery(query, [
          card?.code,
          card?.name,
          card?.displayName,
          card?.variant,
          card?.type,
        ]),
      };
    })
    .filter((entry) => entry.role !== "boost")
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
    const countArg = String(args[1] || "").toLowerCase();
    const useAllFragments = countArg === "all";
    const count = useAllFragments ? Infinity : Math.floor(Number(countArg || 0));
    const query = args.slice(2).join(" ").trim();

    if (
      !["frag", "fragment", "fragments"].includes(mode) ||
      (!useAllFragments && (!count || count <= 0)) ||
      !query
    ) {
      return message.reply(
        [
          "Usage: `op level frag <count/all> <card>`",
          "Example: `op level frag 1 luffy`",
          "Example: `op level frag all luffy`",
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

    const confirmEmbed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("Confirm Fragment Level Up")
      .setDescription(
        [
          `**Card:** ${getCardName(card)}`,
          `**Stage:** M${stage}`,
          `**Current Level:** ${currentLevel}/${levelCap}`,
          `**After Level:** ${currentLevel + possibleLevelGain}/${levelCap}`,
          `**Fragments To Use:** ${possibleLevelGain}`,
          `**Fragments Owned:** ${ownedFragments}`,
          `**Fragments Left:** ${ownedFragments - possibleLevelGain}`,
          "",
          "Press **Confirm** to use these fragments.",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Level Confirmation" });

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("level_frag_confirm")
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("level_frag_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    );

    const confirmMessage = await message.reply({
      embeds: [confirmEmbed],
      components: [confirmRow],
    });

    let confirmInteraction;

    try {
      confirmInteraction = await confirmMessage.awaitMessageComponent({
        time: 60 * 1000,
        filter: (interaction) =>
          interaction.user.id === message.author.id &&
          ["level_frag_confirm", "level_frag_cancel"].includes(interaction.customId),
      });
    } catch {
      return confirmMessage.edit({
        content: "Level up confirmation expired.",
        embeds: [],
        components: [],
      }).catch(() => null);
    }

    if (confirmInteraction.customId === "level_frag_cancel") {
      return confirmInteraction.update({
        content: "Level up cancelled.",
        embeds: [],
        components: [],
      });
    }

    let finalCardName = getCardName(card);
    let finalStage = stage;
    let finalCurrentLevel = currentLevel;
    let finalNextLevel = currentLevel;
    let finalFragmentsUsed = possibleLevelGain;
    let finalFragmentsLeft = ownedFragments - possibleLevelGain;
    let finalLevelCap = levelCap;

    await updatePlayerAtomic(
      message.author.id,
      (fresh) => {
        const freshFound = findOwnedBattleCard(fresh.cards || [], query);

        if (!freshFound) {
          throw new Error("You do not own that battle card anymore.");
        }

        const freshCard = freshFound.card;
        const freshCardIndex = freshFound.index;
        const freshCurrentLevel = Math.max(1, Number(freshCard.level || 1));
        const freshStage = getCardStage(freshCard);
        const freshLevelCap = getLevelCap(freshCard);

        if (freshCurrentLevel >= freshLevelCap) {
          throw new Error(
            `${getCardName(freshCard)} is level locked at ${freshCurrentLevel}/${freshLevelCap}.`
          );
        }

        const freshFragments = Array.isArray(fresh.fragments)
          ? [...fresh.fragments]
          : [];

        const freshFragmentIndex = findFragmentIndex(freshFragments, freshCard);

        if (freshFragmentIndex === -1) {
          throw new Error(`You do not have any fragment for ${getCardName(freshCard)}.`);
        }

        const freshOwnedFragments = Math.max(
          0,
          Number(freshFragments[freshFragmentIndex].amount || 0)
        );

        if (freshOwnedFragments <= 0) {
          throw new Error(`You do not have any fragment for ${getCardName(freshCard)}.`);
        }

        const freshPossibleGain = Math.min(
          count,
          freshOwnedFragments,
          freshLevelCap - freshCurrentLevel
        );

        if (freshPossibleGain <= 0) {
          throw new Error(`${getCardName(freshCard)} cannot gain more levels right now.`);
        }

        const freshNextLevel = freshCurrentLevel + freshPossibleGain;
        const freshUpdatedCards = [...(fresh.cards || [])];

        if (!freshUpdatedCards[freshCardIndex]) {
          throw new Error("Card index changed. Please try again.");
        }

        const baseLeveledCard = {
          ...freshUpdatedCards[freshCardIndex],
          level: freshNextLevel,
          currentLevel: freshNextLevel,
          lvl: freshNextLevel,
          exp: freshNextLevel >= freshLevelCap ? 0 : Number(freshCard.exp || freshCard.xp || 0),
          xp: freshNextLevel >= freshLevelCap ? 0 : Number(freshCard.exp || freshCard.xp || 0),
        };

        freshUpdatedCards[freshCardIndex] = baseLeveledCard;

        const leveledCard = applyLevelStatsWithMergeSupport(
          {
            ...fresh,
            cards: freshUpdatedCards,
          },
          freshCardIndex,
          baseLeveledCard,
          freshPossibleGain
        );

        freshUpdatedCards[freshCardIndex] = leveledCard;

        freshFragments[freshFragmentIndex] = {
          ...freshFragments[freshFragmentIndex],
          amount: freshOwnedFragments - freshPossibleGain,
        };

        const freshUpdatedFragments = freshFragments.filter(
          (fragment) => Number(fragment.amount || 0) > 0
        );

        const freshUpdatedDailyState = incrementQuestCounter(
          fresh,
          "cardLevels",
          freshPossibleGain
        );

        finalCardName = getCardName(freshCard);
        finalStage = freshStage;
        finalCurrentLevel = freshCurrentLevel;
        finalNextLevel = freshNextLevel;
        finalFragmentsUsed = freshPossibleGain;
        finalFragmentsLeft = freshOwnedFragments - freshPossibleGain;
        finalLevelCap = freshLevelCap;

        return {
          ...fresh,
          cards: freshUpdatedCards,
          fragments: freshUpdatedFragments,
          quests: {
            ...(fresh.quests || {}),
            dailyState: freshUpdatedDailyState,
          },
        };
      },
      message.author.username
    );

    await flushPlayerNow(
      message.author.id,
      Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000)
    );

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("⬆️ Card Level Up")
      .setDescription(
        [
          `**Card:** ${finalCardName}`,
          `**Stage:** M${finalStage}`,
          `**Level:** ${finalCurrentLevel} → ${finalNextLevel}/${finalLevelCap}`,
          `**Fragments Used:** ${finalFragmentsUsed}`,
          `**Fragments Left:** ${finalFragmentsLeft}`,
          "",
          finalNextLevel >= finalLevelCap
            ? `🔒 Level cap reached for M${finalStage}. Awaken this card to continue.`
            : "Level up complete.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Level",
      });

    return confirmInteraction.update({
      embeds: [embed],
      components: [],
    });
  },
};