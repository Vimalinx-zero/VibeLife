import { useState, useEffect } from "react";

// 标签设置接口
export interface TagSettingsConfig {
  showTagCloud: boolean;
  autoTag: boolean;
}

// 标签设置组件属性接口
export interface TagSettingsProps {
  settings: TagSettingsConfig;
  onSettingsChange: (settings: TagSettingsConfig) => void;
}

const Icons = {
  Settings: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 111.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 011.04-.207z" clipRule="evenodd" /></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
};

const TagSettings = ({ settings, onSettingsChange }: TagSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* 设置按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        title="标签设置"
      >
        <Icons.Settings />
      </button>

      {/* 设置弹窗 */}
      {isOpen && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 内容 */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 dark:text-white">标签设置</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            <div className="space-y-3">
              {/* 显示标签云开关 */}
              <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800 dark:text-white">
                    显示标签云面板
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    在侧边栏显示所有标签
                  </div>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${settings.showTagCloud ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <input
                    type="checkbox"
                    checked={settings.showTagCloud}
                    onChange={(e) => onSettingsChange({ ...settings, showTagCloud: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transform transition-transform ${settings.showTagCloud ? 'translate-x-5' : ''}`} />
                </div>
              </label>

              {/* 自动打标签开关 */}
              <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800 dark:text-white">
                    自动生成标签
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    从笔记内容智能提取关键词
                  </div>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoTag ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <input
                    type="checkbox"
                    checked={settings.autoTag}
                    onChange={(e) => onSettingsChange({ ...settings, autoTag: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transform transition-transform ${settings.autoTag ? 'translate-x-5' : ''}`} />
                </div>
              </label>
            </div>

            {/* 提示信息 */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/10">
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                <span className="text-blue-500">💡</span>
                <span>
                  手动添加的标签优先级最高，自动生成的标签会合并显示
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TagSettings;
