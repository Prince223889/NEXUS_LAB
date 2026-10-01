/* ESP32 LAB — Banc fantôme : plan de test matériel d'un projet généré.
 * Un worker « émulateur » se fait passer pour les capteurs du projet (DAC, GPIO, esclave I2C) et observe
 * ses actionneurs ; un worker « DUT » exécute le projet. Ce fichier produit, à partir de la même spécification
 * que LAB.generate(), le câblage du banc et le scénario avec les résultats attendus (l'oracle).
 * Le worker émulateur ne connaît aucun capteur : toutes les valeurs sont converties ici en brut
 * (millivolts, niveau logique, octets de registre I2C). Utilisé par le navigateur et par build.js. */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});

  /* Connecteur de banc du worker émulateur (ESP32 DevKit) : identique à BENCH_* dans firmware/worker/config.h. */
  LAB.BENCH = {
    dac: [25, 26],
    dout: [16, 17, 4],
    din: [18, 19, 23],
    sda: 21,
    scl: 22,
    mvMin: 150,    // plage exploitable DAC → ADC (non-linéarités aux extrémités)
    mvMax: 3000,
    mvTol: 80,     // erreur cumulée DAC + ADC tolérée (mV)
    dutyTol: 5     // points de rapport cyclique
  };

  const round = (v, d) => { const k = Math.pow(10, d == null ? 3 : d); return Math.round(v * k) / k; };

  /* ---------------- Conversion grandeur physique → brut ---------------- */
  function analogLine(emu, params) {
    const pt = (p) => [Number(p[0]), Number(typeof p[1] === 'string' ? params[p[1]] : p[1])];
    const [a, b] = emu.mv.map(pt);
    const slope = (b[1] - a[1]) / (b[0] - a[0]);          // mV par unité
    const toMv = (v) => a[1] + (v - a[0]) * slope;
    const fromMv = (mv) => a[0] + (mv - a[1]) / slope;
    const lo = fromMv(LAB.BENCH.mvMin), hi = fromMv(LAB.BENCH.mvMax);
    return { toMv, fromMv, min: Math.min(lo, hi), max: Math.max(lo, hi), tol: Math.abs(LAB.BENCH.mvTol / slope) };
  }

  function i2cRaw(emu, v) {
    let raw = Math.round(v / emu.lsb);
    raw = (raw << (emu.shift || 0)) & 0xffff;
    return raw.toString(16).padStart(4, '0');
  }

  function i2cRange(emu) {
    const bits = 16 - (emu.shift || 0);
    const signed = !!emu.shift;                             // registres de température signés, BH1750 non signé
    const maxRaw = signed ? Math.pow(2, bits - 1) - 1 : Math.pow(2, bits) - 1;
    const minRaw = signed ? -Math.pow(2, bits - 1) : 0;
    return { min: minRaw * emu.lsb, max: maxRaw * emu.lsb, tol: Math.abs(emu.lsb) * 1.5 };
  }

  /* ---------------- Modèle des automatismes (même sémantique que lab_rules()) ---------------- */
  function cmp(x, op, v) {
    switch (op) {
      case '>': return x > v;
      case '<': return x < v;
      case '>=': return x >= v;
      case '<=': return x <= v;
      case '==': return x === v;
      case '!=': return x !== v;
      default: return x > v;
    }
  }

  function ruleModel(rules) {
    const st = rules.map(() => -1);
    const last = rules.map(() => NaN);
    return function tick(values, act) {
      rules.forEach((r, k) => {
        if (r.if.every != null) return;   // minuterie : non vérifiable par le banc
        const x = values[r.if.m];
        if (x === undefined || isNaN(x)) return;
        if (r.if.op === 'map') {
          const [a, b] = r.if.in.map(Number), [c, d] = r.then.out.map(Number);
          const y = c + (Math.min(Math.max(x, Math.min(a, b)), Math.max(a, b)) - a) * (d - c) / ((b - a) || 1);
          if (isNaN(last[k]) || Math.abs(y - last[k]) >= (Math.abs(d - c) / 200 || 0.01)) { last[k] = y; act(r.then.m, 'set', y); }
          return;
        }
        const v = Number(r.if.v), h = Number(r.if.hyst || 0), op = r.if.op;
        const doThen = () => act(r.then.m, r.then.act, r.then.v);
        const doElse = () => { if (r.else) act(r.else.m !== undefined ? r.else.m : r.then.m, r.else.act, r.else.v); };
        if (h > 0 && (op[0] === '>' || op[0] === '<')) {
          const lo = op[0] === '>' ? v - h : v + h;
          const back = op[0] === '>' ? x < lo : x > lo;
          if (st[k] !== 1 && cmp(x, op, v)) { st[k] = 1; doThen(); }
          else if (st[k] !== 0 && back) { st[k] = 0; doElse(); }
        } else {
          const s = cmp(x, op, v) ? 1 : 0;
          if (s !== st[k]) { st[k] = s; if (s) doThen(); else doElse(); }
        }
      });
    };
  }

  /* ---------------- Plan de banc ---------------- */
  LAB.benchPlan = function (spec) {
    const B = LAB.BENCH;
    const reasons = [];
    const skipped = [];
    const specBench = Object.assign({}, spec, { options: Object.assign({}, spec.options || {}, { master: true, home: true }) });
    const gen = LAB.generate(specBench);
    const inst = gen.instances;
    const mods = (spec.modules || []).map((m) => LAB.module(typeof m === 'string' ? m : m.id));
    const rulesIn = (spec.rules || []).filter(Boolean);
    const board = LAB.BOARDS[gen.board] || LAB.BOARDS.esp32;

    const channels = [];
    const byInst = {};
    const pools = { dac: B.dac.slice(), dout: B.dout.slice(), din: B.din.slice() };
    let i2cUsed = false;
    const dutPin = (i, role) => {
      const g = gen.pins[i + ':' + role];
      return g === undefined ? -1 : g;
    };

    // Seuls les actionneurs pilotés par une règle sont observés (les autres exécutent leur démo).
    const ruledDst = new Set();
    rulesIn.forEach((r) => { if (r.then) ruledDst.add(r.then.m); if (r.else && r.else.m !== undefined) ruledDst.add(r.else.m); });

    mods.forEach((mod, i) => {
      if (!mod) return;
      const x = inst[i];
      if (mod.emu) {
        const e = mod.emu;
        const ch = { n: channels.length, inst: i, module: mod.name, label: x.label, dir: 'in', kind: e.kind, out: e.out, period: x.period };
        if (e.kind === 'analog') {
          if (!pools.dac.length) { skipped.push(`${mod.name} : plus de sortie DAC libre sur l'émulateur.`); return; }
          ch.emuPin = pools.dac.shift();
          ch.dutGpio = dutPin(i, e.pin);
          ch.line = analogLine(e, x.params);
          ch.min = ch.line.min; ch.max = ch.line.max; ch.tol = ch.line.tol;
        } else if (e.kind === 'digital') {
          if (!pools.dout.length) { skipped.push(`${mod.name} : plus de sortie numérique libre sur l'émulateur.`); return; }
          ch.emuPin = pools.dout.shift();
          ch.dutGpio = dutPin(i, e.pin);
          ch.active = e.active === 0 ? 0 : 1;
          ch.min = 0; ch.max = 1; ch.tol = 0.01; ch.binary = true;
        } else if (e.kind === 'i2c') {
          if (i2cUsed) { skipped.push(`${mod.name} : l'émulateur ne peut imiter qu'un seul composant I2C à la fois.`); return; }
          i2cUsed = true;
          const addr = String(x.params.addr || (mod.addr && mod.addr[0]) || '0x00');
          ch.addr = parseInt(addr, 16);
          ch.pointer = e.pointer !== false;
          ch.emuPin = B.sda; ch.dutGpio = board.i2c.sda;
          ch.i2c = e;
          const r = i2cRange(e);
          ch.min = r.min; ch.max = r.max; ch.tol = r.tol;
        } else {
          skipped.push(`${mod.name} : type d'émulation « ${e.kind} » inconnu.`);
          return;
        }
        if (ch.dutGpio < 0) { skipped.push(`${mod.name} : broche ${e.pin} non attribuée par le générateur.`); return; }
        ch.feed = `${x.label}_${LAB.sanitize(e.out)}`.slice(0, 23);   // le MASTER tronque les clés à 23 caractères
        channels.push(ch);
        byInst[i] = ch;
      } else if (mod.obs && ruledDst.has(i)) {
        const o = mod.obs;
        if (!pools.din.length) { skipped.push(`${mod.name} : plus d'entrée libre sur l'émulateur.`); return; }
        const ch = { n: channels.length, inst: i, module: mod.name, label: x.label, dir: 'out', kind: o.kind, period: x.period,
          emuPin: pools.din.shift(), dutGpio: dutPin(i, o.pin) };
        if (o.kind === 'level') ch.invert = !!(o.invert && String(x.params[o.invert]) === 'true');
        else ch.curve = o.curve || 'linear';
        if (ch.dutGpio < 0) { skipped.push(`${mod.name} : broche ${o.pin} non attribuée par le générateur.`); return; }
        channels.push(ch);
        byInst[i] = ch;
      } else if (!mod.obs && !mod.emu) {
        skipped.push(`${mod.name} : non émulé (absent pendant le test).`);
      }
    });

    // Règles vérifiables : source émulée sur la bonne mesure, destination(s) observée(s), actions connues.
    const rules = [];
    rulesIn.forEach((r, k) => {
      const src = byInst[r.if && r.if.m], dst = byInst[r.then && r.then.m];
      const tag = `Règle ${k + 1}`;
      if (r.if && r.if.every != null) { reasons.push(`${tag} : minuterie, vérifiée seulement sur le vrai montage.`); return; }
      if (!src || src.dir !== 'in') { reasons.push(`${tag} : capteur source non émulable.`); return; }
      if (src.out !== r.if.out) { reasons.push(`${tag} : la mesure « ${r.if.out} » n'est pas émulée (seulement « ${src.out} »).`); return; }
      if (!dst || dst.dir !== 'out') { reasons.push(`${tag} : actionneur non observable.`); return; }
      if (r.else && r.else.m !== undefined && r.else.m !== r.then.m && !byInst[r.else.m]) { reasons.push(`${tag} : actionneur « sinon » non observable.`); return; }
      const acts = [r.then.act].concat(r.else ? [r.else.act] : []);
      if (acts.some((a) => a === 'toggle')) { reasons.push(`${tag} : l'action « basculer » dépend de l'historique, non vérifiable.`); return; }
      if (r.if.op === 'map' && dst.kind !== 'duty') { reasons.push(`${tag} : commande proportionnelle vers un actionneur tout-ou-rien.`); return; }
      rules.push(r);
    });

    // États logiques → mesures attendues sur l'émulateur
    const expectOf = (ch, s) => {
      if (ch.kind === 'level') return { n: ch.n, level: (s > 0 ? 1 : 0) ^ (ch.invert ? 1 : 0), state: s };
      const pct = Math.max(0, Math.min(100, s));
      const duty = ch.curve === 'square' ? pct * pct / 100 : pct;
      return { n: ch.n, duty: round(duty, 1), tol: B.dutyTol, state: round(s, 2) };
    };
    const actState = {};
    channels.filter((c) => c.dir === 'out').forEach((c) => { actState[c.inst] = 0; });   // $off() dans setup()
    const act = (m, a, v) => {
      if (actState[m] === undefined) return;
      if (a === 'on') actState[m] = 100;
      else if (a === 'off') actState[m] = 0;
      else if (a === 'set') actState[m] = Number(v);
    };
    const model = ruleModel(rules);
    const values = {};
    const rawOf = (ch, v) => {
      if (ch.kind === 'analog') return Math.round(ch.line.toMv(v));
      if (ch.kind === 'digital') return (v ? 1 : 0) === 1 ? ch.active : 1 - ch.active;
      return i2cRaw(ch.i2c, v);
    };

    const sensors = channels.filter((c) => c.dir === 'in');
    // Les actionneurs pilotés par règle réagissent en 200 ms : seule la période des capteurs compte.
    const maxPeriod = Math.max(0, ...sensors.map((c) => c.period || 1000));
    const settleMs = Math.max(1500, 2 * maxPeriod + 700);
    const steps = [];
    const feasible = (ch, v) => v >= ch.min - 1e-9 && v <= ch.max + 1e-9;
    const fmt = (ch, v) => (ch.binary ? String(v) : String(round(v, 2)));

    const pushStep = (label, set, extra) => {
      set.forEach((s) => { if (s.v !== undefined) values[s.inst] = s.v; });
      if (extra && extra.offline !== undefined) values[channels[extra.offline].inst] = NaN;   // le DUT lit NaN
      for (let t = 0; t < 3; t++) model(values, act);
      const expect = [];
      channels.forEach((c) => {
        if (c.dir === 'out') {
          const e = expectOf(c, actState[c.inst] > 0 && c.kind === 'level' ? 1 : actState[c.inst]);
          if (c.kind === 'duty' && extra && extra.dutyTol) e.tol = extra.dutyTol;
          expect.push(e);
        } else if (values[c.inst] !== undefined && !isNaN(values[c.inst])) {
          expect.push({ feed: c.feed, v: round(values[c.inst], 3), tol: round(c.tol, 3) });
        }
      });
      if (extra && extra.offline !== undefined) expect.push({ feed: channels[extra.offline].feed, absent: true });
      steps.push(Object.assign({
        label,
        set: set.map((s) => (s.online !== undefined ? { n: s.ch.n, online: s.online } : { n: s.ch.n, raw: rawOf(s.ch, s.v) })),
        values: set.filter((s) => s.v !== undefined).map((s) => ({ n: s.ch.n, v: round(s.v, 3) })),
        wait: extra && extra.wait ? extra.wait : settleMs,
        expect
      }, extra && extra.note ? { note: extra.note } : {}));
    };

    // Points de test d'une règle (dans l'ordre), ou null si irréalisable avec les plages de l'émulateur
    const rulePoints = (r, ch) => {
      if (r.if.op === 'map') {
        const [a, b] = r.if.in.map(Number);
        const ext = 2 * ch.tol;                              // un peu au-delà des bornes : la saturation absorbe l'erreur de mesure
        const lo = Math.max(Math.min(a, b) - ext, ch.min), hi = Math.min(Math.max(a, b) + ext, ch.max);
        if (hi <= lo) return null;
        const first = a <= b ? lo : hi, last = a <= b ? hi : lo;
        return [[first, 'début de plage'], [(first + last) / 2, 'milieu de plage'], [last, 'fin de plage']];
      }
      const v = Number(r.if.v), h = Number(r.if.hyst || 0), op = r.if.op;
      if (ch.binary) {
        const t = [0, 1].find((x) => cmp(x, op, v)), f = [0, 1].find((x) => !cmp(x, op, v));
        if (t === undefined || f === undefined) return null;
        return [[f, 'condition fausse'], [t, 'condition vraie'], [f, 'retour']];
      }
      const m = Math.max(3 * ch.tol, Math.abs(v) * 0.02, 1e-3);
      if (op === '==' || op === '!=') {
        const other = v + Math.max(m, 1);
        const pts = op === '==' ? [[other, 'différent'], [v, 'égal'], [other, 'retour']] : [[v, 'égal'], [other, 'différent'], [v, 'retour']];
        return pts.every((p) => feasible(ch, p[0])) ? pts : null;
      }
      const up = op[0] === '>';
      const s = up ? 1 : -1;                                 // sens du déclenchement
      const d = Math.max(2 * m, h / 2);
      const pts = [[v - s * (h + d), 'hors seuil']];
      const band = h > 2 * m;
      if (band) pts.push([v - s * h / 2, 'dans l\'hystérésis']);
      pts.push([v + s * d, 'seuil franchi']);
      if (band) pts.push([v - s * h / 2, 'maintien (hystérésis)']);
      pts.push([v - s * (h + d), 'retour']);
      return pts.every((p) => feasible(ch, p[0])) ? pts : null;
    };

    // Valeur de repos des capteurs : premier point de leur première règle, sinon milieu de plage
    const plans = [];
    rules.forEach((r, k) => {
      const ch = byInst[r.if.m];
      const pts = rulePoints(r, ch);
      if (!pts) { reasons.push(`Règle ${rulesIn.indexOf(r) + 1} : seuils hors de la plage reproductible par l'émulateur.`); return; }
      plans.push({ r, k, ch, pts });
    });
    sensors.forEach((ch) => {
      const p = plans.find((x) => x.ch === ch);
      ch.rest = p ? p.pts[0][0] : (ch.binary ? 0 : (ch.min + ch.max) / 2);
    });

    if (sensors.length) {
      pushStep('Initialisation : capteurs au repos', sensors.map((ch) => ({ ch, inst: ch.inst, v: ch.rest })), { wait: settleMs * 2 });
    }
    plans.forEach(({ r, ch, pts }) => {
      const idx = rulesIn.indexOf(r) + 1;
      const src = inst[r.if.m].label;
      pts.forEach(([v, what], j) => {
        if (j === 0 && values[ch.inst] === v) return;       // déjà dans cet état (initialisation)
        let dutyTol;
        if (r.if.op === 'map') {
          // la tolérance de mesure du capteur se propage à la consigne
          const [a, b] = r.if.in.map(Number), [c, d] = r.then.out.map(Number);
          const slope = Math.abs((d - c) / ((b - a) || 1));
          const k2 = byInst[r.then.m].curve === 'square' ? 2 : 1;   // pente max de y²/100 sur 0-100
          dutyTol = round(B.dutyTol + slope * ch.tol * k2, 1);
        }
        pushStep(`Règle ${idx} — ${src} ${r.if.out} = ${fmt(ch, v)} (${what})`, [{ ch, inst: ch.inst, v }], dutyTol ? { dutyTol } : null);
      });
      // retour au repos pour ne pas perturber la règle suivante
      if (values[ch.inst] !== ch.rest) pushStep(`Règle ${idx} — retour au repos`, [{ ch, inst: ch.inst, v: ch.rest }]);
    });
    // Capteurs sans règle : suivi de la mesure sur trois points
    sensors.filter((ch) => !plans.some((p) => p.ch === ch)).forEach((ch) => {
      const pts = ch.binary ? [1, 0] : [ch.min + (ch.max - ch.min) * 0.2, (ch.min + ch.max) / 2, ch.min + (ch.max - ch.min) * 0.8];
      pts.forEach((v) => pushStep(`Mesure ${ch.label}.${ch.out} = ${fmt(ch, v)}`, [{ ch, inst: ch.inst, v }]));
    });
    // Robustesse : composant I2C débranché puis rebranché
    const i2c = sensors.find((c) => c.kind === 'i2c');
    if (i2c) {
      const wait = Math.max(settleMs, 3 * i2c.period + 1000);
      const keep = values[i2c.inst];
      pushStep(`Débranchement de ${i2c.label} (plus d'acquittement I2C)`, [{ ch: i2c, online: 0 }],
        { offline: i2c.n, wait, note: 'La mesure doit s\'interrompre et les actionneurs garder leur état.' });
      pushStep(`Rebranchement de ${i2c.label}`, [{ ch: i2c, online: 1 }, { ch: i2c, inst: i2c.inst, v: keep }], { wait });
    }

    const emulable = steps.length > 1 && (rules.length > 0 || rulesIn.length === 0);
    if (!sensors.length) reasons.push('Aucun capteur émulable dans ce projet.');
    const wiring = [{ dut: 'GND', emu: 'GND', note: 'masse commune obligatoire' }];
    channels.forEach((c) => {
      if (c.kind === 'i2c') {
        wiring.push({ dut: `GPIO${board.i2c.sda} (SDA)`, emu: `GPIO${B.sda} (SDA)`, note: `${c.module} émulé à l'adresse 0x${c.addr.toString(16)} ; tirage 4,7 kΩ vers 3V3` });
        wiring.push({ dut: `GPIO${board.i2c.scl} (SCL)`, emu: `GPIO${B.scl} (SCL)`, note: 'tirage 4,7 kΩ vers 3V3' });
      } else if (c.dir === 'in') {
        wiring.push({ dut: `GPIO${c.dutGpio}`, emu: `GPIO${c.emuPin}`, note: `${c.module} → ${c.kind === 'analog' ? 'sortie DAC' : 'sortie numérique'} de l'émulateur (retirez le capteur réel)` });
      } else {
        wiring.push({ dut: `GPIO${c.dutGpio}`, emu: `GPIO${c.emuPin}`, note: `${c.module} observé par l'émulateur (${c.kind === 'duty' ? 'rapport cyclique' : 'niveau'}) ; débranchez la charge` });
      }
    });

    return {
      v: 1,
      title: gen.title,
      board: gen.board,
      device: gen.device,
      emulable,
      needsDac: channels.some((c) => c.kind === 'analog'),
      reasons,
      skipped,
      warnings: gen.warnings,
      settleMs,
      rules: rules.length,
      channels: channels.map((c) => {
        const o = { n: c.n, dir: c.dir, kind: c.kind, emu: c.emuPin, dut: c.dutGpio, module: c.module, label: c.label, inst: c.inst };
        if (c.kind === 'i2c') { o.addr = c.addr; o.pointer = c.pointer; }
        if (c.dir === 'in') { o.out = c.out; o.feed = c.feed; }
        if (c.kind === 'level' && c.dir === 'out') o.invert = c.invert;
        if (c.kind === 'duty') o.curve = c.curve;
        return o;
      }),
      wiring,
      steps,
      duration_ms: steps.reduce((s, x) => s + x.wait, 0),
      code: gen.code
    };
  };

  /* Version compacte envoyée au MASTER (sans le code ni les textes d'aide). */
  LAB.benchPayload = function (plan, project) {
    return {
      v: plan.v, project: project || plan.title, device: plan.device,
      channels: plan.channels.map((c) => {
        const o = { n: c.n, dir: c.dir, kind: c.kind, emu: c.emu };
        if (c.kind === 'i2c') { o.addr = c.addr; o.pointer = c.pointer; }
        return o;
      }),
      steps: plan.steps.map((s) => ({ label: s.label, set: s.set, wait: s.wait, expect: s.expect.map((e) => { const o = Object.assign({}, e); delete o.state; return o; }) }))
    };
  };

  /* ---------------- Simulation du DUT à partir du code généré ----------------
   * Transpile lab_rules() (C) en JavaScript pour rejouer le scénario sans matériel : sert à l'autotest
   * (l'oracle doit être d'accord avec le code réellement généré) et au mode démonstration. */
  LAB.benchSim = function (plan, spec) {
    const code = plan.code;
    const start = code.indexOf('void lab_rules() {');
    let body = '';
    if (start >= 0) {
      const end = code.indexOf('\n}\n', start);
      body = code.slice(start + 'void lab_rules() {'.length, end);
    }
    const statics = {};
    body = body
      .replace(/^\s*static uint32_t last = 0;\s*$/m, '')
      .replace(/^\s*if \(millis\(\) - last < 200\) return;\s*$/m, '')
      .replace(/^\s*last = millis\(\);\s*$/m, '')
      .replace(/static (?:int8_t|float|uint32_t|int) (\w+) = ([^;]+);/g, (_, n, v) => { statics[n] = v.trim() === 'NAN' ? NaN : Number(v); return ''; })
      .replace(/const (?:float|int8_t|int) /g, 'const ')
      .replace(/(\d+(?:\.\d+)?(?:e[-+]?\d+)?)f\b/g, '$1')
      .replace(/\bisnan\(/g, 'isNaN(')
      .replace(/\bfabsf\(/g, 'Math.abs(');
    // eslint-disable-next-line no-new-func
    const fn = new Function('env', 'with (env) {\n' + body + '\n}');
    const env = Object.assign({ constrain: (v, a, b) => Math.min(Math.max(v, a), b), NAN: NaN, millis: () => Date.now() }, statics);
    const mods = (spec.modules || []).map((m) => LAB.module(typeof m === 'string' ? m : m.id));
    const state = {};
    mods.forEach((mod, i) => {
      const p = 'm' + (i + 1);
      (mod.outs || []).forEach((o) => { env[`${p}_${o.k}`] = NaN; });
      if (mod.act) {
        state[i] = 0;
        env[`${p}_on`] = () => { state[i] = 100; };
        env[`${p}_off`] = () => { state[i] = 0; };
        env[`${p}_set`] = (v) => { state[i] = v; };
        env[`${p}_toggle`] = () => { state[i] = state[i] ? 0 : 100; };
      }
    });
    const chans = plan.channels;
    const online = {};
    return {
      /* Applique les consignes d'une étape (valeurs physiques) puis fait tourner lab_rules(). */
      step(step, opts) {
        (step.values || []).forEach((x) => { env[varOf(chans[x.n])] = x.v; });
        step.set.forEach((s) => { if (s.online !== undefined) online[s.n] = !!s.online; });
        chans.forEach((c) => { if (c.dir === 'in' && online[c.n] === false) env[varOf(c)] = NaN; });
        for (let t = 0; t < 3; t++) fn(env);
        const res = {};
        chans.forEach((c) => {
          if (c.dir === 'out') {
            const s = state[c.inst];
            if (c.kind === 'level') res[c.n] = { level: (s > 0 ? 1 : 0) ^ (c.invert ? 1 : 0) };
            else { const pct = Math.max(0, Math.min(100, s)); res[c.n] = { duty: round(c.curve === 'square' ? pct * pct / 100 : pct, 1) }; }
          } else {
            const v = env[varOf(c)];
            res['feed:' + c.feed] = isNaN(v) ? null : v;
          }
        });
        if (opts && opts.fault) res[opts.fault.n] = opts.fault.value;
        return res;
      }
    };
    function varOf(c) { return `m${c.inst + 1}_${c.out}`; }
  };

  /* Vérifie une étape : `obs` = mesures de l'émulateur { n: {level|duty} } et `feeds` = { clé: valeur|null }. */
  LAB.benchCheck = function (step, obs, feeds) {
    return step.expect.map((e) => {
      let got, ok;
      if (e.feed) {
        got = feeds[e.feed];
        ok = e.absent ? (got === null || got === undefined) : (got !== null && got !== undefined && Math.abs(got - e.v) <= e.tol);
      } else if (e.level !== undefined) {
        got = obs[e.n] ? obs[e.n].level : undefined;
        ok = got === e.level;
      } else {
        got = obs[e.n] ? obs[e.n].duty : undefined;
        ok = got !== undefined && Math.abs(got - e.duty) <= e.tol;
      }
      return { expect: e, got, ok };
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
