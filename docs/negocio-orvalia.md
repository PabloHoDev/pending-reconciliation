# Orvalia Distribuição S.A. · o negócio

> A Orvalia é uma **empresa fictícia**. Todos os nomes, números e pessoas deste repositório são gerados por
> script (`packages/synth`). Este documento é a fonte das regras de negócio: o motor, os testes e as telas
> seguem o que está aqui.

## 1. A empresa

A **Orvalia Distribuição S.A.** é uma distribuidora atacadista que opera em 13 regiões. A entrega ao cliente
final é feita por uma rede de **parceiros logísticos** (transportadoras e agregados autônomos), pagos por
**repasse** a cada protocolo de entrega.

Às vezes um repasse fica travado: o comprovante não fecha, o valor é contestado, o parceiro recebeu a mais ou
a entrega volta. Esses casos caem na **Central de Repasses Pendentes (CRP)**, uma equipe pequena que acompanha
cada **protocolo** até o fim.

| Peça                 | Na Orvalia                                                               |
| -------------------- | ------------------------------------------------------------------------ |
| Sistema de origem    | **ERP Orvalia**, que exporta todo dia o **Extrato de Repasses (EXR)**    |
| Quem a CRP acompanha | Os **parceiros da carteira**: só os protocolos desses parceiros entram   |
| Unidade de trabalho  | O **protocolo** (`protocolo`, identificador único do repasse)            |
| Onde se trabalha     | A tela **Acompanhamento**, com uma guia por região                       |
| Equipes              | **Hub regional** (um por região) e **Central** (equipe da matriz da CRP) |
| Quem consome         | O **Painel CRP**, que lê a camada consolidada                            |

### Antes e depois

Antes do sistema, a CRP trabalhava em planilhas compartilhadas: uma pasta por ano, uma aba por região, três
macros rodadas à mão todo dia e cópia manual entre arquivos. Os problemas eram retrabalho diário, erro de
transcrição e protocolo "perdido" entre um arquivo e outro.

O sistema substitui isso por um **motor de conciliação** que roda uma vez por dia útil sobre o extrato do ERP,
um **banco de dados** com uma única fonte da verdade e uma **aplicação web** onde cada equipe só edita os
campos que são dela.

### Regiões

| Código | Região           | Código | Região          |
| ------ | ---------------- | ------ | --------------- |
| R01    | Vale do Aruã     | R08    | Litoral Leste   |
| R02    | Serra Morena     | R09    | Planalto Sul    |
| R03    | Costa dos Ventos | R10    | Campos do Oeste |
| R04    | Baixada Verde    | R11    | Chapada Alta    |
| R05    | Sertão Novo      | R12    | Delta Norte     |
| R06    | Cerrado Central  | R13    | Fronteira Azul  |
| R07    | Ribeira Funda    |        |                 |

Cada região tem cidades e **filiais** (`F001…`) e um **hub regional** responsável. Uma das regiões tem só uma
filial; as outras têm várias.

## 2. O extrato (EXR)

O ERP exporta todo dia um CSV separado por `;`, com cerca de 40 mil linhas e 27 colunas, sempre completo (todos
os protocolos de todos os parceiros). As colunas que importam:

| Coluna          | Exemplo                | Uso                                                        |
| --------------- | ---------------------- | ---------------------------------------------------------- |
| `PROTOCOLO`     | `RP-2026-0481273`      | Chave. Pode vir repetido no mesmo extrato                  |
| `PARCEIRO`      | `TRANSLUZ CARGAS LTDA` | Digitado de jeitos diferentes (acento, espaço, abreviação) |
| `AREA`          | `TRIAGEM_FINANCEIRA`   | Setor do ERP onde o protocolo está                         |
| `STATUS`        | `ABERTO`               | Situação no setor                                          |
| `VALOR`         | `1.234,56`             | Formato brasileiro, como texto                             |
| `DATA_DEPOSITO` | `03/02/2026`           | Define o ano e, portanto, a base e o arquivo de destino    |
| `DATA_ENTRADA`  | `05/02/2026`           | Entrada no ERP                                             |

O resto é ruído realista: centro de custo, lote, usuário do ERP, observação livre.

