/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Module relais
 * =====================================================================
 *  Explication : Commande d'un module relais 5V (charge externe) via le moniteur série (1/0).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Relais VCC
 *   Arduino GND    -> Relais GND
 *   Arduino D7     -> Relais IN
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_RELAIS = 7;
const bool RELAIS_ACTIF_BAS = true;      // la plupart des modules s'activent à LOW

void commanderRelais(bool on) {
  digitalWrite(PIN_RELAIS, (on ^ RELAIS_ACTIF_BAS) ? HIGH : LOW);
  Serial.println(on ? F("Relais ON") : F("Relais OFF"));
}

void setup() {
  pinMode(PIN_RELAIS, OUTPUT);
  Serial.begin(9600);
  commanderRelais(false);                // état sûr au démarrage
  Serial.println(F("[14] Envoyer 1 (ON) ou 0 (OFF)"));
}

void loop() {
  if (Serial.available()) {
    char c = Serial.read();
    if (c == '1') commanderRelais(true);
    if (c == '0') commanderRelais(false);
  }
}
