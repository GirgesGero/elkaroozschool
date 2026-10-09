@echo off
setlocal enabledelayedexpansion
title Push EL KAROOZ SCHOOL to GitHub (Chunked Stream)
cd /d "E:\drive progect\ELKAROOZ SCHOOL"

echo ===================================================================
echo   Pushing EL KAROOZ SCHOOL to GitHub in 7 Fast Micro-Batches...
echo   Repository: https://github.com/GirgesGero/elkaroozschool.git
echo ===================================================================
echo.

git config http.version HTTP/1.1
git config http.postBuffer 524288000
git config http.lowSpeedLimit 0
git config http.lowSpeedTime 999999
git config core.compression 0

echo [1/7] Pushing Core Codebase, APIs, and Middleware...
git push origin a91d324:refs/heads/main --progress
if %ERRORLEVEL% neq 0 goto :failed
echo    -> Step 1 Completed!
echo.

echo [2/7] Pushing Encyclopedia Manifest, Sections & Indexes...
git push origin 52bf0f1:refs/heads/main --progress
if %ERRORLEVEL% neq 0 goto :failed
echo    -> Step 2 Completed!
echo.

echo [3/7] Pushing Bible Atlas & Images Dataset...
git push origin a95fc51:refs/heads/main --progress
if %ERRORLEVEL% neq 0 goto :failed
echo    -> Step 3 Completed!
echo.

echo [4/7] Pushing 64 Distributed Search Shards...
git push origin 236c0a7:refs/heads/main --progress
if %ERRORLEVEL% neq 0 goto :failed
echo    -> Step 4 Completed!
echo.

echo [5/7] Pushing Articles Dataset (Part 1: Sections 01-05)...
git push origin 8eed49d:refs/heads/main --progress
if %ERRORLEVEL% neq 0 goto :failed
echo    -> Step 5 Completed!
echo.

echo [6/7] Pushing Articles Dataset (Part 2: Sections 06-15)...
git push origin 96a334f:refs/heads/main --progress
if %ERRORLEVEL% neq 0 goto :failed
echo    -> Step 6 Completed!
echo.

echo [7/7] Pushing Articles Dataset (Part 3: Sections 16-36 + Complete)...
git push origin 75a7020:refs/heads/main --progress
if %ERRORLEVEL% neq 0 goto :failed
echo    -> Step 7 Completed!
echo.

echo ===================================================================
echo   [SUCCESS] All 7 Batches & Entire Project Pushed to GitHub!
echo ===================================================================
echo.
pause
exit /b 0

:failed
echo.
echo ===================================================================
echo   [ERROR] Push encountered an issue. Please verify credentials.
echo ===================================================================
echo.
pause
exit /b 1
