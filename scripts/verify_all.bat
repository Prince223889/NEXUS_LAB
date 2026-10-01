@echo off
setlocal
cd /d "%~dp0.."
python scripts\verify.py
if errorlevel 1 exit /b 1
python scripts\verify_pi.py
if errorlevel 1 exit /b 1
node scripts\bench_selftest.js
if errorlevel 1 exit /b 1
echo Tous les controles logiciels sont passes.
