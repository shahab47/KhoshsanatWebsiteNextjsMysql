@echo off
title Stopping Khosh Sanat Dev Services
echo ==================================================================
echo         STOPPING KHOSH SANAT DEV PLATFORM & GATEWAYS
echo ==================================================================

echo [1/2] Stopping Next.js and cleaning active web ports...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0clean_processes.ps1"

echo [2/2] Stopping Hermes Gateway background processes...
powershell -NoProfile -Command "Get-Process | Where-Object { $_.CommandLine -like '*hermes*gateway*' } | Stop-Process -Force -ErrorAction SilentlyContinue"

echo.
echo [OK] All development processes have been stopped.
echo You can now safely close any remaining console windows.
echo.
pause
