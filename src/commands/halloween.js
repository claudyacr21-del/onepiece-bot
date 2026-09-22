const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const {
  getPlayer,
  updatePlayerAtomic,
} = require("../playerStore");

const cardsDb = require("../data/cards");
const weaponsDb = require("../data/weapons");
const devilFruitsDb = require("../data/devilFruits");
const { ITEMS, cloneItem } = require("../data/items");
const { createOwnedCard } = require("../utils/evolution");
const { isUniversalAdmin } = require("../utils/universalAdmin");
const {
  getItemEmoji,
} = require("../config/itemEmojis");

const {
  ensureFragmentEmojiCache,
  getFragmentIcon,
} = require("./finv");

const EVENT_KEY = "halloween2026";
const EVENT_NAME = "Halloween Event";
const EVENT_ENABLED = true;

const EVENT_START_AT =
  Date.parse(
    "2026-09-21T00:00:00+07:00"
  );

const EVENT_END_AT =
  Date.parse(
    "2026-10-21T00:00:00+07:00"
  );
const ARROW_EMOJI =
  "<a:arrowwhite:1529391752933277858>";

const CURSED_ENERGY_EMOJI =
  getItemEmoji(
    "cursed_energy"
  ) || "🔮";

const PREMIUM_BOX_EMOJI =
  getItemEmoji(
    "premium_box"
  ) || "🎁";

const SUKUNA_BOX_EMOJI =
  getItemEmoji(
    "sukuna_box"
  ) || "🎁";

const HALLOWEEN_EMOJI =
  "🎃";
const EVENT_BOX_CODE =
  "sukuna_box";

const EVENT_BOX_PRICE = 300;

const MAX_BOX_PURCHASE = 100;

const REWARD_DATES = [
  "2026-09-21T00:00:00+07:00",
  "2026-09-22T00:00:00+07:00",
  "2026-09-23T00:00:00+07:00",
  "2026-09-24T00:00:00+07:00",
  "2026-09-25T00:00:00+07:00",
  "2026-09-26T00:00:00+07:00",
  "2026-09-27T00:00:00+07:00",
];

const ITEM_BY_CODE = new Map(
  Object.values(ITEMS).map((entry) => [
    String(entry.code || "").toLowerCase(),
    entry,
  ])
);

const CARD_BY_CODE = new Map(
  cardsDb.map((entry) => [
    String(entry.code || "").toLowerCase(),
    entry,
  ])
);

const WEAPON_BY_CODE = new Map(
  weaponsDb.map((entry) => [
    String(entry.code || "").toLowerCase(),
    entry,
  ])
);

const FRUIT_BY_CODE = new Map(
  devilFruitsDb.map((entry) => [
    String(entry.code || "").toLowerCase(),
    entry,
  ])
);

function item(code, amount) {
  return {
    type: "item",
    code,
    amount,
  };
}

function card(code) {
  return {
    type: "card",
    code,
    amount: 1,
  };
}

function weapon(code) {
  return {
    type: "weapon",
    code,
    amount: 1,
  };
}

function fruit(code) {
  return {
    type: "fruit",
    code,
    amount: 1,
  };
}

function mastery(code, stage) {
  return {
    type: "mastery",
    code,
    stage,
    amount: 1,
  };
}

function fragment(code, amount) {
  return {
    type: "fragment",
    code,
    amount,
  };
}

function cursedEnergy(amount) {
  return {
    type: "cursed_energy",
    code: "cursed_energy",
    amount,
  };
}

