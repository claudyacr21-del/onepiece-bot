const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { isMergeCard, getMergeFixedPower } = require("../utils/mergeCards");

const MAX_PRESET_SLOTS = 3;
const TEAM_SIZE = 3;

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSlot(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_PRESET_SLOTS) return null;
  return String(n);
}

function getPresetStore(player) {
  const raw = player?.teamPresets;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  return {
    ...raw,
  };
}

function getTeamSlots(player) {
  const slots = Array.isArray(player?.team?.slots)
    ? player.team.slots.slice(0, TEAM_SIZE)
    : [];

  while (slots.length < TEAM_SIZE) {
    slots.push(null);
  }

  return slots.map((id) => (id ? String(id) : null));
}

function getOwnedBattleCards(player) {
  return ensureArray(player?.cards)
    .map((card) => hydrateCard(card) || card)
    .filter(
      (card) =>
        card &&
        String(card.cardRole || "").toLowerCase() !== "boost" &&
        String(card.instanceId || "").trim()
    );
}

function getCardPower(card) {
  if (isMergeCard(card)) return getMergeFixedPower(card);

  return Number(
    card.teamPower ||
      card.currentPower ||
      card.finalPower ||
      card.power ||
      Math.floor(
        Number(card.atk || card.finalAtk || card.displayAtk || 0) * 1.4 +
          Number(card.hp || card.finalHp || card.displayHp || 0) * 0.22 +
          Number(card.speed || card.spd || card.finalSpeed || card.displaySpeed || 0) * 9
      )
  );
}

function getCardName(card) {
  return card?.displayName || card?.name || card?.code || "Unknown";
}

function getCardMastery(card) {
  return card?.evolutionKey || `M${Number(card?.evolutionStage || 1)}`;
}

function findCardByInstanceId(cards, instanceId) {
  return (
    cards.find(
      (card) =>
        String(card.instanceId || "") === String(instanceId || "") &&
        String(card.cardRole || "").toLowerCase() !== "boost"
    ) || null
  );
}

