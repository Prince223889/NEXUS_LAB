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
    outs: [T],
    emu: { kind: 'i2c', out: 'temp', lsb: 0.0625, shift: 4, pointer: true }
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
    outs: [T],
    emu: { kind: 'i2c', out: 'temp', lsb: 0.125, shift: 5, pointer: true }
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
    emu: { kind: 'analog', pin: 'AO', out: 'moist', mv: [[0, 'dry'], [100, 'wet']] },   // nombres ou noms de paramètres
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
    outs: [{ k: 'moist', u: '%', l: 'Humidité du sol' }],
    emu: { kind: 'analog', pin: 'AO', out: 'moist', mv: [[0, 3200], [100, 1200]] }
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
