# Importação de imagens dos produtos

O catálogo aceita uma imagem por produto, identificada pelo código interno no nome do arquivo.

## Formatos aceitos

- JPG e JPEG
- PNG
- WEBP

Exemplo recomendado: `355751.png`.

Também são aceitos prefixos separados por hífen, espaço ou sublinhado, como `TYC_355751.png`. O importador considera somente códigos que existem no catálogo atual.

## Como importar

1. Deixe todas as imagens em uma pasta. Subpastas também são lidas.
2. Dê dois cliques em `IMPORTAR-IMAGENS.bat`.
3. Arraste a pasta das imagens para a janela preta.
4. Pressione `Enter`.
5. Aguarde a mensagem `PRONTO`.
6. Confira `reports/ultima-importacao-imagens.json`.
7. Teste a pasta `dist` ou publique normalmente na Vercel.

No primeiro uso, o próprio `.bat` executa a instalação necessária. É preciso ter o Node.js instalado e conexão com a internet apenas nessa preparação inicial.

Também é possível arrastar a própria pasta de imagens sobre o arquivo `IMPORTAR-IMAGENS.bat`.

## Atualizações futuras

Para substituir fotos, mantenha os mesmos códigos, coloque as imagens novas em uma pasta e execute novamente o `.bat`.

As imagens importadas têm prioridade sobre as imagens do Zetta e continuam vinculadas depois de executar `npm run update-catalog`.

## Regras de segurança

- Se houver duas imagens para o mesmo código na pasta selecionada, nenhuma delas será importada.
- Arquivos sem código reconhecido não alteram o catálogo.
- O relatório informa imagens importadas, duplicadas e sem produto correspondente.
- Uma nova imagem substitui a anterior apenas quando existe uma correspondência única.
