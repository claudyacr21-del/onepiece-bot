const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");

const SESSION_MS = 10 * 60 * 1000;
const MAX_ITEMS = 5;
const UNTRADEABLE_STORES = ["tickets"];

const slug = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

const fmtEntry = (e) =>
  e.type === "berries" ? `${e.amount.toLocaleString("en-US")} berries` : `${e.code}_${e.amount}`;

function parseOfferBlock(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  const parts = text.split(",").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return [];
  if (parts.length > MAX_ITEMS) throw new Error(`Max ${MAX_ITEMS} different entries per side.`);

  return parts.map((part) => {
    if (/^\d+$/.test(part)) return { type: "berries", code: "berries", amount: num(part) };
    const m = part.match(/^(.+?)_(\d+)$/);
    if (!m) throw new Error(`Invalid trade entry: ${part}`);
    return { type: "asset", code: slug(m[1]), amount: num(m[2]) };
  });
}

function parseTradeContent(content) {
  const m = String(content).match(/<@!?\d+>\s*\(([^)]*)\)\s*\(([^)]*)\)/);
  if (!m) throw new Error("Format: op trade @mention (your offer) (their offer)");
  return {
    ownerOffer: parseOfferBlock(m[1]),
    targetOffer: parseOfferBlock(m[2]),
  };
}

function getTeamIds(player) {
  return new Set(Array.isArray(player?.team?.slots) ? player.team.slots.filter(Boolean) : []);
}

function isCardTradable(card, teamIds) {
  if (!card) return false;
  if (teamIds.has(card.instanceId)) return false;
  if (card.slot_locked) return false;
  if (card.equippedWeapon || card.equippedDevilFruit) return false;
  return true;
}

function findStackIndex(list, code) {
  return (Array.isArray(list) ? list : []).findIndex(
    (x) => slug(x?.code || x?.name) === code
  );
}

function findStackEntry(list, code) {
  const idx = findStackIndex(list, code);
  if (idx === -1) return null;
  return { index: idx, entry: list[idx] };
}

function getTradableCardMatches(player, code) {
  const teamIds = getTeamIds(player);
  return (Array.isArray(player.cards) ? player.cards : []).filter((c) => {
    const cardCode = slug(c?.code || c?.characterCode || c?.displayName || c?.name);
    return cardCode === code && isCardTradable(c, teamIds);
  });
}

function ensureNotTicket(player, code) {
  const hit = findStackEntry(player.tickets, code);
  if (hit) throw new Error(`Ticket item \`${code}\` is untradeable.`);
}

function resolveEntry(player, entry) {
  if (entry.type === "berries") {
    if (num(player.berries) < entry.amount) {
      throw new Error(`${player.username} does not have enough berries.`);
    }
    return { kind: "berries", amount: entry.amount, code: "berries" };
  }

  ensureNotTicket(player, entry.code);

  const stores = ["weapons", "devilFruits", "materials", "items", "boxes", "fragments"];
  for (const store of stores) {
    const hit = findStackEntry(player[store], entry.code);
    if (!hit) continue;
    const have = num(hit.entry?.amount, 1);
    if (have < entry.amount) throw new Error(`${player.username} lacks ${entry.code}_${entry.amount}.`);
    return { kind: "stack", store, amount: entry.amount, code: entry.code };
  }

  const cardMatches = getTradableCardMatches(player, entry.code);
  if (cardMatches.length >= entry.amount) {
    return {
      kind: "cards",
      store: "cards",
      amount: entry.amount,
      code: entry.code,
      cards: cardMatches.slice(0, entry.amount),
    };
  }

  throw new Error(`${player.username} does not own tradable ${entry.code}_${entry.amount}.`);
}

function resolveOffer(player, offer) {
  return offer.map((entry) => resolveEntry(player, entry));
}

function removeStack(list, code, amount) {
  const arr = Array.isArray(list) ? [...list] : [];
  const idx = findStackIndex(arr, code);
  if (idx === -1) throw new Error(`Missing stack item ${code}.`);
  const have = num(arr[idx]?.amount, 1);
  const left = have - amount;
  if (left < 0) throw new Error(`Not enough ${code}.`);
  if (left === 0) arr.splice(idx, 1);
  else arr[idx] = { ...arr[idx], amount: left };
  return arr;
}

