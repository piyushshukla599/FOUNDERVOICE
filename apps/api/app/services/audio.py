from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf


def ensure_wav_mono_16k(src: Path, dest: Path) -> Path:
    """Normalize any supported audio to mono 16 kHz WAV."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    suffix = src.suffix.lower()

    # Already WAV — resample with soundfile/librosa-free path when possible
    if suffix == ".wav":
        try:
            data, sr = sf.read(str(src), always_2d=False)
            if getattr(data, "ndim", 1) > 1:
                data = np.mean(data, axis=1)
            if sr != 16000:
                data = _resample(np.asarray(data, dtype=np.float32), sr, 16000)
            sf.write(str(dest), data.astype(np.float32), 16000)
            return dest
        except Exception:
            pass

    # Prefer ffmpeg if installed
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(src), "-ac", "1", "-ar", "16000", str(dest)],
            check=True,
            capture_output=True,
        )
        if dest.exists() and dest.stat().st_size > 0:
            return dest
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass

    # PyAV bundles its own ffmpeg — handles webm/mp3/m4a with no system ffmpeg
    try:
        import av

        container = av.open(str(src))
        resampler = av.audio.resampler.AudioResampler(format="flt", layout="mono", rate=16000)
        chunks: list[np.ndarray] = []
        for frame in container.decode(audio=0):
            for out in resampler.resample(frame):
                arr = out.to_ndarray()
                if arr.ndim > 1:
                    arr = arr.reshape(-1)
                chunks.append(arr.astype(np.float32, copy=False))
        # flush
        for out in resampler.resample(None):
            arr = out.to_ndarray()
            if arr.ndim > 1:
                arr = arr.reshape(-1)
            chunks.append(arr.astype(np.float32, copy=False))
        container.close()
        if not chunks:
            raise RuntimeError("No audio frames decoded")
        y = np.concatenate(chunks)
        # PyAV float frames are often already -1..1
        peak = float(np.max(np.abs(y))) if len(y) else 0.0
        if peak > 1.5:
            y = y / max(peak, 1.0)
        sf.write(str(dest), y, 16000)
        return dest
    except Exception as av_exc:
        # Last resort: librosa (needs audioread backend / ffmpeg)
        try:
            import librosa

            y, _sr = librosa.load(str(src), sr=16000, mono=True)
            sf.write(str(dest), y.astype(np.float32), 16000)
            return dest
        except Exception as lib_exc:
            raise RuntimeError(
                f"Could not decode {src.name}. Install ffmpeg or use WAV/FLAC. "
                f"(PyAV: {av_exc}; librosa: {lib_exc})"
            ) from lib_exc


def _resample(y: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    if orig_sr == target_sr:
        return y
    try:
        import soxr

        return soxr.resample(y, orig_sr, target_sr)
    except Exception:
        duration = len(y) / float(orig_sr)
        n = int(duration * target_sr)
        x_old = np.linspace(0, 1, num=len(y), endpoint=False)
        x_new = np.linspace(0, 1, num=max(n, 1), endpoint=False)
        return np.interp(x_new, x_old, y).astype(np.float32)


def load_audio(path: Path, sr: int = 16000) -> tuple[np.ndarray, int]:
    y, file_sr = sf.read(str(path), always_2d=False)
    if getattr(y, "ndim", 1) > 1:
        y = np.mean(y, axis=1)
    y = np.asarray(y, dtype=np.float32)
    if file_sr != sr:
        y = _resample(y, int(file_sr), sr)
    return y, sr


def write_upload(data: bytes, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return dest


def temp_path(suffix: str) -> Path:
    f = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    f.close()
    return Path(f.name)
