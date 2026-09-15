# PowerShell Startup Script for NER Landslide Sentinel
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "  NER LANDSLIDE SENTINEL - EARLY WARNING & RISK MONITORING SYSTEM" -ForegroundColor Green
Write-Host "  North Eastern Region, India" -ForegroundColor Yellow
Write-Host "=========================================================================" -ForegroundColor Cyan

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend
Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; python main.py"

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "[2/2] Starting React GIS Frontend on http://localhost:3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "`nSystem Services Initialized!" -ForegroundColor Green
Write-Host "  -> Command GIS Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "  -> FastAPI OpenAPI Docs:   http://127.0.0.1:8000/docs`n" -ForegroundColor White
