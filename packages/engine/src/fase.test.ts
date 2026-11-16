import { AREAS, STATUS, type Area, type Status } from "@orvalia/db";
import { criarBancoDeTeste, TIMEOUT_BANCO_MS } from "@orvalia/db/testing";
import { describe, expect, it } from "vitest";
import { derivarFase } from "./fase.ts";

describe("RN-04: derivarFase", () => {
  it.each([
    ["AUDITORIA", null, "EM_AUDITORIA"],
    ["AUDITORIA", "ENCERRADO", "EM_AUDITORIA"],
    ["TRIAGEM_FINANCEIRA", "RECUSADO", "TRIAGEM_FINANCEIRA"],
    ["TRIAGEM_FINANCEIRA", "ENCERRADO", "EM_TRATATIVA"],
    ["CONFERENCIA_FISCAL", "ABERTO", "CONCLUIDO"],
    ["CONFERENCIA_FISCAL", "RECUSADO", "EM_TRATATIVA"],
    ["APOIO_RELACIONAMENTO", "CONTESTADO", "CONCLUIDO"],
    ["RELACIONAMENTO_PARCEIRO", "ABERTO", "EM_TRATATIVA"],
    [null, "ABERTO", "EM_TRATATIVA"],
  ] as const)("%s + %s → %s", (area, status, esperada) => {
    expect(derivarFase(area, status)).toBe(esperada);
  });

  it(
    "concorda com a coluna gerada do banco em todas as combinações, inclusive vazias",
    async () => {
      const areas: (Area | null)[] = [...AREAS, null];
      const status: (Status | null)[] = [...STATUS, null];
      const combinacoes = areas.flatMap((a) => status.map((s) => [a, s] as const));

      const { client, fechar } = await criarBancoDeTeste();
      try {
        // Tabela temporária com a mesma expressão da coluna gerada de crp.protocolos.
        const { rows: def } = await client.query<{ expr: string }>(
          `select pg_get_expr(d.adbin, d.adrelid) as expr
           from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
          where d.adrelid = 'crp.protocolos'::regclass and a.attname = 'fase'`,
        );
        await client.exec(`create temp table combinacoes (area crp.area, status crp.status,
        fase crp.fase generated always as (${def[0]!.expr}) stored)`);
        for (const [a, s] of combinacoes) {
          await client.query("insert into combinacoes (area, status) values ($1, $2)", [a, s]);
        }
        const { rows } = await client.query<{
          area: Area | null;
          status: Status | null;
          fase: string;
        }>("select area, status, fase from combinacoes");

        expect(rows).toHaveLength(combinacoes.length);
        for (const r of rows) {
          expect({ ...r, fase: derivarFase(r.area, r.status) }).toEqual(r);
        }
      } finally {
        await fechar();
      }
    },
    TIMEOUT_BANCO_MS,
  );
});
