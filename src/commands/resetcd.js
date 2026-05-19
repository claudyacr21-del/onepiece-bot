const { EmbedBuilder } = require("discord.js");

const { updatePlayerAtomic } = require("../playerStore");
const {
  canUseAdminCommand,
  getAdminAccessError,
} = require("../utils/adminAccess");

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function cleanArg(value) {
  return normalize(value).replace(/[<@!>]/g, "");
}

function getTargetUser(message, args = []) {
  const mentionedUser = message.mentions?.users?.first();
  if (mentionedUser) return mentionedUser;

  const rawId = args
    .map(cleanArg)
    .find((arg) => /^\d{15,25}$/.test(arg));

  if (rawId) {
    return {
      id: rawId,
      username: `User ${rawId}`,
    };
  }

  return message.author;
}

function getMode(args = []) {
  const cleanedArgs = args.map(cleanArg).filter(Boolean);

  for (const arg of cleanedArgs) {
    if (["sail", "ship", "travel", "berlayar"].includes(arg)) return "sail";
    if (["boss", "islandboss", "island-boss"].includes(arg)) return "boss";
    if (["fight", "battle", "pvp", "islandfight", "island-fight"].includes(arg)) {
      return "fight";
    }
    if (["all", "both", "cd", "cooldown", "cooldowns", "semua"].includes(arg)) {
      return "all";
    }
  }

  return "all";
}

function getModeLabel(mode) {
  if (mode === "sail") return "Sail cooldown";
  if (mode === "boss") return "Boss cooldown";
  if (mode === "fight") return "Fight cooldown";
  return "All cooldowns";
}

function getHintText(mode) {
  if (mode === "sail") return "The target can use `op sail` again.";
  if (mode === "boss") return "The target can use `op boss` again.";
  if (mode === "fight") return "The target can use `op fight` again.";
  return "The target can use `op sail`, `op boss`, and `op fight` again.";
}

module.exports = {
  name: "resetcd",
  aliases: ["resetcooldown", "rcd", "resetboss", "resetsail", "resetfight"],

  async execute(message, args = []) {
    if (!message.guild) {
      return message.reply("This command can only be used in a server.");
    }

    if (!canUseAdminCommand(message)) {
      return message.reply(getAdminAccessError());
    }

    const mode = getMode(args);
    const targetUser = getTargetUser(message, args);
    const changed = [];

    updatePlayerAtomic(
      targetUser.id,
      (fresh) => {
        const next = {
          ...fresh,
        };

        if (mode === "sail" || mode === "all") {
          next.ship = {
            ...(fresh.ship || {}),
            nextTravelAt: 0,
          };

          changed.push("Sail cooldown");
        }

        if (mode === "boss" || mode === "all") {
          next.cooldowns = {
            ...(next.cooldowns || fresh.cooldowns || {}),
            boss: 0,
          };

          changed.push("Boss cooldown");
        }

        if (mode === "fight" || mode === "all") {
          next.cooldowns = {
            ...(next.cooldowns || fresh.cooldowns || {}),
            fight: 0,
            fightMotherFlame: 0,
            fightVivreCard: 0,
            islandFight: 0,
          };

          changed.push("Fight cooldown");
        }

        return next;
      },
      targetUser.username || targetUser.id
    );

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("✅ Cooldown Reset Complete")
      .setDescription(
        [
          `**Target:** <@${targetUser.id}>`,
          `**User ID:** \`${targetUser.id}\``,
          `**Mode:** ${getModeLabel(mode)}`,
          `**Reset:** ${changed.join(" + ") || "None"}`,
          "",
          getHintText(mode),
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Admin Cooldown Reset",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        users: [String(targetUser.id)],
        repliedUser: false,
      },
    });
  },
};