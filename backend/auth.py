# backend/auth.py
# 认证相关工具函数

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Header, HTTPException, status
import bcrypt
import secrets
import os

# ✅ 安全修复：JWT 配置从环境变量读取
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))  # 如果未设置，生成随机密钥
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 默认7天


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """生成密码hash"""
    # bcrypt 自动处理盐值
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def generate_user_id() -> str:
    """生成用户ID（u_前缀 + 随机字符串）"""
    random_str = secrets.token_hex(4)
    return f"u_{random_str}"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def decode_access_token(token: str) -> Optional[str]:
    """解码JWT token，返回用户ID"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    FastAPI 依赖：从 Authorization header 中提取当前用户ID

    用法:
        @app.get("/api/protected")
        async def protected_route(current_user_id: str = Depends(get_current_user_id)):
            return {"user_id": current_user_id}
    """
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication header format. Expected: 'Bearer <token>'",
        )

    token = authorization.split(" ")[1]
    user_id = decode_access_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    return user_id
