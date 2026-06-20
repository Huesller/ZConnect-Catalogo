# Sprint 0 - Auditoria e Limpeza Tecnica

Data: 2026-06-20

## Status geral

Status: aprovado com riscos documentados.

- `npm install` validado no Catalogo e no Analytics usando `npm.cmd install`.
- `npm run build` validado no Catalogo e no Analytics.
- `package-lock.json` dos dois projetos foi regenerado sem URLs de registry interno e sem specs `latest`.
- Catalogo validado: JSONs parseiam, indice de busca bate com o catalogo, sem duplicatas criticas e sem campos obrigatorios faltantes.
- Analytics validado: build passa, Apps Script passa em `node --check`, Vercel configurado.
- Arquivos gerados/legados removidos.
- Comportamento funcional preservado; alteracoes funcionais foram evitadas.

## Erros encontrados

1. `npm` direto no PowerShell falhou por ExecutionPolicy:
   - erro: `npm.ps1 cannot be loaded because running scripts is disabled on this system`.
   - validacao feita com `npm.cmd`, que e o executavel correto para este ambiente Windows.

2. Primeiro `npm.cmd install` falhou tentando gravar cache/log em:
   - `C:\Users\AXION\AppData\Local\npm-cache`
   - no sandbox, esse caminho nao era gravavel.
   - solucao de validacao: `npm_config_cache` apontado para `work/npm-cache`.

3. `package-lock.json` antigo do Catalogo estava contaminado por URLs de registry interno:
   - `packages.applied-caas-gateway1.internal.api.openai.org/artifactory/...`
   - isso causava `EACCES`/`ETIMEDOUT` durante install fora desse ambiente.
   - solucao: remover lock antigo e regenerar contra `https://registry.npmjs.org/`.

4. `ZConnect-Analytics/package.json` usava `"latest"` para dependencias criticas:
   - `vite`, `react`, `react-dom`, `typescript`, `lucide-react`, `@vitejs/plugin-react`.
   - isso tornava o install nao reproduzivel e podia puxar majors incompatíveis.
   - solucao: pinagem conservadora em React 18, Vite 5 e lucide-react 0.468.

5. `node_modules` e `dist` estavam presentes no zip.

6. O Catalogo tinha codigo React/TSX antigo nao usado pelo entrypoint real `src/main.jsx`.

7. Nao existem scripts `lint` ou `test` em nenhum dos dois projetos.

## Arquivos removidos

Catalogo:

- `BUILD_VALIDADO.txt`
- `README_DEVKIT.md`
- `src/App.tsx`
- `src/analytics/track.js`
- `src/components/Filters.tsx`
- `src/components/Header.tsx`
- `src/components/ProductCard.tsx`
- `src/components/ProductModal.tsx`
- `src/components/SearchHero.tsx`
- `src/components/SidebarCart.tsx`
- `src/utils/search.js`
- `node_modules/`
- `dist/` gerado durante a validacao

Analytics:

- `.env`
- `README-ANALYTICS-V5.md`
- `CHANGELOG-V7.md`
- `CHANGELOG-V8.md`
- `node_modules/`
- `dist/` gerado durante a validacao

## Arquivos alterados

Catalogo:

- `package.json`
  - removido `@vitejs/plugin-react`, que nao era usado por nenhum `vite.config`.
- `package-lock.json`
  - regenerado limpo com registry publico.
- `src/main.jsx`
  - endpoint de analytics passou a aceitar `import.meta.env.VITE_ZCONNECT_ANALYTICS_URL` com fallback para a URL atual.
- `vercel.json`
  - adicionado com `buildCommand`, `outputDirectory` e `framework`.
- `docs/SPRINT-0-RELATORIO.md`
  - relatorio desta auditoria.

Analytics:

- `package.json`
  - removidos `latest`, `typescript` e `@vitejs/plugin-react`.
  - dependencias pinadas: `react`, `react-dom`, `lucide-react`.
  - `vite` movido para `devDependencies`.
- `package-lock.json`
  - regenerado limpo com registry publico.
- `src/main.jsx`
  - endpoint de analytics passou a aceitar `import.meta.env.VITE_ANALYTICS_API_URL` com fallback para a URL atual.
- `.gitignore`
  - duplicacao removida e `.env.example` liberado.
- `CHANGELOG.md`
  - criado consolidando V7 e V8.

## Causa provavel do problema npm

A causa principal era combinada:

- ambiente Windows bloqueando `npm.ps1` via ExecutionPolicy;
- cache padrao do npm fora da area gravavel do sandbox;
- lock antigo do Catalogo com URLs de registry interno nao acessivel;
- Analytics usando `"latest"` em dependencias criticas, tornando o install instavel.

A correcao tecnica do workspace foi regenerar os locks com registry publico e substituir `"latest"` por versoes reproduziveis.

