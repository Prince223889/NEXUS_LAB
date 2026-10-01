"""Envoi d'un projet du labo sur GitHub par Patricia (après confirmation de l'utilisateur).

Le jeton GitHub (« fine-grained » de préférence : droits Administration + Contents en écriture, ou classique « repo »)
est saisi dans Patricia → Réglages → GitHub. Il est gardé sur le Pi dans un fichier lisible par le seul compte nexus
(0600) et n'est jamais renvoyé à l'interface. NEXUS_GITHUB_TOKEN (variable d'environnement) le remplace si présent.

Envoi : dépôt créé s'il n'existe pas (privé par défaut), puis un seul commit avec tous les fichiers du projet
(API Git Data : blobs → arbre → commit → branche). Les dossiers de binaires compilés ne sont pas envoyés.
"""
from __future__ import annotations

import base64
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

API = os.getenv("NEXUS_GITHUB_API", "https://api.github.com").rstrip("/")
CONFIG = Path(os.getenv("NEXUS_GITHUB_CONFIG", str(Path(os.getenv("NEXUS_DATA", "/srv/nexus")) / "patricia" / "github.json")))
REPO_RE = re.compile(r"[A-Za-z0-9._-]{1,100}")
OWNER_RE = re.compile(r"[A-Za-z0-9-]{1,39}")
SKIP_DIRS = {"bin", "build", ".git", "__pycache__", "node_modules"}
MAX_FILES, MAX_FILE, MAX_TOTAL = 300, 5 * 1024 * 1024, 40 * 1024 * 1024


class GitHubError(RuntimeError):
    pass


# --------------------------------------------------------------------------- configuration
def load_config(file_only: bool = False) -> dict:
    cfg = {}
    try:
        cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        cfg = {}
    if os.getenv("NEXUS_GITHUB_TOKEN") and not file_only:
        cfg["token"] = os.environ["NEXUS_GITHUB_TOKEN"]
    return cfg


def status() -> dict:
    """Ce que l'interface peut voir : jamais le jeton."""
    cfg = load_config()
    return {"configured": bool(cfg.get("token")), "login": cfg.get("login", ""), "owner": cfg.get("owner", ""),
            "private": cfg.get("private", True)}


def configure(token: str | None = None, owner: str | None = None, private: bool | None = None, delete: bool = False) -> dict:
    if delete:
        try:
            CONFIG.unlink()
        except FileNotFoundError:
            pass
        return status()
    cfg = load_config(file_only=True) if not token else {}
    if token:
        token = token.strip()
        if not re.fullmatch(r"[A-Za-z0-9_]{20,255}", token):
            raise GitHubError("Jeton GitHub invalide (format).")
        cfg["token"] = token
        cfg["login"] = Client(token).user()["login"]
    if not cfg.get("token"):
        raise GitHubError("Aucun jeton GitHub enregistré.")
    if owner is not None:
        owner = owner.strip()
        if owner and not OWNER_RE.fullmatch(owner):
            raise GitHubError("Propriétaire GitHub invalide.")
        cfg["owner"] = owner
    if private is not None:
        cfg["private"] = bool(private)
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    tmp = CONFIG.with_suffix(".tmp")
    fd = os.open(str(tmp), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump({k: cfg[k] for k in ("token", "login", "owner", "private") if k in cfg}, f)
    os.replace(tmp, CONFIG)
    return status()


def repo_name(text: str) -> str:
    """Nom de dépôt GitHub valide à partir d'un titre (« Serre auto » → « serre-auto »)."""
    import unicodedata
    s = unicodedata.normalize("NFKD", str(text or "")).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9._-]+", "-", s).strip("-.")[:100]
    return s or "projet-nexus"


