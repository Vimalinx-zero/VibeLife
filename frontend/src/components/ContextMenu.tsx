import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Position {
  x: number;
  y: number;
}

interface ContextMenuProps {
  position: Position | null;
  onClose: () => void;
  children: React.ReactNode;
}

const ContextMenu = ({ position, onClose, children }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<Position | null>(position);
  const [isMeasured, setIsMeasured] = useState(false);

  useLayoutEffect(() => {
    if (position && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      // Adjust horizontal position if menu overflows right edge
      if (x + rect.width > viewportWidth - 10) {
        x = viewportWidth - rect.width - 10;
      }

      // Adjust vertical position if menu overflows bottom edge
      if (y + rect.height > viewportHeight - 10) {
        y = viewportHeight - rect.height - 10;
      }

      // Ensure menu doesn't go off screen
      x = Math.max(10, x);
      y = Math.max(10, y);

      setAdjustedPosition({ x, y });
      setIsMeasured(true);
    }
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('contextmenu', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('contextmenu', handleScroll);
    };
  }, [onClose]);

  if (!position) return null;

  const finalPosition = isMeasured ? adjustedPosition : position;

  if (!finalPosition) return null;

  const style = {
    left: `${finalPosition.x}px`,
    top: `${finalPosition.y}px`,
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-[9999]"
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 shadow-xl overflow-hidden min-w-[180px]"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default ContextMenu;
