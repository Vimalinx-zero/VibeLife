// 全局类型声明文件

// 扩展 Window 对象
declare global {
  interface Window {
    __VIBELIFE_API_ORIGIN__: string;
  }

  interface ImportMetaEnv {
    readonly VITE_API_ORIGIN?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// 导出空对象以确保这是一个模块
export {};
