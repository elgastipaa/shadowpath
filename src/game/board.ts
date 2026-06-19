/**
 * Board topology for Shadowpath — Classic edition (16 regions).
 *
 * Layout (depth 0 = Shire, depth 10 = Mordor):
 *   Depth  0:  [THE SHIRE]                                 — Light home (4 chars)
 *   Depth  2:  [ARTHEDAIN] [CARDOLAN] [ENEDWAITH] [EREGION] [RHUDAUR]  — Light front row
 *   Depth  4:  [THE HIGH PASS] [CARADHRAS] [MISTY MOUNTAINS] [GAP OF ROHAN]  — mountains (limit 1)
 *   Depth  6:  [MIRKWOOD] [FANGORN] [ROHAN]               — middle band
 *   Depth  8:  [GONDOR] [DAGORLAD]                        — Shadow front row
 *   Depth 10:  [MORDOR]                                   — Shadow home (4 chars)
 *
 * Special moves (Light only):
 *   Anduin River:    Mirkwood → Fangorn → Rohan
 *   Tunnel of Moria: Eregion → Fangorn (Balrog in Caradhras can intercept)
 *
 * Screen positions (left%, top%) derived from the real board image.
 * The board image has Mordor at top-left and The Shire at bottom-right.
 */

import type { RegionId, Side } from './types';

export interface RegionData {
  id: RegionId;
  name: string;
  type: 'normal' | 'mountain' | 'home';
  side?: Side;
  charLimit: number;
}

export const REGIONS: Record<RegionId, RegionData> = {
  // ── Light home ────────────────────────────────────────────────────────────
  the_shire: { id: 'the_shire', name: 'The Shire', type: 'home', side: 'LIGHT', charLimit: 4 },

  // ── Light front row (depth 2) ─────────────────────────────────────────────
  arthedain: { id: 'arthedain', name: 'Arthedain',  type: 'normal', charLimit: 2 },
  cardolan:  { id: 'cardolan',  name: 'Cardolan',   type: 'normal', charLimit: 2 },
  enedwaith: { id: 'enedwaith', name: 'Enedwaith',  type: 'normal', charLimit: 2 },
  eregion:   { id: 'eregion',   name: 'Eregion',    type: 'normal', charLimit: 2 },
  rhudaur:   { id: 'rhudaur',   name: 'Rhudaur',    type: 'normal', charLimit: 2 },

  // ── Mountain row (depth 4) ────────────────────────────────────────────────
  the_high_pass:   { id: 'the_high_pass',   name: 'The High Pass',   type: 'mountain', charLimit: 1 },
  caradhras:       { id: 'caradhras',       name: 'Caradhras',       type: 'mountain', charLimit: 1 },
  misty_mountains: { id: 'misty_mountains', name: 'Misty Mountains', type: 'mountain', charLimit: 1 },
  gap_of_rohan:    { id: 'gap_of_rohan',    name: 'Gap of Rohan',    type: 'mountain', charLimit: 1 },

  // ── Middle band (depth 6) ─────────────────────────────────────────────────
  mirkwood: { id: 'mirkwood', name: 'Mirkwood', type: 'normal', charLimit: 2 },
  fangorn:  { id: 'fangorn',  name: 'Fangorn',  type: 'normal', charLimit: 2 },
  rohan:    { id: 'rohan',    name: 'Rohan',    type: 'normal', charLimit: 2 },

  // ── Shadow front row (depth 8) ────────────────────────────────────────────
  gondor:   { id: 'gondor',   name: 'Gondor',   type: 'normal', charLimit: 2 },
  dagorlad: { id: 'dagorlad', name: 'Dagorlad', type: 'normal', charLimit: 2 },

  // ── Shadow home ────────────────────────────────────────────────────────────
  mordor: { id: 'mordor', name: 'Mordor', type: 'home', side: 'SHADOW', charLimit: 4 },
};

/**
 * Adjacency graph (bidirectional). Classic game topology.
 *
 * Columns from Light's perspective (northern → southern):
 *   N: arthedain  → the_high_pass → mirkwood  → dagorlad
 *  NC: cardolan   → caradhras     → fangorn   → (gondor, dagorlad)
 *   C: enedwaith  → caradhras     → fangorn   → gondor
 *  SC: eregion    → misty_mountains→ fangorn  → gondor
 *   S: rhudaur    → gap_of_rohan  → rohan     → gondor
 */
