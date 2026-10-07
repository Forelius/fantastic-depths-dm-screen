// ==========================================
// FaDe roll helpers — saving throws, ability checks, exploration
// Delegates to game.fade.registry / SpecialAbilityItem.roll
// ==========================================

/** Request UI save keys → FaDe customSaveCode */
const SAVE_CODE_MAP = {
  wand: 'wand',
  spell: 'spell',
  petrification: 'paralysis',
  stone: 'paralysis',
  paralysis: 'paralysis',
  breath: 'breath',
  death: 'death'
};

/**
 * Stable pack document ids for the four base exploration abilities.
 * Used only to match embedded items via sourceId (not Compendium UUID paths).
 */
const EXPLORE_SOURCE_IDS = {
  findSecretDoors: 'akgcSVIh27fXqbVW',
  forceOpenDoors: 'nPZLQJzGQ7b0g665',
  listenAtDoors: 'qTQsTNYfcHpEki7V',
  findTraps: 'BDFBtg7fOKRvlzbd'
};

/**
 * Synthetic event for AbilityCheck.execute — mirrors ability-scores.hbs dataset.
 * @param {string} ability str|dex|con|int|wis|cha
 * @param {Event|null} sourceEvent optional real click (ctrlKey skips FaDe dialog)
 */
export function createAbilityCheckEvent(ability, sourceEvent = null) {
  const target = document.createElement('span');
  Object.assign(target.dataset, {
    ability,
    test: 'ability',
    pass: 'lte',
    autosuccess: '1',
    autofail: '20'
  });
  return {
    target,
    currentTarget: target,
    ctrlKey: Boolean(sourceEvent?.ctrlKey),
    preventDefault() {},
    stopPropagation() {}
  };
}

/**
 * Lightweight event for SavingThrowSystem / SpecialAbilityItem (ctrl skips dialogs).
 * @param {Event|null} sourceEvent
 */
export function createFadeRollEvent(sourceEvent = null) {
  const target = document.createElement('span');
  return {
    target,
    currentTarget: target,
    ctrlKey: Boolean(sourceEvent?.ctrlKey),
    preventDefault() {},
    stopPropagation() {}
  };
}

export function mapSaveCode(saveKey) {
  if (!saveKey) return null;
  return SAVE_CODE_MAP[saveKey] || saveKey;
}

/**
 * Find an explore specialAbility already on the actor by pack source id.
 * @param {Actor} actor
 * @param {string} skillKey request data-skill key
 * @returns {Item|null}
 */
export function findExploreItem(actor, skillKey) {
  const sourceId = EXPLORE_SOURCE_IDS[skillKey];
  if (!sourceId || !actor?.items) return null;

  return actor.items.find(item => {
    if (item.type !== 'specialAbility' || item.system?.category !== 'explore') return false;
    const candidates = [
      item.flags?.core?.sourceId,
      item._stats?.compendiumSource,
      item.id,
      item._id
    ].filter(Boolean);
    return candidates.some(c => String(c).includes(sourceId));
  }) || null;
}

/**
 * Roll an ability check via FaDe abilityCheck registry.
 * @param {Actor} actor
 * @param {string} ability
 * @param {Event|null} sourceEvent
 */
export async function rollAbilityCheck(actor, ability, sourceEvent = null) {
  await game.fade.registry.getSystem('abilityCheck').execute({
    actor,
    event: createAbilityCheckEvent(ability, sourceEvent)
  });
  return true;
}

/**
 * Roll a saving throw via FaDe savingThrowSystem.
 * @param {Actor} actor
 * @param {string} saveKey request save key (e.g. petrification)
 * @param {Event|null} sourceEvent
 */
export async function rollSavingThrow(actor, saveKey, sourceEvent = null) {
  await game.fade.registry.getSystem('savingThrowSystem').execute({
    actor,
    type: mapSaveCode(saveKey),
    event: createFadeRollEvent(sourceEvent)
  });
  return true;
}

/**
 * Roll an exploration specialAbility on the actor via item.roll().
 * @param {Actor} actor
 * @param {string} skillKey
 * @param {Event|null} sourceEvent
 */
export async function rollExploration(actor, skillKey, sourceEvent = null) {
  const item = findExploreItem(actor, skillKey);
  if (!item) {
    ui.notifications.warn(game.i18n.format('NOTIFY.ExploreAbilityMissing', { skill: skillKey }));
    return false;
  }
  const event = createFadeRollEvent(sourceEvent);
  const dataset = {
    test: 'specialAbility',
    label: `${item.name}`
  };
  await item.roll(dataset, null, event);
  return true;
}
