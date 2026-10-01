/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  CO2 MH-Z19B (PWM)
 * =====================================================================
 *  Explication : Mesure la concentration de CO2 en lisant la sortie PWM du MH-Z19B.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> MH-Z19B Vin
 *   Arduino GND    -> MH-Z19B GND
 *   Arduino D2     -> MH-Z19B PWM
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_PWM = 2;
const long PLAGE = 5000;   // plage du capteur en ppm (5000 par défaut)

void setup() {
  pinMode(PIN_PWM, INPUT);
  Serial.begin(9600);
  Serial.println(F("[66] MH-Z19B : prechauffage 3 min conseille"));
}

void loop() {
  // Durées haute et basse d'un cycle d'environ 1004 ms (en ms)
  unsigned long th = pulseIn(PIN_PWM, HIGH, 2000000UL) / 1000;
  unsigned long tl = pulseIn(PIN_PWM, LOW, 2000000UL) / 1000;

  if (th == 0 || tl == 0) {
    Serial.println(F("Pas de signal"));
  } else {
    // Formule de la notice : ppm = plage x (Th - 2) / (Th + Tl - 4)
    long ppm = PLAGE * ((long)th - 2) / ((long)(th + tl) - 4);
    Serial.print(F("CO2: "));
    Serial.print(ppm);
    Serial.println(F(" ppm"));
  }
  delay(2000);
}
