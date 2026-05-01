const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

const PREFIX = "op";

const HELP_PAGES = {
  main: {
    label: "Command List",
    description: "View the list of commands",
    emoji: "📜",
    title: "📜 Command List",
    body: [
      "Review the command list below.",
      `**Prefix:** \`${PREFIX}\``,
      "",
      "## COMMANDS",
      "",
      "**🎒 Items & Storage**",
      "`inventory` | view consumable items, materials, tickets, boxes",
      "`finv` | view your card fragments and storage",
      "`autosac` | view fragment auto-sacrifice settings",
      "`sac <card> <amount/all>` | sacrifice fragment card into berries",
      "`sacadd <card> <amount/all>` | add/remove card from autosac list",
      "`msac (luffy_5, zoro_2)` | multi-sacrifice fragments",
      "`all` | view all obtainable cards/items",
      "`all boost` | view all boost cards",
      "`all weapon` | view all weapons",
      "`all fruit` | view all devil fruits",
      "`market` | open the market",
      "",
      "**🃏 Cards & Pulls**",
      "`pull` | single pull",
      "`pa` | Mother Flame pull all",
      "`pullinfo` | check pull slots",
      "`ci <name>` | global card info",
      "`mci <name>` | owned item/card info",
      "`mc` | view your card collection",
      "`mc text` | compact text collection",
      "`mc boost` | view boost cards only",
      "`mc weapon` | view your weapon collection",
      "`awaken <card>` | awaken card stage",
      "`level frag <amount> <card>` | use fragments to level up a card",
      "`autolevel` | view auto-leveling list",
      "`aladd <card>` | add or remove a card from auto-leveling",
      "",
      "**⚔️ Battle & Raid**",
      "`fight` | manual fight",
      "`boss` | fight island boss",
      "`raid <boss>` | A/S raid",
      "`craid <boss>` | C/B common raid",
      "`killraid` | clear active raid room",
      "`arena` | ranked arena",
      "`challenge @user` | direct test battle",
      "",
      "**⛵ Progression**",
      "`ship` | view ship",
      "`ship upgrade` | upgrade current ship",
      "`shipupgrade` | standalone ship upgrade",
      "`travel` | view route/islands",
      "`travel <island>` | move island",
      "`sail` | sail to next route",
      "",
      "**👤 Profile & Leaderboard**",
      "`profile` | view profile",
      "`effect` | current effects/status",
      "`team` | view team",
      "`add <slot> <card>` | add a card to your team",
      "`remove <slot>` | remove one card from your team",
      "`remove all` | remove all cards from your team",
      "`lb` | open leaderboard menu",
      "",
      "**🔥 Patreon**",
      "`patreon` | view Patreon packages",
      "`instantquest <number>` / `iq <number>` | complete premium daily quest",
      "",
      "**Use the dropdown below for more details.**",
    ],
  },

  card: {
    label: "Cards / Pull Help",
    description: "Card, pull, awaken, fragment, and collection commands",
    emoji: "🃏",
    title: "🃏 Cards / Pull Help",
    body: [
      "**Cards**",
      "`op ci <name>` → global card viewer",
      "`op mci <name>` → your owned card / fruit / weapon viewer",
      "`op mc` → card collection viewer",
      "`op mc text` → compact card list",
      "`op mc boost` → boost card collection only",
      "`op mc weapon` → weapon collection viewer",
      "",
      "**Pulls**",
      "`op pull` → single pull",
      "`op pa` → Mother Flame pull all",
      "`op pullinfo` → check pull slot status",
      "",
      "**Awaken**",
      "`op awaken <card>` → awaken card to next form",
      "",
      "**Level Up**",
      "`op level frag <amount> <card>` → consume card fragments to increase card level",
      "`op autolevel` → view auto-leveling list",
      "`op aladd <card>` → add/remove card from auto-leveling list",
      "",
      "**Fragment Storage / Auto Sacrifice**",
      "`op finv` → view fragments and storage",
      "`op autosac` → view/toggle auto-sacrifice rarity settings",
      "`op sac <card> <amount/all>` → manually sacrifice fragment into berries",
      "`op sacadd <card> <amount/all>` → add/remove card from autosac list",
      "`op msac (luffy_5, zoro_2, nami_6)` → sacrifice multiple fragments at once",
      "",
      "**Notes**",
      "Battle and boost cards use **M1 / M2 / M3**.",
      "Pull result rarity should show the base M1 rarity.",
      "Duplicate cards become fragments if storage still has space.",
      "If fragment storage is full, duplicate fragments are converted into berries automatically.",
      "Cards or rarities enabled in `op autosac` are sacrificed automatically during `op pull` / `op pa`.",
    ],
  },

  storage: {
    label: "Storage / Sacrifice Help",
    description: "Fragment inventory, storage limit, autosac, and sacrifice commands",
    emoji: "💠",
    title: "💠 Storage / Sacrifice Help",
    body: [
      "**Fragment Inventory**",
      "`op finv` → view all card fragments and current storage",
      "",
      "**Auto Sacrifice**",
      "`op autosac` → open fragment auto-sacrifice menu",
      "`op sacadd <card name> <amount/all>` → add/remove specific card from autosac list",
      "",
      "**Manual Sacrifice**",
      "`op sac <card name> <amount/all>` → sacrifice one card fragment type into berries",
      "`op msac (luffy_5, zoro_2, nami_6)` → sacrifice multiple card fragments in one command",
      "",
      "**Rarity Buttons**",
      "Inside `op autosac`, click rarity buttons like **C**, **B**, **A**, or **S**.",
      "Green means that rarity is enabled for autosac.",
      "Red means that rarity is disabled.",
      "",
      "**Storage Rule**",
      "Base fragment storage is **200**.",
      "Fragment storage can increase from active boost effects.",
      "When storage is full, new duplicate fragments from `op pull` / `op pa` are automatically converted into berries.",
      "",
      "**Examples**",
      "`op sac luffy 5`",
      "`op sac zoro all`",
      "`op sacadd nami all`",
      "`op msac (luffy_5, zoro_2, nami_6)`",
    ],
  },

  equipment: {
    label: "Equipment Help",
    description: "Weapon, fruit, upgrade, and unequip commands",
    emoji: "🛡️",
    title: "🛡️ Equipment Help",
    body: [
      "**Weapon**",
      "`op wp <card> <weapon>` → equip weapon",
      "`op unequip <card>` → unequip weapon for 200 gems",
      "`op wupgrade <weapon>` → upgrade weapon globally",
      "",
      "**Devil Fruit**",
      "`op df <card> <fruit>` → equip devil fruit",
      "",
      "**Notes**",
      "Weapons can be equipped to any character.",
      "Owner characters can receive owner bonus if the weapon has one.",
      "Weapon and fruit stat bonuses use percentage stats.",
      "Equipped weapon/fruit power is added to card power.",
    ],
  },

  battle: {
    label: "Battle Help",
    description: "Fight, boss, arena, and leaderboard commands",
    emoji: "⚔️",
    title: "⚔️ Battle Help",
    body: [
      "**PvE**",
      "`op fight` → manual fight",
      "`op boss` → fight current island boss",
      "`op team` → view current team",
      "`op add <slot> <card>` → add a card to your team",
      "`op remove <slot>` → remove one card from your team",
      "`op remove all` → clear your whole team",
      "",
      "**PvP**",
      "`op arena` → ranked random arena",
      "`op challenge @user` → direct test battle",
      "",
      "**Leaderboard**",
      "`op lb` → open leaderboard menu",
      "",
      "**Notes**",
      "Fight stats use your synced card stats plus active boost card effects.",
      "If no interaction happens in fight for 5 minutes, it counts as a loss.",
      "Max level cards do not gain EXP.",
    ],
  },

  raid: {
    label: "Raid Help",
    description: "Raid, common raid, room, and party commands",
    emoji: "🏴‍☠️",
    title: "🏴‍☠️ Raid Help",
    body: [
      "**Raid Rooms**",
      "`op craid <boss>` → C/B boss raid using Common Raid Ticket",
      "`op raid <boss>` → A/S boss raid using Raid Ticket",
      "`op killraid` → close active raid room",
      "",
      "**Rules**",
      "Host ticket is consumed when room is created.",
      "Max 10 users including host.",
      "Each user joins with 1 battle card.",
      "Same character code cannot be used twice.",
      "",
      "**Party Team**",
      "`op rtadd <user>` → add user to party team",
      "`op rtremove <user>` → remove user from party team",
      "`op rtdelete` → clear party team",
      "`op rt` → show team/room info",
      "`op rm` → show missing users in active room",
    ],
  },

  quest: {
    label: "Quest / Daily Help",
    description: "Daily, quest, effect, and reward commands",
    emoji: "✨",
    title: "✨ Quest / Daily Help",
    body: [
      "**Daily / Quest**",
      "`op daily` → claim daily reward",
      "`op quest` → view daily quest board",
      "`op instantquest <number>` / `op iq <number>` → instantly complete 1 daily quest",
      "`op effect` → view current effects and status",
      "",
      "**Boost Effects**",
      "Boost cards can affect ATK, HP, SPD, EXP, DMG, Daily rewards, Pull chance, and Fragment storage.",
      "",
      "**Tickets**",
      "Common Raid Ticket and Raid Ticket can drop from pulls.",
      "Pull Reset Ticket currently comes from daily rewards.",
    ],
  },

  patreon: {
    label: "Patreon Help",
    description: "Premium packages, Mother Flame, and claims",
    emoji: "🔥",
    title: "🔥 Patreon Help",
    body: [
      "**Patreon Packages**",
      "`op patreon` → view Patreon purchase packages",
      "",
      "**Mother Flame Premium**",
      "Mother Flame is the premium support package.",
      "After payment, open a ticket in the Discord server and send:",
      "• Patreon order proof",
      "• Payment proof",
      "",
      "Admin will manually verify your proof and activate your Mother Flame role for 30 days.",
      "",
      "**Mother Flame Perks**",
      "• `op pa` access",
      "• S pity at 100",
      "• Extra pull slots",
      "• Premium fight cooldown",
      "• `op treasure` premium treasure claim",
      "• `op instantquest` / `op iq` premium daily quest skip",
      "",
      "**Instant Quest**",
      "`op iq 1` → instantly complete daily quest #1",
      "`op iq 2` → instantly complete daily quest #2",
      "Mother Flame users can instantly complete up to 2 daily quests per day.",
    ],
  },

  travel: {
    label: "Travel / Ship Help",
    description: "Ship, travel, island, and route commands",
    emoji: "⛵",
    title: "⛵ Travel / Ship Help",
    body: [
      "**Ship**",
      "`op ship` → view current ship",
      "`op ship upgrade` → upgrade ship",
      "`op shipupgrade` → standalone ship upgrade command",
      "",
      "**Travel**",
      "`op travel` → view unlocked islands and route",
      "`op travel <island>` → move to island",
      "`op sail` → sail to next route if requirements are met",
      "",
      "**Notes**",
      "Some islands require higher ship tier.",
      "Ship upgrades use berries and materials.",
    ],
  },

  trade: {
    label: "Trade / Market Help",
    description: "Market and trade commands",
    emoji: "💱",
    title: "💱 Trade / Market Help",
    body: [
      "**Market**",
      "`op market` → open market",
      "`op market buy <item>` → buy item",
      "",
      "**Trade**",
      "`op trade @user (your offer) (their offer)`",
      "",
      "**Notes**",
      "Tickets are untradeable.",
      "Materials, cards, fruits, and weapons depend on your trade logic/settings.",
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
  const options = Object.entries(HELP_PAGES).map(([value, page]) => {
    const option = {
      label: page.label,
      description: page.description,
      value,
      default: value === selected,
    };

    if (page.emoji) option.emoji = page.emoji;

    return option;
  });

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("help_menu")
        .setPlaceholder("Select a topic to see more information")
        .addOptions(options)
    ),
  ];
}

module.exports = {
  name: "help",
  aliases: ["commands", "cmd"],

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
      } catch {}
    });
  },
};