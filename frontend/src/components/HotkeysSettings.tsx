import { useState, useEffect } from "react";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

// 定义录制状态接口
interface RecordingHotkey {
  category: string;
  key: string;
}

// 默认快捷键配置
const DEFAULT_HOTKEYS = {
  // 全局快捷键
  global: {
    'quickSearch': 'ctrl+k',
    'toggleDarkMode': 'ctrl+d',
    'showHotkeys': 'ctrl+/',
    'goBack': 'escape',
  },
  // 页面导航
  navigation: {
    'dashboard': 'alt+1',
    'quiz': 'alt+2',
    'mistakes': 'alt+3',
    'notes': 'alt+4',
    'anki': 'alt+5',
    'workbench': 'alt+6',
  },
  // 刷题页面
  quiz: {
    'nextQuestion': ' ',
    'selectOptionA': '1',
    'selectOptionB': '2',
    'selectOptionC': '3',
    'selectOptionD': '4',
    'submitAnswer': 'enter',
    'toggleFavorite': 'ctrl+f',
    'skipQuestion': 'ctrl+r',
  },
  // 笔记页面
  notes: {
    'newNote': 'ctrl+n',
    'saveNote': 'ctrl+s',
  },
  // 记忆卡页面
  anki: {
    'flipCard': ' ',
    'rate1': '1',
    'rate2': '2',
    'rate3': '3',
    'rate4': '4',
    'submitRating': 'enter',
  },
};

// 快捷键显示名称
const HOTKEY_NAMES = {
  'quickSearch': '快速搜索',
  'toggleDarkMode': '切换深色模式',
  'showHotkeys': '显示快捷键帮助',
  'goBack': '返回上一页',
  'dashboard': '仪表板',
  'quiz': '智能刷题',
  'mistakes': '错题本',
  'notes': '笔记',
  'anki': '记忆卡',
  'workbench': '学习工作台',
  'nextQuestion': '下一题',
  'selectOptionA': '选择选项 A',
  'selectOptionB': '选择选项 B',
  'selectOptionC': '选择选项 C',
  'selectOptionD': '选择选项 D',
  'submitAnswer': '提交答案',
  'toggleFavorite': '收藏题目',
  'skipQuestion': '跳过题目',
  'newNote': '新建笔记',
  'saveNote': '保存笔记',
  'flipCard': '翻转卡片',
  'rate1': '评分：忘记了',
  'rate2': '评分：有印象',
  'rate3': '评分：记得',
  'rate4': '评分：轻松',
  'submitRating': '提交评分',
};

