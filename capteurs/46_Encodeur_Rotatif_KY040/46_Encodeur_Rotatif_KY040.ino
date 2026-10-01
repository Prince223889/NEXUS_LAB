/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Encodeur rotatif KY-040
 * =====================================================================
 *  Explication : Compte les crans de l'encodeur rotatif et détecte l'appui sur son bouton.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> KY-040 +
 *   Arduino GND    -> KY-040 GND
 *   Arduino D2     -> KY-040 CLK
 *   Arduino D3     -> KY-040 DT
 *   Arduino D4     -> KY-040 SW
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_CLK = 2;
const uint8_t PIN_DT  = 3;
const uint8_t PIN_SW  = 4;

long position = 0;          // compteur de crans
int dernierClk;             // état précédent de CLK

void setup() {
  pinMode(PIN_CLK, INPUT);
  pinMode(PIN_DT, INPUT);
  pinMode(PIN_SW, INPUT_PULLUP);   // bouton actif à LOW
  Serial.begin(9600);
  dernierClk = digitalRead(PIN_CLK);
  Serial.println(F("[46] Encodeur KY-040 pret"));
}

void loop() {
  // Détection d'un front sur CLK = un cran
  int clk = digitalRead(PIN_CLK);
  if (clk != dernierClk && clk == LOW) {
    // Le sens dépend de DT par rapport à CLK
    if (digitalRead(PIN_DT) != clk) position++;
    else position--;
    Serial.print(F("Position: "));
    Serial.println(position);
  }
  dernierClk = clk;

  // Appui sur le bouton : remise à zéro
  if (digitalRead(PIN_SW) == LOW) {
    position = 0;
    Serial.println(F("Bouton appuye -> remise a zero"));
    delay(300);   // anti-rebond simple
  }
}
