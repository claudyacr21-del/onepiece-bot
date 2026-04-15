const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  name: "help",
  aliases: ["commands", "cmd", "menu"],
  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("📚 One Piece Bot Command List")
      .setDescription("Here are the current commands available in One Piece Bot.")
      .addFields(
        {
          name: "👤 Profile & Economy",
          value: [
            "`op profile` — View your One Piece profile",
            "`op balance` — Check your berries and gems"
          ].join("\n")
        },
        {
          name: "🎴 Collection",
          value: [
            "`op pull` — Pull 1 reward from the current banner",
            "`op pa` — Pull all available pulls at once (Mother Flame only)",
            "`op mc` — View your battle cards one by one",
            "`op mc text` — View all your cards in text mode",
            "`op mc boost` — View your boost cards one by one",
            "`op mci <card name>` — View one specific card you own",
            "`op ci <name>` — View card, devil fruit, or weapon info from the database",
            "`op all` — View all battle cards in the game",
            "`op all boost` — View all boost cards in the game",
            "`op finv [name]` — View your fragments or search a fragment"
          ].join("\n")
        },
        {
          name: "🎒 Inventory & Equipment",
          value: [
            "`op inv` — View your inventory",
            "`op open <box name>` — Open a box from your inventory",
            "`op resetpull` — Use a Pull Reset Ticket",
            "`op df <card name> <fruit name>` — Equip a Devil Fruit to a card"
          ].join("\n")
        },
        {
          name: "⚔️ Team & Battle",
          value: [
            "`op add <card name>` — Add a battle card to your team",
            "`op remove <card name>` — Remove a battle card from your team",
            "`op swap <from> <to>` — Swap team positions",
            "`op team` — View your active team",
            "`op fight` — Start a manual fight using your team"
          ].join("\n")
        },
        {
          name: "📈 Progress & Status",
          value: [
            "`op effect` — View your active effects and boosts",
            "`op pullinfo` — View how to increase your pull slots",
            "`op cd` — Check important cooldowns and timers",
            "`op daily` — Claim your daily reward",
            "`op quest` — View your current quest progress",
            "`op vote` — View vote information",
            "`op treasure` — Claim Mother Flame treasure reward"
          ].join("\n")
        },
        {
          name: "ℹ️ Notes",
          value: [
            "• `op pa` is only available for users with the **Mother Flame** role",
            "• Boost cards are passive cards and are not used for battle",
            "• `op ping` is a basic internal command and is not shown here"
          ].join("\n")
        }
      )
      .setFooter({ text: "One Piece Bot • Help Menu" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Support Server")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/KcaRbeBqGf"),
      new ButtonBuilder()
        .setLabel("Patreon")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.com")
    );

    await message.reply({
      embeds: [embed],
      components: [row]
    });
  }
};