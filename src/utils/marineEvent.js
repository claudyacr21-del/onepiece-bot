const { Pool } = require("pg");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const {
  getPlayer,
  updatePlayer,
  readPlayers,
  writePlayers,
  flushPlayerNow,
} = require("../playerStore");
const { hydrateCard } = require("./evolution");
const { getPlayerCombatBoosts } = require("./combatStats");
const { ITEMS, cloneItem } = require("../data/items");

const MARINE_EVENT_ENABLED = String(process.env.MARINE_EVENT_ENABLED || "true")
  .toLowerCase()
  .trim() !== "false";

const MARINE_EVENT_GUILD_IDS = String(process.env.MARINE_EVENT_GUILD_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const MARINE_EVENT_MIN_MESSAGES = Math.max(
  1,
  Number(process.env.MARINE_EVENT_MIN_MESSAGES || 10)
);

const MARINE_EVENT_CHANCE = Math.max(
  0,
  Math.min(1, Number(process.env.MARINE_EVENT_CHANCE || 0.2))
);

const MARINE_EVENT_GUILD_COOLDOWN_MS = Math.max(
  60_000,
  Number(process.env.MARINE_EVENT_GUILD_COOLDOWN_MS || 18 * 60 * 1000)
);

const MARINE_EVENT_CHANNEL_COOLDOWN_MS = Math.max(
  60_000,
  Number(process.env.MARINE_EVENT_CHANNEL_COOLDOWN_MS || MARINE_EVENT_GUILD_COOLDOWN_MS)
);

const MARINE_EVENT_DESPAWN_MS = Math.max(
  60_000,
  Number(process.env.MARINE_EVENT_DESPAWN_MS || 3 * 60 * 1000)
);

const activeEvents = new Map();
const channelChatCounters = new Map();

const MARINE_EVENT_MAX_COUNT_PER_USER = Math.max(
  1,
  Number(process.env.MARINE_EVENT_MAX_COUNT_PER_USER || 5)
);
const guildCooldowns = new Map();
const channelCooldowns = new Map();

const MARINE_CHANNEL_STORE_KEY = "__marine_event_channels__";

let marineChannelPool = null;

function getMarineChannelPool() {
  if (!process.env.DATABASE_URL) return null;

  if (!marineChannelPool) {
    marineChannelPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        String(process.env.DATABASE_URL || "").includes("supabase")
          ? { rejectUnauthorized: false }
          : undefined,
      max: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return marineChannelPool;
}

async function ensureMarineChannelTable() {
  const pool = getMarineChannelPool();
  if (!pool) return false;

  await pool.query(`
    create table if not exists public.marine_event_channels (
      guild_id text not null,
      channel_id text not null,
      allowed boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (guild_id, channel_id)
    )
  `);

  return true;
}

const RARITY_ORDER = {
  C: 1,
  B: 2,
  A: 3,
  S: 4,
  SS: 5,
};

const MARINE_RARITY_RATES = [
  { rarity: "C", rate: 42 },
  { rarity: "B", rate: 30 },
  { rarity: "A", rate: 18 },
  { rarity: "S", rate: 15 },
  { rarity: "SS", rate: 10 },
];

const MARINE_PROFILES = {
  C: {
    title: "Marine Patrol",
    color: 0x95a5a6,
    berries: 1500,
    boxes: [{ item: ITEMS.basicResourceBox, amount: 1 }],
    units: [
      { name: "Marine Scout", atk: 95, hp: 900, speed: 70 },
      { name: "Marine Rifleman", atk: 105, hp: 980, speed: 76 },
      { name: "Marine Corporal", atk: 118, hp: 1100, speed: 82 },
    ],
  },
  B: {
    title: "Marine Squad",
    color: 0x3498db,
    berries: 2500,
    boxes: [{ item: ITEMS.rareResourceBox, amount: 1 }],
    units: [
      { name: "Marine Sergeant", atk: 170, hp: 1700, speed: 105 },
      { name: "Marine Gunner", atk: 185, hp: 1850, speed: 112 },
      { name: "Marine Lieutenant", atk: 205, hp: 2050, speed: 120 },
    ],
  },
  A: {
    title: "Marine Elite Unit",
    color: 0xf1c40f,
    berries: 5000,
    boxes: [{ item: ITEMS.eliteResourceBox, amount: 1 }],
    units: [
      { name: "Marine Captain", atk: 290, hp: 3100, speed: 155 },
      { name: "Marine Swordsman", atk: 315, hp: 3300, speed: 165 },
      { name: "Marine Commander", atk: 345, hp: 3600, speed: 178 },
    ],
  },
  S: {
    title: "Marine Vice Admiral Force",
    color: 0xe67e22,
    berries: 10000,
    boxes: [{ item: ITEMS.legendResourceBox, amount: 1 }],
    units: [
      { name: "Marine Vice Admiral Guard", atk: 475, hp: 5200, speed: 225 },
      { name: "Marine Rokushiki Agent", atk: 520, hp: 5600, speed: 245 },
      { name: "Marine Vice Admiral", atk: 575, hp: 6200, speed: 265 },
    ],
  },
  SS: {
    title: "Marine Admiral-Level Raid",
    color: 0xe74c3c,
    berries: 10000,
    boxes: [{ item: ITEMS.legendResourceBox, amount: 2 }],
    units: [
      { name: "Marine Elite Vice Admiral", atk: 670, hp: 7600, speed: 305 },
      { name: "Marine Admiral Guard", atk: 730, hp: 8300, speed: 330 },
      { name: "Marine Admiral Vanguard", atk: 810, hp: 9200, speed: 360 },
    ],
  },
};

function normalizeId(value) {
  return String(value || "").trim();
}

function isAllowedGuild(guildId) {
  if (!MARINE_EVENT_ENABLED) return false;

  const id = normalizeId(guildId);
  if (!id) return false;

  // If MARINE_EVENT_GUILD_IDS is empty, allow any guild that has an allowed marine channel.
  // If MARINE_EVENT_GUILD_IDS is filled, only those guilds can spawn marine events.
  if (!MARINE_EVENT_GUILD_IDS.length) return true;

  return MARINE_EVENT_GUILD_IDS.includes(id);
}

function getMarineConfigStore(players = null) {
  const data = players || readPlayers();

  const current =
    data[MARINE_CHANNEL_STORE_KEY] &&
    typeof data[MARINE_CHANNEL_STORE_KEY] === "object"
      ? data[MARINE_CHANNEL_STORE_KEY]
      : {};

  const guilds =
    current.guilds && typeof current.guilds === "object"
      ? current.guilds
      : {};

  data[MARINE_CHANNEL_STORE_KEY] = {
    ...current,
    guilds,
  };

  return data[MARINE_CHANNEL_STORE_KEY];
}

async function getAllowedMarineChannels(guildId) {
  const guildKey = String(guildId);

  const pool = getMarineChannelPool();

  if (pool) {
    try {
      await ensureMarineChannelTable();

      const result = await pool.query(
        `
        select channel_id
        from public.marine_event_channels
        where guild_id = $1
          and allowed = true
        order by created_at asc
        `,
        [guildKey]
      );

      return result.rows.map((row) => String(row.channel_id));
    } catch (error) {
      console.error("[MARINE CHANNEL LOAD ERROR]", error?.message || error);
    }
  }

  const players = readPlayers();
  const store = getMarineConfigStore(players);
  const guildConfig = store.guilds[guildKey] || {};

  return Array.isArray(guildConfig.allowedChannels)
    ? guildConfig.allowedChannels.map(String)
    : [];
}

async function isMarineChannelAllowed(guildId, channelId) {
  const allowedChannels = await getAllowedMarineChannels(guildId);
  return allowedChannels.includes(String(channelId));
}

async function setMarineChannelAllowed(guildId, channelId, allowed) {
  const guildKey = String(guildId);
  const channelKey = String(channelId);
  const pool = getMarineChannelPool();

  if (pool) {
    try {
      await ensureMarineChannelTable();

      if (allowed) {
        await pool.query(
          `
          insert into public.marine_event_channels
            (guild_id, channel_id, allowed, updated_at)
          values ($1, $2, true, now())
          on conflict (guild_id, channel_id) do update
          set allowed = true,
              updated_at = now()
          `,
          [guildKey, channelKey]
        );
      } else {
        await pool.query(
          `
          update public.marine_event_channels
          set allowed = false,
              updated_at = now()
          where guild_id = $1
            and channel_id = $2
          `,
          [guildKey, channelKey]
        );
      }

      return getAllowedMarineChannels(guildKey);
    } catch (error) {
      console.error("[MARINE CHANNEL SAVE ERROR]", error?.message || error);
    }
  }

  const players = readPlayers();
  const store = getMarineConfigStore(players);

  if (!store.guilds[guildKey]) {
    store.guilds[guildKey] = {
      allowedChannels: [],
    };
  }

  const current = Array.isArray(store.guilds[guildKey].allowedChannels)
    ? store.guilds[guildKey].allowedChannels.map(String)
    : [];

  const next = allowed
    ? [...new Set([...current, channelKey])]
    : current.filter((id) => id !== channelKey);

  store.guilds[guildKey].allowedChannels = next;
  players[MARINE_CHANNEL_STORE_KEY] = store;
  writePlayers(players);

  return next;
}

function getChannelUserKey(guildId, channelId) {
  return `${guildId}:${channelId}`;
}

function getChannelChatCounter(guildId, channelId) {
  const key = getChannelUserKey(guildId, channelId);

  if (!channelChatCounters.has(key)) {
    channelChatCounters.set(key, new Map());
  }

  return channelChatCounters.get(key);
}

function getChannelWeightedChatCount(guildId, channelId) {
  const counter = getChannelChatCounter(guildId, channelId);
  let total = 0;

  for (const amount of counter.values()) {
    total += Math.min(
      Number(amount || 0),
      MARINE_EVENT_MAX_COUNT_PER_USER
    );
  }

  return total;
}

function addChannelChatCount(guildId, channelId, userId) {
  const counter = getChannelChatCounter(guildId, channelId);
  const id = String(userId);

  const current = Number(counter.get(id) || 0);

  counter.set(
    id,
    Math.min(current + 1, MARINE_EVENT_MAX_COUNT_PER_USER)
  );

  return getChannelWeightedChatCount(guildId, channelId);
}

function resetChannelChatCounter(guildId, channelId) {
  channelChatCounters.set(getChannelUserKey(guildId, channelId), new Map());
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollMarineRarity() {
  const total = MARINE_RARITY_RATES.reduce(
    (sum, entry) => sum + Number(entry.rate || 0),
    0
  );

  let roll = Math.random() * total;

  for (const entry of MARINE_RARITY_RATES) {
    roll -= Number(entry.rate || 0);
    if (roll <= 0) return entry.rarity;
  }

  return "C";
}

function applyBoost(value, percent) {
  return Math.floor(Number(value || 0) * (1 + Number(percent || 0) / 100));
}

function rollDamage(atk, defenderSpeed = 0) {
  const rolled = Math.floor(Number(atk || 1) * (0.85 + Math.random() * 0.3));
  return Math.max(1, rolled - Math.floor(Number(defenderSpeed || 0) * 0.12));
}

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(item?.code || "").toLowerCase();

  const index = arr.findIndex(
    (entry) => String(entry?.code || "").toLowerCase() === code
  );

  if (index >= 0) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + Number(item.amount || 1),
    };
    return arr;
  }

  arr.push({
    ...item,
    amount: Number(item.amount || 1),
  });

  return arr;
}

