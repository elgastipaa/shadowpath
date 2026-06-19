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

// ── Character metadata ─────────────────────────────────────────────────────────

const CHAR_META: Record<string, { name: string; str: number; ability: string }> = {
  frodo:         { name: 'Frodo',          str: 1,  ability: 'Puede retroceder lateralmente antes de las cartas (no en montañas, no vs Warg)' },
  sam:           { name: 'Sam',            str: 2,  ability: 'Puede sustituir a Frodo como defensor, con fuerza efectiva 5 (no vs Warg)' },
  pippin:        { name: 'Pippin',         str: 1,  ability: 'Al atacar, puede retroceder hacia atrás antes de las cartas (no vs Warg)' },
  merry:         { name: 'Merry',          str: 2,  ability: 'Derrota automáticamente al Witch-king antes de la fase de cartas' },
  gandalf:       { name: 'Gandalf',        str: 5,  ability: 'La Sombra debe revelar su carta primero; Gandalf elige la suya después' },
  aragorn:       { name: 'Aragorn',        str: 4,  ability: 'Al atacar puede moverse lateral o hacia atrás (no en montañas)' },
  legolas:       { name: 'Legolas',        str: 3,  ability: 'Derrota automáticamente al Nazgûl Volador antes de la fase de cartas' },
  gimli:         { name: 'Gimli',          str: 3,  ability: 'Derrota a los Orcos antes de que su habilidad se resuelva' },
  boromir:       { name: 'Boromir',        str: 0,  ability: 'Ambos personajes son eliminados antes de que se resuelva la habilidad enemiga' },
  balrog:        { name: 'Balrog',         str: 5,  ability: 'En Caradhras: puede destruir a quien use el Túnel de Moria (Eregion→Fangorn)' },
  shelob:        { name: 'Shelob',         str: 5,  ability: 'Al vencer, se teleporta a Gondor (si no hay lugar libre, es eliminada)' },
  witch_king:    { name: 'Witch-king',     str: 5,  ability: 'Puede moverse lateralmente al atacar (no en montañas)' },
  flying_nazgul: { name: 'Nazgûl Volador', str: 3,  ability: 'Puede moverse a cualquier región con exactamente 1 personaje de Luz' },
  black_rider:   { name: 'Black Rider',    str: 3,  ability: 'Avanza a través de regiones vacías o de La Sombra para atacar' },
  saruman:       { name: 'Saruman',        str: 4,  ability: 'Puede declarar "sin cartas": se comparan fuerzas base puras' },
  orcs:          { name: 'Orcos',          str: 2,  ability: 'Al atacar, destruye al primer personaje de Luz antes de las cartas' },
  warg:          { name: 'Warg',           str: 2,  ability: 'Anula todas las habilidades especiales de los personajes de Luz' },
  cave_troll:    { name: 'Cave Troll',     str: 9,  ability: 'La carta de La Sombra no tiene efecto ni suma fuerza (fuerza 9 pura)' },
};

type CharDisplay = { id: string; isMine: boolean; isHidden: boolean };

