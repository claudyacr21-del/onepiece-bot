const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");
const { getPlayer } = require("../playerStore");

const COLOR = 0x3498db;
const PAGE_SIZE = 15;

const CATEGORY_CONFIG = {
  main: {
    label: "Overview",
    description: "Inventory category menu",
    emoji: "🎒",
    title: "🎒 Inventory Menu",
  },
  fruit: {
    label: "Devil Fruits",
    description: "View your Devil Fruits",
    emoji: "🍈",
    title: "🍈 Devil Fruits",
  },
  ticket: {
    label: "Tickets",
    description: "View your tickets",
    emoji: "🎟️",
    title: "🎟️ Tickets",
  },
  box: {
    label: "Boxes",
    description: "View your boxes",
    emoji: "🎁",
    title: "🎁 Boxes",
  },
  consum: {
    label: "Consumables",
    description: "View consumable items",
    emoji: "🍺",
    title: "🍺 Consumables",
  },
  material: {
    label: "Materials",
    description: "View materials",
    emoji: "🧱",
    title: "🧱 Materials",
  },
  item: {
    label: "Items",
    description: "View other items",
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

function getMemberAvatar(message) {
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

function getDisplayName(message, player) {
  return player?.username || message.member?.displayName || message.author.username;
}

function getItemName(item) {
  return String(item?.name || item?.displayName || item?.code || "Unknown Item").trim();
}

function rarityText(item) {
  return item?.rarity ? ` [${String(item.rarity).toUpperCase()}]` : "";
}

function amountText(item) {
  return `x${Number(item?.amount || 0).toLocaleString("en-US")}`;
}

function cleanList(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && Number(item?.amount || 0) > 0)
        .slice()
        .sort((a, b) => getItemName(a).localeCompare(getItemName(b)))
    : [];
}

function isConsumable(item) {
  const code = String(item?.code || "").toLowerCase();
  const type = String(item?.type || "").toLowerCase();
  const category = String(item?.category || "").toLowerCase();

  return (
    code === "rum_beer" ||
    type === "consumable" ||
    category === "consumable" ||
    category === "consumables"
  );
}

function getInventoryLists(player) {
  const items = cleanList(player.items);

  return {
    fruit: cleanList(player.devilFruits),
    ticket: cleanList(player.tickets),
    box: cleanList(player.boxes),
    consum: items.filter(isConsumable),
    material: cleanList(player.materials),
    item: items.filter((item) => !isConsumable(item)),
  };
}

function normalizeCategory(raw) {
  const value = String(raw || "main").toLowerCase().trim();

  if (CATEGORY_CONFIG[value]) return value;
  if (CATEGORY_ALIASES[value]) return CATEGORY_ALIASES[value];

  return "main";
}

function formatItemLine(item, index) {
  return `${index + 1}. ${getItemName(item)} ${amountText(item)}${rarityText(item)}`;
}

function buildMenu(selected = "main") {
  const options = Object.entries(CATEGORY_CONFIG).map(([value, page]) => ({
    label: page.label,
    description: page.description,
    value,
    emoji: page.emoji,
    default: value === selected,
  }));

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("inv_menu")
        .setPlaceholder("Select inventory category")
        .addOptions(options)
    ),
  ];
}

function buildInventoryEmbed(message, player, category = "main") {
  const selected = normalizeCategory(category);
  const avatar = getMemberAvatar(message);
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
          "**Available Categories**",
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
  const shown = list.slice(0, PAGE_SIZE);
  const hidden = Math.max(0, list.length - shown.length);

  const lines = shown.map(formatItemLine);

  if (hidden > 0) {
    lines.push(`...and ${hidden} more item(s).`);
  }

  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`${config.title}`)
    .setDescription(
      [
        `Owner: **${displayName}**`,
        `Total: **${list.length}**`,
        "",
        list.length ? lines.join("\n") : `No ${config.label.toLowerCase()} owned.`,
      ].join("\n")
    )
    .setThumbnail(avatar)
    .setFooter({
      text: `${displayName} • Inventory`,
      iconURL: avatar,
    });
}

module.exports = {
  name: "inv",
  aliases: ["inventory", "bag"],

  async execute(message, args = []) {
    const player = getPlayer(message.author.id, message.author.username);
    let currentCategory = normalizeCategory(args[0]);

    const sent = await message.reply({
      embeds: [buildInventoryEmbed(message, player, currentCategory)],
      components: buildMenu(currentCategory),
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

      currentCategory = normalizeCategory(interaction.values?.[0]);

      const freshPlayer = getPlayer(message.author.id, message.author.username);

      return interaction.update({
        embeds: [buildInventoryEmbed(message, freshPlayer, currentCategory)],
        components: buildMenu(currentCategory),
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