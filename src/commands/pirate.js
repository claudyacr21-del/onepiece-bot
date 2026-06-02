const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const { readPlayers, writePlayers } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const {
  MAX_MEMBERS,
  normalizeMaterialKey,
  readPirateState,
  findPirateByUser,
  findPirateByNameOrId,
  createPirate,
  updatePirate,
  deletePirate,
  createInvite,
  consumeInvite,
  isLeader,
  isViceLeader,
  isOfficer,
  getRole,
} = require("../utils/pirateStore");
const {
  getPirateLevelRequirement,
  getMaterialDisplayName,
  formatRequirement,
} = require("../data/pirateLevels");
const {
  PIRATE_PERKS,
  normalizePerkKey,
  getPerkRequirement,
  getPerkEffectText,
} = require("../data/piratePerks");
const {
  PIRATE_SHOP_ITEMS,
  normalizePirateShopKey,
} = require("../data/pirateShop");
const {
  PIRATE_RAID_BOSSES,
  normalizePirateRaidTier,
} = require("../data/pirateRaidBosses");
const {
  getPirateWeeklyRewardPreview,
  runPirateWeeklyResetIfNeeded,
} = require("../utils/pirateWeekly");
const GOLD = 0xf1c40f;
const RED = 0xe74c3c;
const GREEN = 0x2ecc71;
const BLUE = 0x3498db;
const PIRATE_RAID_ATTACK_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const PIRATE_RAID_MANUAL_FIGHT_TIMEOUT_MS = 3 * 60 * 1000;
const PIRATE_RAID_MAX_TURNS = 20;
const PIRATE_CREATE_COST_BERRIES = 2_000_000;
const PIRATE_CREATE_COST_GEMS = 250;

function fmt(num) {
  return Number(num || 0).toLocaleString("en-US");
}

function cleanText(value) {
  return String(value || "").trim();
}

function getMentionId(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^<@!?(\d+)>$/);
  if (match) return match[1];
  if (/^\d{15,25}$/.test(raw)) return raw;
  return null;
}

function makeError(message) {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(RED)
        .setTitle("Pirate System")
        .setDescription(message),
    ],
    allowedMentions: { repliedUser: false },
  };
}

function makeSuccess(title, description) {
  return {
    embeds: [
      new EmbedBuilder().setColor(GREEN).setTitle(title).setDescription(description),
    ],
    allowedMentions: { repliedUser: false },
  };
}

function usageEmbed() {
  return new EmbedBuilder()
    .setColor(GOLD)
    .setTitle("Pirate / Guild System")
    .setDescription(
      [
        "**Core Commands**",
        "`op p create <name>`",
        `Create cost: ${fmt(PIRATE_CREATE_COST_BERRIES)} berries + ${fmt(PIRATE_CREATE_COST_GEMS)} gems`,
        "`op p info`",
        "`op p invite <@user>`",
        "`op p join <pirate name/id>`",
        "`op p leave`",
        "`op p disband`",
        "`op p kick <@user>`",
        "`op p promote <@user>`",
        "`op p demote <@user>`",
        "",
        "**Storage Commands**",
        "`op p deposit berries <amount>`",
        "`op p deposit material <amount> <material name>`",
        "`op p storage`",
        "",
        "**Level & Perk Commands**",
        "`op p level`",
        "`op p upgrade level`",
        "`op p perks`",
        "`op p upgrade perk <perk>`",
        "",
        "**Pirate Shop Commands**",
        "`op p shop`",
        "`op p buy <item>`",
        "",
        "**Pirate Raid Commands**",
        "`op p raid`",
        "`op p attack <tier>`",
        "`op p lb`",
        "`op p rewards`",
        "",
        `Max members: **${MAX_MEMBERS}** — 1 Leader, 1 Vice Leader, 4 Crew`,
      ].join("\n")
    )
    .setFooter({ text: "One Piece Bot • Pirate System Phase 1 + 2" });
}

function getPlayer(players, userId, username) {
  const id = String(userId);
  if (!players[id]) {
    players[id] = {
      username: username || "Unknown",
      berries: 0,
      gems: 0,
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

  players[id].username = username || players[id].username || "Unknown";
  players[id].berries = Math.max(0, Math.floor(Number(players[id].berries || 0)));
  players[id].gems = Math.max(0, Math.floor(Number(players[id].gems || 0)));
  players[id].pirateTokens = Math.max(
    0,
    Math.floor(Number(players[id].pirateTokens || 0))
  );
  players[id].materials = Array.isArray(players[id].materials)
    ? players[id].materials
    : [];
  players[id].items = Array.isArray(players[id].items) ? players[id].items : [];

  return players[id];
}

function scoreStack(query, stack) {
  const q = String(query || "").toLowerCase().trim();
  const code = String(stack?.code || "").toLowerCase();
  const name = String(stack?.name || "").toLowerCase();
  const type = String(stack?.type || "").toLowerCase();
  const category = String(stack?.category || "").toLowerCase();

  if (!q) return 0;
  if (code === q || name === q) return 1000;
  if (code.includes(q) || name.includes(q)) return 750;
  if (type.includes(q) || category.includes(q)) return 350;

  const words = q.split(/\s+/).filter(Boolean);
  if (words.length && words.every((word) => `${name} ${code}`.includes(word))) {
    return 500 + words.length;
  }

  return 0;
}

function findMaterialStack(player, query) {
  const sources = [
    { key: "materials", list: Array.isArray(player.materials) ? player.materials : [] },
    { key: "items", list: Array.isArray(player.items) ? player.items : [] },
  ];

  const matches = [];

  for (const source of sources) {
    source.list.forEach((entry, index) => {
      const amount = Math.floor(Number(entry?.amount || 0));
      if (!entry || amount <= 0) return;

      const code = normalizeMaterialKey(entry.code || entry.name);
      const name = entry.name || code.replace(/_/g, " ");
      const score = scoreStack(query, { ...entry, code, name });

      if (score > 0) {
        matches.push({
          sourceKey: source.key,
          index,
          entry,
          code,
          name,
          amount,
          score,
        });
      }
    });
  }

  matches.sort((a, b) => b.score - a.score);
  return matches[0] || null;
}

function removeStackAmount(list, index, amount) {
  const arr = Array.isArray(list) ? [...list] : [];
  const current = arr[index];
  const currentAmount = Math.floor(Number(current?.amount || 0));

  if (!current || currentAmount < amount) return null;

  const nextAmount = currentAmount - amount;
  if (nextAmount <= 0) {
    arr.splice(index, 1);
  } else {
    arr[index] = { ...current, amount: nextAmount };
  }

  return arr;
}

function materialLines(materials, limit = 12) {
  const entries = Object.values(materials || {})
    .filter((item) => Number(item?.amount || 0) > 0)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .slice(0, limit);

  if (!entries.length) return ["No materials stored yet."];

  return entries.map((item) => `• **${item.name}** x${fmt(item.amount)}`);
}

function memberLines(pirate, message) {
  return (pirate.members || []).map((id) => {
    const role = getRole(pirate, id);
    const member = message.guild?.members?.cache?.get(String(id));
    const name = member?.user?.username ? member.user.username : `<@${id}>`;
    return `• ${role}: ${name}`;
  });
}

function getPirateWeeklyRank(pirateId) {
  const state = readPirateState();

  const pirates = Object.values(state.pirates || {})
    .filter((p) => Array.isArray(p.members) && p.members.length > 0)
    .sort((a, b) => Number(b.weeklyPoints || 0) - Number(a.weeklyPoints || 0));

  const index = pirates.findIndex((p) => String(p.id) === String(pirateId));

  return index === -1 ? null : index + 1;
}

function compactMaterialCount(materials) {
  return Object.values(materials || {}).filter((item) => Number(item?.amount || 0) > 0).length;
}

function formatPerkSummary(pirate) {
  const perks = pirate.perks || {};

  const list = [
    ["Berry Boost", "berryBoost"],
    ["Gems Boost", "gemsBoost"],
    ["Luck Boost", "luckBoost"],
    ["Raid Point Boost", "raidPointBoost"],
    ["EXP Boost", "expBoost"],
    ["Shop Discount", "shopDiscount"],
    ["Boss Damage Boost", "bossDamageBoost"],
  ];

  return list
    .map(([name, key]) => {
      const level = Math.max(0, Math.floor(Number(perks[key] || 0)));
      return `• **${name}:** Lv.${level}`;
    })
    .join("\n");
}

function formatRaidStatusSummary(pirate) {
  if (!PIRATE_RAID_BOSSES) return "No raid data.";

  return Object.values(PIRATE_RAID_BOSSES)
    .map((boss) => {
      const state = getPirateRaidState(pirate, boss.key);
      const hpText = state.defeated
        ? "Defeated"
        : `${fmt(state.hpLeft)} / ${fmt(boss.hp)}`;

      return `• **${boss.tierName}:** ${boss.name} — ${hpText}`;
    })
    .join("\n");
}

function requirePirate(userId) {
  const pirate = findPirateByUser(userId);
  if (!pirate) throw new Error("You are not in any pirate/guild yet.");
  return pirate;
}

function requireOfficer(pirate, userId) {
  if (!isOfficer(pirate, userId)) {
    throw new Error("Only the Leader or Vice Leader can use this command.");
  }
}

function requireLeader(pirate, userId) {
  if (!isLeader(pirate, userId)) {
    throw new Error("Only the Leader can use this command.");
  }
}

async function sendPirateInfo(message, pirate) {
  const players = readPlayers();
  const player = getPlayer(players, message.author.id, message.author.username);

  const rank = getPirateWeeklyRank(pirate.id);
  const userRole = getRole(pirate, message.author.id);
  const materialTypes = compactMaterialCount(pirate.storage?.materials || {});
  const memberCount = Array.isArray(pirate.members) ? pirate.members.length : 0;

  const embed = new EmbedBuilder()
    .setColor(GOLD)
    .setTitle(`🏴‍☠️ ${pirate.name}`)
    .setDescription(
      [
        "## Pirate Overview",
        `**Pirate Level:** ${pirate.level}/100`,
        `**Weekly Rank:** ${rank ? `#${rank}` : "Unranked"}`,
        `**Weekly Points:** ${fmt(pirate.weeklyPoints || 0)}`,
        `**Total Points:** ${fmt(pirate.totalPoints || 0)}`,
        `**Members:** ${memberCount}/${MAX_MEMBERS}`,
        `**Your Role:** ${userRole}`,
        `**Your Pirate Tokens:** ${fmt(player.pirateTokens || 0)}`,
        "",
        "## Storage",
        `**Berries:** ${fmt(pirate.storage?.berries || 0)}`,
        `**Material Types:** ${fmt(materialTypes)}`,
        "",
        "## Crew",
        ...memberLines(pirate, message),
        "",
        "## Global Perks",
        formatPerkSummary(pirate),
        "",
        "## Pirate Raid Status",
        formatRaidStatusSummary(pirate),
        "",
        "## Useful Commands",
        "`op p storage`",
        "`op p perks`",
        "`op p raid`",
        "`op p shop`",
        "`op p lb`",
      ].join("\n")
    )
    .setFooter({
      text: `Pirate ID: ${pirate.id}`,
    });

  return message.reply({
    embeds: [embed],
    allowedMentions: {
      users: pirate.members || [],
      repliedUser: false,
    },
  });
}

async function sendStorage(message, pirate) {
  const embed = new EmbedBuilder()
    .setColor(BLUE)
    .setTitle(`🏴‍☠️ ${pirate.name} Storage`)
    .setDescription(
      [
        `**Berries:** ${fmt(pirate.storage?.berries || 0)}`,
        "",
        "**Materials**",
        ...materialLines(pirate.storage?.materials || {}, 15),
      ].join("\n")
    )
    .setFooter({ text: "All stored resources belong to the pirate/guild." });

  return message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false },
  });
}

