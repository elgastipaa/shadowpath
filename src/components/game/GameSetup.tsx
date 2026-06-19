'use client';
import { useState } from 'react';
import type { GameView } from '@/game/types';

const LIGHT_CHARS = ['frodo', 'sam', 'pippin', 'merry', 'gandalf', 'aragorn', 'legolas', 'gimli', 'boromir'];
const SHADOW_CHARS = [
  'balrog', 'shelob', 'witch_king', 'flying_nazgul', 'black_rider',
  'saruman', 'orcs', 'warg', 'cave_troll',
];
const CHAR_DISPLAY: Record<string, { name: string; str: number }> = {
  frodo:        { name: 'Frodo', str: 1 },
  sam:          { name: 'Sam', str: 2 },
  pippin:       { name: 'Pippin', str: 1 },
  merry:        { name: 'Merry', str: 2 },
  gandalf:      { name: 'Gandalf', str: 5 },
  aragorn:      { name: 'Aragorn', str: 4 },
  legolas:      { name: 'Legolas', str: 3 },
  gimli:        { name: 'Gimli', str: 3 },
  boromir:      { name: 'Boromir', str: 0 },
  balrog:       { name: 'Balrog', str: 5 },
  shelob:       { name: 'Shelob', str: 5 },
  witch_king:   { name: 'Witch-king', str: 5 },
  flying_nazgul:{ name: 'Nazgûl', str: 3 },
  black_rider:  { name: 'Black Rider', str: 3 },
  saruman:      { name: 'Saruman', str: 4 },
  orcs:         { name: 'Orcs', str: 2 },
  warg:         { name: 'Warg', str: 2 },
  cave_troll:   { name: 'Cave Troll', str: 9 },
};

const LIGHT_HOME = 'the_shire';
const SHADOW_HOME = 'mordor';
const LIGHT_HOBBITS = ['frodo', 'sam', 'pippin', 'merry'];
const LIGHT_WARRIORS = ['gandalf', 'aragorn', 'legolas', 'gimli', 'boromir'];
const LIGHT_FRONT = ['arthedain', 'cardolan', 'enedwaith', 'eregion', 'rhudaur'];
const SHADOW_HOME_REGIONS = ['mordor'];
const SHADOW_FRONT = ['gondor', 'dagorlad', 'fangorn', 'mirkwood', 'rohan'];
const REGION_NAMES: Record<string, string> = {
  the_shire:       'The Shire',
  mordor:          'Mordor',
  arthedain:       'Arthedain',
  cardolan:        'Cardolan',
  enedwaith:       'Enedwaith',
  eregion:         'Eregion',
  rhudaur:         'Rhudaur',
  gondor:          'Gondor',
  dagorlad:        'Dagorlad',
  fangorn:         'Fangorn',
  mirkwood:        'Mirkwood',
  rohan:           'Rohan',
  the_high_pass:   'The High Pass',
  caradhras:       'Caradhras',
  misty_mountains: 'Misty Mountains',
  gap_of_rohan:    'Gap of Rohan',
};

interface GameSetupProps {
  gameView: GameView;
  gameId: string;
  onSetupDone: () => void;
}

