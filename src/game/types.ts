export type RegionId =
  | 'the_shire' | 'bag_end' | 'bree'
  | 'arthedain' | 'cardolan' | 'enedwaith' | 'eregion' | 'rhudaur'
  | 'the_high_pass' | 'caradhras' | 'misty_mountains' | 'gap_of_rohan'
  | 'rivendell' | 'mirkwood' | 'fangorn' | 'rohan' | 'lothloren'
  | 'isengard' | 'edoras' | 'anduin' | 'dol_guldur' | 'helm_s_deep'
  | 'gondor' | 'dagorlad' | 'shelob_s_lair'
  | 'mordor' | 'barad_dur' | 'mount_doom';

export type LightCharId =
  | 'frodo' | 'sam' | 'pippin' | 'merry'
  | 'gandalf' | 'aragorn' | 'legolas' | 'gimli' | 'boromir';

export type ShadowCharId =
  | 'balrog' | 'shelob' | 'witch_king' | 'flying_nazgul'
  | 'black_rider' | 'saruman' | 'orcs' | 'warg' | 'cave_troll';

export type CharId = LightCharId | ShadowCharId;

export type Side = 'LIGHT' | 'SHADOW';

export type LightCardId =
  | 'l_1' | 'l_2' | 'l_3' | 'l_4' | 'l_5'
  | 'l_magic' | 'l_noble_sacrifice' | 'l_elven_cloak' | 'l_retreat';

export type ShadowCardId =
  | 's_1' | 's_2' | 's_3' | 's_4' | 's_5' | 's_6'
  | 's_magic' | 's_eye_of_sauron' | 's_retreat';

export type CardId = LightCardId | ShadowCardId;

export interface BattleState {
  region: RegionId;
  lightChar: LightCharId;
  shadowChar: ShadowCharId;
  /** Which side initiated (attacked forward) */
  attacker: Side;
  step: 'char_abilities' | 'select_card' | 'resolve_cards' | 'compare_strength' | 'done';
  lightCardPlayed?: LightCardId;
  shadowCardPlayed?: ShadowCardId;
  /** Additional battles queued if multiple chars share a region */
  pendingBattles: Array<{ lightChar: LightCharId; shadowChar: ShadowCharId }>;
  log: string[];
}

export interface GameState {
  lightPositions: Record<LightCharId, RegionId | null>; // null = eliminated
  shadowPositions: Record<ShadowCharId, RegionId | null>;
  revealedLight: LightCharId[];
  revealedShadow: ShadowCharId[];
  lightHand: LightCardId[];
  shadowHand: ShadowCardId[];
  lightDiscard: LightCardId[];
  shadowDiscard: ShadowCardId[];
  activeBattle: BattleState | null;
  currentTurn: Side;
  status: 'SETUP' | 'ACTIVE' | 'BATTLE' | 'ENDED';
  winner: Side | null;
  winReason: string | null;
  lightSetupConfirmed: boolean;
  shadowSetupConfirmed: boolean;
}

export interface GameView {
  mySide: Side;
  currentTurn: Side;
  isMyTurn: boolean;
  status: GameState['status'];
  myPositions: Record<string, RegionId | null>;
  opponentRevealedPositions: Record<string, RegionId | null>;
  opponentHiddenCounts: Partial<Record<RegionId, number>>;
  myHand: CardId[];
  myDiscard: CardId[];
  opponentDiscardCount: number;
  activeBattle: BattleState | null;
  winner: Side | null;
  winReason: string | null;
}

export interface CharacterData {
  id: CharId;
  name: string;
  strength: number;
  side: Side;
  ability: string;
}

export interface CardData {
  id: CardId;
  type: 'strength' | 'text';
  value?: number;
  effect?: string;
  name: string;
  side: Side;
}

export interface MoveResult {
  newState: GameState;
  battleInitiated: boolean;
  log: string;
}

export interface BattleResult {
  newState: GameState;
  lightDefeated: boolean;
  shadowDefeated: boolean;
  retreated: boolean;
  retreatedSide?: Side;
  retreatedTo?: RegionId;
  log: string[];
}

export interface VictoryResult {
  winner: Side;
  reason: string;
}
