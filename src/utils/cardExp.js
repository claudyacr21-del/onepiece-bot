const LEVEL_CAPS_BY_STAGE = {
  1: 50,
  2: 85,
  3: 100,
};

const FLAT_EXP_CAP = 1000;

function getCardStage(card) {
  return Math.max(1, Math.min(3, Number(card?.evolutionStage || 1)));
}

function getCardLevelCap(card) {
  return LEVEL_CAPS_BY_STAGE[getCardStage(card)] || 50;
}

function getCardExp(card) {
  return Math.max(0, Number(card?.exp ?? card?.xp ?? 0));
}

function getExpToNextLevel() {
  return FLAT_EXP_CAP;
}

function isCardLevelLocked(card) {
  const level = Number(card?.level || 1);
  return level >= getCardLevelCap(card);
}

function getCardExpProgress(card) {
  const level = Math.max(1, Number(card?.level || 1));
  const cap = getCardLevelCap(card);
  const exp = Math.max(0, Math.min(FLAT_EXP_CAP, getCardExp(card)));
  const locked = level >= cap;

  return {
    level,
    cap,
    exp: locked ? 0 : exp,
    needed: FLAT_EXP_CAP,
    locked,
  };
}

function formatCardExp(card) {
  const progress = getCardExpProgress(card);
  return `${progress.exp}/${FLAT_EXP_CAP}`;
}

function formatCardLevelLine(card) {
  const progress = getCardExpProgress(card);
  return `Level: ${progress.level} (${progress.exp}/${FLAT_EXP_CAP})`;
}

function formatCardExpLine(card) {
  const progress = getCardExpProgress(card);
  return `EXP: ${progress.exp}/${FLAT_EXP_CAP}`;
}

function applyExpToCard(card, gainedExp) {
  const cap = getCardLevelCap(card);

  let level = Math.max(1, Number(card?.level || 1));
  let exp = getCardExp(card);
  const gain = Math.max(0, Number(gainedExp || 0));
  let leveledUp = 0;

  if (level >= cap) {
    return {
      ...card,
      level: cap,
      exp: 0,
      xp: 0,
      leveledUp: 0,
      expAdded: 0,
      expBlocked: gain,
      levelLocked: true,
    };
  }

  exp += gain;

  while (level < cap && exp >= FLAT_EXP_CAP) {
    exp -= FLAT_EXP_CAP;
    level += 1;
    leveledUp += 1;
  }

  if (level >= cap) {
    level = cap;
    exp = 0;
  }

  return {
    ...card,
    level,
    exp,
    xp: exp,
    leveledUp,
    expAdded: gain,
    expBlocked: 0,
    levelLocked: level >= cap,
  };
}

module.exports = {
  LEVEL_CAPS_BY_STAGE,
  FLAT_EXP_CAP,
  getCardStage,
  getCardLevelCap,
  getCardExp,
  getExpToNextLevel,
  isCardLevelLocked,
  getCardExpProgress,
  formatCardExp,
  formatCardLevelLine,
  formatCardExpLine,
  applyExpToCard,
};