# ADR-0001 · Stack: TypeScript, Next.js e monorepo

- **Status:** aceito
- **Data:** 2026-11-16

## Contexto

O projeto precisa de três coisas que conversam entre si:

1. um **motor de conciliação** (lote diário sobre ~40 mil linhas) com regras testáveis;
2. um **gerador sintético** que simula o ERP da Orvalia dia a dia;
3. uma **aplicação web no ar**, com painel, telas de operação e edição por papel.

É um projeto de portfólio fullstack com foco em dados, e precisa rodar de graça. A aplicação tem que ser fácil de
publicar e de abrir por quem avalia o portfólio.

## Decisão

- **Linguagem:** TypeScript estrito em todo o código, com Node.js 24 LTS.
- **Monorepo** com npm workspaces:
  - `apps/web`: Next.js (App Router). Telas em React Server Components; escrita por Server Actions com validação
    Zod no servidor. Interface com Tailwind CSS e componentes shadcn/ui, gráficos com ECharts.
  - `packages/engine`: o motor. Funções puras (normalização, matching, funil, fase, destinos) e uma camada fina de
    acesso ao banco. Roda por CLI (`npm run engine -- --date 2026-02-03 --mode simulacao`) e é chamado pela
    aplicação no modo simulação.
  - `packages/synth`: gerador do mundo Orvalia e do ERP diário, reprodutível por *seed*, com gabarito.
  - `packages/db`: esquema Drizzle, migrations, papéis do banco e fábrica de conexão por ambiente (ADR-0002).
- **Testes:** Vitest para unidade e integração (integração contra PGlite, ADR-0002), Playwright para os fluxos
  principais da interface.
- **Orquestração diária:** GitHub Actions agendado roda gerador → motor → atualização da camada analítica. O lote
  não roda dentro de uma função serverless, que tem limite de tempo.
- **Hospedagem:** Vercel (plano Hobby) para a aplicação, com um preview por Pull Request.

## Alternativas consideradas

| Opção | Por que não |
|---|---|
| Python (pandas/DuckDB) + Streamlit | Ótimo para análise, mas o Streamlit não serve como aplicação de operação com papéis e edição. Teria duas linguagens no caminho crítico |
| API Fastify + React/Vite | Mostra mais separação entre back e front, mas são dois deploys, e o plano gratuito do Render dorme quando fica sem uso, o que é ruim para quem abre o link |
| Turborepo/pnpm | Útil em monorepos maiores. Com 4 pacotes, os npm workspaces bastam e dispensam ferramenta extra. Dá para migrar depois |

## Consequências

- Uma linguagem só, do gerador à tela. Os tipos do esquema (Drizzle) são compartilhados pelo motor e pela aplicação.
- O motor é independente do Next.js: dá para testar e rodar sem servidor web.
- A análise exploratória e a avaliação estatística podem usar notebooks Python opcionais (`notebooks/`) lendo o
  mesmo Postgres. Eles ficam fora do caminho crítico e do CI obrigatório.
- O lote no GitHub Actions depende da cota gratuita de minutos, que é mais que suficiente para uma execução por dia.
