import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";

const Icons = {
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>,
  Sparkles: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  Link: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
};

interface RecommendationItem {
  id: string;
  name?: string;
  front?: string;
  similarity: number;
}

interface Recommendations {
  notes?: RecommendationItem[];
  cards?: RecommendationItem[];
}

/**
 * 快捷操作栏
 * 根据类型显示不同的操作按钮
 */
const QuickActionsBar = ({ type, id, relatedData }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);

  // 创建笔记（从错题）
  const handleCreateNoteFromMistake = async () => {
    try {
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

  // 创建卡片（从笔记）
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

  // 关联笔记
  const handleLinkToNote = async (noteId) => {
    try {
      if (type === 'mistake') {
        await fetch(`http://localhost:8000/api/mistakes/${id}/link-note`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note_id: noteId })
        });
        toast.success('✅ 关联成功');
        window.location.reload();
      }
    } catch (error) {
      toast.error('❌ 关联失败');
    }
  };

  // 智能推荐
  const fetchRecommendations = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/recommend/auto-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          id,
          tags: relatedData?.tags || [],
          content: relatedData?.content || ''
        })
      });
      const data = await response.json();
      setRecommendations(data);
      setShowRecommendations(true);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      toast.error('❌ 获取推荐失败');
    }
  };

  // ActionButton 组件
  const ActionButton = ({ icon, label, sublabel, color, onClick }) => {
    const colorClasses = {
      green: 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400',
      orange: 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-400',
      blue: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400',
    };

    const iconBgClasses = {
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      purple: 'bg-purple-500',
      blue: 'bg-blue-500',
    };

    return (
      <button
        onClick={onClick}
        className={`flex items-center justify-center gap-2 px-3 py-2 border-2 rounded-lg transition-all hover:shadow-md group ${colorClasses[color]}`}
      >
        <div className={`p-1 rounded-lg group-hover:scale-110 transition-transform ${iconBgClasses[color]}`}>
          {icon}
        </div>
        <div className="text-left">
          <div className="text-xs font-bold">{label}</div>
          {sublabel && <div className="text-[10px] opacity-70">{sublabel}</div>}
        </div>
      </button>
    );
  };

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <h4 className="text-xs font-bold text-gray-800 dark:text-white">
          快捷操作
        </h4>
      </div>

      {/* 操作按钮网格 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* 笔记专属操作 */}
        {type === 'note' && (
          <>
            <ActionButton
              icon={<Icons.Plus />}
              label="生成卡片"
              sublabel="从此笔记"
              color="orange"
              onClick={handleCreateCardFromNote}
            />
            <ActionButton
              icon={<Icons.Link />}
              label="关联错题"
              sublabel="连接已有"
              color="red"
              onClick={() => {
                navigate('/mistakes');
                toast.info('💡 提示：在错题本中可以关联此笔记');
              }}
            />
          </>
        )}

        {/* 错题专属操作 */}
        {type === 'mistake' && (
          <>
            <ActionButton
              icon={<Icons.Plus />}
              label="创建笔记"
              sublabel="从此错题"
              color="green"
              onClick={handleCreateNoteFromMistake}
            />
            <ActionButton
              icon={<Icons.Link />}
              label="关联笔记"
              sublabel="连接已有"
              color="blue"
              onClick={() => {
                navigate('/notes');
                toast.info('💡 提示：打开笔记后可以在知识生态中关联此错题');
              }}
            />
          </>
        )}

        {/* 通用操作 */}
        <ActionButton
          icon={<Icons.Sparkles />}
          label="智能推荐"
          sublabel={showRecommendations ? "收起" : "发现关联"}
          color="purple"
          onClick={() => {
            if (showRecommendations) {
              setShowRecommendations(false);
            } else {
              fetchRecommendations();
            }
          }}
        />
      </div>

      {/* AI 推荐区域 */}
      {showRecommendations && recommendations && (
        <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Sparkles />
            <span className="text-xs font-bold text-gray-800 dark:text-white">
              AI 推荐的关联内容
            </span>
          </div>

          {/* 推荐的笔记 */}
          {recommendations.notes && recommendations.notes.length > 0 && (
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
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      相似度: {Math.round(note.similarity * 100)}%
                    </div>
                  </div>
                  {type === 'mistake' && (
                    <button
                      onClick={() => handleLinkToNote(note.id)}
                      className="ml-2 px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                    >
                      关联
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 推荐的卡片 */}
          {recommendations.cards && recommendations.cards.length > 0 && (
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
      )}
    </div>
  );
};

export default QuickActionsBar;
