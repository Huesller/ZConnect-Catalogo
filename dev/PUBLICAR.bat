@echo off
title Z Connect Catalogo - Publicar
cd /d "%~dp0\.."
npm run build
if errorlevel 1 (
  echo Build falhou. Corrija antes de publicar.
  pause
  exit /b 1
)
git add .
git commit -m "Z Connect Catalogo Clean Release"
git push origin main
pause
