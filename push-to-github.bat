@echo off
cd /d "%~dp0"

echo Rimozione eventuali lock Git...
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\config.lock" del /f /q ".git\config.lock"

echo.
echo Aggiunta file...
git add .

echo Commit...
git commit -m "Update: sync local code with repo"

echo Branch main...
git branch -M main

echo Push su GitHub...
git push -u origin main

echo.
echo Fatto.
pause
