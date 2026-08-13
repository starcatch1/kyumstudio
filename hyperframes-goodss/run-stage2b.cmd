@echo off
setlocal
cd /d "%~dp0"
set "PROJECT=%~1"
if "%PROJECT%"=="" set "PROJECT=samples\stage2b-music\project.json"
echo [P2B] Project: %PROJECT%
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-stage2b.ps1" -ProjectFile "%PROJECT%" -Renderer auto
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo [P2B] Build failed with exit code %RC%.
  pause
  exit /b %RC%
)
echo.
echo [P2B] Build complete.
pause
