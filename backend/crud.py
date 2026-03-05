#(注释) backend/crud.py 
#(注释) 数据库操作封装 + 初始化种子数据注入

from sqlalchemy.orm import Session, joinedload
import models
import datetime
from data_store import MOCK_QUESTIONS_DATA, MOCK_FILES_DATA, MOCK_MISTAKES_DATA, MOCK_USER_PROFILE

# --- 初始化逻辑 ---
def init_db(db: Session, user_id: str = "default_user"):
    """如果数据库为空，注入 Mock 数据作为种子""" 
    
    # 1. 检查有没有题目，没有就灌入 
    if db.query(models.Question).count() == 0: 
        for q in MOCK_QUESTIONS_DATA: 
            db_q = models.Question( 
                id=q['meta']['id'], 
                subject=q['base_info']['subject'], 
                type=q['base_info']['type'], 
                difficulty=q['base_info']['difficulty'], 
                macro_tags=q['base_info']['macro_tags'], 
                content=q['content'], 
                steps=q['steps'], 
                summary=q.get('summary') 
            ) 
            db.add(db_q) 
    
    # 2. 检查文件系统 
    if db.query(models.FileItem).count() == 0: 
        for f in MOCK_FILES_DATA: 
            db_f = models.FileItem(**f) 
            db.add(db_f) 
            
    # 3. 检查用户画像
    if not db.query(models.UserProfile).filter_by(user_id=user_id).first():
        db_u = models.UserProfile(**MOCK_USER_PROFILE)
        db.add(db_u)
    # 4. 检查错题 (基于 Mock 数据构建关联)
    if db.query(models.Mistake).count() == 0:
        for m in MOCK_MISTAKES_DATA:
            # 这是一个复杂的关联对象，我们简化处理直接插入
            db_m = models.Mistake(
                user_id=user_id,
                question_id=m['question_id'],
                wrong_step_index=m['wrong_step_index'],
                user_choice=m['user_choice'],
                linked_note_id=m.get('linked_note_id'),
                error_count=2,
                mastery=m['mastery'],
                last_error_time=m['last_error_time'],
                history=m.get('history', [])
            )
            db.add(db_m)

    db.commit() 

# --- 业务逻辑 --- 

def get_files(db: Session): 
    return db.query(models.FileItem).all() 

def create_file(db: Session, file: dict): 
    # 生成简易 ID 
    new_id = f"{file['type']}_{int(datetime.datetime.now().timestamp())}" 
    db_file = models.FileItem(id=new_id, **file) 
    db.add(db_file) 
    db.commit() 
    return db_file 

def update_file(db: Session, file_id: str, content: str = None, name: str = None, parent_id: str = None, tags: list = None):
    item = db.query(models.FileItem).filter(models.FileItem.id == file_id).first()
    if item:
        if content is not None: item.content = content
        if name is not None: item.name = name
        # ✅ 新增：支持移动文件（修改父节点）
        if parent_id is not None: item.parent_id = parent_id
        # ✨ 新增：支持标签更新
        if tags is not None: item.tags = tags
        db.commit()
    return item 

