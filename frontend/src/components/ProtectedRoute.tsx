// frontend/src/components/ProtectedRoute.tsx
// 路由保护组件 - 已禁用登录验证，所有用户可直接访问

import { ReactElement } from "react";

interface ProtectedRouteProps {
  children: ReactElement;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // 直接返回子组件，不做登录验证
  // 所有数据使用本地存储
  return children;
};

export default ProtectedRoute;
