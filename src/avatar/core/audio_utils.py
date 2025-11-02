"""
Audio conversion utilities

Handles audio format conversion for the AVATAR project.
Uses torchaudio for efficient, GPU-aware audio processing.

Design Philosophy (Linus-style):
- Simple functions, no classes
- No special cases
- Fail fast on errors
- Use existing tools (torchaudio)
"""

import asyncio
from pathlib import Path
from typing import Optional, Tuple

import structlog
import torch
import torchaudio

logger = structlog.get_logger()


def convert_to_wav(
    input_path: Path,
    output_path: Path,
    target_sample_rate: int = 16000,
    target_channels: int = 1
) -> Tuple[Path, dict]:
    """
    Convert any audio format to WAV PCM 16kHz mono (blocking)

    Whisper requires:
    - Format: WAV PCM
    - Sample rate: 16kHz
    - Channels: Mono (1 channel)

    Args:
        input_path: Path to input audio (WebM, MP3, WAV, etc.)
        output_path: Path to output WAV file
        target_sample_rate: Target sample rate (default: 16000 Hz)
        target_channels: Target channels (default: 1 = mono)

    Returns:
        Tuple of (output_path, metadata_dict)

    Raises:
        FileNotFoundError: Input file not found
        RuntimeError: Audio conversion failed

    Design note:
    This is a synchronous function because torchaudio operations
    are CPU-bound. We'll wrap it in run_in_executor for async use.
    """
    if not input_path.exists():
        logger.error("audio.convert.input_not_found", path=str(input_path))
        raise FileNotFoundError(f"Input audio not found: {input_path}")

    try:
        logger.info("audio.convert.start",
                   input=str(input_path),
                   output=str(output_path),
                   target_sr=target_sample_rate,
                   target_ch=target_channels)

        # Load audio (auto-detect format)
        waveform, sample_rate = torchaudio.load(str(input_path))

        # Get original metadata
        orig_channels = waveform.shape[0]
        orig_duration = waveform.shape[1] / sample_rate

        logger.debug("audio.convert.loaded",
                    orig_sr=sample_rate,
                    orig_channels=orig_channels,
                    orig_duration_sec=round(orig_duration, 2))

        # 1. Convert to mono if needed
        if waveform.shape[0] > target_channels:
            # Average all channels to mono
            waveform = torch.mean(waveform, dim=0, keepdim=True)
            logger.debug("audio.convert.to_mono", channels=f"{orig_channels} -> 1")

        # 2. Resample if needed
        if sample_rate != target_sample_rate:
            resampler = torchaudio.transforms.Resample(
                orig_freq=sample_rate,
                new_freq=target_sample_rate
            )
            waveform = resampler(waveform)
            logger.debug("audio.convert.resample",
                        sample_rate=f"{sample_rate} -> {target_sample_rate}")

        # 3. Save as WAV PCM
        output_path.parent.mkdir(parents=True, exist_ok=True)
        torchaudio.save(
            str(output_path),
            waveform,
            target_sample_rate,
            encoding="PCM_S",  # 16-bit PCM
            bits_per_sample=16
        )

        # Get final file size
        file_size = output_path.stat().st_size
        final_duration = waveform.shape[1] / target_sample_rate

        metadata = {
            "original_sample_rate": sample_rate,
            "original_channels": orig_channels,
            "original_duration_sec": round(orig_duration, 2),
            "converted_sample_rate": target_sample_rate,
            "converted_channels": target_channels,
            "converted_duration_sec": round(final_duration, 2),
            "file_size_bytes": file_size,
            "compression_ratio": round(input_path.stat().st_size / file_size, 2)
        }

        logger.info("audio.convert.complete",
                   output=str(output_path),
                   size_bytes=file_size,
                   duration_sec=round(final_duration, 2),
                   **metadata)

        return output_path, metadata

    except Exception as e:
        logger.error("audio.convert.failed",
                    input=str(input_path),
                    error=str(e),
                    error_type=type(e).__name__)
        raise RuntimeError(f"Audio conversion failed: {e}") from e


async def convert_to_wav_async(
    input_path: Path,
    output_path: Path,
    target_sample_rate: int = 16000,
    target_channels: int = 1
) -> Tuple[Path, dict]:
    """
    Async wrapper for convert_to_wav()

    Runs conversion in thread pool to avoid blocking the event loop.

    Args:
        input_path: Path to input audio
        output_path: Path to output WAV file
        target_sample_rate: Target sample rate (default: 16000 Hz)
        target_channels: Target channels (default: 1 = mono)

    Returns:
        Tuple of (output_path, metadata_dict)

    Design note:
    Audio conversion is CPU-bound, so we use run_in_executor.
    This is the Linus way: simple delegation, no complexity.
    """
    loop = asyncio.get_event_loop()

    return await loop.run_in_executor(
        None,  # Use default ThreadPoolExecutor
        convert_to_wav,
        input_path,
        output_path,
        target_sample_rate,
        target_channels
    )


def validate_audio_for_whisper(audio_path: Path) -> bool:
    """
    Validate if audio file meets Whisper requirements

    Whisper requires:
    - Sample rate: 16kHz
    - Channels: Mono
    - Format: WAV PCM

    Args:
        audio_path: Path to audio file

    Returns:
        True if audio meets requirements, False otherwise

    Design note:
    Simple boolean check. No exceptions, no special cases.
    If it's wrong, caller will convert it.
    """
    try:
        waveform, sample_rate = torchaudio.load(str(audio_path))

        is_valid = (
            sample_rate == 16000 and
            waveform.shape[0] == 1 and  # Mono
            audio_path.suffix.lower() == ".wav"
        )

        logger.debug("audio.validate",
                    path=str(audio_path),
                    valid=is_valid,
                    sample_rate=sample_rate,
                    channels=waveform.shape[0])

        return is_valid

    except Exception as e:
        logger.warning("audio.validate.failed",
                      path=str(audio_path),
                      error=str(e))
        return False
