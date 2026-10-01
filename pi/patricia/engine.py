"""Cerveau de Patricia : une phrase entre, une réponse structurée sort.

Réponse :
  answer       texte à afficher (et à lire à voix haute : `speak`)
  intent       intention reconnue ; mode : « local » (règles) ou « ia »
  cards        éléments riches pour l'interface (projets, diagnostic, code à générer, flotte, mémoire…)
  actions      propositions d'actions ; celles qui touchent le matériel attendent une confirmation
  suggestions  relances courtes proposées en boutons
  followup     question que Patricia pose d'elle-même (« on améliore la station météo ? »)

Règle de sécurité : une action matérielle (flash, pilotage, OTA) n'est JAMAIS exécutée directement par la
conversation ; elle devient une proposition à confirmer. L'arrêt d'urgence, lui, s'applique tout de suite.
"""
from __future__ import annotations

import json
import math
import re
import time
from typing import Any, Callable

from . import diagnose as diag
from .intents import detect, workers_in
from .knowledge import BOARDS, Knowledge
from .llm import ChatClient, LLMError, tool_schema
from .memory import Memory, fold, slug

# kind → (exécuteur, risque) ; « ui » = l'interface exécute via le MASTER S3 après confirmation.
ACTIONS = {
    "s3_job": ("ui", "faible"), "flash": ("ui", "élevé"), "verify": ("ui", "faible"), "open_page": ("ui", "aucun"),
    "build": ("pi", "faible"), "apk": ("ui", "aucun"), "save_project": ("pi", "aucun"),
    "fleet_goal": ("pi", "élevé"), "fleet_register": ("pi", "moyen"), "install_library": ("pi", "faible"),
}
CONFIRM_TTL = 300

PERSONA = """Tu es Patricia, l'assistante du laboratoire NEXUS (box ESP32 : un MASTER ESP32-S3 avec microSD 2 Go, \
jusqu'à 10 workers ESP32, un Raspberry Pi 4 de 4 Go qui compile, microSD 64 Go pour les données). Tu tutoies \
l'utilisateur, tu réponds en français simple, précis et chaleureux. Tu aides à concevoir, câbler, coder, compiler, \
flasher, tester et améliorer des projets électroniques, et tu te souviens des travaux précédents.

Règles :
- Ne refuse jamais une demande technique du labo. Si le matériel ne permet pas quelque chose, dis-le franchement \
et propose l'alternative la plus proche qui marche.
- Tu n'agis jamais seule sur le matériel : flash, pilotage de véhicules, compilation et OTA passent par l'outil \
propose_action ; l'utilisateur confirme dans l'interface. Ne prétends jamais qu'une action est faite si elle est \
seulement proposée.
- Donne des broches, des valeurs et des bibliothèques exactes. Signale les pièges (ADC2 et Wi-Fi, niveaux 5 V, \
alimentation des moteurs).
- Enregistre ce qui compte avec add_note ou save_project (décisions, mesures, prochaine étape).
- Termine, quand c'est utile, par UNE question courte pour faire avancer le projet.
- Réponses courtes : 3 à 10 lignes, sauf si on te demande du code."""


