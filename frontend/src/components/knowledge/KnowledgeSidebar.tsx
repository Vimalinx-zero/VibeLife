import TagInput from "../TagInput";
import type { KnowledgeWorkshopNormalizedFilters } from "../../pages/knowledgeWorkshopState";

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
  isImporting: boolean;
  importError: string | null;
  onFiltersChange: (patch: Partial<KnowledgeWorkshopNormalizedFilters>) => void;
  onImportDraftChange: (draft: KnowledgeImportDraft) => void;
  onSubmitImport: () => void;
}

const contentTabs = [
  { value: "collected", label: "收集内容", hint: "网页、文本、图片与文件导入" },
  { value: "generated", label: "生成内容", hint: "AI 整理后的结构化笔记" },
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

const panelClassName =
  "rounded-[28px] border border-white/45 bg-white/78 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-white/12 dark:bg-slate-950/72";

const inputClassName =
  "w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-white/25 dark:focus:ring-white/10";

const buttonClassName =
  "inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm font-medium transition";

const KnowledgeSidebar = ({
  filters,
  projectOptions,
  categoryOptions,
  importDraft,
  isImporting,
  importError,
  onFiltersChange,
  onImportDraftChange,
  onSubmitImport,
}: KnowledgeSidebarProps) => {
  const updateImportDraft = (patch: Partial<KnowledgeImportDraft>) => {
    onImportDraftChange({
      ...importDraft,
      ...patch,
    });
  };

  return (
    <aside className={`${panelClassName} flex h-full min-h-0 flex-col gap-5`}>
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          Knowledge Workshop
        </div>
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white">
            知识工作室
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">
            一套统一知识库，左边负责导入和筛选，中间浏览内容，右边直接和 AI 讨论并决定是否写回生成笔记。
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {contentTabs.map((tab) => {
            const active = filters.contentKind === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onFiltersChange({ contentKind: tab.value })}
                className={`${buttonClassName} flex-col items-start gap-1 rounded-[22px] px-4 py-3 text-left ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:border-white dark:bg-white dark:text-slate-950"
                    : "border-slate-200/80 bg-white/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                }`}
              >
                <span className="text-sm font-semibold">{tab.label}</span>
                <span className={`text-[11px] leading-5 ${active ? "text-white/75 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}>
                  {tab.hint}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">筛选范围</h2>
          <button
            type="button"
            onClick={() =>
              onFiltersChange({
                projectId: null,
                category: null,
              })
            }
            className="text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            清空
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              项目
            </span>
            <input
              list="knowledge-project-options"
              value={filters.projectId ?? ""}
              onChange={(event) =>
                onFiltersChange({
                  projectId: event.target.value.trim() || null,
                })
              }
              placeholder="全部项目"
              className={inputClassName}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              类别
            </span>
            <input
              list="knowledge-category-options"
              value={filters.category ?? ""}
              onChange={(event) =>
                onFiltersChange({
                  category: event.target.value.trim() || null,
                })
              }
              placeholder="全部类别"
              className={inputClassName}
            />
          </label>
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
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">导入到知识库</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              支持文本、链接、PDF / doc / md / txt 和图片。导入后会进入统一检索。
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {importModes.map((mode) => {
            const active = importDraft.mode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => updateImportDraft({ mode: mode.value })}
                className={`${buttonClassName} rounded-2xl ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              标题
            </span>
            <input
              value={importDraft.title}
              onChange={(event) => updateImportDraft({ title: event.target.value })}
              placeholder="留空会自动取默认标题"
              className={inputClassName}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                项目
              </span>
              <input
                list="knowledge-project-options"
                value={importDraft.projectId}
                onChange={(event) => updateImportDraft({ projectId: event.target.value })}
                placeholder="可留空"
                className={inputClassName}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                类别
              </span>
              <input
                list="knowledge-category-options"
                value={importDraft.category}
                onChange={(event) => updateImportDraft({ category: event.target.value })}
                placeholder="例如：研究 / 素材 / 复盘"
                className={inputClassName}
              />
            </label>
          </div>

          {importDraft.mode === "text" && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                文本内容
              </span>
              <textarea
                value={importDraft.textContent}
                onChange={(event) => updateImportDraft({ textContent: event.target.value })}
                rows={8}
                placeholder="把你想收进知识库的原文、笔记、摘录直接贴进来。"
                className={`${inputClassName} min-h-[180px] resize-y`}
              />
            </label>
          )}

          {importDraft.mode === "url" && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                链接
              </span>
              <input
                value={importDraft.url}
                onChange={(event) => updateImportDraft({ url: event.target.value })}
                placeholder="https://example.com/article"
                className={inputClassName}
              />
            </label>
          )}

          {importDraft.mode === "file" && (
            <div className="space-y-3">
              <div className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  文件
                </span>
                <label className="flex min-h-[112px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-white/80 px-4 py-5 text-center transition hover:border-slate-400 hover:bg-white dark:border-white/15 dark:bg-white/[0.06] dark:hover:border-white/25 dark:hover:bg-white/[0.08]">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-100">
                    {importDraft.file ? importDraft.file.name : "点击选择文件"}
                  </span>
                  <span className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    支持 PDF、doc、md、txt 和图片。导入后会统一建立索引。
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) =>
                      updateImportDraft({
                        file: event.target.files?.[0] ?? null,
                      })
                    }
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  文件类型
                </span>
                <select
                  value={importDraft.fileSourceType}
                  onChange={(event) => updateImportDraft({ fileSourceType: event.target.value })}
                  className={inputClassName}
                >
                  {fileTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              标签
            </span>
            <TagInput
              tags={importDraft.tags}
              onChange={(tags) => updateImportDraft({ tags })}
              placeholder="输入标签，回车确认"
              autoMode={false}
            />
          </div>

          {importError ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {importError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onSubmitImport}
            disabled={isImporting}
            className="inline-flex w-full items-center justify-center rounded-[22px] bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {isImporting ? "正在导入..." : "导入到知识库"}
          </button>
        </div>
      </section>
    </aside>
  );
};

export default KnowledgeSidebar;