def create_question(db: Session, question_dict: dict):
    """
    创建新题目（支持 JSON 导入格式）

    Args:
        db: 数据库会话
        question_dict: 题目数据字典

    Returns:
        创建的 Question 对象
    """
    # 处理选项数据：从字符串数组转换为对象数组
    options = question_dict.get("options", [])

    if isinstance(options, list):
        # 检查是否已经是对象格式
        if options and isinstance(options[0], dict):
            # 已经是对象格式，直接使用
            processed_options = options
        else:
            # 字符串数组格式，需要转换
            # 例如：["A. 选项1", "B. 选项2"] -> [{"key": "A", "content": "选项1", "is_correct": False}, ...]
            processed_options = []
            for opt in options:
                if isinstance(opt, str):
                    # 解析选项格式："A. 选项内容" 或 "A选项内容"
                    import re
                    match = re.match(r'^([A-Z])[.、]?\s*(.+)$', opt.strip())
                    if match:
                        key = match.group(1)
                        content = match.group(2)
                    else:
                        # 如果没有前缀，自动分配 A, B, C, D
                        key = chr(65 + len(processed_options))
                        content = opt

                    processed_options.append({
                        "key": key,
                        "content": content,
                        "is_correct": False,  # 默认不是正确答案
                        "id": key,  # ✅ 兼容字段：同时支持 key 和 id
                        "text": content  # ✅ 兼容字段：同时支持 content 和 text
                    })
                else:
                    processed_options.append(opt)
    else:
        processed_options = []

    # 设置正确答案
    answer = question_dict.get("answer", "")
    if answer and isinstance(answer, str):
        # 在选项中找到对应的选项并标记为正确答案
        for opt in processed_options:
            if opt.get("key") == answer.upper():
                opt["is_correct"] = True
                break

    # 构建题目内容
    content = {
        "stem": question_dict.get("stem", ""),
        "options": processed_options,
        "explanation": question_dict.get("explanation", "")
    }

    # 创建 Question 对象
    question = models.Question(
        id=question_dict.get("question_id", f"q_{int(datetime.datetime.now().timestamp())}"),
        subject=question_dict.get("subject", "未分类"),
        type=question_dict.get("type", "single"),
        difficulty=question_dict.get("difficulty", 3),
        macro_tags={
            "knowledge": question_dict.get("tags", []),
            "competency": [],
            "cognitive": []
        },
        content=content,
        steps=[],  # JSON 导入默认不是复合题
        summary=question_dict.get("explanation", "")
    )

    db.add(question)
    db.commit()
    db.refresh(question)

    return question

def get_mistakes(db: Session, user_id: str, page: int = 1, limit: int = 20):
    mistakes = (db.query(models.Mistake)
                .options(joinedload(models.Mistake.question))
                .filter(models.Mistake.user_id == user_id)
                .offset((page - 1) * limit)
                .limit(limit)
                .all())
    result = []
    for m in mistakes:
        q = m.question # 关联查询
        if not q: continue

        # 新格式：题目直接有 stem 和 options 字段
        stem = q.stem or ''
        options = q.options or []

        # 找到所有正确答案（支持多选题）
        correct_opts = [o for o in options if o.get('is_correct')]

        # 确定正确答案
        if q.type in ['single_choice', 'multiple_choice']:
            if q.type == 'multiple_choice':
                # 多选题：返回所有正确选项的列表
                correct_choice = ','.join([opt.get('key', '') for opt in correct_opts])
            else:
                # 单选题：只返回第一个正确选项
                correct_opt = correct_opts[0] if correct_opts else None
                correct_choice = correct_opt.get('key', '') if correct_opt else ''
        else:
            # 填空题等
            correct_choice = q.answer or ''

        # 拼装成前端 MistakeCard 需要的格式
        result.append({
            "id": m.id,
            "question_id": q.id,
            "subject": q.subject,
            "type": q.type,
            "stem_snapshot": stem,
            "wrong_step_index": None,  # 新格式没有此字段
            "wrong_step_stem": stem,
            "user_choice": m.user_answer or '',
            "correct_choice": correct_choice,
            "options_snapshot": options,
            "diagnosis_tags": [],  # 简化处理
            "mastery": m.mastery,
            "last_error_time": m.last_error_time,
            "linked_note_id": m.linked_note_id,
            "history": m.history,
            # ✅ 新增：复合题支持
            "is_composite": q.is_composite or False,
            "steps": q.steps
        })
    return result

# --- 新增：文件操作辅助函数 ---

def get_file_by_id(db: Session, file_id: str, user_id: str = None):
    """根据 ID 获取单个文件/文件夹（带用户验证）"""
    query = db.query(models.FileItem).filter(models.FileItem.id == file_id)
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)  # ✅ 用户隔离
    return query.first()