async function handleCreate(message, args) {
  const name = cleanText(args.join(" "));

  if (!name) {
    return message.reply(
      makeError(
        [
          "Usage: `op p create <name>`",
          "",
          "**Create Cost:**",
          `• ${fmt(PIRATE_CREATE_COST_BERRIES)} berries`,
          `• ${fmt(PIRATE_CREATE_COST_GEMS)} gems`,
        ].join("\n")
      )
    );
  }

  try {
    if (findPirateByUser(message.author.id)) {
      return message.reply(makeError("You are already in a pirate/guild."));
    }

    const players = readPlayers();
    const player = getPlayer(players, message.author.id, message.author.username);

    const currentBerries = Math.floor(Number(player.berries || 0));
    const currentGems = Math.floor(Number(player.gems || 0));

    if (
      currentBerries < PIRATE_CREATE_COST_BERRIES ||
      currentGems < PIRATE_CREATE_COST_GEMS
    ) {
      const missing = [];

      if (currentBerries < PIRATE_CREATE_COST_BERRIES) {
        missing.push(
          `Berries: need ${fmt(PIRATE_CREATE_COST_BERRIES)}, have ${fmt(currentBerries)}`
        );
      }

      if (currentGems < PIRATE_CREATE_COST_GEMS) {
        missing.push(
          `Gems: need ${fmt(PIRATE_CREATE_COST_GEMS)}, have ${fmt(currentGems)}`
        );
      }

      return message.reply(
        makeError(
          [
            "Not enough resources to create a pirate.",
            "",
            "**Create Cost:**",
            `• ${fmt(PIRATE_CREATE_COST_BERRIES)} berries`,
            `• ${fmt(PIRATE_CREATE_COST_GEMS)} gems`,
            "",
            "**Missing:**",
            ...missing.map((line) => `• ${line}`),
          ].join("\n")
        )
      );
    }

    const pirate = createPirate({
      name,
      leaderId: message.author.id,
    });

    player.berries = currentBerries - PIRATE_CREATE_COST_BERRIES;
    player.gems = currentGems - PIRATE_CREATE_COST_GEMS;
    players[String(message.author.id)] = player;
    writePlayers(players);

    return message.reply(
      makeSuccess(
        "Pirate Created",
        [
          `**${pirate.name}** has been created.`,
          `Leader: <@${message.author.id}>`,
          `Members: **1/${MAX_MEMBERS}**`,
          "",
          "**Paid:**",
          `• ${fmt(PIRATE_CREATE_COST_BERRIES)} berries`,
          `• ${fmt(PIRATE_CREATE_COST_GEMS)} gems`,
          "",
          "Next: invite crew with `op p invite <@user>`",
        ].join("\n")
      )
    );
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to create pirate/guild."));
  }
}

async function handleInvite(message, args) {
  try {
    const pirate = requirePirate(message.author.id);
    requireOfficer(pirate, message.author.id);

    if ((pirate.members || []).length >= MAX_MEMBERS) {
      return message.reply(makeError(`This pirate/guild is already full (${MAX_MEMBERS}/${MAX_MEMBERS}).`));
    }

    const targetId = getMentionId(args[0]);
    if (!targetId) {
      return message.reply(makeError("Usage: `op p invite <@user>`"));
    }

    if (String(targetId) === String(message.author.id)) {
      return message.reply(makeError("You cannot invite yourself."));
    }

    if (findPirateByUser(targetId)) {
      return message.reply(makeError("That user is already in a pirate/guild."));
    }

    createInvite({
      pirateId: pirate.id,
      targetUserId: targetId,
      invitedBy: message.author.id,
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(GREEN)
          .setTitle("Pirate Invite Sent")
          .setDescription(
            [
              `<@${targetId}> has been invited to **${pirate.name}**.`,
              "",
              `They can join with:`,
              `\`op p join ${pirate.id}\``,
            ].join("\n")
          ),
      ],
      allowedMentions: { users: [targetId], repliedUser: false },
    });
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to invite user."));
  }
}

async function handleJoin(message, args) {
  const query = cleanText(args.join(" "));
  if (!query) {
    return message.reply(makeError("Usage: `op p join <pirate name/id>`"));
  }

  try {
    if (findPirateByUser(message.author.id)) {
      return message.reply(makeError("You are already in a pirate/guild."));
    }

    const pirate = findPirateByNameOrId(query);
    if (!pirate) {
      return message.reply(makeError("Pirate/guild not found."));
    }

    if ((pirate.members || []).length >= MAX_MEMBERS) {
      return message.reply(makeError(`This pirate/guild is already full (${MAX_MEMBERS}/${MAX_MEMBERS}).`));
    }

    const invite = consumeInvite(message.author.id, pirate.id);
    if (!invite) {
      return message.reply(
        makeError("You do not have an active invite for this pirate/guild.")
      );
    }

    const updated = updatePirate(pirate.id, (fresh) => ({
      ...fresh,
      members: [...new Set([...(fresh.members || []), String(message.author.id)])].slice(
        0,
        MAX_MEMBERS
      ),
      logs: [
        ...(fresh.logs || []),
        {
          at: Date.now(),
          type: "join",
          userId: String(message.author.id),
        },
      ].slice(-25),
    }));

    return message.reply(
      makeSuccess(
        "Joined Pirate",
        `You joined **${updated.name}**.\nMembers: **${updated.members.length}/${MAX_MEMBERS}**`
      )
    );
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to join pirate/guild."));
  }
}

async function handleLeave(message) {
  try {
    const pirate = requirePirate(message.author.id);
    const userId = String(message.author.id);

    if (isLeader(pirate, userId)) {
      if ((pirate.members || []).length <= 1) {
        deletePirate(pirate.id);
        return message.reply(makeSuccess("Pirate Disbanded", `**${pirate.name}** has been disbanded.`));
      }

      return message.reply(
        makeError(
          "Leader cannot leave while members still exist.\nKick/transfer members first, or use this only when you are alone."
        )
      );
    }

    const updated = updatePirate(pirate.id, (fresh) => ({
      ...fresh,
      viceLeaderId:
        String(fresh.viceLeaderId || "") === userId ? null : fresh.viceLeaderId,
      members: (fresh.members || []).filter((id) => String(id) !== userId),
      logs: [
        ...(fresh.logs || []),
        {
          at: Date.now(),
          type: "leave",
          userId,
        },
      ].slice(-25),
    }));

    return message.reply(
      makeSuccess("Left Pirate", `You left **${updated.name}**.`)
    );
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to leave pirate/guild."));
  }
}

