# Publicação — ordenação por estoque e demanda

## Ordem obrigatória

1. Abra o projeto do Google Apps Script usado pelo Analytics.
2. Substitua o código pelo arquivo `GOOGLE_APPS_SCRIPT_V3_CLIENTES.js` do pacote Analytics 12.2.
3. Salve e acesse **Implantar > Gerenciar implantações**.
4. Edite a implantação ativa, selecione **Nova versão** e confirme a implantação.
5. Valide no navegador: `URL_DO_APPS_SCRIPT?action=product_rankings_public&days=30`.
6. Confirme que a resposta contém `"ok":true` e os grupos `popular`, `added` e `quoted`.
7. Publique o Catálogo 12.5 na Vercel.
8. Teste o Catálogo em janela anônima e confirme a ordenação padrão por **Maior estoque**.
9. Teste as opções **Mais procurados**, **Mais cotados**, **Mais adicionados** e **Nome · A–Z**.
10. Faça uma busca por produto e confirme que o item mais compatível continua aparecendo antes dos demais.

## Variável necessária no Catálogo

- `ZCONNECT_ANALYTICS_TARGET_URL`: URL da implantação ativa do Google Apps Script.

Não use variável `VITE_` para essa URL no novo proxy. Nenhuma variável de preço ou política comercial foi criada ou alterada.

## Comportamento de contingência

Se o Analytics estiver temporariamente indisponível, o Catálogo continua funcionando e mantém **Maior estoque** e **Nome · A–Z**. As opções dependentes de demanda ficam indisponíveis até a resposta voltar.

## Analytics na Vercel

A publicação do frontend Analytics 12.2 pode ser feita para manter a versão do projeto sincronizada, mas não é necessária para ativar o ranking. Para esta funcionalidade, os componentes obrigatórios são o novo Apps Script e o Catálogo 12.5.
