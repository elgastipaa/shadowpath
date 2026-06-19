import type { GameState, RegionId, Side, LightCharId, ShadowCharId } from './types';
import {
  CONNECTIONS,
  isMountain,
  getCharLimit,
  isForwardMove,
  isSidewaysMove,
  getAnduinMoves,
  canUseTunnelOfMoria,
  TUNNEL_OF_MORIA,
  REGION_DEPTH,
} from './board';

export interface ValidMove {
  to: RegionId;
  isSpecial?: 'anduin' | 'tunnel_of_moria' | 'aragorn' | 'witch_king' | 'flying_nazgul' | 'black_rider';
}

// ── Core capacity check ───────────────────────────────────────────────────────

export function canEnterRegion(region: RegionId, side: Side, state: GameState): boolean {
  const positions = side === 'LIGHT' ? state.lightPositions : state.shadowPositions;
  const count = Object.values(positions).filter(r => r === region).length;
  return count < getCharLimit(region);
}

// ── Characters in a region ────────────────────────────────────────────────────

export function getCharsInRegion<T extends LightCharId | ShadowCharId>(
  regionId: RegionId,
  positions: Record<T, RegionId | null>,
): T[] {
  return (Object.entries(positions) as [T, RegionId | null][])
    .filter(([, r]) => r === regionId)
    .map(([id]) => id);
}

// ── Standard valid moves ──────────────────────────────────────────────────────

/**
 * Returns all valid forward moves for a character.
 * Does NOT include ability-based moves (Aragorn, Witch-king, Flying Nazgûl,
 * Black Rider) — those are returned by their dedicated helpers.
 */
export function getValidMoves(
  charId: LightCharId | ShadowCharId,
  side: Side,
  state: GameState,
): ValidMove[] {
  const positions = side === 'LIGHT' ? state.lightPositions : state.shadowPositions;
  const currentRegion = positions[charId as keyof typeof positions] as RegionId | null;
  if (!currentRegion) return [];

  const results: ValidMove[] = [];
  const inMountain = isMountain(currentRegion);

  for (const to of CONNECTIONS[currentRegion] ?? []) {
    if (!isForwardMove(currentRegion, to, side)) continue; // must move forward
    if (inMountain && isSidewaysMove(currentRegion, to)) continue; // no lateral from mountain
    if (!canEnterRegion(to, side, state)) continue; // capacity
    results.push({ to });
  }

  // Anduin river (Light only)
  if (side === 'LIGHT') {
    for (const to of getAnduinMoves(currentRegion, side)) {
      if (canEnterRegion(to, side, state)) {
        if (!results.find(m => m.to === to)) {
          results.push({ to, isSpecial: 'anduin' });
        }
      }
    }

    // Tunnel of Moria (Light only, Eregion → Fangorn)
    if (canUseTunnelOfMoria(currentRegion, side)) {
      const to = TUNNEL_OF_MORIA.to;
      if (canEnterRegion(to, side, state)) {
        if (!results.find(m => m.to === to)) {
          results.push({ to, isSpecial: 'tunnel_of_moria' });
        }
      }
    }
  }

  return results;
}

// ── Aragorn: may move to any adjacent region when attacking ──────────────────

/**
 * Aragorn can move to any adjacent region (forward, lateral, backward) if he
 * is going to attack (i.e., there is a Shadow character in the target).
 * Cannot move laterally in mountains.
 */
export function getAragornMoves(state: GameState): ValidMove[] {
  const currentRegion = state.lightPositions.aragorn;
  if (!currentRegion) return [];

  const inMountain = isMountain(currentRegion);
  const results: ValidMove[] = [];

  for (const to of CONNECTIONS[currentRegion] ?? []) {
    if (inMountain && isSidewaysMove(currentRegion, to)) continue;
    if (!canEnterRegion(to, 'LIGHT', state)) continue;
    // Aragorn can attack (non-forward) or move normally forward
    const hasEnemyInTarget = Object.values(state.shadowPositions).some(r => r === to);
    const isForward = isForwardMove(currentRegion, to, 'LIGHT');
    if (!isForward && !hasEnemyInTarget) continue; // non-forward only if attacking
    results.push({ to, isSpecial: isForward ? undefined : 'aragorn' });
  }

  return results;
}

// ── Witch-king: may move laterally when attacking ────────────────────────────

/**
 * Witch-king may move laterally (sideways) when attacking.
 * No lateral in mountains.
 */
export function getWitchKingMoves(state: GameState): ValidMove[] {
  const currentRegion = state.shadowPositions.witch_king;
  if (!currentRegion) return [];

  const inMountain = isMountain(currentRegion);
  const results: ValidMove[] = [];

  for (const to of CONNECTIONS[currentRegion] ?? []) {
    if (inMountain && isSidewaysMove(currentRegion, to)) continue;
    if (!canEnterRegion(to, 'SHADOW', state)) continue;
    const hasEnemyInTarget = Object.values(state.lightPositions).some(r => r === to);
    const isForward = isForwardMove(currentRegion, to, 'SHADOW');
    if (!isForward && !hasEnemyInTarget) continue; // lateral only when attacking
    results.push({ to, isSpecial: isForward ? undefined : 'witch_king' });
  }

  return results;
}

// ── Flying Nazgûl: can move to any region with exactly one Light character ───

