@echo off
REM FlowStudy WSL2 快捷启动脚本
REM 从 Windows 直接启动 WSL2 中的开发环境

title FlowStudy WSL2 Launcher

echo ========================================
echo    FlowStudy WSL2 启动中...
echo ========================================
echo.

REM 检查 WSL 是否可用
wsl --list --quiet >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] WSL 未安装或未启用
    echo 请先安装并配置 WSL2
    pause
    exit /b 1
)

REM 启动服务
wsl bash -c "cd ~/Programs/flowstudy && ./start.sh start"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   服务启动成功！
    echo ========================================
    echo.
    echo 前端地址: http://localhost:5173
    echo 后端地址: http://localhost:8000
    echo.
    echo 按任意键打开浏览器...
    pause >nul
    start http://localhost:5173
) else (
    echo.
    echo ========================================
    echo   启动失败，请检查错误信息
    echo ========================================
    pause
)

REM 不立即关闭窗口，方便查看输出
