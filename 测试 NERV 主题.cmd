@echo off
setlocal
cd /d "%~dp0"
title ChatGPT Theme Engine - Client Test
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\test-client.ps1" -WaitForExit
echo.
pause
