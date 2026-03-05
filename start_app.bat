@echo off
echo ==========================================
echo       FlowStudy One-Click Launcher
echo ==========================================

:: 1. 切换到当前脚本所在的目录 (确保路径正确)
cd /d "%~dp0"

echo [1/3] Starting Python Backend...
:: 打开新窗口运行后端
start "FlowStudy Backend (Python)" cmd /k "cd backend && uvicorn main:app --reload"

echo [2/3] Starting React Frontend...
:: 打开新窗口运行前端
start "FlowStudy Frontend (React)" cmd /k "cd frontend && npm run dev"

echo [3/3] Opening Browser...
:: 等待 3 秒让服务启动，然后自动打开浏览器
timeout /t 3 >nul
start http://localhost:5173

echo.
echo Success! Minimize this window or close it.
:: 这里的 pause 是为了让你看到上面的提示，不想看可以去掉
exit