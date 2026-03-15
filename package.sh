#!/bin/bash
# VibeLife 打包脚本
# 用于构建前端并执行 PyInstaller 打包

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="VibeLife"
SPEC_FILE="$PROJECT_DIR/vibelife.spec"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  VibeLife 打包脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查环境
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}错误: 未找到 python3${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: 未找到 npm${NC}"
    exit 1
fi

# 检查 PyInstaller
if ! python3 -c "import PyInstaller" 2>/dev/null; then
    echo -e "${YELLOW}正在安装 PyInstaller...${NC}"
    pip3 install pyinstaller
fi

# 检查打包配置
if [ ! -f "$SPEC_FILE" ]; then
    echo -e "${RED}错误: 未找到打包配置 $SPEC_FILE${NC}"
    echo -e "${YELLOW}提示: 旧的打包配置已失效，需要重新生成 VibeLife 的 PyInstaller spec。${NC}"
    exit 1
fi

# 步骤 1: 构建前端
echo -e "${YELLOW}步骤 1/4: 构建前端...${NC}"
cd "$PROJECT_DIR/frontend"
npm install
npm run build
cd ..

# 步骤 2: 初始化数据库
echo -e "${YELLOW}步骤 2/4: 初始化数据库...${NC}"
cd backend
python3 -c "
from database import engine
from models import Base

# 创建所有表
Base.metadata.create_all(bind=engine)

print('数据库初始化完成')
"

# 步骤 3: 打包 Windows 版本
echo -e "${YELLOW}步骤 3/4: 打包 Windows 版本...${NC}"
pyinstaller "$SPEC_FILE" --onefile --clean --noconfirm

# 步骤 4: 打包 Linux 版本
echo -e "${YELLOW}步骤 4/4: 打包 Linux 版本...${NC}"
pyinstaller "$SPEC_FILE" --onefile --clean --noconfirm

# 清理临时文件
rm -rf build/

# 创建安装包目录结构
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  打包完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${GREEN}输出目录:${NC}"
echo "  Windows: dist/${APP_NAME}.exe"
echo "  Linux:   dist/${APP_NAME}"
echo ""

# 复制到发布目录
mkdir -p release
cp "dist/${APP_NAME}.exe" release/ 2>/dev/null || true
cp "dist/${APP_NAME}" release/ 2>/dev/null || true

echo -e "${GREEN}已复制到 release/ 目录${NC}"
echo ""
echo -e "${YELLOW}使用方法:${NC}"
echo "  Windows: 双击 ${APP_NAME}.exe"
echo "  Linux:   ./${APP_NAME}"
echo ""
