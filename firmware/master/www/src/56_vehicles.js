/* Flotte de véhicules : carte de l'aire de jeu, inscription, destinations, manette et ARRÊT D'URGENCE.
 * Le superviseur tourne sur le Pi (pi/patricia/fleet.py) ; chaque voiture porte firmware/vehicle.
 * Cette page envoie des ordres explicites (un clic = une confirmation) ; l'arrêt est toujours immédiat. */
(function () {
  'use strict';
  const A = window.APP, $ = A.$, esc = A.esc, icon = A.icon, toast = A.toast;
  const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#db2777', '#65a30d', '#7c3aed'];
  const STATE = { pret: 'prêt', route: 'en route', attente: 'attend', arrive: 'arrivé', perdu: 'PERDU', conflit: 'CONFLIT', arret: 'arrêt', manuel: 'manuel', bloque: 'obstacle' };
  const pj = (path, body) => A.piRequest(path, { method: 'POST', body: JSON.stringify(body || {}) });

  A.fleetStop = async (vid) => {
    try { await pj('/api/v1/fleet/estop', vid ? { vid } : {}); toast(vid ? `Arrêt envoyé à ${vid}` : 'ARRÊT D\'URGENCE envoyé à toute la flotte', 'ok'); }
    catch (e) { toast('Arrêt via le Pi impossible : ' + e.message + ' — coupe l\'alimentation des véhicules.', 'bad', 10000); }
  };

  A.page({
    id: 'vehicles', title: 'Flotte de véhicules', short: 'Véhicules', icon: 'car', group: 'build',
    desc: 'Piloter jusqu\'à 9 voitures sans collision, avec arrêt d\'urgence',
    render(el) {
      let snap = null, sel = null, mode = 'goal', placing = null, timer = null, joy = null;
      el.innerHTML = `<div class="banner warn">${icon('alert')}<div><b>Non testé sur de vrais véhicules.</b> Commence roues en l'air, puis une voiture à basse vitesse. Garde un coupe-circuit physique sur chaque batterie : le Wi-Fi n'est pas un système de sécurité. <a href="#" id="vh-doc">Règles de sécurité</a></div></div>
        <div class="grid g-3"><div class="card span-2"><div class="card-h"><h2 class="grow">Aire de jeu</h2>
          <div class="seg" id="vh-mode"><button data-m="goal" class="on">Destination</button><button data-m="obstacle">Obstacles</button></div>
          <button class="btn danger pa-estop" id="vh-estop">${icon('stop')}ARRÊT</button><button class="btn" id="vh-release">${icon('play')}Lever l'arrêt</button></div>
          <div class="card-b"><canvas id="vh-map" class="vh-map" aria-label="Carte de l'aire de jeu"></canvas><div class="hint" id="vh-hint">Choisis un véhicule à droite, puis clique une cellule pour l'y envoyer.</div></div></div>
        <div class="stack"><div class="card"><div class="card-h"><h2 class="grow">Véhicules</h2><span class="badge" id="vh-state">…</span></div><div class="card-b flush" id="vh-list"></div></div>
          <div class="card"><div class="card-h"><h2>Manette</h2></div><div class="card-b"><div class="vh-joy" id="vh-joy"><span></span></div><div class="hint">Maintiens et déplace (barre d'espace = ARRÊT) : le superviseur coupe l'avance si un autre véhicule ou un obstacle est devant.</div></div></div>
          <div class="card"><div class="card-h"><h2>Aire</h2></div><div class="card-b"><form class="row wrap" id="vh-arena"><label class="field" style="width:30%">Largeur m<input class="input" name="w" type="number" step="0.1" min="0.5" max="50"></label><label class="field" style="width:30%">Hauteur m<input class="input" name="h" type="number" step="0.1" min="0.5" max="50"></label><label class="field" style="width:30%">Cellule m<input class="input" name="c" type="number" step="0.05" min="0.2" max="2"></label><button class="btn sm">Appliquer</button></form><div class="hint">La cellule doit être plus grande que le véhicule + la marge d'erreur de position (0,5 m conseillé pour des voitures de 20 cm).</div></div></div>
          <div class="card"><div class="card-h"><h2>Journal</h2></div><div class="card-b small" id="vh-events" style="max-height:220px;overflow:auto"></div></div></div></div>`;
      const cv = $('#vh-map', el), ctx = cv.getContext('2d');
      const geom = () => { const a = snap.arena, W = cv.clientWidth, s = W / a.width_m; cv.width = W * devicePixelRatio; cv.height = a.height_m * s * devicePixelRatio; cv.style.height = (a.height_m * s) + 'px'; return { s: s * devicePixelRatio, a }; };
      function draw() {
        if (!snap || !snap.arena) return;
        const { s, a } = geom(), H = cv.height, css = getComputedStyle(document.documentElement);
        const tx = (x) => x * s, ty = (y) => H - y * s;
        ctx.clearRect(0, 0, cv.width, H);
        ctx.strokeStyle = css.getPropertyValue('--line') || '#ddd'; ctx.lineWidth = 1;
        for (let i = 0; i <= a.cols; i++) { ctx.beginPath(); ctx.moveTo(tx(i * a.cell_m), 0); ctx.lineTo(tx(i * a.cell_m), H); ctx.stroke(); }
        for (let j = 0; j <= a.rows; j++) { ctx.beginPath(); ctx.moveTo(0, ty(j * a.cell_m)); ctx.lineTo(cv.width, ty(j * a.cell_m)); ctx.stroke(); }
        ctx.fillStyle = 'rgba(120,120,120,.45)';
        a.obstacles.forEach(([cx, cy]) => ctx.fillRect(tx(cx * a.cell_m), ty((cy + 1) * a.cell_m), a.cell_m * s, a.cell_m * s));
        snap.vehicles.forEach((v, i) => {
          const col = COLORS[i % COLORS.length];
          ctx.fillStyle = col + '33';
          v.held.forEach(([cx, cy]) => ctx.fillRect(tx(cx * a.cell_m), ty((cy + 1) * a.cell_m), a.cell_m * s, a.cell_m * s));
          if (v.path.length) { ctx.strokeStyle = col; ctx.setLineDash([6, 5]); ctx.lineWidth = 2 * devicePixelRatio; ctx.beginPath(); ctx.moveTo(tx(v.x), ty(v.y)); v.path.forEach(([cx, cy]) => ctx.lineTo(tx((cx + 0.5) * a.cell_m), ty((cy + 0.5) * a.cell_m))); ctx.stroke(); ctx.setLineDash([]); }
          if (v.goal) { ctx.strokeStyle = col; ctx.lineWidth = 2 * devicePixelRatio; const gx = tx((v.goal[0] + 0.5) * a.cell_m), gy = ty((v.goal[1] + 0.5) * a.cell_m); ctx.beginPath(); ctx.arc(gx, gy, a.cell_m * s * 0.25, 0, 7); ctx.stroke(); }
          const r = Math.max(8, a.cell_m * s * 0.28), x = tx(v.x), y = ty(v.y);
          ctx.save(); ctx.translate(x, y); ctx.rotate(-v.heading);
          ctx.fillStyle = ['perdu', 'conflit', 'arret'].includes(v.state) ? '#dc2626' : col;
          ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.lineTo(-r, r * 0.85); ctx.lineTo(-r * 0.6, 0); ctx.lineTo(-r, -r * 0.85); ctx.closePath(); ctx.fill();
          ctx.restore();
          ctx.fillStyle = css.getPropertyValue('--text') || '#111'; ctx.font = `${11 * devicePixelRatio}px system-ui`; ctx.fillText(v.id + (sel === v.id ? ' ◀' : ''), x + r + 3, y - r);
        });
        if (snap.estop) { ctx.fillStyle = 'rgba(220,38,38,.12)'; ctx.fillRect(0, 0, cv.width, H); }
      }
      function list() {
        const st = $('#vh-state', el);
        st.className = 'badge ' + (!snap.enabled ? 'warn' : snap.estop ? 'bad' : 'ok');
        st.textContent = !snap.enabled ? 'Pilotage inactif' : snap.estop ? 'ARRÊT ACTIF' : `${snap.vehicles.length} véhicule(s)`;
        const ann = (snap.announced || []).map((v) => `<div class="list-item"><div class="icon-tile warn">${icon('car')}</div><div class="grow"><b>${esc(v.id)}</b><div class="hint">s'est annoncé · batterie ${(v.battery_mv / 1000).toFixed(2)} V</div></div><button class="btn sm primary" data-place="${esc(v.id)}">Placer</button></div>`).join('');
        $('#vh-list', el).innerHTML = (snap.error ? `<div class="hint" style="padding:12px 16px">${esc(snap.error)}</div>` : '') + snap.vehicles.map((v, i) => `<div class="list-item click ${sel === v.id ? 'vh-sel' : ''}" data-vid="${esc(v.id)}"><div class="icon-tile" style="color:${COLORS[i % COLORS.length]}">${icon('car')}</div><div class="grow"><b>${esc(v.id)}</b> <span class="badge ${['perdu', 'conflit', 'arret', 'bloque'].includes(v.state) ? 'bad' : v.state === 'route' ? 'accent' : ''}">${STATE[v.state] || esc(v.state)}</span><div class="hint">(${v.x.toFixed(2)} ; ${v.y.toFixed(2)}) m · ${v.front_mm >= 0 ? v.front_mm + ' mm devant · ' : ''}${v.battery_mv ? (v.battery_mv / 1000).toFixed(2) + ' V · ' : ''}${v.age_s.toFixed(1)} s${v.note ? ' · ' + esc(v.note) : ''}</div></div><button class="btn sm icon ghost" data-stop="${esc(v.id)}" title="Arrêter">${icon('stop')}</button><button class="btn sm icon ghost" data-rm="${esc(v.id)}" title="Retirer">${icon('x')}</button></div>`).join('') + ann || '<div class="empty">Aucun véhicule. Flashe <code>firmware/vehicle</code> sur une voiture : elle apparaîtra ici.</div>';
        $('#vh-events', el).innerHTML = (snap.events || []).slice().reverse().map((e) => `<div class="${e.level === 'bad' ? 'bad-text' : ''}">${esc(e.msg)}</div>`).join('') || '<span class="muted">—</span>';
        const f = $('#vh-arena', el); if (f && document.activeElement.form !== f) { f.w.value = snap.arena.width_m; f.h.value = snap.arena.height_m; f.c.value = snap.arena.cell_m; }
      }
      async function poll() {
        try { snap = await A.piRequest('/api/v1/fleet'); }
        catch (e) { $('#vh-list', el).innerHTML = `<div class="hint" style="padding:12px 16px">Pi injoignable : ${esc(e.message)}. Configure-le dans <a href="#companion">Compagnon Pi</a>.</div>`; $('#vh-state', el).textContent = 'Pi injoignable'; return; }
        list(); draw();
      }
      const cellAt = (ev) => { const r = cv.getBoundingClientRect(), a = snap.arena, s = r.width / a.width_m; const x = (ev.clientX - r.left) / s, y = (r.height - (ev.clientY - r.top)) / s; return { x, y, cx: Math.floor(x / a.cell_m), cy: Math.floor(y / a.cell_m) }; };
      cv.addEventListener('click', async (ev) => {
        if (!snap) return;
        const c = cellAt(ev), a = snap.arena, center = [(c.cx + 0.5) * a.cell_m, (c.cy + 0.5) * a.cell_m];
        try {
          if (placing) { await pj('/api/v1/fleet/register', { vid: placing, x: center[0], y: center[1], heading: 0 }); toast(`${placing} placé : oriente-le vers la droite de la carte (cap 0)`, 'ok'); placing = null; $('#vh-hint', el).textContent = 'Choisis un véhicule, puis clique une cellule.'; }
          else if (mode === 'obstacle') { const key = c.cx + ',' + c.cy, obs = a.obstacles.filter((o) => o.join(',') !== key); if (obs.length === a.obstacles.length) obs.push([c.cx, c.cy]); await pj('/api/v1/fleet/arena', { width_m: a.width_m, height_m: a.height_m, cell_m: a.cell_m, obstacles: obs }); }
          else if (sel) { await pj('/api/v1/fleet/goal', { vid: sel, x: center[0], y: center[1], vmax: 0.25 }); }
          else toast('Choisis d\'abord un véhicule dans la liste.', 'warn');
          poll();
        } catch (e) { toast(e.message, 'bad'); }
      });
      el.addEventListener('click', async (ev) => {
        const t = ev.target.closest('[data-stop],[data-rm],[data-place],[data-vid],[data-m]');
        if (ev.target.id === 'vh-doc') { ev.preventDefault(); A.modal({ title: 'Sécurité des véhicules', html: '<ol class="small"><li>Coupe-circuit physique sur chaque batterie, à portée de main.</li><li>Premier essai roues en l\'air : vérifie que STOP et la perte du Wi-Fi coupent les moteurs.</li><li>Une voiture à la fois, vitesse 0,15 m/s, zone dégagée ; ajoute les autres une par une.</li><li>Le capteur ultrason arrête la voiture seul sous 15 cm.</li><li>La position vient des codeurs de roues : elle dérive. Replace les voitures sur leur case de départ régulièrement.</li><li>Ne laisse jamais une voiture rouler hors de ta vue.</li></ol>', ok: 'Compris', cancel: false }); return; }
        if (!t) return;
        try {
          if (t.dataset.m) { mode = t.dataset.m; el.querySelectorAll('#vh-mode button').forEach((b) => b.classList.toggle('on', b === t)); $('#vh-hint', el).textContent = mode === 'obstacle' ? 'Clique des cellules pour ajouter ou retirer des obstacles (véhicules arrêtés).' : 'Choisis un véhicule, puis clique une cellule.'; }
          else if (t.dataset.stop) await A.fleetStop(t.dataset.stop);
          else if (t.dataset.rm) { if (await A.confirmBox('Retirer ' + t.dataset.rm, 'Le véhicule reçoit STOP puis quitte la flotte.', 'Retirer', true)) await pj('/api/v1/fleet/remove', { vid: t.dataset.rm }); }
          else if (t.dataset.place) { placing = t.dataset.place; $('#vh-hint', el).textContent = `Clique la cellule où se trouve réellement ${placing}, nez tourné vers la droite.`; }
          else if (t.dataset.vid) { sel = t.dataset.vid; list(); draw(); }
          poll();
        } catch (e) { toast(e.message, 'bad'); }
      });
      $('#vh-estop', el).onclick = () => A.fleetStop();
      $('#vh-release', el).onclick = async () => { if (await A.confirmBox('Lever l\'arrêt', 'Les véhicules restent immobiles jusqu\'au prochain ordre.', 'Lever l\'arrêt')) { try { await pj('/api/v1/fleet/release', {}); poll(); } catch (e) { toast(e.message, 'bad'); } } };
      $('#vh-arena', el).addEventListener('submit', async (e) => { e.preventDefault(); const f = e.target; try { await pj('/api/v1/fleet/arena', { width_m: +f.w.value, height_m: +f.h.value, cell_m: +f.c.value, obstacles: [] }); poll(); } catch (er) { toast(er.message, 'bad'); } });
      /* Manette : envoie throttle/steer à 10 Hz tant que le doigt est posé ; relâcher = 0. */
      const pad = $('#vh-joy', el), knob = pad.firstElementChild;
      const sendJoy = () => { if (joy && sel) pj('/api/v1/fleet/manual', { vid: sel, throttle: joy.t, steer: joy.s }).catch((e) => toast(e.message, 'bad')); };
      let joyTimer = null;
      pad.addEventListener('pointerdown', (e) => { if (!sel) { toast('Choisis un véhicule.', 'warn'); return; } pad.setPointerCapture(e.pointerId); joy = { t: 0, s: 0 }; joyTimer = setInterval(sendJoy, 100); move(e); });
      const move = (e) => { if (!joy) return; const r = pad.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width * 2 - 1, dy = (e.clientY - r.top) / r.height * 2 - 1; joy.s = A.clamp(dx, -1, 1); joy.t = A.clamp(-dy, -1, 1) * 0.6; knob.style.transform = `translate(${joy.s * 40}px, ${-joy.t / 0.6 * 40}px)`; };
      pad.addEventListener('pointermove', move);
      const end = () => { if (!joy) return; joy = { t: 0, s: 0 }; sendJoy(); joy = null; clearInterval(joyTimer); knob.style.transform = ''; };
      pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
      const key = (e) => { if (e.key === ' ' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); A.fleetStop(); } };
      document.addEventListener('keydown', key);
      window.addEventListener('resize', draw);
      poll(); timer = setInterval(poll, 300);
      return () => { clearInterval(timer); clearInterval(joyTimer); document.removeEventListener('keydown', key); window.removeEventListener('resize', draw); };
    }
  });
  A.commands.push({ title: 'ARRÊT D\'URGENCE de la flotte', group: 'Action', icon: 'stop', run: () => A.fleetStop() });
})();
