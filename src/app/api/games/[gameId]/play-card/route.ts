/**
 * Staged battle card submission.
 *
 * Each player submits their card independently. The server stores the pending
 * card in the battle state. When both players have submitted, it resolves the
 * battle automatically via applyCardPhase.
 *
 * Body: { cardId: string }
 */
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getPlayerSide, parseGameState } from '@/lib/game-utils';
import { applyCardPhase, getGameView } from '@/game/engine';
import type { LightCardId, ShadowCardId, GameState, BattleState } from '@/game/types';

export async function POST(
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

  if (state.status !== 'BATTLE') {
    return Response.json({ error: 'No hay batalla activa' }, { status: 400 });
  }
  if (!state.activeBattle) {
    return Response.json({ error: 'Estado de batalla inconsistente' }, { status: 400 });
  }
  if (state.activeBattle.step !== 'select_card') {
    return Response.json({ error: `Paso de batalla incorrecto: ${state.activeBattle.step}` }, { status: 400 });
  }

  const body = await request.json() as { cardId: string; secondaryCardId?: string };
  const { cardId, secondaryCardId } = body;
  if (!cardId) return Response.json({ error: 'Se requiere cardId' }, { status: 400 });

  // Validate card is in player's hand
  if (side === 'LIGHT' && !state.lightHand.includes(cardId as LightCardId)) {
    return Response.json({ error: 'Carta no disponible en tu mano' }, { status: 400 });
  }
  if (side === 'SHADOW' && !state.shadowHand.includes(cardId as ShadowCardId)) {
    return Response.json({ error: 'Carta no disponible en tu mano' }, { status: 400 });
  }

  // Reject double submission
  if (side === 'LIGHT' && state.activeBattle.lightCardPlayed) {
    return Response.json({ error: 'Ya jugaste una carta en esta batalla' }, { status: 400 });
  }
  if (side === 'SHADOW' && state.activeBattle.shadowCardPlayed) {
    return Response.json({ error: 'Ya jugaste una carta en esta batalla' }, { status: 400 });
  }

  // Validate Magic secondary card (must be in discard pile)
  const isMagic =
    (side === 'LIGHT' && cardId === 'l_magic') ||
    (side === 'SHADOW' && cardId === 's_magic');

  if (isMagic && secondaryCardId) {
    if (side === 'LIGHT' && !state.lightDiscard.includes(secondaryCardId as LightCardId)) {
      return Response.json({ error: 'La carta secundaria no está en tu descarte' }, { status: 400 });
    }
    if (side === 'SHADOW' && !state.shadowDiscard.includes(secondaryCardId as ShadowCardId)) {
      return Response.json({ error: 'La carta secundaria no está en tu descarte' }, { status: 400 });
    }
  }

  // Store pending card (and Magic secondary if provided)
  const updatedBattle: BattleState = {
    ...state.activeBattle,
    ...(side === 'LIGHT'
      ? {
          lightCardPlayed: cardId as LightCardId,
          ...(isMagic && secondaryCardId
            ? { lightMagicSecondary: secondaryCardId as LightCardId }
            : {}),
        }
      : {
          shadowCardPlayed: cardId as ShadowCardId,
          ...(isMagic && secondaryCardId
            ? { shadowMagicSecondary: secondaryCardId as ShadowCardId }
            : {}),
        }),
  };

  const lightCard = updatedBattle.lightCardPlayed;
  const shadowCard = updatedBattle.shadowCardPlayed;

  // If both cards are in, resolve the battle
  if (lightCard && shadowCard) {
    let resolvedState: GameState;
    try {
      const result = applyCardPhase(
        { ...state, activeBattle: updatedBattle },
        lightCard,
        shadowCard,
        {
          lightMagicCard:  updatedBattle.lightMagicSecondary,
          shadowMagicCard: updatedBattle.shadowMagicSecondary,
        },
      );
      resolvedState = result.newState;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al resolver batalla';
      return Response.json({ error: msg }, { status: 400 });
    }

    const dbStatus =
      resolvedState.status === 'BATTLE' ? 'BATTLE'
      : resolvedState.status === 'ENDED' ? 'ENDED'
      : 'ACTIVE';

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        state: resolvedState as object,
        status: dbStatus,
        currentTurn: resolvedState.currentTurn as 'LIGHT' | 'SHADOW',
        lastAction: `Batalla resuelta en ${updatedBattle.region}`,
        winner: resolvedState.winner ?? undefined,
        winReason: resolvedState.winReason ?? undefined,
      },
    });

    const view = getGameView(resolvedState, side);
    return Response.json({ ...view, gameId, lastAction: updatedGame.lastAction });
  }

  // Only one card in — store and wait
  const pendingState: GameState = {
    ...state,
    activeBattle: updatedBattle,
  };

  await prisma.game.update({
    where: { id: gameId },
    data: { state: pendingState as object },
  });

  const view = getGameView(pendingState, side);
  return Response.json({
    ...view,
    gameId,
    lastAction: `${side === 'LIGHT' ? 'Luz' : 'Sombra'} jugó carta — esperando al oponente`,
  });
}
