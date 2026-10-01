/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  KY-038 Capteur de son
 * =====================================================================
 *  Explication : Affiche le niveau sonore analogique et détecte les bruits forts via la sortie numérique.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> KY-038 +
 *   Arduino GND    -> KY-038 G
 *   Arduino A0     -> KY-038 A0
 *   Arduino D2     -> KY-038 D0
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches du module
const uint8_t PIN_ANALOG = A0;
const uint8_t PIN_NUM    = 2;
const uint8_t PIN_LED    = 13;   // LED intégrée

void setup() {
  pinMode(PIN_NUM, INPUT);
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[29] KY-038 pret (regler le seuil avec le potentiometre)"));
}

void loop() {
  int niveau = analogRead(PIN_ANALOG);
  bool bruitFort = digitalRead(PIN_NUM) == HIGH;   // HIGH quand le seuil est dépassé
  digitalWrite(PIN_LED, bruitFort ? HIGH : LOW);
  Serial.print(F("Niveau: ")); Serial.print(niveau);
  if (bruitFort) Serial.print(F("  -> BRUIT !"));
  Serial.println();
  delay(50);
}
