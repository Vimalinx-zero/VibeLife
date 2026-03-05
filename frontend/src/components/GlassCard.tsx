import { motion } from "framer-motion";
import { memo, ReactNode, MouseEvent } from "react";

/**
 * GlassCard 组件的 Props 接口
 */
interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  delay?: number;
}

/**
 * GlassCard 组件 - 使用 React.memo 优化性能
 * 避免不必要的重新渲染
 * ✅ 优化动画性能：GPU 加速、减少动画时长、will-change 提示
 */
const GlassCard = memo(({ children, className, onClick, delay = 0 }: GlassCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay, ease: "easeOut" }}
      whileHover={{
        scale: 1.02,
        y: -5,
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        transition: { duration: 0.2, ease: "easeOut" } // ✅ 缩短动画时长
      }}
      whileTap={{ scale: 0.98 }}
      // ✅ 添加 GPU 加速提示
      style={{ willChange: 'transform' }}
      className={`
        /* 核心适配逻辑 */
        dark:bg-white/5 dark:border-white/10 dark:text-white
        bg-white/60 border-white/40 text-gray-800 shadow-xl

        backdrop-blur-2xl border rounded-3xl cursor-pointer relative overflow-hidden
        transition-colors duration-300
        ${className || ""}
      `}
      onClick={onClick}
    >
      {/* 高光层：暗色模式显白光，亮色模式显亮光 */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"/>
      {children}
    </motion.div>
  );
});

GlassCard.displayName = "GlassCard";

export default GlassCard;
