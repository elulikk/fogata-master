@echo off
rem Levanta un servidor local en 127.0.0.1:8080 (el juego usa módulos ES y no anda abriendo el html directo) y abre el juego.
cd /d "%~dp0"
start "Fogata servidor" /min python -m http.server 8080 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8080
