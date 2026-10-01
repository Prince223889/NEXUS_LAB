"""Routes HTTP du Studio APK sur l'agent du Pi.

Privées (jeton Bearer, appelées par l'interface du MASTER) :
    GET  /api/v1/appstudio                      état : APK de base, signature, nombre d'applis
    GET  /api/v1/appstudio/apps                 liste des applications enregistrées
    GET  /api/v1/appstudio/apps/<id>            conception
    POST /api/v1/appstudio/apps                 enregistre (validation complète)
    POST /api/v1/appstudio/apps/<id>/delete
    POST /api/v1/appstudio/apps/<id>/build      fabrique l'APK signée → lien direct + QR + appli web
    POST /api/v1/appstudio/proxy                relais vers un appareil du réseau local (mode test du Studio)
    POST /api/v1/appstudio/base                 dépose l'APK NEXUS 1.2+ construite sur un PC (corps = l'APK)
Publiques (téléphones du réseau du labo) :
    GET  /apps/<id>/            appli web (même moteur que l'APK)   · runtime.js · app.js · manifest.webmanifest
    POST /apps/<id>/proxy       relais limité aux adresses prévues par la conception
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
import uuid
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse

from . import apksign
from .axml import Manifest
from .forge import ID_RE, DesignError, _is_lan, allowed_url, base_info, build, validate

MAX_PROXY = 256 * 1024
S3_PATHS = ("/api/feeds", "/api/state", "/api/job")


@dataclass
class Context:
    designs: Path                       # conceptions JSON
    apps: Path                          # APK fabriquées (APPS de l'agent)
    keys: Path                          # clé de signature du labo
    base_apk: Path                      # APK NEXUS 1.2+ (lecteur)
    player: Path | None                 # index.html + runtime.js à jour
    record: Callable[[str, Path, str], str] = field(default=lambda pid, path, digest: uuid.uuid4().hex[:12])
    use_apksigner: bool = True


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


_OPENER = urllib.request.build_opener(_NoRedirect, urllib.request.ProxyHandler({}))


def relay(method: str, url: str, body: str) -> tuple[int, bytes, str]:
    data = body.encode("utf-8") if body and method != "GET" else None
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json" if body.lstrip()[:1] in "[{" else "application/x-www-form-urlencoded")
    try:
        with _OPENER.open(req, timeout=6) as r:
            return r.status, r.read(MAX_PROXY), r.headers.get("Content-Type", "text/plain")
    except urllib.error.HTTPError as e:
        return e.code, e.read(MAX_PROXY) if e.fp else b"", "text/plain"
    except (urllib.error.URLError, OSError, ValueError) as e:
        return 502, f"Appareil injoignable : {getattr(e, 'reason', e)}".encode(), "text/plain; charset=utf-8"


def _design_path(ctx: Context, app_id: str) -> Path:
    return ctx.designs / f"{app_id}.json"


def load(ctx: Context, app_id: str) -> dict | None:
    if not ID_RE.match(app_id or ""):
        return None
    try:
        return json.loads(_design_path(ctx, app_id).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def save(ctx: Context, design: dict) -> dict:
    d = validate(design)
    old = load(ctx, d["id"])
    d["created"] = (old or {}).get("created") or time.strftime("%Y-%m-%dT%H:%M:%S")
    d["updated"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    d["last_build"] = (old or {}).get("last_build")
    ctx.designs.mkdir(parents=True, exist_ok=True)
    tmp = _design_path(ctx, d["id"]).with_suffix(".part")
    tmp.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(_design_path(ctx, d["id"]))
    return d


def listing(ctx: Context) -> list[dict]:
    out = []
    for p in sorted(ctx.designs.glob("*.json")) if ctx.designs.exists() else []:
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        out.append({"id": d.get("id"), "name": d.get("name"), "icon": d.get("icon"), "color": d.get("color"), "version": d.get("version"),
                    "screens": len(d.get("screens", [])), "updated": d.get("updated"), "last_build": d.get("last_build")})
    out.sort(key=lambda x: x.get("updated") or "", reverse=True)
    return out


def make_apk(ctx: Context, app_id: str) -> dict:
    d = load(ctx, app_id)
    if not d:
        raise DesignError("Application introuvable : enregistre-la d'abord")
    clean = validate(d)
    jid = uuid.uuid4().hex[:12]
    out = ctx.apps / app_id / jid / f"{app_id}-v{clean['version']}.apk"
    res = build(clean, ctx.base_apk, ctx.player, out, ctx.keys, ctx.use_apksigner)
    jid = ctx.record(app_id, out, res["sha256"]) or jid
    res.update({"job": jid, "apk": f"/download/apps/{app_id}/{jid}.apk", "qr": f"/api/v1/jobs/{jid}/qr", "web": f"/apps/{app_id}/",
                "built": time.strftime("%Y-%m-%dT%H:%M:%S"), "version": clean["version"]})
    d["last_build"] = res
    tmp = _design_path(ctx, app_id).with_suffix(".part")
    tmp.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(_design_path(ctx, app_id))
    return res


def upload_base(ctx: Context, h) -> dict:
    """Reçoit l'APK NEXUS construite sur un PC (scripts/build_android.bat) : elle sert de lecteur à toutes les applis."""
    length = int(h.headers.get("Content-Length", "0") or 0)
    if not 1 <= length <= 60 * 1024 * 1024:
        raise DesignError("APK vide ou supérieure à 60 Mo")
    blob = h.rfile.read(length)
    if len(blob) != length:
        raise DesignError("Transfert incomplet")
    ctx.base_apk.parent.mkdir(parents=True, exist_ok=True)
    tmp = ctx.base_apk.with_name(ctx.base_apk.name + ".part")
    tmp.write_bytes(blob)
    try:
        with zipfile.ZipFile(tmp) as z:
            if z.testzip() is not None or "classes.dex" not in z.namelist():
                raise DesignError("Ce fichier n'est pas une APK Android complète")
            Manifest(z.read("AndroidManifest.xml"))
        info = base_info(tmp)
        if not info["ok"]:
            raise DesignError(info["reason"])
    except (zipfile.BadZipFile, KeyError, ValueError) as e:
        tmp.unlink(missing_ok=True)
        raise DesignError(str(e) if isinstance(e, DesignError) else "APK illisible") from e
    tmp.replace(ctx.base_apk)
    return {"ok": True, "size": length}


