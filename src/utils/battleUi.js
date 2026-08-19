function clamp(value, minimum, maximum) {
  return Math.max(
    minimum,
    Math.min(maximum, value)
  );
}

function formatNumber(value) {
  return Math.max(
    0,
    Math.floor(Number(value || 0))
  ).toLocaleString("en-US");
}

const HEALTH_BAR_EMOJIS = Object.freeze({
  green:
    "<a:hp_green:1539572112585396235>",

  yellow:
    "<a:hp_yellow:1539572109901307914>",

  red:
    "<a:hp_red:1539572107149705246>",

  empty:
    "<a:hp_empty:1539572104444383293>",
});

function renderBar(
  current,
  maximum,
  size = 8
) {
  const safeMaximum = Math.max(
    1,
    Number(maximum || 1)
  );

  const safeCurrent = clamp(
    Number(current || 0),
    0,
    safeMaximum
  );

  const safeSize = clamp(
    Math.floor(Number(size || 8)),
    5,
    12
  );

  const ratio =
    safeCurrent / safeMaximum;

  let filled = Math.round(
    ratio * safeSize
  );

  if (
    safeCurrent > 0 &&
    filled === 0
  ) {
    filled = 1;
  }

  filled = clamp(
    filled,
    0,
    safeSize
  );

  let filledEmoji =
    HEALTH_BAR_EMOJIS.green;

  if (ratio <= 0.3) {
    filledEmoji =
      HEALTH_BAR_EMOJIS.red;
  } else if (ratio <= 0.69) {
    filledEmoji =
      HEALTH_BAR_EMOJIS.yellow;
  }

  return (
    filledEmoji.repeat(filled) +
    HEALTH_BAR_EMOJIS.empty.repeat(
      safeSize - filled
    )
  );
}

function getHealthStatus(
  current,
  maximum
) {
  const safeMaximum = Math.max(
    1,
    Number(maximum || 1)
  );

  const safeCurrent = clamp(
    Number(current || 0),
    0,
    safeMaximum
  );

  const ratio =
    safeCurrent / safeMaximum;

  if (safeCurrent <= 0) {
    return {
      label: "DEFEATED",
      percentage: 0,
    };
  }

  if (ratio <= 0.3) {
    return {
      label: "CRITICAL",
      percentage:
        Math.round(ratio * 100),
    };
  }

  if (ratio <= 0.69) {
    return {
      label: "INJURED",
      percentage:
        Math.round(ratio * 100),
    };
  }

  return {
    label: "HEALTHY",
    percentage:
      Math.round(ratio * 100),
  };
}

function cleanName(value) {
  const name = String(
    value || "Unknown Unit"
  ).trim();

  if (name.length <= 42) {
    return name;
  }

  return `${name.slice(0, 39)}...`;
}

function renderUnitBlock(
  unit,
  index,
  options = {}
) {
  const currentHp = Math.max(
    0,
    Number(
      unit?.battleHp ??
        unit?.hp ??
        0
    )
  );

  const maximumHp = Math.max(
    1,
    Number(
      unit?.battleMaxHp ??
        unit?.maxHp ??
        unit?.hp ??
        1
    )
  );

  const attack = Math.max(
    0,
    Number(
      unit?.battleAtk ??
        unit?.atk ??
        0
    )
  );

  const speed = Math.max(
    0,
    Number(
      unit?.battleSpeed ??
        unit?.speed ??
        unit?.spd ??
        0
    )
  );

  const health = getHealthStatus(
    currentHp,
    maximumHp
  );

  const slot =
    options.slot ??
    unit?.slot ??
    index + 1;

  const skinLabel =
    unit?.hasCustomSkin
      ? " 🎨"
      : "";

  const hpResult =
    health.percentage > 0
      ? `${health.percentage}%`
      : health.label;

  const minimumAttack = Math.floor(
    attack * 0.85
  );

  const maximumAttack = Math.floor(
    attack * 1.15
  );

  return [
    `**${slot}\\. ${cleanName(
      unit?.name
    )}**${skinLabel}`,

    `ATK ${formatNumber(
      minimumAttack
    )}-${formatNumber(
      maximumAttack
    )} • SPD ${formatNumber(
      speed
    )}`,

    `HP ${formatNumber(
      currentHp
    )}/${formatNumber(
      maximumHp
    )} • ${hpResult}`,

    renderBar(
      currentHp,
      maximumHp,
      options.barSize || 8
    ),
  ].join("\n");
}

function renderTeamBlock(
  units,
  options = {}
) {
  const list = Array.isArray(units)
    ? units
    : [];

  if (!list.length) {
    return "No units available.";
  }

  return list
    .map((unit, index) =>
      renderUnitBlock(
        unit,
        index,
        options
      )
    )
    .join("\n\n");
}

module.exports = {
  renderBar,
  getHealthStatus,
  renderUnitBlock,
  renderTeamBlock,
};