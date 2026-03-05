import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { useToast } from "../context/ToastContext";
import * as workbenchApi from "../utils/workbenchApi";
import { AIImportResponse } from "../types";

const Icons = {
  ArrowLeft: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
  Copy: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-.98 0-1.813.626-2.083 1.5M11 16.5h5.25M5.25 11.5h8.25M9 16.5h3.75M6.75 19.5H12a3.75 3.75 0 003.75-3.75V6.75A3.75 3.75 0 0012 3H6.75A3.75 3.75 0 003 6.75v9A3.75 3.75 0 006.75 19.5z" /></svg>,
  Upload: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5-4.5V12" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 111.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 011.04-.207z" clipRule="evenodd" /></svg>,
  Robot: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M16.5 7.5h-9v9h9v-9z" /><path fillRule="evenodd" d="M8.25 2.25A.75.75 0 019 3v1.5h6V3a.75.75 0 011.5 0v1.5h.75c.966 0 1.75.784 1.75 1.75v11.25c0 .966-.784 1.75-1.75 1.75h-13.5c-.966 0-1.75-.784-1.75-1.75V6.25c0-.966.784-1.75 1.75-1.75h.75V3a.75.75 0 01.75-.75zM6 6.25v11.25a.25.25 0 00.25.25h11.5a.25.25 0 00.25-.25V6.25a.25.25 0 00-.25-.25H6.25a.25.25 0 00-.25.25z" clipRule="evenodd" /></svg>,
};

const AIImportPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("prompt");
  const [jsonInput, setJsonInput] = useState("");
  const [importResult, setImportResult] = useState<AIImportResponse | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [loadingFromWorkbench, setLoadingFromWorkbench] = useState(false);

  // AI Agent Prompt
  const aiPrompt = `你是 FlowStudy 的智能学习助手。你的任务是从用户上传的错题图片中提取并生成结构化的学习数据。

## 🎯 核心目标

创建一个完整的学习闭环：题目 → 笔记 → 解析 → 错题记录 → 记忆卡，确保所有内容相互关联，形成知识网络。

---

## 🖼️ 图片识别与答案处理优先级

### 识别规则（按优先级排序）

**优先级1：答案和解析照片**
- ✅ 如果用户提供了答案和解析的照片：
  - **必须**严格按照照片上的内容提取答案和解析
  - 不得自行修改或生成答案
  - 解析步骤必须与照片一致
  - 在 solution 末尾标注：'(来源：题目答案照片)'

**优先级2：仅题目照片（无答案）**
- ⚠️ 如果用户只提供了题目照片，没有答案：
  - **主动生成完整答案**和详细解析
  - 在 solution 末尾添加醒目提醒：
    ${'```'}
    ⚠️ **重要提醒**：此答案为AI生成，仅供参考！
                强烈建议您：
                1. 对照教材或标准答案核对
                2. 如有疑问，请重新拍照包含答案的照片
                3. 可将AI生成的答案作为参考，自行修正
    ${'```'}
  - 在 question.difficulty 中添加 "ai_generated" 标记

**优先级3：完整题目（题干+选项+答案）**
- ✅ 直接提取所有内容，标注正确答案
- ✅ 生成详细解析（可以AI生成，因为通常照片不包含解析）

---

### OCR识别指导

**公式识别**：
- 使用 LaTeX 准确还原所有数学公式
- 例如：$E = mc^2$、$\\frac{a}{b}$、$\\int_0^1 f(x)dx$
- 复杂公式使用 $$ 公式 $$ 独立一行

**图表识别**：
- 描述图表结构和关键信息
- 坐标轴：横轴表示xx，纵轴表示xx
- 数据趋势：上升/下降/波动
- 关键点：最大值、最小值、交点等

**手写内容**：
- 尽力识别手写文字
- 如果无法识别，标注 '[手写内容：无法识别]'
- 如果模糊不清，标注 '[内容模糊]'

**识别原则**：
1. **准确优先**于完整
2. 有疑问时，使用 '[疑似：xxx]' 标注
3. 确保JSON格式正确，即使内容不完整

---

## 📋 工作流程

### 1. 识别题目（Question）
**任务**：完整准确地提取题目信息

**支持的题型**：
- **single_choice**（单选题）：有4个选项，只有1个正确答案
- **multiple_choice**（多选题）：有4个选项，有2个或以上正确答案
- **fill_blank**（填空题）：需要填写答案（文本/公式/数字）
- **proof**（证明题）：⚠️ **转换成选择题**，选项是不同的证明思路/方法
- **essay**（问答题）：⚠️ **不生成题目，只生成 Anki 卡片**
- **composite**（复合题）：⚠️ **新增**，包含多个小题的综合题

**要求**：
- 提取完整题目文本（包含公式、图表描述）
- 判断题目类型（从上面5种中选择）
- 评估难度等级：1（基础）→ 5（竞赛）

**特殊题型处理**：

**证明题 → 转换成选择题**：
- 题型设为 single_choice
- 选项（options）是不同的证明思路/方法：
  - A: 错误或不严谨的思路
  - B: 错误或不严谨的思路
  - C: **正确的证明思路**（is_correct: true）
  - D: 错误或不严谨的思路
- stem 保持原题干
- solution 中给出完整证明过程

