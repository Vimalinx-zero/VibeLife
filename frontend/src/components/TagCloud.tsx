import { useState } from "react";
import { motion } from "framer-motion";

// 预设颜色（与 TagInput 保持一致）
const TAG_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-300 dark:border-blue-500/30",
  "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-green-300 dark:border-green-500/30",
  "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border-purple-300 dark:border-purple-500/30",
  "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400 border-pink-300 dark:border-pink-500/30",
  "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/30",
  "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-300 dark:border-red-500/30",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400 border-teal-300 dark:border-teal-500/30",
];

// 标签项接口
export interface TagItem {
  name: string;
  count: number;
  id?: string;
}

// 标签云组件属性接口
export interface TagCloudProps {
  tags?: TagItem[];
  selectedTags?: string[];
  onTagClick?: (tagName: string) => void;
  onClear?: () => void;
}

// 根据标签名称生成固定的颜色索引
const getTagColor = (tag: string): string => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

const TagCloud = ({ tags = [], selectedTags = [], onTagClick, onClear }: TagCloudProps) => {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  if (tags.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 dark:text-gray-600">
        <div className="text-4xl mb-2">🏷️</div>
        <div className="text-sm font-semibold">还没有标签</div>
        <div className="text-xs mt-1 opacity-70">创建笔记时添加标签</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
          所有标签 ({tags.length})
        </div>
        {selectedTags.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-blue-500 hover:text-blue-600 font-semibold transition-colors"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* 标签云 */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => {
          const isSelected = selectedTags.includes(tag.name);
          const count = tag.count;
          const sizeClass = count > 5 ? "text-base" : count > 2 ? "text-sm" : "text-xs";

          return (
            <motion.button
              key={tag.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onTagClick && onTagClick(tag.name)}
              onMouseEnter={() => setHoveredTag(tag.name)}
              onMouseLeave={() => setHoveredTag(null)}
              className={`
                relative px-3 py-1.5 rounded-lg border font-semibold transition-all
                ${sizeClass}
                ${isSelected
                  ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30"
                  : `${getTagColor(tag.name)} hover:scale-110 hover:shadow-md`
                }
              `}
            >
              <span className="flex items-center gap-1.5">
                {tag.name}
                <span className={`text-[10px] ${isSelected ? "text-white/70" : "opacity-60"}`}>
                  {count}
                </span>
              </span>

              {/* 悬停效果 */}
              {hoveredTag === tag.name && !isSelected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap"
                >
                  点击筛选
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* 选中的标签提示 */}
      {selectedTags.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30">
          <div className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
            已选择: {selectedTags.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagCloud;
