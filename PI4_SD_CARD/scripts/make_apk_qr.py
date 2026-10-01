#!/usr/bin/env python3
"""Create a local-network QR code for the NEXUS Android package."""
from __future__ import annotations
import argparse,pathlib,sys
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--url",default="http://raspberrypi.local:8088/download/nexus-lab.apk")
    p.add_argument("--out",type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]/"mobile"/"nexus-lab-download-qr.png")
    a=p.parse_args()
    try:
        import qrcode
    except ImportError:
        print("Installe le module Python qrcode et Pillow pour générer l’image."); return 2
    qr=qrcode.QRCode(version=None,error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=10,border=4)
    qr.add_data(a.url); qr.make(fit=True); a.out.parent.mkdir(parents=True,exist_ok=True)
    qr.make_image(fill_color="#101621",back_color="white").save(a.out)
    a.out.with_suffix(".txt").write_text("Enveloppe Android générale NEXUS LAB (pas une APK personnalisée de projet): "+a.url+"\n"
       "Le téléphone doit être sur le même réseau local que le Pi. Si nexus-pi.local ne se résout pas, remplace-le par l’adresse IP locale du Pi et regénère le QR.\n",encoding="utf-8")
    print(f"QR créé: {a.out} -> {a.url}"); return 0
if __name__=="__main__":sys.exit(main())
