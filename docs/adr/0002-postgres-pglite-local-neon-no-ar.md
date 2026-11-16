# ADR-0002 · Banco: Postgres embutido no local (PGlite) e Neon no ar

- **Status:** aceito
- **Data:** 2026-11-16

## Contexto

O banco é o centro do projeto: substitui as planilhas compartilhadas e guarda a auditoria e a camada analítica
(ver `modelo-de-dados.md`). Os requisitos:

- SQL analítico de verdade: *window functions*, `percentile_cont`, views materializadas, schemas e permissões por
  coluna;
- rodar **sem instalar nada** na máquina de quem clona o repositório e nos testes do CI;
- ambientes separados (local, preview, produção), cada um com seu banco;
- custo zero.

## Decisão

**Postgres em todos os ambientes**, mudando só onde ele roda:

| Ambiente | Banco | Observação |
|---|---|---|
| Local | **PGlite** em arquivo (`.pglite/`, fora do Git) | Postgres compilado para WebAssembly, roda dentro do processo Node. `npm run dev` já sobe com banco |
| Testes / CI | **PGlite em memória** | Cada suíte cria um banco novo, roda as migrations e descarta. Sem container |
| Preview (PR) | **Neon**, um branch de banco por PR | Criado a partir do branch `seed` pela integração Neon-Vercel e apagado quando o PR fecha |
| Produção (demo) | **Neon**, branch `main` | Só recebe deploy a partir da `main` |

- Esquema e migrations com **Drizzle**, que tem drivers para PGlite e para Neon com o mesmo esquema.
- O branch Neon `seed` guarda o mundo Orvalia recém-gerado. A **restauração do ambiente de demonstração** é um
  reset do branch `main` a partir do `seed`, feito de forma agendada (ver `telas.md`, seção 3).
- O seed, os testes e os experimentos **nunca** apontam para o branch `main`. A fábrica de conexão recusa
  `DATABASE_URL` de produção quando `NODE_ENV` não é `production`.

## Alternativas consideradas

| Opção | Por que não |
|---|---|
| SQLite / Turso | É embutido de verdade, mas o SQL analítico é mais pobre (sem schemas, sem permissão por coluna, sem views materializadas) e mostra menos para engenharia de dados |
| Supabase | É Postgres e tem auth pronta, mas o projeto gratuito pausa por inatividade e não tem branch de banco por PR no plano gratuito |
| DuckDB como banco principal | É excelente para análise, mas não é feito para escrita concorrente de uma aplicação web. Pode entrar depois para leitura de exportações Parquet |
| Postgres em Docker no local | Funciona, mas obriga a instalar Docker. Fica como opção documentada, sem ser obrigatório |

## Consequências

- O mesmo SQL roda no teste e no ar. Um bug de dialeto aparece no CI, não em produção.
- O plano gratuito da Neon tem limite de armazenamento (na casa de 0,5 GB). Por isso **não se guarda todo extrato
  bruto para sempre**: a camada `raw` mantém só os últimos 7 dias de negócio. O histórico vive nas tabelas do
  domínio, no histórico de fases e nas contagens por execução (`modelo-de-dados.md`, seção 6).
- O PGlite roda num processo só. É suficiente para desenvolvimento e testes, mas não para carga concorrente, o que
  não é necessário fora do ar.
- O cliente Neon serverless faz uma conexão HTTP/WebSocket por requisição. Consultas pesadas do painel leem views
  materializadas, não as tabelas transacionais.
