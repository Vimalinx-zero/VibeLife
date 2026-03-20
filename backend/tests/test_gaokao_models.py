#!/usr/bin/env python3
"""
高考学习核心模型验证测试
运行方式：cd backend && python tests/test_gaokao_models.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database import SessionLocal
from models import MistakeItem, WeakPoint, ReviewRecord, VariationQuestion


def test_gaokao_models():
    """测试高考学习模型的基本 CRUD"""
    print("=" * 50)
    print("高考学习模型验证测试")
    print("=" * 50)

    db = SessionLocal()
    try:
        # 1. 测试错题创建
        print("\n[1] 测试错题创建...")
        mistake = MistakeItem(
            id="test-mistake-001",
            user_id="test-user",
            question_text="已知函数 f(x) = x^2 - 2x，求 f(x) 的最小值",
            answer_text="最小值为 -1",
            subject="数学",
            chapter="函数",
            difficulty=3,
            my_answer="-2",
            error_type="计算错误",
            tags=["函数", "最值"]
        )
        db.add(mistake)
        db.commit()
        print("✓ 错题创建成功")

        # 2. 测试薄弱点
        print("\n[2] 测试薄弱点...")
        weakpoint = WeakPoint(
            id="test-weakpoint-001",
            user_id="test-user",
            subject="数学",
            chapter="函数",
            knowledge_point="函数最值",
            weakness_score=60,
            mistake_ids=["test-mistake-001"]
        )
        db.add(weakpoint)
        db.commit()
        print("✓ 薄弱点创建成功")

        # 3. 测试复习记录
        print("\n[3] 测试复习记录...")
        review = ReviewRecord(
            id="test-review-001",
            user_id="test-user",
            mistake_id="test-mistake-001",
            result="correct",
            self_rating=4,
            before_mastery=2,
            after_mastery=3
        )
        db.add(review)
        db.commit()
        print("✓ 复习记录创建成功")

        # 4. 测试变式题
        print("\n[4] 测试变式题...")
        variation = VariationQuestion(
            id="test-variation-001",
            user_id="test-user",
            source_mistake_id="test-mistake-001",
            question_text="已知函数 g(x) = x^2 + 4x，求 g(x) 的最小值",
            answer_text="最小值为 -4",
            variation_type="同类型",
            variation_note="改变了系数"
        )
        db.add(variation)
        db.commit()
        print("✓ 变式题创建成功")

        # 5. 查询验证
        print("\n[5] 查询验证...")
        mistakes = db.query(MistakeItem).filter(MistakeItem.user_id == "test-user").all()
        print(f"  - 错题数: {len(mistakes)}")

        weakpoints = db.query(WeakPoint).filter(WeakPoint.user_id == "test-user").all()
        print(f"  - 薄弱点数: {len(weakpoints)}")

        reviews = db.query(ReviewRecord).filter(ReviewRecord.user_id == "test-user").all()
        print(f"  - 复习记录数: {len(reviews)}")

        variations = db.query(VariationQuestion).filter(VariationQuestion.user_id == "test-user").all()
        print(f"  - 变式题数: {len(variations)}")

        # 清理测试数据
        print("\n[6] 清理测试数据...")
        db.delete(variation)
        db.delete(review)
        db.delete(weakpoint)
        db.delete(mistake)
        db.commit()
        print("✓ 测试数据清理完成")

        print("\n" + "=" * 50)
        print("✓ 高考学习模型验证通过")
        print("=" * 50)
        return True

    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    test_gaokao_models()
