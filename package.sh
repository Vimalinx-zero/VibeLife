#!/bin/bash
# FlowStudy 打包脚本
# 用于打包成 Windows 和 Linux 可执行文件

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  FlowStudy 打包脚本${NC}"
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

# 步骤 1: 构建前端
echo -e "${YELLOW}步骤 1/4: 构建前端...${NC}"
cd "$(dirname "$0")/frontend"
npm install
npm run build
cd ..

# 步骤 2: 初始化数据库
echo -e "${YELLOW}步骤 2/4: 初始化数据库...${NC}"
cd backend
python3 -c "
from database import engine
from models import Base
from sqlalchemy import text

# 创建所有表
Base.metadata.create_all(bind=engine)

# 插入种子数据
from database import SessionLocal
from crud import init_seed_data
db = SessionLocal()
init_seed_data(db)
db.commit()
db.close()

print('数据库初始化完成')
"

# 步骤 3: 打包 Windows 版本
echo -e "${YELLOW}步骤 3/4: 打包 Windows 版本...${NC}"
pyinstaller flowstudy.spec --onefile --clean --noconfirm

# 步骤 4: 打包 Linux 版本
echo -e "${YELLOW}步骤 4/4: 打包 Linux 版本...${NC}"
pyinstaller flowstudy.spec --onefile --clean --noconfirm

# 清理临时文件
rm -rf build/

# 创建安装包目录结构
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  打包完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${GREEN}输出目录:${NC}"
echo "  Windows: dist/FlowStudy.exe"
echo "  Linux:   dist/FlowStudy"
echo ""

# 复制到发布目录
mkdir -p release
cp dist/FlowStudy.exe release/
cp dist/FlowStudy release/

echo -e "${GREEN}已复制到 release/ 目录${NC}"
echo ""
echo -e "${YELLOW}使用方法:${NC}"
echo "  Windows: 双击 FlowStudy.exe"
echo "  Linux:   ./FlowStudy"
echo ""
