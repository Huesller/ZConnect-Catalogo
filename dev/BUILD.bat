@echo off
cd /d "%~dp0\.."
cls
echo ==================================================
echo Z CONNECT - BUILD INTELIGENTE
echo ==================================================
echo.

if not exist package.json (
  echo ERRO: package.json nao encontrado. Execute na raiz do projeto.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Dependencias nao encontradas.
  echo Executando npm install...
  call npm install
  if errorlevel 1 (
    echo ERRO no npm install.
    pause
    exit /b 1
  )
)

echo.
echo Executando npm run build...
call npm run build
if errorlevel 1 (
  echo.
  echo BUILD FALHOU.
  pause
  exit /b 1
)

echo.
echo BUILD OK.
pause
