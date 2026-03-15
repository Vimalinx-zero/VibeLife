# FlowStudy 题目数据格式规范

## 📋 版本信息

- **版本**: v1.0.0
- **更新日期**: 2025-12-25
- **适用场景**: 个人题库、拍照识题、批量导入导出

---

## 🎯 设计原则

1. **结构化**: 便于AI解析和自动处理
2. **可扩展**: 支持未来新增字段
3. **向后兼容**: 支持多版本共存
4. **标准化**: 统一的标签体系和格式

---

## 📦 完整题目 JSON Schema

### 基础结构

```json
{
  "version": "1.0.0",
  "question": {
    // ==================== 元数据 ====================
    "meta": {
      "id": "q_phys_001",
      "source": "manual",
      "created_at": "2025-12-25T18:00:00Z",
      "updated_at": "2025-12-25T18:00:00Z",
      "author": "user_alex",
      "verified": true
    },

    // ==================== 基础信息 ====================
    "base_info": {
      "subject": "physics",
      "type": "single_choice",
      "difficulty": 3,
      "estimated_time": 120,
      "macro_tags": {
        "scenario_model": "经典力学",
        "competency": "应用",
        "grade": "高中",
        "chapter": "牛顿运动定律"
      }
    },

    // ==================== 题目内容 ====================
    "content": {
      "stem": "一个质量为 2kg 的物体，在光滑水平面上受到一个 10N 的水平拉力作用，求物体的加速度。",
      "media": {
        "image_url": null,
        "audio_url": null,
        "video_url": null
      },
      "parsing": null
    },

    // ==================== 题目步骤 ====================
    "steps": [
      {
        "step_index": 0,
        "step_id": "s_001",
        "interaction_type": "single_choice",
        "stem": "根据牛顿第二定律，物体的加速度是多少？",
        "analysis": "使用公式 F = ma",
        "options": [
          {
            "key": "A",
            "content": "2 m/s²",
            "is_correct": false,
            "gain_micro_tags": ["基础计算"],
            "diagnosis": {
              "knowledge_gap": ["牛顿第二定律公式"],
              "cognitive_flaw": "计算错误",
              "severity": "low",
              "hint": "F = ma, 注意单位的统一"
            }
          },
          {
            "key": "B",
            "content": "5 m/s²",
            "is_correct": true,
            "gain_micro_tags": ["牛顿第二定律", "基础计算"],
            "diagnosis": null
          },
          {
            "key": "C",
            "content": "10 m/s²",
            "is_correct": false,
            "gain_micro_tags": [],
            "diagnosis": {
              "knowledge_gap": ["加速度概念"],
              "cognitive_flaw": "概念混淆",
              "severity": "medium",
              "hint": "加速度不是力，需要用 F=ma 计算"
            }
          },
          {
            "key": "D",
            "content": "20 m/s²",
            "is_correct": false,
            "gain_micro_tags": [],
            "diagnosis": {
              "knowledge_gap": ["数值计算"],
              "cognitive_flaw": "粗心",
              "severity": "low",
              "hint": "检查 a = F/m 的计算"
            }
          }
        ]
      }
    ],

    // ==================== 总结解析 ====================
    "summary": {
      "answer": "B",
      "explanation": "根据牛顿第二定律 F = ma，得 a = F/m = 10N/2kg = 5m/s²",
      "key_points": [
        "牛顿第二定律公式 F=ma",
        "力的单位是牛顿(N)，质量单位是千克(kg)",
        "加速度单位是 m/s²"
      ],
      "extended_reading": null
    }
  }
}
```

---

## 🔧 字段详细说明

### 1. meta（元数据）

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `id` | string | ✅ | 题目唯一标识 | `"q_phys_001"` |
| `source` | string | ✅ | 来源 | `manual`/`ocr`/`import` |
| `created_at` | ISO8601 | ✅ | 创建时间 | `"2025-12-25T18:00:00Z"` |
| `updated_at` | ISO8601 | ✅ | 更新时间 | `"2025-12-25T18:00:00Z"` |
| `author` | string | ❌ | 创建者 | `"user_alex"` |
| `verified` | boolean | ❌ | 是否已验证 | `true` |

### 2. base_info（基础信息）

| 字段 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| `subject` | string | ✅ | 学科 | `physics`/`math`/`chemistry`/`biology`/`english`/`chinese` |
| `type` | string | ✅ | 题型 | `single_choice`/`multiple_choice`/`fill_blank`/`essay`/`composite` |
| `difficulty` | integer | ✅ | 难度 | `1-5` (1=简单, 5=困难) |
| `estimated_time` | integer | ❌ | 预估用时(秒) | `120` |
| `macro_tags` | object | ✅ | 宏观标签 | 见下文 |

#### macro_tags 结构

```json
{
  "scenario_model": "经典力学",        // 场景模型
  "competency": "应用",               // 能力层级
  "grade": "高中",                   // 年级
  "chapter": "牛顿运动定律",          // 章节
  "topic": "牛顿第二定律",            // 知识点
  "exam_type": "高考"                // 考试类型（可选）
}
```

### 3. content（题目内容）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `stem` | string | ✅ | 题干文本（支持 Markdown） |
| `media` | object | ❌ | 多媒体资源 |
| `parsing` | string | ❌ | 题目解析（可选） |

#### media 结构

```json
{
  "image_url": "https://...",     // 图片URL
  "audio_url": null,              // 音频URL
  "video_url": null,              // 视频URL
  "image_base64": null            // Base64编码图片（用于OCR识别）
}
```

### 4. steps（题目步骤）

