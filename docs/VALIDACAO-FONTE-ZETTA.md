# Validacao da fonte Zetta

Data da validacao: 2026-06-20

## Resultado

`npm run scrape` e `npm run estoque` agora usam os links oficiais Zetta como fonte de produtos, precos com IPI e disponibilidade. A fonte local `legacy/CatalogoPremium/catalogo-gerado/catalogo-completo.json` nao e usada no fluxo padrao.

Se a fonte Zetta falhar, o comando falha com o link/pagina que quebrou. O fallback legado so pode ser acionado explicitamente com `ZCONNECT_ALLOW_LEGACY_FALLBACK=1`; ele nao foi usado nesta validacao.

## Links acessados

| Marca | Catalogo | Link oficial | Paginas | Produtos |
| --- | --- | --- | ---: | ---: |
| RIDA | 1438 | https://sistema.zettabrasil.com.br/siggma/catalogos/200-3/id/1438 | 43 | 424 |
| RETOV | 1436 | https://sistema.zettabrasil.com.br/siggma/catalogos/200-3/id/1436 | 64 | 636 |
| TYC | 1494 | https://sistema.zettabrasil.com.br/siggma/catalogos/200-3/id/1494 | 37 | 366 |
| TYC | 1493 | https://sistema.zettabrasil.com.br/siggma/catalogos/200-3/id/1493 | 23 | 221 |
| Z AUTO | 1437 | https://sistema.zettabrasil.com.br/siggma/catalogos/200-3/id/1437 | 56 | 555 |

## Totais gerados

- Total em `public/data/catalog.v5.json`: 2202 produtos.
- Total em `public/data/catalog.search.json`: 2202 produtos.
- Total em `public/data/meta.json`: 2202 produtos.
- Fallback usado: nao.
- Produtos com fonte fora de `sistema.zettabrasil.com.br`: 0.
- Produtos sem codigo, descricao, preco positivo ou disponibilidade marcada: 0.
- Chaves duplicadas por `marca + codigo + codigo de fabricacao`: 0.

## Politica por consultor

- `huesller`: politica 45%.
- `ney`: politica 45%.
- `francisco`: politica 50%.
- `representante`: politica 50%.

## Scripts

- `npm run scrape`: executa `generate-catalog` nos links oficiais e depois `generate-search-index`.
- `npm run estoque`: alias seguro para `update-catalog`, portanto tambem atualiza pelos links oficiais.
- `generate-catalog.mjs`: nao reaproveita `public/data/catalog.v5.json` e nao usa legado silenciosamente.

## Validacao executada

- `npm.cmd install`: concluido; dependencias ja estavam atualizadas.
- `npm.cmd run scrape`: concluido; 2202 produtos gerados e indice de busca atualizado.
- `npm.cmd run estoque`: concluido; confirmou o mesmo fluxo dos links oficiais.
- `npm.cmd run build`: concluido com Vite 5.4.21; build final gerado em `dist/`.
- `npm.cmd run dev`: iniciado em `http://127.0.0.1:5177/`, retornou HTTP 200 e foi encerrado.

## Arquivos finais

- `public/data/catalog.v5.json`
- `public/data/catalog.search.json`
- `public/data/meta.json`
- `public/data/consultants.json`

## Riscos restantes

- Os links Zetta entregam os dados em JSON embutido no HTML; se a estrutura da pagina mudar, o scraper deve ser ajustado.
- A geracao depende da disponibilidade de `https://sistema.zettabrasil.com.br` no momento do comando.
- `npm install` reportou 2 vulnerabilidades de auditoria do npm, sendo 1 moderada e 1 alta; corrigir pode exigir atualizacao de dependencias fora deste P0.
- As imagens continuam referenciando URLs do Zetta, entao a exibicao delas tambem depende do servidor de origem.
