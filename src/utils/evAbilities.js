const cardsDb = require(
  "../data/cards"
);

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
}

function getCardCode(card) {
  return normalizeCode(
    card?.code ||
    card?.cardCode
  );
}

function getCardDefinition(card) {
  if (
    !card ||
    typeof card !== "object"
  ) {
    return null;
  }

  const code =
    getCardCode(card);

  const template =
    (Array.isArray(cardsDb)
      ? cardsDb
      : []
    ).find(
      (entry) =>
        getCardCode(entry) === code
    );

  if (!template) {
    return card;
  }

  return {
    ...template,
    ...card,

    abilities:
      Array.isArray(card.abilities)
        ? card.abilities
        : Array.isArray(
              template.abilities
            )
          ? template.abilities
          : [],
  };
}

function isEvCard(card) {
  const resolved =
    getCardDefinition(card);

  if (!resolved) return false;

  return (
    normalizeCode(
      resolved.rarity
    ) === "ev" ||
    normalizeCode(
      resolved.baseTier
    ) === "ev"
  );
}

function isTrueFormSukuna(card) {
  return (
    getCardCode(card) ===
    "true_form_sukuna"
  );
}

function getEquippedWeaponCodes(
  card
) {
  const codes = [];

  if (card?.equippedWeaponCode) {
    codes.push(
      card.equippedWeaponCode
    );
  }

  if (
    card?.equippedWeapon &&
    typeof card.equippedWeapon ===
      "object"
  ) {
    codes.push(
      card.equippedWeapon.code ||
      card.equippedWeapon
        .weaponCode ||
      card.equippedWeapon.name
    );
  } else if (
    typeof card?.equippedWeapon ===
      "string"
  ) {
    codes.push(
      card.equippedWeapon
    );
  }

  for (
    const weapon of
    Array.isArray(
      card?.equippedWeapons
    )
      ? card.equippedWeapons
      : []
  ) {
    if (
      typeof weapon === "string"
    ) {
      codes.push(weapon);
      continue;
    }

    codes.push(
      weapon?.code ||
      weapon?.weaponCode ||
      weapon?.name
    );
  }

  return codes
    .map(normalizeCode)
    .filter(Boolean);
}

function hasRequiredEventWeapon(
  card,
  ability = null
) {
  const resolved =
    getCardDefinition(card);

  if (!resolved) return false;

  const requiredWeaponCode =
    normalizeCode(
      ability?.requiredWeaponCode ||
      resolved.evWeaponCode
    );

  if (!requiredWeaponCode) {
    return false;
  }

  return getEquippedWeaponCodes(
    card
  ).includes(
    requiredWeaponCode
  );
}

function hasKamutokeEquipped(card) {
  return getEquippedWeaponCodes(
    card
  ).includes("kamutoke");
}

function isAbilityUnlocked(
  card,
  ability
) {
  if (
    !isEvCard(card) ||
    !ability ||
    typeof ability !== "object"
  ) {
    return false;
  }

  if (
    ability.unlockedByDefault ===
    true
  ) {
    return true;
  }

  if (
    ability.requiresEventWeapon ===
    true
  ) {
    return hasRequiredEventWeapon(
      card,
      ability
    );
  }

  return false;
}

function getVisibleEvAbilities(
  card
) {
  const resolved =
    getCardDefinition(card);

  if (
    !isEvCard(resolved) ||
    !Array.isArray(
      resolved?.abilities
    )
  ) {
    return [];
  }

  return resolved.abilities.filter(
    (ability) =>
      isAbilityUnlocked(
        resolved,
        ability
      )
  );
}

function hasEvAbility(
  card,
  abilityId
) {
  const normalizedAbilityId =
    normalizeCode(abilityId);

  return getVisibleEvAbilities(
    card
  ).some(
    (ability) =>
      normalizeCode(
        ability?.id
      ) === normalizedAbilityId
  );
}

