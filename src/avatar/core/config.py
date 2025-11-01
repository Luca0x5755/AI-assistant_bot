"""
Configuration management for AVATAR application

Loads settings from environment variables with sensible defaults.
"""

import os
from pathlib import Path
from typing import Optional


class Config:
    """Application configuration"""

    # Project paths
    BASE_DIR = Path(__file__).parent.parent.parent.parent
    AUDIO_DIR = BASE_DIR / "audio"
    AUDIO_RAW = AUDIO_DIR / "raw"
    AUDIO_PROFILES = AUDIO_DIR / "profiles"
    AUDIO_TTS_FAST = AUDIO_DIR / "tts_fast"
    AUDIO_TTS_HQ = AUDIO_DIR / "tts_hq"

    # Database
    DATABASE_PATH = BASE_DIR / "app.db"

    # Server settings
    HOST: str = os.getenv("AVATAR_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("AVATAR_PORT", "8000"))

    # CORS settings
    CORS_ORIGINS: list[str] = os.getenv(
        "AVATAR_CORS_ORIGINS",
        "http://localhost:3000,http://localhost:8000"
    ).split(",")

    # Resource limits (VRAM management)
    MAX_CONCURRENT_SESSIONS: int = int(os.getenv("AVATAR_MAX_SESSIONS", "5"))
    VRAM_LIMIT_GB: int = int(os.getenv("AVATAR_VRAM_LIMIT", "24"))

    # AI Model settings
    WHISPER_MODEL: str = os.getenv("AVATAR_WHISPER_MODEL", "large-v3-turbo")
    WHISPER_DEVICE: str = os.getenv("AVATAR_WHISPER_DEVICE", "cuda")
    WHISPER_COMPUTE_TYPE: str = os.getenv("AVATAR_WHISPER_COMPUTE", "float16")

    VLLM_MODEL: str = os.getenv(
        "AVATAR_VLLM_MODEL",
        "Qwen/Qwen2.5-7B-Instruct-AWQ"
    )
    VLLM_GPU_MEMORY: float = float(os.getenv("AVATAR_VLLM_MEMORY", "0.5"))
    VLLM_MAX_TOKENS: int = int(os.getenv("AVATAR_VLLM_MAX_TOKENS", "2048"))

    # TTS settings
    F5_TTS_SPEED: float = float(os.getenv("AVATAR_F5_SPEED", "1.0"))
    COSYVOICE_SAMPLE_RATE: int = int(os.getenv("AVATAR_COSY_SAMPLE_RATE", "22050"))

    # Performance thresholds (KPIs)
    TARGET_E2E_LATENCY_SEC: float = 3.5  # P95 target
    TARGET_LLM_TTFT_MS: int = 800        # Time to first token
    TARGET_FAST_TTS_SEC: float = 1.5     # Fast TTS P50

    # Logging
    LOG_LEVEL: str = os.getenv("AVATAR_LOG_LEVEL", "INFO")

    @classmethod
    def validate(cls) -> bool:
        """Validate configuration and create necessary directories"""
        try:
            # Create audio directories if not exist
            cls.AUDIO_RAW.mkdir(parents=True, exist_ok=True)
            cls.AUDIO_PROFILES.mkdir(parents=True, exist_ok=True)
            cls.AUDIO_TTS_FAST.mkdir(parents=True, exist_ok=True)
            cls.AUDIO_TTS_HQ.mkdir(parents=True, exist_ok=True)

            # Check database exists
            if not cls.DATABASE_PATH.exists():
                raise FileNotFoundError(
                    f"Database not found: {cls.DATABASE_PATH}\n"
                    f"Run: poetry run python scripts/init_database.py"
                )

            return True
        except Exception as e:
            print(f"[FAIL] Configuration validation failed: {e}")
            return False


# Global config instance
config = Config()
