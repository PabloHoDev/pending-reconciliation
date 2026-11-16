import {
  AREAS_CONFERENCIA,
  AREAS_RELACIONAMENTO,
  type Area,
  type Fase,
  type Status,
} from "@orvalia/db";

const em = <T>(lista: readonly T[], valor: T | null): valor is T =>
  valor !== null && lista.includes(valor);

/**
 * RN-04: fase derivada de área + status.
 *
 * O banco calcula a mesma regra numa coluna gerada (`crp.protocolos.fase`). O motor precisa dela
 * antes de gravar (para decidir conclusões e destinos), e `fase.test.ts` garante que as duas
 * implementações concordam em todas as combinações.
 */
export function derivarFase(area: Area | null, status: Status | null): Fase {
  if (area === "AUDITORIA") return "EM_AUDITORIA";
  if (area === "TRIAGEM_FINANCEIRA" && em(["ABERTO", "RECUSADO"], status)) {
    return "TRIAGEM_FINANCEIRA";
  }
  if (em(AREAS_CONFERENCIA, area) && em(["ABERTO", "ENCERRADO", "CONTESTADO"], status)) {
    return "CONCLUIDO";
  }
  if (em(AREAS_RELACIONAMENTO, area) && em(["ENCERRADO", "CONTESTADO"], status)) {
    return "CONCLUIDO";
  }
  return "EM_TRATATIVA";
}
