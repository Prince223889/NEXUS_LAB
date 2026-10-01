/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Débitmètre YF-S201
 * =====================================================================
 *  Explication : Mesure le débit d'eau en comptant les impulsions par interruption.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> YF-S201 rouge
 *   Arduino GND    -> YF-S201 noir
 *   Arduino D2     -> YF-S201 jaune (signal)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_DEBIT = 2;   // D2 = interruption 0

volatile unsigned long impulsions = 0;
float volumeTotal = 0;          // en litres

// Routine d'interruption : une impulsion de plus
void compter() {
  impulsions++;
}

void setup() {
  pinMode(PIN_DEBIT, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_DEBIT), compter, FALLING);
  Serial.begin(9600);
  Serial.println(F("[57] Debitmetre YF-S201 pret"));
}

void loop() {
  delay(1000);   // mesure sur 1 seconde

  // Copie protégée du compteur
  noInterrupts();
  unsigned long n = impulsions;
  impulsions = 0;
  interrupts();

  // Fréquence (Hz) = 7,5 x débit (L/min)
  float debit = n / 7.5;
  volumeTotal += debit / 60.0;

  Serial.print(F("Debit: ")); Serial.print(debit, 2); Serial.print(F(" L/min  "));
  Serial.print(F("Total: ")); Serial.print(volumeTotal, 3); Serial.println(F(" L"));
}
