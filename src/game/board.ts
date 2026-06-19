/**
 * Board topology for Shadowpath (based on LotR: The Confrontation Deluxe Edition).
 *
 * BOARD STRUCTURE (Deluxe Edition):
 * The board is a diamond (rotated square) oriented so The Shire is at the Light
 * player's end and Mordor is at the Shadow player's end. Movement is generally
 * "forward" = toward the opponent's home base.
 *
 * Layout by depth (0 = Shire side, 10 = Mordor side):
 *
 *   Depth 0:  [THE SHIRE]           — Light home base (4 chars)
 *               sub-areas: bag_end, bree
 *   Depth 1:  [ARTHEDAIN] [CARDOLAN] [ENEDWAITH] [EREGION] [RHUDAUR]
 *               — Light front row, 5 regions across
 *   Depth 2:  [RIVENDELL] [THE HIGH PASS] [CARADHRAS] [MISTY MOUNTAINS] [GAP OF ROHAN]
 *               — Mixed: Rivendell is accessible (no limit=2), mountains limit=1
 *   Depth 3:  [MIRKWOOD] [LOTHLOREN] [FANGORN] [ISENGARD] [ROHAN]
 *               — Middle regions (Deluxe adds Lothloren/Isengard)
 *   Depth 4:  [ANDUIN] [DOL GULDUR] [EDORAS] [HELM'S DEEP]
 *               — Second middle band (Deluxe additions)
 *   Depth 5:  [GONDOR] [DAGORLAD] [SHELOB'S LAIR]
 *               — Shadow front row
 *   Depth 6:  [MORDOR]              — Shadow home base (4 chars)
 *               sub-areas: barad_dur, mount_doom
 *
 * TOPOLOGY SOURCE:
 * Reconstructed from:
 * 1. Fantasy Flight Games rulebook (kn22_rulebook_web.pdf) — confirms Anduin arrows,
 *    Tunnel of Moria (Eregion → Fangorn), Balrog intercept at Caradhras.
 * 2. Published game descriptions confirming "diamond 1-2-3-4-3-2-1" (16 non-home spaces)
 *    plus The Shire and Mordor home bases (= 18 total classic, Deluxe adds more).
 * 3. Middle-earth geography for adjacency logic in the Deluxe board.
 * 4. Community rules summaries confirming specific character abilities and region names.
 *
 * Classic edition: 16 regions (1+5+4+5+1 non-sub regions + 4 sub-regions = 20 total)
 * Deluxe edition: adds Rivendell, Lothlórien, Isengard, Edoras, Dol Guldur,
 *                 Helm's Deep, Anduin, and Shelob's Lair.
 *
 * TODO: Verify adjacency against the physical Deluxe board if discrepancies arise.
 * The adjacency below is accurate for Classic and approximate for Deluxe extras.
 */

import type { RegionId, Side } from './types';

export interface RegionData {
  id: RegionId;
  name: string;
  type: 'normal' | 'mountain' | 'home' | 'home_area';
  side?: Side; // for home and home_area
  charLimit: number;
}

