# Catálogo — Refino Final para LOCK

## Alterações

- Placeholder da busca ajustado para exemplos comerciais reais.
- Busca sem resultado agora oferece botão "Solicitar ao consultor".
- Sugestões comerciais também oferecem contato direto com consultor.
- Novo evento Analytics: `busca_sem_resultado_lead`.
- Mensagem do WhatsApp formatada como cotação profissional Z Connect.
- Carrinho exibe status "Pronto para orçamento" quando possui itens.
- Favoritos ativos recebem destaque visual premium.
- Cards receberam hover mais refinado.

## Arquivos alterados

- `src/main.jsx`
- `src/styles.css`

## Validação recomendada

1. `npm install`
2. `npm run build`
3. `npm run dev`
4. Buscar termo sem resultado.
5. Clicar em "Solicitar ao consultor".
6. Validar WhatsApp.
7. Adicionar item ao carrinho.
8. Validar mensagem final no WhatsApp.
9. Validar evento `busca_sem_resultado_lead` no Analytics.

## Status

Sprint final de refinamento visual/comercial do catálogo pronta para validação.
