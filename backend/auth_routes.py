# backend/auth_routes.py
# 用户认证相关API路由

from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import User
from auth import (
    verify_password,
    get_password_hash,
    generate_user_id,
    create_access_token,
    decode_access_token,
)

router = APIRouter(prefix="/api/auth", tags=["认证"])


# --- 依赖注入 ---


async def get_current_user(
    authorization: Optional[str] = Header(None), db: Session = Depends(get_db)
):
    """
    从请求头中获取当前用户

    - 验证JWT token
    - 返回用户对象
    """
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 提取token（格式：Bearer <token>）
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证格式",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证格式",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 解码token
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 查询用户
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="账户已被禁用"
        )

    return user


async def get_current_user_id(current_user: User = Depends(get_current_user)) -> str:
    """
    获取当前用户ID（简化版本，只返回ID字符串）

    用于其他路由的用户过滤
    """
    return current_user.id


# --- Pydantic 模型 ---


class UserRegister(BaseModel):
    """用户注册请求"""

    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """用户登录请求"""

    username: str
    password: str


class Token(BaseModel):
    """Token响应"""

    access_token: str
    token_type: str
    user_id: str
    username: str


class UserResponse(BaseModel):
    """用户信息响应"""

    id: str
    username: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: str
    last_login: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    """修改密码请求"""

    current_password: str
    new_password: str


# --- API 端点 ---


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    用户注册

    - 创建新用户
    - 返回JWT token
    """

    # 1. 检查用户名是否已存在
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="用户名已存在"
        )

    # 2. 检查邮箱是否已存在
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="邮箱已被注册"
        )

    # 3. 创建新用户
    user_id = generate_user_id()
    password_hash = get_password_hash(user_data.password)

    new_user = User(
        id=user_id,
        username=user_data.username,
        email=user_data.email,
        password_hash=password_hash,
        full_name=user_data.full_name,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4. 生成JWT token
    access_token = create_access_token(data={"sub": new_user.id})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=new_user.id,
        username=new_user.username,
    )


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    用户登录

    - 验证用户名和密码
    - 返回JWT token
    - 更新最后登录时间
    """

    # 1. 查找用户
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. 验证密码
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. 检查账户是否激活
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="账户已被禁用"
        )

    # 4. 更新最后登录时间
    from datetime import datetime

    user.last_login = datetime.utcnow().isoformat()
    db.commit()

    # 5. 生成JWT token
    access_token = create_access_token(data={"sub": user.id})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    获取当前用户信息

    - 从 Authorization: Bearer <token> 中验证JWT
    - 返回用户信息
    """
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
    )


@router.post("/logout")
async def logout():
    """
    用户登出

    - 客户端删除token即可
    - 服务端无需做额外操作（因为JWT是无状态的）
    """
    return {"message": "登出成功"}


@router.post("/change-password")
async def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """修改当前登录用户密码"""
    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密码至少6位",
        )

    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码错误",
        )

    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()

    return {"success": True, "message": "密码修改成功"}
