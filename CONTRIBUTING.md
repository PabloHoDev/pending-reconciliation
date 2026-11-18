# Como contribuir

O projeto segue o fluxo de uma equipe de produto: tudo começa numa issue e entra na `main` por Pull Request.

## Fluxo

1. **Issue primeiro.** Toda mudança tem uma issue com o problema e o critério de pronto. Ela anda no quadro:
   Backlog → Em andamento → Em revisão → Feito.
2. **Branch a partir da `main` atualizada**, no formato `tipo/descricao-curta`:
   `feat/`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/`, `ci/`, `perf/`, `hotfix/`. Uma branch trata de um
   assunto só.
3. **Commits** em [Conventional Commits](https://www.conventionalcommits.org/pt-br/), em português, no imperativo
   e agrupados por assunto:

   ```
   feat(engine): aplica o funil de novos protocolos (RN-01)
   fix(web): impede o hub de editar protocolo de outra região
   ```

   Escopos usados: `engine`, `synth`, `db`, `web`, `analytics`, `ci`, `docs`, `adr`.

4. **Pull Request** com o template preenchido, `Closes #N` e o CI verde. A entrada é por _Squash and merge_, e a
   branch é apagada depois.
5. **Releases:** ao fechar um marco do [roteiro](docs/roadmap.md), sai uma tag SemVer (`v0.1.0`) com release notes.

## Regras que não se negociam

- **Só dados sintéticos.** Nenhum dado, nome, coluna ou status de sistema real entra no repositório, nem
  "anonimizado". Tudo vem de `packages/synth`.
- Nada de push direto na `main`, force-push em branch compartilhada nem `--no-verify`. Force-push só na própria
  branch, com `--force-with-lease`.
- Segredos só em variáveis de ambiente. `.env*` está no `.gitignore`, e o `.env.example` lista as variáveis sem
  valor. O CI roda o Gitleaks em todo PR. Um segredo exposto é tratado como vazado: revogar e gerar outro.
- Toda regra de negócio tem teste com o ID dela (`RN-xx`). Um bug corrigido ganha um teste que o reproduz.
- Uma mudança de decisão de arquitetura vem com um ADR em `docs/adr/NNNN-titulo.md`.

## Antes de cada push

O repositório é público. Antes de enviar uma branch:

- [ ] `npm run check` verde.
- [ ] Busca pelos termos da lista local (`.sensitive-terms.txt`, fora do Git) sem resultado nos arquivos alterados.
- [ ] Nenhum `.xlsx`, `.csv` ou log que não tenha saído do `packages/synth`.
- [ ] Notebooks com as saídas limpas ou geradas só a partir do sintético.
- [ ] Prints e GIFs só da aplicação rodando com dados sintéticos.

## Ambientes

| Ambiente        | Banco                | Deploy                |
| --------------- | -------------------- | --------------------- |
| Local           | PGlite em `.pglite/` | `npm run dev`         |
| Preview         | Branch Neon por PR   | Automático a cada PR  |
| Produção (demo) | Branch Neon `main`   | Só a partir da `main` |

Seed, testes e experimentos **nunca** rodam contra produção.
