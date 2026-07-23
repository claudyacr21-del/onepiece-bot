const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { normalizeAchievements } = require("../utils/achievements");

const rawCards = require("../data/cards");
const cards = Array.isArray(rawCards) ? rawCards : rawCards.cards || rawCards.BASE_CARDS || [];
const SPECIAL_FORMS = rawCards.SPECIAL_FORMS || {};
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const TIER_BY_STAGE = { 1: "S", 2: "SS", 3: "UR" };

function getMasteryStage(stage) {
  const n = Number(stage || 1);
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return 1;
}

function getSpecialFormTitle(code, stage) {
  const key = String(code || "").toLowerCase().trim();
  const masteryStage = getMasteryStage(stage);
  const forms = SPECIAL_FORMS[key];

  if (Array.isArray(forms)) {
    return forms[masteryStage - 1] || forms[0] || "Unknown Form";
  }

  if (forms && typeof forms === "object") {
    return (
      forms[`M${masteryStage}`] ||
      forms[masteryStage] ||
      forms[String(masteryStage)] ||
      forms.name ||
      "Unknown Form"
    );
  }

  return "Unknown Form";
}

const SIDES = {
  killingham: {
    key: "killingham",
    code: "killingham",
    label: "Saint Rimoshifu Killingham",
    emoji: "🔴",
    style: ButtonStyle.Danger,
    tiers: [
      {
        stage: 1,
        requirements: [
          { stat: "bossDefeated", target: 75 },
        ],
        desc: "Defeat 75 bosses (cumulative)",
      },
      {
        stage: 2,
        requirements: [
          { stat: "bossDefeated", target: 150 },
          { stat: "pullsUsed", target: 500 },
        ],
        desc: "Defeat 150 bosses (cumulative) & 500x pull",
        fragmentReward: 25,
      },
      {
        stage: 3,
        requirements: [
          { stat: "raidCompleted", target: 100 },
          { stat: "pullsUsed", target: 1000 },
        ],
        desc: "Complete 100 raids (Common Raid excluded) & 1000x pull",
        fragmentReward: 25,
      },
    ],
  },
  sommers: {
    key: "sommers",
    code: "sommers",
    label: "Saint Shepherd Sommers",
    emoji: "🔵",
    style: ButtonStyle.Primary,
    tiers: [
      {
        stage: 1,
        requirements: [
          { stat: "fightWon", target: 75 },
        ],
        desc: "Win 75 fights (cumulative)",
      },
      {
        stage: 2,
        requirements: [
          { stat: "fightWon", target: 150 },
          { stat: "imuPrestige", target: 100 },
        ],
        desc: "Win 150 fights (cumulative) & Reach 100 Saint Nerona Imu prestige",
        fragmentReward: 25,
      },
      {
        stage: 3,
        requirements: [
          { stat: "imuPrestige", target: 200 },
        ],
        desc: "Reach 200 Saint Nerona Imu prestige",
        fragmentReward: 25,
      },
    ],
  },
};

function getImuPrestige(player) {
  const bank =
    player.raidPrestigeBank && typeof player.raidPrestigeBank === "object"
      ? player.raidPrestigeBank
      : {};
  const bankPrestige = Number(bank.imu?.raidPrestige || 0);

  let cardPrestige = 0;
  for (const card of Array.isArray(player.cards) ? player.cards : []) {
    const code = String(card.code || "").toLowerCase();
    const name = String(card.displayName || card.name || "").toLowerCase();
    if (code === "imu" || name === "imu" || name.includes("nerona imu")) {
      cardPrestige = Math.max(cardPrestige, Number(card.raidPrestige || 0));
    }
  }

  return Math.max(0, Math.min(200, Math.max(bankPrestige, cardPrestige)));
}

function getStatValue(player, ach, stat) {
  if (stat === "imuPrestige") return getImuPrestige(player);

  if (stat === "pullsUsed") {
    return Number(
      player?.stats?.pullsUsed ||
      player?.stats?.totalPulls ||
      player?.stats?.pulls ||
      player?.achievements?.pullsUsed ||
      ach?.pullsUsed ||
      0
    );
  }

  return Number(ach[stat] || 0);
}

function buildBar(current, target, size = 12) {
  const ratio = target > 0 ? Math.max(0, Math.min(1, current / target)) : 0;
  const filled = Math.round(ratio * size);
  return "█".repeat(filled) + "░".repeat(Math.max(0, size - filled));
}

function getTierRequirements(tier) {
  if (Array.isArray(tier.requirements)) return tier.requirements;
  return [{ stat: tier.stat, target: tier.target }];
}

