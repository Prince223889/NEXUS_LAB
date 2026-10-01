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
