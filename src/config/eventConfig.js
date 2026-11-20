const EVENT_CONFIG = {
  enabled: false,

  key: "",
  name: "",
  title: "",
  description: "",

  startAt: null,
  endAt: null,

  color: 0xe67e22,

  command: {
    name: "event",
    aliases: [
      "ev",
    ],
  },

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

  calendar: {
    enabled: false,

    rewardDates: [],

    freeRewards: [],

    premiumRewards: [],
  },

  premium: {
    enabled: false,
    premiumPlusEnabled: false,
    emojiCode: "premium_box",
  },

  box: {
    enabled: false,
    code: "",
    name: "",
    emojiCode: "",
    price: 0,
    maxPurchase: 100,
  },

  content: {
    cardCode: "",
    weaponCode: "",
    fruitCode: "",
    raidTicketCode: "",
  },
};

function getEventStartAt(event = EVENT_CONFIG) {
  if (!event?.startAt) {
    return null;
  }

  const date =
    new Date(event.startAt);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function getEventEndAt(event = EVENT_CONFIG) {
  if (!event?.endAt) {
    return null;
  }

  const date =
    new Date(event.endAt);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function hasEventStarted(
  event = EVENT_CONFIG,
  now = new Date()
) {
  const startAt =
    getEventStartAt(event);

  if (!startAt) {
    return false;
  }

  return (
    now.getTime() >=
    startAt.getTime()
  );
}

function hasEventEnded(
  event = EVENT_CONFIG,
  now = new Date()
) {
  const endAt =
    getEventEndAt(event);

  if (!endAt) {
    return false;
  }

  return (
    now.getTime() >=
    endAt.getTime()
  );
}

function isEventActive(
  event = EVENT_CONFIG,
  now = new Date()
) {
  if (
    !event?.enabled ||
    !event?.key
  ) {
    return false;
  }

  if (
    !hasEventStarted(
      event,
      now
    )
  ) {
    return false;
  }

  if (
    hasEventEnded(
      event,
      now
    )
  ) {
    return false;
  }

  return true;
}

function getActiveEvent(now = new Date()) {
  if (
    !isEventActive(
      EVENT_CONFIG,
      now
    )
  ) {
    return null;
  }

  return EVENT_CONFIG;
}

module.exports = {
  EVENT_CONFIG,
  getEventStartAt,
  getEventEndAt,
  hasEventStarted,
  hasEventEnded,
  isEventActive,
  getActiveEvent,
};