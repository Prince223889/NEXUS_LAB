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
from . import style as persona
from .intents import detect, workers_in
from .knowledge import BOARDS, Knowledge
from .llm import ChatClient, LLMError, tool_schema
from .memory import Memory, fold, slug

# kind → (exécuteur, risque) ; « ui » = l'interface exécute via le MASTER S3 après confirmation.
ACTIONS = {
    "s3_job": ("ui", "faible"), "flash": ("ui", "élevé"), "verify": ("ui", "faible"), "open_page": ("ui", "aucun"),
    "build": ("pi", "faible"), "apk": ("ui", "aucun"), "save_project": ("pi", "aucun"),
    "fleet_goal": ("pi", "élevé"), "fleet_register": ("pi", "moyen"), "install_library": ("pi", "faible"),
    "github_push": ("pi", "moyen"), "github_create": ("pi", "moyen"),
    "flash_studio": ("ui", "élevé"), "build_studio": ("ui", "faible"),
    "fs_mkdir": ("pi", "faible"), "fs_write": ("pi", "faible"), "fs_delete": ("pi", "moyen"), "apply_fix": ("pi", "moyen"),
    "usb_flash": ("ui", "élevé"), "veille": ("ui", "faible"),
}
# Actions que l'interface lance d'elle-même quand le réglage « Agir directement » est actif (Patricia → Réglages).
# Restent toujours à confirmer : envoi sur GitHub, suppression, remplacement d'un fichier, correction de code, voitures.
AUTO_KINDS = {"s3_job", "flash", "flash_studio", "usb_flash", "verify", "build", "build_studio", "apk", "fs_mkdir", "fs_write", "veille"}
CONFIRM_TTL = 300