def delete_file(db: Session, file_id: str, user_id: str = None):
    """删除文件或文件夹（带用户验证）"""
    query = db.query(models.FileItem).filter(models.FileItem.id == file_id)
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)  # ✅ 用户隔离
    item = query.first()
    if item:
        db.delete(item)
        db.commit()
        return True
    return False

def link_note_to_mistake(db: Session, mistake_id: int, note_id: str):
    """将笔记关联到错题"""
    mistake = db.query(models.Mistake).filter(models.Mistake.id == mistake_id).first()
    if mistake:
        mistake.linked_note_id = note_id
        db.commit()
        return True
    return False

# ✨ 新增：标签系统相关函数

def auto_generate_tags(db: Session, file_id: str, manual_tags: list = None) -> list:
    """
    自动从笔记内容生成标签

    Args:
        db: 数据库会话
        file_id: 文件ID
        manual_tags: 用户手动添加的标签（优先级最高）

    Returns:
        合并后的标签列表（手动标签 + 自动生成标签）
    """
    file = db.query(models.FileItem).filter(models.FileItem.id == file_id).first()
    if not file:
        return manual_tags or []

    # 1. 初始化标签集合（保留手动标签）
    tags = set(manual_tags or [])

    # 2. 从文件夹名提取标签
    if file.parent_id and file.parent_id != 'root':
        parent = db.query(models.FileItem).filter(models.FileItem.id == file.parent_id).first()
        if parent:
            # 提取文件夹名中的关键词（去除 emoji 和特殊字符）
            import re
            folder_name = parent.name
            # 移除 emoji
            folder_clean = re.sub(r'[^\w\s\u4e00-\u9fff]', '', folder_name)
            # 按空格分割，取第一个词
            keywords = folder_clean.split()[:2]
            tags.update([kw for kw in keywords if len(kw) > 1])

    # 3. 从笔记内容提取标签
    if file.content:
        content = file.content

        # 提取一级标题作为标签
        import re
        titles = re.findall(r'^#\s+(.+)$', content, re.MULTILINE)
        for title in titles[:3]:  # 最多取前3个标题
            # 提取关键词（去掉特殊字符）
            title_clean = re.sub(r'[^\w\s\u4e00-\u9fff]', '', title)
            if len(title_clean) > 0:
                tags.add(title_clean[:10])  # 取前10个字符

        # 关键词匹配
        keyword_patterns = {
            '物理': r'物理|力学|电磁|波动|光学',
            '数学': r'数学|代数|几何|微积分|函数',
            '英语': r'英语|English|语法|单词',
            '化学': r'化学|有机|无机|反应',
            '生物': r'生物|细胞|遗传|进化',
            '公式': r'公式|定理|定律|方程',
            '例题': r'例题|练习|题目|问题',
            '重要': r'重要|考点|重点|关键',
            '笔记': r'笔记|总结|复习|整理',
        }

        for tag_name, pattern in keyword_patterns.items():
            if re.search(pattern, content):
                tags.add(tag_name)

    # 4. 如果没有任何标签，添加默认标签
    if not tags:
        tags.add('未分类')

    # 5. 转换为列表并排序（手动标签在前）
    manual_list = manual_tags or []
    auto_list = [tag for tag in tags if tag not in manual_list]

    return manual_list + sorted(auto_list)

def get_all_tags(db: Session, user_id: str = None):
    """获取所有标签及其使用次数（带用户隔离）"""
    query = db.query(models.FileItem).filter(models.FileItem.type == 'file')
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)  # ✅ 用户隔离
    files = query.all()
    tag_stats = {}

    for file in files:
        if file.tags:
            for tag in file.tags:
                tag_stats[tag] = tag_stats.get(tag, 0) + 1

    # 转换为列表并排序
    result = [
        {"name": tag, "count": count}
        for tag, count in sorted(tag_stats.items(), key=lambda x: x[1], reverse=True)
    ]
    return result

