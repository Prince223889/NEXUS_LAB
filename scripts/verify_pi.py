#!/usr/bin/env python3
"""Fast, offline software checks for the NEXUS Pi companion."""
from __future__ import annotations
import hashlib, hmac, importlib.util, json, pathlib, sys, tempfile, threading, platform, io, zipfile
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen
ROOT=pathlib.Path(__file__).resolve().parents[1]
path=ROOT/"pi"/"nexus_agent.py"
spec=importlib.util.spec_from_file_location("nexus_agent",path)
agent=importlib.util.module_from_spec(spec); sys.modules[spec.name]=agent; spec.loader.exec_module(agent)
errors=[]; passed=0
def check(ok,msg):
    global passed
    if ok: passed+=1
    else: errors.append(msg)
def api_roundtrip():
    old_db,old_token,old_user,old_apps,old_fw,old_shared,old_ai,old_data=agent.DB,agent.TOKEN,agent.USER_PROJECTS,agent.APPS,agent.FIRMWARE,agent.SHARED_ROOT,agent.AI_CONFIG,agent.DATA
    old_wa=(agent.WHATSAPP_VERIFY_TOKEN,agent.WHATSAPP_APP_SECRET,agent.WHATSAPP_ALLOWLIST)
    try:
        with tempfile.TemporaryDirectory(prefix="nexus-pi-check-") as d:
            agent.DATA=pathlib.Path(d); agent.DB=pathlib.Path(d)/"check.sqlite3"; agent.USER_PROJECTS=pathlib.Path(d)/"projects"; agent.APPS=pathlib.Path(d)/"apps"; agent.FIRMWARE=pathlib.Path(d)/"firmware"; agent.SHARED_ROOT=pathlib.Path(d)/"shared"; agent.AI_CONFIG=pathlib.Path(d)/"assistant-config.json"; agent.SHARED_ROOT.mkdir(); agent.TOKEN="verification-token-abcdefghijklmnopqrstuvwxyz"; agent.WHATSAPP_VERIFY_TOKEN="verify-test-token"; agent.WHATSAPP_APP_SECRET="meta-test-secret"; agent.WHATSAPP_ALLOWLIST={"33612345678"}; agent.init()
            old_cache=pathlib.Path(d)/"old-cache"/"worker.bin"; old_cache.parent.mkdir(); old_cache.write_bytes(b"shared-cache-firmware")
            fingerprint="fingerprint-for-share"; digest=agent.sha(old_cache)
            with agent.connect() as c: c.execute("INSERT INTO build_cache(project,board,fingerprint,artifact,sha256,created) VALUES(?,?,?,?,?,?)",("share_test","esp32s3",fingerprint,str(old_cache),digest,agent.now()))
            shared=agent.promote_cached_artifact("share_test","esp32s3",fingerprint,old_cache,digest)
            with agent.connect() as c: cached=c.execute("SELECT artifact FROM build_cache WHERE project=? AND board=? AND fingerprint=?",("share_test","esp32s3",fingerprint)).fetchone()
            check(shared.is_file() and shared.read_bytes()==b"shared-cache-firmware" and cached["artifact"]==str(shared),"Un build en cache Pi n'est pas promu vers le stockage FAT partagé avec le S3.")
            server=ThreadingHTTPServer(("127.0.0.1",0),agent.Api)
            thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
            base=f"http://127.0.0.1:{server.server_port}"
            try:
                try: urlopen(base+"/api/v1/messages",timeout=3)
                except HTTPError as e: unauthorized=e.code==401
                else: unauthorized=False
                check(unauthorized,"Une route privée répond sans jeton.")
                try: urlopen(base+"/api/v1/assistant/config",timeout=3)
                except HTTPError as e: ai_unauthorized=e.code==401
                else: ai_unauthorized=False
                check(ai_unauthorized,"La configuration IA du Pi est accessible sans jeton.")
                with urlopen(base+"/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-test-token&hub.challenge=challenge-123",timeout=3) as r: challenge_ok=r.read()==b"challenge-123"
                check(challenge_ok,"Le challenge de vérification Meta ne répond pas au jeton configuré.")
                event_body=json.dumps({"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"messages":[{"from":"33612345678","id":"wamid.test-1","text":{"body":"Peux-tu m’aider avec mon capteur ?"}},{"from":"33600000000","id":"wamid.denied","text":{"body":"message hors liste"}}]}}]}]}).encode()
                signature="sha256="+hmac.new(agent.WHATSAPP_APP_SECRET.encode(),event_body,hashlib.sha256).hexdigest()
                webhook=Request(base+"/webhooks/whatsapp",data=event_body,headers={"Content-Type":"application/json","X-Hub-Signature-256":signature},method="POST")
                with urlopen(webhook,timeout=3) as r: wa_result=json.loads(r.read().decode())
                with urlopen(webhook,timeout=3) as r: wa_duplicate=json.loads(r.read().decode())
                with agent.connect() as c: wa_count=c.execute("SELECT COUNT(*) FROM whatsapp_events").fetchone()[0]
                check(wa_result.get("received")==1 and wa_duplicate.get("received")==0 and wa_count==1 and any(x["role"]=="user" and "capteur" in x["content"] for x in agent.assistant_history()),"Le webhook WhatsApp ne vérifie pas la signature, la liste blanche, l’anti-rejeu ou l’archivage en contexte.")
                bad=Request(base+"/webhooks/whatsapp",data=event_body,headers={"Content-Type":"application/json","X-Hub-Signature-256":"sha256="+"0"*64},method="POST")
                try: urlopen(bad,timeout=3)
                except HTTPError as e: bad_signature=e.code==401
                else: bad_signature=False
                check(bad_signature,"Le webhook WhatsApp accepte une signature invalide.")
                ai_req=Request(base+"/api/v1/assistant/config",data=json.dumps({"endpoint":"https://ai.example/v1/chat/completions","model":"test-model","key":"secret-test-value"}).encode(),headers={"Authorization":"Bearer "+agent.TOKEN,"Content-Type":"application/json"},method="POST")
                with urlopen(ai_req,timeout=3) as r: ai_saved=json.loads(r.read().decode())
                ai_req=Request(base+"/api/v1/assistant/config",headers={"Authorization":"Bearer "+agent.TOKEN})
                with urlopen(ai_req,timeout=3) as r: ai_public=json.loads(r.read().decode())
                check(ai_saved.get("configured") and ai_public.get("key_set") and "key" not in ai_public and json.loads(agent.AI_CONFIG.read_text(encoding="utf-8")).get("key")=="secret-test-value" and (platform.system()=="Windows" or agent.AI_CONFIG.stat().st_mode & 0o777==0o600),"La clé IA n’est pas conservée dans un fichier protégé ou est renvoyée par l’API.")
                (agent.SHARED_ROOT/"PROJECTS").mkdir()
                (agent.SHARED_ROOT/"PROJECTS"/"MY_PROJECTS").mkdir()
                storage_path="/sd/PROJECTS/MY_PROJECTS/network.txt"
                upload=Request(base+"/api/v1/storage/upload?path="+storage_path,data=b"fichier partage Pi-S3",headers={"Authorization":"Bearer "+agent.TOKEN,"Content-Type":"application/octet-stream"},method="POST")
                with urlopen(upload,timeout=3) as r: upload_result=json.loads(r.read().decode())
                listing=Request(base+"/api/v1/storage/list?path=%2Fsd%2FPROJECTS%2FMY_PROJECTS",headers={"Authorization":"Bearer "+agent.TOKEN})
                with urlopen(listing,timeout=3) as r: listed=json.loads(r.read().decode())
                download=Request(base+"/api/v1/storage/download?path="+storage_path,headers={"Authorization":"Bearer "+agent.TOKEN})
                with urlopen(download,timeout=3) as r: downloaded=r.read()
                check(upload_result.get("ok") and downloaded==b"fichier partage Pi-S3" and any(x["name"]=="network.txt" for x in listed["items"]),"Le Pi ne permet pas au S3 de lister, lire et écrire la carte partagée sur le réseau.")
                try: urlopen(base+"/api/v1/storage/list?path=%2Fsd%2F..%2Fetc",timeout=3)
                except HTTPError as e: path_rejected=e.code==401
                else: path_rejected=False
                traversal=Request(base+"/api/v1/storage/list?path=%2Fsd%2F..%2Fetc",headers={"Authorization":"Bearer "+agent.TOKEN})
                try: urlopen(traversal,timeout=3)
                except HTTPError as e: traversal_rejected=e.code==400
                else: traversal_rejected=False
                check(path_rejected and traversal_rejected,"Le stockage Pi accepte une requête anonyme ou un parcours de chemin.")
                req=Request(base+"/api/v1/messages",data=json.dumps({"text":"Test aller-retour"}).encode(),headers={"Authorization":"Bearer "+agent.TOKEN,"Content-Type":"application/json"},method="POST")
                with urlopen(req,timeout=3) as r: sent=r.status==201
                req=Request(base+"/api/v1/messages",headers={"Authorization":"Bearer "+agent.TOKEN})
                with urlopen(req,timeout=3) as r: received=json.loads(r.read().decode())["items"]
                check(sent and any(x["text"]=="Test aller-retour" for x in received),"Le fil de messages ne fonctionne pas en aller-retour.")
                local_ai=Request(base+"/api/v1/assistant/config",data=json.dumps({"endpoint":"","model":"test-model","key":""}).encode(),headers={"Authorization":"Bearer "+agent.TOKEN,"Content-Type":"application/json"},method="POST")
                with urlopen(local_ai,timeout=3): pass
                chat_req=Request(base+"/api/v1/assistant/chat",data=json.dumps({"q":"recherche capteur température"}).encode(),headers={"Authorization":"Bearer "+agent.TOKEN,"Content-Type":"application/json"},method="POST")
                with urlopen(chat_req,timeout=3) as r: chat_result=json.loads(r.read().decode())
                check(chat_result.get("mode")=="local" and any(x["role"]=="user" for x in agent.assistant_history()),"L’assistant du Pi n’enregistre pas les échanges et le mode local.")
                save_req=Request(base+"/api/v1/projects/save",data=json.dumps({"project_id":"archive_test","files":{"source.ino":"void setup(){}\nvoid loop(){}\n","README.md":"# Projet mémorisé\n","project.json":"{\"title\":\"Projet mémorisé\",\"spec\":{\"board\":\"esp32s3\",\"modules\":[{\"id\":\"dht22\"}]}}"}}).encode(),headers={"Authorization":"Bearer "+agent.TOKEN,"Content-Type":"application/json"},method="POST")
                with urlopen(save_req,timeout=3) as r: saved=json.loads(r.read().decode())
                req=Request(base+"/api/v1/projects/archive_test/files",headers={"Authorization":"Bearer "+agent.TOKEN})
                with urlopen(req,timeout=3) as r: files=json.loads(r.read().decode())["files"]
                check(saved.get("ok") and "README.md" in files and "archive_test.ino" in files,"La microSD Pi ne conserve pas le projet nommé/README reprenable.")
                build_req=Request(base+"/api/v1/android/build",data=json.dumps({"project_id":"verification_app","files":{"source.ino":"void setup(){}\nvoid loop(){}\n","project.json":"{\"title\":\"Projet Vérifié\",\"spec\":{\"board\":\"esp32s3\",\"modules\":[{\"id\":\"dht22\"}]}}"}}).encode(),headers={"Authorization":"Bearer "+agent.TOKEN,"Content-Type":"application/json"},method="POST")
                if platform.machine().lower() in ("x86_64","amd64"):
                    with urlopen(build_req,timeout=3) as r: queued=json.loads(r.read().decode())
                    row=agent.getjob(queued["id"])
                    check(row and row["kind"]=="android" and row["status"]=="queued","La demande d'APK projet n'entre pas dans la file persistante.")
                    apk=agent.APPS/"verification_app"/queued["id"]/("verification_app-nexus.apk")
                    apk.parent.mkdir(parents=True); apk.write_bytes(b"APK-validation")
                    agent.setjob(queued["id"],status="success",artifact=str(apk),sha256=agent.sha(apk))
                    with urlopen(base+"/download/apps/verification_app/"+queued["id"]+".apk",timeout=3) as r: download=r.read()
                    check(download==b"APK-validation","Le téléchargement de l'APK vérifiée ne fonctionne pas.")
                    package=io.BytesIO()
                    with zipfile.ZipFile(package,"w") as apkzip:
                        apkzip.writestr("AndroidManifest.xml",b"manifest-test")
                        apkzip.writestr("classes.dex",b"dex-test")
                    req=Request(base+"/api/v1/android/import",data=package.getvalue(),headers={"Authorization":"Bearer "+agent.TOKEN,"X-Nexus-Project":"verification_app","Content-Type":"application/vnd.android.package-archive"},method="POST")
                    with urlopen(req,timeout=3) as r: imported=json.loads(r.read().decode())
                    req=Request(base+"/download/apps/verification_app/"+imported["id"]+".apk")
                    with urlopen(req,timeout=3) as r: imported_file=r.read()
                    check(imported.get("status")=="success" and imported_file==package.getvalue(),"L’importation sécurisée d’une APK Windows vers le Pi échoue.")
                    req=Request(base+"/api/v1/jobs/"+imported["id"]+"/qr",headers={"Authorization":"Bearer "+agent.TOKEN})
                    with urlopen(req,timeout=3) as r: qr_ok=r.headers.get("Content-Type")=="image/png" and r.read().startswith(b"\x89PNG")
                    check(qr_ok,"Le Pi ne produit pas le QR du téléchargement APK LAN.")
                    fw=agent.FIRMWARE/"archive_test"/"esp32s3"/"worker.bin";fw.parent.mkdir(parents=True);fw.write_bytes(b"firmware-validation")
                    with agent.connect() as c:c.execute("INSERT INTO jobs(id,project,board,status,kind,artifact,sha256) VALUES(?,?,?,?,?,?,?)",("firmware_job1","archive_test","esp32s3","success","esp",str(fw),agent.sha(fw)))
                    req=Request(base+"/api/v1/jobs/firmware_job1/firmware-link",headers={"Authorization":"Bearer "+agent.TOKEN})
                    with urlopen(req,timeout=3) as r: link=json.loads(r.read().decode())
                    with urlopen(link["url"],timeout=3) as r: received_fw=r.read(); fw_digest=r.headers.get("X-Content-SHA256")
                    check(received_fw==b"firmware-validation" and fw_digest==link["sha256"],"Le lien firmware Pi temporaire ne livre pas un binaire vérifié au worker.")
                else:
                    try: urlopen(build_req,timeout=3)
                    except HTTPError as e: unsupported=e.code==501
                    else: unsupported=False
                    check(unsupported,"Le Pi ARM64 doit signaler clairement la limite du constructeur APK.")
            finally:
                server.shutdown(); server.server_close(); thread.join(timeout=2)
    finally:
        agent.DB,agent.TOKEN,agent.USER_PROJECTS,agent.APPS,agent.FIRMWARE,agent.SHARED_ROOT,agent.AI_CONFIG,agent.DATA=old_db,old_token,old_user,old_apps,old_fw,old_shared,old_ai,old_data
        agent.WHATSAPP_VERIFY_TOKEN,agent.WHATSAPP_APP_SECRET,agent.WHATSAPP_ALLOWLIST=old_wa

def main():
    check(len(agent.BOARDS)==3,"Les trois cartes ESP32 prévues ne sont pas configurées.")
    check(agent.project_dir("dht11") is not None,"Le projet dht11 est absent ou sans .ino.")
    check(agent.project_dir("../README") is None,"Un identifiant de chemin dangereux a été accepté.")
    check(agent.project_dir("..\\README") is None,"Un chemin Windows dangereux a été accepté.")
    check(agent.search("station météo")!=[],"La recherche locale ne retrouve pas le catalogue.")
    q=agent.plan({"description":"Je veux un capteur"})
    check(q.get("status")=="needs_input" and q.get("choices"),"L'assistant ne demande pas de choix pour une demande ambiguë.")
    q=agent.plan({"description":"DHT11 température","board":"esp32"})
    check(q.get("status")=="ready_for_review" and "dht11" in q.get("modules",[]),"La proposition DHT11 ne passe pas en validation.")
    check(not hasattr(agent,"flash") and "flash" not in agent.__dict__,"Le service Pi ne doit pas fournir de commande de flash.")
    check("/api/v1/messages" in path.read_text(encoding="utf-8"),"Le fil de messages Pi est absent.")
    check("assistant_history" in path.read_text(encoding="utf-8") and "assistant-config.json" in path.read_text(encoding="utf-8"),"La mémoire de chat ou le stockage protégé des réglages IA Pi est absent.")
    companion=(ROOT/"firmware"/"master"/"www"/"src"/"36_companion.js").read_text(encoding="utf-8")
    chat=(ROOT/"firmware"/"master"/"www"/"src"/"50_sys.js").read_text(encoding="utf-8")
    check("A.piRequest=async" in companion and "assistant/chat" in chat,"Le chat S3 n’appelle pas le compagnon IA Pi.")
    check("pi-ai-save" in companion and "/api/v1/assistant/config" in companion,"La configuration du fournisseur IA Pi n’est pas intégrée au Compagnon.")
    check(agent.BUILD_WORKERS in range(1,5),"Le nombre de workers de compilation est hors plage.")
    check("build_cache" in path.read_text(encoding="utf-8"),"Le cache de compilation est absent.")
    check("/api/v1/android/import" in path.read_text(encoding="utf-8"),"L’import d’APK PC vers le Pi est absent.")
    check("X-Nexus-Project" in path.read_text(encoding="utf-8"),"La prévalidation CORS du transfert APK projet est absente.")
    installer=(ROOT/"pi"/"install.sh").read_text(encoding="utf-8")
    check("configure_shared_storage.sh" in installer and "NEXUS_SHARED_ROOT" in installer,"L’installation du Pi ne configure pas la microSD FAT commune Pi/S3.")
    check("planned=set()" in installer and "Aucun ancien fichier" in installer and "$SRC/../SD_CARD" in installer,"L’installation ne précontrôle pas l’espace FAT avant de migrer les projets/firmwares de secours.")
    mobile=(ROOT/"mobile"/"app"/"src"/"main"/"java"/"local"/"nexus"/"lab"/"MainActivity.java").read_text(encoding="utf-8")
    check('project.optJSONObject("spec")' in mobile and 'projectSpec.optJSONArray("modules")' in mobile and 'projectSpec.optJSONArray("rules")' in mobile and 'readAsset("project_code.ino")' in mobile,"L’APK projet ne lit pas la fiche Studio imbriquée, ses blocs ou son code Arduino.")
    apk_builder=(ROOT/"scripts"/"build_project_apk.ps1").read_text(encoding="utf-8")
    check("project_code.ino" in apk_builder and "Temps de compilation APK" in apk_builder,"Le constructeur APK n’intègre pas le croquis et le temps mesuré.")
    service=(ROOT/"pi"/"nexus-agent.service").read_text(encoding="utf-8")
    check("ReadWritePaths=/srv/nexus /mnt/nexus-cache @NEXUS_SHARED_ROOT@" in service,"Le service Pi ne peut pas écrire sur tout le volume FAT commun requis.")
    formatter=(ROOT/"pi"/"prepare_shared_sd.sh").read_text(encoding="utf-8")
    check("mkfs.vfat -F 32 -n NEXUS" in formatter and "EFFACER $DEV" in formatter and "findmnt -n -o SOURCE /" in formatter,"La préparation SD ne protège pas assez contre l’effacement du mauvais périphérique.")
    check("/dev/mmcblk[0-9]+" in formatter and "BYTES >= 50000000000" in formatter,"La préparation SD n’impose pas une microSD interne d’environ 64 Go.")
    firmware_wifi=(ROOT/"firmware"/"master"/"main"/"wifi_lab.c").read_text(encoding="utf-8")
    sdkdefaults=(ROOT/"firmware"/"master"/"sdkconfig.defaults").read_text(encoding="utf-8")
    check("esp_netif_napt_enable(s_ap_if)" in firmware_wifi and "esp_netif_set_default_netif(s_sta_if)" in firmware_wifi and "esp_netif_napt_disable(s_ap_if)" in firmware_wifi,"Le S3 ne configure pas correctement le partage Internet AP vers Wi-Fi amont.")
    check("CONFIG_LWIP_IP_FORWARD=y" in sdkdefaults and "CONFIG_LWIP_IPV4_NAPT=y" in sdkdefaults and "captive_dns_stop()" in firmware_wifi,"La configuration NAPT ou la gestion du DNS/portail captif est absente.")
    pi_wifi=(ROOT/"pi"/"connect_to_master_ap.sh").read_text(encoding="utf-8")
    check("ipv4.never-default no" in pi_wifi and "ipv4.route-metric 600" in pi_wifi,"Le Pi ne peut pas utiliser le S3 comme route Internet de secours.")
    shared_script=(ROOT/"pi"/"configure_shared_storage.sh").read_text(encoding="utf-8")
    check("fmask=0117" in shared_script and "dmask=0007" in shared_script and "mkfs" not in shared_script,"La FAT commune ne donne pas les permissions de groupe attendues ou le script tente un formatage.")
    arch=(ROOT/"docs"/"ARCHITECTURE_S3_PI.md").read_text(encoding="utf-8")
    check("PROJECTS/" in arch and "microSD de 64 Go" in arch and "microSD de 2 Go" in arch and "clé USB de 8 Go" in arch and "par Wi-Fi" in arch,"La procédure Pi/S3 ne décrit pas les deux cartes séparées et le lien Wi-Fi.")
    check("def build_android" in path.read_text(encoding="utf-8"),"Le constructeur APK de projet est absent.")
    check("firmware-link" in path.read_text(encoding="utf-8"),"Les liens temporaires signés vers les firmwares Pi sont absents.")
    check("/api/v1/projects/save" in path.read_text(encoding="utf-8"),"La sauvegarde durable du projet sur le Pi est absente.")
    check("sha(artifact)!=row[" in path.read_text(encoding="utf-8"),"Le téléchargement des artefacts ne revérifie pas le SHA-256.")
    temp=pathlib.Path(tempfile.mkdtemp(prefix="nexus-project-check-"))
    old_user=agent.USER_PROJECTS
    try:
        agent.USER_PROJECTS=temp
        saved=agent.sync_user_project("essai_s3",{"sketch.ino":"void setup(){}\nvoid loop(){}\n","project.json":"{\"title\":\"Essai S3\",\"description\":\"lecture DHT\"}"})
        check(saved is not None and (saved/"essai_s3.ino").exists(),"Le Pi ne sauvegarde pas les sources synchronisées.")
        check((saved/"README.md").is_file(),"Le Pi ne crée pas le README manquant.")
        try: agent.sync_user_project("essai_s3",{"../x.ino":"x"})
        except ValueError: rejected=True
        else: rejected=False
        check(rejected,"Le Pi accepte un nom de fichier sortant du projet.")
    finally:
        agent.USER_PROJECTS=old_user
        import shutil; shutil.rmtree(temp,ignore_errors=True)
    api_roundtrip()
    compile(path.read_text(encoding="utf-8"),str(path),"exec")
    if errors:
        print("ÉCHEC:"); [print(" - "+e) for e in errors]; return 1
    print(f"OK: {passed} contrôles Pi réussis (logiciel uniquement; aucun test matériel).")
    return 0
if __name__=="__main__": sys.exit(main())
