@echo off
setlocal
cd /d "%~dp0.."
python scripts\verify_pi.py
if errorlevel 1 (
  echo.
  echo Verification Pi en echec. Lis les messages ci-dessus.
  exit /b 1
)
python -m py_compile pi\nexus_agent.py scripts\prepare_pi_sd.py
if errorlevel 1 exit /b 1
echo Syntaxe Python validee.
exit /b 0
