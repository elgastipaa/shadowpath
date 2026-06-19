/**
 * Game engine — top-level orchestrator.
 *
 * The engine owns:
 *   - Game state creation and setup
 *   - Turn management (SHADOW moves first by default)
 *   - Move application (with battle detection)
 *   - Battle phase orchestration (delegates to abilities.ts + battle.ts)
 *   - Victory checking
 *   - GameView projection (hides opponent's unrevealed positions)
 *
 * All state transitions are pure (no mutation). The caller is responsible for
 * persisting/broadcasting the new state.
 */

import type {
  GameState,
  GameView,
  LightCharId,
  ShadowCharId,
  RegionId,
  LightCardId,
  ShadowCardId,
  Side,
  BattleState,
  MoveResult,
  BattleResult,
  CardId,
} from './types';
import { ALL_LIGHT_CARDS, ALL_SHADOW_CARDS } from './cards';
import {
  getValidMoves,
  getAragornMoves,
  getWitchKingMoves,
  getFlyingNazgulMoves,
  getBlackRiderMoves,
  getCharsInRegion,
  canEnterRegion,
} from './movement';
import {
  resolveLightCharAbility,
  resolveShadowCharAbility,
  applySheLobTeleport,
  type AbilityResult,
} from './abilities';
import {
  resolveCards,
  applyBattleResult,
  discardBattleCards,
  checkAndRefillHands,
  resolveSarumanNoCards,
} from './battle';
import { checkVictory, checkStalemate } from './victory';
import { TUNNEL_OF_MORIA } from './board';

// ── Default starting positions ────────────────────────────────────────────────

export const LIGHT_START_REGIONS: Record<LightCharId, RegionId> = {
  // Hobbits start in The Shire
  frodo:   'the_shire',
  sam:     'the_shire',
  pippin:  'the_shire',
  merry:   'the_shire',
  // Warriors spread across the front row
  gandalf: 'arthedain',
  aragorn: 'cardolan',
  legolas: 'enedwaith',
  gimli:   'eregion',
  boromir: 'rhudaur',
};

export const SHADOW_START_REGIONS: Record<ShadowCharId, RegionId> = {
  // Main forces start near Mordor
  balrog:       'mordor',
  shelob:       'mordor',
  witch_king:   'mordor',
  flying_nazgul:'mordor',
  // Forward scouts
  orcs:         'gondor',
  warg:         'dagorlad',
  cave_troll:   'shelob_s_lair',
  black_rider:  'dagorlad',
  saruman:      'rohan',
};

// ── State creation ────────────────────────────────────────────────────────────

export function createInitialState(): GameState {
  return {
    lightPositions:  { ...LIGHT_START_REGIONS },
    shadowPositions: { ...SHADOW_START_REGIONS },
    revealedLight:   [],
    revealedShadow:  [],
    lightHand:       [...ALL_LIGHT_CARDS],
    shadowHand:      [...ALL_SHADOW_CARDS],
    lightDiscard:    [],
    shadowDiscard:   [],
    activeBattle:    null,
    currentTurn:     'SHADOW', // Shadow moves first
    status:          'SETUP',
    winner:          null,
    winReason:       null,
    lightSetupConfirmed:  false,
    shadowSetupConfirmed: false,
  };
}

// ── Setup phase ───────────────────────────────────────────────────────────────

/**
 * Validate that setup positions satisfy:
 * - Light: 4 hobbits in The Shire, 5 warriors one per front-row region
 * - Shadow: all 9 chars placed in valid starting regions
 */
export function validateSetupPositions(
  side: Side,
  positions: Record<string, RegionId>,
): { valid: boolean; error?: string } {
  if (side === 'LIGHT') {
    const hobbits: LightCharId[] = ['frodo', 'sam', 'pippin', 'merry'];
    for (const h of hobbits) {
      const pos = positions[h];
      if (pos !== 'the_shire' && pos !== 'bag_end' && pos !== 'bree') {
        return { valid: false, error: `${h} debe empezar en The Shire o sus sub-áreas` };
      }
    }
    const frontRow = new Set(['arthedain', 'cardolan', 'enedwaith', 'eregion', 'rhudaur']);
    const warriors: LightCharId[] = ['gandalf', 'aragorn', 'legolas', 'gimli', 'boromir'];
    const usedRegions = new Set<RegionId>();
    for (const w of warriors) {
      const pos = positions[w] as RegionId;
      if (!frontRow.has(pos)) {
        return { valid: false, error: `${w} debe empezar en la fila frontal de Light` };
      }
      if (usedRegions.has(pos)) {
        return { valid: false, error: `Solo un guerrero por región en la fila frontal (${pos} duplicado)` };
      }
      usedRegions.add(pos);
    }
  } else {
    // Shadow can start chars in mordor cluster or forward positions
    // Minimal validation: all chars must be placed
    const allShadow: ShadowCharId[] = [
      'balrog', 'shelob', 'witch_king', 'flying_nazgul',
      'black_rider', 'saruman', 'orcs', 'warg', 'cave_troll',
    ];
    for (const s of allShadow) {
      if (!positions[s]) {
        return { valid: false, error: `${s} no tiene posición asignada` };
      }
    }
  }
  return { valid: true };
}

