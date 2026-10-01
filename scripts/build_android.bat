@echo off
setlocal
cd /d "%~dp0..\mobile"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
where java >nul 2>&1 || (echo Java introuvable.& exit /b 2)
if not exist "%ANDROID_HOME%\platforms\android-35\android.jar" (echo Android SDK android-35 absent.& exit /b 2)
if not exist "gradlew.bat" (echo Gradle wrapper absent. Genere-le avec gradle wrapper --gradle-version 8.14.3.& exit /b 2)
call gradlew.bat --no-daemon assembleDebug
if errorlevel 1 exit /b 1
if not exist "%~dp0..\ANDROID" mkdir "%~dp0..\ANDROID"
copy /Y "app\build\outputs\apk\debug\app-debug.apk" "%~dp0..\ANDROID\app-debug.apk" >nul || exit /b 1
echo APK generale NEXUS creee (pas une APK personnalisee de projet) : ANDROID\app-debug.apk
