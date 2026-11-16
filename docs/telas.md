# Telas da aplicação

A aplicação é o "sistema da CRP" da Orvalia. Quem abre o link escolhe uma **persona** e opera o processo com os
dados sintéticos do dia de negócio atual.

## 1. Personas

| Persona | Vê | Edita | Como entra |
|---|---|---|---|
| **Visitante** | Tudo | Nada. Roda simulações | Sem login |
| **Analista do hub** (por região) | Tudo | `analista_hub`, `estagio_hub`, `obs_hub` dos protocolos **da sua região** | Escolhe a persona e a região na tela de entrada |
| **Analista da Central** | Tudo | `analista_central`, `estagio_central`, `obs_central` de qualquer região | Escolhe a persona |
| **Operador** | Tudo | Grava execuções, avança o calendário, programa defeitos, restaura o demo | Login real (GitHub OAuth), só o dono do repositório |

As personas de demonstração usam uma sessão assinada (cookie `httpOnly`). A autorização é sempre conferida **no
servidor**, a cada ação, e o banco tem a segunda camada (`modelo-de-dados.md`, seção 5).

## 2. Mapa das telas

| Rota | Tela | O que mostra / faz |
|---|---|---|
| `/` | **Início** | O problema da Orvalia, a arquitetura em um diagrama, o dia de negócio atual e um roteiro de 3 minutos para explorar |
| `/painel` | **Painel CRP** | KPIs (abertos, concluídos na semana, taxa de conclusão, aging p50/p90), funil do último dia, backlog por região, gráfico de controle do volume diário com as anomalias marcadas, throughput semanal e previsão de backlog |
| `/execucoes` | **Execuções** | Histórico de execuções: modo, situação, hash, contagens, tempo por etapa, score de anomalia |
| `/execucoes/[id]` | **Execução do dia** | As abas da conferência (Novos, Atualizações, Conclusão, Para o arquivo, Para devolução, Quebras de regra, Por parceiro, Avisos, Descartados com motivo, Resumo) e o download `.xlsx` |
| `/execucoes/simular` | **Simular** | Roda o motor em modo simulação sobre o extrato do dia, opcionalmente com um defeito injetado, e mostra o resultado **sem gravar** |
| `/acompanhamento` | **Acompanhamento** | Uma guia por região (R01…R13), com filtros (fase, parceiro, idade, estágio). Os campos da equipe são editáveis conforme a persona, e todo o resto é só leitura |
| `/protocolos/[id]` | **Protocolo** | Dados, linha do tempo das fases (SCD2) e todas as alterações (antes/depois, motor ou usuário) |
| `/arquivo` | **Arquivo** | Concluídos por ano do depósito |
| `/devolucoes` | **Devoluções** | Devolvidos (abertos e concluídos) e os marcados em um estágio só, que ainda não são devolução |
| `/quebras-de-regra` | **Quebras de regra** | Protocolos com área ou status em branco, desde quando e em qual execução |
| `/cadastro` | **Cadastro** | Carteira, equipe, aliases de parceiros e avisos de nome parecido para revisar |
| `/auditoria` | **Auditoria** | Todas as alterações, com filtro por protocolo, campo, origem e período |
| `/erp` | **ERP Orvalia** | A origem simulada, com visual de sistema legado: o extrato do dia (download CSV), o calendário e, para o operador, defeitos programados |
| `/sobre` | **Sobre o projeto** | Decisões (ADRs), modelo de dados e links para o código |

## 3. Como o "mundo" da Orvalia anda no ar

- O **calendário fictício** começa em `2026-01-05`, com 60 dias úteis já processados pelo seed. O painel nasce com
  histórico.
- Todo dia útil (real), o agendamento roda: `synth` avança o ERP um dia → exporta o EXR → o motor grava → refresh da
  camada analítica. O visitante sempre vê "um dia novo".
- **Edições dos visitantes** (personas de analista) valem de verdade: um protocolo marcado `DEVOLVIDO` pelo hub **e**
  pela Central vai para devoluções na próxima execução. Por isso existe o botão "Simular agora", que mostra o efeito na
  hora, sem gravar.
- **Restauração do demo:** uma vez por semana (e sob demanda pelo operador), o branch de banco de produção é reiniciado a
  partir do branch `seed` (ADR-0002). As edições somem e o mundo volta ao estado conhecido.
- **Proteções de uma demo pública:** limite de taxa por IP nas ações de escrita e nas simulações, tamanho máximo nas
  observações e nada de upload de arquivo.

## 4. Roteiro de 3 minutos (aparece na tela Início)

1. Abra o **Painel** e veja o funil do dia e o gráfico de controle. Clique numa anomalia.
2. Vá em **Execuções → Simular** e injete o defeito "extrato filtrado". A trava recusa a gravação e explica o motivo.
3. Entre como **Analista do hub R03**, abra um protocolo e marque `DEVOLVIDO`. Depois entre como **Central** e marque
   também.
4. Clique em **Simular agora**: o protocolo aparece em "Para devolução".
5. Abra o **Protocolo** e veja a linha do tempo e a trilha de auditoria com as suas duas alterações.

## 5. Diretrizes de interface

- Desktop primeiro (é ferramenta de operação), mas utilizável no celular para o painel e a leitura.
- Tabelas grandes com paginação e filtros no servidor. Nada de carregar 40 mil linhas no navegador.
- Números e datas no formato brasileiro. Valores em R$.
- Toda tela de dados diz **de qual dia de negócio** e de **qual execução** os números vêm.
- Tema claro e escuro, contraste AA e navegação por teclado nas tabelas editáveis.
