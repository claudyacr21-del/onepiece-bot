const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const {
  readPlayers,
  updatePlayerAtomic,
} = require("../playerStore");

const {
  hydrateCard,
} = require("../utils/evolution");

const {
  isMergeCard,
  buildMergedCard,
} = require("../utils/mergeCards");

const {
  getPassiveBoostSummary,
} = require("../utils/passiveBoosts");

const {
  applyCustomSkinToCard,
} = require("../utils/customSkins");

const {
  getPremiumTier,
} = require("../utils/premiumAccess");

const { ITEMS } = require("../data/items");

const {
  getItemEmoji,
} = require("../config/itemEmojis");

const {
  renderUnitBlock,
} = require("../utils/battleUi");

const COLORS = {
  blue: 0x3498db,
  green: 0x2ecc71,
  gold: 0xf1c40f,
  red: 0xe74c3c,
};

const envCooldown = Number(
  process.env.EXPEDITION_COOLDOWN_MS
);

const EXPEDITION_COOLDOWN =
  Number.isFinite(envCooldown) &&
  envCooldown >= 0
    ? envCooldown
    : 24 * 60 * 60 * 1000;

const ENTRY_COST = {
  cola_engine_part: 200,
  iron_plating: 200,
  enhancement_stone: 3000,
  hardwood: 200,
  sail_cloth: 30,
};

const MAX_ROUNDS = 10;

const BATTLE_HP_MULTIPLIER =
  2;

const PREMIUM_EXPEDITION_PERKS = {
  normal: {
    label: "Normal",
    statMultiplier: 1,
    rewardMultiplier: 1,
    mythicBonus: 0,

    // Dangerous Stage 5 is intentionally
    // difficult for non-premium players.
    dangerousFinalEnemyMultiplier:
      1.08,
  },

  vivreCard: {
    label: "Vivre Card",
    statMultiplier: 1.05,
    rewardMultiplier: 1.25,
    mythicBonus: 0.05,

    // Vivre Card keeps a moderate
    // advantage in the final encounter.
    dangerousFinalEnemyMultiplier:
      1.03,
  },

  motherFlame: {
    label: "Mother Flame",
    statMultiplier: 1.1,
    rewardMultiplier: 1.5,
    mythicBonus: 0.1,

    // Mother Flame receives the strongest
    // advantage in the final encounter.
    dangerousFinalEnemyMultiplier:
      1,
  },
};

function getExpeditionPerk(
  premiumTier
) {
  return (
    PREMIUM_EXPEDITION_PERKS[
      premiumTier
    ] ||
    PREMIUM_EXPEDITION_PERKS
      .normal
  );
}

function getScaledExpeditionReward(
  reward,
  premiumTier
) {
  const premiumPerk =
    getExpeditionPerk(
      premiumTier
    );

  const multiplier =
    Math.max(
      1,
      Number(
        premiumPerk
          .rewardMultiplier || 1
      )
    );

  return {
    ...reward,

    berries: Math.max(
      0,
      Math.floor(
        Number(
          reward?.berries || 0
        ) * multiplier
      )
    ),

    gems: Math.max(
      0,
      Math.floor(
        Number(
          reward?.gems || 0
        ) * multiplier
      )
    ),

    items: (
      reward?.items || []
    ).map(
      ([code, amount]) => [
        code,
        Math.max(
          1,
          Math.floor(
            Number(amount || 0) *
              multiplier
          )
        ),
      ]
    ),
  };
}

const STAGES = {
  1: {
    name: "Pirate Ambush",
    enemies: [
      "Pirate Captain",
      "Pirate Swordsman",
      "Pirate Gunner",
    ],

    // Beginner encounter
    hp: [0.9, 0.96],
    atk: [0.82, 0.9],
    spd: [0.96, 1.01],
    firstPowerRound: [2, 3],
    powerGap: [3, 4],
    powerMultiplier: 1.85,

    reward: {
      berries: 25000,
      gems: 160,
      items: [
        ["basic_resource_box", 5],
      ],
    },
  },

  2: {
    name: "Grand Line Hazard",
    enemies: [
      "Marine Officer",
      "Sea Beast",
      "Rival Pirate",
    ],

    // Enemies begin approaching player stats
    hp: [0.94, 1],
    atk: [0.86, 0.94],
    spd: [0.97, 1.02],
    firstPowerRound: [2, 3],
    powerGap: [3, 4],
    powerMultiplier: 1.9,

    reward: {
      berries: 35000,
      gems: 240,
      items: [
        ["basic_resource_box", 10],
        ["tl_common_raid_ticket", 1],
      ],
    },
  },

  3: {
    name: "Rival Crew",
    enemies: [
      "Rival Captain",
      "Rival Fighter",
      "Rival Tactician",
    ],

    // Equal-team encounter
    hp: [0.98, 1.04],
    atk: [0.9, 0.98],
    spd: [0.98, 1.03],
    firstPowerRound: [2, 3],
    powerGap: [3, 4],
    powerMultiplier: 1.95,

    reward: {
      berries: 50000,
      gems: 360,
      items: [
        ["rare_resource_box", 10],
        ["pull_reset_ticket", 1],
      ],
    },
  },

  4: {
    routes: {
      safe: {
        name: "Safe Route",
        enemies: [
          "Marine Scout",
          "Grand Line Hunter",
          "Route Guardian",
        ],

        hp: [1, 1.06],
        atk: [0.92, 1],
        spd: [0.99, 1.04],
        firstPowerRound: [2, 3],
        powerGap: [3, 4],
        powerMultiplier: 2,

        reward: {
          berries: 75000,
          gems: 480,
          items: [
            ["elite_resource_box", 3],
            ["tl_raid_ticket", 2],
          ],
        },
      },

      dangerous: {
        name: "Dangerous Route",
        enemies: [
          "Elite Marauder",
          "New World Hunter",
          "Route Executioner",
        ],

        hp: [1.03, 1.09],
        atk: [0.95, 1.03],
        spd: [1, 1.05],
        firstPowerRound: [2, 3],
        powerGap: [3, 4],
        powerMultiplier: 2.05,

        reward: {
          berries: 100000,
          gems: 600,
          items: [
            ["elite_resource_box", 2],
            ["legend_resource_box", 2],
            ["pull_reset_ticket", 2],
          ],
        },
      },
    },
  },

  5: {
    routes: {
      safe: {
        name: "Safe Final Boss",
        enemies: [
          "Final Boss",
          "Boss Vanguard",
          "Boss Guardian",
        ],

        hp: [1.05, 1.11],
        atk: [0.97, 1.05],
        spd: [1, 1.05],
        firstPowerRound: [2, 3],
        powerGap: [3, 4],
        powerMultiplier: 2.1,

        reward: {
          berries: 150000,
          gems: 720,
          items: [
            ["elite_resource_box", 3],
            ["legend_resource_box", 3],
            ["tl_gold_raid_ticket", 1],
            ["pull_reset_ticket", 2],
          ],
        },
      },

      dangerous: {
        name: "Dangerous Final Boss",
        enemies: [
          "Abyssal Captain",
          "Abyssal Vanguard",
          "Abyssal Guardian",
        ],

        // Highest base stats in Expedition.
        // Final difficulty is adjusted by premium tier.
        hp: [1.1, 1.16],
        atk: [1.02, 1.1],
        spd: [1.045, 1.1],
        firstPowerRound: [2, 3],
        powerGap: [3, 4],
        powerMultiplier: 2,

        reward: {
          berries: 250000,
          gems: 880,
          items: [
            ["legend_resource_box", 3],
            ["tl_gold_raid_ticket", 2],
            ["pull_reset_ticket", 3],
          ],
          mythic: 0.1,
        },
      },
    },
  },
};

