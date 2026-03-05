import type { ReactNode } from "react";

export interface FocusWorkbenchLayoutProps {
  left: ReactNode;
  leftBottom?: ReactNode;
  rightHeader?: ReactNode;
  right: ReactNode;
  className?: string;
}

export function FocusWorkbenchLayout({ left, leftBottom, rightHeader, right, className }: FocusWorkbenchLayoutProps) {
  return (
    <div
      className={`h-screen font-sans text-gray-900 dark:text-gray-200 selection:bg-indigo-500/30 overflow-hidden relative transition-colors duration-500 ${
        className || ""
      }`}
    >
      <div className="absolute inset-0 bg-white/15 dark:bg-black/15 pointer-events-none z-0 transition-colors duration-500" />

      <div className="relative z-10 w-full flex h-screen">
        <div className="flex-[7] relative flex flex-col border-r border-gray-200/50 dark:border-white/5 bg-transparent transition-colors duration-500">
          <div className="flex-1 flex items-center justify-center relative pb-24">{left}</div>
          {leftBottom ? <div className="absolute bottom-8 left-8 right-8 flex justify-center">{leftBottom}</div> : null}
        </div>

        <div className="flex-[3] max-w-[420px] bg-white/15 dark:bg-black/10 backdrop-blur-sm border-l border-gray-200/30 dark:border-white/5 flex flex-col transition-colors duration-500 relative z-[80]">
          {rightHeader ? <div className="px-6 pt-6 pb-4 border-b border-gray-200/50 dark:border-white/5">{rightHeader}</div> : null}
          <div className="flex-1 min-h-0">{right}</div>
        </div>
      </div>
    </div>
  );
}
