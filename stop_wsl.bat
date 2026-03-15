@echo off
REM VibeLife WSL2 停止服务脚本

title VibeLife WSL2 Stop

echo ========================================
echo    停止 VibeLife 服务...
echo ========================================
echo.

wsl bash -lc "cd \"$(wslpath '%~dp0')\" && ./start.sh stop"

echo.
echo ========================================
echo   所有服务已停止
echo ========================================
echo.
pause
