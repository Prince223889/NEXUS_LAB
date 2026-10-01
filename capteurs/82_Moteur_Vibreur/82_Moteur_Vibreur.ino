/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Moteur vibreur
 * =====================================================================
 *  Explication : Commande un moteur vibreur via un transistor NPN, avec intensité variable en PWM.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Moteur + (diode en parallèle)
 *   Arduino D3     -> Base transistor (via 1k)
 *   Arduino GND    -> Émetteur transistor
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Le moteur est entre 5V et le collecteur du transistor
const uint8_t PIN_VIBREUR = 3;   // PWM

void setup() {
  pinMode(PIN_VIBREUR, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[82] Vibreur pret"));
}

void loop() {
  // Vibration forte
  Serial.println(F("Vibration forte"));
  analogWrite(PIN_VIBREUR, 255);
  delay(500);
  // Vibration douce
  Serial.println(F("Vibration douce"));
  analogWrite(PIN_VIBREUR, 120);
  delay(500);
  // Pause
  Serial.println(F("Pause"));
  analogWrite(PIN_VIBREUR, 0);
  delay(1500);
}
