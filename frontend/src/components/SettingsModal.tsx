import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { apiClient } from "../utils/api";
import HotkeysSettings from "./HotkeysSettings";

// AI配置内容组件
const AISettingsContent = ({ toast }: { toast: { success: (msg: string) => void; error: (msg: string) => void } }) => {
  const [aiConfig, setAiConfig] = useState({
    provider: "local",
    ollama: { baseURL: "http://localhost:11434", model: "qwen:7b" },
    openai: { apiKey: "", baseURL: "https://api.openai.com/v1", model: "gpt-4o-mini" },
    deepseek: { apiKey: "", baseURL: "https://api.deepseek.com/v1", model: "deepseek-chat" },
    openclaw: { model: "rightcodes/gpt-5.4", thinking: "low", agent: "vibelife" },
    custom: { apiKey: "", baseURL: "", model: "" }
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // 先从后端加载配置
    const loadConfig = async () => {
      try {
        const response = await axios.get(`${window.__VIBELIFE_API_ORIGIN__}/api/ai/config`);
        if (response.data.success) {
          setAiConfig(response.data.config);
        }
      } catch (error) {
        console.error('Failed to load AI config:', error);
        // 如果后端加载失败，从 localStorage 加载
        const saved = localStorage.getItem("ai_config");
        if (saved) {
          try { setAiConfig(JSON.parse(saved)); } catch (e) {}
        }
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async () => {
    try {
      setSaving(true);
      localStorage.setItem("ai_config", JSON.stringify(aiConfig));
      await axios.post(`${window.__VIBELIFE_API_ORIGIN__}/api/ai/config`, aiConfig);
      toast.success("✅ 配置已保存");
    } catch (error) {
      const err = error as any;
      toast.error("❌ 保存失败: " + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const response = await axios.post(`${window.__VIBELIFE_API_ORIGIN__}/api/ai/test`, {
        provider: aiConfig.provider,
        config: aiConfig[aiConfig.provider]
      });
      if (response.data.success) {
        setTestResult({ success: true, message: "✅ 连接成功！模型响应正常" });
        toast.success("✅ 连接测试成功");
      }
    } catch (error) {
      const err = error as any;
      setTestResult({ success: false, message: "❌ " + (err.response?.data?.detail || err.message) });
      toast.error("❌ 连接测试失败");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 提供商选择 */}
      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">AI提供商</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: "local", name: "本地模型", desc: "免费，无需API" },
            { id: "openai", name: "OpenAI", desc: "GPT-4o等" },
            { id: "deepseek", name: "DeepSeek", desc: "性价比高" },
            { id: "openclaw", name: "OpenClaw", desc: "本机命令行代理" },
            { id: "custom", name: "自定义", desc: "其他兼容API" }
          ].map(provider => (
            <button
              key={provider.id}
              onClick={() => setAiConfig(prev => ({ ...prev, provider: provider.id }))}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                aiConfig.provider === provider.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
              }`}
            >
              <div className="font-semibold text-gray-800 dark:text-white text-sm">{provider.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{provider.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* API配置 */}
      {aiConfig.provider !== "local" && (
        <div className="space-y-4 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-white/10">
          {aiConfig.provider !== "openclaw" && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">API Key</label>
                <input
                  type="password"
                  value={(aiConfig[aiConfig.provider] as any).apiKey || ""}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, [prev.provider]: { ...(prev[prev.provider] as any), apiKey: e.target.value } }))}
                  placeholder="sk-..."
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">密钥将安全存储在本地</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Base URL</label>
                <input
                  type="text"
                  value={(aiConfig[aiConfig.provider] as any).baseURL || ""}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, [prev.provider]: { ...(prev[prev.provider] as any), baseURL: e.target.value } }))}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg text-sm font-mono"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">模型名称</label>
            <input
              type="text"
              value={(aiConfig[aiConfig.provider] as any).model || ""}
              onChange={(e) => setAiConfig(prev => ({ ...prev, [prev.provider]: { ...(prev[prev.provider] as any), model: e.target.value } }))}
              placeholder="gpt-4o-mini"
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg text-sm font-mono"
            />
          </div>

          {aiConfig.provider === "openclaw" && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Thinking</label>
                <select
                  value={aiConfig.openclaw.thinking}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, openclaw: { ...prev.openclaw, thinking: e.target.value } }))}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg text-sm"
                >
                  <option value="off">off</option>
                  <option value="minimal">minimal</option>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Agent</label>
                <input
                  type="text"
                  value={aiConfig.openclaw.agent}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, openclaw: { ...prev.openclaw, agent: e.target.value } }))}
                  placeholder="vibelife"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg text-sm"
                />
              </div>
            </>
          )}

          <div className="pt-3 border-t border-gray-200 dark:border-white/10 flex gap-3">
            <button
              onClick={testConnection}
              disabled={testing || (aiConfig.provider !== "openclaw" && !(aiConfig[aiConfig.provider] as any).apiKey)}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium disabled:cursor-not-allowed"
            >
              {testing ? "测试中..." : "测试连接"}
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium disabled:cursor-not-allowed"
            >
              {saving ? "保存中..." : "保存配置"}
            </button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg text-sm ${
              testResult.success ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              {testResult.message}
            </div>
          )}
        </div>
      )}

      {aiConfig.provider === "local" && (
        <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
          <p className="text-sm text-blue-700 dark:text-blue-300">ℹ️ 本地模式使用规则引擎生成讲解，无需API密钥。功能相对简单，但完全免费且保护隐私。</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">如需更智能的讲解，请配置OpenAI或DeepSeek API。</p>
        </div>
      )}
    </div>
  );
};


// --- 图标定义 (保持不变) ---
const Icons = {
  Xmark: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>,
  Palette: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-.983a1.125 1.125 0 010 1.966h-5.69c-.309 0-.542-.29-.459-.587l1.07-3.745a1.125 1.125 0 012.296 0l1.07 3.745c.083.297-.15.587-.459.587h-.455M12 6a2.25 2.25 0 00-2.25 2.25v.094c0 .534.13.943.233 1.226.167.458.36.815.516 1.103.13.24.242.449.242.683 0 .234-.112.443-.242.683-.156.288-.35.645-.516 1.103-.103.283-.233.692-.233 1.226v.094A2.25 2.25 0 0012 18h.75a2.25 2.25 0 002.25-2.25v-.094c0-.534-.13-.943-.233-1.226-.167-.458-.36-.815-.516-1.103-.13-.24-.242-.449-.242-.683 0-.234.112-.443.242-.683.156-.288.35-.645.516-1.103.103-.283.233-.692.233-1.226V9.75A2.25 2.25 0 0012.75 6H12z" clipRule="evenodd" /></svg>,
  User: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>,
  Clock: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>,
  Type: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M2.273 5.625A4.483 4.483 0 015.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 3H5.25a3 3 0 00-2.977 2.625zM2.273 8.625A4.483 4.483 0 015.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 6H5.25a3 3 0 00-2.977 2.625zM5.25 9a3 3 0 00-3 3v2.25a3 3 0 003 3h13.5a3 3 0 003-3V12a3 3 0 00-3-3H5.25zM2.25 17.25a3 3 0 013-3h13.5a3 3 0 013 3v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3v-2.25z" /></svg>,
  Database: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875zM21 11.625c0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875v-3.375c2.474 1.527 5.62 2.381 9 2.381s6.526-.854 9-2.381v3.375zM21 16.875c0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875v-3.375c2.474 1.527 5.62 2.381 9 2.381s6.526-.854 9-2.381v3.375z" /></svg>,
  Robot: ({className}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Sun: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" /></svg>,
  Moon: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" /></svg>,
  Download: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 011.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zM2.25 12a.75.75 0 00-.75.75v6a1.5 1.5 0 001.5 1.5h16.5a1.5 1.5 0 001.5-1.5v-6a.75.75 0 00-1.5 0v6c0 .828-.672 1.5-1.5 1.5h-16.5c-.828 0-1.5-.672-1.5-1.5v-6a.75.75 0 00-.75-.75z" clipRule="evenodd" /></svg>,
  Upload: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M3 16.5v3.75c0 1.242 1.008 2.25 2.25 2.25h16.5c1.242 0 2.25-1.008 2.25-2.25V16.5a.75.75 0 01-1.5 0v3.75c0 .414-.336.75-.75.75H5.25a.75.75 0 01-.75-.75V16.5a.75.75 0 00-1.5 0zM12 14.25a.75.75 0 01.75-.75V2.566l3.22 3.22a.75.75 0 101.06-1.06l-4.5-4.5a.75.75 0 01-1.06 0l-4.5 4.5a.75.75 0 001.06 1.06l3.22-3.22V13.5a.75.75 0 01.75.75z" clipRule="evenodd" /></svg>,
  FileText: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M14.25 2.26a.75.75 0 00-.53-.22H4.5A2.25 2.25 0 002.25 4.5v15a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V6.26a.75.75 0 00-.22-.53l-3-3zm.53 1.04l2.5 2.5H15a.75.75 0 01-.75.75V3.31zM5.25 4.5a.75.75 0 01.75-.75h6.75v3a.75.75 0 01.75.75h3v11.25a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V4.5zM9.75 11a.75.75 0 000 1.5h6a.75.75 0 000-1.5h-6zM9.75 15a.75.75 0 000 1.5h6a.75.75 0 000-1.5h-6z" /></svg>,
  ChartBar: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" clipRule="evenodd" /></svg>,
  Refresh: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903c.37.37.556.876.44 1.332-.22l3.72-3.72a.75.75 0 00-.22-1.331l-3.72-3.72a.75.75 0 00-1.332.22l-1.903 1.903a7.5 7.5 0 00-10.236 2.005l-3.414 3.414c-.37.37-.556.876-.44 1.332.22l2.853 2.853a.75.75 0 00.22 1.332l-3.72 3.72a.75.75 0 00.22 1.331l3.72 3.72a.75.75 0 001.332-.22l1.903-1.903a7.5 7.5 0 003.364-10.548l-2.853-2.853a.75.75 0 00-1.332.22l-.22 1.332z" clipRule="evenodd" /></svg>,
  Keyboard: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M2.25 4.875c0-.621.504-1.125 1.125-1.125h16.5c.621 0 1.125.504 1.125 1.125v12c0 .621-.504 1.125-1.125 1.125H3.375c-.621 0-1.125-.504-1.125-1.125v-12zm4.875 2.625a.75.75 0 01.75-.75h8.25a.75.75 0 010 1.5h-8.25a.75.75 0 01-.75-.75zm0 3.75a.75.75 0 01.75-.75h8.25a.75.75 0 010 1.5h-8.25a.75.75 0 01-.75-.75zm0 3.75a.75.75 0 01.75-.75h8.25a.75.75 0 010 1.5h-8.25a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>,
};

const SettingsModal = () => {
  // --- [Step 2.1] 接入大脑：获取所有全局状态 ---
  const {
      showSettings, setShowSettings,
      isDark, setIsDark, bgOptions, changeBackground,
      profile, setProfile,                 // 获取个人资料状态
      focusSettings, setFocusSettings,     // 获取专注设置状态
      editorSettings, setEditorSettings    // 获取编辑器设置状态
  } = useTheme();

  const { user, logout } = useAuth();  // ✨ 新增：获取认证用户信息
  const toast = useToast();

   const [activeTab, setActiveTab] = useState("profile");  // ✨ 改为默认打开 profile
   const [stats, setStats] = useState<{ notes: number; folders: number } | null>(null);
   const [loading, setLoading] = useState(false);

  // ✨ 新增：修改密码状态
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // ✨ 新增：头像选择器状态
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);  // ✨ 自定义头像（base64）
  const avatarSeeds = [
    'alex', 'bailey', 'bear', 'bob', 'calvin', 'cheers', 'cody', 'dolly',
    'felix', 'garfield', 'george', 'hannah', 'jack', 'jessie', 'kitty',
    'leo', 'lily', 'max', 'mia', 'milo', 'nala', 'oliver', 'pepper',
    'quinn', 'riley', 'sadie', 'sam', 'shadow', 'tigger', 'uzi',
    'whiskers', 'zoey', 'adventurer', 'bottts', 'micah'
  ];

  // ✨ 新增：处理自定义头像上传
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('❌ 请选择图片文件');
      return;
    }

    // 验证文件大小（最大5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.error('❌ 图片大小不能超过5MB');
      return;
    }

    // 读取并转换图片
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      const result = e.target.result;
      const base64 = typeof result === 'string' ? result : null;
      if (!base64) return;
      setCustomAvatar(base64);

      // ✨ 保存到localStorage
      const updatedProfile = {
        ...profile,
        avatar: 'custom',
        customAvatar: base64  // 保存base64图片数据
      };
      setProfile(updatedProfile);
      localStorage.setItem('profile', JSON.stringify(updatedProfile));

      setShowAvatarPicker(false);
      toast.success('✅ 自定义头像已上传');
    };
    reader.onerror = () => {
      toast.error('❌ 图片读取失败');
    };
    reader.readAsDataURL(file);
  };

  // ✨ 新增：获取当前头像URL
  const getCurrentAvatarUrl = (): string => {
    if (customAvatar) return customAvatar;
    if (profile.avatar === 'custom') return customAvatar || 'default';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatar || user?.username || 'default'}`;
  };

  // ✨ 新增：修改密码处理
  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("新密码至少6位");
      return;
    }

    try {
      setChangingPassword(true);
      await apiClient.post("/auth/change-password", {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      });
      toast.success("密码修改成功！");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error("密码修改失败: " + (error.response?.data?.detail || error.message));
      } else {
        const err = error as Error;
        toast.error("密码修改失败: " + err.message);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // 数据管理函数
  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/data/stats');
      setStats({
        notes: response.data?.notes ?? 0,
        folders: response.data?.folders ?? 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleExport = async (type) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/data/export/${type}`, {
        responseType: 'blob'
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vibelife_${type}_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(type === 'notes' ? '笔记导出成功！' : `${type} 导出成功！`);
    } catch (error) {
      const err = error as Error;
      toast.error(`导出失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 切换到数据标签时加载统计
  useEffect(() => {
    if (activeTab === 'data') {
      fetchStats();
    }
  }, [activeTab]);

  const tabs = [
    { id: "profile", name: "通用", icon: Icons.User },
    { id: "focus", name: "专注", icon: Icons.Clock },
    { id: "editor", name: "编辑器", icon: Icons.Type },
    { id: "ai", name: "AI", icon: Icons.Robot },
    { id: "theme", name: "主题", icon: Icons.Palette },
    { id: "hotkeys", name: "快捷键", icon: Icons.Keyboard },
    { id: "data", name: "数据", icon: Icons.Database },
  ];

  return (
    <AnimatePresence>
      {showSettings && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", bounce: 0.3 }}
                className="relative w-full max-w-4xl h-[600px] flex overflow-hidden
                           dark:bg-[#1a1a1a]/95 bg-white/95 backdrop-blur-2xl 
                           border dark:border-white/10 border-white/50 rounded-3xl shadow-2xl"
            >
                {/* 侧边栏 */}
                <div className="w-64 shrink-0 border-r dark:border-white/10 border-gray-200 p-6 flex flex-col bg-gray-50/50 dark:bg-black/20">
                    <h2 className="text-2xl font-bold mb-8 flex items-center gap-2 dark:text-white text-gray-800 tracking-tight">Settings</h2>
                    <div className="space-y-2 flex-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                                    activeTab === tab.id 
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                            >
                                <tab.icon className="w-5 h-5" />
                                {tab.name}
                            </button>
                        ))}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-600 text-center font-mono">v1.0.0 VibeLife</div>
                </div>

                {/* 右侧内容 */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="h-16 flex items-center justify-end px-6 shrink-0">
                        <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors group">
                            <Icons.Xmark className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                {/* --- [Step 2.2] 激活：个人资料 --- */}
                                {activeTab === 'profile' && (
                                    <>
                                        <h3 className="text-3xl font-bold dark:text-white text-gray-900 mb-6">个人资料</h3>

                                        {/* 用户信息卡片 */}
                                        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-500/10 dark:to-blue-500/10 border dark:border-white/5 mb-6">
                                            <div className="flex items-center gap-6">
                                                {/* 头像 */}
                                                <div className="relative">
                                                    <div
                                                        className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-xl overflow-hidden cursor-pointer hover:opacity-80 transition ring-4 ring-white dark:ring-gray-800"
                                                        onClick={() => setShowAvatarPicker(true)}
                                                        title="点击更换头像"
                                                    >
                                                        <img src={getCurrentAvatarUrl()}
                                                             alt="avatar" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs shadow-lg cursor-pointer hover:bg-blue-600"
                                                         onClick={() => setShowAvatarPicker(true)}>
                                                        🎨
                                                    </div>
                                                </div>

                                                {/* 基本信息 */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <input
                                                            type="text"
                                                            value={profile.name || user?.username || "用户"}
                                                            onChange={(e) => setProfile({...profile, name: e.target.value})}
                                                            className="text-2xl font-bold dark:text-white bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-colors"
                                                            placeholder="输入显示名称"
                                                        />
                                                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                                                            可编辑
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                                        <div className="flex items-center gap-2">
                                                            <span className="opacity-50">用户名:</span>
                                                            <span className="font-mono font-medium dark:text-gray-300">{user?.username || "未登录"}</span>
                                                        </div>
                                                         <div className="flex items-center gap-2">
                                                             <span className="opacity-50">邮箱:</span>
                                                             <span className="font-mono dark:text-gray-300">{(user as any)?.email || "未设置"}</span>
                                                         </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="opacity-50">用户ID:</span>
                                                            <span className="font-mono text-xs opacity-75">{user?.id || "—"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ✨ 头像选择器弹窗 */}
                                        <AnimatePresence>
                                            {showAvatarPicker && (
                                                <>
                                                    {/* 背景遮罩 */}
                                                    <div
                                                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]"
                                                        onClick={() => setShowAvatarPicker(false)}
                                                    />
                                                    {/* 选择器内容 */}
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none"
                                                    >
                                                        <div
                                                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-hidden pointer-events-auto"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {/* 标题栏 */}
                                                            <div className="flex items-center justify-between mb-6">
                                                                <h4 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                                                                    <span>🎨</span>
                                                                    选择你的头像
                                                                </h4>
                                                                <button
                                                                    onClick={() => setShowAvatarPicker(false)}
                                                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>

                                                            {/* 头像网格 */}
                                                            <div className="grid grid-cols-6 gap-4 overflow-y-auto custom-scrollbar max-h-[60vh] p-2">
                                                                {avatarSeeds.map((seed) => (
                                                                    <button
                                                                        key={seed}
                                                                        onClick={() => {
                                                                            setCustomAvatar(null);  // 清除自定义头像
                                                                            setProfile({...profile, avatar: seed});
                                                                            setShowAvatarPicker(false);
                                                                            toast.success("✅ 头像已更新");
                                                                        }}
                                                                        className={`group relative aspect-square rounded-2xl overflow-hidden border-3 transition-all hover:scale-110 ${
                                                                            !customAvatar && (profile.avatar || user?.username || 'default') === seed
                                                                                ? 'border-blue-500 ring-4 ring-blue-500/30'
                                                                                : 'border-gray-200 dark:border-white/10 hover:border-blue-300'
                                                                        }`}
                                                                    >
                                                                        <img
                                                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                                                                            alt={seed}
                                                                            className="w-full h-full object-cover bg-gray-50 dark:bg-white/5"
                                                                        />
                                                                        {/* 选中指示器 */}
                                                                        {!customAvatar && (profile.avatar || user?.username || 'default') === seed && (
                                                                            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs shadow-lg">
                                                                                ✓
                                                                            </div>
                                                                        )}
                                                                        {/* 悬停提示 */}
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                                                                            <span className="text-white text-xs font-medium capitalize">{seed}</span>
                                                                        </div>
                                                                    </button>
                                                                ))}

                                                                {/* ✨ 自定义头像上传按钮 */}
                                                                <label className="group relative aspect-square rounded-2xl overflow-hidden border-3 transition-all hover:scale-110 cursor-pointer border-dashed border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={handleAvatarUpload}
                                                                        className="hidden"
                                                                    />
                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                                                                        <div className="text-3xl mb-1">📷</div>
                                                                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold text-center leading-tight">上传<br/>图片</div>
                                                                    </div>
                                                                    {/* 已上传自定义头像 */}
                                                                    {customAvatar && (
                                                                        <>
                                                                            <img src={customAvatar} alt="Custom" className="absolute inset-0 w-full h-full object-cover" />
                                                                            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs shadow-lg">
                                                                                ✓
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </label>
                                                            </div>

                                                            {/* 提示 */}
                                                            <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                                💡 点击预设头像或上传自己的图片（支持 JPG、PNG、GIF，最大5MB）
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>

                                        {/* 修改密码 */}
                                        <div className="mb-6 p-6 rounded-2xl bg-gray-50 dark:bg-white/5 border dark:border-white/5">
                                            <h4 className="font-bold dark:text-white mb-4 flex items-center gap-2">
                                                <span className="text-xl">🔒</span>
                                                修改密码
                                            </h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        当前密码
                                                    </label>
                                                    <input
                                                        type="password"
                                                        value={passwordForm.currentPassword}
                                                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                                                        className="w-full px-4 py-2 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                                        placeholder="••••••"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            新密码
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={passwordForm.newPassword}
                                                            onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                                            className="w-full px-4 py-2 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                                            placeholder="至少6位"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            确认新密码
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={passwordForm.confirmPassword}
                                                            onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                                                            className="w-full px-4 py-2 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                                            placeholder="再次输入"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleChangePassword}
                                                    disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                                                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium rounded-lg transition disabled:cursor-not-allowed"
                                                >
                                                    {changingPassword ? "修改中..." : "确认修改密码"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* 账户操作 */}
                                        <div className="p-6 rounded-2xl border-2 border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
                                            <h4 className="font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                                                <span className="text-xl">⚠️</span>
                                                危险操作
                                            </h4>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium dark:text-white">退出登录</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">清除本地认证信息</div>
                                                </div>
                                                <button
                                                    onClick={logout}
                                                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition"
                                                >
                                                    退出登录
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* --- [Step 2.2] 激活：专注设置 --- */}
                                {activeTab === 'focus' && (
                                    <>
                                        <h3 className="text-3xl font-bold dark:text-white text-gray-900">专注定时器</h3>
                                        <div className="space-y-6">
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <label className="font-bold dark:text-gray-300">专注时长</label>
                                                    <span className="font-mono text-blue-500 font-bold">{focusSettings.duration} min</span>
                                                </div>
                                                <input 
                                                    type="range" min="1" max="60" step="1" 
                                                    value={focusSettings.duration} // ✅ 绑定: 时长
                                                    onChange={(e) => setFocusSettings({...focusSettings, duration: parseInt(e.target.value)})} // ✅ 更新
                                                    className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                                                />
                                            </div>
                                            <div 
                                                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition"
                                                onClick={() => setFocusSettings({...focusSettings, autoBreak: !focusSettings.autoBreak})} // ✅ 更新: 开关
                                            >
                                                <div>
                                                    <div className="font-bold dark:text-white">自动休息</div>
                                                    <div className="text-xs text-gray-500">专注结束后自动进入休息倒计时</div>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full relative transition-colors ${focusSettings.autoBreak ? 'bg-blue-500' : 'bg-gray-300 dark:bg-white/20'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${focusSettings.autoBreak ? 'right-1' : 'left-1'}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* --- [Step 2.3] 激活：编辑器设置 --- */}
                                {activeTab === 'editor' && (
                                    <>
                                        <h3 className="text-3xl font-bold dark:text-white text-gray-900">编辑器</h3>
                                        <div className="space-y-6">
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <label className="font-bold dark:text-gray-300">字体大小</label>
                                                    <span className="font-mono text-blue-500 font-bold">{editorSettings.fontSize}px</span>
                                                </div>
                                                <input 
                                                    type="range" min="12" max="32" step="1" 
                                                    value={editorSettings.fontSize} // ✅ 绑定: 字号
                                                    onChange={(e) => setEditorSettings({...editorSettings, fontSize: parseInt(e.target.value)})} // ✅ 更新
                                                    className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {(['Sans', 'Serif', 'Mono'] as const).map(font => (
                                                    <button
                                                        key={font}
                                                        onClick={() => setEditorSettings({...editorSettings, fontFamily: font})} // ✅ 更新: 字体
                                                        className={`p-3 rounded-xl border dark:border-white/10 font-bold text-sm transition-colors ${
                                                            editorSettings.fontFamily === font
                                                            ? 'bg-blue-500 text-white border-blue-500'
                                                            : 'bg-gray-50 dark:bg-white/5 dark:text-white hover:border-blue-500'
                                                        }`}
                                                    >
                                                        {font}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* --- AI配置设置 (新增) --- */}
                                {activeTab === 'ai' && (
                                    <>
                                        <h3 className="text-3xl font-bold dark:text-white text-gray-900 mb-6">AI模型配置</h3>
                                        <AISettingsContent toast={toast} />
                                    </>
                                )}

                                {/* --- 主题设置 (已激活) --- */}
                                {activeTab === 'theme' && (
                                    <>
                                        <h3 className="text-3xl font-bold dark:text-white text-gray-900">外观 & 主题</h3>
                                        <div className="space-y-8">
                                            <div>
                                                <h4 className="text-sm font-bold uppercase tracking-wider opacity-50 mb-4 dark:text-white text-gray-800">色彩模式</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button onClick={() => setIsDark(false)} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${!isDark ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 dark:text-gray-300'}`}>
                                                        <Icons.Sun className="w-6 h-6" /> <span className="font-bold">Light</span>
                                                    </button>
                                                    <button onClick={() => setIsDark(true)} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${isDark ? 'bg-gray-800 border-purple-500 text-white ring-2 ring-purple-500/20' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600'}`}>
                                                        <Icons.Moon className="w-6 h-6" /> <span className="font-bold">Dark</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold uppercase tracking-wider opacity-50 mb-4 dark:text-white text-gray-800">沉浸式壁纸</h4>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {bgOptions.map((opt, idx) => (
                                                        <button key={idx} onClick={() => changeBackground(opt)} className="aspect-video rounded-xl border-2 border-transparent hover:border-blue-500 transition relative overflow-hidden shadow-sm hover:shadow-xl group" style={{ background: opt.value.includes('url') ? opt.value : opt.value, backgroundSize: 'cover' }}>
                                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition"/>
                                                            <span className="absolute bottom-1 left-2 text-[10px] text-white font-bold shadow-black drop-shadow-md opacity-80">{opt.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* --- 数据管理 --- */}
                                {activeTab === 'data' && (
                                    <>
                                        <h3 className="text-3xl font-bold dark:text-white text-gray-900 mb-6">数据管理</h3>

                                        {/* 数据统计 */}
                                        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-500/10 dark:to-purple-500/10 border border-blue-100 dark:border-blue-500/20">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-bold dark:text-white flex items-center gap-2">
                                                    <Icons.ChartBar className="w-5 h-5 text-blue-500" />
                                                    数据统计
                                                </h4>
                                                <button
                                                    onClick={fetchStats}
                                                    className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition"
                                                    title="刷新"
                                                >
                                                    <Icons.Refresh className="w-4 h-4 dark:text-white" />
                                                </button>
                                            </div>
                                            {stats ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="text-center">
                                                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.notes}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">笔记</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.folders}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">文件夹</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500 dark:text-gray-400">加载中...</div>
                                            )}
                                        </div>

                                        {/* 导出功能 */}
                                        <div className="mb-8">
                                            <h4 className="font-bold dark:text-white mb-4 flex items-center gap-2">
                                                <Icons.Download className="w-5 h-5 text-green-500" />
                                                导出数据
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={() => handleExport('notes')}
                                                    disabled={loading}
                                                    className="p-4 rounded-xl border dark:border-white/10 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-500 dark:hover:border-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <div className="font-bold dark:text-white">笔记</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">导出所有笔记</div>
                                                </button>
                                                <div className="p-4 rounded-xl border dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                                                    <div>
                                                        <div className="font-bold dark:text-white">说明</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">当前仅保留笔记数据导出。</div>
                                                    </div>
                                                    <Icons.FileText className="w-5 h-5 text-blue-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 危险区域 */}
                                        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                                            <h4 className="text-red-600 dark:text-red-400 font-bold mb-2">危险区域</h4>
                                            <p className="text-sm text-red-500/80 mb-4">重置将清空所有本地缓存和配置，此操作无法撤销。</p>
                                            <button
                                                onClick={() => {
                                                    localStorage.clear();
                                                    window.location.reload();
                                                }}
                                                className="px-4 py-2 bg-white dark:bg-black/20 text-red-500 font-bold rounded-lg border border-red-200 dark:border-red-500/30 text-sm hover:bg-red-50 transition"
                                            >
                                                重置应用
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* --- 快捷键设置 --- */}
                                {activeTab === 'hotkeys' && (
                                    <>
                                        <h3 className="text-3xl font-bold dark:text-white text-gray-900 mb-6">快捷键设置</h3>
                                        <HotkeysSettings />
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
