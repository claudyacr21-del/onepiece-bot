const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
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

function normalizeExactName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function stripFragmentSuffix(value) {
  return String(value || "")
    .replace(/\s+fragment$/i, "")
    .trim();
}

function isExactNameMatch(query, names = []) {
  const q = normalizeExactName(query);
  if (!q) return false;

  return names
    .filter(Boolean)
    .some((name) => normalizeExactName(name) === q);
}

function isExactFragmentNameMatch(query, fragment) {
  const q = normalizeExactName(query);
  if (!q) return false;

  const names = [
    fragment?.name,
    fragment?.displayName,
    stripFragmentSuffix(fragment?.name),
    stripFragmentSuffix(fragment?.displayName),
  ];

  return names
    .filter(Boolean)
    .some((name) => normalizeExactName(name) === q);
}

function parseSacAddArgs(args) {
  if (!Array.isArray(args) || !args.length) {
    return {
      ok: false,
      message: "Usage: `op sacadd <card/weapon/fragment name> <amount/all>`",
    };
  }

  const lastArg = String(args[args.length - 1] || "").toLowerCase();
  const hasModeArg = lastArg === "all" || /^\d+$/.test(lastArg);
  const query = hasModeArg ? args.slice(0, -1).join(" ").trim() : args.join(" ").trim();
  const mode = hasModeArg ? lastArg : "all";

  if (!query) {
    return {
      ok: false,
      message: "Usage: `op sacadd <card/weapon/fragment name> <amount/all>`",
    };
  }

  if (mode !== "all") {
    const amount = Math.floor(Number(mode));

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        message: "Invalid amount.\nUse a positive number or `all`.",
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

  const found = fragments.find((item) =>
    isExactFragmentNameMatch(query, item)
  );

  return found ? toFragmentTargetFromOwnedFragment(found) : null;
}

function findCardTemplate(query) {
  const cards = Array.isArray(rawCards) ? rawCards : [];

  const found = cards
    .filter((card) => String(card.code || "").toLowerCase() !== "imu")
    .find((card) =>
      isExactNameMatch(query, [
        card.name,
        card.displayName,
      ])
    );

  return found ? toFragmentTargetFromCard(found) : null;
}

function findWeaponTemplate(query) {
  const weapons = Array.isArray(rawWeapons) ? rawWeapons : [];

  const found = weapons.find((weapon) =>
    isExactNameMatch(query, [
      weapon.name,
      weapon.displayName,
    ])
  );

  return found ? toFragmentTargetFromWeapon(found) : null;
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

    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const previewTarget = findSacTarget(previewPlayer, parsed.query);

    if (!previewTarget) {
      return message.reply({
        content: `Auto-sac target was not found: \`${parsed.query}\`.\nUse a valid battle card, boost card, weapon, or owned fragment name.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    let target = previewTarget;
    let cards = [];
    let safeCards = [];
    let actionText = "";
    let color = COLOR_ADD;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshTarget = findSacTarget(fresh, parsed.query);

          if (!freshTarget) {
            throw new Error(
              `Auto-sac target was not found: \`${parsed.query}\`.\nUse a valid battle card, boost card, weapon, or owned fragment name.`
            );
          }

          target = freshTarget;

          const settings = getAutoSacSettings(fresh);
          cards = Array.isArray(settings.cards) ? [...settings.cards] : [];
          safeCards = Array.isArray(settings.safeCards) ? [...settings.safeCards] : [];

          const existingSafeIndex = safeCards.findIndex((entry) =>
            isSameAutoSacCard(entry, target)
          );

          if (existingSafeIndex !== -1) {
            safeCards.splice(existingSafeIndex, 1);
          }

          const existingIndex = cards.findIndex((entry) =>
            isSameAutoSacCard(entry, target)
          );

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

            color = COLOR_ADD;
          }

          return {
            ...fresh,
            autoSac: {
              ...settings,
              cards,
              safeCards,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to update auto-sac list.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

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