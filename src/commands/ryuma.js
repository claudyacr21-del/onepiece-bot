const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

const {
  readPlayers,
  writePlayers,
  getPlayer,
} = require("../playerStore");

const EVENT_ID = "ryuma_global_boss";
const GLOBAL_STORE_ID = "__ryuma_global_boss_event";

const EVENT_NAME = "Ryuma Global Boss Event";
const BOSS_NAME = "Ryuma";

const MAX_HP = 600000000;
const DAMAGE_PER_ATTACK = 5000;
const ATTACK_LIMIT = 20;
const ATTACK_WINDOW_MS = 6 * 60 * 60 * 1000;
const EVENT_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const EVENT_START_AT = process.env.RYUMA_EVENT_START_AT
  ? Date.parse(process.env.RYUMA_EVENT_START_AT)
  : 0;

const EVENT_END_AT = process.env.RYUMA_EVENT_END_AT
  ? Date.parse(process.env.RYUMA_EVENT_END_AT)
  : 0;

const RYUMA_ATTACK_GIF = process.env.RYUMA_ATTACK_GIF || "";

const GLOBAL_MILESTONES = [
  5000000,
  10000000,
  15000000,
  20000000,
  25000000,
  30000000,
  35000000,
  40000000,
  45000000,
  50000000,
  55000000,
  60000000,
  65000000,
  70000000,
  75000000,
];

const PITY_CHARM_MILESTONES = new Set([
  25000000,
  50000000,
  75000000,
]);

const PERSONAL_MILESTONES = [
  {
    damage: 25000,
    rewards: {
      ryumaTokens: 25,
    },
  },
  {
    damage: 75000,
    rewards: {
      ryumaTokens: 50,
    },
  },
  {
    damage: 150000,
    rewards: {
      ryumaTokens: 100,
      berries: 500000,
    },
  },
  {
    damage: 300000,
    rewards: {
      ryumaTokens: 150,
      berries: 1000000,
    },
  },
  {
    damage: 600000,
    rewards: {
      ryumaTokens: 250,
      berries: 2000000,
    },
  },
  {
    damage: 1000000,
    rewards: {
      ryumaTokens: 400,
      gems: 5,
    },
  },
  {
    damage: 1750000,
    rewards: {
      ryumaTokens: 600,
      berries: 3000000,
    },
  },
  {
    damage: 2750000,
    rewards: {
      ryumaTokens: 900,
      gems: 10,
    },
  },
  {
    damage: 4000000,
    rewards: {
      ryumaTokens: 1250,
      berries: 5000000,
    },
  },
  {
    damage: 5500000,
    rewards: {
      ryumaTokens: 2000,
      boxes: [
        {
          code: "exclusive_event_chest",
          name: "Exclusive Event Chest",
          amount: 1,
          type: "Box",
          description: "A premium chest from the Ryuma Global Boss Event.",
        },
      ],
    },
  },
];

const BONUS_START_DAMAGE = 5500000;
const BONUS_STEP_DAMAGE = 1000000;

const BONUS_REWARD = {
  ryumaTokens: 500,
  berries: 1000000,
  gems: 500,
  tickets: [
    {
      code: "pull_reset_ticket",
      name: "Pull Reset Ticket",
      amount: 1,
      type: "Ticket",
    },
    {
      code: "raid_ticket",
      name: "Raid Ticket",
      amount: 1,
      type: "Ticket",
    },
  ],
};

