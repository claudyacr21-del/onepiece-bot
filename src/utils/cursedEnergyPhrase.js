const {
  updatePlayerAtomic,
} = require("../playerStore");

const {
  getItemEmoji,
} = require("../config/itemEmojis");

const PHRASE_ENABLED = true;
const PHRASE = "ryoiki tenkai";

const HALLOWEEN_START_AT =
  Date.parse(
    "2026-09-21T00:00:00+07:00"
  );

const HALLOWEEN_END_AT =
  Date.parse(
    "2026-10-21T00:00:00+07:00"
  );

function isHalloweenEventActive() {
  const now = Date.now();

  return (
    now >= HALLOWEEN_START_AT &&
    now < HALLOWEEN_END_AT
  );
}

const PHRASE_COOLDOWN_MS =
  15 * 60 * 1000;

const MIN_REWARD = 50;
const MAX_REWARD = 100;

const DEFAULT_MAIN_CHAT_ID =
  "1493177804337053716";

function normalizePhrase(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function getMainChatChannelIds() {
  return [
    DEFAULT_MAIN_CHAT_ID,
    process.env.MAIN_CHAT_CHANNEL_ID,
    process.env.MAIN_CHAT_CHANNEL_IDS,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isMainChat(message) {
  if (
    !message?.guild ||
    !message.channel?.id
  ) {
    return false;
  }

  return getMainChatChannelIds()
    .includes(
      String(message.channel.id)
    );
}

function randomInteger(min, max) {
  const low = Math.ceil(
    Number(min || 0)
  );

  const high = Math.floor(
    Number(max || low)
  );

  return Math.floor(
    Math.random() *
      (high - low + 1)
  ) + low;
}

function getRemainingText(ms) {
  const seconds = Math.max(
    1,
    Math.ceil(
      Number(ms || 0) / 1000
    )
  );

  const minutes = Math.floor(
    seconds / 60
  );

  const remainingSeconds =
    seconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }

  if (
    remainingSeconds <= 0
  ) {
    return `${minutes}m`;
  }

  return (
    `${minutes}m ` +
    `${remainingSeconds}s`
  );
}

async function handleCursedEnergyPhrase(
  message
) {
  if (
    !PHRASE_ENABLED ||
    !isHalloweenEventActive()
  ) {
    return false;
  }

  if (
    message.author?.bot ||
    !isMainChat(message)
  ) {
    return false;
  }

  const content =
    normalizePhrase(
      message.content
    );

  if (
    content !== PHRASE
  ) {
    return false;
  }

  const now = Date.now();
  let rewardAmount = 0;
  let remainingCooldown = 0;

  await updatePlayerAtomic(
    message.author.id,
    (fresh) => {
      const events = {
        ...(fresh.events || {}),
      };

      const halloweenState = {
        ...(events.halloween2026 || {}),
      };

      const lastPhraseAt =
        Number(
          halloweenState
            .lastPhraseAt || 0
        );

      const nextAvailableAt =
        lastPhraseAt +
        PHRASE_COOLDOWN_MS;

      if (
        lastPhraseAt > 0 &&
        now < nextAvailableAt
      ) {
        remainingCooldown =
          nextAvailableAt - now;

        return fresh;
      }

      rewardAmount =
        randomInteger(
          MIN_REWARD,
          MAX_REWARD
        );

      return {
        ...fresh,

        cursedEnergy:
          Math.max(
            0,
            Math.floor(
              Number(
                fresh.cursedEnergy ||
                0
              )
            )
          ) +
          rewardAmount,

        events: {
          ...events,

          halloween2026: {
            ...halloweenState,
            lastPhraseAt: now,
            lastPhraseReward:
              rewardAmount,
          },
        },
      };
    },
    message.author.username
  );

  if (
    remainingCooldown > 0
  ) {
    return message.reply({
      content:
        `Your cursed energy is still recovering. ` +
        `Try again in **${getRemainingText(
          remainingCooldown
        )}**.`,

      allowedMentions: {
        repliedUser: false,
      },
    }).then(() => true);
  }

  const emoji =
    getItemEmoji(
      "cursed_energy"
    ) || "🌀";

  return message.reply({
    content:
      `Ryoiki Tenkai! ` +
      `<@${message.author.id}> ` +
      `obtained **${rewardAmount}** ` +
      `${emoji} Cursed Energy!`,

    allowedMentions: {
      users: [
        message.author.id,
      ],

      repliedUser: false,
    },
  }).then(() => true);
}

module.exports = {
  handleCursedEnergyPhrase,
};