**Áreas:** `TRIAGEM_FINANCEIRA`, `APOIO_RELACIONAMENTO`, `RELACIONAMENTO_PARCEIRO`, `AUDITORIA`,
`CONFERENCIA_PAGAMENTOS`, `CONTAS_A_PAGAR`, `CONFERENCIA_FISCAL`.
**Status:** `ABERTO`, `RECUSADO`, `ENCERRADO`, `CONTESTADO`.

## 3. Regras de negócio

Cada regra tem um identificador (`RN-xx`) usado nos testes, no funil e nos avisos.

### RN-01 · Protocolo novo

Um protocolo entra no acompanhamento se passar, em ordem, por todos os filtros. O funil registra o motivo de
cada descarte:

1. `PARCEIRO` está na carteira. O texto é normalizado (caixa, acento, espaços). Um nome parecido mas diferente
   vira **aviso**, não entra (ver RN-11).
2. `AREA` ∈ {`TRIAGEM_FINANCEIRA`, `APOIO_RELACIONAMENTO`, `RELACIONAMENTO_PARCEIRO`}.
3. `STATUS` ∈ {`ABERTO`, `RECUSADO`}.
4. O ano de `DATA_DEPOSITO` tem uma base que recebe novos. Ano anterior = backlog (não entra). Ano futuro sem
   base = aviso.
5. O protocolo não está em **nenhum** destino (acompanhamento, arquivo ou devoluções).
6. Repetido no extrato: entra uma vez.

**Como nasce a linha:** os campos do extrato entram como vieram. `regiao`, `cidade_hub`, `analista_hub` e
`analista_central` vêm **sempre do cadastro do parceiro**, nunca do extrato. A praça segue a ordem: região com
uma filial só → a cidade → a filial → "E OUTRAS". `analista_central` só pode ser da equipe ativa: um nome fora da
lista faz o motor parar. `data_inicio` = dia da entrada. Estágios, observações e `data_conclusao` começam em
branco. `fase` e `situacao` são **derivadas**, nunca digitadas.

### RN-02 · Base antiga em modo mínimo

A base de 2024-2025 **não recebe novos** e não passa pela análise de parceiro. Ela só (1) atualiza área e status
e (2) manda os concluídos para o arquivo, com a data do dia gravada só neles. A gestão também pode mandar
protocolos antigos para devoluções. A coluna `codigo_rastreio_antigo`, de um processo aposentado, fica só como
registro: fora da análise e fora do arquivo.

### RN-03 · Área e status

O extrato inteiro (qualquer parceiro) atualiza `area` e `status` em todos os destinos: se o valor do extrato não
está vazio e é diferente, troca. **Vazio nunca apaga.** Um protocolo que aparece mais de uma vez é atualizado em
todas as ocorrências, com aviso.

### RN-04 · Fase (derivada de área + status)

| Área                                                             | Status                              | Fase               |
| ---------------------------------------------------------------- | ----------------------------------- | ------------------ |
| `AUDITORIA`                                                      | qualquer                            | Em auditoria       |
| `TRIAGEM_FINANCEIRA`                                             | `ABERTO`, `RECUSADO`                | Triagem financeira |
| `CONFERENCIA_PAGAMENTOS`, `CONTAS_A_PAGAR`, `CONFERENCIA_FISCAL` | `ABERTO`, `ENCERRADO`, `CONTESTADO` | **Concluído**      |
| `RELACIONAMENTO_PARCEIRO`, `APOIO_RELACIONAMENTO`                | `ENCERRADO`, `CONTESTADO`           | **Concluído**      |
| qualquer outra combinação                                        |                                     | Em tratativa       |

As conferências são **pós-processo**: quando o protocolo chega lá, para a CRP ele está concluído.

### RN-05 · Data de conclusão fixa

`data_conclusao` é gravada como **valor** no dia em que a fase vira Concluído. Não é calculada como "hoje", o que
mudaria todo dia. Um protocolo reaberto perde a data, com aviso. O motor roda todo dia útil, inclusive no último
da semana e do mês, porque a taxa semanal e a mensal dependem disso.

### RN-06 · Arquivo do ano

