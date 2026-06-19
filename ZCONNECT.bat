@echo off
:menu
cls
echo ==========================
echo Z CONNECT DEVKIT
echo ==========================
echo 1 STATUS
echo 2 BUILD
echo 3 PUBLICAR
echo 4 GIT PULL
echo 0 SAIR
set /p op=Opcao:
if "%op%"=="1" call dev\STATUS.bat
if "%op%"=="2" call dev\BUILD.bat
if "%op%"=="3" call dev\PUBLICAR.bat
if "%op%"=="4" call dev\PULL.bat
if "%op%"=="0" exit
pause
goto menu