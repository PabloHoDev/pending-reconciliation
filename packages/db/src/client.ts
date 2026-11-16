import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema/index.ts";

export const PASTA_MIGRATIONS = fileURLToPath(new URL("../drizzle", import.meta.url));

/** Banco local padrão (ADR-0002): `.pglite/` na raiz do repositório, fora do Git. */
export const PASTA_PGLITE_PADRAO = fileURLToPath(new URL("../../../.pglite", import.meta.url));

export interface ConexaoPGlite {
  db: ReturnType<typeof drizzle<typeof schema>>;
  client: PGlite;
  fechar: () => Promise<void>;
}

/**
 * Abre um Postgres embutido (PGlite) e aplica as migrations pendentes.
 * Sem `pasta`, o banco fica só em memória (testes).
 */
export async function abrirPGlite(pasta?: string): Promise<ConexaoPGlite> {
  const client = pasta === undefined ? new PGlite() : new PGlite(pasta);
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: PASTA_MIGRATIONS });
  return { db, client, fechar: () => client.close() };
}