const HotkeysSettings = () => {
  const [customHotkeys, setCustomHotkeys] = useState<Record<string, string>>({});
  const [recordingHotkey, setRecordingHotkey] = useState<RecordingHotkey | null>(null);
  const [tempHotkey, setTempHotkey] = useState('');

  // 从 localStorage 加载自定义快捷键
  useEffect(() => {
    const saved = localStorage.getItem('customHotkeys');
    if (saved) {
      try {
        setCustomHotkeys(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load custom hotkeys:', e);
      }
    }
  }, []);

  // 保存自定义快捷键
  const saveCustomHotkeys = (newHotkeys) => {
    setCustomHotkeys(newHotkeys);
    localStorage.setItem('customHotkeys', JSON.stringify(newHotkeys));
  };

  // 获取实际的快捷键（自定义或默认）
  const getActualHotkey = (category, key) => {
    const customKey = customHotkeys[`${category}.${key}`];
    return customKey || DEFAULT_HOTKEYS[category][key];
  };

  // 开始录制快捷键
  const startRecording = (category, key) => {
    setRecordingHotkey({ category, key });
    setTempHotkey('');
  };

  // 停止录制
  const stopRecording = () => {
    setRecordingHotkey(null);
    setTempHotkey('');
  };

  // 监听按键事件
  useEffect(() => {
    if (!recordingHotkey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const key = e.key.toLowerCase();
      const modifiers: string[] = [];

      if (e.ctrlKey || e.metaKey) modifiers.push('ctrl');
      if (e.altKey) modifiers.push('alt');
      if (e.shiftKey) modifiers.push('shift');

      // 忽略单独的修饰键
      if (['control', 'alt', 'shift', 'meta'].includes(key)) {
        return;
      }

      const hotkeyString = modifiers.length > 0
        ? `${modifiers.join('+')}+${key}`
        : key;

      setTempHotkey(hotkeyString);

      // 自动保存
      const { category, key: actionKey } = recordingHotkey;
      saveCustomHotkeys({
        ...customHotkeys,
        [`${category}.${actionKey}`]: hotkeyString
      });

      stopRecording();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [recordingHotkey, customHotkeys]);

  // 重置快捷键
  const resetHotkey = (category, key) => {
    const newHotkeys = { ...customHotkeys };
    delete newHotkeys[`${category}.${key}`];
    saveCustomHotkeys(newHotkeys);
  };

  // 重置所有快捷键
  const resetAllHotkeys = () => {
    if (confirm('确定要重置所有快捷键为默认值吗？')) {
      setCustomHotkeys({});
      localStorage.removeItem('customHotkeys');
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部提示 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.751-1.034a.75.75 0 010 1.966h-5.69c-.309 0-.542-.29-.459-.587l1.07-3.745a1.125 1.125 0 012.296 0l1.07 3.745c.083.297-.15.587-.459.587h-.455M12 6a2.25 2.25 0 00-2.25 2.25v.094c0 .534.13.943.233 1.226.167.458.36.815.516 1.103.13.24.242.449.242.683 0 .234-.112.443-.242.683-.156.288-.35.645-.516 1.103-.103.283-.233.692-.233 1.226v.094A2.25 2.25 0 0012 18h.75a2.25 2.25 0 002.25-2.25v-.094c0-.534-.13-.943-.233-1.226-.167-.458-.36-.815-.516-1.103-.13-.24-.242-.449-.242-.683 0-.234.112-.443.242-.683.156-.288.35-.645.516-1.103.103-.283.233-.692.233-1.226V9.75A2.25 2.25 0 0012.75 6H12z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1">自定义快捷键</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              点击快捷键按钮，然后按下你想要设置的组合键。自定义快捷键会自动保存到本地存储。
            </p>
          </div>
        </div>
      </div>

      {/* 全局快捷键 */}
      <section>
        <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
          🌐 全局快捷键
        </h3>
        <div className="space-y-2">
          {Object.entries(DEFAULT_HOTKEYS.global).map(([key, defaultHotkey]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-white/10">
              <span className="text-gray-700 dark:text-gray-300">{HOTKEY_NAMES[key]}</span>
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 text-sm font-mono bg-gray-100 dark:bg-slate-700 border dark:border-white/10 rounded min-w-[80px] text-center dark:text-gray-300">
                  {getActualHotkey('global', key)}
                </kbd>
                <button
                  onClick={() => startRecording('global', key)}
                  className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                >
                  {recordingHotkey?.category === 'global' && recordingHotkey?.key === key
                    ? '请按键...'
                    : '修改'}
                </button>
                {customHotkeys[`global.${key}`] && (
                  <button
                    onClick={() => resetHotkey('global', key)}
                    className="px-3 py-1.5 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    重置
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 页面导航 */}
      <section>
        <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
          🧭 页面导航
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DEFAULT_HOTKEYS.navigation).map(([key, defaultHotkey]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-white/10">
              <span className="text-sm text-gray-700 dark:text-gray-300">{HOTKEY_NAMES[key]}</span>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-slate-700 border dark:border-white/10 rounded min-w-[60px] text-center dark:text-gray-300">
                  {getActualHotkey('navigation', key)}
                </kbd>
                <button
                  onClick={() => startRecording('navigation', key)}
                  className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                >
                  {recordingHotkey?.category === 'navigation' && recordingHotkey?.key === key
                    ? '...'
                    : '修改'}
                </button>
                {customHotkeys[`navigation.${key}`] && (
                  <button
                    onClick={() => resetHotkey('navigation', key)}
                    className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    重置
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 刷题页面 */}
      <section>
        <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
          ✏️ 刷题页面
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DEFAULT_HOTKEYS.quiz).map(([key, defaultHotkey]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-white/10">
              <span className="text-sm text-gray-700 dark:text-gray-300">{HOTKEY_NAMES[key]}</span>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-slate-700 border dark:border-white/10 rounded min-w-[60px] text-center dark:text-gray-300">
                  {getActualHotkey('quiz', key)}
                </kbd>
                <button
                  onClick={() => startRecording('quiz', key)}
                  className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                >
                  {recordingHotkey?.category === 'quiz' && recordingHotkey?.key === key
                    ? '...'
                    : '修改'}
                </button>
                {customHotkeys[`quiz.${key}`] && (
                  <button
                    onClick={() => resetHotkey('quiz', key)}
                    className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    重置
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 笔记和记忆卡 */}
      <div className="grid grid-cols-2 gap-6">
        <section>
          <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
            📝 笔记页面
          </h3>
          <div className="space-y-2">
            {Object.entries(DEFAULT_HOTKEYS.notes).map(([key, defaultHotkey]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-white/10">
                <span className="text-sm text-gray-700 dark:text-gray-300">{HOTKEY_NAMES[key]}</span>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-slate-700 border dark:border-white/10 rounded min-w-[60px] text-center dark:text-gray-300">
                    {getActualHotkey('notes', key)}
                  </kbd>
                  <button
                    onClick={() => startRecording('notes', key)}
                    className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                  >
                    {recordingHotkey?.category === 'notes' && recordingHotkey?.key === key
                      ? '...'
                      : '修改'}
                  </button>
                  {customHotkeys[`notes.${key}`] && (
                    <button
                      onClick={() => resetHotkey('notes', key)}
                      className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                    >
                      重置
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
            🧠 记忆卡页面
          </h3>
          <div className="space-y-2">
            {Object.entries(DEFAULT_HOTKEYS.anki).map(([key, defaultHotkey]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-white/10">
                <span className="text-sm text-gray-700 dark:text-gray-300">{HOTKEY_NAMES[key]}</span>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-slate-700 border dark:border-white/10 rounded min-w-[60px] text-center dark:text-gray-300">
                    {getActualHotkey('anki', key)}
                  </kbd>
                  <button
                    onClick={() => startRecording('anki', key)}
                    className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                  >
                    {recordingHotkey?.category === 'anki' && recordingHotkey?.key === key
                      ? '...'
                      : '修改'}
                  </button>
                  {customHotkeys[`anki.${key}`] && (
                    <button
                      onClick={() => resetHotkey('anki', key)}
                      className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                    >
                      重置
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 底部操作 */}
      <div className="pt-6 border-t dark:border-white/10 flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          💡 提示：修改后需要刷新页面才能生效
        </div>
        <button
          onClick={resetAllHotkeys}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
        >
          重置所有快捷键
        </button>
      </div>

      {/* 录制状态提示 */}
      {recordingHotkey && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="animate-pulse mb-4">
                <div className="w-16 h-16 mx-auto bg-blue-500 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                    <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2 dark:text-white">录制快捷键</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                为 <span className="font-bold text-blue-600 dark:text-blue-400">{HOTKEY_NAMES[recordingHotkey.key]}</span> 设置新的快捷键
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                请按下你想要的组合键（支持 Ctrl、Alt、Shift）
              </p>
              {tempHotkey && (
                <div className="mb-4">
                  <kbd className="px-4 py-2 text-lg font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg">
                    {tempHotkey}
                  </kbd>
                </div>
              )}
              <button
                onClick={stopRecording}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotkeysSettings;
