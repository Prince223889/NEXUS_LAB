// ESP32 LAB — Serveur TCP de type Telnet (port 23) : console de commandes à distance
// Test : telnet <IP> ou nc <IP> 23 ; commandes : help, heap, uptime, led on|off, bye
#include <Arduino.h>
#include <WiFi.h>

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

const char *WIFI_SSID = "ESP32-LAB";
const char *WIFI_PASS = "ESP32-LAB-Setup2026!";
NetworkServer server(23);
NetworkClient client;
String line;

void handle(const String &cmd) {
  if (cmd == "help") client.println("help | heap | uptime | led on | led off | bye");
  else if (cmd == "heap") client.printf("heap libre : %lu octets\r\n", (unsigned long)ESP.getFreeHeap());
  else if (cmd == "uptime") client.printf("en marche depuis %lu s\r\n", (unsigned long)(millis() / 1000));
  else if (cmd == "led on") { digitalWrite(LED_BUILTIN, HIGH); client.println("ok"); }
  else if (cmd == "led off") { digitalWrite(LED_BUILTIN, LOW); client.println("ok"); }
  else if (cmd == "bye") { client.println("au revoir"); client.stop(); }
  else if (cmd.length()) client.println("commande inconnue (help)");
}

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(LED_BUILTIN, OUTPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  server.begin();
  Serial.printf("\n# telnet %s\n", WiFi.localIP().toString().c_str());
}

void loop() {
  if (!client || !client.connected()) {
    client = server.accept();
    if (client) { client.println("ESP32 LAB — tapez help"); line = ""; }
    return;
  }
  while (client.available()) {
    char c = client.read();
    if (c == '\n') { line.trim(); handle(line); line = ""; }
    else if (c != '\r' && line.length() < 80) line += c;
  }
}
