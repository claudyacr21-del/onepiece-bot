const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { readPatreonRoles } = require("../utils/patreonRoleStore");

const PATREON_URL = process.env.PATREON_URL || "https://www.patreon.com/";
const MOTHER_FLAME_URL = process.env.PATREON_MOTHER_FLAME_URL || PATREON_URL;
const VIVRE_CARD_URL = process.env.PATREON_VIVRE_CARD_URL || PATREON_URL;
const MARINE_CHANNEL_URL = process.env.PATREON_MARINE_CHANNEL_URL || PATREON_URL;
const TICKET_RESET_URL = process.env.PATREON_TICKET_RESET_URL || PATREON_URL;
const SUPPORT_SERVER_URL =
  process.env.SUPPORT_SERVER_URL ||
  process.env.DISCORD_SUPPORT_URL ||
  "https://discord.gg/";

const PACKAGES = {
  mother_flame: {
    label: "Mother Flame 15$",
    emoji: "🔥",
    url: MOTHER_FLAME_URL,
    buttonLabel: "Purchase Mother Flame",
    title: "Mother Flame | 15$/Month",
    description: [
      "**Global Perks**",
      "",
      "🔥 **Mother Flame Premium Role**",
      "",
      "• Access to `op pa` / pull all",
      "• Extra pull slots every reset: **+3**",
      "• Fight cooldown reduced to **5 minutes**",
      "• Can claim premium treasure with `op treasure`",
      "• Instant quest limit: **2 daily quests**",
      "• Premium role and profile badge for **30 days**",
      "",
      "**Premium Pull RNG**",
      "• S Card Chance: **2.2%**",
      "• Devil Fruit Chance: **5%**",
      "• Devil Fruit UR Chance: **2%**",
      "• Weapon Chance: **7%**",
      "• Raid Ticket Chance: **6%**",
      "• Guaranteed **S tier at 100 pity**",
      "",
      "**Claim Instruction**",
      "After payment, open a ticket in the Discord server and send:",
      "• Patreon order proof",
      "• Payment proof",
      "• If you want to avoid Patreon tax/fees, you can chat the owner directly before payment.",
      "",
      "Admin will verify your proof and manually activate your Mother Flame role.",
    ].join("\n"),
  },

  vivre_card: {
    label: "Vivre Card 5$",
    emoji: "🧭",
    url: VIVRE_CARD_URL,
    buttonLabel: "Purchase Vivre Card",
    title: "Vivre Card | 5$/Month",
    description: [
      "**Lite Premium Perks**",
      "",
      "🧭 **Vivre Card Supporter Role**",
      "",
      "• Extra pull slot every reset: **+1**",
      "• Fight cooldown reduced to **6 minutes 30 seconds**",
      "• Instant quest limit: **1 daily quest**",
      "• Lite premium role and profile badge for **30 days**",
      "",
      "**Lite Premium Pull RNG**",
      "• S Card Chance: **1.6%**",
      "• Devil Fruit Chance: **4%**",
      "• Devil Fruit UR Chance: **1%**",
      "• Weapon Chance: **6%**",
      "• Raid Ticket Chance: **5%**",
      "• Guaranteed **S tier at 125 pity**",
      "",
      "**Claim Instruction**",
      "After payment, open a ticket in the Discord server and send:",
      "• Patreon order proof",
      "• Payment proof",
      "• If you want to avoid Patreon tax/fees, you can chat the owner directly before payment.",
      "",
      "Admin will verify your proof and manually activate your Vivre Card role.",
    ].join("\n"),
  },

  marine_channel: {
    label: "Marineford (Server) 10$",
    emoji: "⚓",
    url: MARINE_CHANNEL_URL,
    buttonLabel: "Purchase Marineford (Server)",
    title: "Marineford (Server) | 10$/Month",
    description: [
      "**Exclusive Server Access**",
      "",
      "⚓ **Marineford (Server) Role**",
      "",
      "• Access to the exclusive Marineford premium Server",
      "• Private update previews and bot development notes",
      "• Early information for events, raids, balance changes, and future features",
      "• Made for users who want to support the bot and join the private server discussion",
      "",
      "**Claim Instruction**",
      "After payment, open a ticket in the Discord server and send:",
      "• Patreon order proof",
      "• Payment proof",
      "• If you want to avoid Patreon tax/fees, you can chat the owner directly before payment.",
      "",
      "Admin will verify your proof and manually activate your Marineford (Server).",
    ].join("\n"),
  },

  ticket_reset: {
    label: "10 Ticket Reset 5$",
    emoji: "🎟️",
    url: TICKET_RESET_URL,
    buttonLabel: "Purchase Ticket Reset",
    title: "10 Ticket Reset | 5$",
    description: [
      "**Purchase Details**",
      "",
      "🎟️ **Ticket Reset Pack**",
      "",
      "• One-time purchase package",
      "• Claimable **10 Ticket Reset** package",
      "• Useful for ticket / reset needs depending on current event rules",
      "",
      "**Claim Instruction**",
      "After payment, open a ticket in the Discord server and send:",
      "• Patreon order proof",
      "• Payment proof",
      "• If you want to avoid Patreon tax/fees, you can chat the owner directly before payment.",
      "",
      "Admin will verify your proof before sending the reward.",
    ].join("\n"),
  },
};

