@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo node_modules was not found.
  echo Please run: npm.cmd install
  pause
  exit /b 1
)

if not exist ".env" (
  echo .env was not found. NewAPI may not be configured.
  echo The app can still run, but generation may fail unless you use Mock.
  timeout /t 3 /nobreak >nul
)

echo Starting BreathScape Story Scene...
echo.
echo API window:   http://127.0.0.1:3008
echo Web window:   http://127.0.0.1:5173/story-scene
echo.

start "BreathScape API" cmd /k "cd /d ""%~dp0"" && node server\src\index.js"

timeout /t 2 /nobreak >nul

start "BreathScape Web" cmd /k "cd /d ""%~dp0"" && node .\node_modules\vite\bin\vite.js --host 0.0.0.0"

timeout /t 4 /nobreak >nul

start "" "http://127.0.0.1:5173/story-scene"

echo Started. You can close this window.
timeout /t 3 /nobreak >nul
exit /b 0
