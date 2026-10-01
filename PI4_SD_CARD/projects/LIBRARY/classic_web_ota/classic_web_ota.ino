// ESP32 LAB — Page web de mise à jour : envoyez un .bin compilé depuis le navigateur
// Croquis > Exporter les binaires compilés, puis http://<IP>/update
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>

const char *WIFI_SSID = "ESP32-LAB";
const char *WIFI_PASS = "ESP32-LAB-Setup2026!";
WebServer server(80);

const char FORM[] PROGMEM = R"HTML(<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<h2>Mise à jour du firmware</h2><form method="POST" action="/update" enctype="multipart/form-data">
<input type="file" name="firmware" accept=".bin"> <button>Envoyer</button></form>)HTML";

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  server.on("/update", HTTP_GET, []() { server.send_P(200, "text/html; charset=utf-8", FORM); });
  server.on("/update", HTTP_POST, []() {
    server.send(200, "text/plain; charset=utf-8", Update.hasError() ? "Échec de la mise à jour" : "OK, redémarrage…");
    delay(500);
    if (!Update.hasError()) ESP.restart();
  }, []() {
    HTTPUpload &up = server.upload();
    if (up.status == UPLOAD_FILE_START) {
      Serial.printf("# réception de %s\n", up.filename.c_str());
      if (!Update.begin(UPDATE_SIZE_UNKNOWN)) Update.printError(Serial);
    } else if (up.status == UPLOAD_FILE_WRITE) {
      if (Update.write(up.buf, up.currentSize) != up.currentSize) Update.printError(Serial);
    } else if (up.status == UPLOAD_FILE_END) {
      if (Update.end(true)) Serial.printf("# %u octets écrits\n", up.totalSize);
      else Update.printError(Serial);
    }
  });
  server.begin();
  Serial.printf("\n# http://%s/update\n", WiFi.localIP().toString().c_str());
}

void loop() {
  server.handleClient();
}