function addBoxes(existingBoxes, boxRewards) {
  let boxes = Array.isArray(existingBoxes) ? [...existingBoxes] : [];

  for (const reward of boxRewards) {
    boxes = addOrIncrease(boxes, cloneItem(reward.item, reward.amount));
  }

  return boxes;
}

function getTeamCards(player) {
  const boosts = getPlayerCombatBoosts(player);
  const rawCards = Array.isArray(player.cards) ? player.cards : [];

  const hydratedCards = rawCards
    .map((rawCard, sourceIndex) => {
      const card = hydrateCard(rawCard);
      if (!card) return null;

      return {
        ...card,
        sourceIndex,
      };
    })
    .filter(Boolean);

  const slots = Array.isArray(player?.team?.slots)
    ? player.team.slots.slice(0, 3)
    : [null, null, null];

  return slots
    .map((instanceId, slotIndex) => {
      if (!instanceId) return null;

      const found = hydratedCards.find(
        (card) =>
          String(card.instanceId) === String(instanceId) &&
          String(card.cardRole || "").toLowerCase() !== "boost"
      );

      if (!found) return null;

      const atk = applyBoost(found.atk || 0, boosts.atk);
      const hp = applyBoost(found.hp || 0, boosts.hp);
      const speed = applyBoost(found.speed || 0, boosts.spd);

      return {
        sourceIndex: found.sourceIndex,
        instanceId: found.instanceId,
        slot: slotIndex + 1,
        name: found.displayName || found.name || "Unknown Card",
        rarity: found.currentTier || found.rarity || "C",
        atk,
        hp,
        maxHp: hp,
        speed,
        kills: Number(found.kills || 0),
      };
    })
    .filter(Boolean);
}

