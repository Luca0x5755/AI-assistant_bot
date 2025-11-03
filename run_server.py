#!/usr/bin/env python3
"""
AVATAR Server Launcher

Convenience script to start the AVATAR API server.

Usage:
    poetry run python run_server.py
    # or after activating environment:
    python run_server.py
"""

import sys
from pathlib import Path

# Add src directory to Python path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

if __name__ == "__main__":
    from avatar.main import app, config, logger
    import uvicorn

    logger.info("avatar.server.starting",
                host=config.HOST,
                port=config.PORT)

    uvicorn.run(
        app,
        host=config.HOST,
        port=config.PORT,
        log_level=config.LOG_LEVEL.lower(),
    )
