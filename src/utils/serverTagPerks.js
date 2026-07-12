const DEFAULT_PERKS = Object.freeze({
  extraPullLimit: 3,
  bossCooldownReductionMs: 2 * 60 * 1000,
  fightCooldownReductionMs: 1 * 60 * 1000,
  shopDiscountPercent: 5,
  gemIncomeBonusPercent: 5,
  berryIncomeBonusPercent: 5,
  dailyResetTokenBonus: 1,
});

function getSafeNumberEnv(name, fallback, options = {}) {
  const parsed = Number(process.env[name]);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const minimum = Number.isFinite(options.minimum)
    ? options.minimum
    : -Infinity;

  const maximum = Number.isFinite(options.maximum)
    ? options.maximum
    : Infinity;

  return Math.min(maximum, Math.max(minimum, parsed));
}

function getServerTagGuildId() {
  return String(process.env.SERVER_TAG_GUILD_ID || "").trim();
}

function getPrimaryGuild(user) {
  return user?.primaryGuild || user?.primary_guild || null;
}

function getPrimaryGuildIdentityGuildId(primaryGuild) {
  return String(
    primaryGuild?.identityGuildId ||
      primaryGuild?.identity_guild_id ||
      ""
  ).trim();
}

function isPrimaryGuildIdentityEnabled(primaryGuild) {
  return (
    primaryGuild?.identityEnabled === true ||
    primaryGuild?.identity_enabled === true
  );
}

function hasServerTagPerk(user) {
  const requiredGuildId = getServerTagGuildId();

  if (!requiredGuildId || !user) {
    return false;
  }

  const primaryGuild = getPrimaryGuild(user);

  if (!primaryGuild) {
    return false;
  }

  if (!isPrimaryGuildIdentityEnabled(primaryGuild)) {
    return false;
  }

  const identityGuildId =
    getPrimaryGuildIdentityGuildId(primaryGuild);

  return identityGuildId === requiredGuildId;
}

function hasServerTagPerkFromMessage(message) {
  return hasServerTagPerk(message?.author);
}

function getServerTagPerks(user) {
  const active = hasServerTagPerk(user);

  return {
    active,

    extraPullLimit: active
      ? Math.floor(
          getSafeNumberEnv(
            "SERVER_TAG_EXTRA_PULL_LIMIT",
            DEFAULT_PERKS.extraPullLimit,
            {
              minimum: 0,
              maximum: 100,
            }
          )
        )
      : 0,

    bossCooldownReductionMs: active
      ? Math.floor(
          getSafeNumberEnv(
            "SERVER_TAG_BOSS_COOLDOWN_REDUCTION_MS",
            DEFAULT_PERKS.bossCooldownReductionMs,
            {
              minimum: 0,
            }
          )
        )
      : 0,

    fightCooldownReductionMs: active
      ? Math.floor(
          getSafeNumberEnv(
            "SERVER_TAG_FIGHT_COOLDOWN_REDUCTION_MS",
            DEFAULT_PERKS.fightCooldownReductionMs,
            {
              minimum: 0,
            }
          )
        )
      : 0,

    shopDiscountPercent: active
      ? getSafeNumberEnv(
          "SERVER_TAG_SHOP_DISCOUNT_PERCENT",
          DEFAULT_PERKS.shopDiscountPercent,
          {
            minimum: 0,
            maximum: 100,
          }
        )
      : 0,

    gemIncomeBonusPercent: active
      ? getSafeNumberEnv(
          "SERVER_TAG_GEM_BONUS_PERCENT",
          DEFAULT_PERKS.gemIncomeBonusPercent,
          {
            minimum: 0,
            maximum: 100,
          }
        )
      : 0,

    berryIncomeBonusPercent: active
      ? getSafeNumberEnv(
          "SERVER_TAG_BERRY_BONUS_PERCENT",
          DEFAULT_PERKS.berryIncomeBonusPercent,
          {
            minimum: 0,
            maximum: 100,
          }
        )
      : 0,

    dailyResetTokenBonus: active
      ? Math.floor(
          getSafeNumberEnv(
            "SERVER_TAG_DAILY_RESET_TOKEN_BONUS",
            DEFAULT_PERKS.dailyResetTokenBonus,
            {
              minimum: 0,
              maximum: 100,
            }
          )
        )
      : 0,
  };
}

function getServerTagPerksFromMessage(message) {
  return getServerTagPerks(message?.author);
}

function applyPercentageBonus(amount, percent) {
  const safeAmount = Number(amount || 0);
  const safePercent = Math.max(0, Number(percent || 0));

  if (!Number.isFinite(safeAmount)) {
    return 0;
  }

  const bonus = Math.floor(
    safeAmount * (safePercent / 100)
  );

  return {
    baseAmount: safeAmount,
    bonusAmount: bonus,
    totalAmount: safeAmount + bonus,
  };
}

function applyDiscount(price, percent) {
  const safePrice = Math.max(0, Number(price || 0));
  const safePercent = Math.min(
    100,
    Math.max(0, Number(percent || 0))
  );

  const discountAmount = Math.floor(
    safePrice * (safePercent / 100)
  );

  return {
    originalPrice: safePrice,
    discountAmount,
    finalPrice: Math.max(0, safePrice - discountAmount),
  };
}

function applyServerTagCurrencyBonus(reward = {}, perks = {}) {
  const baseBerries = Math.max(
    0,
    Math.floor(Number(reward.berries || 0))
  );

  const baseGems = Math.max(
    0,
    Math.floor(Number(reward.gems || 0))
  );

  const berryBonusPercent = Math.max(
    0,
    Number(perks.berryIncomeBonusPercent || 0)
  );

  const gemBonusPercent = Math.max(
    0,
    Number(perks.gemIncomeBonusPercent || 0)
  );

  const serverTagBonusBerries = perks.active
    ? Math.floor(baseBerries * (berryBonusPercent / 100))
    : 0;

  const serverTagBonusGems = perks.active
    ? Math.floor(baseGems * (gemBonusPercent / 100))
    : 0;

  return {
    ...reward,

    serverTagPerks: {
      active: Boolean(perks.active),
      berryBonusPercent,
      gemBonusPercent,
      bonusBerries: serverTagBonusBerries,
      bonusGems: serverTagBonusGems,
    },

    totalBerries:
      Math.max(
        0,
        Math.floor(
          Number(
            reward.totalBerries ??
              baseBerries +
                Number(
                  reward?.pirateBoosts?.bonusBerries || 0
                )
          )
        )
      ) + serverTagBonusBerries,

    totalGems:
      Math.max(
        0,
        Math.floor(
          Number(
            reward.totalGems ??
              baseGems +
                Number(
                  reward?.pirateBoosts?.bonusGems || 0
                )
          )
        )
      ) + serverTagBonusGems,
  };
}

module.exports = {
  DEFAULT_PERKS,
  getServerTagGuildId,
  hasServerTagPerk,
  hasServerTagPerkFromMessage,
  getServerTagPerks,
  getServerTagPerksFromMessage,
  applyPercentageBonus,
  applyDiscount,
  applyServerTagCurrencyBonus,
};