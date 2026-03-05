"""
SM-2 间隔重复算法 (SuperMemo 2)
用于计算记忆卡的复习间隔

参考: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
"""

from datetime import datetime, timedelta
from typing import Tuple

def calculate_next_review(
    quality: int,
    ease_factor: float,
    interval: int,
    repetitions: int
) -> Tuple[float, int, int, str]:
    """
    计算下次复习时间

    Args:
        quality: 评分 (0-5)
            5 - 完美记忆
            4 - 正确回答，稍有犹豫
            3 - 正确回答，但很困难
            2 - 不正确回答，但似乎记得
            1 - 不正确回答，但有印象
            0 - 完全忘记
        ease_factor: 难度因子 (默认 2.5)
        interval: 当前间隔天数
        repetitions: 成功复习次数

    Returns:
        Tuple[new_ease_factor, new_interval, new_repetitions, next_review_date]
    """

    # 如果评分小于3，重置复习次数
    if quality < 3:
        return (
            ease_factor,
            1,  # 间隔重置为1天
            0,  # 重复次数重置
            (datetime.utcnow() + timedelta(days=1)).isoformat()
        )

    # 计算新的难度因子
    # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    new_ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    # 难度因子最小值为 1.3
    if new_ease_factor < 1.3:
        new_ease_factor = 1.3

    # 计算新的间隔
    if repetitions == 0:
        # 第一次复习，间隔1天
        new_interval = 1
    elif repetitions == 1:
        # 第二次复习，间隔6天
        new_interval = 6
    else:
        # 之后每次复习，间隔 = 上次间隔 * 难度因子
        new_interval = int(interval * new_ease_factor)

    new_repetitions = repetitions + 1

    # 计算下次复习日期
    next_review_date = (datetime.utcnow() + timedelta(days=new_interval)).isoformat()

    return new_ease_factor, new_interval, new_repetitions, next_review_date


def get_due_cards_query(user_id: str = "default_user") -> str:
    """
    获取今日待复习卡片的查询条件

    Returns:
        ISO格式的日期字符串（今天的起始时间）
    """
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    return today.isoformat()


def is_card_due(next_review_date: str) -> bool:
    """
    判断卡片是否到期需要复习

    Args:
        next_review_date: 下次复习日期（ISO格式）

    Returns:
        True if due, False otherwise
    """
    if not next_review_date:
        # 新卡片，立即复习
        return True

    try:
        review_date = datetime.fromisoformat(next_review_date)
        now = datetime.utcnow()
        return review_date <= now
    except:
        return True  # 如果解析失败，默认需要复习


def get_review_statistics(quality: int) -> dict:
    """
    根据评分获取统计信息

    Returns:
        包含统计信息的字典
    """
    quality_labels = {
        0: "完全忘记",
        1: "不记得",
        2: "困难",
        3: "一般",
        4: "容易",
        5: "非常容易"
    }

    return {
        "quality": quality,
        "label": quality_labels.get(quality, "未知"),
        "is_success": quality >= 3,  # 3分及以上算成功
        "is_perfect": quality == 5,
    }