export const CONNECTIONS: Record<RegionId, RegionId[]> = {
  the_shire: ['arthedain', 'cardolan', 'enedwaith', 'eregion', 'rhudaur'],

  // Light front row — sideways + one mountain forward each
  arthedain: ['the_shire', 'cardolan', 'the_high_pass'],
  cardolan:  ['the_shire', 'arthedain', 'enedwaith', 'caradhras'],
  enedwaith: ['the_shire', 'cardolan', 'eregion', 'caradhras', 'misty_mountains'],
  eregion:   ['the_shire', 'enedwaith', 'rhudaur', 'misty_mountains'],
  rhudaur:   ['the_shire', 'eregion', 'gap_of_rohan'],

  // Mountain row
  the_high_pass:   ['arthedain', 'caradhras', 'mirkwood'],
  caradhras:       ['cardolan', 'enedwaith', 'the_high_pass', 'misty_mountains', 'fangorn'],
  misty_mountains: ['enedwaith', 'eregion', 'caradhras', 'gap_of_rohan', 'fangorn'],
  gap_of_rohan:    ['rhudaur', 'misty_mountains', 'rohan'],

  // Middle band — each connects back to mountain(s) + sideways + forward to shadow front
  mirkwood: ['the_high_pass', 'fangorn', 'dagorlad'],
  fangorn:  ['caradhras', 'misty_mountains', 'mirkwood', 'rohan', 'gondor'],
  rohan:    ['gap_of_rohan', 'fangorn', 'gondor'],

  // Shadow front row
  dagorlad: ['mirkwood', 'gondor', 'mordor'],
  gondor:   ['fangorn', 'rohan', 'dagorlad', 'mordor'],

  // Shadow home
  mordor: ['dagorlad', 'gondor'],
};

/**
 * Region depth: 0 = The Shire (Light home), 10 = Mordor (Shadow home).
 * Light moves forward = increasing depth.
 * Shadow moves forward = decreasing depth.
 */
export const REGION_DEPTH: Record<RegionId, number> = {
  the_shire:       0,
  arthedain:       2,
  cardolan:        2,
  enedwaith:       2,
  eregion:         2,
  rhudaur:         2,
  the_high_pass:   4,
  caradhras:       4,
  misty_mountains: 4,
  gap_of_rohan:    4,
  mirkwood:        6,
  fangorn:         6,
  rohan:           6,
  dagorlad:        8,
  gondor:          8,
  mordor:          10,
};

// ── Anduin River (Light-only, forward along the river) ──────────────────────
export const ANDUIN_CONNECTIONS: Array<[RegionId, RegionId]> = [
  ['mirkwood', 'fangorn'],
  ['fangorn',  'rohan'],
];

// ── Tunnel of Moria (Light-only, one-way) ────────────────────────────────────
// Balrog in Caradhras can intercept.
export const TUNNEL_OF_MORIA: { from: RegionId; to: RegionId } = {
  from: 'eregion',
  to:   'fangorn',
};

// ── Helper functions ──────────────────────────────────────────────────────────

export function getCharLimit(regionId: RegionId): number {
  return REGIONS[regionId].charLimit;
}

export function isMountain(regionId: RegionId): boolean {
  return REGIONS[regionId].type === 'mountain';
}

export function isHomeRegion(regionId: RegionId, side: Side): boolean {
  const region = REGIONS[regionId];
  return region.type === 'home' && region.side === side;
}

export function getAdjacentRegions(regionId: RegionId): RegionId[] {
  return CONNECTIONS[regionId] ?? [];
}

export function isForwardMove(from: RegionId, to: RegionId, side: Side): boolean {
  const delta = REGION_DEPTH[to] - REGION_DEPTH[from];
  if (side === 'LIGHT')  return delta > 0;
  if (side === 'SHADOW') return delta < 0;
  return false;
}

export function isSidewaysMove(from: RegionId, to: RegionId): boolean {
  return REGION_DEPTH[from] === REGION_DEPTH[to];
}

export function getAnduinMoves(from: RegionId, side: Side): RegionId[] {
  if (side !== 'LIGHT') return [];
  return ANDUIN_CONNECTIONS
    .filter(([a, b]) => a === from && isForwardMove(from, b, side))
    .map(([, b]) => b);
}

export function canUseTunnelOfMoria(from: RegionId, side: Side): boolean {
  return side === 'LIGHT' && from === TUNNEL_OF_MORIA.from;
}

// ── Screen positions from the real board image ────────────────────────────────
//
// Coordinates are (left%, top%) relative to the board image dimensions.
// Derived from the Casillas.png overlay (blob center detection).
// Board image: Mordor at top-left corner, The Shire at bottom-right corner.

export const REGION_POS: Record<RegionId, { left: number; top: number }> = {
  mordor:          { left: 13.8, top: 15.3 },
  gondor:          { left: 38.7, top: 18.7 },
  rohan:           { left: 63.7, top: 15.6 },
  gap_of_rohan:    { left: 86.3, top: 13.7 },
  dagorlad:        { left: 17.6, top: 40.1 },
  fangorn:         { left: 36.9, top: 33.1 },
  caradhras:       { left: 61.0, top: 40.4 },
  enedwaith:       { left: 78.6, top: 43.3 },
  mirkwood:        { left: 21.0, top: 56.1 },
  misty_mountains: { left: 35.2, top: 60.2 },
  eregion:         { left: 60.9, top: 59.8 },
  cardolan:        { left: 80.3, top: 61.1 },
  the_high_pass:   { left: 18.4, top: 84.6 },
  rhudaur:         { left: 43.1, top: 78.5 },
  arthedain:       { left: 63.7, top: 80.6 },
  the_shire:       { left: 86.3, top: 86.7 },
};

export function getRegionImagePos(regionId: RegionId): { left: number; top: number } {
  return REGION_POS[regionId];
}
