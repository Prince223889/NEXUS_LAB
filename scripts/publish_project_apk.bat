@echo off
setlocal
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish_project_apk.ps1" %*
if errorlevel 1 (echo Publication echouee.& exit /b 1)
pause
