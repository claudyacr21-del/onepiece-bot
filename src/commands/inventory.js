const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { getPlayer } = require("../playerStore");

const COLOR = 0x3498db;
const PAGE_SIZE = 12;

const RARITY_ORDER = {
  UR: 6,
  SS: 5,
  S: 4,
  A: 3,
  B: 2,
  C: 1,
};

const CANONICAL_ITEM_META = {
  common_raid_ticket: {
    name: "Common Raid Ticket",
    rarity: "B",
    type: "Ticket",
    tradeable: true,
    untradeable: false,
  },
  raid_ticket: {
    name: "Raid Ticket",
    rarity: "A",
    type: "Ticket",
    tradeable: true,
    untradeable: false,
  },
  gold_raid_ticket: {
    name: "Gold Raid Ticket",
    rarity: "S",
    type: "Ticket",
    tradeable: true,
    untradeable: false,
  },
  empty_throne_raid_writ: {
    name: "Empty Throne Raid Writ",
    rarity: "S",
    type: "Ticket",
    tradeable: true,
    untradeable: false,
  },
  mythic_raid_ticket: {
    name: "Mythic Raid Ticket",
    rarity: "UR",
    type: "Ticket",
    tradeable: true,
    untradeable: false,
  },

  pull_reset_ticket: {
    name: "Pull Reset Ticket",
    rarity: "A",
    type: "Ticket",
    tradeable: true,
    untradeable: false,
  },

  rare_resource_box: {
    name: "Rare Resource Box",
    rarity: "B",
    type: "Box",
    tradeable: false,
    untradeable: true,
  },
  elite_resource_box: {
    name: "Elite Resource Box",
    rarity: "A",
    type: "Box",
    tradeable: false,
    untradeable: true,
  },
  legend_resource_box: {
    name: "Legend Resource Box",
    rarity: "S",
    type: "Box",
    tradeable: false,
    untradeable: true,
  },
};

function getCanonicalItemMeta(item) {
  const code = String(item?.code || "").toLowerCase().trim();
  return CANONICAL_ITEM_META[code] || null;
}

function normalizeInventoryItem(item) {
  if (!item || typeof item !== "object") return item;

  const meta = getCanonicalItemMeta(item);
  if (!meta) return item;

  return {
    ...item,
    name: item.name || meta.name,
    rarity: meta.rarity || item.rarity,
    type: meta.type || item.type,
    tradeable:
      typeof meta.tradeable === "boolean" ? meta.tradeable : item.tradeable,
    untradeable:
      typeof meta.untradeable === "boolean" ? meta.untradeable : item.untradeable,
  };
}

function normalizeInventoryList(items) {
  return Array.isArray(items) ? items.map(normalizeInventoryItem) : [];
}

function normalizeBoxItem(item) {
  if (!item || typeof item !== "object") return item;

  const normalized = normalizeInventoryItem(item);

  return {
    ...normalized,
    type: normalized.type || "Box",
    tradeable: false,
    untradeable: true,
  };
}

const CATEGORY_CONFIG = {
  main: {
    label: "Overview",
    description: "Inventory category menu",
    emoji: "🎒",
    title: "🎒 Inventory Menu",
  },
  fruit: {
    label: "Devil Fruits",
    description: "View all Devil Fruits",
    emoji: "🍈",
    title: "🍈 Devil Fruits",
  },
  ticket: {
    label: "Tickets",
    description: "View all Tickets",
    emoji: "🎟️",
    title: "🎟️ Tickets",
  },
  box: {
    label: "Boxes",
    description: "View all Boxes",
    emoji: "🎁",
    title: "🎁 Boxes",
  },
  consum: {
    label: "Consumables",
    description: "View all Consumables",
    emoji: "🍺",
    title: "🍺 Consumables",
  },
  material: {
    label: "Materials",
    description: "View all Materials",
    emoji: "🧱",
    title: "🧱 Materials",
  },
  item: {
    label: "Items",
    description: "View all other Items",
    emoji: "📦",
    title: "📦 Items",
  },
};

const CATEGORY_ALIASES = {
  fruits: "fruit",
  devilfruit: "fruit",
  devilfruits: "fruit",
  df: "fruit",

  tickets: "ticket",
  t: "ticket",

  boxes: "box",
  b: "box",

  consumable: "consum",
  consumables: "consum",
  consume: "consum",
  c: "consum",

  materials: "material",
  mat: "material",
  mats: "material",
  m: "material",

  items: "item",
  i: "item",
};

function normalizeCategory(raw) {
  const value = String(raw || "main").toLowerCase().trim();

  if (CATEGORY_CONFIG[value]) return value;
  if (CATEGORY_ALIASES[value]) return CATEGORY_ALIASES[value];

  return "main";
}

function getDisplayName(message, player) {
  return player?.username || message.member?.displayName || message.author.username;
}

function getAvatar(message) {
  return (
    message.member?.displayAvatarURL({
      extension: "png",
      size: 512,
    }) ||
    message.author.displayAvatarURL({
      extension: "png",
      size: 512,
    })
  );
}

