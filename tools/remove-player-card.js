const {
  initPlayerStore,
  readPlayers,
  writePlayers,
  flushPlayerStoreNow,
} = require("../src/playerStore");

const playerId = String(process.argv[2] || "").trim();
const query = String(process.argv.slice(3).join(" ") || "").trim().toLowerCase();
const apply = process.argv.includes("--apply");

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesItem(item, q) {
  const haystack = [
    item?.name,
    item?.displayName,
    item?.cardName,
    item?.code,
    item?.baseCode,
    item?.id,
    item?.slug,
    item?.title,
  ]
    .map(norm)
    .join(" ");

  const needle = norm(q);
  return needle && haystack.includes(needle);
}

function stageOf(card) {
  return card?.evolutionKey || card?.form || card?.stage || `M${card?.evolutionStage || 1}`;
}

function removeMatchingArray(player, key, q) {
  if (!Array.isArray(player[key])) return { before: 0, after: 0, removed: [] };

  const before = player[key].length;
  const removed = player[key].filter((item) => matchesItem(item, q));
  player[key] = player[key].filter((item) => !matchesItem(item, q));

  return {
    before,
    after: player[key].length,
    removed,
  };
}

async function main() {
  if (!playerId || !query) {
    console.log("Usage:");
    console.log("  node tools/remove-player-card.js <DISCORD_USER_ID> <CARD_NAME>");
    console.log("  node tools/remove-player-card.js <DISCORD_USER_ID> <CARD_NAME> --apply");
    process.exit(1);
  }

  await initPlayerStore();

  const players = readPlayers();
  const player = players[playerId];

  if (!player) {
    console.log(`Player not found: ${playerId}`);
    process.exit(1);
  }

  const keysToClean = [
    "cards",
    "boostCards",
    "ownedCards",
    "inventory",
    "fragments",
    "materials",
    "items",
  ];

  const report = [];

  for (const key of keysToClean) {
    if (!Array.isArray(player[key])) continue;

    const found = player[key].filter((item) => matchesItem(item, query));

    if (found.length) {
      report.push({
        key,
        count: found.length,
        items: found.map((item, index) => ({
          index,
          name: item?.displayName || item?.name || item?.cardName || item?.code || item?.id,
          code: item?.code || item?.baseCode || item?.id,
          role: item?.cardRole || item?.role || item?.type,
          stage: stageOf(item),
          amount: item?.amount,
          instanceId: item?.instanceId || item?.uid || item?.uniqueId,
        })),
      });
    }
  }

  console.log("Player:", player.username || playerId);
  console.log("Search:", query);
  console.log("Apply:", apply ? "YES" : "NO / DRY RUN");
  console.log(JSON.stringify(report, null, 2));

  if (!apply) {
    console.log("\nDry run only. Add --apply to actually remove these records.");
    process.exit(0);
  }

  for (const key of keysToClean) {
    removeMatchingArray(player, key, query);
  }

  players[playerId] = player;
  writePlayers(players);
  await flushPlayerStoreNow(30000);

  console.log(`Done. Removed matching "${query}" records from player ${playerId}.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});