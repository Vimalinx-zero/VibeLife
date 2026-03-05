#(注释) backend/migrate_fix_options.py
#(注释) 数据迁移脚本：修复现有题目的选项格式

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
import models

def migrate_question_options():
    """
    修复现有题目的选项格式：
    1. 检查所有题目
    2. 对于缺少 content.options 的题目，尝试从 steps 中恢复
    """
    db = SessionLocal()

    try:
        questions = db.query(models.Question).all()
        print(f"开始迁移，共 {len(questions)} 道题目\n")

        fixed_count = 0
        skipped_count = 0
        error_count = 0

        for q in questions:
            print(f"检查题目: {q.id} ({q.subject})")

            # 检查 content 是否存在
            if not q.content:
                print(f"  ⚠️  content 为空，跳过")
                skipped_count += 1
                continue

            # 检查是否已有 options
            if 'options' in q.content:
                print(f"  ✅ 已有 options 字段，跳过")
                skipped_count += 1
                continue

            # 尝试从 steps 恢复选项
            if q.steps and len(q.steps) > 0:
                # 方案1：如果是单选题，从 steps[0] 获取选项
                if q.type == 'single' or q.type == 'multiple':
                    first_step = q.steps[0]
                    if 'options' in first_step:
                        print(f"  🔧 从 steps[0] 恢复选项（{len(first_step['options'])} 个）")

                        # 复制选项到 content（需要完整替换以触发 SQLAlchemy 更新）
                        new_content = dict(q.content)  # 创建副本
                        new_content['options'] = first_step['options']
                        q.content = new_content  # 完整替换

                        db.commit()
                        fixed_count += 1
                        print(f"  ✅ 修复成功")
                    else:
                        print(f"  ❌ steps[0] 也没有 options，无法修复")
                        error_count += 1

                # 方案2：如果是复合题，暂时跳过（需要更复杂的处理逻辑）
                elif q.type == 'composite':
                    print(f"  ⚠️  复合题需要手动处理，跳过")
                    skipped_count += 1

                else:
                    print(f"  ❌ 未知题目类型: {q.type}")
                    error_count += 1
            else:
                print(f"  ❌ 没有 steps 数据，无法恢复")
                error_count += 1

            print("-" * 80)

        # 输出统计结果
        print("\n" + "=" * 80)
        print("迁移完成！")
        print(f"  ✅ 成功修复: {fixed_count} 道题")
        print(f"  ⏭️  跳过: {skipped_count} 道题")
        print(f"  ❌ 失败: {error_count} 道题")
        print("=" * 80)

        # 如果有失败的题目，显示详情
        if error_count > 0:
            print("\n需要手动修复的题目：")
            for q in questions:
                if not q.content or 'options' not in q.content:
                    print(f"  - {q.id} ({q.subject}): {q.type}")
                    if q.content and 'stem' in q.content:
                        stem = q.content['stem'][:50] + "..." if len(q.content['stem']) > 50 else q.content['stem']
                        print(f"    题干: {stem}")

    except Exception as e:
        print(f"\n❌ 迁移过程中出错: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 80)
    print("题目选项数据迁移工具")
    print("=" * 80)
    migrate_question_options()
