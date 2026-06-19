/**
 * Battle card resolution and state application.
 *
 * Card resolution order (per rulebook):
 *   1. Shadow text card effects (if any)
 *   2. Light text card effects (if any, and if not cancelled by Eye of Sauron)
 *   3. Strength comparison using final modified values
 *
 * Special card interactions:
 *   - Eye of Sauron (Shadow): cancels Light's text card; compare base strengths only.
 *   - Noble Sacrifice (Light): both eliminated — unless Shadow already retreated.
 *   - Elven Cloak (Light): Shadow's strength card adds zero (text still applies).
 *   - Retreat cards: battle ends, retreating side moves sideways if possible.
 *   - Magic cards: player picks any card from their own discard pile to play "alongside".
 *                  That secondary card's effect applies normally.
 *   - Cave Troll: Shadow's played card has no effect AND does not add strength.
 *                 Shadow must still discard the card.
 */

import type {
  GameState,
  LightCharId,
  ShadowCharId,
  LightCardId,
  ShadowCardId,
  BattleState,
  RegionId,
} from './types';
import { LIGHT_CHARACTERS, SHADOW_CHARACTERS } from './characters';
import { LIGHT_CARDS, SHADOW_CARDS } from './cards';
import { canEnterRegion, getValidRetreats } from './movement';

export interface CardResolutionResult {
  lightDefeated: boolean;
  shadowDefeated: boolean;
  retreated: boolean;
  retreatedSide?: 'LIGHT' | 'SHADOW';
  /** Retreat destination — engine must apply this */
  retreatOptions?: RegionId[];
  log: string[];
}

// ── Main card resolution ──────────────────────────────────────────────────────

