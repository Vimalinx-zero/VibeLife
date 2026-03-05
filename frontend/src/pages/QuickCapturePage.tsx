import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { quickCaptureAPI, type QuickCaptureRecordDTO } from "../utils/api";

const sourceTypes = [
  { value: "url", label: "链接" },
  { value: "image", label: "图片" },
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "文档" },
  { value: "video", label: "视频" }
];

const QuickCapturePage = () => {
  const navigate = useNavigate();
  const [sourceType, setSourceType] = useState("url");
  const [sourceUri, setSourceUri] = useState("");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [records, setRecords] = useState<QuickCaptureRecordDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; score: number; title: string; summary: string; tags: string[]; source_type: string; project_id: string | null }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => sourceUri.trim().length > 0, [sourceUri]);

  const loadRecords = async () => {
    const list = await quickCaptureAPI.list(projectId || undefined);
    setRecords(list);
  };

  const handleCapture = async () => {
    if (!canSubmit) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await quickCaptureAPI.capture({
        source_type: sourceType,
        source_uri: sourceUri.trim(),
        title: title.trim() || undefined,
        project_id: projectId.trim() || undefined
      });
      setSourceUri("");
      setTitle("");
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "采集失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await quickCaptureAPI.search(q);
      setSearchResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "搜索失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden">
      <main className="max-w-[1600px] h-full mx-auto px-6 py-8" style={{ paddingTop: "8vh" }}>
        <div className="h-full grid grid-cols-1 xl:grid-cols-3 gap-5">
          <section className="xl:col-span-1 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-white/30 dark:border-white/10 backdrop-blur-2xl p-5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm text-gray-500 hover:text-indigo-500"
            >
              ← 返回
            </button>

            <h1 className="text-xl font-bold mt-2 dark:text-white text-gray-900">随手笔记采集</h1>
            <p className="text-xs text-gray-500 mt-1">支持链接、图片、PDF、文档、视频，自动格式化并写入本地知识库。</p>

            <div className="space-y-3 mt-5">
              <select
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value)}
                className="w-full rounded-lg px-3 py-2 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm"
              >
                {sourceTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                value={sourceUri}
                onChange={(event) => setSourceUri(event.target.value)}
                placeholder="输入 URL 或本地文件路径"
                className="w-full rounded-lg px-3 py-2 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm"
              />

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="标题（可选）"
                className="w-full rounded-lg px-3 py-2 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm"
              />

              <input
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                placeholder="项目ID（可选）"
                className="w-full rounded-lg px-3 py-2 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm"
              />

              <button
                type="button"
                disabled={!canSubmit || loading}
                onClick={handleCapture}
                className="w-full rounded-lg px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "处理中..." : "采集并入库"}
              </button>
            </div>

            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
          </section>

          <section className="xl:col-span-2 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-white/30 dark:border-white/10 backdrop-blur-2xl p-5 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="在本地知识库检索..."
                className="flex-1 rounded-lg px-3 py-2 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-lg px-3 py-2 bg-black/5 dark:bg-white/10 text-sm"
              >
                检索
              </button>
              <button
                type="button"
                onClick={loadRecords}
                className="rounded-lg px-3 py-2 bg-black/5 dark:bg-white/10 text-sm"
              >
                刷新
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 flex-1">
              <div className="rounded-xl border border-white/30 dark:border-white/10 p-3 overflow-auto">
                <p className="text-sm font-semibold mb-2 dark:text-white text-gray-900">已入库记录</p>
                <div className="space-y-2">
                  {records.map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/30 dark:border-white/10 p-3 bg-white/40 dark:bg-black/20">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold dark:text-white text-gray-900 truncate">{item.title}</p>
                        <span className="text-[11px] text-gray-500">{item.source_type}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags?.map((tag) => (
                          <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/30 dark:border-white/10 p-3 overflow-auto">
                <p className="text-sm font-semibold mb-2 dark:text-white text-gray-900">索引检索结果</p>
                <div className="space-y-2">
                  {searchResults.map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/30 dark:border-white/10 p-3 bg-white/40 dark:bg-black/20">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold dark:text-white text-gray-900 truncate">{item.title}</p>
                        <span className="text-[11px] text-gray-500">score {item.score.toFixed(3)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default QuickCapturePage;
