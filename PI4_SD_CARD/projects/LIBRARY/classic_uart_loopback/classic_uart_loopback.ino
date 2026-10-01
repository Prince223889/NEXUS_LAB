// ESP32 LAB — Test de boucle UART : reliez la broche TX à la broche RX de Serial1 avec un fil ; vérifie l'UART et les broches
#include <Arduino.h>

#if CONFIG_IDF_TARGET_ESP32
const int LOOP_TX = 17, LOOP_RX = 16;
#elif CONFIG_IDF_TARGET_ESP32S3
const int LOOP_TX = 17, LOOP_RX = 18;
#else
const int LOOP_TX = 21, LOOP_RX = 20;
#endif

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial1.begin(115200, SERIAL_8N1, LOOP_RX, LOOP_TX);
  Serial1.setTimeout(100);
  Serial.printf("\n# pont TX GPIO%d -> RX GPIO%d requis\n", LOOP_TX, LOOP_RX);
}

void loop() {
  static uint32_t ok = 0, ko = 0;
  char msg[32];
  snprintf(msg, sizeof(msg), "LAB-%lu", (unsigned long)(ok + ko));
  while (Serial1.available()) Serial1.read();
  Serial1.print(msg);
  Serial1.flush();
  char back[32] = {0};
  size_t n = Serial1.readBytes(back, strlen(msg));
  if (n == strlen(msg) && memcmp(back, msg, n) == 0) ok++; else ko++;
  Serial.printf("reussis:%lu\techecs:%lu\n", (unsigned long)ok, (unsigned long)ko);
  delay(500);
}
