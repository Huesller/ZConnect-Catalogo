# Link especial v2 — desconto comercial

Alterações pequenas e seguras para o fluxo de link especial:

- O link especial continua liberando o catálogo sem modal de identificação.
- O desconto agora é aplicado sobre o preço atual exibido no catálogo para o consultor.
- O cálculo usa `fator`, por exemplo:
  - 10% de desconto => `fator=0.9`
  - preço especial = preço atual do catálogo × fator
- O catálogo não mostra a porcentagem para o cliente.
- No card e no modal, o cliente vê:
  - preço original riscado;
  - preço especial abaixo;
  - selo discreto de condição exclusiva.
- Compra/carrinho/WhatsApp/analytics/modal normal foram mantidos.
- Links normais sem oferta continuam com o modal e política de preço padrão.

Teste local:

```bash
npm install
npm run build
npm run dev
```

Exemplo:

```text
http://localhost:5173/?o=huesller-10-d-20260716&consultor=huesller&tipo=discount&desconto=10&fator=0.9&validade=7&cliente=teste
```
