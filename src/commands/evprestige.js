const { EmbedBuilder } = require("discord.js");
const {
  getPlayer,
  updatePlayerAtomic,
} = require("../playerStore");
const cardsDb = require("../data/cards");
const weaponsDb = require("../data/weapons");

const EV_MAX_PRESTIGE = 150;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value) {
  return normalize(value).replace(/\s+/g, "_");
}

function getFragmentAmount(entry) {
  return Math.max(
    0,
    Math.floor(
      Number(
        entry?.amount ??
          entry?.count ??
          entry?.quantity ??
          0
      ) || 0
    )
  );
}

function setFragmentAmount(entry, amount) {
  const next = {
    ...entry,
    amount,
  };

  if (
    Object.prototype.hasOwnProperty.call(
      entry,
      "count"
    )
  ) {
    next.count = amount;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      entry,
      "quantity"
    )
  ) {
    next.quantity = amount;
  }

  return next;
}

function scoreQuery(query, values) {
  const q = normalize(query);

  if (!q) return 0;

  let best = 0;

  for (const raw of values) {
    const value = normalize(raw);

    if (!value) continue;

    if (value === q) {
      best = Math.max(
        best,
        1000 + value.length
      );
    } else if (value.startsWith(q)) {
      best = Math.max(
        best,
        700 + q.length
      );
    } else if (value.includes(q)) {
      best = Math.max(
        best,
        400 + q.length
      );
    }
  }

  return best;
}

function findEvCard(query) {
  return (
    cardsDb
      .map((card) => ({
        card,
        score: scoreQuery(query, [
          card.code,
          card.name,
          card.displayName,
          card.title,
          card.variant,
        ]),
      }))
      .filter(({ card, score }) => {
        const rarity = String(
          card.baseTier ||
            card.rarity ||
            ""
        ).toUpperCase();

        const role = String(
          card.cardRole || "battle"
        ).toLowerCase();

        return (
          rarity === "EV" &&
          role !== "boost" &&
          score > 0
        );
      })
      .sort(
        (a, b) =>
          b.score - a.score
      )[0]?.card || null
  );
}

function cardMatchesTemplate(
  ownedCard,
  template
) {
  const targetCode = normalizeCode(
    template.code
  );

  const ownedCodes = [
    ownedCard?.code,
    ownedCard?.baseCode,
    ownedCard?.cardCode,
    ownedCard?.sourceCode,
  ].map(normalizeCode);

  return ownedCodes.includes(targetCode);
}

function findEvWeapon(card) {
  const requiredCode = normalizeCode(
    card.evWeaponCode
  );

  if (requiredCode) {
    const exactWeapon = weaponsDb.find(
      (weapon) =>
        normalizeCode(weapon.code) ===
        requiredCode
    );

    if (exactWeapon) {
      return exactWeapon;
    }
  }

  const cardCode = normalizeCode(
    card.code
  );

  return (
    weaponsDb.find((weapon) => {
      const rarity = String(
        weapon.rarity || ""
      ).toUpperCase();

      const owners = Array.isArray(
        weapon.owners
      )
        ? weapon.owners
        : [];

      return (
        rarity === "EV" &&
        owners.some(
          (owner) =>
            normalizeCode(owner) ===
            cardCode
        )
      );
    }) || null
  );
}

function isCardFragment(entry, card) {
  if (
    String(
      entry?.category || ""
    ).toLowerCase() === "weapon"
  ) {
    return false;
  }

  const targetCode = normalizeCode(
    card.code
  );

  const entryCodes = [
    entry?.code,
    entry?.cardCode,
    entry?.sourceCode,
  ].map(normalizeCode);

  return entryCodes.includes(
    targetCode
  );
}

function isWeaponFragment(
  entry,
  weapon
) {
  const weaponCode = normalizeCode(
    weapon.code
  );

  const fragmentCode = normalizeCode(
    `weapon_fragment_${weapon.code}`
  );

  const entryCode = normalizeCode(
    entry?.code
  );

  const linkedWeapon = normalizeCode(
    entry?.weaponCode ||
      entry?.sourceWeaponCode
  );

  return (
    entryCode === fragmentCode ||
    linkedWeapon === weaponCode
  );
}

function consumeFragments(
  fragments,
  matcher,
  amount
) {
  let remaining = amount;
  const updated = [];

  for (
    const entry of Array.isArray(fragments)
      ? fragments
      : []
  ) {
    if (
      remaining <= 0 ||
      !matcher(entry)
    ) {
      updated.push(entry);
      continue;
    }

    const owned =
      getFragmentAmount(entry);

    const used = Math.min(
      owned,
      remaining
    );

    const left = owned - used;

    remaining -= used;

    if (left > 0) {
      updated.push(
        setFragmentAmount(
          entry,
          left
        )
      );
    }
  }

  return remaining === 0
    ? updated
    : null;
}

