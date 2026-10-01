/* Patricia — assistante du laboratoire (remplace l'ancienne page « Assistant »).
 * Le cerveau tourne sur le Raspberry Pi (pi/patricia) : mémoire durable, diagnostic, IA locale ou en ligne,
 * pilotage de flotte. Sans Pi, la page garde les réponses locales du catalogue et l'agent du MASTER.
 * Voix : pont natif de l'APK NEXUS (reconnaissance Android), sinon Web Speech du navigateur (HTTPS ou
 * localhost requis par les navigateurs pour le micro), sinon enregistrement WAV transcrit par Vosk sur le Pi. */
(function () {
  'use strict';
  const A = window.APP, $ = A.$, $$ = A.$$, esc = A.esc, icon = A.icon, toast = A.toast, store = A.store;
  const P = (A.Patricia = {});
  const SESSION = store.get('patricia.session', null) || ('s' + Date.now().toString(36));
  store.set('patricia.session', SESSION);
  const prefs = Object.assign({ speak: false, handsfree: false, voice: '' }, store.get('patricia.prefs', {}));
  const savePrefs = () => store.set('patricia.prefs', prefs);
  let piOk = null, voiceCaps = { stt: false, tts: false };

  /* ------------------------------------------------------------ appels Pi */
  /* Délai maximal : 8 s pour la mémoire, 150 s pour une réponse d'IA locale sur le Pi 4. */
  async function pi(path, opts, ms) {
    if (!A.piRequest) throw new Error('Compagnon Pi non chargé');
    const ctl = window.AbortController ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), ms || 8000) : null;
    try { return await A.piRequest(path, Object.assign({}, opts || {}, ctl ? { signal: ctl.signal } : {})); }
    catch (e) { throw e.name === 'AbortError' ? new Error('le Pi ne répond pas (' + Math.round((ms || 8000) / 1000) + ' s)') : e; }
    finally { if (t) clearTimeout(t); }
  }
  const piJSON = (path, body, ms) => pi(path, { method: 'POST', body: JSON.stringify(body || {}) }, ms);
  P.pi = pi; P.piJSON = piJSON;

  function labContext() {
    const st = A.S.state || {};
    return { lab: st.master ? { master: st.master, workers: (st.workers || []).map((w) => ({ id: w.id, state: w.state, chip: w.chip, label: w.label, ip: w.ip, job: w.job })), worker_capacity: st.worker_capacity, jobs: st.jobs } : null, project: P.project || null };
  }

  /* ------------------------------------------------------------ texte riche */
  function rich(text) {
    let h = esc(text || '');
    h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (m, lang, code) => `<pre class="pa-code">${code}</pre>`);
    h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
    h = h.replace(/(#library\?p=[a-z0-9_]+)/g, '<a href="$1">ouvrir la fiche</a>');
    return h;
  }

  /* ------------------------------------------------------------ voix */
  const Voice = (P.voice = {
    native: () => !!(window.NexusNative && window.NexusNative.listen),
    web: () => !!(window.SpeechRecognition || window.webkitSpeechRecognition) && window.isSecureContext,
    rec: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext && voiceCaps.stt,
    available() { return this.native() || this.web() || this.rec(); },
    why() {
      if (!window.isSecureContext) return 'Les navigateurs n\'ouvrent le micro que sur une page sécurisée (HTTPS). Utilise l\'application Android NEXUS (micro natif), ou dans Chrome : chrome://flags → « Insecure origins treated as secure » → ajoute http://192.168.4.1.';
      return 'Ce navigateur n\'a pas de reconnaissance vocale. Essaie Chrome, l\'application Android NEXUS, ou installe Vosk sur le Pi (pi/setup_patricia.sh --voice).';
    },
    listening: false,
    stopFn: null,
    listen(onText, onState) {
      if (this.listening) { this.stop(); return; }
      if (this.native()) {
        window.__nexusVoice = (ok, text) => { this.listening = false; onState(false); if (ok && text) onText(text); else if (!ok) toast(text || 'Rien entendu', 'warn'); };
        this.listening = true; onState(true);
        window.NexusNative.listen('fr-FR');
        this.stopFn = () => { try { window.NexusNative.stopListening(); } catch (e) { /* ignoré */ } };
        return;
      }
      if (this.web()) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const r = new SR();
        r.lang = 'fr-FR'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
        let final = '';
        r.onresult = (e) => { let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) final += e.results[i][0].transcript; else interim += e.results[i][0].transcript; } onState(true, final + interim); };
        r.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') toast('Micro : ' + (e.error === 'not-allowed' ? 'accès refusé' : e.error), 'warn'); };
        r.onend = () => { this.listening = false; onState(false); if (final.trim()) onText(final.trim()); };
        this.listening = true; onState(true);
        r.start();
        this.stopFn = () => r.stop();
        return;
      }
      if (this.rec()) { this.recordWav(onText, onState); return; }
      toast(this.why(), 'warn', 9000);
    },
    stop() { if (this.stopFn) this.stopFn(); this.stopFn = null; },
    /* Enregistrement PCM 16 kHz mono → WAV → Vosk sur le Pi (fonctionne sans Internet). */
    async recordWav(onText, onState) {
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { toast('Micro refusé : ' + e.message, 'warn'); return; }
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      const chunks = []; let silent = 0, heard = false;
      proc.onaudioprocess = (e) => {
        const d = e.inputBuffer.getChannelData(0); chunks.push(new Float32Array(d));
        let rms = 0; for (let i = 0; i < d.length; i++) rms += d[i] * d[i]; rms = Math.sqrt(rms / d.length);
        if (rms > 0.02) { heard = true; silent = 0; } else if (heard && ++silent > Math.ceil(ctx.sampleRate * 1.4 / 4096)) finish();
      };
      src.connect(proc); proc.connect(ctx.destination);
      this.listening = true; onState(true, 'J\'écoute… (silence = fin)');
      const timer = setTimeout(() => finish(), 15000);
      const self = this;
      let done = false;
      async function finish() {
        if (done) return; done = true; clearTimeout(timer);
        proc.disconnect(); src.disconnect(); stream.getTracks().forEach((t) => t.stop());
        const rate = ctx.sampleRate; ctx.close();
        self.listening = false; onState(false);
        const wav = encodeWav(chunks, rate, 16000);
        try {
          const r = await fetch(A.piBase() + '/api/v1/patricia/stt', { method: 'POST', headers: { Authorization: 'Bearer ' + A.piToken(), 'Content-Type': 'audio/wav' }, body: wav });
          const j = await r.json(); if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
          if (j.text) onText(j.text); else toast('Rien compris, réessaie plus près du micro.', 'warn');
        } catch (e) { toast('Transcription : ' + e.message, 'bad'); }
      }
      this.stopFn = finish;
    },
    speak(text) {
      text = String(text || '').replace(/[•#*`]/g, ' ').slice(0, 600);
      if (!text.trim()) return Promise.resolve();
      if (window.NexusNative && window.NexusNative.speak) { window.NexusNative.speak(text); return new Promise((r) => setTimeout(r, Math.min(15000, 60 * text.length))); }
      if (window.speechSynthesis) {
        return new Promise((res) => {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'fr-FR'; u.rate = 1.03; u.pitch = 1.05;
          const vs = speechSynthesis.getVoices().filter((v) => /^fr/i.test(v.lang));
          const v = vs.find((x) => x.name === prefs.voice) || vs.find((x) => /female|amelie|audrey|julie|denise|hortense|google/i.test(x.name)) || vs[0];
          if (v) u.voice = v;
          u.onend = res; u.onerror = res;
          speechSynthesis.cancel(); speechSynthesis.speak(u);
        });
      }
      if (voiceCaps.tts) {
        return fetch(A.piBase() + '/api/v1/patricia/tts', { method: 'POST', headers: { Authorization: 'Bearer ' + A.piToken(), 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
          .then((r) => r.blob()).then((b) => new Promise((res) => { const a = new Audio(URL.createObjectURL(b)); a.onended = res; a.onerror = res; a.play().catch(res); }));
      }
      return Promise.resolve();
    }
  });
  function encodeWav(chunks, inRate, outRate) {
    const total = chunks.reduce((n, c) => n + c.length, 0), ratio = inRate / outRate, n = Math.floor(total / ratio);
    const flat = new Float32Array(total); let o = 0; chunks.forEach((c) => { flat.set(c, o); o += c.length; });
    const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (p, s) => { for (let i = 0; i < s.length; i++) v.setUint8(p + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, outRate, true); v.setUint32(28, outRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, flat[Math.floor(i * ratio)])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    return new Blob([buf], { type: 'audio/wav' });
  }

  /* ------------------------------------------------------------ cartes */
  const STATUS_LABEL = { idee: 'idée', conception: 'conception', cablage: 'câblage', code: 'code', test: 'essais', termine: 'terminé', pause: 'en pause' };
  function cardHtml(c, i) {
    switch (c.type) {
      case 'projects': return `<div class="pa-card"><div class="pa-card-h">${icon('folder')}Projets</div>${(c.items || []).map((p) => `<button class="pa-row" data-say="On reprend ${esc(p.title)}"><b>${esc(p.title)}</b><span class="badge">${esc(p.status_label || STATUS_LABEL[p.status] || p.status)}</span><span class="muted small grow ellipsis">${esc(p.next_step || '')}</span></button>`).join('')}</div>`;
      case 'project': { const p = c.project || {}; return `<div class="pa-card"><div class="pa-card-h">${icon('folder')}${esc(p.title)} <span class="badge accent">${esc(p.status_label || '')}</span></div><div class="small">${esc(p.goal || '')}</div>${p.modules && p.modules.length ? `<div class="chips" style="margin-top:6px">${p.modules.map((m) => `<span class="chip">${esc(m)}</span>`).join('')}</div>` : ''}${p.next_step ? `<div class="hint" style="margin-top:6px">Prochaine étape : ${esc(p.next_step)}</div>` : ''}</div>`; }
      case 'note': return `<div class="pa-card"><div class="pa-card-h">${icon('pin')}Note enregistrée</div><div class="small">${esc(c.note.body)}</div></div>`;
      case 'notes': return `<div class="pa-card"><div class="pa-card-h">${icon('pin')}Notes</div>${c.items.slice(0, 12).map((n) => `<div class="pa-row"><span class="badge">${esc(n.kind)}</span><span class="grow small">${esc(n.body.slice(0, 180))}</span><span class="muted small">${esc((n.at || '').slice(0, 10))}</span></div>`).join('')}</div>`;
      case 'memory': return (c.items || []).length ? `<div class="pa-card"><div class="pa-card-h">${icon('history')}Souvenirs</div>${c.items.map((h) => `<div class="pa-row"><span class="badge">${esc(h.kind)}</span><span class="grow small"><b>${esc(h.title)}</b> — ${esc(h.snippet || '')}</span></div>`).join('')}</div>` : '';
      case 'catalog': return `<div class="pa-card"><div class="pa-card-h">${icon('book')}Bibliothèque</div>${(c.items || []).map((p) => `<a class="pa-row" href="#library?p=${esc(p.id)}"><b>${esc(p.title)}</b><span class="muted small grow ellipsis">${esc((p.boards || []).join(' · '))}</span>${icon('chevron')}</a>`).join('')}</div>`;
      case 'diagnosis': return `<div class="pa-card ${c.severity === 'bad' ? 'bad' : ''}"><div class="pa-card-h">${icon('alert')}Diagnostic (${esc(c.kind)})</div>${(c.findings || []).map((f) => `<details class="pa-find" ${f.severity === 'bad' ? 'open' : ''}><summary><span class="badge ${f.severity === 'bad' ? 'bad' : f.severity === 'warn' ? 'warn' : 'info'}">${f.severity === 'bad' ? 'erreur' : f.severity === 'warn' ? 'attention' : 'info'}</span> ${esc(f.title)}${f.line ? ` · ligne ${f.line}` : ''}</summary><div class="small">${esc(f.explanation)}</div>${(f.fixes || []).length ? `<ul class="small">${f.fixes.map((x) => `<li>${rich(x)}</li>`).join('')}</ul>` : ''}${f.evidence ? `<pre class="pa-code">${esc(f.evidence)}</pre>` : ''}</details>`).join('') || '<div class="small muted">Aucune signature connue.</div>'}</div>`;
      case 'generate': return `<div class="pa-card" data-gen="${i}"><div class="pa-card-h">${icon('code')}${esc(c.title || 'Projet')} · ${esc(c.board)}</div><div class="pa-gen-body small muted">Génération…</div></div>`;
      case 'fleet': return `<div class="pa-card"><div class="pa-card-h">${icon('car')}Flotte</div><div class="row wrap"><a class="btn sm" href="#vehicles">${icon('radar')}Ouvrir l'écran Flotte</a><button class="btn sm danger" data-estop>${icon('stop')}ARRÊT</button></div></div>`;
      case 'lab': { const st = A.S.state || {}; const ws = st.workers || []; return `<div class="pa-card"><div class="pa-card-h">${icon('cpu')}Workers</div><div class="pa-workers">${ws.map((w) => `<span class="pa-w ${w.state === 'OFFLINE' ? 'off' : ''}" title="${esc(w.state)}">W${w.id}<small>${esc(w.state || '')}</small></span>`).join('') || '<span class="muted small">Aucun</span>'}</div></div>`; }
      case 'pi_projects': return (c.items || []).length ? `<div class="pa-card"><div class="pa-card-h">${icon('sd')}Sur la microSD du Pi</div><div class="chips">${c.items.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>` : '';
      default: return '';
    }
  }
  function renderGenerate(box, c) {
    const body = $('.pa-gen-body', box);
    let res;
    try { res = window.LAB.generate({ board: c.board || 'esp32', title: c.title || 'Projet', modules: (c.modules || []).map((id) => ({ id })) }); }
    catch (e) { body.textContent = 'Génération impossible : ' + e.message; return; }
    const mont = window.LAB.montageSvg ? window.LAB.montageSvg(res, { title: c.title }) : null;
    body.className = 'pa-gen-body';
    body.innerHTML = `<div class="seg" style="margin-bottom:8px"><button data-t="wiring" class="${c.show === 'code' ? '' : 'on'}">Câblage</button><button data-t="code" class="${c.show === 'code' ? 'on' : ''}">Code</button><button data-t="libs">Bibliothèques</button></div>
      <div data-p="wiring" ${c.show === 'code' ? 'hidden' : ''}>${mont ? `<div class="pa-svg">${mont.svg}</div>` : ''}<table class="pa-wire"><tbody>${res.wiring.map((w) => `<tr><td>${esc(w.mod || '')}</td><td>${esc(w.pin)}</td><td>→</td><td><b>${esc(w.to)}</b></td></tr>`).join('')}</tbody></table>${res.warnings.length ? `<div class="banner warn small">${icon('alert')}<div>${res.warnings.map(esc).join('<br>')}</div></div>` : ''}</div>
      <div data-p="code" ${c.show === 'code' ? '' : 'hidden'}>${A.codeBlock(res.code, '360px')}</div>
      <div data-p="libs" hidden><ul class="small">${(res.libs || []).map((l) => `<li>${esc(l.name || l)} ${esc(l.ver || '')}</li>`).join('') || '<li>Aucune bibliothèque externe</li>'}</ul><div class="hint">Variables publiées : ${(res.outs || []).map((o) => `<code>${esc(o.key)}</code> (${esc(o.unit || '')})`).join(', ') || '—'}</div></div>
      <div class="row wrap" style="margin-top:8px"><button class="btn sm" data-a="copy">${icon('copy')}Copier le code</button><button class="btn sm" data-a="dl">${icon('download')}.ino</button><button class="btn sm" data-a="studio">${icon('wand')}Ouvrir dans le Studio</button><button class="btn sm primary" data-a="save">${icon('save')}Enregistrer sur le Pi</button></div>`;
    body.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-t]');
      if (t) { $$('[data-t]', body).forEach((b) => b.classList.toggle('on', b === t)); $$('[data-p]', body).forEach((p) => { p.hidden = p.dataset.p !== t.dataset.t; }); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'copy') A.copyText(res.code);
      if (a.dataset.a === 'dl') A.download((c.project || 'projet') + '.ino', res.code);
      if (a.dataset.a === 'studio') A.openInStudio({ title: c.title, board: c.board || 'esp32', modules: (c.modules || []).map((id) => ({ id })), rules: [], options: {} }, 'wiring');
      if (a.dataset.a === 'save') await saveToPi(c, res);
    });
  }
  async function saveToPi(c, res) {
    const id = (c.project || A.norm(c.title || 'projet').replace(/[^a-z0-9]+/g, '_')).slice(0, 60).replace(/^_+|_+$/g, '') || 'projet';
    const meta = { title: c.title, board: res.board, spec: { board: res.board, title: c.title, modules: (c.modules || []).map((x) => ({ id: x })) }, outs: res.outs, wiring: res.wiring, created_by: 'Patricia' };
    const readme = `# ${c.title}\n\nCarte : ${res.boardName}\n\n## Câblage\n\n${res.wiring.map((w) => `- ${w.mod || ''} ${w.pin} → ${w.to}`).join('\n')}\n\n## Bibliothèques\n\n${(res.libs || []).map((l) => `- ${l.name || l} ${l.ver || ''}`).join('\n') || '- aucune'}\n`;
    try { await A.piSaveProject(id, { [id + '.ino']: res.code, 'project.json': JSON.stringify(meta, null, 2), 'README.md': readme }); toast('Projet « ' + id + ' » enregistré sur la microSD du Pi', 'ok'); return id; }
    catch (e) { toast('Pi : ' + e.message, 'bad'); return null; }
  }

  /* ------------------------------------------------------------ actions confirmées */
  const RISK = { aucun: '', faible: 'info', moyen: 'warn', 'élevé': 'bad' };
  function actionHtml(a) {
    return `<div class="pa-action" data-aid="${esc(a.id)}"><div class="grow"><div class="small"><b>${esc(a.summary)}</b></div><div class="hint">${a.executor === 'ui' ? 'Exécuté par le MASTER S3' : 'Exécuté par le Pi'}${a.risk && a.risk !== 'aucun' ? ` · risque ${esc(a.risk)}` : ''}</div></div>
      <button class="btn sm" data-cancel>Annuler</button><button class="btn sm ${a.risk === 'élevé' ? 'danger' : 'primary'}" data-confirm>${a.needs_confirm ? 'Confirmer' : 'Faire'}</button></div>`;
  }
  async function runAction(el, a, log) {
    const row = el.closest('.pa-action');
    const status = (t, cls) => { row.innerHTML = `<div class="small ${cls || ''}">${t}</div>`; };
    let res;
    try { res = await piJSON(`/api/v1/patricia/actions/${a.id}/confirm`, {}, 300000); }
    catch (e) { status(esc(e.message), 'bad-text'); return; }
    if (!res.execute_in_ui) { status(`${icon('check')} Fait : ${esc(a.summary)}${res.result && res.result.id ? ' · job ' + esc(res.result.id) : ''}`); if (a.kind === 'build' && res.result && res.result.id) watchBuild(res.result.id, row, log); return; }
    const p = res.params || a.params;
    try {
      if (a.kind === 's3_job') { const r = await A.post('/api/job', { type: p.type, worker: p.worker || 0, priority: 60 }); status(`${icon('check')} Job ${esc(p.type)} n° ${r.id} envoyé au MASTER`); report(a.id, true, r); }
      else if (a.kind === 'open_page') { A.go(p.page, p.q || undefined); }
      else if (a.kind === 'apk') { await apkFlow(p, row, a); }
      else if (a.kind === 'save_project') { const card = log.querySelector('[data-gen]'); status('Enregistrement…'); const c = card && P._cards[card.dataset.gen]; if (c) { const res2 = window.LAB.generate({ board: c.board, title: c.title, modules: c.modules.map((id) => ({ id })) }); const id = await saveToPi(c, res2); status(id ? `${icon('check')} Enregistré : ${esc(id)}` : 'Échec'); report(a.id, !!id, { id }); } }
      else if (a.kind === 'flash') { await flashFlow(p, row, a, log); }
      else if (a.kind === 'verify') { await verifyFlow(p.worker, p.seconds || 20, row, a, log); }
    } catch (e) { status(esc(e.message)); report(a.id, false, { error: e.message }); }
  }
  /* APK créée par le Pi depuis un projet de la mémoire : lien direct + QR dans la conversation. */
  async function apkFlow(p, row, a) {
    if (!A.AppStudio) throw new Error('Studio APK non chargé');
    row.innerHTML = '<div class="small">Préparation de l\'application…</div>';
    const spec = { title: p.title, board: p.board || 'esp32', modules: (p.modules || []).map((id) => ({ id })) };
    const design = A.AppStudio.fromSpec(spec, p.title);
    design.id = A.AppStudio.slug(p.project || p.title);
    row.innerHTML = '<div class="small">Le Pi assemble et signe l\'APK…</div>';
    const res = await A.AppStudio.publish(design, true);
    const qr = await A.AppStudio.qrUrl(res);
    row.innerHTML = `<div class="pa-card"><div class="pa-card-h">${icon('phone')}<b class="grow">${esc(p.title)} · APK v${esc(res.version)}</b></div>
      <div class="row wrap" style="gap:12px;align-items:flex-start">${qr ? `<img src="${qr}" alt="QR" width="120" height="120" style="background:#fff;border-radius:8px">` : ''}
      <div class="grow" style="min-width:0"><a class="btn primary" href="${esc(res.apk_url)}" download>${icon('download')}Télécharger l'APK</a>
      <div class="small" style="margin-top:6px;word-break:break-all">${esc(res.apk_url)}</div>
      <div class="small">Appli web : <a href="${esc(res.web_url)}" target="_blank" rel="noopener">ouvrir</a> · <a href="#apkstudio?p=${encodeURIComponent(p.project)}">personnaliser dans le Studio APK</a></div></div></div></div>`;
    report(a.id, true, { apk: res.apk_url, sha256: res.sha256 });
  }
  async function report(aid, ok, details, serial) {
    try { return await piJSON(`/api/v1/patricia/actions/${aid}/report`, { ok, details, serial_log: serial || '' }); } catch (e) { return null; }
  }
  async function watchBuild(jid, row, log) {
    for (let i = 0; i < 400; i++) {
      await A.sleep(2500);
      let j; try { j = await pi('/api/v1/jobs/' + encodeURIComponent(jid)); } catch (e) { continue; }
      row.innerHTML = `<div class="small">Compilation ${esc(j.project)} (${esc(j.board)}) : ${esc(j.stage || j.status)} · ${j.progress || 0} %</div>`;
      if (j.status === 'success') { row.innerHTML = `<div class="small">${icon('check')} Compilation réussie · SHA-256 ${esc((j.sha256 || '').slice(0, 12))}…</div>`; return j; }
      if (j.status === 'failed' || j.status === 'canceled') {
        row.innerHTML = `<div class="small">Compilation échouée : ${esc(j.error || '')}</div>`;
        if (j.log) P.ask(j.log.split('\n').slice(-60).join('\n'), { silent: true, label: 'Journal de compilation envoyé à Patricia' });
        return j;
      }
    }
    return null;
  }
  /* Compile sur le Pi → vérifie la puce → OTA autorisée par le S3 → lit le journal → verdict. */
  async function flashFlow(p, row, a, log) {
    const say = (t) => { row.innerHTML = `<div class="small">${t}</div>`; };
    const info = await A.api('/api/worker/info?id=' + encodeURIComponent(p.worker));
    const chip = String(info.chip || '').toLowerCase(), board = p.board || 'esp32';
    if ((board === 'esp32s3' && !chip.includes('s3')) || (board === 'esp32c3' && !chip.includes('c3')) || (board === 'esp32' && (chip.includes('s3') || chip.includes('c3'))))
      throw new Error(`Le worker ${p.worker} est un ${info.chip || 'modèle inconnu'}, le projet vise ${board}.`);
    say('Compilation sur le Pi…');
    const q = await piJSON('/api/v1/build', { project_id: p.project, board, priority: 70 });
    const j = await watchBuild(q.id, row, log);
    if (!j || j.status !== 'success') { report(a.id, false, { stage: 'build' }); return; }
    const ok = await A.modal({ title: 'Flasher le worker ' + p.worker, wide: true, danger: true, ok: 'Le montage est prêt, flasher',
      html: `<p>« ${esc(p.title || p.project)} » (${esc(board)}), SHA-256 ${esc(String(j.sha256).slice(0, 16))}… Le worker quitte le mode labo pendant le projet (BOOT 3 s pour revenir).</p><h3 style="margin:10px 0 8px">Vérifie le montage avant de flasher</h3>${await montageFor(p, board)}` });
    if (!ok) { say('Flash annulé.'); report(a.id, false, { stage: 'annule' }); return; }
    const link = await pi('/api/v1/jobs/' + encodeURIComponent(q.id) + '/firmware-link');
    await A.post('/api/worker/flash/remote', { id: p.worker, url: link.url, sha256: j.sha256, mode: 'project' });
    say('OTA autorisée par le S3 ; transfert et redémarrage du worker…');
    await verifyFlow(p.worker, 25, row, a, log, true);
  }
  /* Schéma + tableau de câblage du projet : catalogue du S3 si connu, sinon généré depuis les modules en mémoire. */
  async function montageFor(p, board) {
    try {
      if (A.projectById && A.projectById(p.project)) return await A.montageHtml({ kind: 'esp', id: p.project, board });
      if (!(p.modules || []).length || !window.LAB.generate) return '<div class="small muted">Montage inconnu pour ce projet : vérifie le câblage avec la fiche du projet.</div>';
      const res = window.LAB.generate({ board, title: p.title || p.project, modules: p.modules.map((id) => (typeof id === 'string' ? { id } : id)) });
      const m = window.LAB.montageSvg ? window.LAB.montageSvg(res, { title: p.title }) : null;
      return (m ? `<div class="montage">${m.svg}</div>` : '') + `<div style="margin-top:10px">${A.wiringTable(res)}</div>` +
        (res.warnings || []).map((w) => `<div class="banner warn" style="margin-top:8px">${icon('alert')}<div>${esc(w)}</div></div>`).join('');
    } catch (e) { return `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
  }
  async function readSerial(worker, seconds, onTick) {
    let since = 0, text = '', usbPos = 0;
    try { const l = await A.api(`/api/worker/log?id=${encodeURIComponent(worker)}&since=0`); since = l.last || 0; } catch (e) { /* ignoré */ }
    try { if (A.S.admin) { const u = await A.api('/api/usb/serial?since=0'); usbPos = u.pos || 0; } } catch (e) { /* pas d'USB */ }
    const t0 = Date.now();
    while (Date.now() - t0 < seconds * 1000) {
      await A.sleep(1500);
      try { const l = await A.api(`/api/worker/log?id=${encodeURIComponent(worker)}&since=${since}`); since = l.last || since; (l.lines || []).forEach((x) => { text += (x.text || '') + '\n'; }); } catch (e) { /* worker en redémarrage */ }
      try { if (A.S.admin) { const u = await A.api('/api/usb/serial?since=' + usbPos); usbPos = u.pos || usbPos; if (u.data) text += u.data; } } catch (e) { /* ignoré */ }
      if (onTick) onTick(Math.round((Date.now() - t0) / 1000), text);
    }
    return text;
  }
  async function verifyFlow(worker, seconds, row, a, log, afterFlash) {
    const text = await readSerial(worker, seconds, (s, t) => { row.innerHTML = `<div class="small">${afterFlash ? 'Flash envoyé. ' : ''}Lecture du moniteur du worker ${worker} : ${s}/${seconds} s</div>${t ? `<pre class="pa-code">${esc(t.slice(-600))}</pre>` : ''}`; });
    const r = await report(a.id, true, { worker }, text || '');
    const v = r && r.verdict ? r.verdict.verdict : 'incertain';
    row.innerHTML = `<div class="small"><span class="badge ${v === 'ok' ? 'ok' : v === 'echec' ? 'bad' : 'warn'}">${v === 'ok' ? 'fonctionne' : v === 'echec' ? 'échec' : 'incertain'}</span> ${esc(r ? r.answer : 'Verdict indisponible')}</div>${!text ? '<div class="hint">Aucune sortie reçue. Pour une vérification fiable, branche la carte en USB au S3 (moniteur série) ou active « Envoyer au MASTER » dans le Studio.</div>' : ''}`;
    if (r && prefs.speak) Voice.speak(r.speak || r.answer);
  }

  /* ------------------------------------------------------------ conversation */
  P._cards = [];
  function bubble(log, who, html, extra) {
    const m = document.createElement('div');
    m.className = 'msg ' + who + (who === 'bot' ? ' pa-msg' : '');
    m.innerHTML = html + (extra ? `<span class="mode">${esc(extra)}</span>` : '');
    log.appendChild(m); log.scrollTop = log.scrollHeight;
    return m;
  }
  function renderReply(log, m, r) {
    const cards = (r.cards || []).map((c) => { P._cards.push(c); return cardHtml(c, P._cards.length - 1); }).join('');
    const acts = (r.actions || []).map(actionHtml).join('');
    const fu = r.followup ? `<div class="pa-follow"><div class="small"><b>${esc(r.followup.question)}</b></div><div class="chips">${(r.followup.choices || []).map((c) => `<button class="chip" data-say="${esc(c)}" ${r.followup.id ? `data-fu="${r.followup.id}"` : ''}>${esc(c)}</button>`).join('')}</div></div>` : '';
    const sugg = (r.suggestions || []).length ? `<div class="chips pa-sugg">${r.suggestions.map((s) => `<button class="chip" data-say="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '';
    const mode = [r.mode === 'ia' ? 'IA' : r.mode === 'local' ? 'hors ligne' : r.mode, r.notice].filter(Boolean).join(' · ');
    m.innerHTML = `<div>${rich(r.answer)}</div>${cards}${acts}${fu}${sugg}<span class="mode">${esc(mode)}</span>`;
    $$('[data-gen]', m).forEach((box) => renderGenerate(box, P._cards[box.dataset.gen]));
    (r.actions || []).forEach((a) => {
      const row = m.querySelector(`[data-aid="${a.id}"]`);
      row.querySelector('[data-confirm]').onclick = (e) => runAction(e.target, a, log);
      row.querySelector('[data-cancel]').onclick = () => { piJSON(`/api/v1/patricia/actions/${a.id}/cancel`, {}).catch(() => {}); row.innerHTML = '<div class="small muted">Annulé.</div>'; };
    });
    if (r.project) P.project = r.project;
    log.scrollTop = log.scrollHeight;
  }
  async function localAnswer(q) {
    let answer = '', mode = 'local';
    const cat = A.catalogAnswer ? A.catalogAnswer(q) : null;
    try { const r = await A.api('/api/agent/chat', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ q }).toString() }); answer = r.answer || ''; mode = r.mode || mode; }
    catch (e) { answer = ''; }
    return { answer: [cat, answer].filter(Boolean).join('\n\n') || 'Le Pi est injoignable et je n\'ai pas de réponse locale. Vérifie la connexion dans « Compagnon Pi ».', mode: 'MASTER seul · ' + mode, cards: [], actions: [] };
  }
  P.ask = async function (q, opts) {
    opts = opts || {};
    const log = P.log; if (!log) { store.set('patricia.pending', q); A.go('assistant'); return; }
    q = String(q || '').trim(); if (!q) return;
    bubble(log, 'me', esc(opts.label || (q.length > 400 ? q.slice(0, 400) + '…' : q)));
    const m = bubble(log, 'bot', '<span class="pa-typing"><i></i><i></i><i></i></span>');
    let r;
    const context = labContext();
    try { const f = await A.api('/api/feeds'); context.feeds = (Array.isArray(f) ? f : f.feeds || []).slice(0, 80).map((x) => ({ device: x.source || x.device, key: x.key, value: x.value, unit: x.unit, ip: x.ip, age_ms: x.age_ms })); } catch (e) { /* MASTER injoignable */ }
    try { r = await piJSON('/api/v1/patricia/chat', { q, session: SESSION, context }, 150000); piOk = true; }
    catch (e) { piOk = false; r = await localAnswer(q); }
    renderReply(log, m, r);
    setPiState();
    if (prefs.speak && !opts.silent) { await Voice.speak(r.speak || r.answer); if (prefs.handsfree && !Voice.listening) startMic(); }
  };

  /* ------------------------------------------------------------ page */
  let micBtn = null, inputEl = null;
  function startMic() {
    if (!micBtn) return;
    Voice.listen((text) => { inputEl.value = ''; P.ask(text); }, (on, partial) => {
      micBtn.classList.toggle('listening', on); document.body.classList.toggle('pa-listening', on);
      if (partial != null && inputEl) inputEl.placeholder = partial || 'Je t\'écoute…';
      if (!on && inputEl) inputEl.placeholder = 'Parle-moi ou écris… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)';
    });
  }
  function setPiState() {
    const b = $('#pa-state'); if (!b) return;
    b.className = 'badge ' + (piOk ? 'ok' : piOk === false ? 'warn' : '');
    b.textContent = piOk ? 'Pi connecté' : piOk === false ? 'Pi injoignable · mode MASTER' : 'Connexion…';
  }

  function chatTab(el) {
    el.innerHTML = `<div class="grid g-3 pa-layout"><div class="card span-2 pa-chatcard"><div class="chat pa-chat" id="pa-log"></div>
      <form class="pa-input" id="pa-form"><button type="button" class="pa-mic" id="pa-mic" title="Parler à Patricia" aria-label="Activer le micro">${icon('mic')}</button>
      <textarea class="input" id="pa-in" rows="1" maxlength="8000" placeholder="Parle-moi ou écris… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"></textarea>
      <button class="btn primary" type="submit" aria-label="Envoyer">${icon('play')}<span class="hide-sm">Envoyer</span></button></form>
      <div class="row wrap pa-toggles"><label class="switch"><input type="checkbox" id="pa-speak" ${prefs.speak ? 'checked' : ''}><span class="track"></span>${icon('volume')} Réponses à voix haute</label>
      <label class="switch"><input type="checkbox" id="pa-hands" ${prefs.handsfree ? 'checked' : ''}><span class="track"></span>Conversation mains libres</label>
      <button class="btn sm ghost" id="pa-paste" type="button">${icon('terminal')}Coller un journal d'erreur</button></div></div>
      <div class="stack"><div class="card pad small"><h3 style="margin-bottom:8px">Patricia peut</h3><ul class="pa-list">
        <li>${icon('wand')}Concevoir tes projets : composants, câblage sans conflit, code, bibliothèques.</li>
        <li>${icon('history')}Se souvenir de tout : notes, mesures, décisions, prochaines étapes.</li>
        <li>${icon('alert')}Trouver la cause d'une erreur de compilation, de flash ou du moniteur série.</li>
        <li>${icon('zap')}Compiler sur le Pi, flasher un worker et vérifier qu'il fonctionne.</li>
        <li>${icon('car')}Piloter jusqu'à 9 voitures avec anticollision ; « stop » arrête tout.</li>
        <li>${icon('phone')}Préparer l'application Android de ton projet.</li></ul>
        <p class="hint" style="margin-top:8px">Toute action sur le matériel te demande une confirmation. L'arrêt d'urgence, lui, est immédiat.</p></div>
        <div class="card pad small"><h3 style="margin-bottom:8px">Essaie</h3><div class="chips" id="pa-try">${['Je veux faire une serre connectée avec un ESP32-S3', 'Comment brancher un HC-SR04 ?', 'Note que la pompe consomme 300 mA', 'On reprend', 'État du labo', 'Toutes les voitures en ligne'].map((s) => `<button class="chip" data-say="${esc(s)}">${esc(s)}</button>`).join('')}</div></div></div></div>`;
    const log = (P.log = $('#pa-log', el));
    micBtn = $('#pa-mic', el); inputEl = $('#pa-in', el);
    const send = () => { const v = inputEl.value; inputEl.value = ''; inputEl.style.height = ''; P.ask(v); };
    $('#pa-form', el).addEventListener('submit', (e) => { e.preventDefault(); send(); });
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    inputEl.addEventListener('input', () => { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(200, inputEl.scrollHeight) + 'px'; });
    micBtn.onclick = () => { if (Voice.listening) Voice.stop(); else startMic(); };
    if (!Voice.available()) micBtn.classList.add('pa-mic-off');
    $('#pa-speak', el).onchange = (e) => { prefs.speak = e.target.checked; savePrefs(); if (!prefs.speak && window.speechSynthesis) speechSynthesis.cancel(); };
    $('#pa-hands', el).onchange = (e) => { prefs.handsfree = e.target.checked; if (prefs.handsfree) prefs.speak = true; $('#pa-speak', el).checked = prefs.speak; savePrefs(); };
    $('#pa-paste', el).onclick = async () => { const t = await A.modal({ title: 'Journal à analyser', html: '<textarea class="textarea" id="pa-logtxt" rows="12" placeholder="Colle ici la sortie de compilation, d\'esptool ou du moniteur série"></textarea>', ok: 'Analyser', onOpen: (m) => $('#pa-logtxt', m).focus() }).then((ok) => ok && $('#pa-logtxt') ? $('#pa-logtxt').value : null); if (t) P.ask(t, { label: 'Journal d\'erreur (' + t.split('\n').length + ' lignes)' }); };
    el.addEventListener('click', (e) => {
      const s = e.target.closest('[data-say]'); if (s) { if (s.dataset.fu) piJSON('/api/v1/patricia/followups/' + s.dataset.fu, { status: /plus tard|non/i.test(s.dataset.say) ? 'dismissed' : 'done' }).catch(() => {}); P.ask(s.dataset.say); return; }
      if (e.target.closest('[data-estop]')) A.fleetStop && A.fleetStop();
    });
    const pending = store.get('patricia.pending', null);
    (async () => {
      const m = bubble(log, 'bot', '<span class="pa-typing"><i></i><i></i><i></i></span>');
      try { const r = await pi('/api/v1/patricia/hello'); piOk = true; renderReply(log, m, r); if (prefs.speak) Voice.speak(r.speak || r.answer); }
      catch (e) { piOk = false; renderReply(log, m, { answer: 'Bonjour ! Je suis Patricia. Le Raspberry Pi n\'est pas joignable : je réponds avec le catalogue du MASTER en attendant. Configure le Pi dans « Compagnon Pi » pour la mémoire, l\'IA et le pilotage.', cards: [], actions: [], mode: 'MASTER seul', suggestions: ['Comment brancher un BME280 ?', 'État du labo'] }); }
      setPiState();
      try { voiceCaps = await pi('/api/v1/patricia/voice'); if (Voice.available()) micBtn.classList.remove('pa-mic-off'); } catch (e) { /* voix du Pi indisponible */ }
      if (pending) { store.set('patricia.pending', null); P.ask(pending); }
    })();
    setTimeout(() => inputEl.focus(), 60);
  }

  /* ------------------------------------------------------------ mémoire */
  async function memoryTab(el) {
    el.innerHTML = '<div class="card pad muted">Chargement de la mémoire…</div>';
    let d;
    try { d = await pi('/api/v1/patricia/memory'); }
    catch (e) { el.innerHTML = `<div class="banner warn">${icon('alert')}<div>La mémoire vit sur le Pi : ${esc(e.message)}. Configure-le dans <a href="#companion">Compagnon Pi</a>.</div></div>`; return; }
    const st = d.stats;
    el.innerHTML = `<div class="grid g-3"><div class="card span-2"><div class="card-h"><h2 class="grow">Notes (${st.notes})</h2><input class="input" id="pm-q" placeholder="Filtrer…" style="max-width:200px"><button class="btn sm primary" id="pm-add">${icon('plus')}Note</button></div><div class="card-b flush" id="pm-notes"></div></div>
      <div class="stack"><div class="card"><div class="card-h"><h2>Ce que Patricia sait de toi</h2></div><div class="card-b" id="pm-facts"></div></div>
      <div class="card pad small"><h3>Mémoire</h3><p class="muted">${st.conversations} messages · ${st.projects} projets · recherche ${st.fts ? 'plein texte' : 'simple'}<br>Fichier : <code>${esc(st.path)}</code> (microSD 64 Go du Pi)</p>
      <div class="row wrap" style="margin-top:8px"><button class="btn sm" id="pm-export">${icon('download')}Exporter</button><button class="btn sm danger" id="pm-wipe">${icon('trash')}Effacer les conversations</button></div></div></div>
      <div class="card span-3"><div class="card-h"><h2 class="grow">Journal des projets (${st.projects})</h2><button class="btn sm" id="pm-newp">${icon('plus')}Projet</button></div><div class="card-b flush" id="pm-projects"></div></div></div>`;
    const drawNotes = () => {
      const q = A.norm($('#pm-q', el).value || '');
      const items = d.notes.filter((n) => !q || A.norm(n.title + ' ' + n.body + ' ' + n.tags.join(' ')).includes(q));
      $('#pm-notes', el).innerHTML = items.map((n) => `<div class="list-item"><div class="icon-tile ${n.kind === 'erreur' ? 'bad' : n.kind === 'mesure' ? 'info' : n.kind === 'decision' ? 'ok' : 'accent'}">${icon(n.pinned ? 'pin' : 'file')}</div><div class="grow"><div style="font-weight:600">${esc(n.title)}</div><div class="small muted">${esc(n.body.slice(0, 240))}</div><div class="hint">${esc(n.kind)} · ${esc((n.updated || '').replace('T', ' ').slice(0, 16))}${n.project ? ' · ' + esc(n.project) : ''}${n.tags.length ? ' · ' + n.tags.map(esc).join(', ') : ''}</div></div><button class="btn sm icon ghost" data-pin="${n.id}" title="Épingler">${icon('pin')}</button><button class="btn sm icon ghost" data-edit="${n.id}" title="Modifier">${icon('edit')}</button><button class="btn sm icon ghost" data-del="${n.id}" title="Supprimer">${icon('trash')}</button></div>`).join('') || '<div class="empty">Aucune note.</div>';
    };
    const drawFacts = () => { $('#pm-facts', el).innerHTML = Object.entries(d.facts).map(([k, v]) => `<div class="row" style="margin-bottom:6px"><span class="grow small"><b>${esc(k)}</b> : ${esc(v)}</span><button class="btn sm icon ghost" data-fdel="${esc(k)}">${icon('x')}</button></div>`).join('') + `<form class="row" id="pm-fform" style="margin-top:8px"><input class="input" name="k" placeholder="ex. prénom" style="width:40%"><input class="input" name="v" placeholder="valeur" style="width:40%"><button class="btn sm">${icon('plus')}</button></form>`; };
    const drawProjects = () => {
      $('#pm-projects', el).innerHTML = d.projects.map((p) => `<div class="list-item"><div class="icon-tile accent">${icon('folder')}</div><div class="grow"><div style="font-weight:600">${esc(p.title)}</div><div class="small muted">${esc(p.goal || '')}</div><div class="hint">${p.board ? esc(p.board) + ' · ' : ''}${p.modules.map(esc).join(', ')}${p.log.length ? ' · dernier : ' + esc(p.log[p.log.length - 1].text) : ''}</div></div>
        <select class="input" data-status="${esc(p.id)}" style="width:auto">${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <button class="btn sm" data-say="On reprend ${esc(p.title)}">${icon('chat')}</button><button class="btn sm icon ghost" data-pdel="${esc(p.id)}">${icon('trash')}</button></div>`).join('') || '<div class="empty">Aucun projet. Décris une idée à Patricia.</div>';
    };
    drawNotes(); drawFacts(); drawProjects();
    $('#pm-q', el).oninput = drawNotes;
    const reload = () => memoryTab(el);
    el.addEventListener('submit', async (e) => { if (e.target.id !== 'pm-fform') return; e.preventDefault(); const f = new FormData(e.target); if (!f.get('k')) return; await piJSON('/api/v1/patricia/facts', { key: f.get('k'), value: f.get('v') }); reload(); });
    el.addEventListener('change', async (e) => { const s = e.target.closest('[data-status]'); if (!s) return; const p = d.projects.find((x) => x.id === s.dataset.status); await piJSON('/api/v1/patricia/projects', { id: p.id, title: p.title, status: s.value }); toast('Statut mis à jour', 'ok'); });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      try {
        if (b.id === 'pm-add' || b.dataset.edit) {
          const n = b.dataset.edit ? d.notes.find((x) => String(x.id) === b.dataset.edit) : null;
          const t = await A.modal({ title: n ? 'Modifier la note' : 'Nouvelle note', html: `<textarea class="textarea" id="pm-txt" rows="8">${esc(n ? n.body : '')}</textarea>`, ok: 'Enregistrer', onOpen: (m) => $('#pm-txt', m).focus() }).then((ok) => ok && $('#pm-txt') ? $('#pm-txt').value : null);
          if (t) { if (n) await piJSON('/api/v1/patricia/notes/' + n.id, { body: t }); else await piJSON('/api/v1/patricia/notes', { text: t }); reload(); }
        } else if (b.dataset.del) { if (await A.confirmBox('Supprimer la note', 'Patricia l\'oubliera définitivement.', 'Supprimer', true)) { await piJSON('/api/v1/patricia/notes/' + b.dataset.del, { delete: true }); reload(); } }
        else if (b.dataset.pin) { const n = d.notes.find((x) => String(x.id) === b.dataset.pin); await piJSON('/api/v1/patricia/notes/' + n.id, { pinned: !n.pinned }); reload(); }
        else if (b.dataset.fdel) { await piJSON('/api/v1/patricia/facts', { key: b.dataset.fdel, delete: true }); reload(); }
        else if (b.dataset.pdel) { if (await A.confirmBox('Supprimer le projet du journal', 'Les fichiers sur la microSD ne sont pas touchés.', 'Supprimer', true)) { await piJSON(`/api/v1/patricia/projects/${b.dataset.pdel}/delete`, {}); reload(); } }
        else if (b.id === 'pm-newp') { const t = await A.modal({ title: 'Nouveau projet', input: '', label: 'Nom du projet', ok: 'Créer' }); if (t) { await piJSON('/api/v1/patricia/projects', { title: t, status: 'idee' }); reload(); } }
        else if (b.id === 'pm-export') { const data = await pi('/api/v1/patricia/export'); A.download('patricia-memoire-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(data, null, 2), 'application/json'); }
        else if (b.id === 'pm-wipe') { if (await A.confirmBox('Effacer les conversations', 'Les notes, projets et préférences sont conservés.', 'Effacer', true)) { await piJSON('/api/v1/patricia/wipe', { what: 'conversations' }); reload(); } }
        else if (b.dataset.say) { A.go('assistant'); setTimeout(() => P.ask(b.dataset.say), 300); }
      } catch (err) { toast(err.message, 'bad'); }
    });
  }

  /* ------------------------------------------------------------ réglages */
  async function settingsTab(el) {
    const voices = (window.speechSynthesis ? speechSynthesis.getVoices() : []).filter((v) => /^fr/i.test(v.lang));
    el.innerHTML = `<div class="grid g-2"><div class="card"><div class="card-h"><h2>Cerveau de Patricia</h2></div><div class="card-b stack">
      <div class="seg" id="ps-preset"><button data-p="local">Hors ligne (règles)</button><button data-p="ollama">IA locale sur le Pi</button><button data-p="online">IA en ligne</button></div>
      <label class="field">Adresse « chat/completions » (vue depuis le Pi)<input class="input" id="ps-ep" placeholder="http://127.0.0.1:11434/v1/chat/completions"></label>
      <label class="field">Modèle<input class="input" id="ps-model" placeholder="qwen2.5:1.5b"></label>
      <label class="field">Clé API (vide = conserver ; inutile pour Ollama)<input class="input" id="ps-key" type="password" autocomplete="off"></label>
      <div class="row"><button class="btn primary" id="ps-save">${icon('save')}Enregistrer</button><span class="small muted" id="ps-state"></span></div>
      <div class="hint">IA locale : <code>sudo bash pi/setup_patricia.sh --ollama</code> installe Ollama et le modèle qwen2.5:1.5b (~1 Go) sur la microSD. Sur un Pi 4 de 4 Go, compte quelques secondes à quelques dizaines de secondes par réponse. Les actions matérielles restent toujours à confirmer.</div></div></div>
      <div class="card"><div class="card-h"><h2>Voix</h2></div><div class="card-b stack small">
      <div>Micro : <b>${Voice.native() ? 'natif Android (APK NEXUS)' : Voice.web() ? 'reconnaissance du navigateur' : Voice.rec() ? 'Vosk sur le Pi' : 'indisponible ici'}</b></div>
      ${Voice.available() ? '' : `<div class="banner warn">${icon('alert')}<div>${esc(Voice.why())}</div></div>`}
      <div>Vosk (Pi) : <b>${voiceCaps.stt ? 'installé' : 'absent'}</b> · Piper (Pi) : <b>${voiceCaps.tts ? 'installé' : 'absent'}</b></div>
      <label class="field">Voix de lecture<select class="input" id="ps-voice"><option value="">Automatique</option>${voices.map((v) => `<option ${v.name === prefs.voice ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>
      <button class="btn sm" id="ps-test">${icon('volume')}Tester la voix</button></div></div></div>`;
    const presets = { ollama: { ep: 'http://127.0.0.1:11434/v1/chat/completions', model: 'qwen2.5:1.5b' }, online: { ep: 'https://', model: '' }, local: { ep: '', model: '' } };
    try { const c = await pi('/api/v1/assistant/config'); $('#ps-ep', el).value = c.endpoint || ''; $('#ps-model', el).value = c.model || ''; $('#ps-state', el).textContent = c.endpoint ? 'IA configurée' + (c.key_set ? ' · clé enregistrée' : '') : 'Mode hors ligne'; }
    catch (e) { $('#ps-state', el).textContent = 'Pi injoignable : ' + e.message; }
    $('#ps-preset', el).onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b) return; const p = presets[b.dataset.p]; $('#ps-ep', el).value = p.ep; $('#ps-model', el).value = p.model; $$('#ps-preset button', el).forEach((x) => x.classList.toggle('on', x === b)); };
    $('#ps-save', el).onclick = async () => { try { const r = await piJSON('/api/v1/assistant/config', { endpoint: $('#ps-ep', el).value.trim(), model: $('#ps-model', el).value.trim(), key: $('#ps-key', el).value }); $('#ps-key', el).value = ''; $('#ps-state', el).textContent = r.endpoint ? 'IA enregistrée' : 'Mode hors ligne'; toast('Réglages de Patricia enregistrés', 'ok'); } catch (e) { toast(e.message, 'bad'); } };
    $('#ps-voice', el).onchange = (e) => { prefs.voice = e.target.value; savePrefs(); };
    $('#ps-test', el).onclick = () => Voice.speak('Bonjour, je suis Patricia, ton assistante de laboratoire. On construit quoi aujourd\'hui ?');
  }

  /* ------------------------------------------------------------ enregistrement */
  A.page({
    id: 'assistant', title: 'Patricia', icon: 'sparkles', group: 'build', mobile: true, short: 'Patricia',
    desc: 'Assistante : projets, mémoire, diagnostic, flash, pilotage, voix',
    render(el, q) {
      const tab = (q && q.tab) || 'chat';
      el.innerHTML = `<div class="pa-hero"><div class="pa-orb" aria-hidden="true"><span></span></div><div class="grow"><div class="eyebrow">NEXUS · ASSISTANTE</div><h2>Patricia</h2><div class="small muted">Je conçois, je retiens, je corrige et je pilote avec toi.</div></div><span class="badge" id="pa-state">Connexion…</span></div>
        <div class="tabs" id="pa-tabs">${[['chat', 'chat', 'Conversation'], ['memory', 'history', 'Mémoire'], ['settings', 'cog', 'Réglages']].map(([k, ic, t]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${icon(ic)}${t}</button>`).join('')}</div><div class="tab-panel" id="pa-panel"></div>`;
      const panel = $('#pa-panel', el);
      const show = (k) => { $$('#pa-tabs button', el).forEach((b) => b.classList.toggle('on', b.dataset.tab === k)); P.log = null; (k === 'memory' ? memoryTab : k === 'settings' ? settingsTab : chatTab)(panel); };
      $('#pa-tabs', el).onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); };
      show(tab);
      setPiState();
      return () => { P.log = null; micBtn = null; inputEl = null; Voice.stop(); };
    }
  });
  A.commands.push({ title: 'Parler à Patricia', group: 'Action', icon: 'mic', run: () => { A.go('assistant'); setTimeout(startMic, 400); } },
    { title: 'Mémoire de Patricia', group: 'Page', icon: 'history', run: () => A.go('assistant', { tab: 'memory' }) });

  /* Bouton flottant : Patricia accessible depuis toutes les pages (appui long = micro). */
  function fab() {
    if ($('#pa-fab')) return;
    const b = document.createElement('button');
    b.id = 'pa-fab'; b.className = 'pa-fab'; b.title = 'Patricia (appui long : micro)'; b.setAttribute('aria-label', 'Ouvrir Patricia');
    b.innerHTML = icon('sparkles');
    let t = null, long = false;
    b.addEventListener('pointerdown', () => { long = false; t = setTimeout(() => { long = true; A.go('assistant'); setTimeout(startMic, 450); }, 550); });
    b.addEventListener('pointerup', () => { clearTimeout(t); if (!long) A.go('assistant'); });
    b.addEventListener('pointerleave', () => clearTimeout(t));
    document.body.appendChild(b);
  }
  window.addEventListener('hashchange', () => { const f = $('#pa-fab'); if (f) f.hidden = (location.hash || '').startsWith('#assistant'); });
  setTimeout(() => { fab(); const f = $('#pa-fab'); if (f) f.hidden = (location.hash || '').startsWith('#assistant'); }, 800);
})();