**问答题 → 只生成 Anki 卡片**：
- **不生成 question 字段**（设为 null）
- 重点生成 anki_cards，包含：
  - 知识点回顾卡片
  - 简答题思路卡片
  - 关键要点卡片

**复合题 → 生成多小题结构**：
- **必须包含 steps 数组**
- 大题题干在 stem 中（共同题干）
- 每个小题是独立的问题：
  - 有独立的 step_index、step_id
  - 有独立的 stem（小题题干）
  - 有独立的 interaction_type（小题题型）
  - 有独立的 options 或 answer
  - 有独立的 analysis（小题解析）
- 支持**混合题型**：
  - 小题1可以是 single_choice
  - 小题2可以是 fill_blank
  - 小题3可以是 multiple_choice
- 复合题不需要题目级的 options、answer、solution

**常规题型处理**：
- 选择题：提取所有选项，标注正确答案（is_correct）
- 填空题：提取参考答案

**字段说明**：
- **stem**：题目完整描述（必填）
- **options**：选择题选项（仅选择题需要）
- **answer**：参考答案（填空题/证明题/问答题需要）
- **solution**：详细解析（必填）
- **media**：媒体资源（可选）

**增强标签系统**（macro_tags）：
${'```json'}
{
  "macro_tags": {
    // 原有标签（保留）
    "scenario_model": ["圆周运动", "平抛运动"],
    "logic_chain": "机械能守恒 → 牛顿第二定律",
    "knowledge_points": ["动能定理", "功能关系"],
    "cognitive_flaws": ["粗心大意", "概念混淆"],

    // ✨ 新增：难度等级细分
    "difficulty_level": "基础题/中档题/压轴题/竞赛题",

    // ✨ 新增：题型细分
    "question_type": "概念辨析题/计算题/证明题/应用题/实验题/图表分析题",

    // ✨ 新增：认知层级（布鲁姆分类法）
    "cognitive_level": "记忆/理解/应用/分析/评价/创造",

    // ✨ 新增：考试类型
    "exam_type": "期中考试/期末考试/模拟考试/竞赛题/作业题/练习题"
  }
}
${'```'}

**标签填写规则**：

1. **difficulty_level**（难度等级细分）：
   - **基础题**：难度 1-2，直接套公式即可
   - **中档题**：难度 3，需要一定的分析和推理
   - **压轴题**：难度 4，综合性强，步骤多
   - **竞赛题**：难度 5，超纲或技巧性强

2. **question_type**（题型细分）：
   - **概念辨析题**：考查定义、性质、判断
   - **计算题**：纯计算，套公式
   - **证明题**：逻辑推理证明
   - **应用题**：实际应用场景
   - **实验题**：实验操作、数据分析
   - **图表分析题**：读图、分析图表

3. **cognitive_level**（认知层级）：
   - **记忆**：背诵、回忆、识别
   - **理解**：解释、归纳、概括
   - **应用**：运用知识解决问题
   - **分析**：分解、比较、对照
   - **评价**：判断、评估、批判
   - **创造**：设计、构建、创新

4. **exam_type**（考试类型）：
   - **期中考试/期末考试**：综合性强
   - **模拟考试**：模拟高考/中考
   - **竞赛题**：思维拓展
   - **作业题**：课后练习
   - **练习题**：日常刷题

---

### 2. 生成笔记（Note）
**任务**：创建系统化的知识点笔记

**结构要求**：
# [知识点名称]

## 📖 定义
清晰定义核心概念，包含公式、定理

## 🔍 关键要点
- 要点1：详细解释
- 要点2：详细解释

## 💡 解题方法
步骤化解题思路

## ⚠️ 常见误区
列出学生容易犯的错误

## 📚 拓展知识
相关概念、应用场景

---
*标签：[学科], [章节], [难度]*

**标签策略**：
- 必须包含：学科、章节、难度
- 可选：知识点、题型、能力层级

---

### 3. 撰写解析（Solution）
**任务**：提供详细的题目解析

**结构要求**：
# 题目详细解析

## 🎯 解题思路
1. 第一步：分析题意，明确目标
2. 第二步：选择方法/公式
3. 第三步：计算/推理过程
4. 第四步：验证答案

## 📝 答案解析
正确答案：[具体答案]

## ❌ 易错点分析
- 错误选项A为什么错
- 错误选项B为什么错
- 学生常见错误思路

## 🔗 知识点串联
- 涉及的章节
- 相关的前置知识
- 后续学习方向

---

### 4. 制作 Anki 卡片（Flashcards）
**任务**：生成 3-5 张多样化的记忆卡片

**卡片类型**：

#### 📌 类型1：知识点卡片
{
  "front": "什么是[概念名称]？",
  "back": "[准确定义] + [公式] + [适用条件]",
  "tags": ["[学科]", "概念", "基础"],
  "deck": "[学科]::[章节]::概念"
}

#### 📌 类型2：解题方法卡片
{
  "front": "如何解决[题型]？\\n\\n步骤：",
  "back": "1. xxx\\n2. xxx\\n3. xxx",
  "tags": ["[学科]", "方法", "解题"],
  "deck": "[学科]::[章节]::方法"
}

#### 📌 类型3：对比辨析卡片
{
  "front": "[概念A]和[概念B]的区别是什么？",
  "back": "| 维度 | [概念A] | [概念B] |\\n|------|---------|---------|\\n| 定义 | ... | ... |\\n| 条件 | ... | ... |",
  "tags": ["[学科]", "辨析", "对比"],
  "deck": "[学科]::[章节]::辨析"
}

