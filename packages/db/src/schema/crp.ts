import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgSchema,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { AREAS, BASES, DESTINOS, EQUIPES, FASES, STATUS } from "./dominio.ts";

export const crp = pgSchema("crp");

export const areaEnum = crp.enum("area", AREAS);
export const statusEnum = crp.enum("status", STATUS);
export const faseEnum = crp.enum("fase", FASES);
export const destinoEnum = crp.enum("destino", DESTINOS);
export const baseEnum = crp.enum("base", BASES);
export const equipeEnum = crp.enum("tipo_equipe", EQUIPES);

export const regioes = crp.table("regioes", {
  codigo: text("codigo").primaryKey(),
  nome: text("nome").notNull().unique(),
});

export const filiais = crp.table(
  "filiais",
  {
    codigo: text("codigo").primaryKey(),
    regiao: text("regiao")
      .notNull()
      .references(() => regioes.codigo),
    cidade: text("cidade").notNull(),
  },
  (t) => [index("filiais_regiao_idx").on(t.regiao)],
);

export const membrosEquipe = crp.table(
  "equipe",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nome: text("nome").notNull(),
    equipe: equipeEnum("equipe").notNull(),
    /** Só analistas de hub têm região. */
    regiao: text("regiao").references(() => regioes.codigo),
    ativo: boolean("ativo").notNull().default(true),
  },
  (t) => [check("equipe_regiao_do_hub", sql`(${t.equipe} = 'hub') = (${t.regiao} is not null)`)],
);

export const parceirosCarteira = crp.table("parceiros_carteira", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nome: text("nome").notNull(),
  /** RN-01: caixa, acento e espaços normalizados. */
  nomeNormalizado: text("nome_normalizado").notNull().unique(),
  regiao: text("regiao")
    .notNull()
    .references(() => regioes.codigo),
  cidadeHub: text("cidade_hub").notNull(),
  analistaHubId: integer("analista_hub_id")
    .notNull()
    .references(() => membrosEquipe.id),
  analistaCentralId: integer("analista_central_id")
    .notNull()
    .references(() => membrosEquipe.id),
});

/**
 * RN-04: a fase é coluna gerada pelo banco. A mesma regra existe em
 * `@orvalia/engine` (derivarFase) e um teste garante que as duas concordam.
 */
const FASE_SQL = sql`case
  when area = 'AUDITORIA' then 'EM_AUDITORIA'::crp.fase
  when area = 'TRIAGEM_FINANCEIRA' and status in ('ABERTO', 'RECUSADO') then 'TRIAGEM_FINANCEIRA'::crp.fase
  when area in ('CONFERENCIA_PAGAMENTOS', 'CONTAS_A_PAGAR', 'CONFERENCIA_FISCAL')
    and status in ('ABERTO', 'ENCERRADO', 'CONTESTADO') then 'CONCLUIDO'::crp.fase
  when area in ('RELACIONAMENTO_PARCEIRO', 'APOIO_RELACIONAMENTO')
    and status in ('ENCERRADO', 'CONTESTADO') then 'CONCLUIDO'::crp.fase
  else 'EM_TRATATIVA'::crp.fase
end`;

/** ADR-0003: um protocolo, um destino. Acompanhamento, arquivo e devoluções são filtros por `destino`. */
export const protocolos = crp.table(
  "protocolos",
  {
    protocolo: text("protocolo").primaryKey(),
    destino: destinoEnum("destino").notNull().default("acompanhamento"),
    base: baseEnum("base").notNull(),
    regiao: text("regiao")
      .notNull()
      .references(() => regioes.codigo),
    praca: text("praca").notNull(),
    parceiroId: integer("parceiro_id")
      .notNull()
      .references(() => parceirosCarteira.id),
    /** RN-08: área ou status em branco é quebra de regra, apontada e nunca preenchida pelo motor. */
    area: areaEnum("area"),
    status: statusEnum("status"),
    fase: faseEnum("fase").notNull().generatedAlwaysAs(FASE_SQL),
    valor: numeric("valor", { precision: 14, scale: 2 }).notNull(),
    dataDeposito: date("data_deposito").notNull(),
    dataEntrada: date("data_entrada"),
    dataInicio: date("data_inicio").notNull(),
    /** RN-05: gravada como valor no dia da conclusão. */
    dataConclusao: date("data_conclusao"),
    codigoRastreioAntigo: text("codigo_rastreio_antigo"),
    // RN-09: campos das equipes, os únicos que a aplicação pode alterar.
    analistaHub: text("analista_hub"),
    estagioHub: text("estagio_hub"),
    obsHub: text("obs_hub"),
    analistaCentral: text("analista_central"),
    estagioCentral: text("estagio_central"),
    obsCentral: text("obs_central"),
    /** Controle otimista de concorrência entre o motor e as equipes. */
    versao: bigint("versao", { mode: "number" }).notNull().default(1),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("protocolos_destino_regiao_idx").on(t.destino, t.regiao),
    index("protocolos_parceiro_idx").on(t.parceiroId),
    check(
      "protocolos_arquivo_tem_conclusao",
      sql`${t.destino} <> 'arquivo' or ${t.dataConclusao} is not null`,
    ),
    check(
      "protocolos_base_coerente_com_deposito",
      sql`(${t.base} = '2026' and extract(year from ${t.dataDeposito}) = 2026)
        or (${t.base} = '2024_2025' and extract(year from ${t.dataDeposito}) between 2024 and 2025)`,
    ),
    check("protocolos_valor_positivo", sql`${t.valor} > 0`),
    check(
      "protocolos_conclusao_apos_inicio",
      sql`${t.dataConclusao} is null or ${t.dataConclusao} >= ${t.dataInicio}`,
    ),
  ],
);
