const DEFAULT_RELOAD_MINUTE = 0;

const {
  readPlayers,
  writePlayers,
  drainPlayerStoreSaves,
  flushPlayerStoreNow,
} = require("../playerStore");

let autoReloadStarted = false;
let reloadTimer = null;
let reloading = false;

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

function getBotToken() {
  return (
    process.env.DISCORD_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.TOKEN ||
    ""
  );
}

async function flushBeforeReload() {
  const timeoutMs = Number(process.env.AUTO_RELOAD_SAVE_TIMEOUT_MS || 30000);

  try {
    console.log("[AUTO RELOAD] Saving player data before reload...");

    if (typeof flushPlayerStoreNow === "function") {
      const ok = await flushPlayerStoreNow(timeoutMs);
      if (ok) {
        console.log("[AUTO RELOAD] Player data flushed before reload.");
      } else {
        console.warn("[AUTO RELOAD] Player data flush returned false.");
      }
      return ok;
    }

    const players = readPlayers();
    writePlayers(players);

    if (typeof drainPlayerStoreSaves === "function") {
      await drainPlayerStoreSaves(timeoutMs);
    }

    console.log("[AUTO RELOAD] Pending player saves drained before reload.");
    return true;
  } catch (error) {
    console.error("[AUTO RELOAD] Failed to save player data before reload:", error);
    return false;
  }
}

async function softReloadDiscordClient(client) {
  if (!client || typeof client.destroy !== "function" || typeof client.login !== "function") {
    console.log("[AUTO RELOAD] Client not available. Skipping soft reload.");
    return;
  }

  if (reloading) {
    console.log("[AUTO RELOAD] Reload already running. Skipping duplicate reload.");
    return;
  }

  const token = getBotToken();

  if (!token) {
    console.log("[AUTO RELOAD] Missing bot token env. Cannot soft reload.");
    return;
  }

  reloading = true;

  try {
    console.log("[AUTO RELOAD] Soft reload starting...");

    const saved = await flushBeforeReload();

    if (!saved && toBool(process.env.AUTO_RELOAD_ABORT_IF_SAVE_FAILS, true)) {
      console.warn("[AUTO RELOAD] Reload aborted because player data save failed.");
      return;
    }

    console.log("[AUTO RELOAD] Soft reloading Discord client...");
    client.destroy();

    await new Promise((resolve) => setTimeout(resolve, 5000));

    await client.login(token);

    console.log("[AUTO RELOAD] Discord client reloaded successfully.");
  } catch (error) {
    console.error("[AUTO RELOAD] Soft reload failed:", error);
  } finally {
    reloading = false;
  }
}

function scheduleNextReload(client) {
  const delay = getNextReloadDelayMs();

  if (reloadTimer) {
    clearTimeout(reloadTimer);
  }

  console.log(
    `[AUTO RELOAD] Next soft reload in ${formatMs(delay)} at minute ${String(
      getReloadMinute()
    ).padStart(2, "0")}:${String(getReloadSecond()).padStart(2, "0")}.`
  );

  reloadTimer = setTimeout(async () => {
    await softReloadDiscordClient(client);
    scheduleNextReload(client);
  }, delay);

  if (typeof reloadTimer.unref === "function") {
    reloadTimer.unref();
  }
}

function startAutoReloadService(client) {
  if (autoReloadStarted) return;

  autoReloadStarted = true;

  const enabled = toBool(process.env.AUTO_RELOAD_ENABLED, false);

  if (!enabled) {
    console.log("[AUTO RELOAD] Disabled. Set AUTO_RELOAD_ENABLED=true to enable.");
    return;
  }

  scheduleNextReload(client);
}

module.exports = {
  startAutoReloadService,
};