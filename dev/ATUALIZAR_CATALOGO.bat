@echo off
cd /d "%~dp0\.."
cls
echo ==================================================
echo Z CONNECT - ATUALIZAR CATALOGO
echo ==================================================
echo.

if not exist package.json (
  echo ERRO: package.json nao encontrado.
  pause
  exit /b 1
)

call npm run update-fast
if errorlevel 1 (
  echo update-fast falhou. Tentando update-daily...
  call npm run update-daily
)

pause
