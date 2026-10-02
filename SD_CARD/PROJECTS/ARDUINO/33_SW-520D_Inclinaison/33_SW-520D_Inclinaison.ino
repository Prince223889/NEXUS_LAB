/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  SW-520D Inclinaison
 * =====================================================================
 *  Explication : Détecte l'inclinaison d'un capteur à bille SW-520D avec anti-rebond logiciel.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D2     -> SW-520D broche 1
 *   Arduino GND    -> SW-520D broche 2
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches
const uint8_t PIN_TILT = 2;
const uint8_t PIN_LED  = 13;
const unsigned long ANTI_REBOND_MS = 50;

int etatStable = HIGH;
int dernierEtat = HIGH;
unsigned long dernierChangement = 0;

void setup() {
  pinMode(PIN_TILT, INPUT_PULLUP);   // pull-up interne : LOW = contact fermé (droit)
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[33] SW-520D pret"));
}

void loop() {
  int lecture = digitalRead(PIN_TILT);
  // Anti-rebond : on attend que l'état soit stable
  if (lecture != dernierEtat) dernierChangement = millis();
  if (millis() - dernierChangement > ANTI_REBOND_MS && lecture != etatStable) {
    etatStable = lecture;
    digitalWrite(PIN_LED, etatStable == HIGH ? HIGH : LOW);
    Serial.println(etatStable == HIGH ? F("Incline !") : F("Droit"));
  }
  dernierEtat = lecture;
}
