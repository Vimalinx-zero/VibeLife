import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { apiClient } from "../utils/api"; // ✅ 修复：导入 apiClient 以自动添加 token
import { useNavigate, useLocation } from "react-router-dom";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import FileExplorer from "../components/FileExplorer";
import NoteEditor from "../components/NoteEditor";
import AIAssistant from "../components/AIAssistant";
import SmartKnowledgePanel from "../components/SmartKnowledgePanel"; // ✨ 新的统一知识面板
import TagCloud from "../components/TagCloud";
import BacklinksPanel from "../components/BacklinksPanel";
import NoteSearch from "../components/NoteSearch";
import TagSettings from "../components/TagSettings";

interface NoteItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  parent_id?: string;
  created_at?: string;
  updated_at?: string;
  children?: NoteItem[];
  tags?: string[];
  date?: string;
}

interface NoteInfo {
  id: string;
  type: string;
  name: string;
  content?: string;
  parent_id?: string;
  tags?: string[];
  date?: string;
}

interface ViewData {
  info: NoteInfo;
  items: NoteItem[];
  breadcrumbs: Array<{ id: string; name: string }>;
}

interface Breadcrumb {
  id: string;
  name: string;
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  item: NoteItem | null;
}

interface SortConfig {
  key: 'name' | 'date';
  order: 'asc' | 'desc';
}

interface TagSettings {
  showTagCloud: boolean;
  autoTag: boolean;
}

