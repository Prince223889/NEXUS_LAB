/* NEXUS App Runtime — moteur des applications du Studio APK.
 * Un seul fichier, sans dépendance, utilisé à l'identique par :
 *   - l'aperçu et le mode test du Studio APK (interface du MASTER),
 *   - l'APK Android (assets/player/runtime.js, copie synchronisée par scripts/sync_app_runtime.py),
 *   - l'appli web servie par le Pi (/apps/<id>/).
 * Ce que tu vois dans l'aperçu est donc exactement ce que fera l'application. */
(function () {
  'use strict';
  const R = (window.NexusAppRuntime = window.NexusAppRuntime || {});
  R.VERSION = '1.0.0';
  R.FORMAT = 'nexus-app/1';

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const num = (v, d) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  /* ------------------------------------------------------------------ catalogue des composants */
  // [clé, libellé, type d'éditeur, valeur par défaut]. Types : text, textarea, number, color, var, select:a=A|b=B, bool, actions
  const WIDTH = ['width', 'Largeur', 'select:full=Pleine|half=Moitié', 'full'];
  R.COMPONENTS = {
    title: { label: 'Titre', icon: 'T', group: 'Affichage', props: [['text', 'Texte', 'text', 'Mon application'], ['sub', 'Sous-titre', 'text', '']] },
    text: { label: 'Texte', icon: '¶', group: 'Affichage', props: [['text', 'Texte (mets {variable} pour afficher une valeur)', 'textarea', 'Bonjour !'], ['size', 'Taille', 'select:s=Petit|m=Moyen|l=Grand', 'm'], WIDTH] },
    value: { label: 'Valeur', icon: '42', group: 'Capteurs', props: [['label', 'Libellé', 'text', 'Température'], ['var', 'Variable', 'var', ''], ['unit', 'Unité', 'text', ''], ['decimals', 'Décimales', 'number', 1], ['warn', 'Orange au-dessus de', 'number', ''], ['alarm', 'Rouge au-dessus de', 'number', ''], ['width', 'Largeur', 'select:full=Pleine|half=Moitié', 'half']] },
    gauge: { label: 'Jauge', icon: '◔', group: 'Capteurs', props: [['label', 'Libellé', 'text', 'Humidité'], ['var', 'Variable', 'var', ''], ['min', 'Minimum', 'number', 0], ['max', 'Maximum', 'number', 100], ['unit', 'Unité', 'text', '%'], ['width', 'Largeur', 'select:full=Pleine|half=Moitié', 'half']] },
    chart: { label: 'Courbe', icon: '〽', group: 'Capteurs', props: [['label', 'Libellé', 'text', 'Évolution'], ['var', 'Variable', 'var', ''], ['points', 'Points affichés', 'number', 60], WIDTH] },
    led: { label: 'Voyant', icon: '●', group: 'Capteurs', props: [['label', 'Libellé', 'text', 'Alerte'], ['var', 'Variable', 'var', ''], ['op', 'S\'allume si', 'select:gt=est supérieure à|lt=est inférieure à|eq=est égale à|on=est vraie (1)', 'gt'], ['value', 'Valeur', 'text', '0'], ['color', 'Couleur', 'color', '#ef4444'], ['width', 'Largeur', 'select:full=Pleine|half=Moitié', 'half']] },
    button: { label: 'Bouton', icon: '▭', group: 'Commandes', props: [['text', 'Texte', 'text', 'Appuie'], ['color', 'Couleur', 'color', ''], ['style', 'Style', 'select:fill=Plein|outline=Contour', 'fill'], WIDTH, ['do', 'Quand on appuie', 'actions', []]] },
    switch: { label: 'Interrupteur', icon: '⏻', group: 'Commandes', props: [['label', 'Libellé', 'text', 'Lampe'], ['var', 'Variable (1 / 0)', 'var', ''], WIDTH, ['do', 'Quand on allume', 'actions', []], ['off', 'Quand on éteint', 'actions', []]] },
    slider: { label: 'Curseur', icon: '⇔', group: 'Commandes', props: [['label', 'Libellé', 'text', 'Vitesse'], ['var', 'Variable', 'var', ''], ['min', 'Minimum', 'number', 0], ['max', 'Maximum', 'number', 100], ['step', 'Pas', 'number', 1], WIDTH, ['do', 'Quand on relâche', 'actions', []]] },
    input: { label: 'Saisie', icon: '⌨', group: 'Commandes', props: [['label', 'Libellé', 'text', 'Message'], ['var', 'Variable', 'var', ''], ['placeholder', 'Indication', 'text', ''], ['kind', 'Type', 'select:text=Texte|number=Nombre', 'text'], WIDTH, ['do', 'Quand on valide', 'actions', []]] },
    joystick: { label: 'Joystick', icon: '✥', group: 'Commandes', props: [['var_x', 'Variable X (-100…100)', 'var', ''], ['var_y', 'Variable Y (-100…100)', 'var', ''], ['do', 'Quand il bouge (5 fois/s)', 'actions', []]] },
    image: { label: 'Image', icon: '🖼', group: 'Affichage', props: [['emoji', 'Emoji ou symbole', 'text', '🌱'], ['size', 'Taille (px)', 'number', 64], ['caption', 'Légende', 'text', ''], WIDTH] },
    link: { label: 'Lien', icon: '↗', group: 'Affichage', props: [['text', 'Texte', 'text', 'Ouvrir la page de l\'appareil'], ['url', 'Adresse', 'text', 'http://192.168.4.20/'], WIDTH] },
    spacer: { label: 'Espace', icon: '↕', group: 'Affichage', props: [['size', 'Hauteur (px)', 'number', 16]] }
  };
  R.ACTIONS = {
    set: { label: 'Mettre une variable à', fields: [['var', 'Variable', 'var'], ['value', 'Valeur ou calcul ({x} + 1)', 'text']] },
    toggle: { label: 'Inverser une variable (0 ↔ 1)', fields: [['var', 'Variable', 'var']] },
    http: { label: 'Envoyer une requête à un appareil', fields: [['method', 'Méthode', 'select:GET=GET|POST=POST'], ['url', 'Adresse ({variables} permises)', 'text'], ['body', 'Corps (POST)', 'text']] },
    job: { label: 'Lancer un job du MASTER', fields: [['type', 'Job', 'select:PING=Ping|SYSTEM_TEST=Check-up|I2C_SCAN=Scan I2C|WIFI_SCAN=Scan Wi-Fi|IDENTIFY=Faire clignoter|BENCHMARK=Benchmark|ADC_READ=Voltmètre|GPIO_TEST=Test des broches|ONEWIRE_SCAN=Scan 1-Wire|LOGIC_SAMPLE=Analyseur logique|PWM_GEN=Générateur PWM|SERVO_SWEEP=Balayage servo|TONE_TEST=Test buzzer'], ['worker', 'Worker (0 = auto)', 'number']] },
    goto: { label: 'Aller à l\'écran', fields: [['screen', 'Écran', 'screen']] },
    speak: { label: 'Dire à voix haute', fields: [['text', 'Texte ({variables} permises)', 'text']] },
    listen: { label: 'Écouter la voix dans une variable', fields: [['var', 'Variable', 'var']] },
    notify: { label: 'Afficher un message', fields: [['text', 'Message', 'text']] },
    vibrate: { label: 'Vibrer', fields: [['ms', 'Durée (ms)', 'number']] }
  };
  R.WHEN = {
    start: { label: 'Au démarrage' },
    timer: { label: 'Toutes les N secondes', fields: [['every', 'Secondes', 'number']] },
    above: { label: 'Quand une variable dépasse', fields: [['var', 'Variable', 'var'], ['value', 'Seuil', 'text']] },
    below: { label: 'Quand une variable passe sous', fields: [['var', 'Variable', 'var'], ['value', 'Seuil', 'text']] },
    equals: { label: 'Quand une variable devient égale à', fields: [['var', 'Variable', 'var'], ['value', 'Valeur', 'text']] },
    change: { label: 'Quand une variable change', fields: [['var', 'Variable', 'var']] },
    screen: { label: 'À l\'ouverture d\'un écran', fields: [['screen', 'Écran', 'screen']] }
  };

  R.blank = function (name) {
    return {
      format: R.FORMAT, id: '', name: name || 'Mon application', version: 1, icon: '📱', color: '#2f7cf6', theme: 'auto',
      s3: 'http://192.168.4.1', description: '', vars: [],
      screens: [{ id: 'accueil', title: 'Accueil', items: [{ id: 'c1', type: 'title', text: name || 'Mon application', sub: 'Créée avec NEXUS LAB' }] }],
      rules: []
    };
  };
  R.newItem = function (type, design) {
    const meta = R.COMPONENTS[type];
    const used = new Set();
    (design.screens || []).forEach((s) => (s.items || []).forEach((i) => used.add(i.id)));
    let n = 1;
    while (used.has('c' + n)) n++;
    const it = { id: 'c' + n, type };
    meta.props.forEach(([k, , kind, def]) => { it[k] = kind === 'actions' ? [] : def; });
    return it;
  };

  /* ------------------------------------------------------------------ calculs sûrs ({x} * 1.8 + 32) */
  function calc(src) {
    const s = String(src).replace(/\s+/g, '');
    let i = 0;
    const peek = () => s[i];
    function atom() {
      if (peek() === '(') { i++; const v = add(); if (s[i++] !== ')') throw 0; return v; }
      if (peek() === '-') { i++; return -atom(); }
      const m = /^\d+(?:\.\d+)?/.exec(s.slice(i));
      if (!m) throw 0;
      i += m[0].length;
      return parseFloat(m[0]);
    }
    function mul() { let v = atom(); while (peek() === '*' || peek() === '/' || peek() === '%') { const o = s[i++], r = atom(); v = o === '*' ? v * r : o === '/' ? v / r : v % r; } return v; }
    function add() { let v = mul(); while (peek() === '+' || peek() === '-') { const o = s[i++], r = mul(); v = o === '+' ? v + r : v - r; } return v; }
    const v = add();
    if (i !== s.length) throw 0;
    return v;
  }
  R.calc = calc;

  /* ------------------------------------------------------------------ réseau */
  function nativeNet() {
    const pending = {};
    let seq = 0;
    window.__nexusHttp = (id, status, text) => { const p = pending[id]; if (!p) return; delete pending[id]; status ? p.ok({ status, text }) : p.ko(new Error(text || 'réseau injoignable')); };
    return (method, url, body) => new Promise((ok, ko) => {
      const id = 'h' + (++seq);
      pending[id] = { ok, ko };
      setTimeout(() => { if (pending[id]) { delete pending[id]; ko(new Error('délai dépassé')); } }, 9000);
      window.NexusNative.http(id, method, url, body || '');
    });
  }
  function fetchNet(proxy) {
    return async (method, url, body) => {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
      try {
        const sameOrigin = !/^https?:/i.test(url) || url.indexOf(location.origin + '/') === 0;
        let r;
        if (proxy && !sameOrigin) {
          r = await fetch(proxy, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, url, body: body || '' }), signal: ctl.signal });
        } else {
          const opt = { method, signal: ctl.signal };
          if (body && method !== 'GET') { opt.body = body; opt.headers = { 'Content-Type': /^[[{]/.test(body.trim()) ? 'application/json' : 'application/x-www-form-urlencoded' }; }
          r = await fetch(url, opt);
        }
        return { status: r.status, text: await r.text() };
      } catch (e) {
        throw new Error(e.name === 'AbortError' ? 'délai dépassé' : 'injoignable (ou bloqué par le navigateur : teste dans l\'APK)');
      } finally { clearTimeout(t); }
    };
  }
  R.net = function (opts) {
    if (opts && typeof opts.net === 'function') return opts.net;
    if (window.NexusNative && window.NexusNative.player && window.NexusNative.player()) return nativeNet();
    return fetchNet(opts && opts.proxy);
  };

  /* ------------------------------------------------------------------ styles (injectés une seule fois) */
  const CSS = `
.nxa{--a:#2f7cf6;--bg:#f4f6fb;--card:#fff;--fg:#141b2b;--mut:#6a7487;--line:#e2e7f0;--ok:#16a34a;--warn:#f59e0b;--bad:#ef4444;
 font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--fg);background:var(--bg);display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;position:relative}
.nxa[data-theme=dark]{--bg:#0f1522;--card:#18212f;--fg:#e8edf6;--mut:#94a0b6;--line:#263246}
@media (prefers-color-scheme:dark){.nxa[data-theme=auto]{--bg:#0f1522;--card:#18212f;--fg:#e8edf6;--mut:#94a0b6;--line:#263246}}
.nxa *{box-sizing:border-box}
.nxa-top{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--a);color:#fff;flex:none}
.nxa-top b{font-size:17px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nxa-top .nxa-ic{font-size:22px;line-height:1}
.nxa-top button{background:rgba(255,255,255,.18);border:0;color:#fff;border-radius:10px;min-width:34px;height:34px;font-size:17px;cursor:pointer}
.nxa-dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.45);flex:none}
.nxa-dot.on{background:#6ff0a6;box-shadow:0 0 0 3px rgba(111,240,166,.25)}
.nxa-body{flex:1;overflow:auto;padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;align-content:start}
.nxa-item{grid-column:span 2;min-width:0}
.nxa-item.half{grid-column:span 1}
.nxa-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px}
.nxa-lbl{font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
.nxa-big{font-size:30px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}
.nxa-big small{font-size:14px;font-weight:500;color:var(--mut);margin-left:3px}
.nxa-big.warn{color:var(--warn)}.nxa-big.bad{color:var(--bad)}
.nxa-h1{font-size:24px;font-weight:750;margin:4px 2px 0}.nxa-h1+div{color:var(--mut);margin:2px 2px 4px}
.nxa-t{white-space:pre-wrap;margin:2px}.nxa-t.s{font-size:13px;color:var(--mut)}.nxa-t.l{font-size:19px;font-weight:600}
.nxa-btn{width:100%;min-height:50px;border-radius:14px;border:2px solid var(--bc,var(--a));background:var(--bc,var(--a));color:#fff;font:600 16px system-ui,sans-serif;cursor:pointer;touch-action:manipulation;transition:transform .08s}
.nxa-btn.outline{background:transparent;color:var(--bc,var(--a))}
.nxa-btn:active{transform:scale(.97)}
.nxa-row{display:flex;align-items:center;gap:10px}
.nxa-sw{margin-left:auto;width:54px;height:32px;border-radius:20px;background:var(--line);position:relative;border:0;cursor:pointer;flex:none;transition:background .15s}
.nxa-sw::after{content:"";position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .15s}
.nxa-sw.on{background:var(--a)}.nxa-sw.on::after{left:25px}
.nxa input[type=range]{width:100%;accent-color:var(--a)}
.nxa-in{display:flex;gap:6px}.nxa-in input{flex:1;min-width:0;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:10px;padding:10px;font:inherit}
.nxa-in button{border:0;background:var(--a);color:#fff;border-radius:10px;padding:0 14px;font:inherit;cursor:pointer}
.nxa-led{width:22px;height:22px;border-radius:50%;background:var(--line);margin-left:auto;flex:none;transition:all .2s}
.nxa-img{text-align:center}.nxa-img div{line-height:1.1}
.nxa-joy{width:180px;height:180px;margin:6px auto;border-radius:50%;background:radial-gradient(circle,var(--card) 0,var(--bg) 100%);border:2px solid var(--line);position:relative;touch-action:none}
.nxa-joy i{position:absolute;width:64px;height:64px;border-radius:50%;background:var(--a);left:58px;top:58px;box-shadow:0 4px 12px rgba(0,0,0,.25)}
.nxa-tabs{display:flex;background:var(--card);border-top:1px solid var(--line);flex:none}
.nxa-tabs button{flex:1;border:0;background:none;padding:10px 4px 12px;color:var(--mut);font:600 12px system-ui,sans-serif;cursor:pointer}
.nxa-tabs button.on{color:var(--a)}
.nxa-toast{position:absolute;left:50%;bottom:70px;transform:translateX(-50%);background:rgba(20,27,43,.92);color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;max-width:86%;text-align:center;pointer-events:none;animation:nxaf 2.6s forwards}
@keyframes nxaf{0%{opacity:0;transform:translate(-50%,8px)}10%,80%{opacity:1;transform:translate(-50%,0)}100%{opacity:0}}
.nxa-empty{grid-column:span 2;text-align:center;color:var(--mut);padding:40px 10px;border:2px dashed var(--line);border-radius:16px}
.nxa-sheet{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end}
.nxa-sheet>div{background:var(--card);width:100%;border-radius:18px 18px 0 0;padding:18px;display:grid;gap:10px}
.nxa-sheet input{border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:10px;padding:10px;font:inherit}
.nxa.design .nxa-item{cursor:pointer;position:relative;outline:2px dashed transparent;outline-offset:3px;border-radius:16px}
.nxa.design .nxa-item:hover{outline-color:rgba(127,140,160,.5)}
.nxa.design .nxa-item.sel{outline:2px solid var(--a)}
.nxa.design .nxa-item.drop{box-shadow:0 -4px 0 var(--a)}
.nxa.design .nxa-item *{pointer-events:none}
`;
  function injectCss() {
    if (document.getElementById('nxa-css')) return;
    const st = document.createElement('style');
    st.id = 'nxa-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ application */
  R.mount = function (root, design, opts) {
    opts = opts || {};
    injectCss();
    const design_ = JSON.parse(JSON.stringify(design));
    const D = design_, mode = opts.mode || 'run', live = mode === 'run';
    const net = R.net(opts);
    const vars = {}, hist = {}, meta = {}, timers = [], edges = {};
    const varDef = {};
    let screen = opts.screen && D.screens.some((s) => s.id === opts.screen) ? opts.screen : (D.screens[0] || {}).id;
    const back = [];
    let updaters = [], destroyed = false, online = false;
    const log = (msg, kind) => { if (opts.log) opts.log(msg, kind || 'info'); };
    let s3 = (opts.s3 != null ? opts.s3 : D.s3 || '').replace(/\/+$/, '');

    (D.vars || []).forEach((v) => {
      varDef[v.name] = v;
      vars[v.name] = v.type === 'number' ? num(v.default, 0) : v.type === 'bool' ? (v.default === true || v.default === 1 || v.default === '1' ? 1 : 0) : String(v.default == null ? '' : v.default);
      hist[v.name] = [];
    });
    if (opts.sample) Object.keys(opts.sample).forEach((k) => {
      if (!(k in vars)) return;
      vars[k] = opts.sample[k];
      // aperçu : une petite courbe plausible autour de la valeur d'exemple
      if (typeof vars[k] === 'number') for (let i = 0; i < 40; i++) hist[k].push(vars[k] * (1 + 0.04 * Math.sin(i / 4) + 0.015 * Math.sin(i * 1.7)));
    });

    function fmt(name, decimals) {
      const v = name in vars ? vars[name] : meta[name];
      if (v == null || v === '') return '—';
      if (typeof v === 'number') return decimals != null && decimals !== '' ? v.toFixed(Math.max(0, Math.min(6, num(decimals, 1)))) : String(Math.round(v * 1000) / 1000);
      return String(v);
    }
    const tpl = (s) => String(s == null ? '' : s).replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, k) => (k in vars || k in meta ? fmt(k) : m));
    function evalValue(s, name) {
      const t = tpl(s).trim();
      const def = varDef[name] || {};
      if (def.type !== 'text' && /^[\d\s.+\-*/%()]+$/.test(t)) { try { return calc(t); } catch (e) { /* texte */ } }
      if (def.type === 'bool') return /^(1|true|vrai|on|oui)$/i.test(t) ? 1 : 0;
      return def.type === 'number' && isFinite(parseFloat(t)) ? parseFloat(t) : t;
    }

    function setVar(name, value, quiet) {
      if (!(name in vars)) return;
      const def = varDef[name] || {};
      if (def.type === 'number' && typeof value !== 'number') { const n = parseFloat(value); value = isFinite(n) ? n : vars[name]; }
      const old = vars[name];
      vars[name] = value;
      if (typeof value === 'number') { const hh = hist[name]; hh.push(value); if (hh.length > 300) hh.shift(); }
      if (!quiet) refresh();
      if (old !== value && live) fireVar(name, old, value);
    }
    function refresh() { updaters.forEach((u) => { try { u(); } catch (e) { /* composant */ } }); }

    /* --- blocs « quand » */
    function fireVar(name, old, value) {
      (D.rules || []).forEach((r, i) => {
        const w = r.when;
        if (w.var !== name) return;
        let hit = false;
        if (w.type === 'change') hit = true;
        else {
          const th = evalValue(w.value, name);
          const cond = w.type === 'above' ? value > th : w.type === 'below' ? value < th : String(value) === String(th);
          hit = cond && !edges[i];
          edges[i] = cond;
        }
        if (hit) run(r.do, 'bloc « quand »');
      });
    }

    /* --- actions */
    async function run(list, where) {
      for (const a of list || []) {
        if (destroyed) return;
        try { await act(a); } catch (e) { log((where ? where + ' : ' : '') + (R.ACTIONS[a.a] || {}).label + ' — ' + e.message, 'bad'); }
      }
    }
    function toast(text) {
      if (window.NexusNative && window.NexusNative.toast && live && opts.native !== false) { window.NexusNative.toast(text); return; }
      const t = h(`<div class="nxa-toast">${esc(text)}</div>`);
      app.appendChild(t);
      setTimeout(() => t.remove(), 2700);
    }
    async function act(a) {
      if (!live) return;
      switch (a.a) {
        case 'set': setVar(a.var, evalValue(a.value, a.var)); break;
        case 'toggle': setVar(a.var, vars[a.var] && vars[a.var] !== '0' ? 0 : 1); break;
        case 'goto': go(a.screen, true); break;
        case 'notify': toast(tpl(a.text)); break;
        case 'vibrate':
          if (window.NexusNative && window.NexusNative.vibrate) window.NexusNative.vibrate(num(a.ms, 200));
          else if (navigator.vibrate) navigator.vibrate(num(a.ms, 200));
          break;
        case 'speak': {
          const text = tpl(a.text);
          if (window.NexusNative && window.NexusNative.speak) window.NexusNative.speak(text);
          else if (window.speechSynthesis) { const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; speechSynthesis.cancel(); speechSynthesis.speak(u); }
          break;
        }
        case 'listen': setVar(a.var, await listen()); break;
        case 'http': {
          const url = tpl(a.url), body = a.body ? tpl(a.body) : '';
          const r = await net(a.method || 'GET', url, body);
          log(`${a.method || 'GET'} ${url} → ${r.status}`, r.status < 400 ? 'ok' : 'bad');
          if (r.status >= 400) throw new Error('réponse ' + r.status);
          break;
        }
        case 'job': {
          const body = `type=${encodeURIComponent(a.type || 'PING')}&priority=50&worker=${num(a.worker, 0)}`;
          const r = await net('POST', s3 + '/api/job', body);
          if (r.status >= 400) throw new Error('le MASTER a refusé (' + r.status + ')');
          toast('Job ' + (a.type || 'PING') + ' envoyé');
          break;
        }
      }
    }
    function listen() {
      return new Promise((ok, ko) => {
        if (window.NexusNative && window.NexusNative.listen) {
          window.__nexusVoice = (good, text) => (good ? ok(text) : ko(new Error(text)));
          window.NexusNative.listen('fr-FR');
          return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { ko(new Error('reconnaissance vocale absente ici')); return; }
        const rec = new SR();
        rec.lang = 'fr-FR';
        rec.onresult = (e) => ok(e.results[0][0].transcript);
        rec.onerror = (e) => ko(new Error(e.error || 'micro'));
        rec.start();
      });
    }

    /* --- sources de données */
    async function pollFeeds() {
      const feedVars = (D.vars || []).filter((v) => v.source === 'feed');
      if (!feedVars.length || destroyed) return;
      try {
        const r = await net('GET', s3 + '/api/feeds');
        const feeds = JSON.parse(r.text);
        setOnline(true);
        feedVars.forEach((v) => {
          const [a, b] = v.feed.indexOf('/') > 0 ? v.feed.split('/') : [null, v.feed];
          const f = (Array.isArray(feeds) ? feeds : []).find((x) => x.key === b && (!a || x.source === a));
          if (f && f.age_ms < 120000) { meta[v.name + '_ip'] = f.ip; setVar(v.name, num(f.value, vars[v.name]), true); }
        });
        refresh();
      } catch (e) { setOnline(false); }
    }
    async function pollHttp(v) {
      try {
        const r = await net('GET', tpl(v.url));
        let val = r.text;
        try {
          let o = JSON.parse(r.text);
          if (v.path) v.path.split('.').forEach((k) => { o = o == null ? o : Array.isArray(o) && !/^\d+$/.test(k) ? o.find((x) => x && (x.label === k || x.key === k || x.name === k)) : o[k]; });
          val = o && typeof o === 'object' && 'value' in o ? o.value : o;
        } catch (e) { /* texte brut */ }
        setVar(v.name, typeof val === 'object' ? JSON.stringify(val) : val);
      } catch (e) { log(`${v.name} : ${e.message}`, 'bad'); }
    }
    function setOnline(on) { online = on; const d = app.querySelector('.nxa-dot'); if (d) d.classList.toggle('on', on); }

    /* --- rendu */
    const app = h(`<div class="nxa ${mode === 'design' ? 'design' : ''}" data-theme="${esc(D.theme || 'auto')}"></div>`);
    app.style.setProperty('--a', /^#[0-9a-f]{6}$/i.test(D.color || '') ? D.color : '#2f7cf6');
    root.innerHTML = '';
    root.appendChild(app);

    function go(id, push) {
      if (!D.screens.some((s) => s.id === id)) return;
      if (push && id !== screen) back.push(screen);
      screen = id;
      render();
      if (live) (D.rules || []).forEach((r) => { if (r.when.type === 'screen' && r.when.screen === id) run(r.do, 'ouverture d\'écran'); });
      if (opts.onScreen) opts.onScreen(id);
    }

    function render() {
      updaters = [];
      const scr = D.screens.find((s) => s.id === screen) || D.screens[0];
      if (!scr) { app.innerHTML = '<div class="nxa-body"><div class="nxa-empty">Aucun écran</div></div>'; return; }
      const multi = D.screens.length > 1;
      app.innerHTML = `<div class="nxa-top">${back.length && live ? '<button data-back aria-label="Retour">‹</button>' : `<span class="nxa-ic">${esc(D.icon || '📱')}</span>`}
        <b>${esc(multi ? scr.title : D.name)}</b><span class="nxa-dot${online ? ' on' : ''}" title="MASTER"></span>${live && opts.settings !== false ? '<button data-set aria-label="Réglages">⚙</button>' : ''}</div>
        <div class="nxa-body"></div>${multi ? `<nav class="nxa-tabs">${D.screens.map((s) => `<button data-tab="${esc(s.id)}" class="${s.id === scr.id ? 'on' : ''}">${esc(s.title)}</button>`).join('')}</nav>` : ''}`;
      const body = app.querySelector('.nxa-body');
      if (!scr.items.length) body.innerHTML = `<div class="nxa-empty">${mode === 'design' ? 'Glisse des composants ici depuis la palette' : 'Écran vide'}</div>`;
      scr.items.forEach((it) => {
        const wrap = h(`<div class="nxa-item ${it.width === 'half' ? 'half' : ''}" data-id="${esc(it.id)}"></div>`);
        if (mode === 'design') { wrap.draggable = true; if (opts.selected === it.id) wrap.classList.add('sel'); }
        try { build(it, wrap); } catch (e) { wrap.innerHTML = `<div class="nxa-card">⚠ ${esc(it.type)}</div>`; }
        body.appendChild(wrap);
      });
      app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { back.length = 0; go(b.dataset.tab, false); }));
      const bb = app.querySelector('[data-back]');
      if (bb) bb.onclick = () => goBack();
      const sb = app.querySelector('[data-set]');
      if (sb) sb.onclick = settings;
      refresh();
    }
    function goBack() { if (!back.length) return false; screen = back.pop(); render(); return true; }

    function build(it, wrap) {
      const card = (inner) => { wrap.innerHTML = `<div class="nxa-card">${inner}</div>`; return wrap.firstElementChild; };
      switch (it.type) {
        case 'title': {
          wrap.innerHTML = `<div class="nxa-h1"></div>${it.sub ? '<div></div>' : ''}`;
          const [t1, t2] = wrap.children;
          updaters.push(() => { t1.textContent = tpl(it.text); if (t2) t2.textContent = tpl(it.sub); });
          break;
        }
        case 'text': { wrap.innerHTML = `<div class="nxa-t ${esc(it.size || 'm')}"></div>`; const t = wrap.firstElementChild; updaters.push(() => { t.textContent = tpl(it.text); }); break; }
        case 'spacer': wrap.style.height = Math.max(0, Math.min(200, num(it.size, 16))) + 'px'; if (mode === 'design') wrap.style.outline = '1px dashed rgba(127,140,160,.35)'; break;
        case 'image': wrap.innerHTML = `<div class="nxa-img"><div style="font-size:${Math.max(16, Math.min(200, num(it.size, 64)))}px">${esc(it.emoji || '🖼')}</div>${it.caption ? `<div class="nxa-t s">${esc(it.caption)}</div>` : ''}</div>`; break;
        case 'link': { wrap.innerHTML = `<button class="nxa-btn outline">${esc(it.text || 'Ouvrir')} ↗</button>`; wrap.firstElementChild.onclick = () => { if (live) window.open(tpl(it.url), '_blank'); }; break; }
        case 'value': {
          const c = card(`<div class="nxa-lbl">${esc(it.label)}</div><div class="nxa-big"></div>`), big = c.lastElementChild;
          updaters.push(() => {
            const v = vars[it.var];
            big.innerHTML = `${esc(it.var ? fmt(it.var, it.decimals) : '—')}<small>${esc(it.unit || (varDef[it.var] || {}).unit || '')}</small>`;
            big.className = 'nxa-big' + (it.alarm !== '' && it.alarm != null && v > num(it.alarm, Infinity) ? ' bad' : it.warn !== '' && it.warn != null && v > num(it.warn, Infinity) ? ' warn' : '');
          });
          break;
        }
        case 'gauge': {
          const c = card(`<div class="nxa-lbl">${esc(it.label)}</div><svg viewBox="0 0 120 70" style="width:100%;max-height:120px"><path d="M10 64 A50 50 0 0 1 110 64" fill="none" stroke="var(--line)" stroke-width="11" stroke-linecap="round"/><path class="g" d="M10 64 A50 50 0 0 1 110 64" fill="none" stroke="var(--a)" stroke-width="11" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/><text x="60" y="60" text-anchor="middle" font-size="19" font-weight="700" fill="currentColor"></text></svg>`);
          const g = c.querySelector('.g'), tx = c.querySelector('text');
          updaters.push(() => {
            const mn = num(it.min, 0), mx = num(it.max, 100), v = num(vars[it.var], mn);
            const p = Math.max(0, Math.min(100, ((v - mn) / (mx - mn || 1)) * 100));
            g.setAttribute('stroke-dasharray', `${p} 100`);
            tx.textContent = fmt(it.var, 0) + (it.unit || '');
          });
          break;
        }
        case 'chart': {
          const c = card(`<div class="nxa-lbl">${esc(it.label)} <span style="float:right"></span></div><svg viewBox="0 0 300 90" preserveAspectRatio="none" style="width:100%;height:90px"><polyline fill="none" stroke="var(--a)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`);
          const pl = c.querySelector('polyline'), last = c.querySelector('span');
          updaters.push(() => {
            const pts = (hist[it.var] || []).slice(-Math.max(5, Math.min(300, num(it.points, 60))));
            last.textContent = it.var ? fmt(it.var) + ((varDef[it.var] || {}).unit || '') : '';
            if (pts.length < 2) { pl.setAttribute('points', ''); return; }
            const mn = Math.min(...pts), mx = Math.max(...pts), span = mx - mn || 1;
            pl.setAttribute('points', pts.map((v, i) => `${(i / (pts.length - 1)) * 300},${84 - ((v - mn) / span) * 78}`).join(' '));
          });
          break;
        }
        case 'led': {
          const c = card(`<div class="nxa-row"><span>${esc(it.label)}</span><i class="nxa-led"></i></div>`), led = c.querySelector('i');
          updaters.push(() => {
            const v = vars[it.var], th = evalValue(it.value, it.var);
            const on = it.op === 'gt' ? v > th : it.op === 'lt' ? v < th : it.op === 'eq' ? String(v) === String(th) : !!(v && v !== '0');
            led.style.background = on ? it.color || '#ef4444' : '';
            led.style.boxShadow = on ? `0 0 12px ${it.color || '#ef4444'}` : '';
          });
          break;
        }
        case 'button': {
          wrap.innerHTML = `<button class="nxa-btn ${it.style === 'outline' ? 'outline' : ''}">${esc(it.text || 'Bouton')}</button>`;
          const b = wrap.firstElementChild;
          if (it.color) b.style.setProperty('--bc', it.color);
          b.onclick = () => run(it.do, `« ${it.text} »`);
          updaters.push(() => { b.textContent = tpl(it.text || 'Bouton'); });
          break;
        }
        case 'switch': {
          const c = card(`<div class="nxa-row"><span>${esc(it.label)}</span><button class="nxa-sw" role="switch" aria-label="${esc(it.label)}"></button></div>`), sw = c.querySelector('button');
          sw.onclick = () => { if (!live) return; const on = !(vars[it.var] && vars[it.var] !== '0'); if (it.var) setVar(it.var, on ? 1 : 0); else sw.classList.toggle('on', on); run(on ? it.do : it.off, `« ${it.label} »`); };
          updaters.push(() => { if (it.var) sw.classList.toggle('on', !!(vars[it.var] && vars[it.var] !== '0')); });
          break;
        }
        case 'slider': {
          const c = card(`<div class="nxa-row"><span class="nxa-lbl" style="margin:0">${esc(it.label)}</span><b style="margin-left:auto"></b></div><input type="range" min="${num(it.min, 0)}" max="${num(it.max, 100)}" step="${num(it.step, 1)}">`);
          const r = c.querySelector('input'), out = c.querySelector('b');
          r.oninput = () => { if (it.var) setVar(it.var, parseFloat(r.value)); else out.textContent = r.value; };
          r.onchange = () => run(it.do, `« ${it.label} »`);
          updaters.push(() => { if (it.var) { if (document.activeElement !== r) r.value = num(vars[it.var], 0); out.textContent = fmt(it.var); } });
          break;
        }
        case 'input': {
          const c = card(`<div class="nxa-lbl">${esc(it.label)}</div><div class="nxa-in"><input type="${it.kind === 'number' ? 'number' : 'text'}" placeholder="${esc(it.placeholder || '')}"><button>OK</button></div>`);
          const inp = c.querySelector('input');
          const submit = () => { if (it.var) setVar(it.var, it.kind === 'number' ? num(inp.value, 0) : inp.value); run(it.do, `« ${it.label} »`); };
          c.querySelector('button').onclick = submit;
          inp.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
          break;
        }
        case 'joystick': {
          wrap.innerHTML = '<div class="nxa-card"><div class="nxa-joy"><i></i></div></div>';
          const pad = wrap.querySelector('.nxa-joy'), knob = pad.firstElementChild;
          let last = 0, active = false;
          const send = (x, y, force) => {
            if (it.var_x) setVar(it.var_x, Math.round(x * 100), true);
            if (it.var_y) setVar(it.var_y, Math.round(-y * 100), true);
            refresh();
            const t = Date.now();
            if (force || t - last > 200) { last = t; run(it.do, 'joystick'); }
          };
          const move = (e) => {
            if (!active || !live) return;
            const r = pad.getBoundingClientRect();
            let x = (e.clientX - r.left - r.width / 2) / (r.width / 2 - 32), y = (e.clientY - r.top - r.height / 2) / (r.height / 2 - 32);
            const d = Math.hypot(x, y);
            if (d > 1) { x /= d; y /= d; }
            knob.style.transform = `translate(${x * (r.width / 2 - 32)}px,${y * (r.height / 2 - 32)}px)`;
            send(x, y, false);
          };
          pad.onpointerdown = (e) => { active = true; pad.setPointerCapture(e.pointerId); move(e); };
          pad.onpointermove = move;
          pad.onpointerup = pad.onpointercancel = () => { if (!active) return; active = false; knob.style.transform = ''; send(0, 0, true); };
          break;
        }
      }
    }

    function settings() {
      const sh = h(`<div class="nxa-sheet"><div><b>Réglages</b><label class="nxa-lbl">Adresse du MASTER</label><input value="${esc(s3)}"><div class="nxa-t s">${esc(D.name)} · version ${esc(D.version)} · NEXUS LAB</div><button class="nxa-btn">Enregistrer</button></div></div>`);
      sh.onclick = (e) => { if (e.target === sh) sh.remove(); };
      sh.querySelector('button').onclick = () => {
        s3 = sh.querySelector('input').value.trim().replace(/\/+$/, '');
        try { localStorage.setItem('nxa.' + D.id + '.s3', s3); } catch (e) { /* stockage */ }
        sh.remove();
        pollFeeds();
      };
      app.appendChild(sh);
    }

    /* --- démarrage */
    if (live) {
      try { const saved = localStorage.getItem('nxa.' + D.id + '.s3'); if (saved && opts.s3 == null) s3 = saved; } catch (e) { /* stockage */ }
    }
    render();
    if (live) {
      if ((D.vars || []).some((v) => v.source === 'feed')) { pollFeeds(); timers.push(setInterval(pollFeeds, 2000)); }
      (D.vars || []).filter((v) => v.source === 'http').forEach((v) => { pollHttp(v); timers.push(setInterval(() => pollHttp(v), Math.max(1, num(v.every, 2)) * 1000)); });
      (D.rules || []).forEach((r) => {
        if (r.when.type === 'start') run(r.do, 'démarrage');
        if (r.when.type === 'timer') timers.push(setInterval(() => run(r.do, 'minuterie'), Math.max(1, num(r.when.every, 5)) * 1000));
        if (r.when.type === 'screen' && r.when.screen === screen) run(r.do, 'ouverture d\'écran');
      });
      if (opts.player) window.__nexusBack = goBack;
    }

    return {
      el: app,
      vars,
      get screen() { return screen; },
      go: (id) => go(id, false),
      set: setVar,
      select(id) { opts.selected = id; app.querySelectorAll('.nxa-item').forEach((w) => w.classList.toggle('sel', w.dataset.id === id)); },
      destroy() { destroyed = true; timers.forEach(clearInterval); if (window.__nexusBack === goBack) window.__nexusBack = null; root.innerHTML = ''; }
    };
  };

  /* ------------------------------------------------------------------ lecteur (APK et appli web) */
  R.boot = function (root) {
    const D = window.NEXUS_APP;
    if (!D) { root.innerHTML = '<p style="font:16px sans-serif;padding:20px;color:#fff">Application vide.</p>'; return; }
    document.title = D.name;
    if (window.NexusNative && window.NexusNative.barColor) window.NexusNative.barColor(D.color || '#2f7cf6');
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = D.color || '#2f7cf6';
    const web = !(window.NexusNative && window.NexusNative.player && window.NexusNative.player());
    R.app = R.mount(root, D, { mode: 'run', player: true, proxy: web && /\/apps\//.test(location.pathname) ? 'proxy' : null });
  };
})();
