@echo off
chcp 65001 >nul
cd /d "%~dp0.."

title Z Connect - Atualizar Catalogo

echo.
echo ======================================
echo      Z CONNECT - ATUALIZAR CATALOGO
echo ======================================
echo.

if not exist node_modules (
  npm install
  if errorlevel 1 exit /b 1
)

npm run update-daily
if errorlevel 1 (
  echo [ERRO] Atualizacao falhou.
  pause
  exit /b 1
)

npm run build
if errorlevel 1 (
  echo [ERRO] Build falhou.
  pause
  exit /b 1
)

echo.
echo Atualizacao concluida.
pause
