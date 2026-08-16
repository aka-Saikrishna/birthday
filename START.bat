@echo off
REM ── Sixteen Lights ───────────────────────────────────────────────
REM Double-click this file. It serves this folder on
REM http://localhost:5177 and opens the experience in your browser.
REM
REM A real server is required: browsers refuse to feed file:// images
REM into WebGL, so opening index.html directly would show no memories.
REM Close this black window when you're done.
REM ─────────────────────────────────────────────────────────────────

cd /d "%~dp0"
start "" "http://localhost:5177/"
python -m http.server 5177
if errorlevel 1 (
  echo.
  echo Could not start Python. Try:  py -m http.server 5177
  py -m http.server 5177
)
pause
