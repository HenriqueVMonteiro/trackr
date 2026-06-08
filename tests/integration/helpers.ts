// requires: DATABASE_URL (a disposable Postgres/Supabase) — ou DATABASE_URL_TEST
//
// Helpers compartilhados pela suíte de integração (stint B12). A ideia central:
// as suítes devem PULAR de forma limpa quando nenhum banco está configurado,
// para que `npm run test:integration` nunca quebre num ambiente sem credenciais
// (CI sem secret, máquina de quem só roda os unitários, etc.). Os imports reais
// continuam acontecendo, então tudo é TYPECHECKADO mesmo quando pulado.

import { it } from "vitest";
import { createDbClient, type Database } from "@/infrastructure/db/client";

// Preferimos um banco descartável dedicado (DATABASE_URL_TEST); caímos para o
// DATABASE_URL normal quando ele não existe. Nunca aponte para produção.
export const DB = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

// Guard de execução: com banco -> `it`; sem banco -> `it.skip`. Use SEMPRE
// `itDb(...)` no lugar de `it(...)` nas suítes de integração.
export const itDb = DB ? it : it.skip;

// Constrói um cliente Drizzle apontado para o banco de teste. Só deve ser
// chamado de dentro de um caso `itDb`, onde DB é garantidamente definido; o
// guard abaixo dá uma mensagem clara caso seja chamado fora de contexto.
export function makeTestDb(): Database {
  if (!DB) {
    throw new Error(
      "makeTestDb() chamado sem DATABASE_URL/DATABASE_URL_TEST. " +
        "Use itDb(...) para que o caso pule quando não há banco configurado.",
    );
  }
  return createDbClient(DB);
}
