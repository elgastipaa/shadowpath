'use client';
import { useState, useCallback } from 'react';
import { BattlePanel } from './BattlePanel';
import { REGIONS, REGION_POS } from '@/game/board';
import type { RegionId, GameView } from '@/game/types';

interface GameBoardProps {
  gameView: GameView & { lastAction?: string };
  gameId: string;
  onAction: () => void;
}

const CHAR_FULL: Record<string, string> = {
  frodo: 'Frodo', sam: 'Sam', pippin: 'Pippin', merry: 'Merry',
  gandalf: 'Gandalf', aragorn: 'Aragorn', legolas: 'Legolas', gimli: 'Gimli', boromir: 'Boromir',
  balrog: 'Balrog', shelob: 'Shelob', witch_king: 'Witch-king', flying_nazgul: 'Nazgûl',
  black_rider: 'Black Rider', saruman: 'Saruman', orcs: 'Orcs', warg: 'Warg', cave_troll: 'Cave Troll',
};

const CHAR_STR: Record<string, number> = {
  frodo: 1, sam: 2, pippin: 1, merry: 2,
  gandalf: 5, aragorn: 4, legolas: 3, gimli: 3, boromir: 0,
  balrog: 5, shelob: 5, witch_king: 5, flying_nazgul: 3,
  black_rider: 3, saruman: 4, orcs: 2, warg: 2, cave_troll: 9,
};

type CharDisplay = { id: string; isMine: boolean; isHidden: boolean };

