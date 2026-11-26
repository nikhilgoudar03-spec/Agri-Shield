@echo off
title AgriShield Backend Server
echo ========================================================
echo Starting AgriShield FastAPI Backend on http://localhost:8000
echo API Documentation available at http://localhost:8000/docs
echo ========================================================
cd /d "%~dp0backend"
set PYTHON_EXE=C:\Users\ASUS\AppData\Roaming\uv\python\cpython-3.11-windows-x86_64-none\python.exe
if exist "%PYTHON_EXE%" (
    "%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
)
pause
