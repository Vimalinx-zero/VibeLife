import React from "react";

const HotkeysHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/10">
          <h2 className="text-2xl font-bold dark:text-white">⌨️ 快捷键指南</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 dark:text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-6">

          {/* 页面导航 */}
          <section>
            <h3 className="text-lg font-bold mb-3 text-blue-600 dark:text-blue-400">🧭 页面导航</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries({
                'Alt + 1': '🏠 仪表板',
                'Alt + 2': '✏️ 智能刷题',
                'Alt + 3': '🐛 错题本',
                'Alt + 4': '📝 笔记',
                'Alt + 5': '🧠 记忆卡',
                'Alt + 6': '⏱️ 学习工作台',
              }).map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                  <span className="dark:text-gray-300">{desc}</span>
                  <kbd className="px-2 py-1 text-sm font-mono bg-white dark:bg-slate-700 border dark:border-white/10 rounded shadow-sm dark:text-gray-300">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </section>

          {/* 刷题页面 */}
          <section>
            <h3 className="text-lg font-bold mb-3 text-green-600 dark:text-green-400">✏️ 刷题页面</h3>
            <div className="space-y-2">
              {[
                { keys: ['Space'], desc: '显示答案/下一题' },
                { keys: ['1', '2', '3', '4'], desc: '选择选项 A/B/C/D' },
                { keys: ['Enter'], desc: '提交答案' },
                { keys: ['Ctrl + F'], desc: '收藏/取消收藏' },
                { keys: ['Ctrl + R'], desc: '刷新题目' },
              ].map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                  <span className="dark:text-gray-300">{desc}</span>
                  <div className="flex gap-1">
                    {keys.map((key) => (
                      <kbd key={key} className="px-2 py-1 text-sm font-mono bg-white dark:bg-slate-700 border dark:border-white/10 rounded shadow-sm dark:text-gray-300">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 笔记页面 */}
          <section>
            <h3 className="text-lg font-bold mb-3 text-yellow-600 dark:text-yellow-400">📝 笔记页面</h3>
            <div className="space-y-2">
              {[
                { keys: ['Ctrl + N'], desc: '新建笔记' },
                { keys: ['Ctrl + S'], desc: '保存笔记' },
                { keys: ['Ctrl + B'], desc: '加粗选中文本' },
                { keys: ['Ctrl + I'], desc: '斜体选中文本' },
                { keys: ['Ctrl + Shift + C'], desc: '插入代码块' },
                { keys: ['Ctrl + Shift + L'], desc: '插入链接' },
              ].map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                  <span className="dark:text-gray-300">{desc}</span>
                  <kbd className="px-2 py-1 text-sm font-mono bg-white dark:bg-slate-700 border dark:border-white/10 rounded shadow-sm dark:text-gray-300">
                    {keys[0]}
                  </kbd>
                </div>
              ))}
            </div>
          </section>

          {/* 记忆卡复习 */}
          <section>
            <h3 className="text-lg font-bold mb-3 text-purple-600 dark:text-purple-400">🧠 记忆卡复习</h3>
            <div className="space-y-2">
              {[
                { keys: ['Space'], desc: '翻卡' },
                { keys: ['1'], desc: '评分：忘记了' },
                { keys: ['2'], desc: '评分：有印象' },
                { keys: ['3'], desc: '评分：记得' },
                { keys: ['4'], desc: '评分：轻松' },
                { keys: ['Enter'], desc: '提交评分' },
              ].map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                  <span className="dark:text-gray-300">{desc}</span>
                  <kbd className="px-2 py-1 text-sm font-mono bg-white dark:bg-slate-700 border dark:border-white/10 rounded shadow-sm dark:text-gray-300">
                    {keys[0]}
                  </kbd>
                </div>
              ))}
            </div>
          </section>

          {/* 通用功能 */}
          <section>
            <h3 className="text-lg font-bold mb-3 text-gray-600 dark:text-gray-400">⚙️ 通用功能</h3>
            <div className="space-y-2">
              {[
                { keys: ['Escape'], desc: '返回上一页 / 关闭弹窗' },
                { keys: ['Ctrl + K'], desc: '快速搜索（开发中）' },
                { keys: ['Ctrl + D'], desc: '切换深色/浅色模式' },
                { keys: ['Ctrl + /'], desc: '显示此帮助' },
              ].map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                  <span className="dark:text-gray-300">{desc}</span>
                  <kbd className="px-2 py-1 text-sm font-mono bg-white dark:bg-slate-700 border dark:border-white/10 rounded shadow-sm dark:text-gray-300">
                    {keys[0]}
                  </kbd>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t dark:border-white/10 bg-gray-50 dark:bg-white/5">
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">
            💡 提示：Mac 用户请使用 <kbd className="px-1.5 py-0.5 text-xs bg-white dark:bg-slate-700 border dark:border-white/10 rounded dark:text-gray-300">Cmd</kbd> 键代替 <kbd className="px-1.5 py-0.5 text-xs bg-white dark:bg-slate-700 border dark:border-white/10 rounded dark:text-gray-300">Ctrl</kbd>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HotkeysHelp;
