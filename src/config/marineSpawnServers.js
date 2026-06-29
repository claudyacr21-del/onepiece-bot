const ENABLED_MARINE_SPAWN_GUILDS = [
  // Main/support server
 "1492756165510041780",

  // Add paid server IDs here later:
 "1482746203514077286",
 "1514997836524290089"
];

function getEnvGuildIds() {
  return String(process.env.MARINE_SPAWN_GUILD_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function getEnabledMarineSpawnGuildIds() {
  return [
    ...new Set([
      ...ENABLED_MARINE_SPAWN_GUILDS.map(String).filter(Boolean),
      ...getEnvGuildIds(),
    ]),
  ];
}

function isMarineSpawnGuildEnabled(guildId) {
  const enabled = getEnabledMarineSpawnGuildIds();

  if (!enabled.length) return false;

  return enabled.includes(String(guildId));
}

module.exports = {
  ENABLED_MARINE_SPAWN_GUILDS,
  getEnabledMarineSpawnGuildIds,
  isMarineSpawnGuildEnabled,
};