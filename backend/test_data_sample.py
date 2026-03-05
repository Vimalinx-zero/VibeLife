"""
测试样例数据生成脚本

用于创建测试所需的样例数据：
- 测试用户账号
- 题目数据（单选、多选、填空、证明题）
- 笔记文件
- 错题记录
- Anki记忆卡
- 学习会话记录

运行方式：
    cd backend
    python test_data_sample.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from database import Base
import models
import datetime
import json

def create_test_users(db: Session):
    """创建测试账号"""
    print("📝 创建测试账号...")

    # 检查用户是否存在，不存在则创建
    user1 = db.query(models.User).filter(models.User.username == "test_user").first()
    if not user1:
        user1 = models.User(
            id="u_test_001",
            username="test_user",
            email="test_user_test@example.com",
            password_hash="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GNzY2Wq5",  # password: test123
            full_name="测试用户",
            is_active=True,
            is_admin=False
        )
        db.add(user1)
        print("  ✅ 创建测试用户: test_user / test123")
    else:
        print("  ℹ️  测试用户已存在: test_user")

    # 测试账号2：admin_user
    user2 = db.query(models.User).filter(models.User.username == "admin_user").first()
    if not user2:
        user2 = models.User(
            id="u_admin_001",
            username="admin_user",
            email="admin_user_test@example.com",
            password_hash="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GNzY2Wq5",  # password: test123
            full_name="管理员",
            is_active=True,
            is_admin=True
        )
        db.add(user2)
        print("  ✅ 创建管理员: admin_user / test123")
    else:
        print("  ℹ️  管理员已存在: admin_user")

    db.commit()


def create_test_questions(db: Session):
    """创建测试题目"""
    print("\n📚 创建测试题目...")

    questions = [
        # 单选题
        {
            "id": "q_test_001",
            "subject": "physics",
            "type": "single_choice",
            "difficulty": 1,
            "stem": "牛顿第一定律又称为？",
            "options": [
                {"key": "A", "content": "惯性定律", "is_correct": True},
                {"key": "B", "content": "加速度定律", "is_correct": False},
                {"key": "C", "content": "作用力定律", "is_correct": False},
                {"key": "D", "content": "万有引力定律", "is_correct": False}
            ],
            "answer": "A",
            "solution": "牛顿第一定律表明：物体在不受外力或所受外力的合力为零时，保持静止或匀速直线运动状态。这一定律又称惯性定律。",
            "media": None,
            "macro_tags": {"知识点": ["力学", "牛顿定律"], "难度": ["基础"]}
        },
        # 单选题2
        {
            "id": "q_test_002",
            "subject": "math",
            "type": "single_choice",
            "difficulty": 2,
            "stem": "函数 f(x) = x² 在 x=2 处的导数是？",
            "options": [
                {"key": "A", "content": "2", "is_correct": False},
                {"key": "B", "content": "4", "is_correct": True},
                {"key": "C", "content": "6", "is_correct": False},
                {"key": "D", "content": "8", "is_correct": False}
            ],
            "answer": "B",
            "solution": "f(x) = x² 的导数是 f'(x) = 2x，所以在 x=2 处，f'(2) = 2×2 = 4。",
            "media": None,
            "macro_tags": {"知识点": ["微积分", "导数"], "难度": ["中等"]}
        },
        # 多选题
        {
            "id": "q_test_003",
            "subject": "physics",
            "type": "multiple_choice",
            "difficulty": 2,
            "stem": "关于动能定理，下列说法正确的有？（多选）",
            "options": [
                {"key": "A", "content": "合外力做功等于动能变化量", "is_correct": True},
                {"key": "B", "content": "适用于恒力做功", "is_correct": False},
                {"key": "C", "content": "适用于变力做功", "is_correct": True},
                {"key": "D", "content": "只适用于直线运动", "is_correct": False}
            ],
            "answer": "A,C",
            "solution": "动能定理：合外力对物体所做的功等于物体动能的变化量。这个定理既适用于恒力做功，也适用于变力做功；既适用于直线运动，也适用于曲线运动。",
            "media": None,
            "macro_tags": {"知识点": ["力学", "动能定理"], "难度": ["中等"]}
        },
        # 填空题
        {
            "id": "q_test_004",
            "subject": "math",
            "type": "fill_blank",
            "difficulty": 1,
            "stem": "已知等差数列 {an} 中，a1=2，d=3，则 a5 = ___",
            "options": None,
            "answer": "14",
            "solution": "等差数列通项公式：an = a1 + (n-1)d\na5 = 2 + (5-1)×3 = 2 + 12 = 14",
            "media": None,
            "macro_tags": {"知识点": ["数列", "等差数列"], "难度": ["基础"]}
        },
        # 证明题
        {
            "id": "q_test_005",
            "subject": "math",
            "type": "proof",
            "difficulty": 3,
            "stem": "证明：对于任意正整数 n，有 1+2+3+...+n = n(n+1)/2",
            "options": None,
            "answer": "见解析",
            "solution": "【证明】\n设 S = 1 + 2 + 3 + ... + (n-1) + n\n倒序写出：S = n + (n-1) + ... + 2 + 1\n两式相加：2S = (n+1) + (n+1) + ... + (n+1) + (n+1)\n2S = n(n+1)\n∴ S = n(n+1)/2，得证。",
            "media": None,
            "macro_tags": {"知识点": ["数列", "数学证明"], "难度": ["困难"]}
        }
    ]

    for q_data in questions:
        question = models.Question(
            id=q_data["id"],
            subject=q_data["subject"],
            type=q_data["type"],
            difficulty=q_data["difficulty"],
            stem=q_data["stem"],
            options=q_data["options"],
            answer=q_data["answer"],
            solution=q_data["solution"],
            media=q_data["media"],
            macro_tags=q_data["macro_tags"]
        )
        db.merge(question)

    db.commit()
    print(f"  ✅ 创建了 {len(questions)} 道测试题目")


def create_test_notes(db: Session):
    """创建测试笔记"""
    print("\n📝 创建测试笔记...")

    # 笔记1：数学公式
    note1 = models.FileItem(
        id="note_test_001",
        user_id="u_test_001",
        type="file",
        name="数学公式总结",
        parent_id="root",
        content="""# 数学公式总结

