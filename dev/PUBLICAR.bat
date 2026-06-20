@echo off
cd /d "%~dp0\.."
cls
echo ==================================================
echo Z CONNECT - PUBLICAR
echo ==================================================
echo.

call dev\BUILD.bat
if errorlevel 1 (
  echo Publicacao cancelada por erro no build.
  pause
  exit /b 1
)

where git >nul 2>nul || (
  echo ERRO: Git nao encontrado.
  pause
  exit /b 1
)

git status
echo.
set /p msg=Mensagem do commit: 
if "%msg%"=="" set msg=Atualizacao Z Connect

git add .
git commit -m "%msg%"
if errorlevel 1 (
  echo.
  echo Nenhum commit criado ou erro no commit.
)

git push origin main
if errorlevel 1 (
  echo.
  echo ERRO no push.
  pause
  exit /b 1
)

echo.
echo PUBLICADO COM SUCESSO.
echo A Vercel iniciara o deploy automaticamente.
pause