const BOX_CODES = new Set([
  "basic_resource_box",
  "rare_resource_box",
  "elite_resource_box",
  "legend_resource_box",
]);

const TICKET_CODES = new Set([
  "tl_common_raid_ticket",
  "tl_raid_ticket",
  "tl_gold_raid_ticket",
  "tl_mythic_raid_ticket",
  "pull_reset_ticket",
]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const ITEM_MAP = new Map(
  Object.values(ITEMS || {}).map((item) => [
    normalize(item?.code),
    item,
  ])
);

function clone(value) {
  return value && typeof value === "object"
    ? JSON.parse(JSON.stringify(value))
    : value;
}

function formatNumber(value) {
  return Math.floor(
    Number(value || 0)
  ).toLocaleString("en-US");
}

function randomBetween(min, max) {
  return (
    min +
    Math.random() *
      Math.max(0, max - min)
  );
}

function randomInteger(
  min,
  max
) {
  const minimum = Math.ceil(
    Number(min || 0)
  );

  const maximum = Math.floor(
    Number(max || minimum)
  );

  return Math.floor(
    Math.random() *
      (
        maximum -
        minimum +
        1
      )
  ) + minimum;
}

function icon(code) {
  return (
    getItemEmoji(
      normalize(code)
    ) || ""
  );
}

function firstPositive(...values) {
  for (const value of values) {
    if (Number(value) > 0) {
      return Number(value);
    }
  }

  return 1;
}

function getAttack(card) {
  return Math.floor(
    isMergeCard(card)
      ? firstPositive(
          card?.finalAtk,
          card?.combatAtk,
          card?.displayAtk,
          card?.atk,
          card?.baseAtk
        )
      : firstPositive(
          card?.atk,
          card?.displayAtk,
          card?.combatAtk,
          card?.attack,
          card?.currentAtk,
          card?.baseAtk
        )
  );
}

function getHealth(card) {
  return Math.floor(
    isMergeCard(card)
      ? firstPositive(
          card?.finalHp,
          card?.combatHp,
          card?.displayHp,
          card?.hp,
          card?.baseHp
        )
      : firstPositive(
          card?.hp,
          card?.displayHp,
          card?.combatHp,
          card?.maxHp,
          card?.health,
          card?.currentHp,
          card?.baseHp
        )
  );
}

function getSpeed(card) {
  return Math.floor(
    isMergeCard(card)
      ? firstPositive(
          card?.finalSpeed,
          card?.combatSpeed,
          card?.displaySpeed,
          card?.speed,
          card?.spd,
          card?.baseSpeed
        )
      : firstPositive(
          card?.speed,
          card?.spd,
          card?.displaySpeed,
          card?.combatSpeed,
          card?.baseSpeed
        )
  );
}

function getCardName(card) {
  return String(
    card?.skinName ||
      card?.displayName ||
      card?.name ||
      card?.code ||
      "Card"
  );
}

function getItemData(code) {
  const key = normalize(code);
  const existing = ITEM_MAP.get(key);

  if (existing) {
    return clone(existing);
  }

  const names = {
    tl_common_raid_ticket:
      "Common Raid Ticket (TL)",
    tl_raid_ticket:
      "Raid Ticket (TL)",
    tl_gold_raid_ticket:
      "Gold Raid Ticket (TL)",
    tl_mythic_raid_ticket:
      "Mythic Raid Ticket (TL)",
    pull_reset_ticket:
      "Pull Reset Ticket",
  };

  return {
    code: key,
    name:
      names[key] ||
      key
        .replace(/_/g, " ")
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        ),
    type: BOX_CODES.has(key)
      ? "Box"
      : TICKET_CODES.has(key)
        ? "Ticket"
        : "Item",
    tradeable: key.startsWith("tl_")
      ? false
      : undefined,
    untradeable: key.startsWith("tl_")
      ? true
      : undefined,
    tradeLocked: key.startsWith("tl_")
      ? true
      : undefined,
  };
}

function getPlayer(userId) {
  return (
    readPlayers()[
      String(userId)
    ] || null
  );
}

function getExpedition(userId) {
  return (
    getPlayer(userId)
      ?.expedition || null
  );
}

function getStage(run) {
  const stage =
    STAGES[
      Number(run?.currentStage)
    ];

  if (!stage) {
    return null;
  }

  if (stage.routes) {
    return (
      stage.routes[
        run?.route
      ] || null
    );
  }

  return stage;
}

function formatDuration(ms) {
  const seconds = Math.max(
    0,
    Math.ceil(ms / 1000)
  );

  const hours = Math.floor(
    seconds / 3600
  );

  const minutes = Math.floor(
    (seconds % 3600) / 60
  );

  if (hours) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes) {
    return `${minutes}m ${
      seconds % 60
    }s`;
  }

  return `${seconds}s`;
}

function errorResponse(text) {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.red)
        .setTitle("Expedition")
        .setDescription(text),
    ],
    components: [],
    allowedMentions: {
      repliedUser: false,
    },
  };
}

