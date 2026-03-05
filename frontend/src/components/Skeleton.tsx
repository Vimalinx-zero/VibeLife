import { motion } from "framer-motion";

/**
 * 骨架屏组件
 * 用于数据加载时的占位显示
 */

interface CardSkeletonProps {
  count?: number;
}

interface TextSkeletonProps {
  lines?: number;
}

interface QuizCardSkeletonProps {
  count?: number;
}

interface NoteListSkeletonProps {
  count?: number;
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

interface PulseSkeletonProps {
  className?: string;
}

export const CardSkeleton = ({ count = 1 }: CardSkeletonProps) => {
  return Array.from({ length: count }).map((_, i) => (
    <motion.div
      key={i}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.1 }}
      className="w-full h-32 rounded-2xl bg-white/60 dark:bg-black/20 backdrop-blur-xl border dark:border-white/10"
    />
  ));
};

export const TextSkeleton = ({ lines = 3 }: TextSkeletonProps) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "100%" }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="h-4 bg-gray-200 dark:bg-white/10 rounded"
          style={{
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  );
};

export const QuizCardSkeleton = ({ count = 3 }: QuizCardSkeletonProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="h-64 rounded-2xl bg-white/60 dark:bg-black/20 backdrop-blur-xl border dark:border-white/10 p-6"
        >
          {/* 题目占位 */}
          <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-3/4 mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-white/10 rounded" />
            <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-5/6" />
          </div>

          {/* 选项占位 */}
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-10 bg-gray-100 dark:bg-white/5 rounded-lg" />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export const NoteListSkeleton = ({ count = 5 }: NoteListSkeletonProps) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-4 p-4 rounded-xl bg-white/60 dark:bg-black/20 border dark:border-white/10"
        >
          {/* 文件夹图标 */}
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 dark:bg-blue-500/10" />

          {/* 文件名 */}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
            <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/4" />
          </div>

          {/* 箭头 */}
          <div className="w-6 h-6 rounded bg-gray-200 dark:bg-white/10" />
        </motion.div>
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }: TableSkeletonProps) => {
  return (
    <div className="w-full">
      {/* 表头 */}
      <div className="flex gap-4 mb-4 pb-4 border-b dark:border-white/10">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 dark:bg-white/10 rounded flex-1" />
        ))}
      </div>

      {/* 表格行 */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-10 bg-gray-100 dark:bg-white/5 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 脉冲动画骨架屏
 * 用于内容加载时的占位
 */
export const PulseSkeleton = ({ className = "" }: PulseSkeletonProps) => {
  return (
    <motion.div
      className={`bg-gray-200 dark:bg-white/10 rounded ${className}`}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

export default CardSkeleton;
