'use client';
import { useState, useCallback } from 'react';
import { BattlePanel } from './BattlePanel';
import {
  REGIONS,
  CONNECTIONS,
  ANDUIN_CONNECTIONS,
  TUNNEL_OF_MORIA,
  getRegionScreenPos,
} from '@/game/board';
import type { RegionId, GameView } from '@/game/types';

interface GameBoardProps {
  gameView: GameView & { lastAction?: string };
  gameId: string;
  onAction: () => void;
}

// ── Display labels ────────────────────────────────────────────────────────────

const REGION_ABBR: Record<RegionId, string> = {
  the_shire: 'Shr', bag_end: 'BgE', bree: 'Bre',
  arthedain: 'Art', cardolan: 'Cdl', enedwaith: 'Ene', eregion: 'Ere', rhudaur: 'Rhu',
  the_high_pass: 'HiP', rivendell: 'Riv', caradhras: 'Cdr',
  misty_mountains: 'MiM', gap_of_rohan: 'GoR',
  mirkwood: 'Mir', lothloren: 'Lot', fangorn: 'Fan', isengard: 'Ise', rohan: 'Roh',
  anduin: 'And', dol_guldur: 'DoG', edoras: 'Edo', helm_s_deep: 'HsD',
  gondor: 'Gon', dagorlad: 'Dag', shelob_s_lair: 'Shb',
  mordor: 'Mor', barad_dur: 'BrD', mount_doom: 'MtD',
};

