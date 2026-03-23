import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getNotesPreviewCopy } from "../../pages/notesWorkspaceCopyState";

interface NotesPreviewPanelProps {
  title: string;
  content: string;
  empty: boolean;
  selectionType: "file" | "folder";
  itemCount: number;
  className?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

const shellClassName =
  "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(245,242,232,0.06),transparent_26%),linear-gradient(180deg,rgba(19,24,30,0.84),rgba(12,16,22,0.8))] text-white shadow-[0_28px_72px_rgba(15,23,42,0.24)] backdrop-blur-[22px]";

const markdownComponents = {
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-3 leading-7 last:mb-0" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-3 list-disc space-y-1 pl-5" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li className="pl-1" {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  code: ({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { className?: string }) =>
    className ? (
      <code
        className="mb-3 block overflow-x-auto rounded-[16px] bg-black/40 px-4 py-3 text-sm text-slate-100"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code className="rounded bg-black/30 px-1.5 py-0.5 text-[0.92em]" {...props}>
        {children}
      </code>
    ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="mb-3 overflow-x-auto" {...props} />
  ),
};

const NotesPreviewPanel = ({
  title,
  content,
  empty,
  selectionType,
  itemCount,
  className = "",
  showBackButton = false,
  onBack,
}: NotesPreviewPanelProps) => {
  const copy = getNotesPreviewCopy(selectionType, itemCount);

  return (
    <section className={`${shellClassName} ${className}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]" />
      </div>

      <div className="relative border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] px-5 py-[18px]">
        {showBackButton ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.09] hover:text-white"
          >
            <span aria-hidden="true">←</span>
            <span>返回</span>
          </button>
        ) : (
          <div className="text-[11px] font-medium tracking-[0.14em] text-slate-500">
            笔记预览
          </div>
        )}
        <h2 className="mt-3 truncate text-[1rem] font-semibold tracking-tight text-white">{title}</h2>
        {!showBackButton ? (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 tracking-[0.12em]">
              {copy.chipLabel}
            </span>
            <span>{copy.helperText}</span>
          </div>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {selectionType === "folder" ? (
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] px-5 py-6 text-sm leading-7 text-slate-400">
            当前选中的是文件夹。中间的 AI 会基于这个文件夹下可见文件继续对话。
          </div>
        ) : empty ? (
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] px-5 py-6 text-sm leading-7 text-slate-400">
            这条笔记目前没有正文内容。
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-5 py-6">
            <article className="prose prose-invert max-w-none text-[0.95rem] leading-7 text-slate-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </article>
          </div>
        )}
      </div>
    </section>
  );
};

export default NotesPreviewPanel;
