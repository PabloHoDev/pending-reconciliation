CREATE SCHEMA "audit";
--> statement-breakpoint
CREATE SCHEMA "crp";
--> statement-breakpoint
CREATE TYPE "audit"."modo_execucao" AS ENUM('simulacao', 'gravacao');--> statement-breakpoint
CREATE TYPE "audit"."situacao_execucao" AS ENUM('em_andamento', 'simulada', 'gravada', 'gravada_com_pendencia_painel', 'recusada', 'erro');--> statement-breakpoint
CREATE TYPE "crp"."area" AS ENUM('TRIAGEM_FINANCEIRA', 'APOIO_RELACIONAMENTO', 'RELACIONAMENTO_PARCEIRO', 'AUDITORIA', 'CONFERENCIA_PAGAMENTOS', 'CONTAS_A_PAGAR', 'CONFERENCIA_FISCAL');--> statement-breakpoint
CREATE TYPE "crp"."base" AS ENUM('2026', '2024_2025');--> statement-breakpoint
CREATE TYPE "crp"."destino" AS ENUM('acompanhamento', 'arquivo', 'devolucao');--> statement-breakpoint
CREATE TYPE "crp"."tipo_equipe" AS ENUM('hub', 'central');--> statement-breakpoint
CREATE TYPE "crp"."fase" AS ENUM('EM_AUDITORIA', 'TRIAGEM_FINANCEIRA', 'CONCLUIDO', 'EM_TRATATIVA');--> statement-breakpoint
CREATE TYPE "crp"."status" AS ENUM('ABERTO', 'RECUSADO', 'ENCERRADO', 'CONTESTADO');--> statement-breakpoint
CREATE TABLE "audit"."execucoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dia_negocio" date NOT NULL,
	"modo" "audit"."modo_execucao" NOT NULL,
	"situacao" "audit"."situacao_execucao" DEFAULT 'em_andamento' NOT NULL,
	"codigo_saida" integer,
	"iniciada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"terminada_em" timestamp with time zone,
	"extrato_sha256" text,
	"linhas_extrato" integer,
	"versao_motor" text NOT NULL,
	"versao_regras" text NOT NULL,
	"contagens" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tempos_ms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mensagem" text,
	CONSTRAINT "execucoes_sha256_formato" CHECK ("audit"."execucoes"."extrato_sha256" is null or "audit"."execucoes"."extrato_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "execucoes_termino_apos_inicio" CHECK ("audit"."execucoes"."terminada_em" is null or "audit"."execucoes"."terminada_em" >= "audit"."execucoes"."iniciada_em")
);
--> statement-breakpoint
CREATE TABLE "crp"."filiais" (
	"codigo" text PRIMARY KEY NOT NULL,
	"regiao" text NOT NULL,
	"cidade" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crp"."equipe" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "crp"."equipe_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"equipe" "crp"."tipo_equipe" NOT NULL,
	"regiao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "equipe_regiao_do_hub" CHECK (("crp"."equipe"."equipe" = 'hub') = ("crp"."equipe"."regiao" is not null))
);
--> statement-breakpoint
CREATE TABLE "crp"."parceiros_carteira" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "crp"."parceiros_carteira_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"nome_normalizado" text NOT NULL,
	"regiao" text NOT NULL,
	"cidade_hub" text NOT NULL,
	"analista_hub_id" integer NOT NULL,
	"analista_central_id" integer NOT NULL,
	CONSTRAINT "parceiros_carteira_nome_normalizado_unique" UNIQUE("nome_normalizado")
);
--> statement-breakpoint
CREATE TABLE "crp"."protocolos" (
	"protocolo" text PRIMARY KEY NOT NULL,
	"destino" "crp"."destino" DEFAULT 'acompanhamento' NOT NULL,
	"base" "crp"."base" NOT NULL,
	"regiao" text NOT NULL,
	"praca" text NOT NULL,
	"parceiro_id" integer NOT NULL,
	"area" "crp"."area",
	"status" "crp"."status",
	"fase" "crp"."fase" GENERATED ALWAYS AS (case
  when area = 'AUDITORIA' then 'EM_AUDITORIA'::crp.fase
  when area = 'TRIAGEM_FINANCEIRA' and status in ('ABERTO', 'RECUSADO') then 'TRIAGEM_FINANCEIRA'::crp.fase
  when area in ('CONFERENCIA_PAGAMENTOS', 'CONTAS_A_PAGAR', 'CONFERENCIA_FISCAL')
    and status in ('ABERTO', 'ENCERRADO', 'CONTESTADO') then 'CONCLUIDO'::crp.fase
  when area in ('RELACIONAMENTO_PARCEIRO', 'APOIO_RELACIONAMENTO')
    and status in ('ENCERRADO', 'CONTESTADO') then 'CONCLUIDO'::crp.fase
  else 'EM_TRATATIVA'::crp.fase
end) STORED NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"data_deposito" date NOT NULL,
	"data_entrada" date,
	"data_inicio" date NOT NULL,
	"data_conclusao" date,
	"codigo_rastreio_antigo" text,
	"analista_hub" text,
	"estagio_hub" text,
	"obs_hub" text,
	"analista_central" text,
	"estagio_central" text,
	"obs_central" text,
	"versao" bigint DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocolos_arquivo_tem_conclusao" CHECK ("crp"."protocolos"."destino" <> 'arquivo' or "crp"."protocolos"."data_conclusao" is not null),
	CONSTRAINT "protocolos_base_coerente_com_deposito" CHECK (("crp"."protocolos"."base" = '2026' and extract(year from "crp"."protocolos"."data_deposito") = 2026)
        or ("crp"."protocolos"."base" = '2024_2025' and extract(year from "crp"."protocolos"."data_deposito") between 2024 and 2025)),
	CONSTRAINT "protocolos_valor_positivo" CHECK ("crp"."protocolos"."valor" > 0),
	CONSTRAINT "protocolos_conclusao_apos_inicio" CHECK ("crp"."protocolos"."data_conclusao" is null or "crp"."protocolos"."data_conclusao" >= "crp"."protocolos"."data_inicio")
);
--> statement-breakpoint
CREATE TABLE "crp"."regioes" (
	"codigo" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	CONSTRAINT "regioes_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
ALTER TABLE "crp"."filiais" ADD CONSTRAINT "filiais_regiao_regioes_codigo_fk" FOREIGN KEY ("regiao") REFERENCES "crp"."regioes"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crp"."equipe" ADD CONSTRAINT "equipe_regiao_regioes_codigo_fk" FOREIGN KEY ("regiao") REFERENCES "crp"."regioes"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crp"."parceiros_carteira" ADD CONSTRAINT "parceiros_carteira_regiao_regioes_codigo_fk" FOREIGN KEY ("regiao") REFERENCES "crp"."regioes"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crp"."parceiros_carteira" ADD CONSTRAINT "parceiros_carteira_analista_hub_id_equipe_id_fk" FOREIGN KEY ("analista_hub_id") REFERENCES "crp"."equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crp"."parceiros_carteira" ADD CONSTRAINT "parceiros_carteira_analista_central_id_equipe_id_fk" FOREIGN KEY ("analista_central_id") REFERENCES "crp"."equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crp"."protocolos" ADD CONSTRAINT "protocolos_regiao_regioes_codigo_fk" FOREIGN KEY ("regiao") REFERENCES "crp"."regioes"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crp"."protocolos" ADD CONSTRAINT "protocolos_parceiro_id_parceiros_carteira_id_fk" FOREIGN KEY ("parceiro_id") REFERENCES "crp"."parceiros_carteira"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "execucoes_dia_idx" ON "audit"."execucoes" USING btree ("dia_negocio");--> statement-breakpoint
CREATE UNIQUE INDEX "execucoes_uma_gravacao_por_dia" ON "audit"."execucoes" USING btree ("dia_negocio") WHERE "audit"."execucoes"."modo" = 'gravacao' and "audit"."execucoes"."situacao" in ('gravada', 'gravada_com_pendencia_painel');--> statement-breakpoint
CREATE INDEX "filiais_regiao_idx" ON "crp"."filiais" USING btree ("regiao");--> statement-breakpoint
CREATE INDEX "protocolos_destino_regiao_idx" ON "crp"."protocolos" USING btree ("destino","regiao");--> statement-breakpoint
CREATE INDEX "protocolos_parceiro_idx" ON "crp"."protocolos" USING btree ("parceiro_id");