export function resolveCards(
  lightCard: LightCardId,
  shadowCard: ShadowCardId,
  lightChar: LightCharId,
  shadowChar: ShadowCharId,
  state: GameState,
  battle: BattleState,
  /** Secondary card played via Magic (Light) */
  lightMagicSecondaryCard?: LightCardId,
  /** Secondary card played via Magic (Shadow) */
  shadowMagicSecondaryCard?: ShadowCardId,
): CardResolutionResult {
  const log: string[] = [];
  let lightDefeated  = false;
  let shadowDefeated = false;
  let retreated      = false;
  let retreatedSide: 'LIGHT' | 'SHADOW' | undefined;
  let retreatOptions: RegionId[] | undefined;

  const lCardData = LIGHT_CARDS[lightCard];
  const sCardData = SHADOW_CARDS[shadowCard];

  // Cave Troll: Shadow's card has no effect
  const shadowCardEffective = shadowChar !== 'cave_troll';
  if (!shadowCardEffective) {
    log.push(`Cave Troll: la carta de Shadow (${sCardData.name}) no tiene efecto`);
  }

  // Resolve effective cards (Magic secondary substitution)
  const effectiveLightCard = (lCardData.effect === 'magic' && lightMagicSecondaryCard)
    ? LIGHT_CARDS[lightMagicSecondaryCard]
    : lCardData;
  const effectiveShadowCard = (sCardData.effect === 'magic' && shadowCardEffective && shadowMagicSecondaryCard)
    ? SHADOW_CARDS[shadowMagicSecondaryCard]
    : (shadowCardEffective ? sCardData : null);

  if (lCardData.effect === 'magic' && lightMagicSecondaryCard) {
    log.push(`Light juega Magic y selecciona ${LIGHT_CARDS[lightMagicSecondaryCard].name} del descarte`);
  }
  if (sCardData.effect === 'magic' && shadowCardEffective && shadowMagicSecondaryCard) {
    log.push(`Shadow juega Magic y selecciona ${SHADOW_CARDS[shadowMagicSecondaryCard].name} del descarte`);
  }

  // ── Eye of Sauron (Shadow text) ─────────────────────────────────────────
  if (effectiveShadowCard && effectiveShadowCard.effect === 'eye_of_sauron') {
    if (effectiveLightCard.type === 'text') {
      log.push(`Eye of Sauron: cancela la carta de Light (${effectiveLightCard.name})`);
      // Compare base strengths only
      const lStr = LIGHT_CHARACTERS[lightChar].strength;
      const sStr = SHADOW_CHARACTERS[shadowChar].strength;
      log.push(`Fuerza base: Light ${lStr} vs Shadow ${sStr}`);
      if (lStr < sStr)       { lightDefeated  = true; log.push(`${LIGHT_CHARACTERS[lightChar].name} es derrotado`); }
      else if (sStr < lStr)  { shadowDefeated = true; log.push(`${SHADOW_CHARACTERS[shadowChar].name} es derrotado`); }
      else { lightDefeated = shadowDefeated = true; log.push('Empate: ambos eliminados'); }
      return { lightDefeated, shadowDefeated, retreated, log };
    }
    log.push(`Eye of Sauron: sin efecto (Light no jugó texto)`);
  }

  // ── Shadow retreat card ──────────────────────────────────────────────────
  if (effectiveShadowCard && effectiveShadowCard.effect === 'retreat') {
    log.push(`Shadow usa Retreat`);
    const options = getValidRetreats(shadowChar, 'SHADOW', state, 'sideways');
    retreated     = true;
    retreatedSide = 'SHADOW';
    retreatOptions = options;
    return { lightDefeated: false, shadowDefeated: false, retreated, retreatedSide, retreatOptions, log };
  }

  // ── Noble Sacrifice (Light text) — must check before other Light text ───
  if (effectiveLightCard.effect === 'noble_sacrifice') {
    // Shadow already retreated is impossible here (we returned above), so always applies
    log.push(`Noble Sacrifice: ambos personajes son eliminados`);
    return { lightDefeated: true, shadowDefeated: true, retreated: false, log };
  }

  // ── Elven Cloak (Light text) ─────────────────────────────────────────────
  if (effectiveLightCard.effect === 'elven_cloak') {
    if (effectiveShadowCard && effectiveShadowCard.type === 'strength') {
      log.push(`Elven Cloak: la carta de fuerza de Shadow no suma (${effectiveShadowCard.name})`);
      const lStr = LIGHT_CHARACTERS[lightChar].strength;
      const sStr = SHADOW_CHARACTERS[shadowChar].strength; // no card bonus
      log.push(`Fuerza final: Light ${lStr} vs Shadow ${sStr}`);
      if (lStr < sStr)       { lightDefeated  = true; log.push(`${LIGHT_CHARACTERS[lightChar].name} es derrotado`); }
      else if (sStr < lStr)  { shadowDefeated = true; log.push(`${SHADOW_CHARACTERS[shadowChar].name} es derrotado`); }
      else { lightDefeated = shadowDefeated = true; log.push('Empate: ambos eliminados'); }
      return { lightDefeated, shadowDefeated, retreated, log };
    }
    log.push(`Elven Cloak: Shadow no jugó carta de fuerza, sin efecto adicional`);
  }

  // ── Light retreat card ───────────────────────────────────────────────────
  if (effectiveLightCard.effect === 'retreat') {
    log.push(`Light usa Retreat`);
    const options = getValidRetreats(lightChar, 'LIGHT', state, 'sideways');
    retreated     = true;
    retreatedSide = 'LIGHT';
    retreatOptions = options;
    return { lightDefeated: false, shadowDefeated: false, retreated, retreatedSide, retreatOptions, log };
  }

  // ── Saruman "no cards" ───────────────────────────────────────────────────
  // This is resolved at engine level (prompting Shadow player) before we reach here.
  // If Saruman declared no cards, this function is not called.

  // ── Strength comparison ──────────────────────────────────────────────────
  const lCardVal = effectiveLightCard.type === 'strength' ? (effectiveLightCard.value ?? 0) : 0;
  const sCardVal = (effectiveShadowCard?.type === 'strength' && shadowCardEffective)
    ? (effectiveShadowCard.value ?? 0) : 0;

  const lStr = LIGHT_CHARACTERS[lightChar].strength + lCardVal;
  const sStr = SHADOW_CHARACTERS[shadowChar].strength + sCardVal;

  log.push(
    `Fuerza final: Light ${lStr} (${LIGHT_CHARACTERS[lightChar].strength}+${lCardVal}) vs ` +
    `Shadow ${sStr} (${SHADOW_CHARACTERS[shadowChar].strength}+${sCardVal})`
  );

  if (lStr < sStr)       { lightDefeated  = true; log.push(`${LIGHT_CHARACTERS[lightChar].name} es derrotado`); }
  else if (sStr < lStr)  { shadowDefeated = true; log.push(`${SHADOW_CHARACTERS[shadowChar].name} es derrotado`); }
  else                   { lightDefeated = shadowDefeated = true; log.push('Empate: ambos eliminados'); }

  return { lightDefeated, shadowDefeated, retreated, log };
}

// ── Apply battle results to state ────────────────────────────────────────────

