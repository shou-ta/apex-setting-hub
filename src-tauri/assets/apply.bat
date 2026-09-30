@echo off
setlocal DisableDelayedExpansion

echo APEX SETTING HUB - Apply settings
echo.
if not exist "%~dp0settings.cfg" goto missing_source
if not exist "%~dp0videoconfig.txt" goto missing_source
if not exist "%~dp0profile.cfg" goto missing_source

set "target=%APEX_SETTING_HUB_TARGET%"
if not defined target set "target=%USERPROFILE%\Saved Games\Respawn\Apex"
if not exist "%target%\local\" goto missing_target
if not exist "%target%\profile\" goto missing_target

tasklist /FI "IMAGENAME eq r5apex.exe" /NH 2>nul | findstr /I /C:"r5apex.exe" >nul
if not errorlevel 1 goto game_running
tasklist /FI "IMAGENAME eq r5apex_dx12.exe" /NH 2>nul | findstr /I /C:"r5apex_dx12.exe" >nul
if not errorlevel 1 goto game_running

echo Destination: %target%
echo Existing settings will be moved to a dated backup folder.

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "stamp=%%I"
if not defined stamp goto timestamp_error
set "backup=%target%\..\ApexSettingHub_backup_%stamp%_%RANDOM%"
for %%I in ("%backup%") do set "backup=%%~fI"
mkdir "%backup%\local" 2>nul
if errorlevel 1 goto backup_error
mkdir "%backup%\profile" 2>nul
if errorlevel 1 goto backup_error

set "staged=0"
if exist "%target%\local\settings.cfg" (
    move /Y "%target%\local\settings.cfg" "%backup%\local\settings.cfg" >nul
    if errorlevel 1 goto rollback
)
if exist "%target%\local\videoconfig.txt" (
    move /Y "%target%\local\videoconfig.txt" "%backup%\local\videoconfig.txt" >nul
    if errorlevel 1 goto rollback
)
if exist "%target%\profile\profile.cfg" (
    move /Y "%target%\profile\profile.cfg" "%backup%\profile\profile.cfg" >nul
    if errorlevel 1 goto rollback
)
set "staged=1"

copy /B /Y "%~dp0settings.cfg" "%target%\local\settings.cfg" >nul
if errorlevel 1 goto rollback
copy /B /Y "%~dp0videoconfig.txt" "%target%\local\videoconfig.txt" >nul
if errorlevel 1 goto rollback
copy /B /Y "%~dp0profile.cfg" "%target%\profile\profile.cfg" >nul
if errorlevel 1 goto rollback

echo.
echo Applied successfully.
echo Previous settings: %backup%
goto done

:rollback
echo.
echo Copy failed. Restoring the previous settings...
if "%staged%"=="1" (
    if exist "%target%\local\settings.cfg" del /F /Q "%target%\local\settings.cfg" >nul 2>nul
    if exist "%target%\local\videoconfig.txt" del /F /Q "%target%\local\videoconfig.txt" >nul 2>nul
    if exist "%target%\profile\profile.cfg" del /F /Q "%target%\profile\profile.cfg" >nul 2>nul
)
set "restore_failed=0"
if exist "%backup%\local\settings.cfg" (
    move /Y "%backup%\local\settings.cfg" "%target%\local\settings.cfg" >nul
    if errorlevel 1 set "restore_failed=1"
)
if exist "%backup%\local\videoconfig.txt" (
    move /Y "%backup%\local\videoconfig.txt" "%target%\local\videoconfig.txt" >nul
    if errorlevel 1 set "restore_failed=1"
)
if exist "%backup%\profile\profile.cfg" (
    move /Y "%backup%\profile\profile.cfg" "%target%\profile\profile.cfg" >nul
    if errorlevel 1 set "restore_failed=1"
)
if "%restore_failed%"=="0" echo Previous settings restored.
if not "%restore_failed%"=="0" echo Restoration needs attention. Check %target% and %backup%
goto failed

:missing_source
echo Extract the entire ZIP before running apply.bat. One or more settings files are missing.
goto failed
:missing_target
echo Apex settings folder was not found: %target%
echo Set APEX_SETTING_HUB_TARGET to the Apex folder if Saved Games has been moved.
goto failed
:game_running
echo Close Apex Legends completely before applying settings.
goto failed
:timestamp_error
echo Could not create a timestamp for the backup folder.
goto failed
:backup_error
echo Could not create the backup folder: %backup%
goto failed
:failed
echo Settings were not applied.
pause
exit /b 1
:done
pause
exit /b 0
