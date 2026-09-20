@echo off
title UUDS Training Tracker - Auto-Start Toggle
cls

echo ===============================================================================
echo                UUDS AERO SERVICES - WINDOWS AUTO-START CONFIGURATOR
echo ===============================================================================
echo.
set "STARTUP_SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\UUDSTrainingTracker.lnk"

if exist "%STARTUP_SHORTCUT%" (
    echo [CURRENT STATUS] Auto-Start is currently: ENABLED
    echo.
    echo Would you like to DISABLE auto-start on PC boot? (Y/N)
    set /p "CHOICE=Select (Y/N): "
    if /i "%CHOICE%"=="Y" (
        del "%STARTUP_SHORTCUT%" >nul 2>nul
        echo [OK] Auto-Start has been DISABLED.
    ) else (
        echo [OK] Kept ENABLED.
    )
) else (
    echo [CURRENT STATUS] Auto-Start is currently: DISABLED
    echo.
    echo Would you like to ENABLE auto-start on PC boot? (Y/N)
    set /p "CHOICE=Select (Y/N): "
    if /i "%CHOICE%"=="Y" (
        set "VBS_HELPER=%TEMP%\CreateUUDSShortcut.vbs"
        echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_HELPER%"
        echo sLinkFile = "%STARTUP_SHORTCUT%" >> "%VBS_HELPER%"
        echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_HELPER%"
        echo oLink.TargetPath = "%~dp0start_windows.bat" >> "%VBS_HELPER%"
        echo oLink.WorkingDirectory = "%~dp0" >> "%VBS_HELPER%"
        echo oLink.Description = "UUDS Aviation Training Compliance Tracker" >> "%VBS_HELPER%"
        echo oLink.WindowStyle = 7 >> "%VBS_HELPER%"
        echo oLink.Save >> "%VBS_HELPER%"
        cscript //nologo "%VBS_HELPER%" >nul 2>nul
        del "%VBS_HELPER%" >nul 2>nul
        echo [OK] Auto-Start has been ENABLED.
    ) else (
        echo [OK] Kept DISABLED.
    )
)

echo.
pause
