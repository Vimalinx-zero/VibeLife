import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  KnowledgeDiscussionMessageDTO,
  KnowledgeDraftDTO,
  QuickCaptureRecordDTO,
} from "../../utils/api";
import TagInput from "../TagInput";

export interface KnowledgeCitationLike {
  id: string;
  title: string;
  content_kind?: "collected" | "generated";
  project_id?: string | null;
  category?: string | null;
}

interface KnowledgeDiscussionPanelProps {
  mode: "entry" | "selection";
  messages: KnowledgeDiscussionMessageDTO[];
  citations: KnowledgeCitationLike[];
  draft: KnowledgeDraftDTO | null;
  discussionInput: string;
  isDiscussing: boolean;
  isSaving: boolean;
  saveError: string | null;
  selectedEntry: QuickCaptureRecordDTO | null;
  selectedEntries: QuickCaptureRecordDTO[];
  generatedEntries: QuickCaptureRecordDTO[];
  appendTargetId: string | null;
  projectNameById: Record<string, string>;
  onModeChange: (mode: "entry" | "selection") => void;
  onDiscussionInputChange: (value: string) => void;
  onSendDiscussion: () => void;
  onDraftChange: (draft: KnowledgeDraftDTO) => void;
  onSelectCitation: (citationId: string) => void;
  onAppendTargetChange: (entryId: string | null) => void;
  onCreateGenerated: () => void;
  onAppendGenerated: () => void;
  onKeepChatOnly: () => void;
}

const panelClassName =
  "rounded-[28px] border border-white/45 bg-white/82 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-white/12 dark:bg-slate-950/72";

const inputClassName =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-white/25 dark:focus:ring-white/10";

