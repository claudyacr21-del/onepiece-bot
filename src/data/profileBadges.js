const PROFILE_BADGES = {
  motherFlame: process.env.MOTHER_FLAME_BADGE_EMOJI || "<:motherflame:1502256240267497522>",
  serverBooster: process.env.SERVER_BOOSTER_BADGE_EMOJI || "<:serverbooster:1502256202330148924>",
};

const RAID_PRESTIGE_BADGE_EMOJIS = {
  // imu: "<:imu:123456789012345678>",
  // luffy: "<:luffy:123456789012345678>",
  // zoro: "<:zoro:123456789012345678>",
};

function getRaidPrestigeBadgeEmoji(card) {
  const code = String(card?.code || "").trim();
  if (!code) return null;

  return RAID_PRESTIGE_BADGE_EMOJIS[code] || null;
}

module.exports = {
  PROFILE_BADGES,
  RAID_PRESTIGE_BADGE_EMOJIS,
  getRaidPrestigeBadgeEmoji,
};