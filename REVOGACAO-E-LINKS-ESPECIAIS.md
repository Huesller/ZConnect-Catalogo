# Links especiais — geração 3

## Resultado desta versão

- A rota antiga `/o/{cliente}/{codigo}` não é mais reconhecida pelo catálogo e deve continuar bloqueada no Vercel Firewall.
- A rota nova é `/oferta/{cliente}/{codigo}`.
- Tokens da geração antiga são rejeitados pelo backend.
- O painel não contém chave privada. A assinatura e os limites comerciais são validados no servidor.
- O histórico local usa uma área nova; os links antigos não aparecem como ativos no painel atualizado.

## Configuração obrigatória na Vercel

Em `Settings > Environment Variables`, crie:

1. `OFFER_ADMIN_SECRET`: uma chave exclusiva com pelo menos 32 caracteres. Essa mesma chave será digitada no painel local ao gerar ofertas.
2. `OFFER_LINK_GENERATION`: use `2026-08-18-reset-1` nesta publicação.

Aplique as duas variáveis a Production e faça um novo deploy. Não coloque o valor real de `OFFER_ADMIN_SECRET` no código, no ZIP ou no histórico do navegador.

## Ordem segura de publicação

1. Mantenha a regra `/o/ → Negar` ativa.
2. Configure as duas variáveis na Vercel.
3. Publique esta versão do catálogo.
4. Abra `PAINEL-COMERCIAL-OFERTAS-ASSINADAS.html` desta entrega.
5. Digite a mesma `OFFER_ADMIN_SECRET` configurada na Vercel.
6. Gere uma oferta de teste.
7. Confirme que o endereço começa com `https://catalogo-zautomotiva.vercel.app/oferta/`.
8. Teste o link novo em janela anônima.
9. Teste um link antigo `/o/` e confirme que continua bloqueado.

Não desative a regra do Firewall de `/o/`; ela não interfere na nova rota `/oferta/`.

## Como zerar novamente todos os links novos

1. Troque `OFFER_LINK_GENERATION` por um novo identificador, por exemplo `2026-09-reset-2`.
2. Faça um novo deploy.
3. Todos os links da geração anterior serão recusados.
4. O mesmo painel continuará gerando links válidos da nova geração.

Trocar `OFFER_ADMIN_SECRET` também invalida todos os links existentes, mas deve ser reservado para suspeita de vazamento da chave de acesso.

## Rollback de emergência

Se houver falha após a publicação, crie temporariamente outra regra de Firewall `Request Path começa com /oferta/ → Negar`. Isso bloqueia apenas os novos links e mantém o catálogo normal funcionando. Depois, restaure o deployment anterior na Vercel.
