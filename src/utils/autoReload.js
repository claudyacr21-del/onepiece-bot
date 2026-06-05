const DEFAULT_RELOAD_MINUTE = 0;

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
    console.log("[AUTO RELOAD] Soft reloading Discord client...");

    client.destroy();

    await new Promise((resolve) => setTimeout(resolve, 5000));

    await client.login(token);

    console.log("[AUTO RELOAD] Discord client reloaded successfully.");
  } catch (error) {
    console.error("[AUTO RELOAD] Soft reload failed:", error);

    // Do NOT process.exit() here.
    // Render marks self-exit as instance failed.
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