import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import HotkeysHelp from './HotkeysHelp';

const GlobalShortcuts = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { toggleDarkMode } = useTheme();
  const [showHotkeys, setShowHotkeys] = useState(false);

  // 显示快捷键帮助
  const handleShowHotkeys = useCallback(() => {
    setShowHotkeys(true);
  }, []);

  // 全局快捷键配置
  useKeyboardShortcuts({
    // ========== 页面导航 ==========
    // Alt+数字快速导航
    'alt+1': () => {
      navigate('/');
      toast.info('🏠 仪表板');
    },
    'alt+2': () => {
      navigate('/quiz');
      toast.info('✏️ 智能刷题');
    },
    'alt+3': () => {
      navigate('/mistakes');
      toast.info('🐛 错题本');
    },
    'alt+4': () => {
      navigate('/notes');
      toast.info('📝 笔记');
    },
    'alt+5': () => {
      navigate('/anki');
      toast.info('🧠 记忆卡');
    },
    'alt+6': () => {
      navigate('/workbench');
      toast.info('⏱️ 学习工作台');
    },

    // ========== 通用功能 ==========
    // Escape 返回上一页
    'escape': () => {
      // 如果快捷键帮助打开，关闭它
      if (showHotkeys) {
        setShowHotkeys(false);
        return;
      }

       // 检查是否有打开的弹窗或模态框
      const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"]');
      if (modals.length > 0) {
        // 尝试关闭第一个模态框
        const firstModal = modals[0] as HTMLElement;
        if (firstModal && 'close' in firstModal && typeof firstModal.close === 'function') {
          firstModal.close();
        }
      } else {
        // 否则返回上一页
        navigate(-1);
      }
    },

    // Ctrl+K 快速搜索
    'ctrl+k': () => {
      toast.info('🔍 快速搜索功能开发中...');
    },

    // Ctrl+Shift+K / Ctrl+/ 显示快捷键帮助
    'ctrl+shift+k': handleShowHotkeys,
    'ctrl+/': handleShowHotkeys,
    'shift+/': handleShowHotkeys,

    // Ctrl+D 切换深色/浅色模式
    'ctrl+d': () => {
      toggleDarkMode();
      toast.info('🎨 已切换主题');
    },
  });

  return (
    <>
      <HotkeysHelp
        isOpen={showHotkeys}
        onClose={() => setShowHotkeys(false)}
      />
    </>
  );
};

export default GlobalShortcuts;