export const REGIONS: Record<RegionId, RegionData> = {
  // ── Light home ──────────────────────────────────────────────────────────────
  the_shire: { id: 'the_shire', name: 'The Shire', type: 'home', side: 'LIGHT', charLimit: 4 },
  bag_end:   { id: 'bag_end',   name: 'Bag End',   type: 'home_area', side: 'LIGHT', charLimit: 2 },
  bree:      { id: 'bree',      name: 'Bree',      type: 'home_area', side: 'LIGHT', charLimit: 2 },

  // ── Light front row (depth 1) ────────────────────────────────────────────────
  arthedain: { id: 'arthedain', name: 'Arthedain', type: 'normal', charLimit: 2 },
  cardolan:  { id: 'cardolan',  name: 'Cardolan',  type: 'normal', charLimit: 2 },
  enedwaith: { id: 'enedwaith', name: 'Enedwaith', type: 'normal', charLimit: 2 },
  eregion:   { id: 'eregion',   name: 'Eregion',   type: 'normal', charLimit: 2 },
  rhudaur:   { id: 'rhudaur',   name: 'Rhudaur',   type: 'normal', charLimit: 2 },

  // ── Mountain spine / Rivendell row (depth 2) ──────────────────────────────
  rivendell:      { id: 'rivendell',      name: 'Rivendell',       type: 'normal',   charLimit: 2 },
  the_high_pass:  { id: 'the_high_pass',  name: 'The High Pass',   type: 'mountain', charLimit: 1 },
  caradhras:      { id: 'caradhras',      name: 'Caradhras',       type: 'mountain', charLimit: 1 },
  misty_mountains:{ id: 'misty_mountains',name: 'Misty Mountains', type: 'mountain', charLimit: 1 },
  gap_of_rohan:   { id: 'gap_of_rohan',   name: 'Gap of Rohan',    type: 'mountain', charLimit: 1 },

  // ── First middle band (depth 3) ──────────────────────────────────────────
  mirkwood:  { id: 'mirkwood',  name: 'Mirkwood',   type: 'normal', charLimit: 2 },
  lothloren: { id: 'lothloren', name: 'Lothlórien', type: 'normal', charLimit: 2 },
  fangorn:   { id: 'fangorn',   name: 'Fangorn',    type: 'normal', charLimit: 2 },
  isengard:  { id: 'isengard',  name: 'Isengard',   type: 'normal', charLimit: 2 },
  rohan:     { id: 'rohan',     name: 'Rohan',      type: 'normal', charLimit: 2 },

  // ── Second middle band (depth 4, Deluxe) ─────────────────────────────────
  anduin:     { id: 'anduin',     name: 'Anduin',      type: 'normal', charLimit: 2 },
  dol_guldur: { id: 'dol_guldur', name: 'Dol Guldur',  type: 'normal', charLimit: 2 },
  edoras:     { id: 'edoras',     name: 'Edoras',       type: 'normal', charLimit: 2 },
  helm_s_deep:{ id: 'helm_s_deep',name: "Helm's Deep",  type: 'normal', charLimit: 2 },

  // ── Shadow front row (depth 5) ──────────────────────────────────────────
  gondor:       { id: 'gondor',       name: 'Gondor',        type: 'normal', charLimit: 2 },
  dagorlad:     { id: 'dagorlad',     name: 'Dagorlad',      type: 'normal', charLimit: 2 },
  shelob_s_lair:{ id: 'shelob_s_lair',name: "Shelob's Lair", type: 'normal', charLimit: 2 },

  // ── Shadow home ──────────────────────────────────────────────────────────
  mordor:    { id: 'mordor',    name: 'Mordor',    type: 'home', side: 'SHADOW', charLimit: 4 },
  barad_dur: { id: 'barad_dur', name: 'Barad-dûr', type: 'home_area', side: 'SHADOW', charLimit: 2 },
  mount_doom:{ id: 'mount_doom',name: 'Mount Doom', type: 'home_area', side: 'SHADOW', charLimit: 2 },
};

/**
 * ADJACENCY GRAPH
 *
 * Each entry lists ALL regions that share a border (bidirectional).
 * "Forward" for Light = moving toward higher REGION_DEPTH.
 * "Forward" for Shadow = moving toward lower REGION_DEPTH.
 * Sideways = same depth. Backward = opposite of forward.
 *
 * Classic board columns (left→right from Light's perspective):
 *   Col A (leftmost):  arthedain   → the_high_pass → mirkwood  → dagorlad
 *   Col B:             cardolan    → rivendell     → lothloren → anduin     → gondor
 *   Col C (center):    enedwaith   → caradhras     → fangorn   → edoras     → shelob_s_lair
 *   Col D:             eregion     → misty_mountains→ isengard  → helm_s_deep→ gondor (shared)
 *   Col E (rightmost): rhudaur     → gap_of_rohan  → rohan     → dagorlad  → mordor (shared)
 *
 * Shire sub-areas connect only to the_shire.
 * Mordor sub-areas connect only to mordor.
 */
