import type { CardData, LightCardId, ShadowCardId } from './types';

/**
 * LIGHT combat cards (9 total):
 *   - 5 strength cards: 1, 2, 3, 4, 5
 *   - 4 text cards: Magic, Noble Sacrifice, Elven Cloak, Retreat
 */
export const LIGHT_CARDS: Record<LightCardId, CardData> = {
  l_1: { id: 'l_1', type: 'strength', value: 1,  name: '1',              side: 'LIGHT' },
  l_2: { id: 'l_2', type: 'strength', value: 2,  name: '2',              side: 'LIGHT' },
  l_3: { id: 'l_3', type: 'strength', value: 3,  name: '3',              side: 'LIGHT' },
  l_4: { id: 'l_4', type: 'strength', value: 4,  name: '4',              side: 'LIGHT' },
  l_5: { id: 'l_5', type: 'strength', value: 5,  name: '5',              side: 'LIGHT' },

  l_magic: {
    id: 'l_magic', type: 'text', effect: 'magic',
    name: 'Magic', side: 'LIGHT',
    // Light picks any card from their discard pile to play alongside this card.
    // The selected card's effect is applied in addition to Magic's text.
  },
  l_noble_sacrifice: {
    id: 'l_noble_sacrifice', type: 'text', effect: 'noble_sacrifice',
    name: 'Noble Sacrifice', side: 'LIGHT',
    // Both characters are eliminated. Has no effect if Shadow retreated.
  },
  l_elven_cloak: {
    id: 'l_elven_cloak', type: 'text', effect: 'elven_cloak',
    name: 'Elven Cloak', side: 'LIGHT',
    // Shadow's strength card adds nothing (its value is ignored).
    // If Shadow played a text card, Elven Cloak has no additional effect.
  },
  l_retreat: {
    id: 'l_retreat', type: 'text', effect: 'retreat',
    name: 'Retreat', side: 'LIGHT',
    // Light character retreats sideways to an unoccupied adjacent region.
    // Battle ends without a winner. Both cards are discarded.
  },
};

/**
 * SHADOW combat cards (9 total):
 *   - 6 strength cards: 1, 2, 3, 4, 5, 6
 *   - 3 text cards: Magic, Eye of Sauron, Retreat
 */
export const SHADOW_CARDS: Record<ShadowCardId, CardData> = {
  s_1: { id: 's_1', type: 'strength', value: 1, name: '1', side: 'SHADOW' },
  s_2: { id: 's_2', type: 'strength', value: 2, name: '2', side: 'SHADOW' },
  s_3: { id: 's_3', type: 'strength', value: 3, name: '3', side: 'SHADOW' },
  s_4: { id: 's_4', type: 'strength', value: 4, name: '4', side: 'SHADOW' },
  s_5: { id: 's_5', type: 'strength', value: 5, name: '5', side: 'SHADOW' },
  s_6: { id: 's_6', type: 'strength', value: 6, name: '6', side: 'SHADOW' },

  s_magic: {
    id: 's_magic', type: 'text', effect: 'magic',
    name: 'Magic', side: 'SHADOW',
    // Shadow picks any card from their discard pile to play alongside this card.
    // Must be fully resolved before Light picks (Gandalf rule).
  },
  s_eye_of_sauron: {
    id: 's_eye_of_sauron', type: 'text', effect: 'eye_of_sauron',
    name: 'Eye of Sauron', side: 'SHADOW',
    // If Light played a text card, that card has no effect.
    // Battle is then decided by printed strengths only (no card bonuses).
  },
  s_retreat: {
    id: 's_retreat', type: 'text', effect: 'retreat',
    name: 'Retreat', side: 'SHADOW',
    // Shadow character retreats sideways.
    // Noble Sacrifice has no effect if Shadow retreated with this card.
  },
};

export const ALL_LIGHT_CARDS: LightCardId[] = Object.keys(LIGHT_CARDS) as LightCardId[];
export const ALL_SHADOW_CARDS: ShadowCardId[] = Object.keys(SHADOW_CARDS) as ShadowCardId[];
