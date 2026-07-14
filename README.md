# ZConnect Catálogo

Catálogo B2B automotivo premium da Z Connect.

## Requisitos

- Node.js
- NPM
- Git

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Testes das políticas comerciais

```bash
npm test
```

Os testes congelam as políticas-base de 45% e 50%, a soma do adicional em pontos percentuais e o teto de 95%.

## Ofertas especiais assinadas

Abra localmente o arquivo:

```txt
PAINEL-COMERCIAL-OFERTAS-ASSINADAS.html
```

O painel é de uso interno e gera somente links que o catálogo consegue autenticar. Não envie o arquivo do painel a clientes.

## Atualização do catálogo

```bash
npm run update-daily
```

## Estoque automático no Analytics

O Catálogo envia um snapshot compacto (código, descrição, marca, estoque e presença de imagem) ao Analytics depois de cada build/publicação. Nenhum preço ou desconto faz parte dessa integração.

Na Vercel deste projeto, configure:

- `ZCONNECT_ANALYTICS_TARGET_URL`: URL `/exec` do Apps Script usado pelo Analytics.
- `CATALOG_SYNC_TOKEN`: exatamente o mesmo token configurado nas propriedades do Apps Script e na Vercel do Analytics.
- `VITE_JUNIOR_WHATSAPP`: WhatsApp do Junior no formato `55DDDNUMERO`. Enquanto essa variável não for definida, o link do Junior usa temporariamente o telefone comercial padrão `554733054400`.

Na máquina que executa `npm run update-daily`, use também `ZCONNECT_JUNIOR_WHATSAPP` com o mesmo número para que `consultants.json` seja regenerado corretamente.

Depois faça um novo deploy. O comando `npm run build` executa a sincronização automaticamente. Para reenviar manualmente:

```bash
npm run sync-analytics
```

## DevKit

Os comandos de rotina estão em:

```txt
dev/
```

Atalho principal:

```txt
ZCONNECT.bat
```

## Publicação

```txt
dev/PUBLICAR.bat
```

O deploy é feito automaticamente pela Vercel após o push no GitHub.
