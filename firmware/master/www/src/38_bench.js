/* Banc fantôme : la flotte teste physiquement un projet généré.
 * Un worker « émulateur » imite les capteurs (DAC, GPIO, esclave I2C) et observe les actionneurs ;
 * un worker « DUT » exécute le projet. Le plan et l'oracle viennent de LAB.benchPlan() (catalog/src/12_bench.js). */
(function () {
  'use strict';
  const A = window.APP, LAB = window.LAB;
  const { $, esc, icon, api, postJSON, toast, drawer, download, fmtDur, fmtNum, S } = A;

  A.benchPlanFor = (spec) => {
    if (!LAB.benchPlan) return null;
    try { return LAB.benchPlan(spec); } catch (e) { return null; }
  };

  const chName = (plan, n) => { const c = plan.channels[n]; return c ? `${c.label}` : `voie ${n}`; };

  function expectText(plan, e) {
    if (e.feed) {
      if (e.absent) return `mesure <code>${esc(e.feed)}</code> interrompue`;
      return `mesure <code>${esc(e.feed)}</code> ≈ ${fmtNum(e.v, 2)} <span class="muted">±${fmtNum(e.tol, 2)}</span>`;
    }
    if (e.level !== undefined) return `${esc(chName(plan, e.n))} ${e.state ? '<b>activé</b>' : 'désactivé'} <span class="muted">(broche à ${e.level})</span>`;
    return `${esc(chName(plan, e.n))} rapport cyclique ${fmtNum(e.duty, 1)} % <span class="muted">±${fmtNum(e.tol, 1)}</span>`;
  }

  function checkText(c) {
    const got = c.got === undefined || c.got === null ? '—' : fmtNum(c.got, 2);
    if (c.feed) return c.want === 'absente' ? `<code>${esc(c.feed)}</code> : ${c.ok ? 'interrompue' : `encore reçue (il y a ${fmtDur(c.age_ms || 0)})`}` : `<code>${esc(c.feed)}</code> : ${got} (attendu ${fmtNum(c.want, 2)} ±${fmtNum(c.tol, 2)})`;
    return `voie ${c.n} ${esc(c.what || '')} : ${got} (attendu ${fmtNum(c.want, 2)}${c.tol ? ' ±' + fmtNum(c.tol, 1) : ''})`;
  }

  function wiringHtml(plan) {
    return `<div class="table-wrap"><table class="tbl responsive"><thead><tr><th>DUT (projet)</th><th>Émulateur</th><th>Remarque</th></tr></thead><tbody>
      ${plan.wiring.map((w) => `<tr><td data-l="DUT"><span class="badge accent mono">${esc(w.dut)}</span></td><td data-l="Émulateur"><span class="badge info mono">${esc(w.emu)}</span></td><td data-l="Remarque" class="small muted wide">${esc(w.note || '')}</td></tr>`).join('')}
      </tbody></table></div>`;
  }

  function stepsHtml(plan) {
    return `<ol class="small" style="margin:0;padding-left:20px;display:grid;gap:8px">${plan.steps.map((s) => `<li><b>${esc(s.label)}</b> <span class="muted">· ${fmtDur(s.wait)}</span>
      <div class="muted">${s.expect.map((e) => expectText(plan, e)).join(' · ')}</div>${s.note ? `<div class="hint">${esc(s.note)}</div>` : ''}</li>`).join('')}</ol>`;
  }

  function liveHtml(st) {
    if (!st || (!st.running && !st.verdict)) return '';
    const total = st.steps || 0, done = (st.results || []).length;
    const pct = total ? Math.round((100 * done) / total) : 0;
    const vcls = st.verdict === 'réussi' ? 'ok' : st.verdict ? 'bad' : 'accent';
    return `<div class="card pad stack" style="gap:10px">
      <div class="row between"><h3>${st.running ? 'Test en cours' : 'Dernier test'} — ${esc(st.project || '')}</h3>${st.verdict ? `<span class="badge ${vcls}">${esc(st.verdict)}</span>` : `<span class="badge accent">${esc(st.phase || '')}</span>`}</div>
      <div class="progress-row"><div class="meter ${st.failed ? 'bad' : 'ok'}"><i style="width:${pct}%"></i></div><span class="small num">${done}/${total}</span></div>
      ${st.running && st.label ? `<div class="small">Étape en cours : <b>${esc(st.label)}</b></div>` : ''}
      ${st.error ? `<div class="banner warn">${icon('alert')}<div>${esc(st.error)}</div></div>` : ''}
      <div class="statlist">${(st.results || []).map((r) => `<div style="align-items:flex-start"><span><span style="color:var(--${r.ok ? 'ok' : 'bad'})">${r.ok ? '✓' : '✗'}</span> ${esc(r.label)}
        ${r.ok ? '' : `<div class="tiny muted">${(r.checks || []).filter((c) => !c.ok).map(checkText).join('<br>')}</div>`}</span></div>`).join('')}</div>
      ${st.report ? `<div class="small muted">Rapport : <code>${esc(st.report)}</code></div>` : ''}
      ${st.running ? `<div><button class="btn danger sm" data-bench="stop">${icon('stop')}Arrêter le test</button></div>` : ''}
    </div>`;
  }

  function workerOptions(sel, excl) {
    const ws = ((S.state && S.state.workers) || []).filter((w) => w.state === 'READY' || w.id === sel);
    if (!ws.length) return '<option value="">aucun worker prêt</option>';
    return ws.map((w) => `<option value="${w.id}" ${w.id === sel ? 'selected' : ''} ${w.id === excl ? 'disabled' : ''}>W${w.id}${w.label ? ' — ' + esc(w.label) : ''}</option>`).join('');
  }

  /* Tiroir du banc pour une spécification de projet (bibliothèque ou Studio). */
  A.openBench = function (spec, id) {
    let plan;
    try { plan = LAB.benchPlan(spec); } catch (e) { toast(e.message, 'bad'); return; }
    const ready = ((S.state && S.state.workers) || []).filter((w) => w.state === 'READY').map((w) => w.id);
    const cfg = { dut: ready[0] || 0, emu: ready[1] || 0, bin: `/sd/FIRMWARE/WORKER/${plan.board}__${id}__bench.ino.bin`, fault: false };
    let status = null, timer = null;
    const d = drawer('Banc fantôme', '', {
      sub: `${esc(spec.title || id)} · ${plan.steps.length} étapes · ~${fmtDur(plan.duration_ms)}`,
      onClose: () => clearInterval(timer)
    });
    const renderLive = () => { const box = $('#bench-live', d.body); if (box) box.innerHTML = liveHtml(status); };
    const poll = async () => {
      try { status = await api('/api/bench/status'); } catch (e) { return; }
      renderLive();
      if (status && !status.running) { clearInterval(timer); timer = null; }
    };
    const render = () => {
      d.body.innerHTML = `
        <p style="color:var(--text-2);margin-bottom:12px">Un worker <b>émulateur</b> se fait passer pour les capteurs du projet et observe ses actionneurs, pendant qu'un worker <b>DUT</b> exécute le projet. Le scénario et les résultats attendus sont déduits des automatismes.</p>
        ${plan.emulable ? '' : `<div class="banner warn">${icon('alert')}<div>Ce projet ne peut pas être testé sur le banc : ${esc(plan.reasons.join(' '))}</div></div>`}
        ${plan.emulable && plan.reasons.length ? `<div class="banner warn">${icon('alert')}<div>Vérification partielle : ${esc(plan.reasons.join(' '))}</div></div>` : ''}
        ${plan.skipped.length ? `<div class="banner">${icon('info')}<div>${plan.skipped.map(esc).join('<br>')}</div></div>` : ''}
        <div id="bench-live" style="margin-bottom:14px"></div>
        <div class="card pad" style="margin-bottom:14px"><h3 style="margin-bottom:10px">1. Câblage du banc</h3>${wiringHtml(plan)}
          <p class="hint" style="margin-top:8px">Émulateur : ESP32 DevKit (connecteur de banc GPIO ${LAB.BENCH.dout.concat(LAB.BENCH.din).join(', ')}${plan.needsDac ? ` et DAC ${LAB.BENCH.dac.join('/')} — ESP32 classique obligatoire` : ''}). Les deux cartes partagent la masse.</p></div>
        <div class="card pad" style="margin-bottom:14px"><h3 style="margin-bottom:10px">2. Scénario et résultats attendus</h3>${stepsHtml(plan)}</div>
        ${plan.emulable ? `<div class="card pad stack" style="gap:12px"><h3>3. Lancer le test</h3>
          <div class="form-grid">
            <div class="field"><label>Worker DUT (exécute le projet)</label><select class="select" data-b="dut">${workerOptions(cfg.dut, cfg.emu)}</select></div>
            <div class="field"><label>Worker émulateur</label><select class="select" data-b="emu">${workerOptions(cfg.emu, cfg.dut)}</select></div>
            <div class="field full"><label>Firmware du DUT (variante « banc » : envoi au MASTER forcé)</label><input class="input mono" data-b="bin" value="${esc(cfg.bin)}">
              <div class="hint">Compilez-le avec <code>python scripts/compile_projects.py --bench</code> puis copiez le .bin sur la microSD, ou téléchargez le croquis ci-dessous.</div></div>
            ${S.demo ? `<label class="switch small full"><input type="checkbox" data-b="fault" ${cfg.fault ? 'checked' : ''}><span class="track"></span>Démonstration : simuler un fil d'actionneur débranché</label>` : ''}
          </div>
          <div class="row wrap"><button class="btn primary" data-bench="run" ${S.admin ? '' : 'disabled title="Connexion administrateur requise"'}>${icon('play')}Lancer le banc</button>
            <button class="btn" data-bench="ino">${icon('file')}Croquis du banc (.ino)</button>
            <button class="btn" data-bench="json">${icon('download')}Plan (bench.json)</button></div>
        </div>` : ''}`;
      renderLive();
    };
    d.body.addEventListener('change', (e) => {
      const t = e.target.closest('[data-b]');
      if (!t) return;
      const k = t.dataset.b;
      if (k === 'fault') cfg.fault = t.checked;
      else if (k === 'bin') cfg.bin = t.value.trim();
      else { cfg[k] = Number(t.value); render(); }
    });
    d.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-bench]');
      if (!b || b.disabled) return;
      const k = b.dataset.bench;
      if (k === 'ino') download(`${plan.board}__${id}__bench.ino`, plan.code);
      else if (k === 'json') { const o = Object.assign({}, plan); delete o.code; download(`${id}_bench.json`, JSON.stringify(o, null, 1) + '\n', 'application/json'); }
      else if (k === 'stop') { try { await postJSON('/api/bench/stop', {}); toast('Arrêt demandé : nettoyage en cours', 'warn'); } catch (err) { toast(err.message, 'bad'); } }
      else if (k === 'run') {
        cfg.bin = ($('[data-b="bin"]', d.body) || {}).value || cfg.bin;
        if (!cfg.dut || !cfg.emu || cfg.dut === cfg.emu) { toast('Choisissez deux workers différents', 'warn'); return; }
        if (S.demo && A.Demo) A.Demo.benchContext = { plan, spec, fault: cfg.fault };
        b.disabled = true;
        try {
          await postJSON('/api/bench/run', { plan: LAB.benchPayload(plan, id), bin: cfg.bin, dut: cfg.dut, emu: cfg.emu });
          toast('Banc lancé', 'ok');
          clearInterval(timer);
          timer = setInterval(poll, 1500);
          poll();
        } catch (err) { toast(err.message, 'bad'); }
        b.disabled = false;
      }
    });
    render();
    poll();
    timer = setInterval(poll, 1500);
  };
})();
