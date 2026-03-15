#!/bin/bash
# VibeLife 一键启动脚本 (WSL2)
# 功能：环境检查、依赖安装、启动服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 虚拟环境路径
VENV_DIR="$BACKEND_DIR/venv"

# PID 文件
PIDS_DIR="$PROJECT_DIR/.pids"
BACKEND_PID_FILE="$PIDS_DIR/backend.pid"
FRONTEND_PID_FILE="$PIDS_DIR/frontend.pid"

# 日志文件
LOGS_DIR="$PROJECT_DIR/logs"
BACKEND_LOG="$LOGS_DIR/backend.log"
FRONTEND_LOG="$LOGS_DIR/frontend.log"

# 创建必要的目录
mkdir -p "$PIDS_DIR"
mkdir -p "$LOGS_DIR"

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${MAGENTA}========================================${NC}"
    echo -e "${MAGENTA}$1${NC}"
    echo -e "${MAGENTA}========================================${NC}"
    echo ""
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# ==================== 环境检查函数 ====================

check_python() {
    print_step "检查 Python 环境..."

    if ! command_exists python3; then
        print_error "未找到 Python3，请先安装 Python 3.8+"
        print_info "安装命令: sudo apt install python3 python3-pip python3-venv"
        exit 1
    fi

    local python_version=$(python3 --version | awk '{print $2}')
    print_success "Python 版本: $python_version"

    # 检查 pip
    if ! command_exists pip3; then
        print_error "未找到 pip3"
        print_info "安装命令: sudo apt install python3-pip"
        exit 1
    fi

    print_success "Python 环境检查通过 ✓"
}

check_nodejs() {
    print_step "检查 Node.js 环境..."

    if ! command_exists node; then
        print_error "未找到 Node.js，请先安装 Node.js 16+"
        print_info "建议使用 nvm 安装: https://github.com/nvm-sh/nvm"
        exit 1
    fi

    local node_version=$(node --version)
    print_success "Node.js 版本: $node_version"

    if ! command_exists npm; then
        print_error "未找到 npm"
        exit 1
    fi

    local npm_version=$(npm --version)
    print_success "npm 版本: $npm_version"

    print_success "Node.js 环境检查通过 ✓"
}

# ==================== 虚拟环境管理 ====================

setup_venv() {
    print_step "检查 Python 虚拟环境..."

    if [ ! -d "$VENV_DIR" ]; then
        print_warning "虚拟环境不存在，正在创建..."
        python3 -m venv "$VENV_DIR"

        if [ $? -eq 0 ]; then
            print_success "虚拟环境创建成功 ✓"
        else
            print_error "虚拟环境创建失败"
            exit 1
        fi
    else
        print_success "虚拟环境已存在 ✓"
    fi
}

activate_venv() {
    source "$VENV_DIR/bin/activate"
}

install_backend_deps() {
    print_step "检查后端依赖..."

    local requirements_file="$BACKEND_DIR/requirements.txt"

    if [ ! -f "$requirements_file" ]; then
        print_warning "未找到 requirements.txt，创建默认版本..."
        cat > "$requirements_file" << 'EOF'
fastapi
uvicorn[standard]
sqlalchemy
python-multipart
pydantic
python-dotenv
EOF
        print_success "已创建 requirements.txt"
    fi

    # 检查是否需要安装依赖
    print_info "检查并安装依赖包..."
    activate_venv

    # 安装依赖
    pip install -q --upgrade pip
    pip install -q -r "$requirements_file"

    if [ $? -eq 0 ]; then
        print_success "后端依赖安装完成 ✓"
    else
        print_error "后端依赖安装失败"
        exit 1
    fi
}

install_frontend_deps() {
    print_step "检查前端依赖..."

    cd "$FRONTEND_DIR"

    if [ ! -f "package.json" ]; then
        print_error "未找到 package.json"
        exit 1
    fi

    if [ ! -d "node_modules" ]; then
        print_warning "node_modules 不存在，正在安装依赖..."
        print_info "这可能需要几分钟，请耐心等待..."

        npm install

        if [ $? -eq 0 ]; then
            print_success "前端依赖安装完成 ✓"
        else
            print_error "前端依赖安装失败"
            print_info "尝试手动安装: cd frontend && npm install"
            exit 1
        fi
    else
        print_success "前端依赖已安装 ✓"
    fi
}

