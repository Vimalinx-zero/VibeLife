import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getNotesChatChromeState } from "../../pages/notesWorkspaceLayoutState";
import type { KnowledgeDiscussionMessageDTO } from "../../utils/api";

interface NotesKnowledgeCitationLike {
  id: string;
  title: string;
}

interface NotesKnowledgeChatPanelProps {
  contextLabel: string;
  messages: KnowledgeDiscussionMessageDTO[];
  citations: NotesKnowledgeCitationLike[];
  discussionInput: string;
  isDiscussing: boolean;
  onDiscussionInputChange: (value: string) => void;
  onSendDiscussion: () => void;
  onSelectCitation: (citationId: string) => void;
}

const shellClassName =
  "relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(245,242,232,0.08),transparent_26%),linear-gradient(180deg,rgba(19,24,30,0.86),rgba(12,16,22,0.82))] text-white shadow-[0_30px_80px_rgba(15,23,42,0.26)] backdrop-blur-[22px]";

const composerClassName =
  "w-full rounded-[20px] border border-white/[0.08] bg-white/[0.045] px-4 py-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#d8cfb6]/30 focus:bg-white/[0.08]";

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
};

const NotesKnowledgeChatPanel = ({
  contextLabel,
  messages,
  citations,
  discussionInput,
  isDiscussing,
  onDiscussionInputChange,
  onSendDiscussion,
  onSelectCitation,
}: NotesKnowledgeChatPanelProps) => {
  const chrome = getNotesChatChromeState();
  const canSend = discussionInput.trim().length > 0 && !isDiscussing;
  const lastAssistantIndex = [...messages]
    .map((message, index) => (message.role === "assistant" ? index : -1))
    .filter((index) => index >= 0);
  const latestAssistantIndex =
    lastAssistantIndex.length > 0 ? lastAssistantIndex[lastAssistantIndex.length - 1] : undefined;

  return (
    <section className={shellClassName}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
        <div className="absolute -left-20 top-16 h-44 w-44 rounded-full bg-[#d8cfb6]/[0.05] blur-3xl" />
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {chrome.showLocationMeta ? (
          <div className="mb-5 flex">
            <div className="inline-flex max-w-full items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium tracking-[0.08em] text-slate-400">
              <span className="truncate">{contextLabel}</span>
            </div>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[260px] items-center justify-center text-center">
            <div className="max-w-[520px] rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-6 py-8">
              <div className="text-[1.05rem] font-medium text-slate-100">开始围绕当前来源提问</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const showCitations = !isUser && index === latestAssistantIndex && citations.length > 0;

              return (
                <div
                  key={`${message.role}-${index}-${message.content.slice(0, 20)}`}
                  className={`rounded-[20px] border px-4 py-4 ${
                    isUser
                      ? "ml-auto max-w-[80%] border-white/[0.08] bg-[linear-gradient(135deg,rgba(242,239,230,0.18),rgba(242,239,230,0.08))] shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
                      : "max-w-[90%] border-white/[0.08] bg-white/[0.045]"
                  }`}
                >
                  <div className={`text-sm leading-7 ${isUser ? "text-slate-100" : "text-slate-200"}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {showCitations ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {citations.map((citation) => (
                        <button
                          key={citation.id}
                          type="button"
                          onClick={() => onSelectCitation(citation.id)}
                          className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300 transition hover:border-[#d8cfb6]/25 hover:bg-[#d8cfb6]/10 hover:text-white"
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

      <div className="relative border-t border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-6 py-5">
        <div className="flex items-end gap-3">
          <textarea
            value={discussionInput}
            onChange={(event) => onDiscussionInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSendDiscussion();
              }
            }}
            rows={3}
            placeholder="围绕当前笔记或当前文件夹继续提问"
            className={`${composerClassName} min-h-[88px] resize-none`}
          />
          <button
            type="button"
            onClick={onSendDiscussion}
            disabled={!canSend}
            className="shrink-0 rounded-[18px] bg-[#f2efe6] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(242,239,230,0.16)] transition hover:bg-[#fbf7ec] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDiscussing ? "发送中..." : "发送"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default NotesKnowledgeChatPanel;
