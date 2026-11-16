import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ConexaoPGlite } from "./client.ts";
import {
  execucoes,
  membrosEquipe,
  parceirosCarteira,
  protocolos,
  regioes,
} from "./schema/index.ts";
import { criarBancoDeTeste, TIMEOUT_BANCO_MS } from "./testing.ts";

let conexao: ConexaoPGlite;
let parceiroId: number;

/** Protocolo válido mínimo; cada teste sobrescreve só o que importa. */
function protocolo(
  sobrescrever: Partial<typeof protocolos.$inferInsert> = {},
): typeof protocolos.$inferInsert {
  return {
    protocolo: "RP-2026-0000001",
    base: "2026",
    regiao: "R01",
    praca: "Vila Aruã",
    parceiroId,
    area: "TRIAGEM_FINANCEIRA",
    status: "ABERTO",
    valor: "812.40",
    dataDeposito: "2026-02-03",
    dataInicio: "2026-02-05",
    ...sobrescrever,
  };
}

/** Postgres devolve o erro de constraint como `cause` do erro do Drizzle. */
async function erroDe(promessa: Promise<unknown>): Promise<string> {
  try {
    await promessa;
  } catch (e) {
    const causa = (e as { cause?: { message?: string } }).cause;
    return causa?.message ?? String(e);
  }
  throw new Error("era esperado um erro do banco");
}

beforeAll(async () => {
  conexao = await criarBancoDeTeste();
  const { db } = conexao;
  await db.insert(regioes).values({ codigo: "R01", nome: "Vale do Aruã" });
  const [hub, central] = await db
    .insert(membrosEquipe)
    .values([
      { nome: "Analista Hub 01", equipe: "hub", regiao: "R01" },
      { nome: "Analista Central 01", equipe: "central" },
    ])
    .returning({ id: membrosEquipe.id });
  const [parceiro] = await db
    .insert(parceirosCarteira)
    .values({
      nome: "TRANSLUZ CARGAS LTDA",
      nomeNormalizado: "TRANSLUZ CARGAS LTDA",
      regiao: "R01",
      cidadeHub: "Vila Aruã",
      analistaHubId: hub!.id,
      analistaCentralId: central!.id,
    })
    .returning({ id: parceirosCarteira.id });
  parceiroId = parceiro!.id;
}, TIMEOUT_BANCO_MS);

afterAll(() => conexao?.fechar());

beforeEach(async () => {
  await conexao.db.delete(protocolos);
  await conexao.db.delete(execucoes);
});

describe("migrations", () => {
  it("criam os schemas crp e audit", async () => {
    const { rows } = await conexao.client.query<{ nspname: string }>(
      "select nspname from pg_namespace where nspname in ('crp', 'audit') order by 1",
    );
    expect(rows.map((r) => r.nspname)).toEqual(["audit", "crp"]);
  });
});

