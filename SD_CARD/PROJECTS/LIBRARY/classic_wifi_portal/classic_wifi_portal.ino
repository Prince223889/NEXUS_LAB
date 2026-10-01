// ESP32 LAB — Portail de configuration Wi-Fi (captif) : saisie du réseau depuis un téléphone
// Sans réseau connu, la carte crée « ESP32-CONFIG » ; le téléphone ouvre automatiquement la page.
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>

WebServer server(80);
DNSServer dns;
Preferences prefs;
bool portal = false;

const char FORM[] PROGMEM = R"HTML(<!doctype html><html lang="fr"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Configuration Wi-Fi</title>
<style>body{font-family:system-ui;margin:24px;max-width:360px}input,button{width:100%;padding:12px;margin:6px 0;box-sizing:border-box}</style>
<h2>Réseau Wi-Fi</h2><form method="POST" action="/save"><input name="s" placeholder="Nom du réseau (SSID)" required>
<input name="p" type="password" placeholder="Mot de passe"><button>Enregistrer et redémarrer</button></form></html>)HTML";

void startPortal() {
  portal = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP("ESP32-CONFIG");
  dns.start(53, "*", WiFi.softAPIP());       // toutes les requêtes DNS -> la carte
  server.on("/save", HTTP_POST, []() {
    prefs.begin("wifi", false);
    prefs.putString("ssid", server.arg("s"));
    prefs.putString("pass", server.arg("p"));
    prefs.end();
    server.send(200, "text/html; charset=utf-8", "<meta charset=utf-8><p>Enregistré. Redémarrage…</p>");
    delay(1000);
    ESP.restart();
  });
  server.onNotFound([]() { server.send_P(200, "text/html; charset=utf-8", FORM); });
  server.begin();
  Serial.println(F("# portail de configuration : connectez-vous au Wi-Fi « ESP32-CONFIG »"));
}

void setup() {
  Serial.begin(115200);
  delay(300);
  prefs.begin("wifi", true);
  String ssid = prefs.getString("ssid", "");
  String pass = prefs.getString("pass", "");
  prefs.end();
  if (ssid.length()) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), pass.c_str());
    for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) delay(250);
  }
  if (WiFi.status() == WL_CONNECTED) Serial.printf("\n# connecté à %s : %s\n", ssid.c_str(), WiFi.localIP().toString().c_str());
  else startPortal();
}

void loop() {
  if (portal) {
    dns.processNextRequest();
    server.handleClient();
  }
}
