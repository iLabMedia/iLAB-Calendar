@echo off
cd /d "%~dp0"
echo I.LAB MEDIA Scheduler local server starting...
echo.
echo If this is the first run, run: npm install
echo.
npm run dev
pause
