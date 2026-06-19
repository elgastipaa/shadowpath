import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { generateRoomCode, generatePlayerId } from '@/lib/game-utils';
import { createInitialState } from '@/game/engine';

export async function POST() {
  // Generar código único
  let roomCode = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.game.findUnique({ where: { roomCode } });
    if (!existing) break;
    roomCode = generateRoomCode();
    attempts++;
  }

  const playerId = generatePlayerId();
  const initialState = createInitialState();

  const game = await prisma.game.create({
    data: {
      roomCode,
      lightPlayerId: playerId,
      status: 'WAITING',
      state: initialState as object,
    },
  });

  // Guardar playerId en cookie
  const cookieStore = await cookies();
  cookieStore.set(`player_${game.id}`, playerId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return Response.json({
    gameId: game.id,
    roomCode: game.roomCode,
    side: 'LIGHT',
  });
}
