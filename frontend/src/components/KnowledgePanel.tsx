import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";

interface RelatedData {
  note?: any;
  cards?: any[];
  questions?: any[];
  mistakes?: any[];
  source_note?: any;
  source_mistake?: any;
  linked_notes?: any[];
  related_cards?: any[];
  tags?: string[];
  content?: string;
  mistake_data?: any;
  note_data?: any;
}

interface KnowledgePanelProps {
  type: 'mistake' | 'note' | 'card';
  id: string | number;
  className?: string;
}

const Icons = {
  File: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Card: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  Quiz: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Mistake: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Link: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  ChevronDown: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>,
  ExternalLink: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>,
  Sparkles: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
};

/**
 * 知识生态面板组件
 *
 * 显示错题/笔记/卡片的所有关联内容
 */
const KnowledgePanel = ({ type, id, className = "" }: KnowledgePanelProps) => {
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);
  const navigate = useNavigate();
  const toast = useToast();

  // API 端点映射
  const apiEndpoints = {
    mistake: `/api/mistakes/${id}/related`,
    note: `/api/notes/${id}/related`,
    card: `/api/cards/${id}/related`,
  };

  // 获取关联数据
  useEffect(() => {
    const fetchRelatedData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:8000${apiEndpoints[type]}`);
        setRelatedData(response.data);

        // 默认展开所有有内容的区域
        const sections: string[] = [];
        if (response.data.note && Object.keys(response.data.note).length > 0) sections.push('note');
        if (response.data.cards && response.data.cards.length > 0) sections.push('cards');
        if (response.data.questions && response.data.questions.length > 0) sections.push('questions');
        if (response.data.mistakes && response.data.mistakes.length > 0) sections.push('mistakes');
        if (response.data.source_note) sections.push('source_note');
        if (response.data.source_mistake) sections.push('source_mistake');
        if (response.data.linked_notes && response.data.linked_notes.length > 0) sections.push('linked_notes');
        if (response.data.related_cards && response.data.related_cards.length > 0) sections.push('related_cards');

        setExpandedSections(sections.reduce((acc, s) => ({ ...acc, [s]: true }), {} as Record<string, boolean>));
      } catch (error) {
        console.error("Failed to fetch related data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id && type) {
      fetchRelatedData();
    }
  }, [type, id]);

  // 切换区域展开/收起
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ✅ 新增：快捷操作函数
  const handleCreateNoteFromMistake = async () => {
    try {
      // 触发笔记创建事件，传递错题信息
      const mistakeData = relatedData?.mistake_data;
      if (mistakeData) {
        window.dispatchEvent(new CustomEvent('createNoteFromMistake', {
          detail: { mistakeId: id, questionData: mistakeData }
        }));
        toast.success('✅ 已在右侧打开笔记编辑器');
      }
    } catch (error) {
      toast.error('❌ 创建笔记失败');
    }
  };

  const handleCreateCardFromNote = async () => {
    try {
      const noteData = relatedData?.note_data;
      if (noteData) {
        window.dispatchEvent(new CustomEvent('createCardFromNote', {
          detail: { noteId: id, noteData }
        }));
        toast.success('✅ 已打开卡片生成器');
        navigate('/anki');
      }
    } catch (error) {
      toast.error('❌ 创建卡片失败');
    }
  };

  const handleLinkToNote = async (noteId: string) => {
    try {
      if (type === 'mistake') {
        await axios.post(`http://localhost:8000/api/mistakes/${id}/link-note`, {
          note_id: noteId
        });
        toast.success('✅ 关联成功');
        // 刷新数据
        window.location.reload();
      }
    } catch (error) {
      toast.error('❌ 关联失败');
    }
  };

  // 获取推荐内容
  const fetchRecommendations = async () => {
    try {
      const response = await axios.post('http://localhost:8000/api/recommend/auto-link', {
        type,
        id,
        tags: relatedData?.tags || [],
        content: relatedData?.content || ''
      });
      setRecommendations(response.data);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    }
  };

  // 渲染标签
  const renderTags = (tags, maxTags = 5) => {
    if (!tags || tags.length === 0) return null;
    const displayTags = tags.slice(0, maxTags);
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {displayTags.map((tag, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 text-xs bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-600 dark:text-blue-400 rounded-md border border-blue-200 dark:border-blue-500/30"
          >
            {tag}
          </span>
        ))}
        {tags.length > maxTags && (
          <span className="text-xs text-gray-500 dark:text-gray-400">+{tags.length - maxTags}</span>
        )}
      </div>
    );
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">加载关联数据...</span>
        </div>
      </div>
    );
  }

  // 渲染笔记项
  const renderNoteItem = (note, showSource = false) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-500/30 hover:shadow-md transition-all cursor-pointer"
      onClick={() => {
        navigate(`/notes?id=${note.id}`);
        // 同时触发事件作为备用
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('loadNote', { detail: { id: note.id } }));
        }, 100);
      }}
    >
      <div className="flex items-start gap-2">
        <div className="p-1.5 bg-green-100 dark:bg-green-500/20 rounded-lg">
          <Icons.File />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">
              {note.name || note.title}
            </span>
            {showSource && (
              <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-500/30 text-green-700 dark:text-green-400 rounded">
                来源
              </span>
            )}
          </div>
          {note.content_preview && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {note.content_preview}
            </p>
          )}
          {note.tags && renderTags(note.tags)}
        </div>
        <Icons.ExternalLink />
      </div>
    </motion.div>
  );

  // 渲染卡片项
  const renderCardItem = (card, showSource = false) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-500/30 hover:shadow-md transition-all cursor-pointer"
      onClick={() => navigate(`/anki`)}
    >
      <div className="flex items-start gap-2">
        <div className="p-1.5 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
          <Icons.Card />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {card.front}
            </span>
            {showSource && (
              <span className="px-1.5 py-0.5 text-xs bg-orange-100 dark:bg-orange-500/30 text-orange-700 dark:text-orange-400 rounded">
                来源
              </span>
            )}
          </div>
          {card.deck && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              合集: {card.deck}
            </p>
          )}
        </div>
        <Icons.ExternalLink />
      </div>
    </motion.div>
  );

  // 渲染错题项
  const renderMistakeItem = (mistake) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-500/30 hover:shadow-md transition-all cursor-pointer"
      onClick={() => {
        // 需要找到 question_id，从 mistake 对象中可能需要从后端传递
        // 这里假设后端返回的数据中包含 question_id
        const questionId = mistake.question_id || mistake.id;
        navigate(`/mistakes?questionId=${questionId}`);
        // 同时触发事件作为备用
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('loadMistake', { detail: { questionId } }));
        }, 150);
      }}
    >
      <div className="flex items-start gap-2">
        <div className="p-1.5 bg-red-100 dark:bg-red-500/20 rounded-lg">
          <Icons.Mistake />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
            {mistake.question_stem}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span>错误 {mistake.error_count} 次</span>
            <span>熟练度 {Math.round(mistake.mastery)}%</span>
          </div>
        </div>
        <Icons.ExternalLink />
      </div>
    </motion.div>
  );

  // 渲染题目项
  const renderQuestionItem = (question) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-500/30 hover:shadow-md transition-all cursor-pointer"
      onClick={() => navigate(`/quiz`)}
    >
      <div className="flex items-start gap-2">
        <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
          <Icons.Quiz />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
            {question.stem}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span>难度 {question.difficulty}</span>
            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">{question.type}</span>
          </div>
        </div>
        <Icons.ExternalLink />
      </div>
    </motion.div>
  );

  // 可折叠区域组件
  const CollapsibleSection = ({ title, icon, count, children, sectionKey, color = "blue" }) => {
    const isExpanded = expandedSections[sectionKey];
    const colorClasses = {
      blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30",
      green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30",
      orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-500/30",
      red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30",
      purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-500/30",
    };

    return (
      <div className={`mb-3 rounded-xl border ${colorClasses[color]} overflow-hidden`}>
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{title}</span>
            {count !== undefined && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                {count}
              </span>
            )}
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Icons.ChevronDown />
          </motion.div>
        </button>
        <AnimatePresence mode="sync">
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-2">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* 标题 - 明确产品定位 */}
      <div className="px-5 py-4 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Icons.Link />
            知识生态
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full font-medium">
              地图
            </span>
          </h3>

          {/* 连接统计 */}
          {relatedData && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {[
                relatedData.note && 1,
                relatedData.cards?.length || 0,
                relatedData.mistakes?.length || 0,
                relatedData.questions?.length || 0
              ].reduce((a, b) => a + b, 0)} 个连接
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          理解知识点之间的关系网络，发现隐藏关联
        </p>
      </div>

      {/* 内容区域 - 重新设计为三层结构 */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {relatedData ? (
          <div className="space-y-4">

            {/* ============================================ */}
            {/* Level 1: 已建立的连接（置顶、高亮） */}
            {/* ============================================ */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-blue-200 dark:border-blue-700">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                  已建立的连接
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (你手动关联的内容)
                </span>
              </div>

              {/* 错题 → 笔记 */}
              {type === 'mistake' && relatedData.note && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">错题 → 笔记</span>
                  </div>
                  {renderNoteItem(relatedData.note)}
                </div>
              )}

              {/* 笔记 → 错题 */}
              {type === 'note' && relatedData.mistakes && relatedData.mistakes.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">笔记 → 错题</span>
                  </div>
                  {relatedData.mistakes.map(mistake => (
                    <div key={mistake.id} className="mb-2">{renderMistakeItem(mistake)}</div>
                  ))}
                </div>
              )}

              {/* 笔记 → 卡片 */}
              {type === 'note' && relatedData.cards && relatedData.cards.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">笔记 → 卡片</span>
                  </div>
                  {relatedData.cards.map(card => (
                    <div key={card.id} className="mb-2">{renderCardItem(card)}</div>
                  ))}
                </div>
              )}

              {/* 卡片 → 来源笔记 */}
              {type === 'card' && relatedData.source_note && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">卡片 ← 笔记</span>
                  </div>
                  {renderNoteItem(relatedData.source_note, true)}
                </div>
              )}

              {/* 如果没有已建立的连接 */}
              {((type === 'mistake' && !relatedData.note) ||
                (type === 'note' && (!relatedData.mistakes || relatedData.mistakes.length === 0)) ||
                (type === 'card' && !relatedData.source_note)) && (
                <div className="text-center py-6 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <Icons.Link />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    暂无已建立的连接
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    使用下方的快捷操作开始构建知识网络
                  </p>
                </div>
              )}
            </div>

            {/* ============================================ */}
            {/* Level 2: 发现的关联（可折叠） */}
            {/* ============================================ */}
            <CollapsibleSection
              title="发现的关联"
              icon={<div className="p-1 bg-purple-500 rounded"><Icons.Sparkles /></div>}
              sectionKey="discoveries"
              color="purple"
              count={
                (relatedData.questions?.length || 0) +
                (relatedData.linked_notes?.length || 0) +
                (relatedData.related_cards?.length || 0)
              }
            >
              <div className="mb-3 pb-2 border-b border-purple-200 dark:border-purple-700/50">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  💡 基于标签和内容发现的潜在关联
                </p>
              </div>

              {/* 相关题目 */}
              {relatedData.questions && relatedData.questions.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    相关题目
                  </div>
                  {relatedData.questions.map(q => (
                    <div key={q.id} className="mb-2">{renderQuestionItem(q)}</div>
                  ))}
                </div>
              )}

              {/* 双向链接的笔记 */}
              {relatedData.linked_notes && relatedData.linked_notes.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    双向链接的笔记
                  </div>
                  {relatedData.linked_notes.map(note => (
                    <div key={note.id}>{renderNoteItem(note)}</div>
                  ))}
                </div>
              )}

              {/* 相关的其他卡片 */}
              {relatedData.related_cards && relatedData.related_cards.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    相关的卡片
                  </div>
                  {relatedData.related_cards.map(card => (
                    <div key={card.id}>{renderCardItem(card)}</div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* ============================================ */}
            {/* Level 3: 快捷操作（底部工具栏） */}
            {/* ============================================ */}
            <div className="pt-3 border-t-2 border-green-200 dark:border-green-700">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                  扩展知识网络
                </h4>
              </div>

              {/* 操作按钮网格 */}
              <div className="grid grid-cols-2 gap-2">
                {type === 'mistake' && (
                  <button
                    onClick={handleCreateNoteFromMistake}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-2 border-green-200 dark:border-green-700 rounded-lg transition-all hover:shadow-md group"
                  >
                    <div className="p-1.5 bg-green-500 rounded-lg group-hover:scale-110 transition-transform">
                      <Icons.Plus />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-green-700 dark:text-green-400">
                        创建笔记
                      </div>
                      <div className="text-xs text-green-600/70 dark:text-green-500/70">
                        从此错题
                      </div>
                    </div>
                  </button>
                )}

                {type === 'note' && (
                  <button
                    onClick={handleCreateCardFromNote}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border-2 border-orange-200 dark:border-orange-700 rounded-lg transition-all hover:shadow-md group"
                  >
                    <div className="p-1.5 bg-orange-500 rounded-lg group-hover:scale-110 transition-transform">
                      <Icons.Plus />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                        生成卡片
                      </div>
                      <div className="text-xs text-orange-600/70 dark:text-orange-500/70">
                        从此笔记
                      </div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (showQuickActions) {
                      setShowQuickActions(false);
                    } else {
                      fetchRecommendations();
                      setShowQuickActions(true);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition-all hover:shadow-md ${
                    showQuickActions
                      ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-400 dark:border-purple-600'
                      : 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-700'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-transform ${showQuickActions ? 'bg-purple-600' : 'bg-purple-500 group-hover:scale-110'}`}>
                    <Icons.Sparkles />
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-semibold ${showQuickActions ? 'text-purple-700 dark:text-purple-400' : 'text-purple-700 dark:text-purple-400'}`}>
                      智能推荐
                    </div>
                    <div className="text-xs text-purple-600/70 dark:text-purple-500/70">
                      发现关联
                    </div>
                  </div>
                </button>

                {type === 'mistake' && !relatedData.note && (
                  <button
                    onClick={() => {
                      navigate('/notes');
                      toast.info('💡 提示：打开笔记后可以在知识生态中关联此错题');
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-lg transition-all hover:shadow-md group"
                  >
                    <div className="p-1.5 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                      <Icons.Link />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                        关联笔记
                      </div>
                      <div className="text-xs text-blue-600/70 dark:text-blue-500/70">
                        连接已有
                      </div>
                    </div>
                  </button>
                )}
              </div>

              {/* AI 推荐区域（点击智能推荐后展开） */}
              <AnimatePresence>
                {showQuickActions && recommendations && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3 overflow-hidden"
                  >
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Icons.Sparkles />
                        <span className="text-xs font-bold text-gray-800 dark:text-white">
                          AI 推荐的关联内容
                        </span>
                      </div>

                      {/* 推荐的笔记 */}
                      {recommendations.notes?.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1.5">
                            💡 建议关联的笔记
                          </div>
                          {recommendations.notes.slice(0, 2).map(note => (
                            <div
                              key={note.id}
                              className="flex items-center justify-between p-2 mb-1 last:mb-0 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-800 dark:text-gray-200 truncate">
                                  {note.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  相似度: {Math.round(note.similarity * 100)}%
                                </div>
                              </div>
                              <button
                                onClick={() => handleLinkToNote(note.id)}
                                className="ml-2 px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors shadow-sm"
                              >
                                关联
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 推荐的卡片 */}
                      {recommendations.cards?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1.5">
                            💡 相关的记忆卡片
                          </div>
                          {recommendations.cards.slice(0, 2).map(card => (
                            <div
                              key={card.id}
                              className="p-2 mb-1 last:mb-0 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
                            >
                              <div className="text-xs text-gray-800 dark:text-gray-200">
                                {card.front}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                相似度: {Math.round(card.similarity * 100)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(!recommendations.notes || recommendations.notes.length === 0) &&
                       (!recommendations.cards || recommendations.cards.length === 0) && (
                        <div className="text-center py-3 text-xs text-gray-500 dark:text-gray-400">
                          暂无推荐内容
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 知识标签 */}
            {relatedData.tags && relatedData.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  🏷️ 知识标签
                </div>
                {renderTags(relatedData.tags, 10)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            <Icons.Link />
            <p className="mt-2">暂无关联数据</p>
            <p className="text-xs mt-1">开始构建你的知识网络</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgePanel;
