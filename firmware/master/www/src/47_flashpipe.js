/* Flash en un clic : projet du Studio ou de la bibliothèque → worker.
 *   1. choix du worker (carte détectée) et montage à vérifier ;
 *   2. firmware : déjà compilé sur la microSD du S3 (marche sans le Pi), sinon compilé par le Pi
 *      avec le temps prévu et la progression ;
 *   3. flash OTA autorisé par le S3, puis lecture du moniteur et verdict (Patricia sur le Pi, ou
 *      analyse locale du S3 si le Pi est absent). */
(function () {
  'use strict';
  const A = window.APP, LAB = window.LAB;
  const { $, esc, icon, toast, drawer, api, post, download, S } = A;
  const BOARD_NAMES = { esp32: 'ESP32', esp32s3: 'ESP32-S3', esp32c3: 'ESP32-C3' };
  const chipBoard = (chip) => (/S3/i.test(chip || '') ? 'esp32s3' : /C3/i.test(chip || '') ? 'esp32c3' : 'esp32');
  const espBin = (id, board) => `/sd/PROJECTS/LIBRARY/${id}/bin/${board}/${id}.bin`;
  const piReady = () => !!(A.piBase && A.piBase() && A.piToken && A.piToken());
  const piJ = (path, body) => A.piRequest(path, body === undefined ? undefined : { method: 'POST', body: JSON.stringify(body) });

  function mmss(s) {
    s = Math.max(0, Math.round(s));
    return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
  }
  A.fmtEta = mmss;

  async function sdHas(path) {
    if (S.demo) return true;
    try {
      const r = await api('/api/sd/list?path=' + encodeURIComponent(path.replace(/\/[^/]+$/, '')));
      return (r.items || []).some((x) => x.name === path.split('/').pop());
    } catch (e) { return false; }
  }

  /* Analyse locale du moniteur (sans le Pi) : mêmes repères que Patricia, en plus court. */
  const BAD = [[/Guru Meditation|abort\(\) was called|Backtrace:/i, 'le programme plante (Guru Meditation)'], [/Brownout detector/i, 'chute de tension (brownout) : alimentation trop faible'],
    [/non détecté|not found|Could not find|Failed to/i, 'un module n\'est pas détecté : vérifie le câblage'], [/rst:0x[0-9a-f]+[^\n]*\n[\s\S]*rst:0x[0-9a-f]+[^\n]*\n[\s\S]*rst:0x/i, 'redémarrages en boucle'],
    [/task_wdt|Task watchdog/i, 'chien de garde déclenché : une boucle bloque le programme']];
  A.localVerdict = function (text, expect) {
    const reasons = BAD.filter(([re]) => re.test(text)).map(([, why]) => why);
    const samples = (text.match(/^[A-Za-z_][\w.-]{0,30}:-?\d+(\.\d+)?(\t|$)/gm) || []).length;
    const missing = (expect || []).filter((k) => !new RegExp('(^|\\t)' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':', 'm').test(text));
    if (reasons.length) return { verdict: 'echec', reasons };
    if (samples >= 2 && !missing.length) return { verdict: 'ok', reasons: [`${samples} mesure(s) valides lues`] };
    if (samples >= 2) return { verdict: 'incertain', reasons: ['mesures absentes : ' + missing.join(', ')] };
    return { verdict: 'incertain', reasons: [text.trim() ? 'le programme écrit sur le port série mais aucune mesure reconnue' : 'aucune sortie série reçue'] };
  };

  /* Journal du worker (relayé par le S3) + port USB du S3 si une carte y est branchée. */
  A.readWorkerSerial = async function (worker, seconds, onTick) {
    let since = 0, text = '', usbPos = 0;
    try { const l = await api(`/api/worker/log?id=${encodeURIComponent(worker)}&since=999999999`); since = l.last || 0; } catch (e) { /* ignoré */ }
    try { if (S.admin) { const u = await api('/api/usb/serial?since=0'); usbPos = u.pos || 0; } } catch (e) { /* pas d'USB */ }
    const t0 = Date.now();
    let state = '';
    while (Date.now() - t0 < seconds * 1000) {
      await A.sleep(1500);
      try { const l = await api(`/api/worker/log?id=${encodeURIComponent(worker)}&since=${since}`); since = l.last || since; (l.lines || []).forEach((x) => { text += (x.text || '') + '\n'; }); } catch (e) { /* redémarrage */ }
      try { if (S.admin) { const u = await api('/api/usb/serial?since=' + usbPos); usbPos = u.pos || usbPos; if (u.data) text += u.data; } } catch (e) { /* ignoré */ }
      const w = ((S.state && S.state.workers) || []).find((x) => String(x.id) === String(worker));
      state = w ? w.state : state;
      if (onTick) onTick(Math.round((Date.now() - t0) / 1000), text, state);
    }
    return { text, state };
  };

  /* opts : { spec } (projet du Studio) ou { id } (projet de la bibliothèque), title, worker (facultatif), auto (enchaîne sans clic) */
  A.flashPipeline = async function (opts) {
    const lib = opts.id && A.projectById ? A.projectById(opts.id) : null;
    const baseSpec = opts.spec ? JSON.parse(JSON.stringify(opts.spec)) : lib && lib.spec ? JSON.parse(JSON.stringify(lib.spec)) : null;
    const title = opts.title || (lib && lib.title) || (baseSpec && baseSpec.title) || 'Projet';
    let cancelled = false;
    const d = drawer('Flasher « ' + title + ' »', '<div class="skel"></div>', { sub: 'Compilation, flash et vérification', onClose: () => { cancelled = true; } });
    const workers = ((S.state && S.state.workers) || []).filter((w) => w.state !== 'OFFLINE');
    let worker = opts.worker != null ? String(opts.worker) : workers[0] ? String(workers[0].id) : '';
    let board = (baseSpec && baseSpec.board) || 'esp32', res = null, source = null;
    const pid = lib ? lib.id : 'studio_' + LAB.sanitize(title).slice(0, 40);

    d.body.innerHTML = `<div class="stack fp">
      <ol class="fp-steps"><li data-s="1" class="on">Worker</li><li data-s="2">Montage</li><li data-s="3">Firmware</li><li data-s="4">Flash</li><li data-s="5">Vérification</li></ol>
      <div class="field"><label>Worker</label><select class="select" id="fp-w">${workers.map((w) => `<option value="${w.id}" ${String(w.id) === worker ? 'selected' : ''}>W${w.id}${w.label ? ' · ' + esc(w.label) : ''} · ${esc(w.state)}</option>`).join('') || '<option value="">Aucun worker en ligne</option>'}</select><div class="hint" id="fp-chip"></div></div>
      <div id="fp-montage"></div>
      <label class="switch"><input type="checkbox" id="fp-ready" ${opts.auto ? 'checked' : ''}><span class="track"></span>Le montage est câblé comme sur le schéma</label>
      <div id="fp-src" class="card pad small"></div>
      <button class="btn primary lg" id="fp-go" disabled>${icon('zap')}Compiler, flasher et vérifier</button>
      <div class="card" id="fp-run" hidden><div class="card-b stack" style="gap:10px">
        <div class="row between"><b id="fp-stage">…</b><span class="num muted" id="fp-time"></span></div>
        <div class="meter" id="fp-meter"><i style="width:0"></i></div>
        <pre class="fl-log" id="fp-log" style="max-height:220px"></pre><div id="fp-res"></div></div></div></div>`;
    const step = (n) => d.body.querySelectorAll('.fp-steps li').forEach((li) => { li.className = Number(li.dataset.s) < n ? 'done' : Number(li.dataset.s) === n ? 'on' : ''; });
    const stage = (t, pct, time) => { $('#fp-stage', d.body).textContent = t; if (pct != null) $('#fp-meter i', d.body).style.width = pct + '%'; $('#fp-time', d.body).textContent = time || ''; };
    const logBox = $('#fp-log', d.body);
    const goBtn = $('#fp-go', d.body);

    async function prepare() {
      goBtn.disabled = true;
      worker = $('#fp-w', d.body).value;
      if (!worker) { $('#fp-src', d.body).innerHTML = `${icon('alert')} Allume un worker : il apparaît ici dès qu'il rejoint le Wi-Fi du MASTER.`; return; }
      try { const info = await api('/api/worker/info?id=' + encodeURIComponent(worker)); board = chipBoard(info.chip); $('#fp-chip', d.body).textContent = `Carte détectée : ${BOARD_NAMES[board]}${info.chip ? ' (' + info.chip + ')' : ''}. Le code est adapté à cette carte.`; } catch (e) { $('#fp-chip', d.body).textContent = 'Carte non identifiée : ESP32 supposé.'; }
      if (cancelled) return;
      // montage pour la carte du worker
      if (baseSpec) {
        try {
          res = LAB.generate(Object.assign({}, baseSpec, { board }));
          const m = LAB.montageSvg ? LAB.montageSvg(res, { id: pid, title }) : null;
          $('#fp-montage', d.body).innerHTML = `<h3 style="margin:4px 0 8px">Montage à réaliser sur W${esc(worker)}</h3>${m ? `<div class="montage">${m.svg}</div>` : ''}<details style="margin-top:8px"><summary class="small">Tableau de câblage</summary>${A.wiringTable(res)}</details>` +
            (res.warnings || []).map((w) => `<div class="banner warn" style="margin-top:8px">${icon('alert')}<div>${esc(w)}</div></div>`).join('');
        } catch (e) { $('#fp-montage', d.body).innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; return; }
      } else if (lib) $('#fp-montage', d.body).innerHTML = await A.montageHtml({ kind: 'esp', id: lib.id, board });
      step(2);
      // source du firmware : microSD du S3 (projet de la bibliothèque déjà compilé) → Pi → rien
      source = null;
      const src = $('#fp-src', d.body);
      if (lib && !opts.spec && (await sdHas(espBin(lib.id, board)))) {
        source = { kind: 'sd', path: espBin(lib.id, board) };
        src.innerHTML = `${icon('sd')} <b>Firmware déjà compilé</b> sur la microSD du S3 : flash immédiat, le Pi n'est pas nécessaire.`;
      } else if (piReady()) {
        try {
          const est = await A.piRequest(`/api/v1/build/estimate?project=${encodeURIComponent(pid)}&board=${board}`);
          source = { kind: 'pi', est };
          const how = est.basis === 'cache' ? 'déjà dans le cache du Pi' : est.basis === 'project' ? 'd\'après la dernière compilation de ce projet' : est.basis === 'board' ? `d'après ${est.samples} compilation(s) ${BOARD_NAMES[board]}` : 'première compilation sur ce Pi : estimation prudente';
          src.innerHTML = `${icon('cpu')} <b>Nouveau firmware compilé par le Pi</b> · temps prévu <b>≈ ${mmss(est.total_s)}</b> <span class="muted">(${how}${est.ahead ? `, ${est.ahead} compilation(s) avant la tienne` : ''})</span>${est.arduino_cli ? '' : `<div class="banner warn" style="margin-top:8px">${icon('alert')}<div>arduino-cli n'est pas installé sur le Pi : lance <code>sudo bash pi/setup_arduino.sh</code>.</div></div>`}`;
        } catch (e) { src.innerHTML = `${icon('alert')} Pi injoignable (${esc(e.message)}).`; }
      }
      if (!source) {
        $('#fp-src', d.body).innerHTML = `<div class="banner warn" style="margin:0">${icon('alert')}<div>Ce projet n'est pas encore compilé et le Pi n'est pas connecté. Branche le Pi (écran Compagnon Pi), lance <code>scripts\\compile_all.bat</code> sur un PC, ou télécharge le code pour l'Arduino IDE.</div></div><button class="btn sm" id="fp-ino" style="margin-top:8px">${icon('download')}Code .ino</button>`;
        const b = $('#fp-ino', d.body); if (b && res) b.onclick = () => download(pid + '.ino', res.code);
      }
      goBtn.disabled = !source || !$('#fp-ready', d.body).checked;
    }

    async function compileOnPi() {
      const files = res ? { [pid + '.ino']: res.code, 'project.json': JSON.stringify({ id: pid, title, board, spec: Object.assign({}, baseSpec, { board }), generator: 'ESP32 LAB Studio' }, null, 1) } : null;
      const body = { project_id: pid, board, priority: 70 };
      if (files && !lib) body.files = files;
      const q = await piJ('/api/v1/build', body);
      const eta = source.est ? source.est.total_s : 300;
      const t0 = Date.now();
      for (;;) {
        if (cancelled) return null;
        await A.sleep(2000);
        let j; try { j = await A.piRequest('/api/v1/jobs/' + encodeURIComponent(q.id)); } catch (e) { continue; }
        const el = (Date.now() - t0) / 1000;
        const pct = j.status === 'success' ? 100 : Math.max(j.progress || 0, Math.min(95, Math.round(100 * el / Math.max(eta, 1))));
        stage(j.status === 'queued' || j.status === 'claimed' ? 'En attente dans la file du Pi' : `Compilation sur le Pi : ${j.stage || j.status}`, pct, `${mmss(el)} écoulées · reste ≈ ${mmss(Math.max(0, eta - el))}`);
        if (j.log) logBox.textContent = j.log.split('\n').slice(-12).join('\n');
        if (j.status === 'success') return { job: q.id, sha256: j.sha256, elapsed: el };
        if (j.status === 'failed' || j.status === 'canceled') {
          let diag = '';
          try { const r = await piJ('/api/v1/patricia/diagnose', { log: j.log || '', kind: 'compile' }); diag = (r.findings || []).map((f) => `<li><b>${esc(f.title)}</b> ${esc((f.fixes || [])[0] || f.explanation || '')}</li>`).join(''); } catch (e) { /* Patricia absente */ }
          throw new Error(`Compilation échouée${j.error ? ' : ' + j.error : ''}${diag ? `<ul class="small" style="margin:6px 0 0;padding-left:18px">${diag}</ul>` : ''}`);
        }
      }
    }

    async function run() {
      goBtn.disabled = true; $('#fp-w', d.body).disabled = true;
      $('#fp-run', d.body).hidden = false; $('#fp-res', d.body).innerHTML = '';
      $('#fp-run', d.body).scrollIntoView({ behavior: 'smooth' });
      const expect = res ? res.outs.filter((o) => o.module !== 'Variable').slice(0, 4).map((o) => o.key) : [];
      try {
        step(3);
        if (source.kind === 'sd') {
          stage('Firmware lu sur la microSD du S3', 30);
          await post('/api/worker/flash', { id: worker, path: source.path, mode: 'project' });
        } else {
          const b = await compileOnPi();
          if (!b) return;
          step(4); stage('Le S3 autorise l\'OTA, le worker télécharge le firmware…', 96, `compilé en ${mmss(b.elapsed)}`);
          const link = await A.piRequest('/api/v1/jobs/' + encodeURIComponent(b.job) + '/firmware-link');
          await post('/api/worker/flash/remote', { id: worker, url: link.url, sha256: b.sha256, mode: 'project' });
        }
        step(4);
        logBox.textContent = '';
        const secs = 25;
        const { text, state } = await A.readWorkerSerial(worker, secs, (s, t, st) => {
          stage(st === 'FLASHING' ? 'Flash du worker en cours' : `Lecture du moniteur de W${worker}`, Math.min(100, Math.round(100 * s / secs)), `${s}/${secs} s`);
          if (s > 3) step(5);
          logBox.textContent = t.split('\n').slice(-14).join('\n');
        });
        if (cancelled) return;
        step(6);
        let v = null;
        if (piReady()) { try { v = await piJ('/api/v1/patricia/verify', { log: text, expect: expect.map((k) => '(^|\\t)' + k + ':') }); } catch (e) { v = null; } }
        if (!v) v = A.localVerdict(text, expect);
        const ok = v.verdict === 'ok', fail = v.verdict === 'echec';
        $('#fp-meter', d.body).className = 'meter ' + (ok ? 'ok' : fail ? 'bad' : 'warn');
        stage(ok ? 'Ça fonctionne' : fail ? 'Échec' : 'Résultat incertain', 100, state ? 'worker ' + state : '');
        $('#fp-res', d.body).innerHTML = `<div class="banner ${ok ? '' : 'warn'}" style="margin:0">${icon(ok ? 'check' : 'alert')}<div><b>${ok ? `« ${esc(title)} » tourne sur W${esc(worker)}.` : fail ? 'Le moniteur montre un problème.' : 'Je n\'ai pas pu confirmer que tout marche.'}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${(v.reasons || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
          ${!text.trim() ? '<div class="hint">Aucune sortie reçue : active « Envoyer les mesures au MASTER » dans le Studio, ou branche la carte en USB au S3.</div>' : ''}</div></div>
          <div class="row wrap" style="margin-top:10px">${ok ? '' : `<button class="btn sm" id="fp-ask">${icon('sparkles')}Demander à Patricia</button>`}<a class="btn sm" href="#sensors">${icon('activity')}Capteurs en direct</a><a class="btn sm" href="#workers">${icon('cpu')}Workers</a></div>`;
        const ask = $('#fp-ask', d.body);
        if (ask) ask.onclick = () => { d.close(); A.go('assistant'); setTimeout(() => A.Patricia && A.Patricia.ask && A.Patricia.ask(`Le projet « ${title} » flashé sur W${worker} ne marche pas. Moniteur :\n${text.slice(-1500)}`), 400); };
        if (piReady() && !lib) piJ('/api/v1/patricia/notes', { text: `Flash de « ${title} » sur W${worker} (${BOARD_NAMES[board]}) : ${ok ? 'fonctionne' : fail ? 'échec' : 'incertain'}.`, project: pid, kind: 'journal' }).catch(() => {});
      } catch (e) {
        $('#fp-meter', d.body).className = 'meter bad';
        stage('Arrêté', null);
        $('#fp-res', d.body).innerHTML = `<div class="banner warn" style="margin:0">${icon('alert')}<div>${String(e.message || e).includes('<ul') ? e.message : esc(e.message || String(e))}</div></div>`;
        goBtn.disabled = false; $('#fp-w', d.body).disabled = false;
      }
    }

    $('#fp-w', d.body).onchange = prepare;
    $('#fp-ready', d.body).onchange = (e) => { goBtn.disabled = !source || !e.target.checked; if (e.target.checked) step(3); };
    goBtn.onclick = run;
    // opts.auto : lancé par Patricia en mode « agir directement » → enchaîne dès que le firmware a une source
    prepare().then(() => { if (opts.auto && !cancelled && source) { step(3); run(); } });
  };

  A.commands.push({ title: 'Flasher le projet du Studio sur un worker', group: 'Action', icon: 'zap', run: () => A.actions['st-flash'] && A.actions['st-flash']() });
})();
