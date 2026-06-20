@echo off
cd /d "%~dp0\.."
cls
echo ==================================================
echo Z CONNECT - STATUS COMPLETO
echo ==================================================
echo.

echo [Ambiente]
where node >nul 2>nul && node -v || echo Node NAO encontrado
where npm >nul 2>nul && npm -v || echo NPM NAO encontrado
where git >nul 2>nul && git --version || echo Git NAO encontrado

echo.
echo [Projeto]
if exist package.json (echo package.json OK) else (echo package.json NAO encontrado)
if exist node_modules (echo node_modules OK) else (echo node_modules NAO encontrado)
if exist dist (echo dist OK) else (echo dist NAO encontrado)

echo.
echo [Git]
git branch
git remote -v
git status

echo.
echo [Ultimo commit]
git log -1 --oneline

echo.
pause
