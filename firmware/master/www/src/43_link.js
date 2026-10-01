/* Liaison S3 ↔ Pi : résultats des tests réguliers du canal Wi-Fi, dans les deux sens.
 * Le S3 sonde le Pi toutes les 20 s (/api/link) ; le Pi s'annonce au S3 toutes les 30 s et mesure sa réponse (/api/v1/link). */
(function () {
  'use strict';
  const A = window.APP;
  const { $, esc, icon, api, lineChart, toast } = A;
  const fmt = (v, u) => (v == null ? '—' : `${v} ${u}`);
  const quality = (l) => (!l || !l.samples ? ['', 'aucune mesure'] : !l.up && !l.ok ? ['bad', 'coupée'] : l.loss_pct > 20 || l.rtt_ms > 300 ? ['warn', 'instable'] : ['ok', 'bonne']);

  function side(title, sub, l, err) {
    if (err) return `<section class="card"><div class="card-h"><h2 class="grow">${title}</h2><span class="badge">indisponible</span></div><div class="card-b small muted">${esc(err)}</div></section>`;
    const [cls, word] = quality(l);
    const hist = (l.history || []).map((v) => (v == null || v < 0 ? null : v));
    const lost = (l.history || []).filter((v) => v == null || v < 0).length;
    return `<section class="card"><div class="card-h"><h2 class="grow">${title}</h2><span class="badge ${cls}">${word}</span></div><div class="card-b">
      <div class="small muted">${sub}</div>
      <div class="grid g-4" style="margin:12px 0">
        <div><div class="eyebrow">LATENCE</div><b>${fmt(l.rtt_ms, 'ms')}</b></div>
        <div><div class="eyebrow">GIGUE</div><b>${fmt(l.jitter_ms, 'ms')}</b></div>
        <div><div class="eyebrow">PERTE</div><b>${fmt(l.loss_pct, '%')}</b></div>
        <div><div class="eyebrow">MIN / MAX</div><b>${l.min_ms == null ? '—' : l.min_ms + ' / ' + l.max_ms + ' ms'}</b></div>
      </div>
      ${hist.some((v) => v != null) ? lineChart([{ data: hist, fill: true, width: 1.6 }], { w: 600, h: 90, axis: false, dots: false, label: 'latence' }) : ''}
      <div class="hint">${l.samples || 0} sonde(s) récentes, ${lost} perdue(s) · une série toutes les ${l.period_s || '?'} s</div></div></section>`;
  }

  async function load(el, now) {
    let s3 = null, pi = null, e3 = '', ep = '';
    try { s3 = await api('/api/link'); } catch (e) { e3 = 'Le MASTER ne répond pas : ' + e.message; }
    try {
      if (!A.piRequest || !(A.piToken && A.piToken())) throw new Error('configure le Pi dans Compagnon Pi');
      pi = await A.piRequest('/api/v1/link' + (now ? '?now=1' : ''));
    } catch (e) { ep = 'Pi injoignable : ' + e.message; }
    const box = $('#lk-body', el); if (!box) return;
    const piName = s3 && s3.pi ? `Pi annoncé en ${esc(s3.pi)}` : 'Le Pi ne s\'est pas encore annoncé au S3 (il le fait toutes les 30 s).';
    box.innerHTML = `<div class="grid g-2">${side('S3 → Pi', piName, s3, e3)}${side('Pi → S3', pi ? `Le Pi interroge ${esc(pi.s3)}` : '', pi, ep)}</div>`;
  }

  A.page({
    id: 'link', title: 'Liaison S3 ↔ Pi', icon: 'wifi', group: 'sys',
    desc: 'Tests réguliers du canal Wi-Fi entre le MASTER et le Raspberry Pi',
    render(el) {
      el.innerHTML = `<div class="stack"><div class="hero"><div><div class="eyebrow">NEXUS · CANAL WI-FI</div><h1>Liaison S3 ↔ Pi</h1>
        <p>Le S3 teste le Pi toutes les 20 s et le Pi teste le S3 toutes les 30 s. Une liaison perdue ou rétablie est notée dans le journal d'événements.</p></div>
        <div><button class="btn primary" id="lk-now">${icon('refresh')}Tester maintenant</button></div></div><div id="lk-body"><div class="card pad muted">Mesure…</div></div></div>`;
      $('#lk-now', el).onclick = async () => { await load(el, true); toast('Liaison testée', 'ok'); };
      load(el, false);
      const t = setInterval(() => { if (!el.isConnected) { clearInterval(t); return; } load(el, false); }, 10000);
    }
  });
  A.commands.push({ title: 'Tester la liaison S3 ↔ Pi', group: 'Page', icon: 'wifi', run: () => A.go('link') });
})();
