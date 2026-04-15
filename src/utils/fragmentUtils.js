function addFragment(fragments, card, amount = 1) {
  const list = Array.isArray(fragments) ? [...fragments] : [];
  const code = card.code || String(card.name || "unknown").toLowerCase().replace(/\s+/g, "_");
  const index = list.findIndex((entry) => entry.code === code);

  const fragmentEntry = {
    name: card.displayName || card.name || "Unknown Fragment",
    amount,
    rarity: card.rarity || "C",
    category: card.cardRole === "boost" ? "boost" : "battle",
    code,
    image: card.image || ""
  };

  if (index !== -1) {
    list[index] = {
      ...list[index],
      amount: Number(list[index].amount || 0) + Number(amount || 1)
    };
    return list;
  }

  list.push(fragmentEntry);
  return list;
}

function getDuplicateFragmentAmount() {
  return 1;
}

function hasOwnedCardByCode(cards, code) {
  if (!Array.isArray(cards)) return false;
  return cards.some((card) => card.code === code);
}

module.exports = {
  addFragment,
  getDuplicateFragmentAmount,
  hasOwnedCardByCode
};