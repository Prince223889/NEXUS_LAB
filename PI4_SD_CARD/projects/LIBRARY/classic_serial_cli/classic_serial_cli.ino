// ESP32 LAB — Interpréteur de commandes série (help, led, pwm, heap, wifi, reboot)
#include <Arduino.h>
#include <WiFi.h>

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

String line;

void cmdHelp() {
  Serial.println(F("help            cette aide"));
  Serial.println(F("led on|off      LED intégrée"));
  Serial.println(F("pwm <0-255>     luminosité de la LED"));
  Serial.println(F("heap            mémoire libre"));
  Serial.println(F("scan            réseaux Wi-Fi"));
  Serial.println(F("reboot          redémarrer"));
}

void execute(String cmd) {
  cmd.trim();
  if (!cmd.length()) return;
  int sp = cmd.indexOf(' ');
  String verb = sp < 0 ? cmd : cmd.substring(0, sp);
  String arg = sp < 0 ? "" : cmd.substring(sp + 1);
  verb.toLowerCase();
  if (verb == "help") cmdHelp();
  else if (verb == "led") { ledcDetach(LED_BUILTIN); pinMode(LED_BUILTIN, OUTPUT); digitalWrite(LED_BUILTIN, arg == "on"); Serial.println(F("ok")); }
  else if (verb == "pwm") { ledcAttach(LED_BUILTIN, 5000, 8); ledcWrite(LED_BUILTIN, constrain(arg.toInt(), 0, 255)); Serial.println(F("ok")); }
  else if (verb == "heap") Serial.printf("%lu octets libres (min %lu)\n", (unsigned long)ESP.getFreeHeap(), (unsigned long)ESP.getMinFreeHeap());
  else if (verb == "scan") { int n = WiFi.scanNetworks(); for (int i = 0; i < n; i++) Serial.printf("%d dBm  %s\n", (int)WiFi.RSSI(i), WiFi.SSID(i).c_str()); WiFi.scanDelete(); }
  else if (verb == "reboot") { Serial.println(F("redémarrage…")); delay(100); ESP.restart(); }
  else Serial.println(F("commande inconnue, tapez help"));
}

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.mode(WIFI_STA);
  Serial.println(F("\nESP32 LAB — console prête (help)"));
  Serial.print(F("> "));
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (line.length()) { Serial.println(); execute(line); line = ""; Serial.print(F("> ")); }
    } else if (c == 8 || c == 127) {
      if (line.length()) line.remove(line.length() - 1);
    } else if (line.length() < 120) {
      line += c;
      Serial.print(c);                        // écho
    }
  }
}