## Comandos executados

- `Expand-Archive`
- `rg --files`
- `git status --short`
- `node -e ...` para validar JSON/package locks
- `node --check scripts/generate-catalog.mjs`
- `node --check scripts/generate-search-index.mjs`
- `node --check GOOGLE_APPS_SCRIPT_V2_DOGET.js`
- `node --check GOOGLE_APPS_SCRIPT_V3_CLIENTES.js`
- `npm.cmd install --registry=https://registry.npmjs.org/ --no-audit --no-fund --prefer-online --fetch-retries=2 --fetch-timeout=60000`
- `npm.cmd install`
- `npm.cmd run build`
- `npm.cmd audit --json`

Observacao: `npm.cmd` foi usado porque `npm` direto no PowerShell chamava `npm.ps1`, bloqueado pela ExecutionPolicy local.

## Resultado do npm install

Catalogo:

- comando final: `npm.cmd install`
- resultado: `up to date, audited 17 packages in 2s`
- observacao: 2 vulnerabilidades reportadas pelo npm audit: 1 moderada e 1 alta.

Analytics:

- comando final: `npm.cmd install`
- resultado: `up to date, audited 18 packages in 2s`
- observacao: 2 vulnerabilidades reportadas pelo npm audit: 1 moderada e 1 alta.

## Resultado do build

Catalogo:

- comando: `npm.cmd run build`
- resultado: OK
- Vite: `v5.4.21`
- modulos transformados: 25
- tempo: `3.95s`
- output: `dist/`

Analytics:

- comando: `npm.cmd run build`
- resultado: OK
- Vite: `v5.4.21`
- modulos transformados: 1575
- tempo: `11.70s`
- output: `dist/`

## Validacao do catalogo

- Arquivos JSON avaliados:
  - `public/data/catalog.v5.json`
  - `public/data/catalog.search.json`
  - `public/data/consultants.json`
  - `public/data/meta.json`
- Produtos: 2223
- Erros de parse JSON: 0
- Campos obrigatorios faltantes: 0
- Duplicatas por `brand|code|fabCode`: 0
- Imagens locais inexistentes: 0
- Indice de busca:
  - `catalog.search.json.total`: 2223
  - itens no indice: 2223
  - status: consistente
- Consultores: 4
- Marcas:
  - RETOV: 642
  - RIDA: 425
  - TYC: 590
  - Z AUTO: 566

## Validacao do Analytics

- `src/main.jsx` compila no build Vite.
- `GOOGLE_APPS_SCRIPT_V2_DOGET.js`: sintaxe OK.
- `GOOGLE_APPS_SCRIPT_V3_CLIENTES.js`: sintaxe OK.
- `VITE_ANALYTICS_API_URL` e opcional; existe fallback hardcoded para preservar funcionamento atual.
- `.env` local removido do workspace limpo.
- `vercel.json` existente e valido.

## Validacao Vercel

Catalogo:

- `vercel.json` adicionado.
- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`
- `framework`: `vite`
- variavel opcional: `VITE_ZCONNECT_ANALYTICS_URL`
- redirects/rewrites: nenhum configurado

Analytics:

- `vercel.json` existente.
- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`
- `framework`: `vite`
- variavel opcional: `VITE_ANALYTICS_API_URL`
- redirects/rewrites: nenhum configurado

## Riscos restantes

- `npm audit` aponta vulnerabilidades em `vite/esbuild`.
  - o fix automatico sugerido exige upgrade major para `vite@8.0.16`.
  - nao foi aplicado para evitar troca de major no Sprint 0.
- Nao existem scripts `lint` e `test`.
- O Analytics ainda tem metadados historicos com V7 no `package.json`/`VERSION.json`, enquanto README/UI indicam V8.
- Textos de interface/documentacao exibem sinais de mojibake (`Ã¡`, `Ã§`, etc.). Isso nao quebra build, mas deve ser normalizado em UTF-8 em sprint proprio.
- O workspace extraido tem dois projetos independentes, sem `package.json` na raiz agregadora. O deploy deve selecionar explicitamente a raiz do projeto desejado.

## Recomendacoes para Sprint 1

1. Criar scripts `lint`, `test` e `validate:data`.
2. Avaliar upgrade controlado para Vite 8 e definir versao Node alvo para Catalogo e Analytics.
3. Normalizar encoding dos arquivos para UTF-8.
4. Padronizar metadados do Analytics para V8 ou versao atual real.
5. Criar `.env.example` para as URLs opcionais de analytics.
6. Adicionar schema de catalogo para validar campos antes do build.
7. Decidir se o workspace sera monorepo com raiz unica ou dois projetos Vercel separados.

## Commit final sugerido

`sprint-0-auditoria-limpeza-workspace`
