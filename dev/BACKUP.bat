@echo off
chcp 65001 >nul
cd /d "%~dp0.."

title Z Connect - Backup Local

echo.
echo ======================================
echo        Z CONNECT - BACKUP
echo ======================================
echo.

set DEST=..\backup-zconnect-catalogo-%date:~-4%%date:~3,2%%date:~0,2%-%time:~0,2%%time:~3,2%
set DEST=%DEST: =0%

mkdir "%DEST%"

robocopy . "%DEST%" /E /XD node_modules dist .git .vercel /XF *.zip *.rar *.7z >nul

echo Backup criado em:
echo %DEST%

pause
