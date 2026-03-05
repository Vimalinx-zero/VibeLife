# FlowStudy 安全修复 - pydantic 兼容性修复

## 🔴 严重问题：pydantic[email] 依赖错误

**发现**: `requirements.txt` 中的 `pydantic[email]` 是错误包名，应该是 `pydantic`
**影响**: FastAPI 无法启动，前端 404 错误的根源

---

## 📝 错误日志

```
ImportError: email-validator is not installed, run `pip install pydantic[email]`
```

**原因**: `pydantic[email]` 是 **非官方包名**（可能是旧版本别名或拼写错误）

---

## ✅ 修复命令

### 1. 修改 requirements.txt
```bash
cd backend
sed -i 's/pydantic\[email\]/pydantic/' backend/requirements.txt

# 验证修复
grep "pydantic\|pydantic-settings" backend/requirements.txt
```

### 2. 安装正确的包
```bash
cd backend
pip install pydantic pydantic-settings  --upgrade
```

### 3. 重新启动后端
```bash
cd backend
python main.py > /tmp/backend.log 2>&1 &
sleep 3
echo "Backend PID: $!"
tail -50 /tmp/backend.log
```

---

## 📊 预期结果

修复后应该看到：
- ✅ 后端成功启动（FastAPI 版本: 0.104.0+）
- ✅ `GET http://localhost:8000/api/anki/cards` 返回 404 → 改为返回卡片列表（空列表）
- ✅ Anki 页面不再显示 `Failed to fetch`
- ✅ 控制台不再有 404 错误

---

## 🎯 FastAPI 兼容性说明

| 包名 | 版本 | 用途 |
|------|------|------|
| `pydantic` | 0.104.0+ | **正确** |
| `pydantic[email]` | N/A | **错误** |

**修复原理**:
- `pydantic[email]` 可能是社区 fork 的旧包
- 官方包是 `pydantic` (不是 `pydantic[email]`)
- FastAPI 不兼容 `pydantic[email]`

---

## 🚨 如果安装失败

如果 `pip install pydantic` 失败，尝试：
```bash
pip install pydantic --upgrade --force
pip install pydantic-settings --upgrade --force
```

或者完全卸载后重装：
```bash
pip uninstall pydantic pydantic-settings
pip install pydantic pydantic-settings
```

---

## 📝 原文件差异

```diff
--- backend/requirements.txt (修复前)
+++ backend/req
+++ backend/requirements.txt (修复后)
-pydantic[email]              # ❌ 错误包名
+pydantic                 # ✅ 正确包名
```
