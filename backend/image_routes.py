"""
图片处理路由
支持图片上传、自动增强、裁剪、透视变形等
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from PIL import Image, ImageEnhance, ImageFilter
import os
import uuid
from typing import Optional
import io

router = APIRouter()

# 配置
UPLOAD_DIR = "uploads/questions"
ENHANCED_DIR = "uploads/enhanced"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# 确保目录存在
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(ENHANCED_DIR, exist_ok=True)


def auto_enhance_image(image: Image.Image) -> Image.Image:
    """
    自动增强图片清晰度

    Args:
        image: PIL Image 对象

    Returns:
        增强后的 PIL Image 对象
    """

    # 1. 自动裁剪空白边缘（如果图片是白底黑字）
    # 获取图片的边界框
    bbox = image.getbbox()

    if bbox:
        # 裁剪掉空白边缘
        image = image.crop(bbox)

    # 2. 对比度增强 (1.3x)
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.3)

    # 3. 锐化处理
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(2.0)

    # 4. 亮度微调（如果太暗或太亮）
    # 转换为灰度图计算平均亮度
    grayscale = image.convert('L')
    avg_brightness = sum(grayscale.getdata()) / (grayscale.width * grayscale.height)

    if avg_brightness < 100:  # 太暗
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.2)
    elif avg_brightness > 200:  # 太亮
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(0.9)

    # 5. 降噪（轻微）
    image = image.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))

    return image


def get_file_extension(filename: str) -> str:
    """获取文件扩展名"""
    return os.path.splitext(filename)[1].lower()


@router.post("/api/images/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    上传图片并自动增强

    Returns:
        {
            "success": true,
            "original_url": "/uploads/questions/xxx.jpg",
            "enhanced_url": "/uploads/enhanced/xxx.jpg",
            "metadata": {
                "original_size": [width, height],
                "enhanced_size": [width, height],
                "format": "JPEG",
                "file_size": 12345
            }
        }
    """

    # 验证文件扩展名
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式。支持的格式: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 读取文件内容
    content = await file.read()

    # 验证文件大小
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件过大。最大支持 {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # 生成唯一文件名
    file_id = str(uuid.uuid4())
    original_filename = f"{file_id}{ext}"
    enhanced_filename = f"{file_id}_enhanced.jpg"  # 增强后统一保存为 JPEG

    original_path = os.path.join(UPLOAD_DIR, original_filename)
    enhanced_path = os.path.join(ENHANCED_DIR, enhanced_filename)

    try:
        # 打开原始图片
        image = Image.open(io.BytesIO(content))

        # 转换 RGBA 为 RGB（JPEG 不支持透明）
        if image.mode in ('RGBA', 'LA', 'P'):
            # 创建白色背景
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')

        # 保存原始图片
        original_size = image.size
        image.save(original_path, format='JPEG' if ext == '.jpg' or ext == '.jpeg' else 'PNG', quality=95)

        # 自动增强
        enhanced_image = auto_enhance_image(image)

        # 保存增强后的图片
        enhanced_image.save(enhanced_path, format='JPEG', quality=95, optimize=True)

        # 获取增强后的文件大小
        enhanced_file_size = os.path.getsize(enhanced_path)

        return {
            "success": True,
            "original_url": f"/uploads/questions/{original_filename}",
            "enhanced_url": f"/uploads/enhanced/{enhanced_filename}",
            "metadata": {
                "original_size": list(original_size),
                "enhanced_size": list(enhanced_image.size),
                "format": "JPEG",
                "file_size": enhanced_file_size,
                "file_id": file_id
            }
        }

    except Exception as e:
        # 清理可能已创建的文件
        if os.path.exists(original_path):
            os.remove(original_path)
        if os.path.exists(enhanced_path):
            os.remove(enhanced_path)

        raise HTTPException(status_code=500, detail=f"图片处理失败: {str(e)}")


@router.get("/uploads/questions/{filename}")
async def get_original_image(filename: str):
    """获取原始上传的图片"""
    file_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在")

    return FileResponse(file_path)


@router.get("/uploads/enhanced/{filename}")
async def get_enhanced_image(filename: str):
    """获取增强后的图片"""
    file_path = os.path.join(ENHANCED_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在")

    return FileResponse(file_path)


@router.post("/api/images/crop")
async def crop_image(
    file_id: str,
    x: int,
    y: int,
    width: int,
    height: int
):
    """
    裁剪图片

    Args:
        file_id: 图片 ID
        x, y: 裁剪区域左上角坐标
        width, height: 裁剪区域宽高

    Returns:
        裁剪后的图片 URL
    """

    # 查找原始图片
    for ext in ALLOWED_EXTENSIONS:
        original_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(original_path):
            break
    else:
        raise HTTPException(status_code=404, detail="原始图片不存在")

    try:
        # 打开图片
        image = Image.open(original_path)

        # 验证裁剪区域
        img_width, img_height = image.size
        if x < 0 or y < 0 or x + width > img_width or y + height > img_height:
            raise HTTPException(status_code=400, detail="裁剪区域超出图片范围")

        # 裁剪
        cropped = image.crop((x, y, x + width, y + height))

        # 生成新文件名
        cropped_filename = f"{file_id}_cropped_{uuid.uuid4().hex[:8]}.jpg"
        cropped_path = os.path.join(ENHANCED_DIR, cropped_filename)

        # 保存
        if cropped.mode != 'RGB':
            cropped = cropped.convert('RGB')
        cropped.save(cropped_path, format='JPEG', quality=95)

        return {
            "success": True,
            "cropped_url": f"/uploads/enhanced/{cropped_filename}",
            "metadata": {
                "size": list(cropped.size),
                "crop_area": [x, y, width, height]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"裁剪失败: {str(e)}")
