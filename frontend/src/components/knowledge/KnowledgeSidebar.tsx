import TagInput from "../TagInput";
import type { QuickCaptureRecordDTO } from "../../utils/api";
import type { KnowledgeWorkshopNormalizedFilters } from "../../pages/knowledgeWorkshopState";
import {
  getKnowledgeImportPanelMode,
  getKnowledgeImportPanelSummary,
} from "../../pages/knowledgeWorkspaceShellState";

export interface KnowledgeSidebarProjectOption {
  id: string;
  name: string;
}

export interface KnowledgeImportDraft {
  mode: "text" | "url" | "file";
  title: string;
  projectId: string;
  category: string;
  tags: string[];
  textContent: string;
  url: string;
  file: File | null;
  fileSourceType: string;
}

interface KnowledgeSidebarProps {
  filters: KnowledgeWorkshopNormalizedFilters;
  projectOptions: KnowledgeSidebarProjectOption[];
  categoryOptions: string[];
  importDraft: KnowledgeImportDraft;
  visibleEntries: QuickCaptureRecordDTO[];
  selectedEntryId: string | null;
  selectedEntryIds: string[];
  projectNameById: Record<string, string>;
  searchInput: string;
  activeSearchQuery: string;
  isLoading: boolean;
  loadError: string | null;
  isImporting: boolean;
  importError: string | null;
  isImportPanelOpen: boolean;
  onImportPanelOpenChange: (open: boolean) => void;
  onFiltersChange: (patch: Partial<KnowledgeWorkshopNormalizedFilters>) => void;
  onImportDraftChange: (draft: KnowledgeImportDraft) => void;
  onSearchInputChange: (value: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  onRefresh: () => void;
  onSelectEntry: (entryId: string) => void;
  onToggleEntrySelection: (entryId: string) => void;
  onSubmitImport: () => void;
}

const contentTabs = [
  { value: "collected", label: "收集来源" },
  { value: "generated", label: "生成内容" },
] as const;

const importModes = [
  { value: "text", label: "文本" },
  { value: "url", label: "链接" },
  { value: "file", label: "文件" },
] as const;

const fileTypeOptions = [
  { value: "txt", label: "TXT" },
  { value: "md", label: "Markdown" },
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "文档" },
  { value: "image", label: "图片" },
];

const shellClassName =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#31343b] bg-[#1d2025] text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)]";

const darkInputClassName =
  "w-full rounded-[16px] border border-[#353840] bg-[#252931] px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#565b66] focus:bg-[#2a2f38]";

const mutedButtonClassName =
  "inline-flex items-center justify-center rounded-[14px] border border-[#353840] bg-[#252931] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-[#4b505c] hover:bg-[#2b3038] hover:text-white";

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

const getSourceTypeLabel = (entry: QuickCaptureRecordDTO) => {
  if (entry.content_kind === "generated") {
    return "生成";
  }

  switch (entry.source_type) {
    case "url":
      return "链接";
    case "file":
      return "文件";
    case "image":
      return "图片";
    default:
      return "文本";
  }
};