function addStack(list, incoming, amount) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = slug(incoming?.code || incoming?.name);
  const idx = findStackIndex(arr, code);

  if (idx === -1) {
    arr.push({
      ...incoming,
      code: incoming?.code || code,
      name: incoming?.name || code,
      amount,
    });
  } else {
    arr[idx] = {
      ...arr[idx],
      amount: num(arr[idx]?.amount, 1) + amount,
    };
  }

  return arr;
}

function applyResolvedTrade(from, to, resolved) {
  const fromNext = {
    ...from,
    cards: [...(from.cards || [])],
    weapons: [...(from.weapons || [])],
    devilFruits: [...(from.devilFruits || [])],
    materials: [...(from.materials || [])],
    items: [...(from.items || [])],
    boxes: [...(from.boxes || [])],
    fragments: [...(from.fragments || [])],
  };

  const toNext = {
    ...to,
    cards: [...(to.cards || [])],
    weapons: [...(to.weapons || [])],
    devilFruits: [...(to.devilFruits || [])],
    materials: [...(to.materials || [])],
    items: [...(to.items || [])],
    boxes: [...(to.boxes || [])],
    fragments: [...(to.fragments || [])],
  };

  for (const entry of resolved) {
    if (entry.kind === "berries") {
      fromNext.berries = num(fromNext.berries) - entry.amount;
      toNext.berries = num(toNext.berries) + entry.amount;
      continue;
    }

    if (entry.kind === "stack") {
      const sourceHit = findStackEntry(fromNext[entry.store], entry.code);
      if (!sourceHit) throw new Error(`Missing ${entry.code} during trade apply.`);
      fromNext[entry.store] = removeStack(fromNext[entry.store], entry.code, entry.amount);
      toNext[entry.store] = addStack(toNext[entry.store], sourceHit.entry, entry.amount);
      continue;
    }

    if (entry.kind === "cards") {
      const movingIds = new Set(entry.cards.map((c) => c.instanceId));
      const movingCards = fromNext.cards.filter((c) => movingIds.has(c.instanceId));
      if (movingCards.length !== entry.amount) throw new Error(`Card move mismatch for ${entry.code}.`);
      fromNext.cards = fromNext.cards.filter((c) => !movingIds.has(c.instanceId));
      toNext.cards = [...toNext.cards, ...movingCards];
    }
  }

  return { fromNext, toNext };
}

function summaryLines(label, offer) {
  if (!offer.length) return [`**${label}:** nothing`];
  return [`**${label}:** ${offer.map(fmtEntry).join(", ")}`];
}

function tradeEmbed(owner, target, ownerOffer, targetOffer, status = "pending") {
  const color =
    status === "done" ? 0x2ecc71 : status === "cancelled" ? 0xe74c3c : 0xf1c40f;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle("🤝 Trade Session")
    .setDescription(
      [
        `**${owner.username}** ↔ **${target.username}**`,
        "",
        ...summaryLines(`${owner.username} offers`, ownerOffer),
        ...summaryLines(`${target.username} offers`, targetOffer),
        "",
        status === "pending"
          ? "Both players must confirm."
          : status === "done"
          ? "Trade completed successfully."
          : "Trade cancelled.",
      ].join("\n")
    );
}

