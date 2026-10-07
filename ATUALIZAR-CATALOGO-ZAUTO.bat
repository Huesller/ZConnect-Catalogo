@echo off
setlocal
cd /d "%~dp0"

echo.
echo ================================================
echo      Z AUTOMOTIVA - ATUALIZACAO DIARIA
echo ================================================
echo.

echo [1/4] Atualizando catalogos, precos e estoque...
call npm run update-daily
if errorlevel 1 goto ERRO

echo.
echo [2/4] Gerando build de producao...
call npm run build
if errorlevel 1 goto ERRO

echo.
echo [3/4] Verificando alteracoes...
git status --short

git diff --quiet -- public/data dist/data scripts/catalog-source.json
if not errorlevel 1 (
    echo.
    echo Nenhuma alteracao detectada.
    echo O catalogo ja esta atualizado.
    goto FIM
)

echo.
echo [4/4] Publicando no GitHub...
git add public/data dist/data scripts/catalog-source.json
git commit -m "Atualizacao diaria de catalogo, precos e estoque"
if errorlevel 1 goto ERRO

git push origin main
if errorlevel 1 goto ERRO

echo.
echo ================================================
echo       ATUALIZACAO PUBLICADA COM SUCESSO
echo ================================================
echo.
echo O Vercel iniciara o novo deploy automaticamente.
goto FIM

:ERRO
echo.
echo ================================================
echo              ERRO NA ATUALIZACAO
echo ================================================
echo.
echo Verifique a mensagem acima.
pause
exit /b 1

:FIM
echo.
pause
