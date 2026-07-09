# Ajuste do link especial - Z Connect

## O que foi alterado

### Catálogo React/Vite
Arquivo alterado:
- `src/main.jsx`
- `src/styles.css`

Agora o catálogo reconhece link especial gerado pelo painel com parâmetros:
- `o`: token da oferta
- `consultor`: consultor responsável
- `cliente`: nome do cliente
- `tipo`: `discount` ou `increase`
- `expira`: data ISO de expiração

Também mantém compatibilidade com o teste antigo:
- `?cliente=Autopecas%20Silva&desconto=15&validade=7`

## Comportamento esperado

### Link normal
Sem parâmetros especiais:
- mantém modal de identificação
- mantém política de preço atual
- mantém analytics
- mantém carrinho, busca, WhatsApp e modal como estão

### Link especial válido
Com link gerado pelo painel:
- não abre o modal inicial
- salva o nome do cliente automaticamente
- mostra banner comercial de condição especial
- aplica o preço especial nos cards, modal, carrinho e WhatsApp
- não mostra a porcentagem do desconto para o cliente
- envia informações da condição especial para analytics

### Link especial expirado
- não libera a condição especial
- mostra aviso de expiração se o link tiver dados de oferta
- o cliente deve falar com o consultor para nova condição

## Como testar localmente

1. Abra a pasta do projeto.
2. Rode:

```bash
npm install
npm run build
npm run dev
```

3. Abra o link normal:

```text
http://localhost:5173/
```

Resultado esperado: modal aparece normalmente.

4. Abra um link especial de teste:

```text
http://localhost:5173/?consultor=huesller&cliente=Autopecas%20Silva&desconto=15&validade=7
```

Resultado esperado:
- sem modal
- banner para Autopecas Silva
- preço personalizado aplicado
- carrinho funcionando

5. Teste com painel:
- abra `painel-comercial-link-especial.html`
- em URL pública do catálogo, use `http://localhost:5173/`
- gere o link
- cole o link em aba anônima

## Publicação

Depois de testar:

```bash
npm run build
```

Publique normalmente na Vercel com seu processo atual.