function formatRemainingTime(ms) {
  const safeMs = Math.max(0, Number(ms || 0));
  if (safeMs <= 0) return "Expired";

  const totalMinutes = Math.floor(safeMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function normalizeTier(value) {
  const tier = String(value || "").toLowerCase().trim();

  if (tier === "vivre_card" || tier === "vivrecard" || tier === "vivre") {
    return "vivre_card";
  }

  return "mother_flame";
}

function getPatreonStatus(userId) {
  const data = readPatreonRoles();
  const entry = data[String(userId)];

  if (!entry || Number(entry.expiresAt || 0) <= Date.now()) {
    return {
      active: false,
      tier: null,
      line: "Premium Status: Not active",
    };
  }

  const tier = normalizeTier(entry.tier);
  const label = tier === "vivre_card" ? "Vivre Card" : "Mother Flame";

  return {
    active: true,
    tier,
    line: `${label} Status: Active • Remaining ${formatRemainingTime(
      Number(entry.expiresAt || 0) - Date.now()
    )}`,
  };
}

function buildMainEmbed(userId) {
  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("One Piece Bot Patreon")
    .setDescription(
      [
        "Your support keeps **One Piece Bot** running and helps us continue building better features, smoother hosting, and future updates.",
        "",
        "Choose a package below to view the details.",
        "",
        `**${getPatreonStatus(userId).line}**`,
        "",
        "**After payment, open a Discord ticket and send:**",
        "• Patreon order proof",
        "• Payment proof",
        "• If you want to avoid Patreon tax/fees, you can chat the owner directly before payment.",
        "",
        "Admin will verify your purchase manually.",
      ].join("\n")
    )
    .setFooter({ text: "One Piece Bot • Patreon" });
}

function buildPackageEmbed(packageKey, userId) {
  const pack = PACKAGES[packageKey] || PACKAGES.mother_flame;

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle(pack.title)
    .setDescription(
      [
        `**${getPatreonStatus(userId).line}**`,
        "",
        pack.description,
      ].join("\n")
    )
    .setFooter({ text: "One Piece Bot • Patreon Package" });
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
          label: PACKAGES.vivre_card.label,
          description: "Lite premium package with Vivre Card perks",
          value: "vivre_card",
          emoji: PACKAGES.vivre_card.emoji,
          default: selected === "vivre_card",
        },
        {
          label: PACKAGES.marine_channel.label,
          description: "Exclusive Marineford premium channel access",
          value: "marine_channel",
          emoji: PACKAGES.marine_channel.emoji,
          default: selected === "marine_channel",
        },
        {
          label: PACKAGES.ticket_reset.label,
          description: "One-time Ticket Reset purchase package",
          value: "ticket_reset",
          emoji: PACKAGES.ticket_reset.emoji,
          default: selected === "ticket_reset",
        },
      ])
  );
}

function buildButtonRow(selected = null) {
  const pack = selected ? PACKAGES[selected] : null;

  const buttons = [
    new ButtonBuilder()
      .setLabel(pack ? pack.buttonLabel : "Patreon")
      .setStyle(ButtonStyle.Link)
      .setURL(pack?.url || PATREON_URL),
  ];

  if (SUPPORT_SERVER_URL && SUPPORT_SERVER_URL !== "https://discord.gg/") {
    buttons.push(
      new ButtonBuilder()
        .setLabel("Support Server")
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_SERVER_URL)
    );
  }

  return new ActionRowBuilder().addComponents(buttons);
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
      embeds: [buildMainEmbed(message.author.id)],
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
        embeds: [
          buildMainEmbed(message.author.id),
          buildPackageEmbed(selected, message.author.id),
        ],
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