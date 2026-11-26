@echo off
title AgriShield Full-Stack Launcher
echo ========================================================
echo Launching AgriShield Platform Services...
echo ========================================================
start "AgriShield Backend Server" cmd /k "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
start "AgriShield Frontend Web Dashboard" cmd /k "%~dp0run_frontend.bat"
echo Services launched!
echo Backend:  http://localhost:8000 (Swagger: http://localhost:8000/docs)
echo Frontend: http://localhost:5173
pause
