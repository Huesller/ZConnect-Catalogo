# P0 Mobile, Acesso sem Identificação e Título

## Escopo

Correção P0 aplicada ao catálogo Z Automotiva com foco em:

- experiência mobile sem estouro horizontal;
- carrinho mobile como bottom sheet/modal;
- acesso ao catálogo sem obrigar identificação da empresa;
- analytics com `companyName` anônimo como `"Não identificado"`;
- título da aba como `CATÁLOGO Z AUTOMOTIVA`.

## Arquivos alterados

- `index.html`
- `src/main.jsx`
- `src/analytics/track.js`
- `src/styles.css`
- `docs/P0-MOBILE-LOGIN-TITLE.md`

## Mobile

- Removido estouro horizontal em `html`, `body`, `#root` e principais containers.
- Busca ajustada para ocupar 100% da largura disponível.
- Header e saudação da empresa passam a quebrar corretamente em telas pequenas.
- Filtros no mobile usam rolagem horizontal própria quando necessário.
- Cards ficam legíveis no mobile, com 1 coluna em telas estreitas e até 2 colunas quando houver espaço.
- Texto, preço, favorito e botões dos cards foram protegidos contra corte.
- Carrinho deixa de ficar lateral no mobile e passa a abrir como bottom sheet.
- Botão de WhatsApp permanece visível dentro do carrinho mobile.

## Login e nome da empresa

- O botão `X` do modal libera o catálogo mesmo sem nome informado.
- Empresa vazia não é salva em `localStorage.zconnect_company_name`.
- Ao fechar sem nome, é exibido o toast: `Que pena, queríamos saber quem é você 😊`.
- Analytics usa `"Não identificado"` quando não existe empresa salva.
- Ao informar empresa, o nome continua sendo salvo no localStorage e exibido na saudação.
- A opção de trocar/informar empresa foi mantida.

## Título da aba

- `index.html` define `<title>CATÁLOGO Z AUTOMOTIVA</title>`.
- `src/main.jsx` também aplica `document.title = 'CATÁLOGO Z AUTOMOTIVA'`.

## Preservações verificadas

- Consultores por URL:
  - `?consultor=huesller`
  - `?consultor=ney`
  - `?consultor=francisco`
  - `?consultor=representante`
- Política de preço:
  - `huesller` / `ney`: 45%
  - `francisco` / `representante`: 50%
- Preço em card, carrinho e WhatsApp.
- Busca e intervalo de ano.
- Carrinho e finalização pelo WhatsApp.
- Scraper e dados Zetta sem alteração.
- Visual do Analytics sem alteração.

## Validação executada

Comandos:

```bash
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

Testes realizados em navegador automatizado:

- desktop sem scroll horizontal;
- mobile `360x800`;
- mobile `390x844`;
- mobile `430x932`;
- fechar modal no `X` sem nome;
- informar empresa normalmente;
- trocar empresa;
- consultor `huesller`;
- consultor `francisco`;
- adicionar produto;
- abrir carrinho mobile;
- finalizar WhatsApp;
- comparar preço do mesmo produto entre `huesller` e `francisco`.

Resultado da comparação de preço validada:

- Produto: `338617 / 714`
- `huesller`: `R$ 37,20`
- `francisco`: `R$ 33,82`
- Política esperada preservada.

Observação: durante `npm.cmd install`, o npm reportou 2 vulnerabilidades já existentes no conjunto de dependências. Nenhum `audit fix` foi executado para não alterar dependências fora do escopo P0.
