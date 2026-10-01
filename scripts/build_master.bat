@echo off
rem ESP32 LAB — compile le MASTER (ESP-IDF 6.1). Usage : build_master.bat [COMx]
setlocal
where idf.py >nul 2>nul || call "%IDF_PATH%\export.bat" 2>nul || call "C:\esp\v6.1\esp-idf\export.bat" || exit /b 1
cd /d "%~dp0..\firmware\master" || exit /b 1
idf.py build || exit /b 1
if not exist "%~dp0..\firmware\master\build\esp32_lab_master.bin" (echo Binaire MASTER absent apres compilation.& exit /b 1)
copy /Y "%~dp0..\firmware\master\build\esp32_lab_master.bin" "%~dp0..\esp32_lab_master.bin" >nul || exit /b 1
if not exist "%~dp0..\SD_CARD\FIRMWARE\MASTER" mkdir "%~dp0..\SD_CARD\FIRMWARE\MASTER" || exit /b 1
copy /Y "%~dp0..\firmware\master\build\esp32_lab_master.bin" "%~dp0..\SD_CARD\FIRMWARE\MASTER\esp32_lab_master.bin" >nul || exit /b 1
echo Binaire MASTER copie vers la racine et SD_CARD/FIRMWARE/MASTER.
if not "%~1"=="" idf.py -p %1 flash monitor