function getAbilityEffects(card) {
  const resolved =
    getCardDefinition(card);

  return getVisibleEvAbilities(
    resolved
  )
    .flatMap((ability) => {
      const effects =
        Array.isArray(
          ability?.effects
        )
          ? ability.effects
          : ability?.effect
            ? [ability.effect]
            : [];

      return effects
        .filter(
          (effect) =>
            effect &&
            typeof effect ===
              "object" &&
            normalizeCode(
              effect.type
            )
        )
        .map((effect) => ({
          ...effect,

          type: normalizeCode(
            effect.type
          ),

          abilityId:
            normalizeCode(
              ability.id
            ),

          abilityName:
            String(
              ability.name ||
              ability.id ||
              "EV Ability"
            ),

          sourceCardCode:
            getCardCode(resolved),

          sourceInstanceId:
            String(
              resolved.instanceId ||
              ""
            ),
        }));
    });
}

function sumEffectPercent(
  effects,
  type
) {
  const normalizedType =
    normalizeCode(type);

  return effects
    .filter(
      (effect) =>
        effect.type ===
        normalizedType
    )
    .reduce(
      (total, effect) =>
        total +
        Number(
          effect.percent || 0
        ),
      0
    );
}

function getEvCardEffects(card) {
  const resolved =
    getCardDefinition(card);

  const effects =
    getAbilityEffects(resolved);

  const emergencyHeals =
    effects
      .filter(
        (effect) =>
          effect.type ===
          "self_emergency_heal"
      )
      .map((effect) => ({
        ...effect,

        percent: Math.max(
          0,
          Number(
            effect.percent || 0
          )
        ),

        thresholdPercent:
          Math.max(
            0,
            Math.min(
              100,
              Number(
                effect
                  .thresholdPercent ||
                  50
              )
            )
          ),

        maxActivations:
          Math.max(
            1,
            Math.floor(
              Number(
                effect
                  .maxActivations ||
                  1
              )
            )
          ),
      }));

  return {
    cardCode:
      getCardCode(resolved),

    instanceId:
      String(
        resolved?.instanceId ||
        ""
      ),

    effects,

    selfDamagePercent:
      sumEffectPercent(
        effects,
        "self_damage"
      ),

    selfAttackPercent:
      sumEffectPercent(
        effects,
        "self_atk"
      ),

    selfHealthPercent:
      sumEffectPercent(
        effects,
        "self_hp"
      ),

    selfSpeedPercent:
      sumEffectPercent(
        effects,
        "self_spd"
      ),

    enemyMaxHpPercent:
      sumEffectPercent(
        effects,
        "enemy_max_hp"
      ),

    teamAttackPercent:
      sumEffectPercent(
        effects,
        "team_atk"
      ),

    teamHealthPercent:
      sumEffectPercent(
        effects,
        "team_hp"
      ),

    teamSpeedPercent:
      sumEffectPercent(
        effects,
        "team_spd"
      ),

    emergencyHeals,
  };
}

function getPlayerTeamCards(player) {
  const cards =
    Array.isArray(player?.cards)
      ? player.cards
      : [];

  const teamSlots =
    Array.isArray(
      player?.team?.slots
    )
      ? player.team.slots
      : [];

  return teamSlots
    .slice(0, 3)
    .map((instanceId) => {
      if (!instanceId) {
        return null;
      }

      const card =
        cards.find(
          (entry) =>
            String(
              entry?.instanceId ||
              ""
            ) ===
            String(instanceId)
        );

      return card
        ? getCardDefinition(card)
        : null;
    })
    .filter(Boolean);
}

