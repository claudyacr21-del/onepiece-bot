const fs = require("fs");
const path = require("path");

const persistentDir = process.env.PLAYER_DATA_DIR || "/data";
const fallbackDir = path.join(__dirname, "../data");

function resolveFilePath() {
  try {
    fs.mkdirSync(persistentDir, { recursive: true });
    return path.join(persistentDir, "redeemCodes.json");
  } catch (error) {
    fs.mkdirSync(fallbackDir, { recursive: true });
    return path.join(fallbackDir, "redeemCodes.json");
  }
}

const filePath = resolveFilePath();

function ensureFile() {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          codes: {},
        },
        null,
        2
      ),
      "utf8"
    );
  }
}

function readRedeemCodes() {
  ensureFile();

  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) return { codes: {} };

    const parsed = JSON.parse(raw);
    return {
      codes: parsed.codes && typeof parsed.codes === "object" ? parsed.codes : {},
    };
  } catch (error) {
    console.error("redeemCodes.json is invalid. Creating backup and resetting file.", error);

    try {
      const brokenRaw = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
      fs.writeFileSync(`${filePath}.broken.${Date.now()}.bak`, brokenRaw, "utf8");
    } catch (backupError) {
      console.error("Failed to back up broken redeemCodes.json", backupError);
    }

    const fresh = { codes: {} };
    writeRedeemCodes(fresh);
    return fresh;
  }
}

function writeRedeemCodes(data) {
  ensureFile();

  const payload = {
    codes: data.codes && typeof data.codes === "object" ? data.codes : {},
  };

  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

module.exports = {
  readRedeemCodes,
  writeRedeemCodes,
};