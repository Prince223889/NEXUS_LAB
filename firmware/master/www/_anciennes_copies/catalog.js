/* ESP32 LAB — bibliothèque embarquée (généré par catalog/build.js, ne pas modifier à la main) */
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

/* Bibliothèques Arduino référencées par les modules (nom exact du Gestionnaire de bibliothèques,
 * version validée par compilation avec Arduino-ESP32 3.3.12, dépôt GitHub). */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const lib = (name, ver, repo, author) => ({ name, ver, repo, author: author || '' });
  LAB.LIBS = {
    sensor: lib('Adafruit Unified Sensor', '1.1.15', 'adafruit/Adafruit_Sensor', 'Adafruit'),
    busio: lib('Adafruit BusIO', '1.17.4', 'adafruit/Adafruit_BusIO', 'Adafruit'),
    gfx: lib('Adafruit GFX Library', '1.12.6', 'adafruit/Adafruit-GFX-Library', 'Adafruit'),
    dht: lib('DHT sensor library', '1.4.7', 'adafruit/DHT-sensor-library', 'Adafruit'),
    bme280: lib('Adafruit BME280 Library', '2.3.0', 'adafruit/Adafruit_BME280_Library', 'Adafruit'),
    bmp280: lib('Adafruit BMP280 Library', '3.0.0', 'adafruit/Adafruit_BMP280_Library', 'Adafruit'),
    bmp085: lib('Adafruit BMP085 Library', '1.2.4', 'adafruit/Adafruit-BMP085-Library', 'Adafruit'),
    bme680: lib('Adafruit BME680 Library', '2.0.6', 'adafruit/Adafruit_BME680', 'Adafruit'),
    bmp3xx: lib('Adafruit BMP3XX Library', '2.1.6', 'adafruit/Adafruit_BMP3XX', 'Adafruit'),
    sht31: lib('Adafruit SHT31 Library', '2.2.2', 'adafruit/Adafruit_SHT31', 'Adafruit'),
    sht4x: lib('Adafruit SHT4x Library', '1.0.5', 'adafruit/Adafruit_SHT4X', 'Adafruit'),
    ahtx0: lib('Adafruit AHTX0', '2.0.6', 'adafruit/Adafruit_AHTX0', 'Adafruit'),
    htu21: lib('Adafruit HTU21DF Library', '1.1.2', 'adafruit/Adafruit_HTU21DF_Library', 'Adafruit'),
    si7021: lib('Adafruit Si7021 Library', '1.5.3', 'adafruit/Adafruit_Si7021', 'Adafruit'),
    mcp9808: lib('Adafruit MCP9808 Library', '2.0.2', 'adafruit/Adafruit_MCP9808_Library', 'Adafruit'),
    tmp117: lib('Adafruit TMP117', '1.0.5', 'adafruit/Adafruit_TMP117', 'Adafruit'),
    max31855: lib('Adafruit MAX31855 library', '1.4.2', 'adafruit/Adafruit-MAX31855-library', 'Adafruit'),
    max31865: lib('Adafruit MAX31865 library', '1.6.2', 'adafruit/Adafruit_MAX31865', 'Adafruit'),
    mlx90614: lib('Adafruit MLX90614 Library', '2.1.6', 'adafruit/Adafruit-MLX90614-Library', 'Adafruit'),
    amg88: lib('Adafruit AMG88xx Library', '1.3.2', 'adafruit/Adafruit_AMG88xx', 'Adafruit'),
    dps310: lib('Adafruit DPS310', '1.1.6', 'adafruit/Adafruit_DPS310', 'Adafruit'),
    lps2x: lib('Adafruit LPS2X', '2.0.6', 'adafruit/Adafruit_LPS2X', 'Adafruit'),
    scd30: lib('Adafruit SCD30', '1.0.11', 'adafruit/Adafruit_SCD30', 'Adafruit'),
    ccs811: lib('Adafruit CCS811 Library', '1.1.3', 'adafruit/Adafruit_CCS811', 'Adafruit'),
    sgp30: lib('Adafruit SGP30 Sensor', '2.0.3', 'adafruit/Adafruit_SGP30', 'Adafruit'),
    sgp40: lib('Adafruit SGP40 Sensor', '1.1.4', 'adafruit/Adafruit_SGP40', 'Adafruit'),
    veml6070: lib('Adafruit VEML6070 Library', '1.0.8', 'adafruit/Adafruit_VEML6070', 'Adafruit'),
    ltr390: lib('Adafruit LTR390 Library', '1.1.2', 'adafruit/Adafruit_LTR390', 'Adafruit'),
    si1145: lib('Adafruit SI1145 Library', '1.2.2', 'adafruit/Adafruit_SI1145_Library', 'Adafruit'),
    tsl2561: lib('Adafruit TSL2561', '1.1.3', 'adafruit/Adafruit_TSL2561', 'Adafruit'),
    tsl2591: lib('Adafruit TSL2591 Library', '1.4.5', 'adafruit/Adafruit_TSL2591_Library', 'Adafruit'),
    veml7700: lib('Adafruit VEML7700 Library', '2.1.6', 'adafruit/Adafruit_VEML7700', 'Adafruit'),
    tcs34725: lib('Adafruit TCS34725', '1.4.0', 'adafruit/Adafruit_TCS34725', 'Adafruit'),
    apds9960: lib('Adafruit APDS9960 Library', '1.3.1', 'adafruit/Adafruit_APDS9960', 'Adafruit'),
    as7341: lib('Adafruit AS7341', '1.4.1', 'adafruit/Adafruit_AS7341', 'Adafruit'),
    vl53l0x: lib('Adafruit_VL53L0X', '1.2.5', 'adafruit/Adafruit_VL53L0X', 'Adafruit'),
    vl6180x: lib('Adafruit_VL6180X', '1.4.4', 'adafruit/Adafruit_VL6180X', 'Adafruit'),
    vl53l1x: lib('VL53L1X', '1.3.1', 'pololu/vl53l1x-arduino', 'Pololu'),
    mpu6050: lib('Adafruit MPU6050', '2.2.9', 'adafruit/Adafruit_MPU6050', 'Adafruit'),
    adxl345: lib('Adafruit ADXL345', '1.3.4', 'adafruit/Adafruit_ADXL345', 'Adafruit'),
    lis3dh: lib('Adafruit LIS3DH', '1.3.0', 'adafruit/Adafruit_LIS3DH', 'Adafruit'),
    lsm6ds: lib('Adafruit LSM6DS', '4.7.4', 'adafruit/Adafruit_LSM6DS', 'Adafruit'),
    lis3mdl: lib('Adafruit LIS3MDL', '1.2.5', 'adafruit/Adafruit_LIS3MDL', 'Adafruit'),
    bno055: lib('Adafruit BNO055', '1.6.4', 'adafruit/Adafruit_BNO055', 'Adafruit'),
    hmc5883: lib('Adafruit HMC5883 Unified', '1.2.4', 'adafruit/Adafruit_HMC5883_Unified', 'Adafruit'),
    mpr121: lib('Adafruit MPR121', '1.2.1', 'adafruit/Adafruit_MPR121', 'Adafruit'),
    ina219: lib('Adafruit INA219', '1.1.0', 'adafruit/Adafruit_INA219', 'Adafruit'),
    ina260: lib('Adafruit INA260 Library', '1.5.3', 'adafruit/Adafruit_INA260', 'Adafruit'),
    pn532: lib('Adafruit PN532', '1.3.4', 'adafruit/Adafruit-PN532', 'Adafruit'),
    finger: lib('Adafruit Fingerprint Sensor Library', '2.1.4', 'adafruit/Adafruit-Fingerprint-Sensor-Library', 'Adafruit'),
    neopixel: lib('Adafruit NeoPixel', '1.15.5', 'adafruit/Adafruit_NeoPixel', 'Adafruit'),
    pca9685: lib('Adafruit PWM Servo Driver Library', '3.0.3', 'adafruit/Adafruit-PWM-Servo-Driver-Library', 'Adafruit'),
    mcp23017: lib('Adafruit MCP23017 Arduino Library', '2.3.2', 'adafruit/Adafruit-MCP23017-Arduino-Library', 'Adafruit'),
    ads1x15: lib('Adafruit ADS1X15', '2.6.2', 'adafruit/Adafruit_ADS1X15', 'Adafruit'),
    mcp4725: lib('Adafruit MCP4725', '2.0.2', 'adafruit/Adafruit_MCP4725', 'Adafruit'),
    ssd1306: lib('Adafruit SSD1306', '2.5.17', 'adafruit/Adafruit_SSD1306', 'Adafruit'),
    sh110x: lib('Adafruit SH110X', '2.1.15', 'adafruit/Adafruit_SH110X', 'Adafruit'),
    st7735: lib('Adafruit ST7735 and ST7789 Library', '1.11.0', 'adafruit/Adafruit-ST7735-Library', 'Adafruit'),
    ili9341: lib('Adafruit ILI9341', '1.6.4', 'adafruit/Adafruit_ILI9341', 'Adafruit'),
    pcd8544: lib('Adafruit PCD8544 Nokia 5110 LCD library', '2.0.3', 'adafruit/Adafruit-PCD8544-Nokia-5110-LCD-library', 'Adafruit'),
    backpack: lib('Adafruit LED Backpack Library', '1.5.1', 'adafruit/Adafruit_LED_Backpack', 'Adafruit'),
    rtclib: lib('RTClib', '2.1.4', 'adafruit/RTClib', 'Adafruit'),
    seesaw: lib('Adafruit seesaw Library', '1.7.9', 'adafruit/Adafruit_seesaw', 'Adafruit'),
    bh1750: lib('BH1750', '1.3.0', 'claws/BH1750', 'Christopher Laws'),
    onewire: lib('OneWire', '2.3.8', 'PaulStoffregen/OneWire', 'Paul Stoffregen'),
    dallas: lib('DallasTemperature', '4.0.6', 'milesburton/Arduino-Temperature-Control-Library', 'Miles Burton'),
    ms5611: lib('MS5611', '0.5.2', 'RobTillaart/MS5611', 'Rob Tillaart'),
    ina226: lib('INA226', '0.6.6', 'RobTillaart/INA226', 'Rob Tillaart'),
    tinygps: lib('TinyGPSPlus', '1.0.3', 'mikalhart/TinyGPSPlus', 'Mikal Hart'),
    hx711: lib('HX711 Arduino Library', '0.7.5', 'bogde/HX711', 'Bogdan Necula'),
    irremote: lib('IRremote', '4.7.1', 'Arduino-IRremote/Arduino-IRremote', 'Armin Joachimsmeyer'),
    max3010x: lib('SparkFun MAX3010x Pulse and Proximity Sensor Library', '1.1.2', 'sparkfun/SparkFun_MAX3010x_Sensor_Library', 'SparkFun'),
    pzem: lib('PZEM004Tv30', '1.2.1', 'mandulaj/PZEM-004T-v30', 'Jakub Mandula'),
    mfrc522: lib('MFRC522', '1.4.12', 'miguelbalboa/rfid', 'GithubCommunity'),
    keypad: lib('Keypad', '3.1.1', 'Chris--A/Keypad', 'Mark Stanley, Alexander Brevig'),
    servo: lib('ESP32Servo', '3.2.1', 'madhephaestus/ESP32Servo', 'Kevin Harrington, John K. Bennett'),
    accel: lib('AccelStepper', '1.64', 'waspinator/AccelStepper', 'Mike McCauley'),
    dfplayer: lib('DFRobotDFPlayerMini', '1.0.5', 'DFRobot/DFRobotDFPlayerMini', 'DFRobot'),
    lcdi2c: lib('LiquidCrystal I2C', '1.1.2', 'johnrickman/LiquidCrystal_I2C', 'Frank de Brabander'),
    tm1637: lib('TM1637', '1.2.0', 'avishorp/TM1637', 'Avishay Orpaz'),
    rf24: lib('RF24', '1.6.2', 'nRF24/RF24', 'TMRh20'),
    lora: lib('LoRa', '0.8.0', 'sandeepmistry/arduino-LoRa', 'Sandeep Mistry'),
    rcswitch: lib('rc-switch', '2.6.4', 'sui77/rc-switch', 'sui77'),
    mcpcan: lib('mcp_can', '1.5.1', 'coryjfowler/MCP_CAN_lib', 'coryjfowler'),
    as5600: lib('AS5600', '0.6.7', 'RobTillaart/AS5600', 'Rob Tillaart'),
    u8g2: lib('U8g2', '2.36.19', 'olikraus/U8g2_Arduino', 'oliver'),
    arduinojson: lib('ArduinoJson', '7.4.3', 'bblanchon/ArduinoJson', 'Benoît Blanchon'),
    pubsub: lib('PubSubClient', '2.8', 'knolleary/pubsubclient', 'Nick O\'Leary')
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ESP32 LAB Studio — générateur de programmes Arduino (ESP32 / ESP32-S3 / ESP32-C3).
 * Utilisé à la fois par l'interface web du MASTER (navigateur) et par le script de build
 * (Node.js) qui produit les projets de la bibliothèque. Aucune dépendance. */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  LAB.MODULES = LAB.MODULES || [];
  LAB.VERSION = '6.0.0';

  const C = String.raw;
  const byId = (id) => LAB.MODULES.find((m) => m.id === id);
  LAB.module = byId;

  /* Ensemble de broches candidates par type de besoin. */
  function pool(board, type) {
    const out = board.out.slice();
    switch (type) {
      case 'adc': return board.adc.slice();
      case 'dac': return board.dac.slice();
      case 'touch': return board.touch.slice();
      case 'in': return board.inOnly.concat(out);            // entrée sans pull-up interne : les GPIO « entrée seule » d'abord
      case 'uart_rx': return board.inOnly.concat(out);
      case 'in_pullup':
      case 'io':
      case 'out':
      case 'pwm':
      case 'cs':
      case 'uart_tx':
      case 'i2s':
      default: return out;
    }
  }
  const SCARCITY = { dac: 0, touch: 1, adc: 2, uart_rx: 3, uart_tx: 3, in: 4, i2s: 5, cs: 6, io: 7, in_pullup: 7, pwm: 8, out: 9 };

  function sanitize(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'x';
  }
  LAB.sanitize = sanitize;

  function cStr(s) {
    return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function fmtNum(v) {
    const n = Number(v);
    if (!isFinite(n)) return '0.0f';
    const s = String(n);
    return (s.includes('.') || s.includes('e') ? s : s + '.0') + 'f';
  }

  /* ------------------------------------------------------------------ */
  /* Allocation des broches                                              */
  /* ------------------------------------------------------------------ */
  function allocatePins(board, instances, warnings) {
    const used = {};   // gpio -> description
    const assign = {}; // `${i}:${role}` -> gpio
    const mark = (g, who) => { used[g] = who; };
    const need = instances.map((x) => x.mod);
    const hasI2C = need.some((m) => m.bus === 'i2c');
    const hasSPI = need.some((m) => m.bus === 'spi');
    if (hasI2C) { mark(board.i2c.sda, 'I2C SDA'); mark(board.i2c.scl, 'I2C SCL'); }
    if (hasSPI) { mark(board.spi.sck, 'SPI SCK'); mark(board.spi.miso, 'SPI MISO'); mark(board.spi.mosi, 'SPI MOSI'); }

    // UART matériels
    let uartIdx = 0;
    const uartOf = {};
    instances.forEach((x, i) => {
      if (!x.mod.uart) return;
      const u = board.uarts[uartIdx++];
      if (!u) { warnings.push(`${x.label} : plus d'UART matériel disponible sur ${board.short}.`); return; }
      uartOf[i] = u;
    });

    // Demandes de broches individuelles
    const reqs = [];
    instances.forEach((x, i) => {
      (x.mod.pins || []).forEach((p) => {
        if (p.bus) return; // broche de bus déjà réservée
        reqs.push({ i, role: p.role, type: p.type || 'out', label: x.label, pin: p, optional: !!p.optional });
      });
    });

    // 1) choix imposés par l'utilisateur
    reqs.forEach((r) => {
      const forced = instances[r.i].pins && instances[r.i].pins[r.role];
      if (forced === undefined || forced === null || forced === '') return;
      const g = Number(forced);
      if (board.reserved[g]) warnings.push(`GPIO${g} (${r.label} ${r.role}) est réservé : ${board.reserved[g]}.`);
      if (used[g]) warnings.push(`GPIO${g} est déjà utilisé par ${used[g]} (conflit avec ${r.label} ${r.role}).`);
      assign[r.i + ':' + r.role] = g;
      mark(g, `${r.label} ${r.role}`);
    });
    // 2) UART : broches recommandées de la carte si libres
    reqs.forEach((r) => {
      if (assign[r.i + ':' + r.role] !== undefined) return;
      const u = uartOf[r.i];
      if (!u || (r.type !== 'uart_rx' && r.type !== 'uart_tx')) return;
      const g = r.type === 'uart_rx' ? u.rx : u.tx;
      if (!used[g]) { assign[r.i + ':' + r.role] = g; mark(g, `${r.label} ${r.role}`); }
    });
    // 3) le reste, du type le plus rare au plus courant
    const pending = reqs.filter((r) => assign[r.i + ':' + r.role] === undefined)
      .sort((a, b) => (SCARCITY[a.type] ?? 9) - (SCARCITY[b.type] ?? 9));
    pending.forEach((r) => {
      let cands = (r.pin.prefer || []).concat(pool(board, r.type));
      cands = cands.filter((g) => !board.reserved[g]);
      let g = cands.find((c) => !used[c] && !board.caution[c]);
      if (g === undefined) {
        g = cands.find((c) => !used[c]);
        if (g !== undefined) warnings.push(`${r.label} ${r.role} → GPIO${g} : ${board.caution[g]}.`);
      }
      if (g === undefined) {
        if (r.optional) { assign[r.i + ':' + r.role] = -1; return; }
        warnings.push(`Plus de broche libre de type « ${r.type} » pour ${r.label} ${r.role} sur ${board.short}.`);
        g = -1;
      }
      assign[r.i + ':' + r.role] = g;
      if (g >= 0) mark(g, `${r.label} ${r.role}`);
    });
    return { assign, used, uartOf, hasI2C, hasSPI };
  }

  /* ------------------------------------------------------------------ */
  /* Substitution des marqueurs dans le code d'un module                 */
  /* ------------------------------------------------------------------ */
  function expand(code, ctx) {
    if (!code) return '';
    return String(code)
      .replace(/\{\{P:([A-Za-z0-9_]+)\}\}/g, (_, k) => {
        const v = ctx.params[k];
        return v === undefined ? '0' : String(v);
      })
      .replace(/\{\{SER\}\}/g, ctx.serial || 'Serial2')
      .replace(/\{\{LABEL\}\}/g, ctx.label)
      .replace(/\{\{NAME\}\}/g, ctx.name)
      .replace(/\{\{SDA\}\}/g, 'LAB_I2C_SDA')
      .replace(/\{\{SCL\}\}/g, 'LAB_I2C_SCL')
      .replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (_, role) => `${ctx.P}_${role}`)
      .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, v) => `${ctx.p}_${v}`);
  }

  function indent(code, n) {
    const pad = ' '.repeat(n);
    return String(code).split('\n').map((l) => (l.trim() ? pad + l : '')).join('\n');
  }

  function compareOp(op) {
    return ['>', '<', '>=', '<=', '==', '!='].includes(op) ? op : '>';
  }

  /* ------------------------------------------------------------------ */
  /* Générateur principal                                                */
  /* ------------------------------------------------------------------ */
  LAB.generate = function (spec) {
    const board = LAB.BOARDS[spec.board || 'esp32'] || LAB.BOARDS.esp32;
    const opts = Object.assign({ web: false, master: false, mqtt: false, home: true, wifi_ssid: 'ESP32-LAB', wifi_pass: 'ESP32-LAB-Setup2026!', mqtt_host: '192.168.4.2', device: '' }, spec.options || {});
    const title = spec.title || 'Projet ESP32 LAB';
    const safeTitle = String(title).replace(/["\\]/g, '');
    const device = sanitize(opts.device || title).slice(0, 20);
    const warnings = [];
    const counts = {};

    // Instances
    const instances = (spec.modules || []).map((m, idx) => {
      const mod = typeof m === 'string' ? byId(m) : byId(m.id);
      if (!mod) throw new Error('Module inconnu : ' + (m.id || m));
      counts[mod.id] = (counts[mod.id] || 0) + 1;
      const n = idx + 1;
      const key = mod.key || sanitize(mod.id);
      const label = (m.alias && sanitize(m.alias)) || (counts[mod.id] > 1 ? key + counts[mod.id] : key);
      const params = {};
      Object.entries(mod.params || {}).forEach(([k, p]) => { params[k] = p.def; });
      Object.assign(params, m.params || {});
      if (mod.boards && !mod.boards.includes(board.id)) warnings.push(`${mod.name} n'est pas compatible ${board.short} (${mod.boards.join(', ')}).`);
      return { mod, n, p: 'm' + n, P: 'M' + n, key, label, params, pins: m.pins || {} };
    });
    const labels = new Set();
    instances.forEach((x) => { while (labels.has(x.label)) x.label += '_' + x.n; labels.add(x.label); });

    const alloc = allocatePins(board, instances, warnings);

    // Conflits d'adresse I2C
    const addrs = {};
    instances.forEach((x) => {
      if (x.mod.bus !== 'i2c') return;
      const a = String(x.params.addr || (x.mod.addr && x.mod.addr[0]) || '').toLowerCase();
      if (!a) return;
      if (addrs[a]) warnings.push(`Conflit d'adresse I2C ${a} : ${addrs[a]} et ${x.mod.name}. Changez l'adresse (broche ADDR) ou utilisez un multiplexeur TCA9548A.`);
      else addrs[a] = x.mod.name;
    });

    // Bibliothèques, includes
    const libs = [];
    const libSeen = new Set();
    const includes = ['#include <Arduino.h>'];
    const incSeen = new Set(includes);
    const addInc = (s) => { if (!incSeen.has(s)) { incSeen.add(s); includes.push(s); } };
    if (alloc.hasI2C) addInc('#include <Wire.h>');
    if (alloc.hasSPI) addInc('#include <SPI.h>');
    instances.forEach((x) => {
      (x.mod.libs || []).forEach((l) => { if (!libSeen.has(l.name)) { libSeen.add(l.name); libs.push(l); } });
      (x.mod.inc || []).forEach((h) => addInc(h.startsWith('#') ? h : `#include ${h}`));
    });
    const needWifi = opts.web || opts.master || opts.mqtt;
    if (needWifi) addInc('#include <WiFi.h>');
    if (opts.web) addInc('#include <WebServer.h>');
    if (opts.master) addInc('#include <WiFiUdp.h>');
    if (opts.home) {
      addInc('#include <WiFi.h>');
      addInc('#include <WiFiUdp.h>');
      addInc('#include <Preferences.h>');
      addInc('#include <esp_ota_ops.h>');
    }
    if (opts.mqtt) {
      addInc('#include <PubSubClient.h>');
      if (!libSeen.has('PubSubClient')) { libSeen.add('PubSubClient'); libs.push({ name: 'PubSubClient', ver: '2.8', repo: 'knolleary/pubsubclient' }); }
    }

    // Câblage
    const wiring = [];
    instances.forEach((x) => {
      const m = x.mod;
      const vcc = m.vcc || '3V3';
      if (!m.internal) {
        wiring.push({ mod: x.label, name: m.name, pin: 'VCC', to: vcc.startsWith('5') ? '5V (VIN)' : '3V3', note: m.vccNote || '' });
        wiring.push({ mod: x.label, name: m.name, pin: 'GND', to: 'GND', note: '' });
      }
      (m.pins || []).forEach((p) => {
        let g;
        if (p.bus === 'sda') g = board.i2c.sda;
        else if (p.bus === 'scl') g = board.i2c.scl;
        else if (p.bus === 'sck') g = board.spi.sck;
        else if (p.bus === 'miso') g = board.spi.miso;
        else if (p.bus === 'mosi') g = board.spi.mosi;
        else g = alloc.assign[x.n - 1 + ':' + p.role];
        if (g === -1 && p.optional) return;
        wiring.push({ mod: x.label, name: m.name, pin: p.label || p.role, to: g >= 0 ? 'GPIO' + g : '—', gpio: g, note: p.note || '' });
      });
      (m.extraWiring || []).forEach((w) => wiring.push(Object.assign({ mod: x.label, name: m.name }, w)));
    });

    // Consommation
    let mA = 0, peak = 0;
    instances.forEach((x) => { mA += Number(x.mod.mA || 1); peak += Number(x.mod.peak_mA || x.mod.mA || 1); });
    const baseMA = needWifi ? 110 : 45;
    const power = { modules_mA: mA, modules_peak_mA: peak, board_mA: baseMA, total_mA: mA + baseMA, total_peak_mA: peak + (needWifi ? 260 : 80) };
    if (power.total_peak_mA > 450) warnings.push(`Consommation de pointe estimée ${Math.round(power.total_peak_mA)} mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).`);
    const heavy5V = instances.filter((x) => (x.mod.vcc || '').startsWith('5') && (x.mod.peak_mA || x.mod.mA || 0) >= 200);
    if (heavy5V.length) warnings.push(`Alimentez ${heavy5V.map((x) => x.mod.name).join(', ')} directement en 5 V externe et reliez les masses (GND commun).`);
    instances.forEach((x) => { if (x.mod.level5V) warnings.push(`${x.mod.name} : ${x.mod.level5V}`); });

    // Sorties (mesures publiées)
    const outs = [];
    instances.forEach((x) => (x.mod.outs || []).forEach((o) => outs.push({ x, k: o.k, var: `${x.p}_${o.k}`, unit: o.u || '', label: o.l || o.k, pub: `${x.label}_${sanitize(o.k)}` })));

    // Règles
    const rules = (spec.rules || []).map((r, idx) => {
      const src = instances[r.if.m];
      const dst = instances[r.then.m];
      if (!src || !dst) { warnings.push(`Règle ${idx + 1} ignorée : module introuvable.`); return null; }
      const out = (src.mod.outs || []).find((o) => o.k === r.if.out);
      if (!out) { warnings.push(`Règle ${idx + 1} ignorée : mesure « ${r.if.out} » inconnue.`); return null; }
      if (!dst.mod.act) { warnings.push(`Règle ${idx + 1} ignorée : ${dst.mod.name} n'est pas un actionneur.`); return null; }
      if (r.if.op === 'map') {
        if (!dst.mod.act.set) { warnings.push(`Règle ${idx + 1} ignorée : ${dst.mod.name} n'accepte pas de consigne proportionnelle.`); return null; }
        const inR = (r.if.in || [0, 100]).map(Number), outR = (r.then.out || [dst.mod.act.set.min, dst.mod.act.set.max]).map(Number);
        return { idx: idx + 1, src, dst, out, op: 'map', inR, outR, then: r.then };
      }
      return { idx: idx + 1, src, dst, out, op: compareOp(r.if.op), v: Number(r.if.v), hyst: Number(r.if.hyst || 0), then: r.then, else: r.else };
    }).filter(Boolean);
    const ruled = new Set(rules.map((r) => r.dst.n));

    /* ---------------- composition du code ---------------- */
    const L = [];
    const hr = '// ' + '='.repeat(74);
    L.push(hr);
    L.push(`//  ${title}`);
    L.push(`//  Généré par ESP32 LAB Studio ${LAB.VERSION} — carte : ${board.name}`);
    L.push(`//  Arduino IDE : carte « ${board.ide} », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.`);
    if (spec.description) String(spec.description).split('\n').forEach((d) => L.push(`//  ${d}`));
    L.push('// ' + '-'.repeat(74));
    if (libs.length) {
      L.push('//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :');
      libs.forEach((l) => L.push(`//    - ${l.name}${l.ver ? ' (' + l.ver + ' ou plus récent)' : ''}${l.author ? ' — ' + l.author : ''}`));
    } else {
      L.push('//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.');
    }
    L.push('//  Câblage :');
    wiring.forEach((w) => L.push(`//    ${(w.name + ' ' + w.pin).padEnd(30)} -> ${w.to}${w.note ? '   (' + w.note + ')' : ''}`));
    if (warnings.length) {
      L.push('//  Points d\'attention :');
      warnings.forEach((w) => L.push('//    ! ' + w));
    }
    L.push(hr);
    L.push(...includes);
    L.push('');

    // Broches
    L.push('// ---------- Broches ----------');
    if (alloc.hasI2C) { L.push(`#define LAB_I2C_SDA ${board.i2c.sda}`); L.push(`#define LAB_I2C_SCL ${board.i2c.scl}`); }
    if (alloc.hasSPI) { L.push(`#define LAB_SPI_SCK ${board.spi.sck}`); L.push(`#define LAB_SPI_MISO ${board.spi.miso}`); L.push(`#define LAB_SPI_MOSI ${board.spi.mosi}`); }
    instances.forEach((x) => (x.mod.pins || []).forEach((p) => {
      if (p.bus) return;
      const g = alloc.assign[x.n - 1 + ':' + p.role];
      L.push(`#define ${x.P}_${p.role} ${g === undefined ? -1 : g}${' '.repeat(Math.max(1, 14 - p.role.length - x.P.length))}// ${x.mod.name} ${p.label || p.role}`);
    }));
    L.push('');

    // Réglages
    L.push('// ---------- Réglages ----------');
    instances.forEach((x) => {
      const per = x.params.period || x.mod.period || 1000;
      L.push(`static const uint32_t ${x.P}_PERIOD_MS = ${per};   // ${x.mod.name} : période de mesure`);
    });
    if (needWifi) {
      L.push(`static const char *LAB_WIFI_SSID = ${cStr(opts.wifi_ssid)};      // point d'accès du MASTER ESP32 LAB par défaut`);
      L.push(`static const char *LAB_WIFI_PASS = ${cStr(opts.wifi_pass)};`);
      L.push(`[[maybe_unused]] static const char *LAB_DEVICE = ${cStr(device)};`);
    }
    if (opts.mqtt) L.push(`static const char *LAB_MQTT_HOST = ${cStr(opts.mqtt_host)};`);
    L.push('');

    // Mesures
    if (outs.length) {
      L.push('// ---------- Mesures publiées ----------');
      outs.forEach((o) => L.push(`float ${o.var} = NAN;${' '.repeat(Math.max(1, 22 - o.var.length))}// ${o.x.mod.name} — ${o.label}${o.unit ? ' (' + o.unit + ')' : ''}`));
      L.push('');
    }

    // Table des mesures (utilisée par les afficheurs et la page web)
    if (instances.some((x) => x.mod.usesOuts)) {
      L.push('// ---------- Table des mesures (afficheurs) ----------');
      L.push('struct LabOut { const char *label; const char *unit; float *value; };');
      if (outs.length) {
        L.push('LabOut lab_outs[] = {');
        const seenLbl = {};
        outs.forEach((o) => { seenLbl[o.label] = (seenLbl[o.label] || 0) + 1; });
        outs.forEach((o, k) => {
          const lbl = seenLbl[o.label] > 1 ? `${o.label} ${o.x.label}` : o.label;
          L.push(`  {${cStr(lbl)}, ${cStr(o.unit)}, &${o.var}}${k < outs.length - 1 ? ',' : ''}`);
        });
        L.push('};');
      } else {
        L.push('LabOut lab_outs[1] = {{"", "", nullptr}};');
      }
      L.push(`const int LAB_OUT_COUNT = ${outs.length};`);
      L.push('');
    }

    // Réseau (options)
    if (needWifi) {
      L.push('// ---------- Réseau ----------');
      if (opts.web) L.push('WebServer lab_web(80);');
      if (opts.master) L.push('WiFiUDP lab_udp;');
      if (opts.mqtt) { L.push('WiFiClient lab_net;'); L.push('PubSubClient lab_mqtt(lab_net);'); }
      L.push('');
    }

    // Code des modules
    instances.forEach((x) => {
      const ctx = { p: x.p, P: x.P, params: x.params, serial: alloc.uartOf[x.n - 1] ? alloc.uartOf[x.n - 1].name : null, label: x.label, name: x.mod.name };
      L.push(`// ---------- ${x.mod.name} (${x.label}) ----------`);
      if (x.mod.needOk) L.push(`bool ${x.p}_ok = false;`);
      if (x.mod.glob) L.push(expand(x.mod.glob, ctx).trim());
      x.ctx = ctx;
      L.push('');
    });

    // Publication
    L.push('// ---------- Publication (moniteur / traceur série, réseau) ----------');
    if (opts.master) {
      L.push('void lab_send_master(const char *key, float v, const char *unit) {');
      L.push('  if (WiFi.status() != WL_CONNECTED || isnan(v)) return;');
      L.push('  lab_udp.beginPacket(IPAddress(192, 168, 4, 1), 4213);');
      L.push('  lab_udp.printf("LAB|%s|%s|%.3f|%s\\n", LAB_DEVICE, key, v, unit);');
      L.push('  lab_udp.endPacket();');
      L.push('}');
    }
    if (opts.mqtt) {
      L.push('void lab_send_mqtt(const char *key, float v) {');
      L.push('  if (!lab_mqtt.connected() || isnan(v)) return;');
      L.push('  char topic[80], payload[24];');
      L.push('  snprintf(topic, sizeof(topic), "lab/%s/%s", LAB_DEVICE, key);');
      L.push('  snprintf(payload, sizeof(payload), "%.3f", v);');
      L.push('  lab_mqtt.publish(topic, payload);');
      L.push('}');
    }
    const printMode = (x) => x.mod.print || ((x.params.period || x.mod.period || 1000) < 250 ? 'change' : 'always');
    if (instances.some((x) => (x.mod.outs || []).length && printMode(x) === 'change')) {
      L.push('bool lab_changed(float v, float &prev) {');
      L.push('  const bool same = (v == prev) || (isnan(v) && isnan(prev));');
      L.push('  prev = v;');
      L.push('  return !same;');
      L.push('}');
    }
    L.push('void lab_value(const char *key, float v, const char *unit, bool last) {');
    L.push('  // Format « nom:valeur » compris par le Traceur série de l\'IDE Arduino');
    L.push('  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);');
    L.push('  Serial.print(last ? "\\n" : "\\t");');
    if (opts.master) L.push('  lab_send_master(key, v, unit);');
    if (opts.mqtt) L.push('  lab_send_mqtt(key, v);');
    if (!opts.master) L.push('  (void)unit;');
    L.push('}');
    instances.forEach((x) => {
      const mo = outs.filter((o) => o.x === x);
      if (!mo.length) return;
      L.push(`void lab_print_${x.p}() {`);
      mo.forEach((o, k) => L.push(`  lab_value(${cStr(o.pub)}, ${o.var}, ${cStr(o.unit)}, ${k === mo.length - 1 ? 'true' : 'false'});`));
      L.push('}');
    });
    L.push('');

    // Règles
    if (rules.length) {
      L.push('// ---------- Automatismes ----------');
      L.push('void lab_rules() {');
      L.push('  static uint32_t last = 0;');
      L.push('  if (millis() - last < 200) return;');
      L.push('  last = millis();');
      rules.forEach((r) => {
        const v = r.src.p + '_' + r.out.k;
        if (r.op === 'map') {
          const [a, b] = r.inR, [c, d] = r.outR;
          L.push(`  // Règle ${r.idx} : ${r.dst.mod.name} suit ${r.src.mod.name} ${r.out.l || r.out.k} (${a}…${b} → ${c}…${d})`);
          L.push(`  if (!isnan(${v})) {`);
          L.push(`    static float last${r.idx} = NAN;`);
          L.push(`    const float y = ${fmtNum(c)} + (constrain(${v}, ${fmtNum(Math.min(a, b))}, ${fmtNum(Math.max(a, b))}) - ${fmtNum(a)}) * (${fmtNum(d - c)}) / (${fmtNum(b - a || 1)});`);
          L.push(`    if (isnan(last${r.idx}) || fabsf(y - last${r.idx}) >= ${fmtNum(Math.abs(d - c) / 200 || 0.01)}) { last${r.idx} = y; ${r.dst.p}_set(y); }`);
          L.push('  }');
          return;
        }
        const actCall = (t, dst) => {
          if (!t) return '';
          if (t.act === 'on') return `${dst.p}_on();`;
          if (t.act === 'off') return `${dst.p}_off();`;
          if (t.act === 'set') return `${dst.p}_set(${fmtNum(t.v)});`;
          if (t.act === 'toggle') return `${dst.p}_toggle();`;
          return '';
        };
        const thenCode = actCall(r.then, r.dst);
        const elseCode = r.else ? actCall(r.else, instances[r.else.m] || r.dst) : '';
        const desc = `${r.src.mod.name} ${r.out.l || r.out.k} ${r.op} ${r.v}${r.out.u ? ' ' + r.out.u : ''} → ${r.dst.mod.name} ${r.then.act}${r.then.v !== undefined ? ' ' + r.then.v : ''}`;
        L.push(`  // Règle ${r.idx} : ${desc}`);
        L.push(`  static int8_t rule${r.idx} = -1;`);
        L.push(`  if (!isnan(${v})) {`);
        const lo = r.op.startsWith('>') ? `${fmtNum(r.v - r.hyst)}` : `${fmtNum(r.v + r.hyst)}`;
        if (r.hyst > 0 && (r.op.startsWith('>') || r.op.startsWith('<'))) {
          const back = r.op.startsWith('>') ? '<' : '>';
          L.push(`    if (rule${r.idx} != 1 && ${v} ${r.op} ${fmtNum(r.v)}) { rule${r.idx} = 1; ${thenCode} }`);
          L.push(`    else if (rule${r.idx} != 0 && ${v} ${back} ${lo}) { rule${r.idx} = 0; ${elseCode} }`);
        } else {
          L.push(`    const int8_t st = (${v} ${r.op} ${fmtNum(r.v)}) ? 1 : 0;`);
          L.push(`    if (st != rule${r.idx}) { rule${r.idx} = st; if (st) { ${thenCode} } else { ${elseCode} } }`);
        }
        L.push('  }');
      });
      L.push('}');
      L.push('');
    }

    // Page web
    if (opts.web) {
      L.push('// ---------- Tableau de bord web ----------');
      L.push('static const char LAB_PAGE[] PROGMEM = R"HTML(<!doctype html><html lang="fr"><head><meta charset="utf-8">');
      L.push('<meta name="viewport" content="width=device-width,initial-scale=1"><title>ESP32 LAB</title><style>');
      L.push(':root{color-scheme:light dark;font-family:system-ui,sans-serif}body{margin:0;padding:16px;background:Canvas;color:CanvasText}');
      L.push('h1{font-size:18px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}');
      L.push('.c{border:1px solid color-mix(in srgb,CanvasText 15%,transparent);border-radius:10px;padding:12px}.k{font-size:12px;opacity:.7}.v{font-size:24px;font-weight:650}');
      L.push('</style></head><body><h1 id="t">ESP32 LAB</h1><div class="g" id="g"></div><script>');
      L.push('async function r(){try{const d=await (await fetch("/api")).json();document.getElementById("t").textContent=d.title;');
      L.push('document.getElementById("g").innerHTML=d.values.map(v=>`<div class=c><div class=k>${v.label}</div><div class=v>${v.value===null?"—":v.value.toFixed(2)} <small>${v.unit}</small></div></div>`).join("")}catch(e){}}');
      L.push('r();setInterval(r,2000)</script></body></html>)HTML";');
      L.push('');
      L.push('void lab_web_api() {');
      L.push(`  String j = F("{\\"title\\":\\"${safeTitle}\\",\\"values\\":[");`);
      outs.forEach((o, k) => {
        L.push(`  j += F("${k ? ',' : ''}{\\"label\\":\\"${(o.x.mod.name + ' ' + o.label).replace(/"/g, '')}\\",\\"unit\\":\\"${o.unit.replace(/"/g, '')}\\",\\"value\\":");`);
        L.push(`  j += isnan(${o.var}) ? String("null") : String(${o.var}, 3);`);
        L.push('  j += "}";');
      });
      L.push('  j += "]}";');
      L.push('  lab_web.send(200, "application/json", j);');
      L.push('}');
      L.push('');
    }

    // Retour au mode worker (projet chargé sur un worker depuis le MASTER)
    if (opts.home) {
      L.push('// ---------- Retour au mode worker ESP32 LAB ----------');
      L.push('// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans');
      L.push('// l\'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.');
      L.push('// Téléversé par câble depuis l\'IDE, ce bloc reste inactif.');
      L.push(`#define LAB_BOOT_PIN ${board.boot == null ? 0 : board.boot}`);
      L.push(`static const char *LAB_PROJECT = ${cStr(device)};`);
      L.push(C`static char lab_home[17] = "";
static IPAddress lab_home_master(192, 168, 4, 1);
static WiFiUDP lab_home_udp;
static bool lab_home_udp_on = false;

static void lab_go_home() {
  const esp_partition_t *h = esp_partition_find_first(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_ANY, lab_home);
  if (h && esp_ota_set_boot_partition(h) == ESP_OK) {
    Serial.println(F("# Retour au mode worker"));
    delay(200);
    ESP.restart();
  }
}

static void lab_home_begin() {
  Preferences p;
  if (!p.begin("lab", true)) return;
  String home = p.getString("home", ""), master = p.getString("master", "");
  String ssid = p.getString("ssid", ""), pass = p.getString("pass", "");
  p.end();
  const esp_partition_t *run = esp_ota_get_running_partition();
  if (home.isEmpty() || (run && home == run->label)) return;
  if (!esp_partition_find_first(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_ANY, home.c_str())) return;
  strlcpy(lab_home, home.c_str(), sizeof(lab_home));
  lab_home_master.fromString(master);
#if LAB_BOOT_PIN >= 0
  pinMode(LAB_BOOT_PIN, INPUT_PULLUP);
#endif
  if (WiFi.getMode() == WIFI_OFF && !ssid.isEmpty()) {  // le projet n'utilise pas le Wi-Fi : on garde le lien avec le MASTER
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), pass.c_str());
  }
  Serial.printf("# Projet chargé depuis ESP32 LAB : BOOT 3 s pour revenir au mode worker (%s)\n", lab_home);
}

static void lab_home_loop() {
  if (!lab_home[0]) return;
#if LAB_BOOT_PIN >= 0
  static uint32_t pressed = 0;
  if (digitalRead(LAB_BOOT_PIN) == LOW) {
    if (!pressed) pressed = millis() | 1;
    else if (millis() - pressed > 3000) lab_go_home();
  } else {
    pressed = 0;
  }
#endif
  if (WiFi.status() != WL_CONNECTED) { lab_home_udp_on = false; return; }
  if (!lab_home_udp_on) { lab_home_udp.begin(4215); lab_home_udp_on = true; }
  static uint32_t beat = 0;
  if (millis() - beat > 4000) {  // le MASTER voit ce worker « en projet » et peut le rappeler
    beat = millis();
    lab_home_udp.beginPacket(lab_home_master, 4211);
    lab_home_udp.printf("APP|%s|%s|%s", WiFi.macAddress().c_str(), LAB_PROJECT, WiFi.localIP().toString().c_str());
    lab_home_udp.endPacket();
  }
  if (lab_home_udp.parsePacket() > 0) {
    char b[16] = {0};
    lab_home_udp.read(b, sizeof(b) - 1);
    if (!strncmp(b, "LAB|HOME", 8)) lab_go_home();
  }
}`);
      L.push('');
    }

    // setup()
    L.push('void setup() {');
    L.push('  Serial.begin(115200);');
    L.push('  delay(300);');
    L.push(`  Serial.println(F("\\n# ESP32 LAB — ${safeTitle}"));`);
    if (alloc.hasI2C) L.push('  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);');
    if (alloc.hasSPI) L.push('  SPI.begin(LAB_SPI_SCK, LAB_SPI_MISO, LAB_SPI_MOSI);');
    instances.forEach((x) => {
      if (!x.mod.setup) return;
      L.push(`  // ${x.mod.name} (${x.label})`);
      L.push(indent(expand(x.mod.setup, x.ctx).trim(), 2));
      if (x.mod.needOk) L.push(`  if (!${x.p}_ok) Serial.println(F(${cStr('# ' + x.mod.name + ' : non détecté — vérifiez le câblage et l\'alimentation')}));`);
    });
    if (needWifi) {
      L.push('  // Wi-Fi');
      L.push('  WiFi.mode(WIFI_STA);');
      L.push('  WiFi.begin(LAB_WIFI_SSID, LAB_WIFI_PASS);');
      L.push('  Serial.print(F("# Wi-Fi"));');
      L.push('  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) { delay(250); Serial.print("."); }');
      L.push('  if (WiFi.status() == WL_CONNECTED) Serial.printf("\\n# Connecté : http://%s/\\n", WiFi.localIP().toString().c_str());');
      L.push('  else Serial.println(F("\\n# Wi-Fi indisponible : nouvelle tentative automatique"));');
      if (opts.web) {
        L.push('  lab_web.on("/", []() { lab_web.send_P(200, "text/html; charset=utf-8", LAB_PAGE); });');
        L.push('  lab_web.on("/api", lab_web_api);');
        L.push('  lab_web.begin();');
      }
      if (opts.master) L.push('  lab_udp.begin(4214);');
      if (opts.mqtt) L.push('  lab_mqtt.setServer(LAB_MQTT_HOST, 1883);');
    }
    if (opts.home) L.push('  lab_home_begin();');
    L.push('}');
    L.push('');

    // loop()
    L.push('void loop() {');
    L.push('  const uint32_t now = millis();');
    L.push('  (void)now;  // utilisé seulement par certains modules');
    if (opts.home) L.push('  lab_home_loop();');
    instances.forEach((x) => {
      const hasOuts = (x.mod.outs || []).length > 0;
      const demo = x.mod.act && !ruled.has(x.n) ? x.mod.demo : null;
      const body = x.mod.loop || demo;
      if (x.mod.tick) {
        L.push(`  // ${x.mod.name} (${x.label}) — à chaque tour`);
        L.push(x.mod.needOk ? `  if (${x.p}_ok) {\n${indent(expand(x.mod.tick, x.ctx).trim(), 4)}\n  }` : indent(expand(x.mod.tick, x.ctx).trim(), 2));
      }
      if (!body && !hasOuts) return;
      L.push(`  // ${x.mod.name} (${x.label}) — toutes les ${x.P}_PERIOD_MS`);
      L.push(`  static uint32_t ${x.p}_last = 0;`);
      L.push(`  if (now - ${x.p}_last >= ${x.P}_PERIOD_MS) {`);
      L.push(`    ${x.p}_last = now;`);
      const inner = [];
      if (x.mod.loop) inner.push(expand(x.mod.loop, x.ctx).trim());
      if (demo) inner.push(expand(demo, x.ctx).trim());
      if (hasOuts && printMode(x) === 'change') {
        const vars = (x.mod.outs || []).map((o) => `${x.p}_${o.k}`);
        inner.push(`static float ${x.p}_prev[${vars.length}];\nstatic uint32_t ${x.p}_printed = 0;\nbool ${x.p}_ch = false;\n` +
          vars.map((v, k) => `${x.p}_ch |= lab_changed(${v}, ${x.p}_prev[${k}]);`).join('\n') +
          `\nif (${x.p}_ch || now - ${x.p}_printed >= 5000) { ${x.p}_printed = now; lab_print_${x.p}(); }`);
      } else if (hasOuts) inner.push(`lab_print_${x.p}();`);
      if (x.mod.needOk) {
        L.push(`    if (${x.p}_ok) {`);
        L.push(indent(inner.join('\n'), 6));
        L.push('    }');
      } else {
        L.push(indent(inner.join('\n'), 4));
      }
      L.push('  }');
    });
    if (rules.length) L.push('  lab_rules();');
    if (needWifi) {
      L.push('  // Reconnexion Wi-Fi');
      L.push('  static uint32_t wifi_retry = 0;');
      L.push('  if (WiFi.status() != WL_CONNECTED && now - wifi_retry > 15000) { wifi_retry = now; WiFi.reconnect(); }');
      if (opts.web) L.push('  lab_web.handleClient();');
      if (opts.mqtt) {
        L.push('  if (WiFi.status() == WL_CONNECTED && !lab_mqtt.connected()) {');
        L.push('    static uint32_t mqtt_retry = 0;');
        L.push('    if (now - mqtt_retry > 5000) { mqtt_retry = now; lab_mqtt.connect(LAB_DEVICE); }');
        L.push('  }');
        L.push('  lab_mqtt.loop();');
      }
    }
    L.push('}');

    const code = L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
    return {
      code,
      board: board.id,
      boardName: board.name,
      fqbn: board.fqbn,
      title,
      libs,
      wiring,
      warnings,
      power,
      outs: outs.map((o) => ({ key: o.pub, unit: o.unit, label: o.label, module: o.x.mod.name })),
      pins: alloc.assign,
      used: alloc.used,
      instances: instances.map((x) => ({ id: x.mod.id, label: x.label, name: x.mod.name }))
    };
  };

  /* Projet « un seul capteur » : spec standard pour la bibliothèque. */
  LAB.singleSpec = function (mod, board) {
    return {
      board: board || 'esp32',
      title: `${mod.name} — ${mod.title || mod.desc || ''}`.replace(/ — $/, ''),
      description: mod.desc || '',
      modules: [{ id: mod.id }]
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* Modules « Environnement » : température, humidité, pression, qualité de l'air, météo, sol et eau. */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const M = (LAB.MODULES = LAB.MODULES || []);
  const X = LAB.LIBS;
  const C = String.raw;
  const I2C = [{ role: 'SDA', bus: 'sda' }, { role: 'SCL', bus: 'scl' }];
  const SPI = [{ role: 'SCK', bus: 'sck' }, { role: 'MISO', bus: 'miso', label: 'SO/MISO' }, { role: 'MOSI', bus: 'mosi', label: 'SDI/MOSI' }];
  const add = (cat, m) => M.push(Object.assign({ cat, difficulty: 1, vcc: '3V3', mA: 1, period: 2000 }, m));
  const T = { k: 'temp', u: '°C', l: 'Température' };
  const H = { k: 'hum', u: '%', l: 'Humidité' };
  const P = { k: 'press', u: 'hPa', l: 'Pression' };

  /* ---------------- Température / humidité ---------------- */
  const dht = (id, name, type, extra) => add('temp', Object.assign({
    id, key: id, name, tags: ['température', 'humidité', 'numérique'],
    desc: `Capteur de température et d'humidité ${name} (bus 1 fil propriétaire).`,
    pins: [{ role: 'DATA', type: 'io', note: 'résistance de tirage 10 kΩ vers 3V3 (souvent déjà sur le module)' }],
    libs: [X.dht, X.sensor], inc: ['<DHT.h>'], period: 2500, mA: 1.5,
    glob: `DHT $dht({{DATA}}, ${type});`,
    setup: C`$dht.begin();`,
    loop: C`$temp = $dht.readTemperature();
$hum = $dht.readHumidity();`,
    outs: [T, H],
    notes: ['Ne pas interroger plus souvent qu\'une fois toutes les 2 s.', 'Le premier relevé après la mise sous tension peut être « nan ».']
  }, extra));
  dht('dht11', 'DHT11', 'DHT11', { desc: 'Capteur économique : 0-50 °C (±2 °C), 20-90 % HR (±5 %).' });
  dht('dht22', 'DHT22 / AM2302', 'DHT22', { desc: 'Capteur précis : -40 à 80 °C (±0,5 °C), 0-100 % HR (±2 %).' });
  dht('dht21', 'DHT21 / AM2301', 'DHT21', { desc: 'Version à câble du DHT22, boîtier plastique pour l\'extérieur.' });

  add('temp', {
    id: 'ds18b20', key: 'ds18b20', name: 'DS18B20', tags: ['température', '1-Wire', 'étanche'],
    desc: 'Sonde de température numérique 1-Wire, -55 à 125 °C (±0,5 °C), version étanche disponible.',
    pins: [{ role: 'DATA', type: 'io', note: 'résistance de tirage 4,7 kΩ entre DATA et 3V3 obligatoire' }],
    libs: [X.onewire, X.dallas], inc: ['<OneWire.h>', '<DallasTemperature.h>'], period: 1000, mA: 1.5, needOk: true,
    glob: C`OneWire $wire({{DATA}});
DallasTemperature $sensors(&$wire);`,
    setup: C`$sensors.begin();
$sensors.setWaitForConversion(false);  // mesure non bloquante
$ok = $sensors.getDeviceCount() > 0;
Serial.printf("# DS18B20 : %u sonde(s) détectée(s)\n", $sensors.getDeviceCount());
$sensors.requestTemperatures();`,
    loop: C`float t = $sensors.getTempCByIndex(0);
$temp = (t == DEVICE_DISCONNECTED_C) ? NAN : t;
$sensors.requestTemperatures();  // lance la conversion suivante (750 ms)`,
    outs: [T],
    notes: ['Plusieurs sondes peuvent partager la même broche (adresses uniques).', 'Période minimale 1000 ms en résolution 12 bits.']
  });

  add('temp', {
    id: 'bme280', key: 'bme280', name: 'BME280', bus: 'i2c', addr: ['0x76', '0x77'], tags: ['température', 'humidité', 'pression', 'altitude', 'I2C'],
    desc: 'Station météo miniature Bosch : température, humidité, pression et altitude estimée.',
    pins: I2C, libs: [X.bme280, X.sensor, X.busio], inc: ['<Adafruit_BME280.h>'], needOk: true, mA: 1,
    params: { addr: { def: '0x76', label: 'Adresse I2C', opts: ['0x76', '0x77'] }, sea: { def: '1013.25', label: 'Pression au niveau de la mer (hPa)' } },
    glob: C`Adafruit_BME280 $bme;`,
    setup: C`$ok = $bme.begin({{P:addr}}, &Wire);`,
    loop: C`$temp = $bme.readTemperature();
$hum = $bme.readHumidity();
$press = $bme.readPressure() / 100.0f;
$alt = $bme.readAltitude({{P:sea}});`,
    outs: [T, H, P, { k: 'alt', u: 'm', l: 'Altitude' }],
    notes: ['Beaucoup de modules « BME280 » bon marché sont en réalité des BMP280 (sans humidité) : ID 0x58 au lieu de 0x60.']
  });
  add('temp', {
    id: 'bmp280', key: 'bmp280', name: 'BMP280', bus: 'i2c', addr: ['0x76', '0x77'], tags: ['température', 'pression', 'altitude', 'I2C'],
    desc: 'Baromètre Bosch : pression (±1 hPa), température et altitude.',
    pins: I2C, libs: [X.bmp280, X.sensor, X.busio], inc: ['<Adafruit_BMP280.h>'], needOk: true,
    params: { addr: { def: '0x76', label: 'Adresse I2C', opts: ['0x76', '0x77'] }, sea: { def: '1013.25', label: 'Pression au niveau de la mer (hPa)' } },
    glob: C`Adafruit_BMP280 $bmp(&Wire);`,
    setup: C`$ok = $bmp.begin({{P:addr}});`,
    loop: C`$temp = $bmp.readTemperature();
$press = $bmp.readPressure() / 100.0f;
$alt = $bmp.readAltitude({{P:sea}});`,
    outs: [T, P, { k: 'alt', u: 'm', l: 'Altitude' }]
  });
  add('temp', {
    id: 'bmp180', key: 'bmp180', name: 'BMP180 / BMP085', bus: 'i2c', addr: ['0x77'], tags: ['pression', 'température', 'I2C'],
    desc: 'Ancien baromètre Bosch, encore très répandu dans les kits.',
    pins: I2C, libs: [X.bmp085, X.busio], inc: ['<Adafruit_BMP085.h>'], needOk: true,
    glob: C`Adafruit_BMP085 $bmp;`,
    setup: C`$ok = $bmp.begin(BMP085_ULTRAHIGHRES, &Wire);`,
    loop: C`$temp = $bmp.readTemperature();
$press = $bmp.readPressure() / 100.0f;`,
    outs: [T, P]
  });
  add('air', {
    id: 'bme680', key: 'bme680', name: 'BME680', bus: 'i2c', addr: ['0x77', '0x76'], tags: ['température', 'humidité', 'pression', 'gaz', 'COV', 'I2C'],
    desc: 'Capteur 4-en-1 : température, humidité, pression et résistance de gaz (qualité de l\'air / COV).',
    pins: I2C, libs: [X.bme680, X.sensor, X.busio], inc: ['<Adafruit_BME680.h>'], needOk: true, mA: 12, period: 3000, difficulty: 2,
    params: { addr: { def: '0x77', label: 'Adresse I2C', opts: ['0x77', '0x76'] } },
    glob: C`Adafruit_BME680 $bme(&Wire);`,
    setup: C`$ok = $bme.begin({{P:addr}});
if ($ok) {
  $bme.setTemperatureOversampling(BME680_OS_8X);
  $bme.setHumidityOversampling(BME680_OS_2X);
  $bme.setPressureOversampling(BME680_OS_4X);
  $bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  $bme.setGasHeater(320, 150);  // 320 °C pendant 150 ms
}`,
    loop: C`if ($bme.performReading()) {
  $temp = $bme.temperature;
  $hum = $bme.humidity;
  $press = $bme.pressure / 100.0f;
  $gas = $bme.gas_resistance / 1000.0f;
}`,
    outs: [T, H, P, { k: 'gas', u: 'kΩ', l: 'Résistance gaz' }],
    notes: ['La résistance de gaz augmente quand l\'air est plus propre ; laissez chauffer 30 min pour une mesure stable.']
  });
  add('temp', {
    id: 'bmp388', key: 'bmp388', name: 'BMP388 / BMP390', bus: 'i2c', addr: ['0x77', '0x76'], tags: ['pression', 'altitude', 'précision', 'I2C'],
    desc: 'Baromètre haute précision (±0,5 m) pour drones et altimètres.',
    pins: I2C, libs: [X.bmp3xx, X.sensor, X.busio], inc: ['<Adafruit_BMP3XX.h>'], needOk: true, period: 1000,
    params: { addr: { def: '0x77', label: 'Adresse I2C', opts: ['0x77', '0x76'] }, sea: { def: '1013.25', label: 'Pression niveau mer (hPa)' } },
    glob: C`Adafruit_BMP3XX $bmp;`,
    setup: C`$ok = $bmp.begin_I2C({{P:addr}}, &Wire);
if ($ok) {
  $bmp.setTemperatureOversampling(BMP3_OVERSAMPLING_8X);
  $bmp.setPressureOversampling(BMP3_OVERSAMPLING_4X);
  $bmp.setIIRFilterCoeff(BMP3_IIR_FILTER_COEFF_3);
  $bmp.setOutputDataRate(BMP3_ODR_50_HZ);
}`,
    loop: C`if ($bmp.performReading()) {
  $temp = $bmp.temperature;
  $press = $bmp.pressure / 100.0f;
  $alt = $bmp.readAltitude({{P:sea}});
}`,
    outs: [T, P, { k: 'alt', u: 'm', l: 'Altitude' }]
  });
  add('temp', {
    id: 'sht31', key: 'sht31', name: 'SHT31', bus: 'i2c', addr: ['0x44', '0x45'], tags: ['température', 'humidité', 'précision', 'I2C'],
    desc: 'Capteur Sensirion très précis (±0,3 °C, ±2 % HR) avec chauffage intégré anti-condensation.',
    pins: I2C, libs: [X.sht31, X.busio], inc: ['<Adafruit_SHT31.h>'], needOk: true,
    params: { addr: { def: '0x44', label: 'Adresse I2C', opts: ['0x44', '0x45'] } },
    glob: C`Adafruit_SHT31 $sht(&Wire);`,
    setup: C`$ok = $sht.begin({{P:addr}});`,
    loop: C`$temp = $sht.readTemperature();
$hum = $sht.readHumidity();`,
    outs: [T, H]
  });
  add('temp', {
    id: 'sht4x', key: 'sht4x', name: 'SHT40 / SHT41 / SHT45', bus: 'i2c', addr: ['0x44'], tags: ['température', 'humidité', 'précision', 'I2C'],
    desc: 'Génération 4 Sensirion : ±0,2 °C, ±1,8 % HR, très faible consommation.',
    pins: I2C, libs: [X.sht4x, X.sensor, X.busio], inc: ['<Adafruit_SHT4x.h>'], needOk: true,
    glob: C`Adafruit_SHT4x $sht;`,
    setup: C`$ok = $sht.begin(&Wire);
if ($ok) { $sht.setPrecision(SHT4X_HIGH_PRECISION); $sht.setHeater(SHT4X_NO_HEATER); }`,
    loop: C`sensors_event_t h, t;
if ($sht.getEvent(&h, &t)) { $temp = t.temperature; $hum = h.relative_humidity; }`,
    outs: [T, H]
  });
  add('temp', {
    id: 'aht20', key: 'aht20', name: 'AHT10 / AHT20 / AHT21', bus: 'i2c', addr: ['0x38'], tags: ['température', 'humidité', 'I2C', 'économique'],
    desc: 'Capteur Aosong économique et précis (±0,3 °C, ±2 % HR), souvent couplé au BMP280.',
    pins: I2C, libs: [X.ahtx0, X.sensor, X.busio], inc: ['<Adafruit_AHTX0.h>'], needOk: true,
    glob: C`Adafruit_AHTX0 $aht;`,
    setup: C`$ok = $aht.begin(&Wire);`,
    loop: C`sensors_event_t h, t;
if ($aht.getEvent(&h, &t)) { $temp = t.temperature; $hum = h.relative_humidity; }`,
    outs: [T, H]
  });
  add('temp', {
    id: 'htu21d', key: 'htu21d', name: 'HTU21D / SHT21 / Si7021 (GY-21)', bus: 'i2c', addr: ['0x40'], tags: ['température', 'humidité', 'I2C'],
    desc: 'Capteur température/humidité compatible SHT21, module GY-21.',
    pins: I2C, libs: [X.htu21, X.busio], inc: ['<Adafruit_HTU21DF.h>'], needOk: true,
    glob: C`Adafruit_HTU21DF $htu;`,
    setup: C`$ok = $htu.begin(&Wire);`,
    loop: C`$temp = $htu.readTemperature();
$hum = $htu.readHumidity();`,
    outs: [T, H]
  });
  add('temp', {
    id: 'si7021', key: 'si7021', name: 'Si7021', bus: 'i2c', addr: ['0x40'], tags: ['température', 'humidité', 'I2C'],
    desc: 'Capteur Silicon Labs avec chauffage intégré et numéro de série.',
    pins: I2C, libs: [X.si7021, X.busio], inc: ['<Adafruit_Si7021.h>'], needOk: true,
    glob: C`Adafruit_Si7021 $si(&Wire);`,
    setup: C`$ok = $si.begin();`,
    loop: C`$temp = $si.readTemperature();
$hum = $si.readHumidity();`,
    outs: [T, H]
  });
  add('temp', {
    id: 'hdc1080', key: 'hdc1080', name: 'HDC1080', bus: 'i2c', addr: ['0x40'], tags: ['température', 'humidité', 'I2C', 'sans bibliothèque'],
    desc: 'Capteur Texas Instruments (±0,2 °C, ±2 % HR), piloté ici directement par registres.',
    pins: I2C, needOk: true,
    glob: C`static const uint8_t $ADDR = 0x40;
bool $measure(float &t, float &h) {
  Wire.beginTransmission($ADDR);
  Wire.write(0x00);                       // déclenche température + humidité
  if (Wire.endTransmission() != 0) return false;
  delay(20);
  if (Wire.requestFrom($ADDR, (uint8_t)4) != 4) return false;
  uint16_t rt = (Wire.read() << 8) | Wire.read();
  uint16_t rh = (Wire.read() << 8) | Wire.read();
  t = rt * 165.0f / 65536.0f - 40.0f;
  h = rh * 100.0f / 65536.0f;
  return true;
}`,
    setup: C`Wire.beginTransmission($ADDR);
Wire.write(0x02); Wire.write(0x10); Wire.write(0x00);   // mode séquentiel T+RH, 14 bits
$ok = Wire.endTransmission() == 0;`,
    loop: C`float t, h;
if ($measure(t, h)) { $temp = t; $hum = h; }`,
    outs: [T, H]
  });
  add('temp', {
    id: 'mcp9808', key: 'mcp9808', name: 'MCP9808', bus: 'i2c', addr: ['0x18'], tags: ['température', 'précision', 'I2C'],
    desc: 'Thermomètre numérique ±0,25 °C, 8 adresses possibles (A0-A2).',
    pins: I2C, libs: [X.mcp9808, X.busio], inc: ['<Adafruit_MCP9808.h>'], needOk: true, period: 1000,
    params: { addr: { def: '0x18', label: 'Adresse I2C', opts: ['0x18', '0x19', '0x1A', '0x1B', '0x1C', '0x1D', '0x1E', '0x1F'] } },
    glob: C`Adafruit_MCP9808 $mcp;`,
    setup: C`$ok = $mcp.begin({{P:addr}}, &Wire);
if ($ok) $mcp.setResolution(3);  // 0,0625 °C`,
    loop: C`$temp = $mcp.readTempC();`,
    outs: [T]
  });
  add('temp', {
    id: 'tmp102', key: 'tmp102', name: 'TMP102', bus: 'i2c', addr: ['0x48'], tags: ['température', 'I2C', 'sans bibliothèque'],
    desc: 'Minuscule thermomètre TI ±0,5 °C, lecture directe du registre 12 bits.',
    pins: I2C, needOk: true, period: 1000,
    params: { addr: { def: '0x48', label: 'Adresse I2C', opts: ['0x48', '0x49', '0x4A', '0x4B'] } },
    glob: C`float $read() {
  Wire.beginTransmission((uint8_t){{P:addr}});
  Wire.write(0x00);
  if (Wire.endTransmission() != 0 || Wire.requestFrom((uint8_t){{P:addr}}, (uint8_t)2) != 2) return NAN;
  int16_t raw = (int16_t)((Wire.read() << 8) | Wire.read()) >> 4;
  return raw * 0.0625f;
}`,
    setup: C`Wire.beginTransmission((uint8_t){{P:addr}});
$ok = Wire.endTransmission() == 0;`,
    loop: C`$temp = $read();`,
    outs: [T]
  });
  add('temp', {
    id: 'lm75', key: 'lm75', name: 'LM75 / LM75A', bus: 'i2c', addr: ['0x48'], tags: ['température', 'I2C', 'sans bibliothèque'],
    desc: 'Thermomètre et thermostat I2C classique (±2 °C), résolution 0,125 °C.',
    pins: I2C, needOk: true, period: 1000,
    params: { addr: { def: '0x48', label: 'Adresse I2C', opts: ['0x48', '0x49', '0x4A', '0x4B', '0x4C', '0x4D', '0x4E', '0x4F'] } },
    glob: C`float $read() {
  Wire.beginTransmission((uint8_t){{P:addr}});
  Wire.write(0x00);
  if (Wire.endTransmission() != 0 || Wire.requestFrom((uint8_t){{P:addr}}, (uint8_t)2) != 2) return NAN;
  int16_t raw = (int16_t)((Wire.read() << 8) | Wire.read()) >> 5;
  return raw * 0.125f;
}`,
    setup: C`Wire.beginTransmission((uint8_t){{P:addr}});
$ok = Wire.endTransmission() == 0;`,
    loop: C`$temp = $read();`,
    outs: [T]
  });
  add('temp', {
    id: 'tmp117', key: 'tmp117', name: 'TMP117', bus: 'i2c', addr: ['0x48'], tags: ['température', 'haute précision', 'I2C'],
    desc: 'Thermomètre de précision médicale ±0,1 °C.',
    pins: I2C, libs: [X.tmp117, X.sensor, X.busio], inc: ['<Adafruit_TMP117.h>'], needOk: true, period: 1000,
    glob: C`Adafruit_TMP117 $tmp;`,
    setup: C`$ok = $tmp.begin(0x48, &Wire);`,
    loop: C`sensors_event_t t;
if ($tmp.getEvent(&t)) $temp = t.temperature;`,
    outs: [T]
  });
  const analogTemp = (id, name, desc, formula, notes) => add('temp', {
    id, key: id, name, tags: ['température', 'analogique'], desc,
    pins: [{ role: 'OUT', type: 'adc', label: 'VOUT' }], period: 1000,
    glob: C`float $avg() {
  uint32_t s = 0;
  for (int i = 0; i < 16; i++) s += analogReadMilliVolts({{OUT}});
  return s / 16.0f;
}`,
    loop: formula, outs: [T], notes
  });
  analogTemp('lm35', 'LM35', 'Capteur analogique linéaire : 10 mV/°C, de 2 à 150 °C.', C`$temp = $avg() / 10.0f;   // 10 mV par °C`,
    ['Alimentation 4-30 V : utilisez le 5 V, la sortie (≤ 1,5 V) reste compatible avec l\'ADC.']);
  M[M.length - 1].vcc = '5V';
  analogTemp('tmp36', 'TMP36', 'Capteur analogique -40 à 125 °C : 10 mV/°C avec décalage de 500 mV.', C`$temp = ($avg() - 500.0f) / 10.0f;`,
    ['Fonctionne dès 2,7 V : alimentez-le en 3V3.']);
  add('temp', {
    id: 'ntc', key: 'ntc', name: 'Thermistance CTN 10 kΩ', tags: ['température', 'analogique', 'thermistance'],
    desc: 'Thermistance NTC 10 kΩ (B = 3950) en pont diviseur avec une résistance fixe de 10 kΩ.',
    pins: [{ role: 'OUT', type: 'adc', label: 'point milieu', note: 'CTN entre 3V3 et le point milieu, 10 kΩ entre le point milieu et GND' }],
    params: { beta: { def: '3950', label: 'Coefficient B' }, r0: { def: '10000', label: 'R à 25 °C (Ω)' }, rs: { def: '10000', label: 'Résistance fixe (Ω)' } },
    period: 1000,
    loop: C`uint32_t s = 0;
for (int i = 0; i < 16; i++) s += analogReadMilliVolts({{OUT}});
float v = s / 16.0f;                              // mV au point milieu
if (v > 10 && v < 3290) {
  float r = {{P:rs}} * (3300.0f - v) / v;         // résistance de la CTN
  float k = 1.0f / (1.0f / 298.15f + log(r / {{P:r0}}) / {{P:beta}});
  $temp = k - 273.15f;
} else {
  $temp = NAN;
}`,
    outs: [T]
  });
  add('temp', {
    id: 'max6675', key: 'max6675', name: 'MAX6675 + thermocouple K', tags: ['température', 'thermocouple', 'haute température', 'SPI'],
    desc: 'Convertisseur thermocouple type K : 0 à 1024 °C, résolution 0,25 °C (lecture SPI logicielle).',
    pins: [{ role: 'SCK', type: 'out', label: 'SCK' }, { role: 'CS', type: 'out', label: 'CS' }, { role: 'SO', type: 'in', label: 'SO' }],
    period: 500, needOk: true,
    glob: C`float $read() {
  digitalWrite({{CS}}, LOW);
  delayMicroseconds(10);
  uint16_t v = 0;
  for (int i = 15; i >= 0; i--) {
    digitalWrite({{SCK}}, HIGH);
    delayMicroseconds(1);
    if (digitalRead({{SO}})) v |= (1 << i);
    digitalWrite({{SCK}}, LOW);
    delayMicroseconds(1);
  }
  digitalWrite({{CS}}, HIGH);
  if (v & 0x4) return NAN;                   // thermocouple déconnecté
  return (v >> 3) * 0.25f;
}`,
    setup: C`pinMode({{CS}}, OUTPUT);
pinMode({{SCK}}, OUTPUT);
pinMode({{SO}}, INPUT);
digitalWrite({{CS}}, HIGH);
delay(250);
$ok = true;`,
    loop: C`$temp = $read();`,
    outs: [T], notes: ['Conversion toutes les 220 ms : ne pas lire plus vite.', 'Respecter la polarité du thermocouple (+ jaune / - rouge en norme ANSI).']
  });
  add('temp', {
    id: 'max31855', key: 'max31855', name: 'MAX31855 + thermocouple K', bus: 'spi', tags: ['température', 'thermocouple', 'SPI'],
    desc: 'Convertisseur thermocouple K moderne : -200 à 1350 °C, compensation de soudure froide.',
    pins: SPI.concat([{ role: 'CS', type: 'cs', label: 'CS' }]), libs: [X.max31855], inc: ['<Adafruit_MAX31855.h>'], needOk: true, period: 500, mA: 1.5,
    glob: C`Adafruit_MAX31855 $tc({{CS}});`,
    setup: C`$ok = $tc.begin();`,
    loop: C`double c = $tc.readCelsius();
$temp = isnan(c) ? NAN : (float)c;
$cold = $tc.readInternal();`,
    outs: [T, { k: 'cold', u: '°C', l: 'Soudure froide' }]
  });
  add('temp', {
    id: 'max31865', key: 'max31865', name: 'MAX31865 + sonde PT100', bus: 'spi', tags: ['température', 'PT100', 'RTD', 'SPI', 'industriel'],
    desc: 'Convertisseur pour sondes platine PT100/PT1000 (2, 3 ou 4 fils).',
    pins: SPI.concat([{ role: 'CS', type: 'cs', label: 'CS' }]), libs: [X.max31865, X.busio], inc: ['<Adafruit_MAX31865.h>'], needOk: true, period: 1000, difficulty: 2,
    params: { wires: { def: 'MAX31865_3WIRE', label: 'Câblage', opts: ['MAX31865_2WIRE', 'MAX31865_3WIRE', 'MAX31865_4WIRE'] }, rref: { def: '430.0', label: 'Résistance de référence (Ω)' }, rnom: { def: '100.0', label: 'R nominale (100 = PT100)' } },
    glob: C`Adafruit_MAX31865 $rtd({{CS}});`,
    setup: C`$ok = $rtd.begin({{P:wires}});`,
    loop: C`$temp = $rtd.temperature({{P:rnom}}, {{P:rref}});
uint8_t f = $rtd.readFault();
if (f) { Serial.printf("# MAX31865 défaut 0x%02X\n", f); $rtd.clearFault(); $temp = NAN; }`,
    outs: [T], notes: ['Soudez les ponts 2/3/4 fils du module selon votre sonde.', 'Rref = 430 Ω pour PT100, 4300 Ω pour PT1000.']
  });
  add('temp', {
    id: 'mlx90614', key: 'mlx90614', name: 'MLX90614 (thermomètre infrarouge)', bus: 'i2c', addr: ['0x5A'], tags: ['température', 'infrarouge', 'sans contact', 'I2C'],
    desc: 'Mesure sans contact la température d\'un objet (-70 à 380 °C) et la température ambiante.',
    pins: I2C, libs: [X.mlx90614, X.busio], inc: ['<Adafruit_MLX90614.h>'], needOk: true, period: 500, mA: 2,
    glob: C`Adafruit_MLX90614 $mlx;`,
    setup: C`$ok = $mlx.begin(0x5A, &Wire);`,
    loop: C`$amb = $mlx.readAmbientTempC();
$obj = $mlx.readObjectTempC();`,
    outs: [{ k: 'obj', u: '°C', l: 'Objet' }, { k: 'amb', u: '°C', l: 'Ambiante' }],
    notes: ['Champ de vision de 90° : l\'objet doit remplir le cône de mesure.', 'Le MLX90614 ne supporte pas bien un bus I2C à 400 kHz.']
  });
  add('temp', {
    id: 'amg8833', key: 'amg8833', name: 'AMG8833 (caméra thermique 8×8)', bus: 'i2c', addr: ['0x69', '0x68'], tags: ['thermique', 'caméra', 'infrarouge', 'I2C'],
    desc: 'Matrice de 64 thermopiles : image thermique 8×8 de 0 à 80 °C jusqu\'à 7 m.',
    pins: I2C, libs: [X.amg88, X.busio], inc: ['<Adafruit_AMG88xx.h>'], needOk: true, period: 500, mA: 5, difficulty: 2,
    glob: C`Adafruit_AMG88xx $amg;
float $px[AMG88xx_PIXEL_ARRAY_SIZE];`,
    setup: C`$ok = $amg.begin(0x69, &Wire);`,
    loop: C`$amg.readPixels($px);
float mn = 1000, mx = -1000, sum = 0;
for (int i = 0; i < AMG88xx_PIXEL_ARRAY_SIZE; i++) { mn = min(mn, $px[i]); mx = max(mx, $px[i]); sum += $px[i]; }
$tmin = mn;
$tmax = mx;
$tavg = sum / AMG88xx_PIXEL_ARRAY_SIZE;
$chip = $amg.readThermistor();`,
    outs: [{ k: 'tmax', u: '°C', l: 'Max' }, { k: 'tmin', u: '°C', l: 'Min' }, { k: 'tavg', u: '°C', l: 'Moyenne' }, { k: 'chip', u: '°C', l: 'Capteur' }]
  });

  /* ---------------- Pression ---------------- */
  add('temp', {
    id: 'dps310', key: 'dps310', name: 'DPS310', bus: 'i2c', addr: ['0x77', '0x76'], tags: ['pression', 'altitude', 'précision', 'I2C'],
    desc: 'Baromètre Infineon ±0,002 hPa (±2 cm) — détecte un étage d\'immeuble.',
    pins: I2C, libs: [X.dps310, X.sensor, X.busio], inc: ['<Adafruit_DPS310.h>'], needOk: true, period: 1000,
    glob: C`Adafruit_DPS310 $dps;`,
    setup: C`$ok = $dps.begin_I2C(0x77, &Wire);
if ($ok) {
  $dps.configurePressure(DPS310_64HZ, DPS310_64SAMPLES);
  $dps.configureTemperature(DPS310_64HZ, DPS310_64SAMPLES);
}`,
    loop: C`sensors_event_t t, p;
if ($dps.temperatureAvailable() && $dps.pressureAvailable() && $dps.getEvents(&t, &p)) {
  $temp = t.temperature;
  $press = p.pressure;
}`,
    outs: [T, P]
  });
  add('temp', {
    id: 'lps22', key: 'lps22', name: 'LPS22HB', bus: 'i2c', addr: ['0x5D', '0x5C'], tags: ['pression', 'I2C'],
    desc: 'Baromètre STMicroelectronics 260-1260 hPa, très faible consommation.',
    pins: I2C, libs: [X.lps2x, X.sensor, X.busio], inc: ['<Adafruit_LPS2X.h>'], needOk: true, period: 1000,
    glob: C`Adafruit_LPS22 $lps;`,
    setup: C`$ok = $lps.begin_I2C(0x5D, &Wire);
if ($ok) $lps.setDataRate(LPS22_RATE_10_HZ);`,
    loop: C`sensors_event_t p, t;
if ($lps.getEvent(&p, &t)) { $press = p.pressure; $temp = t.temperature; }`,
    outs: [P, T]
  });
  add('temp', {
    id: 'ms5611', key: 'ms5611', name: 'MS5611 (GY-63)', bus: 'i2c', addr: ['0x77', '0x76'], tags: ['pression', 'altitude', 'variomètre', 'I2C'],
    desc: 'Baromètre 24 bits pour variomètres et drones (résolution 10 cm).',
    pins: I2C, libs: [X.ms5611], inc: ['<MS5611.h>'], needOk: true, period: 500, difficulty: 2,
    params: { addr: { def: '0x77', label: 'Adresse I2C', opts: ['0x77', '0x76'] } },
    glob: C`MS5611 $ms({{P:addr}}, &Wire);`,
    setup: C`$ok = $ms.begin();
if ($ok) $ms.setOversampling(OSR_ULTRA_HIGH);`,
    loop: C`if ($ms.read() == MS5611_READ_OK) {
  $temp = $ms.getTemperature();
  $press = $ms.getPressure();
}`,
    outs: [T, P]
  });

  /* ---------------- CO2, COV, qualité de l'air ---------------- */
  add('air', {
    id: 'scd30', key: 'scd30', name: 'SCD30 (CO₂ NDIR)', bus: 'i2c', addr: ['0x61'], tags: ['CO2', 'qualité de l\'air', 'NDIR', 'I2C'],
    desc: 'Vrai capteur CO₂ infrarouge Sensirion (400-10 000 ppm) + température et humidité.',
    pins: I2C, libs: [X.scd30, X.sensor, X.busio], inc: ['<Adafruit_SCD30.h>'], needOk: true, period: 2000, mA: 19, peak_mA: 75, difficulty: 2,
    glob: C`Adafruit_SCD30 $scd;`,
    setup: C`$ok = $scd.begin(0x61, &Wire);`,
    loop: C`if ($scd.dataReady() && $scd.read()) {
  $co2 = $scd.CO2;
  $temp = $scd.temperature;
  $hum = $scd.relative_humidity;
}`,
    outs: [{ k: 'co2', u: 'ppm', l: 'CO₂' }, T, H],
    notes: ['Aérez régulièrement : > 1000 ppm = air confiné, > 1500 ppm = aération nécessaire.']
  });
  add('air', {
    id: 'scd40', key: 'scd40', name: 'SCD40 / SCD41 (CO₂ photoacoustique)', bus: 'i2c', addr: ['0x62'], tags: ['CO2', 'qualité de l\'air', 'I2C', 'sans bibliothèque'],
    desc: 'Capteur CO₂ miniature Sensirion (400-5000 ppm), piloté directement par commandes I2C.',
    pins: I2C, needOk: true, period: 5000, mA: 15, peak_mA: 205, difficulty: 2,
    glob: C`static const uint8_t $ADDR = 0x62;
bool $cmd(uint16_t c) {
  Wire.beginTransmission($ADDR);
  Wire.write(c >> 8);
  Wire.write(c & 0xFF);
  return Wire.endTransmission() == 0;
}
uint8_t $crc(const uint8_t *d) {
  uint8_t crc = 0xFF;
  for (int i = 0; i < 2; i++) {
    crc ^= d[i];
    for (int b = 0; b < 8; b++) crc = (crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x31) : (uint8_t)(crc << 1);
  }
  return crc;
}`,
    setup: C`$cmd(0x3F86);          // stop_periodic_measurement (au cas où)
delay(500);
$ok = $cmd(0x21B1);    // start_periodic_measurement (une mesure / 5 s)`,
    loop: C`if ($cmd(0xEC05)) {   // read_measurement
  delay(2);
  uint8_t b[9];
  if (Wire.requestFrom($ADDR, (uint8_t)9) == 9) {
    for (int i = 0; i < 9; i++) b[i] = Wire.read();
    if ($crc(b) == b[2] && $crc(b + 3) == b[5] && $crc(b + 6) == b[8]) {
      uint16_t co2 = (b[0] << 8) | b[1];
      if (co2) {
        $co2 = co2;
        $temp = -45.0f + 175.0f * ((b[3] << 8) | b[4]) / 65535.0f;
        $hum = 100.0f * ((b[6] << 8) | b[7]) / 65535.0f;
      }
    }
  }
}`,
    outs: [{ k: 'co2', u: 'ppm', l: 'CO₂' }, T, H],
    notes: ['Auto-étalonnage : exposez le capteur à l\'air extérieur au moins 1 h par semaine.']
  });
  add('air', {
    id: 'ccs811', key: 'ccs811', name: 'CCS811 (eCO₂ / COVT)', bus: 'i2c', addr: ['0x5A', '0x5B'], tags: ['COV', 'eCO2', 'qualité de l\'air', 'I2C'],
    desc: 'Capteur MOX : COV totaux (0-1187 ppb) et CO₂ équivalent (400-8192 ppm).',
    pins: I2C.concat([{ role: 'WAKE', type: 'out', label: 'WAK', note: 'relier à GND si non utilisé', optional: true }]), libs: [X.ccs811, X.busio], inc: ['<Adafruit_CCS811.h>'], needOk: true, period: 1000, mA: 30,
    params: { addr: { def: '0x5A', label: 'Adresse I2C', opts: ['0x5A', '0x5B'] } },
    glob: C`Adafruit_CCS811 $ccs;`,
    setup: C`if ({{WAKE}} >= 0) { pinMode({{WAKE}}, OUTPUT); digitalWrite({{WAKE}}, LOW); }
$ok = $ccs.begin({{P:addr}}, &Wire);`,
    loop: C`if ($ccs.available() && $ccs.readData() == 0) {
  $eco2 = $ccs.geteCO2();
  $tvoc = $ccs.getTVOC();
}`,
    outs: [{ k: 'eco2', u: 'ppm', l: 'eCO₂' }, { k: 'tvoc', u: 'ppb', l: 'COVT' }],
    notes: ['Rodage de 48 h conseillé puis 20 min de chauffe à chaque démarrage.']
  });
  add('air', {
    id: 'sgp30', key: 'sgp30', name: 'SGP30 (eCO₂ / COVT)', bus: 'i2c', addr: ['0x58'], tags: ['COV', 'eCO2', 'qualité de l\'air', 'I2C'],
    desc: 'Capteur multi-pixels Sensirion : COV totaux et CO₂ équivalent, mesure chaque seconde.',
    pins: I2C, libs: [X.sgp30, X.busio], inc: ['<Adafruit_SGP30.h>'], needOk: true, period: 1000, mA: 48,
    glob: C`Adafruit_SGP30 $sgp;`,
    setup: C`$ok = $sgp.begin(&Wire);`,
    loop: C`if ($sgp.IAQmeasure()) {
  $tvoc = $sgp.TVOC;
  $eco2 = $sgp.eCO2;
}`,
    outs: [{ k: 'eco2', u: 'ppm', l: 'eCO₂' }, { k: 'tvoc', u: 'ppb', l: 'COVT' }],
    notes: ['L\'algorithme nécessite une mesure par seconde : gardez la période à 1000 ms.']
  });
  add('air', {
    id: 'sgp40', key: 'sgp40', name: 'SGP40 (indice COV)', bus: 'i2c', addr: ['0x59'], tags: ['COV', 'qualité de l\'air', 'I2C'],
    desc: 'Indice COV Sensirion de 0 à 500 (100 = moyenne des dernières 24 h).',
    pins: I2C, libs: [X.sgp40, X.busio], inc: ['<Adafruit_SGP40.h>'], needOk: true, period: 1000, mA: 3,
    glob: C`Adafruit_SGP40 $sgp;`,
    setup: C`$ok = $sgp.begin(&Wire);`,
    loop: C`$raw = $sgp.measureRaw();
$voc = $sgp.measureVocIndex(25.0, 50.0);  // compensez avec T/RH réelles si disponibles`,
    outs: [{ k: 'voc', u: '', l: 'Indice COV' }, { k: 'raw', u: '', l: 'Brut' }]
  });
  add('air', {
    id: 'ens160', key: 'ens160', name: 'ENS160 (AQI / eCO₂ / COVT)', bus: 'i2c', addr: ['0x53', '0x52'], tags: ['COV', 'eCO2', 'AQI', 'I2C', 'sans bibliothèque'],
    desc: 'Capteur ScioSense : indice de qualité de l\'air UBA (1-5), COVT et eCO₂. Souvent vendu avec l\'AHT21.',
    pins: I2C, needOk: true, period: 1000, mA: 30,
    params: { addr: { def: '0x53', label: 'Adresse I2C', opts: ['0x53', '0x52'] } },
    glob: C`uint8_t $rd(uint8_t reg, uint8_t *buf, uint8_t n) {
  Wire.beginTransmission((uint8_t){{P:addr}});
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return 0;
  uint8_t got = Wire.requestFrom((uint8_t){{P:addr}}, n);
  for (uint8_t i = 0; i < got; i++) buf[i] = Wire.read();
  return got;
}`,
    setup: C`Wire.beginTransmission((uint8_t){{P:addr}});
Wire.write(0x10); Wire.write(0x02);        // OPMODE = STANDARD
$ok = Wire.endTransmission() == 0;`,
    loop: C`uint8_t b[5];
if ($rd(0x21, b, 5) == 5) {
  $aqi = b[0] & 0x07;
  $tvoc = b[1] | (b[2] << 8);
  $eco2 = b[3] | (b[4] << 8);
}`,
    outs: [{ k: 'aqi', u: '', l: 'Indice AQI (1-5)' }, { k: 'tvoc', u: 'ppb', l: 'COVT' }, { k: 'eco2', u: 'ppm', l: 'eCO₂' }],
    notes: ['Premières valeurs fiables après ~3 min (1 h lors de la toute première utilisation).']
  });
  add('air', {
    id: 'mhz19', key: 'mhz19', name: 'MH-Z19B / MH-Z19C (CO₂ NDIR)', uart: true, vcc: '5V', tags: ['CO2', 'NDIR', 'UART', 'sans bibliothèque'],
    desc: 'Capteur CO₂ infrarouge Winsen 0-5000 ppm, liaison série 9600 bauds.',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TX du capteur', note: 'TX du MH-Z19 → RX de l\'ESP32' }, { role: 'TX', type: 'uart_tx', label: 'RX du capteur' }],
    period: 5000, mA: 20, peak_mA: 150, needOk: true, difficulty: 2,
    glob: C`bool $read(uint16_t &ppm, int &temp) {
  static const uint8_t cmd[9] = {0xFF, 0x01, 0x86, 0, 0, 0, 0, 0, 0x79};
  while ({{SER}}.available()) {{SER}}.read();
  {{SER}}.write(cmd, 9);
  uint8_t r[9];
  if ({{SER}}.readBytes(r, 9) != 9 || r[0] != 0xFF || r[1] != 0x86) return false;
  uint8_t sum = 0;
  for (int i = 1; i < 8; i++) sum += r[i];
  if ((uint8_t)(0xFF - sum + 1) != r[8]) return false;
  ppm = (r[2] << 8) | r[3];
  temp = (int)r[4] - 40;
  return true;
}`,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});
{{SER}}.setTimeout(200);
$ok = true;`,
    loop: C`uint16_t ppm; int t;
if ($read(ppm, t)) { $co2 = ppm; $temp = t; }`,
    outs: [{ k: 'co2', u: 'ppm', l: 'CO₂' }, { k: 'temp', u: '°C', l: 'Température interne' }],
    notes: ['Préchauffage de 3 min.', 'Alimentation 5 V, niveaux série 3,3 V compatibles.']
  });
  add('air', {
    id: 'senseair_s8', key: 's8', name: 'SenseAir S8 (CO₂ NDIR)', uart: true, vcc: '5V', tags: ['CO2', 'NDIR', 'Modbus', 'UART'],
    desc: 'Capteur CO₂ industriel 400-2000 ppm (±40 ppm), protocole Modbus RTU.',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'UART_TxD' }, { role: 'TX', type: 'uart_tx', label: 'UART_RxD' }],
    period: 4000, mA: 30, peak_mA: 300, needOk: true, difficulty: 2,
    glob: C`bool $read(uint16_t &ppm) {
  static const uint8_t cmd[8] = {0xFE, 0x04, 0x00, 0x03, 0x00, 0x01, 0xD5, 0xC5};
  while ({{SER}}.available()) {{SER}}.read();
  {{SER}}.write(cmd, 8);
  uint8_t r[7];
  if ({{SER}}.readBytes(r, 7) != 7 || r[0] != 0xFE || r[1] != 0x04) return false;
  uint16_t crc = 0xFFFF;
  for (int i = 0; i < 5; i++) {
    crc ^= r[i];
    for (int b = 0; b < 8; b++) crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
  }
  if (crc != (uint16_t)(r[5] | (r[6] << 8))) return false;
  ppm = (r[3] << 8) | r[4];
  return true;
}`,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});
{{SER}}.setTimeout(250);
$ok = true;`,
    loop: C`uint16_t ppm;
if ($read(ppm)) $co2 = ppm;`,
    outs: [{ k: 'co2', u: 'ppm', l: 'CO₂' }]
  });
  add('air', {
    id: 'pms5003', key: 'pms', name: 'PMS5003 / PMS7003 (particules fines)', uart: true, vcc: '5V', tags: ['PM2.5', 'PM10', 'particules', 'pollution', 'UART'],
    desc: 'Compteur laser de particules Plantower : PM1.0, PM2.5 et PM10 en µg/m³.',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TX du capteur' }, { role: 'TX', type: 'uart_tx', label: 'RX du capteur' }],
    period: 1000, mA: 100, needOk: true, difficulty: 2,
    glob: C`uint8_t $buf[32];
uint8_t $pos = 0;`,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});
$ok = true;`,
    tick: C`while ({{SER}}.available()) {
  uint8_t c = {{SER}}.read();
  if (($pos == 0 && c != 0x42) || ($pos == 1 && c != 0x4D)) { $pos = 0; continue; }
  $buf[$pos++] = c;
  if ($pos == 32) {
    $pos = 0;
    uint16_t sum = 0;
    for (int i = 0; i < 30; i++) sum += $buf[i];
    if (sum == (uint16_t)(($buf[30] << 8) | $buf[31])) {
      $pm1 = ($buf[10] << 8) | $buf[11];     // valeurs « atmosphériques »
      $pm25 = ($buf[12] << 8) | $buf[13];
      $pm10 = ($buf[14] << 8) | $buf[15];
    }
  }
}`,
    outs: [{ k: 'pm1', u: 'µg/m³', l: 'PM1.0' }, { k: 'pm25', u: 'µg/m³', l: 'PM2.5' }, { k: 'pm10', u: 'µg/m³', l: 'PM10' }],
    notes: ['Seuil OMS PM2.5 : 15 µg/m³ en moyenne journalière.', 'Le ventilateur demande 5 V ; la liaison série est en 3,3 V.']
  });
  add('air', {
    id: 'sds011', key: 'sds011', name: 'SDS011 (particules fines)', uart: true, vcc: '5V', tags: ['PM2.5', 'PM10', 'particules', 'UART'],
    desc: 'Capteur laser Nova Fitness : PM2.5 et PM10, utilisé par le réseau citoyen Sensor.Community.',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TXD du capteur' }, { role: 'TX', type: 'uart_tx', label: 'RXD du capteur' }],
    period: 1000, mA: 70, needOk: true,
    glob: C`uint8_t $buf[10];
uint8_t $pos = 0;`,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});
$ok = true;`,
    tick: C`while ({{SER}}.available()) {
  uint8_t c = {{SER}}.read();
  if (($pos == 0 && c != 0xAA) || ($pos == 1 && c != 0xC0)) { $pos = 0; continue; }
  $buf[$pos++] = c;
  if ($pos == 10) {
    $pos = 0;
    uint8_t sum = 0;
    for (int i = 2; i < 8; i++) sum += $buf[i];
    if (sum == $buf[8] && $buf[9] == 0xAB) {
      $pm25 = (($buf[3] << 8) | $buf[2]) / 10.0f;
      $pm10 = (($buf[5] << 8) | $buf[4]) / 10.0f;
    }
  }
}`,
    outs: [{ k: 'pm25', u: 'µg/m³', l: 'PM2.5' }, { k: 'pm10', u: 'µg/m³', l: 'PM10' }]
  });
  add('air', {
    id: 'gp2y1010', key: 'gp2y', name: 'Sharp GP2Y1010AU0F (poussière)', vcc: '5V', tags: ['poussière', 'particules', 'analogique'],
    desc: 'Capteur optique de poussière : densité en mg/m³ par impulsion infrarouge.',
    pins: [{ role: 'LED', type: 'out', label: 'LED (broche 3)' }, { role: 'VO', type: 'adc', label: 'Vo (broche 5)', note: 'via pont diviseur 10 kΩ / 20 kΩ (sortie jusqu\'à 3,6 V)' }],
    period: 1000, mA: 11, difficulty: 2,
    params: { div: { def: '1.5', label: 'Rapport du pont diviseur' } },
    extraWiring: [{ pin: 'V-LED', to: '5V via 150 Ω + condensateur 220 µF vers GND', note: 'circuit recommandé par Sharp' }],
    glob: C`float $sample() {
  digitalWrite({{LED}}, LOW);           // LED allumée (active à l'état bas)
  delayMicroseconds(280);
  float mv = analogReadMilliVolts({{VO}}) * {{P:div}};
  delayMicroseconds(40);
  digitalWrite({{LED}}, HIGH);
  return mv;
}`,
    setup: C`pinMode({{LED}}, OUTPUT);
digitalWrite({{LED}}, HIGH);`,
    loop: C`float mv = 0;
for (int i = 0; i < 10; i++) { mv += $sample(); delay(10); }
mv /= 10.0f;
$dust = max(0.0f, 0.17f * (mv / 1000.0f) - 0.1f);   // courbe typique Sharp`,
    outs: [{ k: 'dust', u: 'mg/m³', l: 'Poussière' }]
  });

  // Capteurs de gaz MQ (chauffage 5 V, sortie analogique 0-5 V)
  const mq = (id, name, gas, a, b, clean, desc, heat) => add('gas', {
    id, key: id, name, vcc: '5V', tags: ['gaz', gas, 'MQ', 'analogique'], desc,
    pins: [{ role: 'AO', type: 'adc', label: 'AO', note: 'via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V' }, { role: 'DO', type: 'in', label: 'DO (seuil)', optional: true }],
    period: 1000, mA: heat || 150, difficulty: 2,
    params: { div: { def: '1.5', label: 'Rapport du pont diviseur (1 si aucun)' }, rl: { def: '10.0', label: 'Résistance de charge RL (kΩ)' }, r0: { def: '0', label: 'R0 en air propre (kΩ, 0 = auto)' } },
    glob: C`float $r0 = {{P:r0}};
uint8_t $calib = 0;
float $calibSum = 0;
float $rs() {
  uint32_t s = 0;
  for (int i = 0; i < 20; i++) s += analogReadMilliVolts({{AO}});
  float v = (s / 20.0f) * {{P:div}} / 1000.0f;       // tension réelle du capteur (V)
  if (v < 0.01f) v = 0.01f;
  return {{P:rl}} * (5.0f - v) / v;                   // résistance du capteur (kΩ)
}`,
    setup: C`if ({{DO}} >= 0) pinMode({{DO}}, INPUT);
Serial.println(F("# ${name} : préchauffage — laissez chauffer au moins 3 min (24 h la première fois)"));`,
    loop: C`float rs = $rs();
$rsk = rs;
if ($r0 <= 0) {                                     // étalonnage automatique sur 10 mesures en air propre
  $calibSum += rs / ${Number(clean).toFixed(2)}f;
  if (++$calib >= 10) { $r0 = $calibSum / 10.0f; Serial.printf("# ${name} : R0 = %.2f kΩ (à reporter dans le paramètre r0)\n", $r0); }
} else {
  $ratio = rs / $r0;
  $ppm = ${Number(a).toFixed(4)}f * powf($ratio, ${Number(b).toFixed(4)}f);
}
if ({{DO}} >= 0) $alarm = digitalRead({{DO}}) == LOW ? 1 : 0;`,
    outs: [{ k: 'ppm', u: gas === 'alcool' ? 'mg/L' : 'ppm', l: gas === 'alcool' ? 'Alcool (estimation)' : `${gas} (estimation)` }, { k: 'ratio', u: '', l: 'Rs/R0' }, { k: 'rsk', u: 'kΩ', l: 'Rs' }, { k: 'alarm', u: '', l: 'Seuil DO' }],
    notes: ['Valeurs indicatives : un étalonnage avec un gaz de référence est nécessaire pour des mesures fiables.', 'La résistance chauffante consomme ~150 mA : alimentation 5 V externe conseillée pour plusieurs capteurs.', 'Ne jamais utiliser comme détecteur de sécurité certifié.']
  });
  mq('mq2', 'MQ-2 (fumée, GPL, butane)', 'GPL', 574.25, -2.222, 9.83, 'Détecte fumée, GPL, butane, propane, méthane et hydrogène (200-10 000 ppm).');
  mq('mq3', 'MQ-3 (alcool)', 'alcool', 0.3934, -1.504, 60, 'Détecteur de vapeur d\'alcool pour éthylotest pédagogique (0,05-10 mg/L).', 160);
  mq('mq4', 'MQ-4 (méthane, gaz naturel)', 'CH4', 1012.7, -2.786, 4.4, 'Sensible au méthane et au gaz naturel (200-10 000 ppm).');
  mq('mq5', 'MQ-5 (GPL, gaz de ville)', 'GPL', 80.897, -2.431, 6.5, 'Détecte GPL et gaz naturel, peu sensible à l\'alcool et à la fumée.');
  mq('mq6', 'MQ-6 (GPL, butane)', 'GPL', 1009.2, -2.35, 10, 'Très sensible au GPL, isobutane et propane.');
  mq('mq7', 'MQ-7 (monoxyde de carbone)', 'CO', 99.042, -1.518, 27.5, 'Monoxyde de carbone 20-2000 ppm (cycle de chauffe 5 V / 1,4 V idéalement).');
  mq('mq8', 'MQ-8 (hydrogène)', 'H2', 976.97, -0.688, 70, 'Hydrogène 100-10 000 ppm.');
  mq('mq9', 'MQ-9 (CO, gaz inflammables)', 'CO', 599.65, -2.244, 9.6, 'Monoxyde de carbone et gaz inflammables (méthane, propane).');
  mq('mq135', 'MQ-135 (qualité de l\'air)', 'CO2', 110.47, -2.862, 3.6, 'Qualité de l\'air : NH3, NOx, benzène, fumée, CO₂ (estimation relative).');

  /* ---------------- Météo, sol, eau ---------------- */
  add('weather', {
    id: 'rain', key: 'rain', name: 'Capteur de pluie FC-37 / YL-83', tags: ['pluie', 'météo', 'analogique'],
    desc: 'Plaque de détection de gouttes avec comparateur LM393 : intensité (AO) et seuil (DO).',
    pins: [{ role: 'AO', type: 'adc', label: 'AO' }, { role: 'DO', type: 'in', label: 'DO', optional: true }], period: 1000,
    setup: C`if ({{DO}} >= 0) pinMode({{DO}}, INPUT);`,
    loop: C`int mv = analogReadMilliVolts({{AO}});
$wet = constrain(map(mv, 3300, 800, 0, 100), 0, 100);    // 0 % sec, 100 % très mouillé
if ({{DO}} >= 0) $rain = digitalRead({{DO}}) == LOW ? 1 : 0;`,
    outs: [{ k: 'wet', u: '%', l: 'Humidité plaque' }, { k: 'rain', u: '', l: 'Pluie (0/1)' }],
    notes: ['Pour éviter l\'électrolyse, alimentez la plaque via une broche GPIO uniquement pendant la mesure.']
  });
  add('weather', {
    id: 'soil_cap', key: 'soil', name: 'Humidité du sol capacitive v1.2', tags: ['sol', 'jardin', 'arrosage', 'analogique'],
    desc: 'Sonde capacitive sans électrode exposée : ne se corrode pas, idéale pour l\'arrosage automatique.',
    pins: [{ role: 'AO', type: 'adc', label: 'AOUT' }], period: 2000,
    params: { dry: { def: '2600', label: 'Tension à sec (mV)' }, wet: { def: '1150', label: 'Tension dans l\'eau (mV)' } },
    loop: C`uint32_t s = 0;
for (int i = 0; i < 16; i++) s += analogReadMilliVolts({{AO}});
float mv = s / 16.0f;
$mv = mv;
$moist = constrain(100.0f * ({{P:dry}} - mv) / ({{P:dry}} - {{P:wet}}), 0.0f, 100.0f);`,
    outs: [{ k: 'moist', u: '%', l: 'Humidité du sol' }, { k: 'mv', u: 'mV', l: 'Tension' }],
    notes: ['Étalonnez « sec » (à l\'air) et « mouillé » (dans un verre d\'eau) pour votre sonde.', 'Certaines copies n\'ont pas le régulateur 3,3 V : alimentez-les en 3V3.']
  });
  add('weather', {
    id: 'soil_res', key: 'soilr', name: 'Humidité du sol résistive YL-69 / FC-28', tags: ['sol', 'jardin', 'analogique'],
    desc: 'Fourche résistive économique ; alimentée seulement pendant la mesure pour limiter la corrosion.',
    pins: [{ role: 'AO', type: 'adc', label: 'AO' }, { role: 'PWR', type: 'out', label: 'VCC (via GPIO)', note: 'la sonde est alimentée par cette broche' }], period: 5000,
    setup: C`pinMode({{PWR}}, OUTPUT);
digitalWrite({{PWR}}, LOW);`,
    loop: C`digitalWrite({{PWR}}, HIGH);
delay(20);
int mv = analogReadMilliVolts({{AO}});
digitalWrite({{PWR}}, LOW);
$moist = constrain(map(mv, 3200, 1200, 0, 100), 0, 100);`,
    outs: [{ k: 'moist', u: '%', l: 'Humidité du sol' }]
  });
  add('weather', {
    id: 'water_level', key: 'wlevel', name: 'Capteur de niveau d\'eau (pistes)', tags: ['eau', 'niveau', 'analogique'],
    desc: 'Plaque à pistes parallèles : tension proportionnelle à la hauteur d\'eau (0-4 cm).',
    pins: [{ role: 'AO', type: 'adc', label: 'S' }, { role: 'PWR', type: 'out', label: '+ (via GPIO)' }], period: 1000,
    setup: C`pinMode({{PWR}}, OUTPUT);
digitalWrite({{PWR}}, LOW);`,
    loop: C`digitalWrite({{PWR}}, HIGH);
delay(10);
int mv = analogReadMilliVolts({{AO}});
digitalWrite({{PWR}}, LOW);
$mv = mv;
$level = constrain(map(mv, 0, 1800, 0, 100), 0, 100);`,
    outs: [{ k: 'level', u: '%', l: 'Niveau' }, { k: 'mv', u: 'mV', l: 'Tension' }]
  });
  add('weather', {
    id: 'float_switch', key: 'float', name: 'Interrupteur à flotteur', tags: ['eau', 'niveau', 'cuve', 'numérique'],
    desc: 'Contact magnétique qui bascule quand le niveau d\'eau atteint le flotteur.',
    pins: [{ role: 'SW', type: 'in_pullup', label: 'fil 1', note: 'fil 2 vers GND' }], period: 200,
    setup: C`pinMode({{SW}}, INPUT_PULLUP);`,
    loop: C`$full = digitalRead({{SW}}) == LOW ? 1 : 0;`,
    outs: [{ k: 'full', u: '', l: 'Niveau atteint (0/1)' }]
  });
  add('weather', {
    id: 'guva_s12sd', key: 'uvg', name: 'GUVA-S12SD (UV)', tags: ['UV', 'soleil', 'analogique'],
    desc: 'Photodiode UV 240-370 nm : indice UV approximatif (tension / 0,1 V).',
    pins: [{ role: 'OUT', type: 'adc', label: 'SIG' }], period: 1000,
    loop: C`uint32_t s = 0;
for (int i = 0; i < 16; i++) s += analogReadMilliVolts({{OUT}});
float mv = s / 16.0f;
$mv = mv;
$uvi = mv / 100.0f;`,
    outs: [{ k: 'uvi', u: '', l: 'Indice UV' }, { k: 'mv', u: 'mV', l: 'Tension' }]
  });
  add('weather', {
    id: 'ml8511', key: 'ml8511', name: 'ML8511 (UV)', tags: ['UV', 'analogique'],
    desc: 'Capteur UV-A/B Lapis : intensité en mW/cm² de 0 à 15.',
    pins: [{ role: 'OUT', type: 'adc', label: 'OUT' }, { role: 'EN', type: 'out', label: 'EN', note: 'ou relier EN à 3V3' }], period: 1000,
    setup: C`pinMode({{EN}}, OUTPUT);
digitalWrite({{EN}}, HIGH);`,
    loop: C`uint32_t s = 0;
for (int i = 0; i < 16; i++) s += analogReadMilliVolts({{OUT}});
float v = s / 16.0f / 1000.0f;
$uv = max(0.0f, (v - 0.99f) * (15.0f / (2.8f - 0.99f)));`,
    outs: [{ k: 'uv', u: 'mW/cm²', l: 'Intensité UV' }]
  });
  add('weather', {
    id: 'veml6070', key: 'veml6070', name: 'VEML6070 (UV-A)', bus: 'i2c', addr: ['0x38'], tags: ['UV', 'I2C'],
    desc: 'Capteur UV-A Vishay (320-410 nm).',
    pins: I2C, libs: [X.veml6070], inc: ['<Adafruit_VEML6070.h>'], period: 1000,
    glob: C`Adafruit_VEML6070 $uv;`,
    setup: C`$uv.begin(VEML6070_1_T, &Wire);`,
    loop: C`$level = $uv.readUV();`,
    outs: [{ k: 'level', u: '', l: 'Niveau UV brut' }],
    notes: ['Occupe aussi les adresses 0x39 et 0x3A : incompatible avec l\'AHT20 (0x38) sur le même bus.']
  });
  add('weather', {
    id: 'ltr390', key: 'ltr390', name: 'LTR390 (UV + lumière)', bus: 'i2c', addr: ['0x53'], tags: ['UV', 'lumière', 'I2C'],
    desc: 'Capteur Lite-On : indice UV et lumière ambiante.',
    pins: I2C, libs: [X.ltr390, X.busio], inc: ['<Adafruit_LTR390.h>'], needOk: true, period: 1000,
    glob: C`Adafruit_LTR390 $ltr;`,
    setup: C`$ok = $ltr.begin(&Wire);
if ($ok) { $ltr.setMode(LTR390_MODE_UVS); $ltr.setGain(LTR390_GAIN_18); $ltr.setResolution(LTR390_RESOLUTION_20BIT); }`,
    loop: C`if ($ltr.newDataAvailable()) {
  $uvs = $ltr.readUVS();
  $uvi = $uvs / 2300.0f;          // sensibilité typique à gain 18x / 20 bits
}`,
    outs: [{ k: 'uvi', u: '', l: 'Indice UV' }, { k: 'uvs', u: '', l: 'UVS brut' }]
  });
  add('weather', {
    id: 'si1145', key: 'si1145', name: 'SI1145 / SI1151 (UV, visible, IR)', bus: 'i2c', addr: ['0x60'], tags: ['UV', 'lumière', 'infrarouge', 'I2C'],
    desc: 'Capteur Silicon Labs : indice UV calculé, lumière visible et infrarouge.',
    pins: I2C, libs: [X.si1145, X.busio], inc: ['<Adafruit_SI1145.h>'], needOk: true, period: 1000,
    glob: C`Adafruit_SI1145 $si;`,
    setup: C`$ok = $si.begin(0x60, &Wire);`,
    loop: C`$uvi = $si.readUV() / 100.0f;
$vis = $si.readVisible();
$ir = $si.readIR();`,
    outs: [{ k: 'uvi', u: '', l: 'Indice UV' }, { k: 'vis', u: '', l: 'Visible' }, { k: 'ir', u: '', l: 'Infrarouge' }]
  });
  add('weather', {
    id: 'anemometer', key: 'wind', name: 'Anémomètre à impulsions', tags: ['vent', 'météo', 'interruption'],
    desc: 'Anémomètre à contact reed (kit météo SparkFun/Misol) : 1 impulsion/s = 2,4 km/h.',
    pins: [{ role: 'PULSE', type: 'in_pullup', label: 'fil 1', note: 'fil 2 vers GND' }], period: 3000,
    params: { k: { def: '2.4', label: 'km/h pour 1 impulsion/s' } },
    glob: C`volatile uint32_t $pulses = 0;
volatile uint32_t $lastUs = 0;
void IRAM_ATTR $isr() {
  uint32_t t = micros();
  if (t - $lastUs > 5000) { $pulses = $pulses + 1; $lastUs = t; }   // anti-rebond 5 ms
}`,
    setup: C`pinMode({{PULSE}}, INPUT_PULLUP);
attachInterrupt(digitalPinToInterrupt({{PULSE}}), $isr, FALLING);`,
    loop: C`noInterrupts();
uint32_t n = $pulses;
$pulses = 0;
interrupts();
$speed = n * {{P:k}} * 1000.0f / {{PERIOD_MS}};`,
    outs: [{ k: 'speed', u: 'km/h', l: 'Vitesse du vent' }]
  });
  add('weather', {
    id: 'wind_vane', key: 'vane', name: 'Girouette à résistances', tags: ['vent', 'direction', 'météo', 'analogique'],
    desc: 'Girouette 16 positions (kit météo) : direction du vent en degrés via un pont diviseur 10 kΩ.',
    pins: [{ role: 'AO', type: 'adc', label: 'fil 1', note: '10 kΩ entre 3V3 et le point de mesure, fil 2 vers GND' }], period: 2000,
    glob: C`const float $R[16] = {33000, 6570, 8200, 891, 1000, 688, 2200, 1410, 3900, 3140, 16000, 14120, 120000, 42120, 64900, 21880};
float $dir(float mv) {
  int best = 0;
  float err = 1e9;
  for (int i = 0; i < 16; i++) {
    float expect = 3300.0f * $R[i] / ($R[i] + 10000.0f);
    if (fabs(expect - mv) < err) { err = fabs(expect - mv); best = i; }
  }
  return best * 22.5f;
}`,
    loop: C`$deg = $dir(analogReadMilliVolts({{AO}}));`,
    outs: [{ k: 'deg', u: '°', l: 'Direction (0 = nord)' }]
  });
  add('weather', {
    id: 'rain_gauge', key: 'pluvio', name: 'Pluviomètre à auget', tags: ['pluie', 'météo', 'interruption'],
    desc: 'Pluviomètre basculant : 0,2794 mm de pluie par basculement.',
    pins: [{ role: 'PULSE', type: 'in_pullup', label: 'fil 1', note: 'fil 2 vers GND' }], period: 10000,
    params: { mm: { def: '0.2794', label: 'mm par basculement' } },
    glob: C`volatile uint32_t $tips = 0;
volatile uint32_t $lastMs = 0;
void IRAM_ATTR $isr() {
  uint32_t t = millis();
  if (t - $lastMs > 200) { $tips = $tips + 1; $lastMs = t; }
}`,
    setup: C`pinMode({{PULSE}}, INPUT_PULLUP);
attachInterrupt(digitalPinToInterrupt({{PULSE}}), $isr, FALLING);`,
    loop: C`$total = $tips * {{P:mm}};`,
    outs: [{ k: 'total', u: 'mm', l: 'Cumul de pluie' }]
  });
  add('water', {
    id: 'ph', key: 'ph', name: 'Sonde pH (module PH-4502C / SEN0161)', vcc: '5V', tags: ['pH', 'eau', 'aquarium', 'analogique'],
    desc: 'Mesure du pH de 0 à 14 avec étalonnage deux points (tampons pH 4 et pH 7).',
    pins: [{ role: 'PO', type: 'adc', label: 'Po', note: 'via pont diviseur si la sortie dépasse 3,3 V' }], period: 2000, mA: 10, difficulty: 2,
    params: { v7: { def: '2500', label: 'Tension à pH 7 (mV)' }, v4: { def: '3030', label: 'Tension à pH 4 (mV)' }, div: { def: '1.0', label: 'Rapport pont diviseur' } },
    loop: C`uint32_t s = 0;
for (int i = 0; i < 32; i++) s += analogReadMilliVolts({{PO}});
float mv = s / 32.0f * {{P:div}};
$mv = mv;
float slope = (7.0f - 4.0f) / ({{P:v7}} - {{P:v4}});
$ph = 7.0f + (mv - {{P:v7}}) * slope;`,
    outs: [{ k: 'ph', u: 'pH', l: 'pH' }, { k: 'mv', u: 'mV', l: 'Tension' }],
    notes: ['Rincez la sonde à l\'eau distillée entre deux solutions.', 'Ne laissez jamais l\'électrode sécher : conservez-la dans sa solution KCl.']
  });
  add('water', {
    id: 'tds', key: 'tds', name: 'Sonde TDS (conductivité)', tags: ['TDS', 'eau', 'conductivité', 'analogique'],
    desc: 'Total des solides dissous en ppm (qualité de l\'eau potable, hydroponie).',
    pins: [{ role: 'AO', type: 'adc', label: 'A' }], period: 2000,
    params: { temp: { def: '25.0', label: 'Température de l\'eau (°C)' } },
    loop: C`uint32_t s = 0;
for (int i = 0; i < 32; i++) s += analogReadMilliVolts({{AO}});
float v = s / 32.0f / 1000.0f;
float vc = v / (1.0f + 0.02f * ({{P:temp}} - 25.0f));   // compensation de température
$tds = (133.42f * vc * vc * vc - 255.86f * vc * vc + 857.39f * vc) * 0.5f;`,
    outs: [{ k: 'tds', u: 'ppm', l: 'TDS' }],
    notes: ['Eau potable : < 300 ppm excellent, > 1000 ppm déconseillé.']
  });
  add('water', {
    id: 'turbidity', key: 'turb', name: 'Capteur de turbidité', vcc: '5V', tags: ['turbidité', 'eau', 'analogique'],
    desc: 'Mesure la clarté de l\'eau (NTU) par diffusion infrarouge.',
    pins: [{ role: 'AO', type: 'adc', label: 'OUT (A)', note: 'via pont diviseur 10 kΩ / 20 kΩ (sortie 0-4,5 V)' }], period: 2000, mA: 40,
    params: { div: { def: '1.5', label: 'Rapport pont diviseur' } },
    loop: C`uint32_t s = 0;
for (int i = 0; i < 32; i++) s += analogReadMilliVolts({{AO}});
float v = s / 32.0f * {{P:div}} / 1000.0f;
$volt = v;
$ntu = v >= 4.2f ? 0.0f : max(0.0f, -1120.4f * v * v + 5742.3f * v - 4352.9f);`,
    outs: [{ k: 'ntu', u: 'NTU', l: 'Turbidité' }, { k: 'volt', u: 'V', l: 'Tension' }]
  });
  add('water', {
    id: 'flow_yfs201', key: 'flow', name: 'Débitmètre YF-S201', vcc: '5V', tags: ['débit', 'eau', 'interruption'],
    desc: 'Débitmètre à effet Hall 1-30 L/min : 7,5 impulsions par L/min.',
    pins: [{ role: 'PULSE', type: 'in_pullup', label: 'signal (jaune)', note: 'sortie collecteur ouvert : tirage interne activé' }], period: 1000, mA: 15,
    params: { k: { def: '7.5', label: 'Hz par L/min' } },
    glob: C`volatile uint32_t $pulses = 0;
float $liters = 0;
void IRAM_ATTR $isr() { $pulses = $pulses + 1; }`,
    setup: C`pinMode({{PULSE}}, INPUT_PULLUP);
attachInterrupt(digitalPinToInterrupt({{PULSE}}), $isr, FALLING);`,
    loop: C`noInterrupts();
uint32_t n = $pulses;
$pulses = 0;
interrupts();
float hz = n * 1000.0f / {{PERIOD_MS}};
$lpm = hz / {{P:k}};
$liters += $lpm / 60.0f * ({{PERIOD_MS}} / 1000.0f);
$total = $liters;`,
    outs: [{ k: 'lpm', u: 'L/min', l: 'Débit' }, { k: 'total', u: 'L', l: 'Volume' }]
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* Modules « Lumière, couleur & infrarouge ». */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const M = (LAB.MODULES = LAB.MODULES || []);
  const X = LAB.LIBS;
  const C = String.raw;
  const I2C = [{ role: 'SDA', bus: 'sda' }, { role: 'SCL', bus: 'scl' }];
  const add = (m) => M.push(Object.assign({ cat: 'light', difficulty: 1, vcc: '3V3', mA: 1, period: 1000 }, m));
  const LUX = { k: 'lux', u: 'lx', l: 'Éclairement' };

  add({
    id: 'ldr', key: 'ldr', name: 'Photorésistance (LDR / GL5528)', tags: ['lumière', 'analogique', 'débutant'],
    desc: 'Cellule photoélectrique en pont diviseur avec une résistance de 10 kΩ : niveau de luminosité relatif.',
    pins: [{ role: 'AO', type: 'adc', label: 'point milieu', note: 'LDR entre 3V3 et le point milieu, 10 kΩ entre le point milieu et GND' }],
    loop: C`uint32_t s = 0;
for (int i = 0; i < 16; i++) s += analogReadMilliVolts({{AO}});
float mv = s / 16.0f;
$light = constrain(mv * 100.0f / 3300.0f, 0.0f, 100.0f);`,
    outs: [{ k: 'light', u: '%', l: 'Luminosité' }]
  });
  add({
    id: 'ldr_module', key: 'ldrm', name: 'Module photorésistance KY-018 / LM393', tags: ['lumière', 'seuil', 'numérique'],
    desc: 'Module LDR avec comparateur réglable : sortie numérique jour/nuit et sortie analogique.',
    pins: [{ role: 'DO', type: 'in', label: 'DO' }, { role: 'AO', type: 'adc', label: 'AO', optional: true }], period: 500,
    setup: C`pinMode({{DO}}, INPUT);`,
    loop: C`$dark = digitalRead({{DO}}) == HIGH ? 1 : 0;      // DO = HIGH quand il fait sombre
if ({{AO}} >= 0) $level = 100.0f - analogReadMilliVolts({{AO}}) * 100.0f / 3300.0f;`,
    outs: [{ k: 'dark', u: '', l: 'Obscurité (0/1)' }, { k: 'level', u: '%', l: 'Luminosité' }],
    notes: ['Réglez le seuil avec le potentiomètre bleu du module.']
  });
  add({
    id: 'temt6000', key: 'temt', name: 'TEMT6000 (phototransistor)', tags: ['lumière', 'analogique'],
    desc: 'Capteur de lumière ambiante calé sur la sensibilité de l\'œil humain (0-1000 lx environ).',
    pins: [{ role: 'SIG', type: 'adc', label: 'SIG' }],
    loop: C`uint32_t s = 0;
for (int i = 0; i < 16; i++) s += analogReadMilliVolts({{SIG}});
float mv = s / 16.0f;
$lux = mv * 0.2f;   // I = V / 10 kΩ et 0,5 µA par lux (fiche technique Vishay)`,
    outs: [LUX]
  });
  add({
    id: 'bh1750', key: 'bh1750', name: 'BH1750 (GY-30 / GY-302)', bus: 'i2c', addr: ['0x23', '0x5C'], tags: ['lumière', 'lux', 'I2C'],
    desc: 'Luxmètre numérique 1-65 535 lx, idéal pour l\'éclairage automatique.',
    pins: I2C, libs: [X.bh1750], inc: ['<BH1750.h>'], needOk: true,
    params: { addr: { def: '0x23', label: 'Adresse (ADDR à GND = 0x23)', opts: ['0x23', '0x5C'] } },
    glob: C`BH1750 $meter({{P:addr}});`,
    setup: C`$ok = $meter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, {{P:addr}}, &Wire);`,
    loop: C`float lx = $meter.readLightLevel();
$lux = lx < 0 ? NAN : lx;`,
    outs: [LUX]
  });
  add({
    id: 'tsl2561', key: 'tsl2561', name: 'TSL2561', bus: 'i2c', addr: ['0x39', '0x29', '0x49'], tags: ['lumière', 'lux', 'infrarouge', 'I2C'],
    desc: 'Luxmètre à deux photodiodes (visible + IR) : 0,1-40 000 lx, proche de la vision humaine.',
    pins: I2C, libs: [X.tsl2561, X.sensor], inc: ['<Adafruit_TSL2561_U.h>'], needOk: true,
    glob: C`Adafruit_TSL2561_Unified $tsl(TSL2561_ADDR_FLOAT, 12345);`,
    setup: C`$ok = $tsl.begin(&Wire);
if ($ok) { $tsl.enableAutoRange(true); $tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_101MS); }`,
    loop: C`uint16_t bb, ir;
$tsl.getLuminosity(&bb, &ir);
uint32_t lx = $tsl.calculateLux(bb, ir);
$lux = (lx == 65536) ? NAN : (float)lx;     // 65536 = capteur saturé
$ir = ir;`,
    outs: [LUX, { k: 'ir', u: '', l: 'Infrarouge brut' }]
  });
  add({
    id: 'tsl2591', key: 'tsl2591', name: 'TSL2591', bus: 'i2c', addr: ['0x29'], tags: ['lumière', 'lux', 'haute dynamique', 'I2C'],
    desc: 'Luxmètre à très haute dynamique (188 µlx à 88 000 lx), mesure de nuit comme en plein soleil.',
    pins: I2C, libs: [X.tsl2591, X.sensor], inc: ['<Adafruit_TSL2591.h>'], needOk: true,
    glob: C`Adafruit_TSL2591 $tsl(2591);`,
    setup: C`$ok = $tsl.begin(&Wire);
if ($ok) { $tsl.setGain(TSL2591_GAIN_MED); $tsl.setTiming(TSL2591_INTEGRATIONTIME_300MS); }`,
    loop: C`uint32_t lum = $tsl.getFullLuminosity();
uint16_t ir = lum >> 16, full = lum & 0xFFFF;
float lx = $tsl.calculateLux(full, ir);
$lux = lx < 0 ? NAN : lx;
$ir = ir;`,
    outs: [LUX, { k: 'ir', u: '', l: 'Infrarouge brut' }]
  });
  add({
    id: 'veml7700', key: 'veml7700', name: 'VEML7700', bus: 'i2c', addr: ['0x10'], tags: ['lumière', 'lux', 'I2C'],
    desc: 'Luxmètre Vishay 16 bits de 0 à 120 000 lx avec correction de non-linéarité.',
    pins: I2C, libs: [X.veml7700, X.busio], inc: ['<Adafruit_VEML7700.h>'], needOk: true,
    glob: C`Adafruit_VEML7700 $veml;`,
    setup: C`$ok = $veml.begin(&Wire);`,
    loop: C`$lux = $veml.readLux(VEML_LUX_AUTO);
$white = $veml.readWhite();`,
    outs: [LUX, { k: 'white', u: '', l: 'Canal blanc' }]
  });
  add({
    id: 'max44009', key: 'max44009', name: 'MAX44009 (GY-49)', bus: 'i2c', addr: ['0x4A', '0x4B'], tags: ['lumière', 'lux', 'I2C', 'sans bibliothèque'],
    desc: 'Luxmètre ultra-basse consommation 0,045-188 000 lx (lecture directe des registres).',
    pins: I2C, needOk: true,
    params: { addr: { def: '0x4A', label: 'Adresse I2C', opts: ['0x4A', '0x4B'] } },
    glob: C`float $read() {
  Wire.beginTransmission((uint8_t){{P:addr}});
  Wire.write(0x03);
  if (Wire.endTransmission(false) != 0 || Wire.requestFrom((uint8_t){{P:addr}}, (uint8_t)2) != 2) return NAN;
  uint8_t hi = Wire.read(), lo = Wire.read();
  uint8_t exponent = hi >> 4;
  uint8_t mantissa = ((hi & 0x0F) << 4) | (lo & 0x0F);
  return (1 << exponent) * mantissa * 0.045f;
}`,
    setup: C`Wire.beginTransmission((uint8_t){{P:addr}});
$ok = Wire.endTransmission() == 0;`,
    loop: C`$lux = $read();`,
    outs: [LUX]
  });
  add({
    id: 'tcs34725', key: 'tcs34725', name: 'TCS34725 (couleur RVB)', bus: 'i2c', addr: ['0x29'], tags: ['couleur', 'RVB', 'I2C', 'tri'],
    desc: 'Capteur de couleur avec filtre IR et LED blanche : composantes R, V, B, température de couleur et lux.',
    pins: I2C.concat([{ role: 'LED', type: 'out', label: 'LED', optional: true, note: 'LED blanche du module (HIGH = allumée)' }]), libs: [X.tcs34725], inc: ['<Adafruit_TCS34725.h>'], needOk: true, mA: 20,
    glob: C`Adafruit_TCS34725 $tcs(TCS34725_INTEGRATIONTIME_154MS, TCS34725_GAIN_4X);`,
    setup: C`if ({{LED}} >= 0) { pinMode({{LED}}, OUTPUT); digitalWrite({{LED}}, HIGH); }
$ok = $tcs.begin(TCS34725_ADDRESS, &Wire);`,
    loop: C`uint16_t r, g, b, c;
$tcs.getRawData(&r, &g, &b, &c);
if (c > 0) {
  $red = 255.0f * r / c;
  $green = 255.0f * g / c;
  $blue = 255.0f * b / c;
}
$cct = $tcs.calculateColorTemperature_dn40(r, g, b, c);
$lux = $tcs.calculateLux(r, g, b);`,
    outs: [{ k: 'red', u: '', l: 'Rouge (0-255)' }, { k: 'green', u: '', l: 'Vert (0-255)' }, { k: 'blue', u: '', l: 'Bleu (0-255)' }, { k: 'cct', u: 'K', l: 'Température de couleur' }, LUX]
  });
  add({
    id: 'tcs3200', key: 'tcs3200', name: 'TCS3200 / TCS230 (couleur)', tags: ['couleur', 'fréquence', 'tri'], vcc: '3V3',
    desc: 'Capteur de couleur à sortie en fréquence : filtres sélectionnés par S2/S3, échelle par S0/S1.',
    pins: [{ role: 'S0', type: 'out' }, { role: 'S1', type: 'out' }, { role: 'S2', type: 'out' }, { role: 'S3', type: 'out' }, { role: 'OUT', type: 'in', label: 'OUT' }],
    period: 500, mA: 3, difficulty: 2,
    glob: C`uint32_t $measure(bool s2, bool s3) {
  digitalWrite({{S2}}, s2);
  digitalWrite({{S3}}, s3);
  delay(5);
  uint32_t p = pulseIn({{OUT}}, LOW, 50000);
  return p ? 1000000UL / (2 * p) : 0;   // fréquence en Hz
}`,
    setup: C`pinMode({{S0}}, OUTPUT); pinMode({{S1}}, OUTPUT);
pinMode({{S2}}, OUTPUT); pinMode({{S3}}, OUTPUT);
pinMode({{OUT}}, INPUT);
digitalWrite({{S0}}, HIGH); digitalWrite({{S1}}, LOW);   // échelle de fréquence 20 %`,
    loop: C`$red = $measure(LOW, LOW);
$blue = $measure(LOW, HIGH);
$green = $measure(HIGH, HIGH);`,
    outs: [{ k: 'red', u: 'Hz', l: 'Rouge' }, { k: 'green', u: 'Hz', l: 'Vert' }, { k: 'blue', u: 'Hz', l: 'Bleu' }],
    notes: ['Étalonnez avec une feuille blanche et une noire pour convertir les fréquences en RVB.']
  });
  add({
    id: 'apds9960', key: 'apds9960', name: 'APDS9960 (gestes, proximité, couleur)', bus: 'i2c', addr: ['0x39'], tags: ['geste', 'proximité', 'couleur', 'I2C'],
    desc: 'Détecte les gestes haut/bas/gauche/droite, la proximité et la couleur ambiante.',
    pins: I2C, libs: [X.apds9960, X.busio], inc: ['<Adafruit_APDS9960.h>'], needOk: true, period: 50, difficulty: 2,
    glob: C`Adafruit_APDS9960 $apds;`,
    setup: C`$ok = $apds.begin(10, APDS9960_AGAIN_4X, APDS9960_ADDRESS, &Wire);
if ($ok) { $apds.enableProximity(true); $apds.enableGesture(true); }`,
    loop: C`uint8_t g = $apds.readGesture();
if (g == APDS9960_UP) Serial.println(F("# geste : HAUT"));
else if (g == APDS9960_DOWN) Serial.println(F("# geste : BAS"));
else if (g == APDS9960_LEFT) Serial.println(F("# geste : GAUCHE"));
else if (g == APDS9960_RIGHT) Serial.println(F("# geste : DROITE"));
if (g) $gesture = g;
$prox = $apds.readProximity();`,
    outs: [{ k: 'prox', u: '', l: 'Proximité (0-255)' }, { k: 'gesture', u: '', l: 'Dernier geste (1-4)' }],
    notes: ['Le mode gestes nécessite une lecture rapide : laissez la période à 50 ms.']
  });
  add({
    id: 'as7341', key: 'as7341', name: 'AS7341 (spectromètre 11 canaux)', bus: 'i2c', addr: ['0x39'], tags: ['spectre', 'couleur', 'I2C', 'science'],
    desc: 'Mini-spectromètre : 8 bandes visibles de 415 à 680 nm, proche IR et lumière claire.',
    pins: I2C, libs: [X.as7341, X.busio], inc: ['<Adafruit_AS7341.h>'], needOk: true, period: 1500, difficulty: 2,
    glob: C`Adafruit_AS7341 $as;`,
    setup: C`$ok = $as.begin(AS7341_I2CADDR_DEFAULT, &Wire);
if ($ok) { $as.setATIME(100); $as.setASTEP(999); $as.setGain(AS7341_GAIN_256X); }`,
    loop: C`if ($as.readAllChannels()) {
  $f415 = $as.getChannel(AS7341_CHANNEL_415nm_F1);
  $f480 = $as.getChannel(AS7341_CHANNEL_480nm_F3);
  $f555 = $as.getChannel(AS7341_CHANNEL_555nm_F5);
  $f630 = $as.getChannel(AS7341_CHANNEL_630nm_F7);
  $f680 = $as.getChannel(AS7341_CHANNEL_680nm_F8);
  $nir = $as.getChannel(AS7341_CHANNEL_NIR);
}`,
    outs: [{ k: 'f415', l: '415 nm (violet)' }, { k: 'f480', l: '480 nm (bleu)' }, { k: 'f555', l: '555 nm (vert)' }, { k: 'f630', l: '630 nm (orange)' }, { k: 'f680', l: '680 nm (rouge)' }, { k: 'nir', l: 'Proche IR' }]
  });
  add({
    id: 'flame', key: 'flame', name: 'Détecteur de flamme IR (KY-026)', tags: ['flamme', 'feu', 'infrarouge', 'sécurité'],
    desc: 'Photodiode infrarouge 760-1100 nm : détecte une flamme à ~80 cm (sortie seuil + analogique).',
    pins: [{ role: 'DO', type: 'in', label: 'DO' }, { role: 'AO', type: 'adc', label: 'AO', optional: true }], period: 200,
    setup: C`pinMode({{DO}}, INPUT);`,
    loop: C`$fire = digitalRead({{DO}}) == LOW ? 1 : 0;
if ({{AO}} >= 0) $ir = 100.0f - analogReadMilliVolts({{AO}}) * 100.0f / 3300.0f;`,
    outs: [{ k: 'fire', u: '', l: 'Flamme (0/1)' }, { k: 'ir', u: '%', l: 'Intensité IR' }],
    notes: ['La lumière du soleil contient beaucoup d\'infrarouge : risque de fausse alarme près d\'une fenêtre.']
  });
  add({
    id: 'ir_receiver', key: 'irrx', name: 'Récepteur infrarouge VS1838B / TSOP38238', tags: ['infrarouge', 'télécommande', 'IR'],
    desc: 'Décode les télécommandes TV (NEC, Sony, RC5, Samsung…) : protocole, adresse et commande.',
    pins: [{ role: 'RX', type: 'in', label: 'OUT' }], libs: [X.irremote], inc: ['<IRremote.hpp>'], period: 1000, mA: 1,
    setup: C`IrReceiver.begin({{RX}}, DISABLE_LED_FEEDBACK);
Serial.println(F("# Récepteur IR prêt : appuyez sur une touche de télécommande"));`,
    tick: C`if (IrReceiver.decode()) {
  if (!(IrReceiver.decodedIRData.flags & IRDATA_FLAGS_IS_REPEAT)) {
    Serial.printf("# IR %s adresse=0x%04X commande=0x%02X\n",
                  getProtocolString(IrReceiver.decodedIRData.protocol),
                  IrReceiver.decodedIRData.address, IrReceiver.decodedIRData.command);
    $cmd = IrReceiver.decodedIRData.command;
  }
  IrReceiver.resume();
}`,
    outs: [{ k: 'cmd', u: '', l: 'Dernière commande' }]
  });
  add({
    id: 'ir_transmitter', key: 'irtx', name: 'Émetteur infrarouge (LED IR 940 nm)', tags: ['infrarouge', 'télécommande', 'IR', 'émission'], act: true,
    desc: 'Envoie des codes de télécommande NEC : pilotez une TV, une climatisation ou un ventilateur.',
    pins: [{ role: 'TX', type: 'pwm', label: 'LED IR (via transistor)', note: 'LED IR + 100 Ω, idéalement commutée par un transistor NPN' }],
    libs: [X.irremote], inc: ['<IRremote.hpp>'], period: 5000, mA: 30, difficulty: 2,
    params: { addr: { def: '0x00', label: 'Adresse NEC' }, cmd: { def: '0x40', label: 'Commande NEC' } },
    glob: C`void $send(uint8_t command) { IrSender.sendNEC({{P:addr}}, command, 0); }
void $on() { $send({{P:cmd}}); }
void $off() { $send({{P:cmd}}); }`,
    setup: C`IrSender.begin({{TX}});`,
    demo: C`$send({{P:cmd}});
Serial.printf("# IR : NEC adresse 0x%02X commande 0x%02X envoyée\n", {{P:addr}}, {{P:cmd}});`
  });
  add({
    id: 'ir_obstacle', key: 'irobs', name: 'Détecteur d\'obstacle IR (FC-51)', cat: 'distance', tags: ['obstacle', 'infrarouge', 'robot'],
    desc: 'Émetteur/récepteur IR réfléchi : détecte un obstacle de 2 à 30 cm (seuil réglable).',
    pins: [{ role: 'OUT', type: 'in', label: 'OUT' }], period: 100,
    setup: C`pinMode({{OUT}}, INPUT);`,
    loop: C`$near = digitalRead({{OUT}}) == LOW ? 1 : 0;`,
    outs: [{ k: 'near', u: '', l: 'Obstacle (0/1)' }]
  });
  add({
    id: 'tcrt5000', key: 'line', name: 'Suiveur de ligne TCRT5000', cat: 'distance', tags: ['ligne', 'robot', 'infrarouge'],
    desc: 'Capteur réflectif pour robot suiveur de ligne : distingue une ligne noire d\'un sol clair.',
    pins: [{ role: 'DO', type: 'in', label: 'D0' }, { role: 'AO', type: 'adc', label: 'A0', optional: true }], period: 50,
    setup: C`pinMode({{DO}}, INPUT);`,
    loop: C`$black = digitalRead({{DO}}) == HIGH ? 1 : 0;
if ({{AO}} >= 0) $refl = analogReadMilliVolts({{AO}}) * 100.0f / 3300.0f;`,
    outs: [{ k: 'black', u: '', l: 'Ligne noire (0/1)' }, { k: 'refl', u: '%', l: 'Réflexion' }]
  });
  add({
    id: 'ir_beam', key: 'beam', name: 'Barrière infrarouge (émetteur + récepteur)', cat: 'distance', tags: ['barrière', 'comptage', 'infrarouge'],
    desc: 'Faisceau IR coupé = passage détecté : compteur de passages, détection d\'intrusion.',
    pins: [{ role: 'RX', type: 'in_pullup', label: 'récepteur (collecteur ouvert)' }], period: 20,
    glob: C`uint32_t $count = 0;
bool $prev = false;`,
    setup: C`pinMode({{RX}}, INPUT_PULLUP);`,
    loop: C`bool broken = digitalRead({{RX}}) == HIGH;   // HIGH = faisceau coupé
if (broken && !$prev) { $count++; Serial.printf("# passage n°%lu\n", (unsigned long)$count); }
$prev = broken;
$cut = broken ? 1 : 0;
$passes = $count;`,
    outs: [{ k: 'cut', u: '', l: 'Faisceau coupé' }, { k: 'passes', u: '', l: 'Passages' }]
  });
  add({
    id: 'laser_module', key: 'laser', name: 'Module laser KY-008 (650 nm)', cat: 'act', tags: ['laser', 'lumière', 'sortie'], act: true,
    desc: 'Diode laser rouge 5 mW commandée par une broche (clignotement de démonstration).',
    pins: [{ role: 'S', type: 'out', label: 'S' }], period: 1000, mA: 30,
    glob: C`bool $state = false;
void $on() { $state = true; digitalWrite({{S}}, HIGH); }
void $off() { $state = false; digitalWrite({{S}}, LOW); }
void $toggle() { if ($state) $off(); else $on(); }`,
    setup: C`pinMode({{S}}, OUTPUT);
$off();`,
    demo: C`$toggle();`,
    notes: ['Ne jamais diriger le faisceau vers les yeux.']
  });
  add({
    id: 'laser_receiver', key: 'laserrx', name: 'Récepteur laser (module ISO203)', cat: 'distance', tags: ['laser', 'barrière', 'sécurité'],
    desc: 'Détecte la présence du faisceau laser : barrière laser d\'alarme.',
    pins: [{ role: 'OUT', type: 'in', label: 'OUT' }], period: 50,
    setup: C`pinMode({{OUT}}, INPUT);`,
    loop: C`$beam = digitalRead({{OUT}}) == HIGH ? 1 : 0;`,
    outs: [{ k: 'beam', u: '', l: 'Faisceau reçu (0/1)' }]
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* Modules « Distance & présence », « Mouvement & orientation », « Commandes » et « Santé & son ». */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const M = (LAB.MODULES = LAB.MODULES || []);
  const X = LAB.LIBS;
  const C = String.raw;
  const I2C = [{ role: 'SDA', bus: 'sda' }, { role: 'SCL', bus: 'scl' }];
  const add = (cat, m) => M.push(Object.assign({ cat, difficulty: 1, vcc: '3V3', mA: 1, period: 200 }, m));
  const DIST = { k: 'dist', u: 'cm', l: 'Distance' };
  const ACC = [{ k: 'ax', u: 'm/s²', l: 'Accél. X' }, { k: 'ay', u: 'm/s²', l: 'Accél. Y' }, { k: 'az', u: 'm/s²', l: 'Accél. Z' }];
  const GYR = [{ k: 'gx', u: '°/s', l: 'Gyro X' }, { k: 'gy', u: '°/s', l: 'Gyro Y' }, { k: 'gz', u: '°/s', l: 'Gyro Z' }];

  /* ---------------- Distance ---------------- */
  const ultrasonic = (id, name, desc, extra) => add('distance', Object.assign({
    id, key: id, name, vcc: '5V', tags: ['distance', 'ultrason', 'robot'], desc,
    pins: [{ role: 'TRIG', type: 'out', label: 'TRIG' }, { role: 'ECHO', type: 'in', label: 'ECHO', note: 'pont diviseur 1 kΩ / 2 kΩ : ECHO sort du 5 V' }],
    period: 100, mA: 15,
    glob: C`float $measure() {
  digitalWrite({{TRIG}}, LOW);
  delayMicroseconds(2);
  digitalWrite({{TRIG}}, HIGH);
  delayMicroseconds(10);
  digitalWrite({{TRIG}}, LOW);
  unsigned long us = pulseIn({{ECHO}}, HIGH, 30000UL);   // 30 ms ≈ 5 m
  return us ? us * 0.0343f / 2.0f : NAN;               // vitesse du son 343 m/s à 20 °C
}`,
    setup: C`pinMode({{TRIG}}, OUTPUT);
pinMode({{ECHO}}, INPUT);`,
    loop: C`$dist = $measure();`,
    outs: [DIST],
    level5V: 'la broche ECHO délivre 5 V : utilisez un pont diviseur (1 kΩ / 2 kΩ) ou un convertisseur de niveau.'
  }, extra));
  ultrasonic('hcsr04', 'HC-SR04 (ultrasons)', 'Télémètre à ultrasons 2-400 cm (résolution 3 mm), le grand classique des robots.');
  ultrasonic('jsn_sr04t', 'JSN-SR04T (ultrasons étanche)', 'Version étanche à sonde déportée, 25-450 cm : niveau de cuve, parking.', { period: 200 });
  ultrasonic('hcsr04p', 'HC-SR04P / RCWL-1601 (3,3 V)', 'Variante 3-5,5 V du HC-SR04 : compatible directement 3,3 V, sans pont diviseur.', { vcc: '3V3', level5V: undefined,
    pins: [{ role: 'TRIG', type: 'out', label: 'TRIG' }, { role: 'ECHO', type: 'in', label: 'ECHO' }] });
  add('distance', {
    id: 'us100', key: 'us100', name: 'US-100 (ultrasons, mode série)', uart: true, tags: ['distance', 'ultrason', 'UART', 'température'],
    desc: 'Télémètre à ultrasons avec compensation de température, lu en mode UART (cavalier en place).',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'Echo/RX' }, { role: 'TX', type: 'uart_tx', label: 'Trig/TX' }], period: 200, mA: 3, needOk: true,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});
{{SER}}.setTimeout(100);
$ok = true;`,
    loop: C`while ({{SER}}.available()) {{SER}}.read();
{{SER}}.write(0x55);                              // demande de distance
uint8_t b[2];
if ({{SER}}.readBytes(b, 2) == 2) $dist = ((b[0] << 8) | b[1]) / 10.0f;
{{SER}}.write(0x50);                              // demande de température
int t = {{SER}}.read();
delay(5);
if ({{SER}}.available()) t = {{SER}}.read();
if (t > 0) $temp = t - 45;`,
    outs: [DIST, { k: 'temp', u: '°C', l: 'Température' }]
  });
  add('distance', {
    id: 'vl53l0x', key: 'vl53l0x', name: 'VL53L0X (temps de vol laser)', bus: 'i2c', addr: ['0x29'], tags: ['distance', 'laser', 'ToF', 'I2C'],
    desc: 'Télémètre laser ToF 30-1200 mm, précis et insensible à la couleur de la cible.',
    pins: I2C.concat([{ role: 'XSHUT', type: 'out', label: 'XSHUT', optional: true, note: 'pour changer d\'adresse avec plusieurs capteurs' }]),
    libs: [X.vl53l0x], inc: ['<Adafruit_VL53L0X.h>'], needOk: true, period: 100, mA: 19,
    glob: C`Adafruit_VL53L0X $lox;`,
    setup: C`if ({{XSHUT}} >= 0) { pinMode({{XSHUT}}, OUTPUT); digitalWrite({{XSHUT}}, HIGH); delay(10); }
$ok = $lox.begin(0x29, false, &Wire);`,
    loop: C`VL53L0X_RangingMeasurementData_t m;
$lox.rangingTest(&m, false);
$dist = (m.RangeStatus != 4) ? m.RangeMilliMeter / 10.0f : NAN;   // 4 = hors de portée`,
    outs: [DIST]
  });
  add('distance', {
    id: 'vl53l1x', key: 'vl53l1x', name: 'VL53L1X (ToF longue portée)', bus: 'i2c', addr: ['0x29'], tags: ['distance', 'laser', 'ToF', 'I2C'],
    desc: 'Télémètre laser ToF jusqu\'à 4 m, mesure continue 50 Hz.',
    pins: I2C, libs: [X.vl53l1x], inc: ['<VL53L1X.h>'], needOk: true, period: 100, mA: 18,
    glob: C`VL53L1X $tof;`,
    setup: C`$tof.setBus(&Wire);
$tof.setTimeout(500);
$ok = $tof.init();
if ($ok) {
  $tof.setDistanceMode(VL53L1X::Long);
  $tof.setMeasurementTimingBudget(50000);
  $tof.startContinuous(50);
}`,
    loop: C`uint16_t mm = $tof.read(false);
if (mm && !$tof.timeoutOccurred() && $tof.ranging_data.range_status == VL53L1X::RangeValid) $dist = mm / 10.0f;`,
    outs: [DIST]
  });
  add('distance', {
    id: 'vl6180x', key: 'vl6180x', name: 'VL6180X (ToF courte portée + lux)', bus: 'i2c', addr: ['0x29'], tags: ['distance', 'ToF', 'lumière', 'I2C'],
    desc: 'Mesure de 5 à 200 mm au millimètre près, plus un capteur de lumière ambiante.',
    pins: I2C, libs: [X.vl6180x], inc: ['<Adafruit_VL6180X.h>'], needOk: true, period: 100, mA: 2,
    glob: C`Adafruit_VL6180X $vl;`,
    setup: C`$ok = $vl.begin(&Wire);`,
    loop: C`uint8_t mm = $vl.readRange();
$dist = ($vl.readRangeStatus() == VL6180X_ERROR_NONE) ? mm / 10.0f : NAN;
$lux = $vl.readLux(VL6180X_ALS_GAIN_5);`,
    outs: [DIST, { k: 'lux', u: 'lx', l: 'Lumière' }]
  });
  add('distance', {
    id: 'sharp_ir', key: 'sharp', name: 'Sharp GP2Y0A21YK0F (IR 10-80 cm)', vcc: '5V', tags: ['distance', 'infrarouge', 'analogique'],
    desc: 'Télémètre infrarouge analogique par triangulation, sortie non linéaire 0,4-3,1 V.',
    pins: [{ role: 'VO', type: 'adc', label: 'Vo (jaune)' }], period: 100, mA: 30,
    loop: C`uint32_t s = 0;
for (int i = 0; i < 16; i++) s += analogReadMilliVolts({{VO}});
float v = s / 16.0f / 1000.0f;
$dist = (v > 0.35f) ? constrain(27.86f * pow(v, -1.15f), 10.0f, 80.0f) : NAN;`,
    outs: [DIST], notes: ['Ajoutez un condensateur 10 µF sur l\'alimentation du capteur (pics de courant).']
  });
  add('distance', {
    id: 'tfmini', key: 'tfmini', name: 'Benewake TFmini / TF-Luna (LiDAR)', uart: true, vcc: '5V', tags: ['distance', 'LiDAR', 'UART'],
    desc: 'LiDAR ToF 0,2-8 m (TF-Luna) / 12 m (TFmini) à 100 Hz, trame série 9 octets.',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TX du LiDAR' }, { role: 'TX', type: 'uart_tx', label: 'RX du LiDAR' }], period: 100, mA: 70, needOk: true, difficulty: 2,
    glob: C`uint8_t $buf[9];
uint8_t $pos = 0;`,
    setup: C`{{SER}}.begin(115200, SERIAL_8N1, {{RX}}, {{TX}});
$ok = true;`,
    tick: C`while ({{SER}}.available()) {
  uint8_t c = {{SER}}.read();
  if ($pos < 2 && c != 0x59) { $pos = 0; continue; }
  $buf[$pos++] = c;
  if ($pos == 9) {
    $pos = 0;
    uint8_t sum = 0;
    for (int i = 0; i < 8; i++) sum += $buf[i];
    if (sum == $buf[8]) {
      $dist = $buf[2] | ($buf[3] << 8);
      $strength = $buf[4] | ($buf[5] << 8);
    }
  }
}`,
    outs: [DIST, { k: 'strength', u: '', l: 'Intensité du signal' }]
  });
  const presence = (id, name, desc, extra) => add('distance', Object.assign({
    id, key: id, name, tags: ['présence', 'mouvement', 'alarme'], desc,
    pins: [{ role: 'OUT', type: 'in', label: 'OUT' }], period: 100,
    glob: C`bool $last = false;`,
    setup: C`pinMode({{OUT}}, INPUT);`,
    loop: C`bool m = digitalRead({{OUT}}) == HIGH;
if (m && !$last) Serial.println(F("# mouvement détecté"));
$last = m;
$motion = m ? 1 : 0;`,
    outs: [{ k: 'motion', u: '', l: 'Présence (0/1)' }]
  }, extra));
  presence('pir_hcsr501', 'HC-SR501 (PIR infrarouge passif)', 'Détecteur de mouvement pyroélectrique 7 m / 120°, temporisation et sensibilité réglables.', { vcc: '5V', mA: 0.1,
    notes: ['Laissez 60 s de stabilisation après la mise sous tension.', 'Sortie 3,3 V : compatible directement.'] });
  presence('pir_am312', 'AM312 (mini PIR)', 'Mini détecteur PIR 3,3 V (3-5 m, 100°), idéal sur batterie.', { mA: 0.02 });
  presence('rcwl0516', 'RCWL-0516 (radar micro-ondes)', 'Radar Doppler 3,2 GHz : détecte les mouvements à 7 m, même à travers une paroi fine.', { vcc: '5V', mA: 3,
    notes: ['Traverse le plastique et le bois : ne le placez pas derrière du métal.'] });
  presence('ld2410', 'HLK-LD2410 (radar mmWave présence humaine)', 'Radar 24 GHz qui détecte une personne immobile (respiration) jusqu\'à 6 m.', { vcc: '5V', mA: 80,
    notes: ['Sortie OUT = présence ; la liaison série (256000 bauds) donne distance et énergie.'] });

  /* ---------------- Mouvement & orientation ---------------- */
  add('motion', {
    id: 'mpu6050', key: 'mpu6050', name: 'MPU-6050 (GY-521)', bus: 'i2c', addr: ['0x68', '0x69'], tags: ['accéléromètre', 'gyroscope', 'IMU', 'I2C'],
    desc: 'Centrale inertielle 6 axes : accéléromètre ±2-16 g et gyroscope ±250-2000 °/s.',
    pins: I2C, libs: [X.mpu6050, X.sensor, X.busio], inc: ['<Adafruit_MPU6050.h>'], needOk: true, period: 100, mA: 4,
    params: { addr: { def: '0x68', label: 'Adresse (AD0)', opts: ['0x68', '0x69'] } },
    glob: C`Adafruit_MPU6050 $mpu;`,
    setup: C`$ok = $mpu.begin({{P:addr}}, &Wire);
if ($ok) {
  $mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  $mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  $mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
}`,
    loop: C`sensors_event_t a, g, t;
if ($mpu.getEvent(&a, &g, &t)) {
  $ax = a.acceleration.x; $ay = a.acceleration.y; $az = a.acceleration.z;
  $gx = g.gyro.x * 57.2958f; $gy = g.gyro.y * 57.2958f; $gz = g.gyro.z * 57.2958f;
  $roll = atan2($ay, $az) * 57.2958f;
  $pitch = atan2(-$ax, sqrt($ay * $ay + $az * $az)) * 57.2958f;
}`,
    outs: ACC.concat(GYR, [{ k: 'roll', u: '°', l: 'Roulis' }, { k: 'pitch', u: '°', l: 'Tangage' }])
  });
  add('motion', {
    id: 'mpu9250', key: 'mpu9250', name: 'MPU-9250 / MPU-6500', bus: 'i2c', addr: ['0x68'], tags: ['IMU', 'accéléromètre', 'gyroscope', 'I2C', 'sans bibliothèque'],
    desc: 'IMU InvenSense lue directement par registres (accéléromètre ±4 g, gyroscope ±500 °/s).',
    pins: I2C, needOk: true, period: 100, mA: 4, difficulty: 2,
    glob: C`static const uint8_t $ADDR = 0x68;
void $wr(uint8_t reg, uint8_t v) { Wire.beginTransmission($ADDR); Wire.write(reg); Wire.write(v); Wire.endTransmission(); }
bool $read14(int16_t *v) {
  Wire.beginTransmission($ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0 || Wire.requestFrom($ADDR, (uint8_t)14) != 14) return false;
  for (int i = 0; i < 7; i++) v[i] = (int16_t)((Wire.read() << 8) | Wire.read());
  return true;
}`,
    setup: C`$wr(0x6B, 0x00);           // réveil
$wr(0x1B, 0x08);           // gyro ±500 °/s
$wr(0x1C, 0x08);           // accéléromètre ±4 g
Wire.beginTransmission($ADDR);
Wire.write(0x75);          // WHO_AM_I : 0x71 (9250), 0x70 (6500), 0x68 (6050)
Wire.endTransmission(false);
$ok = Wire.requestFrom($ADDR, (uint8_t)1) == 1;
if ($ok) Serial.printf("# WHO_AM_I = 0x%02X\n", Wire.read());`,
    loop: C`int16_t v[7];
if ($read14(v)) {
  $ax = v[0] / 8192.0f * 9.80665f; $ay = v[1] / 8192.0f * 9.80665f; $az = v[2] / 8192.0f * 9.80665f;
  $temp = v[3] / 333.87f + 21.0f;
  $gx = v[4] / 65.5f; $gy = v[5] / 65.5f; $gz = v[6] / 65.5f;
}`,
    outs: ACC.concat(GYR, [{ k: 'temp', u: '°C', l: 'Température puce' }])
  });
  add('motion', {
    id: 'adxl345', key: 'adxl345', name: 'ADXL345 (GY-291)', bus: 'i2c', addr: ['0x53', '0x1D'], tags: ['accéléromètre', 'chute', 'vibration', 'I2C'],
    desc: 'Accéléromètre 3 axes ±2 à ±16 g, détection de chute libre et de tapotement.',
    pins: I2C, libs: [X.adxl345, X.sensor], inc: ['<Adafruit_ADXL345_U.h>'], needOk: true, period: 100,
    glob: C`Adafruit_ADXL345_Unified $adxl(12345);`,
    setup: C`$ok = $adxl.begin(0x53);
if ($ok) $adxl.setRange(ADXL345_RANGE_16_G);`,
    loop: C`sensors_event_t e;
if ($adxl.getEvent(&e)) { $ax = e.acceleration.x; $ay = e.acceleration.y; $az = e.acceleration.z; }`,
    outs: ACC
  });
  add('motion', {
    id: 'lis3dh', key: 'lis3dh', name: 'LIS3DH', bus: 'i2c', addr: ['0x18', '0x19'], tags: ['accéléromètre', 'I2C', 'basse consommation'],
    desc: 'Accéléromètre ST ±2-16 g très basse consommation, avec détection de clic.',
    pins: I2C, libs: [X.lis3dh, X.sensor, X.busio], inc: ['<Adafruit_LIS3DH.h>'], needOk: true, period: 100,
    glob: C`Adafruit_LIS3DH $lis(&Wire);`,
    setup: C`$ok = $lis.begin(0x18);
if ($ok) $lis.setRange(LIS3DH_RANGE_4_G);`,
    loop: C`sensors_event_t e;
if ($lis.getEvent(&e)) { $ax = e.acceleration.x; $ay = e.acceleration.y; $az = e.acceleration.z; }`,
    outs: ACC
  });
  add('motion', {
    id: 'lsm6ds3', key: 'lsm6ds3', name: 'LSM6DS3TR-C', bus: 'i2c', addr: ['0x6A', '0x6B'], tags: ['IMU', 'accéléromètre', 'gyroscope', 'I2C'],
    desc: 'IMU 6 axes ST : accéléromètre et gyroscope avec podomètre matériel.',
    pins: I2C, libs: [X.lsm6ds, X.sensor, X.busio], inc: ['<Adafruit_LSM6DS3TRC.h>'], needOk: true, period: 100,
    params: { addr: { def: '0x6A', label: 'Adresse I2C', opts: ['0x6A', '0x6B'] } },
    glob: C`Adafruit_LSM6DS3TRC $imu;`,
    setup: C`$ok = $imu.begin_I2C({{P:addr}}, &Wire);`,
    loop: C`sensors_event_t a, g, t;
if ($imu.getEvent(&a, &g, &t)) {
  $ax = a.acceleration.x; $ay = a.acceleration.y; $az = a.acceleration.z;
  $gx = g.gyro.x * 57.2958f; $gy = g.gyro.y * 57.2958f; $gz = g.gyro.z * 57.2958f;
}`,
    outs: ACC.concat(GYR)
  });
  add('motion', {
    id: 'bno055', key: 'bno055', name: 'BNO055 (orientation absolue 9 axes)', bus: 'i2c', addr: ['0x28', '0x29'], tags: ['IMU', 'orientation', 'fusion', 'I2C'],
    desc: 'IMU Bosch avec fusion de capteurs intégrée : cap, roulis et tangage directement en degrés.',
    pins: I2C, libs: [X.bno055, X.sensor], inc: ['<Adafruit_BNO055.h>'], needOk: true, period: 100, mA: 12, difficulty: 2,
    glob: C`Adafruit_BNO055 $bno(55, 0x28, &Wire);`,
    setup: C`$ok = $bno.begin();
if ($ok) $bno.setExtCrystalUse(true);`,
    loop: C`sensors_event_t e;
$bno.getEvent(&e);
$heading = e.orientation.x;
$roll = e.orientation.y;
$pitch = e.orientation.z;
uint8_t sys, gyr, acc, mag;
$bno.getCalibration(&sys, &gyr, &acc, &mag);
$calib = sys;`,
    outs: [{ k: 'heading', u: '°', l: 'Cap' }, { k: 'roll', u: '°', l: 'Roulis' }, { k: 'pitch', u: '°', l: 'Tangage' }, { k: 'calib', u: '', l: 'Étalonnage (0-3)' }],
    notes: ['Bougez le capteur en 8 pour étalonner le magnétomètre (calib = 3).', 'Le BNO055 étire l\'horloge I2C : évitez les bus à 400 kHz.']
  });
  add('motion', {
    id: 'hmc5883l', key: 'hmc5883', name: 'HMC5883L (boussole GY-273)', bus: 'i2c', addr: ['0x1E'], tags: ['boussole', 'magnétomètre', 'I2C'],
    desc: 'Magnétomètre 3 axes : cap magnétique en degrés (module d\'origine Honeywell).',
    pins: I2C, libs: [X.hmc5883, X.sensor], inc: ['<Adafruit_HMC5883_U.h>'], needOk: true, period: 200,
    params: { decl: { def: '0.0', label: 'Déclinaison magnétique locale (°)' } },
    glob: C`Adafruit_HMC5883_Unified $mag(12345);`,
    setup: C`$ok = $mag.begin();`,
    loop: C`sensors_event_t e;
$mag.getEvent(&e);
float h = atan2(e.magnetic.y, e.magnetic.x) * 57.2958f + {{P:decl}};
if (h < 0) h += 360;
if (h >= 360) h -= 360;
$heading = h;`,
    outs: [{ k: 'heading', u: '°', l: 'Cap magnétique' }],
    notes: ['La plupart des modules GY-273 récents contiennent un QMC5883L (adresse 0x0D) : utilisez alors le module QMC5883L.']
  });
  add('motion', {
    id: 'qmc5883l', key: 'qmc5883', name: 'QMC5883L (boussole GY-273 récente)', bus: 'i2c', addr: ['0x0D'], tags: ['boussole', 'magnétomètre', 'I2C', 'sans bibliothèque'],
    desc: 'Magnétomètre 3 axes QST, piloté directement par registres.',
    pins: I2C, needOk: true, period: 200,
    params: { decl: { def: '0.0', label: 'Déclinaison magnétique (°)' } },
    glob: C`static const uint8_t $ADDR = 0x0D;
void $wr(uint8_t r, uint8_t v) { Wire.beginTransmission($ADDR); Wire.write(r); Wire.write(v); Wire.endTransmission(); }`,
    setup: C`$wr(0x0B, 0x01);            // SET/RESET period
$wr(0x09, 0x1D);            // continu, 200 Hz, 8 G, OSR 512
Wire.beginTransmission($ADDR);
$ok = Wire.endTransmission() == 0;`,
    loop: C`Wire.beginTransmission($ADDR);
Wire.write(0x00);
if (Wire.endTransmission(false) == 0 && Wire.requestFrom($ADDR, (uint8_t)6) == 6) {
  int16_t x = Wire.read() | (Wire.read() << 8);
  int16_t y = Wire.read() | (Wire.read() << 8);
  int16_t z = Wire.read() | (Wire.read() << 8);
  (void)z;
  float h = atan2((float)y, (float)x) * 57.2958f + {{P:decl}};
  if (h < 0) h += 360;
  if (h >= 360) h -= 360;
  $heading = h;
}`,
    outs: [{ k: 'heading', u: '°', l: 'Cap magnétique' }]
  });
  add('motion', {
    id: 'adxl335', key: 'adxl335', name: 'ADXL335 (accéléromètre analogique)', tags: ['accéléromètre', 'analogique', 'inclinaison'],
    desc: 'Accéléromètre ±3 g à trois sorties analogiques (330 mV/g, zéro à 1,65 V).',
    pins: [{ role: 'X', type: 'adc', label: 'X' }, { role: 'Y', type: 'adc', label: 'Y' }, { role: 'Z', type: 'adc', label: 'Z' }], period: 100,
    glob: C`float $g(int pin) { return (analogReadMilliVolts(pin) - 1650.0f) / 330.0f; }`,
    loop: C`$gx = $g({{X}});
$gy = $g({{Y}});
$gz = $g({{Z}});`,
    outs: [{ k: 'gx', u: 'g', l: 'X' }, { k: 'gy', u: 'g', l: 'Y' }, { k: 'gz', u: 'g', l: 'Z' }]
  });
  add('motion', {
    id: 'as5600', key: 'as5600', name: 'AS5600 (codeur magnétique 12 bits)', bus: 'i2c', addr: ['0x36'], tags: ['angle', 'codeur', 'magnétique', 'I2C'],
    desc: 'Mesure l\'angle absolu d\'un aimant diamétral (0-360°, 4096 pas) sans contact.',
    pins: I2C, libs: [X.as5600], inc: ['<AS5600.h>'], needOk: true, period: 50,
    glob: C`AS5600 $enc(&Wire);`,
    setup: C`$ok = $enc.begin() && $enc.isConnected();`,
    loop: C`$angle = $enc.rawAngle() * AS5600_RAW_TO_DEGREES;
$magnet = $enc.magnetDetected() ? 1 : 0;`,
    outs: [{ k: 'angle', u: '°', l: 'Angle' }, { k: 'magnet', u: '', l: 'Aimant détecté' }]
  });
  add('motion', {
    id: 'hall_a3144', key: 'hall', name: 'Capteur à effet Hall A3144 (KY-003)', tags: ['magnétique', 'Hall', 'vitesse', 'numérique'],
    desc: 'Interrupteur magnétique : détecte le pôle sud d\'un aimant (compte-tours, fin de course).',
    pins: [{ role: 'OUT', type: 'in_pullup', label: 'S (collecteur ouvert)' }], period: 50,
    glob: C`volatile uint32_t $count = 0;
void IRAM_ATTR $isr() { $count = $count + 1; }`,
    setup: C`pinMode({{OUT}}, INPUT_PULLUP);
attachInterrupt(digitalPinToInterrupt({{OUT}}), $isr, FALLING);`,
    loop: C`$magnet = digitalRead({{OUT}}) == LOW ? 1 : 0;
$pulses = $count;`,
    outs: [{ k: 'magnet', u: '', l: 'Aimant (0/1)' }, { k: 'pulses', u: '', l: 'Impulsions' }]
  });
  add('motion', {
    id: 'hall_49e', key: 'hall49e', name: 'Capteur Hall linéaire SS49E (KY-035)', tags: ['magnétique', 'Hall', 'analogique'],
    desc: 'Sortie analogique proportionnelle au champ magnétique (±1000 G, 1,4 mV/G).',
    pins: [{ role: 'AO', type: 'adc', label: 'S' }], period: 100,
    loop: C`float mv = analogReadMilliVolts({{AO}});
$field = (mv - 1650.0f) / 1.4f;   // point zéro à VCC/2 en 3,3 V`,
    outs: [{ k: 'field', u: 'G', l: 'Champ' }]
  });
  const contact = (id, name, desc, tags, extra) => add('motion', Object.assign({
    id, key: id, name, tags, desc,
    pins: [{ role: 'IN', type: 'in_pullup', label: 'signal', note: 'l\'autre borne vers GND' }], period: 50,
    glob: C`bool $prev = false;
uint32_t $events = 0;`,
    setup: C`pinMode({{IN}}, INPUT_PULLUP);`,
    loop: C`bool on = digitalRead({{IN}}) == LOW;
if (on && !$prev) { $events++; Serial.printf("# ${name} : déclenché (%lu)\n", (unsigned long)$events); }
$prev = on;
$state = on ? 1 : 0;
$count = $events;`,
    outs: [{ k: 'state', u: '', l: 'État (0/1)' }, { k: 'count', u: '', l: 'Déclenchements' }]
  }, extra));
  contact('reed', 'Contact reed (ILS)', 'Interrupteur à lame souple : ouverture de porte/fenêtre, compteur à aimant.', ['magnétique', 'porte', 'alarme']);
  contact('tilt_sw520', 'Capteur d\'inclinaison SW-520D', 'Bille métallique qui ferme le contact au-delà d\'environ 45°.', ['inclinaison', 'bille']);
  contact('vibration_sw420', 'Capteur de vibration SW-420', 'Module à ressort + comparateur : chocs et vibrations (antivol, machine).', ['vibration', 'choc', 'alarme'],
    { pins: [{ role: 'IN', type: 'in', label: 'DO' }], setup: C`pinMode({{IN}}, INPUT);`,
      loop: C`bool on = digitalRead({{IN}}) == HIGH;
if (on && !$prev) { $events++; Serial.printf("# vibration (%lu)\n", (unsigned long)$events); }
$prev = on;
$state = on ? 1 : 0;
$count = $events;` });
  contact('limit_switch', 'Fin de course mécanique', 'Micro-rupteur à levier : butée d\'axe, détection de porte, imprimante 3D.', ['fin de course', 'micro-rupteur']);
  add('motion', {
    id: 'piezo_knock', key: 'knock', name: 'Capteur de choc piézo', tags: ['piézo', 'choc', 'analogique'],
    desc: 'Disque piézoélectrique : détecte un toc sur une table ou une porte (serrure à code « knock »).',
    pins: [{ role: 'AO', type: 'adc', label: '+', note: 'résistance 1 MΩ en parallèle du piézo' }], period: 5,
    params: { th: { def: '300', label: 'Seuil (mV)' } },
    glob: C`uint32_t $knocks = 0;
uint32_t $lastKnock = 0;`,
    loop: C`int mv = analogReadMilliVolts({{AO}});
if (mv > {{P:th}} && millis() - $lastKnock > 120) {
  $lastKnock = millis();
  $knocks++;
  $peak = mv;
  Serial.printf("# toc ! (%d mV)\n", mv);
}
$count = $knocks;`,
    print: 'change',
    outs: [{ k: 'count', u: '', l: 'Tocs' }, { k: 'peak', u: 'mV', l: 'Amplitude' }]
  });
  
  /* ---------------- Commandes & entrées ---------------- */
  add('input', {
    id: 'button', key: 'btn', name: 'Bouton-poussoir (anti-rebond)', tags: ['bouton', 'débutant', 'entrée'],
    desc: 'Bouton avec tirage interne et anti-rebond logiciel : appui court, compteur et appui long.',
    pins: [{ role: 'BTN', type: 'in_pullup', label: 'borne 1', note: 'borne 2 vers GND' }], period: 10,
    glob: C`bool $stable = false, $raw = false;
uint32_t $changed = 0, $pressedAt = 0, $presses = 0;`,
    setup: C`pinMode({{BTN}}, INPUT_PULLUP);`,
    loop: C`bool r = digitalRead({{BTN}}) == LOW;
if (r != $raw) { $raw = r; $changed = millis(); }
if (millis() - $changed > 30 && $stable != $raw) {
  $stable = $raw;
  if ($stable) { $pressedAt = millis(); $presses++; }
  else {
    uint32_t d = millis() - $pressedAt;
    Serial.printf("# bouton : %s (%lu ms)\n", d > 800 ? "appui long" : "appui court", (unsigned long)d);
  }
}
$pressed = $stable ? 1 : 0;
$count = $presses;`,
    outs: [{ k: 'pressed', u: '', l: 'Appuyé (0/1)' }, { k: 'count', u: '', l: 'Appuis' }]
  });
  M[M.length - 1].print = 'change';
  add('input', {
    id: 'ttp223', key: 'touch', name: 'Bouton tactile capacitif TTP223', tags: ['tactile', 'bouton', 'capacitif'],
    desc: 'Touche sensitive : fonctionne à travers 2-3 mm de plastique ou de verre.',
    pins: [{ role: 'SIG', type: 'in', label: 'SIG' }], period: 20,
    glob: C`bool $prev = false;
uint32_t $n = 0;`,
    setup: C`pinMode({{SIG}}, INPUT);`,
    loop: C`bool t = digitalRead({{SIG}}) == HIGH;
if (t && !$prev) { $n++; Serial.println(F("# touché")); }
$prev = t;
$touched = t ? 1 : 0;
$count = $n;`,
    outs: [{ k: 'touched', u: '', l: 'Touché (0/1)' }, { k: 'count', u: '', l: 'Touchers' }]
  });
  add('input', {
    id: 'esp_touch', key: 'etouch', name: 'Touche capacitive intégrée ESP32', boards: ['esp32', 'esp32s3'], tags: ['tactile', 'capacitif', 'sans composant'],
    desc: 'Un simple fil ou une pastille de cuivre sur une broche TOUCH devient un bouton tactile.',
    pins: [{ role: 'T', type: 'touch', label: 'pastille / fil' }], period: 50,
    glob: C`uint32_t $base = 0;`,
    setup: C`uint32_t s = 0;
for (int i = 0; i < 16; i++) { s += touchRead({{T}}); delay(10); }
$base = s / 16;                                   // valeur au repos (étalonnage)
Serial.printf("# touche : référence = %lu\n", (unsigned long)$base);`,
    loop: C`uint32_t v = touchRead({{T}});
$raw = v;
long delta = (long)v - (long)$base;
$touched = (labs(delta) > (long)($base / 5)) ? 1 : 0;   // variation > 20 % (baisse sur ESP32, hausse sur S3)`,
    outs: [{ k: 'touched', u: '', l: 'Touché (0/1)' }, { k: 'raw', u: '', l: 'Valeur brute' }]
  });
  add('input', {
    id: 'potentiometer', key: 'pot', name: 'Potentiomètre 10 kΩ', tags: ['potentiomètre', 'analogique', 'débutant'],
    desc: 'Réglage manuel : position de 0 à 100 % (curseur sur une entrée ADC).',
    pins: [{ role: 'W', type: 'adc', label: 'curseur (broche du milieu)', note: 'extrémités sur 3V3 et GND' }], period: 100,
    loop: C`uint32_t s = 0;
for (int i = 0; i < 8; i++) s += analogReadMilliVolts({{W}});
$pos = constrain((s / 8.0f) * 100.0f / 3200.0f, 0.0f, 100.0f);`,
    outs: [{ k: 'pos', u: '%', l: 'Position' }]
  });
  add('input', {
    id: 'joystick', key: 'joy', name: 'Joystick analogique KY-023', tags: ['joystick', 'analogique', 'manette'],
    desc: 'Deux axes analogiques et un bouton poussoir (clic central).',
    pins: [{ role: 'VRX', type: 'adc', label: 'VRx' }, { role: 'VRY', type: 'adc', label: 'VRy' }, { role: 'SW', type: 'in_pullup', label: 'SW' }], period: 50,
    glob: C`float $axis(int pin) { return constrain((analogReadMilliVolts(pin) - 1650.0f) / 16.5f, -100.0f, 100.0f); }`,
    setup: C`pinMode({{SW}}, INPUT_PULLUP);`,
    loop: C`$x = $axis({{VRX}});
$y = $axis({{VRY}});
$click = digitalRead({{SW}}) == LOW ? 1 : 0;`,
    outs: [{ k: 'x', u: '%', l: 'Axe X' }, { k: 'y', u: '%', l: 'Axe Y' }, { k: 'click', u: '', l: 'Clic' }],
    notes: ['Alimentez le joystick en 3V3 (pas en 5 V) pour rester dans la plage de l\'ADC.']
  });
  add('input', {
    id: 'rotary_encoder', key: 'enc', name: 'Codeur rotatif KY-040', tags: ['codeur', 'bouton rotatif', 'interruption'],
    desc: 'Bouton rotatif à 20 crans avec poussoir : lecture par interruptions en quadrature.',
    pins: [{ role: 'CLK', type: 'in_pullup', label: 'CLK' }, { role: 'DT', type: 'in_pullup', label: 'DT' }, { role: 'SW', type: 'in_pullup', label: 'SW' }], period: 50,
    glob: C`volatile long $steps = 0;
volatile uint8_t $state = 0;
void IRAM_ATTR $isr() {
  static const int8_t table[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0};
  $state = (($state << 2) | (digitalRead({{CLK}}) << 1) | digitalRead({{DT}})) & 0x0F;
  $steps = $steps + table[$state];
}`,
    setup: C`pinMode({{CLK}}, INPUT_PULLUP);
pinMode({{DT}}, INPUT_PULLUP);
pinMode({{SW}}, INPUT_PULLUP);
attachInterrupt(digitalPinToInterrupt({{CLK}}), $isr, CHANGE);
attachInterrupt(digitalPinToInterrupt({{DT}}), $isr, CHANGE);`,
    loop: C`noInterrupts();
long s = $steps;
interrupts();
$pos = s / 4;          // 4 transitions par cran
$click = digitalRead({{SW}}) == LOW ? 1 : 0;`,
    outs: [{ k: 'pos', u: 'crans', l: 'Position' }, { k: 'click', u: '', l: 'Bouton' }]
  });
  const keypad = (id, name, rows, cols, map) => add('input', {
    id, key: id, name, tags: ['clavier', 'matrice', 'code'],
    desc: `Clavier matriciel ${rows}×${cols} : saisie de code PIN, menu, calculatrice.`,
    pins: [...Array(rows).keys()].map((i) => ({ role: 'R' + (i + 1), type: 'in_pullup', label: 'ligne ' + (i + 1) }))
      .concat([...Array(cols).keys()].map((i) => ({ role: 'C' + (i + 1), type: 'out', label: 'colonne ' + (i + 1) }))),
    libs: [X.keypad], inc: ['<Keypad.h>'], period: 1000,
    glob: C`char $keys[${rows}][${cols}] = {${map}};
byte $rowPins[${rows}] = {${[...Array(rows).keys()].map((i) => '{{R' + (i + 1) + '}}').join(', ')}};
byte $colPins[${cols}] = {${[...Array(cols).keys()].map((i) => '{{C' + (i + 1) + '}}').join(', ')}};
Keypad $pad = Keypad(makeKeymap($keys), $rowPins, $colPins, ${rows}, ${cols});
String $code = "";`,
    tick: C`char k = $pad.getKey();
if (k) {
  if (k == '#') { Serial.printf("# code saisi : %s\n", $code.c_str()); $code = ""; }
  else if (k == '*') { $code = ""; Serial.println(F("# effacé")); }
  else { $code += k; Serial.printf("# touche %c\n", k); }
}`
  });
  keypad('keypad4x4', 'Clavier matriciel 4×4', 4, 4, "{'1','2','3','A'},{'4','5','6','B'},{'7','8','9','C'},{'*','0','#','D'}");
  keypad('keypad3x4', 'Clavier matriciel 3×4 (téléphone)', 4, 3, "{'1','2','3'},{'4','5','6'},{'7','8','9'},{'*','0','#'}");
  add('input', {
    id: 'mpr121', key: 'mpr121', name: 'MPR121 (12 touches capacitives)', bus: 'i2c', addr: ['0x5A', '0x5B', '0x5C', '0x5D'], tags: ['tactile', 'capacitif', 'piano', 'I2C'],
    desc: '12 électrodes tactiles : piano en fruits, panneau de commande, jeu interactif.',
    pins: I2C, libs: [X.mpr121, X.busio], inc: ['<Adafruit_MPR121.h>'], needOk: true, period: 30,
    glob: C`Adafruit_MPR121 $cap;
uint16_t $last = 0;`,
    setup: C`$ok = $cap.begin(0x5A, &Wire);`,
    loop: C`uint16_t t = $cap.touched();
for (uint8_t i = 0; i < 12; i++) {
  if ((t & (1 << i)) && !($last & (1 << i))) Serial.printf("# électrode %u touchée\n", i);
}
$last = t;
$mask = t;`,
    outs: [{ k: 'mask', u: '', l: 'Masque des touches' }]
  });
  add('motion', {
    id: 'flex', key: 'flex', name: 'Capteur de flexion (flex sensor 2,2")', tags: ['flexion', 'gant', 'analogique'],
    desc: 'Résistance variable 25-100 kΩ selon la courbure : gant de commande, robotique.',
    pins: [{ role: 'AO', type: 'adc', label: 'point milieu', note: 'flex entre 3V3 et le point milieu, 47 kΩ vers GND' }], period: 100,
    params: { straight: { def: '1400', label: 'Tension à plat (mV)' }, bent: { def: '800', label: 'Tension pliée à 90° (mV)' } },
    loop: C`float mv = analogReadMilliVolts({{AO}});
$bend = constrain(90.0f * ({{P:straight}} - mv) / ({{P:straight}} - {{P:bent}}), 0.0f, 180.0f);`,
    outs: [{ k: 'bend', u: '°', l: 'Flexion' }]
  });
  add('motion', {
    id: 'fsr402', key: 'fsr', name: 'Capteur de force FSR402', tags: ['force', 'pression', 'analogique'],
    desc: 'Résistance sensible à la force (0,2-20 N) : détection d\'appui, pèse-lettre approximatif.',
    pins: [{ role: 'AO', type: 'adc', label: 'point milieu', note: 'FSR entre 3V3 et le point milieu, 10 kΩ vers GND' }], period: 100,
    loop: C`float mv = analogReadMilliVolts({{AO}});
$press = mv * 100.0f / 3300.0f;
if (mv > 20) {
  float r = 10000.0f * (3300.0f - mv) / mv;       // résistance du FSR (Ω)
  $force = 1.0f / (r / 1000.0f) * 10.0f;          // approximation Interlink (N)
} else {
  $force = 0;
}`,
    outs: [{ k: 'press', u: '%', l: 'Appui' }, { k: 'force', u: 'N', l: 'Force (approx.)' }]
  });
  add('motion', {
    id: 'hx711', key: 'scale', name: 'Balance HX711 + cellule de charge', tags: ['poids', 'balance', 'jauge de contrainte'],
    desc: 'Convertisseur 24 bits pour cellule de charge : balance de cuisine, ruche connectée, niveau de réservoir.',
    pins: [{ role: 'DOUT', type: 'in', label: 'DT' }, { role: 'SCK', type: 'out', label: 'SCK' }], libs: [X.hx711], inc: ['<HX711.h>'], period: 500, mA: 1.5, difficulty: 2,
    params: { cal: { def: '420.0', label: 'Facteur d\'étalonnage' } },
    glob: C`HX711 $hx;`,
    setup: C`$hx.begin({{DOUT}}, {{SCK}});
$hx.set_scale({{P:cal}});
$hx.tare();          // tare au démarrage : plateau vide !
Serial.println(F("# balance : tare effectuée"));`,
    loop: C`if ($hx.is_ready()) $weight = $hx.get_units(5);`,
    outs: [{ k: 'weight', u: 'g', l: 'Poids' }],
    notes: ['Étalonnage : posez une masse connue et ajustez « cal » = lecture brute / masse.']
  });

  /* ---------------- Santé, son & biométrie ---------------- */
  add('bio', {
    id: 'pulse_sensor', key: 'pulse', name: 'Capteur de pouls (Pulse Sensor)', tags: ['pouls', 'cœur', 'santé', 'analogique'],
    desc: 'Capteur optique au bout du doigt : détection des battements et fréquence cardiaque (BPM).',
    pins: [{ role: 'AO', type: 'adc', label: 'S (violet)' }], period: 10, mA: 4, print: 'always',
    glob: C`int $th = 1900;
bool $above = false;
uint32_t $lastBeat = 0;
float $bpmAvg = 0;`,
    loop: C`int mv = analogReadMilliVolts({{AO}});
$signal = mv;
if (!$above && mv > $th) {
  $above = true;
  uint32_t now2 = millis();
  uint32_t ibi = now2 - $lastBeat;
  $lastBeat = now2;
  if (ibi > 300 && ibi < 2000) {
    float b = 60000.0f / ibi;
    $bpmAvg = $bpmAvg ? $bpmAvg * 0.8f + b * 0.2f : b;
    $bpm = $bpmAvg;
  }
} else if ($above && mv < $th - 100) {
  $above = false;
}`,
    outs: [{ k: 'signal', u: 'mV', l: 'Signal' }, { k: 'bpm', u: 'BPM', l: 'Fréquence cardiaque' }],
    notes: ['Réglez le seuil `th` selon l\'amplitude de votre signal (traceur série).', 'Usage pédagogique uniquement, pas de diagnostic médical.']
  });
  add('bio', {
    id: 'max30102', key: 'max30102', name: 'MAX30102 (pouls & SpO₂)', bus: 'i2c', addr: ['0x57'], tags: ['pouls', 'oxymètre', 'santé', 'I2C'],
    desc: 'Capteur optique rouge + infrarouge : fréquence cardiaque et présence du doigt.',
    pins: I2C, libs: [X.max3010x], inc: ['<MAX30105.h>', '<heartRate.h>'], needOk: true, period: 10, mA: 5, difficulty: 2,
    glob: C`MAX30105 $ps;
uint32_t $lastBeat = 0;
float $avg = 0;`,
    setup: C`$ok = $ps.begin(Wire, I2C_SPEED_FAST);
if ($ok) { $ps.setup(); $ps.setPulseAmplitudeRed(0x0A); $ps.setPulseAmplitudeGreen(0); }`,
    loop: C`long ir = $ps.getIR();
$finger = ir > 50000 ? 1 : 0;
if (checkForBeat(ir)) {
  uint32_t delta = millis() - $lastBeat;
  $lastBeat = millis();
  float b = 60000.0f / delta;
  if (b > 30 && b < 220) { $avg = $avg ? $avg * 0.75f + b * 0.25f : b; $bpm = $avg; }
}`,
    outs: [{ k: 'bpm', u: 'BPM', l: 'Fréquence cardiaque' }, { k: 'finger', u: '', l: 'Doigt posé' }],
    notes: ['Beaucoup de modules violets ont une erreur de régulateur 1,8 V : vérifiez la tension sur SDA/SCL (doit être 3,3 V).']
  });
  M[M.length - 1].print = 'change';
  add('bio', {
    id: 'ad8232', key: 'ecg', name: 'AD8232 (électrocardiogramme)', tags: ['ECG', 'cœur', 'santé', 'analogique'],
    desc: 'Frontal ECG une dérivation : visualisez le tracé cardiaque dans le traceur série.',
    pins: [{ role: 'OUT', type: 'adc', label: 'OUTPUT' }, { role: 'LOP', type: 'in', label: 'LO+' }, { role: 'LOM', type: 'in', label: 'LO-' }], period: 5, mA: 0.2, difficulty: 2, print: 'always',
    setup: C`pinMode({{LOP}}, INPUT);
pinMode({{LOM}}, INPUT);`,
    loop: C`if (digitalRead({{LOP}}) || digitalRead({{LOM}})) $ecg = NAN;   // électrode décollée
else $ecg = analogReadMilliVolts({{OUT}});`,
    outs: [{ k: 'ecg', u: 'mV', l: 'ECG' }],
    notes: ['Jamais relié au secteur pendant la mesure (PC sur batterie ou isolation USB).', 'Usage pédagogique uniquement.']
  });
  add('bio', {
    id: 'gsr', key: 'gsr', name: 'Capteur GSR (conductance cutanée)', tags: ['stress', 'peau', 'santé', 'analogique'],
    desc: 'Mesure la réponse électrodermale (sudation) : émotion, stress, détecteur de mensonge ludique.',
    pins: [{ role: 'AO', type: 'adc', label: 'SIG' }], period: 100,
    loop: C`uint32_t s = 0;
for (int i = 0; i < 10; i++) s += analogReadMilliVolts({{AO}});
$gsr = s / 10.0f;`,
    outs: [{ k: 'gsr', u: 'mV', l: 'GSR' }]
  });
  add('bio', {
    id: 'sound_ky038', key: 'sound', name: 'Capteur de son KY-038 / LM393', tags: ['son', 'micro', 'claquement'],
    desc: 'Micro électret + comparateur : détection de bruit / claquement de mains (seuil réglable).',
    pins: [{ role: 'DO', type: 'in', label: 'DO' }, { role: 'AO', type: 'adc', label: 'AO', optional: true }], period: 20,
    glob: C`uint32_t $claps = 0;
bool $prev = false;`,
    setup: C`pinMode({{DO}}, INPUT);`,
    loop: C`bool loud = digitalRead({{DO}}) == HIGH;
if (loud && !$prev) { $claps++; Serial.println(F("# bruit détecté")); }
$prev = loud;
$loud = loud ? 1 : 0;
$count = $claps;
if ({{AO}} >= 0) $level = analogReadMilliVolts({{AO}});`,
    outs: [{ k: 'loud', u: '', l: 'Bruit (0/1)' }, { k: 'count', u: '', l: 'Détections' }, { k: 'level', u: 'mV', l: 'Niveau' }]
  });
  add('bio', {
    id: 'max4466', key: 'mic', name: 'Microphone MAX4466 / MAX9814', tags: ['son', 'micro', 'niveau sonore', 'analogique'],
    desc: 'Micro électret amplifié : niveau sonore crête-à-crête et estimation en dB relatifs.',
    pins: [{ role: 'AO', type: 'adc', label: 'OUT' }], period: 100,
    loop: C`int mn = 4095, mx = 0;
uint32_t t0 = millis();
while (millis() - t0 < 50) {                 // fenêtre de 50 ms
  int v = analogReadMilliVolts({{AO}});
  if (v < mn) mn = v;
  if (v > mx) mx = v;
}
$pp = mx - mn;
$db = 20.0f * log10(max(1, mx - mn));`,
    outs: [{ k: 'pp', u: 'mV', l: 'Crête-à-crête' }, { k: 'db', u: 'dB', l: 'Niveau relatif' }]
  });
  add('bio', {
    id: 'inmp441', key: 'inmp441', name: 'INMP441 (micro numérique I2S)', tags: ['son', 'micro', 'I2S', 'audio'],
    desc: 'Microphone MEMS numérique 24 bits : niveau sonore RMS, base pour reconnaissance audio.',
    pins: [{ role: 'SCK', type: 'i2s', label: 'SCK' }, { role: 'WS', type: 'i2s', label: 'WS' }, { role: 'SD', type: 'in', label: 'SD' }],
    inc: ['<ESP_I2S.h>'], period: 100, mA: 1.5, difficulty: 3, needOk: true,
    extraWiring: [{ pin: 'L/R', to: 'GND', note: 'canal gauche' }],
    glob: C`I2SClass $i2s;`,
    setup: C`$i2s.setPins({{SCK}}, {{WS}}, -1, {{SD}});
$ok = $i2s.begin(I2S_MODE_STD, 16000, I2S_DATA_BIT_WIDTH_32BIT, I2S_SLOT_MODE_MONO, I2S_STD_SLOT_LEFT);`,
    loop: C`int32_t buf[256];
size_t n = $i2s.readBytes((char *)buf, sizeof(buf)) / sizeof(int32_t);
double sum = 0;
for (size_t i = 0; i < n; i++) { double s = (buf[i] >> 8) / 8388608.0; sum += s * s; }
if (n) $dbfs = 20.0f * log10(sqrt(sum / n) + 1e-9);`,
    outs: [{ k: 'dbfs', u: 'dBFS', l: 'Niveau RMS' }]
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* Modules « Courant, tension & énergie ». */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const M = (LAB.MODULES = LAB.MODULES || []);
  const X = LAB.LIBS;
  const C = String.raw;
  const I2C = [{ role: 'SDA', bus: 'sda' }, { role: 'SCL', bus: 'scl' }];
  const add = (m) => M.push(Object.assign({ cat: 'power', difficulty: 1, vcc: '3V3', mA: 1, period: 1000 }, m));
  const V = { k: 'volt', u: 'V', l: 'Tension' };
  const I = { k: 'curr', u: 'mA', l: 'Courant' };
  const W = { k: 'power', u: 'mW', l: 'Puissance' };

  add({
    id: 'ina219', key: 'ina219', name: 'INA219 (tension/courant/puissance)', bus: 'i2c', addr: ['0x40', '0x41', '0x44', '0x45'], tags: ['courant', 'tension', 'puissance', 'batterie', 'I2C'],
    desc: 'Wattmètre continu jusqu\'à 26 V / 3,2 A : consommation d\'un montage, suivi de batterie.',
    pins: I2C, libs: [X.ina219, X.busio], inc: ['<Adafruit_INA219.h>'], needOk: true,
    params: { addr: { def: '0x40', label: 'Adresse I2C', opts: ['0x40', '0x41', '0x44', '0x45'] } },
    glob: C`Adafruit_INA219 $ina({{P:addr}});`,
    setup: C`$ok = $ina.begin(&Wire);
if ($ok) $ina.setCalibration_32V_2A();`,
    loop: C`$volt = $ina.getBusVoltage_V() + $ina.getShuntVoltage_mV() / 1000.0f;
$curr = $ina.getCurrent_mA();
$power = $ina.getPower_mW();`,
    outs: [V, I, W],
    notes: ['Le shunt se place en série sur le + de la charge (VIN+ côté source, VIN- côté charge).']
  });
  add({
    id: 'ina226', key: 'ina226', name: 'INA226 (wattmètre 36 V)', bus: 'i2c', addr: ['0x40'], tags: ['courant', 'tension', 'puissance', 'I2C'],
    desc: 'Wattmètre haute précision jusqu\'à 36 V ; shunt de 0,1 Ω sur les modules courants.',
    pins: I2C, libs: [X.ina226], inc: ['<INA226.h>'], needOk: true,
    params: { imax: { def: '0.8', label: 'Courant max (A)' }, shunt: { def: '0.1', label: 'Shunt (Ω)' } },
    glob: C`INA226 $ina(0x40, &Wire);`,
    setup: C`$ok = $ina.begin();
if ($ok) $ina.setMaxCurrentShunt({{P:imax}}, {{P:shunt}});`,
    loop: C`$volt = $ina.getBusVoltage();
$curr = $ina.getCurrent_mA();
$power = $ina.getPower_mW();`,
    outs: [V, I, W]
  });
  add({
    id: 'ina260', key: 'ina260', name: 'INA260 (shunt intégré 15 A)', bus: 'i2c', addr: ['0x40'], tags: ['courant', 'tension', 'puissance', 'I2C'],
    desc: 'Wattmètre avec shunt de précision intégré : 36 V et ±15 A sans calcul d\'étalonnage.',
    pins: I2C, libs: [X.ina260, X.busio], inc: ['<Adafruit_INA260.h>'], needOk: true,
    glob: C`Adafruit_INA260 $ina;`,
    setup: C`$ok = $ina.begin(0x40, &Wire);`,
    loop: C`$volt = $ina.readBusVoltage() / 1000.0f;
$curr = $ina.readCurrent();
$power = $ina.readPower();`,
    outs: [V, I, W]
  });
  add({
    id: 'acs712', key: 'acs712', name: 'ACS712 (courant à effet Hall 5/20/30 A)', vcc: '5V', tags: ['courant', 'Hall', 'analogique'],
    desc: 'Capteur de courant isolé AC/DC : 185 mV/A (5 A), 100 mV/A (20 A), 66 mV/A (30 A).',
    pins: [{ role: 'OUT', type: 'adc', label: 'OUT', note: 'pont diviseur 10 kΩ / 20 kΩ : sortie 0-5 V centrée sur 2,5 V' }], period: 500, mA: 10,
    params: { sens: { def: '185', label: 'Sensibilité (mV/A)' }, div: { def: '1.5', label: 'Rapport pont diviseur' } },
    glob: C`float $zero = 0;`,
    setup: C`uint32_t s = 0;
for (int i = 0; i < 64; i++) { s += analogReadMilliVolts({{OUT}}); delay(2); }
$zero = s / 64.0f * {{P:div}};             // point zéro mesuré sans courant
Serial.printf("# ACS712 : zéro = %.0f mV\n", $zero);`,
    loop: C`uint32_t s = 0;
for (int i = 0; i < 64; i++) s += analogReadMilliVolts({{OUT}});
float mv = s / 64.0f * {{P:div}};
$amp = (mv - $zero) / {{P:sens}};`,
    outs: [{ k: 'amp', u: 'A', l: 'Courant' }],
    notes: ['Démarrez sans charge pour que le zéro soit mesuré correctement.', 'Pour le secteur 230 V, faites câbler l\'installation par une personne qualifiée.']
  });
  add({
    id: 'voltage_divider', key: 'vdiv', name: 'Module mesure de tension 0-25 V', tags: ['tension', 'batterie', 'analogique'],
    desc: 'Pont diviseur 30 kΩ / 7,5 kΩ (rapport 5) : batterie 12 V, panneau solaire.',
    pins: [{ role: 'S', type: 'adc', label: 'S' }], period: 1000,
    params: { ratio: { def: '5.0', label: 'Rapport du pont' }, max: { def: '16.5', label: 'Tension max mesurable (V)' } },
    loop: C`uint32_t s = 0;
for (int i = 0; i < 32; i++) s += analogReadMilliVolts({{S}});
$volt = s / 32.0f / 1000.0f * {{P:ratio}};`,
    outs: [V],
    notes: ['En 3,3 V la tension mesurable maximale est ~16,5 V (3,3 × 5) : ne dépassez pas.']
  });
  add({
    id: 'battery_monitor', key: 'batt', name: 'Niveau de batterie Li-ion (pont 100k/100k)', tags: ['batterie', 'Li-ion', 'autonomie', 'analogique'],
    desc: 'Tension et pourcentage estimé d\'une cellule 18650 (3,0-4,2 V) via un pont diviseur par 2.',
    pins: [{ role: 'VBAT', type: 'adc', label: 'point milieu', note: '100 kΩ vers la batterie +, 100 kΩ vers GND' }], period: 5000,
    loop: C`uint32_t s = 0;
for (int i = 0; i < 32; i++) s += analogReadMilliVolts({{VBAT}});
float v = s / 32.0f * 2.0f / 1000.0f;
$volt = v;
static const float lut[11] = {3.00f, 3.45f, 3.68f, 3.74f, 3.77f, 3.79f, 3.82f, 3.87f, 3.92f, 3.98f, 4.20f};
float pct = 0;
for (int i = 10; i >= 0; i--) { if (v >= lut[i]) { pct = i * 10.0f; if (i < 10) pct += 10.0f * (v - lut[i]) / (lut[i + 1] - lut[i]); break; } }
$pct = constrain(pct, 0.0f, 100.0f);`,
    outs: [V, { k: 'pct', u: '%', l: 'Charge estimée' }]
  });
  add({
    id: 'zmpt101b', key: 'zmpt', name: 'ZMPT101B (tension secteur AC)', vcc: '3V3', tags: ['tension', 'secteur', 'AC', 'analogique', 'énergie'],
    desc: 'Transformateur de mesure isolé : tension efficace du secteur (étalonnage requis).',
    pins: [{ role: 'OUT', type: 'adc', label: 'OUT' }], period: 1000, mA: 5, difficulty: 3,
    params: { k: { def: '0.63', label: 'Coefficient V par mV RMS (à étalonner)' } },
    loop: C`const int N = 400;
double sum = 0, mean = 0;
static int buf[400];
for (int i = 0; i < N; i++) { buf[i] = analogReadMilliVolts({{OUT}}); mean += buf[i]; delayMicroseconds(250); }
mean /= N;
for (int i = 0; i < N; i++) { double d = buf[i] - mean; sum += d * d; }
$vrms = sqrt(sum / N) * {{P:k}};`,
    outs: [{ k: 'vrms', u: 'V', l: 'Tension efficace' }],
    notes: ['DANGER 230 V : le côté secteur doit être câblé et protégé par une personne qualifiée.', 'Étalonnez « k » avec un multimètre.']
  });
  add({
    id: 'sct013', key: 'sct013', name: 'Pince ampèremétrique SCT-013-030', tags: ['courant', 'secteur', 'AC', 'énergie', 'non invasif'],
    desc: 'Mesure non invasive du courant alternatif (30 A → 1 V) autour d\'un seul conducteur.',
    pins: [{ role: 'OUT', type: 'adc', label: 'jack (pointe)', note: 'pont 10 kΩ/10 kΩ + condensateur 10 µF pour centrer à 1,65 V' }], period: 1000, difficulty: 2,
    params: { k: { def: '30.0', label: 'A par volt RMS' }, v: { def: '230', label: 'Tension secteur (V)' } },
    loop: C`const int N = 400;
double sum = 0, mean = 0;
static int buf[400];
for (int i = 0; i < N; i++) { buf[i] = analogReadMilliVolts({{OUT}}); mean += buf[i]; delayMicroseconds(250); }
mean /= N;
for (int i = 0; i < N; i++) { double d = buf[i] - mean; sum += d * d; }
$irms = sqrt(sum / N) / 1000.0f * {{P:k}};
$watts = $irms * {{P:v}};`,
    outs: [{ k: 'irms', u: 'A', l: 'Courant efficace' }, { k: 'watts', u: 'W', l: 'Puissance apparente' }],
    notes: ['La pince entoure UN seul fil (phase OU neutre), jamais le câble entier.']
  });
  add({
    id: 'pzem004t', key: 'pzem', name: 'PZEM-004T v3 (compteur d\'énergie)', uart: true, vcc: '5V', tags: ['énergie', 'secteur', 'kWh', 'Modbus', 'UART'],
    desc: 'Compteur d\'énergie monophasé : tension, courant, puissance, énergie cumulée, fréquence et facteur de puissance.',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TX du PZEM' }, { role: 'TX', type: 'uart_tx', label: 'RX du PZEM' }], libs: [X.pzem], inc: ['<PZEM004Tv30.h>'], period: 2000, mA: 10, difficulty: 2,
    glob: C`PZEM004Tv30 $pzem({{SER}}, {{RX}}, {{TX}});`,
    loop: C`$volt = $pzem.voltage();
$curr = $pzem.current();
$power = $pzem.power();
$energy = $pzem.energy();
$freq = $pzem.frequency();
$pf = $pzem.pf();`,
    outs: [{ k: 'volt', u: 'V', l: 'Tension' }, { k: 'curr', u: 'A', l: 'Courant' }, { k: 'power', u: 'W', l: 'Puissance' }, { k: 'energy', u: 'kWh', l: 'Énergie' }, { k: 'freq', u: 'Hz', l: 'Fréquence' }, { k: 'pf', u: '', l: 'Facteur de puissance' }],
    notes: ['DANGER 230 V : installation par une personne qualifiée, dans un boîtier fermé.', 'La sortie série du PZEM est en 5 V : pont diviseur sur son TX recommandé.']
  });
  add({
    id: 'solar_panel', key: 'solar', name: 'Petit panneau solaire (tension/puissance)', tags: ['solaire', 'énergie', 'analogique'],
    desc: 'Mesure la tension d\'un panneau 6 V sur charge résistive pour estimer l\'ensoleillement.',
    pins: [{ role: 'AO', type: 'adc', label: 'point milieu', note: 'pont 10 kΩ / 10 kΩ, charge 47 Ω en parallèle du panneau' }], period: 2000,
    params: { rload: { def: '47.0', label: 'Charge (Ω)' } },
    loop: C`uint32_t s = 0;
for (int i = 0; i < 32; i++) s += analogReadMilliVolts({{AO}});
float v = s / 32.0f * 2.0f / 1000.0f;
$volt = v;
$power = v * v / {{P:rload}} * 1000.0f;`,
    outs: [V, W]
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* Modules « Identification, temps & position » : RFID/NFC, empreinte, GPS, horloges, mémoires. */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const M = (LAB.MODULES = LAB.MODULES || []);
  const X = LAB.LIBS;
  const C = String.raw;
  const I2C = [{ role: 'SDA', bus: 'sda' }, { role: 'SCL', bus: 'scl' }];
  const SPI = [{ role: 'SCK', bus: 'sck' }, { role: 'MISO', bus: 'miso' }, { role: 'MOSI', bus: 'mosi' }];
  const add = (m) => M.push(Object.assign({ cat: 'id', difficulty: 2, vcc: '3V3', mA: 1, period: 200 }, m));

  add({
    id: 'rc522', key: 'rfid', name: 'Lecteur RFID RC522 (13,56 MHz)', bus: 'spi', tags: ['RFID', 'badge', 'MIFARE', 'SPI', 'contrôle d\'accès'],
    desc: 'Lit l\'identifiant (UID) des badges et cartes MIFARE : contrôle d\'accès, pointeuse.',
    pins: SPI.concat([{ role: 'SS', type: 'cs', label: 'SDA (SS)' }, { role: 'RST', type: 'out', label: 'RST' }]),
    libs: [X.mfrc522], inc: ['<MFRC522.h>'], mA: 26, period: 100,
    params: { allowed: { def: 'DE AD BE EF', label: 'UID autorisé (hex, espaces)' } },
    glob: C`MFRC522 $rfid({{SS}}, {{RST}});
uint32_t $n = 0;
uint32_t $readAt = 0;
String $uidString(const MFRC522::Uid &u) {
  String s;
  for (byte i = 0; i < u.size; i++) {
    if (i) s += ' ';
    if (u.uidByte[i] < 0x10) s += '0';
    s += String(u.uidByte[i], HEX);
  }
  s.toUpperCase();
  return s;
}`,
    setup: C`$rfid.PCD_Init();
delay(5);
Serial.print(F("# RC522 version : "));
$rfid.PCD_DumpVersionToSerial();`,
    loop: C`if (!isnan($granted) && millis() - $readAt > 1500) $granted = NAN;   // prêt pour le badge suivant
if ($rfid.PICC_IsNewCardPresent() && $rfid.PICC_ReadCardSerial()) {
  $readAt = millis();
  String uid = $uidString($rfid.uid);
  bool ok = uid == String("{{P:allowed}}");
  Serial.printf("# badge %s : %s\n", uid.c_str(), ok ? "AUTORISÉ" : "refusé");
  $granted = ok ? 1 : 0;
  $reads = ++$n;
  $rfid.PICC_HaltA();
  $rfid.PCD_StopCrypto1();
}`,
    outs: [{ k: 'granted', u: '', l: 'Dernier accès (0/1)' }, { k: 'reads', u: '', l: 'Lectures' }],
    print: 'change',
    notes: ['Le RC522 fonctionne en 3,3 V uniquement.', 'Remplacez « allowed » par l\'UID affiché de votre badge.']
  });
  add({
    id: 'pn532', key: 'nfc', name: 'Lecteur NFC PN532 (I2C)', bus: 'i2c', addr: ['0x24'], tags: ['NFC', 'RFID', 'smartphone', 'I2C'],
    desc: 'Lecteur NFC polyvalent : badges MIFARE, NTAG, et même certains smartphones.',
    pins: I2C.concat([{ role: 'IRQ', type: 'in', label: 'IRQ' }, { role: 'RST', type: 'out', label: 'RSTO' }]),
    libs: [X.pn532, X.busio], inc: ['<Adafruit_PN532.h>'], needOk: true, mA: 100, period: 500,
    extraWiring: [{ pin: 'interrupteurs', to: 'I2C : SW1 = ON, SW2 = OFF', note: 'mode I2C du module rouge' }],
    glob: C`Adafruit_PN532 $nfc({{IRQ}}, {{RST}}, &Wire);
uint32_t $n = 0;`,
    setup: C`$ok = $nfc.begin();
if ($ok) {
  uint32_t v = $nfc.getFirmwareVersion();
  $ok = v != 0;
  if ($ok) { Serial.printf("# PN532 firmware %lu.%lu\n", (unsigned long)((v >> 16) & 0xFF), (unsigned long)((v >> 8) & 0xFF)); $nfc.SAMConfig(); }
}`,
    loop: C`uint8_t uid[7], len = 0;
if ($nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &len, 50)) {
  Serial.print(F("# carte NFC : "));
  for (uint8_t i = 0; i < len; i++) Serial.printf("%02X ", uid[i]);
  Serial.println();
  $reads = ++$n;
}`,
    outs: [{ k: 'reads', u: '', l: 'Lectures' }], print: 'change'
  });
  add({
    id: 'fingerprint', key: 'finger', name: 'Lecteur d\'empreintes R307 / AS608', uart: true, tags: ['empreinte', 'biométrie', 'serrure', 'UART'],
    desc: 'Reconnaissance d\'empreintes digitales (jusqu\'à 162 modèles) pour serrure ou pointeuse.',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TX (vert)' }, { role: 'TX', type: 'uart_tx', label: 'RX (blanc)' }],
    libs: [X.finger], inc: ['<Adafruit_Fingerprint.h>'], needOk: true, mA: 60, period: 300, difficulty: 3,
    glob: C`Adafruit_Fingerprint $fp((Stream *)&{{SER}});
uint32_t $seenAt = 0;`,
    setup: C`{{SER}}.begin(57600, SERIAL_8N1, {{RX}}, {{TX}});
$fp.begin(57600);
$ok = $fp.verifyPassword();
if ($ok) { $fp.getTemplateCount(); Serial.printf("# lecteur prêt, %u empreinte(s) enregistrée(s)\n", $fp.templateCount); }`,
    loop: C`if (!isnan($id) && millis() - $seenAt > 2000) $id = NAN;
if ($fp.getImage() == FINGERPRINT_OK && $fp.image2Tz() == FINGERPRINT_OK) {
  $seenAt = millis();
  if ($fp.fingerFastSearch() == FINGERPRINT_OK) {
    Serial.printf("# empreinte reconnue : n°%u (confiance %u)\n", $fp.fingerID, $fp.confidence);
    $id = $fp.fingerID;
  } else {
    Serial.println(F("# empreinte inconnue"));
    $id = -1;
  }
}`,
    outs: [{ k: 'id', u: '', l: 'Dernier ID reconnu' }], print: 'change',
    notes: ['Enregistrez les empreintes avec l\'exemple « enroll » de la bibliothèque Adafruit.']
  });
  add({
    id: 'rdm6300', key: 'rdm6300', name: 'Lecteur RFID 125 kHz RDM6300', uart: true, vcc: '5V', tags: ['RFID', 'EM4100', '125 kHz', 'UART'],
    desc: 'Lit les badges 125 kHz EM4100 (portes d\'immeuble) : trame ASCII à 9600 bauds.',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TX du module' }, { role: 'TX', type: 'uart_tx', label: 'RX (non utilisé)', optional: true }], mA: 50, period: 1000,
    glob: C`char $frame[14];
uint8_t $pos = 0;`,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});`,
    tick: C`while ({{SER}}.available()) {
  char c = {{SER}}.read();
  if (c == 0x02) { $pos = 0; continue; }
  if (c == 0x03) {
    if ($pos == 12) {
      $frame[10] = 0;
      unsigned long tag = strtoul($frame + 2, nullptr, 16);
      Serial.printf("# badge 125 kHz : %s (n° %lu)\n", $frame, tag);
      $last = (float)(tag % 100000UL);
    }
    $pos = 0;
    continue;
  }
  if ($pos < 13) $frame[$pos++] = c;
}`,
    outs: [{ k: 'last', u: '', l: 'Badge (5 derniers chiffres)' }], print: 'change'
  });
  add({
    id: 'gm65', key: 'barcode', name: 'Lecteur de codes-barres / QR GM65', uart: true, vcc: '5V', tags: ['code-barres', 'QR code', 'scanner', 'UART'],
    desc: 'Scanne codes-barres 1D et QR codes et les transmet en texte (9600 bauds).',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TX du lecteur' }, { role: 'TX', type: 'uart_tx', label: 'RX du lecteur' }], mA: 120, period: 1000,
    glob: C`String $line;`,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});`,
    tick: C`while ({{SER}}.available()) {
  char c = {{SER}}.read();
  if (c == '\r' || c == '\n') {
    if ($line.length()) { Serial.printf("# code lu : %s\n", $line.c_str()); $line = ""; }
  } else if ($line.length() < 200) {
    $line += c;
  }
}`
  });
  add({
    id: 'gps_neo6m', key: 'gps', name: 'GPS u-blox NEO-6M / NEO-M8N', uart: true, tags: ['GPS', 'position', 'heure', 'UART'],
    desc: 'Position, altitude, vitesse, heure UTC et nombre de satellites (trames NMEA 9600 bauds).',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TX du GPS' }, { role: 'TX', type: 'uart_tx', label: 'RX du GPS' }],
    libs: [X.tinygps], inc: ['<TinyGPSPlus.h>'], mA: 45, period: 2000,
    glob: C`TinyGPSPlus $gps;`,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});
Serial.println(F("# GPS : premier fix en extérieur, 30 s à plusieurs minutes"));`,
    tick: C`while ({{SER}}.available()) $gps.encode({{SER}}.read());`,
    loop: C`$sats = $gps.satellites.isValid() ? $gps.satellites.value() : 0;
if ($gps.location.isValid()) {
  $lat = $gps.location.lat();
  $lng = $gps.location.lng();
  Serial.printf("# position : %.6f, %.6f  https://maps.google.com/?q=%.6f,%.6f\n", $gps.location.lat(), $gps.location.lng(), $gps.location.lat(), $gps.location.lng());
}
if ($gps.altitude.isValid()) $alt = $gps.altitude.meters();
if ($gps.speed.isValid()) $speed = $gps.speed.kmph();
if ($gps.time.isValid()) Serial.printf("# heure UTC %02d:%02d:%02d\n", $gps.time.hour(), $gps.time.minute(), $gps.time.second());
if (millis() > 10000 && $gps.charsProcessed() < 10) Serial.println(F("# aucune donnée GPS : vérifiez TX/RX et 9600 bauds"));`,
    outs: [{ k: 'lat', u: '°', l: 'Latitude' }, { k: 'lng', u: '°', l: 'Longitude' }, { k: 'alt', u: 'm', l: 'Altitude' }, { k: 'speed', u: 'km/h', l: 'Vitesse' }, { k: 'sats', u: '', l: 'Satellites' }]
  });
  const rtc = (id, name, cls, desc, extra) => add(Object.assign({
    id, key: id, name, bus: 'i2c', tags: ['horloge', 'RTC', 'heure', 'I2C'], desc,
    pins: I2C, libs: [X.rtclib, X.busio], inc: ['<RTClib.h>'], needOk: true, period: 1000, difficulty: 1,
    glob: C`${cls} $rtc;`,
    setup: C`$ok = $rtc.begin(&Wire);
if ($ok && $rtc.lostPower()) {
  Serial.println(F("# RTC : heure perdue, réglage sur l'heure de compilation"));
  $rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
}`,
    loop: C`DateTime n = $rtc.now();
Serial.printf("# %02d/%02d/%04d %02d:%02d:%02d\n", n.day(), n.month(), n.year(), n.hour(), n.minute(), n.second());
$epoch = n.unixtime() % 86400UL;`,
    outs: [{ k: 'epoch', u: 's', l: 'Secondes depuis minuit' }]
  }, extra));
  rtc('ds3231', 'Horloge temps réel DS3231', 'RTC_DS3231', 'Horloge compensée en température (±2 ppm, ~1 min/an) avec pile CR2032 et EEPROM AT24C32.', {
    addr: ['0x68'],
    loop: C`DateTime n = $rtc.now();
Serial.printf("# %02d/%02d/%04d %02d:%02d:%02d\n", n.day(), n.month(), n.year(), n.hour(), n.minute(), n.second());
$epoch = n.unixtime() % 86400UL;
$temp = $rtc.getTemperature();`,
    outs: [{ k: 'epoch', u: 's', l: 'Secondes depuis minuit' }, { k: 'temp', u: '°C', l: 'Température puce' }]
  });
  rtc('ds1307', 'Horloge temps réel DS1307 (Tiny RTC)', 'RTC_DS1307', 'Horloge économique avec pile (dérive ~1 s/jour).', { addr: ['0x68'], vcc: '5V',
    setup: C`$ok = $rtc.begin(&Wire);
if ($ok && !$rtc.isrunning()) {
  Serial.println(F("# RTC arrêtée : réglage sur l'heure de compilation"));
  $rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
}` });
  rtc('pcf8563', 'Horloge temps réel PCF8563', 'RTC_PCF8563', 'Horloge basse consommation NXP, présente sur de nombreuses cartes ESP32.', { addr: ['0x51'] });
  add({
    id: 'at24c32', key: 'eeprom', name: 'EEPROM I2C AT24C32 / AT24C256', bus: 'i2c', addr: ['0x50', '0x57'], tags: ['mémoire', 'EEPROM', 'I2C', 'sans bibliothèque'],
    desc: 'Mémoire non volatile externe : compteur de démarrages conservé hors tension.',
    pins: I2C, needOk: true, period: 5000, difficulty: 1,
    params: { addr: { def: '0x57', label: 'Adresse (0x57 sur module DS3231)', opts: ['0x50', '0x51', '0x52', '0x53', '0x54', '0x55', '0x56', '0x57'] } },
    glob: C`uint8_t $read(uint16_t a) {
  Wire.beginTransmission((uint8_t){{P:addr}});
  Wire.write(a >> 8); Wire.write(a & 0xFF);
  Wire.endTransmission();
  Wire.requestFrom((uint8_t){{P:addr}}, (uint8_t)1);
  return Wire.available() ? Wire.read() : 0xFF;
}
void $write(uint16_t a, uint8_t v) {
  Wire.beginTransmission((uint8_t){{P:addr}});
  Wire.write(a >> 8); Wire.write(a & 0xFF); Wire.write(v);
  Wire.endTransmission();
  delay(6);                                   // temps d'écriture interne
}`,
    setup: C`Wire.beginTransmission((uint8_t){{P:addr}});
$ok = Wire.endTransmission() == 0;
if ($ok) {
  uint8_t boots = $read(0) + 1;
  $write(0, boots);
  Serial.printf("# EEPROM : démarrage n°%u\n", boots);
  $boots = boots;
}`,
    outs: [{ k: 'boots', u: '', l: 'Démarrages' }]
  });
  add({
    id: 'sd_card', key: 'sd', name: 'Module carte microSD (SPI)', bus: 'spi', tags: ['stockage', 'SD', 'journal', 'SPI', 'enregistreur'], usesOuts: true,
    desc: 'Enregistreur de données : écrit toutes les mesures du projet dans un fichier CSV (Excel/LibreOffice).',
    pins: SPI.concat([{ role: 'CS', type: 'cs', label: 'CS' }]), inc: ['<SD.h>'], needOk: true, period: 10000, mA: 50, peak_mA: 100,
    glob: C`uint32_t $lines = 0;`,
    setup: C`$ok = SD.begin({{CS}});
if ($ok) {
  Serial.printf("# carte SD : %llu Mo\n", SD.cardSize() / (1024ULL * 1024ULL));
  File f = SD.open("/journal.csv", FILE_APPEND);
  if (f) {
    f.print("millis");
    for (int i = 0; i < LAB_OUT_COUNT; i++) { f.print(';'); f.print(lab_outs[i].label); if (lab_outs[i].unit[0]) { f.print(" ("); f.print(lab_outs[i].unit); f.print(')'); } }
    f.println();
    f.close();
  }
}`,
    loop: C`File f = SD.open("/journal.csv", FILE_APPEND);
if (f) {
  f.print(millis());
  for (int i = 0; i < LAB_OUT_COUNT; i++) {
    float v = lab_outs[i].value ? *lab_outs[i].value : NAN;
    f.print(';');
    if (!isnan(v)) f.print(v, 3);
  }
  f.println();
  f.close();
  $lines++;
}
$count = $lines;
$used = SD.usedBytes() / 1024.0f;`,
    outs: [{ k: 'count', u: '', l: 'Lignes écrites' }, { k: 'used', u: 'Ko', l: 'Espace utilisé' }],
    notes: ['Carte formatée en FAT32.', 'Beaucoup de modules ont un régulateur 5 V → 3,3 V : alimentez-les en 5 V.']
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* Modules « Actionneurs » (LED, relais, son) et « Moteurs & servos ».
 * Chaque actionneur expose des fonctions $on(), $off(), $toggle() et/ou $set(v) utilisables par
 * les automatismes du Studio ; sans règle, un petit programme de démonstration est généré. */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const M = (LAB.MODULES = LAB.MODULES || []);
  const X = LAB.LIBS;
  const C = String.raw;
  const I2C = [{ role: 'SDA', bus: 'sda' }, { role: 'SCL', bus: 'scl' }];
  const add = (cat, m) => M.push(Object.assign({ cat, difficulty: 1, vcc: '3V3', mA: 5, period: 1000 }, m));
  const ONOFF = { on: true, off: true, toggle: true };

  /* ---------------- LED ---------------- */
  add('act', {
    id: 'led', key: 'led', name: 'LED + résistance 220 Ω', tags: ['LED', 'débutant', 'sortie'], act: ONOFF,
    desc: 'Le « Hello world » de l\'électronique : une LED qui clignote (ou pilotée par une règle).',
    pins: [{ role: 'LED', type: 'out', label: 'anode (+) via 220 Ω', note: 'cathode (patte courte) vers GND' }], mA: 10,
    glob: C`bool $state = false;
void $on() { $state = true; digitalWrite({{LED}}, HIGH); }
void $off() { $state = false; digitalWrite({{LED}}, LOW); }
void $toggle() { if ($state) $off(); else $on(); }`,
    setup: C`pinMode({{LED}}, OUTPUT);
$off();`,
    demo: C`$toggle();`
  });
  add('act', {
    id: 'led_pwm', key: 'dim', name: 'LED à intensité variable (PWM)', tags: ['LED', 'PWM', 'variateur'], act: { on: true, off: true, set: { min: 0, max: 100, unit: '%' } },
    desc: 'Variation progressive de luminosité par modulation de largeur d\'impulsion (LEDC 5 kHz, 10 bits).',
    pins: [{ role: 'LED', type: 'pwm', label: 'anode via 220 Ω' }], period: 20, mA: 10,
    glob: C`float $level = 0;
void $set(float pct) { $level = constrain(pct, 0.0f, 100.0f); ledcWrite({{LED}}, (uint32_t)($level * $level * 1023.0f / 10000.0f)); }  // courbe quadratique = perception linéaire
void $on() { $set(100); }
void $off() { $set(0); }
void $toggle() { $set($level > 0 ? 0 : 100); }`,
    setup: C`ledcAttach({{LED}}, 5000, 10);
$off();`,
    demo: C`static float d = 1.5f;
float v = $level + d;
if (v >= 100 || v <= 0) d = -d;
$set(v);`
  });
  add('act', {
    id: 'rgb_led', key: 'rgb', name: 'LED RVB (cathode commune)', tags: ['LED', 'RVB', 'couleur', 'PWM'], act: { on: true, off: true, set: { min: 0, max: 360, unit: '° (teinte)' } },
    desc: 'LED tricolore pilotée en PWM : toutes les couleurs par mélange rouge/vert/bleu.',
    pins: [{ role: 'R', type: 'pwm', label: 'rouge via 220 Ω' }, { role: 'G', type: 'pwm', label: 'vert via 220 Ω' }, { role: 'B', type: 'pwm', label: 'bleu via 220 Ω' }], period: 30, mA: 40,
    params: { anode: { def: 'false', label: 'Anode commune', opts: ['false', 'true'] } },
    glob: C`float $hue = 0;
void $rgb(uint8_t r, uint8_t g, uint8_t b) {
  if ({{P:anode}}) { r = 255 - r; g = 255 - g; b = 255 - b; }
  ledcWrite({{R}}, r); ledcWrite({{G}}, g); ledcWrite({{B}}, b);
}
void $set(float hue) {                       // teinte 0-360°, saturation et luminosité max
  $hue = fmodf(hue, 360.0f);
  float h = $hue / 60.0f, x = 1.0f - fabsf(fmodf(h, 2.0f) - 1.0f);
  float r = 0, g = 0, b = 0;
  if (h < 1) { r = 1; g = x; } else if (h < 2) { r = x; g = 1; } else if (h < 3) { g = 1; b = x; }
  else if (h < 4) { g = x; b = 1; } else if (h < 5) { r = x; b = 1; } else { r = 1; b = x; }
  $rgb(r * 255, g * 255, b * 255);
}
void $on() { $rgb(255, 255, 255); }
void $off() { $rgb(0, 0, 0); }`,
    setup: C`ledcAttach({{R}}, 5000, 8);
ledcAttach({{G}}, 5000, 8);
ledcAttach({{B}}, 5000, 8);
$off();`,
    demo: C`$set($hue + 2.0f);   // arc-en-ciel`
  });
  add('act', {
    id: 'ws2812', key: 'strip', name: 'Ruban / anneau LED WS2812B (NeoPixel)', vcc: '5V', tags: ['LED', 'WS2812', 'NeoPixel', 'adressable'], act: { on: true, off: true, set: { min: 0, max: 360, unit: '° (teinte)' } },
    desc: 'LED RVB adressables en chaîne sur un seul fil : animations, jauges, éclairage d\'ambiance.',
    pins: [{ role: 'DIN', type: 'out', label: 'DIN', note: 'résistance 330 Ω en série, condensateur 1000 µF sur l\'alimentation' }],
    libs: [X.neopixel], inc: ['<Adafruit_NeoPixel.h>'], period: 30, mA: 60, peak_mA: 480,
    params: { count: { def: '8', label: 'Nombre de LED' }, bright: { def: '60', label: 'Luminosité (0-255)' } },
    glob: C`Adafruit_NeoPixel $px({{P:count}}, {{DIN}}, NEO_GRB + NEO_KHZ800);
uint16_t $hue = 0;
void $fill(uint32_t c) { $px.fill(c); $px.show(); }
void $set(float hueDeg) { $fill($px.gamma32($px.ColorHSV((uint16_t)(hueDeg * 182.04f)))); }
void $on() { $fill($px.Color(255, 255, 255)); }
void $off() { $fill(0); }`,
    setup: C`$px.begin();
$px.setBrightness({{P:bright}});
$off();`,
    demo: C`$hue += 256;
for (uint16_t i = 0; i < $px.numPixels(); i++) $px.setPixelColor(i, $px.gamma32($px.ColorHSV($hue + i * 65536UL / $px.numPixels())));
$px.show();`,
    notes: ['Chaque LED consomme jusqu\'à 60 mA en blanc à pleine luminosité : alimentation 5 V dimensionnée en conséquence.'],
    level5V: 'la donnée 3,3 V fonctionne en général ; pour les longs rubans, un 74AHCT125 améliore la fiabilité.'
  });
  add('act', {
    id: 'buzzer_active', key: 'buzz', name: 'Buzzer actif 5 V', tags: ['son', 'alarme', 'buzzer'], act: ONOFF,
    desc: 'Buzzer à oscillateur intégré : émet un bip dès qu\'il est alimenté.',
    pins: [{ role: 'IO', type: 'out', label: '+ (via transistor si > 20 mA)' }], mA: 25, period: 2000,
    glob: C`bool $state = false;
void $on() { $state = true; digitalWrite({{IO}}, HIGH); }
void $off() { $state = false; digitalWrite({{IO}}, LOW); }
void $toggle() { if ($state) $off(); else $on(); }`,
    setup: C`pinMode({{IO}}, OUTPUT);
$off();`,
    demo: C`$on();
delay(80);
$off();`
  });
  add('act', {
    id: 'buzzer_passive', key: 'tone', name: 'Buzzer passif / haut-parleur piézo', tags: ['son', 'mélodie', 'tone', 'buzzer'], act: { on: true, off: true, set: { min: 100, max: 8000, unit: 'Hz' } },
    desc: 'Joue des notes et des mélodies avec tone() (fréquence variable).',
    pins: [{ role: 'IO', type: 'pwm', label: '+' }], mA: 20, period: 4000,
    glob: C`void $set(float hz) { tone({{IO}}, (unsigned int)hz); }
void $on() { tone({{IO}}, 1000); }
void $off() { noTone({{IO}}); }
void $melody() {
  static const uint16_t notes[] = {262, 294, 330, 349, 392, 440, 494, 523};   // do ré mi fa sol la si do
  for (uint16_t n : notes) { tone({{IO}}, n, 150); delay(180); }
  noTone({{IO}});
}`,
    setup: C`pinMode({{IO}}, OUTPUT);`,
    demo: C`$melody();`
  });
  const relay = (id, name, desc, activeLow, extra) => add('act', Object.assign({
    id, key: id, name, vcc: '5V', tags: ['relais', 'commutation', '230 V', 'domotique'], act: ONOFF, desc,
    pins: [{ role: 'IN', type: 'out', label: 'IN' }], mA: 70, period: 5000,
    params: { low: { def: activeLow ? 'true' : 'false', label: 'Actif à l\'état bas', opts: ['true', 'false'] } },
    glob: C`bool $state = false;
void $write(bool on) { $state = on; digitalWrite({{IN}}, ({{P:low}}) ? !on : on); }
void $on() { $write(true); }
void $off() { $write(false); }
void $toggle() { $write(!$state); }`,
    setup: C`pinMode({{IN}}, OUTPUT);
$off();`,
    demo: C`$toggle();
Serial.printf("# relais %s\n", $state ? "FERMÉ" : "ouvert");`,
    notes: ['DANGER : le 230 V doit être câblé par une personne qualifiée, dans un boîtier isolé.', 'La plupart des modules 1 relais sont actifs à l\'état bas (LED allumée quand IN = 0).']
  }, extra));
  relay('relay', 'Module relais 5 V (1 canal)', 'Relais électromécanique 10 A / 250 V : lampe, pompe, chauffage (via optocoupleur).', true);
  relay('ssr', 'Relais statique SSR G3MB-202P', 'Relais statique silencieux 2 A / 240 V AC, commutation au passage à zéro (charges résistives).', false, { mA: 12 });
  const mosfet = (id, name, desc, extra) => add('act', Object.assign({
    id, key: id, name, tags: ['MOSFET', 'PWM', 'puissance'], act: { on: true, off: true, toggle: true, set: { min: 0, max: 100, unit: '%' } }, desc,
    pins: [{ role: 'SIG', type: 'pwm', label: 'SIG / Gate' }], mA: 5, period: 50,
    glob: C`float $level = 0;
void $set(float pct) { $level = constrain(pct, 0.0f, 100.0f); ledcWrite({{SIG}}, (uint32_t)($level * 255.0f / 100.0f)); }
void $on() { $set(100); }
void $off() { $set(0); }
void $toggle() { $set($level > 0 ? 0 : 100); }`,
    setup: C`ledcAttach({{SIG}}, 1000, 8);
$off();`,
    demo: C`static float d = 0.5f;
float v = $level + d;
if (v >= 100 || v <= 0) d = -d;
$set(v);`
  }, extra));
  mosfet('mosfet_irf520', 'Module MOSFET IRF520 / IRLZ44N', 'Commute une charge continue (ruban LED, moteur, électrovanne) jusqu\'à 24 V en PWM.', {
    notes: ['L\'IRF520 n\'est pas « logic level » : en 3,3 V il conduit mal. Préférez un IRLZ44N ou un module à double MOSFET.', 'Diode de roue libre obligatoire pour les charges inductives.'] });
  mosfet('vibration_motor', 'Moteur vibreur (via transistor)', 'Petit moteur à masselotte : retour haptique, alerte silencieuse.', { cat: 'motor', mA: 80 });
  add('motor', {
    id: 'pump', key: 'pump', name: 'Mini-pompe à eau 5 V (via MOSFET)', vcc: '5V', tags: ['pompe', 'arrosage', 'eau'], act: ONOFF,
    desc: 'Pompe submersible pour l\'arrosage automatique, avec durée maximale de sécurité.',
    pins: [{ role: 'SIG', type: 'out', label: 'grille MOSFET / IN relais' }], mA: 200, peak_mA: 400, period: 10000,
    params: { maxs: { def: '20', label: 'Durée max. de fonctionnement (s)' } },
    glob: C`bool $state = false;
uint32_t $since = 0;
void $on() { if (!$state) { $state = true; $since = millis(); digitalWrite({{SIG}}, HIGH); Serial.println(F("# pompe ON")); } }
void $off() { if ($state) { $state = false; digitalWrite({{SIG}}, LOW); Serial.println(F("# pompe OFF")); } }
void $toggle() { if ($state) $off(); else $on(); }`,
    setup: C`pinMode({{SIG}}, OUTPUT);
digitalWrite({{SIG}}, LOW);`,
    tick: C`if ($state && millis() - $since > {{P:maxs}} * 1000UL) { Serial.println(F("# sécurité : arrêt de la pompe")); $off(); }`,
    demo: C`$on();`,
    notes: ['Ne faites jamais tourner la pompe à sec.', 'Diode 1N4007 en parallèle de la pompe (cathode côté +).']
  });
  add('act', {
    id: 'solenoid_lock', key: 'lock', name: 'Gâche / serrure électrique 12 V', vcc: '5V', tags: ['serrure', 'gâche', 'accès'], act: ONOFF,
    desc: 'Serrure à solénoïde commandée par MOSFET : ouverture temporisée (3 s).',
    pins: [{ role: 'SIG', type: 'out', label: 'grille MOSFET' }], mA: 5, peak_mA: 600, period: 15000,
    extraWiring: [{ pin: '+12 V serrure', to: 'alimentation 12 V externe', note: 'diode de roue libre en parallèle' }],
    glob: C`uint32_t $openedAt = 0;
bool $open = false;
void $on() { $open = true; $openedAt = millis(); digitalWrite({{SIG}}, HIGH); Serial.println(F("# serrure OUVERTE")); }
void $off() { $open = false; digitalWrite({{SIG}}, LOW); }
void $toggle() { if ($open) $off(); else $on(); }`,
    setup: C`pinMode({{SIG}}, OUTPUT);
$off();`,
    tick: C`if ($open && millis() - $openedAt > 3000) $off();   // les solénoïdes chauffent : impulsion courte`,
    demo: C`$on();`
  });
  add('act', {
    id: 'fan_pwm', key: 'fan', name: 'Ventilateur PC 4 fils (PWM 25 kHz)', vcc: '5V', tags: ['ventilateur', 'PWM', 'refroidissement', 'tachymètre'], act: { on: true, off: true, set: { min: 0, max: 100, unit: '%' } },
    desc: 'Ventilateur 12 V 4 broches : vitesse par PWM 25 kHz et lecture des tours/minute.',
    pins: [{ role: 'PWM', type: 'pwm', label: 'PWM (bleu)' }, { role: 'TACH', type: 'in_pullup', label: 'TACH (vert)' }], mA: 5, period: 1000, difficulty: 2,
    extraWiring: [{ pin: '+12 V (jaune)', to: 'alimentation 12 V externe', note: 'GND commun avec l\'ESP32' }],
    glob: C`volatile uint32_t $pulses = 0;
float $level = 0;
void IRAM_ATTR $isr() { $pulses = $pulses + 1; }
void $set(float pct) { $level = constrain(pct, 0.0f, 100.0f); ledcWrite({{PWM}}, (uint32_t)($level * 255.0f / 100.0f)); }
void $on() { $set(100); }
void $off() { $set(0); }`,
    setup: C`ledcAttach({{PWM}}, 25000, 8);
pinMode({{TACH}}, INPUT_PULLUP);
attachInterrupt(digitalPinToInterrupt({{TACH}}), $isr, FALLING);
$set(50);`,
    loop: C`noInterrupts();
uint32_t n = $pulses;
$pulses = 0;
interrupts();
$rpm = n * 60000.0f / {{PERIOD_MS}} / 2.0f;    // 2 impulsions par tour
$duty = $level;`,
    demo: C`static float d = 10;
float v = $level + d;
if (v > 100 || v < 20) d = -d;
$set(constrain(v, 20.0f, 100.0f));`,
    outs: [{ k: 'rpm', u: 'tr/min', l: 'Vitesse' }, { k: 'duty', u: '%', l: 'Consigne' }]
  });

  /* ---------------- Servos & moteurs ---------------- */
  add('motor', {
    id: 'servo_sg90', key: 'servo', name: 'Servomoteur SG90 / MG90S', vcc: '5V', tags: ['servo', 'angle', 'robot'], act: { on: true, off: true, set: { min: 0, max: 180, unit: '°' } },
    desc: 'Servomoteur 0-180° piloté en PWM 50 Hz (bibliothèque ESP32Servo).',
    pins: [{ role: 'SIG', type: 'pwm', label: 'signal (orange)' }], libs: [X.servo], inc: ['<ESP32Servo.h>'], mA: 10, peak_mA: 650, period: 20,
    glob: C`Servo $servo;
float $angle = 90;
void $set(float deg) { $angle = constrain(deg, 0.0f, 180.0f); $servo.write((int)$angle); }
void $on() { $set(180); }
void $off() { $set(0); }`,
    setup: C`$servo.setPeriodHertz(50);
$servo.attach({{SIG}}, 500, 2400);
$set(90);`,
    demo: C`static float d = 1;
float a = $angle + d;
if (a >= 180 || a <= 0) d = -d;
$set(a);`,
    notes: ['Alimentez les servos en 5 V externe (pics de 650 mA), masse commune avec l\'ESP32.']
  });
  add('motor', {
    id: 'servo_mg996r', key: 'servob', name: 'Servomoteur MG996R (couple 10 kg·cm)', vcc: '5V', tags: ['servo', 'couple', 'bras robot'], act: { on: true, off: true, set: { min: 0, max: 180, unit: '°' } },
    desc: 'Servo à pignons métal pour bras robotisés et mécanismes lourds.',
    pins: [{ role: 'SIG', type: 'pwm', label: 'signal (orange)' }], libs: [X.servo], inc: ['<ESP32Servo.h>'], mA: 10, peak_mA: 2500, period: 3000,
    glob: C`Servo $servo;
float $angle = 90;
void $set(float deg) { $angle = constrain(deg, 0.0f, 180.0f); $servo.write((int)$angle); }
void $on() { $set(180); }
void $off() { $set(0); }`,
    setup: C`$servo.setPeriodHertz(50);
$servo.attach({{SIG}}, 500, 2500);
$set(90);`,
    demo: C`static const float pos[] = {0, 90, 180, 90};
static uint8_t i = 0;
$set(pos[i++ % 4]);`,
    notes: ['Courant de blocage 2,5 A : alimentation 5-6 V / 3 A dédiée obligatoire.']
  });
  add('motor', {
    id: 'servo_360', key: 'servoc', name: 'Servo à rotation continue FS90R', vcc: '5V', tags: ['servo', 'rotation continue', 'robot'], act: { on: true, off: true, set: { min: -100, max: 100, unit: '%' } },
    desc: 'Servo modifié en motoréducteur : vitesse et sens de rotation (90 = arrêt).',
    pins: [{ role: 'SIG', type: 'pwm', label: 'signal' }], libs: [X.servo], inc: ['<ESP32Servo.h>'], mA: 10, peak_mA: 700, period: 3000,
    glob: C`Servo $servo;
float $speed = 0;
void $set(float pct) { $speed = constrain(pct, -100.0f, 100.0f); $servo.write(90 + (int)($speed * 0.9f)); }
void $on() { $set(100); }
void $off() { $set(0); }`,
    setup: C`$servo.setPeriodHertz(50);
$servo.attach({{SIG}}, 500, 2400);
$off();`,
    demo: C`static int8_t s = 0;
static const float seq[] = {50, 0, -50, 0};
$set(seq[s++ % 4]);`
  });
  add('motor', {
    id: 'stepper_28byj48', key: 'step', name: 'Moteur pas-à-pas 28BYJ-48 + ULN2003', vcc: '5V', tags: ['pas-à-pas', 'stepper', 'ULN2003'], act: { on: true, off: true, set: { min: -4096, max: 4096, unit: 'pas' } },
    desc: 'Petit moteur pas-à-pas réducté (4096 demi-pas par tour) : aiguille, store, distributeur.',
    pins: [{ role: 'IN1', type: 'out' }, { role: 'IN2', type: 'out' }, { role: 'IN3', type: 'out' }, { role: 'IN4', type: 'out' }],
    libs: [X.accel], inc: ['<AccelStepper.h>'], mA: 240, period: 4000, difficulty: 2,
    glob: C`AccelStepper $motor(AccelStepper::HALF4WIRE, {{IN1}}, {{IN3}}, {{IN2}}, {{IN4}});   // ordre IN1-IN3-IN2-IN4 obligatoire
void $set(float steps) { $motor.moveTo((long)steps); }
void $on() { $motor.moveTo(2048); }       // demi-tour
void $off() { $motor.moveTo(0); }`,
    setup: C`$motor.setMaxSpeed(900);
$motor.setAcceleration(400);`,
    tick: C`$motor.run();
if ($motor.distanceToGo() == 0) $motor.disableOutputs();
else $motor.enableOutputs();`,
    demo: C`if ($motor.distanceToGo() == 0) $motor.moveTo($motor.currentPosition() == 0 ? 4096 : 0);`
  });
  add('motor', {
    id: 'stepper_a4988', key: 'nema', name: 'Pas-à-pas NEMA 17 + A4988 / DRV8825', vcc: '5V', tags: ['pas-à-pas', 'NEMA17', 'A4988', 'CNC'], act: { on: true, off: true, set: { min: -10000, max: 10000, unit: 'pas' } },
    desc: 'Moteur 200 pas/tour avec driver STEP/DIR : imprimante 3D, CNC, axe linéaire.',
    pins: [{ role: 'STEP', type: 'out', label: 'STEP' }, { role: 'DIR', type: 'out', label: 'DIR' }, { role: 'EN', type: 'out', label: 'EN (actif bas)' }],
    libs: [X.accel], inc: ['<AccelStepper.h>'], mA: 5, period: 3000, difficulty: 2,
    extraWiring: [{ pin: 'VMOT', to: 'alimentation 12 V + condensateur 100 µF', note: 'réglez le courant (potentiomètre Vref)' }, { pin: 'RESET + SLEEP', to: 'reliées entre elles' }],
    glob: C`AccelStepper $motor(AccelStepper::DRIVER, {{STEP}}, {{DIR}});
void $set(float steps) { $motor.moveTo((long)steps); }
void $on() { $motor.moveTo(800); }
void $off() { $motor.moveTo(0); }`,
    setup: C`$motor.setEnablePin({{EN}});
$motor.setPinsInverted(false, false, true);
$motor.setMaxSpeed(1600);
$motor.setAcceleration(800);
$motor.enableOutputs();`,
    tick: C`$motor.run();`,
    demo: C`if ($motor.distanceToGo() == 0) $motor.moveTo($motor.currentPosition() == 0 ? 3200 : 0);`,
    notes: ['Ne jamais débrancher le moteur quand le driver est alimenté (destruction du A4988).']
  });
  const hbridge = (id, name, desc, pins, glob, setup, extra) => add('motor', Object.assign({
    id, key: id, name, vcc: '5V', tags: ['moteur CC', 'pont en H', 'robot'], act: { on: true, off: true, set: { min: -100, max: 100, unit: '%' } }, desc,
    pins, mA: 10, peak_mA: 1500, period: 2000, difficulty: 2, glob, setup,
    demo: C`static const float seq[] = {60, 100, 0, -60, -100, 0};
static uint8_t i = 0;
$set(seq[i++ % 6]);
Serial.printf("# moteur : %.0f %%\n", $speed);`,
    notes: ['Alimentez les moteurs séparément (piles/batterie), GND commun avec l\'ESP32.']
  }, extra));
  hbridge('l298n', 'Pont en H L298N (moteur CC)', 'Double pont en H 2 A : sens et vitesse de deux moteurs à courant continu.',
    [{ role: 'ENA', type: 'pwm', label: 'ENA (retirer le cavalier)' }, { role: 'IN1', type: 'out' }, { role: 'IN2', type: 'out' }],
    C`float $speed = 0;
void $set(float pct) {
  $speed = constrain(pct, -100.0f, 100.0f);
  digitalWrite({{IN1}}, $speed > 0);
  digitalWrite({{IN2}}, $speed < 0);
  ledcWrite({{ENA}}, (uint32_t)(fabsf($speed) * 255.0f / 100.0f));
}
void $on() { $set(100); }
void $off() { $set(0); }`,
    C`pinMode({{IN1}}, OUTPUT);
pinMode({{IN2}}, OUTPUT);
ledcAttach({{ENA}}, 1000, 8);
$off();`, { notes: ['Le L298N perd ~2 V : alimentez-le en 7-12 V pour des moteurs 6 V.', 'GND commun avec l\'ESP32.'] });
  hbridge('tb6612', 'Driver TB6612FNG (moteur CC)', 'Driver MOSFET efficace 1,2 A par voie, idéal pour petits robots.',
    [{ role: 'PWMA', type: 'pwm' }, { role: 'AIN1', type: 'out' }, { role: 'AIN2', type: 'out' }, { role: 'STBY', type: 'out' }],
    C`float $speed = 0;
void $set(float pct) {
  $speed = constrain(pct, -100.0f, 100.0f);
  digitalWrite({{AIN1}}, $speed > 0);
  digitalWrite({{AIN2}}, $speed < 0);
  ledcWrite({{PWMA}}, (uint32_t)(fabsf($speed) * 255.0f / 100.0f));
}
void $on() { $set(100); }
void $off() { $set(0); }`,
    C`pinMode({{AIN1}}, OUTPUT);
pinMode({{AIN2}}, OUTPUT);
pinMode({{STBY}}, OUTPUT);
digitalWrite({{STBY}}, HIGH);
ledcAttach({{PWMA}}, 20000, 8);
$off();`);
  hbridge('drv8833', 'Driver DRV8833 (moteur CC)', 'Double pont en H basse tension (2,7-10,8 V), commande par deux PWM.',
    [{ role: 'IN1', type: 'pwm' }, { role: 'IN2', type: 'pwm' }],
    C`float $speed = 0;
void $set(float pct) {
  $speed = constrain(pct, -100.0f, 100.0f);
  uint32_t d = (uint32_t)(fabsf($speed) * 255.0f / 100.0f);
  ledcWrite({{IN1}}, $speed > 0 ? d : 0);
  ledcWrite({{IN2}}, $speed < 0 ? d : 0);
}
void $on() { $set(100); }
void $off() { $set(0); }`,
    C`ledcAttach({{IN1}}, 20000, 8);
ledcAttach({{IN2}}, 20000, 8);
$off();`);
  hbridge('l9110s', 'Driver L9110S (moteur CC)', 'Petit double pont en H 800 mA très économique.',
    [{ role: 'IA', type: 'pwm', label: 'A-IA' }, { role: 'IB', type: 'pwm', label: 'A-IB' }],
    C`float $speed = 0;
void $set(float pct) {
  $speed = constrain(pct, -100.0f, 100.0f);
  uint32_t d = (uint32_t)(fabsf($speed) * 255.0f / 100.0f);
  ledcWrite({{IA}}, $speed > 0 ? d : 0);
  ledcWrite({{IB}}, $speed < 0 ? d : 0);
}
void $on() { $set(100); }
void $off() { $set(0); }`,
    C`ledcAttach({{IA}}, 1000, 8);
ledcAttach({{IB}}, 1000, 8);
$off();`);
  hbridge('bts7960', 'Driver BTS7960 43 A (moteur puissant)', 'Pont en H de puissance pour trottinette, portail, grosse pompe.',
    [{ role: 'RPWM', type: 'pwm' }, { role: 'LPWM', type: 'pwm' }, { role: 'EN', type: 'out', label: 'R_EN + L_EN' }],
    C`float $speed = 0;
void $set(float pct) {
  $speed = constrain(pct, -100.0f, 100.0f);
  uint32_t d = (uint32_t)(fabsf($speed) * 255.0f / 100.0f);
  ledcWrite({{RPWM}}, $speed > 0 ? d : 0);
  ledcWrite({{LPWM}}, $speed < 0 ? d : 0);
}
void $on() { $set(100); }
void $off() { $set(0); }`,
    C`pinMode({{EN}}, OUTPUT);
digitalWrite({{EN}}, HIGH);
ledcAttach({{RPWM}}, 20000, 8);
ledcAttach({{LPWM}}, 20000, 8);
$off();`, { peak_mA: 5, difficulty: 3, notes: ['Fusible et câblage de section adaptée côté puissance.'] });
  add('motor', {
    id: 'pca9685', key: 'pca', name: 'PCA9685 (16 servos I2C)', bus: 'i2c', addr: ['0x40'], vcc: '3V3', tags: ['servo', 'PWM', '16 canaux', 'I2C'], act: { on: true, off: true, set: { min: 0, max: 180, unit: '°' } },
    desc: 'Contrôleur 16 voies PWM 12 bits : bras robot, hexapode, jeux de lumière.',
    pins: I2C, libs: [X.pca9685, X.busio], inc: ['<Adafruit_PWMServoDriver.h>'], mA: 10, period: 1500, difficulty: 2,
    params: { ch: { def: '0', label: 'Canal du servo (0-15)' } },
    extraWiring: [{ pin: 'V+ (bornier)', to: 'alimentation 5-6 V des servos' }],
    glob: C`Adafruit_PWMServoDriver $pwm(0x40, Wire);
void $set(float deg) {
  deg = constrain(deg, 0.0f, 180.0f);
  $pwm.writeMicroseconds({{P:ch}}, (uint16_t)(500 + deg * 2000.0f / 180.0f));
}
void $on() { $set(180); }
void $off() { $set(0); }`,
    setup: C`$pwm.begin();
$pwm.setOscillatorFrequency(27000000);
$pwm.setPWMFreq(50);`,
    demo: C`static uint8_t i = 0;
static const float a[] = {0, 90, 180, 90};
for (uint8_t ch = 0; ch < 16; ch++) $pwm.writeMicroseconds(ch, (uint16_t)(500 + a[i % 4] * 2000.0f / 180.0f));
i++;`
  });

  /* ---------------- Son ---------------- */
  add('act', {
    id: 'dfplayer', key: 'mp3', name: 'Lecteur MP3 DFPlayer Mini', uart: true, vcc: '5V', tags: ['MP3', 'son', 'audio', 'UART'], act: { on: true, off: true, set: { min: 0, max: 30, unit: 'volume' } },
    desc: 'Lit des fichiers MP3 depuis une microSD vers un haut-parleur 3 W : annonces vocales, alarme sonore.',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TX du DFPlayer' }, { role: 'TX', type: 'uart_tx', label: 'RX du DFPlayer (via 1 kΩ)' }],
    libs: [X.dfplayer], inc: ['<DFRobotDFPlayerMini.h>'], needOk: true, mA: 20, peak_mA: 300, period: 15000, difficulty: 2,
    extraWiring: [{ pin: 'SPK1 / SPK2', to: 'haut-parleur 4-8 Ω, 3 W max' }],
    glob: C`DFRobotDFPlayerMini $mp3;
uint8_t $track = 1;
void $set(float vol) { $mp3.volume((uint8_t)constrain(vol, 0.0f, 30.0f)); }
void $on() { $mp3.play(1); }
void $off() { $mp3.stop(); }`,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});
$ok = $mp3.begin({{SER}}, true, true);
if ($ok) $mp3.volume(18);`,
    demo: C`$mp3.play($track);
Serial.printf("# lecture de la piste %u\n", $track);
$track = $track % 3 + 1;`,
    notes: ['Fichiers nommés 0001.mp3, 0002.mp3… sur une microSD FAT32 ≤ 32 Go.']
  });
  add('act', {
    id: 'max98357', key: 'amp', name: 'Ampli I2S MAX98357A + haut-parleur', vcc: '5V', tags: ['audio', 'I2S', 'haut-parleur', 'son'], act: { on: true, off: true, set: { min: 100, max: 4000, unit: 'Hz' } },
    desc: 'Amplificateur numérique 3 W classe D : génère un signal sinusoïdal par I2S (sirène, notes).',
    pins: [{ role: 'BCLK', type: 'i2s', label: 'BCLK' }, { role: 'LRC', type: 'i2s', label: 'LRC' }, { role: 'DIN', type: 'i2s', label: 'DIN' }],
    inc: ['<ESP_I2S.h>'], needOk: true, mA: 5, peak_mA: 650, period: 700, difficulty: 3,
    glob: C`I2SClass $i2s;
float $freq = 440;
bool $playing = false;
void $set(float hz) { $freq = constrain(hz, 50.0f, 8000.0f); $playing = true; }
void $on() { $playing = true; }
void $off() { $playing = false; }`,
    setup: C`$i2s.setPins({{BCLK}}, {{LRC}}, {{DIN}});
$ok = $i2s.begin(I2S_MODE_STD, 16000, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO);`,
    tick: C`if ($playing) {
  static float phase = 0;
  int16_t buf[128];
  for (int i = 0; i < 128; i++) {
    buf[i] = (int16_t)(sinf(phase) * 6000);
    phase += 2.0f * PI * $freq / 16000.0f;
    if (phase > 2.0f * PI) phase -= 2.0f * PI;
  }
  $i2s.write((uint8_t *)buf, sizeof(buf));
}`,
    demo: C`$playing = true;
$freq = ($freq > 600) ? 440 : 880;          // sirène deux tons`
  });
  add('act', {
    id: 'dac_internal', key: 'dac', name: 'Convertisseur N/A interne (DAC 8 bits)', boards: ['esp32'], tags: ['DAC', 'tension', 'signal', 'analogique'], act: { on: true, off: true, set: { min: 0, max: 3.3, unit: 'V' } },
    desc: 'Sortie de tension analogique vraie (0-3,3 V, 8 bits) sur GPIO25/26 : générateur de signal.',
    pins: [{ role: 'OUT', type: 'dac', label: 'sortie DAC' }], mA: 1, period: 10,
    glob: C`float $volt = 0;
void $set(float v) { $volt = constrain(v, 0.0f, 3.3f); dacWrite({{OUT}}, (uint8_t)($volt * 255.0f / 3.3f)); }
void $on() { $set(3.3f); }
void $off() { $set(0); }`,
    demo: C`static float t = 0;
t += 0.05f;
$set(1.65f + 1.6f * sinf(t));   // sinusoïde lente`
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* Modules « Extensions d'E/S & convertisseurs ». */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const M = (LAB.MODULES = LAB.MODULES || []);
  const X = LAB.LIBS;
  const C = String.raw;
  const I2C = [{ role: 'SDA', bus: 'sda' }, { role: 'SCL', bus: 'scl' }];
  const add = (m) => M.push(Object.assign({ cat: 'io', difficulty: 2, vcc: '3V3', mA: 1, period: 1000 }, m));

  add({
    id: 'mcp23017', key: 'mcp', name: 'MCP23017 (16 E/S I2C)', bus: 'i2c', addr: ['0x20'], tags: ['extension', 'GPIO', 'I2C'],
    desc: 'Ajoute 16 entrées/sorties numériques par I2C (jusqu\'à 8 puces, 128 E/S).',
    pins: I2C, libs: [X.mcp23017, X.busio], inc: ['<Adafruit_MCP23X17.h>'], needOk: true, period: 500,
    params: { addr: { def: '0x20', label: 'Adresse (A0-A2)', opts: ['0x20', '0x21', '0x22', '0x23', '0x24', '0x25', '0x26', '0x27'] } },
    glob: C`Adafruit_MCP23X17 $mcp;
uint8_t $step = 0;`,
    setup: C`$ok = $mcp.begin_I2C({{P:addr}}, &Wire);
if ($ok) {
  for (uint8_t p = 0; p < 8; p++) $mcp.pinMode(p, OUTPUT);          // GPA0-7 : sorties (LED)
  for (uint8_t p = 8; p < 16; p++) $mcp.pinMode(p, INPUT_PULLUP);   // GPB0-7 : entrées (boutons)
}`,
    loop: C`for (uint8_t p = 0; p < 8; p++) $mcp.digitalWrite(p, p == ($step % 8));   // chenillard sur GPA
$step++;
uint16_t in = 0;
for (uint8_t p = 8; p < 16; p++) if (!$mcp.digitalRead(p)) in |= 1 << (p - 8);
$inputs = in;`,
    outs: [{ k: 'inputs', u: '', l: 'Entrées GPB (masque)' }]
  });
  add({
    id: 'pcf8574', key: 'pcf', name: 'PCF8574 (8 E/S I2C)', bus: 'i2c', addr: ['0x20', '0x27', '0x38'], tags: ['extension', 'GPIO', 'I2C', 'sans bibliothèque'],
    desc: 'Extension 8 E/S quasi-bidirectionnelles (le module des écrans LCD I2C).',
    pins: I2C, needOk: true, period: 500,
    params: { addr: { def: '0x20', label: 'Adresse', opts: ['0x20', '0x21', '0x22', '0x23', '0x24', '0x25', '0x26', '0x27', '0x38', '0x39'] } },
    glob: C`uint8_t $step = 0;
bool $write(uint8_t v) { Wire.beginTransmission((uint8_t){{P:addr}}); Wire.write(v); return Wire.endTransmission() == 0; }
int $read() { return Wire.requestFrom((uint8_t){{P:addr}}, (uint8_t)1) == 1 ? Wire.read() : -1; }`,
    setup: C`$ok = $write(0xF0);    // P0-P3 sorties à 0, P4-P7 à 1 (entrées)`,
    loop: C`$write(0xF0 | (1 << ($step++ % 4)));  // chenillard P0-P3
int r = $read();
if (r >= 0) $inputs = (~r >> 4) & 0x0F;  // P4-P7 : bouton vers GND = 1`,
    outs: [{ k: 'inputs', u: '', l: 'Entrées P4-P7' }]
  });
  add({
    id: 'hc595', key: 'sr595', name: 'Registre à décalage 74HC595', tags: ['sorties', 'registre', 'LED'],
    desc: '8 sorties supplémentaires avec 3 fils (chaînable) : barregraphe, afficheurs.',
    pins: [{ role: 'DS', type: 'out', label: 'DS (14)' }, { role: 'SHCP', type: 'out', label: 'SH_CP (11)' }, { role: 'STCP', type: 'out', label: 'ST_CP (12)' }], period: 150, difficulty: 1,
    glob: C`uint8_t $value = 1;
void $write(uint8_t v) {
  digitalWrite({{STCP}}, LOW);
  shiftOut({{DS}}, {{SHCP}}, MSBFIRST, v);
  digitalWrite({{STCP}}, HIGH);
}`,
    setup: C`pinMode({{DS}}, OUTPUT);
pinMode({{SHCP}}, OUTPUT);
pinMode({{STCP}}, OUTPUT);
$write(0);`,
    loop: C`$write($value);
$value = ($value << 1) | ($value >> 7);   // rotation : chenillard`,
    extraWiring: [{ pin: 'MR (10)', to: '3V3' }, { pin: 'OE (13)', to: 'GND' }]
  });
  add({
    id: 'hc165', key: 'sr165', name: 'Registre d\'entrée 74HC165', tags: ['entrées', 'registre', 'boutons'],
    desc: '8 entrées numériques supplémentaires avec 3 fils (chaînable) : clavier de boutons.',
    pins: [{ role: 'PL', type: 'out', label: 'PL (1)' }, { role: 'CP', type: 'out', label: 'CP (2)' }, { role: 'Q7', type: 'in', label: 'Q7 (9)' }], period: 100, difficulty: 1,
    extraWiring: [{ pin: 'CE (15)', to: 'GND' }, { pin: 'entrées D0-D7', to: '10 kΩ vers GND + bouton vers 3V3' }],
    setup: C`pinMode({{PL}}, OUTPUT);
pinMode({{CP}}, OUTPUT);
pinMode({{Q7}}, INPUT);
digitalWrite({{PL}}, HIGH);`,
    loop: C`digitalWrite({{PL}}, LOW);
delayMicroseconds(5);
digitalWrite({{PL}}, HIGH);
$inputs = shiftIn({{Q7}}, {{CP}}, MSBFIRST);`,
    outs: [{ k: 'inputs', u: '', l: 'Entrées (masque)' }], print: 'change'
  });
  add({
    id: 'cd74hc4067', key: 'mux', name: 'Multiplexeur analogique CD74HC4067 (16 voies)', tags: ['multiplexeur', 'analogique', '16 voies'],
    desc: 'Lit 16 capteurs analogiques sur une seule entrée ADC grâce à 4 lignes de sélection.',
    pins: [{ role: 'S0', type: 'out' }, { role: 'S1', type: 'out' }, { role: 'S2', type: 'out' }, { role: 'S3', type: 'out' }, { role: 'SIG', type: 'adc', label: 'SIG' }], period: 500,
    glob: C`float $read(uint8_t ch) {
  digitalWrite({{S0}}, ch & 1); digitalWrite({{S1}}, (ch >> 1) & 1);
  digitalWrite({{S2}}, (ch >> 2) & 1); digitalWrite({{S3}}, (ch >> 3) & 1);
  delayMicroseconds(50);
  return analogReadMilliVolts({{SIG}});
}`,
    setup: C`pinMode({{S0}}, OUTPUT); pinMode({{S1}}, OUTPUT);
pinMode({{S2}}, OUTPUT); pinMode({{S3}}, OUTPUT);`,
    loop: C`$c0 = $read(0);
$c1 = $read(1);
$c2 = $read(2);
$c3 = $read(3);`,
    outs: [{ k: 'c0', u: 'mV', l: 'Voie 0' }, { k: 'c1', u: 'mV', l: 'Voie 1' }, { k: 'c2', u: 'mV', l: 'Voie 2' }, { k: 'c3', u: 'mV', l: 'Voie 3' }],
    extraWiring: [{ pin: 'EN', to: 'GND' }]
  });
  add({
    id: 'ads1115', key: 'ads', name: 'ADS1115 (CAN 16 bits, 4 voies)', bus: 'i2c', addr: ['0x48', '0x49', '0x4A', '0x4B'], tags: ['ADC', 'précision', 'analogique', 'I2C'],
    desc: 'Convertisseur analogique-numérique 16 bits avec gain programmable : bien plus précis que l\'ADC interne.',
    pins: I2C, libs: [X.ads1x15, X.busio], inc: ['<Adafruit_ADS1X15.h>'], needOk: true, period: 500,
    glob: C`Adafruit_ADS1115 $ads;`,
    setup: C`$ok = $ads.begin(0x48, &Wire);
if ($ok) $ads.setGain(GAIN_ONE);    // ±4,096 V`,
    loop: C`$a0 = $ads.computeVolts($ads.readADC_SingleEnded(0));
$a1 = $ads.computeVolts($ads.readADC_SingleEnded(1));
$a2 = $ads.computeVolts($ads.readADC_SingleEnded(2));
$a3 = $ads.computeVolts($ads.readADC_SingleEnded(3));`,
    outs: [{ k: 'a0', u: 'V', l: 'A0' }, { k: 'a1', u: 'V', l: 'A1' }, { k: 'a2', u: 'V', l: 'A2' }, { k: 'a3', u: 'V', l: 'A3' }],
    notes: ['Ne dépassez jamais VDD + 0,3 V sur une entrée, quel que soit le gain.']
  });
  add({
    id: 'pcf8591', key: 'pcf8591', name: 'PCF8591 (CAN/CNA 8 bits)', bus: 'i2c', addr: ['0x48'], tags: ['ADC', 'DAC', 'I2C', 'sans bibliothèque'],
    desc: 'Module 4 entrées analogiques + 1 sortie (souvent livré avec LDR, thermistance et potentiomètre).',
    pins: I2C, needOk: true, period: 500,
    glob: C`int $ch(uint8_t c) {
  Wire.beginTransmission((uint8_t)0x48);
  Wire.write(0x40 | c);                     // sortie analogique active + canal
  if (Wire.endTransmission() != 0) return -1;
  Wire.requestFrom((uint8_t)0x48, (uint8_t)2);
  Wire.read();                              // octet de la conversion précédente
  return Wire.read();
}`,
    setup: C`Wire.beginTransmission((uint8_t)0x48);
$ok = Wire.endTransmission() == 0;`,
    loop: C`$ain0 = $ch(0);
$ain1 = $ch(1);
$ain2 = $ch(2);
$ain3 = $ch(3);`,
    outs: [{ k: 'ain0', u: '', l: 'AIN0' }, { k: 'ain1', u: '', l: 'AIN1' }, { k: 'ain2', u: '', l: 'AIN2' }, { k: 'ain3', u: '', l: 'AIN3' }]
  });
  add({
    id: 'mcp4725', key: 'mcp4725', name: 'MCP4725 (CNA 12 bits I2C)', bus: 'i2c', addr: ['0x60', '0x62'], tags: ['DAC', 'tension', 'I2C'], act: { on: true, off: true, set: { min: 0, max: 3.3, unit: 'V' } },
    desc: 'Sortie de tension analogique 12 bits (0-VCC) avec mémoire EEPROM de la valeur au démarrage.',
    pins: I2C, libs: [X.mcp4725, X.busio], inc: ['<Adafruit_MCP4725.h>'], needOk: true, period: 20,
    glob: C`Adafruit_MCP4725 $dac;
float $volt = 0;
void $set(float v) { $volt = constrain(v, 0.0f, 3.3f); $dac.setVoltage((uint16_t)($volt * 4095.0f / 3.3f), false); }
void $on() { $set(3.3f); }
void $off() { $set(0); }`,
    setup: C`$ok = $dac.begin(0x60, &Wire);`,
    demo: C`static float t = 0;
t += 0.05f;
$set(1.65f + 1.6f * sinf(t));`
  });
  add({
    id: 'tca9548a', key: 'tca', name: 'Multiplexeur I2C TCA9548A (8 bus)', bus: 'i2c', addr: ['0x70'], tags: ['I2C', 'multiplexeur', 'conflit d\'adresse'],
    desc: 'Permet de brancher plusieurs capteurs ayant la même adresse I2C : scanne ses 8 sous-bus.',
    pins: I2C, needOk: true, period: 10000,
    glob: C`void $select(uint8_t bus) { Wire.beginTransmission((uint8_t)0x70); Wire.write(1 << bus); Wire.endTransmission(); }`,
    setup: C`Wire.beginTransmission((uint8_t)0x70);
$ok = Wire.endTransmission() == 0;`,
    loop: C`int found = 0;
for (uint8_t b = 0; b < 8; b++) {
  $select(b);
  for (uint8_t a = 1; a < 127; a++) {
    if (a == 0x70) continue;
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) { Serial.printf("# bus %u : périphérique 0x%02X\n", b, a); found++; }
  }
}
$devices = found;`,
    outs: [{ k: 'devices', u: '', l: 'Périphériques trouvés' }]
  });
  add({
    id: 'i2c_scanner', key: 'scan', name: 'Scanner I2C (diagnostic)', bus: 'i2c', tags: ['I2C', 'diagnostic', 'débutant'], cat: 'io', difficulty: 1,
    desc: 'Liste les adresses I2C présentes sur le bus et identifie les puces courantes.',
    pins: I2C, period: 5000,
    glob: C`const char *$guess(uint8_t a) {
  switch (a) {
    case 0x23: return "BH1750"; case 0x27: case 0x3F: return "LCD I2C (PCF8574)";
    case 0x29: return "VL53L0X / TCS34725 / TSL2591"; case 0x38: return "AHT10/20"; case 0x3C: case 0x3D: return "OLED SSD1306/SH1106";
    case 0x40: return "INA219 / HTU21D / PCA9685 / Si7021"; case 0x44: case 0x45: return "SHT3x / SHT4x";
    case 0x48: return "ADS1115 / TMP102 / LM75"; case 0x50: case 0x57: return "EEPROM AT24Cxx"; case 0x53: return "ADXL345 / ENS160";
    case 0x5A: return "MLX90614 / CCS811 / MPR121"; case 0x60: return "MCP4725 / Si1145";
    case 0x62: return "SCD40"; case 0x68: return "MPU6050 / DS3231 / DS1307"; case 0x69: return "MPU6050 (AD0) / AMG8833";
    case 0x76: case 0x77: return "BME280 / BMP280 / BME680 / MS5611";
    default: return "";
  }
}`,
    loop: C`int n = 0;
for (uint8_t a = 1; a < 127; a++) {
  Wire.beginTransmission(a);
  if (Wire.endTransmission() == 0) { Serial.printf("# 0x%02X %s\n", a, $guess(a)); n++; }
}
Serial.printf("# %d périphérique(s)\n", n);
$count = n;`,
    outs: [{ k: 'count', u: '', l: 'Périphériques' }]
  });
  add({
    id: 'stemma_soil', key: 'ssoil', name: 'Adafruit STEMMA Soil Sensor (seesaw)', cat: 'weather', bus: 'i2c', addr: ['0x36'], tags: ['sol', 'capacitif', 'I2C', 'jardin'],
    desc: 'Sonde capacitive I2C : humidité du sol et température, sans ADC.',
    pins: I2C, libs: [X.seesaw, X.busio], inc: ['<Adafruit_seesaw.h>'], needOk: true, period: 2000, difficulty: 1,
    glob: C`Adafruit_seesaw $ss(&Wire);`,
    setup: C`$ok = $ss.begin(0x36);`,
    loop: C`$cap = $ss.touchRead(0);           // 200 (sec) à 2000 (très humide)
$temp = $ss.getTemp();
$moist = constrain(($cap - 300.0f) * 100.0f / 700.0f, 0.0f, 100.0f);`,
    outs: [{ k: 'moist', u: '%', l: 'Humidité du sol' }, { k: 'cap', u: '', l: 'Capacité brute' }, { k: 'temp', u: '°C', l: 'Température' }]
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* Modules « Afficheurs ». Un afficheur montre automatiquement toutes les mesures du projet
 * (table lab_outs générée par le Studio), page par page ; seul, il affiche une démo. */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const M = (LAB.MODULES = LAB.MODULES || []);
  const X = LAB.LIBS;
  const C = String.raw;
  const I2C = [{ role: 'SDA', bus: 'sda' }, { role: 'SCL', bus: 'scl' }];
  const SPI = [{ role: 'SCK', bus: 'sck' }, { role: 'MOSI', bus: 'mosi', label: 'SDA/MOSI' }];
  const add = (m) => M.push(Object.assign({ cat: 'display', difficulty: 1, vcc: '3V3', mA: 20, period: 2000, usesOuts: true }, m));

  // Conversion UTF-8 → ASCII pour les polices des écrans (accents, °, µ, indices).
  const ASCII = (deg) => C`String $ascii(const char *s) {
  String o;
  const uint8_t *p = (const uint8_t *)s;
  while (*p) {
    uint8_t c = *p++;
    if (c < 0x80) { o += (char)c; continue; }
    uint8_t d = *p ? *p++ : 0;
    if (c == 0xC2 && d == 0xB0) o += (char)${deg};                 // °
    else if ((c == 0xC2 && d == 0xB5) || (c == 0xCE && d == 0xBC)) o += 'u';   // µ
    else if (c == 0xC2 && d == 0xB2) o += '2';
    else if (c == 0xC2 && d == 0xB3) o += '3';
    else if (c == 0xC3) {
      if (d >= 0xA0 && d <= 0xA5) o += 'a'; else if (d == 0xA7) o += 'c'; else if (d >= 0xA8 && d <= 0xAB) o += 'e';
      else if (d >= 0xAC && d <= 0xAF) o += 'i'; else if (d >= 0xB2 && d <= 0xB6) o += 'o'; else if (d >= 0xB9 && d <= 0xBC) o += 'u';
      else if (d >= 0x80 && d <= 0x85) o += 'A'; else if (d == 0x87) o += 'C'; else if (d >= 0x88 && d <= 0x8B) o += 'E';
      else o += '?';
    } else if (c == 0xE2 && d == 0x82 && *p) { uint8_t e = *p++; o += (char)('0' + (e & 0x0F)); }   // ₀-₉
    else { while (*p && (*p & 0xC0) == 0x80) p++; o += '?'; }
  }
  return o;
}
String $line(int i) {
  char v[20];
  float x = lab_outs[i].value ? *lab_outs[i].value : NAN;
  if (isnan(x)) strcpy(v, "--");
  else if (fabsf(x) >= 1000) snprintf(v, sizeof(v), "%.0f", x);
  else snprintf(v, sizeof(v), "%.1f", x);
  return $ascii(lab_outs[i].label) + ": " + v + " " + $ascii(lab_outs[i].unit);
}`;

  // Corps commun pour les écrans graphiques Adafruit GFX
  const GFX_DRAW = (clear, show, lines, size, color) => C`${clear}
$d.setTextSize(${size});
$d.setTextColor(${color});
$d.setCursor(0, 0);
$d.println(F("ESP32 LAB"));
if (LAB_OUT_COUNT == 0) {
  $d.printf("Uptime %lus\n", (unsigned long)(millis() / 1000));
  $d.printf("RAM %luk\n", (unsigned long)(ESP.getFreeHeap() / 1024));
} else {
  static int page = 0;
  const int per = ${lines};
  int pages = (LAB_OUT_COUNT + per - 1) / per;
  if (page >= pages) page = 0;
  for (int i = page * per; i < LAB_OUT_COUNT && i < (page + 1) * per; i++) $d.println($line(i));
  page++;
}
${show}`;

  add({
    id: 'oled_ssd1306', key: 'oled', name: 'Écran OLED 0,96" SSD1306 128×64 (I2C)', bus: 'i2c', addr: ['0x3C', '0x3D'], tags: ['OLED', 'écran', 'I2C'],
    desc: 'Petit écran OLED monochrome très lisible : affiche automatiquement les mesures du projet.',
    pins: I2C, libs: [X.ssd1306, X.gfx, X.busio], inc: ['<Adafruit_GFX.h>', '<Adafruit_SSD1306.h>'], needOk: true,
    params: { addr: { def: '0x3C', label: 'Adresse I2C', opts: ['0x3C', '0x3D'] } },
    glob: C`Adafruit_SSD1306 $d(128, 64, &Wire, -1);
` + ASCII(248),
    setup: C`$ok = $d.begin(SSD1306_SWITCHCAPVCC, {{P:addr}});
if ($ok) { $d.cp437(true); $d.clearDisplay(); $d.display(); }`,
    loop: GFX_DRAW('$d.clearDisplay();', '$d.display();', 6, 1, 'SSD1306_WHITE')
  });
  add({
    id: 'oled_128x32', key: 'oled32', name: 'Écran OLED 0,91" SSD1306 128×32 (I2C)', bus: 'i2c', addr: ['0x3C'], tags: ['OLED', 'écran', 'I2C'],
    desc: 'Écran OLED bandeau 128×32 : trois lignes de mesures par page.',
    pins: I2C, libs: [X.ssd1306, X.gfx, X.busio], inc: ['<Adafruit_GFX.h>', '<Adafruit_SSD1306.h>'], needOk: true, mA: 12,
    glob: C`Adafruit_SSD1306 $d(128, 32, &Wire, -1);
` + ASCII(248),
    setup: C`$ok = $d.begin(SSD1306_SWITCHCAPVCC, 0x3C);
if ($ok) { $d.cp437(true); $d.clearDisplay(); $d.display(); }`,
    loop: GFX_DRAW('$d.clearDisplay();', '$d.display();', 3, 1, 'SSD1306_WHITE')
  });
  add({
    id: 'oled_sh1106', key: 'sh1106', name: 'Écran OLED 1,3" SH1106 128×64 (I2C)', bus: 'i2c', addr: ['0x3C'], tags: ['OLED', 'écran', 'I2C'],
    desc: 'Écran OLED 1,3 pouce (contrôleur SH1106, souvent confondu avec le SSD1306).',
    pins: I2C, libs: [X.sh110x, X.gfx, X.busio], inc: ['<Adafruit_GFX.h>', '<Adafruit_SH110X.h>'], needOk: true,
    glob: C`Adafruit_SH1106G $d(128, 64, &Wire, -1);
` + ASCII(248),
    setup: C`$ok = $d.begin(0x3C, true);
if ($ok) { $d.cp437(true); $d.clearDisplay(); $d.display(); }`,
    loop: GFX_DRAW('$d.clearDisplay();', '$d.display();', 6, 1, 'SH110X_WHITE'),
    notes: ['Si l\'image est décalée de 2 pixels avec la bibliothèque SSD1306, c\'est un SH1106 : utilisez ce module.']
  });
  add({
    id: 'tft_st7735', key: 'st7735', name: 'Écran couleur TFT 1,8" ST7735 128×160 (SPI)', bus: 'spi', tags: ['TFT', 'couleur', 'écran', 'SPI'],
    desc: 'Écran couleur SPI 1,8 pouce : mesures en grands caractères colorés.',
    pins: SPI.concat([{ role: 'CS', type: 'cs', label: 'CS' }, { role: 'DC', type: 'out', label: 'A0/DC' }, { role: 'RST', type: 'out', label: 'RESET' }]),
    libs: [X.st7735, X.gfx, X.busio], inc: ['<Adafruit_GFX.h>', '<Adafruit_ST7735.h>'], mA: 50,
    extraWiring: [{ pin: 'LED', to: '3V3 (rétroéclairage)' }],
    glob: C`Adafruit_ST7735 $d({{CS}}, {{DC}}, {{RST}});
` + ASCII(248),
    setup: C`$d.initR(INITR_BLACKTAB);
$d.setRotation(1);
$d.cp437(true);
$d.fillScreen(ST77XX_BLACK);`,
    loop: GFX_DRAW('$d.fillScreen(ST77XX_BLACK);', '', 7, 1, 'ST77XX_GREEN')
  });
  add({
    id: 'tft_st7789', key: 'st7789', name: 'Écran couleur IPS 1,3"/1,54" ST7789 240×240 (SPI)', bus: 'spi', tags: ['TFT', 'IPS', 'couleur', 'écran', 'SPI'],
    desc: 'Écran IPS carré haute définition, angles de vision larges.',
    pins: SPI.concat([{ role: 'CS', type: 'cs', label: 'CS (si présent)' }, { role: 'DC', type: 'out', label: 'DC' }, { role: 'RST', type: 'out', label: 'RES' }]),
    libs: [X.st7735, X.gfx, X.busio], inc: ['<Adafruit_GFX.h>', '<Adafruit_ST7789.h>'], mA: 60,
    extraWiring: [{ pin: 'BLK', to: '3V3 (rétroéclairage)' }],
    glob: C`Adafruit_ST7789 $d({{CS}}, {{DC}}, {{RST}});
` + ASCII(248),
    setup: C`$d.init(240, 240, SPI_MODE3);
$d.setRotation(2);
$d.cp437(true);
$d.fillScreen(ST77XX_BLACK);`,
    loop: GFX_DRAW('$d.fillScreen(ST77XX_BLACK);', '', 7, 2, 'ST77XX_CYAN')
  });
  add({
    id: 'tft_ili9341', key: 'ili9341', name: 'Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI)', bus: 'spi', tags: ['TFT', 'couleur', 'écran', 'SPI'],
    desc: 'Grand écran couleur 320×240 : tableau de bord lisible de loin.',
    pins: SPI.concat([{ role: 'MISO', bus: 'miso', label: 'SDO/MISO' }, { role: 'CS', type: 'cs', label: 'CS' }, { role: 'DC', type: 'out', label: 'DC' }, { role: 'RST', type: 'out', label: 'RESET' }]),
    libs: [X.ili9341, X.gfx, X.busio], inc: ['<Adafruit_GFX.h>', '<Adafruit_ILI9341.h>'], mA: 90,
    extraWiring: [{ pin: 'LED', to: '3V3 via 10-47 Ω' }],
    glob: C`Adafruit_ILI9341 $d({{CS}}, {{DC}}, {{RST}});
` + ASCII(248),
    setup: C`$d.begin();
$d.setRotation(1);
$d.cp437(true);
$d.fillScreen(ILI9341_BLACK);`,
    loop: GFX_DRAW('$d.fillScreen(ILI9341_BLACK);', '', 9, 2, 'ILI9341_YELLOW')
  });
  add({
    id: 'nokia5110', key: 'nokia', name: 'Écran Nokia 5110 PCD8544 84×48 (SPI)', bus: 'spi', tags: ['LCD', 'écran', 'rétro', 'SPI'],
    desc: 'L\'écran du téléphone Nokia 3310 : très basse consommation, rétroéclairage bleu.',
    pins: SPI.concat([{ role: 'CS', type: 'cs', label: 'CE' }, { role: 'DC', type: 'out', label: 'DC' }, { role: 'RST', type: 'out', label: 'RST' }]),
    libs: [X.pcd8544, X.gfx, X.busio], inc: ['<Adafruit_GFX.h>', '<Adafruit_PCD8544.h>'], mA: 5,
    glob: C`Adafruit_PCD8544 $d({{DC}}, {{CS}}, {{RST}});
` + ASCII(248),
    setup: C`$d.begin(50);
$d.cp437(true);
$d.clearDisplay();
$d.display();`,
    loop: GFX_DRAW('$d.clearDisplay();', '$d.display();', 5, 1, 'BLACK')
  });
  const lcd = (id, name, cols, rows, desc) => add({
    id, key: id, name, bus: 'i2c', addr: ['0x27', '0x3F'], vcc: '5V', tags: ['LCD', 'HD44780', 'écran', 'I2C'], desc,
    pins: I2C, libs: [X.lcdi2c], inc: ['<LiquidCrystal_I2C.h>'], mA: 30,
    params: { addr: { def: '0x27', label: 'Adresse (0x27 PCF8574T, 0x3F PCF8574AT)', opts: ['0x27', '0x3F'] } },
    glob: C`LiquidCrystal_I2C $d({{P:addr}}, ${cols}, ${rows});
` + ASCII('0xDF'),
    setup: C`$d.init();
$d.backlight();
$d.clear();
$d.print("ESP32 LAB");`,
    loop: C`$d.clear();
if (LAB_OUT_COUNT == 0) {
  $d.setCursor(0, 0); $d.print("ESP32 LAB");
  $d.setCursor(0, 1); $d.printf("Uptime %lus", (unsigned long)(millis() / 1000));
} else {
  static int page = 0;
  int pages = (LAB_OUT_COUNT + ${rows} - 1) / ${rows};
  if (page >= pages) page = 0;
  for (int r = 0; r < ${rows}; r++) {
    int i = page * ${rows} + r;
    if (i >= LAB_OUT_COUNT) break;
    $d.setCursor(0, r);
    $d.print($line(i).substring(0, ${cols}));
  }
  page++;
}`,
    notes: ['Réglez le contraste avec le potentiomètre bleu au dos du module.', 'Le module est alimenté en 5 V ; ses lignes I2C tirées au 5 V sont en pratique tolérées, sinon utilisez un convertisseur de niveau.']
  });
  lcd('lcd1602', 'Écran LCD 16×2 + module I2C', 16, 2, 'L\'écran à cristaux liquides le plus répandu, piloté par 2 fils grâce au module PCF8574.');
  lcd('lcd2004', 'Écran LCD 20×4 + module I2C', 20, 4, 'Grand écran texte 4 lignes de 20 caractères.');
  add({
    id: 'tm1637', key: 'seg4', name: 'Afficheur 4 chiffres TM1637', vcc: '3V3', tags: ['7 segments', 'horloge', 'afficheur'],
    desc: 'Afficheur 7 segments 4 chiffres avec deux-points : montre la première mesure du projet (ou un compteur).',
    pins: [{ role: 'CLK', type: 'out', label: 'CLK' }, { role: 'DIO', type: 'out', label: 'DIO' }], libs: [X.tm1637], inc: ['<TM1637Display.h>'], period: 500,
    glob: C`TM1637Display $d({{CLK}}, {{DIO}});`,
    setup: C`$d.setBrightness(4);
$d.clear();`,
    loop: C`if (LAB_OUT_COUNT > 0 && lab_outs[0].value && !isnan(*lab_outs[0].value)) {
  float v = *lab_outs[0].value;
  if (fabsf(v) < 100) $d.showNumberDecEx((int)lroundf(v * 10), 0b00100000, false);   // 1 décimale
  else $d.showNumberDec((int)lroundf(v));
} else {
  $d.showNumberDecEx((millis() / 1000) % 10000, 0b01000000, true);
}`
  });
  const max7219 = C`void $send(uint8_t reg, uint8_t val) {
  digitalWrite({{CS}}, LOW);
  shiftOut({{DIN}}, {{CLK}}, MSBFIRST, reg);
  shiftOut({{DIN}}, {{CLK}}, MSBFIRST, val);
  digitalWrite({{CS}}, HIGH);
}`;
  add({
    id: 'max7219_matrix', key: 'matrix', name: 'Matrice LED 8×8 MAX7219', vcc: '5V', tags: ['matrice', 'LED', 'MAX7219'],
    desc: 'Matrice de 64 LED : barregraphe de la première mesure ou animation.',
    pins: [{ role: 'DIN', type: 'out', label: 'DIN' }, { role: 'CS', type: 'out', label: 'CS' }, { role: 'CLK', type: 'out', label: 'CLK' }], period: 150, mA: 80, peak_mA: 320,
    params: { min: { def: '0', label: 'Valeur mini (barregraphe)' }, max: { def: '40', label: 'Valeur maxi' } },
    glob: max7219 + C`
uint8_t $frame = 0;`,
    setup: C`pinMode({{DIN}}, OUTPUT); pinMode({{CS}}, OUTPUT); pinMode({{CLK}}, OUTPUT);
digitalWrite({{CS}}, HIGH);
$send(0x0F, 0); $send(0x09, 0); $send(0x0B, 7); $send(0x0A, 3); $send(0x0C, 1);`,
    loop: C`if (LAB_OUT_COUNT > 0 && lab_outs[0].value && !isnan(*lab_outs[0].value)) {
  int h = constrain((int)((*lab_outs[0].value - {{P:min}}) * 8.0f / ({{P:max}} - {{P:min}})), 0, 8);
  for (uint8_t row = 0; row < 8; row++) $send(row + 1, row < h ? 0xFF : 0x00);
} else {
  for (uint8_t row = 0; row < 8; row++) $send(row + 1, (uint8_t)(1 << ((row + $frame) % 8)) | (uint8_t)(0x80 >> ((row + $frame) % 8)));
  $frame++;
}`
  });
  add({
    id: 'max7219_7seg', key: 'seg8', name: 'Afficheur 8 chiffres MAX7219', vcc: '5V', tags: ['7 segments', 'MAX7219', 'afficheur'],
    desc: 'Barrette 8 chiffres 7 segments : affiche la première mesure avec une décimale.',
    pins: [{ role: 'DIN', type: 'out', label: 'DIN' }, { role: 'CS', type: 'out', label: 'CS' }, { role: 'CLK', type: 'out', label: 'CLK' }], period: 500, mA: 60,
    glob: max7219,
    setup: C`pinMode({{DIN}}, OUTPUT); pinMode({{CS}}, OUTPUT); pinMode({{CLK}}, OUTPUT);
digitalWrite({{CS}}, HIGH);
$send(0x0F, 0); $send(0x09, 0xFF); $send(0x0B, 7); $send(0x0A, 5); $send(0x0C, 1);`,
    loop: C`long n;
bool dp = false;
if (LAB_OUT_COUNT > 0 && lab_outs[0].value && !isnan(*lab_outs[0].value)) { n = lroundf(*lab_outs[0].value * 10); dp = true; }
else n = millis() / 1000;
bool neg = n < 0;
n = labs(n);
for (uint8_t d = 1; d <= 8; d++) {
  uint8_t v = (n == 0 && d > (dp ? 2 : 1)) ? 0x0F : n % 10;          // 0x0F = blanc
  if (neg && n == 0 && d > (dp ? 2 : 1)) { v = 0x0A; neg = false; }    // 0x0A = signe moins
  if (dp && d == 2) v |= 0x80;
  $send(d, v);
  n /= 10;
}`
  });
  add({
    id: 'ht16k33_7seg', key: 'ht16k33', name: 'Afficheur 4 chiffres HT16K33 (I2C)', bus: 'i2c', addr: ['0x70'], tags: ['7 segments', 'I2C', 'afficheur'],
    desc: 'Afficheur 7 segments « backpack » Adafruit sur I2C.',
    pins: I2C, libs: [X.backpack, X.gfx, X.busio], inc: ['<Adafruit_LEDBackpack.h>'], period: 500,
    glob: C`Adafruit_7segment $d;`,
    setup: C`$d.begin(0x70, &Wire);`,
    loop: C`if (LAB_OUT_COUNT > 0 && lab_outs[0].value && !isnan(*lab_outs[0].value)) $d.print(*lab_outs[0].value, 1);
else $d.print((int)((millis() / 1000) % 10000));
$d.writeDisplay();`
  });
  add({
    id: 'seg7_single', key: 'seg1', name: 'Afficheur 7 segments 1 chiffre', tags: ['7 segments', 'débutant', 'afficheur'],
    desc: 'Afficheur à cathode commune piloté directement par 7 GPIO : compteur 0-9.',
    pins: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((s) => ({ role: 'S' + s, type: 'out', label: 'segment ' + s + ' (via 220 Ω)' })), period: 1000, usesOuts: false,
    glob: C`const uint8_t $pins[7] = {{{SA}}, {{SB}}, {{SC}}, {{SD}}, {{SE}}, {{SF}}, {{SG}}};
const uint8_t $digits[10] = {0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F};
uint8_t $n = 0;`,
    setup: C`for (int i = 0; i < 7; i++) pinMode($pins[i], OUTPUT);`,
    loop: C`for (int i = 0; i < 7; i++) digitalWrite($pins[i], ($digits[$n] >> i) & 1);
$n = ($n + 1) % 10;`,
    extraWiring: [{ pin: 'COM', to: 'GND (cathode commune)' }]
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* Modules « Communication & radio ». */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const M = (LAB.MODULES = LAB.MODULES || []);
  const X = LAB.LIBS;
  const C = String.raw;
  const SPI = [{ role: 'SCK', bus: 'sck' }, { role: 'MISO', bus: 'miso' }, { role: 'MOSI', bus: 'mosi' }];
  const add = (m) => M.push(Object.assign({ cat: 'comm', difficulty: 2, vcc: '3V3', mA: 15, period: 2000 }, m));

  add({
    id: 'nrf24l01', key: 'nrf', name: 'Radio nRF24L01+ (2,4 GHz)', bus: 'spi', tags: ['radio', '2,4 GHz', 'nRF24', 'SPI'],
    desc: 'Liaison radio bas coût entre cartes (100 m, 1000 m en version PA+LNA) : envoie un compteur et écoute les réponses.',
    pins: SPI.concat([{ role: 'CE', type: 'out', label: 'CE' }, { role: 'CSN', type: 'cs', label: 'CSN' }]),
    libs: [X.rf24], inc: ['<RF24.h>'], needOk: true, mA: 12, peak_mA: 115,
    params: { role: { def: '0', label: 'Rôle (0 = émetteur, 1 = récepteur)', opts: ['0', '1'] } },
    glob: C`RF24 $radio({{CE}}, {{CSN}});
const uint8_t $addr[6] = "LAB01";
uint32_t $counter = 0;`,
    setup: C`$ok = $radio.begin();
if ($ok) {
  $radio.setPALevel(RF24_PA_LOW);
  if ({{P:role}} == 0) { $radio.openWritingPipe($addr); $radio.stopListening(); }
  else { $radio.openReadingPipe(1, $addr); $radio.startListening(); }
}`,
    tick: C`if ({{P:role}} == 1 && $radio.available()) {
  uint32_t v;
  $radio.read(&v, sizeof(v));
  Serial.printf("# nRF24 reçu : %lu\n", (unsigned long)v);
  $rx = v;
}`,
    loop: C`if ({{P:role}} == 0) {
  $counter++;
  bool sent = $radio.write(&$counter, sizeof($counter));
  Serial.printf("# nRF24 envoi %lu : %s\n", (unsigned long)$counter, sent ? "acquitté" : "échec");
  $tx = $counter;
}`,
    outs: [{ k: 'tx', u: '', l: 'Envoyé' }, { k: 'rx', u: '', l: 'Reçu' }],
    notes: ['Condensateur 10-100 µF au plus près des broches VCC/GND du module : indispensable.', '3,3 V uniquement.']
  });
  add({
    id: 'lora_sx1278', key: 'lora', name: 'LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95)', bus: 'spi', tags: ['LoRa', 'longue portée', 'radio', 'SPI'],
    desc: 'Radio longue portée (plusieurs km) : envoie un paquet périodique et affiche les paquets reçus avec le RSSI.',
    pins: SPI.concat([{ role: 'NSS', type: 'cs', label: 'NSS' }, { role: 'RST', type: 'out', label: 'RST' }, { role: 'DIO0', type: 'in', label: 'DIO0' }]),
    libs: [X.lora], inc: ['<LoRa.h>'], needOk: true, mA: 12, peak_mA: 120, period: 10000,
    params: { freq: { def: '868E6', label: 'Fréquence', opts: ['433E6', '868E6', '915E6'] } },
    glob: C`uint32_t $n = 0;`,
    setup: C`LoRa.setPins({{NSS}}, {{RST}}, {{DIO0}});
$ok = LoRa.begin({{P:freq}});
if ($ok) { LoRa.setSpreadingFactor(9); LoRa.setSyncWord(0x4C); }`,
    tick: C`int size = LoRa.parsePacket();
if (size) {
  String msg;
  while (LoRa.available()) msg += (char)LoRa.read();
  Serial.printf("# LoRa reçu (%d dBm) : %s\n", LoRa.packetRssi(), msg.c_str());
  $rssi = LoRa.packetRssi();
}`,
    loop: C`LoRa.beginPacket();
LoRa.printf("LAB;%lu", (unsigned long)++$n);
for (int i = 0; i < LAB_OUT_COUNT; i++) {                 // toutes les mesures du projet
  float v = lab_outs[i].value ? *lab_outs[i].value : NAN;
  if (!isnan(v) && lab_outs[i].value != &$sent && lab_outs[i].value != &$rssi) LoRa.printf(";%s=%.2f", lab_outs[i].label, v);
}
LoRa.endPacket();
$sent = $n;`,
    usesOuts: true,
    outs: [{ k: 'sent', u: '', l: 'Paquets envoyés' }, { k: 'rssi', u: 'dBm', l: 'RSSI dernier reçu' }],
    notes: ['En Europe : 868 MHz (ou 433 MHz), rapport cyclique ≤ 1 %.', 'Ne jamais émettre sans antenne.']
  });
  add({
    id: 'hc05', key: 'bt', name: 'Bluetooth HC-05 / HC-06 (série)', uart: true, vcc: '5V', tags: ['Bluetooth', 'série', 'smartphone', 'UART'],
    desc: 'Pont série Bluetooth classique : dialogue avec une application Android « terminal Bluetooth ».',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TXD du HC-05' }, { role: 'TX', type: 'uart_tx', label: 'RXD du HC-05' }], mA: 30, period: 10000, difficulty: 1,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});
Serial.println(F("# pont Bluetooth : ce que vous tapez ici est envoyé au téléphone et inversement"));`,
    tick: C`while ({{SER}}.available()) Serial.write({{SER}}.read());
while (Serial.available()) {{SER}}.write(Serial.read());`,
    loop: C`{{SER}}.printf("ESP32 LAB : en ligne depuis %lu s\r\n", (unsigned long)(millis() / 1000));`,
    notes: ['Le HC-05 accepte 3,3 V sur RXD ; son TXD (3,3 V) est compatible.', 'Code d\'appairage par défaut : 1234.', 'L\'ESP32 classique a aussi le Bluetooth intégré (bibliothèque BluetoothSerial).']
  });
  add({
    id: 'hc12', key: 'hc12', name: 'Radio série HC-12 (433 MHz, 1 km)', uart: true, tags: ['radio', '433 MHz', 'série', 'UART'],
    desc: 'Module radio transparent : tout ce qui est écrit sur la liaison série est reçu par l\'autre HC-12.',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TXD du HC-12' }, { role: 'TX', type: 'uart_tx', label: 'RXD du HC-12' }], mA: 16, peak_mA: 100, period: 5000, difficulty: 1,
    glob: C`uint32_t $n = 0;`,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});`,
    tick: C`while ({{SER}}.available()) Serial.write({{SER}}.read());`,
    loop: C`{{SER}}.printf("LAB %lu\n", (unsigned long)++$n);`
  });
  add({
    id: 'rf433_rx', key: 'rf433r', name: 'Récepteur 433 MHz (RXB6 / MX-RM-5V)', vcc: '5V', tags: ['radio', '433 MHz', 'télécommande', 'prise radio'],
    desc: 'Décode les télécommandes 433 MHz (prises radiocommandées, sonnettes, capteurs d\'ouverture).',
    pins: [{ role: 'DATA', type: 'in', label: 'DATA', note: 'pont diviseur si le module est alimenté en 5 V' }], libs: [X.rcswitch], inc: ['<RCSwitch.h>'], mA: 4, period: 1000,
    glob: C`RCSwitch $rc;
uint32_t $at = 0;`,
    setup: C`$rc.enableReceive(digitalPinToInterrupt({{DATA}}));`,
    tick: C`if (!isnan($code) && millis() - $at > 2000) $code = NAN;   // prêt pour l'appui suivant
if ($rc.available()) {
  $at = millis();
  Serial.printf("# 433 MHz : code %lu (%u bits, protocole %u)\n", $rc.getReceivedValue(), $rc.getReceivedBitlength(), $rc.getReceivedProtocol());
  $code = $rc.getReceivedValue() % 1000000UL;
  $rc.resetAvailable();
}`,
    outs: [{ k: 'code', u: '', l: 'Dernier code (6 chiffres)' }], print: 'change',
    notes: ['Antenne : fil rigide de 17,3 cm soudé sur ANT.']
  });
  add({
    id: 'rf433_tx', key: 'rf433t', name: 'Émetteur 433 MHz (FS1000A)', vcc: '5V', tags: ['radio', '433 MHz', 'prise radio', 'domotique'], act: { on: true, off: true, toggle: false },
    desc: 'Pilote des prises radiocommandées 433 MHz (codes relevés avec le récepteur).',
    pins: [{ role: 'DATA', type: 'out', label: 'DATA' }], libs: [X.rcswitch], inc: ['<RCSwitch.h>'], mA: 20, period: 10000,
    params: { on: { def: '1361', label: 'Code ON' }, off: { def: '1364', label: 'Code OFF' }, bits: { def: '24', label: 'Bits' } },
    glob: C`RCSwitch $rc;
bool $state = false;
void $on() { $state = true; $rc.send({{P:on}}, {{P:bits}}); }
void $off() { $state = false; $rc.send({{P:off}}, {{P:bits}}); }`,
    setup: C`$rc.enableTransmit({{DATA}});
$rc.setRepeatTransmit(8);`,
    demo: C`if ($state) $off(); else $on();
Serial.printf("# 433 MHz : prise %s\n", $state ? "ON" : "OFF");`
  });
  add({
    id: 'rs485', key: 'rs485', name: 'Bus RS485 MAX485 (Modbus RTU)', uart: true, vcc: '5V', tags: ['RS485', 'Modbus', 'industriel', 'UART'],
    desc: 'Interroge un appareil Modbus RTU (compteur, variateur, sonde) : lecture de registres.',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'RO' }, { role: 'TX', type: 'uart_tx', label: 'DI' }, { role: 'DE', type: 'out', label: 'DE + RE (reliées)' }],
    mA: 5, period: 3000, difficulty: 3, needOk: true,
    params: { slave: { def: '1', label: 'Adresse esclave' }, reg: { def: '0', label: 'Premier registre' }, baud: { def: '9600', label: 'Vitesse (bauds)' } },
    glob: C`uint16_t $crc(const uint8_t *b, int n) {
  uint16_t c = 0xFFFF;
  for (int i = 0; i < n; i++) {
    c ^= b[i];
    for (int k = 0; k < 8; k++) c = (c & 1) ? (c >> 1) ^ 0xA001 : c >> 1;
  }
  return c;
}
int32_t $readHolding(uint8_t slave, uint16_t reg) {
  uint8_t q[8] = {slave, 0x03, (uint8_t)(reg >> 8), (uint8_t)reg, 0, 1, 0, 0};
  uint16_t c = $crc(q, 6);
  q[6] = c & 0xFF; q[7] = c >> 8;
  while ({{SER}}.available()) {{SER}}.read();
  digitalWrite({{DE}}, HIGH);
  {{SER}}.write(q, 8);
  {{SER}}.flush();
  digitalWrite({{DE}}, LOW);
  uint8_t r[7];
  if ({{SER}}.readBytes(r, 7) != 7 || r[0] != slave || r[1] != 0x03) return -1;
  if ($crc(r, 5) != (uint16_t)(r[5] | (r[6] << 8))) return -2;
  return (r[3] << 8) | r[4];
}`,
    setup: C`pinMode({{DE}}, OUTPUT);
digitalWrite({{DE}}, LOW);
{{SER}}.begin({{P:baud}}, SERIAL_8N1, {{RX}}, {{TX}});
{{SER}}.setTimeout(200);
$ok = true;`,
    loop: C`int32_t v = $readHolding({{P:slave}}, {{P:reg}});
if (v >= 0) $value = v;
else Serial.printf("# Modbus : pas de réponse (%ld)\n", (long)v);`,
    outs: [{ k: 'value', u: '', l: 'Registre' }],
    notes: ['Résistance de terminaison 120 Ω aux deux extrémités du bus.', 'Modules MAX485 5 V : RO sort du 5 V → pont diviseur ou version MAX3485 3,3 V.']
  });
  add({
    id: 'mcp2515', key: 'can', name: 'Bus CAN MCP2515 + TJA1050', bus: 'spi', vcc: '5V', tags: ['CAN', 'automobile', 'OBD', 'SPI'],
    desc: 'Contrôleur CAN 500 kbit/s : envoie une trame de test et affiche le trafic du bus.',
    pins: SPI.concat([{ role: 'CS', type: 'cs', label: 'CS' }, { role: 'INT', type: 'in', label: 'INT' }]), libs: [X.mcpcan], inc: ['<mcp_can.h>'], needOk: true, mA: 10, period: 1000, difficulty: 3,
    params: { xtal: { def: 'MCP_8MHZ', label: 'Quartz du module', opts: ['MCP_8MHZ', 'MCP_16MHZ'] } },
    glob: C`MCP_CAN $can({{CS}});
uint8_t $cnt = 0;`,
    setup: C`$ok = $can.begin(MCP_ANY, CAN_500KBPS, {{P:xtal}}) == CAN_OK;
if ($ok) $can.setMode(MCP_NORMAL);
pinMode({{INT}}, INPUT);`,
    tick: C`if (!digitalRead({{INT}})) {
  unsigned long id; uint8_t len; uint8_t buf[8];
  if ($can.readMsgBuf(&id, &len, buf) == CAN_OK) {
    Serial.printf("# CAN 0x%03lX [%u]", id & 0x1FFFFFFF, len);
    for (uint8_t i = 0; i < len; i++) Serial.printf(" %02X", buf[i]);
    Serial.println();
  }
}`,
    loop: C`uint8_t data[8] = {'L', 'A', 'B', $cnt++, 0, 0, 0, 0};
$sendOk = ($can.sendMsgBuf(0x123, 0, 8, data) == CAN_OK) ? 1 : 0;`,
    outs: [{ k: 'sendOk', u: '', l: 'Envoi OK' }],
    notes: ['Le TJA1050 exige 5 V ; le MCP2515 fonctionne en 3,3 ou 5 V (vérifiez votre module).', 'Terminaison 120 Ω (cavalier J1) aux extrémités du bus.']
  });
  add({
    id: 'sim800l', key: 'gsm', name: 'Modem GSM SIM800L (SMS, appels)', uart: true, vcc: '3V3', tags: ['GSM', 'SMS', '2G', 'UART'],
    desc: 'Modem 2G : envoie des SMS d\'alerte, mesure la qualité du réseau (commandes AT).',
    pins: [{ role: 'RX', type: 'uart_rx', label: 'TXD du SIM800L' }, { role: 'TX', type: 'uart_tx', label: 'RXD du SIM800L' }], mA: 20, peak_mA: 2000, period: 10000, difficulty: 3,
    vccNote: '3,7-4,2 V / 2 A (batterie Li-ion), PAS le 3V3 de l\'ESP32',
    glob: C`String $at(const char *cmd, uint32_t wait = 800) {
  while ({{SER}}.available()) {{SER}}.read();
  {{SER}}.println(cmd);
  String r;
  uint32_t t = millis();
  while (millis() - t < wait) while ({{SER}}.available()) r += (char){{SER}}.read();
  return r;
}`,
    setup: C`{{SER}}.begin(9600, SERIAL_8N1, {{RX}}, {{TX}});
delay(1000);
Serial.printf("# SIM800L : %s\n", $at("AT").indexOf("OK") >= 0 ? "OK" : "pas de réponse");
$at("AT+CMGF=1");                 // SMS en mode texte`,
    loop: C`String r = $at("AT+CSQ");
int p = r.indexOf("+CSQ: ");
if (p >= 0) {
  int q = r.substring(p + 6).toInt();
  $csq = q;
  $dbm = (q == 99) ? NAN : -113 + 2 * q;
}`,
    outs: [{ k: 'csq', u: '', l: 'Qualité (0-31)' }, { k: 'dbm', u: 'dBm', l: 'Signal' }],
    notes: ['Le SIM800L consomme des pics de 2 A : alimentation 4 V dédiée + condensateur 1000 µF, sinon il redémarre.', 'Les réseaux 2G ferment progressivement (vérifiez votre opérateur).']
  });
  add({
    id: 'ble_scanner', key: 'ble', name: 'Scanner Bluetooth Low Energy (intégré)', boards: ['esp32', 'esp32s3', 'esp32c3'], tags: ['BLE', 'Bluetooth', 'présence', 'intégré'],
    desc: 'Utilise le BLE intégré de l\'ESP32 : compte les appareils à proximité et le signal le plus fort.',
    pins: [], internal: true, inc: ['<BLEDevice.h>', '<BLEScan.h>'], period: 10000, mA: 90, difficulty: 2,
    glob: C`BLEScan *$scan = nullptr;`,
    setup: C`BLEDevice::init("ESP32-LAB");
$scan = BLEDevice::getScan();
$scan->setActiveScan(true);
$scan->setInterval(100);
$scan->setWindow(99);`,
    loop: C`BLEScanResults *res = $scan->start(3, false);
int n = res ? res->getCount() : 0;
int best = -127;
for (int i = 0; i < n; i++) {
  BLEAdvertisedDevice d = res->getDevice(i);
  if (d.getRSSI() > best) best = d.getRSSI();
  if (d.haveName()) Serial.printf("# BLE %s  %s  %d dBm\n", d.getAddress().toString().c_str(), d.getName().c_str(), d.getRSSI());
}
$scan->clearResults();
$devices = n;
$best = n ? best : NAN;`,
    outs: [{ k: 'devices', u: '', l: 'Appareils' }, { k: 'best', u: 'dBm', l: 'Meilleur signal' }],
    notes: ['Le scan BLE bloque ~3 s : gardez une période d\'au moins 10 s.']
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* Projets complets : assemblages de modules + automatismes, générés par le Studio.
 * Règles : {if:{m, out, op, v, hyst}, then:{m, act}, else:{m, act}}  ou  {if:{m, out, op:'map', in:[a,b]}, then:{m, act:'set', out:[c,d]}} */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const R = (LAB.RECIPES = LAB.RECIPES || []);
  const add = (r) => R.push(Object.assign({ difficulty: 2, board: 'esp32', rules: [], options: {} }, r));
  const on = (m) => ({ m, act: 'on' });
  const off = (m) => ({ m, act: 'off' });
  const set = (m, v) => ({ m, act: 'set', v });

  /* ---------------- Maison & confort ---------------- */
  add({ id: 'app_station_meteo', title: 'Station météo intérieure connectée', tags: ['météo', 'OLED', 'web', 'MASTER'],
    desc: 'Température, humidité, pression et luminosité sur écran OLED, page web locale et tableau de bord du MASTER.',
    modules: [{ id: 'bme280' }, { id: 'bh1750' }, { id: 'oled_ssd1306' }], options: { web: true, master: true } });
  add({ id: 'app_station_meteo_ext', title: 'Station météo extérieure complète', difficulty: 3, tags: ['météo', 'vent', 'pluie', 'web'],
    desc: 'Kit météo : température/humidité, vitesse et direction du vent, cumul de pluie, détecteur de pluie, avec page web.',
    modules: [{ id: 'dht22' }, { id: 'anemometer' }, { id: 'wind_vane' }, { id: 'rain_gauge' }, { id: 'rain' }], options: { web: true, master: true } });
  add({ id: 'app_thermostat', title: 'Thermostat de chauffage', tags: ['chauffage', 'relais', 'OLED'],
    desc: 'Enclenche un radiateur (via relais) sous 19 °C avec hystérésis de 0,5 °C ; affichage OLED.',
    modules: [{ id: 'ds18b20' }, { id: 'relay', alias: 'chauffage' }, { id: 'oled_ssd1306' }],
    rules: [{ if: { m: 0, out: 'temp', op: '<', v: 19, hyst: 0.5 }, then: on(1), else: off(1) }], options: { web: true } });
  add({ id: 'app_ventilation_auto', title: 'Ventilateur proportionnel à la température', tags: ['ventilateur', 'PWM', 'proportionnel'],
    desc: 'La vitesse du ventilateur 4 fils suit la température : 20 % à 22 °C, 100 % à 32 °C.',
    modules: [{ id: 'dht22' }, { id: 'fan_pwm' }],
    rules: [{ if: { m: 0, out: 'temp', op: 'map', in: [22, 32] }, then: { m: 1, act: 'set', out: [20, 100] } }] });
  add({ id: 'app_lampe_crepusculaire', title: 'Lampe crépusculaire', difficulty: 1, tags: ['éclairage', 'lux', 'relais'],
    desc: 'Allume une lampe (relais) quand la luminosité passe sous 50 lx, avec hystérésis anti-clignotement.',
    modules: [{ id: 'bh1750' }, { id: 'relay', alias: 'lampe' }],
    rules: [{ if: { m: 0, out: 'lux', op: '<', v: 50, hyst: 20 }, then: on(1), else: off(1) }] });
  add({ id: 'app_variateur_auto', title: 'Éclairage à intensité automatique', tags: ['éclairage', 'PWM', 'proportionnel'],
    desc: 'Une LED/ruban compense la lumière ambiante : plus il fait sombre, plus elle éclaire.',
    modules: [{ id: 'ldr' }, { id: 'led_pwm' }],
    rules: [{ if: { m: 0, out: 'light', op: 'map', in: [80, 10] }, then: { m: 1, act: 'set', out: [0, 100] } }] });
  add({ id: 'app_volet_roulant', title: 'Volet roulant automatique', difficulty: 3, tags: ['volet', 'pas-à-pas', 'lux'],
    desc: 'Ouvre un store (moteur pas-à-pas) au-dessus de 2000 lx et le referme la nuit.',
    modules: [{ id: 'bh1750' }, { id: 'stepper_28byj48', alias: 'store' }],
    rules: [{ if: { m: 0, out: 'lux', op: '>', v: 2000, hyst: 500 }, then: set(1, 4096), else: set(1, 0) }] });
  add({ id: 'app_telecommande_ir', title: 'Prise commandée par télécommande IR', tags: ['infrarouge', 'relais', 'télécommande'],
    desc: 'La touche « 1 » (commande NEC 0x45) d\'une télécommande allume le relais, toute autre touche l\'éteint.',
    modules: [{ id: 'ir_receiver' }, { id: 'relay' }],
    rules: [{ if: { m: 0, out: 'cmd', op: '==', v: 69 }, then: on(1), else: off(1) }] });
  add({ id: 'app_prise_radio', title: 'Passerelle prises radio 433 MHz', tags: ['433 MHz', 'domotique', 'MQTT'],
    desc: 'Pilote une prise radiocommandée 433 MHz selon la température, et publie les mesures en MQTT.',
    modules: [{ id: 'aht20' }, { id: 'rf433_tx' }],
    rules: [{ if: { m: 0, out: 'temp', op: '>', v: 27, hyst: 1 }, then: on(1), else: off(1) }], options: { mqtt: true } });
  add({ id: 'app_mqtt_domotique', title: 'Capteur domotique MQTT (Home Assistant)', tags: ['MQTT', 'Home Assistant', 'domotique'],
    desc: 'Température/humidité et relais publiés sur un broker MQTT (Mosquitto, Home Assistant).',
    modules: [{ id: 'sht31' }, { id: 'relay' }],
    rules: [{ if: { m: 0, out: 'hum', op: '>', v: 70, hyst: 5 }, then: on(1), else: off(1) }], options: { mqtt: true, web: true } });
  add({ id: 'app_lcd_interieur', title: 'Afficheur de confort intérieur (LCD)', difficulty: 1, tags: ['LCD', 'confort'],
    desc: 'Température et humidité sur un écran LCD 16×2 : le premier projet « utile » à offrir.',
    modules: [{ id: 'aht20' }, { id: 'lcd1602' }] });
  add({ id: 'app_horloge_rtc', title: 'Horloge précise DS3231 + OLED', difficulty: 1, tags: ['horloge', 'RTC', 'OLED'],
    desc: 'Heure conservée sur pile, température de la puce, affichage OLED.',
    modules: [{ id: 'ds3231' }, { id: 'oled_ssd1306' }] });
  add({ id: 'app_horloge_led', title: 'Horloge / thermomètre à LED 8 chiffres', difficulty: 1, tags: ['horloge', '7 segments', 'MAX7219'],
    desc: 'Grands chiffres lumineux : température d\'une sonde DS18B20 sur afficheur MAX7219.',
    modules: [{ id: 'ds18b20' }, { id: 'max7219_7seg' }] });

  /* ---------------- Jardin, eau & animaux ---------------- */
  add({ id: 'app_arrosage_auto', title: 'Arrosage automatique de plante', tags: ['arrosage', 'pompe', 'sol'],
    desc: 'La pompe démarre sous 30 % d\'humidité du sol et s\'arrête à 40 % (sécurité 20 s max).',
    modules: [{ id: 'soil_cap' }, { id: 'pump' }, { id: 'oled_ssd1306' }],
    rules: [{ if: { m: 0, out: 'moist', op: '<', v: 30, hyst: 10 }, then: on(1), else: off(1) }], options: { web: true } });
  add({ id: 'app_serre', title: 'Serre intelligente', difficulty: 3, tags: ['serre', 'jardin', 'ventilation', 'arrosage', 'web'],
    desc: 'Aération au-dessus de 28 °C, arrosage sous 35 % d\'humidité du sol, suivi de la lumière ; tableau de bord web.',
    modules: [{ id: 'sht31' }, { id: 'soil_cap' }, { id: 'bh1750' }, { id: 'relay', alias: 'aeration' }, { id: 'pump' }],
    rules: [{ if: { m: 0, out: 'temp', op: '>', v: 28, hyst: 1 }, then: on(3), else: off(3) },
      { if: { m: 1, out: 'moist', op: '<', v: 35, hyst: 10 }, then: on(4), else: off(4) }], options: { web: true, master: true } });
  add({ id: 'app_aquarium', title: 'Contrôleur d\'aquarium', difficulty: 3, tags: ['aquarium', 'pH', 'TDS', 'chauffage'],
    desc: 'Température (chauffage sous 24,5 °C), pH et TDS de l\'eau, page web de suivi.',
    modules: [{ id: 'ds18b20' }, { id: 'ph' }, { id: 'tds' }, { id: 'relay', alias: 'chauffage' }],
    rules: [{ if: { m: 0, out: 'temp', op: '<', v: 24.5, hyst: 0.3 }, then: on(3), else: off(3) }], options: { web: true } });
  add({ id: 'app_qualite_eau', title: 'Analyseur de qualité de l\'eau', tags: ['eau', 'pH', 'TDS', 'turbidité'],
    desc: 'pH, solides dissous et turbidité mesurés ensemble, journalisés sur microSD.',
    modules: [{ id: 'ph' }, { id: 'tds' }, { id: 'turbidity' }, { id: 'sd_card' }] });
  add({ id: 'app_niveau_cuve', title: 'Jauge de cuve d\'eau de pluie', tags: ['cuve', 'niveau', 'ultrason', 'web'],
    desc: 'Capteur ultrason étanche au-dessus de l\'eau, distance affichée sur OLED et sur le web.',
    modules: [{ id: 'jsn_sr04t' }, { id: 'oled_ssd1306' }], options: { web: true, master: true } });
  add({ id: 'app_balance', title: 'Balance connectée (ruche, réservoir)', tags: ['balance', 'HX711', 'web'],
    desc: 'Pesée par cellule de charge, affichage OLED et envoi au MASTER.',
    modules: [{ id: 'hx711' }, { id: 'oled_ssd1306' }], options: { web: true, master: true } });
  add({ id: 'app_frigo', title: 'Alarme de réfrigérateur / congélateur', difficulty: 1, tags: ['froid', 'alarme', 'DS18B20'],
    desc: 'Bip si la température dépasse 8 °C (porte mal fermée, panne) ; valeur envoyée au MASTER.',
    modules: [{ id: 'ds18b20' }, { id: 'buzzer_active' }],
    rules: [{ if: { m: 0, out: 'temp', op: '>', v: 8, hyst: 1 }, then: on(1), else: off(1) }], options: { master: true } });

  /* ---------------- Air & santé ---------------- */
  add({ id: 'app_co2_feu', title: 'Indicateur CO₂ « feu tricolore » (salle de classe)', tags: ['CO2', 'école', 'NeoPixel', 'aération'],
    desc: 'Un anneau LED passe du vert (400 ppm) au rouge (1500 ppm) : signal clair pour aérer.',
    modules: [{ id: 'scd40' }, { id: 'ws2812', params: { count: 12 } }, { id: 'oled_ssd1306' }],
    rules: [{ if: { m: 0, out: 'co2', op: 'map', in: [500, 1500] }, then: { m: 1, act: 'set', out: [120, 0] } }], options: { web: true, master: true } });
  add({ id: 'app_alarme_co2', title: 'Alarme CO₂ avec buzzer', tags: ['CO2', 'alarme', 'LCD'],
    desc: 'Buzzer au-delà de 1500 ppm, affichage LCD du CO₂, de la température et de l\'humidité.',
    modules: [{ id: 'scd30' }, { id: 'buzzer_active' }, { id: 'lcd1602' }],
    rules: [{ if: { m: 0, out: 'co2', op: '>', v: 1500, hyst: 200 }, then: on(1), else: off(1) }] });
  add({ id: 'app_particules', title: 'Moniteur de particules fines PM2.5', tags: ['PM2.5', 'pollution', 'OLED', 'web'],
    desc: 'PM1/PM2.5/PM10 en µg/m³ sur OLED, web et tableau de bord du MASTER.',
    modules: [{ id: 'pms5003' }, { id: 'oled_ssd1306' }], options: { web: true, master: true } });
  add({ id: 'app_qualite_air_complet', title: 'Station qualité de l\'air complète', difficulty: 3, tags: ['COV', 'CO2', 'particules', 'enregistreur'],
    desc: 'CO₂, COV, particules, température et humidité, enregistrés sur microSD et affichés sur OLED.',
    modules: [{ id: 'scd40' }, { id: 'sgp40' }, { id: 'pms5003' }, { id: 'oled_ssd1306' }, { id: 'sd_card' }], options: { master: true } });
  add({ id: 'app_fuite_gaz', title: 'Détecteur de fuite de gaz', tags: ['gaz', 'MQ-2', 'alarme', 'sécurité'],
    desc: 'Alarme sonore et coupure d\'une électrovanne (relais) au-delà d\'un seuil de gaz (démonstration pédagogique).',
    modules: [{ id: 'mq2' }, { id: 'buzzer_active' }, { id: 'relay', alias: 'vanne' }],
    rules: [{ if: { m: 0, out: 'ratio', op: '<', v: 0.6, hyst: 0.1 }, then: on(1), else: off(1) },
      { if: { m: 0, out: 'ratio', op: '<', v: 0.6, hyst: 0.1 }, then: on(2), else: off(2) }],
    notes: ['Pédagogique : ne remplace pas un détecteur certifié NF.'] });
  add({ id: 'app_detecteur_incendie', title: 'Détecteur de flamme et fumée', tags: ['incendie', 'flamme', 'alarme'],
    desc: 'Alarme dès qu\'une flamme est vue par le capteur IR ; niveau de fumée MQ-2 surveillé.',
    modules: [{ id: 'flame' }, { id: 'mq2' }, { id: 'buzzer_active' }],
    rules: [{ if: { m: 0, out: 'fire', op: '>', v: 0.5 }, then: on(2), else: off(2) }] });
  add({ id: 'app_cardio', title: 'Cardiofréquencemètre à écran', tags: ['pouls', 'santé', 'OLED'],
    desc: 'Fréquence cardiaque (MAX30102) affichée en direct sur OLED.',
    modules: [{ id: 'max30102' }, { id: 'oled_ssd1306' }] });
  add({ id: 'app_sonometre', title: 'Sonomètre lumineux', tags: ['son', 'bruit', 'NeoPixel'],
    desc: 'Le ruban LED passe du vert au rouge selon le niveau sonore (cantine, open-space).',
    modules: [{ id: 'max4466' }, { id: 'ws2812' }],
    rules: [{ if: { m: 0, out: 'db', op: 'map', in: [40, 70] }, then: { m: 1, act: 'set', out: [120, 0] } }] });
  add({ id: 'app_uv_plage', title: 'Alerte UV plage', difficulty: 1, tags: ['UV', 'soleil', 'alerte'],
    desc: 'Indice UV sur OLED et bip au-dessus de l\'indice 6 (protection solaire).',
    modules: [{ id: 'ltr390' }, { id: 'buzzer_active' }, { id: 'oled_ssd1306' }],
    rules: [{ if: { m: 0, out: 'uvi', op: '>', v: 6, hyst: 0.5 }, then: on(1), else: off(1) }] });

  /* ---------------- Sécurité & accès ---------------- */
  add({ id: 'app_alarme_intrusion', title: 'Alarme anti-intrusion', tags: ['alarme', 'PIR', 'porte', 'buzzer'],
    desc: 'Détecteur de mouvement PIR + contact de porte : sirène et voyant.',
    modules: [{ id: 'pir_hcsr501' }, { id: 'reed', alias: 'porte' }, { id: 'buzzer_active', alias: 'sirene' }, { id: 'led', alias: 'voyant' }],
    rules: [{ if: { m: 0, out: 'motion', op: '>', v: 0.5 }, then: on(2), else: off(2) },
      { if: { m: 1, out: 'state', op: '<', v: 0.5 }, then: on(3), else: off(3) }], options: { master: true } });
  add({ id: 'app_acces_rfid', title: 'Contrôle d\'accès par badge RFID', tags: ['RFID', 'serrure', 'accès'],
    desc: 'Le badge autorisé ouvre la gâche électrique pendant 3 s ; une LED signale l\'accès.',
    modules: [{ id: 'rc522' }, { id: 'solenoid_lock' }, { id: 'led' }],
    rules: [{ if: { m: 0, out: 'granted', op: '>', v: 0.5 }, then: on(1) }, { if: { m: 0, out: 'granted', op: '>', v: 0.5 }, then: on(2), else: off(2) }] });
  add({ id: 'app_acces_empreinte', title: 'Serrure à empreinte digitale', difficulty: 3, tags: ['empreinte', 'serrure', 'biométrie'],
    desc: 'Une empreinte reconnue (ID ≥ 1) déverrouille la gâche 3 s.',
    modules: [{ id: 'fingerprint' }, { id: 'solenoid_lock' }],
    rules: [{ if: { m: 0, out: 'id', op: '>=', v: 1 }, then: on(1) }] });
  add({ id: 'app_antivol', title: 'Antivol à vibration (vélo, sac)', difficulty: 1, tags: ['antivol', 'vibration', 'buzzer'],
    desc: 'Toute secousse déclenche le buzzer.',
    modules: [{ id: 'vibration_sw420' }, { id: 'buzzer_active' }],
    rules: [{ if: { m: 0, out: 'state', op: '>', v: 0.5 }, then: on(1), else: off(1) }] });
  add({ id: 'app_barriere_laser', title: 'Barrière laser d\'alarme', difficulty: 1, tags: ['laser', 'alarme'],
    desc: 'Un faisceau laser traverse la pièce ; s\'il est coupé, la sirène retentit.',
    modules: [{ id: 'laser_module' }, { id: 'laser_receiver' }, { id: 'buzzer_active' }],
    rules: [{ if: { m: 1, out: 'beam', op: '<', v: 0.5 }, then: on(2), else: off(2) }] });
  add({ id: 'app_compteur_passages', title: 'Compteur de passages / visiteurs', difficulty: 1, tags: ['comptage', 'infrarouge', 'LCD'],
    desc: 'Chaque coupure de la barrière IR incrémente le compteur affiché sur LCD et sur le web.',
    modules: [{ id: 'ir_beam' }, { id: 'lcd1602' }], options: { web: true } });
  add({ id: 'app_sonnette_radio', title: 'Sonnette sans fil 433 MHz', tags: ['sonnette', '433 MHz', 'mélodie'],
    desc: 'Reconnaît le code d\'un bouton de sonnette 433 MHz et joue une mélodie.',
    modules: [{ id: 'rf433_rx' }, { id: 'buzzer_passive' }],
    rules: [{ if: { m: 0, out: 'code', op: '==', v: 1361 }, then: set(1, 880), else: off(1) }] });

  /* ---------------- Robotique & mouvement ---------------- */
  add({ id: 'app_robot_evitement', title: 'Robot éviteur d\'obstacles', difficulty: 3, tags: ['robot', 'ultrason', 'moteur'],
    desc: 'Le moteur recule quand un obstacle est à moins de 20 cm, avance sinon (base de robot mobile).',
    modules: [{ id: 'hcsr04' }, { id: 'l298n' }],
    rules: [{ if: { m: 0, out: 'dist', op: '<', v: 20, hyst: 5 }, then: set(1, -60), else: set(1, 70) }] });
  add({ id: 'app_radar_recul', title: 'Radar de recul sonore', tags: ['parking', 'ultrason', 'buzzer'],
    desc: 'Plus l\'obstacle est proche, plus le bip est aigu ; distance sur afficheur 4 chiffres.',
    modules: [{ id: 'hcsr04' }, { id: 'buzzer_passive' }, { id: 'tm1637' }],
    rules: [{ if: { m: 0, out: 'dist', op: 'map', in: [100, 5] }, then: { m: 1, act: 'set', out: [200, 2500] } }] });
  add({ id: 'app_parking_led', title: 'Aide au stationnement lumineuse (garage)', tags: ['parking', 'ToF', 'NeoPixel'],
    desc: 'Capteur laser au fond du garage : l\'anneau passe du vert au rouge en approchant du mur.',
    modules: [{ id: 'vl53l0x' }, { id: 'ws2812', params: { count: 12 } }],
    rules: [{ if: { m: 0, out: 'dist', op: 'map', in: [100, 10] }, then: { m: 1, act: 'set', out: [120, 0] } }] });
  add({ id: 'app_theremine', title: 'Thérémine à ultrasons', difficulty: 1, tags: ['musique', 'ultrason', 'jeu'],
    desc: 'Instrument de musique sans contact : la hauteur de la note suit la distance de la main.',
    modules: [{ id: 'hcsr04' }, { id: 'buzzer_passive' }],
    rules: [{ if: { m: 0, out: 'dist', op: 'map', in: [5, 60] }, then: { m: 1, act: 'set', out: [1500, 150] } }] });
  add({ id: 'app_servo_potentiometre', title: 'Servomoteur piloté par potentiomètre', difficulty: 1, tags: ['servo', 'potentiomètre', 'débutant'],
    desc: 'Le grand classique : l\'angle du servo suit la position du potentiomètre.',
    modules: [{ id: 'potentiometer' }, { id: 'servo_sg90' }],
    rules: [{ if: { m: 0, out: 'pos', op: 'map', in: [0, 100] }, then: { m: 1, act: 'set', out: [0, 180] } }] });
  add({ id: 'app_joystick_servo', title: 'Tourelle pan-tilt au joystick', tags: ['servo', 'joystick', 'caméra'],
    desc: 'Deux servos (panoramique et inclinaison) suivent les axes d\'un joystick.',
    modules: [{ id: 'joystick' }, { id: 'servo_sg90', alias: 'pan' }, { id: 'servo_sg90', alias: 'tilt' }],
    rules: [{ if: { m: 0, out: 'x', op: 'map', in: [-100, 100] }, then: { m: 1, act: 'set', out: [0, 180] } },
      { if: { m: 0, out: 'y', op: 'map', in: [-100, 100] }, then: { m: 2, act: 'set', out: [0, 180] } }] });
  add({ id: 'app_variateur_potentiometre', title: 'Variateur de LED au potentiomètre', difficulty: 1, tags: ['PWM', 'LED', 'débutant'],
    desc: 'La luminosité de la LED suit le potentiomètre (PWM avec correction de perception).',
    modules: [{ id: 'potentiometer' }, { id: 'led_pwm' }],
    rules: [{ if: { m: 0, out: 'pos', op: 'map', in: [0, 100] }, then: { m: 1, act: 'set', out: [0, 100] } }] });
  add({ id: 'app_niveau_bulle', title: 'Niveau à bulle numérique', tags: ['inclinaison', 'IMU', 'OLED'],
    desc: 'Roulis et tangage en degrés sur écran OLED grâce au MPU-6050.',
    modules: [{ id: 'mpu6050' }, { id: 'oled_ssd1306' }] });
  add({ id: 'app_boussole', title: 'Boussole numérique', difficulty: 1, tags: ['boussole', 'magnétomètre', 'OLED'],
    desc: 'Cap magnétique en degrés sur OLED (QMC5883L).',
    modules: [{ id: 'qmc5883l' }, { id: 'oled_ssd1306' }] });
  add({ id: 'app_traceur_gps', title: 'Traceur GPS avec enregistrement', difficulty: 3, tags: ['GPS', 'microSD', 'randonnée'],
    desc: 'Position, altitude et vitesse enregistrées sur microSD et affichées sur OLED.',
    modules: [{ id: 'gps_neo6m' }, { id: 'oled_ssd1306' }, { id: 'sd_card' }] });

  /* ---------------- Énergie & réseau ---------------- */
  add({ id: 'app_compteur_energie', title: 'Compteur d\'énergie domestique', difficulty: 3, tags: ['énergie', 'kWh', 'PZEM', 'MQTT'],
    desc: 'Tension, courant, puissance, kWh et facteur de puissance, publiés en web, MQTT et vers le MASTER.',
    modules: [{ id: 'pzem004t' }, { id: 'oled_ssd1306' }], options: { web: true, mqtt: true, master: true } });
  add({ id: 'app_suivi_batterie', title: 'Suivi d\'une batterie / panneau solaire', tags: ['batterie', 'solaire', 'INA219'],
    desc: 'Tension, courant et puissance mesurés par INA219, enregistrés sur carte SD.',
    modules: [{ id: 'ina219' }, { id: 'sd_card' }, { id: 'oled_128x32' }], options: { master: true } });
  add({ id: 'app_enregistreur_meteo', title: 'Enregistreur de données climatiques', tags: ['enregistreur', 'microSD', 'RTC'],
    desc: 'Température, humidité et pression journalisées toutes les 10 s dans un CSV lisible par Excel.',
    modules: [{ id: 'bme280' }, { id: 'ds3231' }, { id: 'sd_card' }] });
  add({ id: 'app_capteur_lora', title: 'Capteur distant LoRa (plusieurs km)', difficulty: 3, tags: ['LoRa', 'longue portée', 'météo'],
    desc: 'Envoie température, humidité et pression par radio LoRa toutes les 10 s.',
    modules: [{ id: 'bme280' }, { id: 'lora_sx1278' }] });
  add({ id: 'app_capteur_master', title: 'Capteur connecté au tableau de bord du MASTER', difficulty: 1, tags: ['MASTER', 'télémétrie', 'Wi-Fi'],
    desc: 'Rejoint le Wi-Fi « ESP32-LAB » et envoie ses mesures au MASTER (onglet Capteurs).',
    modules: [{ id: 'sht4x' }, { id: 'bh1750' }], options: { master: true } });
  add({ id: 'app_scanner_ble', title: 'Détecteur de présence Bluetooth', tags: ['BLE', 'présence', 'LED'],
    desc: 'Compte les appareils BLE à proximité (téléphones, montres) ; LED allumée si l\'un est très proche.',
    modules: [{ id: 'ble_scanner' }, { id: 'led' }],
    rules: [{ if: { m: 0, out: 'best', op: '>', v: -60, hyst: 5 }, then: on(1), else: off(1) }] });
})(typeof globalThis !== 'undefined' ? globalThis : this);

(function(root){root.LAB=root.LAB||{};root.LAB.CATS={"temp":{"name":"Température, humidité & pression","icon":"thermo"},"air":{"name":"Qualité de l'air & CO₂","icon":"wind"},"gas":{"name":"Gaz (série MQ)","icon":"flame"},"weather":{"name":"Météo, sol & UV","icon":"cloud"},"water":{"name":"Eau & aquariophilie","icon":"drop"},"light":{"name":"Lumière, couleur & infrarouge","icon":"sun"},"distance":{"name":"Distance & présence","icon":"radar"},"motion":{"name":"Mouvement, orientation & vibrations","icon":"compass"},"input":{"name":"Boutons, claviers & commandes","icon":"pointer"},"bio":{"name":"Santé, son & biométrie","icon":"heart"},"power":{"name":"Courant, tension & énergie","icon":"bolt"},"id":{"name":"Identification, temps & position","icon":"id"},"act":{"name":"Actionneurs : LED, relais, son","icon":"toggle"},"motor":{"name":"Moteurs & servos","icon":"cog"},"io":{"name":"Extensions d'E/S & convertisseurs","icon":"chip"},"display":{"name":"Afficheurs","icon":"screen"},"comm":{"name":"Communication & radio","icon":"antenna"},"app":{"name":"Projets complets","icon":"star"},"classic":{"name":"Classiques ESP32 (système & réseau)","icon":"book"}};root.LAB.CLASSICS=[{"id":"classic_blink","title":"Clignotement de la LED intégrée","desc":"Le « Hello world » : faire clignoter une LED sans bloquer le programme (millis()).","tags":["débutant","LED"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Clignotement de la LED intégrée (le « Hello world » du matériel)\n// Carte : n'importe quel ESP32. LED_BUILTIN vaut GPIO2 sur la plupart des DevKit.\n#include <Arduino.h>\n\n#ifndef LED_BUILTIN\n#define LED_BUILTIN 2\n#endif\n\nconst uint32_t PERIODE_MS = 500;\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  pinMode(LED_BUILTIN, OUTPUT);\n  Serial.printf(\"\\n# Clignotement sur GPIO%d\\n\", LED_BUILTIN);\n}\n\nvoid loop() {\n  static uint32_t last = 0;\n  static bool on = false;\n  if (millis() - last >= PERIODE_MS) {        // non bloquant : pas de delay()\n    last = millis();\n    on = !on;\n    digitalWrite(LED_BUILTIN, on ? HIGH : LOW);\n    Serial.printf(\"led:%d\\n\", on ? 1 : 0);\n  }\n}\n"},{"id":"classic_wifi_scan","title":"Scanner de réseaux Wi-Fi","desc":"Liste les réseaux avec puissance, canal et type de sécurité.","tags":["Wi-Fi","diagnostic"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Scanner Wi-Fi : réseaux, puissance, canal, sécurité\n#include <Arduino.h>\n#include <WiFi.h>\n\nconst char *securite(wifi_auth_mode_t m) {\n  switch (m) {\n    case WIFI_AUTH_OPEN: return \"ouvert\";\n    case WIFI_AUTH_WEP: return \"WEP\";\n    case WIFI_AUTH_WPA_PSK: return \"WPA\";\n    case WIFI_AUTH_WPA2_PSK: return \"WPA2\";\n    case WIFI_AUTH_WPA_WPA2_PSK: return \"WPA/WPA2\";\n    case WIFI_AUTH_WPA3_PSK: return \"WPA3\";\n    case WIFI_AUTH_WPA2_WPA3_PSK: return \"WPA2/WPA3\";\n    case WIFI_AUTH_WPA2_ENTERPRISE: return \"WPA2-Entreprise\";\n    default: return \"autre\";\n  }\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.mode(WIFI_STA);\n  WiFi.disconnect();\n}\n\nvoid loop() {\n  Serial.println(F(\"\\n# Scan en cours…\"));\n  int n = WiFi.scanNetworks();\n  if (n <= 0) {\n    Serial.println(F(\"# aucun réseau trouvé\"));\n  } else {\n    Serial.printf(\"# %d réseau(x)\\n\", n);\n    Serial.println(F(\"  N  RSSI  Canal  Sécurité        SSID\"));\n    for (int i = 0; i < n; i++) {\n      Serial.printf(\"%3d  %4ld  %5ld  %-15s %s\\n\", i + 1, (long)WiFi.RSSI(i), (long)WiFi.channel(i),\n                    securite(WiFi.encryptionType(i)), WiFi.SSID(i).length() ? WiFi.SSID(i).c_str() : \"(caché)\");\n    }\n  }\n  WiFi.scanDelete();\n  delay(10000);\n}\n"},{"id":"classic_wifi_ap_web","title":"Point d'accès + serveur web","desc":"La carte crée son propre Wi-Fi et sert une page de commande (sans box).","tags":["Wi-Fi","web","AP"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Point d'accès Wi-Fi + serveur web (sans box Internet)\n// Connectez votre téléphone au réseau « ESP32-DEMO » puis ouvrez http://192.168.4.1/\n#include <Arduino.h>\n#include <WiFi.h>\n#include <WebServer.h>\n\n#ifndef LED_BUILTIN\n#define LED_BUILTIN 2\n#endif\n\nconst char *AP_SSID = \"ESP32-DEMO\";\nconst char *AP_PASS = \"CHANGE_ME_WIFI_PASSWORD\";          // 8 caractères minimum\nWebServer server(80);\nbool ledOn = false;\n\nconst char PAGE[] PROGMEM = R\"HTML(<!doctype html><html lang=\"fr\"><meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>ESP32</title>\n<style>body{font-family:system-ui;margin:24px}button{font-size:18px;padding:12px 20px;border-radius:10px}</style>\n<h1>ESP32 en point d'accès</h1><p id=\"s\">…</p><button onclick=\"t()\">Basculer la LED</button>\n<script>async function r(){const d=await(await fetch('/etat')).json();document.getElementById('s').textContent=\n'LED : '+(d.led?'allumée':'éteinte')+' — '+d.clients+' client(s) — '+Math.round(d.uptime/1000)+' s'}\nasync function t(){await fetch('/led',{method:'POST'});r()}r();setInterval(r,2000)</script></html>)HTML\";\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  pinMode(LED_BUILTIN, OUTPUT);\n  WiFi.mode(WIFI_AP);\n  WiFi.softAP(AP_SSID, AP_PASS);\n  Serial.printf(\"\\n# Point d'accès « %s » — http://%s/\\n\", AP_SSID, WiFi.softAPIP().toString().c_str());\n  server.on(\"/\", []() { server.send_P(200, \"text/html; charset=utf-8\", PAGE); });\n  server.on(\"/etat\", []() {\n    String j = String(\"{\\\"led\\\":\") + (ledOn ? \"true\" : \"false\") + \",\\\"clients\\\":\" + WiFi.softAPgetStationNum() +\n               \",\\\"uptime\\\":\" + millis() + \"}\";\n    server.send(200, \"application/json\", j);\n  });\n  server.on(\"/led\", HTTP_POST, []() {\n    ledOn = !ledOn;\n    digitalWrite(LED_BUILTIN, ledOn);\n    server.send(204);\n  });\n  server.begin();\n}\n\nvoid loop() {\n  server.handleClient();\n}\n"},{"id":"classic_wifi_reconnect","title":"Connexion Wi-Fi robuste","desc":"Événements Wi-Fi, reconnexion automatique avec recul progressif, suivi du RSSI.","tags":["Wi-Fi","fiabilité"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Connexion Wi-Fi robuste : événements, reconnexion automatique avec recul progressif\n#include <Arduino.h>\n#include <WiFi.h>\n\nconst char *WIFI_SSID = \"VotreBox\";          // à adapter\nconst char *WIFI_PASS = \"VotreMotDePasse\";\n\nuint32_t retryDelay = 2000;\nuint32_t nextRetry = 0;\nuint32_t disconnects = 0;\n\nvoid onWifiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {\n  switch (event) {\n    case ARDUINO_EVENT_WIFI_STA_GOT_IP:\n      Serial.printf(\"# connecté : IP %s, RSSI %d dBm\\n\", WiFi.localIP().toString().c_str(), WiFi.RSSI());\n      retryDelay = 2000;\n      break;\n    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:\n      disconnects++;\n      Serial.printf(\"# déconnecté (raison %u), nouvelle tentative dans %lu ms\\n\", info.wifi_sta_disconnected.reason, (unsigned long)retryDelay);\n      nextRetry = millis() + retryDelay;\n      if (retryDelay < 60000) retryDelay *= 2;   // recul exponentiel : ménage la box et la radio\n      break;\n    default:\n      break;\n  }\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.onEvent(onWifiEvent);\n  WiFi.mode(WIFI_STA);\n  WiFi.setAutoReconnect(false);               // la reconnexion est gérée ici\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n}\n\nvoid loop() {\n  if (WiFi.status() != WL_CONNECTED && nextRetry && (int32_t)(millis() - nextRetry) >= 0) {\n    nextRetry = 0;\n    WiFi.disconnect();\n    WiFi.begin(WIFI_SSID, WIFI_PASS);\n  }\n  static uint32_t last = 0;\n  if (millis() - last > 5000) {\n    last = millis();\n    Serial.printf(\"wifi:%d\\trssi:%d\\tdeconnexions:%lu\\n\", WiFi.status() == WL_CONNECTED, WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -100, (unsigned long)disconnects);\n  }\n}\n"},{"id":"classic_web_gpio","title":"Tableau de bord web des GPIO","desc":"Page web qui commande 4 sorties et lit une entrée analogique en direct.","tags":["web","GPIO"],"boards":["esp32"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Tableau de bord web : 4 sorties et une entrée analogique\n// Rejoint le Wi-Fi du MASTER (ESP32-LAB) ; adaptez SSID/mot de passe si besoin.\n#include <Arduino.h>\n#include <WiFi.h>\n#include <WebServer.h>\n\nconst char *WIFI_SSID = \"ESP32-LAB\";\nconst char *WIFI_PASS = \"ESP32-LAB-Setup2026!\";\nconst uint8_t OUTPUTS[4] = {4, 16, 17, 18};    // à adapter (ESP32 DevKit)\nconst uint8_t ANALOG_IN = 34;\nWebServer server(80);\n\nconst char PAGE[] PROGMEM = R\"HTML(<!doctype html><html lang=\"fr\"><meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>GPIO</title>\n<style>body{font-family:system-ui;margin:20px}.g{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:420px}\nbutton{padding:18px;font-size:16px;border-radius:12px;border:1px solid #888}button.on{background:#2e7d32;color:#fff}</style>\n<h1>Sorties GPIO</h1><div class=\"g\" id=\"g\"></div><p>Entrée analogique : <b id=\"a\">…</b> mV</p>\n<script>async function r(){const d=await(await fetch('/api')).json();document.getElementById('a').textContent=d.adc;\ndocument.getElementById('g').innerHTML=d.out.map((v,i)=>`<button class=\"${v?'on':''}\" onclick=\"t(${i})\">GPIO${d.pins[i]} : ${v?'ON':'OFF'}</button>`).join('')}\nasync function t(i){await fetch('/toggle?i='+i,{method:'POST'});r()}r();setInterval(r,1500)</script></html>)HTML\";\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  for (uint8_t p : OUTPUTS) { pinMode(p, OUTPUT); digitalWrite(p, LOW); }\n  WiFi.mode(WIFI_STA);\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }\n  Serial.printf(\"\\n# http://%s/\\n\", WiFi.localIP().toString().c_str());\n  server.on(\"/\", []() { server.send_P(200, \"text/html; charset=utf-8\", PAGE); });\n  server.on(\"/api\", []() {\n    String j = \"{\\\"pins\\\":[\";\n    for (int i = 0; i < 4; i++) j += String(i ? \",\" : \"\") + OUTPUTS[i];\n    j += \"],\\\"out\\\":[\";\n    for (int i = 0; i < 4; i++) j += String(i ? \",\" : \"\") + digitalRead(OUTPUTS[i]);\n    j += \"],\\\"adc\\\":\" + String(analogReadMilliVolts(ANALOG_IN)) + \"}\";\n    server.send(200, \"application/json\", j);\n  });\n  server.on(\"/toggle\", HTTP_POST, []() {\n    int i = server.arg(\"i\").toInt();\n    if (i >= 0 && i < 4) digitalWrite(OUTPUTS[i], !digitalRead(OUTPUTS[i]));\n    server.send(204);\n  });\n  server.begin();\n}\n\nvoid loop() {\n  server.handleClient();\n}\n"},{"id":"classic_http_json","title":"Client HTTPS + JSON (météo Open-Meteo)","desc":"Interroge une API publique et décode la réponse JSON avec ArduinoJson.","tags":["HTTPS","JSON","API"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[{"name":"ArduinoJson","ver":"7.4.3","repo":"bblanchon/ArduinoJson","author":"Benoît Blanchon"}],"code":"// ESP32 LAB — Client HTTPS + JSON : météo actuelle via l'API ouverte Open-Meteo (sans clé)\n// Bibliothèque : ArduinoJson 7\n#include <Arduino.h>\n#include <WiFi.h>\n#include <HTTPClient.h>\n#include <NetworkClientSecure.h>\n#include <ArduinoJson.h>\n\nconst char *WIFI_SSID = \"VotreBox\";\nconst char *WIFI_PASS = \"VotreMotDePasse\";\nconst float LATITUDE = 48.85, LONGITUDE = 2.35;   // Paris\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }\n  Serial.println(F(\"\\n# Wi-Fi connecté\"));\n}\n\nvoid loop() {\n  NetworkClientSecure client;\n  client.setInsecure();            // démonstration ; en production, chargez le certificat racine (setCACert)\n  HTTPClient http;\n  String url = String(\"https://api.open-meteo.com/v1/forecast?latitude=\") + LATITUDE + \"&longitude=\" + LONGITUDE +\n               \"&current=temperature_2m,relative_humidity_2m,wind_speed_10m\";\n  if (http.begin(client, url)) {\n    int code = http.GET();\n    if (code == HTTP_CODE_OK) {\n      JsonDocument doc;\n      DeserializationError err = deserializeJson(doc, http.getStream());\n      if (!err) {\n        float t = doc[\"current\"][\"temperature_2m\"];\n        float h = doc[\"current\"][\"relative_humidity_2m\"];\n        float w = doc[\"current\"][\"wind_speed_10m\"];\n        Serial.printf(\"meteo_temp:%.1f\\tmeteo_hum:%.0f\\tmeteo_vent:%.1f\\n\", t, h, w);\n      } else {\n        Serial.printf(\"# JSON invalide : %s\\n\", err.c_str());\n      }\n    } else {\n      Serial.printf(\"# HTTP %d\\n\", code);\n    }\n    http.end();\n  }\n  delay(60000);\n}\n"},{"id":"classic_ntp_clock","title":"Horloge Internet NTP","desc":"Heure exacte avec fuseau horaire et changement d'heure automatiques.","tags":["NTP","heure"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Horloge Internet (NTP) avec fuseau horaire et heure d'été automatiques\n#include <Arduino.h>\n#include <WiFi.h>\n#include <time.h>\n\nconst char *WIFI_SSID = \"VotreBox\";\nconst char *WIFI_PASS = \"VotreMotDePasse\";\nconst char *TZ_EUROPE_PARIS = \"CET-1CEST,M3.5.0,M10.5.0/3\";   // chaîne POSIX (voir docs/FUSEAUX.md)\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }\n  configTzTime(TZ_EUROPE_PARIS, \"pool.ntp.org\", \"time.google.com\");\n  Serial.println(F(\"\\n# synchronisation NTP…\"));\n}\n\nvoid loop() {\n  struct tm t;\n  if (getLocalTime(&t, 2000)) {\n    char buf[64];\n    strftime(buf, sizeof(buf), \"%A %d %B %Y, %H:%M:%S\", &t);\n    Serial.printf(\"# %s\\n\", buf);\n  } else {\n    Serial.println(F(\"# heure pas encore disponible\"));\n  }\n  delay(1000);\n}\n"},{"id":"classic_mdns","title":"Nom réseau mDNS (.local)","desc":"Accéder à la carte par http://esp32-demo.local/ au lieu de son adresse IP.","tags":["mDNS","réseau"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Nom réseau mDNS : joignez la carte par http://esp32-demo.local/ au lieu de son IP\n#include <Arduino.h>\n#include <WiFi.h>\n#include <ESPmDNS.h>\n#include <WebServer.h>\n\nconst char *WIFI_SSID = \"ESP32-LAB\";\nconst char *WIFI_PASS = \"ESP32-LAB-Setup2026!\";\nconst char *HOSTNAME = \"esp32-demo\";\nWebServer server(80);\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.setHostname(HOSTNAME);\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }\n  if (MDNS.begin(HOSTNAME)) {\n    MDNS.addService(\"http\", \"tcp\", 80);\n    Serial.printf(\"\\n# http://%s.local/  (IP %s)\\n\", HOSTNAME, WiFi.localIP().toString().c_str());\n  }\n  server.on(\"/\", []() { server.send(200, \"text/plain; charset=utf-8\", \"Bonjour depuis esp32-demo.local !\"); });\n  server.begin();\n}\n\nvoid loop() {\n  server.handleClient();\n}\n"},{"id":"classic_udp_echo","title":"Serveur UDP écho","desc":"Renvoie chaque datagramme reçu : base des protocoles légers.","tags":["UDP","réseau"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Serveur UDP « écho » : renvoie chaque datagramme reçu (test : nc -u IP 4210)\n#include <Arduino.h>\n#include <WiFi.h>\n#include <WiFiUdp.h>\n\nconst char *WIFI_SSID = \"ESP32-LAB\";\nconst char *WIFI_PASS = \"ESP32-LAB-Setup2026!\";\nconst uint16_t PORT = 4210;\nWiFiUDP udp;\nuint32_t packets = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }\n  udp.begin(PORT);\n  Serial.printf(\"\\n# écho UDP sur %s:%u\\n\", WiFi.localIP().toString().c_str(), PORT);\n}\n\nvoid loop() {\n  int n = udp.parsePacket();\n  if (n > 0) {\n    uint8_t buf[512];\n    int len = udp.read(buf, sizeof(buf));\n    udp.beginPacket(udp.remoteIP(), udp.remotePort());\n    udp.write(buf, len);\n    udp.endPacket();\n    packets++;\n    Serial.printf(\"# %d octets de %s:%u (total %lu)\\n\", len, udp.remoteIP().toString().c_str(), udp.remotePort(), (unsigned long)packets);\n  }\n}\n"},{"id":"classic_tcp_server","title":"Console Telnet (serveur TCP)","desc":"Commandes à distance par telnet : LED, mémoire, uptime.","tags":["TCP","Telnet"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Serveur TCP de type Telnet (port 23) : console de commandes à distance\n// Test : telnet <IP> ou nc <IP> 23 ; commandes : help, heap, uptime, led on|off, bye\n#include <Arduino.h>\n#include <WiFi.h>\n\n#ifndef LED_BUILTIN\n#define LED_BUILTIN 2\n#endif\n\nconst char *WIFI_SSID = \"ESP32-LAB\";\nconst char *WIFI_PASS = \"ESP32-LAB-Setup2026!\";\nNetworkServer server(23);\nNetworkClient client;\nString line;\n\nvoid handle(const String &cmd) {\n  if (cmd == \"help\") client.println(\"help | heap | uptime | led on | led off | bye\");\n  else if (cmd == \"heap\") client.printf(\"heap libre : %lu octets\\r\\n\", (unsigned long)ESP.getFreeHeap());\n  else if (cmd == \"uptime\") client.printf(\"en marche depuis %lu s\\r\\n\", (unsigned long)(millis() / 1000));\n  else if (cmd == \"led on\") { digitalWrite(LED_BUILTIN, HIGH); client.println(\"ok\"); }\n  else if (cmd == \"led off\") { digitalWrite(LED_BUILTIN, LOW); client.println(\"ok\"); }\n  else if (cmd == \"bye\") { client.println(\"au revoir\"); client.stop(); }\n  else if (cmd.length()) client.println(\"commande inconnue (help)\");\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  pinMode(LED_BUILTIN, OUTPUT);\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }\n  server.begin();\n  Serial.printf(\"\\n# telnet %s\\n\", WiFi.localIP().toString().c_str());\n}\n\nvoid loop() {\n  if (!client || !client.connected()) {\n    client = server.accept();\n    if (client) { client.println(\"ESP32 LAB — tapez help\"); line = \"\"; }\n    return;\n  }\n  while (client.available()) {\n    char c = client.read();\n    if (c == '\\n') { line.trim(); handle(line); line = \"\"; }\n    else if (c != '\\r' && line.length() < 80) line += c;\n  }\n}\n"},{"id":"classic_espnow_sender","title":"ESP-NOW émetteur","desc":"Envoi direct carte à carte sans box Wi-Fi, avec accusé de réception.","tags":["ESP-NOW","radio"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — ESP-NOW émetteur : envoi direct de carte à carte, sans box Wi-Fi (portée ~200 m)\n// Renseignez l'adresse MAC du récepteur (affichée par classic_espnow_receiver).\n#include <Arduino.h>\n#include <WiFi.h>\n#include <esp_now.h>\n\nuint8_t RECEIVER_MAC[6] = {0x24, 0x6F, 0x28, 0x00, 0x00, 0x00};   // à remplacer\n\ntypedef struct {\n  uint32_t counter;\n  float value;\n  char text[32];\n} message_t;\n\nmessage_t msg;\n\nvoid onSent(const esp_now_send_info_t *info, esp_now_send_status_t status) {\n  (void)info;\n  Serial.printf(\"# envoi %lu : %s\\n\", (unsigned long)msg.counter, status == ESP_NOW_SEND_SUCCESS ? \"reçu\" : \"échec\");\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.mode(WIFI_STA);\n  if (esp_now_init() != ESP_OK) { Serial.println(F(\"# esp_now_init a échoué\")); return; }\n  esp_now_register_send_cb(onSent);\n  esp_now_peer_info_t peer = {};\n  memcpy(peer.peer_addr, RECEIVER_MAC, 6);\n  peer.channel = 0;\n  peer.encrypt = false;\n  if (esp_now_add_peer(&peer) != ESP_OK) Serial.println(F(\"# ajout du pair impossible\"));\n}\n\nvoid loop() {\n  msg.counter++;\n  msg.value = temperatureRead();\n  snprintf(msg.text, sizeof(msg.text), \"bonjour %lu\", (unsigned long)msg.counter);\n  esp_now_send(RECEIVER_MAC, (const uint8_t *)&msg, sizeof(msg));\n  delay(2000);\n}\n"},{"id":"classic_espnow_receiver","title":"ESP-NOW récepteur","desc":"Affiche son adresse MAC et les messages reçus avec le RSSI.","tags":["ESP-NOW","radio"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — ESP-NOW récepteur : affiche son adresse MAC puis les messages reçus\n#include <Arduino.h>\n#include <WiFi.h>\n#include <esp_now.h>\n\ntypedef struct {\n  uint32_t counter;\n  float value;\n  char text[32];\n} message_t;\n\nvoid onReceive(const esp_now_recv_info_t *info, const uint8_t *data, int len) {\n  if (len != sizeof(message_t)) return;\n  message_t m;\n  memcpy(&m, data, sizeof(m));\n  const uint8_t *s = info->src_addr;\n  Serial.printf(\"# de %02X:%02X:%02X:%02X:%02X:%02X  n°%lu  valeur %.2f  « %s »  RSSI %d dBm\\n\",\n                s[0], s[1], s[2], s[3], s[4], s[5], (unsigned long)m.counter, m.value, m.text, info->rx_ctrl->rssi);\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.mode(WIFI_STA);\n  Serial.printf(\"\\n# MAC de ce récepteur : %s\\n\", WiFi.macAddress().c_str());\n  if (esp_now_init() != ESP_OK) { Serial.println(F(\"# esp_now_init a échoué\")); return; }\n  esp_now_register_recv_cb(onReceive);\n}\n\nvoid loop() {\n  delay(1000);\n}\n"},{"id":"classic_espnow_broadcast","title":"ESP-NOW en diffusion (maillage simple)","desc":"Chaque carte émet et reçoit : réseau de capteurs sans routeur.","tags":["ESP-NOW","diffusion"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — ESP-NOW en diffusion : chaque carte émet et reçoit (flashez-le sur 2 cartes ou plus)\n#include <Arduino.h>\n#include <WiFi.h>\n#include <esp_now.h>\n\nuint8_t BROADCAST[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};\nuint32_t sent = 0, received = 0;\n\nvoid onReceive(const esp_now_recv_info_t *info, const uint8_t *data, int len) {\n  received++;\n  Serial.printf(\"# reçu de %02X:%02X:%02X:%02X:%02X:%02X : %.*s (RSSI %d)\\n\", info->src_addr[0], info->src_addr[1],\n                info->src_addr[2], info->src_addr[3], info->src_addr[4], info->src_addr[5], len, (const char *)data, info->rx_ctrl->rssi);\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.mode(WIFI_STA);\n  esp_now_init();\n  esp_now_register_recv_cb(onReceive);\n  esp_now_peer_info_t peer = {};\n  memcpy(peer.peer_addr, BROADCAST, 6);\n  esp_now_add_peer(&peer);\n  Serial.printf(\"\\n# %s prêt\\n\", WiFi.macAddress().c_str());\n}\n\nvoid loop() {\n  char msg[48];\n  int n = snprintf(msg, sizeof(msg), \"salut n°%lu de %s\", (unsigned long)++sent, WiFi.macAddress().c_str());\n  esp_now_send(BROADCAST, (const uint8_t *)msg, n);\n  Serial.printf(\"envoyes:%lu\\trecus:%lu\\n\", (unsigned long)sent, (unsigned long)received);\n  delay(3000 + (esp_random() % 1000));   // décalage aléatoire pour limiter les collisions\n}\n"},{"id":"classic_deep_sleep_timer","title":"Sommeil profond minuté","desc":"Réveil périodique à ~10 µA : l'essentiel des objets sur batterie.","tags":["basse consommation","batterie"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Sommeil profond minuté : ~10 µA entre deux mesures (idéal sur batterie)\n#include <Arduino.h>\n\nRTC_DATA_ATTR uint32_t bootCount = 0;      // conservé pendant le deep sleep (mémoire RTC)\nconst uint64_t SLEEP_SECONDS = 20;\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  bootCount++;\n  esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();\n  Serial.printf(\"\\n# réveil n°%lu, cause : %s\\n\", (unsigned long)bootCount,\n                cause == ESP_SLEEP_WAKEUP_TIMER ? \"minuterie\" : \"mise sous tension / reset\");\n  // … faire la mesure ici (capteur, envoi réseau) …\n  Serial.printf(\"# température interne : %.1f °C\\n\", temperatureRead());\n  Serial.printf(\"# sommeil profond pendant %llu s\\n\", SLEEP_SECONDS);\n  Serial.flush();\n  esp_sleep_enable_timer_wakeup(SLEEP_SECONDS * 1000000ULL);\n  esp_deep_sleep_start();\n}\n\nvoid loop() {\n  // jamais atteint : l'ESP32 redémarre à chaque réveil\n}\n"},{"id":"classic_deep_sleep_button","title":"Sommeil profond réveillé par bouton","desc":"Réveil sur broche RTC (ext0) : télécommande ou sonnette sur pile.","tags":["basse consommation","bouton"],"boards":["esp32","esp32s3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Sommeil profond réveillé par un bouton (broche RTC) : télécommande, sonnette sur pile\n#include <Arduino.h>\n#include \"driver/rtc_io.h\"\n\n#if CONFIG_IDF_TARGET_ESP32\nconst gpio_num_t WAKE_PIN = GPIO_NUM_33;     // broche RTC de l'ESP32\n#else\nconst gpio_num_t WAKE_PIN = GPIO_NUM_4;      // ESP32-S3 : GPIO 0 à 21 sont RTC\n#endif\nRTC_DATA_ATTR uint32_t presses = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  if (esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_EXT0) presses++;\n  Serial.printf(\"\\n# appuis cumulés : %lu — bouton entre GPIO%d et GND\\n\", (unsigned long)presses, (int)WAKE_PIN);\n  rtc_gpio_pullup_en(WAKE_PIN);               // tirage interne maintenu pendant le sommeil\n  rtc_gpio_pulldown_dis(WAKE_PIN);\n  esp_sleep_enable_ext0_wakeup(WAKE_PIN, 0);  // réveil sur niveau bas\n  Serial.println(F(\"# dodo…\"));\n  Serial.flush();\n  delay(200);\n  esp_deep_sleep_start();\n}\n\nvoid loop() {}\n"},{"id":"classic_preferences","title":"Réglages en mémoire non volatile (NVS)","desc":"Enregistre un nom, un seuil et un compteur de démarrages avec Preferences.","tags":["NVS","stockage"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Mémoire non volatile (NVS / Preferences) : réglages conservés après coupure\n// Tapez dans le moniteur série : nom=MonCapteur  ou  seuil=25.5  ou  reset\n#include <Arduino.h>\n#include <Preferences.h>\n\nPreferences prefs;\nString name;\nfloat threshold;\nuint32_t boots;\n\nvoid load() {\n  prefs.begin(\"lab\", true);                  // lecture seule\n  name = prefs.getString(\"name\", \"capteur-1\");\n  threshold = prefs.getFloat(\"seuil\", 20.0f);\n  boots = prefs.getUInt(\"boots\", 0);\n  prefs.end();\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  load();\n  prefs.begin(\"lab\", false);\n  prefs.putUInt(\"boots\", ++boots);\n  prefs.end();\n  Serial.printf(\"\\n# démarrage n°%lu — nom « %s », seuil %.1f\\n\", (unsigned long)boots, name.c_str(), threshold);\n}\n\nvoid loop() {\n  if (Serial.available()) {\n    String l = Serial.readStringUntil('\\n');\n    l.trim();\n    prefs.begin(\"lab\", false);\n    if (l.startsWith(\"nom=\")) { prefs.putString(\"name\", l.substring(4)); Serial.println(F(\"# nom enregistré\")); }\n    else if (l.startsWith(\"seuil=\")) { prefs.putFloat(\"seuil\", l.substring(6).toFloat()); Serial.println(F(\"# seuil enregistré\")); }\n    else if (l == \"reset\") { prefs.clear(); Serial.println(F(\"# réglages effacés\")); }\n    prefs.end();\n    load();\n    Serial.printf(\"# nom « %s », seuil %.1f\\n\", name.c_str(), threshold);\n  }\n}\n"},{"id":"classic_littlefs","title":"Fichiers dans la flash (LittleFS)","desc":"Écrire, relire et lister des fichiers dans la mémoire flash interne.","tags":["LittleFS","fichiers"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Système de fichiers LittleFS dans la flash : écrire, relire, lister\n#include <Arduino.h>\n#include <LittleFS.h>\n\nvoid listDir(const char *path) {\n  File root = LittleFS.open(path);\n  for (File f = root.openNextFile(); f; f = root.openNextFile())\n    Serial.printf(\"#   %-24s %6u octets\\n\", f.name(), (unsigned)f.size());\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  if (!LittleFS.begin(true)) {               // true = formate au premier usage\n    Serial.println(F(\"# LittleFS indisponible (schéma de partition sans SPIFFS ?)\"));\n    return;\n  }\n  File f = LittleFS.open(\"/journal.txt\", FILE_APPEND);\n  f.printf(\"démarrage à %lu ms, RAM libre %lu\\n\", (unsigned long)millis(), (unsigned long)ESP.getFreeHeap());\n  f.close();\n  Serial.println(F(\"\\n# contenu de /journal.txt :\"));\n  f = LittleFS.open(\"/journal.txt\");\n  while (f.available()) Serial.write(f.read());\n  f.close();\n  Serial.println(F(\"# fichiers :\"));\n  listDir(\"/\");\n  Serial.printf(\"# utilisé %u / %u octets\\n\", (unsigned)LittleFS.usedBytes(), (unsigned)LittleFS.totalBytes());\n}\n\nvoid loop() {}\n"},{"id":"classic_heap_monitor","title":"Moniteur de mémoire","desc":"RAM, PSRAM, fragmentation et pile en direct : chasse aux fuites mémoire.","tags":["mémoire","diagnostic"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Moniteur mémoire : RAM, PSRAM, fragmentation, pile — détecte les fuites mémoire\n#include <Arduino.h>\n#include <esp_heap_caps.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n}\n\nvoid loop() {\n  size_t freeHeap = ESP.getFreeHeap();\n  size_t minHeap = ESP.getMinFreeHeap();\n  size_t largest = heap_caps_get_largest_free_block(MALLOC_CAP_8BIT);\n  float frag = freeHeap ? 100.0f * (1.0f - (float)largest / freeHeap) : 0;\n  Serial.printf(\"heap_ko:%.1f\\theap_min_ko:%.1f\\tbloc_max_ko:%.1f\\tfragmentation:%.1f\\tpsram_ko:%.1f\\tpile_libre:%u\\n\",\n                freeHeap / 1024.0f, minHeap / 1024.0f, largest / 1024.0f, frag, ESP.getFreePsram() / 1024.0f,\n                (unsigned)uxTaskGetStackHighWaterMark(NULL));\n  delay(2000);\n}\n"},{"id":"classic_chip_info","title":"Carte d'identité de la puce","desc":"Modèle, révision, flash, PSRAM, MAC, versions, table des partitions.","tags":["diagnostic","puce"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Carte d'identité de la puce : modèle, cœurs, flash, PSRAM, adresses MAC, partitions\n#include <Arduino.h>\n#include <esp_chip_info.h>\n#include <esp_mac.h>\n#include <esp_partition.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(500);\n  esp_chip_info_t info;\n  esp_chip_info(&info);\n  Serial.printf(\"\\n# Puce        : %s rév. %d, %d cœur(s) à %lu MHz\\n\", ESP.getChipModel(), ESP.getChipRevision(), info.cores, (unsigned long)ESP.getCpuFreqMHz());\n  Serial.printf(\"# Fonctions   : %s%s%s%s\\n\", info.features & CHIP_FEATURE_WIFI_BGN ? \"Wi-Fi \" : \"\", info.features & CHIP_FEATURE_BT ? \"BT \" : \"\",\n                info.features & CHIP_FEATURE_BLE ? \"BLE \" : \"\", info.features & CHIP_FEATURE_IEEE802154 ? \"802.15.4 \" : \"\");\n  Serial.printf(\"# Flash       : %lu Mo à %lu MHz\\n\", (unsigned long)(ESP.getFlashChipSize() >> 20), (unsigned long)(ESP.getFlashChipSpeed() / 1000000));\n  Serial.printf(\"# PSRAM       : %lu Ko\\n\", (unsigned long)(ESP.getPsramSize() >> 10));\n  Serial.printf(\"# Croquis     : %lu Ko utilisés, %lu Ko libres pour l'OTA\\n\", (unsigned long)(ESP.getSketchSize() >> 10), (unsigned long)(ESP.getFreeSketchSpace() >> 10));\n  Serial.printf(\"# Cœur Arduino: %s, ESP-IDF %s\\n\", ESP.getCoreVersion(), ESP.getSdkVersion());\n  uint8_t mac[6];\n  esp_read_mac(mac, ESP_MAC_WIFI_STA);\n  Serial.printf(\"# MAC Wi-Fi   : %02X:%02X:%02X:%02X:%02X:%02X\\n\", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);\n  Serial.println(F(\"# Partitions  :\"));\n  esp_partition_iterator_t it = esp_partition_find(ESP_PARTITION_TYPE_ANY, ESP_PARTITION_SUBTYPE_ANY, NULL);\n  for (; it; it = esp_partition_next(it)) {\n    const esp_partition_t *p = esp_partition_get(it);\n    Serial.printf(\"#   %-10s type %d/%-3d  0x%06lX  %5lu Ko\\n\", p->label, p->type, p->subtype, (unsigned long)p->address, (unsigned long)(p->size >> 10));\n  }\n  esp_partition_iterator_release(it);\n}\n\nvoid loop() {}\n"},{"id":"classic_freertos_tasks","title":"Multitâche FreeRTOS","desc":"Deux tâches, une file de messages et un mutex répartis sur les deux cœurs.","tags":["FreeRTOS","multitâche"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":3,"libs":[],"code":"// ESP32 LAB — Multitâche FreeRTOS : deux tâches, une file de messages, un mutex, les deux cœurs\n#include <Arduino.h>\n\nQueueHandle_t queue;\nSemaphoreHandle_t serialMutex;\n\n#if CONFIG_FREERTOS_UNICORE\n#define CORE_A 0\n#define CORE_B 0\n#else\n#define CORE_A 0\n#define CORE_B 1\n#endif\n\nvoid logLine(const char *fmt, uint32_t v) {\n  xSemaphoreTake(serialMutex, portMAX_DELAY);  // un seul accès à la fois au port série\n  Serial.printf(fmt, (unsigned long)v, xPortGetCoreID());\n  xSemaphoreGive(serialMutex);\n}\n\nvoid producer(void *arg) {\n  uint32_t n = 0;\n  for (;;) {\n    n++;\n    xQueueSend(queue, &n, portMAX_DELAY);\n    logLine(\"# producteur : %lu envoyé (cœur %d)\\n\", n);\n    vTaskDelay(pdMS_TO_TICKS(700));\n  }\n}\n\nvoid consumer(void *arg) {\n  uint32_t v;\n  for (;;) {\n    if (xQueueReceive(queue, &v, portMAX_DELAY) == pdTRUE) logLine(\"# consommateur : %lu reçu (cœur %d)\\n\", v);\n  }\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  queue = xQueueCreate(8, sizeof(uint32_t));\n  serialMutex = xSemaphoreCreateMutex();\n  xTaskCreatePinnedToCore(producer, \"producteur\", 3072, NULL, 2, NULL, CORE_A);\n  xTaskCreatePinnedToCore(consumer, \"consommateur\", 3072, NULL, 2, NULL, CORE_B);\n}\n\nvoid loop() {\n  vTaskDelay(pdMS_TO_TICKS(5000));\n  logLine(\"# loop() : %lu tâches actives (cœur %d)\\n\", uxTaskGetNumberOfTasks());\n}\n"},{"id":"classic_hw_timer","title":"Minuterie matérielle","desc":"Interruption précise toutes les 100 ms avec l'API timer d'Arduino-ESP32 3.x.","tags":["timer","interruption"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Minuterie matérielle (API Arduino-ESP32 3.x) : interruption précise toutes les 100 ms\n#include <Arduino.h>\n\nhw_timer_t *timer = nullptr;\nvolatile uint32_t ticks = 0;\nportMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;\n\nvoid ARDUINO_ISR_ATTR onTimer() {\n  portENTER_CRITICAL_ISR(&mux);\n  ticks = ticks + 1;\n  portEXIT_CRITICAL_ISR(&mux);\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  timer = timerBegin(1000000);                // 1 MHz : 1 tic = 1 µs\n  timerAttachInterrupt(timer, &onTimer);\n  timerAlarm(timer, 100000, true, 0);         // toutes les 100 000 µs, rechargement automatique\n}\n\nvoid loop() {\n  static uint32_t last = 0;\n  if (millis() - last >= 1000) {\n    last = millis();\n    portENTER_CRITICAL(&mux);\n    uint32_t t = ticks;\n    portEXIT_CRITICAL(&mux);\n    Serial.printf(\"interruptions:%lu\\n\", (unsigned long)t);   // +10 par seconde\n  }\n}\n"},{"id":"classic_task_watchdog","title":"Chien de garde (watchdog)","desc":"Redémarrage automatique si le programme se bloque.","tags":["watchdog","fiabilité"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Chien de garde (Task WDT) : redémarre la carte si le programme se bloque\n// Tapez « bloque » dans le moniteur série pour simuler un blocage : reset au bout de 5 s.\n#include <Arduino.h>\n#include <esp_task_wdt.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  Serial.printf(\"\\n# cause du dernier redémarrage : %d (7 = watchdog de tâche)\\n\", (int)esp_reset_reason());\n  esp_task_wdt_config_t cfg = {};\n  cfg.timeout_ms = 5000;\n  cfg.idle_core_mask = 0;\n  cfg.trigger_panic = true;\n  if (esp_task_wdt_init(&cfg) == ESP_ERR_INVALID_STATE) esp_task_wdt_reconfigure(&cfg);   // déjà initialisé par le cœur\n  esp_task_wdt_add(NULL);                     // surveille la tâche loop()\n}\n\nvoid loop() {\n  esp_task_wdt_reset();                       // « je suis vivant »\n  if (Serial.available() && Serial.readStringUntil('\\n').indexOf(\"bloque\") >= 0) {\n    Serial.println(F(\"# boucle infinie volontaire…\"));\n    while (true) delay(10);\n  }\n  delay(100);\n}\n"},{"id":"classic_ledc_fade","title":"Fondu LED matériel (LEDC)","desc":"Variation de luminosité réalisée par le périphérique, sans charger le CPU.","tags":["PWM","LED"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Fondu matériel LEDC : la variation se fait sans occuper le processeur\n#include <Arduino.h>\n\nconst uint8_t LED_PIN = 4;\nconst uint32_t FREQ = 5000;\nconst uint8_t RESOLUTION = 10;               // 0-1023\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  ledcAttach(LED_PIN, FREQ, RESOLUTION);\n}\n\nvoid loop() {\n  ledcFade(LED_PIN, 0, 1023, 1500);          // montée en 1,5 s (géré par le périphérique LEDC)\n  delay(1700);\n  ledcFade(LED_PIN, 1023, 0, 1500);\n  delay(1700);\n}\n"},{"id":"classic_ledc_tone","title":"Mélodie sur buzzer passif","desc":"Frère Jacques joué avec tone().","tags":["son","mélodie"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Mélodie sur buzzer passif (Frère Jacques) avec tone()\n#include <Arduino.h>\n\nconst uint8_t BUZZER = 25;\nconst uint16_t DO = 262, RE = 294, MI = 330, FA = 349, SOL = 392, LA = 440;\nconst uint16_t notes[] = {DO, RE, MI, DO, DO, RE, MI, DO, MI, FA, SOL, MI, FA, SOL};\nconst uint16_t durees[] = {400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 800, 400, 400, 800};\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n}\n\nvoid loop() {\n  for (size_t i = 0; i < sizeof(notes) / sizeof(notes[0]); i++) {\n    tone(BUZZER, notes[i], durees[i] * 9 / 10);\n    delay(durees[i]);\n  }\n  noTone(BUZZER);\n  delay(2000);\n}\n"},{"id":"classic_adc_oversampling","title":"Mesure analogique étalonnée","desc":"Suréchantillonnage, min/max et bruit avec analogReadMilliVolts().","tags":["ADC","mesure"],"boards":["esp32"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Mesure analogique propre : tension étalonnée, suréchantillonnage, min/max, bruit\n#include <Arduino.h>\n\nconst uint8_t ADC_PIN = 34;                  // ADC1 uniquement si le Wi-Fi est actif\nconst int SAMPLES = 64;\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  analogReadResolution(12);\n  analogSetPinAttenuation(ADC_PIN, ADC_11db); // plage ~0-3,1 V\n}\n\nvoid loop() {\n  uint32_t sum = 0;\n  uint32_t mn = 99999, mx = 0;\n  for (int i = 0; i < SAMPLES; i++) {\n    uint32_t mv = analogReadMilliVolts(ADC_PIN);   // valeur corrigée par l'étalonnage d'usine (eFuse)\n    sum += mv;\n    mn = min(mn, mv);\n    mx = max(mx, mv);\n  }\n  Serial.printf(\"moyenne_mV:%.1f\\tmin_mV:%lu\\tmax_mV:%lu\\tbruit_mV:%lu\\n\", (float)sum / SAMPLES, (unsigned long)mn, (unsigned long)mx, (unsigned long)(mx - mn));\n  delay(250);\n}\n"},{"id":"classic_pcnt_counter","title":"Compteur d'impulsions matériel (PCNT)","desc":"Compte des impulsions jusqu'à plusieurs MHz sans interruption.","tags":["PCNT","compteur"],"boards":["esp32","esp32s3"],"difficulty":3,"libs":[],"code":"// ESP32 LAB — Compteur d'impulsions matériel (PCNT) : compte jusqu'à plusieurs MHz sans interruption\n// Idéal pour débitmètres, codeurs, compteurs d'énergie à LED. (ESP32 / ESP32-S3 ; absent sur C3)\n#include <Arduino.h>\n#include \"driver/pulse_cnt.h\"\n\nconst int PULSE_PIN = 4;\npcnt_unit_handle_t unit = nullptr;\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  pcnt_unit_config_t ucfg = {};\n  ucfg.low_limit = -1;\n  ucfg.high_limit = 30000;\n  ucfg.flags.accum_count = 1;                // cumule au-delà de la limite\n  ESP_ERROR_CHECK(pcnt_new_unit(&ucfg, &unit));\n  pcnt_glitch_filter_config_t filter = {.max_glitch_ns = 1000};\n  ESP_ERROR_CHECK(pcnt_unit_set_glitch_filter(unit, &filter));\n  pcnt_chan_config_t ccfg = {};\n  ccfg.edge_gpio_num = PULSE_PIN;\n  ccfg.level_gpio_num = -1;\n  pcnt_channel_handle_t chan = nullptr;\n  ESP_ERROR_CHECK(pcnt_new_channel(unit, &ccfg, &chan));\n  ESP_ERROR_CHECK(pcnt_channel_set_edge_action(chan, PCNT_CHANNEL_EDGE_ACTION_INCREASE, PCNT_CHANNEL_EDGE_ACTION_HOLD));\n  ESP_ERROR_CHECK(pcnt_unit_add_watch_point(unit, 30000));\n  ESP_ERROR_CHECK(pcnt_unit_enable(unit));\n  ESP_ERROR_CHECK(pcnt_unit_clear_count(unit));\n  ESP_ERROR_CHECK(pcnt_unit_start(unit));\n  pinMode(PULSE_PIN, INPUT_PULLUP);\n}\n\nvoid loop() {\n  static int last = 0;\n  int count = 0;\n  pcnt_unit_get_count(unit, &count);\n  Serial.printf(\"total:%d\\tfrequence_hz:%d\\n\", count, count - last);\n  last = count;\n  delay(1000);\n}\n"},{"id":"classic_interrupt_counter","title":"Interruption et anti-rebond","desc":"Compter les appuis sur le bouton BOOT par interruption.","tags":["interruption","bouton"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Interruption sur front + anti-rebond : compter des appuis ou des impulsions\n#include <Arduino.h>\n\nconst uint8_t BUTTON = 0;                    // bouton BOOT de la carte\nvolatile uint32_t count = 0;\nvolatile uint32_t lastUs = 0;\n\nvoid ARDUINO_ISR_ATTR onFall() {\n  uint32_t t = micros();\n  if (t - lastUs > 20000) {                  // ignore les rebonds < 20 ms\n    count = count + 1;\n    lastUs = t;\n  }\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  pinMode(BUTTON, INPUT_PULLUP);\n  attachInterrupt(digitalPinToInterrupt(BUTTON), onFall, FALLING);\n  Serial.println(F(\"\\n# appuyez sur BOOT\"));\n}\n\nvoid loop() {\n  static uint32_t shown = 0;\n  uint32_t c = count;\n  if (c != shown) {\n    shown = c;\n    Serial.printf(\"appuis:%lu\\n\", (unsigned long)c);\n  }\n  delay(10);\n}\n"},{"id":"classic_serial_cli","title":"Console de commandes série","desc":"Mini-shell : LED, PWM, mémoire, scan Wi-Fi, redémarrage.","tags":["série","console"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Interpréteur de commandes série (help, led, pwm, heap, wifi, reboot)\n#include <Arduino.h>\n#include <WiFi.h>\n\n#ifndef LED_BUILTIN\n#define LED_BUILTIN 2\n#endif\n\nString line;\n\nvoid cmdHelp() {\n  Serial.println(F(\"help            cette aide\"));\n  Serial.println(F(\"led on|off      LED intégrée\"));\n  Serial.println(F(\"pwm <0-255>     luminosité de la LED\"));\n  Serial.println(F(\"heap            mémoire libre\"));\n  Serial.println(F(\"scan            réseaux Wi-Fi\"));\n  Serial.println(F(\"reboot          redémarrer\"));\n}\n\nvoid execute(String cmd) {\n  cmd.trim();\n  if (!cmd.length()) return;\n  int sp = cmd.indexOf(' ');\n  String verb = sp < 0 ? cmd : cmd.substring(0, sp);\n  String arg = sp < 0 ? \"\" : cmd.substring(sp + 1);\n  verb.toLowerCase();\n  if (verb == \"help\") cmdHelp();\n  else if (verb == \"led\") { ledcDetach(LED_BUILTIN); pinMode(LED_BUILTIN, OUTPUT); digitalWrite(LED_BUILTIN, arg == \"on\"); Serial.println(F(\"ok\")); }\n  else if (verb == \"pwm\") { ledcAttach(LED_BUILTIN, 5000, 8); ledcWrite(LED_BUILTIN, constrain(arg.toInt(), 0, 255)); Serial.println(F(\"ok\")); }\n  else if (verb == \"heap\") Serial.printf(\"%lu octets libres (min %lu)\\n\", (unsigned long)ESP.getFreeHeap(), (unsigned long)ESP.getMinFreeHeap());\n  else if (verb == \"scan\") { int n = WiFi.scanNetworks(); for (int i = 0; i < n; i++) Serial.printf(\"%d dBm  %s\\n\", (int)WiFi.RSSI(i), WiFi.SSID(i).c_str()); WiFi.scanDelete(); }\n  else if (verb == \"reboot\") { Serial.println(F(\"redémarrage…\")); delay(100); ESP.restart(); }\n  else Serial.println(F(\"commande inconnue, tapez help\"));\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.mode(WIFI_STA);\n  Serial.println(F(\"\\nESP32 LAB — console prête (help)\"));\n  Serial.print(F(\"> \"));\n}\n\nvoid loop() {\n  while (Serial.available()) {\n    char c = Serial.read();\n    if (c == '\\n' || c == '\\r') {\n      if (line.length()) { Serial.println(); execute(line); line = \"\"; Serial.print(F(\"> \")); }\n    } else if (c == 8 || c == 127) {\n      if (line.length()) line.remove(line.length() - 1);\n    } else if (line.length() < 120) {\n      line += c;\n      Serial.print(c);                        // écho\n    }\n  }\n}\n"},{"id":"classic_json_serial","title":"Échanges JSON sur le port série","desc":"Piloter la carte depuis un PC (Python) en JSON avec ArduinoJson.","tags":["JSON","série","Python"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[{"name":"ArduinoJson","ver":"7.4.3","repo":"bblanchon/ArduinoJson","author":"Benoît Blanchon"}],"code":"// ESP32 LAB — Échanges JSON sur le port série (ArduinoJson 7) : idéal pour piloter la carte depuis Python\n// Envoyez par exemple : {\"cmd\":\"set\",\"led\":true,\"period\":500}\n#include <Arduino.h>\n#include <ArduinoJson.h>\n\n#ifndef LED_BUILTIN\n#define LED_BUILTIN 2\n#endif\n\nuint32_t period = 2000;\nbool led = false;\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  if (Serial.available()) {\n    JsonDocument in;\n    DeserializationError err = deserializeJson(in, Serial);\n    JsonDocument out;\n    if (err) {\n      out[\"ok\"] = false;\n      out[\"error\"] = err.c_str();\n    } else if (in[\"cmd\"] == \"set\") {\n      if (in[\"led\"].is<bool>()) { led = in[\"led\"]; digitalWrite(LED_BUILTIN, led); }\n      if (in[\"period\"].is<uint32_t>()) period = constrain(in[\"period\"].as<uint32_t>(), 100u, 60000u);\n      out[\"ok\"] = true;\n    } else {\n      out[\"ok\"] = false;\n      out[\"error\"] = \"commande inconnue\";\n    }\n    serializeJson(out, Serial);\n    Serial.println();\n    while (Serial.available()) Serial.read();\n  }\n  static uint32_t last = 0;\n  if (millis() - last >= period) {\n    last = millis();\n    JsonDocument doc;\n    doc[\"uptime_ms\"] = millis();\n    doc[\"heap\"] = ESP.getFreeHeap();\n    doc[\"temp_c\"] = temperatureRead();\n    doc[\"led\"] = led;\n    serializeJson(doc, Serial);\n    Serial.println();\n  }\n}\n"},{"id":"classic_serial_binary","title":"Protocole série binaire avec CRC","desc":"Trames binaires robustes (en-tête, longueur, CRC-16).","tags":["série","protocole"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":3,"libs":[],"code":"// ESP32 LAB — Protocole série binaire tramé : en-tête, longueur, CRC-16 (robuste aux erreurs)\n// Trame : 0xAA 0x55 | type | longueur | données… | CRC16 (Modbus, LSB d'abord)\n#include <Arduino.h>\n\nuint16_t crc16(const uint8_t *d, size_t n) {\n  uint16_t c = 0xFFFF;\n  for (size_t i = 0; i < n; i++) {\n    c ^= d[i];\n    for (int k = 0; k < 8; k++) c = (c & 1) ? (c >> 1) ^ 0xA001 : c >> 1;\n  }\n  return c;\n}\n\nvoid sendFrame(uint8_t type, const uint8_t *payload, uint8_t len) {\n  uint8_t buf[260];\n  buf[0] = 0xAA; buf[1] = 0x55; buf[2] = type; buf[3] = len;\n  memcpy(buf + 4, payload, len);\n  uint16_t c = crc16(buf + 2, len + 2);\n  buf[4 + len] = c & 0xFF;\n  buf[5 + len] = c >> 8;\n  Serial.write(buf, len + 6);\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n}\n\nvoid loop() {\n  struct __attribute__((packed)) {\n    uint32_t uptime;\n    uint32_t heap;\n    float temp;\n  } sample = {millis(), ESP.getFreeHeap(), temperatureRead()};\n  sendFrame(0x01, (const uint8_t *)&sample, sizeof(sample));\n  delay(1000);\n}\n"},{"id":"classic_uuid","title":"Identifiants uniques (UUID v4)","desc":"UUID aléatoires par le générateur matériel et identifiant de puce.","tags":["aléatoire","identifiant"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Identifiants uniques : UUID v4 (générateur matériel) et identifiant de puce\n#include <Arduino.h>\n#include <esp_random.h>\n\nString uuid4() {\n  uint8_t b[16];\n  esp_fill_random(b, sizeof(b));             // vrai aléa quand le Wi-Fi/BT est actif\n  b[6] = (b[6] & 0x0F) | 0x40;               // version 4\n  b[8] = (b[8] & 0x3F) | 0x80;               // variante RFC 4122\n  char s[37];\n  snprintf(s, sizeof(s), \"%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x\",\n           b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15]);\n  return String(s);\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  Serial.printf(\"\\n# identifiant de puce : %012llX\\n\", ESP.getEfuseMac());\n}\n\nvoid loop() {\n  Serial.printf(\"# %s\\n\", uuid4().c_str());\n  delay(2000);\n}\n"},{"id":"classic_uart_loopback","title":"Test de boucle UART","desc":"Vérifie un UART et ses broches avec un simple fil TX→RX.","tags":["UART","test"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Test de boucle UART : reliez la broche TX à la broche RX de Serial1 avec un fil ; vérifie l'UART et les broches\n#include <Arduino.h>\n\n#if CONFIG_IDF_TARGET_ESP32\nconst int LOOP_TX = 17, LOOP_RX = 16;\n#elif CONFIG_IDF_TARGET_ESP32S3\nconst int LOOP_TX = 17, LOOP_RX = 18;\n#else\nconst int LOOP_TX = 21, LOOP_RX = 20;\n#endif\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  Serial1.begin(115200, SERIAL_8N1, LOOP_RX, LOOP_TX);\n  Serial1.setTimeout(100);\n  Serial.printf(\"\\n# pont TX GPIO%d -> RX GPIO%d requis\\n\", LOOP_TX, LOOP_RX);\n}\n\nvoid loop() {\n  static uint32_t ok = 0, ko = 0;\n  char msg[32];\n  snprintf(msg, sizeof(msg), \"LAB-%lu\", (unsigned long)(ok + ko));\n  while (Serial1.available()) Serial1.read();\n  Serial1.print(msg);\n  Serial1.flush();\n  char back[32] = {0};\n  size_t n = Serial1.readBytes(back, strlen(msg));\n  if (n == strlen(msg) && memcmp(back, msg, n) == 0) ok++; else ko++;\n  Serial.printf(\"reussis:%lu\\techecs:%lu\\n\", (unsigned long)ok, (unsigned long)ko);\n  delay(500);\n}\n"},{"id":"classic_spi_loopback","title":"Test de boucle SPI","desc":"Vérifie le bus SPI avec un fil MOSI→MISO.","tags":["SPI","test"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Test de boucle SPI : reliez MOSI à MISO ; chaque octet envoyé doit revenir identique\n#include <Arduino.h>\n#include <SPI.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  SPI.begin();                                // broches SPI par défaut de la carte\n  Serial.printf(\"\\n# pont MOSI (GPIO%d) -> MISO (GPIO%d) requis\\n\", MOSI, MISO);\n}\n\nvoid loop() {\n  static uint32_t errors = 0, total = 0;\n  SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));\n  for (int i = 0; i < 256; i++) {\n    uint8_t r = SPI.transfer((uint8_t)i);\n    if (r != (uint8_t)i) errors++;\n    total++;\n  }\n  SPI.endTransaction();\n  Serial.printf(\"octets:%lu\\terreurs:%lu\\n\", (unsigned long)total, (unsigned long)errors);\n  delay(1000);\n}\n"},{"id":"classic_arduino_ota","title":"Mise à jour sans fil (ArduinoOTA)","desc":"Téléverser depuis l'IDE Arduino par le réseau, protégé par mot de passe.","tags":["OTA","Wi-Fi"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Mise à jour sans fil depuis l'IDE Arduino (ArduinoOTA)\n// Après un premier téléversement par USB, la carte apparaît dans Outils > Port (port réseau).\n#include <Arduino.h>\n#include <WiFi.h>\n#include <ArduinoOTA.h>\n\nconst char *WIFI_SSID = \"ESP32-LAB\";\nconst char *WIFI_PASS = \"ESP32-LAB-Setup2026!\";\nconst char *OTA_NAME = \"esp32-atelier\";\nconst char *OTA_PASSWORD = \"changez-moi\";   // demandé par l'IDE à chaque envoi\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.mode(WIFI_STA);\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }\n  ArduinoOTA.setHostname(OTA_NAME);\n  ArduinoOTA.setPassword(OTA_PASSWORD);\n  ArduinoOTA.onStart([]() { Serial.println(F(\"\\n# OTA : début\")); });\n  ArduinoOTA.onProgress([](unsigned int done, unsigned int total) { Serial.printf(\"# OTA %u %%\\r\", done * 100 / total); });\n  ArduinoOTA.onEnd([]() { Serial.println(F(\"\\n# OTA : terminé, redémarrage\")); });\n  ArduinoOTA.onError([](ota_error_t e) { Serial.printf(\"\\n# OTA : erreur %u\\n\", e); });\n  ArduinoOTA.begin();\n  Serial.printf(\"\\n# prêt pour l'OTA : %s.local (%s)\\n\", OTA_NAME, WiFi.localIP().toString().c_str());\n}\n\nvoid loop() {\n  ArduinoOTA.handle();\n}\n"},{"id":"classic_web_ota","title":"Page web de mise à jour firmware","desc":"Envoyer un .bin depuis le navigateur pour mettre à jour la carte.","tags":["OTA","web"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Page web de mise à jour : envoyez un .bin compilé depuis le navigateur\n// Croquis > Exporter les binaires compilés, puis http://<IP>/update\n#include <Arduino.h>\n#include <WiFi.h>\n#include <WebServer.h>\n#include <Update.h>\n\nconst char *WIFI_SSID = \"ESP32-LAB\";\nconst char *WIFI_PASS = \"ESP32-LAB-Setup2026!\";\nWebServer server(80);\n\nconst char FORM[] PROGMEM = R\"HTML(<!doctype html><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\">\n<h2>Mise à jour du firmware</h2><form method=\"POST\" action=\"/update\" enctype=\"multipart/form-data\">\n<input type=\"file\" name=\"firmware\" accept=\".bin\"> <button>Envoyer</button></form>)HTML\";\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }\n  server.on(\"/update\", HTTP_GET, []() { server.send_P(200, \"text/html; charset=utf-8\", FORM); });\n  server.on(\"/update\", HTTP_POST, []() {\n    server.send(200, \"text/plain; charset=utf-8\", Update.hasError() ? \"Échec de la mise à jour\" : \"OK, redémarrage…\");\n    delay(500);\n    if (!Update.hasError()) ESP.restart();\n  }, []() {\n    HTTPUpload &up = server.upload();\n    if (up.status == UPLOAD_FILE_START) {\n      Serial.printf(\"# réception de %s\\n\", up.filename.c_str());\n      if (!Update.begin(UPDATE_SIZE_UNKNOWN)) Update.printError(Serial);\n    } else if (up.status == UPLOAD_FILE_WRITE) {\n      if (Update.write(up.buf, up.currentSize) != up.currentSize) Update.printError(Serial);\n    } else if (up.status == UPLOAD_FILE_END) {\n      if (Update.end(true)) Serial.printf(\"# %u octets écrits\\n\", up.totalSize);\n      else Update.printError(Serial);\n    }\n  });\n  server.begin();\n  Serial.printf(\"\\n# http://%s/update\\n\", WiFi.localIP().toString().c_str());\n}\n\nvoid loop() {\n  server.handleClient();\n}\n"},{"id":"classic_wifi_portal","title":"Portail captif de configuration Wi-Fi","desc":"Saisir le réseau Wi-Fi depuis un téléphone, mémorisé en NVS.","tags":["Wi-Fi","portail captif","configuration"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Portail de configuration Wi-Fi (captif) : saisie du réseau depuis un téléphone\n// Sans réseau connu, la carte crée « ESP32-CONFIG » ; le téléphone ouvre automatiquement la page.\n#include <Arduino.h>\n#include <WiFi.h>\n#include <WebServer.h>\n#include <DNSServer.h>\n#include <Preferences.h>\n\nWebServer server(80);\nDNSServer dns;\nPreferences prefs;\nbool portal = false;\n\nconst char FORM[] PROGMEM = R\"HTML(<!doctype html><html lang=\"fr\"><meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Configuration Wi-Fi</title>\n<style>body{font-family:system-ui;margin:24px;max-width:360px}input,button{width:100%;padding:12px;margin:6px 0;box-sizing:border-box}</style>\n<h2>Réseau Wi-Fi</h2><form method=\"POST\" action=\"/save\"><input name=\"s\" placeholder=\"Nom du réseau (SSID)\" required>\n<input name=\"p\" type=\"password\" placeholder=\"Mot de passe\"><button>Enregistrer et redémarrer</button></form></html>)HTML\";\n\nvoid startPortal() {\n  portal = true;\n  WiFi.mode(WIFI_AP);\n  WiFi.softAP(\"ESP32-CONFIG\");\n  dns.start(53, \"*\", WiFi.softAPIP());       // toutes les requêtes DNS -> la carte\n  server.on(\"/save\", HTTP_POST, []() {\n    prefs.begin(\"wifi\", false);\n    prefs.putString(\"ssid\", server.arg(\"s\"));\n    prefs.putString(\"pass\", server.arg(\"p\"));\n    prefs.end();\n    server.send(200, \"text/html; charset=utf-8\", \"<meta charset=utf-8><p>Enregistré. Redémarrage…</p>\");\n    delay(1000);\n    ESP.restart();\n  });\n  server.onNotFound([]() { server.send_P(200, \"text/html; charset=utf-8\", FORM); });\n  server.begin();\n  Serial.println(F(\"# portail de configuration : connectez-vous au Wi-Fi « ESP32-CONFIG »\"));\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  prefs.begin(\"wifi\", true);\n  String ssid = prefs.getString(\"ssid\", \"\");\n  String pass = prefs.getString(\"pass\", \"\");\n  prefs.end();\n  if (ssid.length()) {\n    WiFi.mode(WIFI_STA);\n    WiFi.begin(ssid.c_str(), pass.c_str());\n    for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) delay(250);\n  }\n  if (WiFi.status() == WL_CONNECTED) Serial.printf(\"\\n# connecté à %s : %s\\n\", ssid.c_str(), WiFi.localIP().toString().c_str());\n  else startPortal();\n}\n\nvoid loop() {\n  if (portal) {\n    dns.processNextRequest();\n    server.handleClient();\n  }\n}\n"},{"id":"classic_webhook_ntfy","title":"Notification smartphone (ntfy.sh)","desc":"Recevoir une notification sur son téléphone à l'appui d'un bouton.","tags":["notification","HTTPS"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Notification sur téléphone via ntfy.sh (application gratuite, sans compte)\n// Installez l'app ntfy, abonnez-vous au même sujet (TOPIC) et appuyez sur le bouton BOOT.\n#include <Arduino.h>\n#include <WiFi.h>\n#include <HTTPClient.h>\n#include <NetworkClientSecure.h>\n\nconst char *WIFI_SSID = \"VotreBox\";\nconst char *WIFI_PASS = \"VotreMotDePasse\";\nconst char *TOPIC = \"esp32-lab-changez-ce-nom\";   // choisissez un nom long et unique\nconst uint8_t BUTTON = 0;\n\nbool notify(const String &text) {\n  NetworkClientSecure client;\n  client.setInsecure();                       // démonstration ; utilisez setCACert en production\n  HTTPClient http;\n  if (!http.begin(client, String(\"https://ntfy.sh/\") + TOPIC)) return false;\n  http.addHeader(\"Title\", \"ESP32 LAB\");\n  http.addHeader(\"Tags\", \"bell\");\n  int code = http.POST(text);\n  http.end();\n  return code == 200;\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  pinMode(BUTTON, INPUT_PULLUP);\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }\n  Serial.println(F(\"\\n# prêt : appuyez sur BOOT\"));\n}\n\nvoid loop() {\n  if (digitalRead(BUTTON) == LOW) {\n    bool ok = notify(String(\"Bouton appuyé ! Température puce : \") + String(temperatureRead(), 1) + \" °C\");\n    Serial.println(ok ? F(\"# notification envoyée\") : F(\"# échec d'envoi\"));\n    delay(1000);\n  }\n}\n"},{"id":"classic_mqtt","title":"Client MQTT (Home Assistant)","desc":"Publie des mesures et reçoit des commandes par MQTT.","tags":["MQTT","domotique"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[{"name":"PubSubClient","ver":"2.8","repo":"knolleary/pubsubclient","author":"Nick O'Leary"}],"code":"// ESP32 LAB — Client MQTT : publie des mesures et reçoit des commandes (Mosquitto, Home Assistant)\n// Bibliothèque : PubSubClient. Sujets : lab/esp32/temp (publié) et lab/esp32/led (commande on/off)\n#include <Arduino.h>\n#include <WiFi.h>\n#include <PubSubClient.h>\n\n#ifndef LED_BUILTIN\n#define LED_BUILTIN 2\n#endif\n\nconst char *WIFI_SSID = \"VotreBox\";\nconst char *WIFI_PASS = \"VotreMotDePasse\";\nconst char *MQTT_HOST = \"192.168.1.10\";      // adresse du broker\nWiFiClient net;\nPubSubClient mqtt(net);\n\nvoid onMessage(char *topic, byte *payload, unsigned int len) {\n  String msg;\n  for (unsigned int i = 0; i < len; i++) msg += (char)payload[i];\n  Serial.printf(\"# %s = %s\\n\", topic, msg.c_str());\n  if (String(topic) == \"lab/esp32/led\") digitalWrite(LED_BUILTIN, msg == \"on\");\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  pinMode(LED_BUILTIN, OUTPUT);\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }\n  mqtt.setServer(MQTT_HOST, 1883);\n  mqtt.setCallback(onMessage);\n}\n\nvoid loop() {\n  if (!mqtt.connected()) {\n    static uint32_t retry = 0;\n    if (millis() - retry > 5000) {\n      retry = millis();\n      if (mqtt.connect(\"esp32-lab\")) { mqtt.subscribe(\"lab/esp32/led\"); Serial.println(F(\"# MQTT connecté\")); }\n    }\n  }\n  mqtt.loop();\n  static uint32_t last = 0;\n  if (mqtt.connected() && millis() - last > 10000) {\n    last = millis();\n    char v[16];\n    snprintf(v, sizeof(v), \"%.1f\", temperatureRead());\n    mqtt.publish(\"lab/esp32/temp\", v);\n  }\n}\n"},{"id":"classic_bluetooth_serial","title":"Terminal Bluetooth classique (SPP)","desc":"Liaison série sans fil avec un téléphone Android.","tags":["Bluetooth","série"],"boards":["esp32"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Bluetooth classique (SPP) : terminal série sans fil avec un smartphone Android\n// ESP32 d'origine uniquement (les S3/C3 n'ont que le BLE). App : « Serial Bluetooth Terminal ».\n#include <Arduino.h>\n#include \"BluetoothSerial.h\"\n\nBluetoothSerial bt;\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  bt.begin(\"ESP32-LAB-BT\");\n  Serial.println(F(\"\\n# appairez « ESP32-LAB-BT » depuis le téléphone\"));\n}\n\nvoid loop() {\n  while (bt.available()) Serial.write(bt.read());\n  while (Serial.available()) bt.write(Serial.read());\n  static uint32_t last = 0;\n  if (bt.hasClient() && millis() - last > 5000) {\n    last = millis();\n    bt.printf(\"uptime %lu s\\r\\n\", (unsigned long)(millis() / 1000));\n  }\n}\n"},{"id":"classic_ble_uart","title":"Liaison série BLE (UART Nordic)","desc":"Échanges texte avec iPhone/Android via Bluetooth Low Energy.","tags":["BLE","Bluetooth"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":3,"libs":[],"code":"// ESP32 LAB — Liaison série Bluetooth Low Energy (service UART Nordic) : compatible iPhone et Android\n// App : « nRF Connect » ou « Bluefruit Connect » (onglet UART).\n#include <Arduino.h>\n#include <BLEDevice.h>\n#include <BLEServer.h>\n#include <BLE2902.h>\n\n#define SERVICE_UUID \"6E400001-B5A3-F393-E0A9-E50E24DCCA9E\"\n#define RX_UUID \"6E400002-B5A3-F393-E0A9-E50E24DCCA9E\"\n#define TX_UUID \"6E400003-B5A3-F393-E0A9-E50E24DCCA9E\"\n\nBLECharacteristic *tx = nullptr;\nbool connected = false;\n\nclass ServerCb : public BLEServerCallbacks {\n  void onConnect(BLEServer *s) override { connected = true; Serial.println(F(\"# client connecté\")); }\n  void onDisconnect(BLEServer *s) override { connected = false; Serial.println(F(\"# client parti\")); s->getAdvertising()->start(); }\n};\n\nclass RxCb : public BLECharacteristicCallbacks {\n  void onWrite(BLECharacteristic *c) override {\n    String v = c->getValue();\n    Serial.printf(\"# reçu : %s\\n\", v.c_str());\n  }\n};\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  BLEDevice::init(\"ESP32-LAB\");\n  BLEServer *server = BLEDevice::createServer();\n  server->setCallbacks(new ServerCb());\n  BLEService *svc = server->createService(SERVICE_UUID);\n  tx = svc->createCharacteristic(TX_UUID, BLECharacteristic::PROPERTY_NOTIFY);\n  tx->addDescriptor(new BLE2902());\n  BLECharacteristic *rx = svc->createCharacteristic(RX_UUID, BLECharacteristic::PROPERTY_WRITE);\n  rx->setCallbacks(new RxCb());\n  svc->start();\n  server->getAdvertising()->addServiceUUID(SERVICE_UUID);\n  server->getAdvertising()->start();\n  Serial.println(F(\"\\n# BLE « ESP32-LAB » visible\"));\n}\n\nvoid loop() {\n  static uint32_t last = 0;\n  if (connected && millis() - last > 2000) {\n    last = millis();\n    char msg[40];\n    snprintf(msg, sizeof(msg), \"temp=%.1f heap=%lu\\n\", temperatureRead(), (unsigned long)ESP.getFreeHeap());\n    tx->setValue((uint8_t *)msg, strlen(msg));\n    tx->notify();\n  }\n}\n"},{"id":"classic_ble_beacon","title":"Balise iBeacon","desc":"Émet une balise BLE détectable par les applications de proximité.","tags":["BLE","balise"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Balise iBeacon : un téléphone mesure sa distance à la balise (app « Beacon Scanner »)\n#include <Arduino.h>\n#include <BLEDevice.h>\n#include <BLEBeacon.h>\n#include <BLEAdvertising.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  BLEDevice::init(\"ESP32-LAB-BEACON\");\n  BLEBeacon beacon;\n  beacon.setManufacturerId(0x4C00);                         // format Apple iBeacon\n  beacon.setProximityUUID(BLEUUID(\"e2c56db5-dffb-48d2-b060-d0f5a71096e0\"));\n  beacon.setMajor(1);\n  beacon.setMinor(42);\n  beacon.setSignalPower(-59);                               // RSSI attendu à 1 m\n  BLEAdvertisementData adv;\n  adv.setFlags(0x04);\n  String payload;\n  payload += (char)26;                                      // longueur\n  payload += (char)0xFF;                                    // données constructeur\n  payload += beacon.getData();\n  adv.addData(payload);\n  BLEAdvertising *a = BLEDevice::getAdvertising();\n  a->setAdvertisementData(adv);\n  a->start();\n  Serial.println(F(\"\\n# iBeacon émis (major 1, minor 42)\"));\n}\n\nvoid loop() {\n  delay(1000);\n}\n"},{"id":"classic_internal_temp","title":"Température interne de la puce","desc":"Surveille l'échauffement du microcontrôleur.","tags":["température","diagnostic"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Capteur de température interne de la puce (indicatif : surveille l'échauffement)\n#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n}\n\nvoid loop() {\n  Serial.printf(\"temp_puce:%.1f\\n\", temperatureRead());\n  delay(1000);\n}\n"},{"id":"classic_sensor_to_master","title":"Envoyer des mesures au MASTER ESP32 LAB","desc":"Exemple minimal du protocole UDP « LAB|… » affiché par le dashboard.","tags":["MASTER","UDP","télémétrie"],"boards":["esp32","esp32s3","esp32c3"],"difficulty":1,"libs":[],"code":"// ESP32 LAB — Envoyer ses propres mesures au MASTER (onglet « Capteurs » du dashboard)\n// Protocole : datagramme UDP vers 192.168.4.1:4213 au format  LAB|appareil|clé|valeur|unité\n#include <Arduino.h>\n#include <WiFi.h>\n#include <WiFiUdp.h>\n\nconst char *WIFI_SSID = \"ESP32-LAB\";                // point d'accès du MASTER\nconst char *WIFI_PASS = \"ESP32-LAB-Setup2026!\";\nconst char *DEVICE = \"atelier\";\nWiFiUDP udp;\n\nvoid send(const char *key, float value, const char *unit) {\n  udp.beginPacket(IPAddress(192, 168, 4, 1), 4213);\n  udp.printf(\"LAB|%s|%s|%.3f|%s\\n\", DEVICE, key, value, unit);\n  udp.endPacket();\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(300);\n  WiFi.begin(WIFI_SSID, WIFI_PASS);\n  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }\n  Serial.printf(\"\\n# connecté au MASTER (%s)\\n\", WiFi.localIP().toString().c_str());\n}\n\nvoid loop() {\n  send(\"temp_puce\", temperatureRead(), \"°C\");\n  send(\"rssi\", WiFi.RSSI(), \"dBm\");\n  send(\"heap\", ESP.getFreeHeap() / 1024.0f, \"Ko\");\n  delay(5000);\n}\n"},{"id":"classic_psram_test","title":"Test de la PSRAM","desc":"Taille, débit et intégrité de la PSRAM externe.","tags":["PSRAM","mémoire"],"boards":["esp32s3","esp32"],"difficulty":2,"libs":[],"code":"// ESP32 LAB — Test de la PSRAM (ESP32-S3 N8R8/N16R8, ESP32-WROVER) : taille, débit, intégrité\n// IDE : Outils > PSRAM > « OPI PSRAM » pour les modules R8, « QSPI PSRAM » pour R2.\n#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(500);\n  if (!psramFound()) {\n    Serial.println(F(\"\\n# aucune PSRAM détectée (option PSRAM de l'IDE ?)\"));\n    return;\n  }\n  size_t size = ESP.getFreePsram() / 2;\n  Serial.printf(\"\\n# PSRAM : %u Ko libres, test sur %u Ko\\n\", (unsigned)(ESP.getFreePsram() / 1024), (unsigned)(size / 1024));\n  uint32_t *buf = (uint32_t *)ps_malloc(size);\n  if (!buf) { Serial.println(F(\"# allocation impossible\")); return; }\n  size_t n = size / 4;\n  uint32_t t0 = micros();\n  for (size_t i = 0; i < n; i++) buf[i] = (uint32_t)i * 2654435761u;\n  uint32_t tw = micros() - t0;\n  t0 = micros();\n  size_t errors = 0;\n  for (size_t i = 0; i < n; i++) if (buf[i] != (uint32_t)i * 2654435761u) errors++;\n  uint32_t tr = micros() - t0;\n  Serial.printf(\"# écriture %.1f Mo/s, lecture %.1f Mo/s, erreurs %u\\n\", size / (float)tw, size / (float)tr, (unsigned)errors);\n  free(buf);\n}\n\nvoid loop() {}\n"},{"id":"classic_station_meteo_rtc","title":"Station météo BME280 + OLED + DS3231 (manuscrite)","desc":"Projet complet écrit à la main : mesures horodatées et écran OLED.","tags":["météo","OLED","RTC"],"boards":["esp32"],"difficulty":2,"libs":[{"name":"Adafruit BME280 Library","ver":"2.3.0","repo":"adafruit/Adafruit_BME280_Library","author":"Adafruit"},{"name":"Adafruit Unified Sensor","ver":"1.1.15","repo":"adafruit/Adafruit_Sensor","author":"Adafruit"},{"name":"Adafruit BusIO","ver":"1.17.4","repo":"adafruit/Adafruit_BusIO","author":"Adafruit"},{"name":"Adafruit SSD1306","ver":"2.5.17","repo":"adafruit/Adafruit_SSD1306","author":"Adafruit"},{"name":"Adafruit GFX Library","ver":"1.12.6","repo":"adafruit/Adafruit-GFX-Library","author":"Adafruit"},{"name":"RTClib","ver":"2.1.4","repo":"adafruit/RTClib","author":"Adafruit"}],"code":"/*\n * Projet 31 - Station meteo complete\n * Combine : BME280 (temp/humidite/pression) + SSD1306 (affichage) + DS3231 (RTC)\n * Cible : ESP32\n *\n * Bus I2C partage (SDA=21, SCL=22) - adresses utilisees :\n *   BME280  : 0x76\n *   SSD1306 : 0x3C\n *   DS3231  : 0x68\n * Aucun conflit d'adresse entre ces trois peripheriques (verifie).\n *\n * Architecture non bloquante : chaque sous-systeme (lecture capteur,\n * rafraichissement ecran, log serie) a son propre intervalle gere par millis(),\n * aucun delay() n'est utilise dans loop().\n */\n\n#include <Arduino.h>\n#include <Wire.h>\n#include <Adafruit_BME280.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>\n#include <RTClib.h>\n\n// ---------- Configuration materielle ----------\n#define BME280_ADDR   0x76\n#define SSD1306_ADDR  0x3C\n#define SCREEN_WIDTH  128\n#define SCREEN_HEIGHT 64\n\nAdafruit_BME280 bme;\nAdafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);\nRTC_DS3231 rtc;\n\n// ---------- Etat global ----------\nbool bmeOk = false;\nbool displayOk = false;\nbool rtcOk = false;\n\nfloat lastTempC = NAN;\nfloat lastHumidity = NAN;\nfloat lastPressureHpa = NAN;\nuint32_t lastUnix = 0;   // horodatage RTC (secondes Unix)\n\n// ---------- Cadencement non bloquant ----------\nconst unsigned long SENSOR_READ_INTERVAL_MS = 2000;\nconst unsigned long DISPLAY_UPDATE_INTERVAL_MS = 1000;\nconst unsigned long SERIAL_LOG_INTERVAL_MS = 5000;\n\nunsigned long lastSensorRead = 0;\nunsigned long lastDisplayUpdate = 0;\nunsigned long lastSerialLog = 0;\n\nvoid readSensors() {\n  if (bmeOk) {\n    lastTempC = bme.readTemperature();\n    lastHumidity = bme.readHumidity();\n    lastPressureHpa = bme.readPressure() / 100.0F;\n  }\n  if (rtcOk) {\n    lastUnix = rtc.now().unixtime();\n  }\n}\n\nvoid updateDisplay() {\n  if (!displayOk) return;\n\n  display.clearDisplay();\n  display.setTextColor(SSD1306_WHITE);\n\n  display.setTextSize(1);\n  display.setCursor(0, 0);\n  if (rtcOk) {\n    display.printf(\"%02d/%02d/%04d  %02d:%02d:%02d\",\n                    DateTime(lastUnix).day(), DateTime(lastUnix).month(), DateTime(lastUnix).year(),\n                    DateTime(lastUnix).hour(), DateTime(lastUnix).minute(), DateTime(lastUnix).second());\n  } else {\n    display.println(\"RTC indisponible\");\n  }\n  display.drawFastHLine(0, 10, SCREEN_WIDTH, SSD1306_WHITE);\n\n  if (bmeOk) {\n    display.setTextSize(2);\n    display.setCursor(0, 16);\n    display.printf(\"%.1fC\", lastTempC);\n\n    display.setTextSize(1);\n    display.setCursor(0, 38);\n    display.printf(\"Humidite : %.1f%%\", lastHumidity);\n    display.setCursor(0, 50);\n    display.printf(\"Pression : %.0f hPa\", lastPressureHpa);\n  } else {\n    display.setTextSize(1);\n    display.setCursor(0, 20);\n    display.println(\"BME280 indisponible\");\n  }\n\n  display.display();\n}\n\nvoid logToSerial() {\n  Serial.println(\"========== [31_station_meteo] Releve ==========\");\n  if (rtcOk) {\n    Serial.printf(\"Horodatage : %04d-%02d-%02d %02d:%02d:%02d\\n\",\n                  DateTime(lastUnix).year(), DateTime(lastUnix).month(), DateTime(lastUnix).day(),\n                  DateTime(lastUnix).hour(), DateTime(lastUnix).minute(), DateTime(lastUnix).second());\n  }\n  if (bmeOk) {\n    Serial.printf(\"Temperature : %.2f C\\n\", lastTempC);\n    Serial.printf(\"Humidite    : %.2f %%\\n\", lastHumidity);\n    Serial.printf(\"Pression    : %.2f hPa\\n\", lastPressureHpa);\n  }\n  Serial.println(\"=================================================\");\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(200);\n  Wire.begin(21, 22);\n  Wire.setClock(100000);\n\n  bmeOk = bme.begin(BME280_ADDR, &Wire);\n  Serial.printf(\"[31_station_meteo] BME280  : %s\\n\", bmeOk ? \"OK\" : \"ECHEC\");\n  if (bmeOk) {\n    bme.setSampling(Adafruit_BME280::MODE_NORMAL,\n                     Adafruit_BME280::SAMPLING_X2,\n                     Adafruit_BME280::SAMPLING_X16,\n                     Adafruit_BME280::SAMPLING_X1,\n                     Adafruit_BME280::FILTER_X16,\n                     Adafruit_BME280::STANDBY_MS_500);\n  }\n\n  displayOk = display.begin(SSD1306_SWITCHCAPVCC, SSD1306_ADDR);\n  Serial.printf(\"[31_station_meteo] SSD1306 : %s\\n\", displayOk ? \"OK\" : \"ECHEC\");\n  if (displayOk) {\n    display.clearDisplay();\n    display.setTextSize(1);\n    display.setCursor(0, 0);\n    display.println(\"Station meteo - init...\");\n    display.display();\n  }\n\n  rtcOk = rtc.begin(&Wire);\n  Serial.printf(\"[31_station_meteo] DS3231  : %s\\n\", rtcOk ? \"OK\" : \"ECHEC\");\n  if (rtcOk && rtc.lostPower()) {\n    Serial.println(\"[31_station_meteo] RTC sans heure valide -> reglage sur date de compilation.\");\n    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));\n  }\n\n  readSensors();\n  updateDisplay();\n  Serial.println(\"[31_station_meteo] Station meteo prete.\");\n}\n\nvoid loop() {\n  unsigned long now = millis();\n\n  if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {\n    lastSensorRead = now;\n    readSensors();\n  }\n\n  if (now - lastDisplayUpdate >= DISPLAY_UPDATE_INTERVAL_MS) {\n    lastDisplayUpdate = now;\n    updateDisplay();\n  }\n\n  if (now - lastSerialLog >= SERIAL_LOG_INTERVAL_MS) {\n    lastSerialLog = now;\n    logToSerial();\n  }\n}\n"},{"id":"classic_acces_rfid_web","title":"Contrôle d'accès RFID + servo + dashboard Wi-Fi","desc":"Badge RFID, verrou à servomoteur et page web de suivi.","tags":["RFID","servo","web"],"boards":["esp32"],"difficulty":3,"libs":[{"name":"MFRC522","ver":"1.4.12","repo":"miguelbalboa/rfid","author":"GithubCommunity"},{"name":"ESP32Servo","ver":"3.2.1","repo":"madhephaestus/ESP32Servo","author":"Kevin Harrington, John K. Bennett"}],"code":"/*\n * Projet 32 - Domotique : controle d'acces RFID + Servo (serrure) + WiFi (dashboard)\n * Combine : RC522 (SPI) + SG90 (PWM) + WiFi AP + serveur web\n * Cible : ESP32\n *\n * Bus SPI partage (VSPI : SCK=18, MISO=19, MOSI=23) - Chip Select dedie :\n *   RC522 : CS=GPIO5, RST=GPIO27\n * Le servo utilise un GPIO PWM independant (GPIO16), sans conflit avec le bus SPI.\n *\n * Architecture non bloquante : scan RFID, mouvement du servo (non bloquant via\n * machine a etats + millis) et serveur web tournent en parallele dans loop().\n */\n\n#include <Arduino.h>\n#include <SPI.h>\n#include <MFRC522.h>\n#include <ESP32Servo.h>\n#include <WiFi.h>\n#include <WebServer.h>\n\n// ---------- RFID (SPI) ----------\n#define RFID_CS_PIN  5\n#define RFID_RST_PIN 27\nMFRC522 mfrc522(RFID_CS_PIN, RFID_RST_PIN);\n\n// UID(s) autorisee(s) - a adapter avec les UID reels de vos badges\n// (utilisez d'abord le mode \"log\" ci-dessous pour identifier vos badges)\nbyte authorizedUid1[4] = {0xDE, 0xAD, 0xBE, 0xEF}; // exemple, a remplacer\n\n// ---------- Servo (verrou) ----------\nServo lockServo;\nconst uint8_t SERVO_PIN = 16;\nconst int SERVO_LOCKED_ANGLE = 0;\nconst int SERVO_UNLOCKED_ANGLE = 90;\n\nenum LockState { LOCKED, UNLOCKING, UNLOCKED, LOCKING };\nLockState lockState = LOCKED;\nunsigned long lockStateChangeTime = 0;\nconst unsigned long UNLOCK_DURATION_MS = 4000; // temps pendant lequel la porte reste ouverte\n\n// ---------- WiFi + dashboard ----------\nconst char* AP_SSID = \"ESP32_DOMOTIQUE\";\nconst char* AP_PASSWORD = \"domotique123\";\nWebServer server(80);\nString lastEventLog = \"Aucun evenement pour le moment.\";\n\n// ---------- Cadencement ----------\nconst unsigned long RFID_POLL_INTERVAL_MS = 200;\nunsigned long lastRfidPoll = 0;\n\nbool uidMatches(MFRC522::Uid uid, byte* authorized, byte len) {\n  if (uid.size != len) return false;\n  for (byte i = 0; i < len; i++) {\n    if (uid.uidByte[i] != authorized[i]) return false;\n  }\n  return true;\n}\n\nString uidToString(MFRC522::Uid uid) {\n  String s = \"\";\n  for (byte i = 0; i < uid.size; i++) {\n    if (uid.uidByte[i] < 0x10) s += \"0\";\n    s += String(uid.uidByte[i], HEX);\n    if (i < uid.size - 1) s += \":\";\n  }\n  s.toUpperCase();\n  return s;\n}\n\nvoid requestUnlock(const String& reason) {\n  if (lockState == LOCKED) {\n    lockState = UNLOCKING;\n    lockStateChangeTime = millis();\n    lastEventLog = reason + \" -> Deverrouillage.\";\n    Serial.println(\"[32_domotique] \" + lastEventLog);\n  }\n}\n\nvoid updateLockStateMachine() {\n  unsigned long now = millis();\n  switch (lockState) {\n    case UNLOCKING:\n      lockServo.write(SERVO_UNLOCKED_ANGLE);\n      lockState = UNLOCKED;\n      lockStateChangeTime = now;\n      break;\n    case UNLOCKED:\n      if (now - lockStateChangeTime >= UNLOCK_DURATION_MS) {\n        lockState = LOCKING;\n        lockStateChangeTime = now;\n      }\n      break;\n    case LOCKING:\n      lockServo.write(SERVO_LOCKED_ANGLE);\n      lockState = LOCKED;\n      lastEventLog = \"Reverrouillage automatique effectue.\";\n      Serial.println(\"[32_domotique] \" + lastEventLog);\n      break;\n    case LOCKED:\n    default:\n      break; // rien a faire, en attente d'un badge valide\n  }\n}\n\nvoid pollRfid() {\n  if (!mfrc522.PICC_IsNewCardPresent()) return;\n  if (!mfrc522.PICC_ReadCardSerial()) return;\n\n  String uidStr = uidToString(mfrc522.uid);\n  Serial.println(\"[32_domotique] Badge detecte : \" + uidStr);\n\n  if (uidMatches(mfrc522.uid, authorizedUid1, 4)) {\n    requestUnlock(\"Badge autorise (\" + uidStr + \")\");\n  } else {\n    lastEventLog = \"Badge REFUSE (\" + uidStr + \")\";\n    Serial.println(\"[32_domotique] \" + lastEventLog);\n  }\n\n  mfrc522.PICC_HaltA();\n  mfrc522.PCD_StopCrypto1();\n}\n\n// ---------- Serveur web ----------\nString buildDashboard() {\n  String etat = (lockState == LOCKED) ? \"VERROUILLE\" : \"DEVERROUILLE\";\n  String html = \"<!DOCTYPE html><html><head><meta charset='utf-8'>\";\n  html += \"<meta name='viewport' content='width=device-width, initial-scale=1'>\";\n  html += \"<title>Domotique - Controle d'acces</title></head><body>\";\n  html += \"<h1>Controle d'acces RFID</h1>\";\n  html += \"<p>Etat de la serrure : <strong>\" + etat + \"</strong></p>\";\n  html += \"<p>Dernier evenement : \" + lastEventLog + \"</p>\";\n  html += \"<p><a href='/unlock'><button>Deverrouiller manuellement</button></a></p>\";\n  html += \"<p><a href='/'><button>Rafraichir</button></a></p>\";\n  html += \"</body></html>\";\n  return html;\n}\n\nvoid handleRoot() {\n  server.send(200, \"text/html\", buildDashboard());\n}\n\nvoid handleManualUnlock() {\n  requestUnlock(\"Deverrouillage manuel via dashboard\");\n  server.sendHeader(\"Location\", \"/\");\n  server.send(303);\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(200);\n\n  // --- SPI + RFID ---\n  SPI.begin(18, 19, 23, RFID_CS_PIN);\n  mfrc522.PCD_Init();\n  Serial.println(\"[32_domotique] Lecteur RFID initialise.\");\n\n  // --- Servo ---\n  ESP32PWM::allocateTimer(0);\n  lockServo.setPeriodHertz(50);\n  lockServo.attach(SERVO_PIN, 500, 2400);\n  lockServo.write(SERVO_LOCKED_ANGLE);\n\n  // --- WiFi AP + serveur web ---\n  WiFi.mode(WIFI_AP);\n  WiFi.softAP(AP_SSID, AP_PASSWORD);\n  Serial.print(\"[32_domotique] Dashboard disponible sur : http://\");\n  Serial.println(WiFi.softAPIP());\n\n  server.on(\"/\", handleRoot);\n  server.on(\"/unlock\", handleManualUnlock);\n  server.begin();\n\n  Serial.println(\"[32_domotique] Systeme pret - approchez un badge RFID.\");\n}\n\nvoid loop() {\n  unsigned long now = millis();\n\n  if (now - lastRfidPoll >= RFID_POLL_INTERVAL_MS) {\n    lastRfidPoll = now;\n    pollRfid();\n  }\n\n  updateLockStateMachine(); // machine a etats non bloquante pour le servo\n  server.handleClient();    // serveur web non bloquant\n}\n"},{"id":"classic_robot_servos","title":"Robot éviteur à deux servos continus","desc":"Robot mobile à ultrason et servos à rotation continue.","tags":["robot","ultrason","servo"],"boards":["esp32"],"difficulty":3,"libs":[{"name":"ESP32Servo","ver":"3.2.1","repo":"madhephaestus/ESP32Servo","author":"Kevin Harrington, John K. Bennett"}],"code":"/*\n * Projet 33 - Robot d'evitement d'obstacles\n * Combine : HC-SR04 (distance) + 2x Servos SG90 (direction \"tete\" + \"roue\" de test)\n * Cible : ESP32\n *\n * NOTE PEDAGOGIQUE : ce template pilote deux servos pour simuler la logique\n * de navigation (un servo \"tete\" pour orienter le capteur ultrason en balayage,\n * un servo \"direction\" pour representer l'angle de braquage). Pour un vrai\n * robot a roues, remplacez le servo de direction par un driver moteur (ex: L298N)\n * pilote en PWM sur les memes principes non bloquants.\n *\n * Machine a etats non bloquante : SCAN -> DECISION -> AVANCE -> EVITEMENT -> SCAN...\n */\n\n#include <Arduino.h>\n#include <ESP32Servo.h>\n\n// ---------- Capteur ultrason (voir wiring.md : diviseur de tension obligatoire sur ECHO) ----------\nconst uint8_t TRIG_PIN = 5;\nconst uint8_t ECHO_PIN = 18;\nconst unsigned long ECHO_TIMEOUT_US = 30000UL;\nconst float OBSTACLE_THRESHOLD_CM = 20.0;\n\n// ---------- Servos ----------\nServo headServo;      // oriente le capteur ultrason (balayage gauche/droite)\nServo steeringServo;  // represente la direction du robot (a remplacer par un driver moteur reel)\nconst uint8_t HEAD_SERVO_PIN = 16;\nconst uint8_t STEERING_SERVO_PIN = 17;\n\nconst int HEAD_CENTER = 90;\nconst int HEAD_LEFT = 150;\nconst int HEAD_RIGHT = 30;\n\n// ---------- Machine a etats ----------\nenum RobotState { SCAN_CENTER, SCAN_LEFT, SCAN_RIGHT, DECISION, AVOIDING };\nRobotState state = SCAN_CENTER;\nunsigned long stateChangeTime = 0;\nconst unsigned long SERVO_SETTLE_MS = 300; // temps d'attente pour que le servo atteigne sa position\n\nfloat distCenter = -1, distLeft = -1, distRight = -1;\n\nfloat measureDistanceCm() {\n  digitalWrite(TRIG_PIN, LOW);\n  delayMicroseconds(2);\n  digitalWrite(TRIG_PIN, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(TRIG_PIN, LOW);\n  unsigned long duration = pulseIn(ECHO_PIN, HIGH, ECHO_TIMEOUT_US);\n  if (duration == 0) return -1.0;\n  return (duration * 0.0343) / 2.0;\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(200);\n\n  pinMode(TRIG_PIN, OUTPUT);\n  pinMode(ECHO_PIN, INPUT);\n  digitalWrite(TRIG_PIN, LOW);\n\n  ESP32PWM::allocateTimer(0);\n  ESP32PWM::allocateTimer(1);\n  headServo.setPeriodHertz(50);\n  headServo.attach(HEAD_SERVO_PIN, 500, 2400);\n  steeringServo.setPeriodHertz(50);\n  steeringServo.attach(STEERING_SERVO_PIN, 500, 2400);\n\n  headServo.write(HEAD_CENTER);\n  steeringServo.write(90); // position \"tout droit\"\n\n  state = SCAN_CENTER;\n  stateChangeTime = millis();\n\n  Serial.println(\"[33_robot] Robot d'evitement pret - demarrage du scan.\");\n}\n\nvoid loop() {\n  unsigned long now = millis();\n\n  switch (state) {\n    case SCAN_CENTER:\n      headServo.write(HEAD_CENTER);\n      if (now - stateChangeTime >= SERVO_SETTLE_MS) {\n        distCenter = measureDistanceCm();\n        Serial.printf(\"[33_robot] Distance centre = %.1f cm\\n\", distCenter);\n        state = SCAN_LEFT;\n        stateChangeTime = now;\n      }\n      break;\n\n    case SCAN_LEFT:\n      headServo.write(HEAD_LEFT);\n      if (now - stateChangeTime >= SERVO_SETTLE_MS) {\n        distLeft = measureDistanceCm();\n        Serial.printf(\"[33_robot] Distance gauche = %.1f cm\\n\", distLeft);\n        state = SCAN_RIGHT;\n        stateChangeTime = now;\n      }\n      break;\n\n    case SCAN_RIGHT:\n      headServo.write(HEAD_RIGHT);\n      if (now - stateChangeTime >= SERVO_SETTLE_MS) {\n        distRight = measureDistanceCm();\n        Serial.printf(\"[33_robot] Distance droite = %.1f cm\\n\", distRight);\n        state = DECISION;\n        stateChangeTime = now;\n      }\n      break;\n\n    case DECISION:\n      if (distCenter > OBSTACLE_THRESHOLD_CM || distCenter < 0) {\n        Serial.println(\"[33_robot] Voie libre -> avance tout droit.\");\n        steeringServo.write(90);\n      } else if (distLeft > distRight) {\n        Serial.println(\"[33_robot] Obstacle detecte -> braquage a gauche.\");\n        steeringServo.write(150);\n      } else {\n        Serial.println(\"[33_robot] Obstacle detecte -> braquage a droite.\");\n        steeringServo.write(30);\n      }\n      state = AVOIDING;\n      stateChangeTime = now;\n      break;\n\n    case AVOIDING:\n      // Laisse le temps a la \"manoeuvre\" avant de reprendre un cycle de scan complet\n      if (now - stateChangeTime >= 500) {\n        state = SCAN_CENTER;\n        stateChangeTime = now;\n      }\n      break;\n  }\n}\n"},{"id":"classic_datalogger_csv","title":"Enregistreur DHT22 + BH1750 + DS3231 (CSV série)","desc":"Journal horodaté en CSV sur le port série.","tags":["enregistreur","CSV"],"boards":["esp32"],"difficulty":2,"libs":[{"name":"DHT sensor library","ver":"1.4.7","repo":"adafruit/DHT-sensor-library","author":"Adafruit"},{"name":"Adafruit Unified Sensor","ver":"1.1.15","repo":"adafruit/Adafruit_Sensor","author":"Adafruit"},{"name":"BH1750","ver":"1.3.0","repo":"claws/BH1750","author":"Christopher Laws"},{"name":"RTClib","ver":"2.1.4","repo":"adafruit/RTClib","author":"Adafruit"},{"name":"Adafruit BusIO","ver":"1.17.4","repo":"adafruit/Adafruit_BusIO","author":"Adafruit"}],"code":"/*\n * Projet 34 - Data logger environnemental\n * Combine : DHT22 (temp/humidite, OneWire-like) + BH1750 (luminosite, I2C) + DS3231 (RTC, I2C)\n * Cible : ESP32\n *\n * Bus I2C partage (SDA=21, SCL=22) - adresses utilisees :\n *   BH1750 : 0x23\n *   DS3231 : 0x68\n * Aucun conflit d'adresse. Le DHT22 est sur un GPIO dedie hors bus I2C (GPIO4).\n *\n * Architecture non bloquante : echantillonnage periodique horodate, log\n * formate en CSV sur le port serie (pret a etre redirige vers une carte SD\n * ou un service cloud dans une evolution future du projet).\n */\n\n#include <Arduino.h>\n#include <Wire.h>\n#include <DHT.h>\n#include <BH1750.h>\n#include <RTClib.h>\n\n// ---------- DHT22 ----------\n#define DHT_PIN 4\n#define DHT_TYPE DHT22\nDHT dht(DHT_PIN, DHT_TYPE);\n\n// ---------- BH1750 ----------\nBH1750 lightMeter(0x23);\n\n// ---------- DS3231 ----------\nRTC_DS3231 rtc;\n\nbool dhtOk = true;   // le DHT n'a pas de \"begin()\" avec retour d'erreur ; on suppose OK, verifie a la 1ere lecture\nbool bhOk = false;\nbool rtcOk = false;\n\nconst unsigned long SAMPLE_INTERVAL_MS = 3000; // respecte la contrainte du DHT22 (>=2s)\nunsigned long lastSampleTime = 0;\nuint32_t sampleId = 0;\nbool csvHeaderPrinted = false;\n\nvoid printCsvHeaderIfNeeded() {\n  if (!csvHeaderPrinted) {\n    Serial.println(\"id,horodatage,temperature_c,humidite_pct,luminosite_lux\");\n    csvHeaderPrinted = true;\n  }\n}\n\nvoid logSample() {\n  printCsvHeaderIfNeeded();\n  sampleId++;\n\n  String horodatage = \"N/A\";\n  if (rtcOk) {\n    DateTime dt = rtc.now();\n    char buf[32];\n    snprintf(buf, sizeof(buf), \"%04d-%02d-%02d %02d:%02d:%02d\",\n             dt.year(), dt.month(), dt.day(), dt.hour(), dt.minute(), dt.second());\n    horodatage = String(buf);\n  }\n\n  float tempC = dht.readTemperature();\n  float humidity = dht.readHumidity();\n  bool dhtValid = !(isnan(tempC) || isnan(humidity));\n\n  float lux = bhOk ? lightMeter.readLightLevel() : -1.0;\n\n  Serial.printf(\"%lu,%s,%s,%s,%s\\n\",\n                sampleId,\n                horodatage.c_str(),\n                dhtValid ? String(tempC, 1).c_str() : \"ERR\",\n                dhtValid ? String(humidity, 1).c_str() : \"ERR\",\n                (bhOk && lux >= 0) ? String(lux, 1).c_str() : \"ERR\");\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(200);\n  Wire.begin(21, 22);\n\n  dht.begin();\n\n  bhOk = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);\n  Serial.printf(\"[34_datalogger] BH1750 : %s\\n\", bhOk ? \"OK\" : \"ECHEC\");\n\n  rtcOk = rtc.begin(&Wire);\n  Serial.printf(\"[34_datalogger] DS3231 : %s\\n\", rtcOk ? \"OK\" : \"ECHEC\");\n  if (rtcOk && rtc.lostPower()) {\n    Serial.println(\"[34_datalogger] RTC sans heure valide -> reglage sur date de compilation.\");\n    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));\n  }\n\n  Serial.println(\"[34_datalogger] Data logger environnemental pret (format CSV).\");\n  lastSampleTime = millis();\n}\n\nvoid loop() {\n  unsigned long now = millis();\n  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {\n    lastSampleTime = now;\n    logSample();\n  }\n}\n"},{"id":"classic_alarme_web","title":"Alarme ultrason + NeoPixel + buzzer + dashboard","desc":"Système d'alarme complet avec interface web.","tags":["alarme","web","NeoPixel"],"boards":["esp32"],"difficulty":3,"libs":[{"name":"Adafruit NeoPixel","ver":"1.15.5","repo":"adafruit/Adafruit_NeoPixel","author":"Adafruit"}],"code":"/*\n * Projet 35 - Systeme d'alarme de securite\n * Combine : HC-SR04 (detection de presence par distance) + WS2812 (indicateur visuel)\n *           + buzzer actif (alerte sonore) + WiFi AP (notification via dashboard web)\n * Cible : ESP32\n *\n * Logique : si un objet/une personne s'approche a moins du seuil configure,\n * le systeme passe en etat ALARME (LED rouge clignotante + buzzer + log\n * horodate consultable via le dashboard web), avec una temporisation\n * d'armement pour eviter les fausses alertes au demarrage.\n *\n * Architecture 100% non bloquante (millis()) : mesure ultrason, animation LED,\n * bip du buzzer et serveur web tournent en parallele.\n */\n\n#include <Arduino.h>\n#include <Adafruit_NeoPixel.h>\n#include <WiFi.h>\n#include <WebServer.h>\n\n// ---------- Capteur ultrason ----------\nconst uint8_t TRIG_PIN = 5;\nconst uint8_t ECHO_PIN = 18; // via diviseur de tension, voir wiring.md\nconst unsigned long ECHO_TIMEOUT_US = 30000UL;\nconst float ALARM_THRESHOLD_CM = 30.0;\nconst unsigned long MEASURE_INTERVAL_MS = 200;\nunsigned long lastMeasureTime = 0;\nfloat lastDistance = -1;\n\n// ---------- LED WS2812 (indicateur d'etat) ----------\n#define LED_PIN 15\n#define LED_COUNT 1\nAdafruit_NeoPixel statusLed(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);\n\n// ---------- Buzzer actif ----------\nconst uint8_t BUZZER_PIN = 26;\n\n// ---------- Machine a etats de l'alarme ----------\nenum AlarmState { ARMING, ARMED_IDLE, ALARM_TRIGGERED };\nAlarmState alarmState = ARMING;\nunsigned long stateEnterTime = 0;\nconst unsigned long ARMING_DELAY_MS = 5000; // delai avant armement (le temps de s'eloigner du capteur)\n\n// Clignotement non bloquant pendant l'alarme\nunsigned long lastBlinkTime = 0;\nconst unsigned long BLINK_INTERVAL_MS = 300;\nbool blinkOn = false;\n\n// ---------- WiFi + dashboard ----------\nconst char* AP_SSID = \"ESP32_ALARME\";\nconst char* AP_PASSWORD = \"alarme1234\";\nWebServer server(80);\nString lastEvent = \"Systeme en cours d'armement...\";\nuint32_t triggerCount = 0;\n\nfloat measureDistanceCm() {\n  digitalWrite(TRIG_PIN, LOW);\n  delayMicroseconds(2);\n  digitalWrite(TRIG_PIN, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(TRIG_PIN, LOW);\n  unsigned long duration = pulseIn(ECHO_PIN, HIGH, ECHO_TIMEOUT_US);\n  if (duration == 0) return -1.0;\n  return (duration * 0.0343) / 2.0;\n}\n\nvoid enterState(AlarmState newState, const String& eventMessage) {\n  alarmState = newState;\n  stateEnterTime = millis();\n  lastEvent = eventMessage;\n  Serial.println(\"[35_alarme] \" + eventMessage);\n}\n\nvoid updateAlarmLogic() {\n  unsigned long now = millis();\n\n  switch (alarmState) {\n    case ARMING:\n      statusLed.setPixelColor(0, statusLed.Color(40, 40, 0)); // jaune = armement en cours\n      statusLed.show();\n      if (now - stateEnterTime >= ARMING_DELAY_MS) {\n        enterState(ARMED_IDLE, \"Systeme arme - surveillance active.\");\n      }\n      break;\n\n    case ARMED_IDLE:\n      statusLed.setPixelColor(0, statusLed.Color(0, 40, 0)); // vert = arme, tout va bien\n      statusLed.show();\n      digitalWrite(BUZZER_PIN, LOW);\n      if (lastDistance > 0 && lastDistance < ALARM_THRESHOLD_CM) {\n        triggerCount++;\n        enterState(ALARM_TRIGGERED, \"ALERTE ! Intrusion detectee a \" + String(lastDistance, 1) + \" cm\");\n      }\n      break;\n\n    case ALARM_TRIGGERED:\n      // Clignotement rouge non bloquant + buzzer actif\n      if (now - lastBlinkTime >= BLINK_INTERVAL_MS) {\n        lastBlinkTime = now;\n        blinkOn = !blinkOn;\n        statusLed.setPixelColor(0, blinkOn ? statusLed.Color(255, 0, 0) : statusLed.Color(0, 0, 0));\n        statusLed.show();\n        digitalWrite(BUZZER_PIN, blinkOn ? HIGH : LOW);\n      }\n      // Reste en alarme tant que l'obstacle est proche ; sinon revient a la surveillance\n      if (lastDistance < 0 || lastDistance >= ALARM_THRESHOLD_CM) {\n        digitalWrite(BUZZER_PIN, LOW);\n        enterState(ARMED_IDLE, \"Fin d'alerte - zone degagee, reprise de la surveillance.\");\n      }\n      break;\n  }\n}\n\n// ---------- Serveur web ----------\nString buildDashboard() {\n  String etatTxt;\n  switch (alarmState) {\n    case ARMING: etatTxt = \"ARMEMENT EN COURS\"; break;\n    case ARMED_IDLE: etatTxt = \"ARME - SURVEILLANCE\"; break;\n    case ALARM_TRIGGERED: etatTxt = \"ALARME DECLENCHEE\"; break;\n  }\n\n  String html = \"<!DOCTYPE html><html><head><meta charset='utf-8'>\";\n  html += \"<meta name='viewport' content='width=device-width, initial-scale=1'>\";\n  html += \"<meta http-equiv='refresh' content='2'>\"; // auto-refresh dashboard toutes les 2s\n  html += \"<title>Alarme de securite</title></head><body>\";\n  html += \"<h1>Systeme d'alarme</h1>\";\n  html += \"<p>Etat : <strong>\" + etatTxt + \"</strong></p>\";\n  html += \"<p>Distance mesuree : \" + (lastDistance >= 0 ? String(lastDistance, 1) + \" cm\" : String(\"hors de portee\")) + \"</p>\";\n  html += \"<p>Dernier evenement : \" + lastEvent + \"</p>\";\n  html += \"<p>Nombre de declenchements depuis demarrage : \" + String(triggerCount) + \"</p>\";\n  html += \"</body></html>\";\n  return html;\n}\n\nvoid handleRoot() {\n  server.send(200, \"text/html\", buildDashboard());\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(200);\n\n  pinMode(TRIG_PIN, OUTPUT);\n  pinMode(ECHO_PIN, INPUT);\n  digitalWrite(TRIG_PIN, LOW);\n\n  pinMode(BUZZER_PIN, OUTPUT);\n  digitalWrite(BUZZER_PIN, LOW);\n\n  statusLed.begin();\n  statusLed.setBrightness(80);\n  statusLed.show();\n\n  WiFi.mode(WIFI_AP);\n  WiFi.softAP(AP_SSID, AP_PASSWORD);\n  Serial.print(\"[35_alarme] Dashboard disponible sur : http://\");\n  Serial.println(WiFi.softAPIP());\n\n  server.on(\"/\", handleRoot);\n  server.begin();\n\n  enterState(ARMING, \"Demarrage - armement dans 5 secondes, eloignez-vous du capteur.\");\n}\n\nvoid loop() {\n  unsigned long now = millis();\n\n  if (now - lastMeasureTime >= MEASURE_INTERVAL_MS) {\n    lastMeasureTime = now;\n    lastDistance = measureDistanceCm();\n  }\n\n  updateAlarmLogic();\n  server.handleClient();\n}\n"}];})(typeof globalThis!=='undefined'?globalThis:this);