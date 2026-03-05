#!/usr/bin/env python
"""添加示例题目（新题型系统）"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Question

# 数据库连接
engine = create_engine("sqlite:///flowstudy.db")
Session = sessionmaker(bind=engine)
session = Session()

# 示例题目数据
sample_questions = [
    {
        "id": "q_single_001",
        "subject": "physics",
        "type": "single_choice",
        "difficulty": 2,
        "stem": "一个质量为 2kg 的物体，在光滑水平面上受到 10N 的水平拉力作用，求物体的加速度。",
        "options": [
            {"key": "A", "content": "2 m/s²", "is_correct": False},
            {"key": "B", "content": "5 m/s²", "is_correct": True},
            {"key": "C", "content": "10 m/s²", "is_correct": False},
            {"key": "D", "content": "20 m/s²", "is_correct": False}
        ],
        "solution": "根据牛顿第二定律：F = ma\na = F/m = 10N / 2kg = 5 m/s²"
    },
    {
        "id": "q_multiple_001",
        "subject": "physics",
        "type": "multiple_choice",
        "difficulty": 3,
        "stem": "关于动能定理，下列说法正确的是：",
        "options": [
            {"key": "A", "content": "合外力做功等于动能的变化量", "is_correct": True},
            {"key": "B", "content": "动能定理只适用于直线运动", "is_correct": False},
            {"key": "C", "content": "动能定理适用于任何过程", "is_correct": True},
            {"key": "D", "content": "动能定理只适用于恒力做功", "is_correct": False}
        ],
        "solution": "动能定理是标量式，适用于任何过程（直线或曲线、恒力或变力），合外力做的功等于物体动能的变化量。"
    },
    {
        "id": "q_fill_001",
        "subject": "math",
        "type": "fill_blank",
        "difficulty": 2,
        "stem": "已知函数 f(x) = x² + 2x + 1，则 f'(1) = ____",
        "answer": "4",
        "solution": "f'(x) = 2x + 2\nf'(1) = 2×1 + 2 = 4"
    },
    {
        "id": "q_proof_001",
        "subject": "math",
        "type": "proof",
        "difficulty": 4,
        "stem": "证明：对于任意正整数 n，有 1 + 2 + 3 + ... + n = n(n+1)/2",
        "answer": "使用数学归纳法证明",
        "solution": "**证明（数学归纳法）：**\n\n(1) 当 n=1 时，左边=1，右边=1×2/2=1，等式成立。\n\n(2) 假设当 n=k 时等式成立，即 1+2+3+...+k = k(k+1)/2\n\n则当 n=k+1 时：\n左边 = 1+2+3+...+k+(k+1)\n    = k(k+1)/2 + (k+1)\n    = (k+1)(k+2)/2\n    = 右边\n\n由数学归纳法，等式对所有正整数 n 成立。证毕。"
    },
    {
        "id": "q_essay_001",
        "subject": "biology",
        "type": "essay",
        "difficulty": 3,
        "stem": "简述光合作用的过程和意义。",
        "answer": "光合作用是绿色植物利用光能将二氧化碳和水转化为有机物并释放氧气的过程",
        "solution": "**光合作用的过程：**\n\n1. **光反应阶段**（在叶绿体类囊体薄膜上）：\n   - 光能被色素吸收，用于水的光解，产生 O₂ 和 H⁺\n   - 生成 ATP 和 NADPH\n\n2. **暗反应阶段**（在叶绿体基质中）：\n   - 利用 ATP 和 NADPH 将 CO₂ 还原为糖类\n   - 生成葡萄糖等有机物\n\n**光合作用的意义：**\n\n1. **能量转换**：将光能转化为化学能储存在有机物中\n2. **物质转化**：将无机物转化为有机物\n3. **氧气释放**：为地球提供氧气来源\n4. **碳氧平衡**：维持大气中 CO₂ 和 O₂ 的相对平衡"
    }
]

# 添加题目到数据库
for q_data in sample_questions:
    # 检查是否已存在
    existing = session.query(Question).filter_by(id=q_data["id"]).first()
    if existing:
        print(f"⚠️ 题目 {q_data['id']} 已存在，跳过")
        continue

    question = Question(
        id=q_data["id"],
        subject=q_data["subject"],
        type=q_data["type"],
        difficulty=q_data["difficulty"],
        stem=q_data["stem"],
        options=q_data.get("options"),
        answer=q_data.get("answer"),
        solution=q_data.get("solution"),
        media={"image_url": None, "audio_url": None, "video_url": None},
        macro_tags={}
    )

    session.add(question)
    print(f"✅ 添加题目: {q_data['id']} - {q_data['type']}")

session.commit()
print("\n✅ 所有示例题目添加完成！")
