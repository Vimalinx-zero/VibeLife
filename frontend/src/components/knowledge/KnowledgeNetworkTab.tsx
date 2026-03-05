import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Section from "./Section";

interface KnowledgeData {
  notes?: Array<{
    id: string;
    name?: string;
    title?: string;
    content?: string;
    tags?: string[];
  }>;
  cards?: Array<{
    id: string;
    question_id?: string;
    question?: string;
    front?: string;
    back?: string;
    tags?: string[];
  }>;
  mistakes?: Array<{
    id: string;
    title?: string;
    question_id?: string;
  }>;
  source_note?: {
    id: string;
    name?: string;
    title?: string;
    content?: string;
    tags?: string[];
  };
  questions?: Array<{
    id: string | number;
    stem: string;
    subject?: string;
    tags?: string[];
  }>;
  linked_notes?: Array<{
    id: string;
    name?: string;
    title?: string;
    content?: string;
    tags?: string[];
  }>;
  related_cards?: Array<{
    id: string;
    question_id?: string;
    question?: string;
    front?: string;
    back?: string;
    tags?: string[];
  }>;
  tags?: string[];
}

interface KnowledgeNetworkTabProps {
  type: 'note' | 'card' | 'mistake';
  id?: string;
}

const Icons = {
  File: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Card: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  Quiz: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Mistake: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Link: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  ExternalLink: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>,
  Sparkles: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
};

/**
 * 关系网络标签页
 * 显示已建立的连接和发现的关联
 */
const KnowledgeNetworkTab = ({ type, id }: KnowledgeNetworkTabProps) => {
  const [relatedData, setRelatedData] = useState<KnowledgeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // ✅ 检查 id 是否存在
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const endpoint = type === 'note'
          ? `/api/notes/${id}/related`
          : type === 'mistake'
          ? `/api/mistakes/${id}/related`
          : `/api/cards/${id}/related`;

        const response = await axios.get(`http://localhost:8000${endpoint}`);
        setRelatedData(response.data);
      } catch (error) {
        console.error("Failed to fetch related data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">加载关联数据...</span>
        </div>
      </div>
    );
  }

  if (!relatedData) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
        <Icons.Link />
        <p className="mt-2">暂无关联数据</p>
      </div>
    );
  }

  // 渲染笔记卡片
  const renderNoteCard = (note, showSource = false) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all cursor-pointer mb-2"
      onClick={() => {
        navigate(`/notes?id=${note.id}`);
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
      className="group p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all cursor-pointer mb-2"
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
      className="group p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all cursor-pointer mb-2"
      onClick={() => {
        const questionId = mistake.question_id || mistake.id;
        navigate(`/mistakes?questionId=${questionId}`);
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
      className="group p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all cursor-pointer mb-2"
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

  return (
    <div className="p-4 space-y-4">
      {/* 已建立的连接 */}
      <div>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-blue-200 dark:border-blue-700">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <h4 className="text-sm font-bold text-gray-800 dark:text-white">
            已建立的连接
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (手动关联)
          </span>
        </div>

        {/* 笔记 → 错题 */}
        {type === 'note' && relatedData.mistakes && relatedData.mistakes.length > 0 && (
          <Section title="关联的错题" icon={<Icons.Mistake />} color="red" count={relatedData.mistakes.length}>
            {relatedData.mistakes.map(mistake => (
              <div key={mistake.id}>{renderMistakeItem(mistake)}</div>
            ))}
          </Section>
        )}

        {/* 笔记 → 卡片 */}
        {type === 'note' && relatedData.cards && relatedData.cards.length > 0 && (
          <Section title="生成的卡片" icon={<Icons.Card />} color="orange" count={relatedData.cards.length}>
            {relatedData.cards.map(card => (
              <div key={card.id}>{renderCardItem(card)}</div>
            ))}
          </Section>
        )}

        {/* 卡片 → 来源笔记 */}
        {type === 'card' && relatedData.source_note && (
          <Section title="来源笔记" icon={<Icons.File />} color="green" count={1}>
            {renderNoteCard(relatedData.source_note, true)}
          </Section>
        )}

        {/* 如果没有已建立的连接 */}
        {((type === 'note' && (!relatedData.mistakes || relatedData.mistakes.length === 0)) ||
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

      {/* 发现的关联 */}
      <Section
        title="发现的关联"
        icon={<Icons.Sparkles />}
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
              <div key={q.id}>{renderQuestionItem(q)}</div>
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
              <div key={note.id}>{renderNoteCard(note)}</div>
            ))}
          </div>
        )}

        {/* 相关的其他卡片 */}
        {relatedData.related_cards && relatedData.related_cards.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              相关的卡片
            </div>
            {relatedData.related_cards.map(card => (
              <div key={card.id}>{renderCardItem(card)}</div>
            ))}
          </div>
        )}

        {(!relatedData.questions || relatedData.questions.length === 0) &&
         (!relatedData.linked_notes || relatedData.linked_notes.length === 0) &&
         (!relatedData.related_cards || relatedData.related_cards.length === 0) && (
          <div className="text-center py-3 text-xs text-gray-500 dark:text-gray-400">
            暂无发现的关联
          </div>
        )}
      </Section>

      {/* 知识标签 */}
      {relatedData.tags && relatedData.tags.length > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            🏷️ 知识标签
          </div>
          <div className="flex flex-wrap gap-1.5">
            {relatedData.tags.slice(0, 10).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-600 dark:text-blue-400 rounded-md border border-blue-200 dark:border-blue-500/30"
              >
                {tag}
              </span>
            ))}
            {relatedData.tags.length > 10 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">+{relatedData.tags.length - 10}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeNetworkTab;
