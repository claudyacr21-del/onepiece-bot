const MOTHER_FLAME_BADGE = process.env.MOTHER_FLAME_BADGE_EMOJI || "🔥";

const RAID_PRESTIGE_BADGE_EMOJIS = {
  // imu: "<:imu:123456789012345678>",
  // luffy_straw_hat: "<:luffy:123456789012345678>",
  // zoro_east_blue: "<:zoro:123456789012345678>",
};

function getRaidPrestigeBadgeEmoji(card) {
  const code = String(card?.code || "").trim();
  if (!code) return null;

  return RAID_PRESTIGE_BADGE_EMOJIS[code] || null;
}

module.exports = {
  MOTHER_FLAME_BADGE,
  RAID_PRESTIGE_BADGE_EMOJIS,
  getRaidPrestigeBadgeEmoji,
};