/* ESP32 LAB — profils de cartes pour l'allocation automatique des broches.
 * Chaque liste est triée par ordre de préférence (les broches « sans piège » d'abord). */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  LAB.BOARDS = {
    esp32: {
      id: 'esp32',
      name: 'ESP32 DevKit V1 (WROOM-32)',
      short: 'ESP32',
      fqbn: 'esp32:esp32:esp32',
      ide: 'ESP32 Dev Module',
      logic: 3.3,
      i2c: { sda: 21, scl: 22 },
      spi: { sck: 18, miso: 19, mosi: 23, ss: 5 },
      uarts: [
        { name: 'Serial2', rx: 16, tx: 17 },
        { name: 'Serial1', rx: 26, tx: 27 }
      ],
      i2s: { bclk: 26, ws: 25, dout: 22, din: 35 },
      // broches d'usage général, ordre de préférence
      out: [4, 13, 14, 16, 17, 25, 26, 27, 32, 33, 18, 19, 23, 5, 2, 15, 12],
      inOnly: [34, 35, 36, 39],
      adc: [34, 35, 32, 33, 36, 39],          // ADC1 uniquement (ADC2 inutilisable avec le Wi-Fi)
      dac: [25, 26],
      touch: [4, 13, 14, 27, 32, 33, 15, 12],
      led: 2,
      boot: 0,
      reserved: { 0: 'BOOT (strapping)', 1: 'TX0 (USB série)', 3: 'RX0 (USB série)', 6: 'flash', 7: 'flash', 8: 'flash', 9: 'flash', 10: 'flash', 11: 'flash' },
      caution: {
        2: 'strapping : LED bleue embarquée, doit rester LOW pendant le flash',
        5: 'strapping : niveau lu au démarrage',
        12: 'strapping : doit être LOW au démarrage (sinon tension flash 1,8 V)',
        15: 'strapping : active les logs du bootloader'
      },
      notes: ['GPIO34 à 39 : entrées uniquement, sans résistance de tirage interne.', 'ADC2 (GPIO0, 2, 4, 12-15, 25-27) indisponible quand le Wi-Fi est actif.']
    },
    esp32s3: {
      id: 'esp32s3',
      name: 'ESP32-S3 DevKitC-1 (N16R8)',
      short: 'ESP32-S3',
      fqbn: 'esp32:esp32:esp32s3',
      ide: 'ESP32S3 Dev Module',
      logic: 3.3,
      i2c: { sda: 8, scl: 9 },
      spi: { sck: 12, miso: 13, mosi: 11, ss: 10 },
      uarts: [
        { name: 'Serial1', rx: 18, tx: 17 },
        { name: 'Serial2', rx: 16, tx: 15 }
      ],
      i2s: { bclk: 41, ws: 42, dout: 40, din: 39 },
      out: [4, 5, 6, 7, 15, 16, 17, 18, 21, 38, 39, 40, 41, 42, 47, 1, 2, 14, 48],
      inOnly: [],
      adc: [1, 2, 4, 5, 6, 7, 3],               // ADC1
      dac: [],
      touch: [1, 2, 4, 5, 6, 7, 14],
      led: 48,
      boot: 0,
      reserved: { 19: 'USB D-', 20: 'USB D+', 26: 'flash', 27: 'flash', 28: 'flash', 29: 'flash', 30: 'flash', 31: 'flash', 32: 'flash', 33: 'PSRAM octale', 34: 'PSRAM octale', 35: 'PSRAM octale', 36: 'PSRAM octale', 37: 'PSRAM octale', 43: 'TX0', 44: 'RX0', 0: 'BOOT (strapping)', 45: 'strapping (VDD_SPI)', 46: 'strapping (ROM log)' },
      caution: { 3: 'strapping (JTAG) : laisser flottant au démarrage', 48: 'LED RGB embarquée (v1.0 / YD-ESP32-S3)', 38: 'LED RGB embarquée (DevKitC v1.1)' },
      notes: ['GPIO33 à 37 sont pris par la PSRAM octale sur les modules R8.', 'ADC2 (GPIO11-20) indisponible avec le Wi-Fi.']
    },
    esp32c3: {
      id: 'esp32c3',
      name: 'ESP32-C3 SuperMini / DevKitM',
      short: 'ESP32-C3',
      fqbn: 'esp32:esp32:esp32c3',
      ide: 'ESP32C3 Dev Module',
      logic: 3.3,
      i2c: { sda: 8, scl: 9 },
      spi: { sck: 4, miso: 5, mosi: 6, ss: 7 },
      uarts: [{ name: 'Serial1', rx: 20, tx: 21 }],
      i2s: { bclk: 4, ws: 5, dout: 6, din: 7 },
      out: [3, 10, 1, 0, 7, 6, 5, 4, 2],
      inOnly: [],
      adc: [0, 1, 2, 3, 4],
      dac: [],
      touch: [],
      led: 8,
      boot: -1,                                // GPIO9 (BOOT) partagé avec SCL
      reserved: { 11: 'flash', 12: 'flash', 13: 'flash', 14: 'flash', 15: 'flash', 16: 'flash', 17: 'flash', 18: 'USB D-', 19: 'USB D+' },
      caution: { 2: 'strapping : doit être HIGH au démarrage', 8: 'strapping + LED embarquée', 9: 'strapping (BOOT)' },
      notes: ['Pas de capteur tactile ni de DAC sur l\'ESP32-C3.', 'GPIO20/21 = UART0 si utilisés par le moniteur série.']
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
