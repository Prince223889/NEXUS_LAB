@echo off
setlocal
cd /d "%~dp0.."
python scripts\prepare_pi_sd.py %*
if errorlevel 1 exit /b 1
echo Copie ce dossier sur le stockage du Raspberry Pi puis suis PI4_SD_CARD\LISEZMOI_FR.txt
exit /b 0
