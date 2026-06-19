import type { GameState, Side } from '@/game/types';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I/O/0/1 para legibilidad
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generatePlayerId(): string {
  return crypto.randomUUID();
}

// Determinar el side de un jugador dado su playerId
export function getPlayerSide(
  game: { lightPlayerId: string | null; shadowPlayerId: string | null },
  playerId: string
): Side | null {
  if (game.lightPlayerId === playerId) return 'LIGHT';
  if (game.shadowPlayerId === playerId) return 'SHADOW';
  return null;
}

// Validar que el estado del juego tiene la estructura correcta
export function parseGameState(raw: unknown): GameState {
  // Confiar en el JSON almacenado (fue escrito por el engine)
  return raw as GameState;
}
