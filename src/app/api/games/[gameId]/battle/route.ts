import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getPlayerSide, parseGameState } from '@/lib/game-utils';
import { applyCardPhase, getGameView } from '@/game/engine';
import type { LightCardId, ShadowCardId } from '@/game/types';

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

  if (state.status !== 'BATTLE') {
    return Response.json({ error: 'No hay batalla activa' }, { status: 400 });
  }
  if (!state.activeBattle) {
    return Response.json({ error: 'Estado de batalla inconsistente' }, { status: 400 });
  }

  const body = await request.json();
  const { lightCardId, shadowCardId, lightMagicCardId, shadowMagicCardId } = body as {
    lightCardId: string;
    shadowCardId: string;
    lightMagicCardId?: string;
    shadowMagicCardId?: string;
  };

  if (!lightCardId || !shadowCardId) {
    return Response.json({ error: 'Se requieren lightCardId y shadowCardId' }, { status: 400 });
  }

  let newState;
  try {
    const result = applyCardPhase(
      state,
      lightCardId as LightCardId,
      shadowCardId as ShadowCardId,
      {
        lightMagicCard: lightMagicCardId as LightCardId | undefined,
        shadowMagicCard: shadowMagicCardId as ShadowCardId | undefined,
      },
    );
    newState = result.newState;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Carta inválida';
    return Response.json({ error: msg }, { status: 400 });
  }

  // Victory is checked inside applyCardPhase → finalizeBattle
  const dbStatus = newState.status === 'BATTLE' ? 'BATTLE'
    : newState.status === 'ENDED' ? 'ENDED'
    : 'ACTIVE';

  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: {
      state: newState as object,
      status: dbStatus,
      currentTurn: newState.currentTurn as 'LIGHT' | 'SHADOW',
      lastAction: game.lastAction
        ? `${game.lastAction} — carta jugada`
        : 'Carta de batalla jugada',
      winner: newState.winner ?? undefined,
      winReason: newState.winReason ?? undefined,
    },
  });

  const view = getGameView(newState, side);
  return Response.json({ ...view, gameId, lastAction: updatedGame.lastAction });
}
