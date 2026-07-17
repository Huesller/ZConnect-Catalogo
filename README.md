# Z Connect Catálogo 12.5.4

Catálogo online validado da Z Automotiva, integrado ao Z Connect Comercial por eventos, reservas e snapshots de estoque.

## Instalação

1. Execute `npm install`.
2. Copie `.env.example` para `.env.local` e preencha as variáveis.
3. Execute `npm test` e `npm run build`.
4. Publique na Vercel.

## Integração comercial

Após o build, `scripts/sync-catalog-analytics.mjs` envia ao sistema comercial somente código, descrição, marca, estoque e presença de imagem. Preços e descontos não são enviados.

Variáveis necessárias:

- `ZCONNECT_ANALYTICS_TARGET_URL`: URL do Web App do Google Apps Script.
- `CATALOG_SYNC_TOKEN`: mesmo token configurado no Apps Script e no Z Connect Comercial.

Consulte `PUBLICACAO-CATALOGO.md` antes de publicar.