const DAYS = [
  {
    free: [
      item("pull_reset_ticket", 5),
      item("tl_common_raid_ticket", 3),
      cursedEnergy(125),
    ],

    premium: [
      item("pull_reset_ticket", 15),
      item("tl_gold_raid_ticket", 1),
      item("tl_raid_ticket", 1),
      cursedEnergy(250),
    ],
  },

  {
    free: [
      card("true_form_sukuna"),
      item("legend_resource_box", 5),
      cursedEnergy(125),
    ],

    premium: [
      item("pull_reset_ticket", 10),
      item("tl_raid_ticket", 3),
      fragment("road_poneglyph", 1),
      cursedEnergy(250),
    ],
  },

  {
    free: [
      item("pull_reset_ticket", 10),
      item("enhancement_stone", 100),
      cursedEnergy(125),
    ],

    premium: [
      mastery("true_form_sukuna", 2),
      item("tl_raid_ticket", 5),
      item("enhancement_stone", 200),
      cursedEnergy(250),
    ],
  },

  {
    free: [
      item("pull_reset_ticket", 10),
      item("tl_raid_ticket", 2),
      cursedEnergy(125),
    ],

    premium: [
      item("pull_reset_ticket", 25),
      mastery("true_form_sukuna", 3),
      item("tl_common_raid_ticket", 15),
      cursedEnergy(250),
    ],
  },

  {
    free: [
      item("pull_reset_ticket", 15),
      cursedEnergy(250),
    ],

    premium: [
      item("pull_reset_ticket", 50),
      cursedEnergy(500),
    ],
  },

  {
    free: [
      item("pull_reset_ticket", 5),
      item("tl_gold_raid_ticket", 1),
      item("legend_resource_box", 5),
      cursedEnergy(250),
    ],

    premium: [
      item("pull_reset_ticket", 25),
      item("tl_raid_ticket", 5),
      item("tl_gold_raid_ticket", 3),
      item("tl_mythic_raid_ticket", 2),
      item("empty_throne_raid_writ", 2),
      cursedEnergy(500),
    ],
  },

  {
    free: [
      weapon("kamutoke"),
      item("legend_resource_box", 3),
      item("pull_reset_ticket", 10),
      cursedEnergy(500),
    ],

    premium: [
      fruit("finger"),
      item("pull_reset_ticket", 35),
      item("tl_raid_ticket", 5),
      item("tl_mythic_raid_ticket", 5),
      cursedEnergy(1000),
    ],
  },
];

const REWARDS_PER_PAGE = 2;
const TOTAL_PAGES = Math.ceil(
  DAYS.length / REWARDS_PER_PAGE
);

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function addOrIncrease(
  list,
  payload,
  amount = 1
) {
  const result = Array.isArray(list)
    ? [...list]
    : [];

  const code = normalizeCode(
    payload?.code
  );

  const name = String(
    payload?.name || ""
  )
    .toLowerCase()
    .trim();

  const index = result.findIndex(
    (entry) => {
      const entryCode = normalizeCode(
        entry?.code
      );

      if (code && entryCode) {
        return code === entryCode;
      }

      return (
        name &&
        String(entry?.name || "")
          .toLowerCase()
          .trim() === name
      );
    }
  );

  if (index >= 0) {
    result[index] = {
      ...result[index],
      ...clone(payload),

      amount:
        Number(
          result[index].amount || 0
        ) +
        Math.max(
          1,
          Number(amount || 1)
        ),
    };

    return result;
  }

  result.push({
    ...clone(payload),

    amount: Math.max(
      1,
      Number(amount || 1)
    ),
  });

  return result;
}

function getEventState(player) {
  const raw =
    player?.events?.[EVENT_KEY] ||
    {};

  return {
    premium:
      raw.premium === true,

    premiumPlus:
      raw.premiumPlus === true,

    freeClaims:
      Array.isArray(raw.freeClaims)
        ? raw.freeClaims
            .map(Number)
            .filter(Number.isFinite)
        : [],

    premiumClaims:
      Array.isArray(
        raw.premiumClaims
      )
        ? raw.premiumClaims
            .map(Number)
            .filter(Number.isFinite)
        : [],
  };
}

function isEventActive(
  now = Date.now()
) {
  return (
    EVENT_ENABLED &&
    Number.isFinite(
      EVENT_START_AT
    ) &&
    Number.isFinite(
      EVENT_END_AT
    ) &&
    now >= EVENT_START_AT &&
    now < EVENT_END_AT
  );
}

function hasEventStarted(
  now = Date.now()
) {
  return (
    Number.isFinite(
      EVENT_START_AT
    ) &&
    now >= EVENT_START_AT
  );
}

function hasEventEnded(
  now = Date.now()
) {
  return (
    !EVENT_ENABLED ||
    (
      Number.isFinite(
        EVENT_END_AT
      ) &&
      now >= EVENT_END_AT
    )
  );
}