function createTeamSnapshot(player) {
  const slots = Array.isArray(
    player?.team?.slots
  )
    ? player.team.slots.slice(0, 3)
    : [];

  const cards = Array.isArray(
    player?.cards
  )
    ? player.cards
    : [];

  const passive =
    getPassiveBoostSummary(
      player || {}
    );

  return slots
    .map((instanceId, index) => {
      if (!instanceId) {
        return null;
      }

      const ownedCard =
        cards.find(
          (card) =>
            String(
              card?.instanceId || ""
            ) ===
            String(instanceId)
        ) || null;

      if (!ownedCard) {
        return null;
      }

      if (
        normalize(
          ownedCard.cardRole ||
            "battle"
        ) !== "battle"
      ) {
        return null;
      }

      const syncedCard =
        isMergeCard(ownedCard)
          ? buildMergedCard(
              player,
              ownedCard
            ) || ownedCard
          : hydrateCard(
              ownedCard
            ) || ownedCard;

      const baseAttack =
        Math.max(
          1,
          getAttack(
            syncedCard
          )
        );

      const baseHealth =
        Math.max(
          1,
          getHealth(
            syncedCard
          )
        );

      const baseSpeed =
        Math.max(
          1,
          getSpeed(
            syncedCard
          )
        );

      const finalAttack =
        Math.max(
          1,
          Math.floor(
            baseAttack *
              (
                1 +
                Number(
                  passive.atk || 0
                ) /
                  100
              )
          )
        );

      const finalHealth =
        Math.max(
          1,
          Math.floor(
            baseHealth *
              (
                1 +
                Number(
                  passive.hp || 0
                ) /
                  100
              )
          )
        );

      const finalSpeed =
        Math.max(
          1,
          Math.floor(
            baseSpeed *
              (
                1 +
                Number(
                  passive.spd || 0
                ) /
                  100
              )
          )
        );

      const skinCard =
        applyCustomSkinToCard(
          player,
          ownedCard
        );

      const hasCustomSkin =
        Boolean(
          skinCard?.hasCustomSkin
        );

      return {
        index,

        instanceId: String(
          ownedCard.instanceId ||
            ""
        ),

        code: String(
          syncedCard.code ||
            ownedCard.code ||
            ""
        ),

        name: hasCustomSkin
          ? (
              skinCard.displayName ||
              skinCard.skinTitle ||
              getCardName(
                syncedCard
              )
            )
          : getCardName(
              syncedCard
            ),

        originalName:
          getCardName(
            syncedCard
          ),

        image: hasCustomSkin
          ? (
              skinCard.skinImage ||
              skinCard.image ||
              syncedCard.image ||
              ""
            )
          : (
              syncedCard.image ||
              ownedCard.image ||
              ""
            ),

        skinTitle:
          hasCustomSkin
            ? String(
                skinCard.skinTitle ||
                  ""
              )
            : "",

        hasCustomSkin,

        atk: finalAttack,
        hp: finalHealth,
        spd: finalSpeed,

        dmg: Math.max(
          0,
          Number(
            passive.dmg || 0
          )
        ),
      };
    })
    .filter(Boolean);
}

function getAmount(
  player,
  code
) {
  const key = normalize(code);

  return [
    player?.materials,
    player?.items,
  ]
    .filter(Array.isArray)
    .flat()
    .reduce(
      (total, item) => {
        const itemCode =
          normalize(
            item?.code ||
              item?.name
          );

        if (itemCode !== key) {
          return total;
        }

        return (
          total +
          Math.max(
            0,
            Math.floor(
              Number(
                item?.amount || 0
              )
            )
          )
        );
      },
      0
    );
}

function removeFromList(
  list,
  code,
  wanted
) {
  const output =
    Array.isArray(list)
      ? clone(list)
      : [];

  const key = normalize(code);
  let remaining = wanted;

  for (const item of output) {
    if (remaining <= 0) {
      break;
    }

    if (
      normalize(
        item?.code ||
          item?.name
      ) !== key
    ) {
      continue;
    }

    const amount = Math.max(
      0,
      Math.floor(
        Number(
          item.amount || 0
        )
      )
    );

    const used = Math.min(
      amount,
      remaining
    );

    item.amount =
      amount - used;

    remaining -= used;
  }

  return {
    list: output.filter(
      (item) =>
        Number(
          item?.amount || 0
        ) > 0
    ),
    remaining,
  };
}

function consumeEntryCost(player) {
  let materials = clone(
    player.materials || []
  );

  let items = clone(
    player.items || []
  );

  for (
    const [code, cost]
    of Object.entries(
      ENTRY_COST
    )
  ) {
    let result =
      removeFromList(
        materials,
        code,
        cost
      );

    materials = result.list;

    if (result.remaining) {
      result =
        removeFromList(
          items,
          code,
          result.remaining
        );

      items = result.list;
    }

    if (result.remaining) {
      throw new Error(
        `Not enough ${
          getItemData(code).name
        }.`
      );
    }
  }

  return {
    materials,
    items,
  };
}

function addToList(
  list,
  code,
  amount
) {
  const output =
    Array.isArray(list)
      ? clone(list)
      : [];

  const data =
    getItemData(code);

  const key =
    normalize(code);

  const index =
    output.findIndex(
      (item) =>
        normalize(
          item?.code ||
            item?.name
        ) === key
    );

  if (index < 0) {
    output.push({
      ...data,
      code: key,
      amount,
    });
  } else {
    output[index] = {
      ...output[index],
      ...data,
      code: key,
      amount:
        Math.max(
          0,
          Math.floor(
            Number(
              output[index]
                .amount || 0
            )
          )
        ) + amount,
    };
  }

  return output;
}

function getRewardLines(
  reward,
  receivedMythic = false
) {
  const lines = [
    `${icon("berries")} ${formatNumber(
      reward.berries
    )} Berries`,
    `${icon("gems")} ${formatNumber(
      reward.gems
    )} Gems`,
  ];

  for (
    const [code, amount]
    of reward.items || []
  ) {
    lines.push(
      `${icon(code)} ${amount}x ${
        getItemData(code).name
      }`.trim()
    );
  }

  if (receivedMythic) {
    lines.push(
      `${icon(
        "tl_mythic_raid_ticket"
      )} 1x Mythic Raid Ticket (TL)`
    );
  }

  return lines;
}

function startExpedition(
  userId,
  username,
  team,
  premiumTier
) {
  let result = {
    ok: false,
    message:
      "Player data changed. Try again.",
  };

  updatePlayerAtomic(
    userId,
    (player) => {
      if (!player) {
        return player;
      }

      if (
        player?.expedition
          ?.status === "active"
      ) {
        result.message =
          "You already have an active expedition.";

        return player;
      }

      if (
        Number(
          player?.expedition
            ?.cooldownUntil || 0
        ) > Date.now()
      ) {
        result.message =
          "Your expedition is still on cooldown.";

        return player;
      }

      for (
        const [code, cost]
        of Object.entries(
          ENTRY_COST
        )
      ) {
        if (
          getAmount(
            player,
            code
          ) < cost
        ) {
          result.message =
            `Not enough ${
              getItemData(code)
                .name
            }.`;

          return player;
        }
      }

      const paid =
        consumeEntryCost(
          player
        );

      const startedAt =
        Date.now();

      const expedition = {
        runId:
          `${startedAt}_${userId}_` +
          Math.random()
            .toString(36)
            .slice(2, 7),
        status: "active",

        premiumTier:
          PREMIUM_EXPEDITION_PERKS[
            premiumTier
          ]
            ? premiumTier
            : "normal",

        currentStage: 1,
        route: null,
        teamSnapshot:
          clone(team),
        battleState: null,
        clearedStages: [],
        rewardedStages: [],
        startedAt,
        cooldownUntil:
          startedAt +
          EXPEDITION_COOLDOWN,
        completedAt: 0,
        endedAt: 0,
      };

      result = {
        ok: true,
        expedition,
      };

      return {
        ...player,
        username:
          username ||
          player.username,
        materials:
          paid.materials,
        items: paid.items,
        expedition,
      };
    }
  );

  return result;
}

function setExpeditionRoute(
  userId,
  runId,
  route
) {
  let success = false;

  updatePlayerAtomic(
    userId,
    (player) => {
      const expedition =
        player?.expedition;

      if (
        !expedition ||
        expedition.status !==
          "active" ||
        expedition.runId !==
          runId ||
        Number(
          expedition.currentStage
        ) !== 4 ||
        expedition.route
      ) {
        return player;
      }

      success = true;

      return {
        ...player,
        expedition: {
          ...expedition,
          route,
        },
      };
    }
  );

  return success;
}

