import { useState, useRef, useEffect } from "react";

// 预设颜色（用于标签背景）
const TAG_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400",
  "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400",
  "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400",
];

// 标签输入组件属性接口
export interface TagInputProps {
  tags?: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  autoMode?: boolean;
}

// 根据标签名称生成固定的颜色索引
const getTagColor = (tag: string): string => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

const TagInput = ({ tags = [], onChange, placeholder = "添加标签...", autoMode = true }: TagInputProps) => {
  const [inputValue, setInputValue] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowDropdown(true);
  };

  // 添加标签
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
    }
    setInputValue("");
    setShowDropdown(false);
  };

  // 删除标签
  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      // 删除最后一个标签
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      {/* 标签容器 */}
      <div
        className="flex flex-wrap gap-2 p-3 bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl min-h-[50px] focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* 已添加的标签 */}
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105 ${getTagColor(
              tag
            )}`}
          >
            {tag}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="ml-1 hover:opacity-70 transition-opacity"
            >
              ✕
            </button>
          </span>
        ))}

        {/* 输入框 */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400"
        />
      </div>

      {/* 常用标签提示 */}
      {showDropdown && inputValue && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl max-h-[200px] overflow-y-auto"
        >
          {TAG_COLORS.slice(0, 5).map((_, i) => {
            const suggestions = [
              "重要", "待处理", "已完成",
              "数学", "物理", "化学", "生物",
              "概念", "公式", "例题"
            ];
            const filteredSuggestions = suggestions.filter(
              s => !tags.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
            );

            return filteredSuggestions.length === 0 ? (
              <div className="p-3 text-sm text-gray-400 text-center">
                按 Enter 添加 "{inputValue}"
              </div>
            ) : (
              filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => addTag(suggestion)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <span className={`w-2 h-2 rounded-full ${getTagColor(suggestion).split(" ")[0]}`} />
                  <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                </button>
              ))
            );
          })}
        </div>
      )}

      {/* 提示文本 */}
      {tags.length === 0 && !inputValue && (
        <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
          <span>💡</span>
          {autoMode ? (
            <span>自动标签已启用，将根据内容智能生成（可手动补充）</span>
          ) : (
            <span>按 Enter 或逗号添加标签</span>
          )}
        </div>
      )}

      {/* 自动标签指示器 */}
      {autoMode && tags.length > 0 && (
        <div className="mt-1.5 text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1.5 opacity-70">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          <span>自动生成 + 手动标签</span>
        </div>
      )}
    </div>
  );
};

export default TagInput;
