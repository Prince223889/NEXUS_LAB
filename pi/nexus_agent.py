#!/usr/bin/env python3
"""NEXUS Pi companion: local catalogue, firmware index and controlled build queue."""
from __future__ import annotations
import hashlib,hmac,json,os,re,shutil,sqlite3,subprocess,threading,time,uuid,urllib.request,zipfile,mimetypes
from datetime import datetime,timezone
import platform
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from io import BytesIO
from urllib.parse import parse_qs,urlparse
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from patricia import api as patricia_api
from patricia.engine import Engine
from patricia.fleet import Arena
from patricia.fleet_net import FleetService
from patricia.knowledge import Knowledge
from patricia.memory import Memory

ROOT=Path(__file__).resolve().parents[1]
DATA=Path(os.getenv("NEXUS_DATA","/srv/nexus"))
PROJECTS=Path(os.getenv("NEXUS_PROJECTS",str(ROOT/"projects"/"LIBRARY")))
USER_PROJECTS=Path(os.getenv("NEXUS_USER_PROJECTS",str(DATA/"projects"/"MY_PROJECTS")))
FIRMWARE=Path(os.getenv("NEXUS_FIRMWARE",str(DATA/"firmware")))
SHARED_ROOT=Path(os.getenv("NEXUS_SHARED_ROOT",str(PROJECTS.parent.parent)))
CATALOG=Path(os.getenv("NEXUS_CATALOG",str(ROOT/"catalog"/"catalog.json")))
DB=Path(os.getenv("NEXUS_DB",str(DATA/"database"/"nexus.sqlite3")))
BUILDS=Path(os.getenv("NEXUS_BUILDS",str(DATA/"builds")))
APPS=Path(os.getenv("NEXUS_APPS",str(DATA/"apps")))
ANDROID_TEMPLATE=Path(os.getenv("NEXUS_ANDROID_TEMPLATE",str(ROOT/"android-template")))
ANDROID_SDK=Path(os.getenv("ANDROID_HOME",str(DATA/"android-sdk")))
TOKEN=os.getenv("NEXUS_TOKEN","")
WHATSAPP_VERIFY_TOKEN=os.getenv("NEXUS_WHATSAPP_VERIFY_TOKEN","")
WHATSAPP_APP_SECRET=os.getenv("NEXUS_WHATSAPP_APP_SECRET","")
WHATSAPP_ALLOWLIST={re.sub(r"\D","",x) for x in os.getenv("NEXUS_WHATSAPP_ALLOWLIST","").split(",") if re.sub(r"\D","",x)}
AI_CONFIG=DATA/"assistant-config.json"
PATRICIA_DB=Path(os.getenv("NEXUS_PATRICIA_DB",str(DATA/"patricia"/"memory.sqlite3")))
FLEET_KEY=os.getenv("NEXUS_FLEET_KEY","")
ENGINE=None; FLEET=None
CLI=os.getenv("ARDUINO_CLI","arduino-cli")
PORT=int(os.getenv("NEXUS_PORT","8088"))
BUILD_WORKERS=max(1,min(4,int(os.getenv("NEXUS_BUILD_WORKERS","1"))))
BOARDS={"esp32":"esp32:esp32:esp32","esp32s3":"esp32:esp32:esp32s3","esp32c3":"esp32:esp32:esp32c3"}
ID=re.compile(r"^[a-zA-Z0-9_-]{1,80}$")
active={}; lock=threading.Lock(); wake=threading.Event(); stop=threading.Event()

def now(): return datetime.now(timezone.utc).isoformat(timespec="seconds")
@contextmanager
def connect():
    DB.parent.mkdir(parents=True,exist_ok=True); c=sqlite3.connect(DB,timeout=15); c.row_factory=sqlite3.Row
    try:
        c.execute("PRAGMA journal_mode=WAL")
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally: c.close()
def init():
    with connect() as c: c.executescript("""
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,project TEXT,board TEXT,status TEXT,priority INTEGER,created TEXT,started TEXT,finished TEXT,elapsed REAL,stage TEXT,progress INTEGER,log TEXT,artifact TEXT,sha256 TEXT,error TEXT,kind TEXT DEFAULT 'esp');
    CREATE INDEX IF NOT EXISTS jobs_queue ON jobs(status,priority DESC,created);
    CREATE TABLE IF NOT EXISTS fw(path TEXT PRIMARY KEY,project TEXT,board TEXT,name TEXT,size INTEGER,sha256 TEXT,modified REAL,indexed TEXT,source TEXT);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,at TEXT,level TEXT,component TEXT,message TEXT,job TEXT,project TEXT,board TEXT,result TEXT);
    CREATE TABLE IF NOT EXISTS build_cache(project TEXT,board TEXT,fingerprint TEXT,artifact TEXT,sha256 TEXT,created TEXT,PRIMARY KEY(project,board,fingerprint));
    CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,at TEXT,sender TEXT,text TEXT);""")
    with connect() as c: c.execute("CREATE TABLE IF NOT EXISTS whatsapp_events(message_id TEXT PRIMARY KEY,received TEXT NOT NULL)")
    with connect() as c:
        cols={r[1] for r in c.execute("PRAGMA table_info(jobs)")}
        if "kind" not in cols: c.execute("ALTER TABLE jobs ADD COLUMN kind TEXT DEFAULT 'esp'")
def event(level,comp,msg,job=None,project=None,board=None,result=None):
    with connect() as c: c.execute("INSERT INTO events(at,level,component,message,job,project,board,result) VALUES(?,?,?,?,?,?,?,?)",(now(),level,comp,msg,job,project,board,result))
def add_message(sender,text):
    text=str(text).strip()[:2000]
    if not text: return
    with connect() as c: c.execute("INSERT INTO messages(at,sender,text) VALUES(?,?,?)",(now(),str(sender)[:40],text))

def assistant_config():
    cfg={"endpoint":os.getenv("NEXUS_AI_ENDPOINT","").strip(),"key":os.getenv("NEXUS_AI_KEY",""),"model":os.getenv("NEXUS_AI_MODEL","gpt-4o-mini").strip() or "gpt-4o-mini"}
    try:
        saved=json.loads(AI_CONFIG.read_text(encoding="utf-8"))
        if isinstance(saved,dict):
            for key in ("endpoint","key","model"):
                if isinstance(saved.get(key),str): cfg[key]=saved[key]
    except (OSError,ValueError): pass
    return cfg

def save_assistant_config(body):
    endpoint=str(body.get("endpoint","")).strip()[:500]
    model=str(body.get("model","gpt-4o-mini")).strip()[:120] or "gpt-4o-mini"
    key=body.get("key")
    if key is None or key=="": key=assistant_config()["key"]
    if not isinstance(key,str) or len(key)>2048: raise ValueError("Clé IA invalide.")
    if endpoint:
        parsed=urlparse(endpoint)
        if parsed.scheme not in ("http","https") or not parsed.netloc or parsed.username or parsed.password:
            raise ValueError("L’URL IA doit commencer par http:// ou https:// et ne pas contenir d’identifiants.")
    DATA.mkdir(parents=True,exist_ok=True)
    tmp=AI_CONFIG.with_suffix(".tmp")
    tmp.write_text(json.dumps({"endpoint":endpoint,"key":key,"model":model},ensure_ascii=False),encoding="utf-8")
    os.chmod(tmp,0o600); tmp.replace(AI_CONFIG)
    return {"endpoint":endpoint,"model":model,"configured":bool(endpoint and key),"key_set":bool(key)}

def assistant_history(limit=12):
    with connect() as c:
        rows=c.execute("SELECT sender,text FROM messages WHERE sender IN ('Atelier','Assistant') OR sender LIKE 'WhatsApp · %' ORDER BY id DESC LIMIT ?",(limit,)).fetchall()
    result=[]
    for row in reversed(rows):
        role="assistant" if row["sender"]=="Assistant" else "user"
        result.append({"role":role,"content":str(row["text"])[:2000]})
    return result
def sha(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda:f.read(1<<20),b""): h.update(b)
    return h.hexdigest()
