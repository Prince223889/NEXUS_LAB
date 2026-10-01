// ESP32 LAB — Tableau de bord web : 4 sorties et une entrée analogique
// Rejoint le Wi-Fi du MASTER (ESP32-LAB) ; adaptez SSID/mot de passe si besoin.
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>

const char *WIFI_SSID = "ESP32-LAB";
const char *WIFI_PASS = "ESP32-LAB-Setup2026!";
const uint8_t OUTPUTS[4] = {4, 16, 17, 18};    // à adapter (ESP32 DevKit)
const uint8_t ANALOG_IN = 34;
WebServer server(80);

const char PAGE[] PROGMEM = R"HTML(<!doctype html><html lang="fr"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>GPIO</title>
<style>body{font-family:system-ui;margin:20px}.g{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:420px}
button{padding:18px;font-size:16px;border-radius:12px;border:1px solid #888}button.on{background:#2e7d32;color:#fff}</style>
<h1>Sorties GPIO</h1><div class="g" id="g"></div><p>Entrée analogique : <b id="a">…</b> mV</p>
<script>async function r(){const d=await(await fetch('/api')).json();document.getElementById('a').textContent=d.adc;
document.getElementById('g').innerHTML=d.out.map((v,i)=>`<button class="${v?'on':''}" onclick="t(${i})">GPIO${d.pins[i]} : ${v?'ON':'OFF'}</button>`).join('')}
async function t(i){await fetch('/toggle?i='+i,{method:'POST'});r()}r();setInterval(r,1500)</script></html>)HTML";

void setup() {
  Serial.begin(115200);
  delay(300);
  for (uint8_t p : OUTPUTS) { pinMode(p, OUTPUT); digitalWrite(p, LOW); }
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  Serial.printf("\n# http://%s/\n", WiFi.localIP().toString().c_str());
  server.on("/", []() { server.send_P(200, "text/html; charset=utf-8", PAGE); });
  server.on("/api", []() {
    String j = "{\"pins\":[";
    for (int i = 0; i < 4; i++) j += String(i ? "," : "") + OUTPUTS[i];
    j += "],\"out\":[";
    for (int i = 0; i < 4; i++) j += String(i ? "," : "") + digitalRead(OUTPUTS[i]);
    j += "],\"adc\":" + String(analogReadMilliVolts(ANALOG_IN)) + "}";
    server.send(200, "application/json", j);
  });
  server.on("/toggle", HTTP_POST, []() {
    int i = server.arg("i").toInt();
    if (i >= 0 && i < 4) digitalWrite(OUTPUTS[i], !digitalRead(OUTPUTS[i]));
    server.send(204);
  });
  server.begin();
}

void loop() {
  server.handleClient();
}