function getItemName(item) {
  const normalized = normalizeInventoryItem(item);

  return String(
    normalized?.name ||
      normalized?.displayName ||
      normalized?.code ||
      "Unknown Item"
  ).trim();
}

function getItemRarity(item) {
  const normalized = normalizeInventoryItem(item);

  return String(normalized?.rarity || normalized?.tier || "C")
    .toUpperCase()
    .trim();
}

function getRarityRank(item) {
  return RARITY_ORDER[getItemRarity(item)] || 0;
}

function rarityText(item) {
  const rarity = getItemRarity(item);
  return rarity ? ` [${rarity}]` : "";
}

function amountText(item) {
  return `x${Number(item?.amount || 0).toLocaleString("en-US")}`;
}

function cleanList(items) {
  const normalizedItems = normalizeInventoryList(items);

  return Array.isArray(normalizedItems)
    ? normalizedItems
        .filter((item) => item && Number(item?.amount || 0) > 0)
        .slice()
        .sort((a, b) => {
          const rarityDiff = getRarityRank(b) - getRarityRank(a);
          if (rarityDiff !== 0) return rarityDiff;

          const amountDiff = Number(b.amount || 0) - Number(a.amount || 0);
          if (amountDiff !== 0) return amountDiff;

          return getItemName(a).localeCompare(getItemName(b));
        })
    : [];
}

function isTicketItem(item) {
  const code = String(item?.code || "").toLowerCase().trim();
  const type = String(item?.type || "").toLowerCase().trim();
  const name = getItemName(item).toLowerCase();

  return (
    type === "ticket" ||
    code.endsWith("_ticket") ||
    code === "pull_reset_ticket" ||
    code === "raid_ticket" ||
    code === "gold_raid_ticket" ||
    code === "common_raid_ticket" ||
    code === "mythic_raid_ticket" ||
    name.includes("ticket")
  );
}

function isConsumable(item) {
  const code = String(item?.code || "").toLowerCase().trim();
  // Only real consumable items go here.
  // Universal fragments must stay in Items, not Consumables.
  return code === "rum_beer";
}


function addLegacyTicketEntry(entries, player, keys, ticket) {
  const amount = keys.reduce((total, key) => {
    const raw = player?.[key];
    if (typeof raw === "number") return total + raw;
    if (typeof raw === "string" && raw.trim() && !Number.isNaN(Number(raw))) {
      return total + Number(raw);
    }
    return total;
  }, 0);

  const safeAmount = Math.max(0, Math.floor(Number(amount || 0)));
  if (safeAmount <= 0) return;

  const existing = entries.find((entry) => String(entry.code || "") === ticket.code);
  if (existing) {
    existing.amount = Number(existing.amount || 0) + safeAmount;
    return;
  }

  entries.push({
    ...ticket,
    amount: safeAmount,
  });
}

function getLegacyTicketEntries(player) {
  const entries = [];

  addLegacyTicketEntry(entries, player, [
    "raidTickets",
    "raidTicket",
    "raid_ticket",
    "raid_ticket_count",
  ], {
    name: "Raid Ticket",
    code: "raid_ticket",
    rarity: "A",
    type: "Ticket",
  });

  addLegacyTicketEntry(entries, player, [
    "goldRaidTickets",
    "goldRaidTicket",
    "gold_raid_ticket",
    "gold_raid_ticket_count",
  ], {
    name: "Gold Raid Ticket",
    code: "gold_raid_ticket",
    rarity: "S",
    type: "Ticket",
  });

  addLegacyTicketEntry(entries, player, [
    "commonRaidTickets",
    "commonRaidTicket",
    "common_raid_ticket",
    "common_raid_ticket_count",
  ], {
    name: "Common Raid Ticket",
    code: "common_raid_ticket",
    rarity: "B",
    type: "Ticket",
  });

  addLegacyTicketEntry(entries, player, [
    "mythicRaidTickets",
    "mythicRaidTicket",
    "mythic_raid_ticket",
    "mythic_raid_ticket_count",
  ], {
    name: "Mythic Raid Ticket",
    code: "mythic_raid_ticket",
    rarity: "UR",
    type: "Ticket",
  });

  addLegacyTicketEntry(entries, player, [
    "pullResetTickets",
    "pullResetTicket",
    "pull_reset_ticket",
    "pull_reset_ticket_count",
  ], {
    name: "Pull Reset Ticket",
    code: "pull_reset_ticket",
    rarity: "A",
    type: "Ticket",
  });

  return entries;
}

function getInventoryLists(player) {
  const items = cleanList(player.items);
  const itemTickets = items.filter(isTicketItem);
  const realItems = items.filter(
    (item) => !isConsumable(item) && !isTicketItem(item)
  );

  const tickets = cleanList([
    ...(player.tickets || []),
    ...itemTickets,
    ...getLegacyTicketEntries(player),
  ]);

  const boxes = cleanList(player.boxes).map(normalizeBoxItem);

  return {
    fruit: cleanList(player.devilFruits),
    ticket: tickets,
    box: boxes,
    consum: cleanList(items.filter(isConsumable)),
    material: cleanList(player.materials),
    item: cleanList(realItems),
  };
}

