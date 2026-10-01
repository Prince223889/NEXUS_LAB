#!/usr/bin/env python3
"""ESP32 LAB — vérification de cohérence du dépôt (aucune dépendance, Node.js requis pour le catalogue).

    python scripts/verify.py

Contrôles réels :
  1. versions identiques (MASTER, worker, catalogue, composant IDF) ;
  2. identifiants Wi-Fi et ports identiques entre MASTER et worker ;
  3. types de job de l'interface acceptés par le MASTER et le worker ;
  4. chaque route /api appelée par l'interface existe dans le firmware ;
  5. ressources web embarquées (CMake) ⇔ symboles utilisés par web_server.c ;
  6. syntaxe JavaScript de l'interface et du catalogue (node --check) ;
  7. catalogue : identifiants uniques, bibliothèques connues, génération de TOUS les projets
     sur toutes les cartes compatibles sans exception, setup()/loop() présents, broches valides ;
  8. aucun secret réel dans les fichiers d'exemple ;
  9. banc fantôme : broches du connecteur identiques (worker ⇔ générateur), routes /api/emu et /api/bench,
     descripteurs emu/obs cohérents avec les modules, autotest de l'oracle (scripts/bench_selftest.js).
Code de sortie 0 si tout est correct."""
from __future__ import annotations

import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
MASTER = ROOT / "firmware" / "master"
WORKER = ROOT / "firmware" / "worker"
WWW = MASTER / "www"
errors: list[str] = []
passed = 0


def check(cond: bool, msg: str) -> None:
    global passed
    if cond:
        passed += 1
    else:
        errors.append(msg)


def read(p: pathlib.Path) -> str:
    return p.read_text(encoding="utf-8")


def define(text: str, name: str) -> str | None:
    m = re.search(rf'#define\s+{name}\s+"?([^"\s]+)"?', text)
    return m.group(1) if m else None


