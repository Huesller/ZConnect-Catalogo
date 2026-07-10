# Inteligência de Estoque

Implementação adicionada ao catálogo sem alterar regras de preço, carrinho para itens disponíveis, WhatsApp padrão ou links especiais.

## Regras visuais

- Estoque maior que 5: exibe `Estoque: X un.`
- Estoque entre 4 e 5: exibe `⚠ Poucas unidades: X un.`
- Estoque entre 1 e 3: exibe `🔥 Últimas unidades: X un.`
- Estoque 0: exibe `Reposição em breve`, deixa imagem fosca e troca o botão para `Tenho interesse`
- Estoque ausente: exibe `Consultar estoque`

## Produtos sem estoque

O gerador agora preserva estoque `0` em vez de transformar em `null`.

Quando o Zetta incluir produtos zerados na fonte do catálogo, eles passam a aparecer no frontend como reposição em breve.

## WhatsApp

Itens com estoque zero não entram no carrinho. O botão `Tenho interesse` abre o WhatsApp com uma mensagem de interesse em reposição.

## Analytics

Eventos adicionados:

- `view_out_of_stock_product`
- `view_low_stock_product`
- `add_to_cart_low_stock`
- `interest_out_of_stock`
- `stock_filter`

Todos mantêm consultor, link especial, produto, preço e status de estoque no payload.

## Reposição recente

Durante `npm run update-catalog`, o gerador compara o estoque anterior com o novo. Se um item estava zerado e voltou com estoque maior que zero, ele marca:

- `restocked: true`
- `reposicaoRecente: true`
- `recentlyRestocked: true`

O frontend exibe `🟢 Voltou ao estoque`.
