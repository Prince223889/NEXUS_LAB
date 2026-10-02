/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur de niveau d'eau
 * =====================================================================
 *  Explication : Mesure le niveau d'eau avec un capteur à pistes et l'affiche en pourcentage.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D7     -> Capteur + (alimentation)
 *   Arduino GND    -> Capteur -
 *   Arduino A0     -> Capteur S
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches : le capteur est alimenté seulement pendant la mesure (limite la corrosion)
const uint8_t PIN_ALIM   = 7;
const uint8_t PIN_SIGNAL = A0;
const int VALEUR_MAX     = 600;   // valeur lue capteur totalement immergé (à calibrer)

// Alimente le capteur, lit la valeur puis le coupe
int lireNiveau() {
  digitalWrite(PIN_ALIM, HIGH);
  delay(10);
  int valeur = analogRead(PIN_SIGNAL);
  digitalWrite(PIN_ALIM, LOW);
  return valeur;
}

void setup() {
  pinMode(PIN_ALIM, OUTPUT);
  digitalWrite(PIN_ALIM, LOW);
  Serial.begin(9600);
  Serial.println(F("[32] Capteur de niveau d'eau pret"));
}

void loop() {
  int brut = lireNiveau();
  int pourcent = constrain(map(brut, 0, VALEUR_MAX, 0, 100), 0, 100);
  Serial.print(F("Brut: ")); Serial.print(brut);
  Serial.print(F("  Niveau: ")); Serial.print(pourcent); Serial.println(F(" %"));
  delay(1000);
}
