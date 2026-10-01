@echo off
rem ESP32 LAB - compile tous les projets (ESP32, ESP32-S3, ESP32-C3, Arduino) et range les firmwares.
rem   compile_all.bat                 tout
rem   compile_all.bat --targets esp32 une seule carte
cd /d "%~dp0.."
python scripts\compile_all.py %*
pause
