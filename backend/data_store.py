#(注释) backend/data_store.py 
#(注释) 模拟数据库层，存放全息题库数据 
 
# 这里直接放入我们在上一次对话中生成的 JSON 数据 
MOCK_QUESTIONS_DATA = [ 
  { 
    "meta": { "id": "q_phy_mech_2024_088", "version": 1, "create_time": "2025-11-30T10:00:00Z", "author": "FlowStudy_Team", "status": "published" }, 
    "base_info": { 
      "subject": "Physics", "type": "composite", "difficulty": 4, 
      "macro_tags": { "scenario_model": ["竖直平面圆周运动", "平抛运动模型"], "logic_chain": "机械能守恒 -> 牛顿第二定律" } 
    }, 
    "content": { "stem": "如图所示，半径 R=0.5m 的光滑半圆轨道...", "media": { "main_image": "/assets/questions/phy_088.png" } }, 
    "steps": [ 
      { 
        "step_index": 1, "step_id": "s_01", "interaction_type": "single_choice", 
        "stem": "【第一步】小球恰好通过最高点 C，受力满足？", 
        "options": [ 
          { "key": "A", "content": "重力提供向心力 mg = mv^2/R", "is_correct": True, "gain_micro_tags": ["圆周运动临界条件"] }, 
          { "key": "B", "content": "速度为零 v=0", "is_correct": False, "diagnosis": { "cognitive_flaw": "生活经验干扰", "severity": "high" } } 
        ] 
      }, 
      { 
        "step_index": 2, "step_id": "s_02", "interaction_type": "single_choice", 
        "stem": "【第二步】从 B 到 C，机械能守恒方程为？", 
        "options": [ 
          { "key": "A", "content": "0.5mv_B^2 = 0.5mv_C^2 + mg(2R)", "is_correct": True, "gain_micro_tags": ["机械能守恒方程"] }, 
          { "key": "B", "content": "漏了高度", "is_correct": False, "diagnosis": { "cognitive_flaw": "粗心", "severity": "low" } } 
        ] 
      } 
    ] 
  }, 
  { 
    "meta": { "id": "q_math_func_2024_012", "version": 1, "create_time": "...", "author": "MathTeam", "status": "published" }, 
    "base_info": { "subject": "Mathematics", "type": "single", "difficulty": 3, "macro_tags": { "scenario_model": ["函数单调性"] } }, 
    "content": { "stem": "函数 f(x) = ln x - x 的单调递增区间？", "media": {} }, 
    "steps": [ 
      { 
        "step_index": 1, "step_id": "s_01", "interaction_type": "single_choice", "stem": "选择答案：", 
        "options": [ 
          { "key": "A", "content": "(0, 1)", "is_correct": True, "gain_micro_tags": ["导数与单调性", "定义域"] }, 
          { "key": "B", "content": "(-inf, 1)", "is_correct": False, "diagnosis": { "cognitive_flaw": "定义域意识缺失", "severity": "high" } } 
        ] 
      } 
    ] 
  } 
] 

# 模拟用户画像 (User Profile DB) 
# 初始状态：Alex 对 "圆周运动" 比较生疏 (权重50)，有 "定义域意识缺失" 的毛病 (权重60) 
MOCK_USER_PROFILE = { 
    "user_id": "u_alex", 
    "level": 3, 
    "tag_weights": { 
        "竖直平面圆周运动": 50.0, 
        "定义域意识缺失": 60.0, 
        "机械能守恒方程": 10.0 # 这个掌握得比较好 
    } 
}

