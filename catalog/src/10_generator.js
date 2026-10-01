/* ESP32 LAB Studio — générateur de programmes Arduino (ESP32 / ESP32-S3 / ESP32-C3).
 * Utilisé à la fois par l'interface web du MASTER (navigateur) et par le script de build
 * (Node.js) qui produit les projets de la bibliothèque. Aucune dépendance. */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  LAB.MODULES = LAB.MODULES || [];
  LAB.VERSION = '6.1.0';

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
      device,
      rules: rules.length,
      instances: instances.map((x) => ({ id: x.mod.id, label: x.label, name: x.mod.name, params: x.params, period: Number(x.params.period || x.mod.period || 1000) }))
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
