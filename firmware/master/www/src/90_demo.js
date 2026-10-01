/* Mode démonstration : simule un MASTER complet (workers, jobs, capteurs, microSD, USB) quand l'API
 * est injoignable — aperçu hors carte, captures d'écran, formation. Aucune requête réseau. */
(function () {
  'use strict';
  const A = window.APP;
  const t0 = Date.now();
  const up = () => Date.now() - t0 + 3 * 3600e3 + 17 * 60e3;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let seq = 0, jobSeq = 0, serialBuf = '', serialTotal = 0;
  const serialAdd = (t) => { serialBuf += t; serialTotal += t.length; if (serialBuf.length > 8000) serialBuf = serialBuf.slice(-6000); };
  const events = [];
  const ev = (lv, src, msg) => { seq++; events.push({ seq, t: up(), epoch: Math.floor(Date.now() / 1000), lv, src, msg }); if (events.length > 96) events.shift(); };

  const workers = [
    { id: 1, label: 'Établi', mac: '24:6F:28:A1:10:01', ip: '192.168.4.11', state: 'READY', version: '6.0.0', job: '-', progress: 0, heap: 214000, heap_min: 188000, rssi: -48, cpu_mhz: 240, cores: 2, flash_size: 4194304, psram_size: 0, hb_count: 1830, last_result: 'SYSTEM_TEST OK : RAM 214 Ko, FS OK, Wi-Fi -48 dBm' },
    { id: 2, label: 'Serre', mac: '24:6F:28:A1:10:02', ip: '192.168.4.12', state: 'READY', version: '6.0.0', job: '-', progress: 0, heap: 198000, heap_min: 171000, rssi: -63, cpu_mhz: 240, cores: 2, flash_size: 4194304, psram_size: 0, hb_count: 1790, last_result: 'I2C_SCAN : 0x3C 0x76' },
    { id: 3, label: 'S3-bureau', mac: '34:85:18:7B:22:03', ip: '192.168.4.13', state: 'READY', version: '6.0.0', job: '-', progress: 0, heap: 318000, heap_min: 290000, rssi: -55, cpu_mhz: 240, cores: 2, flash_size: 16777216, psram_size: 8388608, hb_count: 1702, last_result: 'BENCHMARK : 1 482 000 ops/s' },
    { id: 4, label: '', mac: '24:6F:28:A1:10:04', ip: '192.168.4.14', state: 'PROJECT', version: '6.0.0', job: 'station_meteo', progress: 0, heap: 221000, heap_min: 200000, rssi: -71, cpu_mhz: 160, cores: 2, flash_size: 4194304, psram_size: 0, hb_count: 988, last_result: '' },
    { id: 5, label: 'Garage', mac: '24:6F:28:A1:10:05', ip: '192.168.4.15', state: 'OFFLINE', version: '5.2.0', job: '-', progress: 0, heap: 0, heap_min: 0, rssi: 0, cpu_mhz: 240, cores: 2, flash_size: 4194304, psram_size: 0, hb_count: 412, last_result: 'PING OK 12 ms', offSince: Date.now() - 42 * 60e3 }
  ];
  workers.forEach((w) => { w.uptime_ms = rnd(1, 6) * 3600e3; });
  const jobs = [];
  const feeds = {
    'serre/temp': { source: 'serre', key: 'temp', unit: '°C', v: 23.4, lo: 18, hi: 30, ip: '192.168.4.21' },
    'serre/hum': { source: 'serre', key: 'hum', unit: '%', v: 64, lo: 40, hi: 90, ip: '192.168.4.21' },
    'serre/sol': { source: 'serre', key: 'sol', unit: '%', v: 41, lo: 20, hi: 80, ip: '192.168.4.21' },
    'serre/lux': { source: 'serre', key: 'lux', unit: 'lx', v: 8200, lo: 50, hi: 30000, ip: '192.168.4.21' },
    'atelier/co2': { source: 'atelier', key: 'co2', unit: 'ppm', v: 760, lo: 420, hi: 1800, ip: '192.168.4.22' },
    'atelier/pm25': { source: 'atelier', key: 'pm25', unit: 'µg/m³', v: 9, lo: 1, hi: 60, ip: '192.168.4.22' },
    'atelier/courant': { source: 'atelier', key: 'courant', unit: 'A', v: 1.2, lo: 0, hi: 8, ip: '192.168.4.22' }
  };
  Object.values(feeds).forEach((f) => { f.count = 0; f.at = Date.now(); });
  const master = { temp: 22.8, humidity: 47 };
  let admin = true;

  const TREE = {
    '/sd': ['PROJECTS', 'FIRMWARE', 'REPORTS', 'LOGS', 'DATABASE', 'TESTS', 'CONFIG', 'INBOX'],
    '/sd/PROJECTS': ['LIBRARY', 'MY_PROJECTS', 'IMPORTED'],
    '/sd/PROJECTS/MY_PROJECTS': ['serre_auto', 'station_meteo'],
    '/sd/PROJECTS/MY_PROJECTS/serre_auto': [['serre_auto.ino', 6120], ['README.md', 1830], ['project.json', 612]],
    '/sd/PROJECTS/MY_PROJECTS/station_meteo': [['station_meteo.ino', 7410], ['README.md', 2104]],
    '/sd/PROJECTS/IMPORTED': [],
    '/sd/PROJECTS/LIBRARY': ['bme280', 'dht22', 'ds18b20', 'app_thermostat', 'classic_wifi_scan'],
    '/sd/FIRMWARE': [['worker_esp32.bin', 1043312], ['worker_esp32s3.bin', 1081456], ['blink_uno.hex', 2764], ['AVR', null]],
    '/sd/FIRMWARE/AVR': [['thermometre_nano.hex', 14322]],
    '/sd/REPORTS': [['rapport_2026-09-26_08h.json', 5421], ['rapport_2026-09-26_09h.json', 5398]],
    '/sd/LOGS': [['events.csv', 48211], ['jobs.csv', 12040], ['serre.csv', 18230]],
    '/sd/DATABASE': [['modules.json', 81234]],
    '/sd/TESTS': [], '/sd/CONFIG': [['lab.json', 820]], '/sd/INBOX': []
  };
  ['bme280', 'dht22', 'ds18b20', 'app_thermostat', 'classic_wifi_scan'].forEach((p) => { TREE['/sd/PROJECTS/LIBRARY/' + p] = [[p + '.ino', 4200], ['README.md', 1500], ['project.json', 400], ['MONTAGE.md', 700], ['montage.svg', 6200], ['bin', null]]; TREE['/sd/PROJECTS/LIBRARY/' + p + '/bin'] = ['esp32', 'esp32s3']; ['esp32', 'esp32s3'].forEach((b) => { TREE[`/sd/PROJECTS/LIBRARY/${p}/bin/${b}`] = [[p + '.bin', 912384], [p + '.bootloader.bin', 24992], [p + '.partitions.bin', 3072], ['boot_app0.bin', 8192], ['flash_args', 160]]; }); });
  TREE['/sd/PROJECTS'].push('ARDUINO');
  TREE['/sd/PROJECTS/ARDUINO'] = ['01_LED_Blink', '04_DHT11_Temperature_Humidite', '14_Module_Relais', '24_BME280_Meteo'];
  TREE['/sd/PROJECTS/ARDUINO'].forEach((d) => { TREE['/sd/PROJECTS/ARDUINO/' + d] = [[d + '.ino', 1488], [d + '.hex', 35138], ['MONTAGE.md', 473], ['montage.png', 35309]]; });
  TREE['/sd/FIRMWARE'].push(['worker_esp32_6.1.0.bin', 1229339]);

  /* Programmation USB simulée (aperçu) : mêmes étapes et messages que le MASTER réel. */
  let fl = { busy: false, kind: '', file: '', step: '', progress: 0, ok: null, result: '', chip: '', baud: 0, last: 0, log: [] };
  const flLog = (t) => { fl.last++; fl.log.push({ seq: fl.last, text: t }); if (fl.log.length > 64) fl.log.shift(); };
  function flashStart(b) {
    if (fl.busy) return fail(409, 'une programmation est déjà en cours');
    const esp = b.kind === 'esp';
    fl = { busy: true, kind: b.kind, file: b.path, step: '', progress: 0, ok: null, result: '', chip: '', baud: esp ? 115200 : 9600, last: 0, log: [] };
    const script = esp ? [[1, '» connexion (pont USB-série)', 'Mise en mode téléchargement (essai 1/8)…'], [3, 'Puce détectée : esp32 — firmware compilé pour esp32', 'Vitesse de transfert : 460800 bauds'], [4, '» préparation de la mémoire flash', 'Flash configurée : 4 Mo'],
      [8, 'Écriture de ' + b.path.split('/').pop().replace('.bin', '.bootloader.bin') + ' (24992 octets) à 0x01000', '  MD5 vérifié : 4f1c…'], [12, 'Écriture de boot_app0.bin (8192 octets) à 0x0E000', '» écriture de la mémoire flash'],
      [40, 'Écriture de ' + b.path.split('/').pop() + ' (912384 octets) à 0x10000', null], [70, null, null], [92, '  MD5 vérifié : 9a3e…', '» redémarrage de la carte']]
      : [[2, '» reset de la carte et synchronisation', 'Profil : ' + (b.profile || 'ATmega328P_Optiboot')], [5, '» écriture de la mémoire flash', null], [40, null, null], [70, '» vérification (relecture)', null], [95, null, null]];
    let i = 0;
    flLog((esp ? 'Programmation ESP32 : 4 fichier(s), 948640 octets' : 'Programmation Arduino : ' + b.path));
    const t = setInterval(() => {
      if (i < script.length) { const [p, a, c] = script[i++]; fl.progress = p; if (a) { flLog(a); if (a.startsWith('»')) fl.step = a.slice(2); } if (c) flLog(c); if (esp && p === 3) fl.chip = 'esp32'; return; }
      clearInterval(t);
      fl.busy = false; fl.ok = true; fl.progress = 100; fl.step = 'terminé';
      fl.result = esp ? 'firmware écrit et vérifié (MD5) sur esp32 — moniteur à 115200 bauds' : '35138 octets programmés et vérifiés (signature 1E950F) — moniteur réglé à 9600 bauds';
      flLog('✔ ' + fl.result);
      serialAdd(esp ? '\nets Jun  8 2016 00:22:57\nrst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)\n# ESP32 LAB — ' + b.path.split('/').pop() + '\n' : '\n[24] BME280 pret\nTemperature: 22.8 C  Humidite: 47.1 %  Pression: 1013.2 hPa\n');
      ev('S', 'usb', 'flash ' + b.kind + ' : ' + fl.result);
    }, 700);
    return ok({ ok: true });
  }
  const wlog = [];
  let wlogSeq = 0;
  setInterval(() => { const on = workers.filter((w) => w.state !== 'OFFLINE'); const w = on[Math.floor(Math.random() * on.length)]; if (!w) return; wlogSeq++; wlog.push({ seq: wlogSeq, id: w.id, t: Date.now(), text: ['PONG', 'JOB START SYSTEM_TEST', 'CPU=PASS FLASH=PASS WIFI=PASS FS=PASS HEAP=' + w.heap, 'I2C 0x3C 0x76', 'heartbeat ok rssi=' + w.rssi][wlogSeq % 5] }); if (wlog.length > 160) wlog.shift(); }, 1500);
  const gpioPins = [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39];
  const gpioAdc = [32, 33, 34, 35, 36, 39, 25, 26, 27, 12, 13, 14, 15, 2, 4];
  const gpioState = {};
  const listDir = (path) => {
    const items = TREE[path];
    if (!items) return null;
    return items.map((it) => (typeof it === 'string' ? { name: it, type: 'd', size: 0, mtime: 1790000000 } : it[1] == null ? { name: it[0], type: 'd', size: 0, mtime: 1790000000 } : { name: it[0], type: 'f', size: it[1], mtime: Math.floor(Date.now() / 1000) - Math.floor(rnd(60, 86400 * 6)) }));
  };

  function step() {
    const now = Date.now();
    master.temp = +(22.8 + Math.sin(now / 90000) * 0.8 + rnd(-0.1, 0.1)).toFixed(1);
    master.humidity = +(47 + Math.cos(now / 120000) * 3 + rnd(-0.4, 0.4)).toFixed(1);
    Object.values(feeds).forEach((f) => {
      const span = f.hi - f.lo;
      f.v = Math.min(f.hi, Math.max(f.lo, f.v + rnd(-0.02, 0.02) * span + (f.key === 'co2' ? Math.sin(now / 50000) * 6 : 0)));
      f.count++; f.at = now - rnd(0, 1500);
    });
    workers.forEach((w) => {
      if (w.state === 'OFFLINE') return;
      w.uptime_ms += 2000; w.hb_count++;
      w.heap = Math.round(w.heap + rnd(-1500, 1500)); w.rssi = Math.round(Math.max(-85, Math.min(-40, w.rssi + rnd(-1.5, 1.5))));
    });
    // progression des jobs
    jobs.forEach((j) => {
      if (j.status === 'QUEUED') {
        const w = workers.find((x) => x.state === 'READY' && (!j.target_worker || x.id === j.target_worker));
        if (w) { j.status = 'RUNNING'; j.worker = w.id; j.started_ms = up(); w.state = 'BUSY'; w.job = j.type; w.progress = 0; ev('I', 'jobs', `job #${j.id} ${j.type} → worker ${w.id}`); }
      } else if (j.status === 'RUNNING') {
        const w = workers.find((x) => x.id === j.worker);
        j.progress = Math.min(100, j.progress + Math.round(rnd(12, 35)));
        if (w) w.progress = j.progress;
        if (j.progress >= 100) {
          const fail = j.type === 'FS_TEST' && Math.random() < 0.3;
          j.status = fail ? 'FAILED' : 'SUCCESS'; j.finished_ms = up();
          j.result = fail ? 'FS_TEST : relecture différente à l\'octet 4096' : RESULTS[j.type](w);
          if (w) { w.state = 'READY'; w.job = '-'; w.progress = 0; w.last_result = j.result; }
          ev(fail ? 'W' : 'S', 'jobs', `job #${j.id} ${j.type} ${fail ? 'échoué' : 'réussi'} (worker ${j.worker})`);
        }
      }
    });
    if (Math.random() < 0.12) ev('I', ['wifi', 'telemetry', 'web', 'workers'][Math.floor(rnd(0, 4))], ['client Wi-Fi connecté', 'mesures serre reçues', 'session WebSocket ouverte', 'battement worker 3'][Math.floor(rnd(0, 4))]);
    // moniteur série simulé
    if (Math.random() < 0.8) serialAdd(`T=${(21 + rnd(0, 2)).toFixed(2)} C  H=${(45 + rnd(0, 4)).toFixed(1)} %  lux=${Math.round(rnd(300, 330))}\n`);
  }
  const RESULTS = {
    PING: () => `PING OK ${Math.round(rnd(4, 18))} ms`,
    SYSTEM_TEST: (w) => `SYSTEM_TEST OK : RAM ${Math.round((w ? w.heap : 200000) / 1024)} Ko, FS OK, Wi-Fi ${w ? w.rssi : -60} dBm`,
    BENCHMARK: (w) => `BENCHMARK : ${Math.round((w && w.cpu_mhz === 160 ? 980 : 1450) * rnd(0.97, 1.03))} 000 ops/s`,
    FS_TEST: () => 'FS_TEST OK : 8192 octets écrits et relus',
    MEM_TEST: () => 'MEM_TEST OK : 96 Ko testés, 0 erreur',
    I2C_SCAN: () => ['I2C_SCAN : 0x3C 0x76', 'I2C_SCAN : aucun périphérique', 'I2C_SCAN : 0x23 0x68'][Math.floor(rnd(0, 3))],
    WIFI_SCAN: () => `WIFI_SCAN : ${Math.round(rnd(4, 12))} réseaux`,
    IDENTIFY: () => 'IDENTIFY : LED clignotée 5 s',
    CHECKUP: () => 'SYSTEM_TEST OK'
  };

  function state() {
    const q = jobs.filter((j) => j.status === 'QUEUED').length, r = jobs.filter((j) => j.status === 'RUNNING').length;
    return {
      master: {
        version: '6.0.0', hostname: 'esp32-lab', ap_ssid: 'ESP32-LAB', ap_ip: '192.168.4.1', sta_ip: '192.168.1.42', internet: true, sta_rssi: -58, ap_clients: 6, time_synced: true,
        epoch: Math.floor(Date.now() / 1000), sd: true, usb_avr: true, led: 'ok', heap: Math.round(8120000 + rnd(-20000, 20000)), heap_min: 7950000, heap_internal: Math.round(186000 + Math.sin(Date.now() / 36000) * 5200 + rnd(-900, 900)),
        psram: 7930000, psram_total: 8388608, cpu_mhz: 240, uptime_ms: up(), temp: master.temp, humidity: master.humidity
      },
      jobs: { queued: q, running: r, success: jobs.filter((j) => j.status === 'SUCCESS').length + 41, failed: jobs.filter((j) => j.status === 'FAILED').length + 2 },
      worker_capacity: 10,
      workers: workers.map((w) => Object.assign(clone(w), { age_ms: w.state === 'OFFLINE' ? Date.now() - w.offSince : Math.round(rnd(100, 1900)) })),
      feeds: Object.values(feeds).map((f) => ({ source: f.source, key: f.key, value: +f.v.toFixed(f.v < 10 ? 2 : 1), unit: f.unit, ip: f.ip, age_ms: Date.now() - f.at, count: f.count })),
      event_seq: seq,
      events: [],
      netmon: nmState()
    };
  }
  const ok = (x) => Promise.resolve(x);
  const fail = (status, msg) => { const e = new Error(msg); e.status = status; return Promise.reject(e); };
  const body = (opts) => {
    if (!opts.body) return {};
    if (typeof opts.body === 'string') { try { return JSON.parse(opts.body); } catch (e) { const o = {}; new URLSearchParams(opts.body).forEach((v, k) => { o[k] = v; }); return o; } }
    return {};
  };
  function newJob(type, target, pr) {
    const id = ++jobSeq;
    jobs.push({ id, type, priority: Number(pr) || 50, worker: 0, target_worker: Number(target) || 0, retries: 0, status: 'QUEUED', progress: 0, result: '', created_ms: up(), started_ms: 0, finished_ms: 0 });
    if (jobs.length > 32) jobs.splice(0, jobs.length - 32);
    return id;
  }

  /* Banc fantôme simulé : le plan est rejoué sur une simulation du code généré (LAB.benchSim). */
  let bench = { running: false };
  function benchStart(b) {
    const ctx = Demo.benchContext;
    if (!ctx || !window.LAB.benchSim) return fail(400, 'plan de banc absent');
    if (bench.running) return fail(409, 'un banc est déjà en cours');
    const dut = workers.find((w) => w.id === Number(b.dut)), emu = workers.find((w) => w.id === Number(b.emu));
    if (!dut || !emu || dut === emu || dut.state !== 'READY' || emu.state !== 'READY') return fail(409, 'choisissez deux workers prêts');
    const plan = ctx.plan, sim = window.LAB.benchSim(plan, ctx.spec);
    const faultCh = ctx.fault ? plan.channels.find((c) => c.dir === 'out') : null;
    const fault = faultCh ? { fault: { n: faultCh.n, value: faultCh.kind === 'level' ? { level: 0 } : { duty: 0 } } } : null;
    const project = (b.plan && b.plan.project) || plan.title;
    bench = { running: true, project, bin: b.bin, dut: dut.id, emu: emu.id, steps: plan.steps.length, step: -1, passed: 0, failed: 0, phase: 'chargement du DUT', results: [], t0: Date.now() };
    emu.state = 'EMULATING'; emu.job = 'BENCH';
    dut.state = 'FLASHING'; dut.job = 'PROJET';
    ev('I', 'bench', `banc fantôme « ${project} » : DUT W${dut.id}, émulateur W${emu.id}`);
    let i = -1;
    const finish = (err) => {
      bench.running = false;
      bench.phase = 'terminé';
      bench.error = err || '';
      bench.verdict = err ? (bench.stop ? 'arrêté' : 'erreur') : bench.failed ? 'échec' : 'réussi';
      bench.report = `/sd/REPORTS/BENCH/${String(project).toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_demo.json`;
      bench.duration_ms = Date.now() - bench.t0;
      emu.state = 'READY'; emu.job = '-';
      dut.state = 'READY'; dut.job = '-';
      ev(bench.verdict === 'réussi' ? 'S' : 'W', 'bench', `Banc fantôme « ${project} » : ${bench.verdict} (${bench.passed} étape(s) réussie(s), ${bench.failed} en échec)`);
    };
    const tick = () => {
      if (!bench.running) return;
      if (i < 0) { dut.state = 'PROJECT'; dut.job = project; bench.phase = 'scénario'; }
      i++;
      if (bench.stop) { finish('arrêt demandé'); return; }
      if (i >= plan.steps.length) { finish(); return; }
      const s = plan.steps[i];
      const res = sim.step(s, fault);
      const obs = {}, feeds = {};
      Object.keys(res).forEach((k) => { if (k.startsWith('feed:')) feeds[k.slice(5)] = res[k]; else obs[k] = res[k]; });
      const checks = window.LAB.benchCheck(s, obs, feeds).map((c) => {
        const e = c.expect;
        if (e.feed) return { feed: e.feed, want: e.absent ? 'absente' : e.v, tol: e.tol, got: c.got, ok: c.ok, age_ms: 800 };
        return { n: e.n, what: e.level !== undefined ? 'niveau' : 'rapport cyclique', want: e.level !== undefined ? e.level : e.duty, tol: e.tol, got: c.got, ok: c.ok };
      });
      const okStep = checks.every((c) => c.ok);
      bench.results.push({ i, label: s.label, ok: okStep, checks });
      if (okStep) bench.passed++; else bench.failed++;
      bench.step = i;
      bench.label = s.label;
      setTimeout(tick, 900);
    };
    setTimeout(tick, 1500);
    return ok({ ok: true });
  }

  /* Wireshark du Labo simulé : anneau de trames synthétiques + métriques par worker. */
  let nm = { armed: false, seq: 0, frames: [], metric: {} };
  function nmPush(dir, proto, worker, ip, len, summary) {
    if (!nm.armed) return;
    nm.seq++;
    nm.frames.push({ seq: nm.seq, ts: Date.now(), dir, proto, worker, ip, len, summary });
    if (nm.frames.length > 128) nm.frames.shift();
  }
  function nmStep() {
    if (!nm.armed) return;
    const on = workers.filter((w) => w.state !== 'OFFLINE');
    on.forEach((w) => {
      const jitter = w.rssi < -70 ? 40 + Math.random() * 220 : Math.random() * 40;
      const m = (nm.metric[w.id] = nm.metric[w.id] || { rx: 0, loss: 0, jitter_ms: 0 });
      m.rx++; m.jitter_ms = m.jitter_ms * 0.8 + jitter * 0.2;
      if (w.rssi < -74 && Math.random() < 0.15) { m.loss++; return; }   // battement « perdu »
      nmPush('rx', 'HB', w.id, w.ip, 60, `état ${w.state} prog ${w.progress || 0} RAM ${Math.round(w.heap / 1024)}k`);
    });
    Object.values(feeds).forEach((f) => { if (Math.random() < 0.4) nmPush('rx', 'LAB', 0, f.ip, 24, `${f.source} ${f.key}=${f.v.toFixed(2)}${f.unit}`); });
    if (Math.random() < 0.1) { const w = on[Math.floor(Math.random() * on.length)]; if (w) nmPush('tx', 'HTTP', w.id, w.ip, 0, 'POST /api/job'); }
    if (Math.random() < 0.05) nmPush('tx', 'DISCOVER', 0, '192.168.4.255', 24, 'DISCOVER|ESP32-LAB|6.0.0');
  }
  setInterval(nmStep, 1000);
  function nmState() {
    let worst = 0; Object.values(nm.metric).forEach((m) => { if (m.jitter_ms > worst) worst = m.jitter_ms; });
    return { armed: nm.armed, total: nm.seq, worst_jitter: Math.round(worst) };
  }

  const Demo = {
    start() {
      ev('S', 'system', 'ESP32 LAB 6.0.0 démarré (démonstration)');
      ev('I', 'wifi', 'point d\'accès ESP32-LAB actif, canal 6');
      ev('I', 'storage', 'microSD 29,7 Go montée (FAT32)');
      ev('S', 'workers', 'worker 1 « Établi » en ligne');
      ev('S', 'workers', 'worker 2 « Serre » en ligne');
      ev('S', 'workers', 'worker 3 « S3-bureau » en ligne');
      ev('W', 'workers', 'worker 5 « Garage » hors ligne');
      ev('I', 'usb', 'carte CH340 détectée (1A86:7523)');
      ['SYSTEM_TEST', 'BENCHMARK', 'I2C_SCAN'].forEach((t, i) => newJob(t, i + 1));
      for (let i = 0; i < 40; i++) step();
      // historique simulé des 10 dernières minutes, pour des courbes parlantes dès l'ouverture
      const H = A.S.hist, now = Date.now();
      for (let i = 150; i > 0; i--) {
        const t = now - i * 4000;
        H.t.push(t); H.heap.push(Math.round(186000 + Math.sin(i / 9) * 5200 + rnd(-900, 900)));
        H.temp.push(+(22.8 + Math.sin(t / 90000) * 0.8).toFixed(1)); H.hum.push(+(47 + Math.cos(t / 120000) * 3).toFixed(1));
        H.workers.push(i > 110 ? 5 : 4); H.rssi.push(-58);
        Object.values(feeds).forEach((f) => { const k = f.source + '/' + f.key, span = f.hi - f.lo; (A.S.feedHist[k] = A.S.feedHist[k] || []).push([t, +(f.v + Math.sin(i / 11 + span) * span * 0.04).toFixed(2), -i]); });
      }
      A.refreshState();
      setInterval(() => { step(); A.refreshState(); }, 2000);
    },
    handle(path, opts) {
      opts = opts || {};
      const method = (opts.method || 'GET').toUpperCase();
      const url = new URL(path, 'http://demo.local');
      const p = url.pathname, q = (k) => url.searchParams.get(k), b = body(opts);
      if (p === '/api/session') return ok({ admin, version: '6.0.0' });
      if (p === '/api/state') { const s = state(); s.events = events.filter((e) => e.seq > (A.S.lastSeq || 0)); return ok(s); }
      if (p === '/api/events') { const since = Number(q('since') || 0); return ok({ last: seq, events: events.filter((e) => e.seq > since) }); }
      if (p === '/api/logout') { admin = false; return ok({ ok: true }); }
      if (p === '/api/selftest') return ok({ ok: true, checks: [['Mémoire vive', true, '187 412 octets libres'], ['Fragmentation', true, 'plus grand bloc 110 592 octets'], ['PSRAM', true, '8192 Ko'], ['microSD', true, 'montée'], ['Internet (STA)', true, '192.168.1.42'], ['Heure (NTP)', true, 'synchronisée'], ['Capteur DHT', true, 'mesure valide'], ['Workers', true, '4 en ligne / 10'], ['Portail captif', true, 'actif'], ['USB hôte', true, 'carte connectée']].map(([name, o, detail]) => ({ name, ok: o, detail })) });
      if (p === '/api/system/info') return ok({ version: '6.0.0', codename: 'NEXUS', idf: 'v6.1', target: 'esp32s3', chip_revision: 2, cores: 2, flash_size: 16777216, psram_total: 8388608, ap_mac: 'DC:DA:0C:21:5E:F1', reset_reason: 'mise sous tension', board_variant: 'YD-ESP32-S3 N16R8', worker_capacity: 10, job_capacity: 32, captive_portal: true, uptime_ms: up(), sd_total: 31902400512, sd_free: 31211069440, ota: { running: 'ota_0', next: 'ota_1', slot_size: 4194304, app_version: '6.0.0', build_date: 'Sep 26 2026', build_time: '10:12:44', idf: 'v6.1', update_available: false, busy: false }, usb: { host: true, connected: true, chip: 'CH340', vid_pid: '1A86:7523', baud: 115200, flashing: false, rx_total: 18234 } });
      if (p === '/api/jobs') return ok(clone(jobs));
      if (p === '/api/job' && method === 'POST') { const id = newJob(String(b.type).toUpperCase(), b.worker, b.priority); return ok({ accepted: true, id, target_worker: Number(b.worker) || 0 }); }
      if (p === '/api/job/cancel') { const j = jobs.find((x) => x.id === Number(b.id)); if (j && (j.status === 'QUEUED' || j.status === 'RUNNING')) { const w = workers.find((x) => x.id === j.worker); if (w) { w.state = 'READY'; w.job = '-'; } j.status = 'CANCELLED'; return ok({ ok: true }); } return ok({ ok: false, error: 'job introuvable ou terminé' }); }
      if (p === '/api/jobs/cancel-all') { let n = 0; jobs.forEach((j) => { if (j.status === 'QUEUED' || j.status === 'RUNNING') { j.status = 'CANCELLED'; n++; } }); workers.forEach((w) => { if (w.state === 'BUSY') { w.state = 'READY'; w.job = '-'; } }); return ok({ ok: true, cancelled: n }); }
      if (p === '/api/jobs/clear') { const before = jobs.length; for (let i = jobs.length - 1; i >= 0; i--) if (!['QUEUED', 'RUNNING'].includes(jobs[i].status)) jobs.splice(i, 1); return ok({ ok: true, cleared: before - jobs.length }); }
      if (p.startsWith('/api/fleet/')) {
        const type = p === '/api/fleet/ping' ? 'PING' : p === '/api/fleet/benchmark' ? 'BENCHMARK' : String(b.type || '').toUpperCase();
        const on = workers.filter((w) => w.state !== 'OFFLINE' && w.state !== 'PROJECT');
        if (p === '/api/fleet/reboot') { on.forEach((w) => { w.uptime_ms = 0; }); ev('W', 'workers', `redémarrage de ${on.length} worker(s)`); return ok({ ok: true, accepted: on.length }); }
        on.forEach((w) => newJob(type, w.id, 60));
        return ok({ ok: true, type, accepted: on.length });
      }
      if (p === '/api/worker/discover') { ev('I', 'workers', 'découverte envoyée (broadcast 192.168.4.255:4211)'); return ok({ ok: true }); }
      if (p === '/api/worker/info') { const w = workers.find((x) => x.id === Number(q('id'))); if (!w || w.state === 'OFFLINE') return fail(503, 'worker injoignable'); return ok({ id: w.id, name: w.label || 'worker', fw: w.version, protocol: 3, chip: w.psram_size ? 'ESP32-S3' : 'ESP32', cores: w.cores, cpu_mhz: w.cpu_mhz, heap: w.heap, heap_min: w.heap_min, flash_size: w.flash_size, psram: w.psram_size, rssi: w.rssi, ip: w.ip, mac: w.mac, uptime_ms: w.uptime_ms, jobs_done: w.hb_count % 97, fs: { total: 1441792, used: 24576 }, i2c: { sda: 21, scl: 22 } }); }
      if (p === '/api/worker/scan') return ok({ state: 'done', networks: [['ESP32-LAB', -38, 6, 'WPA2'], ['Livebox-7A2C', -61, 1, 'WPA2'], ['Freebox-5E1B', -70, 11, 'WPA3'], ['iPhone de Léa', -76, 6, 'WPA2'], ['SFR_5A10', -81, 1, 'WPA2'], ['DIRECT-HP-Imprimante', -84, 11, 'WPA2']].map(([ssid, rssi, channel, auth]) => ({ ssid, rssi: rssi + Math.round(rnd(-3, 3)), channel, auth, bssid: 'AA:BB:CC:' + channel.toString(16).padStart(2, '0') + ':10:2F' })) });
      if (p === '/api/worker/label') { const w = workers.find((x) => x.id === Number(b.id)); if (w) w.label = b.label; return ok({ ok: true }); }
      if (p === '/api/worker/forget') { const i = workers.findIndex((x) => x.id === Number(b.id)); if (i >= 0 && workers[i].state !== 'OFFLINE') return fail(409, 'le worker est en ligne'); if (i >= 0) workers.splice(i, 1); return ok({ ok: true }); }
      if (p === '/api/worker/reboot') { const w = workers.find((x) => x.id === Number(b.id)); if (w) w.uptime_ms = 0; return ok({ ok: true }); }
      if (p === '/api/worker/home') { const w = workers.find((x) => x.id === Number(b.id)); if (w) { w.state = 'READY'; w.job = '-'; } return ok({ ok: true }); }
      if (p === '/api/worker/flash') { if (b.mode === 'project') { const w = workers.find((x) => x.id === Number(b.id)); if (w) { w.state = 'PROJECT'; w.job = String(b.path).split('/').pop().replace(/\.ino\.bin$|\.bin$/i, ''); } } ev('I', 'ota', `worker ${b.id} : mise à jour ${b.path}`); return ok({ ok: true }); }
      if (p === '/api/sd/list') { const path = q('path') || '/sd'; const items = listDir(path); if (!items) return fail(404, 'dossier introuvable'); return ok({ path, admin, items, total: 31902400512, free: 31211069440 }); }
      if (p === '/api/sd/delete' || p === '/api/sd/rename' || p === '/api/sd/mkdir') {
        const dir = String(b.path).replace(/\/[^/]+$/, ''), name = String(b.path).split('/').pop();
        const list = TREE[dir];
        if (list) {
          const idx = list.findIndex((it) => (typeof it === 'string' ? it : it[0]) === name);
          if (p.endsWith('delete') && idx >= 0) list.splice(idx, 1);
          if (p.endsWith('rename') && idx >= 0) { const nn = String(b.to).split('/').pop(); if (typeof list[idx] === 'string') list[idx] = nn; else list[idx][0] = nn; }
          if (p.endsWith('mkdir')) { list.push(name); TREE[b.path] = []; }
        }
        return ok({ ok: true });
      }
      if (p === '/api/usb/serial' && method === 'GET') {
        const since = Number(q('since') || 0), keep = serialTotal - serialBuf.length;
        const data = since <= keep ? serialBuf.slice(-2000) : serialBuf.slice(serialBuf.length - (serialTotal - since));
        return ok({ pos: serialTotal, data, usb: { host: true, connected: true, chip: 'CH340', vid_pid: '1A86:7523', baud: fl.baud || 115200, flashing: fl.busy, rx_total: 18234 + serialTotal } });
      }
      if (p === '/api/usb/serial') { if (b.baud) fl.baud = Number(b.baud); if (b.data) serialAdd('> ' + b.data.replace(/\r?\n$/, '') + '\nOK\n'); return ok({ ok: true }); }
      if (p === '/api/avr/flash') return new Promise((res) => setTimeout(() => res({ ok: true, message: `${String(b.path).split('/').pop()} : 14 322 octets écrits et vérifiés (${b.profile})` }), 1800));
      if (p === '/api/agent/chat') { const qq = String(b.q || '').toLowerCase(); const st = state(); const acts = []; if (/check|benchmark|ping|scan i2c|identifie/.test(qq)) { const t = /benchmark/.test(qq) ? 'BENCHMARK' : /ping/.test(qq) ? 'PING' : /i2c/.test(qq) ? 'I2C_SCAN' : /identifie/.test(qq) ? 'IDENTIFY' : 'SYSTEM_TEST'; workers.filter((w) => w.state === 'READY').forEach((w) => newJob(t, w.id, 60)); acts.push(`${t} lancé sur 4 worker(s)`); } return ok({ answer: `ESP32 LAB 6.0.0 : ${st.workers.filter((w) => w.state !== 'OFFLINE').length}/10 workers en ligne, jobs en file ${st.jobs.queued}, en cours ${st.jobs.running} ; microSD OK ; Internet connecté ; ambiance ${master.temp} °C.`, mode: 'local', actions: acts }); }
      if (p === '/api/admin/config' && method === 'GET') return ok({ ok: true, ap_ssid: 'ESP32-LAB', ap_channel: 6, sta_ssid: 'Livebox-7A2C', hostname: 'esp32-lab', whatsapp_phone: '', webhook_url: '', ai_endpoint: '', ai_model: 'gpt-4o-mini', search_endpoint: '', update_manifest: '', github_repo: 'Prince223889/ESP32-box', ntp_server: 'pool.ntp.org', timezone: 'CET-1CEST,M3.5.0,M10.5.0/3', control_path: '/x-control-3f9a1c2e', board_variant: 'YD-ESP32-S3 N16R8', rgb_gpio: 48, dht_gpio: 4, dht_type: 11, auto_updates: false, captive_portal: true, sta_pass_set: true, whatsapp_configured: false, ai_key_set: false });
      if (p === '/api/admin/config') return ok({ ok: true, restart: false });
      if (p === '/api/update/check') return ok({ available: true, source: 'github', repo: 'Prince223889/ESP32-box', version: '6.2.0', notes: 'Démonstration : nouvelle Release GitHub.\n- Wireshark du Labo\n- Flash ESP32 par câble', assets: 'worker_esp32.bin|https://github.com/Prince223889/ESP32-box/releases/download/v6.2.0/worker_esp32.bin;worker_esp32s3.bin|https://github.com/Prince223889/ESP32-box/releases/download/v6.2.0/worker_esp32s3.bin' });
      if (p === '/api/wifi/scan' && method === 'POST') return ok({ ok: true });
      if (p === '/api/wifi/scan') return Demo.handle('/api/worker/scan?id=1');
      if (p === '/api/report/snapshot') return ok({ ok: true, path: '/sd/REPORTS/rapport_demo.json' });
      if (p === '/api/notify/test') return ok({ ok: false, reason: 'aucun canal configuré' });
      if (p === '/api/system/reboot') return ok({ ok: false, reason: 'désactivé en démonstration' });
      if (p === '/api/system/identify') return ok({ ok: true });
      if (p === '/api/update/approve') return ok({ ok: true, version: '6.2.0' });
      if (p === '/api/projects') return ok([]);
      if (p === '/api/netmon' && method === 'GET') {
        const since = Number(q('since') || 0);
        return ok({ armed: nm.armed, last: nm.seq,
          frames: nm.frames.filter((f) => f.seq > since).map((f) => ({ seq: f.seq, age_ms: Date.now() - f.ts, dir: f.dir, proto: f.proto, worker: f.worker || undefined, ip: f.ip, len: f.len, summary: f.summary })),
          metrics: Object.entries(nm.metric).map(([id, m]) => ({ worker: Number(id), jitter_ms: Math.round(m.jitter_ms), loss: m.loss, rx: m.rx, last_ms: 500 })) });
      }
      if (p === '/api/netmon/arm') { nm.armed = !!b.on; if (!nm.armed) { nm.frames = []; nm.metric = {}; nm.seq = 0; } return ok({ ok: true, armed: nm.armed }); }
      if (p === '/api/usb/flash') return flashStart(b);
      if (p === '/api/usb/flash/status') { const since = Number(q('since') || 0); return ok(Object.assign(clone(fl), { log: fl.log.filter((l) => l.seq > since), usb: { host: true, connected: true, chip: 'CP210x', vid_pid: '10C4:EA60', baud: fl.baud || 115200, flashing: fl.busy, rx_total: 18234 + serialTotal } })); }
      if (p === '/api/worker/log') { const id = Number(q('id') || 0), since = Number(q('since') || 0); return ok({ last: wlogSeq, lines: wlog.filter((l) => l.seq > since && (!id || l.id === id)).map((l) => ({ seq: l.seq, id: l.id, age_ms: Date.now() - l.t, text: l.text })) }); }
      if (p === '/api/worker/gpio' && method === 'GET') {
        if (!q('pin')) return ok({ chip: 'ESP32-D0WD-V3', pins: gpioPins.map((x) => ({ pin: x, adc: gpioAdc.includes(x) })) });
        const pin = Number(q('pin')), st = gpioState[pin] || { level: 0 };
        return ok({ pin, level: st.level, mv: gpioAdc.includes(pin) ? Math.round((st.level ? 3100 : 0) + (st.duty != null ? st.duty * 31 : 0) + rnd(0, 180)) : undefined, pwm: st.duty != null });
      }
      if (p === '/api/worker/gpio') { const pin = Number(b.pin); const st = (gpioState[pin] = gpioState[pin] || { level: 0 }); if (b.mode === 'out') { st.level = Number(b.value) ? 1 : 0; delete st.duty; } else if (b.mode === 'pwm') { st.duty = Number(b.duty); st.level = st.duty > 50 ? 1 : 0; } else if (b.mode === 'in_pullup') { st.level = 1; delete st.duty; } else { st.level = 0; delete st.duty; } wlogSeq++; wlog.push({ seq: wlogSeq, id: Number(b.id), t: Date.now(), text: `GPIO${pin} -> ${b.mode}` }); return ok({ pin, level: st.level, pwm: st.duty != null }); }
      if (p === '/api/bench/run') return benchStart(b);
      if (p === '/api/bench/status') return ok(clone(bench));
      if (p === '/api/bench/stop') { bench.stop = true; return ok({ ok: true }); }
      return fail(404, 'route inconnue (démo) : ' + p);
    },
    upload(url, file, headers, onProgress) {
      return new Promise((res) => {
        let p = 0;
        const t = setInterval(() => {
          p = Math.min(1, p + 0.25);
          if (onProgress) onProgress(p);
          if (p >= 1) {
            clearInterval(t);
            if (url === '/api/sd/upload') { const path = decodeURIComponent(headers['X-Path']); const dir = path.replace(/\/[^/]+$/, ''); (TREE[dir] = TREE[dir] || []).push([path.split('/').pop(), file.size || 0]); }
            res({ ok: true, path: '', sha256: '', message: 'démonstration : fichier non écrit' });
          }
        }, 150);
      });
    },
    fileText(path) {
      const name = path.split('/').pop();
      if (name === 'MONTAGE.md') return '# BME280 Station météo\n\nLit température, humidité et pression d\'un BME280 en I2C.\n\n| Arduino | Composant | Couleur fil |\n|---|---|---|\n| 3.3V | BME280 VCC | red |\n| GND | BME280 GND | black |\n| A4 | BME280 SDA | blue |\n| A5 | BME280 SCL | green |\n\nMoniteur série : 9600 bauds. Toujours câbler **carte débranchée**.';
      if (/\.csv$/i.test(name)) { const L = ['horodatage;temp;hum;sol']; for (let i = 0; i < 200; i++) L.push(`2026-09-26T${String(8 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00;${(21 + Math.sin(i / 20) * 2 + rnd(-0.2, 0.2)).toFixed(2)};${(60 + Math.cos(i / 25) * 6).toFixed(1)};${(45 - i / 12).toFixed(1)}`); return L.join('\n'); }
      if (/\.ino$/i.test(name)) { const id = name.replace(/\.ino$/, ''); const pj = A.projectById && A.projectById(id); if (pj) { try { return A.buildProject(pj, 'esp32').code; } catch (e) { /* repli */ } } return '// ' + name + '\nvoid setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n}\n'; }
      if (/\.json$/i.test(name)) return JSON.stringify({ demo: true, file: name, generated: new Date().toISOString() }, null, 2);
      return '# ' + name + '\n\nFichier de démonstration.\n';
    }
  };
  A.Demo = Demo;
})();
