import { abrirPGlite, type ConexaoPGlite } from "./client.ts";

/** Banco novo, em memória e já migrado, para cada suíte de teste. */
export function criarBancoDeTeste(): Promise<ConexaoPGlite> {
  return abrirPGlite();
}

/**
 * Subir o PGlite e migrar leva de 1 a 3 s; com a máquina ocupada (CI, lint em paralelo) passa dos 5 s
 * padrão do Vitest. Use em hooks e testes que abrem banco.
 */
export const TIMEOUT_BANCO_MS = 30_000;
