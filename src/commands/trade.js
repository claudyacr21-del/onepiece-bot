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

const STORE_LABELS = {
  weapons: "Weapon",
  devilFruits: "Devil Fruit",
  materials: "Material",
  items: "Item",
  boxes: "Box",
  fragments: "Fragment",
  cards: "Card",
};

const slug = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalize = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/['".]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function getDisplayName(entry, fallbackCode = "") {
  return (
    entry?.displayName ||
    entry?.name ||
    entry?.title ||
    String(fallbackCode || entry?.code || "Unknown")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
  );
}

function fmtEntry(e) {
  if (e.type === "berries") {
    return `${e.amount.toLocaleString("en-US")} berries`;
  }

  return `${e.raw || e.code}_${e.amount}`;
}

function fmtResolvedEntry(entry) {
  if (entry.kind === "berries") {
    return `${entry.amount.toLocaleString("en-US")} berries`;
  }

  if (entry.kind === "cards") {
    return `${entry.displayName || entry.code} x${entry.amount}`;
  }

  return `${entry.displayName || entry.code} x${entry.amount}`;
}

function parseOfferBlock(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  const parts = text
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  if (!parts.length) return [];
  if (parts.length > MAX_ITEMS) {
    throw new Error(`Max ${MAX_ITEMS} different entries per side.`);
  }

  return parts.map((part) => {
    if (/^\d+$/.test(part)) {
      return {
        type: "berries",
        code: "berries",
        raw: "berries",
        amount: num(part),
      };
    }

    const m = part.match(/^(.+?)_(\d+)$/);

    if (!m) {
      throw new Error(`Invalid trade entry: ${part}`);
    }

    return {
      type: "asset",
      code: slug(m[1]),
      raw: m[1].trim(),
      amount: num(m[2]),
    };
  });
}

function parseTradeContent(content) {
  const m = String(content).match(/<@!?\d+>\s*\(([^)]*)\)\s*\(([^)]*)\)/);

  if (!m) {
    throw new Error("Format: `op trade @mention (your offer) (their offer)`");
  }

  return {
    ownerOffer: parseOfferBlock(m[1]),
    targetOffer: parseOfferBlock(m[2]),
  };
}

function getTeamIds(player) {
  return new Set(
    Array.isArray(player?.team?.slots) ? player.team.slots.filter(Boolean) : []
  );
}

function isCardTradable(card, teamIds) {
  if (!card) return false;
  if (teamIds.has(card.instanceId)) return false;
  if (card.slot_locked) return false;
  if (card.equippedWeapon || card.equippedDevilFruit) return false;
  return true;
}

function scoreQuery(query, fields) {
  const q = normalize(query);
  const qs = slug(query);

  if (!q && !qs) return 0;

  let best = 0;
  const qWords = q.split(" ").filter(Boolean);

  for (const rawField of fields.filter(Boolean)) {
    const field = normalize(rawField);
    const fieldSlug = slug(rawField);

    if (!field && !fieldSlug) continue;

    if (field === q || fieldSlug === qs) {
      best = Math.max(best, 1000 + field.length);
      continue;
    }

    if (field.startsWith(q) || fieldSlug.startsWith(qs)) {
      best = Math.max(best, 800 + q.length);
      continue;
    }

    if (field.includes(q) || fieldSlug.includes(qs)) {
      best = Math.max(best, 600 + q.length);
      continue;
    }

    if (qWords.length && qWords.every((word) => field.includes(word))) {
      best = Math.max(best, 400 + qWords.join("").length);
    }
  }

  return best;
}

function getEntryFields(entry) {
  return [
    entry?.code,
    entry?.name,
    entry?.displayName,
    entry?.title,
    entry?.type,
    entry?.rarity,
  ];
}