def index_fw():
    rows={}
    for base,src in ((PROJECTS,"project"),(FIRMWARE,"firmware")):
        if not base.exists(): continue
        for p in base.rglob("*"):
            try:
                if not p.is_file() or p.is_symlink() or p.suffix.lower() not in (".bin",".hex"): continue
                rel=p.relative_to(base)
                project=next((x for x in rel.parts if ID.fullmatch(x) and x not in BOARDS),None)
                compact=str(p).lower().replace("-","").replace("_","")
                board=next((b for b in ("esp32s3","esp32c3","esp32") if b in compact),"unknown")
                rows[str(p.resolve())]=(project,board,p.name,p.stat().st_size,sha(p),p.stat().st_mtime,now(),src)
                if len(rows)>=10000: break
            except (OSError,ValueError): pass
    with connect() as c:
        c.execute("DELETE FROM fw"); c.executemany("INSERT INTO fw VALUES(?,?,?,?,?,?,?,?,?)",[(p,*v) for p,v in rows.items()])
    return {"indexed":len(rows),"project_bins":sum(v[-1]=="project" for v in rows.values())}
def catalog():
    try: return json.loads(CATALOG.read_text(encoding="utf-8")).get("projects",[])
    except (OSError,ValueError): return []
def search(q,limit=8):
    terms=[x for x in re.findall(r"[\w-]+",q.casefold()) if len(x)>2]; hits=[]
    for p in catalog():
        hay=" ".join([str(p.get("id","")),str(p.get("title",""))]+p.get("tags",[])+p.get("libs",[])).casefold()
        score=sum(t in hay for t in terms)
        if score: hits.append((score/max(len(terms),1),score,p))
    hits.sort(key=lambda x:(x[0],x[1]),reverse=True)
    return [{**p,"match":round(s,2)} for s,_,p in hits[:limit]]
def plan(body):
    desc=str(body.get("description","")).strip(); answers=body.get("answers",{})
    mods=[]
    for p in catalog():
        if p.get("kind")!="module": continue
        names=[str(p.get("id","")),str(p.get("title",""))]+p.get("tags",[])
        if any(len(n)>3 and n.casefold() in desc.casefold() for n in names): mods.append(p)
    recs=search(desc,5)
    if not desc: return {"status":"needs_input","question":"Décris ton projet en une phrase.","choices":["Mesurer une température","Surveiller un niveau","Commander un relais"]}
    if not mods:
        choices=[{"label":p.get("title",p.get("id")),"value":p.get("id")} for p in recs]
        if not choices: choices=[{"label":p.get("title",p["id"]),"value":p["id"]} for p in catalog() if p.get("kind")=="module"][:6]
        return {"status":"needs_input","question":"Quel composant veux-tu utiliser ?","choices":choices,"recommendations":recs}
    board=str(answers.get("board",body.get("board","esp32"))).lower()
    if board not in BOARDS: return {"status":"needs_input","question":"Quelle carte utilises-tu ?","choices":[{"label":n,"value":b} for b,n in (("esp32","ESP32"),("esp32s3","ESP32-S3"),("esp32c3","ESP32-C3"))],"modules":[m["id"] for m in mods]}
    bad=[m for m in mods if board not in m.get("boards",[])]
    if bad: return {"status":"incompatible","question":"La carte ne prend pas en charge tous les composants.","incompatible":[m.get("title",m["id"]) for m in bad],"modules":[m["id"] for m in mods]}
    return {"status":"ready_for_review","board":board,"modules":[m["id"] for m in mods],"module_names":[m.get("title",m["id"]) for m in mods],"behavior":desc,"exact_or_close_projects":recs,"message":"Vérifie les composants et le câblage dans le Studio avant compilation."}
def shared_path(path):
    if not isinstance(path,str) or not path.startswith("/sd") or (path!="/sd" and not path.startswith("/sd/")): raise ValueError("Chemin NEXUS invalide")
    rel=path[3:].strip("/")
    parts=[] if not rel else rel.split("/")
    if any(part in ("",".","..") for part in parts): raise ValueError("Chemin NEXUS invalide")
    root=SHARED_ROOT.resolve()
    target=root.joinpath(*parts)
    try: target.resolve(strict=False).relative_to(root)
    except (OSError,ValueError): raise ValueError("Chemin hors du volume partagé")
    current=root
    for part in parts:
        current=current/part
        if current.is_symlink(): raise ValueError("Les liens symboliques sont refusés")
    return target

def project_dir(pid):
    if not ID.fullmatch(pid): return None
    for base in (USER_PROJECTS,PROJECTS):
        try:
            root=base.resolve(); p=(base/pid).resolve(); p.relative_to(root)
            if p.is_dir() and not p.is_symlink() and any(p.glob("*.ino")): return p
        except (OSError,ValueError): pass
    return None

def sync_user_project(pid,files):
    if not ID.fullmatch(pid) or not isinstance(files,dict) or not 1<=len(files)<=24: raise ValueError("Identifiant ou liste de fichiers invalide")
    if (PROJECTS/pid).exists(): raise ValueError("Cet identifiant appartient au catalogue protégé")
    safe={}; total=0
    for name,value in files.items():
        if not isinstance(name,str) or not re.fullmatch(r"[A-Za-z0-9_-][A-Za-z0-9_.-]{0,95}",name) or name.startswith("."): raise ValueError("Nom de fichier refusé")
        if Path(name).suffix.lower() not in (".ino",".cpp",".c",".h",".hpp",".json",".md",".txt"): raise ValueError("Type de fichier refusé")
        if not isinstance(value,str): raise ValueError("Chaque fichier doit être du texte UTF-8")
        size=len(value.encode("utf-8")); total+=size
        if size>4*1024*1024 or total>6*1024*1024: raise ValueError("Projet trop volumineux (6 Mo max)")
        safe[name]=value
    inos=[n for n in safe if n.lower().endswith(".ino")]
    if not inos: raise ValueError("Le projet doit contenir un fichier .ino")
    if len(inos)>1: raise ValueError("Un seul fichier .ino principal est accepté pour le moment")
    USER_PROJECTS.mkdir(parents=True,exist_ok=True)
    stage=USER_PROJECTS/(".stage_"+uuid.uuid4().hex); stage.mkdir()
    try:
        ino=inos[0]
        for name,value in safe.items():
            target=(pid+".ino") if name==ino and name!=pid+".ino" else name
            (stage/target).write_text(value,encoding="utf-8")
        if "README.md" not in safe:
            meta={}
            try: meta=json.loads(safe.get("project.json","{}"))
            except ValueError: pass
            title=str(meta.get("title") or pid); desc=str(meta.get("description") or "Projet ESP32 généré dans NEXUS LAB.")
            modules=meta.get("spec",{}).get("modules",[]) if isinstance(meta.get("spec"),dict) else []
            module_names=", ".join(str(x.get("id",x)) if isinstance(x,dict) else str(x) for x in modules)
            (stage/"README.md").write_text(f"# {title}\n\n{desc}\n\nComposants: {module_names or 'à compléter'}\n\nLes brochages complets sont dans le Studio NEXUS; vérifie le montage réel avant alimentation.\n",encoding="utf-8")
        dest=USER_PROJECTS/pid; backup=USER_PROJECTS/(".backup_"+uuid.uuid4().hex)
        if dest.exists(): dest.replace(backup)
        try: stage.replace(dest)
        except Exception:
            if backup.exists(): backup.replace(dest)
            raise
        if backup.exists(): shutil.rmtree(backup)
    except Exception:
        if stage.exists(): shutil.rmtree(stage,ignore_errors=True)
        raise
    return project_dir(pid)
