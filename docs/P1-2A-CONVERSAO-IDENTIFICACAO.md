# P1.2A — Conversão de Identificação

## Objetivo

Aumentar a taxa de identificação de empresas no catálogo sem bloquear o acesso do cliente.

## Implementado

- Banner inteligente para usuários navegando como "Não identificado".
- Banner exibido abaixo do hero, antes da área de busca.
- Botão "Informar minha empresa" reabre o modal de identificação existente.
- Botão "Continuar sem identificar" oculta o banner por 7 dias.
- Texto do modal inicial ajustado para comunicar valor ao cliente.
- Eventos de analytics adicionados:
  - identify_banner_view
  - identify_banner_click
  - identify_banner_close
  - identify_completed

## Regras

- Se a empresa estiver identificada, o banner não aparece.
- Se o cliente estiver como "Não identificado", o banner aparece quando não estiver oculto.
- Se o cliente fechar o banner, ele fica oculto por 7 dias.
- Se o cliente informar a empresa, o bloqueio do banner é limpo.

## Validação executada

- npm install: OK
- npm run build: OK

## Observação

O npm install manteve o aviso de audit existente:
- 1 vulnerabilidade moderate
- 1 vulnerabilidade high

Não foi aplicado npm audit fix --force para evitar alterações quebráveis fora do escopo desta sprint.
