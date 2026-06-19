'use client';
import { useState } from 'react';
import { BattlePanel } from './BattlePanel';
import type { GameView, RegionId, CardId, BattleState } from '@/game/types';

interface RegionDef {
  id: string;
  name: string;
  isHome?: boolean;
  mountain?: boolean;
  limit?: number;
}

interface BoardRow {
  label: string;
  regions: RegionDef[];
}

const BOARD_ROWS: BoardRow[] = [
  {
    label: 'The Shire',
    regions: [
      { id: 'the_shire', name: 'The Shire', isHome: true, limit: 4 },
      { id: 'bag_end',   name: 'Bag End' },
      { id: 'bree',      name: 'Bree' },
    ],
  },
  {
    label: 'Zona Light',
    regions: [
      { id: 'arthedain', name: 'Arthedain' },
      { id: 'cardolan',  name: 'Cardolan' },
      { id: 'enedwaith', name: 'Enedwaith' },
      { id: 'eregion',   name: 'Eregion' },
      { id: 'rhudaur',   name: 'Rhudaur' },
    ],
  },
  {
    label: 'Montañas',
    regions: [
      { id: 'rivendell',       name: 'Rivendell' },
      { id: 'the_high_pass',   name: 'High Pass',   mountain: true },
      { id: 'caradhras',       name: 'Caradhras',   mountain: true },
      { id: 'misty_mountains', name: 'Misty Mts',   mountain: true },
      { id: 'gap_of_rohan',    name: 'Gap of Rohan', mountain: true },
    ],
  },
  {
    label: 'Centro',
    regions: [
      { id: 'mirkwood',  name: 'Mirkwood' },
      { id: 'lothloren', name: 'Lothlórien' },
      { id: 'fangorn',   name: 'Fangorn' },
      { id: 'isengard',  name: 'Isengard' },
      { id: 'rohan',     name: 'Rohan' },
    ],
  },
  {
    label: 'Sur',
    regions: [
      { id: 'anduin',     name: 'Anduin' },
      { id: 'dol_guldur', name: 'Dol Guldur' },
      { id: 'edoras',     name: 'Edoras' },
      { id: 'helm_s_deep',name: "Helm's Deep" },
    ],
  },
  {
    label: 'Zona Shadow',
    regions: [
      { id: 'gondor',       name: 'Gondor' },
      { id: 'dagorlad',     name: 'Dagorlad' },
      { id: 'shelob_s_lair',name: "Shelob's Lair" },
    ],
  },
  {
    label: 'Mordor',
    regions: [
      { id: 'mordor',    name: 'Mordor',    isHome: true, limit: 4 },
      { id: 'barad_dur', name: 'Barad-dûr' },
      { id: 'mount_doom',name: 'Mount Doom' },
    ],
  },
];

const CHAR_SHORT: Record<string, string> = {
  frodo:        'Fr', sam:          'Sa', pippin:       'Pi', merry:        'Me',
  gandalf:      'Ga', aragorn:      'Ar', legolas:      'Le', gimli:        'Gi', boromir: 'Bo',
  balrog:       'Ba', shelob:       'Sh', witch_king:   'Wk', flying_nazgul:'Nz',
  black_rider:  'Br', saruman:      'Sr', orcs:         'Or', warg:         'Wg', cave_troll: 'Ct',
};

interface ExtendedGameView extends GameView {
  gameId: string;
  roomCode?: string;
  dbStatus?: string;
  lastAction?: string;
}

interface GameBoardProps {
  gameView: ExtendedGameView;
  gameId: string;
  onAction: () => void;
}

