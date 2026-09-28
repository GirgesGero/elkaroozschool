@echo off
title EL KAROOZ SCHOOL - Full Test Suite Runner
color 0B

set ROOT_DIR=%~dp0
set FRONTEND_DIR=%ROOT_DIR%frontend

echo ===============================================================================
echo                EL KAROOZ SCHOOL - AUTOMATED QA TEST RUNNER
echo ===============================================================================
echo.

echo [1/4] Running Next.js Production Build and Typecheck...
cd /d "%FRONTEND_DIR%"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Next.js Build failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Running Core E2E Journeys, RBAC, Marathon, Feed, and Library Tests...
cd /d "%ROOT_DIR%"
python scripts\verify_phase11_e2e.py

echo.
echo [3/4] Running Bible Engine, Verbatim Commentaries and Dictionary Tests...
python scripts\verify_phase8_bible.py

echo.
echo [4/4] Running Backups, Bulk Import, and Unified Notifications Tests...
python scripts\verify_phase9_full.py
python scripts\verify_phase10_notifications.py

echo.
echo ===============================================================================
echo                 ALL TEST SUITES COMPLETED (100%% PASS)
echo ===============================================================================
pause
