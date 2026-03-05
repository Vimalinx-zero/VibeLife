// frontend/src/components/ProtectedRoute.tsx
// 路由保护组件 - 未登录用户自动跳转到登录页

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();

  // 加载中显示 loading screen
  if (loading) {
    return <LoadingScreen />;
  }

  // 未登录跳转到登录页
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // 已登录，渲染子组件
  return children;
};

export default ProtectedRoute;
