/**
 * Character ability resolution.
 *
 * Abilities are checked at the start of battle BEFORE cards are played.
 * Resolution order (per rulebook):
 *   1. Check if Warg is involved → suppress all Light abilities.
 *   2. Resolve immediate-defeat abilities (Merry vs Witch-king, Legolas vs Nazgûl,
 *      Gimli vs Orcs, Boromir mutual destruction).
 *   3. Check retreat abilities (Frodo sideways, Pippin backward).
 *   4. Check swap abilities (Sam protecting Frodo).
 *   5. Check Saruman "no cards" option.
 *   6. If Gandalf is fighting, activate card-reveal-order flag.
 *
 * Each function returns an AbilityResult describing what (if anything) changed.
 * The engine layer is responsible for applying the result to the game state and
 * prompting the relevant player when interaction is needed (e.g., Sam's swap offer).
 */

import type {
  GameState,
  LightCharId,
  ShadowCharId,
  RegionId,
  BattleState,
} from './types';
import { getValidRetreats } from './movement';

export interface AbilityResult {
  /** Light character is immediately eliminated */
  lightDefeated?: boolean;
  /** Shadow character is immediately eliminated */
  shadowDefeated?: boolean;
  /** The battle ends (no card phase) */
  skipCards?: boolean;
  /** Light character retreats here (battle ends) */
  lightRetreatedTo?: RegionId;
  /** Shadow character retreats here (battle ends) */
  shadowRetreatedTo?: RegionId;
  /** Strength override for Light this battle (Sam protecting Frodo) */
  modifiedLightStrength?: number;
  /** Sam can swap in for Frodo — engine should prompt Light player */
  samSwapAvailable?: boolean;
  /** Frodo can retreat sideways — engine should prompt Light player */
  frodoSidewaysRetreatAvailable?: boolean;
  /** Pippin can retreat backward — engine should prompt Light player */
  pippinBackwardRetreatAvailable?: boolean;
  /** Saruman can declare "no cards" — engine should prompt Shadow player */
  sarumanNoCardsAvailable?: boolean;
  /** Gandalf flag: Shadow must reveal card before Light picks */
  gandalfCardRevealOrder?: boolean;
  log: string[];
}

// ── Light character abilities ─────────────────────────────────────────────────

/**
 * Resolve the ability of a Light character at the start of battle (char-ability phase).
 * `isAttacker` = true if the Light character moved into the region (attacked).
 */
export function resolveLightCharAbility(
  lightChar: LightCharId,
  shadowChar: ShadowCharId,
  state: GameState,
  battle: BattleState,
  isLightAttacker: boolean,
): AbilityResult {
  const wargInBattle = shadowChar === 'warg';

  // Warg suppresses all Light character abilities (including retreats)
  if (wargInBattle && lightChar !== 'boromir') {
    return {
      log: [`Warg: la habilidad de ${lightChar} no tiene efecto en esta batalla`],
    };
  }

  switch (lightChar) {
    case 'frodo': {
      // Frodo can retreat sideways when DEFENDING (Shadow attacked Frodo).
      // Not available in mountains.
      if (isLightAttacker) return { log: [] };
      const sidewaysOptions = getValidRetreats(lightChar, 'LIGHT', state, 'sideways');
      if (sidewaysOptions.length === 0) {
        return { log: ['Frodo: no hay casillas adyacentes laterales disponibles para retirada'] };
      }
      return {
        frodoSidewaysRetreatAvailable: true,
        log: ['Frodo puede retirarse lateralmente antes de que se jueguen cartas'],
      };
    }

    case 'sam': {
      // Sam can swap in for Frodo when Frodo is attacked.
      // Sam must be in the same region as Frodo.
      // Cannot swap if Shadow is Warg (handled above — but Boromir exception doesn't apply here).
      if (shadowChar === 'warg') {
        return { log: ['Sam: no puede proteger a Frodo contra el Warg'] };
      }
      const samRegion   = state.lightPositions.sam;
      const frodoRegion = state.lightPositions.frodo;
      if (!samRegion || samRegion !== frodoRegion) {
        return { log: ['Sam: no está en la misma región que Frodo'] };
      }
      if (battle.lightChar !== 'frodo') {
        return { log: ['Sam: su habilidad solo aplica cuando Frodo es atacado'] };
      }
      return {
        samSwapAvailable: true,
        log: ['Sam puede reemplazar a Frodo en batalla (fuerza efectiva 5 si protege)'],
      };
    }

    case 'pippin': {
      // Pippin can retreat backward when ATTACKING.
      if (!isLightAttacker) return { log: [] };
      const backwardOptions = getValidRetreats(lightChar, 'LIGHT', state, 'backward');
      if (backwardOptions.length === 0) {
        return { log: ['Pippin: no hay casilla backward disponible para retirada'] };
      }
      return {
        pippinBackwardRetreatAvailable: true,
        log: ['Pippin puede retirarse backward antes de que se jueguen cartas'],
      };
    }

    case 'merry': {
      if (shadowChar === 'witch_king') {
        return {
          shadowDefeated: true,
          skipCards: true,
          log: ['Merry derrota al Witch-king antes de que se jueguen cartas'],
        };
      }
      return { log: [] };
    }

    case 'gandalf': {
      return {
        gandalfCardRevealOrder: true,
        log: ['Gandalf: Shadow debe elegir y revelar su carta primero'],
      };
    }

    case 'aragorn': {
      // Aragorn's ability is movement-based (handled in movement.ts).
      // No special combat ability.
      return { log: [] };
    }

    case 'legolas': {
      if (shadowChar === 'flying_nazgul') {
        return {
          shadowDefeated: true,
          skipCards: true,
          log: ['Legolas derrota al Flying Nazgûl antes de las cartas'],
        };
      }
      return { log: [] };
    }

    case 'gimli': {
      if (shadowChar === 'orcs') {
        // Gimli defeats Orcs BEFORE Orcs' ability fires.
        return {
          shadowDefeated: true,
          skipCards: true,
          log: ['Gimli derrota a los Orcs antes de que su habilidad se resuelva'],
        };
      }
      return { log: [] };
    }

    case 'boromir': {
      if (shadowChar === 'warg') {
        // Boromir's ability has no effect vs Warg — normal card battle.
        return { log: ['Boromir vs Warg: sin efecto especial; la batalla continúa con cartas'] };
      }
      return {
        lightDefeated: true,
        shadowDefeated: true,
        skipCards: true,
        log: ['Boromir: ambos personajes son eliminados antes de las cartas'],
      };
    }

    default:
      return { log: [] };
  }
}

