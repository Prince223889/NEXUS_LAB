"""Fabrique d'applications du Studio APK : conception JSON → APK Android signée, sans compilation.

L'APK de base est l'application NEXUS (mobile/, version 1.2 ou plus) : elle contient le lecteur
`assets/player/`. Le Pi y ajoute `assets/player/app.js` (la conception), remplace le moteur par sa version
à jour, renomme le paquet (local.nexus.apps.<id>) et l'étiquette, puis signe avec la clé du labo.
"""
from __future__ import annotations

import hashlib
import ipaddress
import json
import re
import unicodedata
import zipfile
from pathlib import Path
from urllib.parse import urlparse

from . import apksign
from .axml import AxmlError, rebrand

FORMAT = "nexus-app/1"
ID_RE = re.compile(r"^[a-z][a-z0-9_]{1,39}$")
VAR_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,31}$")
COMPONENTS = {"title", "text", "value", "gauge", "chart", "led", "button", "switch", "slider", "input", "image",
              "joystick", "spacer", "link"}
ACTIONS = {"set", "toggle", "goto", "http", "job", "speak", "vibrate", "notify", "listen"}
WHEN = {"start", "timer", "above", "below", "equals", "change", "screen"}
PLAYER_FILES = ("index.html", "runtime.js")
MAX_DESIGN = 256 * 1024


class DesignError(ValueError):
    pass


def slug(text: str) -> str:
    plain = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9]+", "_", plain.lower()).strip("_")[:40]
    if not s:
        s = "app"
    return s if s[0].isalpha() else "a" + s[:39]


def _str(v, n=200) -> str:
    return str(v if v is not None else "")[:n]


def _actions(raw, where: str, screens: set[str]) -> list[dict]:
    out = []
    for a in (raw or [])[:20]:
        if not isinstance(a, dict) or a.get("a") not in ACTIONS:
            raise DesignError(f"{where} : action inconnue")
        act = {"a": a["a"]}
        for k in ("var", "value", "screen", "method", "url", "body", "type", "text"):
            if k in a:
                act[k] = _str(a[k], 600)
        for k in ("ms", "worker"):
            if k in a:
                act[k] = int(float(a[k] or 0))
        if act["a"] in ("set", "toggle", "listen") and not VAR_RE.match(act.get("var", "")):
            raise DesignError(f"{where} : variable manquante pour « {act['a']} »")
        if act["a"] == "goto" and act.get("screen") not in screens:
            raise DesignError(f"{where} : écran « {act.get('screen', '')} » absent")
        if act["a"] == "http":
            url = act.get("url", "")
            if not re.match(r"^https?://", url):
                raise DesignError(f"{where} : l'adresse doit commencer par http:// ou https://")
            act["method"] = act.get("method", "GET").upper() if act.get("method", "GET").upper() in ("GET", "POST", "PUT", "DELETE") else "GET"
        out.append(act)
    return out


