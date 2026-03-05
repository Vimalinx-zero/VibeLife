#(注释) backend/migrate_unify_options.py
#(注释) 统一选项格式：确保所有选项同时有 id 和 key 字段

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
import models

def migrate_unify_option_fields():
    """
    统一所有题目的选项格式：
    - 确保每个选项同时有 id 和 key 字段
    - 确保每个选项同时有 text 和 content 字段
    """
    db = SessionLocal()

    try:
        questions = db.query(models.Question).all()
        print(f"开始统一选项格式，共 {len(questions)} 道题目\n")

        fixed_count = 0
        skipped_count = 0

        for q in questions:
            print(f"检查题目: {q.id}")

            if not q.content or 'options' not in q.content:
                print(f"  ⚠️  没有 options，跳过")
                skipped_count += 1
                continue

            options = q.content['options']
            if not options:
                print(f"  ⚠️  options 为空，跳过")
                skipped_count += 1
                continue

            # 检查是否需要修复
            needs_fix = False
            for opt in options:
                if 'id' not in opt or 'key' not in opt or 'text' not in opt or 'content' not in opt:
                    needs_fix = True
                    break

            if not needs_fix:
                print(f"  ✅ 格式已统一，跳过")
                skipped_count += 1
                continue

            # 修复选项格式
            print(f"  🔧 修复选项格式")
            new_options = []
            for opt in options:
                new_opt = dict(opt)

                # 统一 id 和 key
                if 'id' in opt and 'key' not in opt:
                    new_opt['key'] = opt['id']
                elif 'key' in opt and 'id' not in opt:
                    new_opt['id'] = opt['key']

                # 统一 text 和 content
                if 'text' in opt and 'content' not in opt:
                    new_opt['content'] = opt['text']
                elif 'content' in opt and 'text' not in opt:
                    new_opt['text'] = opt['content']

                new_options.append(new_opt)

            # 完整替换 content
            new_content = dict(q.content)
            new_content['options'] = new_options
            q.content = new_content

            db.commit()
            fixed_count += 1
            print(f"  ✅ 修复成功（{len(new_options)} 个选项）")

            print("-" * 80)

        # 输出统计结果
        print("\n" + "=" * 80)
        print("迁移完成！")
        print(f"  ✅ 成功修复: {fixed_count} 道题")
        print(f"  ⏭️  跳过: {skipped_count} 道题")
        print("=" * 80)

    except Exception as e:
        print(f"\n❌ 迁移过程中出错: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 80)
    print("选项格式统一工具")
    print("=" * 80)
    migrate_unify_option_fields()
