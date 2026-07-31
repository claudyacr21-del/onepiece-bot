const { EmbedBuilder } = require("discord.js");

const {
  readPlayers,
  writePlayers,
  flushPlayerNow,
  flushPlayerStoreNow,
} = require("../playerStore");

const {
  getPlayerCombatCards,
} = require("../utils/combatStats");

const {
  isMergeCard,
  buildMergedCard,
} = require("../utils/mergeCards");

const EVENT_ID = "midsummer_2026";
const GLOBAL_STORE_ID = "__midsummer_2026_global";

const EVENT_START_AT =
  process.env.MIDSUMMER_EVENT_START_AT
    ? Date.parse(process.env.MIDSUMMER_EVENT_START_AT)
    : Date.parse("2026-07-31T17:00:00.000Z");

const EVENT_END_AT =
  process.env.MIDSUMMER_EVENT_END_AT
    ? Date.parse(process.env.MIDSUMMER_EVENT_END_AT)
    : Date.parse("2026-08-31T17:00:00.000Z");

const BOSS_NAME = "Nika";
const BOSS_MAX_HP = 200_000_000;
const BOSS_ATK = 6_000;
const TURN_LIMIT = 20;

const NIKA_BOSS_GIF =
  process.env.MIDSUMMER_NIKA_GIF || "";

const ACTIVE_ATTACKS = new Set();

const RADIANT_TICKET = {
  code: "radiant_ticket",
  name: "Radiant Ticket",
  amount: 1,
  rarity: "UR",
  type: "Ticket",
  description:
    "Midsummer Event ticket used to attack Nika.",
};

const ETERNAL_BOX = {
  code: "eternal_box",
  name: "Eternal Box",
  amount: 1,
  rarity: "UR",
  type: "Box",
  description:
    "A special UR box from the Midsummer Event.",
};

const LEGEND_BOX = {
  code: "legend_resource_box",
  name: "Legend Resource Box",
  amount: 1,
  rarity: "S",
  type: "Box",
};

const PULL_RESET_TICKET = {
  code: "pull_reset_ticket",
  name: "Pull Reset Ticket",
  amount: 1,
  rarity: "A",
  type: "Ticket",
};

