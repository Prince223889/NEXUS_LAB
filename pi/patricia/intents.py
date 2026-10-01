"""Compréhension du français sans IA : Patricia reconnaît l'intention et les éléments utiles d'une phrase.

Les règles couvrent les demandes du labo (projets, notes, flash, pilotage, diagnostic…). Une phrase non
reconnue part vers l'IA si elle est configurée, sinon vers la recherche dans le catalogue et la mémoire.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .memory import fold

NUMBERS = {"un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6, "sept": 7, "huit": 8, "neuf": 9, "dix": 10}
BOARD_WORDS = [("esp32s3", r"\b(s3|esp32[- ]?s3)\b"), ("esp32c3", r"\b(c3|esp32[- ]?c3)\b"), ("esp32", r"\besp32\b")]
JOB_WORDS = [("SYSTEM_TEST", r"check[- ]?up|bilan|diagnostic (des|du) worker|test systeme"), ("BENCHMARK", r"benchmark|perf"),
             ("MEM_TEST", r"test (de la )?memoire"), ("FS_TEST", r"test (du )?(systeme de )?fichiers"),
             ("WIFI_SCAN", r"scan(ne|ner)? (le )?wi-?fi|reseaux wi-?fi"), ("IDENTIFY", r"identifi|clignot|repere"),
             ("I2C_SCAN", r"scan(ne|ner)? (le bus )?i2c|bus i2c"), ("ADC_READ", r"voltm|mesure(r)? (les )?tensions|tensions? des broches"),
             ("GPIO_TEST", r"test(e|er)? (des |les )?(broches|gpio)|test gpio"), ("ONEWIRE_SCAN", r"1-?wire|onewire|ds18b20"),
             ("LOGIC_SAMPLE", r"analyseur logique|echantillonn"), ("PWM_GEN", r"generateur|signal pwm|genere (un )?(signal|pwm)"),
             ("SERVO_SWEEP", r"servo"), ("TONE_TEST", r"buzzer|bip"), ("PING", r"\bping\b")]
DIRS = {"avance": (1, 0), "recule": (-1, 0), "gauche": (0.4, -1), "droite": (0.4, 1)}


@dataclass
class Intent:
    name: str
    confidence: float
    slots: dict = field(default_factory=dict)


def _num(s: str) -> int | None:
    s = s.strip()
    if s.isdigit():
        return int(s)
    return NUMBERS.get(s)


def workers_in(ft: str) -> list[int]:
    """« worker 3 », « voiture deux », « W4 », « les voitures 1, 2 et 5 »."""
    ids: list[int] = []
    for m in re.finditer(r"\b(?:workers?|voitures?|vehicules?|robots?|cartes?|w|v)\s*n?[°o]?\s*((?:\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)(?:\s*(?:,|et)\s*(?:\d+|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix))*)", ft):
        for part in re.split(r"\s*(?:,|et)\s*", m.group(1)):
            n = _num(part)
            if n and 1 <= n <= 10 and n not in ids:
                ids.append(n)
    return ids


def board_in(ft: str) -> str | None:
    for b, pat in BOARD_WORDS:
        if re.search(pat, ft):
            return b
    return None


IDENTITY = re.compile(r"\b(qui es[- ]?tu|qui est[- ]?tu|t.es qui|tu es qui|qui tu es|c.est quoi ton nom|comment tu t.appelles?|ton nom|presente[- ]toi|"
                      r"tu es (ma|mon) (copine|amie|cherie|femme|chef|assistante)|tu es quoi pour moi|qu.est[- ]ce que tu es|qu.est[- ]ce que je suis pour toi|"
                      r"on est quoi (tous les deux|nous deux)|tu m.aimes)\b")
BOARDS_Q = re.compile(r"\b(quel(le)?s? (cartes?|workers?|esp32s?|appareils?|modules?|peripheriques?)\b.*\b(branche|connecte|en ligne|detecte|presente?|allume)e?s?"
                      r"|qu.est[- ]ce qui est (branche|connecte)|ce qui est (branche|connecte)|cartes? (branchees?|connectees?)|qui est (branche|connecte|en ligne))")
NAME = r"[«\"']?([\w][\w .+/-]{0,120}?)[»\"']?"


def files_intent(raw: str, ft: str) -> "Intent | None":
    """Dossiers et fichiers de l'espace de travail : créer, écrire, lire, lister, supprimer."""
    if not re.search(r"\b(dossiers?|repertoires?|fichiers?)\b", ft):
        return None
    m = re.search(r"\b(?:cree|creer|creez|fais|nouveau|ajoute)\b\s+(?:moi\s+)?(?:un |le |une )?(?:nouveau )?(?:dossier|repertoire)\s+(?:appele |nomme |qui s.appelle |pour )?" + NAME + r"(?:\s+dans\s+" + NAME + r")?\s*[.!?]?$", ft)
    if m:
        return Intent("files", 0.9, {"op": "mkdir", "name": m.group(1).strip(), "parent": (m.group(2) or "").strip()})
    m = re.search(r"\b(?:cr[ée]{2}[rz]?|[ée]cris|[ée]crire|ajoute|fais)\b\s+(?:moi\s+)?(?:un |le |une )?(?:nouveau )?fichier\s+(?:appele |nomme )?([\w][\w.+/-]{0,120})(?:\s+dans\s+(?:le dossier\s+)?([\w][\w.+/-]{0,80}))?(?:\s*(?::|avec|contenant|qui contient)\s*(.*))?$", raw, re.I | re.S)
    if m and re.search(r"\b(cree|creer|ecris|ajoute|fais)", ft):
        return Intent("files", 0.9, {"op": "write", "name": m.group(1).strip(), "parent": (m.group(2) or "").strip(), "content": (m.group(3) or "").strip().lstrip(":").strip()})
    m = re.search(r"\b(?:supprime|supprimer|efface|effacer|jette|mets a la corbeille)\b\s+(?:le |la |les )?(?:dossier|fichier|repertoire)\s+" + NAME + r"\s*[.!?]?$", ft)
    if m:
        return Intent("files", 0.9, {"op": "delete", "name": m.group(1).strip()})
    m = re.search(r"\b(?:lis|lire|ouvre|affiche|montre)(?:[- ]moi)?\s+(?:le )?fichier\s+" + NAME + r"\s*[.!?]?$", ft)
    if m:
        return Intent("files", 0.9, {"op": "read", "name": m.group(1).strip()})
    m = re.search(r"\b(?:liste|montre|affiche|quels sont|qu.y a[- ]t[- ]il dans|ouvre)\b.*\b(?:fichiers|dossiers|dossier)\b(?:\s+(?:de|du|dans)\s+(?:(?:le )?dossier\s+)?" + NAME + r")?\s*[.!?]?$", ft)
    if m:
        name = (m.group(1) or "").strip()
        return Intent("files", 0.85, {"op": "list", "name": "" if name in ("mes", "les", "moi") else name})
    return None