async function handleDisband(message, args) {
  const confirm = String(args[0] || "").toLowerCase();

  try {
    const pirate = requirePirate(message.author.id);
    requireLeader(pirate, message.author.id);

    if (confirm !== "confirm") {
      return message.reply(
        makeError(
          [
            `You are about to permanently disband **${pirate.name}**.`,
            "",
            "This will remove:",
            "• Pirate data",
            "• Member list",
            "• Storage berries",
            "• Storage materials",
            "• Weekly points",
            "",
            "To confirm, type:",
            "`op p disband confirm`",
          ].join("\n")
        )
      );
    }

    const pirateName = pirate.name;
    deletePirate(pirate.id);

    return message.reply(
      makeSuccess(
        "Pirate Disbanded",
        `**${pirateName}** has been permanently disbanded.`
      )
    );
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to disband pirate."));
  }
}

async function handleKick(message, args) {
  try {
    const pirate = requirePirate(message.author.id);
    requireOfficer(pirate, message.author.id);

    const targetId = getMentionId(args[0]);
    if (!targetId) {
      return message.reply(makeError("Usage: `op p kick <@user>`"));
    }

    if (!(pirate.members || []).map(String).includes(String(targetId))) {
      return message.reply(makeError("That user is not in your pirate/guild."));
    }

    if (isLeader(pirate, targetId)) {
      return message.reply(makeError("Leader cannot be kicked."));
    }

    if (isViceLeader(pirate, targetId) && !isLeader(pirate, message.author.id)) {
      return message.reply(makeError("Only the Leader can kick the Vice Leader."));
    }

    const updated = updatePirate(pirate.id, (fresh) => ({
      ...fresh,
      viceLeaderId:
        String(fresh.viceLeaderId || "") === String(targetId) ? null : fresh.viceLeaderId,
      members: (fresh.members || []).filter((id) => String(id) !== String(targetId)),
      logs: [
        ...(fresh.logs || []),
        {
          at: Date.now(),
          type: "kick",
          userId: String(targetId),
          by: String(message.author.id),
        },
      ].slice(-25),
    }));

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(GREEN)
          .setTitle("Crew Kicked")
          .setDescription(`<@${targetId}> was removed from **${updated.name}**.`),
      ],
      allowedMentions: { users: [targetId], repliedUser: false },
    });
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to kick user."));
  }
}

async function handlePromote(message, args) {
  try {
    const pirate = requirePirate(message.author.id);
    requireLeader(pirate, message.author.id);

    const targetId = getMentionId(args[0]);
    if (!targetId) {
      return message.reply(makeError("Usage: `op p promote <@user>`"));
    }

    if (!(pirate.members || []).map(String).includes(String(targetId))) {
      return message.reply(makeError("That user is not in your pirate/guild."));
    }

    if (isLeader(pirate, targetId)) {
      return message.reply(makeError("Leader is already the highest role."));
    }

    const updated = updatePirate(pirate.id, (fresh) => ({
      ...fresh,
      viceLeaderId: String(targetId),
      logs: [
        ...(fresh.logs || []),
        {
          at: Date.now(),
          type: "promote",
          userId: String(targetId),
          by: String(message.author.id),
        },
      ].slice(-25),
    }));

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(GREEN)
          .setTitle("Crew Promoted")
          .setDescription(`<@${targetId}> is now Vice Leader of **${updated.name}**.`),
      ],
      allowedMentions: { users: [targetId], repliedUser: false },
    });
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to promote user."));
  }
}

async function handleDemote(message, args) {
  try {
    const pirate = requirePirate(message.author.id);
    requireLeader(pirate, message.author.id);

    const targetId = getMentionId(args[0]);
    if (!targetId) {
      return message.reply(makeError("Usage: `op p demote <@user>`"));
    }

    if (!isViceLeader(pirate, targetId)) {
      return message.reply(makeError("That user is not the Vice Leader."));
    }

    const updated = updatePirate(pirate.id, (fresh) => ({
      ...fresh,
      viceLeaderId: null,
      logs: [
        ...(fresh.logs || []),
        {
          at: Date.now(),
          type: "demote",
          userId: String(targetId),
          by: String(message.author.id),
        },
      ].slice(-25),
    }));

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(GREEN)
          .setTitle("Vice Leader Demoted")
          .setDescription(`<@${targetId}> is now Crew in **${updated.name}**.`),
      ],
      allowedMentions: { users: [targetId], repliedUser: false },
    });
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to demote user."));
  }
}

async function handleDepositBerries(message, args) {
  const amount = Math.floor(Number(args[0] || 0));
  if (!amount || amount <= 0) {
    return message.reply(makeError("Usage: `op p deposit berries <amount>`"));
  }

  try {
    const pirate = requirePirate(message.author.id);
    const players = readPlayers();
    const player = getPlayer(players, message.author.id, message.author.username);

    if (Number(player.berries || 0) < amount) {
      return message.reply(makeError(`You only have **${fmt(player.berries)} berries**.`));
    }

    player.berries = Math.max(0, Math.floor(Number(player.berries || 0)) - amount);
    players[String(message.author.id)] = player;
    writePlayers(players);

    const updated = updatePirate(pirate.id, (fresh) => ({
      ...fresh,
      storage: {
        ...(fresh.storage || {}),
        berries: Math.max(0, Math.floor(Number(fresh.storage?.berries || 0))) + amount,
        materials: fresh.storage?.materials || {},
      },
      logs: [
        ...(fresh.logs || []),
        {
          at: Date.now(),
          type: "deposit_berries",
          userId: String(message.author.id),
          amount,
        },
      ].slice(-25),
    }));

    return message.reply(
      makeSuccess(
        "Berries Deposited",
        [
          `<@${message.author.id}> deposited **${fmt(amount)} berries** to **${updated.name}**.`,
          `Guild Storage Berries: **${fmt(updated.storage.berries)}**`,
        ].join("\n")
      )
    );
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to deposit berries."));
  }
}

async function handleDepositMaterial(message, args) {
  const amount = Math.floor(Number(args[0] || 0));
  const query = cleanText(args.slice(1).join(" "));

  if (!amount || amount <= 0 || !query) {
    return message.reply(makeError("Usage: `op p deposit material <amount> <material name>`"));
  }

  try {
    const pirate = requirePirate(message.author.id);
    const players = readPlayers();
    const player = getPlayer(players, message.author.id, message.author.username);
    const found = findMaterialStack(player, query);

    if (!found) {
      return message.reply(makeError(`Material matching \`${query}\` was not found.`));
    }

    if (found.amount < amount) {
      return message.reply(
        makeError(`You only have **${fmt(found.amount)}x ${found.name}**.`)
      );
    }

    const updatedList = removeStackAmount(player[found.sourceKey], found.index, amount);
    if (!updatedList) {
      return message.reply(makeError("Failed to remove material from your inventory."));
    }

    player[found.sourceKey] = updatedList;
    players[String(message.author.id)] = player;
    writePlayers(players);

    const code = normalizeMaterialKey(found.code || found.name);
    const updated = updatePirate(pirate.id, (fresh) => {
      const materials = { ...(fresh.storage?.materials || {}) };
      const current = materials[code] || {
        code,
        name: found.name,
        amount: 0,
      };

      materials[code] = {
        ...current,
        code,
        name: current.name || found.name,
        amount: Math.max(0, Math.floor(Number(current.amount || 0))) + amount,
      };

      return {
        ...fresh,
        storage: {
          ...(fresh.storage || {}),
          berries: Math.max(0, Math.floor(Number(fresh.storage?.berries || 0))),
          materials,
        },
        logs: [
          ...(fresh.logs || []),
          {
            at: Date.now(),
            type: "deposit_material",
            userId: String(message.author.id),
            code,
            name: found.name,
            amount,
          },
        ].slice(-25),
      };
    });

    return message.reply(
      makeSuccess(
        "Material Deposited",
        [
          `<@${message.author.id}> deposited **${fmt(amount)}x ${found.name}** to **${updated.name}**.`,
          `Stored: **${fmt(updated.storage.materials[code].amount)}x ${updated.storage.materials[code].name}**`,
        ].join("\n")
      )
    );
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to deposit material."));
  }
}

async function handleDeposit(message, args) {
  const type = String(args[0] || "").toLowerCase();

  if (["berry", "berries", "beli"].includes(type)) {
    return handleDepositBerries(message, args.slice(1));
  }

  if (["material", "materials", "mat"].includes(type)) {
    return handleDepositMaterial(message, args.slice(1));
  }

  return message.reply(
    makeError(
      [
        "Usage:",
        "`op p deposit berries <amount>`",
        "`op p deposit material <amount> <material name>`",
      ].join("\n")
    )
  );
}

