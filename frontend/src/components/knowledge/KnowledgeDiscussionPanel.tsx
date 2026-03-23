import type {
  KnowledgeDraftDTO,
  QuickCaptureRecordDTO,
} from "../../utils/api";
import { getNotesStudioCopy } from "../../pages/notesWorkspaceCopyState";
import { getKnowledgeStudioSections } from "../../pages/knowledgeWorkspaceShellState";
import TagInput from "../TagInput";

export interface KnowledgeCitationLike {
  id: string;
  title: string;
  content_kind?: "collected" | "generated";
  project_id?: string | null;
  category?: string | null;
}

interface KnowledgeDiscussionPanelProps {
  draft: KnowledgeDraftDTO | null;
  isSaving: boolean;
  saveError: string | null;
  generatedEntries: QuickCaptureRecordDTO[];
  appendTargetId: string | null;
  projectNameById: Record<string, string>;
  collapseLabel: string;
  onDraftChange: (draft: KnowledgeDraftDTO) => void;
  onSelectGeneratedEntry: (entryId: string) => void;
  onAppendTargetChange: (entryId: string | null) => void;
  onCreateGenerated: () => void;
  onAppendGenerated: () => void;
  onKeepChatOnly: () => void;
  onToggleCollapse: () => void;
}

const shellClassName =
  "relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(216,207,182,0.06),transparent_24%),linear-gradient(180deg,rgba(19,24,30,0.84),rgba(12,16,22,0.8))] text-white shadow-[0_28px_72px_rgba(15,23,42,0.24)] backdrop-blur-[22px]";

const fieldClassName =
  "w-full rounded-[18px] border border-white/[0.08] bg-white/[0.045] px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#d8cfb6]/25 focus:bg-white/[0.08]";

