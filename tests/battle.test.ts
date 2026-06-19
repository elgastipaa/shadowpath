import { describe, it, expect } from 'vitest';
import { createInitialState } from '@/game/engine';
import { resolveCards, resolveSarumanNoCards, checkAndRefillHands, discardBattleCards } from '@/game/battle';
import type { BattleState, GameState } from '@/game/types';

function makeBattle(overrides: Partial<BattleState> = {}): BattleState {
  return {
    region:     'enedwaith',
    lightChar:  'gandalf',
    shadowChar: 'orcs',
    attacker:   'LIGHT',
    step:       'select_card',
    pendingBattles: [],
    log: [],
    ...overrides,
  };
}

describe('resolveCards — strength comparison', () => {
  it('light wins when light total > shadow total', () => {
    const state  = createInitialState();
    const battle = makeBattle();
    // Gandalf (5) + l_5 (5) = 10  vs  Orcs (2) + s_1 (1) = 3
    const result = resolveCards('l_5', 's_1', 'gandalf', 'orcs', state, battle);
    expect(result.shadowDefeated).toBe(true);
    expect(result.lightDefeated).toBe(false);
  });

  it('shadow wins when shadow total > light total', () => {
    const state  = createInitialState();
    const battle = makeBattle({ lightChar: 'pippin', shadowChar: 'cave_troll' });
    // Pippin (1) + l_1 (1) = 2  vs  Cave Troll (9) card nullified = 9 (no card bonus)
    // Cave Troll nullifies shadow card → shadow total = 9
    // Light = 2, Shadow = 9 → shadow wins
    const result = resolveCards('l_1', 's_6', 'pippin', 'cave_troll', state, battle);
    expect(result.lightDefeated).toBe(true);
    expect(result.shadowDefeated).toBe(false);
    expect(result.log.some(l => l.includes('Cave Troll'))).toBe(true);
  });

  it('tie eliminates both', () => {
    const state  = createInitialState();
    // Sam (2) + l_3 (3) = 5  vs  Orcs (2) + s_3 (3) = 5
    const battle = makeBattle({ lightChar: 'sam', shadowChar: 'orcs' });
    const result = resolveCards('l_3', 's_3', 'sam', 'orcs', state, battle);
    expect(result.lightDefeated).toBe(true);
    expect(result.shadowDefeated).toBe(true);
  });
});

describe('resolveCards — text cards', () => {
  it('Noble Sacrifice eliminates both regardless of strength', () => {
    const state  = createInitialState();
    // Frodo (1) vs Balrog (5) — Noble Sacrifice should kill both
    const battle = makeBattle({ lightChar: 'frodo', shadowChar: 'balrog' });
    const result = resolveCards('l_noble_sacrifice', 's_1', 'frodo', 'balrog', state, battle);
    expect(result.lightDefeated).toBe(true);
    expect(result.shadowDefeated).toBe(true);
    expect(result.retreated).toBe(false);
  });

  it('Elven Cloak nullifies shadow strength card', () => {
    const state  = createInitialState();
    // Frodo (1) + Elven Cloak vs Orcs (2) + s_6 (6)
    // With Elven Cloak: shadow bonus = 0 → Orcs = 2, Frodo = 1 → shadow still wins base
    const battle = makeBattle({ lightChar: 'frodo', shadowChar: 'orcs' });
    const result = resolveCards('l_elven_cloak', 's_6', 'frodo', 'orcs', state, battle);
    expect(result.log.some(l => l.includes('Elven Cloak'))).toBe(true);
    // Frodo 1 vs Orcs 2 (card nullified) → shadow wins
    expect(result.lightDefeated).toBe(true);
  });

  it('Eye of Sauron cancels Light text card', () => {
    const state  = createInitialState();
    // Gandalf (5) + Noble Sacrifice vs Saruman (4) + Eye of Sauron
    // Eye cancels Noble Sacrifice → compare strengths 5 vs 4 → Light wins
    const battle = makeBattle({ lightChar: 'gandalf', shadowChar: 'saruman' });
    const result = resolveCards('l_noble_sacrifice', 's_eye_of_sauron', 'gandalf', 'saruman', state, battle);
    expect(result.log.some(l => l.includes('Eye of Sauron'))).toBe(true);
    expect(result.shadowDefeated).toBe(true);
    expect(result.lightDefeated).toBe(false);
  });

  it('Light Retreat card retreats Light sideways', () => {
    const state  = createInitialState();
    const battle = makeBattle();
    const result = resolveCards('l_retreat', 's_1', 'gandalf', 'orcs', state, battle);
    expect(result.retreated).toBe(true);
    expect(result.retreatedSide).toBe('LIGHT');
    expect(result.lightDefeated).toBe(false);
    expect(result.shadowDefeated).toBe(false);
  });

  it('Shadow Retreat card retreats Shadow sideways', () => {
    const state  = createInitialState();
    const battle = makeBattle();
    const result = resolveCards('l_1', 's_retreat', 'gandalf', 'orcs', state, battle);
    expect(result.retreated).toBe(true);
    expect(result.retreatedSide).toBe('SHADOW');
  });
});

describe('resolveSarumanNoCards', () => {
  it('resolves on base strengths', () => {
    // Saruman (4) vs Legolas (3) → Shadow wins
    const result = resolveSarumanNoCards('legolas', 'saruman', 'l_1', 's_1');
    expect(result.shadowDefeated).toBe(false);
    expect(result.lightDefeated).toBe(true);
  });

  it('handles tie', () => {
    // Gandalf (5) vs Balrog (5) → both eliminated
    const result = resolveSarumanNoCards('gandalf', 'balrog', 'l_1', 's_1');
    expect(result.lightDefeated).toBe(true);
    expect(result.shadowDefeated).toBe(true);
  });
});

describe('checkAndRefillHands', () => {
  it('does nothing when both hands have cards', () => {
    const state   = createInitialState();
    const updated = checkAndRefillHands(state);
    expect(updated.lightHand).toEqual(state.lightHand);
    expect(updated.shadowHand).toEqual(state.shadowHand);
  });

  it('refills both hands when both are empty', () => {
    const state = createInitialState();
    // Drain all cards to discard
    const emptyState: GameState = {
      ...state,
      lightHand:    [],
      lightDiscard: [...state.lightHand],
      shadowHand:   [],
      shadowDiscard:[...state.shadowHand],
    };
    const updated = checkAndRefillHands(emptyState);
    expect(updated.lightHand.length).toBe(9);
    expect(updated.shadowHand.length).toBe(9);
    expect(updated.lightDiscard.length).toBe(0);
    expect(updated.shadowDiscard.length).toBe(0);
  });

  it('refills each hand independently when only one is empty', () => {
    const state = createInitialState();
    const halfEmpty: GameState = {
      ...state,
      lightHand:    [],
      lightDiscard: [...state.lightHand],
    };
    const updated = checkAndRefillHands(halfEmpty);
    // Light refills independently (their hand was empty, discard had cards)
    expect(updated.lightHand.length).toBe(9);
    expect(updated.lightDiscard.length).toBe(0);
    // Shadow hand is unchanged (had cards, no refill needed)
    expect(updated.shadowHand.length).toBe(state.shadowHand.length);
  });
});

describe('discardBattleCards', () => {
  it('removes played cards from hands and adds to discard', () => {
    const state   = createInitialState();
    const updated = discardBattleCards(state, 'l_3', 's_4');
    expect(updated.lightHand).not.toContain('l_3');
    expect(updated.lightDiscard).toContain('l_3');
    expect(updated.shadowHand).not.toContain('s_4');
    expect(updated.shadowDiscard).toContain('s_4');
  });
});
