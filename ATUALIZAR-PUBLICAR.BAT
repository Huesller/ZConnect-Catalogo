@echo off
title Z Connect - Atualizar e Publicar Catalogo
cd /d "%~dp0"

echo ==========================================
echo Z CONNECT - ATUALIZAR ESTOQUE, PRECO E SITE
echo ==========================================
echo.

echo [1/6] Instalando dependencias...
call npm install
if errorlevel 1 goto erro

echo.
echo [2/6] Atualizando catalogo e indice de busca...
call npm run update-catalog
if errorlevel 1 goto erro

echo.
echo [3/6] Validando build...
call npm run build
if errorlevel 1 goto erro

echo.
echo [4/6] Verificando alteracoes...
git status

echo.
echo [5/6] Salvando alteracoes no Git...
git add .
git commit -m "Atualiza catalogo estoque precos e busca"
if errorlevel 1 (
  echo Nenhuma alteracao nova para commit. Continuando...
)

echo.
echo [6/6] Publicando online...
git push origin main
if errorlevel 1 goto erro

echo.
echo ==========================================
echo TUDO CERTO!
echo Catalogo atualizado e enviado para producao.
echo A Vercel deve publicar automaticamente em alguns minutos.
echo ==========================================
pause
exit /b 0

:erro
echo.
echo ==========================================
echo ERRO: algo falhou.
echo Veja a mensagem acima antes de fechar.
echo ==========================================
pause
exit /b 1