function isTierCompleted(player, ach, tier) {
  return getTierRequirements(tier).every((req) => {
    return getStatValue(player, ach, req.stat) >= Number(req.target || 0);
  });
}

function isSideClaimable(player, sideKey) {
  const side = SIDES[sideKey];
  const ach = normalizeAchievements(player.achievements);
  const claimed = ach.claimed[sideKey];
  if (claimed >= 3) return false;

  const tier = side.tiers[claimed]; // next tier to claim
  return isTierCompleted(player, ach, tier);
}

function buildSideField(player, sideKey) {
  const side = SIDES[sideKey];
  const ach = normalizeAchievements(player.achievements);
  const claimed = ach.claimed[sideKey];
  const lines = [];

  side.tiers.forEach((tier, index) => {
    const stage = index + 1;
    const requirements = getTierRequirements(tier);
    const label = `**M${stage}** — ${tier.desc}`;
    const requirementLines = requirements.map((req) => {
      const value = getStatValue(player, ach, req.stat);
      const target = Number(req.target || 0);
      return `   \`${buildBar(value, target)}\` ${value}/${target}`;
    });
    const ready = requirements.every((req) => {
      return getStatValue(player, ach, req.stat) >= Number(req.target || 0);
    });

    if (claimed >= stage) {
      lines.push(`✅ ${label}\n   Claimed`);
    } else if (stage === claimed + 1) {
      if (ready) {
        lines.push(`🟢 ${label}\n   READY TO CLAIM`);
      } else {
        lines.push(`⏳ ${label}\n${requirementLines.join("\n")}`);
      }
    } else {
      lines.push(`🔒 ${label}\n   Finish the previous tier first`);
    }
  });

  return {
    name: `${side.emoji} ${side.label}`,
    value: lines.join("\n"),
    inline: false,
  };
}

