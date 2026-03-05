import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

interface LinkedNote {
  id: string;
  name: string;
  date: string;
}

interface MistakeBacklinksPanelProps {
  questionId: string;
  onLoadNote?: (noteId: string) => void;
}

const Icons = {
  Link: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>,
  ArrowRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>,
  ChevronDown: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6.22 8.72a.75.75 0 011.06 0l6.25 6.25a.75.75 0 010 1.06l-6.25 6.25a.75.75 0 01-1.06-1.06L11.69 12 6.22 6.56a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>,
  File: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM12.75 12a.75.75 0 100-1.5.75.75 0 000 1.5z" /></svg>,
};

/**
 * 错题反向链接面板
 * 显示哪些笔记引用了当前错题（通过 [[gk_question_id]] 格式）
 */
const MistakeBacklinksPanel = ({ questionId, onLoadNote }: MistakeBacklinksPanelProps) => {
  const [linkedNotes, setLinkedNotes] = useState<LinkedNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  useEffect(() => {
    if (questionId) {
      loadLinkedNotes();
    }
  }, [questionId]);

  // ✅ 新增：监听笔记保存事件，自动刷新
  useEffect(() => {
    const handleNoteSaved = () => {
      if (questionId) {
        loadLinkedNotes();
      }
    };

    window.addEventListener('noteSaved', handleNoteSaved);
    return () => window.removeEventListener('noteSaved', handleNoteSaved);
  }, [questionId]);

  const loadLinkedNotes = async () => {
    if (!questionId) return;

    setIsLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/mistakes/backlinks?question_id=${questionId}`);
      setLinkedNotes(res.data.linked_notes || []);
    } catch (e) {
      console.error("Failed to load linked notes:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!questionId) {
    return (
      <div className="p-4 text-center text-gray-400 dark:text-gray-600 text-sm">
        <Icons.Link />
        <div className="mt-2">选择错题查看引用</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
          <Icons.Link />
          <span>笔记引用</span>
          {linkedNotes.length > 0 && (
            <span className="px-1.5 py-0.5 bg-purple-500 text-white text-xs rounded-full">
              {linkedNotes.length}
            </span>
          )}
        </div>
        {linkedNotes.length > 0 && (
          <button
            onClick={loadLinkedNotes}
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
      ) : linkedNotes.length === 0 ? (
        <div className="py-8 text-center text-gray-400 dark:text-gray-600 text-sm">
          <div className="text-2xl mb-2">📝</div>
          <div>暂无笔记引用</div>
          <div className="text-xs mt-1 opacity-70">在笔记中使用 [[gk_{questionId}]] 引用</div>
        </div>
      ) : (
        <div>
          <AnimatePresence>
            {showPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-1.5">
                  {linkedNotes.map((note) => (
                    <motion.button
                      key={note.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => onLoadNote && onLoadNote(note.id)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 transition-all text-left group"
                    >
                      <div className="p-1.5 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                        <Icons.File />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {note.name}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {note.date}
                        </div>
                      </div>
                      <Icons.ArrowRight />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default MistakeBacklinksPanel;
