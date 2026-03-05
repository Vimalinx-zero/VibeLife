import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import GlassCard from "../components/GlassCard";
import * as collectionApi from "../utils/collectionApi";
import { Collection } from "../types";

const Icons = {
  Plus: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.5 2.25a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5V3a.75.75 0 01.75-.75z" /></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 11-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 00-1.498-.058l-.347 9a.75.75 0 101.5.058l.345-9z" clipRule="evenodd" /></svg>,
  Play: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>,
  ArrowLeft: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.53 2.47a.75.75 0 010 1.06L4.81 8.25H15a6.75 6.75 0 010 13.5h-3a.75.75 0 010-1.5h3a5.25 5.25 0 100-10.5H4.81l4.72 4.72a.75.75 0 01-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
};

// 颜色选项
const COLOR_OPTIONS = [
  { value: 'blue', label: '蓝色', bg: 'bg-blue-500' },
  { value: 'green', label: '绿色', bg: 'bg-green-500' },
  { value: 'red', label: '红色', bg: 'bg-red-500' },
  { value: 'yellow', label: '黄色', bg: 'bg-yellow-500' },
  { value: 'purple', label: '紫色', bg: 'bg-purple-500' },
];

function CollectionsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  // States
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'blue'
  });

  // Load collections
  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      const data = await collectionApi.getCollections();
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections:', error);
      toast.error('加载合集失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入合集名称');
      return;
    }

    try {
      await collectionApi.createCollection(
        formData.name.trim(),
        formData.description.trim() || undefined as any,
        formData.color
      );

      toast.success('合集创建成功');
      setShowCreateForm(false);
      setFormData({ name: '', description: '', color: 'blue' });
      loadCollections();
    } catch (error) {
      const err = error as Error;
      console.error('Failed to create collection:', error);
      toast.error(err.message || '创建失败');
    }
  };

  const handleUpdate = async () => {
    if (!editingCollection) return;

    try {
      const updates: { name?: string; description?: string; color?: string } = {};
      if (formData.name !== editingCollection.name) updates.name = formData.name;
      if (formData.description !== editingCollection.description) updates.description = formData.description;
      if (formData.color !== editingCollection.color) updates.color = formData.color;

      await collectionApi.updateCollection(editingCollection.id, updates);

      toast.success('合集更新成功');
      setEditingCollection(null);
      setFormData({ name: '', description: '', color: 'blue' });
      loadCollections();
    } catch (error) {
      const err = error as Error;
      console.error('Failed to update collection:', error);
      toast.error(err.message || '更新失败');
    }
  };

  const handleDelete = async (collectionId) => {
    if (!confirm('确定要删除这个合集吗？合集内的所有卡片关联也会被删除。')) return;

    try {
      await collectionApi.deleteCollection(collectionId);
      toast.success('合集已删除');
      loadCollections();
    } catch (error) {
      console.error('Failed to delete collection:', error);
      toast.error('删除失败');
    }
  };

  const startEdit = (collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      color: collection.color
    });
  };

  const cancelEdit = () => {
    setEditingCollection(null);
    setFormData({ name: '', description: '', color: 'blue' });
  };

  const viewCollection = (collectionId) => {
    navigate(`/anki/collections/${collectionId}`);
  };

  const getColorClass = (color) => {
    const colorMap = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-500',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-500',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-500',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-500',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-500',
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="min-h-screen font-sans p-6 md:p-12" style={{ paddingTop: '12vh' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <GlassCard className="px-4 py-2 hover:scale-105 transition-transform cursor-pointer w-fit mb-4">
              <button
                onClick={() => navigate('/anki')}
                className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
              >
                <Icons.ArrowLeft />
                返回记忆卡
              </button>
            </GlassCard>
            <h1 className="text-4xl font-bold dark:text-white text-gray-900 mb-2">
              自定义合集
            </h1>
            <p className="text-gray-500">手动组织你的卡片，为不同学习场景创建专属集合</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-indigo-500/30 hover:scale-105 flex items-center gap-2"
          >
            <Icons.Plus />
            创建合集
          </button>
        </div>

        {/* Create/Edit Form */}
        {(showCreateForm || editingCollection) && (
          <GlassCard className="p-6 mb-6">
            <h2 className="text-xl font-bold dark:text-white text-gray-900 mb-4">
              {editingCollection ? '编辑合集' : '创建新合集'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  合集名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：今日复习、期末重点"
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  描述（可选）
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述这个合集的用途..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  颜色标识
                </label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, color: option.value })}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.color === option.value
                          ? `${getColorClass(option.value)} border-2`
                          : 'bg-white dark:bg-[#2a2a2a] border-gray-200 dark:border-white/10 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={showCreateForm ? () => { setShowCreateForm(false); setFormData({ name: '', description: '', color: 'blue' }); } : cancelEdit}
                  className="px-6 py-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={showCreateForm ? handleCreate : handleUpdate}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-indigo-500/30"
                >
                  {showCreateForm ? '创建' : '保存'}
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Collections List */}
        {isLoading ? (
          <div className="text-center text-gray-400 dark:text-gray-600 py-12">
            加载中...
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-600 py-12">
            <div className="text-6xl mb-4">📚</div>
            <div className="text-xl font-semibold mb-2">还没有合集</div>
            <div className="text-sm mb-6">点击"创建合集"开始组织你的卡片吧！</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map(collection => (
              <GlassCard
                key={collection.id}
                className="p-6 cursor-pointer hover:scale-[1.02] transition-transform"
                onClick={() => viewCollection(collection.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-3 h-3 rounded-full ${COLOR_OPTIONS.find(c => c.value === collection.color)?.bg || 'bg-blue-500'}`} />
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(collection); }}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <Icons.Edit />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(collection.id); }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>

                <h3 className={`text-xl font-bold mb-2 ${getColorClass(collection.color).split(' ')[2]}`}>
                  {collection.name}
                </h3>

                {collection.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {collection.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{collection.card_count} 张卡片</span>
                  <button className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1">
                    <Icons.Play />
                    查看
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CollectionsPage;
