@echo off
echo Starting СтройУчёт...

:: Запуск Backend
start "Backend" cmd /k "cd /d F:\StroyUchet\stroyuchet-saas && npm run dev"

:: Подождать 3 секунды
timeout /t 3

:: Запуск Frontend
start "Frontend" cmd /k "cd /d F:\StroyUchet\stroyuchet-saas\frontend && npm run dev"

echo.
echo Backend: http://localhost:4000
echo Frontend: http://localhost:3000