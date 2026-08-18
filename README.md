# Z Connect Catálogo 12.7.3

Catálogo online validado da Z Automotiva, integrado ao Z Connect Comercial por eventos, reservas e snapshots de estoque.

## Instalação

1. Execute `npm install`.
2. Copie `.env.example` para `.env.local` e preencha as variáveis.
3. Execute `npm test` e `npm run build`.
4. Publique na Vercel.

## Imagens próprias

Execute `IMPORTAR-IMAGENS.bat` para vincular uma pasta de fotos pelo código interno dos produtos. O processo gera o build e preserva as imagens locais nas próximas atualizações do Zetta.

Consulte `IMPORTACAO-DE-IMAGENS.md` para o passo a passo.

## Links dos consultores

- Almir: `https://catalogo-zautomotiva.vercel.app/index.html?consultor=almir`
- Gabriel Zatt: `https://catalogo-zautomotiva.vercel.app/index.html?consultor=gabriel`

Os dois utilizam a mesma política comercial de Ney e Huesller: desconto-base de 45%. Os números de WhatsApp ficam associados aos respectivos links e ambos também estão disponíveis no painel de valores especiais.

## Integração comercial

Após o build, `scripts/sync-catalog-analytics.mjs` envia ao sistema comercial somente código, descrição, marca, estoque e presença de imagem. Preços e descontos não são enviados.

Variáveis necessárias:

- `ZCONNECT_ANALYTICS_TARGET_URL`: URL do Web App do Google Apps Script.
- `CATALOG_SYNC_TOKEN`: mesmo token configurado no Apps Script e no Z Connect Comercial.

Consulte `PUBLICACAO-CATALOGO.md` antes de publicar.

## Ofertas especiais protegidas

- Os links antigos em `/o/` permanecem bloqueados pelo Firewall.
- Os novos links são gerados em `/oferta/{cliente}/{codigo}`.
- A assinatura é feita somente no backend; o painel HTML não contém chave privada.
- Os consultores não digitam senha ou chave no painel.
- A validade padrão continua em 7 dias, com opções de 24 horas, 3, 7, 15 e 30 dias.
- A opção `Permanente — sem vencimento automático` mantém a condição ativa até uma revogação administrativa.
- Links permanentes também são invalidados se `OFFER_LINK_GENERATION` ou `OFFER_SIGNING_SECRET` forem trocados.
- Esta versão funciona sem criar novas variáveis na Vercel.
- `OFFER_SIGNING_SECRET` e `OFFER_LINK_GENERATION` são opcionais e servem somente para uma futura troca de geração.

Consulte `REVOGACAO-E-LINKS-ESPECIAIS.md` para publicar, testar e revogar uma geração.
