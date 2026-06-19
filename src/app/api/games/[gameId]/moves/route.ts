/**
 * GET /api/games/[gameId]/moves?characterId=<charId>
 *
 * Returns the valid moves for the requesting player's character.
 * Only callable by the player whose turn it is, for their own characters.
 */
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getPlayerSide, parseGameState } from '@/lib/game-utils';
import { getMovesForChar } from '@/game/engine';
import type { LightCharId, ShadowCharId } from '@/game/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;
  const cookieStore = await cookies();
  const playerId = cookieStore.get(`player_${gameId}`)?.value;

  if (!playerId) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return Response.json({ error: 'Partida no encontrada' }, { status: 404 });

  const side = getPlayerSide(game, playerId);
  if (!side) return Response.json({ error: 'No sos parte de esta partida' }, { status: 403 });

  const state = parseGameState(game.state);

  if (state.status !== 'ACTIVE') {
    return Response.json({ error: 'No hay partida activa' }, { status: 400 });
  }
  if (state.currentTurn !== side) {
    return Response.json({ moves: [] }); // not your turn — no moves
  }

  const url = new URL(request.url);
  const characterId = url.searchParams.get('characterId');
  if (!characterId) {
    return Response.json({ error: 'Se requiere characterId' }, { status: 400 });
  }

  // Validate the character belongs to the requesting player
  const myPositions =
    side === 'LIGHT' ? state.lightPositions : state.shadowPositions;
  if (!(characterId in myPositions)) {
    return Response.json({ error: 'El personaje no te pertenece' }, { status: 403 });
  }

  const moves = getMovesForChar(
    state,
    side,
    characterId as LightCharId | ShadowCharId,
  );

  return Response.json({ moves });
}
