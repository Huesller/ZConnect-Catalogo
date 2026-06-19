@echo off
call dev\BUILD.bat
git add .
set /p m=Commit: 
git commit -m "%m%"
git push origin main
pause