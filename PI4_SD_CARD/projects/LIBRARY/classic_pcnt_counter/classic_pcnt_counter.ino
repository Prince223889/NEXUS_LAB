// ESP32 LAB — Compteur d'impulsions matériel (PCNT) : compte jusqu'à plusieurs MHz sans interruption
// Idéal pour débitmètres, codeurs, compteurs d'énergie à LED. (ESP32 / ESP32-S3 ; absent sur C3)
#include <Arduino.h>
#include "driver/pulse_cnt.h"

const int PULSE_PIN = 4;
pcnt_unit_handle_t unit = nullptr;

void setup() {
  Serial.begin(115200);
  delay(300);
  pcnt_unit_config_t ucfg = {};
  ucfg.low_limit = -1;
  ucfg.high_limit = 30000;
  ucfg.flags.accum_count = 1;                // cumule au-delà de la limite
  ESP_ERROR_CHECK(pcnt_new_unit(&ucfg, &unit));
  pcnt_glitch_filter_config_t filter = {.max_glitch_ns = 1000};
  ESP_ERROR_CHECK(pcnt_unit_set_glitch_filter(unit, &filter));
  pcnt_chan_config_t ccfg = {};
  ccfg.edge_gpio_num = PULSE_PIN;
  ccfg.level_gpio_num = -1;
  pcnt_channel_handle_t chan = nullptr;
  ESP_ERROR_CHECK(pcnt_new_channel(unit, &ccfg, &chan));
  ESP_ERROR_CHECK(pcnt_channel_set_edge_action(chan, PCNT_CHANNEL_EDGE_ACTION_INCREASE, PCNT_CHANNEL_EDGE_ACTION_HOLD));
  ESP_ERROR_CHECK(pcnt_unit_add_watch_point(unit, 30000));
  ESP_ERROR_CHECK(pcnt_unit_enable(unit));
  ESP_ERROR_CHECK(pcnt_unit_clear_count(unit));
  ESP_ERROR_CHECK(pcnt_unit_start(unit));
  pinMode(PULSE_PIN, INPUT_PULLUP);
}

void loop() {
  static int last = 0;
  int count = 0;
  pcnt_unit_get_count(unit, &count);
  Serial.printf("total:%d\tfrequence_hz:%d\n", count, count - last);
  last = count;
  delay(1000);
}
