@echo off
chcp 65001 >nul
cd /d "%~dp0.."

title Z Connect - Validar

echo.
echo ======================================
echo        Z CONNECT - VALIDAR
echo ======================================
echo.

echo [1] Node
node -v

echo.
echo [2] NPM
npm -v

echo.
echo [3] Git
git --version

echo.
echo [4] package.json
if exist package.json (
  echo OK
) else (
  echo [ERRO] package.json nao encontrado.
)

echo.
echo [5] node_modules
if exist node_modules (
  echo OK
) else (
  echo Ausente. Rode dev\SETUP.bat
)

echo.
echo [6] Build
npm run build

echo.
echo [7] Git Status
git status

pause
