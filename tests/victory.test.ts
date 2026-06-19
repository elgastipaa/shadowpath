import { describe, it, expect } from 'vitest';
import { createInitialState } from '@/game/engine';
import { checkVictory, hasValidMoves, checkStalemate } from '@/game/victory';
import type { GameState } from '@/game/types';

describe('checkVictory', () => {
  it('returns null for initial state (no winner yet)', () => {
    const state = createInitialState();
    expect(checkVictory(state)).toBeNull();
  });

  it('Light wins when Frodo reaches mordor', () => {
    const state: GameState = {
      ...createInitialState(),
      lightPositions: { ...createInitialState().lightPositions, frodo: 'mordor' },
    };
    const result = checkVictory(state);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe('LIGHT');
    expect(result!.reason).toContain('Mordor');
  });

  it('Light wins when Frodo reaches barad_dur', () => {
    const state: GameState = {
      ...createInitialState(),
      lightPositions: { ...createInitialState().lightPositions, frodo: 'barad_dur' },
    };
    const result = checkVictory(state);
    expect(result?.winner).toBe('LIGHT');
  });

  it('Light wins when Frodo reaches mount_doom', () => {
    const state: GameState = {
      ...createInitialState(),
      lightPositions: { ...createInitialState().lightPositions, frodo: 'mount_doom' },
    };
    const result = checkVictory(state);
    expect(result?.winner).toBe('LIGHT');
  });

  it('Shadow wins when Frodo is eliminated', () => {
    const state: GameState = {
      ...createInitialState(),
      lightPositions: { ...createInitialState().lightPositions, frodo: null },
    };
    const result = checkVictory(state);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe('SHADOW');
    expect(result!.reason).toContain('derrotado');
  });

  it('Shadow wins with 3 chars in the_shire', () => {
    const base = createInitialState();
    const state: GameState = {
      ...base,
      shadowPositions: {
        ...base.shadowPositions,
        balrog:     'the_shire',
        shelob:     'the_shire',
        witch_king: 'the_shire',
      },
    };
    const result = checkVictory(state);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe('SHADOW');
    expect(result!.reason).toContain('Shire');
  });

  it('Shadow wins with 3 chars across shire sub-areas', () => {
    const base = createInitialState();
    const state: GameState = {
      ...base,
      shadowPositions: {
        ...base.shadowPositions,
        balrog:     'bag_end',
        shelob:     'bree',
        witch_king: 'the_shire',
      },
    };
    const result = checkVictory(state);
    expect(result?.winner).toBe('SHADOW');
  });

  it('No winner with only 2 Shadow in shire', () => {
    const base = createInitialState();
    const state: GameState = {
      ...base,
      shadowPositions: {
        ...base.shadowPositions,
        balrog: 'the_shire',
        shelob: 'the_shire',
      },
    };
    expect(checkVictory(state)).toBeNull();
  });
});

describe('hasValidMoves', () => {
  it('Light has valid moves from initial state', () => {
    const state = createInitialState();
    // Switch to ACTIVE so movement functions work
    const activeState = { ...state, status: 'ACTIVE' as const };
    expect(hasValidMoves('LIGHT', activeState)).toBe(true);
  });

  it('Shadow has valid moves from initial state', () => {
    const state = { ...createInitialState(), status: 'ACTIVE' as const };
    expect(hasValidMoves('SHADOW', state)).toBe(true);
  });
});

describe('checkStalemate', () => {
  it('does not trigger stalemate in initial state', () => {
    const state = { ...createInitialState(), status: 'ACTIVE' as const };
    expect(checkStalemate(state)).toBeNull();
  });
});
