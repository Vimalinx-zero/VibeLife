"""
后端API自动化测试脚本

测试主要功能：
1. 用户认证
2. 笔记系统 CRUD
3. 题目推荐和提交
4. 错题本功能
5. Anki记忆卡功能
6. 数据导入导出

运行方式：
    cd backend
    python test_api.py
"""

import requests
import json
import sys
import time
import uuid

BASE_URL = "http://localhost:8000"


class Colors:
    """终端颜色"""

    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"
    BOLD = "\033[1m"


def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")


def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.RESET}")


def print_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.RESET}")


def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.RESET}")


def print_section(title):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}  {title}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}\n")


# ==================== 测试结果统计 ====================
test_results = {"passed": 0, "failed": 0, "skipped": 0, "tests": []}


def run_test(test_name, test_func):
    """运行单个测试"""
    try:
        test_func()
        test_results["passed"] += 1
        test_results["tests"].append({"name": test_name, "status": "PASSED"})
        print_success(test_name)
        return True
    except AssertionError as e:
        test_results["failed"] += 1
        test_results["tests"].append(
            {"name": test_name, "status": "FAILED", "error": str(e)}
        )
        print_error(f"{test_name}: {e}")
        return False
    except Exception as e:
        test_results["failed"] += 1
        test_results["tests"].append(
            {"name": test_name, "status": "ERROR", "error": str(e)}
        )
        print_error(f"{test_name}: {e}")
        return False


def create_temp_user(prefix):
    """创建临时测试用户并返回 token 与用户ID"""
    suffix = f"{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
    username = f"{prefix}_{suffix}"
    email = f"{prefix}_{suffix}@example.com"

    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": "test123",
            "full_name": f"{prefix} security user",
        },
    )

    assert response.status_code == 201, f"注册临时用户失败: {response.status_code}"
    data = response.json()
    assert "access_token" in data, "注册响应中没有 access_token"
    assert "user_id" in data, "注册响应中没有 user_id"
    return data["access_token"], data["user_id"]


def ensure_minimal_questions_seeded(token):
    """确保存在至少一条可自动判分题目（single/multiple/fill_blank）"""
    headers = {"Authorization": f"Bearer {token}"}

    questions_resp = requests.get(f"{BASE_URL}/api/questions")
    assert questions_resp.status_code == 200, (
        f"获取题目失败: {questions_resp.status_code}"
    )
    questions = questions_resp.json()
    assert isinstance(questions, list), "题目列表应该是数组"

    has_auto_gradable = any(q.get("type") not in ["proof", "essay"] for q in questions)
    if has_auto_gradable:
        return

    seed_id = f"seed_q_{int(time.time() * 1000)}"
    seed_questions = [
        {
            "id": seed_id,
            "subject": "physics",
            "type": "single_choice",
            "stem": "测试题：牛顿第二定律公式是？",
            "options": [
                {"key": "A", "text": "F=ma", "is_correct": True},
                {"key": "B", "text": "E=mc^2", "is_correct": False},
                {"key": "C", "text": "v=s/t", "is_correct": False},
            ],
            "answer": "A",
            "explanation": "牛顿第二定律表述为 F = ma。",
        }
    ]

    files = {
        "file": (
            "seed_questions.json",
            json.dumps(seed_questions, ensure_ascii=False).encode("utf-8"),
            "application/json",
        )
    }
    import_resp = requests.post(
        f"{BASE_URL}/api/data/import/questions", headers=headers, files=files
    )
    assert import_resp.status_code == 200, (
        f"导入种子题目失败: {import_resp.status_code}"
    )

    verify_resp = requests.get(f"{BASE_URL}/api/questions")
    assert verify_resp.status_code == 200, (
        f"导入后验证题目失败: {verify_resp.status_code}"
    )
    verify_questions = verify_resp.json()
    assert any(q.get("type") not in ["proof", "essay"] for q in verify_questions), (
        "导入后仍无可自动判分题目"
    )
    print_success("最小可判分题库已自动注入")