def get_files_by_tag(db: Session, tag: str, user_id: str = None):
    """根据标签获取所有文件（带用户隔离）"""
    query = db.query(models.FileItem).filter(models.FileItem.type == 'file')
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)  # ✅ 用户隔离
    files = query.all()
    result = []
    for file in files:
        if file.tags and tag in file.tags:
            result.append(file)
    return result

def add_tag_to_file(db: Session, file_id: str, tag: str, user_id: str = None):
    """为文件添加单个标签（带用户验证）"""
    query = db.query(models.FileItem).filter(models.FileItem.id == file_id)
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)  # ✅ 用户隔离
    item = query.first()
    if item:
        if not item.tags:
            item.tags = []
        if tag not in item.tags:
            item.tags.append(tag)
            db.commit()
        return item
    return None

def remove_tag_from_file(db: Session, file_id: str, tag: str, user_id: str = None):
    """从文件移除单个标签（带用户验证）"""
    query = db.query(models.FileItem).filter(models.FileItem.id == file_id)
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)  # ✅ 用户隔离
    item = query.first()
    if item and item.tags:
        if tag in item.tags:
            item.tags.remove(tag)
            db.commit()
        return item
    return None

# ✨ 新增：双向链接系统相关函数

def get_notes_linking_mistake(db: Session, question_id: str):
    """
    获取引用了指定错题的所有笔记（反向链接）

    Args:
        db: 数据库会话
        question_id: 题目 ID

    Returns:
        引用了该错题的笔记列表
    """
    import re
    all_files = db.query(models.FileItem).filter(models.FileItem.type == 'file').all()
    linked_notes = []

    # 构建正则表达式：匹配 [[gk_question_id]] 或 [[gk_question_id]] （带空格）
    pattern = re.compile(rf'\[\[gk_{re.escape(question_id)}\]\]\s?')

    for file in all_files:
        # 检查内容中是否包含对当前错题的引用
        if file.content and pattern.search(file.content):
            linked_notes.append(file)

    return linked_notes

def get_backlinks(db: Session, note_id: str, user_id: str = None):
    """获取引用了指定笔记的所有笔记（反向链接）（带用户隔离）"""
    import re
    query = db.query(models.FileItem).filter(models.FileItem.type == 'file')
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)  # ✅ 用户隔离
    all_files = query.all()
    backlinks = []

    # 构建更灵活的正则表达式：匹配 [[note:note_id]] 或 [[note:note_id]] （带空格）
    pattern = re.compile(rf'\[\[note:{re.escape(note_id)}\]\]\]?')

    for file in all_files:
        # 跳过自己
        if file.id == note_id:
            continue

        # 检查内容中是否包含对当前笔记的引用
        if file.content and pattern.search(file.content):
            backlinks.append(file)

    return backlinks

def get_all_links_in_note(db: Session, note_id: str, user_id: str = None):
    """获取笔记中所有链接到的其他笔记（正向链接）（带用户隔离）"""
    import re
    query = db.query(models.FileItem).filter(models.FileItem.id == note_id)
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)  # ✅ 用户隔离
    note = query.first()

    if not note or not note.content:
        return []

    # 提取所有 [[note:xxx]] 链接（支持可选的尾随空格）
    links = re.findall(r'\[\[note:(\w+)\]\]\s?', note.content)

    # 去重并返回对应的笔记对象
    seen = set()
    result = []
    for linked_id in links:
        if linked_id not in seen:
            linked_note = db.query(models.FileItem).filter(
                models.FileItem.id == linked_id,
                models.FileItem.type == 'file'
            )
            if user_id:
                linked_note = linked_note.filter(models.FileItem.user_id == user_id)  # ✅ 用户隔离
            linked_note = linked_note.first()

            if linked_note:
                result.append(linked_note)
                seen.add(linked_id)

    return result