function hasStorageRequirement(pirate, requirement) {
  const missing = [];

  const storageBerries = Math.floor(Number(pirate?.storage?.berries || 0));
  if (storageBerries < Number(requirement?.berries || 0)) {
    missing.push(
      `Berries: need ${fmt(requirement.berries)}, have ${fmt(storageBerries)}`
    );
  }

  for (const [code, amount] of Object.entries(requirement?.materials || {})) {
    const stored = Math.floor(
      Number(pirate?.storage?.materials?.[code]?.amount || 0)
    );

    if (stored < Number(amount || 0)) {
      missing.push(
        `${getMaterialDisplayName(code)}: need ${fmt(amount)}, have ${fmt(stored)}`
      );
    }
  }

  return {
    ok: missing.length === 0,
    missing,
  };
}

function consumeStorageRequirement(pirate, requirement) {
  const next = JSON.parse(JSON.stringify(pirate || {}));

  next.storage = next.storage || {};
  next.storage.berries = Math.max(
    0,
    Math.floor(Number(next.storage.berries || 0)) -
      Math.floor(Number(requirement?.berries || 0))
  );

  next.storage.materials = next.storage.materials || {};

  for (const [code, amount] of Object.entries(requirement?.materials || {})) {
    const current = next.storage.materials[code] || {
      code,
      name: getMaterialDisplayName(code),
      amount: 0,
    };

    const left = Math.max(
      0,
      Math.floor(Number(current.amount || 0)) - Math.floor(Number(amount || 0))
    );

    if (left <= 0) {
      delete next.storage.materials[code];
    } else {
      next.storage.materials[code] = {
        ...current,
        code,
        name: current.name || getMaterialDisplayName(code),
        amount: left,
      };
    }
  }

  return next;
}

async function handlePirateLevel(message) {
  try {
    const pirate = requirePirate(message.author.id);
    const currentLevel = Math.max(1, Math.min(100, Math.floor(Number(pirate.level || 1))));
    const req =
      currentLevel >= 100 ? null : getPirateLevelRequirement(currentLevel);

    const embed = new EmbedBuilder()
      .setColor(GOLD)
      .setTitle(`🏴‍☠️ ${pirate.name} Level`)
      .setDescription(
        [
          `**Current Level:** ${currentLevel}/100`,
          "",
          currentLevel >= 100
            ? "**Max level reached.**"
            : `**Upgrade Requirement Lv.${currentLevel} → Lv.${currentLevel + 1}**\n${formatRequirement(req)}`,
          "",
          "Upgrade with:",
          "`op p upgrade level`",
        ].join("\n")
      );

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to show pirate level."));
  }
}

async function handleUpgradeLevel(message) {
  try {
    const pirate = requirePirate(message.author.id);
    requireLeader(pirate, message.author.id);

    const currentLevel = Math.max(1, Math.min(100, Math.floor(Number(pirate.level || 1))));

    if (currentLevel >= 100) {
      return message.reply(makeError("This pirate/guild is already level 100."));
    }

    const requirement = getPirateLevelRequirement(currentLevel);
    const check = hasStorageRequirement(pirate, requirement);

    if (!check.ok) {
      return message.reply(
        makeError(
          [
            `Not enough guild storage resources to upgrade **${pirate.name}**.`,
            "",
            "**Missing:**",
            ...check.missing.map((line) => `• ${line}`),
          ].join("\n")
        )
      );
    }

    const updated = updatePirate(pirate.id, (fresh) => {
      const consumed = consumeStorageRequirement(fresh, requirement);

      return {
        ...consumed,
        level: currentLevel + 1,
        logs: [
          ...(fresh.logs || []),
          {
            at: Date.now(),
            type: "upgrade_level",
            userId: String(message.author.id),
            fromLevel: currentLevel,
            toLevel: currentLevel + 1,
          },
        ].slice(-25),
      };
    });

    return message.reply(
      makeSuccess(
        "Pirate Level Up",
        `**${updated.name}** upgraded from Lv.${currentLevel} to **Lv.${updated.level}**.`
      )
    );
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to upgrade pirate level."));
  }
}

async function handlePiratePerks(message) {
  try {
    const pirate = requirePirate(message.author.id);
    const guildLevel = Math.max(1, Math.min(100, Math.floor(Number(pirate.level || 1))));
    const perkState = pirate.perks || {};

    const lines = Object.values(PIRATE_PERKS).map((perk) => {
      const currentLevel = Math.max(0, Math.floor(Number(perkState[perk.key] || 0)));
      const locked = guildLevel < perk.unlockGuildLevel;
      const status = locked
        ? `🔒 Unlocks at Pirate Lv.${perk.unlockGuildLevel}`
        : `Lv.${currentLevel}/${perk.maxLevel} — ${getPerkEffectText(perk.key, currentLevel)}`;

      return [
        `**${perk.name}**`,
        status,
        `_${perk.effect}_`,
      ].join("\n");
    });

    const embed = new EmbedBuilder()
      .setColor(GOLD)
      .setTitle(`🏴‍☠️ ${pirate.name} Perks`)
      .setDescription(
        [
          `**Pirate Level:** ${guildLevel}/100`,
          "",
          ...lines,
          "",
          "Upgrade with:",
          "`op p upgrade perk <perk>`",
          "",
          "Example:",
          "`op p upgrade perk luck`",
        ].join("\n\n")
      );

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to show pirate perks."));
  }
}

async function handleUpgradePerk(message, args) {
  const query = cleanText(args.join(" "));
  const perkKey = normalizePerkKey(query);

  if (!perkKey || !PIRATE_PERKS[perkKey]) {
    return message.reply(
      makeError(
        [
          "Usage: `op p upgrade perk <perk>`",
          "",
          "Available perks:",
          "• berry",
          "• gems",
          "• luck",
          "• raid",
          "• exp",
          "• shop",
          "• boss",
        ].join("\n")
      )
    );
  }

  try {
    const pirate = requirePirate(message.author.id);
    requireLeader(pirate, message.author.id);

    const perk = PIRATE_PERKS[perkKey];
    const guildLevel = Math.max(1, Math.min(100, Math.floor(Number(pirate.level || 1))));

    if (guildLevel < perk.unlockGuildLevel) {
      return message.reply(
        makeError(
          `${perk.name} is locked. Required Pirate Level: **${perk.unlockGuildLevel}**.`
        )
      );
    }

    const currentPerkLevel = Math.max(
      0,
      Math.floor(Number(pirate.perks?.[perkKey] || 0))
    );

    if (currentPerkLevel >= perk.maxLevel) {
      return message.reply(makeError(`${perk.name} is already max level.`));
    }

    const requirement = getPerkRequirement(perkKey, currentPerkLevel);

    if (guildLevel < requirement.requiredGuildLevel) {
      return message.reply(
        makeError(
          `${perk.name} Lv.${requirement.toLevel} requires Pirate Level **${requirement.requiredGuildLevel}**.`
        )
      );
    }

    const check = hasStorageRequirement(pirate, requirement);

    if (!check.ok) {
      return message.reply(
        makeError(
          [
            `Not enough guild storage resources to upgrade **${perk.name}**.`,
            "",
            "**Missing:**",
            ...check.missing.map((line) => `• ${line}`),
          ].join("\n")
        )
      );
    }

    const updated = updatePirate(pirate.id, (fresh) => {
      const consumed = consumeStorageRequirement(fresh, requirement);
      const perks = { ...(consumed.perks || {}) };

      perks[perkKey] = currentPerkLevel + 1;

      return {
        ...consumed,
        perks,
        logs: [
          ...(fresh.logs || []),
          {
            at: Date.now(),
            type: "upgrade_perk",
            userId: String(message.author.id),
            perkKey,
            fromLevel: currentPerkLevel,
            toLevel: currentPerkLevel + 1,
          },
        ].slice(-25),
      };
    });

    const newLevel = updated.perks?.[perkKey] || currentPerkLevel + 1;

    return message.reply(
      makeSuccess(
        "Pirate Perk Upgraded",
        [
          `**${perk.name}** upgraded to **Lv.${newLevel}/${perk.maxLevel}**.`,
          `Current effect: **${getPerkEffectText(perkKey, newLevel)}**`,
        ].join("\n")
      )
    );
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to upgrade pirate perk."));
  }
}

