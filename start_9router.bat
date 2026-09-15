@echo off
setlocal enabledelayedexpansion
title 9router AI Gateway - Khosh Sanat ERP
echo ==================================================================
echo         STARTING 9ROUTER AI GATEWAY FOR KS ERP (PORT 20131)
echo ==================================================================

set "PORT=20131"
set "HOSTNAME=127.0.0.1"

set "APP_DIR=C:\Users\shkh\Desktop\Kare Emroz\khoshsanat\my_algo_platform\llm_gateway\node_modules\9router\app"
if not exist "%APP_DIR%\custom-server.js" (
    echo [ERROR] 9router standalone server not found at %APP_DIR%
    pause
    exit /b 1
)

cd /d "%APP_DIR%"
echo [INFO] Running 9router server on http://127.0.0.1:20131 ...
node custom-server.js