LOG_MARKERS = re.compile(r"(error:|fatal error|Guru Meditation|Brownout|rst:0x|Backtrace:|Failed to connect|E \(\d+\)|\[E\]\[|panic|invalid header|Task watchdog|exit status \d)", re.I)


def detect(text: str) -> Intent:
    raw = str(text or "").strip()
    ft = fold(raw)
    words = len(ft.split())

    if LOG_MARKERS.search(raw) or (raw.count("\n") >= 3 and re.search(r"\berror|erreur|0x[0-9a-f]{6}", ft)):
        return Intent("diagnose", 0.95, {"log": raw})
    if re.search(r"\b(arret d.urgence|stop tout|arrete tout|arretez tout|stop stop|urgence)\b", ft) or ft in ("stop", "stop !", "arrete", "arrete !", "stop."):
        return Intent("estop", 1.0, {"workers": workers_in(ft)})
    if re.fullmatch(r"(bonjour|salut|coucou|hello|hey|bonsoir|yo)( patricia)?[ !.,]*", ft):
        return Intent("greet", 0.95)
    if re.fullmatch(r"(merci|super|parfait|top|genial|cool|ok merci)( patricia)?[ !.,]*", ft):
        return Intent("thanks", 0.9)
    if IDENTITY.search(ft):
        return Intent("identity", 0.95, {"text": raw, "relation": bool(re.search(r"\b(pour moi|ma copine|mon amie|ma cherie|ma femme|amoureuse|on est quoi|tu m.aimes)\b", ft))})
    if re.search(r"\b(espionne[rz]?|espionnage|pirate[rz]?|hacke[rz]?|mettre sur ecoute|ecoute[rz]? (les|la|le|mes|ses))\b", ft) \
            and re.search(r"\b(voisins?|quelqu.un|personnes?|gens|copine|copain|femme|mari|ex|collegues?|enfants?|telephone d|messages? d|conversations?|appels?|camera d|wifi d)", ft):
        return Intent("veille", 0.95, {"mode": "people"})
    if re.search(r"\b(veille|mode espion|option espion|espion|surveillance (du|de mon|de mon) labo|surveille (le|mon) labo|surveiller (le|mon) labo)\b", ft) \
            and not re.search(r"\ben veille\b|veille profonde|deep[- ]?sleep|mise en veille", ft):
        off = re.search(r"\b(desactive[rz]?|arrete[rz]?|coupe[rz]?|eteins|eteindre|stoppe[rz]?|stop|enleve[rz]?|retire[rz]?)\b", ft)
        on = re.search(r"\b(active[rz]?|lance[rz]?|allume[rz]?|demarre[rz]?|mets|mettre|arme[rz]?|commence[rz]?|enclenche[rz]?)\b", ft)
        return Intent("veille", 0.92, {"mode": "off" if off else "on" if on else "report"})
    if re.search(r"\busb\b", ft) and re.search(r"\b(flash|flashe|flasher|flashes|flashez|televerse|televerser|installe|installer|charge|charger|programme|programmer|mets|mettre)\b", ft) \
            and not re.search(r"\b(c.est quoi|qu.est[- ]ce que|comment (on|faire|fonctionne)|explique)\b", ft):
        m = re.search(r"(?:avec|le projet|projet|programme)\s+(?:le |la |l'|du |de la )?([\w -]{3,60}?)(?:\s+(?:sur|dans|pour|par)\b|$|[.?!])", ft)
        proj = re.sub(r"^(?:le |la |l')?(?:projet|programme)\s+", "", m.group(1).strip()) if m else ""
        if re.fullmatch(r"(worker|le worker|firmware worker|du worker)", proj) or proj.startswith("worker"):
            proj = ""
        return Intent("usb_flash", 0.92, {"project": proj})
    if BOARDS_Q.search(ft) or (re.search(r"\bcheck[- ]?up\b|\bbilan\b|\binventaire\b", ft) and re.search(r"\b(cartes?|tout|materiel|branche|connecte|usb)\b", ft)):
        return Intent("boards", 0.9, {"checkup": bool(re.search(r"check[- ]?up|bilan|teste|test", ft))})
    f = files_intent(raw, ft)
    if f:
        return f
    if re.search(r"\b(analyse|analyser|verifie|verifier|controle|corrige|corriger|repare|reparer|debug(ue)?|relis)[rz]?\b.*\b(projet|projets|code|programme|croquis|sketch|erreurs?)\b", ft) \
            and not re.search(r"\b(marche|fonctionne|moniteur|serie)\b", ft) \
            or re.fullmatch(r"(analyse|analyser|corrige|corriger|repare|reparer)\s+(le |la |l.)?[\w-]{3,60}[ .!?]*", ft):
        return Intent("analyze", 0.9, {"text": raw, "fix": bool(re.search(r"\b(corrige|corriger|repare|reparer|applique)", ft))})
    if re.search(r"\b(que sais[- ]tu faire|tu peux faire quoi|aide[- ]moi a comprendre ce que tu|tes capacites|comment tu marches|aide$|^aide)\b", ft):
        return Intent("help", 0.9)

    m = re.match(r"^(?:patricia[, ]+)?(?:note|notes|prends note|ecris|retiens|rappelle[- ]toi|souviens[- ]toi|n.oublie pas|memorise)\s*(?:que|:|de|bien)?\s*(.+)", raw, re.I | re.S)
    if m and not re.match(r"^(?:mes notes|les notes)", ft):
        return Intent("note_add", 0.95, {"text": m.group(1).strip()})
    if re.search(r"\b(mes notes|les notes|montre.* notes|liste.* notes)\b", ft):
        return Intent("note_list", 0.9)
    m = re.search(r"\b(?:cree|creer|creez|fais|ouvre|nouveau)\b[^.]*?\b(?:depot|repo|repository)\b(?:\s+(?:github|git ?hub))?(?:\s+(?:appele|nomme|qui s.appelle))?\s*[«\"']?([a-z0-9][\w.-]{1,99})?", ft)
    if m and not re.search(r"\b(envoie|envoyer|pousse|pousser|push|mets|mettre|publie|depose|upload|pour|avec|projet)\b", ft):
        name = m.group(1) if m.group(1) and m.group(1) not in ("github", "sur", "pour", "avec", "de", "du", "prive", "public", "git") else ""
        return Intent("github_create", 0.9, {"repo": name, "public": bool(re.search(r"\bpublic\b", ft)), "private": bool(re.search(r"\bprive\b", ft))})
    if re.search(r"\bgit ?hub\b", ft) and re.search(r"\b(envoie|envoyer|envoi|pousse|pousser|push|publie|publier|mets|mettre|sauvegarde|sauvegarder|cree|creer|depose|deposer|upload)", ft):
        m = re.search(r"(?:depot|repo|repository)\s+(?:github\s+)?(?:appele|nomme|qui s.appelle)?\s*[«\"']?([a-z0-9][\w.-]{1,99})", ft)
        name = m.group(1) if m and m.group(1) not in ("github", "sur", "pour", "avec", "de", "du", "prive", "public") else ""
        return Intent("github_push", 0.9, {"text": raw, "repo": name, "public": bool(re.search(r"\bpublic\b", ft)),
                                           "private": bool(re.search(r"\bprive\b", ft))})
    m = re.search(r"\b(?:je m.appelle|appelle[- ]moi)\s+([\w-]{2,30})", raw, re.I)
    if m:
        return Intent("fact_set", 0.95, {"key": "prenom", "value": m.group(1)})
    m = re.search(r"\b(?:ma|mon) (carte|microcontroleur|board) (?:prefere[e]?|habituel(?:le)?) (?:est|c.est) (?:la |le |l.)?(.+)", ft)
    if m:
        return Intent("fact_set", 0.9, {"key": "carte preferee", "value": m.group(2).strip(" .")})
    m = re.search(r"\b(?:oublie|efface) (?:que |ce que )?(.+)", ft)
    if m and "note" not in ft:
        return Intent("forget", 0.7, {"text": m.group(1)})
    if re.search(r"\b(qu.est[- ]ce que tu (sais|te rappelles)|te souviens[- ]tu|tu te souviens|on avait (fait|dit)|rappelle[- ]moi|qu.ai[- ]je (dit|note))\b", ft):
        return Intent("recall", 0.85, {"query": raw})

    wids = workers_in(ft)
    strong = re.search(r"\b(flash|flashe|flasher|flashes|flashez|televerse|televerser|upload)\b", ft)
    if (strong or re.search(r"\b(charge|installe|programme)\b", ft) and (wids or "worker" in ft or "voiture" in ft)) \
            and not re.search(r"\b(c.est quoi|qu.est[- ]ce que|comment (on|faire|fonctionne)|explique)\b", ft):
        m = re.search(r"(?:avec|le projet|projet|programme)\s+(?:le |la |l'|du |de la )?([\w -]{3,60}?)(?:\s+(?:sur|dans|pour)\b|$|[.?!])", ft)
        proj = m.group(1).strip() if m else ""
        if re.fullmatch(r"(en cours|actuel|ouvert|du studio|studio|courant|mon projet|ce projet)", proj) or proj.startswith("le worker"):
            proj = ""
        return Intent("flash", 0.9, {"workers": wids, "project": proj, "board": board_in(ft)})
    if re.search(r"\b(verifie|controle|regarde)\b.*\b(marche|fonctionne|moniteur|serie|flash)", ft):
        return Intent("verify", 0.8, {"workers": wids})
    if re.search(r"\b(compile|compiler|build)\b", ft):
        m = re.search(r"(?:compile[rz]?|build)\s+(?:moi\s+)?(?:le projet |le |la |l'|mon projet )?([\w-]{3,60})", ft)
        proj = m.group(1) if m and m.group(1) not in ("projet", "programme", "code", "tout", "pour", "sur", "avec", "maintenant", "studio", "ca") else ""
        return Intent("build", 0.85, {"project": proj, "board": board_in(ft)})
    if re.search(r"\b(apk|application android|appli(cation)? (mobile|telephone|android|pour (mon |le )?telephone))\b", ft):
        return Intent("apk", 0.85, {"text": raw})

    drive_word = re.search(r"\b(avance|recule|tourne|pilote|conduis|deplace|va|vas|envoie|ramene|gare|garer)\b", ft)
    fleet_word = re.search(r"\b(voiture|voitures|vehicule|vehicules|robot|robots|flotte)\b", ft)
    formation_word = re.search(r"\b(en ligne|aligne|en cercle|en rond|a la base|au depart|en position)\b", ft)
    if (drive_word or formation_word) and (fleet_word or wids):
        slots: dict = {"workers": wids, "all": bool(re.search(r"\b(toutes|tous|flotte)\b", ft))}
        m = re.search(r"\b(?:en|a|au point|vers|position)\s*\(?\s*(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)\s*\)?", ft)
        if m:
            slots["target"] = (float(m.group(1).replace(",", ".")), float(m.group(2).replace(",", ".")))
        m = re.search(r"\b(\d+(?:[.,]\d+)?)\s*(cm|m|metres?|centimetres?)\b", ft)
        if m:
            d = float(m.group(1).replace(",", "."))
            slots["distance_m"] = d / 100 if m.group(2).startswith("c") else d
        for word, vec in DIRS.items():
            if word in ft:
                slots["direction"] = word
        if re.search(r"\b(ligne|aligne)", ft):
            slots["formation"] = "ligne"
        elif re.search(r"\b(cercle|rond)", ft):
            slots["formation"] = "cercle"
        elif re.search(r"\b(ramene|maison|base|gare|garer|depart)", ft):
            slots["formation"] = "base"
        return Intent("drive", 0.85, slots)
    if fleet_word and re.search(r"\b(etat|ou sont|position|combien)\b", ft):
        return Intent("fleet_status", 0.85)

    for job, pat in JOB_WORDS:
        if re.search(r"\b(lance|fais|demarre|execute|faire|teste|tester|scanne)\b", ft) and re.search(pat, ft):
            return Intent("job", 0.9, {"job": job, "workers": wids})
    if re.search(r"\b(etat|statut|status|comment va|resume) (du |de la |des )?(labo|laboratoire|box|workers?|flotte|systeme)\b", ft) or ft in ("etat", "statut"):
        return Intent("status", 0.9)

    if (re.search(r"\b(lis|lire|donne|quelle?s?|combien|valeurs?|affiche|montre|indique|releve)\b", ft)
            and re.search(r"\b(capteurs?|mesures?|temperature|humidite|pression|lumiere|luminosite|co2|distance|niveau|valeurs?|fait[- ]il)\b", ft)
            and not re.search(r"\b(brancher|branche|cabl|montage|schema|code|programme|choisir|acheter)", ft)):
        m = re.search(r"\b(temperature|humidite|pression|lumiere|luminosite|co2|distance|niveau|gaz|sol|pluie|vent|courant|tension|poids)\b", ft)
        return Intent("sensors", 0.85, {"workers": wids, "topic": m.group(1) if m else ""})
    if re.search(r"\b(mes projets|liste.* projets|quels projets|nos projets)\b", ft):
        return Intent("project_list", 0.9)
    if re.search(r"\b(on reprend|reprenons|continue[rs]?|ou en (est|etait|etions)|on en etait)\b", ft):
        return Intent("project_resume", 0.85, {"text": raw})
    m = re.search(r"\b(?:projet|le|la)\s+(.{3,60}?)\s+(?:est|passe|devient)\s+(?:en\s+)?(termine|fini|en pause|pause|en test|test|essais|cablage|code|conception)\b", ft)
    if m:
        st = {"termine": "termine", "fini": "termine", "en pause": "pause", "pause": "pause", "en test": "test", "test": "test",
              "essais": "test", "cablage": "cablage", "code": "code", "conception": "conception"}[m.group(2)]
        return Intent("project_status", 0.85, {"project": m.group(1), "status": st})
    if re.search(r"\b(ameliore[rz]?|amelioration|optimise[rz]?|ajoute[rz]? (une|des) fonction|idees? pour)\b", ft):
        return Intent("improve", 0.8, {"text": raw})
    if re.search(r"\b(je (veux|voudrais|souhaite|vais)|on (va|pourrait)|aide[- ]moi a|j.aimerais) (faire|creer|construire|fabriquer|realiser|monter|concevoir)\b", ft) or re.search(r"\b(nouveau projet|cree[rz]? (un|une|le) projet)\b", ft):
        return Intent("project_new", 0.85, {"text": raw, "board": board_in(ft)})
    if re.search(r"\b(brancher|branche|cabler|cablage|montage|schema|brochage|connecter|relier)\b", ft):
        return Intent("wiring", 0.8, {"text": raw, "board": board_in(ft)})
    if re.search(r"\b(ecris|genere|donne)[- ]?(moi )?(le |un )?code\b", ft) or re.search(r"\bcode (pour|du|de)\b", ft):
        return Intent("code", 0.8, {"text": raw, "board": board_in(ft)})
    if re.search(r"\b(marche pas|fonctionne pas|bug|plante|erreur|redemarre|nan|ne repond|probleme|panne)\b", ft):
        return Intent("diagnose", 0.7, {"log": raw})
    if re.search(r"\b(conseil|recommande|lequel|quelle carte|quel capteur|choisir|mieux)\b", ft):
        return Intent("advice", 0.7, {"text": raw, "board": board_in(ft)})
    return Intent("question", 0.3 if words > 2 else 0.2, {"text": raw})
