import { useEffect, useCallback } from 'react';
import React from 'react';

/**
 * 快捷键配置类型
 */
export type ShortcutsConfig = Record<string, (event: KeyboardEvent) => void>;

/**
 * 全局快捷键 Hook
 * @param shortcuts - 快捷键配置对象
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+s': () => console.log('保存'),
 *   'ctrl+f': () => console.log('搜索'),
 * })
 */
export const useKeyboardShortcuts = (shortcuts: ShortcutsConfig): void => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // ✅ 修复：检查 event.key 是否存在
    if (!event.key) return;

    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey; // Windows: Ctrl, Mac: Cmd
    const alt = event.altKey;
    const shift = event.shiftKey;

    // 构建快捷键字符串
    let shortcut = '';
    if (ctrl) shortcut += 'ctrl+';
    if (alt) shortcut += 'alt+';
    if (shift) shortcut += 'shift+';
    shortcut += key;

    // 查找匹配的快捷键
    const matchedShortcut = Object.keys(shortcuts).find(pattern => {
      // 支持大小写不敏感
      return pattern.toLowerCase() === shortcut.toLowerCase();
    });

    if (matchedShortcut) {
      event.preventDefault();
      shortcuts[matchedShortcut](event);
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

/**
 * 检测当前是否按下了某个键
 * @param key - 要检测的键
 * @returns 是否按下
 */
export const useKeyPressed = (key: string): boolean => {
  const [isPressed, setIsPressed] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === key.toLowerCase()) {
        setIsPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === key.toLowerCase()) {
        setIsPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [key]);

  return isPressed;
};
