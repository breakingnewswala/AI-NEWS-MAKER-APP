@echo off
echo =================================================================
echo   AI NEWS MAKER - START LOCAL WEB APP (ANTIGRAVITY IDE)
echo =================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/ (LTS version)
    echo Then restart Antigravity IDE and run this script again.
    echo.
    pause
    exit /b 1
)

echo [1/2] Checking dependencies...
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)
if not exist "web_studio\node_modules" (
    echo Installing web_studio dependencies...
    cd web_studio
    call npm install
    cd ..
)

echo.
echo [2/2] Starting Web Development Server on http://localhost:3000 ...
echo Press Ctrl+C anytime to stop the server.
echo.
call npm run dev
pause