def main() -> int:
    lab_h = read(MASTER / "main" / "lab_config.h")
    wcfg = read(WORKER / "config.h")
    gen = read(ROOT / "catalog" / "src" / "10_generator.js")

    # 1. versions
    v_master = define(lab_h, "LAB_VERSION")
    v_worker = define(wcfg, "LAB_VERSION")
    v_cat = re.search(r"LAB\.VERSION\s*=\s*'([^']+)'", gen).group(1)
    v_comp = re.search(r'^version:\s*"?([0-9.]+)', read(MASTER / "main" / "idf_component.yml"), re.M).group(1)
    v_txt = read(MASTER / "version.txt").strip()
    check(len({v_master, v_worker, v_cat, v_comp, v_txt}) == 1, f"versions différentes : master={v_master} worker={v_worker} catalogue={v_cat} composant={v_comp} version.txt={v_txt}")

    # 2. réseau
    check(define(lab_h, "DEFAULT_AP_SSID") == define(wcfg, "LAB_AP_SSID"), "SSID par défaut différent entre MASTER et worker")
    ap_m = re.search(r'DEFAULT_AP_PASSWORD\s+"([^"]+)"', lab_h).group(1)
    ap_w = re.search(r'LAB_AP_PASSWORD\s+"([^"]+)"', wcfg).group(1)
    check(ap_m == ap_w, "mot de passe Wi-Fi par défaut différent entre MASTER et worker")
    check(define(lab_h, "DISCOVERY_PORT") == define(wcfg, "DISCOVERY_PORT"), "port de découverte différent")
    check("4213" in lab_h and "4213" in gen, "port des mesures (4213) incohérent entre MASTER et générateur")

    # 3. types de job
    ui = read(WWW / "src" / "20_live.js")
    ui_jobs = set(re.findall(r"\{ id: '([A-Z_]+)', name:", ui))
    job_c = read(MASTER / "main" / "job_engine.c")
    worker_ino = read(WORKER / "worker.ino")
    for j in sorted(ui_jobs):
        check(f'"{j}"' in job_c, f"type de job {j} inconnu du MASTER (job_engine.c)")
        check(f'"{j}"' in worker_ino, f"type de job {j} non traité par le worker")

    # 4. routes
    api_c = read(MASTER / "main" / "web_api.c") + read(MASTER / "main" / "web_server.c")
    routes = set(re.findall(r'\.uri = "(/api/[^"]+)"', api_c)) | set(re.findall(r'REG\("(/api/[^"]+)"', api_c))
    ui_all = "\n".join(read(p) for p in sorted((WWW / "src").glob("*.js")) if p.name not in ("90_demo.js", "36_companion.js"))
    used = set(re.findall(r"['`](/api/[a-z0-9/_-]+)", ui_all))
    # Les routes /api/v1/… appartiennent à l'agent du Raspberry Pi (pi/nexus_agent.py, pi/patricia/api.py),
    # pas au MASTER : elles sont vérifiées à part, contre le code du Pi.
    pi_used = {u for u in used if u.startswith("/api/v1/")}
    used -= pi_used
    pi_src = read(ROOT / "pi" / "nexus_agent.py") + read(ROOT / "pi" / "patricia" / "api.py") + read(ROOT / "pi" / "appstudio" / "api.py")
    for u in sorted(pi_used):
        check(u.rstrip("/") in pi_src, f"l'interface appelle {u} qui n'existe pas dans l'agent du Pi")
    for u in sorted(used):
        ok = u in routes or any(r.endswith("/*") and u.startswith(r[:-1]) for r in routes)
        check(ok, f"l'interface appelle {u} qui n'existe pas dans le firmware")

    # 5. ressources embarquées
    cm = read(MASTER / "main" / "CMakeLists.txt")
    ws = read(MASTER / "main" / "web_server.c")
    assets = re.search(r"foreach\(asset ([^)]+)\)", cm).group(1).split()
    for a in assets:
        sym = "_binary_" + re.sub(r"[^A-Za-z0-9]", "_", a) + "_gz_start"
        check(sym in ws, f"ressource {a} embarquée mais jamais servie ({sym})")
        if a != "app.js":
            check((WWW / a).exists(), f"ressource web manquante : www/{a}")
    for sym in re.findall(r'asm\("(_binary_[a-z_]+_gz_start)"\)', ws):
        name = sym[len("_binary_"):-len("_gz_start")]
        check(any(re.sub(r"[^A-Za-z0-9]", "_", a) == name for a in assets), f"{sym} utilisé mais non embarqué par CMake")

    node = shutil.which("node")
    if not node:
        errors.append("Node.js introuvable : contrôles JavaScript et catalogue ignorés")
    else:
        # 6. syntaxe
        with tempfile.TemporaryDirectory() as td:
            app = pathlib.Path(td) / "app.js"
            subprocess.run([sys.executable, str(MASTER / "tools" / "bundle_www.py"), str(WWW / "src"), str(app)], check=True)
            for f in [app] + sorted((ROOT / "catalog" / "src").glob("*.js")) + [ROOT / "catalog" / "build.js"]:
                r = subprocess.run([node, "--check", str(f)], capture_output=True, text=True)
                check(r.returncode == 0, f"erreur de syntaxe JavaScript dans {f.name} : {r.stderr.strip()[:300]}")

        # 7. catalogue
        script = r"""
const fs = require('fs'), path = require('path');
const dir = process.argv[1];
for (const f of fs.readdirSync(path.join(dir, 'src')).sort()) new Function(fs.readFileSync(path.join(dir, 'src', f), 'utf8')).call(globalThis);
const LAB = globalThis.LAB, out = { errors: [], generated: 0, modules: LAB.MODULES.length, recipes: LAB.RECIPES.length };
const ids = new Set();
const cls = JSON.parse(fs.readFileSync(path.join(dir, 'classics', 'classics.json'), 'utf8'));
[...LAB.MODULES.map((m) => m.id), ...LAB.RECIPES.map((r) => r.id), ...cls.map((c) => c.id)].forEach((id) => { if (ids.has(id)) out.errors.push('identifiant en double : ' + id); ids.add(id); });
cls.forEach((c) => { (c.libs || []).forEach((k) => { if (!LAB.LIBS[k]) out.errors.push(`classique ${c.id} : bibliothèque inconnue ${k}`); }); if (!fs.existsSync(path.join(dir, 'classics', c.id + '.ino'))) out.errors.push('fichier manquant : classics/' + c.id + '.ino'); });
LAB.MODULES.forEach((m) => (m.libs || []).forEach((l) => { if (!l || !l.name || !l.ver) out.errors.push(`module ${m.id} : bibliothèque mal définie`); }));
const specs = LAB.MODULES.map((m) => ({ id: m.id, boards: m.boards || ['esp32', 'esp32s3', 'esp32c3'], spec: { title: m.name, modules: [{ id: m.id }] } }))
  .concat(LAB.RECIPES.map((r) => ({ id: r.id, boards: r.boards || ['esp32', 'esp32s3'], spec: { title: r.title, modules: r.modules, rules: r.rules || [], options: r.options || {} } })));
for (const s of specs) for (const b of s.boards) {
  try {
    const res = LAB.generate(Object.assign({}, s.spec, { board: b }));
    out.generated++;
    if (!/void setup\(\)/.test(res.code) || !/void loop\(\)/.test(res.code)) out.errors.push(`${s.id}/${b} : setup() ou loop() absent`);
    if (/\{\{[A-Z_]+(:[a-z_0-9]+)?\}\}|(^|[^\w"])\$[a-z_]+\w*/m.test(res.code.replace(/"(\\.|[^"\\\n])*"/g, '""').replace(/\/\/.*$/gm, ''))) out.errors.push(`${s.id}/${b} : marqueur non remplacé dans le code`);
    const B = LAB.BOARDS[b];
    res.wiring.forEach((w) => { if (w.gpio >= 0 && B.reserved[w.gpio]) out.errors.push(`${s.id}/${b} : broche réservée GPIO${w.gpio} (${B.reserved[w.gpio]})`); });
    const seen = {};
    res.wiring.forEach((w) => { if (w.gpio >= 0 && ![B.i2c.sda, B.i2c.scl, B.spi.sck, B.spi.miso, B.spi.mosi].includes(w.gpio)) { const k = w.gpio; if (seen[k] && seen[k] !== w.mod) out.errors.push(`${s.id}/${b} : GPIO${k} partagée par ${seen[k]} et ${w.mod}`); seen[k] = w.mod; } });
  } catch (e) { out.errors.push(`${s.id}/${b} : ${e.message}`); }
}
console.log(JSON.stringify(out));
"""
        r = subprocess.run([node, "-e", script, str(ROOT / "catalog")], capture_output=True, text=True)
        if r.returncode != 0:
            errors.append("échec du contrôle du catalogue : " + r.stderr.strip()[:400])
        else:
            res = json.loads(r.stdout)
            for e in res["errors"]:
                errors.append("catalogue : " + e)
            check(res["modules"] >= 200, f"moins de 200 modules ({res['modules']})")
            passed_gen = res["generated"]
            print(f"Catalogue : {res['modules']} modules, {res['recipes']} projets complets, {passed_gen} programmes générés sans exception")

        # 9. banc fantôme
        bench_js = read(ROOT / "catalog" / "src" / "12_bench.js")
        esp32_cfg = re.search(r"#if CONFIG_IDF_TARGET_ESP32\n(.*?)#elif", wcfg, re.S)
        for key, js in (("DAC", "dac"), ("DOUT", "dout"), ("DIN", "din")):
            c_pins = re.search(rf"BENCH_{key}_PINS\s*\{{([^}}]*)\}}", esp32_cfg.group(1) if esp32_cfg else "")
            j_pins = re.search(rf"\b{js}: \[([^\]]*)\]", bench_js)
            norm = lambda s: [int(x) for x in re.findall(r"-?\d+", s or "")]
            check(bool(c_pins and j_pins) and norm(c_pins.group(1)) == norm(j_pins.group(1)),
                  f"broches de banc {key} différentes entre firmware/worker/config.h et catalog/src/12_bench.js")
        for route in ("/api/emu/setup", "/api/emu/set", "/api/emu/read", "/api/emu/stop"):
            check(f'"{route}"' in worker_ino, f"route {route} absente du worker")
            check(f'"{route}"' in read(MASTER / "main" / "bench.c"), f"route {route} jamais appelée par bench.c")
        api_md = read(ROOT / "docs" / "API.md")
        for route in sorted(r for r in routes if r.startswith("/api/bench/") or r.startswith("/api/netmon")):
            check(route in api_md, f"route {route} non documentée dans docs/API.md")
        # Flash par câble + montages + GitHub OTA
        check('"usb_flash.c"' in cm, "usb_flash.c absent de CMakeLists.txt")
        check("github_repo" in read(MASTER / "main" / "lab_config.c") and "github_repo" in read(MASTER / "main" / "web_api.c"),
              "champ github_repo non cable (lab_config.c / web_api.c)")
        check("check_github" in read(MASTER / "main" / "ota_manager.c"), "mise a jour GitHub absente d'ota_manager.c")
        check("worker_flash_remote" in read(MASTER / "main" / "worker_pool.c") and "/api/worker/flash/remote" in read(MASTER / "main" / "web_api.c"), "OTA worker sans microSD S3 via lien temporaire Pi absente")
        check("192.168.4." in read(MASTER / "main" / "web_api.c"), "la commande de flash distante ne limite pas le lien au réseau ESP32-LAB")
        check('strcmp(mode, "firmware")' in read(MASTER / "main" / "web_api.c"), "la route OTA distante ne distingue pas le firmware worker du mode projet")
        check("/api/v1/android/import" in read(ROOT / "pi" / "nexus_agent.py") and "pi-apk-upload" in read(MASTER / "www" / "src" / "36_companion.js"), "le transfert de l’APK Windows vers le Pi avec QR manque")
        check("import-github" in read(MASTER / "www" / "src" / "36_companion.js") and "flashRemoteArtifact(el,data.id,data.sha256,board,'firmware'" in read(MASTER / "www" / "src" / "36_companion.js"), "l’OTA worker depuis GitHub via le Pi/S3 manque")
        check("LAB.montageSvg" in read(ROOT / "catalog" / "src" / "14_montage.js"), "generateur de montage absent")
        check((ROOT / "scripts" / "compile_all.py").exists() and (ROOT / "scripts" / "compile_all.bat").exists(), "script compile_all absent")
        # Wireshark du Labo : module compilé + capture branchée dans les récepteurs UDP
        check('"netmon.c"' in cm, "netmon.c absent de CMakeLists.txt")
        check("netmon_record" in read(MASTER / "main" / "telemetry.c") and "netmon_record" in read(MASTER / "main" / "worker_pool.c"),
              "capture netmon non branchée dans telemetry.c / worker_pool.c")
        for stale in ("catalog.js", "10_generator.js", "00_boards.js"):
            check(not (WWW / "src" / stale).exists(), f"www/src/{stale} : copie du catalogue concaténée dans app.js (elle écrase www/catalog.js)")
        r = subprocess.run([node, "-e", r"""
const fs = require('fs'), path = require('path');
const dir = process.argv[1];
for (const f of fs.readdirSync(path.join(dir, 'src')).sort()) new Function(fs.readFileSync(path.join(dir, 'src', f), 'utf8')).call(globalThis);
const bad = [];
LAB.MODULES.forEach((m) => [m.emu, m.obs].forEach((d) => {
  if (!d || d.kind === 'i2c') return;
  if (!(m.pins || []).some((p) => p.role === d.pin)) bad.push(`${m.id} : broche ${d.pin} inconnue du module`);
  if (d.out && !(m.outs || []).some((o) => o.k === d.out)) bad.push(`${m.id} : mesure ${d.out} inconnue du module`);
}));
console.log(JSON.stringify(bad));
""", str(ROOT / "catalog")], capture_output=True, text=True)
        for e in (json.loads(r.stdout) if r.returncode == 0 else ["exécution impossible : " + r.stderr.strip()[:300]]):
            errors.append("banc fantôme : " + e)
        r = subprocess.run([node, str(ROOT / "scripts" / "bench_selftest.js")], capture_output=True, text=True)
        check(r.returncode == 0, "autotest du banc fantôme en échec : " + (r.stdout.strip().splitlines() or [""])[-1] + r.stderr.strip()[:300])
        if r.returncode == 0:
            print("Banc fantôme : " + r.stdout.strip().splitlines()[-1])

    # 10. Patricia et flotte de véhicules
    pat = ROOT / "pi" / "patricia"
    for mod in ("memory", "diagnose", "intents", "knowledge", "llm", "engine", "fleet", "fleet_net", "voice", "api"):
        check((pat / f"{mod}.py").exists(), f"pi/patricia/{mod}.py manquant")
    agent = read(ROOT / "pi" / "nexus_agent.py")
    check("patricia_api.handle" in agent, "les routes de Patricia ne sont pas branchées dans nexus_agent.py")
    check("patricia" in read(ROOT / "pi" / "install.sh"), "pi/install.sh n'installe pas le paquet patricia")
    veh = read(ROOT / "firmware" / "vehicle" / "vehicle.ino")
    vcfg = read(ROOT / "firmware" / "vehicle" / "config.h")
    fnet = read(pat / "fleet_net.py")
    check(re.search(r"CMD_PORT = (\d+)", fnet).group(1) in veh and re.search(r"TELEMETRY_PORT = (\d+)", fnet).group(1) in veh,
          "ports UDP du protocole NXV1 différents entre fleet_net.py et vehicle.ino")
    for cmd in ("GOTO", "DRIVE", "STOP", "SETPOSE"):
        check(f'"{cmd}"' in fnet and f'"{cmd}"' in veh, f"commande NXV1 {cmd} absente d'un côté")
    check(re.search(r'LAB_AP_PASSWORD\s+"([^"]+)"', vcfg).group(1) == ap_w, "mot de passe Wi-Fi du firmware véhicule différent du worker")
    check("MAX_LEASE_MS" in veh and "bail_expire" in veh, "le firmware véhicule n'arrête plus les moteurs à l'expiration du bail")
    check("OBSTACLE_STOP_MM" in veh, "le firmware véhicule n'a plus d'arrêt sur obstacle")
    # 11. Studio APK : fabrique sans compilation, lecteur partagé, écran du MASTER
    aps = ROOT / "pi" / "appstudio"
    for mod in ("axml", "apksign", "forge", "api"):
        check((aps / f"{mod}.py").exists(), f"pi/appstudio/{mod}.py manquant")
    check("appstudio_api.handle(" in agent and "appstudio_api.handle_public(" in agent, "les routes du Studio APK ne sont pas branchées dans nexus_agent.py")
    inst = read(ROOT / "pi" / "install.sh")
    check("pi/appstudio" in inst and "assets/player" in inst, "pi/install.sh n'installe pas le Studio APK et son lecteur")
    runtime = WWW / "src" / "57_appruntime.js"
    player = ROOT / "mobile" / "app" / "src" / "main" / "assets" / "player"
    check(runtime.exists() and (player / "runtime.js").exists() and runtime.read_bytes() == (player / "runtime.js").read_bytes(),
          "le moteur d'application de l'APK diffère de l'aperçu : lance python3 scripts/sync_app_runtime.py")
    check('src="runtime.js"' in read(player / "index.html") and 'src="app.js"' in read(player / "index.html"), "lecteur de l'APK incomplet")
    java = read(ROOT / "mobile" / "app" / "src" / "main" / "java" / "local" / "nexus" / "lab" / "MainActivity.java")
    check('hasAsset("player/app.js")' in java and "window.__nexusHttp" in java, "l'APK NEXUS ne sait plus lancer une application du Studio APK")
    check(re.search(r"versionName '1\.(\d+)", read(ROOT / "mobile" / "app" / "build.gradle")) and
          int(re.search(r"versionName '1\.(\d+)", read(ROOT / "mobile" / "app" / "build.gradle")).group(1)) >= 2,
          "l'APK NEXUS doit être en version 1.2 ou plus (lecteur du Studio APK)")
    check("targetSdk 28" in read(ROOT / "mobile" / "app" / "build.gradle"),
          "targetSdk a changé : vérifie que la signature v1 du Pi reste acceptée (v2 obligatoire dès targetSdk 30)")
    forge_src = read(aps / "forge.py")
    rt_src = read(runtime)
    for comp in re.findall(r'"([a-z_]+)"', re.search(r"COMPONENTS = \{([^}]+)\}", forge_src).group(1)):
        check(f"{comp}: {{" in rt_src or f"'{comp}'" in rt_src, f"composant {comp} accepté par le Pi mais absent du moteur")
    r = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", str(ROOT / "pi" / "tests")], capture_output=True, text=True, cwd=ROOT)
    tail = (r.stderr.strip().splitlines() or [""])
    check(r.returncode == 0, "tests de Patricia en échec : " + " | ".join(l for l in tail if "FAIL" in l or "Error" in l)[:400])
    if r.returncode == 0:
        print("Patricia et Studio APK : " + next((l for l in tail if l.startswith("Ran ")), "tests OK"))

    # 12. Variables liées aux capteurs, pilotage par application, montage avant flash, ligne de commande
    st_src = read(WWW / "src" / "35_studio.js")
    check("data-var-add" in st_src and "'st-apk'" in st_src and "LAB.montageSvg(res" in st_src, "Studio : variables, onglet Montage ou passage au Studio APK manquant")
    check("function addControls" in read(WWW / "src" / "58_apkstudio.js"), "Studio APK : commandes des actionneurs (/set) absentes")
    check("montageFor(p, board)" in read(WWW / "src" / "55_patricia.js"), "Patricia ne montre plus le montage avant de flasher")
    cli = ROOT / "scripts" / "nexus.py"
    r = subprocess.run([sys.executable, str(cli), "--help"], capture_output=True, text=True)
    check(r.returncode == 0 and "generate" in r.stdout, "scripts/nexus.py --help en échec")
    node = shutil.which("node")
    if node:
        with tempfile.TemporaryDirectory(prefix="nexus-gen-") as d:
            spec = pathlib.Path(d) / "spec.json"
            spec.write_text(json.dumps({"title": "Serre test", "modules": [{"id": "dht22"}, {"id": "led"}, {"id": "servo_sg90"}],
                                        "vars": [{"name": "temp", "from": {"m": 0, "out": "temp"}}, {"name": "temp F", "from": {"m": 0, "out": "temp"}, "k": 1.8, "b": 32},
                                                 {"name": "consigne", "init": 24, "app": True}, {"name": "absente", "from": {"m": 0, "out": "rien"}}],
                                        "rules": [{"if": {"var": "temp", "op": ">", "vv": "consigne", "hyst": 0.5}, "then": {"m": 1, "act": "on"}, "else": {"m": 1, "act": "off"}},
                                                  {"if": {"var": "inconnue", "op": ">", "v": 1}, "then": {"m": 1, "act": "on"}}],
                                        "options": {"app": True, "master": True}}), encoding="utf-8")
            r = subprocess.run([sys.executable, str(cli), "generate", str(spec), "--out", str(pathlib.Path(d) / "out")], capture_output=True, text=True)
            ino = pathlib.Path(d) / "out" / "serre_test.ino"
            check(r.returncode == 0 and ino.exists(), "nexus.py generate en échec : " + r.stderr.strip()[:300])
            if ino.exists():
                code = ino.read_text(encoding="utf-8")
                loop = code[code.index("void loop()"):]
                for frag, why in (("v_temp > v_consigne", "règle sur variable avec seuil variable"), ("v_temp < (v_consigne - 0.5f)", "hystérésis sur seuil variable"),
                                  ("v_temp_f = m1_temp * 1.8f + 32.0f", "conversion d'une variable liée"), ('lab_web.on("/set", lab_web_set)', "route /set"),
                                  ('if (k == "led")', "commande de la LED"), ('else if (k == "servo")', "consigne du servo"), ('else if (k == "var_consigne") { v_consigne = a.toFloat();', "variable réglable"),
                                  ('"Access-Control-Allow-Origin", "*"', "CORS pour l'appli web"), ('"vars\\":{', "variables dans /api"), ("lab_vars();", "mise à jour des variables")):
                    check(frag in code, f"générateur : {why} absent(e) ({frag})")
                check("m2_toggle();" not in loop and "m3_set(v);" not in loop, "générateur : un actionneur piloté par l'application garde son programme de démonstration")
                check(code.index("lab_vars();", code.index("void loop()")) < code.index("lab_rules();", code.index("void loop()")), "générateur : les variables doivent être mises à jour avant les règles")
                md = (pathlib.Path(d) / "out" / "MONTAGE.md").read_text(encoding="utf-8")
                check("mesure introuvable" in md and "Règle 2 ignorée : variable introuvable" in md, "générateur : variables ou règles invalides non signalées")
                check((pathlib.Path(d) / "out" / "montage.svg").exists(), "nexus.py generate ne produit pas le schéma de montage")

    # 13. Flash en un clic, mode sans Pi, réparation
    fp = read(WWW / "src" / "47_flashpipe.js")
    check("A.flashPipeline" in fp and "/api/v1/build/estimate" in fp and "/api/worker/flash/remote" in fp and "'/api/worker/flash'" in fp,
          "flash en un clic incomplet (estimation, OTA via le Pi ou depuis la microSD du S3)")
    check("A.localVerdict" in fp, "pas de vérification du moniteur sans le Pi")
    check("data-act=\"st-flash\"" in st_src and "data-pa=\"ota\"" in read(WWW / "src" / "30_library.js"), "bouton Flasher absent du Studio ou de la Bibliothèque")
    check('path=="/api/v1/build/estimate"' in agent, "route d'estimation de compilation absente de l'agent Pi")
    check("context.feeds" in read(WWW / "src" / "55_patricia.js") and "_h_sensors" in read(ROOT / "pi" / "patricia" / "engine.py"), "Patricia ne lit plus les mesures des workers")
    r = subprocess.run([sys.executable, str(ROOT / "scripts" / "repair.py"), "--check"], capture_output=True, text=True, cwd=ROOT)
    check(r.returncode == 0, "scripts/repair.py --check signale des fichiers à régénérer : " + r.stdout.strip()[:300])

    # 8. secrets
    for p in list((ROOT / "CONFIG").glob("*.json")) + list((ROOT / "SD_CARD").rglob("*.example.*")):
        t = read(p)
        check(not re.search(r'"(sta_password|ai_key|whatsapp_api|admin_pass)"\s*:\s*"[^"]{4,}"', t), f"secret renseigné dans le fichier d'exemple {p.relative_to(ROOT)}")

    if errors:
        print(f"\n{len(errors)} problème(s) :")
        for e in errors:
            print("  ✗ " + e)
        return 1
    print(f"OK : {passed} contrôles réussis.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
