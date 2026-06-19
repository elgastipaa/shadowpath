# Deploy de Shadowpath

## Prerequisitos
1. Cuenta en [Supabase](https://supabase.com) (gratis)
2. Cuenta en [Vercel](https://vercel.com) (gratis)

## Paso 1: Configurar Supabase

1. Crear un nuevo proyecto en Supabase
2. En el dashboard, ir a **Settings → Database**
3. Copiar la **Connection String** (Transaction pooler para `DATABASE_URL`)
4. Copiar el **Direct connection** (para `DIRECT_URL`)
5. En **Settings → API**, copiar:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## Paso 2: Crear la tabla en Supabase

Ir a **SQL Editor** en Supabase y ejecutar:

```sql
-- Enums
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'SETUP', 'ACTIVE', 'BATTLE', 'ENDED');
CREATE TYPE "Side" AS ENUM ('LIGHT', 'SHADOW');

-- Table
CREATE TABLE "Game" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "roomCode" CHAR(4) UNIQUE NOT NULL,
  status "GameStatus" NOT NULL DEFAULT 'WAITING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lightPlayerId" TEXT,
  "shadowPlayerId" TEXT,
  "currentTurn" "Side" NOT NULL DEFAULT 'SHADOW',
  state JSONB NOT NULL,
  "lastAction" TEXT,
  winner "Side",
  "winReason" TEXT
);

-- Auto-update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_updated_at
  BEFORE UPDATE ON "Game"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index for fast room code lookup
CREATE INDEX ON "Game"("roomCode");
-- Auto-expire old games (optional, cleanup after 7 days)
CREATE INDEX ON "Game"("createdAt");
```

## Paso 3: Llenar `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

## Paso 4: Probar localmente

```bash
cd /home/gmendoza/coding/shadowpath
npm run dev
```

Abrir dos tabs en el browser:
1. Tab 1: `http://localhost:3000` → "Nueva partida" → anotar el código
2. Tab 2: `http://localhost:3000` → "Unirse" → poner el código
3. Jugar!

## Paso 5: Deploy en Vercel

```bash
npx vercel
```

O desde la UI de Vercel:
1. Importar el repositorio de GitHub
2. En **Environment Variables**, agregar las 5 variables del `.env.local`
3. Deploy automático

## Compartir con tu novia

Una vez deployado, compartir la URL de Vercel. Para jugar:
1. Vos creás la partida → te da un código de 4 letras
2. Ella se une con ese código desde su celular
3. Cada uno juega en su turno de forma asincrónica
