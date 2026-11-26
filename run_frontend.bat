@echo off
title AgriShield Frontend Web Dashboard
echo ========================================================
echo Starting AgriShield React/Vite Frontend on http://localhost:5173
echo ========================================================
cd /d "%~dp0frontend"
call npm.cmd run dev -- --host --port 5173
pause
