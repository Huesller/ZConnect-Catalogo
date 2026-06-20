# Validacao da politica de preco por consultor

Data: 2026-06-20

## Resumo

O preco exibido no catalogo agora e sempre calculado em tempo de exibicao a partir do preco cheio Zetta com IPI.

O preco base nao e rebaixado pela politica do consultor no scraper. Ele permanece salvo no catalogo como:

- `price`
- `basePrice`
- `priceBase`
- `precoBase`
- `precoZetta`
- `precoCheio`

## Onde o preco base Zetta e salvo

O preco vem do campo oficial Zetta `detalhes.valorTotal`, lido em `scripts/generate-catalog.mjs` pela funcao `sanitizeZettaProduct`.

Na geracao, esse valor e gravado como preco cheio nos campos de base listados acima e seus labels (`basePriceLabel`, `precoBaseLabel`, `precoZettaLabel`, `precoCheioLabel`). O campo `sourcePricePolicy` continua apenas como metadado historico da origem, sem participar do calculo do preco exibido.

## Regra aplicada no runtime

Arquivo: `src/main.jsx`

- `getZettaBasePrice(product)` le o preco cheio a partir de `precoZetta`, `precoCheio`, `precoBase`, `priceBase`, `basePrice` ou `price`.
- `applyConsultantPrice(product, consultant)` calcula o preco exibido em tempo de exibicao.
- Cards, modal, carrinho, subtotal, WhatsApp e analytics usam o produto ja precificado em runtime.

Politicas:

| Consultor | Desconto | Multiplicador |
| --- | ---: | ---: |
| huesller | 45% | 0.55 |
| ney | 45% | 0.55 |
| francisco | 50% | 0.50 |
| representante | 50% | 0.50 |

Se a URL nao tiver `consultor`, a politica padrao e 45%.

## Consultor por URL

O consultor continua sendo lido da URL:

- `?consultor=huesller`
- `?consultor=ney`
- `?consultor=francisco`
- `?consultor=representante`

Trocar empresa nao altera o consultor, pois `changeCompany()` limpa apenas os dados da empresa/carrinho visual e nao altera a URL nem o estado de consultor. Refresh preserva o consultor quando o parametro continua na URL.

## Produto validado

Produto: ALMA PARACHOQUE DIANTEIRO FORD KA 1997 A 2001

Codigo: `355751`

Fabricacao: `RF0731`

Preco Zetta com IPI: `R$ 189,17`

Campos de base no catalogo regenerado:

| Campo | Valor |
| --- | ---: |
| `price` | 189.17 |
| `basePrice` | 189.17 |
| `priceBase` | 189.17 |
| `precoBase` | 189.17 |
| `precoZetta` | 189.17 |
| `precoCheio` | 189.17 |

## Resultado por consultor

| Consultor | Calculo | Preco exibido |
| --- | --- | ---: |
| huesller | 189.17 x 0.55 | R$ 104,04 |
| ney | 189.17 x 0.55 | R$ 104,04 |
| francisco | 189.17 x 0.50 | R$ 94,59 |
| representante | 189.17 x 0.50 | R$ 94,59 |

## Superficies validadas

- Card: usa `product.priceLabel || money(product.price)` apos `applyConsultantPrice`.
- Modal: usa `selectedProduct.priceLabel || money(selectedProduct.price)` apos `applyConsultantPrice`.
- Carrinho: recompoe cada item com `productById` precificado e usa `item.priceLabel || money(item.price)`.
- Subtotal: soma `item.price * item.qty`.
- WhatsApp: usa `item.priceLabel || money(item.price)` e `money(item.price * item.qty)`.
- Analytics: envia `price`, `displayedPrice`, `displayedPriceLabel`, `pricePolicy`, `pricePolicyLabel`, `priceMultiplier` e tambem os campos de preco base (`basePrice`, `priceBase`, `precoZetta`, `precoCheio`) em eventos de produto.

## Comandos executados

```bash
npm.cmd install
npm.cmd run scrape
npm.cmd run build
npm.cmd run dev
```

Resultados:

- `npm.cmd install`: concluido.
- `npm.cmd run scrape`: concluiu com 2.202 produtos vindos da fonte oficial Zetta e fallback `nao`.
- `npm.cmd run build`: concluido com sucesso.
- `npm.cmd run dev`: servidor Vite iniciado em `http://127.0.0.1:5173/`.

Observacao: o `npm install` reportou 2 vulnerabilidades existentes no audit (`1 moderate`, `1 high`). Nenhuma alteracao de dependencia foi feita para esta correcao.
