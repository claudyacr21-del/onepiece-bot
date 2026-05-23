const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function write(file, content) {
  fs.writeFileSync(path.join(ROOT, file), content, "utf8");
}

function backup(file) {
  const src = path.join(ROOT, file);
  const dst = path.join(ROOT, `${file}.bak_${Date.now()}`);
  fs.copyFileSync(src, dst);
  console.log(`✅ Backup: ${file}`);
}

function patchIndex() {
  const file = "src/index.js";
  if (!fs.existsSync(path.join(ROOT, file))) {
    console.log(`⚠️ Missing ${file}`);
    return;
  }

  backup(file);

  let code = read(file);

  const oldGetPool = `function getDedupePool() {
  if (!process.env.DATABASE_URL) return null;`;

  const newGetPool = `function getDedupePool() {
  const enabled =
    String(process.env.MESSAGE_DEDUPE_ENABLED || "false").toLowerCase() === "true";

  if (!enabled) return null;
  if (!process.env.DATABASE_URL) return null;`;

  if (code.includes(oldGetPool)) {
    code = code.replace(oldGetPool, newGetPool);
    console.log("✅ index.js: message dedupe now disabled by default");
  } else if (code.includes("function getDedupePool()") && code.includes("MESSAGE_DEDUPE_ENABLED")) {
    console.log("ℹ️ index.js: message dedupe patch already exists");
  } else {
    console.log("⚠️ index.js: getDedupePool pattern not found");
  }

  const oldReady = `await ensureMessageDedupeTable();`;

  const newReady = `if (String(process.env.MESSAGE_DEDUPE_ENABLED || "false").toLowerCase() === "true") {
    await ensureMessageDedupeTable();
  }`;

  if (code.includes(oldReady) && !code.includes(`MESSAGE_DEDUPE_ENABLED || "false"`)) {
    code = code.replace(oldReady, newReady);
    console.log("✅ index.js: ready dedupe init guarded by env");
  } else {
    console.log("ℹ️ index.js: ready dedupe init already guarded or not found");
  }

  write(file, code);
}

function ensureInteractionLockHelper(code, file) {
  if (code.includes("const __activeFightSystemInteractions = new Set();")) {
    return code;
  }

  const helper = `
const __activeFightSystemInteractions = new Set();

async function __guardFightSystemInteraction(interaction) {
  const key = [
    interaction?.message?.id || "no-message",
    interaction?.user?.id || "no-user",
    interaction?.customId || "no-custom-id",
  ].join(":");

  if (__activeFightSystemInteractions.has(key)) {
    if (typeof safeDeferUpdate === "function") {
      await safeDeferUpdate(interaction).catch(() => null);
    }
    return false;
  }

  __activeFightSystemInteractions.add(key);

  setTimeout(() => {
    __activeFightSystemInteractions.delete(key);
  }, 2500);

  return true;
}
`;

  // taruh helper setelah require/import block awal
  const firstFunctionIndex = code.indexOf("\nfunction ");
  const firstConstAfterImports = code.indexOf("\nconst ");

  if (firstFunctionIndex > 0) {
    return code.slice(0, firstFunctionIndex) + helper + code.slice(firstFunctionIndex);
  }

  if (firstConstAfterImports > 0) {
    return code.slice(0, firstConstAfterImports) + helper + code.slice(firstConstAfterImports);
  }

  console.log(`⚠️ ${file}: could not place helper cleanly, adding to top`);
  return helper + "\n" + code;
}

function patchCollectorLocks(file) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    console.log(`⚠️ Missing ${file}`);
    return;
  }

  backup(file);

  let code = read(file);
  const before = code;

  code = ensureInteractionLockHelper(code, file);

  const patterns = [
    `collector.on("collect", async (interaction) => {`,
    `collector.on('collect', async (interaction) => {`,
    `lobbyCollector.on("collect", async (interaction) => {`,
    `lobbyCollector.on('collect', async (interaction) => {`,
    `buttonCollector.on("collect", async (interaction) => {`,
    `buttonCollector.on('collect', async (interaction) => {`,
  ];

  let patchedCount = 0;

  for (const pattern of patterns) {
    let searchFrom = 0;

    while (true) {
      const idx = code.indexOf(pattern, searchFrom);
      if (idx === -1) break;

      const insertAt = idx + pattern.length;

      const nextChunk = code.slice(insertAt, insertAt + 500);
      if (nextChunk.includes("__guardFightSystemInteraction(interaction)")) {
        searchFrom = insertAt + 1;
        continue;
      }

      const injection = `

      if (!(await __guardFightSystemInteraction(interaction))) {
        return;
      }`;

      code = code.slice(0, insertAt) + injection + code.slice(insertAt);
      patchedCount += 1;
      searchFrom = insertAt + injection.length + 1;
    }
  }

  if (code !== before) {
    write(file, code);
  }

  console.log(`✅ ${file}: patched collector locks = ${patchedCount}`);
}

function main() {
  console.log("=== Patch started ===");

  patchIndex();

  [
    "src/commands/fight.js",
    "src/commands/boss.js",
    "src/commands/arena.js",
    "src/commands/challenge.js",
    "src/commands/raid.js",
  ].forEach(patchCollectorLocks);

  console.log("");
  console.log("=== Patch complete ===");
  console.log("Next:");
  console.log("1) npm test / node -c check if you want");
  console.log("2) git status");
  console.log("3) git add src/index.js src/commands/fight.js src/commands/boss.js src/commands/arena.js src/commands/challenge.js src/commands/raid.js");
  console.log('4) git commit -m "fix fight interaction double click and command latency"');
  console.log("5) git push");
}

main();