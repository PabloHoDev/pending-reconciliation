# Roteiro

Cada etapa é uma issue no GitHub e entra por um ou mais Pull Requests pequenos. Ao fechar um marco, sai uma tag
SemVer com release notes.

| # | Etapa | Pronto quando | Marco |
|---|---|---|---|
| 0 | **Fundação** (#3): monorepo, Drizzle, PGlite, CI completo | `npm test` roda as migrations no PGlite e o CI fica verde (format, lint, typecheck, testes, build, Gitleaks) | |
| 1 | **Gerador sintético** (#4) | `npm run synth -- --start 2026-01-05 --days 60 --seed 42` cria o mundo e os extratos de forma reprodutível, com gabarito | `v0.1.0` |
| 2 | **Qualidade e funil** (#5) | raw → staging tipado, problemas por linha e funil com motivo, batendo com o gabarito | |
| 3 | **Matching avaliado** (#6) | Precisão e revocação por limiar sobre os erros gerados, com a escolha justificada | `v0.2.0` |
| 4 | **Estados, destinos e auditoria** (#7) | Rodar duas vezes não duplica; destino único; SCD2 e auditoria batem com o banco; as travas recusam os defeitos | `v0.3.0` |
| 5 | **Camada analítica** (#8) | Views do painel, anomalias e previsão com o erro medido, e um parágrafo de interpretação | `v0.4.0` |
| 6 | **Interface web** (#9) | As telas de `telas.md` com as personas e testes E2E dos fluxos do roteiro de 3 minutos | `v0.5.0` |
| 7 | **Deploy** (#10) | Aplicação no ar, preview por PR, cron diário e restauração semanal funcionando | `v0.9.0` |
| 8 | **README final** (#11) | Resultados, aprendizados e GIF | `v1.0.0` |

## O que o projeto mostra

- **Engenharia de dados:** camadas raw → staging → domínio → analytics, contratos de esquema, pipeline idempotente,
  histórico SCD2, orquestração diária, orçamento de armazenamento.
- **Ciência de dados:** dados sintéticos com distribuições realistas e gabarito, resolução de entidades avaliada,
  detecção de anomalias robusta e previsão com baseline.
- **Fullstack:** Next.js com autorização no servidor, permissões por coluna no banco, controle otimista de
  concorrência, testes E2E e deploy com ambientes separados.
- **Processo:** issues, PRs pequenos, Conventional Commits, ADRs, CI e releases.
