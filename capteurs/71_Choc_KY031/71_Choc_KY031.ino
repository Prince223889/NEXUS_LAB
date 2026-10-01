/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur de choc KY-031
 * =====================================================================
 *  Explication : Détecte les chocs et vibrations et les compte.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> KY-031 +
 *   Arduino GND    -> KY-031 -
 *   Arduino D2     -> KY-031 S
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_CHOC = 2;
unsigned long nbChocs = 0;

void setup() {
  pinMode(PIN_CHOC, INPUT_PULLUP);   // sortie à LOW lors d'un choc
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[71] Capteur de choc KY-031 pret"));
}

void loop() {
  if (digitalRead(PIN_CHOC) == LOW) {
    nbChocs++;
    Serial.print(F("Choc detecte ! Total: "));
    Serial.println(nbChocs);
    digitalWrite(LED_BUILTIN, HIGH);
    delay(200);   // évite de compter plusieurs fois le même choc
    digitalWrite(LED_BUILTIN, LOW);
  }
}
