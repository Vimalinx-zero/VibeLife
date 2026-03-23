import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  KnowledgeDiscussionMessageDTO,
  QuickCaptureRecordDTO,
} from "../../utils/api";
import { getKnowledgeCenterPanelState } from "../../pages/knowledgeWorkspaceShellState";

interface KnowledgeBrowserCitationLike {
  id: string;
  title: string;
  content_kind?: "collected" | "generated";
}

interface KnowledgeBrowserProps {
  selectedEntryId: string | null;
  selectedEntry: QuickCaptureRecordDTO | null;
  selectedEntries: QuickCaptureRecordDTO[];
  projectNameById: Record<string, string>;
  activeSearchQuery: string;
  mode: "entry" | "selection";
  messages: KnowledgeDiscussionMessageDTO[];
  citations: KnowledgeBrowserCitationLike[];
  discussionInput: string;
  isDiscussing: boolean;
  onDiscussionInputChange: (value: string) => void;
  onSendDiscussion: () => void;
  onSelectCitation: (citationId: string) => void;
}

const shellClassName =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#31343b] bg-[#1d2025] text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)]";

const composerClassName =
  "w-full rounded-[18px] border border-[#353840] bg-[#252931] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#565b66] focus:bg-[#2a2f38]";

const markdownComponents = {
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
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="underline decoration-current/30 underline-offset-4"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
};

const formatEntryContext = (
  entry: QuickCaptureRecordDTO | null,
  projectNameById: Record<string, string>
) => {
  if (!entry) {
    return "当前基于已选来源对话";
  }

  const projectLabel = entry.project_id
    ? projectNameById[entry.project_id] ?? entry.project_id
    : "未归项目";
  return `${projectLabel}${entry.category ? ` · ${entry.category}` : ""}`;
};

const getEntryExcerpt = (entry: QuickCaptureRecordDTO | null) => {
  if (!entry) {
    return "";
  }

  const raw =
    entry.summary ||
    entry.normalized_markdown ||
    entry.discussion_metadata?.assistant_reply_excerpt ||
    "";

  return raw.replace(/\s+/g, " ").slice(0, 220);
};

const KnowledgeBrowser = ({
  selectedEntryId,
  selectedEntry,
  selectedEntries,
  projectNameById,
  activeSearchQuery,
  mode,
  messages,
  citations,
  discussionInput,
  isDiscussing,
  onDiscussionInputChange,
  onSendDiscussion,
  onSelectCitation,
}: KnowledgeBrowserProps) => {
  const centerState = getKnowledgeCenterPanelState({
    selectedEntryId,
    messageCount: messages.length,
  });
  const canSend = discussionInput.trim().length > 0 && !isDiscussing;
  const lastAssistantIndex = [...messages]
    .map((message, index) => (message.role === "assistant" ? index : -1))
    .filter((index) => index >= 0);
  const latestAssistantIndex =
    lastAssistantIndex.length > 0 ? lastAssistantIndex[lastAssistantIndex.length - 1] : undefined;
  const contextText =
    mode === "selection" || selectedEntries.length > 1
      ? `基于 ${selectedEntries.length || "当前范围内的"} 个来源`
      : formatEntryContext(selectedEntry, projectNameById);
  const selectedExcerpt = getEntryExcerpt(selectedEntry);

  return (
    <section className={shellClassName}>
      <div className="border-b border-[#2b2f36] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">对话</h2>
            <div className="mt-1 text-xs text-slate-500">
              {activeSearchQuery ? `${contextText} · 检索：${activeSearchQuery}` : contextText}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-[#353840] bg-[#252931] text-slate-400 transition hover:border-[#4b505c] hover:text-white"
            title="更多"
          >
            ⋮
          </button>
        </div>
      </div>

      {selectedEntry ? (
        <div className="border-b border-[#2b2f36] px-5 py-4">
          <div className="rounded-[18px] border border-[#30343c] bg-[#23262c] px-4 py-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              当前来源
            </div>
            <div className="mt-2 text-base font-semibold text-white">{selectedEntry.title}</div>
            {selectedExcerpt ? (
              <p className="mt-2 text-sm leading-6 text-slate-400">{selectedExcerpt}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {centerState === "empty" ? (
          <div className="flex h-full min-h-[220px] items-center justify-center text-center">
            <div className="max-w-[420px]">
              <div className="text-sm font-medium text-slate-400">先从左边挑一批来源</div>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                这里会像 NotebookLM 一样连续承接对话，不再分成独立的阅读页和聊天页。
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[220px] items-center justify-center text-center">
            <div className="max-w-[480px]">
              <div className="text-base font-medium text-slate-200">{contextText}</div>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                直接提问就行，我会基于当前来源范围继续往下聊。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const showCitations = !isUser && index === latestAssistantIndex && citations.length > 0;

              return (
                <div
                  key={`${message.role}-${index}-${message.content.slice(0, 20)}`}
                  className={`rounded-[20px] border px-4 py-4 ${
                    isUser
                      ? "ml-auto max-w-[82%] border-[#48505d] bg-[#313743]"
                      : "max-w-[92%] border-[#2f333b] bg-[#23262c]"
                  }`}
                >
                  <div
                    className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      isUser ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {isUser ? "You" : "AI"}
                  </div>

                  <div className={`text-sm leading-7 ${isUser ? "text-slate-100" : "text-slate-200"}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {showCitations ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {citations.map((citation) => (
                        <button
                          key={citation.id}
                          type="button"
                          onClick={() => onSelectCitation(citation.id)}
                          className="rounded-full border border-[#3b4049] bg-[#2b3038] px-3 py-1.5 text-xs text-slate-300 transition hover:border-[#545a66] hover:text-white"
                        >
                          {citation.title}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-[#2b2f36] px-5 py-4">
        <div className="flex items-end gap-3">
          <textarea
            value={discussionInput}
            onChange={(event) => onDiscussionInputChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                onSendDiscussion();
              }
            }}
            rows={2}
            placeholder="开始输入..."
            className={`${composerClassName} min-h-[72px] resize-none`}
          />

          <button
            type="button"
            onClick={onSendDiscussion}
            disabled={!canSend}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            title="发送"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
};

export default KnowledgeBrowser;
