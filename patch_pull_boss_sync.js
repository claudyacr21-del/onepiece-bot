const fs = require("fs");

function mustReplace(file, search, replacement, label) {
  let text = fs.readFileSync(file, "utf8");
  if (!text.includes(search)) {
    throw new Error(`[${file}] Pattern not found: ${label}`);
  }
  text = text.replace(search, replacement);
  fs.writeFileSync(file, text);
  console.log(`[OK] ${file}: ${label}`);
}

function patchPull() {
  const file = "src/commands/pull.js";
  let text = fs.readFileSync(file, "utf8");

  if (!text.includes("const PULL_USER_LOCKS = new Set();")) {
    text = text.replace(
      "const NORMAL_PITY_TARGET = 150;",
      "const NORMAL_PITY_TARGET = 150;\nconst PULL_USER_LOCKS = new Set();"
    );
  }

  if (!text.includes("const pullLockKey = String(message.author.id);")) {
    text = text.replace(
      "async execute(message) { const player = getPlayer(message.author.id, message.author.username);",
      `async execute(message) {
    const pullLockKey = String(message.author.id);

    if (PULL_USER_LOCKS.has(pullLockKey)) {
      return message.reply("Your previous pull is still being saved. Please wait 1-2 seconds and try again.");
    }

    PULL_USER_LOCKS.add(pullLockKey);

    try {
      const player = getPlayer(message.author.id, message.author.username);`
    );

    text = text.replace(
      "return message.reply({ embeds: [embed], }); }, };",
      `return message.reply({ embeds: [embed], });
    } finally {
      PULL_USER_LOCKS.delete(pullLockKey);
    }
  },
};`
    );
  }

  text = text.replace(
    "savePullResultFresh( message.author.id,",
    "await savePullResultFresh( message.author.id,"
  );

  fs.writeFileSync(file, text);
  console.log("[OK] src/commands/pull.js: await save + per-user pull lock");
}

function patchBoss() {
  const file = "src/commands/boss.js";
  let text = fs.readFileSync(file, "utf8");

  if (!text.includes("const joinAckOk = await interaction.deferReply")) {
    text = text.replace(
      `if (interaction.customId === "boss_lobby_join") { const userId = String(interaction.user.id);`,
      `if (interaction.customId === "boss_lobby_join") {
        const joinAckOk = await interaction
          .deferReply({ flags: MessageFlags.Ephemeral })
          .then(() => true)
          .catch((error) => {
            if (!isIgnorableDiscordInteractionError(error)) {
              console.error("[BOSS JOIN DEFER ERROR]", error?.message || error);
            }
            return false;
          });

        if (!joinAckOk) return;

        const userId = String(interaction.user.id);`
    );
  }

  text = text.replace(
    `await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], flags: MessageFlags.Ephemeral, });`,
    `await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });`
  );

  fs.writeFileSync(file, text);
  console.log("[OK] src/commands/boss.js: defer Join immediately");
}

patchPull();
patchBoss();

console.log("\\nDone. Now test with: node --check src/commands/pull.js && node --check src/commands/boss.js");