const bubbleMarkdownComponents = {
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-3 last:mb-0 leading-7" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-3 list-disc space-y-1 pl-5" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li className="pl-1" {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="underline decoration-current/30 underline-offset-4" target="_blank" rel="noreferrer" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="mb-3 border-l-2 border-current/20 pl-4 italic" {...props} />
  ),
  code: ({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { className?: string }) =>
    className ? (
      <code
        className="mb-3 block overflow-x-auto rounded-2xl bg-black/75 px-4 py-3 text-sm text-slate-100"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code className="rounded bg-black/10 px-1.5 py-0.5 text-[0.92em]" {...props}>
        {children}
      </code>
    ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => <pre className="mb-3 overflow-x-auto" {...props} />,
};

const formatContextText = (
  mode: "entry" | "selection",
  selectedEntry: QuickCaptureRecordDTO | null,
  selectedEntries: QuickCaptureRecordDTO[]
) => {
  if (mode === "entry") {
    return selectedEntry
      ? `当前围绕「${selectedEntry.title}」单条讨论。`
      : "先在中间选一条内容，再开始单条讨论。";
  }

  if (selectedEntries.length > 0) {
    return `当前按 ${selectedEntries.length} 条选中内容做组合讨论。`;
  }

  return "当前按筛选范围做组合讨论；即使没有手动勾选条目，也会使用当前列表范围作为知识背景。";
};

const formatEntryMeta = (
  entry: QuickCaptureRecordDTO,
  projectNameById: Record<string, string>
) => {
  const projectLabel = entry.project_id
    ? projectNameById[entry.project_id] ?? entry.project_id
    : "未归项目";
  return `${projectLabel} · ${entry.category || "未分类"}`;
};

const KnowledgeDiscussionPanel = ({
  mode,
  messages,
  citations,
  draft,
  discussionInput,
  isDiscussing,
  isSaving,
  saveError,
  selectedEntry,
  selectedEntries,
  generatedEntries,
  appendTargetId,
  projectNameById,
  onModeChange,
  onDiscussionInputChange,
  onSendDiscussion,
  onDraftChange,
  onSelectCitation,
  onAppendTargetChange,
  onCreateGenerated,
  onAppendGenerated,
  onKeepChatOnly,
}: KnowledgeDiscussionPanelProps) => {
  const canSend = discussionInput.trim().length > 0 && !isDiscussing;
  const canAppend = Boolean(draft && appendTargetId) && !isSaving;

  return (
    <section className={`${panelClassName} flex h-full min-h-0 flex-col gap-4`}>
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          Discussion
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              AI 讨论区
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              先讨论，再决定是否新建生成笔记、追加到旧笔记，或者只保留对话。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "entry", label: "单条" },
              { value: "selection", label: "组合" },
            ].map((option) => {
              const active = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onModeChange(option.value as "entry" | "selection")}
                  className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  }`}
                >
                  {option.label}讨论
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {formatContextText(mode, selectedEntry, selectedEntries)}
        </p>
        {mode === "selection" && selectedEntries.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedEntries.map((entry) => (
              <span
                key={entry.id}
                className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-200"
              >
                {entry.title}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-slate-300/80 px-6 text-center text-sm leading-6 text-slate-500 dark:border-white/10 dark:text-slate-400">
            提一个问题吧。比如“帮我从这些收集内容里抽出行动项”，或者“把这条笔记整理成可执行方案”。
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const userMessage = message.role === "user";
              return (
                <div
                  key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                  className={`rounded-[22px] px-4 py-3 ${
                    userMessage
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                      : "bg-white text-slate-700 dark:bg-white/5 dark:text-slate-100"
                  }`}
                >
                  <div className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${userMessage ? "text-white/65 dark:text-slate-500" : "text-slate-400 dark:text-slate-500"}`}>
                    {userMessage ? "You" : "AI"}
                  </div>
                  <div className={`text-sm leading-7 ${userMessage ? "text-white dark:text-slate-950" : "text-slate-700 dark:text-slate-100"}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={bubbleMarkdownComponents}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {citations.length > 0 ? (
          <div className="mt-4 rounded-[22px] border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-slate-950/50">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">引用来源</h3>
            <div className="mt-3 space-y-2">
              {citations.map((citation) => (
                <button
                  key={citation.id}
                  type="button"
                  onClick={() => onSelectCitation(citation.id)}
                  className="w-full rounded-2xl border border-slate-200/80 px-3 py-2 text-left text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-900 dark:text-white">{citation.title}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {citation.project_id ? projectNameById[citation.project_id] ?? citation.project_id : "未归项目"} · {citation.category || "未分类"} · {citation.content_kind === "generated" ? "生成内容" : "收集内容"}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      跳转
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {draft ? (
          <div className="mt-4 rounded-[22px] border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-slate-950/50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">生成草稿</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  这里只会在你手动确认后写回知识库。
                </p>
              </div>
              <button
                type="button"
                onClick={onKeepChatOnly}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                仅保留对话
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  标题
                </span>
                <input
                  value={draft.title}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      title: event.target.value,
                    })
                  }
                  className={inputClassName}
                />
              </label>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    项目
                  </span>
                  <input
                    value={draft.project_id ?? ""}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        project_id: event.target.value,
                      })
                    }
                    className={inputClassName}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    类别
                  </span>
                  <input
                    value={draft.category ?? ""}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        category: event.target.value,
                      })
                    }
                    className={inputClassName}
                  />
                </label>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  标签
                </span>
                <TagInput
                  tags={draft.tags}
                  onChange={(tags) =>
                    onDraftChange({
                      ...draft,
                      tags,
                    })
                  }
                  placeholder="给这份生成内容补上标签"
                  autoMode={false}
                />
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  正文
                </span>
                <textarea
                  value={draft.content_markdown}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      content_markdown: event.target.value,
                    })
                  }
                  rows={12}
                  className={`${inputClassName} min-h-[240px] resize-y font-mono text-[13px] leading-6`}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  追加到现有生成笔记
                </span>
                <select
                  value={appendTargetId ?? ""}
                  onChange={(event) => onAppendTargetChange(event.target.value || null)}
                  className={inputClassName}
                >
                  <option value="">选择目标生成笔记</option>
                  {generatedEntries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title} · {formatEntryMeta(entry, projectNameById)}
                    </option>
                  ))}
                </select>
              </label>

              {saveError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {saveError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onCreateGenerated}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {isSaving ? "处理中..." : "保存为生成笔记"}
                </button>
                <button
                  type="button"
                  onClick={onAppendGenerated}
                  disabled={!canAppend}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  追加到选中生成笔记
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
            提问
          </span>
          <textarea
            value={discussionInput}
            onChange={(event) => onDiscussionInputChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                onSendDiscussion();
              }
            }}
            rows={4}
            placeholder={
              mode === "entry"
                ? "例如：把这条内容整理成一个可执行清单"
                : "例如：帮我从这些内容里抽出共同主题和下一步行动"
            }
            className={`${inputClassName} min-h-[120px] resize-y`}
          />
        </label>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            `Ctrl/Cmd + Enter` 发送
          </p>
          <button
            type="button"
            onClick={onSendDiscussion}
            disabled={!canSend}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {isDiscussing ? "AI 思考中..." : "发送给 AI"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default KnowledgeDiscussionPanel;
