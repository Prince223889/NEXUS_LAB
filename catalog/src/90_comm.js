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
