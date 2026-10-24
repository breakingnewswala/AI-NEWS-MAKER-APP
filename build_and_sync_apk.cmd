@echo off
echo =================================================================
echo   AI NEWS MAKER - BUILD WEB & SYNC TO MOBILE APK ASSETS
echo =================================================================
echo.
echo [1/3] Building Web Studio with Vite...
cd web_studio
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Web Studio build failed!
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/3] Syncing Compiled Files to Android App Assets...
if not exist "app\src\main\assets\news_studio" mkdir "app\src\main\assets\news_studio"
if not exist "public" mkdir "public"
if not exist "dist" mkdir "dist"

xcopy /E /I /Y "web_studio\dist\*" "app\src\main\assets\news_studio\" >nul
xcopy /E /I /Y "web_studio\dist\*" "public\" >nul
xcopy /E /I /Y "web_studio\dist\*" "dist\" >nul
copy /Y "web_studio\dist\server.cjs" "server.cjs" >nul

echo.
echo [3/3] SUCCESS! Mobile APK assets are now 100%% up to date!
echo =================================================================
echo  अब आप Antigravity IDE / Git में 'git add .', commit और 'git push' करें।
echo  सभी वेब बदलाव एज-इट-इज मोबाइल APK में शामिल रहेंगे।
echo =================================================================
pause
