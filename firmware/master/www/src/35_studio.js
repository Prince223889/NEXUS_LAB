/* Studio : assemblage de modules + automatismes → programme Arduino complet, câblage, brochage, consommation. */
(function () {
  'use strict';
  const A = window.APP, LAB = window.LAB;
  const { $, $$, esc, icon, toast, modal, confirmBox, drawer, store, download, copyText, norm, fmtNum, S } = A;

  const BOARD_LABEL = { esp32: 'ESP32', esp32s3: 'ESP32-S3', esp32c3: 'ESP32-C3' };
  const OPS = [['<', 'est inférieur à'], ['>', 'est supérieur à'], ['<=', '≤'], ['>=', '≥'], ['==', 'est égal à'], ['!=', 'est différent de'], ['map', 'pilote proportionnellement']];
  const blank = () => ({ board: 'esp32', title: 'Mon projet ESP32', description: '', modules: [], rules: [], vars: [], options: { web: false, master: false, mqtt: false } });
  let spec = null;
  let tab = 'code';
  let open = -1;

  const b64e = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64d = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  function saveSpec() { store.set('studio.spec', spec); }
  function loadSpec() { spec = store.get('studio.spec', null) || blank(); spec.rules = spec.rules || []; spec.vars = spec.vars || []; spec.options = spec.options || {}; }
  A.openInStudio = (s, initialTab) => { spec = JSON.parse(JSON.stringify(s)); spec.rules = spec.rules || []; spec.vars = spec.vars || []; spec.options = spec.options || {}; tab = ['code', 'wiring', 'pins', 'power', 'bom', 'app'].includes(initialTab) ? initialTab : 'code'; saveSpec(); open = -1; if (S.route === 'studio') draw(); else A.go('studio'); };

  const modOf = (m) => LAB.module(typeof m === 'string' ? m : m.id);
  const labelOf = (i) => { const m = spec.modules[i], mod = modOf(m); return `${i + 1}. ${m.alias || (mod ? mod.name : m.id)}`; };

  /* ---------- Sélecteur de module ---------- */
  function pickModule() {
    const cats = LAB.CATS || {};
    let c = 'all', q = '';
    const d = drawer('Ajouter un module', `<div class="input-icon" style="margin-bottom:10px">${icon('search')}<input class="input" id="pk-q" placeholder="Nom, grandeur mesurée, bus, adresse…" autocomplete="off"></div>
      <div class="chips scroll" id="pk-c" style="margin-bottom:12px"><button class="chip on" data-c="all">Tous</button>${Object.keys(cats).filter((k) => LAB.MODULES.some((m) => m.cat === k)).map((k) => `<button class="chip" data-c="${k}">${icon(cats[k].icon)}${esc(cats[k].name)}</button>`).join('')}</div>
      <div class="pick-list" id="pk-l" style="max-height:none"></div>`);
    const drawList = () => {
      const w = norm(q).split(/\s+/).filter(Boolean);
      const list = LAB.MODULES.filter((m) => (c === 'all' || m.cat === c) && w.every((x) => norm([m.id, m.name, m.desc, (m.tags || []).join(' '), (m.addr || []).join(' '), m.bus || ''].join(' ')).includes(x)));
      if (w.length) list.sort((a, b) => Number(w.every((x) => norm(b.name + ' ' + b.id).includes(x))) - Number(w.every((x) => norm(a.name + ' ' + a.id).includes(x))));
      $('#pk-l', d.el).innerHTML = list.map((m) => `<div class="pick-item" data-id="${m.id}"><div class="icon-tile ${m.act ? 'violet' : 'accent'}">${icon((cats[m.cat] || {}).icon || 'box')}</div><div class="grow" style="min-width:0"><div style="font-weight:600">${esc(m.name)} ${m.act ? '<span class="badge accent">actionneur</span>' : ''}${m.bus ? ` <span class="badge info">${m.bus.toUpperCase()}</span>` : ''}</div><div class="small muted ellipsis">${esc(m.desc || '')}</div></div>${icon('plus')}</div>`).join('') || '<div class="empty small">Aucun module</div>';
    };
    $('#pk-q', d.el).addEventListener('input', (e) => { q = e.target.value; drawList(); });
    $('#pk-c', d.el).addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; c = b.dataset.c; $$('#pk-c .chip', d.el).forEach((x) => x.classList.toggle('on', x === b)); drawList(); });
    $('#pk-l', d.el).addEventListener('click', (e) => {
      const it = e.target.closest('[data-id]');
      if (!it) return;
      spec.modules.push({ id: it.dataset.id });
      open = spec.modules.length - 1;
      saveSpec();
      toast(LAB.module(it.dataset.id).name + ' ajouté', 'ok', 1600);
      d.close();
      draw();   // redessine le Studio
    });
    drawList();
    setTimeout(() => $('#pk-q', d.el).focus(), 60);
  }

  /* ---------- Variables liées aux capteurs ---------- */
  const varName = (v) => LAB.sanitize(v.name || 'var');
  function varsHtml() {
    const outs = sensorOuts();
    return (spec.vars.length ? spec.vars.map((v, i) => {
      const src = v.from && v.from.m != null ? `${v.from.m}:${v.from.out}` : '';
      return `<div class="rule var-row"><div class="row between"><code class="small">v_${esc(varName(v))}</code><button class="btn sm icon ghost" data-var-del="${i}" aria-label="Supprimer">${icon('trash')}</button></div>
        <div class="rule-line"><span class="rule-kw">Nom</span><input class="input sm" data-v="${i}" data-vf="name" value="${esc(v.name || '')}" placeholder="consigne" maxlength="24"><input class="input sm" data-v="${i}" data-vf="unit" value="${esc(v.unit || '')}" placeholder="unité" style="max-width:80px"></div>
        <div class="rule-line"><span class="rule-kw">Lié à</span><select class="select sm" data-v="${i}" data-vf="src"><option value="">(aucun : valeur réglable)</option>${outs.map((o) => `<option value="${o.m}:${o.k}" ${src === o.m + ':' + o.k ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>
        ${src ? `<div class="rule-line"><span class="rule-kw">Calcul</span><span class="small">mesure ×</span><input class="input sm" type="number" step="any" data-v="${i}" data-vf="k" value="${esc(v.k != null ? v.k : 1)}" style="max-width:90px"><span class="small">+</span><input class="input sm" type="number" step="any" data-v="${i}" data-vf="b" value="${esc(v.b || 0)}" style="max-width:90px"></div>`
          : `<div class="rule-line"><span class="rule-kw">Départ</span><input class="input sm" type="number" step="any" data-v="${i}" data-vf="init" value="${esc(v.init || 0)}" style="max-width:110px"></div>`}
        <label class="switch small"><input type="checkbox" data-v="${i}" data-vf="app" ${v.app ? 'checked' : ''}><span class="track"></span>Réglable depuis l'application (APK / page web)</label>
      </div>`;
    }).join('') : `<div class="small muted">Une variable garde une valeur dans le programme. Liée à un capteur, elle suit sa mesure (avec conversion, ex. × 1,8 + 32 pour des °F). Libre, elle sert de consigne réglable par l'application et de seuil dans les automatismes.</div>`) +
      `<button class="btn sm" data-var-add>${icon('plus')}Ajouter une variable</button>`;
  }
  function addVar() {
    const outs = sensorOuts();
    const used = new Set(spec.vars.map(varName));
    let n = outs.length && !spec.vars.length ? LAB.sanitize(outs[0].k) : 'consigne';
    for (let k = 2; used.has(n); k++) n = (outs.length && !spec.vars.length ? LAB.sanitize(outs[0].k) : 'consigne') + k;
    spec.vars.push(outs.length && !spec.vars.length ? { name: n, from: { m: outs[0].m, out: outs[0].k }, k: 1, b: 0 } : { name: n, init: 0, app: true });
  }
  function setVarField(i, f, v, checked) {
    const x = spec.vars[i];
    if (!x) return;
    if (f === 'name') {
      const old = varName(x);
      x.name = v.trim();
      const now = varName(x);
      spec.rules.forEach((r) => { if (r.if.var && LAB.sanitize(r.if.var) === old) r.if.var = now; if (r.if.vv && LAB.sanitize(r.if.vv) === old) r.if.vv = now; });
    } else if (f === 'src') {
      if (!v) delete x.from;
      else { const [m, k] = v.split(':'); x.from = { m: Number(m), out: k }; x.k = x.k == null ? 1 : x.k; x.b = x.b || 0; }
    } else if (f === 'app') x.app = !!checked;
    else if (f === 'unit') x.unit = v;
    else x[f] = v === '' ? 0 : Number(v);
  }

  /* ---------- Règles ---------- */
  function sensorOuts() {
    const r = [];
    spec.modules.forEach((m, i) => { const mod = modOf(m); (mod && mod.outs || []).forEach((o) => r.push({ m: i, k: o.k, label: `${labelOf(i)} › ${o.l || o.k}${o.u ? ' (' + o.u + ')' : ''}` })); });
    return r;
  }
  const actuators = () => spec.modules.map((m, i) => ({ i, mod: modOf(m) })).filter((x) => x.mod && x.mod.act);
  function actSelect(t, kind, idx) {
    const acts = actuators();
    const mod = t && acts.find((a) => a.i === t.m);
    const actOpts = mod ? Object.keys(mod.mod.act).filter((k) => mod.mod.act[k]) : ['on', 'off'];
    const names = { on: 'allumer / activer', off: 'éteindre / arrêter', toggle: 'inverser', set: 'régler à' };
    return `<select class="select sm" data-r="${idx}" data-f="${kind}.m"><option value="">${kind === 'else' ? '(rien)' : 'actionneur…'}</option>${acts.map((a) => `<option value="${a.i}" ${t && t.m === a.i ? 'selected' : ''}>${esc(labelOf(a.i))}</option>`).join('')}</select>
      ${t && t.m != null && t.m !== '' ? `<select class="select sm" data-r="${idx}" data-f="${kind}.act">${actOpts.map((k) => `<option value="${k}" ${t.act === k ? 'selected' : ''}>${names[k] || k}</option>`).join('')}</select>${t.act === 'set' && mod && mod.mod.act.set ? `<input class="input sm" type="number" step="any" data-r="${idx}" data-f="${kind}.v" value="${esc(t.v != null ? t.v : mod.mod.act.set.max)}" style="max-width:110px" title="${esc(mod.mod.act.set.unit || '')}"><span class="small muted">${esc(mod.mod.act.set.unit || '')}</span>` : ''}` : ''}`;
  }
  function ruleSources() {
    return sensorOuts().map((o) => ({ value: `${o.m}:${o.k}`, label: o.label }))
      .concat(spec.vars.map((v) => ({ value: 'var:' + varName(v), label: `Variable ${varName(v)}${v.unit ? ' (' + v.unit + ')' : ''}` })));
  }
  const ruleSrc = (r) => (r.if.every != null ? 'every' : r.if.var ? 'var:' + LAB.sanitize(r.if.var) : `${r.if.m}:${r.if.out}`);
  /* Ajouts en un clic : ce qui agit (actionneurs) et ce qui déclenche (capteurs). */
  const QUICK_ACT = [['led', 'LED'], ['relay', 'Relais'], ['buzzer_active', 'Buzzer'], ['servo_sg90', 'Servo'], ['pump', 'Pompe'], ['fan_pwm', 'Ventilateur'], ['l298n', 'Moteur CC'], ['rgb_led', 'LED RVB']];
  const QUICK_SENS = [['dht22', 'Température / humidité'], ['button', 'Bouton'], ['ldr', 'Lumière'], ['hcsr04', 'Distance'], ['pir_hcsr501', 'Mouvement'], ['soil_cap', 'Humidité du sol'], ['potentiometer', 'Potentiomètre']];
  const quickChips = (list) => `<div class="chips">${list.filter(([id]) => LAB.module(id)).map(([id, n]) => `<button class="chip" data-quick="${id}">${icon('plus')}${esc(n)}</button>`).join('')}<button class="chip" data-act="st-add">${icon('search')}Autre…</button></div>`;
  const ACT_WORD = { on: 'allumer', off: 'éteindre', toggle: 'inverser', set: 'régler à' };
  function ruleSentence(r) {
    const a = (t) => (t && t.m != null && spec.modules[t.m] ? `${ACT_WORD[t.act] || t.act}${t.act === 'set' && t.v != null ? ' ' + t.v : ''} ${labelOf(t.m).replace(/^\d+\. /, '')}` : '');
    if (r.if.every != null) return `Toutes les ${r.if.every} s : ${a(r.then)}${r.else ? ', puis ' + a(r.else) + ' (en alternance)' : ''}.`;
    const src = (ruleSources().find((o) => o.value === ruleSrc(r)) || {}).label || '?';
    if (r.if.op === 'map') return `${labelOf(r.then.m).replace(/^\d+\. /, '')} suit ${src}.`;
    const op = (OPS.find(([k]) => k === r.if.op) || [0, r.if.op])[1];
    return `Si ${src} ${op} ${r.if.vv ? 'la variable ' + r.if.vv : r.if.v} alors ${a(r.then)}${r.else ? ', sinon ' + a(r.else) : ''}.`;
  }
  function rulesHtml() {
    const outs = ruleSources(), acts = actuators();
    const head = [];
    if (!acts.length) head.push(`<div class="studio-quick"><div class="small"><b>1. Ce qui agit</b> : choisis un actionneur à commander.</div>${quickChips(QUICK_ACT)}</div>`);
    if (!outs.length) head.push(`<div class="studio-quick"><div class="small"><b>${acts.length ? '' : '2. '}Ce qui déclenche</b> : un capteur ou une variable${acts.length ? ' ; sans capteur, « Clignoter / répéter » crée une minuterie' : ''}.</div>${quickChips(QUICK_SENS)}</div>`);
    if (!acts.length) return head.join('') + `<div class="hint">Exemples : « si la température &gt; 28 °C alors allumer le ventilateur, sinon l'éteindre », « toutes les 1 s, inverser la LED ».</div>`;
    const srcOpts = (r) => `<option value="every" ${ruleSrc(r) === 'every' ? 'selected' : ''}>Minuterie (toutes les N secondes)</option>${outs.map((o) => `<option value="${esc(o.value)}" ${ruleSrc(r) === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}`;
    return head.join('') + spec.rules.map((r, idx) => {
      const isMap = r.if.op === 'map', isEvery = r.if.every != null;
      const dst = acts.find((a) => a.i === r.then.m);
      return `<div class="rule"><div class="row between"><b class="small">Règle ${idx + 1}</b><button class="btn sm icon ghost" data-rule-del="${idx}" aria-label="Supprimer">${icon('trash')}</button></div>
        <div class="rule-sum small">${esc(ruleSentence(r))}</div>
        <div class="rule-line"><span class="rule-kw">${isEvery ? 'Quand' : 'Si'}</span><select class="select sm" data-r="${idx}" data-f="src">${srcOpts(r)}</select></div>
        ${isEvery ? `<div class="rule-line"><span class="rule-kw"></span><span class="small">toutes les</span><input class="input sm" type="number" step="0.1" min="0.2" data-r="${idx}" data-f="every" value="${esc(r.if.every)}" style="max-width:90px"><span class="small">s</span></div>
          <div class="rule-line"><span class="rule-kw">Faire</span>${actSelect(r.then, 'then', idx)}</div><div class="rule-line"><span class="rule-kw">Puis</span>${actSelect(r.else, 'else', idx)}</div>
          <div class="hint">Avec « Puis », les deux actions alternent (ex. allumer / éteindre = clignoter).</div>`
        : `<div class="rule-line"><span class="rule-kw"></span><select class="select sm" data-r="${idx}" data-f="op">${OPS.filter(([k]) => k !== 'map' || acts.some((a) => a.mod.act.set)).map(([k, n]) => `<option value="${k}" ${r.if.op === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
          ${isMap ? `<input class="input sm" type="number" step="any" data-r="${idx}" data-f="in0" value="${esc((r.if.in || [0, 100])[0])}" title="début de plage"><span class="small">→</span><input class="input sm" type="number" step="any" data-r="${idx}" data-f="in1" value="${esc((r.if.in || [0, 100])[1])}" title="fin de plage">`
            : `${spec.vars.length ? `<select class="select sm" data-r="${idx}" data-f="vv" title="seuil fixe ou variable" style="max-width:150px"><option value="">valeur</option>${spec.vars.map((v) => `<option value="${esc(varName(v))}" ${r.if.vv && LAB.sanitize(r.if.vv) === varName(v) ? 'selected' : ''}>variable ${esc(varName(v))}</option>`).join('')}</select>` : ''}${r.if.vv ? '' : `<input class="input sm" type="number" step="any" data-r="${idx}" data-f="v" value="${esc(r.if.v)}" title="seuil">`}<input class="input sm" type="number" step="any" min="0" data-r="${idx}" data-f="hyst" value="${esc(r.if.hyst || 0)}" title="hystérésis (évite les oscillations)" style="max-width:90px">`}</div>
        ${isMap ? `<div class="rule-line"><span class="rule-kw">Alors</span><select class="select sm" data-r="${idx}" data-f="then.m">${acts.filter((a) => a.mod.act.set).map((a) => `<option value="${a.i}" ${r.then.m === a.i ? 'selected' : ''}>${esc(labelOf(a.i))}</option>`).join('')}</select></div>
          <div class="rule-line"><span class="rule-kw"></span><span class="small">de</span><input class="input sm" type="number" step="any" data-r="${idx}" data-f="out0" value="${esc((r.then.out || [0, 100])[0])}"><span class="small">à</span><input class="input sm" type="number" step="any" data-r="${idx}" data-f="out1" value="${esc((r.then.out || [0, 100])[1])}"><span class="small muted">${esc(dst && dst.mod.act.set ? dst.mod.act.set.unit : '')}</span></div>`
          : `<div class="rule-line"><span class="rule-kw">Alors</span>${actSelect(r.then, 'then', idx)}</div><div class="rule-line"><span class="rule-kw">Sinon</span>${actSelect(r.else, 'else', idx)}</div>`}
        ${!isMap ? `<div class="hint">Hystérésis ${fmtNum(r.if.hyst || 0, 2)} : la règle bascule à ${esc(r.if.vv ? 'la variable ' + r.if.vv : r.if.v)} et revient à ${r.if.op && r.if.op.includes('<') ? '+' : '−'}${fmtNum(r.if.hyst || 0, 2)} au-delà.</div>` : '<div class="hint">La consigne suit la mesure linéairement (bornée aux extrémités).</div>'}`}
      </div>`;
    }).join('') + (spec.rules.length ? '' : `<div class="small muted">Aucune règle pour l'instant. « Nouvelle règle » crée ${outs.length ? '« si mesure &gt; seuil alors allumer, sinon éteindre »' : 'un clignotement toutes les 1 s'}, modifiable ensuite.</div>`)
      + `<div class="row wrap"><button class="btn sm primary" data-rule-add>${icon('plus')}Nouvelle règle</button><button class="btn sm" data-rule-add="every">${icon('clock')}Clignoter / répéter</button></div>`;
  }
  function addRule(kind) {
    const outs = ruleSources(), acts = actuators();
    if (!acts.length) return;
    const a = acts[0], hasOn = !!a.mod.act.on;
    if (kind === 'every' || !outs.length) {
      spec.rules.push({ if: { every: 1 }, then: { m: a.i, act: hasOn ? 'on' : 'set', v: hasOn ? undefined : a.mod.act.set.max }, else: { m: a.i, act: hasOn ? 'off' : 'set', v: hasOn ? undefined : a.mod.act.set.min } });
      return;
    }
    const r = { if: { op: '>', v: 25, hyst: 0.5 }, then: { m: a.i, act: 'on' } };
    setRuleField(r, 'src', outs[0].value);
    spec.rules.push(Object.assign(r, { then: { m: a.i, act: 'on' }, else: { m: a.i, act: 'off' } }));
  }
  function setRuleField(r, f, v) {
    if (f === 'src') {
      if (v === 'every') { r.if = { every: 1 }; if (r.then.act === 'set' && r.then.out) { r.then = { m: r.then.m, act: 'on' }; r.else = { m: r.then.m, act: 'off' }; } return; }
      if (r.if.every != null) r.if = { op: '>', v: 25, hyst: 0.5 };
      if (v.startsWith('var:')) { r.if.var = v.slice(4); delete r.if.m; delete r.if.out; }
      else { const [m, k] = v.split(':'); r.if.m = Number(m); r.if.out = k; delete r.if.var; }
    }
    else if (f === 'vv') { if (v) r.if.vv = v; else delete r.if.vv; }
    else if (f === 'op') {
      r.if.op = v;
      if (v === 'map') { const a = actuators().find((x) => x.mod.act.set); r.if.in = r.if.in || [0, 100]; r.then = { m: a ? a.i : r.then.m, act: 'set', out: a ? [a.mod.act.set.min, a.mod.act.set.max] : [0, 100] }; delete r.else; }
      else if (!r.else && r.then.act === 'set' && r.then.out) { r.then = { m: r.then.m, act: 'on' }; r.else = { m: r.then.m, act: 'off' }; }
    }
    else if (f === 'every') r.if.every = Math.max(0.2, Number(v) || 1);
    else if (f === 'v' || f === 'hyst') r.if[f] = v === '' ? 0 : Number(v);
    else if (f === 'in0' || f === 'in1') { r.if.in = r.if.in || [0, 100]; r.if.in[f === 'in0' ? 0 : 1] = Number(v); }
    else if (f === 'out0' || f === 'out1') { r.then.out = r.then.out || [0, 100]; r.then.out[f === 'out0' ? 0 : 1] = Number(v); }
    else if (f === 'then.m' && r.if.op === 'map') r.then.m = Number(v);
    else {
      const [kind, key] = f.split('.');
      if (key === 'm') {
        if (v === '') { if (kind === 'else') delete r.else; return; }
        const mod = modOf(spec.modules[Number(v)]);
        r[kind] = { m: Number(v), act: mod && mod.act.on ? (kind === 'else' ? 'off' : 'on') : 'set' };
      } else if (key === 'act') { r[kind] = r[kind] || {}; r[kind].act = v; if (v === 'set' && r[kind].v == null) { const mod = modOf(spec.modules[r[kind].m]); r[kind].v = mod && mod.act.set ? mod.act.set.max : 0; } }
      else if (key === 'v') r[kind].v = Number(v);
    }
  }
  /* Renumérote les règles après suppression / déplacement d'un module. */
  function remapRules(mapFn) {
    spec.vars.forEach((v) => { if (v.from) { const m = mapFn(v.from.m); if (m < 0) delete v.from; else v.from.m = m; } });
    spec.rules = spec.rules.map((r) => {
      const a = r.if.var || r.if.every != null ? 0 : mapFn(r.if.m), b = mapFn(r.then.m);
      if (a < 0 || b < 0) return null;
      if (!r.if.var && r.if.every == null) r.if.m = a;
      r.then.m = b;
      if (r.else) { const c = mapFn(r.else.m); if (c < 0) delete r.else; else r.else.m = c; }
      return r;
    }).filter(Boolean);
  }

  /* ---------- Page ---------- */
  A.page({
    id: 'studio', title: 'Studio', icon: 'wand', group: 'build', mobile: true,
    desc: 'Assemblez capteurs et actionneurs, le code s\'écrit tout seul',
    render(el, q) {
      if (!LAB.generate) { el.innerHTML = `<div class="banner warn">${icon('alert')}<div>Générateur non chargé (catalog.js).</div></div>`; return; }
      if (q && q.s) { try { spec = JSON.parse(b64d(q.s)); saveSpec(); toast('Projet partagé chargé', 'ok'); history.replaceState(null, '', '#studio'); } catch (e) { toast('Lien de partage invalide', 'bad'); } }
      if (!spec) loadSpec();
      if (S.state && S.state.master && !spec.options.wifi_ssid) spec.options.wifi_ssid = S.state.master.ap_ssid;
      A.setTopActions(`<button class="btn" data-act="st-new">${icon('plus')}<span class="lbl">Nouveau</span></button><button class="btn" data-act="st-template">${icon('star')}<span class="lbl">Modèles</span></button><button class="btn" data-act="st-save-project">${icon('save')}<span class="lbl">Enregistrer le projet</span></button><button class="btn" data-act="st-share">${icon('share')}<span class="lbl">Partager</span></button>`);
      el.innerHTML = '<div id="st-root"></div>';
      bind(el);
      draw();
    }
  });

  /* Redessine le Studio sans perdre le défilement ni le champ en cours de saisie. */
  function draw() {
      const root = $('#st-root');
      if (!root) return;
      const a = document.activeElement;
      let sel = null, caret = null;
      if (a && root.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) {
        sel = (a.id ? '#' + a.id : '') + Object.entries(a.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}="${String(v).replace(/"/g, '\\"')}"]`).join('');
        try { caret = [a.selectionStart, a.selectionEnd]; } catch (e) { caret = null; }
      }
      const side = $('.studio-side', root), sy = side ? side.scrollTop : 0, wy = window.scrollY;
      let res = null, err = null;
      try { res = LAB.generate(spec); } catch (e) { err = e.message; }
      const B = LAB.BOARDS[spec.board] || LAB.BOARDS.esp32;
      const o = spec.options;
      root.innerHTML = `<div class="studio">
        <div class="studio-side">
          <div class="card"><div class="card-h"><h2 class="grow">Projet</h2></div><div class="card-b stack" style="gap:12px">
            <div class="field"><label>Nom</label><input class="input" data-s="title" value="${esc(spec.title)}" maxlength="80"></div>
            <div class="field"><label>Carte</label><div class="seg" style="width:100%">${Object.keys(LAB.BOARDS).map((b) => `<button class="grow ${spec.board === b ? 'on' : ''}" data-board="${b}">${BOARD_LABEL[b]}</button>`).join('')}</div><div class="hint">${esc(B.name)} — le code et le brochage s'adaptent automatiquement.</div></div>
            <div class="field"><label>Description (en tête du code)</label><textarea class="textarea" data-s="description" rows="2" style="min-height:56px">${esc(spec.description || '')}</textarea></div>
          </div></div>
          <div class="card"><div class="card-h"><div class="grow"><h2>Modules <span class="badge">${spec.modules.length}</span></h2></div><button class="btn sm primary" data-act="st-add">${icon('plus')}Ajouter</button></div><div class="card-b stack" style="gap:8px">
            ${spec.modules.length ? spec.modules.map((m, i) => {
              const mod = modOf(m);
              if (!mod) return `<div class="banner warn">${icon('alert')}<div>Module inconnu : ${esc(m.id)} <button class="btn sm" data-mdel="${i}">Retirer</button></div></div>`;
              const params = Object.entries(mod.params || {});
              const pins = res && res.instances && res.instances[i] ? res.wiring.filter((w) => w.mod === res.instances[i].label && /GPIO/.test(w.to)) : [];
              return `<div class="mod-row"><div class="mod-row-h" data-mopen="${i}"><div class="icon-tile ${mod.act ? 'violet' : 'accent'}" style="width:30px;height:30px">${icon(((LAB.CATS || {})[mod.cat] || {}).icon || 'box')}</div><div class="grow" style="min-width:0"><div style="font-weight:600" class="ellipsis">${esc(labelOf(i))}</div><div class="tiny muted ellipsis">${esc(mod.name)}${pins.length ? ' · ' + pins.map((w) => w.pin + '→' + w.to.replace('GPIO', '')).join(', ') : ''}</div></div>
                <button class="btn sm icon ghost" data-mup="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Monter">${icon('back').replace('<svg', '<svg style="transform:rotate(90deg)"')}</button><button class="btn sm icon ghost" data-mdel="${i}" aria-label="Retirer">${icon('x')}</button></div>
                ${open === i ? `<div class="mod-row-b"><div class="field"><label>Nom court (variables et mesures publiées)</label><input class="input sm" data-malias="${i}" value="${esc(m.alias || '')}" placeholder="${esc(mod.key || mod.id)}"></div>
                  ${params.map(([k, p]) => `<div class="field"><label>${esc(p.label || k)}</label>${p.opts ? `<select class="select sm" data-mparam="${i}" data-k="${k}">${p.opts.map((v) => `<option ${String((m.params || {})[k] != null ? m.params[k] : p.def) === String(v) ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>` : `<input class="input sm" data-mparam="${i}" data-k="${k}" value="${esc((m.params || {})[k] != null ? m.params[k] : p.def)}">`}</div>`).join('')}
                  <div class="small muted">${esc(mod.desc || '')}</div>${(mod.notes || []).length ? `<ul class="small" style="margin:0;padding-left:18px;color:var(--text-2)">${mod.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div>` : ''}</div>`;
            }).join('') : `<div class="empty" style="padding:18px">${icon('box')}<div class="small">Ajoutez des capteurs, afficheurs et actionneurs.<br>Les broches sont choisies automatiquement, sans conflit.</div></div>`}
          </div></div>
          <div class="card studio-rules"><div class="card-h"><div class="grow"><h2>Conditions et actions <span class="badge">${spec.rules.length}</span></h2><div class="card-sub">si… alors… sinon… · minuteries</div></div>${actuators().length ? `<button class="btn sm primary" data-rule-add>${icon('plus')}Nouvelle règle</button>` : ''}</div><div class="card-b stack" style="gap:10px" id="st-rules">${rulesHtml()}</div></div>
          <div class="card"><div class="card-h"><h2 class="grow">Variables <span class="badge">${spec.vars.length}</span></h2></div><div class="card-b stack" style="gap:10px" id="st-vars">${varsHtml()}</div></div>
          <div class="card"><div class="card-h"><h2 class="grow">Connectivité</h2></div><div class="card-b stack" style="gap:12px">
            <label class="switch"><input type="checkbox" data-opt="web" ${o.web || o.app ? 'checked' : ''} ${o.app ? 'disabled' : ''}><span class="track"></span>Page web locale (mesures + commandes)</label>
            <label class="switch"><input type="checkbox" data-opt="app" ${o.app ? 'checked' : ''}><span class="track"></span>Pilotage par application (APK, page web : actionneurs et variables)</label>
            <label class="switch"><input type="checkbox" data-opt="master" ${o.master ? 'checked' : ''}><span class="track"></span>Envoyer les mesures au MASTER</label>
            <label class="switch"><input type="checkbox" data-opt="mqtt" ${o.mqtt ? 'checked' : ''}><span class="track"></span>Publier en MQTT (Home Assistant, Node-RED…)</label>
            <label class="switch"><input type="checkbox" data-opt="home" ${o.home !== false ? 'checked' : ''}><span class="track"></span>Retour au mode worker (projet chargé depuis le MASTER)</label>
            ${o.web || o.app || o.master || o.mqtt ? `<div class="form-grid"><div class="field"><label>Wi-Fi (SSID)</label><input class="input sm" data-o="wifi_ssid" value="${esc(o.wifi_ssid || 'ESP32-LAB')}"></div><div class="field"><label>Mot de passe</label><input class="input sm" data-o="wifi_pass" type="password" value="${esc(o.wifi_pass || '')}" placeholder="ESP32-LAB-Setup2026!"></div>
              <div class="field"><label>Nom de l'appareil</label><input class="input sm" data-o="device" value="${esc(o.device || '')}" placeholder="${esc(LAB.sanitize(spec.title).slice(0, 20))}"></div>${o.mqtt ? `<div class="field"><label>Serveur MQTT</label><input class="input sm" data-o="mqtt_host" value="${esc(o.mqtt_host || '192.168.4.2')}"></div>` : ''}</div>` : ''}
          </div></div>
        </div>
        <div class="stack">
          ${err ? `<div class="banner warn">${icon('alert')}<div>${esc(err)}</div></div>` : ''}
          ${res ? res.warnings.map((w) => `<div class="banner warn" style="margin:0">${icon('alert')}<div>${esc(w)}</div></div>`).join('') : ''}
          <div class="card"><div class="card-h"><div class="grow"><h2 class="ellipsis">${esc(spec.title)}</h2><div class="card-sub">${res ? `${res.code.split('\n').length} lignes · ${res.libs.length} bibliothèque(s) · ${res.power.total_mA} mA` : ''}</div></div>
            <div class="btn-group"><button class="btn sm" data-act="st-copy">${icon('copy')}<span class="hide-sm">Copier</span></button><button class="btn sm" data-act="st-ino">${icon('file')}.ino</button><button class="btn sm" data-act="st-zip">${icon('download')}.zip</button><button class="btn sm" data-act="st-sd" ${S.admin ? '' : 'disabled title="Connexion administrateur requise"'}>${icon('sd')}<span class="hide-sm">microSD</span></button><button class="btn sm primary" data-act="st-flash" title="Le Pi compile, le S3 flashe un worker et vérifie le moniteur">${icon('zap')}Flasher</button><button class="btn sm" data-act="st-apk" title="Crée l'application Android qui lit et commande ce montage">${icon('phone')}Créer l'APK</button><button class="btn sm" data-act="st-bench" title="Test matériel automatique par deux workers">${icon('target')}<span class="hide-sm">Banc</span></button></div></div>
            <div class="card-b"><div class="tabs" id="st-tabs">${[['code', 'Code'], ['wiring', 'Montage'], ['pins', 'Brochage'], ['app', 'Application'], ['power', 'Alimentation'], ['bom', 'Matériel']].map(([k, n]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="tab-panel">${res ? panel(res) : ''}</div></div></div>
        </div></div>`;
      A.studioResult = res;
      const side2 = $('.studio-side', root);
      if (side2) side2.scrollTop = sy;
      window.scrollTo(0, wy);
      if (sel) { const n = root.querySelector(sel); if (n) { n.focus({ preventScroll: true }); if (caret && caret[0] != null) { try { n.setSelectionRange(caret[0], caret[1]); } catch (e) { /* type sans sélection */ } } } }
  }


  function panel(res) {
    if (tab === 'code') return A.codeBlock(res.code, 'calc(100vh - 260px)');
    if (tab === 'wiring') {
      const m = LAB.montageSvg && res.wiring && res.wiring.length ? LAB.montageSvg(res, { id: projId(), title: spec.title }) : null;
      return (m ? `<div class="montage">${m.svg}</div><div class="row" style="margin:10px 0"><button class="btn sm" data-act="st-svg">${icon('download')}Schéma .svg</button></div>` : '') + A.wiringTable(res);
    }
    if (tab === 'app') return appPanel(res);
    if (tab === 'pins') return A.boardView(res.board, A.usedFromWiring(res.board, res.wiring)) + `<div class="small muted" style="margin-top:10px">${(LAB.BOARDS[res.board].notes || []).map(esc).join('<br>')}</div>`;
    if (tab === 'power') {
      const rows = spec.modules.map((m, i) => { const mod = modOf(m); return mod ? [labelOf(i), mod.vcc || '3V3', mod.mA || 1, mod.peak_mA || mod.mA || 1] : null; }).filter(Boolean);
      const cap = store.get('studio.batt', 2000);
      const sleep = store.get('studio.sleep', 0);
      const avg = sleep ? (res.power.total_mA * (60 - sleep) + 0.15 * sleep) / 60 : res.power.total_mA;
      const hours = (cap * 0.8) / Math.max(0.01, avg);
      return `<div class="grid g-2"><div class="card"><div class="table-wrap"><table class="tbl"><thead><tr><th>Élément</th><th>Alim.</th><th>Moyen</th><th>Pointe</th></tr></thead><tbody>
          <tr><td>Carte ${esc(BOARD_LABEL[res.board])}${spec.options.web || spec.options.master || spec.options.mqtt ? ' + Wi-Fi' : ''}</td><td>3V3</td><td class="num">${res.power.board_mA} mA</td><td class="num">${res.power.total_peak_mA - res.power.modules_peak_mA} mA</td></tr>
          ${rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="num">${fmtNum(r[2])} mA</td><td class="num">${fmtNum(r[3])} mA</td></tr>`).join('')}
          <tr><td><b>Total</b></td><td></td><td class="num"><b>${fmtNum(res.power.total_mA)} mA</b></td><td class="num"><b>${fmtNum(res.power.total_peak_mA)} mA</b></td></tr></tbody></table></div></div>
        <div class="card pad stack" style="gap:12px"><h3>Autonomie sur batterie</h3>
          <div class="field"><label>Capacité (mAh)</label><input class="input" type="number" min="100" step="100" id="pw-cap" value="${cap}"></div>
          <div class="field"><label>Minutes de sommeil profond par heure : <b id="pw-sv">${sleep}</b></label><input type="range" id="pw-sleep" min="0" max="59" value="${sleep}"><div class="hint">Deep-sleep ≈ 0,15 mA sur un module nu (plus sur une carte de développement à régulateur AMS1117).</div></div>
          <div><div class="calc-out">${hours >= 48 ? fmtNum(hours / 24, 1) + ' jours' : fmtNum(hours, 1) + ' heures'}</div><div class="small muted">Consommation moyenne ${fmtNum(avg, 1)} mA, 80 % de capacité utile.</div></div>
          <div class="small">${res.power.total_peak_mA > 450 ? `<span class="badge warn">Alimentation 5 V ≥ 1 A recommandée</span>` : `<span class="badge ok">Un port USB suffit</span>`}</div></div></div>`;
    }
    const mods = spec.modules.map((m) => modOf(m)).filter(Boolean);
    const count = {};
    mods.forEach((m) => { count[m.name] = (count[m.name] || 0) + 1; });
    return `<div class="grid g-2"><div class="card pad"><h3 style="margin-bottom:10px">Liste du matériel</h3><div class="statlist"><div><span>${esc(LAB.BOARDS[res.board].name)}</span><span class="badge">×1</span></div>${Object.entries(count).map(([n, c]) => `<div><span>${esc(n)}</span><span class="badge">×${c}</span></div>`).join('')}<div><span>Plaque d'essai + fils Dupont</span><span class="badge">×1</span></div>${mods.some((m) => /pull|tirage|4,7 kΩ|10 kΩ/.test((m.pins || []).map((p) => p.note || '').join(' '))) ? '<div><span>Résistances de tirage (4,7 kΩ / 10 kΩ)</span><span class="badge">selon câblage</span></div>' : ''}${res.power.total_peak_mA > 450 ? '<div><span>Alimentation 5 V 2 A</span><span class="badge">×1</span></div>' : ''}</div></div>
      <div class="card pad"><h3 style="margin-bottom:10px">Bibliothèques Arduino</h3>${A.libsHtml(res)}</div>
      ${res.outs.length ? `<div class="card pad span-2"><h3 style="margin-bottom:10px">Mesures publiées</h3><div class="row wrap">${res.outs.map((x) => `<span class="badge outline"><span class="mono">${esc(x.key)}</span>${x.unit ? ' · ' + esc(x.unit) : ''}</span>`).join('')}</div><p class="hint" style="margin-top:8px">Visibles dans le moniteur/traceur série${spec.options.master ? ', sur la page Capteurs du MASTER' : ''}${spec.options.web ? ', sur la page web du montage' : ''}${spec.options.mqtt ? ', et en MQTT (lab/&lt;appareil&gt;/&lt;mesure&gt;)' : ''}.</p></div>` : ''}</div>`;
  }

  /* Onglet Application : ce que l'APK peut lire et commander sur ce montage. */
  function appPanel(res) {
    const o = spec.options;
    const ctl = res.controls || [];
    const vars = res.vars || [];
    return `<div class="stack" style="gap:12px">
      ${o.app ? '' : `<div class="banner">${icon('info')}<div>Active « Pilotage par application » dans Connectivité : le montage ouvre alors <code>/api</code> (mesures et variables) et <code>/set</code> (commandes) pour l'APK et la page web.</div></div>`}
      <div class="grid g-2">
        <div class="card pad"><h3 style="margin-bottom:10px">Lu par l'application</h3><div class="statlist">${res.outs.map((x) => `<div><span>${esc(x.module === 'Variable' ? 'Variable ' + x.label : x.label + ' · ' + x.module)}</span><span class="badge outline mono">${esc(x.key)}${x.unit ? ' ' + esc(x.unit) : ''}</span></div>`).join('') || '<div><span class="muted">Aucune mesure</span></div>'}</div>
          <p class="hint" style="margin-top:8px">${o.master ? 'Via le MASTER : source « Capteur du MASTER » <code>' + esc(res.device) + '/&lt;clé&gt;</code> dans le Studio APK.' : 'Active « Envoyer les mesures au MASTER » pour les lire depuis n\'importe quelle APK du labo.'}${o.app ? ' En direct : <code>http://&lt;ip&gt;/api</code>.' : ''}</p></div>
        <div class="card pad"><h3 style="margin-bottom:10px">Commandé par l'application</h3>${o.app ? `<div class="statlist">${ctl.map((c) => `<div><span>${esc(c.var ? 'Variable ' + c.name : c.name)}</span><span class="badge outline mono">/set?${esc(c.key)}=${c.set && !c.on ? '&lt;nombre&gt;' : [c.on ? 'on' : '', c.off ? 'off' : '', c.toggle ? 'toggle' : '', c.set ? (c.set.min != null ? c.set.min + '…' + c.set.max : '&lt;n&gt;') : ''].filter(Boolean).join('|')}</span></div>`).join('') || '<div><span class="muted">Ajoute un actionneur ou une variable réglable</span></div>'}</div>
          <p class="hint" style="margin-top:8px">Les actionneurs commandés par l'application n'exécutent plus leur programme de démonstration.</p>` : '<div class="small muted">Pilotage désactivé.</div>'}</div>
      </div>
      <div class="row wrap"><button class="btn primary" data-act="st-apk">${icon('phone')}Créer l'application dans le Studio APK</button>${vars.length ? `<span class="small muted">${vars.length} variable(s) : ${vars.map((v) => `<code>${esc(v.c)}</code>`).join(', ')}</span>` : ''}</div>
    </div>`;
  }

  function bind(el) {
    const rerender = A.debounce(() => { saveSpec(); draw(); }, 300);
    el.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.s) { spec[t.dataset.s] = t.value; rerender(); }
      else if (t.dataset.o) { spec.options[t.dataset.o] = t.value; rerender(); }
      else if (t.dataset.v != null && t.type !== 'checkbox' && t.tagName !== 'SELECT') { setVarField(Number(t.dataset.v), t.dataset.vf, t.value); rerender(); }
      else if (t.dataset.malias != null) { spec.modules[Number(t.dataset.malias)].alias = t.value.trim() || undefined; rerender(); }
      else if (t.id === 'pw-cap') { store.set('studio.batt', Number(t.value) || 2000); rerender(); }
      else if (t.id === 'pw-sleep') { $('#pw-sv').textContent = t.value; store.set('studio.sleep', Number(t.value)); rerender(); }
    });
    el.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.opt) { spec.options[t.dataset.opt] = t.checked; saveSpec(); draw(); }
      else if (t.dataset.mparam != null) { const m = spec.modules[Number(t.dataset.mparam)]; m.params = m.params || {}; m.params[t.dataset.k] = t.value; saveSpec(); draw(); }
      else if (t.dataset.r != null) { setRuleField(spec.rules[Number(t.dataset.r)], t.dataset.f, t.value); saveSpec(); draw(); }
      else if (t.dataset.v != null && (t.type === 'checkbox' || t.tagName === 'SELECT')) { setVarField(Number(t.dataset.v), t.dataset.vf, t.value, t.checked); saveSpec(); draw(); }
    });
    el.addEventListener('click', (e) => {
      const t = e.target.closest('button,[data-mopen]');
      if (!t) return;
      if (t.dataset.board) { spec.board = t.dataset.board; saveSpec(); draw(); }
      else if (t.dataset.t) { tab = t.dataset.t; draw(); }
      else if (t.dataset.mdel != null) {
        const i = Number(t.dataset.mdel);
        spec.modules.splice(i, 1);
        remapRules((m) => (m === i ? -1 : m > i ? m - 1 : m));
        open = -1; saveSpec(); draw();
      } else if (t.dataset.mup != null) {
        const i = Number(t.dataset.mup);
        if (i > 0) { const x = spec.modules[i]; spec.modules[i] = spec.modules[i - 1]; spec.modules[i - 1] = x; remapRules((m) => (m === i ? i - 1 : m === i - 1 ? i : m)); open = i - 1; saveSpec(); draw(); }
      } else if (t.dataset.mopen != null && !e.target.closest('button')) { const i = Number(t.dataset.mopen); open = open === i ? -1 : i; draw(); }
      else if (t.hasAttribute('data-rule-add')) { addRule(t.dataset.ruleAdd); saveSpec(); draw(); }
      else if (t.dataset.quick) { spec.modules.push({ id: t.dataset.quick }); saveSpec(); toast(LAB.module(t.dataset.quick).name + ' ajouté', 'ok', 1600); draw(); }
      else if (t.dataset.ruleDel != null) { spec.rules.splice(Number(t.dataset.ruleDel), 1); saveSpec(); draw(); }
      else if (t.hasAttribute('data-var-add')) { addVar(); saveSpec(); draw(); }
      else if (t.dataset.varDel != null) {
        const gone = varName(spec.vars[Number(t.dataset.varDel)] || {});
        spec.vars.splice(Number(t.dataset.varDel), 1);
        spec.rules = spec.rules.filter((r) => !(r.if.var && LAB.sanitize(r.if.var) === gone));
        spec.rules.forEach((r) => { if (r.if.vv && LAB.sanitize(r.if.vv) === gone) delete r.if.vv; });
        saveSpec(); draw();
      }
    });
  }

  const projId = () => LAB.sanitize(spec.title || 'projet');
  const asProject = () => ({ id: projId(), title: spec.title, desc: spec.description, difficulty: 2, notes: [], spec });
  Object.assign(A.actions, {
    'st-add': pickModule,
    'st-copy': () => A.studioResult && copyText(A.studioResult.code),
    'st-ino': () => A.studioResult && download(projId() + '.ino', A.studioResult.code),
    'st-zip': () => A.studioResult && A.downloadProjectZip(projId(), asProject(), A.studioResult),
     'st-sd': () => A.studioResult && A.saveProjectToSd(projId(), asProject(), A.studioResult),
    'st-save-project': async () => {
      const title = await A.modal({ title: 'Enregistrer et reprendre plus tard', input: spec.title || '', label: 'Nom de ce projet', placeholder: 'ex. Serre du balcon', ok: 'Enregistrer' });
      if (!title || !title.trim()) return;
      const clean = title.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 72);
      if (!clean) return A.toast('Choisis un nom avec des lettres ou des chiffres.', 'warn');
      let exists = false;
      try { const existing = await A.api('/api/projects'); exists = (existing || []).some((p) => p.group === 'mine' && p.name === clean); } catch (e) {}
      try { const existing = await A.piProjects(); exists = exists || existing.some((p) => p.id === clean); } catch (e) { if (!exists && !S.admin) return A.toast('Connecte le Pi dans Compagnon ou insère une microSD dans le S3.', 'warn'); }
      if (exists && !(await A.confirmBox('Remplacer le projet ?', `« ${title.trim()} » existe déjà. Remplacer ses fichiers par cette version ?`, 'Remplacer', true))) return;
      spec.title = title.trim(); saveSpec(); draw();
      try { const result = LAB.generate(spec); A.studioResult = result; await A.saveProjectToSd(clean, asProject(), result); }
      catch (e) { A.toast(e.message || String(e), 'bad'); }
    },
    'st-flash': () => { if (!spec.modules.length) return toast('Ajoute au moins un module avant de flasher.', 'warn'); A.flashPipeline({ spec: JSON.parse(JSON.stringify(spec)), title: spec.title }); },
    'st-svg': () => A.studioResult && LAB.montageSvg && download(`montage_${projId()}_${A.studioResult.board}.svg`, LAB.montageSvg(A.studioResult, { id: projId(), title: spec.title }).svg, 'image/svg+xml'),
    'st-apk': () => {
      if (!A.AppStudio) return toast('Studio APK non chargé', 'bad');
      store.set('apkstudio.fromStudio', JSON.parse(JSON.stringify(spec)));
      A.go('apkstudio', { studio: '1' });
    },
    'st-bench': () => A.openBench(JSON.parse(JSON.stringify(spec)), projId()),
    'st-new': async () => { if (spec.modules.length && !(await confirmBox('Nouveau projet', 'Le projet en cours sera remplacé (pensez à le télécharger).', 'Nouveau'))) return; spec = blank(); saveSpec(); open = -1; draw(); },
    'st-share': () => {
      const url = location.origin + location.pathname + '#studio?s=' + b64e(JSON.stringify(spec));
      modal({ title: 'Partager ce projet', html: '<p>Ce lien contient tout le projet (modules, règles, options — mot de passe Wi-Fi exclu). Toute personne connectée au laboratoire peut l\'ouvrir.</p>', input: url, ok: 'Copier', cancel: 'Fermer' }).then((v) => { if (v) copyText(v); });
    },
    'st-template': () => {
      const recs = LAB.RECIPES || [];
      const d = drawer('Partir d\'un modèle', `<p class="small muted" style="margin-bottom:12px">${recs.length} projets complets, modifiables librement.</p><div class="pick-list" style="max-height:none">${recs.map((r) => `<div class="pick-item" data-id="${r.id}"><div class="icon-tile violet">${icon('star')}</div><div class="grow" style="min-width:0"><div style="font-weight:600">${esc(r.title)}</div><div class="small muted">${esc(r.desc)}</div></div></div>`).join('')}</div>`);
      d.body.addEventListener('click', (e) => { const it = e.target.closest('[data-id]'); if (!it) return; const p = A.projectById(it.dataset.id); d.close(); A.openInStudio(p.spec); });
    }
  });
  // le mot de passe Wi-Fi n'est jamais inclus dans un lien partagé
  const _share = A.actions['st-share'];
  A.actions['st-share'] = () => { const pass = spec.options.wifi_pass; delete spec.options.wifi_pass; _share(); if (pass) spec.options.wifi_pass = pass; };
  A.commands.push({ title: 'Nouveau projet (Studio)', group: 'Action', icon: 'wand', run: () => A.go('studio') }, { title: 'Ajouter un module au projet', group: 'Action', icon: 'plus', run: () => { A.go('studio'); setTimeout(pickModule, 60); } });
})();
