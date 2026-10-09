@echo off
title EL KAROOZ SCHOOL - Stop Servers
color 0C

echo ===============================================================================
echo                STOPPING EL KAROOZ SCHOOL LOCAL SERVERS
echo ===============================================================================
echo.

echo [1/2] Terminating listeners on Port 3000 (Next.js)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/2] Terminating listeners on Port 8000 (PHP API)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [SUCCESS] All EL KAROOZ servers have been stopped.
echo ===============================================================================
pause