async function resetExpiredPremium(
  userId,
  username = "Unknown"
) {
  let wasPremium = false;

  await updatePlayerAtomic(
    userId,
    (fresh) => {
      const state =
        getEventState(fresh);

      wasPremium =
        state.premium === true ||
        state.premiumPlus === true;

      if (!wasPremium) {
        return fresh;
      }

      return {
        ...fresh,

        events: {
          ...(fresh.events || {}),

          [EVENT_KEY]: {
            ...state,
            premium: false,
            premiumPlus: false,
            premiumExpiredAt:
              Date.now(),
          },
        },
      };
    },
    username
  );

  return wasPremium;
}

function getLatestUnlockedDay(
  now = Date.now()
) {
  let latestDay = 0;

  for (
    let index = 0;
    index < REWARD_DATES.length;
    index += 1
  ) {
    const unlockAt = Date.parse(
      REWARD_DATES[index]
    );

    if (
      Number.isFinite(unlockAt) &&
      now >= unlockAt
    ) {
      latestDay = index + 1;
    }
  }

  return latestDay;
}

function getRewardDateLabel(day) {
  const value =
    REWARD_DATES[day - 1];

  const date = new Date(value);

  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    return `Day ${day}`;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }
  ).format(date);
}

function getRewardLabel(reward) {
  if (
    reward.type ===
      "cursed_energy"
  ) {
    return `${Number(reward.amount || 0).toLocaleString("en-US")}x Cursed Energy`;
  }

  if (
    reward.type === "fruit"
  ) {
    const template =
      FRUIT_BY_CODE.get(
        normalizeCode(reward.code)
      );

    return `${template?.name || reward.code} Unlock`;
  }

  if (reward.type === "item") {
    const template =
      ITEM_BY_CODE.get(
        normalizeCode(reward.code)
      );

    return `${Number(reward.amount || 1)}x ${template?.name || reward.code}`;
  }

  if (reward.type === "card") {
    const template =
      CARD_BY_CODE.get(
        normalizeCode(reward.code)
      );

    return `${template?.name || reward.code} Unlock`;
  }

  if (reward.type === "weapon") {
    const template =
      WEAPON_BY_CODE.get(
        normalizeCode(reward.code)
      );

    return `${template?.name || reward.code} Unlock`;
  }

  if (reward.type === "mastery") {
    const template =
      CARD_BY_CODE.get(
        normalizeCode(reward.code)
      );

    return `${template?.name || reward.code} M${reward.stage} Instant Upgrade`;
  }

  if (reward.type === "fragment") {
    const template =
      CARD_BY_CODE.get(
        normalizeCode(reward.code)
      );

    return `${Number(reward.amount || 1)}x ${template?.name || reward.code} Fragment`;
  }

  return "Unknown Reward";
}

function getRewardEmoji(reward) {
  if (
    reward.type ===
      "cursed_energy"
  ) {
    return (
      getItemEmoji(
        "cursed_energy"
      ) ||
      "🔮"
    );
  }

  if (
    reward.type === "fruit"
  ) {
    return (
      getItemEmoji(
        reward.code
      ) ||
      "🍎"
    );
  }

  if (
    reward.type === "card" ||
    reward.type === "mastery"
  ) {
    return getFragmentIcon({
      code:
        reward.code,

      cardCode:
        reward.code,

      sourceCode:
        reward.code,

      category:
        "battle",

      name:
        "True Form Sukuna Fragment",
    });
  }

  if (
    reward.type === "weapon"
  ) {
    return getFragmentIcon({
      code:
        `weapon_fragment_${reward.code}`,

      weaponCode:
        reward.code,

      sourceWeaponCode:
        reward.code,

      category:
        "weapon",

      name:
        "Kamutoke Weapon Fragment",
    });
  }

  if (
    reward.type ===
      "fragment"
  ) {
    const template =
      CARD_BY_CODE.get(
        normalizeCode(
          reward.code
        )
      );

    return getFragmentIcon({
      code:
        reward.code,

      cardCode:
        reward.code,

      sourceCode:
        reward.code,

      category:
        template
          ?.cardRole ===
          "boost"
            ? "boost"
            : "battle",

      name:
        `${template?.name || reward.code} Fragment`,
    });
  }

  return (
    getItemEmoji(
      reward.code
    ) ||
    "▫️"
  );
}