export function GameBoard({ gameView, gameId, onAction }: GameBoardProps) {
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isMyTurn = gameView.isMyTurn;
  const isLight = gameView.mySide === 'LIGHT';
  const inBattle = gameView.status === 'BATTLE' && gameView.activeBattle;

  async function handleMove(regionId: string) {
    if (!selectedChar || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: selectedChar, targetRegion: regionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Movimiento inválido');
        return;
      }
      setSelectedChar(null);
      onAction();
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  function getCharsInRegion(regionId: string) {
    const result: Array<{
      id: string;
      isMine: boolean;
      isRevealed: boolean;
      name: string;
    }> = [];

    for (const [charId, pos] of Object.entries(gameView.myPositions ?? {})) {
      if (pos === regionId) {
        result.push({ id: charId, isMine: true, isRevealed: true, name: charId });
      }
    }

    for (const [charId, pos] of Object.entries(gameView.opponentRevealedPositions ?? {})) {
      if (pos === regionId) {
        result.push({ id: charId, isMine: false, isRevealed: true, name: charId });
      }
    }

    const hiddenCount = (gameView.opponentHiddenCounts as Record<string, number>)?.[regionId] ?? 0;
    for (let i = 0; i < hiddenCount; i++) {
      result.push({ id: `hidden_${regionId}_${i}`, isMine: false, isRevealed: false, name: '?' });
    }

    return result;
  }

  const myCharCount = Object.values(gameView.myPositions ?? {}).filter(Boolean).length;
  const opponentRevealedCount = Object.values(gameView.opponentRevealedPositions ?? {}).filter(Boolean).length;
  const opponentHiddenCount = Object.values(gameView.opponentHiddenCounts ?? {}).reduce(
    (a: number, b) => a + (b as number),
    0,
  );
  const opponentCount = opponentRevealedCount + opponentHiddenCount;

  const isSelectingChar = isMyTurn && !inBattle && !loading;

  return (
    <div className="game-board min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Status bar */}
      <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center justify-between text-sm">
        <div className={`font-medium ${isLight ? 'text-amber-400' : 'text-red-500'}`}>
          {isLight ? 'Luz' : 'Sombra'} ({myCharCount}/9)
        </div>
        <div
          className={`font-bold text-center ${
            gameView.isMyTurn ? 'text-green-400' : 'text-slate-400'
          }`}
        >
          {gameView.isMyTurn ? 'Tu turno' : 'Oponente...'}
        </div>
        <div className="text-slate-500">Oponente: {opponentCount}</div>
      </div>

      {/* Last action */}
      {gameView.lastAction && (
        <div className="bg-slate-800/50 text-slate-400 text-xs p-2 text-center border-b border-slate-700/50">
          {gameView.lastAction}
        </div>
      )}

      {/* Battle panel */}
      {inBattle && gameView.activeBattle && (
        <BattlePanel
          battle={gameView.activeBattle as BattleState}
          myHand={gameView.myHand as CardId[]}
          mySide={gameView.mySide}
          gameId={gameId}
          onBattleAction={onAction}
        />
      )}

      {/* Board */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {BOARD_ROWS.map(row => (
          <div key={row.label} className="space-y-1">
            <div className="flex gap-2 flex-wrap">
              {row.regions.map(region => {
                const chars = getCharsInRegion(region.id);
                const canMoveTo = isSelectingChar && selectedChar !== null;
                const hasBattle =
                  inBattle && gameView.activeBattle?.region === region.id;

                return (
                  <div
                    key={region.id}
                    onClick={() => canMoveTo ? handleMove(region.id) : undefined}
                    className={[
                      'flex-1 min-w-[70px] p-2 rounded border transition-colors',
                      region.mountain
                        ? 'bg-slate-600 border-slate-500'
                        : 'bg-slate-700 border-slate-600',
                      region.isHome && isLight
                        ? 'border-amber-700 border-2'
                        : '',
                      region.isHome && !isLight
                        ? 'border-red-900 border-2'
                        : '',
                      hasBattle
                        ? 'border-red-500 border-2 animate-pulse'
                        : '',
                      canMoveTo
                        ? 'cursor-pointer hover:border-green-400 hover:bg-slate-600'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <p className="text-slate-400 text-xs mb-1 truncate">{region.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {chars.map(c => (
                        <button
                          key={c.id}
                          onClick={e => {
                            e.stopPropagation();
                            if (c.isMine && isSelectingChar) {
                              setSelectedChar(selectedChar === c.id ? null : c.id);
                            }
                          }}
                          disabled={!c.isMine || !isSelectingChar}
                          className={[
                            'text-xs px-1.5 py-0.5 rounded font-mono font-bold',
                            c.isMine
                              ? isLight
                                ? 'bg-amber-600 text-amber-100'
                                : 'bg-red-800 text-red-100'
                              : isLight
                              ? 'bg-red-900 text-red-300'
                              : 'bg-amber-900 text-amber-300',
                            c.isMine && selectedChar === c.id
                              ? 'ring-2 ring-white'
                              : '',
                            c.isMine && isSelectingChar
                              ? 'cursor-pointer hover:opacity-80'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          title={c.name}
                        >
                          {c.isMine
                            ? CHAR_SHORT[c.id] ?? c.id.slice(0, 2).toUpperCase()
                            : c.isRevealed
                            ? CHAR_SHORT[c.id] ?? '?'
                            : '?'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar — action hints */}
      {isMyTurn && !inBattle && (
        <div className="bg-slate-800 border-t border-slate-700 p-3">
          {selectedChar ? (
            <div className="flex items-center justify-between">
              <p className="text-amber-400 text-xs">
                Moviendo {selectedChar} — hacé click en la región destino
              </p>
              <button
                onClick={() => setSelectedChar(null)}
                className="text-xs text-slate-500 underline"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <p className="text-slate-400 text-xs text-center">
              Seleccioná un personaje tuyo para mover
            </p>
          )}
        </div>
      )}

      {!isMyTurn && !inBattle && (
        <div className="bg-slate-800 border-t border-slate-700 p-3">
          <p className="text-slate-500 text-xs text-center">Esperando al oponente...</p>
        </div>
      )}
    </div>
  );
}
