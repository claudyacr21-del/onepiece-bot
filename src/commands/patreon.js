const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const PATREON_URL = process.env.PATREON_URL || "https://www.patreon.com/";
const MOTHER_FLAME_URL = process.env.PATREON_MOTHER_FLAME_URL || PATREON_URL;
const TICKET_RESET_URL = process.env.PATREON_TICKET_RESET_URL || PATREON_URL;

const PACKAGES = {
  mother_flame: {
    label: "Mother Flame 15$",
    emoji: "🔥",
    url: MOTHER_FLAME_URL,
    title: "Mother Flame | 15$/Month",
    description: [
      "**Global Perks**",
      "",
      "🔥 **Mother Flame Premium Role**",
      "",
      "• Access to `op pa` / Mother Flame pull all",
      "",
      "• Premium guarantee: **S tier pity at 100**",
      "",
      "• Extra pull slots every reset",
      "",
      "• Faster premium fight cooldown",
      "",
      "• Can claim premium treasure with `op treasure`",
      "",
      "• Access to `op instantquest` / `op iq`",
      "",
      "• Instant complete up to **2 daily quests**",
      "",
      "• Premium identity role in the server for **30 days** after admin verification",
      "",
      "📌 **Claim Instruction**",
      "After payment, open a ticket in the Discord server and send:",
      "• Patreon order proof",
      "• Payment proof",
      "",
      "Admin will verify your proof and manually activate your Mother Flame role.",
    ].join("\n"),
  },

  ticket_reset: {
    label: "10 Ticket Reset 5$",
    emoji: "🎟️",
    url: TICKET_RESET_URL,
    title: "10 Ticket Reset | 5$",
    description: [
      "**Purchase Details**",
      "",
      "🎟️ **Ticket Reset Pack**",
      "",
      "• Claimable Ticket Reset package",
      "",
      "• Useful for ticket / pull reset setup depending on current event rules",
      "",
      "• One-time purchase package",
      "",
      "📌 **Claim Instruction**",
      "After payment, open a ticket in the Discord server and send:",
      "• Patreon order proof",
      "• Payment proof",
      "",
      "Admin will verify your proof before sending the reward.",
    ].join("\n"),
  },
};

function buildMainEmbed() {
  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("One Piece Bot Patreon")
    .setDescription(
      [
        "Your support keeps **One Piece Bot** running and helps unlock better features, smoother hosting, and future updates.",
        "",
        "Choose a package below to view the perks.",
        "",
        "🔥 **Mother Flame** = premium monthly support",
        "🎟️ **Ticket Reset** = one-time claim package",
        "",
        "📌 **After payment, open a Discord ticket and send:**",
        "• Patreon order proof",
        "• Payment proof",
        "",
        "Admin will verify your purchase manually.",
        "",
        "↪ Click **Patreon** below to open the purchase page.",
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Patreon",
    });
}

function buildPackageEmbed(packageKey) {
  const pack = PACKAGES[packageKey] || PACKAGES.mother_flame;

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle(pack.title)
    .setDescription(pack.description)
    .setFooter({
      text: "One Piece Bot • Patreon Package",
    });
}

function buildSelectRow(selected = null) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("patreon_select")
      .setPlaceholder("Select Patreon package")
      .addOptions([
        {
          label: PACKAGES.mother_flame.label,
          description: "Premium bot package and Mother Flame perks",
          value: "mother_flame",
          emoji: PACKAGES.mother_flame.emoji,
          default: selected === "mother_flame",
        },
        {
          label: PACKAGES.ticket_reset.label,
          description: "Ticket Reset purchase package",
          value: "ticket_reset",
          emoji: PACKAGES.ticket_reset.emoji,
          default: selected === "ticket_reset",
        },
      ])
  );
}

function buildButtonRow(selected = null) {
  const pack = selected ? PACKAGES[selected] : null;
  const url = pack?.url || PATREON_URL;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Patreon")
      .setStyle(ButtonStyle.Link)
      .setURL(url)
  );
}

function buildComponents(selected = null) {
  return [buildSelectRow(selected), buildButtonRow(selected)];
}

module.exports = {
  name: "patreon",
  aliases: ["donate", "support"],

  async execute(message) {
    let selected = null;

    const sent = await message.reply({
      embeds: [buildMainEmbed()],
      components: buildComponents(selected),
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can use this Patreon menu.",
          ephemeral: true,
        });
      }

      selected = interaction.values?.[0] || "mother_flame";

      return interaction.update({
        embeds: [buildPackageEmbed(selected)],
        components: buildComponents(selected),
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({
          components: [buildButtonRow(selected)],
        });
      } catch {}
    });
  },
};