#### 📌 类型4：公式应用卡片
{
  "front": "[公式]的适用条件是什么？",
  "back": "✅ 适用：...\\n❌ 不适用：...",
  "tags": ["[学科]", "公式", "应用"],
  "deck": "[学科]::[章节]::公式"
}

#### 📌 类型5：题目回顾卡片
{
  "front": "[题目描述]\\n\\n正确答案是？",
  "back": "✅ [正确答案]\\n\\n💡 关键：[解题关键点]",
  "tags": ["[学科]", "题目复习"],
  "deck": "[学科]::[章节]::题目"
}

---

## 📤 输出格式

严格按照以下 JSON Schema 输出：

{
  "version": "2.0",
  "source": "ai_agent",
  "data": {
    "question": {
      "id": "q_auto_001",
      "subject": "physics/math/chemistry/biology/english/other",
      "type": "single_choice/multiple_choice/fill_blank/proof/essay",
      "difficulty": 1-5,
      "stem": "题目完整描述（支持LaTeX公式）",
      "options": [
        {"key": "A", "content": "选项A内容", "is_correct": false},
        {"key": "B", "content": "选项B内容", "is_correct": true}
      ],
      "answer": "参考答案（非选择题必填）",
      "solution": "详细解析（支持Markdown格式）",
      "media": {
        "image_url": null,
        "audio_url": null,
        "video_url": null
      },
      "macro_tags": {
        "scenario_model": ["场景1", "场景2"],
        "logic_chain": "知识链条",
        "knowledge_points": ["知识点1", "知识点2"],
        "cognitive_flaws": ["认知缺陷1"]
      }
    },
    "note": {
      "title": "知识点笔记标题",
      "content": "# 知识点\\n\\n[完整Markdown笔记]",
      "tags": ["学科", "章节", "知识点"]
    },
    "anki_cards": [
      {
        "front": "问题",
        "back": "答案",
        "tags": ["标签1", "标签2"],
        "deck": "学科::章节::子分类"
      }
    ]
  }
}

---

## ⚠️ 质量要求

1. **完整性**：所有必填字段必须填写
2. **准确性**：知识点、公式、答案必须准确
3. **格式化**：
   - 数学公式使用 LaTeX（如 $E = mc^2$）
   - 代码使用 Markdown 代码块
   - 列表使用 - 或 1.
4. **关联性**：
   - 笔记和解析都要引用题目
   - 卡片要覆盖笔记的关键知识点
   - 标签要系统化，方便检索
5. **可读性**：
   - 使用emoji增强可读性
   - 使用Markdown格式美化
   - 分段清晰，重点突出

---

## 🎨 输出示例

### 示例1：单选题（single_choice）

{
  "version": "2.0",
  "source": "ai_agent",
  "data": {
    "question": {
      "id": "q_auto_001",
      "subject": "physics",
      "type": "single_choice",
      "difficulty": 2,
      "stem": "一个质量为 2kg 的物体，在光滑水平面上受到 10N 的水平拉力作用，求物体的加速度。",
      "options": [
        {"key": "A", "content": "2 $m/s^2$", "is_correct": false},
        {"key": "B", "content": "5 $m/s^2$", "is_correct": true},
        {"key": "C", "content": "10 $m/s^2$", "is_correct": false},
        {"key": "D", "content": "20 $m/s^2$", "is_correct": false}
      ],
      "answer": null,
      "solution": "根据牛顿第二定律：$F = ma$\\n\\n$a = \\\\frac{F}{m} = \\\\frac{10N}{2kg} = 5 m/s^2$",
      "media": {"image_url": null, "audio_url": null, "video_url": null},
      "macro_tags": {
        "scenario_model": ["牛顿第二定律应用"],
        "logic_chain": "受力分析 → 牛顿第二定律 → 加速度计算",
        "knowledge_points": ["牛顿第二定律", "加速度"],
        "cognitive_flaws": [],
        "difficulty_level": "基础题",
        "question_type": "计算题",
        "cognitive_level": "应用",
        "exam_type": "练习题"
      }
    },
    "note": {
      "title": "牛顿第二定律",
      "content": "# 牛顿第二定律\\n\\n## 📖 定义\\n\\n物体的加速度与所受合外力成正比，与质量成反比。\\n\\n$$ F = ma $$\\n\\n## 🔍 关键要点\\n\\n- $F$：合外力（单位：N）\\n- $m$：质量（单位：kg）\\n- $a$：加速度（单位：$m/s^2$）\\n\\n## 💡 解题步骤\\n\\n1. 确定研究对象\\n2. 受力分析，求合外力\\n3. 应用牛顿第二定律列方程\\n4. 求解加速度",
      "tags": ["物理", "力学", "牛顿定律"]
    },
    "anki_cards": [
      {
        "front": "牛顿第二定律的公式是什么？",
        "back": "$F = ma$\\n\\n其中：\\n- F：合外力（N）\\n- m：质量（kg）\\n- a：加速度（$m/s^2$）",
        "tags": ["物理", "力学", "公式"],
        "deck": "物理::力学::公式"
      },
      {
        "front": "如何求物体的加速度？",
        "back": "1. 受力分析，求合外力 F\\n2. 确定质量 m\\n3. 使用公式 $a = F/m$ 计算",
        "tags": ["物理", "力学", "方法"],
        "deck": "物理::力学::方法"
      }
    ]
  }
}

