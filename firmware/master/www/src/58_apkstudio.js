/* Studio APK : crée une application Android sans coder, à la manière de MIT App Inventor.
 * Écrans, composants glissés-déposés, variables reliées aux capteurs du labo, blocs « quand… alors… »,
 * test en direct, puis le Pi fabrique et signe l'APK (aucune compilation) et donne le lien direct + le QR.
 * Le rendu vient de 57_appruntime.js : l'aperçu est exactement l'application installée. */
(function () {
  'use strict';
  const A = window.APP, $ = A.$, $$ = A.$$, esc = A.esc, icon = A.icon, toast = A.toast, store = A.store;
  const R = window.NexusAppRuntime;
  const S = { D: null, sel: null, scr: null, tab: 'design', mode: 'design', inst: null, logs: [], feeds: [], status: null, last: null, el: null };

  /* ------------------------------------------------------------------ modèle */
  const slug = (t) => {
    const s = String(t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'app';
    return /^[a-z]/.test(s) ? s : ('a' + s).slice(0, 40);
  };
  const ident = (t, used) => {
    let base = String(t || 'v').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 28) || 'v';
    if (!/^[A-Za-z_]/.test(base)) base = 'v_' + base;
    let n = base, i = 2;
    while (used.has(n)) n = base + '_' + i++;
    used.add(n);
    return n;
  };
  function fix() {
    const D = S.D;
    D.vars = D.vars || []; D.rules = D.rules || [];
    if (!D.screens || !D.screens.length) D.screens = [{ id: 'accueil', title: 'Accueil', items: [] }];
    D.screens.forEach((s) => (s.items = s.items || []));
    if (!D.screens.some((s) => s.id === S.scr)) S.scr = D.screens[0].id;
    D.version = Math.max(1, parseInt(D.version, 10) || 1);
  }
  const save = () => store.set('apkstudio.design', S.D);
  function load() { S.D = store.get('apkstudio.design', null) || R.blank('Mon application'); fix(); }
  const screen = () => S.D.screens.find((s) => s.id === S.scr) || S.D.screens[0];
  function findItem(id) {
    for (let si = 0; si < S.D.screens.length; si++) {
      const i = S.D.screens[si].items.findIndex((x) => x.id === id);
      if (i >= 0) return { si, i, it: S.D.screens[si].items[i] };
    }
    return null;
  }
  const getP = (path) => path.reduce((o, k) => (o == null ? o : o[k]), S.D);
  function setP(path, v) { const o = getP(path.slice(0, -1)); if (o) o[path[path.length - 1]] = v; }

  /* ------------------------------------------------------------------ modèles d'applications */
  const TEMPLATES = {
    dashboard: { name: 'Tableau de bord', icon: '📊', desc: 'Température, humidité, jauge et courbe depuis le MASTER', make() {
      const d = R.blank('Mon tableau de bord'); d.icon = '📊';
      d.vars = [{ name: 'temp', source: 'feed', feed: 'temp', unit: '°C', type: 'number', default: 0 }, { name: 'hum', source: 'feed', feed: 'hum', unit: '%', type: 'number', default: 0 }];
      d.screens[0].items = [{ id: 'c1', type: 'title', text: 'Mon tableau de bord', sub: 'Mesures en direct du labo' },
        { id: 'c2', type: 'value', label: 'Température', var: 'temp', unit: '°C', decimals: 1, warn: 28, alarm: 35, width: 'half' },
        { id: 'c3', type: 'gauge', label: 'Humidité', var: 'hum', min: 0, max: 100, unit: '%', width: 'half' },
        { id: 'c4', type: 'chart', label: 'Température', var: 'temp', points: 60, width: 'full' }];
      d.rules = [{ when: { type: 'above', var: 'temp', value: '35' }, do: [{ a: 'notify', text: 'Alerte : {temp} °C' }, { a: 'vibrate', ms: 400 }] }];
      return d; } },
    remote: { name: 'Télécommande', icon: '🎛', desc: 'Boutons et interrupteurs qui commandent un appareil en HTTP', make() {
      const d = R.blank('Télécommande'); d.icon = '🎛';
      d.vars = [{ name: 'ip', source: 'local', type: 'text', default: '192.168.4.20' }, { name: 'lampe', source: 'local', type: 'bool', default: 0 }, { name: 'vitesse', source: 'local', type: 'number', default: 50 }];
      d.screens[0].items = [{ id: 'c1', type: 'title', text: 'Télécommande', sub: 'Appareil : {ip}' },
        { id: 'c2', type: 'switch', label: 'Lampe', var: 'lampe', width: 'full', do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?lampe=1' }], off: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?lampe=0' }] },
        { id: 'c3', type: 'slider', label: 'Vitesse', var: 'vitesse', min: 0, max: 100, step: 5, width: 'full', do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?vitesse={vitesse}' }] },
        { id: 'c4', type: 'button', text: 'Marche', color: '#16a34a', style: 'fill', width: 'half', do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?run=1' }, { a: 'vibrate', ms: 60 }] },
        { id: 'c5', type: 'button', text: 'Arrêt', color: '#ef4444', style: 'fill', width: 'half', do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?run=0' }, { a: 'vibrate', ms: 60 }] }];
      return d; } },
    car: { name: 'Manette de voiture', icon: '🏎', desc: 'Joystick qui envoie direction et vitesse à une voiture ESP32', make() {
      const d = R.blank('Ma voiture'); d.icon = '🏎'; d.color = '#ea580c';
      d.vars = [{ name: 'ip', source: 'local', type: 'text', default: '192.168.4.30' }, { name: 'x', source: 'local', type: 'number', default: 0 }, { name: 'y', source: 'local', type: 'number', default: 0 }];
      d.screens[0].items = [{ id: 'c1', type: 'title', text: 'Ma voiture', sub: 'Lâche le joystick pour arrêter' },
        { id: 'c2', type: 'joystick', var_x: 'x', var_y: 'y', do: [{ a: 'http', method: 'GET', url: 'http://{ip}/drive?x={x}&y={y}' }] },
        { id: 'c3', type: 'value', label: 'Avance', var: 'y', unit: '%', decimals: 0, width: 'half' },
        { id: 'c4', type: 'value', label: 'Virage', var: 'x', unit: '%', decimals: 0, width: 'half' },
        { id: 'c5', type: 'button', text: 'STOP', color: '#ef4444', width: 'full', do: [{ a: 'set', var: 'x', value: '0' }, { a: 'set', var: 'y', value: '0' }, { a: 'http', method: 'GET', url: 'http://{ip}/drive?x=0&y=0' }, { a: 'vibrate', ms: 200 }] }];
      return d; } },
    voice: { name: 'Commande vocale', icon: '🎙', desc: 'Parle à ton montage : « allume », « éteins »', make() {
      const d = R.blank('Commande vocale'); d.icon = '🎙'; d.color = '#9333ea';
      d.vars = [{ name: 'phrase', source: 'local', type: 'text', default: '' }, { name: 'ip', source: 'local', type: 'text', default: '192.168.4.20' }];
      d.screens[0].items = [{ id: 'c1', type: 'title', text: 'Commande vocale', sub: 'Dis « allume » ou « éteins »' },
        { id: 'c2', type: 'button', text: '🎙 Parler', width: 'full', do: [{ a: 'listen', var: 'phrase' }] },
        { id: 'c3', type: 'text', text: 'J\'ai compris : {phrase}', size: 'l', width: 'full' }];
      d.rules = [{ when: { type: 'equals', var: 'phrase', value: 'allume' }, do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?lampe=1' }, { a: 'speak', text: 'C\'est allumé' }] },
        { when: { type: 'equals', var: 'phrase', value: 'éteins' }, do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?lampe=0' }, { a: 'speak', text: 'C\'est éteint' }] }];
      return d; } },
    lab: { name: 'Contrôle du labo', icon: '🧪', desc: 'Lance check-up, scan I2C et clignotement sur les workers', make() {
      const d = R.blank('Mon labo'); d.icon = '🧪'; d.color = '#0891b2';
      d.vars = [{ name: 'worker', source: 'local', type: 'number', default: 0 }];
      d.screens[0].items = [{ id: 'c1', type: 'title', text: 'Mon labo', sub: 'Jobs du MASTER' },
        { id: 'c2', type: 'button', text: 'Check-up', width: 'half', do: [{ a: 'job', type: 'SYSTEM_TEST', worker: 0 }] },
        { id: 'c3', type: 'button', text: 'Scan I2C', width: 'half', do: [{ a: 'job', type: 'I2C_SCAN', worker: 0 }] },
        { id: 'c4', type: 'button', text: 'Faire clignoter', style: 'outline', width: 'full', do: [{ a: 'job', type: 'IDENTIFY', worker: 0 }] }];
      return d; } }
  };

  /* Application tirée d'un projet du Studio : une variable par mesure envoyée au MASTER. */
  function fromSpec(spec, name) {
    const g = window.LAB.generate(Object.assign({}, spec, { options: Object.assign({}, spec.options || {}, { master: true }) }));
    const d = R.blank(name || spec.title || 'Mon projet');
    d.name = String(name || spec.title || 'Mon projet').slice(0, 60);
    d.icon = '📟';
    d.description = `Mesures du montage « ${g.title} » (appareil ${g.device}).`;
    const used = new Set();
    d.vars = g.outs.slice(0, 24).map((o) => ({ name: ident(o.key, used), source: 'feed', feed: `${g.device}/${o.key}`, unit: o.unit, label: `${o.module} ${o.label}`, type: 'number', default: 0 }));
    const items = [{ id: 'c1', type: 'title', text: d.name, sub: g.boardName }];
    d.vars.forEach((v, i) => items.push({ id: 'c' + (i + 2), type: 'value', label: v.label, var: v.name, unit: v.unit, decimals: 1, width: 'half' }));
    d.vars.slice(0, 2).forEach((v, i) => items.push({ id: 'c' + (d.vars.length + 2 + i), type: 'chart', label: v.label, var: v.name, points: 60, width: 'full' }));
    if (!d.vars.length) items.push({ id: 'c2', type: 'text', text: 'Ce projet n\'envoie pas de mesure : ajoute des boutons pour le commander.', size: 's' });
    d.screens[0].items = items;
    return d;
  }

  /* ------------------------------------------------------------------ Pi */
  const piReady = () => !!(A.piBase && A.piBase());
  const piJ = (path, body) => A.piRequest(path, { method: 'POST', body: JSON.stringify(body || {}) });
  async function testNet(method, url, body) {
    if (!/^https?:/i.test(url)) {   // MASTER : mêmes appels que le reste de l'interface (session, mode démo)
      const data = method === 'GET' ? await A.api(url) : await A.post(url, Object.fromEntries(new URLSearchParams(body || '')));
      return { status: 200, text: typeof data === 'string' ? data : JSON.stringify(data) };
    }
    if (!piReady()) {
      const r = await fetch(url, Object.assign({ method }, body && method !== 'GET' ? { body, headers: { 'Content-Type': /^[[{]/.test(body.trim()) ? 'application/json' : 'application/x-www-form-urlencoded' } } : {}));
      return { status: r.status, text: await r.text() };
    }
    const r = await fetch(A.piBase() + '/api/v1/appstudio/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + A.piToken() }, body: JSON.stringify({ method, url, body: body || '' }) });
    return { status: r.status, text: await r.text() };
  }
  async function publish(design, quiet) {
    if (!piReady()) throw new Error('Pi non configuré : ouvre « Compagnon Pi » et renseigne son adresse et son jeton.');
    const d = JSON.parse(JSON.stringify(design));
    d.id = d.id || slug(d.name);
    const saved = await piJ('/api/v1/appstudio/apps', { design: d });
    const res = await piJ(`/api/v1/appstudio/apps/${saved.id}/build`, {});
    res.id = saved.id;
    res.apk_url = A.piBase() + res.apk;
    res.web_url = A.piBase() + res.web;
    if (!quiet) toast(`APK prête : ${d.name} v${res.version}`, 'ok');
    return res;
  }
  async function qrUrl(res) {
    try { const blob = await A.piRequest(res.qr); return blob instanceof Blob ? URL.createObjectURL(blob) : ''; } catch (e) { return ''; }
  }
  A.AppStudio = { fromSpec, publish, qrUrl, slug, templates: TEMPLATES };

  /* ------------------------------------------------------------------ champs génériques */
  const P = (path) => esc(JSON.stringify(path));
  function field(kind, value, path, label) {
    const v = value == null ? '' : value;
    let inp;
    if (kind === 'textarea') inp = `<textarea class="textarea" rows="3" data-p="${P(path)}">${esc(v)}</textarea>`;
    else if (kind === 'number') inp = `<input class="input" type="number" step="any" data-num data-p="${P(path)}" value="${esc(v)}">`;
    else if (kind === 'color') inp = `<div class="row"><input type="color" data-p="${P(path)}" value="${esc(/^#[0-9a-f]{6}$/i.test(v) ? v : S.D.color || '#2f7cf6')}" style="width:48px;height:34px;border:0;background:none">${v ? `<button class="btn sm ghost" data-clear="${P(path)}">Par défaut</button>` : '<span class="hint">couleur du thème</span>'}</div>`;
    else if (kind === 'var') inp = `<select class="select" data-p="${P(path)}"><option value="">— choisir —</option>${S.D.vars.map((x) => `<option ${x.name === v ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}<option value="__new">＋ Nouvelle variable…</option></select>`;
    else if (kind === 'screen') inp = `<select class="select" data-p="${P(path)}">${S.D.screens.map((s) => `<option value="${esc(s.id)}" ${s.id === v ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select>`;
    else if (kind.startsWith('select:')) inp = `<select class="select" data-p="${P(path)}">${kind.slice(7).split('|').map((o) => { const j = o.indexOf('='); const k = o.slice(0, j), n = o.slice(j + 1); return `<option value="${esc(k)}" ${String(v) === k ? 'selected' : ''}>${esc(n)}</option>`; }).join('')}</select>`;
    else inp = `<input class="input" data-p="${P(path)}" value="${esc(v)}">`;
    return `<label class="field">${label ? `<span>${esc(label)}</span>` : ''}${inp}</label>`;
  }
  function actionsEditor(path, title) {
    const list = getP(path) || [];
    return `<div class="as-acts"><div class="as-acts-h">${esc(title)}</div>${list.map((a, i) => {
      const meta = R.ACTIONS[a.a] || R.ACTIONS.notify;
      return `<div class="as-act"><div class="row"><span class="as-n">${i + 1}</span><select class="select sm grow" data-p="${P(path.concat([i, 'a']))}" data-restruct>${Object.entries(R.ACTIONS).map(([k, m]) => `<option value="${k}" ${k === a.a ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select><button class="btn sm icon ghost" data-delact="${P(path)}" data-i="${i}" aria-label="Retirer">${icon('x')}</button></div>
        ${meta.fields.map(([k, lbl, kind]) => field(kind, a[k], path.concat([i, k]), lbl)).join('')}</div>`;
    }).join('')}<button class="btn sm" data-addact="${P(path)}">${icon('plus')}Ajouter une action</button></div>`;
  }

  /* ------------------------------------------------------------------ rendu de la page */
  function draw() {
    const el = S.el;
    if (!el) return;
    el.innerHTML = `<div class="as-head"><div class="as-app"><span class="as-ico" style="background:${esc(S.D.color)}">${esc(S.D.icon)}</span><div><b>${esc(S.D.name)}</b><div class="small muted">${S.D.screens.length} écran(s) · ${S.D.vars.length} variable(s) · ${S.D.rules.length} bloc(s) · v${S.D.version}</div></div></div>
      <div class="tabs" id="as-tabs">${[['design', 'Concevoir', 'phone'], ['vars', 'Variables', 'gauge'], ['rules', 'Blocs « quand »', 'zap'], ['settings', 'Application', 'settings'], ['publish', 'Publier', 'download']].map(([k, n, ic]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${icon(ic)}${n}</button>`).join('')}</div></div>
      <div id="as-body"></div>`;
    $$('#as-tabs button', el).forEach((b) => (b.onclick = () => { S.tab = b.dataset.tab; draw(); }));
    const body = $('#as-body', el);
    if (S.tab === 'design') drawDesign(body);
    else if (S.tab === 'vars') drawVars(body);
    else if (S.tab === 'rules') drawRules(body);
    else if (S.tab === 'settings') drawSettings(body);
    else drawPublish(body);
  }

  function drawDesign(body) {
    const groups = {};
    Object.entries(R.COMPONENTS).forEach(([k, c]) => (groups[c.group] = groups[c.group] || []).push([k, c]));
    body.innerHTML = `<div class="as-layout">
      <div class="card as-pal"><div class="card-h"><h2>Composants</h2></div><div class="card-b">${Object.entries(groups).map(([g, list]) => `<div class="as-g">${esc(g)}</div><div class="as-pal-list">${list.map(([k, c]) => `<button class="as-pi" draggable="true" data-add="${k}" title="Clique ou glisse dans le téléphone"><span>${esc(c.icon)}</span>${esc(c.label)}</button>`).join('')}</div>`).join('')}</div></div>
      <div class="as-center">
        <div class="row wrap as-scr">${S.D.screens.map((s) => `<button class="chip ${s.id === S.scr ? 'on' : ''}" data-scr="${esc(s.id)}">${esc(s.title)}</button>`).join('')}<button class="chip" data-scr-add>${icon('plus')}Écran</button><span class="grow"></span>
          <div class="seg" id="as-mode"><button data-m="design" class="${S.mode === 'design' ? 'on' : ''}">${icon('edit')}Concevoir</button><button data-m="run" class="${S.mode === 'run' ? 'on' : ''}">${icon('play')}Tester</button></div></div>
        <div class="as-phone"><div class="as-notch"></div><div class="as-screen" id="as-screen"></div></div>
        ${S.mode === 'run' ? `<div class="card as-log"><div class="card-h"><h2 class="grow">Journal du test</h2><span class="hint">${piReady() ? 'Requêtes relayées par le Pi' : 'Sans Pi : le navigateur peut bloquer les requêtes vers les appareils'}</span></div><div class="card-b small mono" id="as-log">${S.logs.map((l) => `<div class="${l.k === 'bad' ? 'bad-text' : ''}">${esc(l.m)}</div>`).join('') || '<span class="muted">Appuie sur les boutons du téléphone.</span>'}</div></div>` : ''}
      </div>
      <div class="card as-insp"><div class="card-h"><h2 class="grow">Propriétés</h2></div><div class="card-b" id="as-insp"></div></div></div>`;
    $$('[data-scr]', body).forEach((b) => (b.onclick = () => { S.scr = b.dataset.scr; S.sel = null; draw(); }));
    $('[data-scr-add]', body).onclick = addScreen;
    $$('#as-mode button', body).forEach((b) => (b.onclick = () => { S.mode = b.dataset.m; S.logs = []; draw(); }));
    $$('[data-add]', body).forEach((b) => {
      b.onclick = () => addItem(b.dataset.add);
      b.ondragstart = (e) => { e.dataTransfer.setData('text/x-nexus-add', b.dataset.add); e.dataTransfer.effectAllowed = 'copy'; };
    });
    preview();
    inspector();
  }

  function sample() {
    const out = {};
    S.D.vars.forEach((v) => {
      if (v.source === 'feed') {
        const [a, b] = v.feed && v.feed.indexOf('/') > 0 ? v.feed.split('/') : [null, v.feed];
        const f = S.feeds.find((x) => x.key === b && (!a || x.source === a));
        const typical = { '°C': 21.5, '%': 48, hPa: 1013, m: 120, lx: 350, ppm: 420, V: 3.7, cm: 25 };
        out[v.name] = f ? Number(f.value) : typical[v.unit] != null ? typical[v.unit] : 42;
      } else if (v.type === 'number' && !Number(v.default)) out[v.name] = 42;
    });
    return out;
  }
  function preview() {
    const host = $('#as-screen', S.el);
    if (!host) return;
    if (S.inst) S.inst.destroy();
    S.inst = R.mount(host, S.D, {
      mode: S.mode, screen: S.scr, selected: S.sel, sample: S.mode === 'design' ? sample() : null, s3: '', native: false, settings: false, net: testNet,
      log: (m, k) => { S.logs.push({ m, k }); S.logs = S.logs.slice(-40); const lg = $('#as-log', S.el); if (lg) { lg.innerHTML = S.logs.map((l) => `<div class="${l.k === 'bad' ? 'bad-text' : ''}">${esc(l.m)}</div>`).join(''); lg.scrollTop = 1e6; } },
      onScreen: (id) => { if (S.scr !== id) { S.scr = id; $$('[data-scr]', S.el).forEach((b) => b.classList.toggle('on', b.dataset.scr === id)); if (S.mode === 'design') { S.sel = null; inspector(); } } }
    });
    if (S.mode !== 'design') return;
    const app = S.inst.el;
    app.addEventListener('click', (e) => { const w = e.target.closest('.nxa-item'); if (!w) return; S.sel = w.dataset.id; S.inst.select(S.sel); inspector(); if (innerWidth < 760) { const b = $('#as-insp', S.el); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    let dragId = null;
    app.addEventListener('dragstart', (e) => { const w = e.target.closest('.nxa-item'); if (!w) return; dragId = w.dataset.id; e.dataTransfer.setData('text/x-nexus-move', dragId); e.dataTransfer.effectAllowed = 'move'; });
    app.addEventListener('dragover', (e) => { e.preventDefault(); $$('.nxa-item.drop', app).forEach((x) => x.classList.remove('drop')); const w = e.target.closest('.nxa-item'); if (w) w.classList.add('drop'); });
    app.addEventListener('dragleave', (e) => { if (!app.contains(e.relatedTarget)) $$('.nxa-item.drop', app).forEach((x) => x.classList.remove('drop')); });
    app.addEventListener('drop', (e) => {
      e.preventDefault();
      const w = e.target.closest('.nxa-item'), before = w ? w.dataset.id : null;
      const add = e.dataTransfer.getData('text/x-nexus-add'), move = e.dataTransfer.getData('text/x-nexus-move') || dragId;
      if (add) addItem(add, before);
      else if (move && move !== before) moveItem(move, before);
      dragId = null;
    });
  }
  function changed(restructure) {
    save();
    if (restructure) { draw(); return; }
    const head = $('.as-app', S.el);
    if (head) head.innerHTML = `<span class="as-ico" style="background:${esc(S.D.color)}">${esc(S.D.icon)}</span><div><b>${esc(S.D.name)}</b><div class="small muted">${S.D.screens.length} écran(s) · ${S.D.vars.length} variable(s) · ${S.D.rules.length} bloc(s) · v${S.D.version}</div></div>`;
    clearTimeout(changed.t);
    changed.t = setTimeout(preview, 180);
  }

  function addItem(type, before) {
    const it = R.newItem(type, S.D), list = screen().items;
    const i = before ? list.findIndex((x) => x.id === before) : -1;
    if (i >= 0) list.splice(i, 0, it); else list.push(it);
    if ((it.var === '' || it.var_x === '') && S.D.vars.length && type !== 'joystick') it.var = S.D.vars[0].name;
    S.sel = it.id;
    changed(true);
  }
  function moveItem(id, before) {
    const f = findItem(id);
    if (!f) return;
    const [it] = S.D.screens[f.si].items.splice(f.i, 1), list = screen().items;
    const i = before ? list.findIndex((x) => x.id === before) : -1;
    if (i >= 0) list.splice(i, 0, it); else list.push(it);
    changed(true);
  }
  async function addScreen() {
    const title = await A.modal({ title: 'Nouvel écran', input: 'Écran ' + (S.D.screens.length + 1), label: 'Nom de l\'écran', ok: 'Créer' });
    if (!title) return;
    const used = new Set(S.D.screens.map((s) => s.id));
    const id = ident(slug(title), used);
    S.D.screens.push({ id, title: String(title).slice(0, 60), items: [{ id: R.newItem('title', S.D).id, type: 'title', text: String(title).slice(0, 60), sub: '' }] });
    S.scr = id; S.sel = null;
    changed(true);
  }

  function inspector() {
    const box = $('#as-insp', S.el);
    if (!box) return;
    const f = S.sel && findItem(S.sel);
    if (!f) {
      const s = screen(), si = S.D.screens.indexOf(s);
      box.innerHTML = `<p class="small muted">Clique un composant du téléphone pour le régler, ou glisse-le pour le déplacer.</p>
        ${field('text', s.title, ['screens', si, 'title'], 'Nom de l\'écran')}
        <div class="row wrap">${si > 0 ? `<button class="btn sm" data-scr-left>${icon('back')}Avancer l'écran</button>` : ''}${S.D.screens.length > 1 ? `<button class="btn sm danger" data-scr-del>${icon('trash')}Supprimer l'écran</button>` : ''}</div>`;
      const left = $('[data-scr-left]', box);
      if (left) left.onclick = () => { S.D.screens.splice(si, 1); S.D.screens.splice(si - 1, 0, s); changed(true); };
      const del = $('[data-scr-del]', box);
      if (del) del.onclick = async () => { if (!(await A.confirmBox('Supprimer l\'écran', `« ${s.title} » et ses ${s.items.length} composant(s) seront supprimés.`, 'Supprimer', true))) return; S.D.screens.splice(si, 1); S.scr = S.D.screens[0].id; changed(true); };
      return;
    }
    const meta = R.COMPONENTS[f.it.type], base = ['screens', f.si, 'items', f.i];
    box.innerHTML = `<div class="row"><span class="as-badge">${esc(meta.icon)}</span><b class="grow">${esc(meta.label)}</b><span class="small muted mono">${esc(f.it.id)}</span></div>
      ${meta.props.map(([k, lbl, kind]) => (kind === 'actions' ? actionsEditor(base.concat([k]), lbl) : field(kind, f.it[k], base.concat([k]), lbl))).join('')}
      <div class="row wrap as-tools"><button class="btn sm" data-mv="-1">${icon('chevron')}Monter</button><button class="btn sm" data-mv="1">Descendre</button><button class="btn sm" data-dup>${icon('copy')}Dupliquer</button><button class="btn sm danger" data-del>${icon('trash')}Supprimer</button></div>`;
    $$('[data-mv]', box).forEach((b) => (b.onclick = () => { const list = S.D.screens[f.si].items, j = f.i + Number(b.dataset.mv); if (j < 0 || j >= list.length) return; list.splice(j, 0, list.splice(f.i, 1)[0]); changed(true); }));
    $('[data-dup]', box).onclick = () => { const c = JSON.parse(JSON.stringify(f.it)); c.id = R.newItem(f.it.type, S.D).id; S.D.screens[f.si].items.splice(f.i + 1, 0, c); S.sel = c.id; changed(true); };
    $('[data-del]', box).onclick = () => { S.D.screens[f.si].items.splice(f.i, 1); S.sel = null; changed(true); };
  }

  function drawVars(body) {
    body.innerHTML = `<div class="card"><div class="card-h"><h2 class="grow">Variables</h2><button class="btn sm" id="as-feeds">${icon('refresh')}Mesures du MASTER</button><button class="btn sm primary" id="as-addvar">${icon('plus')}Variable</button></div>
      <div class="card-b"><p class="hint">Une variable garde une valeur. Elle peut venir d'un capteur (mesure envoyée au MASTER par ton montage), d'une adresse HTTP d'un appareil (JSON), ou rester locale (réglée par un bouton, un curseur, la voix…). Utilise-la partout avec <code>{nom}</code>.</p>
      <datalist id="as-feedlist">${S.feeds.map((f) => `<option value="${esc(f.source + '/' + f.key)}">${esc(f.value + ' ' + (f.unit || ''))}</option>`).join('')}</datalist>
      ${S.D.vars.length ? '' : '<div class="empty">Aucune variable. Ajoute-en une, ou pars d\'un projet (onglet Application).</div>'}
      <div class="as-vars">${S.D.vars.map((v, i) => {
        const p = ['vars', i], live = v.source === 'feed' ? S.feeds.find((f) => (v.feed || '').endsWith('/' + f.key) ? (v.feed === f.source + '/' + f.key) : f.key === v.feed) : null;
        return `<div class="as-var card pad"><div class="row"><b class="mono grow">{${esc(v.name)}}</b>${live ? `<span class="badge ok">${esc(live.value)} ${esc(live.unit || '')}</span>` : ''}<button class="btn sm icon ghost" data-delvar="${i}" aria-label="Supprimer">${icon('trash')}</button></div>
          <div class="form-grid">${field('text', v.name, p.concat(['name']), 'Nom')}${field('select:local=Locale|feed=Capteur du MASTER|http=Adresse HTTP (JSON)', v.source, p.concat(['source']), 'Source')}
          ${field('select:number=Nombre|text=Texte|bool=Oui / non', v.type, p.concat(['type']), 'Type')}${field('text', v.unit, p.concat(['unit']), 'Unité')}
          ${v.source === 'feed' ? `<label class="field"><span>Mesure (appareil/clé)</span><input class="input" list="as-feedlist" data-p="${P(p.concat(['feed']))}" value="${esc(v.feed || '')}" placeholder="serre/temp"></label>` : ''}
          ${v.source === 'http' ? field('text', v.url, p.concat(['url']), 'Adresse (ex. http://192.168.4.23/api)') + field('text', v.path, p.concat(['path']), 'Chemin dans le JSON (ex. values.0)') + field('number', v.every || 2, p.concat(['every']), 'Toutes les N secondes') : ''}
          ${v.source === 'local' ? field('text', v.default, p.concat(['default']), 'Valeur de départ') : ''}</div>
          ${v.source === 'feed' ? '<div class="hint">L\'adresse IP de l\'appareil est aussi disponible : <code>{' + esc(v.name) + '_ip}</code>.</div>' : ''}</div>`;
      }).join('')}</div></div></div>`;
    $('#as-addvar', body).onclick = () => { const used = new Set(S.D.vars.map((v) => v.name)); S.D.vars.push({ name: ident('valeur', used), source: S.feeds.length ? 'feed' : 'local', feed: S.feeds.length ? S.feeds[0].source + '/' + S.feeds[0].key : '', type: 'number', unit: '', default: 0 }); changed(true); };
    $('#as-feeds', body).onclick = async () => { await loadFeeds(); draw(); toast(S.feeds.length ? `${S.feeds.length} mesure(s) reçue(s) par le MASTER` : 'Aucune mesure reçue : ton montage doit envoyer au MASTER (option du Studio).', S.feeds.length ? 'ok' : 'warn'); };
    $$('[data-delvar]', body).forEach((b) => (b.onclick = () => { S.D.vars.splice(Number(b.dataset.delvar), 1); changed(true); }));
  }

  function drawRules(body) {
    body.innerHTML = `<div class="card"><div class="card-h"><h2 class="grow">Blocs « quand… alors… »</h2><button class="btn sm primary" id="as-addrule">${icon('plus')}Bloc</button></div>
      <div class="card-b"><p class="hint">Comme les blocs d'App Inventor : choisis un événement, puis les actions à faire. Les seuils ne se déclenchent qu'au franchissement (pas en boucle).</p>
      ${S.D.rules.length ? '' : '<div class="empty">Aucun bloc. Exemple : quand {temp} dépasse 30, afficher « Trop chaud » et vibrer.</div>'}
      ${S.D.rules.map((r, i) => {
        const w = R.WHEN[r.when.type] || R.WHEN.start, p = ['rules', i];
        return `<div class="card pad as-rule"><div class="row"><span class="rule-kw">QUAND</span><select class="select sm grow" data-p="${P(p.concat(['when', 'type']))}" data-restruct>${Object.entries(R.WHEN).map(([k, m]) => `<option value="${k}" ${k === r.when.type ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select><button class="btn sm icon ghost" data-delrule="${i}" aria-label="Supprimer">${icon('trash')}</button></div>
          <div class="form-grid">${(w.fields || []).map(([k, lbl, kind]) => field(kind, r.when[k], p.concat(['when', k]), lbl)).join('')}</div>
          ${actionsEditor(p.concat(['do']), 'ALORS')}</div>`;
      }).join('')}</div></div>`;
    $('#as-addrule', body).onclick = () => { S.D.rules.push({ when: S.D.vars.length ? { type: 'above', var: S.D.vars[0].name, value: '30' } : { type: 'timer', every: 10 }, do: [{ a: 'notify', text: 'Bloc déclenché' }] }); changed(true); };
    $$('[data-delrule]', body).forEach((b) => (b.onclick = () => { S.D.rules.splice(Number(b.dataset.delrule), 1); changed(true); }));
  }

  function drawSettings(body) {
    body.innerHTML = `<div class="grid g-2"><div class="card"><div class="card-h"><h2>Application</h2></div><div class="card-b form-grid">
        ${field('text', S.D.name, ['name'], 'Nom affiché sur le téléphone')}${field('text', S.D.icon, ['icon'], 'Icône (emoji)')}
        ${field('color', S.D.color, ['color'], 'Couleur principale')}${field('select:auto=Selon le téléphone|light=Clair|dark=Sombre', S.D.theme, ['theme'], 'Thème')}
        ${field('text', S.D.s3, ['s3'], 'Adresse du MASTER')}${field('number', S.D.version, ['version'], 'Version (augmente à chaque APK)')}
        ${field('textarea', S.D.description, ['description'], 'Description')}
        <div class="hint">Identifiant Android : <code>local.nexus.apps.${esc(S.D.id || slug(S.D.name))}</code>${S.D.id ? ' (fixé : garde-le pour mettre à jour l\'appli installée)' : ''}</div></div></div>
      <div class="card"><div class="card-h"><h2>Partir de…</h2></div><div class="card-b">
        <div class="as-tpl">${Object.entries(TEMPLATES).map(([k, t]) => `<button class="as-tplb" data-tpl="${k}"><span>${esc(t.icon)}</span><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join('')}
        <button class="as-tplb" data-from-studio><span>🧩</span><b>Projet du Studio</b><small>Une valeur et une courbe par mesure du montage ouvert dans le Studio</small></button>
        <button class="as-tplb" data-tpl-blank><span>⬜</span><b>Vide</b><small>Un écran, rien d'autre</small></button></div>
        <div class="row wrap" style="margin-top:12px"><button class="btn sm" id="as-export">${icon('download')}Exporter (.json)</button><label class="btn sm">${icon('upload')}Importer<input type="file" accept=".json,application/json" id="as-import" hidden></label></div></div></div></div>`;
    $$('[data-tpl]', body).forEach((b) => (b.onclick = () => replace(TEMPLATES[b.dataset.tpl].make())));
    $('[data-tpl-blank]', body).onclick = () => replace(R.blank('Mon application'));
    $('[data-from-studio]', body).onclick = () => {
      const spec = store.get('studio.spec', null);
      if (!spec || !(spec.modules || []).length) { toast('Le Studio est vide : assemble d\'abord ton montage.', 'warn'); return; }
      try { replace(fromSpec(spec)); } catch (e) { toast(e.message, 'bad'); }
    };
    $('#as-export', body).onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S.D, null, 1)], { type: 'application/json' })); a.download = (S.D.id || slug(S.D.name)) + '.nexusapp.json'; a.click(); };
    $('#as-import', body).onchange = async (e) => { try { const d = JSON.parse(await e.target.files[0].text()); if (d.format !== R.FORMAT) throw new Error('Ce fichier n\'est pas une application NEXUS'); replace(d, true); } catch (err) { toast(err.message, 'bad'); } };
  }
  async function replace(d, keepId) {
    const used = (S.D.screens || []).some((s) => s.items.length > 1) || S.D.vars.length;
    if (used && !(await A.confirmBox('Remplacer l\'application ?', `« ${S.D.name} » sera remplacée dans l'éditeur (elle reste sur le Pi si tu l'as publiée).`, 'Remplacer'))) return;
    if (!keepId) delete d.id;
    S.D = d; S.sel = null; S.scr = null; fix(); S.tab = 'design';
    changed(true);
  }

  async function drawPublish(body) {
    body.innerHTML = `<div class="grid g-2"><div class="card"><div class="card-h"><h2 class="grow">Créer l'APK</h2><span class="badge" id="as-pistate">…</span></div><div class="card-b">
        <p>Le Pi assemble l'application dans l'APK NEXUS et la signe avec la clé du labo, <b>sans compiler</b> : quelques secondes, même sur le Raspberry Pi 4.</p>
        <button class="btn primary" id="as-build" style="width:100%;min-height:48px">${icon('rocket')}Créer l'APK de « ${esc(S.D.name)} »</button>
        <div id="as-result"></div>
        <p class="hint">Sur le téléphone : ouvre le lien ou scanne le QR, puis autorise l'installation depuis cette source. Une nouvelle version s'installe par-dessus l'ancienne (même clé, même identifiant).</p></div></div>
      <div class="card"><div class="card-h"><h2 class="grow">Mes applications sur le Pi</h2><button class="btn sm" id="as-reload">${icon('refresh')}</button></div><div class="card-b flush" id="as-apps"><div class="empty">…</div></div></div></div>`;
    $('#as-build', body).onclick = build;
    $('#as-reload', body).onclick = () => drawPublish(body);
    if (S.last) showResult(S.last);
    const st = $('#as-pistate', body), apps = $('#as-apps', body);
    if (!piReady()) { st.className = 'badge warn'; st.textContent = 'Pi non configuré'; apps.innerHTML = `<div class="empty">Renseigne l'adresse et le jeton du Pi dans <a href="#companion">Compagnon Pi</a>.</div>`; return; }
    try {
      S.status = await A.piRequest('/api/v1/appstudio');
      st.className = 'badge ' + (S.status.base.ok ? 'ok' : 'warn');
      st.textContent = S.status.base.ok ? 'Pi prêt · ' + S.status.signature : 'APK de base absente';
      if (!S.status.base.ok) {
        $('#as-result', body).innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(S.status.base.reason)}.<br>Une seule fois : construis l'APK NEXUS sur un PC (<code>scripts\\build_android.bat</code>), puis envoie-la ici. En attendant, l'<b>appli web</b> fonctionne déjà.
          <label class="btn sm" style="margin-top:8px">${icon('upload')}Envoyer app-debug.apk au Pi<input type="file" accept=".apk" id="as-base" hidden></label></div></div>`;
        $('#as-base', body).onchange = async (e) => {
          const f = e.target.files[0];
          if (!f) return;
          try {
            const r = await fetch(A.piBase() + '/api/v1/appstudio/base', { method: 'POST', headers: { Authorization: 'Bearer ' + A.piToken() }, body: f });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
            toast('APK NEXUS installée sur le Pi : le Studio APK est prêt', 'ok');
            drawPublish(body);
          } catch (err) { toast('Envoi refusé : ' + err.message, 'bad', 8000); }
        };
      }
      const list = (await A.piRequest('/api/v1/appstudio/apps')).items || [];
      apps.innerHTML = list.length ? list.map((a) => `<div class="list-item"><span class="as-ico sm" style="background:${esc(a.color)}">${esc(a.icon)}</span><div class="grow"><b>${esc(a.name)}</b><div class="small muted">v${esc(a.version)} · ${esc((a.updated || '').replace('T', ' '))}${a.last_build ? ' · APK prête' : ''}</div></div>
        <button class="btn sm" data-open="${esc(a.id)}">Ouvrir</button>${a.last_build ? `<a class="btn sm" href="${esc(A.piBase() + a.last_build.apk)}" download>${icon('download')}</a>` : ''}<a class="btn sm" href="${esc(A.piBase() + '/apps/' + a.id + '/')}" target="_blank" rel="noopener" title="Appli web">${icon('globe')}</a><button class="btn sm icon ghost" data-rm="${esc(a.id)}" aria-label="Supprimer">${icon('trash')}</button></div>`).join('') : '<div class="empty">Aucune application enregistrée sur le Pi.</div>';
      $$('[data-open]', apps).forEach((b) => (b.onclick = async () => { try { const d = await A.piRequest('/api/v1/appstudio/apps/' + b.dataset.open); delete d.last_build; replace(d, true); } catch (e) { toast(e.message, 'bad'); } }));
      $$('[data-rm]', apps).forEach((b) => (b.onclick = async () => { if (!(await A.confirmBox('Supprimer du Pi', 'La conception est supprimée ; les APK déjà installées continuent de fonctionner.', 'Supprimer', true))) return; try { await piJ(`/api/v1/appstudio/apps/${b.dataset.rm}/delete`); drawPublish(body); } catch (e) { toast(e.message, 'bad'); } }));
    } catch (e) { st.className = 'badge bad'; st.textContent = 'Pi injoignable'; apps.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }
  async function build() {
    const btn = $('#as-build', S.el);
    btn.disabled = true;
    btn.innerHTML = `${icon('refresh')}Fabrication sur le Pi…`;
    try {
      const res = await publish(S.D, true);
      S.D.id = res.id;
      S.D.version = res.version + 1;
      save();
      S.last = res;
      changed();
      showResult(res);
      toast('APK prête à installer', 'ok');
    } catch (e) {
      $('#as-result', S.el).innerHTML = `<div class="banner warn">${icon('alert')}<div><b>APK non créée.</b> ${esc(e.message)}</div></div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${icon('rocket')}Créer l'APK de « ${esc(S.D.name)} »`;
    }
  }
  async function showResult(res) {
    const box = $('#as-result', S.el);
    if (!box) return;
    box.innerHTML = `<div class="as-done"><div class="as-qr" id="as-qr"><span class="muted small">QR…</span></div><div class="grow">
      <b>${esc(res.package)}</b> · v${esc(res.version)} · ${(res.size / 1024).toFixed(0)} Ko · signature ${esc(res.signature)}
      <a class="btn primary" href="${esc(res.apk_url)}" download style="margin:8px 0;width:100%">${icon('download')}Télécharger l'APK</a>
      <div class="row"><input class="input sm mono grow" readonly value="${esc(res.apk_url)}" id="as-link"><button class="btn sm" id="as-copy">${icon('copy')}</button></div>
      <div class="small" style="margin-top:6px">Appli web (sans installer) : <a href="${esc(res.web_url)}" target="_blank" rel="noopener">${esc(res.web_url)}</a></div>
      <div class="tiny muted mono">SHA-256 ${esc(res.sha256.slice(0, 16))}…</div></div></div>`;
    $('#as-copy', box).onclick = () => { const i = $('#as-link', box); i.select(); try { navigator.clipboard.writeText(i.value); } catch (e) { document.execCommand('copy'); } toast('Lien copié', 'ok'); };
    const url = await qrUrl(res);
    const q = $('#as-qr', box);
    if (q) q.innerHTML = url ? `<img src="${url}" alt="QR de téléchargement">` : '<span class="small muted">QR indisponible (python3-qrcode absent sur le Pi)</span>';
  }

  async function loadFeeds() { try { const f = await A.api('/api/feeds'); S.feeds = Array.isArray(f) ? f : []; } catch (e) { S.feeds = []; } }

  /* ------------------------------------------------------------------ liaisons des champs */
  function bindFields(el) {
    const onEdit = (e) => {
      const t = e.target;
      if (!t.dataset || !t.dataset.p) return;
      const path = JSON.parse(t.dataset.p);
      let v = t.value;
      if (v === '__new') {
        const used = new Set(S.D.vars.map((x) => x.name));
        A.modal({ title: 'Nouvelle variable', input: ident('valeur', new Set(used)), label: 'Nom (lettres, chiffres, _)', ok: 'Créer' }).then((name) => {
          if (!name) { draw(); return; }
          const n = ident(name, used);
          S.D.vars.push({ name: n, source: 'local', type: 'number', default: 0, unit: '' });
          setP(path, n);
          changed(true);
        });
        return;
      }
      if ('num' in t.dataset) v = v === '' ? '' : Number(v);
      const last = path[path.length - 1];
      if (path[0] === 'vars' && last === 'name') { // renommer partout
        const old = getP(path);
        v = String(v).replace(/[^A-Za-z0-9_]/g, '_').slice(0, 32);
        if (!/^[A-Za-z_]/.test(v) || S.D.vars.some((x, i) => i !== path[1] && x.name === v)) { if (e.type === 'change') { toast('Nom invalide ou déjà pris', 'warn'); draw(); } return; }
        renameVar(old, v);
      }
      setP(path, v);
      if (path.length === 1 && last === 'name' && !S.D.id) { /* l'identifiant suit le nom tant qu'il n'est pas publié */ }
      const restruct = 'restruct' in t.dataset || (path[0] === 'vars' && last === 'source') || (path[0] === 'screens' && last === 'title');
      if (e.type === 'change' || !restruct) changed(restruct && e.type === 'change');
    };
    el.addEventListener('input', (e) => { if (e.target.tagName !== 'SELECT') onEdit(e); });
    el.addEventListener('change', onEdit);
    el.addEventListener('click', (e) => {
      const add = e.target.closest('[data-addact]'), del = e.target.closest('[data-delact]'), clr = e.target.closest('[data-clear]');
      if (add) { const list = getP(JSON.parse(add.dataset.addact)) || []; list.push({ a: 'notify', text: 'Bonjour' }); setP(JSON.parse(add.dataset.addact), list); changed(true); }
      if (del) { getP(JSON.parse(del.dataset.delact)).splice(Number(del.dataset.i), 1); changed(true); }
      if (clr) { setP(JSON.parse(clr.dataset.clear), ''); changed(true); }
    });
  }
  function renameVar(old, nu) {
    if (!old || old === nu) return;
    const re = new RegExp('\\{' + old + '(_ip)?\\}', 'g');
    const walk = (o) => {
      if (Array.isArray(o)) return o.forEach(walk);
      if (!o || typeof o !== 'object') return;
      Object.keys(o).forEach((k) => {
        if (typeof o[k] === 'string') { if (['var', 'var_x', 'var_y'].includes(k) && o[k] === old) o[k] = nu; else o[k] = o[k].replace(re, (m, ip) => '{' + nu + (ip || '') + '}'); } else walk(o[k]);
      });
    };
    walk(S.D.screens); walk(S.D.rules);
  }

  /* ------------------------------------------------------------------ page */
  A.page({
    id: 'apkstudio', title: 'Studio APK', short: 'APK', icon: 'phone', group: 'build', mobile: true,
    desc: 'Crée ton application Android sans coder : écrans, capteurs, blocs, lien direct',
    render(el, q) {
      if (!R) { el.innerHTML = '<div class="banner warn">Moteur d\'application absent.</div>'; return null; }
      S.el = el;
      if (!S.D) load();
      el.classList.add('as-page');
      bindFields(el);
      A.setTopActions(`<button class="btn" data-act="as-new">${icon('plus')}<span class="lbl">Nouvelle</span></button><button class="btn primary" data-act="as-publish">${icon('rocket')}<span class="lbl">Créer l'APK</span></button>`);
      draw();
      start(q);
      // nettoyage à la sortie de la page : le mode test interroge le MASTER toutes les 2 s
      return () => { if (S.inst) { S.inst.destroy(); S.inst = null; } S.el = null; };
    }
  });
  async function start(q) {
      await loadFeeds();
      if (q && q.p) {
        try {
          const p = A.projectById && A.projectById(q.p);
          let spec = p && p.spec;
          if (!spec && piReady()) { const r = await A.piRequest('/api/v1/patricia/memory'); const pp = (r.projects || []).find((x) => x.id === q.p); if (pp) spec = { title: pp.title, board: pp.board || 'esp32', modules: (pp.modules || []).map((id) => ({ id })) }; }
          if (spec) { S.D = fromSpec(spec, (p && p.title) || spec.title); S.sel = null; S.scr = null; fix(); save(); toast('Application préparée depuis le projet', 'ok'); }
        } catch (e) { toast('Projet non chargé : ' + e.message, 'warn'); }
        history.replaceState(null, '', '#apkstudio');
      }
      if (S.el) draw();
  }
  Object.assign(A.actions, {
    'as-new': () => { S.tab = 'settings'; draw(); },
    'as-publish': () => { S.tab = 'publish'; draw(); setTimeout(() => { const b = $('#as-build', S.el); if (b) b.click(); }, 50); }
  });
  A.commands.push({ title: 'Créer une application Android (Studio APK)', group: 'Action', icon: 'phone', run: () => A.go('apkstudio') });
})();
