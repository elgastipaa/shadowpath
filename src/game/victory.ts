import type { GameState, VictoryResult, Side } from './types';
import { getValidMoves, getAragornMoves, getWitchKingMoves } from './movement';

/**
 * Victory conditions (checked after every move/battle):
 *
 * LIGHT wins if:
 *   1. Frodo reaches Mordor (any Mordor sub-region counts).
 *
 * SHADOW wins if:
 *   2. Frodo is eliminated.
 *   3. Three or more Shadow characters are in The Shire simultaneously.
 *
 * Draw / stalemate:
 *   4. If the active player has no legal moves, they lose.
 *      (Rare — only apply if no character can move AND no battle is ongoing.)
 */
export function checkVictory(state: GameState): VictoryResult | null {
  // 1. Frodo reaches Mordor (including home sub-areas)
  const frodoPos = state.lightPositions.frodo;
  if (frodoPos === 'mordor' || frodoPos === 'barad_dur' || frodoPos === 'mount_doom') {
    return { winner: 'LIGHT', reason: 'Frodo ha llegado a Mordor — ¡La Comunidad gana!' };
  }

  // 2. Frodo is eliminated
  if (frodoPos === null) {
    return { winner: 'SHADOW', reason: 'Frodo fue derrotado — Sauron gana' };
  }

  // 3. Three or more Shadow characters have invaded The Shire
  const shadowInShire = Object.values(state.shadowPositions)
    .filter(r => r === 'the_shire' || r === 'bag_end' || r === 'bree')
    .length;
  if (shadowInShire >= 3) {
    return {
      winner: 'SHADOW',
      reason: `${shadowInShire} fuerzas de Sauron han invadido el Shire — Sauron gana`,
    };
  }

  return null;
}

/**
 * Check whether the given side has at least one legal move.
 * Used to detect stalemate (no moves → that side loses).
 */
export function hasValidMoves(side: Side, state: GameState): boolean {
  const positions = side === 'LIGHT' ? state.lightPositions : state.shadowPositions;

  for (const charId of Object.keys(positions)) {
    const pos = positions[charId as keyof typeof positions];
    if (!pos) continue; // eliminated

    // Use ability-specific move helpers for special characters
    if (side === 'LIGHT' && charId === 'aragorn') {
      if (getAragornMoves(state).length > 0) return true;
      continue;
    }
    if (side === 'SHADOW' && charId === 'witch_king') {
      if (getWitchKingMoves(state).length > 0) return true;
      continue;
    }

    const moves = getValidMoves(charId as never, side, state);
    if (moves.length > 0) return true;
  }

  return false;
}

/**
 * Check stalemate victory: if the current player has no moves, they lose.
 * Call this AFTER switching turns (i.e., check if the new `currentTurn` player
 * has moves).
 */
export function checkStalemate(state: GameState): VictoryResult | null {
  if (!hasValidMoves(state.currentTurn, state)) {
    const loser  = state.currentTurn;
    const winner: Side = loser === 'LIGHT' ? 'SHADOW' : 'LIGHT';
    return {
      winner,
      reason: `${loser} no tiene movimientos legales — ${winner} gana`,
    };
  }
  return null;
}
