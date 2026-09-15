@echo off
setlocal enabledelayedexpansion
title Khosh Sanat Paydar ERP - Unified Dev Launcher
echo ==================================================================
echo         KHOSH SANAT PAYDAR - INTEGRATED ERP & AI PLATFORM
echo ==================================================================
echo.

cd /d "%~dp0"

echo [STEP 1] Port & Process Cleanup...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0clean_processes.ps1"

echo.
echo [STEP 2] Launching 9router AI Gateway (Port 20131)...
powershell -NoProfile -Command "if ([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port -contains 20131) { exit 0 } else { exit 1 }" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo  [OK] 9router AI Gateway is already listening on port 20131.
) else (
    echo  [INFO] Starting 9router server in a dedicated window...
    start "9router AI Gateway" cmd /k "%~dp0start_9router.bat"
)

echo.
echo [STEP 3] Launching Hermes Telegram Gateway (@Kh_Co_Bot)...
start "Hermes Telegram Gateway" cmd /k "%~dp0start_hermes_gateway.bat"

echo.
echo [STEP 4] Launching Next.js Web Application (Port 3000)...
start "Next.js Web App" cmd /k "title Next.js Web App && cd /d "%~dp0" && npm run dev"

echo.
echo [STEP 5] Health Check ^& Port Verification...
echo Waiting 8 seconds for services to initialize...
ping 127.0.0.1 -n 9 >nul

call :wait_for_port 20131 "9router AI Gateway" 10
call :wait_for_port 3000 "Next.js Web App" 10

echo.
echo ==================================================================
echo                  ALL SYSTEMS ONLINE & READY
echo ==================================================================
echo  - Next.js Web App:       http://localhost:3000
echo  - 9router AI Gateway:    http://127.0.0.1:20131/v1
echo  - Telegram Bot Gateway:  @Kh_Co_Bot (Polling Active)
echo ==================================================================
echo To stop all services gracefully, run stop_dev.bat or close the windows.
echo.
pause
exit /b 0

:wait_for_port
set "_PORT=%~1"
set "_LABEL=%~2"
set "_TRIES=%~3"
for /l %%i in (1,1,%_TRIES%) do (
    powershell -NoProfile -Command "if ([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port -contains %_PORT%) { exit 0 } else { exit 1 }" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo  [OK] %_LABEL% is listening on port %_PORT%
        exit /b 0
    )
    ping 127.0.0.1 -n 3 >nul
)
echo  [WARN] %_LABEL% on port %_PORT% is still initializing...
exit /b 1