def github_worker_assets(repo):
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}",repo): raise ValueError("Dépôt GitHub invalide (format propriétaire/dépôt)")
    req=urllib.request.Request(f"https://api.github.com/repos/{repo}/releases/latest",headers={"Accept":"application/vnd.github+json","User-Agent":"NEXUS-LAB-Pi"})
    with urllib.request.urlopen(req,timeout=20) as r: payload=json.loads(r.read(512*1024+1).decode("utf-8"))
    if not isinstance(payload,dict) or not isinstance(payload.get("assets"),list): raise ValueError("Release GitHub invalide")
    items=[]
    for asset in payload["assets"]:
        name=str(asset.get("name","")); url=str(asset.get("browser_download_url","")); size=int(asset.get("size",0) or 0)
        if not name.lower().endswith(".bin") or "master" in name.lower() or size<=0 or size>8*1024*1024: continue
        if not url.startswith(f"https://github.com/{repo}/releases/download/"): continue
        digest=str(asset.get("digest","")).removeprefix("sha256:")
        if digest and not re.fullmatch(r"[a-fA-F0-9]{64}",digest): digest=""
        items.append({"name":name,"url":url,"size":size,"sha256":digest,"tag":str(payload.get("tag_name","")),"repo":repo})
    return items

def import_github_firmware(repo,tag,name,url,board,digest=""):
    if board not in BOARDS: raise ValueError("Carte cible invalide")
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}",repo): raise ValueError("Dépôt GitHub invalide")
    if not re.fullmatch(r"[A-Za-z0-9_.+-]{1,100}",tag) or not re.fullmatch(r"[A-Za-z0-9_.-]{1,120}\.bin",name): raise ValueError("Version ou nom de fichier invalide")
    parsed=urlparse(url)
    if parsed.scheme!="https" or parsed.netloc!="github.com" or parsed.path!=f"/{repo}/releases/download/{tag}/{name}" or parsed.query or parsed.fragment: raise ValueError("URL GitHub refusée")
    if digest and not re.fullmatch(r"[a-fA-F0-9]{64}",digest): raise ValueError("SHA-256 invalide")
    req=urllib.request.Request(url,headers={"User-Agent":"NEXUS-LAB-Pi","Accept":"application/octet-stream"})
    with urllib.request.urlopen(req,timeout=45) as r:
        final=urlparse(r.geturl())
        if final.scheme!="https" or final.hostname not in ("github.com","release-assets.githubusercontent.com"): raise ValueError("Redirection GitHub refusée")
        length=int(r.headers.get("Content-Length","0") or 0)
        if length<=0 or length>8*1024*1024: raise ValueError("Firmware vide ou supérieur à 8 Mo")
        blob=r.read(8*1024*1024+1)
    if not 0<len(blob)<=8*1024*1024: raise ValueError("Firmware vide ou supérieur à 8 Mo")
    actual=hashlib.sha256(blob).hexdigest()
    if digest and not hmac.compare_digest(actual,digest.lower()): raise ValueError("SHA-256 GitHub différent du fichier téléchargé")
    slug=re.sub(r"[^a-zA-Z0-9_-]","_",f"github_{repo.replace('/', '_')}_{tag}")[:80]
    jid=uuid.uuid4().hex[:12]; path=FIRMWARE/"github"/slug/jid/name; path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(blob)
    with connect() as c: c.execute("INSERT INTO jobs(id,project,board,status,priority,created,started,finished,elapsed,stage,progress,log,artifact,sha256,error,kind) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(jid,slug,board,"success",50,now(),now(),now(),0,"firmware GitHub vérifié",100,f"{repo} · {tag} · {name}",str(path),actual,None,"esp"))
    event("INFO","github","Firmware worker importé et SHA-256 calculé",jid,slug,board,"success")
    add_message("Pi",f"Firmware GitHub vérifié: {name} · SHA-256 {actual[:12]}…")
    return {"id":jid,"project":slug,"board":board,"sha256":actual,"size":len(blob),"name":name}

def setjob(jid,**kw):
    with connect() as c: c.execute("UPDATE jobs SET "+",".join(k+"=?" for k in kw)+" WHERE id=?",(*kw.values(),jid))
def getjob(jid):
    with connect() as c:
        r=c.execute("SELECT * FROM jobs WHERE id=?",(jid,)).fetchone()
        return dict(r) if r else None
def source_fingerprint(src,board):
    h=hashlib.sha256(board.encode())
    for p in sorted(x for x in src.rglob("*") if x.is_file() and x.suffix.lower() in (".ino",".h",".hpp",".c",".cpp",".json")):
        h.update(p.relative_to(src).as_posix().encode()); h.update(p.read_bytes())
    try:
        for args in ([CLI,"version"],[CLI,"core","list"],[CLI,"lib","list"]):
            v=subprocess.run(args,capture_output=True,text=True,timeout=20,shell=False)
            h.update(v.stdout.encode()); h.update(v.stderr.encode())
    except Exception: h.update(b"arduino-cli-version-unavailable")
    return h.hexdigest()
def promote_cached_artifact(project,board,fingerprint,artifact,digest):
    """Copy a verified cache hit to the FAT tree shared with the MASTER S3."""
    artifact=Path(artifact); shared=FIRMWARE/project/board/artifact.name
    shared.parent.mkdir(parents=True,exist_ok=True)
    if artifact.resolve()!=shared.resolve():
        if not shared.is_file() or sha(shared)!=digest: shutil.copy2(artifact,shared)
        with connect() as c: c.execute("UPDATE build_cache SET artifact=? WHERE project=? AND board=? AND fingerprint=?",(str(shared),project,board,fingerprint))
        with connect() as c: c.execute("INSERT OR REPLACE INTO fw VALUES(?,?,?,?,?,?,?,?,?)",(str(shared),project,board,shared.name,shared.stat().st_size,digest,shared.stat().st_mtime,now(),"cache"))
    return shared

def build(job):
    jid,pid,board=job["id"],job["project"],job["board"]; src=project_dir(pid)
    if not src:
        setjob(jid,status="failed",stage="projet absent",finished=now(),error="Croquis .ino absent"); add_message("Pi",f"Échec {pid}: croquis .ino absent."); return
    out=BUILDS/pid/board/jid; out.mkdir(parents=True,exist_ok=True); start=time.monotonic()
    fingerprint=source_fingerprint(src,board)
    with connect() as c: cached=c.execute("SELECT artifact,sha256 FROM build_cache WHERE project=? AND board=? AND fingerprint=?",(pid,board,fingerprint)).fetchone()
    if cached:
        artifact=Path(cached["artifact"])
        if artifact.is_file() and sha(artifact)==cached["sha256"]:
            # A cache hit is also promoted to the FAT volume shared with the S3.
            try: artifact=promote_cached_artifact(pid,board,fingerprint,artifact,cached["sha256"])
            except OSError as e:
                setjob(jid,status="failed",stage="synchronisation microSD commune",finished=now(),error=f"Artefact vérifié mais copie sur la microSD commune impossible: {e}"[:400])
                add_message("Pi",f"Cache {pid}: copie vers la microSD commune impossible; libère de l’espace."); return
            setjob(jid,status="success",stage="cache validé sur stockage commun",started=now(),finished=now(),elapsed=0,progress=100,log="Build réutilisé depuis le cache; SHA-256 vérifié et artefact présent sur la microSD FAT commune.",artifact=str(artifact),sha256=cached["sha256"])
            event("INFO","build","Build réutilisé depuis le cache partagé et vérifié",jid,pid,board,"success"); return
    setjob(jid,status="running",stage="compilation",started=now(),progress=0); event("INFO","build","Compilation démarrée",jid,pid,board); add_message("Pi",f"Compilation démarrée: {pid} sur {board}.")
    lines=[]
    try:
        proc=subprocess.Popen([CLI,"compile","--fqbn",BOARDS[board],"--warnings","all","--build-path",str(out),str(src)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding="utf-8",errors="replace",shell=False)
        with lock: active[jid]=proc
        for line in proc.stdout or []:
            if line.strip():
                lines=(lines+[line.rstrip()])[-250:]
                pct=55 if any(x in line.lower() for x in ("linking", "linker", "edition des liens", "édition des liens")) else min(50,5+len(lines)//5)
                setjob(jid,stage="édition de liens" if pct>=55 else "compilation",progress=pct,log="\n".join(lines)[-24000:])
        code=proc.wait(); elapsed=round(time.monotonic()-start,2)
        if (getjob(jid) or {}).get("status")=="canceled": return
        if code: setjob(jid,status="failed",stage="échec",finished=now(),elapsed=elapsed,log="\n".join(lines)[-24000:],error=f"arduino-cli code {code}"); event("ERROR","build","Échec compilation",jid,pid,board,"failed"); add_message("Pi",f"Échec de compilation: {pid} ({board}), code {code}."); return
        bins=[p for p in out.rglob("*") if p.is_file() and p.suffix.lower() in (".bin",".hex")]
        artifact=max(bins,key=lambda p:p.stat().st_size) if bins else None; digest=sha(artifact) if artifact else None; saved=None
        if artifact:
            dest=FIRMWARE/pid/board; dest.mkdir(parents=True,exist_ok=True); saved=dest/artifact.name; shutil.copy2(artifact,saved)
            with connect() as c: c.execute("INSERT OR REPLACE INTO fw VALUES(?,?,?,?,?,?,?,?,?)",(str(saved),pid,board,saved.name,saved.stat().st_size,digest,saved.stat().st_mtime,now(),"build"))
            with connect() as c: c.execute("INSERT OR REPLACE INTO build_cache VALUES(?,?,?,?,?,?)",(pid,board,fingerprint,str(saved),digest,now()))
        setjob(jid,status="success",stage="prêt à vérifier",finished=now(),elapsed=elapsed,progress=100,log="\n".join(lines)[-24000:],artifact=str(saved) if saved else None,sha256=digest)
        event("INFO","build","Build réussi ; aucun flash exécuté",jid,pid,board,"success"); add_message("Pi",f"Compilation réussie: {pid} ({board}). Aucun flash n’a été exécuté.")
    except FileNotFoundError: setjob(jid,status="failed",stage="outil absent",finished=now(),error="arduino-cli absent"); add_message("Pi","Échec: Arduino CLI est absent du Pi.")
    except Exception as e: setjob(jid,status="failed",stage="erreur",finished=now(),error=str(e)[:400]); add_message("Pi",f"Erreur de compilation {pid}: {str(e)[:300]}")
    finally:
        with lock: active.pop(jid,None)
def build_android(job):
    jid,pid=job["id"],job["project"]; src=project_dir(pid)
    if not src:
        setjob(jid,status="failed",stage="projet absent",finished=now(),error="Fiche de projet absente"); add_message("Pi",f"APK non créée: projet {pid} absent."); return
    meta={}
    try: meta=json.loads((src/"project.json").read_text(encoding="utf-8"))
    except (OSError,ValueError): pass
    spec=meta.get("spec") if isinstance(meta.get("spec"),dict) else {}
    cfg={"id":pid,"title":str(meta.get("title") or pid)[:100],"description":str(meta.get("description") or "Application de suivi du projet NEXUS")[:2000],"board":str(meta.get("board") or spec.get("board") or "esp32"),"modules":spec.get("modules",[])[:40],"rules":spec.get("rules",[])[:40]}
    if not ANDROID_TEMPLATE.is_dir() or not (ANDROID_TEMPLATE/"gradlew").is_file():
        setjob(jid,status="failed",stage="modèle Android absent",finished=now(),error="Le modèle Android NEXUS n'est pas installé sur le Pi."); return
    out=APPS/pid/jid; out.mkdir(parents=True,exist_ok=True); work=out/"source"; start=time.monotonic()
    try:
        shutil.copytree(ANDROID_TEMPLATE,work,dirs_exist_ok=True,ignore=shutil.ignore_patterns(".gradle","build","*.apk"))
        assets=work/"app"/"src"/"main"/"assets"; assets.mkdir(parents=True,exist_ok=True)
        (assets/"project.json").write_text(json.dumps(cfg,ensure_ascii=False,indent=2),encoding="utf-8")
        slug=re.sub(r"[^a-z0-9_]","_",pid.lower())[:72]
        gradle=work/"app"/"build.gradle"; gradle_text=gradle.read_text(encoding="utf-8")
        gradle.write_text(gradle_text.replace("applicationId 'local.nexus.lab'",f"applicationId 'local.nexus.lab.p_{slug}'"),encoding="utf-8")
        import xml.sax.saxutils
        manifest=work/"app"/"src"/"main"/"AndroidManifest.xml"; manifest_text=manifest.read_text(encoding="utf-8")
        app_label=xml.sax.saxutils.escape(cfg["title"])
        manifest.write_text(manifest_text.replace('android:label="NEXUS LAB"',f'android:label="{app_label}"'),encoding="utf-8")
        setjob(jid,status="running",stage="préparation Android",started=now(),progress=5,log="Préparation de l'application projet…")
        env=os.environ.copy(); env["ANDROID_HOME"]=str(ANDROID_SDK); env["ANDROID_SDK_ROOT"]=str(ANDROID_SDK); env["GRADLE_USER_HOME"]=os.getenv("GRADLE_USER_HOME",str(DATA/"gradle"))
        command=[str(work/"gradlew"),"--no-daemon","--max-workers=1","assembleDebug"]
        proc=subprocess.Popen(command,cwd=work,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding="utf-8",errors="replace",shell=False)
        with lock: active[jid]=proc
        lines=[]
        for line in proc.stdout or []:
            if line.strip():
                lines=(lines+[line.rstrip()])[-220:]
                pct=15 if "download" in line.lower() else 65 if "compile" in line.lower() else 82 if "assemble" in line.lower() else 35
                setjob(jid,stage="construction APK",progress=pct,log="\n".join(lines)[-24000:])
        code=proc.wait(); elapsed=round(time.monotonic()-start,2)
        if (getjob(jid) or {}).get("status")=="canceled": return
        apk=work/"app"/"build"/"outputs"/"apk"/"debug"/"app-debug.apk"
        if code or not apk.is_file():
            setjob(jid,status="failed",stage="échec APK",finished=now(),elapsed=elapsed,log="\n".join(lines)[-24000:],error=f"Gradle code {code}; APK absente")
            add_message("Pi",f"Échec de génération APK: {cfg['title']}."); return
        saved=out/(pid+"-nexus.apk"); shutil.copy2(apk,saved); digest=sha(saved)
        setjob(jid,status="success",stage="APK prête à télécharger",finished=now(),elapsed=elapsed,progress=100,log="\n".join(lines)[-24000:],artifact=str(saved),sha256=digest)
        event("INFO","android","APK projet compilée",jid,pid,"android","success"); add_message("Pi",f"APK prête: {cfg['title']} ({elapsed:.0f} s). SHA-256 {digest[:12]}…")
    except FileNotFoundError as e: setjob(jid,status="failed",stage="outil Android absent",finished=now(),error=str(e)[:300])
    except Exception as e: setjob(jid,status="failed",stage="erreur APK",finished=now(),error=str(e)[:400]); add_message("Pi",f"Erreur APK {pid}: {str(e)[:250]}")
    finally:
        with lock: active.pop(jid,None)

class AgentHost:
    """Ce que Patricia peut demander à l'agent : files de compilation, projets, bibliothèques, flotte."""
    def __init__(self,fleet): self.fleet=fleet
    def queue_build(self,pid,board):
        if board not in BOARDS: raise ValueError("Carte non autorisée")
        if not project_dir(pid): raise ValueError("Projet introuvable sur le Pi : enregistre-le d’abord.")
        jid=uuid.uuid4().hex[:12]
        with connect() as c: c.execute("INSERT INTO jobs(id,project,board,status,priority,created,stage) VALUES(?,?,?,?,?,?,?)",(jid,pid,board,"queued",60,now(),"en attente"))
        event("INFO","build","Compilation demandée par Patricia",jid,pid,board,"queued"); wake.set(); return {"id":jid,"status":"queued"}
    def queue_apk(self,pid):
        if platform.machine().lower() not in ("x86_64","amd64"): raise ValueError("Le Pi 4 ARM64 ne peut pas exécuter les outils Android de Google : construis l’APK sur un PC avec scripts/build_project_apk.bat puis importe-la (Studio APK).")
        if not project_dir(pid): raise ValueError("Projet introuvable sur le Pi.")
        jid=uuid.uuid4().hex[:12]
        with connect() as c: c.execute("INSERT INTO jobs(id,project,board,status,priority,created,stage,kind) VALUES(?,?,?,?,?,?,?,?)",(jid,pid,"android","queued",50,now(),"en attente APK","android"))
        wake.set(); return {"id":jid,"status":"queued"}
    def user_projects(self):
        return [p.name for p in sorted(USER_PROJECTS.iterdir()) if p.is_dir() and ID.fullmatch(p.name)] if USER_PROJECTS.exists() else []
    def recent_builds(self):
        with connect() as c: return [dict(r) for r in c.execute("SELECT id,project,board,status,error,kind FROM jobs ORDER BY created DESC LIMIT 20")]
    def install_library(self,name):
        if not re.fullmatch(r"[A-Za-z0-9 _.+-]{2,80}",name or ""): raise ValueError("Nom de bibliothèque refusé")
        p=subprocess.run([CLI,"lib","install",name],capture_output=True,text=True,timeout=300,shell=False)
        if p.returncode: raise ValueError(("arduino-cli : "+(p.stderr or p.stdout))[:300])
        event("INFO","arduino","Bibliothèque installée par Patricia: "+name); return {"installed":name}

def patricia_llm_config():
    return assistant_config()

def worker_loop():
    while not stop.is_set():
        with connect() as c: row=c.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY priority DESC,created LIMIT 1").fetchone()
        if row:
            with connect() as c: changed=c.execute("UPDATE jobs SET status='claimed' WHERE id=? AND status='queued'",(row["id"],)).rowcount
            if changed: (build_android if row["kind"]=="android" else build)(dict(row))
            continue
        wake.wait(1); wake.clear()
def body_json(h):
    size=int(h.headers.get("Content-Length","0") or 0)
    if not 0<=size<=8*1024*1024: raise ValueError("Requête trop volumineuse")
    obj=json.loads((h.rfile.read(size) if size else b"{}").decode("utf-8"))
    if not isinstance(obj,dict): raise ValueError("Objet JSON attendu")
    return obj

class Api(BaseHTTPRequestHandler):
    server_version="NEXUS-Agent/1.0"
    def log_message(self,fmt,*args): print(json.dumps({"at":now(),"component":"http","client":self.client_address[0],"message":fmt%args}),flush=True)
    def sendj(self,status,obj):
        data=json.dumps(obj,ensure_ascii=False,separators=(",",":")).encode()
        self.send_response(status); self.send_header("Content-Type","application/json; charset=utf-8"); self.send_header("Content-Length",str(len(data))); self.send_header("Cache-Control","no-store"); self.send_header("X-Content-Type-Options","nosniff"); self.send_header("Access-Control-Allow-Origin","*"); self.end_headers(); self.wfile.write(data)
    def auth(self): return bool(TOKEN) and hmac.compare_digest(self.headers.get("Authorization",""),"Bearer "+TOKEN)
    def denied(self):
        if self.auth(): return False
        self.sendj(401,{"error":"Jeton du Pi requis."}); return True
    def whatsapp_challenge(self,query):
        if not WHATSAPP_VERIFY_TOKEN or query.get("hub.mode",[""])[0]!="subscribe" or not hmac.compare_digest(query.get("hub.verify_token",[""])[0],WHATSAPP_VERIFY_TOKEN):
            self.send_error(403); return
        challenge=query.get("hub.challenge",[""])[0]
        if not challenge or len(challenge)>256: self.send_error(400); return
        payload=challenge.encode("utf-8")
        self.send_response(200); self.send_header("Content-Type","text/plain; charset=utf-8"); self.send_header("Content-Length",str(len(payload))); self.send_header("Cache-Control","no-store"); self.end_headers(); self.wfile.write(payload)
    def whatsapp_webhook(self):
        if not WHATSAPP_APP_SECRET or not WHATSAPP_ALLOWLIST:
            self.sendj(503,{"error":"Webhook WhatsApp non configuré."}); return
        try: length=int(self.headers.get("Content-Length","0"))
        except ValueError: length=0
        if not 1<=length<=1024*1024: self.sendj(413,{"error":"Événement vide ou supérieur à 1 Mo."}); return
        raw=self.rfile.read(length)
        if len(raw)!=length: self.sendj(400,{"error":"Événement incomplet."}); return
        supplied=self.headers.get("X-Hub-Signature-256","")
        expected="sha256="+hmac.new(WHATSAPP_APP_SECRET.encode(),raw,hashlib.sha256).hexdigest()
        if not hmac.compare_digest(supplied,expected): self.sendj(401,{"error":"Signature Meta invalide."}); return
        try: payload=json.loads(raw)
        except (UnicodeDecodeError,json.JSONDecodeError): self.sendj(400,{"error":"JSON invalide."}); return
        if not isinstance(payload,dict) or payload.get("object")!="whatsapp_business_account": self.sendj(400,{"error":"Événement WhatsApp inattendu."}); return
        received=0
        for entry in payload.get("entry",[]) if isinstance(payload.get("entry",[]),list) else []:
            for change in entry.get("changes",[]) if isinstance(entry,dict) and isinstance(entry.get("changes",[]),list) else []:
                value=change.get("value",{}) if isinstance(change,dict) else {}
                messages=value.get("messages",[]) if isinstance(value,dict) else []
                for message in messages if isinstance(messages,list) else []:
                    if not isinstance(message,dict): continue
                    sender=re.sub(r"\D","",str(message.get("from","")))
                    msg_id=str(message.get("id",""))[:200]
                    text_value=message.get("text",{})
                    text=str(text_value.get("body","")) if isinstance(text_value,dict) else ""
                    if sender not in WHATSAPP_ALLOWLIST or not msg_id or not text.strip(): continue
                    text=text.strip()[:2000]
                    with connect() as c:
                        inserted=c.execute("INSERT OR IGNORE INTO whatsapp_events(message_id,received) VALUES(?,?)",(msg_id,now())).rowcount
                        if inserted: c.execute("INSERT INTO messages(at,sender,text) VALUES(?,?,?)",(now(),"WhatsApp · …"+sender[-4:],text))
                    if inserted:
                        event("INFO","whatsapp","message entrant authentifié",project=None,result="received")
                        received+=1
        self.sendj(200,{"ok":True,"received":received})
    def do_OPTIONS(self):
        self.send_response(204); self.send_header("Access-Control-Allow-Origin","*"); self.send_header("Access-Control-Allow-Methods","GET, POST, OPTIONS"); self.send_header("Access-Control-Allow-Headers","Authorization, Content-Type, X-Nexus-Project"); self.send_header("Content-Length","0"); self.end_headers()
    def do_GET(self):
        parsed=urlparse(self.path); path=parsed.path; q=parse_qs(parsed.query)
        if path=="/webhooks/whatsapp": self.whatsapp_challenge(q); return
        if path=="/api/v1/health":
            n=sum(1 for p in PROJECTS.iterdir() if p.is_dir()) if PROJECTS.exists() else 0
            try: shared_free=shutil.disk_usage(PROJECTS).free
            except OSError: shared_free=0
            self.sendj(200,{"ok":True,"service":"NEXUS-AGENT","version":"1.0.0","arduino_cli":shutil.which(CLI) or "absent","host_arch":platform.machine(),"project_count":n,"shared_storage":str(SHARED_ROOT),"shared_free_bytes":shared_free}); return
        if path=="/download/nexus-lab.apk":
            apk=Path(os.getenv("NEXUS_APK",str(DATA/"packages"/"nexus-lab.apk")))
            if not apk.is_file(): self.sendj(404,{"error":"APK absent du Pi"}); return
            self.send_response(200); self.send_header("Content-Type","application/vnd.android.package-archive")
            self.send_header("Content-Length",str(apk.stat().st_size)); self.send_header("Content-Disposition",'attachment; filename="nexus-lab.apk"'); self.end_headers()
            with apk.open("rb") as f: shutil.copyfileobj(f,self.wfile)
            return
        if not (path.startswith("/download/apps/") or path.startswith("/download/firmware/")) and self.denied(): return
        if ENGINE and patricia_api.handle(self,"GET",path,q,ENGINE,FLEET,body_json): return
        if path=="/api/v1/assistant/config":
            cfg=assistant_config()
            self.sendj(200,{"endpoint":cfg["endpoint"],"model":cfg["model"],"configured":bool(cfg["endpoint"] and cfg["key"]),"key_set":bool(cfg["key"])}); return
        if path=="/api/v1/storage/list":
            try: target=shared_path(q.get("path",["/sd"])[0])
            except ValueError as e: self.sendj(400,{"error":str(e)}); return
            if not target.is_dir(): self.sendj(404,{"error":"Dossier absent"}); return
            items=[]
            try:
                for child in sorted(target.iterdir(),key=lambda x:x.name.casefold())[:400]:
                    if child.is_symlink(): continue
                    try: st=child.stat()
                    except OSError: continue
                    if not (child.is_dir() or child.is_file()): continue
                    items.append({"name":child.name,"type":"d" if child.is_dir() else "f","size":st.st_size if child.is_file() else 0,"mtime":st.st_mtime})
                usage=shutil.disk_usage(SHARED_ROOT)
                self.sendj(200,{"path":q.get("path",["/sd"])[0],"admin":True,"items":items,"total":usage.total,"free":usage.free})
            except OSError as e: self.sendj(500,{"error":str(e)[:200]})
            return
        if path=="/api/v1/storage/download":
            try: target=shared_path(q.get("path",[""])[0])
            except ValueError as e: self.sendj(400,{"error":str(e)}); return
            if not target.is_file() or target.is_symlink(): self.sendj(404,{"error":"Fichier absent"}); return
            try:
                st=target.stat()
                self.send_response(200); self.send_header("Content-Type",mimetypes.guess_type(target.name)[0] or "application/octet-stream")
                self.send_header("Content-Length",str(st.st_size)); self.send_header("Content-Disposition",'attachment; filename="download"')
                self.send_header("Cache-Control","no-store"); self.send_header("Access-Control-Allow-Origin","*"); self.end_headers()
                with target.open("rb") as f: shutil.copyfileobj(f,self.wfile)
            except OSError: pass
            return
        if path=="/api/v1/firmwares":
            sql="SELECT * FROM fw WHERE 1=1"; args=[]
            if q.get("project"): sql+=" AND project=?"; args.append(q["project"][0])
            if q.get("board"): sql+=" AND board=?"; args.append(q["board"][0])
            with connect() as c: items=[dict(r) for r in c.execute(sql+" ORDER BY project,board,name LIMIT 1000",args)]
            self.sendj(200,{"items":items}); return
        if path=="/api/v1/jobs":
            with connect() as c: items=[dict(r) for r in c.execute("SELECT * FROM jobs ORDER BY created DESC LIMIT 100")]
            self.sendj(200,{"items":items}); return
        if path.startswith("/api/v1/projects/") and path.endswith("/files"):
            pid=path.split("/")[-2]; src=project_dir(pid)
            if not src: self.sendj(404,{"error":"Projet absent"}); return
            files={}
            for f in src.iterdir():
                if f.is_file() and f.suffix.lower() in (".ino",".cpp",".c",".h",".hpp",".json",".md",".txt"):
                    try: files[f.name]=f.read_text(encoding="utf-8")
                    except (OSError,UnicodeError): pass
            self.sendj(200,{"id":pid,"files":files}); return
        if path=="/api/v1/projects":
            items=[]
            for p in sorted(USER_PROJECTS.iterdir(),key=lambda x:x.name.casefold()) if USER_PROJECTS.exists() else []:
                if p.is_dir() and not p.is_symlink() and ID.fullmatch(p.name) and any(p.glob("*.ino")):
                    meta={}
                    try: meta=json.loads((p/"project.json").read_text(encoding="utf-8"))
                    except (OSError,ValueError): pass
                    items.append({"id":p.name,"title":str(meta.get("title") or p.name),"board":str(meta.get("board") or "esp32"),"updated":datetime.fromtimestamp(p.stat().st_mtime,timezone.utc).isoformat(timespec="seconds")})
            self.sendj(200,{"items":items}); return
        if path.startswith("/download/firmware/"):
            parts=path.strip("/").split("/")
            if len(parts)!=6 or not ID.fullmatch(parts[2]) or not ID.fullmatch(parts[3]): self.sendj(400,{"error":"Lien firmware invalide"}); return
            pid,jid=parts[2],parts[3]
            try: expiry=int(parts[4]); signature=parts[5].removesuffix(".bin")
            except ValueError: self.sendj(400,{"error":"Lien firmware invalide"}); return
            row=getjob(jid); digest=(row or {}).get("sha256") or ""
            message=f"{pid}:{jid}:{digest}:{expiry}".encode(); expected=hmac.new(TOKEN.encode(),message,hashlib.sha256).hexdigest()
            if not row or row.get("kind")!="esp" or row.get("project")!=pid or row.get("status")!="success" or expiry<int(time.time()) or expiry>int(time.time())+360:
                self.sendj(403,{"error":"Lien expiré ou artefact absent"}); return
            if not hmac.compare_digest(signature,expected): self.sendj(403,{"error":"Signature du lien invalide"}); return
            artifact=Path(row.get("artifact") or "")
            try:
                if not artifact.resolve().is_relative_to(FIRMWARE.resolve()) or not artifact.is_file() or sha(artifact)!=digest: raise ValueError()
            except (OSError,ValueError): self.sendj(409,{"error":"Firmware ou SHA-256 invalide"}); return
            self.send_response(200); self.send_header("Content-Type","application/octet-stream"); self.send_header("Content-Length",str(artifact.stat().st_size)); self.send_header("Cache-Control","no-store"); self.send_header("X-Content-SHA256",digest); self.end_headers()
            with artifact.open("rb") as f: shutil.copyfileobj(f,self.wfile)
            return
        if path.startswith("/api/v1/jobs/") and path.endswith("/artifact"):
            jid=path.split("/")[-2]; row=getjob(jid)
            if not row or row.get("status")!="success" or not row.get("artifact") or not row.get("sha256"):
                self.sendj(404,{"error":"Artefact non prêt"}); return
            artifact=Path(row["artifact"])
            try:
                safe=artifact.resolve().is_relative_to(BUILDS.resolve()) or artifact.resolve().is_relative_to(FIRMWARE.resolve())
                if not safe or not artifact.is_file() or sha(artifact)!=row["sha256"]: raise ValueError()
            except (OSError,ValueError): self.sendj(409,{"error":"Empreinte ou chemin de l’artefact invalide"}); return
            self.send_response(200); self.send_header("Content-Type","application/octet-stream"); self.send_header("Content-Length",str(artifact.stat().st_size)); self.send_header("Content-Disposition",f'attachment; filename="{artifact.name}"'); self.send_header("Cache-Control","no-store"); self.send_header("Access-Control-Allow-Origin","*"); self.send_header("Access-Control-Expose-Headers","X-Content-SHA256, Content-Disposition"); self.send_header("X-Content-SHA256",row["sha256"]); self.end_headers()
            with artifact.open("rb") as f: shutil.copyfileobj(f,self.wfile)
            return
        if path.startswith("/download/apps/"):
            parts=path.strip("/").split("/")
            if len(parts)!=4 or not ID.fullmatch(parts[2]) or not ID.fullmatch(parts[3][:-4] if parts[3].endswith(".apk") else ""):
                self.sendj(400,{"error":"Identifiant APK invalide"}); return
            pid,jid=parts[2],parts[3][:-4]; row=getjob(jid)
            if not row or row.get("kind")!="android" or row.get("project")!=pid or row.get("status")!="success": self.sendj(404,{"error":"APK absente"}); return
            apk=Path(row["artifact"] or "")
            try:
                if not apk.resolve().is_relative_to(APPS.resolve()) or not apk.is_file() or sha(apk)!=row["sha256"]: raise ValueError()
            except (OSError,ValueError): self.sendj(409,{"error":"APK ou empreinte invalide"}); return
            self.send_response(200); self.send_header("Content-Type","application/vnd.android.package-archive"); self.send_header("Content-Length",str(apk.stat().st_size)); self.send_header("Content-Disposition",f'attachment; filename="{pid}-nexus.apk"'); self.send_header("Cache-Control","no-store"); self.end_headers()
            with apk.open("rb") as f: shutil.copyfileobj(f,self.wfile)
            return
        if path.startswith("/api/v1/jobs/") and path.endswith("/qr"):
            jid=path.split("/")[-2]; row=getjob(jid)
            if not row or row.get("kind")!="android" or row.get("status")!="success": self.sendj(404,{"error":"APK non prête"}); return
            try:
                import qrcode
                from io import BytesIO
                url=f"http://{self.headers.get('Host','nexus-pi.local:8088')}/download/apps/{row['project']}/{jid}.apk"
                stream=BytesIO(); qrcode.make(url).save(stream,format="PNG"); data=stream.getvalue()
                self.send_response(200); self.send_header("Content-Type","image/png"); self.send_header("Content-Length",str(len(data))); self.send_header("Cache-Control","no-store"); self.send_header("Access-Control-Allow-Origin","*"); self.end_headers(); self.wfile.write(data)
            except ImportError: self.sendj(503,{"error":"Générateur QR absent: installe python3-qrcode."})
            return
        if path.startswith("/api/v1/jobs/") and path.endswith("/firmware-link"):
            jid=path.split("/")[-2]; row=getjob(jid)
            if not row or row.get("kind")!="esp" or row.get("status")!="success" or not row.get("sha256"):
                self.sendj(404,{"error":"Firmware non prêt"}); return
            expiry=int(time.time())+300; msg=f"{row['project']}:{jid}:{row['sha256']}:{expiry}".encode()
            sig=hmac.new(TOKEN.encode(),msg,hashlib.sha256).hexdigest()
            host=self.headers.get("Host","192.168.4.2:8088")
            url=f"http://{host}/download/firmware/{row['project']}/{jid}/{expiry}/{sig}.bin"
            size=Path(row["artifact"]).stat().st_size if row.get("artifact") and Path(row["artifact"]).is_file() else 0
            self.sendj(200,{"url":url,"sha256":row["sha256"],"size":size,"expires":expiry}); return
        if path.startswith("/api/v1/jobs/"):
            row=getjob(path.rsplit("/",1)[-1]); self.sendj(200 if row else 404,row or {"error":"Job absent"}); return
        if path=="/api/v1/github/worker-assets":
            repo=q.get("repo",[""])[0]
            try: self.sendj(200,{"items":github_worker_assets(repo)})
            except Exception as e: self.sendj(502,{"error":str(e)[:240]})
            return
        if path=="/api/v1/projects/search": self.sendj(200,{"items":search(q.get("q",[""])[0])}); return
        if path=="/api/v1/events":
            with connect() as c: items=[dict(r) for r in c.execute("SELECT * FROM events ORDER BY id DESC LIMIT 100")]
            self.sendj(200,{"items":items}); return
        if path=="/api/v1/messages":
            with connect() as c: items=[dict(r) for r in c.execute("SELECT * FROM messages ORDER BY id DESC LIMIT 100")]
            self.sendj(200,{"items":list(reversed(items))}); return
        self.sendj(404,{"error":"Route inconnue"})
    def do_POST(self):
        path=urlparse(self.path).path
        if path=="/webhooks/whatsapp": self.whatsapp_webhook(); return
        if self.denied(): return
        if ENGINE and patricia_api.handle(self,"POST",path,{},ENGINE,FLEET,body_json): return
        if path=="/api/v1/storage/upload":
            try: target=shared_path(parse_qs(urlparse(self.path).query).get("path",[""])[0])
            except ValueError as e: self.sendj(400,{"error":str(e)}); return
            length=int(self.headers.get("Content-Length","0") or 0)
            if not 1<=length<=16*1024*1024: self.sendj(413,{"error":"Fichier vide ou supérieur à 16 Mo"}); return
            if not target.parent.is_dir() or target.is_symlink(): self.sendj(400,{"error":"Dossier cible absent ou chemin symbolique"}); return
            tmp=target.with_name(target.name+".part."+uuid.uuid4().hex)
            remaining=length
            try:
                with tmp.open("xb") as f:
                    while remaining:
                        chunk=self.rfile.read(min(65536,remaining))
                        if not chunk: raise OSError("Transfert incomplet")
                        f.write(chunk); remaining-=len(chunk)
                tmp.replace(target)
                self.sendj(201,{"ok":True,"path":parse_qs(urlparse(self.path).query).get("path",[""])[0],"size":length,"sha256":sha(target)})
            except OSError as e:
                try: tmp.unlink(missing_ok=True)
                except OSError: pass
                self.sendj(500,{"error":"Écriture interrompue: "+str(e)[:150]})
            return
        if path=="/api/v1/android/import":
            pid=self.headers.get("X-Nexus-Project","").strip()
            length=int(self.headers.get("Content-Length","0") or 0)
            if not ID.fullmatch(pid): self.sendj(400,{"error":"Identifiant de projet invalide"}); return
            if not 1<=length<=40*1024*1024: self.sendj(413,{"error":"APK vide ou supérieure à 40 Mo"}); return
            blob=self.rfile.read(length)
            if len(blob)!=length: self.sendj(400,{"error":"Transfert APK incomplet"}); return
            try:
                with zipfile.ZipFile(BytesIO(blob)) as apkzip:
                    names=set(apkzip.namelist())
                    if "AndroidManifest.xml" not in names or not any(re.fullmatch(r"classes(?:[0-9]+)?\.dex",n) for n in names): raise ValueError("Le fichier n’est pas une APK Android complète")
                    if apkzip.testzip() is not None: raise ValueError("Archive APK endommagée")
            except (zipfile.BadZipFile,ValueError) as e: self.sendj(400,{"error":str(e) or "APK invalide"}); return
            jid=uuid.uuid4().hex[:12]; artifact=APPS/pid/jid/(pid+"-nexus.apk"); artifact.parent.mkdir(parents=True,exist_ok=True); artifact.write_bytes(blob); digest=sha(artifact)
            with connect() as c: c.execute("INSERT INTO jobs(id,project,board,status,priority,created,started,finished,elapsed,stage,progress,log,artifact,sha256,error,kind) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(jid,pid,"android","success",50,now(),now(),now(),0,"APK importée et vérifiée",100,"APK créée sur un hôte externe; ZIP/manifest/dex vérifiés",str(artifact),digest,None,"android"))
            event("INFO","android","APK de projet importée et vérifiée",jid,pid,"android","success"); add_message("Atelier",f"APK de projet importée: {pid} · SHA-256 {digest[:12]}…")
            self.sendj(201,{"id":jid,"project":pid,"status":"success","sha256":digest,"size":len(blob)}); return
        try: b=body_json(self)
        except (ValueError,UnicodeDecodeError,json.JSONDecodeError) as e: self.sendj(400,{"error":str(e)}); return
        if path=="/api/v1/storage/action":
            action=str(b.get("action",""))
            try:
                target=shared_path(str(b.get("path","")))
                dest=shared_path(str(b.get("to",""))) if action=="rename" else None
                protected={"/sd","/sd/PROJECTS","/sd/PROJECTS/LIBRARY","/sd/FIRMWARE","/sd/LOGS","/sd/REPORTS","/sd/CONFIG","/sd/INBOX"}
                if action not in ("mkdir","delete","rename"): raise ValueError("Action inconnue")
                if action=="delete" and str(b.get("path","")) in protected: raise ValueError("Dossier système protégé")
                if action=="mkdir": target.mkdir()
                elif action=="delete": target.rmdir() if target.is_dir() else target.unlink()
                else:
                    if dest is None or dest.exists(): raise ValueError("Destination invalide ou déjà présente")
                    target.rename(dest)
                self.sendj(200,{"ok":True}); return
            except FileNotFoundError: self.sendj(404,{"error":"Fichier ou dossier absent"}); return
            except FileExistsError: self.sendj(409,{"error":"La destination existe déjà"}); return
            except OSError as e: self.sendj(409 if getattr(e,"errno",0)==39 else 500,{"error":"Action impossible: "+str(e)[:160]}); return
            except ValueError as e: self.sendj(400,{"error":str(e)}); return
        if path=="/api/v1/messages":
            message=str(b.get("text","")).strip()
            if not message or len(message)>2000: self.sendj(400,{"error":"Le message doit contenir de 1 à 2000 caractères."}); return
            add_message("Atelier",message); self.sendj(201,{"ok":True}); return
        if path=="/api/v1/index/refresh": self.sendj(200,index_fw()); return
        if path=="/api/v1/assistant/project": self.sendj(200,plan(b)); return
        if path=="/api/v1/assistant/config":
            cfg=save_assistant_config(b)
            self.sendj(200,cfg); return
        if path=="/api/v1/assistant/chat":
            q=str(b.get("q","")).strip()[:4000]
            if not q: self.sendj(400,{"error":"Question vide"}); return
            add_message("Atelier",q)
            cfg=assistant_config()
            if not cfg["endpoint"] or not cfg["key"]:
                matches=search(q,5)
                answer="Aucun fournisseur IA configuré. Je peux rechercher dans le catalogue local."
                add_message("Assistant",answer)
                self.sendj(200,{"mode":"local","answer":answer,"recommendations":matches}); return
            messages=[{"role":"system","content":"Assistant technique ESP32 en français. Aide à choisir capteurs, cartes, câblage et code. Distingue propositions et actions réalisées. Ne déclenche jamais de commande matérielle, de flash ou de redémarrage. Pose une question courte à choix si le besoin est ambigu. Conserve le contexte récent du projet."}]
            messages.extend(assistant_history(13))
            messages[-1]["content"] += "\\nCatalogue correspondant: "+json.dumps(search(q,5),ensure_ascii=False)
            payload=json.dumps({"model":cfg["model"],"messages":messages},ensure_ascii=False).encode()
            req=urllib.request.Request(cfg["endpoint"],data=payload,headers={"Content-Type":"application/json","Authorization":"Bearer "+cfg["key"]},method="POST")
            try:
                with urllib.request.urlopen(req,timeout=45) as r: data=json.loads(r.read(256000).decode())
                answer=str(data["choices"][0]["message"]["content"])[:6000]
                add_message("Assistant",answer)
                self.sendj(200,{"mode":"online","answer":answer,"recommendations":search(q,5)})
            except Exception:
                answer="Le fournisseur IA ne répond pas. L’historique reste enregistré; réessaie ou continue avec l’aide locale."
                add_message("Assistant",answer)
                self.sendj(502,{"mode":"error","error":answer,"recommendations":search(q,5)})
            return
        if path=="/api/v1/firmware/import-github":
            try:
                result=import_github_firmware(str(b.get("repo","")),str(b.get("tag","")),str(b.get("name","")),str(b.get("url","")),str(b.get("board","esp32")).lower(),str(b.get("sha256","")))
                self.sendj(201,result)
            except Exception as e: self.sendj(400,{"error":str(e)[:240]})
            return
        if path=="/api/v1/projects/save":
            pid=str(b.get("project_id",""))
            try: saved=sync_user_project(pid,b.get("files"))
            except (ValueError,OSError) as e: self.sendj(400,{"error":str(e)[:240]}); return
            self.sendj(201,{"ok":True,"id":pid,"path":str(saved)}); return
        if path=="/api/v1/build":
            pid,board=str(b.get("project_id","")),str(b.get("board","esp32")).lower()
            if board not in BOARDS: self.sendj(400,{"error":"Carte non autorisée"}); return
            if "files" in b:
                try: sync_user_project(pid,b["files"])
                except (ValueError,OSError) as e: self.sendj(400,{"error":str(e)[:240]}); return
            if not project_dir(pid): self.sendj(404,{"error":"Projet inconnu. Synchronise les sources depuis le MASTER."}); return
            try: priority=max(0,min(100,int(b.get("priority",50))))
            except (ValueError,TypeError): self.sendj(400,{"error":"Priorité invalide"}); return
            jid=uuid.uuid4().hex[:12]
            with connect() as c: c.execute("INSERT INTO jobs(id,project,board,status,priority,created,stage) VALUES(?,?,?,?,?,?,?)",(jid,pid,board,"queued",priority,now(),"en attente"))
            event("INFO","build","Compilation en file",jid,pid,board,"queued"); wake.set(); self.sendj(202,{"id":jid,"status":"queued"}); return
        if path=="/api/v1/android/build":
            if platform.machine().lower() not in ("x86_64","amd64"):
                self.sendj(501,{"error":"La génération Gradle Android n'est pas disponible sur cette architecture Pi ARM64. Le Pi peut compiler les firmwares ESP32; utilise un hôte Android Linux x86_64 pour cette APK."}); return
            pid=str(b.get("project_id",""))
            if "files" in b:
                try: sync_user_project(pid,b["files"])
                except (ValueError,OSError) as e: self.sendj(400,{"error":str(e)[:240]}); return
            if not ID.fullmatch(pid) or not project_dir(pid): self.sendj(404,{"error":"Projet introuvable sur le Pi. Synchronise d’abord ses sources."}); return
            jid=uuid.uuid4().hex[:12]
            with connect() as c: c.execute("INSERT INTO jobs(id,project,board,status,priority,created,stage,kind) VALUES(?,?,?,?,?,?,?,?)",(jid,pid,"android","queued",50,now(),"en attente APK","android"))
            event("INFO","android","Génération APK en file",jid,pid,"android","queued"); add_message("Atelier",f"Demande de génération APK: {pid}"); wake.set(); self.sendj(202,{"id":jid,"status":"queued"}); return
        if path.startswith("/api/v1/jobs/") and path.endswith("/cancel"):
            jid=path.split("/")[-2]; row=getjob(jid)
            if not row or row["status"] not in ("queued","running"): self.sendj(409,{"error":"Job non annulable"}); return
            with lock:
                p=active.get(jid)
                if p and p.poll() is None: p.terminate()
            setjob(jid,status="canceled",stage="annulé",finished=now(),error="Annulé par l’administrateur"); self.sendj(200,{"ok":True}); return
        self.sendj(404,{"error":"Route inconnue"})

def main():
    if len(TOKEN)<32: raise SystemExit("NEXUS_TOKEN absent/trop court : configure un jeton aléatoire de 32 caractères.")
    for p in (DATA,PROJECTS,USER_PROJECTS,FIRMWARE,BUILDS,APPS,DB.parent): p.mkdir(parents=True,exist_ok=True)
    init(); index_fw()
    global ENGINE,FLEET
    FLEET=FleetService(FLEET_KEY,Arena(float(os.getenv("NEXUS_ARENA_W","4")),float(os.getenv("NEXUS_ARENA_H","4")),float(os.getenv("NEXUS_ARENA_CELL","0.5"))))
    FLEET.start()
    ENGINE=Engine(Memory(PATRICIA_DB),Knowledge(CATALOG),AgentHost(FLEET),patricia_llm_config)
    def backup_loop():
        while not stop.is_set():
            try: ENGINE.mem.backup(SHARED_ROOT/"BACKUPS"/"PATRICIA")
            except (OSError,sqlite3.Error) as e: print(json.dumps({"at":now(),"component":"patricia","message":"sauvegarde impossible: "+str(e)[:200]}),flush=True)
            stop.wait(86400)
    threading.Thread(target=backup_loop,name="patricia-backup",daemon=True).start()
    print("Patricia prête ; pilotage:", "actif" if FLEET.transport else FLEET.error,flush=True)
    for i in range(BUILD_WORKERS): threading.Thread(target=worker_loop,name=f"nexus-builder-{i+1}",daemon=True).start()
    server=ThreadingHTTPServer(("0.0.0.0",PORT),Api); print("NEXUS-AGENT sur le port",PORT,"; workers de compilation:",BUILD_WORKERS,flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally:
        if FLEET: FLEET.stop()
        stop.set(); wake.set(); server.shutdown(); server.server_close()
        with lock:
            for p in active.values():
                if p.poll() is None: p.terminate()
if __name__=="__main__": main()
