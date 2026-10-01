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
