import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getPlayerSide, parseGameState } from '@/lib/game-utils';
import { applyMove, getGameView, getMovesForChar } from '@/game/engine';
import type { RegionId, LightCharId, ShadowCharId } from '@/game/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const cookieStore = await cookies();
  const playerId = cookieStore.get(`player_${gameId}`)?.value;

  if (!playerId) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return Response.json({ error: 'Partida no encontrada' }, { status: 404 });

  const side = getPlayerSide(game, playerId);
  if (!side) return Response.json({ error: 'No sos parte de esta partida' }, { status: 403 });

  const state = parseGameState(game.state);

  if (state.currentTurn !== side) {
    return Response.json({ error: 'No es tu turno' }, { status: 400 });
  }
  if (state.status !== 'ACTIVE') {
    return Response.json({ error: `Estado de juego inválido: ${state.status}` }, { status: 400 });
  }

  const body = await request.json();
  const { characterId, targetRegion } = body as {
    characterId: string;
    targetRegion: string;
  };

  // Validate legality against the engine's move generator
  const legalMoves = getMovesForChar(
    state,
    side,
    characterId as LightCharId | ShadowCharId,
  );
  const isLegal = legalMoves.some(m => m.to === targetRegion);
  if (!isLegal) {
    return Response.json({ error: 'Movimiento ilegal' }, { status: 400 });
  }

  let newState;
  try {
    const result = applyMove(
      state,
      side,
      characterId as LightCharId | ShadowCharId,
      targetRegion as RegionId,
    );
    newState = result.newState;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Movimiento inválido';
    return Response.json({ error: msg }, { status: 400 });
  }

  // Victory is checked inside applyMove → finalizeBattle → endTurn; status is ENDED if won
  const dbStatus = newState.status === 'BATTLE' ? 'BATTLE'
    : newState.status === 'ENDED' ? 'ENDED'
    : 'ACTIVE';

  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: {
      state: newState as object,
      status: dbStatus,
      currentTurn: newState.currentTurn as 'LIGHT' | 'SHADOW',
      lastAction: `${side === 'LIGHT' ? 'Light' : 'Shadow'} movió ${characterId} a ${targetRegion}`,
      winner: newState.winner ?? undefined,
      winReason: newState.winReason ?? undefined,
    },
  });

  const view = getGameView(newState, side);
  return Response.json({ ...view, gameId, lastAction: updatedGame.lastAction });
}
