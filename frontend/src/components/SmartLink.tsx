import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../utils/api";

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
                if (type !== "note") {
                    throw new Error(`Unsupported smart link type: ${type}`);
                }

                const res = await apiClient.get(`/card/preview?type=${type}&id=${encodeURIComponent(id)}`);
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
        navigate('/notes');
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('loadNote', { detail: { id } }));
        }, 100);
    };

    return (
        <span
            onClick={handleClick}
            className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
                text-xs font-semibold cursor-pointer
                border shadow-sm
                bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30
            `}
        >
            <span className="text-[10px] opacity-70">📄</span>
            <span>{data.title || '未命名笔记'}</span>
            <span className="opacity-50">↗</span>
        </span>
    );
};

export default SmartLink;