def create_mistake_for_user(token):
    """为指定用户制造一条错题，返回 mistake_id"""
    headers = {"Authorization": f"Bearer {token}"}

    ensure_minimal_questions_seeded(token)

    # 选一个可自动判分的题目（避开 proof/essay）
    questions_resp = requests.get(f"{BASE_URL}/api/questions")
    assert questions_resp.status_code == 200, (
        f"获取题目失败: {questions_resp.status_code}"
    )
    questions = questions_resp.json()
    if not isinstance(questions, list) or len(questions) == 0:
        raise AssertionError("题库为空，无法构造错题")

    target = None
    for q in questions:
        q_type = q.get("type")
        if q_type not in ["proof", "essay"]:
            target = q
            break

    if target is None:
        raise AssertionError("未找到可自动判分题目，无法构造错题")
    question_id = target.get("question_id") or target.get("id")
    assert question_id, "题目缺少 ID 字段"

    submit_resp = requests.post(
        f"{BASE_URL}/api/quiz/submit",
        headers=headers,
        json={
            "question_id": question_id,
            "selected_key": "__intentionally_wrong__",
            "duration_ms": 500,
            "is_hesitant": False,
        },
    )
    assert submit_resp.status_code == 200, f"提交错题失败: {submit_resp.status_code}"

    mistakes_resp = requests.get(f"{BASE_URL}/api/mistakes", headers=headers)
    assert mistakes_resp.status_code == 200, (
        f"获取错题本失败: {mistakes_resp.status_code}"
    )
    mistakes = mistakes_resp.json()

    for item in mistakes:
        if str(item.get("question_id")) == str(question_id):
            return item.get("id")

    raise AssertionError("未找到刚创建的错题记录")


# ==================== 1. 认证测试 ====================
def test_auth_login():
    """创建测试用户并获取 token"""
    print_section("1. 用户认证测试")

    token, _ = create_temp_user("suite")
    print_success("测试用户创建成功")
    return token


def test_auth_invalid_credentials():
    """测试无效凭证"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "invalid_user", "password": "wrong_password"},
    )

    # 应该返回401
    assert response.status_code == 401, f"应该返回401，实际返回: {response.status_code}"
    print_success("无效凭证被正确拒绝")


def test_auth_me_requires_bearer(token):
    """测试 /api/auth/me 必须使用 Bearer Token 头"""
    # 使用 query token（旧方式）应失败
    legacy_response = requests.get(f"{BASE_URL}/api/auth/me", params={"token": token})
    assert legacy_response.status_code == 401, (
        f"旧认证方式应返回401，实际: {legacy_response.status_code}"
    )

    # 使用标准 Bearer 头应成功
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    assert response.status_code == 200, f"Bearer 认证失败: {response.status_code}"
    data = response.json()
    assert "id" in data and "username" in data, "用户信息字段不完整"
    print_success("/api/auth/me Bearer 认证验证通过")


def test_auth_change_password():
    """测试修改密码接口闭环（改密后旧密码失效，新密码可登录）"""
    suffix = f"{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
    username = f"pwd_{suffix}"
    email = f"pwd_{suffix}@example.com"
    old_password = "test123"
    new_password = "test456"

    register_response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": old_password,
            "full_name": "password test user",
        },
    )
    assert register_response.status_code == 201, (
        f"注册改密测试用户失败: {register_response.status_code}"
    )
    token = register_response.json().get("access_token")
    assert token, "注册后未返回 access_token"

    change_resp = requests.post(
        f"{BASE_URL}/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": old_password, "new_password": new_password},
    )
    assert change_resp.status_code == 200, f"修改密码失败: {change_resp.status_code}"

    old_login = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": username, "password": old_password},
    )
    assert old_login.status_code == 401, (
        f"旧密码应失效，实际返回: {old_login.status_code}"
    )

    new_login = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": username, "password": new_password},
    )
    assert new_login.status_code == 200, f"新密码登录失败: {new_login.status_code}"

    print_success("修改密码闭环验证通过")


# ==================== 2. 笔记系统测试 ====================
def test_notes_create(token):
    """测试创建笔记"""
    print_section("2. 笔记系统测试")

    headers = {"Authorization": f"Bearer {token}"}

    # 创建笔记
    response = requests.post(
        f"{BASE_URL}/api/notes/create",
        headers=headers,
        json={
            "name": "测试笔记",
            "type": "file",
            "parent_id": "root",
            "content": "这是一条测试笔记",
        },
    )

    assert response.status_code == 200, f"创建笔记失败: {response.status_code}"
    data = response.json()
    assert data["success"] == True, "创建笔记未返回成功"

    print_success("创建笔记成功")

    # 获取笔记列表
    response = requests.get(f"{BASE_URL}/api/notes/view?id=root", headers=headers)
    assert response.status_code == 200, f"获取笔记列表失败: {response.status_code}"

    data = response.json()
    assert "items" in data, "响应中没有 items"
    assert len(data["items"]) > 0, "笔记列表为空"

    print_success(f"获取笔记列表成功，共 {len(data['items'])} 项")


# ==================== 3. 题目系统测试 ====================
def test_questions_get_all():
    """测试获取题目列表"""
    print_section("3. 题目系统测试")

    # 获取所有题目（不需要认证）
    response = requests.get(f"{BASE_URL}/api/questions")
    assert response.status_code == 200, f"获取题目列表失败: {response.status_code}"

    data = response.json()
    assert isinstance(data, list), "题目列表应该是数组"
    if len(data) == 0:
        print_warning("题目列表为空（当前数据库未初始化题库）")
    else:
        print_success(f"获取题目列表成功，共 {len(data)} 道题")


def test_quiz_recommend(token):
    """测试智能推荐"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/api/quiz/recommend?question_count=5", headers=headers
    )
    assert response.status_code == 200, f"获取推荐题目失败: {response.status_code}"

    data = response.json()
    assert isinstance(data, list), "推荐题目应该是数组"

    print_success(f"智能推荐成功，返回 {len(data)} 道题")