function finishStage(
  userId,
  oldRun,
  config
) {
  let result = {
    ok: false,
    completed: false,
    mythic: false,
  };

  updatePlayerAtomic(
    userId,
    (player) => {
      const expedition =
        player?.expedition;

      const rewardedStages =
        expedition
          ?.rewardedStages ||
        [];

      const stageNumber =
        Number(
          oldRun.currentStage
        );

      if (
        !expedition ||
        expedition.status !==
          "active" ||
        expedition.runId !==
          oldRun.runId ||
        Number(
          expedition.currentStage
        ) !== stageNumber ||
        rewardedStages.includes(
          stageNumber
        )
      ) {
        return player;
      }

      let boxes = clone(
        player.boxes || []
      );

      let tickets = clone(
        player.tickets || []
      );

      let items = clone(
        player.items || []
      );

      const scaledReward =
        getScaledExpeditionReward(
          config.reward,
          expedition.premiumTier
        );

      for (
        const [code, amount]
        of scaledReward
          .items || []
      ) {
        if (
          BOX_CODES.has(code)
        ) {
          boxes = addToList(
            boxes,
            code,
            amount
          );
        } else if (
          TICKET_CODES.has(
            code
          )
        ) {
          tickets = addToList(
            tickets,
            code,
            amount
          );
        } else {
          items = addToList(
            items,
            code,
            amount
          );
        }
      }

      const premiumPerk =
        getExpeditionPerk(
          expedition.premiumTier
        );

      const baseMythicChance =
        Math.max(
          0,
          Number(
            scaledReward
              .mythic || 0
          )
        );

      const mythicChance =
        Math.min(
          1,
          baseMythicChance +
            Number(
              premiumPerk
                .mythicBonus || 0
            )
        );

      const receivedMythic =
        stageNumber === 5 &&
        expedition.route ===
          "dangerous" &&
        Math.random() <
          mythicChance;

      if (receivedMythic) {
        tickets = addToList(
          tickets,
          "tl_mythic_raid_ticket",
          1
        );
      }

      const completed =
        stageNumber === 5;

      result = {
        ok: true,
        completed,
        mythic:
          receivedMythic,
        reward:
          scaledReward,
      };

      return {
        ...player,
        berries:
          Math.max(
            0,
            Math.floor(
              Number(
                player.berries || 0
              )
            )
          ) +
          scaledReward.berries,
        gems:
          Math.max(
            0,
            Math.floor(
              Number(
                player.gems || 0
              )
            )
          ) +
          scaledReward.gems,
        boxes,
        tickets,
        items,
        expedition: {
          ...expedition,
          status: completed
            ? "completed"
            : "active",
          currentStage:
            completed
              ? 5
              : stageNumber + 1,
          battleState: null,
          clearedStages: [
            ...new Set([
              ...(expedition
                .clearedStages ||
                []),
              stageNumber,
            ]),
          ],
          rewardedStages: [
            ...new Set([
              ...rewardedStages,
              stageNumber,
            ]),
          ],
          completedAt:
            completed
              ? Date.now()
              : 0,
        },
      };
    }
  );

  return result;
}

function endExpedition(
  userId,
  runId,
  status,
  failedStage = null
) {
  updatePlayerAtomic(
    userId,
    (player) => {
      const expedition =
        player?.expedition;

      if (
        !expedition ||
        expedition.status !==
          "active" ||
        expedition.runId !==
          runId
      ) {
        return player;
      }

      return {
        ...player,
        expedition: {
          ...expedition,
          status,
          failedStage,
          endedAt: Date.now(),
        },
      };
    }
  );
}

function scaleStat(
  value,
  range
) {
  return Math.max(
    1,
    Math.floor(
      value *
        randomBetween(
          range[0],
          range[1]
        )
    )
  );
}

function living(units) {
  return units.filter(
    (unit) =>
      unit.hp > 0
  );
}

function chooseTarget(
  attacker,
  opponents
) {
  const available =
    living(opponents);

  if (!available.length) {
    return null;
  }

  const samePosition =
    available.find(
      (unit) =>
        unit.index ===
        attacker.index
    );

  if (samePosition) {
    return samePosition;
  }

  return available.sort(
    (a, b) =>
      a.hp - b.hp ||
      b.spd - a.spd
  )[0];
}

function calculateDamage(
  unit,
  multiplier = 1
) {
  return Math.max(
    1,
    Math.floor(
      randomBetween(
        unit.atk * 0.85,
        unit.atk * 1.15 + 1
      ) *
        (1 +
          Number(
            unit.dmg || 0
          ) /
            100) *
        multiplier
    )
  );
}

function createBattleState(
  expedition,
  config
) {
  const premiumPerk =
    getExpeditionPerk(
      expedition.premiumTier
    );

  const statMultiplier =
    Math.max(
      1,
      Number(
        premiumPerk
          .statMultiplier || 1
      )
    );

  const isDangerousFinal =
    Number(
      expedition.currentStage
    ) === 5 &&
    expedition.route ===
      "dangerous";

  const enemyStatMultiplier =
    isDangerousFinal
      ? Math.max(
          0.5,
          Number(
            premiumPerk
              .dangerousFinalEnemyMultiplier ||
              1
          )
        )
      : 1;

  return {
    stage: Number(
      expedition.currentStage
    ),
    round: 0,
    skillReadyRound: 1,
    guardReadyRound: 1,
    enemyPowerReady: false,

    nextPowerRound:
      randomInteger(
        Array.isArray(
          config.firstPowerRound
        )
          ? config
              .firstPowerRound[0]
          : 2,

        Array.isArray(
          config.firstPowerRound
        )
          ? config
              .firstPowerRound[1]
          : 3
      ),

    powerGap:
      Array.isArray(
        config.powerGap
      )
        ? [
            Math.max(
              3,
              Number(
                config.powerGap[0] ||
                  3
              )
            ),

            Math.max(
              3,
              Number(
                config.powerGap[1] ||
                  4
              )
            ),
          ]
        : [3, 4],

    powerMultiplier: Math.max(
      1,
      Number(
        config.powerMultiplier ||
          1.5
      )
    ),

    lastAction: null,
    logs: [],

    heroes:
      expedition.teamSnapshot.map(
        (card, index) => {
          const boostedAttack =
            Math.max(
              1,
              Math.floor(
                Number(
                  card.atk || 1
                ) *
                  statMultiplier
              )
            );

          const boostedHealth =
            Math.max(
              1,
              Math.floor(
                Number(
                  card.hp || 1
                ) *
                  statMultiplier *
                  BATTLE_HP_MULTIPLIER
              )
            );

          const boostedSpeed =
            Math.max(
              1,
              Math.floor(
                Number(
                  card.spd || 1
                ) *
                  statMultiplier
              )
            );

          return {
            side: "player",
            index,

            name:
              card.name ||
              card.originalName ||
              card.code ||
              "Card",

            originalName:
              card.originalName ||
              card.name ||
              "",

            image:
              card.image || "",

            skinTitle:
              card.skinTitle || "",

            hasCustomSkin:
              Boolean(
                card.hasCustomSkin
              ),

            atk:
              boostedAttack,

            maxHp:
              boostedHealth,

            hp:
              boostedHealth,

            spd:
              boostedSpeed,

            dmg: Math.max(
              0,
              Number(
                card.dmg || 0
              )
            ),
          };
        }
      ),

    enemies:
      expedition.teamSnapshot.map(
        (card, index) => {
          const enemyBaseAttack =
            Math.max(
              1,
              Number(
                card.atk || 1
              ) *
                enemyStatMultiplier
            );

          const enemyBaseHealth =
            Math.max(
              1,
              Number(
                card.hp || 1
              ) *
                enemyStatMultiplier *
                BATTLE_HP_MULTIPLIER
            );

          const enemyBaseSpeed =
            Math.max(
              1,
              Number(
                card.spd || 1
              ) *
                enemyStatMultiplier
            );

          const hp =
            scaleStat(
              enemyBaseHealth,
              config.hp
            );

          return {
            side: "enemy",
            index,

            name:
              config.enemies[
                index
              ],

            atk: scaleStat(
              enemyBaseAttack,
              config.atk
            ),

            maxHp: hp,
            hp,

            spd: scaleStat(
              enemyBaseSpeed,
              config.spd
            ),

            dmg: 0,
          };
        }
      ),
  };
}

