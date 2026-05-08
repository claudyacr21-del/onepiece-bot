const { EmbedBuilder } = require("discord.js");
const { readPlayers, writePlayers } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");
const { readRedeemCodes, writeRedeemCodes } = require("../utils/redeemCodeStore");

function getAdminIds() {
  return String(
    process.env.ADMIN_USER_IDS ||
      process.env.DISCORD_OWNER_ID ||
      process.env.BOT_OWNER_ID ||
      ""
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function isAdmin(userId) {
  return getAdminIds().includes(String(userId));
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function parsePositiveDays(value) {
  const days = Math.floor(Number(value || 0));
  return Number.isFinite(days) && days > 0 ? days : 0;
}

function isRedeemCodeExpired(entry) {
  const expiresAt = Number(entry?.expiresAt || 0);
  return expiresAt > 0 && expiresAt <= Date.now();
}

function getRedeemCodeStatus(entry) {
  if (!entry) return "Invalid";
  if (entry.active === false) return "Disabled";
  if (isRedeemCodeExpired(entry)) return "Expired";
  return "Active";
}

function formatExpiryText(entry) {
  const expiresAt = Number(entry?.expiresAt || 0);

  if (!expiresAt) return "Never";

  const remainingMs = expiresAt - Date.now();

  if (remainingMs <= 0) return "Expired";

  const days = Math.floor(remainingMs / 86400000);
  const hours = Math.floor((remainingMs % 86400000) / 3600000);

  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function parseAddOptions(rawArgs) {
  const args = [...rawArgs];
  let expiresInDays = 0;

  const flagIndex = args.findIndex((arg) =>
    ["--days", "--expire", "--expires", "--expiredays"].includes(
      String(arg || "").toLowerCase()
    )
  );

  if (flagIndex !== -1) {
    expiresInDays = parsePositiveDays(args[flagIndex + 1]);
    args.splice(flagIndex, 2);
  }

  const lastArg = String(args[args.length - 1] || "").toLowerCase();
  const inlineMatch = lastArg.match(/^(days|expire|expires):(\d+)$/);

  if (inlineMatch) {
    expiresInDays = parsePositiveDays(inlineMatch[2]);
    args.pop();
  }

  return {
    rewardText: args.join(" ").trim(),
    expiresInDays,
  };
}

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = item.code || normalize(item.name).replace(/\s+/g, "_");

  const index = arr.findIndex((entry) => String(entry.code || "") === String(code));

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + Number(item.amount || 1),
    };
    return arr;
  }

  arr.push({
    ...item,
    code,
    amount: Number(item.amount || 1),
  });

  return arr;
}

function findItem(value) {
  const q = normalize(value);
  if (!q) return null;

  const all = Object.values(ITEMS);

  return (
    ITEMS[value] ||
    all.find((item) => normalize(item.code) === q) ||
    all.find((item) => normalize(item.name) === q) ||
    all.find((item) => normalize(item.code).includes(q)) ||
    all.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function parseRewardToken(token) {
  const parts = String(token || "")
    .split(":")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;

  const type = normalize(parts[0]).replace(/\s+/g, "");
  const amount = Math.floor(Number(parts[parts.length - 1]));

  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (type === "berries" || type === "berry") {
    return {
      type: "berries",
      amount,
      label: `Berries +${amount.toLocaleString("en-US")}`,
    };
  }

  if (type === "gems" || type === "gem") {
    return {
      type: "gems",
      amount,
      label: `Gems +${amount.toLocaleString("en-US")}`,
    };
  }

  const itemQuery = parts.slice(1, -1).join(":");
  const item = findItem(itemQuery);

  if (!item) return null;

  const cloned = cloneItem(item, amount);
  const itemType = String(item.type || "").toLowerCase();

  if (type === "box" || itemType === "box") {
    return {
      type: "box",
      item: cloned,
      label: `${item.name} x${amount}`,
    };
  }

  if (type === "ticket" || itemType === "ticket") {
    return {
      type: "ticket",
      item: cloned,
      label: `${item.name} x${amount}`,
    };
  }

  if (type === "material" || itemType === "material") {
    return {
      type: "material",
      item: cloned,
      label: `${item.name} x${amount}`,
    };
  }

  return {
    type: "item",
    item: cloned,
    label: `${item.name} x${amount}`,
  };
}

function parseRewards(rawText) {
  const tokens = String(rawText || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const rewards = tokens.map(parseRewardToken).filter(Boolean);

  return rewards;
}

function formatRewardSyntax() {
  return [
    "Reward syntax:",
    "`berries:10000`",
    "`gems:50`",
    "`box:mother_flame_treasure_box:1`",
    "`ticket:pull_reset_ticket:2`",
    "`material:enhancement_stone:10`",
    "",
    "Multiple rewards:",
    "`berries:10000,gems:50,box:mother_flame_treasure_box:1`",
  ].join("\n");
}

function applyRewards(player, rewards) {
  let nextBerries = Number(player.berries || 0);
  let nextGems = Number(player.gems || 0);
  let nextBoxes = Array.isArray(player.boxes) ? [...player.boxes] : [];
  let nextTickets = Array.isArray(player.tickets) ? [...player.tickets] : [];
  let nextMaterials = Array.isArray(player.materials) ? [...player.materials] : [];
  let nextItems = Array.isArray(player.items) ? [...player.items] : [];

  for (const reward of rewards) {
    if (reward.type === "berries") {
      nextBerries += Number(reward.amount || 0);
      continue;
    }

    if (reward.type === "gems") {
      nextGems += Number(reward.amount || 0);
      continue;
    }

    if (reward.type === "box") {
      nextBoxes = addOrIncrease(nextBoxes, reward.item);
      continue;
    }

    if (reward.type === "ticket") {
      nextTickets = addOrIncrease(nextTickets, reward.item);
      continue;
    }

    if (reward.type === "material") {
      nextMaterials = addOrIncrease(nextMaterials, reward.item);
      continue;
    }

    nextItems = addOrIncrease(nextItems, reward.item);
  }

  return {
    berries: nextBerries,
    gems: nextGems,
    boxes: nextBoxes,
    tickets: nextTickets,
    materials: nextMaterials,
    items: nextItems,
  };
}

function buildListEmbed(data, options = {}) {
  const viewerId = String(options.viewerId || "");
  const isAdminView = Boolean(options.isAdminView);

  const allEntries = Object.values(data.codes || {}).sort((a, b) => {
    const aCreated = Number(a.createdAt || 0);
    const bCreated = Number(b.createdAt || 0);

    if (aCreated && bCreated && aCreated !== bCreated) {
      return aCreated - bCreated;
    }

    if (aCreated && !bCreated) return -1;
    if (!aCreated && bCreated) return 1;

    return String(a.code || "").localeCompare(String(b.code || ""));
  });

  const entries = isAdminView
    ? allEntries
    : allEntries.filter((entry) => entry && entry.active !== false);

  const lines = entries.length
    ? entries.slice(0, 25).map((entry, index) => {
        const usedBy = Array.isArray(entry.usedBy) ? entry.usedBy.map(String) : [];
        const alreadyUsed = viewerId && usedBy.includes(viewerId);

        if (!isAdminView) {
          return alreadyUsed
            ? `${index + 1}. ~~${entry.code}~~ — Used`
            : `${index + 1}. **${entry.code}**`;
        }

        const rewardText = Array.isArray(entry.rewards)
          ? entry.rewards.map((reward) => reward.label).join(" / ")
          : "No rewards";

        const usage = Number(entry.maxUses || 0) > 0
          ? `${Number(usedBy.length || 0)}/${Number(entry.maxUses)}`
          : `${Number(usedBy.length || 0)}/Unlimited`;

        const status = entry.active === false ? "Disabled" : "Active";

        return [
          `${index + 1}. **${entry.code}**`,
          `Status: ${status}`,
          `Rewards: ${rewardText}`,
          `Uses: ${usage}`,
        ].join("\n");
      })
    : [
        isAdminView
          ? "No redeem codes have been created yet."
          : "No active redeem codes are available right now.",
      ];

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(isAdminView ? "Redeem Code List" : "Available Redeem Codes")
    .setDescription(lines.join("\n"))
    .setFooter({ text: "One Piece Bot • Redeem Codes" });
}

module.exports = {
  name: "redeemcode",

  async execute(message, args) {
    const subcommand = String(args[0] || "").toLowerCase();

    if (subcommand === "add") {
      if (!isAdmin(message.author.id)) {
        return message.reply("Owner only command.");
      }

      const code = normalizeCode(args[1]);
      const addOptions = parseAddOptions(args.slice(2));
      const rewardText = addOptions.rewardText;
      const expiresInDays = addOptions.expiresInDays;

      if (!code || !rewardText) {
        return message.reply(
          [
            "Usage: `op redeemcode add <code> <rewards>`",
            "",
            formatRewardSyntax(),
          ].join("\n")
        );
      }

      const rewards = parseRewards(rewardText);

      if (!rewards.length) {
        return message.reply(
          [
            "No valid rewards were found.",
            "",
            formatRewardSyntax(),
          ].join("\n")
        );
      }

      const data = readRedeemCodes();

      const now = Date.now();

      data.codes[code] = {
        code,
        active: true,
        maxUses: 0,
        expiresAt: expiresInDays > 0 ? now + expiresInDays * 86400000 : 0,
        rewards,
        usedBy: Array.isArray(data.codes[code]?.usedBy) ? data.codes[code].usedBy : [],
        createdBy: message.author.id,
        createdAt: data.codes[code]?.createdAt || now,
        updatedAt: now,
      };

      writeRedeemCodes(data);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("Redeem Code Added")
            .setDescription(
              [
                `**Code:** ${code}`,
                `**Expires:** ${expiresInDays > 0 ? `${expiresInDays} day(s)` : "Never"}`,
                "",
                "**Rewards**",
                rewards.map((reward) => `- ${reward.label}`).join("\n"),
              ].join("\n")
            )
            .setFooter({ text: "One Piece Bot • Redeem Code Admin" }),
        ],
      });
    }

    if (subcommand === "remove" || subcommand === "delete") {
      if (!isAdmin(message.author.id)) {
        return message.reply("Owner only command.");
      }

      const code = normalizeCode(args[1]);

      if (!code) {
        return message.reply("Usage: `op redeemcode remove <code>`");
      }

      const data = readRedeemCodes();

      if (!data.codes[code]) {
        return message.reply(`Redeem code \`${code}\` was not found.`);
      }

      delete data.codes[code];
      writeRedeemCodes(data);

      return message.reply(`Redeem code \`${code}\` has been removed.`);
    }

    if (subcommand === "enable" || subcommand === "disable") {
      if (!isAdmin(message.author.id)) {
        return message.reply("Owner only command.");
      }

      const code = normalizeCode(args[1]);

      if (!code) {
        return message.reply(`Usage: \`op redeemcode ${subcommand} <code>\``);
      }

      const data = readRedeemCodes();
      const entry = data.codes[code];

      if (!entry) {
        return message.reply(`Redeem code \`${code}\` was not found.`);
      }

      const active = subcommand === "enable";

      data.codes[code] = {
        ...entry,
        active,
        updatedAt: Date.now(),
      };

      writeRedeemCodes(data);

      return message.reply(
        `Redeem code \`${code}\` has been ${active ? "enabled" : "disabled"}.`
      );
    }

    if (subcommand === "list") {
      const data = readRedeemCodes();
      const adminView = isAdmin(message.author.id);

      return message.reply({
        embeds: [
          buildListEmbed(data, {
            isAdminView: adminView,
            viewerId: message.author.id,
          }),
        ],
      });
    }

    const code = normalizeCode(args[0]);

    if (!code) {
      if (!isAdmin(message.author.id)) {
        return message.reply("Usage: `op redeemcode <code>`");
      }

      return message.reply(
        [
          "Usage: `op redeemcode <code>`\nUse `op redeemcode list` to view available codes.",
          "",
          "Admin:",
          "`op redeemcode add <code> <rewards> --days <number>`",
          "`op redeemcode remove <code>`",
          "`op redeemcode enable <code>`",
          "`op redeemcode disable <code>`",
          "`op redeemcode list`",
        ].join("\n")
      );
    }

    const data = readRedeemCodes();
    const entry = data.codes[code];

    if (!entry) {
      return message.reply("This redeem code is invalid.");
    }

    if (entry.active === false || isRedeemCodeExpired(entry)) {
      return message.reply("This redeem code is expired.");
    }

    entry.usedBy = Array.isArray(entry.usedBy) ? entry.usedBy : [];

    if (entry.usedBy.includes(message.author.id)) {
      return message.reply("You have already redeemed this code.");
    }

    if (Number(entry.maxUses || 0) > 0 && entry.usedBy.length >= Number(entry.maxUses)) {
      return message.reply("This redeem code has reached its usage limit.");
    }

    const rewards = Array.isArray(entry.rewards) ? entry.rewards : [];

    if (!rewards.length) {
      return message.reply("This redeem code has no rewards configured.");
    }

    const players = readPlayers();
    const userId = String(message.author.id);

    if (!players[userId]) {
      players[userId] = {
        username: message.author.username,
        berries: 1000,
        gems: 100,
        cards: [],
        fragments: [],
        boxes: [],
        tickets: [],
        materials: [],
        items: [],
        weapons: [],
        devilFruits: [],
      };
    }

    const player = players[userId];
    const updatedInventory = applyRewards(player, rewards);

    players[userId] = {
      ...player,
      username: player.username || message.author.username,
      ...updatedInventory,
    };

    entry.usedBy.push(userId);
    entry.updatedAt = Date.now();

    data.codes[code] = entry;

    writePlayers(players);
    writeRedeemCodes(data);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("Redeem Code Claimed")
          .setDescription(
            [
              `**Code:** ${code}`,
              "",
              "**Rewards**",
              rewards.map((reward) => `- ${reward.label}`).join("\n"),
            ].join("\n")
          )
          .setFooter({ text: "One Piece Bot • Redeem Code" }),
      ],
    });
  },
};