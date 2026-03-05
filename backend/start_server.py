#!/usr/bin/env python3
"""
启动脚本：使用 uvicorn 启动时配置 CORS
"""
import uvicorn
import os

os.environ["PYTHONUNBUFFERED"] = "1"

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 开发模式，自动重载
        log_level="info"
    )
