import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { generatePlayerId } from '@/lib/game-utils';

export async function POST(request: Request) {
  const body = await request.json();
  const { roomCode } = body as { roomCode: string };

  if (!roomCode || typeof roomCode !== 'string' || roomCode.length !== 4) {
    return Response.json({ error: 'Código inválido' }, { status: 400 });
  }

  const game = await prisma.game.findUnique({
    where: { roomCode: roomCode.toUpperCase() },
  });

  if (!game) {
    return Response.json({ error: 'Partida no encontrada' }, { status: 404 });
  }
  if (game.status !== 'WAITING') {
    return Response.json({ error: 'La partida ya está en curso o terminó' }, { status: 409 });
  }
  if (game.shadowPlayerId) {
    return Response.json({ error: 'La partida ya está llena' }, { status: 409 });
  }

  const playerId = generatePlayerId();

  const updatedGame = await prisma.game.update({
    where: { id: game.id },
    data: {
      shadowPlayerId: playerId,
      status: 'SETUP',
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(`player_${updatedGame.id}`, playerId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({
    gameId: updatedGame.id,
    side: 'SHADOW',
  });
}
