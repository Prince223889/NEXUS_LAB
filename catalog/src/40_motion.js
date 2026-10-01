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
    outs: [{ k: 'motion', u: '', l: 'Présence (0/1)' }],
    emu: { kind: 'digital', pin: 'OUT', out: 'motion', active: 1 }
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
    outs: [{ k: 'state', u: '', l: 'État (0/1)' }, { k: 'count', u: '', l: 'Déclenchements' }],
    emu: { kind: 'digital', pin: 'IN', out: 'state', active: 0 }   // contact fermé = broche à GND
  }, extra));
  contact('reed', 'Contact reed (ILS)', 'Interrupteur à lame souple : ouverture de porte/fenêtre, compteur à aimant.', ['magnétique', 'porte', 'alarme']);
  contact('tilt_sw520', 'Capteur d\'inclinaison SW-520D', 'Bille métallique qui ferme le contact au-delà d\'environ 45°.', ['inclinaison', 'bille']);
  contact('vibration_sw420', 'Capteur de vibration SW-420', 'Module à ressort + comparateur : chocs et vibrations (antivol, machine).', ['vibration', 'choc', 'alarme'],
    { pins: [{ role: 'IN', type: 'in', label: 'DO' }], setup: C`pinMode({{IN}}, INPUT);`,
      loop: C`bool on = digitalRead({{IN}}) == HIGH;
if (on && !$prev) { $events++; Serial.printf("# vibration (%lu)\n", (unsigned long)$events); }
$prev = on;
$state = on ? 1 : 0;
$count = $events;`,
      emu: { kind: 'digital', pin: 'IN', out: 'state', active: 1 } });
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
    outs: [{ k: 'pressed', u: '', l: 'Appuyé (0/1)' }, { k: 'count', u: '', l: 'Appuis' }],
    emu: { kind: 'digital', pin: 'BTN', out: 'pressed', active: 0 }
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
    outs: [{ k: 'pos', u: '%', l: 'Position' }],
    emu: { kind: 'analog', pin: 'W', out: 'pos', mv: [[0, 0], [100, 3200]] }
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
