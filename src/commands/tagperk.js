const { EmbedBuilder } = require("discord.js");

const {
  getServerTagGuildId,
  getServerTagPerksFromMessage,
} = require("../utils/serverTagPerks");

module.exports = {
  name: "tagperk",

  async execute(message) {
    const perks = getServerTagPerksFromMessage(message);

    const primaryGuild =
      message.author?.primaryGuild ||
      message.author?.primary_guild ||
      null;

    const detectedGuildId = String(
      primaryGuild?.identityGuildId ||
        primaryGuild?.identity_guild_id ||
        "Not detected"
    );

    const detectedTag = String(
      primaryGuild?.tag || "Not detected"
    );

    const configuredGuildId =
      getServerTagGuildId() || "Not configured";

    const embed = new EmbedBuilder()
      .setColor(perks.active ? 0x57f287 : 0xed4245)
      .setTitle("Server Tag Perk Status")
      .setDescription(
        perks.active
          ? "Your Server Tag perks are active."
          : "Your Server Tag perks are not active."
      )
      .addFields(
        {
          name: "Configured Guild ID",
          value: `\`${configuredGuildId}\``,
          inline: false,
        },
        {
          name: "Detected Guild ID",
          value: `\`${detectedGuildId}\``,
          inline: false,
        },
        {
          name: "Detected Tag",
          value: `\`${detectedTag}\``,
          inline: true,
        },
        {
          name: "Identity Enabled",
          value:
            primaryGuild?.identityEnabled === true ||
            primaryGuild?.identity_enabled === true
              ? "Yes"
              : "No",
          inline: true,
        },
        {
          name: "Extra Pull Limit",
          value: `+${perks.extraPullLimit}`,
          inline: true,
        },
        {
          name: "Boss Cooldown",
          value: `-${Math.floor(
            perks.bossCooldownReductionMs / 60000
          )} minutes`,
          inline: true,
        },
        {
          name: "Fight Cooldown",
          value: `-${Math.floor(
            perks.fightCooldownReductionMs / 60000
          )} minute`,
          inline: true,
        },
        {
          name: "Shop Discount",
          value: `${perks.shopDiscountPercent}%`,
          inline: true,
        },
        {
          name: "Gem Income Bonus",
          value: `${perks.gemIncomeBonusPercent}%`,
          inline: true,
        },
        {
          name: "Berry Income Bonus",
          value: `${perks.berryIncomeBonusPercent}%`,
          inline: true,
        },
        {
          name: "Daily Reset Token",
          value: `+${perks.dailyResetTokenBonus}`,
          inline: true,
        }
      )
      .setFooter({
        text: "The perk status is checked directly from your active Server Tag.",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};