const SHOP_ITEMS = [
  {
    key: "berries_500k",
    name: "500,000 Berries",
    price: 150,
    limit: 10,
    aliases: ["berries", "berry", "500k berries", "500000 berries"],
    rewards: {
      berries: 500000,
    },
  },
  {
    key: "berries_1m",
    name: "1,000,000 Berries",
    price: 275,
    limit: 5,
    aliases: ["1m berries", "1000000 berries", "1 million berries"],
    rewards: {
      berries: 1000000,
    },
  },
  {
    key: "gems_5",
    name: "5 Gems",
    price: 350,
    limit: 8,
    aliases: ["gems", "gem", "5 gems"],
    rewards: {
      gems: 5,
    },
  },
  {
    key: "gems_10",
    name: "10 Gems",
    price: 650,
    limit: 4,
    aliases: ["10 gems"],
    rewards: {
      gems: 10,
    },
  },
  {
    key: "materials_pack",
    name: "Materials Pack",
    price: 300,
    limit: 10,
    aliases: ["materials", "material", "mat", "mats", "materials pack"],
    rewards: {
      items: [
        {
          code: "materials_pack",
          name: "Materials Pack",
          amount: 1,
          type: "Event Item",
          description: "A material pack from the Ryuma Event Shop.",
        },
      ],
    },
  },
  {
    key: "raid_ticket",
    name: "Raid Ticket",
    price: 500,
    limit: 5,
    aliases: ["raid", "raid ticket", "raid tickets"],
    rewards: {
      tickets: [
        {
          code: "raid_ticket",
          name: "Raid Ticket",
          amount: 1,
          type: "Ticket",
        },
      ],
    },
  },
  {
    key: "gold_raid_ticket",
    name: "Gold Raid Ticket",
    price: 1200,
    limit: 3,
    aliases: ["gold raid", "gold raid ticket", "gold raid tickets", "grt"],
    rewards: {
      tickets: [
        {
          code: "gold_raid_ticket",
          name: "Gold Raid Ticket",
          amount: 1,
          type: "Ticket",
        },
      ],
    },
  },
  {
    key: "pull_reset_ticket",
    name: "Pull Reset Ticket",
    price: 900,
    limit: 3,
    aliases: ["pull reset", "pull reset ticket", "pull reset tickets", "reset"],
    rewards: {
      tickets: [
        {
          code: "pull_reset_ticket",
          name: "Pull Reset Ticket",
          amount: 1,
          type: "Ticket",
        },
      ],
    },
  },
];

