import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export type ContextMenuPosition = { x: number; y: number };

export interface ContextMenuUIProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
  children: React.ReactNode;
  minWidthPx?: number;
}

export function ContextMenuUI({ position, onClose, children, minWidthPx = 180 }: ContextMenuUIProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<ContextMenuPosition | null>(position);
  const [isMeasured, setIsMeasured] = useState(false);

  useLayoutEffect(() => {
    if (!position || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    if (x + rect.width > viewportWidth - 10) x = viewportWidth - rect.width - 10;
    if (y + rect.height > viewportHeight - 10) y = viewportHeight - rect.height - 10;

    x = Math.max(10, x);
    y = Math.max(10, y);

    setAdjustedPosition({ x, y });
    setIsMeasured(true);
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };

    const handleClose = () => onClose();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("scroll", handleClose, true);
    document.addEventListener("contextmenu", handleClose);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleClose, true);
      document.removeEventListener("contextmenu", handleClose);
    };
  }, [onClose]);

  if (!position) return null;
  const finalPosition = isMeasured ? adjustedPosition : position;
  if (!finalPosition) return null;

  return (
    <div ref={menuRef} style={{ left: `${finalPosition.x}px`, top: `${finalPosition.y}px` }} className="fixed z-[9999]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 shadow-xl overflow-hidden"
        style={{ minWidth: `${minWidthPx}px` }}
        role="menu"
      >
        {children}
      </motion.div>
    </div>
  );
}