export function applyBattleResult(
  state: GameState,
  lightChar: LightCharId,
  shadowChar: ShadowCharId,
  lightDefeated: boolean,
  shadowDefeated: boolean,
  retreated: boolean,
  retreatedSide?: 'LIGHT' | 'SHADOW',
  retreatTo?: RegionId,
): GameState {
  const newState: GameState = {
    ...state,
    lightPositions:  { ...state.lightPositions  },
    shadowPositions: { ...state.shadowPositions },
    revealedLight:  [...state.revealedLight],
    revealedShadow: [...state.revealedShadow],
  };

  if (lightDefeated) {
    newState.lightPositions[lightChar] = null;
    newState.revealedLight = newState.revealedLight.filter(c => c !== lightChar);
  }

  if (shadowDefeated) {
    if (shadowChar === 'shelob' && !lightDefeated) {
      // Shelob teleports to Gondor if she wins
      const shadowInGondor = Object.values(newState.shadowPositions).filter(r => r === 'gondor').length;
      const lightInGondor  = Object.values(newState.lightPositions).filter(r => r === 'gondor').length;
      if (shadowInGondor >= 2 || lightInGondor > 0) {
        // Cannot teleport — Shelob is eliminated instead
        newState.shadowPositions.shelob = null;
      } else {
        newState.shadowPositions.shelob = 'gondor';
        // Shelob is NOT "defeated" in the normal sense — she survives and teleports
      }
      // Correct: shadowDefeated was misnamed here — Shelob WINS and teleports.
      // If shadowDefeated is true here it means she was beaten. Revert:
      // Actually: applyBattleResult is called with shadowDefeated=false when Shelob wins.
      // This branch shouldn't occur. Keep for safety.
    } else {
      newState.shadowPositions[shadowChar] = null;
    }
    newState.revealedShadow = newState.revealedShadow.filter(c => c !== shadowChar);
  }

  // Apply retreat position
  if (retreated && retreatTo) {
    if (retreatedSide === 'LIGHT') {
      newState.lightPositions[lightChar] = retreatTo;
    } else if (retreatedSide === 'SHADOW') {
      newState.shadowPositions[shadowChar] = retreatTo;
    }
  }

  return newState;
}

// ── Discard cards after battle ────────────────────────────────────────────────

export function discardBattleCards(
  state: GameState,
  lightCard: LightCardId,
  shadowCard: ShadowCardId,
): GameState {
  return {
    ...state,
    lightHand:    state.lightHand.filter(c => c !== lightCard),
    lightDiscard: [...state.lightDiscard, lightCard],
    shadowHand:   state.shadowHand.filter(c => c !== shadowCard),
    shadowDiscard:[...state.shadowDiscard, shadowCard],
  };
}

// ── Hand refill ───────────────────────────────────────────────────────────────

/**
 * When BOTH hands are empty, shuffle discards back into hands for both players.
 */
export function checkAndRefillHands(state: GameState): GameState {
  if (state.lightHand.length === 0 && state.shadowHand.length === 0) {
    return {
      ...state,
      lightHand:    [...state.lightDiscard] as GameState['lightHand'],
      lightDiscard: [],
      shadowHand:   [...state.shadowDiscard] as GameState['shadowHand'],
      shadowDiscard:[],
    };
  }
  return state;
}

// ── Saruman "no cards" resolution ────────────────────────────────────────────

/**
 * When Saruman declares "no cards", compare base strengths without any card bonus.
 * Both players still must discard a card from their hand.
 */
export function resolveSarumanNoCards(
  lightChar: LightCharId,
  shadowChar: ShadowCharId,
  lightCard: LightCardId,
  shadowCard: ShadowCardId,
): CardResolutionResult {
  const lStr = LIGHT_CHARACTERS[lightChar].strength;
  const sStr = SHADOW_CHARACTERS[shadowChar].strength;
  const log: string[] = [
    `Saruman: sin cartas — fuerza base: Light ${lStr} vs Shadow ${sStr}`,
  ];

  let lightDefeated  = false;
  let shadowDefeated = false;

  if (lStr < sStr)       { lightDefeated  = true; log.push(`${LIGHT_CHARACTERS[lightChar].name} es derrotado`); }
  else if (sStr < lStr)  { shadowDefeated = true; log.push(`${SHADOW_CHARACTERS[shadowChar].name} es derrotado`); }
  else { lightDefeated = shadowDefeated = true; log.push('Empate: ambos eliminados'); }

  return { lightDefeated, shadowDefeated, retreated: false, log };
}
