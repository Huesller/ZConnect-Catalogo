@echo off
title Z Connect Catalogo - Setup
cd /d "%~dp0\.."
echo Instalando dependencias...
npm install
echo.
echo Validando build...
npm run build
pause
