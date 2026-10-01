/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  PIR HC-SR501
 * =====================================================================
 *  Explication : Détection de mouvement infrarouge passif avec détection de fronts.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> PIR VCC
 *   Arduino D2     -> PIR OUT
 *   Arduino GND    -> PIR GND
 *   Arduino D13    -> LED anode via 220 ohms
 *   Arduino GND    -> LED cathode
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_PIR = 2;
const uint8_t PIN_LED = 13;
int etatPrecedent = LOW;

void setup() {
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[07] PIR : chauffe du capteur 30 s..."));
  delay(30000UL);                        // stabilisation du capteur
  Serial.println(F("[07] PIR pret"));
}

void loop() {
  int etat = digitalRead(PIN_PIR);
  digitalWrite(PIN_LED, etat);
  if (etat != etatPrecedent) {           // on ne signale que les changements
    Serial.println(etat == HIGH ? F("Mouvement detecte !") : F("Fin du mouvement"));
    etatPrecedent = etat;
  }
  delay(50);
}