describe("crp.protocolos", () => {
  it("RN-04: o banco deriva a fase de área + status", async () => {
    const [linha] = await conexao.db
      .insert(protocolos)
      .values(protocolo({ area: "CONTAS_A_PAGAR", status: "ABERTO" }))
      .returning({ fase: protocolos.fase });
    expect(linha?.fase).toBe("CONCLUIDO");
  });

  it("RN-04: a fase acompanha a mudança de status", async () => {
    await conexao.db
      .insert(protocolos)
      .values(protocolo({ area: "RELACIONAMENTO_PARCEIRO", status: "ABERTO" }));
    const [linha] = await conexao.db
      .update(protocolos)
      .set({ status: "ENCERRADO" })
      .returning({ fase: protocolos.fase });
    expect(linha?.fase).toBe("CONCLUIDO");
  });

  it("RN-04: ninguém escreve a fase diretamente", async () => {
    const erro = await erroDe(
      conexao.client.query(
        `insert into crp.protocolos (protocolo, base, regiao, praca, parceiro_id, valor, data_deposito, data_inicio, fase)
         values ('RP-X', '2026', 'R01', 'Vila Aruã', $1, 10, '2026-01-10', '2026-01-10', 'CONCLUIDO')`,
        [parceiroId],
      ),
    );
    expect(erro).toMatch(/non-DEFAULT value into column "fase"/);
  });

  it("RN-08: área ou status em branco é aceito (para ser apontado) e cai em Em tratativa", async () => {
    const [linha] = await conexao.db
      .insert(protocolos)
      .values(protocolo({ area: null, status: null }))
      .returning({ fase: protocolos.fase });
    expect(linha?.fase).toBe("EM_TRATATIVA");
  });

  it("ADR-0003: um protocolo não existe em dois destinos", async () => {
    await conexao.db.insert(protocolos).values(protocolo());
    const erro = await erroDe(
      conexao.db.insert(protocolos).values(protocolo({ destino: "devolucao" })),
    );
    expect(erro).toMatch(/protocolos_pkey/);
  });

  it("RN-05/06: não existe arquivado sem data de conclusão", async () => {
    const erro = await erroDe(
      conexao.db.insert(protocolos).values(protocolo({ destino: "arquivo", dataConclusao: null })),
    );
    expect(erro).toMatch(/protocolos_arquivo_tem_conclusao/);
  });

  it("RN-02: a base precisa ser coerente com o ano do depósito", async () => {
    const erro = await erroDe(
      conexao.db.insert(protocolos).values(protocolo({ base: "2026", dataDeposito: "2025-11-20" })),
    );
    expect(erro).toMatch(/protocolos_base_coerente_com_deposito/);

    await expect(
      conexao.db
        .insert(protocolos)
        .values(protocolo({ base: "2024_2025", dataDeposito: "2025-11-20" })),
    ).resolves.toBeDefined();
  });

  it("recusa valor zero ou negativo", async () => {
    const erro = await erroDe(conexao.db.insert(protocolos).values(protocolo({ valor: "0" })));
    expect(erro).toMatch(/protocolos_valor_positivo/);
  });
});

describe("crp.equipe", () => {
  it("analista de hub tem região; da Central, não", async () => {
    const semRegiao = await erroDe(
      conexao.db.insert(membrosEquipe).values({ nome: "Hub sem região", equipe: "hub" }),
    );
    expect(semRegiao).toMatch(/equipe_regiao_do_hub/);

    const centralComRegiao = await erroDe(
      conexao.db
        .insert(membrosEquipe)
        .values({ nome: "Central com região", equipe: "central", regiao: "R01" }),
    );
    expect(centralComRegiao).toMatch(/equipe_regiao_do_hub/);
  });
});

describe("audit.execucoes", () => {
  const execucao = {
    diaNegocio: "2026-02-05",
    versaoMotor: "0.0.0",
    versaoRegras: "0.0.0",
  } as const;

  it("idempotência: só uma gravação concluída por dia de negócio", async () => {
    await conexao.db
      .insert(execucoes)
      .values({ ...execucao, modo: "gravacao", situacao: "gravada" });
    const erro = await erroDe(
      conexao.db
        .insert(execucoes)
        .values({ ...execucao, modo: "gravacao", situacao: "gravada_com_pendencia_painel" }),
    );
    expect(erro).toMatch(/execucoes_uma_gravacao_por_dia/);
  });

  it("idempotência: simulações e gravações recusadas não bloqueiam o dia", async () => {
    await conexao.db.insert(execucoes).values([
      { ...execucao, modo: "simulacao", situacao: "simulada" },
      { ...execucao, modo: "simulacao", situacao: "simulada" },
      { ...execucao, modo: "gravacao", situacao: "recusada" },
      { ...execucao, modo: "gravacao", situacao: "gravada" },
    ]);
    const { rows } = await conexao.client.query<{ n: number }>(
      "select count(*)::int as n from audit.execucoes",
    );
    expect(rows[0]?.n).toBe(4);
  });

  it("aceita só SHA-256 em hexadecimal minúsculo", async () => {
    const erro = await erroDe(
      conexao.db.insert(execucoes).values({ ...execucao, modo: "simulacao", extratoSha256: "abc" }),
    );
    expect(erro).toMatch(/execucoes_sha256_formato/);
  });
});
