import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import GlassCard from "../components/GlassCard";
import { apiClient } from "../utils/api"; // ✅ 修复：导入 apiClient 以自动添加 token

const Icons = {
  Gear: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Key: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
  Check: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
  Robot: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Save: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  Trash: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Import: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-3-3m3 3l3-3M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" /></svg>,
  Database: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><ellipse cx="12" cy="5" rx="8" ry="3"/><path strokeLinecap="round" strokeLinejoin="round" d="M4 5v6c0 1.657 3.582 3 8 3s8-1.343 8-3V5"/><path strokeLinecap="round" strokeLinejoin="round" d="M4 11v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6"/></svg>,
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { showSettings, setShowSettings } = useTheme();
  const toast = useToast();

  // AI配置状态
  const [aiConfig, setAiConfig] = useState<{
    provider: string;
    openai: { apiKey: string; baseURL: string; model: string };
    deepseek: { apiKey: string; baseURL: string; model: string };
    openclaw: { model: string; thinking: string; agent: string };
    custom: { apiKey: string; baseURL: string; model: string };
  }>({
    provider: "local", // local | openai | deepseek | custom
    openai: {
      apiKey: "",
      baseURL: "https://api.openai.com/v1",
      model: "gpt-4o-mini"
    },
    deepseek: {
      apiKey: "",
      baseURL: "https://api.deepseek.com/v1",
      model: "deepseek-chat"
    },
    openclaw: {
      model: "zai/glm-5",
      thinking: "low",
      agent: "main"
    },
    custom: {
      apiKey: "",
      baseURL: "",
      model: ""
    }
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await apiClient.get("/ai/config");
        if (response.data?.success && response.data?.config) {
          setAiConfig(response.data.config);
          localStorage.setItem("ai_config", JSON.stringify(response.data.config));
          return;
        }
      } catch (error) {
        console.error("Failed to load AI config from backend:", error);
      }

      const saved = localStorage.getItem("ai_config");
      if (!saved) return;

      try {
        setAiConfig(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load AI config from localStorage:", error);
      }
    };

    void loadConfig();
  }, []);

  const saveConfig = async () => {
    try {
      setSaving(true);

      // 保存到本地存储
      localStorage.setItem("ai_config", JSON.stringify(aiConfig));

      // 发送到后端
      await apiClient.post("/ai/config", aiConfig);

      toast.success("✅ 配置已保存");
    } catch (error: any) {
      console.error("Failed to save config:", error);
      toast.error("❌ 保存失败: " + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const response = await apiClient.post("/ai/test", {
        provider: aiConfig.provider,
        config: aiConfig[aiConfig.provider as keyof typeof aiConfig]
      });

      if (response.data.success) {
        setTestResult({
          success: true,
          message: "✅ 连接成功！模型响应正常"
        });
        toast.success("✅ 连接测试成功");
      } else {
        throw new Error(response.data.detail || "测试失败");
      }
    } catch (error: any) {
      console.error("Test failed:", error);
      setTestResult({
        success: false,
        message: "❌ " + (error.response?.data?.detail || error.message)
      });
      toast.error("❌ 连接测试失败");
    } finally {
      setTesting(false);
    }
  };

  const clearConfig = () => {
    if (confirm("确定要清除API密钥吗？")) {
      const newConfig = { ...aiConfig };
      const provider = aiConfig.provider as keyof typeof aiConfig;
      if (typeof newConfig[provider] === 'object' && newConfig[provider] !== null && 'apiKey' in newConfig[provider]) {
        (newConfig[provider] as any).apiKey = "";
      }
      setAiConfig(newConfig);
      toast.info("ℹ️ API密钥已清除");
    }
  };

  const handleProviderChange = (provider: string) => {
    setAiConfig(prev => ({ ...prev, provider }));
  };

  const handleConfigChange = (field: string, value: string) => {
    setAiConfig(prev => {
      const provider = prev.provider as keyof typeof prev;
      const providerConfig = prev[provider];
      if (typeof providerConfig === 'object' && providerConfig !== null) {
        return {
          ...prev,
          [provider]: {
            ...providerConfig,
            [field]: value
          }
        };
      }
      return prev;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={() => setShowSettings(false)}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden"
      >
        <GlassCard className="p-0">
          {/* 标题栏 */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                <Icons.Gear />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">设置</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">自定义AI模型和系统配置</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
            >
              ✕
            </button>
          </div>

          {/* 内容区域 */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* AI配置部分 */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Icons.Robot />
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">AI模型配置</h3>
              </div>

              {/* 提供商选择 */}
              <div className="mb-6">
                <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI提供商
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: "local", name: "本地模型", desc: "免费，无需API" },
                    { id: "openai", name: "OpenAI", desc: "GPT-4o等" },
                    { id: "deepseek", name: "DeepSeek", desc: "性价比高" },
                    { id: "openclaw", name: "OpenClaw", desc: "本机命令行代理" },
                    { id: "custom", name: "自定义", desc: "其他兼容API" }
                  ].map(provider => (
                    <button
                      type="button"
                      key={provider.id}
                      onClick={() => handleProviderChange(provider.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        aiConfig.provider === provider.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="font-semibold text-gray-800 dark:text-white text-sm">
                        {provider.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {provider.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* API配置表单 */}
              {aiConfig.provider !== "local" && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-white/10">
                  {aiConfig.provider !== "openclaw" && (
                    <>
                      <div>
                        <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <div className="flex items-center gap-2">
                            <Icons.Key />
                            API Key
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={(aiConfig[aiConfig.provider as keyof typeof aiConfig] as any).apiKey || ""}
                            onChange={(e) => handleConfigChange("apiKey", e.target.value)}
                            placeholder="sk-..."
                            className="flex-1 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 dark:text-white text-sm"
                          />
                          <button
                            type="button"
                            onClick={clearConfig}
                            className="px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                            title="清除"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          您的密钥将安全存储在本地，不会上传到其他服务器
                        </p>
                      </div>

                      <div>
                        <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Base URL
                        </div>
                        <input
                          type="text"
                          value={(aiConfig[aiConfig.provider as keyof typeof aiConfig] as any).baseURL || ""}
                          onChange={(e) => handleConfigChange("baseURL", e.target.value)}
                          placeholder="https://api.example.com/v1"
                          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 dark:text-white text-sm font-mono"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          API的完整基础URL路径
                        </p>
                      </div>
                    </>
                  )}

                  {/* Model Name */}
                  <div>
                    <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      模型名称
                    </div>
                    <input
                      type="text"
                      value={(aiConfig[aiConfig.provider as keyof typeof aiConfig] as any).model || ""}
                      onChange={(e) => handleConfigChange("model", e.target.value)}
                      placeholder="gpt-4o-mini"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 dark:text-white text-sm font-mono"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      要使用的模型名称
                    </p>
                  </div>

                  {aiConfig.provider === "openclaw" && (
                    <div>
                      <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Thinking
                      </div>
                      <select
                        value={aiConfig.openclaw.thinking}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, openclaw: { ...prev.openclaw, thinking: e.target.value } }))}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg text-gray-800 dark:text-white text-sm"
                      >
                        <option value="off">off</option>
                        <option value="minimal">minimal</option>
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </div>
                  )}

                  {aiConfig.provider === "openclaw" && (
                    <div>
                      <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Agent
                      </div>
                      <input
                        type="text"
                        value={aiConfig.openclaw.agent}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, openclaw: { ...prev.openclaw, agent: e.target.value } }))}
                        placeholder="main"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg text-gray-800 dark:text-white text-sm"
                      />
                    </div>
                  )}

                  {/* 测试连接 */}
                  <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={testConnection}
                      disabled={testing || (aiConfig.provider !== "openclaw" && aiConfig.provider !== "local" && !(aiConfig[aiConfig.provider as keyof typeof aiConfig] as any).apiKey)}
                      className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                    >
                      {testing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          测试中...
                        </>
                      ) : (
                        <>
                          <Icons.Check />
                          测试连接
                        </>
                      )}
                    </button>

                    {/* 测试结果 */}
                    {testResult && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-3 p-3 rounded-lg text-sm ${
                          testResult.success
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {testResult.message}
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* 本地模式提示 */}
              {aiConfig.provider === "local" && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ℹ️ 本地模式使用规则引擎生成讲解，无需API密钥。功能相对简单，但完全免费且保护隐私。
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    如需更智能的讲解，请配置OpenAI或DeepSeek API。
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-white/10 pt-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">工具入口</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    navigate('/ai-import');
                  }}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-white/10 hover:border-purple-400 dark:hover:border-purple-400/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">
                      <Icons.Import />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-white">AI 导入题目</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">JSON 批量导入 / 图片上传</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    navigate('/data-management');
                  }}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-400/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300">
                      <Icons.Database />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-white">数据管理</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">导入、导出和管理数据</div>
                    </div>
                  </div>
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                AI 导入与数据管理已从首页移动到这里。
              </p>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              type="button"
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all flex items-center gap-2 disabled:cursor-not-allowed text-sm font-medium shadow-lg"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Icons.Save />
                  保存配置
                </>
              )}
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

export default SettingsPage;
