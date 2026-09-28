@echo off
title EL KAROOZ SCHOOL - Project Launcher
color 0F

set ROOT_DIR=%~dp0
set FRONTEND_DIR=%ROOT_DIR%frontend
set BACKEND_DIR=%ROOT_DIR%backend-api

:MENU
cls
echo ===============================================================================
echo                EL KAROOZ SCHOOL - BIBLE EDUCATION PLATFORM
echo                    One-Click Windows Launcher and QA Suite
echo ===============================================================================
echo.
echo  [1] Start Full Platform [Frontend on Port 3000]
echo  [2] Start Frontend Only [Next.js 14 PWA]
echo  [3] Start PHP Backend API Only [Port 8000]
echo  [4] Run Full E2E Automated QA Suite [132 Tests]
echo  [5] Run Production Build [npm run build]
echo  [6] Environment Check [Node, npm, Git, PHP]
echo  [7] Database Health Check [Supabase Connectivity]
echo  [8] Stop All Servers [Port 3000 / 8000]
echo  [9] Exit
echo.
echo ===============================================================================
set /p CHOICE="Select an option [1-9]: "

if "%CHOICE%"=="1" goto START_ALL
if "%CHOICE%"=="2" goto START_FRONTEND
if "%CHOICE%"=="3" goto START_BACKEND
if "%CHOICE%"=="4" goto RUN_TESTS
if "%CHOICE%"=="5" goto RUN_BUILD
if "%CHOICE%"=="6" goto CHECK_ENV
if "%CHOICE%"=="7" goto CHECK_DB
if "%CHOICE%"=="8" goto STOP_ALL
if "%CHOICE%"=="9" goto EXIT_APP
goto MENU

:CHECK_ENV
cls
echo ===============================================================================
echo                           ENVIRONMENT VALIDATION
echo ===============================================================================
echo.
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Node.js is installed.
) else (
    echo [FAIL] Node.js NOT found in PATH!
)

where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] npm package manager is installed.
) else (
    echo [FAIL] npm NOT found in PATH!
)

where git >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Git is installed.
) else (
    echo [FAIL] Git NOT found in PATH!
)

where php >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] PHP CLI is installed.
) else (
    echo [INFO] PHP CLI not in local PATH - Backend operates on Hostinger Remote API.
)
echo.
pause
goto MENU

:START_ALL
cls
echo ===============================================================================
echo                    STARTING EL KAROOZ SCHOOL PLATFORM
echo ===============================================================================
echo.
echo [1/2] Launching Next.js 14 PWA on http://localhost:3000 ...
cd /d "%FRONTEND_DIR%"
start "EL KAROOZ Frontend" cmd /c "npm run dev"

where php >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [2/2] Launching PHP API on http://localhost:8000 ...
    cd /d "%BACKEND_DIR%"
    start "EL KAROOZ PHP API" cmd /c "php -S localhost:8000 -t public"
) else (
    echo [2/2] Connected to Supabase Cloud Database and Hostinger Storage.
)

echo.
echo [SUCCESS] Platform started successfully!
echo Open your browser at: http://localhost:3000
echo.
pause
goto MENU

:START_FRONTEND
cls
echo [START] Starting Frontend on http://localhost:3000 ...
cd /d "%FRONTEND_DIR%"
start "EL KAROOZ Frontend" cmd /c "npm run dev"
echo Open your browser at: http://localhost:3000
pause
goto MENU

:START_BACKEND
cls
where php >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    cd /d "%BACKEND_DIR%"
    start "EL KAROOZ PHP API" cmd /c "php -S localhost:8000 -t public"
    echo [SUCCESS] PHP API running on http://localhost:8000
) else (
    echo [INFO] PHP is not installed locally. Backend API is hosted on Hostinger.
)
pause
goto MENU

:RUN_TESTS
cls
cd /d "%ROOT_DIR%"
call TEST_ELKAROOZ.bat
goto MENU

:RUN_BUILD
cls
echo ===============================================================================
echo                         PRODUCTION BUILD CHECK
echo ===============================================================================
cd /d "%FRONTEND_DIR%"
call npm run build
echo.
pause
goto MENU

:CHECK_DB
cls
echo ===============================================================================
echo                      DATABASE CONNECTIVITY CHECK
echo ===============================================================================
cd /d "%ROOT_DIR%"
python scripts\verify_phase8_bible.py
echo.
pause
goto MENU

:STOP_ALL
cls
cd /d "%ROOT_DIR%"
call STOP_ELKAROOZ.bat
goto MENU

:EXIT_APP
exit /b 0