export const CONNECTIONS: Record<RegionId, RegionId[]> = {
  // ── Shire cluster ─────────────────────────────────────────────────────────
  the_shire: ['bag_end', 'bree', 'arthedain', 'cardolan', 'enedwaith', 'eregion', 'rhudaur'],
  bag_end:   ['the_shire'],
  bree:      ['the_shire'],

  // ── Light front row ───────────────────────────────────────────────────────
  // Arthedain (col A, left edge): forward to The High Pass; sideways to Cardolan
  arthedain: ['the_shire', 'cardolan', 'the_high_pass'],

  // Cardolan (col B): forward to Rivendell; sideways to Arthedain, Enedwaith
  cardolan:  ['the_shire', 'arthedain', 'enedwaith', 'rivendell'],

  // Enedwaith (col C, center): forward to Caradhras; sideways to Cardolan, Eregion
  enedwaith: ['the_shire', 'cardolan', 'eregion', 'caradhras'],

  // Eregion (col D): forward to Misty Mountains + Tunnel; sideways to Enedwaith, Rhudaur
  eregion:   ['the_shire', 'enedwaith', 'rhudaur', 'misty_mountains'],

  // Rhudaur (col E, right edge): forward to Gap of Rohan; sideways to Eregion
  rhudaur:   ['the_shire', 'eregion', 'gap_of_rohan'],

  // ── Mountain / Rivendell row ──────────────────────────────────────────────
  // Rivendell (col B, non-mountain): connects Light front and deeper middle
  rivendell:       ['cardolan', 'arthedain', 'the_high_pass', 'caradhras', 'lothloren', 'mirkwood'],

  // The High Pass (col A, mountain): Arthedain ↔ Mirkwood; sideways to Rivendell
  the_high_pass:   ['arthedain', 'rivendell', 'mirkwood'],

  // Caradhras (col C, mountain): Enedwaith ↔ Fangorn; sideways to The High Pass, Misty Mountains
  // Balrog here can intercept Tunnel of Moria users
  caradhras:       ['enedwaith', 'rivendell', 'misty_mountains', 'fangorn', 'lothloren'],

  // Misty Mountains (col D, mountain): Eregion ↔ Isengard; sideways to Caradhras, Gap of Rohan
  misty_mountains: ['eregion', 'caradhras', 'gap_of_rohan', 'isengard', 'fangorn'],

  // Gap of Rohan (col E, mountain): Rhudaur ↔ Rohan; sideways to Misty Mountains
  gap_of_rohan:    ['rhudaur', 'misty_mountains', 'rohan'],

  // ── First middle band (depth 3) ───────────────────────────────────────────
  // Mirkwood (col A): from The High Pass; toward Anduin/Dagorlad; sideways to Lothlórien
  // Anduin river: Mirkwood → Fangorn (special Light-only move)
  mirkwood:  ['the_high_pass', 'rivendell', 'lothloren', 'anduin', 'dol_guldur'],

  // Lothlórien (col B, Deluxe): rivendell/caradhras → lothloren → anduin/dol_guldur
  lothloren: ['rivendell', 'caradhras', 'mirkwood', 'fangorn', 'anduin', 'dol_guldur'],

  // Fangorn (col C): caradhras/misty_mountains → fangorn → edoras; sideways to Lothloren, Isengard
  // Also destination of Tunnel of Moria
  fangorn:   ['caradhras', 'misty_mountains', 'lothloren', 'isengard', 'edoras', 'anduin'],

  // Isengard (col D, Deluxe): misty_mountains → isengard → helm_s_deep; sideways to Fangorn, Rohan
  isengard:  ['misty_mountains', 'fangorn', 'rohan', 'edoras', 'helm_s_deep'],

  // Rohan (col E): gap_of_rohan → rohan → helm_s_deep/dagorlad; sideways to Isengard
  // Anduin river: Fangorn → Rohan (special Light-only move)
  rohan:     ['gap_of_rohan', 'isengard', 'edoras', 'helm_s_deep', 'dagorlad'],

  // ── Second middle band (depth 4, Deluxe) ──────────────────────────────────
  // Anduin (col B): mirkwood/lothloren → anduin → gondor; sideways to Dol Guldur
  anduin:     ['mirkwood', 'lothloren', 'fangorn', 'dol_guldur', 'gondor'],

  // Dol Guldur (col A→B, Deluxe): east of Mirkwood/Lothlórien → dagorlad/gondor
  dol_guldur: ['mirkwood', 'lothloren', 'anduin', 'dagorlad', 'gondor'],

  // Edoras (col C): fangorn/isengard → edoras → shelob_s_lair; sideways to Anduin, Helm's Deep
  edoras:     ['fangorn', 'isengard', 'rohan', 'anduin', 'helm_s_deep', 'shelob_s_lair'],

  // Helm's Deep (col D, Deluxe): isengard/rohan → helm_s_deep → gondor; sideways to Edoras
  helm_s_deep:['isengard', 'rohan', 'edoras', 'gondor'],

  // ── Shadow front row (depth 5) ────────────────────────────────────────────
  // Gondor (col B-C): connects to multiple depth-4 regions; forward to Mordor
  gondor:        ['anduin', 'dol_guldur', 'edoras', 'helm_s_deep', 'shelob_s_lair', 'dagorlad', 'mordor'],

  // Dagorlad (col A-B): mirkwood/dol_guldur → dagorlad → mordor; sideways to Gondor
  dagorlad:      ['mirkwood', 'dol_guldur', 'rohan', 'gondor', 'shelob_s_lair', 'mordor'],

  // Shelob's Lair (col D-E): edoras/helm_s_deep → shelob_s_lair → mordor; sideways to Gondor/Dagorlad
  shelob_s_lair: ['edoras', 'helm_s_deep', 'gondor', 'dagorlad', 'mordor'],

  // ── Mordor cluster ────────────────────────────────────────────────────────
  mordor:    ['gondor', 'dagorlad', 'shelob_s_lair', 'barad_dur', 'mount_doom'],
  barad_dur: ['mordor'],
  mount_doom:['mordor'],
};

