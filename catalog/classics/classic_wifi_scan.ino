// ESP32 LAB — Scanner Wi-Fi : réseaux, puissance, canal, sécurité
#include <Arduino.h>
#include <WiFi.h>

const char *securite(wifi_auth_mode_t m) {
  switch (m) {
    case WIFI_AUTH_OPEN: return "ouvert";
    case WIFI_AUTH_WEP: return "WEP";
    case WIFI_AUTH_WPA_PSK: return "WPA";
    case WIFI_AUTH_WPA2_PSK: return "WPA2";
    case WIFI_AUTH_WPA_WPA2_PSK: return "WPA/WPA2";
    case WIFI_AUTH_WPA3_PSK: return "WPA3";
    case WIFI_AUTH_WPA2_WPA3_PSK: return "WPA2/WPA3";
    case WIFI_AUTH_WPA2_ENTERPRISE: return "WPA2-Entreprise";
    default: return "autre";
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
}

void loop() {
  Serial.println(F("\n# Scan en cours…"));
  int n = WiFi.scanNetworks();
  if (n <= 0) {
    Serial.println(F("# aucun réseau trouvé"));
  } else {
    Serial.printf("# %d réseau(x)\n", n);
    Serial.println(F("  N  RSSI  Canal  Sécurité        SSID"));
    for (int i = 0; i < n; i++) {
      Serial.printf("%3d  %4ld  %5ld  %-15s %s\n", i + 1, (long)WiFi.RSSI(i), (long)WiFi.channel(i),
                    securite(WiFi.encryptionType(i)), WiFi.SSID(i).length() ? WiFi.SSID(i).c_str() : "(caché)");
    }
  }
  WiFi.scanDelete();
  delay(10000);
}
