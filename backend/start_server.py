#!/usr/bin/env python3
"""
启动脚本：使用 uvicorn 启动时配置 CORS
"""
import uvicorn
import os

os.environ["PYTHONUNBUFFERED"] = "1"

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload_enabled = os.getenv("UVICORN_RELOAD", "true").lower() in {"1", "true", "yes", "on"}
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload_enabled,  # 开发模式，自动重载
        log_level="info"
    )