module.exports = {
  name: "evprestige",
  aliases: ["evp"],

  async execute(message, args) {
    const source = String(
      args.shift() || ""
    ).toLowerCase();

    const requested = Math.floor(
      Number(args.shift())
    );

    const query = args
      .join(" ")
      .trim();

    if (
      !["card", "weapon"].includes(
        source
      ) ||
      !Number.isFinite(requested) ||
      requested <= 0 ||
      !query
    ) {
      return message.reply({
        content: [
          "Usage:",
          "`op evprestige card <amount> <EV card>`",
          "`op evprestige weapon <amount> <EV card>`",
          "",
          "Example:",
          "`op evprestige card 10 true form sukuna`",
          "`op evprestige weapon 10 true form sukuna`",
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const template =
      findEvCard(query);

    if (!template) {
      return message.reply({
        content:
          `EV card matching \`${query}\` was not found.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const player = getPlayer(
      message.author.id,
      message.author.username
    );

    const playerCards =
      Array.isArray(player.cards)
        ? player.cards
        : [];

    const ownedIndex =
      playerCards.findIndex(
        (card) =>
          cardMatchesTemplate(
            card,
            template
          )
      );

    if (ownedIndex === -1) {
      return message.reply({
        content:
          `You do not own **${template.name}**.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const weapon =
      source === "weapon"
        ? findEvWeapon(template)
        : null;

    if (
      source === "weapon" &&
      !weapon
    ) {
      return message.reply({
        content:
          `No matching EV weapon was found for **${template.name}**.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const matcher =
      source === "card"
        ? (entry) =>
            isCardFragment(
              entry,
              template
            )
        : (entry) =>
            isWeaponFragment(
              entry,
              weapon
            );

    const playerFragments =
      Array.isArray(player.fragments)
        ? player.fragments
        : [];

    const ownedFragments =
      playerFragments
        .filter(matcher)
        .reduce(
          (total, entry) =>
            total +
            getFragmentAmount(entry),
          0
        );

    const currentPrestige =
      Math.max(
        0,
        Math.min(
          EV_MAX_PRESTIGE,
          Math.floor(
            Number(
              playerCards[ownedIndex]
                ?.raidPrestige || 0
            )
          )
        )
      );

    const neededForCap =
      EV_MAX_PRESTIGE -
      currentPrestige;

    if (neededForCap <= 0) {
      return message.reply({
        content:
          `**${template.name}** is already at ` +
          `**${EV_MAX_PRESTIGE}/${EV_MAX_PRESTIGE}** prestige.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const usedAmount = Math.min(
      requested,
      neededForCap
    );

    if (
      ownedFragments <
      usedAmount
    ) {
      const fragmentName =
        source === "card"
          ? `${template.name} Fragment`
          : `${weapon.name} Fragment`;

      return message.reply({
        content: [
          `Not enough **${fragmentName}**.`,
          `Owned: **${ownedFragments}**`,
          `Required: **${usedAmount}**`,
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    let updated = false;
    let oldPrestige =
      currentPrestige;
    let newPrestige =
      currentPrestige;
    let remainingFragments =
      ownedFragments;

    updatePlayerAtomic(
      message.author.id,
      (fresh) => {
        const cards =
          Array.isArray(fresh.cards)
            ? fresh.cards.map(
                (card) => ({
                  ...card,
                })
              )
            : [];

        const freshCardIndex =
          cards.findIndex(
            (card) =>
              cardMatchesTemplate(
                card,
                template
              )
          );

        if (
          freshCardIndex === -1
        ) {
          return fresh;
        }

        const freshFragments =
          Array.isArray(
            fresh.fragments
          )
            ? fresh.fragments
            : [];

        const freshOwned =
          freshFragments
            .filter(matcher)
            .reduce(
              (total, entry) =>
                total +
                getFragmentAmount(
                  entry
                ),
              0
            );

        oldPrestige = Math.max(
          0,
          Math.min(
            EV_MAX_PRESTIGE,
            Math.floor(
              Number(
                cards[
                  freshCardIndex
                ]?.raidPrestige ||
                  0
              )
            )
          )
        );

        const actualUsed =
          Math.min(
            usedAmount,
            EV_MAX_PRESTIGE -
              oldPrestige
          );

        if (
          actualUsed <= 0 ||
          freshOwned <
            actualUsed
        ) {
          return fresh;
        }

        const fragments =
          consumeFragments(
            freshFragments,
            matcher,
            actualUsed
          );

        if (!fragments) {
          return fresh;
        }

        newPrestige =
          oldPrestige +
          actualUsed;

        remainingFragments =
          freshOwned -
          actualUsed;

        cards[freshCardIndex] = {
          ...cards[
            freshCardIndex
          ],
          raidPrestige:
            newPrestige,
        };

        updated = true;

        return {
          ...fresh,
          cards,
          fragments,
        };
      },
      message.author.username
    );

    if (!updated) {
      return message.reply({
        content:
          "Your data changed while processing. Please try again.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const fragmentName =
      source === "card"
        ? `${template.name} Fragment`
        : `${weapon.name} Fragment`;

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x6e0b14)
          .setTitle(
            "EV Prestige Increased"
          )
          .setDescription(
            [
              `**Card:** ${template.name}`,
              `**Sacrificed:** ${fragmentName} x${newPrestige - oldPrestige}`,
              `**Prestige:** ${oldPrestige}/${EV_MAX_PRESTIGE} → ${newPrestige}/${EV_MAX_PRESTIGE}`,
              `**Remaining Fragments:** ${remainingFragments}`,
            ].join("\n")
          )
          .setFooter({
            text:
              "One Piece Bot • EV Prestige",
          }),
      ],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};