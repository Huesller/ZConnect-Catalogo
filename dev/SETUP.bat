@echo off
chcp 65001 >nul
cd /d "%~dp0.."

title Z Connect - Setup

echo.
echo ======================================
echo        Z CONNECT - SETUP
echo ======================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node nao encontrado.
  echo Instale o Node.js LTS.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] NPM nao encontrado.
  pause
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao encontrado.
  echo Instale Git for Windows.
  pause
  exit /b 1
)

echo Node:
node -v
echo NPM:
npm -v
echo Git:
git --version

echo.
echo Instalando dependencias...
npm install
if errorlevel 1 (
  echo [ERRO] npm install falhou.
  pause
  exit /b 1
)

echo.
echo Setup concluido.
pause