function addPirateShopItem(player, item) {
  const next = { ...(player || {}) };

  if (item.type === "ticket") {
    const tickets = Array.isArray(next.tickets) ? [...next.tickets] : [];
    const idx = tickets.findIndex(
      (entry) => String(entry.code || "") === String(item.code)
    );

    if (idx === -1) {
      tickets.push({
        code: item.code,
        name: item.name,
        amount: 1,
        rarity: item.rarity,
        type: "Ticket",
      });
    } else {
      tickets[idx] = {
        ...tickets[idx],
        amount: Number(tickets[idx].amount || 0) + 1,
      };
    }

    next.tickets = tickets;
    return next;
  }

  const items = Array.isArray(next.items) ? [...next.items] : [];
  const idx = items.findIndex(
    (entry) => String(entry.code || "") === String(item.code)
  );

  if (idx === -1) {
    items.push({
      code: item.code,
      name: item.name,
      amount: 1,
      rarity: item.rarity,
      type: "Pirate Shop",
      description: item.description || "",
    });
  } else {
    items[idx] = {
      ...items[idx],
      amount: Number(items[idx].amount || 0) + 1,
    };
  }

  next.items = items;
  return next;
}

function getPirateShopDiscountInfo(pirate) {
  const level = Math.max(
    0,
    Math.floor(Number(pirate?.perks?.shopDiscount || 0))
  );

  const percent = Math.min(10, level);

  return {
    level,
    percent,
    multiplier: Math.max(0, 1 - percent / 100),
  };
}

function getDiscountedPirateShopPrice(item, pirate) {
  const basePrice = Math.max(1, Math.floor(Number(item?.price || 1)));
  const discount = getPirateShopDiscountInfo(pirate);

  const finalPrice = Math.max(1, Math.ceil(basePrice * discount.multiplier));

  return {
    basePrice,
    finalPrice,
    discountLevel: discount.level,
    discountPercent: discount.percent,
    saved: Math.max(0, basePrice - finalPrice),
  };
}

async function handlePirateShop(message) {
  try {
    const pirate = requirePirate(message.author.id);
    const players = readPlayers();
    const player = getPlayer(players, message.author.id, message.author.username);

    const discount = getPirateShopDiscountInfo(pirate);

    const lines = Object.values(PIRATE_SHOP_ITEMS).map((item) => {
      const price = getDiscountedPirateShopPrice(item, pirate);
      const priceText =
        price.saved > 0
          ? `~~${fmt(price.basePrice)}~~ ${fmt(price.finalPrice)} pirate tokens`
          : `${fmt(price.finalPrice)} pirate tokens`;

      return [
        `**${item.name}** — ${priceText}`,
        `Code: \`${item.key}\``,
        `_${item.description}_`,
      ].join("\n");
    });

    const embed = new EmbedBuilder()
      .setColor(GOLD)
      .setTitle(`🏴‍☠️ ${pirate.name} Pirate Shop`)
      .setDescription(
        [
          `Your Pirate Tokens: **${fmt(player.pirateTokens || 0)}**`,
          `Shop Discount: **Lv.${discount.level}** (**-${discount.percent}%**)`,
          "",
          ...lines,
          "",
          "Buy with:",
          "`op p buy <item>`",
          "",
          "Examples:",
          "`op p buy rum`",
          "`op p buy pull reset`",
          "`op p buy universal random`",
          "`op p buy raid ticket`",
          "`op p buy gold raid ticket`",
        ].join("\n\n")
      )
      .setFooter({ text: "Pirate tokens are earned from weekly pirate leaderboard rewards." });

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to show pirate shop."));
  }
}

async function handlePirateBuy(message, args) {
  const query = cleanText(args.join(" "));
  const key = normalizePirateShopKey(query);
  const item = key ? PIRATE_SHOP_ITEMS[key] : null;

  if (!item) {
    return message.reply(
      makeError(
        [
          "Usage: `op p buy <item>`",
          "",
          "Available items:",
          "• rum",
          "• pull reset",
          "• universal random",
          "• raid ticket",
          "• gold raid ticket",
        ].join("\n")
      )
    );
  }

  try {
    requirePirate(message.author.id);

    const players = readPlayers();
    let player = getPlayer(players, message.author.id, message.author.username);
    const tokens = Math.max(0, Math.floor(Number(player.pirateTokens || 0)));

    const pirate = requirePirate(message.author.id);
    const price = getDiscountedPirateShopPrice(item, pirate);

    if (tokens < price.finalPrice) {
      return message.reply(
        makeError(
          [
            `Not enough pirate tokens to buy **${item.name}**.`,
            "",
            `Price: **${fmt(price.finalPrice)} pirate tokens**`,
            price.saved > 0
              ? `Base Price: ${fmt(price.basePrice)} • Discount: -${price.discountPercent}%`
              : null,
            `You have: **${fmt(tokens)} pirate tokens**`,
          ]
            .filter(Boolean)
            .join("\n")
        )
      );
    }

    player.pirateTokens = tokens - price.finalPrice;
    player = addPirateShopItem(player, item);

    players[String(message.author.id)] = player;
    writePlayers(players);

    return message.reply(
      makeSuccess(
        "Pirate Shop Purchase",
        [
          `You bought **${item.name}** for **${fmt(price.finalPrice)} pirate tokens**.`,
          price.saved > 0
            ? `Shop Discount Lv.${price.discountLevel}: saved **${fmt(price.saved)} token(s)**.`
            : null,
          `Remaining Pirate Tokens: **${fmt(player.pirateTokens)}**`,
        ]
          .filter(Boolean)
          .join("\n")
      )
    );
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to buy pirate shop item."));
  }
}

function applyPirateRaidDisplayStats(card, boosts = {}) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") return card;

  return {
    ...card,
    atk: Math.floor(Number(card.atk || 0) * (1 + Number(boosts.atk || 0) / 100)),
    hp: Math.floor(Number(card.hp || 0) * (1 + Number(boosts.hp || 0) / 100)),
    speed: Math.floor(Number(card.speed || 0) * (1 + Number(boosts.spd || 0) / 100)),
  };
}

function rollRaidAtkDamage(atk) {
  const value = Math.max(1, Math.floor(Number(atk || 1)));
  const min = Math.max(1, Math.floor(value * 0.85));
  const max = Math.max(min, Math.floor(value * 1.15));

  return {
    baseAtk: value,
    min,
    max,
    roll: Math.max(
      1,
      Math.floor(min + Math.random() * Math.max(1, max - min + 1))
    ),
  };
}

function getCardRaidDamage(rawCard, boosts = {}) {
  const hydrated = hydrateCard(rawCard) || rawCard || {};
  const card = applyPirateRaidDisplayStats(hydrated, boosts);

  const atk = Math.max(
    1,
    Math.floor(
      Number(
        card?.atk ||
          card?.attack ||
          card?.battleAtk ||
          card?.currentAtk ||
          card?.finalAtk ||
          card?.stats?.atk ||
          card?.stats?.attack ||
          rawCard?.atk ||
          rawCard?.attack ||
          rawCard?.battleAtk ||
          rawCard?.currentAtk ||
          rawCard?.finalAtk ||
          1
      )
    )
  );

  return rollRaidAtkDamage(atk);
}

function getCardRaidHp(rawCard, boosts = {}) {
  const hydrated = hydrateCard(rawCard) || rawCard || {};
  const card = applyPirateRaidDisplayStats(hydrated, boosts);

  const hp = Math.max(
    1,
    Math.floor(
      Number(
        card?.hp ||
          card?.health ||
          card?.battleHp ||
          card?.currentHp ||
          card?.finalHp ||
          card?.stats?.hp ||
          card?.stats?.health ||
          rawCard?.hp ||
          rawCard?.health ||
          rawCard?.battleHp ||
          rawCard?.currentHp ||
          rawCard?.finalHp ||
          1
      )
    )
  );

  return hp;
}

function getBossCounterDamage(boss) {
  const baseAtk = Math.max(1, Math.floor(Number(boss?.atk || 1)));
  const min = Math.max(1, Math.floor(baseAtk * 0.9));
  const max = Math.max(min, Math.floor(baseAtk * 1.1));

  return Math.max(
    1,
    Math.floor(min + Math.random() * Math.max(1, max - min + 1))
  );
}

function getBestRaidCards(player, limit = 3) {
  const boosts = getPassiveBoostSummary(player);

  return (Array.isArray(player?.cards) ? player.cards : [])
    .filter(Boolean)
    .map((rawCard) => {
      const hydrated = hydrateCard(rawCard) || rawCard;
      const card = applyPirateRaidDisplayStats(hydrated, boosts);
      const damage = getCardRaidDamage(rawCard, boosts);
      const maxHp = getCardRaidHp(rawCard, boosts);

      return {
        card,
        damage,
        maxHp,
        currentHp: maxHp,
        sortDamage: Math.max(Number(damage.max || 0), Number(damage.roll || 0)),
      };
    })
    .filter((entry) => {
      const role = String(entry.card?.cardRole || "").toLowerCase();
      return role !== "boost";
    })
    .sort((a, b) => b.sortDamage - a.sortDamage)
    .slice(0, limit);
}

