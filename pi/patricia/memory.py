"""Mémoire durable de Patricia (SQLite, sur la microSD 64 Go du Pi).

Tout ce que Patricia retient est ici, consultable et effaçable par l'utilisateur :
  conversations  chaque échange (avec la session et l'intention reconnue)
  notes          notes, idées, mesures, décisions ; étiquettes libres
  projects       journal des projets : état, étapes, prochaine action, idées d'amélioration
  facts          préférences et faits stables (« ma carte préférée est l'ESP32-S3 »)
  followups      questions que Patricia doit reposer plus tard (« on améliore la station météo ? »)
  actions        propositions d'actions matérielles et leur sort (confirmée, refusée, échouée)

La recherche plein texte utilise FTS5 quand SQLite le fournit, sinon LIKE.
"""
from __future__ import annotations

import json
import re
import sqlite3
import threading
import time
import unicodedata
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

SCHEMA = """
CREATE TABLE IF NOT EXISTS p_conversations(
  id INTEGER PRIMARY KEY, at TEXT NOT NULL, session TEXT, role TEXT NOT NULL, text TEXT NOT NULL,
  intent TEXT, project TEXT);
CREATE INDEX IF NOT EXISTS p_conv_session ON p_conversations(session, id);
CREATE TABLE IF NOT EXISTS p_notes(
  id INTEGER PRIMARY KEY, at TEXT NOT NULL, updated TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '', project TEXT, pinned INTEGER NOT NULL DEFAULT 0, kind TEXT NOT NULL DEFAULT 'note');
CREATE TABLE IF NOT EXISTS p_projects(
  id TEXT PRIMARY KEY, title TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idee', board TEXT, modules TEXT NOT NULL DEFAULT '[]', goal TEXT NOT NULL DEFAULT '',
  next_step TEXT NOT NULL DEFAULT '', improvements TEXT NOT NULL DEFAULT '[]', log TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS p_facts(
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updated TEXT NOT NULL, source TEXT);
CREATE TABLE IF NOT EXISTS p_followups(
  id INTEGER PRIMARY KEY, created TEXT NOT NULL, due REAL NOT NULL, question TEXT NOT NULL, project TEXT,
  choices TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'open');
CREATE TABLE IF NOT EXISTS p_actions(
  id TEXT PRIMARY KEY, created TEXT NOT NULL, expires REAL NOT NULL, kind TEXT NOT NULL, params TEXT NOT NULL,
  summary TEXT NOT NULL, risk TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'proposed', result TEXT);
"""

FTS = """
CREATE VIRTUAL TABLE IF NOT EXISTS p_search USING fts5(kind, ref UNINDEXED, title, body, tokenize='unicode61 remove_diacritics 2');
"""