### 示例2：填空题（fill_blank）

{
  "version": "2.0",
  "source": "ai_agent",
  "data": {
    "question": {
      "id": "q_auto_002",
      "subject": "math",
      "type": "fill_blank",
      "difficulty": 2,
      "stem": "已知函数 $f(x) = x^2 + 2x + 1$，则 $f'(1) =$ ____",
      "options": null,
      "answer": "4",
      "solution": "求导：$f'(x) = 2x + 2$\\n\\n代入 $x = 1$：$f'(1) = 2 \\\\times 1 + 2 = 4$",
      "media": {"image_url": null, "audio_url": null, "video_url": null},
      "macro_tags": {
        "scenario_model": ["导数计算"],
        "logic_chain": "求导公式 → 代值计算",
        "knowledge_points": ["导数", "多项式函数"],
        "cognitive_flaws": ["计算粗心"],
        "difficulty_level": "基础题",
        "question_type": "计算题",
        "cognitive_level": "应用",
        "exam_type": "作业题"
      }
    },
    "note": {
      "title": "导数的基本计算",
      "content": "# 导数的基本计算\\n\\n## 📖 基本公式\\n\\n1. 幂函数：$(x^n)' = nx^{n-1}$\\n2. 常数函数：$(C)' = 0$\\n3. 和差法则：$(f \\\\pm g)' = f' \\\\pm g'$",
      "tags": ["数学", "导数", "基础"]
    },
    "anki_cards": [
      {
        "front": "幂函数 $x^n$ 的导数是什么？",
        "back": "$(x^n)' = nx^{n-1}$",
        "tags": ["数学", "导数", "公式"],
        "deck": "数学::导数::公式"
      }
    ]
  }
}

### 示例3：证明题（proof）→ 转换成选择题

{
  "version": "2.0",
  "source": "ai_agent",
  "data": {
    "question": {
      "id": "q_auto_003",
      "subject": "math",
      "type": "single_choice",
      "difficulty": 4,
      "stem": "证明：对于任意正整数 n，有 $1 + 2 + 3 + \\\\cdots + n = \\\\frac{n(n+1)}{2}$\\\\n\\\\n**应该选择什么证明方法？**",
      "options": [
        {"key": "A", "content": "直接求和法：将每一项都计算出来", "is_correct": false},
        {"key": "B", "content": "配方法：构造完全平方公式", "is_correct": false},
        {"key": "C", "content": "数学归纳法：先验证 n=1，再假设 n=k 成立，证明 n=k+1 也成立", "is_correct": true},
        {"key": "D", "content": "反证法：假设等式不成立，推出矛盾", "is_correct": false}
      ],
      "answer": null,
      "solution": "**证明（数学归纳法）：**\\\\n\\\\n(1) 当 n=1 时，左边=1，右边=$\\\\\\\\frac{1 \\\\\\\\times 2}{2}=1$，等式成立。\\\\n\\\\n(2) 假设当 n=k 时等式成立，即 $1+2+3+\\\\\\\\cdots+k = \\\\\\\\frac{k(k+1)}{2}$\\\\n\\\\n则当 n=k+1 时：\\\\n左边 = $1+2+3+\\\\\\\\cdots+k+(k+1)$\\\\n    $= \\\\\\\\frac{k(k+1)}{2} + (k+1)$\\\\n    $= \\\\\\\\frac{(k+1)(k+2)}{2}$\\\\n    = 右边\\\\n\\\\n由数学归纳法，等式对所有正整数 n 成立。证毕。\\\\n\\\\n**为什么选C**：数学归纳法是证明与自然数有关的命题的标准方法，步骤严谨。",
      "media": {"image_url": null, "audio_url": null, "video_url": null},
      "macro_tags": {
        "scenario_model": ["数列求和证明"],
        "logic_chain": "数学归纳法三步",
        "knowledge_points": ["数学归纳法", "等差数列求和"],
        "cognitive_flaws": [],
        "difficulty_level": "压轴题",
        "question_type": "证明题",
        "cognitive_level": "分析",
        "exam_type": "期末考试"
      }
    },
    "note": {
      "title": "数学归纳法",
      "content": "# 数学归纳法\\\\n\\\\n## 📖 定义\\\\n\\\\n数学归纳法是一种证明与自然数有关的命题的数学方法。\\\\n\\\\n## 🔍 证明步骤\\\\n\\\\n1. **归纳基础**：验证 n=1 时命题成立\\\\n2. **归纳假设**：假设 n=k 时命题成立\\\\n3. **归纳递推**：证明 n=k+1 时命题也成立\\\\n\\\\n## 💡 适用范围\\\\n\\\\n- 证明与自然数有关的命题\\\\n- 证明不等式\\\\n- 证明整除性问题\\\\n- 证明数列通项公式",
      "tags": ["数学", "证明方法", "归纳法"]
    },
    "anki_cards": [
      {
        "front": "数学归纳法的三个步骤是什么？",
        "back": "1. 归纳基础：验证 n=1 成立\\\\n2. 归纳假设：假设 n=k 成立\\\\n3. 归纳递推：证明 n=k+1 也成立",
        "tags": ["数学", "证明方法", "归纳法"],
        "deck": "数学::证明方法::归纳法"
      }
    ]
  }
}