Um concluído vai, **na mesma execução**, para o arquivo do ano do depósito. A transição só é confirmada depois de
conferida no destino (ver ADR-0003). Um reaberto que já está no arquivo gera só um aviso.

**Estágios no arquivo:** `estagio_hub` = `ESTORNO AO PARCEIRO` quando a área é de relacionamento e o status é
`ENCERRADO`/`CONTESTADO`. Nos outros casos, `DOSSIÊ ENVIADO`. `estagio_central` = `FINALIZADO`, sempre.

### RN-07 · Devoluções

Um protocolo com `DEVOLVIDO` no `estagio_hub` **e** no `estagio_central` vai para devoluções, esteja aberto ou
concluído. Essa regra roda **antes** da do arquivo. Marcado em **um campo só**, ele fica onde está (às vezes o hub
marca e o caso não segue como devolução) e só entra na contagem. Um devolvido não vai para o arquivo do ano.

### RN-08 · Quebra de regra

`area` ou `status` em branco depois da atualização é **erro de processo**: a fase cairia em "Em tratativa" e
esconderia o problema. O motor aponta cada protocolo (tela Quebras de regra, avisos da execução) e **nunca
preenche sozinho**.

### RN-09 · Campos de cada equipe

Cada equipe só edita os campos que são dela: analista, estágio e observação do hub para o hub da região, e os
mesmos campos da Central para a Central. Todo o resto é do motor. A permissão é conferida **no servidor** e no
banco (ver `modelo-de-dados.md`, seção 5). A tela só esconde o que o servidor já recusaria.

### RN-10 · Consolidada e painel

Depois de gravar, o motor atualiza a camada consolidada (acompanhamento, backlog, arquivo e devoluções) que
alimenta o Painel CRP. Uma falha nessa etapa **não desfaz** o que já foi gravado: a execução termina como
"gravada com pendência no painel" e a atualização pode ser refeita sozinha.

### RN-11 · Parceiro parecido

Um nome do extrato que não bate com a carteira, mas é muito parecido com um parceiro dela, vira aviso para revisão
do cadastro. Se o nome for de um parceiro conhecido de fora da carteira, o aviso não aparece.

## 4. Travas e operação

- **Simulação por padrão.** Toda execução calcula tudo e mostra o resultado. Gravar exige o modo de gravação, que só
  o operador (agendamento ou administrador) usa.
- O extrato precisa ser **do dia** (extrato velho desfaz atualizações) e ter **≥ 20 mil linhas** (menos que isso
  indica um extrato filtrado).
- **Idempotência:** só existe uma execução gravada por dia de negócio. Rodar de novo o mesmo extrato não muda nada.
- **Volume fora do normal** (novos, mudanças, concluídos, devoluções) é detectado por anomalia sobre o histórico
  das execuções, e não por limite fixo. Uma execução anômala é gravada só com confirmação.
- Tudo o que uma execução grava acontece numa **transação**: ou entra tudo, ou nada.

## 5. Saídas

- **Execução do dia** (tela e download `.xlsx`): Novos, Atualizações, Conclusão, Para o arquivo, Para devolução,
  Quebras de regra, Por parceiro, Avisos, Descartados (com motivo), Cadastro, Resumo.
- **Histórico de execuções:** versão do motor e das regras, hash SHA-256 do extrato, contagens e tempo por etapa.
- **Auditoria:** cada alteração (protocolo, campo, antes, depois, quem: motor ou usuário).

## 6. Glossário

| Termo           | Significado                                                         |
| --------------- | ------------------------------------------------------------------- |
| Protocolo       | Um repasse a um parceiro, do início à conclusão                     |
| Carteira        | Os parceiros cujos protocolos a CRP acompanha                       |
| Acompanhamento  | Os protocolos abertos, com uma guia por região                      |
| Arquivo do ano  | Os concluídos, pelo ano do depósito                                 |
| Devolução       | Protocolo que volta ao parceiro; tem destino próprio                |
| Quebra de regra | Campo obrigatório em branco: apontado, nunca corrigido pelo motor   |
| Consolidada     | A visão única que alimenta o Painel CRP                             |
| Dia de negócio  | O dia do calendário fictício da Orvalia ao qual o extrato se refere |
