const {
  MERGE_FIXED_POWER,
  isLzsCard,
  buildMergedLzsCard,
  syncMergedCardsInPlayer,
} = require("./mergeCards");

const FIXED_MERGE_POWER = Number(MERGE_FIXED_POWER || 100000);

function firstPositive(...values) {
  for (const value of values) {
    const n = Number(value || 0);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 0;
}

function forceMergePower(card) {
  if (!card || !isLzsCard(card)) return card;

  const atk = Math.max(
    1,
    firstPositive(
      card.combatAtk,
      card.displayAtk,
      card.finalAtk,
      card.totalAtk,
      card.battleAtk,
      card.atk,
      card.baseAtk
    )
  );

  const hp = Math.max(
    1,
    firstPositive(
      card.combatHp,
      card.displayHp,
      card.finalHp,
      card.totalHp,
      card.battleHp,
      card.maxHp,
      card.hp,
      card.baseHp
    )
  );

  const speed = Math.max(
    1,
    firstPositive(
      card.combatSpeed,
      card.displaySpeed,
      card.finalSpeed,
      card.totalSpeed,
      card.battleSpeed,
      card.speed,
      card.spd,
      card.baseSpeed
    )
  );

  return {
    ...card,

    power: FIXED_MERGE_POWER,
    basePower: FIXED_MERGE_POWER,
    currentPower: FIXED_MERGE_POWER,
    finalPower: FIXED_MERGE_POWER,
    displayPower: FIXED_MERGE_POWER,
    combatPower: FIXED_MERGE_POWER,
    teamPower: FIXED_MERGE_POWER,
    battlePower: FIXED_MERGE_POWER,
    totalPower: FIXED_MERGE_POWER,

    powerCaps: {
      ...(card.powerCaps || {}),
      M1: FIXED_MERGE_POWER,
      M2: FIXED_MERGE_POWER,
      M3: FIXED_MERGE_POWER,
    },

    atk,
    baseAtk: firstPositive(card.baseAtk, atk),
    displayAtk: atk,
    combatAtk: atk,
    finalAtk: atk,
    totalAtk: atk,
    battleAtk: atk,

    hp,
    baseHp: firstPositive(card.baseHp, hp),
    maxHp: hp,
    currentHp: hp,
    displayHp: hp,
    combatHp: hp,
    finalHp: hp,
    totalHp: hp,
    battleHp: hp,

    speed,
    spd: speed,
    baseSpeed: firstPositive(card.baseSpeed, card.spd, speed),
    displaySpeed: speed,
    combatSpeed: speed,
    finalSpeed: speed,
    totalSpeed: speed,
    battleSpeed: speed,
  };
}

function syncMergeCombatCard(player, card) {
  if (!card || typeof card !== "object") return card;
  if (!isLzsCard(card)) return card;

  const synced = buildMergedLzsCard(player, card);
  return forceMergePower(synced);
}

function syncCardArray(player, value) {
  if (!Array.isArray(value)) return value;
  return value.map((card) => syncMergeCombatCard(player, card));
}

function syncMergeCombatPlayer(player) {
  if (!player || typeof player !== "object") return player;

  const syncedBase = syncMergedCardsInPlayer(player) || player;
  const next = {
    ...syncedBase,
  };

  const keys = [
    "cards",
    "team",
    "activeTeam",
    "battleTeam",
    "fightTeam",
    "bossTeam",
    "raidTeam",
    "arenaTeam",
    "challengeTeam",
    "phase2Team",
    "guildBossTeam",
    "pirateBossTeam",
  ];

  for (const key of keys) {
    if (Array.isArray(next[key])) {
      next[key] = syncCardArray(next, next[key]);
    }
  }

  return next;
}

function getMergeSafePower(card, fallback = 0) {
  if (card && isLzsCard(card)) return FIXED_MERGE_POWER;
  const n = Number(
    card?.currentPower ??
    card?.teamPower ??
    card?.combatPower ??
    card?.power ??
    fallback ??
    0
  );
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

module.exports = {
  FIXED_MERGE_POWER,
  forceMergePower,
  syncMergeCombatCard,
  syncMergeCombatPlayer,
  getMergeSafePower,
};
