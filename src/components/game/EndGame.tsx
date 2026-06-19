'use client';
import type { GameView } from '@/game/types';

interface EndGameProps {
  gameView: GameView;
  onPlayAgain: () => void;
}

export function EndGame({ gameView, onPlayAgain }: EndGameProps) {
  const iWon = gameView.winner === gameView.mySide;
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className={`text-6xl font-bold ${iWon ? 'text-amber-400' : 'text-red-500'}`}>
          {iWon ? '¡Victoria!' : 'Derrota'}
        </div>
        <p className="text-slate-300 text-lg">{gameView.winReason}</p>
        <div className="text-slate-500 text-sm">
          Ganó:{' '}
          <span className={gameView.winner === 'LIGHT' ? 'text-amber-400' : 'text-red-500'}>
            {gameView.winner === 'LIGHT' ? 'La Luz' : 'La Sombra'}
          </span>
        </div>
        <button
          onClick={onPlayAgain}
          className="w-full py-3 px-6 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg"
        >
          Jugar de nuevo
        </button>
      </div>
    </div>
  );
}
