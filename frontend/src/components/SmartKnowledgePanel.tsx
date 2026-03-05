import { useState, useEffect } from "react";
import axios from "axios";
import KnowledgeNetworkTab from "./knowledge/KnowledgeNetworkTab";
import AIInsightTab from "./knowledge/AIInsightTab";
import QuickActionsBar from "./knowledge/QuickActionsBar";

const Icons = {
  Link: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  Sparkles: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  Network: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="3" /><path d="M12 9V3" /><path d="M12 15v6" /><path d="M9 12H3" /><path d="M15 12h6" /><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>,
};

/**
 * 智能知识面板 - 合并 Knowledge 和 AI Explain
 *
 * 功能：
 * - Tab 1: 关系网络 - 显示已建立的连接和发现的关联
 * - Tab 2: AI洞察 - AI总结、要点、建议、自测
 * - 底部: 快捷操作 - 创建卡片、智能推荐等
 *
 * @param {boolean} isOpen - 是否打开面板
 * @param {string} type - 'note' | 'mistake' | 'card'
 * @param {string|number} id - 笔记/错题/卡片ID
 */
const SmartKnowledgePanel = ({ isOpen, type, id }) => {
  const [activeTab, setActiveTab] = useState("network");
  const [relatedData, setRelatedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionCount, setConnectionCount] = useState(0);

  // 标签页配置
  const tabs = [
    {
      id: "network",
      label: "关系网络",
      icon: <Icons.Network />,
      description: "查看所有关联"
    },
    {
      id: "ai-insight",
      label: "AI洞察",
      icon: <Icons.Sparkles />,
      description: "深度理解",
      badge: "AI"
    }
  ];

  // 获取关联数据（用于统计连接数）
  useEffect(() => {
    const fetchRelatedData = async () => {
      if (!id || !type) return;

      try {
        setLoading(true);
        const endpoint = type === 'note'
          ? `/api/notes/${id}/related`
          : type === 'mistake'
          ? `/api/mistakes/${id}/related`
          : `/api/cards/${id}/related`;

        const response = await axios.get(`http://localhost:8000${endpoint}`);
        setRelatedData(response.data);

        // 计算连接数
        let count = 0;
        if (response.data.note) count++;
        if (response.data.cards) count += response.data.cards.length;
        if (response.data.mistakes) count += response.data.mistakes.length;
        if (response.data.questions) count += response.data.questions.length;
        if (response.data.linked_notes) count += response.data.linked_notes.length;
        if (response.data.related_cards) count += response.data.related_cards.length;

        setConnectionCount(count);
      } catch (error) {
        console.error("Failed to fetch related data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedData();
  }, [type, id]);

  return (
    <div
      className={`
        h-full flex flex-col shrink-0 overflow-hidden
        transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
        ${isOpen ? 'w-80 opacity-100 ml-6 translate-x-0' : 'w-0 opacity-0 ml-0 translate-x-10'}
      `}
    >
      <div className="w-80 h-full flex flex-col bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden">
        {/* 标题栏 */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Icons.Link />
              知识面板
            </h3>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {connectionCount} 个连接
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {activeTab === 'network' ? '查看所有关联内容' : 'AI 深度分析'}
          </p>
        </div>

        {/* 标签页导航 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 flex flex-col items-center gap-1 transition-all relative ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {tab.icon}
                <span className="text-sm font-bold">{tab.label}</span>
              </div>
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === "network" && (
            <div className="h-full">
              <KnowledgeNetworkTab type={type} id={id} />
            </div>
          )}

          {activeTab === "ai-insight" && (
            <div className="h-full">
              <AIInsightTab type={type} id={id} />
            </div>
          )}
        </div>

        {/* 底部快捷操作栏 */}
        <QuickActionsBar type={type} id={id} relatedData={relatedData} />
      </div>
    </div>
  );
};

export default SmartKnowledgePanel;