const KnowledgeSidebar = ({
  filters,
  projectOptions,
  categoryOptions,
  importDraft,
  visibleEntries,
  selectedEntryId,
  selectedEntryIds,
  projectNameById,
  searchInput,
  activeSearchQuery,
  isLoading,
  loadError,
  isImporting,
  importError,
  isImportPanelOpen,
  onImportPanelOpenChange,
  onFiltersChange,
  onImportDraftChange,
  onSearchInputChange,
  onApplySearch,
  onClearSearch,
  onRefresh,
  onSelectEntry,
  onToggleEntrySelection,
  onSubmitImport,
}: KnowledgeSidebarProps) => {
  const updateImportDraft = (patch: Partial<KnowledgeImportDraft>) => {
    onImportDraftChange({
      ...importDraft,
      ...patch,
    });
  };

  const hasPendingTitle = importDraft.title.trim().length > 0;
  const hasPendingSource =
    importDraft.mode === "text"
      ? importDraft.textContent.trim().length > 0
      : importDraft.mode === "url"
        ? importDraft.url.trim().length > 0
        : Boolean(importDraft.file);
  const hasPendingTags = importDraft.tags.length > 0;
  const hasPendingFile = Boolean(importDraft.file);

  const importPanelMode = getKnowledgeImportPanelMode({
    expanded: isImportPanelOpen,
    hasPendingTitle,
    hasPendingSource,
    hasPendingTags,
    hasPendingFile,
  });
  const importPanelSummary = getKnowledgeImportPanelSummary({
    expanded: isImportPanelOpen,
    hasPendingTitle,
    hasPendingSource,
    hasPendingTags,
    hasPendingFile,
  });

  return (
    <aside className={shellClassName}>
      <div className="border-b border-[#2b2f36] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-white">来源</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-[#353840] bg-[#252931] text-slate-300 transition hover:border-[#4b505c] hover:text-white"
              title="刷新来源"
            >
              ↻
            </button>
            <button
              type="button"
              onClick={() => onImportPanelOpenChange(!isImportPanelOpen)}
              className={`inline-flex items-center justify-center rounded-[14px] px-3 py-2 text-sm font-medium transition ${
                importPanelMode === "compact-dirty"
                  ? "border border-emerald-400/20 bg-emerald-400/12 text-emerald-100"
                  : "border border-[#353840] bg-[#252931] text-slate-200 hover:border-[#4b505c] hover:text-white"
              }`}
            >
              导入
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {contentTabs.map((tab) => {
            const active = filters.contentKind === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onFiltersChange({ contentKind: tab.value })}
                className={`rounded-[14px] px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-white text-slate-950"
                    : "border border-[#353840] bg-[#252931] text-slate-300 hover:border-[#4b505c] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onApplySearch();
              }
            }}
            placeholder="搜索来源"
            className={`${darkInputClassName} flex-1`}
          />
          {searchInput ? (
            <button type="button" onClick={onClearSearch} className={mutedButtonClassName}>
              清空
            </button>
          ) : null}
        </div>

        <details className="mt-3 group">
          <summary className="cursor-pointer list-none text-xs text-slate-400 transition hover:text-slate-200">
            {activeSearchQuery ? `当前检索：${activeSearchQuery}` : "项目 / 类别筛选"}
          </summary>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">项目</span>
              <input
                list="knowledge-project-options"
                value={filters.projectId ?? ""}
                onChange={(event) =>
                  onFiltersChange({
                    projectId: event.target.value.trim() || null,
                  })
                }
                placeholder="全部项目"
                className={darkInputClassName}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">类别</span>
              <input
                list="knowledge-category-options"
                value={filters.category ?? ""}
                onChange={(event) =>
                  onFiltersChange({
                    category: event.target.value.trim() || null,
                  })
                }
                placeholder="全部类别"
                className={darkInputClassName}
              />
            </label>
          </div>
        </details>
      </div>

      {isImportPanelOpen ? (
        <div className="border-b border-[#2b2f36] bg-[#191c21] px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">导入来源</div>
              <div className="mt-1 text-xs text-slate-500">{importPanelSummary}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {importModes.map((mode) => {
                const active = importDraft.mode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => updateImportDraft({ mode: mode.value })}
                    className={`rounded-[14px] px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-white text-slate-950"
                        : "border border-[#353840] bg-[#252931] text-slate-300 hover:border-[#4b505c] hover:text-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>

            <input
              value={importDraft.title}
              onChange={(event) => updateImportDraft({ title: event.target.value })}
              placeholder="标题"
              className={darkInputClassName}
            />

            <div className="grid gap-3">
              <input
                list="knowledge-project-options"
                value={importDraft.projectId}
                onChange={(event) => updateImportDraft({ projectId: event.target.value })}
                placeholder="项目"
                className={darkInputClassName}
              />
              <input
                list="knowledge-category-options"
                value={importDraft.category}
                onChange={(event) => updateImportDraft({ category: event.target.value })}
                placeholder="类别"
                className={darkInputClassName}
              />
            </div>

            {importDraft.mode === "text" ? (
              <textarea
                value={importDraft.textContent}
                onChange={(event) => updateImportDraft({ textContent: event.target.value })}
                rows={6}
                placeholder="粘贴文本"
                className={`${darkInputClassName} min-h-[132px] resize-y`}
              />
            ) : null}

            {importDraft.mode === "url" ? (
              <input
                value={importDraft.url}
                onChange={(event) => updateImportDraft({ url: event.target.value })}
                placeholder="https://..."
                className={darkInputClassName}
              />
            ) : null}

            {importDraft.mode === "file" ? (
              <div className="space-y-3">
                <select
                  value={importDraft.fileSourceType}
                  onChange={(event) => updateImportDraft({ fileSourceType: event.target.value })}
                  className={darkInputClassName}
                >
                  {fileTypeOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  type="file"
                  onChange={(event) =>
                    updateImportDraft({
                      file: event.target.files?.[0] ?? null,
                    })
                  }
                  className="block w-full cursor-pointer rounded-[16px] border border-dashed border-[#3b4049] bg-[#252931] px-3 py-3 text-sm text-slate-300 file:mr-3 file:rounded-[12px] file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                />

                {importDraft.file ? (
                  <div className="rounded-[16px] border border-[#353840] bg-[#252931] px-3 py-2 text-xs text-slate-400">
                    {importDraft.file.name}
                  </div>
                ) : null}
              </div>
            ) : null}

            <TagInput
              tags={importDraft.tags}
              onChange={(tags) => updateImportDraft({ tags })}
              placeholder="添加标签"
              autoMode={false}
            />

            {importError ? (
              <div className="rounded-[16px] border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                {importError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={onSubmitImport}
              disabled={isImporting}
              className="inline-flex w-full items-center justify-center rounded-[16px] bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isImporting ? "导入中..." : "导入"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-b border-[#2b2f36] px-4 py-3 text-xs text-slate-400">
        <span>{activeSearchQuery ? `命中 ${visibleEntries.length}` : `${visibleEntries.length} 个来源`}</span>
        <span>已选 {selectedEntryIds.length}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loadError ? (
          <div className="rounded-[16px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {loadError}
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            正在加载来源...
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-[18px] border border-dashed border-[#343841] px-6 text-center text-sm leading-6 text-slate-500">
            暂无来源
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleEntries.map((entry) => {
              const active = entry.id === selectedEntryId;
              const checked = selectedEntryIds.includes(entry.id);
              const meta = entry.project_id
                ? projectNameById[entry.project_id] ?? entry.project_id
                : getSourceTypeLabel(entry);

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectEntry(entry.id)}
                  className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition ${
                    active
                      ? "bg-[#2a2f38] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                      : "hover:bg-[#242830]"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[#2e3440] text-xs font-semibold text-slate-300">
                    {entry.content_kind === "generated" ? "G" : "S"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-100">{entry.title}</div>
                    <div className="mt-1 truncate text-[11px] text-slate-500">
                      {meta}
                      {entry.updated_at || entry.created_at ? ` · ${formatTime(entry.updated_at || entry.created_at)}` : ""}
                    </div>
                  </div>

                  <label
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-emerald-300 bg-emerald-300 text-slate-950"
                        : "border-[#4c525f] bg-transparent"
                    }`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleEntrySelection(entry.id)}
                      className="sr-only"
                    />
                    {checked ? "✓" : null}
                  </label>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <datalist id="knowledge-project-options">
        {projectOptions.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </datalist>

      <datalist id="knowledge-category-options">
        {categoryOptions.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </aside>
  );
};

export default KnowledgeSidebar;
