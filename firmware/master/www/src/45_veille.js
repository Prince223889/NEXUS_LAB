/* Veille du labo : le box surveille le matériel de l'utilisateur et le prévient.
 *   - un appareil inconnu se connecte au Wi-Fi du box (point d'accès du S3) ;
 *   - un worker s'éteint ou revient ;
 *   - un capteur de ses propres montages dépasse un seuil (mouvement, porte, gaz…).
 * Tout est visible : bandeau « Veille active » sur toutes les pages tant qu'elle tourne, journal des alertes.
 * Rien n'est écouté, filmé ni intercepté : seules les adresses MAC des appareils associés au point d'accès
 * du box sont connues, comme la liste des appareils d'une box Internet. */
(function () {
  'use strict';
  const A = window.APP;
  const { $, esc, icon, api, postJSON, toast, modal, confirmBox, fmtDur, fmtNum, S } = A;

  const KIND = { wifi: ['wifi', 'Wi-Fi', 'warn'], worker: ['cpu', 'Worker', 'info'], capteur: ['activity', 'Capteur', 'warn'], veille: ['shield', 'Veille', ''] };
  const PRESETS = [
    { id: 'pir', label: 'Mouvement détecté', match: /pir|motion|mouv|presence|présence|radar|ld2410|rcwl/i, op: '>', value: 0.5 },
    { id: 'door', label: 'Porte ouverte', match: /porte|door|reed|contact|ouvert/i, op: '>', value: 0.5 },
    { id: 'gas', label: 'Gaz ou fumée', match: /gaz|gas|fum|smoke|mq\d|co2/i, op: '>', value: 1000 },
    { id: 'water', label: 'Fuite d\'eau', match: /eau|water|fuite|leak|pluie|rain/i, op: '>', value: 0.5 },
    { id: 'temp', label: 'Température trop haute', match: /temp/i, op: '>', value: 35 }
  ];
  const ago = (s) => (s < 2 ? 'à l\'instant' : 'il y a ' + fmtDur(s * 1000));

  /* ---------- indicateur visible sur toutes les pages + alertes en direct ---------- */
  let seen = null;
  function banner(v) {
    let b = document.getElementById('veille-flag');
    const top = document.getElementById('top-actions');
    if (!v || !v.armed) { if (b) b.remove(); return; }
    if (!top) return;
    if (!b) {
      b = document.createElement('a');
      b.id = 'veille-flag';
      b.href = '#veille';
      b.className = 'badge warn veille-flag';
      b.title = 'La veille du labo est active : cliquez pour voir le journal';
      top.prepend(b);
    }
    b.innerHTML = `<span class="dot busy"></span>Veille active${v.count ? ' · ' + v.count + ' alerte' + (v.count > 1 ? 's' : '') : ''}`;
  }
  function notify(text) {
    toast('Veille du labo : ' + text, 'warn', 9000);
    const N = window.NexusNative;
    try { if (N && N.vibrate) N.vibrate(400); if (N && N.speak) N.speak('Alerte de la veille du labo. ' + text); } catch (e) { /* appli absente */ }
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('NEXUS LAB — veille', { body: text, icon: '/icon.svg' }); } catch (e) { /* notifications indisponibles */ }
  }
  A.onState(async (st) => {
    const v = st && st.veille;
    banner(v);
    if (!v) return;
    if (seen == null) { seen = v.last; return; }
    if (v.last <= seen) return;
    const from = seen;
    seen = v.last;
    if (!v.armed && !S.admin) return;
    try {
      const r = await api('/api/veille?since=' + from);
      (r.alerts || []).filter((a) => a.kind !== 'veille').reverse().forEach((a) => notify(a.text));
    } catch (e) { /* session non administrateur : le bandeau suffit */ }
  });

  /* ---------- actions communes (page et Patricia) ---------- */
  A.veilleArm = async function (on) {
    await postJSON('/api/veille', { armed: !!on });
    if ('Notification' in window && on && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) { /* refusé */ } }
    A.refreshState && A.refreshState();
    return api('/api/veille');
  };
  A.veilleReport = () => api('/api/veille');

  /* ---------- page ---------- */
  function feedOptions(feeds, sel) {
    return feeds.map((f) => { const k = f.source + '|' + f.key; return `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}>${esc(f.source)} · ${esc(f.key)} (${fmtNum(f.value, 2)} ${esc(f.unit || '')})</option>`; }).join('');
  }

  function draw(el, v, feeds) {
    const st = v.stations || [];
    const unknown = st.filter((s) => s.connected && !s.known);
    $('#vl-state', el).innerHTML = v.armed
      ? `<div class="banner warn" style="margin:0">${icon('shield')}<div class="grow"><b>Veille active</b> depuis ${fmtDur(v.armed_age_s * 1000)} · ${v.count || 0} alerte(s). Le bandeau « Veille active » reste affiché en haut de toutes les pages.</div><button class="btn" data-vl-arm="0">${icon('stop')}Arrêter la veille</button></div>`
      : `<div class="banner" style="margin:0">${icon('shield')}<div class="grow"><b>Veille arrêtée.</b> Activez-la en partant : le box vous prévient si quelque chose bouge dans votre labo.</div><button class="btn primary" data-vl-arm="1">${icon('play')}Activer la veille</button></div>`;
    $('#vl-alerts', el).innerHTML = (v.alerts || []).length
      ? (v.alerts || []).map((a) => { const k = KIND[a.kind] || KIND.veille; return `<div class="bd-row"><span class="bd-dot ${k[2] === 'warn' ? 'alert' : k[2] === 'info' ? 'warn' : 'ok'}"></span><div class="grow" style="min-width:0"><b>${esc(a.text)}</b><div class="small muted">${esc(k[1])} · ${ago(a.age_s)}</div></div></div>`; }).join('')
      : '<div class="small muted">Aucune alerte pour l\'instant.</div>';
    $('#vl-sta', el).innerHTML = st.length
      ? st.map((s) => `<div class="bd-row"><span class="bd-dot ${!s.connected ? 'bad' : s.known ? 'ok' : 'alert'}"></span><div class="grow" style="min-width:0"><b>${s.worker ? 'Worker W' + s.worker : s.name ? esc(s.name) : 'Appareil inconnu'}</b><div class="small muted mono ellipsis">${esc(s.mac)} · ${s.connected ? 'connecté' : 'parti ' + ago(s.since_s)}</div></div>
          ${s.worker ? '<span class="badge ok">worker</span>' : s.name ? `<button class="btn sm ghost" data-vl-forget="${esc(s.mac)}">Oublier</button>` : `<button class="btn sm" data-vl-known="${esc(s.mac)}">${icon('check')}C'est à moi</button>`}</div>`).join('')
      : '<div class="small muted">Aucun appareil vu depuis le démarrage du box.</div>';
    $('#vl-sta-h', el).innerHTML = unknown.length ? `<span class="badge bad">${unknown.length} inconnu(s)</span>` : '<span class="badge ok">tout est connu</span>';
    const known = (v.known || []).filter((k) => !st.some((s) => s.mac === k.mac));
    $('#vl-known', el).innerHTML = known.length ? `<div class="small muted" style="margin-top:8px">Aussi connus : ${known.map((k) => `${esc(k.name)} <button class="btn sm ghost" data-vl-forget="${esc(k.mac)}">oublier</button>`).join(' · ')}</div>` : '';
    $('#vl-rules', el).innerHTML = (v.rules || []).length
      ? v.rules.map((r) => `<div class="bd-row"><span class="bd-dot ${r.active ? 'alert' : 'ok'}"></span><div class="grow" style="min-width:0"><b>${esc(r.label)}</b><div class="small muted">si ${esc(r.source)} · ${esc(r.key)} ${esc(r.op)} ${fmtNum(r.value, 2)}${r.active ? ' · <b>déclenchée</b>' : ''}</div></div><button class="btn sm ghost" data-vl-del="${r.idx}" aria-label="Supprimer">${icon('trash')}</button></div>`).join('')
      : '<div class="small muted">Aucune alarme de capteur. Ajoutez-en une ci-dessous (détecteur de mouvement, contact de porte…).</div>';
    const fs = $('#vl-feed', el);
    if (fs && !fs.dataset.filled) {
      fs.dataset.filled = '1';
      fs.innerHTML = feeds.length ? feedOptions(feeds) : '<option value="">aucune mesure reçue des workers</option>';
    }
  }

  A.page({
    id: 'veille', title: 'Veille du labo', icon: 'shield', group: 'sys', admin: true,
    desc: 'Alerte si un appareil inconnu rejoint le Wi-Fi du box, si un worker s\'éteint ou si un capteur se déclenche',
    render(el) {
      el.innerHTML = `<div class="stack"><div class="hero"><div><div class="eyebrow">NEXUS · SURVEILLANCE DE VOTRE LABO</div><h1>Veille du labo</h1>
        <p>Le box surveille votre propre matériel et vous prévient : appareil inconnu sur le Wi-Fi du box, worker qui s'éteint, capteur qui se déclenche. Rien n'est écouté, filmé ni intercepté : seules les adresses des appareils connectés au point d'accès du box sont visibles.</p></div></div>
        <div id="vl-state"><div class="skel" style="height:56px"></div></div>
        <div class="grid g-2">
          <section class="card"><div class="card-h"><h2 class="grow">Alertes</h2><button class="btn sm" id="vl-refresh">${icon('refresh')}Actualiser</button></div><div class="card-b bd-list" id="vl-alerts"></div></section>
          <section class="card"><div class="card-h"><h2 class="grow">Appareils sur le Wi-Fi du box</h2><span id="vl-sta-h"></span></div><div class="card-b"><div class="bd-list" id="vl-sta"></div><div id="vl-known"></div>
            <div class="hint">Marquez vos appareils (téléphone, Raspberry Pi, PC) avec « C'est à moi » : seuls les autres déclenchent une alerte. Les workers sont reconnus tout seuls.</div></div></section>
          <section class="card span-2"><div class="card-h"><h2 class="grow">Alarmes de capteurs</h2></div><div class="card-b stack" style="gap:12px">
            <div class="bd-list" id="vl-rules"></div>
            <div class="row wrap" style="gap:6px">${PRESETS.map((p) => `<button class="chip" data-vl-preset="${p.id}">${esc(p.label)}</button>`).join('')}</div>
            <div class="row wrap" style="gap:8px;align-items:flex-end">
              <div class="field" style="flex:2;min-width:200px"><label>Mesure</label><select class="select" id="vl-feed"></select></div>
              <div class="field" style="width:90px"><label>Si</label><select class="select" id="vl-op"><option value=">">&gt;</option><option value="<">&lt;</option><option value="=">=</option></select></div>
              <div class="field" style="width:110px"><label>Seuil</label><input class="input" id="vl-val" type="number" step="any" value="0.5"></div>
              <div class="field" style="flex:2;min-width:160px"><label>Nom de l'alarme</label><input class="input" id="vl-label" placeholder="Mouvement dans l'atelier"></div>
              <button class="btn primary" id="vl-add">${icon('plus')}Ajouter</button></div>
            <div class="hint">Les mesures viennent de vos workers (projets du Studio qui envoient leurs valeurs). Une alarme se déclenche au passage du seuil, au plus une fois toutes les 30 s.</div></div></section>
        </div></div>`;
      let feeds = [];
      const load = async () => {
        try {
          const [v, f] = await Promise.all([api('/api/veille'), api('/api/feeds').catch(() => [])]);
          feeds = Array.isArray(f) ? f : [];
          if (el.isConnected) draw(el, v, feeds);
        } catch (e) { $('#vl-state', el).innerHTML = `<div class="banner warn" style="margin:0">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
      };
      el.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-vl-arm],[data-vl-known],[data-vl-forget],[data-vl-del],[data-vl-preset],#vl-add,#vl-refresh');
        if (!t) return;
        try {
          if (t.id === 'vl-refresh') return load();
          if (t.dataset.vlArm != null) { await A.veilleArm(t.dataset.vlArm === '1'); toast(t.dataset.vlArm === '1' ? 'Veille activée' : 'Veille arrêtée', 'ok'); }
          else if (t.dataset.vlKnown) {
            const name = await modal({ title: 'Appareil connu', text: `Donnez un nom à ${t.dataset.vlKnown} : il ne déclenchera plus d'alerte.`, input: '', placeholder: 'Mon téléphone', ok: 'Enregistrer' });
            if (name === false || name == null) return;
            await postJSON('/api/veille', { mac: t.dataset.vlKnown, name: String(name).trim() || 'Mon appareil', known: true });
          } else if (t.dataset.vlForget) {
            if (!(await confirmBox('Oublier l\'appareil', `${t.dataset.vlForget} redeviendra « inconnu » et déclenchera une alerte s'il se connecte pendant la veille.`, 'Oublier'))) return;
            await postJSON('/api/veille', { mac: t.dataset.vlForget, known: false });
          } else if (t.dataset.vlDel != null) {
            await postJSON('/api/veille', { delete_rule: Number(t.dataset.vlDel) });
          } else if (t.dataset.vlPreset) {
            const p = PRESETS.find((x) => x.id === t.dataset.vlPreset);
            const f = feeds.find((x) => p.match.test(x.key + ' ' + x.source));
            if (f) $('#vl-feed', el).value = f.source + '|' + f.key;
            else toast('Aucune mesure de ce type reçue : choisissez-la dans la liste quand le worker l\'envoie', 'warn');
            $('#vl-op', el).value = p.op; $('#vl-val', el).value = p.value; $('#vl-label', el).value = p.label;
            return;
          } else if (t.id === 'vl-add') {
            const fv = $('#vl-feed', el).value;
            if (!fv) return toast('Choisissez une mesure', 'warn');
            const [source, key] = fv.split('|');
            const value = Number($('#vl-val', el).value);
            if (!isFinite(value)) return toast('Seuil invalide', 'warn');
            await postJSON('/api/veille', { rule: { source, key, op: $('#vl-op', el).value, value, label: $('#vl-label', el).value.trim() || key } });
            toast('Alarme ajoutée', 'ok');
          }
          load();
        } catch (err) { toast(err.message, 'bad'); }
      });
      load();
      const tm = setInterval(() => { if (!el.isConnected) { clearInterval(tm); return; } load(); }, 5000);
      return () => clearInterval(tm);
    }
  });
  A.commands.push({ title: 'Veille du labo', group: 'Page', icon: 'shield', run: () => A.go('veille') });
})();