function fmt(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function now() {
  return Date.now();
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDefaultGlobalState() {
  const startedAt = Number.isFinite(EVENT_START_AT) && EVENT_START_AT > 0
    ? EVENT_START_AT
    : now();

  const endsAt = Number.isFinite(EVENT_END_AT) && EVENT_END_AT > 0
    ? EVENT_END_AT
    : startedAt + EVENT_DURATION_MS;

  return {
    id: EVENT_ID,
    name: EVENT_NAME,
    bossName: BOSS_NAME,
    maxHp: MAX_HP,
    totalDamage: 0,
    startedAt,
    endsAt,
  };
}

function isEventStarted(globalState) {
  return now() >= Number(globalState.startedAt || 0);
}

function getGlobalState(players) {
  const raw = players[GLOBAL_STORE_ID] || {};
  const fallback = getDefaultGlobalState();

  return {
    ...fallback,
    ...raw,
    id: EVENT_ID,
    name: EVENT_NAME,
    bossName: BOSS_NAME,
    maxHp: MAX_HP,
    totalDamage: Math.max(0, Number(raw.totalDamage || 0)),
    startedAt: Number(raw.startedAt || fallback.startedAt),
    endsAt: Number(raw.endsAt || fallback.endsAt),
  };
}

function saveGlobalState(players, state) {
  players[GLOBAL_STORE_ID] = {
    ...getGlobalState(players),
    ...(state || {}),
  };
  writePlayers(players);
}

function getHpLeft(globalState) {
  return Math.max(0, MAX_HP - Math.max(0, Number(globalState.totalDamage || 0)));
}

function isEventEnded(globalState) {
  return now() >= Number(globalState.endsAt || 0);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getEventData(player) {
  const events = player?.events && typeof player.events === "object" ? player.events : {};
  const data = events[EVENT_ID] && typeof events[EVENT_ID] === "object" ? events[EVENT_ID] : {};

  return {
    damage: Math.max(0, Number(data.damage || 0)),
    joinedAt: Number(data.joinedAt || 0),
    attackWindowStartedAt: Number(data.attackWindowStartedAt || 0),
    attacksUsed: Math.max(0, Number(data.attacksUsed || 0)),
    claimedPersonalMilestones: Array.isArray(data.claimedPersonalMilestones)
      ? data.claimedPersonalMilestones.map(Number)
      : [],
    claimedBonusMilestones: Array.isArray(data.claimedBonusMilestones)
      ? data.claimedBonusMilestones.map(Number)
      : [],
    claimedGlobalMilestones: Array.isArray(data.claimedGlobalMilestones)
      ? data.claimedGlobalMilestones.map(Number)
      : [],
    shopPurchases:
      data.shopPurchases && typeof data.shopPurchases === "object"
        ? data.shopPurchases
        : {},
  };
}

function setEventData(player, eventData) {
  return {
    ...player,
    events: {
      ...(player.events || {}),
      [EVENT_ID]: {
        ...getEventData(player),
        ...(eventData || {}),
      },
    },
  };
}

function getAttackWindow(eventData) {
  const current = now();
  const startedAt = Number(eventData.attackWindowStartedAt || 0);
  const used = Math.max(0, Number(eventData.attacksUsed || 0));

  if (!startedAt || current - startedAt >= ATTACK_WINDOW_MS) {
    return {
      attackWindowStartedAt: current,
      attacksUsed: 0,
      attacksLeft: ATTACK_LIMIT,
      resetAt: current + ATTACK_WINDOW_MS,
    };
  }

  return {
    attackWindowStartedAt: startedAt,
    attacksUsed: used,
    attacksLeft: Math.max(0, ATTACK_LIMIT - used),
    resetAt: startedAt + ATTACK_WINDOW_MS,
  };
}

function addStack(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(item?.code || item?.name || "").toLowerCase();
  const amount = Math.max(1, Math.floor(Number(item?.amount || 1)));

  if (!code) return arr;

  const index = arr.findIndex((entry) => {
    return String(entry?.code || entry?.name || "").toLowerCase() === code;
  });

  if (index === -1) {
    arr.push({
      ...item,
      amount,
    });
  } else {
    arr[index] = {
      ...arr[index],
      ...item,
      amount: Math.max(0, Number(arr[index].amount || 0)) + amount,
    };
  }

  return arr;
}

function applyRewards(player, rewards = {}) {
  let next = { ...player };

  if (rewards.berries) {
    next.berries = Math.max(0, Number(next.berries || 0)) + Number(rewards.berries || 0);
  }

  if (rewards.gems) {
    next.gems = Math.max(0, Number(next.gems || 0)) + Number(rewards.gems || 0);
  }

  if (rewards.ryumaTokens) {
    next.ryumaTokens = Math.max(0, Number(next.ryumaTokens || 0)) + Number(rewards.ryumaTokens || 0);
  }

  for (const item of rewards.items || []) {
    next.items = addStack(next.items, item);
  }

  for (const ticket of rewards.tickets || []) {
    next.tickets = addStack(next.tickets, ticket);
  }

  for (const box of rewards.boxes || []) {
    next.boxes = addStack(next.boxes, box);
  }

  return next;
}

function rewardLines(rewards = {}) {
  const lines = [];

  if (rewards.ryumaTokens) lines.push(`+${fmt(rewards.ryumaTokens)} Ryuma Tokens`);
  if (rewards.berries) lines.push(`+${fmt(rewards.berries)} berries`);
  if (rewards.gems) lines.push(`+${fmt(rewards.gems)} gems`);

  for (const item of rewards.items || []) {
    lines.push(`+${fmt(item.amount)} ${item.name}`);
  }

  for (const ticket of rewards.tickets || []) {
    lines.push(`+${fmt(ticket.amount)} ${ticket.name}`);
  }

  for (const box of rewards.boxes || []) {
    lines.push(`+${fmt(box.amount)} ${box.name}`);
  }

  return lines;
}

function multiplyRewards(rewards = {}, amount = 1) {
  const qty = Math.max(1, Math.floor(Number(amount || 1)));

  return {
    berries: rewards.berries ? Number(rewards.berries) * qty : 0,
    gems: rewards.gems ? Number(rewards.gems) * qty : 0,
    ryumaTokens: rewards.ryumaTokens ? Number(rewards.ryumaTokens) * qty : 0,
    items: (rewards.items || []).map((item) => ({
      ...item,
      amount: Math.max(1, Number(item.amount || 1)) * qty,
    })),
    tickets: (rewards.tickets || []).map((ticket) => ({
      ...ticket,
      amount: Math.max(1, Number(ticket.amount || 1)) * qty,
    })),
    boxes: (rewards.boxes || []).map((box) => ({
      ...box,
      amount: Math.max(1, Number(box.amount || 1)) * qty,
    })),
  };
}

function getUnlockedGlobalMilestones(totalDamage) {
  const damage = Math.max(0, Number(totalDamage || 0));
  return GLOBAL_MILESTONES.filter((milestone) => damage >= milestone);
}

function getNextGlobalMilestone(totalDamage) {
  const damage = Math.max(0, Number(totalDamage || 0));
  return GLOBAL_MILESTONES.find((milestone) => milestone > damage) || null;
}

function getUnlockedBonusCount(damage) {
  const personalDamage = Math.max(0, Number(damage || 0));
  if (personalDamage < BONUS_START_DAMAGE + BONUS_STEP_DAMAGE) return 0;
  return Math.floor((personalDamage - BONUS_START_DAMAGE) / BONUS_STEP_DAMAGE);
}

function getNextPersonalMilestone(damage) {
  const personalDamage = Math.max(0, Number(damage || 0));
  const next = PERSONAL_MILESTONES.find((milestone) => milestone.damage > personalDamage);

  if (next) return next.damage;

  const bonusCount = getUnlockedBonusCount(personalDamage);
  return BONUS_START_DAMAGE + ((bonusCount + 1) * BONUS_STEP_DAMAGE);
}

function getPersonalClaims(eventData) {
  const claimed = new Set(eventData.claimedPersonalMilestones || []);
  return PERSONAL_MILESTONES.filter((milestone) => {
    return eventData.damage >= milestone.damage && !claimed.has(milestone.damage);
  });
}

function getBonusClaims(eventData) {
  const claimed = new Set(eventData.claimedBonusMilestones || []);
  const unlockedCount = getUnlockedBonusCount(eventData.damage);
  const claims = [];

  for (let index = 1; index <= unlockedCount; index += 1) {
    const milestoneDamage = BONUS_START_DAMAGE + (index * BONUS_STEP_DAMAGE);

    if (!claimed.has(milestoneDamage)) {
      claims.push(milestoneDamage);
    }
  }

  return claims;
}

function buildMainRows(disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ryuma_attack")
        .setLabel("Attack")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("ryuma_rewards")
        .setLabel("Rewards")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("ryuma_claim")
        .setLabel("Claim")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("ryuma_shop")
        .setLabel("Shop")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    ),
  ];
}

function buildPanelEmbed(message) {
  const players = readPlayers();
  const globalState = getGlobalState(players);
  const player = getPlayer(players, message.author.id, message.author.username);
  const eventData = getEventData(player);
  const attackWindow = getAttackWindow(eventData);
  const hpLeft = getHpLeft(globalState);
  const nextGlobal = getNextGlobalMilestone(globalState.totalDamage);
  const nextPersonal = getNextPersonalMilestone(eventData.damage);
  const timeLeft = Math.max(0, Number(globalState.endsAt || 0) - now());

  const embed = new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle(EVENT_NAME)
    .setDescription(
      [
        `**Boss:** ${BOSS_NAME}`,
        `**Boss HP:** ${fmt(hpLeft)} / ${fmt(MAX_HP)}`,
        `**Global Damage:** ${fmt(globalState.totalDamage)}`,
        `**Time Left:** ${formatDuration(timeLeft)}`,
        "",
        `**Your Damage:** ${fmt(eventData.damage)}`,
        `**Your Ryuma Tokens:** ${fmt(player.ryumaTokens || 0)}`,
        `**Your Attacks:** ${attackWindow.attacksLeft} / ${ATTACK_LIMIT}`,
        `**Attack Reset:** <t:${Math.floor(attackWindow.resetAt / 1000)}:R>`,
        "",
        `**Next Global Milestone:** ${nextGlobal ? fmt(nextGlobal) : "All global milestones unlocked"}`,
        `**Next Personal Milestone:** ${fmt(nextPersonal)} damage`,
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Ryuma Event",
    })
    .setTimestamp();

  if (RYUMA_ATTACK_GIF) {
    embed.setImage(RYUMA_ATTACK_GIF);
  }

  return embed;
}

function buildRewardsEmbed(message) {
  const players = readPlayers();
  const globalState = getGlobalState(players);
  const player = getPlayer(players, message.author.id, message.author.username);
  const eventData = getEventData(player);

  const unlockedGlobal = getUnlockedGlobalMilestones(globalState.totalDamage);
  const claimedGlobal = new Set(eventData.claimedGlobalMilestones || []);

  const personalLines = PERSONAL_MILESTONES.map((milestone) => {
    const done = eventData.damage >= milestone.damage;
    const claimed = eventData.claimedPersonalMilestones.includes(milestone.damage);
    return `${done ? "✅" : "❌"} ${fmt(milestone.damage)} damage${claimed ? " — claimed" : ""}`;
  });

  const globalLines = GLOBAL_MILESTONES.map((milestone) => {
    const unlocked = unlockedGlobal.includes(milestone);
    const claimed = claimedGlobal.has(milestone);
    const charm = PITY_CHARM_MILESTONES.has(milestone) ? " + Ryuma Pity Charm" : "";
    return `${unlocked ? "✅" : "❌"} ${fmt(milestone)} global damage${charm}${claimed ? " — claimed" : ""}`;
  });

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("Ryuma Event Rewards")
    .setDescription(
      [
        `**Your Damage:** ${fmt(eventData.damage)}`,
        `**Global Damage:** ${fmt(globalState.totalDamage)}`,
        "",
        "**Personal Milestones**",
        personalLines.join("\n"),
        "",
        "**Global Milestones**",
        globalLines.join("\n"),
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Ryuma Event",
    });
}

function findShopItem(query) {
  const normalized = normalizeText(query);

  if (!normalized) return null;

  let best = null;

  for (const item of SHOP_ITEMS) {
    const aliases = [
      item.key,
      item.name,
      ...(item.aliases || []),
    ].map(normalizeText);

    if (aliases.includes(normalized)) {
      return item;
    }

    for (const alias of aliases) {
      if (!alias) continue;

      if (alias.includes(normalized) || normalized.includes(alias)) {
        const score = alias.length;
        if (!best || score > best.score) {
          best = {
            item,
            score,
          };
        }
      }
    }
  }

  return best?.item || null;
}

function parseBuyArgs(args) {
  const raw = Array.isArray(args) ? [...args] : [];
  let amount = 1;

  if (raw.length) {
    const last = String(raw[raw.length - 1] || "").trim();

    if (/^\d+$/.test(last)) {
      amount = Math.max(1, Math.min(99, Math.floor(Number(last))));
      raw.pop();
    }
  }

  return {
    query: raw.join(" "),
    amount,
  };
}

function buildShopEmbed(message) {
  const players = readPlayers();
  const player = getPlayer(players, message.author.id, message.author.username);
  const eventData = getEventData(player);

  const lines = SHOP_ITEMS.map((item) => {
    const bought = Math.max(0, Number(eventData.shopPurchases?.[item.key] || 0));

    return [
      `**${item.name}**`,
      `Price: ${fmt(item.price)} Ryuma Tokens | Limit: ${bought}/${item.limit}`,
      `Buy: \`op ryuma shop buy ${item.name.toLowerCase()} <amount>\``,
    ].join("\n");
  });

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("Ryuma Event Shop")
    .setDescription(
      [
        `**Your Ryuma Tokens:** ${fmt(player.ryumaTokens || 0)}`,
        "",
        lines.join("\n\n"),
        "",
        "**Examples:**",
        "`op ryuma shop buy raid ticket 3`",
        "`op ryuma shop buy gold raid ticket 2`",
        "`op ryuma shop buy pull reset ticket 1`",
        "`op ryuma shop buy berries 5`",
        "`op ryuma shop buy gems 4`",
      ].join("\n")
    )
    .setFooter({
      text: "Purchase limits are per user for the whole event.",
    });
}

async function buyShopItem(message, buyArgs = []) {
  const parsed = parseBuyArgs(buyArgs);
  const item = findShopItem(parsed.query);
  const requestedAmount = parsed.amount;

  if (!item) {
    return message.reply({
      content: [
        "Invalid shop item.",
        "",
        "**Examples:**",
        "`op ryuma shop buy raid ticket 3`",
        "`op ryuma shop buy gold raid ticket 2`",
        "`op ryuma shop buy pull reset ticket 1`",
        "`op ryuma shop buy berries 5`",
        "`op ryuma shop buy gems 4`",
      ].join("\n"),
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const players = readPlayers();
  let player = getPlayer(players, message.author.id, message.author.username);
  const eventData = getEventData(player);
  const bought = Math.max(0, Number(eventData.shopPurchases?.[item.key] || 0));
  const remainingLimit = Math.max(0, item.limit - bought);
  const buyAmount = Math.min(requestedAmount, remainingLimit);
  const totalPrice = item.price * buyAmount;
  const tokens = Math.max(0, Number(player.ryumaTokens || 0));

  if (remainingLimit <= 0) {
    return message.reply({
      content: `You already reached the purchase limit for **${item.name}**.`,
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  if (tokens < totalPrice) {
    return message.reply({
      content: [
        `Not enough Ryuma Tokens to buy **${fmt(buyAmount)}x ${item.name}**.`,
        `Required: **${fmt(totalPrice)}**`,
        `You have: **${fmt(tokens)}**`,
      ].join("\n"),
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  player = {
    ...player,
    ryumaTokens: tokens - totalPrice,
  };

  player = applyRewards(player, multiplyRewards(item.rewards, buyAmount));

  const nextEventData = {
    ...eventData,
    shopPurchases: {
      ...(eventData.shopPurchases || {}),
      [item.key]: bought + buyAmount,
    },
  };

  player = setEventData(player, nextEventData);
  players[String(message.author.id)] = player;
  writePlayers(players);

  const clippedText =
    requestedAmount > buyAmount
      ? `\nYou requested **${fmt(requestedAmount)}**, but only **${fmt(buyAmount)}** could be bought because of the purchase limit.`
      : "";

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("Shop Purchase Complete")
    .setDescription(
      [
        `You bought **${fmt(buyAmount)}x ${item.name}**.`,
        `Total Price: **${fmt(totalPrice)} Ryuma Tokens**`,
        `Remaining Ryuma Tokens: **${fmt(player.ryumaTokens)}**`,
        `Purchase Count: **${bought + buyAmount}/${item.limit}**`,
        clippedText,
      ].filter(Boolean).join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Ryuma Event Shop",
    });

  return message.reply({
    embeds: [embed],
    allowedMentions: {
      repliedUser: false,
    },
  });
}

async function performAttack(message, editableMessage = null) {
  const players = readPlayers();
  const globalState = getGlobalState(players);

    if (!isEventStarted(globalState)) {
    return message.reply({
        content: `The Ryuma Global Boss Event has not started yet.\nStarts: <t:${Math.floor(globalState.startedAt / 1000)}:F>`,
        allowedMentions: {
        repliedUser: false,
        },
    });
    }

  if (isEventEnded(globalState)) {
    return message.reply({
      content: "The Ryuma Global Boss Event has ended.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  let player = getPlayer(players, message.author.id, message.author.username);
  const eventData = getEventData(player);
  const attackWindow = getAttackWindow(eventData);

  if (attackWindow.attacksLeft <= 0) {
    return message.reply({
      content: `You have no attacks left. Your attacks reset <t:${Math.floor(attackWindow.resetAt / 1000)}:R>.`,
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const nextEventData = {
    ...eventData,
    joinedAt: eventData.joinedAt || now(),
    damage: eventData.damage + DAMAGE_PER_ATTACK,
    attackWindowStartedAt: attackWindow.attackWindowStartedAt,
    attacksUsed: attackWindow.attacksUsed + 1,
    claimedPersonalMilestones: [...eventData.claimedPersonalMilestones],
    claimedBonusMilestones: [...eventData.claimedBonusMilestones],
  };

  const claimedLines = [];

  for (const milestone of getPersonalClaims(nextEventData)) {
    player = applyRewards(player, milestone.rewards);
    nextEventData.claimedPersonalMilestones.push(milestone.damage);
    claimedLines.push(`Personal ${fmt(milestone.damage)} damage: ${rewardLines(milestone.rewards).join(", ")}`);
  }

  for (const bonusDamage of getBonusClaims(nextEventData)) {
    player = applyRewards(player, BONUS_REWARD);
    nextEventData.claimedBonusMilestones.push(bonusDamage);
    claimedLines.push(`Bonus ${fmt(bonusDamage)} damage: ${rewardLines(BONUS_REWARD).join(", ")}`);
  }

  player = setEventData(player, nextEventData);

  globalState.totalDamage = Math.max(0, Number(globalState.totalDamage || 0)) + DAMAGE_PER_ATTACK;

  players[GLOBAL_STORE_ID] = globalState;
  players[String(message.author.id)] = player;
  writePlayers(players);

  const hpLeft = getHpLeft(globalState);

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle(`${BOSS_NAME} Attacked`)
    .setDescription(
      [
        `You attacked **${BOSS_NAME}** and dealt **${fmt(DAMAGE_PER_ATTACK)} damage**.`,
        "",
        `**Boss HP:** ${fmt(hpLeft)} / ${fmt(MAX_HP)}`,
        `**Global Damage:** ${fmt(globalState.totalDamage)}`,
        `**Your Damage:** ${fmt(nextEventData.damage)}`,
        "",
        claimedLines.length
          ? `**Rewards Auto-Claimed:**\n${claimedLines.map((line) => `- ${line}`).join("\n")}`
          : "No new personal milestone reward unlocked.",
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Ryuma Event",
    })
    .setTimestamp();

  if (RYUMA_ATTACK_GIF) {
    embed.setImage(RYUMA_ATTACK_GIF);
  }

  const payload = {
    embeds: [embed],
    components: buildMainRows(false),
    allowedMentions: {
      repliedUser: false,
    },
  };

  if (editableMessage?.edit) {
    return editableMessage.edit(payload).catch(() => message.reply(payload));
  }

  return message.reply(payload);
}

async function claimGlobalRewards(message, editableMessage = null) {
  const players = readPlayers();
  const globalState = getGlobalState(players);
  let player = getPlayer(players, message.author.id, message.author.username);
  const eventData = getEventData(player);

  if (!eventData.joinedAt || eventData.damage < 25000) {
    return message.reply({
      content: `You need to join the event and deal at least **25,000 damage** first.\nYour damage: **${fmt(eventData.damage)}**`,
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const unlocked = getUnlockedGlobalMilestones(globalState.totalDamage);
  const claimed = new Set(eventData.claimedGlobalMilestones || []);
  const claimable = unlocked.filter((milestone) => !claimed.has(milestone));

  if (!claimable.length) {
    return message.reply({
      content: "You have no global milestone rewards to claim.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  let totalBerries = 0;
  let totalTokens = 0;
  let totalCharms = 0;

  const nextEventData = {
    ...eventData,
    claimedGlobalMilestones: [...eventData.claimedGlobalMilestones],
  };

  for (const milestone of claimable) {
    totalBerries += 1000000;
    totalTokens += 50;

    if (PITY_CHARM_MILESTONES.has(milestone)) {
      totalCharms += 1;
    }

    nextEventData.claimedGlobalMilestones.push(milestone);
  }

  player = applyRewards(player, {
    berries: totalBerries,
    ryumaTokens: totalTokens,
    items: totalCharms > 0
      ? [
          {
            code: "ryuma_pity_charm",
            name: "Ryuma Pity Charm",
            amount: totalCharms,
            type: "Event Item",
            description: "Reduces pull pity requirement during the Ryuma event.",
          },
        ]
      : [],
  });

  player = setEventData(player, nextEventData);
  players[String(message.author.id)] = player;
  writePlayers(players);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("Global Rewards Claimed")
    .setDescription(
      [
        `You claimed **${claimable.length}** global milestone reward(s).`,
        "",
        `+${fmt(totalBerries)} berries`,
        `+${fmt(totalTokens)} Ryuma Tokens`,
        totalCharms > 0 ? `+${fmt(totalCharms)} Ryuma Pity Charm` : null,
      ].filter(Boolean).join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Ryuma Event",
    });

  const payload = {
    embeds: [embed],
    components: buildMainRows(false),
    allowedMentions: {
      repliedUser: false,
    },
  };

  if (editableMessage?.edit) {
    return editableMessage.edit(payload).catch(() => message.reply(payload));
  }

  return message.reply(payload);
}

function buildLeaderboardEmbed() {
  const players = readPlayers();

  const rows = Object.entries(players || {})
    .filter(([userId]) => !String(userId).startsWith("__"))
    .map(([userId, player]) => {
      const eventData = getEventData(player);

      return {
        userId,
        username: player?.username || `User ${userId}`,
        damage: eventData.damage,
      };
    })
    .filter((entry) => entry.damage > 0)
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 10);

  const lines = rows.length
    ? rows.map((entry, index) => {
        return `**${index + 1}.** <@${entry.userId}> — ${fmt(entry.damage)} damage`;
      })
    : ["No players have joined the event yet."];

  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle("Ryuma Damage Leaderboard")
    .setDescription(lines.join("\n"))
    .setFooter({
      text: "One Piece Bot • Ryuma Event",
    });
}

async function sendPanel(message) {
  const sent = await message.reply({
    embeds: [buildPanelEmbed(message)],
    components: buildMainRows(false),
    allowedMentions: {
      repliedUser: false,
    },
  });

  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 10 * 60 * 1000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({
        content: "This Ryuma event panel is not yours.",
        ephemeral: true,
      });
    }

    await interaction.deferUpdate().catch(() => null);

    if (interaction.customId === "ryuma_attack") {
      return performAttack(message, sent);
    }

    if (interaction.customId === "ryuma_rewards") {
      return sent.edit({
        embeds: [buildRewardsEmbed(message)],
        components: buildMainRows(false),
      });
    }

    if (interaction.customId === "ryuma_claim") {
      return claimGlobalRewards(message, sent);
    }

    if (interaction.customId === "ryuma_shop") {
      return sent.edit({
        embeds: [buildShopEmbed(message)],
        components: buildMainRows(false),
      });
    }

    return null;
  });

  collector.on("end", async () => {
    await sent.edit({
      components: buildMainRows(true),
    }).catch(() => null);
  });

  return sent;
}

module.exports = {
  name: "ryuma",
  aliases: ["ryumaevent", "ryumaboss"],

  async execute(message, args = []) {
    if (!message.guild) {
      return message.reply({
        content: "This command can only be used in a server.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const subcommand = normalizeText(args[0]);

    if (!subcommand) {
      return sendPanel(message);
    }

    if (subcommand === "attack" || subcommand === "fight") {
      return sendPanel(message);
    }

    if (subcommand === "lb" || subcommand === "leaderboard") {
      return message.reply({
        embeds: [buildLeaderboardEmbed()],
        allowedMentions: {
          repliedUser: false,
          parse: [],
        },
      });
    }

    if (subcommand === "rewards" || subcommand === "reward") {
      return message.reply({
        embeds: [buildRewardsEmbed(message)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (subcommand === "claim") {
      return claimGlobalRewards(message);
    }

    if (subcommand === "shop") {
      const action = normalizeText(args[1]);

      if (action === "buy") {
        return buyShopItem(message, args.slice(2));
      }

      return message.reply({
        embeds: [buildShopEmbed(message)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    return message.reply({
      content: [
        "**Ryuma Event Commands**",
        "`op ryuma`",
        "`op ryuma attack`",
        "`op ryuma lb`",
        "`op ryuma rewards`",
        "`op ryuma claim`",
        "`op ryuma shop`",
        "`op ryuma shop buy <item name> <amount>`",
        "",
        "**Examples:**",
        "`op ryuma shop buy raid ticket 3`",
        "`op ryuma shop buy gold raid ticket 2`",
        "`op ryuma shop buy pull reset ticket 1`",
      ].join("\n"),
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};