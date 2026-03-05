import { motion } from "framer-motion";

/**
 * 统一的加载屏幕组件
 * 用于页面懒加载时的加载状态
 */

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center relative z-50">
      {/* 背景动画 */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="w-full h-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* 加载内容 */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo 动画 */}
        <motion.div
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl flex items-center justify-center"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="text-4xl font-bold text-white">F</span>
        </motion.div>

        {/* 加载文字 */}
        <div className="text-center">
          <motion.h1
            className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            FlowStudy
          </motion.h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">加载中...</p>
        </div>

        {/* 加载条 */}
        <div className="w-64 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
