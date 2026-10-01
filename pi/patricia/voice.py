"""Voix de Patricia hors ligne sur le Pi (facultatif).

  reconnaissance : Vosk + modèle français « vosk-model-small-fr-0.22 » (~40 Mo), audio WAV 16 kHz mono
  synthèse       : Piper + voix « fr_FR-siwis-medium » (~60 Mo), renvoie un WAV

pi/setup_patricia.sh installe les deux. Sans eux, l'interface utilise la reconnaissance et la synthèse du
navigateur ou du téléphone (l'APK NEXUS passe par la reconnaissance vocale d'Android).
"""
from __future__ import annotations

import io
import json
import os
import shutil
import subprocess
import wave
from pathlib import Path

VOSK_MODEL = Path(os.getenv("NEXUS_VOSK_MODEL", "/opt/nexus/voice/vosk-model-small-fr-0.22"))
PIPER_BIN = os.getenv("NEXUS_PIPER", "/opt/nexus/voice/piper/piper")
PIPER_VOICE = Path(os.getenv("NEXUS_PIPER_VOICE", "/opt/nexus/voice/fr_FR-siwis-medium.onnx"))
MAX_AUDIO = 4 * 1024 * 1024   # ~2 min à 16 kHz

_model = None


def status() -> dict:
    try:
        import vosk  # noqa: F401
        vosk_ok = VOSK_MODEL.is_dir()
    except ImportError:
        vosk_ok = False
    piper_ok = bool(shutil.which(PIPER_BIN) or Path(PIPER_BIN).is_file()) and PIPER_VOICE.is_file()
    return {"stt": vosk_ok, "tts": piper_ok, "stt_model": VOSK_MODEL.name if vosk_ok else None,
            "tts_voice": PIPER_VOICE.stem if piper_ok else None}


def transcribe(wav_bytes: bytes) -> str:
    if len(wav_bytes) > MAX_AUDIO:
        raise ValueError("Enregistrement trop long (2 minutes maximum).")
    try:
        import vosk
    except ImportError:
        raise RuntimeError("Vosk n'est pas installé sur le Pi (sudo bash pi/setup_patricia.sh --voice).")
    global _model
    if _model is None:
        if not VOSK_MODEL.is_dir():
            raise RuntimeError("Modèle Vosk français absent : " + str(VOSK_MODEL))
        vosk.SetLogLevel(-1)
        _model = vosk.Model(str(VOSK_MODEL))
    with wave.open(io.BytesIO(wav_bytes), "rb") as w:
        if w.getnchannels() != 1 or w.getsampwidth() != 2:
            raise ValueError("Audio attendu : WAV PCM 16 bits mono.")
        rec = vosk.KaldiRecognizer(_model, w.getframerate())
        while True:
            chunk = w.readframes(4000)
            if not chunk:
                break
            rec.AcceptWaveform(chunk)
        return json.loads(rec.FinalResult()).get("text", "").strip()


def synthesize(text: str) -> bytes:
    text = " ".join(str(text or "").split())[:1200]
    if not text:
        raise ValueError("Texte vide.")
    if not PIPER_VOICE.is_file():
        raise RuntimeError("Voix Piper absente : " + str(PIPER_VOICE))
    p = subprocess.run([PIPER_BIN, "--model", str(PIPER_VOICE), "--output_file", "-"], input=text.encode("utf-8"),
                       capture_output=True, timeout=60, shell=False)
    if p.returncode != 0 or not p.stdout.startswith(b"RIFF"):
        raise RuntimeError("Piper a échoué : " + p.stderr.decode("utf-8", "replace")[-200:])
    return p.stdout