### 示例4：问答题（essay）→ 只生成 Anki 卡片

{
  "version": "2.0",
  "source": "ai_agent",
  "data": {
    "question": null,
    "note": {
      "title": "光合作用的过程和意义",
      "content": "# 光合作用\\\\n\\\\n## 📖 定义\\\\n\\\\n光合作用是绿色植物利用光能，将二氧化碳和水合成有机物，并释放氧气的过程。\\\\n\\\\n## 🔍 过程\\\\n\\\\n### 光反应阶段\\\\n- **场所**：叶绿体类囊体薄膜\\\\n- **条件**：需要光、色素、酶\\\\n- **产物**：ATP、NADPH、O₂\\\\n\\\\n### 暗反应阶段\\\\n- **场所**：叶绿体基质\\\\n- **条件**：需要酶、ATP、NADPH\\\\n- **产物**：有机物、ADP、NADP⁺\\\\n\\\\n## 💡 意义\\\\n\\\\n1. 制造有机物，为生物圈提供食物\\\\n2. 转化光能为化学能\\\\n3. 调节大气中 O₂ 和 CO₂ 的含量\\\\n4. 对生物进化有重要作用",
      "tags": ["生物", "光合作用", "植物生理"]
    },
    "anki_cards": [
      {
        "front": "光合作用的两个阶段分别是什么？",
        "back": "1. 光反应：在类囊体薄膜上，产生 ATP 和 NADPH\\\\n2. 暗反应：在叶绿体基质中，合成有机物",
        "tags": ["生物", "光合作用", "过程"],
        "deck": "生物::光合作用::过程"
      },
      {
        "front": "光反应的产物有哪些？",
        "back": "ATP、NADPH、O₂（氧气）",
        "tags": ["生物", "光合作用", "光反应"],
        "deck": "生物::光合作用::产物"
      },
      {
        "front": "光合作用的场所是什么？",
        "back": "叶绿体\\\\n- 光反应：类囊体薄膜\\\\n- 暗反应：叶绿体基质",
        "tags": ["生物", "光合作用", "结构"],
        "deck": "生物::光合作用::结构"
      },
      {
        "front": "光合作用有什么意义？",
        "back": "1. 制造有机物\\\\n2. 转化能量\\\\n3. 调节大气 O₂/CO₂\\\\n4. 促进生物进化",
        "tags": ["生物", "光合作用", "意义"],
        "deck": "生物::光合作用::意义"
      }
    ]
  }
}

### 示例5：复合题（composite）→ 包含多个小题

{
  "version": "2.0",
  "source": "ai_agent",
  "data": {
    "question": {
      "id": "q_phys_001",
      "type": "composite",
      "difficulty": 4,
      "subject": "physics",
      "stem": "如图所示，半径 R=0.5m 的光滑半圆轨道固定在竖直平面内，轨道最低点 B 与水平地面相切。质量 m=0.5kg 的小球（可视为质点）从水平地面上的 A 点以初速度 v₀=5m/s 向左运动，到达 B 点后进入半圆轨道。",
      "media": {
        "image_url": "https://example.com/circular_motion.jpg"
      },
      "steps": [
        {
          "step_index": 0,
          "step_id": "s_001",
          "interaction_type": "single_choice",
          "stem": "【小题1】小球通过最高点 C 的最小速度为多少？",
          "options": [
            {"key": "A", "content": "$\\\\sqrt{gR}$", "is_correct": true},
            {"key": "B", "content": "$\\\\sqrt{2gR}$", "is_correct": false},
            {"key": "C", "content": "$gR$", "is_correct": false},
            {"key": "D", "content": "$2gR$", "is_correct": false}
          ],
          "analysis": "小球通过最高点的临界条件是重力恰好提供向心力：mg = mv²/R，解得 v = \\\\sqrt{gR}。"
        },
        {
          "step_index": 1,
          "step_id": "s_002",
          "interaction_type": "single_choice",
          "stem": "【小题2】从 B 点到 C 点，根据机械能守恒定律，下列方程正确的是？",
          "options": [
            {"key": "A", "content": "$\\\\frac{1}{2}mv_B^2 = \\\\frac{1}{2}mv_C^2 + mgR$", "is_correct": false},
            {"key": "B", "content": "$\\\\frac{1}{2}mv_B^2 = \\\\frac{1}{2}mv_C^2 + 2mgR$", "is_correct": true},
            {"key": "C", "content": "$\\\\frac{1}{2}mv_B^2 + mgR = \\\\frac{1}{2}mv_C^2$", "is_correct": false},
            {"key": "D", "content": "$\\\\frac{1}{2}mv_B^2 + 2mgR = \\\\frac{1}{2}mv_C^2$", "is_correct": false}
          ],
          "analysis": "B 点到 C 点的高度差为 2R（C 是最高点，B 是最低点），所以重力势能增加 2mgR。根据机械能守恒：\\\\frac{1}{2}mv_B^2 = \\\\frac{1}{2}mv_C^2 + 2mgR。注意：高度差是 2R 不是 R！"
        },
        {
          "step_index": 2,
          "step_id": "s_003",
          "interaction_type": "fill_blank",
          "stem": "【小题3】若小球恰好能通过最高点 C，求小球在 A 点的初速度 v₀ 至少为多少？（忽略空气阻力，取 g=10m/s²）",
          "answer": "5m/s",
          "analysis": "1. 恰好通过 C 点：v_C = \\\\sqrt{gR} = \\\\sqrt{10 \\\\times 0.5} = \\\\sqrt{5} m/s\\\\n2. 从 B 到 C：\\\\frac{1}{2}mv_B^2 = \\\\frac{1}{2}mv_C^2 + 2mgR\\\\n   v_B^2 = v_C^2 + 4gR = 5 + 20 = 25\\\\n   v_B = 5 m/s\\\\n3. 从 A 到 B（水平地面）：v₀ = v_B = 5 m/s"
        }
      ],
      "macro_tags": {
        "difficulty_level": "压轴题",
        "question_type": "综合计算题",
        "scenario_model": ["圆周运动", "机械能守恒"],
        "knowledge_points": ["临界条件", "高度差计算", "机械能守恒定律"],
        "cognitive_level": "分析"
      }
    },
    "note": {
      "title": "竖直平面圆周运动解题要点",
      "content": "# 圆周运动解题要点\\\\n\\\\n## 关键公式\\\\n1. 最高点临界条件：mg = mv²/R\\\\n2. 机械能守恒：E_k1 + E_p1 = E_k2 + E_p2\\\\n\\\\n## 易错点\\\\n- **高度差**：从最低点到最高点的垂直距离是 2R，不是 R！\\\\n- **临界速度**：通过最高点的最小速度是 \\\\sqrt{gR}\\\\n\\\\n## 本题关键\\\\n- 小题2：高度差计算错误（R → 2R）",
      "tags": ["物理", "圆周运动", "机械能"]
    },
    "anki_cards": [
      {
        "front": "小球通过圆轨道最高点的最小速度是多少？",
        "back": "v_min = \\\\sqrt{gR}\\\\n\\\\n推导：mg = mv²/R → v = \\\\sqrt{gR}",
        "tags": ["物理", "圆周运动", "临界条件"],
        "deck": "物理::圆周运动"
      },
      {
        "front": "从圆轨道最低点到最高点，高度差是多少？",
        "back": "高度差 = 2R\\\\n\\\\n注意：不是 R！是直径的长度！",
        "tags": ["物理", "圆周运动", "几何关系"],
        "deck": "物理::圆周运动"
      }
    ]
  }
}

