const fs = require("fs");
const path = require("path");

const VALID_BUCKETS = [
  "items",
  "weapons",
  "devilFruits",
  "boxes",
  "tickets",
  "materials",
  "fragments",
];

function resolveDataDir() {
  return (
    process.env.PLAYER_DATA_DIR ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH ||
    path.join(__dirname, "..", "src", "data")
  );
}

function loadPlayers(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function savePlayers(filePath, players) {
  fs.writeFileSync(filePath, JSON.stringify(players, null, 2), "utf8");
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseJsonArg(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (err) {
    console.error("Invalid JSON extras:", value);
    process.exit(1);
  }
}

function main() {
  const userId = process.argv[2];
  const bucket = process.argv[3];
  const itemName = process.argv[4];
  const amount = Number(process.argv[5] || 1);
  const extras = parseJsonArg(process.argv[6]);

  if (!userId || !bucket || !itemName || !Number.isFinite(amount)) {
    console.log(
      'Usage: node scripts/giveItem.js <userId> <bucket> <itemName> <amount> [extrasJson]\n' +
      'Example: node scripts/giveItem.js 123 materials "Enhancement Stone" 25\n' +
      'Example: node scripts/giveItem.js 123 weapons "Yoru" 1 \'{"code":"yoru","rarity":"UR"}\''
    );
    process.exit(1);
  }

  if (!VALID_BUCKETS.includes(bucket)) {
    console.log(`Invalid bucket: ${bucket}`);
    console.log(`Valid buckets: ${VALID_BUCKETS.join(", ")}`);
    process.exit(1);
  }

  const dataDir = resolveDataDir();
  const filePath = path.join(dataDir, "players.json");
  const players = loadPlayers(filePath);

  if (!players[userId]) {
    console.log(`User not found: ${userId}`);
    process.exit(1);
  }

  players[userId][bucket] = ensureArray(players[userId][bucket]);

  const existing = players[userId][bucket].find(
    (entry) =>
      normalizeName(entry?.name) === normalizeName(itemName) &&
      (extras.code ? normalizeName(entry?.code) === normalizeName(extras.code) : true)
  );

  if (existing) {
    existing.amount = Number(existing.amount || 0) + amount;
    for (const [key, value] of Object.entries(extras)) {
      if (key === "amount") continue;
      existing[key] = value;
    }
  } else {
    players[userId][bucket].push({
      name: itemName,
      amount,
      ...extras,
    });
  }

  savePlayers(filePath, players);

  console.log(
    `Added ${amount} ${itemName} to ${userId} in ${bucket}${extras.code ? ` (code: ${extras.code})` : ""}`
  );
}

main();