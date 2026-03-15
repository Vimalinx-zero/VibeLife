import { memo, type MouseEvent, type ReactNode } from "react";
import { motion } from "framer-motion";

export interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  delay?: number;
}

export const GlassCard = memo(({ children, className, onClick, delay = 0 }: GlassCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{
        scale: 1.02,
        y: -5,
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      whileTap={{ scale: 0.98 }}
      style={{ willChange: "transform" }}
      className={`
        dark:bg-white/5 dark:border-white/10 dark:text-white
        bg-white/60 border-white/40 text-gray-800 shadow-xl
        backdrop-blur-2xl border rounded-3xl cursor-pointer relative overflow-hidden
        transition-colors duration-300
        ${className || ""}
      `}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      {children}
    </motion.div>
  );
});

GlassCard.displayName = "GlassCard";
