const { EmbedBuilder } = require("discord.js");

const COLOR = 0xf1c40f;

function getAvatar(message) {
  return (
    message.member?.displayAvatarURL?.({
      extension: "png",
      size: 512,
    }) ||
    message.author.displayAvatarURL({
      extension: "png",
      size: 512,
    })
  );
}

module.exports = {
  name: "starter",
  aliases: ["start", "guide", "starterguide"],

  async execute(message) {
    const avatar = getAvatar(message);

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("🏴‍☠️ OPB Starter Guide")
      .setDescription(
        [
          "Welcome to **One Piece Bot**!",
          "This guide is for new players who want to start playing even before joining the main server.",
          "",
          "**1. Start with pulls**",
          "`op pull` — get your first card, weapon, fruit, ticket, or item.",
          "`op all` — view global cards/items.",
          "`op ci <card name>` — check global card info.",
          "`op mci <card name>` — check your owned card/item info.",
          "",
          "**2. Build your collection**",
          "`op mc` — view your cards.",
          "`op inventory` — view items, tickets, weapons, fruits, and materials.",
          "`op finv` — view your fragments.",
          "",
          "**3. Upgrade your power**",
          "`op level <card>` — level up your card.",
          "`op awaken <card>` — evolve card from M1 → M2 → M3.",
          "`op wp <card> <weapon>` — equip weapon.",
          "`op df <card> <fruit>` — equip Devil Fruit.",
          "",
          "**4. Fight and farm**",
          "`op fight` — fight enemies.",
          "`op boss` — fight island boss.",
          "`op daily` — claim daily reward.",
          "`op quest` — check daily quests.",
          "",
          "**5. Team and raid**",
          "`op team` — view your battle team.",
          "`op add <card> <slot>` — add card to team.",
          "`op raid` / `op craid` / `op graid` — join or create raids when you have tickets.",
          "",
          "**Quick recommended start:**",
          "`op pull` → `op mc` → `op mci <card>` → `op team` → `op fight` → `op daily`",
          "",
          "Use `op help` anytime for the full command menu.",
        ].join("\n")
      )
      .setThumbnail(avatar)
      .setFooter({
        text: `${message.author.username} • One Piece Bot Starter`,
        iconURL: avatar,
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};