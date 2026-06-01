const { EmbedBuilder } = require("discord.js");
const { readPlayers, writePlayers } = require("../playerStore");
const {
  MAX_MEMBERS,
  normalizeMaterialKey,
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

const GOLD = 0xf1c40f;
const RED = 0xe74c3c;
const GREEN = 0x2ecc71;
const BLUE = 0x3498db;

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
        "`op pirate create <name>`",
        "`op pirate info`",
        "`op pirate invite <@user>`",
        "`op pirate join <pirate name/id>`",
        "`op pirate leave`",
        "`op pirate kick <@user>`",
        "`op pirate promote <@user>`",
        "`op pirate demote <@user>`",
        "",
        "**Storage Commands**",
        "`op pirate deposit berries <amount>`",
        "`op pirate deposit material <amount> <material name>`",
        "`op pirate storage`",
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
  const embed = new EmbedBuilder()
    .setColor(GOLD)
    .setTitle(`🏴‍☠️ ${pirate.name}`)
    .setDescription(
      [
        `**Guild Level:** ${pirate.level}/100`,
        `**Members:** ${(pirate.members || []).length}/${MAX_MEMBERS}`,
        `**Weekly Points:** ${fmt(pirate.weeklyPoints)}`,
        `**Storage Berries:** ${fmt(pirate.storage?.berries || 0)}`,
        "",
        "**Crew**",
        ...memberLines(pirate, message),
      ].join("\n")
    )
    .setFooter({ text: `Pirate ID: ${pirate.id}` });

  return message.reply({
    embeds: [embed],
    allowedMentions: { users: pirate.members || [], repliedUser: false },
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
    return message.reply(makeError("Usage: `op pirate create <name>`"));
  }

  try {
    const pirate = createPirate({
      name,
      leaderId: message.author.id,
    });

    return message.reply(
      makeSuccess(
        "Pirate Created",
        [
          `**${pirate.name}** has been created.`,
          `Leader: <@${message.author.id}>`,
          `Members: **1/${MAX_MEMBERS}**`,
          "",
          "Next: invite crew with `op pirate invite <@user>`",
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
      return message.reply(makeError("Usage: `op pirate invite <@user>`"));
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
              `\`op pirate join ${pirate.id}\``,
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
    return message.reply(makeError("Usage: `op pirate join <pirate name/id>`"));
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

async function handleKick(message, args) {
  try {
    const pirate = requirePirate(message.author.id);
    requireOfficer(pirate, message.author.id);

    const targetId = getMentionId(args[0]);
    if (!targetId) {
      return message.reply(makeError("Usage: `op pirate kick <@user>`"));
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
      return message.reply(makeError("Usage: `op pirate promote <@user>`"));
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
      return message.reply(makeError("Usage: `op pirate demote <@user>`"));
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
    return message.reply(makeError("Usage: `op pirate deposit berries <amount>`"));
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
    return message.reply(makeError("Usage: `op pirate deposit material <amount> <material name>`"));
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
        "`op pirate deposit berries <amount>`",
        "`op pirate deposit material <amount> <material name>`",
      ].join("\n")
    )
  );
}

module.exports = {
  name: "pirate",
  aliases: ["guild", "crew"],

  async execute(message, args) {
    const sub = String(args[0] || "help").toLowerCase();
    const rest = args.slice(1);

    if (["help", "menu"].includes(sub)) {
      return message.reply({
        embeds: [usageEmbed()],
        allowedMentions: { repliedUser: false },
      });
    }

    if (sub === "create") return handleCreate(message, rest);
    if (sub === "invite") return handleInvite(message, rest);
    if (sub === "join") return handleJoin(message, rest);
    if (sub === "leave") return handleLeave(message);
    if (sub === "kick") return handleKick(message, rest);
    if (sub === "promote") return handlePromote(message, rest);
    if (sub === "demote") return handleDemote(message, rest);
    if (sub === "deposit") return handleDeposit(message, rest);

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