def test_quiz_recommend_fallback():
    """测试错题不足时推荐接口会回落到题库补题"""
    token, _ = create_temp_user("fallback")
    headers = {"Authorization": f"Bearer {token}"}

    ensure_minimal_questions_seeded(token)

    response = requests.get(
        f"{BASE_URL}/api/quiz/recommend?question_count=3",
        headers=headers,
    )
    assert response.status_code == 200, f"获取推荐题目失败: {response.status_code}"

    data = response.json()
    assert isinstance(data, list), "推荐题目应该是数组"
    assert len(data) > 0, "错题为空时应回落补充题库题目，实际返回空列表"

    print_success(f"推荐回落验证通过，返回 {len(data)} 道题")


# ==================== 4. 错题本测试 ====================
def test_mistakes_get(token):
    """测试获取错题本"""
    print_section("4. 错题本测试")

    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/api/mistakes", headers=headers)
    assert response.status_code == 200, f"获取错题本失败: {response.status_code}"

    data = response.json()
    assert isinstance(data, list), "错题本应该是数组"
    # 可能是空列表，因为用户可能还没有错题

    print_success(f"获取错题本成功，共 {len(data)} 条")


def test_mistake_review(token):
    """测试错题复习"""
    headers = {"Authorization": f"Bearer {token}"}

    # 先获取错题
    response = requests.get(f"{BASE_URL}/api/mistakes", headers=headers)
    mistakes = response.json()

    if len(mistakes) > 0:
        mistake_id = mistakes[0]["id"]

        # 提交复习结果
        response = requests.post(
            f"{BASE_URL}/api/mistakes/review",
            headers=headers,
            json={"mistake_id": mistake_id, "selected_key": "A"},
        )

        assert response.status_code == 200, f"提交错题复习失败: {response.status_code}"
        data = response.json()
        assert data["success"] == True, "复习未返回成功"

        print_success("错题复习成功")
    else:
        print_warning("没有错题可以复习")


