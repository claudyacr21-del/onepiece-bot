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
  UR: 8,
  SS: 7,
  S: 6,
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
};

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
  return String(item?.name || item?.displayName || item?.code || "Unknown Item").trim();
}

function getItemRarity(item) {
  return String(item?.rarity || item?.tier || "C").toUpperCase().trim();
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
  return Array.isArray(items)
    ? items
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

function isConsumable(item) {
  const code = String(item?.code || "").toLowerCase().trim();

  // Only real consumable items go here.
  // Universal fragments must stay in Items, not Consumables.
  return code === "rum_beer";
}

function isFragmentLikeItem(item) {
  const code = String(item?.code || "").toLowerCase().trim();
  const name = getItemName(item).toLowerCase();
  const type = String(item?.type || "").toLowerCase();
  const category = String(item?.category || "").toLowerCase();

  return (
    type === "fragment" ||
    category === "fragment" ||
    code.startsWith("universal_") ||
    code.includes("fragment") ||
    name.includes("fragment")
  );
}

function getInventoryLists(player) {
  const items = cleanList(player.items).filter((item) => !isFragmentLikeItem(item));

  return {
    fruit: cleanList(player.devilFruits),
    ticket: cleanList(player.tickets),
    box: cleanList(player.boxes),
    consum: cleanList(items.filter(isConsumable)),
    material: cleanList(player.materials),
    item: cleanList(items.filter((item) => !isConsumable(item))),
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