function applyItemReward(
  player,
  reward
) {
  const template =
    ITEM_BY_CODE.get(
      normalizeCode(reward.code)
    );

  if (!template) {
    throw new Error(
      `Missing item: ${reward.code}`
    );
  }

  const payload = cloneItem(
    template,
    Number(reward.amount || 1)
  );

  const type = String(
    template.type || ""
  ).toLowerCase();

  const bucket =
    type === "box"
      ? "boxes"
      : type === "ticket"
        ? "tickets"
        : type === "material"
          ? "materials"
          : "items";

  player[bucket] = addOrIncrease(
    player[bucket],
    payload,
    reward.amount
  );
}

function applyCardReward(
  player,
  reward
) {
  const template =
    CARD_BY_CODE.get(
      normalizeCode(reward.code)
    );

  if (!template) {
    throw new Error(
      `Missing card: ${reward.code}`
    );
  }

  const cards = Array.isArray(
    player.cards
  )
    ? [...player.cards]
    : [];

  const existingIndex =
    cards.findIndex(
      (entry) =>
        normalizeCode(entry?.code) ===
        normalizeCode(template.code)
    );

  if (existingIndex < 0) {
    cards.push(
      createOwnedCard(template)
    );

    player.cards = cards;
    return;
  }

  player.fragments = addOrIncrease(
    player.fragments,
    {
      code: template.code,
      cardCode: template.code,
      sourceCode: template.code,
      name: template.name,
      rarity: "EV",
      category: "battle",
      image: template.image || "",
    },
    1
  );
}

function applyWeaponReward(
  player,
  reward
) {
  const template =
    WEAPON_BY_CODE.get(
      normalizeCode(reward.code)
    );

  if (!template) {
    throw new Error(
      `Missing weapon: ${reward.code}`
    );
  }

  player.weapons = addOrIncrease(
    player.weapons,
    {
      ...clone(template),
      upgradeLevel: 0,
    },
    reward.amount
  );
}

function applyMasteryReward(player,reward) {
  const cards = Array.isArray(
    player.cards
  )
    ? [...player.cards]
    : [];

  let index = cards.findIndex(
    (entry) =>
      normalizeCode(entry?.code) ===
      normalizeCode(reward.code)
  );

  if (index < 0) {
    const template =
      CARD_BY_CODE.get(
        normalizeCode(reward.code)
      );

    if (!template) {
      throw new Error(
        `Missing card: ${reward.code}`
      );
    }

    cards.push(
      createOwnedCard(template)
    );

    index = cards.length - 1;
  }

  const targetStage = Math.max(
    1,
    Math.min(
      3,
      Number(reward.stage || 1)
    )
  );

  const currentStage = Math.max(
    targetStage,
    Number(
      cards[index].evolutionStage ||
      1
    )
  );

  cards[index] = {
    ...cards[index],
    evolutionStage: currentStage,
    evolutionKey: `M${currentStage}`,
    rarity: "EV",
    currentTier: "EV",
    baseTier: "EV",
  };

  player.cards = cards;
}

function applyFruitReward(
  player,
  reward
) {
  const template =
    FRUIT_BY_CODE.get(
      normalizeCode(reward.code)
    );

  if (!template) {
    throw new Error(
      `Missing Fruit/Item: ${reward.code}`
    );
  }

  player.devilFruits =
    addOrIncrease(
      player.devilFruits,
      {
        ...clone(template),
      },
      reward.amount
    );
}

function applyFragmentReward(
  player,
  reward
) {
  const template =
    CARD_BY_CODE.get(
      normalizeCode(reward.code)
    );

  if (!template) {
    throw new Error(
      `Missing fragment source: ${reward.code}`
    );
  }

  player.fragments = addOrIncrease(
    player.fragments,
    {
      code: template.code,
      cardCode: template.code,
      sourceCode: template.code,
      name: template.name,

      rarity:
        template.rarity ||
        template.baseTier ||
        "S",

      category:
        template.cardRole === "boost"
          ? "boost"
          : "battle",

      image: template.image || "",
    },
    reward.amount
  );
}

