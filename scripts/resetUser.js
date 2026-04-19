const fs = require("fs");
const path = require("path");

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

function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.log("Usage: node scripts/resetUser.js <userId>");
    process.exit(1);
  }

  const dataDir = resolveDataDir();
  const filePath = path.join(dataDir, "players.json");
  const players = loadPlayers(filePath);

  if (!players[userId]) {
    console.log(`User not found: ${userId}`);
    process.exit(1);
  }

  delete players[userId];
  savePlayers(filePath, players);

  console.log(`Deleted user: ${userId}`);
}

main();