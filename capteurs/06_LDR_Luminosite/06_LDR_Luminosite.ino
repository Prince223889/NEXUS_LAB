/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  LDR Luminosité
 * =====================================================================
 *  Explication : Photorésistance en pont diviseur ; allume une LED quand il fait sombre.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> LDR patte 1
 *   Arduino A0     -> LDR patte 2 + R10k vers GND
 *   Arduino GND    -> R10k
 *   Arduino D13    -> LED anode via 220 ohms
 *   Arduino GND    -> LED cathode
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_LDR = A0;
const uint8_t PIN_LED = 13;
const int SEUIL_SOMBRE = 300;     // à ajuster selon la pièce
const int HYSTERESIS   = 30;      // évite le scintillement autour du seuil

bool ledAllumee = false;

void setup() {
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[06] LDR pret"));
}

void loop() {
  int lum = analogRead(PIN_LDR);      // plus c'est clair, plus la valeur est haute
  if (!ledAllumee && lum < SEUIL_SOMBRE - HYSTERESIS) ledAllumee = true;
  if ( ledAllumee && lum > SEUIL_SOMBRE + HYSTERESIS) ledAllumee = false;
  digitalWrite(PIN_LED, ledAllumee);
  Serial.print(F("Lumiere=")); Serial.print(lum);
  Serial.print(F("  LED=")); Serial.println(ledAllumee ? F("ON") : F("OFF"));
  delay(250);
}