---

**请严格遵守以上格式和要求，生成高质量的学习数据！**`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiPrompt);
    toast.success("✅ Prompt 已复制到剪贴板！");
  };

  const handleLoadFromWorkbench = async () => {
    try {
      setLoadingFromWorkbench(true);
      const mistakes = await workbenchApi.getWorkbenchMistakes(null, 10);

      if (mistakes.length === 0) {
        toast.info("学习工作台暂无错题备忘录");
        setLoadingFromWorkbench(false);
        return;
      }

      // 转义特殊字符的辅助函数
      const escapeSpecialChars = (str) => {
        if (!str) return '';
        return str
          .replace(/\\/g, '\\\\')  // 反斜杠
          .replace(/\n/g, '\\n')   // 换行符
          .replace(/\r/g, '\\r')   // 回车符
          .replace(/\t/g, '\\t')   // 制表符
          .replace(/"/g, '\\"');    // 双引号
      };

      // 将学习工作台的错题转换为提示文本
      const promptText = `## 📝 学习工作台错题 (${mistakes.length} 条)

请帮我将以下错题备忘录转换为 JSON 格式。对于每条错题：

${mistakes.map((m, i) => `
### 错题 ${i + 1}
- **题目ID**: ${m.question_id || '未指定'}
- **学科**: ${m.subject}
- **备忘内容**: ${escapeSpecialChars(m.content)}
- **创建时间**: ${m.created_at ? new Date(m.created_at).toLocaleString('zh-CN') : '未知'}
`).join('\n')}

**处理要求**：
1. 如果有题目ID，请查询该题目的完整信息
2. 如果没有题目ID，请根据"备忘内容"推断题目结构
3. 按照 v2.0 JSON Schema 生成完整数据
4. 重点生成 'question' 和 'anki_cards'
5. 导入成功后，我会手动删除学习工作台的备忘录

---

