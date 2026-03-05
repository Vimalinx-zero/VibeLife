import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import GlassCard from "../components/GlassCard";
import MarkdownCard from "../components/MarkdownCard";
import * as ankiApi from "../utils/ankiApi";
import * as collectionApi from "../utils/collectionApi";
import type { Card } from "../utils/ankiApi";

const Icons = {
  Check: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>,
  Folder: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19.5 21a1.5 1.5 0 001.5-1.5v-13a1.5 1.5 0 00-1.5-1.5h-6.879a1.5 1.5 0 01-1.06-.44l-1.122-1.12A1.5 1.5 0 009.62 3H4.5A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15z" /></svg>,
  ArrowLeft: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
};

function AnkiReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // 获取筛选参数
  const reviewParams = location.state || {};
  const { deck, tags, tagsMode = 'or', mode = 'all', collectionId, cardIds: collectionCardIds, cardIds: selectedCardIds } = reviewParams;

  // 判断复习模式
  const isCollectionMode = mode === 'collection' && collectionId && collectionCardIds;
  const isSelectionMode = mode === 'selected' && selectedCardIds;

  // 核心状态（仅保留必要的状态）
  const [dueCards, setDueCards] = useState<ankiApi.Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [collectionInfo, setCollectionInfo] = useState<any>(null); // 合集信息

  const currentCard = dueCards[currentIndex];
  const reviewedCards = currentIndex;
  const isLastCard = currentIndex >= dueCards.length - 1;

  // 加载待复习卡片
  useEffect(() => {
    loadDueCards();
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e) => {
      // 没有卡片时不响应
      if (!currentCard) return;

      // 空格键：翻转卡片（仅在未翻转时）
      if ((e.key === ' ' || e.key === 'Spacebar') && !isFlipped) {
        e.preventDefault();
        handleFlip();
        return;
      }

      // Enter 键：提交评分（仅在翻转后）
      if (e.key === 'Enter' && isFlipped) {
        e.preventDefault();
        // 默认评分：3（记得）
        handleRate(3);
        return;
      }

      // 数字键：评分（仅在翻转后）
      // 1 = 忘记了 (hard_again)
      // 2 = 有印象 (hard)
      // 3 = 记得 (good)
      // 4 = 轻松 (easy)
      if (isFlipped) {
        if (e.key === '1') {
          e.preventDefault();
          handleRate(1);
        } else if (e.key === '2') {
          e.preventDefault();
          handleRate(3);
        } else if (e.key === '3') {
          e.preventDefault();
          handleRate(4);
        } else if (e.key === '4') {
          e.preventDefault();
          handleRate(5);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentCard, isFlipped]);

  const loadDueCards = async () => {
    try {
      setIsLoading(true);

      if (isCollectionMode) {
        // 合集复习模式
        // 1. 获取合集信息
        const collection = await collectionApi.getCollection(collectionId);
        setCollectionInfo(collection);

        // 2. 获取合集内的所有卡片
        const collectionCards = await collectionApi.getCollectionCards(collectionId);
        setDueCards(collectionCards);
      } else if (isSelectionMode) {
        // 选中卡片复习模式
        // 获取所有卡片，然后过滤出选中的卡片
        const allCardsResponse = await ankiApi.getCards(null, null, 'or', null, 1000);
        const allCardsData = allCardsResponse.data;
        const selectedCardsData = allCardsData.filter(card => selectedCardIds.includes(card.id));
        setDueCards(selectedCardsData);
      } else {
        // 普通复习模式
        const cardsResponse = await ankiApi.getDueCards(deck, tags, mode, 100, tagsMode);
        setDueCards(cardsResponse.data);
      }

      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to load due cards:', error);
      toast.error('加载卡片失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(true);
  };

  const handleRate = async (quality: number) => {
    if (!currentCard) return;

    try {
      // 计算用时
      const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

      // 提交评分
      await ankiApi.submitReview(currentCard.id, quality, timeSpent);

      // 重置翻转状态
      setIsFlipped(false);

      // 切换到下一张或完成
      if (isLastCard) {
        // 最后一张，显示完成界面
        setCurrentIndex(currentIndex + 1);
      } else {
        // 下一张
        setCurrentIndex(currentIndex + 1);
        setStartTime(Date.now());
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('提交失败');
    }
  };

  const handleBackHome = () => {
    if (isCollectionMode && collectionId) {
      navigate(`/anki/collections/${collectionId}`);
    } else if (isSelectionMode) {
      navigate('/anki');
    } else {
      navigate('/anki');
    }
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

  // 没有卡片
  if (dueCards.length === 0) {
    return (
      <div className="min-h-screen font-sans flex items-center justify-center" style={{ paddingTop: '12vh' }}>
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold dark:text-white text-gray-900 mb-4">
            没有待复习的卡片
          </h2>
          <button
            onClick={handleBackHome}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg"
          >
            返回
          </button>
        </GlassCard>
      </div>
    );
  }

  // 完成界面
  if (isLastCard && !currentCard) {
    return (
      <div className="min-h-screen font-sans p-6" style={{ paddingTop: '12vh' }}>
        <div className="max-w-3xl mx-auto">
          <GlassCard className="p-8 min-h-[400px] flex flex-col justify-center">
            <div className="text-center">
              <div className="mb-6 text-indigo-500">
                <Icons.Check />
              </div>
              <h2 className="text-3xl font-bold dark:text-white text-gray-900 mb-3">
                复习完成！
              </h2>
              <p className="text-gray-500 text-lg mb-8">
                你已经复习了 <span className="font-semibold text-indigo-500">{reviewedCards}</span> 张卡片
              </p>
              <button
                onClick={handleBackHome}
                className="px-10 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-indigo-500/30 hover:scale-105"
              >
                返回
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // 复习界面
  return (
    <div className="min-h-screen font-sans p-6" style={{ paddingTop: '12vh' }}>
      <div className="max-w-3xl mx-auto">
        {/* 合集复习横幅 */}
        {isCollectionMode && collectionInfo && (
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border-2 border-purple-300 dark:border-purple-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-[#2a2a2a] rounded-lg">
                <Icons.Folder />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 dark:text-gray-400">正在复习合集</div>
                <div className="text-lg font-bold dark:text-white text-gray-900">
                  {collectionInfo.name}
                </div>
              </div>
              {collectionInfo.description && (
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                  {collectionInfo.description}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 选中卡片复习横幅 */}
        {isSelectionMode && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border-2 border-blue-300 dark:border-blue-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-[#2a2a2a] rounded-lg">
                <Icons.Check />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 dark:text-gray-400">正在复习选中的卡片</div>
                <div className="text-lg font-bold dark:text-white text-gray-900">
                  {dueCards.length} 张卡片
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 头部：进度 */}
        <div className="flex items-center justify-between mb-6">
          <GlassCard className="px-4 py-2 hover:scale-105 transition-transform cursor-pointer">
            <button
              onClick={handleBackHome}
              className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
            >
              <Icons.ArrowLeft />
              返回
            </button>
          </GlassCard>
          <div className="text-center">
            <div className="text-sm text-gray-500">
              进度: {reviewedCards} / {dueCards.length}
            </div>
            <div className="w-64 h-2 bg-gray-200 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${(reviewedCards / dueCards.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="w-32"></div>
        </div>

        {/* 卡片 */}
        <GlassCard
          className={`p-8 min-h-[400px] flex flex-col cursor-pointer transition-transform ${
            !isFlipped ? 'hover:scale-[1.02]' : ''
          }`}
          onClick={!isFlipped ? handleFlip : undefined}
        >
          {/* 卡片内容 */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {!isFlipped ? (
              // 正面
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-4 font-medium">正面</div>
                <div className="text-2xl font-semibold dark:text-white text-gray-900 text-center leading-relaxed px-4">
                  <MarkdownCard content={currentCard.front} />
                </div>
                <div className="text-sm text-gray-400 mt-8 flex items-center gap-2 justify-center">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-white/10 rounded text-xs">空格</kbd>
                  <span>查看答案</span>
                </div>
              </div>
            ) : (
              // 背面
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-4 font-medium">背面</div>
                <div className="text-xl dark:text-gray-200 text-gray-700 text-center leading-relaxed px-4">
                  <MarkdownCard content={currentCard.back} />
                </div>
              </div>
            )}
          </div>

          {/* 评分按钮 */}
          {isFlipped && (
            <div className="mt-8 space-y-4">
              <div className="text-sm text-gray-500 text-center mb-4">
                你记得这个答案吗？（按数字键快速评分）
              </div>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={(e) => { e.stopPropagation(); handleRate(1); }}
                  className="px-6 py-4 bg-white dark:bg-[#2a2a2a] border-2 border-red-500 hover:border-red-600 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded-lg font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-red-500/20 flex flex-col items-center gap-2"
                >
                  <span className="text-2xl font-bold">1</span>
                  <span className="text-sm">困难/忘记</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRate(3); }}
                  className="px-6 py-4 bg-white dark:bg-[#2a2a2a] border-2 border-yellow-500 hover:border-yellow-600 text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 rounded-lg font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20 flex flex-col items-center gap-2"
                >
                  <span className="text-2xl font-bold">2</span>
                  <span className="text-sm">一般</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRate(5); }}
                  className="px-6 py-4 bg-white dark:bg-[#2a2a2a] border-2 border-green-500 hover:border-green-600 text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 rounded-lg font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 flex flex-col items-center gap-2"
                >
                  <span className="text-2xl font-bold">3</span>
                  <span className="text-sm">容易/记得</span>
                </button>
              </div>
            </div>
          )}
        </GlassCard>

        {/* 卡片统计信息 */}
        {currentCard && !isFlipped && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <div className="flex justify-center gap-6">
              <span className="px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-full">牌组: {currentCard.deck}</span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-full">复习次数: {currentCard.repetitions}</span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-full">间隔: {currentCard.interval}天</span>
            </div>
          </div>
        )}

        {/* 快捷键提示 */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <div className="flex justify-center gap-6">
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-white/10 rounded">空格</kbd>
              翻转卡片
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-white/10 rounded">1-3</kbd>
              评分
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnkiReviewPage;
