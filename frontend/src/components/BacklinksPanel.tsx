import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { apiClient } from "../utils/api"; // ✅ 修复：导入 apiClient 以自动添加 token

interface BacklinkItem {
  id: string;
  name: string;
  date: string;
}

interface BacklinksPanelProps {
  currentNoteId: string;
  onLoadNode?: (nodeId: string) => void;
}

const Icons = {
  Link: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>,
  ArrowRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>,
  ChevronDown: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6.22 8.72a.75.75 0 011.06 0l6.25 6.25a.75.75 0 010 1.06l-6.25 6.25a.75.75 0 01-1.06-1.06L11.69 12 6.22 6.56a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>,
};

const BacklinksPanel = ({ currentNoteId, onLoadNode }: BacklinksPanelProps) => {
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
  const [outgoingLinks, setOutgoingLinks] = useState<BacklinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBacklinks, setShowBacklinks] = useState(true);
  const [showOutgoing, setShowOutgoing] = useState(true);

  useEffect(() => {
    if (currentNoteId) {
      loadLinks();
    }
  }, [currentNoteId]);

  // ✨ 新增：监听笔记保存事件，自动刷新双向链接
  useEffect(() => {
    const handleNoteSaved = () => {
      if (currentNoteId) {
        loadLinks();
      }
    };

    window.addEventListener('noteSaved', handleNoteSaved);
    return () => window.removeEventListener('noteSaved', handleNoteSaved);
  }, [currentNoteId]);

  const loadLinks = async () => {
    if (!currentNoteId || currentNoteId === 'root') return;

    setIsLoading(true);
    try {
      const [backRes, outRes] = await Promise.all([
        apiClient.get(`/notes/backlinks?note_id=${currentNoteId}`),
        apiClient.get(`/notes/links?note_id=${currentNoteId}`)
      ]);

      setBacklinks(backRes.data.backlinks || []);
      setOutgoingLinks(outRes.data.links || []);
    } catch (e) {
      console.error("Failed to load links:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const totalLinks = backlinks.length + outgoingLinks.length;

  if (!currentNoteId || currentNoteId === 'root') {
    return (
      <div className="p-4 text-center text-gray-400 dark:text-gray-600 text-sm">
        <Icons.Link />
        <div className="mt-2">打开笔记查看链接</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
          <Icons.Link />
          <span>双向链接</span>
          {totalLinks > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
              {totalLinks}
            </span>
          )}
        </div>
        {totalLinks > 0 && (
          <button
            onClick={loadLinks}
            className="text-xs text-blue-500 hover:text-blue-600 font-semibold transition-colors"
          >
            刷新
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          加载中...
        </div>
      ) : totalLinks === 0 ? (
        <div className="py-8 text-center text-gray-400 dark:text-gray-600 text-sm">
          <div className="text-2xl mb-2">🔗</div>
          <div>暂无链接</div>
          <div className="text-xs mt-1 opacity-70">使用 [[note:xxx]] 添加链接</div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 反向链接（引用本笔记） */}
          {backlinks.length > 0 && (
            <div>
              <button
                onClick={() => setShowBacklinks(!showBacklinks)}
                className="w-full flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                <span>被引用 ({backlinks.length})</span>
                <motion.div
                  animate={{ rotate: showBacklinks ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icons.ChevronDown />
                </motion.div>
              </button>

              <AnimatePresence>
                {showBacklinks && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1.5">
                      {backlinks.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => onLoadNode && onLoadNode(note.id)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/30 transition-all text-left group"
                        >
                          <Icons.Link />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {note.name}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate">
                              {note.date}
                            </div>
                          </div>
                          <Icons.ArrowRight />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 正向链接（本笔记引用的） */}
          {outgoingLinks.length > 0 && (
            <div>
              <button
                onClick={() => setShowOutgoing(!showOutgoing)}
                className="w-full flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                <span>引用 ({outgoingLinks.length})</span>
                <motion.div
                  animate={{ rotate: showOutgoing ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icons.ChevronDown />
                </motion.div>
              </button>

              <AnimatePresence>
                {showOutgoing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1.5">
                      {outgoingLinks.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => onLoadNode && onLoadNode(note.id)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 transition-all text-left group"
                        >
                          <Icons.Link />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {note.name}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate">
                              {note.date}
                            </div>
                          </div>
                          <Icons.ArrowRight />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BacklinksPanel;
