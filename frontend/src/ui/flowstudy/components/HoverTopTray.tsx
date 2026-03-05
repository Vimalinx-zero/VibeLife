import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface HoverTopTrayProps {
  content: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function HoverTopTray({ content, disabled = false, className }: HoverTopTrayProps) {
  const [show, setShow] = useState(false);

  return (
    <div className={`fixed top-0 left-0 w-full h-[30px] z-[90] flex justify-center group pointer-events-none ${className || ""}`}>
      <button
        type="button"
        className="w-[80%] h-full pointer-events-auto flex justify-center bg-transparent border-0 p-0"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        aria-label="Show tray"
      >
        <AnimatePresence>
          {(show || disabled) && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 25 }}
              className="absolute top-0 w-[95%] md:w-[90%] max-w-6xl h-28 dark:bg-black/80 bg-white/90 backdrop-blur-2xl border-b border-x dark:border-white/10 border-white/40 dark:text-white text-gray-800 rounded-b-[3rem] shadow-2xl z-[91]"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>

        {!disabled && (
          <div className="absolute bottom-2 w-24 h-1 bg-gray-400/30 dark:bg-white/20 backdrop-blur rounded-full transition-all duration-300 group-hover:opacity-0 shadow-sm" />
        )}
      </button>
    </div>
  );
}
