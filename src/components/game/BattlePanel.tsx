'use client';
import { useState } from 'react';
import type { BattleState, Side, CardId } from '@/game/types';

const CARD_DISPLAY: Record<string, { label: string; isText: boolean }> = {
  l_1:              { label: '1', isText: false },
  l_2:              { label: '2', isText: false },
  l_3:              { label: '3', isText: false },
  l_4:              { label: '4', isText: false },
  l_5:              { label: '5', isText: false },
  l_magic:          { label: 'Magic', isText: true },
  l_noble_sacrifice:{ label: 'Noble Sacrifice', isText: true },
  l_elven_cloak:    { label: 'Elven Cloak', isText: true },
  l_retreat:        { label: 'Retreat', isText: true },
  s_1:              { label: '1', isText: false },
  s_2:              { label: '2', isText: false },
  s_3:              { label: '3', isText: false },
  s_4:              { label: '4', isText: false },
  s_5:              { label: '5', isText: false },
  s_6:              { label: '6', isText: false },
  s_magic:          { label: 'Magic', isText: true },
  s_eye_of_sauron:  { label: 'Eye of Sauron', isText: true },
  s_retreat:        { label: 'Retreat', isText: true },
};

interface BattlePanelProps {
  battle: BattleState;
  myHand: CardId[];
  mySide: Side;
  gameId: string;
  onBattleAction: () => void;
}

export function BattlePanel({
  battle,
  myHand,
  mySide,
  gameId,
  onBattleAction,
}: BattlePanelProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const iHavePlayed =
    mySide === 'LIGHT'
      ? battle.lightCardPlayed !== undefined
      : battle.shadowCardPlayed !== undefined;

  const opponentHasPlayed =
    mySide === 'LIGHT'
      ? battle.shadowCardPlayed !== undefined
      : battle.lightCardPlayed !== undefined;

  async function submitCard() {
    if (!selectedCard || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}/play-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: selectedCard }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Error al jugar carta');
        return;
      }
      setSelectedCard(null);
      onBattleAction();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-red-950/50 border border-red-800 m-3 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-red-400 font-bold text-sm">Batalla en {battle.region}</h3>
        <span className="text-slate-500 text-xs">Paso: {battle.step}</span>
      </div>

      <div className="flex gap-4 justify-center text-sm">
        <div className="text-amber-300 text-center">
          <p className="text-xs text-slate-400">Luz</p>
          <p className="font-bold">{battle.lightChar}</p>
          {battle.lightCardPlayed && (
            <p className="text-xs text-green-400 mt-0.5">carta jugada</p>
          )}
        </div>
        <div className="text-slate-500 self-center">vs</div>
        <div className="text-red-300 text-center">
          <p className="text-xs text-slate-400">Sombra</p>
          <p className="font-bold">{battle.shadowChar}</p>
          {battle.shadowCardPlayed && (
            <p className="text-xs text-green-400 mt-0.5">carta jugada</p>
          )}
        </div>
      </div>

      {/* Battle log */}
      {battle.log.length > 0 && (
        <div className="bg-slate-900 rounded p-2 space-y-1 max-h-24 overflow-y-auto">
          {battle.log.map((line, i) => (
            <p key={i} className="text-slate-400 text-xs">
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Card selection — only shown when step is select_card and I haven't played yet */}
      {battle.step === 'select_card' && !iHavePlayed && (
        <div className="space-y-2">
          <p className="text-slate-400 text-xs">
            Elegí una carta
            {opponentHasPlayed ? ' (oponente ya jugó)' : ''}:
          </p>
          <div className="flex flex-wrap gap-2">
            {myHand.map(cardId => {
              const card = CARD_DISPLAY[cardId];
              if (!card) return null;
              return (
                <button
                  key={cardId}
                  onClick={() => setSelectedCard(selectedCard === cardId ? null : cardId)}
                  className={[
                    'px-3 py-2 rounded border text-sm font-bold transition-colors',
                    card.isText ? 'border-purple-600' : 'border-slate-600',
                    selectedCard === cardId
                      ? 'bg-amber-500 text-slate-900 border-amber-500'
                      : 'bg-slate-700 text-white hover:border-slate-400',
                  ].join(' ')}
                >
                  {card.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={submitCard}
            disabled={!selectedCard || loading}
            className="w-full py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold rounded"
          >
            {loading ? 'Jugando...' : 'Jugar carta'}
          </button>
        </div>
      )}

      {iHavePlayed && (
        <p className="text-slate-400 text-sm text-center">
          {opponentHasPlayed
            ? 'Resolviendo batalla...'
            : 'Carta jugada — esperando al oponente...'}
        </p>
      )}

      {/* Waiting for battle to progress (char_abilities or resolve_cards step) */}
      {battle.step !== 'select_card' && battle.step !== 'done' && (
        <p className="text-amber-400 text-sm text-center">
          Procesando habilidades...
        </p>
      )}
    </div>
  );
}
