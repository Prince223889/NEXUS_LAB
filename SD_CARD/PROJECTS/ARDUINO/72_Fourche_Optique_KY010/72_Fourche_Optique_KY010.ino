/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Fourche optique KY-010
 * =====================================================================
 *  Explication : Compte les passages d'un objet dans la fourche optique.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> KY-010 +
 *   Arduino GND    -> KY-010 -
 *   Arduino D2     -> KY-010 S
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_FOURCHE = 2;
unsigned long passages = 0;
int etatPrecedent;

void setup() {
  pinMode(PIN_FOURCHE, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  etatPrecedent = digitalRead(PIN_FOURCHE);
  Serial.println(F("[72] Fourche optique KY-010 prete"));
}

void loop() {
  int etat = digitalRead(PIN_FOURCHE);
  digitalWrite(LED_BUILTIN, etat);   // LED = faisceau coupé

  // Front montant : le faisceau vient d'être coupé
  if (etat == HIGH && etatPrecedent == LOW) {
    passages++;
    Serial.print(F("Passage #"));
    Serial.println(passages);
  }
  etatPrecedent = etat;
  delay(5);
}
