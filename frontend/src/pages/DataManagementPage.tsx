import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../utils/api"; // ✨ Use authenticated API client
import GlassCard from "../components/GlassCard";

// 图标
const Icons = {
  ArrowLeft: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" /><path d="M11.25 7.5v4.5a3 3 0 016 0v-4.5a.75.75 0 011.5 0z" /><path d="M4.5 15.75a7.5 7.5 0 0115 0v-4.5a.75.75 0 00-1.5 0v4.5a6 6 0 01-6 6z" /></svg>,
  Upload: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h6a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM13 5a1 1 0 011-1h6a1 1 0 011 1v3a1 1 0 01-1 1h-6a1 1 0 01-1-1V5z" clipRule="evenodd" /></svg>,
  FileText: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V10.5c0-.621-.504-1.125-1.125-1.125H7.5v8.625c0 .621.504 1.125 1.125 1.125zM12.75 9.375a.375.375 0 01-.375.375H7.5a.375.375 0 01-.375-.375V8.25h5.625v1.125zM18.375 2.625c0 .621-.504 1.125-1.125 1.125h-2.25a.375.375 0 01-.375-.375v-2.25a.375.375 0 01.375-.375h2.25c.621 0 1.125.504 1.125 1.125v2.25z" clipRule="evenodd" /></svg>,
  Chart: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h6a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM13 5a1 1 0 011-1h6a1 1 0 011 1v3a1 1 0 01-1 1h-6a1 1 0 01-1-1V5z" clipRule="evenodd" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 111.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 11-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 00-1.498-.058l-.347 9a.75.75 0 101.5.058l.345-9z" clipRule="evenodd" /></svg>,
  Clipboard: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10.5 3.75a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V3.75zM8.625 2.25A2.625 2.625 0 006 4.875v14.25A2.625 2.625 0 008.625 21.75h6.75A2.625 2.625 0 0018 19.125V4.875A2.625 2.625 0 0015.375 2.25h-6.75zM7.5 4.875A1.125 1.125 0 018.625 3.75h1.125v1.5c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125v-1.5h1.125A1.125 1.125 0 0116.5 4.875v14.25a1.125 1.125 0 01-1.125 1.125H8.625A1.125 1.125 0 017.5 19.125V4.875z" clipRule="evenodd" /></svg>,
};

interface DataStats {
  questions: number;
  mistakes: number;
  notes: number;
  folders: number;
}

function DataManagementPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get("/data/stats");
      setStats(res.data);
    } catch (error) {
      console.error("获取统计数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type, format = "json") => {
    setExporting(true);
    try {
      const endpoint = `/data/export/${type}`;
      const params = new URLSearchParams();
      if (format) params.append("format", format);

      const url = `${endpoint}?${params.toString()}`;

      // 创建下载链接
      const response = await apiClient.get(url, { responseType: "blob" });
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      alert(`✅ ${type} 导出成功！`);
    } catch (error) {
      const err = error as Error;
      console.error("导出失败:", error);
      alert(`❌ 导出失败: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (type) => {
    if (!importFile) {
      alert("请先选择要导入的文件");
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const endpoint = type === "all"
        ? "/data/import/backup"
        : "/data/import/questions";

      const response = await apiClient.post(
        endpoint,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            console.log(`上传进度: ${percentCompleted}%`);
          }
        }
      );

      if (response.data.success) {
        alert(`✅ 导入成功！\n导入记录: ${response.data.imported || 0} 条`);
        setImportFile(null);
        fetchStats(); // 刷新统计数据
      } else {
        alert("❌ 导入失败");
      }
    } catch (error) {
      const err = error as any;
      console.error("导入失败:", error);
      alert(`❌ 导入失败: ${err.response?.data?.detail || err.message}`);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans p-8" style={{ paddingTop: '12vh' }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-lg hover:scale-105 transition-all text-sm font-bold mb-6"
        >
          <Icons.ArrowLeft /> Back to Dashboard
        </button>

        <h1 className="text-4xl font-bold dark:text-white text-gray-900 mb-2">
          数据管理
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          导入、导出和管理你的学习数据
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 数据统计卡片 */}
        {stats && (
          <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <GlassCard className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.questions}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">题目总数</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.mistakes}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">错题记录</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.notes}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">笔记数量</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.folders}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">文件夹</div>
            </GlassCard>
          </div>
        )}

        {/* 导出功能 */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-500">
              <Icons.Download />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">导出数据</h2>
              <p className="text-sm text-gray-500">将数据导出为文件备份</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleExport("questions", "json")}
              disabled={exporting}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Icons.FileText />
                <div className="text-left">
                  <div className="font-bold text-gray-900 dark:text-gray-100">导出题库</div>
                  <div className="text-xs text-gray-500">JSON 格式，包含所有题目</div>
                </div>
              </div>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">JSON</span>
            </button>

            <button
              onClick={() => handleExport("mistakes", "json")}
              disabled={exporting}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 hover:border-red-400 dark:hover:border-red-500 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Icons.FileText />
                <div className="text-left">
                  <div className="font-bold text-gray-900 dark:text-gray-100">导出错题本</div>
                  <div className="text-xs text-gray-500">包含错题记录和历史</div>
                </div>
              </div>
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full">JSON</span>
            </button>

            <button
              onClick={() => handleExport("notes", "json")}
              disabled={exporting}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 hover:border-yellow-400 dark:hover:border-yellow-500 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Icons.FileText />
                <div className="text-left">
                  <div className="font-bold text-gray-900 dark:text-gray-100">导出笔记</div>
                  <div className="text-xs text-gray-500">Markdown 格式</div>
                </div>
              </div>
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full">MD</span>
            </button>

            <button
              onClick={() => handleExport("all", "json")}
              disabled={exporting}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl border-2 border-white/20 hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-white"
            >
              <div className="flex items-center gap-3">
                <Icons.Download />
                <div className="text-left">
                  <div className="font-bold">导出全部数据</div>
                  <div className="text-xs opacity-90">完整备份，包含所有数据</div>
                </div>
              </div>
              <Icons.Download />
            </button>
          </div>
        </GlassCard>

        {/* 导入功能 */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/20 rounded-2xl text-green-500">
              <Icons.Upload />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">导入数据</h2>
              <p className="text-sm text-gray-500">从备份文件恢复数据</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 文件选择 */}
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setImportFile(file);
                }}
                className="w-full p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-green-400 dark:hover:border-green-500 transition-all cursor-pointer"
              />
              {importFile && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  已选择: <span className="font-bold">{importFile.name}</span>
                </div>
              )}
            </div>

            {/* 导入按钮 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleImport("questions")}
                disabled={!importFile || importing}
                className="p-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-xl font-bold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                导入题库
              </button>
              <button
                onClick={() => handleImport("all")}
                disabled={!importFile || importing}
                className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:bg-gray-400 text-white rounded-xl font-bold transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                恢复备份
              </button>
            </div>

            {importing && (
              <div className="text-center py-4">
                <div className="inline-block animate-pulse text-green-600 dark:text-green-400 font-bold">
                  导入中...
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* 使用指南 */}
        <GlassCard className="md:col-span-2 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-500">
              <Icons.Chart />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">使用指南</h2>
            </div>
          </div>

          <div className="prose prose-sm max-w-none dark:prose-invert">
            <h3>📤 导出功能</h3>
            <ul>
              <li><strong>题库导出</strong>: 导出所有题目为 JSON 格式，包含题干、选项、答案等完整信息</li>
              <li><strong>错题本导出</strong>: 导出错题记录和答题历史，用于复习和统计</li>
              <li><strong>笔记导出</strong>: 导出笔记为 Markdown 格式，便于在其他地方查看</li>
              <li><strong>全部数据</strong>: 一键导出所有数据，建议定期备份</li>
            </ul>

            <h3>📥 导入功能</h3>
            <ul>
              <li><strong>题库导入</strong>: 从 JSON 文件批量导入题目，支持单选、多选、填空等题型</li>
              <li><strong>恢复备份</strong>: 从完整备份文件恢复所有数据，请谨慎操作</li>
            </ul>

            <h3>💡 提示</h3>
            <ul>
              <li>建议每周至少备份一次数据</li>
              <li>导入前会验证数据格式，确保文件完整</li>
              <li>大文件导入可能需要较长时间，请耐心等待</li>
            </ul>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default DataManagementPage;
