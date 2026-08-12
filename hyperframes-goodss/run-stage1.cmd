@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
  echo.
  echo hyperframes-goodss Stage 1 high-quality acceptance
  echo -------------------------------------------------
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
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-stage1.ps1" -MasterSheet "%MASTER%" -Quality high -Renderer auto
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-stage1.ps1" -MasterSheet "%MASTER%" -Quality high -Renderer auto
)

set EXITCODE=%errorlevel%
echo.
if not "%EXITCODE%"=="0" (
  echo [FAILED] Stage 1 acceptance test failed. Exit code: %EXITCODE%
) else (
  echo [DONE] Stage 1 high-quality acceptance passed.
  echo Long and Short include deterministic BGM and transition SFX.
)
pause
exit /b %EXITCODE%
