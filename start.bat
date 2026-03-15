@echo off
chcp 65001 >nul
title VibeLife

echo.
echo ========================================
echo   VibeLife v1.0.0
echo ========================================
echo.
echo [1] 启动后端服务...
echo.

cd /d "%~dp0\backend"
start /B python main.py

echo.
echo [2] 等待后端启动 (3秒)...
timeout /t 3 /nobreak

echo.
echo [3] 启动前端服务...
echo.

cd /d "%~dp0\frontend"
start npm run dev

echo.
echo ========================================
echo   服务启动完成！
echo ========================================
echo.
echo 后端: http://localhost:8000
echo 前端: http://localhost:5173
echo.
echo 按任意键关闭此窗口（服务将在后台运行）...
pause >nul
