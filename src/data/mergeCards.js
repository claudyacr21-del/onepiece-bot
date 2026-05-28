const MERGE_CARDS = [
  {
    code: "lzs",
    name: "Luffy, Zoro & Sanji",
    title: "Monster Trio",
    cardRole: "merge",
    rarity: "M",
    type: "Merge Card",
    mergeGroup: "Straw Hat Pirates",
    source: "Summoning",
    keyCardCode: "road_poneglyph",
    keyCardName: "Road Poneglyph",
    statPercent: 50,

    masteryNames: [
      "Monster Trio",
      "Monster Trio",
      "Monster Trio",
    ],

    members: [
      {
        slot: "luffy",
        label: "Monkey D. Luffy",
        matchCodes: ["luffy_straw_hat", "luffy", "monkey_d_luffy"],
        fragmentName: "Monkey D. Luffy",
        statPercent: 50,
      },
      {
        slot: "zoro",
        label: "Roronoa Zoro",
        matchCodes: ["zoro_pirate_hunter", "zoro", "roronoa_zoro"],
        fragmentName: "Roronoa Zoro",
        statPercent: 50,
      },
      {
        slot: "sanji",
        label: "Vinsmoke Sanji",
        matchCodes: [
          "sanji_black_leg",
          "sanji",
          "vinsmoke_sanji",
          "black_leg_sanji",
        ],
        fragmentName: "Sanji",
        statPercent: 50,
      },
    ],

    summonRequirements: {
      keyStage: 1,
      gems: 0,
      berries: 0,
      fragments: [
        { fragmentName: "Monkey D. Luffy", amount: 50 },
        { fragmentName: "Roronoa Zoro", amount: 50 },
        { fragmentName: "Sanji", amount: 50 },
      ],
    },

    awakenRequirements: {
      2: {
        keyStage: 2,
        gems: 2000,
        berries: 5000000,
        fragments: [
          { fragmentName: "Monkey D. Luffy", amount: 75 },
          { fragmentName: "Roronoa Zoro", amount: 75 },
          { fragmentName: "Sanji", amount: 75 },
        ],
      },
      3: {
        keyStage: 3,
        gems: 4000,
        berries: 7500000,
        fragments: [
          { fragmentName: "Monkey D. Luffy", amount: 100 },
          { fragmentName: "Roronoa Zoro", amount: 100 },
          { fragmentName: "Sanji", amount: 100 },
        ],
      },
    },

    description:
      "A merge card formed from the synchronized power of Luffy, Zoro, and Sanji.",

    image: "",

    stageImages: {
      M1: "",
      M2: "",
      M3: "",
    },
  },
];

function normalizeMergeQuery(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function getMergeCards() {
  return MERGE_CARDS;
}

function findMergeCard(query) {
  const q = normalizeMergeQuery(query);
  if (!q) return null;

  return (
    MERGE_CARDS.find((card) => normalizeMergeQuery(card.code) === q) ||
    MERGE_CARDS.find((card) => normalizeMergeQuery(card.name) === q) ||
    MERGE_CARDS.find((card) =>
      (card.aliases || []).some((alias) => normalizeMergeQuery(alias) === q)
    ) ||
    MERGE_CARDS.find((card) =>
      (card.aliases || []).some((alias) => normalizeMergeQuery(alias).includes(q))
    ) ||
    null
  );
}

module.exports = {
  MERGE_CARDS,
  getMergeCards,
  findMergeCard,
  normalizeMergeQuery,
};