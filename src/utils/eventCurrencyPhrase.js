const {
  updatePlayerAtomic,
} = require("../playerStore");

const {
  getItemEmoji,
} = require("../config/itemEmojis");

const {
  getActiveEvent,
} = require("../config/eventConfig");

function normalizePhrase(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function getPhraseChannelIds(event) {
  const configuredChannelIds =
    Array.isArray(
      event?.phrase?.channelIds
    )
      ? event.phrase.channelIds
      : [];

  return [
    ...configuredChannelIds,
    process.env.MAIN_CHAT_CHANNEL_ID,
    process.env.MAIN_CHAT_CHANNEL_IDS,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((id) =>
      String(id || "").trim()
    )
    .filter(Boolean);
}

function isAllowedPhraseChannel(
  message,
  event
) {
  if (
    !message?.guild ||
    !message.channel?.id
  ) {
    return false;
  }

  const channelIds =
    getPhraseChannelIds(event);

  if (channelIds.length <= 0) {
    return false;
  }

  return channelIds.includes(
    String(message.channel.id)
  );
}

function randomInteger(min, max) {
  const low = Math.ceil(
    Number(min || 0)
  );

  const high = Math.max(
    low,
    Math.floor(
      Number(max || low)
    )
  );

  return (
    Math.floor(
      Math.random() *
        (high - low + 1)
    ) + low
  );
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

  if (remainingSeconds <= 0) {
    return `${minutes}m`;
  }

  return (
    `${minutes}m ` +
    `${remainingSeconds}s`
  );
}

function getSuccessText(event) {
  const configuredText =
    String(
      event?.phrase?.successText ||
      ""
    ).trim();

  if (configuredText) {
    return configuredText;
  }

  return String(
    event?.phrase?.text ||
    "Event phrase"
  ).trim();
}

async function handleEventCurrencyPhrase(
  message
) {
  const activeEvent =
    getActiveEvent();

  if (
    !activeEvent ||
    activeEvent.phrase?.enabled !==
      true
  ) {
    return false;
  }

  if (
    message.author?.bot ||
    !isAllowedPhraseChannel(
      message,
      activeEvent
    )
  ) {
    return false;
  }

  const requiredPhrase =
    normalizePhrase(
      activeEvent.phrase?.text
    );

  if (!requiredPhrase) {
    return false;
  }

  const content =
    normalizePhrase(
      message.content
    );

  if (content !== requiredPhrase) {
    return false;
  }

  const eventKey =
    String(
      activeEvent.key || ""
    ).trim();

  if (!eventKey) {
    return false;
  }

  const cooldownMs =
    Math.max(
      0,
      Number(
        activeEvent.phrase
          ?.cooldownMinutes || 0
      )
    ) *
    60 *
    1000;

  const minReward =
    Math.max(
      0,
      Math.floor(
        Number(
          activeEvent.phrase
            ?.minReward || 0
        )
      )
    );

  const maxReward =
    Math.max(
      minReward,
      Math.floor(
        Number(
          activeEvent.phrase
            ?.maxReward ||
            minReward
        )
      )
    );

  const now = Date.now();

  let rewardAmount = 0;
  let remainingCooldown = 0;

  await updatePlayerAtomic(
    message.author.id,
    (fresh) => {
      const existing =
        fresh &&
        typeof fresh === "object"
          ? fresh
          : {};

      const existingEvents =
        existing.events &&
        typeof existing.events ===
          "object" &&
        !Array.isArray(
          existing.events
        )
          ? existing.events
          : {};

      const existingEvent =
        existingEvents[eventKey] &&
        typeof existingEvents[
          eventKey
        ] === "object" &&
        !Array.isArray(
          existingEvents[eventKey]
        )
          ? existingEvents[eventKey]
          : {};

      const existingCurrency =
        existingEvent.currency &&
        typeof existingEvent
          .currency === "object" &&
        !Array.isArray(
          existingEvent.currency
        )
          ? existingEvent.currency
          : {};

      const lastPhraseAt =
        Math.max(
          0,
          Number(
            existingCurrency
              .lastPhraseAt || 0
          )
        );

      const nextAvailableAt =
        lastPhraseAt +
        cooldownMs;

      if (
        cooldownMs > 0 &&
        lastPhraseAt > 0 &&
        now < nextAvailableAt
      ) {
        remainingCooldown =
          nextAvailableAt - now;

        return existing;
      }

      rewardAmount =
        randomInteger(
          minReward,
          maxReward
        );

      return {
        ...existing,

        events: {
          ...existingEvents,

          [eventKey]: {
            ...existingEvent,

            currency: {
              ...existingCurrency,

              amount:
                Math.max(
                  0,
                  Number(
                    existingCurrency
                      .amount || 0
                  )
                ) +
                rewardAmount,

              lastPhraseAt: now,

              lastPhraseReward:
                rewardAmount,
            },
          },
        },
      };
    },
    message.author.username
  );

  const currencyName =
    String(
      activeEvent.currency?.name ||
      "Event Currency"
    ).trim();

  if (remainingCooldown > 0) {
    return message
      .reply({
        content:
          `Your ${currencyName} is still recovering. ` +
          `Try again in **${getRemainingText(
            remainingCooldown
          )}**.`,

        allowedMentions: {
          repliedUser: false,
        },
      })
      .then(() => true);
  }

  const currencyEmoji =
    getItemEmoji(
      activeEvent.currency
        ?.emojiCode ||
        activeEvent.currency
          ?.code
    );

  return message
    .reply({
      content:
        `${getSuccessText(
          activeEvent
        )}! ` +
        `<@${message.author.id}> ` +
        `obtained **${rewardAmount}** ` +
        `${currencyEmoji ? `${currencyEmoji} ` : ""}` +
        `${currencyName}!`,

      allowedMentions: {
        users: [
          message.author.id,
        ],

        repliedUser: false,
      },
    })
    .then(() => true);
}

module.exports = {
  handleEventCurrencyPhrase,
};