function getEvTeamEffectsFromCards(
  team
) {
  const cards =
    Array.isArray(team)
      ? team.filter(Boolean)
      : [];

  const cardEffects =
    cards
      .filter(isEvCard)
      .map(getEvCardEffects);

  const allEffects =
    cardEffects.flatMap(
      (entry) =>
        entry.effects
    );

  const enemyMaxHpPercent =
    sumEffectPercent(
      allEffects,
      "enemy_max_hp"
    );

  const teamAtkPercent =
    sumEffectPercent(
      allEffects,
      "team_atk"
    );

  const teamHpPercent =
    sumEffectPercent(
      allEffects,
      "team_hp"
    );

  const teamSpdPercent =
    sumEffectPercent(
      allEffects,
      "team_spd"
    );

  const selfDamageByInstanceId =
    {};

  const emergencyHeals = [];

  for (
    const cardEffect of
    cardEffects
  ) {
    const instanceId =
      String(
        cardEffect.instanceId ||
        ""
      );

    if (instanceId) {
      selfDamageByInstanceId[
        instanceId
      ] =
        Number(
          cardEffect
            .selfDamagePercent ||
            0
        );
    }

    for (
      const heal of
      cardEffect.emergencyHeals
    ) {
      emergencyHeals.push({
        ...heal,

        sourceInstanceId:
          instanceId ||
          heal.sourceInstanceId,
      });
    }
  }

  return {
    cardEffects,
    effects: allEffects,

    selfDamageByInstanceId,

    enemyMaxHpPercent,

    enemyMaxHpReductionPercent:
      Math.max(
        0,
        Math.min(
          90,
          -enemyMaxHpPercent
        )
      ),

    teamAtkPercent,
    teamHpPercent,
    teamSpdPercent,

    emergencyHeals,

    // Compatibility sementara untuk
    // battle code versi sebelumnya.
    sukunaDamagePercent:
      Math.max(
        0,
        ...cardEffects.map(
          (entry) =>
            Number(
              entry
                .selfDamagePercent ||
                0
            )
        )
      ),

    emergencyHealPercent:
      Math.max(
        0,
        ...emergencyHeals.map(
          (effect) =>
            Number(
              effect.percent || 0
            )
        )
      ),
  };
}

function getEvTeamEffects(player) {
  return getEvTeamEffectsFromCards(
    getPlayerTeamCards(player)
  );
}

function getEvSelfDamageMultiplier(
  card
) {
  const effects =
    getEvCardEffects(card);

  return Math.max(
    0,
    1 +
      Number(
        effects.selfDamagePercent ||
        0
      ) /
        100
  );
}

function getEvEnemyHealthMultiplier(
  team
) {
  const effects =
    getEvTeamEffectsFromCards(
      team
    );

  return Math.max(
    0.1,
    1 +
      Number(
        effects.enemyMaxHpPercent ||
        0
      ) /
        100
  );
}

function getEvTeamAttackMultiplier(
  team
) {
  const effects =
    getEvTeamEffectsFromCards(
      team
    );

  return Math.max(
    0,
    1 +
      Number(
        effects.teamAtkPercent ||
        0
      ) /
        100
  );
}

function hasMalevolentShrine(team) {
  return getEvTeamEffectsFromCards(
    team
  ).emergencyHeals.length > 0;
}

function getMalevolentShrineHeal(
  maxHealth,
  percent = 10
) {
  return Math.max(
    1,
    Math.floor(
      Number(maxHealth || 0) *
        Number(percent || 0) /
        100
    )
  );
}

function getUnitEffectKey(
  unit,
  effect
) {
  return [
    String(
      unit?.instanceId ||
      unit?.globalSlot ||
      unit?.slot ||
      "unit"
    ),
    String(
      effect?.abilityId ||
      effect?.type ||
      "effect"
    ),
  ].join(":");
}

function applyEvEnemyMaxHpEffect(
  units,
  teamEffects
) {
  const percent =
    Number(
      teamEffects
        ?.enemyMaxHpPercent ||
      0
    );

  if (
    !Array.isArray(units) ||
    percent === 0
  ) {
    return;
  }

  const multiplier = Math.max(
    0.1,
    1 + percent / 100
  );

  for (const unit of units) {
    const usesBattleHp =
      unit.battleMaxHp !==
        undefined ||
      unit.battleHp !==
        undefined;

    if (usesBattleHp) {
      const maximum = Math.max(
        1,
        Math.floor(
          Number(
            unit.battleMaxHp ??
            unit.maxHp ??
            1
          ) *
          multiplier
        )
      );

      unit.battleMaxHp =
        maximum;

      unit.battleHp =
        Math.min(
          maximum,
          maximum
        );

      if (
        unit.maxHp !== undefined
      ) {
        unit.maxHp = Math.max(
          1,
          Math.floor(
            Number(
              unit.maxHp || 1
            ) *
            multiplier
          )
        );

        unit.hp =
          unit.maxHp;
      }

      continue;
    }

    const maximum = Math.max(
      1,
      Math.floor(
        Number(
          unit.maxHp ||
          unit.hp ||
          1
        ) *
        multiplier
      )
    );

    unit.maxHp = maximum;
    unit.hp = maximum;
  }
}

