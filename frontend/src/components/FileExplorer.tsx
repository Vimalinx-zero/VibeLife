import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { getNotesDisplayName, getNotesExplorerCopy } from "../pages/notesWorkspaceCopyState";

// --- SVG 图标 ---
const Icons = {
  ArrowLeft: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
  Folder: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" /></svg>,
  Plus: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>,
  FileLines: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM12.75 12a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V18a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V12z" clipRule="evenodd" /><path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" /></svg>,
  ChevronRight: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" /></svg>,
  // ✅ 补充一个 Gear 图标 (如果 Icons 里没有的话，加进去)
  Gear: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567l-.091.549a.798.798 0 01-.517.608 7.45 7.45 0 00-.478.198.798.798 0 01-.796-.064l-.453-.324a1.875 1.875 0 00-2.416.2l-.043.044a1.875 1.875 0 00-.205 2.415l.323.452a.798.798 0 01.064.796 7.448 7.448 0 00-.198.478.798.798 0 01-.608.517l-.55.092a1.875 1.875 0 00-1.566 1.849v.06c0 .916.663 1.699 1.567 1.85l.549.091c.281.047.508.25.608.517.06.162.127.321.198.478a.798.798 0 01-.064.796l-.324.453a1.875 1.875 0 00.2 2.416l.044.043a1.875 1.875 0 002.415.205l.452-.323a.798.798 0 01.796-.064c.157.071.316.137.478.198.267.1.47.327.517.608l.092.55c.15.903.932 1.566 1.849 1.566h.06c.916 0 1.699-.663 1.85-1.567l.091-.549a.798.798 0 01.517-.608c.162-.06.321-.127.478-.198a.798.798 0 01.796.064l.453.324a1.875 1.875 0 002.416-.2l.043-.044a1.875 1.875 0 00-2.415-.205l-.452.323a.798.798 0 01-.796.064 7.462 7.462 0 00-.478-.198.798.798 0 01-.608-.517l-.092-.55a1.875 1.875 0 00-1.849-1.566h-.06zM12 15a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>,
};

