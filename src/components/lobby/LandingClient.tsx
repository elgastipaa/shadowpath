'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LandingClient() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  async function handleCreate() {
    setLoading('create');
    setError(null);
    try {
      const res = await fetch('/api/games', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('lastGameId', data.gameId);
      localStorage.setItem('lastSide', data.side);
      setCreatedCode(data.roomCode);
      setTimeout(() => router.push(`/game/${data.gameId}`), 200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear partida');
    } finally {
      setLoading(null);
    }
  }

  async function handleJoin() {
    if (roomCode.length !== 4) {
      setError('El código debe tener 4 caracteres');
      return;
    }
    setLoading('join');
    setError(null);
    try {
      const res = await fetch('/api/games/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: roomCode.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('lastGameId', data.gameId);
      localStorage.setItem('lastSide', data.side);
      router.push(`/game/${data.gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al unirse');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8 text-center">
      <div>
        <h1 className="text-4xl font-bold text-amber-400">Shadowpath</h1>
        <p className="text-slate-400 mt-2 text-sm">Un juego de estrategia 1v1</p>
      </div>

      {/* Create game */}
      <div className="space-y-3">
        <button
          onClick={handleCreate}
          disabled={loading !== null}
          className="w-full py-3 px-6 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-colors"
        >
          {loading === 'create' ? 'Creando...' : 'Nueva partida'}
        </button>
        {createdCode && (
          <div className="p-3 bg-slate-800 rounded-lg">
            <p className="text-slate-400 text-xs">Compartí este código:</p>
            <p className="text-amber-400 text-3xl font-mono font-bold tracking-widest">{createdCode}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-slate-500 text-xs">o</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      {/* Join game */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Código (ej: AB3K)"
          value={roomCode}
          onChange={e =>
            setRoomCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 4),
            )
          }
          className="w-full py-3 px-4 bg-slate-800 border border-slate-600 rounded-lg text-white font-mono text-center text-xl tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={handleJoin}
          disabled={loading !== null || roomCode.length !== 4}
          className="w-full py-3 px-6 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
        >
          {loading === 'join' ? 'Uniéndose...' : 'Unirse'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
