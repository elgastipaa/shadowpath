import type { CharacterData, LightCharId, ShadowCharId } from './types';

export const LIGHT_CHARACTERS: Record<LightCharId, CharacterData> = {
  frodo: {
    id: 'frodo',
    name: 'Frodo',
    strength: 1,
    side: 'LIGHT',
    // When defending, Frodo may retreat sideways before cards are played.
    // Not available in mountains. Not available vs Warg.
    ability: 'frodo_sideways_retreat',
  },
  sam: {
    id: 'sam',
    name: 'Sam',
    strength: 2,
    side: 'LIGHT',
    // If Sam is in the same region as Frodo when Frodo is attacked,
    // Sam may swap in (becoming the defender) before Frodo's ability resolves.
    // When Sam defends Frodo he has effective strength 5.
    // Sam cannot swap vs Warg.
    ability: 'sam_protect_frodo',
  },
  pippin: {
    id: 'pippin',
    name: 'Pippin',
    strength: 1,
    side: 'LIGHT',
    // When attacking, Pippin may retreat backward before cards are played.
    // Not available vs Warg.
    ability: 'pippin_backward_retreat',
  },
  merry: {
    id: 'merry',
    name: 'Merry',
    strength: 2,
    side: 'LIGHT',
    // Automatically defeats the Witch-king before cards are played.
    ability: 'merry_defeats_witch_king',
  },
  gandalf: {
    id: 'gandalf',
    name: 'Gandalf',
    strength: 5,
    side: 'LIGHT',
    // When the card phase is reached, Shadow must choose and reveal their card
    // first, then Light chooses. If Shadow plays Magic, it must be fully
    // resolved before Light picks.
    ability: 'gandalf_card_peek',
  },
  aragorn: {
    id: 'aragorn',
    name: 'Aragorn',
    strength: 4,
    side: 'LIGHT',
    // Aragorn may move to any adjacent region (forward, lateral, or backward)
    // when attacking. If not attacking he follows normal forward-only movement.
    // No lateral movement in mountains regardless.
    ability: 'aragorn_flexible_movement',
  },
  legolas: {
    id: 'legolas',
    name: 'Legolas',
    strength: 3,
    side: 'LIGHT',
    // Automatically defeats the Flying Nazgûl before cards are played.
    ability: 'legolas_defeats_flying_nazgul',
  },
  gimli: {
    id: 'gimli',
    name: 'Gimli',
    strength: 3,
    side: 'LIGHT',
    // Defeats Orcs before Orcs' ability resolves (Orcs can't kill Gimli first).
    ability: 'gimli_defeats_orcs',
  },
  boromir: {
    id: 'boromir',
    name: 'Boromir',
    strength: 0,
    side: 'LIGHT',
    // Both characters are eliminated before Shadow's ability resolves.
    // Exception: vs Warg, Boromir's ability has no effect (normal card battle).
    ability: 'boromir_mutual_destruction',
  },
};

export const SHADOW_CHARACTERS: Record<ShadowCharId, CharacterData> = {
  balrog: {
    id: 'balrog',
    name: 'Balrog',
    strength: 5,
    side: 'SHADOW',
    // If Balrog occupies Caradhras when a Light character uses the Tunnel of
    // Moria (Eregion→Fangorn), Shadow may reveal Balrog to immediately destroy
    // that Light character. Balrog is unharmed.
    ability: 'balrog_tunnel_intercept',
  },
  shelob: {
    id: 'shelob',
    name: 'Shelob',
    strength: 5,
    side: 'SHADOW',
    // If Shelob defeats a Light character, she teleports to Gondor afterward.
    // If Gondor already has 2 Shadow chars OR any Light chars, Shelob is
    // eliminated instead of teleporting.
    ability: 'shelob_teleport_gondor',
  },
  witch_king: {
    id: 'witch_king',
    name: 'Witch-king',
    strength: 5,
    side: 'SHADOW',
    // The Witch-king may move sideways (lateral) when attacking.
    // No lateral movement in mountains.
    // If the Witch-king attacks Frodo laterally, Frodo may retreat backward
    // to the Witch-king's previous region before battle.
    ability: 'witch_king_lateral_attack',
  },
  flying_nazgul: {
    id: 'flying_nazgul',
    name: 'Flying Nazgûl',
    strength: 3,
    side: 'SHADOW',
    // May move to any region containing exactly one Light character.
    // May also move laterally into an adjacent mountain with one Light char.
    // Otherwise, normal movement.
    ability: 'flying_nazgul_any_region',
  },
  black_rider: {
    id: 'black_rider',
    name: 'Black Rider',
    strength: 3,
    side: 'SHADOW',
    // May move forward through any number of empty or Shadow-only regions
    // to attack a region containing Light characters.
    // Cannot pass through a region with 2 Shadow chars or any Light chars.
    // Otherwise, normal movement.
    ability: 'black_rider_multi_move',
  },
  saruman: {
    id: 'saruman',
    name: 'Saruman',
    strength: 4,
    side: 'SHADOW',
    // If Light did not retreat via a character ability, Saruman may declare
    // "no cards": the battle is decided purely on printed strength values
    // (no cards played, but both must still discard a card).
    ability: 'saruman_no_cards',
  },
  orcs: {
    id: 'orcs',
    name: 'Orcs',
    strength: 2,
    side: 'SHADOW',
    // When attacking, Orcs destroy the first Light character before cards.
    // A character with a retreat ability may escape before Orcs' ability fires;
    // if they escape it still counts as Orcs' "first attack."
    // Gimli negates this: Gimli defeats Orcs before the ability resolves.
    ability: 'orcs_first_kill',
  },
  warg: {
    id: 'warg',
    name: 'Warg',
    strength: 2,
    side: 'SHADOW',
    // All Light character special abilities (including retreat abilities) have
    // no effect when battling Warg.
    ability: 'warg_suppress_abilities',
  },
  cave_troll: {
    id: 'cave_troll',
    name: 'Cave Troll',
    strength: 9,
    side: 'SHADOW',
    // Shadow's combat card has no effect and does not add to strength.
    // Shadow must still play and discard a card normally.
    ability: 'cave_troll_nullify_shadow_card',
  },
};

export function getCharStrength(charId: LightCharId | ShadowCharId): number {
  if (charId in LIGHT_CHARACTERS) return LIGHT_CHARACTERS[charId as LightCharId].strength;
  return SHADOW_CHARACTERS[charId as ShadowCharId].strength;
}

export function getCharSide(charId: LightCharId | ShadowCharId): 'LIGHT' | 'SHADOW' {
  if (charId in LIGHT_CHARACTERS) return 'LIGHT';
  return 'SHADOW';
}

/** Sam's effective strength when protecting Frodo */
export const SAM_PROTECTING_STRENGTH = 5;
