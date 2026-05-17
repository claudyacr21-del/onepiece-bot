const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getAutoSacSettings, normalize } = require("../utils/autoSac");

const rawCards = require("../data/cards");
const rawWeapons = require("../data/weapons");

const COLOR_ADD = 0x2ecc71;
const COLOR_REMOVE = 0xe74c3c;

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of candidates.filter(Boolean)) {
    const value = normalize(raw);
    if (!value) continue;

    if (value === q) best = Math.max(best, 1000 + value.length);
    else if (value.startsWith(q)) best = Math.max(best, 700 + q.length);
    else if (value.includes(q)) best = Math.max(best, 400 + q.length);
    else {
      const words = q.split(" ").filter(Boolean);
      if (words.length && words.every((word) => value.includes(word))) {
        best = Math.max(best, 250 + words.join("").length);
      }
    }
  }

  return best;
}

function parseSacAddArgs(args) {
  if (!Array.isArray(args) || !args.length) {
    return {
      ok: false,
      message: "Usage: `op sacadd <card/weapon name> <amount/all>`",
    };
  }

  const lastArg = String(args[args.length - 1] || "").toLowerCase();
  const hasModeArg = lastArg === "all" || /^\d+$/.test(lastArg);
  const query = hasModeArg ? args.slice(0, -1).join(" ").trim() : args.join(" ").trim();
  const mode = hasModeArg ? lastArg : "all";

  if (!query) {
    return {
      ok: false,
      message: "Usage: `op sacadd <card/weapon name> <amount/all>`",
    };
  }

  if (mode !== "all") {
    const amount = Math.floor(Number(mode));

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        message: "Invalid amount. Use a positive number or `all`.",
      };
    }

    return {
      ok: true,
      query,
      mode: String(amount),
    };
  }

  return {
    ok: true,
    query,
    mode,
  };
}

function toFragmentTargetFromCard(card) {
  return {
    code: card.code || null,
    name: card.displayName || card.name || card.code || "Unknown Card",
    rarity: card.baseTier || card.rarity || "C",
    category: String(card.cardRole || "").toLowerCase() === "boost" ? "boost" : "battle",
  };
}

function toFragmentTargetFromWeapon(weapon) {
  return {
    code: `weapon_fragment_${weapon.code}`,
    name: `${weapon.name} Fragment`,
    rarity: weapon.rarity || "C",
    category: "weapon",
    weaponCode: weapon.code,
  };
}

function toFragmentTargetFromOwnedFragment(fragment) {
  return {
    code: fragment.code || null,
    name: fragment.name || fragment.displayName || fragment.code || "Unknown Fragment",
    rarity: fragment.rarity || "C",
    category: fragment.category || "battle",
    weaponCode: fragment.weaponCode || undefined,
    cardCode: fragment.cardCode || undefined,
    sourceCode: fragment.sourceCode || undefined,
  };
}

