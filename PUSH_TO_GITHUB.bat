@echo off
title Push EL KAROOZ SCHOOL to GitHub
cd /d "E:\drive progect\ELKAROOZ SCHOOL"
echo ===================================================
echo Pushing EL KAROOZ SCHOOL to GitHub Repository...
echo URL: https://github.com/GirgesGero/elkaroozschool.git
echo ===================================================
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Project successfully pushed to GitHub!
) else (
    echo [NOTICE] If prompted, please enter your GitHub Personal Access Token or credentials in the browser window.
)
echo.
pause
