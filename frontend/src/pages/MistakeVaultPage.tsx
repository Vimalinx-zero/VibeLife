import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { apiClient } from "../utils/api"; // ✅ 修复：导入 apiClient 以自动添加 token

import FileExplorer from "../components/FileExplorer";
import MistakeWorkstation from "../components/MistakeWorkstation"; // ✅ 引入新组件
import AIAssistant from "../components/AIAssistant";
import SmartKnowledgePanel from "../components/SmartKnowledgePanel"; // ✨ 统一的知识面板
import MistakeSearch from "../components/MistakeSearch"; // ✅ 新增：错题搜索
import MistakeBacklinksPanel from "../components/MistakeBacklinksPanel"; // ✅ 新增：错题反向链接面板
import { buildMistakeTree } from "../utils/mistakeTree";
import { useToast } from "../context/ToastContext"; // ✅ 新增：Toast 提示

interface MistakeItem {
  id: string;
  type: string;
  subject: string;
  [key: string]: any;
}

interface TreeData {
  root: Record<string, any>;
  subjectMap: Record<string, any>;
}

interface EditForm {
  type: string;
  stem: string;
  options: Array<{ key: string; content: string; is_correct: boolean }>;
  blanks: Array<{ answer: string }>;
  answer: string;
  solution: string;
  difficulty: number;
  subject: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: MistakeItem | null;
}

