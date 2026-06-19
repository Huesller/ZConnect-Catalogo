@echo off
chcp 65001 >nul
cd /d "%~dp0.."

title Z Connect - Git Pull

echo.
echo ======================================
echo        Z CONNECT - GIT PULL
echo ======================================
echo.

git pull origin main
pause
