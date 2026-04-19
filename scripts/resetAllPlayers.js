const fs = require("fs");
const path = require("path");

function resolveDataDir() {
  return (
    process.env.PLAYER_DATA_DIR ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH ||
    path.join(__dirname, "..", "src", "data")
  );
}

function main() {
  const dataDir = resolveDataDir();
  const filePath = path.join(dataDir, "players.json");

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({}, null, 2), "utf8");

  console.log(`Reset all players: ${filePath}`);
}

main();