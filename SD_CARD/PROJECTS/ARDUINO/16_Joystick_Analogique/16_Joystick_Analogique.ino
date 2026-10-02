/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Joystick analogique
 * =====================================================================
 *  Explication : Lecture des axes X/Y et du bouton d'un joystick KY-023.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Joystick +5V
 *   Arduino GND    -> Joystick GND
 *   Arduino A0     -> Joystick VRx
 *   Arduino A1     -> Joystick VRy
 *   Arduino D2     -> Joystick SW
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_X = A0, PIN_Y = A1, PIN_SW = 2;
const int ZONE_MORTE = 60;               // ignore les petites variations au centre

const char* direction(int x, int y) {
  if (y < 512 - ZONE_MORTE * 4) return "HAUT";
  if (y > 512 + ZONE_MORTE * 4) return "BAS";
  if (x < 512 - ZONE_MORTE * 4) return "GAUCHE";
  if (x > 512 + ZONE_MORTE * 4) return "DROITE";
  return "CENTRE";
}

void setup() {
  pinMode(PIN_SW, INPUT_PULLUP);
  Serial.begin(9600);
  Serial.println(F("[16] Joystick pret"));
}

void loop() {
  int x = analogRead(PIN_X), y = analogRead(PIN_Y);
  bool appui = digitalRead(PIN_SW) == LOW;
  Serial.print(F("X=")); Serial.print(x);
  Serial.print(F(" Y=")); Serial.print(y);
  Serial.print(F(" Dir=")); Serial.print(direction(x, y));
  Serial.println(appui ? F(" [CLIC]") : F(""));
  delay(150);
}