class Engine:
    def __init__(self, memory: Memory, knowledge: Knowledge, host: Any = None, llm_config: Callable[[], dict] | None = None):
        self.mem = memory
        self.kb = knowledge
        self.host = host
        self.llm_config = llm_config or (lambda: {})

    # ================================================================ entrée
    def chat(self, text: str, session: str | None = None, context: dict | None = None) -> dict:
        text = str(text or "").strip()[:8000]
        if not text:
            return self._resp("Je t'écoute.", "empty")
        context = context if isinstance(context, dict) else {}
        intent = detect(text)
        self.mem.log("user", text, session, intent.name, context.get("project"))
        handler = getattr(self, "_h_" + intent.name, None)
        resp = None
        note = ""
        client = self._client()
        if client and intent.name in LLM_INTENTS:
            try:
                resp = self._llm(text, session, context, intent.name, client)
            except LLMError as e:
                resp, note = None, str(e)
        if resp is None:
            resp = handler(text, intent.slots, context) if handler else self._h_question(text, intent.slots, context)
            if client and intent.name in LLM_INTENTS and note:
                resp["notice"] = note + " — réponse locale à la place."
        resp.setdefault("intent", intent.name)
        resp.setdefault("mode", "local")
        self.mem.log("assistant", resp["answer"], session, intent.name, context.get("project"))
        return resp

    def _client(self) -> ChatClient | None:
        cfg = self.llm_config() or {}
        c = ChatClient(cfg.get("endpoint", ""), cfg.get("key", ""), cfg.get("model", ""))
        return c if c.ready else None

    @staticmethod
    def _resp(answer: str, intent: str, **kw) -> dict:
        r = {"answer": answer.strip(), "intent": intent, "cards": [], "actions": [], "suggestions": []}
        r.update(kw)
        r.setdefault("speak", _speakable(r["answer"]))
        return r

    def _propose(self, kind: str, params: dict, summary: str) -> dict:
        executor, risk = ACTIONS[kind]
        a = self.mem.propose_action(kind, params, summary, risk, CONFIRM_TTL)
        return {"id": a["id"], "kind": kind, "params": params, "summary": summary, "risk": risk, "executor": executor,
                "needs_confirm": risk not in ("aucun",)}

    def _name(self) -> str:
        return self.mem.facts().get("prenom", "")

    # ============================================================ salutations
    def greeting(self) -> dict:
        """Message d'accueil proactif : reprise du dernier projet et questions en attente."""
        name = self._name()
        hello = f"Bonjour {name} !" if name else "Bonjour !"
        lines, sugg, cards = [hello], [], []
        active = self.mem.projects(active_only=True)
        due = self.mem.due_followups(2)
        followup = None
        if due:
            followup = {"id": due[0]["id"], "question": due[0]["question"], "choices": due[0]["choices"] or ["Oui", "Plus tard", "Non"]}
        if active:
            p = active[0]
            lines.append(f"La dernière fois on travaillait sur « {p['title']} » ({p['status_label']}).")
            if p["next_step"]:
                lines.append(f"Prochaine étape notée : {p['next_step']}.")
            if not followup:
                followup = {"question": f"On reprend « {p['title']} », ou tu veux l'améliorer ?",
                            "choices": [f"On reprend {p['title']}", f"Améliore {p['title']}", "Nouveau projet"], "project": p["id"]}
            cards.append({"type": "projects", "items": active[:4]})
        else:
            lines.append("Dis-moi ce que tu veux construire : je choisis les capteurs, je calcule le câblage, je prépare le code et je t'aide à le tester.")
            sugg = ["Je veux faire une station météo", "Comment brancher un BME280 ?", "Lance un check-up", "Que sais-tu faire ?"]
        return self._resp("\n".join(lines), "greet", cards=cards, suggestions=sugg, followup=followup)

    def _h_greet(self, text, s, ctx):
        return self.greeting()

    def _h_thanks(self, text, s, ctx):
        return self._resp("Avec plaisir ! Je garde tout en mémoire pour la suite.", "thanks", suggestions=["Mes projets", "Mes notes"])

    def _h_help(self, text, s, ctx):
        caps = [
            "Concevoir un projet : « je veux faire un arrosage automatique avec un ESP32-S3 ».",
            "Câblage et code : « comment brancher un HC-SR04 », « écris le code pour un DHT22 et un relais ».",
            "Retenir : « note que le capteur de sol mesure 1200 à sec », « qu'est-ce que tu sais sur la serre ? ».",
            "Corriger : colle un journal de compilation ou du moniteur série, je trouve la cause et la correction.",
            "Labo : « état du labo », « lance un check-up », « flashe le worker 3 avec le projet station météo ».",
            "Véhicules : « avance la voiture 2 de 1 m », « toutes les voitures en ligne », « stop » (arrêt immédiat).",
            "Applications : « crée l'APK du projet serre » (compilée sur un PC x86_64, publiée par le Pi avec QR).",
        ]
        return self._resp("Voici ce que je sais faire :\n• " + "\n• ".join(caps), "help",
                          suggestions=["Je veux faire un projet", "Mes projets", "État du labo"])

    # ================================================================ mémoire
    def _h_note_add(self, text, s, ctx):
        body = s.get("text", "").strip()
        proj = ctx.get("project") or ((self.mem.find_project(body) or {}).get("id"))
        kind = "mesure" if re.search(r"\d+(?:[.,]\d+)?\s*(°|v|mv|ma|a|cm|mm|%|lux|ppm|hpa)", fold(body)) else \
               "decision" if re.search(r"\b(on garde|on choisit|decide|decision)\b", fold(body)) else \
               "idee" if re.search(r"\b(idee|on pourrait|plus tard)\b", fold(body)) else "note"
        tags = [m["id"] for m in self.kb.modules_in(body)][:5]
        n = self.mem.add_note(body, tags=tags, project=proj, kind=kind)
        if proj:
            self.mem.project_log(proj, "Note : " + body[:120])
        return self._resp(f"C'est noté ({kind}{', projet ' + proj if proj else ''}).", "note_add",
                          cards=[{"type": "note", "note": n}], suggestions=["Mes notes"])

    def _h_note_list(self, text, s, ctx):
        notes = self.mem.notes(project=ctx.get("project"), limit=20)
        if not notes:
            return self._resp("Aucune note pour l'instant. Dis « note que … » pour en ajouter une.", "note_list")
        return self._resp(f"{len(notes)} note(s), les plus récentes d'abord.", "note_list", cards=[{"type": "notes", "items": notes}])

    def _h_fact_set(self, text, s, ctx):
        self.mem.remember(s["key"], s["value"])
        if s["key"] == "prenom":
            return self._resp(f"Enchantée {s['value']} ! Je m'en souviendrai.", "fact_set")
        return self._resp(f"Retenu : {s['key']} = {s['value']}.", "fact_set")

    def _h_forget(self, text, s, ctx):
        target = fold(s.get("text", ""))
        removed = [k for k in self.mem.facts() if k in target or target in k]
        for k in removed:
            self.mem.forget(k)
        if removed:
            return self._resp("J'ai oublié : " + ", ".join(removed) + ".", "forget")
        return self._resp("Je n'ai rien trouvé à oublier sous ce nom. Tu peux effacer des notes depuis l'onglet Mémoire.", "forget")

    def _h_recall(self, text, s, ctx):
        hits = self.mem.search(text, 8)
        facts = self.mem.facts()
        lines = []
        if facts:
            lines.append("Ce que je sais de toi : " + "; ".join(f"{k} = {v}" for k, v in list(facts.items())[:6]) + ".")
        if hits:
            lines.append("Dans nos échanges et nos notes :")
            lines += [f"• [{h['kind']}] {h['title']} — {h['snippet']}" for h in hits[:6]]
        if not lines:
            lines.append("Je ne trouve rien là-dessus dans ma mémoire. Raconte-moi, je le noterai.")
        return self._resp("\n".join(lines), "recall", cards=[{"type": "memory", "items": hits}])

    # =============================================================== projets
    def _h_project_list(self, text, s, ctx):
        ps = self.mem.projects()
        user = []
        try:
            user = self.host.user_projects() if self.host else []
        except Exception:
            user = []
        if not ps and not user:
            return self._resp("On n'a pas encore de projet ensemble. Décris-moi ton idée !", "project_list",
                              suggestions=["Je veux faire une station météo", "Je veux faire une voiture télécommandée"])
        lines = [f"• {p['title']} — {p['status_label']}" + (f" ; prochaine étape : {p['next_step']}" if p["next_step"] else "") for p in ps[:10]]
        return self._resp("Nos projets :\n" + "\n".join(lines), "project_list",
                          cards=[{"type": "projects", "items": ps[:12]}, {"type": "pi_projects", "items": user[:20]}])

    def _h_project_resume(self, text, s, ctx):
        p = self.mem.find_project(text) or (self.mem.projects(active_only=True) or [None])[0]
        if not p:
            return self._resp("Aucun projet en cours. On en commence un ?", "project_resume", suggestions=["Nouveau projet"])
        log = p["log"][-3:]
        lines = [f"On reprend « {p['title']} » ({p['status_label']})."]
        if p["goal"]:
            lines.append("Objectif : " + p["goal"])
        if log:
            lines.append("Derniers pas : " + " ; ".join(e["text"] for e in log))
        nxt = p["next_step"] or NEXT_BY_STATUS.get(p["status"], "")
        if nxt:
            lines.append("Prochaine étape : " + nxt)
        cards = [{"type": "project", "project": p}]
        if p["modules"]:
            cards.append({"type": "generate", "title": p["title"], "modules": p["modules"], "board": p["board"] or "esp32", "project": p["id"]})
        return self._resp("\n".join(lines), "project_resume", cards=cards, project=p["id"],
                          suggestions=[f"Améliore {p['title']}", "Montre le câblage", "Flashe le worker 1 avec " + p["title"]])

    def _h_project_status(self, text, s, ctx):
        p = self.mem.find_project(s["project"]) or (self.mem.project(ctx["project"]) if ctx.get("project") else None)
        if not p:
            return self._resp("Je ne retrouve pas ce projet. Dis « mes projets » pour voir la liste.", "project_status")
        self.mem.upsert_project(p["title"], p["id"], status=s["status"], next_step=NEXT_BY_STATUS.get(s["status"], ""))
        self.mem.project_log(p["id"], "Statut : " + s["status"])
        r = self._resp(f"« {p['title']} » passe en {s['status']}.", "project_status", project=p["id"])
        if s["status"] == "termine":
            ideas = self.kb.improvements_for(p)
            if ideas:
                self.mem.add_followup(f"Tu veux améliorer « {p['title']} » ? Par exemple : {ideas[0].lower()}.", 86400, p["id"],
                                      [f"Améliore {p['title']}", "Plus tard", "Non merci"])
                r["answer"] += " Bravo ! Je te proposerai des améliorations la prochaine fois."
        return r

    def _h_project_new(self, text, s, ctx):
        mods = self.kb.modules_in(text)
        board = s.get("board") or _board_from_fact(self.mem.facts().get("carte preferee", "")) or None
        recs = self.kb.search(text, 5, kind="recipe")
        if not mods and recs:
            # Une recette complète du catalogue correspond : on part de là.
            best = recs[0]
            title = _title_from(text) or best["title"]
            p = self.mem.upsert_project(title, goal=text, status="conception", board=board or (best.get("boards") or ["esp32"])[0],
                                        modules=[], next_step=f"Vérifier la recette « {best['title']} » et le câblage")
            self.mem.project_log(p["id"], f"Recette de départ : {best['id']}")
            self.mem.add_followup(f"Le câblage de « {title} » est fait ? Je peux vérifier le montage avec toi.", 3600 * 6, p["id"],
                                  ["Oui, vérifie", "Pas encore"])
            lines = [f"Bonne idée ! Le catalogue a déjà un projet complet proche : « {best['title']} ».",
                     "Je l'ai enregistré comme point de départ de « " + title + " »."]
            lines += ["• " + a for a in self.kb.advice_for(text, None, p["board"])[:3]]
            return self._resp("\n".join(lines), "project_new", project=p["id"],
                              cards=[{"type": "catalog", "items": recs[:4]}, {"type": "project", "project": p}],
                              actions=[self._propose("open_page", {"page": "library", "q": {"p": best["id"]}}, f"Ouvrir la fiche « {best['title']} »")],
                              followup={"question": "Sur quelle carte ?", "choices": ["ESP32", "ESP32-S3", "ESP32-C3"]} if not board else None)
        if not mods:
            return self._resp("Super ! Pour bien le concevoir : que doit mesurer ou commander ton projet ?", "project_new",
                              followup={"question": "Que doit faire ton projet ?",
                                        "choices": ["Mesurer température et humidité", "Détecter une présence", "Commander un relais",
                                                    "Piloter des moteurs", "Afficher sur un écran"]},
                              cards=[{"type": "catalog", "items": recs[:4]}] if recs else [])
        title = _title_from(text) or ("Projet " + " + ".join(m["title"] for m in mods[:2]))
        board = board or "esp32"
        incompatible = [m["title"] for m in mods if board not in m.get("boards", [])]
        p = self.mem.upsert_project(title, goal=text, status="conception", board=board, modules=[m["id"] for m in mods],
                                    next_step="Vérifier le câblage puis générer le code")
        self.mem.add_followup(f"Le câblage de « {title} » est prêt ? On peut compiler et flasher un worker.", 3600 * 6, p["id"],
                              ["On compile", "Pas encore"])
        lines = [f"C'est parti pour « {title} » sur {BOARDS.get(board, {}).get('label', board)}.",
                 "Composants : " + ", ".join(m["title"] for m in mods) + "."]
        if incompatible:
            lines.append("Attention, pas compatible avec cette carte : " + ", ".join(incompatible) + ".")
        lines += ["• " + a for a in self.kb.advice_for(text, [m["id"] for m in mods], board)[:4]]
        lines.append("Le câblage et le code sont générés ci-dessous ; je peux les enregistrer et lancer la compilation sur le Pi.")
        acts = [self._propose("save_project", {"project": p["id"], "board": board}, "Enregistrer le code dans « Mes projets » du Pi")]
        return self._resp("\n".join(lines), "project_new", project=p["id"], actions=acts,
                          cards=[{"type": "generate", "title": title, "modules": [m["id"] for m in mods], "board": board, "project": p["id"]},
                                 {"type": "project", "project": p}],
                          suggestions=["Ajoute un écran OLED", "Compile-le pour " + BOARDS.get(board, {}).get("label", board), "Améliore-le"])

    def _h_improve(self, text, s, ctx):
        p = self.mem.find_project(text) or (self.mem.project(ctx["project"]) if ctx.get("project") else None) \
            or (self.mem.projects(active_only=True) or [None])[0]
        if not p:
            return self._resp("Quel projet veux-tu améliorer ? Dis « mes projets » pour la liste.", "improve")
        ideas = self.kb.improvements_for(p)
        advice = self.kb.advice_for(p["goal"] + " " + p["title"], p["modules"], p["board"])
        lines = [f"Idées pour améliorer « {p['title']} » :"] + [f"{i + 1}. {x}" for i, x in enumerate(ideas)]
        if advice:
            lines.append("Points de vigilance : " + " ".join(advice[:2]))
        lines.append("Laquelle on fait ?")
        return self._resp("\n".join(lines), "improve", project=p["id"],
                          followup={"question": "Quelle amélioration ?", "choices": ideas[:4], "project": p["id"]})

    # =============================================================== matériel
    def _h_status(self, text, s, ctx):
        st = ctx.get("lab") or {}
        workers = st.get("workers") or []
        online = [w for w in workers if w.get("state") not in ("OFFLINE", None)]
        lines = []
        if st:
            m = st.get("master") or {}
            lines.append(f"MASTER {m.get('version', '?')} : {len(online)}/{st.get('worker_capacity', 10)} workers en ligne.")
            busy = [w for w in online if w.get("state") not in ("IDLE", "READY")]
            if busy:
                lines.append("Occupés : " + ", ".join(f"W{w.get('id')} ({w.get('state')})" for w in busy[:6]) + ".")
            jobs = st.get("jobs") or {}
            if jobs:
                lines.append(f"Jobs : {jobs.get('running', 0)} en cours, {jobs.get('queued', 0)} en file.")
        else:
            lines.append("Je n'ai pas reçu l'état du MASTER (le S3 est peut-être injoignable depuis ce navigateur).")
        if self.host and getattr(self.host, "fleet", None) and self.host.fleet.fleet.vehicles:
            snap = self.host.fleet.snapshot()
            lines.append(f"Flotte : {len(snap['vehicles'])} véhicule(s), " + ("ARRÊT D'URGENCE actif." if snap["estop"] else "pilotage actif."))
        try:
            jobs = self.host.recent_builds() if self.host else []
        except Exception:
            jobs = []
        fails = [j for j in jobs if j.get("status") == "failed"][:2]
        if fails:
            lines.append("Compilations échouées récentes : " + ", ".join(f"{j['project']} ({j['board']})" for j in fails) + ". Je peux lire le journal.")
        return self._resp("\n".join(lines), "status", cards=[{"type": "lab"}], suggestions=["Lance un check-up", "Mes projets"])

    def _h_job(self, text, s, ctx):
        job = s["job"]
        wids = s.get("workers") or [0]
        acts = [self._propose("s3_job", {"type": job, "worker": w}, f"Job {job} " + (f"sur le worker {w}" if w else "sur le premier worker libre")) for w in wids[:10]]
        return self._resp(f"Je prépare le job {job}. Confirme pour l'envoyer au MASTER.", "job", actions=acts)

    def _h_flash(self, text, s, ctx):
        wids = s.get("workers") or []
        name = s.get("project") or ""
        target = None
        if name:
            p = self.mem.find_project(name)
            if p:
                target = {"id": p["id"], "title": p["title"], "board": p["board"], "source": "memoire"}
            else:
                hits = self.kb.search(name, 1)
                if hits:
                    target = {"id": hits[0]["id"], "title": hits[0]["title"], "board": (hits[0].get("boards") or ["esp32"])[0], "source": "catalogue"}
        if not wids:
            return self._resp("Quel worker dois-je flasher ? (ex. « flashe le worker 3 avec la station météo »)", "flash",
                              followup={"question": "Quel worker ?", "choices": [f"Worker {i}" for i in range(1, 5)]})
        if not target:
            return self._resp(f"Avec quel projet dois-je flasher le worker {wids[0]} ?", "flash",
                              suggestions=["Mes projets", "Cherche un projet dans la bibliothèque"])
        board = s.get("board") or target["board"] or "esp32"
        acts = [self._propose("flash", {"worker": w, "project": target["id"], "board": board, "title": target["title"]},
                              f"Compiler « {target['title']} » ({board}) sur le Pi puis flasher le worker {w} par OTA et vérifier son moniteur") for w in wids[:9]]
        lines = [f"Plan pour {len(acts)} worker(s) : compilation sur le Pi → vérification du modèle de carte → OTA autorisé par le S3 → "
                 "contrôle SHA-256 → surveillance du journal pendant 20 s pour confirmer que le programme tourne.",
                 "Confirme pour lancer. Rappel : le worker quitte le mode labo ; BOOT 3 s le ramène en mode worker."]
        if "voiture" in fold(text) or "vehicule" in fold(text):
            lines.append("Pour une voiture, flashe le firmware « vehicle » (firmware/vehicle) : il garde l'arrêt automatique et le protocole de pilotage.")
        return self._resp("\n".join(lines), "flash", actions=acts)

    def _h_verify(self, text, s, ctx):
        wids = s.get("workers") or []
        if not wids:
            return self._resp("Quel worker dois-je vérifier ? Je lis son journal et je juge si le programme fonctionne. "
                              "Tu peux aussi coller la sortie du moniteur série ici.", "verify")
        acts = [self._propose("verify", {"worker": w, "seconds": 20}, f"Lire le journal du worker {w} pendant 20 s et juger") for w in wids]
        return self._resp("Je lis le journal pendant 20 secondes puis je te donne mon verdict.", "verify", actions=acts)

    def _h_build(self, text, s, ctx):
        name = s.get("project") or ""
        p = self.mem.find_project(name) or (self.mem.project(ctx["project"]) if ctx.get("project") else None)
        pid = (p or {}).get("id") or (self.kb.search(name, 1) or [{}])[0].get("id")
        if not pid:
            return self._resp("Quel projet dois-je compiler ?", "build", suggestions=["Mes projets"])
        board = s.get("board") or (p or {}).get("board") or "esp32"
        act = self._propose("build", {"project": pid, "board": board}, f"Compiler {pid} pour {board} sur le Pi (aucun flash)")
        return self._resp(f"Je peux mettre « {pid} » en compilation sur le Pi pour {board}. Confirme pour lancer.", "build", actions=[act])

    def _h_apk(self, text, s, ctx):
        p = self.mem.find_project(text) or (self.mem.project(ctx["project"]) if ctx.get("project") else None)
        lines = ["Le Studio APK crée une application Android pour ton projet : écrans, boutons, jauges et courbes reliés à tes capteurs, "
                 "blocs « quand… alors… », voix. Le Pi l'assemble et la signe en quelques secondes, sans compiler, puis donne le lien direct et le QR."]
        acts = []
        if p:
            acts.append(self._propose("apk", {"project": p["id"], "title": p.get("title") or p["id"], "board": p.get("board") or "esp32",
                                              "modules": list(p.get("modules") or [])[:24]},
                                      f"Créer l'APK de « {p.get('title') or p['id']} » (une valeur et une courbe par mesure)"))
            lines.append("Je peux créer tout de suite une première version, puis tu la personnalises dans le Studio APK.")
        acts.append(self._propose("open_page", {"page": "apkstudio", "q": {"p": p["id"]} if p else {}}, "Ouvrir le Studio APK"))
        return self._resp("\n".join(lines), "apk", actions=acts)

    # ============================================================ véhicules
    def _h_estop(self, text, s, ctx):
        fleet = getattr(self.host, "fleet", None) if self.host else None
        wids = s.get("workers") or []
        if fleet:
            if wids:
                for w in wids:
                    try:
                        fleet.fleet.emergency_stop(f"V{w}")
                    except KeyError:
                        pass
            else:
                fleet.fleet.emergency_stop()
        target = ("véhicule(s) " + ", ".join(map(str, wids))) if wids else "toute la flotte"
        return self._resp(f"ARRÊT envoyé à {target}. Les moteurs sont coupés et le restent jusqu'à ce que tu lèves l'arrêt.", "estop",
                          cards=[{"type": "fleet"}], speak="Arrêt envoyé.")

    def _h_fleet_status(self, text, s, ctx):
        fleet = getattr(self.host, "fleet", None) if self.host else None
        if not fleet:
            return self._resp("Le pilotage n'est pas actif sur le Pi.", "fleet_status")
        snap = fleet.snapshot()
        if not snap["vehicles"]:
            return self._resp("Aucun véhicule inscrit. " + (f"{len(snap['announced'])} véhicule(s) se sont annoncés : place-les sur l'aire de jeu depuis l'écran Flotte." if snap.get("announced") else ""),
                              "fleet_status", cards=[{"type": "fleet"}])
        lines = [f"{v['id']} : {v['state']} en ({v['x']:.2f}; {v['y']:.2f}) m" + (f" — {v['note']}" if v["note"] else "") for v in snap["vehicles"]]
        return self._resp("\n".join(lines), "fleet_status", cards=[{"type": "fleet"}])

    def _h_drive(self, text, s, ctx):
        fleet = getattr(self.host, "fleet", None) if self.host else None
        if not fleet or not fleet.snapshot()["enabled"]:
            return self._resp("Le pilotage n'est pas prêt : flashe le firmware véhicule sur chaque voiture, renseigne NEXUS_FLEET_KEY sur le Pi "
                              "(même clé que firmware/vehicle/config.h) puis inscris les voitures dans l'écran Flotte.", "drive",
                              cards=[{"type": "fleet"}])
        f = fleet.fleet
        vids = [v for v in f.vehicles] if s.get("all") or not s.get("workers") else [f"V{w}" for w in s["workers"] if f"V{w}" in f.vehicles]
        if not vids:
            return self._resp("Je ne trouve pas ces véhicules dans la flotte inscrite.", "drive", cards=[{"type": "fleet"}])
        goals: dict[str, tuple[float, float]] = {}
        ar = f.arena
        if s.get("target"):
            x, y = s["target"]
            goals = {vid: (x, y) for vid in vids[:1]}
        elif s.get("formation"):
            goals = formation(f, vids, s["formation"])
        elif s.get("direction"):
            d = s.get("distance_m", ar.cell_m)
            for vid in vids:
                v = f.vehicles[vid]
                h = v.heading + {"avance": 0, "recule": math.pi, "gauche": math.pi / 2, "droite": -math.pi / 2}[s["direction"]]
                goals[vid] = (v.x + math.cos(h) * d, v.y + math.sin(h) * d)
        if not goals:
            return self._resp("Dis-moi où aller : « en 1,2 0,8 », « avance de 50 cm », « en ligne », « retour à la base ».", "drive")
        clipped = {}
        for vid, (x, y) in goals.items():
            cx = min(max(x, ar.cell_m / 2), ar.cols * ar.cell_m - ar.cell_m / 2)
            cy = min(max(y, ar.cell_m / 2), ar.rows * ar.cell_m - ar.cell_m / 2)
            clipped[vid] = (round(cx, 2), round(cy, 2))
        act = self._propose("fleet_goal", {"goals": {k: list(v) for k, v in clipped.items()}, "vmax": 0.25},
                            "Déplacer " + ", ".join(f"{k} → ({v[0]}; {v[1]}) m" for k, v in clipped.items()))
        return self._resp("Trajets calculés avec réservation de cellules : aucun véhicule n'entre dans une cellule déjà réservée. "
                          "Confirme pour démarrer ; « stop » arrête tout immédiatement.", "drive", actions=[act], cards=[{"type": "fleet"}])

    # ============================================================ diagnostic
    def _h_diagnose(self, text, s, ctx):
        log = s.get("log", text)
        res = diag.analyze(log)
        if res["findings"]:
            self.mem.add_note(res["summary"], title="Erreur : " + res["findings"][0]["title"], kind="erreur", project=ctx.get("project"),
                              tags=[res["kind"]])
            acts = []
            for f in res["findings"]:
                fix = f.get("auto_fix") or {}
                if fix.get("type") == "install_library" and fix.get("library"):
                    acts.append(self._propose("install_library", {"library": fix["library"]}, f"Installer la bibliothèque « {fix['library']} » sur le Pi"))
            return self._resp(res["summary"], "diagnose", cards=[{"type": "diagnosis", **res}], actions=acts)
        tips = ["Colle-moi le journal exact : compilation (les lignes autour de « error: »), flash (esptool) ou moniteur série à 115200 bauds.",
                "En attendant, les causes les plus fréquentes : alimentation insuffisante, masse non commune, mauvaise broche, capteur en 5 V sur une entrée 3,3 V."]
        return self._resp("\n".join(tips), "diagnose", cards=[{"type": "diagnosis", **res}])

    # ============================================================ connaissances
    def _h_wiring(self, text, s, ctx):
        mods = self.kb.modules_in(text)
        if not mods:
            hits = self.kb.search(text, 3, kind="module")
            mods = hits[:1]
        if not mods:
            return self._resp("Quel composant veux-tu brancher ?", "wiring", suggestions=["BME280", "HC-SR04", "Relais", "Écran OLED"])
        board = s.get("board") or "esp32"
        names = ", ".join(m["title"] for m in mods)
        lines = [f"Voici le câblage de {names} sur {BOARDS.get(board, {}).get('label', board)}, calculé sans conflit de broches."]
        lines += ["• " + a for a in self.kb.advice_for(text, [m["id"] for m in mods], board)[:3]]
        return self._resp("\n".join(lines), "wiring",
                          cards=[{"type": "generate", "title": names, "modules": [m["id"] for m in mods], "board": board, "show": "wiring"}])

    def _h_code(self, text, s, ctx):
        r = self._h_wiring(text, s, ctx)
        r["intent"] = "code"
        for c in r["cards"]:
            if c.get("type") == "generate":
                c["show"] = "code"
        if r["cards"]:
            r["answer"] = r["answer"].replace("Voici le câblage", "Voici le code et le câblage")
        return r

    def _h_advice(self, text, s, ctx):
        tips = self.kb.advice_for(text, None, s.get("board"))
        hits = self.kb.search(text, 4)
        lines = tips[:4] or ["Dis-m'en un peu plus sur l'usage (intérieur/extérieur, batterie ou secteur, précision voulue) et je te recommande le meilleur choix."]
        return self._resp("\n".join("• " + t for t in lines), "advice", cards=[{"type": "catalog", "items": hits}] if hits else [])

    def _h_question(self, text, s, ctx):
        hits = self.kb.search(text, 5)
        mem = self.mem.search(text, 3)
        if hits:
            lines = ["Dans la bibliothèque :"] + [f"• {self.kb.describe(h)}" for h in hits[:4]]
            if mem:
                lines.append("Dans nos notes : " + "; ".join(m["title"] for m in mem))
            lines.append("Pour une réponse rédigée sur n'importe quel sujet, active l'IA locale (Ollama) ou en ligne dans Patricia → Réglages.")
            return self._resp("\n".join(lines), "question", cards=[{"type": "catalog", "items": hits}])
        if mem:
            return self._resp("Voici ce que j'ai noté là-dessus :\n" + "\n".join(f"• {m['title']} — {m['snippet']}" for m in mem), "question",
                              cards=[{"type": "memory", "items": mem}])
        return self._resp("Je n'ai pas de réponse sûre hors ligne. Reformule avec le nom du composant, ou active l'IA dans Patricia → Réglages "
                          "pour les questions ouvertes.", "question", suggestions=["Que sais-tu faire ?"])

    # ================================================================ IA
    def _llm(self, text: str, session: str | None, ctx: dict, intent: str, client: ChatClient) -> dict:
        facts = self.mem.facts()
        projects = self.mem.projects(active_only=True)[:5]
        cat = self.kb.search(text, 6)
        memhits = self.mem.search(text, 5)
        lab = ctx.get("lab") or {}
        context = {
            "faits": facts,
            "projets_en_cours": [{k: p[k] for k in ("id", "title", "status", "board", "modules", "goal", "next_step")} for p in projects],
            "catalogue_correspondant": [{k: h.get(k) for k in ("id", "title", "kind", "boards", "libs")} for h in cat],
            "souvenirs": memhits,
            "labo": {"workers": [{k: w.get(k) for k in ("id", "state", "chip", "label")} for w in (lab.get("workers") or [])][:10]} if lab else "inconnu",
            "projet_ouvert": ctx.get("project"),
        }
        messages = [{"role": "system", "content": PERSONA + "\n\nContexte (JSON) :\n" + json.dumps(context, ensure_ascii=False)[:9000]}]
        for h in self.mem.history(session, 12)[:-1]:
            if h["role"] in ("user", "assistant"):
                messages.append({"role": h["role"], "content": h["text"][:2000]})
        messages.append({"role": "user", "content": text})
        cards: list[dict] = []
        actions: list[dict] = []
        content = ""
        for _ in range(4):
            out = client.chat(messages, TOOLS)
            calls = out["tool_calls"]
            if not calls:
                content = out["content"]
                break
            messages.append({"role": "assistant", "content": out["content"] or "", "tool_calls": calls})
            for call in calls[:6]:
                fn = (call.get("function") or {})
                try:
                    args = json.loads(fn.get("arguments") or "{}")
                except ValueError:
                    args = {}
                result = self._tool(fn.get("name", ""), args if isinstance(args, dict) else {}, cards, actions, ctx)
                messages.append({"role": "tool", "tool_call_id": call.get("id", ""), "content": json.dumps(result, ensure_ascii=False)[:6000]})
        if not content:
            content = "J'ai préparé ce qu'il faut ci-dessous." if (cards or actions) else "Je n'ai pas pu formuler de réponse."
        r = self._resp(content, intent, mode="ia", cards=cards, actions=actions)
        mods = self.kb.modules_in(text)
        if mods and intent in ("project_new", "wiring", "code") and not any(c["type"] == "generate" for c in cards):
            cards.append({"type": "generate", "title": ", ".join(m["title"] for m in mods), "modules": [m["id"] for m in mods],
                          "board": _board_from_fact(facts.get("carte preferee", "")) or "esp32", "show": "code" if intent == "code" else "wiring"})
        return r

    def _tool(self, name: str, a: dict, cards: list, actions: list, ctx: dict) -> Any:
        try:
            if name == "search_catalog":
                hits = self.kb.search(str(a.get("query", "")), 6)
                if hits:
                    cards.append({"type": "catalog", "items": hits[:4]})
                return [{k: h.get(k) for k in ("id", "title", "kind", "boards", "libs")} for h in hits]
            if name == "search_memory":
                return self.mem.search(str(a.get("query", "")), 8)
            if name == "add_note":
                n = self.mem.add_note(str(a.get("text", "")), title=str(a.get("title", "")), project=a.get("project") or ctx.get("project"),
                                      kind=str(a.get("kind", "note")))
                return {"ok": True, "id": n["id"]}
            if name == "save_project":
                mods = [m for m in (a.get("modules") or []) if isinstance(m, str) and self.kb.get(m)]
                p = self.mem.upsert_project(str(a.get("title", "Projet")), a.get("id") or None, goal=str(a.get("goal", "")),
                                            board=a.get("board") if a.get("board") in BOARDS else None, modules=mods,
                                            status=a.get("status") if a.get("status") in NEXT_BY_STATUS else "conception",
                                            next_step=str(a.get("next_step", "")))
                cards.append({"type": "project", "project": p})
                if mods:
                    cards.append({"type": "generate", "title": p["title"], "modules": mods, "board": p["board"] or "esp32", "project": p["id"]})
                return {"ok": True, "id": p["id"], "modules_retenus": mods}
            if name == "diagnose_log":
                res = diag.analyze(str(a.get("log", "")), str(a.get("kind", "auto")))
                cards.append({"type": "diagnosis", **res})
                return res
            if name == "propose_action":
                kind = str(a.get("kind", ""))
                if kind not in ACTIONS:
                    return {"ok": False, "error": "type d'action inconnu", "types": list(ACTIONS)}
                params = a.get("params") if isinstance(a.get("params"), dict) else {}
                act = self._propose(kind, params, str(a.get("summary", kind))[:300])
                actions.append(act)
                return {"ok": True, "proposee": True, "id": act["id"], "note": "En attente de confirmation de l'utilisateur ; pas encore exécutée."}
            if name == "lab_state":
                return ctx.get("lab") or {"inconnu": True}
        except (ValueError, KeyError) as e:
            return {"ok": False, "error": str(e)}
        return {"ok": False, "error": "outil inconnu"}

    # ======================================================== exécution d'actions
    def confirm(self, aid: str) -> dict:
        a = self.mem.action(aid)
        if not a:
            raise KeyError("Proposition inconnue.")
        if a["status"] != "proposed":
            raise ValueError("Cette proposition a déjà été traitée.")
        if a["expired"]:
            self.mem.set_action(aid, "expired")
            raise ValueError("Proposition expirée : redemande-la à Patricia.")
        executor, _ = ACTIONS[a["kind"]]
        if executor == "ui":
            self.mem.set_action(aid, "confirmed")
            return {"execute_in_ui": True, "kind": a["kind"], "params": a["params"], "id": aid}
        p = a["params"]
        try:
            if a["kind"] == "build":
                res = self.host.queue_build(p["project"], p.get("board", "esp32"))
            elif a["kind"] == "save_project":   # le code est généré dans le navigateur, qui l'envoie au Pi
                self.mem.set_action(aid, "confirmed")
                return {"execute_in_ui": True, "kind": "save_project", "params": p, "id": aid}
            elif a["kind"] == "install_library":
                res = self.host.install_library(p["library"])
            elif a["kind"] == "fleet_goal":
                fleet = self.host.fleet.fleet
                if fleet.estop:
                    raise ValueError("Arrêt d'urgence actif : lève-le d'abord dans l'écran Flotte.")
                res = {vid: len(fleet.set_goal(vid, x, y, p.get("vmax", 0.25))) for vid, (x, y) in p["goals"].items()}
            elif a["kind"] == "fleet_register":
                res = self.host.fleet.fleet.register(p["vid"], p["x"], p["y"], p.get("heading", 0.0)).vid
            else:
                raise ValueError("Action non exécutable sur le Pi.")
        except Exception as e:
            self.mem.set_action(aid, "failed", str(e))
            raise
        self.mem.set_action(aid, "done", res)
        self._remember_action(a, True, res)
        return {"execute_in_ui": False, "kind": a["kind"], "result": res, "id": aid}

    def cancel(self, aid: str) -> None:
        a = self.mem.action(aid)
        if a and a["status"] == "proposed":
            self.mem.set_action(aid, "cancelled")

    def report(self, aid: str, ok: bool, details: Any = None, serial_log: str = "") -> dict:
        """L'interface rend compte d'une action exécutée côté MASTER (flash, job, vérification)."""
        a = self.mem.action(aid)
        if not a:
            raise KeyError("Proposition inconnue.")
        verdict = None
        if serial_log:
            verdict = diag.verify_run(serial_log)
            ok = ok and verdict["verdict"] != "echec"
        self.mem.set_action(aid, "done" if ok else "failed", {"details": details, "verdict": verdict})
        self._remember_action(a, ok, details, verdict)
        msg = _report_text(a, ok, verdict)
        return {"ok": ok, "verdict": verdict, "answer": msg, "speak": _speakable(msg)}

    def _remember_action(self, a: dict, ok: bool, res: Any, verdict: dict | None = None) -> None:
        pid = a["params"].get("project")
        if pid and self.mem.project(pid):
            self.mem.project_log(pid, ("✓ " if ok else "✗ ") + a["summary"][:200])
            if a["kind"] == "flash" and ok:
                self.mem.upsert_project(self.mem.project(pid)["title"], pid, status="test", next_step="Vérifier les mesures sur le banc et noter les valeurs")
        if not ok and verdict and verdict.get("findings"):
            self.mem.add_note(f"{a['summary']} : {', '.join(verdict['reasons'])}", title="Échec : " + a["kind"], kind="erreur", project=pid)


