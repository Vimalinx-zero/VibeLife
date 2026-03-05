import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AIExplanationData as AIExplanation } from "../../types";

const Icons = {
  ChevronDown: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>,
};

/**
 * 可折叠区域组件
 *
 * @param {string} title - 区域标题
 * @param {ReactNode} icon - 图标
 * @param {number} count - 数量（可选）
 * @param {boolean} expanded - 默认是否展开
 * @param {ReactNode} children - 子内容
 * @param {string} color - 颜色主题: 'blue' | 'green' | 'orange' | 'red' | 'purple'
 */
const Section = ({ title, icon, count, expanded = true, children, color = "blue" }) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const colorClasses = {
    blue: {
      container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30",
      button: "hover:bg-blue-100 dark:hover:bg-blue-900/30",
      title: "text-blue-700 dark:text-blue-400",
      count: "bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
    },
    green: {
      container: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30",
      button: "hover:bg-green-100 dark:hover:bg-green-900/30",
      title: "text-green-700 dark:text-green-400",
      count: "bg-green-200 dark:bg-green-900/40 text-green-700 dark:text-green-300"
    },
    orange: {
      container: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-500/30",
      button: "hover:bg-orange-100 dark:hover:bg-orange-900/30",
      title: "text-orange-700 dark:text-orange-400",
      count: "bg-orange-200 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
    },
    red: {
      container: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30",
      button: "hover:bg-red-100 dark:hover:bg-red-900/30",
      title: "text-red-700 dark:text-red-400",
      count: "bg-red-200 dark:bg-red-900/40 text-red-700 dark:text-red-300"
    },
    purple: {
      container: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-500/30",
      button: "hover:bg-purple-100 dark:hover:bg-purple-900/30",
      title: "text-purple-700 dark:text-purple-400",
      count: "bg-purple-200 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`mb-3 rounded-xl border overflow-hidden ${colors.container}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-2.5 flex items-center justify-between transition-colors ${colors.button}`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-semibold text-sm ${colors.title}`}>{title}</span>
          {count !== undefined && count !== null && (
            <span className={`px-1.5 py-0.5 text-xs rounded-full ${colors.count}`}>
              {count}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Icons.ChevronDown />
        </motion.div>
      </button>

      <AnimatePresence mode="sync">
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Section;
