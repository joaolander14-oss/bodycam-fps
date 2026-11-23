@echo off
cd /d "%~dp0"
start "" http://localhost:8350
python serve.py 8350
