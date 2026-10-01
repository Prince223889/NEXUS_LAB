#!/usr/bin/env python3
"""Prepare a copyable Pi deployment folder without deleting or changing SD_CARD."""
from __future__ import annotations
import argparse, hashlib, json, pathlib, shutil, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
def copy_source(src: pathlib.Path, dst: pathlib.Path) -> None:
    for path in src.rglob("*"):
        rel=path.relative_to(src)
        if any(part in {"bin","build","__pycache__",".gradle","node_modules"} for part in rel.parts): continue
        if path.name in {"nexus-lab-download-qr.png","nexus-lab-download-qr.txt"}: continue
        target=dst/rel
        if path.is_dir(): target.mkdir(parents=True,exist_ok=True)
        elif path.is_file():
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(path,target)
def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument("--out",type=pathlib.Path,default=ROOT/"PI4_SD_CARD")
    ap.add_argument("--apk",type=pathlib.Path)
    args=ap.parse_args(); out=args.out.resolve()
    if out in {ROOT.resolve(),(ROOT/"SD_CARD").resolve()}:
        print("Refus: choisis un dossier de déploiement séparé, pas la racine ni SD_CARD."); return 2
    out.mkdir(parents=True,exist_ok=True)
    copy_source(ROOT/"pi",out/"pi")
    copy_source(ROOT/"projects"/"LIBRARY",out/"projects"/"LIBRARY")
    copy_source(ROOT/"mobile",out/"mobile")
    # Remove only legacy QR outputs in this generated package destination.
    for stale in ("nexus-lab-download-qr.png","nexus-lab-download-qr.txt"):
        for folder in ("mobile","packages"):
            (out/folder/stale).unlink(missing_ok=True)
    (out/"catalog").mkdir(exist_ok=True); shutil.copy2(ROOT/"catalog"/"catalog.json",out/"catalog"/"catalog.json")
    for rel in ("README.md","docs/PI4_ANDROID.md","docs/ARCHITECTURE_S3_PI.md","docs/API.md","docs/WHATSAPP.md","scripts/prepare_pi_sd.py","scripts/verify_pi.py","scripts/verify_pi.bat","scripts/prepare_pi_sd.bat","scripts/make_apk_qr.py","scripts/build_project_apk.ps1","scripts/build_project_apk.bat","scripts/publish_project_apk.ps1","scripts/publish_project_apk.bat"):
        src=ROOT/rel
        if src.exists():
            dst=out/rel; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)
    apk=args.apk or ROOT/"mobile"/"app"/"build"/"outputs"/"apk"/"debug"/"app-debug.apk"
    if apk.is_file():
        dst=out/"packages"/"nexus-lab.apk"; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(apk,dst)
    for stale in ("nexus-lab-download-qr.png","nexus-lab-download-qr.txt"):
        (out/"packages"/stale).unlink(missing_ok=True)
    (out/"LISEZMOI_FR.txt").write_text(
        "NEXUS · paquet de déploiement Raspberry Pi 4\n\n"
        "Déploie PI4_SD_CARD et SD_CARD côte à côte sur le Pi (scripts\deploy_pi_ssh.bat automatise le transfert), puis lance le script de préparation sécurisé\n"
        "Ce n'est pas une image système bootable. Le Pi démarre sur la clé USB 8 Go et garde sa microSD 64 Go FAT32 pour les données; la microSD 2 Go du S3 reste dans le S3.\n"
        "Depuis le Pi démarré sur USB, vérifie que /dev/mmcblk0 correspond à la microSD Pi de 64 Go, puis lance sudo bash pi/prepare_shared_sd.sh --format /dev/mmcblk0 uniquement si elle doit être formatée (commande destructive avec confirmation exacte). Ensuite sudo bash pi/install.sh monte /srv/nexus/shared.\n"
        "Formate séparément la carte S3 de 2 Go en FAT32 et copie le contenu de SD_CARD/ à sa racine. Les deux appareils échangent par Wi-Fi et gardent chacun leur carte.\n"
        "Les sources Arduino sont incluses; la copie de secours des firmwares provient de SD_CARD/ et n'est installée que si l'espace FAT suffit.\n"
        "Compileur ESP32: sudo bash pi/setup_arduino.sh (Pi ARM64 compatible).\n"
        "APK projet sur Windows: extrais le ZIP Studio puis lance scripts\\build_project_apk.bat \"C:\\chemin\\vers\\projet\". Pour obtenir un QR LAN, lance scripts\\publish_project_apk.bat et saisis l’adresse Wi-Fi et le jeton Pi. Le build APK Gradle sur Pi 4 ARM64 reste indisponible.\n"
        "Le Pi rejoint le point d’accès ESP32-LAB via pi/connect_to_master_ap.sh. Le S3 partage son Internet amont au Pi; Ethernet reste prioritaire si branché.\n",encoding="utf-8")
    manifest=[]
    for p in sorted(out.rglob("*")):
        if p.is_file() and p.name!="MANIFEST_SHA256.json":
            manifest.append({"path":p.relative_to(out).as_posix(),"size":p.stat().st_size,"sha256":hashlib.sha256(p.read_bytes()).hexdigest()})
    (out/"MANIFEST_SHA256.json").write_text(json.dumps({"created_by":"prepare_pi_sd.py","files":manifest},indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(f"Dossier Pi prêt: {out} ({len(manifest)} fichiers). Les binaires compilés locaux sont exclus.")
    return 0
if __name__=="__main__": sys.exit(main())
