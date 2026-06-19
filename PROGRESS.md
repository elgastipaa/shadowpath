# Shadowpath — Progress

## Current State
Phase: V2 COMPLETE ✅
Status: Todos los bloques completos, desplegado en producción
Last Updated: 2026-06-19

---

## Deploy URL: https://shadowpath-cyan.vercel.app
## Commit: a91d351

## V2 Cambios (2026-06-19)

### Bloque 1 — Bugs críticos ✅
- `types.ts`: GameView ahora tiene `mySetupConfirmed: boolean`
- `engine.ts`: getGameView expone `mySetupConfirmed` (deriva de lightSetupConfirmed/shadowSetupConfirmed según el side)
- `GameSetup.tsx`: usa `gameView.mySetupConfirmed` directamente (eliminado el cast `as unknown as`)
- FIX: Confirmar setup ahora muestra "Esperando al oponente" en vez de dar error

### Bloque 2 — Tablero diamante con POV ✅
- `board.ts`: agregado `REGION_LAYOUT` (28 regiones con band+col) y `getRegionScreenPos(rid, mySide)`
  → fórmula diamante 45°: LIGHT: rawX=6-band+col, rawY=8-band-col; SHADOW: espejo exacto
  → normalizado a [5%, 95%] para posicionamiento CSS seguro
- `GameBoard.tsx`: reescrito completo
  → nodos con `position: absolute; left%; top%; transform: translate(-50%,-50%)`
  → SVG de conexiones (normal, Anduin azul con flecha, Túnel Moria púrpura punteado)
  → POV por jugador: home propio siempre en zona inferior-derecha, enemigo superior-izquierda
  → eliminado BOARD_ROWS (fuente única: REGION_LAYOUT)

### Bloque 4 — Auditoría de reglas ✅
- `battle.ts`: checkAndRefillHands ahora recarga cada mano independientemente (no requiere ambas vacías)
- `types.ts` + `play-card/route.ts`: carta Magic acepta secondaryCardId del descarte; almacena en BattleState y pasa a applyCardPhase
- `BattlePanel.tsx`: UI para elegir carta secundaria al jugar Magic; myDiscard prop; errors con setError() (sin alert)
- Victory conditions auditadas: 3 condiciones correctas (Frodo en Mordor, Frodo eliminado, 3+ Shadow en Shire)
- Stalemate: hasValidMoves detecta jugador sin movimientos → pierde

### Bloque 5 — Auditoría de topología ✅ (sin cambios)
- board.ts topología aproximada para Deluxe; TODO existente reconocido
- Conexiones especiales (Anduin, Túnel Moria) ya correctas

### Bloque 6 — Pulido UX ✅
- LandingClient: copy-to-clipboard del código, botón "Ir a la partida" explícito (sin auto-redirect)
- Lobby: error con bg rojo visible
- BattlePanel: "carta jugada ✓" por jugador, "esperando al oponente" correcto

### Bloque 3 — Movimientos válidos ✅
- `GET /api/games/[gameId]/moves?characterId=`: nuevo endpoint que usa `getMovesForChar`
- `POST /api/games/[gameId]/move`: ahora valida destino con `getMovesForChar` antes de aplicar
- `GameBoard.tsx`: al seleccionar personaje, fetchea destinos legales y resalta solo esos

---

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
