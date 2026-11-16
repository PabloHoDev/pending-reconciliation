/**
 * Vocabulário do domínio da CRP (docs/negocio-orvalia.md, seção 2).
 * É a fonte única dos valores usados pelos enums do banco e pelo motor.
 */

export const AREAS = [
  "TRIAGEM_FINANCEIRA",
  "APOIO_RELACIONAMENTO",
  "RELACIONAMENTO_PARCEIRO",
  "AUDITORIA",
  "CONFERENCIA_PAGAMENTOS",
  "CONTAS_A_PAGAR",
  "CONFERENCIA_FISCAL",
] as const;
export type Area = (typeof AREAS)[number];

export const STATUS = ["ABERTO", "RECUSADO", "ENCERRADO", "CONTESTADO"] as const;
export type Status = (typeof STATUS)[number];

/** RN-04: derivada de área + status, nunca digitada. */
export const FASES = ["EM_AUDITORIA", "TRIAGEM_FINANCEIRA", "CONCLUIDO", "EM_TRATATIVA"] as const;
export type Fase = (typeof FASES)[number];

/** ADR-0003: cada protocolo está em exatamente um destino. */
export const DESTINOS = ["acompanhamento", "arquivo", "devolucao"] as const;
export type Destino = (typeof DESTINOS)[number];

/** RN-02: a base 2024-2025 não recebe novos. */
export const BASES = ["2026", "2024_2025"] as const;
export type Base = (typeof BASES)[number];

export const EQUIPES = ["hub", "central"] as const;
export type Equipe = (typeof EQUIPES)[number];

export const MODOS_EXECUCAO = ["simulacao", "gravacao"] as const;
export type ModoExecucao = (typeof MODOS_EXECUCAO)[number];

export const SITUACOES_EXECUCAO = [
  "em_andamento",
  "simulada",
  "gravada",
  "gravada_com_pendencia_painel",
  "recusada",
  "erro",
] as const;
export type SituacaoExecucao = (typeof SITUACOES_EXECUCAO)[number];

/** Situações que contam como "o dia já foi gravado" (idempotência). */
export const SITUACOES_GRAVADAS = [
  "gravada",
  "gravada_com_pendencia_painel",
] as const satisfies readonly SituacaoExecucao[];

/** RN-04: áreas de conferência são pós-processo. */
export const AREAS_CONFERENCIA = [
  "CONFERENCIA_PAGAMENTOS",
  "CONTAS_A_PAGAR",
  "CONFERENCIA_FISCAL",
] as const satisfies readonly Area[];

export const AREAS_RELACIONAMENTO = [
  "RELACIONAMENTO_PARCEIRO",
  "APOIO_RELACIONAMENTO",
] as const satisfies readonly Area[];
