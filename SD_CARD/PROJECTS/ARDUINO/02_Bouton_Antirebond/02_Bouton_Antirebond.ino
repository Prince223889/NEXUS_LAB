/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Bouton anti-rebond
 * =====================================================================
 *  Explication : Bouton poussoir avec pull-up interne et anti-rebond logiciel, bascule une LED.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D2     -> Bouton patte 1
 *   Arduino GND    -> Bouton patte 2
 *   Arduino D13    -> LED anode via 220 ohms
 *   Arduino GND    -> LED cathode
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_BOUTON = 2;           // bouton vers GND (pull-up interne)
const uint8_t PIN_LED = 13;
const unsigned long ANTIREBOND_MS = 50;

int etatStable = HIGH;                  // HIGH = relâché (pull-up)
int dernierBrut = HIGH;
unsigned long dernierFront = 0;
bool led = false;

void setup() {
  pinMode(PIN_BOUTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[02] Bouton pret"));
}

void loop() {
  int brut = digitalRead(PIN_BOUTON);
  if (brut != dernierBrut) {            // changement : on relance le chrono
    dernierFront = millis();
    dernierBrut = brut;
  }
  if (millis() - dernierFront > ANTIREBOND_MS && brut != etatStable) {
    etatStable = brut;
    if (etatStable == LOW) {            // appui validé
      led = !led;
      digitalWrite(PIN_LED, led);
      Serial.print(F("LED = "));
      Serial.println(led ? F("ON") : F("OFF"));
    }
  }
}