**请开始处理，生成 JSON 数据：**
`;

      setJsonInput(promptText);
      setActiveTab("import");
      toast.success(`✅ 已加载 ${mistakes.length} 条错题，请继续使用 AI 处理`);
    } catch (error) {
      console.error("Failed to load workbench mistakes:", error);
      toast.error("❌ 加载失败");
    } finally {
      setLoadingFromWorkbench(false);
    }
  };

  // 智能提取 JSON 对象（处理用户粘贴了额外文本的情况）
  const extractJsonObject = (str) => {
    const trimmed = str.trim();

    // 检查是否已经是纯 JSON（以 { 开头，} 结尾）
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }

    // 尝试找到第一个 { 和最后一个 }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      console.log("检测到额外文本，自动提取 JSON 对象");
      return trimmed.substring(firstBrace, lastBrace + 1);
    }

    return trimmed;
  };

  // 修复 JSON 字符串值中的控制字符
  const fixJsonControlChars = (jsonStr) => {
    let result = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      const nextChar = jsonStr[i + 1];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      // 如果在字符串内，遇到控制字符则转义
      if (inString) {
        const code = char.charCodeAt(0);
        // 控制字符范围: 0x00-0x1F
        if (code >= 0x00 && code <= 0x1F) {
          const controlCharMap = {
            '\n': '\\n',
            '\r': '\\r',
            '\t': '\\t',
            '\b': '\\b',
            '\f': '\\f',
          };
          const escaped = controlCharMap[char];
          if (escaped) {
            result += escaped;
            console.log(`位置 ${i}: 转义控制字符 '${char.charCodeAt(0).toString(16)}' 为 '${escaped}'`);
          } else {
            // 其他控制字符，移除或用 Unicode 转义
            result += `\\u${code.toString(16).padStart(4, '0')}`;
          }
          continue;
        }
      }

      result += char;
    }

    return result;
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error("❌ 请先粘贴 JSON 数据");
      return;
    }

      try {
        setIsImporting(true);

        // 尝试直接解析
        let data;
        let parseError: Error | null = null;

      try {
        data = JSON.parse(jsonInput);
      } catch (err) {
        const firstError = err as any;
        parseError = firstError;

        // 第一步：尝试智能提取 JSON 对象
        const extractedJson = extractJsonObject(jsonInput);
        if (extractedJson !== jsonInput) {
          try {
            console.log("尝试提取 JSON 对象...");
            data = JSON.parse(extractedJson);
            parseError = null;
          } catch (e) {
            const err = e as Error;
            parseError = err;
          }
        }

        // 第二步：尝试修复控制字符
        if (parseError) {
          try {
            console.log("尝试修复控制字符...");
            const fixedJson = fixJsonControlChars(extractedJson);
            data = JSON.parse(fixedJson);
            parseError = null;
            toast.info("✅ 已自动修复 JSON 中的控制字符");
          } catch (e) {
            const err = e as Error;
            parseError = err;
          }
        }
      }

      // 如果还是失败，抛出原始错误
      if (parseError) {
        throw parseError;
      }

      // 验证版本和必需字段（新格式 v2.0）
      const question = data.data?.question;
      const note = data.data?.note;
      const ankiCards = data.data?.anki_cards;

      // 允许 question 为 null（问答题只生成 Anki 卡片）
      // 但至少要有 note 或 anki_cards
      if (!question && !note && !ankiCards) {
        throw new Error("JSON 格式不完整，至少需要 question、note 或 anki_cards 中的一个");
      }

      // 如果有 question，验证其格式
      if (question) {
        // 验证题型
        const validTypes = ['single_choice', 'multiple_choice', 'fill_blank', 'proof', 'essay', 'composite'];
        if (!question.type || !validTypes.includes(question.type)) {
          throw new Error(`无效的题型: ${question.type}，支持的题型: ${validTypes.join(', ')}`);
        }

        // 验证必填字段
        if (!question.stem) {
          throw new Error("题目缺少 stem（题干）字段");
        }

        // 复合题特殊验证
        if (question.type === 'composite') {
          if (!question.steps || !Array.isArray(question.steps) || question.steps.length === 0) {
            throw new Error("复合题必须提供 steps 小题数组");
          }
          // 验证每个小题
          question.steps.forEach((step, idx) => {
            if (!step.stem) {
              throw new Error(`小题 ${idx + 1} 缺少 stem（题干）字段`);
            }
            if (!step.interaction_type) {
              throw new Error(`小题 ${idx + 1} 缺少 interaction_type 字段`);
            }
            if (['single_choice', 'multiple_choice'].includes(step.interaction_type)) {
              if (!step.options || !Array.isArray(step.options) || step.options.length === 0) {
                throw new Error(`小题 ${idx + 1} 必须提供 options 选项数组`);
              }
            }
            if (step.interaction_type === 'fill_blank' && !step.answer) {
              throw new Error(`小题 ${idx + 1} 必须提供 answer 字段`);
            }
          });
        } else {
          // 非复合题的验证
          if (!question.solution) {
            throw new Error("题目缺少 solution（解析）字段");
          }

          // 对于选择题，验证 options
          if (['single_choice', 'multiple_choice'].includes(question.type)) {
            if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
              throw new Error("选择题必须提供 options 选项数组");
            }
          }

          // 对于填空题，验证 answer 字段（proof 现在是选择题，essay 不生成 question）
          if (question.type === 'fill_blank') {
            if (!question.answer) {
              throw new Error(`填空题必须提供 answer（参考答案）字段`);
            }
          }
        }
      }

      // 调用后端导入 API
      const response = await axios.post("http://localhost:8000/api/ai-import", data);

      setImportResult(response.data);
      toast.success("✅ 导入成功！");

      // 清空输入
      setJsonInput("");
    } catch (error) {
      console.error("Import error:", error);

      // 在控制台打印输入内容（用于调试）
      console.log("输入内容前 100 个字符:", jsonInput.substring(0, 100));
      console.log("输入内容长度:", jsonInput.length);

      if (error instanceof SyntaxError) {
        // 提取错误位置信息
        const match = error.message.match(/position (\d+)/);
        const position = match ? match[1] : '未知';
        const lineMatch = error.message.match(/line (\d+)/);
        const line = lineMatch ? lineMatch[1] : '未知';

        // 获取错误位置附近的内容
        const errorPos = parseInt(position) || 0;
        const contextStart = Math.max(0, errorPos - 20);
        const contextEnd = Math.min(jsonInput.length, errorPos + 20);
        const errorContext = jsonInput.substring(contextStart, contextEnd);

        console.log("错误位置附近内容:", errorContext);

        toast.error(
          `❌ JSON 格式错误\n\n` +
          `位置：第 ${line} 行，第 ${position} 列\n` +
          `错误附近：${errorContext.substring(0, 30)}...\n\n` +
          `常见原因：\n` +
          `• JSON 前后有额外的文字（已自动尝试提取）\n` +
          `• 字符串中的换行符未转义（使用 \\n 而非实际换行）\n` +
          `• 缺少引号、逗号或括号\n` +
          `• 末尾多了逗号`
        );
      } else if ((error as any).response?.data?.detail) {
        // 显示后端返回的详细错误信息
        const err = error as any;
        toast.error(`❌ 导入失败: ${err.response.data.detail}`);
      } else if ((error as Error).message) {
        const err = error as Error;
        toast.error(`❌ ${err.message}`);
      } else {
        toast.error("❌ 导入失败，请检查网络连接");
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen font-sans p-8" style={{ paddingTop: '12vh' }}>
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-4"
        >
          <Icons.ArrowLeft />
          <span>返回首页</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <Icons.Robot />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              AI 智能导入
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              使用 AI Agent 快速导入错题、笔记、解析和记忆卡片
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab("prompt")}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
              activeTab === "prompt"
                ? "bg-blue-500 text-white shadow-md"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            📋 AI Agent Prompt
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
              activeTab === "import"
                ? "bg-blue-500 text-white shadow-md"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            📥 导入数据
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === "prompt" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  创建你的 AI Agent
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  复制以下 Prompt 到 AI 软件（如 ChatGPT、Claude）创建自定义 Agent
                </p>
              </div>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
              >
                <Icons.Copy />
                复制 Prompt
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                {aiPrompt}
              </pre>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-500/30">
              <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-2">💡 使用步骤</h3>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>点击上方"复制 Prompt"按钮</li>
                <li>打开 ChatGPT/Claude/其他 AI 软件</li>
                <li>创建新的 Agent，粘贴 Prompt</li>
                <li>上传错题图片，AI 生成 JSON 格式数据</li>
                <li>切换到"导入数据"标签页</li>
                <li>粘贴 JSON 并点击导入</li>
              </ol>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  粘贴 AI 生成的 JSON
                </h2>
                <button
                  onClick={handleLoadFromWorkbench}
                  disabled={loadingFromWorkbench}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingFromWorkbench ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      加载中...
                    </>
                  ) : (
                    <>
                      📋 从学习工作台获取
                    </>
                  )}
                </button>
              </div>

              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='粘贴 AI 生成的 JSON 数据（v2.0 格式），例如：

{
  "version": "2.0",
  "source": "ai_agent",
  "data": {
    "question": {
      "id": "q_auto_001",
      "subject": "physics",
      "type": "single_choice",
      "difficulty": 2,
      "stem": "题目内容...",
      "options": [
        {"key": "A", "content": "选项A", "is_correct": false},
        {"key": "B", "content": "选项B", "is_correct": true}
      ],
      "solution": "详细解析..."
    },
    "note": {
      "title": "知识点笔记",
      "content": "# 笔记内容...",
      "tags": ["物理", "力学"]
    },
    "anki_cards": [...]
  }
}

支持题型：single_choice, multiple_choice, fill_blank, proof, essay'
                className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-mono text-sm text-gray-800 dark:text-gray-200 resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
              />

              <button
                onClick={handleImport}
                disabled={isImporting}
                className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>导入中...</span>
                  </>
                ) : (
                  <>
                    <Icons.Upload />
                    <span>开始导入</span>
                  </>
                )}
              </button>
            </div>

            {/* 导入结果 */}
            {importResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                    <Icons.Check />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                      导入成功！
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      以下内容已成功添加到你的学习库
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {importResult.question && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30">
                      <div className="text-blue-600 dark:text-blue-400 font-bold mb-2">📝 题目</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {importResult.question.stem || "已导入到题库"}
                      </div>
                    </div>
                  )}

                  {importResult.note && (
                    <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/30">
                      <div className="text-green-600 dark:text-green-400 font-bold mb-2">📓 笔记</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {importResult.note.title || "已创建笔记"}
                      </div>
                    </div>
                  )}

                  {importResult.mistake && (
                    <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/30">
                      <div className="text-red-600 dark:text-red-400 font-bold mb-2">❌ 错题记录</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {importResult.mistake.title || "已添加到错题本"}
                      </div>
                    </div>
                  )}

                  {importResult.analysis && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/30">
                      <div className="text-purple-600 dark:text-purple-400 font-bold mb-2">💡 解析</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {importResult.analysis.title || "已添加解析"}
                      </div>
                    </div>
                  )}

                  {importResult.anki_cards && importResult.anki_cards.length > 0 && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-xl border border-orange-200 dark:border-orange-500/30">
                      <div className="text-orange-600 dark:text-orange-400 font-bold mb-2">🎴 记忆卡片</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        已创建 {importResult.anki_cards.length} 张卡片
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => navigate("/notes")}
                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    查看笔记
                  </button>
                  <button
                    onClick={() => navigate("/mistakes")}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    查看错题本
                  </button>
                  <button
                    onClick={() => navigate("/ankidecks")}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    查看卡片
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AIImportPage;