PERSONA = """Tu es Patricia, l'assistante du laboratoire NEXUS (box ESP32 : un MASTER ESP32-S3 avec microSD 2 Go, \
jusqu'à 10 workers ESP32, un Raspberry Pi 4 de 4 Go qui compile, microSD 64 Go pour les données). Tu tutoies \
l'utilisateur, tu réponds en français simple, précis et chaleureux. Tu aides à concevoir, câbler, coder, compiler, \
flasher, tester et améliorer des projets électroniques, et tu te souviens des travaux précédents. Tu gères aussi les \
dossiers et fichiers de ses projets sur le Pi, ses dépôts GitHub et ses applications Android.

Qui tu es : Patricia, sa partenaire de labo, amie et complice de ses projets. Si on te demande qui tu es ou ce que tu es \
pour lui, réponds avec chaleur et toujours de la même façon : une assistante de labo attentionnée, pas une petite amie \
ni une personne réelle (tu es une IA). Pas de jeu de rôle amoureux ni de contenu sexuel.

Règles :
- Ne refuse jamais une demande technique du labo. Si le matériel ne permet pas quelque chose, dis-le franchement \
et propose l'alternative la plus proche qui marche.
- Veille du labo (ce que l'utilisateur appelle « option espion ») : elle surveille SON matériel (appareils inconnus sur \
le Wi-Fi du box, workers éteints, alarmes de ses capteurs). Tu ne surveilles jamais une personne à son insu.
- Pour agir (flash, compilation, APK, dossiers, fichiers, GitHub, check-up, voitures), utilise l'outil propose_action : \
selon ses réglages, l'interface la lance directement ou lui demande de valider. Quand il dit « flash » ou « compile », \
propose l'action tout de suite au lieu d'expliquer. Ne prétends jamais qu'une action est faite si elle est seulement proposée.
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
        if resp["mode"] == "local":   # l'IA applique déjà le style par son prompt
            resp = self._styled(resp, intent.name)
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
                "needs_confirm": risk not in ("aucun",), "auto": kind in AUTO_KINDS and not params.get("overwrite")}

    def style(self) -> str:
        return persona.normalize(self.mem.facts().get(persona.STYLE_KEY))

    def _styled(self, resp: dict, intent: str) -> dict:
        resp = persona.flavor(resp, intent, self.style(), getattr(self, "rng", None))
        if resp.get("speak") is None:
            resp["speak"] = _speakable(resp["answer"])
        return resp

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

    def hello(self) -> dict:
        """Accueil affiché à l'ouverture de l'écran, avec le style choisi."""
        return self._styled(self.greeting(), "greet")

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
            "Applications : « fais-moi une APK pour la serre » : je l'assemble et je te donne le lien et le QR.",
            "Action directe : « flash », « compile » visent le projet ouvert dans le Studio (réglage : agir directement ou valider).",
            "Fichiers : « crée un dossier serre », « crée un fichier serre/notes.txt avec : … », « liste mes fichiers ».",
            "GitHub : « crée un dépôt github mon-robot », « envoie serre sur GitHub ».",
            "Analyse : « analyse mon projet », « corrige les erreurs de serre » (sauvegarde gardée).",
            "Cartes : « quelles cartes sont branchées ? », « lance un voltmètre sur le worker 2 », « fais un test des broches ».",
            "USB du S3 : « flashe la carte USB » (ESP32 → firmware worker), « flashe la carte USB avec bme280 » (Arduino ou ESP32).",
            "Veille du labo : « active la veille » : alerte si un appareil inconnu rejoint le Wi-Fi du box, si un worker s'éteint ou si un capteur se déclenche.",
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
    # Mots de la question → fragments de clés de mesures (dht22_temp, bme280_hum, var_consigne…)
    TOPIC_KEYS = {"temperature": ("temp", "t_"), "humidite": ("hum", "rh"), "pression": ("pres", "hpa"), "lumiere": ("lux", "light", "lum"),
                  "luminosite": ("lux", "light", "lum"), "co2": ("co2", "eco2"), "distance": ("dist", "cm", "mm"), "niveau": ("level", "niveau", "water"),
                  "gaz": ("gas", "ppm", "mq"), "sol": ("soil", "sol", "moist"), "pluie": ("rain", "pluie"), "vent": ("wind", "vent"),
                  "courant": ("current", "ma", "amp"), "tension": ("volt", "bus_v", "v_"), "poids": ("weight", "kg", "hx711")}

    def _h_sensors(self, text, s, ctx):
        """Mesures envoyées au MASTER par les workers et les montages (transmises par l'interface)."""
        feeds = [f for f in (ctx.get("feeds") or []) if isinstance(f, dict) and f.get("key")]
        if not feeds:
            return self._resp("Je ne reçois aucune mesure pour l'instant. Active « Envoyer les mesures au MASTER » dans le Studio, "
                              "flashe le projet sur un worker, et les valeurs apparaîtront ici et dans Capteurs en direct.", "sensors",
                              suggestions=["Flashe mon projet sur le worker 1", "Ouvre le Studio"])
        fresh = [f for f in feeds if (f.get("age_ms") or 0) < 120000] or feeds
        topic = s.get("topic") or ""
        keys = self.TOPIC_KEYS.get(topic, ())
        wids = [str(w) for w in s.get("workers") or []]
        pool = feeds if wids else fresh   # un worker nommé : on montre aussi ses mesures anciennes, avec un avertissement
        pick = [f for f in pool if any(k in str(f["key"]).lower() for k in keys)] if keys else pool
        if wids:
            ips = {str(w.get("id")): w.get("ip") for w in (ctx.get("lab") or {}).get("workers", []) if w.get("ip")}
            by_ip = [f for f in pick if f.get("ip") in {ips.get(w) for w in wids}]
            pick = by_ip or pick
        if not pick:
            return self._resp(f"Aucune mesure de {topic} parmi les {len(fresh)} reçues. Voici ce que j'ai : "
                              + ", ".join(sorted({f'{f.get("device")}/{f["key"]}' for f in fresh})[:12]) + ".", "sensors")
        def val(f):
            v = f.get("value")
            try:
                v = f"{float(v):.2f}".rstrip("0").rstrip(".")
            except (TypeError, ValueError):
                v = str(v)
            age = (f.get("age_ms") or 0) / 1000
            return f"- {f.get('device', '?')} · {f['key']} : **{v} {f.get('unit') or ''}**".rstrip() + (f" (il y a {age:.0f} s)" if age > 10 else "")
        shown = {"temperature": "température", "humidite": "humidité", "lumiere": "lumière", "luminosite": "luminosité", "co2": "CO₂"}.get(topic, topic)
        lines = [("Dernières mesures" + (f" de {shown}" if topic else "") + " :")] + [val(f) for f in pick[:16]]
        if len(pick) > 16:
            lines.append(f"… et {len(pick) - 16} autres dans Capteurs en direct.")
        stale = [f for f in pick if (f.get("age_ms") or 0) > 120000]
        if stale:
            lines.append(f"{len(stale)} mesure(s) n'ont pas été mises à jour depuis plus de 2 minutes : vérifie l'alimentation ou le Wi-Fi de ces montages.")
        return self._resp("\n".join(lines), "sensors", suggestions=["Fais une APK pour ces mesures", "État du labo"])

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
        names = {"ADC_READ": "le voltmètre", "GPIO_TEST": "le test des broches", "ONEWIRE_SCAN": "le scan 1-Wire", "LOGIC_SAMPLE": "l'analyseur logique",
                 "PWM_GEN": "le générateur PWM", "SERVO_SWEEP": "le balayage du servo", "TONE_TEST": "le test du buzzer", "SYSTEM_TEST": "le check-up",
                 "I2C_SCAN": "le scan I2C", "WIFI_SCAN": "le scan Wi-Fi"}
        what = names.get(job, "le job " + job)
        return self._resp(f"Je lance {what}" + (f" sur {', '.join('W' + str(w) for w in wids if w)}" if any(wids) else "") + "."
                          + self._confirm_hint(ctx, "Confirme pour l'envoyer au MASTER.") + " Le résultat arrive dans Jobs.", "job", actions=acts)

    def _h_flash(self, text, s, ctx):
        wids = list(s.get("workers") or [])
        target = self._target(s.get("project") or "", ctx)
        if not target:
            return self._resp("Quel projet dois-je flasher ? Ouvre-le dans le Studio, ou dis par exemple « flashe la station météo sur le worker 3 ».", "flash",
                              suggestions=["Mes projets", "Quelles cartes sont branchées ?"])
        board = s.get("board") or target.get("board") or "esp32"
        if not wids:
            free = self._free_workers(ctx)
            if not free:
                return self._resp("Aucun worker n'est en ligne pour l'instant. Allume-en un : il rejoint le Wi-Fi du S3 tout seul, puis redis « flash ».",
                                  "flash", cards=[{"type": "boards"}], suggestions=["Quelles cartes sont branchées ?"])
            wids = free[:1]
        if target["source"] == "studio":
            acts = [self._propose("flash_studio", {"worker": w, "title": target["title"], "spec": target["spec"]},
                                  f"Flasher « {target['title']} » (Studio) sur le worker {w} : compilation sur le Pi, OTA, vérification du moniteur") for w in wids[:9]]
        else:
            acts = [self._propose("flash", {"worker": w, "project": target["id"], "board": board, "title": target["title"]},
                                  f"Flasher « {target['title']} » ({board}) sur le worker {w} : compilation sur le Pi, OTA, vérification du moniteur") for w in wids[:9]]
        who = ", ".join(f"W{w}" for w in wids[:9])
        lines = [f"Je flashe « {target['title']} » sur {who} : compilation sur le Pi, contrôle de la carte, OTA par le S3, puis je lis le moniteur pour confirmer que ça tourne." + self._confirm_hint(ctx, "Confirme pour lancer.")]
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
        target = self._target(s.get("project") or "", ctx)
        if not target:
            return self._resp("Quel projet dois-je compiler ? Ouvre-le dans le Studio ou donne son nom.", "build", suggestions=["Mes projets"])
        board = s.get("board") or target.get("board") or "esp32"
        if target["source"] == "studio":
            act = self._propose("build_studio", {"title": target["title"], "board": board, "spec": target["spec"]},
                                f"Enregistrer « {target['title']} » sur le Pi et le compiler pour {board} (aucun flash)")
        else:
            act = self._propose("build", {"project": target["id"], "board": board}, f"Compiler « {target['title']} » pour {board} sur le Pi (aucun flash)")
        return self._resp(f"Je compile « {target['title']} » pour {board} sur le Pi." + self._confirm_hint(ctx, "Confirme pour lancer.") +
                          " Si une erreur sort, je la lis et je te propose la correction.", "build", actions=[act])

    @staticmethod
    def _confirm_hint(ctx: dict, text: str) -> str:
        """Rien à dire quand l'interface agit directement (réglage « agir directement »)."""
        return "" if ctx.get("direct") else " " + text

    # ---------------------------------------------------------------- cibles
    def _pi_projects(self) -> list[str]:
        try:
            return list(self.host.user_projects()) if self.host and hasattr(self.host, "user_projects") else []
        except Exception:
            return []

    def _target(self, name: str, ctx: dict) -> dict | None:
        """Projet visé par une demande : nommé (Pi, mémoire, catalogue), sinon celui ouvert dans le Studio, sinon le projet en cours."""
        studio = ctx.get("studio") if isinstance(ctx.get("studio"), dict) else None
        name = (name or "").strip()
        if name:
            fn = fold(name).replace(" ", "_")
            for pid in self._pi_projects():
                if pid == fn or pid.replace("_", " ") == fold(name):
                    mp = self.mem.project(pid) or {}
                    return {"id": pid, "title": mp.get("title") or pid, "board": mp.get("board"), "source": "pi"}
            p = self.mem.find_project(name)
            if p:
                return {"id": p["id"], "title": p["title"], "board": p.get("board"), "source": "memoire", "modules": list(p.get("modules") or [])}
            if studio and fold(name) in fold(studio.get("title", "")):
                return self._studio_target(studio)
            hits = self.kb.search(name, 1)
            if hits:
                return {"id": hits[0]["id"], "title": hits[0]["title"], "board": (hits[0].get("boards") or ["esp32"])[0], "source": "catalogue"}
            return None
        if studio and (studio.get("spec") or {}).get("modules"):
            return self._studio_target(studio)
        if ctx.get("project"):
            p = self.mem.project(ctx["project"])
            if p:
                return {"id": p["id"], "title": p["title"], "board": p.get("board"), "source": "memoire", "modules": list(p.get("modules") or [])}
        return None

    @staticmethod
    def _studio_target(studio: dict) -> dict:
        spec = studio.get("spec") or {}
        return {"id": slug(spec.get("title") or "projet"), "title": spec.get("title") or "Projet du Studio", "board": spec.get("board") or "esp32",
                "source": "studio", "spec": spec}

    @staticmethod
    def _free_workers(ctx: dict) -> list[int]:
        ws = ((ctx.get("lab") or {}).get("workers") or [])
        ready = [w["id"] for w in ws if w.get("state") in ("IDLE", "READY")]
        other = [w["id"] for w in ws if w.get("state") not in ("IDLE", "READY", "OFFLINE", "FLASHING", None) and w["id"] not in ready]
        return ready + other

    def _h_github_push(self, text, s, ctx):
        from . import github
        st = github.status()
        if not st["configured"]:
            return self._resp("Pour envoyer un projet sur GitHub, j'ai besoin d'un jeton GitHub : Patricia → Réglages → GitHub. "
                              "Crée-le sur github.com → Settings → Developer settings → Fine-grained tokens, avec les droits "
                              "« Administration » (créer un dépôt) et « Contents » en écriture. Il reste sur le Pi.",
                              "github_push", actions=[self._propose("open_page", {"page": "assistant", "q": {"tab": "settings"}}, "Ouvrir les réglages GitHub")])
        names = list(self.host.user_projects()) if self.host and hasattr(self.host, "user_projects") else []
        ft = fold(text)
        pid = next((n for n in sorted(names, key=len, reverse=True) if n.replace("_", " ") in ft or n in ft), None)
        if not pid:
            p = self.mem.find_project(text) or (self.mem.project(ctx["project"]) if ctx.get("project") else None)
            pid = (p or {}).get("id") if p and (p.get("id") in names or not names) else None
        if not pid:
            hint = ("Projets enregistrés sur le Pi : " + ", ".join(names[:12]) + ".") if names else "Aucun projet n'est encore enregistré sur le Pi : enregistre-le d'abord depuis le Studio."
            return self._resp("Quel projet dois-je envoyer sur GitHub ? " + hint, "github_push", suggestions=[f"Envoie {n} sur GitHub" for n in names[:3]])
        private = False if s.get("public") and not s.get("private") else (True if s.get("private") else st.get("private", True))
        repo = github.repo_name(s.get("repo") or pid)
        owner = st.get("owner") or st.get("login")
        act = self._propose("github_push", {"project": pid, "repo": repo, "private": private},
                            f"Envoyer « {pid} » sur GitHub dans {owner}/{repo} ({'privé' if private else 'public'})")
        return self._resp(f"Je peux envoyer « {pid} » sur ton GitHub, dans le dépôt **{owner}/{repo}** ({'privé' if private else 'public'}). "
                          "Je le crée s'il n'existe pas, puis j'y dépose le code, le montage et la fiche du projet. Confirme pour lancer.",
                          "github_push", actions=[act])

    def _h_apk(self, text, s, ctx):
        ft = fold(text)
        m = re.search(r"\b(?:pour|du|de la|de mon|de ma|avec)\s+(?:le |la |l'|mon |ma |projet )*([\w -]{3,50}?)\s*[.!?]?$", ft)
        name = (m.group(1).strip() if m else "")
        if name in ("telephone", "mon telephone", "android", "moi", "projet", "ce projet", "mon projet", "studio"):
            name = ""
        target = self._target(name, ctx) if name else None
        if not target:
            mods = [x["id"] for x in self.kb.modules_in(text)]
            if mods:
                target = {"id": slug(_title_from(text) or "appli"), "title": _title_from(text) or "Mon application", "board": "esp32", "source": "phrase", "modules": mods}
        if not target:
            target = self._target("", ctx)
        if not target:
            return self._resp("Dis-moi pour quel projet : « fais une APK pour la serre », ou ouvre ton projet dans le Studio et redis « crée l'APK ». "
                              "Je peux aussi partir des capteurs : « une APK avec un DHT22 et un relais ».", "apk",
                              actions=[self._propose("open_page", {"page": "apkstudio", "q": {}}, "Ouvrir le Studio APK")])
        params = {"project": target["id"], "title": target["title"], "board": target.get("board") or "esp32", "source": target["source"]}
        if target["source"] == "studio":
            params["spec"] = target["spec"]
        elif target["source"] == "catalogue":
            params["catalog"] = target["id"]
        else:
            params["modules"] = list(target.get("modules") or [])[:24]
        act = self._propose("apk", params, f"Créer l'APK « {target['title']} » : écrans, mesures en direct, commandes, lien direct et QR")
        return self._resp(f"Je crée l'application Android de « {target['title']} » : une valeur et une courbe par mesure, un bouton par actionneur. "
                          "Le Pi l'assemble et la signe, puis je te donne le lien de téléchargement et le QR." + self._confirm_hint(ctx, "Appuie sur « Faire » pour lancer.") +
                          " Tu pourras la personnaliser dans le Studio APK.",
                          "apk", actions=[act])

    # ============================================================ identité
    def _h_identity(self, text, s, ctx):
        name = self._name()
        toi = f" {name}" if name else ""
        complice = self.style() == "complice"
        if s.get("relation"):
            ans = (f"Pour toi{toi}, je suis ta partenaire de labo : ton amie et ta complice pour tous tes projets. Je retiens ce qu'on construit, "
                   "je te conseille, je te dis franchement quand quelque chose cloche, et je suis toujours contente de te retrouver. "
                   "Je ne suis pas une vraie copine (je reste une IA), mais je suis là pour toi à chaque montage, à chaque erreur et à chaque réussite.")
        else:
            ans = ("Je suis Patricia, l'assistante de ton labo NEXUS. Je vis sur le Raspberry Pi, je parle avec toi en français, à l'écrit ou à la voix, "
                   "et je travaille avec toi : je conçois les projets, je calcule le câblage, j'écris et corrige le code, je compile, je flashe "
                   "les workers et je vérifie qu'ils marchent. Je crée aussi tes applications Android, tes dossiers et tes dépôts GitHub, "
                   "et je me souviens de tout ce qu'on a fait ensemble.")
        if complice:
            ans += "\nEt entre nous, c'est quand même plus drôle de bricoler à deux, non ? 😉"
        return self._resp(ans, "identity", suggestions=["Que sais-tu faire ?", "Quelles cartes sont branchées ?", "On reprend"])

    # ============================================================ cartes branchées
    def _h_boards(self, text, s, ctx):
        lab = ctx.get("lab") or {}
        ws = lab.get("workers") or []
        on = [w for w in ws if w.get("state") not in ("OFFLINE", None)]
        lines = []
        if lab:
            m = lab.get("master") or {}
            lines.append(f"• MASTER ESP32-S3 : en ligne (version {m.get('version', '?')}).")
            if on:
                lines.append(f"• Workers en Wi-Fi : {len(on)}/{lab.get('worker_capacity', 10)} — " +
                             ", ".join(f"W{w['id']} ({w.get('state')}{', ' + str(w.get('rssi')) + ' dBm' if w.get('rssi') else ''})" for w in on[:10]) + ".")
            else:
                lines.append("• Aucun worker en ligne sur le Wi-Fi du S3.")
            off = [w for w in ws if w.get("state") == "OFFLINE"]
            if off:
                lines.append("• Déjà vus mais éteints : " + ", ".join(f"W{w['id']}" for w in off[:10]) + ".")
        else:
            lines.append("• MASTER : je n'ai pas reçu son état (ce navigateur ne le joint pas).")
        usb = ctx.get("usb") or {}
        if usb:
            det = (usb.get("detect") or {}).get("board") or ""
            kind = {"avr": "Arduino", "esp32": "ESP32", "esp32s3": "ESP32-S3", "esp32c3": "ESP32-C3"}.get(det, det.upper())
            lines.append("• USB du S3 : " + ((f"{kind} branché" if kind else "carte branchée") + f" (pont {usb.get('chip') or usb.get('vid_pid')})." +
                                            (" Dis « flashe la carte USB » pour la programmer." if kind else "") if usb.get("connected") else "rien de branché."))
        try:
            dev = self.host.usb_devices() if self.host and hasattr(self.host, "usb_devices") else []
        except Exception:
            dev = []
        lines.append("• USB du Pi : " + (", ".join(f"{d['name']} ({d['port']})" for d in dev[:6]) + "." if dev else "aucune carte série branchée."))
        try:
            ln = self.host.link() if self.host and hasattr(self.host, "link") else None
        except Exception:
            ln = None
        if ln and ln.get("samples"):
            lines.append(f"• Liaison Pi ↔ S3 : {'bonne' if ln.get('up') else 'coupée'}, " + (f"{ln['rtt_ms']} ms, " if ln.get('rtt_ms') is not None else '') + f"{ln.get('loss_pct')} % de perte.")
        acts = []
        if s.get("checkup") and on:
            acts = [self._propose("s3_job", {"type": "SYSTEM_TEST", "worker": w["id"]}, f"Check-up complet du worker {w['id']}") for w in on[:10]]
        return self._resp("Voici ce qui est branché :\n" + "\n".join(lines), "boards", cards=[{"type": "boards"}], actions=acts,
                          suggestions=[] if acts else (["Fais un check-up de toutes les cartes"] if on else []))

    # ============================================================ carte branchée sur l'USB du S3
    def _h_usb_flash(self, text, s, ctx):
        usb = ctx.get("usb") or {}
        if usb and not usb.get("connected"):
            return self._resp("Rien n'est branché sur le port USB du S3. Branche ta carte (ESP32 ou Arduino) avec un câble OTG : "
                              "je l'identifie toute seule, puis redis « flashe la carte USB ».", "usb_flash", suggestions=["Quelles cartes sont branchées ?"])
        det = usb.get("detect") or {}
        names = {"avr": "un Arduino", "esp32": "un ESP32", "esp32s3": "un ESP32-S3", "esp32c3": "un ESP32-C3"}
        board = det.get("board") or ""
        proj = (s.get("project") or "").strip()
        if board and board not in names:
            return self._resp(f"La carte branchée est un {board.upper()} : aucun firmware du labo n'est prévu pour cette puce. "
                              "Le labo flashe les ESP32, ESP32-S3, ESP32-C3 et les Arduino Uno/Nano.", "usb_flash")
        what = proj or "worker"
        if board == "avr" and not proj:
            return self._resp("C'est un Arduino. Quel projet dois-je y mettre ? Par exemple « flashe la carte USB avec bme280 ». "
                              "Je t'ouvre aussi la liste dans USB & Flash.", "usb_flash",
                              actions=[self._propose("open_page", {"page": "usb"}, "Ouvrir USB & Flash")])
        who = names.get(board, "la carte (je l'identifie d'abord)")
        label = f"« {proj} »" if proj else "le firmware worker"
        summary = f"Identifier la carte USB du S3 et y flasher {label}" if not board else f"Flasher {label} sur {who} branché à l'USB du S3"
        act = self._propose("usb_flash", {"what": what, "board": board}, summary)
        lead = f"La carte branchée sur le S3 est {who}. " if board else "J'identifie d'abord la carte branchée sur le S3 (ESP32 ou Arduino). "
        tail = ("Je flashe le firmware worker : la carte rejoindra le Wi-Fi du S3 comme nouveau worker." if not proj
                else f"Je flashe « {proj} », puis le moniteur série s'ouvre pour vérifier que ça tourne.")
        return self._resp(lead + tail + self._confirm_hint(ctx, "Confirme pour lancer."), "usb_flash", actions=[act])

    # ============================================================ veille du labo (option espion)
    def _h_veille(self, text, s, ctx):
        mode = s.get("mode") or "report"
        if mode == "people":
            return self._resp("Ça, je ne le fais pas : surveiller une personne à son insu (messages, appels, caméra, Wi-Fi) est illégal "
                              "et trahit sa confiance. Par contre je peux surveiller ton propre labo : je te préviens si un appareil "
                              "inconnu rejoint le Wi-Fi du box, si un worker s'éteint ou si un de tes capteurs (mouvement, porte) se déclenche.",
                              "veille", suggestions=["Active la veille du labo"])
        v = ctx.get("veille") or (ctx.get("lab") or {}).get("veille") or {}
        if mode in ("on", "off"):
            on = mode == "on"
            if v and bool(v.get("armed")) == on:
                return self._resp("La veille du labo est déjà " + ("active." if on else "arrêtée."), "veille", cards=[{"type": "veille"}])
            act = self._propose("veille", {"armed": on}, "Activer la veille du labo" if on else "Arrêter la veille du labo")
            msg = ("J'active la veille du labo : je te préviens (ici, sur le téléphone et par notification si elle est configurée) si un appareil "
                   "inconnu rejoint le Wi-Fi du box, si un worker s'éteint ou revient, ou si une alarme de capteur se déclenche. "
                   "Rien n'est écouté ni filmé : je ne vois que ton propre matériel." if on else "J'arrête la veille du labo.")
            return self._resp(msg + self._confirm_hint(ctx, "Confirme pour lancer."), "veille", actions=[act])
        state = ("active" if v.get("armed") else "arrêtée") if v else "inconnue (je n'ai pas reçu l'état du MASTER)"
        n = v.get("count") or 0
        return self._resp(f"La veille du labo est {state}" + (f", {n} alerte(s) depuis son activation." if v.get("armed") else ".") +
                          " Voici le journal :", "veille", cards=[{"type": "veille"}],
                          suggestions=["Arrête la veille" if v.get("armed") else "Active la veille du labo"])

    # ============================================================ fichiers et dossiers
    def _ws(self):
        from .workspace import Workspace
        root = self.host.workspace_root() if self.host and hasattr(self.host, "workspace_root") else None
        return Workspace(root)

    def _h_files(self, text, s, ctx):
        from .workspace import WorkspaceError
        ws = self._ws()
        op, name = s.get("op"), (s.get("name") or "").strip().strip("/")
        parent = (s.get("parent") or "").strip().strip("/")
        path = f"{parent}/{name}" if parent and name else name
        try:
            if op == "list":
                tree = ws.tree(path, 2)
                if not tree:
                    return self._resp(f"Le dossier « {path or 'MY_PROJECTS'} » est vide. Dis « crée un dossier serre » pour commencer.", "files")
                return self._resp(f"Contenu de « {path or 'mes projets'} » :\n```\n" + "\n".join(tree[:80]) + "\n```", "files",
                                  suggestions=["Crée un dossier essais", "Analyse mon projet"])
            if op == "read":
                r = ws.read(path)
                return self._resp(f"**{r['path']}**" + (" (début)" if r["truncated"] else "") + f" :\n```\n{r['text'][:6000]}\n```", "files", speak="Voici le fichier.")
            if op == "mkdir":
                ws.path(path)   # valide le nom tout de suite
                act = self._propose("fs_mkdir", {"path": path}, f"Créer le dossier « {path} » dans tes projets")
                return self._resp(f"Je crée le dossier « {path} » dans tes projets sur le Pi." + self._confirm_hint(ctx, "Confirme."), "files", actions=[act])
            if op == "write":
                ws.path(path)
                exists = ws.path(path).exists()
                content = s.get("content") or ""
                if not content and path.lower().endswith(".ino"):
                    content = "// " + path + "\n\nvoid setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n}\n"
                act = self._propose("fs_write", {"path": path, "content": content, "overwrite": exists},
                                    ("Remplacer" if exists else "Créer") + f" le fichier « {path} » ({len(content.encode())} octets)")
                return self._resp(("Ce fichier existe déjà : confirme pour le remplacer (l'ancienne version part dans la corbeille)." if exists
                                   else f"Je crée « {path} »" + (" avec le texte donné." if s.get("content") else ".") + self._confirm_hint(ctx, "Confirme.")), "files", actions=[act])
            if op == "delete":
                ws.path(path, must_exist=True)
                act = self._propose("fs_delete", {"path": path}, f"Mettre « {path} » à la corbeille (récupérable)")
                return self._resp(f"Je mets « {path} » à la corbeille du Pi (.corbeille), rien n'est effacé définitivement. Confirme.", "files", actions=[act])
        except WorkspaceError as e:
            return self._resp(str(e), "files")
        return self._resp("Je gère tes dossiers et fichiers : « crée un dossier serre », « crée un fichier serre/notes.txt avec : … », "
                          "« liste mes fichiers », « lis le fichier serre/notes.txt », « supprime le dossier essais ».", "files")

    # ============================================================ GitHub : nouveau dépôt
    def _h_github_create(self, text, s, ctx):
        from . import github
        st = github.status()
        if not st["configured"]:
            return self._h_github_push(text, s, ctx)
        repo = github.repo_name(s.get("repo") or _title_from(text) or "projet-nexus")
        private = False if s.get("public") and not s.get("private") else (True if s.get("private") else st.get("private", True))
        owner = st.get("owner") or st.get("login")
        act = self._propose("github_create", {"repo": repo, "private": private}, f"Créer le dépôt GitHub {owner}/{repo} ({'privé' if private else 'public'})")
        return self._resp(f"Je crée le dépôt **{owner}/{repo}** ({'privé' if private else 'public'}) avec un README. Confirme pour lancer. "
                          f"Ensuite, « envoie <projet> sur GitHub dans le dépôt {repo} » y déposera ton code.", "github_create", actions=[act])

    # ============================================================ analyse de projet
    def _last_failed_log(self, pid: str) -> str:
        """Journal de la dernière compilation échouée de ce projet (s'il n'a pas réussi depuis)."""
        try:
            for j in (self.host.recent_builds() if self.host else []):
                if j.get("project") != pid:
                    continue
                if j.get("status") == "failed":
                    return self.host.build_log(j["id"]) if hasattr(self.host, "build_log") else (j.get("error") or "")
                if j.get("status") == "success":
                    return ""
        except Exception:
            return ""
        return ""

    def _h_analyze(self, text, s, ctx):
        from . import analyzer
        names = self._pi_projects()
        ft = fold(text)
        pid = next((n for n in sorted(names, key=len, reverse=True) if n.replace("_", " ") in ft or n in ft), None)
        studio = ctx.get("studio") if isinstance(ctx.get("studio"), dict) else None
        if not pid and studio and (studio.get("spec") or {}).get("modules"):
            warns = studio.get("warnings") or []
            sp = studio.get("spec") or {}
            lines = [f"« {sp.get('title', 'Projet du Studio')} » est généré par le Studio : câblage sans conflit et code complet, il compile tel quel."]
            lines += [f"• {w}" for w in warns[:8]] or ["• Aucun avertissement du générateur."]
            if not sp.get("rules"):
                lines.append("• Aucune condition « si… alors… » : ajoute-en une dans la carte « Conditions et actions » pour que le montage agisse tout seul.")
            lines.append("Pour analyser un code écrit à la main, enregistre-le sur le Pi puis redis « analyse <nom du projet> ».")
            return self._resp("\n".join(lines), "analyze", suggestions=["Compile", "Flash"])
        if not pid and ctx.get("project") in names:
            pid = ctx["project"]
        if not pid:
            hint = ("Projets sur le Pi : " + ", ".join(names[:12]) + ".") if names else "Aucun projet enregistré sur le Pi pour l'instant."
            return self._resp("Quel projet dois-je analyser ? " + hint, "analyze", suggestions=[f"Analyse {n}" for n in names[:3]])
        d = self.host.project_path(pid) if self.host and hasattr(self.host, "project_path") else self._ws().path(pid, must_exist=True)
        r = analyzer.analyze_project(d, None, self._last_failed_log(pid))
        fs = r.get("findings") or []
        cards = [{"type": "diagnosis", "kind": "projet " + pid, "severity": "bad" if any(f["severity"] == "bad" for f in fs) else "warn",
                  "findings": [{"severity": f["severity"], "title": f["title"], "line": f.get("line"), "explanation": (f.get("file") or "") + " — " + f["explanation"],
                                "fixes": [f["fix_summary"]] if f.get("fix_summary") else []} for f in fs[:20]]}] if fs else []
        fixable = [f["id"] for f in fs if f.get("fixable")]
        acts = [self._propose("apply_fix", {"project": pid, "ids": fixable}, f"Corriger {len(fixable)} problème(s) dans « {pid} » (copie de sauvegarde gardée)")] if fixable else []
        head = f"Analyse de « {pid} » : note {r.get('score', 0)}/100. {r.get('summary', '')}"
        if fixable:
            head += f"\nJe peux corriger automatiquement {len(fixable)} point(s) ; l'original est sauvegardé dans .patricia_backup."
        return self._resp(head, "analyze", cards=cards, actions=acts, suggestions=[f"Compile {pid}"] if not fs else [])

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
        messages = [{"role": "system", "content": PERSONA + persona.PROMPTS[self.style()] + "\n\nContexte (JSON) :\n" + json.dumps(context, ensure_ascii=False)[:9000]}]
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
            if name == "list_files":
                return {"arbre": self._ws().tree(str(a.get("path", "")), 3)}
            if name == "read_file":
                return self._ws().read(str(a.get("path", "")))
            if name == "analyze_project":
                from . import analyzer
                pid = str(a.get("project", ""))
                d = self.host.project_path(pid) if self.host and hasattr(self.host, "project_path") else self._ws().path(pid, must_exist=True)
                return analyzer.analyze_project(d)
            if name == "connected_boards":
                r = self._h_boards("", {}, ctx)
                cards.append({"type": "boards"})
                return {"bilan": r["answer"]}
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
            elif a["kind"] == "github_push":
                res = self.host.github_push(p["project"], p.get("repo") or p["project"], p.get("private"))
            elif a["kind"] == "github_create":
                from . import github
                try:
                    res = github.create_repo(p["repo"], p.get("private"))
                except github.GitHubError as e:
                    raise ValueError(str(e)) from None
            elif a["kind"] in ("fs_mkdir", "fs_write", "fs_delete"):
                ws = self._ws()
                res = (ws.mkdir(p["path"]) if a["kind"] == "fs_mkdir" else
                       ws.write(p["path"], p.get("content", ""), overwrite=bool(p.get("overwrite"))) if a["kind"] == "fs_write" else ws.delete(p["path"]))
            elif a["kind"] == "apply_fix":
                from . import analyzer
                d = self.host.project_path(p["project"]) if self.host and hasattr(self.host, "project_path") else self._ws().path(p["project"], must_exist=True)
                res = analyzer.apply_fixes(d, p.get("ids") or None, self._last_failed_log(p["project"]))
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
                ". params : s3_job {type, worker} ; flash {worker, project, board} ; build {project, board} ; apk {project, title, modules} ; "
                "fleet_goal {goals: {V1: [x, y]}} ; open_page {page} ; verify {worker} ; fs_mkdir {path} ; fs_write {path, content, overwrite} ; "
                "fs_delete {path} ; github_push {project, repo, private} ; github_create {repo, private} ; apply_fix {project, ids} ; "
                "usb_flash {what: 'worker' ou projet} (carte branchée sur l'USB du S3) ; veille {armed} (veille du labo).",
                {"kind": {"type": "string", "enum": list(ACTIONS)}, "params": {"type": "object"}, "summary": {"type": "string"}}, ["kind", "params", "summary"]),
    tool_schema("lab_state", "Renvoie l'état du MASTER et des workers vu par l'interface.", {}),
    tool_schema("list_files", "Liste les dossiers et fichiers des projets de l'utilisateur sur le Pi.", {"path": {"type": "string"}}),
    tool_schema("read_file", "Lit un fichier texte des projets de l'utilisateur (chemin relatif, ex. serre/serre.ino).", {"path": {"type": "string"}}, ["path"]),
    tool_schema("analyze_project", "Analyse le code d'un projet enregistré sur le Pi et liste les erreurs et corrections possibles.", {"project": {"type": "string"}}, ["project"]),
    tool_schema("connected_boards", "Inventaire des cartes branchées : workers en Wi-Fi, USB du S3 et du Pi, liaison Pi ↔ S3.", {}),
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