# 模拟文件系统数据 (Notes and Folders)
MOCK_FILES_DATA = [
    # ✅ 核心修复：必须显式添加 Root 节点，否则外键约束会失败
    {"id": "root", "parent_id": None, "name": "Library", "type": "folder", "date": "2023-01-01", "content": None},
    
    # 根目录下的文件夹
    {"id": "folder_1", "parent_id": "root", "name": "🪐 物理复习", "type": "folder", "date": "2025-11-20", "content": ""},
    {"id": "folder_2", "parent_id": "root", "name": "🇬🇧 英语错题", "type": "folder", "date": "2025-11-21", "content": ""},
    
    # 根目录下的文件
    {"id": "note_1", "parent_id": "root", "name": "README.md", "type": "file", "date": "2025-11-22", "content": "# 欢迎使用 FlowStudy Pro\n\n这是一个支持 **Markdown** 和数学公式的笔记系统。\n\n## 特性\n* 文件夹嵌套\n* 双栏编辑\n* 实时预览\n\n你可以尝试点击左侧的文件进行浏览。"},
    
    # "物理复习" 文件夹里的内容
    {"id": "note_2", "parent_id": "folder_1", "name": "牛顿第二定律", "type": "file", "date": "2025-11-22", "content": "# 牛顿第二定律\n\n公式如下：\n\n$$ F = ma $$\n\n其中 F 是合力，m 是质量，a 是加速度。"},
    {"id": "subfolder_1", "parent_id": "folder_1", "name": "力学专项", "type": "folder", "date": "2025-11-22", "content": ""},

    # "力学专项" 里的文件
    {"id": "note_3", "parent_id": "subfolder_1", "name": "受力分析技巧", "type": "file", "date": "2025-11-22", "content": "受力分析是解决力学问题的关键..."},
]

# 模拟错题本数据 (Snapshot) 
# 包含题目快照、用户上次做错的选项、诊断结果、熟练度 
MOCK_MISTAKES_DATA = [ 
    { 
        "id": "m_001", 
        "question_id": "q_phy_mech_2024_088", 
        "subject": "Physics", 
        "type": "composite", 
        "stem_snapshot": "如图所示，半径 R=0.5m 的光滑半圆轨道...小球恰好通过最高点 C...", 
        "wrong_step_index": 1, # 大题的第2步错了 
        "wrong_step_stem": "【第二步】从 B 到 C，机械能守恒方程为？", 
        "user_choice": "B", # 选了错项 
        "correct_choice": "A", 
        "options_snapshot": [ 
             { "key": "A", "content": "0.5mv_B^2 = 0.5mv_C^2 + mg(2R)", "is_correct": True }, 
             { "key": "B", "content": "0.5mv_B^2 = 0.5mv_C^2 + mgR", "is_correct": False } 
        ], 
        "diagnosis_tags": ["图形观察不仔细", "几何关系"], # 错因标签 
        "mastery": 20, # 熟练度 0-100 
        "last_error_time": "2023-11-29" 
    }, 
    { 
        "id": "m_002", 
        "question_id": "q_math_func_2024_012", 
        "subject": "Mathematics", 
        "type": "single", 
        "stem_snapshot": "函数 f(x) = ln x - x 的单调递增区间是？", 
        "wrong_step_index": 0, 
        "wrong_step_stem": "请选择正确答案：", 
        "user_choice": "B", 
        "correct_choice": "A", 
        "options_snapshot": [ 
             { "key": "A", "content": "(0, 1)", "is_correct": True }, 
             { "key": "B", "content": "(-inf, 1)", "is_correct": False } 
        ], 
        "diagnosis_tags": ["定义域意识缺失", "陷阱题"], 
        "mastery": 40, 
        "last_error_time": "2023-11-28" 
    }, 
    { 
        "id": "m_003", 
        "question_id": "q_eng_logic_005", 
        "subject": "English", 
        "type": "single", 
        "stem_snapshot": "If I ______ you, I would highlight this tag system.", 
        "wrong_step_index": 0, 
        "wrong_step_stem": "Choose the correct form:", 
        "user_choice": "B", 
        "correct_choice": "A", 
        "options_snapshot": [ 
             { "key": "A", "content": "were", "is_correct": True }, 
             { "key": "B", "content": "was", "is_correct": False } 
        ], 
        "diagnosis_tags": ["口语习惯干扰", "虚拟语气"], 
        "mastery": 10, 
        "last_error_time": "2023-11-30" 
    } 
]