function getBattleStatus(
  battle
) {
  if (
    !living(
      battle.enemies
    ).length &&
    living(
      battle.heroes
    ).length
  ) {
    return "victory";
  }

  if (
    !living(
      battle.heroes
    ).length ||
    Number(
      battle.round
    ) >= MAX_ROUNDS
  ) {
    return "defeat";
  }

  return "active";
}

function processRound(
  input,
  action
) {
  const battle =
    clone(input);

  const nextRound =
    Number(
      battle.round || 0
    ) + 1;

  const guarding =
    action === "guard";

  const usingSkill =
    action === "skill";

  if (
    usingSkill &&
    nextRound <
      Number(
        battle.skillReadyRound ||
          1
      )
  ) {
    return {
      ok: false,
      message:
        `Skill will be ready on Round ${
          battle.skillReadyRound
        }.`,
      state: battle,
    };
  }

  if (
    guarding &&
    nextRound <
      Number(
        battle.guardReadyRound ||
          1
      )
  ) {
    return {
      ok: false,
      message:
        `Guard will be ready on Round ${
          battle.guardReadyRound
        }.`,
      state: battle,
    };
  }

  const powerfulAttack =
    Boolean(
      battle.enemyPowerReady
    );

  const roundLogs = [];

  const turnOrder = [
    ...living(
      battle.heroes
    ),
    ...living(
      battle.enemies
    ),
  ].sort(
    (a, b) =>
      b.spd - a.spd ||
      (
        a.side === b.side
          ? a.index - b.index
          : a.side === "player"
            ? -1
            : 1
      )
  );

  for (
    const actor
    of turnOrder
  ) {
    if (actor.hp <= 0) {
      continue;
    }

    const target =
      chooseTarget(
        actor,
        actor.side ===
          "player"
          ? battle.enemies
          : battle.heroes
      );

    if (!target) {
      break;
    }

    let multiplier = 1;

    if (
      actor.side ===
      "player"
    ) {
      if (usingSkill) {
        multiplier *= 1.35;
      }

      if (guarding) {
        multiplier *= 0.8;
      }
    } else {
      if (powerfulAttack) {
        multiplier *=
          Math.max(
            1,
            Number(
              battle
                .powerMultiplier ||
                1.5
            )
          );
      }

      if (guarding) {
        multiplier *= 0.6;
      }
    }

    const damage = Math.min(
      target.hp,
      calculateDamage(
        actor,
        multiplier
      )
    );

    target.hp = Math.max(
      0,
      target.hp - damage
    );

    roundLogs.push(
      `${
        actor.side ===
        "player"
          ? "⚔️"
          : "💥"
      } ${actor.name} dealt **${formatNumber(
        damage
      )}** to ${target.name}.`
    );

    if (!target.hp) {
      roundLogs.push(
        `💀 ${target.name} was defeated.`
      );
    }
  }

  battle.round =
    nextRound;

  battle.lastAction =
    action;

  battle.enemyPowerReady =
    false;

  if (usingSkill) {
    battle.skillReadyRound =
      nextRound + 3;
  }

  if (guarding) {
    battle.guardReadyRound =
      nextRound + 3;
  }

  if (powerfulAttack) {
    const gap =
      Array.isArray(
        battle.powerGap
      )
        ? battle.powerGap
        : [3, 4];

    battle.nextPowerRound =
      nextRound +
      randomInteger(
        Math.max(
          3,
          Number(
            gap[0] || 3
          )
        ),

        Math.max(
          3,
          Number(
            gap[1] || 4
          )
        )
      );
  }

  const upcomingRound =
    nextRound + 1;

  battle.enemyPowerReady =
    getBattleStatus(
      battle
    ) === "active" &&
    upcomingRound ===
      Number(
        battle.nextPowerRound
      );

  if (
    battle.enemyPowerReady
  ) {
    roundLogs.push(
      "⚠️ The enemy is preparing a powerful attack for the next round!"
    );
  }

  const actionName =
    action.replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );

  battle.logs = [
    `**Round ${nextRound} — ${actionName}**`,
    ...roundLogs,
  ].slice(-14);

  return {
    ok: true,
    state: battle,
    status:
      getBattleStatus(
        battle
      ),
  };
}

function saveBattleState(
  userId,
  runId,
  state
) {
  let saved = false;

  updatePlayerAtomic(
    userId,
    (player) => {
      const expedition =
        player?.expedition;

      if (
        !expedition ||
        expedition.status !==
          "active" ||
        expedition.runId !==
          runId
      ) {
        return player;
      }

      saved = true;

      return {
        ...player,
        expedition: {
          ...expedition,
          battleState:
            clone(state),
        },
      };
    }
  );

  return saved;
}

function getCostLines(player) {
  return Object.entries(
    ENTRY_COST
  ).map(
    ([code, cost]) =>
      `${
        getAmount(
          player,
          code
        ) >= cost
          ? "✅"
          : "❌"
      } ${icon(code)} **${
        getItemData(code).name
      }:** ${formatNumber(
        getAmount(
          player,
          code
        )
      )}/${formatNumber(cost)}`
  );
}