function applyRewards(
  player,
  rewards
) {
  const next = {
    ...player,
  };

  for (const reward of rewards) {
    if (
      reward.type ===
        "cursed_energy"
    ) {
      next.cursedEnergy =
        Math.max(
          0,
          Number(
            next.cursedEnergy ||
            0
          )
        ) +
        Math.max(
          0,
          Math.floor(
            Number(
              reward.amount ||
              0
            )
          )
        );
    } else if (
      reward.type === "item"
    ) {
      applyItemReward(
        next,
        reward
      );
    } else if (
      reward.type === "card"
    ) {
      applyCardReward(
        next,
        reward
      );
    } else if (
      reward.type === "weapon"
    ) {
      applyWeaponReward(
        next,
        reward
      );
    } else if (
      reward.type === "fruit"
    ) {
      applyFruitReward(
        next,
        reward
      );
    } else if (
      reward.type === "mastery"
    ) {
      applyMasteryReward(
        next,
        reward
      );
    } else if (
      reward.type === "fragment"
    ) {
      applyFragmentReward(
        next,
        reward
      );
    }
  }

  return next;
}

function getPageDays(page) {
  const start =
    page *
    REWARDS_PER_PAGE;

  return DAYS.slice(
    start,
    start + REWARDS_PER_PAGE
  ).map(
    (config, index) => ({
      day:
        start +
        index +
        1,

      config,
    })
  );
}

function buildRewardLines(rewards) {
  return rewards
    .map(
      (reward) =>
        `${ARROW_EMOJI} ${getRewardEmoji(reward)} ${getRewardLabel(reward)}`
    )
    .join("\n");
}
function buildDayFields(
  player,
  day,
  config
) {
  const state =
    getEventState(player);

  const currentDay =
    getLatestUnlockedDay();

  const unlocked =
    EVENT_ENABLED &&
    (
      day <= currentDay ||
      state.premiumPlus
    );

  const freeClaimed =
    state.freeClaims.includes(
      day
    );

  const premiumClaimed =
    state.premiumClaims.includes(
      day
    );

  const freeStatus =
    freeClaimed
      ? " ✅"
      : "";

  const premiumStatus =
    premiumClaimed
      ? " ✅"
      : "";

  const lockedText =
    unlocked
      ? ""
      : "\n*Available on its scheduled date.*";

  const dateLabel =
    getRewardDateLabel(day);

  const freeValue = [
    `${CURSED_ENERGY_EMOJI} **FREE Halloween Rewards**${freeStatus}`,
    buildRewardLines(
      config.free
    ),
  ]
    .filter(Boolean)
    .join("\n");

  const premiumValue = [
    `${PREMIUM_BOX_EMOJI} **Premium Halloween Rewards**${premiumStatus}`,
    buildRewardLines(
      config.premium
    ),
  ]
    .filter(Boolean)
    .join("\n");

  const combinedValue = [
    freeValue,
    "",
    premiumValue,
    lockedText,
  ]
    .filter(Boolean)
    .join("\n");

  if (
    combinedValue.length <= 1024
  ) {
    return [
      {
        name:
          dateLabel,

        value:
          combinedValue,

        inline:
          true,
      },
    ];
  }

  return [
    {
      name:
        `${dateLabel} — Free`,

      value: [
        freeValue,
        lockedText,
      ]
        .filter(Boolean)
        .join("\n"),

      inline:
        true,
    },

    {
      name:
        `${dateLabel} — Premium`,

      value: [
        premiumValue,
        lockedText,
      ]
        .filter(Boolean)
        .join("\n"),

      inline:
        true,
    },
  ];
}

