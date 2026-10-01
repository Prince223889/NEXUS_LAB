#!/usr/bin/env python3
"""Build a source-and-deployment ZIP without build caches or local project binaries."""
from __future__ import annotations
import hashlib, pathlib, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"dist"/"NEXUS_LAB_S3_PI4_PACK_COMPLET.zip"
EXCLUDED={".git","__pycache__","build","bin","node_modules",".gradle",".pio","managed_components","dist"}
def main():
    OUT.parent.mkdir(parents=True,exist_ok=True)
    files=[]
    for p in ROOT.rglob("*"):
        if not p.is_file() or any(part in EXCLUDED for part in p.relative_to(ROOT).parts): continue
        if p.suffix in (".pyc",".pyo") or p.name in ("sdkconfig","sdkconfig.old","dependencies.lock"): continue
        if p.name in ("nexus-lab-download-qr.png","nexus-lab-download-qr.txt"): continue
        files.append(p)
    apk=ROOT/"mobile/app/build/outputs/apk/debug/app-debug.apk"
    if not apk.is_file(): raise SystemExit("APK absent; exécute scripts/build_android.bat d'abord.")
    with zipfile.ZipFile(OUT,"w",zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for p in sorted(files): z.write(p,"NEXUS_LAB/"+p.relative_to(ROOT).as_posix())
        z.write(apk,"NEXUS_LAB/ANDROID/app-debug.apk")
        readme=[
            "NEXUS LAB — livraison complète", "",
            "CE QUE CONTIENT L’ARCHIVE",
            "SD_CARD/ : contenu FAT32 à copier à la racine d’une carte destinée au mode S3 autonome.",
            "PI4_SD_CARD/ : fichiers logiciels à installer sur un Raspberry Pi déjà démarré avec Raspberry Pi OS Lite 64 bits. Ce n’est pas une image bootable.",
            "ANDROID/app-debug.apk : application mobile NEXUS générale; ce n’est pas une APK de projet créée dans le Studio.",
            "",
            "DEUX CARTES microSD DISTINCTES",
            "Le Pi démarre Raspberry Pi OS Lite depuis la clé USB 8 Go et garde sa microSD 64 Go FAT32 pour les données. Le S3 garde sa propre microSD 2 Go FAT32 avec le contenu de SD_CARD/ copié à la racine.",
            "Vérifie que /dev/mmcblk0 est bien la carte Pi de 64 Go avant de lancer pi/prepare_shared_sd.sh --format /dev/mmcblk0; cette commande efface le disque sélectionné et exige confirmation. Lance ensuite pi/install.sh.",
            "Les cartes restent dans leurs appareils. Le S3 et le Pi échangent projets et firmwares par Wi-Fi. Ne retire pas une carte pendant une écriture.",
            "",
            "APK PERSONNALISÉE ET QR",
            "Pour une APK projet : exporte le projet depuis le Studio, extrais son ZIP, puis lance scripts/build_project_apk.bat <dossier-exporte> sur Windows. Lance ensuite scripts/publish_project_apk.bat pour envoyer l’APK au Pi et produire un QR LAN. Le Pi 4 ARM64 ne compile pas l’APK avec les outils Android x86_64 de ce modèle.",
            "Aucun QR fictif n’est livré : après création d’une APK projet, scripts/publish_project_apk.bat l’envoie au Pi, vérifie son SHA-256 et génère le QR local correspondant au vrai lien de téléchargement.",
            "",
            "Le code source, les scripts de vérification et le MASTER sont inclus. Les vérifications logicielles ont réussi; aucune communication radio, installation Pi, mesure capteur ou opération de flash n’a été testée sur matériel réel."
        ]
        z.writestr("NEXUS_LAB/LISEZMOI_LIVRAISON.txt", "\n".join(readme)+"\n")
    digest=hashlib.sha256(OUT.read_bytes()).hexdigest()
    OUT.with_suffix(".sha256").write_text(f"{digest}  {OUT.name}\n",encoding="utf-8")
    with zipfile.ZipFile(OUT) as z:
        bad=z.testzip()
        if bad: raise SystemExit("Archive endommagée: "+bad)
        print(f"ZIP vérifié: {OUT} | {len(z.namelist())} entrées | {OUT.stat().st_size} octets | SHA-256 {digest}")
    return 0
if __name__=="__main__": raise SystemExit(main())
