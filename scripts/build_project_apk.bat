@echo off
setlocal
if "%~1"=="" (
  echo Usage: scripts\build_project_apk.bat "C:\chemin\vers\projet-extrait"
  echo Extrait le ZIP du Studio puis passe le dossier contenant project.json.
  exit /b 2
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_project_apk.ps1" -ProjectDir "%~1"
exit /b %ERRORLEVEL%
