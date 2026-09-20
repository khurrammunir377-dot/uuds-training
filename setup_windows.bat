@echo off
title UUDS Training Compliance Tracker - One-Click Setup
color 0B
cls

echo ===============================================================================
echo                UUDS AERO SERVICES - AVIATION TRAINING COMPLIANCE TRACKER
echo                               ONE-CLICK SETUP WIZARD
echo ===============================================================================
echo.
echo [1/5] Checking environment prerequisites (Python and Node.js)...

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Python was not found in your system PATH!
    echo Please install Python 3.10+ and ensure "Add Python to PATH" is checked.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js / npm was not found in your system PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Python and Node.js are available.
echo.

echo [2/5] Installing and verifying backend dependencies...
python -m pip install fastapi uvicorn openpyxl pydantic --quiet
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Pip install returned a warning, continuing with existing packages...
)
echo [OK] Backend dependencies ready.
echo.

echo [3/5] Initializing database and importing Excel training data...
cd /d "%~dp0"
python backend\importer.py
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Failed to populate training database from Excel.
    pause
    exit /b 1
)
echo [OK] Database populated with all technical staff and courses.
echo.

echo [4/5] Building high-performance desktop frontend bundle...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    call npm install --silent
)
call npm run build
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Frontend build encountered an issue.
    pause
    exit /b 1
)
cd /d "%~dp0"
echo [OK] Production UI bundle generated.
echo.

echo [5/5] Configuring Windows Startup (Auto-start on PC boot)...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LAUNCHER_SCRIPT=%~dp0start_windows.bat"
set "VBS_HELPER=%TEMP%\CreateUUDSShortcut.vbs"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_HELPER%"
echo sLinkFile = "%STARTUP_FOLDER%\UUDSTrainingTracker.lnk" >> "%VBS_HELPER%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_HELPER%"
echo oLink.TargetPath = "%LAUNCHER_SCRIPT%" >> "%VBS_HELPER%"
echo oLink.WorkingDirectory = "%~dp0" >> "%VBS_HELPER%"
echo oLink.Description = "UUDS Aviation Training Compliance Tracker Auto-Start" >> "%VBS_HELPER%"
echo oLink.WindowStyle = 7 >> "%VBS_HELPER%"
echo oLink.Save >> "%VBS_HELPER%"

cscript //nologo "%VBS_HELPER%" >nul 2>nul
del "%VBS_HELPER%" >nul 2>nul

echo [OK] Windows Startup shortcut registered at:
echo      "%STARTUP_FOLDER%\UUDSTrainingTracker.lnk"
echo.

echo ===============================================================================
echo                           SETUP COMPLETED SUCCESSFULLY!
echo ===============================================================================
echo.
echo Default Administrator Login:
echo   Username: admin
echo   Password: admin123
echo.
echo Application URL: http://localhost:5000
echo Auto-Start: Enabled (Launches in maximized software view on Windows startup)
echo.
echo Press any key to launch the application now...
pause >nul

start "" "%~dp0start_windows.bat"
exit /b 0
