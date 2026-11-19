const {
  getActiveEvent,
} = require("../config/eventConfig");

function getEventData(player, eventKey) {
  if (
    !player ||
    !eventKey
  ) {
    return null;
  }

  return (
    player.events?.[eventKey] ||
    null
  );
}

function ensureEventData(player, eventKey) {
  if (
    !player ||
    !eventKey
  ) {
    return null;
  }

  if (
    !player.events ||
    typeof player.events !== "object" ||
    Array.isArray(player.events)
  ) {
    player.events = {};
  }

  if (
    !player.events[eventKey] ||
    typeof player.events[eventKey] !== "object" ||
    Array.isArray(player.events[eventKey])
  ) {
    player.events[eventKey] = {};
  }

  const eventData =
    player.events[eventKey];

  if (
    !eventData.currency ||
    typeof eventData.currency !== "object" ||
    Array.isArray(eventData.currency)
  ) {
    eventData.currency = {
      amount: 0,
    };
  }

  eventData.currency.amount =
    Math.max(
      0,
      Number(
        eventData.currency.amount || 0
      )
    );

  return eventData;
}

function getEventCurrencyAmount(
  player,
  event = getActiveEvent()
) {
  if (
    !player ||
    !event?.key
  ) {
    return 0;
  }

  const eventData =
    getEventData(
      player,
      event.key
    );

  return Math.max(
    0,
    Number(
      eventData?.currency?.amount || 0
    )
  );
}

function setEventCurrencyAmount(
  player,
  amount,
  event = getActiveEvent()
) {
  if (
    !player ||
    !event?.key
  ) {
    return 0;
  }

  const eventData =
    ensureEventData(
      player,
      event.key
    );

  if (!eventData) {
    return 0;
  }

  eventData.currency.amount =
    Math.max(
      0,
      Number(amount || 0)
    );

  return eventData.currency.amount;
}

function addEventCurrency(
  player,
  amount,
  event = getActiveEvent()
) {
  if (
    !player ||
    !event?.key
  ) {
    return 0;
  }

  const currentAmount =
    getEventCurrencyAmount(
      player,
      event
    );

  return setEventCurrencyAmount(
    player,
    currentAmount +
      Number(amount || 0),
    event
  );
}

function spendEventCurrency(
  player,
  amount,
  event = getActiveEvent()
) {
  const cost = Math.max(
    0,
    Number(amount || 0)
  );

  if (
    !player ||
    !event?.key ||
    cost <= 0
  ) {
    return false;
  }

  const currentAmount =
    getEventCurrencyAmount(
      player,
      event
    );

  if (currentAmount < cost) {
    return false;
  }

  setEventCurrencyAmount(
    player,
    currentAmount - cost,
    event
  );

  return true;
}

module.exports = {
  getEventData,
  ensureEventData,
  getEventCurrencyAmount,
  setEventCurrencyAmount,
  addEventCurrency,
  spendEventCurrency,
};