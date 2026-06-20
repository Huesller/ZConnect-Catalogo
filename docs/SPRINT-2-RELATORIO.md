# SPRINT 2 - RELATORIO

## Bugs corrigidos

- Carrinho deixou de ficar fixo sobre o conteudo no desktop. Agora participa da grade lateral, com scroll interno e z-index abaixo do modal.
- No mobile, o carrinho virou bottom sheet acionado por botao fixo, iniciando fechado para nao bloquear busca ou cards.
- Dropdown de sugestoes da busca teve altura limitada, scroll interno, fechamento ao clicar fora e fechamento ao limpar/pressionar Escape.
- Busca `parachoque hb20` deixou de ranquear item de outro veiculo por causa da tokenizacao `hb` + `20`.
- Busca comercial agora preserva modelos alfanumericos como `hb20`, `s10` e `x1`.
- Produtos complementares e "Mesmo veiculo/aplicacao" deixaram de usar lista generica e passam a exigir o mesmo veiculo detectado.

## Funcionalidades implementadas

- Tela inicial simples com titulo, campo obrigatorio "Nome da empresa" e botao "Acessar catalogo".
- Persistencia em `localStorage.zconnect_company_name`.
- Entrada direta no catalogo quando a empresa ja existe no storage.
- Saudacao no header validada com uma empresa de exemplo.
- Acao "Trocar empresa" limpando a empresa atual e abrindo novamente a tela de entrada.
- Todos os eventos do catalogo passam a enviar `companyName` para o endpoint atual de analytics.
- Eventos alinhados: `page_view`, `search`, `product_open`, `add_to_cart`, `favorite`, `whatsapp_order`.
- Busca separa resultado direto de sugestoes. Quando nao ha resultado direto, exibe o bloco: "NAO TEMOS ESTE ITEM NO MOMENTO, MAS VOCE PODE PRECISAR DE".
- Sugestoes sem resultado direto respeitam veiculo detectado e familias comerciais relacionadas.

## Arquivos alterados

- `src/main.jsx`
- `src/styles.css`
- `dist/index.html`
- `dist/assets/index-BiSoywIf.css`
- `dist/assets/index-C6LbJA_1.js`
- `docs/SPRINT-2-RELATORIO.md`

## Comandos executados

- `npm.cmd install`
- `npm.cmd run build`
- `npm.cmd run dev`
- Validacao local automatizada com Playwright temporario fora da pasta do Catalogo.

## Resultado do install

`npm.cmd install` concluiu com sucesso:

- Pacotes ja estavam atualizados.
- Auditoria executada em 17 pacotes.
- Aviso restante do npm: 2 vulnerabilidades em dependencias existentes, sendo 1 moderada e 1 alta.
- Nao foi executado `npm audit fix --force` para evitar mudanca de versoes fora do escopo da sprint.

## Resultado do build

`npm.cmd run build` concluiu com sucesso:

- Vite 5.4.21
- 25 modulos transformados.
- Arquivos finais gerados em `dist/`.
- JS final: `dist/assets/index-C6LbJA_1.js`
- CSS final: `dist/assets/index-BiSoywIf.css`

## Resultado do dev

`npm.cmd run dev` subiu com sucesso:

- Local: `http://localhost:5173/`
- Network: `http://192.168.15.4:5173/`

## Validacao manual/local

Cenario validado com uma empresa de exemplo:

- Primeira visita mostra a tela de nome da empresa.
- Apos salvar, `localStorage.zconnect_company_name` contem a empresa.
- Proxima entrada mostra a saudacao com a empresa salva.
- "Trocar empresa" volta para a tela de entrada.
- Busca `grade hb20` mostra sugestoes limitadas, clicaveis e fechando ao clicar fora.
- Busca `parachoque hb20` nao mistura resultado direto com sugestoes.
- Como a base nao contem parachoque principal de HB20, o catalogo mostra o bloco separado com sugestoes HB20 coerentes, como guia, grade e moldura.
- Modal mostra complementares e mesmo veiculo/aplicacao somente de HB20.
- Carrinho desktop nao sobrepoe busca nem cards.
- Modal fica acima do carrinho.
- WhatsApp abre URL valida e dispara `whatsapp_order`.
- Mobile inicia com carrinho fechado e abre bottom sheet com scroll interno.
- Eventos capturados com `companyName`: `page_view`, `search`, `product_open`, `add_to_cart`, `whatsapp_order`.

## Como testar localmente

1. Executar `npm.cmd install`.
2. Executar `npm.cmd run dev`.
3. Abrir `http://localhost:5173/`.
4. Limpar `localStorage.zconnect_company_name` para testar a primeira entrada.
5. Informar uma empresa de exemplo e acessar o catalogo.
6. Buscar `grade hb20` para conferir dropdown.
7. Buscar `parachoque hb20` para conferir o bloco separado de sugestoes.
8. Abrir uma sugestao, conferir complementares, adicionar ao carrinho e finalizar no WhatsApp.
9. Reduzir a viewport para mobile e conferir o bottom sheet do carrinho.

## Riscos restantes

- O npm reporta vulnerabilidades em dependencias existentes; nao foram alteradas por estarem fora do escopo e poderem exigir upgrade com quebra.
- A base atual nao possui um produto principal "PARACHOQUE HB20"; por isso a busca `parachoque hb20` cai corretamente em sugestoes relacionadas.
- O envio de analytics continua dependente do endpoint externo atual ou da variavel `VITE_ZCONNECT_ANALYTICS_URL`, mas falhas de rede nao quebram o catalogo.
