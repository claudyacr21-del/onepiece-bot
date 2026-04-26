const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

function getPower(card) {
  return Number(
    card.currentPower ||
      Math.floor(
        Number(card.atk || 0) * 1.4 +
          Number(card.hp || 0) * 0.22 +
          Number(card.speed || 0) * 9
      )
  );
}

function formatWeapons(card) {
  if (Array.isArray(card?.equippedWeapons) && card.equippedWeapons.length) {
    return card.equippedWeapons
      .map((weapon) =>
        `${weapon.name}${Number(weapon.upgradeLevel || 0) > 0 ? ` +${weapon.upgradeLevel}` : ""}`
      )
      .join(", ");
  }

  return card?.displayWeaponName || card?.equippedWeapon || "None";
}

function formatDevilFruit(card) {
  return (
    card?.displayFruitName ||
    card?.equippedDevilFruitName ||
    card?.equippedDevilFruit ||
    "None"
  );
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
    equippedDevilFruit: formatDevilFruit(synced),
  };
}

function getTeamUnits(player) {
  const cards = (Array.isArray(player.cards) ? player.cards : [])
    .map(hydrateCard)
    .filter(Boolean);

  const slots = Array.isArray(player?.team?.slots)
    ? player.team.slots
    : [null, null, null];

  return slots
    .map((instanceId, index) => {
      if (!instanceId) return null;

      const found = cards.find(
        (card) =>
          String(card.instanceId) === String(instanceId) &&
          String(card.cardRole || "").toLowerCase() !== "boost"
      );

      return found ? buildBattleUnit(found, index) : null;
    })
    .filter(Boolean);
}

function aliveCount(units) {
  return units.filter((unit) => Number(unit.hp || 0) > 0).length;
}

function getAliveUnits(units) {
  return units.filter((unit) => Number(unit.hp || 0) > 0);
}

function getFirstAlive(units) {
  return units.find((unit) => Number(unit.hp || 0) > 0) || null;
}

function pickTarget(units) {
  const alive = getAliveUnits(units);

  if (!alive.length) return null;

  alive.sort((a, b) => {
    if (b.speed !== a.speed) return b.speed - a.speed;
    if (b.power !== a.power) return b.power - a.power;
    return a.slot - b.slot;
  });

  return alive[0];
}

function performAttack(attacker, defender) {
  const atk = Number(attacker.atk || 0);
  const defSpeed = Number(defender.speed || 0);
  const rolledAtk = Math.floor(atk * (0.85 + Math.random() * 0.3));
  const rawDamage = Math.max(1, rolledAtk - Math.floor(defSpeed * 0.12));

  defender.hp = Math.max(0, Number(defender.hp || 0) - rawDamage);

  return rawDamage;
}

