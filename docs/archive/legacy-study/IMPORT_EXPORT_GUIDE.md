# FlowStudy 数据导入导出使用指南

## 🎯 功能概述

FlowStudy 提供了完整的数据导入导出功能，支持：
- ✅ 题库导入导出
- ✅ 错题本导出
- ✅ 笔记导出
- ✅ 完整数据备份
- ✅ 批量导入
- ✅ 数据统计分析

---

## 📤 导出功能

### 1. 导出题库

**API 端点**: `GET /api/data/export/questions`

**参数**:
- `format`: 导出格式，目前仅支持 `json`
- `subject`: 学科筛选（可选），如 `physics`、`math`

**示例**:

```bash
# 导出所有题目
curl http://localhost:8000/api/data/export/questions -o questions.json

# 仅导出物理题
curl "http://localhost:8000/api/data/export/questions?subject=physics" -o physics_questions.json
```

**返回格式**:
```json
{
  "version": "1.0.0",
  "batch": true,
  "metadata": {
    "total": 100,
    "exported_at": "2025-12-25T18:00:00Z",
    "filter": "all"
  },
  "questions": [...]
}
```

### 2. 导出错题本

**API 端点**: `GET /api/data/export/mistakes`

**参数**:
- `user_id`: 用户ID（默认 `u_alex`）

**示例**:
```bash
curl http://localhost:8000/api/data/export/mistakes -o my_mistakes.json
```

### 3. 导出笔记

**API 端点**: `GET /api/data/export/notes`

**示例**:
```bash
curl http://localhost:8000/api/data/export/notes -o my_notes.json
```

### 4. 导出所有数据（完整备份）

**API 端点**: `GET /api/data/export/all`

**示例**:
```bash
curl http://localhost:8000/api/data/export/all -o flowstudy_backup.json
```

**包含内容**:
- 所有题目
- 错题记录
- 笔记和文件夹
- 用户画像（标签权重等）

---

## 📥 导入功能

### 1. 导入题目

**API 端点**: `POST /api/data/import/questions`

**请求体**:

#### 单题导入
```json
{
  "version": "1.0.0",
  "question": {
    "meta": {
      "id": "q_phys_002",
      "source": "manual",
      "created_at": "2025-12-25T18:00:00Z"
    },
    "base_info": {
      "subject": "physics",
      "type": "single_choice",
      "difficulty": 3,
      "macro_tags": {...}
    },
    "content": {...},
    "steps": [...],
    "summary": {...}
  }
}
```

#### 批量导入
```json
{
  "version": "1.0.0",
  "batch": true,
  "questions": [
    { /* 题目1 */ },
    { /* 题目2 */ },
    { /* 题目3 */ }
  ],
  "metadata": {
    "total": 3,
    "import_source": "高考真题2015-2020"
  }
}
```

**示例**:
```bash
curl -X POST http://localhost:8000/api/data/import/questions \
  -H "Content-Type: application/json" \
  -d @questions.json
```

**响应**:
```json
{
  "success": true,
  "imported": 3,
  "total": 3,
  "errors": []
}
```

### 2. 导入完整备份

**API 端点**: `POST /api/data/import/backup`

**⚠️ 警告**: 此操作会覆盖现有数据！

**示例**:
```bash
curl -X POST http://localhost:8000/api/data/import/backup \
  -H "Content-Type: application/json" \
  -d @flowstudy_backup.json
```

---

## 📊 数据统计

**API 端点**: `GET /api/data/stats`

**示例**:
```bash
curl http://localhost:8000/api/data/stats
```

**响应**:
```json
{
  "questions": 100,
  "mistakes": 15,
  "notes": 8,
  "folders": 3,
  "subjects": {
    "physics": 40,
    "math": 35,
    "english": 25
  }
}
```

---

## 🔧 快捷脚本

### 导出所有数据

