import type { NextConfig } from "next";

const config: NextConfig = {
  // Os pacotes do monorepo são consumidos direto do código-fonte TypeScript, sem build próprio.
  transpilePackages: ["@orvalia/engine", "@orvalia/db"],
  // Sem arquivos de instrução para ferramentas gerados pelo `next dev`.
  agentRules: false,
};

export default config;
