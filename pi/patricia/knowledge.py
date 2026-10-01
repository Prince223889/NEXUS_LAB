"""Connaissances hors ligne de Patricia : catalogue des 320 projets, conseils de conception, cartes.

Tout fonctionne sans Internet ni IA : c'est la base sur laquelle Patricia s'appuie toujours, et que
l'IA (locale ou distante) reçoit en contexte quand elle est configurée.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from .memory import fold

BOARDS = {
    "esp32": {"label": "ESP32 (DevKit)", "fqbn": "esp32:esp32:esp32", "adc2_wifi": True,
              "notes": ["ADC2 (GPIO 0, 2, 4, 12-15, 25-27) inutilisable quand le Wi-Fi est actif : prends ADC1 (GPIO 32-39).",
                        "GPIO 34-39 sont des entrées seules, sans tirage interne.",
                        "GPIO 6-11 sont reliées à la flash : ne jamais les utiliser.",
                        "GPIO 0, 2, 12, 15 influencent le démarrage : évite d'y brancher des modules qui tirent le niveau."]},
    "esp32s3": {"label": "ESP32-S3", "fqbn": "esp32:esp32:esp32s3", "adc2_wifi": True,
                "notes": ["ADC1 = GPIO 1-10 ; ADC2 (GPIO 11-20) est indisponible avec le Wi-Fi.",
                          "GPIO 26-32 servent à la flash/PSRAM sur les modules N16R8 : à éviter (et 33-37 en PSRAM octale).",
                          "GPIO 19/20 = USB natif ; GPIO 0, 3, 45, 46 sont des broches de démarrage."]},
    "esp32c3": {"label": "ESP32-C3", "fqbn": "esp32:esp32:esp32c3", "adc2_wifi": True,
                "notes": ["Seulement 6 entrées analogiques (GPIO 0-4 sur ADC1, GPIO 5 sur ADC2).",
                          "GPIO 2, 8, 9 sont des broches de démarrage ; GPIO 18/19 = USB.",
                          "Un seul cœur : évite les tâches lourdes en parallèle du Wi-Fi."]},
}

# Conseils déclenchés par les composants ou le but du projet. (mots-clés, conseil)
ADVICE = [
    (("moteur", "motor", "l298", "tb6612", "drv8833", "servo", "pompe", "relais", "relay"),
     "Alimente moteurs, servos, pompes et relais séparément de l'ESP32 (masse commune) et ajoute une diode de roue libre sur les charges inductives."),
    (("voiture", "robot", "vehicule", "véhicule", "rover", "drone"),
     "Pour un véhicule : coupe-circuit matériel, arrêt automatique si les commandes cessent (dead-man 300-500 ms) et capteur d'obstacle à bord. Le Wi-Fi seul n'est pas un système de sécurité."),
    (("batterie", "pile", "solaire", "autonome", "lipo", "18650"),
     "Sur batterie : veille profonde entre deux mesures (esp_deep_sleep), régulateur à faible courant de repos (HT7333/MCP1700) et mesure de la tension par pont diviseur sur ADC1."),
    (("dht11", "dht22", "am2302"),
     "DHT : lis au plus toutes les 2 s et ajoute 10 kΩ entre DATA et 3V3 si le module n'en a pas ; préfère un SHT31 ou un BME280 pour la précision."),
    (("ultrason", "hc-sr04", "hcsr04", "distance"),
     "HC-SR04 alimenté en 5 V : son écho sort en 5 V, ajoute un pont diviseur (1 kΩ / 2 kΩ) avant la broche de l'ESP32."),
    (("analogique", "potentiometre", "potentiomètre", "ldr", "sol", "soil", "gaz", "mq"),
     "Mesures analogiques : branche sur ADC1 (le Wi-Fi bloque ADC2), moyenne sur 16 échantillons et étalonne avec analogReadMilliVolts()."),
    (("i2c", "bme280", "oled", "ssd1306", "bh1750", "mpu6050", "ads1115"),
     "I2C : un seul module par adresse, fils courts, tirages 4,7 kΩ ; lance « scan I2C » sur un worker pour vérifier les adresses."),
    (("web", "wifi", "mqtt", "telegram", "internet"),
     "Réseau : reconnecte automatiquement le Wi-Fi, ne bloque jamais loop() pendant une requête et prévois une mise à jour OTA."),
    (("arrosage", "pompe", "irrigation"),
     "Arrosage : limite la durée maximale de pompage dans le code (sécurité si le capteur tombe en panne) et utilise un capteur capacitif plutôt que résistif."),
    (("alarme", "securite", "sécurité", "intrusion"),
     "Alarme : prévois une batterie de secours, un journal horodaté des déclenchements et une notification qui ne dépend pas d'un seul canal."),
]

IMPROVEMENTS = {
    "default": ["Ajouter une page web locale pour voir les mesures", "Envoyer les mesures au MASTER (UDP 4213) pour les courbes en direct",
                "Ajouter la mise à jour OTA", "Enregistrer un journal CSV sur la microSD", "Ajouter des alertes avec seuils et hystérésis"],
    "batterie": ["Passer en veille profonde entre les mesures", "Surveiller la tension de la batterie"],
    "moteur": ["Ajouter une rampe d'accélération", "Couper les moteurs si les commandes cessent (dead-man)"],
    "capteur": ["Filtrer les mesures (moyenne glissante ou médiane)", "Étalonner le capteur et stocker l'étalonnage en mémoire Preferences"],
}


class Knowledge:
    def __init__(self, catalog_path: Path | str):
        self.catalog_path = Path(catalog_path)
        self._cache: dict | None = None
        self._mtime = 0.0

    def data(self) -> dict:
        try:
            m = self.catalog_path.stat().st_mtime
            if self._cache is None or m != self._mtime:
                self._cache = json.loads(self.catalog_path.read_text(encoding="utf-8"))
                self._mtime = m
        except (OSError, ValueError):
            self._cache = self._cache or {"projects": []}
        return self._cache

    def projects(self) -> list[dict]:
        return self.data().get("projects", [])

    def get(self, pid: str) -> dict | None:
        return next((p for p in self.projects() if p.get("id") == pid), None)

    def search(self, query: str, limit: int = 8, kind: str | None = None) -> list[dict]:
        q = fold(query)
        terms = [t for t in re.findall(r"[a-z0-9-]+", q) if len(t) > 2 and t not in STOP]
        if not terms:
            return []
        hits = []
        for p in self.projects():
            if kind and p.get("kind") != kind:
                continue
            title = fold(p.get("title", ""))
            pid = fold(p.get("id", ""))
            hay = " ".join([pid, title] + [fold(t) for t in p.get("tags", [])] + [fold(l) for l in p.get("libs", [])])
            score = 0.0
            for t in terms:
                if t == pid or re.search(rf"\b{re.escape(t)}\b", title):
                    score += 3
                elif t in hay:
                    score += 1
            if pid and pid.replace("_", " ") in q:
                score += 5
            if score:
                hits.append((score, p))
        hits.sort(key=lambda x: (-x[0], x[1].get("difficulty", 9)))
        return [dict(p, score=s) for s, p in hits[:limit]]

    def modules_in(self, text: str) -> list[dict]:
        """Composants du catalogue cités dans une phrase (« un BME280 et un écran OLED »)."""
        ft = fold(text)
        found = []
        for p in self.projects():
            if p.get("kind") != "module":
                continue
            names = {fold(p.get("id", "")), fold(p.get("title", ""))}
            names |= {fold(w) for w in re.split(r"[\s/()]+", p.get("title", "")) if len(w) >= 5 and re.search(r"\d", w)}
            if any(len(n) > 3 and re.search(rf"(?<![a-z0-9]){re.escape(n)}(?![a-z0-9])", ft) for n in names):
                found.append(p)
        return found

    def advice_for(self, text: str, modules: list[str] | None = None, board: str | None = None) -> list[str]:
        ft = fold(text + " " + " ".join(modules or []))
        out = [tip for keys, tip in ADVICE if any(fold(k) in ft for k in keys)]
        if board in BOARDS:
            out += BOARDS[board]["notes"][:2]
        return out[:6]

    def improvements_for(self, project: dict) -> list[str]:
        ft = fold(" ".join([project.get("title", ""), project.get("goal", "")] + list(project.get("modules", []))))
        ideas = list(IMPROVEMENTS["default"])
        if any(k in ft for k in ("batterie", "solaire", "autonome")):
            ideas = IMPROVEMENTS["batterie"] + ideas
        if any(k in ft for k in ("moteur", "voiture", "robot", "servo")):
            ideas = IMPROVEMENTS["moteur"] + ideas
        if project.get("modules"):
            ideas = IMPROVEMENTS["capteur"] + ideas
        done = {fold(x) for x in project.get("improvements", [])}
        return [i for i in ideas if fold(i) not in done][:5]

    def describe(self, p: dict) -> str:
        libs = ", ".join(p.get("libs", [])[:4])
        boards = ", ".join(BOARDS.get(b, {}).get("label", b) for b in p.get("boards", []))
        return f"{p.get('title')} — cartes : {boards or '?'}" + (f" ; bibliothèques : {libs}" if libs else "")

    def summary(self) -> dict:
        ps = self.projects()
        return {"projects": len(ps), "modules": sum(p.get("kind") == "module" for p in ps),
                "recipes": sum(p.get("kind") == "recipe" for p in ps), "classics": sum(p.get("kind") == "classic" for p in ps)}


STOP = {"les", "des", "une", "un", "pour", "avec", "sur", "dans", "que", "qui", "est", "pas", "mon", "mes", "ton", "tes",
        "comment", "quoi", "quel", "quelle", "faire", "veux", "voudrais", "peux", "projet", "aide", "moi", "est-ce", "brancher",
        "utiliser", "capteur", "module", "carte", "esp32", "patricia", "bonjour", "salut", "merci", "the", "and"}