function buildEmbed(
  player,
  selectedPage,
  note = ""
) {
  const state =
    getEventState(player);

  const pageDays =
    getPageDays(
      selectedPage
    );

  return new EmbedBuilder()
    .setColor(0xf47c20)
    .setTitle(
      `${HALLOWEEN_EMOJI} Halloween Rewards`
    )
    .setDescription(
      [
        "Check in daily to claim Halloween rewards and unlock exclusive Event content!",
        state.premiumPlus
          ? `${SUKUNA_BOX_EMOJI} **Premium Pass Plus Active — All Dates Unlocked**`
          : state.premium
            ? `${SUKUNA_BOX_EMOJI} **Premium Pass Active**`
            : `${SUKUNA_BOX_EMOJI} **Premium Pass Not Active**`,
        note
          ? `\n${note}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .addFields(
      ...pageDays.flatMap(
        ({
          day,
          config,
        }) =>
          buildDayFields(
            player,
            day,
            config
          )
      )
    )
    .setFooter({
      text:
        `Halloween Rewards • Page ${selectedPage + 1}/${TOTAL_PAGES}`,
    });
}

function canClaimPage(
  player,
  selectedPage
) {
  if (!isEventActive()) {
    return false;
  }

  const state =
    getEventState(player);

  const currentDay =
    getLatestUnlockedDay();

  return getPageDays(
    selectedPage
  ).some(
    ({ day }) => {
      if (
        day > currentDay &&
        !state.premiumPlus
      ) {
        return false;
      }

      return (
        !state.freeClaims
          .includes(day) ||
        (
          state.premium &&
          !state.premiumClaims
            .includes(day)
        )
      );
    }
  );
}

function buildButtons(
  player,
  selectedPage
) {
  const claimable =
    canClaimPage(
      player,
      selectedPage
    );

  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          "halloween_previous"
        )
        .setLabel("Previous")
        .setStyle(
          ButtonStyle.Primary
        )
        .setDisabled(
          selectedPage <= 0
        ),

      new ButtonBuilder()
        .setCustomId(
          "halloween_claim"
        )
        .setLabel(
          claimable
            ? "Claim Reward"
            : "Claimed / Locked"
        )
        .setStyle(
          ButtonStyle.Success
        )
        .setDisabled(
          !claimable
        ),

      new ButtonBuilder()
        .setCustomId(
          "halloween_next"
        )
        .setLabel("Next")
        .setStyle(
          ButtonStyle.Primary
        )
        .setDisabled(
          selectedPage >=
            TOTAL_PAGES - 1
        )
    );
}

function parseTargetId(
  message,
  value
) {
  const mention =
    message.mentions
      ?.users
      ?.first();

  if (mention?.id) {
    return String(
      mention.id
    );
  }

  return String(
    value || ""
  ).replace(
    /\D/g,
    ""
  );
}

async function updatePremium(
  message,
  enabled,
  plus = false
) {
  if (
    !isUniversalAdmin(message)
  ) {
    return message.reply({
      content:
        "Owner only command.",

      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  if (
    enabled &&
    !isEventActive()
  ) {
    return message.reply({
      content:
        hasEventEnded()
          ? "The Halloween Event has ended. Premium can no longer be activated."
          : "The Halloween Event has not started.",

      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const targetId =
    parseTargetId(
      message,
      message.content
    );

  if (!targetId) {
    const commandName =
      plus
        ? enabled
          ? "premiumplus"
          : "unpremiumplus"
        : enabled
          ? "premium"
          : "unpremium";

    return message.reply({
      content:
        `Usage: \`op ${commandName} <@user/userId>\``,

      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  await updatePlayerAtomic(
    targetId,
    (fresh) => {
      const state =
        getEventState(fresh);

      const premiumPlus =
        enabled
          ? (
              plus ||
              state.premiumPlus
            )
          : false;

      return {
        ...fresh,

        events: {
          ...(fresh.events || {}),

          [EVENT_KEY]: {
            ...state,

            premium: enabled,
            premiumPlus,

            premiumUpdatedAt:
              Date.now(),

            premiumUpdatedBy:
              message.author.id,

            ...(enabled
              ? {
                  premiumActivatedAt:
                    Date.now(),

                  premiumPlusActivatedAt:
                    premiumPlus
                      ? Date.now()
                      : state
                          .premiumPlusActivatedAt ||
                        null,

                  premiumExpiredAt:
                    null,

                  premiumDisabledAt:
                    null,
                }
              : {
                  premiumDisabledAt:
                    Date.now(),

                  premiumPlusDisabledAt:
                    Date.now(),
                }),
          },
        },
      };
    },
    "Unknown"
  );

  const passName =
    plus
      ? "Premium Pass Plus"
      : "Premium";

  return message.reply({
    content:
      `${EVENT_NAME} ${passName} has been ` +
      `${enabled
        ? "activated"
        : "disabled"} ` +
      `for <@${targetId}>.`,

    allowedMentions: {
      repliedUser: false,
    },
  });
}

function parseBoxAmount(value) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return 1;
  }

  const amount = Math.floor(
    Number(value)
  );

  if (
    !Number.isFinite(amount) ||
    amount < 1
  ) {
    return 0;
  }

  return Math.min(
    MAX_BOX_PURCHASE,
    amount
  );
}