function getPirateRaidState(pirate, tierKey) {
  const raids = pirate.raids && typeof pirate.raids === "object" ? pirate.raids : {};
  const current = raids[tierKey] || {};
  const boss = PIRATE_RAID_BOSSES[tierKey];

  return {
    hpLeft: Math.max(0, Math.floor(Number(current.hpLeft ?? boss.hp))),
    defeated: Boolean(current.defeated),
    defeatedAt: Number(current.defeatedAt || 0),
    clearRewardedAt: Number(current.clearRewardedAt || 0),
    totalDamage: Math.max(0, Math.floor(Number(current.totalDamage || 0))),
    contributors:
      current.contributors && typeof current.contributors === "object"
        ? current.contributors
        : {},
    lastAttackAt:
      current.lastAttackAt && typeof current.lastAttackAt === "object"
        ? current.lastAttackAt
        : {},
  };
}

function getPirateRaidPoints({ boss, damage, defeated, pirate }) {
  const damageRatio = Math.min(1, Number(damage || 0) / Number(boss.hp || 1));
  const base = Math.max(1, Math.floor(Number(boss.basePoints || 1) * damageRatio));
  const clearBonus = defeated ? Math.floor(Number(boss.basePoints || 0) * 0.35) : 0;

  const raidPointLevel = Math.max(
    0,
    Math.floor(Number(pirate?.perks?.raidPointBoost || 0))
  );

  const boosted = Math.floor((base + clearBonus) * (1 + raidPointLevel * 0.01));

  return {
    points: Math.max(1, boosted),
    raidPointLevel,
  };
}

function getPirateRaidClearReward(boss) {
  const rewards = {
    easy: {
      berries: 10000,
      gems: 5,
      items: [
        { code: "rare_resource_box", name: "Rare Resource Box", type: "Box", amount: 1 },
      ],
    },

    normal: {
      berries: 20000,
      gems: 10,
      items: [
        { code: "rare_resource_box", name: "Rare Resource Box", type: "Box", amount: 2 },
      ],
    },

    hard: {
      berries: 50000,
      gems: 20,
      items: [
        { code: "elite_resource_box", name: "Elite Resource Box", type: "Box", amount: 1 },
        { code: "pull_reset_ticket", name: "Pull Reset Ticket", type: "Item", amount: 1 },
      ],
    },

    extreme: {
      berries: 100000,
      gems: 35,
      items: [
        { code: "elite_resource_box", name: "Elite Resource Box", type: "Box", amount: 2 },
        { code: "pull_reset_ticket", name: "Pull Reset Ticket", type: "Item", amount: 1 },
      ],
    },

    legendary: {
      berries: 250000,
      gems: 75,
      items: [
        { code: "legend_resource_box", name: "Legend Resource Box", type: "Box", amount: 2 },
        { code: "pull_reset_ticket", name: "Pull Reset Ticket", type: "Item", amount: 1 },
        { code: "gold_raid_ticket", name: "Gold Raid Ticket", type: "Ticket", amount: 1 },
      ],
    },
  };

  return (
    rewards[boss.key] || {
      berries: Math.max(10000, Math.floor(Number(boss.basePoints || 1) * 100)),
      gems: Math.max(5, Math.floor(Number(boss.basePoints || 1) / 50)),
      items: [
        { code: "rare_resource_box", name: "Rare Resource Box", type: "Box", amount: 1 },
      ],
    }
  );
}

function addRaidRewardStack(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(item?.code || "");
  const amount = Math.max(1, Math.floor(Number(item?.amount || 1)));

  if (!code) return arr;

  const index = arr.findIndex((entry) => String(entry.code || "") === code);

  if (index === -1) {
    arr.push({
      ...item,
      amount,
    });
  } else {
    arr[index] = {
      ...arr[index],
      amount: Math.max(0, Math.floor(Number(arr[index].amount || 0))) + amount,
    };
  }

  return arr;
}

