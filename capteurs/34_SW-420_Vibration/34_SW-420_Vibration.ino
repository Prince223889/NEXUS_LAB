/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  SW-420 Vibration
 * =====================================================================
 *  Explication : Détecte les vibrations et compte le nombre de chocs avec un module SW-420.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> SW-420 VCC
 *   Arduino GND    -> SW-420 GND
 *   Arduino D2     -> SW-420 DO
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches
const uint8_t PIN_VIB = 2;
const uint8_t PIN_LED = 13;

unsigned int compteur = 0;
int etatPrecedent = LOW;

void setup() {
  pinMode(PIN_VIB, INPUT);
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[34] SW-420 pret"));
}

void loop() {
  int etat = digitalRead(PIN_VIB);        // HIGH pendant une vibration
  digitalWrite(PIN_LED, etat);
  // Compte chaque nouveau front montant
  if (etat == HIGH && etatPrecedent == LOW) {
    compteur++;
    Serial.print(F("Vibration detectee ! Total: "));
    Serial.println(compteur);
    delay(100);                            // évite de compter plusieurs fois le même choc
  }
  etatPrecedent = etat;
}