export function GameSetup({ gameView, gameId, onSetupDone }: GameSetupProps) {
  const isLight = gameView.mySide === 'LIGHT';
  const chars = isLight ? LIGHT_CHARS : SHADOW_CHARS;
  const home = isLight ? LIGHT_HOME : SHADOW_HOME;

  const [positions, setPositions] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function assign(charId: string, regionId: string) {
    const newPositions = { ...positions };
    // Remove any char previously in that region
    // Sacar al personaje de su posición anterior (si tenía una)
    for (const [k, v] of Object.entries(newPositions)) {
      if (k === charId) delete newPositions[k];
    }

    // Límite: home acepta 4, frente acepta 1 (Shadow front can hold 2 but setup puts 1)
    const isHome = regionId === home;
    const limit = isHome ? 4 : 1;
    const charsInTarget = Object.values(newPositions).filter(r => r === regionId).length;

    if (charsInTarget >= limit) {
      // Frente lleno: desplazar el que estaba
      if (!isHome) {
        for (const [k, v] of Object.entries(newPositions)) {
          if (v === regionId) { delete newPositions[k]; break; }
        }
      } else {
        // Home lleno (4): no hacer nada
        setSelected(null);
        return;
      }
    }

    newPositions[charId] = regionId;
    setPositions(newPositions);
    setSelected(null);
  }

  function getCharInRegion(regionId: string): string | null {
    return chars.find(c => positions[c] === regionId) ?? null;
  }

  function getCharsInRegion(regionId: string): string[] {
    return chars.filter(c => positions[c] === regionId);
  }

  const unassigned = chars.filter(c => !positions[c]);

  // Validation
  let isValid = false;
  if (isLight) {
    const hobbitsHome = LIGHT_HOBBITS.every(h => positions[h] === 'the_shire');
    const warriorsFrontOk = LIGHT_WARRIORS.every(w => LIGHT_FRONT.includes(positions[w]));
    const uniqueFront = new Set(LIGHT_WARRIORS.map(w => positions[w])).size === 5;
    isValid = hobbitsHome && warriorsFrontOk && uniqueFront && unassigned.length === 0;
  } else {
    isValid = unassigned.length === 0;
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSetupDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  // Check if already confirmed setup — comes from server via GameView.mySetupConfirmed
  const alreadyConfirmed = gameView.mySetupConfirmed;

  if (alreadyConfirmed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className={`text-xl font-bold ${isLight ? 'text-amber-400' : 'text-red-500'}`}>
            Setup confirmado
          </p>
          <p className="text-slate-400 text-sm">Esperando al oponente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h2 className={`text-2xl font-bold ${isLight ? 'text-amber-400' : 'text-red-500'}`}>
            Setup — {isLight ? 'La Luz' : 'La Sombra'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {isLight
              ? 'Asigná los 4 hobbits a The Shire y 1 guerrero a cada región frontal'
              : 'Asigná todos tus personajes a regiones válidas'}
          </p>
        </div>

        {/* Unassigned characters */}
        {unassigned.length > 0 && (
          <div className="space-y-2">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Sin asignar ({unassigned.length})</p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map(c => (
                <button
                  key={c}
                  onClick={() => setSelected(selected === c ? null : c)}
                  className={[
                    'px-3 py-1.5 rounded text-sm font-medium border transition-colors',
                    selected === c
                      ? 'bg-amber-400 text-slate-900 border-amber-400'
                      : 'bg-slate-800 border-slate-600 hover:border-slate-400 text-white',
                  ].join(' ')}
                >
                  {CHAR_DISPLAY[c]?.name} ({CHAR_DISPLAY[c]?.str})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Home region */}
        {isLight ? (
          <div className="space-y-1">
            <p className="text-slate-500 text-xs uppercase tracking-wider">The Shire (hobbits)</p>
            <div
              onClick={() => {
                if (selected && LIGHT_HOBBITS.includes(selected)) {
                  assign(selected, home);
                }
              }}
              className={[
                'p-3 rounded-lg border-2 min-h-16 flex flex-wrap gap-2 cursor-pointer',
                selected && LIGHT_HOBBITS.includes(selected)
                  ? 'border-amber-500 border-dashed'
                  : 'border-slate-600',
              ].join(' ')}
            >
              {getCharsInRegion(home).map(c => (
                <span
                  key={c}
                  onClick={e => {
                    e.stopPropagation();
                    setSelected(selected === c ? null : c);
                  }}
                  className={[
                    'px-2 py-1 rounded text-xs font-medium cursor-pointer',
                    selected === c ? 'bg-slate-500' : 'bg-slate-700',
                    'text-amber-300',
                  ].join(' ')}
                >
                  {CHAR_DISPLAY[c]?.name}
                </span>
              ))}
              {getCharsInRegion(home).length === 0 && (
                <span className="text-slate-600 text-xs">
                  Seleccioná un hobbit y hacé click aquí
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Mordor (home)</p>
            <div
              onClick={() => selected && assign(selected, home)}
              className={[
                'p-3 rounded-lg border-2 min-h-16 flex flex-wrap gap-2 cursor-pointer',
                selected ? 'border-red-500 border-dashed' : 'border-slate-600',
              ].join(' ')}
            >
              {getCharsInRegion(home).map(c => (
                <span
                  key={c}
                  onClick={e => {
                    e.stopPropagation();
                    setSelected(selected === c ? null : c);
                  }}
                  className={[
                    'px-2 py-1 rounded text-xs font-medium cursor-pointer',
                    selected === c ? 'bg-slate-500' : 'bg-slate-700',
                    'text-red-300',
                  ].join(' ')}
                >
                  {CHAR_DISPLAY[c]?.name}
                </span>
              ))}
              {getCharsInRegion(home).length === 0 && (
                <span className="text-slate-600 text-xs">Seleccioná un personaje y hacé click aquí</span>
              )}
            </div>
          </div>
        )}

        {/* Front row regions */}
        {isLight ? (
          <div className="space-y-1">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Fila frontal (1 guerrero cada una)</p>
            <div className="grid grid-cols-5 gap-2">
              {LIGHT_FRONT.map(r => {
                const char = getCharInRegion(r);
                const canAssign = selected !== null && LIGHT_WARRIORS.includes(selected);
                return (
                  <div
                    key={r}
                    onClick={() => canAssign && assign(selected!, r)}
                    className={[
                      'p-2 rounded border-2 text-center cursor-pointer min-h-16 flex flex-col items-center justify-center',
                      canAssign && !char
                        ? 'border-amber-500 border-dashed'
                        : 'border-slate-600',
                    ].join(' ')}
                  >
                    <p className="text-slate-500 text-xs">{REGION_NAMES[r] ?? r}</p>
                    {char && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelected(selected === char ? null : char);
                        }}
                        className={[
                          'mt-1 text-xs font-medium px-1 py-0.5 rounded',
                          selected === char ? 'bg-slate-500' : 'bg-slate-700',
                          'text-amber-300',
                        ].join(' ')}
                      >
                        {CHAR_DISPLAY[char]?.name}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Posiciones adicionales</p>
            <div className="grid grid-cols-3 gap-2">
              {SHADOW_FRONT.map(r => {
                const char = getCharInRegion(r);
                return (
                  <div
                    key={r}
                    onClick={() => selected && assign(selected, r)}
                    className={[
                      'p-2 rounded border-2 text-center cursor-pointer min-h-16 flex flex-col items-center justify-center',
                      selected && !char ? 'border-red-500 border-dashed' : 'border-slate-600',
                    ].join(' ')}
                  >
                    <p className="text-slate-500 text-xs">{REGION_NAMES[r] ?? r}</p>
                    {char && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelected(selected === char ? null : char);
                        }}
                        className={[
                          'mt-1 text-xs font-medium px-1 py-0.5 rounded',
                          selected === char ? 'bg-slate-500' : 'bg-slate-700',
                          'text-red-300',
                        ].join(' ')}
                      >
                        {CHAR_DISPLAY[char]?.name}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={!isValid || loading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 font-bold rounded-lg"
        >
          {loading ? 'Confirmando...' : 'Confirmar posiciones'}
        </button>

        {!isValid && unassigned.length === 0 && (
          <p className="text-slate-500 text-xs text-center">
            {isLight
              ? 'Los 4 hobbits deben estar en The Shire y cada guerrero en una región frontal distinta'
              : 'Asigná todos los personajes'}
          </p>
        )}
      </div>
    </div>
  );
}
