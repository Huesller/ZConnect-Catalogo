# Links especiais — geração 3

## Resultado desta versão

- A rota antiga `/o/{cliente}/{codigo}` não é mais reconhecida pelo catálogo e deve continuar bloqueada no Vercel Firewall.
- A rota nova é `/oferta/{cliente}/{codigo}`.
- Tokens da geração antiga são rejeitados pelo backend.
- O painel não contém chave privada. A assinatura e os limites comerciais são validados no servidor.
- O painel não solicita senha ou chave; pode ser enviado diretamente aos consultores.
- O campo de validade oferece 24 horas, 3, 7, 15 e 30 dias, além de `Permanente — sem vencimento automático`.
- Permanente significa que o link não expira sozinho; ele ainda pode ser invalidado por uma troca administrativa de geração ou assinatura.
- O histórico local usa uma área nova; os links antigos não aparecem como ativos no painel atualizado.

## Configuração na Vercel

Não é necessário criar uma nova variável para publicar esta versão. A geração atual já está configurada no backend.

Mantenha somente a regra do Firewall já existente:

- campo: `Request Path`;
- operador: `Começa com`;
- valor: `/o/`;
- ação: `Negar`.

As variáveis `OFFER_SIGNING_SECRET` e `OFFER_LINK_GENERATION` continuam disponíveis como opções administrativas para uma futura troca de geração, mas não são exigidas agora e nunca são digitadas pelos consultores.

## Ordem segura de publicação

1. Mantenha a regra `/o/ → Negar` ativa.
2. Publique esta versão do catálogo.
3. Abra o painel Build 3.3 desta entrega.
4. Gere uma oferta de teste sem informar chave.
5. Confirme que o endereço começa com `https://catalogo-zautomotiva.vercel.app/oferta/`.
6. Teste o link novo em janela anônima.
7. Gere e teste uma segunda oferta com validade permanente.
8. Teste um link antigo `/o/` e confirme que continua bloqueado.

Não desative a regra do Firewall de `/o/`; ela não interfere na nova rota `/oferta/`.

## Como zerar novamente todos os links novos

1. Troque `OFFER_LINK_GENERATION` por um novo identificador, por exemplo `2026-09-reset-2`.
2. Faça um novo deploy.
3. Todos os links da geração anterior serão recusados.
4. O mesmo painel continuará gerando links válidos da nova geração.

Trocar `OFFER_SIGNING_SECRET` também invalida todos os links existentes. Os consultores não precisam conhecer essa variável.

Atualmente o painel não possui revogação individual. Um link permanente continua ativo até a geração ser zerada, a assinatura ser trocada, o registro deixar de existir ou a rota ser bloqueada administrativamente.

## Rollback de emergência

Se houver falha após a publicação, crie temporariamente outra regra de Firewall `Request Path começa com /oferta/ → Negar`. Isso bloqueia apenas os novos links e mantém o catálogo normal funcionando. Depois, restaure o deployment anterior na Vercel.
