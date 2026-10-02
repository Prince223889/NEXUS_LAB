/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Ventilateur PWM MOSFET
 * =====================================================================
 *  Explication : Règle la vitesse d'un ventilateur 12V avec un potentiomètre via un MOSFET logique.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D9     -> MOSFET grille (via 220 ohms)
 *   Arduino GND    -> MOSFET source + GND alim externe
 *   Arduino 5V     -> Potentiomètre extrémité
 *   Arduino A0     -> Potentiomètre curseur
 *   Arduino GND    -> Potentiomètre extrémité
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Le ventilateur est entre +12V et le drain du MOSFET
const uint8_t PIN_MOSFET = 9;   // PWM
const uint8_t PIN_POT = A0;

void setup() {
  pinMode(PIN_MOSFET, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[87] Ventilateur pret"));
}

void loop() {
  // Lecture du potentiomètre et conversion 0-1023 -> 0-255
  int lecture = analogRead(PIN_POT);
  uint8_t vitesse = map(lecture, 0, 1023, 0, 255);
  analogWrite(PIN_MOSFET, vitesse);

  Serial.print(F("Vitesse: "));
  Serial.print(vitesse * 100 / 255);
  Serial.println(F(" %"));
  delay(200);
}