# ==================== 服务管理 ====================

stop_services() {
    print_info "正在停止服务..."

    # 停止后端
    if [ -f "$BACKEND_PID_FILE" ]; then
        backend_pid=$(cat "$BACKEND_PID_FILE")
        if ps -p $backend_pid > /dev/null 2>&1; then
            kill $backend_pid
            print_success "后端服务已停止 (PID: $backend_pid)"
        fi
        rm -f "$BACKEND_PID_FILE"
    fi

    # 停止前端
    if [ -f "$FRONTEND_PID_FILE" ]; then
        frontend_pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p $frontend_pid > /dev/null 2>&1; then
            kill $frontend_pid
            print_success "前端服务已停止 (PID: $frontend_pid)"
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi

    # 清理端口占用（备用方案）
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 8000 仍被占用，尝试强制关闭..."
        lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    fi

    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 5173 仍被占用，尝试强制关闭..."
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    fi

    print_success "所有服务已停止"
}

check_status() {
    print_info "检查服务状态..."

    backend_running=false
    frontend_running=false

    if [ -f "$BACKEND_PID_FILE" ]; then
        backend_pid=$(cat "$BACKEND_PID_FILE")
        if ps -p $backend_pid > /dev/null 2>&1; then
            print_success "后端服务运行中 (PID: $backend_pid)"
            backend_running=true
        else
            print_warning "后端服务未运行"
            rm -f "$BACKEND_PID_FILE"
        fi
    else
        print_warning "后端服务未启动"
    fi

    if [ -f "$FRONTEND_PID_FILE" ]; then
        frontend_pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p $frontend_pid > /dev/null 2>&1; then
            print_success "前端服务运行中 (PID: $frontend_pid)"
            frontend_running=true
        else
            print_warning "前端服务未运行"
            rm -f "$FRONTEND_PID_FILE"
        fi
    else
        print_warning "前端服务未启动"
    fi

    echo ""
    if $backend_running && $frontend_running; then
        print_success "所有服务运行正常 ✓"
        echo ""
        print_info "🚀 前端地址: http://localhost:5173"
        print_info "🔧 后端地址: http://localhost:8000"
        print_info "📖 API 文档: http://localhost:8000/docs"
    else
        print_warning "部分服务未运行"
    fi
}

# ==================== 服务启动 ====================

start_services() {
    print_header "VibeLife 开发环境启动"

    # 1. 环境检查
    print_info "第 1 步：环境检查"
    check_python
    check_nodejs

    # 2. 虚拟环境设置
    print_info "第 2 步：虚拟环境配置"
    setup_venv

    # 3. 依赖安装
    print_info "第 3 步：依赖安装"
    install_backend_deps
    install_frontend_deps

    # 4. 检查端口占用
    print_info "第 4 步：端口检查"
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_error "端口 8000 已被占用"
        print_info "占用进程: $(lsof -ti:8000)"
        exit 1
    fi

    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_error "端口 5173 已被占用"
        print_info "占用进程: $(lsof -ti:5173)"
        exit 1
    fi

    print_success "端口检查通过 ✓"

    # 5. 检查是否已有服务运行
    if [ -f "$BACKEND_PID_FILE" ] || [ -f "$FRONTEND_PID_FILE" ]; then
        print_warning "检测到已有服务运行"
        read -p "是否重启服务？(y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            stop_services
            sleep 2
        else
            print_info "取消启动"
            exit 0
        fi
    fi

    # 6. 启动后端
    print_info "第 5 步：启动服务"
    print_info "启动后端服务 (FastAPI)..."

    cd "$BACKEND_DIR"
    activate_venv

    # 使用 nohup 在后台启动（FastAPI 使用 uvicorn）
    nohup uvicorn main:app --host 0.0.0.0 --port 8000 > "$BACKEND_LOG" 2>&1 &
    backend_pid=$!
    echo $backend_pid > "$BACKEND_PID_FILE"

    # 等待后端启动
    sleep 3

    if ps -p $backend_pid > /dev/null 2>&1; then
        # 检查是否真的启动成功
        sleep 2
        if ps -p $backend_pid > /dev/null 2>&1; then
            print_success "后端服务已启动 (PID: $backend_pid) ✓"
            print_info "后端日志: $BACKEND_LOG"
        else
            print_error "后端服务启动失败，请查看日志"
            tail -n 20 "$BACKEND_LOG"
            exit 1
        fi
    else
        print_error "后端服务启动失败"
        exit 1
    fi

    # 7. 启动前端
    print_info "启动前端服务 (Vite)..."

    cd "$FRONTEND_DIR"

    # 使用 nohup 在后台启动
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    frontend_pid=$!
    echo $frontend_pid > "$FRONTEND_PID_FILE"

    # 等待前端启动
    sleep 5

    if ps -p $frontend_pid > /dev/null 2>&1; then
        print_success "前端服务已启动 (PID: $frontend_pid) ✓"
        print_info "前端日志: $FRONTEND_LOG"
    else
        print_error "前端服务启动失败，请查看日志"
        tail -n 20 "$FRONTEND_LOG"
        exit 1
    fi

    # 8. 启动成功提示
    print_header "所有服务启动成功！"

    echo -e "${GREEN}✓${NC} 后端服务运行在: ${BLUE}http://localhost:8000${NC}"
    echo -e "${GREEN}✓${NC} 前端服务运行在: ${BLUE}http://localhost:5173${NC}"
    echo -e "${GREEN}✓${NC} API 文档地址: ${BLUE}http://localhost:8000/docs${NC}"
    echo ""
    print_info "📝 查看实时日志:"
    echo -e "   ${CYAN}后端:${NC} tail -f $BACKEND_LOG"
    echo -e "   ${CYAN}前端:${NC} tail -f $FRONTEND_LOG"
    echo ""
    print_info "🔧 管理命令:"
    echo -e "   ${CYAN}停止:${NC} $0 stop"
    echo -e "   ${CYAN}重启:${NC} $0 restart"
    echo -e "   ${CYAN}状态:${NC} $0 status"
    echo ""
}

