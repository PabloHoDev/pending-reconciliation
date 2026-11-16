# CLAUDE.md · pending-reconciliation

Instruções para o Claude Code neste repositório. O fluxo geral (branch, commits, PR) está em `CONTRIBUTING.md`.

## O projeto

Motor de conciliação diária da Orvalia Distribuição (empresa fictícia), com Postgres e aplicação Next.js.
Antes de mexer em regra, leia `docs/negocio-orvalia.md` (RN-01…RN-11) e `docs/modelo-de-dados.md`.

## Regras do repositório

- **Repositório público.** Só dados sintéticos e vocabulário da Orvalia. Antes de cada push, rode a busca de termos
  sensíveis da lista local (`.sensitive-terms.txt`, fora do Git) sobre os arquivos alterados.
- `.private/` é material de bastidor e fica fora do Git: nunca copie conteúdo de lá para arquivos versionados.
- Confira a branch antes de alterar arquivos. Na `main`: `git pull` e crie a branch.
- Teste de regra de negócio cita o ID no nome: `it("RN-07: devolve só com DEVOLVIDO nos dois estágios")`.
- `fase` é derivada no banco. Nunca escreva `fase` pelo código.
- Escrita da aplicação só nos campos das equipes, com autorização no servidor (RN-09).
- Mudança de esquema = migration Drizzle nova. Nunca edite uma migration já aplicada na `main`.
- Testes e seed rodam no PGlite. Nunca use a `DATABASE_URL` de produção fora do ambiente de produção.

## Comandos

- `npm run check`: tudo o que o CI roda (format, lint, typecheck, testes). Rode antes de cada push.
- `npm test` / `npm run test:watch`, `npm run lint`, `npm run typecheck`, `npm run format`.
- Pacotes TypeScript são consumidos direto do código-fonte (`exports` apontando para `src/*.ts`), sem build.
  Imports relativos usam a extensão `.ts`.
- TypeScript fixado em 6.0 enquanto o typescript-eslint não suportar o 7.
- Em breve: `npm run dev` (Etapa 0), `npm run synth` (Etapa 1), `npm run engine` (Etapa 2).
