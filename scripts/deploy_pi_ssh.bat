@echo off
setlocal
cd /d "%~dp0.."
echo Deploiement NEXUS sur un Raspberry Pi deja demarre sur sa cle USB 8 Go.
echo La carte microSD de 64 Go doit etre inseree dans le Pi.
echo ATTENTION : l'etape suivante efface la microSD apres confirmation sur le Pi.
set /p CONFIRM_LOCAL=Pour continuer vers la confirmation distante, tape OUI : 
if /i not "%CONFIRM_LOCAL%"=="OUI" exit /b 1
echo Garde une session Ethernet/console ouverte pendant la connexion Wi-Fi au S3.
set /p PI_HOST=Adresse IP SSH du Pi : 
set /p PI_USER=Utilisateur SSH du Pi : 
if "%PI_HOST%"=="" exit /b 2
if "%PI_USER%"=="" exit /b 2
where ssh >nul 2>&1 || (echo OpenSSH ssh introuvable.& exit /b 2)
where scp >nul 2>&1 || (echo OpenSSH scp introuvable.& exit /b 2)
ssh "%PI_USER%@%PI_HOST%" "mkdir -p ~/NEXUS_LAB"
if errorlevel 1 exit /b 1
scp -r "%~dp0..PI4_SD_CARD" "%PI_USER%@%PI_HOST%:~/NEXUS_LAB/"
if errorlevel 1 exit /b 1
scp -r "%~dp0..SD_CARD" "%PI_USER%@%PI_HOST%:~/NEXUS_LAB/"
if errorlevel 1 exit /b 1
ssh -t "%PI_USER%@%PI_HOST%" "cd ~/NEXUS_LAB/PI4_SD_CARD && sudo bash pi/prepare_shared_sd.sh --format /dev/mmcblk0 && sudo bash pi/install.sh && sudo bash pi/connect_to_master_ap.sh && sudo bash pi/setup_arduino.sh"
if errorlevel 1 exit /b 1
echo Installation terminee. Saisis l'adresse Wi-Fi Pi et NEXUS_TOKEN dans Compagnon Pi.
pause
