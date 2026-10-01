/* Pages système : fichiers microSD, USB & Arduino, assistant, réglages. */
(function () {
  'use strict';
  const A = window.APP;
  const { $, $$, esc, icon, api, post, postJSON, act, toast, modal, confirmBox, drawer, fmtBytes, fmtDur, fmtNum, fmtClock, store, download, copyText, S } = A;

  const TEXT_EXT = /\.(ino|cpp|c|h|hpp|txt|md|json|csv|log|ini|yml|yaml|cfg|py|js|html|css|hex)$/i;
  const CODE_EXT = /\.(ino|cpp|c|h|hpp)$/i;
  const fileIcon = (it) => (it.type === 'd' ? 'folder' : CODE_EXT.test(it.name) ? 'code' : /\.bin$/i.test(it.name) ? 'chip' : /\.csv$/i.test(it.name) ? 'activity' : 'file');

  /* ================================================================ */
  /* Fichiers (microSD)                                               */
  /* ================================================================ */
  A.page({
    id: 'files', title: 'Fichiers', icon: 'folder', group: 'sys',
    desc: 'Explorateur de la microSD : projets, firmwares, rapports',
    render(el, q) {
      let path = (q && q.path) || store.get('files.path', '/sd');
      let data = null;
      A.setTopActions(S.admin ? `<button class="btn" data-fx="mkdir">${icon('plus')}<span class="lbl">Dossier</span></button><label class="btn primary" style="cursor:pointer">${icon('upload')}<span class="lbl">Envoyer</span><input type="file" id="fx-up" multiple hidden></label>` : '');
      el.innerHTML = `<div class="card"><div class="card-h"><div class="grow"><div class="crumbs-bar" id="fx-crumbs"></div></div><div class="hide-sm" id="fx-usage" style="min-width:180px"></div></div>
        <div class="card-b flush" style="margin-top:10px" id="fx-list"></div></div>
        ${S.admin ? `<div class="dropzone" id="fx-drop" style="margin-top:16px">${icon('upload')}<div>Glissez des fichiers ici pour les envoyer dans le dossier courant (8 Mo max par fichier).</div><div id="fx-prog" class="small"></div></div>` : `<div class="banner" style="margin-top:16px">${icon('info')}<div>Lecture seule : connectez-vous en administrateur pour envoyer, renommer ou supprimer.</div></div>`}`;
      const load = async () => {
        store.set('files.path', path);
        $('#fx-list', el).innerHTML = '<div style="padding:16px" class="stack"><div class="skel"></div><div class="skel" style="width:70%"></div></div>';
        try { data = await api('/api/sd/list?path=' + encodeURIComponent(path)); }
        catch (e) {
          data = null;
          $('#fx-list', el).innerHTML = `<div class="empty">${icon(e.status === 503 ? 'sd' : 'lock')}<h3>${esc(e.message)}</h3>${path !== '/sd' ? '<button class="btn sm" data-fx="root">Retour à la racine</button>' : ''}</div>`;
          if (e.status !== 503 && path !== '/sd') { path = '/sd'; }
          return;
        }
        draw();
      };
      const draw = () => {
        const parts = path.split('/').filter(Boolean);
        $('#fx-crumbs', el).innerHTML = parts.map((p, i) => `<button data-go="/${parts.slice(0, i + 1).join('/')}">${i === 0 ? icon('sd') + ' microSD' : esc(p)}</button>`).join(`<span class="muted">/</span>`);
        if (data.total) { const used = data.total - data.free; $('#fx-usage', el).innerHTML = `<div class="small muted" style="text-align:right;margin-bottom:4px">${fmtBytes(data.free)} libres sur ${fmtBytes(data.total)}</div><div class="meter ${used / data.total > 0.9 ? 'bad' : ''}"><i style="width:${(100 * used / data.total).toFixed(1)}%"></i></div>`; }
        const items = (data.items || []).slice().sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, 'fr', { numeric: true }) : a.type === 'd' ? -1 : 1));
        $('#fx-list', el).innerHTML = items.length ? `<div class="table-wrap"><table class="tbl responsive"><thead><tr><th>Nom</th><th>Taille</th><th class="hide-sm">Modifié</th><th></th></tr></thead><tbody>${path !== '/sd' ? `<tr class="click" data-go="${esc(path.replace(/\/[^/]+$/, '') || '/sd')}"><td class="wide"><span class="row">${icon('back')}<span class="muted">Dossier parent</span></span></td><td></td><td class="hide-sm"></td><td></td></tr>` : ''}${items.map((it) => {
          const full = path + '/' + it.name;
          return `<tr class="click" ${it.type === 'd' ? `data-go="${esc(full)}"` : `data-view="${esc(full)}"`}><td class="wide"><span class="row"><span class="icon-tile ${it.type === 'd' ? 'accent' : ''}" style="width:28px;height:28px">${icon(fileIcon(it))}</span><span class="ellipsis" style="font-weight:${it.type === 'd' ? 600 : 450}">${esc(it.name)}</span></span></td>
            <td data-l="Taille" class="num small">${it.type === 'd' ? '—' : fmtBytes(it.size)}</td><td data-l="Modifié" class="small muted hide-sm">${it.mtime ? esc(new Date(it.mtime * 1000).toLocaleString('fr-FR')) : ''}</td>
            <td style="text-align:right;white-space:nowrap">${it.type === 'f' ? `<a class="btn sm icon ghost" href="/api/sd/download?path=${encodeURIComponent(full)}" download title="Télécharger" data-stop>${icon('download')}</a>` : ''}${data.admin ? `<button class="btn sm icon ghost" data-ren="${esc(full)}" title="Renommer">${icon('edit')}</button><button class="btn sm icon ghost danger" data-del="${esc(full)}" data-dir="${it.type === 'd' ? 1 : 0}" title="Supprimer">${icon('trash')}</button>` : ''}</td></tr>`;
        }).join('')}</tbody></table></div>` : `<div class="empty">${icon('folder')}<div class="small">Dossier vide</div></div>`;
      };
      const upload = async (files) => {
        const prog = $('#fx-prog', el);
        for (const f of files) {
          const dst = path + '/' + f.name;
          try {
            await A.uploadFile('/api/sd/upload', f, { 'X-Path': encodeURIComponent(dst) }, (p) => { if (prog) prog.textContent = `${f.name} : ${Math.round(p * 100)} %`; });
            toast(`${f.name} envoyé`, 'ok');
          } catch (e) { toast(`${f.name} : ${e.message}`, 'bad'); }
        }
        if (prog) prog.textContent = '';
        load();
      };
      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-stop]')) { e.stopPropagation(); if (S.demo) { e.preventDefault(); toast('Téléchargement indisponible en démonstration', 'warn'); } return; }
        const del = e.target.closest('[data-del]');
        if (del) {
          e.stopPropagation();
          if (await confirmBox('Supprimer', `Supprimer « ${del.dataset.del} » ?${del.dataset.dir === '1' ? ' (le dossier doit être vide)' : ''}`, 'Supprimer', true)) { await act(post('/api/sd/delete', { path: del.dataset.del }), 'Supprimé'); load(); }
          return;
        }
        const ren = e.target.closest('[data-ren]');
        if (ren) {
          e.stopPropagation();
          const old = ren.dataset.ren, dir = old.replace(/\/[^/]+$/, ''), name = old.split('/').pop();
          const v = await modal({ title: 'Renommer', input: name, label: 'Nouveau nom', ok: 'Renommer' });
          if (v && v !== name) { await act(post('/api/sd/rename', { path: old, to: dir + '/' + v }), 'Renommé'); load(); }
          return;
        }
        const go = e.target.closest('[data-go]');
        if (go) { path = go.dataset.go; load(); return; }
        const view = e.target.closest('[data-view]');
        if (view) { viewFile(view.dataset.view); return; }
        const fx = e.target.closest('[data-fx]');
        if (fx && fx.dataset.fx === 'root') { path = '/sd'; load(); }
      });
      const top = $('#top-actions');
      if (top) {
        top.onclick = async (e) => {
          const b = e.target.closest('[data-fx="mkdir"]');
          if (!b) return;
          const v = await modal({ title: 'Nouveau dossier', input: '', label: 'Nom', placeholder: 'MON_DOSSIER', ok: 'Créer' });
          if (v) { await act(post('/api/sd/mkdir', { path: path + '/' + v }), 'Dossier créé'); load(); }
        };
        const up = $('#fx-up');
        if (up) up.onchange = (e) => { upload(Array.from(e.target.files)); e.target.value = ''; };
      }
      const dz = $('#fx-drop', el);
      if (dz) {
        ['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add('over'); }));
        ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
        dz.addEventListener('drop', (e) => upload(Array.from(e.dataTransfer.files)));
      }
      load();
      return () => { if (top) top.onclick = null; };
    }
  });

  async function viewFile(path) {
    const name = path.split('/').pop();
    const d = drawer(name, '<div class="skel"></div>', { sub: esc(path), actions: `<a class="btn sm" href="/api/sd/download?path=${encodeURIComponent(path)}" download>${icon('download')}Télécharger</a>` });
    if (/\.(png|jpe?g|svg)$/i.test(name)) {
      d.body.innerHTML = `<div class="montage"><img src="/api/sd/download?inline=1&path=${encodeURIComponent(path)}" alt="${esc(name)}"></div>`;
      return;
    }
    const ctx = A.firmwareContext ? A.firmwareContext(path) : null;
    if (ctx && /\.(bin|hex)$/i.test(name)) {
      const board = ctx.kind === 'avr' ? 'avr' : ctx.board || 'esp32';
      const label = ctx.kind === 'avr' ? 'Arduino Uno / Nano' : { esp32: 'ESP32 Dev Module', esp32s3: 'ESP32-S3', esp32c3: 'ESP32-C3' }[board];
      d.body.innerHTML = `<div class="banner" style="margin:0 0 12px">${icon('chip')}<div>Firmware <b>${esc(label)}</b>${ctx.id ? ` — projet <b>${esc(ctx.id)}</b>` : ''}${ctx.bench ? ' (variante banc fantôme)' : ''}</div></div>
        <div class="row wrap" style="margin-bottom:14px"><button class="btn primary" data-fl="usb" ${S.admin ? '' : 'disabled title="Connexion administrateur requise"'}>${icon('usb')}Flasher par câble</button>${ctx.kind === 'esp' ? `<button class="btn" data-fl="worker" ${S.admin ? '' : 'disabled'}>${icon('rocket')}Charger sur un worker…</button>` : ''}${ctx.id ? `<a class="btn" href="#library?p=${esc(ctx.id)}">${icon('book')}Fiche du projet</a>` : ''}</div>
        <h3 style="margin-bottom:8px">Montage</h3><div data-m><div class="skel"></div></div>`;
      $('[data-m]', d.body).innerHTML = await A.montageHtml(ctx);
      d.body.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-fl]');
        if (!b || b.disabled) return;
        if (b.dataset.fl === 'usb') { A.flashPreselect = { board, path, ctx }; d.close(); A.go('usb'); return; }
        const ws = ((S.state && S.state.workers) || []).filter((w) => w.state === 'READY');
        if (!ws.length) { toast('Aucun worker prêt', 'warn'); return; }
        const v = await modal({ title: 'Charger sur quel worker ?', html: `<select class="select" id="fw-w">${ws.map((w) => `<option value="${w.id}">W${w.id}${w.label ? ' — ' + esc(w.label) : ''}</option>`).join('')}</select>`, ok: 'Continuer' });
        if (v) { const id = Number(document.getElementById('fw-w').value); d.close(); A.flashWorker(id, true); }
      });
      return;
    }
    if (!TEXT_EXT.test(name)) { d.body.innerHTML = `<div class="empty">${icon('file')}<div class="small">Aperçu indisponible pour ce type de fichier.</div></div>`; return; }
    try {
      let text;
      if (S.demo) text = A.Demo.fileText(path);
      else {
        const r = await fetch('/api/sd/download?path=' + encodeURIComponent(path), { credentials: 'same-origin' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        text = await r.text();
      }
      if (text.length > 400000) text = text.slice(0, 400000) + '\n… (aperçu tronqué)';
      let extra = '';
      if (/\.csv$/i.test(name)) extra = csvChart(text);
      d.body.innerHTML = extra + (CODE_EXT.test(name) ? A.codeBlock(text, '70vh') : `<pre class="code" style="padding:12px 14px;white-space:pre-wrap;max-height:70vh">${esc(text)}</pre>`);
    } catch (e) { d.body.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
  }
  /* Graphique automatique des colonnes numériques d'un CSV (journaux de mesures). */
  function csvChart(text) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 3) return '';
    const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const head = lines[0].split(sep).map((h) => h.trim());
    const rows = lines.slice(1).map((l) => l.split(sep));
    const numCols = head.map((h, i) => i).filter((i) => rows.filter((r) => isFinite(parseFloat(r[i]))).length > rows.length * 0.8 && !/time|date|epoch|horodat|ms$/i.test(head[i]));
    if (!numCols.length) return '';
    const step = Math.max(1, Math.floor(rows.length / 400));
    const series = numCols.slice(0, 5).map((c, k) => ({ data: rows.filter((_, i) => i % step === 0).map((r) => parseFloat(r[c])), color: A.PALETTE[k] }));
    return `<div class="card pad" style="margin-bottom:14px"><h3 style="margin-bottom:8px">Aperçu graphique · ${rows.length} lignes</h3>${A.lineChart(series, { h: 200 })}<div class="legend" style="margin-top:6px">${numCols.slice(0, 5).map((c, k) => `<span><i style="background:${A.PALETTE[k]}"></i>${esc(head[c])}</span>`).join('')}</div></div>`;
  }
  A.viewFile = viewFile;

  /* La page « USB & Flash » (moniteur série + programmation Arduino/ESP32) est dans 46_flash.js. */

  /* ================================================================ */
  /* Assistant                                                        */
  /* ================================================================ */
  const SUGGEST = ['Quel est l\'état du labo ?', 'Lance un check-up de tous les workers', 'Comment brancher un BME280 ?', 'Pourquoi mon DHT22 renvoie nan ?', 'Quelle broche pour un capteur analogique ?', 'Benchmark de la flotte'];
  A.page({
    id: 'assistant', title: 'Assistant', icon: 'chat', group: 'build',
    desc: 'Questions sur le labo, le câblage et les capteurs',
    render(el) {
      const hist = store.get('chat', []);
      el.innerHTML = `<div class="grid g-3"><div class="card span-2" style="display:flex;flex-direction:column"><div class="chat" id="ch-log"></div>
        <div class="chips scroll" style="padding:0 12px 10px" id="ch-sug">${SUGGEST.map((s) => `<button class="chip">${esc(s)}</button>`).join('')}</div>
        <form class="chat-input" id="ch-form"><input class="input" id="ch-in" placeholder="Posez votre question…" maxlength="500" autocomplete="off"><button class="btn primary" type="submit">${icon('play')}<span class="hide-sm">Envoyer</span></button></form></div>
        <div class="stack"><div class="card pad small"><h3 style="margin-bottom:8px">Ce que sait faire l'assistant</h3><ul style="margin:0;padding-left:18px;color:var(--text-2)"><li>Résumer l'état du laboratoire (workers, jobs, mémoire, microSD).</li><li>Lancer des actions sûres : « check-up », « benchmark », « scan i2c », « ping », « identifie ».</li><li>Répondre sur les capteurs du catalogue : câblage, bibliothèques, pièges.</li><li>Avec une IA en ligne configurée (Réglages) : réponses complètes, réservées à l'administrateur.</li></ul></div>
          <div class="card pad small"><h3 style="margin-bottom:8px">Confidentialité</h3><p class="muted">En mode local, rien ne quitte le MASTER. Le mode en ligne n'envoie que votre question et un résumé de l'état du labo.</p><button class="btn sm" style="margin-top:10px" id="ch-clear">${icon('trash')}Effacer la conversation</button></div></div></div>`;
      const log = $('#ch-log', el);
      const push = (who, text, extra) => {
        const m = document.createElement('div');
        m.className = 'msg ' + who;
        m.innerHTML = linkify(esc(text)) + (extra ? `<span class="mode">${esc(extra)}</span>` : '');
        log.appendChild(m);
        log.scrollTop = log.scrollHeight;
        return m;
      };
      if (!hist.length) push('bot', 'Bonjour ! Je connais l\'état du laboratoire et les ' + ((window.LAB.MODULES || []).length) + ' modules du catalogue. Posez une question ou choisissez une suggestion.');
      hist.forEach((h) => push(h.who, h.text, h.extra));
      const ask = async (q) => {
        q = q.trim();
        if (!q) return;
        push('me', q);
        const wait = push('bot', '…');
        let r = null;
        const local = catalogAnswer(q);
        try {
          if (A.piRequest) r = await A.piRequest('/api/v1/assistant/chat', { method: 'POST', body: JSON.stringify({ q }) });
        } catch (e) { /* Le Pi peut être arrêté : le MASTER garde ses réponses locales. */ }
        if (!r) {
          try { r = await api('/api/agent/chat', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ q }).toString() }); }
          catch (e) { r = { answer: e.status === 429 ? 'Patientez une seconde entre deux questions.' : 'Assistant injoignable : ' + e.message, mode: 'erreur' }; }
        }
        let answer = r.answer || '';
        if (local && (r.mode === 'local' || r.mode === 'erreur')) answer = local + (answer && r.mode === 'local' ? '\n\n' + answer : '');
        const extra = [r.mode === 'online' ? 'IA en ligne' : r.mode === 'research' ? 'recherche web' : r.mode === 'local' ? 'mode local' : r.mode].concat(r.actions || []).filter(Boolean).join(' · ');
        wait.innerHTML = linkify(esc(answer)) + `<span class="mode">${esc(extra)}</span>`;
        log.scrollTop = log.scrollHeight;
        const h = store.get('chat', []).concat([{ who: 'me', text: q }, { who: 'bot', text: answer, extra }]).slice(-40);
        store.set('chat', h);
        if (r.actions && r.actions.length) A.refreshState();
      };
      $('#ch-form', el).addEventListener('submit', (e) => { e.preventDefault(); const i = $('#ch-in', el); ask(i.value); i.value = ''; });
      $('#ch-sug', el).addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) ask(b.textContent); });
      $('#ch-clear', el).onclick = () => { store.set('chat', []); A.refresh(); };
      setTimeout(() => $('#ch-in', el).focus(), 50);
    }
  });
  const linkify = (h) => h.replace(/(#library\?p=[a-z0-9_]+)/g, '<a href="$1" style="color:inherit;text-decoration:underline">ouvrir la fiche</a>');
  /* Réponses immédiates tirées du catalogue embarqué (fonctionne sans Internet). */
  function catalogAnswer(q) {
    const LAB = window.LAB, nq = A.norm(q);
    if (!LAB.MODULES) return null;
    const hit = LAB.MODULES.map((m) => {
      const names = [m.id, m.name].concat(m.name.split(/[\s/()]+/)).map(A.norm).filter((x) => x.length >= 4);
      return { m, s: names.filter((n) => nq.includes(n)).reduce((a, n) => a + n.length, 0) };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s)[0];
    if (!hit) return null;
    const m = hit.m, b = LAB.BOARDS.esp32;
    let res = null;
    try { res = LAB.generate({ board: 'esp32', title: m.name, modules: [{ id: m.id }] }); } catch (e) { /* ignoré */ }
    const lines = [`${m.name} — ${m.desc}`];
    if (res && res.wiring.length) lines.push('Câblage (ESP32) : ' + res.wiring.map((w) => `${w.pin} → ${w.to}`).join(', ') + '.');
    if (m.bus === 'i2c') lines.push(`Bus I2C : SDA ${b.i2c.sda}, SCL ${b.i2c.scl}${m.addr ? ', adresse ' + m.addr.join(' ou ') : ''}.`);
    if (m.libs && m.libs.length) lines.push('Bibliothèques : ' + m.libs.map((l) => `${l.name} ${l.ver}`).join(', ') + '.');
    (m.notes || []).slice(0, 3).forEach((n) => lines.push('• ' + n));
    if (/nan|erreur|marche pas|fonctionne pas|probl/.test(nq)) lines.push('• Vérifiez l\'alimentation (3V3 ou 5V selon le module), la masse commune et la broche de données ; testez avec le projet de la bibliothèque sans rien d\'autre.');
    lines.push(`Projet prêt à téléverser : #library?p=${m.id}`);
    return lines.join('\n');
  }

  /* ================================================================ */
  /* Réglages & système                                               */
  /* ================================================================ */
  const STABS = [['system', 'Système', 'cpu'], ['config', 'Configuration', 'settings'], ['update', 'Mises à jour', 'rocket'], ['network', 'Réseau', 'wifi'], ['logs', 'Journal', 'history'], ['prefs', 'Préférences', 'monitor'], ['about', 'À propos', 'info']];
  A.page({
    id: 'settings', title: 'Réglages', icon: 'settings', group: 'sys',
    desc: 'Système, configuration, mises à jour, journal',
    render(el, q) {
      let tab = (q && q.tab) || 'system';
      el.innerHTML = `<div class="tabs" id="se-tabs">${STABS.map(([k, n, i]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${icon(i)}${n}</button>`).join('')}</div><div class="tab-panel" id="se-body"></div>`;
      let body = $('#se-body', el), off = null;
      const show = () => {
        if (off) { off(); off = null; }
        const nb = body.cloneNode(false); body.replaceWith(nb); body = nb;
        off = SET[tab](body) || null;
      };
      $('#se-tabs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; $$('#se-tabs button', el).forEach((x) => x.classList.toggle('on', x === b)); show(); });
      show();
      return () => { if (off) off(); };
    }
  });
  const needAdmin = (el) => { el.innerHTML = `<div class="card"><div class="empty">${icon('lock')}<h3>Réservé à l'administrateur</h3><button class="btn primary" data-act="admin">${icon('unlock')}Se connecter</button></div></div>`; };

  const SET = {
    system(el) {
      el.innerHTML = '<div class="skel"></div>';
      api('/api/system/info').then((i) => {
        const m = (S.state && S.state.master) || {};
        el.innerHTML = `<div class="grid g-2"><div class="card pad"><h3 style="margin-bottom:10px">Carte MASTER</h3><dl class="dl">
          <dt>Version</dt><dd><b>${esc(i.version)}</b> « ${esc(i.codename)} »</dd><dt>ESP-IDF</dt><dd class="mono">${esc(i.idf)}</dd><dt>Puce</dt><dd>${esc(i.target)} rév. ${i.chip_revision} · ${i.cores} cœurs · ${m.cpu_mhz || 240} MHz</dd>
          <dt>Flash / PSRAM</dt><dd>${fmtBytes(i.flash_size)} / ${fmtBytes(i.psram_total)}</dd><dt>Variante</dt><dd>${esc(i.board_variant)}</dd><dt>MAC (AP)</dt><dd class="mono">${esc(i.ap_mac)}</dd>
          <dt>Dernier démarrage</dt><dd>${esc(i.reset_reason)}</dd><dt>En marche depuis</dt><dd>${fmtDur(i.uptime_ms)}</dd><dt>Portail captif</dt><dd>${i.captive_portal ? 'actif' : 'désactivé'}</dd>
          ${i.sd_total ? `<dt>microSD</dt><dd>${fmtBytes(i.sd_free)} libres / ${fmtBytes(i.sd_total)}</dd>` : '<dt>microSD</dt><dd>absente</dd>'}</dl></div>
          <div class="stack"><div class="card pad"><h3 style="margin-bottom:10px">Micrologiciel</h3><dl class="dl"><dt>Partition active</dt><dd class="mono">${esc(i.ota.running)}</dd><dt>Prochaine</dt><dd class="mono">${esc(i.ota.next)} (${fmtBytes(i.ota.slot_size)})</dd><dt>Compilé le</dt><dd>${esc(i.ota.build_date)} ${esc(i.ota.build_time)}</dd></dl></div>
          <div class="card pad"><h3 style="margin-bottom:10px">Actions</h3><div class="btn-group"><button class="btn" data-sx="identify">${icon('eye')}Faire clignoter la LED</button><button class="btn" data-sx="report" ${S.admin ? '' : 'disabled'}>${icon('save')}Rapport sur la microSD</button><button class="btn" data-sx="notify" ${S.admin ? '' : 'disabled'}>${icon('bell')}Tester les notifications</button><button class="btn danger" data-sx="reboot" ${S.admin ? '' : 'disabled'}>${icon('power')}Redémarrer</button></div></div></div></div>`;
      }).catch((e) => { el.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; });
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-sx]');
        if (!b || b.disabled) return;
        const k = b.dataset.sx;
        if (k === 'identify') act(post('/api/system/identify'), 'La LED du MASTER clignote');
        else if (k === 'report') act(post('/api/report/snapshot'), (r) => 'Rapport : ' + r.path);
        else if (k === 'notify') act(post('/api/notify/test'), (r) => `Notification envoyée (WhatsApp ${r.whatsapp || '—'}, webhook ${r.webhook || '—'})`);
        else if (k === 'reboot' && await confirmBox('Redémarrer le MASTER', 'Les workers se reconnecteront automatiquement ; la page se rechargera.', 'Redémarrer', true)) {
          const r = await act(post('/api/system/reboot'));
          if (r) { toast('Redémarrage…', 'warn'); setTimeout(() => location.reload(), 9000); }
        }
      });
    },

    config(el) {
      if (!S.admin) return needAdmin(el);
      el.innerHTML = '<div class="skel"></div>';
      api('/api/admin/config').then((c) => {
        const f = (k, label, extra) => `<div class="field ${extra && extra.full ? 'full' : ''}"><label>${label}</label><input class="input" data-c="${k}" value="${esc(c[k] != null ? c[k] : '')}" ${extra && extra.type ? `type="${extra.type}"` : ''} ${extra && extra.ph ? `placeholder="${esc(extra.ph)}"` : ''} autocomplete="off">${extra && extra.hint ? `<div class="hint">${extra.hint}</div>` : ''}</div>`;
        const secret = (k, label, isSet) => `<div class="field"><label>${label}</label><input class="input" data-c="${k}" type="password" placeholder="${isSet ? '•••••• (inchangé si vide)' : 'non défini'}" autocomplete="new-password"></div>`;
        el.innerHTML = `<form id="cf" class="stack">
          <div class="card"><div class="card-h"><h2>Point d'accès du laboratoire</h2></div><div class="card-b form-grid">${f('ap_ssid', 'Nom du réseau (SSID)')}${secret('ap_pass', 'Mot de passe (8 caractères min.)', true)}
            <div class="field"><label>Canal Wi-Fi</label><select class="select" data-c="ap_channel" data-num>${Array.from({ length: 13 }, (_, i) => `<option ${c.ap_channel === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select><div class="hint">1, 6 ou 11 conseillés — voir Réglages › Réseau.</div></div>${f('hostname', 'Nom d\'hôte (mDNS)', { hint: 'Accès par http://&lt;nom&gt;.local' })}
            <label class="switch full"><input type="checkbox" data-c="captive_portal" ${c.captive_portal ? 'checked' : ''}><span class="track"></span>Portail captif (le tableau de bord s'ouvre à la connexion au Wi-Fi)</label></div></div>
          <div class="card"><div class="card-h"><h2>Accès Internet (facultatif)</h2></div><div class="card-b form-grid">${f('sta_ssid', 'Réseau de la maison (SSID)')}${secret('sta_pass', 'Mot de passe', c.sta_pass_set)}${f('ntp_server', 'Serveur NTP', { ph: 'pool.ntp.org' })}${f('timezone', 'Fuseau horaire (POSIX)', { ph: 'CET-1CEST,M3.5.0,M10.5.0/3', hint: '<a href="#tools?t=tz">Liste des fuseaux</a>' })}</div></div>
          <div class="card"><div class="card-h"><h2>Administration</h2></div><div class="card-b form-grid">${secret('admin_pass', 'Nouveau mot de passe administrateur', true)}<div class="field"><label>Chemin de contrôle</label><input class="input mono" value="${esc(c.control_path)}" readonly><div class="hint">Généré à la première mise sous tension ; réinitialisation usine : BOOT 10 s.</div></div></div></div>
          <div class="card"><div class="card-h"><h2>Notifications</h2></div><div class="card-b form-grid">${f('whatsapp_phone', 'WhatsApp : votre numéro (format international)', { ph: '+33612345678' })}${secret('whatsapp_api', 'WhatsApp : clé API CallMeBot', c.whatsapp_configured)}
            <details class="full small" style="color:var(--text-2)"><summary style="cursor:pointer;font-weight:600">Obtenir la clé WhatsApp gratuite (CallMeBot) — 2 minutes</summary><ol style="margin:8px 0 0;padding-left:18px">
              <li>Enregistrez le contact <b>+34 644 78 13 70</b> dans votre téléphone.</li>
              <li>Envoyez-lui sur WhatsApp : <code>I allow callmebot to send me messages</code></li>
              <li>Vous recevez « API Activated… apikey: <b>123456</b> ». Copiez ce nombre dans « clé API ».</li>
              <li>Numéro : le vôtre, avec l'indicatif (<code>+33…</code> pour la France, <code>+32…</code> Belgique, <code>+225…</code> Côte d'Ivoire…).</li>
              <li>Le MASTER doit avoir Internet (carte « Accès Internet » ci-dessus). Enregistrez, puis <b>Réglages › Système › Tester les notifications</b>.</li></ol>
              <p style="margin:6px 0 0">Service gratuit pour usage personnel : messages vers <b>votre propre</b> numéro uniquement.</p></details>
            ${f('webhook_url', 'Webhook (facultatif) : URL complète du service', { full: true, ph: 'https://ntfy.sh/mon-labo-7f3a  ou  https://discord.com/api/webhooks/…', hint: 'Laissez vide si vous utilisez seulement WhatsApp. Le format du message s\'adapte au service reconnu dans l\'URL.' })}
            <details class="full small" style="color:var(--text-2)"><summary style="cursor:pointer;font-weight:600">Que mettre dans « Webhook » ? (exemples)</summary><ul style="margin:8px 0 0;padding-left:18px">
              <li><b>ntfy</b> (le plus simple, application gratuite Android/iOS) : installez « ntfy », abonnez-vous à un sujet inventé et difficile à deviner (ex. <code>mon-labo-7f3a</code>), puis mettez <code>https://ntfy.sh/mon-labo-7f3a</code>.</li>
              <li><b>Discord</b> : Paramètres du salon › Intégrations › Webhooks › Nouveau webhook › Copier l'URL (<code>https://discord.com/api/webhooks/…</code>).</li>
              <li><b>Telegram</b> : créez un bot avec @BotFather, puis <code>https://api.telegram.org/bot&lt;TOKEN&gt;/sendMessage?chat_id=&lt;VOTRE_ID&gt;</code>.</li>
              <li><b>Slack, Google Chat, Home Assistant, n8n, Node-RED</b> : l'URL « incoming webhook » du service (JSON <code>text</code> / <code>message</code>).</li></ul></details></div></div>
          <div class="card"><div class="card-h"><h2>Assistant IA en ligne (facultatif)</h2></div><div class="card-b form-grid">${f('ai_endpoint', 'URL compatible OpenAI (chat/completions)', { full: true, ph: 'https://api.exemple.com/v1/chat/completions' })}${secret('ai_key', 'Clé API', c.ai_key_set)}${f('ai_model', 'Modèle')}${f('search_endpoint', 'Recherche web (facultatif)', { full: true })}</div></div>
          <div class="card"><div class="card-h"><h2>Matériel & mises à jour</h2></div><div class="card-b form-grid">${f('board_variant', 'Variante de carte')}<div class="field"><label>GPIO de la LED RGB</label><input class="input" type="number" data-c="rgb_gpio" data-num value="${c.rgb_gpio}"></div>
            <div class="field"><label>GPIO du capteur DHT</label><input class="input" type="number" data-c="dht_gpio" data-num value="${c.dht_gpio}"></div><div class="field"><label>Type de capteur</label><select class="select" data-c="dht_type" data-num><option value="11" ${c.dht_type === 11 ? 'selected' : ''}>DHT11</option><option value="22" ${c.dht_type === 22 ? 'selected' : ''}>DHT22 / AM2302</option></select></div>
            ${f('github_repo', 'Dépôt GitHub des mises à jour', { full: true, ph: 'Prince223889/ESP32-box', hint: 'Format <code>utilisateur/depot</code>. Le MASTER lit la dernière <b>Release</b> et son fichier <code>*master*.bin</code>. Prioritaire sur le manifeste ci-dessous.' })}
            ${f('update_manifest', 'Manifeste JSON (facultatif, si pas de GitHub)', { full: true, ph: 'https://…/manifest.json' })}<label class="switch full"><input type="checkbox" data-c="auto_updates" ${c.auto_updates ? 'checked' : ''}><span class="track"></span>Vérifier automatiquement chaque jour (une alerte WhatsApp est envoyée ; l'installation attend votre approbation)</label></div></div>
          <div class="row" style="justify-content:flex-end;position:sticky;bottom:calc(var(--bottombar) * 0 + 12px)"><button class="btn primary" type="submit">${icon('save')}Enregistrer et redémarrer</button></div></form>`;
        $('#cf', el).addEventListener('submit', async (e) => {
          e.preventDefault();
          const out = {};
          $$('[data-c]', el).forEach((i) => {
            if (i.readOnly) return;
            const k = i.dataset.c;
            if (i.type === 'checkbox') out[k] = i.checked;
            else if (i.dataset.num != null) out[k] = Number(i.value);
            else if (i.type === 'password') { if (i.value) out[k] = i.value; }
            else out[k] = i.value.trim();
          });
          if (!(await confirmBox('Enregistrer la configuration', 'Le MASTER va redémarrer pour appliquer les réglages. Si vous changez le Wi-Fi, reconnectez-vous au nouveau réseau.', 'Enregistrer'))) return;
          const r = await act(A.postJSON('/api/admin/config', out));
          if (r && r.ok) { toast('Configuration enregistrée : redémarrage…', 'ok'); setTimeout(() => location.reload(), 10000); }
        });
      }).catch((e) => { el.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; });
    },

    update(el) {
      if (!S.admin) return needAdmin(el);
      el.innerHTML = `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>Mise à jour par Internet</h2><p class="small muted">Le MASTER lit la dernière <b>Release</b> de votre dépôt GitHub (Réglages › Configuration), télécharge le fichier <code>*master*.bin</code> et l'installe après votre approbation. Le MASTER vérifie le SHA-256 publié par GitHub et l'intégrité de l'image avant activation ; en cas d'échec au démarrage, retour automatique à la version précédente.</p>
          <div class="row"><button class="btn" id="up-check">${icon('refresh')}Rechercher une mise à jour</button><button class="btn primary" id="up-go" hidden>${icon('download')}Installer maintenant</button></div><div id="up-res"></div></div>
        <div class="card pad stack" style="gap:12px"><h2>Envoyer un firmware (.bin)</h2><p class="small muted">Fichier <code>build/esp32_lab_master.bin</code> produit par <code>idf.py build</code>. L'image est vérifiée (en-tête, taille, empreinte) avant activation.</p>
          <label class="dropzone" style="cursor:pointer" id="up-drop">${icon('upload')}<div>Choisir ou déposer le fichier .bin</div><input type="file" id="up-file" accept=".bin" hidden></label><div class="meter" id="up-meter" hidden><i style="width:0"></i></div><div id="up-msg" class="small"></div></div></div>`;
      $('#up-check', el).onclick = async () => {
        $('#up-res', el).innerHTML = '<div class="skel"></div>';
        const r = await act(post('/api/update/check'));
        if (!r) { $('#up-res', el).innerHTML = ''; return; }
        $('#up-go', el).hidden = !r.available;
        const assets = (r.assets || '').split(';').filter(Boolean).map((a) => { const [n, u] = a.split('|'); return { n, u }; });
        const assetsHtml = assets.length ? `<div class="card pad" style="margin-top:10px"><h3 style="margin-bottom:6px">Autres firmwares de cette Release</h3><p class="small muted">Pour les workers ou d'autres cartes : téléchargez le .bin, puis Fichiers › envoyez-le sur la microSD (dossier FIRMWARE).</p><div class="statlist">${assets.map((a) => `<div><span class="mono small">${esc(a.n)}</span><a class="btn sm" href="${esc(a.u)}" target="_blank" rel="noopener">${icon('download')}Télécharger</a></div>`).join('')}</div></div>` : '';
        $('#up-res', el).innerHTML = (r.available
          ? `<div class="banner">${icon('rocket')}<div><b>Version ${esc(r.version)} disponible</b>${r.source === 'github' ? ' <span class="badge outline">GitHub</span>' : ''}<br><span class="small" style="white-space:pre-wrap">${esc((r.notes || '').slice(0, 400))}</span></div></div>`
          : `<div class="banner">${icon('check')}<div>${esc(r.reason || `À jour (${r.current || ''}${r.latest ? ', dernière : ' + r.latest : ''})`)}</div></div>`) + assetsHtml;
      };
      $('#up-go', el).onclick = async () => { if (await confirmBox('Installer la mise à jour', 'Le MASTER télécharge puis redémarre sur la nouvelle version.', 'Installer')) act(post('/api/update/approve'), 'Téléchargement lancé : redémarrage automatique à la fin'); };
      const send = async (file) => {
        if (!file) return;
        if (!/\.bin$/i.test(file.name)) { toast('Un fichier .bin est attendu', 'warn'); return; }
        if (!(await confirmBox('Installer ce firmware', `${file.name} (${fmtBytes(file.size)}) sera écrit dans la partition OTA libre, puis le MASTER redémarrera.`, 'Installer'))) return;
        const m = $('#up-meter', el); m.hidden = false;
        try {
          const r = await A.uploadFile('/api/ota/upload', file, { 'Content-Type': 'application/octet-stream' }, (p) => { $('i', m).style.width = (p * 100).toFixed(1) + '%'; $('#up-msg', el).textContent = `Envoi ${Math.round(p * 100)} %`; });
          $('#up-msg', el).textContent = r.message || 'Firmware installé : redémarrage…';
          toast('Firmware installé : redémarrage', 'ok');
          setTimeout(() => location.reload(), 12000);
        } catch (e) { $('#up-msg', el).textContent = e.message; toast(e.message, 'bad'); }
      };
      $('#up-file', el).onchange = (e) => send(e.target.files[0]);
      const dz = $('#up-drop', el);
      ['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
      dz.addEventListener('drop', (e) => send(e.dataTransfer.files[0]));
    },

    network(el) {
      const m = (S.state && S.state.master) || {};
      el.innerHTML = `<div class="grid g-2"><div class="card pad"><h3 style="margin-bottom:10px">État</h3><dl class="dl"><dt>Point d'accès</dt><dd><b>${esc(m.ap_ssid)}</b> · ${esc(m.ap_ip)}</dd><dt>Appareils</dt><dd>${m.ap_clients}</dd><dt>Internet</dt><dd>${m.internet ? `connecté · ${esc(m.sta_ip)} · ${m.sta_rssi} dBm` : 'non connecté'}</dd><dt>Accès</dt><dd><span class="mono">http://${esc(m.ap_ip)}</span> ou <span class="mono">http://${esc(m.hostname)}.local</span></dd></dl></div>
        <div class="card pad"><div class="row between" style="margin-bottom:10px"><h3>Réseaux Wi-Fi alentour</h3><button class="btn sm" id="nw-scan" ${S.admin ? '' : 'disabled title="Connexion administrateur requise"'}>${icon('radar')}Scanner</button></div><div id="nw-res" class="small muted">Le scan dure environ 3 secondes ; il sert à choisir le canal le moins encombré.</div></div></div>`;
      $('#nw-scan', el).onclick = async () => {
        const out = $('#nw-res', el);
        out.innerHTML = '<div class="skel"></div>';
        const s = await act(post('/api/wifi/scan'));
        if (!s) { out.innerHTML = ''; return; }
        let r = null;
        for (let i = 0; i < 10; i++) { await A.sleep(900); try { r = await api('/api/wifi/scan'); } catch (e) { r = null; } if (r && r.state === 'done') break; }
        const nets = (r && r.networks) || [];
        out.innerHTML = nets.length ? `<div class="statlist" style="margin-bottom:14px">${nets.sort((a, b) => b.rssi - a.rssi).slice(0, 15).map((n) => `<div><span><b>${esc(n.ssid || '(masqué)')}</b> <span class="muted">canal ${n.channel} · ${esc(n.auth)}</span></span>${A.rssiBars(n.rssi)}</div>`).join('')}</div>${A.channelChart(nets)}` : 'Aucun réseau trouvé.';
      };
    },

    logs(el) {
      let lv = 'all', qq = '';
      el.innerHTML = `<div class="card"><div class="card-h"><div class="grow"><h2>Journal d'événements</h2><div class="card-sub">Mémoire vive (96 derniers) — historique complet dans /sd/LOGS/events.csv</div></div><div class="seg" id="lg-lv"><button data-v="all" class="on">Tout</button><button data-v="W">Alertes</button><button data-v="E">Erreurs</button></div><button class="btn sm" id="lg-dl">${icon('download')}CSV</button></div>
        <div class="card-b" style="padding-bottom:0"><div class="input-icon">${icon('search')}<input class="input" id="lg-q" placeholder="Filtrer…"></div></div><div class="card-b flush" style="margin-top:10px" id="lg-list"></div></div>`;
      const draw = () => {
        const nq = A.norm(qq);
        const list = S.events.filter((e) => (lv === 'all' || e.lv === lv || (lv === 'W' && e.lv === 'E')) && (!nq || A.norm(e.src + ' ' + e.msg).includes(nq)));
        $('#lg-list', el).innerHTML = A.eventsHtml(list, 300);
      };
      $('#lg-lv', el).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; lv = b.dataset.v; $$('#lg-lv button', el).forEach((x) => x.classList.toggle('on', x === b)); draw(); };
      $('#lg-q', el).oninput = (e) => { qq = e.target.value; draw(); };
      $('#lg-dl', el).onclick = () => download('esp32-lab-journal.csv', 'seq;uptime_ms;epoch;niveau;source;message\n' + S.events.map((e) => [e.seq, e.t, e.epoch, e.lv, e.src, '"' + String(e.msg).replace(/"/g, '""') + '"'].join(';')).join('\n'), 'text/csv;charset=utf-8');
      A.pollEvents();
      draw();
      return A.onState(draw);
    },

    prefs(el) {
      const theme = store.get('theme', 'auto') || 'auto';
      el.innerHTML = `<div class="grid g-2"><div class="card pad stack" style="gap:14px"><h2>Affichage</h2><div class="field"><label>Thème</label><div class="seg" id="pf-theme">${[['auto', 'Système'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, n]) => `<button data-v="${k}" class="${theme === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
          <div class="field"><label>Notifications du navigateur (alertes capteurs)</label><button class="btn" id="pf-notif" style="align-self:flex-start">${icon('bell')}${'Notification' in window ? (Notification.permission === 'granted' ? 'Autorisées' : 'Autoriser') : 'Non prises en charge'}</button></div>
          <div class="field"><label>Données locales (favoris, projet du Studio, alertes, conversation)</label><button class="btn danger" id="pf-reset" style="align-self:flex-start">${icon('trash')}Tout effacer sur cet appareil</button></div></div>
        <div class="card pad"><h2 style="margin-bottom:10px">Raccourcis clavier</h2><div class="statlist">${[['Ctrl K ou /', 'Recherche et commandes'], ['1 … 9', 'Aller à la section n'], ['Échap', 'Fermer le panneau'], ['↑ / ↓ (moniteur série)', 'Historique des envois']].map(([k, d]) => `<div><span><kbd>${k}</kbd></span><span class="muted">${d}</span></div>`).join('')}</div>
          <h3 style="margin:16px 0 8px">Installer comme une application</h3><p class="small muted">Sur téléphone : menu du navigateur › « Ajouter à l'écran d'accueil ». Sur PC (Chrome, Edge) : icône d'installation dans la barre d'adresse.</p></div></div>`;
      $('#pf-theme', el).onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        const v = b.dataset.v;
        store.set('theme', v === 'auto' ? null : v);
        if (v === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v;
        $$('#pf-theme button', el).forEach((x) => x.classList.toggle('on', x === b));
      };
      $('#pf-notif', el).onclick = async (e) => { if ('Notification' in window) { const p = await Notification.requestPermission(); e.currentTarget.lastChild.textContent = p === 'granted' ? 'Autorisées' : 'Refusées'; } };
      $('#pf-reset', el).onclick = async () => {
        if (!(await confirmBox('Effacer les données locales', 'Favoris, projet en cours du Studio, alertes et conversation seront supprimés de ce navigateur.', 'Effacer', true))) return;
        try { Object.keys(localStorage).filter((k) => k.startsWith('lab.')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* stockage indisponible */ }
        toast('Données locales effacées', 'ok');
      };
    },

    about(el) {
      const LAB = window.LAB;
      el.innerHTML = `<div class="grid g-2"><div class="card pad"><div class="row" style="margin-bottom:12px"><div class="brand-mark" style="width:44px;height:44px">${icon('chip')}</div><div><h2>ESP32 LAB ${esc(LAB.VERSION || '')}</h2><div class="small muted">« NEXUS » — laboratoire ESP32 autonome</div></div></div>
        <dl class="dl"><dt>Catalogue</dt><dd>${(LAB.MODULES || []).length} modules, ${(LAB.RECIPES || []).length} projets complets, ${(LAB.CLASSICS || []).length} classiques</dd><dt>Cartes</dt><dd>${Object.values(LAB.BOARDS || {}).map((b) => esc(b.short)).join(', ')}</dd><dt>MASTER</dt><dd>ESP32-S3 N16R8 · ESP-IDF 6.1</dd><dt>Workers</dt><dd>Arduino-ESP32 3.3.x · jusqu'à 10</dd><dt>Interface</dt><dd>hors ligne, sans dépendance, PC & mobile</dd></dl></div>
        <div class="card pad small"><h3 style="margin-bottom:8px">Mode démonstration</h3><p class="muted">Ouvrez l'interface avec <code>?demo</code> pour la parcourir sans matériel (données simulées). Le fichier <code>index.html</code> fonctionne aussi hors de la carte.</p>
          <h3 style="margin:14px 0 8px">Protocole capteurs</h3><p class="muted">UDP port 4213 : <code>LAB|appareil|clé|valeur|unité</code> — publiez depuis n'importe quel microcontrôleur.</p><div class="row" style="margin-top:14px"><a class="btn" href="?demo#dash">${icon('eye')}Voir la démo</a></div></div></div>`;
    }
  };
})();