function dashboardEmbed(
  player
) {
  const expedition =
    player.expedition;

  const cooldownLeft =
    Math.max(
      0,
      Number(
        expedition
          ?.cooldownUntil || 0
      ) - Date.now()
    );

  const status =
    expedition?.status ===
    "active"
      ? `Active — Stage ${expedition.currentStage}/5`
      : cooldownLeft
        ? `${
            expedition?.status ||
            "Cooldown"
          } — ${formatDuration(
            cooldownLeft
          )} left`
        : "Ready";

  const description = [
    `**Status:** ${status}`,
    expedition?.route
      ? `**Route:** ${expedition.route}`
      : null,
    expedition?.status ===
    "active"
      ? `**Cleared:** ${
          (
            expedition
              .clearedStages ||
            []
          ).length
        }/5`
      : null,
    "",
    expedition?.status ===
    "active"
      ? "Press **Resume Expedition** to continue."
      : "**Entry Cost**",
    ...(
      expedition?.status ===
      "active"
        ? []
        : getCostLines(
            player
          )
    ),
    "",
    "Use `op expedition` again if this menu expires.",
  ]
    .filter(Boolean)
    .join("\n");

  return new EmbedBuilder()
    .setColor(
      expedition?.status ===
        "active"
        ? COLORS.blue
        : COLORS.gold
    )
    .setTitle(
      "🧭 Expedition Dashboard"
    )
    .setDescription(
      description
    );
}

function dashboardRows(
  player
) {
  const expedition =
    player.expedition;

  const row =
    new ActionRowBuilder();

  if (
    expedition?.status ===
    "active"
  ) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `exp:resume:${expedition.runId}`
        )
        .setLabel(
          `Resume Stage ${expedition.currentStage}`
        )
        .setStyle(
          ButtonStyle.Primary
        ),

      new ButtonBuilder()
        .setCustomId(
          `exp:abandon:${expedition.runId}`
        )
        .setLabel("Abandon")
        .setStyle(
          ButtonStyle.Danger
        )
    );
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          "exp:start"
        )
        .setLabel(
          "Start Expedition"
        )
        .setStyle(
          ButtonStyle.Success
        )
        .setDisabled(
          Number(
            expedition
              ?.cooldownUntil ||
              0
          ) > Date.now()
        )
    );
  }

  return [row];
}

function confirmationEmbed(
  player,
  team
) {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(
      "Start Expedition?"
    )
    .setDescription(
      [
        "**Active Team Snapshot**",
        ...team.map(
          (card, index) => {
            const minimumAttack =
              Math.floor(
                Number(
                  card.atk || 0
                ) * 0.85
              );

            const maximumAttack =
              Math.floor(
                Number(
                  card.atk || 0
                ) * 1.15
              );

            return `${
              index + 1
            }. **${
              card.name
            }** — ATK ${formatNumber(
              minimumAttack
            )}-${formatNumber(
              maximumAttack
            )} | HP ${formatNumber(
              card.hp
            )} | SPD ${formatNumber(
              card.spd
            )}`;
          }
        ),
        "",
        "**Entry Cost**",
        ...getCostLines(
          player
        ),
        "",
        "Materials are charged once and will not be refunded.",
      ].join("\n")
    );
}

function confirmationRows() {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            "exp:confirm"
          )
          .setLabel(
            "Confirm Start"
          )
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            "exp:cancel"
          )
          .setLabel("Cancel")
          .setStyle(
            ButtonStyle.Secondary
          )
      ),
  ];
}

function routeEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle(
      "🗺️ Stage 4 — Choose Your Route"
    )
    .setDescription(
      [
        "**Safe Route** — Lower difficulty.",
        "**Dangerous Route** — Higher difficulty and better rewards.",
        "",
        "Your selection also determines the Final Boss reward.",
      ].join("\n")
    );
}

function routeRows(run) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `exp:safe:${run.runId}`
          )
          .setLabel(
            "Safe Route"
          )
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            `exp:dangerous:${run.runId}`
          )
          .setLabel(
            "Dangerous Route"
          )
          .setStyle(
            ButtonStyle.Danger
          )
      ),
  ];
}

function stageEmbed(run) {
  const config =
    getStage(run);

  const premiumPerk =
    getExpeditionPerk(
      run.premiumTier
    );

  const statBonus =
    Math.round(
      (
        Number(
          premiumPerk
            .statMultiplier || 1
        ) -
        1
      ) *
        100
    );

  const mythicChance =
    Math.round(
      (
        0.1 +
        Number(
          premiumPerk
            .mythicBonus || 0
        )
      ) *
        100
    );

  return new EmbedBuilder()
    .setColor(COLORS.blue)
    .setTitle(
      `🧭 Stage ${run.currentStage} — ${config.name}`
    )
    .setDescription(
      [
        "Your active-team snapshot will be used for this encounter.",

        `**Expedition Tier:** ${
          premiumPerk.label
        }`,

        `**Stat Bonus:** ${
          statBonus > 0
            ? `+${statBonus}% ATK/HP/SPD`
            : "None"
        }`,

        `**Dangerous Final Mythic Chance:** ${mythicChance}%`,

        "",
        "**Battle Actions**",
        "⚔️ **Attack** — Normal team attack.",
        "✨ **Skill** — 35% more damage, then 2-round cooldown.",
        "🛡️ **Guard** — Take 40% less damage and deal 20% less damage. Has a 2-round cooldown.",
        "",
        "Targets are selected automatically by position and turn order follows SPD.",
      ].join("\n")
    );
}

function stageRows(run) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `exp:begin:${run.runId}`
          )
          .setLabel(
            "Start Battle"
          )
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            `exp:exit:${run.runId}`
          )
          .setLabel(
            "Exit for Now"
          )
          .setStyle(
            ButtonStyle.Secondary
          )
      ),
  ];
}

function unitLines(units) {
  return units
    .map((unit, index) =>
      renderUnitBlock(
        unit,
        index,
        {
          barSize: 8,
        }
      )
    )
    .join("\n\n");
}

function battleEmbed(
  run,
  battle
) {
  const config =
    getStage(run);

  const status =
    getBattleStatus(
      battle
    );

  const nextRound =
    Number(
      battle.round || 0
    ) + 1;

  const skillReady =
    nextRound >=
    Number(
      battle.skillReadyRound ||
        1
    );

  const guardReady =
    nextRound >=
    Number(
      battle.guardReadyRound ||
        1
    );

  return new EmbedBuilder()
    .setColor(
      status === "active"
        ? COLORS.blue
        : status === "victory"
          ? COLORS.green
          : COLORS.red
    )
    .setTitle(
      `⚔️ Stage ${run.currentStage} — ${config.name}`
    )
    .setDescription(
      [
        `**Round:** ${Math.min(
          nextRound,
          MAX_ROUNDS
        )}/${MAX_ROUNDS}`,

        `**Skill:** ${
          skillReady
            ? "Ready"
            : `Ready on Round ${battle.skillReadyRound}`
        }`,

        `**Guard:** ${
          guardReady
            ? "Ready"
            : `Ready on Round ${battle.guardReadyRound}`
        }`,

        battle.enemyPowerReady
          ? "\n⚠️ **The enemy will use a powerful attack this round!**"
          : null,

        "\n**Your Team**",
        unitLines(
          battle.heroes
        ),

        "\n**Enemy Team**",
        unitLines(
          battle.enemies
        ),

        battle.logs?.length
          ? "\n**Last Round**"
          : null,

        ...(battle.logs || []),
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 4000)
    );
}

