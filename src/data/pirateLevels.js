const MATERIAL_ROTATION = [
  "cola",
  "engine",
  "enhancement_stone",
  "wood",
  "iron",
  "steel",
  "rope",
  "cloth",
  "gunpowder",
  "scrap",
  "ship_part",
  "rare_ship_part",
];

function getPirateLevelRequirement(currentLevel) {
  const level = Math.max(1, Math.min(99, Math.floor(Number(currentLevel || 1))));
  const nextLevel = level + 1;

  const berries = Math.floor(25000 + level * 8500 + Math.pow(level, 1.7) * 1200);

  const materialCount = level < 10 ? 1 : level < 35 ? 2 : level < 70 ? 3 : 4;
  const materials = {};

  for (let i = 0; i < materialCount; i++) {
    const key = MATERIAL_ROTATION[(level + i * 3) % MATERIAL_ROTATION.length];
    const baseAmount = Math.floor(2 + level / 4 + i * 2);

    materials[key] = (materials[key] || 0) + baseAmount;
  }

  if (level >= 25) {
    materials.enhancement_stone = (materials.enhancement_stone || 0) + Math.floor(level / 10);
  }

  if (level >= 45) {
    materials.engine = (materials.engine || 0) + Math.floor(level / 15);
  }

  if (level >= 60) {
    materials.cola = (materials.cola || 0) + Math.floor(level / 12);
  }

  if (level >= 80) {
    materials.rare_ship_part = (materials.rare_ship_part || 0) + Math.floor(level / 20);
  }

  return {
    fromLevel: level,
    toLevel: nextLevel,
    berries,
    materials,
  };
}

function getMaterialDisplayName(code) {
  return String(code || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRequirement(req) {
  if (!req) return "Max level reached.";

  const lines = [`Berries: ${Number(req.berries || 0).toLocaleString("en-US")}`];

  for (const [code, amount] of Object.entries(req.materials || {})) {
    lines.push(`${getMaterialDisplayName(code)} x${Number(amount || 0).toLocaleString("en-US")}`);
  }

  return lines.join("\n");
}

module.exports = {
  MATERIAL_ROTATION,
  getPirateLevelRequirement,
  getMaterialDisplayName,
  formatRequirement,
};