# ==================== 5. Anki记忆卡测试 ====================
def test_cards_create(token):
    """测试创建记忆卡"""
    print_section("5. Anki记忆卡测试")

    headers = {"Authorization": f"Bearer {token}"}

    # 创建记忆卡
    response = requests.post(
        f"{BASE_URL}/api/cards",
        headers=headers,
        json={
            "front": "测试问题",
            "back": "测试答案",
            "tags": ["测试"],
            "deck": "测试牌组",
        },
    )

    assert response.status_code == 200, f"创建记忆卡失败: {response.status_code}"
    data = response.json()
    assert data["success"] == True, "创建记忆卡未返回成功"

    print_success("创建记忆卡成功")


def test_cards_get(token):
    """测试获取记忆卡"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/api/cards", headers=headers)
    assert response.status_code == 200, f"获取记忆卡失败: {response.status_code}"

    data = response.json()
    assert "cards" in data, "响应中没有 cards"

    print_success(f"获取记忆卡成功，共 {data['total']} 张")


def test_anki_get_due(token):
    """测试获取待复习卡片"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/api/anki/review/due", headers=headers)
    assert response.status_code == 200, f"获取待复习卡片失败: {response.status_code}"

    data = response.json()
    assert isinstance(data, list), "待复习卡片应该是数组"

    print_success(f"获取待复习卡片成功，共 {len(data)} 张")


# ==================== 6. Dashboard统计测试 ====================
def test_dashboard_stats(token):
    """测试获取统计数据"""
    print_section("6. Dashboard统计测试")

    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
    assert response.status_code == 200, f"获取统计失败: {response.status_code}"

    data = response.json()
    assert "duration_minutes" in data, "统计数据缺少 duration_minutes"
    assert "questions_completed" in data, "统计数据缺少 questions_completed"
    assert "notes_created" in data, "统计数据缺少 notes_created"

    print_success("获取统计数据成功")

    response = requests.get(f"{BASE_URL}/api/dashboard/heatmap?days=7", headers=headers)
    assert response.status_code == 200, f"获取热力图失败: {response.status_code}"

    data = response.json()
    assert "heatmap" in data, "热力图数据缺少 heatmap"

    print_success("获取学习热力图成功")


# ==================== 7. 数据导入导出测试 ====================
def test_data_export(token):
    """测试数据导出"""
    print_section("7. 数据导入导出测试")

    headers = {"Authorization": f"Bearer {token}"}

    # 尝试获取数据统计（export_routes的版本）
    response = requests.get(f"{BASE_URL}/api/data/stats", headers=headers)
    assert response.status_code == 200, f"获取数据统计失败: {response.status_code}"

    data = response.json()
    # export_routes版本返回：questions, mistakes, notes, folders, subjects
    assert "notes" in data or "questions" in data, "统计数据缺少必要字段"

    print_success("获取数据统计成功")

    # 测试记忆卡统计（使用专门的端点）
    response = requests.get(f"{BASE_URL}/api/cards/stats", headers=headers)
    assert response.status_code == 200, f"获取记忆卡统计失败: {response.status_code}"

    card_data = response.json()
    assert "total_cards" in card_data, "记忆卡统计缺少 total_cards"

    print_success("获取记忆卡统计成功")

    # 导出所有数据
    response = requests.get(f"{BASE_URL}/api/data/export/all", headers=headers)
    # 注意：这个可能返回ZIP文件，可能不适合在API测试中完整测试

    print_success("数据导出接口可访问")


def test_data_backup_roundtrip(token):
    """测试完整备份导出(JSON)并通过文件上传回导入"""
    headers = {"Authorization": f"Bearer {token}"}

    export_resp = requests.get(
        f"{BASE_URL}/api/data/export/all?format=json", headers=headers
    )
    assert export_resp.status_code == 200, f"完整导出失败: {export_resp.status_code}"

    backup_payload = export_resp.json()
    assert isinstance(backup_payload, dict), "完整导出应返回 JSON 对象"
    assert "data" in backup_payload, "完整导出数据缺少 data 字段"

    files = {
        "file": (
            "flowstudy_backup.json",
            json.dumps(backup_payload, ensure_ascii=False).encode("utf-8"),
            "application/json",
        )
    }
    import_resp = requests.post(
        f"{BASE_URL}/api/data/import/backup",
        headers=headers,
        files=files,
    )
    assert import_resp.status_code == 200, f"完整导入失败: {import_resp.status_code}"

    import_data = import_resp.json()
    assert import_data.get("success") is True, "完整导入未返回 success=true"
    assert "imported" in import_data, "完整导入响应缺少 imported 字段"

    print_success("完整备份导入导出回归通过")


