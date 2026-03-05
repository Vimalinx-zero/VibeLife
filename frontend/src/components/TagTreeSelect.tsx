import { useState } from "react";

// 标签节点接口
export interface TagNode {
  name: string;
  count?: number;
  children?: TagNode[];
}

// 标签树选择组件属性接口
export interface TagTreeSelectProps {
  tags: TagNode[];
  selectedTags: string[];
  onToggle: (tagName: string) => void;
}

const Icons = {
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.47 5.22a.75.75 0 011.06 0l6 6a.75.75 0 010 1.06l-6 6a.75.75 0 01-1.06-1.06L13.94 12 8.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
};

/**
 * 层级标签选择组件 - 级联选择器风格
 * 类似选择国家-省-市的界面
 */
function TagTreeSelect({ tags, selectedTags, onToggle }: TagTreeSelectProps) {
  const [path, setPath] = useState<TagNode[]>([]); // 当前浏览路径 [{name, children}]

  if (!tags || tags.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-600 py-12">
        <div className="text-4xl mb-2">🏷️</div>
        <div>暂无标签</div>
        <div className="text-sm mt-1">创建卡片时会自动生成标签</div>
      </div>
    );
  }

  // 获取当前层级的标签列表
  const getCurrentLevel = () => {
    if (path.length === 0) {
      return tags;
    }
    let current = tags;
    for (let level of path) {
      const found = current.find(t => t.name === level.name);
      if (found && found.children && found.children.length > 0) {
        current = found.children;
      } else {
        // 到达叶子节点，返回空数组
        return [];
      }
    }
    return current;
  };

  // 点击标签进入下一级
  const handleClick = (tag: TagNode) => {
    if (tag.children && tag.children.length > 0) {
      setPath([...path, { name: tag.name, children: tag.children }]);
    }
  };

  // 点击面包屑导航
  const handleBreadcrumbClick = (index: number) => {
    setPath(path.slice(0, index));
  };

  // 切换选中状态
  const toggleSelect = (e: React.ChangeEvent<HTMLInputElement>, tag: TagNode) => {
    e.stopPropagation();
    onToggle(tag.name);
  };

  const currentLevel = getCurrentLevel();

  return (
    <div className="flex gap-4 h-80">
      {/* 左侧：层级列表 */}
      <div className="flex-1 flex flex-col">
        {/* 面包屑导航 */}
        {path.length > 0 && (
          <div className="flex items-center gap-1 mb-3 px-2 text-sm">
            <button
              onClick={() => setPath([])}
              className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              全部
            </button>
            {path.map((level, index) => (
              <div key={level.name} className="flex items-center gap-1">
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {level.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 当前层级列表 */}
        <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#2a2a2a]">
          {currentLevel.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-600 py-12">
              该分类下暂无标签
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {currentLevel.map((tag) => {
                const isSelected = selectedTags.includes(tag.name);
                const hasChildren = tag.children && tag.children.length > 0;
                const isLeaf = !hasChildren;

                return (
                  <div
                    key={tag.name}
                    onClick={() => !isLeaf && handleClick(tag)}
                    className={`flex items-center justify-between px-4 py-3 transition-all ${
                      isLeaf
                        ? 'hover:bg-gray-50 dark:hover:bg-white/5'
                        : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    } ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* 复选框 */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelect(e, tag)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                      />

                      {/* 标签名称 */}
                      <span className={`flex-1 font-medium ${
                        isSelected
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {tag.name}
                      </span>

                      {/* 卡片数量 */}
                      <span className={`text-sm ${
                        isSelected
                          ? 'text-indigo-500 dark:text-indigo-400'
                          : 'text-gray-400'
                      }`}>
                        {tag.count} 张
                      </span>
                    </div>

                    {/* 右箭头（有子级时显示） */}
                    {hasChildren && (
                      <div className="ml-2 text-gray-400">
                        <Icons.ChevronRight />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：已选标签 */}
      <div className="w-64 flex flex-col">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 px-2">
          已选标签 ({selectedTags.length})
        </div>

        <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#2a2a2a] p-3">
          {selectedTags.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-600 py-8">
              <div className="text-2xl mb-1">📋</div>
              <div className="text-sm">未选择标签</div>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedTags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center justify-between px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg group"
                >
                  <span className="flex-1 text-sm font-medium text-indigo-700 dark:text-indigo-300 truncate">
                    {tag}
                  </span>
                  <button
                    onClick={() => onToggle(tag)}
                    className="ml-2 p-1 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icons.X />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTags.length > 0 && (
          <button
            onClick={() => {
              // 创建副本避免迭代时修改
              [...selectedTags].forEach(tag => onToggle(tag));
            }}
            className="mt-3 w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            清空全部
          </button>
        )}
      </div>
    </div>
  );
}

export default TagTreeSelect;