def validate(design: dict) -> dict:
    """Vérifie et normalise une conception ; lève DesignError avec un message clair."""
    if not isinstance(design, dict):
        raise DesignError("Conception invalide")
    if len(json.dumps(design)) > MAX_DESIGN:
        raise DesignError("Conception trop grande (256 Ko maximum)")
    name = _str(design.get("name"), 60).strip()
    if not name:
        raise DesignError("Donne un nom à l'application")
    app_id = design.get("id") or slug(name)
    if not ID_RE.match(app_id):
        raise DesignError("Identifiant invalide : lettres minuscules, chiffres et _ (commence par une lettre)")
    out = {"format": FORMAT, "id": app_id, "name": name, "version": max(1, min(int(design.get("version") or 1), 2_000_000)),
           "icon": _str(design.get("icon") or "📱", 8), "color": _str(design.get("color") or "#2f7cf6", 9),
           "theme": design.get("theme") if design.get("theme") in ("auto", "light", "dark") else "auto",
           "s3": _str(design.get("s3") or "http://192.168.4.1", 120), "description": _str(design.get("description"), 400),
           "vars": [], "screens": [], "rules": []}
    if not re.match(r"^#[0-9a-fA-F]{6}$", out["color"]):
        out["color"] = "#2f7cf6"
    names = set()
    for v in (design.get("vars") or [])[:60]:
        if not isinstance(v, dict) or not VAR_RE.match(str(v.get("name", ""))):
            raise DesignError(f"Nom de variable invalide : « {v.get('name', '') if isinstance(v, dict) else v} »")
        if v["name"] in names:
            raise DesignError(f"Variable « {v['name']} » déclarée deux fois")
        names.add(v["name"])
        src = v.get("source") if v.get("source") in ("local", "feed", "http") else "local"
        var = {"name": v["name"], "source": src, "type": v.get("type") if v.get("type") in ("number", "text", "bool") else "number",
               "default": v.get("default", 0) if isinstance(v.get("default", 0), (int, float, str, bool)) else 0,
               "unit": _str(v.get("unit"), 12), "label": _str(v.get("label"), 60)}
        if src == "feed":
            var["feed"] = _str(v.get("feed"), 80)
            if not var["feed"]:
                raise DesignError(f"Variable « {v['name']} » : choisis la mesure du MASTER (appareil/clé)")
        if src == "http":
            var["url"], var["path"] = _str(v.get("url"), 300), _str(v.get("path"), 120)
            var["every"] = max(1, min(int(v.get("every") or 2), 3600))
            if not re.match(r"^https?://", var["url"]):
                raise DesignError(f"Variable « {v['name']} » : adresse http:// attendue")
        out["vars"].append(var)
    screens = design.get("screens") or []
    if not screens:
        raise DesignError("L'application doit avoir au moins un écran")
    screen_ids = {str(s.get("id", "")) for s in screens if isinstance(s, dict)}
    seen_items = set()
    for s in screens[:12]:
        if not isinstance(s, dict) or not VAR_RE.match(str(s.get("id", ""))):
            raise DesignError("Identifiant d'écran invalide")
        scr = {"id": s["id"], "title": _str(s.get("title") or s["id"], 60), "items": []}
        for it in (s.get("items") or [])[:80]:
            if not isinstance(it, dict) or it.get("type") not in COMPONENTS:
                raise DesignError(f"Écran « {scr['title']} » : composant inconnu")
            iid = _str(it.get("id"), 24)
            if not iid or iid in seen_items:
                raise DesignError(f"Écran « {scr['title']} » : identifiant de composant manquant ou en double")
            seen_items.add(iid)
            item = {k: (_str(val, 600) if isinstance(val, str) else val) for k, val in it.items()
                    if k not in ("do", "off") and isinstance(val, (str, int, float, bool)) and len(k) <= 20}
            for k in ("var", "var_x", "var_y"):
                if item.get(k) and item[k] not in names:
                    raise DesignError(f"« {it.get('label') or it['type']} » utilise la variable « {item[k]} » qui n'existe pas")
            if "do" in it:
                item["do"] = _actions(it["do"], f"« {it.get('label') or it['type']} »", screen_ids)
            if "off" in it:
                item["off"] = _actions(it["off"], f"« {it.get('label') or it['type']} »", screen_ids)
            scr["items"].append(item)
        out["screens"].append(scr)
    for r in (design.get("rules") or [])[:40]:
        when = r.get("when") if isinstance(r, dict) else None
        if not isinstance(when, dict) or when.get("type") not in WHEN:
            raise DesignError("Bloc « quand » invalide")
        w = {"type": when["type"]}
        if "var" in when:
            if when["var"] not in names:
                raise DesignError(f"Bloc « quand » : variable « {when['var']} » absente")
            w["var"] = when["var"]
        if "value" in when:
            w["value"] = _str(when["value"], 60)
        if "every" in when:
            w["every"] = max(1, min(int(when["every"] or 1), 86400))
        if "screen" in when:
            w["screen"] = _str(when["screen"], 32)
        out["rules"].append({"when": w, "do": _actions(r.get("do"), "Bloc « quand »", screen_ids)})
    return out


def package_name(design: dict) -> str:
    return "local.nexus.apps." + design["id"]


def player_source(design: dict) -> bytes:
    return ("window.NEXUS_APP = " + json.dumps(design, ensure_ascii=False) + ";\n").encode("utf-8")


