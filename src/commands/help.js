const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const PREFIX = "op";
const COLOR = 0x8e44ad;

const HELP_PAGES = {
  main: {
    label: "Overview",
    description: "Main help menu",
    emoji: "🏴‍☠️",
    title: "🏴‍☠️ One Piece Bot Help",
    body: [
      `**Prefix:** \`${PREFIX}\``,
      "",
      "Pilih kategori command lewat menu di bawah.",
      "",
      "**Main Menu**",
      "🃏 **Cards & Pulls** — pull, card info, collection, awaken",
      "💠 **Storage & Sacrifice** — finv, autosac, sac, msac",
      "⚔️ **Battle** — fight, boss, arena, challenge",
      "🏴‍☠️ **Raid & Team** — raid room dan raid team",
      "🛒 **Market** — shop dan material box",
      "🛡️ **Equipment** — weapon, fruit, upgrade",
      "⛵ **Progression** — ship, travel, sail",
      "✨ **Daily & Quest** — daily, quest, effect",
      "👤 **Profile & Inventory** — profile, inventory, leaderboard",
      "🔥 **Premium** — Patreon dan Mother Flame",
      "",
      `Gunakan format: \`${PREFIX} command\``,
    ],
  },

  cards: {
    label: "Cards & Pulls",
    description: "Pull, collection, card info, awaken",
    emoji: "🃏",
    title: "🃏 Cards & Pulls",
    body: [
      "**Pull Commands**",
      `\`${PREFIX} pull\` — single pull`,
      `\`${PREFIX} pa\` — Mother Flame pull all`,
      `\`${PREFIX} pullinfo\` — check pull slot status`,
      "",
      "**Card Info**",
      `\`${PREFIX} ci <name>\` — global card info`,
      `\`${PREFIX} mci <name>\` — owned card / item info`,
      "",
      "**Collection**",
      `\`${PREFIX} mc\` — card collection`,
      `\`${PREFIX} mc text\` — compact card list`,
      `\`${PREFIX} mc boost\` — boost cards only`,
      `\`${PREFIX} mc weapon\` — weapon collection`,
      "",
      "**Upgrade**",
      `\`${PREFIX} awaken <card>\` — awaken card`,
      `\`${PREFIX} level frag <amount> <card>\` — level up using fragments`,
      `\`${PREFIX} autolevel\` — view auto-level list`,
      `\`${PREFIX} aladd <card>\` — add / remove card from auto-level`,
    ],
  },

  storage: {
    label: "Storage & Sacrifice",
    description: "Fragment storage and autosac",
    emoji: "💠",
    title: "💠 Storage & Sacrifice",
    body: [
      "**Fragment Inventory**",
      `\`${PREFIX} finv\` — view fragments and storage`,
      "",
      "**Auto Sacrifice**",
      `\`${PREFIX} autosac\` — open autosac settings`,
      `\`${PREFIX} sacadd <card> <amount/all>\` — add / remove card from autosac list`,
      "",
      "**Manual Sacrifice**",
      `\`${PREFIX} sac <card> <amount/all>\` — sacrifice fragment into berries`,
      `\`${PREFIX} msac (luffy_5, zoro_2, nami_6)\` — multi sacrifice fragments`,
      "",
      "**Storage Rule**",
      "Base fragment storage: **200**",
      "If storage is full, new duplicate fragments from pull / pa will auto-convert into berries.",
      "",
      "**Autosac Button Rule**",
      "🟢 Green = enabled",
      "🔴 Red = disabled",
      "",
      "**Examples**",
      `\`${PREFIX} sac luffy 5\``,
      `\`${PREFIX} sac zoro all\``,
      `\`${PREFIX} sacadd nami all\``,
      `\`${PREFIX} msac (luffy_5, zoro_2, nami_6)\``,
    ],
  },

  battle: {
    label: "Battle",
    description: "Fight, boss, arena, challenge",
    emoji: "⚔️",
    title: "⚔️ Battle Commands",
    body: [
      "**Fight**",
      `\`${PREFIX} fight\` / \`${PREFIX} f\` — manual island fight`,
      "",
      "**Boss**",
      `\`${PREFIX} boss\` — fight current island boss`,
      `\`${PREFIX} boss 1\` — choose phase 1 boss`,
      `\`${PREFIX} boss 2\` — choose phase 2 boss`,
      "",
      "**PvP**",
      `\`${PREFIX} arena\` — ranked arena`,
      `\`${PREFIX} challenge @user\` — direct test battle`,
      "",
      "**Team**",
      `\`${PREFIX} team\` — view battle team`,
      `\`${PREFIX} add <slot> <card>\` — add card to team`,
      `\`${PREFIX} remove <slot>\` — remove card from slot`,
      `\`${PREFIX} remove all\` — clear battle team`,
    ],
  },

  raid: {
    label: "Raid & Team",
    description: "Raid rooms and saved raid team",
    emoji: "🏴‍☠️",
    title: "🏴‍☠️ Raid & Team Commands",
    body: [
      "**Raid Rooms**",
      `\`${PREFIX} craid <boss>\` — C / B common raid`,
      `\`${PREFIX} raid <boss>\` — A / S raid`,
      `\`${PREFIX} killraid\` — close active raid room`,
      "",
      "**Saved Raid Team**",
      `\`${PREFIX} rtadd @user\` — add user to saved raid team`,
      `\`${PREFIX} rtremove @user\` — remove user from saved raid team`,
      `\`${PREFIX} rtdelete\` — clear saved raid team`,
      `\`${PREFIX} rt\` — show raid team / room info`,
      `\`${PREFIX} rm\` — show missing active raid users`,
      "",
      "**Rules**",
      "Raid room uses 1 battle card per user.",
      "Boss phase 2 uses saved raid team users with 3 cards each.",
    ],
  },

  market: {
    label: "Market",
    description: "Shop and buy items",
    emoji: "🛒",
    title: "🛒 Market Commands",
    body: [
      "**View Market**",
      `\`${PREFIX} market\` — show available shop items`,
      "",
      "**Buy Items**",
      `\`${PREFIX} buy wooden\` — buy 1 Wooden Material Box`,
      `\`${PREFIX} buy iron 3\` — buy 3 Iron Material Boxes`,
      `\`${PREFIX} buy royal 10\` — buy 10 Royal Material Boxes`,
      "",
      "**Format**",
      `\`${PREFIX} buy <item> <amount>\``,
      "",
      "If amount is empty, amount will be 1.",
    ],
  },

  equipment: {
    label: "Equipment",
    description: "Weapon, fruit, upgrade, unequip",
    emoji: "🛡️",
    title: "🛡️ Equipment Commands",
    body: [
      "**Weapon**",
      `\`${PREFIX} wp <card> <weapon>\` — equip weapon`,
      `\`${PREFIX} unequip <card>\` — unequip weapon for gems`,
      `\`${PREFIX} wupgrade <weapon>\` — upgrade weapon`,
      "",
      "**Devil Fruit**",
      `\`${PREFIX} df <card> <fruit>\` — equip devil fruit`,
      "",
      "**Notes**",
      "Weapon and fruit bonuses are added to card power.",
      "Equipped item stats are synced into battle power.",
    ],
  },

  progression: {
    label: "Progression",
    description: "Ship, travel, island, sail",
    emoji: "⛵",
    title: "⛵ Progression Commands",
    body: [
      "**Ship**",
      `\`${PREFIX} ship\` — view ship`,
      `\`${PREFIX} ship upgrade\` — upgrade current ship`,
      `\`${PREFIX} shipupgrade\` — standalone ship upgrade`,
      "",
      "**Travel**",
      `\`${PREFIX} travel\` — view unlocked islands`,
      `\`${PREFIX} travel <island>\` — move to island`,
      `\`${PREFIX} sail\` — sail to next route`,
      "",
      "**Notes**",
      "Some islands require higher ship tier.",
      "Ship upgrades use berries and materials.",
    ],
  },

  daily: {
    label: "Daily & Quest",
    description: "Daily reward, quest, effects",
    emoji: "✨",
    title: "✨ Daily & Quest Commands",
    body: [
      "**Daily**",
      `\`${PREFIX} daily\` — claim daily reward`,
      "",
      "**Quest**",
      `\`${PREFIX} quest\` — view daily quest board`,
      `\`${PREFIX} effect\` — view active effects / status`,
      "",
      "**Premium Quest Skip**",
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
      "**Profile**",
      `\`${PREFIX} profile\` — view profile`,
      `\`${PREFIX} lb\` — leaderboard menu`,
      "",
      "**Inventory**",
      `\`${PREFIX} inventory\` — view items, materials, tickets, boxes`,
      `\`${PREFIX} finv\` — view fragments and storage`,
      "",
      "**Global Lists**",
      `\`${PREFIX} all\` — view obtainable cards / items`,
      `\`${PREFIX} all boost\` — view all boost cards`,
      `\`${PREFIX} all weapon\` — view all weapons`,
      `\`${PREFIX} all fruit\` — view all devil fruits`,
    ],
  },

  premium: {
    label: "Premium",
    description: "Patreon and Mother Flame",
    emoji: "🔥",
    title: "🔥 Premium / Mother Flame",
    body: [
      "**Patreon**",
      `\`${PREFIX} patreon\` — view Patreon packages`,
      "",
      "**Mother Flame Perks**",
      "• Pull all access",
      "• Premium fight cooldown",
      "• Extra pull slots",
      "• Premium treasure claim",
      "• Premium instant quest",
      "• Better pity system",
      "",
      "After payment, open a Discord ticket and send payment proof.",
    ],
  },
};

function getServerIcon(message) {
  return (
    message.guild?.iconURL({ extension: "png", size: 512 }) ||
    message.client.user?.displayAvatarURL({ extension: "png", size: 512 }) ||
    null
  );
}

function getUserAvatar(message) {
  return message.author.displayAvatarURL({
    extension: "png",
    size: 512,
  });
}

function buildEmbed(message, pageKey = "main") {
  const page = HELP_PAGES[pageKey] || HELP_PAGES.main;
  const userAvatar = getUserAvatar(message);

  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(page.title)
    .setDescription(page.body.join("\n"))
    .setThumbnail(userAvatar)
    .setFooter({
      text: `${message.author.username} • Help Menu`,
      iconURL: userAvatar,
    });
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
      embeds: [buildEmbed(message, currentPage)],
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
        embeds: [buildEmbed(message, currentPage)],
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