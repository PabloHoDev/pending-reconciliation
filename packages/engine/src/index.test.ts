import { describe, expect, it } from "vitest";
import { VERSAO_REGRAS } from "./index.ts";

describe("engine", () => {
  it("expõe a versão das regras em SemVer", () => {
    expect(VERSAO_REGRAS).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
