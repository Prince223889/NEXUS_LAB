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
