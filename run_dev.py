#!/usr/bin/env python3
"""
AVATAR Development Server Launcher

Starts server with auto-reload enabled for development.

Usage:
    poetry run python run_dev.py
"""

import sys
from pathlib import Path

# Add src directory to Python path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

if __name__ == "__main__":
    from avatar.core.config import config, logger
    import uvicorn

    logger.info("avatar.dev_server.starting",
                host=config.HOST,
                port=config.PORT,
                reload=True)

    uvicorn.run(
        "avatar.main:app",
        host=config.HOST,
        port=config.PORT,
        reload=True,
        reload_dirs=["src"],
        log_level=config.LOG_LEVEL.lower(),
    )
