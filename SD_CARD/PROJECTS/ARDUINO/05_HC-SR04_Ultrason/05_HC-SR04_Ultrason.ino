/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  HC-SR04 Ultrason
 * =====================================================================
 *  Explication : Mesure de distance par ultrasons avec timeout (aucune bibliothèque).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> HC-SR04 VCC
 *   Arduino D9     -> HC-SR04 TRIG
 *   Arduino D10    -> HC-SR04 ECHO
 *   Arduino GND    -> HC-SR04 GND
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_TRIG = 9;
const uint8_t PIN_ECHO = 10;
const unsigned long TIMEOUT_US = 30000UL;   // ~5 m max

// Retourne la distance en cm, ou -1 si aucun écho
float mesurerDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);   // impulsion 10 µs
  digitalWrite(PIN_TRIG, LOW);
  unsigned long duree = pulseIn(PIN_ECHO, HIGH, TIMEOUT_US);
  if (duree == 0) return -1.0;
  return duree * 0.0343 / 2.0;                           // vitesse du son 343 m/s
}

void setup() {
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  Serial.begin(9600);
  Serial.println(F("[05] HC-SR04 pret"));
}

void loop() {
  float d = mesurerDistanceCm();
  if (d < 0) Serial.println(F("Hors de portee"));
  else { Serial.print(F("Distance: ")); Serial.print(d, 1); Serial.println(F(" cm")); }
  delay(200);
}
