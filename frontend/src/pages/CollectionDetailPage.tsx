import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import GlassCard from "../components/GlassCard";
import * as collectionApi from "../utils/collectionApi";
import * as ankiApi from "../utils/ankiApi";
import { FlashCard, Collection } from "../types";

const Icons = {
  Play: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 11-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 00-1.498-.058l-.347 9a.75.75 0 101.5.058l.345-9z" clipRule="evenodd" /></svg>,
  ArrowLeft: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.53 2.47a.75.75 0 010 1.06L4.81 8.25H15a6.75 6.75 0 010 13.5h-3a.75.75 0 010-1.5h3a5.25 5.25 0 100-10.5H4.81l4.72 4.72a.75.75 0 01-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>,
};

// 颜色映射
const COLOR_MAP = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
};

function CollectionDetailPage() {
  const navigate = useNavigate();
  const { collectionId } = useParams();
  const toast = useToast();

   // States
   const [collection, setCollection] = useState<Collection | null>(null);
   const [cards, setCards] = useState<FlashCard[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [selectedCards, setSelectedCards] = useState<number[]>([]); // 多选

  // Load data
  useEffect(() => {
    loadData();
  }, [collectionId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [collectionData, cardsData] = await Promise.all([
        collectionApi.getCollection(collectionId),
        collectionApi.getCollectionCards(collectionId)
      ]);

      setCollection(collectionData);
      setCards(cardsData);
    } catch (error) {
      console.error('Failed to load collection:', error);
      toast.error('加载合集失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCard = async (cardId) => {
    if (!confirm('确定要从合集移除这张卡片吗？')) return;

    try {
      await collectionApi.removeCardFromCollection(collectionId, cardId);
      toast.success('卡片已移除');
      loadData();
    } catch (error) {
      console.error('Failed to remove card:', error);
      toast.error('移除失败');
    }
  };

  const handleStartReview = () => {
    if (cards.length === 0) {
      toast.error('合集没有卡片');
      return;
    }

    // 获取卡片ID列表
    const cardIds = cards.map(c => c.id);

    navigate('/anki/review', {
      state: {
        collectionId,
        cardIds, // 传递卡片ID列表
        mode: 'collection'
      }
    });
  };

  const handleBulkRemove = async () => {
    if (selectedCards.length === 0) return;

    if (!confirm(`确定要从合集移除这 ${selectedCards.length} 张卡片吗？`)) return;

    try {
      // 批量移除
      await Promise.all(
        selectedCards.map(cardId =>
          collectionApi.removeCardFromCollection(collectionId, cardId)
        )
      );

      toast.success(`已移除 ${selectedCards.length} 张卡片`);
      setSelectedCards([]);
      loadData();
    } catch (error) {
      console.error('Failed to remove cards:', error);
      toast.error('移除失败');
    }
  };

  const toggleCardSelection = (cardId) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  const selectAll = () => {
    if (selectedCards.length === cards.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(cards.map(c => c.id).filter((id): id is number => id !== undefined));
    }
  };

  const addMoreCards = () => {
    // 跳转到 Anki 页面，并标记为"添加到合集"模式
    navigate('/anki', {
      state: {
        addToCollectionMode: true,
        collectionId,
        collectionName: collection?.name || ''
      }
    });
  };

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen font-sans flex items-center justify-center" style={{ paddingTop: '12vh' }}>
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-600">加载中...</div>
        </div>
      </div>
    );
  }

  // 合集不存在
  if (!collection) {
    return (
      <div className="min-h-screen font-sans flex items-center justify-center" style={{ paddingTop: '12vh' }}>
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold dark:text-white text-gray-900 mb-4">
            合集不存在
          </h2>
          <button
            onClick={() => navigate('/anki/collections')}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg"
          >
            返回合集列表
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans p-6 md:p-12" style={{ paddingTop: '12vh' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <GlassCard className="px-3 py-2 hover:scale-105 transition-transform cursor-pointer">
              <button
                onClick={() => navigate('/anki/collections')}
                className="text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                <Icons.ArrowLeft />
                返回列表
              </button>
            </GlassCard>
            <div className={`w-3 h-3 rounded-full ${COLOR_MAP[collection.color] || COLOR_MAP.blue}`} />
            <div>
              <h1 className="text-4xl font-bold dark:text-white text-gray-900">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-gray-500">{collection.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={addMoreCards}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              <Icons.Plus />
              添加卡片
            </button>
            <button
              onClick={handleStartReview}
              disabled={cards.length === 0}
              className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-indigo-500/30 hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icons.Play />
              开始复习 ({cards.length})
            </button>
          </div>
        </div>

        {/* 多选操作栏 */}
        {selectedCards.length > 0 && (
          <GlassCard className="p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-gray-700 dark:text-gray-300">
                已选择 <span className="font-bold text-indigo-500">{selectedCards.length}</span> 张卡片
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBulkRemove}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                >
                  <Icons.Trash />
                  移除所选
                </button>
                <button
                  onClick={() => setSelectedCards([])}
                  className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                >
                  取消选择
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Cards List */}
        {cards.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-600 py-12">
            <div className="text-6xl mb-4">📭</div>
            <div className="text-xl font-semibold mb-2">合集还没有卡片</div>
            <div className="text-sm mb-6">点击"添加卡片"开始整理你的学习内容吧！</div>
            <button
              onClick={addMoreCards}
              className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold"
            >
              添加卡片
            </button>
          </div>
        ) : (
          <div>
            {/* 全选按钮 */}
            <div className="mb-4">
              <button
                onClick={selectAll}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {selectedCards.length === cards.length ? '取消全选' : '全选'}
              </button>
            </div>

            {/* 卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map(card => (
                <GlassCard
                   key={card.id}
                  className={`p-6 cursor-pointer transition-all ${
                    selectedCards.includes(card.id!) ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  onClick={() => card.id && toggleCardSelection(card.id)}
                >
                  {/* 选择框 */}
                  <div className="flex items-start justify-between mb-4">
                    <input
                        type="checkbox"
                        checked={selectedCards.includes(card.id!)}
                        onChange={(e) => {
                          e.stopPropagation();
                          card.id && toggleCardSelection(card.id);
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        card.id && handleRemoveCard(card.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="从合集移除"
                    >
                      <Icons.Trash />
                    </button>
                  </div>

                  {/* 卡片内容 */}
                  <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-2">正面</div>
                    <div className="text-lg font-medium dark:text-white text-gray-900 line-clamp-3">
                      {card.front}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-2">背面</div>
                    <div className="text-base dark:text-gray-200 text-gray-700 line-clamp-3">
                      {card.back}
                    </div>
                  </div>

                  {/* 标签和统计 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {card.tags && card.tags.filter(tag => !tag.startsWith('system:')).slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {card.tags && card.tags.filter(tag => !tag.startsWith('system:')).length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-white/10 text-gray-500 rounded">
                        +{card.tags.filter(tag => !tag.startsWith('system:')).length - 3}
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded">
                      {card.deck}
                    </span>
                  </div>

                  {/* 复习统计 */}
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>复习: {card.repetitions}次</span>
                    <span>间隔: {card.interval}天</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollectionDetailPage;
