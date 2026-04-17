const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  aliases: ["commands", "cmd"],
  async execute(message) {
    const embeds = [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📘 How To OPB")
        .setDescription(
          [
            "To start, you need to build your crew and grow your account step by step.",
            "",
            "You get daily quests every day, can pull cards from your pull slots, then power them up through M1 / M2 / M3 progression.",
            "",
            "Ships are important too. Your starter ship is **Small Boat Tier 1**, and later ship upgrades need materials.",
            "",
            "Weapons and Devil Fruits can be equipped to owned cards. Once equipped, they are **permanent** and cannot be removed.",
            "",
            "Use the commands below to understand your collection, progression, travel route, and battle flow.",
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • 1/3" }),

      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🃏 Cards, Pulls, Quests")
        .setDescription(
          [
            "## Card Types",
            "🔹 **Battle Cards** are used for combat and progression.",
            "🔹 **Boost Cards** give passive bonuses and are also part of your collection.",
            "",
            "## Card Progression",
            "🔹 Every card uses **M1 / M2 / M3**.",
            "🔹 `C` base caps at `A`",
            "🔹 `B` base caps at `S`",
            "🔹 `A` base caps at `SS`",
            "🔹 `S` base caps at `UR`",
            "🔹 `op ci <card name>` shows global card info",
            "🔹 `op mci <card name>` shows owned card info",
            "🔹 `op awaken <card name>` upgrades your owned card",
            "",
            "## Pull System",
            "🔹 `op pull` = single pull using your pull slot system",
            "🔹 `op pa` = Mother Flame Premium pull all",
            "🔹 `op pullinfo` = check pull slots and reset status",
            "",
            "## Quests",
            "🔹 You get **5 daily random quests**",
            "🔹 Quest categories do not repeat on the same day",
            "🔹 If all quests are finished, the clear reward goes in automatically",
            "🔹 `op quest` = check your daily quest board",
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • 2/3" }),

      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("⚔️ Main Commands")
        .setDescription(
          [
            "## Collection",
            "`op mc` → view your cards",
            "`op mc text` → text list of cards + boosts",
            "`op ci <card name>` → global card viewer",
            "`op mci <card name>` → owned card viewer",
            "`op all` → all battle cards",
            "`op all boost` → all boost cards",
            "`op all weapon` → all weapons",
            "`op all fruit` → all devil fruits",
            "`op inventory` → check your items",
            "`op profile` → check your profile",
            "",
            "## Equipment",
            "`op wp <card name> <weapon name>`",
            "`op equipfruit <card name> <fruit name>`",
            "",
            "## Progression",
            "`op daily`",
            "`op quest`",
            "`op pull`",
            "`op pa`",
            "`op fight`",
            "`op boss`",
            "",
            "## Team / Travel",
            "`op team`",
            "`op team set <slot1> <slot2> <slot3>`",
            "`op ship`",
            "`op ship upgrade`",
            "`op sail`",
            "`op travel`",
            "",
            "## Trade",
            "`op trade @mention (your offer)(their offer)`",
            "`op trade @peace (5000)(enma_1)`",
            "`op trade @peace (5000, mera_1, enma_5)(luffy_1, bigmom_6)`",
            "🔹 Tickets are untradeable",
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • 3/3" }),
    ];

    return message.reply({ embeds });
  },
};