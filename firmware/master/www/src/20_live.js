/* Pages temps réel : tableau de bord, flotte de workers, jobs, capteurs en direct. */
(function () {
  'use strict';
  const A = window.APP;
  const { $, $$, esc, icon, api, post, act, toast, modal, confirmBox, drawer, fmtBytes, fmtDur, fmtAgo, fmtNum, fmtClock, lineChart, spark, store, download, S } = A;

  const JOB_TYPES = [
    { id: 'PING', name: 'Ping', desc: 'Vérifie que le worker répond (aller-retour).', icon: 'activity' },
    { id: 'SYSTEM_TEST', name: 'Check-up système', desc: 'Mémoire, Wi-Fi, CPU, système de fichiers.', icon: 'check' },
    { id: 'BENCHMARK', name: 'Benchmark CPU', desc: 'Calcul intensif : score comparable entre cartes.', icon: 'gauge' },
    { id: 'FS_TEST', name: 'Test du système de fichiers', desc: 'Écriture / relecture / vérification en flash.', icon: 'save' },
    { id: 'MEM_TEST', name: 'Test mémoire', desc: 'Allocation et motif sur la RAM (et PSRAM).', icon: 'memory' },
    { id: 'I2C_SCAN', name: 'Scan I2C', desc: 'Liste les adresses présentes sur le bus I2C du worker.', icon: 'search' },
    { id: 'WIFI_SCAN', name: 'Scan Wi-Fi', desc: 'Réseaux visibles depuis le worker (RSSI, canal).', icon: 'wifi' },
    { id: 'IDENTIFY', name: 'Identifier', desc: 'Fait clignoter la LED du worker pour le repérer.', icon: 'eye' }
  ];
  A.JOB_TYPES = JOB_TYPES;
  const jobName = (t) => (JOB_TYPES.find((j) => j.id === t) || { name: t }).name;
  const STATE_BADGE = { READY: ['ok', 'Prêt'], ONLINE: ['ok', 'En ligne'], IDLE: ['ok', 'Prêt'], BUSY: ['accent', 'Occupé'], TESTING: ['accent', 'Job en cours'], OFFLINE: ['', 'Hors ligne'], FLASHING: ['warn', 'Mise à jour'], ERROR: ['bad', 'Erreur'], BOOT: ['warn', 'Démarrage'], DISCOVERING: ['warn', 'Connexion'], RECONNECTING: ['warn', 'Reconnexion'], PROJECT: ['info', 'Projet en cours'], EMULATING: ['info', 'Émulateur de banc'] };
  const isBusy = (w) => w && (w.state === 'BUSY' || w.state === 'TESTING' || w.state === 'FLASHING');
  A.isBusy = isBusy;
  const stateBadge = (s) => { const b = STATE_BADGE[s] || ['', s]; return `<span class="badge ${b[0]}"><span class="dot ${s === 'OFFLINE' ? '' : (s === 'BUSY' || s === 'TESTING' || s === 'FLASHING') ? 'busy' : b[0]}"></span>${esc(b[1])}</span>`; };
  const JOB_BADGE = { QUEUED: ['', 'En file'], RUNNING: ['accent', 'En cours'], SUCCESS: ['ok', 'Réussi'], FAILED: ['bad', 'Échec'], CANCELLED: ['warn', 'Annulé'] };
  const jobBadge = (s) => { const b = JOB_BADGE[s] || ['', s]; return `<span class="badge ${b[0]}">${esc(b[1])}</span>`; };
  A.stateBadge = stateBadge; A.jobBadge = jobBadge;
  const rssiBars = (r) => {
    if (r == null || r === 0) return '<span class="muted">—</span>';
    const l = r > -55 ? 4 : r > -67 ? 3 : r > -78 ? 2 : 1;
    const c = l >= 3 ? 'var(--ok)' : l === 2 ? 'var(--warn)' : 'var(--bad)';
    return `<span class="row" style="gap:6px"><span class="rssi l${l}" style="color:${c}"><i></i><i></i><i></i><i></i></span><span class="num small">${r} dBm</span></span>`;
  };
  A.rssiBars = rssiBars;
  const workerName = (w) => w.label || `Worker ${w.id}`;
  A.workerName = workerName;

  async function runJob(type, worker) {
    const r = await act(post('/api/job', { type, worker: worker || 0, priority: 60 }));
    if (r && r.accepted) toast(`${jobName(type)} : job #${r.id} ${worker ? 'envoyé au worker ' + worker : 'mis en file'}`, 'ok');
    A.refreshState();
  }
  async function fleetJob(type) {
    const r = await act(post('/api/fleet/job', { type }));
    if (r && r.ok) toast(`${jobName(type)} lancé sur ${r.accepted} worker(s)`, r.accepted ? 'ok' : 'warn');
  }
  A.runJob = runJob; A.fleetJob = fleetJob;

  function eventsHtml(list, max) {
    const ev = list.slice(-(max || 40)).reverse();
    if (!ev.length) return `<div class="empty">${icon('history')}<div class="small">Aucun événement pour l'instant</div></div>`;
    return `<div class="events">${ev.map((e) => {
      const clock = fmtClock(e.epoch) || fmtDur(e.t);
      return `<div class="event ${esc(e.lv)}"><span class="t">${esc(clock)}</span><span class="m"><span class="src">${esc(e.src)}</span>${esc(e.msg)}</span></div>`;
    }).join('')}</div>`;
  }
  A.eventsHtml = eventsHtml;

  /* ================================================================ */
  /* Tableau de bord                                                  */
  /* ================================================================ */
  A.page({
    id: 'dash', title: 'Tableau de bord', short: 'Accueil', icon: 'home', group: 'main', mobile: true,
    desc: 'Vue d\'ensemble du laboratoire en temps réel',
    render(el) {
      A.setTopActions(`<button class="btn" data-act="discover">${icon('radar')}<span class="lbl">Découvrir</span></button><button class="btn primary" data-act="fleet-check">${icon('check')}<span class="lbl">Check-up flotte</span></button>`);
      el.innerHTML = `
        <div id="dash-banner"></div>
        <div class="grid g-4" id="kpis"></div>
        <div class="grid g-3" style="margin-top:16px">
          <div class="card span-2"><div class="card-h"><div class="grow"><h2>Activité du MASTER</h2><div class="card-sub">Mémoire libre, température et humidité — ${A.S.demo ? 'données simulées' : 'mis à jour toutes les 2 s'}</div></div>
            <div class="seg" id="dash-seg"><button data-v="heap" class="on">Mémoire</button><button data-v="env">Ambiance</button><button data-v="workers">Workers</button></div></div>
            <div class="card-b"><div id="dash-chart"></div><div class="legend" id="dash-legend" style="margin-top:8px"></div></div></div>
          <div class="card"><div class="card-h"><div class="grow"><h2>Connectivité</h2></div><span id="net-badge"></span></div><div class="card-b"><div class="statlist" id="net"></div></div></div>
        </div>
        <div class="grid g-3" style="margin-top:16px">
          <div class="card span-2"><div class="card-h"><div class="grow"><h2>Workers</h2><div class="card-sub" id="wk-sub"></div></div><a class="btn sm" href="#fleet">Gérer ${icon('chevron')}</a></div><div class="card-b flush" id="wk-list" style="margin-top:10px"></div></div>
          <div class="card"><div class="card-h"><div class="grow"><h2>Journal</h2></div><a class="btn sm ghost" href="#settings?tab=logs">Tout voir</a></div><div class="card-b flush" id="ev-list" style="margin-top:10px;max-height:340px;overflow:auto"></div></div>
        </div>
        <div class="grid g-2" style="margin-top:16px">
          <div class="card"><div class="card-h"><div class="grow"><h2>Autodiagnostic</h2><div class="card-sub">10 vérifications de la carte MASTER</div></div><button class="btn sm" data-act="selftest">${icon('play')}Lancer</button></div><div class="card-b" id="selftest"><div class="small muted">Lancez le diagnostic pour vérifier mémoire, microSD, Internet, capteur, portail captif…</div></div></div>
          <div class="card"><div class="card-h"><div class="grow"><h2>Raccourcis</h2></div></div><div class="card-b"><div class="grid g-2" style="gap:10px">
            ${[['studio', 'wand', 'Créer un projet', 'Assemblez capteurs + règles, code généré'], ['library', 'book', 'Bibliothèque', `${(A.catalogCount && A.catalogCount()) || '300+'} projets prêts à flasher`], ['sensors', 'activity', 'Capteurs en direct', 'Mesures envoyées par vos montages'], ['tools', 'calc', 'Outils', 'Brochage, calculateurs, I2C'], ['usb', 'usb', 'USB & Arduino', 'Moniteur série, flash AVR'], ['assistant', 'chat', 'Assistant', 'Posez une question au labo']].map(([to, ic, t, d]) => `<a class="list-item click" href="#${to}" style="border:1px solid var(--line);border-radius:10px;color:inherit;text-decoration:none"><div class="icon-tile accent">${icon(ic)}</div><div class="grow"><div style="font-weight:600">${t}</div><div class="small muted ellipsis">${d}</div></div></a>`).join('')}
          </div></div></div>
        </div>`;
      let mode = store.get('dash.chart', 'heap');
      $$('#dash-seg button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === mode));
      $('#dash-seg', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.v; store.set('dash.chart', mode); $$('#dash-seg button', el).forEach((x) => x.classList.toggle('on', x === b)); draw(); });
      const draw = () => {
        const st = S.state;
        if (!st) { $('#kpis', el).innerHTML = '<div class="card kpi"><div class="skel" style="width:60%"></div><div class="skel" style="height:26px;width:40%"></div></div>'.repeat(4); return; }
        const m = st.master, H = S.hist;
        const online = (st.workers || []).filter((w) => w.state !== 'OFFLINE');
        const busy = online.filter(isBusy).length;
        const heapPct = m.heap && m.psram_total ? null : null;
        $('#kpis', el).innerHTML = `
          <div class="card kpi"><div class="k">${icon('cpu')}Workers en ligne</div><div class="v">${online.length}<small>/ ${st.worker_capacity}</small></div><div class="s">${busy} occupé(s) · ${(st.workers || []).length - online.length} hors ligne</div><div class="spark">${spark(H.workers, 'var(--accent)')}</div></div>
          <div class="card kpi"><div class="k">${icon('list')}Jobs</div><div class="v">${st.jobs.running}<small>en cours</small></div><div class="s">${st.jobs.queued} en file · <span style="color:var(--ok)">${st.jobs.success} ✓</span> · <span style="color:var(--bad)">${st.jobs.failed} ✗</span></div><div class="progress-row" style="margin-top:auto"><div class="meter ok"><i style="width:${st.jobs.success + st.jobs.failed ? Math.round(100 * st.jobs.success / (st.jobs.success + st.jobs.failed)) : 0}%"></i></div><span class="small muted num">${st.jobs.success + st.jobs.failed ? Math.round(100 * st.jobs.success / (st.jobs.success + st.jobs.failed)) + ' %' : '—'}</span></div></div>
          <div class="card kpi"><div class="k">${icon('memory')}Mémoire libre</div><div class="v">${fmtBytes(m.heap_internal || m.heap)}</div><div class="s">PSRAM ${fmtBytes(m.psram)} / ${fmtBytes(m.psram_total)} · min ${fmtBytes(m.heap_min)}</div><div class="spark">${spark(H.heap, 'var(--violet)')}</div></div>
          <div class="card kpi"><div class="k">${icon('thermo')}Ambiance (DHT)</div><div class="v">${m.temp == null ? '—' : fmtNum(m.temp)}<small>°C</small></div><div class="s">${m.humidity == null ? 'capteur non détecté' : fmtNum(m.humidity, 0) + ' % d\'humidité'}</div><div class="spark">${spark(H.temp, 'var(--warn)')}</div></div>`;
        const labels = H.t.map((t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        let series, legend, opts = { h: 220, labels };
        if (mode === 'env') { series = [{ data: H.temp, color: 'var(--warn)' }, { data: H.hum, color: 'var(--info)' }]; legend = [['var(--warn)', 'Température (°C)'], ['var(--info)', 'Humidité (%)']]; }
        else if (mode === 'workers') { series = [{ data: H.workers, color: 'var(--accent)', fill: true }]; legend = [['var(--accent)', 'Workers en ligne']]; opts.min = 0; }
        else { series = [{ data: H.heap.map((v) => v / 1024), color: 'var(--violet)', fill: true }]; legend = [['var(--violet)', 'RAM libre (Ko)']]; }
        $('#dash-chart', el).innerHTML = lineChart(series, opts);
        $('#dash-legend', el).innerHTML = legend.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('') + `<span class="muted">${H.t.length} points · ${fmtDur(H.t.length > 1 ? H.t[H.t.length - 1] - H.t[0] : 0)}</span>`;
        $('#net-badge', el).innerHTML = m.internet ? '<span class="badge ok">Internet</span>' : '<span class="badge">Hors ligne</span>';
        $('#net', el).innerHTML = [
          ['Point d\'accès', `<b>${esc(m.ap_ssid)}</b>`],
          ['Adresse locale', `<span class="mono">${esc(m.ap_ip)}</span> · ${esc(m.hostname)}.local`],
          ['Appareils connectés', m.ap_clients],
          ['Wi-Fi Internet', m.internet ? `<span class="mono">${esc(m.sta_ip)}</span>` : '<span class="muted">non connecté</span>'],
          ['Signal', m.internet ? rssiBars(m.sta_rssi) : '—'],
          ['Heure', m.time_synced ? esc(fmtClock(m.epoch)) : '<span class="muted">non synchronisée</span>'],
          ['microSD', m.sd ? '<span class="badge ok">montée</span>' : '<span class="badge warn">absente</span>'],
          ['USB hôte', m.usb_avr ? '<span class="badge accent">carte connectée</span>' : '<span class="muted">libre</span>'],
          ['En marche depuis', fmtDur(m.uptime_ms)]
        ].map(([k, v]) => `<div><span class="muted">${k}</span><span style="text-align:right">${v}</span></div>`).join('');
        const ws = (st.workers || []).slice().sort((a, b) => (a.state === 'OFFLINE') - (b.state === 'OFFLINE') || a.id - b.id);
        $('#wk-sub', el).textContent = `${online.length} en ligne sur ${st.worker_capacity} emplacements`;
        $('#wk-list', el).innerHTML = ws.length ? `<div class="table-wrap"><table class="tbl responsive"><thead><tr><th>Worker</th><th>État</th><th>Job</th><th class="hide-sm">Mémoire</th><th class="hide-sm">Signal</th></tr></thead><tbody>${ws.map((w) => `<tr class="click" data-act="nav" data-to="fleet" data-q='{"w":"${w.id}"}'>
            <td><div class="row"><span class="worker-id" style="width:28px;height:28px;font-size:12px;border-radius:8px;display:grid;place-items:center;background:var(--surface-3)">${w.id}</span><div><div style="font-weight:600">${esc(workerName(w))}</div><div class="tiny muted mono">${esc(w.ip || '')}</div></div></div></td>
            <td data-l="État">${stateBadge(w.state)}</td>
            <td data-l="Job" class="wide">${w.job && w.job !== '-' && isBusy(w) ? `<div class="progress-row"><span class="small">${esc(jobName(w.job))}</span><div class="meter"><i style="width:${w.progress || 0}%"></i></div><span class="small num">${w.progress || 0}%</span></div>` : '<span class="muted small">—</span>'}</td>
            <td data-l="Mémoire" class="hide-sm num">${fmtBytes(w.heap)}</td><td data-l="Signal" class="hide-sm">${rssiBars(w.rssi)}</td></tr>`).join('')}</tbody></table></div>`
          : `<div class="empty">${icon('cpu')}<h3>Aucun worker détecté</h3><div class="small">Flashez <code>firmware/worker</code> sur un ESP32 : il rejoint automatiquement le Wi-Fi « ${esc(m.ap_ssid)} ».</div><button class="btn sm" data-act="discover">${icon('radar')}Lancer une découverte</button></div>`;
        $('#ev-list', el).innerHTML = eventsHtml(S.events, 30);
        const warn = [];
        if (!m.sd) warn.push('microSD absente : la bibliothèque, les rapports et les journaux ne sont pas enregistrés. Formatez la carte en FAT32.');
        if (m.heap_internal && m.heap_internal < 40000) warn.push(`Mémoire interne faible (${fmtBytes(m.heap_internal)}).`);
        $('#dash-banner', el).innerHTML = warn.map((w) => `<div class="banner warn">${icon('alert')}<div>${esc(w)}</div></div>`).join('');
        void heapPct;
      };
      draw();
      return A.onState(draw);
    }
  });

  A.actions.discover = async () => { await act(post('/api/worker/discover'), 'Découverte envoyée : les workers répondent sous quelques secondes'); };
  A.actions['fleet-check'] = () => fleetJob('SYSTEM_TEST');
  A.actions.selftest = async () => {
    const box = $('#selftest');
    if (box) box.innerHTML = '<div class="skel"></div><div class="skel" style="margin-top:8px;width:70%"></div>';
    const r = await act(api('/api/selftest'));
    if (!r || !box) return;
    const ok = r.checks.filter((c) => c.ok).length;
    box.innerHTML = `<div class="row between" style="margin-bottom:8px"><span class="badge ${ok === r.checks.length ? 'ok' : 'warn'}">${ok}/${r.checks.length} vérifications réussies</span></div><div class="statlist">${r.checks.map((c) => `<div><span class="row">${c.ok ? `<span style="color:var(--ok)">${icon('check')}</span>` : `<span style="color:var(--warn)">${icon('alert')}</span>`}${esc(c.name)}</span><span class="muted small" style="text-align:right">${esc(c.detail)}</span></div>`).join('')}</div>`;
  };

  /* ================================================================ */
  /* Flotte de workers                                                */
  /* ================================================================ */
  function workerCard(w) {
    const cls = w.state === 'OFFLINE' ? 'offline' : isBusy(w) ? 'busy' : 'online';
    const busy = isBusy(w) && w.job && w.job !== '-';
    return `<div class="card worker ${cls}" data-w="${w.id}">
      <div class="worker-top"><div class="worker-id">${w.id}</div><div class="grow" style="min-width:0"><div class="row between"><h3 class="ellipsis">${esc(workerName(w))}</h3>${stateBadge(w.state)}</div>
        <div class="small muted ellipsis"><span class="mono">${esc(w.ip || '—')}</span> · v${esc(w.version || '?')}${w.cores ? ` · ${w.cores} cœur(s) ${w.cpu_mhz || ''} MHz` : ''}</div></div></div>
      <div class="worker-metrics"><div><div class="k">Mémoire</div><div class="v">${w.heap ? fmtBytes(w.heap) : '—'}</div></div><div><div class="k">Signal</div><div class="v">${w.rssi ? w.rssi + ' dBm' : '—'}</div></div><div><div class="k">${w.state === 'OFFLINE' ? 'Vu' : 'En marche'}</div><div class="v">${w.state === 'OFFLINE' ? fmtAgo(w.age_ms) : fmtDur(w.uptime_ms)}</div></div></div>
      <div class="worker-job">${busy ? `<div class="row between small"><span>${esc(jobName(w.job))}</span><span class="num">${w.progress || 0} %</span></div><div class="meter"><i style="width:${w.progress || 0}%"></i></div>`
        : w.state === 'PROJECT' ? `<div class="small ellipsis">Exécute le projet <b>${esc(w.job || '')}</b> — menu ⋯ pour revenir au mode worker</div>` : `<div class="small muted ellipsis">${w.last_result ? 'Dernier résultat : ' + esc(w.last_result) : w.state === 'OFFLINE' ? 'Hors ligne — les jobs en attente seront réattribués.' : 'Disponible pour un job.'}</div>`}</div>
      <div class="worker-actions">
        <button class="btn sm" data-act="w-job" data-type="PING" data-id="${w.id}" ${w.state === 'OFFLINE' || w.state === 'PROJECT' ? 'disabled' : ''}>${icon('activity')}Ping</button>
        <button class="btn sm" data-act="w-job" data-type="IDENTIFY" data-id="${w.id}" ${w.state === 'OFFLINE' || w.state === 'PROJECT' ? 'disabled' : ''}>${icon('eye')}Repérer</button>
        <button class="btn sm" data-act="w-open" data-id="${w.id}">${icon('info')}Détails</button>
        <button class="btn sm icon" data-act="w-menu" data-id="${w.id}" aria-label="Plus d'actions">${icon('more')}</button>
      </div></div>`;
  }

  A.page({
    id: 'fleet', title: 'Workers', short: 'Workers', icon: 'cpu', group: 'main', mobile: true, badge: true,
    desc: 'Workers ESP32 connectés, jobs et maintenance',
    render(el, q) {
      A.setTopActions(`<button class="btn" data-act="discover">${icon('radar')}<span class="lbl">Découvrir</span></button><button class="btn" data-act="fleet-menu">${icon('layers')}<span class="lbl">Actions groupées</span></button>`);
      let filter = 'all';
      el.innerHTML = `<div class="toolbar" style="margin-bottom:14px"><div class="seg" id="fl-seg"><button data-v="all" class="on">Tous</button><button data-v="on">En ligne</button><button data-v="busy">Occupés</button><button data-v="off">Hors ligne</button></div><div class="grow"></div><span class="small muted" id="fl-count"></span></div><div class="grid g-auto" id="fl-grid"></div>`;
      $('#fl-seg', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.v; $$('#fl-seg button', el).forEach((x) => x.classList.toggle('on', x === b)); draw(); });
      const draw = () => {
        const st = S.state;
        if (!st) return;
        let ws = (st.workers || []).slice().sort((a, b) => a.id - b.id);
        const total = ws.length;
        if (filter === 'on') ws = ws.filter((w) => w.state !== 'OFFLINE');
        if (filter === 'busy') ws = ws.filter(isBusy);
        if (filter === 'off') ws = ws.filter((w) => w.state === 'OFFLINE');
        $('#fl-count', el).textContent = `${total} worker(s) connu(s) · ${st.worker_capacity} emplacements`;
        const free = filter === 'all' ? Math.max(0, st.worker_capacity - total) : 0;
        $('#fl-grid', el).innerHTML = ws.map(workerCard).join('') + (free ? `<div class="slot-empty">${icon('plus')}<b>${free} emplacement(s) libre(s)</b><span>Flashez <code>firmware/worker</code> sur un ESP32 ou ESP32-S3 : il rejoint « ${esc(st.master.ap_ssid)} » et apparaît ici automatiquement.</span></div>` : '') || `<div class="card"><div class="empty">${icon('filter')}<div class="small">Aucun worker dans ce filtre</div></div></div>`;
      };
      draw();
      if (q && q.w) setTimeout(() => openWorker(Number(q.w)), 50);
      return A.onState(draw);
    }
  });

  const findWorker = (id) => ((S.state && S.state.workers) || []).find((w) => w.id === Number(id));
  A.actions['w-job'] = (b) => runJob(b.dataset.type, Number(b.dataset.id));
  A.actions['w-open'] = (b) => openWorker(Number(b.dataset.id));
  A.actions['w-menu'] = async (b) => {
    const id = Number(b.dataset.id), w = findWorker(id);
    if (!w) return;
    const opts = JOB_TYPES.filter((j) => j.id !== 'PING' && j.id !== 'IDENTIFY').map((j) => ({ k: 'job:' + j.id, i: j.icon, t: j.name, d: j.desc, dis: w.state === 'OFFLINE' || w.state === 'PROJECT' }));
    opts.push({ k: 'label', i: 'edit', t: 'Renommer', d: 'Nom mémorisé par le MASTER', admin: true });
    opts.push({ k: 'project', i: 'rocket', t: 'Charger un projet sur ce worker', d: 'Exécute votre .bin ; le worker reste en réserve (BOOT 3 s ou « Revenir » pour le récupérer)', admin: true, dis: w.state === 'OFFLINE' || w.state === 'PROJECT' });
    if (w.state === 'PROJECT') opts.push({ k: 'home', i: 'back', t: 'Revenir au mode worker', d: 'Arrête le projet « ' + (w.job || '') + ' » et relance le programme worker', admin: true });
    opts.push({ k: 'flash', i: 'upload', t: 'Mettre à jour le firmware worker (OTA)', d: 'Remplace le programme worker par un nouveau .bin de la microSD', admin: true, dis: w.state === 'OFFLINE' || w.state === 'PROJECT' });
    opts.push({ k: 'reboot', i: 'power', t: 'Redémarrer', d: 'Redémarrage logiciel du worker', admin: true, dis: w.state === 'OFFLINE' });
    opts.push({ k: 'forget', i: 'trash', t: 'Oublier ce worker', d: 'Libère l\'emplacement (hors ligne uniquement)', admin: true, dis: w.state !== 'OFFLINE' });
    const d = drawer(workerName(w), `<div class="card">${opts.map((o) => `<button class="list-item click" style="width:100%;border:0;background:none;text-align:left;cursor:pointer" data-k="${o.k}" ${o.dis || (o.admin && !S.admin) ? 'disabled style="opacity:.45;width:100%;border:0;background:none;text-align:left"' : ''}><div class="icon-tile">${icon(o.i)}</div><div class="grow"><div style="font-weight:600">${esc(o.t)}${o.admin ? ' <span class="badge outline">admin</span>' : ''}</div><div class="small muted">${esc(o.d)}</div></div></button>`).join('')}</div>`, { sub: `Worker ${id} · ${w.ip || ''}` });
    d.body.addEventListener('click', async (e) => {
      const it = e.target.closest('[data-k]');
      if (!it || it.disabled) return;
      const k = it.dataset.k;
      d.close();
      if (k.startsWith('job:')) return runJob(k.slice(4), id);
      if (k === 'label') {
        const v = await modal({ title: 'Renommer le worker ' + id, input: w.label || '', label: 'Nom (31 caractères max)', placeholder: 'ex. Serre, Atelier…', ok: 'Enregistrer' });
        if (v != null) { await act(post('/api/worker/label', { id, label: v.slice(0, 31) }), 'Nom enregistré'); A.refreshState(); }
      } else if (k === 'reboot') {
        if (await confirmBox('Redémarrer le worker ' + id, 'Le job en cours sera interrompu puis réattribué.', 'Redémarrer', true)) act(post('/api/worker/reboot', { id }), 'Redémarrage demandé');
      } else if (k === 'forget') {
        if (await confirmBox('Oublier le worker ' + id, 'Son emplacement et son nom seront libérés. Il réapparaîtra s\'il se reconnecte.', 'Oublier', true)) { await act(post('/api/worker/forget', { id }), 'Worker oublié'); A.refreshState(); }
      } else if (k === 'flash') flashWorker(id, false);
      else if (k === 'project') flashWorker(id, true);
      else if (k === 'home') { await act(post('/api/worker/home', { id }), 'Retour au mode worker demandé : il réapparaît dans quelques secondes'); }
    });
  };
  A.actions['fleet-menu'] = () => {
    const items = [['PING', 'activity', 'Ping de toute la flotte'], ['SYSTEM_TEST', 'check', 'Check-up de toute la flotte'], ['BENCHMARK', 'gauge', 'Benchmark comparatif'], ['I2C_SCAN', 'search', 'Scan I2C partout'], ['WIFI_SCAN', 'wifi', 'Cartographie Wi-Fi (scan partout)'], ['MEM_TEST', 'memory', 'Test mémoire partout'], ['IDENTIFY', 'eye', 'Faire clignoter tous les workers']];
    const d = drawer('Actions groupées', `<p class="small muted" style="margin-bottom:12px">Un job est créé pour chaque worker en ligne ; suivez la progression dans Jobs.</p><div class="card">${items.map(([t, i, n]) => `<button class="list-item click" style="width:100%;border:0;background:none;text-align:left;cursor:pointer" data-t="${t}"><div class="icon-tile accent">${icon(i)}</div><div class="grow" style="font-weight:600">${n}</div>${icon('chevron')}</button>`).join('')}
      <button class="list-item click" style="width:100%;border:0;background:none;text-align:left;cursor:pointer" data-t="REBOOT" ${S.admin ? '' : 'disabled'}><div class="icon-tile bad">${icon('power')}</div><div class="grow" style="font-weight:600">Redémarrer tous les workers <span class="badge outline">admin</span></div></button></div>`);
    d.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-t]');
      if (!b || b.disabled) return;
      d.close();
      if (b.dataset.t === 'REBOOT') {
        if (await confirmBox('Redémarrer toute la flotte', 'Tous les workers en ligne vont redémarrer.', 'Redémarrer', true)) act(post('/api/fleet/reboot'), (r) => `${r.accepted} worker(s) redémarré(s)`);
      } else fleetJob(b.dataset.t);
    });
  };

  /* Flash par Wi-Fi avec sélection du projet, montage et moniteur : voir 46_flash.js. */
  const flashWorker = (id, asProject) => A.flashWorker(id, asProject);

  async function openWorker(id) {
    const w = findWorker(id);
    if (!w) { toast('Worker introuvable', 'warn'); return; }
    let cleanup = null;
    const d = drawer(workerName(w), `<div class="tabs" id="wd-tabs"><button class="on" data-t="info">Aperçu</button><button data-t="log">Moniteur</button><button data-t="gpio">GPIO</button><button data-t="net">Réseaux Wi-Fi</button><button data-t="raw">Données brutes</button></div><div class="tab-panel" id="wd-body"></div>`, { sub: `Worker ${id} · <span class="mono">${esc(w.ip || '')}</span>`, onClose: () => { if (cleanup) cleanup(); } });
    let tab = 'info', info = null;
    const body = $('#wd-body', d.el);
    const render = async () => {
      const cur = findWorker(id) || w;
      if (cleanup) { cleanup(); cleanup = null; }
      if (tab === 'log') { cleanup = A.workerLogPanel(body, id); return; }
      if (tab === 'gpio') { cleanup = cur.state === 'PROJECT' || cur.state === 'OFFLINE' ? null : A.workerGpioPanel(body, id); if (!cleanup) body.innerHTML = `<div class="empty">${icon('chip')}<div class="small">Panneau GPIO disponible quand le worker exécute le firmware worker (état « Prêt »).</div></div>`; return; }
      if (tab === 'info') {
        body.innerHTML = `<div class="grid g-2">
          <div class="card pad"><dl class="dl">
            <dt>État</dt><dd>${stateBadge(cur.state)}</dd><dt>Adresse IP</dt><dd class="mono">${esc(cur.ip)}</dd><dt>MAC</dt><dd class="mono">${esc(cur.mac || '—')}</dd>
            <dt>Firmware</dt><dd>v${esc(cur.version || '?')}</dd><dt>CPU</dt><dd>${cur.cores || '?'} cœur(s) · ${cur.cpu_mhz || '?'} MHz</dd>
            <dt>Flash / PSRAM</dt><dd>${fmtBytes(cur.flash_size)} / ${cur.psram_size ? fmtBytes(cur.psram_size) : 'aucune'}</dd>
            <dt>Mémoire</dt><dd>${fmtBytes(cur.heap)} (min ${fmtBytes(cur.heap_min)})</dd><dt>Signal</dt><dd>${rssiBars(cur.rssi)}</dd>
            <dt>En marche</dt><dd>${fmtDur(cur.uptime_ms)}</dd><dt>Battements</dt><dd class="num">${cur.hb_count || 0} · dernier ${fmtAgo(cur.age_ms)}</dd>
          </dl></div>
          <div class="stack">${/I2C|0x[0-9a-f]{2}/i.test(cur.last_result || '') && A.i2cIdentify ? A.i2cIdentify(cur.last_result) : ''}<div class="card pad"><h3 style="margin-bottom:8px">Dernier résultat</h3><div class="small" style="white-space:pre-wrap">${esc(cur.last_result || 'Aucun job terminé.')}</div>${cur.resume_available ? `<div class="banner" style="margin:10px 0 0">${icon('history')}<div>Point de reprise : ${esc(cur.checkpoint_type)} (${cur.checkpoint_progress} %, phase ${esc(cur.checkpoint_phase)})</div></div>` : ''}</div>
          <div class="card pad"><h3 style="margin-bottom:10px">Lancer un job</h3><div class="btn-group">${JOB_TYPES.map((j) => `<button class="btn sm" data-act="w-job" data-type="${j.id}" data-id="${id}" ${cur.state === 'OFFLINE' ? 'disabled' : ''}>${icon(j.icon)}${esc(j.name)}</button>`).join('')}</div></div></div></div>`;
      } else if (tab === 'net') {
        body.innerHTML = '<div class="skel"></div>';
        try {
          let r = await api(`/api/worker/scan?id=${id}&start=1`);
          for (let i = 0; i < 8 && r && r.state === 'running'; i++) { await A.sleep(1200); r = await api(`/api/worker/scan?id=${id}`); }
          const nets = (r && r.networks) || [];
          body.innerHTML = nets.length ? `<div class="card"><div class="table-wrap"><table class="tbl responsive"><thead><tr><th>Réseau</th><th>Signal</th><th>Canal</th><th>Sécurité</th></tr></thead><tbody>${nets.sort((a, b) => b.rssi - a.rssi).map((n) => `<tr><td class="wide"><b>${esc(n.ssid || '(masqué)')}</b> <span class="tiny muted mono">${esc(n.bssid || '')}</span></td><td data-l="Signal">${rssiBars(n.rssi)}</td><td data-l="Canal" class="num">${n.channel}</td><td data-l="Sécurité">${esc(n.auth)}</td></tr>`).join('')}</tbody></table></div></div>
            <div class="card pad" style="margin-top:12px"><h3 style="margin-bottom:8px">Occupation des canaux 2,4 GHz</h3>${channelChart(nets)}</div>` : `<div class="empty">${icon('wifi')}<div class="small">${esc((r && r.error) || 'Aucun réseau trouvé')}</div></div>`;
        } catch (e) { body.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
      } else {
        body.innerHTML = '<div class="skel"></div>';
        try { info = info || await api('/api/worker/info?id=' + id); body.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="copy" data-text="${esc(JSON.stringify(info, null, 2))}">${icon('copy')}Copier</button></div>` + A.codeBlock(JSON.stringify(info, null, 2), '60vh'); }
        catch (e) { body.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
      }
    };
    $('#wd-tabs', d.el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; $$('#wd-tabs button', d.el).forEach((x) => x.classList.toggle('on', x === b)); render(); });
    render();
  }
  A.openWorker = openWorker;

  function channelChart(nets) {
    const ch = new Array(14).fill(0);
    nets.forEach((n) => { for (let c = n.channel - 2; c <= n.channel + 2; c++) if (c >= 1 && c <= 13) ch[c] += Math.max(0, 100 + n.rssi) / (1 + Math.abs(c - n.channel)); });
    const max = Math.max(1, ...ch);
    const best = [1, 6, 11].sort((a, b) => ch[a] - ch[b])[0];
    return `<div style="display:grid;grid-template-columns:repeat(13,1fr);gap:4px;align-items:end;height:110px">${ch.slice(1).map((v, i) => `<div title="Canal ${i + 1}" style="height:${Math.max(4, (v / max) * 100)}%;background:${i + 1 === best ? 'var(--ok)' : 'var(--accent)'};opacity:${i + 1 === best ? 1 : 0.35 + 0.65 * v / max};border-radius:4px 4px 0 0"></div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(13,1fr);gap:4px;text-align:center" class="tiny muted">${Array.from({ length: 13 }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>
      <p class="small" style="margin-top:8px">Canal conseillé pour le point d'accès du MASTER : <b>${best}</b> (le moins encombré parmi 1, 6 et 11).</p>`;
  }
  A.channelChart = channelChart;

  /* ================================================================ */
  /* Jobs                                                             */
  /* ================================================================ */
  A.page({
    id: 'jobs', title: 'Jobs', icon: 'list', group: 'main', mobile: true, badge: true,
    desc: 'File d\'attente, lancement et historique des tâches',
    render(el) {
      A.setTopActions(`<button class="btn" data-act="jobs-csv">${icon('download')}<span class="lbl">CSV</span></button>${S.admin ? `<button class="btn" data-act="jobs-clear">${icon('trash')}<span class="lbl">Nettoyer</span></button><button class="btn danger" data-act="jobs-cancel-all">${icon('stop')}<span class="lbl">Tout annuler</span></button>` : ''}`);
      el.innerHTML = `<div class="grid g-3">
        <div class="card"><div class="card-h"><h2>Nouveau job</h2></div><div class="card-b stack" style="gap:12px">
          <div class="field"><label>Type</label><select class="select" id="jb-type">${JOB_TYPES.map((j) => `<option value="${j.id}">${esc(j.name)}</option>`).join('')}</select><div class="hint" id="jb-desc"></div></div>
          <div class="field"><label>Worker</label><select class="select" id="jb-w"></select></div>
          <div class="field"><label>Priorité : <span id="jb-pv">50</span></label><input type="range" id="jb-pr" min="1" max="100" value="50"><div class="hint">Les jobs les plus prioritaires passent en premier.</div></div>
          <div class="row"><button class="btn primary grow" id="jb-go">${icon('play')}Lancer</button><button class="btn grow" id="jb-all">${icon('layers')}Toute la flotte</button></div>
        </div></div>
        <div class="card span-2"><div class="card-h"><div class="grow"><h2>File et historique</h2><div class="card-sub" id="jb-stats"></div></div><div class="seg" id="jb-seg"><button data-v="all" class="on">Tous</button><button data-v="active">Actifs</button><button data-v="done">Terminés</button></div></div><div class="card-b flush" style="margin-top:10px" id="jb-list"></div></div>
      </div>`;
      const sel = $('#jb-w', el), typ = $('#jb-type', el);
      const fillWorkers = () => {
        const ws = ((S.state && S.state.workers) || []).filter((w) => w.state !== 'OFFLINE');
        const cur = sel.value;
        sel.innerHTML = `<option value="0">Automatique (premier worker libre)</option>` + ws.map((w) => `<option value="${w.id}">${w.id} · ${esc(workerName(w))}${isBusy(w) ? ' (occupé)' : ''}</option>`).join('');
        if (cur) sel.value = cur;
      };
      const desc = () => { $('#jb-desc', el).textContent = (JOB_TYPES.find((j) => j.id === typ.value) || {}).desc || ''; };
      typ.addEventListener('change', desc); desc();
      $('#jb-pr', el).addEventListener('input', (e) => { $('#jb-pv', el).textContent = e.target.value; });
      $('#jb-go', el).addEventListener('click', async () => {
        const r = await act(post('/api/job', { type: typ.value, worker: sel.value, priority: $('#jb-pr', el).value }));
        if (r && r.accepted) { toast(`Job #${r.id} créé`, 'ok'); load(); }
      });
      $('#jb-all', el).addEventListener('click', () => fleetJob(typ.value).then(load));
      let filter = 'all', jobs = [];
      $('#jb-seg', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.v; $$('#jb-seg button', el).forEach((x) => x.classList.toggle('on', x === b)); draw(); });
      const draw = () => {
        let list = jobs.slice().sort((a, b) => b.id - a.id);
        if (filter === 'active') list = list.filter((j) => j.status === 'QUEUED' || j.status === 'RUNNING');
        if (filter === 'done') list = list.filter((j) => !(j.status === 'QUEUED' || j.status === 'RUNNING'));
        const c = (s) => jobs.filter((j) => j.status === s).length;
        $('#jb-stats', el).textContent = `${c('RUNNING')} en cours · ${c('QUEUED')} en file · ${c('SUCCESS')} réussi(s) · ${c('FAILED')} échec(s)`;
        $('#jb-list', el).innerHTML = list.length ? `<div class="table-wrap"><table class="tbl responsive"><thead><tr><th>#</th><th>Type</th><th>Worker</th><th>État</th><th>Progression</th><th>Durée</th><th></th></tr></thead><tbody>${list.map((j) => {
          const dur = j.started_ms ? (j.finished_ms || (S.state ? S.state.master.uptime_ms : j.started_ms)) - j.started_ms : null;
          const active = j.status === 'QUEUED' || j.status === 'RUNNING';
          return `<tr><td class="num muted">${j.id}</td><td><b>${esc(jobName(j.type))}</b>${j.retries ? ` <span class="badge warn">${j.retries} reprise(s)</span>` : ''}${j.result ? `<div class="tiny muted" style="max-width:340px;white-space:normal">${esc(j.result)}</div>` : ''}</td>
            <td data-l="Worker">${j.worker ? esc(workerName(findWorker(j.worker) || { id: j.worker })) : (j.target_worker ? `→ ${j.target_worker}` : '<span class="muted">auto</span>')}</td>
            <td data-l="État">${jobBadge(j.status)}</td>
            <td data-l="Progression" style="min-width:120px"><div class="progress-row"><div class="meter ${j.status === 'FAILED' ? 'bad' : j.status === 'SUCCESS' ? 'ok' : ''}"><i style="width:${j.status === 'SUCCESS' ? 100 : j.progress || 0}%"></i></div><span class="small num">${j.status === 'SUCCESS' ? 100 : j.progress || 0}%</span></div></td>
            <td data-l="Durée" class="num small">${dur != null ? fmtDur(dur) : '—'}</td>
            <td>${active && S.admin ? `<button class="btn sm ghost danger" data-act="job-cancel" data-id="${j.id}" title="Annuler">${icon('x')}</button>` : ''}</td></tr>`;
        }).join('')}</tbody></table></div>` : `<div class="empty">${icon('list')}<h3>Aucun job</h3><div class="small">Lancez un check-up ou un benchmark pour tester vos workers.</div></div>`;
      };
      const load = async () => { try { jobs = (await api('/api/jobs')) || []; A.jobsCache = jobs; draw(); } catch (e) { /* hors ligne */ } };
      load(); fillWorkers();
      const t = setInterval(() => { if (!document.hidden) load(); }, 2000);
      const off = A.onState(fillWorkers);
      return () => { clearInterval(t); off(); };
    }
  });
  A.actions['job-cancel'] = async (b) => { await act(post('/api/job/cancel', { id: b.dataset.id }), 'Job annulé'); };
  A.actions['jobs-cancel-all'] = async () => { if (await confirmBox('Tout annuler', 'Annuler tous les jobs en file et en cours ?', 'Tout annuler', true)) act(post('/api/jobs/cancel-all'), (r) => `${r.cancelled} job(s) annulé(s)`); };
  A.actions['jobs-clear'] = () => act(post('/api/jobs/clear'), (r) => `${r.cleared} job(s) retiré(s) de l'historique`);
  A.actions['jobs-csv'] = () => {
    const j = A.jobsCache || [];
    const rows = [['id', 'type', 'worker', 'status', 'progress', 'retries', 'created_ms', 'started_ms', 'finished_ms', 'result']].concat(j.map((x) => [x.id, x.type, x.worker, x.status, x.progress, x.retries, x.created_ms, x.started_ms, x.finished_ms, x.result]));
    download('esp32-lab-jobs.csv', rows.map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(';')).join('\n'), 'text/csv;charset=utf-8');
  };

  /* ================================================================ */
  /* Capteurs en direct (flux UDP des montages)                        */
  /* ================================================================ */
  const alerts = () => store.get('alerts', {});
  const lastAlert = {};
  function checkAlerts(st) {
    const al = alerts();
    (st.feeds || []).forEach((f) => {
      const k = f.source + '/' + f.key, a = al[k];
      if (!a || !a.on) return;
      const bad = (a.min !== '' && a.min != null && f.value < Number(a.min)) || (a.max !== '' && a.max != null && f.value > Number(a.max));
      if (bad && (!lastAlert[k] || Date.now() - lastAlert[k] > 60000)) {
        lastAlert[k] = Date.now();
        const msg = `${f.source} · ${f.key} = ${fmtNum(f.value, 2)} ${f.unit} (seuil ${a.min !== '' && f.value < Number(a.min) ? '< ' + a.min : '> ' + a.max})`;
        toast('Alerte : ' + msg, 'warn', 8000);
        try { if ('Notification' in window && Notification.permission === 'granted') new Notification('ESP32 LAB — alerte capteur', { body: msg, icon: '/icon.svg' }); } catch (e) { /* notifications indisponibles */ }
        try { const ac = new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(); o.frequency.value = 880; o.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.15); } catch (e) { /* audio indisponible */ }
      }
    });
  }
  A.onState(checkAlerts);

  A.page({
    id: 'sensors', title: 'Capteurs en direct', short: 'Capteurs', icon: 'activity', group: 'main', mobile: true,
    desc: 'Mesures envoyées par vos montages, alertes et export',
    render(el) {
      A.setTopActions(`<button class="btn" data-act="feeds-csv">${icon('download')}<span class="lbl">Exporter CSV</span></button>`);
      let sel = new Set(store.get('plot.sel', []));
      el.innerHTML = `<div class="card" style="margin-bottom:16px"><div class="card-h"><div class="grow"><h2>Traceur</h2><div class="card-sub">Cochez des mesures pour les superposer (historique local de cette page)</div></div><button class="btn sm ghost" id="pl-clear">Effacer la sélection</button></div><div class="card-b"><div id="pl-chart"></div><div class="legend" id="pl-legend" style="margin-top:8px"></div></div></div><div id="fd-body"></div>`;
      $('#pl-clear', el).addEventListener('click', () => { sel = new Set(); store.set('plot.sel', []); draw(); });
      const draw = () => {
        const feeds = (S.state && S.state.feeds) || [];
        const groups = {};
        feeds.forEach((f) => { (groups[f.source] = groups[f.source] || []).push(f); });
        const al = alerts();
        const selArr = [...sel].filter((k) => S.feedHist[k]);
        if (selArr.length) {
          const t0 = Math.min(...selArr.map((k) => S.feedHist[k][0][0])), t1 = Date.now();
          const N = 120;
          const series = selArr.map((k, i) => {
            const h = S.feedHist[k], data = new Array(N).fill(null);
            h.forEach(([t, v]) => { const idx = Math.round(((t - t0) / Math.max(1, t1 - t0)) * (N - 1)); data[A.clamp(idx, 0, N - 1)] = v; });
            let lastV = null; for (let j = 0; j < N; j++) { if (data[j] == null) data[j] = lastV; else lastV = data[j]; }
            return { data, color: A.PALETTE[i % A.PALETTE.length] };
          });
          $('#pl-chart', el).innerHTML = lineChart(series, { h: 220 });
          $('#pl-legend', el).innerHTML = selArr.map((k, i) => `<span><i style="background:${A.PALETTE[i % A.PALETTE.length]}"></i>${esc(k)}</span>`).join('');
        } else {
          $('#pl-chart', el).innerHTML = `<div class="empty small" style="padding:26px">${icon('activity')}Sélectionnez une ou plusieurs mesures ci-dessous.</div>`;
          $('#pl-legend', el).innerHTML = '';
        }
        const body = $('#fd-body', el);
        if (!feeds.length) {
          body.innerHTML = `<div class="card"><div class="empty">${icon('antenna')}<h3>Aucune mesure reçue</h3><p class="small" style="max-width:520px">Dans le Studio ou la Bibliothèque, activez l'option <b>« Envoyer au MASTER »</b> : le montage publie ses mesures en UDP (port 4213) et elles apparaissent ici, avec courbes, alertes et export CSV.</p><div class="row"><a class="btn primary" href="#studio">${icon('wand')}Ouvrir le Studio</a><a class="btn" href="#library?q=MASTER">${icon('book')}Projets compatibles</a></div>
            <div class="small muted" style="margin-top:6px">Format : <code>LAB|appareil|clé|valeur|unité</code></div></div></div>`;
          return;
        }
        body.innerHTML = Object.keys(groups).sort().map((src) => {
          const list = groups[src];
          const ip = list[0].ip;
          const stale = list.every((f) => f.age_ms > 30000);
          return `<div class="section-title"><div class="icon-tile ${stale ? '' : 'ok'}">${icon('antenna')}</div><div class="grow"><h2>${esc(src)}</h2><div class="small muted"><span class="mono">${esc(ip)}</span> · ${list.length} mesure(s) · ${stale ? 'silencieux depuis ' + fmtDur(Math.min(...list.map((f) => f.age_ms))) : 'actif'}</div></div></div>
            <div class="grid g-auto-s">${list.map((f) => {
              const k = f.source + '/' + f.key, h = (S.feedHist[k] || []).map((x) => x[1]), a = al[k] || {};
              const alarm = a.on && ((a.min !== '' && a.min != null && f.value < Number(a.min)) || (a.max !== '' && a.max != null && f.value > Number(a.max)));
              const mn = h.length ? Math.min(...h) : null, mx = h.length ? Math.max(...h) : null;
              return `<div class="card kpi" style="${alarm ? 'border-color:var(--warn)' : ''}"><div class="k"><label class="row grow" style="gap:6px;cursor:pointer"><input type="checkbox" data-plot="${esc(k)}" ${sel.has(k) ? 'checked' : ''}><span class="ellipsis">${esc(f.key)}</span></label><button class="btn sm icon ghost" data-act="feed-alert" data-k="${esc(k)}" title="Alerte" style="${a.on ? 'color:var(--warn)' : ''}">${icon('bell')}</button></div>
                <div class="v">${fmtNum(f.value, Math.abs(f.value) < 10 ? 2 : 1)}<small>${esc(f.unit)}</small></div>
                <div class="s">${h.length > 1 ? `min ${fmtNum(mn, 2)} · max ${fmtNum(mx, 2)} · ` : ''}${fmtAgo(f.age_ms)}</div><div class="spark">${spark(h.slice(-80), alarm ? 'var(--warn)' : 'var(--accent)')}</div></div>`;
            }).join('')}</div>`;
        }).join('');
      };
      el.addEventListener('change', (e) => {
        const c = e.target.closest('[data-plot]');
        if (!c) return;
        if (c.checked) sel.add(c.dataset.plot); else sel.delete(c.dataset.plot);
        store.set('plot.sel', [...sel]);
        draw();
      });
      draw();
      return A.onState(draw);
    }
  });
  A.actions['feed-alert'] = async (b) => {
    const k = b.dataset.k, al = alerts(), a = al[k] || { on: true, min: '', max: '' };
    const res = await modal({
      title: 'Alerte : ' + k,
      html: `<p class="small">Une notification (et un bip) est émise quand la mesure sort de la plage, au plus une fois par minute, tant que cette page est ouverte.</p>
        <div class="form-grid" style="margin-top:12px"><div class="field"><label>Minimum</label><input class="input" id="al-min" type="number" step="any" value="${esc(a.min)}" placeholder="aucun"></div><div class="field"><label>Maximum</label><input class="input" id="al-max" type="number" step="any" value="${esc(a.max)}" placeholder="aucun"></div>
        <label class="switch full"><input type="checkbox" id="al-on" ${a.on ? 'checked' : ''}><span class="track"></span>Alerte active</label></div>`,
      ok: 'Enregistrer'
    });
    if (!res) return;
    al[k] = { on: $('#al-on') ? $('#al-on').checked : true, min: $('#al-min') ? $('#al-min').value : '', max: $('#al-max') ? $('#al-max').value : '' };
    store.set('alerts', al);
    if ('Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) { /* refusé */ } }
    toast('Alerte enregistrée', 'ok');
  };
  A.actions['feeds-csv'] = () => {
    const rows = [['horodatage', 'source', 'mesure', 'valeur']];
    Object.entries(S.feedHist).forEach(([k, h]) => { const [src, key] = k.split('/'); h.forEach(([t, v]) => rows.push([new Date(t).toISOString(), src, key, v])); });
    if (rows.length === 1) { toast('Aucune mesure à exporter', 'warn'); return; }
    download('esp32-lab-mesures.csv', rows.map((r) => r.join(';')).join('\n'), 'text/csv;charset=utf-8');
  };
})();