# ==================== 其他功能 ====================

view_logs() {
    if [ "$1" = "backend" ]; then
        tail -f "$BACKEND_LOG"
    elif [ "$1" = "frontend" ]; then
        tail -f "$FRONTEND_LOG"
    else
        print_info "用法: $0 logs [backend|frontend]"
    fi
}

clean_all() {
    print_warning "这将清除所有生成的文件（虚拟环境、日志、PID 文件）"
    read -p "确定要继续吗？(y/n): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "正在清理..."

        stop_services 2>/dev/null || true

        rm -rf "$VENV_DIR"
        rm -rf "$FRONTEND_DIR/node_modules"
        rm -rf "$PIDS_DIR"
        rm -rf "$LOGS_DIR"

        print_success "清理完成 ✓"
    else
        print_info "取消清理"
    fi
}

show_help() {
    cat << EOF
${MAGENTA}VibeLife 开发环境管理脚本${NC}

${YELLOW}用法:${NC} $0 [命令]

${YELLOW}命令:${NC}
  start              启动所有服务（默认，包含环境检查）
  stop               停止所有服务
  restart            重启所有服务
  status             查看服务状态
  logs [backend|frontend]  查看实时日志
  clean              清理所有生成文件（虚拟环境、依赖等）
  setup              仅设置环境（不启动服务）
  help               显示此帮助信息

${YELLOW}示例:${NC}
  $0 start          # 启动服务（自动检查环境和安装依赖）
  $0 stop           # 停止服务
  $0 logs backend   # 查看后端日志
  $0 clean          # 清理环境

${YELLOW}首次运行:${NC}
  脚本会自动：
  ✓ 检查 Python 和 Node.js 环境
  ✓ 创建 Python 虚拟环境
  ✓ 安装后端依赖（requirements.txt）
  ✓ 安装前端依赖（package.json）
  ✓ 启动前后端服务

EOF
}

# 仅设置环境
setup_only() {
    print_header "VibeLife 环境配置"

    print_info "第 1 步：环境检查"
    check_python
    check_nodejs

    print_info "第 2 步：虚拟环境配置"
    setup_venv

    print_info "第 3 步：依赖安装"
    install_backend_deps
    install_frontend_deps

    print_header "环境配置完成！"
    print_success "现在可以运行: $0 start"
}

# ==================== 主程序 ====================

main() {
    case "${1:-start}" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 2
            start_services
            ;;
        status)
            check_status
            ;;
        logs)
            view_logs "$2"
            ;;
        clean)
            clean_all
            ;;
        setup)
            setup_only
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主程序
main "$@"
