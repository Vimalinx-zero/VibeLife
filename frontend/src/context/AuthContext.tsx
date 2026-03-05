// frontend/src/context/AuthContext.tsx
// 认证上下文 - 管理用户登录状态和JWT token

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthResponse } from "../types";

// 用户信息接口
interface UserInfo {
  id: string;
  username: string;
}

// 认证上下文值接口
interface AuthContextValue {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

// 创建上下文，初始值为 null
const AuthContext = createContext<AuthContextValue | null>(null);

// 自定义 hook
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Provider 组件的 props 接口
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 初始化：从 localStorage 读取 token
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      // ✅ 验证token格式（简单的检查）
      try {
        const userData: UserInfo = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
      } catch (error) {
        // token或user数据损坏，清理
        console.error("Invalid user data in localStorage:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }

    setLoading(false);
  }, []);

  // 登录
  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "登录失败");
      }

      const data: AuthResponse = await response.json();

      // 保存到 state
      setToken(data.access_token);
      setUser({
        id: data.user_id,
        username: data.username || data.user_id,
      });

      // 保存到 localStorage
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify({
        id: data.user_id,
        username: data.username || data.user_id,
      }));

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      return { success: false, error: errorMessage };
    }
  };

  // 注册
  const register = async (
    username: string,
    email: string,
    password: string,
    fullName: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          full_name: fullName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "注册失败");
      }

      const data: AuthResponse = await response.json();

      // 注册成功后自动登录
      setToken(data.access_token);
      setUser({
        id: data.user_id,
        username: data.username || data.user_id,
      });

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify({
        id: data.user_id,
        username: data.username || data.user_id,
      }));

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      return { success: false, error: errorMessage };
    }
  };

  // 登出
  const logout = (): void => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // 检查是否已登录
  const isAuthenticated = (): boolean => {
    return !!token;
  };

  const value: AuthContextValue = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
