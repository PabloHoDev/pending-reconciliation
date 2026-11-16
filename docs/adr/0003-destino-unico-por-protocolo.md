# ADR-0003 · Um destino por protocolo, garantido pelo modelo

- **Status:** aceito
- **Data:** 2026-11-16

## Contexto

Na operação em planilhas, acompanhamento, arquivo do ano e devoluções eram **arquivos diferentes**. Mover um
protocolo exigia uma ordem rígida: gravar no destino → salvar → ler de volta o que foi salvo → só então apagar da
origem. Se a sequência falhasse no meio, o protocolo ficava em dois lugares ou em nenhum.

A regra de negócio que importa é: **cada protocolo está em exatamente um destino** (RN-06, RN-07).

## Decisão

1. Uma tabela só, `crp.protocolos`, com chave primária `protocolo` e uma coluna `destino`
   (`acompanhamento` | `arquivo` | `devolucao`). Acompanhamento, arquivo e devoluções são **views** sobre ela.
   Com isso, "estar em dois destinos" não pode acontecer: a chave primária impede.
2. Mudar de destino é um `UPDATE` de `destino`, junto com os estágios de arquivo (RN-06), **na transação da
   execução**.
3. A conferência no destino continua existindo, como **verificação de invariantes** antes do `COMMIT`: a execução
   reconta, no banco, os protocolos que deveriam ter mudado e compara com o plano calculado. Se não bater, faz
   `ROLLBACK` e termina com erro.
4. Cada transição gera uma linha em `audit.alteracoes` e fecha/abre um período em `crp.protocolos_historico`
   (SCD tipo 2).

## Alternativas consideradas

| Opção                                                                           | Por que não                                                                                                                              |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Três tabelas (`tracking`, `archive`, `returns`) com mover = `INSERT` + `DELETE` | Reproduz o problema das planilhas. Exige _trigger_ ou checagem para garantir o destino único, e a garantia fica no código, não no modelo |
| Particionar `crp.protocolos` por `destino`                                      | Ajuda em volumes muito maiores. Com dezenas de milhares de linhas, um índice por `destino` basta                                         |

## Consequências

- O invariante mais importante do processo vira restrição do banco, sem depender de disciplina.
- A transação substitui o "salvar, ler de volta, apagar". A verificação de invariantes continua como defesa contra
  bug do motor, e é ela que o teste de integração exercita.
- As telas e o painel continuam vendo os três destinos separados, pelas views.
- Um protocolo arquivado que reabre (RN-06) continua no arquivo e só gera aviso: a decisão é de negócio, não do
  modelo.