function buildMarineTeam(rarity) {
  const profile = MARINE_PROFILES[rarity] || MARINE_PROFILES.C;
  const rank = RARITY_ORDER[rarity] || 1;

  return profile.units.map((unit, index) => {
    const variance = randomInt(94, 108) / 100;
    const hpVariance = randomInt(96, 112) / 100;

    return {
      instanceId: `marine-${Date.now()}-${index}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      name: unit.name,
      rarity,
      atk: Math.floor(unit.atk * variance),
      hp: Math.floor(unit.hp * hpVariance),
      maxHp: Math.floor(unit.hp * hpVariance),
      speed: Math.floor(unit.speed * variance),
      level: Math.min(100, 10 + rank * 15 + randomInt(-3, 5)),
    };
  });
}

function getAlive(list) {
  return list.filter((unit) => Number(unit.hp || 0) > 0);
}

function firstAlive(list) {
  return list.find((unit) => Number(unit.hp || 0) > 0) || null;
}

function performAttack(attacker, defender) {
  const damage = rollDamage(attacker.atk, defender.speed);
  defender.hp = Math.max(0, Number(defender.hp || 0) - damage);
  return damage;
}

function simulateMarineBattle(playerTeam, marineTeam) {
  const logs = [];
  let round = 0;

  while (getAlive(playerTeam).length && getAlive(marineTeam).length && round < 40) {
    round += 1;

    const playerUnit = firstAlive(playerTeam);
    const marineUnit = firstAlive(marineTeam);

    if (!playerUnit || !marineUnit) break;

    const playerFirst =
      Number(playerUnit.speed || 0) >= Number(marineUnit.speed || 0);

    const turns = playerFirst
      ? [
          { actor: playerUnit, target: marineUnit, isPlayer: true },
          { actor: marineUnit, target: playerUnit, isPlayer: false },
        ]
      : [
          { actor: marineUnit, target: playerUnit, isPlayer: false },
          { actor: playerUnit, target: marineUnit, isPlayer: true },
        ];

    for (const turn of turns) {
      if (Number(turn.actor.hp || 0) <= 0) continue;
      if (Number(turn.target.hp || 0) <= 0) continue;

      const damage = performAttack(turn.actor, turn.target);

      logs.push(
        turn.isPlayer
          ? `⚔️ ${turn.actor.name} dealt **${damage}** damage to ${turn.target.name}.`
          : `🛡️ ${turn.actor.name} dealt **${damage}** damage to ${turn.target.name}.`
      );

      if (Number(turn.target.hp || 0) <= 0) {
        logs.push(`☠️ ${turn.target.name} was defeated.`);

        if (turn.isPlayer) {
          turn.actor.kills += 1;
        }
      }
    }
  }

  return {
    won: getAlive(marineTeam).length <= 0 && getAlive(playerTeam).length > 0,
    logs,
    playerTeam,
    marineTeam,
  };
}

function applyMarineKills(player, playerTeam) {
  const cards = [...(player.cards || [])];

  for (const unit of playerTeam) {
    if (!Number.isInteger(unit.sourceIndex)) continue;
    if (!cards[unit.sourceIndex]) continue;

    cards[unit.sourceIndex] = {
      ...cards[unit.sourceIndex],
      kills: Number(unit.kills || 0),
    };
  }

  return cards;
}

function buildSpawnEmbed(event) {
  const profile = MARINE_PROFILES[event.rarity] || MARINE_PROFILES.C;
  const boxText = profile.boxes
    .map((entry) => `${entry.item.name} x${entry.amount}`)
    .join(", ");

  return new EmbedBuilder()
    .setColor(profile.color)
    .setTitle(`⚓ ${profile.title} Appeared!`)
    .setDescription(
      [
        `A **${event.rarity} Rank Marine Force** has appeared in this channel.`,
        "",
        "Click **Battle** first to challenge them with your current 3-card team.",
        "Only the first player who clicks the button will get the battle.",
        "",
        "**Rewards if you win**",
        `↪ Berries: **${Number(profile.berries).toLocaleString("en-US")}**`,
        `↪ Box: **${boxText}**`,
        "",
        "**Requirement**",
        "↪ You must have **3 battle cards** in your team.",
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Random Marine Encounter",
    });
}

function buildSpawnRow(eventId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`marine_battle_${eventId}`)
      .setLabel("Battle")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function buildResultEmbed({ username, rarity, won, reward, logs }) {
  const profile = MARINE_PROFILES[rarity] || MARINE_PROFILES.C;

  const rewardLines = won
    ? [
        `↪ Berries: +${Number(reward.berries || 0).toLocaleString("en-US")}`,
        ...reward.boxes.map(
          (entry) => `↪ ${entry.item.name} x${Number(entry.amount || 1)}`
        ),
      ]
    : ["No rewards."];

  return new EmbedBuilder()
    .setColor(won ? 0x2ecc71 : 0xe74c3c)
    .setTitle(won ? "⚓ Marine Force Defeated!" : "⚓ Marine Battle Lost")
    .setDescription(
      [
        `**Challenger:** ${username}`,
        `**Enemy:** ${profile.title}`,
        `**Rank:** ${rarity}`,
        "",
        "## Battle Result",
        won ? "Victory" : "Defeat",
        "",
        "## Battle Log",
        ...(logs.length ? logs.slice(-12) : ["No battle log."]),
        "",
        "## Rewards",
        ...rewardLines,
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Marine Encounter Result",
    });
}

function createMarineEvent(channel) {
  const rarity = rollMarineRarity();
  const eventId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: eventId,
    guildId: String(channel.guild.id),
    channelId: String(channel.id),
    rarity,
    claimed: false,
    createdAt: Date.now(),
  };
}

async function spawnMarineEvent(message) {
  const event = createMarineEvent(message.channel);
  const profile = MARINE_PROFILES[event.rarity] || MARINE_PROFILES.C;

  const sent = await message.channel.send({
    embeds: [buildSpawnEmbed(event)],
    components: [buildSpawnRow(event.id)],
  });

  event.messageId = sent.id;
  activeEvents.set(event.id, event);

  const collector = sent.createMessageComponentCollector({
    time: MARINE_EVENT_DESPAWN_MS,
  });

  collector.on("collect", async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== `marine_battle_${event.id}`) return;

    const currentEvent = activeEvents.get(event.id);

    if (!currentEvent || currentEvent.claimed) {
      return interaction.reply({
        content: "This Marine encounter has already been claimed.",
        flags: MessageFlags.Ephemeral,
      });
    }

    currentEvent.claimed = true;
    currentEvent.claimedBy = interaction.user.id;
    activeEvents.set(event.id, currentEvent);

    const player = getPlayer(interaction.user.id, interaction.user.username);
    const playerTeam = getTeamCards(player);

    if (playerTeam.length < 3) {
      currentEvent.claimed = false;
      currentEvent.claimedBy = null;
      activeEvents.set(event.id, currentEvent);

      return interaction.reply({
        content:
          "You need **3 battle cards** in your team before battling the Marine force.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const marineTeam = buildMarineTeam(event.rarity);
    const result = simulateMarineBattle(playerTeam, marineTeam);
    const reward = {
      berries: result.won ? profile.berries : 0,
      boxes: result.won ? profile.boxes : [],
    };

    const updatedCards = applyMarineKills(player, result.playerTeam);
    const updatedBoxes = result.won
      ? addBoxes(player.boxes || [], profile.boxes)
      : player.boxes || [];

    updatePlayer(interaction.user.id, {
      cards: updatedCards,
      berries: Number(player.berries || 0) + Number(reward.berries || 0),
      boxes: updatedBoxes,
      stats: {
        ...(player.stats || {}),
        wins: Number(player?.stats?.wins || 0) + (result.won ? 1 : 0),
        losses: Number(player?.stats?.losses || 0) + (result.won ? 0 : 1),
      },
    });

    await interaction.update({
      embeds: [
        buildResultEmbed({
          username: interaction.user.username,
          rarity: event.rarity,
          won: result.won,
          reward,
          logs: result.logs,
        }),
      ],
      components: [buildSpawnRow(event.id, true)],
    });

    collector.stop("claimed");
  });

  collector.on("end", async (_collected, reason) => {
    activeEvents.delete(event.id);

    if (reason === "claimed") return;

    try {
      await sent.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(profile.color)
            .setTitle(`⚓ ${profile.title} Escaped`)
            .setDescription(
              [
                `The **${event.rarity} Rank Marine Force** left the area.`,
                "Nobody challenged them in time.",
              ].join("\n")
            )
            .setFooter({
              text: "One Piece Bot • Random Marine Encounter",
            }),
        ],
        components: [buildSpawnRow(event.id, true)],
      });
    } catch (_) {}
  });

  return event;
}

async function maybeSpawnMarineEvent(client, message) {
  if (!message?.guild || !message?.channel) return false;
  if (message.author?.bot) return false;
  if (!isAllowedGuild(message.guild.id)) return false;
  if (!(await isMarineChannelAllowed(message.guild.id, message.channel.id))) return false;

  const content = String(message.content || "").trim();
  const prefix = String(process.env.PREFIX || "op").toLowerCase();

  if (
    content.toLowerCase().startsWith(`${prefix} `) ||
    content.toLowerCase() === prefix
  ) {
    return false;
  }

  const now = Date.now();
  const guildId = String(message.guild.id);
  const channelId = String(message.channel.id);
  const channelKey = getChannelUserKey(guildId, channelId);

  if (now < Number(guildCooldowns.get(guildId) || 0)) return false;
  if (now < Number(channelCooldowns.get(channelKey) || 0)) return false;

  const activeInChannel = [...activeEvents.values()].some(
    (event) =>
      String(event.guildId) === guildId && String(event.channelId) === channelId
  );

  if (activeInChannel) return false;

const currentMessageCount = addChannelChatCount(
  guildId,
  channelId,
  message.author.id
);

if (currentMessageCount < MARINE_EVENT_MIN_MESSAGES) {
  return false;
}

if (Math.random() > MARINE_EVENT_CHANCE) {
  return false;
}

resetChannelChatCounter(guildId, channelId);
guildCooldowns.set(guildId, now + MARINE_EVENT_GUILD_COOLDOWN_MS);
channelCooldowns.set(channelKey, now + MARINE_EVENT_CHANNEL_COOLDOWN_MS);
  try {
    await spawnMarineEvent(message);
    return true;
  } catch (error) {
    console.error("[MARINE EVENT SPAWN ERROR]", error);
    return false;
  }
}

module.exports = {
  maybeSpawnMarineEvent,
  setMarineChannelAllowed,
  getAllowedMarineChannels,
  isMarineChannelAllowed,
};