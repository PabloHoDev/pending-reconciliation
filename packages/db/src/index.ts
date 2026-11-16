// Só domínio e esquema: código puro, que qualquer pacote pode importar (inclusive a aplicação web).
// O cliente PGlite usa caminhos de disco e WASM, então fica em "@orvalia/db/client".
export * from "./schema/dominio.ts";
export * as schema from "./schema/index.ts";