export function confirmSetup(
  state: GameState,
  side: Side,
  positions: Record<string, RegionId>,
): GameState {
  const newState = { ...state };
  if (side === 'LIGHT') {
    newState.lightPositions  = positions as GameState['lightPositions'];
    newState.lightSetupConfirmed = true;
  } else {
    newState.shadowPositions = positions as GameState['shadowPositions'];
    newState.shadowSetupConfirmed = true;
  }

  if (newState.lightSetupConfirmed && newState.shadowSetupConfirmed) {
    newState.status = 'ACTIVE';
  }

  return newState;
}

// ── Move application ──────────────────────────────────────────────────────────

/**
 * Move a character from their current region to `to`.
 * Returns the new state and whether a battle was initiated.
 *
 * Preconditions (caller must verify):
 *   - It is `side`'s turn.
 *   - `charId` belongs to `side`.
 *   - `to` is a valid move destination for `charId`.
 */
export function applyMove(
  state: GameState,
  side: Side,
  charId: LightCharId | ShadowCharId,
  to: RegionId,
  isSpecial?: 'tunnel_of_moria',
): MoveResult {
  const log: string[] = [];
  let newState: GameState = {
    ...state,
    lightPositions:  { ...state.lightPositions  },
    shadowPositions: { ...state.shadowPositions },
  };

  const from = (side === 'LIGHT'
    ? state.lightPositions[charId as LightCharId]
    : state.shadowPositions[charId as ShadowCharId]) as RegionId;

  // Reveal character on move (characters are revealed when they move or attack)
  if (side === 'LIGHT') {
    newState.lightPositions[charId as LightCharId] = to;
    if (!newState.revealedLight.includes(charId as LightCharId)) {
      newState = { ...newState, revealedLight: [...newState.revealedLight, charId as LightCharId] };
    }
  } else {
    newState.shadowPositions[charId as ShadowCharId] = to;
    if (!newState.revealedShadow.includes(charId as ShadowCharId)) {
      newState = { ...newState, revealedShadow: [...newState.revealedShadow, charId as ShadowCharId] };
    }
  }

  log.push(`${charId} se mueve de ${from} a ${to}`);

  // Balrog tunnel intercept: check if Light used Tunnel of Moria
  if (side === 'LIGHT' && isSpecial === 'tunnel_of_moria') {
    log.push(`${charId} usa el Túnel de Moria (${TUNNEL_OF_MORIA.from} → ${TUNNEL_OF_MORIA.to})`);
    const balrogPos = state.shadowPositions.balrog;
    if (balrogPos === 'caradhras') {
      // Shadow may reveal Balrog to destroy the Light character
      // Return a special battle state for tunnel interception
      const battleState: BattleState = {
        region:  to,
        lightChar: charId as LightCharId,
        shadowChar: 'balrog',
        attacker: 'LIGHT',
        step: 'char_abilities',
        pendingBattles: [],
        log: [`Balrog intercepta el Túnel de Moria en Caradhras — ${charId} es eliminado`],
      };
      // Balrog intercept is automatic (Shadow chooses to reveal)
      // Mark Light char as eliminated
      newState = {
        ...newState,
        lightPositions: { ...newState.lightPositions, [charId]: null },
        revealedShadow: [...newState.revealedShadow, 'balrog' as ShadowCharId].filter(
          (v, i, a) => a.indexOf(v) === i
        ),
        activeBattle: battleState,
        status: 'BATTLE',
      };
      return { newState, battleInitiated: true, log: log.join('; ') };
    }
  }

  // Check for battle: does the destination have enemy characters?
  const opponentPositions = side === 'LIGHT' ? newState.shadowPositions : newState.lightPositions;
  const enemyCharsInDest = Object.entries(opponentPositions)
    .filter(([, r]) => r === to)
    .map(([id]) => id);

  if (enemyCharsInDest.length === 0) {
    // No battle — end turn
    newState = endTurn(newState);
    return { newState, battleInitiated: false, log: log.join('; ') };
  }

  // Battle initiated — pick first enemy to fight
  const enemyChar = enemyCharsInDest[0];
  const lightChar  = side === 'LIGHT' ? (charId as LightCharId) : (enemyChar as LightCharId);
  const shadowChar = side === 'LIGHT' ? (enemyChar as ShadowCharId) : (charId as ShadowCharId);

  const pendingBattles = enemyCharsInDest.slice(1).map(ec => ({
    lightChar:  side === 'LIGHT' ? lightChar  : (ec as LightCharId),
    shadowChar: side === 'LIGHT' ? (ec as ShadowCharId) : shadowChar,
  }));

  const battleState: BattleState = {
    region:      to,
    lightChar,
    shadowChar,
    attacker:    side,
    step:        'char_abilities',
    pendingBattles,
    log:         [`Batalla en ${to}: ${lightChar} vs ${shadowChar}`],
  };

  log.push(`Batalla iniciada en ${to}: ${lightChar} vs ${shadowChar}`);

  newState = {
    ...newState,
    activeBattle: battleState,
    status:       'BATTLE',
  };

  return { newState, battleInitiated: true, log: log.join('; ') };
}

