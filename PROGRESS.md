# Shadowpath — Progress

## Current State
Phase: COMPLETE ✅
Status: MVP DONE
Last Updated: 2026-06-19

## Todas las Fases Completadas

### Phase 1: Scaffolding ✅
- Next.js 16.2.9, TypeScript, Tailwind v4, App Router, src/
- Prisma 7 con PrismaPg adapter, prisma.config.ts en raíz
- @supabase/supabase-js, zustand, vitest, shadcn/ui

### Phase 2: Game Engine ✅ (25/25 tests)
- board.ts — topología del tablero (28 regiones, grafo de adyacencia)
- characters.ts — 18 personajes con abilities
- cards.ts — 18 cartas de combate (9 por lado)
- abilities.ts — resolución de habilidades pre-carta
- battle.ts — resolución de cartas y resultados
- victory.ts — 3 condiciones de victoria
- movement.ts — validación de movimientos (incluyendo Aragorn, Witch-king, Flying Nazgûl, Black Rider especiales)
- engine.ts — orquestador principal

### Phase 3: API Routes ✅
- POST /api/games — crear partida
- POST /api/games/join — unirse por código 4 chars
- GET /api/games/[gameId] — estado filtrado por jugador
- POST /api/games/[gameId]/move — mover personaje
- POST /api/games/[gameId]/battle — resolver batalla (ambas cartas)
- POST /api/games/[gameId]/play-card — cada jugador submite su carta
- POST /api/games/[gameId]/setup — confirmar posiciones iniciales

### Phase 4-9: UI Completa ✅
- Landing page: crear / unirse con código
- GameClient: polling cada 3s, routing a Setup/Board/Battle/EndGame
- GameSetup: asignar 9 personajes a regiones de inicio
- GameBoard: tablero con 28 regiones en 7 filas, tokens de personajes, movimiento click-to-move
- BattlePanel: selección de cartas, submit, log de resolución
- EndGame: pantalla de victoria/derrota

### Phase 10: Polish ✅
- layout.tsx: metadata, viewport mobile, lang=es
- globals.css: touch targets, game-board no-select
- not-found.tsx y loading.tsx para /game/[gameId]
- DEPLOY.md con instrucciones paso a paso (Supabase SQL + Vercel)

## Para deployar
Ver `/home/gmendoza/coding/shadowpath/DEPLOY.md`
Necesita: Supabase project + completar .env.local

## Estado de verificación final
- npm run build: ✅ Compiled successfully
- npx vitest run: ✅ 25/25 passed

## Stack quirks para referencia futura
- Next.js 16: params es Promise → await params
- Prisma 7: driver adapter PrismaPg, sin url/directUrl en datasource, usa prisma.config.ts
- Tailwind v4: postcss.config.mjs (no tailwind.config.ts)
- engine.ts: applyCardPhase(state, lightCard, shadowCard) — no existe playBattleCard
- engine.ts: applyMove() devuelve MoveResult, no GameState
- Cartas se submiten vía /play-card (individual) y se resuelven cuando ambos jugaron
