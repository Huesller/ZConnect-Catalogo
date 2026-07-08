# Estoque no catálogo

## O que foi alterado

O frontend passa a exibir o estoque de cada peça de forma discreta:

- `Estoque: 12 un.` quando existir uma quantidade positiva no produto.
- `Consultar estoque` quando o campo estiver ausente, vazio, zero ou inválido.

A exibição foi adicionada no card do produto e no modal de detalhes.

## Campos aceitos no JSON final

O frontend procura a quantidade nesta ordem:

1. `stock`
2. `stockQty`
3. `estoque`
4. `saldo`
5. `quantidade`

## Geração do catálogo

O arquivo `scripts/generate-catalog.mjs` foi ajustado para tentar capturar automaticamente campos de estoque vindos do Zetta, incluindo nomes relacionados a:

- estoque
- saldo
- quantidade
- qtd / qtde
- disponível
- stock
- inventory

Quando nenhum campo de quantidade é encontrado, o gerador mantém o produto disponível e grava o estoque como `null`.

## Comportamento comercial

O estoque é apenas informativo.

Esta alteração não bloqueia:

- compra
- carrinho
- WhatsApp
- busca
- preço
- analytics
- modal de identificação

## Validação recomendada

Rodar:

```bash
npm run update-catalog
npm run build
```

Observação: o comando `npm run update-catalog` depende do acesso ao sistema Zetta. Se o Zetta estiver inacessível no ambiente local, rode novamente em uma máquina com acesso à internet/rede liberada.

## Correção de casas decimais do estoque

O estoque vindo do Zetta em formato decimal, como `27,0000`, agora é tratado como quantidade inteira de unidade.

Exemplos:
- `27,0000` → `27 un.`
- `1.300,0000` → `1300 un.`
- `27.0000` → `27 un.`
- `0,0000` → `Consultar estoque`

Essa correção foi aplicada tanto na geração do catálogo quanto na leitura defensiva do frontend.