PROJECT_STATUSES = ("idee", "conception", "cablage", "code", "test", "termine", "pause")
STATUS_LABEL = {"idee": "idée", "conception": "conception", "cablage": "câblage", "code": "code",
                "test": "essais", "termine": "terminé", "pause": "en pause"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def fold(s: str) -> str:
    """Minuscules sans accents, pour comparer des textes français."""
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return s.casefold()


def slug(s: str, size: int = 48) -> str:
    out = re.sub(r"[^a-z0-9]+", "_", fold(s)).strip("_")[:size].strip("_")
    return out or "projet_" + uuid.uuid4().hex[:6]


class Memory:
    def __init__(self, path: Path | str):
        self.path = Path(path)
        self._lock = threading.Lock()
        self.fts = False
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.db() as c:
            c.executescript(SCHEMA)
            try:
                c.executescript(FTS)
                self.fts = True
            except sqlite3.OperationalError:
                self.fts = False

    @contextmanager
    def db(self):
        c = sqlite3.connect(self.path, timeout=15)
        c.row_factory = sqlite3.Row
        try:
            c.execute("PRAGMA journal_mode=WAL")
            yield c
            c.commit()
        except Exception:
            c.rollback()
            raise
        finally:
            c.close()

    # ------------------------------------------------------------------ index
    def _index(self, c, kind: str, ref: str, title: str, body: str) -> None:
        if not self.fts:
            return
        c.execute("DELETE FROM p_search WHERE kind=? AND ref=?", (kind, ref))
        c.execute("INSERT INTO p_search(kind,ref,title,body) VALUES(?,?,?,?)", (kind, ref, title, body))

    def _unindex(self, c, kind: str, ref: str) -> None:
        if self.fts:
            c.execute("DELETE FROM p_search WHERE kind=? AND ref=?", (kind, ref))

    # ---------------------------------------------------------- conversations
    def log(self, role: str, text: str, session: str | None = None, intent: str | None = None, project: str | None = None) -> int:
        text = str(text or "").strip()[:8000]
        if not text:
            return 0
        with self.db() as c:
            cur = c.execute("INSERT INTO p_conversations(at,session,role,text,intent,project) VALUES(?,?,?,?,?,?)",
                            (now_iso(), session, role, text, intent, project))
            rid = cur.lastrowid
            if role == "user":
                self._index(c, "conversation", str(rid), text[:80], text)
            return rid

    def history(self, session: str | None = None, limit: int = 12) -> list[dict]:
        sql = "SELECT * FROM p_conversations"
        args: list[Any] = []
        if session:
            sql += " WHERE session=?"
            args.append(session)
        sql += " ORDER BY id DESC LIMIT ?"
        args.append(max(1, min(200, limit)))
        with self.db() as c:
            rows = [dict(r) for r in c.execute(sql, args)]
        return list(reversed(rows))

    def last_session_activity(self) -> dict | None:
        with self.db() as c:
            r = c.execute("SELECT * FROM p_conversations WHERE role='user' ORDER BY id DESC LIMIT 1").fetchone()
        return dict(r) if r else None

    # ------------------------------------------------------------------ notes
    def add_note(self, body: str, title: str = "", tags: Iterable[str] = (), project: str | None = None,
                 kind: str = "note", pinned: bool = False) -> dict:
        body = str(body or "").strip()[:20000]
        if not body:
            raise ValueError("Note vide.")
        title = (str(title or "").strip() or body.split("\n", 1)[0])[:120]
        tag_s = ",".join(sorted({fold(t).strip() for t in tags if str(t).strip()}))[:400]
        kind = kind if kind in ("note", "idee", "mesure", "decision", "rappel", "erreur") else "note"
        t = now_iso()
        with self.db() as c:
            cur = c.execute("INSERT INTO p_notes(at,updated,title,body,tags,project,pinned,kind) VALUES(?,?,?,?,?,?,?,?)",
                            (t, t, title, body, tag_s, project, int(bool(pinned)), kind))
            nid = cur.lastrowid
            self._index(c, "note", str(nid), title, body + " " + tag_s.replace(",", " "))
        return self.get_note(nid)

    def get_note(self, nid: int) -> dict | None:
        with self.db() as c:
            r = c.execute("SELECT * FROM p_notes WHERE id=?", (int(nid),)).fetchone()
        return self._note(r) if r else None

    @staticmethod
    def _note(r) -> dict:
        d = dict(r)
        d["tags"] = [t for t in d["tags"].split(",") if t]
        d["pinned"] = bool(d["pinned"])
        return d

    def update_note(self, nid: int, **kw) -> dict:
        cur = self.get_note(nid)
        if not cur:
            raise KeyError("Note introuvable.")
        title = str(kw.get("title", cur["title"]))[:120]
        body = str(kw.get("body", cur["body"]))[:20000]
        tags = kw.get("tags", cur["tags"])
        tag_s = ",".join(sorted({fold(t).strip() for t in tags if str(t).strip()}))[:400]
        pinned = int(bool(kw.get("pinned", cur["pinned"])))
        with self.db() as c:
            c.execute("UPDATE p_notes SET title=?,body=?,tags=?,pinned=?,updated=? WHERE id=?",
                      (title, body, tag_s, pinned, now_iso(), int(nid)))
            self._index(c, "note", str(nid), title, body + " " + tag_s.replace(",", " "))
        return self.get_note(nid)

    def delete_note(self, nid: int) -> bool:
        with self.db() as c:
            n = c.execute("DELETE FROM p_notes WHERE id=?", (int(nid),)).rowcount
            self._unindex(c, "note", str(nid))
        return bool(n)

    def notes(self, project: str | None = None, limit: int = 100, kind: str | None = None) -> list[dict]:
        sql, args = "SELECT * FROM p_notes WHERE 1=1", []
        if project:
            sql += " AND project=?"
            args.append(project)
        if kind:
            sql += " AND kind=?"
            args.append(kind)
        sql += " ORDER BY pinned DESC, id DESC LIMIT ?"
        args.append(max(1, min(1000, limit)))
        with self.db() as c:
            return [self._note(r) for r in c.execute(sql, args)]

    # --------------------------------------------------------------- projects
    def upsert_project(self, title: str, pid: str | None = None, **kw) -> dict:
        title = str(title or "").strip()[:120] or "Projet sans nom"
        pid = pid or slug(title)
        if not re.fullmatch(r"[a-z0-9_]{1,60}", pid):
            raise ValueError("Identifiant de projet invalide.")
        t = now_iso()
        cur = self.project(pid)
        fields = {
            "status": kw.get("status", cur["status"] if cur else "idee"),
            "board": kw.get("board", cur["board"] if cur else None),
            "modules": json.dumps(list(kw.get("modules", cur["modules"] if cur else []))[:40], ensure_ascii=False),
            "goal": str(kw.get("goal", cur["goal"] if cur else ""))[:2000],
            "next_step": str(kw.get("next_step", cur["next_step"] if cur else ""))[:500],
            "improvements": json.dumps(list(kw.get("improvements", cur["improvements"] if cur else []))[:30], ensure_ascii=False),
        }
        if fields["status"] not in PROJECT_STATUSES:
            raise ValueError("Statut inconnu : " + str(fields["status"]))
        with self.db() as c:
            if cur:
                c.execute("UPDATE p_projects SET title=?,updated=?,status=?,board=?,modules=?,goal=?,next_step=?,improvements=? WHERE id=?",
                          (title, t, fields["status"], fields["board"], fields["modules"], fields["goal"], fields["next_step"], fields["improvements"], pid))
            else:
                c.execute("INSERT INTO p_projects(id,title,created,updated,status,board,modules,goal,next_step,improvements,log) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                          (pid, title, t, t, fields["status"], fields["board"], fields["modules"], fields["goal"], fields["next_step"], fields["improvements"], "[]"))
            self._index(c, "project", pid, title, fields["goal"] + " " + " ".join(json.loads(fields["modules"])))
        if not cur:
            self.project_log(pid, "Projet créé")
        return self.project(pid)

    def project_log(self, pid: str, text: str) -> None:
        with self.db() as c:
            r = c.execute("SELECT log FROM p_projects WHERE id=?", (pid,)).fetchone()
            if not r:
                return
            log = json.loads(r["log"] or "[]")
            log.append({"at": now_iso(), "text": str(text)[:400]})
            c.execute("UPDATE p_projects SET log=?,updated=? WHERE id=?", (json.dumps(log[-200:], ensure_ascii=False), now_iso(), pid))

    @staticmethod
    def _project(r) -> dict:
        d = dict(r)
        for k in ("modules", "improvements", "log"):
            try:
                d[k] = json.loads(d[k] or "[]")
            except ValueError:
                d[k] = []
        d["status_label"] = STATUS_LABEL.get(d["status"], d["status"])
        return d

    def project(self, pid: str) -> dict | None:
        with self.db() as c:
            r = c.execute("SELECT * FROM p_projects WHERE id=?", (pid,)).fetchone()
        return self._project(r) if r else None

    def projects(self, active_only: bool = False) -> list[dict]:
        sql = "SELECT * FROM p_projects"
        if active_only:
            sql += " WHERE status NOT IN ('termine','pause')"
        sql += " ORDER BY updated DESC LIMIT 200"
        with self.db() as c:
            return [self._project(r) for r in c.execute(sql)]

    def find_project(self, text: str) -> dict | None:
        """Retrouve un projet cité dans une phrase (« la station météo », « projet voiture »)."""
        ft = fold(text)
        best, score = None, 0
        for p in self.projects():
            words = [w for w in re.findall(r"[a-z0-9]+", fold(p["title"])) if len(w) > 3]
            s = sum(1 for w in words if w in ft) + (3 if p["id"].replace("_", " ") in ft else 0)
            if s > score:
                best, score = p, s
        return best if score else None

    def delete_project(self, pid: str) -> bool:
        with self.db() as c:
            n = c.execute("DELETE FROM p_projects WHERE id=?", (pid,)).rowcount
            self._unindex(c, "project", pid)
        return bool(n)

    # ------------------------------------------------------------------ facts
    def remember(self, key: str, value: str, source: str = "conversation") -> None:
        key = fold(key).strip()[:120]
        if not key:
            raise ValueError("Clé vide.")
        with self.db() as c:
            c.execute("INSERT OR REPLACE INTO p_facts(key,value,updated,source) VALUES(?,?,?,?)", (key, str(value)[:2000], now_iso(), source))
            self._index(c, "fact", key, key, str(value))

    def facts(self) -> dict[str, str]:
        with self.db() as c:
            return {r["key"]: r["value"] for r in c.execute("SELECT key,value FROM p_facts ORDER BY key")}

    def forget(self, key: str) -> bool:
        key = fold(key).strip()
        with self.db() as c:
            n = c.execute("DELETE FROM p_facts WHERE key=?", (key,)).rowcount
            self._unindex(c, "fact", key)
        return bool(n)

    # -------------------------------------------------------------- followups
    def add_followup(self, question: str, due_in_s: float = 0, project: str | None = None, choices: Iterable[str] = ()) -> int:
        with self.db() as c:
            dup = c.execute("SELECT id FROM p_followups WHERE status='open' AND question=?", (question,)).fetchone()
            if dup:
                return dup["id"]
            return c.execute("INSERT INTO p_followups(created,due,question,project,choices) VALUES(?,?,?,?,?)",
                             (now_iso(), time.time() + max(0, due_in_s), str(question)[:400], project,
                              json.dumps(list(choices)[:6], ensure_ascii=False))).lastrowid

    def due_followups(self, limit: int = 3) -> list[dict]:
        with self.db() as c:
            rows = c.execute("SELECT * FROM p_followups WHERE status='open' AND due<=? ORDER BY due LIMIT ?", (time.time(), limit)).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["choices"] = json.loads(d["choices"] or "[]")
            out.append(d)
        return out

    def close_followup(self, fid: int, status: str = "done") -> None:
        with self.db() as c:
            c.execute("UPDATE p_followups SET status=? WHERE id=?", (status if status in ("done", "dismissed") else "done", int(fid)))

    # ---------------------------------------------------------------- actions
    def propose_action(self, kind: str, params: dict, summary: str, risk: str, ttl_s: int = 300) -> dict:
        aid = uuid.uuid4().hex[:16]
        with self.db() as c:
            c.execute("INSERT INTO p_actions(id,created,expires,kind,params,summary,risk) VALUES(?,?,?,?,?,?,?)",
                      (aid, now_iso(), time.time() + ttl_s, kind, json.dumps(params, ensure_ascii=False), summary[:400], risk))
        return self.action(aid)

    def action(self, aid: str) -> dict | None:
        with self.db() as c:
            r = c.execute("SELECT * FROM p_actions WHERE id=?", (str(aid),)).fetchone()
        if not r:
            return None
        d = dict(r)
        d["params"] = json.loads(d["params"])
        d["expired"] = d["status"] == "proposed" and d["expires"] < time.time()
        return d

    def set_action(self, aid: str, status: str, result: Any = None) -> None:
        with self.db() as c:
            c.execute("UPDATE p_actions SET status=?,result=? WHERE id=?", (status, json.dumps(result, ensure_ascii=False)[:4000] if result is not None else None, aid))

    def actions(self, limit: int = 50) -> list[dict]:
        with self.db() as c:
            rows = c.execute("SELECT id FROM p_actions ORDER BY created DESC LIMIT ?", (limit,)).fetchall()
        return [self.action(r["id"]) for r in rows]

    # ----------------------------------------------------------------- search
    def search(self, query: str, limit: int = 8) -> list[dict]:
        terms = [t for t in re.findall(r"[a-z0-9]+", fold(query)) if len(t) > 2]
        if not terms:
            return []
        out: list[dict] = []
        with self.db() as c:
            if self.fts:
                q = " OR ".join(f'"{t}"*' for t in terms[:12])
                try:
                    rows = c.execute("SELECT kind,ref,title,snippet(p_search,3,'«','»','…',12) AS snip,bm25(p_search) AS score "
                                     "FROM p_search WHERE p_search MATCH ? ORDER BY score LIMIT ?", (q, limit)).fetchall()
                    out = [{"kind": r["kind"], "ref": r["ref"], "title": r["title"], "snippet": r["snip"]} for r in rows]
                except sqlite3.OperationalError:
                    out = []
            if not out:
                like = "%" + terms[0] + "%"
                for r in c.execute("SELECT id,title,body FROM p_notes WHERE lower(title) LIKE ? OR lower(body) LIKE ? ORDER BY id DESC LIMIT ?", (like, like, limit)):
                    out.append({"kind": "note", "ref": str(r["id"]), "title": r["title"], "snippet": r["body"][:160]})
                for r in c.execute("SELECT id,title,goal FROM p_projects WHERE lower(title) LIKE ? OR lower(goal) LIKE ? LIMIT ?", (like, like, limit)):
                    out.append({"kind": "project", "ref": r["id"], "title": r["title"], "snippet": r["goal"][:160]})
        return out[:limit]

    # ----------------------------------------------------------------- export
    def export(self) -> dict:
        with self.db() as c:
            conv = [dict(r) for r in c.execute("SELECT * FROM p_conversations ORDER BY id")]
        return {"version": 1, "exported": now_iso(), "notes": self.notes(limit=1000), "projects": self.projects(),
                "facts": self.facts(), "conversations": conv}

    def wipe(self, what: str) -> int:
        table = {"conversations": "p_conversations", "notes": "p_notes", "facts": "p_facts", "followups": "p_followups"}.get(what)
        if not table:
            raise ValueError("Catégorie inconnue.")
        kind = {"conversations": "conversation", "notes": "note", "facts": "fact"}.get(what)
        with self.db() as c:
            n = c.execute(f"DELETE FROM {table}").rowcount
            if kind and self.fts:
                c.execute("DELETE FROM p_search WHERE kind=?", (kind,))
        return n

    def backup(self, folder: Path | str, keep: int = 14) -> Path:
        """Copie cohérente de la base (API de sauvegarde SQLite) ; garde les `keep` dernières copies."""
        folder = Path(folder)
        folder.mkdir(parents=True, exist_ok=True)
        dest = folder / f"patricia-{datetime.now(timezone.utc):%Y%m%d}.sqlite3"
        src = sqlite3.connect(self.path, timeout=15)
        try:
            out = sqlite3.connect(dest)
            with out:
                src.backup(out)
            out.close()
        finally:
            src.close()
        for old in sorted(folder.glob("patricia-*.sqlite3"))[:-keep]:
            old.unlink(missing_ok=True)
        return dest

    def stats(self) -> dict:
        with self.db() as c:
            q = lambda t: c.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            return {"conversations": q("p_conversations"), "notes": q("p_notes"), "projects": q("p_projects"),
                    "facts": q("p_facts"), "followups_open": c.execute("SELECT COUNT(*) FROM p_followups WHERE status='open'").fetchone()[0],
                    "fts": self.fts, "path": str(self.path)}
