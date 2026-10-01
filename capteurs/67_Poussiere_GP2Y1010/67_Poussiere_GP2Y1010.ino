/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Poussière GP2Y1010AU0F
 * =====================================================================
 *  Explication : Estime la densité de poussière dans l'air avec le capteur optique Sharp.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> GP2Y V-LED (via 150Ω) et VCC
 *   Arduino GND    -> GP2Y LED-GND et S-GND
 *   Arduino D2     -> GP2Y LED
 *   Arduino A0     -> GP2Y Vo
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_LED = 2;    // LED infrarouge (active à LOW)
const uint8_t PIN_VO  = A0;   // sortie analogique

void setup() {
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, HIGH);   // LED éteinte
  Serial.begin(9600);
  Serial.println(F("[67] GP2Y1010 pret"));
}

void loop() {
  // Cycle de mesure imposé par la notice : lecture 0,28 ms après allumage
  digitalWrite(PIN_LED, LOW);
  delayMicroseconds(280);
  int brut = analogRead(PIN_VO);
  delayMicroseconds(40);
  digitalWrite(PIN_LED, HIGH);
  delayMicroseconds(9680);

  // Conversion en tension puis en densité (mg/m3)
  float tension = brut * 5.0 / 1023.0;
  float densite = 0.17 * tension - 0.1;
  if (densite < 0) densite = 0;

  Serial.print(F("Tension: ")); Serial.print(tension, 2);
  Serial.print(F(" V  Poussiere: ")); Serial.print(densite * 1000, 0);
  Serial.println(F(" ug/m3"));
  delay(1000);
}
