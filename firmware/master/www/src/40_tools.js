/* Outils de l'électronicien : brochage, base I2C, calculateurs (LED, pont diviseur, code couleur, PWM, ADC,
 * budget énergétique), fuseaux horaires POSIX et convertisseur de bases. Tout fonctionne hors ligne. */
(function () {
  'use strict';
  const A = window.APP, LAB = window.LAB;
  const { $, $$, esc, icon, store, copyText, fmtNum } = A;

  const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
  const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  function nearestE(v, series, up) {
    if (!(v > 0)) return null;
    const dec = Math.pow(10, Math.floor(Math.log10(v)));
    const cands = [];
    [dec / 10, dec, dec * 10].forEach((d) => series.forEach((s) => cands.push(+(s * d).toPrecision(3))));
    if (up) return cands.filter((c) => c >= v * 0.999).sort((a, b) => a - b)[0];
    return cands.sort((a, b) => Math.abs(a - v) - Math.abs(b - v))[0];
  }
  const fmtOhm = (r) => (r == null ? '—' : r >= 1e6 ? fmtNum(r / 1e6, 2) + ' MΩ' : r >= 1e3 ? fmtNum(r / 1e3, 2) + ' kΩ' : fmtNum(r, 1) + ' Ω');
  const COLORS = [['noir', '#1b1b1b'], ['marron', '#7b3f1d'], ['rouge', '#d62828'], ['orange', '#f77f00'], ['jaune', '#fcbf49'], ['vert', '#2a9d4b'], ['bleu', '#1d4ed8'], ['violet', '#7c3aed'], ['gris', '#8a8f98'], ['blanc', '#f4f4f4']];
  const MULT = [[1, 'noir'], [10, 'marron'], [100, 'rouge'], [1e3, 'orange'], [1e4, 'jaune'], [1e5, 'vert'], [1e6, 'bleu'], [1e7, 'violet'], [0.1, 'or'], [0.01, 'argent']];
  const TOL = [['±1 %', 'marron', '#7b3f1d'], ['±2 %', 'rouge', '#d62828'], ['±5 %', 'or', '#c9a227'], ['±10 %', 'argent', '#b8bcc4']];
  const colHex = (n) => (COLORS.find((c) => c[0] === n) || (n === 'or' ? [0, '#c9a227'] : n === 'argent' ? [0, '#b8bcc4'] : [0, '#999']))[1];

  /* Base de données I2C : modules du catalogue + composants courants. */
  const I2C_EXTRA = [
    ['0x0D', 'QMC5883L (boussole)'], ['0x10', 'VEML7700 (lux)'], ['0x1E', 'HMC5883L (boussole)'], ['0x20', 'PCF8574 / MCP23017 (E/S)'], ['0x23', 'BH1750 (lux)'],
    ['0x27', 'LCD I2C (PCF8574)'], ['0x29', 'VL53L0X / VL53L1X / TCS34725'], ['0x36', 'AS5600 (angle) / MAX17048 (jauge batterie)'], ['0x38', 'AHT10 / AHT20 / PCF8574A'], ['0x39', 'APDS-9960 / TSL2561'],
    ['0x3C', 'OLED SSD1306 / SH1106'], ['0x3D', 'OLED SSD1306 (ADDR=1)'], ['0x3F', 'LCD I2C (PCF8574A)'], ['0x40', 'INA219 / INA226 / HTU21D / Si7021 / PCA9685'], ['0x41', 'INA219 (A0=1)'],
    ['0x44', 'SHT30 / SHT31 / SHT40'], ['0x45', 'SHT3x (ADDR=1)'], ['0x48', 'ADS1115 / ADS1015 / TMP102 / PCF8591'], ['0x49', 'ADS1115 (ADDR=VDD)'], ['0x4A', 'ADS1115 (ADDR=SDA) / MAX44009'],
    ['0x50', 'EEPROM AT24C32 (module DS3231)'], ['0x53', 'ADXL345'], ['0x57', 'MAX30102 / EEPROM DS3231'], ['0x58', 'SGP30'], ['0x59', 'SGP40 / SGP41'], ['0x5A', 'MLX90614 / CCS811 / MPR121'],
    ['0x5B', 'CCS811 (ADDR=1)'], ['0x5C', 'BH1750 (ADDR=1) / AM2320'], ['0x60', 'MCP4725 (DAC) / SI1145'], ['0x61', 'SCD30'], ['0x62', 'SCD40 / SCD41'], ['0x68', 'DS3231 / DS1307 / MPU6050 / MPU9250'],
    ['0x69', 'MPU6050 (AD0=1)'], ['0x6A', 'LSM6DS3 / ISM330'], ['0x70', 'TCA9548A (multiplexeur) / HT16K33'], ['0x76', 'BME280 / BMP280 / BME680'], ['0x77', 'BME280 / BMP180 / BMP085 / BME680 / MS5611']
  ];
  function i2cDb() {
    const db = {};
    const add = (a, n, id) => { a = a.toLowerCase(); (db[a] = db[a] || []); if (!db[a].some((x) => x.n === n)) db[a].push({ n, id }); };
    (LAB.MODULES || []).forEach((m) => (m.addr || []).forEach((a) => add(a, m.name, m.id)));
    I2C_EXTRA.forEach(([a, n]) => { if (!db[a.toLowerCase()]) add(a, n); });   // composants hors catalogue seulement
    return db;
  }

  const TZ = [
    ['Paris, Bruxelles, Genève (CET/CEST)', 'CET-1CEST,M3.5.0,M10.5.0/3'], ['Londres, Lisbonne (GMT/BST)', 'GMT0BST,M3.5.0/1,M10.5.0'], ['Montréal, New York (EST/EDT)', 'EST5EDT,M3.2.0,M11.1.0'],
    ['Chicago (CST/CDT)', 'CST6CDT,M3.2.0,M11.1.0'], ['Los Angeles (PST/PDT)', 'PST8PDT,M3.2.0,M11.1.0'], ['Dakar, Abidjan (GMT)', 'GMT0'], ['Casablanca (+01)', '<+01>-1'], ['Alger, Tunis (CET)', 'CET-1'],
    ['Kinshasa, Lagos, Douala (WAT)', 'WAT-1'], ['Le Caire (EET/EEST)', 'EET-2EEST,M4.5.5/0,M10.5.4/24'], ['Maurice (+04)', '<+04>-4'], ['La Réunion (+04)', '<+04>-4'], ['Martinique, Guadeloupe (AST)', 'AST4'],
    ['Guyane (-03)', '<-03>3'], ['Nouvelle-Calédonie (+11)', '<+11>-11'], ['Polynésie, Tahiti (-10)', 'HST10'], ['Moscou (MSK)', 'MSK-3'], ['Dubaï (+04)', '<+04>-4'], ['Inde (IST)', 'IST-5:30'],
    ['Pékin, Shanghai (CST)', 'CST-8'], ['Tokyo (JST)', 'JST-9'], ['Sydney (AEST/AEDT)', 'AEST-10AEDT,M10.1.0,M4.1.0/3'], ['UTC', 'UTC0']
  ];
  const LED_VF = [['Rouge', 2.0, '#d62828'], ['Jaune / orange', 2.1, '#f7b500'], ['Verte', 2.2, '#2a9d4b'], ['Bleue', 3.1, '#1d4ed8'], ['Blanche', 3.1, '#e8e8e8'], ['Infrarouge', 1.3, '#6b2020'], ['UV', 3.4, '#7c3aed']];
  const POWER_PRESETS = [
    ['ESP32 actif + Wi-Fi', 120], ['ESP32 actif sans Wi-Fi', 45], ['ESP32 modem-sleep', 20], ['ESP32 light-sleep', 0.8], ['ESP32 deep-sleep (module nu)', 0.01], ['Carte DevKit en deep-sleep (régulateur + LED)', 8],
    ['OLED 0,96" SSD1306', 20], ['LCD 16×2 rétroéclairé', 25], ['DHT22 (mesure)', 1.5], ['BME280', 0.7], ['Capteur de sol capacitif', 5], ['Module relais 5 V (bobine)', 70], ['Servo SG90 (en mouvement)', 250],
    ['LED 5 mm', 10], ['Ruban WS2812B (par LED, blanc 100 %)', 60], ['GPS NEO-6M', 45], ['LoRa SX1276 (émission)', 120], ['MQ-2 (chauffage)', 150], ['Écran TFT ILI9341', 80]
  ];

  const TABS = [
    ['pins', 'Brochage', 'pin'], ['i2c', 'Adresses I2C', 'search'], ['power', 'Budget énergie', 'battery'], ['led', 'Résistance de LED', 'zap'], ['div', 'Pont diviseur', 'resistor'],
    ['color', 'Code couleur', 'resistor'], ['pwm', 'PWM (LEDC)', 'wave'], ['adc', 'ADC', 'gauge'], ['tz', 'Fuseaux horaires', 'clock'], ['num', 'Hex / bin', 'code']
  ];

  A.page({
    id: 'tools', title: 'Outils', icon: 'tool', group: 'build', mobile: false,
    desc: 'Brochage, adresses I2C, calculateurs, fuseaux',
    render(el, q) {
      let tab = (q && q.t) || store.get('tools.tab', 'pins');
      el.innerHTML = `<div class="tabs" id="tl-tabs">${TABS.map(([k, n, i]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${icon(i)}${n}</button>`).join('')}</div><div class="tab-panel" id="tl-body"></div>`;
      let body = $('#tl-body', el);
      const show = () => {
        store.set('tools.tab', tab);
        const nb = body.cloneNode(false);   // conteneur neuf : pas d'écouteurs résiduels de l'outil précédent
        body.replaceWith(nb);
        body = nb;
        const fn = TOOLS[tab];
        if (fn) fn(body);
      };
      $('#tl-tabs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; $$('#tl-tabs button', el).forEach((x) => x.classList.toggle('on', x === b)); show(); });
      show();
    }
  });

  /* Petit moteur de formulaire : chaque champ [data-k] déclenche calc() à la saisie. */
  function form(el, html, calc) {
    el.innerHTML = html;
    const vals = () => { const o = {}; $$('[data-k]', el).forEach((i) => { o[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; }); return o; };
    const run = () => { try { calc(vals(), el); } catch (e) { console.error(e); } };
    el.addEventListener('input', run);
    el.addEventListener('change', run);
    run();
  }
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; };

  const TOOLS = {
    pins(el) {
      let board = store.get('tools.board', 'esp32'), sel = null;
      const draw = () => {
        const b = LAB.BOARDS[board];
        const gpios = Array.from(new Set([].concat(A.LAYOUTS[board].left, A.LAYOUTS[board].right).filter((g) => typeof g === 'number'))).sort((x, y) => x - y);
        el.innerHTML = `<div class="grid g-2"><div class="card"><div class="card-h"><div class="grow"><h2>${esc(b.name)}</h2><div class="card-sub">Vue de dessus, connecteur USB en bas. Survolez ou touchez une broche.</div></div><div class="seg" id="pb-b">${Object.keys(LAB.BOARDS).map((k) => `<button data-b="${k}" class="${k === board ? 'on' : ''}">${LAB.BOARDS[k].short}</button>`).join('')}</div></div><div class="card-b">${A.boardView(board, sel != null ? { [sel]: { label: '◀ sélectionnée', bus: false } } : null, { caps: true })}</div></div>
          <div class="stack"><div class="card pad" id="pb-detail">${sel != null ? detail(b, sel) : '<div class="small muted">Sélectionnez une broche pour voir ses fonctions et ses pièges.</div>'}</div>
          <div class="card"><div class="card-h"><h2 class="grow">Toutes les broches</h2></div><div class="card-b flush" style="margin-top:8px"><div class="table-wrap" style="max-height:460px"><table class="tbl"><thead><tr><th>GPIO</th><th>Fonctions</th><th>Remarque</th></tr></thead><tbody>${gpios.map((g) => `<tr class="click" data-g="${g}"><td class="mono"><b>${g}</b></td><td class="small">${esc(A.pinInfo(b, g).join(' · ') || 'E/S numérique')}</td><td class="small ${b.reserved[g] ? '' : b.caution[g] ? '' : 'muted'}" style="${b.reserved[g] ? 'color:var(--bad)' : b.caution[g] ? 'color:var(--warn)' : ''}">${esc(b.reserved[g] || b.caution[g] || 'libre')}</td></tr>`).join('')}</tbody></table></div></div></div>
          <div class="card pad"><h3 style="margin-bottom:8px">À savoir</h3><ul class="small" style="margin:0;padding-left:18px">${(b.notes || []).map((n) => `<li>${esc(n)}</li>`).join('')}<li>Bus I2C par défaut : SDA ${b.i2c.sda}, SCL ${b.i2c.scl} · SPI : SCK ${b.spi.sck}, MISO ${b.spi.miso}, MOSI ${b.spi.mosi}, SS ${b.spi.ss}.</li><li>Toutes les broches sont en 3,3 V : un signal 5 V doit passer par un pont diviseur ou un convertisseur de niveau.</li></ul></div></div></div>`;
      };
      const detail = (b, g) => {
        const f = A.pinInfo(b, g);
        return `<div class="row" style="margin-bottom:10px"><div class="icon-tile accent"><b class="mono">${g}</b></div><div><h3>GPIO${g}</h3><div class="small muted">${esc(f.join(' · ') || 'Entrée / sortie numérique')}</div></div></div>
          <dl class="dl"><dt>Sortie</dt><dd>${b.inOnly.includes(g) ? '<span class="badge bad">non (entrée seule)</span>' : '<span class="badge ok">oui</span>'}</dd><dt>Tirage interne</dt><dd>${b.inOnly.includes(g) ? 'aucun (résistance externe)' : 'pull-up / pull-down'}</dd>
          <dt>Analogique</dt><dd>${b.adc.includes(g) ? 'ADC1 : utilisable avec le Wi-Fi' : 'non (ou ADC2, bloqué par le Wi-Fi)'}</dd><dt>Tactile</dt><dd>${b.touch.includes(g) ? 'oui (touchRead)' : 'non'}</dd><dt>PWM</dt><dd>${b.inOnly.includes(g) ? 'non' : 'oui (LEDC, toutes sorties)'}</dd>
          ${b.reserved[g] ? `<dt>Réservée</dt><dd style="color:var(--bad)">${esc(b.reserved[g])}</dd>` : ''}${b.caution[g] ? `<dt>Attention</dt><dd style="color:var(--warn)">${esc(b.caution[g])}</dd>` : ''}</dl>`;
      };
      el.onclick = (e) => {
        const bb = e.target.closest('[data-b]'); if (bb) { board = bb.dataset.b; sel = null; store.set('tools.board', board); draw(); return; }
        const p = e.target.closest('[data-gpio],[data-g]'); if (p) { sel = Number(p.dataset.gpio || p.dataset.g); draw(); }
      };
      draw();
    },

    i2c(el) {
      const db = i2cDb();
      let q = '', sel = null;
      el.innerHTML = `<div class="grid g-2"><div class="card"><div class="card-h"><div class="grow"><h2>Carte des adresses (7 bits)</h2><div class="card-sub">Comme <code>i2cdetect</code> : chaque case occupée correspond à au moins un composant connu.</div></div></div><div class="card-b" id="i2-grid"></div></div>
        <div class="stack"><div class="card pad"><div class="input-icon">${icon('search')}<input class="input" id="i2-q" placeholder="0x3C, OLED, BME280…" autocomplete="off"></div><div id="i2-res" style="margin-top:12px"></div></div>
        <div class="card pad small"><h3 style="margin-bottom:6px">Deux composants à la même adresse ?</h3><ul style="margin:0;padding-left:18px"><li>Changez l'adresse si le module le permet (broche ADDR, AD0, SDO, cavalier A0-A2).</li><li>Sinon, utilisez un multiplexeur TCA9548A (0x70) : 8 bus séparés.</li><li>Ou un second bus : <code>TwoWire bus2 = TwoWire(1); bus2.begin(sda, scl);</code></li><li>Adresses 0x00-0x07 et 0x78-0x7F réservées par la norme.</li></ul>
          <p style="margin-top:8px">Le job <b>Scan I2C</b> d'un worker liste ce qui est réellement branché.</p></div></div></div>`;
      const draw = () => {
        const nq = A.norm(q.trim());
        let cells = '<div style="display:grid;grid-template-columns:34px repeat(16,1fr);gap:3px;font-family:var(--mono);font-size:11px">';
        cells += '<span></span>' + Array.from({ length: 16 }, (_, i) => `<span class="muted" style="text-align:center">${i.toString(16)}</span>`).join('');
        for (let r = 0; r < 8; r++) {
          cells += `<span class="muted">${(r * 16).toString(16).padStart(2, '0')}</span>`;
          for (let c = 0; c < 16; c++) {
            const a = r * 16 + c, key = '0x' + a.toString(16).padStart(2, '0');
            const dev = db[key], reservedA = a < 8 || a > 0x77;
            const match = nq && dev && (key.includes(nq) || dev.some((d) => A.norm(d.n).includes(nq)));
            const bg = sel === key ? 'var(--accent)' : match ? 'var(--warn)' : dev ? 'var(--accent-soft)' : 'var(--surface-2)';
            cells += `<button data-a="${key}" title="${esc(dev ? dev.map((d) => d.n).join(', ') : key)}" style="aspect-ratio:1;border:1px solid var(--line);border-radius:5px;background:${bg};color:${sel === key ? '#fff' : dev ? 'var(--accent-text)' : 'var(--text-3)'};font:inherit;cursor:${dev ? 'pointer' : 'default'};opacity:${reservedA ? 0.35 : 1};padding:0">${dev ? a.toString(16).padStart(2, '0') : '·'}</button>`;
          }
        }
        $('#i2-grid', el).innerHTML = cells + '</div>';
        let list = Object.entries(db);
        if (sel) list = list.filter(([a]) => a === sel);
        else if (nq) list = list.filter(([a, d]) => a.includes(nq) || d.some((x) => A.norm(x.n).includes(nq)));
        else list = list.filter(([a]) => ['0x3c', '0x76', '0x68', '0x27', '0x23', '0x40'].includes(a));
        list.sort((x, y) => parseInt(x[0], 16) - parseInt(y[0], 16));
        $('#i2-res', el).innerHTML = (!sel && !nq ? '<div class="small muted" style="margin-bottom:8px">Adresses les plus courantes :</div>' : '') + (list.length ? `<div class="statlist">${list.map(([a, d]) => `<div style="align-items:flex-start"><span class="badge accent mono">${a}</span><span style="text-align:right">${d.map((x) => x.id ? `<a href="#library?p=${esc(x.id)}">${esc(x.n)}</a>` : esc(x.n)).join('<br>')}</span></div>`).join('')}</div>` : '<div class="small muted">Aucun composant connu.</div>');
      };
      $('#i2-q', el).addEventListener('input', (e) => { q = e.target.value; sel = null; draw(); });
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; sel = sel === b.dataset.a ? null : b.dataset.a; draw(); });
      draw();
    },

    power(el) {
      let rows = store.get('tools.power', [['ESP32 actif + Wi-Fi', 120, 5], ['ESP32 deep-sleep (module nu)', 0.01, 95], ['BME280', 0.7, 5]]);
      const save = () => store.set('tools.power', rows);
      const draw = () => {
        const cap = store.get('tools.cap', 2500), eff = store.get('tools.eff', 85);
        const avg = rows.reduce((s, r) => s + Number(r[1] || 0) * Number(r[2] || 0) / 100, 0);
        const peak = rows.reduce((s, r) => s + (Number(r[2]) > 0 ? Number(r[1] || 0) : 0), 0);
        const h = (cap * eff / 100) / Math.max(1e-6, avg);
        el.innerHTML = `<div class="grid g-3"><div class="card span-2"><div class="card-h"><div class="grow"><h2>Budget énergétique</h2><div class="card-sub">Pour chaque élément : courant consommé et pourcentage du temps où il est actif.</div></div><button class="btn sm" id="pw-add">${icon('plus')}Ajouter</button></div>
          <div class="card-b"><div class="table-wrap"><table class="tbl"><thead><tr><th>Élément</th><th style="width:110px">Courant (mA)</th><th style="width:110px">Temps actif (%)</th><th style="width:90px">Moyenne</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr><td><input class="input sm" data-i="${i}" data-c="0" value="${esc(r[0])}" list="pw-presets"></td><td><input class="input sm" type="number" min="0" step="any" data-i="${i}" data-c="1" value="${esc(r[1])}"></td><td><input class="input sm" type="number" min="0" max="100" step="any" data-i="${i}" data-c="2" value="${esc(r[2])}"></td><td class="num small">${fmtNum(r[1] * r[2] / 100, 3)} mA</td><td><button class="btn sm icon ghost" data-del="${i}" aria-label="Supprimer">${icon('x')}</button></td></tr>`).join('')}</tbody></table></div>
          <datalist id="pw-presets">${POWER_PRESETS.map(([n]) => `<option value="${esc(n)}">`).join('')}</datalist><div class="hint" style="margin-top:8px">Astuce : choisissez un nom dans la liste pour remplir le courant automatiquement.</div></div></div>
          <div class="card pad stack" style="gap:12px"><div class="field"><label>Batterie (mAh)</label><input class="input" type="number" id="pw-cap" value="${cap}" min="10" step="50"></div>
            <div class="field"><label>Rendement du régulateur : <b>${eff} %</b></label><input type="range" id="pw-eff" min="50" max="100" value="${eff}"></div>
            <div><div class="small muted">Consommation moyenne</div><div class="calc-out">${fmtNum(avg, 2)} mA</div></div>
            <div><div class="small muted">Autonomie estimée</div><div class="calc-out" style="color:var(--ok)">${h > 48 ? fmtNum(h / 24, 1) + ' jours' : fmtNum(h, 1) + ' h'}</div></div>
            <div class="small">Pointe (tout actif) : <b>${fmtNum(peak, 0)} mA</b> ${peak > 500 ? '<span class="badge warn">alim. externe</span>' : ''}</div>
            <div class="hint">Une batterie Li-ion 18650 fait 2500 à 3500 mAh. Pour tenir des mois, visez une moyenne &lt; 1 mA (deep-sleep, module nu sans LED ni régulateur gourmand).</div></div></div>`;
        $('#pw-add', el).onclick = () => { rows.push(['Nouvel élément', 10, 100]); save(); draw(); };
        $('#pw-cap', el).onchange = (e) => { store.set('tools.cap', Number(e.target.value) || 2500); draw(); };
        $('#pw-eff', el).oninput = (e) => { store.set('tools.eff', Number(e.target.value)); draw(); };
      };
      el.onchange = (e) => {
        const t = e.target;
        if (t.dataset.i == null) return;
        const r = rows[Number(t.dataset.i)], c = Number(t.dataset.c);
        r[c] = c === 0 ? t.value : Number(t.value);
        if (c === 0) { const p = POWER_PRESETS.find((x) => x[0] === t.value); if (p) r[1] = p[1]; }
        save(); draw();
      };
      el.onclick = (e) => { const d = e.target.closest('[data-del]'); if (d) { rows.splice(Number(d.dataset.del), 1); save(); draw(); } };
      draw();
    },

    led(el) {
      form(el, `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>Résistance série d'une LED</h2>
        <div class="field"><label>Couleur</label><div class="chips">${LED_VF.map(([n, v, c], i) => `<button class="chip" data-vf="${v}"><span class="color-sw" style="background:${c}"></span>${n}</button>`).join('')}</div></div>
        <div class="form-grid"><div class="field"><label>Tension d'alimentation (V)</label><input class="input" data-k="vs" value="3.3"></div><div class="field"><label>Tension de seuil Vf (V)</label><input class="input" data-k="vf" id="led-vf" value="2.0"></div>
        <div class="field"><label>Courant (mA)</label><input class="input" data-k="i" value="10"></div><div class="field"><label>Nombre de LED en série</label><input class="input" data-k="n" value="1"></div></div></div>
        <div class="card pad" id="led-out"></div></div>`, (v, root) => {
        const vs = num(v.vs), vf = num(v.vf) * (num(v.n) || 1), i = num(v.i) / 1000;
        const out = $('#led-out', root);
        if (!(vs > vf)) { out.innerHTML = `<div class="banner warn">${icon('alert')}<div>La tension d'alimentation doit dépasser la somme des Vf (${fmtNum(vf, 2)} V).</div></div>`; return; }
        const r = (vs - vf) / i, e = nearestE(r, E12, true), ie = (vs - vf) / e, p = (vs - vf) * ie;
        out.innerHTML = `<div class="small muted">Valeur calculée</div><div class="calc-out">${fmtOhm(r)}</div><div class="divider"></div>
          <div class="small muted">Valeur normalisée E12 (au-dessus, plus sûre)</div><div class="calc-out" style="color:var(--ok)">${fmtOhm(e)}</div>
          <dl class="dl" style="margin-top:12px"><dt>Courant réel</dt><dd>${fmtNum(ie * 1000, 1)} mA</dd><dt>Puissance dissipée</dt><dd>${fmtNum(p * 1000, 1)} mW → résistance ${p > 0.2 ? '<b>1/2 W</b>' : '1/4 W'}</dd></dl>
          <p class="hint" style="margin-top:10px">Une broche ESP32 fournit au plus ~20 mA (40 mA absolu). Au-delà, passez par un transistor ou un MOSFET logique.</p>`;
      });
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-vf]'); if (b) { const i = $('#led-vf', el); i.value = b.dataset.vf; i.dispatchEvent(new Event('input', { bubbles: true })); } });
    },

    div(el) {
      form(el, `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>Pont diviseur de tension</h2><p class="small muted">Vout = Vin × R2 / (R1 + R2). Idéal pour mesurer une batterie ou adapter un signal 5 V vers 3,3 V.</p>
        <div class="form-grid"><div class="field"><label>Vin (V)</label><input class="input" data-k="vin" value="5"></div><div class="field"><label>Vout souhaitée (V)</label><input class="input" data-k="target" value="3.1"></div>
        <div class="field"><label>R1 (haut, Ω)</label><input class="input" data-k="r1" value="10000"></div><div class="field"><label>R2 (bas, Ω)</label><input class="input" data-k="r2" value="20000"></div></div>
        <svg viewBox="0 0 220 150" style="width:100%;max-width:280px;margin:auto;display:block;color:var(--text-2)"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M40 10v20M40 70v20M40 130v10M40 90h110"/><rect x="30" y="30" width="20" height="40" rx="3"/><rect x="30" y="90" width="20" height="40" rx="3"/><path d="M30 140h20"/></g><g fill="currentColor" font-size="12" font-family="sans-serif"><text x="58" y="54">R1</text><text x="58" y="114">R2</text><text x="48" y="14">Vin</text><text x="154" y="94">Vout → ADC</text><text x="56" y="146">GND</text></g></svg></div>
        <div class="card pad" id="dv-out"></div></div>`, (v, root) => {
        const vin = num(v.vin), r1 = num(v.r1), r2 = num(v.r2), t = num(v.target);
        const vout = vin * r2 / (r1 + r2), ia = vin / (r1 + r2) * 1e6;
        const r2s = t > 0 && t < vin ? nearestE(r1 * t / (vin - t), E24) : null;
        $('#dv-out', root).innerHTML = `<div class="small muted">Tension de sortie</div><div class="calc-out" style="color:${vout > 3.3 ? 'var(--bad)' : 'var(--ok)'}">${fmtNum(vout, 3)} V</div>
          ${vout > 3.3 ? `<div class="banner warn" style="margin:10px 0 0">${icon('alert')}<div>Dépasse 3,3 V : risque de détruire l'entrée de l'ESP32.</div></div>` : vout > 3.1 ? '<p class="small" style="color:var(--warn);margin-top:6px">L\'ADC de l\'ESP32 sature vers 3,1 V (atténuation 11 dB).</p>' : ''}
          <dl class="dl" style="margin-top:12px"><dt>Rapport</dt><dd>${fmtNum(r2 / (r1 + r2), 4)} (× ${fmtNum((r1 + r2) / r2, 3)} pour retrouver Vin)</dd><dt>Courant de fuite</dt><dd>${fmtNum(ia, 1)} µA ${ia > 500 ? '<span class="badge warn">élevé sur batterie</span>' : ''}</dd>
          ${r2s ? `<dt>R2 pour ${fmtNum(t, 2)} V</dt><dd><b>${fmtOhm(r2s)}</b> (E24) → ${fmtNum(vin * r2s / (r1 + r2s), 3)} V</dd>` : ''}</dl>
          <p class="hint" style="margin-top:10px">Dans le code : <code>float vin = analogReadMilliVolts(pin) / 1000.0 * ${fmtNum((r1 + r2) / r2, 4).replace(',', '.')};</code></p>`;
      });
    },

    color(el) {
      let bands = store.get('tools.bands', 4);
      const draw = () => {
        el.innerHTML = `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><div class="row between"><h2>Code couleur des résistances</h2><div class="seg" id="cc-n"><button data-n="4" class="${bands === 4 ? 'on' : ''}">4 bandes</button><button data-n="5" class="${bands === 5 ? 'on' : ''}">5 bandes</button></div></div>
          <div class="form-grid">${Array.from({ length: bands - 2 }, (_, i) => `<div class="field"><label>Chiffre ${i + 1}</label><select class="select" data-k="d${i}">${COLORS.map(([n], k) => `<option value="${k}" ${k === [1, 0, 0][i] ? 'selected' : ''}>${k} · ${n}</option>`).join('')}</select></div>`).join('')}
          <div class="field"><label>Multiplicateur</label><select class="select" data-k="m">${MULT.map(([m, n], k) => `<option value="${k}" ${k === 3 ? 'selected' : ''}>×${m >= 1e3 ? fmtNum(m / 1e3, 0) + 'k' : fmtNum(m, 2)} · ${n}</option>`).join('')}</select></div>
          <div class="field"><label>Tolérance</label><select class="select" data-k="t">${TOL.map(([t, n], k) => `<option value="${k}" ${k === (bands === 4 ? 2 : 0) ? 'selected' : ''}>${t} · ${n}</option>`).join('')}</select></div></div>
          <div class="divider"></div><h3>Et dans l'autre sens</h3><div class="field"><label>Valeur (ex. 4k7, 220, 1M)</label><input class="input" data-k="val" value="4k7"></div><div id="cc-rev"></div></div>
          <div class="card pad" id="cc-out"></div></div>`;
        const calc = () => {
          const v = {}; $$('[data-k]', el).forEach((i) => { v[i.dataset.k] = i.value; });
          const digits = Array.from({ length: bands - 2 }, (_, i) => Number(v['d' + i]));
          const mult = MULT[Number(v.m)], tol = TOL[Number(v.t)];
          const r = Number(digits.join('')) * mult[0];
          const cols = digits.map((d) => COLORS[d][1]).concat([colHex(mult[1]), tol[2]]);
          $('#cc-out', el).innerHTML = `<div class="bands" style="margin-bottom:16px">${cols.map((c) => `<i style="background:${c}"></i>`).join('')}</div><div class="calc-out">${fmtOhm(r)}</div><div class="small muted">${tol[0]} · plage ${fmtOhm(r * (1 - parseFloat(tol[0].replace(/[^0-9.]/g, '')) / 100))} à ${fmtOhm(r * (1 + parseFloat(tol[0].replace(/[^0-9.]/g, '')) / 100))}</div>`;
          const m = String(v.val || '').trim().toLowerCase().replace(',', '.').match(/^(\d*\.?\d*)\s*([rkm]?)(\d*)$/);
          let val = NaN;
          if (m) { const mul = m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1; val = parseFloat((m[1] || '0') + (m[3] ? '.' + m[3] : '')) * mul; }
          if (!(val > 0)) { $('#cc-rev', el).innerHTML = '<span class="small muted">Valeur invalide</span>'; return; }
          const n = bands - 2, exp = Math.floor(Math.log10(val)) - (n - 1), sig = Math.round(val / Math.pow(10, exp));
          const ds = String(sig).padStart(n, '0').slice(0, n).split('').map(Number), mi = MULT.findIndex((x) => Math.abs(Math.log10(x[0]) - exp) < 1e-9);
          $('#cc-rev', el).innerHTML = mi < 0 ? '<span class="small muted">Hors plage</span>' : `<div class="row wrap" style="margin-top:4px">${ds.map((d) => `<span class="badge outline"><span class="color-sw" style="background:${COLORS[d][1]}"></span>${COLORS[d][0]}</span>`).join('')}<span class="badge outline"><span class="color-sw" style="background:${colHex(MULT[mi][1])}"></span>${MULT[mi][1]}</span><span class="badge outline"><span class="color-sw" style="background:${bands === 4 ? '#c9a227' : '#7b3f1d'}"></span>${bands === 4 ? 'or' : 'marron'}</span></div>`;
        };
        el.oninput = calc; el.onchange = calc;
        $('#cc-n', el).onclick = (e) => { const b = e.target.closest('[data-n]'); if (b) { bands = Number(b.dataset.n); store.set('tools.bands', bands); draw(); } };
        calc();
      };
      draw();
    },

    pwm(el) {
      form(el, `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>PWM matériel (LEDC)</h2><p class="small muted">Horloge 80 MHz : fréquence × 2^résolution ≤ 80 000 000. Arduino-ESP32 3.x : <code>ledcAttach(broche, fréquence, bits)</code> puis <code>ledcWrite(broche, rapport)</code>.</p>
        <div class="form-grid"><div class="field"><label>Fréquence (Hz)</label><input class="input" data-k="f" value="5000"></div><div class="field"><label>Rapport cyclique (%)</label><input class="input" data-k="d" value="50"></div></div>
        <div class="field"><label>Usages typiques</label><div class="chips">${[['LED', 5000], ['Servo', 50], ['Ventilateur 4 fils', 25000], ['Moteur CC (L298N)', 1000], ['Buzzer passif (La 440)', 440]].map(([n, f]) => `<button class="chip" data-f="${f}">${n} · ${f} Hz</button>`).join('')}</div></div></div>
        <div class="card pad" id="pw-out"></div></div>`, (v, root) => {
        const f = num(v.f), d = A.clamp(num(v.d), 0, 100);
        const out = $('#pw-out', root);
        if (!(f > 0)) { out.innerHTML = '<span class="small muted">Fréquence invalide</span>'; return; }
        const bits = Math.min(20, Math.floor(Math.log2(80e6 / f)));
        if (bits < 1) { out.innerHTML = `<div class="banner warn">${icon('alert')}<div>Fréquence trop élevée (max 40 MHz à 1 bit).</div></div>`; return; }
        const use = Math.min(bits, 14), max = Math.pow(2, use) - 1, duty = Math.round(max * d / 100);
        const period = 1e6 / f;
        out.innerHTML = `<dl class="dl"><dt>Résolution maximale</dt><dd><b>${bits} bits</b> (${fmtNum(Math.pow(2, bits), 0)} pas)</dd><dt>Résolution conseillée</dt><dd>${use} bits → valeurs 0 à ${fmtNum(max, 0)}</dd><dt>Période</dt><dd>${period >= 1000 ? fmtNum(period / 1000, 2) + ' ms' : fmtNum(period, 2) + ' µs'}</dd><dt>Impulsion haute</dt><dd>${fmtNum(period * d / 100, 2)} µs</dd></dl>
          <svg viewBox="0 0 300 70" style="width:100%;margin:14px 0;color:var(--accent)"><path fill="none" stroke="currentColor" stroke-width="2" d="${[0, 1, 2].map((k) => { const x = 10 + k * 95, w = 95 * d / 100; return `M${x} 60V10H${x + w}V60H${x + 95}`; }).join('')}"/></svg>
          <div class="code"><pre style="padding:12px">ledcAttach(PIN, ${fmtNum(f, 0).replace(/\s/g, '')}, ${use});\nledcWrite(PIN, ${duty});  // ${fmtNum(d, 1)} %</pre></div>
          ${f === 50 ? '<p class="hint" style="margin-top:8px">Servo : 1 ms (0°) à 2 ms (180°) sur 20 ms → en 14 bits, ≈ 819 à 1638.</p>' : ''}`;
      });
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { const i = $('[data-k="f"]', el); i.value = b.dataset.f; i.dispatchEvent(new Event('input', { bubbles: true })); } });
    },

    adc(el) {
      form(el, `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>Convertisseur analogique (ADC 12 bits)</h2>
        <div class="form-grid"><div class="field"><label>Valeur brute (0-4095)</label><input class="input" data-k="raw" value="2048"></div><div class="field"><label>Atténuation</label><select class="select" data-k="att"><option value="3.1">11 dB (0-3,1 V) — défaut</option><option value="1.75">6 dB (0-1,75 V)</option><option value="1.25">2,5 dB (0-1,25 V)</option><option value="0.95">0 dB (0-0,95 V)</option></select></div>
        <div class="field"><label>Rapport du pont diviseur</label><input class="input" data-k="k" value="1"></div><div class="field"><label>Tension de référence capteur (V)</label><input class="input" data-k="vref" value="3.3"></div></div></div>
        <div class="card pad" id="ad-out"></div></div>`, (v, root) => {
        const raw = A.clamp(num(v.raw), 0, 4095), fs = num(v.att), k = num(v.k) || 1;
        const vpin = raw / 4095 * fs;
        $('#ad-out', root).innerHTML = `<div class="small muted">Tension sur la broche (approx.)</div><div class="calc-out">${fmtNum(vpin, 3)} V</div><div class="small muted" style="margin-top:10px">Tension mesurée (× ${fmtNum(k, 3)})</div><div class="calc-out" style="color:var(--ok)">${fmtNum(vpin * k, 3)} V</div>
          <dl class="dl" style="margin-top:12px"><dt>Pourcentage</dt><dd>${fmtNum(raw / 4095 * 100, 1)} %</dd><dt>Résolution</dt><dd>${fmtNum(fs / 4095 * 1000, 2)} mV / pas</dd><dt>Ratio capteur</dt><dd>${fmtNum(vpin / num(v.vref) * 100, 1)} % de ${esc(v.vref)} V</dd></dl>
          <p class="hint" style="margin-top:10px">Préférez <code>analogReadMilliVolts(pin)</code> : il applique la calibration d'usine (eFuse) et corrige la non-linéarité. Moyennez 8 à 16 lectures pour réduire le bruit.</p>`;
      });
    },

    tz(el) {
      el.innerHTML = `<div class="card"><div class="card-h"><div class="grow"><h2>Fuseaux horaires POSIX</h2><div class="card-sub">À utiliser avec <code>configTzTime(tz, "pool.ntp.org")</code> ou dans les réglages du MASTER. Heure d'été incluse.</div></div></div>
        <div class="card-b flush" style="margin-top:8px"><div class="table-wrap"><table class="tbl responsive"><thead><tr><th>Zone</th><th>Chaîne TZ</th><th></th></tr></thead><tbody>${TZ.map(([n, t]) => `<tr><td class="wide"><b>${esc(n)}</b></td><td data-l="TZ" class="mono small">${esc(t)}</td><td><button class="btn sm" data-act="copy" data-text="${esc(t)}">${icon('copy')}Copier</button></td></tr>`).join('')}</tbody></table></div></div></div>`;
    },

    num(el) {
      form(el, `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>Convertisseur de bases</h2><p class="small muted">Registres, masques, adresses : saisissez un nombre en décimal, 0x… (hexa) ou 0b… (binaire).</p>
        <div class="field"><label>Valeur</label><input class="input mono" data-k="v" value="0x3C"></div></div><div class="card pad" id="nm-out"></div></div>`, (v, root) => {
        const s = String(v.v).trim().toLowerCase().replace(/_/g, '');
        let n = NaN;
        if (/^0x[0-9a-f]+$/.test(s)) n = parseInt(s.slice(2), 16);
        else if (/^0b[01]+$/.test(s)) n = parseInt(s.slice(2), 2);
        else if (/^-?\d+$/.test(s)) n = parseInt(s, 10);
        const out = $('#nm-out', root);
        if (!isFinite(n) || n < 0 || n > 0xffffffff) { out.innerHTML = '<span class="small muted">Nombre non reconnu (0 à 4 294 967 295).</span>'; return; }
        const bin = n.toString(2).padStart(Math.max(8, Math.ceil(n.toString(2).length / 8) * 8), '0');
        out.innerHTML = `<dl class="dl"><dt>Décimal</dt><dd class="mono">${n}</dd><dt>Hexadécimal</dt><dd class="mono">0x${n.toString(16).toUpperCase().padStart(2, '0')}</dd><dt>Binaire</dt><dd class="mono">0b${bin.replace(/(.{4})(?=.)/g, '$1 ')}</dd><dt>Octal</dt><dd class="mono">0${n.toString(8)}</dd>${n < 128 ? `<dt>Adresse I2C 8 bits</dt><dd class="mono">écriture 0x${(n << 1).toString(16).toUpperCase()} · lecture 0x${((n << 1) | 1).toString(16).toUpperCase()}</dd>` : ''}${n >= 32 && n < 127 ? `<dt>Caractère ASCII</dt><dd class="mono">'${esc(String.fromCharCode(n))}'</dd>` : ''}</dl>
          <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-top:14px">${bin.slice(-8).split('').map((b, i) => `<div style="text-align:center"><div class="tiny muted">b${7 - i}</div><div style="padding:6px 0;border-radius:6px;background:${b === '1' ? 'var(--accent)' : 'var(--surface-3)'};color:${b === '1' ? '#fff' : 'var(--text-3)'};font-family:var(--mono)">${b}</div></div>`).join('')}</div>`;
      });
    }
  };
  A.commands.push({ title: 'Brochage de l\'ESP32', group: 'Outil', icon: 'pin', run: () => A.go('tools', { t: 'pins' }) }, { title: 'Adresses I2C', group: 'Outil', icon: 'search', run: () => A.go('tools', { t: 'i2c' }) }, { title: 'Autonomie sur batterie', group: 'Outil', icon: 'battery', run: () => A.go('tools', { t: 'power' }) }, { title: 'Résistance de LED', group: 'Outil', icon: 'zap', run: () => A.go('tools', { t: 'led' }) }, { title: 'Code couleur des résistances', group: 'Outil', icon: 'resistor', run: () => A.go('tools', { t: 'color' }) });
})();