function findStackMatches(list, query) {
  return (Array.isArray(list) ? list : [])
    .map((entry, index) => ({
      index,
      entry,
      score: scoreQuery(query, getEntryFields(entry)),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(getDisplayName(a.entry)).localeCompare(
        String(getDisplayName(b.entry))
      );
    });
}

function findBestStackEntry(list, query) {
  const matches = findStackMatches(list, query);
  return matches[0] || null;
}

function findStackIndex(list, codeOrQuery) {
  const hit = findBestStackEntry(list, codeOrQuery);
  return hit ? hit.index : -1;
}

function findStackEntry(list, codeOrQuery) {
  const hit = findBestStackEntry(list, codeOrQuery);
  if (!hit) return null;

  return {
    index: hit.index,
    entry: hit.entry,
    score: hit.score,
  };
}

function getTradableCardMatches(player, query) {
  const teamIds = getTeamIds(player);
  const q = String(query || "");

  return (Array.isArray(player.cards) ? player.cards : [])
    .filter((card) => isCardTradable(card, teamIds))
    .map((card) => ({
      card,
      score: scoreQuery(q, [
        card?.code,
        card?.characterCode,
        card?.displayName,
        card?.name,
        card?.variant,
        card?.title,
      ]),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(getDisplayName(a.card)).localeCompare(
        String(getDisplayName(b.card))
      );
    })
    .map((hit) => hit.card);
}

function ensureNotTicket(player, query) {
  const hit = findStackEntry(player.tickets, query);

  if (hit) {
    throw new Error(`Ticket item \`${getDisplayName(hit.entry, query)}\` is untradeable.`);
  }
}

function resolveEntry(player, entry) {
  if (entry.type === "berries") {
    if (num(player.berries) < entry.amount) {
      throw new Error(`${player.username} does not have enough berries.`);
    }

    return {
      kind: "berries",
      amount: entry.amount,
      code: "berries",
      displayName: "Berries",
    };
  }

  ensureNotTicket(player, entry.raw || entry.code);

  const stores = ["weapons", "devilFruits", "materials", "items", "boxes", "fragments"];

  for (const store of stores) {
    const hit = findStackEntry(player[store], entry.raw || entry.code);

    if (!hit) continue;

    const have = num(hit.entry?.amount, 1);

    if (have < entry.amount) {
      throw new Error(
        `${player.username} lacks ${getDisplayName(hit.entry, entry.code)} x${entry.amount}.`
      );
    }

    return {
      kind: "stack",
      store,
      amount: entry.amount,
      code: hit.entry?.code || entry.code,
      displayName: getDisplayName(hit.entry, entry.code),
      sourceEntry: hit.entry,
      storeLabel: STORE_LABELS[store] || store,
    };
  }

  const cardMatches = getTradableCardMatches(player, entry.raw || entry.code);

  if (cardMatches.length >= entry.amount) {
    const firstCard = cardMatches[0];

    return {
      kind: "cards",
      store: "cards",
      amount: entry.amount,
      code: firstCard?.code || entry.code,
      displayName: getDisplayName(firstCard, entry.code),
      cards: cardMatches.slice(0, entry.amount),
    };
  }

  throw new Error(
    `${player.username} does not own tradable ${entry.raw || entry.code}_${entry.amount}.`
  );
}

function resolveOffer(player, offer) {
  return offer.map((entry) => resolveEntry(player, entry));
}

function removeStack(list, codeOrQuery, amount) {
  const arr = Array.isArray(list) ? [...list] : [];
  const hit = findStackEntry(arr, codeOrQuery);

  if (!hit) {
    throw new Error(`Missing stack item ${codeOrQuery}.`);
  }

  const have = num(hit.entry?.amount, 1);
  const left = have - amount;

  if (left < 0) throw new Error(`Not enough ${getDisplayName(hit.entry, codeOrQuery)}.`);

  if (left === 0) {
    arr.splice(hit.index, 1);
  } else {
    arr[hit.index] = {
      ...arr[hit.index],
      amount: left,
    };
  }

  return arr;
}

function addStack(list, incoming, amount) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = incoming?.code || slug(incoming?.name);
  const hit = findStackEntry(arr, code);

  if (!hit) {
    arr.push({
      ...incoming,
      code,
      name: incoming?.name || getDisplayName(incoming, code),
      amount,
    });
  } else {
    arr[hit.index] = {
      ...arr[hit.index],
      amount: num(arr[hit.index]?.amount, 1) + amount,
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

      if (!sourceHit) {
        throw new Error(`Missing ${entry.displayName || entry.code} during trade apply.`);
      }

      fromNext[entry.store] = removeStack(
        fromNext[entry.store],
        entry.code,
        entry.amount
      );

      toNext[entry.store] = addStack(toNext[entry.store], sourceHit.entry, entry.amount);
      continue;
    }

    if (entry.kind === "cards") {
      const movingIds = new Set(entry.cards.map((card) => card.instanceId));
      const movingCards = fromNext.cards.filter((card) => movingIds.has(card.instanceId));

      if (movingCards.length !== entry.amount) {
        throw new Error(`Card move mismatch for ${entry.displayName || entry.code}.`);
      }

      fromNext.cards = fromNext.cards.filter((card) => !movingIds.has(card.instanceId));
      toNext.cards = [...toNext.cards, ...movingCards];
    }
  }

  return {
    fromNext,
    toNext,
  };
}

function summaryLines(label, offer, resolved = null) {
  if (!offer.length) return [`**${label}:** nothing`];

  if (Array.isArray(resolved) && resolved.length) {
    return [`**${label}:** ${resolved.map(fmtResolvedEntry).join(", ")}`];
  }

  return [`**${label}:** ${offer.map(fmtEntry).join(", ")}`];
}

function tradeEmbed(owner, target, ownerOffer, targetOffer, status = "pending", resolved = null) {
  const color =
    status === "done" ? 0x2ecc71 : status === "cancelled" ? 0xe74c3c : 0xf1c40f;

  const ownerResolved = resolved?.ownerResolved || null;
  const targetResolved = resolved?.targetResolved || null;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle("🤝 Trade Session")
    .setDescription(
      [
        `**${owner.username}** ↔ **${target.username}**`,
        "",
        ...summaryLines(`${owner.username} offers`, ownerOffer, ownerResolved),
        ...summaryLines(`${target.username} offers`, targetOffer, targetResolved),
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

    if (!targetUser) {
      return message.reply("Usage: `op trade @mention (your offer) (their offer)`");
    }

    if (targetUser.bot) return message.reply("You cannot trade with a bot.");
    if (targetUser.id === message.author.id) {
      return message.reply("You cannot trade with yourself.");
    }

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

    let initialResolved;

    try {
      initialResolved = {
        ownerResolved: resolveOffer(owner, parsed.ownerOffer),
        targetResolved: resolveOffer(target, parsed.targetOffer),
      };
    } catch (err) {
      return message.reply(`Trade validation failed: ${err.message}`);
    }

    const state = {
      ownerConfirmed: false,
      targetConfirmed: false,
      done: false,
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("trade_owner_confirm")
        .setLabel(`${message.author.username} Confirm`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("trade_target_confirm")
        .setLabel(`${targetUser.username} Confirm`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("trade_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    );

    const sent = await message.reply({
      embeds: [
        tradeEmbed(
          owner,
          target,
          parsed.ownerOffer,
          parsed.targetOffer,
          "pending",
          initialResolved
        ),
      ],
      components: [row],
    });

    const collector = sent.createMessageComponentCollector({
      time: SESSION_MS,
    });

    collector.on("collect", async (i) => {
      if (![message.author.id, targetUser.id].includes(i.user.id)) {
        return i.reply({
          content: "Only the two trade players can use these buttons.",
          ephemeral: true,
        });
      }

      if (state.done) {
        return i.reply({
          content: "This trade session is already closed.",
          ephemeral: true,
        });
      }

      if (i.customId === "trade_cancel") {
        state.done = true;

        await i.update({
          embeds: [
            tradeEmbed(
              owner,
              target,
              parsed.ownerOffer,
              parsed.targetOffer,
              "cancelled",
              initialResolved
            ),
          ],
          components: [],
        });

        collector.stop("cancelled");
        return;
      }

      if (i.customId === "trade_owner_confirm") {
        if (i.user.id !== message.author.id) {
          return i.reply({
            content: "Only the trade owner can press this button.",
            ephemeral: true,
          });
        }

        state.ownerConfirmed = true;
      }

      if (i.customId === "trade_target_confirm") {
        if (i.user.id !== targetUser.id) {
          return i.reply({
            content: "Only the mentioned player can press this button.",
            ephemeral: true,
          });
        }

        state.targetConfirmed = true;
      }

      if (!state.ownerConfirmed || !state.targetConfirmed) {
        const pendingText = [
          state.ownerConfirmed
            ? `✅ ${message.author.username} confirmed`
            : `⌛ ${message.author.username} waiting`,
          state.targetConfirmed
            ? `✅ ${targetUser.username} confirmed`
            : `⌛ ${targetUser.username} waiting`,
        ].join("\n");

        return i.update({
          embeds: [
            tradeEmbed(
              owner,
              target,
              parsed.ownerOffer,
              parsed.targetOffer,
              "pending",
              initialResolved
            ).setFooter({
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
          embeds: [
            tradeEmbed(
              freshOwner,
              freshTarget,
              parsed.ownerOffer,
              parsed.targetOffer,
              "done",
              {
                ownerResolved,
                targetResolved,
              }
            ),
          ],
          components: [],
        });

        collector.stop("done");
      } catch (err) {
        state.done = true;

        await i.update({
          embeds: [
            tradeEmbed(
              owner,
              target,
              parsed.ownerOffer,
              parsed.targetOffer,
              "cancelled",
              initialResolved
            ).setFooter({
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
            tradeEmbed(
              owner,
              target,
              parsed.ownerOffer,
              parsed.targetOffer,
              "cancelled",
              initialResolved
            ).setFooter({
              text: reason === "time" ? "Trade expired." : "Trade closed.",
            }),
          ],
          components: [],
        });
      } catch (_) {}
    });
  },
};