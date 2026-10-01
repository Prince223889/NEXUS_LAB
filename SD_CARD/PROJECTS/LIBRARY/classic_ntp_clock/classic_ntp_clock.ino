// ESP32 LAB — Horloge Internet (NTP) avec fuseau horaire et heure d'été automatiques
#include <Arduino.h>
#include <WiFi.h>
#include <time.h>

const char *WIFI_SSID = "VotreBox";
const char *WIFI_PASS = "VotreMotDePasse";
const char *TZ_EUROPE_PARIS = "CET-1CEST,M3.5.0,M10.5.0/3";   // chaîne POSIX (voir docs/FUSEAUX.md)

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  configTzTime(TZ_EUROPE_PARIS, "pool.ntp.org", "time.google.com");
  Serial.println(F("\n# synchronisation NTP…"));
}

void loop() {
  struct tm t;
  if (getLocalTime(&t, 2000)) {
    char buf[64];
    strftime(buf, sizeof(buf), "%A %d %B %Y, %H:%M:%S", &t);
    Serial.printf("# %s\n", buf);
  } else {
    Serial.println(F("# heure pas encore disponible"));
  }
  delay(1000);
}
