# CHANGELOG

## V12.2.0 - LINK CURTO E OPERAÇÃO DIÁRIA

- Link especial curto no formato `/o/NOME-DO-CLIENTE/CODIGO`.
- Desconto, validade e assinatura removidos do endereço compartilhado.
- Compatibilidade preservada para links assinados antigos com `?s=`.
- Endpoint seguro para registrar e resolver ofertas assinadas.
- Link individual de produto com compartilhamento nativo ou cópia.
- Data e hora da última atualização visíveis no catálogo.
- Atualização diária automatizada com testes e build antes da publicação.
- Skeleton de carregamento, estado de imagem indisponível e miniatura no pedido.
- Faixa de reposição também no modal do produto.

As fórmulas e políticas de preço permanecem inalteradas e cobertas por testes.

## V12.1.0 - AJUSTE DE ESCALA E CONTEXTO DO CLIENTE

- Hero limitado a aproximadamente 300 px em telas de 1366 px, mantendo a busca visível na primeira dobra.
- Imagem do hero passou a preencher uma altura controlada sem forçar o bloco verticalmente.
- Cliente atual e ação `Trocar empresa` permanecem visíveis no cabeçalho desktop.
- Em telas menores, a troca de cliente ganha um controle compacto sobre o hero.
- Produtos sem estoque recebem faixa diagonal vermelha `Breve reposição`, preservando a imagem ao fundo.
- Modal inicial de identificação confirmado e mantido; ele reaparece ao trocar a empresa ou ao acessar sem identificação salva.
- Políticas de preço e ofertas assinadas permanecem inalteradas.

## V12.0.0 - CATÁLOGO TÉCNICO EDITORIAL

- Interface reconstruída sobre um único sistema visual, removendo camadas antigas de CSS.
- Nova identidade técnica editorial em grafite, papel e vermelho comercial.
- Hero compacto e autoral, com busca e produtos como focos principais.
- Busca, marcas e disponibilidade reorganizadas em uma central de consulta.
- Grade equilibrada com 4 cards em desktop amplo, 3 em desktop compacto, 2 em tablet e cards horizontais no celular.
- Cards de produto redesenhados com imagem em fundo neutro, código técnico, preços e estoque mais legíveis.
- Carrinho transformado em painel comercial escuro e responsivo.
- Modal reconstruído com maior área de produto e blocos compactos de aplicação e relacionados.
- Entrada de empresa, ofertas especiais, favoritos, paginação e rodapé alinhados à nova identidade.
- Emojis decorativos substituídos por ícones vetoriais e sinais de interface consistentes.
- Nenhuma política ou fórmula de preço foi alterada.

## V11.0.0 - OFERTAS ASSINADAS BUILD 1

- Política comercial congelada por testes automatizados.
- Painel comercial local reconstruído e simplificado.
- Links especiais assinados com ECDSA P-256.
- Catálogo rejeita ofertas assinadas adulteradas.
- Cliente passou a ser obrigatório na geração da oferta.
- Ivoney/Ney normalizado para evitar fragmentação no Analytics.
- Validade passou a usar horas exatas.
- Histórico local exibe cliente, condição final e status da oferta.
- Criação e abertura de ofertas assinadas passam a gerar eventos de Analytics.
- Links legados permanecem compatíveis até 12/08/2026.

## V10.1.0 - DEV-01

- Estrutura DevKit adicionada.
- `.gitignore` definitivo aplicado.
- Scripts de build, setup, pull, push, publicação, validação e backup criados.
- Documentação mínima organizada em `docs/`.
- `VERSION.json` atualizado.
- Raiz do projeto mantida limpa.

## V10.0.0 - CLEAN

- Projeto limpo para novo repositório GitHub/Vercel.
- Remoção de arquivos antigos, builds, zips e histórico de sprints.
