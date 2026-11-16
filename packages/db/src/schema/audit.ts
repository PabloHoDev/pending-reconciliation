import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { MODOS_EXECUCAO, SITUACOES_EXECUCAO } from "./dominio.ts";

export const audit = pgSchema("audit");

export const modoExecucaoEnum = audit.enum("modo_execucao", MODOS_EXECUCAO);
export const situacaoExecucaoEnum = audit.enum("situacao_execucao", SITUACOES_EXECUCAO);

export const execucoes = audit.table(
  "execucoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    diaNegocio: date("dia_negocio").notNull(),
    modo: modoExecucaoEnum("modo").notNull(),
    situacao: situacaoExecucaoEnum("situacao").notNull().default("em_andamento"),
    codigoSaida: integer("codigo_saida"),
    iniciadaEm: timestamp("iniciada_em", { withTimezone: true }).notNull().defaultNow(),
    terminadaEm: timestamp("terminada_em", { withTimezone: true }),
    extratoSha256: text("extrato_sha256"),
    linhasExtrato: integer("linhas_extrato"),
    versaoMotor: text("versao_motor").notNull(),
    versaoRegras: text("versao_regras").notNull(),
    contagens: jsonb("contagens").$type<Record<string, number>>().notNull().default({}),
    temposMs: jsonb("tempos_ms").$type<Record<string, number>>().notNull().default({}),
    mensagem: text("mensagem"),
  },
  (t) => [
    index("execucoes_dia_idx").on(t.diaNegocio),
    /** Idempotência: no máximo uma gravação concluída por dia de negócio. */
    uniqueIndex("execucoes_uma_gravacao_por_dia")
      .on(t.diaNegocio)
      .where(
        sql`${t.modo} = 'gravacao' and ${t.situacao} in ('gravada', 'gravada_com_pendencia_painel')`,
      ),
    check(
      "execucoes_sha256_formato",
      sql`${t.extratoSha256} is null or ${t.extratoSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "execucoes_termino_apos_inicio",
      sql`${t.terminadaEm} is null or ${t.terminadaEm} >= ${t.iniciadaEm}`,
    ),
  ],
);
