import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import axios from "axios";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Corner {
  x: number;
  y: number;
}

interface ImageEditorProps {
  onImageSelected?: (data: any) => void;
  onClose?: () => void;
}

const Icons = {
  Upload: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  Crop: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5h10.5m-10.5 0v10.5m0-10.5L3.75 3.75M17.25 7.5v10.5m0-10.5L20.25 3.75M6.75 17.25L3.75 20.25M17.25 17.25l3 3" /></svg>,
  Perspective: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l4.5 4.5m9 9L21 21M3 21l4.5-4.5m9-9L21 3" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
};

/**
 * 图片编辑器组件
 * 支持上传、裁剪、透视变形、自动增强
 */
const ImageEditor = ({ onImageSelected, onClose }: ImageEditorProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("upload"); // upload | crop | perspective
  const [loading, setLoading] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [corners, setCorners] = useState<Corner[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 上传图片
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    setLoading(true);

    try {
      // 读取本地预览
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result !== 'string') return;

        const img = new Image();
        img.onload = () => {
          setOriginalImage(result);
          setImage(result);
          setMode("crop");

          // 初始化裁剪区域（默认 80% 居中）
          const width = img.width;
          const height = img.height;
          const margin = Math.min(width, height) * 0.1;
          setCropArea({
            x: margin,
            y: margin,
            width: width - 2 * margin,
            height: height - 2 * margin
          });

          // 初始化透视变换的四个角点
          setCorners([
            { x: margin, y: margin }, // 左上
            { x: width - margin, y: margin }, // 右上
            { x: width - margin, y: height - margin }, // 右下
            { x: margin, y: height - margin } // 左下
          ]);
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("上传失败:", error);
      alert("图片上传失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 调用后端增强API
  const handleEnhance = async (croppedImage) => {
    setLoading(true);

    try {
      // 将 base64 转换为 Blob
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');

      // 上传到后端
      const enhanceRes = await axios.post('http://localhost:8000/api/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (enhanceRes.data.success) {
        // 返回增强后的图片URL
        const enhancedUrl = `http://localhost:8000${enhanceRes.data.enhanced_url}`;

        // 调用回调，传递图片信息
        if (onImageSelected) {
          onImageSelected({
            url: enhancedUrl,
            originalUrl: `http://localhost:8000${enhanceRes.data.original_url}`,
            metadata: enhanceRes.data.metadata
          });
        }

        // 关闭编辑器
        if (onClose) onClose();
      }
    } catch (error) {
      console.error("增强失败:", error);
      alert("图片增强失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 裁剪图片（使用 Canvas）
  const handleCropConfirm = () => {
    if (!cropArea || !originalImage) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();

    img.onload = () => {
      // 设置 canvas 大小为裁剪区域大小
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      // 裁剪并绘制
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height, // 源区域
        0, 0, cropArea.width, cropArea.height // 目标区域
      );

      // 获取裁剪后的图片（base64）
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setImage(croppedDataUrl);
      setMode("perspective");
    };

    img.src = originalImage;
  };

  // 确认并增强
  const handleConfirm = () => {
    handleEnhance(image);
  };

  // 重置
  const handleReset = () => {
    setImage(originalImage);
    setMode("crop");
    setCropArea(null);
    setCorners([]);
  };

  // 上传模式渲染
  const renderUploadMode = () => (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div
        className="w-full max-w-md aspect-square border-4 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-6 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
          <Icons.Upload />
        </div>
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          点击上传图片
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          支持 JPG、PNG、GIF 等格式
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          最大 10MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
      />
    </div>
  );

  // 裁剪模式渲染
  const renderCropMode = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative overflow-hidden bg-gray-900 rounded-lg">
        {image && (
          <>
            <img
              src={image}
              alt="To crop"
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(100vh - 300px)' }}
            />
            {/* 裁剪区域覆盖层（简化版，实际需要更复杂的交互） */}
            <div
              className="absolute border-2 border-white shadow-2xl"
              style={{
                left: cropArea?.x || 0,
                top: cropArea?.y || 0,
                width: cropArea?.width || 0,
                height: cropArea?.height || 0,
              }}
            >
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full cursor-nw-resize" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full cursor-ne-resize" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full cursor-sw-resize" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full cursor-se-resize" />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          重置
        </button>
        <button
          onClick={() => setMode("perspective")}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          跳过裁剪
        </button>
        <button
          onClick={handleCropConfirm}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
        >
          <Icons.Check />
          确认裁剪
        </button>
      </div>
    </div>
  );

  // 透视模式渲染
  const renderPerspectiveMode = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative overflow-hidden bg-gray-900 rounded-lg p-4">
        {image && (
          <div className="relative inline-block mx-auto">
            <img
              src={image}
              alt="Perspective"
              className="max-w-full max-h-[calc(100vh-350px)] object-contain"
            />
            <p className="text-center text-sm text-gray-400 mt-2">
              透视变形功能开发中...
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <Icons.Refresh />
          重新开始
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <Icons.Download />
              自动增强并插入
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {mode === "upload" && "上传图片"}
            {mode === "crop" && "裁剪图片"}
            {mode === "perspective" && "透视变形"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 p-6 overflow-auto">
          {loading && mode === "upload" && (
            <div className="flex items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && mode === "upload" && renderUploadMode()}
          {!loading && mode === "crop" && renderCropMode()}
          {!loading && mode === "perspective" && renderPerspectiveMode()}
        </div>

        {/* 隐藏的 Canvas 用于裁剪 */}
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </div>
  );
};

export default ImageEditor;
