@echo off
chcp 65001 >nul
cd /d "%~dp0.."

title Z Connect - Publicar

echo.
echo ======================================
echo        Z CONNECT - PUBLICAR
echo ======================================
echo.

if not exist node_modules (
  echo node_modules nao encontrado. Rodando npm install...
  npm install
  if errorlevel 1 exit /b 1
)

echo.
echo Rodando build...
npm run build
if errorlevel 1 (
  echo.
  echo [ERRO] Build falhou. Publicacao cancelada.
  pause
  exit /b 1
)

echo.
git status
git add .

set MSG=Publicacao Z Connect
if not "%~1"=="" set MSG=%~1

git commit -m "%MSG%"
git push origin main

echo.
echo Publicacao enviada. A Vercel iniciara o deploy.
pause
