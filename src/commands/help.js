const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  aliases: ["commands", "cmd"],

  async execute(message) {
    const embeds = [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🏴‍☠️ How To OPB")
        .setDescription(
          [
            "To start, build your team, pull cards, strengthen them, then progress through islands and battles.",
            "",
            "Battle cards use **M1 / M2 / M3** progression.",
            "Boost cards also use **M1 / M2 / M3** and their effects get stronger every stage.",
            "",
            "Some swordsmen can equip multiple weapons:",
            "• Zoro = 3 swords",
            "• Oden = 2 swords",
            "• Hatchan stays fixed with Six Swords only",
            "",
            "Weapons and Devil Fruits stay equipped permanently once used.",
            "Weapons can also be upgraded with **Enhancement Stone**.",
            "",
            "Arena is available for ranked random battles and direct test matches.",
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • 1/4" }),

      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🃏 Cards, Pulls, Quests")
        .setDescription(
          [
            "## Card Progression",
            "`op ci <card name>` = global card info",
            "`op mci <card name>` = your current owned card info",
            "`op awaken <card name>` = awaken your owned card",
            "",
            "Base rarity caps:",
            "`C` → `A`",
            "`B` → `S`",
            "`A` → `SS`",
            "`S` → `UR`",
            "",
            "## Pull System",
            "`op pull` = single synced pull",
            "`op pa` = Mother Flame text-only pull all",
            "`op pullinfo` = check synced pull access info",
            "`op effect` = check synced current effects",
            "",
            "## Quests",
            "5 daily random quests",
            "quest categories do not repeat on the same day",
            "clear rewards are claimed from the daily quest board state",
            "use `op quest` to open and refresh your current daily quest board",
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
            "`op arena` gives points",
            "win = +12",
            "lose = -5",
            "draw = +2",
            "`op challenge` is test only and gives no points",
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • 3/4" }),

      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🧭 Main Commands")
        .setDescription(
          [
            "## Collection",
            "`op mc` → view your cards",
            "`op mc text` → text list of cards + boosts",
            "`op mc boost` → view your boost cards",
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
            "`op wp <weapon name> <card name>`",
            "`op wupgrade <weapon name>`",
            "`op equipfruit <fruit name> <card name>`",
            "",
            "## Progression / Travel",
            "`op daily`",
            "`op quest`",
            "`op market`",
            "`op market buy <item>`",
            "`op ship`",
            "`op ship upgrade`",
            "`op sail`",
            "`op travel` → view unlocked islands and route",
            "`op travel <island name>` → move to an unlocked island",
            "",
            "## Trade",
            "`op trade @mention (your offer) (their offer)`",
            "Tickets are untradeable",
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • 4/4" }),
    ];

    return message.reply({ embeds });
  },
};