const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "help",
  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("Command List")
      .setDescription("Here are the main commands available in **One Piece Bot**.")
      .addFields(
        {
          name: "🃏 Card & Pull",
          value: [
            "`op pull` — Pull once using your available pull charges.",
            "`op pa` / `op pullall` — Pull all available charges at once. *(Mother Flame only)*",
            "`op pullinfo` / `op pulli` — Show your available pull charges.",
            "`op effect` — Show your current pull/effect status.",
            "`op mc` — Show your owned battle cards.",
            "`op mc boost` — Show your owned boost cards.",
            "`op mci <card name>` — Show one owned card in detail.",
            "`op all` — Show all battle cards available in the game.",
            "`op all boost` — Show all boost cards available in the game.",
            "`op finv` — Show all fragments you own.",
            "`op quest` — Show your quest progress."
          ].join("\n"),
          inline: false
        },
        {
          name: "🎁 Premium & Vote",
          value: [
            "`op vote` — Check vote info and rewards.",
            "`op treasure` — Claim Mother Flame treasure."
          ].join("\n"),
          inline: false
        },
        {
          name: "⏳ Utility",
          value: [
            "`op cd` — Check all current cooldowns."
          ].join("\n"),
          inline: false
        },
        {
          name: "💰 Economy",
          value: [
            "`op bal` / `op balance` — Show your berries and gems.",
            "`op daily` — Claim your daily reward."
          ].join("\n"),
          inline: false
        },
        {
          name: "🎒 Inventory",
          value: [
            "`op inv` / `op inventory` — Show your boxes, items, materials, weapons, devil fruits, and tickets."
          ].join("\n"),
          inline: false
        },
        {
          name: "👤 Profile",
          value: [
            "`op profile` — Show your captain profile and general stats.",
            "`op ci <card name>` — Show global card info. *(Coming next)*"
          ].join("\n"),
          inline: false
        }
      )
      .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true }))
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

    return message.reply({
      embeds: [embed],
      components: [row]
    });
  }
};