// --- SVG Icons ---
const Icons = {
  ArrowLeft: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
  Robot: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M16.5 7.5h-9v9h9v-9z" /><path fillRule="evenodd" d="M8.25 2.25A.75.75 0 019 3v1.5h6V3a.75.75 0 011.5 0v1.5h.75c.966 0 1.75.784 1.75 1.75v11.25c0 .966-.784 1.75-1.75 1.75h-13.5c-.966 0-1.75-.784-1.75-1.75V6.25c0-.966.784-1.75 1.75-1.75h.75V3a.75.75 0 01.75-.75zM6 6.25v11.25a.25.25 0 00.25.25h11.5a.25.25 0 00.25-.25V6.25a.25.25 0 00-.25-.25H6.25a.25.25 0 00-.25.25z" clipRule="evenodd" /></svg>,
  Sparkles: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1 1.173-2.725l3.524 3.749-4.902 4.649a2 2 0 0 1-2.724 1.172L12 9.26l-3.16 2.787a2 2 0 0 1-2.724-1.172L1.515 7.837a2 2 0 0 1 1.173-2.725L5.5 3.26 9.875.666a2 2 0 0 1 2.25 0L12 3Z" /></svg>,
  // New Icons for Menu
  Info: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.751-1.034a.75.75 0 011.498 0v5.25a.75.75 0 01-1.498 0v-5.25zM12 6.75a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75V7.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>,
  SortAlpha: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v15.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V3a.75.75 0 01.75-.75z" clipRule="evenodd" /><path d="M3.56 6.72a.75.75 0 011.017-.162l4 2.75a.75.75 0 11-.854 1.238L4.5 8.313V18a.75.75 0 01-1.5 0V8.313l-.223.233a.75.75 0 11-1.054-1.092l1.837-1.734z" /></svg>,
  SortTime: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>,
  Check: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 011.04-.207z" clipRule="evenodd" /></svg>,
  ArrowUp: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06l-6.22-6.22V21a.75.75 0 01-1.5 0V4.81l-6.22 6.22a.75.75 0 11-1.06-1.06l7.5-7.5z" clipRule="evenodd" /></svg>,
  ArrowDown: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v16.19l6.22-6.22a.75.75 0 111.06 1.06l-7.5 7.5a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 111.06-1.06l6.22 6.22V3a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>,
  // New Icons for File Operations
  Move: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg>,
  Trash: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg>,
  FolderArrow: ({className}: {className?: string}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" /></svg>,
  Knowledge: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
};

const NotesPage = () => {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ 新增：用于获取 URL 参数
  const [currentId, setCurrentId] = useState<string>("root");
  const [viewData, setViewData] = useState<ViewData>({
    info: {id:'root', type:'folder', name:'Library'},
    items: [],
    breadcrumbs: []
  });
  const [content, setContent] = useState<string>("");
  const [activeFile, setActiveFile] = useState<NoteItem | null>(null);

  // UI States
  const [viewMode, setViewMode] = useState<"split" | "edit" | "read">("read");
  const [aiOpen, setAiOpen] = useState<boolean>(false);
  const [smartKnowledgeOpen, setSmartKnowledgeOpen] = useState<boolean>(false); // ✨ 统一的知识面板开关

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', order: 'asc' }); // key: 'name' | 'date', order: 'asc' | 'desc'

  // ✨ 新增：标签系统状态
  const [allTags, setAllTags] = useState<string[]>([]); // 所有标签
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 选中的标签（用于筛选）

  // ✨ 新增：标签设置（从 localStorage 读取）
  const [tagSettings, setTagSettings] = useState<TagSettings>(() => {
    const saved = localStorage.getItem('tagSettings');
    return saved ? JSON.parse(saved) : {
      showTagCloud: false,  // 默认隐藏标签云
      autoTag: true         // 默认开启自动标签
    };
  });

  // 持久化设置到 localStorage
  useEffect(() => {
    localStorage.setItem('tagSettings', JSON.stringify(tagSettings));
  }, [tagSettings]);

  // ✅ 快捷键支持
  useKeyboardShortcuts({
    // Ctrl+N - 新建笔记
    'ctrl+n': () => {
      if (activeFile) {
        // 如果当前有打开的文件，先保存
        saveNote();
      }
      // 打开创建模态框
      setShowCreateModal(true);
      setNewItemType("file");
    },

    // Ctrl+S - 保存笔记
    'ctrl+s': () => {
      if (activeFile) {
        saveNote();
      }
    },
  });


  // Modals
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({ show: false, x: 0, y: 0, item: null });
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false); // ✨ 新增信息弹窗
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemType, setNewItemType] = useState<"file" | "folder">("file");

  // Modal States for File Operations
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showMoveModal, setShowMoveModal] = useState<boolean>(false);

  // ✅ 新增：移动文件时选中的目标文件夹ID
  const [selectedMoveTarget, setSelectedMoveTarget] = useState<string | null>(null);

  // ✅ 新增：移动模态框专用的视图数据 (用于在模态框里浏览文件夹)
  const [moveViewData, setMoveViewData] = useState<ViewData>({
    info: {id:'root', name:'Library', type:'folder'},
    items: [],
    breadcrumbs: []
  });
  const [isMoveLoading, setIsMoveLoading] = useState<boolean>(false);

  // ✅ 新增：错题列表数据 (用于 Import Question 模态框)
  const [mistakesList, setMistakesList] = useState<any[]>([]);

  // Ref Picker States
  const [showRefModal, setShowRefModal] = useState<boolean>(false);
  const [refMode, setRefMode] = useState<'note' | 'question'>('note'); // 'note' | 'question'

  const [toastMsg, setToastMsg] = useState<string | null>(null); // Toast 消息状态

  // Helper: Toast 触发器
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  // 插入引用 (Link Insertion)
  const handleInsertRef = (item: any) => {
      let textToInsert = "";

      if (refMode === 'note') {
          // 插入笔记链接：[[note:id]]
          textToInsert = `[[note:${item.id}]]`;
      } else {
          // 插入题目卡片
          textToInsert = `[[gk_${item.question_id}]]`;
      }

      // ✅ 修复1：使用 ID 直接获取 textarea，而不是依赖 activeElement
      const textarea = document.getElementById("note-textarea") as HTMLTextAreaElement;

      if (textarea) {
        // 获取当前光标位置（如果没有焦点，则使用末尾）
        const start = textarea.selectionStart || textarea.value.length;
        const end = textarea.selectionEnd || textarea.value.length;
        const text = textarea.value;

        // 在光标位置插入
        const newText = text.substring(0, start) + textToInsert + text.substring(end);
        setContent(newText);

        // 设置光标位置到插入文本之后
        setTimeout(() => {
          textarea.focus();
          const newPosition = start + textToInsert.length;
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
      } else {
        // 降级：如果找不到 textarea，则追加到末尾
        setContent(prev => prev + textToInsert);
      }

      setShowRefModal(false);
      showToast("✅ Link Inserted");
  };

  // Helper: 模态框内的文件夹加载
  const loadMoveNode = async (id: string) => {
      setIsMoveLoading(true);
      try {
          const res = await apiClient.get(`/notes/view?id=${id}`);
          setMoveViewData(res.data);
      } catch (e) { console.error(e); }
      setIsMoveLoading(false);
  };

  // ✅ 新增：修改打开模态框的逻辑 (初始化加载根目录)
  const openMoveModal = () => {
      setShowMoveModal(true);
      loadMoveNode('root'); // 打开时默认从根目录开始
  };

  useEffect(() => { loadNode("root"); }, []);

  // ✨ 新增：监听自定义事件（从 SmartLink 跳转）
  useEffect(() => {
    const handleLoadNote = (e: CustomEvent<{id: string}>) => {
      const { id } = e.detail;
      if (id) {
        loadNode(id);
      }
    };

    window.addEventListener('loadNote', handleLoadNote as EventListener);
    return () => window.removeEventListener('loadNote', handleLoadNote as EventListener);
  }, []);

  // ✅ 新增：处理 URL 参数中的 id（从其他页面跳转过来）
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const noteId = urlParams.get('id');

    if (noteId && noteId !== currentId) {
      // 自动打开指定的笔记
      loadNode(noteId);
    }
  }, [location.search]); // 依赖 URL 参数变化

  // ✨ 新增：加载所有标签
  useEffect(() => {
    loadAllTags();
  }, []);

  const loadAllTags = async (): Promise<void> => {
    try {
      const res = await apiClient.get("/notes/tags");
      setAllTags(res.data);
    } catch (e) {
      console.error("Failed to load tags:", e);
    }
  };

  const loadNode = async (id: string) => {
    try {
      const res = await apiClient.get(`/notes/view?id=${id}`);
      const targetData = res.data;

      setCurrentId(id);

      if (targetData.info.type === 'folder') {
        // A. 如果点击的是文件夹
        setViewData(targetData);
        // ❌ 以前这里会清空 activeFile，导致文件关闭。现在注释掉或删掉这一行。
        // setActiveFile(null);
      } else {
        // B. 如果点击的是文件
        setActiveFile(targetData.info as NoteItem);
        setContent(targetData.info.content || "");

        if (viewData.info.id !== targetData.info.parent_id) {
           const parentRes = await apiClient.get(`/notes/view?id=${targetData.info.parent_id}`);
           setViewData(parentRes.data);
        }
      }
    } catch (error) { console.error(error); }
  };

  // --- 排序逻辑 ---
  const handleSort = (key: 'name' | 'date') => {
    setSortConfig(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
    setCtxMenu({ ...ctxMenu, show: false });
  };

  // 使用 useMemo 实时计算排序后的列表
  const sortedItems = useMemo(() => {
    let items = [...viewData.items];

    // ✨ 新增：标签筛选
    if (selectedTags.length > 0) {
      items = items.filter(item => {
        // 文件夹不参与标签筛选
        if (item.type === 'folder') return false;
        // 检查文件是否包含任一选中的标签
        return item.tags && selectedTags.some(tag => item.tags!.includes(tag));
      });
    }

    return items.sort((a, b) => {
      // 始终保持文件夹在上方
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;

      let comparison = 0;
      if (sortConfig.key === 'name') {
        comparison = a.name.localeCompare(b.name, 'zh-CN');
      } else {
        comparison = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
      }
      return sortConfig.order === 'asc' ? comparison : -comparison;
    });
  }, [viewData.items, sortConfig, selectedTags]); // ✨ 新增：依赖 selectedTags

  const saveNote = async (newTitle?: string, newContent?: string, newTags?: string[]): Promise<void> => {
    // 安全检查
    if (!activeFile || activeFile.type !== 'file') return;

    const contentToSave = newContent !== undefined ? newContent : content;
    const titleToSave = newTitle !== undefined ? newTitle : activeFile.name;
    const tagsToSave = newTags !== undefined ? newTags : activeFile.tags || [];

    try {
        // ✅ 关键修复：使用 activeFile.id 而不是 currentId
        // 因为当你点击左侧文件夹浏览时，currentId 已经变了，但你还在编辑原来的文件
        const res = await apiClient.post("/notes/save", {
            id: activeFile.id,
            content: contentToSave,
            name: titleToSave,
            tags: tagsToSave,  // ✨ 手动标签
            auto_tag: tagSettings.autoTag  // ✨ 是否启用自动标签
        });

        // ✨ 获取后端合并后的标签列表
        const finalTags = res.data.tags || tagsToSave;

        // 更新当前文件状态
        setActiveFile(prev => prev ? { ...prev, name: titleToSave, content: contentToSave, tags: finalTags } : null);

        // 更新列表显示 (只有当该文件在当前视图列表中时才更新)
        setViewData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                // ✅ 关键修复：匹配 activeFile.id
                item.id === activeFile.id ? { ...item, name: titleToSave, tags: finalTags } : item
            )
        }));

        // ✨ 新增：刷新标签云
        loadAllTags();

        // ✅ 确保这里有 Toast
        showToast("✅ Note Saved!");

        // ✨ 新增：触发笔记保存事件，通知其他组件刷新（如 BacklinksPanel）
        window.dispatchEvent(new CustomEvent('noteSaved'));

    } catch (e) {
        showToast("❌ Save Failed");
    }
  };

  const createItem = async () => {
    if (!newItemName.trim()) return;
    const parentId = viewData.info.type === 'file' ? viewData.info.parent_id : viewData.info.id;
    await apiClient.post("/notes/create", { parent_id: parentId || 'root', name: newItemName, type: newItemType });
    setShowCreateModal(false);
    setNewItemName("");
    loadNode(parentId || 'root');
  };

  // --- 右键菜单 ---
  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation(); // 防止冒泡
    setCtxMenu({ show: true, x: e.clientX, y: e.clientY, item: item });
  };

  const handleRename = () => {
    if(!ctxMenu.item) return;
    const newName = prompt("Rename to:", ctxMenu.item.name);
    if (newName && newName.trim()) {
      // 这里只是演示，实际需要后端 API 支持重命名
      alert(`Renamed to ${newName} (Backend API needed)`);
      setCtxMenu({ ...ctxMenu, show: false });
    }
  };

  const handleDelete = async () => {
    if(!ctxMenu.item) return;
    if(confirm(`Delete ${ctxMenu.item.name}?`)) {
      await apiClient.post("/notes/delete", { id: ctxMenu.item.id });
      loadNode(viewData.info.id); // 刷新当前文件夹
      setCtxMenu({ ...ctxMenu, show: false });
    }
  };

  const insertLink = () => { const id = prompt("Enter Note ID:"); if(id) setContent(prev => prev + ` [[note:${id}]]`); };
  const insertQuestion = () => { const id = prompt("Enter Q ID:"); if(id) setContent(prev => prev + ` [[${id}]]`); };

  // === 交互函数：文件操作相关 ===
  
  // 1. 提交重命名 (优化版：同步更新 activeFile 防止编辑器刷新)
  const submitRename = async () => {
      if (!newItemName || !ctxMenu.item) return;
      try {
          await apiClient.post("/notes/save", { id: ctxMenu.item.id, name: newItemName }); 
          
          // ✅ 关键：如果重命名的是当前打开的文件，直接更新 state，触发 NoteEditor 内部 useEffect 更新标题
          // 因为 ID 没变，NoteEditor 不会卸载，也就不会发生淡入淡出的闪烁
          if (activeFile && activeFile.id === ctxMenu.item.id) {
              setActiveFile(prev => prev ? { ...prev, name: newItemName } : null);
          }

          loadNode(viewData.info.id); // 刷新左侧列表 
          setShowRenameModal(false); 
          showToast("✅ Renamed Successfully"); 
      } catch(e) { showToast("❌ Rename Failed"); } 
  }; 

  // 2. 提交删除
  const submitDelete = async () => {
      if (!ctxMenu.item) return;
      try {
          await apiClient.post("/notes/delete", { id: ctxMenu.item.id });
          loadNode(viewData.info.id);
          if(activeFile?.id === ctxMenu.item.id) setActiveFile(null); // 如果删的是当前文件，关闭它
          setShowDeleteModal(false);
          showToast("🗑️ Deleted Item"); 
      } catch(e) { showToast("❌ Delete Failed"); } 
  }; 

  // 3. 提交移动 (核心新功能) 
  // 3. 提交移动 (升级版：移动到当前视图所在的目录)
  const submitMove = async () => {
      const targetId = moveViewData.info.id;
      
      // 校验：不能移动到自己里面，也不能原地移动
      if (!ctxMenu.item) return;
      if (targetId === ctxMenu.item.id) return showToast("⚠️ Cannot move to itself");
      if (targetId === ctxMenu.item.parent_id) return showToast("⚠️ Already here");

      try {
          await apiClient.post("/notes/save", { id: ctxMenu.item.id, parent_id: targetId });

          loadNode(viewData.info.id); // 刷新主界面列表
          setShowMoveModal(false);
          showToast(`✅ Moved to "${moveViewData.info.name}"`);
      } catch(e) { showToast("❌ Move Failed"); }
  };

  // --- 专用 Handler: 打开引用选择器 (避免内联函数导致重渲染) --- 
  const handleOpenLinkModal = () => { 
      setRefMode('note'); 
      loadMoveNode('root'); 
      setShowRefModal(true); 
  }; 

  // ✅ 修改：实现真实数据拉取 
  const handleOpenQuestionModal = async () => { 
      setRefMode('question'); 
      setShowRefModal(true); 
      
      // ✅ 拉取错题数据
      try {
          const res = await apiClient.get("/mistakes");
          setMistakesList(res.data);
      } catch (e) { console.error(e); } 
  }; 

  return (
    <div 
      className="fixed inset-0 bg-transparent text-slate-800 dark:text-slate-100 font-sans overflow-hidden flex flex-col"
      onClick={() => setCtxMenu({ ...ctxMenu, show: false })}
      onContextMenu={(e) => setCtxMenu({ ...ctxMenu, show: false })} // 再次右键关闭之前的菜单
    >
      
      {/* Header */}
      <div className="h-16 absolute top-6 left-0 w-full flex items-center px-8 z-50 pointer-events-none">
        {/* 左侧：Exit 按钮 */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-sm font-bold text-sm hover:scale-105 transition-transform text-slate-600 dark:text-slate-300">
            <Icons.ArrowLeft className="w-4 h-4" /> <span>Exit</span>
          </button>
        </div>
        {/* 中间：搜索框（绝对定位居中） */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto w-96">
          <NoteSearch onLoadNote={loadNode} />
        </div>

        {/* 右侧：AI Assist + 知识面板 + 设置按钮 */}
        <div className="ml-auto flex items-center gap-3 pointer-events-auto">
          {/* AI 对话按钮 */}
          <button
            onClick={() => {
              setAiOpen(!aiOpen);
              // 关闭知识面板以避免冲突
              if (!aiOpen && smartKnowledgeOpen) {
                setSmartKnowledgeOpen(false);
              }
            }}
            className={`px-4 py-2 rounded-full border border-white/20 transition-all duration-300 backdrop-blur-md shadow-sm flex items-center gap-2 group font-bold ${
              aiOpen
                ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            <Icons.Robot className="w-4 h-4" />
            <span>AI对话</span>
            <div className={`w-2 h-2 rounded-full ${aiOpen ? 'bg-white animate-pulse' : 'bg-green-500'}`}></div>
          </button>

          {/* 知识面板按钮（合并后） */}
          {activeFile && activeFile.type === 'file' && (
            <button
              onClick={() => {
                setSmartKnowledgeOpen(!smartKnowledgeOpen);
                // 关闭AI对话以避免冲突
                if (!smartKnowledgeOpen && aiOpen) {
                  setAiOpen(false);
                }
              }}
              className={`px-4 py-2 rounded-full border transition-all duration-300 backdrop-blur-md shadow-sm flex items-center gap-2 font-bold ${
                smartKnowledgeOpen
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg shadow-purple-500/30'
                  : 'bg-white/80 dark:bg-slate-800/80 border-white/20 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <Icons.Sparkles className="w-4 h-4" />
              <span>知识面板</span>
              {smartKnowledgeOpen && (
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              )}
            </button>
          )}

          {/* 标签设置按钮 */}
          <TagSettings
            settings={tagSettings}
            onSettingsChange={setTagSettings}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex pt-24 pb-6 px-6 gap-6 overflow-hidden items-start">
        {/* ✨ 修改：侧边栏容器 - 可滚动 */}
        <div className="shrink-0 h-[calc(100vh-10rem)] flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
            {/* 文件浏览器 - 限制高度 */}
            <div className="shrink-0">
              <FileExplorer
                  viewData={viewData}
                  currentId={currentId}
                  sortedItems={sortedItems}
                  onLoadNode={loadNode}
                  onCreateItem={(type) => { setNewItemType(type); setShowCreateModal(true); }}
                  onContextMenu={handleContextMenu}
                  onDropItem={async (draggedId, targetId) => {
                    try {
                      await apiClient.post("/notes/save", { id: draggedId, parent_id: targetId });
                      loadNode(viewData.info.id);
                    } catch (e) {
                      showToast("❌ Move Failed");
                    }
                  }}
              />
            </div>

            {/* ✨ 新增：双向链接面板 */}
            {activeFile && (
              <div className="shrink-0 w-72 p-4 bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden">
                <BacklinksPanel
                  currentNoteId={activeFile.id}
                  onLoadNode={loadNode}
                />
              </div>
            )}

            {/* ✨ 标签云面板（根据设置显示/隐藏） */}
            {tagSettings.showTagCloud && (
              <div className="shrink-0 w-72 p-4 bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden">
                <TagCloud
                  tags={allTags.map(tag => ({ name: tag, count: 0 }))}
                  selectedTags={selectedTags}
                  onTagClick={(tag) => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                  onClear={() => setSelectedTags([])}
                />
              </div>
            )}
        </div>
        {/* --- 编辑器区域：移除 AnimatePresence，避免不必要的重挂载 --- */}
        <div className="h-full w-full overflow-hidden flex justify-center">
            <motion.div
                // ✅ 修复：使用 activeFile?.id 作为 key，但只在真正切换笔记时才变化
                key={activeFile?.id}

                // ✅ 移除 initial 和 exit，不要进出场动画
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="h-full w-full flex justify-center"
            >
                    <NoteEditor
                        info={(activeFile || viewData.info) as any}
                        content={content}
                        setContent={setContent}
                        onSave={saveNote}
                        onLoadNode={loadNode}
                        onDeleteNote={(deletedId) => {
                          // 刷新当前文件夹
                          loadNode(viewData.info.id);
                          // 如果删除的是当前打开的笔记，关闭编辑器
                          if (activeFile?.id === deletedId) {
                            setActiveFile(null);
                          }
                        }}

                        // ✅ 修改：使用上面定义的稳定函数，不再使用内联箭头函数
                        onInsertLink={handleOpenLinkModal}
                        onInsertQuestion={handleOpenQuestionModal}

                        viewMode={viewMode} setViewMode={setViewMode}
                        aiOpen={aiOpen}
                        autoTag={tagSettings.autoTag}
                    />
            </motion.div>

            {/* === Toast 和模态框（使用 AnimatePresence 实现退出动画） === */}
            <AnimatePresence>
                {/* 1. 绿色呼吸光晕 Toast */}
                {toastMsg && (
                  <motion.div
                      initial={{ y: -50, opacity: 0 }}
                      animate={{
                          y: 0, opacity: 1,
                          boxShadow: ["0 0 0 0px rgba(74, 222, 128, 0)", "0 0 0 4px rgba(74, 222, 128, 0.3)", "0 0 0 0px rgba(74, 222, 128, 0)"]
                      }}
                      exit={{ y: -50, opacity: 0 }}
                      transition={{ boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
                      className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full backdrop-blur-md bg-green-500/10 border border-green-500 text-green-600 dark:text-green-400 font-bold shadow-xl flex items-center gap-2"
                  >
                      <Icons.Check className="w-5 h-5" /> {toastMsg}
                  </motion.div>
                )}

                {/* 2. 重命名模态框 (Rename Modal) */}
                {showRenameModal && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-md flex items-center justify-center" onClick={() => setShowRenameModal(false)}>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl w-80 border border-white/10" onClick={e => e.stopPropagation()}>
                            <h3 className="font-bold text-xl mb-4 text-slate-800 dark:text-white">Rename Item</h3>
                            <input autoFocus type="text" className="w-full p-4 rounded-xl bg-gray-100 dark:bg-black/20 border-none outline-none mb-6 font-bold dark:text-white"
                                value={newItemName} onChange={e => setNewItemName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitRename()} />
                            <div className="flex gap-3">
                                <button onClick={() => setShowRenameModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-white/5 font-bold text-sm hover:opacity-80 dark:text-gray-300">Cancel</button>
                                <button onClick={submitRename} className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600">Save</button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 3. 移动模态框 (Move Modal) */}
                {showMoveModal && (
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center"
                        onClick={() => setShowMoveModal(false)}
                    >
                        <div
                            className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-2xl p-0 rounded-2xl shadow-2xl w-[500px] max-w-[90vw] border border-white/40 dark:border-white/10 flex flex-col h-[500px] overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* --- Header & Breadcrumbs --- */}
                            <div className="p-4 border-b border-gray-200/50 dark:border-white/10 shrink-0 bg-white/50 dark:bg-white/5">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                    <Icons.Move className="w-5 h-5 text-blue-500"/>
                                    <span>Move Item</span>
                                </h3>

                                {/* Win11 Style Breadcrumb Bar */}
                                <div className="flex items-center gap-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm overflow-x-auto no-scrollbar">
                                    {/* 根目录图标 */}
                                    <button
                                       onClick={() => loadMoveNode('root')}
                                       className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${moveViewData.info.id === 'root' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
                                    >
                                       <Icons.FolderArrow className="w-4 h-4" />
                                    </button>

                                    {/* 面包屑路径 */}
                                    {moveViewData.breadcrumbs.map((crumb, idx) => (
                                        <div key={crumb.id} className="flex items-center gap-1 shrink-0">
                                            <span className="text-gray-300 dark:text-gray-600">/</span>
                                            <button
                                                onClick={() => loadMoveNode(crumb.id)}
                                                className={`px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium truncate max-w-[100px]
                                                  ${idx === moveViewData.breadcrumbs.length - 1 ? 'text-slate-800 dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400'}
                                                `}
                                            >
                                                {crumb.name}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* --- Folder List (Browser) --- */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-gray-50/50 dark:bg-transparent">
                                {isMoveLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-50 gap-2">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold">Loading...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {/* 上一级入口 */}
                                        {moveViewData.info.id !== 'root' && (
                                            <div
                                                onClick={() => loadMoveNode(moveViewData.info.parent_id || 'root')}
                                                className="group flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white dark:hover:bg-white/5 hover:shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-white/5 transition-all"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-500 group-hover:text-blue-500 transition-colors">
                                                    <Icons.ArrowUp className="w-5 h-5"/>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-slate-700 dark:text-slate-200">..</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase">Parent Directory</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 子文件夹列表 */}
                                        {moveViewData.items
                                            .filter(i => i.type === 'folder' && i.id !== ctxMenu.item?.id)
                                            .map(folder => (
                                            <div
                                                key={folder.id}
                                                onClick={() => loadMoveNode(folder.id)}
                                                className="group flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white dark:hover:bg-white/5 hover:shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-white/5 transition-all"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-500 group-hover:scale-110 transition-transform">
                                                    <Icons.FolderArrow className="w-5 h-5"/>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{folder.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold">{folder.date || 'Folder'}</div>
                                                </div>
                                                <Icons.ArrowDown className="w-4 h-4 text-gray-300 -rotate-90 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        ))}

                                        {/* 空状态提示 */}
                                        {moveViewData.items.filter(i => i.type === 'folder').length === 0 && (
                                            <div className="py-10 text-center text-gray-400 text-xs font-bold opacity-60">
                                                No subfolders here
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* --- Footer Action Bar --- */}
                            <div className="p-4 border-t border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md shrink-0 flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Moving to</div>
                                    <div className="font-bold text-sm text-slate-800 dark:text-white truncate flex items-center gap-2">
                                        <Icons.FolderArrow className="w-4 h-4 text-blue-500" />
                                        /{moveViewData.breadcrumbs.map(b => b.name).join('/')}
                                    </div>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => { setShowMoveModal(false); setSelectedMoveTarget(null); }}
                                        className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                      onClick={submitMove}
                                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <span>Move Here</span>
                                        <Icons.Check className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 4. 删除确认模态框 (Delete Modal) */}
                {showDeleteModal && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-md flex items-center justify-center" onClick={() => setShowDeleteModal(false)}>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl w-80 border border-white/10" onClick={e => e.stopPropagation()}>
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-4 mx-auto">
                                <Icons.Trash className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-center text-slate-800 dark:text-white">Delete Item?</h3>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-white/5 font-bold text-sm hover:opacity-80 dark:text-gray-300">Cancel</button>
                                <button onClick={submitDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 shadow-lg shadow-red-500/30">Delete</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
        <AIAssistant isOpen={aiOpen} context={activeFile ? { type: 'note', id: activeFile.id } : null} />

        {/* ✨ 统一的知识面板（合并 Knowledge + AI Explain） */}
        <SmartKnowledgePanel isOpen={smartKnowledgeOpen} type="note" id={activeFile?.id} />
      </div>

      {/* --- Modals --- */}
      
      {/* 1. 新建模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-80 border border-white/10" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">New {newItemType === 'folder' ? 'Folder' : 'Note'}</h3>
            <input autoFocus type="text" className="w-full p-3 rounded-xl bg-gray-100 dark:bg-black/20 border-none outline-none mb-4 font-bold dark:text-white"
              placeholder="Enter name..." value={newItemName} onChange={e => setNewItemName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createItem()} />
            <div className="flex gap-2">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-white/10 font-bold text-sm hover:opacity-80 dark:text-white">Cancel</button>
              <button onClick={createItem} className="flex-1 py-2 rounded-lg bg-blue-500 text-white font-bold text-sm hover:bg-blue-600">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. 信息模态框 */}
      {showInfoModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-80 border border-white/10" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
              <Icons.Info className="text-blue-500" /> Details
            </h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between"><span className="opacity-50">Name:</span> <span className="font-bold">{ctxMenu.item?.name}</span></div>
              <div className="flex justify-between"><span className="opacity-50">Type:</span> <span className="uppercase text-xs font-bold bg-gray-100 dark:bg-white/10 px-2 rounded">{ctxMenu.item?.type}</span></div>
              <div className="flex justify-between"><span className="opacity-50">Created:</span> <span>{ctxMenu.item?.date}</span></div>
              <div className="flex justify-between"><span className="opacity-50">ID:</span> <span className="font-mono text-xs">{ctxMenu.item?.id}</span></div>
            </div>
            <button onClick={() => setShowInfoModal(false)} className="w-full mt-6 py-2 rounded-lg bg-gray-100 dark:bg-white/10 font-bold text-sm hover:opacity-80 dark:text-white">Close</button>
          </div>
        </div>
      )}

      {/* 3. 右键菜单 */}
      {ctxMenu.show && (
        <div 
          className="fixed z-[999] w-48 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl py-1 overflow-hidden flex flex-col"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {ctxMenu.item ? (
            <>
               <div className="px-4 py-2 text-[10px] font-bold uppercase opacity-40 border-b border-gray-200 dark:border-white/10 mb-1 text-slate-500 dark:text-slate-400 truncate">
                 {ctxMenu.item!.name}
               </div>

               {/* 重命名按钮 */}
               <button onClick={() => { setNewItemName(ctxMenu.item!.name); setShowRenameModal(true); setCtxMenu({...ctxMenu, show: false}); }} className="text-left px-4 py-2.5 text-sm font-bold hover:bg-blue-500 hover:text-white transition-colors dark:text-gray-200 flex items-center gap-3">
                 <span className="opacity-70">✎</span> Rename
              </button>
              
              {/* #注释 找到右键菜单中的 Move 按钮，修改 onClick */}
              {/* ✅ 修改：绑定新的打开函数 */}
              <button onClick={() => { openMoveModal(); setCtxMenu({...ctxMenu, show: false}); }} className="text-left px-4 py-2.5 text-sm font-bold hover:bg-blue-500 hover:text-white transition-colors dark:text-gray-200 flex items-center gap-3">
                 <Icons.FolderArrow className="w-4 h-4 opacity-70" /> Move to...
              </button>

              <div className="h-px bg-gray-200 dark:bg-white/10 my-1 mx-4"></div>
              
              {/* 删除按钮 */}
              <button onClick={() => { setShowDeleteModal(true); setCtxMenu({...ctxMenu, show: false}); }} className="text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-3">
                 <Icons.Trash className="w-4 h-4 opacity-70" /> Delete
              </button>
            </>
          ) : (
            // --- 针对空白处的菜单 ---
            <>
              <div className="px-3 py-2 text-[10px] font-bold uppercase opacity-50 border-b border-white/10 mb-1 text-slate-500 dark:text-slate-400">
                Folder Actions
              </div>
              <button onClick={() => { setNewItemType('folder'); setShowCreateModal(true); setCtxMenu({...ctxMenu, show: false}); }} className="text-left px-4 py-2 text-sm font-bold hover:bg-blue-500 hover:text-white transition-colors dark:text-gray-200">New Folder</button>
              <button onClick={() => { setNewItemType('file'); setShowCreateModal(true); setCtxMenu({...ctxMenu, show: false}); }} className="text-left px-4 py-2 text-sm font-bold hover:bg-blue-500 hover:text-white transition-colors dark:text-gray-200">New Note</button>
              
              <div className="h-px bg-gray-200 dark:bg-white/10 my-1"></div>
              <div className="px-3 py-1 text-[10px] font-bold opacity-40 uppercase">Sort By</div>
              
              <button onClick={() => handleSort('name')} className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-blue-500 hover:text-white transition-colors dark:text-gray-200 flex items-center justify-between group">
                <span className="flex items-center gap-2"><Icons.SortAlpha className="w-4 h-4 opacity-70"/> Name</span>
                {sortConfig.key === 'name' && (
                   <span className="text-blue-500 group-hover:text-white">{sortConfig.order === 'asc' ? <Icons.ArrowUp className="w-3 h-3"/> : <Icons.ArrowDown className="w-3 h-3"/>}</span>
                )}
              </button>
              <button onClick={() => handleSort('date')} className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-blue-500 hover:text-white transition-colors dark:text-gray-200 flex items-center justify-between group">
                <span className="flex items-center gap-2"><Icons.SortTime className="w-4 h-4 opacity-70"/> Date</span>
                {sortConfig.key === 'date' && (
                   <span className="text-blue-500 group-hover:text-white">{sortConfig.order === 'asc' ? <Icons.ArrowUp className="w-3 h-3"/> : <Icons.ArrowDown className="w-3 h-3"/>}</span>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* 4. 引用选择器 (Reference Picker Modal) */}
      {showRefModal && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center" 
              onClick={() => setShowRefModal(false)}
          >
              <div 
                  className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-2xl p-0 rounded-2xl shadow-2xl w-[600px] max-w-[90vw] border border-white/40 dark:border-white/10 flex flex-col h-[600px] overflow-hidden" 
                  onClick={e => e.stopPropagation()}
              >
                  {/* --- Header --- */}
                  <div className="p-4 border-b border-gray-200/50 dark:border-white/10 shrink-0 bg-white/50 dark:bg-white/5 flex justify-between items-center">
                      <div className="flex flex-col">
                          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                              {refMode === 'note' ? <Icons.SortAlpha className="w-5 h-5 text-blue-500"/> : <Icons.FolderArrow className="w-5 h-5 text-purple-500"/>}
                              <span>{refMode === 'note' ? "Insert Note Link" : "Import Mistake Card"}</span>
                          </h3>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider opacity-70">
                              {refMode === 'note' ? "Select a file to reference" : "Choose a question to review"}
                          </p>
                      </div>
                      
                      {/* 如果是 Note 模式，显示面包屑导航 */}
                      {refMode === 'note' && (
                          <div className="flex items-center gap-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs overflow-x-auto no-scrollbar max-w-[200px]">
                              <button onClick={() => loadMoveNode('root')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-blue-500"><Icons.FolderArrow className="w-3 h-3" /></button>
                              {moveViewData.breadcrumbs.length > 0 && <span className="opacity-30">/</span>}
                              <span className="truncate">{moveViewData.info.name}</span>
                          </div>
                      )}
                  </div>

                  {/* --- Body: Content Switcher --- */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-gray-50/50 dark:bg-transparent">
                      
                      {/* A. 笔记选择模式 (原有逻辑) */}
                      {refMode === 'note' ? (
                          <div className="space-y-1">
                              {/* 上一级 */}
                              {moveViewData.info.id !== 'root' && (
                                  <div onClick={() => loadMoveNode(moveViewData.info.parent_id || 'root')} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/5 transition-all opacity-70 hover:opacity-100">
                                      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center"><Icons.ArrowUp className="w-4 h-4"/></div>
                                      <span className="font-bold text-sm">.. Up Level</span>
                                  </div>
                              )}
                              {/* 文件夹 */}
                              {moveViewData.items.filter(i => i.type === 'folder').map(folder => (
                                  <div key={folder.id} onClick={() => loadMoveNode(folder.id)} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/5 transition-all">
                                      <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 flex items-center justify-center"><Icons.FolderArrow className="w-4 h-4"/></div>
                                      <span className="font-bold text-sm flex-1 truncate">{folder.name}</span>
                                      <Icons.ArrowDown className="w-3 h-3 -rotate-90 opacity-30"/>
                                  </div>
                              ))}
                              {/* 文件 */}
                              {moveViewData.items.filter(i => i.type === 'file').map(file => (
                                  <div key={file.id} onClick={() => handleInsertRef(file)} className="group flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30 transition-all">
                                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                          <Icons.SortAlpha className="w-4 h-4"/>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{file.name}</div>
                                          <div className="text-[10px] text-gray-400">{file.date}</div>
                                      </div>
                                      <button className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                          Link
                                      </button>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          
                      /* B. 错题选择模式 (新逻辑) */
                      <div className="space-y-4 p-2">
                          {/* 按科目简单分组渲染 */}
                          {['Physics', 'Mathematics', 'English', 'Other'].map(subject => {
                              const subItems = mistakesList.filter(m => {
                                  const mistSub = (m.subject || 'Other').toLowerCase();
                                  const filterSub = subject.toLowerCase();
                                  return mistSub === filterSub;
                              });
                              if (subItems.length === 0) return null;
                              
                              return (
                                  <div key={subject}>
                                      <div className="text-[10px] font-bold uppercase text-gray-400 mb-2 ml-2 tracking-wider sticky top-0 bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur py-1 z-10">{subject}</div>
                                      <div className="space-y-2">
                                          {subItems.map(m => (
                                              <div 
                                                  key={m.id} 
                                                  onClick={() => handleInsertRef(m)}
                                                  className="group relative p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-purple-400 dark:hover:border-purple-500/50 cursor-pointer transition-all hover:shadow-lg"
                                              >
                                                  <div className="flex justify-between items-start mb-1">
                                                      <span className="text-[10px] font-mono text-purple-500 bg-purple-50 dark:bg-purple-500/10 px-1.5 py-0.5 rounded">#{m.id}</span>
                                                      <div className="flex gap-1">
                                                          {m.diagnosis_tags?.slice(0,2).map(tag => (
                                                              <span key={tag} className="text-[9px] bg-gray-100 dark:bg-white/10 text-gray-500 px-1.5 rounded">{tag}</span>
                                                          ))}
                                                      </div>
                                                  </div>
                                                  <div className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed">
                                                      {m.stem_snapshot || m.wrong_step_stem || "No content preview"}
                                                  </div>
                                                  
                                                  {/* Hover Action */}
                                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <button className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-xl hover:scale-105 active:scale-95 transition-transform">
                                                          Import
                                                      </button>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              );
                          })}
                          
                          {mistakesList.length === 0 && (
                              <div className="py-20 text-center opacity-50">
                                  <div className="text-4xl mb-2">📭</div>
                                  <p className="font-bold">No mistakes found</p>
                              </div>
                          )}
                      </div>
                      )}
                  </div>
              </div>
          </motion.div>
      )}

    </div>
  );
};

export default NotesPage;