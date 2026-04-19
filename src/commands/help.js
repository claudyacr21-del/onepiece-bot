const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  aliases: ["commands", "cmd"],

  async execute(message) {
    const embeds = [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("☠️ How To OPB")
        .setDescription(
          [
            "Start by building your team, pulling cards, strengthening them, then progressing through islands and battles.",
            "",
            "Battle cards use **M1 / M2 / M3** progression.",
            "Boost cards also use **M1 / M2 / M3** and their passive effects get stronger every stage.",
            "",
            "Base rarity caps:",
            "`C` → `A`",
            "`B` → `S`",
            "`A` → `SS`",
            "`S` → `UR`",
            "",
            "Some swordsmen can equip multiple weapons:",
            "• Zoro = 3 swords",
            "• Oden = 2 swords",
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
            "`op ci <card>` = global card info viewer",
            "`op mci <card>` = your owned current card info",
            "`op awaken <card>` = awaken your owned card",
            "",
            "## Pull System",
            "`op pull` = single synced pull",
            "`op pa` = Mother Flame text-only pull all",
            "`op pullinfo` = check synced pull access info",
            "`op effect` = check synced current effects",
            "",
            "## Quests",
            "`op daily` = claim daily reward",
            "`op quest` = open your current daily quest board",
            "5 daily random quests",
            "quest categories do not repeat on the same day",
            "clear rewards are claimed from the daily quest board state",
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
        .setTitle("🤝 Raid / Party")
        .setDescription(
          [
            "## Raid",
            "`op raid <boss>` → create a raid room using a Raid Ticket",
            "Host uses 1 Raid Ticket immediately when the raid room is created",
            "Raid supports up to 10 users total including the host",
            "Each participant can join with only 1 battle card",
            "The same character code cannot be used twice in the same raid room",
            "",
            "## Party Team",
            "`op rtadd <@user|userId|username>` → add a user to your raid/party team",
            "`op rtremove <@user|userId|username>` → remove a user from your raid/party team",
            "`op rtdelete` → clear your entire raid/party team",
            "`op rt` → show your saved team or active room team info",
            "`op rm` → show who has not joined the active room yet",
            "",
            "## Party Boss Phase 2",
            "Some story bosses use mandatory party phase 2",
            "Party boss phase 2 does not consume Raid Tickets",
            "Party boss supports up to 4 users total including the host",
            "Each participant joins with their 3 current team battle cards",
            "The same character code cannot be used twice in the same party room",
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • Raid / Party" }),

      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📜 Main Commands")
        .setDescription(
          [
            "## Collection",
            "`op mc` → view your cards",
            "`op mc text` → text list of cards + boosts, 10 per page with Prev / Next",
            "`op mc boost` → view your boost cards only",
            "`op ci <card>` → global card viewer",
            "`op mci <card>` → owned current card viewer",
            "`op all` → all battle cards",
            "`op all boost` → all boost cards",
            "`op all weapon` → all weapons",
            "`op all fruit` → all devil fruits",
            "`op inventory` → check your items",
            "`op finv` → check your fragments",
            "`op profile` → check your profile",
            "",
            "## Equipment",
            "`op wp <card>` → view equipped weapon / weapon set info",
            "`op wupgrade <weapon name>` → upgrade a weapon with Enhancement Stone",
            "`op equipfruit <card> <fruit>` → equip a Devil Fruit to a valid card",
            "",
            "## Progression / Travel",
            "`op market` → open the market",
            "`op market buy <item>` → buy an item from the market",
            "`op ship` → view your ship",
            "`op ship upgrade` → upgrade your current ship",
            "`op sail` → sail to the next sea route if requirements are met",
            "`op travel` → view unlocked islands and route",
            "`op travel <island>` → move to an unlocked island",
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