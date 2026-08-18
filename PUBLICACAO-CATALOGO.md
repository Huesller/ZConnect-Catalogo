# Publicação do Catálogo

1. Configure as variáveis indicadas no `.env.example` e na Vercel.
2. Mantenha ativa a regra do Firewall `Request Path começa com /o/ → Negar`.
3. Execute `npm test`.
4. Execute `npm run build`.
5. Confirme que o sincronizador informa envio bem-sucedido do snapshot quando as credenciais estão configuradas.
6. Publique na Vercel e valide busca, carrinho, cotação e identificação da empresa.
7. Abra o novo painel, informe `OFFER_ADMIN_SECRET` e gere um link de teste em `/oferta/`.
8. Confirme em janela anônima que o link novo funciona e que um link antigo `/o/` permanece bloqueado.

Esta limpeza não altera regras de preço, reserva, busca confirmada ou rastreamento comercial.