// ── Component ──────────────────────────────────────────────────────────────────

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

  // Shadow sees the board rotated 180° (their home at bottom-right)
  function getBoardPos(left: number, top: number) {
    return mySide === 'SHADOW'
      ? { left: 100 - left, top: 100 - top }
      : { left, top };
  }

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

  // Select a character and fetch its valid move destinations
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
      // Network error — highlights won't show but board remains functional
    }
  }, [gameId, selectedChar]);

  function clearSelection() {
    setSelectedChar(null);
    setValidMoves(new Set());
    setSelectedRegion(null);
  }

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
        clearSelection();
        onAction();
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  function handleDotClick(rid: RegionId) {
    // Priority 1: if a char is selected and this is a valid destination → move
    if (selectedChar && validMoves.has(rid)) {
      void handleMove(rid);
      return;
    }

    const myCharsHere = getCharsInRegion(rid).filter(c => c.isMine);

    // Priority 2: exactly 1 of my chars here → auto-select + fetch moves
    if (canAct && myCharsHere.length === 1) {
      setSelectedRegion(rid);
      if (selectedChar === myCharsHere[0].id) {
        // Tapping same char again → deselect
        setSelectedChar(null);
        setValidMoves(new Set());
      } else {
        void selectChar(myCharsHere[0].id);
      }
      return;
    }

    // Priority 3: open info panel (clear pending selection to avoid confusion)
    if (selectedChar) {
      setSelectedChar(null);
      setValidMoves(new Set());
    }
    setSelectedRegion(prev => prev === rid ? null : rid);
  }

  // ── Computed state ────────────────────────────────────────────────────────────

  const battleRegion = activeBattle?.region ?? null;
  const isLight      = mySide === 'LIGHT';
  const myColor      = isLight ? 'amber' : 'red';
  const oppColor     = isLight ? 'red' : 'amber';

  const selectedRegionChars  = selectedRegion ? getCharsInRegion(selectedRegion) : [];
  const myCharsInSelected    = selectedRegionChars.filter(c => c.isMine);
  const oppCharsInSelected   = selectedRegionChars.filter(c => !c.isMine);

  // Who has the current turn label
  const opponentLabel = isLight ? 'La Sombra' : 'La Luz';

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    // Outer shell: full-page bg, centers the column on desktop
    <div className="min-h-dvh bg-slate-950 flex justify-center">
      {/* Centered game column — max-w-sm keeps it mobile-sized on desktop */}
      <div className="w-full max-w-sm flex flex-col min-h-dvh">

        {/* ── Turn banner ───────────────────────────────────────────────────── */}
        {activeBattle ? (
          <div className="shrink-0 px-4 py-2 bg-red-800 text-white text-center font-bold text-sm tracking-wide">
            ⚔ BATALLA EN CURSO
          </div>
        ) : isMyTurn ? (
          <div className={`shrink-0 px-4 py-2 text-center font-bold text-sm tracking-wide ${
            isLight ? 'bg-amber-700 text-amber-100' : 'bg-red-900 text-red-100'
          }`}>
            ▶ TU TURNO — {isLight ? 'LA LUZ' : 'LA SOMBRA'}
          </div>
        ) : (
          <div className="shrink-0 px-4 py-2 bg-slate-800 text-slate-400 text-center font-semibold text-sm tracking-wide">
            ⏳ TURNO DE {opponentLabel.toUpperCase()}
          </div>
        )}

        {/* ── Side label + last action + errors ────────────────────────────── */}
        <div className="shrink-0 px-3 pt-1.5 pb-1 space-y-0.5 bg-slate-900">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold ${isLight ? 'text-amber-400' : 'text-red-400'}`}>
              Jugás como {isLight ? 'La Luz' : 'La Sombra'}
            </span>
            {loading && (
              <span className="text-[10px] text-slate-500 animate-pulse">Enviando…</span>
            )}
          </div>
          {lastAction && (
            <p className="text-slate-500 text-[10px] truncate">{lastAction}</p>
          )}
          {error && (
            <p className="text-red-400 text-[10px]">{error}</p>
          )}
          {selectedChar && !loading && (
            <div className="flex items-center gap-2">
              <p className="text-green-400 text-[10px]">
                Seleccionado: <strong>{CHAR_META[selectedChar]?.name ?? selectedChar}</strong>
                {validMoves.size > 0 ? ` · ${validMoves.size} destinos` : ' · cargando…'}
              </p>
              <button
                className="text-[10px] text-slate-500 underline"
                onClick={clearSelection}
              >
                cancelar
              </button>
            </div>
          )}
        </div>

        {/* ── Board image with region dots ──────────────────────────────────── */}
        <div className="shrink-0 relative w-full bg-slate-950" style={{ aspectRatio: '1 / 1' }}>
          {/* Board image — rotated 180° for Shadow */}
          <img
            src="/board.jpg"
            alt="Tablero"
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            style={{ transform: mySide === 'SHADOW' ? 'rotate(180deg)' : undefined }}
            draggable={false}
          />

          {/* Region dots */}
          {(Object.keys(REGION_POS) as RegionId[]).map(rid => {
            const raw         = REGION_POS[rid];
            const { left, top } = getBoardPos(raw.left, raw.top);
            const charsHere   = getCharsInRegion(rid);
            const myCharsHere = charsHere.filter(c => c.isMine);
            const oppHere     = charsHere.filter(c => !c.isMine);
            const isValidMove = !!selectedChar && validMoves.has(rid);
            const isSelected  = selectedRegion === rid;
            const isBattle    = battleRegion === rid;
            const hasMine     = myCharsHere.length > 0;
            const hasOpp      = oppHere.length > 0;

            // Dot appearance
            let dotBg     = 'bg-slate-700/60';
            let dotBorder = 'border-slate-500/50';
            if (hasMine && hasOpp) {
              dotBg = isLight ? 'bg-amber-500'  : 'bg-red-500';
              dotBorder = 'border-purple-400';
            } else if (hasMine) {
              dotBg     = isLight ? 'bg-amber-400'  : 'bg-red-500';
              dotBorder = isLight ? 'border-amber-200' : 'border-red-300';
            } else if (hasOpp) {
              dotBg     = isLight ? 'bg-red-600'   : 'bg-amber-500';
              dotBorder = isLight ? 'border-red-400'   : 'border-amber-300';
            }

            let ringClass = '';
            if (isBattle)        ringClass = 'ring-2 ring-red-400 animate-pulse';
            else if (isValidMove) ringClass = 'ring-2 ring-green-400 ring-offset-1 ring-offset-transparent shadow-lg shadow-green-500/40';
            else if (isSelected)  ringClass = 'ring-2 ring-white';

            return (
              <button
                key={rid}
                onClick={() => handleDotClick(rid)}
                title={REGIONS[rid].name}
                className={[
                  'absolute w-6 h-6 rounded-full border-2 transition-all duration-150 active:scale-110',
                  dotBg, dotBorder, ringClass,
                ].join(' ')}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {charsHere.length > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-slate-900 border border-slate-700 text-[7px] font-bold flex items-center justify-center text-white leading-none px-0.5"
                  >
                    {charsHere.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Info / action panel — fills remaining height ──────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-900">
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

              {/* Region header */}
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <div>
                  <h3 className="font-bold text-base text-white">{REGIONS[selectedRegion].name}</h3>
                  <p className="text-[10px] text-slate-500 capitalize">{REGIONS[selectedRegion].type}</p>
                </div>
                <button
                  className="text-slate-600 hover:text-slate-400 text-xs px-2 py-1 rounded border border-slate-700"
                  onClick={clearSelection}
                >
                  ✕
                </button>
              </div>

              {/* My characters */}
              {myCharsInSelected.length > 0 && (
                <div className="space-y-1.5">
                  <p className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? 'text-amber-400' : 'text-red-400'}`}>
                    Mis personajes
                  </p>
                  {myCharsInSelected.map(c => {
                    const meta = CHAR_META[c.id];
                    const isSelChar = selectedChar === c.id;
                    return (
                      <button
                        key={c.id}
                        disabled={!canAct}
                        onClick={() => canAct && void selectChar(c.id)}
                        className={[
                          'w-full text-left px-3 py-2 rounded-lg border transition-colors',
                          isSelChar
                            ? isLight
                              ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                              : 'bg-red-500/20 border-red-400 text-red-100'
                            : 'bg-slate-800 border-slate-700 hover:border-slate-500 text-white',
                          !canAct ? 'opacity-50 cursor-default' : 'cursor-pointer',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{meta?.name ?? c.id}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                            isLight ? 'bg-amber-500/30 text-amber-300' : 'bg-red-500/30 text-red-300'
                          }`}>
                            FZ {meta?.str ?? '?'}
                          </span>
                        </div>
                        {meta?.ability && (
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                            {meta.ability}
                          </p>
                        )}
                        {isSelChar && validMoves.size > 0 && (
                          <p className="text-[10px] text-green-400 mt-1 font-medium">
                            ↑ Tocá un punto verde en el tablero para mover
                          </p>
                        )}
                        {isSelChar && validMoves.size === 0 && (
                          <p className="text-[10px] text-slate-500 mt-1">
                            Sin movimientos posibles
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Opponent characters */}
              {oppCharsInSelected.length > 0 && (
                <div className="space-y-1.5">
                  <p className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? 'text-red-400' : 'text-amber-400'}`}>
                    Oponente
                  </p>
                  {oppCharsInSelected.map(c => {
                    const meta = c.isHidden ? null : CHAR_META[c.id];
                    return (
                      <div
                        key={c.id}
                        className="px-3 py-2 rounded-lg border bg-slate-800/50 border-slate-700"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-slate-300">
                            {c.isHidden ? '? (oculto)' : (meta?.name ?? c.id)}
                          </span>
                          {meta && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                              isLight ? 'bg-red-500/30 text-red-300' : 'bg-amber-500/30 text-amber-300'
                            }`}>
                              FZ {meta.str}
                            </span>
                          )}
                        </div>
                        {meta?.ability && (
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                            {meta.ability}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedRegionChars.length === 0 && (
                <p className="text-slate-600 text-xs text-center py-2">Región vacía</p>
              )}

              {/* Move here button when this region is a valid destination */}
              {selectedChar && validMoves.has(selectedRegion) && (
                <button
                  onClick={() => void handleMove(selectedRegion)}
                  disabled={loading}
                  className={[
                    'w-full py-2.5 rounded-lg font-bold text-sm transition-colors mt-1',
                    isLight
                      ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-900'
                      : 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white',
                    loading ? 'opacity-50' : '',
                  ].join(' ')}
                >
                  {loading ? 'Moviendo…' : `Mover a ${REGIONS[selectedRegion].name}`}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 space-y-1 text-center">
              <p className="text-slate-500 text-xs">
                {canAct
                  ? 'Tocá un punto del tablero para mover tus personajes'
                  : `Esperando el movimiento de ${opponentLabel}…`}
              </p>
              {canAct && (
                <p className="text-slate-600 text-[10px]">
                  Los puntos {isLight ? 'dorados' : 'rojos'} son tus personajes
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
