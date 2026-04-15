const fs = require("fs");
const path = require("path");

const sourcePath = path.join(__dirname, "data", "players.json");
const targetDir = process.env.PLAYER_DATA_DIR || "/data";
const targetPath = path.join(targetDir, "players.json");

function main() {
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(sourcePath, "utf8").trim();
  if (!raw) {
    console.error("Source players.json is empty.");
    process.exit(1);
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    console.error("Source players.json is invalid.");
    process.exit(1);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2), "utf8");

  console.log(`Seeded player data to ${targetPath}`);
}

main();