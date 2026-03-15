import { useEffect, useState } from "react";

type HotkeyCategory = "global" | "navigation" | "notes";

interface RecordingHotkey {
  category: HotkeyCategory;
  key: string;
}

const DEFAULT_HOTKEYS = {
  global: {
    quickSearch: "ctrl+k",
    toggleDarkMode: "ctrl+d",
    showHotkeys: "ctrl+/",
    goBack: "escape",
  },
  navigation: {
    dashboard: "alt+1",
    projects: "alt+2",
    workbench: "alt+3",
    notes: "alt+4",
    capture: "alt+5",
    schedule: "alt+6",
  },
  notes: {
    newNote: "ctrl+n",
    saveNote: "ctrl+s",
  },
} as const;

const HOTKEY_NAMES: Record<string, string> = {
  quickSearch: "快速搜索",
  toggleDarkMode: "切换深色模式",
  showHotkeys: "显示快捷键帮助",
  goBack: "返回主页 / 关闭弹窗",
  dashboard: "主页",
  projects: "项目",
  workbench: "工作台",
  notes: "笔记",
  capture: "采集",
  schedule: "日程",
  newNote: "新建笔记",
  saveNote: "保存笔记",
};

const SECTION_META: Array<{ id: HotkeyCategory; title: string; accent: string }> = [
  { id: "global", title: "全局快捷键", accent: "text-blue-600 dark:text-blue-400" },
  { id: "navigation", title: "页面导航", accent: "text-emerald-600 dark:text-emerald-400" },
  { id: "notes", title: "笔记页面", accent: "text-amber-600 dark:text-amber-400" },
];

const HotkeysSettings = () => {
  const [customHotkeys, setCustomHotkeys] = useState<Record<string, string>>({});
  const [recordingHotkey, setRecordingHotkey] = useState<RecordingHotkey | null>(null);
  const [tempHotkey, setTempHotkey] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("customHotkeys");
    if (!saved) {
      return;
    }

    try {
      setCustomHotkeys(JSON.parse(saved));
    } catch (error) {
      console.error("Failed to load custom hotkeys:", error);
    }
  }, []);

  const saveCustomHotkeys = (nextHotkeys: Record<string, string>) => {
    setCustomHotkeys(nextHotkeys);
    localStorage.setItem("customHotkeys", JSON.stringify(nextHotkeys));
  };

  const getActualHotkey = (category: HotkeyCategory, key: string) => {
    return customHotkeys[`${category}.${key}`] || DEFAULT_HOTKEYS[category][key];
  };

  const startRecording = (category: HotkeyCategory, key: string) => {
    setRecordingHotkey({ category, key });
    setTempHotkey("");
  };

  const stopRecording = () => {
    setRecordingHotkey(null);
    setTempHotkey("");
  };

  useEffect(() => {
    if (!recordingHotkey) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const key = event.key.toLowerCase();
      if (["control", "alt", "shift", "meta"].includes(key)) {
        return;
      }

      const modifiers: string[] = [];
      if (event.ctrlKey || event.metaKey) modifiers.push("ctrl");
      if (event.altKey) modifiers.push("alt");
      if (event.shiftKey) modifiers.push("shift");

      const hotkeyString = modifiers.length > 0 ? `${modifiers.join("+")}+${key}` : key;
      setTempHotkey(hotkeyString);

      const { category, key: actionKey } = recordingHotkey;
      saveCustomHotkeys({
        ...customHotkeys,
        [`${category}.${actionKey}`]: hotkeyString,
      });

      stopRecording();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [recordingHotkey, customHotkeys]);

  const resetHotkey = (category: HotkeyCategory, key: string) => {
    const nextHotkeys = { ...customHotkeys };
    delete nextHotkeys[`${category}.${key}`];
    saveCustomHotkeys(nextHotkeys);
  };

  const resetAllHotkeys = () => {
    if (!confirm("确定要重置所有快捷键为默认值吗？")) {
      return;
    }

    setCustomHotkeys({});
    localStorage.removeItem("customHotkeys");
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5">
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.751-1.034a.75.75 0 010 1.966h-5.69c-.309 0-.542-.29-.459-.587l1.07-3.745a1.125 1.125 0 012.296 0l1.07 3.745c.083.297-.15.587-.459.587h-.455M12 6a2.25 2.25 0 00-2.25 2.25v.094c0 .534.13.943.233 1.226.167.458.36.815.516 1.103.13.24.242.449.242.683 0 .234-.112.443-.242.683-.156.288-.35.645-.516 1.103-.103.283-.233.692-.233 1.226v.094A2.25 2.25 0 0012 18h.75a2.25 2.25 0 002.25-2.25v-.094c0-.534-.13-.943-.233-1.226-.167-.458-.36-.815-.516-1.103-.13-.24-.242-.449-.242-.683 0-.234.112-.443.242-.683.156-.288.35-.645.516-1.103.103-.283.233-.692.233-1.226V9.75A2.25 2.25 0 0012.75 6H12z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1">自定义快捷键</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              这里只保留当前 VibeLife 还在使用的页面和操作，历史学习模块的旧快捷键已经全部移除。
            </p>
          </div>
        </div>
      </div>

      {SECTION_META.map((section) => (
        <section key={section.id}>
          <h3 className={`text-lg font-bold mb-3 ${section.accent}`}>{section.title}</h3>
          <div className="space-y-2">
            {Object.entries(DEFAULT_HOTKEYS[section.id]).map(([key]) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-white/10"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{HOTKEY_NAMES[key]}</span>
                <div className="flex items-center gap-2">
                  <kbd className="px-3 py-1.5 text-sm font-mono bg-gray-100 dark:bg-slate-700 border dark:border-white/10 rounded min-w-[84px] text-center dark:text-gray-300">
                    {getActualHotkey(section.id, key)}
                  </kbd>
                  <button
                    onClick={() => startRecording(section.id, key)}
                    className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                  >
                    {recordingHotkey?.category === section.id && recordingHotkey.key === key ? "请按键..." : "修改"}
                  </button>
                  {customHotkeys[`${section.id}.${key}`] && (
                    <button
                      onClick={() => resetHotkey(section.id, key)}
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
      ))}

      <div className="pt-6 border-t dark:border-white/10 flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          当前面板只显示现行功能；旧学习模块快捷键已移除。
        </div>
        <button
          onClick={resetAllHotkeys}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
        >
          重置所有快捷键
        </button>
      </div>

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
