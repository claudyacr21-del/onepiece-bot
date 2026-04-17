const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");

function getPower(card) {
  return Number(card.currentPower || Math.floor(Number(card.atk || 0) * 1.4 + Number(card.hp || 0) * 0.22 + Number(card.speed || 0) * 9));
}

function formatWeapons(card) {
  if (Array.isArray(card?.equippedWeapons) && card.equippedWeapons.length) {
    return card.equippedWeapons.map((w) => w.name).join(", ");
  }
  return card?.equippedWeapon || "None";
}

function buildBattleUnit(card, slot) {
  const synced = hydrateCard(card);
  return {
    slot: slot + 1,
    instanceId: synced.instanceId,
    name: synced.displayName || synced.name || "Unknown",
    rarity: synced.currentTier || synced.rarity || "C",
    atk: Number(synced.atk || 0),
    hp: Number(synced.hp || 0),
    maxHp: Number(synced.hp || 0),
    speed: Number(synced.speed || 0),
    level: Number(synced.level || 1),
    power: getPower(synced),
    equippedWeapon: formatWeapons(synced),
    equippedDevilFruit: synced.equippedDevilFruit || "None",
  };
}

function getTeamUnits(player) {
  const cards = (Array.isArray(player.cards) ? player.cards : []).map(hydrateCard).filter(Boolean);
  const slots = Array.isArray(player?.team?.slots) ? player.team.slots : [null, null, null];

  return slots
    .map((instanceId, index) => {
      if (!instanceId) return null;
      const found = cards.find((card) => card.instanceId === instanceId && card.cardRole !== "boost");
      return found ? buildBattleUnit(found, index) : null;
    })
    .filter(Boolean);
}

function pickTarget(units) {
  const alive = units.filter((unit) => unit.hp > 0);
  if (!alive.length) return null;
  alive.sort((a, b) => {
    if (b.speed !== a.speed) return b.speed - a.speed;
    if (b.power !== a.power) return b.power - a.power;
    return a.slot - b.slot;
  });
  return alive[0];
}

function performAttack(attacker, defender) {
  const rawDamage = Math.max(1, Math.floor(Number(attacker.atk || 0) - Number(defender.speed || 0) * 0.12));
  defender.hp = Math.max(0, Number(defender.hp || 0) - rawDamage);
  return rawDamage;
}

function aliveCount(units) {
  return units.filter((unit) => unit.hp > 0).length;
}

function simulateBattle(teamA, teamB) {
  const left = teamA.map((unit) => ({ ...unit }));
  const right = teamB.map((unit) => ({ ...unit }));
  const logs = [];
  let round = 1;

  while (aliveCount(left) > 0 && aliveCount(right) > 0 && round <= 30) {
    logs.push(`**Round ${round}**`);

    const turnOrder = [...left, ...right]
      .filter((unit) => unit.hp > 0)
      .sort((a, b) => {
        if (b.speed !== a.speed) return b.speed - a.speed;
        if (b.power !== a.power) return b.power - a.power;
        return a.slot - b.slot;
      });

    for (const attacker of turnOrder) {
      if (attacker.hp <= 0) continue;

      const attackerOnLeft = left.some((unit) => unit.instanceId === attacker.instanceId);
      const allies = attackerOnLeft ? left : right;
      const enemies = attackerOnLeft ? right : left;

      const realAttacker = allies.find((unit) => unit.instanceId === attacker.instanceId);
      if (!realAttacker || realAttacker.hp <= 0) continue;

      const target = pickTarget(enemies);
      if (!target) break;

      const damage = performAttack(realAttacker, target);
      logs.push(`${realAttacker.name} dealt **${damage}** to ${target.name}.`);

      if (target.hp <= 0) {
        logs.push(`☠️ ${target.name} was defeated.`);
      }

      if (aliveCount(left) === 0 || aliveCount(right) === 0) break;
    }

    round += 1;
  }

  const leftAlive = aliveCount(left);
  const rightAlive = aliveCount(right);
  const leftTotalHp = left.reduce((sum, unit) => sum + Math.max(0, unit.hp), 0);
  const rightTotalHp = right.reduce((sum, unit) => sum + Math.max(0, unit.hp), 0);

  let result = "draw";
  if (leftAlive > rightAlive) result = "win";
  else if (rightAlive > leftAlive) result = "lose";
  else if (leftTotalHp > rightTotalHp) result = "win";
  else if (rightTotalHp > leftTotalHp) result = "lose";

  return { result, logs: logs.slice(0, 30), left, right };
}

function teamSummary(units) {
  return units
    .map((unit) => [
      `**${unit.slot}. ${unit.name}** [${unit.rarity}] • PWR \`${unit.power}\` • LV \`${unit.level}\``,
      `↪ Weapon: ${unit.equippedWeapon}`,
      `↪ Fruit: ${unit.equippedDevilFruit}`,
    ].join("\n"))
    .join("\n");
}

module.exports = {
  name: "challenge",
  aliases: ["spar"],
  async execute(message) {
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply("Usage: `op challenge @user`");
    if (targetUser.id === message.author.id) return message.reply("You cannot challenge yourself.");

    const player = getPlayer(message.author.id, message.author.username);
    const targetPlayer = getPlayer(targetUser.id, targetUser.username);

    const myTeam = getTeamUnits(player);
    const enemyTeam = getTeamUnits(targetPlayer);

    if (myTeam.length < 3) return message.reply("You need a full team of 3 battle cards to use `op challenge`.");
    if (enemyTeam.length < 3) return message.reply("That user does not have a full team of 3 battle cards.");

    const battle = simulateBattle(myTeam, enemyTeam);

    const title =
      battle.result === "win"
        ? "🏆 Challenge Victory"
        : battle.result === "lose"
          ? "💀 Challenge Defeat"
          : "🤝 Challenge Draw";

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(
            battle.result === "win"
              ? 0x2ecc71
              : battle.result === "lose"
                ? 0xe74c3c
                : 0xf1c40f
          )
          .setTitle(title)
          .setDescription(
            [
              `**You:** ${player.username || message.author.username}`,
              `**Opponent:** ${targetPlayer.username || targetUser.username}`,
              "",
              `**Result:** ${battle.result.toUpperCase()}`,
              "**Mode:** Friendly test match",
              "",
              "## Your Team",
              teamSummary(myTeam),
              "",
              "## Opponent Team",
              teamSummary(enemyTeam),
              "",
              "## Battle Log",
              ...(battle.logs.length ? battle.logs : ["No combat log generated."]),
            ].join("\n")
          )
          .setFooter({ text: "One Piece Bot • Challenge Match" }),
      ],
    });
  },
};