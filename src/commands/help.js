const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const PREFIX = "op";

const HELP_PAGES = {
  main: {
    label: "Overview",
    description: "Main command overview",
    emoji: "🏴‍☠️",
    title: "🏴‍☠️ One Piece Bot Help",
    body: [
      `**Prefix:** \`${PREFIX}\``,
      "",
      "Use commands with a space after prefix.",
      `✅ \`${PREFIX} v\``,
      `❌ \`${PREFIX}v\``,
      "",
      "## Main Categories",
      "**🎴 Cards & Pulls** — pull, collection, card info, awaken, fragments",
      "**⚔️ Battle** — fight, boss, arena, challenge",
      "**👥 Raid Team** — raid team setup for raid/boss phase 2",
      "**🛒 Market** — view shop and buy boxes",
      "**⛵ Progression** — ship, travel, sail",
      "**🎁 Daily & Quest** — daily reward, quest, effects",
      "**👤 Profile** — profile, inventory, leaderboard",
      "",
      "Use the dropdown below to open each category.",
    ],
  },

  cards: {
    label: "Cards & Pulls",
    description: "Pull, collection, card info, awaken",
    emoji: "🎴",
    title: "🎴 Cards & Pulls",
    body: [
      "## Pull",
      `\`${PREFIX} pull\` — single pull`,
      `\`${PREFIX} pa\` — Mother Flame pull all`,
      `\`${PREFIX} pullinfo\` — check pull slot status`,
      "",
      "## Card Info",
      `\`${PREFIX} ci <name>\` — global card info`,
      `\`${PREFIX} mci <name>\` — owned card/item info`,
      "",
      "## Collection",
      `\`${PREFIX} mc\` — card collection`,
      `\`${PREFIX} mc text\` — compact card list`,
      `\`${PREFIX} mc boost\` — boost cards only`,
      `\`${PREFIX} mc weapon\` — weapon collection`,
      "",
      "## Upgrade",
      `\`${PREFIX} awaken <card>\` — awaken card`,
      `\`${PREFIX} level frag <card> <amount>\` — level up using fragments`,
    ],
  },

  battle: {
    label: "Battle",
    description: "Fight, boss, arena, challenge",
    emoji: "⚔️",
    title: "⚔️ Battle Commands",
    body: [
      "## Fight",
      `\`${PREFIX} fight\` / \`${PREFIX} f\` — manual island fight`,
      "",
      "## Boss",
      `\`${PREFIX} boss\` — fight current island boss`,
      `\`${PREFIX} boss 1\` — choose phase 1 boss`,
      `\`${PREFIX} boss 2\` — choose phase 2 boss`,
      "",
      "Boss phase 2 uses your saved raid team.",
      "Each valid user brings their 3 team cards.",
      "Minimum 2 users total, maximum 4 users total.",
      "",
      "## PvP",
      `\`${PREFIX} arena\` — ranked arena`,
      `\`${PREFIX} challenge @user\` — direct test battle`,
      "",
      "## Team",
      `\`${PREFIX} team\` — view your current battle team`,
    ],
  },

  raid: {
    label: "Raid & Team",
    description: "Raid rooms and saved raid team",
    emoji: "👥",
    title: "👥 Raid & Team Commands",
    body: [
      "## Raid Rooms",
      `\`${PREFIX} craid <boss>\` — C/B common raid`,
      `\`${PREFIX} raid <boss>\` — A/S raid`,
      `\`${PREFIX} killraid\` — close active raid room`,
      "",
      "## Saved Raid Team",
      `\`${PREFIX} rtadd @user\` — add user to saved raid team`,
      `\`${PREFIX} rtremove @user\` — remove user from saved raid team`,
      `\`${PREFIX} rtdelete\` — clear saved raid team`,
      `\`${PREFIX} rt\` — show raid team / room info`,
      `\`${PREFIX} rm\` — show missing active raid users`,
      "",
      "## Rules",
      "Raid room: each user joins with 1 battle card.",
      "Boss phase 2: each saved raid team user joins with 3 team cards.",
    ],
  },

  market: {
    label: "Market",
    description: "View shop and buy items",
    emoji: "🛒",
    title: "🛒 Market Commands",
    body: [
      "## View Market",
      `\`${PREFIX} market\` — show available items only`,
      "",
      "## Buy",
      `\`${PREFIX} buy wooden\` — buy 1 Wooden Material Box`,
      `\`${PREFIX} buy iron 3\` — buy 3 Iron Material Boxes`,
      `\`${PREFIX} buy royal 10\` — buy 10 Royal Material Boxes`,
      "",
      "Format:",
      `\`${PREFIX} buy <itemname> <amount>\``,
      "",
      "If amount is empty, amount will be 1.",
    ],
  },

  equipment: {
    label: "Equipment",
    description: "Weapon, fruit, upgrade, unequip",
    emoji: "🗡️",
    title: "🗡️ Equipment Commands",
    body: [
      "## Weapon",
      `\`${PREFIX} wp <card> <weapon>\` — equip weapon`,
      `\`${PREFIX} unequip <card>\` — unequip weapon for gems`,
      `\`${PREFIX} wupgrade <weapon>\` — upgrade weapon`,
      "",
      "## Devil Fruit",
      `\`${PREFIX} df <card> <fruit>\` — equip devil fruit`,
      "",
      "Weapon and fruit bonuses are added to card power.",
    ],
  },

  progression: {
    label: "Progression",
    description: "Ship, travel, island, sail",
    emoji: "⛵",
    title: "⛵ Progression Commands",
    body: [
      "## Ship",
      `\`${PREFIX} ship\` — view ship`,
      `\`${PREFIX} ship upgrade\` — upgrade current ship`,
      `\`${PREFIX} shipupgrade\` — standalone ship upgrade`,
      "",
      "## Travel",
      `\`${PREFIX} travel\` — view unlocked islands`,
      `\`${PREFIX} travel <island>\` — move to island`,
      `\`${PREFIX} sail\` — sail to next route`,
      "",
      "Some islands require higher ship tier.",
    ],
  },

  daily: {
    label: "Daily & Quest",
    description: "Daily reward, quest, effects",
    emoji: "🎁",
    title: "🎁 Daily & Quest Commands",
    body: [
      `\`${PREFIX} daily\` — claim daily reward`,
      `\`${PREFIX} quest\` — view daily quest board`,
      `\`${PREFIX} effect\` — view active effects/status`,
      `\`${PREFIX} instantquest <number>\` — premium quest skip`,
      `\`${PREFIX} iq <number>\` — short alias for instantquest`,
      "",
      "Mother Flame users can instantly complete premium daily quests.",
    ],
  },

  profile: {
    label: "Profile & Inventory",
    description: "Profile, inventory, leaderboard",
    emoji: "👤",
    title: "👤 Profile & Inventory",
    body: [
      `\`${PREFIX} profile\` — view profile`,
      `\`${PREFIX} inventory\` — view items, materials, tickets, boxes`,
      `\`${PREFIX} finv\` — view fragments`,
      `\`${PREFIX} all\` — view obtainable cards/items`,
      `\`${PREFIX} all boost\` — view all boost cards`,
      `\`${PREFIX} all weapon\` — view all weapons`,
      `\`${PREFIX} all fruit\` — view all devil fruits`,
      `\`${PREFIX} lb\` — leaderboard menu`,
    ],
  },

  premium: {
    label: "Premium",
    description: "Patreon and Mother Flame",
    emoji: "🔥",
    title: "🔥 Premium / Mother Flame",
    body: [
      `\`${PREFIX} patreon\` — view Patreon packages`,
      "",
      "## Mother Flame Perks",
      "• Pull all access",
      "• Premium fight cooldown",
      "• Extra pull slots",
      "• Premium treasure claim",
      "• Premium instant quest",
      "",
      "After payment, open a Discord ticket and send payment proof.",
    ],
  },
};

function buildEmbed(pageKey = "main") {
  const page = HELP_PAGES[pageKey] || HELP_PAGES.main;

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle(page.title)
    .setDescription(page.body.join("\n"))
    .setFooter({ text: "One Piece Bot • Help Menu" });
}

function buildMenu(selected = "main") {
  const options = Object.entries(HELP_PAGES).map(([value, page]) => ({
    label: page.label,
    description: page.description,
    value,
    emoji: page.emoji,
    default: value === selected,
  }));

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("help_menu")
        .setPlaceholder("Select help category")
        .addOptions(options)
    ),
  ];
}

module.exports = {
  name: "help",
  aliases: ["commands", "cmd", "h"],
  async execute(message) {
    let currentPage = "main";

    const sent = await message.reply({
      embeds: [buildEmbed(currentPage)],
      components: buildMenu(currentPage),
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can use this help menu.",
          ephemeral: true,
        });
      }

      currentPage = interaction.values?.[0] || "main";

      return interaction.update({
        embeds: [buildEmbed(currentPage)],
        components: buildMenu(currentPage),
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({ components: [] });
      } catch (_) {}
    });
  },
};