const formatTime = (value: string | undefined) => {
  if (!value) {
    return "刚刚";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
};

const formatEntryMeta = (
  entry: QuickCaptureRecordDTO,
  projectNameById: Record<string, string>
) => {
  const projectLabel = entry.project_id
    ? projectNameById[entry.project_id] ?? entry.project_id
    : "未归项目";
  const sourceCount = entry.source_capture_ids?.length ?? 0;
  return `${projectLabel}${sourceCount ? ` · ${sourceCount} 个来源` : ""}`;
};

const KnowledgeDiscussionPanel = ({
  draft,
  isSaving,
  saveError,
  generatedEntries,
  appendTargetId,
  projectNameById,
  collapseLabel,
  onDraftChange,
  onSelectGeneratedEntry,
  onAppendTargetChange,
  onCreateGenerated,
  onAppendGenerated,
  onKeepChatOnly,
  onToggleCollapse,
}: KnowledgeDiscussionPanelProps) => {
  const copy = getNotesStudioCopy();
  const sections = getKnowledgeStudioSections({
    hasDraft: Boolean(draft),
    generatedCount: generatedEntries.length,
    citationCount: 0,
  });
  const canAppend = Boolean(draft && appendTargetId) && !isSaving;

  return (
    <section className={shellClassName}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]" />
        <div className="absolute right-0 top-14 h-36 w-36 rounded-full bg-[#d8cfb6]/[0.04] blur-3xl" />
      </div>

      <div className="relative border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-medium tracking-[0.14em] text-slate-500">
            {copy.headerCaption}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400">
              {generatedEntries.length} 条
            </span>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.045] px-3 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08]"
              aria-label={collapseLabel}
              title={collapseLabel}
            >
              收起
            </button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {sections.includes("draft") && draft ? (
            <section className="rounded-[24px] border border-[#d8cfb6]/15 bg-[linear-gradient(180deg,rgba(216,207,182,0.11),rgba(255,255,255,0.035))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#efe6cf]/70">
                    当前草稿
                  </div>
                  <div className="mt-2 text-sm text-slate-200">
                    先在这里收口，再决定新建还是追加。
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onKeepChatOnly}
                    className="rounded-[14px] border border-white/[0.08] bg-white/[0.045] px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08]"
                >
                  取消
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  value={draft.title}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      title: event.target.value,
                    })
                  }
                  placeholder="标题"
                  className={fieldClassName}
                />

                <textarea
                  value={draft.content_markdown}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      content_markdown: event.target.value,
                    })
                  }
                  rows={8}
                  placeholder="正文"
                  className={`${fieldClassName} min-h-[180px] resize-y`}
                />

                <details className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-3 py-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-slate-200">
                    更多字段
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3">
                      <input
                        value={draft.project_id ?? ""}
                        onChange={(event) =>
                          onDraftChange({
                            ...draft,
                            project_id: event.target.value,
                          })
                        }
                        placeholder="项目"
                        className={fieldClassName}
                      />
                      <input
                        value={draft.category ?? ""}
                        onChange={(event) =>
                          onDraftChange({
                            ...draft,
                            category: event.target.value,
                          })
                        }
                        placeholder="类别"
                        className={fieldClassName}
                      />
                    </div>

                    <TagInput
                      tags={draft.tags}
                      onChange={(tags) =>
                        onDraftChange({
                          ...draft,
                          tags,
                        })
                      }
                      placeholder="添加标签"
                      autoMode={false}
                    />

                    <select
                      value={appendTargetId ?? ""}
                      onChange={(event) => onAppendTargetChange(event.target.value || null)}
                      className={fieldClassName}
                    >
                      <option value="">选择追加目标</option>
                      {generatedEntries.map((entry) => (
                        <option key={entry.id} value={entry.id} className="bg-slate-900 text-white">
                          {entry.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </details>

                {saveError ? (
                  <div className="rounded-[16px] border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                    {saveError}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onCreateGenerated}
                    disabled={isSaving}
                    className="inline-flex flex-1 items-center justify-center rounded-[18px] bg-[#f2efe6] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(242,239,230,0.16)] transition hover:bg-[#fbf7ec] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "处理中..." : "保存为新笔记"}
                  </button>
                  <button
                    type="button"
                    onClick={onAppendGenerated}
                    disabled={!canAppend}
                    className="inline-flex items-center justify-center rounded-[18px] border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    追加
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.035] p-3">
            <div className="flex items-center justify-between px-2 pb-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                {copy.generatedLabel}
              </div>
              <div className="rounded-full border border-white/[0.08] bg-black/10 px-2.5 py-1 text-[11px] text-slate-400">
                {generatedEntries.length}
              </div>
            </div>

            {generatedEntries.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">还没有生成内容</div>
            ) : (
              <div className="space-y-2">
                {generatedEntries.map((entry) => {
                  const active = appendTargetId === entry.id;

                  return (
                    <div
                      key={entry.id}
                      className={`rounded-[20px] border px-4 py-3 transition ${
                        active
                          ? "border-[#d8cfb6]/20 bg-[#d8cfb6]/10 shadow-[0_14px_30px_rgba(15,23,42,0.14)]"
                          : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] text-xs font-semibold ${
                            active
                              ? "bg-[#d8cfb6]/18 text-[#efe7d2]"
                              : "bg-white/[0.06] text-slate-300"
                          }`}
                        >
                          ✦
                        </span>

                        <button
                          type="button"
                          onClick={() => onSelectGeneratedEntry(entry.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="truncate text-sm font-medium text-slate-100">
                            {entry.title}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {formatEntryMeta(entry, projectNameById)}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-600">
                            {formatTime(
                              entry.discussion_metadata?.saved_at ||
                                entry.updated_at ||
                                entry.created_at
                            )}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => onAppendTargetChange(entry.id)}
                          className={`rounded-[14px] px-3 py-2 text-xs font-medium transition ${
                            active
                              ? "bg-[#f2efe6] text-slate-950"
                              : "border border-white/[0.08] bg-white/[0.045] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                          }`}
                        >
                          {active ? "当前目标" : "设为目标"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
};

export default KnowledgeDiscussionPanel;