function tryActivateEvEmergencyHeal(
  units,
  teamEffects,
  activationState,
  logs
) {
  if (
    !Array.isArray(units) ||
    !Array.isArray(
      teamEffects?.emergencyHeals
    )
  ) {
    return false;
  }

  let activated = false;

  for (
    const effect of
    teamEffects.emergencyHeals
  ) {
    const sourceInstanceId =
      String(
        effect.sourceInstanceId ||
        ""
      );

    const unit = units.find(
      (entry) =>
        String(
          entry?.instanceId ||
          ""
        ) === sourceInstanceId
    );

    if (!unit) continue;

    const currentHp =
      Number(
        unit.battleHp ??
        unit.hp ??
        0
      );

    const maxHp = Math.max(
      1,
      Number(
        unit.battleMaxHp ??
        unit.maxHp ??
        1
      )
    );

    if (currentHp <= 0) {
      continue;
    }

    const thresholdPercent =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            effect
              .thresholdPercent ||
            50
          )
        )
      );

    if (
      currentHp >=
      maxHp *
        thresholdPercent /
        100
    ) {
      continue;
    }

    const key =
      getUnitEffectKey(
        unit,
        effect
      );

    const used =
      Number(
        activationState.get(
          key
        ) ||
        0
      );

    const maximumActivations =
      Math.max(
        1,
        Number(
          effect
            .maxActivations ||
          1
        )
      );

    if (
      used >=
      maximumActivations
    ) {
      continue;
    }

    const healAmount =
      Math.max(
        1,
        Math.floor(
          maxHp *
          Number(
            effect.percent ||
            0
          ) /
          100
        )
      );

    const nextHp =
      Math.min(
        maxHp,
        currentHp +
        healAmount
      );

    if (
      unit.battleHp !==
      undefined
    ) {
      unit.battleHp =
        nextHp;
    } else {
      unit.hp = nextHp;
    }

    if (
      unit.battleHp !==
        undefined &&
      unit.hp !== undefined
    ) {
      const displayMaxHp =
        Math.max(
          1,
          Number(
            unit.maxHp ||
            maxHp
          )
        );

      unit.hp = Math.max(
        0,
        Math.floor(
          displayMaxHp *
          nextHp /
          maxHp
        )
      );
    }

    activationState.set(
      key,
      used + 1
    );

    if (Array.isArray(logs)) {
      logs.push(
        `${effect.abilityName} restored **${
          nextHp - currentHp
        } HP** to ${unit.name}.`
      );
    }

    activated = true;
  }

  return activated;
}

module.exports = {
  normalizeCode,
  getCardCode,
  getCardDefinition,
  isEvCard,
  isTrueFormSukuna,
  getEquippedWeaponCodes,
  hasRequiredEventWeapon,
  hasKamutokeEquipped,
  isAbilityUnlocked,
  hasEvAbility,
  getVisibleEvAbilities,
  getAbilityEffects,
  getEvCardEffects,
  getPlayerTeamCards,
  getEvTeamEffectsFromCards,
  getEvTeamEffects,
  getEvSelfDamageMultiplier,
  getEvEnemyHealthMultiplier,
  getEvTeamAttackMultiplier,
  hasMalevolentShrine,
  getMalevolentShrineHeal,
  getUnitEffectKey,
  applyEvEnemyMaxHpEffect,
  tryActivateEvEmergencyHeal,
};