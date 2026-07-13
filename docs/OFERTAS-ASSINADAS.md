# Ofertas comerciais assinadas

## Regra preservada

Esta build não altera a política comercial:

- Huesller e Ney: 45% de desconto-base.
- Francisco e Representante: 50% de desconto-base.
- A condição especial soma pontos percentuais ao desconto-base.
- O desconto final continua limitado a 95%.
- Valores com e sem IPI usam o mesmo multiplicador final.

Exemplo: política-base de 45% + adicional de 5% = condição final de 50% sobre o valor cheio Zetta.

## Novo fluxo

O arquivo `PAINEL-COMERCIAL-OFERTAS-ASSINADAS.html` gera um payload compacto e assina o conteúdo com ECDSA P-256. O catálogo valida a assinatura antes de usar cliente, consultor, desconto ou validade.

Se qualquer caractere do payload ou da assinatura for alterado, a condição especial é rejeitada e o catálogo segue com a condição comercial normal.

## Compatibilidade temporária

Links antigos sem assinatura continuam aceitos até 12/08/2026, respeitando a validade gravada no próprio link. Depois desse período, somente links assinados serão aceitos.

## Segurança operacional

- Não enviar o arquivo do painel a clientes.
- Enviar somente o link gerado.
- Se o arquivo do painel for exposto, gerar um novo par de chaves e republicar o catálogo.
- O histórico do painel permanece apenas no navegador/dispositivo local.

## Integração com Analytics

O painel registra `special_offer_created` e o catálogo registra `special_offer_opened`. Os eventos carregam o identificador da oferta, cliente, consultor, adicional, validade e estado da assinatura.

Para a planilha armazenar esses novos campos, copie a versão entregue de `ZConnect-Analytics/GOOGLE_APPS_SCRIPT_V3_CLIENTES.js` para o projeto do Google Apps Script e publique uma nova implantação. A URL pública deve continuar a mesma; não é necessário alterar o painel.
