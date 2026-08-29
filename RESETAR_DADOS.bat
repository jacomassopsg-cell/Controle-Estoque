@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "data\controle_logistica.db" del /q "data\controle_logistica.db"
echo Banco de testes apagado.
pause
