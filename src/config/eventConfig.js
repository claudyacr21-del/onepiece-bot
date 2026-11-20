const EVENT_CONFIG = {
  enabled: false,

  key: "",
  name: "",

  startAt: null,
  endAt: null,

  currency: {
    code: "",
    name: "",
    emojiCode: "",
    pullReward: 2,
  },

  phrase: {
    enabled: false,
    text: "",
    cooldownMinutes: 15,
    minReward: 50,
    maxReward: 100,

    channelIds: [
      "1493177804337053716",
    ],

    successText: "",
  },
};

function getActiveEvent(now = new Date()) {
  if (!EVENT_CONFIG.enabled) {
    return null;
  }

  const startAt = EVENT_CONFIG.startAt
    ? new Date(EVENT_CONFIG.startAt)
    : null;

  const endAt = EVENT_CONFIG.endAt
    ? new Date(EVENT_CONFIG.endAt)
    : null;

  if (
    startAt &&
    now.getTime() < startAt.getTime()
  ) {
    return null;
  }

  if (
    endAt &&
    now.getTime() >= endAt.getTime()
  ) {
    return null;
  }

  return EVENT_CONFIG;
}

module.exports = {
  EVENT_CONFIG,
  getActiveEvent,
};