function findOwnedFragment(player, query) {
  const fragments = Array.isArray(player.fragments) ? player.fragments : [];

  const scored = fragments
    .map((item) => ({
      item,
      score: scoreQuery(query, [
        item.code,
        item.name,
        item.displayName,
        item.weaponCode,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? toFragmentTargetFromOwnedFragment(scored[0].item) : null;
}

function findCardTemplate(query) {
  const cards = Array.isArray(rawCards) ? rawCards : [];

  const scored = cards
    .filter((card) => String(card.code || "").toLowerCase() !== "imu")
    .map((card) => ({
      card,
      score: scoreQuery(query, [
        card.code,
        card.name,
        card.displayName,
        card.alias,
        ...(Array.isArray(card.aliases) ? card.aliases : []),
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? toFragmentTargetFromCard(scored[0].card) : null;
}

function findWeaponTemplate(query) {
  const weapons = Array.isArray(rawWeapons) ? rawWeapons : [];

  const scored = weapons
    .map((weapon) => ({
      weapon,
      score: scoreQuery(query, [
        weapon.code,
        weapon.name,
        weapon.type,
        ...(Array.isArray(weapon.aliases) ? weapon.aliases : []),
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? toFragmentTargetFromWeapon(scored[0].weapon) : null;
}

function findSacTarget(player, query) {
  return (
    findOwnedFragment(player, query) ||
    findCardTemplate(query) ||
    findWeaponTemplate(query) ||
    null
  );
}

function isSameAutoSacCard(entry, target) {
  const entryCode = normalizeCode(entry?.code || entry?.weaponCode || "");
  const entryName = normalize(entry?.name || entry?.displayName || "");
  const targetCode = normalizeCode(target?.code || target?.weaponCode || "");
  const targetName = normalize(target?.name || target?.displayName || "");

  return (
    (entryCode && targetCode && entryCode === targetCode) ||
    (entryName && targetName && entryName === targetName)
  );
}

function formatCurrentCards(cards) {
  if (!Array.isArray(cards) || !cards.length) {
    return "No specific cards are currently in the auto-sac list.";
  }

  return cards
    .map((card, index) => {
      const name = card.name || card.code || "Unknown Card";
      const rarity = String(card.rarity || "C").toUpperCase();
      const mode = card.mode || "all";
      const category = card.category ? ` • ${card.category}` : "";

      return `${index + 1}. **${name}** • ${rarity}${category} • ${mode}`;
    })
    .join("\n");
}

module.exports = {
  name: "sacadd",
  aliases: ["asacadd", "autosacadd"],

  async execute(message, args) {
    const parsed = parseSacAddArgs(args);

    if (!parsed.ok) {
      return message.reply({
        content: parsed.message,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const player = getPlayer(message.author.id, message.author.username);
    const target = findSacTarget(player, parsed.query);

    if (!target) {
      return message.reply({
        content: `Auto-sac target was not found: \`${parsed.query}\`.\nUse a valid battle card, boost card, or weapon name.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const settings = getAutoSacSettings(player);
    const cards = Array.isArray(settings.cards) ? [...settings.cards] : [];
    const safeCards = Array.isArray(settings.safeCards) ? [...settings.safeCards] : [];

    const existingSafeIndex = safeCards.findIndex((entry) =>
      isSameAutoSacCard(entry, target)
    );

    if (existingSafeIndex !== -1) {
      safeCards.splice(existingSafeIndex, 1);
    }

    const existingIndex = cards.findIndex((entry) => isSameAutoSacCard(entry, target));

    let actionText = "";
    let color = COLOR_ADD;

    if (existingIndex !== -1) {
      const removed = cards.splice(existingIndex, 1)[0];

      actionText = [
        `**${removed.name || target.name}** has been removed from the auto-sac list.`,
        "",
        "This target will no longer be auto-sacrificed unless its rarity toggle is enabled in `op autosac`.",
      ].join("\n");

      color = COLOR_REMOVE;
    } else {
      cards.push({
        code: target.code || null,
        name: target.name || parsed.query,
        rarity: target.rarity || "C",
        category: target.category || "battle",
        weaponCode: target.weaponCode || undefined,
        cardCode: target.cardCode || undefined,
        sourceCode: target.sourceCode || undefined,
        mode: parsed.mode,
      });

      actionText = [
        `**${target.name || parsed.query}** has been added to the auto-sac list.`,
        `Mode: **${parsed.mode}**`,
        "",
        "You do not need to own the fragment first.",
        "Existing fragments are not removed and are not converted into berries.",
        "Auto-sac will trigger when you receive duplicate fragments from `op pull` / `op pa`.",
      ].join("\n");
    }

    updatePlayer(message.author.id, {
      autoSac: {
        ...settings,
        cards,
        safeCards,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("Auto-Sacrifice List Updated")
      .setDescription(
        [
          actionText,
          "",
          "**Current Auto-Sac Cards**",
          formatCurrentCards(cards),
          "",
          "**Manual Sacrifice**",
          "Use these commands if you want to sacrifice existing fragments immediately:",
          "`op sac <card name> <amount/all>`",
          "`op msac (luffy_5, zoro_2, nami_6)`",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Auto Sacrifice",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};