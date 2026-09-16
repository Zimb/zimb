@echo off
REM init-airtable.cmd — Bootstrap the Zimb Airtable sandbox (Windows-friendly wrapper)
REM
REM Usage:
REM   scripts\init-airtable.cmd
REM
REM Or from PowerShell:
REM   cmd.exe /c scripts\init-airtable.cmd

cd /d "%~dp0\.."

echo.
echo === Installing tsx if missing ===
call npm install --save-dev tsx@latest --no-audit --no-fund --prefer-offline
if errorlevel 1 (
  echo.
  echo [ERROR] Failed to install tsx. Check your network connection.
  exit /b 1
)

echo.
echo === Running init-airtable.ts ===
call npx tsx packages/worker/scripts/init-airtable.ts
if errorlevel 1 (
  echo.
  echo [ERROR] init-airtable.ts failed. See output above.
  exit /b 1
)

echo.
echo === Done ===
