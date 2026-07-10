# Produtos sem estoque no catálogo

## Diagnóstico

O frontend já sabe exibir produtos sem estoque como **Reposição em breve**.

O ponto crítico estava na origem usada pelo `npm run update-catalog`: os links individuais dos catálogos não estavam usando o parâmetro público `p=true`, enquanto a tela pública do Zetta onde aparecem produtos zerados usa esse modo.

## Ajuste aplicado

- `scripts/catalog-source.json` agora usa URLs com `?p=true`.
- `scripts/generate-catalog.mjs` força `p=true` em todas as páginas buscadas.
- O gerador mantém `page=N` sem perder `p=true`.
- Itens isolados com preço inválido são ignorados com aviso, em vez de derrubar toda a atualização.
- Foi adicionada a auditoria `public/data/stock-audit.json`.

## Como validar

```bash
npm run update-catalog
npm run build
npm run dev
```

Depois abra:

```text
public/data/stock-audit.json
```

O campo importante é:

```json
{
  "outOfStock": 0
}
```

Se continuar `0`, o Zetta ainda não entregou itens zerados nessa fonte. Se vier maior que zero, o frontend já deve mostrar esses itens como **Reposição em breve**.
