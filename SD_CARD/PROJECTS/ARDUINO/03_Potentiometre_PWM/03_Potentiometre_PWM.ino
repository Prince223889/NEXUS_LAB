/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Potentiomètre -> PWM
 * =====================================================================
 *  Explication : Lecture analogique d'un potentiomètre et variation de luminosité d'une LED (PWM).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Pot. extrémité 1
 *   Arduino GND    -> Pot. extrémité 2
 *   Arduino A0     -> Pot. curseur (milieu)
 *   Arduino D9     -> LED anode via 220 ohms
 *   Arduino GND    -> LED cathode
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_POT = A0;
const uint8_t PIN_LED = 9;              // broche PWM (~)

void setup() {
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[03] Potentiometre pret"));
}

void loop() {
  int brut = analogRead(PIN_POT);                 // 0..1023
  int pwm  = map(brut, 0, 1023, 0, 255);          // 0..255
  analogWrite(PIN_LED, pwm);
  Serial.print(F("ADC=")); Serial.print(brut);
  Serial.print(F("  PWM=")); Serial.println(pwm);
  delay(100);
}
