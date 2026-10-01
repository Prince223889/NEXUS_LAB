/* Wireshark du Labo : décodage en direct des trames du labo (LAB|, battements, ASSIGN, logs, HTTP)
 * avec perte et gigue par worker. N'observe que le trafic du labo. Capture explicite (armée à la demande). */
(function () {
  'use strict';
  const A = window.APP;
  const { $, esc, icon, api, postJSON, toast, download, fmtNum, S } = A;

  /* Protocole → [classe de badge, libellé, couleur d'accent (var CSS)]. */
  const PROTO = {
    HB: ['accent', 'Battement', 'var(--accent)'],
    LAB: ['ok', 'Mesure', 'var(--ok)'],
    LOG: ['', 'Journal', 'var(--text-3)'],
    HELLO: ['info', 'Découverte', 'var(--info)'],
    ASSIGN: ['info', 'Attribution', 'var(--info)'],
    APP: ['violet', 'Projet', 'var(--violet)'],
    DISCOVER: ['info', 'Découverte', 'var(--info)'],
    HOME: ['warn', 'Retour worker', 'var(--warn)'],
    HTTP: ['', 'HTTP', 'var(--text-2)'],
    ESPNOW: ['violet', 'ESP-NOW', 'var(--violet)'],
    '?': ['', 'Autre', 'var(--text-3)']
  };
  const pInfo = (p) => PROTO[p] || PROTO['?'];
  const protoBadge = (p) => `<span class="badge ${pInfo(p)[0]}" title="${esc(pInfo(p)[1])}">${esc(p)}</span>`;
  const jitterCls = (j) => (j <= 60 ? 'ok' : j <= 200 ? 'warn' : 'bad');

  /* Styles scopés à la page, injectés une seule fois (rétrocompatible : n'affecte rien d'autre). */
  const STYLE_ID = 'nm-style';
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .nm-chips{display:flex;flex-wrap:wrap;gap:6px}
      .nm-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:var(--surface-2);color:var(--text-2);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s}
      .nm-chip .dot{width:8px;height:8px;border-radius:50%}
      .nm-chip .n{opacity:.65;font-variant-numeric:tabular-nums}
      .nm-chip.on{color:var(--text);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}
      #nm-rows tr{cursor:pointer}
      #nm-rows tr.tx td:first-child{box-shadow:inset 3px 0 0 var(--warn)}
      #nm-rows tr.rx td:first-child{box-shadow:inset 3px 0 0 var(--nm-accent,var(--line))}
      #nm-rows tr.open{background:var(--surface-2)}
      .nm-detail td{padding-top:0}
      .nm-detail .kv{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12px;color:var(--text-2)}
      .nm-detail .kv b{color:var(--text)}
      .nm-table thead th{position:sticky;top:0;background:var(--surface);z-index:1}`;
    document.head.appendChild(s);
  }

  A.page({
    id: 'netmon', title: 'Réseau', icon: 'antenna', group: 'sys',
    desc: 'Décodage en direct des trames du labo, perte et gigue par worker',
    render(el) {
      ensureStyle();
      let frames = [];
      let since = 0;
      let paused = false;
      let fProto = 'all', fWorker = 'all';
      let armed = (S.state && S.state.netmon && S.state.netmon.armed) || false;
      let metrics = [];
      let openSeq = null;
      let timer = null;
      let lastSeq = 0, lastAt = Date.now(), fps = 0;

      el.innerHTML = `
        <div class="grid g-4" id="nm-kpi" style="margin-bottom:14px"></div>
        <div class="card" style="margin-bottom:14px"><div class="card-b" style="display:flex;flex-direction:column;gap:12px">
          <div class="row between wrap" style="gap:10px">
            <label class="switch"><input type="checkbox" id="nm-arm" ${armed ? 'checked' : ''} ${S.admin ? '' : 'disabled'}><span class="track"></span>Armer la capture</label>
            <div class="row wrap" style="gap:8px">
              <button class="btn sm" id="nm-pause">${icon('stop')}<span class="lbl">Pause</span></button>
              <button class="btn sm" id="nm-clear">${icon('trash')}<span class="hide-sm">Vider</span></button>
              <button class="btn sm" id="nm-csv">${icon('download')}<span class="hide-sm">CSV</span></button>
              <select class="select sm" id="nm-fw" style="min-width:120px"><option value="all">Tous workers</option></select>
            </div>
          </div>
          <div class="nm-chips" id="nm-chips"></div>
        </div></div>
        ${S.admin ? '' : `<div class="banner">${icon('lock')}<div>Connexion administrateur requise pour armer la capture. En lecture seule, vous voyez ce qui est déjà capturé.</div></div>`}
        <div id="nm-metrics" class="grid g-3" style="margin-bottom:14px"></div>
        <div class="card"><div class="card-h"><h2 class="grow">Trames <span class="badge" id="nm-count">0</span></h2><span class="small muted" id="nm-status"></span></div>
          <div class="table-wrap" style="max-height:58vh;overflow:auto"><table class="tbl nm-table"><thead><tr><th style="width:96px">Heure</th><th style="width:96px">Proto</th><th style="width:64px">Sens</th><th style="width:64px">Worker</th><th>Détail</th></tr></thead><tbody id="nm-rows"></tbody></table></div></div>`;

      const kpi = (ic, label, value, sub, cls) => `<div class="card kpi"><div class="k">${icon(ic)}${label}</div><div class="v ${cls || ''}">${value}</div><div class="s">${sub}</div></div>`;
      const drawKpi = () => {
        const worst = metrics.reduce((a, m) => Math.max(a, m.jitter_ms), 0);
        const loss = metrics.reduce((a, m) => a + m.loss, 0);
        $('#nm-kpi', el).innerHTML =
          kpi('antenna', 'Capture', armed ? (paused ? 'En pause' : 'Active') : 'Désarmée', armed ? `${fmtNum(frames.length, 0)} trames en mémoire` : 'Armez pour démarrer') +
          kpi('activity', 'Débit', fmtNum(fps, fps < 10 ? 1 : 0) + ' <small>trames/s</small>', `${metrics.length} worker(s) actifs`) +
          kpi('wave', 'Gigue max', fmtNum(worst, 0) + ' <small>ms</small>', 'écart vs 1 battement/s', worst > 200 ? 'bad' : worst > 60 ? 'warn' : '') +
          kpi('alert', 'Pertes', fmtNum(loss, 0), loss ? 'battements manqués' : 'aucune perte', loss ? 'bad' : '');
      };

      const drawChips = () => {
        const counts = {};
        frames.forEach((f) => { counts[f.proto] = (counts[f.proto] || 0) + 1; });
        const protos = Object.keys(PROTO).filter((k) => k !== '?' && (counts[k] || fProto === k));
        $('#nm-chips', el).innerHTML =
          `<span class="nm-chip ${fProto === 'all' ? 'on' : ''}" data-p="all">Tout <span class="n">${frames.length}</span></span>` +
          protos.map((p) => `<span class="nm-chip ${fProto === p ? 'on' : ''}" data-p="${p}"><span class="dot" style="background:${pInfo(p)[2]}"></span>${esc(p)} <span class="n">${counts[p] || 0}</span></span>`).join('');
      };

      const drawMetrics = () => {
        const box = $('#nm-metrics', el);
        if (!metrics.length) { box.innerHTML = `<div class="empty small span-3" style="padding:16px">${icon('activity')}<div>${armed ? 'En attente de battements des workers…' : 'Capture désarmée.'}</div></div>`; return; }
        box.innerHTML = metrics.slice().sort((a, b) => a.worker - b.worker).map((m) => {
          const pct = Math.min(100, m.jitter_ms / 3);
          return `<div class="card pad"><div class="row between"><b>W${m.worker}</b><span class="badge ${jitterCls(m.jitter_ms)}">gigue ${fmtNum(m.jitter_ms, 0)} ms</span></div>
            <div class="progress-row" style="margin:8px 0"><div class="meter ${jitterCls(m.jitter_ms)}"><i style="width:${pct}%"></i></div></div>
            <div class="row between small muted"><span>${fmtNum(m.rx, 0)} battements</span><span style="color:${m.loss ? 'var(--bad)' : 'inherit'}">${m.loss ? m.loss + ' perdu(s)' : '0 perte'}</span></div></div>`;
        }).join('');
      };

      const rowHtml = (f) => {
        const open = f.seq === openSeq;
        const accent = pInfo(f.proto)[2];
        const main = `<tr class="${f.dir} ${open ? 'open' : ''}" data-seq="${f.seq}" style="--nm-accent:${accent}">
          <td class="mono small" data-l="Heure">${f._clock}</td>
          <td data-l="Proto">${protoBadge(f.proto)}</td>
          <td data-l="Sens"><span class="badge ${f.dir === 'tx' ? 'warn' : 'outline'}">${f.dir === 'tx' ? '→ TX' : '← RX'}</span></td>
          <td data-l="Worker">${f.worker ? 'W' + f.worker : '—'}</td>
          <td data-l="Détail" class="mono small wide">${esc(f.summary || '')}</td></tr>`;
        if (!open) return main;
        return main + `<tr class="nm-detail"><td colspan="5"><div class="kv">
          <span>seq <b>${f.seq}</b></span><span>protocole <b>${esc(pInfo(f.proto)[1])}</b></span>
          <span>sens <b>${f.dir === 'tx' ? 'émis (MASTER → labo)' : 'reçu'}</b></span>
          ${f.worker ? `<span>worker <b>W${f.worker}</b></span>` : ''}
          ${f.ip ? `<span>IP <b>${esc(f.ip)}</b></span>` : ''}
          <span>taille <b>${f.len || 0} o</b></span><span>reçu il y a <b>${fmtNum((f.age_ms || 0) / 1000, 1)} s</b></span>
        </div></td></tr>`;
      };

      const drawRows = () => {
        const fw = fWorker === 'all' ? null : Number(fWorker);
        const list = frames.filter((f) => (fProto === 'all' || f.proto === fProto) && (fw == null || f.worker === fw)).slice(0, 300);
        $('#nm-count', el).textContent = frames.length;
        $('#nm-status', el).textContent = paused ? 'en pause' : armed ? 'capture active' : 'désarmé';
        const sel = $('#nm-fw', el), seen = [...new Set(frames.filter((f) => f.worker).map((f) => f.worker))].sort((a, b) => a - b);
        if (sel.options.length - 1 !== seen.length) sel.innerHTML = '<option value="all">Tous workers</option>' + seen.map((w) => `<option value="${w}" ${String(w) === fWorker ? 'selected' : ''}>W${w}</option>`).join('');
        $('#nm-rows', el).innerHTML = list.length ? list.map(rowHtml).join('')
          : `<tr><td colspan="5"><div class="empty small" style="padding:20px">${icon('antenna')}<div>${armed ? 'Aucune trame' + (fProto !== 'all' || fw != null ? ' pour ce filtre.' : ' pour l\'instant.') : 'Armez la capture pour voir passer les trames du labo.'}</div></div></td></tr>`;
      };

      const redraw = () => { drawKpi(); drawChips(); drawMetrics(); drawRows(); };

      const poll = async () => {
        if (paused) return;
        try {
          const r = await api('/api/netmon?since=' + since);
          armed = !!r.armed;
          const arm = $('#nm-arm', el);
          if (arm && arm.checked !== armed) arm.checked = armed;
          metrics = r.metrics || [];
          const now = Date.now();
          if (r.last != null) {
            const dt = (now - lastAt) / 1000;
            if (dt > 0.3) { fps = Math.max(0, (r.last - lastSeq)) / dt; lastSeq = r.last; lastAt = now; }
          }
          if (r.frames && r.frames.length) {
            r.frames.forEach((f) => { f._clock = new Date(now - (f.age_ms || 0)).toLocaleTimeString('fr-FR', { hour12: false }); });
            frames = r.frames.reverse().concat(frames).slice(0, 600);
            since = r.last;
          } else if (r.last != null) since = r.last;
          redraw();
        } catch (e) { /* transitoire */ }
      };

      $('#nm-arm', el).addEventListener('change', async (e) => {
        try { await postJSON('/api/netmon/arm', { on: e.target.checked }); since = 0; frames = []; lastSeq = 0; toast(e.target.checked ? 'Capture armée' : 'Capture arrêtée', 'ok'); poll(); }
        catch (err) { toast(err.message, 'bad'); e.target.checked = !e.target.checked; }
      });
      $('#nm-pause', el).addEventListener('click', (e) => { paused = !paused; const b = e.target.closest('button'); b.classList.toggle('primary', paused); $('.lbl', b).textContent = paused ? 'Reprendre' : 'Pause'; drawKpi(); });
      $('#nm-clear', el).addEventListener('click', () => { frames = []; openSeq = null; redraw(); });
      $('#nm-csv', el).addEventListener('click', () => {
        if (!frames.length) { toast('Aucune trame à exporter', 'warn'); return; }
        const rows = [['heure', 'proto', 'sens', 'worker', 'ip', 'longueur', 'detail']].concat(frames.map((f) => [f._clock, f.proto, f.dir, f.worker || '', f.ip || '', f.len || '', (f.summary || '').replace(/;/g, ',')]));
        download('trames_labo.csv', rows.map((r) => r.join(';')).join('\n'), 'text/csv');
      });
      $('#nm-chips', el).addEventListener('click', (e) => { const c = e.target.closest('[data-p]'); if (c) { fProto = c.dataset.p; drawChips(); drawRows(); } });
      $('#nm-fw', el).addEventListener('change', (e) => { fWorker = e.target.value; drawRows(); });
      $('#nm-rows', el).addEventListener('click', (e) => { const tr = e.target.closest('tr[data-seq]'); if (tr) { const s = Number(tr.dataset.seq); openSeq = openSeq === s ? null : s; drawRows(); } });

      redraw();
      poll();
      timer = setInterval(poll, 1200);
      return () => clearInterval(timer);
    }
  });
})();