# --------------------------------------------------------------------------- client
class Client:
    def __init__(self, token: str, api: str = ""):
        self.token, self.api = token, (api or API)

    def call(self, method: str, path: str, body: dict | None = None, ok404: bool = False):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.api + path, data=data, method=method, headers={
            "Authorization": "Bearer " + self.token, "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "NEXUS-LAB-Patricia",
            **({"Content-Type": "application/json"} if data else {})})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read(8 * 1024 * 1024)
                return json.loads(raw.decode() or "null")
        except urllib.error.HTTPError as e:
            if ok404 and e.code == 404:
                return None
            try:
                msg = json.loads(e.read(65536).decode()).get("message", "")
            except (ValueError, OSError, AttributeError):
                msg = ""
            hint = {401: "jeton refusé ou expiré", 403: "droits insuffisants pour ce jeton", 404: "introuvable ou jeton sans accès",
                    409: "dépôt vide ou conflit", 422: "requête refusée"}.get(e.code, "erreur")
            raise GitHubError(f"GitHub {e.code} : {hint}{' (' + msg + ')' if msg else ''}") from None
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            raise GitHubError(f"GitHub injoignable : le Pi a-t-il Internet ? ({e})") from None

    def user(self) -> dict:
        return self.call("GET", "/user")

    def ensure_repo(self, owner: str, name: str, private: bool, description: str) -> tuple[dict, bool]:
        repo = self.call("GET", f"/repos/{owner}/{name}", ok404=True)
        if repo:
            return repo, False
        body = {"name": name, "private": private, "description": description[:300], "auto_init": True}
        me = self.user()["login"]
        repo = self.call("POST", "/user/repos" if owner.lower() == me.lower() else f"/orgs/{owner}/repos", body)
        return repo, True

    def head(self, owner: str, name: str, branch: str) -> str | None:
        for i in range(5):   # un dépôt tout juste créé peut mettre une seconde à exposer sa branche
            try:
                ref = self.call("GET", f"/repos/{owner}/{name}/git/ref/heads/{branch}", ok404=True)
            except GitHubError as e:
                if "409" in str(e):
                    return None   # dépôt vide
                raise
            if ref:
                return ref["object"]["sha"]
            time.sleep(1 + i)
        return None

    def push(self, owner: str, name: str, files: dict[str, bytes], message: str, private: bool = True, description: str = "") -> dict:
        repo, created = self.ensure_repo(owner, name, private, description)
        branch = repo.get("default_branch") or "main"
        parent = self.head(owner, name, branch)
        if parent is None:   # dépôt vide existant : premier fichier par l'API Contents pour créer la branche
            first = sorted(files)[0]
            self.call("PUT", f"/repos/{owner}/{name}/contents/{first}", {"message": message, "content": base64.b64encode(files[first]).decode(), "branch": branch})
            parent = self.head(owner, name, branch)
            if parent is None:
                raise GitHubError("Impossible de créer la branche du dépôt.")
        base_tree = self.call("GET", f"/repos/{owner}/{name}/git/commits/{parent}")["tree"]["sha"]
        tree = []
        for path, data in sorted(files.items()):
            blob = self.call("POST", f"/repos/{owner}/{name}/git/blobs", {"content": base64.b64encode(data).decode(), "encoding": "base64"})
            tree.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        t = self.call("POST", f"/repos/{owner}/{name}/git/trees", {"base_tree": base_tree, "tree": tree})
        c = self.call("POST", f"/repos/{owner}/{name}/git/commits", {"message": message, "tree": t["sha"], "parents": [parent]})
        self.call("PATCH", f"/repos/{owner}/{name}/git/refs/heads/{branch}", {"sha": c["sha"], "force": False})
        return {"repo": f"{owner}/{name}", "url": repo.get("html_url") or f"https://github.com/{owner}/{name}", "created": created,
                "private": bool(repo.get("private", private)), "branch": branch, "commit": c["sha"], "files": len(files)}


# --------------------------------------------------------------------------- projet → GitHub
def collect(project_dir: Path) -> dict[str, bytes]:
    root = project_dir.resolve()
    files, total = {}, 0
    for p in sorted(root.rglob("*")):
        rel = p.relative_to(root)
        if any(part in SKIP_DIRS or part.startswith(".") for part in rel.parts) or p.is_symlink() or not p.is_file():
            continue
        size = p.stat().st_size
        if size > MAX_FILE:
            continue
        total += size
        if len(files) >= MAX_FILES or total > MAX_TOTAL:
            raise GitHubError("Projet trop volumineux pour un envoi direct (300 fichiers, 40 Mo).")
        files[rel.as_posix()] = p.read_bytes()
    if not files:
        raise GitHubError("Le dossier du projet est vide.")
    return files


def push_project(project_dir: Path, project_id: str, repo: str | None = None, private: bool | None = None, message: str = "") -> dict:
    cfg = load_config()
    if not cfg.get("token"):
        raise GitHubError("GitHub n'est pas configuré : ajoute un jeton dans Patricia → Réglages → GitHub.")
    client = Client(cfg["token"])
    owner = cfg.get("owner") or cfg.get("login") or client.user()["login"]
    name = repo_name(repo or project_id)
    if not REPO_RE.fullmatch(name):
        raise GitHubError("Nom de dépôt invalide.")
    priv = cfg.get("private", True) if private is None else private
    files = collect(project_dir)
    if "README.md" not in files:
        files["README.md"] = f"# {project_id}\n\nProjet ESP32 créé avec NEXUS LAB et envoyé par Patricia.\n".encode()
    return client.push(owner, name, files, message or f"NEXUS LAB : projet {project_id} envoyé par Patricia", priv,
                       f"Projet ESP32 « {project_id} » (NEXUS LAB)")