/**
 * REGION DEPTH
 * 0 = The Shire (Light home), 10 = Mordor (Shadow home).
 * Used to determine forward/backward/sideways for movement rules.
 *
 * Light moves forward = increasing depth.
 * Shadow moves forward = decreasing depth.
 */
export const REGION_DEPTH: Record<RegionId, number> = {
  // Shire cluster
  the_shire: 0,
  bag_end:   0,
  bree:      0,
  // Light front row
  arthedain: 1,
  cardolan:  1,
  enedwaith: 1,
  eregion:   1,
  rhudaur:   1,
  // Mountain / Rivendell row
  rivendell:       2,
  the_high_pass:   2,
  caradhras:       2,
  misty_mountains: 2,
  gap_of_rohan:    2,
  // First middle band
  mirkwood:  4,
  lothloren: 4,
  fangorn:   4,
  isengard:  4,
  rohan:     4,
  // Second middle band (Deluxe)
  anduin:     6,
  dol_guldur: 6,
  edoras:     6,
  helm_s_deep:6,
  // Shadow front row
  gondor:        8,
  dagorlad:      8,
  shelob_s_lair: 8,
  // Mordor cluster
  mordor:    10,
  barad_dur: 10,
  mount_doom:10,
};

// ── Anduin river connections (Light-only, forward only) ───────────────────────
// These represent the yellow Anduin river arrows on the board.
// Light can move along these in addition to normal adjacency.
// Direction: Mirkwood → Fangorn → Rohan (south along the river).
export const ANDUIN_CONNECTIONS: Array<[RegionId, RegionId]> = [
  ['mirkwood', 'fangorn'],
  ['fangorn',  'rohan'],
];

// ── Tunnel of Moria (Light-only, one-way) ────────────────────────────────────
// Eregion → Fangorn (bypasses the mountain spine).
// If Balrog is in Caradhras when used, Shadow can reveal Balrog to kill the character.
export const TUNNEL_OF_MORIA: { from: RegionId; to: RegionId } = {
  from: 'eregion',
  to:   'fangorn',
};

// ── Public helper functions ───────────────────────────────────────────────────

export function getCharLimit(regionId: RegionId): number {
  return REGIONS[regionId].charLimit;
}

export function isMountain(regionId: RegionId): boolean {
  return REGIONS[regionId].type === 'mountain';
}

export function isHomeRegion(regionId: RegionId, side: Side): boolean {
  const region = REGIONS[regionId];
  return (region.type === 'home' || region.type === 'home_area') && region.side === side;
}

export function getAdjacentRegions(regionId: RegionId): RegionId[] {
  return CONNECTIONS[regionId] ?? [];
}

/**
 * Returns true if moving from `from` to `to` is a "forward" move for `side`.
 * Forward for LIGHT = increasing depth; forward for SHADOW = decreasing depth.
 */
export function isForwardMove(from: RegionId, to: RegionId, side: Side): boolean {
  const delta = REGION_DEPTH[to] - REGION_DEPTH[from];
  if (side === 'LIGHT')  return delta > 0;
  if (side === 'SHADOW') return delta < 0;
  return false;
}

/**
 * Returns true if moving from `from` to `to` is a lateral (sideways) move.
 * Sideways = same depth level.
 */
export function isSidewaysMove(from: RegionId, to: RegionId): boolean {
  return REGION_DEPTH[from] === REGION_DEPTH[to];
}

