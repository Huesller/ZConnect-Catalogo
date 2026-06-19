@echo off
chcp 65001 >nul
cd /d "%~dp0.."

title Z Connect - Git Push

echo.
echo ======================================
echo        Z CONNECT - GIT PUSH
echo ======================================
echo.

set MSG=Atualizacao Z Connect
if not "%~1"=="" set MSG=%~1

git status
git add .
git commit -m "%MSG%"
git push origin main

pause
