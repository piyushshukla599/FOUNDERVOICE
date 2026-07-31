@echo off
cd /d "%~dp0apps\api"
echo Starting FounderVoice API on http://127.0.0.1:8000 ...
".venv\Scripts\uvicorn.exe" app.main:app --host 127.0.0.1 --port 8000 --timeout-keep-alive 75
pause
