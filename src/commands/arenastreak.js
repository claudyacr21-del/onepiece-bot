const { PermissionsBitField } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");

function getOwnerIds() {
  return String(
    process.env.BOT_OWNER_IDS ||
      process.env.OWNER_IDS ||
      process.env.BOT_OWNER_ID ||
      process.env.ADMIN_USER_IDS ||
      ""
  )
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isOwnerOrAdmin(message) {
  const ownerIds = getOwnerIds();

  const isBotOwner = ownerIds.includes(String(message.author.id));
  const isServerOwner =
    message.guild && String(message.guild.ownerId) === String(message.author.id);
  const isAdminPerm = message.member?.permissions?.has(
    PermissionsBitField.Flags.Administrator
  );

  return Boolean(isBotOwner || isServerOwner || isAdminPerm);
}

function parseUserId(value = "") {
  const raw = String(value || "").trim();

  const mentionMatch = raw.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];

  if (/^\d{15,25}$/.test(raw)) return raw;

  return null;
}

function parseAmount(value) {
  const amount = Math.floor(Number(value));
  if (!Number.isFinite(amount)) return null;
  return Math.max(0, amount);
}

async function resolveUsername(message, userId) {
  const mentioned = message.mentions.users.get(userId);
  if (mentioned?.username) return mentioned.username;

  const fetched = await message.client.users.fetch(userId).catch(() => null);
  if (fetched?.username) return fetched.username;

  return "Unknown";
}

module.exports = {
  name: "arenastreak",
  aliases: ["astreak"],

  async execute(message, args) {
    if (!isOwnerOrAdmin(message)) {
      return message.reply("❌ Only bot owner/server admin can use this command.");
    }

    const mode = String(args[0] || "").toLowerCase();

    if (mode !== "set") {
      return message.reply(
        [
          "❌ Invalid usage.",
          "",
          "**Usage:**",
          "`op astreak set @user <streak>`",
          "",
        ].join("\n")
      );
    }

    const userId = parseUserId(args[1]);
    const amount = parseAmount(args[2]);

    if (!userId) {
      return message.reply("❌ Invalid user. Use mention or Discord user ID.");
    }

    if (amount === null) {
      return message.reply("❌ Streak must be a number.");
    }

    const username = await resolveUsername(message, userId);

    let resultText = "";

    const updated = updatePlayerAtomic(
      userId,
      (player) => {
        const arena = {
          points: Number(player?.arena?.points || 0),
          wins: Number(player?.arena?.wins || 0),
          losses: Number(player?.arena?.losses || 0),
          draws: Number(player?.arena?.draws || 0),
          streak: Number(player?.arena?.streak || 0),
          bestStreak: Number(player?.arena?.bestStreak || 0),
          matches: Number(player?.arena?.matches || 0),
          dailyDateKey: player?.arena?.dailyDateKey || null,
          dailyUses: Number(player?.arena?.dailyUses || 0),
          lastPointChange: Number(player?.arena?.lastPointChange || 0),
        };

        const before = Math.max(0, Number(arena.streak || 0));
        const after = amount;

        arena.streak = after;
        arena.bestStreak = Math.max(Number(arena.bestStreak || 0), after);

        resultText = [
          `✅ Arena streak set for **${player.username || username}**.`,
          `Before: **${before}**`,
          `After: **${after}**`,
          `Best Streak: **${arena.bestStreak}**`,
        ].join("\n");

        return {
          ...player,
          username: player.username || username,
          arena,
        };
      },
      username
    );

    return message.reply(
      resultText || `✅ Arena streak set for **${updated.username || username}**.`
    );
  },
};