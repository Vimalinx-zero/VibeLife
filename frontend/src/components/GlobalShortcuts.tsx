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
    'alt+1': () => {
      navigate('/');
      toast.info('🏠 主页');
    },
    'alt+2': () => {
      navigate('/projects');
      toast.info('📁 项目');
    },
    'alt+3': () => {
      navigate('/workbench');
      toast.info('🧰 工作台');
    },
    'alt+4': () => {
      navigate('/notes');
      toast.info('📝 笔记');
    },
    'alt+5': () => {
      navigate('/notes');
      toast.info('🧠 知识库');
    },
    'alt+6': () => {
      navigate('/schedule');
      toast.info('🗓️ 日程');
    },

    'escape': () => {
      if (showHotkeys) {
        setShowHotkeys(false);
        return;
      }

      const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"]');
      if (modals.length > 0) {
        const firstModal = modals[0] as HTMLElement;
        if (firstModal && 'close' in firstModal && typeof firstModal.close === 'function') {
          firstModal.close();
        }
      } else {
        navigate('/');
      }
    },

    'ctrl+k': () => {
      toast.info('🔍 快速搜索开发中...');
    },

    'ctrl+shift+k': handleShowHotkeys,
    'ctrl+/': handleShowHotkeys,
    'shift+/': handleShowHotkeys,

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
