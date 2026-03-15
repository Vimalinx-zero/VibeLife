# AI 导入数据格式标准

## 📋 JSON Schema

```json
{
  "version": "1.0",
  "source": "ai_agent",
  "data": {
    "question": {
      "id": "auto_generated",
      "subject": "物理/数学/化学/生物/英语/其他",
      "type": "single/composite",
      "difficulty": 1-5,
      "macro_tags": {
        "competency": ["力学", "电磁学"],
        "cognitive": ["理解", "应用", "分析"],
        "misconception": ["惯性误区"]
      },
      "content": {
        "stem": "题目描述",
        "media": {
          "type": "image/latex/text",
          "url": "图片URL或LaTeX代码"
        },
        "options": [
          {"id": "A", "text": "选项A", "is_correct": true},
          {"id": "B", "text": "选项B", "is_correct": false},
          {"id": "C", "text": "选项C", "is_correct": false},
          {"id": "D", "text": "选项D", "is_correct": false}
        ]
      },
      "steps": [
        {
          "step_id": 1,
          "question": "步骤1的小问题",
          "options": [...],
          "explanation": "步骤1的解析"
        }
      ],
      "summary": {
        "solution": "解题思路",
        "key_points": ["关键点1", "关键点2"],
        "common_mistakes": ["常见错误1"]
      }
    },

    "note": {
      "title": "相关知识点笔记",
      "content": "# 知识点详解\n\n## 定义\n...",
      "tags": ["物理", "力学", "重点"],
      "folder_id": "folder_1"  // 可选，指定保存到哪个文件夹
    },

    "analysis": {
      "title": "题目详细解析",
      "content": "## 解题思路\n\n## 易错点分析\n\n## 扩展知识",
      "related_question_id": "auto_generated"
    },

    "anki_cards": [
      {
        "front": "什么是牛顿第一定律？",
        "back": "牛顿第一定律：物体在不受外力或合外力为零时，保持静止或匀速直线运动状态",
        "tags": ["物理", "力学", "基础"],
        "deck": "物理::力学"
      },
      {
        "front": "惯性大小的量度是什么？",
        "back": "质量是惯性大小的唯一量度，质量越大，惯性越大",
        "tags": ["物理", "力学", "概念"],
        "deck": "物理::力学"
      }
    ]
  }
}
```

## 🤖 AI Agent Prompt 模板

```markdown
你是 FlowStudy 的学习助手。你的任务是从用户上传的错题图片中提取结构化数据。

## 工作流程

1. **识别题目**
   - 提取题目文本
   - 识别题目类型（单选/多选/复合）
   - 判断难度等级（1-5）
   - 提取所有选项

2. **生成笔记**
   - 总结知识点
   - 提取关键概念
   - 标注学科和标签

3. **撰写解析**
   - 解题思路
   - 易错点分析
   - 扩展知识

4. **制作 Anki 卡片**
   - 基于知识点生成 3-5 张卡片
   - 正面提问，背面回答
   - 标注难度标签

## 输出格式

严格按照上面的 JSON Schema 输出，确保：
- 所有字段完整
- JSON 格式正确
- 数学公式使用 LaTeX
- 代码块使用 Markdown

## 示例

【输入图片】
[用户上传的错题图片]

【输出 JSON】
{
  "version": "1.0",
  ...
}
```
