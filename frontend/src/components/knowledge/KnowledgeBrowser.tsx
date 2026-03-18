import MarkdownCard from "../MarkdownCard";
import type { QuickCaptureRecordDTO } from "../../utils/api";

interface KnowledgeBrowserProps {
  listTitle: string;
  entries: QuickCaptureRecordDTO[];
  visibleEntries: QuickCaptureRecordDTO[];
  selectedEntryId: string | null;
  selectedEntryIds: string[];
  selectedEntry: QuickCaptureRecordDTO | null;
  projectNameById: Record<string, string>;
  searchInput: string;
  activeSearchQuery: string;
  isLoading: boolean;
  loadError: string | null;
  onSearchInputChange: (value: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  onRefresh: () => void;
  onSelectEntry: (entryId: string) => void;
  onToggleEntrySelection: (entryId: string) => void;
}

const panelClassName =
  "rounded-[28px] border border-white/45 bg-white/82 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-white/12 dark:bg-slate-950/72";

const inputClassName =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-white/25 dark:focus:ring-white/10";

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
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getEntryContent = (entry: QuickCaptureRecordDTO | null) => {
  if (!entry) {
    return "";
  }

  return (
    entry.normalized_markdown ||
    entry.summary ||
    entry.discussion_metadata?.assistant_reply_excerpt ||
    ""
  );
};

const KnowledgeBrowser = ({
  listTitle,
  entries,
  visibleEntries,
  selectedEntryId,
  selectedEntryIds,
  selectedEntry,
  projectNameById,
  searchInput,
  activeSearchQuery,
  isLoading,
  loadError,
  onSearchInputChange,
  onApplySearch,
  onClearSearch,
  onRefresh,
  onSelectEntry,
  onToggleEntrySelection,
}: KnowledgeBrowserProps) => {
  const selectedCount = selectedEntryIds.length;
  const totalCount = entries.length;
  const showingSearch = activeSearchQuery.trim().length > 0;

  return (
    <section className={`${panelClassName} flex h-full min-h-0 flex-col gap-4`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            Browser
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {listTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            当前 {visibleEntries.length} 条，已选 {selectedCount} 条
            {showingSearch ? `，检索词「${activeSearchQuery}」` : `，总库存 ${totalCount} 条`}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          刷新列表
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onApplySearch();
            }
          }}
          placeholder="在当前知识范围内检索..."
          className={`${inputClassName} min-w-[220px] flex-1`}
        />
        <button
          type="button"
          onClick={onApplySearch}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          检索
        </button>
        <button
          type="button"
          onClick={onClearSearch}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          清空
        </button>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {loadError}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.1fr)_minmax(260px,0.95fr)] gap-4">
        <div className="min-h-0 overflow-y-auto rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-white/[0.04]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              正在加载知识条目...
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-slate-300/80 px-6 text-center text-sm leading-6 text-slate-500 dark:border-white/10 dark:text-slate-400">
              当前范围内还没有内容。你可以先从左边导入文本、链接或文件。
            </div>
          ) : (
            <div className="space-y-3">
              {visibleEntries.map((entry) => {
                const active = entry.id === selectedEntryId;
                const checked = selectedEntryIds.includes(entry.id);
                const projectLabel =
                  entry.project_id ? projectNameById[entry.project_id] ?? entry.project_id : "未归项目";

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSelectEntry(entry.id)}
                    className={`w-full rounded-[22px] border p-4 text-left transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:border-white dark:bg-white dark:text-slate-950"
                        : "border-slate-200/80 bg-white/95 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <label
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          active
                            ? "border-white/50 bg-white/10 dark:border-slate-300 dark:bg-slate-200/60"
                            : "border-slate-300 bg-white dark:border-white/20 dark:bg-white/5"
                        }`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleEntrySelection(entry.id)}
                          className="h-3.5 w-3.5 accent-slate-900 dark:accent-white"
                        />
                      </label>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">{entry.title}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              active
                                ? "bg-white/15 text-white dark:bg-slate-900/10 dark:text-slate-800"
                                : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                            }`}
                          >
                            {entry.content_kind === "generated" ? "生成" : entry.source_type}
                          </span>
                          {entry.category ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                active
                                  ? "bg-white/15 text-white/80 dark:bg-slate-900/10 dark:text-slate-700"
                                  : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                              }`}
                            >
                              {entry.category}
                            </span>
                          ) : null}
                        </div>

                        <p className={`mt-2 line-clamp-3 text-sm leading-6 ${active ? "text-white/80 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}>
                          {entry.summary || "暂无摘要"}
                        </p>

                        <div className={`mt-3 flex flex-wrap items-center gap-2 text-[11px] ${active ? "text-white/70 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"}`}>
                          <span>{projectLabel}</span>
                          <span>·</span>
                          <span>{formatTime(entry.updated_at || entry.created_at)}</span>
                          {entry.content_kind === "generated" && entry.source_capture_ids?.length ? (
                            <>
                              <span>·</span>
                              <span>来源 {entry.source_capture_ids.length} 条</span>
                            </>
                          ) : null}
                        </div>

                        {entry.tags?.length ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {entry.tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className={`rounded-full px-2 py-0.5 text-[11px] ${
                                  active
                                    ? "bg-white/15 text-white/85 dark:bg-slate-900/10 dark:text-slate-700"
                                    : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          {selectedEntry ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                    Preview
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    {selectedEntry.title}
                  </h3>
                </div>

                <div className="text-right text-xs leading-6 text-slate-500 dark:text-slate-400">
                  <div>{selectedEntry.project_id ? projectNameById[selectedEntry.project_id] ?? selectedEntry.project_id : "未归项目"}</div>
                  <div>{selectedEntry.category || "未分类"}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/10">
                  {selectedEntry.content_kind === "generated" ? "生成内容" : selectedEntry.source_type}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/10">
                  更新时间 {formatTime(selectedEntry.updated_at || selectedEntry.created_at)}
                </span>
                {selectedEntry.tags?.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/10">
                    {tag}
                  </span>
                ))}
              </div>

              {getEntryContent(selectedEntry) ? (
                <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-slate-950/55">
                  <MarkdownCard content={getEntryContent(selectedEntry)} />
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-300/80 px-5 py-10 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  这条内容还没有可展示的正文，当前只保留了摘要信息。
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[22px] border border-dashed border-slate-300/80 px-6 text-center text-sm leading-6 text-slate-500 dark:border-white/10 dark:text-slate-400">
              从上面的列表里选一条内容，就可以在这里查看详细内容并送去右侧讨论。
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default KnowledgeBrowser;
