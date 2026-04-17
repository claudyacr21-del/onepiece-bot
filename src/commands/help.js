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
            "To start, build your team, pull cards, strengthen them, then progress through islands and battles.",
            "",
            "Battle cards use **M1 / M2 / M3** progression.",
            "Boost cards also use **M1 / M2 / M3** and their effects get stronger every stage.",
            "",
            "Some swordsmen can equip multiple weapons:",
            "🔹 Zoro = 3 swords",
            "🔹 Oden = 2 swords",
            "🔹 Hatchan stays fixed with Six Swords only",
            "",
            "Weapons and Devil Fruits stay equipped permanently once used.",
            "",
            "Arena is now available for ranked random battles and direct test matches.",
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • 1/4" }),

      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🃏 Cards, Pulls, Quests")
        .setDescription(
          [
            "## Card Progression",
            "🔹 `C` base caps at `A`",
            "🔹 `B` base caps at `S`",
            "🔹 `A` base caps at `SS`",
            "🔹 `S` base caps at `UR`",
            "🔹 `op ci <card name>` = global card info",
            "🔹 `op mci <card name>` = your current owned card info",
            "🔹 `op awaken <card name>` = awaken your owned card",
            "",
            "## Pull System",
            "🔹 `op pull` = single synced pull",
            "🔹 `op pa` = Mother Flame text-only pull all",
            "🔹 `op pullinfo` = check synced pull slots",
            "🔹 `op effect` = check synced current effects",
            "",
            "## Quests",
            "🔹 5 daily random quests",
            "🔹 categories do not repeat on the same day",
            "🔹 clear rewards auto enter when completed",
            "🔹 `op quest` = open daily quest board",
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • 2/4" }),

      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("⚔️ Battle / Arena")
        .setDescription(
          [
            "## PvE",
            "`op fight` → manual fight against random enemies",
            "`op boss` → fight the current island boss",
            "`op team` → check your current team",
            "",
            "## PvP",
            "`op arena` → random ranked match against another user's team",
            "`op challenge @user` → direct test fight against a user's team",
            "`op lb arena` → arena leaderboard",
            "`op lb power` → team power leaderboard",
            "",
            "Arena notes:",
            "🔹 `op arena` gives points",
            "🔹 win = +12",
            "🔹 lose = -5",
            "🔹 draw = +2",
            "🔹 `op challenge` is test only and gives no points",
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • 3/4" }),

      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📦 Main Commands")
        .setDescription(
          [
            "## Collection",
            "`op mc` → view your cards",
            "`op mc text` → text list of cards + boosts",
            "`op ci <card name>` → global card viewer",
            "`op mci <card name>` → owned current card viewer",
            "`op all` → all battle cards",
            "`op all boost` → all boost cards",
            "`op all weapon` → all weapons",
            "`op all fruit` → all devil fruits",
            "`op inventory` → check your items",
            "`op finv` → check your fragments",
            "`op profile` → check your profile",
            "",
            "## Equipment",
            "`op wp <card name> <weapon name>`",
            "`op equipfruit <card name> <fruit name>`",
            "",
            "## Progression / Travel",
            "`op daily`",
            "`op quest`",
            "`op ship`",
            "`op ship upgrade`",
            "`op sail`",
            "`op travel`",
            "",
            "## Trade",
            "`op trade @mention (your offer)(their offer)`",
            "Tickets are untradeable",
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • 4/4" }),
    ];

    return message.reply({ embeds });
  },
};