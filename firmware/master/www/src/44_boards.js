/* Cartes branchées : inventaire en direct de tout ce que le box voit.
 *   - le MASTER ESP32-S3 (version, microSD, carte branchée sur son port USB hôte) ;
 *   - les workers sur son Wi-Fi (puce, mémoire, signal, firmware) ;
 *   - le Raspberry Pi (agent, cartes série branchées sur ses ports USB, liaison avec le S3).
 * Patricia affiche le même bilan quand on lui demande « quelles cartes sont branchées ? ». */
(function () {
  'use strict';
  const A = window.APP;
  const { $, esc, icon, api, toast, S } = A;
  const mb = (n) => (n ? Math.round(n / 1048576) + ' Mo' : '—');
  const gb = (n) => (n ? (n / 1e9).toFixed(1) + ' Go' : '—');
  const sig = (r) => (r == null || r === 0 ? '' : r > -60 ? 'excellent' : r > -70 ? 'bon' : r > -80 ? 'faible' : 'très faible');

  A.boardsReport = async function () {
    const rep = { at: Date.now(), master: null, usb: null, workers: [], pi: null, piUsb: [], link: null, errors: [] };
    try { const si = await api('/api/system/info'); rep.master = si; rep.usb = si.usb || null; } catch (e) { rep.errors.push('MASTER injoignable : ' + e.message); }
    let st = S.state;
    try { st = await api('/api/state'); } catch (e) { /* état en cache */ }
    const ws = ((st && st.workers) || []).slice().sort((a, b) => a.id - b.id);
    rep.capacity = (st && st.worker_capacity) || 10;
    rep.workers = await Promise.all(ws.map(async (w) => {
      const x = { id: w.id, label: w.label, state: w.state, ip: w.ip, rssi: w.rssi, version: w.version, job: w.job, heap: w.heap };
      if (w.state === 'OFFLINE') return x;
      try { const i = await api('/api/worker/info?id=' + encodeURIComponent(w.id)); Object.assign(x, { chip: i.chip, flash: i.flash_size, psram: i.psram, cpu: i.cpu_mhz, mac: i.mac }); }
      catch (e) { x.err = 'ne répond pas'; }
      return x;
    }));
    if (A.piRequest && A.piToken && A.piToken()) {
      try { rep.pi = await A.piRequest('/api/v1/health'); } catch (e) { rep.errors.push('Pi : ' + e.message); }
      if (rep.pi) {
        try { rep.piUsb = (await A.piRequest('/api/v1/usb')).items || []; } catch (e) { rep.piUsb = []; }
        try { rep.link = await A.piRequest('/api/v1/link'); } catch (e) { rep.link = null; }
      }
    }
    return rep;
  };

  A.boardsHtml = function (rep, compact) {
    const on = rep.workers.filter((w) => w.state !== 'OFFLINE');
    const row = (ok, title, sub, badge) => `<div class="bd-row"><span class="bd-dot ${ok === true ? 'ok' : ok === false ? 'bad' : 'warn'}"></span><div class="grow" style="min-width:0"><b>${title}</b><div class="small muted ellipsis">${sub || ''}</div></div>${badge || ''}</div>`;
    const m = rep.master;
    const parts = [];
    parts.push(row(!!m, 'MASTER ESP32-S3', m ? `v${esc(m.version || '?')} · ${esc(m.board_variant || '')} · microSD ${gb(m.sd_free)} libres / ${gb(m.sd_total)}` : esc(rep.errors[0] || 'injoignable')));
    parts.push(row(rep.usb ? !!rep.usb.connected : null, 'USB du S3', rep.usb ? (rep.usb.connected ? `${esc(rep.usb.chip || 'carte')} (${esc(rep.usb.vid_pid || '')}) · ${rep.usb.baud} bauds${rep.usb.flashing ? ' · flash en cours' : ''}` : 'aucune carte branchée') : 'inconnu'));
    const wl = rep.workers.map((w) => row(w.state === 'OFFLINE' ? false : w.err ? null : true, `W${w.id}${w.label ? ' · ' + esc(w.label) : ''}`,
      w.state === 'OFFLINE' ? 'éteint ou hors de portée' : [esc(w.chip || 'puce ?'), w.flash ? 'flash ' + mb(w.flash) : '', w.psram ? 'PSRAM ' + mb(w.psram) : '', w.rssi ? `${w.rssi} dBm (${sig(w.rssi)})` : '', w.ip ? esc(w.ip) : '', w.version ? 'fw ' + esc(w.version) : '', w.err || ''].filter(Boolean).join(' · '),
      `<span class="badge ${w.state === 'OFFLINE' ? '' : w.state === 'READY' || w.state === 'IDLE' ? 'ok' : 'info'}">${esc(w.state || '?')}</span>`));
    const pi = rep.pi;
    const piRows = [row(pi ? true : null, 'Raspberry Pi 4', pi ? `agent ${esc(pi.version || '')} · ${esc(pi.host_arch || '')} · ${pi.arduino_cli && pi.arduino_cli !== 'absent' ? 'compilateur prêt' : 'compilateur absent'}` : 'non configuré ou injoignable (Compagnon Pi)')];
    if (pi) {
      piRows.push(row(rep.piUsb.length ? true : null, 'USB du Pi', rep.piUsb.length ? rep.piUsb.map((d) => `${esc(d.name)} (${esc(d.port)})`).join(' · ') : 'aucune carte série branchée'));
      const l = rep.link;
      if (l && l.samples) piRows.push(row(!!l.up, 'Liaison Pi ↔ S3', `${l.rtt_ms != null ? l.rtt_ms + ' ms' : '—'} · perte ${l.loss_pct} % · gigue ${l.jitter_ms} ms`));
    }
    if (compact) return `<div class="bd-list">${parts.join('')}${wl.join('') || row(null, 'Workers', 'aucun worker vu')}${piRows.join('')}</div><div class="hint">${on.length}/${rep.capacity} worker(s) en ligne · ${new Date(rep.at).toLocaleTimeString()}</div>`;
    return `<div class="grid g-2">
      <section class="card"><div class="card-h"><h2 class="grow">MASTER</h2></div><div class="card-b bd-list">${parts.join('')}</div></section>
      <section class="card"><div class="card-h"><h2 class="grow">Raspberry Pi</h2></div><div class="card-b bd-list">${piRows.join('')}</div></section>
      <section class="card span-2"><div class="card-h"><h2 class="grow">Workers sur le Wi-Fi du S3</h2><span class="badge ${on.length ? 'ok' : ''}">${on.length}/${rep.capacity} en ligne</span></div><div class="card-b bd-list">${wl.join('') || '<div class="small muted">Aucun worker vu. Allume un ESP32 avec le firmware worker : il rejoint le Wi-Fi du S3 tout seul.</div>'}</div></section></div>`;
  };

  async function load(el) {
    const box = $('#bd-body', el); if (!box) return;
    try { const rep = await A.boardsReport(); if (box.isConnected) box.innerHTML = A.boardsHtml(rep, false); }
    catch (e) { box.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
  }

  A.page({
    id: 'boards', title: 'Cartes branchées', icon: 'cpu', group: 'sys',
    desc: 'Tout ce que le box voit : MASTER, workers en Wi-Fi, cartes USB, Raspberry Pi',
    render(el) {
      el.innerHTML = `<div class="stack"><div class="hero"><div><div class="eyebrow">NEXUS · INVENTAIRE</div><h1>Cartes branchées</h1>
        <p>Le MASTER, chaque worker sur son Wi-Fi, les cartes branchées en USB sur le S3 et sur le Pi, et la liaison entre eux. Mis à jour toutes les 10 s.</p></div>
        <div class="row wrap"><button class="btn" id="bd-now">${icon('refresh')}Actualiser</button><button class="btn primary" id="bd-check">${icon('target')}Check-up de tous les workers</button></div></div>
        <div id="bd-body"><div class="card pad muted">Inventaire…</div></div></div>`;
      $('#bd-now', el).onclick = () => load(el);
      $('#bd-check', el).onclick = async () => {
        const on = ((S.state && S.state.workers) || []).filter((w) => w.state !== 'OFFLINE');
        if (!on.length) return toast('Aucun worker en ligne', 'warn');
        let n = 0;
        for (const w of on) { try { await A.post('/api/job', { type: 'SYSTEM_TEST', worker: w.id, priority: 60 }); n++; } catch (e) { /* worker occupé */ } }
        toast(`${n} check-up(s) lancé(s) : résultats dans Jobs`, 'ok');
      };
      load(el);
      const t = setInterval(() => { if (!el.isConnected) { clearInterval(t); return; } load(el); }, 10000);
    }
  });
  A.commands.push({ title: 'Cartes branchées (inventaire)', group: 'Page', icon: 'cpu', run: () => A.go('boards') });
})();
