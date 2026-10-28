@echo off
setlocal
cd /d "%~dp0"
title ChatGPT Theme Engine - Restore
node scripts/run.mjs client restore-auto --port 9335
echo.
echo Exit ChatGPT completely and reopen it normally to also close the debug port.
pause
