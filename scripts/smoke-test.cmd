@echo off
REM smoke-test.cmd — End-to-end smoke test wrapper (Windows-friendly)
REM
REM Usage:
REM   scripts\smoke-test.cmd
REM
REM Or from PowerShell:
REM   cmd.exe /c scripts\smoke-test.cmd

cd /d "%~dp0\.."

echo.
echo === Installing tsx if missing ===
call npm install --save-dev tsx@latest --no-audit --no-fund --prefer-offline
if errorlevel 1 (
  echo [ERROR] Failed to install tsx.
  exit /b 1
)

echo.
echo === Running smoke-test.ts (make sure npm run dev is running on :8787) ===
call npx tsx packages/worker/scripts/smoke-test.ts
if errorlevel 1 (
  echo [ERROR] Smoke test failed. See output above.
  exit /b 1
)

echo.
echo === Done ===
