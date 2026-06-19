@echo off
title Z Connect Catalogo - Atualizar
cd /d "%~dp0\.."
npm run update-daily
npm run build
pause
