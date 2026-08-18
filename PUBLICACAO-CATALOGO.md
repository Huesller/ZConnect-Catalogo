# Publicação do Catálogo

1. Preserve as variáveis que já existem no projeto; esta versão não exige nenhuma variável nova.
2. Mantenha ativa a regra do Firewall `Request Path começa com /o/ → Negar`.
3. Execute `npm test`.
4. Execute `npm run build`.
5. Confirme que o sincronizador informa envio bem-sucedido do snapshot quando as credenciais estão configuradas.
6. Publique na Vercel e valide busca, carrinho, cotação e identificação da empresa.
7. Abra o novo painel Build 3.3 e gere um link com prazo em `/oferta/`; nenhuma chave será solicitada ao consultor.
8. Gere também um link `Permanente — sem vencimento automático` e confirme em janela anônima que o catálogo informa essa condição.
9. Confirme que um link antigo `/o/` permanece bloqueado.

Esta limpeza não altera regras de preço, reserva, busca confirmada ou rastreamento comercial.
Não é necessário criar nenhuma variável nova na Vercel para ativar os links `/oferta/` desta versão.
Também não é necessário criar regra adicional no Firewall para usar a opção permanente.
