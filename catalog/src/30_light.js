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
    outs: [{ k: 'light', u: '%', l: 'Luminosité' }],
    emu: { kind: 'analog', pin: 'AO', out: 'light', mv: [[0, 0], [100, 3300]] }
  });
  add({
    id: 'ldr_module', key: 'ldrm', name: 'Module photorésistance KY-018 / LM393', tags: ['lumière', 'seuil', 'numérique'],
    desc: 'Module LDR avec comparateur réglable : sortie numérique jour/nuit et sortie analogique.',
    pins: [{ role: 'DO', type: 'in', label: 'DO' }, { role: 'AO', type: 'adc', label: 'AO', optional: true }], period: 500,
    setup: C`pinMode({{DO}}, INPUT);`,
    loop: C`$dark = digitalRead({{DO}}) == HIGH ? 1 : 0;      // DO = HIGH quand il fait sombre
if ({{AO}} >= 0) $level = 100.0f - analogReadMilliVolts({{AO}}) * 100.0f / 3300.0f;`,
    outs: [{ k: 'dark', u: '', l: 'Obscurité (0/1)' }, { k: 'level', u: '%', l: 'Luminosité' }],
    emu: { kind: 'digital', pin: 'DO', out: 'dark', active: 1 },
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
    outs: [LUX],
    emu: { kind: 'analog', pin: 'SIG', out: 'lux', mv: [[0, 0], [500, 2500]] }
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
    outs: [LUX],
    emu: { kind: 'i2c', out: 'lux', lsb: 1 / 1.2, shift: 0, pointer: false }   // mesure = brut / 1,2 (mode haute résolution)
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
