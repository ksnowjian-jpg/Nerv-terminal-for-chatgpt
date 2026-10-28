@echo off
setlocal
cd /d "%~dp0"
title UNIT-01 Theme Startup
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\test-client.ps1" -WaitForExit
echo.
pause
