/* Mode téléphone : l'APK NEXUS embarque cette interface et l'ouvre quand le box est hors de portée.
 * Le travail (projets du Studio, notes et faits de Patricia, applications du Studio APK) part dans une boîte
 * d'envoi chiffrée par l'APK (AES-256-GCM, clé du Keystore Android), puis est envoyé au box dès que
 * l'interface du box s'ouvre dans l'APK. Dans un navigateur, ?phone simule ce mode (boîte dans localStorage). */
(function () {
  'use strict';
  const A = window.APP, S = A.S, $ = A.$, esc = A.esc, icon = A.icon, toast = A.toast, store = A.store;
  const N = window.NexusNative && window.NexusNative.outboxList ? window.NexusNative : null;
  const offline = !!((N && N.phone && N.phone() === 'offline') || /[?&]phone\b/.test(location.search));
  const KEY = 'phone.outbox';

  /* ------------------------------------------------------------ boîte d'envoi */
  const Outbox = {
    list() {
      if (N) { try { return JSON.parse(N.outboxList() || '[]'); } catch (e) { return []; } }
      return store.get(KEY, []);
    },
    add(kind, data, label) {
      const item = { kind, data, label, at: new Date().toISOString() };
      if (N) { item.id = N.outboxAdd(JSON.stringify(item)); return item; }
      const items = store.get(KEY, []);
      item.id = 'tel-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      items.push(item); store.set(KEY, items); return item;
    },
    done(ids) {
      if (!ids.length) return;
      if (N) { N.outboxDone(JSON.stringify(ids)); return; }
      store.set(KEY, store.get(KEY, []).filter((x) => !ids.includes(x.id)));
    }
  };
  A.Phone = { offline, native: !!N, Outbox };

  /* Chemins du Pi gardés sur le téléphone en mode hors ligne. */
  const QUEUED = ['/api/v1/patricia/notes', '/api/v1/patricia/facts', '/api/v1/appstudio/apps', '/api/v1/projects/save'];
  const LABELS = { '/api/v1/patricia/notes': 'Note pour Patricia', '/api/v1/patricia/facts': 'Souvenir de Patricia', '/api/v1/appstudio/apps': 'Application du Studio APK', '/api/v1/projects/save': 'Projet' };
  const NOTE_RE = /^\s*(note(r)?( que)?|retiens( que)?|n'oublie pas( que)?|souviens-toi( que)?)\s*[:,]?\s*/i;

  function localMemory() {
    const items = Outbox.list();
    const notes = items.filter((x) => x.kind === 'pi' && x.data.path === '/api/v1/patricia/notes').map((x, i) => {
      const b = x.data.body || {};
      return { id: x.id, title: String(b.text || b.body || '').split('\n')[0].slice(0, 80), body: String(b.text || b.body || ''), tags: ['téléphone'], kind: b.kind || 'note', pinned: false, created: x.at };
    });
    const facts = {};
    items.filter((x) => x.kind === 'pi' && x.data.path === '/api/v1/patricia/facts' && !x.data.body.delete).forEach((x) => { facts[x.data.body.key] = x.data.body.value; });
    return { notes, projects: [], facts, followups: [], stats: { notes: notes.length, conversations: 0, projects: 0, fts: false, path: 'téléphone (en attente d\'envoi au box)' }, catalog: {} };
  }

  function install() {
    if (!offline) return;
    S.phone = true;
    A.piBase = () => 'telephone';
    A.piToken = () => 'telephone';
    A.piRequest = async (path, opts) => {
      opts = opts || {};
      const method = (opts.method || 'GET').toUpperCase();
      let body = {};
      try { body = opts.body ? JSON.parse(opts.body) : {}; } catch (e) { body = {}; }
      if (method === 'GET' && path === '/api/v1/patricia/memory') return localMemory();
      if (method === 'POST' && path === '/api/v1/patricia/chat') {
        const text = String(body.text || body.q || body.message || '');
        if (NOTE_RE.test(text)) {
          const note = text.replace(NOTE_RE, '').trim();
          if (note) {
            Outbox.add('pi', { path: '/api/v1/patricia/notes', body: { text: note } }, 'Note pour Patricia');
            return { answer: `C'est noté sur ton téléphone : « ${note} ». Je l'envoie au box dès que tu le rejoins.`, intent: 'note_add', mode: 'téléphone', cards: [], actions: [], suggestions: ['Mes notes'] };
          }
        }
        throw new Error('Pi hors de portée (mode téléphone)');
      }
      const own = /^\/api\/v1\/patricia\/notes\/(.+)$/.exec(path);
      if (method === 'POST' && own) {
        // Note encore sur le téléphone : modifiée ou supprimée dans la boîte d'envoi.
        const id = decodeURIComponent(own[1]), old = Outbox.list().find((x) => x.id === id);
        if (!old) throw new Error('note déjà envoyée au box : modifie-la quand le box est connecté');
        Outbox.done([id]);
        if (!body.delete) Outbox.add('pi', { path: '/api/v1/patricia/notes', body: Object.assign({}, old.data.body, body.body != null ? { text: body.body } : {}) }, old.label);
        updateBadge();
        return { ok: true };
      }
      if (method === 'POST' && QUEUED.includes(path)) {
        const item = Outbox.add('pi', { path, body }, LABELS[path]);
        updateBadge();
        return { ok: true, queued: true, id: (body.design && body.design.id) || item.id, project_id: body.project_id, note: 'gardé sur le téléphone' };
      }
      throw new Error('Pi hors de portée : disponible quand le téléphone rejoint le Wi-Fi du box');
    };
    A.piSaveProject = async (id, files) => { Outbox.add('project', { id, files }, 'Projet « ' + id + ' »'); updateBadge(); return { ok: true, queued: true }; };
    A.saveProjectToSd = async (id, p, res) => {
      await A.piSaveProject(id, A.projectFilesData(id, p, res));
      toast(`Projet « ${id} » gardé sur le téléphone : il partira au box à la prochaine connexion.`, 'ok', 5000);
      return 'phone';
    };
    // L'APK prévient quand le box redevient joignable.
    window.__nexusBox = (url) => {
      S.boxUrl = url;
      toast(`Box détecté (${url}) : ouvre la page Téléphone pour envoyer ton travail.`, 'ok', 8000);
      updateBadge();
    };
  }

  /* ------------------------------------------------------------ envoi au box */
  async function sendItem(x) {
    if (x.kind === 'project') {
      const { id, files } = x.data;
      if (S.admin) {
        try {
          for (const [name, data] of Object.entries(files)) await A.uploadFile('/api/project/upload', new Blob([data]), { 'X-Project': encodeURIComponent(id), 'X-Filename': encodeURIComponent(name) });
          return 'S3';
        } catch (e) { /* essai sur le Pi */ }
      }
      if (A.piToken && A.piToken()) { await A.piSaveProject(id, files); return 'Pi'; }
      throw new Error('ouvre une session administrateur ou connecte le Pi');
    }
    if (x.kind === 'pi') {
      if (!(A.piToken && A.piToken())) throw new Error('Pi non configuré dans Compagnon Pi');
      await A.piRequest(x.data.path, { method: 'POST', body: JSON.stringify(x.data.body || {}) });
      return 'Pi';
    }
    throw new Error('type inconnu');
  }
  async function sync(quiet) {
    if (offline || S.demo) return { sent: 0, left: Outbox.list().length };
    const items = Outbox.list(), done = [], errors = [];
    const log = store.get('phone.received', []);
    for (const x of items) {
      try { const where = await sendItem(x); done.push(x.id); log.unshift({ label: x.label, at: x.at, received: new Date().toISOString(), where }); }
      catch (e) { errors.push(x.label + ' : ' + e.message); }
    }
    Outbox.done(done);
    store.set('phone.received', log.slice(0, 60));
    if (done.length) toast(`${done.length} élément(s) du téléphone reçus par le box.`, 'ok', 6000);
    if (errors.length && !quiet) toast(`${errors.length} élément(s) en attente : ${errors[0]}`, 'warn', 8000);
    updateBadge();
    return { sent: done.length, left: items.length - done.length, errors };
  }
  A.Phone.sync = sync;

  function updateBadge() {
    const n = Outbox.list().length;
    const b = document.getElementById('phone-badge');
    if (b) { b.textContent = n ? String(n) : ''; b.hidden = !n; }
  }

  /* ------------------------------------------------------------ page Téléphone */
  function render(el) {
    const items = Outbox.list();
    const received = store.get('phone.received', []);
    const head = offline
      ? `<div class="banner ${S.boxUrl ? 'ok' : 'warn'}">${icon(S.boxUrl ? 'wifi' : 'alert')}<div><b>Mode téléphone, sans le box.</b> Bibliothèque, Studio, montages, Studio APK et notes de Patricia marchent ici. Les écrans du matériel montrent un aperçu simulé.${S.boxUrl ? `<br>Le box est de nouveau joignable (${esc(S.boxUrl)}).` : ''}${S.boxUrl && N && N.openBox ? `<div style="margin-top:10px"><button class="btn primary" id="ph-open">${icon('upload')}Ouvrir le box et envoyer</button></div>` : ''}</div></div>`
      : `<div class="banner ok">${icon('wifi')}<div><b>Connecté au box.</b> ${N ? 'Ce que tu as fait hors ligne sur le téléphone est envoyé automatiquement à l\'ouverture.' : 'Installe l\'APK NEXUS sur ton téléphone pour travailler sans le box.'}${N && items.length ? `<div style="margin-top:10px"><button class="btn primary" id="ph-sync">${icon('upload')}Envoyer maintenant</button></div>` : ''}</div></div>`;
    el.innerHTML = `<div class="stack">
      <div class="hero"><div><div class="eyebrow">NEXUS · TÉLÉPHONE</div><h1>Travailler sans le box</h1><p>L'APK garde une copie complète de l'interface. Ton travail attend dans une boîte d'envoi chiffrée, puis rejoint le box dès que le téléphone est sur son Wi-Fi.</p></div></div>
      ${head}
      <div class="grid g-2">
        <section class="card"><div class="card-h"><h2 class="grow">En attente d'envoi (${items.length})</h2></div><div class="card-b flush">${items.length ? items.map((x) => `<div class="list-item"><div class="icon-tile accent">${icon(x.kind === 'project' ? 'file' : 'history')}</div><div class="grow"><b>${esc(x.label || x.kind)}</b><div class="hint">${esc(new Date(x.at).toLocaleString('fr-FR'))}</div></div></div>`).join('') : '<div class="pad muted small">Rien en attente.</div>'}</div></section>
        <section class="card"><div class="card-h"><h2 class="grow">Reçu du téléphone</h2></div><div class="card-b flush">${received.length ? received.slice(0, 20).map((x) => `<div class="list-item"><div class="icon-tile ok">${icon('check')}</div><div class="grow"><b>${esc(x.label)}</b><div class="hint">fait le ${esc(new Date(x.at).toLocaleString('fr-FR'))} · reçu par le ${esc(x.where)} le ${esc(new Date(x.received).toLocaleString('fr-FR'))}</div></div></div>`).join('') : '<div class="pad muted small">Aucun envoi pour l\'instant.</div>'}</div></section>
      </div>
      <section class="card pad small"><h3>Sécurité et restrictions Android</h3><ul class="muted">
        <li>Boîte d'envoi chiffrée en AES-256-GCM avec une clé du Keystore Android, qui ne quitte jamais le téléphone.</li>
        <li>Données dans l'espace privé de l'application ; sauvegarde Android désactivée.</li>
        <li>Seules la page embarquée et l'adresse du box peuvent lire la boîte d'envoi.</li>
        <li>Permissions : Internet, micro (demandé au premier appui) et vibration. Aucune localisation, aucun contact, aucun stockage partagé.</li>
        <li>Le box parle en HTTP sur son propre Wi-Fi (pas de certificat possible sur 192.168.4.1) ; les liens vers Internet s'ouvrent dans le navigateur.</li>
      </ul></section></div>`;
    const open = $('#ph-open', el); if (open) open.onclick = () => N.openBox();
    const s = $('#ph-sync', el); if (s) s.onclick = async () => { s.disabled = true; await sync(false); render(el); };
  }
  A.page({ id: 'phone', title: 'Téléphone', icon: 'phone', group: 'system', desc: 'Travail hors ligne sur le téléphone et envoi au box', render });

  install();
  A.Phone.afterBoot = () => {
    if (offline) { setTimeout(() => toast('Mode téléphone : ton travail reste sur le téléphone et partira au box à la prochaine connexion.', 'ok', 7000), 500); return; }
    if (N && Outbox.list().length) setTimeout(() => sync(true), 2500);
  };
})();
