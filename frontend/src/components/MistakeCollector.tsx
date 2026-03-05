import { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "../context/ToastContext";
import ContextMenu from "./ContextMenu";
import * as workbenchApi from "../utils/workbenchApi";
import { WorkbenchMistake } from "../utils/workbenchApi";

// --- Icons ---
const Icons = {
  Plus: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75V3a.75.75 0 01-.75-.75zM7.5 12.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v-6.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 11-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 00-1.498-.058l-.347 9a.75.75 0 101.5.058l.345-9z" clipRule="evenodd" /></svg>,
  Bug: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59z" /><path fillRule="evenodd" d="M12 6.75a5.25 5.25 0 015.25 5.25v3a3 3 0 00-3 3v.75h-4.5v-.75a3 3 0 00-3-3v-3A5.25 5.25 0 0112 6.75z" clipRule="evenodd" /></svg>,
  ArrowRight: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>,
  Copy: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.875 2.25a2.625 2.625 0 100 5.25 2.625 2.625 0 000-5.25zM9 6.75a.75.75 0 000 1.5h.75a.75.75 0 000-1.5H9zm-2.25-.75a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM7.875 12a2.625 2.625 0 100 5.25 2.625 2.625 0 000-5.25zM9 16.5a.75.75 0 000 1.5h.75a.75.75 0 000-1.5H9zm-2.25-.75a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM7.875 21.75a2.625 2.625 0 100 5.25 2.625 2.625 0 000-5.25zM9 26.25a.75.75 0 000 1.5h.75a.75.75 0 000-1.5H9zm-2.25-.75a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" /></svg>,
  ClearAll: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" /></svg>,
  Settings: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567l-.091.548a7.493 7.493 0 00-.592.272l-.504-.221a1.875 1.875 0 00-2.168.372l-.464.464a1.875 1.875 0 00-.372 2.168l.221.504a7.493 7.493 0 00-.272.592l-.548.091a1.875 1.875 0 00-1.567 1.85v.656c0 .917.663 1.699 1.567 1.85l.548.091c.078.202.17.398.272.592l-.221.504a1.875 1.875 0 00.372 2.168l.464.464c.574.574 1.477.66 2.168.372l.504-.221c.194.103.39.195.592.272l.091.548a1.875 1.875 0 001.85 1.567h.656c.917 0 1.699-.663 1.85-1.567l.091-.548a7.493 7.493 0 00.592-.272l.504.221a1.875 1.875 0 002.168-.372l.464-.464a1.875 1.875 0 00.372-2.168l-.221-.504a7.493 7.493 0 00.272-.592l.548-.091a1.875 1.875 0 001.567-1.85v-.656c0-.917-.663-1.699-1.567-1.85l-.548-.091a7.493 7.493 0 00-.272-.592l.221-.504a1.875 1.875 0 00-.372-2.168l-.464-.464a1.875 1.875 0 00-2.168-.372l-.504.221a7.493 7.493 0 00-.592-.272l-.091-.548a1.875 1.875 0 00-1.85-1.567h-.656zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" /></svg>,
  Close: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>,
};

// Default subjects with colors
const DEFAULT_SUBJECTS = [
  { value: "chinese", label: "CHI", color: "text-red-500 dark:text-red-400 border-red-500/30 dark:border-red-400/30" },
  { value: "math", label: "MAT", color: "text-green-500 dark:text-green-400 border-green-500/30 dark:border-green-400/30" },
  { value: "english", label: "ENG", color: "text-yellow-500 dark:text-yellow-400 border-yellow-500/30 dark:border-yellow-400/30" },
];

const SUBJECT_COLORS = [
  "text-blue-500 dark:text-blue-400 border-blue-500/30 dark:border-blue-400/30",
  "text-purple-500 dark:text-purple-400 border-purple-500/30 dark:border-purple-400/30",
  "text-pink-500 dark:text-pink-400 border-pink-500/30 dark:border-pink-400/30",
  "text-indigo-500 dark:text-indigo-400 border-indigo-500/30 dark:border-indigo-400/30",
  "text-teal-500 dark:text-teal-400 border-teal-500/30 dark:border-teal-400/30",
  "text-orange-500 dark:text-orange-400 border-orange-500/30 dark:border-orange-400/30",
];

/**
 * MistakeCollector - 专注备忘录
 * 记录格式：PxxTxx 注释内容
 * 例如：P12T3 这道题考查了动量守恒定律的应用
 */
const MistakeCollector = () => {
  const toast = useToast();
  const [questionId, setQuestionId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("chinese");
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [showSubjectManager, setShowSubjectManager] = useState(false);
  const [newSubjectLabel, setNewSubjectLabel] = useState("");
  const [recentMistakes, setRecentMistakes] = useState<WorkbenchMistake[]>([]);
  const [searchResults, setSearchResults] = useState<WorkbenchMistake[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<WorkbenchMistake | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<WorkbenchMistake | null>(null);

  // Load data
  useEffect(() => {
    loadRecentMistakes();
    loadSubjects();

    // Listen for toggle subject manager event
    const handleToggleSubjectManager = () => {
      console.log('toggle-subject-manager event received');
      setShowSubjectManager(prev => !prev);
    };

    window.addEventListener('toggle-subject-manager', handleToggleSubjectManager);

    return () => {
      window.removeEventListener('toggle-subject-manager', handleToggleSubjectManager);
    };
  }, []);

  const loadSubjects = () => {
    const saved = localStorage.getItem('workbench_subjects');
    if (saved) {
      try {
        setSubjects(JSON.parse(saved));
      } catch (err) {
        console.warn('Failed to load subjects:', err);
      }
    }
  };

  const saveSubjects = (newSubjects) => {
    setSubjects(newSubjects);
    localStorage.setItem('workbench_subjects', JSON.stringify(newSubjects));
  };

  const handleAddSubject = () => {
    if (!newSubjectLabel.trim()) {
      toast.error('请输入学科缩写');
      return;
    }

    if (newSubjectLabel.length > 5) {
      toast.error('缩写不能超过5个字符');
      return;
    }

    if (subjects.some(s => s.label === newSubjectLabel.toUpperCase())) {
      toast.error('该学科已存在');
      return;
    }

    const colorIndex = subjects.length % SUBJECT_COLORS.length;
    const newSubject = {
      value: newSubjectLabel.toLowerCase(),
      label: newSubjectLabel.toUpperCase(),
      color: SUBJECT_COLORS[colorIndex]
    };

    const newSubjects = [...subjects, newSubject];
    saveSubjects(newSubjects);
    setNewSubjectLabel("");
    toast.success(`已添加学科: ${newSubject.label}`);
  };

  const handleDeleteSubject = (subjectValue) => {
    if (subjects.length <= 1) {
      toast.error('至少保留一个学科');
      return;
    }

    const newSubjects = subjects.filter(s => s.value !== subjectValue);
    saveSubjects(newSubjects);

    // If deleted subject was selected, switch to first available
    if (selectedSubject === subjectValue) {
      setSelectedSubject(newSubjects[0].value);
    }

    toast.success('已删除学科');
  };

  const loadRecentMistakes = async () => {
    try {
      // Load from new API
      const data = await workbenchApi.getWorkbenchMistakes(null, 50);
      setRecentMistakes(data);
    } catch (error) {
      console.error('Failed to load mistakes from API:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('workbench_mistakes');
      if (saved) {
        try { setRecentMistakes(JSON.parse(saved)); } catch (err) {}
      }
    }
  };

  // Search questions
  const searchQuestions = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get("http://localhost:8000/api/workbench/questions/search", {
        params: { q: query, subject: selectedSubject, limit: 5 }
      });
      setSearchResults(response.data);
      setShowSearch(true);
    } catch (e) {
      console.warn('Search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (questionId && !selectedQuestion) {
        searchQuestions(questionId);
      } else {
        setShowSearch(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [questionId, selectedSubject]);

  const handleSubmit = async () => {
    if (!questionId.trim()) return;

    try {
      // Create via API
      const newMistake = await workbenchApi.createWorkbenchMistake(
        questionId.trim(),
        selectedSubject
      );

      // Reload from server
      const updated = await workbenchApi.getWorkbenchMistakes();
      setRecentMistakes(updated);

      toast.success('备忘录已添加');

      // Reset
      setQuestionId("");
      setSelectedQuestion(null);
      setShowSearch(false);
    } catch (error) {
      console.error('Failed to create mistake:', error);
      toast.error('添加失败');
    }
  };

  const selectQuestion = (question) => {
    setQuestionId(question.id);
    setSelectedQuestion(question);
    setShowSearch(false);
  };

  const deleteMistake = async (id) => {
    try {
      await workbenchApi.deleteWorkbenchMistake(id);

      // Reload from server
      const updated = await workbenchApi.getWorkbenchMistakes();
      setRecentMistakes(updated);

      toast.info('已删除');
    } catch (error) {
      console.error('Failed to delete mistake:', error);
      toast.error('删除失败');
    }
  };

  // Context menu handlers
  const closeContextMenu = () => {
    setContextMenu(null);
    setContextMenuTarget(null);
  };

  const handleItemContextMenu = (e, mistake) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
    setContextMenuTarget(mistake);
  };

  const handleContextMenuAction = (action) => {
    if (!contextMenuTarget) return;

    switch (action) {
      case 'delete':
        deleteMistake(contextMenuTarget.id);
        break;
      case 'copy':
        navigator.clipboard.writeText(contextMenuTarget.content);
        toast.success('内容已复制');
        break;
      case 'edit':
        setQuestionId(contextMenuTarget.content);
        setSelectedSubject(contextMenuTarget.subject);
        deleteMistake(contextMenuTarget.id);
        break;
    }
    closeContextMenu();
  };

  // Handle global clear event from WorkbenchPage
  useEffect(() => {
    const handleClearAll = async () => {
      if (recentMistakes.length === 0) {
        toast.info('没有可清除的错题');
        return;
      }
      if (confirm('确定要清空所有错题记录吗？')) {
        try {
          await workbenchApi.clearAllWorkbenchMistakes();
          setRecentMistakes([]);
          toast.success('已清空所有错题');
        } catch (error) {
          console.error('Failed to clear mistakes:', error);
          toast.error('清空失败');
        }
      }
    };

    const handleImportClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        const questionIds = text.split(/[\n,，]/).map(id => id.trim()).filter(id => id);
        if (questionIds.length === 0) {
          toast.error('剪贴板中没有有效的题目ID');
          return;
        }
        let addedCount = 0;
        for (const qid of questionIds) {
          try {
            await axios.post("http://localhost:8000/api/workbench/mistakes", {
              question_id: qid,
              subject: selectedSubject
            });
            addedCount++;
          } catch (e) {
            console.warn(`Failed to add ${qid}:`, e);
          }
        }
        if (addedCount > 0) {
          toast.success(`已导入 ${addedCount} 个错题`);
          await loadRecentMistakes();
        } else {
          toast.error('导入失败，请检查题目ID');
        }
      } catch (e) {
        toast.error('无法访问剪贴板');
      }
    };

    const handleClearEvent = (e) => {
      if (e.detail === 'mistake') {
        handleClearAll();
      }
    };

    const handleImportEvent = () => {
      handleImportClipboard();
    };

    window.addEventListener('workbench-clear', handleClearEvent);
    window.addEventListener('workbench-import', handleImportEvent);

    return () => {
      window.removeEventListener('workbench-clear', handleClearEvent);
      window.removeEventListener('workbench-import', handleImportEvent);
    };
  }, [recentMistakes, selectedSubject]);

  return (
    <div className="flex flex-col h-full">

      {/* Input Area */}
      <div className="mb-4 relative">
        {/* Subject Toggles (Adaptive) */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-2 flex-1 overflow-x-auto pb-1 no-scrollbar">
             {subjects.map(sub => (
               <button
                 key={sub.value}
                 onClick={() => { setSelectedSubject(sub.value); setSelectedQuestion(null); }}
                 className={`px-2 py-1 text-[10px] font-bold border rounded-md transition-all uppercase tracking-wider ${
                   selectedSubject === sub.value
                      ? `${sub.color} bg-black/5 dark:bg-white/5`
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
                 }`}
               >
                 {sub.label}
               </button>
             ))}
          </div>
          <button
            onClick={() => setShowSubjectManager(!showSubjectManager)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors flex-shrink-0"
            title="管理学科"
          >
            <Icons.Settings />
          </button>
        </div>

        {/* Subject Manager Panel */}
        {showSubjectManager && (
          <div className="mb-3 p-3 bg-gray-100/50 dark:bg-black/30 backdrop-blur-sm rounded-lg border border-gray-300/30 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={newSubjectLabel}
                onChange={(e) => setNewSubjectLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                placeholder="输入学科缩写（如 PHY）"
                className="flex-1 bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3 py-1.5 rounded-lg outline-none text-sm border border-gray-300/50 dark:border-white/10 focus:border-indigo-500/30 dark:focus:border-white/10"
                maxLength={5}
                onContextMenu={(e) => e.stopPropagation()}
              />
              <button
                onClick={handleAddSubject}
                className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-medium rounded-lg hover:scale-105 active:scale-95 transition-all"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map(sub => (
                <div
                  key={sub.value}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold border rounded-md ${sub.color} bg-black/5 dark:bg-white/5`}
                >
                  <span>{sub.label}</span>
                  {subjects.length > 1 && (
                    <button
                      onClick={() => handleDeleteSubject(sub.value)}
                      className="ml-1 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="删除学科"
                    >
                      <Icons.Close />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Minimal Input (Adaptive Semi-Transparent) */}
        <div className="relative group" onContextMenu={(e) => e.stopPropagation()}>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
          </div>
          <input
            type="text"
            value={questionId}
            onChange={(e) => { setQuestionId(e.target.value); setSelectedQuestion(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="P12T3 这道题考查了..."
            className="w-full bg-gray-100/50 dark:bg-[#252525]/50 hover:bg-gray-100/80 dark:hover:bg-[#2a2a2a]/80 focus:bg-white dark:focus:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 pl-12 pr-12 py-3 rounded-xl outline-none transition-colors border border-transparent focus:border-indigo-500/30 dark:focus:border-white/10 text-sm"
          />
          <button
             onClick={handleSubmit}
             className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors"
          >
             <Icons.ArrowRight />
          </button>
        </div>

        {/* Format Hint */}
        {!questionId && (
          <div className="text-xs text-center mt-2 px-4 py-2 bg-gray-200/50 dark:bg-black/30 backdrop-blur-sm rounded-lg border border-gray-300/30 dark:border-white/10 text-gray-600 dark:text-gray-400">
            格式：PxxTxx 注释内容（页码 题号 备注）
          </div>
        )}

        {/* Search Results Dropdown */}
        {showSearch && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-[#252525]/95 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
            {searchResults.map((q) => (
              <button
                key={q.id}
                onClick={() => selectQuestion(q)}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-1">
                      {q.id}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                      {q.summary}
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    {q.type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Question Preview */}
        {selectedQuestion && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-[#252525]/95 backdrop-blur-md border border-indigo-200 dark:border-indigo-500/30 rounded-xl shadow-xl p-4 z-50">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-1">
                  {selectedQuestion.id}
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedQuestion.summary}
                </div>
              </div>
              <button
                onClick={() => { setSelectedQuestion(null); setQuestionId(""); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Icons.Trash />
              </button>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {selectedQuestion.content_preview}
            </div>
          </div>
        )}
      </div>

      {/* Recent List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
        <div className="space-y-1">
          {recentMistakes.map(mistake => {
             const sub = subjects.find(s => s.value === mistake.subject) || subjects[0];
             return (
              <div
                key={mistake.id}
                data-mistake-item="true"
                onContextMenu={(e) => handleItemContextMenu(e, mistake)}
                className="group flex items-center justify-between p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sub.color} bg-black/5 dark:bg-white/5 opacity-70 flex-shrink-0`}>
                      {sub.label}
                   </span>
                   <div className="flex-1 min-w-0">
                     <div className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {mistake.content}
                     </div>
                     {mistake.created_at && (
                       <div className="text-xs text-gray-400 dark:text-gray-500">
                         {new Date(mistake.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       </div>
                     )}
                   </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); deleteMistake(mistake.id); }}
                  onContextMenu={(e) => { e.stopPropagation(); }}
                  className="opacity-30 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-all text-xs flex-shrink-0 p-1"
                  title="删除"
                >
                  <Icons.Trash />
                </button>
              </div>
             );
          })}

          {recentMistakes.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-600 text-xs mt-8">
              No mistakes recorded recently.
            </div>
          )}
        </div>
      </div>

      {/* Context Menu for individual mistake items */}
      <ContextMenu position={contextMenu} onClose={closeContextMenu}>
        <button
          onClick={() => handleContextMenuAction('copy')}
          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
        >
          <Icons.Copy />
          <span>复制内容</span>
        </button>
        <button
          onClick={() => handleContextMenuAction('edit')}
          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
        >
          <Icons.Plus />
          <span>重新编辑</span>
        </button>
        <button
          onClick={() => handleContextMenuAction('delete')}
          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-red-600 dark:text-red-400"
        >
          <Icons.Trash />
          <span>删除</span>
        </button>
      </ContextMenu>

    </div>
  );
};

export default MistakeCollector;
