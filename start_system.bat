@echo off
echo =========================================================================
echo   NER LANDSLIDE SENTINEL - EARLY WARNING & RISK MONITORING SYSTEM
echo   North Eastern Region, India (Sikkim, Meghalaya, Assam, Nagaland, 
echo   Mizoram, Arunachal Pradesh, Manipur, Tripura)
echo =========================================================================
echo.

echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "NER LEWS Backend" cmd /k "cd backend && python main.py"

timeout /t 3 /nobreak >nul

echo [2/2] Launching React GIS Command Frontend on http://127.0.0.1:3000 ...
start "NER LEWS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo System online!
echo - Web Dashboard: http://localhost:3000
echo - Swagger API Docs: http://127.0.0.1:8000/docs
echo.
pause
