'use client';
import { useEffect, useState, useCallback } from 'react';
import { GameSetup } from './GameSetup';
import { GameBoard } from './GameBoard';
import { EndGame } from './EndGame';
import type { GameView } from '@/game/types';

interface GameClientProps {
  gameId: string;
}

interface ExtendedGameView extends GameView {
  gameId: string;
  roomCode?: string;
  dbStatus?: string;
  lastAction?: string;
}

export function GameClient({ gameId }: GameClientProps) {
  const [gameView, setGameView] = useState<ExtendedGameView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Error desconocido');
        return;
      }
      const data = await res.json();
      setGameView(data);
    } catch {
      setError('Error de conexión');
    }
  }, [gameId]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 3000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-red-400 text-center">
          <p className="text-xl font-bold">Error</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!gameView) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Cargando partida...</div>
      </div>
    );
  }

  if (gameView.dbStatus === 'WAITING') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-amber-400 text-xl font-bold">Esperando al oponente...</p>
          {gameView.roomCode && (
            <div className="p-4 bg-slate-800 rounded-lg">
              <p className="text-slate-400 text-xs mb-1">Código de sala:</p>
              <p className="text-amber-400 text-3xl font-mono font-bold tracking-widest">
                {gameView.roomCode}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameView.winner) {
    return (
      <EndGame
        gameView={gameView}
        onPlayAgain={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  if (gameView.status === 'SETUP') {
    return <GameSetup gameView={gameView} gameId={gameId} onSetupDone={fetchGame} />;
  }

  return <GameBoard gameView={gameView} gameId={gameId} onAction={fetchGame} />;
}
