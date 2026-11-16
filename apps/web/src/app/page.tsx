import { VERSAO_REGRAS } from "@orvalia/engine";

export default function Inicio() {
  return (
    <main>
      <h1>Orvalia · Conciliação CRP</h1>
      <p>
        Motor de conciliação diária de repasses pendentes da Orvalia Distribuição, uma empresa
        fictícia. Tudo roda com dados sintéticos.
      </p>
      <p>Em construção. As telas chegam na Etapa 6 do roteiro.</p>
      <p className="rodape">Regras do motor: versão {VERSAO_REGRAS}</p>
    </main>
  );
}
