import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getPlayerSide, parseGameState } from '@/lib/game-utils';
import { getGameView } from '@/game/engine';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const cookieStore = await cookies();
  const playerId = cookieStore.get(`player_${gameId}`)?.value;

  if (!playerId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    return Response.json({ error: 'Partida no encontrada' }, { status: 404 });
  }

  const side = getPlayerSide(game, playerId);
  if (!side) {
    return Response.json({ error: 'No sos parte de esta partida' }, { status: 403 });
  }

  const state = parseGameState(game.state);
  const view = getGameView(state, side);

  return Response.json({
    ...view,
    gameId: game.id,
    roomCode: game.roomCode,
    dbStatus: game.status,
    lastAction: game.lastAction,
  });
}
