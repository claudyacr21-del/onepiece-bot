const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
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
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
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
      return message.reply({
        content: [
          `This command is only for **${PREMIUM_ROLE_NAME}** or **${LITE_PREMIUM_ROLE_NAME}** users.`,
          "Use `op patreon` to view premium packages.",
          "",
          "After payment, please open a ticket and send your order proof + payment proof.",
        ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    const questNumber = Math.floor(Number(args[0] || 0));

    if (!questNumber || questNumber < 1) {
      return message.reply({
        content: "Usage: `op iq <quest#>`\nExample: `op iq 1`",
        allowedMentions: { repliedUser: false },
      });
    }

    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const previewDailyState = ensureDailyQuestState(previewPlayer);
    const previewQuests = Array.isArray(previewDailyState.quests)
      ? previewDailyState.quests
      : [];

    if (!previewQuests.length) {
      return message.reply({
        content: "No daily quest is available right now.\nUse `op quest` first.",
        allowedMentions: { repliedUser: false },
      });
    }

    if (questNumber > previewQuests.length) {
      return message.reply({
        content: `Invalid quest number.\nChoose between **1-${previewQuests.length}**.`,
        allowedMentions: { repliedUser: false },
      });
    }

    let selectedQuest = previewQuests[questNumber - 1];
    let updatedDailyState = null;
    let updatedInstantQuestState = null;
    let summary = null;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const dailyState = ensureDailyQuestState(fresh);
          const quests = Array.isArray(dailyState.quests) ? dailyState.quests : [];

          if (!quests.length) {
            throw new Error("No daily quest is available right now.\nUse `op quest` first.");
          }

          if (questNumber > quests.length) {
            throw new Error(`Invalid quest number.\nChoose between **1-${quests.length}**.`);
          }

          const instantQuestState = getInstantQuestState(fresh);

          if (instantQuestState.used >= maxInstantQuestPerDay) {
            throw new Error(
              `You already used **${maxInstantQuestPerDay}/${maxInstantQuestPerDay}** Instant Quest today.`
            );
          }

          selectedQuest = quests[questNumber - 1];

          if (!selectedQuest) {
            throw new Error("Quest not found.");
          }

          if (isQuestDone(dailyState, selectedQuest)) {
            throw new Error(`Quest **#${questNumber}** is already completed.`);
          }

          updatedDailyState = {
            ...dailyState,
            progress: {
              ...(dailyState.progress || {}),
              [selectedQuest.key]: Number(selectedQuest.target || 0),
            },
          };

          summary = getQuestCompletionSummary(updatedDailyState);

          updatedInstantQuestState = {
            ...instantQuestState,
            used: instantQuestState.used + 1,
            completedQuestIds: [
              ...new Set([
                ...(instantQuestState.completedQuestIds || []),
                selectedQuest.id,
              ]),
            ],
          };

          return {
            ...fresh,
            quests: {
              ...(fresh.quests || {}),
              dailyState: updatedDailyState,
              instantQuest: updatedInstantQuestState,
              daily: {
                ...(fresh?.quests?.daily || {}),
                total: summary.total,
                completed: summary.completed,
                left: summary.left,
                lastSyncedAt: Date.now(),
              },
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to complete instant quest.",
        allowedMentions: { repliedUser: false },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("⚡ Instant Quest Complete")
      .setDescription(
        [
          `**Completed Quest:** #${questNumber} • ${selectedQuest.title || "Quest"}`,
          `**Progress:** ${Number(selectedQuest.target || 0)}/${Number(selectedQuest.target || 0)}`,
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
      allowedMentions: { repliedUser: false },
    });
  },
};