def base_info(base_apk: Path) -> dict:
    try:
        with zipfile.ZipFile(base_apk) as z:
            names = set(z.namelist())
    except (OSError, zipfile.BadZipFile):
        return {"ok": False, "reason": "APK NEXUS absente du Pi (packages/nexus-lab.apk)"}
    if not all(f"assets/player/{f}" in names for f in PLAYER_FILES):
        return {"ok": False, "reason": "APK NEXUS trop ancienne : reconstruis-la (version 1.2) avec scripts\\build_android.bat puis copie-la sur le Pi"}
    return {"ok": True, "reason": ""}


def build(design: dict, base_apk: Path, player_dir: Path | None, out: Path, keydir: Path, use_apksigner: bool = True) -> dict:
    """Fabrique l'APK `out` à partir de la conception déjà validée."""
    info = base_info(base_apk)
    if not info["ok"]:
        raise DesignError(info["reason"])
    package = package_name(design)
    overrides = {"assets/player/app.js": player_source(design)}
    if player_dir:
        for f in PLAYER_FILES:
            p = Path(player_dir) / f
            if p.is_file():
                overrides[f"assets/player/{f}"] = p.read_bytes()
    entries: list[tuple[zipfile.ZipInfo, bytes]] = []
    with zipfile.ZipFile(base_apk) as z:
        for src in z.infolist():
            name = src.filename
            if apksign.is_signature_file(name) or name in overrides or name in ("assets/project.json", "assets/project_code.ino"):
                continue
            data = z.read(name)
            if name == "AndroidManifest.xml":
                try:
                    data = rebrand(data, package, design["name"], int(design["version"]), f"{design['version']}.0")
                except (AxmlError, ValueError) as e:
                    raise DesignError(f"Manifeste de l'APK de base illisible : {e}") from e
            dst = zipfile.ZipInfo(name, date_time=src.date_time)
            dst.compress_type, dst.external_attr = src.compress_type, src.external_attr
            entries.append((dst, data))
    for name, data in overrides.items():
        dst = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        dst.compress_type = zipfile.ZIP_DEFLATED
        entries.append((dst, data))
    key, cert = apksign.ensure_key(keydir)
    out.parent.mkdir(parents=True, exist_ok=True)
    apksign.write_v1(entries, out, key, cert)
    schemes = ["v1"]
    if use_apksigner and apksign.apksigner_path():
        try:
            apksign.sign_v2(out, key, cert)
            schemes = ["v2", "v3"]   # minSdk 24 : apksigner remplace la v1 par v2/v3
        except apksign.SignError:
            pass   # la v1 seule reste valide pour cette APK (targetSdk 28)
    data = out.read_bytes()
    return {"package": package, "size": len(data), "sha256": hashlib.sha256(data).hexdigest(), "signature": "+".join(schemes)}


# --------------------------------------------------------------------------- appli web : relais limité
def _is_lan(host: str) -> bool:
    if host.endswith(".local"):
        return True
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    return ip.is_private and not ip.is_loopback


def allowed_url(design: dict, url: str) -> bool:
    """Le relais de l'appli web ne joint que des appareils du réseau local, à une adresse prévue par la conception."""
    try:
        u = urlparse(url)
    except ValueError:
        return False
    if u.scheme not in ("http", "https") or not u.hostname or u.username or not _is_lan(u.hostname):
        return False
    templates = [v.get("url", "") for v in design.get("vars", [])]
    for s in design.get("screens", []):
        for it in s.get("items", []):
            templates += [a.get("url", "") for a in it.get("do", []) + it.get("off", [])]
    templates += [a.get("url", "") for r in design.get("rules", []) for a in r.get("do", [])]
    for t in templates:
        fixed = re.split(r"[{?]", t, 1)[0]
        tu = urlparse(fixed) if fixed else None
        if not tu or not tu.scheme:
            continue
        if "{" in (tu.netloc or "") or not tu.netloc:   # hôte variable ({ip}) : tout appareil du LAN, même chemin
            path = urlparse(re.sub(r"\{[^}]*\}", "x", t)).path
            if u.path.startswith(path.split("?")[0]):
                return True
        elif u.scheme == tu.scheme and u.netloc == tu.netloc and u.path.startswith(tu.path):
            return True
    return False
