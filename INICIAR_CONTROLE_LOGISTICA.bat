@echo off
chcp 65001 >nul
title CONTROLE LOGISTICA - RECEBIMENTO, QUALIDADE E PROCESSAMENTO
cd /d "%~dp0"

echo =====================================================
echo       CONTROLE LOGISTICA - RECEBIMENTO, QUALIDADE E PROCESSAMENTO
echo =====================================================
echo.

where py >nul 2>nul
if errorlevel 1 (
  echo Python nao encontrado.
  echo Instale o Python 3.12 e marque Add Python to PATH.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Criando ambiente virtual...
  py -3.12 -m venv .venv
  if errorlevel 1 py -m venv .venv
)

echo Instalando dependencias...
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt

echo.
echo Abrindo http://127.0.0.1:8000
start "" http://127.0.0.1:8000
".venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8000
pause