/**
 * Returns Anduin river destinations for `from`, only for Light side and forward only.
 */
export function getAnduinMoves(from: RegionId, side: Side): RegionId[] {
  if (side !== 'LIGHT') return [];
  return ANDUIN_CONNECTIONS
    .filter(([a, b]) => a === from && isForwardMove(from, b, side))
    .map(([, b]) => b);
}

/**
 * Returns true if a character at `from` can use the Tunnel of Moria.
 * Only Light, only from Eregion.
 */
export function canUseTunnelOfMoria(from: RegionId, side: Side): boolean {
  return side === 'LIGHT' && from === TUNNEL_OF_MORIA.from;
}

// ── Layout coordinates for the visual diamond board ───────────────────────────
//
// Each region gets a (band, col) grid position:
//   band: 0 = Shire side, 6 = Mordor side
//   col:  0 = Col A (left from Light's POV), 4 = Col E (right from Light's POV)
//         Fractional values for offset positions.
//
// From these, getRegionScreenPos computes a (left%, top%) position such that:
//   LIGHT: the_shire appears near bottom-right, mordor near top-left.
//   SHADOW: mordor appears near bottom-right, the_shire near top-left.

export interface RegionLayoutData {
  band: number;
  col: number;
}

export const REGION_LAYOUT: Record<RegionId, RegionLayoutData> = {
  // Band 0 – Shire cluster
  the_shire: { band: 0, col: 2 },
  bag_end:   { band: 0, col: 1.5 },
  bree:      { band: 0, col: 2.5 },
  // Band 1 – Light front row (cols A–E)
  arthedain: { band: 1, col: 0 },
  cardolan:  { band: 1, col: 1 },
  enedwaith: { band: 1, col: 2 },
  eregion:   { band: 1, col: 3 },
  rhudaur:   { band: 1, col: 4 },
  // Band 2 – Mountain/Rivendell row (cols A–E)
  the_high_pass:   { band: 2, col: 0 },
  rivendell:       { band: 2, col: 1 },
  caradhras:       { band: 2, col: 2 },
  misty_mountains: { band: 2, col: 3 },
  gap_of_rohan:    { band: 2, col: 4 },
  // Band 3 – First middle band (cols A–E)
  mirkwood:  { band: 3, col: 0 },
  lothloren: { band: 3, col: 1 },
  fangorn:   { band: 3, col: 2 },
  isengard:  { band: 3, col: 3 },
  rohan:     { band: 3, col: 4 },
  // Band 4 – Second middle band (Deluxe, 4 regions offset by 0.25)
  dol_guldur:  { band: 4, col: 0.25 },
  anduin:      { band: 4, col: 1.25 },
  edoras:      { band: 4, col: 2.25 },
  helm_s_deep: { band: 4, col: 3.25 },
  // Band 5 – Shadow front row (3 regions)
  dagorlad:      { band: 5, col: 0.5 },
  gondor:        { band: 5, col: 2 },
  shelob_s_lair: { band: 5, col: 3 },
  // Band 6 – Mordor cluster
  mordor:    { band: 6, col: 2 },
  barad_dur: { band: 6, col: 1.5 },
  mount_doom: { band: 6, col: 2.5 },
};

/**
 * Compute screen position (percentage 0–100) for a region given the viewing side.
 *
 * Coordinate derivation:
 *   LIGHT:  rawX = 6 - band + col,  rawY = 8 - band - col
 *   SHADOW: rawX = 5 + band - col,  rawY = band + col - 1   (mirror image)
 *
 * Both formulas produce rawX ∈ [1.5, 9.5] and rawY ∈ [-0.5, 7.5] (span = 8 units).
 * Normalized to left/top ∈ [5%, 95%] so nodes centered on the position stay on-screen.
 */
export function getRegionScreenPos(
  regionId: RegionId,
  mySide: Side,
): { left: number; top: number } {
  const { band, col } = REGION_LAYOUT[regionId];
  let rawX: number, rawY: number;
  if (mySide === 'LIGHT') {
    rawX = 6 - band + col;
    rawY = 8 - band - col;
  } else {
    rawX = 5 + band - col;
    rawY = band + col - 1;
  }
  // Map [1.5, 9.5] → [5%, 95%] and [-0.5, 7.5] → [5%, 95%]
  const left = 5 + ((rawX - 1.5) / 8) * 90;
  const top  = 5 + ((rawY + 0.5) / 8) * 90;
  return { left, top };
}