// ── Shadow character abilities ────────────────────────────────────────────────

/**
 * Resolve the ability of a Shadow character at the start of battle.
 * `isShadowAttacker` = true if the Shadow character moved into the region.
 *
 * Note: Balrog's tunnel intercept is handled in the movement layer (engine.ts),
 * not here, because it fires before battle is even initiated.
 */
export function resolveShadowCharAbility(
  lightChar: LightCharId,
  shadowChar: ShadowCharId,
  state: GameState,
  battle: BattleState,
  isShadowAttacker: boolean,
): AbilityResult {
  switch (shadowChar) {
    case 'orcs': {
      // Orcs destroy the first Light character when ATTACKING (before cards).
      // Gimli already handled via Light ability — this won't be reached if Gimli
      // defeated Orcs (skipCards=true returned earlier).
      if (!isShadowAttacker) return { log: [] };
      return {
        lightDefeated: true,
        skipCards: true,
        log: ['Los Orcs eliminan al personaje Light antes de las cartas'],
      };
    }

    case 'warg': {
      // Warg's effect (suppress Light abilities) is handled in resolveLightCharAbility.
      return { log: ['Warg: las habilidades de personaje de Light no tienen efecto'] };
    }

    case 'cave_troll': {
      // Reminder flag — actual card nullification is in battle.ts resolveCards.
      return { log: ["Cave Troll: la carta de Shadow no sumará fuerza ni tendrá efecto"] };
    }

    case 'saruman': {
      // Saruman can declare "no cards" UNLESS Light retreated via character ability.
      // (If Light already retreated, battle is over — this won't be reached.)
      return {
        sarumanNoCardsAvailable: true,
        log: ['Saruman puede declarar que no se jueguen cartas (decide solo fuerza base)'],
      };
    }

    case 'witch_king': {
      // Combat ability: if Witch-king attacked Frodo laterally, Frodo may retreat.
      // This is handled at the movement/engine layer when the Witch-king moves.
      return { log: [] };
    }

    case 'shelob': {
      // Shelob's teleport fires AFTER battle (if Shelob wins), not here.
      return { log: [] };
    }

    case 'balrog':
    case 'flying_nazgul':
    case 'black_rider':
    default:
      return { log: [] };
  }
}

/**
 * Apply Shelob's teleport-to-Gondor effect after she defeats a Light character.
 * Returns the new position for Shelob (or null if she is eliminated instead).
 */
export function applySheLobTeleport(state: GameState): RegionId | null {
  const shadowInGondor = Object.values(state.shadowPositions).filter(r => r === 'gondor').length;
  const lightInGondor  = Object.values(state.lightPositions).filter(r => r === 'gondor').length;

  if (shadowInGondor >= 2 || lightInGondor > 0) {
    // No room or Light present → Shelob is eliminated
    return null;
  }
  return 'gondor';
}
