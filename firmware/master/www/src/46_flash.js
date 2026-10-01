/* Flash & montages : page « USB & Flash » (Arduino, ESP32, ESP32-S3, ESP32-C3 par câble) avec moniteur de flash,
 * flash d'un worker par Wi-Fi avec moniteur, aperçu du montage de chaque firmware, onglets Moniteur et GPIO
 * des workers, identification des adresses I2C. */
(function () {
  'use strict';
  const A = window.APP, LAB = window.LAB;
  const { $, $$, esc, icon, api, post, postJSON, toast, drawer, confirmBox, fmtBytes, fmtNum, fmtDur, store, download, S } = A;

  const BOARD_NAMES = { avr: 'Arduino Uno / Nano', esp32: 'ESP32 Dev Module', esp32s3: 'ESP32-S3', esp32c3: 'ESP32-C3' };
  const PROFILES = [['ATmega328P_Optiboot', 'Uno / Nano (bootloader récent) · 115200'], ['ATmega328P_Old', 'Nano « Old Bootloader » · 57600'], ['ATmega168P_STK500', 'ATmega168 (Diecimila, Nano 168) · 19200']];
  const sdUrl = (p) => '/api/sd/download?inline=1&path=' + encodeURIComponent(p);
  const espBin = (id, board) => `/sd/PROJECTS/LIBRARY/${id}/bin/${board}/${id}.bin`;
  const workerBin = (board) => `/sd/FIRMWARE/WORKER/${board}/worker.bin`;
  const DET_NAMES = { avr: 'Arduino (ATmega)', esp32: 'ESP32', esp32s3: 'ESP32-S3', esp32c3: 'ESP32-C3', esp32s2: 'ESP32-S2', esp32c6: 'ESP32-C6', esp32h2: 'ESP32-H2', esp: 'ESP (modèle inconnu)' };

  /* Carte branchée sur l'USB du S3, identifiée par le MASTER (usb.detect) → ce qu'il faut y flasher.
   * ESP32 / S3 / C3 : le firmware worker complet de la microSD (ou un projet du catalogue) ;
   * Arduino : un projet .hex de capteurs/ ; autre puce : rien de prêt. */
  A.usbAdvice = function (usb) {
    const d = (usb && usb.detect) || {};
    if (!usb || !usb.connected) return { state: 'none', text: 'Aucune carte branchée sur le port USB du S3.' };
    if (d.busy) return { state: 'busy', text: 'Identification de la carte en cours…' };
    const b = d.board || '';
    if (!b) return { state: 'unknown', text: d.text || 'Carte pas encore identifiée.' };
    const name = DET_NAMES[b] || b;
    if (b === 'avr') return { state: 'ok', board: 'avr', kind: 'avr', name, profile: d.profile || 'ATmega328P_Optiboot', text: `${name} détecté (bootloader ${d.profile || 'Optiboot'}) : choisissez un projet Arduino (.hex) à flasher.` };
    if (BOARD_NAMES[b]) return { state: 'ok', board: b, kind: 'esp', name, worker: workerBin(b), text: `${name} détecté : installez le firmware worker pour en faire un worker du labo, ou flashez un projet.` };
    return { state: 'unsupported', board: b, name, text: `${name} détecté : aucun firmware du labo n'est prévu pour cette puce.` };
  };
  /* Chemin du firmware à flasher sur la carte USB : 'worker' ou l'identifiant d'un projet. */
  A.usbFirmwarePath = function (adv, what) {
    if (!adv || adv.state !== 'ok') return null;
    if (adv.kind === 'esp') return !what || what === 'worker' ? adv.worker : espBin(what, adv.board);
    if (!what || what === 'worker') return null;
    const n = String(what).replace(/\.hex$/i, '');
    return `/sd/PROJECTS/ARDUINO/${n}/${n}.hex`;
  };

  /* ---------- styles scopés ---------- */
  (function style() {
    if (document.getElementById('fl-style')) return;
    const s = document.createElement('style');
    s.id = 'fl-style';
    s.textContent = `
      .montage{background:#fff;border:1px solid var(--line);border-radius:10px;overflow:auto;padding:6px}
      .montage svg,.montage img{display:block;width:100%;height:auto;max-width:980px;margin:auto}
      .fl-list{border:1px solid var(--line);border-radius:10px;max-height:280px;overflow:auto;margin-top:8px}
      .fl-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--line);cursor:pointer}
      .fl-item:last-child{border-bottom:0}
      .fl-item:hover{background:var(--surface-2)}
      .fl-item.on{background:color-mix(in srgb,var(--accent) 14%,transparent)}
      .fl-item .t{font-weight:600}
      .fl-log{font:12px/1.5 ui-monospace,Consolas,monospace;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:10px 12px;max-height:240px;overflow:auto;white-space:pre-wrap}
      .fl-steps{display:flex;gap:6px;flex-wrap:wrap}
      .fl-steps span{font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);color:var(--text-3)}
      .fl-steps span.done{color:var(--ok);border-color:var(--ok)}
      .fl-steps span.cur{color:var(--accent);border-color:var(--accent);font-weight:700}
      .gpio-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
      .gpio-grid button{font:600 13px var(--font);padding:8px 4px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--text);cursor:pointer}
      .gpio-grid button.adc{border-style:dashed}
      .gpio-grid button.on{background:var(--accent);border-color:var(--accent);color:#fff}
      .gpio-level{font-size:34px;font-weight:800;font-variant-numeric:tabular-nums}`;
    document.head.appendChild(s);
  })();

  /* ---------- contexte et montage d'un firmware ---------- */
  A.firmwareContext = function (path) {
    if (!path) return null;
    let m = /\/LIBRARY\/([^/]+)\/bin\/(esp32s3|esp32c3|esp32)\//.exec(path);
    if (m) return { kind: 'esp', id: m[1], board: m[2] };
    m = /(esp32s3|esp32c3|esp32)__([a-z0-9_]+?)(__bench)?\.ino\.bin$/.exec(path);
    if (m) return { kind: 'esp', id: m[2], board: m[1], bench: !!m[3] };
    m = /\/ARDUINO\/([^/]+)\/[^/]+\.hex$/i.exec(path);
    if (m) return { kind: 'avr', dir: path.replace(/\/[^/]+$/, ''), name: m[1] };
    if (/\.hex$/i.test(path)) return { kind: 'avr', dir: path.replace(/\/[^/]+$/, ''), name: null };
    if (/\.bin$/i.test(path)) return { kind: 'esp' };
    return null;
  };

  function mdToHtml(md) {
    const out = [];
    const lines = md.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^\s*\|/.test(l)) {
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
        i--;
        const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const body = rows.filter((r) => !/^\s*\|\s*-/.test(r));
        out.push(`<div class="table-wrap"><table class="tbl"><thead><tr>${cells(body[0]).map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${body.slice(1).map((r) => `<tr>${cells(r).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      } else if (/^#+\s/.test(l)) out.push(`<h3 style="margin:10px 0 6px">${esc(l.replace(/^#+\s*/, ''))}</h3>`);
      else if (/^!\[/.test(l) || !l.trim()) continue;
      else out.push(`<p class="small" style="margin:4px 0">${esc(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`);
    }
    return out.join('');
  }

  /* HTML du montage d'un firmware : schéma + tableau de câblage. */
  A.montageHtml = async function (ctx) {
    if (!ctx) return '';
    if (ctx.kind === 'esp') {
      const p = ctx.id && A.projectById ? A.projectById(ctx.id) : null;
      if (!p) return `<div class="banner">${icon('info')}<div>Firmware personnalisé : montage inconnu du catalogue.</div></div>`;
      if (p.kind === 'classic') return `<div class="banner">${icon('info')}<div>Projet système « ${esc(p.title)} » : aucun câblage externe.</div></div>`;
      try {
        const spec = JSON.parse(JSON.stringify(p.spec));
        spec.board = ctx.board || spec.board;
        const res = LAB.generate(spec);
        const m = LAB.montageSvg(res, { id: p.id, title: p.title });
        return `<div class="montage">${m.svg}</div><div style="margin-top:10px">${A.wiringTable(res)}</div>` +
          (res.warnings || []).map((w) => `<div class="banner warn" style="margin-top:8px">${icon('alert')}<div>${esc(w)}</div></div>`).join('');
      } catch (e) { return `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
    }
    if (ctx.kind === 'avr' && ctx.dir) {
      let md = '';
      if (!S.demo) {
        try { const r = await fetch(sdUrl(ctx.dir + '/MONTAGE.md'), { credentials: 'same-origin' }); if (r.ok) md = await r.text(); } catch (e) { /* absent */ }
      } else md = A.Demo && A.Demo.fileText ? A.Demo.fileText(ctx.dir + '/MONTAGE.md') : '';
      return `<div class="montage"><img src="${sdUrl(ctx.dir + '/montage.png')}" alt="Schéma de montage" onerror="this.parentNode.innerHTML='<div class=&quot;empty small&quot; style=&quot;padding:16px&quot;>Pas de montage.png dans ce dossier</div>'"></div>` +
        (md ? `<div style="margin-top:10px">${mdToHtml(md)}</div>` : '');
    }
    return '';
  };

  /* ---------- identification I2C (adresses → modules du catalogue) ---------- */
  A.i2cIdentify = function (text) {
    const found = String(text || '').match(/0x[0-9a-fA-F]{2}/g);
    if (!found || !LAB.MODULES) return '';
    const rows = [...new Set(found.map((a) => a.toLowerCase()))].map((a) => {
      const mods = LAB.MODULES.filter((m) => (m.addr || []).some((x) => String(x).toLowerCase() === a)).map((m) => m.name);
      return `<tr><td class="mono"><b>${a.toUpperCase().replace('0X', '0x')}</b></td><td class="small">${mods.length ? mods.slice(0, 5).map(esc).join(', ') : '<span class="muted">composant inconnu du catalogue</span>'}</td></tr>`;
    });
    return `<div class="card pad"><h3 style="margin-bottom:8px">Composants I2C détectés</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>Adresse</th><th>Probablement</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></div>`;
  };

  /* ---------- sélecteur de firmware ---------- */
  function espItems(board) {
    return (A.projects ? A.projects() : []).filter((p) => (p.boards || []).includes(board))
      .map((p) => ({ key: p.id, title: p.title, sub: p.kind === 'module' ? 'capteur / module' : p.kind === 'recipe' ? 'projet complet' : 'classique', path: espBin(p.id, board), ctx: { kind: 'esp', id: p.id, board } }));
  }
  async function avrItems() {
    const items = [];
    try {
      const r = await api('/api/sd/list?path=' + encodeURIComponent('/sd/PROJECTS/ARDUINO'));
      (r.items || []).filter((f) => f.type === 'd').forEach((f) => items.push({ key: f.name, title: f.name.replace(/^\d+_/, '').replace(/_/g, ' '), sub: 'capteurs/' + f.name, path: `/sd/PROJECTS/ARDUINO/${f.name}/${f.name}.hex`, ctx: { kind: 'avr', dir: '/sd/PROJECTS/ARDUINO/' + f.name, name: f.name } }));
    } catch (e) { /* dossier absent */ }
    for (const dir of ['/sd/FIRMWARE', '/sd/FIRMWARE/AVR']) {
      try {
        const r = await api('/api/sd/list?path=' + encodeURIComponent(dir));
        (r.items || []).filter((f) => f.type === 'f' && /\.hex$/i.test(f.name)).forEach((f) => items.push({ key: dir + f.name, title: f.name, sub: dir.replace('/sd/', ''), path: dir + '/' + f.name, ctx: { kind: 'avr', dir, name: null } }));
      } catch (e) { /* dossier absent */ }
    }
    return items.sort((a, b) => a.key.localeCompare(b.key, 'fr', { numeric: true }));
  }

  /* Liste filtrable ; onPick(item) appelé à la sélection. Renvoie { setItems, selected }. */
  function picker(box, onPick) {
    let items = [], sel = null;
    box.innerHTML = `<input class="input" placeholder="Rechercher (bme280, relais, lampe, 24_…)" data-q><div class="fl-list" data-l></div><div class="hint" data-h></div>`;
    const q = $('[data-q]', box), list = $('[data-l]', box), hint = $('[data-h]', box);
    const draw = () => {
      const n = A.norm(q.value);
      const shown = items.filter((it) => !n || A.norm(it.key + ' ' + it.title + ' ' + it.sub).includes(n)).slice(0, 120);
      list.innerHTML = shown.length ? shown.map((it) => `<div class="fl-item ${sel && sel.key === it.key ? 'on' : ''}" data-k="${esc(it.key)}"><div class="grow" style="min-width:0"><div class="t ellipsis">${esc(it.title)}</div><div class="small muted ellipsis mono">${esc(it.sub)}</div></div>${sel && sel.key === it.key ? icon('check') : ''}</div>`).join('')
        : `<div class="empty small" style="padding:16px">${icon('search')}<div>${items.length ? 'Aucun résultat' : 'Aucun firmware trouvé sur la microSD'}</div></div>`;
      hint.textContent = `${items.length} firmware(s) disponibles${shown.length < items.filter((it) => !n || A.norm(it.key + ' ' + it.title + ' ' + it.sub).includes(n)).length ? ' — affinez la recherche' : ''}`;
    };
    q.addEventListener('input', draw);
    list.addEventListener('click', (e) => { const r = e.target.closest('[data-k]'); if (!r) return; sel = items.find((it) => it.key === r.dataset.k); draw(); onPick(sel); });
    return {
      setItems(v) { items = v; sel = null; draw(); },
      selected: () => sel,
      pick(item) { if (!items.some((it) => it.key === item.key)) items = [item].concat(items); sel = item; q.value = ''; draw(); onPick(item); }
    };
  }

  /* Vérifie que le firmware existe sur la microSD (compilé ?) */
  async function fileExists(path) {
    if (S.demo) return { ok: true, size: 912384 };
    try {
      const dir = path.replace(/\/[^/]+$/, ''), name = path.split('/').pop();
      const r = await api('/api/sd/list?path=' + encodeURIComponent(dir));
      const f = (r.items || []).find((x) => x.name === name);
      return f ? { ok: true, size: f.size } : { ok: false };
    } catch (e) { return { ok: false }; }
  }

  /* ================================================================ */
  /* Page USB & Flash                                                 */
  /* ================================================================ */
  A.page({
    id: 'usb', title: 'USB & Flash', icon: 'usb', group: 'sys', admin: true,
    desc: 'Programmer une carte Arduino ou ESP32 par câble, moniteur de flash et moniteur série',
    render(el) {
      let board = store.get('fl.board', 'esp32');
      let chosen = null;
      let pos = 0, paused = false, stamps = store.get('usb.ts', false), buf = '';
      let flSince = 0, flTimer = null;
      let autoGo = false;

      el.innerHTML = `<div class="grid g-3">
        <div class="span-2 stack">
          <div class="card"><div class="card-h"><div class="grow"><h2>Programmer une carte par câble</h2><div class="card-sub">Carte branchée sur le port USB-OTG du MASTER · Arduino (.hex) ou ESP32 (.bin)</div></div><span id="us-badge"></span></div>
            <div class="card-b stack" style="gap:14px">
              <div id="fl-det"></div>
              <div class="field"><label>1. Type de carte</label><div class="seg" id="fl-board" style="flex-wrap:wrap">${Object.keys(BOARD_NAMES).map((b) => `<button data-b="${b}" class="${b === board ? 'on' : ''}">${esc(BOARD_NAMES[b])}</button>`).join('')}</div></div>
              <div class="field" id="fl-prof-w"><label>Bootloader Arduino</label><select class="select" id="fl-prof">${PROFILES.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></div>
              <div class="field"><label>2. Firmware</label><div id="fl-pick"></div></div>
              <div id="fl-sel"></div>
              <div id="fl-montage"></div>
              <div class="row wrap"><button class="btn primary" id="fl-go" disabled>${icon('upload')}Flasher la carte</button><span class="small muted">Le moniteur de flash s'ouvre automatiquement, puis la sortie série de la carte.</span></div>
            </div></div>
          <div class="card" id="fl-mon" hidden><div class="card-h"><div class="grow"><h2>Moniteur de flash</h2><div class="card-sub mono" id="fl-file"></div></div><span id="fl-state"></span></div>
            <div class="card-b stack" style="gap:10px">
              <div class="progress-row"><div class="meter" id="fl-meter"><i style="width:0"></i></div><span class="num" id="fl-pct" style="font-weight:700;min-width:48px;text-align:right">0 %</span></div>
              <div class="fl-steps" id="fl-steps"></div>
              <div class="fl-log" id="fl-log"></div><div id="fl-res"></div></div></div>
          <div class="card"><div class="card-h"><div class="grow"><h2>Moniteur série</h2><div class="card-sub" id="us-sub">Sortie de la carte branchée en USB</div></div>
            <select class="select sm" id="us-baud" style="width:auto">${[300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 460800, 921600].map((b) => `<option ${b === 115200 ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
            <div class="card-b"><div class="terminal" id="us-term" aria-live="polite"></div>
              <div class="row wrap" style="margin-top:10px"><input class="input grow mono" id="us-in" placeholder="Texte à envoyer…" style="flex:1;min-width:180px"><select class="select sm" id="us-eol" style="width:auto"><option value="\\n">LF</option><option value="\\r\\n">CR+LF</option><option value="\\r">CR</option><option value="">rien</option></select><button class="btn primary" id="us-send">${icon('play')}Envoyer</button></div>
              <div class="row wrap" style="margin-top:10px"><button class="btn sm" id="us-pause">${icon('stop')}Pause</button><button class="btn sm" id="us-clear">${icon('trash')}Effacer</button><button class="btn sm" id="us-save">${icon('download')}Enregistrer</button><label class="switch small"><input type="checkbox" id="us-ts" ${stamps ? 'checked' : ''}><span class="track"></span>Horodatage</label><span class="grow"></span><span class="small muted num" id="us-count"></span></div></div></div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-h"><h2 class="grow">Carte connectée</h2></div><div class="card-b"><dl class="dl" id="us-info"></dl></div></div>
          <div class="card pad small stack" style="gap:8px"><h3>Branchement</h3>
            <p>Reliez la carte au port <b>USB-OTG</b> du MASTER (câble OTG USB-C/micro-USB ↔ USB-A, ou hub OTG <b>alimenté</b>).</p>
            <p><b>Arduino Uno/Nano</b> : fichier <code>.hex</code> de <code>capteurs/</code>. Si « pas de réponse du bootloader », essayez le profil « Old Bootloader ».</p>
            <p><b>ESP32 / S3 / C3</b> : le MASTER passe la carte en mode téléchargement tout seul (lignes DTR/RTS). Si ça ne répond pas : maintenez <b>BOOT</b>, appuyez sur <b>EN/RST</b>, relâchez BOOT, puis relancez.</p>
            <p>Les firmwares ESP32 se trouvent dans <code>PROJECTS/LIBRARY/&lt;projet&gt;/bin/&lt;carte&gt;/</code> (créés par <code>scripts\\compile_all.bat</code>).</p></div>
        </div></div>`;

      /* ---- choix du firmware ---- */
      const pk = picker($('#fl-pick', el), async (it) => {
        chosen = it;
        const go = $('#fl-go', el);
        go.disabled = true;
        $('#fl-sel', el).innerHTML = `<div class="skel" style="height:20px"></div>`;
        const ex = await fileExists(it.path);
        $('#fl-sel', el).innerHTML = ex.ok ? `<div class="banner" style="margin:0">${icon('check')}<div><b>${esc(it.title)}</b> — <span class="mono small">${esc(it.path)}</span> (${fmtBytes(ex.size)})</div></div>`
          : `<div class="banner warn" style="margin:0">${icon('alert')}<div>Firmware pas encore compilé : <span class="mono small">${esc(it.path)}</span>. Lancez <code>scripts\\compile_all.bat</code> sur le PC puis recopiez <code>SD_CARD/</code> sur la microSD.</div></div>`;
        go.disabled = !ex.ok;
        if (autoGo && ex.ok) { autoGo = false; startFlash(false); }
        else if (autoGo) { autoGo = false; toast('Firmware absent de la microSD : lancez scripts\\compile_all.bat puis recopiez SD_CARD/', 'warn'); }
        $('#fl-montage', el).innerHTML = it.ctx ? `<h3 style="margin:4px 0 8px">Montage</h3>` + (await A.montageHtml(it.ctx)) : '';
      });
      const loadList = async () => {
        $('#fl-prof-w', el).style.display = board === 'avr' ? '' : 'none';
        $('#fl-sel', el).innerHTML = '';
        $('#fl-montage', el).innerHTML = '';
        $('#fl-go', el).disabled = true;
        chosen = null;
        const items = board === 'avr' ? await avrItems() : espItems(board);
        pk.setItems(items);
        // Présélection depuis la page Fichiers ou la bibliothèque
        const pre = A.flashPreselect;
        if (pre && pre.board === board) {
          A.flashPreselect = null;
          autoGo = !!pre.auto;
          if (pre.profile) $('#fl-prof', el).value = pre.profile;
          pk.pick(items.find((it) => it.path === pre.path) || { key: pre.path, title: pre.path.split('/').pop(), sub: pre.path.replace('/sd/', ''), path: pre.path, ctx: pre.ctx });
        }
      };
      if (A.flashPreselect && A.flashPreselect.board) {
        board = A.flashPreselect.board;
        $$('#fl-board button', el).forEach((x) => x.classList.toggle('on', x.dataset.b === board));
      }
      $('#fl-board', el).addEventListener('click', (e) => {
        const b = e.target.closest('[data-b]');
        if (!b) return;
        board = b.dataset.b;
        store.set('fl.board', board);
        $$('#fl-board button', el).forEach((x) => x.classList.toggle('on', x === b));
        loadList();
      });
      loadList();

      /* ---- moniteur de flash ---- */
      const STEPS = { avr: ['synchronisation', 'écriture', 'vérification', 'terminé'], esp: ['connexion', 'préparation', 'écriture', 'vérification MD5', 'redémarrage', 'terminé'] };
      const drawSteps = (kind, step, done) => {
        const list = STEPS[kind] || [];
        let cur = list.findIndex((s) => (step || '').toLowerCase().includes(s.split(' ')[0]));
        if (done) cur = list.length - 1;
        $('#fl-steps', el).innerHTML = list.map((s, i) => `<span class="${i < cur || (done && i === cur) ? 'done' : i === cur ? 'cur' : ''}">${esc(s)}</span>`).join('');
      };
      const pollFlash = async () => {
        let r;
        try { r = await api('/api/usb/flash/status?since=' + flSince); } catch (e) { return; }
        const mon = $('#fl-mon', el);
        if (!r.kind) return;
        mon.hidden = false;
        $('#fl-file', el).textContent = r.file || '';
        const logBox = $('#fl-log', el);
        (r.log || []).forEach((l) => { logBox.textContent += l.text + '\n'; });
        if ((r.log || []).length) logBox.scrollTop = logBox.scrollHeight;
        flSince = r.last || flSince;
        const pct = Math.max(0, Math.min(100, r.progress || 0));
        $('#fl-meter i', el).style.width = pct + '%';
        $('#fl-meter', el).className = 'meter ' + (r.ok === false ? 'bad' : r.ok ? 'ok' : '');
        $('#fl-pct', el).textContent = pct + ' %';
        $('#fl-state', el).innerHTML = r.busy ? `<span class="badge accent"><span class="dot busy"></span>${esc(r.step || 'en cours')}</span>` : r.ok ? '<span class="badge ok">réussi</span>' : r.ok === false ? '<span class="badge bad">échec</span>' : '';
        drawSteps(r.kind, r.step, r.ok === true);
        if (!r.busy && r.ok !== null) {
          clearInterval(flTimer); flTimer = null;
          $('#fl-res', el).innerHTML = `<div class="banner ${r.ok ? '' : 'warn'}" style="margin:0">${icon(r.ok ? 'check' : 'alert')}<div>${esc(r.result)}</div></div>`;
          if (r.ok && r.baud) {
            $('#us-baud', el).value = String(r.baud);
            append(`\n──── ${(r.file || '').split('/').pop()} flashé — démarrage de la carte (${r.baud} bauds) ────\n`);
          }
          $('#fl-go', el).disabled = !chosen;
        }
      };
      const startMonitor = () => {
        flSince = 0;
        $('#fl-log', el).textContent = '';
        $('#fl-res', el).innerHTML = '';
        $('#fl-mon', el).hidden = false;
        $('#fl-mon', el).scrollIntoView({ behavior: 'smooth', block: 'start' });
        clearInterval(flTimer);
        flTimer = setInterval(pollFlash, 500);
        pollFlash();
      };
      const startFlash = async (ask) => {
        if (!chosen) return;
        if (ask && !(await confirmBox('Flasher la carte', `Écrire « ${chosen.title} » sur la carte ${BOARD_NAMES[board]} branchée au MASTER ?`, 'Flasher'))) return;
        $('#fl-go', el).disabled = true;
        try {
          await postJSON('/api/usb/flash', { kind: board === 'avr' ? 'avr' : 'esp', path: chosen.path, profile: $('#fl-prof', el).value });
          startMonitor();
        } catch (e) { toast(e.message, 'bad'); $('#fl-go', el).disabled = false; }
      };
      $('#fl-go', el).onclick = () => startFlash(true);
      // Flash déjà en cours (page rouverte) : on raccroche le moniteur
      api('/api/usb/flash/status?since=0').then((r) => { if (r && r.busy) startMonitor(); }).catch(() => {});

      /* ---- moniteur série ---- */
      const term = $('#us-term', el);
      const append = (txt) => {
        if (!txt) return;
        if (stamps) { const t = new Date().toLocaleTimeString('fr-FR') + ' → '; txt = txt.replace(/(^|\n)(?=.)/g, (m) => m + t); }
        buf += txt;
        if (buf.length > 200000) buf = buf.slice(-150000);
        const atBottom = term.scrollHeight - term.scrollTop - term.clientHeight < 40;
        term.textContent = buf;
        if (atBottom) term.scrollTop = term.scrollHeight;
        $('#us-count', el).textContent = fmtBytes(buf.length) + ' affichés';
      };
      let detSeq = -1, detBusy = null;
      const drawDetect = (u) => {
        const adv = A.usbAdvice(u);
        const box = $('#fl-det', el);
        if (!box) return adv;
        const cls = adv.state === 'ok' ? '' : adv.state === 'busy' || adv.state === 'none' ? 'info' : 'warn';
        const btns = adv.state === 'ok' && adv.kind === 'esp' ? `<button class="btn sm primary" data-det-worker>${icon('upload')}Installer le firmware worker</button>` : '';
        box.innerHTML = `<div class="banner ${cls}" style="margin:0">${icon(adv.state === 'ok' ? 'check' : adv.state === 'busy' ? 'refresh' : 'usb')}<div class="grow"><b>Carte détectée sur l'USB du S3</b><div class="small">${esc(adv.text)}</div>
          <div class="row wrap" style="gap:6px;margin-top:6px">${btns}<button class="btn sm" data-det-again ${u && u.connected && adv.state !== 'busy' ? '' : 'disabled'}>${icon('refresh')}Identifier à nouveau</button></div></div></div>`;
        return adv;
      };
      const applyDetect = (u) => {
        const d = (u && u.detect) || {};
        const adv = drawDetect(u);
        if (d.seq === detSeq && !!d.busy === detBusy) return;
        const fresh = detSeq !== -1 || !A.flashPreselect;
        detSeq = d.seq; detBusy = !!d.busy;
        if (adv.state !== 'ok' || !fresh || (A.flashPreselect && A.flashPreselect.board)) return;
        if (adv.board !== board) {
          board = adv.board;
          store.set('fl.board', board);
          $$('#fl-board button', el).forEach((x) => x.classList.toggle('on', x.dataset.b === board));
          loadList();
        }
        if (adv.kind === 'avr' && adv.profile) $('#fl-prof', el).value = adv.profile;
      };
      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-det-again]')) {
          try { await postJSON('/api/usb/detect', {}); toast('Identification de la carte…', 'ok'); } catch (err) { toast(err.message, 'bad'); }
        } else if (e.target.closest('[data-det-worker]')) {
          const adv = A.usbAdvice(lastUsb);
          if (adv.state !== 'ok' || adv.kind !== 'esp') return;
          if (board !== adv.board) { board = adv.board; $$('#fl-board button', el).forEach((x) => x.classList.toggle('on', x.dataset.b === board)); await loadList(); }
          pk.pick({ key: adv.worker, title: 'Firmware worker ' + adv.name, sub: adv.worker.replace('/sd/', ''), path: adv.worker, ctx: null });
        }
      });
      let lastUsb = null;
      const info = (u) => {
        if (!u) return;
        lastUsb = u;
        applyDetect(u);
        $('#us-badge', el).innerHTML = u.flashing ? '<span class="badge warn"><span class="dot busy"></span>programmation</span>' : u.connected ? `<span class="badge ok">${esc(u.chip)} connectée</span>` : '<span class="badge">aucune carte</span>';
        $('#us-info', el).innerHTML = `<dt>Hôte USB</dt><dd>${u.host ? 'actif' : '<span style="color:var(--bad)">inactif</span>'}</dd><dt>Puce USB</dt><dd>${esc(u.chip || '—')}</dd><dt>VID:PID</dt><dd class="mono">${esc(u.vid_pid)}</dd><dt>Débit</dt><dd class="num">${u.baud} bauds</dd><dt>Octets reçus</dt><dd class="num">${fmtNum(u.rx_total, 0)}</dd>`;
        $('#us-sub', el).textContent = u.connected ? `${u.chip} · ${u.baud} bauds` : 'Branchez une carte sur le port USB-OTG du MASTER.';
        const bs = $('#us-baud', el);
        if (u.baud && document.activeElement !== bs && bs.value !== String(u.baud)) bs.value = String(u.baud);
      };
      let busy = false;
      const poll = async () => {
        if (busy || paused || document.hidden) return;
        busy = true;
        try { const r = await api('/api/usb/serial?since=' + pos); if (r) { if (r.pos < pos) append('\n--- tampon réinitialisé ---\n'); pos = r.pos; append(r.data); info(r.usb); } } catch (e) { /* réessai */ }
        busy = false;
      };
      const t = setInterval(poll, 400);
      poll();
      const send = async () => {
        const inp = $('#us-in', el), eol = $('#us-eol', el).value.replace('\\n', '\n').replace('\\r', '\r').replace('\\n', '\n');
        if (!inp.value && !eol) return;
        const r = await A.act(postJSON('/api/usb/serial', { data: inp.value + eol }));
        if (r) { const hist = store.get('usb.hist', []); if (inp.value) store.set('usb.hist', [inp.value].concat(hist.filter((h) => h !== inp.value)).slice(0, 20)); inp.value = ''; }
      };
      $('#us-send', el).onclick = send;
      let hi = -1;
      $('#us-in', el).addEventListener('keydown', (e) => {
        const hist = store.get('usb.hist', []);
        if (e.key === 'Enter') { hi = -1; send(); }
        else if (e.key === 'ArrowUp' && hist.length) { hi = Math.min(hist.length - 1, hi + 1); e.target.value = hist[hi]; e.preventDefault(); }
        else if (e.key === 'ArrowDown') { hi = Math.max(-1, hi - 1); e.target.value = hi >= 0 ? hist[hi] : ''; e.preventDefault(); }
      });
      $('#us-baud', el).onchange = (e) => A.act(postJSON('/api/usb/serial', { baud: Number(e.target.value) }), 'Débit : ' + e.target.value + ' bauds');
      $('#us-pause', el).onclick = (e) => { paused = !paused; e.currentTarget.innerHTML = paused ? icon('play') + 'Reprendre' : icon('stop') + 'Pause'; };
      $('#us-clear', el).onclick = () => { buf = ''; term.textContent = ''; };
      $('#us-save', el).onclick = () => download('serie-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.log', buf);
      $('#us-ts', el).onchange = (e) => { stamps = e.target.checked; store.set('usb.ts', stamps); };
      return () => { clearInterval(t); clearInterval(flTimer); };
    }
  });

  /* ================================================================ */
  /* Flash d'un worker par Wi-Fi, avec moniteur                        */
  /* ================================================================ */
  const chipBoard = (chip) => (/S3/i.test(chip || '') ? 'esp32s3' : /C3/i.test(chip || '') ? 'esp32c3' : 'esp32');

  A.flashWorker = async function (id, asProject) {
    const w = (S.state && (S.state.workers || []).find((x) => x.id === id)) || { id };
    let timer = null, since = 0, t0 = 0, sawFlash = false;
    const d = drawer((asProject ? 'Charger un projet sur ' : 'Mettre à jour ') + (w.label || 'W' + id), '<div class="skel"></div>', { sub: `Worker ${id} · Wi-Fi (OTA)`, onClose: () => clearInterval(timer) });
    let board = 'esp32';
    try { const info = await api('/api/worker/info?id=' + id); board = chipBoard(info.chip); } catch (e) { /* on garde ESP32 */ }
    let chosen = null;
    d.body.innerHTML = `<div class="stack" style="gap:12px">
      <div class="banner" style="margin:0">${icon('info')}<div>Carte détectée : <b>${esc(BOARD_NAMES[board])}</b>. ${asProject ? 'Le programme worker reste en réserve : bouton BOOT 3 s ou « Revenir au mode worker » pour le récupérer.' : 'Le worker télécharge le firmware, vérifie son empreinte SHA-256 puis redémarre.'}</div></div>
      <div id="wf-pick"></div><div id="wf-sel"></div><div id="wf-montage"></div>
      <button class="btn primary" id="wf-go" disabled>${icon('upload')}${asProject ? 'Charger ce projet' : 'Mettre à jour'}</button>
      <div class="card" id="wf-mon" hidden><div class="card-h"><h3 class="grow">Moniteur</h3><span id="wf-state"></span></div><div class="card-b stack" style="gap:10px">
        <div class="progress-row"><div class="meter" id="wf-meter"><i style="width:0"></i></div><span class="num" id="wf-pct" style="min-width:48px;text-align:right;font-weight:700">0 %</span></div>
        <div class="fl-log" id="wf-log"></div><div id="wf-res"></div></div></div></div>`;
    const pk = picker($('#wf-pick', d.body), async (it) => {
      chosen = it;
      $('#wf-go', d.body).disabled = true;
      const ex = await fileExists(it.path);
      $('#wf-sel', d.body).innerHTML = ex.ok ? `<div class="small mono muted">${esc(it.path)} · ${fmtBytes(ex.size)}</div>` : `<div class="banner warn" style="margin:0">${icon('alert')}<div>Pas encore compilé : lancez <code>scripts\\compile_all.bat</code>.</div></div>`;
      $('#wf-go', d.body).disabled = !ex.ok;
      $('#wf-montage', d.body).innerHTML = it.ctx && it.ctx.id ? `<h3 style="margin:4px 0 8px">Montage à réaliser sur le worker</h3>` + (await A.montageHtml(it.ctx)) : '';
    });
    if (asProject) pk.setItems(espItems(board));
    else {
      const files = [];
      for (const dir of ['/sd/FIRMWARE/WORKER/' + board, '/sd/FIRMWARE/WORKER', '/sd/FIRMWARE']) {
        try { const r = await api('/api/sd/list?path=' + encodeURIComponent(dir)); (r.items || []).filter((f) => f.type === 'f' && /worker.*\.bin$/i.test(f.name) && !/bootloader|partitions/i.test(f.name)).forEach((f) => files.push({ key: dir + '/' + f.name, title: f.name, sub: dir.replace('/sd/', '') + ' · ' + fmtBytes(f.size), path: dir + '/' + f.name, ctx: null })); } catch (e) { /* absent */ }
      }
      pk.setItems(files);
    }
    const logBox = () => $('#wf-log', d.body);
    const monitor = async () => {
      const cur = ((S.state && S.state.workers) || []).find((x) => x.id === id) || {};
      try {
        const r = await api(`/api/worker/log?id=${id}&since=${since}`);
        (r.lines || []).forEach((l) => { logBox().textContent += l.text + '\n'; });
        if ((r.lines || []).length) logBox().scrollTop = logBox().scrollHeight;
        since = r.last || since;
      } catch (e) { /* réessai */ }
      if (cur.state === 'FLASHING') sawFlash = true;
      const pct = cur.state === 'FLASHING' ? cur.progress || 0 : sawFlash ? 100 : 2;
      $('#wf-meter i', d.body).style.width = pct + '%';
      $('#wf-pct', d.body).textContent = pct + ' %';
      $('#wf-state', d.body).innerHTML = A.stateBadge ? A.stateBadge(cur.state || '?') : esc(cur.state || '');
      const elapsed = Date.now() - t0;
      const done = asProject ? cur.state === 'PROJECT' : sawFlash && cur.state === 'READY';
      if (done || elapsed > 180000 || (cur.state === 'ERROR' && sawFlash)) {
        clearInterval(timer); timer = null;
        const ok = done;
        $('#wf-meter', d.body).className = 'meter ' + (ok ? 'ok' : 'bad');
        $('#wf-res', d.body).innerHTML = `<div class="banner ${ok ? '' : 'warn'}" style="margin:0">${icon(ok ? 'check' : 'alert')}<div>${ok ? (asProject ? `Projet « ${esc(cur.job || chosen.title)} » en cours d'exécution sur W${id}.` : `W${id} a redémarré en v${esc(cur.version || '?')}.`) : `Pas de confirmation après ${fmtDur(elapsed)} : vérifiez que le firmware contient le « retour au mode worker » (projets compilés par ESP32 LAB 6.1) et que la carte est alimentée.`}</div></div>`;
      }
    };
    $('#wf-go', d.body).onclick = async () => {
      if (!chosen) return;
      $('#wf-go', d.body).disabled = true;
      try {
        await post('/api/worker/flash', { id, path: chosen.path, mode: asProject ? 'project' : 'worker' });
        $('#wf-mon', d.body).hidden = false;
        $('#wf-mon', d.body).scrollIntoView({ behavior: 'smooth' });
        logBox().textContent = `Envoi de ${chosen.path.split('/').pop()} à W${id}…\n`;
        t0 = Date.now();
        try { since = (await api(`/api/worker/log?id=${id}&since=999999999`)).last || 0; } catch (e) { since = 0; }
        timer = setInterval(monitor, 1000);
      } catch (e) { toast(e.message, 'bad'); $('#wf-go', d.body).disabled = false; }
    };
  };

  /* ================================================================ */
  /* Onglets du worker : Moniteur (journal en direct) et GPIO          */
  /* ================================================================ */
  A.workerLogPanel = function (box, id) {
    let since = 0, paused = false, text = '';
    box.innerHTML = `<div class="row wrap" style="gap:8px;margin-bottom:10px"><button class="btn sm" data-p>${icon('stop')}<span>Pause</span></button><button class="btn sm" data-c>${icon('trash')}Effacer</button><button class="btn sm" data-s>${icon('download')}Enregistrer</button><span class="grow"></span><span class="small muted">Journal envoyé par le worker (UDP 4212) : jobs, OTA, GPIO, erreurs</span></div><div class="terminal" data-t style="min-height:320px"></div>`;
    const term = $('[data-t]', box);
    const tick = async () => {
      if (paused) return;
      try {
        const r = await api(`/api/worker/log?id=${id}&since=${since}`);
        (r.lines || []).forEach((l) => { text += `${new Date(Date.now() - l.age_ms).toLocaleTimeString('fr-FR')}  ${l.text}\n`; });
        if ((r.lines || []).length) { term.textContent = text || ''; term.scrollTop = term.scrollHeight; }
        else if (!text) term.textContent = 'En attente de messages du worker… (lancez un job ou un check-up)';
        since = r.last || since;
      } catch (e) { term.textContent = 'Journal indisponible : ' + e.message; }
    };
    $('[data-p]', box).onclick = (e) => { paused = !paused; $('span', e.currentTarget).textContent = paused ? 'Reprendre' : 'Pause'; };
    $('[data-c]', box).onclick = () => { text = ''; term.textContent = ''; };
    $('[data-s]', box).onclick = () => download(`worker${id}-journal.log`, text);
    const t = setInterval(tick, 1000);
    tick();
    return () => clearInterval(t);
  };

  A.workerGpioPanel = function (box, id) {
    let pins = [], pin = null, timer = null, hist = [];
    box.innerHTML = '<div class="skel"></div>';
    const draw = (st) => {
      const p = pins.find((x) => x.pin === pin);
      box.innerHTML = `<div class="banner" style="margin:0 0 12px">${icon('alert')}<div>Contrôle direct des broches du worker. Ne mettez jamais en <b>sortie</b> une broche reliée à la sortie d'un autre composant. Broches en pointillé : entrée analogique (mesure en mV).</div></div>
        <div class="gpio-grid">${pins.map((x) => `<button data-pin="${x.pin}" class="${x.adc ? 'adc' : ''} ${x.pin === pin ? 'on' : ''}">GPIO${x.pin}</button>`).join('')}</div>
        ${p ? `<div class="grid g-2" style="margin-top:14px">
          <div class="card pad stack" style="gap:10px"><h3>GPIO${p.pin}</h3>
            <div class="btn-group"><button class="btn sm" data-m="in">Entrée</button><button class="btn sm" data-m="in_pullup">Pull-up</button><button class="btn sm" data-m="in_pulldown">Pull-down</button></div>
            <div class="btn-group"><button class="btn sm" data-m="out" data-v="1">Sortie HAUT</button><button class="btn sm" data-m="out" data-v="0">Sortie BAS</button></div>
            <div class="field"><label>PWM : fréquence (Hz) et rapport cyclique</label><div class="row" style="gap:8px"><input class="input sm" type="number" min="1" max="40000" value="1000" data-f style="width:110px"><input type="range" min="0" max="100" value="50" data-d style="flex:1"><b class="num" data-dv>50 %</b></div><button class="btn sm" data-m="pwm" style="margin-top:6px">Appliquer le PWM</button></div>
            <button class="btn sm ghost" data-m="release">Libérer la broche</button></div>
          <div class="card pad stack" style="gap:8px"><h3>Lecture en direct</h3>
            <div class="gpio-level" data-lv>${st ? (st.level ? 'HAUT' : 'BAS') : '—'}</div>
            ${p.adc ? `<div class="small muted">Tension : <b class="num" data-mv>${st && st.mv != null ? st.mv + ' mV' : '—'}</b></div><div data-sp>${hist.length > 1 ? A.spark(hist) : ''}</div>` : ''}
            <label class="switch small"><input type="checkbox" data-auto ${timer ? 'checked' : ''}><span class="track"></span>Actualiser toutes les 500 ms</label></div></div>` : '<p class="small muted" style="margin-top:12px">Choisissez une broche.</p>'}`;
    };
    const read = async () => {
      if (pin == null) return;
      try {
        const st = await api(`/api/worker/gpio?id=${id}&pin=${pin}`);
        if (st.mv != null) { hist.push(st.mv); if (hist.length > 120) hist.shift(); }
        const lv = $('[data-lv]', box);
        if (lv) { lv.textContent = st.level ? 'HAUT' : 'BAS'; const mv = $('[data-mv]', box); if (mv) mv.textContent = st.mv + ' mV'; const sp = $('[data-sp]', box); if (sp && hist.length > 1) sp.innerHTML = A.spark(hist); }
      } catch (e) { /* ignoré */ }
    };
    box.addEventListener('click', async (e) => {
      const pb = e.target.closest('[data-pin]');
      if (pb) { pin = Number(pb.dataset.pin); hist = []; draw(null); read(); return; }
      const mb = e.target.closest('[data-m]');
      if (!mb) return;
      if (!S.admin) { toast('Connexion administrateur requise', 'warn'); return; }
      const body = { id, pin, mode: mb.dataset.m };
      if (mb.dataset.v != null) body.value = Number(mb.dataset.v);
      if (mb.dataset.m === 'pwm') { body.freq = Number($('[data-f]', box).value) || 1000; body.duty = Number($('[data-d]', box).value); }
      try { const st = await postJSON('/api/worker/gpio', body); toast(`GPIO${pin} : ${mb.textContent.trim()}`, 'ok'); const lv = $('[data-lv]', box); if (lv && st) lv.textContent = st.level ? 'HAUT' : 'BAS'; }
      catch (err) { toast(err.message, 'bad'); }
    });
    box.addEventListener('input', (e) => { if (e.target.matches('[data-d]')) $('[data-dv]', box).textContent = e.target.value + ' %'; });
    box.addEventListener('change', (e) => { if (e.target.matches('[data-auto]')) { clearInterval(timer); timer = e.target.checked ? setInterval(read, 500) : null; } });
    api('/api/worker/gpio?id=' + id).then((r) => { pins = r.pins || []; draw(null); }).catch((e) => { box.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; });
    return () => clearInterval(timer);
  };
})();
