@echo off
setlocal

echo Stopping BreathScape Story Scene services...

for %%P in (3008 5173) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P" ^| findstr "LISTENING"') do (
    echo Killing process %%A on port %%P
    taskkill /pid %%A /t /f >nul 2>nul
  )
)

echo Done.
pause
