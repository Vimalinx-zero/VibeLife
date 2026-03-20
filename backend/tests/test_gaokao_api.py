#!/usr/bin/env python3
"""
高考学习 API 端到端测试
启动服务后运行：python tests/test_gaokao_api.py
"""

import requests
import json

BASE_URL = "http://localhost:43800"
USER_ID = "test-user-api"


def test_api():
    print("=" * 50)
    print("高考学习 API 端到端测试")
    print("=" * 50)

    # 1. 创建错题
    print("\n[1] 创建错题...")
    mistake_data = {
        "question_text": "测试题目：求函数 f(x) = x^2 - 4x + 3 的最小值",
        "answer_text": "最小值为 -1，当 x = 2 时取得",
        "subject": "数学",
        "chapter": "二次函数",
        "difficulty": 3,
        "my_answer": "最小值是 0",
        "error_type": "计算错误",
        "key_insight": "配方时漏掉了常数项",
        "tags": ["二次函数", "最值", "配方法"]
    }

    try:
        resp = requests.post(
            f"{BASE_URL}/api/gaokao/mistakes?user_id={USER_ID}",
            json=mistake_data
        )
        if resp.status_code == 200:
            mistake_id = resp.json()["id"]
            print(f"✓ 错题创建成功: {mistake_id}")
        else:
            print(f"✗ 创建失败: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        print(f"✗ 连接失败: {e}")
        print("  请确保后端服务已启动: python main.py 或 bash scripts/run_backend.sh")
        return False

    # 2. 获取错题列表
    print("\n[2] 获取错题列表...")
    resp = requests.get(f"{BASE_URL}/api/gaokao/mistakes?user_id={USER_ID}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"✓ 获取到 {data['total']} 条错题")
    else:
        print(f"✗ 获取失败: {resp.status_code}")
        return False

    # 3. 获取错题详情
    print("\n[3] 获取错题详情...")
    resp = requests.get(f"{BASE_URL}/api/gaokao/mistakes/{mistake_id}?user_id={USER_ID}")
    if resp.status_code == 200:
        detail = resp.json()
        print(f"✓ 错题详情: {detail['subject']} - {detail['chapter']}")
        print(f"  掌握度: {detail['mastery_level']}")
    else:
        print(f"✗ 获取失败: {resp.status_code}")
        return False

    # 4. 记录复习
    print("\n[4] 记录复习...")
    review_data = {
        "mistake_id": mistake_id,
        "result": "correct",
        "time_spent_seconds": 120,
        "self_rating": 4,
        "notes": "这次做对了，记住配方法"
    }
    resp = requests.post(
        f"{BASE_URL}/api/gaokao/reviews?user_id={USER_ID}",
        json=review_data
    )
    if resp.status_code == 200:
        result = resp.json()
        print(f"✓ 复习记录成功")
        print(f"  掌握度变化: {result['mastery_change']}")
        print(f"  下次复习: {result['next_review'][:10]}")
    else:
        print(f"✗ 复习记录失败: {resp.status_code}")
        return False

    # 5. 创建变式题
    print("\n[5] 创建变式题...")
    variation_data = {
        "source_mistake_id": mistake_id,
        "question_text": "变式题：求函数 g(x) = -x^2 + 6x - 5 的最大值",
        "answer_text": "最大值为 4，当 x = 3 时取得",
        "variation_type": "同类型",
        "variation_note": "改为求最大值，系数符号变化"
    }
    resp = requests.post(
        f"{BASE_URL}/api/gaokao/variations?user_id={USER_ID}",
        json=variation_data
    )
    if resp.status_code == 200:
        variation_id = resp.json()["id"]
        print(f"✓ 变式题创建成功: {variation_id}")
    else:
        print(f"✗ 创建失败: {resp.status_code}")
        return False

    # 6. 获取今日待复习
    print("\n[6] 获取今日待复习...")
    resp = requests.get(f"{BASE_URL}/api/gaokao/reviews/today?user_id={USER_ID}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"✓ 今日待复习: {data['total']} 题")
    else:
        print(f"✗ 获取失败: {resp.status_code}")

    # 7. 获取薄弱点
    print("\n[7] 获取薄弱点...")
    resp = requests.get(f"{BASE_URL}/api/gaokao/weakpoints?user_id={USER_ID}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"✓ 薄弱点: {data['total']} 个")
        for wp in data['items'][:3]:
            print(f"  - {wp['subject']}/{wp['knowledge_point']}: {wp['weakness_score']}分")
    else:
        print(f"✗ 获取失败: {resp.status_code}")

    # 8. 清理测试数据
    print("\n[8] 清理测试数据...")
    resp = requests.delete(
        f"{BASE_URL}/api/gaokao/mistakes/{mistake_id}?user_id={USER_ID}"
    )
    if resp.status_code == 200:
        print("✓ 测试数据清理完成")
    else:
        print(f"⚠ 清理失败: {resp.status_code}")

    print("\n" + "=" * 50)
    print("✓ 高考学习 API 端到端测试通过")
    print("=" * 50)
    return True


if __name__ == "__main__":
    test_api()
