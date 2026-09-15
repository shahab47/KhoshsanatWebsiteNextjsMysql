@echo off
title Hermes Gateway - Khosh Sanat ERP
cd /d "%~dp0"
set "HERMES_HOME=%~dp0.hermes"
echo [Hermes Gateway] Starting with HERMES_HOME=%HERMES_HOME%

:loop
echo [%date% %time%] Launching Hermes Gateway for KS ERP...
"C:\Users\shkh\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes.exe" gateway run
echo [%date% %time%] Hermes Gateway exited with code %ERRORLEVEL%. Restarting in 5 seconds...
ping 127.0.0.1 -n 6 >nul
goto loop