function battleRows(
  run,
  battle
) {
  const nextRound =
    Number(
      battle.round || 0
    ) + 1;

  const skillReady =
    nextRound >=
    Number(
      battle.skillReadyRound ||
        1
    );

  const guardReady =
    nextRound >=
    Number(
      battle.guardReadyRound ||
        1
    );

  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `exp:attack:${run.runId}`
          )
          .setLabel("Attack")
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            `exp:skill:${run.runId}`
          )
          .setLabel("Skill")
          .setStyle(
            ButtonStyle.Success
          )
          .setDisabled(
            !skillReady
          ),

        new ButtonBuilder()
          .setCustomId(
            `exp:guard:${run.runId}`
          )
          .setLabel("Guard")
          .setStyle(
            ButtonStyle.Secondary
          )
          .setDisabled(
            !guardReady
          )
      ),

    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `exp:exit:${run.runId}`
          )
          .setLabel(
            "Exit for Now"
          )
          .setStyle(
            ButtonStyle.Secondary
          )
      ),
  ];
}

function resultEmbed(
  run,
  config,
  battle,
  rewardResult
) {
  const victory =
    getBattleStatus(
      battle
    ) === "victory";

  return new EmbedBuilder()
    .setColor(
      victory
        ? COLORS.green
        : COLORS.red
    )
    .setTitle(
      victory
        ? `✅ Stage ${run.currentStage} Cleared`
        : `☠️ Stage ${run.currentStage} Failed`
    )
    .setDescription(
      [
        `**Encounter:** ${config.name}`,
        `**Rounds:** ${battle.round}/${MAX_ROUNDS}`,
        "",
        "**Battle Log**",
        ...(battle.logs || []),
        "",
        victory
          ? "**Rewards**"
          : null,
        ...(
          victory
            ? getRewardLines(
                rewardResult
                  ?.reward ||
                  getScaledExpeditionReward(
                    config.reward,
                    run.premiumTier
                  ),
                rewardResult
                  ?.mythic
              )
            : []
        ),
        !victory
          ? "Previously earned rewards remain in your inventory."
          : null,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 4000)
    );
}

function resultRows(
  run,
  completed
) {
  if (completed) {
    return [];
  }

  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `exp:next:${run.runId}`
          )
          .setLabel(
            Number(
              run.currentStage
            ) === 3
              ? "Choose Route"
              : `Continue to Stage ${
                  Number(
                    run.currentStage
                  ) + 1
                }`
          )
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            `exp:exit:${run.runId}`
          )
          .setLabel(
            "Exit for Now"
          )
          .setStyle(
            ButtonStyle.Secondary
          )
      ),
  ];
}

async function sendEphemeral(
  interaction,
  text
) {
  if (
    interaction.deferred ||
    interaction.replied
  ) {
    return interaction
      .followUp({
        content: text,
        flags:
          MessageFlags.Ephemeral,
      })
      .catch(() => null);
  }

  return interaction
    .reply({
      content: text,
      flags:
        MessageFlags.Ephemeral,
    })
    .catch(() => null);
}

