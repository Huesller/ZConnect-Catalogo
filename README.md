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