function getPresetCards(player, presetSlots) {
  const cards = getOwnedBattleCards(player);

  return presetSlots.map((instanceId) => {
    if (!instanceId) return null;
    return findCardByInstanceId(cards, instanceId);
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatPresetLine(player, slotKey) {
  const presets = getPresetStore(player);
  const presetSlots = Array.isArray(presets[slotKey])
    ? presets[slotKey].slice(0, TEAM_SIZE)
    : [];

  if (!presetSlots.length) {
    return `**Preset ${slotKey}:** Empty`;
  }

  const presetCards = getPresetCards(player, presetSlots);

  const lines = presetCards.map((card, index) => {
    if (!card) {
      return `\`${index + 1}.\` Missing Card`;
    }

    return `\`${index + 1}.\` ${getCardName(card)} • ${card.currentTier || card.rarity || "C"} • ${getCardMastery(card)}`;
  });

  return [`**Preset ${slotKey}:**`, ...lines].join("\n");
}

function buildPresetEmbed(player) {
  const currentTeamSlots = getTeamSlots(player);
  const cards = getOwnedBattleCards(player);

  const currentTeamCards = currentTeamSlots.map((instanceId) =>
    findCardByInstanceId(cards, instanceId)
  );

  const currentTeamLines = currentTeamCards.map((card, index) => {
    if (!card) return `\`${index + 1}.\` Empty Slot`;

    return [
      `\`${index + 1}.\` **${getCardName(card)}**`,
      `↪ ${card.currentTier || card.rarity || "C"} • ${getCardMastery(card)} • Power ${formatNumber(getCardPower(card))}`,
    ].join("\n");
  });

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Team Presets")
    .setDescription(
      [
        "Save up to **3 team presets** and switch your battle team faster.",
        "",
        "## Current Team",
        ...currentTeamLines,
        "",
        "## Saved Presets",
        formatPresetLine(player, "1"),
        "",
        formatPresetLine(player, "2"),
        "",
        formatPresetLine(player, "3"),
        "",
        "## Commands",
        "`op tp save 1` • save current team to preset 1",
        "`op tp 1` • equip preset 1",
        "`op tp remove 1` • delete preset 1",
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Team Preset",
    });
}

function validatePresetCanEquip(player, presetSlots) {
  const cards = getOwnedBattleCards(player);
  const missing = [];
  const validSlots = [];

  for (let i = 0; i < TEAM_SIZE; i += 1) {
    const instanceId = presetSlots[i] ? String(presetSlots[i]) : null;

    if (!instanceId) {
      validSlots.push(null);
      continue;
    }

    const card = findCardByInstanceId(cards, instanceId);

    if (!card) {
      missing.push(`Slot ${i + 1}`);
      validSlots.push(null);
      continue;
    }

    validSlots.push(instanceId);
  }

  const filled = validSlots.filter(Boolean);

  if (!filled.length) {
    return {
      ok: false,
      reason: "This preset has no usable cards.",
    };
  }

  if (new Set(filled).size !== filled.length) {
    return {
      ok: false,
      reason: "This preset has duplicate card instances.",
    };
  }

  if (missing.length) {
    return {
      ok: false,
      reason: `Some cards from this preset are missing: ${missing.join(", ")}.`,
    };
  }

  return {
    ok: true,
    slots: validSlots,
  };
}

function savePreset(userId, username, slotKey) {
  let result = null;

  updatePlayerAtomic(
    userId,
    (fresh) => {
      const player = fresh || {};
      const currentSlots = getTeamSlots(player);
      const filled = currentSlots.filter(Boolean);

      if (!filled.length) {
        result = {
          ok: false,
          reason: "Your current team is empty. Add cards first before saving a preset.",
        };

        return player;
      }

      const presets = getPresetStore(player);
      presets[slotKey] = currentSlots;

      result = {
        ok: true,
        slots: currentSlots,
      };

      return {
        ...player,
        teamPresets: presets,
      };
    },
    username
  );

  return result;
}

function equipPreset(userId, username, slotKey) {
  let result = null;

  updatePlayerAtomic(
    userId,
    (fresh) => {
      const player = fresh || {};
      const presets = getPresetStore(player);
      const presetSlots = Array.isArray(presets[slotKey])
        ? presets[slotKey].slice(0, TEAM_SIZE)
        : null;

      if (!presetSlots) {
        result = {
          ok: false,
          reason: `Preset ${slotKey} is empty. Use \`op tp save ${slotKey}\` first.`,
        };

        return player;
      }

      const validation = validatePresetCanEquip(player, presetSlots);

      if (!validation.ok) {
        result = validation;
        return player;
      }

      result = {
        ok: true,
        slots: validation.slots,
      };

      return {
        ...player,
        team: {
          ...(player.team || {}),
          slots: validation.slots,
        },
      };
    },
    username
  );

  return result;
}

function removePreset(userId, username, slotKey) {
  let result = null;

  updatePlayerAtomic(
    userId,
    (fresh) => {
      const player = fresh || {};
      const presets = getPresetStore(player);

      if (!presets[slotKey]) {
        result = {
          ok: false,
          reason: `Preset ${slotKey} is already empty.`,
        };

        return player;
      }

      delete presets[slotKey];

      result = {
        ok: true,
      };

      return {
        ...player,
        teamPresets: presets,
      };
    },
    username
  );

  return result;
}

module.exports = {
  name: "preset",
  aliases: ["tp"],

  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const action = String(args[0] || "").toLowerCase();
    const second = String(args[1] || "").toLowerCase();

    if (!action || ["list", "show", "view"].includes(action)) {
      return message.reply({
        embeds: [buildPresetEmbed(player)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (["save", "add", "set"].includes(action)) {
      const slotKey = normalizeSlot(second);

      if (!slotKey) {
        return message.reply("Usage: `op tp save <1-3>`");
      }

      const result = savePreset(message.author.id, message.author.username, slotKey);

      if (!result?.ok) {
        return message.reply(result?.reason || "Failed to save team preset.");
      }

      const latestPlayer = getPlayer(message.author.id, message.author.username);

      return message.reply({
        content: `✅ Saved your current team to **Preset ${slotKey}**.`,
        embeds: [buildPresetEmbed(latestPlayer)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (["remove", "delete", "clear", "del"].includes(action)) {
      const slotKey = normalizeSlot(second);

      if (!slotKey) {
        return message.reply("Usage: `op tp remove <1-3>`");
      }

      const result = removePreset(message.author.id, message.author.username, slotKey);

      if (!result?.ok) {
        return message.reply(result?.reason || "Failed to remove team preset.");
      }

      const latestPlayer = getPlayer(message.author.id, message.author.username);

      return message.reply({
        content: `✅ Removed **Preset ${slotKey}**.`,
        embeds: [buildPresetEmbed(latestPlayer)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const slotKey = normalizeSlot(action);

    if (slotKey) {
      const result = equipPreset(message.author.id, message.author.username, slotKey);

      if (!result?.ok) {
        return message.reply(result?.reason || "Failed to equip team preset.");
      }

      const latestPlayer = getPlayer(message.author.id, message.author.username);

      return message.reply({
        content: `✅ Equipped **Preset ${slotKey}** as your battle team.`,
        embeds: [buildPresetEmbed(latestPlayer)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    return message.reply(
      [
        "Usage:",
        "`op tp`",
        "`op tp save <1-3>`",
        "`op tp <1-3>`",
        "`op tp remove <1-3>`",
      ].join("\n")
    );
  },
};