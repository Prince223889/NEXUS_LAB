/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Microphone MAX4466
 * =====================================================================
 *  Explication : Mesure le niveau sonore crête à crête sur une fenêtre de 50 ms.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> MAX4466 VCC
 *   Arduino GND    -> MAX4466 GND
 *   Arduino A0     -> MAX4466 OUT
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_MIC = A0;
const unsigned long FENETRE_MS = 50;   // durée d'échantillonnage

void setup() {
  Serial.begin(9600);
  Serial.println(F("[65] Microphone MAX4466 pret"));
}

void loop() {
  int mini = 1023, maxi = 0;
  unsigned long debut = millis();

  // Recherche du min et du max pendant la fenêtre
  while (millis() - debut < FENETRE_MS) {
    int v = analogRead(PIN_MIC);
    if (v > maxi) maxi = v;
    if (v < mini) mini = v;
  }

  // Amplitude crête à crête en volts
  float crete = (maxi - mini) * 5.0 / 1023.0;
  Serial.print(F("Niveau: "));
  Serial.print(crete, 2);
  Serial.println(F(" V cc"));
}