def status(ctx: Context) -> dict:
    info = base_info(ctx.base_apk)
    fp = ""
    try:
        cert = ctx.keys / "nexus-apps.cert.pem"
        fp = apksign.fingerprint(cert) if cert.is_file() else ""
    except apksign.SignError:
        pass
    return {"base": info, "signature": "v2+v3 (apksigner)" if apksign.apksigner_path() else "v1 (Python)",
            "key_fingerprint": fp, "apps": len(listing(ctx)), "player": bool(ctx.player and (ctx.player / "runtime.js").is_file())}


# --------------------------------------------------------------------------- appli web publique
def _send(h, status: int, data: bytes, ctype: str, cache: str = "no-cache") -> None:
    h.send_response(status)
    h.send_header("Content-Type", ctype)
    h.send_header("Content-Length", str(len(data)))
    h.send_header("Cache-Control", cache)
    h.send_header("X-Content-Type-Options", "nosniff")
    h.send_header("Access-Control-Allow-Origin", "*")   # l'interface du MASTER appelle le Pi depuis une autre origine
    h.end_headers()
    h.wfile.write(data)


def _web_index(ctx: Context, d: dict) -> bytes:
    src = (ctx.player / "index.html").read_text(encoding="utf-8") if ctx.player and (ctx.player / "index.html").is_file() else ""
    if not src:
        raise FileNotFoundError
    head = (f'<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon.svg">'
            f'<meta name="apple-mobile-web-app-capable" content="yes">')
    src = src.replace("<title>NEXUS App</title>", f"<title>{_html(d['name'])}</title>{head}")
    return src.replace('content="#2f7cf6"', f'content="{_html(d.get("color", "#2f7cf6"))}"').encode("utf-8")


def _html(s: str) -> str:
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _icon(d: dict) -> bytes:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="{_html(d.get("color", "#2f7cf6"))}"/>'
            f'<text x="50" y="66" font-size="52" text-anchor="middle">{_html(d.get("icon", "📱"))}</text></svg>').encode("utf-8")


