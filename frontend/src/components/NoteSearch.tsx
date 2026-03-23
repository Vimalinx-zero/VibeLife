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
  tone?: "default" | "quiet-dark";
}

const Icons = {
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  Times: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  File: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM12.75 12a.75.75 0 100-1.5.75.75 0 000 1.5z" /></svg>,
};

const NoteSearch = ({ onLoadNote, tone = "default" }: NoteSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isQuietDark = tone === "quiet-dark";

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
      const res = await axios.get(`${window.__VIBELIFE_API_ORIGIN__}/api/notes/search?query=${encodeURIComponent(searchQuery)}`);
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
  const highlightMatch = (text: string, currentQuery: string) => {
    if (!text || !currentQuery) return text;

    const regex = new RegExp(`(${currentQuery})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === currentQuery.toLowerCase()) {
        return (
          <mark
            key={index}
            className={
              isQuietDark
                ? "rounded bg-[#d8cfb6]/20 px-0.5 text-[#f1ead7]"
                : "rounded bg-yellow-200 px-0.5 text-yellow-800 dark:bg-yellow-500/30 dark:text-yellow-200"
            }
          >
            {part}
          </mark>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        event.target instanceof Node &&
        !searchRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const inputClassName = isQuietDark
    ? "w-full rounded-[18px] border border-white/[0.08] bg-white/[0.04] py-3 pl-10 pr-20 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#d8cfb6]/25 focus:bg-white/[0.06]"
    : "w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:border-white/10 dark:bg-black/20 dark:text-gray-300";
  const panelClassName = isQuietDark
    ? "absolute z-50 mt-3 w-full overflow-hidden rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,22,29,0.98),rgba(12,16,22,0.98))] shadow-[0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
    : "absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-800";
  const resultRowClassName = isQuietDark
    ? "w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
    : "w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5";
  const secondaryTextClassName = isQuietDark
    ? "text-slate-500"
    : "text-gray-400 dark:text-gray-400";
  const mainTextClassName = isQuietDark
    ? "text-slate-100"
    : "text-gray-800 dark:text-gray-200";

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
          className={inputClassName}
        />
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${secondaryTextClassName}`}>
          <Icons.Search />
        </div>
        {isQuietDark ? (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/[0.08] bg-black/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Ctrl+K
          </div>
        ) : null}
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setShowResults(false);
            }}
            className={`absolute top-1/2 -translate-y-1/2 transition-colors hover:text-white ${isQuietDark ? "right-16 text-slate-500" : "right-3 text-gray-400 dark:hover:text-gray-300"}`}
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
            className={panelClassName}
          >
            {isLoading ? (
              <div className={`py-8 text-center text-sm ${secondaryTextClassName}`}>
                <div className={`mx-auto mb-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${isQuietDark ? "border-[#d8cfb6]" : "border-blue-500"}`}></div>
                搜索中...
              </div>
            ) : results.length === 0 ? (
              <div className={`py-8 text-center text-sm ${secondaryTextClassName}`}>
                <Icons.Search />
                <div className="mt-2">未找到相关笔记</div>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {/* 结果统计 */}
                <div
                  className={`border-b px-4 py-2 text-xs font-semibold ${
                    isQuietDark
                      ? "border-white/[0.06] bg-white/[0.03] text-slate-500"
                      : "border-gray-200 bg-gray-50 text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-gray-400"
                  }`}
                >
                  找到 {results.length} 条结果
                </div>

                {/* 结果列表 */}
                <div className="py-2">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        onLoadNote && onLoadNote(result.id);
                        setShowResults(false);
                        setQuery("");
                      }}
                      className={resultRowClassName}
                    >
                      {/* 标题 */}
                      <div className="flex items-start gap-2 mb-1">
                        <Icons.File />
                        <div className="flex-1 min-w-0">
                          <div className={`truncate text-sm font-semibold ${mainTextClassName}`}>
                            {highlightMatch(result.name, query)}
                          </div>

                          {/* 标签 */}
                          {result.tags && result.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {result.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                                    isQuietDark
                                      ? "bg-white/[0.06] text-slate-400"
                                      : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                                  }`}
                                >
                                  {tag}
                                </span>
                              ))}
                              {result.tags.length > 3 && (
                                <span className={`text-[10px] ${secondaryTextClassName}`}>
                                  +{result.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 上下文预览 */}
                          {result.context && (
                            <div className={`mt-2 line-clamp-2 text-xs leading-relaxed ${secondaryTextClassName}`}>
                              {highlightMatch(result.context, query)}
                            </div>
                          )}

                          {/* 元数据 */}
                          <div className={`mt-1.5 flex items-center gap-2 text-[10px] ${secondaryTextClassName}`}>
                            <span>{result.date}</span>
                            {(result.score ?? 0) > 50 && (
                              <span className={isQuietDark ? "text-[#d8cfb6]" : "text-blue-500"}>
                                高相关
                              </span>
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