const FileExplorer = ({
  viewData,
  currentId,
  sortedItems, // ✨ 新增：接收排序后的列表
  onLoadNode,
  onCreateItem,
  onContextMenu,
  onDropItem,
  className = "",
  listClassName = "",
  showSettingsButton = true,
  tone = "default",
}) => {
  const navigate = useNavigate();
  const copy = getNotesExplorerCopy();
  // ✅ 获取 setShowSettings
  const { setShowSettings } = useTheme();

  // 🎬 首次进入动画状态
  const [hasVisitedBefore, setHasVisitedBefore] = useState(true);

  useEffect(() => {
    const visited = localStorage.getItem('notesPageVisited');
    if (!visited) {
      setHasVisitedBefore(false);
      localStorage.setItem('notesPageVisited', 'true');
    }
  }, []);

  const isQuietDark = tone === "quiet-dark";
  const shellClassName = isQuietDark
    ? "bg-[linear-gradient(180deg,rgba(19,24,30,0.84),rgba(12,16,22,0.8))] backdrop-blur-[22px] border border-white/[0.08] shadow-[0_28px_72px_rgba(15,23,42,0.24)]"
    : "bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-xl";
  const headerClassName = isQuietDark
    ? "border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]"
    : "border-b border-gray-200/50 dark:border-white/10 bg-white/30 dark:bg-white/5";
  const footerClassName = isQuietDark
    ? "border-t border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
    : "border-t border-gray-200/50 dark:border-white/10 bg-white/30 dark:bg-white/5";
  const titleClassName = isQuietDark
    ? "text-white"
    : "text-slate-800 dark:text-white";
  const iconTintClassName = isQuietDark
    ? "border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
    : "text-gray-500 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10";
  const listBaseClassName = isQuietDark
    ? "text-slate-200 hover:bg-white/[0.05] hover:shadow-none"
    : "text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 hover:shadow-sm";
  const activeItemClassName = isQuietDark
    ? "bg-[linear-gradient(135deg,rgba(242,239,230,0.18),rgba(242,239,230,0.08))] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
    : "bg-blue-500 text-white shadow-lg shadow-blue-500/30";
  const secondaryTextClassName = isQuietDark
    ? "text-slate-500"
    : "text-gray-400 dark:text-gray-500";

  return (
    <motion.div
      initial={!hasVisitedBefore ? { opacity: 0, x: -60 } : {}}
      animate={!hasVisitedBefore ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={isQuietDark ? undefined : { scale: 1.02 }}
      className={`${className || "w-72"} flex flex-col shrink-0 overflow-hidden rounded-[30px] transition-all duration-300 ${shellClassName}`}>
      
      {/* 顶部 */}
      <div className={`flex h-14 shrink-0 items-center justify-between px-5 ${headerClassName}`}>
        <span className={`flex items-center gap-2 text-[15px] font-semibold tracking-tight ${titleClassName}`}>
           <Icons.Folder className="h-5 w-5 text-[#d8cfb6]" /> 
           <span className="truncate max-w-[140px]">{getNotesDisplayName(viewData.info.name)}</span>
        </span>
        <div className="flex gap-1">
          <button onClick={() => onCreateItem('folder')} className={`rounded-[14px] p-2 transition-colors ${iconTintClassName}`} title={copy.createFolderTitle}>
            <Icons.Folder className="w-4 h-4" />
          </button>
          <button onClick={() => onCreateItem('file')} className={`rounded-[14px] p-2 transition-colors ${iconTintClassName}`} title={copy.createNoteTitle}>
            <Icons.Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 列表区域：右键空白处触发菜单 */}
      <div
        className={`min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1.5 ${listClassName}`}
        onContextMenu={(e) => onContextMenu(e, null)} // ✨ null 表示点击的是空白背景
      >
        {viewData.info.id !== 'root' && viewData.info.parent_id && (
          <div onClick={() => onLoadNode(viewData.info.parent_id)} 
               className={`mb-2 flex cursor-pointer items-center gap-3 rounded-[16px] px-3 py-2 text-sm font-medium opacity-80 ${isQuietDark ? "text-slate-400 hover:bg-white/[0.05]" : "text-gray-500 dark:text-gray-400 hover:bg-white/40 dark:hover:bg-white/10"}`}>
            <Icons.ArrowLeft className="w-4 h-4" /> {copy.upLevelLabel}
          </div>
        )}

        {sortedItems.map((item) => ( // ✨ 使用 sortedItems
          <div 
            key={item.id}
            onClick={() => onLoadNode(item.id)}
            onContextMenu={(e) => onContextMenu(e, item)} // ✨ 传入 item 对象
            className={`
              group flex cursor-pointer select-none items-center gap-3 rounded-[18px] px-3 py-3 transition-all duration-200
              ${currentId === item.id 
                ? activeItemClassName
                : listBaseClassName}
            `}
          >
            <div className={`shrink-0 ${currentId === item.id ? 'text-white' : (item.type === 'folder' ? 'text-yellow-500' : 'text-blue-400')}`}>
              {item.type === 'folder' ? <Icons.Folder className="w-5 h-5" /> : <Icons.FileLines className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium">{item.name}</div>
              <div className={`text-[10px] truncate ${currentId === item.id ? 'text-white/60' : secondaryTextClassName}`}>
                {item.date}
              </div>
            </div>
            {item.type === 'folder' && <Icons.ChevronRight className={`w-3 h-3 opacity-0 group-hover:opacity-50 ${currentId === item.id ? 'text-white' : secondaryTextClassName}`} />}
          </div>
        ))}

        {sortedItems.length === 0 && <div className={`py-10 text-center text-xs font-medium ${secondaryTextClassName}`}>{copy.emptyLabel}</div>}
      </div>

      {/* ✅ 新增：底部工具栏 (Settings) */}
      {showSettingsButton ? (
        <div className={`p-3 shrink-0 ${footerClassName}`}>
            <button 
              onClick={() => setShowSettings(true)} 
              className={`group flex w-full cursor-pointer items-center gap-3 rounded-[18px] px-3 py-3 transition-colors ${isQuietDark ? "text-slate-300 hover:bg-white/[0.05]" : "text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10"}`} 
            >
               <Icons.Gear className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
               <span className="text-sm font-medium">{copy.settingsLabel}</span>
            </button>
        </div>
      ) : null}
    </motion.div>
  );
};

export default FileExplorer;
