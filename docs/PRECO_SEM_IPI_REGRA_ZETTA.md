# Correção definitiva de Valor sem IPI

Regra confirmada pelo debug do Zetta:

- `detalhes.valorTotal` = valor cheio com IPI.
- `detalhes.valorIpi` = valor monetário do IPI.
- O payload público não traz um campo separado de valor sem IPI.
- Portanto, o valor cheio sem IPI deve ser calculado por:

```text
valorSemIpi = valorTotal - valorIpi
```

Exemplo real validado:
```text
104,05 - 3,28 = 100,77
```

Política comercial:
- Huesller/Ney: 45% de desconto sobre os valores cheios do Zetta.
- Francisco/Representante: 50% de desconto sobre os valores cheios do Zetta.
- Link especial soma desconto extra ao desconto base.
- Exemplo: Huesller 45% + link especial 5% = 50% final.
- O desconto final é aplicado sempre sobre os valores cheios originais, nunca sobre preço já descontado.

Arquivos alterados:
- `scripts/generate-catalog.mjs`
- `src/main.jsx`
