import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

interface SearchResult {
  id: string;
  type: string;
  name: string;
  tags?: string[];
  context?: string;
  date?: string;
  score?: number;
}

interface NoteSearchProps {
  onLoadNote: (noteId: string) => void;
}

const Icons = {
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  Times: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  File: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM12.75 12a.75.75 0 100-1.5.75.75 0 000 1.5z" /></svg>,
};

const NoteSearch = ({ onLoadNote }: NoteSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query);
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/notes/search?query=${encodeURIComponent(searchQuery)}`);
      setResults(res.data.results || []);
      setShowResults(true);
    } catch (e) {
      console.error("Search failed:", e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 高亮匹配文本
  const highlightMatch = (text: string, query: string) => {
    if (!text || !query) return text;

    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return <mark key={index} className="bg-yellow-200 dark:bg-yellow-500/30 text-yellow-800 dark:text-yellow-200 rounded px-0.5">{part}</mark>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K 聚焦搜索框
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape 关闭搜索
      if (e.key === "Escape") {
        setShowResults(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative" ref={searchRef}>
      {/* 搜索输入框 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setShowResults(true);
            }
          }}
          placeholder="搜索笔记... (Ctrl+K)"
          className="w-full pl-9 pr-8 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icons.Search />
        </div>
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Icons.Times />
          </button>
        )}
      </div>

      {/* 搜索结果下拉框 */}
      <AnimatePresence>
        {showResults && (query.length >= 2 || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl max-h-[400px] overflow-hidden"
          >
            {isLoading ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                搜索中...
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-gray-400 dark:text-gray-600 text-sm">
                <Icons.Search />
                <div className="mt-2">未找到相关笔记</div>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {/* 结果统计 */}
                <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  找到 {results.length} 条结果
                </div>

                {/* 结果列表 */}
                <div className="py-2">
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        onLoadNote && onLoadNote(result.id);
                        setShowResults(false);
                        setQuery("");
                      }}
                      className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      {/* 标题 */}
                      <div className="flex items-start gap-2 mb-1">
                        <Icons.File />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {highlightMatch(result.name, query)}
                          </div>

                          {/* 标签 */}
                          {result.tags && result.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {result.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded">
                                  {tag}
                                </span>
                              ))}
                              {result.tags.length > 3 && (
                                <span className="text-[10px] text-gray-400">+{result.tags.length - 3}</span>
                              )}
                            </div>
                          )}

                          {/* 上下文预览 */}
                          {result.context && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                              {highlightMatch(result.context, query)}
                            </div>
                          )}

                          {/* 元数据 */}
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-gray-400">
                            <span>{result.date}</span>
                            {(result.score ?? 0) > 50 && (
                              <span className="text-blue-500">🔥 高相关</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NoteSearch;
