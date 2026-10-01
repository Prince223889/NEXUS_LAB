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
