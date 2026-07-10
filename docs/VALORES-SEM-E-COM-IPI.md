# Valores sem IPI e com IPI no catálogo

Alteração aplicada com escopo pequeno e seguro.

## O que mudou

- O frontend agora possui um bloco de preço com:
  - Valor sem IPI
  - Valor com IPI em destaque
- Em links especiais, os dois valores recebem o mesmo fator de condição especial.
- O valor original aparece riscado quando houver condição especial.
- O carrinho, WhatsApp, analytics, busca, identificação e modal continuam usando o preço principal do catálogo, ou seja, valor com IPI.

## Arquivos alterados

- `src/main.jsx`
- `src/styles.css`
- `scripts/generate-catalog.mjs`

## Campos esperados no JSON final

O gerador tenta salvar:

```json
{
  "price": 100,
  "priceWithIpi": 100,
  "priceWithoutIpi": 94,
  "precoComIpi": 100,
  "precoSemIpi": 94,
  "priceWithIpiLabel": "R$ 100,00",
  "priceWithoutIpiLabel": "R$ 94,00"
}
```

`price` continua sendo o valor com IPI para não quebrar carrinho, WhatsApp e totais.

## Validação

```bash
npm run update-catalog
npm run build
npm run dev
```

Se o Zetta não enviar o campo sem IPI em algum item, o frontend mostra `Consultar` no campo sem IPI e mantém o valor com IPI normalmente.
