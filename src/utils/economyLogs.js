const {
  EmbedBuilder,
} = require("discord.js");

function getLogChannelId(type) {
  const raw =
    type === "chest"
      ? process.env.CHEST_LOG_CHANNEL_ID ||
        process.env.CHEST_LOGS_CHANNEL_ID ||
        process.env.LOG_CHEST_CHANNEL_ID ||
        ""
      : process.env.SHOP_LOG_CHANNEL_ID ||
        process.env.SHOP_LOGS_CHANNEL_ID ||
        process.env.LOG_SHOP_CHANNEL_ID ||
        "";

  return String(raw)
    .replace(/[<#>]/g, "")
    .trim();
}

function cleanText(
  value,
  fallback = "None",
  maxLength = 1024
) {
  const text = (
    Array.isArray(value)
      ? value
      : [value]
  )
    .flat()
    .filter(Boolean)
    .map((entry) =>
      String(entry).trim()
    )
    .filter(Boolean)
    .join("\n");

  if (!text) return fallback;

  if (text.length <= maxLength) {
    return text;
  }

  return [
    text.slice(
      0,
      Math.max(
        0,
        maxLength - 20
      )
    ),
    "...and more",
  ].join("\n");
}

function getPlayerLine(message) {
  const user = message?.author;

  const userId = String(
    user?.id || "Unknown"
  );

  const username = String(
    user?.username ||
      "Unknown Player"
  );

  return [
    `<@${userId}>`,
    username,
    `ID: ${userId}`,
  ].join("\n");
}

function getLocationLine(message) {
  const guildName = String(
    message?.guild?.name ||
      "Direct Message"
  );

  const guildId = String(
    message?.guild?.id || "DM"
  );

  const channelId = String(
    message?.channel?.id ||
      "Unknown"
  );

  return [
    guildName,
    `Server ID: ${guildId}`,
    `Channel: <#${channelId}>`,
  ].join("\n");
}

async function getLogChannel(
  message,
  type
) {
  const channelId =
    getLogChannelId(type);

  if (
    !channelId ||
    !message?.client
  ) {
    return null;
  }

  return (
    message.client.channels.cache.get(
      channelId
    ) ||
    (await message.client.channels
      .fetch(channelId)
      .catch(() => null))
  );
}

async function sendChestLog({
  message,
  chestName,
  chestCode,
  amount = 1,
  rewards = [],
}) {
  try {
    const channel =
      await getLogChannel(
        message,
        "chest"
      );

    if (!channel?.send) {
      return false;
    }

    const embed =
      new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Chest Opened")
        .addFields(
          {
            name: "Player",
            value:
              getPlayerLine(message),
            inline: true,
          },
          {
            name: "Chest",
            value: [
              `${String(
                chestName ||
                  "Unknown Chest"
              )} x${Number(
                amount || 1
              ).toLocaleString(
                "en-US"
              )}`,
              `Code: ${String(
                chestCode ||
                  "unknown"
              )}`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "Rewards",
            value: cleanText(
              rewards,
              "No rewards were generated."
            ),
            inline: false,
          },
          {
            name: "Location",
            value:
              getLocationLine(
                message
              ),
            inline: false,
          }
        )
        .setTimestamp()
        .setFooter({
          text: "One Piece Bot • Chest Log",
        });

    await channel.send({
      embeds: [embed],
      allowedMentions: {
        parse: [],
        users: [],
        roles: [],
      },
    });

    return true;
  } catch (error) {
    console.error(
      "[CHEST LOG ERROR]",
      error?.message || error
    );

    return false;
  }
}

async function sendShopLog({
  message,
  shopName,
  itemName,
  itemCode,
  amount = 1,
  cost,
  remaining,
  rewards = [],
  details = [],
}) {
  try {
    const channel =
      await getLogChannel(
        message,
        "shop"
      );

    if (!channel?.send) {
      return false;
    }

    const purchaseLines = [
      `${String(
        itemName || "Unknown Item"
      )} x${Number(
        amount || 1
      ).toLocaleString("en-US")}`,

      itemCode
        ? `Code: ${String(
            itemCode
          )}`
        : null,

      cost
        ? `Cost: ${String(cost)}`
        : null,

      remaining
        ? `Remaining: ${String(
            remaining
          )}`
        : null,

      ...[].concat(
        details || []
      ),
    ].filter(Boolean);

    const embed =
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle(
          "Shop Purchase Completed"
        )
        .addFields(
          {
            name: "Player",
            value:
              getPlayerLine(message),
            inline: true,
          },
          {
            name: "Shop",
            value: String(
              shopName ||
                "Unknown Shop"
            ),
            inline: true,
          },
          {
            name: "Purchase",
            value: cleanText(
              purchaseLines
            ),
            inline: false,
          },
          {
            name: "Received",
            value: cleanText(
              rewards,
              "No reward details."
            ),
            inline: false,
          },
          {
            name: "Location",
            value:
              getLocationLine(
                message
              ),
            inline: false,
          }
        )
        .setTimestamp()
        .setFooter({
          text: "One Piece Bot • Shop Log",
        });

    await channel.send({
      embeds: [embed],
      allowedMentions: {
        parse: [],
        users: [],
        roles: [],
      },
    });

    return true;
  } catch (error) {
    console.error(
      "[SHOP LOG ERROR]",
      error?.message || error
    );

    return false;
  }
}

module.exports = {
  sendChestLog,
  sendShopLog,
};