async function buyEventBoxes(
  message,
  amountValue
) {
  if (!isEventActive()) {
    return message.reply({
      content:
        hasEventEnded()
          ? "The Halloween Event has ended."
          : "The Halloween Event has not started.",

      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const amount =
    parseBoxAmount(
      amountValue
    );

  if (amount < 1) {
    return message.reply({
      content:
        "Usage: `op halloween box [amount]`",

      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const template =
    ITEM_BY_CODE.get(
      EVENT_BOX_CODE
    );

  if (!template) {
    return message.reply({
      content:
        "Sukuna Box is missing from items.js.",

      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const totalPrice =
    EVENT_BOX_PRICE *
    amount;

  let remainingEnergy = 0;

  try {
    await updatePlayerAtomic(
      message.author.id,

      (fresh) => {
        const currentEnergy =
          Math.max(
            0,
            Math.floor(
              Number(
                fresh.cursedEnergy ||
                0
              )
            )
          );

        if (
          currentEnergy <
          totalPrice
        ) {
          throw new Error(
            `You need ${totalPrice.toLocaleString(
              "en-US"
            )} Cursed Energy to buy ${amount} Sukuna Box.`
          );
        }

        remainingEnergy =
          currentEnergy -
          totalPrice;

        const boxReward =
          cloneItem(
            template,
            amount
          );

        return {
          ...fresh,

          cursedEnergy:
            remainingEnergy,

          boxes:
            addOrIncrease(
              fresh.boxes,
              boxReward,
              amount
            ),
        };
      },

      message.author.username
    );
  } catch (error) {
    return message.reply({
      content:
        `⚠️ ${
          error.message ||
          "Failed to exchange Cursed Energy."
        }`,

      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const energyEmoji =
    getItemEmoji(
      "cursed_energy"
    ) || "🌀";

  const boxEmoji =
    getItemEmoji(
      EVENT_BOX_CODE
    ) || "🎁";

  return message.reply({
    content:
      `${boxEmoji} You exchanged ` +
      `**${totalPrice.toLocaleString(
        "en-US"
      )}** ${energyEmoji} Cursed Energy ` +
      `for **${amount}x Sukuna Box**.\n` +
      `Remaining Cursed Energy: ` +
      `**${remainingEnergy.toLocaleString(
        "en-US"
      )}** ${energyEmoji}`,

    allowedMentions: {
      repliedUser: false,
    },
  });
}

async function claimAvailableRewards(
  message,
  selectedPage
) {
  let rewardLabels = [];

  await updatePlayerAtomic(
    message.author.id,
    (fresh) => {
      const state =
        getEventState(fresh);

      const currentDay =
        getLatestUnlockedDay();

      if (!isEventActive()) {
        throw new Error(
          hasEventEnded()
            ? "The Halloween Event has ended."
            : "The Halloween Event has not started."
        );
      }

      if (
        currentDay < 1 &&
        !state.premiumPlus
      ) {
        throw new Error(
          "The first reward date has not arrived."
        );
      }

      const pageDays =
        getPageDays(
          selectedPage
        ).filter(
          ({ day }) =>
            day <= currentDay ||
            state.premiumPlus
        );

      const rewards = [];

      const claimedFreeDays = [
        ...state.freeClaims,
      ];

      const claimedPremiumDays = [
        ...state.premiumClaims,
      ];

      for (
        const {
          day,
          config,
        } of pageDays
      ) {
        if (
          !claimedFreeDays
            .includes(day)
        ) {
          rewards.push(
            ...config.free
          );

          claimedFreeDays.push(
            day
          );

          rewardLabels.push(
            ...config.free.map(
              (reward) =>
                `${getRewardDateLabel(
                  day
                )} Free — ${getRewardLabel(
                  reward
                )}`
            )
          );
        }

        if (
          state.premium &&
          !claimedPremiumDays
            .includes(day)
        ) {
          rewards.push(
            ...config.premium
          );

          claimedPremiumDays.push(
            day
          );

          rewardLabels.push(
            ...config.premium.map(
              (reward) =>
                `${getRewardDateLabel(
                  day
                )} Premium — ${getRewardLabel(
                  reward
                )}`
            )
          );
        }
      }

      if (!rewards.length) {
        throw new Error(
          "There are no available rewards to claim on this page."
        );
      }

      const rewarded =
        applyRewards(
          fresh,
          rewards
        );

      return {
        ...rewarded,

        events: {
          ...(rewarded.events || {}),

          [EVENT_KEY]: {
            ...state,

            freeClaims:
              claimedFreeDays,

            premiumClaims:
              claimedPremiumDays,

            lastClaimedAt:
              Date.now(),
          },
        },
      };
    },
    message.author.username
  );

  return rewardLabels;
}

module.exports = {
  name: "halloween",

  aliases: [
    "premium",
    "unpremium",
    "premiumplus",
    "unpremiumplus",
  ],

  async execute(
    message,
    args = []
  ) {
    await ensureFragmentEmojiCache(
      message.client
    );

    const rawCommand =
      String(
        message.content || ""
      )
        .trim()
        .split(/\s+/);

    const usedCommand =
      String(
        rawCommand[1] || ""
      )
        .toLowerCase()
        .trim();

    const subcommand =
      String(
        args[0] || ""
      )
        .toLowerCase()
        .trim();

    if (
      usedCommand ===
      "unpremium"
    ) {
      return updatePremium(
        message,
        false
      );
    }

    if (
      usedCommand ===
      "premium"
    ) {
      return updatePremium(
        message,
        true
      );
    }

    if (!isEventActive()) {
      await resetExpiredPremium(
        message.author.id,
        message.author.username
      );

      return message.reply({
        content:
          hasEventEnded()
            ? "The Halloween Event has ended."
            : "The Halloween Event has not started.",

        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (
      subcommand === "box"
    ) {
      return buyEventBoxes(
        message,
        args[1]
      );
    }

    if (
      subcommand ===
      "premiumplus"
    ) {
      return updatePremium(
        message,
        true,
        true
      );
    }

    if (
      subcommand ===
      "unpremiumplus"
    ) {
      return updatePremium(
        message,
        false,
        true
      );
    }

    if (
      subcommand === "premium"
    ) {
      return updatePremium(
        message,
        true
      );
    }

    if (
      usedCommand ===
      "unpremiumplus"
    ) {
      return updatePremium(
        message,
        false,
        true
      );
    }

    if (
      usedCommand ===
      "premiumplus"
    ) {
      return updatePremium(
        message,
        true,
        true
      );
    }

    if (
      subcommand === "unpremium"
    ) {
      return updatePremium(
        message,
        false
      );
    }

    let selectedPage = 0;

    let player =
      getPlayer(
        message.author.id,
        message.author.username
      );

    const sent =
      await message.reply({
        embeds: [
          buildEmbed(
            player,
            selectedPage
          ),
        ],

        components: [
          buildButtons(
            player,
            selectedPage
          ),
        ],

        allowedMentions: {
          repliedUser: false,
        },
      });

    const collector =
      sent.createMessageComponentCollector({
        time: 120000,
      });

    collector.on(
      "collect",
      async (
        interaction
      ) => {
        if (
          interaction.user.id !==
          message.author.id
        ) {
          return interaction.reply({
            content:
              "This is not your event reward panel.",

            ephemeral: true,
          });
        }

        let note = "";

        try {
          if (
            interaction.customId ===
            "halloween_previous"
          ) {
            selectedPage = Math.max(
              0,
              selectedPage - 1
            );
          } else if (
            interaction.customId ===
            "halloween_next"
          ) {
            selectedPage = Math.min(
              TOTAL_PAGES - 1,
              selectedPage + 1
            );
          } else if (
            interaction.customId ===
            "halloween_claim"
          ) {
            const labels =
              await claimAvailableRewards(
                message,
                selectedPage
              );

            note =
              `✅ Rewards claimed:\n` +
              labels
                .map(
                  (label) =>
                    `• ${label}`
                )
                .join("\n");
          }
        } catch (error) {
          note =
            `⚠️ ${
              error.message ||
              "Failed to claim reward."
            }`;
        }

        player = getPlayer(
          message.author.id,
          message.author.username
        );

        return interaction.update({
          embeds: [
            buildEmbed(
              player,
              selectedPage,
              note
            ),
          ],

          components: [
            buildButtons(
              player,
              selectedPage
            ),
          ],
        });
      }
    );

    collector.on(
      "end",
      async () => {
        try {
          await sent.edit({
            components: [],
          });
        } catch (error) {
          // Message deleted
          // or no longer editable.
        }
      }
    );
  },
};