支持多步骤题目（如综合题、复合题）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `step_index` | integer | ✅ | 步骤索引（从0开始） |
| `step_id` | string | ✅ | 步骤唯一标识 |
| `interaction_type` | string | ✅ | 交互类型 |
| `stem` | string | ✅ | 步骤题干 |
| `analysis` | string | ❌ | 步骤分析 |
| `options` | array | ✅ | 选项列表 |

#### interaction_type 类型

- `single_choice` - 单选题
- `multiple_choice` - 多选题
- `fill_blank` - 填空题
- `essay` - 解答题
- `calculation` - 计算题

### 5. options（选项）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `key` | string | ✅ | 选项标识（A/B/C/D） |
| `content` | string | ✅ | 选项内容 |
| `is_correct` | boolean | ✅ | 是否正确 |
| `gain_micro_tags` | array | ❌ | 选对获得的标签 |
| `diagnosis` | object | ❌ | 选错的诊断 |

#### diagnosis 结构（错误诊断）

```json
{
  "knowledge_gap": ["牛顿第二定律公式"],     // 知识盲区
  "cognitive_flaw": "计算错误",             // 思维缺陷
  "severity": "low",                        // 错误严重程度
  "hint": "F = ma, 注意单位的统一"          // 提示信息
}
```

**severity 级别**：
- `low` - 轻微错误（粗心、计算错误）
- `medium` - 中等错误（概念混淆）
- `high` - 严重错误（完全不会）

### 6. summary（总结解析）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `answer` | string | ✅ | 答案 |
| `explanation` | string | ✅ | 解析说明 |
| `key_points` | array | ❌ | 关键知识点 |
| `extended_reading` | string | ❌ | 拓展阅读 |

---

## 🏷️ 标签体系规范

### 学科（subject）

```json
["physics", "math", "chemistry", "biology", "english", "chinese", "history", "geography"]
```

### 题型（type）

```json
["single_choice", "multiple_choice", "fill_blank", "essay", "composite"]
```

### 能力层级（competency）

```json
["记忆", "理解", "应用", "分析", "评价", "创造"]
```

### 思维缺陷类型（cognitive_flaw）

```json
["粗心", "概念混淆", "计算错误", "逻辑错误", "审题不清", "知识盲区", "方法错误"]
```

---

## 📥 批量导入格式

### JSON 数组格式

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
    "import_source": "高考真题2015-2020",
    "imported_at": "2025-12-25T18:00:00Z"
  }
}
```

### CSV 格式（简化版）

用于简单的单选题批量导入：

```csv
id,subject,type,difficulty,stem,option_a,option_b,option_c,option_d,correct_answer,explanation
q_001,physics,single_choice,3,题干内容,选项A,选项B,选项C,选项D,B,解析说明
```

---

## 🤖 拍照识题数据流

### 1. OCR 识别阶段

```json
{
  "stage": "ocr",
  "raw_image": {
    "format": "jpeg",
    "size": 1024000,
    "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  },
  "ocr_result": {
    "text": "识别出的文本内容",
    "confidence": 0.95,
    "provider": "tencent_ocr"
  }
}
```

### 2. 智能解析阶段

```json
{
  "stage": "parsing",
  "parsed_question": {
    "stem": "提取的题干",
    "options": ["A选项", "B选项", "C选项", "D选项"],
    "confidence": 0.88
  },
  "auto_tagging": {
    "subject": "physics",
    "topics": ["牛顿定律", "加速度"],
    "difficulty": 3,
    "confidence": 0.82
  }
}
```

### 3. AI 生成解析

```json
{
  "stage": "ai_enhancement",
  "generated_content": {
    "answer": "B",
    "explanation": "AI生成的解析",
    "key_points": ["关键点1", "关键点2"],
    "diagnosis": [
      {
        "option": "A",
        "knowledge_gap": ["标签1"],
        "cognitive_flaw": "粗心",
        "severity": "low"
      }
    ]
  }
}
```

### 4. 最终整合

```json
{
  "version": "1.0.0",
  "question": {
    // 符合本规范的完整题目结构
  },
  "provenance": {
    "source": "ocr",
    "original_image": "https://...jpg",
    "ocr_confidence": 0.95,
    "ai_generated": true,
    "verified": false
  }
}
```

---

## ✅ 数据验证

### 必填字段检查清单

- [ ] meta.id
- [ ] meta.source
- [ ] meta.created_at
- [ ] base_info.subject
- [ ] base_info.type
- [ ] base_info.difficulty
- [ ] base_info.macro_tags
- [ ] content.stem
- [ ] steps (至少一个步骤)
- [ ] steps[].options (至少两个选项)
- [ ] summary.answer
- [ ] summary.explanation

### 格式验证规则

1. **ID 格式**: `{subject}_{type}_{number}` (例: `q_phys_001`)
2. **难度范围**: 1-5 的整数
3. **选项数量**: 单选题至少2个，多选题至少3个
4. **正确答案**: 至少有一个选项为 true
5. **标签格式**: 使用中文，避免特殊字符

---

## 📤 导出格式

### 单题导出

文件名: `{id}.json`

### 批量导出

文件名: `questions_batch_{timestamp}.json`

格式:
```json
{
  "version": "1.0.0",
  "export_info": {
    "total": 100,
    "subjects": ["physics", "math"],
    "date_range": {
      "start": "2025-01-01",
      "end": "2025-12-25"
    }
  },
  "questions": [...]
}
```

---

## 🔄 版本迁移

### v0.x → v1.0

主要变更：
1. 添加 `version` 字段
2. 规范化 `macro_tags` 结构
3. 增强 `diagnosis` 字段
4. 添加 `provenance` 追踪

迁移脚本示例见: `/backend/scripts/migrate_v0_to_v1.py`

---

## 📚 示例题目库

完整示例见: `/examples/sample_questions.json`

包含各学科、各难度的示例题目。