function formatItemLine(item, index) {
  return `**${index + 1}.** ${getItemName(item)} ${amountText(item)}${rarityText(item)}`;
}

function getTotalPages(list) {
  return Math.max(1, Math.ceil(list.length / PAGE_SIZE));
}

function clampPage(page, totalPages) {
  return Math.max(0, Math.min(Number(page || 0), totalPages - 1));
}

function buildMenu(selected = "main") {
  const options = Object.entries(CATEGORY_CONFIG).map(([value, page]) => ({
    label: page.label,
    description: page.description,
    value,
    emoji: page.emoji,
    default: value === selected,
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("inv_menu")
      .setPlaceholder("Select inventory category")
      .addOptions(options)
  );
}

function buildPageButtons(category, page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("inv_prev")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(category === "main" || page <= 0),
    new ButtonBuilder()
      .setCustomId("inv_next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(category === "main" || page >= totalPages - 1)
  );
}

function buildComponents(category, page, totalPages) {
  return [buildMenu(category), buildPageButtons(category, page, totalPages)];
}

function buildInventoryEmbed(message, player, category = "main", page = 0) {
  const selected = normalizeCategory(category);
  const avatar = getAvatar(message);
  const displayName = getDisplayName(message, player);
  const lists = getInventoryLists(player);

  if (selected === "main") {
    const total =
      lists.fruit.length +
      lists.ticket.length +
      lists.box.length +
      lists.consum.length +
      lists.material.length +
      lists.item.length;

    return new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`${displayName}'s Inventory`)
      .setDescription(
        [
          "Select an inventory category from the menu below.",
          "",
          "**Categories**",
          `🍈 Devil Fruits: **${lists.fruit.length}**`,
          `🎟️ Tickets: **${lists.ticket.length}**`,
          `🎁 Boxes: **${lists.box.length}**`,
          `🍺 Consumables: **${lists.consum.length}**`,
          `🧱 Materials: **${lists.material.length}**`,
          `📦 Items: **${lists.item.length}**`,
          "",
          `**Total Entries:** ${total}`,
          "",
          "**Quick Commands**",
          "`op inv fruit`",
          "`op inv ticket`",
          "`op inv box`",
          "`op inv consum`",
          "`op inv material`",
          "`op inv item`",
        ].join("\n")
      )
      .setThumbnail(avatar)
      .setFooter({
        text: `${displayName} • Inventory Menu`,
        iconURL: avatar,
      });
  }

  const config = CATEGORY_CONFIG[selected] || CATEGORY_CONFIG.main;
  const list = lists[selected] || [];
  const totalPages = getTotalPages(list);
  const safePage = clampPage(page, totalPages);
  const start = safePage * PAGE_SIZE;
  const shown = list.slice(start, start + PAGE_SIZE);
  const lines = shown.map((item, index) => formatItemLine(item, start + index));

  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`${config.title}`)
    .setDescription(
      [
        `Owner: **${displayName}**`,
        `Total: **${list.length}**`,
        `Page: **${safePage + 1}/${totalPages}**`,
        "",
        list.length
          ? lines.join("\n")
          : `No ${config.label.toLowerCase()} owned.`,
      ].join("\n")
    )
    .setThumbnail(avatar)
    .setFooter({
      text: `${displayName} • Sorted by rarity`,
      iconURL: avatar,
    });
}

module.exports = {
  name: "inv",
  aliases: ["inventory", "bag"],

  async execute(message, args = []) {
    let currentCategory = normalizeCategory(args[0]);
    let currentPage = 0;

    const player = getPlayer(message.author.id, message.author.username);
    const lists = getInventoryLists(player);
    const totalPages = getTotalPages(lists[currentCategory] || []);

    const sent = await message.reply({
      embeds: [buildInventoryEmbed(message, player, currentCategory, currentPage)],
      components: buildComponents(currentCategory, currentPage, totalPages),
    });

    const collector = sent.createMessageComponentCollector({
      time: 5 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can use this inventory menu.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const freshPlayer = getPlayer(message.author.id, message.author.username);
      const freshLists = getInventoryLists(freshPlayer);

      if (interaction.isStringSelectMenu() && interaction.customId === "inv_menu") {
        currentCategory = normalizeCategory(interaction.values?.[0]);
        currentPage = 0;
      }

      if (interaction.isButton()) {
        const list = freshLists[currentCategory] || [];
        const pages = getTotalPages(list);

        if (interaction.customId === "inv_prev") {
          currentPage = clampPage(currentPage - 1, pages);
        }

        if (interaction.customId === "inv_next") {
          currentPage = clampPage(currentPage + 1, pages);
        }
      }

      const list = freshLists[currentCategory] || [];
      const pages = getTotalPages(list);
      currentPage = clampPage(currentPage, pages);

      return interaction.update({
        embeds: [buildInventoryEmbed(message, freshPlayer, currentCategory, currentPage)],
        components: buildComponents(currentCategory, currentPage, pages),
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({
          components: [],
        });
      } catch (_) {}
    });
  },
};