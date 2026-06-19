'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LandingClient() {
  const router  = useRouter();
  const [roomCode, setRoomCode]   = useState('');
  const [loading, setLoading]     = useState<'create' | 'join' | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);

  async function handleCreate() {
    setLoading('create');
    setError(null);
    setCreatedCode(null);
    try {
      const res  = await fetch('/api/games', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatedCode(data.roomCode);
      setCreatedGameId(data.gameId);
      // Don't auto-redirect — let the player copy the code first
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear partida');
    } finally {
      setLoading(null);
    }
  }

  async function handleCopy() {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text manually
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
      const res  = await fetch('/api/games/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: roomCode.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
        <h1 className="text-4xl font-bold text-amber-400 tracking-tight">Shadowpath</h1>
        <p className="text-slate-400 mt-2 text-sm">Estrategia 1v1 asíncrona</p>
      </div>

      {/* ── Crear partida ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        {!createdCode ? (
          <button
            onClick={handleCreate}
            disabled={loading !== null}
            className="w-full py-3 px-6 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-colors"
          >
            {loading === 'create' ? 'Creando...' : 'Nueva partida'}
          </button>
        ) : (
          <div className="p-4 bg-slate-800 rounded-lg space-y-3 border border-amber-800">
            <p className="text-slate-400 text-xs uppercase tracking-wider">
              Compartí este código con tu oponente:
            </p>
            <p className="text-amber-400 text-4xl font-mono font-bold tracking-[0.25em] select-all">
              {createdCode}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
              >
                {copied ? '✓ Copiado' : '📋 Copiar código'}
              </button>
              <button
                onClick={() => createdGameId && router.push(`/game/${createdGameId}`)}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm rounded"
              >
                Ir a la partida →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-slate-500 text-xs">o</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      {/* ── Unirse ─────────────────────────────────────────────────────── */}
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
          {loading === 'join' ? 'Uniéndose...' : 'Unirse a partida'}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 rounded-lg py-2 px-3">{error}</p>
      )}
    </div>
  );
}
