/* Bibliothèque de projets (modules, projets complets, classiques) + outils communs de projet. */
(function () {
  'use strict';
  const A = window.APP, LAB = window.LAB;
  const { $, $$, esc, icon, post, act, toast, drawer, store, download, copyText, norm, fmtNum, S } = A;

  const BOARD_LABEL = { esp32: 'ESP32', esp32s3: 'ESP32-S3', esp32c3: 'ESP32-C3' };
  const CAT_FALLBACK = { name: 'Divers', icon: 'box' };
  const cat = (c) => (LAB.CATS && LAB.CATS[c]) || CAT_FALLBACK;

  /* ---------- Projets : liste unifiée ---------- */
  let PROJECTS = null;
  function projects() {
    if (PROJECTS) return PROJECTS;
    const mods = (LAB.MODULES || []).map((m) => ({
      id: m.id, kind: 'module', cat: m.cat, title: m.name, desc: m.desc, tags: m.tags || [], difficulty: m.difficulty || 1,
      notes: m.notes || [], boards: m.boards || ['esp32', 'esp32s3', 'esp32c3'], bus: m.bus || (m.pins && m.pins.some((p) => p.type === 'uart_rx') ? 'uart' : ''), mod: m,
      spec: { board: m.boards && !m.boards.includes('esp32') ? m.boards[0] : 'esp32', title: `${m.name} — mesure et affichage série`, description: m.desc, modules: [{ id: m.id }], rules: [], options: {} }
    }));
    const recs = (LAB.RECIPES || []).map((r) => ({
      id: r.id, kind: 'recipe', cat: 'app', title: r.title, desc: r.desc, tags: r.tags || [], difficulty: r.difficulty || 2, notes: r.notes || [],
      boards: r.boards || ['esp32', 'esp32s3'],
      spec: { board: r.board || 'esp32', title: r.title, description: r.desc, modules: r.modules, rules: r.rules || [], options: r.options || {} }
    }));
    const cls = (LAB.CLASSICS || []).map((c) => ({ id: c.id, kind: 'classic', cat: 'classic', title: c.title, desc: c.desc, tags: c.tags || [], difficulty: c.difficulty || 1, notes: [], boards: c.boards || ['esp32', 'esp32s3'], code: c.code, libs: c.libs || [] }));
    PROJECTS = mods.concat(recs, cls);
    PROJECTS.forEach((p) => { p._s = norm([p.id, p.title, p.desc, (p.tags || []).join(' '), cat(p.cat).name, p.mod ? (p.mod.addr || []).join(' ') : ''].join(' ')); });
    return PROJECTS;
  }
  A.projects = projects;
  A.catalogCount = () => projects().length;
  A.projectById = (id) => projects().find((p) => p.id === id);

  /* Génère le code pour un projet et une carte, avec options éventuelles. */
  function build(p, board, options) {
    if (p.kind === 'classic') {
      const b = LAB.BOARDS[board] || LAB.BOARDS.esp32;
      return { code: p.code, board: b.id, boardName: b.name, fqbn: b.fqbn, title: p.title, libs: p.libs, wiring: [], warnings: [], power: null, outs: [], classic: true };
    }
    const spec = JSON.parse(JSON.stringify(p.spec));
    spec.board = board || spec.board;
    const net = S.state && S.state.master ? { wifi_ssid: S.state.master.ap_ssid } : {};
    spec.options = Object.assign(net, spec.options, options || {});
    return LAB.generate(spec);
  }
  A.buildProject = build;

  function readme(p, res) {
    const L = [`# ${p.title}`, '', p.desc || '', '', `- Carte : ${res.boardName} (Arduino IDE, cœur esp32 3.3.x)`, `- Difficulté : ${'★'.repeat(p.difficulty || 1)}`];
    if (res.power) L.push(`- Consommation estimée : ${res.power.total_mA} mA (pointe ${res.power.total_peak_mA} mA), carte comprise`);
    if (res.wiring && res.wiring.length) { L.push('', '## Câblage', '', '| Module | Broche | ESP32 | Remarque |', '|---|---|---|---|'); res.wiring.forEach((w) => L.push(`| ${w.name} | ${w.pin} | ${w.to} | ${w.note || ''} |`)); }
    L.push('', '## Bibliothèques', '');
    if (res.libs && res.libs.length) res.libs.forEach((l) => L.push(`- ${l.name} ${l.ver} — https://github.com/${l.repo}`)); else L.push('Aucune : tout est inclus dans le cœur Arduino-ESP32.');
    const notes = (p.notes || []).concat(res.warnings || []);
    if (notes.length) { L.push('', '## Points d\'attention', ''); notes.forEach((n) => L.push('- ' + n)); }
    L.push('', `_Généré par ESP32 LAB ${LAB.VERSION}_`, '');
    return L.join('\n');
  }
  A.readme = readme;

  /* ---------- ZIP minimal (stockage sans compression) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let off = 0;
    const d = new Date();
    const dosT = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosD = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach((f) => {
      const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dosT, true); h.setUint16(12, dosD, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dosT, true); c.setUint16(14, dosD, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    });
    const csize = central.reduce((s, a) => s + a.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
  }
  A.zip = zip;

  function projectFiles(id, p, res) {
    const meta = { id, title: p.title, description: p.desc || p.description || '', board: res.board, fqbn: res.fqbn, libs: (res.libs || []).map((l) => ({ name: l.name, version: l.ver, repo: l.repo })), generator: 'ESP32 LAB ' + LAB.VERSION, spec: p.spec || null };
    return [
      { name: `${id}/${id}.ino`, data: res.code },
      { name: `${id}/README.md`, data: readme(p, res) },
      { name: `${id}/project.json`, data: JSON.stringify(meta, null, 2) + '\n' }
    ];
  }
  A.downloadProjectZip = (id, p, res) => download(id + '.zip', zip(projectFiles(id, p, res)));
  A.projectFilesData = (id, p, res) => Object.fromEntries(projectFiles(id, p, res).map((f) => [f.name.split('/')[1], f.data]));
  A.saveProjectToSd = async (id, p, res) => {
    const files = projectFiles(id, p, res), textFiles = Object.fromEntries(files.map((f) => [f.name.split('/')[1], f.data]));
    if (S.admin) {
      try {
        for (const f of files) await A.uploadFile('/api/project/upload', new Blob([f.data]), { 'X-Project': encodeURIComponent(id), 'X-Filename': encodeURIComponent(f.name.split('/')[1]) });
        toast(`Projet enregistré sur la microSD du S3 : ${id}`, 'ok'); return 's3';
      } catch (e) { if (!A.piSaveProject) throw e; }
    }
    if (A.piSaveProject) {
      await A.piSaveProject(id, textFiles);
      toast(`Projet enregistré sur la microSD partagée du Pi : ${id}`, 'ok'); return 'pi';
    }
    throw new Error('Connecte le Pi dans Compagnon ou insère une microSD dans le S3.');
  };

  /* ---------- Vue de brochage (ordre physique des connecteurs) ---------- */
  const LAYOUTS = {
    esp32: { name: 'DevKit V1 (30 broches)', left: ['EN', 36, 39, 34, 35, 32, 33, 25, 26, 27, 14, 12, 13, 'GND', 'VIN'], right: [23, 22, 1, 3, 21, 19, 18, 5, 17, 16, 4, 2, 15, 'GND', '3V3'] },
    esp32s3: { name: 'DevKitC-1 / YD-ESP32-S3', left: ['3V3', '3V3', 'RST', 4, 5, 6, 7, 15, 16, 17, 18, 8, 3, 46, 9, 10, 11, 12, 13, 14, '5V', 'GND'], right: ['GND', 43, 44, 1, 2, 42, 41, 40, 39, 38, 37, 36, 35, 0, 45, 48, 47, 21, 20, 19, 'GND', 'GND'] },
    esp32c3: { name: 'SuperMini', left: ['5V', 'GND', '3V3', 4, 3, 2, 1, 0], right: [5, 6, 7, 8, 9, 10, 20, 21] }
  };
  A.LAYOUTS = LAYOUTS;
  function pinInfo(b, g) {
    const f = [];
    if (b.adc.includes(g)) f.push('ADC');
    if (b.touch.includes(g)) f.push('Touch');
    if (b.dac.includes(g)) f.push('DAC');
    if (b.inOnly.includes(g)) f.push('entrée seule');
    if (b.i2c.sda === g) f.push('SDA'); if (b.i2c.scl === g) f.push('SCL');
    if (b.spi.sck === g) f.push('SCK'); if (b.spi.miso === g) f.push('MISO'); if (b.spi.mosi === g) f.push('MOSI'); if (b.spi.ss === g) f.push('SS');
    b.uarts.forEach((u) => { if (u.rx === g) f.push(u.name + ' RX'); if (u.tx === g) f.push(u.name + ' TX'); });
    if (b.led === g) f.push('LED');
    return f;
  }
  A.pinInfo = pinInfo;
  function boardView(boardId, used, opts) {
    opts = opts || {};
    const b = LAB.BOARDS[boardId], L = LAYOUTS[boardId];
    const pin = (g, side) => {
      if (typeof g === 'string') {
        const cls = g === 'GND' ? 'gnd' : /V/.test(g) ? 'power' : 'reserved';
        return `<div class="pin ${cls}"><span class="pn">${g}</span><span class="pu">${g === 'EN' || g === 'RST' ? 'reset' : g === 'GND' ? 'masse' : 'alim.'}</span></div>`;
      }
      const u = used && used[g];
      const res = b.reserved[g], cau = b.caution[g];
      const bus = [b.i2c.sda, b.i2c.scl, b.spi.sck, b.spi.miso, b.spi.mosi].includes(g);
      let cls = '', label = '';
      if (u) { cls = u.bus ? 'bus' : 'used'; label = u.label; }
      else if (res) { cls = 'reserved'; label = res; }
      else { label = opts.caps ? pinInfo(b, g).join(' · ') : (bus ? pinInfo(b, g).filter((x) => /SDA|SCL|SCK|MISO|MOSI/.test(x)).join(' ') : ''); }
      if (cau && !u) cls += ' caution';
      const title = [`GPIO${g}`].concat(pinInfo(b, g), res ? ['réservé : ' + res] : [], cau ? ['attention : ' + cau] : []).join(' · ');
      return `<div class="pin ${cls}" title="${esc(title)}" data-gpio="${g}"><span class="pn">${g}</span><span class="pu">${esc(label)}</span></div>`;
    };
    return `<div class="board"><div class="pins left">${L.left.map((g) => pin(g, 'l')).join('')}</div>
      <div class="board-body"><span>${esc(b.short)}</span><div class="chip-can">${b.id === 'esp32' ? 'WROOM' : b.id === 'esp32s3' ? 'S3' : 'C3'}</div><span class="tiny" style="opacity:.7">${esc(L.name)}</span><div class="usb"></div></div>
      <div class="pins">${L.right.map((g) => pin(g, 'r')).join('')}</div></div>
      <div class="pin-legend" style="margin-top:12px"><span class="l-used">utilisée</span><span class="l-bus">bus partagé</span><span class="l-caution">strapping / attention</span><span class="l-res">réservée</span></div>`;
  }
  A.boardView = boardView;
  function usedFromWiring(boardId, wiring) {
    const b = LAB.BOARDS[boardId], used = {};
    const busPins = [b.i2c.sda, b.i2c.scl, b.spi.sck, b.spi.miso, b.spi.mosi];
    (wiring || []).forEach((w) => {
      if (w.gpio == null || w.gpio < 0) return;
      const bus = busPins.includes(w.gpio);
      const lab = bus ? pinInfo(b, w.gpio).filter((x) => /SDA|SCL|SCK|MISO|MOSI/.test(x))[0] : `${w.mod}.${w.pin}`;
      if (used[w.gpio] && !bus && !used[w.gpio].label.includes(lab)) used[w.gpio].label += ' + ' + lab;
      else used[w.gpio] = { label: lab, bus };
    });
    return used;
  }
  A.usedFromWiring = usedFromWiring;

  function wiringTable(res) {
    if (!res.wiring || !res.wiring.length) return `<div class="empty small">${icon('cable')}${res.classic ? 'Projet système : aucun câblage externe (voir les commentaires en tête du code).' : 'Aucun câblage.'}</div>`;
    return `<div class="table-wrap"><table class="tbl responsive"><thead><tr><th>Module</th><th>Broche du module</th><th>Vers l'ESP32</th><th>Remarque</th></tr></thead><tbody>${res.wiring.map((w) => `<tr><td><b>${esc(w.name)}</b> <span class="tiny muted">${esc(w.mod)}</span></td><td data-l="Broche" class="mono">${esc(w.pin)}</td><td data-l="ESP32"><span class="badge ${/GND/.test(w.to) ? '' : /V/.test(w.to) && !/GPIO/.test(w.to) ? 'bad' : 'accent'} mono">${esc(w.to)}</span></td><td data-l="Remarque" class="small muted wide">${esc(w.note || '')}</td></tr>`).join('')}</tbody></table></div>`;
  }
  A.wiringTable = wiringTable;
  function libsHtml(res) {
    if (!res.libs || !res.libs.length) return '<p class="small muted">Aucune bibliothèque externe : tout est inclus dans le cœur Arduino-ESP32 3.3.x.</p>';
    return `<div class="statlist">${res.libs.map((l) => `<div><span><b>${esc(l.name)}</b> <span class="muted small">${esc(l.author || '')}</span></span><span class="row"><span class="badge outline mono">${esc(l.ver)}</span><a class="small" href="https://github.com/${esc(l.repo)}" target="_blank" rel="noopener">GitHub</a></span></div>`).join('')}</div>
      <p class="hint" style="margin-top:8px">Arduino IDE › Outils › Gérer les bibliothèques, puis recherchez le nom exact. Versions validées par compilation.</p>`;
  }
  A.libsHtml = libsHtml;
  const stars = (n) => `<span class="stars" title="Difficulté ${n}/3">${'★'.repeat(n)}<i>${'★'.repeat(Math.max(0, 3 - n))}</i></span>`;
  A.stars = stars;

  /* ---------- Fiche projet ---------- */
  function openProject(id) {
    const p = A.projectById(id);
    if (!p) { toast('Projet introuvable : ' + id, 'warn'); return; }
    let board = store.get('lib.board', 'esp32');
    if (!p.boards.includes(board)) board = p.boards[0];
    const opt = Object.assign({ web: false, master: false, mqtt: false }, p.spec ? p.spec.options : {});
    let tab = 'code';
    const favs = new Set(store.get('favs', []));
    const d = drawer(p.title, '', {
      sub: `${esc(cat(p.cat).name)} · ${p.kind === 'module' ? 'capteur / module' : p.kind === 'recipe' ? 'projet complet' : 'classique'}`,
      actions: `<button class="btn icon ghost fav ${favs.has(id) ? 'on' : ''}" data-fav="${esc(id)}" title="Favori">${icon('star')}</button>`
    });
    const render = () => {
      let res;
      try { res = build(p, board, opt); } catch (e) { d.body.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; return; }
      const m = p.mod;
      const bench = p.kind !== 'classic' && A.benchPlanFor ? A.benchPlanFor(Object.assign({}, p.spec, { board })) : null;
      d.body.innerHTML = `
        <p style="color:var(--text-2);margin-bottom:12px">${esc(p.desc || '')}</p>
        <div class="row wrap" style="margin-bottom:14px">${stars(p.difficulty)}${(p.tags || []).slice(0, 6).map((t) => `<span class="badge">${esc(t)}</span>`).join('')}${m && m.bus ? `<span class="badge info">${esc(m.bus.toUpperCase())}${m.addr ? ' ' + esc(m.addr.join('/')) : ''}</span>` : ''}${m && m.vcc ? `<span class="badge ${String(m.vcc).startsWith('5') ? 'warn' : ''}">${esc(m.vcc)}</span>` : ''}</div>
        <div class="row wrap" style="margin-bottom:14px;gap:10px">
          <div class="seg" id="pj-board">${p.boards.map((b) => `<button data-b="${b}" class="${b === board ? 'on' : ''}">${BOARD_LABEL[b] || b}</button>`).join('')}</div>
          ${p.kind !== 'classic' ? `<label class="switch small"><input type="checkbox" data-o="web" ${opt.web ? 'checked' : ''}><span class="track"></span>Page web</label><label class="switch small"><input type="checkbox" data-o="master" ${opt.master ? 'checked' : ''}><span class="track"></span>Envoyer au MASTER</label><label class="switch small"><input type="checkbox" data-o="mqtt" ${opt.mqtt ? 'checked' : ''}><span class="track"></span>MQTT</label>` : ''}
        </div>
        ${(res.warnings || []).map((w) => `<div class="banner warn">${icon('alert')}<div>${esc(w)}</div></div>`).join('')}
        <div class="row wrap" style="margin-bottom:12px">
          <button class="btn primary" data-pa="zip">${icon('download')}Projet .zip</button>
          <button class="btn" data-pa="ino">${icon('file')}.ino</button>
          <button class="btn" data-pa="copy">${icon('copy')}Copier</button>
          ${p.kind !== 'classic' ? `<button class="btn" data-pa="studio">${icon('wand')}Modifier dans le Studio</button>` : ''}
          ${bench && bench.emulable ? `<button class="btn" data-pa="bench" title="Test matériel automatique par deux workers">${icon('target')}Banc fantôme</button>` : ''}
          <button class="btn" data-pa="sd" ${S.admin ? '' : 'disabled title="Connexion administrateur requise"'}>${icon('sd')}Enregistrer sur la microSD</button>
          ${p.kind !== 'classic' || p.boards.includes(board) ? `<button class="btn" data-pa="flash" ${S.admin ? '' : 'disabled title="Connexion administrateur requise"'}>${icon('usb')}Flasher par câble</button>` : ''}
        </div>
        <div class="tabs" id="pj-tabs">${[['code', 'Code'], ['wiring', 'Montage'], ['pins', 'Brochage'], ['info', 'Infos & bibliothèques']].map(([k, n]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="tab-panel">${tab === 'code' ? A.codeBlock(res.code, '62vh')
          : tab === 'wiring' ? (LAB.montageSvg && res.wiring && res.wiring.length ? `<div class="montage">${LAB.montageSvg(res, { id: p.id, title: p.title }).svg}</div><div class="row" style="margin:10px 0"><button class="btn sm" data-pa="svg">${icon('download')}Schéma .svg</button></div>` : '') + wiringTable(res)
          : tab === 'pins' ? boardView(res.board, usedFromWiring(res.board, res.wiring))
          : `<div class="grid g-2"><div class="card pad"><h3 style="margin-bottom:10px">Bibliothèques</h3>${libsHtml(res)}</div>
             <div class="card pad"><h3 style="margin-bottom:10px">Caractéristiques</h3><dl class="dl">
               <dt>Carte</dt><dd>${esc(res.boardName)}</dd><dt>FQBN</dt><dd class="mono small">${esc(res.fqbn)}</dd>
               ${res.power ? `<dt>Consommation</dt><dd>${fmtNum(res.power.total_mA, 0)} mA (pointe ${fmtNum(res.power.total_peak_mA, 0)} mA)</dd>` : ''}
               ${res.outs && res.outs.length ? `<dt>Mesures</dt><dd>${res.outs.map((o) => `<code>${esc(o.key)}</code>${o.unit ? ' ' + esc(o.unit) : ''}`).join(', ')}</dd>` : ''}
               <dt>Lignes de code</dt><dd>${res.code.split('\n').length}</dd></dl></div>
             ${p.notes && p.notes.length ? `<div class="card pad span-2"><h3 style="margin-bottom:8px">Conseils</h3><ul style="margin:0;padding-left:18px" class="small">${p.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}</div>`}</div>`;
      d.body.onclick = (e) => {
        const bb = e.target.closest('[data-b]'); if (bb) { board = bb.dataset.b; store.set('lib.board', board); render(); return; }
        const tb = e.target.closest('[data-t]'); if (tb) { tab = tb.dataset.t; render(); return; }
        const pa = e.target.closest('[data-pa]'); if (!pa || pa.disabled) return;
        const k = pa.dataset.pa;
        if (k === 'zip') A.downloadProjectZip(p.id, p, res);
        else if (k === 'ino') download(p.id + '.ino', res.code);
        else if (k === 'copy') copyText(res.code);
        else if (k === 'sd') A.saveProjectToSd(p.id, p, res);
        else if (k === 'svg') download(`montage_${p.id}_${board}.svg`, LAB.montageSvg(res, { id: p.id, title: p.title }).svg, 'image/svg+xml');
        else if (k === 'flash') { A.flashPreselect = { board, path: `/sd/PROJECTS/LIBRARY/${p.id}/bin/${board}/${p.id}.bin`, ctx: { kind: 'esp', id: p.id, board } }; d.close(); A.go('usb'); }
        else if (k === 'bench') { const spec = JSON.parse(JSON.stringify(p.spec)); spec.board = board; d.close(); A.openBench(spec, p.id); }
        else if (k === 'studio') { const spec = JSON.parse(JSON.stringify(p.spec)); spec.board = board; spec.options = Object.assign({}, spec.options, opt); d.close(); A.openInStudio(spec); }
      };
      d.body.onchange = (e) => { const o = e.target.closest('[data-o]'); if (o) { opt[o.dataset.o] = o.checked; render(); } };
    };
    d.el.addEventListener('click', (e) => {
      const f = e.target.closest('[data-fav]');
      if (!f) return;
      const s = new Set(store.get('favs', []));
      if (s.has(id)) s.delete(id); else s.add(id);
      store.set('favs', [...s]);
      f.classList.toggle('on', s.has(id));
      document.dispatchEvent(new CustomEvent('lab:favs'));
    });
    render();
  }
  A.openProject = openProject;

  /* ---------- Page Bibliothèque ---------- */
  A.page({
    id: 'library', title: 'Bibliothèque', icon: 'book', group: 'build', mobile: false,
    desc: 'Plus de 300 projets : capteurs, montages complets, classiques',
    render(el, q) {
      if (!LAB.MODULES || !LAB.MODULES.length) { el.innerHTML = `<div class="banner warn">${icon('alert')}<div>Catalogue non chargé (catalog.js).</div></div>`; return; }
      const all = projects();
      const f = Object.assign({ q: '', cat: 'all', kind: 'all', board: 'all', fav: false, sort: 'cat' }, store.get('lib.filter', {}));
      if (q && q.q != null) f.q = q.q;
      if (q && q.cat) f.cat = q.cat;
      const cats = {};
      all.forEach((p) => { cats[p.cat] = (cats[p.cat] || 0) + 1; });
      const counts = { module: all.filter((p) => p.kind === 'module').length, recipe: all.filter((p) => p.kind === 'recipe').length, classic: all.filter((p) => p.kind === 'classic').length };
      A.setTopActions(`<button class="btn" data-act="lib-random">${icon('sparkles')}<span class="lbl">Au hasard</span></button><a class="btn primary" href="#studio">${icon('plus')}<span class="lbl">Nouveau projet</span></a>`);
      el.innerHTML = `
        <div class="grid g-4" style="margin-bottom:16px">
          <div class="card kpi" style="min-height:0"><div class="k">${icon('box')}Capteurs & modules</div><div class="v">${counts.module}</div></div>
          <div class="card kpi" style="min-height:0"><div class="k">${icon('star')}Projets complets</div><div class="v">${counts.recipe}</div></div>
          <div class="card kpi" style="min-height:0"><div class="k">${icon('book')}Classiques ESP32</div><div class="v">${counts.classic}</div></div>
          <div class="card kpi" style="min-height:0"><div class="k">${icon('layers')}Bibliothèques Arduino</div><div class="v">${Object.keys(LAB.LIBS || {}).length}</div></div>
        </div>
        <div class="toolbar" style="margin-bottom:10px">
          <div class="input-icon">${icon('search')}<input class="input" id="lb-q" placeholder="Rechercher : BME280, relais, 0x3C, humidité, MQTT…" value="${esc(f.q)}" autocomplete="off"></div>
          <div class="seg" id="lb-kind">${[['all', 'Tout'], ['module', 'Capteurs'], ['recipe', 'Projets'], ['classic', 'Classiques']].map(([k, n]) => `<button data-v="${k}" class="${f.kind === k ? 'on' : ''}">${n}</button>`).join('')}</div>
          <select class="select sm" id="lb-board" style="width:auto"><option value="all">Toutes cartes</option>${Object.keys(LAB.BOARDS).map((b) => `<option value="${b}" ${f.board === b ? 'selected' : ''}>${BOARD_LABEL[b]}</option>`).join('')}</select>
          <select class="select sm" id="lb-sort" style="width:auto"><option value="cat" ${f.sort === 'cat' ? 'selected' : ''}>Par catégorie</option><option value="az" ${f.sort === 'az' ? 'selected' : ''}>A → Z</option><option value="easy" ${f.sort === 'easy' ? 'selected' : ''}>Plus faciles d'abord</option></select>
          <button class="chip ${f.fav ? 'on' : ''}" id="lb-fav">${icon('star')}Favoris</button>
        </div>
        <div class="chips scroll" id="lb-cats" style="margin-bottom:16px"><button class="chip ${f.cat === 'all' ? 'on' : ''}" data-c="all">Toutes <span class="count">${all.length}</span></button>${Object.keys(LAB.CATS || {}).filter((c) => cats[c]).map((c) => `<button class="chip ${f.cat === c ? 'on' : ''}" data-c="${c}">${icon(cat(c).icon)}${esc(cat(c).name)} <span class="count">${cats[c]}</span></button>`).join('')}</div>
        <div class="small muted" id="lb-count" style="margin-bottom:10px"></div>
        <div class="grid g-auto" id="lb-grid"></div>
        <div style="text-align:center;margin-top:16px"><button class="btn" id="lb-more" hidden>Afficher plus</button></div>`;
      let limit = 60;
      const save = () => store.set('lib.filter', { cat: f.cat, kind: f.kind, board: f.board, fav: f.fav, sort: f.sort });
      const draw = () => {
        const favs = new Set(store.get('favs', []));
        const words = norm(f.q).split(/\s+/).filter(Boolean);
        let list = all.filter((p) => (f.cat === 'all' || p.cat === f.cat) && (f.kind === 'all' || p.kind === f.kind) && (f.board === 'all' || p.boards.includes(f.board)) && (!f.fav || favs.has(p.id)) && words.every((w) => p._s.includes(w)));
        const catOrder = Object.keys(LAB.CATS || {});
        if (f.sort === 'az') list = list.slice().sort((a, b) => a.title.localeCompare(b.title, 'fr'));
        else if (f.sort === 'easy') list = list.slice().sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title, 'fr'));
        else list = list.slice().sort((a, b) => catOrder.indexOf(a.cat) - catOrder.indexOf(b.cat));
        $('#lb-count', el).textContent = `${list.length} projet(s)`;
        $('#lb-grid', el).innerHTML = list.slice(0, limit).map((p) => `<button class="card proj-card" data-open="${esc(p.id)}">
            <div class="row"><div class="icon-tile ${p.kind === 'recipe' ? 'violet' : p.kind === 'classic' ? 'info' : 'accent'}">${icon(cat(p.cat).icon)}</div><div class="grow" style="min-width:0"><h3 class="ellipsis">${esc(p.title)}</h3><div class="tiny muted ellipsis">${esc(cat(p.cat).name)}</div></div>${favs.has(p.id) ? `<span class="fav on">${icon('star')}</span>` : ''}</div>
            <div class="desc">${esc(p.desc || '')}</div>
            <div class="meta">${stars(p.difficulty)}${p.mod && p.mod.bus ? `<span class="badge info">${esc(p.mod.bus.toUpperCase())}</span>` : ''}${p.kind === 'recipe' ? `<span class="badge accent">${p.spec.modules.length} modules</span>` : ''}${p.kind === 'recipe' && p.spec.rules.length ? `<span class="badge">${p.spec.rules.length} règle(s)</span>` : ''}${p.boards.map((b) => `<span class="badge outline">${BOARD_LABEL[b]}</span>`).join('')}</div>
          </button>`).join('') || `<div class="card" style="grid-column:1/-1"><div class="empty">${icon('search')}<h3>Aucun projet</h3><div class="small">Essayez un autre mot-clé ou retirez un filtre.</div></div></div>`;
        $('#lb-more', el).hidden = list.length <= limit;
      };
      const dq = A.debounce(() => { limit = 60; draw(); }, 120);
      $('#lb-q', el).addEventListener('input', (e) => { f.q = e.target.value; dq(); });
      $('#lb-kind', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; f.kind = b.dataset.v; $$('#lb-kind button', el).forEach((x) => x.classList.toggle('on', x === b)); limit = 60; save(); draw(); });
      $('#lb-board', el).addEventListener('change', (e) => { f.board = e.target.value; save(); draw(); });
      $('#lb-sort', el).addEventListener('change', (e) => { f.sort = e.target.value; save(); draw(); });
      $('#lb-fav', el).addEventListener('click', (e) => { f.fav = !f.fav; e.currentTarget.classList.toggle('on', f.fav); save(); draw(); });
      $('#lb-cats', el).addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; f.cat = b.dataset.c; $$('#lb-cats .chip', el).forEach((x) => x.classList.toggle('on', x === b)); limit = 60; save(); draw(); });
      $('#lb-grid', el).addEventListener('click', (e) => { const c = e.target.closest('[data-open]'); if (c) openProject(c.dataset.open); });
      $('#lb-more', el).addEventListener('click', () => { limit += 60; draw(); });
      const onFav = () => draw();
      document.addEventListener('lab:favs', onFav);
      draw();
      if (q && q.p) setTimeout(() => openProject(q.p), 30);
      return () => document.removeEventListener('lab:favs', onFav);
    }
  });
  A.actions['lib-random'] = () => { const all = projects(); openProject(all[Math.floor(Math.random() * all.length)].id); };
})();
