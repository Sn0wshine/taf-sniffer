@echo off
setlocal EnableExtensions

cd /d "%~dp0"
set "APP_URL=http://127.0.0.1:8787/"

:menu
cls
echo ==========================================
echo              TAF SNIFFER
echo ==========================================
echo.
echo Dossier : %cd%
echo Adresse : %APP_URL%
echo.
echo 1. Lancer l'app locale
echo 2. Ouvrir l'app dans le navigateur
echo 3. Build web
echo 4. Diagnostic Android
echo 5. Build APK debug Android
echo 6. Installer APK debug Android
echo 7. Ouvrir Android Studio / projet Android
echo 8. Quitter
echo.
set /p "choice=Choix : "

if "%choice%"=="" goto quit
if "%choice%"=="1" goto start_app
if "%choice%"=="2" goto open_browser
if "%choice%"=="3" goto build_web
if "%choice%"=="4" goto android_check
if "%choice%"=="5" goto android_build
if "%choice%"=="6" goto android_install
if "%choice%"=="7" goto android_open
if "%choice%"=="8" goto quit

echo.
echo Choix invalide.
pause
goto menu

:start_app
cls
echo ==========================================
echo Lancement de Taf Sniffer
echo ==========================================
echo.
echo Adresse locale : %APP_URL%
echo.
echo Le serveur reste actif dans cette fenetre.
echo Appuie sur CTRL+C pour l'arreter, puis reponds O si Windows demande confirmation.
echo.
start "" "%APP_URL%"
npm.cmd run start:local
echo.
echo Le serveur s'est arrete.
pause
goto menu

:open_browser
echo.
echo Ouverture de %APP_URL%
start "" "%APP_URL%"
pause
goto menu

:build_web
cls
echo ==========================================
echo Build web
echo ==========================================
echo.
npm.cmd run build
echo.
pause
goto menu

:android_check
cls
echo ==========================================
echo Diagnostic Android
echo ==========================================
echo.
npm.cmd run android:check
echo.
pause
goto menu

:android_build
cls
echo ==========================================
echo Build APK debug Android
echo ==========================================
echo.
npm.cmd run android:build:debug
echo.
pause
goto menu

:android_install
cls
echo ==========================================
echo Installation APK debug Android
echo ==========================================
echo.
npm.cmd run android:install:debug
echo.
pause
goto menu

:android_open
cls
echo ==========================================
echo Ouverture du projet Android
echo ==========================================
echo.
npm.cmd run android:open
echo.
pause
goto menu

:quit
echo.
echo A bientot.
endlocal
exit /b 0
