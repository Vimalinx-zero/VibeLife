@echo off
REM FlowStudy WSL2 停止服务脚本

title FlowStudy WSL2 Stop

echo ========================================
echo    停止 FlowStudy 服务...
echo ========================================
echo.

wsl bash -c "cd ~/Programs/flowstudy && ./start.sh stop"

echo.
echo ========================================
echo   所有服务已停止
echo ========================================
echo.
pause
