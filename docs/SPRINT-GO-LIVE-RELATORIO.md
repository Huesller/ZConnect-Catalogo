# Sprint Go Live - Relatorio

Data: 2026-06-20

## Arquivos alterados

- `src/main.jsx`
- `src/styles.css`
- `docs/SPRINT-2-RELATORIO.md`
- `docs/SPRINT-GO-LIVE-RELATORIO.md`

## Ajustes aplicados

- Busca comercial reforcada com indexacao por produto:
  - texto normalizado comercial
  - tokens de veiculo/modelo
  - familias de peca
  - posicao/aplicacao
  - anos detectados
- Busca por ano passou a tratar ano pesquisado como compatibilidade de aplicacao, nao como texto simples.
- Parser generico de anos/intervalos implementado para:
  - `2010 A 2015`
  - `2010 ATE 2015`
  - `2010-2015`
  - `2010/2015`
  - `10 A 15`
  - `10/15`
  - `00/10`
  - `95/99`
  - `2017 A 2026`
- Anos curtos sao normalizados por regra generica:
  - `00` a `30` => `2000` a `2030`
  - `80` a `99` => `1980` a `1999`
- Intervalos sao vinculados ao trecho/modelo mais proximo no texto do produto, evitando que uma faixa de `PRISMA` valide indevidamente uma busca por `CELTA`, ou que `GOLF` valide `GOL`.
- Em buscas com veiculo + ano, produtos compativeis ficam acima; produtos sem ano claro ficam abaixo; produtos fora do intervalo saem dos resultados principais e aparecem apenas como similares quando nao ha compativel.
- Veiculo/modelo agora e tratado por palavra inteira no ranking comercial, evitando substring solta em casos como `UP`, `suporte`, `superior` e similares.
- Familia da peca ganhou peso comercial forte logo abaixo do veiculo detectado.
- `PARACHOQUE HB20` passou a retornar resultados diretos HB20 que mencionam parachoque no contexto comercial do item.
- Consultas sem produto direto do veiculo continuam exibindo sugestoes separadas do mesmo veiculo/familia relacionada, sem carro aleatorio acima.
- Login convertido para popup/modal sobre o catalogo com fundo desfocado e escurecido.
- Popup atualizado com titulo, texto explicativo, placeholder e aviso pequeno solicitados.
- Fechar o popup pelo X sem nome nao libera o catalogo; o acesso continua bloqueado ate informar empresa.
- Empresa continua salva em `localStorage.zconnect_company_name`.
- Se a empresa ja existe, o catalogo abre direto e exibe toast curto de retorno.
- Header atualizado para `E muito bom ter voce aqui, [EMPRESA]`, mantendo `Trocar empresa`.
- Mensagem do WhatsApp reformatada com cliente, consultor, itens numerados, valor unitario com IPI, subtotal, resumo e observacao.
- Estrela de favoritos ganhou area clicavel maior, contraste melhor e estado ativo mais claro.
- Produtos complementares e mesmo veiculo/aplicacao continuam restritos ao mesmo veiculo e nao repetem o produto atual.
- Removidas referencias ao exemplo real de empresa dos arquivos entregues.

## Testes feitos

- `npm.cmd install`
- `npm.cmd run build`
- `npm.cmd run dev` em `http://127.0.0.1:5177`
- Verificacao HTTP do servidor local: status 200.
- Validacao funcional do ranking usando o catalogo real:
  - `CELTA`: somente Celta no topo.
  - `PARACHOQUE CELTA`: sem produto direto; sugestao mantida no mesmo veiculo.
  - `UP`: somente Volkswagen UP, sem casar `suporte`/`superior`.
  - `PARACHOQUE HB20`: resultados diretos HB20 priorizados.
  - `GOL`: resultados de Gol no topo, sem misturar Golf.
  - `JETTA`: resultados de Jetta priorizados.
- Validacao funcional obrigatoria da busca por ano usando o catalogo real:
  - `KWID 2018`: resultados principais somente com ano compativel.
  - `KWID 2020`: resultados principais somente com ano compativel.
  - `CELTA 2012`: resultados principais dentro das faixas Celta.
  - `CELTA 2015`: resultados principais dentro das faixas Celta.
  - `CELTA 2009`: resultados principais dentro das faixas Celta.
  - `PARACHOQUE CELTA 2012`: sem produto direto de parachoque Celta na base; sugestao relacionada mantida compativel com Celta 2012.
  - `GRADE HB20 2010`: nenhum resultado principal, pois as grades HB20 da base atual sao 2023+.
  - `GRADE HB20 2020`: nenhum resultado principal, pois as grades HB20 da base atual sao 2023+.
  - `GOL 2008`: resultados principais Gol compativeis, sem casar Golf.
  - `UP 2015`: resultados principais Volkswagen UP compativeis, sem casar `suporte`/`superior`.
- Validacao funcional da mensagem do WhatsApp:
  - inclui `Cliente`
  - inclui `Consultor`
  - mantem quantidade, codigo, fabricacao, descricao, valor unitario e subtotal
  - mantem quebras de linha e observacao final

## Resultado do install

`npm.cmd install` concluido com sucesso.

Observacao: o audit do npm reportou 2 vulnerabilidades herdadas nas dependencias atuais, sendo 1 moderada e 1 alta. Nao foi executado `npm audit fix --force` porque poderia atualizar dependencias com mudancas de quebra antes da publicacao.

## Resultado do build

`npm.cmd run build` concluido com sucesso.

Assets gerados:

- `dist/assets/index-CM4zflUM.css`
- `dist/assets/index-9C_PLleu.js`

## Riscos restantes

- A base atual nao possui um produto principal de parachoque Celta; por isso `PARACHOQUE CELTA` cai corretamente em sugestao relacionada do mesmo veiculo.
- A validacao visual completa em navegador ficou limitada pelo ambiente local sem navegador executavel disponivel; os bloqueadores foram validados por build, servidor local HTTP e testes funcionais sobre o catalogo real.
- Vulnerabilidades apontadas pelo `npm audit` permanecem para tratamento controlado posterior, sem mudanca forcada de dependencias no Go Live.
