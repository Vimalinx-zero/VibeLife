# FlowStudy 打包与分发

## 📦 打包文件说明

### 核心文件

```
backend/
├── flowstudy.spec      # PyInstaller 配置文件
├── package.sh          # 自动化打包脚本
└── ...

scripts/
├── start.sh           # Linux 启动脚本
└── ...

release/
├── FlowStudy.exe       # Windows 可执行文件（打包后生成）
├── FlowStudy          # Linux 可执行文件（打包后生成）
└── INSTALL.md         # 安装说明文档
```

---

## 🚀 自动打包

### 前提条件

```bash
# 检查 Python 3
python3 --version

# 检查 Node.js 18+
node --version

# 检查 npm
npm --version
```

### 打包步骤

```bash
# 在项目根目录运行
./package.sh
```

### 打包流程

1. **构建前端** (`npm run build`)
   - 生成优化后的静态文件到 `frontend/dist/`

2. **初始化数据库** (可选)
   - 创建 SQLite 数据库
   - 插入种子测试数据

3. **打包 Windows 版本**
   - 使用 PyInstaller 创建 `FlowStudy.exe`
   - 包含前端静态文件
   - 包含数据库文件
   - 单文件可执行

4. **打包 Linux 版本**
   - 使用 PyInstaller 创建 `FlowStudy`
   - Linux 可执行文件

5. **复制到发布目录**
   - 输出到 `release/` 目录
   - 便于分发

---

## 📦 分发方式

### 方式 1: 直接下载

用户下载 `FlowStudy.exe` 或 `FlowStudy` 文件，双击运行。

### 方式 2: GitHub Release

```bash
# 1. 推送标签和文件
git push origin v1.0.0

# 2. 在 GitHub 上创建 Release
#   - 访问 https://github.com/vimalinx/flowstudy/releases/new
#   - 选择 tag: v1.0.0
#   - 上传 FlowStudy.exe (Windows)
#   - 上传 FlowStudy (Linux)
#   - 填写发布说明
```

### 方式 3: 安装包（未来）

可以创建 `.msi` 或 `.deb` 安装包：
- **Windows**: NSIS 或 Inno Setup
- **Linux**: debhelper 或 FPM
- **macOS**: py2app 或 PyInstaller + dmgbuild

---

## 📋 打包检查清单

### Windows
- [ ] FlowStudy.exe 可以独立运行（无需安装 Python）
- [ ] 前端静态文件正确包含
- [ ] 数据库文件正确路径
- [ ] 端口冲突检测和提示
- [ ] 防火墙提示
- [ ] 图标和元数据

### Linux
- [ ] FlowStudy 可以独立运行
- [ ] 可执行权限正确
- [ ] 系统库依赖检查
- [ ] 端口冲突检测
- [ ] systemd 服务文件（可选）

### 通用
- [ ] 数据库自动初始化
- [ ] 种子数据插入
- [ ] 日志记录
- [ ] 配置文件管理
- [ ] 错误处理和用户提示

---

## 🐛 常见打包问题

### 问题 1: PyInstaller 路径错误

**症状**: 打包后运行报错 "Failed to execute script"

**解决**:
```python
# 在 flowstudy.spec 中使用绝对路径
datas = [
    ('/absolute/path/to/flowstudy.db', '.'),
]
```

### 问题 2: 前端静态文件缺失

**症状**: 404 错误加载前端资源

**解决**:
```bash
# 确保前端已构建
cd frontend
npm run build

# 验证文件存在
ls -la dist/
```

### 问题 3: 数据库文件权限

**症状**: 无法写入数据库

**解决**:
```bash
# 确保数据库文件在用户目录
# 或在首次运行时复制到用户目录
```

---

## 📊 打包后文件大小

```
FlowStudy.exe (Windows): ~50-80 MB
FlowStudy (Linux):      ~45-70 MB
```

**减小体积建议**:
1. 使用 `--strip` 移除调试符号
2. 使用 UPX 压缩可执行文件
3. 精简依赖（移除未使用的库）
4. 使用虚拟环境减小 Python 库

---

## 🔧 高级配置

### 添加图标

创建 `icon.ico` (Windows) 和 `icon.png` (Linux)，然后在 `flowstudy.spec` 中：

```python
icon='icon.ico'  # Windows
# Linux 桌面文件会自动查找
```

### 添加版本信息

在 `flowstudy.spec` 中：

```python
exe = EXE(
    name='FlowStudy',
    version='1.0.0',
    description='智能学习管理平台',
    company='FlowStudy Team',
    ...
)
```

### 数字签名（Windows）

使用代码签名证书（如果有）：

```bash
signtool sign /f cert.pfx FlowStudy.exe
```

---

## 📝 自动化 CI/CD

### GitHub Actions 示例

创建 `.github/workflows/build.yml`:

```yaml
name: Build Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, ubuntu-latest]
        python-version: ['3.10', '3.11']

    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          pip install pyinstaller
          cd frontend && npm install

      - name: Build frontend
        run: |
          cd frontend
          npm run build

      - name: Package
        run: |
          ./package.sh

      - name: Upload Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            release/FlowStudy.exe
            release/FlowStudy
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 🎯 下一步

1. **测试打包流程**
   ```bash
   ./package.sh
   cd release
   ./FlowStudy  # Linux
   # 或在 Windows 上双击 FlowStudy.exe
   ```

2. **创建 GitHub Release**
   - 访问 https://github.com/vimalinx/flowstudy/releases/new
   - 上传打包文件
   - 填写发布说明

3. **分发到用户**
   - 下载链接
   - 或分享安装包
   - 或创建安装脚本

---

## 📖 更多资源

- [PyInstaller 官方文档](https://pyinstaller.org/)
- [Windows 打包最佳实践](https://docs.python.org/3/library/zipfile/)
- [Linux 打包最佳实践](https://tldp.org/)
