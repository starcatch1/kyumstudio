@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
  echo.
  echo hyperframes-goodss Stage 1 acceptance test
  echo ------------------------------------------
  echo Drag a master-sheet image onto this CMD file,
  echo or paste the full image path below.
  echo.
  set /p MASTER=Master sheet path: 
) else (
  set "MASTER=%~1"
)

if not defined MASTER (
  echo [ERROR] No master sheet was provided.
  pause
  exit /b 1
)

where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-stage1.ps1" -MasterSheet "%MASTER%" -Quality draft -Renderer auto
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-stage1.ps1" -MasterSheet "%MASTER%" -Quality draft -Renderer auto
)

set EXITCODE=%errorlevel%
echo.
if not "%EXITCODE%"=="0" (
  echo [FAILED] Stage 1 acceptance test failed. Exit code: %EXITCODE%
) else (
  echo [DONE] Automated Stage 1 acceptance test passed.
  echo Review the two opened videos before marking Stage 1 complete.
)
pause
exit /b %EXITCODE%
