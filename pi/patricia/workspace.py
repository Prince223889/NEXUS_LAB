"""Espace de travail de Patricia : dossiers et fichiers de l'utilisateur sur le Pi.

La racine est le dossier des projets de l'utilisateur (NEXUS_USER_PROJECTS, par défaut
/srv/nexus/projects/MY_PROJECTS) : un dossier créé ici est un projet qu'on peut compiler, analyser ou envoyer
sur GitHub. Patricia ne sort jamais de cette racine, ne suit aucun lien symbolique et ne touche pas aux fichiers
cachés. Une suppression déplace l'élément dans « .corbeille » (récupérable), elle n'efface rien.
"""
from __future__ import annotations

import os
import re
import shutil
import time
from pathlib import Path

PART = re.compile(r"[A-Za-z0-9À-ÿ_][A-Za-z0-9À-ÿ _.+-]{0,79}")
TEXT_EXT = {".ino", ".c", ".cpp", ".h", ".hpp", ".py", ".md", ".txt", ".json", ".csv", ".yaml", ".yml", ".ini", ".html", ".css", ".js", ".sh", ".bat", ""}
MAX_READ = 200 * 1024
MAX_WRITE = 512 * 1024
TRASH = ".corbeille"


class WorkspaceError(ValueError):
    pass


def default_root() -> Path:
    return Path(os.getenv("NEXUS_USER_PROJECTS", str(Path(os.getenv("NEXUS_DATA", "/srv/nexus")) / "projects" / "MY_PROJECTS")))


class Workspace:
    def __init__(self, root: Path | str | None = None):
        self.root = Path(root) if root else default_root()

    # ------------------------------------------------------------ chemins
    def path(self, rel: str, must_exist: bool = False) -> Path:
        rel = str(rel or "").strip().replace("\\", "/").strip("/")
        parts = [p for p in rel.split("/") if p not in ("", ".")]
        for p in parts:
            if p == ".." or not PART.fullmatch(p) or p.endswith(" ") or p.endswith("."):
                raise WorkspaceError(f"Nom refusé : « {p} » (lettres, chiffres, espace, _ . + - ; pas de nom caché).")
        if len(parts) > 8:
            raise WorkspaceError("Chemin trop profond (8 niveaux au plus).")
        self.root.mkdir(parents=True, exist_ok=True)
        root = self.root.resolve()
        cur = root
        for p in parts:
            cur = cur / p
            if cur.is_symlink():
                raise WorkspaceError("Lien symbolique refusé.")
        if root != cur.resolve() and root not in cur.resolve().parents:
            raise WorkspaceError("Chemin hors de l'espace de travail.")
        if must_exist and not cur.exists():
            raise WorkspaceError(f"« {rel or '/'} » n'existe pas.")
        return cur

    def rel(self, p: Path) -> str:
        return p.resolve().relative_to(self.root.resolve()).as_posix()

    # ------------------------------------------------------------ lecture
    def list(self, rel: str = "") -> dict:
        d = self.path(rel, must_exist=True)
        if not d.is_dir():
            raise WorkspaceError(f"« {rel} » n'est pas un dossier.")
        items = []
        for c in sorted(d.iterdir(), key=lambda x: (not x.is_dir(), x.name.casefold()))[:300]:
            if c.name.startswith(".") or c.is_symlink():
                continue
            st = c.stat()
            items.append({"name": c.name, "path": self.rel(c), "type": "d" if c.is_dir() else "f", "size": 0 if c.is_dir() else st.st_size,
                          "mtime": int(st.st_mtime)})
        return {"path": self.rel(d) if d != self.root.resolve() else "", "items": items}

    def tree(self, rel: str = "", depth: int = 2) -> list[str]:
        out: list[str] = []

        def walk(d: Path, level: int):
            for c in sorted(d.iterdir(), key=lambda x: (not x.is_dir(), x.name.casefold())):
                if c.name.startswith(".") or c.is_symlink() or len(out) >= 120:
                    continue
                out.append("  " * level + ("📁 " if c.is_dir() else "") + c.name)
                if c.is_dir() and level + 1 < depth:
                    walk(c, level + 1)
        d = self.path(rel, must_exist=True)
        if d.is_dir():
            walk(d, 0)
        return out

    def read(self, rel: str) -> dict:
        f = self.path(rel, must_exist=True)
        if not f.is_file():
            raise WorkspaceError(f"« {rel} » n'est pas un fichier.")
        if f.suffix.lower() not in TEXT_EXT:
            raise WorkspaceError("Je ne lis que les fichiers texte (code, notes, JSON…).")
        data = f.read_bytes()[:MAX_READ]
        return {"path": self.rel(f), "text": data.decode("utf-8", "replace"), "truncated": f.stat().st_size > MAX_READ}

    # ------------------------------------------------------------ écriture
    def mkdir(self, rel: str) -> dict:
        if not str(rel or "").strip("/ "):
            raise WorkspaceError("Donne un nom de dossier.")
        d = self.path(rel)
        if d.exists() and not d.is_dir():
            raise WorkspaceError(f"« {rel} » existe déjà et n'est pas un dossier.")
        existed = d.is_dir()
        d.mkdir(parents=True, exist_ok=True)
        return {"path": self.rel(d), "created": not existed}

    def write(self, rel: str, content: str, overwrite: bool = False, append: bool = False) -> dict:
        f = self.path(rel)
        if f.suffix.lower() not in TEXT_EXT:
            raise WorkspaceError("Extension non autorisée pour un fichier texte.")
        data = str(content or "").encode("utf-8")
        if len(data) > MAX_WRITE:
            raise WorkspaceError("Contenu trop long (512 Ko au plus).")
        if f.exists() and f.is_dir():
            raise WorkspaceError(f"« {rel} » est un dossier.")
        existed = f.exists()
        if existed and not (overwrite or append):
            raise WorkspaceError(f"« {rel} » existe déjà : demande de le remplacer ou d'y ajouter du texte.")
        f.parent.mkdir(parents=True, exist_ok=True)
        if existed:
            self._backup(f)
        if append and existed:
            with f.open("ab") as fh:
                fh.write(data)
        else:
            tmp = f.with_name(f".{f.name}.tmp")
            tmp.write_bytes(data)
            os.replace(tmp, f)
        return {"path": self.rel(f), "bytes": f.stat().st_size, "replaced": existed and not append, "appended": existed and append}

    def delete(self, rel: str) -> dict:
        p = self.path(rel, must_exist=True)
        if p == self.root.resolve():
            raise WorkspaceError("Je ne supprime pas l'espace de travail entier.")
        dest = self.root / TRASH / time.strftime("%Y%m%d-%H%M%S") / self.rel(p)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(p), str(dest))
        return {"path": rel, "trash": dest.relative_to(self.root).as_posix()}

    def _backup(self, f: Path) -> None:
        dest = self.root / TRASH / time.strftime("%Y%m%d-%H%M%S") / (self.rel(f) + ".avant")
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, dest)


def clean_name(text: str) -> str:
    """« Serre du balcon » → « serre_du_balcon » (nom de projet valide)."""
    import unicodedata
    s = unicodedata.normalize("NFKD", str(text or "")).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9_-]+", "_", s).strip("_")[:72]
    return s or "dossier"
