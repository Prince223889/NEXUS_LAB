// ESP32 LAB — Mémoire non volatile (NVS / Preferences) : réglages conservés après coupure
// Tapez dans le moniteur série : nom=MonCapteur  ou  seuil=25.5  ou  reset
#include <Arduino.h>
#include <Preferences.h>

Preferences prefs;
String name;
float threshold;
uint32_t boots;

void load() {
  prefs.begin("lab", true);                  // lecture seule
  name = prefs.getString("name", "capteur-1");
  threshold = prefs.getFloat("seuil", 20.0f);
  boots = prefs.getUInt("boots", 0);
  prefs.end();
}

void setup() {
  Serial.begin(115200);
  delay(300);
  load();
  prefs.begin("lab", false);
  prefs.putUInt("boots", ++boots);
  prefs.end();
  Serial.printf("\n# démarrage n°%lu — nom « %s », seuil %.1f\n", (unsigned long)boots, name.c_str(), threshold);
}

void loop() {
  if (Serial.available()) {
    String l = Serial.readStringUntil('\n');
    l.trim();
    prefs.begin("lab", false);
    if (l.startsWith("nom=")) { prefs.putString("name", l.substring(4)); Serial.println(F("# nom enregistré")); }
    else if (l.startsWith("seuil=")) { prefs.putFloat("seuil", l.substring(6).toFloat()); Serial.println(F("# seuil enregistré")); }
    else if (l == "reset") { prefs.clear(); Serial.println(F("# réglages effacés")); }
    prefs.end();
    load();
    Serial.printf("# nom « %s », seuil %.1f\n", name.c_str(), threshold);
  }
}
