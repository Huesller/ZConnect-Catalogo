# P0 - Analytics anti-bloqueador via API interna Vercel

## Objetivo

Reduzir bloqueios de navegador e extensoes no envio de analytics, evitando que o catalogo chame `script.google.com` como primeira tentativa.

## Novo fluxo

```txt
Catalogo -> /api/analytics -> Google Apps Script -> Google Sheets
```

## Implementacao

- Criada/ajustada a rota Vercel `api/analytics.js`.
- O frontend usa `VITE_ZCONNECT_ANALYTICS_URL` com fallback padrao para `/api/analytics`.
- O Apps Script direto permanece apenas como fallback posterior, nunca como primeira tentativa do catalogo.
- O payload atual foi preservado, incluindo `event`, `eventId`, `sessionId`, consultor, empresa, produto, pagina, user agent e demais campos ja enviados.
- Os eventos existentes foram preservados:
  - `page_view`
  - `search`
  - `search_no_results`
  - `product_open`
  - `add_to_cart`
  - `remove_from_cart`
  - `clear_cart`
  - `whatsapp_quote`

## API `/api/analytics`

A API:

- aceita `POST`;
- responde `OPTIONS` com `204`;
- valida payload minimo com `event`;
- aceita CORS apenas quando a origem tem o mesmo host da requisicao;
- usa `process.env.ZCONNECT_ANALYTICS_TARGET_URL`;
- usa fallback para a URL atual do Apps Script se a variavel nao estiver configurada;
- encaminha JSON para o Google Apps Script;
- retorna `200 { "ok": true }` mesmo se o Apps Script falhar, para nao quebrar a UX do catalogo;
- retorna erro apenas para metodo/origem/payload invalidos.

## Variaveis

`.env.example`:

```env
VITE_ZCONNECT_ANALYTICS_URL=/api/analytics
ZCONNECT_ANALYTICS_TARGET_URL=https://script.google.com/macros/s/AKfycbxcISxjVLPj5mBz0oem-5FrDjL0fOf2NtX6Ry5prry2AIWce5Tsn2NwRinB2tQKMs0T/exec
```

## Envio no navegador

- Primeira tentativa: `/api/analytics?action=track`.
- Usa `navigator.sendBeacon` quando disponivel.
- Fallback: `fetch` com `keepalive`.
- Fallback direto para `script.google.com`: somente se a tentativa interna nao puder ser enviada ou retornar erro no caminho `fetch`.
- Falhas continuam silenciosas para o usuario.

## Arquivos alterados

- `api/analytics.js`
- `src/main.jsx`
- `src/analytics/track.js`
- `docs/P0-ANALYTICS-ANTI-BLOQUEADOR.md`

## Validacao executada

Comandos executados:

```bash
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

Resultados:

- `npm.cmd install`: concluido; dependencias ja estavam atualizadas.
- `npm.cmd run build`: concluido com sucesso.
- `npm.cmd run dev`: servidor local ativo em `http://localhost:5173/`.
- Pagina local respondeu HTTP `200`.
- Teste isolado da API:
  - POST valido: `200 { "ok": true }`
  - payload invalido: `400 { "ok": false }`
  - falha simulada do upstream: `200 { "ok": true }`
  - OPTIONS: `204`

## Validacao pendente em ambiente real

Estas validacoes dependem do deploy/preview Vercel e do acesso real ao Google Sheets:

- Network do preview/producao mostrando `/api/analytics` como primeira tentativa.
- Confirmacao de escrita na aba `EVENTS`.
- Teste com Brave Shield ativo.
- Teste em Chrome normal contra o dominio final.
