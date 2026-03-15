import { motion } from "framer-motion";

const SKELETON_KEYS = [
  "sk-a",
  "sk-b",
  "sk-c",
  "sk-d",
  "sk-e",
  "sk-f",
  "sk-g",
  "sk-h",
  "sk-i",
  "sk-j",
  "sk-k",
  "sk-l",
  "sk-m",
  "sk-n",
  "sk-o",
  "sk-p",
  "sk-q",
  "sk-r",
  "sk-s",
  "sk-t",
];

export function CardSkeleton({ count = 1 }: { count?: number }) {
  const keys = SKELETON_KEYS.slice(0, Math.max(0, Math.min(count, SKELETON_KEYS.length)));
  return (
    <>
      {keys.map((key, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="w-full h-32 rounded-2xl bg-white/60 dark:bg-black/20 backdrop-blur-xl border dark:border-white/10"
        />
      ))}
    </>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  const keys = SKELETON_KEYS.slice(0, Math.max(0, Math.min(lines, SKELETON_KEYS.length)));
  return (
    <div className="space-y-3">
      {keys.map((key, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "100%" }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="h-4 bg-gray-200 dark:bg-white/10 rounded"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function PulseSkeleton({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`bg-gray-200 dark:bg-white/10 rounded ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
