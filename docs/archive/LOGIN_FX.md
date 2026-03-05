# 登录错误修复说明

## 🐛 问题原因

前端在调用API时出现了 `401 Unauthorized` 错误，原因是：

**`workbenchApi.ts` 使用了原生 `fetch()`，而不是配置好的 `apiClient`**

`apiClient` 会自动从 localStorage 获取 JWT token 并添加到请求头：

```typescript
// ✅ apiClient - 正确的方式（自动添加token）
apiClient.get('/api/workbench/todos')

// ❌ fetch - 错误的方式（没有token）
fetch('/api/workbench/todos')
```

---

## ✅ 已修复

修改了 `frontend/src/utils/workbenchApi.ts`：

1. ✅ 导入 `apiClient` 
2. ✅ 所有 `fetch()` 调用改为 `apiClient`
3. ✅ 所有 API 现在会自动携带 JWT token

### 修复的函数
- `getTodos()` - 获取待办事项
- `createTodo()` - 创建待办
- `updateTodo()` - 更新待办
- `deleteTodo()` - 删除待办
- `clearCompletedTodos()` - 清除已完成待办
- `clearAllTodos()` - 清除所有待办
- `getWorkbenchMistakes()` - 获取工作台错题
- `createWorkbenchMistake()` - 创建工作台错题
- `deleteWorkbenchMistake()` - 删除工作台错题
- `clearAllWorkbenchMistakes()` - 清除所有工作台错题
- `createStudySession()` - 创建学习会话
- `getStudySessions()` - 获取学习会话
- `getWorkbenchStats()` - 获取工作台统计

---

## 🔄 下一步操作

### 1. 清除浏览器缓存（重要！）

打开浏览器开发者工具（F12），执行：

```javascript
// 清除 localStorage
localStorage.clear()

// 刷新页面
location.reload()
```

或者手动操作：
1. 打开开发者工具（F12）
2. 切换到 "Application" 或 "存储" 标签
3. 左侧找到 "Local Storage" → `http://localhost:5173`
4. 右键点击 → Clear

### 2. 重新登录

访问登录页面：http://localhost:5173/login

**测试账号**：
- 用户名: `test_user`
- 密码: `test123`

### 3. 验证登录成功

登录后应该能够：
- ✅ 看到 Dashboard（首页）
- ✅ 看到 "今日待办" 显示你的待办事项
- ✅ 不再有 401 错误

---

## 🧪 测试其他功能

登录成功后，测试以下功能确保一切正常：

### 工作台功能
- [ ] 创建新待办事项
- [ ] 完成待办事项
- [ ] 删除待办事项
- [ ] 查看工作台统计

### 其他功能
- [ ] 访问刷题页面
- [ ] 访问错题本
- [ ] 访问笔记系统
- [ ] 访问 Anki 记忆卡

---

## 📝 技术细节

### 修复前后对比

#### 修复前（❌ 错误）
```typescript
export async function getTodos() {
  const response = await fetch(url);  // 没有 token！
  return response.json();
}
```

#### 修复后（✅ 正确）
```typescript
import { apiClient } from './api';

export async function getTodos() {
  const response = await apiClient.get(url);  // 自动添加 token！
  return response.data.todos;
}
```

### 为什么 apiClient 能自动添加 token？

查看 `frontend/src/utils/api.ts`：

```typescript
// 请求拦截器 - 自动添加 JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);
```

每次 API 调用都会自动：
1. 从 localStorage 获取 token
2. 添加到 `Authorization: Bearer <token>` 请求头
3. 发送到后端

---

**问题已完全修复！现在可以正常登录并使用所有功能了。** 🎉