# ---------------------------------------------------------------- outils IA
TOOLS = [
    tool_schema("search_catalog", "Cherche dans les 320 projets/capteurs du catalogue NEXUS (câblage, bibliothèques).",
                {"query": {"type": "string"}}, ["query"]),
    tool_schema("search_memory", "Cherche dans la mémoire de Patricia (notes, projets, anciennes conversations).",
                {"query": {"type": "string"}}, ["query"]),
    tool_schema("add_note", "Enregistre une note durable.", {"text": {"type": "string"}, "title": {"type": "string"},
                "kind": {"type": "string", "enum": ["note", "idee", "mesure", "decision", "rappel", "erreur"]}, "project": {"type": "string"}}, ["text"]),
    tool_schema("save_project", "Crée ou met à jour un projet dans le journal (modules = identifiants du catalogue).",
                {"title": {"type": "string"}, "id": {"type": "string"}, "goal": {"type": "string"}, "board": {"type": "string", "enum": list(BOARDS)},
                 "modules": {"type": "array", "items": {"type": "string"}}, "status": {"type": "string"}, "next_step": {"type": "string"}}, ["title"]),
    tool_schema("diagnose_log", "Analyse un journal de compilation, de flash ou de moniteur série.",
                {"log": {"type": "string"}, "kind": {"type": "string", "enum": ["auto", "compile", "upload", "serial"]}}, ["log"]),
    tool_schema("propose_action", "Propose une action à l'utilisateur, qui devra la confirmer. kinds : " + ", ".join(ACTIONS) +
                ". params : s3_job {type, worker} ; flash {worker, project, board} ; build {project, board} ; apk {project} ; "
                "fleet_goal {goals: {V1: [x, y]}} ; open_page {page} ; verify {worker}.",
                {"kind": {"type": "string", "enum": list(ACTIONS)}, "params": {"type": "object"}, "summary": {"type": "string"}}, ["kind", "params", "summary"]),
    tool_schema("lab_state", "Renvoie l'état du MASTER et des workers vu par l'interface.", {}),
]

