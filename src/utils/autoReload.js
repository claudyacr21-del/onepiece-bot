const DEFAULT_RELOAD_MINUTE = 0;

let autoReloadStarted = false;
let reloadTimer = null;

function toBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;

  const text = String(value).toLowerCase().trim();
  return ["1", "true", "yes", "on", "enable", "enabled"].includes(text);
}

function getReloadMinute() {
  const value = Number(process.env.AUTO_RELOAD_MINUTE ?? DEFAULT_RELOAD_MINUTE);

  if (!Number.isFinite(value)) return DEFAULT_RELOAD_MINUTE;

  return Math.max(0, Math.min(59, Math.floor(value)));
}

function getReloadSecond() {
  const value = Number(process.env.AUTO_RELOAD_SECOND ?? 0);

  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(59, Math.floor(value)));
}

function getNextReloadDelayMs() {
  const now = new Date();
  const target = new Date(now);

  target.setMinutes(getReloadMinute(), getReloadSecond(), 0);

  if (target <= now) {
    target.setHours(target.getHours() + 1);
  }

  return Math.max(1000, target.getTime() - now.getTime());
}

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds}s`;
}

function scheduleNextReload() {
  const delay = getNextReloadDelayMs();

  if (reloadTimer) {
    clearTimeout(reloadTimer);
  }

  console.log(
    `[AUTO RELOAD] Next automatic reload in ${formatMs(delay)} at minute ${getReloadMinute().toString().padStart(2, "0")}:${getReloadSecond()
      .toString()
      .padStart(2, "0")}.`
  );

  reloadTimer = setTimeout(() => {
    console.log("[AUTO RELOAD] Reload time reached. Exiting process for platform restart...");
    process.exit(0);
  }, delay);

  if (typeof reloadTimer.unref === "function") {
    reloadTimer.unref();
  }
}

function startAutoReloadService() {
  if (autoReloadStarted) return;
  autoReloadStarted = true;

  const enabled = toBool(process.env.AUTO_RELOAD_ENABLED, false);

  if (!enabled) {
    console.log("[AUTO RELOAD] Disabled. Set AUTO_RELOAD_ENABLED=true to enable.");
    return;
  }

  scheduleNextReload();
}

module.exports = {
  startAutoReloadService,
};