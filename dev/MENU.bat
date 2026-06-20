@echo off
cd /d "%~dp0\.."

:MENU
cls
echo ==================================================
echo                Z CONNECT DEVKIT V3
echo ==================================================
echo Projeto: ZConnect-Catalogo
echo.
call dev\_STATUS_INLINE.bat
echo.
echo ==================================================
echo [1] Primeira instalacao / Setup
echo [2] Build inteligente
echo [3] Publicar no GitHub
echo [4] Git Pull
echo [5] Status completo
echo [6] Atualizar catalogo
echo [7] Abrir GitHub
echo [8] Abrir Vercel
echo [0] Sair
echo ==================================================
echo.
set /p op=Escolha uma opcao: 

if "%op%"=="1" call dev\SETUP.bat
if "%op%"=="2" call dev\BUILD.bat
if "%op%"=="3" call dev\PUBLICAR.bat
if "%op%"=="4" call dev\PULL.bat
if "%op%"=="5" call dev\STATUS.bat
if "%op%"=="6" call dev\ATUALIZAR_CATALOGO.bat
if "%op%"=="7" call dev\ABRIR_GITHUB.bat
if "%op%"=="8" call dev\ABRIR_VERCEL.bat
if "%op%"=="0" exit

pause
goto MENU
