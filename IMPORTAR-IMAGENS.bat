@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ============================================================
echo          Z CONNECT - IMPORTAR IMAGENS DE PRODUTOS
echo ============================================================
echo.
echo Cada arquivo deve conter o codigo interno do produto.
echo Exemplo: 355751.png
echo.

set "PASTA_IMAGENS=%~1"
if not defined PASTA_IMAGENS (
  set /p "PASTA_IMAGENS=Arraste a pasta das imagens para esta janela e pressione ENTER: "
)

set "PASTA_IMAGENS=%PASTA_IMAGENS:"=%"
if not defined PASTA_IMAGENS (
  echo.
  echo ERRO: nenhuma pasta foi informada.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
  echo.
  echo Preparando o catálogo para o primeiro uso...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERRO: nao foi possivel instalar as dependencias.
    echo Confirme se o Node.js esta instalado e tente novamente.
    pause
    exit /b 1
  )
)

node scripts\import-product-images.mjs "%PASTA_IMAGENS%"
if errorlevel 1 (
  echo.
  echo A importacao nao foi concluida.
  pause
  exit /b 1
)

echo.
echo Gerando a versao pronta para publicacao...
call npm run build
if errorlevel 1 (
  echo.
  echo As imagens foram importadas, mas o build apresentou erro.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo PRONTO: imagens importadas e pasta dist atualizada.
echo Confira reports\ultima-importacao-imagens.json.
echo ============================================================
pause
