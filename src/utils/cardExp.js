const LEVEL_CAPS_BY_STAGE = {
  1: 50,
  2: 85,
  3: 100,
};

function getCardStage(card) {
  return Math.max(1, Math.min(3, Number(card?.evolutionStage || 1)));
}

function getCardLevelCap(card) {
  return LEVEL_CAPS_BY_STAGE[getCardStage(card)] || 50;
}

function getCardExp(card) {
  return Number(card?.exp ?? card?.xp ?? 0);
}

function getExpToNextLevel(level) {
  const safeLevel = Math.max(1, Math.min(100, Number(level || 1)));
  return 100 + (safeLevel - 1) * 50;
}

function isCardLevelLocked(card) {
  const level = Number(card?.level || 1);
  return level >= getCardLevelCap(card);
}

function getCardExpProgress(card) {
  const level = Number(card?.level || 1);
  const cap = getCardLevelCap(card);
  const exp = getCardExp(card);
  const locked = level >= cap;
  const needed = locked ? 0 : getExpToNextLevel(level);

  return {
    level,
    cap,
    exp: locked ? 0 : exp,
    needed,
    locked,
  };
}

function formatCardExp(card) {
  const progress = getCardExpProgress(card);

  if (progress.locked) {
    if (progress.cap >= 100) {
      return `MAX • Level ${progress.level}/${progress.cap}`;
    }

    return `LOCKED • Level ${progress.level}/${progress.cap} • Awaken to continue`;
  }

  return `${progress.exp}/${progress.needed}`;
}

function formatCardLevelLine(card) {
  const progress = getCardExpProgress(card);
  return `Level: ${progress.level}/${progress.cap}`;
}

function formatCardExpLine(card) {
  return `EXP: ${formatCardExp(card)}`;
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

  while (level < cap) {
    const needed = getExpToNextLevel(level);

    if (exp < needed) break;

    exp -= needed;
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