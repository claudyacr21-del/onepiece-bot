const { EmbedBuilder } = require("discord.js");
const {
  setMarineChannelAllowed,
  getAllowedMarineChannels,
  isMarineChannelAllowed,
} = require("../utils/marineEvent");
const {
  canUseAdminCommand,
  getAdminAccessError,
} = require("../utils/adminAccess");

function getTargetChannel(message, args) {
  const mentioned = message.mentions?.channels?.first();
  if (mentioned) return mentioned;

  const rawId = args.find((arg) => /^\d{15,25}$/.test(String(arg || "")));
  if (rawId) {
    return message.guild?.channels?.cache?.get(String(rawId)) || null;
  }

  return message.channel;
}

module.exports = {
  name: "marinechannel",
  aliases: ["marines", "marineallow", "marinedisallow"],

  async execute(message, args = []) {
    if (!message.guild) {
      return message.reply({
        content: "This command can only be used in a server.",
        allowedMentions: { repliedUser: false },
      });
    }

    if (!canUseAdminCommand(message)) {
      return message.reply({
        content: getAdminAccessError(),
        allowedMentions: { repliedUser: false },
      });
    }

    const mode = String(args[0] || "").toLowerCase();

    if (!["allow", "on", "enable", "disallow", "off", "disable", "list", "status"].includes(mode)) {
      return message.reply({
        content: [
          "Usage:",
          "`op marines allow [#channel]`",
          "`op marines disallow [#channel]`",
          "`op marines status [#channel]`",
          "`op marines list`",
        ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    if (mode === "list") {
      const allowed = getAllowedMarineChannels(message.guild.id);

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("⚓ Marine Encounter Channels")
        .setDescription(
          allowed.length
            ? allowed.map((id, index) => `${index + 1}. <#${id}>`).join("\n")
            : "No channels are allowed yet."
        )
        .setFooter({ text: "One Piece Bot • Marine Channel Access" });

      return message.reply({
        embeds: [embed],
        allowedMentions: { repliedUser: false },
      });
    }

    const channel = getTargetChannel(message, args.slice(1));

    if (!channel) {
      return message.reply({
        content: "Channel was not found.",
        allowedMentions: { repliedUser: false },
      });
    }

    if (mode === "status") {
      const allowed = isMarineChannelAllowed(message.guild.id, channel.id);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(allowed ? 0x2ecc71 : 0xe74c3c)
            .setTitle("⚓ Marine Encounter Channel Status")
            .setDescription(
              [
                `**Channel:** <#${channel.id}>`,
                `**Status:** ${allowed ? "Allowed" : "Disallowed"}`,
              ].join("\n")
            )
            .setFooter({ text: "One Piece Bot • Marine Channel Access" }),
        ],
        allowedMentions: { repliedUser: false },
      });
    }

    const allow = ["allow", "on", "enable"].includes(mode);
    const allowedChannels = await setMarineChannelAllowed(
      message.guild.id,
      channel.id,
      allow
    );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(allow ? 0x2ecc71 : 0xe74c3c)
          .setTitle("⚓ Marine Encounter Channel Updated")
          .setDescription(
            [
              `**Channel:** <#${channel.id}>`,
              `**Status:** ${allow ? "Allowed" : "Disallowed"}`,
              "",
              `**Allowed Channels:** ${allowedChannels.length}`,
            ].join("\n")
          )
          .setFooter({ text: "One Piece Bot • Marine Channel Access" }),
      ],
      allowedMentions: { repliedUser: false },
    });
  },
};