import { abrirPGlite, PASTA_PGLITE_PADRAO } from "../client.ts";

const pasta = process.env["PGLITE_DIR"] ?? PASTA_PGLITE_PADRAO;
const { fechar } = await abrirPGlite(pasta);
await fechar();
console.log(`Migrations aplicadas em ${pasta}`);
