const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getAutoSacSettings, normalize } = require("../utils/autoSac");

const COLOR_ADD = 0x2ecc71;
const COLOR_REMOVE = 0xe74c3c;

function findOwnedFragment(player, query) {
  const q = normalize(query);
  const fragments = Array.isArray(player.fragments) ? player.fragments : [];

  return (
    fragments.find((item) => normalize(item.code) === q) ||
    fragments.find((item) => normalize(item.name) === q) ||
    fragments.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function parseSacAddArgs(args) {
  if (!Array.isArray(args) || !args.length) {
    return {
      ok: false,
      message: "Usage: `op sacadd <card name> <amount/all>`",
    };
  }

  const lastArg = String(args[args.length - 1] || "").toLowerCase();
  const hasModeArg = lastArg === "all" || Number.isFinite(Number(lastArg));

  const query = hasModeArg ? args.slice(0, -1).join(" ").trim() : args.join(" ").trim();
  const mode = hasModeArg ? lastArg : "all";

  if (!query) {
    return {
      ok: false,
      message: "Usage: `op sacadd <card name> <amount/all>`",
    };
  }

  if (mode !== "all") {
    const amount = Math.floor(Number(mode));

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        message: "Amount tidak valid. Pakai angka positif atau `all`.",
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

function isSameAutoSacCard(entry, fragment) {
  const entryCode = normalize(entry?.code);
  const entryName = normalize(entry?.name);
  const fragmentCode = normalize(fragment?.code);
  const fragmentName = normalize(fragment?.name);

  return (
    (entryCode && fragmentCode && entryCode === fragmentCode) ||
    (entryName && fragmentName && entryName === fragmentName)
  );
}

function formatCurrentCards(cards) {
  if (!Array.isArray(cards) || !cards.length) {
    return "Belum ada card khusus di autosac.";
  }

  return cards
    .map((card, index) => {
      const name = card.name || card.code || "Unknown Card";
      const rarity = String(card.rarity || "C").toUpperCase();
      const mode = card.mode || "all";

      return `${index + 1}. **${name}** • ${rarity} • ${mode}`;
    })
    .join("\n");
}

module.exports = {
  name: "sacadd",
  aliases: ["asacadd", "autosacadd"],

  async execute(message, args) {
    const parsed = parseSacAddArgs(args);

    if (!parsed.ok) {
      return message.reply(parsed.message);
    }

    const player = getPlayer(message.author.id, message.author.username);
    const fragment = findOwnedFragment(player, parsed.query);

    if (!fragment) {
      return message.reply(
        [
          "Fragment card tidak ditemukan di `op finv`.",
          "Card harus pernah kamu punya fragment-nya dulu sebelum bisa dimasukkan ke autosac list.",
        ].join("\n")
      );
    }

    const settings = getAutoSacSettings(player);
    const cards = Array.isArray(settings.cards) ? [...settings.cards] : [];

    const existingIndex = cards.findIndex((entry) => isSameAutoSacCard(entry, fragment));

    let actionText = "";
    let color = COLOR_ADD;

    if (existingIndex !== -1) {
      const removed = cards.splice(existingIndex, 1)[0];

      actionText = [
        `**${removed.name || fragment.name}** berhasil dihapus dari autosac list.`,
        "",
        "Card ini tidak akan otomatis di-sacrifice lagi kecuali rarity-nya aktif di tombol `op autosac`.",
      ].join("\n");

      color = COLOR_REMOVE;
    } else {
      cards.push({
        code: fragment.code || null,
        name: fragment.name || parsed.query,
        rarity: fragment.rarity || "C",
        mode: parsed.mode,
      });

      actionText = [
        `**${fragment.name || parsed.query}** berhasil ditambahkan ke autosac list.`,
        `Mode: **${parsed.mode}**`,
        "",
        "Ini hanya menambah card ke list autosac.",
        "Fragment yang sudah ada sekarang **tidak dikurangi** dan **tidak langsung jadi berry**.",
        "Autosac baru berjalan saat kamu dapat duplicate fragment dari `op pull` / `op pa`.",
      ].join("\n");
    }

    const updatedSettings = {
      ...settings,
      cards,
    };

    updatePlayer(message.author.id, {
      autoSac: updatedSettings,
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
          "Kalau mau langsung sacrifice fragment yang sudah ada, pakai:",
          "`op sac <card name> <amount/all>`",
          "`op msac (luffy_5, zoro_2, nami_6)`",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Auto Sacrifice",
      });

    return message.reply({ embeds: [embed] });
  },
};