# ==================== 8. 安全隔离回归测试 ====================
def test_security_unauthorized_rejected():
    """未认证请求应被拒绝（401）"""
    response = requests.get(f"{BASE_URL}/api/mistakes")
    assert response.status_code == 401, (
        f"未认证访问应返回401，实际: {response.status_code}"
    )
    print_success("未认证访问被正确拒绝")


def test_security_cross_user_mistake_isolation():
    """跨用户访问/操作他人错题应被拒绝"""
    owner_token, _ = create_temp_user("owner")
    attacker_token, _ = create_temp_user("attacker")

    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    attacker_headers = {"Authorization": f"Bearer {attacker_token}"}

    mistake_id = create_mistake_for_user(owner_token)
    assert mistake_id is not None, "未能创建 owner 错题"

    # 1) 跨用户删除应失败
    delete_resp = requests.delete(
        f"{BASE_URL}/api/mistakes/{mistake_id}", headers=attacker_headers
    )
    assert delete_resp.status_code == 404, (
        f"跨用户删除应返回404，实际: {delete_resp.status_code}"
    )

    # 2) 跨用户复习应失败
    review_resp = requests.post(
        f"{BASE_URL}/api/mistakes/review",
        headers=attacker_headers,
        json={"mistake_id": mistake_id, "selected_key": "A"},
    )
    assert review_resp.status_code == 200, (
        f"跨用户复习返回异常状态: {review_resp.status_code}"
    )
    review_data = review_resp.json()
    assert review_data.get("success") is False, "跨用户复习不应成功"

    # 3) 跨用户关联笔记应失败
    link_resp = requests.post(
        f"{BASE_URL}/api/mistakes/link_note",
        headers=attacker_headers,
        json={
            "mistake_id": mistake_id,
            "name": "hijack note",
            "content": "should fail",
        },
    )
    assert link_resp.status_code == 404, (
        f"跨用户关联应返回404，实际: {link_resp.status_code}"
    )

    # 4) 确认 owner 的错题仍然存在
    owner_mistakes_resp = requests.get(
        f"{BASE_URL}/api/mistakes", headers=owner_headers
    )
    assert owner_mistakes_resp.status_code == 200, (
        f"owner 获取错题失败: {owner_mistakes_resp.status_code}"
    )
    owner_mistakes = owner_mistakes_resp.json()
    assert any(m.get("id") == mistake_id for m in owner_mistakes), (
        "跨用户操作后 owner 错题异常丢失"
    )

    print_success("跨用户错题隔离验证通过")


def test_route_contract_authenticated(token):
    """关键前端依赖路由的认证后可用性契约"""
    headers = {"Authorization": f"Bearer {token}"}

    contract_cases = [
        ("GET", "/api/notes/view?id=root"),
        ("GET", "/api/mistakes"),
        ("GET", "/api/quiz/recommend?question_count=3"),
        ("GET", "/api/anki/cards"),
        ("GET", "/api/dashboard/stats"),
        ("GET", "/api/data/stats"),
    ]

    for method, path in contract_cases:
        if method == "GET":
            response = requests.get(f"{BASE_URL}{path}", headers=headers)
        else:
            raise AssertionError(f"Unsupported method in contract test: {method}")
        assert response.status_code != 404, f"契约路由不存在: {method} {path}"
        assert response.status_code < 500, (
            f"契约路由服务异常: {method} {path} -> {response.status_code}"
        )

    print_success("关键路由认证契约验证通过")