/**
 * Flying Nazgûl may move to:
 * 1. Any region on the board with exactly one Light character (forward move overall).
 * 2. Any adjacent mountain with exactly one Light character (lateral is allowed).
 * Otherwise, standard forward movement.
 */
export function getFlyingNazgulMoves(state: GameState): ValidMove[] {
  const currentRegion = state.shadowPositions.flying_nazgul;
  if (!currentRegion) return [];

  const results: ValidMove[] = [];

  // Standard forward moves
  for (const to of CONNECTIONS[currentRegion] ?? []) {
    if (!isForwardMove(currentRegion, to, 'SHADOW')) continue;
    if (!canEnterRegion(to, 'SHADOW', state)) continue;
    results.push({ to });
  }

  // Special: any region with exactly one Light char (must still be "forward" in broad sense)
  for (const [regionId, regionData] of Object.entries(state.lightPositions)) {
    void regionId; // key not needed directly
    const to = regionData as RegionId | null;
    if (!to) continue;
    const lightCount = Object.values(state.lightPositions).filter(r => r === to).length;
    if (lightCount !== 1) continue;
    if (!canEnterRegion(to, 'SHADOW', state)) continue;
    if (REGION_DEPTH[to] >= REGION_DEPTH[currentRegion]) continue; // must be forward (lower depth)
    if (!results.find(m => m.to === to)) {
      results.push({ to, isSpecial: 'flying_nazgul' });
    }
  }

  // Special: adjacent mountain with one Light char (lateral allowed)
  for (const to of CONNECTIONS[currentRegion] ?? []) {
    if (!isMountain(to)) continue;
    const lightCount = Object.values(state.lightPositions).filter(r => r === to).length;
    if (lightCount !== 1) continue;
    if (!canEnterRegion(to, 'SHADOW', state)) continue;
    if (!results.find(m => m.to === to)) {
      results.push({ to, isSpecial: 'flying_nazgul' });
    }
  }

  return results;
}

// ── Black Rider: multi-hop forward to reach Light ────────────────────────────

/**
 * Black Rider may move forward through any number of regions to attack a region
 * with Light characters. Cannot pass through a region with 2 Shadow chars or
 * any Light chars. Cannot enter a full region.
 */
export function getBlackRiderMoves(state: GameState): ValidMove[] {
  const currentRegion = state.shadowPositions.black_rider;
  if (!currentRegion) return [];

  const results: ValidMove[] = [];

  // BFS/DFS forward, tracking passable path
  const visited = new Set<RegionId>([currentRegion]);

  function dfs(region: RegionId): void {
    for (const to of CONNECTIONS[region] ?? []) {
      if (visited.has(to)) continue;
      if (!isForwardMove(region, to, 'SHADOW')) continue;

      visited.add(to);

      const shadowCount = Object.values(state.shadowPositions).filter(r => r === to).length;
      const lightCount  = Object.values(state.lightPositions).filter(r => r === to).length;

      if (lightCount > 0) {
        // Can attack here if there's capacity
        if (canEnterRegion(to, 'SHADOW', state)) {
          if (!results.find(m => m.to === to)) {
            results.push({ to, isSpecial: 'black_rider' });
          }
        }
        // Cannot pass through a region with Light chars
      } else if (shadowCount < 2) {
        // Empty or has 1 Shadow: can pass through (and also stop here normally)
        if (canEnterRegion(to, 'SHADOW', state)) {
          if (!results.find(m => m.to === to)) {
            results.push({ to }); // standard stop
          }
        }
        dfs(to); // can pass through
      }
      // shadowCount === 2: cannot pass through, cannot stop
    }
  }

  dfs(currentRegion);
  return results;
}

// ── Retreat helpers ───────────────────────────────────────────────────────────

/**
 * Returns regions a character can retreat to during battle.
 * @param direction - 'backward' (toward own home), 'sideways' (same depth), 'forward' (toward enemy home)
 * Retreating character cannot enter:
 *  - A region occupied by any enemy character
 *  - A full region
 *  - Lateral from a mountain
 */
export function getValidRetreats(
  charId: LightCharId | ShadowCharId,
  side: Side,
  state: GameState,
  direction: 'backward' | 'sideways' | 'forward',
): RegionId[] {
  const positions         = side === 'LIGHT' ? state.lightPositions : state.shadowPositions;
  const opponentPositions = side === 'LIGHT' ? state.shadowPositions : state.lightPositions;
  const currentRegion = positions[charId as keyof typeof positions] as RegionId | null;
  if (!currentRegion) return [];

  const inMountain = isMountain(currentRegion);
  const results: RegionId[] = [];

  for (const to of CONNECTIONS[currentRegion] ?? []) {
    // Cannot retreat to enemy-occupied region
    const enemiesInTarget = Object.values(opponentPositions).filter(r => r === to).length;
    if (enemiesInTarget > 0) continue;
    // Cannot enter full region
    if (!canEnterRegion(to, side, state)) continue;
    // No lateral from mountain
    if (inMountain && isSidewaysMove(currentRegion, to)) continue;

    const forward   = isForwardMove(currentRegion, to, side);
    const sideways  = isSidewaysMove(currentRegion, to);
    const backward  = !forward && !sideways;

    if (direction === 'backward' && backward)  results.push(to);
    if (direction === 'sideways' && sideways)  results.push(to);
    if (direction === 'forward'  && forward)   results.push(to);
  }

  return results;
}
