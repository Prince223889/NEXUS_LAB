/* ESP32 LAB — schéma de montage (SVG) à partir du câblage calculé par LAB.generate().
 * Même convention que les montages Arduino du dossier capteurs/ : carte à gauche, modules à droite,
 * fils colorés (rouge = 3V3, orange = 5V, noir = GND, couleurs = signaux). Utilisé par build.js
 * (fichiers montage*.svg de chaque projet) et par l'interface (onglet Montage, flash). */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const SIGNAL = ['#1e88e5', '#43a047', '#8e24aa', '#546e7a', '#00897b', '#d81b60', '#3949ab', '#6d4c41', '#00acc1', '#7cb342', '#5e35b1', '#9e9d24'];

  function wireColor(to, i) {
    if (/GND/i.test(to)) return { c: '#212121', name: 'noir' };
    if (/5V|VIN/i.test(to)) return { c: '#fb8c00', name: 'orange' };
    if (/3V3|3\.3/i.test(to)) return { c: '#e53935', name: 'rouge' };
    const c = SIGNAL[i % SIGNAL.length];
    const names = ['bleu', 'vert', 'violet', 'gris-bleu', 'turquoise', 'rose', 'indigo', 'marron', 'cyan', 'vert clair', 'mauve', 'olive'];
    return { c, name: names[i % names.length] };
  }

  /* Rangement des broches de la carte : alimentations, masse, puis GPIO croissants. */
  function boardPinOrder(to) {
    if (/3V3/.test(to)) return -3;
    if (/5V|VIN/.test(to)) return -2;
    if (/GND/.test(to)) return -1;
    const m = /GPIO(\d+)/.exec(to);
    return m ? Number(m[1]) : 999;
  }

  /* res = résultat de LAB.generate() ; opts : { title, id }. Renvoie { svg, rows } (rows = tableau de câblage coloré). */
  LAB.montageSvg = function (res, opts) {
    opts = opts || {};
    const wiring = (res.wiring || []).filter((w) => w.to && w.to !== '—' && !/^alimentation|externe/i.test(w.to));
    const board = (LAB.BOARDS && LAB.BOARDS[res.board]) || { name: res.boardName || res.board, short: res.board };
    const ROW = 32, TOP = 96, W = 980;
    const BX = 36, BW = 230, MX = 600, MW = 344;

    // Côté carte : broches distinctes
    const pins = [...new Set(wiring.map((w) => w.to))].sort((a, b) => boardPinOrder(a) - boardPinOrder(b) || a.localeCompare(b));
    const pinY = {};
    pins.forEach((p, i) => { pinY[p] = TOP + 26 + i * ROW; });

    // Côté modules : un bloc par module, une ligne par broche
    const mods = [];
    wiring.forEach((w) => {
      let m = mods.find((x) => x.key === w.mod);
      if (!m) { m = { key: w.mod, name: w.name, rows: [] }; mods.push(m); }
      m.rows.push(w);
    });
    let y = TOP;
    mods.forEach((m) => { m.y = y; m.h = 30 + m.rows.length * ROW; y += m.h + 18; });
    const H = Math.max(TOP + 26 + pins.length * ROW + 20, y) + 58;

    // Couleur par broche de la carte (tous les fils d'un même bus ont la même couleur)
    const colorOf = {};
    let sig = 0;
    pins.forEach((p) => { colorOf[p] = /GND|5V|VIN|3V3/.test(p) ? wireColor(p, 0) : wireColor(p, sig++); });

    const out = [];
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif">`);
    out.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
    out.push(`<text x="${W / 2}" y="34" text-anchor="middle" font-size="20" font-weight="700" fill="#111">${esc(opts.id ? opts.id + ' — ' : '')}${esc(opts.title || res.title || '')}</text>`);
    out.push(`<text x="${BX + BW / 2}" y="${TOP - 14}" text-anchor="middle" font-size="16" font-weight="700" fill="#111">${esc(board.name || board.short)}</text>`);
    out.push(`<rect x="${BX}" y="${TOP}" width="${BW}" height="${Math.max(60, pins.length * ROW + 30)}" rx="8" fill="#0d6ea8" stroke="#0a3d5c" stroke-width="2"/>`);
    pins.forEach((p) => {
      out.push(`<text x="${BX + BW - 18}" y="${pinY[p] + 5}" text-anchor="end" font-size="14" font-weight="700" fill="#fff">${esc(p.replace(' (VIN)', ''))}</text>`);
    });

    // Fils (tracés orthogonaux, un couloir par fil pour limiter les chevauchements)
    let lane = 0;
    const rows = [];
    mods.forEach((m) => {
      m.rows.forEach((w, k) => {
        const yb = pinY[w.to], ym = m.y + 30 + k * ROW;
        const col = colorOf[w.to];
        const xl = BX + BW + 40 + (lane++ % 14) * 20;
        out.push(`<path d="M${BX + BW} ${yb} H${xl} V${ym} H${MX}" fill="none" stroke="${col.c}" stroke-width="3" stroke-linejoin="round"><title>${esc(`${w.to} → ${w.name} ${w.pin}${w.note ? ' — ' + w.note : ''}`)}</title></path>`);
        rows.push({ board: w.to, module: w.name, label: w.mod, pin: w.pin, color: col.name, hex: col.c, note: w.note || '' });
      });
    });
    pins.forEach((p) => { out.push(`<circle cx="${BX + BW}" cy="${pinY[p]}" r="6" fill="#fff" stroke="#111" stroke-width="1.5"/>`); });

    mods.forEach((m) => {
      out.push(`<text x="${MX + MW / 2}" y="${m.y - 6}" text-anchor="middle" font-size="13" font-weight="700" fill="#111">${esc(m.name)}${m.key && m.key !== m.name ? ` (${esc(m.key)})` : ''}</text>`);
      out.push(`<rect x="${MX}" y="${m.y}" width="${MW}" height="${m.h - 8}" rx="6" fill="#f3f0e6" stroke="#111" stroke-width="1.5"/>`);
      m.rows.forEach((w, k) => {
        const ym = m.y + 30 + k * ROW, col = colorOf[w.to];
        out.push(`<rect x="${MX - 6}" y="${ym - 6}" width="12" height="12" fill="${col.c}"/>`);
        out.push(`<text x="${MX + 16}" y="${ym + 5}" font-size="13" fill="#111">${esc(w.pin)}</text>`);
        if (w.note) out.push(`<text x="${MX + MW - 10}" y="${ym + 5}" text-anchor="end" font-size="10.5" fill="#666">${esc(w.note.length > 34 ? w.note.slice(0, 33) + '…' : w.note)}</text>`);
      });
    });
    if (!wiring.length) out.push(`<text x="${W / 2}" y="${TOP + 60}" text-anchor="middle" font-size="15" fill="#666">Aucun câblage externe pour ce projet.</text>`);
    out.push(`<text x="${BX}" y="${H - 22}" font-size="12" fill="#777">ESP32 LAB ${esc(LAB.VERSION || '')} — fils : rouge = 3V3, orange = 5V, noir = GND, couleurs = signaux. Toujours câbler carte débranchée.</text>`);
    out.push('</svg>');
    return { svg: out.join('\n'), rows };
  };

  /* MONTAGE.md d'un projet (tableau + image). */
  LAB.montageMd = function (res, opts, rows, svgName) {
    const L = [`# ${opts.title || res.title}`, ''];
    if (opts.desc) L.push(opts.desc, '');
    L.push(`**Carte :** ${res.boardName} — moniteur série 115200 bauds.`, '');
    L.push(`![Montage](${svgName || 'montage.svg'})`, '');
    if (rows.length) {
      L.push(`| ${res.boardName.split(' ')[0]} | Composant | Broche | Couleur fil | Remarque |`, '|---|---|---|---|---|');
      rows.forEach((r) => L.push(`| ${r.board} | ${r.module} | ${r.pin} | ${r.color} | ${r.note} |`));
      L.push('');
    } else {
      L.push('Aucun câblage externe.', '');
    }
    (res.warnings || []).forEach((w) => L.push(`> ⚠ ${w}`));
    if ((res.warnings || []).length) L.push('');
    L.push('Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.');
    return L.join('\n') + '\n';
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
