/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  LCD 16x2 parallèle
 * =====================================================================
 *  Explication : Affiche un message et le temps écoulé sur un LCD 16x2 en mode 4 bits.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> LCD VDD + A (via 220 ohms) + pot extrémité
 *   Arduino GND    -> LCD VSS + RW + K + pot extrémité
 *   Arduino D12    -> LCD RS
 *   Arduino D11    -> LCD E
 *   Arduino D5     -> LCD D4
 *   Arduino D4     -> LCD D5
 *   Arduino D3     -> LCD D6
 *   Arduino D2     -> LCD D7
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : LiquidCrystal
 * =====================================================================
 */
// @libs: LiquidCrystal

#include <LiquidCrystal.h>

// RS, E, D4, D5, D6, D7
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

void setup() {
  Serial.begin(9600);
  lcd.begin(16, 2);          // 16 colonnes, 2 lignes
  lcd.print(F("Bonjour !"));
  Serial.println(F("[77] LCD 16x2 pret"));
}

void loop() {
  // Affiche le temps écoulé en secondes sur la 2e ligne
  unsigned long secondes = millis() / 1000;
  lcd.setCursor(0, 1);
  lcd.print(F("Temps: "));
  lcd.print(secondes);
  lcd.print(F(" s   "));
  Serial.print(F("Temps: ")); Serial.println(secondes);
  delay(1000);
}
