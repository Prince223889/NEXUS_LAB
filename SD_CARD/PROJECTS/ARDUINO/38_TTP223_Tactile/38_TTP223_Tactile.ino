/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  TTP223 Tactile
 * =====================================================================
 *  Explication : Utilise un capteur tactile capacitif TTP223 comme interrupteur marche/arrêt.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> TTP223 VCC
 *   Arduino GND    -> TTP223 GND
 *   Arduino D2     -> TTP223 I/O
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches
const uint8_t PIN_TOUCH = 2;
const uint8_t PIN_LED   = 13;

bool ledAllumee = false;
int etatPrecedent = LOW;

void setup() {
  pinMode(PIN_TOUCH, INPUT);
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[38] TTP223 pret"));
}

void loop() {
  int etat = digitalRead(PIN_TOUCH);   // HIGH quand on touche
  // À chaque nouveau toucher, on inverse la LED
  if (etat == HIGH && etatPrecedent == LOW) {
    ledAllumee = !ledAllumee;
    digitalWrite(PIN_LED, ledAllumee ? HIGH : LOW);
    Serial.println(ledAllumee ? F("Touche -> LED ON") : F("Touche -> LED OFF"));
  }
  etatPrecedent = etat;
  delay(20);
}