module.exports = {
  name: "trade",
  aliases: ["swap"],
  async execute(message) {
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply("Usage: `op trade @mention (your offer) (their offer)`");
    if (targetUser.bot) return message.reply("You cannot trade with a bot.");
    if (targetUser.id === message.author.id) return message.reply("You cannot trade with yourself.");

    let parsed;
    try {
      parsed = parseTradeContent(message.content);
    } catch (err) {
      return message.reply(err.message);
    }

    if (!parsed.ownerOffer.length && !parsed.targetOffer.length) {
      return message.reply("Trade cannot be empty.");
    }

    const owner = getPlayer(message.author.id, message.author.username);
    const target = getPlayer(targetUser.id, targetUser.username);

    try {
      resolveOffer(owner, parsed.ownerOffer);
      resolveOffer(target, parsed.targetOffer);
    } catch (err) {
      return message.reply(`Trade validation failed: ${err.message}`);
    }

    const state = {
      ownerConfirmed: false,
      targetConfirmed: false,
      done: false,
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("trade_owner_confirm").setLabel(`${message.author.username} Confirm`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("trade_target_confirm").setLabel(`${targetUser.username} Confirm`).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("trade_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger)
    );

    const sent = await message.reply({
      embeds: [tradeEmbed(owner, target, parsed.ownerOffer, parsed.targetOffer, "pending")],
      components: [row],
    });

    const collector = sent.createMessageComponentCollector({ time: SESSION_MS });

    collector.on("collect", async (i) => {
      if (![message.author.id, targetUser.id].includes(i.user.id)) {
        return i.reply({ content: "Only the two trade players can use these buttons.", ephemeral: true });
      }
      if (state.done) {
        return i.reply({ content: "This trade session is already closed.", ephemeral: true });
      }

      if (i.customId === "trade_cancel") {
        state.done = true;
        await i.update({
          embeds: [tradeEmbed(owner, target, parsed.ownerOffer, parsed.targetOffer, "cancelled")],
          components: [],
        });
        collector.stop("cancelled");
        return;
      }

      if (i.customId === "trade_owner_confirm") {
        if (i.user.id !== message.author.id) {
          return i.reply({ content: "Only the trade owner can press this button.", ephemeral: true });
        }
        state.ownerConfirmed = true;
      }

      if (i.customId === "trade_target_confirm") {
        if (i.user.id !== targetUser.id) {
          return i.reply({ content: "Only the mentioned player can press this button.", ephemeral: true });
        }
        state.targetConfirmed = true;
      }

      if (!state.ownerConfirmed || !state.targetConfirmed) {
        const pendingText = [
          state.ownerConfirmed ? `✅ ${message.author.username} confirmed` : `⌛ ${message.author.username} waiting`,
          state.targetConfirmed ? `✅ ${targetUser.username} confirmed` : `⌛ ${targetUser.username} waiting`,
        ].join("\n");

        return i.update({
          embeds: [
            tradeEmbed(owner, target, parsed.ownerOffer, parsed.targetOffer, "pending").setFooter({
              text: pendingText,
            }),
          ],
          components: [row],
        });
      }

      try {
        const freshOwner = getPlayer(message.author.id, message.author.username);
        const freshTarget = getPlayer(targetUser.id, targetUser.username);

        const ownerResolved = resolveOffer(freshOwner, parsed.ownerOffer);
        const targetResolved = resolveOffer(freshTarget, parsed.targetOffer);

        const stepA = applyResolvedTrade(freshOwner, freshTarget, ownerResolved);
        const stepB = applyResolvedTrade(stepA.toNext, stepA.fromNext, targetResolved);

        updatePlayer(message.author.id, stepB.toNext);
        updatePlayer(targetUser.id, stepB.fromNext);

        state.done = true;
        await i.update({
          embeds: [tradeEmbed(freshOwner, freshTarget, parsed.ownerOffer, parsed.targetOffer, "done")],
          components: [],
        });
        collector.stop("done");
      } catch (err) {
        state.done = true;
        await i.update({
          embeds: [
            tradeEmbed(owner, target, parsed.ownerOffer, parsed.targetOffer, "cancelled").setFooter({
              text: `Failed: ${err.message}`,
            }),
          ],
          components: [],
        });
        collector.stop("failed");
      }
    });

    collector.on("end", async (_, reason) => {
      if (state.done) return;
      try {
        await sent.edit({
          embeds: [
            tradeEmbed(owner, target, parsed.ownerOffer, parsed.targetOffer, "cancelled").setFooter({
              text: reason === "time" ? "Trade expired." : "Trade closed.",
            }),
          ],
          components: [],
        });
      } catch (_) {}
    });
  },
};