const CHAR_SHORT: Record<string, string> = {
  frodo: 'Fr', sam: 'Sa', pippin: 'Pi', merry: 'Me',
  gandalf: 'Ga', aragorn: 'Ar', legolas: 'Le', gimli: 'Gi', boromir: 'Bo',
  balrog: 'Bl', shelob: 'Sh', witch_king: 'WK', flying_nazgul: 'FN', black_rider: 'BR',
  saruman: 'Sr', orcs: 'Or', warg: 'Wa', cave_troll: 'CT',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

type CharDisplay = { id: string; isMine: boolean; isHidden: boolean };

/** Deduplicated list of bidirectional connection pairs (computed once). */
const CONNECTION_LINES: Array<[RegionId, RegionId]> = (() => {
  const seen = new Set<string>();
  const lines: Array<[RegionId, RegionId]> = [];
  for (const from of Object.keys(CONNECTIONS) as RegionId[]) {
    for (const to of CONNECTIONS[from]) {
      const key = from < to ? `${from}|${to}` : `${to}|${from}`;
      if (!seen.has(key)) {
        seen.add(key);
        lines.push([from, to]);
      }
    }
  }
  return lines;
})();

function regionClasses(
  rid: RegionId,
  isValidMove: boolean,
  hasSelectedHere: boolean,
  isBattle: boolean,
): string {
  const reg = REGIONS[rid];
  const base =
    'absolute flex flex-col items-center justify-center select-none cursor-pointer ' +
    'rounded border transition-all duration-150 overflow-hidden';

  const size =
    reg.type === 'home_area' ? 'w-9 h-9 text-[7px]' : 'w-11 h-11 text-[8px]';

  let bg = 'bg-slate-700 border-slate-600';
  if (reg.type === 'mountain')            bg = 'bg-slate-800 border-slate-500';
  if (reg.type === 'home' && reg.side === 'LIGHT')      bg = 'bg-amber-950 border-amber-700';
  if (reg.type === 'home_area' && reg.side === 'LIGHT') bg = 'bg-amber-950/60 border-amber-800';
  if (reg.type === 'home' && reg.side === 'SHADOW')     bg = 'bg-red-950 border-red-800';
  if (reg.type === 'home_area' && reg.side === 'SHADOW')bg = 'bg-red-950/60 border-red-900';

  let ring = '';
  if (isBattle)       ring = 'ring-2 ring-red-500 animate-pulse';
  else if (isValidMove)    ring = 'ring-2 ring-green-400';
  else if (hasSelectedHere) ring = 'ring-1 ring-amber-400';

  return [base, size, bg, ring].filter(Boolean).join(' ');
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GameBoard({ gameView, gameId, onAction }: GameBoardProps) {
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [validMoves, setValidMoves]     = useState<Set<string>>(new Set());
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const {
    mySide,
    myPositions,
    opponentRevealedPositions,
    opponentHiddenCounts,
    isMyTurn,
    status,
    activeBattle,
    myHand,
    myDiscard,
  } = gameView;
  const lastAction = (gameView as GameView & { lastAction?: string }).lastAction;

  const canAct = isMyTurn && status === 'ACTIVE' && !activeBattle && !loading;

  // ── Character helpers ──────────────────────────────────────────────────────

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

  // ── Select a character and fetch its valid moves ───────────────────────────

  const selectChar = useCallback(
    async (charId: string) => {
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
        // Silently fail — highlights won't show but player can still attempt moves
      }
    },
    [gameId, selectedChar],
  );

  // ── Execute a move ────────────────────────────────────────────────────────

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
        onAction();
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  // ── Handle node click ──────────────────────────────────────────────────────

  function handleNodeClick(rid: RegionId, myCharsHere: CharDisplay[]) {
    // If a char is selected and this is a valid destination → move
    if (selectedChar && validMoves.has(rid)) {
      void handleMove(rid);
      return;
    }
    // If it's my turn and I have chars here → select the first
    if (canAct && myCharsHere.length > 0) {
      void selectChar(myCharsHere[0].id);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const battleRegion = activeBattle?.region ?? null;
  const sideColor    = mySide === 'LIGHT' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pt-2 pb-1 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${sideColor}`}>
            {mySide === 'LIGHT' ? 'La Luz' : 'La Sombra'}
          </span>
          <span
            className={`text-xs font-semibold ${
              isMyTurn ? 'text-green-400' : 'text-slate-500'
            }`}
          >
            {activeBattle
              ? '⚔ Batalla'
              : isMyTurn
              ? '▶ Tu turno'
              : '⏳ Esperando…'}
          </span>
        </div>
        {lastAction && (
          <p className="text-slate-500 text-[10px] truncate">{lastAction}</p>
        )}
        {error && (
          <p className="text-red-400 text-[10px]">{error}</p>
        )}
        {selectedChar && (
          <p className="text-green-400 text-[10px]">
            Seleccionado: <strong>{CHAR_SHORT[selectedChar] ?? selectedChar}</strong>
            {validMoves.size > 0
              ? ` · ${validMoves.size} destinos`
              : ''}
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

      {/* ── Board ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-1">
        <div
          className="relative w-full aspect-square"
          style={{ maxWidth: '480px', maxHeight: '480px' }}
        >
          {/* SVG connections layer */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <marker id="arr-blue" markerWidth="4" markerHeight="3" refX="3.5" refY="1.5" orient="auto">
                <polygon points="0 0, 4 1.5, 0 3" fill="#3b82f6" />
              </marker>
              <marker id="arr-purple" markerWidth="4" markerHeight="3" refX="3.5" refY="1.5" orient="auto">
                <polygon points="0 0, 4 1.5, 0 3" fill="#a855f7" />
              </marker>
            </defs>

            {/* Normal bidirectional connections */}
            {CONNECTION_LINES.map(([from, to]) => {
              const a = getRegionScreenPos(from, mySide);
              const b = getRegionScreenPos(to, mySide);
              return (
                <line
                  key={`${from}-${to}`}
                  x1={a.left} y1={a.top}
                  x2={b.left} y2={b.top}
                  stroke="#334155"
                  strokeWidth="0.5"
                />
              );
            })}

            {/* Anduin (Light-only, directional) */}
            {ANDUIN_CONNECTIONS.map(([from, to]) => {
              const a = getRegionScreenPos(from, mySide);
              const b = getRegionScreenPos(to, mySide);
              return (
                <line
                  key={`anduin-${from}-${to}`}
                  x1={a.left} y1={a.top}
                  x2={b.left} y2={b.top}
                  stroke="#3b82f6"
                  strokeWidth="1"
                  markerEnd="url(#arr-blue)"
                />
              );
            })}

            {/* Tunnel of Moria (Light-only, dashed) */}
            {(() => {
              const a = getRegionScreenPos(TUNNEL_OF_MORIA.from, mySide);
              const b = getRegionScreenPos(TUNNEL_OF_MORIA.to, mySide);
              return (
                <line
                  x1={a.left} y1={a.top}
                  x2={b.left} y2={b.top}
                  stroke="#a855f7"
                  strokeWidth="0.8"
                  strokeDasharray="2 1"
                  markerEnd="url(#arr-purple)"
                />
              );
            })()}
          </svg>

          {/* Region nodes */}
          {(Object.keys(REGIONS) as RegionId[]).map(rid => {
            const { left, top } = getRegionScreenPos(rid, mySide);
            const charsHere    = getCharsInRegion(rid);
            const myCharsHere  = charsHere.filter(c => c.isMine);
            const isValidMove  = validMoves.has(rid) && !!selectedChar;
            const hasSel       = myCharsHere.some(c => c.id === selectedChar);
            const isBattle     = battleRegion === rid;

            return (
              <div
                key={rid}
                title={REGIONS[rid].name}
                className={regionClasses(rid, isValidMove, hasSel, isBattle)}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={() => handleNodeClick(rid, myCharsHere)}
              >
                {/* Region abbreviation */}
                <span className="leading-none text-slate-400 font-mono">
                  {REGION_ABBR[rid]}
                </span>

                {/* Character dots */}
                {charsHere.length > 0 && (
                  <div className="flex flex-wrap gap-px justify-center mt-px max-w-full px-px">
                    {charsHere.slice(0, 4).map(c => (
                      <span
                        key={c.id}
                        onClick={e => {
                          if (!c.isMine || !canAct) return;
                          e.stopPropagation();
                          void selectChar(c.id);
                        }}
                        className={[
                          'inline-flex items-center justify-center rounded-full font-bold leading-none',
                          'w-[10px] h-[10px] text-[6px]',
                          c.isHidden
                            ? 'bg-slate-600 text-slate-400'
                            : c.isMine
                            ? mySide === 'LIGHT'
                              ? 'bg-amber-500 text-slate-900'
                              : 'bg-red-600 text-white'
                            : mySide === 'LIGHT'
                            ? 'bg-red-700 text-white'
                            : 'bg-amber-600 text-slate-900',
                          c.isMine && canAct ? 'cursor-pointer' : '',
                          c.id === selectedChar ? 'ring-1 ring-white scale-110' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {c.isHidden ? '?' : (CHAR_SHORT[c.id] ?? '?')[0]}
                      </span>
                    ))}
                    {charsHere.length > 4 && (
                      <span className="text-[6px] text-slate-500 leading-none">
                        +{charsHere.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Battle panel ────────────────────────────────────────────────────── */}
      {activeBattle && (
        <div className="shrink-0 max-h-[40vh] overflow-y-auto">
          <BattlePanel
            battle={activeBattle}
            myHand={myHand}
            myDiscard={myDiscard}
            mySide={mySide}
            gameId={gameId}
            onBattleAction={onAction}
          />
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-1 flex gap-3 text-[9px] text-slate-600 flex-wrap">
        <span className="text-blue-500">──▶ Anduin</span>
        <span className="text-purple-500">- -▶ Túnel Moria</span>
        <span className="text-green-400">⬡ destinos</span>
        <span className="text-red-400">⬡ batalla</span>
      </div>
    </div>
  );
}
