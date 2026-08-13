@echo off
setlocal
cd /d "%~dp0"

echo.
echo hyperframes-goodss Stage 2A project runner
echo ----------------------------------------
echo Default project: project.json
echo You may also drag a project.json onto this CMD file.
echo.

if "%~1"=="" (
  set "PROJECT=project.json"
) else (
  set "PROJECT=%~1"
)

where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-stage2a.ps1" -ProjectFile "%PROJECT%" -Renderer auto
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-stage2a.ps1" -ProjectFile "%PROJECT%" -Renderer auto
)

set EXITCODE=%errorlevel%
echo.
if not "%EXITCODE%"=="0" (
  echo [FAILED] Stage 2A build failed. Exit code: %EXITCODE%
) else (
  echo [DONE] Stage 2A build and QA passed.
  echo Outputs are under renders\stage2a\PROJECT-ID\
)
pause
exit /b %EXITCODE%