function applyPirateRaidContributorRewards(message, boss, contributors) {
  const entries = Object.entries(contributors || {}).filter(
    ([, data]) => Number(data?.damage || 0) > 0
  );

  if (!entries.length) {
    return [];
  }

  const reward = getPirateRaidClearReward(boss);
  const players = readPlayers();
  const rewardLines = [];

  for (const [userId, data] of entries) {
    const player = getPlayer(players, userId, `User ${userId}`);

    player.berries =
      Math.max(0, Math.floor(Number(player.berries || 0))) +
      Math.max(0, Math.floor(Number(reward.berries || 0)));

    player.gems =
      Math.max(0, Math.floor(Number(player.gems || 0))) +
      Math.max(0, Math.floor(Number(reward.gems || 0)));

    for (const item of reward.items || []) {
      if (String(item.type || "").toLowerCase() === "ticket") {
        player.tickets = addRaidRewardStack(player.tickets, item);
      } else if (String(item.type || "").toLowerCase() === "box") {
        player.boxes = addRaidRewardStack(player.boxes, item);
      } else {
        player.items = addRaidRewardStack(player.items, item);
      }
    }

    players[String(userId)] = player;

    const itemText = (reward.items || [])
      .map((item) => `${item.name || item.code} x${fmt(item.amount || 1)}`)
      .join(", ");

    rewardLines.push(
      [
        `• <@${userId}> — +${fmt(reward.berries)} berries, +${fmt(reward.gems)} gems`,
        itemText ? `  Rewards: ${itemText}` : null,
        `  Damage: ${fmt(data.damage)}`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  writePlayers(players);

  return rewardLines;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getPirateRaidCooldownInfo(pirate, tierKey, userId) {
  const raidState = getPirateRaidState(pirate, tierKey);
  const lastAttackAt = Number(raidState.lastAttackAt?.[String(userId)] || 0);
  const now = Date.now();
  const nextAttackAt = lastAttackAt + PIRATE_RAID_ATTACK_COOLDOWN_MS;
  const remaining = Math.max(0, nextAttackAt - now);

  return {
    lastAttackAt,
    nextAttackAt,
    remaining,
    ready: remaining <= 0,
  };
}

function calculateManualRaidCardDamage(entry) {
  const min = Math.max(1, Math.floor(Number(entry?.damage?.min || entry?.damage?.roll || 1)));
  const max = Math.max(min, Math.floor(Number(entry?.damage?.max || min)));

  const rolledAtkDamage = Math.max(
    1,
    Math.floor(min + Math.random() * Math.max(1, max - min + 1))
  );

  return {
    baseDamage: rolledAtkDamage,
    finalDamage: rolledAtkDamage,
    bossDamageLevel: 0,
    bonusMultiplier: 1,
  };
}

function buildManualRaidEmbed({
  boss,
  pirate,
  hpLeft,
  maxHp,
  selectedCards,
  turnCount,
  totalDamage,
  totalPoints,
  defeated,
  battleLog = [],
  clearRewardLines = [],
}) {
  const cardLines = selectedCards.map((entry, index) => {
    const card = entry.card;
    const atk = entry.damage || {};
    const dead = Number(entry.currentHp || 0) <= 0;

    const atkText =
      Number(atk.max || 0) > Number(atk.min || 0)
        ? `${fmt(atk.min)}-${fmt(atk.max)}`
        : fmt(atk.roll);

    return `${dead ? "💀" : "⚔️"} ${index + 1}. ${
      card.displayName || card.name || card.code || "Unknown"
    } — ATK ${atkText} | HP ${fmt(entry.currentHp)}/${fmt(entry.maxHp)}`;
  });

  return new EmbedBuilder()
    .setColor(defeated ? GREEN : BLUE)
    .setTitle(`☠️ Pirate Raid Manual Fight — ${boss.name}`)
    .setDescription(
      [
        `**Tier:** ${boss.tierName}`,
        `**Boss ATK:** ${fmt(boss.atk || 0)}`,
        `**Boss HP:** ${defeated ? "Defeated" : `${fmt(hpLeft)} / ${fmt(maxHp)}`}`,
        `**Pirate:** ${pirate.name}`,
        `**Turn:** ${fmt(turnCount)}/${fmt(PIRATE_RAID_MAX_TURNS)}`,
        "",
        `**Total Damage This Session:** ${fmt(totalDamage)}`,
        `**Total Points This Session:** ${fmt(totalPoints)}`,
        "",
        "**Your Cards:**",
        ...cardLines,
        battleLog.length ? "" : null,
        battleLog.length ? "**Battle Log:**" : null,
        ...battleLog.slice(-2),
        clearRewardLines.length ? "" : null,
        clearRewardLines.length ? "**Clear Rewards:**" : null,
        ...clearRewardLines,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({
      text: "Choose a card to attack. Damage is randomly rolled from the card ATK range.",
    });
}

function buildManualRaidButtons(sessionId, selectedCards, disabled = false) {
  const row = new ActionRowBuilder();

  selectedCards.forEach((entry, index) => {
    const card = entry.card;
    const dead = Number(entry.currentHp || 0) <= 0;

    const label = String(card.displayName || card.name || `Card ${index + 1}`)
      .slice(0, 70);

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`praid:${sessionId}:atk:${index}`)
        .setLabel(`${index + 1}. ${label}`)
        .setStyle(dead ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(disabled || dead)
    );
  });

  return [row];
}

function markPirateRaidCooldown(pirateId, tierKey, userId) {
  updatePirate(pirateId, (fresh) => {
    const raids =
      fresh.raids && typeof fresh.raids === "object" ? { ...fresh.raids } : {};

    const oldRaid = getPirateRaidState(fresh, tierKey);

    raids[tierKey] = {
      ...oldRaid,
      lastAttackAt: {
        ...(oldRaid.lastAttackAt || {}),
        [String(userId)]: Date.now(),
      },
    };

    return {
      ...fresh,
      raids,
      logs: [
        ...(fresh.logs || []),
        {
          at: Date.now(),
          type: "pirate_raid_manual_start",
          tierKey,
          userId: String(userId),
        },
      ].slice(-25),
    };
  });
}

function areAllManualRaidCardsDead(selectedCards) {
  return selectedCards.every((entry) => Number(entry.currentHp || 0) <= 0);
}

function formatPirateRaidBossLine(pirate, boss, userId = null) {
  const state = getPirateRaidState(pirate, boss.key);
  const hpText = state.defeated
    ? "Defeated"
    : `${fmt(state.hpLeft)} / ${fmt(boss.hp)}`;

  let cooldownText = "Cooldown: Ready";

  if (userId) {
    const cooldown = getPirateRaidCooldownInfo(pirate, boss.key, userId);
    cooldownText = cooldown.ready
      ? "Cooldown: Ready"
      : `Cooldown: ${formatDuration(cooldown.remaining)}`;
  }

  return [
    `**${boss.tierName} — ${boss.name}**`,
    `Min Pirate Lv.${boss.minPirateLevel} • Base Points: ${fmt(boss.basePoints)}`,
    `HP: ${hpText}`,
    cooldownText,
    `Attack: \`op p attack ${boss.key}\``,
    `_${boss.description}_`,
  ].join("\n");
}

async function handlePirateRaid(message) {
  try {
    const pirate = requirePirate(message.author.id);

    const lines = Object.values(PIRATE_RAID_BOSSES).map((boss) =>
      formatPirateRaidBossLine(pirate, boss, message.author.id)
    );

    const embed = new EmbedBuilder()
      .setColor(GOLD)
      .setTitle(`🏴‍☠️ ${pirate.name} Pirate Raid Boss`)
      .setDescription(
        [
          `**Pirate Level:** ${pirate.level}/100`,
          `**Weekly Points:** ${fmt(pirate.weeklyPoints || 0)}`,
          "",
          ...lines,
        ].join("\n\n")
      )
      .setFooter({
        text: "Pirate Raid is separate from normal boss/raid systems.",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to show pirate raid."));
  }
}

async function handlePirateAttack(message, args) {
  const tierKey = normalizePirateRaidTier(args.join(" "));

  if (!tierKey || !PIRATE_RAID_BOSSES[tierKey]) {
    return message.reply(
      makeError(
        [
          "Usage: `op p attack <tier>`",
          "",
          "Available tiers:",
          "• easy",
          "• normal",
          "• hard",
          "• extreme",
          "• legendary",
        ].join("\n")
      )
    );
  }

  try {
    const pirate = requirePirate(message.author.id);
    const boss = PIRATE_RAID_BOSSES[tierKey];

    if (Number(pirate.level || 1) < Number(boss.minPirateLevel || 1)) {
      return message.reply(
        makeError(
          `${boss.tierName} raid requires Pirate Level **${boss.minPirateLevel}**.`
        )
      );
    }

    const currentRaid = getPirateRaidState(pirate, tierKey);

    if (currentRaid.defeated || currentRaid.hpLeft <= 0) {
      return message.reply(
        makeError(
          [
            `**${boss.name}** is already defeated for this pirate/guild.`,
            "",
            "Wait for the weekly reset, or attack another tier.",
          ].join("\n")
        )
      );
    }

    const cooldown = getPirateRaidCooldownInfo(pirate, tierKey, message.author.id);

    if (!cooldown.ready) {
      return message.reply(
        makeError(
          [
            `You already attacked **${boss.name}** recently.`,
            "",
            `Cooldown left: **${formatDuration(cooldown.remaining)}**`,
            "",
            "You can still attack another Pirate Raid tier if it is ready.",
          ].join("\n")
        )
      );
    }

    const players = readPlayers();
    const player = getPlayer(players, message.author.id, message.author.username);
    const selectedCards = getBestRaidCards(player, 3);

    if (!selectedCards.length) {
      return message.reply(
        makeError("You need at least 1 card to attack Pirate Raid Boss.")
      );
    }

    const sessionId = `${Date.now()}_${message.author.id}`;
    let hpLeft = currentRaid.hpLeft;
    let defeated = false;
    let totalDamage = 0;
    let totalPoints = 0;
    let turnCount = 0;
    let battleLog = [];
    let clearRewardLines = [];

    markPirateRaidCooldown(pirate.id, tierKey, message.author.id);

    const sent = await message.reply({
      embeds: [
        buildManualRaidEmbed({
          boss,
          pirate,
          hpLeft,
          maxHp: boss.hp,
          selectedCards,
          turnCount,
          totalDamage,
          totalPoints,
          defeated,
          battleLog,
          clearRewardLines,
        }),
      ],
      components: buildManualRaidButtons(sessionId, selectedCards),
      allowedMentions: { repliedUser: false },
    });

    const collector = sent.createMessageComponentCollector({
      time: PIRATE_RAID_MANUAL_FIGHT_TIMEOUT_MS,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the raid attacker can use these buttons.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const parts = String(interaction.customId || "").split(":");
      const clickedSessionId = parts[1];
      const action = parts[2];
      const index = Math.floor(Number(parts[3]));

      if (
        clickedSessionId !== sessionId ||
        action !== "atk" ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= selectedCards.length
      ) {
        return interaction.reply({
          content: "Invalid raid button.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const selected = selectedCards[index];

      if (Number(selected.currentHp || 0) <= 0) {
        return interaction.reply({
          content: "This card is already defeated.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (defeated) {
        return interaction.reply({
          content: "This boss is already defeated.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (turnCount >= PIRATE_RAID_MAX_TURNS) {
        return interaction.reply({
          content: "This manual raid fight has reached the turn limit.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const latestPirate = findPirateByUser(message.author.id);
      const latestRaid = getPirateRaidState(latestPirate || pirate, tierKey);

      if (latestRaid.defeated || latestRaid.hpLeft <= 0) {
        defeated = true;
        hpLeft = 0;

        await interaction.update({
          embeds: [
            buildManualRaidEmbed({
              boss,
              pirate: latestPirate || pirate,
              hpLeft,
              maxHp: boss.hp,
              selectedCards,
              turnCount,
              totalDamage,
              totalPoints,
              defeated,
              battleLog,
              clearRewardLines,
            }),
          ],
          components: buildManualRaidButtons(sessionId, selectedCards, true),
        });

        collector.stop("defeated");
        return;
      }

      turnCount += 1;

      const damageCalc = calculateManualRaidCardDamage(selected);

      const damage = Math.min(latestRaid.hpLeft, damageCalc.finalDamage);
      const nextHpLeft = Math.max(0, latestRaid.hpLeft - damage);
      const nextDefeated = nextHpLeft <= 0;

      const pointResult = getPirateRaidPoints({
        boss,
        damage,
        defeated: nextDefeated,
        pirate: latestPirate || pirate,
      });

      let bossCounterDamage = 0;

      if (!nextDefeated) {
        bossCounterDamage = Math.min(
          Number(selected.currentHp || 0),
          getBossCounterDamage(boss)
        );

        selected.currentHp = Math.max(
          0,
          Math.floor(Number(selected.currentHp || 0)) - bossCounterDamage
        );
      }

      const updated = updatePirate((latestPirate || pirate).id, (fresh) => {
        const raids =
          fresh.raids && typeof fresh.raids === "object" ? { ...fresh.raids } : {};

        const oldRaid = getPirateRaidState(fresh, tierKey);
        const userId = String(message.author.id);

        const contributors =
          oldRaid.contributors && typeof oldRaid.contributors === "object"
            ? { ...oldRaid.contributors }
            : {};

        const oldContributor = contributors[userId] || {
          damage: 0,
          points: 0,
          attacks: 0,
          lastAttackAt: 0,
        };

        contributors[userId] = {
          damage:
            Math.max(0, Math.floor(Number(oldContributor.damage || 0))) + damage,
          points:
            Math.max(0, Math.floor(Number(oldContributor.points || 0))) +
            pointResult.points,
          attacks:
            Math.max(0, Math.floor(Number(oldContributor.attacks || 0))) + 1,
          lastAttackAt: Date.now(),
        };

        raids[tierKey] = {
          ...oldRaid,
          hpLeft: nextHpLeft,
          defeated: nextDefeated,
          defeatedAt: nextDefeated ? Date.now() : oldRaid.defeatedAt || 0,
          clearRewardedAt: nextDefeated
            ? Date.now()
            : Number(oldRaid.clearRewardedAt || 0),
          totalDamage: Math.max(0, Number(oldRaid.totalDamage || 0)) + damage,
          contributors,
          lastAttackAt: {
            ...(oldRaid.lastAttackAt || {}),
            [userId]: Date.now(),
          },
        };

        return {
          ...fresh,
          raids,
          weeklyPoints:
            Math.max(0, Math.floor(Number(fresh.weeklyPoints || 0))) +
            pointResult.points,
          totalPoints:
            Math.max(0, Math.floor(Number(fresh.totalPoints || 0))) +
            pointResult.points,
          logs: [
            ...(fresh.logs || []),
            {
              at: Date.now(),
              type: "pirate_raid_manual_attack",
              tierKey,
              userId,
              card:
                selected.card?.displayName ||
                selected.card?.name ||
                selected.card?.code ||
                "Unknown",
              damage,
              bossCounterDamage,
              points: pointResult.points,
              defeated: nextDefeated,
            },
          ].slice(-25),
        };
      });

      hpLeft = nextHpLeft;
      defeated = nextDefeated;
      totalDamage += damage;
      totalPoints += pointResult.points;

      battleLog.push(
        `⚔️ ${
          selected.card?.displayName ||
          selected.card?.name ||
          selected.card?.code ||
          "Card"
        } dealt **${fmt(damage)}** damage.`
      );

      if (bossCounterDamage > 0) {
        battleLog.push(
          `☠️ ${boss.name} countered for **${fmt(
            bossCounterDamage
          )}** damage.`
        );
      }

      if (Number(selected.currentHp || 0) <= 0) {
        battleLog.push(
          `💀 ${
            selected.card?.displayName ||
            selected.card?.name ||
            selected.card?.code ||
            "Card"
          } was defeated.`
        );
      }

      if (defeated) {
        clearRewardLines = applyPirateRaidContributorRewards(
          message,
          boss,
          updated.raids?.[tierKey]?.contributors || {}
        );
      }

      const ended =
        defeated ||
        areAllManualRaidCardsDead(selectedCards) ||
        turnCount >= PIRATE_RAID_MAX_TURNS;

      await interaction.update({
        embeds: [
          buildManualRaidEmbed({
            boss,
            pirate: updated,
            hpLeft,
            maxHp: boss.hp,
            selectedCards,
            turnCount,
            totalDamage,
            totalPoints,
            defeated,
            battleLog,
            clearRewardLines,
          }),
        ],
        components: buildManualRaidButtons(sessionId, selectedCards, ended),
      });

      if (ended) {
        collector.stop(
          defeated
            ? "defeated"
            : areAllManualRaidCardsDead(selectedCards)
            ? "all_cards_dead"
            : "turn_limit"
        );
      }
    });

    collector.on("end", async () => {
      try {
        await sent.edit({
          components: buildManualRaidButtons(sessionId, selectedCards, true),
        });
      } catch {}
    });
  } catch (error) {
    return message.reply(
      makeError(error.message || "Failed to attack pirate raid boss.")
    );
  }
}

async function handlePirateLeaderboard(message) {
  try {
    const state = readPirateState();
    const pirates = Object.values(state.pirates || {})
      .filter((pirate) => Array.isArray(pirate.members) && pirate.members.length > 0)
      .sort((a, b) => Number(b.weeklyPoints || 0) - Number(a.weeklyPoints || 0))
      .slice(0, 10);

    if (!pirates.length) {
      return message.reply(makeError("No pirate leaderboard data yet."));
    }

    const lines = pirates.map((pirate, index) => {
      const rank = index + 1;
      const medal =
        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

      const reward = getPirateWeeklyRewardPreview(rank);

      return [
        `${medal} **${pirate.name}**`,
        `${fmt(pirate.weeklyPoints || 0)} points • Lv.${pirate.level || 1} • ${
          pirate.members.length
        }/${MAX_MEMBERS} members`,
        `Reward: Leader ${reward.leader} tokens • Members/Vice ${reward.member} tokens`,
      ].join("\n");
    });

    const embed = new EmbedBuilder()
      .setColor(GOLD)
      .setTitle("🏴‍☠️ Pirate Weekly Leaderboard")
      .setDescription(lines.join("\n\n"))
      .setFooter({
        text: "Weekly reset runs automatically when a pirate command is used after the weekly reset time.",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    return message.reply(makeError(error.message || "Failed to show pirate leaderboard."));
  }
}

function buildWeeklyResetNotice(resetResult) {
  if (!resetResult?.didReset) return null;

  const rewards = Array.isArray(resetResult.rewards) ? resetResult.rewards : [];
  const guildCount = new Set(rewards.map((entry) => entry.pirateId)).size;

  return [
    "🏴‍☠️ **Pirate Weekly Reset Completed**",
    `Guilds rewarded: **${fmt(guildCount)}**`,
    "Weekly points and pirate raid bosses have been reset.",
  ].join("\n");
}

async function replyWithOptionalResetNotice(message, payload, resetResult) {
  const notice = buildWeeklyResetNotice(resetResult);
  if (!notice) return message.reply(payload);

  if (typeof payload === "string") {
    return message.reply(`${notice}\n\n${payload}`);
  }

  if (payload?.embeds?.length) {
    const first = EmbedBuilder.from(payload.embeds[0]);
    const oldDescription = first.data.description || "";

    first.setDescription(`${notice}\n\n${oldDescription}`);

    return message.reply({
      ...payload,
      embeds: [first, ...payload.embeds.slice(1)],
    });
  }

  return message.reply(payload);
}

async function handlePirateRewardInfo(message) {
  const lines = [1, 2, 3, 4].map((rank) => {
    const reward = getPirateWeeklyRewardPreview(rank);
    const label = rank === 4 ? "Rank 4+" : `Rank ${rank}`;

    return `**${label}** — Leader ${reward.leader} tokens • Vice/Crew ${reward.member} tokens`;
  });

  const embed = new EmbedBuilder()
    .setColor(GOLD)
    .setTitle("🏴‍☠️ Pirate Weekly Rewards")
    .setDescription(
      [
        ...lines,
        "",
        "Rewards are distributed automatically during weekly reset.",
        "Weekly points and pirate raid bosses are reset after rewards are distributed.",
      ].join("\n")
    );

  return message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false },
  });
}

module.exports = {
  name: "pirate",
  aliases: ["p"],

  async execute(message, args) {
    const resetResult = runPirateWeeklyResetIfNeeded();

    const sub = String(args[0] || "help").toLowerCase();
    const rest = args.slice(1);

    if (["help", "menu"].includes(sub)) {
      return replyWithOptionalResetNotice(
        message,
        {
          embeds: [usageEmbed()],
          allowedMentions: { repliedUser: false },
        },
        resetResult
      );
    }

    if (sub === "create") return handleCreate(message, rest);
    if (sub === "invite") return handleInvite(message, rest);
    if (sub === "join") return handleJoin(message, rest);
    if (sub === "leave") return handleLeave(message);
    if (sub === "disband") return handleDisband(message, rest);
    if (sub === "kick") return handleKick(message, rest);
    if (sub === "promote") return handlePromote(message, rest);
    if (sub === "demote") return handleDemote(message, rest);
    if (sub === "deposit") return handleDeposit(message, rest);
    if (sub === "shop") return handlePirateShop(message);
    if (sub === "buy") return handlePirateBuy(message, rest);
    if (sub === "raid") return handlePirateRaid(message);
    if (sub === "attack") return handlePirateAttack(message, rest);
    if (["lb", "leaderboard", "rank"].includes(sub)) return handlePirateLeaderboard(message);
    if (["reward", "rewards"].includes(sub)) return handlePirateRewardInfo(message);
    if (sub === "level") return handlePirateLevel(message);
    if (sub === "perks" || sub === "perk") return handlePiratePerks(message);

    if (sub === "upgrade") {
    const upgradeType = String(rest[0] || "").toLowerCase();
    const upgradeArgs = rest.slice(1);

    if (upgradeType === "level") return handleUpgradeLevel(message);
    if (upgradeType === "perk") return handleUpgradePerk(message, upgradeArgs);

    return message.reply(
        makeError(
        [
            "Usage:",
            "`op p upgrade level`",
            "`op p upgrade perk <perk>`",
        ].join("\n")
        )
    );
    }

    if (["info", "profile"].includes(sub)) {
      try {
        const query = cleanText(rest.join(" "));
        const pirate = query
          ? findPirateByNameOrId(query)
          : requirePirate(message.author.id);

        if (!pirate) {
          return message.reply(makeError("Pirate/guild not found."));
        }

        return sendPirateInfo(message, pirate);
      } catch (error) {
        return message.reply(makeError(error.message || "Failed to show pirate info."));
      }
    }

    if (["storage", "store", "bank"].includes(sub)) {
      try {
        const pirate = requirePirate(message.author.id);
        return sendStorage(message, pirate);
      } catch (error) {
        return message.reply(makeError(error.message || "Failed to show storage."));
      }
    }

    return message.reply({
      embeds: [usageEmbed()],
      allowedMentions: { repliedUser: false },
    });
  },
};