const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  aliases: ["commands", "cmd"],
  async execute(message) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("📘 One Piece Bot Help")
          .setDescription(
            [
              "## Basic",
              "`op help`",
              "`op profile`",
              "`op inventory`",
              "`op mc`",
              "`op mci <card name>`",
              "`op ci <card name>`",
              "`op all`",
              "`op all boost`",
              "`op team`",
              "`op team set <slot1> <slot2> <slot3>`",
              "",
              "## Progression",
              "`op daily`",
              "`op pull`",
              "`op pa`",
              "`op pullinfo`",
              "`op fight`",
              "`op boss`",
              "`op ship`",
              "`op ship upgrade`",
              "`op sail`",
              "`op travel`",
              "",
              "## Equipment",
              "`op wp <card name> <weapon name>`",
              "`op equip fruit <card_id> <fruit_id>`",
              "`op unequip <card_id>`",
              "",
              "## Evolution",
              "`op ci <card name>` = global card viewer",
              "`op mci <card name>` = owned card viewer",
              "`op awaken <card name>` = awaken owned card",
              "All cards use M1 / M2 / M3.",
              "",
              "## Trade",
              "`op trade @peace (5000)(enma_1)`",
              "`op trade @peace (5000, mera_1, enma_5)(luffy_1, bigmom_6)`",
              "Tickets are untradeable.",
              "",
              "## Notes",
              "Card image fields are read from `src/data/cards.js`.",
              "Ship and island image sync comes next.",
            ].join("\n")
          )
          .setFooter({ text: "One Piece Bot • Synced Help" }),
      ],
    });
  },
};