@echo off
cd /d "%~dp0\.."
cls
echo ==================================================
echo Z CONNECT - PRIMEIRA INSTALACAO
echo ==================================================
echo.

where node >nul 2>nul || (
  echo ERRO: Node nao encontrado.
  echo Instale em: https://nodejs.org
  pause
  exit /b 1
)

where npm >nul 2>nul || (
  echo ERRO: NPM nao encontrado.
  pause
  exit /b 1
)

where git >nul 2>nul || (
  echo ERRO: Git nao encontrado.
  echo Instale em: https://git-scm.com/download/win
  pause
  exit /b 1
)

if not exist package.json (
  echo ERRO: package.json nao encontrado. Execute este arquivo na raiz do projeto.
  pause
  exit /b 1
)

echo Instalando dependencias...
call npm install
if errorlevel 1 (
  echo ERRO no npm install.
  pause
  exit /b 1
)

echo.
echo Validando build...
call npm run build
if errorlevel 1 (
  echo ERRO no build.
  pause
  exit /b 1
)

echo.
echo SETUP CONCLUIDO COM SUCESSO.
pause
