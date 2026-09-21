@echo off
title UUDS Training Compliance Tracker - Launcher
cd /d "%~dp0"

echo ===============================================================================
echo                UUDS AERO - AVIATION TRAINING COMPLIANCE TRACKER
echo ===============================================================================
echo.

:: Check if server is already running on port 5000
netstat -ano | findstr :5000 | findstr LISTENING >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Server is already active on port 5000.
    goto OPEN_WINDOW
)

:: Start FastAPI Backend Server
echo Starting UUDS Training Compliance Engine on port 5000...
start "UUDS Training Server" /min python backend\server.py

echo Waiting for compliance engine to initialize...
set /a ATTEMPTS=0

:WAIT_PORT
timeout /t 1 /nobreak >nul
netstat -ano | findstr :5000 | findstr LISTENING >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend engine is online.
    goto OPEN_WINDOW
)

set /a ATTEMPTS+=1
if %ATTEMPTS% LSS 8 (
    goto WAIT_PORT
)

echo [INFO] Continuing to launch interface...

:OPEN_WINDOW
echo Opening maximized application window...

:: Look for Microsoft Edge
set "EDGE_EXE="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_EXE=%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
)

if defined EDGE_EXE (
    start "" "%EDGE_EXE%" --app=http://localhost:5000 --start-maximized
    exit /b 0
)

:: Fallback: Check for Google Chrome
set "CHROME_EXE="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
)

if defined CHROME_EXE (
    start "" "%CHROME_EXE%" --app=http://localhost:5000 --start-maximized
    exit /b 0
)

:: Fallback to default browser
start http://localhost:5000
exit /b 0