// ── Battle phase: apply ability results ──────────────────────────────────────

/**
 * Resolve the character ability phase of the current battle.
 * Call after both players have seen the ability prompts.
 *
 * `lightRetreatedTo` / `shadowRetreatedTo` — if a retreat ability was used,
 * pass the chosen destination.
 */
export function applyAbilityPhase(
  state: GameState,
  opts: {
    samSwapped?: boolean;           // Sam swapped in for Frodo
    frodoRetreatedTo?: RegionId;
    pippinRetreatedTo?: RegionId;
    sarumanDeclaredNoCards?: boolean;
  } = {},
): { newState: GameState; abilityResult: AbilityResult; log: string[] } {
  const battle = state.activeBattle!;
  let { lightChar, shadowChar } = battle;
  const isLightAttacker  = battle.attacker === 'LIGHT';
  const isShadowAttacker = battle.attacker === 'SHADOW';
  const log: string[] = [];
  let newState = { ...state };

  // Sam swap
  if (opts.samSwapped && battle.lightChar === 'frodo') {
    lightChar = 'sam';
    log.push('Sam se interpone para proteger a Frodo (fuerza efectiva 5)');
    newState = {
      ...newState,
      activeBattle: {
        ...battle,
        lightChar: 'sam',
        log: [...battle.log, 'Sam reemplaza a Frodo en batalla'],
      },
    };
  }

  // Frodo sideways retreat
  if (opts.frodoRetreatedTo) {
    newState = {
      ...newState,
      lightPositions: { ...newState.lightPositions, frodo: opts.frodoRetreatedTo },
      activeBattle:   null,
      status:         'ACTIVE',
    };
    log.push(`Frodo se retira lateralmente a ${opts.frodoRetreatedTo}`);
    newState = endTurn(newState);
    return { newState, abilityResult: { log }, log };
  }

  // Pippin backward retreat
  if (opts.pippinRetreatedTo) {
    newState = {
      ...newState,
      lightPositions: { ...newState.lightPositions, pippin: opts.pippinRetreatedTo },
      activeBattle:   null,
      status:         'ACTIVE',
    };
    log.push(`Pippin se retira backward a ${opts.pippinRetreatedTo}`);
    newState = endTurn(newState);
    return { newState, abilityResult: { log }, log };
  }

  // Light ability
  const lightAbility = resolveLightCharAbility(
    lightChar, shadowChar, newState, battle, isLightAttacker
  );
  log.push(...lightAbility.log);

  if (lightAbility.lightDefeated || lightAbility.shadowDefeated) {
    // Immediate resolution
    newState = applyBattleResult(
      newState, lightChar, shadowChar,
      lightAbility.lightDefeated ?? false,
      lightAbility.shadowDefeated ?? false,
      false,
    );
    newState = finalizeBattle(newState, log);
    return { newState, abilityResult: lightAbility, log };
  }

  // Shadow ability
  const shadowAbility = resolveShadowCharAbility(
    lightChar, shadowChar, newState, battle, isShadowAttacker
  );
  log.push(...shadowAbility.log);

  if (shadowAbility.lightDefeated || shadowAbility.shadowDefeated) {
    newState = applyBattleResult(
      newState, lightChar, shadowChar,
      shadowAbility.lightDefeated ?? false,
      shadowAbility.shadowDefeated ?? false,
      false,
    );
    newState = finalizeBattle(newState, log);
    return { newState, abilityResult: shadowAbility, log };
  }

  // Saruman "no cards"
  if (opts.sarumanDeclaredNoCards && shadowChar === 'saruman') {
    // Both players must still choose and discard a card (handled separately),
    // but we resolve strength here with no card bonus.
    // Caller should supply dummy cards for discard purposes.
    const dummyLightCard: LightCardId = 'l_1';
    const dummyShadowCard: ShadowCardId = 's_1';
    const result = resolveSarumanNoCards(lightChar, shadowChar, dummyLightCard, dummyShadowCard);
    log.push(...result.log);
    newState = applyBattleResult(
      newState, lightChar, shadowChar,
      result.lightDefeated, result.shadowDefeated, false,
    );
    newState = finalizeBattle(newState, log);
    return { newState, abilityResult: { ...shadowAbility, ...result }, log };
  }

  // No immediate resolution — advance to card selection phase
  newState = {
    ...newState,
    activeBattle: {
      ...battle,
      lightChar,
      shadowChar,
      step: lightAbility.gandalfCardRevealOrder ? 'select_card' : 'select_card',
      log: [...battle.log, ...log],
    },
  };

  const mergedAbility: AbilityResult = {
    ...lightAbility,
    ...shadowAbility,
    log,
    gandalfCardRevealOrder: lightAbility.gandalfCardRevealOrder,
    sarumanNoCardsAvailable: shadowAbility.sarumanNoCardsAvailable,
  };

  return { newState, abilityResult: mergedAbility, log };
}

