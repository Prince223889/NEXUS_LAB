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
    demo: C`$toggle();`,
    obs: { kind: 'level', pin: 'LED' }
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
    obs: { kind: 'duty', pin: 'LED', curve: 'square' },   // rapport cyclique = consigne² / 100
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
$off();`,
    obs: { kind: 'level', pin: 'IO' }
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
    obs: { kind: 'level', pin: 'IN', invert: 'low' },   // invert : paramètre qui inverse le niveau (actif bas)
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
    obs: { kind: 'duty', pin: 'SIG', curve: 'linear' },
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