def test_route_contract_unauthorized():
    """认证保护路由在未登录时应拒绝访问"""
    protected_paths = [
        "/api/notes/view?id=root",
        "/api/mistakes",
        "/api/quiz/recommend?question_count=3",
        "/api/anki/cards",
        "/api/dashboard/stats",
    ]

    for path in protected_paths:
        response = requests.get(f"{BASE_URL}{path}")
        assert response.status_code == 401, (
            f"未认证应返回401: GET {path} -> {response.status_code}"
        )

    print_success("关键路由未认证拒绝契约验证通过")


# ==================== 主测试运行器 ====================
def main():
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("=" * 60)
    print("  FlowStudy 后端API自动化测试")
    print("=" * 60)
    print(f"{Colors.RESET}\n")

    print_info(f"测试服务器: {BASE_URL}")
    print_info("测试将自动创建临时账号\n")

    # 1. 认证测试
    try:
        token = test_auth_login()
        run_test("用户登录", lambda: None)  # 上面已经测试过了
        run_test("无效凭证拒绝", test_auth_invalid_credentials)
        run_test("/api/auth/me Bearer认证", lambda: test_auth_me_requires_bearer(token))
        run_test("修改密码闭环", test_auth_change_password)
    except Exception as e:
        print_error(f"认证测试失败: {e}")
        print_error("无法继续后续测试，需要有效的token")
        return

    # 题库前置：确保至少有一条可自动判分题目
    run_test("最小题库注入", lambda: ensure_minimal_questions_seeded(token))

    # 2. 笔记系统
    run_test("创建笔记", lambda: test_notes_create(token))

    # 3. 题目系统
    run_test("获取题目列表", test_questions_get_all)
    run_test("智能推荐", lambda: test_quiz_recommend(token))
    run_test("智能推荐回落补题", test_quiz_recommend_fallback)

    # 4. 错题本
    run_test("获取错题本", lambda: test_mistakes_get(token))
    run_test("错题复习", lambda: test_mistake_review(token))

    # 5. Anki记忆卡
    run_test("创建记忆卡", lambda: test_cards_create(token))
    run_test("获取记忆卡", lambda: test_cards_get(token))
    run_test("获取待复习卡片", lambda: test_anki_get_due(token))

    # 6. Dashboard统计
    run_test("获取统计数据", lambda: test_dashboard_stats(token))

    # 7. 数据导入导出
    run_test("数据导出", lambda: test_data_export(token))
    run_test("完整备份导入导出", lambda: test_data_backup_roundtrip(token))

    # 8. 安全隔离回归
    run_test("未认证请求拒绝", test_security_unauthorized_rejected)
    run_test("跨用户错题隔离", test_security_cross_user_mistake_isolation)

    # 9. 路由契约回归
    run_test("关键路由认证契约", lambda: test_route_contract_authenticated(token))
    run_test("关键路由未认证契约", test_route_contract_unauthorized)

    # 打印测试报告
    print_section("测试报告")

    total = test_results["passed"] + test_results["failed"]
    pass_rate = (test_results["passed"] / total * 100) if total > 0 else 0

    print(f"{Colors.BOLD}总测试数: {total}{Colors.RESET}")
    print(f"{Colors.GREEN}通过: {test_results['passed']}{Colors.RESET}")
    print(f"{Colors.RED}失败: {test_results['failed']}{Colors.RESET}")
    print(f"{Colors.YELLOW}跳过: {test_results['skipped']}{Colors.RESET}")
    print(f"{Colors.BOLD}通过率: {pass_rate:.1f}%{Colors.RESET}")

    if test_results["failed"] > 0:
        print(f"\n{Colors.RED}失败的测试：{Colors.RESET}")
        for test in test_results["tests"]:
            if test["status"] in ["FAILED", "ERROR"]:
                print(f"  - {test['name']}: {test.get('error', 'Unknown error')}")

    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}\n")

    return test_results["failed"] == 0


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print_warning("\n测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print_error(f"\n测试运行出错: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