def handle_public(h, method: str, path: str, ctx: Context, read_body) -> bool:
    m = re.fullmatch(r"/apps/([a-z][a-z0-9_]{1,39})/(|index\.html|runtime\.js|app\.js|manifest\.webmanifest|icon\.svg|proxy)", path)
    if not m:
        if re.fullmatch(r"/apps/[a-z][a-z0-9_]{1,39}", path):
            h.send_response(301)
            h.send_header("Location", path + "/")
            h.send_header("Content-Length", "0")
            h.end_headers()
            return True
        return False
    app_id, part = m.group(1), m.group(2)
    d = load(ctx, app_id)
    if not d:
        _send(h, 404, "Application introuvable sur le Pi.".encode(), "text/plain; charset=utf-8")
        return True
    d = {k: v for k, v in d.items() if k not in ("last_build", "created", "updated")}
    if part == "proxy":
        if method != "POST":
            _send(h, 405, b"POST attendu", "text/plain")
            return True
        try:
            req = read_body(h)
        except (ValueError, UnicodeDecodeError):
            _send(h, 400, b"JSON invalide", "text/plain")
            return True
        url, meth = str(req.get("url", "")), str(req.get("method", "GET")).upper()
        s3 = urlparse(d.get("s3", ""))
        u = urlparse(url)
        to_s3 = s3.netloc and u.netloc == s3.netloc and u.path in S3_PATHS and _is_lan(u.hostname or "")
        if meth not in ("GET", "POST", "PUT", "DELETE") or not (to_s3 or allowed_url(d, url)):
            _send(h, 403, "Adresse non prévue par cette application.".encode(), "text/plain; charset=utf-8")
            return True
        code, data, ctype = relay(meth, url, str(req.get("body", ""))[:8192])
        _send(h, code, data, ctype if ctype.startswith(("text/", "application/json")) else "text/plain")
        return True
    if method != "GET":
        return False
    try:
        if part in ("", "index.html"):
            _send(h, 200, _web_index(ctx, d), "text/html; charset=utf-8")
        elif part == "runtime.js":
            _send(h, 200, (ctx.player / "runtime.js").read_bytes(), "text/javascript; charset=utf-8")
        elif part == "app.js":
            _send(h, 200, ("window.NEXUS_APP = " + json.dumps(d, ensure_ascii=False) + ";\n").encode("utf-8"), "text/javascript; charset=utf-8")
        elif part == "icon.svg":
            _send(h, 200, _icon(d), "image/svg+xml")
        else:
            manifest = {"name": d["name"], "short_name": d["name"][:12], "start_url": ".", "display": "standalone",
                        "background_color": "#0f1522", "theme_color": d.get("color", "#2f7cf6"),
                        "icons": [{"src": "icon.svg", "sizes": "any", "type": "image/svg+xml"}]}
            _send(h, 200, json.dumps(manifest, ensure_ascii=False).encode("utf-8"), "application/manifest+json")
    except (OSError, TypeError, FileNotFoundError):
        _send(h, 503, "Lecteur d'application absent du Pi (réinstalle avec pi/install.sh).".encode(), "text/plain; charset=utf-8")
    return True


# --------------------------------------------------------------------------- routes privées
def handle(h, method: str, path: str, ctx: Context, read_body) -> bool:
    if not path.startswith("/api/v1/appstudio"):
        return False
    try:
        if method == "GET":
            if path == "/api/v1/appstudio":
                h.sendj(200, status(ctx))
            elif path == "/api/v1/appstudio/apps":
                h.sendj(200, {"items": listing(ctx)})
            elif (m := re.fullmatch(r"/api/v1/appstudio/apps/([a-z][a-z0-9_]{1,39})", path)):
                d = load(ctx, m.group(1))
                h.sendj(200 if d else 404, d or {"error": "Application introuvable"})
            else:
                return False
            return True
        if method != "POST":
            return False
        if path == "/api/v1/appstudio/base":
            h.sendj(201, upload_base(ctx, h))
            return True
        body = read_body(h)
        if path == "/api/v1/appstudio/apps":
            d = save(ctx, body.get("design") if isinstance(body.get("design"), dict) else body)
            h.sendj(201, {"ok": True, "id": d["id"], "design": d})
        elif path == "/api/v1/appstudio/proxy":
            url, meth = str(body.get("url", "")), str(body.get("method", "GET")).upper()
            u = urlparse(url)
            if u.scheme not in ("http", "https") or not _is_lan(u.hostname or "") or meth not in ("GET", "POST", "PUT", "DELETE"):
                h.sendj(403, {"error": "Seuls les appareils du réseau local sont joignables"})
                return True
            code, data, ctype = relay(meth, url, str(body.get("body", ""))[:8192])
            _send(h, code, data, ctype if ctype.startswith(("text/", "application/json")) else "text/plain")
        elif (m := re.fullmatch(r"/api/v1/appstudio/apps/([a-z][a-z0-9_]{1,39})/(delete|build)", path)):
            app_id, op = m.groups()
            if op == "delete":
                p = _design_path(ctx, app_id)
                if not p.is_file():
                    h.sendj(404, {"error": "Application introuvable"})
                    return True
                p.unlink()
                h.sendj(200, {"ok": True})
            else:
                h.sendj(201, make_apk(ctx, app_id))
        else:
            return False
    except DesignError as e:
        h.sendj(400, {"error": str(e)})
    except apksign.SignError as e:
        h.sendj(500, {"error": "Signature impossible : " + str(e)})
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as e:
        h.sendj(400, {"error": str(e) or "Requête invalide"})
    return True