async function openExpedition(
  message
) {
  const userId = String(
    message.author.id
  );

  const player =
    getPlayer(userId);

  if (!player) {
    return message.reply(
      errorResponse(
        "You do not have player data yet."
      )
    );
  }

  const sent =
    await message.reply({
      embeds: [
        dashboardEmbed(
          player
        ),
      ],
      components:
        dashboardRows(
          player
        ),
      allowedMentions: {
        repliedUser: false,
      },
    });

  let busy = false;

  const collector =
    sent.createMessageComponentCollector(
      {
        time:
          15 * 60 * 1000,
      }
    );

  collector.on(
    "collect",
    async (interaction) => {
      if (
        interaction.user.id !==
        userId
      ) {
        return sendEphemeral(
          interaction,
          "Only the expedition owner can use this menu."
        );
      }

      if (busy) {
        return sendEphemeral(
          interaction,
          "Your previous action is still processing."
        );
      }

      busy = true;

      try {
        const [
          ,
          action,
          buttonRunId = "",
        ] = String(
          interaction.customId ||
            ""
        ).split(":");

        if (action === "start") {
          const freshPlayer =
            getPlayer(userId);

          const team =
            createTeamSnapshot(
              freshPlayer
            );

          if (
            freshPlayer
              ?.expedition
              ?.status ===
            "active"
          ) {
            return sendEphemeral(
              interaction,
              "You already have an active expedition."
            );
          }

          if (
            team.length !== 3
          ) {
            return sendEphemeral(
              interaction,
              "You need 3 battle cards in your active team."
            );
          }

          return interaction.update({
            embeds: [
              confirmationEmbed(
                freshPlayer,
                team
              ),
            ],
            components:
              confirmationRows(),
          });
        }

        if (action === "cancel") {
          const freshPlayer =
            getPlayer(userId);

          return interaction.update({
            embeds: [
              dashboardEmbed(
                freshPlayer
              ),
            ],
            components:
              dashboardRows(
                freshPlayer
              ),
          });
        }

        if (
          action === "confirm"
        ) {
          const freshPlayer =
            getPlayer(userId);

          const team =
            createTeamSnapshot(
              freshPlayer
            );

          if (
            team.length !== 3
          ) {
            return sendEphemeral(
              interaction,
              "Your active team changed. Set 3 battle cards and try again."
            );
          }

          const premiumTier =
            await getPremiumTier(
              message
            ).catch(
              () => "normal"
            );

          const created =
            startExpedition(
              userId,
              message.author
                .username,
              team,
              premiumTier
            );

          if (!created.ok) {
            return sendEphemeral(
              interaction,
              created.message
            );
          }

          return interaction.update({
            embeds: [
              stageEmbed(
                created.expedition
              ),
            ],
            components:
              stageRows(
                created.expedition
              ),
          });
        }

        const current =
          getExpedition(userId);

        if (
          !current ||
          current.status !==
            "active"
        ) {
          return sendEphemeral(
            interaction,
            "This expedition is no longer active."
          );
        }

        if (
          buttonRunId &&
          buttonRunId !==
            current.runId
        ) {
          return sendEphemeral(
            interaction,
            "This button belongs to an old expedition run."
          );
        }

        if (
          action === "resume" ||
          action === "next"
        ) {
          if (
            current.battleState &&
            getBattleStatus(
              current.battleState
            ) === "active"
          ) {
            return interaction.update({
              embeds: [
                battleEmbed(
                  current,
                  current.battleState
                ),
              ],
              components:
                battleRows(
                  current,
                  current.battleState
                ),
            });
          }

          if (
            Number(
              current.currentStage
            ) === 4 &&
            !current.route
          ) {
            return interaction.update({
              embeds: [
                routeEmbed(),
              ],
              components:
                routeRows(
                  current
                ),
            });
          }

          return interaction.update({
            embeds: [
              stageEmbed(
                current
              ),
            ],
            components:
              stageRows(
                current
              ),
          });
        }

        if (
          action === "safe" ||
          action ===
            "dangerous"
        ) {
          const selected =
            setExpeditionRoute(
              userId,
              current.runId,
              action
            );

          if (!selected) {
            return sendEphemeral(
              interaction,
              "The route could not be selected."
            );
          }

          const updated =
            getExpedition(
              userId
            );

          return interaction.update({
            embeds: [
              stageEmbed(
                updated
              ),
            ],
            components:
              stageRows(
                updated
              ),
          });
        }

        if (
          action === "begin"
        ) {
          const config =
            getStage(current);

          if (!config) {
            return sendEphemeral(
              interaction,
              "Stage data was not found."
            );
          }

          const battle =
            current.battleState &&
            Number(
              current
                .battleState
                .stage
            ) ===
              Number(
                current.currentStage
              )
              ? current.battleState
              : createBattleState(
                  current,
                  config
                );

          const saved =
            saveBattleState(
              userId,
              current.runId,
              battle
            );

          if (!saved) {
            return sendEphemeral(
              interaction,
              "The battle could not be started."
            );
          }

          return interaction.update({
            embeds: [
              battleEmbed(
                current,
                battle
              ),
            ],
            components:
              battleRows(
                current,
                battle
              ),
          });
        }

        if (
          [
            "attack",
            "skill",
            "guard",
          ].includes(action)
        ) {
          const config =
            getStage(current);

          if (!config) {
            return sendEphemeral(
              interaction,
              "Stage data was not found."
            );
          }

          const battle =
            current.battleState;

          if (
            !battle ||
            Number(
              battle.stage
            ) !==
              Number(
                current.currentStage
              )
          ) {
            return sendEphemeral(
              interaction,
              "Start the stage battle first."
            );
          }

          await interaction.deferUpdate();

          const result =
            processRound(
              battle,
              action
            );

          if (!result.ok) {
            return interaction.followUp({
              content:
                result.message,
              flags:
                MessageFlags.Ephemeral,
            });
          }

          const saved =
            saveBattleState(
              userId,
              current.runId,
              result.state
            );

          if (!saved) {
            return interaction.followUp({
              content:
                "The battle state could not be saved.",
              flags:
                MessageFlags.Ephemeral,
            });
          }

          if (
            result.status ===
            "active"
          ) {
            return interaction.editReply({
              embeds: [
                battleEmbed(
                  current,
                  result.state
                ),
              ],
              components:
                battleRows(
                  current,
                  result.state
                ),
            });
          }

          if (
            result.status ===
            "defeat"
          ) {
            endExpedition(
              userId,
              current.runId,
              "failed",
              current.currentStage
            );

            await interaction.editReply({
              embeds: [
                resultEmbed(
                  current,
                  config,
                  result.state,
                  null
                ),
              ],
              components: [],
            });

            collector.stop(
              "failed"
            );

            return;
          }

          const rewardResult =
            finishStage(
              userId,
              current,
              config
            );

          if (
            !rewardResult.ok
          ) {
            return interaction.followUp({
              content:
                "This stage was already processed. Duplicate reward was blocked.",
              flags:
                MessageFlags.Ephemeral,
            });
          }

          await interaction.editReply({
            embeds: [
              resultEmbed(
                current,
                config,
                result.state,
                rewardResult
              ),
            ],
            components:
              resultRows(
                current,
                rewardResult.completed
              ),
          });

          if (
            rewardResult.completed
          ) {
            collector.stop(
              "completed"
            );
          }

          return;
        }

        if (action === "exit") {
          return interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  COLORS.gold
                )
                .setTitle(
                  "Exit Expedition?"
                )
                .setDescription(
                  [
                    "Are you sure you want to exit for now?",
                    "",
                    "Your current stage, battle HP, round, cooldowns, and previously earned rewards will remain saved.",
                    "",
                    "Use `op expedition` whenever you are ready to continue.",
                  ].join("\n")
                ),
            ],

            components: [
              new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId(
                      `exp:confirm_exit:${current.runId}`
                    )
                    .setLabel(
                      "Confirm Exit"
                    )
                    .setStyle(
                      ButtonStyle.Danger
                    ),

                  new ButtonBuilder()
                    .setCustomId(
                      `exp:cancel_exit:${current.runId}`
                    )
                    .setLabel(
                      "Cancel"
                    )
                    .setStyle(
                      ButtonStyle.Secondary
                    )
                ),
            ],
          });
        }

        if (
          action ===
          "cancel_exit"
        ) {
          if (
            current.battleState &&
            getBattleStatus(
              current.battleState
            ) === "active"
          ) {
            return interaction.update({
              embeds: [
                battleEmbed(
                  current,
                  current.battleState
                ),
              ],
              components:
                battleRows(
                  current,
                  current.battleState
                ),
            });
          }

          if (
            Number(
              current.currentStage
            ) === 4 &&
            !current.route
          ) {
            return interaction.update({
              embeds: [
                routeEmbed(),
              ],
              components:
                routeRows(
                  current
                ),
            });
          }

          return interaction.update({
            embeds: [
              stageEmbed(
                current
              ),
            ],
            components:
              stageRows(
                current
              ),
          });
        }

        if (
          action ===
          "confirm_exit"
        ) {
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  COLORS.blue
                )
                .setTitle(
                  "Expedition Progress Saved"
                )
                .setDescription(
                  "Use `op expedition` whenever you are ready to continue."
                ),
            ],
            components: [],
          });

          collector.stop(
            "exit"
          );

          return;
        }

        if (
          action === "abandon"
        ) {
          return interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  COLORS.red
                )
                .setTitle(
                  "Abandon Expedition?"
                )
                .setDescription(
                  "Entry materials will not be refunded. Previously earned rewards will remain."
                ),
            ],
            components: [
              new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId(
                      `exp:yes_abandon:${current.runId}`
                    )
                    .setLabel(
                      "Confirm Abandon"
                    )
                    .setStyle(
                      ButtonStyle.Danger
                    ),

                  new ButtonBuilder()
                    .setCustomId(
                      `exp:resume:${current.runId}`
                    )
                    .setLabel(
                      "Cancel"
                    )
                    .setStyle(
                      ButtonStyle.Secondary
                    )
                ),
            ],
          });
        }

        if (
          action ===
          "yes_abandon"
        ) {
          endExpedition(
            userId,
            current.runId,
            "abandoned"
          );

          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  COLORS.red
                )
                .setTitle(
                  "Expedition Abandoned"
                )
                .setDescription(
                  "The expedition ended. Entry materials were not refunded."
                ),
            ],
            components: [],
          });

          collector.stop(
            "abandoned"
          );
        }
      } catch (error) {
        console.error(
          "[EXPEDITION ERROR]",
          error
        );

        await sendEphemeral(
          interaction,
          "An error occurred while processing the expedition."
        );
      } finally {
        busy = false;
      }
    }
  );

  collector.on(
    "end",
    async (
      _collected,
      reason
    ) => {
      if (
        [
          "failed",
          "completed",
          "exit",
          "abandoned",
        ].includes(reason)
      ) {
        return;
      }

      await sent
        .edit({
          components: [],
        })
        .catch(() => null);
    }
  );
}

module.exports = {
  name: "expedition",
  description:
    "Open the Expedition dashboard.",

  async execute(message) {
    return openExpedition(
      message
    );
  },
};