function buildEmbed(player, note) {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🏆 Saint Mastery Achievements")
    .setDescription(
      [
        "Complete each side to earn a Saint battle card and awaken its mastery **M1 → M2 → M3**.",
        "You must claim the previous tier before the next one unlocks.",
        note ? `\n${note}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .addFields(buildSideField(player, "killingham"), buildSideField(player, "sommers"))
    .setFooter({ text: "One Piece Bot • Mastery System" });

  return embed;
}

function buildRow(player) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ach_claim_killingham")
      .setLabel("Claim Killingham")
      .setEmoji("🔴")
      .setStyle(SIDES.killingham.style)
      .setDisabled(!isSideClaimable(player, "killingham")),
    new ButtonBuilder()
      .setCustomId("ach_claim_sommers")
      .setLabel("Claim Sommers")
      .setEmoji("🔵")
      .setStyle(SIDES.sommers.style)
      .setDisabled(!isSideClaimable(player, "sommers"))
  );
}

function getBaseCardByCode(code) {
  const key = String(code || "").toLowerCase();

  return (Array.isArray(cards) ? cards : []).find((card) => {
    return String(card.code || "").toLowerCase() === key;
  });
}

function makeMasteryCard(side, stage) {
  const base = getBaseCardByCode(side.code) || {};
  const masteryStage = getMasteryStage(stage);
  const formTitle = getSpecialFormTitle(side.code, masteryStage);

  return {
    ...base,
    code: side.code,
    name: base.name || side.label,
    displayName: base.displayName || base.name || side.label,

    // Ini yang penting buat title yang lo tandain di mci.
    title: formTitle,

    instanceId: `${side.code}_ach_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    level: 1,
    currentLevel: 1,
    lvl: 1,
    exp: 0,
    xp: 0,
    kills: 0,
    fragments: 0,
    raidPrestige: 0,

    evolutionStage: masteryStage,
    evolutionKey: `M${masteryStage}`,

    rarity: TIER_BY_STAGE[masteryStage] || base.rarity || "S",
    currentTier: TIER_BY_STAGE[masteryStage] || base.currentTier || base.rarity || "S",

    image: base.image || "",
  };
}

function getCardFragmentName(side) {
  return `${side.label} Fragment`;
}

function addCardFragments(fragments, side, amount) {
  const addAmount = Math.max(0, Math.floor(Number(amount || 0)));
  if (addAmount <= 0) return Array.isArray(fragments) ? fragments : [];

  const arr = Array.isArray(fragments) ? [...fragments] : [];
  const code = side.code;
  const fragmentCode = `${code}_fragment`;
  const name = getCardFragmentName(side);

  const idx = arr.findIndex((frag) => {
    const fragCode = String(frag?.code || "").toLowerCase();
    const fragName = String(frag?.name || frag?.displayName || "").toLowerCase();
    return (
      fragCode === fragmentCode ||
      fragCode === code ||
      fragName === name.toLowerCase()
    );
  });

  if (idx >= 0) {
    const current = Number(arr[idx].amount || arr[idx].count || arr[idx].quantity || 0);
    arr[idx] = {
      ...arr[idx],
      code: arr[idx].code || fragmentCode,
      name: arr[idx].name || name,
      displayName: arr[idx].displayName || name,
      amount: current + addAmount,
    };

    if ("count" in arr[idx]) arr[idx].count = current + addAmount;
    if ("quantity" in arr[idx]) arr[idx].quantity = current + addAmount;

    return arr;
  }

  arr.push({
    code: fragmentCode,
    cardCode: code,
    name,
    displayName: name,
    amount: addAmount,
  });

  return arr;
}

// Runs atomically. Returns an outcome message.
function claimForUser(userId, username, sideKey) {
  const side = SIDES[sideKey];
  let outcome = { ok: false, message: "Something went wrong." };

  updatePlayerAtomic(
    userId,
    (fresh) => {
      const ach = normalizeAchievements(fresh.achievements);
      const claimed = ach.claimed[sideKey];

      if (claimed >= 3) {
        outcome = { ok: false, message: `${side.label}: all mastery tiers already claimed.` };
        return fresh;
      }

      const nextStage = claimed + 1;
      const tier = side.tiers[nextStage - 1];
      const missingRequirements = getTierRequirements(tier)
        .map((req) => {
          const value = getStatValue(fresh, ach, req.stat);
          const target = Number(req.target || 0);
          return { ...req, value, target };
        })
        .filter((req) => req.value < req.target);

      if (missingRequirements.length) {
        outcome = {
          ok: false,
          message: `${side.label} M${nextStage} locked: ${missingRequirements
            .map((req) => `${req.value}/${req.target}`)
            .join(", ")}.`,
        };
        return fresh;
      }

      // Upgrade in place, or grant a fresh card if not owned yet.
      const cards = Array.isArray(fresh.cards) ? fresh.cards.map((c) => ({ ...c })) : [];
      const idx = cards.findIndex(
        (c) => String(c.code || "").toLowerCase() === side.code
      );

      if (idx >= 0) {
        const base = getBaseCardByCode(side.code) || {};
        const masteryStage = getMasteryStage(nextStage);
        const formTitle = getSpecialFormTitle(side.code, masteryStage);

        cards[idx] = {
          ...base,
          ...cards[idx],

          code: side.code,
          name: cards[idx].name || base.name || side.label,
          displayName: cards[idx].displayName || base.displayName || base.name || side.label,

          // Ini yang bikin tulisan Unknown Form berubah sesuai SPECIAL_FORMS.
          title: formTitle,

          evolutionStage: masteryStage,
          evolutionKey: `M${masteryStage}`,

          rarity: TIER_BY_STAGE[masteryStage] || cards[idx].rarity || base.rarity || "S",
          currentTier: TIER_BY_STAGE[masteryStage] || cards[idx].currentTier || base.currentTier || base.rarity || "S",

          image: cards[idx].image || base.image || "",
        };
      } else {
        cards.push(makeMasteryCard(side, nextStage));
      }

      const fragmentReward = Number(tier.fragmentReward || 0);
      const fragments =
        fragmentReward > 0
          ? addCardFragments(fresh.fragments || [], side, fragmentReward)
          : fresh.fragments || [];

      ach.claimed[sideKey] = nextStage;

      const fragmentText = fragmentReward > 0 ? ` +${fragmentReward} fragments.` : "";

      outcome = {
        ok: true,
        message: `Claimed **${side.label} M${nextStage}**! ${
          idx >= 0 ? "Your card was upgraded." : "The card was added to your collection."
        }${fragmentText}`,
      };

      return {
        ...fresh,
        cards,
        fragments,
        achievements: ach,
      };
    },
    username || "Unknown"
  );

  return outcome;
}

module.exports = {
  name: "ach",
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const sent = await message.reply({
      embeds: [buildEmbed(player)],
      components: [buildRow(player)],
      allowedMentions: { repliedUser: false },
    });

    const collector = sent.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "This is not your achievement panel.",
          ephemeral: true,
        });
      }

      const sideKey =
        interaction.customId === "ach_claim_killingham" ? "killingham" : "sommers";

      const outcome = claimForUser(
        message.author.id,
        message.author.username,
        sideKey
      );

      const freshPlayer = getPlayer(message.author.id, message.author.username);
      const note = outcome.ok ? `✅ ${outcome.message}` : `⚠️ ${outcome.message}`;

      await interaction.update({
        embeds: [buildEmbed(freshPlayer, note)],
        components: [buildRow(freshPlayer)],
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({ components: [] });
      } catch (error) {
        // ignore
      }
    });
  },
};