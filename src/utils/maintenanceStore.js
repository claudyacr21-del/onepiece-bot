const fs = require("fs");
const path = require("path");

const persistentDir =
  process.env.PLAYER_DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  "/data";

const fallbackDir = path.join(__dirname, "..", "data");

function resolveFilePath() {
  try {
    fs.mkdirSync(persistentDir, { recursive: true });
    return path.join(persistentDir, "maintenance.json");
  } catch (_) {
    fs.mkdirSync(fallbackDir, { recursive: true });
    return path.join(fallbackDir, "maintenance.json");
  }
}

const maintenancePath = resolveFilePath();

const DEFAULT_STATE = {
  active: false,
  updatedAt: 0,
  updatedBy: null,
};

function ensureFile() {
  const dir = path.dirname(maintenancePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(maintenancePath)) {
    fs.writeFileSync(maintenancePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
  }
}

function readMaintenanceState() {
  ensureFile();

  try {
    const raw = fs.readFileSync(maintenancePath, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      ...DEFAULT_STATE,
      ...(parsed && typeof parsed === "object" ? parsed : {}),
      active: Boolean(parsed?.active),
    };
  } catch (error) {
    console.error("[MAINTENANCE READ ERROR]", error);
    return { ...DEFAULT_STATE };
  }
}

function writeMaintenanceState(nextState) {
  ensureFile();

  const state = {
    ...DEFAULT_STATE,
    ...(nextState && typeof nextState === "object" ? nextState : {}),
    active: Boolean(nextState?.active),
    updatedAt: Date.now(),
  };

  fs.writeFileSync(maintenancePath, JSON.stringify(state, null, 2), "utf8");
  return state;
}

function setMaintenanceActive(active, updatedBy = null) {
  return writeMaintenanceState({
    ...readMaintenanceState(),
    active: Boolean(active),
    updatedBy: updatedBy ? String(updatedBy) : null,
  });
}

function isMaintenanceActive() {
  return Boolean(readMaintenanceState().active);
}

module.exports = {
  maintenancePath,
  readMaintenanceState,
  writeMaintenanceState,
  setMaintenanceActive,
  isMaintenanceActive,
};