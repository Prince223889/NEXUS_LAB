"""Voix de Patricia hors ligne sur le Pi (facultatif).

  reconnaissance : Vosk + modèle français « vosk-model-small-fr-0.22 » (~40 Mo), audio WAV 16 kHz mono
  synthèse       : Piper + voix « fr_FR-siwis-medium » (~60 Mo, voix féminine naturelle), renvoie un WAV ;
                   débit posé (length_scale 1.08) et courte pause entre les phrases

pi/setup_patricia.sh installe les deux. Sans eux, l'interface utilise la reconnaissance et la synthèse du
navigateur ou du téléphone (l'APK NEXUS passe par la reconnaissance vocale d'Android).
"""
from __future__ import annotations

import io
import json
import os
import re
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


BASE_RATE = 0.95   # débit « normal » de l'interface (prefs.rate) : correspond à la lenteur de base de Piper


def _base() -> float:
    """Lenteur de base de Piper (length_scale) : > 1 = plus lent. 1.08 par défaut : un débit posé et doux,
    sans traîner. NEXUS_PIPER_SPEED la remplace (ex. 1.15 pour encore plus lent)."""
    try:
        return min(2.0, max(0.6, float(os.getenv("NEXUS_PIPER_SPEED", "1.08"))))
    except ValueError:
        return 1.08


def _speed() -> str:
    return f"{_base():.2f}"


def _silence() -> str:
    """Pause entre deux phrases (secondes) : une voix qui respire sonne beaucoup moins robotique."""
    try:
        return f"{min(1.5, max(0.0, float(os.getenv('NEXUS_PIPER_PAUSE', '0.25')))):.2f}"
    except ValueError:
        return "0.25"


_UNITS = [
    (r"```.*?```", " (le code est affiché à l'écran). "),
    (r"\[([^\]]+)\]\([^)]*\)", r"\1"),
    (r"https?://\S+", " le lien affiché "),
    (r"#library\?p=\w+", " "),
    (r"→|->|⇒|=>", " vers "), (r"←|<-", " depuis "), (r"≈|~", " environ "), (r"±", " plus ou moins "),
    (r"≥|>=", " au moins "), (r"≤|<=", " au plus "), (r"&", " et "),
    (r"°\s?C\b", " degrés"), (r"°", " degrés"), (r"\s?%", " pour cent"),
    (r"\bW(\d+)\b", r"worker \1"),
    (r"\b(\d)V(\d)\b", r"\1,\2 volts"),
    (r"(\d)\s?mA\b", r"\1 milliampères"), (r"(\d)\s?mV\b", r"\1 millivolts"),
    (r"(\d)\s?V\b", r"\1 volts"), (r"(\d)\s?A\b", r"\1 ampères"),
    (r"(\d)\s?kΩ", r"\1 kilo-ohms"), (r"(\d)\s?Ω", r"\1 ohms"),
    (r"(\d)\s?ms\b", r"\1 millisecondes"), (r"(\d)\s?MHz\b", r"\1 mégahertz"), (r"(\d)\s?kHz\b", r"\1 kilohertz"),
    (r"(\d)\s?Ko\b", r"\1 kilo-octets"), (r"(\d)\s?Mo\b", r"\1 mégaoctets"), (r"(\d)\s?Go\b", r"\1 gigaoctets"),
    (r"(^|[^\d.])(\d+)\.(\d+)(?![.\d])", r"\1\2,\3"),          # 3.3 → 3,3 (les adresses IP restent intactes)
    (r"[*_#>|`•]+", " "),
    ("[\U0001F000-\U0001FAFF←-⇿☀-➿⬀-⯿️‍]", " "),
]


def spoken(text: str) -> str:
    """Texte prêt à dire : sans markdown, émojis ni code ; unités et symboles en mots ; une ligne = une phrase."""
    t = str(text or "")
    for pat, rep in _UNITS:
        t = re.sub(pat, rep, t, flags=re.S)
    lines = [ln.strip(" -\t") for ln in t.splitlines()]
    t = " ".join(ln if ln[-1] in ".!?…:;," else ln + "." for ln in lines if ln)
    t = re.sub(r"([.!?…])(\s*\.)+", r"\1", t)
    return " ".join(t.split())


def synthesize(text: str, speed: float | None = None, rate: float | None = None) -> bytes:
    """WAV de Patricia. `speed` = length_scale absolu (ancien client) ; `rate` = débit de l'interface
    (0.95 = normal) appliqué autour de la lenteur de base, pour que NEXUS_PIPER_SPEED reste respecté."""
    text = spoken(text)[:1200]
    if not text:
        raise ValueError("Texte vide.")
    if not PIPER_VOICE.is_file():
        raise RuntimeError("Voix Piper absente : " + str(PIPER_VOICE))
    if rate:
        scale = f"{min(2.0, max(0.6, _base() * BASE_RATE / max(0.3, rate))):.2f}"
    elif speed:
        scale = f"{min(2.0, max(0.6, speed)):.2f}"
    else:
        scale = _speed()
    # Piper découpe lui-même le texte en phrases et insère la pause --sentence_silence entre elles.
    p = subprocess.run([PIPER_BIN, "--model", str(PIPER_VOICE), "--length_scale", scale, "--sentence_silence", _silence(),
                        "--output_file", "-"], input=text.encode("utf-8"), capture_output=True, timeout=60, shell=False)
    if p.returncode != 0 or not p.stdout.startswith(b"RIFF"):
        raise RuntimeError("Piper a échoué : " + p.stderr.decode("utf-8", "replace")[-200:])
    return p.stdout
