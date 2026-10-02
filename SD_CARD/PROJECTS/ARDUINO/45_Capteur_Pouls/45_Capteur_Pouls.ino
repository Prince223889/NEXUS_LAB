/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur de pouls
 * =====================================================================
 *  Explication : Détecte les battements cardiaques avec un capteur de pouls analogique et calcule les BPM.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Pouls +
 *   Arduino GND    -> Pouls -
 *   Arduino A0     -> Pouls S
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches et réglages
const uint8_t PIN_POULS = A0;
const uint8_t PIN_LED   = 13;
const int SEUIL         = 550;    // seuil de détection d'un battement (à ajuster)
const unsigned long INTERVALLE_MIN_MS = 300;  // ignore les battements trop rapprochés (>200 BPM)

bool auDessus = false;
unsigned long dernierBattement = 0;

void setup() {
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[45] Capteur de pouls pret (poser le doigt)"));
}

void loop() {
  int signal = analogRead(PIN_POULS);
  unsigned long maintenant = millis();
  // Front montant au-dessus du seuil = un battement
  if (signal > SEUIL && !auDessus) {
    auDessus = true;
    digitalWrite(PIN_LED, HIGH);
    unsigned long ecart = maintenant - dernierBattement;
    if (ecart > INTERVALLE_MIN_MS) {
      if (dernierBattement > 0 && ecart < 2000) {
        Serial.print(F("BPM: ")); Serial.println(60000UL / ecart);
      }
      dernierBattement = maintenant;
    }
  }
  // Retour sous le seuil
  if (signal < SEUIL - 20 && auDessus) {
    auDessus = false;
    digitalWrite(PIN_LED, LOW);
  }
  delay(10);
}