```bash
#!/bin/bash
# export_all.sh

BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "正在导出题库..."
curl http://localhost:8000/api/data/export/questions \
  -o "$BACKUP_DIR/questions_$TIMESTAMP.json"

echo "正在导出错题本..."
curl http://localhost:8000/api/data/export/mistakes \
  -o "$BACKUP_DIR/mistakes_$TIMESTAMP.json"

echo "正在导出笔记..."
curl http://localhost:8000/api/data/export/notes \
  -o "$BACKUP_DIR/notes_$TIMESTAMP.json"

echo "正在导出完整备份..."
curl http://localhost:8000/api/data/export/all \
  -o "$BACKUP_DIR/backup_$TIMESTAMP.json"

echo "导出完成！文件保存在 $BACKUP_DIR/"
```

### 批量导入题目

```bash
#!/bin/bash
# import_questions.sh

if [ -z "$1" ]; then
  echo "用法: ./import_questions.sh <questions.json>"
  exit 1
fi

echo "正在导入题目..."
curl -X POST http://localhost:8000/api/data/import/questions \
  -H "Content-Type: application/json" \
  -d @$1

echo "导入完成！"
```

---

## 📋 题目格式规范

详细的格式规范请查看: [QUESTION_SCHEMA.md](../QUESTION_SCHEMA.md)

### 最简单的题目示例

```json
{
  "meta": {
    "id": "q_001",
    "source": "manual"
  },
  "base_info": {
    "subject": "physics",
    "type": "single_choice",
    "difficulty": 3
  },
  "content": {
    "stem": "题目内容"
  },
  "steps": [
    {
      "step_index": 0,
      "step_id": "s_001",
      "interaction_type": "single_choice",
      "stem": "选择正确答案",
      "options": [
        {
          "key": "A",
          "content": "选项A",
          "is_correct": false
        },
        {
          "key": "B",
          "content": "选项B",
          "is_correct": true
        }
      ]
    }
  ],
  "summary": {
    "answer": "B",
    "explanation": "解析说明"
  }
}
```

---

## 🤖 拍照识题数据流

### 未来功能预告

当拍照识题功能实现后，数据流如下：

```
1. 用户拍照上传
   ↓
2. OCR 文字识别
   返回: { "text": "识别的文本", "confidence": 0.95 }
   ↓
3. 智能解析
   返回: { "stem": "...", "options": [...], "subject": "physics" }
   ↓
4. AI 生成解析
   返回: { "answer": "B", "explanation": "...", "diagnosis": [...] }
   ↓
5. 自动入库
   调用: POST /api/data/import/questions
```

### OCR API 集成示例（伪代码）

```python
# 未来实现
async def process_photo(image_file):
    # 1. OCR 识别
    ocr_result = await ocr_service.recognize(image_file)

    # 2. 智能解析
    parsed = await parser_service.parse(ocr_result.text)

    # 3. AI 增强
    enhanced = await ai_service.enhance(parsed)

    # 4. 导入题库
    await import_questions(enhanced)

    return enhanced
```

---

## 💡 使用技巧

### 1. 定期备份

建议每周备份一次完整数据：

```bash
# 添加到 crontab
0 0 * * 0 /path/to/export_all.sh
```

### 2. 批量导入高考真题

从其他平台获取题目后，转换为标准格式，然后批量导入。

### 3. 数据格式验证

导入前可以使用 JSON Schema 验证工具检查格式：

```bash
# 使用 ajv-cli
npx ajv validate -s QUESTION_SCHEMA.json -d questions.json
```

### 4. 导出分享

导出的题目可以直接分享给其他人，他们会调用导入接口添加到自己的题库。

---

## 🐛 常见问题

### Q1: 导入时提示版本错误

**A**: 确保 JSON 文件包含 `"version": "1.0.0"` 字段。

### Q2: 导入后题目重复

**A**: 系统会自动更新已存在的题目（基于 `meta.id`）。

### Q3: 导出文件太大

**A**: 可以使用 `subject` 参数分学科导出。

### Q4: 如何验证导入成功

**A**: 调用 `/api/data/stats` API 查看统计信息。

---

## 📚 相关文档

- [题目数据格式规范](../QUESTION_SCHEMA.md)
- [API 文档](http://localhost:8000/docs)
- [启动脚本指南](../SCRIPT_GUIDE.md)

---

## 🔄 更新日志

### v1.0.0 (2025-12-25)
- ✨ 首次发布导入导出功能
- ✨ 标准化题目数据格式
- ✨ 支持批量导入导出
- ✨ 为拍照识题预留接口
