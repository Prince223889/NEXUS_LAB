/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  FC-37 Capteur de pluie
 * =====================================================================
 *  Explication : Mesure la quantité d'eau sur la plaque de pluie et indique s'il pleut.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Module VCC
 *   Arduino GND    -> Module GND
 *   Arduino A0     -> Module A0
 *   Arduino D2     -> Module D0
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches du module
const uint8_t PIN_ANALOG = A0;
const uint8_t PIN_NUM    = 2;

void setup() {
  pinMode(PIN_NUM, INPUT);
  Serial.begin(9600);
  Serial.println(F("[31] Capteur de pluie pret"));
}

void loop() {
  int brut = analogRead(PIN_ANALOG);                 // 1023 = sec, valeur basse = mouillé
  int humidite = map(brut, 1023, 0, 0, 100);         // conversion en pourcentage
  bool pluie = digitalRead(PIN_NUM) == LOW;          // sortie active à l'état bas
  Serial.print(F("Eau: ")); Serial.print(humidite); Serial.print(F(" %"));
  Serial.println(pluie ? F("  -> IL PLEUT") : F("  -> sec"));
  delay(500);
}