const Icons = {
  ArrowLeft: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
  Knowledge: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  Heart: ({filled, className}: {filled?: boolean; className?: string}) => (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
};

const MistakeVaultPage = () => {
  const navigate = useNavigate();
  const location = useLocation(); // 获取当前 URL 参数 (方便从 Dashboard 跳转)
  const toast = useToast(); // ✅ 新增：Toast 提示

  const [treeData, setTreeData] = useState<TreeData>({ root: {}, subjectMap: {} });
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [activeMistake, setActiveMistake] = useState<MistakeItem | null>(null);
  const [linkedNote, setLinkedNote] = useState<any>(null);

  // ✅ 新增：用于存储重做题目的反馈状态 (模仿 QuizPage 的结构)
  const [retryFeedback, setRetryFeedback] = useState<any>(null);
  // ✅ 新增：用于存储笔记保存的反馈消息
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // ✅ 恢复：笔记内容状态 (用于编辑)
  const [noteContent, setNoteContent] = useState<string>("");

  const [aiOpen, setAiOpen] = useState<boolean>(false);
  const [smartKnowledgeOpen, setSmartKnowledgeOpen] = useState<boolean>(false); // ✨ 统一的知识面板开关
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<string>('mistakes'); // 'mistakes' or 'favorites' or 'all_questions'

  // ✅ 新增：右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ✅ 新增：编辑题目状态
  const [editingQuestion, setEditingQuestion] = useState<MistakeItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    type: 'single_choice',
    stem: '',
    options: [
      { key: 'A', content: '', is_correct: false },
      { key: 'B', content: '', is_correct: false }
    ],
    blanks: [{ answer: '' }],
    answer: '',
    solution: '',
    difficulty: 2,
    subject: ''
  });

  // ✅ 新增：学科名称映射（支持中英文互转）
  const SUBJECT_MAP = {
    // 中文 → 英文
    '物理': 'physics',
    '数学': 'mathematics',
    '英语': 'english',
    '化学': 'chemistry',
    '生物': 'biology',
    '历史': 'history',
    '地理': 'geography',
    '未分类': 'physics',

    // 英文 → 英文（保持原样）
    'physics': 'physics',
    'mathematics': 'mathematics',
    'english': 'english',
    'chemistry': 'chemistry',
    'biology': 'biology',
    'history': 'history',
    'geography': 'geography',
  };

  // 获取标准化的学科代码
  const normalizeSubject = (subject: string): string => {
    if (!subject) return 'physics'; // 默认为 physics
    return SUBJECT_MAP[subject] || subject;
  };

  // ✅ 修改 1：提取 fetchMistakes 函数，方便重做题目后刷新熟练度
  const fetchMistakes = async () => {
      try {
          const res = await apiClient.get("/mistakes");
          const tree = buildMistakeTree(res.data);
          setTreeData(tree);
          setLoading(false);
      } catch (e) { console.error(e); setLoading(false); }
  };

  // ✨ 新增：获取收藏的题目
  const fetchFavorites = async () => {
      try {
          const res = await apiClient.get("/favorites");
          const tree = buildMistakeTree(res.data);
          setTreeData(tree);
          setLoading(false);
      } catch (e) { console.error(e); setLoading(false); }
  };

  // ✅ 根据视图模式加载数据
  const loadData = useCallback(async () => {
      setLoading(true);
      if (viewMode === 'favorites') {
          await fetchFavorites();
      } else {
          await fetchMistakes();
      }
  }, [viewMode]);

  // ✅ 切换视图模式（循环切换：错题 → 收藏）
  const toggleViewMode = () => {
      const newMode = viewMode === 'mistakes' ? 'favorites' : 'mistakes';
      setViewMode(newMode);
      setCurrentFolderId('root');
      setActiveMistake(null);
  };

  // ✅ 获取视图模式显示文本
  const getViewModeLabel = () => {
      return viewMode === 'mistakes' ? '错题本' : '收藏夹';
  };

  // ✅ 获取视图模式图标
  const getViewModeIcon = () => {
      return viewMode === 'mistakes' ? '❌' : '❤️';
  };

  // ✅ 新增：编辑题目相关函数
  const handleEditQuestion = (question) => {
      setEditingQuestion(question);

      // ✅ 关键修复：从 question.data 中获取真正的题目数据
      // 树节点结构：{ type: 'file', data: { subject, type, stem, ... } }
      const actualQuestion = question.data || question;

      console.log('📖 树节点数据:', question);
      console.log('📖 实际题目数据:', actualQuestion);
      console.log('📖 题目的学科:', actualQuestion.subject);
      console.log('📖 题目的题型:', actualQuestion.type);
      console.log('📖 题目的ID:', actualQuestion.question_id || actualQuestion.id);

      // 根据题型初始化表单
      const questionType = actualQuestion.type || 'single_choice';

      // ✅ 修复：使用 normalizeSubject 处理学科字段
      const normalizedSubject = normalizeSubject(actualQuestion.subject);

      const newForm = {
          type: questionType,
          stem: actualQuestion.stem_snapshot || actualQuestion.stem || '',
          options: actualQuestion.options_snapshot || actualQuestion.options || [],
          blanks: actualQuestion.blanks || [{ answer: actualQuestion.correct_choice || '' }],
          answer: actualQuestion.correct_choice || '',
          solution: actualQuestion.solution || '',
          difficulty: actualQuestion.difficulty || 2,
          subject: normalizedSubject
      };

      console.log('📖 初始化的表单数据:', newForm);
      console.log('📖 标准化后的学科:', normalizedSubject);

      setEditForm(newForm);
  };

  const handleSaveEdit = async () => {
      if (!editingQuestion) return;

      try {
          // ✅ 调试：打印保存的数据
          console.log('📤 保存的数据:', editForm);
          console.log('📤 学科:', editForm.subject);
          console.log('📤 题型:', editForm.type);

          // ✅ 关键修复：从 editingQuestion.data 中获取题目ID
          const actualQuestion = editingQuestion.data || editingQuestion;
          const questionId = actualQuestion.question_id || actualQuestion.id;

          console.log('📤 保存到题目ID:', questionId);

          const res = await apiClient.put(
              `/questions/${questionId}`,
              editForm
          );

          console.log('📥 后端响应:', res.data);

          if (res.data.success) {
              // 刷新数据
              await loadData();
              setEditingQuestion(null);
              toast.success('✅ 题目更新成功！');
          }
      } catch (error) {
          console.error('更新失败:', error);
          toast.error('❌ 更新失败，请重试');
      }
  };

  const handleCancelEdit = () => {
      setEditingQuestion(null);
      setEditForm({
          type: 'single_choice',
          stem: '',
          options: [],
          blanks: [{ answer: '' }],
          answer: '',
          solution: '',
          difficulty: 2,
          subject: ''
      });
  };

  // ✅ 新增：题型切换处理
  const handleTypeChange = (newType) => {
      let newForm = { ...editForm, type: newType };

      // 切换题型时初始化对应的数据结构
      if (newType === 'single_choice' || newType === 'multiple_choice') {
          if (!newForm.options || newForm.options.length === 0) {
              newForm.options = [
                  { key: 'A', content: '', is_correct: false },
                  { key: 'B', content: '', is_correct: false }
              ];
          }
      } else if (newType === 'fill_blank') {
          if (!newForm.blanks || newForm.blanks.length === 0) {
              newForm.blanks = [{ answer: '' }];
          }
      }

      setEditForm(newForm);
  };

  // ✅ 新增：填空题管理函数
  const handleAddBlank = () => {
      setEditForm({
          ...editForm,
          blanks: [...editForm.blanks, { answer: '' }]
      });
  };

  const handleRemoveBlank = (index) => {
      const newBlanks = editForm.blanks.filter((_, i) => i !== index);
      setEditForm({ ...editForm, blanks: newBlanks });
  };

  const handleBlankChange = (index, value) => {
      const newBlanks = [...editForm.blanks];
      newBlanks[index].answer = value;
      setEditForm({ ...editForm, blanks: newBlanks });
  };

  const handleOptionChange = (index, field, value) => {
      const newOptions = [...editForm.options];
      newOptions[index][field] = value;
      setEditForm({ ...editForm, options: newOptions });
  };

  const handleAddOption = () => {
      const nextKey = String.fromCharCode(65 + editForm.options.length); // A, B, C, D...
      const newOptions = [...editForm.options, { key: nextKey, content: '', is_correct: false }];
      setEditForm({ ...editForm, options: newOptions });
  };

  const handleRemoveOption = (index) => {
      const newOptions = editForm.options.filter((_, i) => i !== index);
      // 重新生成选项 key (A, B, C...)
      const reindexedOptions = newOptions.map((opt, i) => ({
          ...opt,
          key: String.fromCharCode(65 + i)
      }));
      setEditForm({ ...editForm, options: reindexedOptions });
  };

  // ✅ 新增：处理右键点击
  const handleContextMenu = (e, item) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          item: item
      });
  };

  // ✅ 新增：关闭右键菜单
  const handleCloseContextMenu = () => setContextMenu(null);

  // ✅ 新增：删除错题
  const handleDeleteMistake = async (mistakeId) => {
      if (!confirm('确定要删除这条错题吗？此操作无法撤销。')) return;

      try {
          await apiClient.delete(`/mistakes/${mistakeId}`);
          await loadData();
          setActiveMistake(null);
          setContextMenu(null);
          toast.success('🗑️ 错题已删除');
      } catch (error) {
          console.error('删除失败:', error);
          toast.error('❌ 删除失败，请重试');
      }
  };

  // ✅ 新增：收藏/取消收藏
  const handleToggleFavorite = async (mistakeId) => {
      try {
          await apiClient.post(`/favorites/toggle`, { mistake_id: mistakeId });
          await loadData();
          setContextMenu(null);
          toast.success(viewMode === 'favorites' ? '❤️ 已取消收藏' : '❤️ 已收藏');
      } catch (error) {
          console.error('收藏操作失败:', error);
          toast.error('❌ 操作失败，请重试');
      }
  };

  // ✅ 修改 2：使用 useCallback 包装 loadNode，避免闭包问题
  const loadNode = useCallback(async (rawId) => {
      // 强制转为 String，修复 "id.replace is not a function" 报错
      const id = String(rawId);

      if (id === 'root') { setCurrentFolderId('root'); setActiveMistake(null); return; }

      // 处理文件夹点击
      if (treeData.subjectMap[id.replace('folder_', '')]) {
          setCurrentFolderId(id);
          setActiveMistake(null);
          return;
      }

      // 点击文件：查找对应错题
      let foundFile: any = null;
      Object.values(treeData.subjectMap).forEach(folder => {
          // 强制转为 String 比较，防止类型不匹配
          const file = folder.children.find(f => String(f.id) === id);
          if (file) foundFile = file;
      });

      if (foundFile) {
          const mistakeData = foundFile.data;

          // ✅ 核心修复：构造 question 对象，匹配 MistakeWorkstation 期望的格式
          const mistakeWithQuestion = {
              ...mistakeData,
              question: {
                  id: mistakeData.question_id,
                  type: mistakeData.type,
                  subject: mistakeData.subject,
                  stem: mistakeData.stem_snapshot || mistakeData.wrong_step_stem || "",
                  options: mistakeData.options_snapshot || [],
                  answer: mistakeData.correct_choice || "",
                  difficulty: 3,
                  solution: "",
                  is_composite: mistakeData.is_composite || false,
                  steps: mistakeData.steps || null
              }
          };

          console.log('🔧 构造的 mistake 数据:', mistakeWithQuestion);
          console.log('🔧 question.stem:', mistakeWithQuestion.question.stem);
          console.log('🔧 question.options:', mistakeWithQuestion.question.options);

          setActiveMistake(mistakeWithQuestion);
          setLinkedNote(null);
          setNoteContent(""); // 切换时先清空
          setRetryFeedback(null); // ✅ 切换题目时，重置做题反馈状态

          // 如果有关联笔记ID，去后端拉取真实笔记内容
          if (mistakeData.linked_note_id) {
              try {
                  const noteRes = await apiClient.get(`/notes/view?id=${mistakeData.linked_note_id}`);
                  if (noteRes.data.info) {
                      setLinkedNote(noteRes.data.info);
                      setNoteContent(noteRes.data.info.content || "");
                  }
              } catch (e) { console.error("Linked note fetch failed", e); }
          }
      }
  }, [treeData]); // 依赖 treeData

  // 初始化
  useEffect(() => {
    loadData();
  }, [location.search, viewMode]); // 依赖 viewMode，切换时重新加载数据

  // ✨ 新增：处理 URL 参数中的 questionId（从笔记链接跳转过来）
  useEffect(() => {
    // 等待 treeData 加载完成
    if (!treeData.subjectMap || Object.keys(treeData.subjectMap).length === 0) return;

    const urlParams = new URLSearchParams(location.search);
    const questionId = urlParams.get('questionId');

    if (questionId) {
      // 在所有错题中查找匹配的 question_id
      let foundMistakeId = null;
      Object.values(treeData.subjectMap).forEach(folder => {
        const match = folder.children.find(f => f.data?.question_id === questionId);
        if (match) foundMistakeId = match.id;
      });

      if (foundMistakeId) {
        loadNode(foundMistakeId);
      }
    }
  }, [location.search, treeData, loadNode]); // 依赖 URL 参数、treeData 和 loadNode

  // ✨ 新增：监听从笔记跳转的事件（通过 questionId 找到对应的错题）
  useEffect(() => {
    const handleLoadMistake = (e) => {
      const { questionId } = e.detail;
      if (questionId && treeData.subjectMap) {
        // 在所有错题中查找匹配的 question_id
        let foundMistakeId = null;
        Object.values(treeData.subjectMap).forEach(folder => {
          const match = folder.children.find(f => f.data?.question_id === questionId);
          if (match) foundMistakeId = match.id;
        });

        if (foundMistakeId) {
          loadNode(foundMistakeId);
        }
      }
    };

    window.addEventListener('loadMistake', handleLoadMistake);
    return () => window.removeEventListener('loadMistake', handleLoadMistake);
  }, [treeData, loadNode]); // 依赖 treeData 和 loadNode，确保数据已加载

  // 处理跳转到笔记页面
  const handleGoToNote = (noteId) => {
      // 跳转到 NotesPage，并带上 ID 参数，让它自动打开对应笔记
      navigate(`/notes?id=${noteId}`);
      // 同时触发事件作为备用
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('loadNote', { detail: { id: noteId } }));
      }, 100);
  };

  const currentItems = useMemo(() => {
      if (loading) return [];
      if (currentFolderId === 'root') return treeData.root.children || [];
      const subjectName = currentFolderId.replace('folder_', '');
      return treeData.subjectMap[subjectName]?.children || [];
  }, [currentFolderId, treeData, loading]);

  // ✅ 新增：处理错题重做提交 
  const handleRetrySubmit = async (selectedKey) => {
      if (!activeMistake) return;
      
      // 如果已经做过了（有反馈了），就不再重复提交，防止刷分
      if (retryFeedback) return;

      try {
          const res = await apiClient.post("/mistakes/review", {
              mistake_id: activeMistake.id,
              step_id: activeMistake.step_id || "s_01", // ✅ 从错题数据获取 step_id，如果不存在则使用默认值
              selected_key: selectedKey
          });
          
          // ✅ 核心修改：不再 alert，而是设置反馈状态，让 UI 自己变化 
          setRetryFeedback({ 
              correct: res.data.is_correct, 
              selectedKey: selectedKey, 
              message: res.data.is_correct ? "🎉 Correct! Mastery +20" : "❌ Incorrect. Try to review the note." 
          });
          
          if (res.data.success) {
              // 刷新列表以更新左侧列表可能显示的熟练度状态 
              fetchMistakes();
          }
      } catch (e) { console.error(e); }
  };

  // ✅ 新增：保存笔记并建立关联
  const handleSaveNote = async () => {
      if (!activeMistake) return;
      try {
          // ✅ 如果是新建笔记（没有 linkedNote），自动插入错题引用
          let finalContent = noteContent;
          if (!linkedNote && !noteContent.includes('[[gk_')) {
              // 在内容开头自动插入错题引用链接
              const questionRef = `[[gk_${activeMistake.question_id || activeMistake.id}]]`;
              finalContent = `${questionRef}\n\n---\n\n${noteContent}`;
              setNoteContent(finalContent);
          }

          const res = await apiClient.post("/mistakes/link_note", {
              mistake_id: activeMistake.id,
              note_id: linkedNote?.id, // 如果是新建则为 null
              name: linkedNote?.name || `Review: ${activeMistake.stem_snapshot ? activeMistake.stem_snapshot.substring(0, 15) : "Mistake"}...`,
              content: finalContent
          });

          if (res.data.success) {
              // ✅ 核心修改：设置反馈状态，触发 UI 提示
              setSaveFeedback("✅ Note Saved & Linked Successfully!");

              // 如果是新建的笔记，更新本地状态
              if (!linkedNote) {
                  setLinkedNote({ id: res.data.note_id, name: "New Review Note", content: finalContent });
              }

              // ✅ 2秒后自动清除状态，触发滑出动画
              setTimeout(() => {
                  setSaveFeedback(null);
              }, 2000);
          }
      } catch (e) { console.error(e); }
  };

  return (
    <div
      className="fixed inset-0 bg-transparent text-slate-800 dark:text-slate-100 font-sans overflow-hidden flex flex-col"
      onClick={() => handleCloseContextMenu()}
      onContextMenu={() => handleCloseContextMenu()}
    >
      
      {/* Header */}
      <div className="h-16 absolute top-6 left-0 w-full flex items-center px-8 z-50 pointer-events-none">
        {/* 左侧：Dashboard 返回按钮 + 标题 + 视图切换 */}
        <div className="flex items-center gap-4 pointer-events-auto">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-sm font-bold text-sm hover:scale-105 transition-transform text-slate-600 dark:text-slate-300">
                <Icons.ArrowLeft className="w-4 h-4" /> <span>Dashboard</span>
            </button>

            {/* 视图模式指示器 */}
            <div className={`px-4 py-2 rounded-full backdrop-blur-md border font-bold text-xs flex items-center gap-2 transition-colors ${
                viewMode === 'mistakes'
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : viewMode === 'favorites'
                        ? 'bg-pink-500/10 border-pink-500/20 text-pink-500'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
            }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                    viewMode === 'mistakes' ? 'bg-red-500'
                    : viewMode === 'favorites' ? 'bg-pink-500'
                    : 'bg-blue-500'
                }`}></div>
                <span>{getViewModeLabel()}</span>
            </div>

            {/* 视图切换按钮 */}
            <button
                onClick={toggleViewMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md shadow-sm text-xs font-bold transition-all hover:scale-105 ${
                    viewMode === 'mistakes'
                        ? 'bg-red-500 text-white border-red-500'
                        : viewMode === 'favorites'
                            ? 'bg-pink-500 text-white border-pink-500'
                            : 'bg-blue-500 text-white border-blue-500'
                }`}
                title={`切换到：${viewMode === 'mistakes' ? '收藏夹' : '错题本'}`}
            >
                <span className="text-sm">{getViewModeIcon()}</span>
                <span>切换视图</span>
            </button>
        </div>

        {/* 中间：搜索框（绝对定位居中） */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto w-96">
          <MistakeSearch onLoadMistake={loadNode} />
        </div>

        {/* 右侧：AI Coach + Knowledge 按钮 */}
        <div className="ml-auto flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => {
              setAiOpen(!aiOpen);
              // 关闭知识面板以避免冲突
              if (!aiOpen && smartKnowledgeOpen) {
                setSmartKnowledgeOpen(false);
              }
            }}
            className={`px-4 py-2 rounded-full border backdrop-blur-md shadow-sm text-xs font-bold flex items-center gap-2 transition ${
              aiOpen
                ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30'
                : 'bg-white/80 dark:bg-slate-800/80 border-white/20 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            <span>AI对话</span>
          </button>

          {/* 知识面板按钮（合并后） */}
          <button
            onClick={() => {
              setSmartKnowledgeOpen(!smartKnowledgeOpen);
              // 关闭AI对话以避免冲突
              if (!smartKnowledgeOpen && aiOpen) {
                setAiOpen(false);
              }
            }}
            className={`px-4 py-2 rounded-full border backdrop-blur-md shadow-sm text-xs font-bold flex items-center gap-2 transition ${
              smartKnowledgeOpen
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg shadow-purple-500/30'
                : 'bg-white/80 dark:bg-slate-800/80 border-white/20 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            <Icons.Knowledge />
            <span>知识面板</span>
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex pt-24 pb-6 px-6 gap-6 overflow-hidden items-start">

        {/* 左侧：列表 + 反向链接面板 */}
        <div className="shrink-0 h-[calc(100vh-10rem)] flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
            {/* 文件浏览器 */}
            <div className="shrink-0">
                <FileExplorer
                    viewData={{
                        info: {
                            id: currentFolderId,
                            name: currentFolderId === 'root' ? getViewModeLabel() : currentFolderId.replace('folder_', ''),
                            type: 'folder',
                            parent_id: currentFolderId === 'root' ? null : 'root'
                        },
                        items: currentItems,
                        breadcrumbs: []
                    }}
                    currentId={activeMistake?.id}
                    sortedItems={currentItems}
                    onLoadNode={loadNode}
                    onCreateItem={() => {}}
                    onContextMenu={handleContextMenu}
                    onDropItem={() => {}}
                />
            </div>

            {/* ✅ 新增：错题反向链接面板 */}
            <div className="shrink-0 w-72 p-4 bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden">
                <MistakeBacklinksPanel
                    questionId={activeMistake?.question_id}
                    onLoadNote={handleGoToNote}
                />
            </div>
        </div>

        {/* 右侧：一体化工作站 */}
        {/* ✅ 核心修改：使用 flex justify-center 和 w-full 来配合内部的百分比宽度 */}
        <div className="flex-1 h-full overflow-hidden flex justify-center relative">
            
            {activeMistake ? (
                <MistakeWorkstation 
                    mistake={activeMistake}
                    linkedNote={linkedNote}
                    
                    // ✅ 传递编辑相关的 props
                    noteContent={noteContent}
                    setNoteContent={setNoteContent}
                    
                    onSave={handleSaveNote}
                    onRetry={handleRetrySubmit}
                    feedback={retryFeedback}
                    saveFeedback={saveFeedback} // ✅ 传递笔记保存反馈
                    onGoToNote={handleGoToNote}
                    onRefresh={fetchMistakes} // ✅ 传递刷新函数
                    
                    aiOpen={aiOpen}
                />
            ) : (
                <div className="flex flex-col items-center justify-center opacity-30 h-full">
                    <div className="text-6xl mb-4">📂</div>
                    <p className="font-bold text-lg">Select a mistake to start review</p>
                </div>
            )}

            {/* AI 侧栏 (绝对定位或 Flex 挤压取决于你喜好，这里我们用 Flex 挤压更顺滑) */}
            {/* 注意：MistakeWorkstation 内部已经处理了宽度变化，这里的 AI 栏只需要放在旁边即可 */}
        </div>
        
        {/* AI 放在最右侧，与工作站并列 */}
        <AIAssistant isOpen={aiOpen} context={activeMistake ? { type: 'mistake', id: activeMistake.id } : null} />

        {/* ✨ 统一的知识面板（合并 Knowledge + AI Explain） */}
        <SmartKnowledgePanel isOpen={smartKnowledgeOpen} type="mistake" id={activeMistake?.id} />

        {/* ✅ 新增：右键菜单 */}
        <AnimatePresence>
          {contextMenu && (
            <div
              className="fixed z-[999] w-48 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl py-1 overflow-hidden flex flex-col"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={e => e.stopPropagation()}
            >
              {contextMenu.item ? (
                <>
                  <div className="px-4 py-2 text-[10px] font-bold uppercase opacity-40 border-b border-gray-200 dark:border-white/10 mb-1 text-slate-500 dark:text-slate-400 truncate">
                    {contextMenu.item!.name}
                  </div>

                  {/* 收藏/取消收藏（所有视图都可用） */}
                  <button
                    onClick={() => handleToggleFavorite(contextMenu.item!.id)}
                    className="text-left px-4 py-2.5 text-sm font-bold hover:bg-yellow-500 hover:text-white transition-colors dark:text-gray-200 flex items-center gap-3"
                  >
                    <Icons.Heart filled={viewMode === 'favorites'} className="w-4 h-4 opacity-70" />
                    {viewMode === 'favorites' ? '取消收藏' : '收藏'}
                  </button>

                  {/* 只在错题本视图显示删除按钮 */}
                  {viewMode === 'mistakes' && (
                    <>
                        <div className="h-px bg-gray-200 dark:bg-white/10 my-1 mx-4"></div>
                        <button
                          onClick={() => handleDeleteMistake(contextMenu.item!.id)}
                          className="text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-3"
                        >
                        <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        删除错题
                      </button>
                    </>
                  )}
                </>
              ) : (
                // 空白处菜单（如果需要的话）
                null
              )}
            </div>
          )}
        </AnimatePresence>

      {/* ✅ 编辑题目模态框 */}
      <AnimatePresence>
        {editingQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
            onClick={handleCancelEdit}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 标题栏 */}
              <div className="sticky top-0 bg-white dark:bg-slate-800 px-8 py-6 border-b border-gray-200 dark:border-white/10 z-10">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2h2.828l8.586-8.586z" />
                  </svg>
                  编辑题目
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  题目ID: {editingQuestion.question_id || editingQuestion.id}
                </p>
              </div>

              {/* 编辑表单 */}
              <div className="p-8 space-y-6">
                {/* ✅ 题型选择器 */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    📝 题型
                  </label>
                  <select
                    value={editForm.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all dark:text-white font-bold"
                  >
                    <option value="single_choice">单选题</option>
                    <option value="multiple_choice">多选题</option>
                    <option value="fill_blank">填空题</option>
                    <option value="proof">证明题</option>
                    <option value="essay">问答题</option>
                  </select>
                </div>

                {/* 题干 */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    题干（支持 Markdown/LaTeX）
                  </label>
                  <textarea
                    value={editForm.stem}
                    onChange={(e) => setEditForm({ ...editForm, stem: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all dark:text-white font-mono text-sm"
                    rows={4}
                    placeholder="输入题目内容... 例如：计算 $2 + 2 = ?$"
                  />
                </div>

                {/* ✅ 选择题选项编辑器 */}
                {(editForm.type === 'single_choice' || editForm.type === 'multiple_choice') && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        选项设置
                      </label>
                      <button
                        onClick={handleAddOption}
                        className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        添加选项
                      </button>
                    </div>

                    <div className="space-y-3">
                      {editForm.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                          {/* 选项标签 */}
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {option.key}
                          </div>

                          {/* 选项内容 */}
                          <input
                            type="text"
                            value={option.content}
                            onChange={(e) => handleOptionChange(index, 'content', e.target.value)}
                            className="flex-1 px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg focus:border-blue-500 focus:outline-none dark:text-white text-sm"
                            placeholder={`选项 ${option.key} 的内容`}
                          />

                          {/* 正确答案标记 */}
                          <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                            option.is_correct
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                              : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 hover:border-green-300'
                          }`}>
                            <input
                              type={editForm.type === 'single_choice' ? 'radio' : 'checkbox'}
                              name="correct_answer"
                              checked={option.is_correct}
                              onChange={(e) => {
                                // 单选题：先清除其他选项的 is_correct
                                if (editForm.type === 'single_choice' && e.target.checked) {
                                  const newOptions = editForm.options.map((opt, i) => ({
                                    ...opt,
                                    is_correct: i === index
                                  }));
                                  setEditForm({ ...editForm, options: newOptions });
                                } else {
                                  // 多选题：直接切换
                                  handleOptionChange(index, 'is_correct', e.target.checked);
                                }
                              }}
                              className="w-4 h-4 text-green-500"
                            />
                            <span className={`text-xs font-bold ${
                              option.is_correct ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                            }`}>
                              {editForm.type === 'single_choice' ? '正确' : '多选'}
                            </span>
                          </label>

                          {/* 删除按钮 */}
                          {editForm.options.length > 2 && (
                            <button
                              onClick={() => handleRemoveOption(index)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="删除选项"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 提示信息 */}
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      {editForm.type === 'single_choice'
                        ? '💡 单选题：只能有一个正确答案'
                        : '💡 多选题：可以有两个或更多正确答案'
                      }
                    </div>
                  </div>
                )}

                {/* ✅ 填空题编辑器 */}
                {editForm.type === 'fill_blank' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        填空答案设置
                      </label>
                      <button
                        onClick={handleAddBlank}
                        className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        添加填空
                      </button>
                    </div>

                    <div className="space-y-3">
                      {editForm.blanks.map((blank, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-500/20">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {index + 1}
                          </div>

                          <input
                            type="text"
                            value={blank.answer}
                            onChange={(e) => handleBlankChange(index, e.target.value)}
                            className="flex-1 px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg focus:border-green-500 focus:outline-none dark:text-white text-sm"
                            placeholder={`第 ${index + 1} 空的答案`}
                          />

                          {editForm.blanks.length > 1 && (
                            <button
                              onClick={() => handleRemoveBlank(index)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="删除此空"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 提示信息 */}
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg">
                      💡 <span className="font-bold">使用方法：</span>在题干中用 <code className="bg-gray-200 dark:bg-black/20 px-1 rounded">___</code> 或 <code className="bg-gray-200 dark:bg-black/20 px-1 rounded">{"{blank}"}</code> 标记填空位置
                    </div>
                  </div>
                )}

                {/* ✅ 证明题/问答题参考答案 */}
                {(editForm.type === 'proof' || editForm.type === 'essay') && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      参考答案（可选）
                    </label>
                    <textarea
                      value={editForm.answer}
                      onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all dark:text-white font-mono text-sm"
                      rows={4}
                      placeholder="输入参考答案或解题思路..."
                    />
                  </div>
                )}

                {/* 学科和难度 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      📚 学科 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.subject}
                      onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all dark:text-white"
                    >
                      <option value="physics">Physics (物理)</option>
                      <option value="mathematics">Mathematics (数学)</option>
                      <option value="english">English (英语)</option>
                      <option value="chemistry">Chemistry (化学)</option>
                      <option value="biology">Biology (生物)</option>
                      <option value="history">History (历史)</option>
                      <option value="geography">Geography (地理)</option>
                    </select>
                    {editForm.subject && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        ✅ 当前学科: {editForm.subject}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      难度
                    </label>
                    <select
                      value={editForm.difficulty}
                      onChange={(e) => setEditForm({ ...editForm, difficulty: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all dark:text-white"
                    >
                      <option value={1}>简单 (⭐)</option>
                      <option value={2}>中等 (⭐⭐)</option>
                      <option value={3}>困难 (⭐⭐⭐)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="sticky bottom-0 bg-white dark:bg-slate-800 px-8 py-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
                <button
                  onClick={handleCancelEdit}
                  className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-white/5 font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors dark:text-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-sm hover:shadow-lg transition-all"
                >
                  保存修改
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
};

export default MistakeVaultPage;