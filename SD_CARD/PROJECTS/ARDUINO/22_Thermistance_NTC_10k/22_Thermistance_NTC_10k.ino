/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Thermistance NTC 10k
 * =====================================================================
 *  Explication : Calcule la température d'une thermistance NTC 10 kΩ avec l'équation de Steinhart-Hart simplifiée (coefficient B).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Résistance 10k (côté haut)
 *   Arduino A0     -> Point milieu résistance/NTC
 *   Arduino GND    -> NTC (côté bas)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Paramètres du montage et de la thermistance
const uint8_t PIN_NTC = A0;
const float R_SERIE   = 10000.0;   // résistance fixe (ohms)
const float R_NOMINAL = 10000.0;   // résistance NTC à 25 °C
const float T_NOMINAL = 25.0;      // température nominale (°C)
const float COEF_B    = 3950.0;    // coefficient B de la NTC

// Calcule la température en °C à partir de la lecture analogique
float lireTemperature() {
  int brut = analogRead(PIN_NTC);
  if (brut <= 0 || brut >= 1023) return NAN;           // capteur débranché ou court-circuit
  float rNtc = R_SERIE * brut / (1023.0 - brut);        // pont diviseur : NTC côté GND
  float inverseT = log(rNtc / R_NOMINAL) / COEF_B + 1.0 / (T_NOMINAL + 273.15);
  return 1.0 / inverseT - 273.15;                       // Kelvin -> °C
}

void setup() {
  Serial.begin(9600);
  Serial.println(F("[22] Thermistance NTC prete"));
}

void loop() {
  float t = lireTemperature();
  if (isnan(t)) Serial.println(F("Erreur de lecture"));
  else { Serial.print(F("Temperature: ")); Serial.print(t, 1); Serial.println(F(" C")); }
  delay(1000);
}