export function GameBoard({ gameView, gameId, onAction }: GameBoardProps) {
  const [selectedRegion, setSelectedRegion] = useState<RegionId | null>(null);
  const [selectedChar, setSelectedChar]     = useState<string | null>(null);
  const [validMoves, setValidMoves]         = useState<Set<string>>(new Set());
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const {
    mySide, myPositions, opponentRevealedPositions,
    opponentHiddenCounts, isMyTurn, status, activeBattle, myHand, myDiscard,
  } = gameView;
  const lastAction = (gameView as GameView & { lastAction?: string }).lastAction;
  const canAct = isMyTurn && status === 'ACTIVE' && !activeBattle && !loading;

  function getCharsInRegion(rid: RegionId): CharDisplay[] {
    const result: CharDisplay[] = [];
    for (const [id, pos] of Object.entries(myPositions)) {
      if (pos === rid) result.push({ id, isMine: true, isHidden: false });
    }
    for (const [id, pos] of Object.entries(opponentRevealedPositions)) {
      if (pos === rid) result.push({ id, isMine: false, isHidden: false });
    }
    const hidden = opponentHiddenCounts[rid] ?? 0;
    for (let i = 0; i < hidden; i++) {
      result.push({ id: `?-${rid}-${i}`, isMine: false, isHidden: true });
    }
    return result;
  }

  const selectChar = useCallback(async (charId: string) => {
    if (charId === selectedChar) {
      setSelectedChar(null);
      setValidMoves(new Set());
      return;
    }
    setSelectedChar(charId);
    setValidMoves(new Set());
    try {
      const res = await fetch(
        `/api/games/${gameId}/moves?characterId=${encodeURIComponent(charId)}`,
      );
      if (res.ok) {
        const data = await res.json() as { moves: Array<{ to: string }> };
        setValidMoves(new Set(data.moves.map(m => m.to)));
      }
    } catch {
      // Silently fail — player can still see the board
    }
  }, [gameId, selectedChar]);

  async function handleMove(regionId: string) {
    if (!selectedChar) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: selectedChar, targetRegion: regionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al mover');
      } else {
        setSelectedChar(null);
        setValidMoves(new Set());
        setSelectedRegion(null);
        onAction();
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  function handleDotClick(rid: RegionId) {
    if (selectedChar && validMoves.has(rid)) {
      void handleMove(rid);
      return;
    }
    setSelectedRegion(prev => (prev === rid && !selectedChar ? null : rid));
  }

  const battleRegion = activeBattle?.region ?? null;
  const sideColor = mySide === 'LIGHT' ? 'text-amber-400' : 'text-red-400';
  const selectedRegionChars = selectedRegion ? getCharsInRegion(selectedRegion) : [];
  const myCharsInSelected = selectedRegionChars.filter(c => c.isMine);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">

      {/* ── Status bar ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pt-2 pb-1">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${sideColor}`}>
            {mySide === 'LIGHT' ? 'La Luz' : 'La Sombra'}
          </span>
          <span className={`text-xs font-semibold ${isMyTurn ? 'text-green-400' : 'text-slate-500'}`}>
            {activeBattle ? '⚔ Batalla' : isMyTurn ? '▶ Tu turno' : '⏳ Esperando…'}
          </span>
        </div>
        {lastAction && (
          <p className="text-slate-500 text-[10px] truncate mt-0.5">{lastAction}</p>
        )}
        {error && (
          <p className="text-red-400 text-[10px] mt-0.5">{error}</p>
        )}
        {selectedChar && (
          <p className="text-green-400 text-[10px] mt-0.5">
            Moviendo: <strong>{CHAR_FULL[selectedChar] ?? selectedChar}</strong>
            {validMoves.size > 0 ? ` · ${validMoves.size} destinos` : ''}
            {' · '}
            <button
              className="underline"
              onClick={() => { setSelectedChar(null); setValidMoves(new Set()); }}
            >
              cancelar
            </button>
          </p>
        )}
      </div>

      {/* ── Board image with region dots ────────────────────────────────────── */}
      <div
        className="shrink-0 mx-auto relative"
        style={{ width: 'min(100%, 55vh)', aspectRatio: '1 / 1' }}
      >
        <img
          src="/board.jpg"
          alt="Tablero"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />

        {(Object.keys(REGION_POS) as RegionId[]).map(rid => {
          const { left, top } = REGION_POS[rid];
          const charsHere    = getCharsInRegion(rid);
          const myCharsHere  = charsHere.filter(c => c.isMine);
          const oppCharsHere = charsHere.filter(c => !c.isMine);
          const isValidMove  = !!selectedChar && validMoves.has(rid);
          const isSelected   = selectedRegion === rid;
          const isBattle     = battleRegion === rid;

          // Dot fill
          let dotClasses = 'bg-white/10 border-white/20';
          if (myCharsHere.length > 0 && oppCharsHere.length > 0) {
            dotClasses = mySide === 'LIGHT'
              ? 'bg-amber-400 border-purple-500'
              : 'bg-red-500 border-purple-500';
          } else if (myCharsHere.length > 0) {
            dotClasses = mySide === 'LIGHT'
              ? 'bg-amber-400 border-amber-300'
              : 'bg-red-500 border-red-400';
          } else if (oppCharsHere.length > 0) {
            dotClasses = mySide === 'LIGHT'
              ? 'bg-red-500 border-red-400'
              : 'bg-amber-400 border-amber-300';
          }

          // Ring overlay
          let ring = '';
          if (isBattle)      ring = 'ring-2 ring-red-400 animate-pulse';
          else if (isValidMove)   ring = 'ring-2 ring-green-400 shadow-green-400/60 shadow-md';
          else if (isSelected)    ring = 'ring-2 ring-white';

          return (
            <button
              key={rid}
              onClick={() => handleDotClick(rid)}
              title={REGIONS[rid].name}
              className={[
                'absolute w-6 h-6 rounded-full border-2 transition-all duration-150',
                dotClasses, ring,
              ].join(' ')}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {charsHere.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-slate-900 text-[7px] font-bold flex items-center justify-center text-white leading-none px-0.5">
                  {charsHere.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Info / action panel ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeBattle ? (
          <BattlePanel
            battle={activeBattle}
            myHand={myHand}
            myDiscard={myDiscard}
            mySide={mySide}
            gameId={gameId}
            onBattleAction={onAction}
          />
        ) : selectedRegion ? (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{REGIONS[selectedRegion].name}</h3>
              <button
                className="text-slate-500 text-xs underline"
                onClick={() => {
                  setSelectedRegion(null);
                  setSelectedChar(null);
                  setValidMoves(new Set());
                }}
              >
                cerrar
              </button>
            </div>

            {myCharsInSelected.length > 0 && (
              <div>
                <p className={`text-[10px] uppercase tracking-wider mb-1.5 ${sideColor}`}>
                  Mis personajes
                </p>
                <div className="flex flex-wrap gap-2">
                  {myCharsInSelected.map(c => (
                    <button
                      key={c.id}
                      disabled={!canAct}
                      onClick={() => canAct && void selectChar(c.id)}
                      className={[
                        'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                        selectedChar === c.id
                          ? mySide === 'LIGHT'
                            ? 'bg-amber-400 text-slate-900 border-amber-400'
                            : 'bg-red-500 text-white border-red-500'
                          : 'bg-slate-800 border-slate-600 text-white hover:border-slate-400',
                        !canAct ? 'opacity-50 cursor-default' : '',
                      ].join(' ')}
                    >
                      {CHAR_FULL[c.id] ?? c.id}
                      {CHAR_STR[c.id] !== undefined && (
                        <span className="text-slate-400 ml-1">({CHAR_STR[c.id]})</span>
                      )}
                    </button>
                  ))}
                </div>
                {selectedChar && myCharsInSelected.some(c => c.id === selectedChar) && validMoves.size > 0 && (
                  <p className="text-green-400 text-[10px] mt-1">
                    Tocá una región verde en el tablero para mover
                  </p>
                )}
              </div>
            )}

            {selectedRegionChars.filter(c => !c.isMine).length > 0 && (
              <div>
                <p className={`text-[10px] uppercase tracking-wider mb-1.5 ${mySide === 'LIGHT' ? 'text-red-400' : 'text-amber-400'}`}>
                  Oponente
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedRegionChars.filter(c => !c.isMine).map(c => (
                    <span
                      key={c.id}
                      className="px-2.5 py-1 rounded text-xs bg-slate-800 border border-slate-700 text-slate-400"
                    >
                      {c.isHidden ? '?' : (CHAR_FULL[c.id] ?? c.id)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedRegionChars.length === 0 && (
              <p className="text-slate-600 text-xs">Región vacía</p>
            )}

            {selectedChar && validMoves.has(selectedRegion) && (
              <button
                onClick={() => void handleMove(selectedRegion)}
                disabled={loading}
                className={[
                  'w-full py-2 rounded font-bold text-sm transition-colors',
                  mySide === 'LIGHT'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                    : 'bg-red-600 hover:bg-red-500 text-white',
                  loading ? 'opacity-50' : '',
                ].join(' ')}
              >
                {loading ? 'Moviendo...' : `Mover a ${REGIONS[selectedRegion].name}`}
              </button>
            )}
          </div>
        ) : (
          <p className="p-4 text-center text-slate-600 text-xs">
            Tocá una región en el tablero para ver detalles
          </p>
        )}
      </div>
    </div>
  );
}