# ✨ 新增：全文搜索相关函数

def search_notes(db: Session, query: str, user_id: str = None):
    """全文搜索笔记（标题和内容）（带用户隔离）"""
    if not query or len(query.strip()) < 2:
        return []

    query = query.strip().lower()
    db_query = db.query(models.FileItem).filter(models.FileItem.type == 'file')
    if user_id:
        db_query = db_query.filter(models.FileItem.user_id == user_id)  # ✅ 用户隔离
    files = db_query.all()
    results = []

    for file in files:
        # 计算相关度分数
        score = 0

        # 标题匹配（权重更高）
        if file.name and query in file.name.lower():
            # 完全匹配
            if query == file.name.lower():
                score += 100
            # 开头匹配
            elif file.name.lower().startswith(query):
                score += 50
            # 包含匹配
            else:
                score += 20

        # 内容匹配
        if file.content and query in file.content.lower():
            # 计算出现次数
            count = file.content.lower().count(query)
            score += count * 5

            # 优先显示匹配位置靠前的
            first_index = file.content.lower().find(query)
            if first_index < 100:
                score += 10
            elif first_index < 500:
                score += 5

        if score > 0:
            # 提取匹配的上下文（用于高亮预览）
            context = None
            if file.content and query in file.content.lower():
                context = extract_context(file.content, query)

            results.append({
                "file": file,
                "score": score,
                "context": context
            })

    # 按相关度排序
    results.sort(key=lambda x: x["score"], reverse=True)
    return results

def extract_context(content: str, query: str, max_length: int = 150):
    """提取搜索关键词周围的上下文"""
    query_lower = query.lower()
    content_lower = content.lower()

    # 找到第一个匹配位置
    index = content_lower.find(query_lower)
    if index == -1:
        return content[:max_length] + "..." if len(content) > max_length else content

    # 提取上下文（前后各一半）
    start = max(0, index - max_length // 2)
    end = min(len(content), index + len(query) + max_length // 2)

    context = content[start:end]

    # 添加省略号
    if start > 0:
        context = "..." + context
    if end < len(content):
        context = context + "..."

    return context

def search_mistakes(db: Session, query: str, user_id: str):
    """全文搜索错题（题干和学科）"""
    if not query or len(query.strip()) < 2:
        return []

    query = query.strip().lower()
    mistakes = db.query(models.Mistake).filter(models.Mistake.user_id == user_id).all()
    results = []

    for mistake in mistakes:
        # 计算相关度分数
        score = 0

        # 学科匹配
        if mistake.subject and query in mistake.subject.lower():
            if query == mistake.subject.lower():
                score += 50
            elif mistake.subject.lower().startswith(query):
                score += 30
            else:
                score += 10

        # 题干匹配
        stem_text = ""
        if mistake.stem_snapshot:
            stem_text = mistake.stem_snapshot
        elif mistake.content:
            # 如果 content 是 JSON，尝试解析
            try:
                import json
                content_data = json.loads(mistake.content)
                if isinstance(content_data, dict):
                    stem_text = content_data.get('stem', '')
            except:
                stem_text = str(mistake.content)

        if stem_text and query in stem_text.lower():
            count = stem_text.lower().count(query)
            score += count * 5

        # 只有分数大于 0 才加入结果
        if score > 0:
            # 提取上下文
            context = extract_context(stem_text, query, 100) if stem_text else ""

            results.append({
                "id": mistake.id,
                "subject": mistake.subject,
                "question_id": mistake.question_id,
                "stem": stem_text[:100] + "..." if len(stem_text) > 100 else stem_text,
                "wrong_count": 1,  # 可以从历史记录计算
                "mastery": mistake.mastery,
                "score": score,
                "context": context
            })

    # 按相关度排序
    results.sort(key=lambda x: x["score"], reverse=True)
    return results