function fmt(value) {
  return Math.max(
    0,
    Math.floor(Number(value || 0))
  ).toLocaleString("en-US");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function applyNikaGif(embed) {
  if (NIKA_BOSS_GIF) {
    embed.setImage(NIKA_BOSS_GIF);
  }

  return embed;
}

function addStack(list, item, amount = 1) {
  const arr = Array.isArray(list)
    ? list.map((entry) => ({ ...entry }))
    : [];

  const code = normalize(
    item?.code || item?.name
  );

  const qty = Math.max(
    0,
    Math.floor(Number(amount || 0))
  );

  if (!code || qty <= 0) {
    return arr;
  }

  const index = arr.findIndex(
    (entry) =>
      normalize(
        entry?.code || entry?.name
      ) === code
  );

  if (index === -1) {
    arr.push({
      ...item,
      amount: qty,
    });
  } else {
    arr[index] = {
      ...arr[index],
      ...item,
      amount:
        Math.max(
          0,
          Math.floor(
            Number(arr[index]?.amount || 0)
          )
        ) + qty,
    };
  }

  return arr;
}

function getStackAmount(list, code) {
  const target = normalize(code);

  return (Array.isArray(list) ? list : [])
    .filter(
      (entry) =>
        normalize(
          entry?.code || entry?.name
        ) === target
    )
    .reduce(
      (total, entry) =>
        total +
        Math.max(
          0,
          Math.floor(
            Number(entry?.amount || 0)
          )
        ),
      0
    );
}

function removeStack(list, code, amount) {
  const arr = Array.isArray(list)
    ? list.map((entry) => ({ ...entry }))
    : [];

  const target = normalize(code);

  let remaining = Math.max(
    0,
    Math.floor(Number(amount || 0))
  );

  for (
    let index = arr.length - 1;
    index >= 0 && remaining > 0;
    index -= 1
  ) {
    if (
      normalize(
        arr[index]?.code ||
          arr[index]?.name
      ) !== target
    ) {
      continue;
    }

    const owned = Math.max(
      0,
      Math.floor(
        Number(arr[index]?.amount || 0)
      )
    );

    const used = Math.min(
      owned,
      remaining
    );

    const left = owned - used;
    remaining -= used;

    if (left <= 0) {
      arr.splice(index, 1);
    } else {
      arr[index] = {
        ...arr[index],
        amount: left,
      };
    }
  }

  return remaining > 0
    ? null
    : arr;
}

function getGlobalState(players) {
  const raw =
    players?.[GLOBAL_STORE_ID] &&
    typeof players[GLOBAL_STORE_ID] ===
      "object"
      ? players[GLOBAL_STORE_ID]
      : {};

  return {
    eventId: EVENT_ID,

    totalDamage: Math.max(
      0,
      Math.min(
        BOSS_MAX_HP,
        Math.floor(
          Number(raw.totalDamage || 0)
        )
      )
    ),

    defeatedAt: Math.max(
      0,
      Number(raw.defeatedAt || 0)
    ),

    defeatedBy:
      raw.defeatedBy || null,

    finalRewardsDistributed:
      Boolean(
        raw.finalRewardsDistributed
      ),

    finalRewardsDistributedAt:
      Math.max(
        0,
        Number(
          raw.finalRewardsDistributedAt ||
            0
        )
      ),

    finalRanking:
      Array.isArray(raw.finalRanking)
        ? raw.finalRanking
        : [],

    manualRewards:
      Array.isArray(raw.manualRewards)
        ? raw.manualRewards
        : [],
  };
}

function getEventData(player) {
  const raw =
    player?.events?.[EVENT_ID] &&
    typeof player.events[EVENT_ID] ===
      "object"
      ? player.events[EVENT_ID]
      : {};

  return {
    damage: Math.max(
      0,
      Math.floor(
        Number(raw.damage || 0)
      )
    ),

    attacks: Math.max(
      0,
      Math.floor(
        Number(raw.attacks || 0)
      )
    ),

    ticketsUsed: Math.max(
      0,
      Math.floor(
        Number(raw.ticketsUsed || 0)
      )
    ),

    joinedAt: Math.max(
      0,
      Number(raw.joinedAt || 0)
    ),

    lastAttackAt: Math.max(
      0,
      Number(raw.lastAttackAt || 0)
    ),
  };
}

function setEventData(player, data) {
  return {
    ...player,

    events: {
      ...(player?.events || {}),
      [EVENT_ID]: data,
    },
  };
}

function getPlayerFromStore(
  players,
  message
) {
  const userId =
    String(message.author.id);

  const player =
    players[userId] &&
    typeof players[userId] === "object"
      ? players[userId]
      : {
          username:
            message.author.username ||
            "Unknown",

          berries: 0,
          gems: 0,
          goldenFoilCoins: 0,
          cards: [],
          tickets: [],
          boxes: [],
          events: {},
        };

  player.username =
    message.author.username ||
    player.username ||
    "Unknown";

  player.cards =
    Array.isArray(player.cards)
      ? player.cards
      : [];

  player.tickets =
    Array.isArray(player.tickets)
      ? player.tickets
      : [];

  player.boxes =
    Array.isArray(player.boxes)
      ? player.boxes
      : [];

  player.events =
    player.events &&
    typeof player.events === "object"
      ? player.events
      : {};

  player.goldenFoilCoins =
    Math.max(
      0,
      Math.floor(
        Number(
          player.goldenFoilCoins || 0
        )
      )
    );

  players[userId] = player;

  return player;
}

function getBattleTeam(player) {
  const cards =
    getPlayerCombatCards(player)
      .filter(
        (card) =>
          normalize(card?.cardRole) !==
          "boost"
      )
      .map((card) =>
        isMergeCard(card)
          ? buildMergedCard(
              player,
              card
            )
          : card
      );

  const equipped = cards
    .filter(
      (card) =>
        card?.inTeam === true ||
        card?.equipped === true ||
        card?.isTeam === true ||
        card?.team === true ||
        Number.isFinite(
          Number(card?.teamSlot)
        ) ||
        Number.isFinite(
          Number(card?.slot)
        )
    )
    .sort(
      (a, b) =>
        Number(
          a?.teamSlot ??
            a?.slot ??
            999
        ) -
        Number(
          b?.teamSlot ??
            b?.slot ??
            999
        )
    );

  return (
    equipped.length
      ? equipped
      : cards
  ).slice(0, 3);
}

function getCardName(card) {
  return (
    card?.displayName ||
    card?.name ||
    card?.code ||
    "Unknown Card"
  );
}

function getCardAtk(card) {
  return Math.max(
    1,
    Math.floor(
      Number(
        card?.finalAtk ||
          card?.combatAtk ||
          card?.displayAtk ||
          card?.atk ||
          card?.baseAtk ||
          1
      )
    )
  );
}

function getCardHp(card) {
  return Math.max(
    1,
    Math.floor(
      Number(
        card?.finalHp ||
          card?.combatHp ||
          card?.displayHp ||
          card?.hp ||
          card?.baseHp ||
          1
      )
    )
  );
}

function rollDamage(atk) {
  const min = Math.max(
    1,
    Math.floor(atk * 0.85)
  );

  const max = Math.max(
    min,
    Math.floor(atk * 1.15)
  );

  return (
    min +
    Math.floor(
      Math.random() *
        (max - min + 1)
    )
  );
}

function simulateFight(
  team,
  bossHp
) {
  const units = team.map(
    (card) => ({
      card,
      name: getCardName(card),
      atk: getCardAtk(card),
      hp: getCardHp(card),
    })
  );

  let activeIndex = 0;
  let totalDamage = 0;
  let turns = 0;

  const logs = [];

  while (
    turns < TURN_LIMIT &&
    activeIndex < units.length &&
    totalDamage < bossHp
  ) {
    const unit =
      units[activeIndex];

    const damage = Math.min(
      bossHp - totalDamage,
      rollDamage(unit.atk)
    );

    totalDamage += damage;
    turns += 1;

    logs.push(
      `⚔️ Turn ${turns}: ${unit.name} dealt **${fmt(
        damage
      )}** damage.`
    );

    if (totalDamage >= bossHp) {
      break;
    }

    unit.hp = Math.max(
      0,
      unit.hp - BOSS_ATK
    );

    logs.push(
      `☀️ ${BOSS_NAME} dealt **${fmt(
        BOSS_ATK
      )}** damage to ${unit.name}.`
    );

    if (unit.hp <= 0) {
      logs.push(
        `💀 ${unit.name} was defeated.`
      );

      activeIndex += 1;
    }
  }

  return {
    damage: totalDamage,
    turns,
    logs: logs.slice(-8),

    bossDefeated:
      totalDamage >= bossHp,

    teamDefeated:
      activeIndex >= units.length,
  };
}

function getLeaderboard(players) {
  return Object.entries(players || {})
    .filter(
      ([userId]) =>
        !String(userId).startsWith("__")
    )
    .map(([userId, player]) => ({
      userId: String(userId),

      username:
        player?.username ||
        `User ${userId}`,

      damage:
        getEventData(player).damage,
    }))
    .filter(
      (entry) =>
        entry.damage > 0
    )
    .sort((a, b) => {
      if (
        b.damage !== a.damage
      ) {
        return (
          b.damage -
          a.damage
        );
      }

      return a.userId.localeCompare(
        b.userId
      );
    });
}

function applyFinalReward(
  player,
  rank
) {
  let next = {
    ...player,

    boxes:
      Array.isArray(player?.boxes)
        ? [...player.boxes]
        : [],

    tickets:
      Array.isArray(player?.tickets)
        ? [...player.tickets]
        : [],
  };

  if (rank === 2) {
    next.boxes = addStack(
      next.boxes,
      ETERNAL_BOX,
      10
    );
  } else if (rank === 3) {
    next.boxes = addStack(
      next.boxes,
      ETERNAL_BOX,
      5
    );
  } else if (rank >= 4) {
    const resets =
      10 +
      Math.floor(
        Math.random() * 6
      );

    next.boxes = addStack(
      next.boxes,
      ETERNAL_BOX,
      3
    );

    next.boxes = addStack(
      next.boxes,
      LEGEND_BOX,
      10
    );

    next.tickets = addStack(
      next.tickets,
      PULL_RESET_TICKET,
      resets
    );
  }

  return next;
}

async function distributeFinalRewards(
  players,
  globalState
) {
  if (
    globalState.finalRewardsDistributed ||
    Date.now() < EVENT_END_AT
  ) {
    return globalState;
  }

  const ranking =
    getLeaderboard(players);

  const manualRewards = [];

  ranking.forEach(
    (entry, index) => {
      const rank = index + 1;

      players[entry.userId] =
        applyFinalReward(
          players[entry.userId],
          rank
        );

      if (rank === 1) {
        manualRewards.push({
          userId: entry.userId,
          rank,
          rewards: [
            "Event Skin",
            "Mother Flame",
          ],
        });
      } else if (rank === 2) {
        manualRewards.push({
          userId: entry.userId,
          rank,
          rewards: [
            "Mother Flame",
          ],
        });
      } else if (rank === 3) {
        manualRewards.push({
          userId: entry.userId,
          rank,
          rewards: [
            "Vivre Card",
          ],
        });
      }
    }
  );

  for (
    const [userId, player]
    of Object.entries(players)
  ) {
    if (
      String(userId).startsWith("__") ||
      !player ||
      typeof player !== "object"
    ) {
      continue;
    }

    players[userId] = {
      ...player,
      goldenFoilCoins: 0,
    };
  }

  const nextGlobal = {
    ...globalState,

    finalRewardsDistributed:
      true,

    finalRewardsDistributedAt:
      Date.now(),

    finalRanking:
      ranking,

    manualRewards,
  };

  players[GLOBAL_STORE_ID] =
    nextGlobal;

  writePlayers(players);

  await Promise.allSettled([
    ...ranking.map(
      (entry) =>
        flushPlayerNow(
          entry.userId,
          15000
        )
    ),

    flushPlayerNow(
      GLOBAL_STORE_ID,
      15000
    ),

    flushPlayerStoreNow(
      20000
    ),
  ]);

  return nextGlobal;
}

function buildPanel(
  message,
  players,
  globalState
) {
  const player =
    getPlayerFromStore(
      players,
      message
    );

  const eventData =
    getEventData(player);

  const bossHp = Math.max(
    0,
    BOSS_MAX_HP -
      globalState.totalDamage
  );

  const radiantTickets =
    getStackAmount(
      player.tickets,
      RADIANT_TICKET.code
    );

  const now = Date.now();

  const status =
    now < EVENT_START_AT
      ? `Starts <t:${Math.floor(
          EVENT_START_AT / 1000
        )}:R>`
      : now >= EVENT_END_AT
        ? "Ended"
        : bossHp <= 0
          ? "Nika Defeated"
          : "Active";

  return applyNikaGif(
    new EmbedBuilder()
    .setColor(0xf5b041)
    .setTitle(
      "☀️ Midsummer Event — Nika"
    )
    .setDescription(
      [
        `**Status:** ${status}`,
        `**Event Period:** <t:${Math.floor(
          EVENT_START_AT / 1000
        )}:F> — <t:${Math.floor(
          EVENT_END_AT / 1000
        )}:F>`,
        "",
        `**Nika HP:** ${fmt(
          bossHp
        )}/${fmt(BOSS_MAX_HP)}`,
        `**Nika ATK:** ${fmt(
          BOSS_ATK
        )}`,
        `**Global Damage:** ${fmt(
          globalState.totalDamage
        )}`,
        "",
        `**Your Damage:** ${fmt(
          eventData.damage
        )}`,
        `**Your Attacks:** ${fmt(
          eventData.attacks
        )}`,
        `**Golden Foil Coins:** ${fmt(
          player.goldenFoilCoins
        )}`,
        `**Radiant Tickets:** ${fmt(
          radiantTickets
        )}`,
        "",
        "`op buy radiant` — Buy 1 Radiant Ticket for 25 Golden Foil Coins",
        "`op solstice attack` — Use 1 Radiant Ticket to attack Nika",
        "`op solstice leaderboard` — View the damage ranking",
        "`op solstice rewards` — View final ranking rewards",
      ].join("\n")
    )
    .setFooter({
      text:
        "One Piece Bot • Midsummer Event",
    })
  );
}

function buildLeaderboardEmbed(
  message,
  players
) {
  const ranking =
    getLeaderboard(players);

  const currentUserId =
    String(message.author.id);

  const ownIndex =
    ranking.findIndex(
      (entry) =>
        entry.userId ===
        currentUserId
    );

  const lines =
    ranking.length
      ? ranking
          .slice(0, 15)
          .map(
            (entry, index) =>
              `**${index + 1}.** <@${
                entry.userId
              }> — ${fmt(
                entry.damage
              )} damage`
          )
      : [
          "No damage has been recorded yet.",
        ];

  lines.push(
    "",
    ownIndex >= 0
      ? `**Your Rank:** #${
          ownIndex + 1
        } — ${fmt(
          ranking[ownIndex].damage
        )} damage`
      : "**Your Rank:** Unranked"
  );

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(
      "☀️ Midsummer Damage Leaderboard"
    )
    .setDescription(
      lines.join("\n")
    )
    .setFooter({
      text:
        "One Piece Bot • Midsummer Event",
    });
}

function buildRewardsEmbed() {
  return new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle(
      "🎁 Midsummer Final Ranking Rewards"
    )
    .setDescription(
      [
        "**#1**",
        "Event Skin + Mother Flame *(manual)*",
        "",
        "**#2**",
        "Mother Flame *(manual)* + 10x Eternal Box *(automatic)*",
        "",
        "**#3**",
        "Vivre Card *(manual)* + 5x Eternal Box *(automatic)*",
        "",
        "**#4 and below**",
        "3x Eternal Box + 10x Legend Resource Box + 10–15x Pull Reset Ticket *(automatic)*",
        "",
        "**Eternal Box [UR]**",
        "3–4x Universal S Fragment",
        "1–4x Pull Reset Ticket",
        "100 Gems",
        "20,000 Berries",
      ].join("\n")
    )
    .setFooter({
      text:
        "One Piece Bot • Midsummer Event",
    });
}

async function attackNika(message) {
  const userId =
    String(message.author.id);

  if (
    ACTIVE_ATTACKS.has(userId)
  ) {
    return message.reply(
      "Your previous Nika attack is still being processed."
    );
  }

  const now = Date.now();

  if (now < EVENT_START_AT) {
    return message.reply(
      `The Midsummer Event starts <t:${Math.floor(
        EVENT_START_AT / 1000
      )}:R>.`
    );
  }

  if (now >= EVENT_END_AT) {
    return message.reply(
      "The Midsummer Event has ended."
    );
  }

  ACTIVE_ATTACKS.add(userId);

  try {
    const players =
      readPlayers();

    const globalState =
      getGlobalState(players);

    const bossHp = Math.max(
      0,
      BOSS_MAX_HP -
        globalState.totalDamage
    );

    if (bossHp <= 0) {
      return message.reply(
        "Nika has already been defeated."
      );
    }

    let player =
      getPlayerFromStore(
        players,
        message
      );

    const ownedTickets =
      getStackAmount(
        player.tickets,
        RADIANT_TICKET.code
      );

    if (ownedTickets < 1) {
      return message.reply(
        [
          "You do not have a Radiant Ticket.",
          "Buy one with `op buy radiant`.",
        ].join("\n")
      );
    }

    const team =
      getBattleTeam(player);

    if (!team.length) {
      return message.reply(
        "You need at least one battle card in your team before attacking Nika."
      );
    }

    const tickets =
      removeStack(
        player.tickets,
        RADIANT_TICKET.code,
        1
      );

    if (!tickets) {
      return message.reply(
        "Your Radiant Ticket could not be consumed."
      );
    }

    const result =
      simulateFight(
        team,
        bossHp
      );

    const eventData =
      getEventData(player);

    const nextEventData = {
      ...eventData,

      damage:
        eventData.damage +
        result.damage,

      attacks:
        eventData.attacks + 1,

      ticketsUsed:
        eventData.ticketsUsed + 1,

      joinedAt:
        eventData.joinedAt ||
        now,

      lastAttackAt:
        now,
    };

    player = setEventData(
      {
        ...player,
        tickets,
      },
      nextEventData
    );

    const nextGlobal = {
      ...globalState,

      totalDamage:
        Math.min(
          BOSS_MAX_HP,
          globalState.totalDamage +
            result.damage
        ),
    };

    if (
      nextGlobal.totalDamage >=
        BOSS_MAX_HP &&
      !nextGlobal.defeatedAt
    ) {
      nextGlobal.defeatedAt =
        now;

      nextGlobal.defeatedBy =
        userId;
    }

    players[userId] =
      player;

    players[GLOBAL_STORE_ID] =
      nextGlobal;

    writePlayers(players);

    await Promise.allSettled([
      flushPlayerNow(
        userId,
        15000
      ),

      flushPlayerNow(
        GLOBAL_STORE_ID,
        15000
      ),
    ]);

    const resultText =
      result.bossDefeated
        ? "NIKA DEFEATED"
        : result.teamDefeated
          ? "TEAM DEFEATED"
          : "20 TURNS COMPLETED";

    return message.reply({
      embeds: [
        applyNikaGif(
          new EmbedBuilder()
          .setColor(
            result.bossDefeated
              ? 0x2ecc71
              : 0xf39c12
          )
          .setTitle(
            "☀️ Nika Battle Result"
          )
          .setDescription(
            [
              `**Result:** ${resultText}`,
              `**Turns:** ${fmt(
                result.turns
              )}/${TURN_LIMIT}`,
              `**Damage Dealt:** ${fmt(
                result.damage
              )}`,
              `**Nika HP:** ${fmt(
                BOSS_MAX_HP -
                  nextGlobal.totalDamage
              )}/${fmt(
                BOSS_MAX_HP
              )}`,
              `**Radiant Tickets Left:** ${fmt(
                ownedTickets - 1
              )}`,
              "",
              ...result.logs,
            ].join("\n")
          )
          .setFooter({
            text:
              "One Piece Bot • Midsummer Event",
          })
        ),
      ],

      allowedMentions: {
        repliedUser: false,
      },
    });
  } finally {
    ACTIVE_ATTACKS.delete(
      userId
    );
  }
}

module.exports = {
  name: "solstice",

  async execute(
    message,
    args = []
  ) {
    let players =
      readPlayers();

    let globalState =
      getGlobalState(players);

    if (
      Date.now() >= EVENT_END_AT &&
      !globalState.finalRewardsDistributed
    ) {
      globalState =
        await distributeFinalRewards(
          players,
          globalState
        );

      players =
        readPlayers();
    }

    const subcommand =
      normalize(args[0]);

    if (
      subcommand === "attack"
    ) {
      return attackNika(
        message
      );
    }

    if (
      subcommand === "lb"
    ) {
      return message.reply({
        embeds: [
          buildLeaderboardEmbed(
            message,
            players
          ),
        ],

        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (
      subcommand === "reward"
    ) {
      return message.reply({
        embeds: [
          buildRewardsEmbed(),
        ],

        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    return message.reply({
      embeds: [
        buildPanel(
          message,
          players,
          globalState
        ),
      ],

      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};