LLM_INTENTS = {"question", "advice", "improve", "project_new", "code", "wiring", "help", "project_resume", "recall"}
NEXT_BY_STATUS = {"idee": "Choisir les composants", "conception": "Vérifier le câblage puis générer le code",
                  "cablage": "Câbler sur la plaque d'essai et vérifier les tensions", "code": "Compiler sur le Pi et flasher un worker",
                  "test": "Vérifier les mesures et noter les valeurs", "termine": "", "pause": ""}


def formation(fleet, vids: list[str], kind: str) -> dict:
    ar = fleet.arena
    n = len(vids)
    if kind == "ligne":
        row = 0
        return {vid: ar.center((min(ar.cols - 1, i * max(1, ar.cols // max(n, 1))), row)) for i, vid in enumerate(vids)}
    if kind == "cercle":
        cx, cy = ar.cols * ar.cell_m / 2, ar.rows * ar.cell_m / 2
        r = min(cx, cy) - ar.cell_m
        return {vid: (cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i, vid in enumerate(vids)}
    # base : colonne de gauche, dans l'ordre
    return {vid: ar.center((0, min(ar.rows - 1, i))) for i, vid in enumerate(vids)}


def _title_from(text: str) -> str:
    m = re.search(r"(?:faire|creer|créer|construire|fabriquer|réaliser|realiser|monter|concevoir)\s+(?:(?:une|un|les|le|la|des|du)\s+|l['’])?(.{4,60}?)(?:\s+avec\b|\s+pour\b|\s+sur\b|[.,!?]|$)", text, re.I)
    return m.group(1).strip().capitalize() if m else ""


def _board_from_fact(v: str) -> str | None:
    f = fold(v)
    return "esp32s3" if "s3" in f else "esp32c3" if "c3" in f else "esp32" if "esp32" in f else None


def _speakable(text: str) -> str:
    t = re.sub(r"[•#*`_>]", " ", text)
    t = re.sub(r"\(.*?\)", "", t)
    t = re.sub(r"https?://\S+", "", t)
    t = " ".join(t.split())
    return t[:400]


def _report_text(a: dict, ok: bool, verdict: dict | None) -> str:
    if a["kind"] == "flash" or a["kind"] == "verify":
        if verdict:
            v = verdict["verdict"]
            head = {"ok": "Ça marche ! ", "echec": "Ça ne fonctionne pas encore. ", "incertain": "Je ne peux pas encore conclure. "}[v]
            body = "; ".join(verdict["reasons"])
            fix = ""
            bad = [f for f in verdict["findings"] if f.get("severity") == "bad"]
            if bad and bad[0].get("fixes"):
                fix = " Correction proposée : " + bad[0]["fixes"][0]
            return head + body + "." + fix
        return ("Flash terminé." if ok else "Le flash a échoué.") + " Lance une vérification pour lire son moniteur."
    return ("Fait : " if ok else "Échec : ") + a["summary"]