// ── Battle phase: apply cards ─────────────────────────────────────────────────

export function applyCardPhase(
  state: GameState,
  lightCard: LightCardId,
  shadowCard: ShadowCardId,
  opts: {
    lightMagicCard?: LightCardId;
    shadowMagicCard?: ShadowCardId;
  } = {},
): { newState: GameState; battleResult: BattleResult } {
  const battle = state.activeBattle!;
  const { lightChar, shadowChar, region } = battle;
  const log: string[] = [];

  const resolution = resolveCards(
    lightCard, shadowCard, lightChar, shadowChar, state, battle,
    opts.lightMagicCard, opts.shadowMagicCard,
  );
  log.push(...resolution.log);

  let newState = discardBattleCards(state, lightCard, shadowCard);

  if (resolution.retreated) {
    // Retreated — no character eliminated, but retreating char moves
    const retreatTo = resolution.retreatOptions?.[0]; // engine layer should prompt for choice
    newState = applyBattleResult(
      newState, lightChar, shadowChar,
      false, false, true,
      resolution.retreatedSide, retreatTo,
    );
    newState = finalizeBattle(newState, log);

    return {
      newState,
      battleResult: {
        newState,
        lightDefeated:  false,
        shadowDefeated: false,
        retreated:      true,
        retreatedSide:  resolution.retreatedSide,
        retreatedTo:    retreatTo,
        log,
      },
    };
  }

  // Apply character eliminations
  newState = applyBattleResult(
    newState, lightChar, shadowChar,
    resolution.lightDefeated, resolution.shadowDefeated, false,
  );

  // Shelob teleport (if Shadow won = lightDefeated only)
  if (shadowChar === 'shelob' && resolution.lightDefeated && !resolution.shadowDefeated) {
    const teleportDest = applySheLobTeleport(newState);
    newState = {
      ...newState,
      shadowPositions: {
        ...newState.shadowPositions,
        shelob: teleportDest,
      },
    };
    if (teleportDest) {
      log.push(`Shelob teleporta a Gondor`);
    } else {
      log.push(`Shelob no puede teleportar (Gondor lleno o con Light) — eliminada`);
    }
  }

  newState = finalizeBattle(newState, log);

  return {
    newState,
    battleResult: {
      newState,
      lightDefeated:  resolution.lightDefeated,
      shadowDefeated: resolution.shadowDefeated,
      retreated:      false,
      log,
    },
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function finalizeBattle(state: GameState, log: string[]): GameState {
  let newState = state;

  // Check victory
  const victory = checkVictory(newState);
  if (victory) {
    return {
      ...newState,
      activeBattle: null,
      status:       'ENDED',
      winner:       victory.winner,
      winReason:    victory.reason,
    };
  }

  // Handle pending battles (multiple enemies in same region)
  const battle = newState.activeBattle;
  if (battle && battle.pendingBattles.length > 0) {
    const [next, ...rest] = battle.pendingBattles;
    // Verify both chars still exist
    if (
      newState.lightPositions[next.lightChar] !== null &&
      newState.shadowPositions[next.shadowChar] !== null
    ) {
      return {
        ...newState,
        activeBattle: {
          ...battle,
          lightChar:       next.lightChar,
          shadowChar:      next.shadowChar,
          step:            'char_abilities',
          pendingBattles:  rest,
          log,
        },
      };
    }
  }

  // No more pending battles — refill hands if both empty and end turn
  newState = checkAndRefillHands({
    ...newState,
    activeBattle: null,
    status:       'ACTIVE',
  });

  return endTurn(newState);
}

function endTurn(state: GameState): GameState {
  const nextTurn: Side = state.currentTurn === 'LIGHT' ? 'SHADOW' : 'LIGHT';
  const newState = { ...state, currentTurn: nextTurn };

  // Check stalemate
  const stalemate = checkStalemate(newState);
  if (stalemate) {
    return {
      ...newState,
      status:    'ENDED',
      winner:    stalemate.winner,
      winReason: stalemate.reason,
    };
  }

  return newState;
}

// ── GameView projection ───────────────────────────────────────────────────────

/**
 * Project the full GameState into a side-specific view.
 * The opponent's unrevealed characters are hidden (position shown as null).
 * Only revealed opponent characters have their position shown.
 */
export function getGameView(state: GameState, side: Side): GameView {
  const isLight = side === 'LIGHT';

  // My positions (always full visibility)
  const myPositions: Record<string, RegionId | null> = isLight
    ? { ...state.lightPositions }
    : { ...state.shadowPositions };

  // Opponent positions — only show revealed ones
  const opponentAllPositions = isLight ? state.shadowPositions : state.lightPositions;
  const revealedOpponent     = isLight ? state.revealedShadow  : state.revealedLight;

  const opponentRevealedPositions: Record<string, RegionId | null> = {};
  const opponentHiddenCounts: Partial<Record<RegionId, number>> = {};

  for (const [charId, pos] of Object.entries(opponentAllPositions)) {
    if (!pos) {
      // Eliminated — show as null (opponent knows their own chars are dead)
      opponentRevealedPositions[charId] = null;
    } else if (revealedOpponent.includes(charId as never)) {
      opponentRevealedPositions[charId] = pos;
    } else {
      // Hidden — increment region count
      const count = opponentHiddenCounts[pos as RegionId] ?? 0;
      opponentHiddenCounts[pos as RegionId] = count + 1;
    }
  }

  const myHand: CardId[]    = isLight ? [...state.lightHand]    : [...state.shadowHand];
  const myDiscard: CardId[] = isLight ? [...state.lightDiscard] : [...state.shadowDiscard];
  const opponentDiscardCount = isLight ? state.shadowDiscard.length : state.lightDiscard.length;

  const mySetupConfirmed = isLight ? state.lightSetupConfirmed : state.shadowSetupConfirmed;

  return {
    mySide:                   side,
    currentTurn:              state.currentTurn,
    isMyTurn:                 state.currentTurn === side,
    status:                   state.status,
    myPositions,
    opponentRevealedPositions,
    opponentHiddenCounts,
    myHand,
    myDiscard,
    opponentDiscardCount,
    activeBattle:             state.activeBattle,
    winner:                   state.winner,
    winReason:                state.winReason,
    mySetupConfirmed,
  };
}

// ── Public query helpers ──────────────────────────────────────────────────────

/**
 * Returns all valid moves for a character, including ability-based moves.
 */
export function getMovesForChar(
  state: GameState,
  side: Side,
  charId: LightCharId | ShadowCharId,
) {
  if (side === 'LIGHT' && charId === 'aragorn')        return getAragornMoves(state);
  if (side === 'SHADOW' && charId === 'witch_king')     return getWitchKingMoves(state);
  if (side === 'SHADOW' && charId === 'flying_nazgul')  return getFlyingNazgulMoves(state);
  if (side === 'SHADOW' && charId === 'black_rider')    return getBlackRiderMoves(state);
  return getValidMoves(charId, side, state);
}
