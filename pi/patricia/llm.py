"""Connexion à une IA : locale sur le Pi (Ollama) ou distante, au format « chat/completions » compatible OpenAI.

Ollama expose ce format sur http://127.0.0.1:11434/v1/chat/completions, sans clé. Sur un Raspberry Pi 4
de 4 Go, un modèle de 1,5 à 3 milliards de paramètres quantifié (ex. qwen2.5:1.5b, ~1 Go) répond en
quelques secondes à quelques dizaines de secondes ; un modèle plus gros ne tient pas en mémoire à côté
du compilateur. Un fournisseur en ligne donne des réponses bien meilleures quand Internet est disponible.

L'IA ne pilote jamais le matériel elle-même : ses appels d'outils « propose_action » deviennent des
propositions que l'utilisateur confirme dans l'interface.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from urllib.parse import urlparse


class LLMError(RuntimeError):
    pass


def is_local(endpoint: str) -> bool:
    host = (urlparse(endpoint).hostname or "").lower()
    return host in ("127.0.0.1", "localhost", "::1") or host.endswith(".local") or host.startswith("192.168.") or host.startswith("10.")


class ChatClient:
    def __init__(self, endpoint: str, key: str = "", model: str = "", timeout: float = 90.0):
        self.endpoint = (endpoint or "").strip()
        self.key = key or ""
        self.model = model or "qwen2.5:1.5b"
        self.timeout = timeout

    @property
    def ready(self) -> bool:
        return bool(self.endpoint) and (bool(self.key) or is_local(self.endpoint))

    def chat(self, messages: list[dict], tools: list[dict] | None = None, temperature: float = 0.3) -> dict:
        if not self.ready:
            raise LLMError("IA non configurée")
        body: dict = {"model": self.model, "messages": messages, "temperature": temperature}
        if tools:
            body["tools"] = tools
            body["tool_choice"] = "auto"
        headers = {"Content-Type": "application/json"}
        if self.key:
            headers["Authorization"] = "Bearer " + self.key
        req = urllib.request.Request(self.endpoint, data=json.dumps(body, ensure_ascii=False).encode("utf-8"), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                data = json.loads(r.read(2_000_000).decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = e.read(400).decode("utf-8", "replace") if hasattr(e, "read") else ""
            if tools and e.code in (400, 404, 422) and "tool" in detail.lower():
                return self.chat(messages, None, temperature)   # modèle sans appel d'outils : réessai simple
            raise LLMError(f"IA : HTTP {e.code} {detail[:160]}")
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            raise LLMError(f"IA injoignable : {e}")
        except ValueError:
            raise LLMError("Réponse IA illisible")
        try:
            msg = data["choices"][0]["message"]
        except (KeyError, IndexError, TypeError):
            raise LLMError("Réponse IA sans message")
        return {"content": msg.get("content") or "", "tool_calls": msg.get("tool_calls") or []}


def tool_schema(name: str, description: str, properties: dict, required: list[str] | None = None) -> dict:
    return {"type": "function", "function": {"name": name, "description": description,
                                             "parameters": {"type": "object", "properties": properties, "required": required or []}}}