function renderHpBar(hp, maxHp, size = 10) {
  const current = Math.max(0, Number(hp || 0));
  const max = Math.max(1, Number(maxHp || 1));
  const filled = Math.round((current / max) * size);
  const safeFilled = Math.max(0, Math.min(size, filled));

  return `${"█".repeat(safeFilled)}${"░".repeat(size - safeFilled)} ${current}/${max}`;
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function teamSummary(units) {
  return units
    .map((unit) =>
      [
        `**${unit.slot}. ${unit.name}** [${unit.rarity}]`,
        `PWR \`${unit.power}\` • LV \`${unit.level}\` • ATK \`${formatAtkRange(unit.atk)}\` • SPD \`${unit.speed}\``,
        `↪ Weapon: ${unit.equippedWeapon}`,
        `↪ Fruit: ${unit.equippedDevilFruit}`,
        renderHpBar(unit.hp, unit.maxHp),
      ].join("\n")
    )
    .join("\n\n");
}

function getResultColor(result, ended) {
  if (!ended) return 0x5865f2;
  if (result === "win") return 0x2ecc71;
  if (result === "lose") return 0xe74c3c;
  return 0xf1c40f;
}

function getResultTitle(result) {
  if (result === "win") return "🏆 Challenge Victory";
  if (result === "lose") return "💀 Challenge Defeat";
  return "🤝 Challenge Draw";
}

function resolveResult(myTeam, enemyTeam) {
  const myAlive = aliveCount(myTeam);
  const enemyAlive = aliveCount(enemyTeam);

  if (myAlive > 0 && enemyAlive <= 0) return "win";
  if (enemyAlive > 0 && myAlive <= 0) return "lose";

  const myTotalHp = myTeam.reduce((sum, unit) => sum + Math.max(0, Number(unit.hp || 0)), 0);
  const enemyTotalHp = enemyTeam.reduce((sum, unit) => sum + Math.max(0, Number(unit.hp || 0)), 0);

  if (myTotalHp > enemyTotalHp) return "win";
  if (enemyTotalHp > myTotalHp) return "lose";

  return "draw";
}

function buildChallengeEmbed({ player, targetPlayer, myTeam, enemyTeam, logs, result, ended }) {
  const recentLogs = logs.slice(-8);

  return new EmbedBuilder()
    .setColor(getResultColor(result, ended))
    .setTitle(ended ? getResultTitle(result) : "⚔️ Challenge Battle")
    .setDescription(
      [
        `**You:** ${player.username || "Unknown"}`,
        `**Opponent:** ${targetPlayer.username || "Unknown"}`,
        ended ? `**Result:** ${String(result || "draw").toUpperCase()}` : "**Result:** In Progress",
        "**Mode:** Friendly test match",
        "",
        "## Your Team",
        teamSummary(myTeam),
        "",
        "## Opponent Team",
        teamSummary(enemyTeam),
        "",
        "## Battle Log",
        ...(recentLogs.length ? recentLogs : ["Choose one of your cards to attack."]),
      ].join("\n")
    )
    .setFooter({
      text: ended
        ? "One Piece Bot • Challenge Result"
        : "One Piece Bot • Manual Challenge Match",
    });
}

function buildChallengeResultEmbed({ result, player, targetPlayer, logs }) {
  return new EmbedBuilder()
    .setColor(getResultColor(result, true))
    .setTitle(getResultTitle(result))
    .setDescription(
      [
        `**You:** ${player.username || "Unknown"}`,
        `**Opponent:** ${targetPlayer.username || "Unknown"}`,
        "",
        `**Result:** ${String(result || "draw").toUpperCase()}`,
        "**Mode:** Friendly test match",
        "",
        "## Final Log",
        ...(logs.length ? logs.slice(-10) : ["No final log."]),
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Challenge Result",
    });
}

function buildActionRows(myTeam, ended) {
  const attackRow = new ActionRowBuilder();

  for (let i = 0; i < 3; i++) {
    const unit = myTeam[i];

    attackRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`challenge_attack_${i}`)
        .setLabel(unit ? unit.name.slice(0, 20) : `Slot ${i + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(ended || !unit || Number(unit.hp || 0) <= 0)
    );
  }

  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("challenge_forfeit")
      .setLabel("Forfeit")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(ended)
  );

  return [attackRow, controlRow];
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

    if (myTeam.length < 3) {
      return message.reply("You need a full team of 3 battle cards to use `op challenge`.");
    }

    if (enemyTeam.length < 3) {
      return message.reply("That user does not have a full team of 3 battle cards.");
    }

    const logs = [];
    let ended = false;
    let result = null;

    const sent = await message.reply({
      embeds: [
        buildChallengeEmbed({
          player,
          targetPlayer,
          myTeam,
          enemyTeam,
          logs,
          result,
          ended,
        }),
      ],
      components: buildActionRows(myTeam, ended),
    });

    const collector = sent.createMessageComponentCollector({
      time: SESSION_TIMEOUT_MS,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the challenger can control this challenge battle.",
          ephemeral: true,
        });
      }

      if (ended) {
        return interaction.reply({
          content: "This challenge battle has already ended.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "challenge_forfeit") {
        ended = true;
        result = "lose";
        logs.push("🏳️ You forfeited the challenge.");

        await interaction.update({
          embeds: [
            buildChallengeResultEmbed({
              result,
              player,
              targetPlayer,
              logs,
            }),
          ],
          components: [],
        });

        collector.stop("forfeit");
        return;
      }

      const index = Number(interaction.customId.replace("challenge_attack_", ""));
      const attacker = myTeam[index];

      if (!attacker || Number(attacker.hp || 0) <= 0) {
        return interaction.reply({
          content: "That card cannot attack right now.",
          ephemeral: true,
        });
      }

      const target = pickTarget(enemyTeam);

      if (!target) {
        return interaction.reply({
          content: "No opponent card is available to attack.",
          ephemeral: true,
        });
      }

      const damage = performAttack(attacker, target);

      logs.push(`⚔️ ${attacker.name} dealt **${damage}** damage to ${target.name}.`);

      if (Number(target.hp || 0) <= 0) {
        logs.push(`☠️ ${target.name} was defeated.`);
      }

      if (aliveCount(enemyTeam) <= 0) {
        ended = true;
        result = "win";
        logs.push("🏆 You won the challenge!");

        await interaction.update({
          embeds: [
            buildChallengeResultEmbed({
              result,
              player,
              targetPlayer,
              logs,
            }),
          ],
          components: [],
        });

        collector.stop("win");
        return;
      }

      const enemyAttackers = getAliveUnits(enemyTeam).sort((a, b) => {
        if (b.speed !== a.speed) return b.speed - a.speed;
        if (b.power !== a.power) return b.power - a.power;
        return a.slot - b.slot;
      });

      for (const enemy of enemyAttackers) {
        const retaliationTarget =
          Number(attacker.hp || 0) > 0 ? attacker : getFirstAlive(myTeam);

        if (!retaliationTarget) break;

        const retaliationDamage = performAttack(enemy, retaliationTarget);

        logs.push(
          `💥 ${enemy.name} dealt **${retaliationDamage}** damage to ${retaliationTarget.name}.`
        );

        if (Number(retaliationTarget.hp || 0) <= 0) {
          logs.push(`☠️ ${retaliationTarget.name} was defeated.`);
        }
      }

      if (aliveCount(myTeam) <= 0) {
        ended = true;
        result = "lose";
        logs.push("💀 You lost the challenge.");

        await interaction.update({
          embeds: [
            buildChallengeResultEmbed({
              result,
              player,
              targetPlayer,
              logs,
            }),
          ],
          components: [],
        });

        collector.stop("lose");
        return;
      }

      await interaction.update({
        embeds: [
          buildChallengeEmbed({
            player,
            targetPlayer,
            myTeam,
            enemyTeam,
            logs,
            result,
            ended,
          }),
        ],
        components: buildActionRows(myTeam, ended),
      });
    });

    collector.on("end", async (_collected, reason) => {
      if (ended) return;

      if (reason === "time") {
        ended = true;
        result = resolveResult(myTeam, enemyTeam);
        logs.push("⌛ Challenge timed out. Result decided by remaining HP.");

        try {
          await sent.edit({
            embeds: [
              buildChallengeResultEmbed({
                result,
                player,
                targetPlayer,
                logs,
              }),
            ],
            components: [],
          });
        } catch {}
      }
    });
  },
};