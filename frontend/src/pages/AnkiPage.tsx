import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "../components/GlassCard";
import TagTreeSelect from "../components/TagTreeSelect";
import AnkiStatsCharts from "../components/AnkiStatsCharts";
import KnowledgePanel from "../components/KnowledgePanel"; // ✨ 新增
import MarkdownCard from "../components/MarkdownCard"; // ✨ 新增
import * as ankiApi from "../utils/ankiApi";
import type { Card, AnkiStats, Deck, TagNode } from "../utils/ankiApi";
import * as collectionApi from "../utils/collectionApi";

const Icons = {
  Plus: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.5 2.25a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5V3a.75.75 0 01.75-.75z" /></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 11-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 00-1.498-.058l-.347 9a.75.75 0 101.5.058l.345-9z" clipRule="evenodd" /></svg>,
  Play: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>,
  Folder: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19.5 21a1.5 1.5 0 001.5-1.5v-13a1.5 1.5 0 00-1.5-1.5h-6.879a1.5 1.5 0 01-1.06-.44l-1.122-1.12A1.5 1.5 0 009.62 3H4.5A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15z" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>,
  ArrowLeft: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
  Knowledge: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
};

function AnkiPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // 从 location.state 获取"添加到合集"模式信息
  const addToCollectionMode = location.state?.addToCollectionMode || false;
  const targetCollectionId = location.state?.collectionId;
  const targetCollectionName = location.state?.collectionName;

  // States
  const [cards, setCards] = useState<Card[]>([]);
  const [stats, setStats] = useState<AnkiStats | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [tagsTree, setTagsTree] = useState<TagNode[]>([]); // 标签树
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Form states
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [formData, setFormData] = useState<{
    front: string;
    back: string;
    tags: string;
    deck: string;
  }>({
    front: '',
    back: '',
    tags: '',
    deck: 'default'
  });

  // Filter states
  const [selectedDeck, setSelectedDeck] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 多选标签
  const [tagsMode, setTagsMode] = useState<string>('or'); // 'or' 或 'and'
  const [showTagFilter, setShowTagFilter] = useState<boolean>(false); // 显示标签筛选面板
  const [masteryLevel, setMasteryLevel] = useState<string | null>(null); // null, 'new', 'learning', 'familiar', 'mastered', 'difficult'
  const [allCards, setAllCards] = useState<Card[]>([]); // 所有卡片（用于计算统计）
  const [searchQuery, setSearchQuery] = useState<string>(''); // 搜索关键词
  const [orphanMode, setOrphanMode] = useState<boolean>(false); // 无家可归卡片模式

  // View mode: 'cards' or 'collections'
  const [viewMode, setViewMode] = useState<'cards' | 'collections'>('cards');

  // Stats charts visibility
  const [showStatsCharts, setShowStatsCharts] = useState<boolean>(false);

  // Card selection states (for adding to collection)
  const [selectedCards, setSelectedCards] = useState<string[]>([]); // 已选择的卡片ID列表
  const [showCollectionSelector, setShowCollectionSelector] = useState<boolean>(false); // 显示合集选择弹窗
  const [allCollections, setAllCollections] = useState<any[]>([]); // 所有合集列表
  const [singleCardActionId, setSingleCardActionId] = useState<string | null>(null); // 单张卡片操作ID

  // ✨ 新增：知识生态面板状态
  const [knowledgeOpen, setKnowledgeOpen] = useState<boolean>(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);


  // Load data
  useEffect(() => {
    loadData();
  }, [selectedDeck, selectedTags, tagsMode, masteryLevel, searchQuery, orphanMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setIsLoading(true);

      // 如果是无家可归卡片模式
      if (orphanMode) {
        const orphanData = await collectionApi.getOrphanCards();
        setAllCards(orphanData.orphan_cards);
        setCards(orphanData.orphan_cards);

        const [statsResponse, decksResponse, tagsResponse] = await Promise.all([
          ankiApi.getAnkiStats(),
          ankiApi.getDecks(),
          ankiApi.getTagsTree()
        ]);

        setStats(statsResponse.data);
        setDecks(decksResponse.data);
        setTagsTree(tagsResponse.data);
        setIsLoading(false);
        return;
      }

      // 多标签查询：用逗号分隔
      const tags = selectedTags.length > 0 ? selectedTags.join(',') : null;
      const deck = selectedDeck === 'all' ? null : selectedDeck;

      const [cardsResponse, statsResponse, decksResponse, tagsResponse] = await Promise.all([
        ankiApi.getCards(deck, tags, tagsMode, null, 1000), // 不传 masteryLevel，加载所有卡片
        ankiApi.getAnkiStats(),
        ankiApi.getDecks(),
        ankiApi.getTagsTree()
      ]);

      // apiClient.get 返回 axios 响应对象，需要访问 .data 获取实际数据
      const cardsData = cardsResponse.data;

      // 确保数据是数组
      console.log('Cards data type:', typeof cardsData, 'Is array:', Array.isArray(cardsData));
      if (!Array.isArray(cardsData)) {
        console.error('cardsData is not an array:', cardsData);
        setAllCards([]);
        return;
      }

      setAllCards(cardsData);

      // 客户端按熟练度筛选
      let filteredCards = masteryLevel
        ? cardsData.filter(card => {
            if (masteryLevel === 'new') return card.repetitions === 0;
            if (masteryLevel === 'learning') return card.repetitions > 0 && card.repetitions < 3;
            if (masteryLevel === 'familiar') return card.repetitions >= 3 && card.repetitions < 5;
            if (masteryLevel === 'mastered') return card.repetitions >= 5;
            if (masteryLevel === 'difficult') return card.ease_factor < 2.0;
            return true;
          })
        : cardsData;

      // 搜索筛选（在正面和背面内容中搜索）
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredCards = filteredCards.filter(card =>
          card.front.toLowerCase().includes(query) ||
          card.back.toLowerCase().includes(query)
        );
      }

      setCards(filteredCards);
      setStats(statsResponse.data);
      setDecks(decksResponse.data);
      setTagsTree(tagsResponse.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.front.trim() || !formData.back.trim()) {
      toast.error('请填写正面和背面内容');
      return;
    }

    try {
      const tags: string[] = formData.tags.split(',').map(t => t.trim()).filter(t => t);

      await ankiApi.createCard(
        formData.front.trim(),
        formData.back.trim(),
        tags,
        formData.deck
      );

      toast.success('卡片创建成功');
      setShowCreateForm(false);
      setFormData({ front: '', back: '', tags: '', deck: 'default' });
      loadData();
    } catch (error) {
      console.error('Failed to create card:', error);
      toast.error('创建失败');
    }
  };

  const handleEdit = async () => {
    if (!editingCard) return;

    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      const updates: {
        front?: string;
        back?: string;
        tags?: string[];
        deck?: string;
      } = {};

      if (formData.front !== editingCard.front) updates.front = formData.front;
      if (formData.back !== editingCard.back) updates.back = formData.back;
      if (tags.join(',') !== editingCard.tags?.join(',')) updates.tags = tags;
      if (formData.deck !== editingCard.deck) updates.deck = formData.deck;

      await ankiApi.updateCard(editingCard.id, updates);

      toast.success('卡片更新成功');
      setEditingCard(null);
      setFormData({ front: '', back: '', tags: '', deck: 'default' });
      loadData();
    } catch (error) {
      console.error('Failed to update card:', error);
      toast.error('更新失败');
    }
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm('确定要删除这张卡片吗？')) return;

    try {
      await ankiApi.deleteCard(cardId);
      toast.success('卡片已删除');
      loadData();
    } catch (error) {
      console.error('Failed to delete card:', error);
      toast.error('删除失败');
    }
  };

  const startEdit = (card: Card) => {
    setEditingCard(card);
    setFormData({
      front: card.front,
      back: card.back,
      tags: getUserTags(card.tags).join(', '), // 只显示用户标签，过滤系统标签
      deck: card.deck
    });
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setFormData({ front: '', back: '', tags: '', deck: 'default' });
  };

  const toggleTagSelection = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const clearTagFilters = () => {
    setSelectedTags([]);
  };

  // ========================
  // Collection 相关函数
  // ========================

  // 加载合集列表
  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const collections = await collectionApi.getCollections();
      setAllCollections(collections);
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  // 切换卡片选择状态
  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedCards.length === cards.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(cards.map(c => c.id));
    }
  };

  // 添加选中的卡片到合集
  const handleAddToCollection = async (collectionId: string) => {
    if (selectedCards.length === 0) {
      toast.error('请先选择卡片');
      return;
    }

    try {
      const result = await collectionApi.addCardsToCollection(collectionId, selectedCards);

      toast.success(`成功添加 ${result.added_count} 张卡片到合集`);

      // 如果是在"添加到合集"模式下，添加后返回合集详情页
      if (addToCollectionMode && targetCollectionId === collectionId) {
        navigate(`/anki/collections/${collectionId}`);
      } else {
        setSelectedCards([]);
        setShowCollectionSelector(false);
      }
    } catch (error) {
      console.error('Failed to add cards to collection:', error);
      toast.error('添加失败');
    }
  };

  // 在"添加到合集"模式下，自动打开提示
  useEffect(() => {
    if (addToCollectionMode && targetCollectionName) {
      toast.info(`正在为"${targetCollectionName}"选择卡片...`);
    }
  }, [addToCollectionMode, targetCollectionName]);

  // ESC键关闭弹窗
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showCollectionSelector) {
          setShowCollectionSelector(false);
        }
        if (singleCardActionId) {
          setSingleCardActionId(null);
        }
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showCollectionSelector, singleCardActionId]);

  // 点击外部关闭单卡操作菜单
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (singleCardActionId) {
        setSingleCardActionId(null);
      }
    };

    if (singleCardActionId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [singleCardActionId]);

  // 添加单张卡片到合集
  const handleAddSingleCardToCollection = async (collectionId: string, cardId: string) => {
    try {
      const result = await collectionApi.addCardsToCollection(collectionId, [cardId]);
      toast.success(`成功添加到合集`);
      setSingleCardActionId(null);
      loadCollections(); // 刷新合集列表以更新卡片数量
    } catch (error) {
      console.error('Failed to add card to collection:', error);
      toast.error('添加失败');
    }
  };

  // 取消选择
  const handleCancelSelection = () => {
    setSelectedCards([]);
  };

  // 返回合集详情页
  const handleBackToCollection = () => {
    if (targetCollectionId) {
      navigate(`/anki/collections/${targetCollectionId}`);
    } else {
      navigate('/anki/collections');
    }
  };

  // 获取合集颜色类
  const getCollectionColorClass = (color: string): string => {
    const colors = {
      purple: 'bg-purple-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
      pink: 'bg-pink-500',
      indigo: 'bg-indigo-500',
    };
    return colors[color] || colors.purple;
  };


  // 过滤系统标签，只显示用户标签
  const getUserTags = (tags: string[]): string[] => {
    return tags.filter(tag => !tag.startsWith('system:'));
  };

  // 判断是否是系统标签
  const isSystemTag = (tag: string): boolean => tag.startsWith('system:');

  // 格式化标签显示
  const formatTag = (tag: string): string => {
    if (tag.startsWith('system:time:')) {
      return `📅 ${tag.replace('system:time:', '')}`;
    } else if (tag === 'system:recent-mistake') {
      return '❌ 最近错题';
    }
    return tag;
  };

  // 计算熟练度统计
  const getMasteryStats = () => {
    const stats = {
      new: allCards.filter(c => c.repetitions === 0).length,
      learning: allCards.filter(c => c.repetitions > 0 && c.repetitions < 3).length,
      familiar: allCards.filter(c => c.repetitions >= 3 && c.repetitions < 5).length,
      mastered: allCards.filter(c => c.repetitions >= 5).length,
      difficult: allCards.filter(c => c.ease_factor < 2.0).length,
    };
    return stats;
  };

  const masteryStats = getMasteryStats();

  // 熟练度配置
  const masteryLevels = [
    { key: 'new', label: '新卡片', color: 'blue', description: '从未复习' },
    { key: 'learning', label: '学习中', color: 'yellow', description: '复习1-2次' },
    { key: 'familiar', label: '熟悉中', color: 'purple', description: '复习3-4次' },
    { key: 'mastered', label: '已掌握', color: 'green', description: '复习5次以上' },
    { key: 'difficult', label: '困难卡片', color: 'red', description: '容易忘记' },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-500',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-500',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-500',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-500',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-500',
    };
    return colors[color] || colors.blue;
  };

  // 高亮搜索关键词
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 text-gray-900 dark:text-gray-100 px-1 rounded">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen font-sans p-6 md:p-12" style={{ paddingTop: '12vh' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <GlassCard className="px-4 py-2 hover:scale-105 transition-transform cursor-pointer">
              <button
                onClick={() => navigate('/')}
                className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
              >
                <Icons.ArrowLeft />
                返回主页
              </button>
            </GlassCard>
            <div>
              <h1 className="text-4xl font-bold dark:text-white text-gray-900 mb-2">
                记忆卡
              </h1>
              <p className="text-gray-500">使用间隔重复算法高效记忆</p>
            </div>
          </div>

          {/* 视图切换和合集按钮 */}
          <div className="flex items-center gap-3">
            {/* 卡片视图 / 合集视图 切换 */}
            <div className="flex items-center bg-white dark:bg-[#2a2a2a] rounded-lg p-1 border border-gray-200 dark:border-white/10">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'cards'
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                卡片视图
              </button>
              <button
                onClick={() => setViewMode('collections')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'collections'
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                合集视图
              </button>
            </div>

            {viewMode === 'cards' ? (
              <button
                onClick={() => navigate('/anki/collections')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/30 hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"/>
                </svg>
                自定义合集
              </button>
            ) : (
              <button
                onClick={() => navigate('/anki/collections')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/30 hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"/>
                </svg>
                管理合集
              </button>
            )}

            {/* ✨ 新增：知识生态面板开关 */}
            {viewMode === 'cards' && (
              <button
                onClick={() => setKnowledgeOpen(!knowledgeOpen)}
                className={`px-5 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  knowledgeOpen && selectedCardId
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:scale-105'
                }`}
              >
                <Icons.Knowledge />
                知识关联
              </button>
            )}
          </div>
        </div>

        {/* Selection Mode Banner */}
        {addToCollectionMode && (
          <GlassCard className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-300 dark:border-purple-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icons.Folder />
                <div>
                  <div className="text-lg font-semibold dark:text-white text-gray-900">
                    正为 "{targetCollectionName}" 选择卡片
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    已选择 {selectedCards.length} 张卡片
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedCards.length > 0 && (
                  <button
                    onClick={() => handleAddToCollection(targetCollectionId)}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/30 flex items-center gap-2"
                  >
                    <Icons.Check />
                    添加到合集
                  </button>
                )}
                <button
                  onClick={handleBackToCollection}
                  className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                  <Icons.ArrowLeft />
                  返回
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Selection Toolbar (when cards are selected) */}
        {!addToCollectionMode && selectedCards.length > 0 && (
          <GlassCard className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 text-white rounded-lg flex items-center justify-center font-semibold">
                  {selectedCards.length}
                </div>
                <span className="text-lg font-medium dark:text-white text-gray-900">
                  已选择 {selectedCards.length} 张卡片
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCollectionSelector(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/30 flex items-center gap-2"
                >
                  <Icons.Folder />
                  添加到合集
                </button>
                <button
                  onClick={handleCancelSelection}
                  className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                >
                  取消选择
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <GlassCard className="p-6">
              <div className="text-3xl font-bold dark:text-white text-gray-900 mb-1">
                {stats.total_cards}
              </div>
              <div className="text-sm text-gray-500">总卡片数</div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="text-3xl font-bold dark:text-white text-gray-900 mb-1">
                {stats.due_cards}
              </div>
              <div className="text-sm text-gray-500">待复习</div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="text-3xl font-bold dark:text-white text-gray-900 mb-1">
                {stats.reviews_today}
              </div>
              <div className="text-sm text-gray-500">今日已复习</div>
            </GlassCard>

            <GlassCard className="p-6 cursor-pointer hover:scale-105 transition-transform" onClick={() => {
              if (selectedCards.length > 0) {
                // 复习选中的卡片
                const selectedCardsData = cards.filter(c => selectedCards.includes(c.id));
                const cardIds = selectedCardsData.map(c => c.id);
                navigate('/anki/review', {
                  state: {
                    cardIds,
                    mode: 'selected'
                  }
                });
              } else {
                // 复习筛选后的卡片
                navigate('/anki/review', {
                  state: {
                    deck: selectedDeck === 'all' ? null : selectedDeck,
                    tags: selectedTags.length > 0 ? selectedTags.join(',') : null,
                    tagsMode,
                    mode: 'all'
                  }
                });
              }
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-indigo-500 dark:text-indigo-400 mb-1">
                    {selectedCards.length > 0 ? '复习选中的卡片' : '开始复习'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedCards.length > 0
                      ? `${selectedCards.length} 张卡片`
                      : (cards.length > 0 ? `${cards.length} 张卡片待复习` : '全部完成！')
                    }
                  </div>
                </div>
                <Icons.Play />
              </div>
            </GlassCard>
          </div>
        )}

        {/* 查看统计图表按钮 */}
        <div className="mb-8">
          <button
            onClick={() => setShowStatsCharts(!showStatsCharts)}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
          >
            <svg className={`w-5 h-5 transition-transform ${showStatsCharts ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showStatsCharts ? '隐藏统计图表' : '查看统计图表'}
          </button>
        </div>

        {/* 统计图表区域 */}
        {showStatsCharts && (
          <AnkiStatsCharts />
        )}

        {/* Filters and Actions */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          {/* 搜索框 */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索卡片内容..."
              className="w-64 pl-10 pr-12 py-2 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:border-indigo-500 placeholder-gray-400"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <>
                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {cards.length} 个结果
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* 牌组选择 */}
          <select
            value={selectedDeck}
            onChange={(e) => setSelectedDeck(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:border-indigo-500"
          >
            <option value="all">全部牌组</option>
            {decks.map(deck => (
              <option key={deck.name} value={deck.name}>
                {deck.name} ({deck.total_cards})
              </option>
            ))}
          </select>

          {/* 标签筛选按钮 */}
          <button
            onClick={() => setShowTagFilter(!showTagFilter)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              selectedTags.length > 0
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-500'
                : 'bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:border-indigo-500'
            }`}
          >
            <span>标签筛选</span>
            {selectedTags.length > 0 && (
              <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
                {selectedTags.length}
              </span>
            )}
          </button>

          {/* 已选标签显示 */}
          {selectedTags.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">已选:</span>
              {selectedTags.slice(0, 2).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded truncate max-w-24"
                >
                  {tag}
                </span>
              ))}
              {selectedTags.length > 2 && (
                <span className="text-gray-500">+{selectedTags.length - 2}</span>
              )}
              <button
                onClick={clearTagFilters}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>
          )}

          {/* 清除熟练度筛选按钮 */}
          {masteryLevel && (
            <button
              onClick={() => setMasteryLevel(null)}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
            >
              清除筛选
            </button>
          )}

          {/* 熟练度快速筛选按钮 */}
          {masteryLevels.map(level => (
            <button
              key={level.key}
              onClick={() => {
                setOrphanMode(false);
                setMasteryLevel(masteryLevel === level.key ? null : level.key);
              }}
              className={`px-2 py-1 text-xs rounded-lg transition-all border-2 ${
                masteryLevel === level.key
                  ? getColorClasses(level.color)
                  : 'bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
              }`}
              title={level.description}
            >
              {level.label} ({masteryStats[level.key]})
            </button>
          ))}

          {/* 无家可归卡片筛选按钮 */}
          <button
            onClick={() => {
              setOrphanMode(!orphanMode);
              setMasteryLevel(null);
              setSelectedDeck('all');
              setSelectedTags([]);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all border-2 flex items-center gap-2 ${
              orphanMode
                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-500'
                : 'bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-orange-300 dark:hover:border-orange-600'
            }`}
            title="查看不属于任何合集的卡片"
          >
            <span>🏠</span>
            无家可归卡片
            {orphanMode && <span className="text-xs">({cards.length})</span>}
          </button>

          {/* 创建卡片按钮 */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="ml-auto px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-indigo-500/30 hover:scale-105 flex items-center gap-2"
          >
            <Icons.Plus />
            创建卡片
          </button>
        </div>

        {/* 标签树筛选面板 */}
        {showTagFilter && (
          <GlassCard className="p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold dark:text-white text-gray-900">
                  按层级筛选标签
                </h3>

                {/* 模式选择器 */}
                {selectedTags.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">匹配模式:</span>
                    <button
                      onClick={() => setTagsMode('or')}
                      className={`px-3 py-1 text-sm rounded transition-all ${
                        tagsMode === 'or'
                          ? 'bg-indigo-500 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'
                      }`}
                    >
                      OR (包含任意)
                    </button>
                    <button
                      onClick={() => setTagsMode('and')}
                      className={`px-3 py-1 text-sm rounded transition-all ${
                        tagsMode === 'and'
                          ? 'bg-indigo-500 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'
                      }`}
                    >
                      AND (同时满足)
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowTagFilter(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
              >
                ×
              </button>
            </div>
            <TagTreeSelect
              tags={tagsTree}
              selectedTags={selectedTags}
              onToggle={toggleTagSelection}
            />
            <div className="mt-3 text-xs text-gray-400 text-center">
              <div>提示：点击分类进入下一级，勾选复选框选择标签（支持多选）</div>
              {selectedTags.length > 0 && (
                <div className="mt-1 text-indigo-500 dark:text-indigo-400">
                  {tagsMode === 'or' ? '当前：包含任意标签' : '当前：同时包含所有标签'}
                </div>
              )}
              <div className="mt-2 text-gray-500">
                💡 快速筛选：选择"系统标签 &gt; 最近错题"可快速复习答错的卡片
              </div>
            </div>
          </GlassCard>
        )}

        {/* Create/Edit Form */}
        {(showCreateForm || editingCard) && (
          <GlassCard className="p-6 mb-6">
            <h2 className="text-xl font-bold dark:text-white text-gray-900 mb-4">
              {editingCard ? '编辑卡片' : '创建新卡片'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  正面（问题）
                </label>
                <textarea
                  value={formData.front}
                  onChange={(e) => setFormData({ ...formData, front: e.target.value })}
                  placeholder="输入问题..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  背面（答案）
                </label>
                <textarea
                  value={formData.back}
                  onChange={(e) => setFormData({ ...formData, back: e.target.value })}
                  placeholder="输入答案..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    牌组
                  </label>
                  <input
                    type="text"
                    value={formData.deck}
                    onChange={(e) => setFormData({ ...formData, deck: e.target.value })}
                    placeholder="牌组名称"
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    标签（逗号分隔）
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="数学>微积分>导数, 物理>力学"
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    提示：使用 &gt; 分隔层级（如：数学&gt;微积分&gt;导数）。系统会自动添加时间标签。
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={showCreateForm ? () => { setShowCreateForm(false); setFormData({ front: '', back: '', tags: '', deck: 'default' }); } : cancelEdit}
                  className="px-6 py-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={showCreateForm ? handleCreate : handleEdit}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-indigo-500/30"
                >
                  {showCreateForm ? '创建' : '保存'}
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Content: Cards or Collections View */}
        {viewMode === 'collections' ? (
          /* 合集视图 */
          <>
            {allCollections.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-gray-600 py-12">
                <div className="text-6xl mb-4">📚</div>
                <div className="text-xl font-semibold mb-2">还没有合集</div>
                <div className="text-sm mb-6">点击"自定义合集"创建你的第一个合集吧！</div>
                <button
                  onClick={() => navigate('/anki/collections')}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold"
                >
                  创建合集
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCollections.map(collection => (
                  <GlassCard
                    key={collection.id}
                    className="p-6 cursor-pointer hover:scale-[1.02] transition-transform"
                    onClick={() => navigate(`/anki/collections/${collection.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-3 h-3 rounded-full ${getCollectionColorClass(collection.color)}`} />
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {collection.card_count || 0} 张卡片
                      </div>
                    </div>

                    <h3 className={`text-xl font-bold mb-2 dark:text-white text-gray-900`}>
                      {collection.name}
                    </h3>

                    {collection.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                        {collection.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Start review with this collection
                          const cardIds = allCollections.find(c => c.id === collection.id)?.card_ids || [];
                          navigate('/anki/review', {
                            state: {
                              collectionId: collection.id,
                              cardIds,
                              mode: 'collection'
                            }
                          });
                        }}
                        className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 font-medium"
                      >
                        <Icons.Play />
                        复习
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/anki/collections/${collection.id}`);
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        查看详情 →
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </>
        ) : (
          /* 卡片视图 */
          <>
        {/* Cards List */}
        {isLoading ? (
          <div className="text-center text-gray-400 dark:text-gray-600 py-12">
            加载中...
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-600 py-12">
            {orphanMode ? (
              <>
                <div className="text-6xl mb-4">🎉</div>
                <div className="text-xl font-semibold mb-2">所有卡片都已归类！</div>
                <div className="text-sm">太棒了，你已经把所有卡片都整理到合集中了</div>
              </>
            ) : (
              <>还没有卡片，点击"创建卡片"开始吧！</>
            )}
          </div>
        ) : (
          <>
            {/* Select All Checkbox */}
            {(addToCollectionMode || selectedCards.length > 0) && (
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                    selectedCards.length === cards.length && cards.length > 0
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'
                  }`}
                >
                  {selectedCards.length === cards.length && cards.length > 0 && <Icons.Check />}
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCards.length === cards.length && cards.length > 0 ? '取消全选' : '全选'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map(card => {
                const isSelected = selectedCards.includes(card.id);
                return (
                  <GlassCard
                    key={card.id}
                    className={`p-6 relative cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : ''
                    } ${
                      selectedCardId === card.id && knowledgeOpen ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => {
                      if (!editingCard && (addToCollectionMode || selectedCards.length > 0)) {
                        toggleCardSelection(card.id);
                      } else {
                        // ✨ 新增：点击卡片选择并显示知识面板
                        setSelectedCardId(card.id);
                        if (!knowledgeOpen) {
                          setKnowledgeOpen(true);
                        }
                      }
                    }}
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute top-4 left-4 z-10">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCardSelection(card.id);
                        }}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500 border-indigo-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 bg-white dark:bg-[#2a2a2a]'
                        }`}
                      >
                        {isSelected && <Icons.Check />}
                      </div>
                    </div>

                    {/* Add to Collection Button (single card) */}
                    {!addToCollectionMode && (
                      <div className="absolute top-4 right-4 z-10">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSingleCardActionId(singleCardActionId === card.id ? null : card.id);
                            }}
                            className={`p-2 rounded-lg transition-all ${
                              singleCardActionId === card.id
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-900/20'
                            }`}
                          >
                            <Icons.Folder />
                          </button>

                          {/* Collection Menu */}
                          {singleCardActionId === card.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-xl border border-gray-200 dark:border-white/10 z-50">
                              <div className="p-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 font-medium">
                                  添加到合集
                                </div>
                                {allCollections.length === 0 ? (
                                  <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                                    暂无合集
                                  </div>
                                ) : (
                                  <div className="max-h-64 overflow-y-auto">
                                    {allCollections.map(collection => (
                                      <button
                                        key={collection.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddSingleCardToCollection(collection.id, card.id);
                                        }}
                                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-left"
                                      >
                                        <div className={`w-3 h-3 rounded ${getCollectionColorClass(collection.color)}`} />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium dark:text-white text-gray-900 truncate">
                                            {collection.name}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {collection.card_count || 0} 张卡片
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mb-4 mt-8">
                      <div className="text-sm text-gray-500 mb-2">正面</div>
                      <div className="text-lg font-medium dark:text-white text-gray-900 line-clamp-3">
                        <MarkdownCard content={card.front} />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm text-gray-500 mb-2">背面</div>
                      <div className="text-base dark:text-gray-200 text-gray-700 line-clamp-3">
                        <MarkdownCard content={card.back} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {/* 用户标签 */}
                      {getUserTags(card.tags).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {/* 系统标签（可选显示） */}
                      {card.tags.some(isSystemTag) && (
                        <>
                          {card.tags.filter(isSystemTag).map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 rounded"
                              title="系统自动标签"
                            >
                              {formatTag(tag)}
                            </span>
                          ))}
                        </>
                      )}
                      {/* 牌组 */}
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded">
                        {card.deck}
                      </span>
                    </div>

                    <div className="flex gap-2 text-xs text-gray-500 mb-4">
                      <span>复习次数: {card.repetitions}</span>
                      <span>间隔: {card.interval}天</span>
                    </div>

                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => startEdit(card)}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <Icons.Edit />
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </>
        )}
        </>
        )}

        {/* Collection Selector Modal */}
        {showCollectionSelector && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCollectionSelector(false)}
          >
            <div
              className="bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold dark:text-white text-gray-900">选择合集</h2>
                  <button
                    onClick={() => setShowCollectionSelector(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  将 {selectedCards.length} 张卡片添加到合集
                </p>
              </div>

              <div className="p-4 overflow-y-auto max-h-96">
                {allCollections.length === 0 ? (
                  <div className="text-center py-8">
                    <Icons.Folder />
                    <p className="text-gray-500 dark:text-gray-400 mt-2">暂无合集</p>
                    <button
                      onClick={() => {
                        setShowCollectionSelector(false);
                        navigate('/anki/collections');
                      }}
                      className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-all"
                    >
                      创建合集
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allCollections.map(collection => (
                      <button
                        key={collection.id}
                        onClick={() => handleAddToCollection(collection.id)}
                        className="w-full p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all flex items-center gap-4 border border-gray-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-600"
                      >
                        <div className={`w-4 h-4 rounded ${getCollectionColorClass(collection.color)}`} />
                        <div className="flex-1 text-left">
                          <div className="font-semibold dark:text-white text-gray-900">
                            {collection.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {collection.description || '暂无描述'}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {collection.card_count || 0} 张
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                <button
                  onClick={() => setShowCollectionSelector(false)}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors font-medium"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✨ 新增：知识生态面板 */}
        <AnimatePresence mode="wait">
          {knowledgeOpen && selectedCardId && viewMode === 'cards' && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              className="fixed right-6 top-28 bottom-8 w-[400px] z-40"
              style={{ paddingTop: '12vh' }}
            >
              <KnowledgePanel type="card" id={selectedCardId} className="h-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AnkiPage;