## 导数基本公式
1. (x^n)' = nx^(n-1)
2. (sin x)' = cos x
3. (cos x)' = -sin x
4. (e^x)' = e^x

## 积分基本公式
1. ∫x^n dx = x^(n+1)/(n+1) + C
2. ∫sin x dx = -cos x + C
3. ∫cos x dx = sin x + C

## 重要公式
- 牛莱公式：∫[a,b] f(x)dx = F(b) - F(a)
""",
        date=datetime.date.today().strftime("%Y-%m-%d"),
        tags=["数学", "微积分", "公式"]
    )
    db.merge(note1)

    # 笔记2：物理笔记
    note2 = models.FileItem(
        id="note_test_002",
        user_id="u_test_001",
        type="file",
        name="牛顿三定律",
        parent_id="root",
        content="""# 牛顿三定律

## 第一定律（惯性定律）
物体在不受外力或所受外力的合力为零时，保持静止或匀速直线运动状态。

## 第二定律
F = ma

## 第三定律（作用力与反作用力定律）
两个物体之间的作用力和反作用力，大小相等，方向相反，作用在同一条直线上。
""",
        date=datetime.date.today().strftime("%Y-%m-%d"),
        tags=["物理", "力学", "牛顿定律"]
    )
    db.merge(note2)

    # 笔记3：文件夹
    folder = models.FileItem(
        id="folder_test_001",
        user_id="u_test_001",
        type="folder",
        name="学习资料",
        parent_id="root",
        content="",
        date=datetime.date.today().strftime("%Y-%m-%d"),
        tags=[]
    )
    db.merge(folder)

    db.commit()
    print("  ✅ 创建了 3 个笔记文件（2个文件 + 1个文件夹）")


def create_test_mistakes(db: Session):
    """创建测试错题"""
    print("\n❌ 创建测试错题...")

    # 错题1：test_user的错题
    mistake1 = models.Mistake(
        user_id="u_test_001",
        question_id="q_test_001",
        user_answer="B",  # 错误答案
        error_count=2,
        mastery=65.0,
        last_error_time=datetime.date.today().strftime("%Y-%m-%d"),
        history=[
            {"answer": "C", "is_correct": False, "timestamp": "2025-01-05T10:00:00"},
            {"answer": "B", "is_correct": False, "timestamp": "2025-01-06T14:30:00"}
        ],
        step_answers=[]
    )
    db.merge(mistake1)

    # 错题2：test_user的另一道错题
    mistake2 = models.Mistake(
        user_id="u_test_001",
        question_id="q_test_003",
        user_answer="A,B",  # 漏选了C
        error_count=1,
        mastery=50.0,
        last_error_time=datetime.date.today().strftime("%Y-%m-%d"),
        history=[
            {"answer": "A,B", "is_correct": False, "timestamp": "2025-01-06T15:00:00"}
        ],
        step_answers=[]
    )
    db.merge(mistake2)

    db.commit()
    print("  ✅ 创建了 2 条错题记录")


def create_test_flashcards(db: Session):
    """创建测试记忆卡"""
    print("\n🃏 创建测试记忆卡...")

    cards = [
        {
            "id": "card_test_001",
            "user_id": "u_test_001",
            "front": "牛顿第二定律公式是什么？",
            "back": "F = ma\n其中：F是合力，m是质量，a是加速度",
            "tags": ["物理", "力学", "牛顿定律"],
            "deck": "物理"
        },
        {
            "id": "card_test_002",
            "user_id": "u_test_001",
            "front": "导数的几何意义是什么？",
            "back": "导数表示曲线在某点处切线的斜率，也即函数在该点的瞬时变化率。",
            "tags": ["数学", "微积分", "导数"],
            "deck": "数学"
        },
        {
            "id": "card_test_003",
            "user_id": "u_test_001",
            "front": "什么是动能定理？",
            "back": "合外力对物体所做的功等于物体动能的变化量。\n公式：W = ΔEk = 1/2mv²² - 1/2mv₁²",
            "tags": ["物理", "力学", "动能定理"],
            "deck": "物理"
        },
        {
            "id": "card_test_004",
            "user_id": "u_test_001",
            "front": "等差数列的通项公式？",
            "back": "an = a₁ + (n-1)d\n其中：a₁为首项，d为公差，n为项数",
            "tags": ["数学", "数列"],
            "deck": "数学"
        }
    ]

    for card_data in cards:
        card = models.FlashCard(
            id=card_data["id"],
            user_id=card_data["user_id"],
            front=card_data["front"],
            back=card_data["back"],
            tags=card_data["tags"],
            deck=card_data["deck"],
            ease_factor=2.5,
            interval=0,
            repetitions=0,
            next_review_date=datetime.date.today().strftime("%Y-%m-%d")
        )
        db.merge(card)

    db.commit()
    print(f"  ✅ 创建了 {len(cards)} 张记忆卡")


def create_test_study_sessions(db: Session):
    """创建测试学习会话"""
    print("\n⏱️ 创建测试学习会话...")

    sessions = [
        {
            "id": "session_001",
            "user_id": "u_test_001",
            "duration_minutes": 45,
            "mode": "flow",
            "tasks_completed": 5,
            "mistakes_collected": 2
        },
        {
            "id": "session_002",
            "user_id": "u_test_001",
            "duration_minutes": 30,
            "mode": "classic",
            "tasks_completed": 3,
            "mistakes_collected": 1
        }
    ]

    for s_data in sessions:
        session = models.StudySession(
            id=s_data["id"],
            user_id=s_data["user_id"],
            duration_minutes=s_data["duration_minutes"],
            mode=s_data["mode"],
            tasks_completed=s_data["tasks_completed"],
            mistakes_collected=s_data["mistakes_collected"],
            created_at=datetime.datetime.utcnow().isoformat()
        )
        db.merge(session)

    db.commit()
    print(f"  ✅ 创建了 {len(sessions)} 条学习会话记录")


def create_test_todos(db: Session):
    """创建测试待办事项"""
    print("\n✅ 创建测试待办事项...")

    todos = [
        {
            "id": "todo_001",
            "user_id": "u_test_001",
            "text": "复习牛顿三定律",
            "completed": False,
            "priority": 2,
            "subject": "物理"
        },
        {
            "id": "todo_002",
            "user_id": "u_test_001",
            "text": "完成微积分作业",
            "completed": True,
            "priority": 3,
            "subject": "数学"
        },
        {
            "id": "todo_003",
            "user_id": "u_test_001",
            "text": "背诵英语单词",
            "completed": False,
            "priority": 1,
            "subject": "英语"
        }
    ]

    for t_data in todos:
        todo = models.TodoItem(
            id=t_data["id"],
            user_id=t_data["user_id"],
            text=t_data["text"],
            completed=t_data["completed"],
            priority=t_data["priority"],
            subject=t_data["subject"],
            created_at=datetime.datetime.utcnow().isoformat(),
            completed_at=datetime.datetime.utcnow().isoformat() if t_data["completed"] else None
        )
        db.merge(todo)

    db.commit()
    print(f"  ✅ 创建了 {len(todos)} 个待办事项")


def print_summary():
    """打印测试账号总结"""
    print("\n" + "="*60)
    print("📊 测试数据创建完成！")
    print("="*60)
    print("\n🔑 测试账号：")
    print("  1. 用户名: test_user  /  密码: test123")
    print("  2. 用户名: admin_user /  密码: test123 (管理员)")
    print("\n📦 创建的数据：")
    print("  - 5 道题目（单选、多选、填空、证明题）")
    print("  - 3 个笔记文件")
    print("  - 2 条错题记录")
    print("  - 4 张记忆卡")
    print("  - 2 条学习会话")
    print("  - 3 个待办事项")
    print("\n💡 使用这些账号可以测试所有功能！")
    print("="*60)


def main():
    """主函数"""
    print("🚀 开始创建测试样例数据...\n")

    # 创建所有表
    models.Base.metadata.create_all(bind=engine)

    # 创建数据库会话
    db = SessionLocal()

    try:
        # 创建测试数据
        create_test_users(db)
        create_test_questions(db)
        create_test_notes(db)
        create_test_mistakes(db)
        create_test_flashcards(db)
        create_test_study_sessions(db)
        create_test_todos(db)

        # 打印总结
        print_summary()

    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
