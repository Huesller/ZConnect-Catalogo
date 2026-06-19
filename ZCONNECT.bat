@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Z Connect DevKit

:menu
cls
echo ======================================
echo          Z CONNECT DEVKIT
echo ======================================
echo.
echo 1 - Setup / Instalar dependencias
echo 2 - Build
echo 3 - Publicar no GitHub
echo 4 - Git Pull
echo 5 - Git Push simples
echo 6 - Atualizar Catalogo
echo 7 - Validar Projeto
echo 8 - Backup Local
echo 0 - Sair
echo.
set /p op=Escolha uma opcao: 

if "%op%"=="1" call dev\SETUP.bat
if "%op%"=="2" call dev\BUILD.bat
if "%op%"=="3" call dev\PUBLICAR.bat
if "%op%"=="4" call dev\PULL.bat
if "%op%"=="5" call dev\PUSH.bat
if "%op%"=="6" call dev\UPDATE_CATALOGO.bat
if "%op%"=="7" call dev\VALIDAR.bat
if "%op%"=="8" call dev\BACKUP.bat
if "%op%"=="0" exit /b 0

goto menu
