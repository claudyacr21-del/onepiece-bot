const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const {
  ensureDailyQuestState,
  getQuestProgress,
  isQuestDone,
  getQuestCompletionSummary,
} = require("../utils/questProgress");
const {
  PREMIUM_ROLE_NAME,
  LITE_PREMIUM_ROLE_NAME,
  getPremiumTier,
} = require("../utils/premiumAccess");

const MOTHER_FLAME_MAX_INSTANT_QUEST_PER_DAY = 2;
const VIVRE_CARD_MAX_INSTANT_QUEST_PER_DAY = 1;

function getTodayKey() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function getMaxInstantQuestPerDay(tier) {
  if (tier === "motherFlame") return MOTHER_FLAME_MAX_INSTANT_QUEST_PER_DAY;
  if (tier === "vivreCard") return VIVRE_CARD_MAX_INSTANT_QUEST_PER_DAY;
  return 0;
}

function getInstantQuestState(player) {
  const todayKey = getTodayKey();
  const current = player?.quests?.instantQuest || {};

  if (current.dayKey !== todayKey) {
    return {
      dayKey: todayKey,
      used: 0,
      completedQuestIds: [],
    };
  }

  return {
    dayKey: todayKey,
    used: Math.max(0, Number(current.used || 0)),
    completedQuestIds: Array.isArray(current.completedQuestIds)
      ? current.completedQuestIds
      : [],
  };
}

function buildQuestList(dailyState) {
  return (dailyState.quests || [])
    .map((quest, index) => {
      const progress = getQuestProgress(dailyState, quest);
      const done = isQuestDone(dailyState, quest);
      const status = done ? "✅" : "⬜";

      return `${status} **${index + 1}. ${quest.title || "Quest"}** • ${progress}/${quest.target}`;
    })
    .join("\n");
}

module.exports = {
  name: "instantquest",
  aliases: ["iq"],

  async execute(message, args) {
    const premiumTier = await getPremiumTier(message);
    const maxInstantQuestPerDay = getMaxInstantQuestPerDay(premiumTier);

    if (!maxInstantQuestPerDay) {
      return message.reply(
        [
          `This command is only for **${PREMIUM_ROLE_NAME}** or **${LITE_PREMIUM_ROLE_NAME}** users.`,
          "Use `op patreon` to view premium packages.",
          "",
          "After payment, please open a ticket and send your order proof + payment proof.",
        ].join("\n")
      );
    }

    const questNumber = Math.floor(Number(args[0] || 0));

    if (!questNumber || questNumber < 1) {
      return message.reply("Usage: `op iq <quest number>`\nExample: `op iq 1`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const dailyState = ensureDailyQuestState(player);
    const quests = Array.isArray(dailyState.quests) ? dailyState.quests : [];

    if (!quests.length) {
      return message.reply("No daily quest is available right now.\nUse `op quest` first.");
    }

    if (questNumber > quests.length) {
      return message.reply(`Invalid quest number.\nChoose between **1-${quests.length}**.`);
    }

    const instantQuestState = getInstantQuestState(player);

    if (instantQuestState.used >= maxInstantQuestPerDay) {
      return message.reply(
        `You already used **${maxInstantQuestPerDay}/${maxInstantQuestPerDay}** Instant Quest today.`
      );
    }

    const selectedQuest = quests[questNumber - 1];

    if (!selectedQuest) {
      return message.reply("Quest not found.");
    }

    if (isQuestDone(dailyState, selectedQuest)) {
      return message.reply(`Quest **#${questNumber}** is already completed.`);
    }

    const updatedDailyState = {
      ...dailyState,
      progress: {
        ...(dailyState.progress || {}),
        [selectedQuest.key]: Number(selectedQuest.target || 0),
      },
    };

    const summary = getQuestCompletionSummary(updatedDailyState);

    const updatedInstantQuestState = {
      ...instantQuestState,
      used: instantQuestState.used + 1,
      completedQuestIds: [
        ...new Set([
          ...(instantQuestState.completedQuestIds || []),
          selectedQuest.id,
        ]),
      ],
    };

    updatePlayer(message.author.id, {
      quests: {
        ...(player.quests || {}),
        dailyState: updatedDailyState,
        instantQuest: updatedInstantQuestState,
        daily: {
          ...(player?.quests?.daily || {}),
          total: summary.total,
          completed: summary.completed,
          left: summary.left,
          lastSyncedAt: Date.now(),
        },
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("⚡ Instant Quest Complete")
      .setDescription(
        [
          `**Completed Quest:** #${questNumber} • ${selectedQuest.title || "Quest"}`,
          `**Progress:** ${Number(selectedQuest.target || 0)}/${Number(
            selectedQuest.target || 0
          )}`,
          "",
          `**Instant Quest Used:** ${updatedInstantQuestState.used}/${maxInstantQuestPerDay}`,
          `**Quest Left:** ${summary.left}/${summary.total}`,
          "",
          "## Current Daily Quest Board",
          buildQuestList(updatedDailyState),
        ].join("\n")
      )
      .setFooter({
        text:
          premiumTier === "motherFlame"
            ? "One Piece Bot • Mother Flame Instant Quest"
            : "One Piece Bot • Vivre Card Instant Quest",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};