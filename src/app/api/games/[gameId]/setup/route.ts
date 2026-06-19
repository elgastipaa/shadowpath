import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getPlayerSide, parseGameState } from '@/lib/game-utils';
import { confirmSetup, validateSetupPositions, getGameView } from '@/game/engine';
import type { RegionId } from '@/game/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
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
  if (state.status !== 'SETUP') {
    return Response.json({ error: 'No estamos en fase de setup' }, { status: 400 });
  }

  // Verificar que el jugador no confirmó ya
  if (side === 'LIGHT' && state.lightSetupConfirmed) {
    return Response.json({ error: 'Ya confirmaste tu setup' }, { status: 400 });
  }
  if (side === 'SHADOW' && state.shadowSetupConfirmed) {
    return Response.json({ error: 'Ya confirmaste tu setup' }, { status: 400 });
  }

  const body = await request.json();
  const { positions } = body as { positions: Record<string, string> };

  if (!positions || typeof positions !== 'object') {
    return Response.json({ error: 'Se requiere un objeto positions' }, { status: 400 });
  }

  // Usar el validador del engine
  const validation = validateSetupPositions(side, positions as Record<string, RegionId>);
  if (!validation.valid) {
    return Response.json({ error: validation.error ?? 'Posiciones inválidas' }, { status: 400 });
  }

  const newState = confirmSetup(state, side, positions as Record<string, RegionId>);

  const dbStatus = newState.status === 'ACTIVE' ? 'ACTIVE' : 'SETUP';

  await prisma.game.update({
    where: { id: gameId },
    data: {
      state: newState as object,
      status: dbStatus,
    },
  });

  const view = getGameView(newState, side);
  return Response.json({ ...view, gameId });
}
