// ESP32 LAB — Mesure analogique propre : tension étalonnée, suréchantillonnage, min/max, bruit
#include <Arduino.h>

const uint8_t ADC_PIN = 34;                  // ADC1 uniquement si le Wi-Fi est actif
const int SAMPLES = 64;

void setup() {
  Serial.begin(115200);
  delay(300);
  analogReadResolution(12);
  analogSetPinAttenuation(ADC_PIN, ADC_11db); // plage ~0-3,1 V
}

void loop() {
  uint32_t sum = 0;
  uint32_t mn = 99999, mx = 0;
  for (int i = 0; i < SAMPLES; i++) {
    uint32_t mv = analogReadMilliVolts(ADC_PIN);   // valeur corrigée par l'étalonnage d'usine (eFuse)
    sum += mv;
    mn = min(mn, mv);
    mx = max(mx, mv);
  }
  Serial.printf("moyenne_mV:%.1f\tmin_mV:%lu\tmax_mV:%lu\tbruit_mV:%lu\n", (float)sum / SAMPLES, (unsigned long)mn, (unsigned long)mx, (unsigned long)(mx - mn));
  delay(250);
}
