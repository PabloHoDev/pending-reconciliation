# CLAUDE.md · pending-reconciliation

Instruções para o Claude Code neste repositório. O fluxo geral (branch, commits, PR) está em `CONTRIBUTING.md`.

## O projeto

Motor de conciliação diária da Orvalia Distribuição (empresa fictícia), com Postgres e aplicação Next.js.
Antes de mexer em regra, leia `docs/negocio-orvalia.md` (RN-01…RN-11) e `docs/modelo-de-dados.md`.

## Regras do repositório

- **Repositório público.** Só dados sintéticos e vocabulário da Orvalia. Antes de cada push, rode a busca de termos
  sensíveis da lista local (`.sensitive-terms.txt`, fora do Git) sobre os arquivos alterados.
- `.private/` é material de bastidor e fica fora do Git: nunca copie conteúdo de lá para arquivos versionados.
- Confira a branch antes de alterar arquivos. Se não for a certa, avise e passe os comandos: quem troca de branch,
  sincroniza a `main` e faz `git add`/`commit`/`push` é o dono do repositório. O Claude prepara as mudanças, roda os
  checks e entrega os commits agrupados por assunto, com a mensagem pronta.
- Sem assinatura de ferramenta em commits, PRs ou documentos.
- Teste de regra de negócio cita o ID no nome: `it("RN-07: devolve só com DEVOLVIDO nos dois estágios")`.
- `fase` é coluna gerada no banco (RN-04) e nunca é escrita. O motor usa `derivarFase`, com a mesma regra; o teste
  `packages/engine/src/fase.test.ts` compara as duas. Mudou uma, mude a outra.
- Escrita da aplicação só nos campos das equipes, com autorização no servidor (RN-09).
- Mudança de esquema = migration Drizzle nova. Nunca edite uma migration já aplicada na `main`.
- Testes e seed rodam no PGlite. Nunca use a `DATABASE_URL` de produção fora do ambiente de produção.

## Comandos

- `npm run check`: tudo o que o CI roda (format, lint, typecheck, testes). Rode antes de cada push.
- `npm test` / `npm run test:watch`, `npm run lint`, `npm run typecheck`, `npm run format`.
- Pacotes TypeScript são consumidos direto do código-fonte (`exports` apontando para `src/*.ts`), sem build.
  Imports relativos usam a extensão `.ts`.
- TypeScript fixado em 6.0 enquanto o typescript-eslint não suportar o 7.
- `npm run db:generate`: gera a migration depois de mudar `packages/db/src/schema`. O CI falha se o esquema e as
  migrations divergirem.
- `npm run db:migrate`: aplica as migrations no banco local (`.pglite/`, ou `PGLITE_DIR`).
- Testes com banco usam `criarBancoDeTeste()` (PGlite em memória, já migrado) e `TIMEOUT_BANCO_MS` em hooks/testes
  que abrem banco.
- `npm run dev`: aplicação web (`apps/web`, Next.js) em `localhost:3000`. `npm run build` compila como no CI.
- `@orvalia/db` exporta só domínio e esquema (código puro). O cliente PGlite fica em `@orvalia/db/client`: a aplicação
  web não deve importá-lo, senão o build tenta empacotar caminhos de disco e o WASM.
- Em breve: `npm run synth` (Etapa 1), `npm run engine` (Etapa 2).
