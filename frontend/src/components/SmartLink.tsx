// #(注释) frontend/src/components/SmartLink.jsx
// ✨ 简化版：内联链接样式，点击跳转，支持缓存避免闪烁
import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SmartLink = ({ type, id, originalText, cachedData, onCacheUpdate }) => {
    const [data, setData] = useState(cachedData || null); // ✅ 优先使用缓存数据
    const [loading, setLoading] = useState(cachedData ? false : true); // ✅ 有缓存就不 loading
    const [error, setError] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // ✅ 如果有缓存数据，直接使用，不请求
        if (cachedData) {
            setData(cachedData);
            setLoading(false);
            setError(false);
            return;
        }

        let isMounted = true;
        const fetchData = async () => {
            try {
                // 清理 ID (移除 gk_ 前缀)
                const cleanId = id.replace("gk_", "");
                const res = await axios.get(`http://localhost:8000/api/card/preview?type=${type}&id=${cleanId}`);
                if (isMounted) {
                    if (res.data.found) {
                        const fetchedData = res.data;
                        setData(fetchedData);
                        // ✅ 通知父组件更新缓存
                        if (onCacheUpdate) {
                            onCacheUpdate(fetchedData);
                        }
                    } else {
                        setError(true);
                    }
                    setLoading(false);
                }
            } catch (e) {
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [type, id, cachedData, onCacheUpdate]);

    // 1. 加载中状态
    if (loading) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-xs text-gray-500">
                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                Loading...
            </span>
        );
    }

    // 2. 错误状态
    if (error || !data) {
        return <span className="text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-xs font-mono border border-red-200">⚠️ {originalText}</span>;
    }

    // 3. 渲染简洁的内联链接
    const handleClick = () => {
        if (type === 'note') {
            // 跳转到笔记页并加载对应笔记
            navigate('/notes');
            // 通过事件总线或全局状态来加载笔记（这里简化处理）
            setTimeout(() => {
                // 触发自定义事件，让 NotesPage 监听并跳转
                window.dispatchEvent(new CustomEvent('loadNote', { detail: { id } }));
            }, 100);
        } else if (type === 'question' || type === 'gk') {
            // 跳转到错题本页面并加载对应错题
            // ✅ 修复：使用 URL 参数传递 questionId，确保直接打开对应错题
            const cleanId = id.replace("gk_", "");
            navigate(`/mistakes?questionId=${cleanId}`);
            // 同时也触发事件作为备用
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('loadMistake', { detail: { questionId: cleanId } }));
            }, 150);
        }
    };

    return (
        <span
            onClick={handleClick}
            className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
                text-xs font-semibold cursor-pointer
                border shadow-sm
                ${type === 'question'
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'
                    : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30'
                }
            `}
        >
            {/* ✅ 特殊标记：错题引用显示 📌 图标 */}
            <span className={type === 'question' ? 'text-sm' : 'text-[10px] opacity-70'}>
                {type === 'question' ? '📌' : '📄'}
            </span>

            {/* 标题：错题显示"关联错题"，笔记显示笔记标题 */}
            <span>{type === 'question' ? `关联错题 ${data.title || id.replace('gk_', '')}` : (data.title || '未命名笔记')}</span>

            {/* 外链图标 */}
            <span className="opacity-50">↗</span>
        </span>
    );
};

export default SmartLink;
