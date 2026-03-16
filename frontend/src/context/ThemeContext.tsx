import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { ThemeProfile } from "../types";

// 背景选项接口
interface BackgroundOption {
  name: string;
  value: string;
  type: "dark" | "light" | "image";
}

// 个人资料接口（扩展 ThemeProfile）
interface Profile extends ThemeProfile {
  avatar: string;
}

// 专注设置接口
interface FocusSettings {
  duration: number;    // 分钟
  breakDuration: number; // classic 休息分钟
  autoBreak: boolean;
  volume: number;      // 0-100
}

// 编辑器设置接口
interface EditorSettings {
  fontSize: number;
  fontFamily: 'Sans' | 'Serif' | 'Mono';
}

// Theme Context 值接口
interface ThemeContextValue {
  isDark: boolean;
  setIsDark: (value: boolean | ((prev: boolean) => boolean)) => void;
  toggleDarkMode: () => void;
  background: string;
  setBackground: (value: string | ((prev: string) => string)) => void;
  bgOptions: BackgroundOption[];
  changeBackground: (option: BackgroundOption) => void;
  showSettings: boolean;
  setShowSettings: (value: boolean | ((prev: boolean) => boolean)) => void;
  profile: Profile;
  setProfile: (value: Profile | ((prev: Profile) => Profile)) => void;
  focusSettings: FocusSettings;
  setFocusSettings: (value: FocusSettings | ((prev: FocusSettings) => FocusSettings)) => void;
  editorSettings: EditorSettings;
  setEditorSettings: (value: EditorSettings | ((prev: EditorSettings) => EditorSettings)) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // 1. 基础状态 (从 localStorage 读取，如果没有则使用默认值)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('isDark');
    return stored ? JSON.parse(stored) : true;
  });

  const [background, setBackground] = useState<string>(() => {
    return localStorage.getItem('background') || "radial-gradient(circle at top left, #1e1b4b, #1a1a1a)";
  });

  // 2. 设置弹窗开关
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // 3. ✨ 新增：个人资料状态
  const [profile, setProfile] = useState<Profile>(() => {
    const stored = localStorage.getItem('profile');
    return stored ? JSON.parse(stored) : {
      name: "Alex",
      avatar: "Felix", // DiceBear seed
      email: "",
      theme: "dark"
    };
  });

  // 4. ✨ 新增：专注设置状态
  const [focusSettings, setFocusSettings] = useState<FocusSettings>(() => {
    const stored = localStorage.getItem('focusSettings');
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<FocusSettings>;
      return {
        duration: typeof parsed.duration === 'number' ? parsed.duration : 25,
        breakDuration: typeof parsed.breakDuration === 'number' ? parsed.breakDuration : 5,
        autoBreak: Boolean(parsed.autoBreak),
        volume: typeof parsed.volume === 'number' ? parsed.volume : 50
      };
    }

    return {
      duration: 25, // 分钟
      breakDuration: 5,
      autoBreak: false,
      volume: 50
    };
  });

  // 5. ✨ 新增：编辑器设置状态
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    const stored = localStorage.getItem('editorSettings');
    return stored ? JSON.parse(stored) : {
      fontSize: 16,
      fontFamily: 'Sans' // 'Sans', 'Serif', 'Mono'
    };
  });

  // --- 预设背景选项 ---
  const bgOptions: BackgroundOption[] = [
    { name: "深邃暗夜", value: "radial-gradient(circle at top left, #1e1b4b, #1a1a1a)", type: "dark" },
    { name: "清晨微光", value: "linear-gradient(to top, #dfe9f3 0%, white 100%)", type: "light" },
    { name: "赛博紫光", value: "linear-gradient(to right, #240b36, #c31432)", type: "dark" },
    { name: "山川 (图)", value: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')", type: "image" },
    { name: "极简灰 (图)", value: "url('https://images.unsplash.com/photo-1449247709967-d4461a6a6103?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')", type: "image" },
  ];

  // --- 持久化逻辑 (监听状态变化，存入 LocalStorage) ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('isDark', JSON.stringify(isDark));
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('background', background);
  }, [background]);

  useEffect(() => {
    localStorage.setItem('profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('focusSettings', JSON.stringify(focusSettings));
  }, [focusSettings]);

  useEffect(() => {
    localStorage.setItem('editorSettings', JSON.stringify(editorSettings));
  }, [editorSettings]);

  const changeBackground = (option: BackgroundOption): void => {
    setBackground(option.value);
    if (option.type === 'light') setIsDark(false);
    else if (option.type === 'dark') setIsDark(true);
  };

  const toggleDarkMode = (): void => {
    setIsDark(prev => !prev);
  };

  const value: ThemeContextValue = {
    isDark,
    setIsDark,
    toggleDarkMode,
    background,
    setBackground,
    bgOptions,
    changeBackground,
    showSettings,
    setShowSettings,
    profile,
    setProfile,
    focusSettings,
    setFocusSettings,
    editorSettings,
    setEditorSettings
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
