// ESP32 LAB — Point d'accès Wi-Fi + serveur web (sans box Internet)
// Connectez votre téléphone au réseau « ESP32-DEMO » puis ouvrez http://192.168.4.1/
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

const char *AP_SSID = "ESP32-DEMO";
const char *AP_PASS = "CHANGE_ME_WIFI_PASSWORD";          // 8 caractères minimum
WebServer server(80);
bool ledOn = false;

const char PAGE[] PROGMEM = R"HTML(<!doctype html><html lang="fr"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>ESP32</title>
<style>body{font-family:system-ui;margin:24px}button{font-size:18px;padding:12px 20px;border-radius:10px}</style>
<h1>ESP32 en point d'accès</h1><p id="s">…</p><button onclick="t()">Basculer la LED</button>
<script>async function r(){const d=await(await fetch('/etat')).json();document.getElementById('s').textContent=
'LED : '+(d.led?'allumée':'éteinte')+' — '+d.clients+' client(s) — '+Math.round(d.uptime/1000)+' s'}
async function t(){await fetch('/led',{method:'POST'});r()}r();setInterval(r,2000)</script></html>)HTML";

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(LED_BUILTIN, OUTPUT);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.printf("\n# Point d'accès « %s » — http://%s/\n", AP_SSID, WiFi.softAPIP().toString().c_str());
  server.on("/", []() { server.send_P(200, "text/html; charset=utf-8", PAGE); });
  server.on("/etat", []() {
    String j = String("{\"led\":") + (ledOn ? "true" : "false") + ",\"clients\":" + WiFi.softAPgetStationNum() +
               ",\"uptime\":" + millis() + "}";
    server.send(200, "application/json", j);
  });
  server.on("/led", HTTP_POST, []() {
    ledOn = !ledOn;
    digitalWrite(LED_BUILTIN, ledOn);
    server.send(204);
  });
  server.begin();
}

void loop() {
  server.handleClient();
}
