
import { useState, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown, { Components } from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import SmartLink from './SmartLink';
import TagInput from './TagInput';
import ImageEditor from './ImageEditor';
import 'katex/dist/katex.min.css';

// ==================== Type Definitions ====================

export interface NoteInfo {
  id?: string;
  name?: string;
  type?: 'file' | 'folder';
  tags?: string[];
}

export interface LinkCacheData {
  title?: string;
  content?: string;
  [key: string]: unknown;
}

export interface NoteEditorProps {
  info: NoteInfo;
  content: string;
  setContent: (content: string) => void;
  onSave: (title: string, content: string, tags: string[]) => void;
  onLoadNode?: (nodeId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onInsertLink: () => void;
  viewMode: 'edit' | 'read' | 'split';
  setViewMode: (mode: 'edit' | 'read' | 'split') => void;
  autoTag?: boolean;
  aiOpen?: boolean;
}

interface PreviewSectionProps {
  content: string;
  fontSize: number;
  fontFamily: string;
  renderers: Components;
  processContent: (text: string) => string;
}

interface CachedSmartLinkProps {
  type: 'note';
  id: string;
  originalText: React.ReactNode;
  linkCache: Record<string, LinkCacheData>;
  setLinkCache: React.Dispatch<React.SetStateAction<Record<string, LinkCacheData>>>;
}

// ✅ 带缓存的 SmartLink，避免重复加载时闪烁
const CachedSmartLink = memo<CachedSmartLinkProps>(({ type, id, originalText, linkCache, setLinkCache }) => {
  const cacheKey = `${type}-${id}`;
  const cachedData = linkCache[cacheKey];

  // 更新缓存的函数
  const updateCache = (data: LinkCacheData) => {
    setLinkCache(prev => ({ ...prev, [cacheKey]: data }));
  };

  return <SmartLink type={type} id={id} originalText={originalText} cachedData={cachedData} onCacheUpdate={updateCache} />;
}, (prevProps, nextProps) => {
  return prevProps.type === nextProps.type && prevProps.id === nextProps.id;
});

// --- SVG 图标 (保持不变) ---
interface IconProps {
  className?: string;
}

// SVG 元素的类型扩展
interface SVGProps extends IconProps {
  width?: string | number;
  height?: string | number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  viewBox?: string;
  xmlns?: string;
}

const Icons = {
  Pen: ({className}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" /></svg>,
  Split: ({className}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm10.5 1.5v10.5h4.5a1.5 1.5 0 001.5-1.5V7.5a1.5 1.5 0 00-1.5-1.5h-4.5zm-1.5 0H6a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5h6V7.5z" clipRule="evenodd" /></svg>,
  Eye: ({className}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12 3.75s9.189 3.226 10.677 7.697a.75.75 0 010 .506C21.189 16.424 16.972 19.65 12 19.65s-9.189-3.226-10.677-7.697a.75.75 0 010-.506zM12 17.25a5.25 5.25 0 100-10.5 5.25 5.25 0 000 10.5z" clipRule="evenodd" /></svg>,
  Save: ({className}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M4.5 3a1.5 1.5 0 00-1.5 1.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5V7.121a1.5 1.5 0 00-.44-1.06L17.44 3.44A1.5 1.5 0 0016.38 3H4.5zM15 4.5v4.5a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75V4.5h6zm-9 15v-6.75a.75.75 0 01.75-.75h10.5a.75.75 0 01.75.75v6.75H6z" clipRule="evenodd" /></svg>,
  FolderBig: ({className}: IconProps) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" /></svg>,
  Bold: () => <span className="font-bold text-lg font-serif">B</span>,
  Italic: () => <span className="italic text-lg font-serif">I</span>,
  H1: () => <span className="font-black text-xs">H1</span>,
  Math: () => <span className="font-mono text-xs">$$</span>,
  Link: ({className}: IconProps) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>,
  Image: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>,
};

// ✅ 新增：将预览区提取为独立组件，并使用 memo 包裹
// 只有当 content, fontSize, fontFamily 发生变化时，这里才会重新渲染
// 点击光标、父组件刷新等操作，统统会被拦截在外！
const PreviewSection = memo<PreviewSectionProps>(({ content, fontSize, fontFamily, renderers, processContent }) => {
    return (
        <div className="w-full h-full overflow-y-auto scroll-smooth custom-scrollbar">
            <div className="px-4 py-4">
                <div
                    className="w-full min-w-[300px] prose prose-slate dark:prose-invert"
                    style={{
                        fontSize: `${fontSize}px`,
                        fontFamily: fontFamily
                    }}
                >
                    <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                        components={renderers}
                        urlTransform={(value: string) => value}
                    >
                        {processContent(content)}
                    </ReactMarkdown>
                    {/* ✅ 修复：移除 50vh 空白占位，让内容自然决定滚动 */}
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // 自定义对比函数：只有内容或样式真变了才渲染
    return prevProps.content === nextProps.content &&
           prevProps.fontSize === nextProps.fontSize &&
           prevProps.fontFamily === nextProps.fontFamily;
}); 

const NoteEditor = ({
  info,
  content,
  setContent,
  onSave,
  onLoadNode,
  onDeleteNote,    // ✅ 新增：删除笔记回调
  onInsertLink,     // ✅ 直接调用，不在组件内实现
  viewMode,
  setViewMode,
  autoTag = true,    // ✨ 新增：自动标签设置
  aiOpen = false
}: NoteEditorProps) => {
  // ✅ 获取编辑器配置和Toast
  const { editorSettings } = useTheme();
  const toast = useToast();
  const [title, setTitle] = useState(info?.name || "");
  const [tags, setTags] = useState<string[]>(info?.tags || []); // ✨ 新增：标签状态
  const [imageEditorOpen, setImageEditorOpen] = useState(false); // ✨ 新增：图片编辑器状态
  const [linkCache, setLinkCache] = useState<Record<string, LinkCacheData>>({}); // ✅ 新增：链接数据缓存，避免闪烁

  // ✅ 新增：右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // ✅ 快捷键支持
  useKeyboardShortcuts({
    'ctrl+s': (e) => {
      e.preventDefault();
      handleSaveWithFeedback();
    },
    'ctrl+b': () => insertText('**', '**'),
    'ctrl+i': () => insertText('*', '*'),
    'ctrl+shift+x': () => setViewMode(viewMode === 'split' ? 'edit' : 'split'),
  });

  // ✨ 新增：粘贴事件监听（支持图片粘贴）
  useEffect(() => {
    const textarea = document.getElementById("note-textarea");
    if (!textarea) return;

    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // 检查是否有图片
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          e.preventDefault();

          const file = items[i].getAsFile();
          if (!file) continue;

          try {
            toast.info("正在上传图片...", 2000);

            // 创建 FormData
            const formData = new FormData();
            formData.append("file", file);

            // 上传图片
            const response = await fetch(`${window.__VIBELIFE_API_ORIGIN__}/api/notes/upload-image`, {
              method: "POST",
              body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();

            // 在光标位置插入 Markdown 图片语法
            const textarea = e.target;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;

            const imageMarkdown = `![Image](${data.url})`;
            const newText = text.substring(0, start) + imageMarkdown + text.substring(end);

            setContent(newText);

            // 设置新的光标位置
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
            }, 0);

            toast.success("✅ 图片上传成功！", 2000);
          } catch (error) {
            console.error("Image upload failed:", error);
            toast.error("❌ 图片上传失败", 2000);
          }

          return; // 只处理第一个图片
        }
      }
    };

    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, []); // 空依赖，只运行一次 

  useEffect(() => {
      setTitle(info?.name || "");
      setTags(info?.tags || []); // ✨ 新增：同步标签状态
  }, [info?.name, info?.tags]);

  // 映射字体
  const getFontFamily = () => {
      switch(editorSettings.fontFamily) {
          case 'Mono': return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          case 'Serif': return 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
          default: return 'ui-sans-serif, system-ui, sans-serif';
      }
  };

  const handleSave = () => {
    onSave(title, content, tags); // ✨ 新增：传递标签
  };

  const handleSaveWithFeedback = () => {
    handleSave();
    toast.success(`已保存: ${title || '笔记'}`, 2000);
  };

  // ✅ 新增：处理右键菜单
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 只在编辑或预览区域才显示右键菜单
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  };

  // ✅ 新增：关闭右键菜单
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // ✅ 新增：删除笔记
  const handleDeleteNote = async () => {
    if (!info?.id) return;

    if (confirm(`确定要删除笔记 "${title || '未命名'}" 吗？此操作无法撤销。`)) {
      try {
        await axios.post(`${window.__VIBELIFE_API_ORIGIN__}/api/notes/delete`, { id: info.id });
        toast.success("✅ 笔记已删除", 2000);
        setContextMenu(null);

        // 调用父组件的回调，刷新文件列表并关闭编辑器
        if (onDeleteNote) {
          onDeleteNote(info.id);
        }
      } catch (error) {
        console.error("删除笔记失败:", error);
        toast.error("❌ 删除失败，请重试", 2000);
      }
    }
  };

  const insertText = (prefix: string, suffix = "") => {
    const textarea = document.getElementById("note-textarea") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value || "";
    const newText = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
    setContent(newText);
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + prefix.length, end + prefix.length); }, 0);
  };

  // ✨ 新增：处理图片选择
  const handleImageSelected = (imageData: any) => {
    const textarea = document.getElementById("note-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value || "";

    // 插入 Markdown 图片语法
    const imageMarkdown = `\n![Image](${imageData.url})\n`;
    const newText = text.substring(0, start) + imageMarkdown + text.substring(end);

    setContent(newText);

    // 设置新的光标位置
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + imageMarkdown.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);

    toast.success("✅ 图片已插入！", 2000);
  };

  const processContent = (text: string): string => {
    if (!text) return "";
    let processed = text;
    processed = processed.replace(/\[\[note:(\w+)\]\]/g, "[Note Link](internal:$1)");
    return processed;
  };

  const renderers = useMemo<Components>(() => ({
    // a 标签渲染器：拦截 internal: 协议，渲染为 SmartLink
    a: ({ href, children }: any) => {

      // Case A: 笔记链接 [[note:xxx]]
      if (href && href.startsWith("internal:")) {
        const id = href.replace("internal:", "");
        // ✅ 使用带缓存的 SmartLink，避免闪烁
        return <CachedSmartLink type="note" id={id} originalText={children} linkCache={linkCache} setLinkCache={setLinkCache} />;
      }

      // Case C: 普通超链接
      return <a href={href} className="text-blue-500 underline decoration-blue-500/30 hover:decoration-blue-500" target="_blank" rel="noreferrer">{children}</a>;
    },
    // ✨ 美化表格渲染（紧凑版）
    table: ({children}: any) => (
      <div className="my-4 overflow-x-auto rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden rounded-lg">
          {children}
        </table>
      </div>
    ),
    thead: ({children}: any) => (
      <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
        {children}
      </thead>
    ),
    tbody: ({children}: any) => <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>,
    tr: ({children}: any) => (
      <tr className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors duration-150">
        {children}
      </tr>
    ),
    th: ({children}: any) => (
      <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({children}: any) => (
      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">
        {children}
      </td>
    ),
  }), [linkCache, onLoadNode]);

  // 空状态：3D毛玻璃效果
  if (info.type === 'folder') {
    return (
      <div className="flex-1 h-full flex items-center justify-center p-10">
        <div className="relative group cursor-default">
           <div className="relative w-64 h-48 rounded-3xl bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center transform transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-1">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <Icons.FolderBig className="w-16 h-16 text-blue-500/50 dark:text-blue-400/50 mb-4 drop-shadow-lg" />
              <p className="text-lg font-bold text-gray-500 dark:text-gray-300">选择笔记开始编辑</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Ready to write</p>
           </div>
           <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-40 h-4 bg-black/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
        initial={false}
        animate={{
            // ✅ 核心修改：动态百分比逻辑
            // 1. split (双栏): 100% 占满父容器
            // 2. edit/read (单栏):
            //    - AI 开启时: 父容器被挤窄了，所以我们用 '95%' 几乎占满它，视觉上就没怎么变瘦。
            //    - AI 关闭时: 父容器很宽，我们用 '70%' 留出舒适的边距。
            width: viewMode === 'split'
                ? '100%'
                : (aiOpen ? '95%' : '70%')
        }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="h-full flex flex-col overflow-hidden relative
                   bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-2xl
                   border border-white/40 dark:border-white/10
                   rounded-3xl shadow-xl transition-colors duration-300"
        onClick={handleCloseContextMenu} // ✅ 点击关闭右键菜单
    >
      
      {/* 1. 工具栏 (保持不变) */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200/50 dark:border-white/10 bg-white/30 dark:bg-white/5 shrink-0 z-20">
        <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-lg gap-1">
            <button onClick={() => setViewMode('read')} className={`p-1.5 rounded-md transition-all ${viewMode === 'read' ? 'bg-white dark:bg-slate-600 shadow text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Read"><Icons.Eye className="w-4 h-4"/></button>
            <button onClick={() => setViewMode('split')} className={`p-1.5 rounded-md transition-all ${viewMode === 'split' ? 'bg-white dark:bg-slate-600 shadow text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Split"><Icons.Split className="w-4 h-4"/></button>
            <button onClick={() => setViewMode('edit')} className={`p-1.5 rounded-md transition-all ${viewMode === 'edit' ? 'bg-white dark:bg-slate-600 shadow text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Edit"><Icons.Pen className="w-4 h-4"/></button>
        </div>
        
        {/* 中间工具栏保持不变 */}
        <div className={`flex items-center gap-1 mx-4 overflow-x-auto no-scrollbar transition-opacity duration-200 ${viewMode === 'read' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
             <button onClick={() => insertText('**', '**')} className="p-1.5 rounded hover:bg-white/50 dark:hover:bg-white/10 text-gray-500 min-w-[2rem]"><Icons.Bold /></button>
            <button onClick={() => insertText('*', '*')} className="p-1.5 rounded hover:bg-white/50 dark:hover:bg-white/10 text-gray-500 min-w-[2rem]"><Icons.Italic /></button>
            <button onClick={() => insertText('# ')} className="p-1.5 rounded hover:bg-white/50 dark:hover:bg-white/10 text-gray-500 min-w-[2rem]"><Icons.H1 /></button>
             <button onClick={() => insertText('$$', '$$')} className="p-1.5 rounded hover:bg-white/50 dark:hover:bg-white/10 text-gray-500 min-w-[2rem]"><Icons.Math /></button>
             <button onClick={() => setImageEditorOpen(true)} className="p-1.5 rounded hover:bg-white/50 dark:hover:bg-white/10 text-gray-500"><Icons.Image /></button>
             <div className="w-px h-4 bg-gray-300 dark:bg-white/10 mx-2"></div>

             {/* ✅ 修改：不再弹 prompt，直接调用父组件传入的回调，打开选择器 */}
             <button onClick={onInsertLink} className="px-2 py-1 bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white rounded text-xs font-bold transition-all flex items-center gap-1"><Icons.Link className="w-3 h-3" /> Note</button>
         </div>

        <button onClick={handleSave} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2">
            <Icons.Save className="w-3 h-3" /> Save
        </button>
      </div>

      {/* 2. 标题区域 */}
      <div className="px-8 pt-8 pb-2 shrink-0 z-10 w-full overflow-hidden">
         {/* 因为外框已经变窄了，这里直接 w-full 即可，不需要 max-w-3xl 再次限制 */}
         <div className="w-full">
             <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent font-black text-4xl outline-none text-slate-800 dark:text-slate-100 border-none p-0 placeholder-gray-300 dark:placeholder-gray-700 truncate"
                placeholder="Untitled Note"
             />
             <div className="h-px w-full bg-gray-200 dark:bg-white/5 mt-4"></div>

              {/* ✨ 新增：标签输入区域 */}
               {info.type !== undefined && (
                <div className="mt-4">
                  <TagInput
                    tags={tags}
                    onChange={setTags}
                    placeholder="添加标签（如：数学、重要、待复习）..."
                    autoMode={autoTag}
                  />
                </div>
              )}
         </div>
      </div>

      {/* 3. 编辑/预览 分栏区域 */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* --- 左侧：编辑区 --- */}
        <motion.div
            initial={false}
            animate={{
                // ✅ 核心修改 2：内部宽度逻辑配合外框
                // split: 占 50%
                // edit: 占 100% (撑满那个变窄了的外框)
                // read: 占 0% (隐藏)
                width: viewMode === 'read' ? '0%' : (viewMode === 'split' ? '50%' : '100%'),
                opacity: viewMode === 'read' ? 0 : 1
            }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="h-full flex flex-col border-r border-gray-200/50 dark:border-white/5 bg-white/60 dark:bg-[#1e293b]/60 overflow-hidden"
        >
            {/* ✅ 修复：使用 flex-1 让 textarea 自动填充可用空间 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="h-full px-4 py-4" onContextMenu={handleContextMenu}>
                    <div className="w-full min-w-[300px] h-full">
                        <textarea
                            id="note-textarea"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-full bg-transparent outline-none resize-none leading-loose placeholder-gray-400/50 text-gray-800 dark:text-gray-200 border-none focus:ring-0 p-0 block"
                            placeholder="# Start writing..."
                            style={{
                                fontSize: `${editorSettings.fontSize}px`,
                                fontFamily: getFontFamily(),
                                lineHeight: '1.6'
                            }}
                        />
                    </div>
                </div>
            </div>
        </motion.div> 

        {/* --- 右侧：预览区 --- */}
        <motion.div
            initial={false}
            animate={{
                // split: 50%, edit: 0%, read: 100%
                width: viewMode === 'edit' ? '0%' : (viewMode === 'split' ? '50%' : '100%'),
                opacity: viewMode === 'edit' ? 0 : 1
            }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="h-full flex flex-col bg-gray-50/30 dark:bg-[#0c0c0c]/20 overflow-hidden"
        >
            {/* ✅ 实时更新预览，无延迟 */}
            <div className="flex-1 overflow-hidden" onContextMenu={handleContextMenu}>
                <PreviewSection
                    content={content}
                    fontSize={editorSettings.fontSize}
                    fontFamily={getFontFamily()}
                    renderers={renderers}
                    processContent={processContent}
                />
            </div>
        </motion.div>

      </div>

      {/* ✨ 新增：图片编辑器模态框 */}
      {imageEditorOpen && (
        <ImageEditor
          onImageSelected={handleImageSelected}
          onClose={() => setImageEditorOpen(false)}
        />
      )}

      {/* ✅ 新增：右键菜单 */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[9999] bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-2xl py-2 min-w-48"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 150)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 菜单标题 */}
            <div className="px-4 py-2 text-[10px] font-bold uppercase opacity-40 border-b border-gray-200 dark:border-white/10 mb-1">
              笔记操作
            </div>

            {/* 删除按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNote();
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除笔记
            </button>

            {/* 取消按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseContextMenu();
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
            >
              取消
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NoteEditor;
