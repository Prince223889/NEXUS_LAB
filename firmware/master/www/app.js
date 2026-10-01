/* ESP32 LAB — app.js généré depuis www/src (21 fichiers). Ne pas modifier : éditez www/src. */
/* ---- 10_core.js ---- */
/* ESP32 LAB 6 — application web du MASTER (PC, tablette, téléphone).
 * Fichier source : les fichiers de www/src/ sont concaténés dans www/app.js par tools/bundle_www.py
 * (appelé automatiquement par le build CMake). Aucune dépendance externe. */
(function () {
  'use strict';
  const LAB = (window.LAB = window.LAB || {});
  const APP = (window.APP = {});

  /* ================================================================ */
  /* Utilitaires                                                      */
  /* ================================================================ */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('lab.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('lab.' + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  };
  function fmtBytes(n) {
    if (n == null || isNaN(n)) return '—';
    const u = ['o', 'Ko', 'Mo', 'Go', 'To'];
    let i = 0;
    n = Number(n);
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i ? n.toFixed(n < 10 ? 1 : 0) : n) + ' ' + u[i];
  }
  function fmtDur(ms) {
    if (ms == null || isNaN(ms)) return '—';
    let s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    if (d) return `${d} j ${h} h`;
    if (h) return `${h} h ${String(m).padStart(2, '0')} min`;
    if (m) return `${m} min ${String(s).padStart(2, '0')} s`;
    return `${s} s`;
  }
  function fmtAgo(ms) {
    if (ms == null) return '—';
    if (ms < 1500) return 'à l\'instant';
    return 'il y a ' + fmtDur(ms);
  }
  const fmtNum = (v, d) => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString('fr-FR', { maximumFractionDigits: d == null ? 1 : d, minimumFractionDigits: 0 }));
  function fmtClock(epoch) {
    if (!epoch || epoch < 1600000000) return null;
    return new Date(epoch * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  function download(name, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); toast('Copié dans le presse-papiers', 'ok'); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Copié dans le presse-papiers', 'ok'); } catch (e2) { toast('Copie impossible', 'bad'); }
      ta.remove();
    }
  }
  const debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(null, a), ms); }; };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* ================================================================ */
  /* Icônes (traits 24×24, style « lucide », intégrées)               */
  /* ================================================================ */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><rect x="9.5" y="9.5" width="5" height="5" rx=".5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    wand: '<path d="m15 4 5 5L9 20H4v-5z"/><path d="m13 6 5 5"/><path d="M19 2v3M21.5 3.5h-3"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.8-.6-.6-2.8z"/>',
    folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
    file: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5"/>',
    usb: '<circle cx="12" cy="20" r="1.8"/><path d="M12 18V3M9 6l3-3 3 3"/><path d="M12 14 7 11V8"/><path d="m12 16 5-3v-2"/><rect x="5.8" y="6" width="2.4" height="2.4"/><circle cx="17" cy="10" r="1.2"/>',
    chat: '<path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.5-5A8.5 8.5 0 1 1 21 12z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    play: '<path d="m6 4 14 8-14 8z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><path d="M12 19.5h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    thermo: '<path d="M14 14.8V4.5a2 2 0 0 0-4 0v10.3a4 4 0 1 0 4 0z"/>',
    drop: '<path d="M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0z"/>',
    memory: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 7V4M11 7V4M15 7V4M19 7V4M7 17v3M11 17v3M15 17v3M19 17v3"/>',
    sd: '<path d="M7 2h8l4 4v14.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20.5v-17A1.5 1.5 0 0 1 6.5 2z"/><path d="M9 6v3M12 6v3M15 6v3"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.8-1.3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    cable: '<path d="M4 9a2 2 0 0 1-2-2V5h6v2a2 2 0 0 1-2 2zM3 5V3M7 5V3"/><path d="M5 9v3a4 4 0 0 0 4 4h6a4 4 0 0 1 4 4v1"/><path d="M17 21h4"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
    terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    radar: '<path d="M19.1 4.9A10 10 0 1 0 22 12"/><path d="M16.2 7.8A6 6 0 1 0 18 12"/><circle cx="12" cy="12" r="2"/><path d="m13.4 10.6 6.6-6.6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    wind: '<path d="M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.3 1.6 1.2 2.8 2.5 2.8z"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 0 1 0 9z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
    pointer: '<path d="m4 4 7 17 2.5-7.5L21 11z"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    id: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h10"/>',
    toggle: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8 7 17M17 7l2.8-2.8"/>',
    chip: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/>',
    screen: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M7 20h10"/><path d="M7 8h4M7 11h7"/>',
    antenna: '<path d="M4.9 16.1a10 10 0 0 1 0-14.2M19.1 1.9a10 10 0 0 1 0 14.2M7.8 13.2a6 6 0 0 1 0-8.4M16.2 4.8a6 6 0 0 1 0 8.4"/><circle cx="12" cy="9" r="2"/><path d="m9.5 22 2.5-11 2.5 11"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/>',
    battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M6 10v4M10 10v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15v4M21 17h-4M5 3v3M6.5 4.5h-3"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M10 13h4M7 16h10"/>',
    pin: '<path d="M12 17v5"/><path d="M9 10.8V4h6v6.8l2.5 2.7V17h-11v-3.5z"/>',
    ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',
    resistor: '<path d="M2 12h4l1.5-4 3 8 3-8 3 8 1.5-4h4"/>',
    wave: '<path d="M2 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
    'mic-off': '<path d="M3 3l18 18"/><path d="M9 9v2a3 3 0 0 0 5 2.2M15 9.3V6a3 3 0 0 0-5.7-1.3"/><path d="M5 11a7 7 0 0 0 11.5 5.4M19 11a7 7 0 0 1-.6 2.8M12 18v3M8 21h8"/>',
    volume: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    car: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/><path d="M5 19v2M19 19v2"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4z"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'
  };
  function icon(name, cls) {
    return `<svg class="${cls || ''}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
  }

  /* ================================================================ */
  /* État global                                                      */
  /* ================================================================ */
  const S = {
    state: null,          // dernier /api/state ou message WebSocket
    admin: false,
    demo: false,
    online: false,
    events: [],
    lastSeq: 0,
    feedHist: {},         // historique local des mesures des capteurs : clé → [[t, v], …]
    hist: { t: [], heap: [], temp: [], hum: [], workers: [], rssi: [] },
    route: 'dash',
    query: {},
    ws: null,
    wsOk: false,
    listeners: new Set(),
    unread: 0
  };
  APP.S = S;
  const onState = (fn) => { S.listeners.add(fn); return () => S.listeners.delete(fn); };

  /* ================================================================ */
  /* API HTTP (avec bascule automatique en mode démo)                  */
  /* ================================================================ */
  async function api(path, opts) {
    opts = opts || {};
    if (S.demo) return APP.Demo.handle(path, opts);
    const r = await fetch(path, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, opts));
    const ct = r.headers.get('content-type') || '';
    let body = null;
    if (ct.includes('json')) body = await r.json().catch(() => null);
    else if (opts.raw) body = await r.blob();
    if (!r.ok) {
      const e = new Error((body && body.error) || `Erreur HTTP ${r.status}`);
      e.status = r.status;
      if (r.status === 401) { S.admin = false; renderShellState(); }
      throw e;
    }
    return body;
  }
  const post = (path, data) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data || {}).toString() });
  const postJSON = (path, data) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) });
  async function act(promise, okMsg) {
    try {
      const r = await promise;
      if (r && r.ok === false) { toast((r.reason || r.error || r.message || 'Échec'), 'bad'); return r; }
      if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'ok');
      return r;
    } catch (e) {
      toast(e.message || String(e), 'bad');
      return null;
    }
  }
  function uploadFile(url, file, headers, onProgress) {
    if (S.demo) return APP.Demo.upload(url, file, headers, onProgress);
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('POST', url);
      Object.entries(headers || {}).forEach(([k, v]) => x.setRequestHeader(k, v));
      x.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      x.onload = () => {
        let j = null;
        try { j = JSON.parse(x.responseText); } catch (e) { /* réponse non JSON */ }
        if (x.status >= 200 && x.status < 300) resolve(j || {});
        else reject(new Error((j && j.error) || `Erreur HTTP ${x.status}`));
      };
      x.onerror = () => reject(new Error('Connexion interrompue'));
      x.send(file);
    });
  }

  /* ================================================================ */
  /* Toasts, modales, tiroir                                          */
  /* ================================================================ */
  function toast(msg, kind, ms) {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.innerHTML = icon(kind === 'ok' ? 'check' : kind === 'bad' ? 'alert' : kind === 'warn' ? 'alert' : 'info') + `<div>${esc(msg)}</div>`;
    box.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .25s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 260); }, ms || (kind === 'bad' ? 5200 : 3200));
  }

  let overlayStack = [];
  function scrim(onClose) {
    const s = document.createElement('div');
    s.className = 'scrim';
    s.addEventListener('click', onClose);
    document.body.appendChild(s);
    requestAnimationFrame(() => s.classList.add('show'));
    return s;
  }
  function closeTop() { const o = overlayStack[overlayStack.length - 1]; if (o) o.close(); }

  function modal(opts) {
    return new Promise((resolve) => {
      const m = document.createElement('div');
      m.className = 'modal' + (opts.wide ? ' wide' : '');
      m.setAttribute('role', 'dialog');
      m.setAttribute('aria-modal', 'true');
      m.innerHTML = `<div class="modal-h"><h2>${esc(opts.title || '')}</h2></div>
        <div class="modal-b">${opts.html || (opts.text ? `<p>${esc(opts.text)}</p>` : '')}
        ${opts.input != null ? `<div class="field" style="margin-top:12px">${opts.label ? `<label>${esc(opts.label)}</label>` : ''}<input class="input" id="modal-in" type="${opts.type || 'text'}" value="${esc(opts.input)}" placeholder="${esc(opts.placeholder || '')}" autocomplete="off"></div>` : ''}</div>
        <div class="modal-f">${opts.cancel === false ? '' : `<button class="btn" data-r="0">${esc(opts.cancel || 'Annuler')}</button>`}<button class="btn ${opts.danger ? 'danger' : 'primary'}" data-r="1">${esc(opts.ok || 'Valider')}</button></div>`;
      let done = false;
      const close = (v) => {
        if (done) return;
        done = true;
        overlayStack = overlayStack.filter((o) => o.el !== m);
        m.classList.remove('show'); sc.classList.remove('show');
        setTimeout(() => { m.remove(); sc.remove(); }, 200);
        resolve(v);
      };
      const sc = scrim(() => close(null));
      document.body.appendChild(m);
      overlayStack.push({ el: m, close: () => close(null) });
      requestAnimationFrame(() => m.classList.add('show'));
      const inp = $('#modal-in', m);
      const val = () => (inp ? inp.value : true);
      m.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) close(b.dataset.r === '1' ? val() : null); });
      if (inp) { inp.focus(); inp.select(); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') close(val()); }); }
      else setTimeout(() => { const b = $('[data-r="1"]', m); if (b) b.focus(); }, 30);
      if (opts.onOpen) opts.onOpen(m);
    });
  }
  const confirmBox = (title, text, ok, danger) => modal({ title, text, ok: ok || 'Confirmer', danger: !!danger });

  function drawer(title, bodyHtml, opts) {
    opts = opts || {};
    const d = document.createElement('aside');
    d.className = 'drawer';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.innerHTML = `<div class="drawer-h"><div class="grow"><h2 class="ellipsis">${esc(title)}</h2>${opts.sub ? `<div class="card-sub ellipsis">${opts.sub}</div>` : ''}</div>${opts.actions || ''}<button class="btn icon ghost" data-close aria-label="Fermer">${icon('x')}</button></div><div class="drawer-b"></div>`;
    const body = $('.drawer-b', d);
    body.innerHTML = bodyHtml || '';
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      overlayStack = overlayStack.filter((o) => o.el !== d);
      d.classList.remove('show'); sc.classList.remove('show');
      setTimeout(() => { d.remove(); sc.remove(); }, 230);
      if (opts.onClose) opts.onClose();
    };
    const sc = scrim(close);
    document.body.appendChild(d);
    overlayStack.push({ el: d, close });
    requestAnimationFrame(() => d.classList.add('show'));
    d.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    return { el: d, body, close };
  }

  /* ================================================================ */
  /* Graphiques SVG (courbes, mini-courbes)                           */
  /* ================================================================ */
  const PALETTE = ['var(--accent)', 'var(--ok)', 'var(--warn)', 'var(--violet)', 'var(--info)', 'var(--bad)'];
  function niceRange(min, max) {
    if (!isFinite(min) || !isFinite(max)) return [0, 1];
    if (min === max) { const d = Math.abs(min) * 0.1 || 1; return [min - d, max + d]; }
    const pad = (max - min) * 0.08;
    return [min - pad, max + pad];
  }
  function lineChart(series, opts) {
    opts = opts || {};
    const W = opts.w || 640, H = opts.h || 200, pl = opts.axis === false ? 4 : 42, pr = 8, pt = 10, pb = opts.axis === false ? 4 : 22;
    const all = [];
    series.forEach((s) => s.data.forEach((v) => { if (v != null && isFinite(v)) all.push(v); }));
    const n = Math.max(2, ...series.map((s) => s.data.length));
    if (!all.length) return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="axis">Pas encore de données</text></svg>`;
    let [lo, hi] = niceRange(opts.min != null ? Math.min(opts.min, ...all) : Math.min(...all), opts.max != null ? Math.max(opts.max, ...all) : Math.max(...all));
    if (opts.min != null) lo = Math.min(lo, opts.min);
    const x = (i) => pl + (i / (n - 1)) * (W - pl - pr);
    const y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
    let g = '';
    if (opts.axis !== false) {
      for (let k = 0; k <= 3; k++) {
        const v = lo + (k / 3) * (hi - lo);
        const yy = y(v).toFixed(1);
        g += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/><text class="axis" x="${pl - 6}" y="${Number(yy) + 3}" text-anchor="end">${esc(opts.fmt ? opts.fmt(v) : fmtNum(v, Math.abs(hi - lo) < 10 ? 1 : 0))}</text>`;
      }
      if (opts.labels) {
        const L = opts.labels;
        [0, Math.floor((L.length - 1) / 2), L.length - 1].forEach((i) => { if (L[i] != null) g += `<text class="axis" x="${x(i * (n - 1) / Math.max(1, L.length - 1)).toFixed(1)}" y="${H - 5}" text-anchor="${i === 0 ? 'start' : i === L.length - 1 ? 'end' : 'middle'}">${esc(L[i])}</text>`; });
      }
    }
    series.forEach((s, si) => {
      const col = s.color || PALETTE[si % PALETTE.length];
      let d = '', started = false, last = null;
      s.data.forEach((v, i) => {
        if (v == null || !isFinite(v)) { started = false; return; }
        d += (started ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1);
        started = true; last = [x(i), y(v)];
      });
      if (s.fill && d) {
        const first = s.data.findIndex((v) => v != null && isFinite(v));
        g += `<path d="${d}L${last[0].toFixed(1)} ${H - pb}L${x(first).toFixed(1)} ${H - pb}Z" fill="${col}" opacity=".10"/>`;
      }
      g += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${s.width || 2}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
      if (last && opts.dots !== false) g += `<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3" fill="${col}"/>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px" role="img" aria-label="${esc(opts.label || 'graphique')}">${g}</svg>`;
  }
  const spark = (data, color) => lineChart([{ data, color, fill: true, width: 1.6 }], { w: 200, h: 32, axis: false, dots: false });

  /* ================================================================ */
  /* Coloration syntaxique C/C++ (Arduino)                            */
  /* ================================================================ */
  const KW = new Set('if else for while do switch case default break continue return goto sizeof static const constexpr volatile extern inline struct class enum union typedef namespace using template typename public private protected virtual override new delete this true false nullptr auto register mutable operator friend explicit noexcept'.split(' '));
  const TY = new Set('void bool char short int long float double unsigned signed uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t size_t byte word String boolean esp_err_t TaskHandle_t QueueHandle_t SemaphoreHandle_t IPAddress WiFiClient WebServer'.split(' '));
  const TOK_RE = /(\/\/.*$|\/\*.*?\*\/|\/\*.*$)|("(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?)|(^[ \t]*#\s*\w+)|(\b0x[0-9a-fA-F]+[uUlL]*\b|\b\d+\.?\d*(?:[eE][+-]?\d+)?[fFuUlL]*\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)/g;
  /* Colorise une ligne ; state.block = vrai si un commentaire /* ... reste ouvert. */
  function hlLine(line, state) {
    let out = '', pos = 0;
    if (state.block) {
      const end = line.indexOf('*/');
      if (end < 0) return `<span class="tok-c">${esc(line)}</span>`;
      out += `<span class="tok-c">${esc(line.slice(0, end + 2))}</span>`;
      pos = end + 2;
      state.block = false;
    }
    const rest = line.slice(pos);
    let last = 0, m;
    TOK_RE.lastIndex = 0;
    while ((m = TOK_RE.exec(rest))) {
      if (m[0] === '') { TOK_RE.lastIndex++; continue; }
      out += esc(rest.slice(last, m.index));
      const t = m[0];
      let cls = '';
      if (m[1]) { cls = 'c'; if (t.startsWith('/*') && !/\*\/$/.test(t)) state.block = true; }
      else if (m[2]) cls = 's';
      else if (m[3]) cls = 'p';
      else if (m[4]) cls = 'n';
      else if (m[5]) cls = KW.has(t) ? 'k' : TY.has(t) ? 't' : 'f';
      else if (m[6]) cls = KW.has(t) ? 'k' : TY.has(t) ? 't' : (/^[A-Z][A-Z0-9_]{2,}$/.test(t) ? 'n' : '');
      out += cls ? `<span class="tok-${cls}">${esc(t)}</span>` : esc(t);
      last = TOK_RE.lastIndex;
    }
    return out + esc(rest.slice(last));
  }
  function highlight(code) {
    const st = { block: false };
    return String(code).split('\n').map((l) => hlLine(l, st)).join('\n');
  }
  function codeBlock(code, maxH) {
    const st = { block: false };
    const lines = String(code).replace(/\n$/, '').split('\n');
    const html = lines.map((l, i) => `<span class="ln" data-n="${i + 1}">${hlLine(l, st) || ' '}</span>`).join('');
    return `<div class="code" style="${maxH ? 'max-height:' + maxH : ''}"><pre><code>${html}</code></pre></div>`;
  }

  Object.assign(APP, { $, $$, esc, clamp, sleep, store, fmtBytes, fmtDur, fmtAgo, fmtNum, fmtClock, download, copyText, debounce, norm, icon, api, post, postJSON, act, uploadFile, toast, modal, confirmBox, drawer, closeTop, lineChart, spark, highlight, codeBlock, onState, PALETTE });

  /* ================================================================ */
  /* Coquille : navigation latérale, barre du haut, barre mobile      */
  /* ================================================================ */
  const PAGES = [];
  APP.page = (def) => PAGES.push(def);   // {id, title, icon, group, admin, mobile, render(el, q) → cleanup?}
  const GROUPS = { main: 'Laboratoire', build: 'Créer', sys: 'Système' };

  function shellHtml() {
    const nav = Object.keys(GROUPS).map((g) => {
      const items = PAGES.filter((p) => p.group === g && !p.hidden);
      return `<div class="nav-group">${GROUPS[g]}</div><nav class="nav">${items.map((p) => `<a href="#${p.id}" data-page="${p.id}">${icon(p.icon)}<span>${esc(p.title)}</span>${p.badge ? `<span class="badge" data-badge="${p.id}" hidden></span>` : ''}</a>`).join('')}</nav>`;
    }).join('');
    const mob = PAGES.filter((p) => p.mobile).slice(0, 4);
    return `<div class="app">
      <aside class="sidebar" aria-label="Navigation">
        <div class="brand"><div class="brand-mark">${icon('chip')}</div><div><div class="brand-name">ESP32 LAB</div><div class="brand-sub" id="brand-sub">v6 · NEXUS</div></div></div>
        <button class="btn" data-act="palette" style="justify-content:flex-start;margin:0 0 6px;color:var(--text-3)">${icon('search')}<span class="grow" style="text-align:left">Rechercher…</span><kbd>Ctrl K</kbd></button>
        ${nav}
        <div class="sidebar-foot">
          <div class="conn"><span class="dot" id="conn-dot"></span><span id="conn-text" class="ellipsis">Connexion…</span></div>
          <div class="row" style="padding:0 4px">
            <button class="btn sm grow" data-act="admin" id="admin-btn">${icon('lock')}<span>Admin</span></button>
            <button class="btn sm icon" data-act="theme" title="Thème clair / sombre" aria-label="Changer de thème">${icon('moon')}</button>
          </div>
        </div>
      </aside>
      <div class="main">
        <header class="topbar" id="topbar">
          <div class="title"><div class="crumbs" id="crumbs"></div><h1 id="page-title">ESP32 LAB</h1></div>
          <div class="row" id="top-actions"></div>
          <button class="btn icon ghost mobile-only" data-act="palette" aria-label="Rechercher">${icon('search')}</button>
          <button class="btn icon ghost mobile-only" data-act="theme" aria-label="Thème">${icon('moon')}</button>
        </header>
        <main class="content" id="view" tabindex="-1"></main>
      </div>
      <nav class="bottombar" aria-label="Navigation mobile">
        ${mob.map((p) => `<a href="#${p.id}" data-page="${p.id}">${icon(p.icon)}<span>${esc(p.short || p.title)}</span></a>`).join('')}
        <a href="#more" data-act="more" data-page="more">${icon('grid')}<span>Plus</span></a>
      </nav>
    </div>`;
  }

  function renderShellState() {
    const st = S.state;
    const dot = $('#conn-dot'), txt = $('#conn-text');
    if (dot) {
      if (S.phone) { dot.className = 'dot warn'; txt.innerHTML = '<a href="#phone">Téléphone · hors ligne</a>'; }
      else if (S.demo) { dot.className = 'dot warn'; txt.textContent = 'Mode démonstration'; }
      else if (!S.online) { dot.className = 'dot bad'; txt.textContent = 'MASTER injoignable'; }
      else { dot.className = 'dot ok'; txt.textContent = (S.wsOk ? 'Temps réel' : 'Connecté') + (st && st.master ? ' · ' + st.master.ap_ip : ''); }
    }
    const ab = $('#admin-btn');
    if (ab) ab.innerHTML = S.admin ? `${icon('unlock')}<span>Admin</span>` : `${icon('lock')}<span>Connexion</span>`;
    if (ab) ab.classList.toggle('primary', S.admin);
    const sub = $('#brand-sub');
    if (sub && st && st.master) sub.textContent = `v${st.master.version} · ${st.master.hostname || 'esp32-lab'}`;
    const jb = $('[data-badge="jobs"]');
    if (jb && st && st.jobs) {
      const n = (st.jobs.running || 0) + (st.jobs.queued || 0);
      jb.hidden = !n; jb.textContent = n; jb.className = 'badge accent';
    }
    const fb = $('[data-badge="fleet"]');
    if (fb && st && st.workers) {
      const on = st.workers.filter((w) => w.state !== 'OFFLINE').length;
      fb.hidden = false; fb.textContent = `${on}/${st.worker_capacity || 10}`; fb.className = 'badge' + (on ? ' ok' : '');
    }
  }
  APP.renderShellState = renderShellState;

  /* ================================================================ */
  /* Routeur                                                          */
  /* ================================================================ */
  let cleanup = null;
  function parseHash() {
    const h = decodeURIComponent(location.hash.slice(1) || 'dash');
    const [id, qs] = h.split('?');
    const q = {};
    new URLSearchParams(qs || '').forEach((v, k) => { q[k] = v; });
    return { id: id || 'dash', q };
  }
  function go(id, q) {
    const qs = q ? '?' + new URLSearchParams(q).toString() : '';
    location.hash = '#' + id + qs;
  }
  APP.go = go;
  function setTopActions(html) { const t = $('#top-actions'); if (t) t.innerHTML = html || ''; }
  APP.setTopActions = setTopActions;

  function route() {
    let { id, q } = parseHash();
    if (id === 'admin') { id = 'settings'; }
    if (id === 'more') { openMore(); return; }
    let page = PAGES.find((p) => p.id === id);
    if (!page) { page = PAGES[0]; id = page.id; }
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { /* ignoré */ } }
    cleanup = null;
    while (overlayStack.length) overlayStack[overlayStack.length - 1].close();
    S.route = id; S.query = q;
    $$('[data-page]').forEach((a) => a.classList.toggle('active', a.dataset.page === id || (a.dataset.page === 'more' && !page.mobile)));
    $('#page-title').textContent = page.title;
    $('#crumbs').textContent = GROUPS[page.group] || '';
    document.title = page.title + ' · ESP32 LAB';
    setTopActions('');
    // nouvel élément à chaque navigation : aucun écouteur d'une page précédente ne survit
    const prev = $('#view');
    const view = prev.cloneNode(false);
    prev.replaceWith(view);
    if (page.admin && !S.admin) {
      view.innerHTML = lockedHtml(page);
    } else {
      try { cleanup = page.render(view, q) || null; }
      catch (e) { console.error(e); view.innerHTML = `<div class="banner warn">${icon('alert')}<div>Erreur d'affichage : ${esc(e.message)}</div></div>`; }
    }
    window.scrollTo(0, 0);
  }
  function lockedHtml(page) {
    return `<div class="card"><div class="empty">${icon('lock')}<h3>${esc(page.title)} : accès administrateur</h3>
      <p class="small" style="max-width:440px">Cette page modifie la carte (fichiers, flash, configuration). Connectez-vous avec le chemin de contrôle privé affiché sur le port série au démarrage (ou en maintenant BOOT 3 s).</p>
      <button class="btn primary" data-act="admin">${icon('unlock')}Se connecter</button></div></div>`;
  }
  APP.refresh = () => route();

  function openMore() {
    const items = PAGES.filter((p) => !p.hidden);
    const d = drawer('Toutes les sections', `<div class="stack">${Object.keys(GROUPS).map((g) => `<div><div class="nav-group" style="padding:0">${GROUPS[g]}</div><div class="card" style="margin-top:6px">${items.filter((p) => p.group === g).map((p) => `<a class="list-item click" href="#${p.id}" style="color:inherit;text-decoration:none"><div class="icon-tile">${icon(p.icon)}</div><div class="grow"><div style="font-weight:600">${esc(p.title)}</div><div class="small muted">${esc(p.desc || '')}</div></div>${icon('chevron')}</a>`).join('')}</div></div>`).join('')}
      <div class="row"><button class="btn grow" data-act="admin">${icon(S.admin ? 'logout' : 'lock')}${S.admin ? 'Déconnexion admin' : 'Connexion admin'}</button><button class="btn grow" data-act="theme">${icon('moon')}Thème</button></div></div>`);
    d.el.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) d.close(); });
    history.replaceState(null, '', '#' + (S.route || 'dash'));
  }

  /* ================================================================ */
  /* Thème, administration                                            */
  /* ================================================================ */
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  function toggleTheme() {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    store.set('theme', next);
    applyTheme(next);
  }
  async function adminAction() {
    if (S.admin) {
      if (!(await confirmBox('Déconnexion', 'Fermer la session administrateur sur cet appareil ?', 'Se déconnecter'))) return;
      await act(post('/api/logout'), 'Session fermée');
      S.admin = false;
      renderShellState();
      route();
      return;
    }
    if (S.demo) { S.admin = true; toast('Mode démo : accès administrateur simulé', 'ok'); renderShellState(); route(); return; }
    const path = await modal({
      title: 'Connexion administrateur',
      html: '<p>Saisissez le <b>chemin de contrôle</b> privé de votre MASTER. Il est affiché sur le moniteur série au démarrage, ou en maintenant le bouton BOOT 3 secondes.</p>',
      input: store.get('cpath', '/'), label: 'Chemin de contrôle', placeholder: '/x-control-…', ok: 'Continuer'
    });
    if (!path) return;
    const p = path.trim().startsWith('/') ? path.trim() : '/' + path.trim();
    store.set('cpath', p);
    location.href = p;
  }

  /* ================================================================ */
  /* Palette de commandes (Ctrl+K / ⌘K / « / »)                        */
  /* ================================================================ */
  APP.commands = [];   // {title, group, icon, run}
  function paletteItems(q) {
    const items = [];
    PAGES.forEach((p) => items.push({ title: p.title, group: 'Aller à', icon: p.icon, run: () => go(p.id) }));
    APP.commands.forEach((c) => items.push(c));
    if (q && q.length >= 2 && LAB.MODULES) {
      const nq = norm(q);
      LAB.MODULES.forEach((m) => { if (norm(m.name + ' ' + m.id + ' ' + (m.tags || []).join(' ')).includes(nq)) items.push({ title: m.name, sub: m.desc, group: 'Capteur', icon: 'box', run: () => go('library', { p: m.id }) }); });
      (LAB.RECIPES || []).forEach((r) => { if (norm(r.title + ' ' + (r.tags || []).join(' ')).includes(nq)) items.push({ title: r.title, group: 'Projet', icon: 'star', run: () => go('library', { p: r.id }) }); });
      (LAB.CLASSICS || []).forEach((c) => { if (norm(c.title + ' ' + (c.tags || []).join(' ')).includes(nq)) items.push({ title: c.title, group: 'Classique', icon: 'book', run: () => go('library', { p: c.id }) }); });
    }
    if (!q) return items.slice(0, 40);
    const nq = norm(q);
    const pre = ['Capteur', 'Projet', 'Classique'];
    return items.filter((i) => pre.includes(i.group) || norm(i.title + ' ' + (i.sub || '')).includes(nq)).slice(0, 60);
  }
  function openPalette() {
    if ($('.palette')) return;
    const p = document.createElement('div');
    p.className = 'palette';
    p.setAttribute('role', 'dialog');
    p.innerHTML = `<input class="input" placeholder="Page, action, capteur, projet…" aria-label="Rechercher"><div class="palette-list" role="listbox"></div>`;
    let items = [], sel = 0;
    const list = $('.palette-list', p), inp = $('input', p);
    const draw = () => {
      items = paletteItems(inp.value.trim());
      sel = clamp(sel, 0, Math.max(0, items.length - 1));
      list.innerHTML = items.length ? items.map((it, i) => `<div class="palette-item${i === sel ? ' on' : ''}" data-i="${i}" role="option">${icon(it.icon || 'chevron')}<div class="grow ellipsis">${esc(it.title)}${it.sub ? `<span class="muted small"> — ${esc(it.sub)}</span>` : ''}</div><span class="grp">${esc(it.group)}</span></div>`).join('') : '<div class="empty small">Aucun résultat</div>';
      const on = $('.palette-item.on', list); if (on) on.scrollIntoView({ block: 'nearest' });
    };
    const close = () => { p.remove(); sc.remove(); overlayStack = overlayStack.filter((o) => o.el !== p); };
    const run = (i) => { const it = items[i]; close(); if (it) it.run(); };
    const sc = scrim(close);
    document.body.appendChild(p);
    overlayStack.push({ el: p, close });
    inp.addEventListener('input', () => { sel = 0; draw(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel++; draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel--; draw(); e.preventDefault(); }
      else if (e.key === 'Enter') { run(sel); e.preventDefault(); }
    });
    list.addEventListener('click', (e) => { const it = e.target.closest('[data-i]'); if (it) run(Number(it.dataset.i)); });
    draw();
    inp.focus();
  }

  /* ================================================================ */
  /* Données temps réel : WebSocket + repli sur interrogation          */
  /* ================================================================ */
  function ingest(st) {
    if (!st || !st.master) return;
    S.state = st;
    S.online = true;
    const t = Date.now();
    const H = S.hist;
    H.t.push(t); H.heap.push(st.master.heap_internal || st.master.heap); H.temp.push(st.master.temp); H.hum.push(st.master.humidity);
    H.workers.push((st.workers || []).filter((w) => w.state !== 'OFFLINE').length); H.rssi.push(st.master.sta_rssi || null);
    if (H.t.length > 300) Object.keys(H).forEach((k) => H[k].shift());
    (st.feeds || []).forEach((f) => {
      const k = f.source + '/' + f.key;
      const a = (S.feedHist[k] = S.feedHist[k] || []);
      if (!a.length || a[a.length - 1][2] !== f.count) a.push([t, f.value, f.count]);
      if (a.length > 600) a.shift();
    });
    if (Array.isArray(st.events) && st.events.length) addEvents(st.events);
    else if (st.event_seq && st.event_seq > S.lastSeq) pollEvents();
    renderShellState();
    S.listeners.forEach((fn) => { try { fn(st); } catch (e) { console.error(e); } });
  }
  function addEvents(list) {
    list.forEach((e) => {
      if (e.seq <= S.lastSeq) return;
      S.events.push(e);
      S.lastSeq = e.seq;
      if (e.lv === 'E' && document.hidden === false && S.route !== 'dash') toast(`${e.src} : ${e.msg}`, 'bad');
    });
    if (S.events.length > 300) S.events.splice(0, S.events.length - 300);
  }
  let evBusy = false;
  async function pollEvents() {
    if (evBusy) return;
    evBusy = true;
    try { const r = await api('/api/events?since=' + S.lastSeq); if (r && r.events) addEvents(r.events); } catch (e) { /* ignoré */ }
    evBusy = false;
  }
  APP.pollEvents = pollEvents;

  async function refreshState() {
    try { ingest(await api('/api/state')); }
    catch (e) { if (!S.demo) { S.online = false; renderShellState(); } }
  }
  APP.refreshState = refreshState;

  function connectWs() {
    if (S.demo || !('WebSocket' in window)) return;
    let ws;
    try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); }
    catch (e) { return; }
    S.ws = ws;
    ws.onopen = () => { S.wsOk = true; renderShellState(); };
    ws.onmessage = (m) => { try { ingest(JSON.parse(m.data)); } catch (e) { /* trame ignorée */ } };
    ws.onclose = () => { S.wsOk = false; S.ws = null; renderShellState(); setTimeout(connectWs, 4000); };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* déjà fermé */ } };
  }
  setInterval(() => { if (!S.wsOk && !document.hidden) refreshState(); }, 3000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshState(); });

  /* ================================================================ */
  /* Démarrage                                                        */
  /* ================================================================ */
  APP.actions = {
    palette: openPalette,
    theme: toggleTheme,
    admin: adminAction,
    more: (el, e) => { e.preventDefault(); openMore(); },
    copy: (el) => copyText(el.dataset.text || ''),
    nav: (el) => go(el.dataset.to, el.dataset.q ? JSON.parse(el.dataset.q) : undefined)
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const fn = APP.actions[a.dataset.act];
    if (fn) { if (a.tagName === 'A' && a.dataset.act !== 'more') e.preventDefault(); fn(a, e); }
  });
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    if (e.key === 'Escape') { closeTop(); return; }
    if (typing) return;
    if (e.key === '/') { e.preventDefault(); openPalette(); return; }
    const pg = PAGES.filter((p) => !p.hidden)[Number(e.key) - 1];
    if (/^[1-9]$/.test(e.key) && pg && !e.altKey && !e.ctrlKey) go(pg.id);
  });
  window.addEventListener('scroll', () => { const t = $('#topbar'); if (t) t.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });

  APP.boot = async function () {
    applyTheme(store.get('theme', null));
    document.getElementById('app').innerHTML = shellHtml();
    window.addEventListener('hashchange', route);
    let sess = null;
    const forceDemo = /[?&]demo\b/.test(location.search) || location.protocol === 'file:' || window.LAB_FORCE_DEMO || !!(APP.Phone && APP.Phone.offline);
    if (!forceDemo) {
      try { sess = await api('/api/session'); } catch (e) { sess = null; }
    }
    if (!sess) {
      S.demo = true;
      S.admin = true;
      APP.Demo.start();
    } else {
      S.admin = !!sess.admin;
      await refreshState();
      pollEvents();
      connectWs();
    }
    renderShellState();
    route();
    if (S.demo && !S.phone) setTimeout(() => toast('Mode démonstration : MASTER non détecté, les données sont simulées.', 'warn', 6000), 400);
    if (APP.Phone) APP.Phone.afterBoot();
    if (location.hash === '#admin' && S.admin) toast('Session administrateur ouverte', 'ok');
  };
})();
/* ---- 20_live.js ---- */
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
    { id: 'IDENTIFY', name: 'Identifier', desc: 'Fait clignoter la LED du worker pour le repérer.', icon: 'eye' },
    { id: 'ADC_READ', name: 'Voltmètre (ADC)', desc: 'Tension moyenne (mV) de chaque broche ADC1 libre du worker.', icon: 'bolt' },
    { id: 'GPIO_TEST', name: 'Test des broches', desc: 'Tirage interne haut/bas : broches libres, tenues à GND ou à 3V3.', icon: 'pin' },
    { id: 'ONEWIRE_SCAN', name: 'Scan 1-Wire', desc: 'Identifiants ROM du bus 1-Wire et température des DS18B20.', icon: 'thermo' },
    { id: 'LOGIC_SAMPLE', name: 'Analyseur logique', desc: 'Capture 1 s à 20 kHz : fréquence et rapport cyclique par broche.', icon: 'activity' },
    { id: 'PWM_GEN', name: 'Générateur PWM', desc: 'Signal carré 1 kHz à 50 % pendant 10 s sur la broche PWM du worker.', icon: 'wave' },
    { id: 'SERVO_SWEEP', name: 'Balayage servo', desc: 'Servomoteur 0° → 180° → 0° sur la broche servo du worker.', icon: 'compass' },
    { id: 'TONE_TEST', name: 'Test buzzer', desc: 'Balayage 200 → 4000 Hz sur la broche buzzer du worker.', icon: 'volume' }
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
            ${[['studio', 'wand', 'Créer un projet', 'Assemblez capteurs + règles, code généré'], ['library', 'book', 'Bibliothèque', `${(A.catalogCount && A.catalogCount()) || '300+'} projets prêts à flasher`], ['sensors', 'activity', 'Capteurs en direct', 'Mesures envoyées par vos montages'], ['tools', 'calc', 'Outils', 'Brochage, calculateurs, I2C'], ['usb', 'usb', 'USB & Arduino', 'Moniteur série, flash AVR'], ['assistant', 'sparkles', 'Patricia', 'Assistante : projets, flash, capteurs, voix']].map(([to, ic, t, d]) => `<a class="list-item click" href="#${to}" style="border:1px solid var(--line);border-radius:10px;color:inherit;text-decoration:none"><div class="icon-tile accent">${icon(ic)}</div><div class="grow"><div style="font-weight:600">${t}</div><div class="small muted ellipsis">${d}</div></div></a>`).join('')}
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
    const items = [['PING', 'activity', 'Ping de toute la flotte'], ['SYSTEM_TEST', 'check', 'Check-up de toute la flotte'], ['BENCHMARK', 'gauge', 'Benchmark comparatif'], ['I2C_SCAN', 'search', 'Scan I2C partout'], ['WIFI_SCAN', 'wifi', 'Cartographie Wi-Fi (scan partout)'], ['MEM_TEST', 'memory', 'Test mémoire partout'], ['GPIO_TEST', 'pin', 'Test des broches partout'], ['ADC_READ', 'bolt', 'Voltmètre sur toute la flotte'], ['ONEWIRE_SCAN', 'thermo', 'Scan 1-Wire partout (DS18B20)'], ['IDENTIFY', 'eye', 'Faire clignoter tous les workers']];
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
/* ---- 30_library.js ---- */
/* Bibliothèque de projets (modules, projets complets, classiques) + outils communs de projet. */
(function () {
  'use strict';
  const A = window.APP, LAB = window.LAB;
  const { $, $$, esc, icon, post, act, toast, drawer, store, download, copyText, norm, fmtNum, S } = A;

  const BOARD_LABEL = { esp32: 'ESP32', esp32s3: 'ESP32-S3', esp32c3: 'ESP32-C3' };
  const CAT_FALLBACK = { name: 'Divers', icon: 'box' };
  const cat = (c) => (LAB.CATS && LAB.CATS[c]) || CAT_FALLBACK;

  /* ---------- Projets : liste unifiée ---------- */
  let PROJECTS = null;
  function projects() {
    if (PROJECTS) return PROJECTS;
    const mods = (LAB.MODULES || []).map((m) => ({
      id: m.id, kind: 'module', cat: m.cat, title: m.name, desc: m.desc, tags: m.tags || [], difficulty: m.difficulty || 1,
      notes: m.notes || [], boards: m.boards || ['esp32', 'esp32s3', 'esp32c3'], bus: m.bus || (m.pins && m.pins.some((p) => p.type === 'uart_rx') ? 'uart' : ''), mod: m,
      spec: { board: m.boards && !m.boards.includes('esp32') ? m.boards[0] : 'esp32', title: `${m.name} — mesure et affichage série`, description: m.desc, modules: [{ id: m.id }], rules: [], options: {} }
    }));
    const recs = (LAB.RECIPES || []).map((r) => ({
      id: r.id, kind: 'recipe', cat: 'app', title: r.title, desc: r.desc, tags: r.tags || [], difficulty: r.difficulty || 2, notes: r.notes || [],
      boards: r.boards || ['esp32', 'esp32s3'],
      spec: { board: r.board || 'esp32', title: r.title, description: r.desc, modules: r.modules, rules: r.rules || [], options: r.options || {} }
    }));
    const cls = (LAB.CLASSICS || []).map((c) => ({ id: c.id, kind: 'classic', cat: 'classic', title: c.title, desc: c.desc, tags: c.tags || [], difficulty: c.difficulty || 1, notes: [], boards: c.boards || ['esp32', 'esp32s3'], code: c.code, libs: c.libs || [] }));
    PROJECTS = mods.concat(recs, cls);
    PROJECTS.forEach((p) => { p._s = norm([p.id, p.title, p.desc, (p.tags || []).join(' '), cat(p.cat).name, p.mod ? (p.mod.addr || []).join(' ') : ''].join(' ')); });
    return PROJECTS;
  }
  A.projects = projects;
  A.catalogCount = () => projects().length;
  A.projectById = (id) => projects().find((p) => p.id === id);

  /* Génère le code pour un projet et une carte, avec options éventuelles. */
  function build(p, board, options) {
    if (p.kind === 'classic') {
      const b = LAB.BOARDS[board] || LAB.BOARDS.esp32;
      return { code: p.code, board: b.id, boardName: b.name, fqbn: b.fqbn, title: p.title, libs: p.libs, wiring: [], warnings: [], power: null, outs: [], classic: true };
    }
    const spec = JSON.parse(JSON.stringify(p.spec));
    spec.board = board || spec.board;
    const net = S.state && S.state.master ? { wifi_ssid: S.state.master.ap_ssid } : {};
    spec.options = Object.assign(net, spec.options, options || {});
    return LAB.generate(spec);
  }
  A.buildProject = build;

  function readme(p, res) {
    const L = [`# ${p.title}`, '', p.desc || '', '', `- Carte : ${res.boardName} (Arduino IDE, cœur esp32 3.3.x)`, `- Difficulté : ${'★'.repeat(p.difficulty || 1)}`];
    if (res.power) L.push(`- Consommation estimée : ${res.power.total_mA} mA (pointe ${res.power.total_peak_mA} mA), carte comprise`);
    if (res.wiring && res.wiring.length) { L.push('', '## Câblage', '', '| Module | Broche | ESP32 | Remarque |', '|---|---|---|---|'); res.wiring.forEach((w) => L.push(`| ${w.name} | ${w.pin} | ${w.to} | ${w.note || ''} |`)); }
    L.push('', '## Bibliothèques', '');
    if (res.libs && res.libs.length) res.libs.forEach((l) => L.push(`- ${l.name} ${l.ver} — https://github.com/${l.repo}`)); else L.push('Aucune : tout est inclus dans le cœur Arduino-ESP32.');
    const notes = (p.notes || []).concat(res.warnings || []);
    if (notes.length) { L.push('', '## Points d\'attention', ''); notes.forEach((n) => L.push('- ' + n)); }
    L.push('', `_Généré par ESP32 LAB ${LAB.VERSION}_`, '');
    return L.join('\n');
  }
  A.readme = readme;

  /* ---------- ZIP minimal (stockage sans compression) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let off = 0;
    const d = new Date();
    const dosT = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosD = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach((f) => {
      const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dosT, true); h.setUint16(12, dosD, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dosT, true); c.setUint16(14, dosD, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    });
    const csize = central.reduce((s, a) => s + a.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
  }
  A.zip = zip;

  function projectFiles(id, p, res) {
    const meta = { id, title: p.title, description: p.desc || p.description || '', board: res.board, fqbn: res.fqbn, libs: (res.libs || []).map((l) => ({ name: l.name, version: l.ver, repo: l.repo })), generator: 'ESP32 LAB ' + LAB.VERSION, spec: p.spec || null };
    return [
      { name: `${id}/${id}.ino`, data: res.code },
      { name: `${id}/README.md`, data: readme(p, res) },
      { name: `${id}/project.json`, data: JSON.stringify(meta, null, 2) + '\n' }
    ];
  }
  A.downloadProjectZip = (id, p, res) => download(id + '.zip', zip(projectFiles(id, p, res)));
  A.projectFilesData = (id, p, res) => Object.fromEntries(projectFiles(id, p, res).map((f) => [f.name.split('/')[1], f.data]));
  A.saveProjectToSd = async (id, p, res) => {
    const files = projectFiles(id, p, res), textFiles = Object.fromEntries(files.map((f) => [f.name.split('/')[1], f.data]));
    if (S.admin) {
      try {
        for (const f of files) await A.uploadFile('/api/project/upload', new Blob([f.data]), { 'X-Project': encodeURIComponent(id), 'X-Filename': encodeURIComponent(f.name.split('/')[1]) });
        toast(`Projet enregistré sur la microSD du S3 : ${id}`, 'ok'); return 's3';
      } catch (e) { if (!A.piSaveProject) throw e; }
    }
    if (A.piSaveProject) {
      await A.piSaveProject(id, textFiles);
      toast(`Projet enregistré sur la microSD partagée du Pi : ${id}`, 'ok'); return 'pi';
    }
    throw new Error('Connecte le Pi dans Compagnon ou insère une microSD dans le S3.');
  };

  /* ---------- Vue de brochage (ordre physique des connecteurs) ---------- */
  const LAYOUTS = {
    esp32: { name: 'DevKit V1 (30 broches)', left: ['EN', 36, 39, 34, 35, 32, 33, 25, 26, 27, 14, 12, 13, 'GND', 'VIN'], right: [23, 22, 1, 3, 21, 19, 18, 5, 17, 16, 4, 2, 15, 'GND', '3V3'] },
    esp32s3: { name: 'DevKitC-1 / YD-ESP32-S3', left: ['3V3', '3V3', 'RST', 4, 5, 6, 7, 15, 16, 17, 18, 8, 3, 46, 9, 10, 11, 12, 13, 14, '5V', 'GND'], right: ['GND', 43, 44, 1, 2, 42, 41, 40, 39, 38, 37, 36, 35, 0, 45, 48, 47, 21, 20, 19, 'GND', 'GND'] },
    esp32c3: { name: 'SuperMini', left: ['5V', 'GND', '3V3', 4, 3, 2, 1, 0], right: [5, 6, 7, 8, 9, 10, 20, 21] }
  };
  A.LAYOUTS = LAYOUTS;
  function pinInfo(b, g) {
    const f = [];
    if (b.adc.includes(g)) f.push('ADC');
    if (b.touch.includes(g)) f.push('Touch');
    if (b.dac.includes(g)) f.push('DAC');
    if (b.inOnly.includes(g)) f.push('entrée seule');
    if (b.i2c.sda === g) f.push('SDA'); if (b.i2c.scl === g) f.push('SCL');
    if (b.spi.sck === g) f.push('SCK'); if (b.spi.miso === g) f.push('MISO'); if (b.spi.mosi === g) f.push('MOSI'); if (b.spi.ss === g) f.push('SS');
    b.uarts.forEach((u) => { if (u.rx === g) f.push(u.name + ' RX'); if (u.tx === g) f.push(u.name + ' TX'); });
    if (b.led === g) f.push('LED');
    return f;
  }
  A.pinInfo = pinInfo;
  function boardView(boardId, used, opts) {
    opts = opts || {};
    const b = LAB.BOARDS[boardId], L = LAYOUTS[boardId];
    const pin = (g, side) => {
      if (typeof g === 'string') {
        const cls = g === 'GND' ? 'gnd' : /V/.test(g) ? 'power' : 'reserved';
        return `<div class="pin ${cls}"><span class="pn">${g}</span><span class="pu">${g === 'EN' || g === 'RST' ? 'reset' : g === 'GND' ? 'masse' : 'alim.'}</span></div>`;
      }
      const u = used && used[g];
      const res = b.reserved[g], cau = b.caution[g];
      const bus = [b.i2c.sda, b.i2c.scl, b.spi.sck, b.spi.miso, b.spi.mosi].includes(g);
      let cls = '', label = '';
      if (u) { cls = u.bus ? 'bus' : 'used'; label = u.label; }
      else if (res) { cls = 'reserved'; label = res; }
      else { label = opts.caps ? pinInfo(b, g).join(' · ') : (bus ? pinInfo(b, g).filter((x) => /SDA|SCL|SCK|MISO|MOSI/.test(x)).join(' ') : ''); }
      if (cau && !u) cls += ' caution';
      const title = [`GPIO${g}`].concat(pinInfo(b, g), res ? ['réservé : ' + res] : [], cau ? ['attention : ' + cau] : []).join(' · ');
      return `<div class="pin ${cls}" title="${esc(title)}" data-gpio="${g}"><span class="pn">${g}</span><span class="pu">${esc(label)}</span></div>`;
    };
    return `<div class="board"><div class="pins left">${L.left.map((g) => pin(g, 'l')).join('')}</div>
      <div class="board-body"><span>${esc(b.short)}</span><div class="chip-can">${b.id === 'esp32' ? 'WROOM' : b.id === 'esp32s3' ? 'S3' : 'C3'}</div><span class="tiny" style="opacity:.7">${esc(L.name)}</span><div class="usb"></div></div>
      <div class="pins">${L.right.map((g) => pin(g, 'r')).join('')}</div></div>
      <div class="pin-legend" style="margin-top:12px"><span class="l-used">utilisée</span><span class="l-bus">bus partagé</span><span class="l-caution">strapping / attention</span><span class="l-res">réservée</span></div>`;
  }
  A.boardView = boardView;
  function usedFromWiring(boardId, wiring) {
    const b = LAB.BOARDS[boardId], used = {};
    const busPins = [b.i2c.sda, b.i2c.scl, b.spi.sck, b.spi.miso, b.spi.mosi];
    (wiring || []).forEach((w) => {
      if (w.gpio == null || w.gpio < 0) return;
      const bus = busPins.includes(w.gpio);
      const lab = bus ? pinInfo(b, w.gpio).filter((x) => /SDA|SCL|SCK|MISO|MOSI/.test(x))[0] : `${w.mod}.${w.pin}`;
      if (used[w.gpio] && !bus && !used[w.gpio].label.includes(lab)) used[w.gpio].label += ' + ' + lab;
      else used[w.gpio] = { label: lab, bus };
    });
    return used;
  }
  A.usedFromWiring = usedFromWiring;

  function wiringTable(res) {
    if (!res.wiring || !res.wiring.length) return `<div class="empty small">${icon('cable')}${res.classic ? 'Projet système : aucun câblage externe (voir les commentaires en tête du code).' : 'Aucun câblage.'}</div>`;
    return `<div class="table-wrap"><table class="tbl responsive"><thead><tr><th>Module</th><th>Broche du module</th><th>Vers l'ESP32</th><th>Remarque</th></tr></thead><tbody>${res.wiring.map((w) => `<tr><td><b>${esc(w.name)}</b> <span class="tiny muted">${esc(w.mod)}</span></td><td data-l="Broche" class="mono">${esc(w.pin)}</td><td data-l="ESP32"><span class="badge ${/GND/.test(w.to) ? '' : /V/.test(w.to) && !/GPIO/.test(w.to) ? 'bad' : 'accent'} mono">${esc(w.to)}</span></td><td data-l="Remarque" class="small muted wide">${esc(w.note || '')}</td></tr>`).join('')}</tbody></table></div>`;
  }
  A.wiringTable = wiringTable;
  function libsHtml(res) {
    if (!res.libs || !res.libs.length) return '<p class="small muted">Aucune bibliothèque externe : tout est inclus dans le cœur Arduino-ESP32 3.3.x.</p>';
    return `<div class="statlist">${res.libs.map((l) => `<div><span><b>${esc(l.name)}</b> <span class="muted small">${esc(l.author || '')}</span></span><span class="row"><span class="badge outline mono">${esc(l.ver)}</span><a class="small" href="https://github.com/${esc(l.repo)}" target="_blank" rel="noopener">GitHub</a></span></div>`).join('')}</div>
      <p class="hint" style="margin-top:8px">Arduino IDE › Outils › Gérer les bibliothèques, puis recherchez le nom exact. Versions validées par compilation.</p>`;
  }
  A.libsHtml = libsHtml;
  const stars = (n) => `<span class="stars" title="Difficulté ${n}/3">${'★'.repeat(n)}<i>${'★'.repeat(Math.max(0, 3 - n))}</i></span>`;
  A.stars = stars;

  /* ---------- Fiche projet ---------- */
  function openProject(id) {
    const p = A.projectById(id);
    if (!p) { toast('Projet introuvable : ' + id, 'warn'); return; }
    let board = store.get('lib.board', 'esp32');
    if (!p.boards.includes(board)) board = p.boards[0];
    const opt = Object.assign({ web: false, master: false, mqtt: false }, p.spec ? p.spec.options : {});
    let tab = p.kind === 'classic' ? 'code' : 'wiring';   // le montage s'affiche dès qu'on choisit un projet
    const favs = new Set(store.get('favs', []));
    const d = drawer(p.title, '', {
      sub: `${esc(cat(p.cat).name)} · ${p.kind === 'module' ? 'capteur / module' : p.kind === 'recipe' ? 'projet complet' : 'classique'}`,
      actions: `<button class="btn icon ghost fav ${favs.has(id) ? 'on' : ''}" data-fav="${esc(id)}" title="Favori">${icon('star')}</button>`
    });
    const render = () => {
      let res;
      try { res = build(p, board, opt); } catch (e) { d.body.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; return; }
      const m = p.mod;
      const bench = p.kind !== 'classic' && A.benchPlanFor ? A.benchPlanFor(Object.assign({}, p.spec, { board })) : null;
      d.body.innerHTML = `
        <p style="color:var(--text-2);margin-bottom:12px">${esc(p.desc || '')}</p>
        <div class="row wrap" style="margin-bottom:14px">${stars(p.difficulty)}${(p.tags || []).slice(0, 6).map((t) => `<span class="badge">${esc(t)}</span>`).join('')}${m && m.bus ? `<span class="badge info">${esc(m.bus.toUpperCase())}${m.addr ? ' ' + esc(m.addr.join('/')) : ''}</span>` : ''}${m && m.vcc ? `<span class="badge ${String(m.vcc).startsWith('5') ? 'warn' : ''}">${esc(m.vcc)}</span>` : ''}</div>
        <div class="row wrap" style="margin-bottom:14px;gap:10px">
          <div class="seg" id="pj-board">${p.boards.map((b) => `<button data-b="${b}" class="${b === board ? 'on' : ''}">${BOARD_LABEL[b] || b}</button>`).join('')}</div>
          ${p.kind !== 'classic' ? `<label class="switch small"><input type="checkbox" data-o="web" ${opt.web ? 'checked' : ''}><span class="track"></span>Page web</label><label class="switch small"><input type="checkbox" data-o="master" ${opt.master ? 'checked' : ''}><span class="track"></span>Envoyer au MASTER</label><label class="switch small"><input type="checkbox" data-o="mqtt" ${opt.mqtt ? 'checked' : ''}><span class="track"></span>MQTT</label>` : ''}
        </div>
        ${(res.warnings || []).map((w) => `<div class="banner warn">${icon('alert')}<div>${esc(w)}</div></div>`).join('')}
        <div class="row wrap" style="margin-bottom:12px">
          ${p.kind !== 'classic' ? `<button class="btn primary" data-pa="ota" title="Compilé si besoin par le Pi, flashé par le S3, moniteur vérifié">${icon('zap')}Flasher sur un worker</button>` : ''}
          <button class="btn" data-pa="zip">${icon('download')}Projet .zip</button>
          <button class="btn" data-pa="ino">${icon('file')}.ino</button>
          <button class="btn" data-pa="copy">${icon('copy')}Copier</button>
          ${p.kind !== 'classic' ? `<button class="btn" data-pa="studio">${icon('wand')}Modifier dans le Studio</button>` : ''}
          ${bench && bench.emulable ? `<button class="btn" data-pa="bench" title="Test matériel automatique par deux workers">${icon('target')}Banc fantôme</button>` : ''}
          <button class="btn" data-pa="sd" ${S.admin ? '' : 'disabled title="Connexion administrateur requise"'}>${icon('sd')}Enregistrer sur la microSD</button>
          ${p.kind !== 'classic' || p.boards.includes(board) ? `<button class="btn" data-pa="flash" ${S.admin ? '' : 'disabled title="Connexion administrateur requise"'}>${icon('usb')}Flasher par câble</button>` : ''}
        </div>
        <div class="tabs" id="pj-tabs">${[['wiring', 'Montage'], ['code', 'Code'], ['pins', 'Brochage'], ['info', 'Infos & bibliothèques']].map(([k, n]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="tab-panel">${tab === 'code' ? A.codeBlock(res.code, '62vh')
          : tab === 'wiring' ? (LAB.montageSvg && res.wiring && res.wiring.length ? `<div class="montage">${LAB.montageSvg(res, { id: p.id, title: p.title }).svg}</div><div class="row" style="margin:10px 0"><button class="btn sm" data-pa="svg">${icon('download')}Schéma .svg</button></div>` : '') + wiringTable(res)
          : tab === 'pins' ? boardView(res.board, usedFromWiring(res.board, res.wiring))
          : `<div class="grid g-2"><div class="card pad"><h3 style="margin-bottom:10px">Bibliothèques</h3>${libsHtml(res)}</div>
             <div class="card pad"><h3 style="margin-bottom:10px">Caractéristiques</h3><dl class="dl">
               <dt>Carte</dt><dd>${esc(res.boardName)}</dd><dt>FQBN</dt><dd class="mono small">${esc(res.fqbn)}</dd>
               ${res.power ? `<dt>Consommation</dt><dd>${fmtNum(res.power.total_mA, 0)} mA (pointe ${fmtNum(res.power.total_peak_mA, 0)} mA)</dd>` : ''}
               ${res.outs && res.outs.length ? `<dt>Mesures</dt><dd>${res.outs.map((o) => `<code>${esc(o.key)}</code>${o.unit ? ' ' + esc(o.unit) : ''}`).join(', ')}</dd>` : ''}
               <dt>Lignes de code</dt><dd>${res.code.split('\n').length}</dd></dl></div>
             ${p.notes && p.notes.length ? `<div class="card pad span-2"><h3 style="margin-bottom:8px">Conseils</h3><ul style="margin:0;padding-left:18px" class="small">${p.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}</div>`}</div>`;
      d.body.onclick = (e) => {
        const bb = e.target.closest('[data-b]'); if (bb) { board = bb.dataset.b; store.set('lib.board', board); render(); return; }
        const tb = e.target.closest('[data-t]'); if (tb) { tab = tb.dataset.t; render(); return; }
        const pa = e.target.closest('[data-pa]'); if (!pa || pa.disabled) return;
        const k = pa.dataset.pa;
        if (k === 'zip') A.downloadProjectZip(p.id, p, res);
        else if (k === 'ino') download(p.id + '.ino', res.code);
        else if (k === 'copy') copyText(res.code);
        else if (k === 'sd') A.saveProjectToSd(p.id, p, res);
        else if (k === 'svg') download(`montage_${p.id}_${board}.svg`, LAB.montageSvg(res, { id: p.id, title: p.title }).svg, 'image/svg+xml');
        else if (k === 'flash') { A.flashPreselect = { board, path: `/sd/PROJECTS/LIBRARY/${p.id}/bin/${board}/${p.id}.bin`, ctx: { kind: 'esp', id: p.id, board } }; d.close(); A.go('usb'); }
        else if (k === 'ota') {
          const base = Object.assign({ web: false, master: false, mqtt: false }, p.spec.options || {});
          const custom = ['web', 'master', 'mqtt'].some((o) => !!opt[o] !== !!base[o]);   // options changées : nouveau firmware à compiler
          d.close();
          A.flashPipeline(custom ? { spec: Object.assign({}, p.spec, { options: Object.assign({}, p.spec.options, opt) }), title: p.title + ' (perso)' } : { id: p.id, title: p.title });
        }
        else if (k === 'bench') { const spec = JSON.parse(JSON.stringify(p.spec)); spec.board = board; d.close(); A.openBench(spec, p.id); }
        else if (k === 'studio') { const spec = JSON.parse(JSON.stringify(p.spec)); spec.board = board; spec.options = Object.assign({}, spec.options, opt); d.close(); A.openInStudio(spec); }
      };
      d.body.onchange = (e) => { const o = e.target.closest('[data-o]'); if (o) { opt[o.dataset.o] = o.checked; render(); } };
    };
    d.el.addEventListener('click', (e) => {
      const f = e.target.closest('[data-fav]');
      if (!f) return;
      const s = new Set(store.get('favs', []));
      if (s.has(id)) s.delete(id); else s.add(id);
      store.set('favs', [...s]);
      f.classList.toggle('on', s.has(id));
      document.dispatchEvent(new CustomEvent('lab:favs'));
    });
    render();
  }
  A.openProject = openProject;

  /* ---------- Page Bibliothèque ---------- */
  A.page({
    id: 'library', title: 'Bibliothèque', icon: 'book', group: 'build', mobile: false,
    desc: 'Plus de 300 projets : capteurs, montages complets, classiques',
    render(el, q) {
      if (!LAB.MODULES || !LAB.MODULES.length) { el.innerHTML = `<div class="banner warn">${icon('alert')}<div>Catalogue non chargé (catalog.js).</div></div>`; return; }
      const all = projects();
      const f = Object.assign({ q: '', cat: 'all', kind: 'all', board: 'all', fav: false, sort: 'cat' }, store.get('lib.filter', {}));
      if (q && q.q != null) f.q = q.q;
      if (q && q.cat) f.cat = q.cat;
      const cats = {};
      all.forEach((p) => { cats[p.cat] = (cats[p.cat] || 0) + 1; });
      const counts = { module: all.filter((p) => p.kind === 'module').length, recipe: all.filter((p) => p.kind === 'recipe').length, classic: all.filter((p) => p.kind === 'classic').length };
      A.setTopActions(`<button class="btn" data-act="lib-random">${icon('sparkles')}<span class="lbl">Au hasard</span></button><a class="btn primary" href="#studio">${icon('plus')}<span class="lbl">Nouveau projet</span></a>`);
      el.innerHTML = `
        <div class="grid g-4" style="margin-bottom:16px">
          <div class="card kpi" style="min-height:0"><div class="k">${icon('box')}Capteurs & modules</div><div class="v">${counts.module}</div></div>
          <div class="card kpi" style="min-height:0"><div class="k">${icon('star')}Projets complets</div><div class="v">${counts.recipe}</div></div>
          <div class="card kpi" style="min-height:0"><div class="k">${icon('book')}Classiques ESP32</div><div class="v">${counts.classic}</div></div>
          <div class="card kpi" style="min-height:0"><div class="k">${icon('layers')}Bibliothèques Arduino</div><div class="v">${Object.keys(LAB.LIBS || {}).length}</div></div>
        </div>
        <div class="toolbar" style="margin-bottom:10px">
          <div class="input-icon">${icon('search')}<input class="input" id="lb-q" placeholder="Rechercher : BME280, relais, 0x3C, humidité, MQTT…" value="${esc(f.q)}" autocomplete="off"></div>
          <div class="seg" id="lb-kind">${[['all', 'Tout'], ['module', 'Capteurs'], ['recipe', 'Projets'], ['classic', 'Classiques']].map(([k, n]) => `<button data-v="${k}" class="${f.kind === k ? 'on' : ''}">${n}</button>`).join('')}</div>
          <select class="select sm" id="lb-board" style="width:auto"><option value="all">Toutes cartes</option>${Object.keys(LAB.BOARDS).map((b) => `<option value="${b}" ${f.board === b ? 'selected' : ''}>${BOARD_LABEL[b]}</option>`).join('')}</select>
          <select class="select sm" id="lb-sort" style="width:auto"><option value="cat" ${f.sort === 'cat' ? 'selected' : ''}>Par catégorie</option><option value="az" ${f.sort === 'az' ? 'selected' : ''}>A → Z</option><option value="easy" ${f.sort === 'easy' ? 'selected' : ''}>Plus faciles d'abord</option></select>
          <button class="chip ${f.fav ? 'on' : ''}" id="lb-fav">${icon('star')}Favoris</button>
        </div>
        <div class="chips scroll" id="lb-cats" style="margin-bottom:16px"><button class="chip ${f.cat === 'all' ? 'on' : ''}" data-c="all">Toutes <span class="count">${all.length}</span></button>${Object.keys(LAB.CATS || {}).filter((c) => cats[c]).map((c) => `<button class="chip ${f.cat === c ? 'on' : ''}" data-c="${c}">${icon(cat(c).icon)}${esc(cat(c).name)} <span class="count">${cats[c]}</span></button>`).join('')}</div>
        <div class="small muted" id="lb-count" style="margin-bottom:10px"></div>
        <div class="grid g-auto" id="lb-grid"></div>
        <div style="text-align:center;margin-top:16px"><button class="btn" id="lb-more" hidden>Afficher plus</button></div>`;
      let limit = 60;
      const save = () => store.set('lib.filter', { cat: f.cat, kind: f.kind, board: f.board, fav: f.fav, sort: f.sort });
      const draw = () => {
        const favs = new Set(store.get('favs', []));
        const words = norm(f.q).split(/\s+/).filter(Boolean);
        let list = all.filter((p) => (f.cat === 'all' || p.cat === f.cat) && (f.kind === 'all' || p.kind === f.kind) && (f.board === 'all' || p.boards.includes(f.board)) && (!f.fav || favs.has(p.id)) && words.every((w) => p._s.includes(w)));
        const catOrder = Object.keys(LAB.CATS || {});
        if (f.sort === 'az') list = list.slice().sort((a, b) => a.title.localeCompare(b.title, 'fr'));
        else if (f.sort === 'easy') list = list.slice().sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title, 'fr'));
        else list = list.slice().sort((a, b) => catOrder.indexOf(a.cat) - catOrder.indexOf(b.cat));
        $('#lb-count', el).textContent = `${list.length} projet(s)`;
        $('#lb-grid', el).innerHTML = list.slice(0, limit).map((p) => `<button class="card proj-card" data-open="${esc(p.id)}">
            <div class="row"><div class="icon-tile ${p.kind === 'recipe' ? 'violet' : p.kind === 'classic' ? 'info' : 'accent'}">${icon(cat(p.cat).icon)}</div><div class="grow" style="min-width:0"><h3 class="ellipsis">${esc(p.title)}</h3><div class="tiny muted ellipsis">${esc(cat(p.cat).name)}</div></div>${favs.has(p.id) ? `<span class="fav on">${icon('star')}</span>` : ''}</div>
            <div class="desc">${esc(p.desc || '')}</div>
            <div class="meta">${stars(p.difficulty)}${p.mod && p.mod.bus ? `<span class="badge info">${esc(p.mod.bus.toUpperCase())}</span>` : ''}${p.kind === 'recipe' ? `<span class="badge accent">${p.spec.modules.length} modules</span>` : ''}${p.kind === 'recipe' && p.spec.rules.length ? `<span class="badge">${p.spec.rules.length} règle(s)</span>` : ''}${p.boards.map((b) => `<span class="badge outline">${BOARD_LABEL[b]}</span>`).join('')}</div>
          </button>`).join('') || `<div class="card" style="grid-column:1/-1"><div class="empty">${icon('search')}<h3>Aucun projet</h3><div class="small">Essayez un autre mot-clé ou retirez un filtre.</div></div></div>`;
        $('#lb-more', el).hidden = list.length <= limit;
      };
      const dq = A.debounce(() => { limit = 60; draw(); }, 120);
      $('#lb-q', el).addEventListener('input', (e) => { f.q = e.target.value; dq(); });
      $('#lb-kind', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; f.kind = b.dataset.v; $$('#lb-kind button', el).forEach((x) => x.classList.toggle('on', x === b)); limit = 60; save(); draw(); });
      $('#lb-board', el).addEventListener('change', (e) => { f.board = e.target.value; save(); draw(); });
      $('#lb-sort', el).addEventListener('change', (e) => { f.sort = e.target.value; save(); draw(); });
      $('#lb-fav', el).addEventListener('click', (e) => { f.fav = !f.fav; e.currentTarget.classList.toggle('on', f.fav); save(); draw(); });
      $('#lb-cats', el).addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; f.cat = b.dataset.c; $$('#lb-cats .chip', el).forEach((x) => x.classList.toggle('on', x === b)); limit = 60; save(); draw(); });
      $('#lb-grid', el).addEventListener('click', (e) => { const c = e.target.closest('[data-open]'); if (c) openProject(c.dataset.open); });
      $('#lb-more', el).addEventListener('click', () => { limit += 60; draw(); });
      const onFav = () => draw();
      document.addEventListener('lab:favs', onFav);
      draw();
      if (q && q.p) setTimeout(() => openProject(q.p), 30);
      return () => document.removeEventListener('lab:favs', onFav);
    }
  });
  A.actions['lib-random'] = () => { const all = projects(); openProject(all[Math.floor(Math.random() * all.length)].id); };
})();
/* ---- 35_studio.js ---- */
/* Studio : assemblage de modules + automatismes → programme Arduino complet, câblage, brochage, consommation. */
(function () {
  'use strict';
  const A = window.APP, LAB = window.LAB;
  const { $, $$, esc, icon, toast, modal, confirmBox, drawer, store, download, copyText, norm, fmtNum, S } = A;

  const BOARD_LABEL = { esp32: 'ESP32', esp32s3: 'ESP32-S3', esp32c3: 'ESP32-C3' };
  const OPS = [['<', 'est inférieur à'], ['>', 'est supérieur à'], ['<=', '≤'], ['>=', '≥'], ['==', 'est égal à'], ['!=', 'est différent de'], ['map', 'pilote proportionnellement']];
  const blank = () => ({ board: 'esp32', title: 'Mon projet ESP32', description: '', modules: [], rules: [], vars: [], options: { web: false, master: false, mqtt: false } });
  let spec = null;
  let tab = 'code';
  let open = -1;

  const b64e = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64d = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  function saveSpec() { store.set('studio.spec', spec); }
  function loadSpec() { spec = store.get('studio.spec', null) || blank(); spec.rules = spec.rules || []; spec.vars = spec.vars || []; spec.options = spec.options || {}; }
  A.openInStudio = (s, initialTab) => { spec = JSON.parse(JSON.stringify(s)); spec.rules = spec.rules || []; spec.vars = spec.vars || []; spec.options = spec.options || {}; tab = ['code', 'wiring', 'pins', 'power', 'bom', 'app'].includes(initialTab) ? initialTab : 'code'; saveSpec(); open = -1; if (S.route === 'studio') draw(); else A.go('studio'); };

  const modOf = (m) => LAB.module(typeof m === 'string' ? m : m.id);
  const labelOf = (i) => { const m = spec.modules[i], mod = modOf(m); return `${i + 1}. ${m.alias || (mod ? mod.name : m.id)}`; };

  /* ---------- Sélecteur de module ---------- */
  function pickModule() {
    const cats = LAB.CATS || {};
    let c = 'all', q = '';
    const d = drawer('Ajouter un module', `<div class="input-icon" style="margin-bottom:10px">${icon('search')}<input class="input" id="pk-q" placeholder="Nom, grandeur mesurée, bus, adresse…" autocomplete="off"></div>
      <div class="chips scroll" id="pk-c" style="margin-bottom:12px"><button class="chip on" data-c="all">Tous</button>${Object.keys(cats).filter((k) => LAB.MODULES.some((m) => m.cat === k)).map((k) => `<button class="chip" data-c="${k}">${icon(cats[k].icon)}${esc(cats[k].name)}</button>`).join('')}</div>
      <div class="pick-list" id="pk-l" style="max-height:none"></div>`);
    const drawList = () => {
      const w = norm(q).split(/\s+/).filter(Boolean);
      const list = LAB.MODULES.filter((m) => (c === 'all' || m.cat === c) && w.every((x) => norm([m.id, m.name, m.desc, (m.tags || []).join(' '), (m.addr || []).join(' '), m.bus || ''].join(' ')).includes(x)));
      if (w.length) list.sort((a, b) => Number(w.every((x) => norm(b.name + ' ' + b.id).includes(x))) - Number(w.every((x) => norm(a.name + ' ' + a.id).includes(x))));
      $('#pk-l', d.el).innerHTML = list.map((m) => `<div class="pick-item" data-id="${m.id}"><div class="icon-tile ${m.act ? 'violet' : 'accent'}">${icon((cats[m.cat] || {}).icon || 'box')}</div><div class="grow" style="min-width:0"><div style="font-weight:600">${esc(m.name)} ${m.act ? '<span class="badge accent">actionneur</span>' : ''}${m.bus ? ` <span class="badge info">${m.bus.toUpperCase()}</span>` : ''}</div><div class="small muted ellipsis">${esc(m.desc || '')}</div></div>${icon('plus')}</div>`).join('') || '<div class="empty small">Aucun module</div>';
    };
    $('#pk-q', d.el).addEventListener('input', (e) => { q = e.target.value; drawList(); });
    $('#pk-c', d.el).addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; c = b.dataset.c; $$('#pk-c .chip', d.el).forEach((x) => x.classList.toggle('on', x === b)); drawList(); });
    $('#pk-l', d.el).addEventListener('click', (e) => {
      const it = e.target.closest('[data-id]');
      if (!it) return;
      spec.modules.push({ id: it.dataset.id });
      open = spec.modules.length - 1;
      saveSpec();
      toast(LAB.module(it.dataset.id).name + ' ajouté', 'ok', 1600);
      d.close();
      draw();   // redessine le Studio
    });
    drawList();
    setTimeout(() => $('#pk-q', d.el).focus(), 60);
  }

  /* ---------- Variables liées aux capteurs ---------- */
  const varName = (v) => LAB.sanitize(v.name || 'var');
  function varsHtml() {
    const outs = sensorOuts();
    return (spec.vars.length ? spec.vars.map((v, i) => {
      const src = v.from && v.from.m != null ? `${v.from.m}:${v.from.out}` : '';
      return `<div class="rule var-row"><div class="row between"><code class="small">v_${esc(varName(v))}</code><button class="btn sm icon ghost" data-var-del="${i}" aria-label="Supprimer">${icon('trash')}</button></div>
        <div class="rule-line"><span class="rule-kw">Nom</span><input class="input sm" data-v="${i}" data-vf="name" value="${esc(v.name || '')}" placeholder="consigne" maxlength="24"><input class="input sm" data-v="${i}" data-vf="unit" value="${esc(v.unit || '')}" placeholder="unité" style="max-width:80px"></div>
        <div class="rule-line"><span class="rule-kw">Lié à</span><select class="select sm" data-v="${i}" data-vf="src"><option value="">(aucun : valeur réglable)</option>${outs.map((o) => `<option value="${o.m}:${o.k}" ${src === o.m + ':' + o.k ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>
        ${src ? `<div class="rule-line"><span class="rule-kw">Calcul</span><span class="small">mesure ×</span><input class="input sm" type="number" step="any" data-v="${i}" data-vf="k" value="${esc(v.k != null ? v.k : 1)}" style="max-width:90px"><span class="small">+</span><input class="input sm" type="number" step="any" data-v="${i}" data-vf="b" value="${esc(v.b || 0)}" style="max-width:90px"></div>`
          : `<div class="rule-line"><span class="rule-kw">Départ</span><input class="input sm" type="number" step="any" data-v="${i}" data-vf="init" value="${esc(v.init || 0)}" style="max-width:110px"></div>`}
        <label class="switch small"><input type="checkbox" data-v="${i}" data-vf="app" ${v.app ? 'checked' : ''}><span class="track"></span>Réglable depuis l'application (APK / page web)</label>
      </div>`;
    }).join('') : `<div class="small muted">Une variable garde une valeur dans le programme. Liée à un capteur, elle suit sa mesure (avec conversion, ex. × 1,8 + 32 pour des °F). Libre, elle sert de consigne réglable par l'application et de seuil dans les automatismes.</div>`) +
      `<button class="btn sm" data-var-add>${icon('plus')}Ajouter une variable</button>`;
  }
  function addVar() {
    const outs = sensorOuts();
    const used = new Set(spec.vars.map(varName));
    let n = outs.length && !spec.vars.length ? LAB.sanitize(outs[0].k) : 'consigne';
    for (let k = 2; used.has(n); k++) n = (outs.length && !spec.vars.length ? LAB.sanitize(outs[0].k) : 'consigne') + k;
    spec.vars.push(outs.length && !spec.vars.length ? { name: n, from: { m: outs[0].m, out: outs[0].k }, k: 1, b: 0 } : { name: n, init: 0, app: true });
  }
  function setVarField(i, f, v, checked) {
    const x = spec.vars[i];
    if (!x) return;
    if (f === 'name') {
      const old = varName(x);
      x.name = v.trim();
      const now = varName(x);
      spec.rules.forEach((r) => { if (r.if.var && LAB.sanitize(r.if.var) === old) r.if.var = now; if (r.if.vv && LAB.sanitize(r.if.vv) === old) r.if.vv = now; });
    } else if (f === 'src') {
      if (!v) delete x.from;
      else { const [m, k] = v.split(':'); x.from = { m: Number(m), out: k }; x.k = x.k == null ? 1 : x.k; x.b = x.b || 0; }
    } else if (f === 'app') x.app = !!checked;
    else if (f === 'unit') x.unit = v;
    else x[f] = v === '' ? 0 : Number(v);
  }

  /* ---------- Règles ---------- */
  function sensorOuts() {
    const r = [];
    spec.modules.forEach((m, i) => { const mod = modOf(m); (mod && mod.outs || []).forEach((o) => r.push({ m: i, k: o.k, label: `${labelOf(i)} › ${o.l || o.k}${o.u ? ' (' + o.u + ')' : ''}` })); });
    return r;
  }
  const actuators = () => spec.modules.map((m, i) => ({ i, mod: modOf(m) })).filter((x) => x.mod && x.mod.act);
  function actSelect(t, kind, idx) {
    const acts = actuators();
    const mod = t && acts.find((a) => a.i === t.m);
    const actOpts = mod ? Object.keys(mod.mod.act).filter((k) => mod.mod.act[k]) : ['on', 'off'];
    const names = { on: 'allumer / activer', off: 'éteindre / arrêter', toggle: 'inverser', set: 'régler à' };
    return `<select class="select sm" data-r="${idx}" data-f="${kind}.m"><option value="">${kind === 'else' ? '(rien)' : 'actionneur…'}</option>${acts.map((a) => `<option value="${a.i}" ${t && t.m === a.i ? 'selected' : ''}>${esc(labelOf(a.i))}</option>`).join('')}</select>
      ${t && t.m != null && t.m !== '' ? `<select class="select sm" data-r="${idx}" data-f="${kind}.act">${actOpts.map((k) => `<option value="${k}" ${t.act === k ? 'selected' : ''}>${names[k] || k}</option>`).join('')}</select>${t.act === 'set' && mod && mod.mod.act.set ? `<input class="input sm" type="number" step="any" data-r="${idx}" data-f="${kind}.v" value="${esc(t.v != null ? t.v : mod.mod.act.set.max)}" style="max-width:110px" title="${esc(mod.mod.act.set.unit || '')}"><span class="small muted">${esc(mod.mod.act.set.unit || '')}</span>` : ''}` : ''}`;
  }
  function ruleSources() {
    return sensorOuts().map((o) => ({ value: `${o.m}:${o.k}`, label: o.label }))
      .concat(spec.vars.map((v) => ({ value: 'var:' + varName(v), label: `Variable ${varName(v)}${v.unit ? ' (' + v.unit + ')' : ''}` })));
  }
  const ruleSrc = (r) => (r.if.every != null ? 'every' : r.if.var ? 'var:' + LAB.sanitize(r.if.var) : `${r.if.m}:${r.if.out}`);
  /* Ajouts en un clic : ce qui agit (actionneurs) et ce qui déclenche (capteurs). */
  const QUICK_ACT = [['led', 'LED'], ['relay', 'Relais'], ['buzzer_active', 'Buzzer'], ['servo_sg90', 'Servo'], ['pump', 'Pompe'], ['fan_pwm', 'Ventilateur'], ['l298n', 'Moteur CC'], ['rgb_led', 'LED RVB']];
  const QUICK_SENS = [['dht22', 'Température / humidité'], ['button', 'Bouton'], ['ldr', 'Lumière'], ['hcsr04', 'Distance'], ['pir_hcsr501', 'Mouvement'], ['soil_cap', 'Humidité du sol'], ['potentiometer', 'Potentiomètre']];
  const quickChips = (list) => `<div class="chips">${list.filter(([id]) => LAB.module(id)).map(([id, n]) => `<button class="chip" data-quick="${id}">${icon('plus')}${esc(n)}</button>`).join('')}<button class="chip" data-act="st-add">${icon('search')}Autre…</button></div>`;
  const ACT_WORD = { on: 'allumer', off: 'éteindre', toggle: 'inverser', set: 'régler à' };
  function ruleSentence(r) {
    const a = (t) => (t && t.m != null && spec.modules[t.m] ? `${ACT_WORD[t.act] || t.act}${t.act === 'set' && t.v != null ? ' ' + t.v : ''} ${labelOf(t.m).replace(/^\d+\. /, '')}` : '');
    if (r.if.every != null) return `Toutes les ${r.if.every} s : ${a(r.then)}${r.else ? ', puis ' + a(r.else) + ' (en alternance)' : ''}.`;
    const src = (ruleSources().find((o) => o.value === ruleSrc(r)) || {}).label || '?';
    if (r.if.op === 'map') return `${labelOf(r.then.m).replace(/^\d+\. /, '')} suit ${src}.`;
    const op = (OPS.find(([k]) => k === r.if.op) || [0, r.if.op])[1];
    return `Si ${src} ${op} ${r.if.vv ? 'la variable ' + r.if.vv : r.if.v} alors ${a(r.then)}${r.else ? ', sinon ' + a(r.else) : ''}.`;
  }
  function rulesHtml() {
    const outs = ruleSources(), acts = actuators();
    const head = [];
    if (!acts.length) head.push(`<div class="studio-quick"><div class="small"><b>1. Ce qui agit</b> : choisis un actionneur à commander.</div>${quickChips(QUICK_ACT)}</div>`);
    if (!outs.length) head.push(`<div class="studio-quick"><div class="small"><b>${acts.length ? '' : '2. '}Ce qui déclenche</b> : un capteur ou une variable${acts.length ? ' ; sans capteur, « Clignoter / répéter » crée une minuterie' : ''}.</div>${quickChips(QUICK_SENS)}</div>`);
    if (!acts.length) return head.join('') + `<div class="hint">Exemples : « si la température &gt; 28 °C alors allumer le ventilateur, sinon l'éteindre », « toutes les 1 s, inverser la LED ».</div>`;
    const srcOpts = (r) => `<option value="every" ${ruleSrc(r) === 'every' ? 'selected' : ''}>Minuterie (toutes les N secondes)</option>${outs.map((o) => `<option value="${esc(o.value)}" ${ruleSrc(r) === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}`;
    return head.join('') + spec.rules.map((r, idx) => {
      const isMap = r.if.op === 'map', isEvery = r.if.every != null;
      const dst = acts.find((a) => a.i === r.then.m);
      return `<div class="rule"><div class="row between"><b class="small">Règle ${idx + 1}</b><button class="btn sm icon ghost" data-rule-del="${idx}" aria-label="Supprimer">${icon('trash')}</button></div>
        <div class="rule-sum small">${esc(ruleSentence(r))}</div>
        <div class="rule-line"><span class="rule-kw">${isEvery ? 'Quand' : 'Si'}</span><select class="select sm" data-r="${idx}" data-f="src">${srcOpts(r)}</select></div>
        ${isEvery ? `<div class="rule-line"><span class="rule-kw"></span><span class="small">toutes les</span><input class="input sm" type="number" step="0.1" min="0.2" data-r="${idx}" data-f="every" value="${esc(r.if.every)}" style="max-width:90px"><span class="small">s</span></div>
          <div class="rule-line"><span class="rule-kw">Faire</span>${actSelect(r.then, 'then', idx)}</div><div class="rule-line"><span class="rule-kw">Puis</span>${actSelect(r.else, 'else', idx)}</div>
          <div class="hint">Avec « Puis », les deux actions alternent (ex. allumer / éteindre = clignoter).</div>`
        : `<div class="rule-line"><span class="rule-kw"></span><select class="select sm" data-r="${idx}" data-f="op">${OPS.filter(([k]) => k !== 'map' || acts.some((a) => a.mod.act.set)).map(([k, n]) => `<option value="${k}" ${r.if.op === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
          ${isMap ? `<input class="input sm" type="number" step="any" data-r="${idx}" data-f="in0" value="${esc((r.if.in || [0, 100])[0])}" title="début de plage"><span class="small">→</span><input class="input sm" type="number" step="any" data-r="${idx}" data-f="in1" value="${esc((r.if.in || [0, 100])[1])}" title="fin de plage">`
            : `${spec.vars.length ? `<select class="select sm" data-r="${idx}" data-f="vv" title="seuil fixe ou variable" style="max-width:150px"><option value="">valeur</option>${spec.vars.map((v) => `<option value="${esc(varName(v))}" ${r.if.vv && LAB.sanitize(r.if.vv) === varName(v) ? 'selected' : ''}>variable ${esc(varName(v))}</option>`).join('')}</select>` : ''}${r.if.vv ? '' : `<input class="input sm" type="number" step="any" data-r="${idx}" data-f="v" value="${esc(r.if.v)}" title="seuil">`}<input class="input sm" type="number" step="any" min="0" data-r="${idx}" data-f="hyst" value="${esc(r.if.hyst || 0)}" title="hystérésis (évite les oscillations)" style="max-width:90px">`}</div>
        ${isMap ? `<div class="rule-line"><span class="rule-kw">Alors</span><select class="select sm" data-r="${idx}" data-f="then.m">${acts.filter((a) => a.mod.act.set).map((a) => `<option value="${a.i}" ${r.then.m === a.i ? 'selected' : ''}>${esc(labelOf(a.i))}</option>`).join('')}</select></div>
          <div class="rule-line"><span class="rule-kw"></span><span class="small">de</span><input class="input sm" type="number" step="any" data-r="${idx}" data-f="out0" value="${esc((r.then.out || [0, 100])[0])}"><span class="small">à</span><input class="input sm" type="number" step="any" data-r="${idx}" data-f="out1" value="${esc((r.then.out || [0, 100])[1])}"><span class="small muted">${esc(dst && dst.mod.act.set ? dst.mod.act.set.unit : '')}</span></div>`
          : `<div class="rule-line"><span class="rule-kw">Alors</span>${actSelect(r.then, 'then', idx)}</div><div class="rule-line"><span class="rule-kw">Sinon</span>${actSelect(r.else, 'else', idx)}</div>`}
        ${!isMap ? `<div class="hint">Hystérésis ${fmtNum(r.if.hyst || 0, 2)} : la règle bascule à ${esc(r.if.vv ? 'la variable ' + r.if.vv : r.if.v)} et revient à ${r.if.op && r.if.op.includes('<') ? '+' : '−'}${fmtNum(r.if.hyst || 0, 2)} au-delà.</div>` : '<div class="hint">La consigne suit la mesure linéairement (bornée aux extrémités).</div>'}`}
      </div>`;
    }).join('') + (spec.rules.length ? '' : `<div class="small muted">Aucune règle pour l'instant. « Nouvelle règle » crée ${outs.length ? '« si mesure &gt; seuil alors allumer, sinon éteindre »' : 'un clignotement toutes les 1 s'}, modifiable ensuite.</div>`)
      + `<div class="row wrap"><button class="btn sm primary" data-rule-add>${icon('plus')}Nouvelle règle</button><button class="btn sm" data-rule-add="every">${icon('clock')}Clignoter / répéter</button></div>`;
  }
  function addRule(kind) {
    const outs = ruleSources(), acts = actuators();
    if (!acts.length) return;
    const a = acts[0], hasOn = !!a.mod.act.on;
    if (kind === 'every' || !outs.length) {
      spec.rules.push({ if: { every: 1 }, then: { m: a.i, act: hasOn ? 'on' : 'set', v: hasOn ? undefined : a.mod.act.set.max }, else: { m: a.i, act: hasOn ? 'off' : 'set', v: hasOn ? undefined : a.mod.act.set.min } });
      return;
    }
    const r = { if: { op: '>', v: 25, hyst: 0.5 }, then: { m: a.i, act: 'on' } };
    setRuleField(r, 'src', outs[0].value);
    spec.rules.push(Object.assign(r, { then: { m: a.i, act: 'on' }, else: { m: a.i, act: 'off' } }));
  }
  function setRuleField(r, f, v) {
    if (f === 'src') {
      if (v === 'every') { r.if = { every: 1 }; if (r.then.act === 'set' && r.then.out) { r.then = { m: r.then.m, act: 'on' }; r.else = { m: r.then.m, act: 'off' }; } return; }
      if (r.if.every != null) r.if = { op: '>', v: 25, hyst: 0.5 };
      if (v.startsWith('var:')) { r.if.var = v.slice(4); delete r.if.m; delete r.if.out; }
      else { const [m, k] = v.split(':'); r.if.m = Number(m); r.if.out = k; delete r.if.var; }
    }
    else if (f === 'vv') { if (v) r.if.vv = v; else delete r.if.vv; }
    else if (f === 'op') {
      r.if.op = v;
      if (v === 'map') { const a = actuators().find((x) => x.mod.act.set); r.if.in = r.if.in || [0, 100]; r.then = { m: a ? a.i : r.then.m, act: 'set', out: a ? [a.mod.act.set.min, a.mod.act.set.max] : [0, 100] }; delete r.else; }
      else if (!r.else && r.then.act === 'set' && r.then.out) { r.then = { m: r.then.m, act: 'on' }; r.else = { m: r.then.m, act: 'off' }; }
    }
    else if (f === 'every') r.if.every = Math.max(0.2, Number(v) || 1);
    else if (f === 'v' || f === 'hyst') r.if[f] = v === '' ? 0 : Number(v);
    else if (f === 'in0' || f === 'in1') { r.if.in = r.if.in || [0, 100]; r.if.in[f === 'in0' ? 0 : 1] = Number(v); }
    else if (f === 'out0' || f === 'out1') { r.then.out = r.then.out || [0, 100]; r.then.out[f === 'out0' ? 0 : 1] = Number(v); }
    else if (f === 'then.m' && r.if.op === 'map') r.then.m = Number(v);
    else {
      const [kind, key] = f.split('.');
      if (key === 'm') {
        if (v === '') { if (kind === 'else') delete r.else; return; }
        const mod = modOf(spec.modules[Number(v)]);
        r[kind] = { m: Number(v), act: mod && mod.act.on ? (kind === 'else' ? 'off' : 'on') : 'set' };
      } else if (key === 'act') { r[kind] = r[kind] || {}; r[kind].act = v; if (v === 'set' && r[kind].v == null) { const mod = modOf(spec.modules[r[kind].m]); r[kind].v = mod && mod.act.set ? mod.act.set.max : 0; } }
      else if (key === 'v') r[kind].v = Number(v);
    }
  }
  /* Renumérote les règles après suppression / déplacement d'un module. */
  function remapRules(mapFn) {
    spec.vars.forEach((v) => { if (v.from) { const m = mapFn(v.from.m); if (m < 0) delete v.from; else v.from.m = m; } });
    spec.rules = spec.rules.map((r) => {
      const a = r.if.var || r.if.every != null ? 0 : mapFn(r.if.m), b = mapFn(r.then.m);
      if (a < 0 || b < 0) return null;
      if (!r.if.var && r.if.every == null) r.if.m = a;
      r.then.m = b;
      if (r.else) { const c = mapFn(r.else.m); if (c < 0) delete r.else; else r.else.m = c; }
      return r;
    }).filter(Boolean);
  }

  /* ---------- Page ---------- */
  A.page({
    id: 'studio', title: 'Studio', icon: 'wand', group: 'build', mobile: true,
    desc: 'Assemblez capteurs et actionneurs, le code s\'écrit tout seul',
    render(el, q) {
      if (!LAB.generate) { el.innerHTML = `<div class="banner warn">${icon('alert')}<div>Générateur non chargé (catalog.js).</div></div>`; return; }
      if (q && q.s) { try { spec = JSON.parse(b64d(q.s)); saveSpec(); toast('Projet partagé chargé', 'ok'); history.replaceState(null, '', '#studio'); } catch (e) { toast('Lien de partage invalide', 'bad'); } }
      if (!spec) loadSpec();
      if (S.state && S.state.master && !spec.options.wifi_ssid) spec.options.wifi_ssid = S.state.master.ap_ssid;
      A.setTopActions(`<button class="btn" data-act="st-new">${icon('plus')}<span class="lbl">Nouveau</span></button><button class="btn" data-act="st-template">${icon('star')}<span class="lbl">Modèles</span></button><button class="btn" data-act="st-save-project">${icon('save')}<span class="lbl">Enregistrer le projet</span></button><button class="btn" data-act="st-share">${icon('share')}<span class="lbl">Partager</span></button>`);
      el.innerHTML = '<div id="st-root"></div>';
      bind(el);
      draw();
    }
  });

  /* Redessine le Studio sans perdre le défilement ni le champ en cours de saisie. */
  function draw() {
      const root = $('#st-root');
      if (!root) return;
      const a = document.activeElement;
      let sel = null, caret = null;
      if (a && root.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) {
        sel = (a.id ? '#' + a.id : '') + Object.entries(a.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}="${String(v).replace(/"/g, '\\"')}"]`).join('');
        try { caret = [a.selectionStart, a.selectionEnd]; } catch (e) { caret = null; }
      }
      const side = $('.studio-side', root), sy = side ? side.scrollTop : 0, wy = window.scrollY;
      let res = null, err = null;
      try { res = LAB.generate(spec); } catch (e) { err = e.message; }
      const B = LAB.BOARDS[spec.board] || LAB.BOARDS.esp32;
      const o = spec.options;
      root.innerHTML = `<div class="studio">
        <div class="studio-side">
          <div class="card"><div class="card-h"><h2 class="grow">Projet</h2></div><div class="card-b stack" style="gap:12px">
            <div class="field"><label>Nom</label><input class="input" data-s="title" value="${esc(spec.title)}" maxlength="80"></div>
            <div class="field"><label>Carte</label><div class="seg" style="width:100%">${Object.keys(LAB.BOARDS).map((b) => `<button class="grow ${spec.board === b ? 'on' : ''}" data-board="${b}">${BOARD_LABEL[b]}</button>`).join('')}</div><div class="hint">${esc(B.name)} — le code et le brochage s'adaptent automatiquement.</div></div>
            <div class="field"><label>Description (en tête du code)</label><textarea class="textarea" data-s="description" rows="2" style="min-height:56px">${esc(spec.description || '')}</textarea></div>
          </div></div>
          <div class="card"><div class="card-h"><div class="grow"><h2>Modules <span class="badge">${spec.modules.length}</span></h2></div><button class="btn sm primary" data-act="st-add">${icon('plus')}Ajouter</button></div><div class="card-b stack" style="gap:8px">
            ${spec.modules.length ? spec.modules.map((m, i) => {
              const mod = modOf(m);
              if (!mod) return `<div class="banner warn">${icon('alert')}<div>Module inconnu : ${esc(m.id)} <button class="btn sm" data-mdel="${i}">Retirer</button></div></div>`;
              const params = Object.entries(mod.params || {});
              const pins = res && res.instances && res.instances[i] ? res.wiring.filter((w) => w.mod === res.instances[i].label && /GPIO/.test(w.to)) : [];
              return `<div class="mod-row"><div class="mod-row-h" data-mopen="${i}"><div class="icon-tile ${mod.act ? 'violet' : 'accent'}" style="width:30px;height:30px">${icon(((LAB.CATS || {})[mod.cat] || {}).icon || 'box')}</div><div class="grow" style="min-width:0"><div style="font-weight:600" class="ellipsis">${esc(labelOf(i))}</div><div class="tiny muted ellipsis">${esc(mod.name)}${pins.length ? ' · ' + pins.map((w) => w.pin + '→' + w.to.replace('GPIO', '')).join(', ') : ''}</div></div>
                <button class="btn sm icon ghost" data-mup="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Monter">${icon('back').replace('<svg', '<svg style="transform:rotate(90deg)"')}</button><button class="btn sm icon ghost" data-mdel="${i}" aria-label="Retirer">${icon('x')}</button></div>
                ${open === i ? `<div class="mod-row-b"><div class="field"><label>Nom court (variables et mesures publiées)</label><input class="input sm" data-malias="${i}" value="${esc(m.alias || '')}" placeholder="${esc(mod.key || mod.id)}"></div>
                  ${params.map(([k, p]) => `<div class="field"><label>${esc(p.label || k)}</label>${p.opts ? `<select class="select sm" data-mparam="${i}" data-k="${k}">${p.opts.map((v) => `<option ${String((m.params || {})[k] != null ? m.params[k] : p.def) === String(v) ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>` : `<input class="input sm" data-mparam="${i}" data-k="${k}" value="${esc((m.params || {})[k] != null ? m.params[k] : p.def)}">`}</div>`).join('')}
                  <div class="small muted">${esc(mod.desc || '')}</div>${(mod.notes || []).length ? `<ul class="small" style="margin:0;padding-left:18px;color:var(--text-2)">${mod.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div>` : ''}</div>`;
            }).join('') : `<div class="empty" style="padding:18px">${icon('box')}<div class="small">Ajoutez des capteurs, afficheurs et actionneurs.<br>Les broches sont choisies automatiquement, sans conflit.</div></div>`}
          </div></div>
          <div class="card studio-rules"><div class="card-h"><div class="grow"><h2>Conditions et actions <span class="badge">${spec.rules.length}</span></h2><div class="card-sub">si… alors… sinon… · minuteries</div></div>${actuators().length ? `<button class="btn sm primary" data-rule-add>${icon('plus')}Nouvelle règle</button>` : ''}</div><div class="card-b stack" style="gap:10px" id="st-rules">${rulesHtml()}</div></div>
          <div class="card"><div class="card-h"><h2 class="grow">Variables <span class="badge">${spec.vars.length}</span></h2></div><div class="card-b stack" style="gap:10px" id="st-vars">${varsHtml()}</div></div>
          <div class="card"><div class="card-h"><h2 class="grow">Connectivité</h2></div><div class="card-b stack" style="gap:12px">
            <label class="switch"><input type="checkbox" data-opt="web" ${o.web || o.app ? 'checked' : ''} ${o.app ? 'disabled' : ''}><span class="track"></span>Page web locale (mesures + commandes)</label>
            <label class="switch"><input type="checkbox" data-opt="app" ${o.app ? 'checked' : ''}><span class="track"></span>Pilotage par application (APK, page web : actionneurs et variables)</label>
            <label class="switch"><input type="checkbox" data-opt="master" ${o.master ? 'checked' : ''}><span class="track"></span>Envoyer les mesures au MASTER</label>
            <label class="switch"><input type="checkbox" data-opt="mqtt" ${o.mqtt ? 'checked' : ''}><span class="track"></span>Publier en MQTT (Home Assistant, Node-RED…)</label>
            <label class="switch"><input type="checkbox" data-opt="home" ${o.home !== false ? 'checked' : ''}><span class="track"></span>Retour au mode worker (projet chargé depuis le MASTER)</label>
            ${o.web || o.app || o.master || o.mqtt ? `<div class="form-grid"><div class="field"><label>Wi-Fi (SSID)</label><input class="input sm" data-o="wifi_ssid" value="${esc(o.wifi_ssid || 'ESP32-LAB')}"></div><div class="field"><label>Mot de passe</label><input class="input sm" data-o="wifi_pass" type="password" value="${esc(o.wifi_pass || '')}" placeholder="ESP32-LAB-Setup2026!"></div>
              <div class="field"><label>Nom de l'appareil</label><input class="input sm" data-o="device" value="${esc(o.device || '')}" placeholder="${esc(LAB.sanitize(spec.title).slice(0, 20))}"></div>${o.mqtt ? `<div class="field"><label>Serveur MQTT</label><input class="input sm" data-o="mqtt_host" value="${esc(o.mqtt_host || '192.168.4.2')}"></div>` : ''}</div>` : ''}
          </div></div>
        </div>
        <div class="stack">
          ${err ? `<div class="banner warn">${icon('alert')}<div>${esc(err)}</div></div>` : ''}
          ${res ? res.warnings.map((w) => `<div class="banner warn" style="margin:0">${icon('alert')}<div>${esc(w)}</div></div>`).join('') : ''}
          <div class="card"><div class="card-h"><div class="grow"><h2 class="ellipsis">${esc(spec.title)}</h2><div class="card-sub">${res ? `${res.code.split('\n').length} lignes · ${res.libs.length} bibliothèque(s) · ${res.power.total_mA} mA` : ''}</div></div>
            <div class="btn-group"><button class="btn sm" data-act="st-copy">${icon('copy')}<span class="hide-sm">Copier</span></button><button class="btn sm" data-act="st-ino">${icon('file')}.ino</button><button class="btn sm" data-act="st-zip">${icon('download')}.zip</button><button class="btn sm" data-act="st-sd" ${S.admin ? '' : 'disabled title="Connexion administrateur requise"'}>${icon('sd')}<span class="hide-sm">microSD</span></button><button class="btn sm primary" data-act="st-flash" title="Le Pi compile, le S3 flashe un worker et vérifie le moniteur">${icon('zap')}Flasher</button><button class="btn sm" data-act="st-apk" title="Crée l'application Android qui lit et commande ce montage">${icon('phone')}Créer l'APK</button><button class="btn sm" data-act="st-bench" title="Test matériel automatique par deux workers">${icon('target')}<span class="hide-sm">Banc</span></button></div></div>
            <div class="card-b"><div class="tabs" id="st-tabs">${[['code', 'Code'], ['wiring', 'Montage'], ['pins', 'Brochage'], ['app', 'Application'], ['power', 'Alimentation'], ['bom', 'Matériel']].map(([k, n]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="tab-panel">${res ? panel(res) : ''}</div></div></div>
        </div></div>`;
      A.studioResult = res;
      const side2 = $('.studio-side', root);
      if (side2) side2.scrollTop = sy;
      window.scrollTo(0, wy);
      if (sel) { const n = root.querySelector(sel); if (n) { n.focus({ preventScroll: true }); if (caret && caret[0] != null) { try { n.setSelectionRange(caret[0], caret[1]); } catch (e) { /* type sans sélection */ } } } }
  }


  function panel(res) {
    if (tab === 'code') return A.codeBlock(res.code, 'calc(100vh - 260px)');
    if (tab === 'wiring') {
      const m = LAB.montageSvg && res.wiring && res.wiring.length ? LAB.montageSvg(res, { id: projId(), title: spec.title }) : null;
      return (m ? `<div class="montage">${m.svg}</div><div class="row" style="margin:10px 0"><button class="btn sm" data-act="st-svg">${icon('download')}Schéma .svg</button></div>` : '') + A.wiringTable(res);
    }
    if (tab === 'app') return appPanel(res);
    if (tab === 'pins') return A.boardView(res.board, A.usedFromWiring(res.board, res.wiring)) + `<div class="small muted" style="margin-top:10px">${(LAB.BOARDS[res.board].notes || []).map(esc).join('<br>')}</div>`;
    if (tab === 'power') {
      const rows = spec.modules.map((m, i) => { const mod = modOf(m); return mod ? [labelOf(i), mod.vcc || '3V3', mod.mA || 1, mod.peak_mA || mod.mA || 1] : null; }).filter(Boolean);
      const cap = store.get('studio.batt', 2000);
      const sleep = store.get('studio.sleep', 0);
      const avg = sleep ? (res.power.total_mA * (60 - sleep) + 0.15 * sleep) / 60 : res.power.total_mA;
      const hours = (cap * 0.8) / Math.max(0.01, avg);
      return `<div class="grid g-2"><div class="card"><div class="table-wrap"><table class="tbl"><thead><tr><th>Élément</th><th>Alim.</th><th>Moyen</th><th>Pointe</th></tr></thead><tbody>
          <tr><td>Carte ${esc(BOARD_LABEL[res.board])}${spec.options.web || spec.options.master || spec.options.mqtt ? ' + Wi-Fi' : ''}</td><td>3V3</td><td class="num">${res.power.board_mA} mA</td><td class="num">${res.power.total_peak_mA - res.power.modules_peak_mA} mA</td></tr>
          ${rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="num">${fmtNum(r[2])} mA</td><td class="num">${fmtNum(r[3])} mA</td></tr>`).join('')}
          <tr><td><b>Total</b></td><td></td><td class="num"><b>${fmtNum(res.power.total_mA)} mA</b></td><td class="num"><b>${fmtNum(res.power.total_peak_mA)} mA</b></td></tr></tbody></table></div></div>
        <div class="card pad stack" style="gap:12px"><h3>Autonomie sur batterie</h3>
          <div class="field"><label>Capacité (mAh)</label><input class="input" type="number" min="100" step="100" id="pw-cap" value="${cap}"></div>
          <div class="field"><label>Minutes de sommeil profond par heure : <b id="pw-sv">${sleep}</b></label><input type="range" id="pw-sleep" min="0" max="59" value="${sleep}"><div class="hint">Deep-sleep ≈ 0,15 mA sur un module nu (plus sur une carte de développement à régulateur AMS1117).</div></div>
          <div><div class="calc-out">${hours >= 48 ? fmtNum(hours / 24, 1) + ' jours' : fmtNum(hours, 1) + ' heures'}</div><div class="small muted">Consommation moyenne ${fmtNum(avg, 1)} mA, 80 % de capacité utile.</div></div>
          <div class="small">${res.power.total_peak_mA > 450 ? `<span class="badge warn">Alimentation 5 V ≥ 1 A recommandée</span>` : `<span class="badge ok">Un port USB suffit</span>`}</div></div></div>`;
    }
    const mods = spec.modules.map((m) => modOf(m)).filter(Boolean);
    const count = {};
    mods.forEach((m) => { count[m.name] = (count[m.name] || 0) + 1; });
    return `<div class="grid g-2"><div class="card pad"><h3 style="margin-bottom:10px">Liste du matériel</h3><div class="statlist"><div><span>${esc(LAB.BOARDS[res.board].name)}</span><span class="badge">×1</span></div>${Object.entries(count).map(([n, c]) => `<div><span>${esc(n)}</span><span class="badge">×${c}</span></div>`).join('')}<div><span>Plaque d'essai + fils Dupont</span><span class="badge">×1</span></div>${mods.some((m) => /pull|tirage|4,7 kΩ|10 kΩ/.test((m.pins || []).map((p) => p.note || '').join(' '))) ? '<div><span>Résistances de tirage (4,7 kΩ / 10 kΩ)</span><span class="badge">selon câblage</span></div>' : ''}${res.power.total_peak_mA > 450 ? '<div><span>Alimentation 5 V 2 A</span><span class="badge">×1</span></div>' : ''}</div></div>
      <div class="card pad"><h3 style="margin-bottom:10px">Bibliothèques Arduino</h3>${A.libsHtml(res)}</div>
      ${res.outs.length ? `<div class="card pad span-2"><h3 style="margin-bottom:10px">Mesures publiées</h3><div class="row wrap">${res.outs.map((x) => `<span class="badge outline"><span class="mono">${esc(x.key)}</span>${x.unit ? ' · ' + esc(x.unit) : ''}</span>`).join('')}</div><p class="hint" style="margin-top:8px">Visibles dans le moniteur/traceur série${spec.options.master ? ', sur la page Capteurs du MASTER' : ''}${spec.options.web ? ', sur la page web du montage' : ''}${spec.options.mqtt ? ', et en MQTT (lab/&lt;appareil&gt;/&lt;mesure&gt;)' : ''}.</p></div>` : ''}</div>`;
  }

  /* Onglet Application : ce que l'APK peut lire et commander sur ce montage. */
  function appPanel(res) {
    const o = spec.options;
    const ctl = res.controls || [];
    const vars = res.vars || [];
    return `<div class="stack" style="gap:12px">
      ${o.app ? '' : `<div class="banner">${icon('info')}<div>Active « Pilotage par application » dans Connectivité : le montage ouvre alors <code>/api</code> (mesures et variables) et <code>/set</code> (commandes) pour l'APK et la page web.</div></div>`}
      <div class="grid g-2">
        <div class="card pad"><h3 style="margin-bottom:10px">Lu par l'application</h3><div class="statlist">${res.outs.map((x) => `<div><span>${esc(x.module === 'Variable' ? 'Variable ' + x.label : x.label + ' · ' + x.module)}</span><span class="badge outline mono">${esc(x.key)}${x.unit ? ' ' + esc(x.unit) : ''}</span></div>`).join('') || '<div><span class="muted">Aucune mesure</span></div>'}</div>
          <p class="hint" style="margin-top:8px">${o.master ? 'Via le MASTER : source « Capteur du MASTER » <code>' + esc(res.device) + '/&lt;clé&gt;</code> dans le Studio APK.' : 'Active « Envoyer les mesures au MASTER » pour les lire depuis n\'importe quelle APK du labo.'}${o.app ? ' En direct : <code>http://&lt;ip&gt;/api</code>.' : ''}</p></div>
        <div class="card pad"><h3 style="margin-bottom:10px">Commandé par l'application</h3>${o.app ? `<div class="statlist">${ctl.map((c) => `<div><span>${esc(c.var ? 'Variable ' + c.name : c.name)}</span><span class="badge outline mono">/set?${esc(c.key)}=${c.set && !c.on ? '&lt;nombre&gt;' : [c.on ? 'on' : '', c.off ? 'off' : '', c.toggle ? 'toggle' : '', c.set ? (c.set.min != null ? c.set.min + '…' + c.set.max : '&lt;n&gt;') : ''].filter(Boolean).join('|')}</span></div>`).join('') || '<div><span class="muted">Ajoute un actionneur ou une variable réglable</span></div>'}</div>
          <p class="hint" style="margin-top:8px">Les actionneurs commandés par l'application n'exécutent plus leur programme de démonstration.</p>` : '<div class="small muted">Pilotage désactivé.</div>'}</div>
      </div>
      <div class="row wrap"><button class="btn primary" data-act="st-apk">${icon('phone')}Créer l'application dans le Studio APK</button>${vars.length ? `<span class="small muted">${vars.length} variable(s) : ${vars.map((v) => `<code>${esc(v.c)}</code>`).join(', ')}</span>` : ''}</div>
    </div>`;
  }

  function bind(el) {
    const rerender = A.debounce(() => { saveSpec(); draw(); }, 300);
    el.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.s) { spec[t.dataset.s] = t.value; rerender(); }
      else if (t.dataset.o) { spec.options[t.dataset.o] = t.value; rerender(); }
      else if (t.dataset.v != null && t.type !== 'checkbox' && t.tagName !== 'SELECT') { setVarField(Number(t.dataset.v), t.dataset.vf, t.value); rerender(); }
      else if (t.dataset.malias != null) { spec.modules[Number(t.dataset.malias)].alias = t.value.trim() || undefined; rerender(); }
      else if (t.id === 'pw-cap') { store.set('studio.batt', Number(t.value) || 2000); rerender(); }
      else if (t.id === 'pw-sleep') { $('#pw-sv').textContent = t.value; store.set('studio.sleep', Number(t.value)); rerender(); }
    });
    el.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.opt) { spec.options[t.dataset.opt] = t.checked; saveSpec(); draw(); }
      else if (t.dataset.mparam != null) { const m = spec.modules[Number(t.dataset.mparam)]; m.params = m.params || {}; m.params[t.dataset.k] = t.value; saveSpec(); draw(); }
      else if (t.dataset.r != null) { setRuleField(spec.rules[Number(t.dataset.r)], t.dataset.f, t.value); saveSpec(); draw(); }
      else if (t.dataset.v != null && (t.type === 'checkbox' || t.tagName === 'SELECT')) { setVarField(Number(t.dataset.v), t.dataset.vf, t.value, t.checked); saveSpec(); draw(); }
    });
    el.addEventListener('click', (e) => {
      const t = e.target.closest('button,[data-mopen]');
      if (!t) return;
      if (t.dataset.board) { spec.board = t.dataset.board; saveSpec(); draw(); }
      else if (t.dataset.t) { tab = t.dataset.t; draw(); }
      else if (t.dataset.mdel != null) {
        const i = Number(t.dataset.mdel);
        spec.modules.splice(i, 1);
        remapRules((m) => (m === i ? -1 : m > i ? m - 1 : m));
        open = -1; saveSpec(); draw();
      } else if (t.dataset.mup != null) {
        const i = Number(t.dataset.mup);
        if (i > 0) { const x = spec.modules[i]; spec.modules[i] = spec.modules[i - 1]; spec.modules[i - 1] = x; remapRules((m) => (m === i ? i - 1 : m === i - 1 ? i : m)); open = i - 1; saveSpec(); draw(); }
      } else if (t.dataset.mopen != null && !e.target.closest('button')) { const i = Number(t.dataset.mopen); open = open === i ? -1 : i; draw(); }
      else if (t.hasAttribute('data-rule-add')) { addRule(t.dataset.ruleAdd); saveSpec(); draw(); }
      else if (t.dataset.quick) { spec.modules.push({ id: t.dataset.quick }); saveSpec(); toast(LAB.module(t.dataset.quick).name + ' ajouté', 'ok', 1600); draw(); }
      else if (t.dataset.ruleDel != null) { spec.rules.splice(Number(t.dataset.ruleDel), 1); saveSpec(); draw(); }
      else if (t.hasAttribute('data-var-add')) { addVar(); saveSpec(); draw(); }
      else if (t.dataset.varDel != null) {
        const gone = varName(spec.vars[Number(t.dataset.varDel)] || {});
        spec.vars.splice(Number(t.dataset.varDel), 1);
        spec.rules = spec.rules.filter((r) => !(r.if.var && LAB.sanitize(r.if.var) === gone));
        spec.rules.forEach((r) => { if (r.if.vv && LAB.sanitize(r.if.vv) === gone) delete r.if.vv; });
        saveSpec(); draw();
      }
    });
  }

  const projId = () => LAB.sanitize(spec.title || 'projet');
  const asProject = () => ({ id: projId(), title: spec.title, desc: spec.description, difficulty: 2, notes: [], spec });
  Object.assign(A.actions, {
    'st-add': pickModule,
    'st-copy': () => A.studioResult && copyText(A.studioResult.code),
    'st-ino': () => A.studioResult && download(projId() + '.ino', A.studioResult.code),
    'st-zip': () => A.studioResult && A.downloadProjectZip(projId(), asProject(), A.studioResult),
     'st-sd': () => A.studioResult && A.saveProjectToSd(projId(), asProject(), A.studioResult),
    'st-save-project': async () => {
      const title = await A.modal({ title: 'Enregistrer et reprendre plus tard', input: spec.title || '', label: 'Nom de ce projet', placeholder: 'ex. Serre du balcon', ok: 'Enregistrer' });
      if (!title || !title.trim()) return;
      const clean = title.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 72);
      if (!clean) return A.toast('Choisis un nom avec des lettres ou des chiffres.', 'warn');
      let exists = false;
      try { const existing = await A.api('/api/projects'); exists = (existing || []).some((p) => p.group === 'mine' && p.name === clean); } catch (e) {}
      try { const existing = await A.piProjects(); exists = exists || existing.some((p) => p.id === clean); } catch (e) { if (!exists && !S.admin) return A.toast('Connecte le Pi dans Compagnon ou insère une microSD dans le S3.', 'warn'); }
      if (exists && !(await A.confirmBox('Remplacer le projet ?', `« ${title.trim()} » existe déjà. Remplacer ses fichiers par cette version ?`, 'Remplacer', true))) return;
      spec.title = title.trim(); saveSpec(); draw();
      try { const result = LAB.generate(spec); A.studioResult = result; await A.saveProjectToSd(clean, asProject(), result); }
      catch (e) { A.toast(e.message || String(e), 'bad'); }
    },
    'st-flash': () => { if (!spec.modules.length) return toast('Ajoute au moins un module avant de flasher.', 'warn'); A.flashPipeline({ spec: JSON.parse(JSON.stringify(spec)), title: spec.title }); },
    'st-svg': () => A.studioResult && LAB.montageSvg && download(`montage_${projId()}_${A.studioResult.board}.svg`, LAB.montageSvg(A.studioResult, { id: projId(), title: spec.title }).svg, 'image/svg+xml'),
    'st-apk': () => {
      if (!A.AppStudio) return toast('Studio APK non chargé', 'bad');
      store.set('apkstudio.fromStudio', JSON.parse(JSON.stringify(spec)));
      A.go('apkstudio', { studio: '1' });
    },
    'st-bench': () => A.openBench(JSON.parse(JSON.stringify(spec)), projId()),
    'st-new': async () => { if (spec.modules.length && !(await confirmBox('Nouveau projet', 'Le projet en cours sera remplacé (pensez à le télécharger).', 'Nouveau'))) return; spec = blank(); saveSpec(); open = -1; draw(); },
    'st-share': () => {
      const url = location.origin + location.pathname + '#studio?s=' + b64e(JSON.stringify(spec));
      modal({ title: 'Partager ce projet', html: '<p>Ce lien contient tout le projet (modules, règles, options — mot de passe Wi-Fi exclu). Toute personne connectée au laboratoire peut l\'ouvrir.</p>', input: url, ok: 'Copier', cancel: 'Fermer' }).then((v) => { if (v) copyText(v); });
    },
    'st-template': () => {
      const recs = LAB.RECIPES || [];
      const d = drawer('Partir d\'un modèle', `<p class="small muted" style="margin-bottom:12px">${recs.length} projets complets, modifiables librement.</p><div class="pick-list" style="max-height:none">${recs.map((r) => `<div class="pick-item" data-id="${r.id}"><div class="icon-tile violet">${icon('star')}</div><div class="grow" style="min-width:0"><div style="font-weight:600">${esc(r.title)}</div><div class="small muted">${esc(r.desc)}</div></div></div>`).join('')}</div>`);
      d.body.addEventListener('click', (e) => { const it = e.target.closest('[data-id]'); if (!it) return; const p = A.projectById(it.dataset.id); d.close(); A.openInStudio(p.spec); });
    }
  });
  // le mot de passe Wi-Fi n'est jamais inclus dans un lien partagé
  const _share = A.actions['st-share'];
  A.actions['st-share'] = () => { const pass = spec.options.wifi_pass; delete spec.options.wifi_pass; _share(); if (pass) spec.options.wifi_pass = pass; };
  A.commands.push({ title: 'Nouveau projet (Studio)', group: 'Action', icon: 'wand', run: () => A.go('studio') }, { title: 'Ajouter un module au projet', group: 'Action', icon: 'plus', run: () => { A.go('studio'); setTimeout(pickModule, 60); } });
})();
/* ---- 36_companion.js ---- */
(function(){
'use strict';
const A=window.APP,$=A.$,esc=A.esc,icon=A.icon,toast=A.toast;
const KEY='nexus.pi.connection';let cfg={url:'http://192.168.4.2:8088',token:''},projects=[],timer=null;
try{cfg=Object.assign(cfg,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){}
const cleanUrl=s=>String(s||'').trim().replace(/\/+$/,'');
function headers(json){const h={Authorization:'Bearer '+cfg.token};if(json)h['Content-Type']='application/json';return h;}
async function pi(path,opts){opts=opts||{};const r=await fetch(cleanUrl(cfg.url)+path,Object.assign({cache:'no-store',headers:headers(false)},opts,{headers:Object.assign(headers(!!opts.body),opts.headers||{})}));const ct=r.headers.get('content-type')||'';const data=ct.includes('json')?await r.json():ct.startsWith('image/')?await r.blob():await r.text();if(!r.ok)throw new Error(data&&data.error||('Pi HTTP '+r.status));return {data,headers:r.headers};}
function panel(el){el.innerHTML=`<div class="stack companion"><div class="hero"><div><div class="eyebrow">NEXUS · COMPAGNON RASPBERRY PI</div><h1>Atelier connecté</h1><p>Le S3 reste le chef du labo. Le Pi rejoint le Wi‑Fi « ESP32-LAB » et utilise sa microSD comme stockage partagé; le S3 autorise le worker, qui télécharge le firmware du Pi et vérifie son SHA‑256.</p></div><div class="hero-mark">${icon('cpu')}</div></div>
<div class="grid g-3"><section class="card span-2"><div class="card-h"><h2 class="grow">Connexion locale au Pi</h2><span id="pi-health" class="badge">Non vérifié</span></div><div class="card-b"><div class="grid g-2"><label class="field">Adresse Pi<input class="input" id="pi-url" value="${esc(cfg.url)}" placeholder="http://192.168.4.2:8088"></label><label class="field">Jeton privé du Pi<input class="input" id="pi-token" type="password" value="${esc(cfg.token)}" autocomplete="off"></label></div><div class="row" style="margin-top:12px"><button class="btn primary" id="pi-save">Enregistrer et tester</button><span class="small muted">Pi, workers et téléphone sur « ESP32-LAB ». L’Ethernet du Pi peut garder Internet.</span></div><div class="hint" style="margin-top:12px">Flux sans déplacer la carte : Studio → microSD du Pi → compilation → le S3 autorise le worker → le worker télécharge directement le binaire signé depuis le Pi et valide le SHA‑256. Le S3 garde le contrôle de chaque flash. Le Pi occupe un des 10 clients Wi‑Fi permis par le point d’accès; prévois jusqu’à 9 workers dans ce mode.</div><div class="card pad" style="margin-top:14px"><h3>Assistant IA du Pi</h3><p class="small muted">Le chat peut utiliser cette IA et garder son historique sur le Pi. Sans clé IA, le catalogue local reste disponible.</p><div class="grid g-3"><label class="field">Adresse du fournisseur<input class="input" id="pi-ai-endpoint" placeholder="https://…/v1/chat/completions"></label><label class="field">Modèle<input class="input" id="pi-ai-model" placeholder="Nom du modèle"></label><label class="field">Clé API<input class="input" id="pi-ai-key" type="password" autocomplete="off" placeholder="Vide = conserver la clé actuelle"></label></div><div class="row" style="margin-top:10px"><button class="btn sm" id="pi-ai-save">Enregistrer l’IA sur le Pi</button><span class="small muted" id="pi-ai-state">Non vérifiée</span></div></div></div></section>
<aside class="stack"><div class="card pad"><div class="eyebrow">MESSAGES</div><div id="pi-messages" class="chat small" style="max-height:230px;overflow:auto">Connecte le Pi pour charger le fil.</div><div class="row" style="margin-top:8px"><input class="input" id="pi-message" placeholder="Écrire au Pi…"><button class="btn sm" id="pi-send">Envoyer</button></div></div><div class="card pad"><div class="eyebrow">TES PROJETS S3</div><div id="pi-projects" class="stack small"><span class="muted">Lecture de la microSD du S3…</span></div></div></aside></div>
<div class="grid g-2"><section class="card"><div class="card-h"><h2 class="grow">Compiler et flasher un worker</h2></div><div class="card-b"><label class="field">Projet enregistré sur le S3<select class="input" id="pi-project"><option value="">Choisir un projet</option></select></label><div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="btn primary" id="pi-build">Compiler le firmware sur le Pi</button><button class="btn" id="pi-apk">Créer l’APK Android du projet</button></div><div id="pi-build-status" class="stack small" style="margin-top:12px"><span class="muted">Aucun travail en cours.</span></div><div id="pi-flash-box" class="stack small" style="margin-top:10px"></div></div></section>
<section class="card"><div class="card-h"><h2 class="grow">APK de projet et QR de téléchargement</h2></div><div class="card-b"><p class="small muted">Le bouton de compilation Pi fonctionne sur un hôte x86_64 compatible. Sur Pi 4 ARM64, compile l’APK projet sur Windows avec le script fourni, puis envoie-la au Pi ici pour créer un lien et un QR sur le réseau local.</p><div id="pi-android-compat" class="hint">Vérification de la compatibilité du Pi…</div><div class="row" style="margin:10px 0;flex-wrap:wrap"><input class="input" id="pi-apk-file" type="file" accept=".apk,application/vnd.android.package-archive"><button class="btn primary" id="pi-apk-upload">Envoyer l’APK au Pi et créer le QR</button></div><div id="pi-apk-result" class="stack small"><span class="muted">Aucune APK générée pendant cette session.</span></div></div></section></div>
<div class="grid g-2"><section class="card"><div class="card-h"><h2 class="grow">Mettre à jour un worker depuis GitHub</h2></div><div class="card-b"><p class="small muted">Le Pi récupère un firmware d’une Release, contrôle son empreinte, puis le MASTER S3 doit confirmer et autoriser l’OTA.</p><div class="grid g-3"><label class="field">Dépôt<input class="input" id="pi-gh-repo" value="Prince223889/ESP32-box"></label><label class="field">Carte du firmware<select class="input" id="pi-gh-board"><option value="esp32">ESP32</option><option value="esp32s3">ESP32-S3</option><option value="esp32c3">ESP32-C3</option></select></label><button class="btn" id="pi-gh-load" style="align-self:end">Charger les firmwares publiés</button></div><div id="pi-gh-assets" class="stack small" style="margin-top:12px">Aucune Release chargée.</div></div></section><aside class="card pad"><h3>Stockage avec une seule carte</h3><p class="small muted">Pi allumé : la carte de 64 Go reste dans le Pi et le S3 utilise le réseau. Mode autonome S3 : éteins le Pi proprement, puis déplace la même carte vers le S3. Les deux appareils ne peuvent pas l’utiliser en même temps.</p></aside></div></div>`;
$('#pi-url',el).addEventListener('change',e=>cfg.url=cleanUrl(e.target.value));$('#pi-token',el).addEventListener('change',e=>cfg.token=e.target.value.trim());
async function loadAiConfig(){try{const {data}=await pi('/api/v1/assistant/config');$('#pi-ai-endpoint',el).value=data.endpoint||'';$('#pi-ai-model',el).value=data.model||'';$('#pi-ai-state',el).textContent=data.configured?'IA prête · clé conservée':'Mode local · fournisseur non configuré';}catch(e){$('#pi-ai-state',el).textContent='Connecte le Pi pour configurer';}}
$('#pi-ai-save',el).onclick=async()=>{try{const {data}=await pi('/api/v1/assistant/config',{method:'POST',body:JSON.stringify({endpoint:$('#pi-ai-endpoint',el).value.trim(),model:$('#pi-ai-model',el).value.trim(),key:$('#pi-ai-key',el).value})});$('#pi-ai-key',el).value='';$('#pi-ai-state',el).textContent=data.configured?'IA enregistrée sur le Pi · clé masquée':'Mode local enregistré';toast('Configuration IA enregistrée sur le Pi','ok');}catch(e){toast(e.message,'bad');}};

$('#pi-save',el).onclick=async()=>{cfg.url=cleanUrl($('#pi-url',el).value);cfg.token=$('#pi-token',el).value.trim();localStorage.setItem(KEY,JSON.stringify(cfg));await health(el);};
$('#pi-send',el).onclick=async()=>{const input=$('#pi-message',el),text=input.value.trim();if(!text)return;try{await pi('/api/v1/messages',{method:'POST',body:JSON.stringify({text})});input.value='';await messages(el);toast('Message envoyé au Pi','ok');}catch(e){toast(e.message,'bad');}};
$('#pi-build',el).onclick=()=>buildFirmware(el);$('#pi-apk',el).onclick=()=>buildApk(el);$('#pi-apk-upload',el).onclick=()=>uploadApk(el);$('#pi-gh-load',el).onclick=()=>loadGithubAssets(el);loadProjects(el);health(el);messages(el);loadAiConfig();if(timer)clearInterval(timer);timer=setInterval(()=>{if(!el.isConnected){clearInterval(timer);timer=null;return;}messages(el);},10000);
}
async function health(el){const badge=$('#pi-health',el);try{const {data}=await pi('/api/v1/health');const arm=/^(aarch64|arm64)$/i.test(data.host_arch||'');badge.textContent=data.ok?'Pi prêt · Arduino CLI '+(data.arduino_cli==='absent'?'absent':'OK')+' · FAT commune '+Math.max(0,Number(data.shared_free_bytes||0)/1073741824).toFixed(1)+' Go libres':'Pi indisponible';badge.className='badge '+(data.ok?'ok':'bad');const note=$('#pi-android-compat',el),button=$('#pi-apk',el);if(note){note.textContent=arm?'Le Pi 4 ARM64 ne peut pas compiler cette APK avec la chaîne Android du projet. Le script Windows crée l’APK projet; importe-la ici pour l’héberger sur le Pi et obtenir son QR.':'Architecture '+(data.host_arch||'inconnue')+' : la compilation APK Pi est disponible sur x86_64.';note.classList.toggle('warn',arm);button.disabled=arm;button.title=arm?'Compile sur Windows puis importe l’APK ici.':'';}}catch(e){badge.textContent='Pi hors ligne';badge.className='badge bad';}}
async function loadProjects(el){const box=$('#pi-projects',el),select=$('#pi-project',el);let local=[],remote=[];try{local=(await A.api('/api/projects')||[]).filter(p=>p.group==='mine').map(p=>({id:p.name,title:p.title||p.name,source:'S3'}));}catch(e){}try{remote=(await A.piProjects()).map(p=>({id:p.id,title:p.title||p.id,source:'Pi'}));}catch(e){}const merged=new Map();local.forEach(p=>merged.set(p.id,p));remote.forEach(p=>{if(!merged.has(p.id))merged.set(p.id,p);});projects=[...merged.values()];box.textContent='';if(!projects.length){box.textContent='Aucun projet nommé accessible. Connecte le Pi ou enregistre un projet dans le Studio.';return;}projects.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.title+' · '+p.source;select.append(o);const row=document.createElement('div');row.className='match-row';row.textContent=p.title+' · '+p.source;box.append(row);});}
async function projectFiles(id){try{const root='/sd/PROJECTS/MY_PROJECTS/'+id+'/';const files={};for(const name of [id+'.ino','README.md','project.json']){const blob=await A.api('/api/sd/download?path='+encodeURIComponent(root+name),{raw:true});files[name]=await blob.text();}return files;}catch(e){return A.piReadProject(id);}}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function pollJob(jobId,el,target){let last=null;for(let n=0;n<360;n++){const {data:j}=await pi('/api/v1/jobs/'+encodeURIComponent(jobId));if(last!==j.stage||n%5===0){last=j.stage;target.innerHTML=`<div class="row"><b>${esc(j.stage||j.status)}</b><span class="grow"></span><span>${Math.max(0,Number(j.progress)||0)}%</span></div><progress max="100" value="${Math.max(0,Number(j.progress)||0)}" style="width:100%"></progress><div class="muted">${esc(j.status)} · ${Number(j.elapsed||0).toFixed(1)} s écoulées</div>${j.error?`<div class="banner bad">${esc(j.error)}</div>`:''}${j.log?`<details><summary>Journal de construction</summary><pre class="small mono">${esc(j.log.slice(-12000))}</pre></details>`:''}`;}if(['success','failed','canceled'].includes(j.status))return j;await delay(1800);}throw new Error('Délai de surveillance dépassé. Le job continue peut-être sur le Pi.');}
async function buildFirmware(el){const id=$('#pi-project',el).value;if(!id)return toast('Choisis un projet enregistré.','warn');const box=$('#pi-build-status',el);try{if(!cfg.token)throw new Error('Saisis le jeton du Pi.');box.textContent='Lecture du projet enregistré…';const files=await projectFiles(id);const meta=JSON.parse(files['project.json']);const board=meta.board||meta.spec?.board||'esp32';box.textContent='Envoi des sources au Pi…';const {data}=await pi('/api/v1/build',{method:'POST',body:JSON.stringify({project_id:id,board,files})});const job=await pollJob(data.id,el,box);if(job.status!=='success')return;const signed=await pi('/api/v1/jobs/'+data.id+'/firmware-link');const fw=signed.data;const fwUrl=new URL(fw.url);if(fwUrl.protocol!=='http:'||fwUrl.port!=='8088'||!/^192\.168\.4\.\d+$/.test(fwUrl.hostname))throw new Error('Le lien du Pi doit utiliser son adresse Wi‑Fi ESP32-LAB (192.168.4.x:8088).');box.innerHTML+=`<div class="banner ok">Firmware sur la microSD du Pi · ${Number(fw.size||0).toLocaleString()} octets · SHA‑256 ${esc(fw.sha256.slice(0,16))}… · lien temporaire signé (5 min).</div>`;await offerFlash(el,id,data.id,fw.sha256,board,box);}catch(e){box.innerHTML=`<div class="banner bad">${esc(e.message)}</div>`;}}
async function offerFlash(el,id,jobId,digest,board,box){let state;try{state=await A.api('/api/state');}catch(e){box.innerHTML+='<div class="hint">MASTER S3 non joignable; le binaire reste stocké sur la carte du Pi.</div>';return;}const workers=state.workers||[];const choices=workers.filter(w=>!['OFFLINE','PROJECT'].includes(w.state));if(!choices.length){box.innerHTML+='<div class="hint">Aucun worker disponible. Binaire conservé sur la microSD du Pi.</div>';return;}const row=document.createElement('div');row.className='row';const sel=document.createElement('select');sel.className='input';choices.forEach(w=>{const o=document.createElement('option');o.value=w.id;o.textContent='Worker '+w.id+' · '+(w.state||'disponible');sel.append(o);});const b=document.createElement('button');b.className='btn danger';b.textContent='Vérifier la carte et flasher';row.append(sel,b);box.append(row);b.onclick=async()=>{try{const info=await A.api('/api/worker/info?id='+encodeURIComponent(sel.value));const chip=String(info.chip||'').toLowerCase();if((board==='esp32s3'&&!chip.includes('s3'))||(board==='esp32c3'&&!chip.includes('c3'))||(board==='esp32'&&(!chip.includes('esp32')||chip.includes('s3')||chip.includes('c3'))))throw new Error('Carte incompatible : '+(info.chip||'modèle inconnu'));if(!await A.confirmBox('Confirmer le flash',`Le Pi a compilé ${id}; le worker téléchargera l’artefact depuis la microSD Pi et revérifiera SHA‑256 (${digest.slice(0,12)}…). Le MASTER S3 va autoriser le flash du worker ${sel.value}.`,'Flasher',true))return;const fresh=await pi('/api/v1/jobs/'+encodeURIComponent(jobId)+'/firmware-link');const remoteUrl=fresh.data.url;const target=new URL(remoteUrl);if(target.protocol!=='http:'||target.port!=='8088'||!/^192\.168\.4\.\d+$/.test(target.hostname))throw new Error('Adresse Pi non autorisée pour le réseau ESP32-LAB.');await A.post('/api/worker/flash/remote',{id:sel.value,url:remoteUrl,sha256:digest,mode:'project'});b.disabled=true;b.textContent='Flash envoyé';await monitorFlash(sel.value,box);}catch(e){toast(e.message,'bad');}};}
async function monitorFlash(id,box){const started=performance.now();const row=document.createElement('div');row.className='hint';row.textContent='Surveillance S3 : démarrage du transfert…';box.append(row);let since=0;for(let i=0;i<50;i++){await delay(1200);try{const log=await A.api(`/api/worker/log?id=${encodeURIComponent(id)}&since=${since}`);since=log.last||since;const txt=(log.lines||[]).map(x=>x.text||'').join('\n');if(txt)row.textContent=txt.slice(-900);const state=await A.api('/api/state');const w=(state.workers||[]).find(x=>String(x.id)===String(id));if(w&&['ONLINE','READY','IDLE'].includes(w.state)){row.textContent='Worker revenu en ligne après le flash · '+((performance.now()-started)/1000).toFixed(1)+' s mesurées. Vérifie ses valeurs et son câblage au banc.';return;}}catch(e){}}row.textContent+=' · '+((performance.now()-started)/1000).toFixed(1)+' s mesurées sans retour final. Consulte le journal et l’état du worker sur le S3.';}
async function buildApk(el){const id=$('#pi-project',el).value;if(!id)return toast('Choisis un projet enregistré.','warn');const box=$('#pi-apk-result',el);try{const files=await projectFiles(id);const {data}=await pi('/api/v1/android/build',{method:'POST',body:JSON.stringify({project_id:id,files})});const job=await pollJob(data.id,el,box);if(job.status!=='success')return;const url=cleanUrl(cfg.url)+'/download/apps/'+encodeURIComponent(id)+'/'+encodeURIComponent(data.id)+'.apk';const qr=await pi('/api/v1/jobs/'+encodeURIComponent(data.id)+'/qr');const object=URL.createObjectURL(qr.data);box.innerHTML=`<div class="banner ok">APK du projet prête · SHA‑256 ${esc((job.sha256||'').slice(0,16))}… · durée ${Number(job.elapsed||0).toFixed(1)} s.</div><div class="row" style="align-items:flex-start;gap:18px;flex-wrap:wrap"><a class="btn primary" href="${esc(url)}" target="_blank" rel="noopener">Télécharger l’APK</a><img src="${object}" alt="QR de téléchargement de l’APK" width="180" height="180" style="background:#fff;padding:8px;border-radius:12px"><span class="small muted">Scanne sur le même Wi‑Fi que le Pi. Cette APK debug doit être installée manuellement sur Android.</span></div>`;}catch(e){box.innerHTML=`<div class="banner bad">${esc(e.message)}</div>`;}}
async function uploadApk(el){const id=$('#pi-project',el).value,file=$('#pi-apk-file',el).files[0],box=$('#pi-apk-result',el);if(!id)return toast('Choisis d’abord un projet enregistré.','warn');if(!file)return toast('Choisis l’APK projet créée sur Windows.','warn');if(file.size>40*1024*1024)return toast('APK trop grande (limite 40 Mo).','bad');try{box.textContent='Envoi et vérification de l’APK sur le Pi…';const r=await fetch(cleanUrl(cfg.url)+'/api/v1/android/import',{method:'POST',headers:{Authorization:'Bearer '+cfg.token,'X-Nexus-Project':id,'Content-Type':'application/vnd.android.package-archive'},body:file,cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||('Pi HTTP '+r.status));renderApkResult(el,data.id,id,data.sha256,data.size,0);}catch(e){box.innerHTML=`<div class="banner bad">${esc(e.message)}</div>`;}}
async function renderApkResult(el,jobId,id,digest,size,elapsed){const box=$('#pi-apk-result',el);try{const url=cleanUrl(cfg.url)+'/download/apps/'+encodeURIComponent(id)+'/'+encodeURIComponent(jobId)+'.apk';const qr=await pi('/api/v1/jobs/'+encodeURIComponent(jobId)+'/qr');if(box._qrObject)URL.revokeObjectURL(box._qrObject);box._qrObject=URL.createObjectURL(qr.data);box.innerHTML=`<div class="banner ok">APK projet prête · ${(Number(size)||0).toLocaleString()} octets · SHA‑256 ${esc((digest||'').slice(0,16))}… · ${Number(elapsed||0).toFixed(1)} s.</div><div class="row" style="align-items:flex-start;gap:18px;flex-wrap:wrap"><a class="btn primary" href="${esc(url)}" target="_blank" rel="noopener">Télécharger l’APK</a><img src="${box._qrObject}" alt="QR de téléchargement de l’APK projet" width="180" height="180" style="background:#fff;padding:8px;border-radius:12px"><span class="small muted">Scanne sur le même Wi‑Fi que le Pi. Android demandera de confirmer l’installation.</span></div>`;}catch(e){box.innerHTML=`<div class="banner bad">APK importée, mais QR indisponible : ${esc(e.message)}</div>`;}}
async function loadGithubAssets(el){const repo=$('#pi-gh-repo',el).value.trim(),board=$('#pi-gh-board',el).value,box=$('#pi-gh-assets',el);if(!repo)return;try{box.textContent='Recherche des firmwares dans la dernière Release…';const {data}=await pi('/api/v1/github/worker-assets?repo='+encodeURIComponent(repo));const items=(data.items||[]).filter(x=>{const n=x.name.toLowerCase();if(n.includes('master'))return false;return board==='esp32'?n.includes('esp32')&&!n.includes('esp32s3')&&!n.includes('esp32c3'):n.includes(board);});if(!items.length){box.textContent='Aucun firmware worker compatible avec cette carte dans la dernière Release.';return;}box.textContent='';items.forEach(item=>{const row=document.createElement('div');row.className='match-row';const label=document.createElement('span');label.textContent=item.name+' · '+item.tag+' · '+Number(item.size).toLocaleString()+' octets';const button=document.createElement('button');button.className='btn sm primary';button.textContent='Vérifier, importer et proposer l’OTA';button.onclick=()=>importAndFlashGithub(el,item,board,repo,button);row.append(label,button);box.append(row);});}catch(e){box.innerHTML=`<div class="banner bad">${esc(e.message)}</div>`;}}
async function importAndFlashGithub(el,item,board,repo,button){const box=$('#pi-gh-assets',el);try{button.disabled=true;button.textContent='Téléchargement et vérification…';const {data}=await pi('/api/v1/firmware/import-github',{method:'POST',body:JSON.stringify({repo,tag:item.tag,name:item.name,url:item.url,board,sha256:item.sha256||''})});box.insertAdjacentHTML('beforeend',`<div class="hint">Firmware importé · SHA‑256 ${esc(data.sha256.slice(0,16))}… · vérifié sur le Pi.</div>`);await flashRemoteArtifact(el,data.id,data.sha256,board,'firmware',data.name,box);}catch(e){button.disabled=false;button.textContent='Réessayer';toast(e.message,'bad');}}
async function flashRemoteArtifact(el,jobId,digest,board,mode,label,box){const state=await A.api('/api/state'),choices=(state.workers||[]).filter(w=>!['OFFLINE','PROJECT','FLASHING'].includes(w.state));if(!choices.length){box.insertAdjacentHTML('beforeend','<div class="hint">Aucun worker disponible; firmware conservé sur la microSD du Pi.</div>');return;}const row=document.createElement('div');row.className='row';const select=document.createElement('select');select.className='input';choices.forEach(w=>{const o=document.createElement('option');o.value=w.id;o.textContent='Worker '+w.id+' · '+(w.state||'disponible');select.append(o);});const go=document.createElement('button');go.className='btn danger';go.textContent='Vérifier la carte et autoriser l’OTA';row.append(select,go);box.append(row);go.onclick=async()=>{try{const info=await A.api('/api/worker/info?id='+encodeURIComponent(select.value)),chip=String(info.chip||'').toLowerCase();if((board==='esp32s3'&&!chip.includes('s3'))||(board==='esp32c3'&&!chip.includes('c3'))||(board==='esp32'&&(!chip.includes('esp32')||chip.includes('s3')||chip.includes('c3'))))throw new Error('Carte incompatible : '+(info.chip||'modèle inconnu'));if(!await A.confirmBox('Confirmer la mise à jour worker',`${label} · ${board} · empreinte SHA‑256 ${digest.slice(0,16)}… Le MASTER S3 va autoriser le téléchargement et l’OTA du worker ${select.value}.`,'Autoriser l’OTA',true))return;const fresh=await pi('/api/v1/jobs/'+encodeURIComponent(jobId)+'/firmware-link'),target=new URL(fresh.data.url);if(target.protocol!=='http:'||target.port!=='8088'||!/^192\.168\.4\.\d+$/.test(target.hostname))throw new Error('Adresse Pi non autorisée pour le réseau ESP32-LAB.');await A.post('/api/worker/flash/remote',{id:select.value,url:fresh.data.url,sha256:digest,mode});go.disabled=true;go.textContent='OTA autorisée';await monitorFlash(select.value,box);}catch(e){toast(e.message,'bad');}};}
async function messages(el){try{const {data}=await pi('/api/v1/messages');const box=$('#pi-messages',el);box.textContent='';(data.items||[]).slice(-12).forEach(m=>{const d=document.createElement('div');d.className='msg '+(m.sender==='Atelier'?'me':'bot');d.textContent=(m.sender||'Pi')+' · '+m.text;box.append(d);});box.scrollTop=box.scrollHeight;}catch(e){}}
A.piProjects=async()=>{const {data}=await pi('/api/v1/projects');return data.items||[];};
A.piReadProject=async id=>{const {data}=await pi('/api/v1/projects/'+encodeURIComponent(id)+'/files');return data.files||{};};
A.piSaveProject=async(id,files)=>{const {data}=await pi('/api/v1/projects/save',{method:'POST',body:JSON.stringify({project_id:id,files})});return data;};
A.piRequest=async(path,opts)=>{const {data}=await pi(path,opts);return data;};
A.piBase=()=>cleanUrl(cfg.url);A.piToken=()=>cfg.token;
A.page({id:'companion',title:'Compagnon Pi',icon:'cpu',group:'sys',desc:'Compilation, APK de projet et messages sur le réseau local',render:panel});
})();
/* ---- 37_project_builder.js ---- */
/* Créateur de projet guidé, local et explicable */
(function () {
  'use strict';
  const A=window.APP, LAB=window.LAB, $=A.$, icon=A.icon, esc=A.esc, toast=A.toast;
  const examples=['Je veux mesurer température et humidité dans une serre','Je veux surveiller le niveau d’une cuve et démarrer une pompe','Je veux détecter une présence et allumer une lumière'];
  const groups=[
    [['température','temperature','humidité','humidite','météo','meteo','serre'],['dht22','dht11','bme280','sht31']],
    [['distance','obstacle','parking'],['hcsr04','vl53l0x','sharp_ir']],
    [['niveau','cuve','liquide','fuite'],['water_level','float_switch','ir_beam']],
    [['luminosité','luminosite','lumière','lumiere','éclairage'],['ldr','bh1750','veml7700']],
    [['co2','qualité air','qualite air'],['mhz19','scd40','ccs811']],
    [['écran','ecran','afficher','oled'],['oled_ssd1306','lcd1602','oled_sh1106']],
    [['relais'],['relay']], [['ventilateur','ventilation'],['fan_pwm']],
    [['pompe','arroser','arrosage'],['pump','relay']], [['servo','volet'],['servo_sg90','servo_360']],
    [['présence','presence','mouvement','intrusion'],['pir_hcsr501','pir_am312']]
  ];
  const actuators=['relay','fan_pwm','pump','servo_sg90','led','buzzer_active'];
  let flow;
  function fresh(){flow={goal:'',modules:[],board:'',stage:'start',question:'',history:[]};}
  const mod=id=>LAB.module(id);
  function norm(s){return A.norm(s);}
  function candidates(q,skip){
    const n=norm(q),ids=[];
    const add=id=>{if(!skip.includes(id)&&mod(id)&&!ids.includes(id))ids.push(id);};
    (LAB.MODULES||[]).forEach(m=>{if(n.includes(norm(m.id))||(norm(m.name).length>4&&n.includes(norm(m.name))))add(m.id);});
    groups.forEach(g=>{if(g[0].some(k=>n.includes(norm(k))))g[1].forEach(add);});
    if(!ids.length)['dht22','bme280','oled_ssd1306','relay','hcsr04','pir_hcsr501'].forEach(add);
    return ids.slice(0,8).map(mod).filter(Boolean);
  }
  function choices(){
    if(flow.stage==='modules')return candidates(flow.goal,flow.modules).map(m=>({label:m.name,value:m.id,detail:m.desc}));
    if(flow.stage==='board')return [{label:'ESP32',value:'esp32'},{label:'ESP32-S3',value:'esp32s3'},{label:'ESP32-C3',value:'esp32c3'}];
    if(flow.stage==='actuator')return actuators.map(mod).filter(Boolean).map(m=>({label:m.name,value:m.id,detail:m.desc}));
    if(flow.stage==='more')return [{label:'Ajouter un autre composant',value:'more'},{label:'C’est tout',value:'done'}];
    if(flow.stage==='mode')return [{label:'Code',value:'code'},{label:'Câblage',value:'wiring'},{label:'Tout préparer',value:'all'},{label:'Proposition seulement',value:'none'}];
    if(flow.stage==='review')return [{label:'Oui, ouvrir le Studio',value:'yes'},{label:'Non, préciser',value:'no'}];
    return [];
  }
  function askNext(){
    if(!flow.modules.length){flow.stage='modules';flow.question='Quels composants veux-tu utiliser ? Choisis les éléments un par un.';return;}
    if(!flow.board){flow.stage='board';flow.question='Quelle carte vas-tu programmer ?';return;}
    const needsAct=/quand|lorsque|allum|active|commande|seuil|dépasse|depasse|pompe|ventil/i.test(norm(flow.goal));
    if(needsAct&&!flow.modules.some(id=>mod(id)&&mod(id).act)){flow.stage='actuator';flow.question='Quel actionneur doit réagir ?';return;}
    if(!/mesur|temp|humid|affich|surveil|niveau|distance|présence|presence|quand|lorsque|allum|alarme/i.test(norm(flow.goal))){flow.stage='behavior';flow.question='Que doit faire le projet ? Décris le résultat attendu.';return;}
    flow.stage='mode';flow.question='Quelle aide souhaites-tu ?'; 
  }
  function rules(){
    const sensor=flow.modules.map(mod).find(m=>m&&m.outs&&m.outs.length);
    const action=flow.modules.map(mod).find(m=>m&&m.act);
    const low=/moins de|inferieur|en dessous/.test(norm(flow.goal));
    const threshold=flow.goal.match(/(?:>|plus de|moins de|supérieur(?:e)? à|inférieur(?:e)? à|en dessous de|dépasse)\s*(\d+(?:[,.]\d+)?)/i);
    if(!sensor||!action)return [];
    return [{if:{m:flow.modules.indexOf(sensor.id),out:sensor.outs[0].k,op:low?'<':'>',v:threshold?Number(threshold[1].replace(',','.')):25,hyst:0.5},
      then:{m:flow.modules.indexOf(action.id),act:'on'},else:{m:flow.modules.indexOf(action.id),act:'off'}}];
  }
  function spec(){
    return {board:flow.board,title:'Projet NEXUS',description:flow.goal,modules:flow.modules.map(id=>({id:id})),rules:rules(),
      options:{web:/web|téléphone|telephone|navigateur/i.test(flow.goal),master:true}};
  }
  function near(){
    return (LAB.RECIPES||[]).map(r=>{const ids=(r.modules||[]).map(m=>m.id),n=ids.filter(id=>flow.modules.includes(id)).length;return {r:r,score:n/Math.max(ids.length,flow.modules.length)};})
      .filter(x=>x.score>=0.5).sort((a,b)=>b.score-a.score).slice(0,3);
  }
  function draw(el){
    el.innerHTML="<div class='stack builder'><div class='hero'><div><div class='eyebrow'>SMART PROJECT BUILDER</div><h1>Raconte ton projet</h1><p>Je vérifie les composants connus, puis je pose quelques questions à choix. Tu valides avant d’ouvrir le code.</p></div><div class='hero-mark'>"+icon('wand')+"</div></div><div class='grid g-3'><section class='card span-2'><div class='card-h'><h2 class='grow'>Conversation guidée</h2><button class='btn sm' id='builder-reset'>Recommencer</button></div><div class='card-b'><div class='chat builder-chat' id='builder-log'></div><div id='builder-input-area'></div><div class='builder-choices' id='builder-choices'></div></div></section><aside class='stack'><div class='card pad'><div class='eyebrow'>COMPOSANTS</div><div class='stack small' id='builder-modules'></div></div><div class='card pad'><h3>Aide au choix</h3><p class='small muted'>Choisis code, câblage ou les deux. Les broches sont proposées par le générateur du Studio.</p><div class='hint'>Une vérification logicielle ne prouve pas que le montage physique fonctionne.</div></div><div class='card pad'><h3>Reprendre un projet</h3><div class='stack small' id='builder-saved'><span class='muted'>Lecture de la microSD…</span></div></div></aside></div></div>";
    const log=$('#builder-log',el);flow.history.forEach(item=>{const d=document.createElement('div');d.className='msg '+item.who;d.textContent=item.text;log.append(d);});
    const modules=$('#builder-modules',el);modules.textContent='';
    flow.modules.forEach(id=>{const row=document.createElement('div');row.className='module-chip';row.textContent=mod(id).name;const x=document.createElement('button');x.textContent='×';x.onclick=()=>{flow.modules=flow.modules.filter(v=>v!==id);askNext();draw(el);};row.append(x);modules.append(row);});
    const area=$('#builder-input-area',el),buttons=$('#builder-choices',el);
    if(flow.stage==='start'){const t=document.createElement('textarea');t.className='textarea';t.id='builder-description';t.rows=3;t.placeholder='Ex. Je veux surveiller la température et démarrer un ventilateur au-dessus de 30 °C.';area.append(t);
      const ex=document.createElement('div');ex.className='chips scroll';examples.forEach(s=>{const b=document.createElement('button');b.className='chip';b.textContent=s;b.onclick=()=>{t.value=s;};ex.append(b);});area.append(ex);
      const go=document.createElement('button');go.className='btn primary';go.textContent='Comprendre mon projet';go.onclick=()=>{flow.goal=t.value.trim();if(!flow.goal)return;flow.history.push({who:'me',text:flow.goal});askNext();draw(el);};area.append(go);
    } else if(flow.stage==='behavior'){const t=document.createElement('textarea');t.className='textarea';t.value=flow.goal;t.rows=2;area.append(t);const b=document.createElement('button');b.className='btn primary';b.textContent='Continuer';b.onclick=()=>{flow.goal=t.value;flow.history.push({who:'me',text:t.value});flow.stage='mode';flow.question='Quelle aide souhaites-tu ?';draw(el);};area.append(b);}
    if(flow.question){const q=document.createElement('div');q.className='msg bot';q.textContent=flow.question;log.append(q);}
    choices().forEach(o=>{const b=document.createElement('button');b.className='builder-choice';const strong=document.createElement('b');strong.textContent=o.label;b.append(strong);if(o.detail){const small=document.createElement('small');small.textContent=o.detail;b.append(small);}b.onclick=()=>{handle(o.value);draw(el);};buttons.append(b);});
    if(flow.stage==='review'){
      const result=document.createElement('div');result.className='builder-review';
      const names=flow.modules.map(id=>mod(id).name).join(', ');
      let generated;try{generated=LAB.generate(spec());}catch(e){generated=null;}
      const warn=document.createElement('p');warn.className='small muted';warn.textContent=generated?('Proposition: '+flow.board+' · '+generated.wiring.length+' connexions affectées automatiquement.'):'Le générateur demande une correction.';result.append(warn);
      const p=document.createElement('p');p.textContent='Projet: '+names+' — '+flow.goal+' · Aide: '+({code:'code',wiring:'câblage',all:'code + câblage',none:'proposition seulement'}[flow.mode]||'code + câblage');result.append(p);
      const blocks=document.createElement('div');blocks.className='program-blocks';
      const rule=rules()[0];
      const blockText=rule?['QUAND · '+mod(flow.modules[rule.if.m]).name,'SI · '+rule.if.out+' '+rule.if.op+' '+rule.if.v,'ALORS · '+mod(flow.modules[rule.then.m]).name+' activé','SINON · action arrêtée']:flow.modules.map(id=>'MODULE · '+mod(id).name);
      blockText.forEach((text,i)=>{const b=document.createElement('div');b.className='program-block block-'+i;b.textContent=text;blocks.append(b);});
      result.append(blocks);
      near().forEach(x=>{const m=document.createElement('div');m.className='match-row';m.textContent='Projet proche: '+x.r.title+' · '+Math.round(x.score*100)+' %';result.append(m);});
      buttons.prepend(result);
    }
    $('#builder-reset',el).onclick=()=>{fresh();draw(el);};
  }
  function handle(value){
    if(flow.stage==='modules'){if(!flow.modules.includes(value))flow.modules.push(value);flow.history.push({who:'me',text:mod(value).name});flow.stage='more';flow.question='Veux-tu ajouter un autre composant ?';}
    else if(flow.stage==='more'){if(value==='more'){flow.stage='modules';flow.question='Choisis le composant suivant.';}else askNext();}
    else if(flow.stage==='board'){flow.board=value;flow.history.push({who:'me',text:value});askNext();}
    else if(flow.stage==='actuator'){if(!flow.modules.includes(value))flow.modules.push(value);flow.history.push({who:'me',text:mod(value).name});flow.stage='mode';flow.question='Quelle aide souhaites-tu ?';}
    else if(flow.stage==='mode'){flow.mode=value;flow.history.push({who:'me',text:value});flow.stage='review';flow.question='Voici le résumé. Est-ce bien ce que tu veux ?';}
    else if(flow.stage==='review'){if(value==='no'){flow.stage='behavior';flow.question='Que veux-tu corriger ou préciser ?';}else{try{const s=spec();const r=LAB.generate(s);if(r.warnings.length)toast('Des avertissements apparaîtront dans le Studio.','warn');if(flow.mode==='none'){localStorage.setItem('nexus.builder.lastPlan',JSON.stringify({spec:s,created:new Date().toISOString()}));toast('Proposition enregistrée sur cet appareil.','ok');return;}A.openInStudio(s,flow.mode==='wiring'?'wiring':'code');}catch(e){toast(e.message,'bad');}}}
  }
  async function loadSaved(el){const box=$('#builder-saved',el);if(!box)return;let local=[],remote=[];try{local=(await A.api('/api/projects')||[]).filter(p=>p.group==='mine').map(p=>({id:p.name,title:p.title||p.name,path:p.path,source:'S3'}));}catch(e){}try{remote=(await A.piProjects()).map(p=>({id:p.id,title:p.title||p.id,source:'Pi'}));}catch(e){}const merged=new Map();local.forEach(p=>merged.set(p.id,p));remote.forEach(p=>{if(!merged.has(p.id))merged.set(p.id,p);});const mine=[...merged.values()];if(!mine.length){box.textContent='Aucun projet nommé accessible. Enregistre depuis le Studio; le Pi conservera les projets si tu l’as connecté.';return;}box.textContent='';mine.slice(0,12).forEach(p=>{const row=document.createElement('div');row.className='match-row';const name=document.createElement('span');name.textContent=(p.title||p.name||p.id).replace(/_/g,' ');const button=document.createElement('button');button.className='btn sm';button.textContent='Continuer';button.onclick=async()=>{try{let meta;if(p.source==='Pi'){const files=await A.piReadProject(p.id);meta=JSON.parse(files['project.json']||'{}');}else{const blob=await A.api('/api/sd/download?path='+encodeURIComponent((p.path||('/sd/PROJECTS/MY_PROJECTS/'+p.id))+'/project.json'),{raw:true});meta=JSON.parse(await blob.text());}if(!meta.spec)throw new Error('Ce projet ne contient pas de fiche Studio.');A.openInStudio(meta.spec);}catch(e){toast('Reprise impossible : '+e.message,'bad');}};row.append(name,button);box.append(row);});}
  A.page({id:'create',title:'Créer un projet',icon:'wand',group:'build',desc:'Décris le besoin et réponds aux choix de l’assistant',render:function(el){fresh();draw(el);loadSaved(el);}});
  A.commands.push({title:'Créer un projet avec l’assistant',group:'Action',icon:'wand',run:function(){A.go('create');}},
    {title:'Compagnon Raspberry Pi',group:'Outils',icon:'cpu',run:function(){A.go('companion');}});
})();
/* ---- 38_bench.js ---- */
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
/* ---- 40_tools.js ---- */
/* Outils de l'électronicien : brochage, base I2C, calculateurs (LED, pont diviseur, code couleur, PWM, ADC,
 * budget énergétique), fuseaux horaires POSIX et convertisseur de bases. Tout fonctionne hors ligne. */
(function () {
  'use strict';
  const A = window.APP, LAB = window.LAB;
  const { $, $$, esc, icon, store, copyText, fmtNum } = A;

  const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
  const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  function nearestE(v, series, up) {
    if (!(v > 0)) return null;
    const dec = Math.pow(10, Math.floor(Math.log10(v)));
    const cands = [];
    [dec / 10, dec, dec * 10].forEach((d) => series.forEach((s) => cands.push(+(s * d).toPrecision(3))));
    if (up) return cands.filter((c) => c >= v * 0.999).sort((a, b) => a - b)[0];
    return cands.sort((a, b) => Math.abs(a - v) - Math.abs(b - v))[0];
  }
  const fmtOhm = (r) => (r == null ? '—' : r >= 1e6 ? fmtNum(r / 1e6, 2) + ' MΩ' : r >= 1e3 ? fmtNum(r / 1e3, 2) + ' kΩ' : fmtNum(r, 1) + ' Ω');
  const COLORS = [['noir', '#1b1b1b'], ['marron', '#7b3f1d'], ['rouge', '#d62828'], ['orange', '#f77f00'], ['jaune', '#fcbf49'], ['vert', '#2a9d4b'], ['bleu', '#1d4ed8'], ['violet', '#7c3aed'], ['gris', '#8a8f98'], ['blanc', '#f4f4f4']];
  const MULT = [[1, 'noir'], [10, 'marron'], [100, 'rouge'], [1e3, 'orange'], [1e4, 'jaune'], [1e5, 'vert'], [1e6, 'bleu'], [1e7, 'violet'], [0.1, 'or'], [0.01, 'argent']];
  const TOL = [['±1 %', 'marron', '#7b3f1d'], ['±2 %', 'rouge', '#d62828'], ['±5 %', 'or', '#c9a227'], ['±10 %', 'argent', '#b8bcc4']];
  const colHex = (n) => (COLORS.find((c) => c[0] === n) || (n === 'or' ? [0, '#c9a227'] : n === 'argent' ? [0, '#b8bcc4'] : [0, '#999']))[1];

  /* Base de données I2C : modules du catalogue + composants courants. */
  const I2C_EXTRA = [
    ['0x0D', 'QMC5883L (boussole)'], ['0x10', 'VEML7700 (lux)'], ['0x1E', 'HMC5883L (boussole)'], ['0x20', 'PCF8574 / MCP23017 (E/S)'], ['0x23', 'BH1750 (lux)'],
    ['0x27', 'LCD I2C (PCF8574)'], ['0x29', 'VL53L0X / VL53L1X / TCS34725'], ['0x36', 'AS5600 (angle) / MAX17048 (jauge batterie)'], ['0x38', 'AHT10 / AHT20 / PCF8574A'], ['0x39', 'APDS-9960 / TSL2561'],
    ['0x3C', 'OLED SSD1306 / SH1106'], ['0x3D', 'OLED SSD1306 (ADDR=1)'], ['0x3F', 'LCD I2C (PCF8574A)'], ['0x40', 'INA219 / INA226 / HTU21D / Si7021 / PCA9685'], ['0x41', 'INA219 (A0=1)'],
    ['0x44', 'SHT30 / SHT31 / SHT40'], ['0x45', 'SHT3x (ADDR=1)'], ['0x48', 'ADS1115 / ADS1015 / TMP102 / PCF8591'], ['0x49', 'ADS1115 (ADDR=VDD)'], ['0x4A', 'ADS1115 (ADDR=SDA) / MAX44009'],
    ['0x50', 'EEPROM AT24C32 (module DS3231)'], ['0x53', 'ADXL345'], ['0x57', 'MAX30102 / EEPROM DS3231'], ['0x58', 'SGP30'], ['0x59', 'SGP40 / SGP41'], ['0x5A', 'MLX90614 / CCS811 / MPR121'],
    ['0x5B', 'CCS811 (ADDR=1)'], ['0x5C', 'BH1750 (ADDR=1) / AM2320'], ['0x60', 'MCP4725 (DAC) / SI1145'], ['0x61', 'SCD30'], ['0x62', 'SCD40 / SCD41'], ['0x68', 'DS3231 / DS1307 / MPU6050 / MPU9250'],
    ['0x69', 'MPU6050 (AD0=1)'], ['0x6A', 'LSM6DS3 / ISM330'], ['0x70', 'TCA9548A (multiplexeur) / HT16K33'], ['0x76', 'BME280 / BMP280 / BME680'], ['0x77', 'BME280 / BMP180 / BMP085 / BME680 / MS5611']
  ];
  function i2cDb() {
    const db = {};
    const add = (a, n, id) => { a = a.toLowerCase(); (db[a] = db[a] || []); if (!db[a].some((x) => x.n === n)) db[a].push({ n, id }); };
    (LAB.MODULES || []).forEach((m) => (m.addr || []).forEach((a) => add(a, m.name, m.id)));
    I2C_EXTRA.forEach(([a, n]) => { if (!db[a.toLowerCase()]) add(a, n); });   // composants hors catalogue seulement
    return db;
  }

  const TZ = [
    ['Paris, Bruxelles, Genève (CET/CEST)', 'CET-1CEST,M3.5.0,M10.5.0/3'], ['Londres, Lisbonne (GMT/BST)', 'GMT0BST,M3.5.0/1,M10.5.0'], ['Montréal, New York (EST/EDT)', 'EST5EDT,M3.2.0,M11.1.0'],
    ['Chicago (CST/CDT)', 'CST6CDT,M3.2.0,M11.1.0'], ['Los Angeles (PST/PDT)', 'PST8PDT,M3.2.0,M11.1.0'], ['Dakar, Abidjan (GMT)', 'GMT0'], ['Casablanca (+01)', '<+01>-1'], ['Alger, Tunis (CET)', 'CET-1'],
    ['Kinshasa, Lagos, Douala (WAT)', 'WAT-1'], ['Le Caire (EET/EEST)', 'EET-2EEST,M4.5.5/0,M10.5.4/24'], ['Maurice (+04)', '<+04>-4'], ['La Réunion (+04)', '<+04>-4'], ['Martinique, Guadeloupe (AST)', 'AST4'],
    ['Guyane (-03)', '<-03>3'], ['Nouvelle-Calédonie (+11)', '<+11>-11'], ['Polynésie, Tahiti (-10)', 'HST10'], ['Moscou (MSK)', 'MSK-3'], ['Dubaï (+04)', '<+04>-4'], ['Inde (IST)', 'IST-5:30'],
    ['Pékin, Shanghai (CST)', 'CST-8'], ['Tokyo (JST)', 'JST-9'], ['Sydney (AEST/AEDT)', 'AEST-10AEDT,M10.1.0,M4.1.0/3'], ['UTC', 'UTC0']
  ];
  const LED_VF = [['Rouge', 2.0, '#d62828'], ['Jaune / orange', 2.1, '#f7b500'], ['Verte', 2.2, '#2a9d4b'], ['Bleue', 3.1, '#1d4ed8'], ['Blanche', 3.1, '#e8e8e8'], ['Infrarouge', 1.3, '#6b2020'], ['UV', 3.4, '#7c3aed']];
  const POWER_PRESETS = [
    ['ESP32 actif + Wi-Fi', 120], ['ESP32 actif sans Wi-Fi', 45], ['ESP32 modem-sleep', 20], ['ESP32 light-sleep', 0.8], ['ESP32 deep-sleep (module nu)', 0.01], ['Carte DevKit en deep-sleep (régulateur + LED)', 8],
    ['OLED 0,96" SSD1306', 20], ['LCD 16×2 rétroéclairé', 25], ['DHT22 (mesure)', 1.5], ['BME280', 0.7], ['Capteur de sol capacitif', 5], ['Module relais 5 V (bobine)', 70], ['Servo SG90 (en mouvement)', 250],
    ['LED 5 mm', 10], ['Ruban WS2812B (par LED, blanc 100 %)', 60], ['GPS NEO-6M', 45], ['LoRa SX1276 (émission)', 120], ['MQ-2 (chauffage)', 150], ['Écran TFT ILI9341', 80]
  ];

  const TABS = [
    ['pins', 'Brochage', 'pin'], ['i2c', 'Adresses I2C', 'search'], ['power', 'Budget énergie', 'battery'], ['led', 'Résistance de LED', 'zap'], ['div', 'Pont diviseur', 'resistor'],
    ['color', 'Code couleur', 'resistor'], ['pwm', 'PWM (LEDC)', 'wave'], ['adc', 'ADC', 'gauge'], ['tz', 'Fuseaux horaires', 'clock'], ['num', 'Hex / bin', 'code']
  ];

  A.page({
    id: 'tools', title: 'Outils', icon: 'tool', group: 'build', mobile: false,
    desc: 'Brochage, adresses I2C, calculateurs, fuseaux',
    render(el, q) {
      let tab = (q && q.t) || store.get('tools.tab', 'pins');
      el.innerHTML = `<div class="tabs" id="tl-tabs">${TABS.map(([k, n, i]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${icon(i)}${n}</button>`).join('')}</div><div class="tab-panel" id="tl-body"></div>`;
      let body = $('#tl-body', el);
      const show = () => {
        store.set('tools.tab', tab);
        const nb = body.cloneNode(false);   // conteneur neuf : pas d'écouteurs résiduels de l'outil précédent
        body.replaceWith(nb);
        body = nb;
        const fn = TOOLS[tab];
        if (fn) fn(body);
      };
      $('#tl-tabs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; $$('#tl-tabs button', el).forEach((x) => x.classList.toggle('on', x === b)); show(); });
      show();
    }
  });

  /* Petit moteur de formulaire : chaque champ [data-k] déclenche calc() à la saisie. */
  function form(el, html, calc) {
    el.innerHTML = html;
    const vals = () => { const o = {}; $$('[data-k]', el).forEach((i) => { o[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; }); return o; };
    const run = () => { try { calc(vals(), el); } catch (e) { console.error(e); } };
    el.addEventListener('input', run);
    el.addEventListener('change', run);
    run();
  }
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; };

  const TOOLS = {
    pins(el) {
      let board = store.get('tools.board', 'esp32'), sel = null;
      const draw = () => {
        const b = LAB.BOARDS[board];
        const gpios = Array.from(new Set([].concat(A.LAYOUTS[board].left, A.LAYOUTS[board].right).filter((g) => typeof g === 'number'))).sort((x, y) => x - y);
        el.innerHTML = `<div class="grid g-2"><div class="card"><div class="card-h"><div class="grow"><h2>${esc(b.name)}</h2><div class="card-sub">Vue de dessus, connecteur USB en bas. Survolez ou touchez une broche.</div></div><div class="seg" id="pb-b">${Object.keys(LAB.BOARDS).map((k) => `<button data-b="${k}" class="${k === board ? 'on' : ''}">${LAB.BOARDS[k].short}</button>`).join('')}</div></div><div class="card-b">${A.boardView(board, sel != null ? { [sel]: { label: '◀ sélectionnée', bus: false } } : null, { caps: true })}</div></div>
          <div class="stack"><div class="card pad" id="pb-detail">${sel != null ? detail(b, sel) : '<div class="small muted">Sélectionnez une broche pour voir ses fonctions et ses pièges.</div>'}</div>
          <div class="card"><div class="card-h"><h2 class="grow">Toutes les broches</h2></div><div class="card-b flush" style="margin-top:8px"><div class="table-wrap" style="max-height:460px"><table class="tbl"><thead><tr><th>GPIO</th><th>Fonctions</th><th>Remarque</th></tr></thead><tbody>${gpios.map((g) => `<tr class="click" data-g="${g}"><td class="mono"><b>${g}</b></td><td class="small">${esc(A.pinInfo(b, g).join(' · ') || 'E/S numérique')}</td><td class="small ${b.reserved[g] ? '' : b.caution[g] ? '' : 'muted'}" style="${b.reserved[g] ? 'color:var(--bad)' : b.caution[g] ? 'color:var(--warn)' : ''}">${esc(b.reserved[g] || b.caution[g] || 'libre')}</td></tr>`).join('')}</tbody></table></div></div></div>
          <div class="card pad"><h3 style="margin-bottom:8px">À savoir</h3><ul class="small" style="margin:0;padding-left:18px">${(b.notes || []).map((n) => `<li>${esc(n)}</li>`).join('')}<li>Bus I2C par défaut : SDA ${b.i2c.sda}, SCL ${b.i2c.scl} · SPI : SCK ${b.spi.sck}, MISO ${b.spi.miso}, MOSI ${b.spi.mosi}, SS ${b.spi.ss}.</li><li>Toutes les broches sont en 3,3 V : un signal 5 V doit passer par un pont diviseur ou un convertisseur de niveau.</li></ul></div></div></div>`;
      };
      const detail = (b, g) => {
        const f = A.pinInfo(b, g);
        return `<div class="row" style="margin-bottom:10px"><div class="icon-tile accent"><b class="mono">${g}</b></div><div><h3>GPIO${g}</h3><div class="small muted">${esc(f.join(' · ') || 'Entrée / sortie numérique')}</div></div></div>
          <dl class="dl"><dt>Sortie</dt><dd>${b.inOnly.includes(g) ? '<span class="badge bad">non (entrée seule)</span>' : '<span class="badge ok">oui</span>'}</dd><dt>Tirage interne</dt><dd>${b.inOnly.includes(g) ? 'aucun (résistance externe)' : 'pull-up / pull-down'}</dd>
          <dt>Analogique</dt><dd>${b.adc.includes(g) ? 'ADC1 : utilisable avec le Wi-Fi' : 'non (ou ADC2, bloqué par le Wi-Fi)'}</dd><dt>Tactile</dt><dd>${b.touch.includes(g) ? 'oui (touchRead)' : 'non'}</dd><dt>PWM</dt><dd>${b.inOnly.includes(g) ? 'non' : 'oui (LEDC, toutes sorties)'}</dd>
          ${b.reserved[g] ? `<dt>Réservée</dt><dd style="color:var(--bad)">${esc(b.reserved[g])}</dd>` : ''}${b.caution[g] ? `<dt>Attention</dt><dd style="color:var(--warn)">${esc(b.caution[g])}</dd>` : ''}</dl>`;
      };
      el.onclick = (e) => {
        const bb = e.target.closest('[data-b]'); if (bb) { board = bb.dataset.b; sel = null; store.set('tools.board', board); draw(); return; }
        const p = e.target.closest('[data-gpio],[data-g]'); if (p) { sel = Number(p.dataset.gpio || p.dataset.g); draw(); }
      };
      draw();
    },

    i2c(el) {
      const db = i2cDb();
      let q = '', sel = null;
      el.innerHTML = `<div class="grid g-2"><div class="card"><div class="card-h"><div class="grow"><h2>Carte des adresses (7 bits)</h2><div class="card-sub">Comme <code>i2cdetect</code> : chaque case occupée correspond à au moins un composant connu.</div></div></div><div class="card-b" id="i2-grid"></div></div>
        <div class="stack"><div class="card pad"><div class="input-icon">${icon('search')}<input class="input" id="i2-q" placeholder="0x3C, OLED, BME280…" autocomplete="off"></div><div id="i2-res" style="margin-top:12px"></div></div>
        <div class="card pad small"><h3 style="margin-bottom:6px">Deux composants à la même adresse ?</h3><ul style="margin:0;padding-left:18px"><li>Changez l'adresse si le module le permet (broche ADDR, AD0, SDO, cavalier A0-A2).</li><li>Sinon, utilisez un multiplexeur TCA9548A (0x70) : 8 bus séparés.</li><li>Ou un second bus : <code>TwoWire bus2 = TwoWire(1); bus2.begin(sda, scl);</code></li><li>Adresses 0x00-0x07 et 0x78-0x7F réservées par la norme.</li></ul>
          <p style="margin-top:8px">Le job <b>Scan I2C</b> d'un worker liste ce qui est réellement branché.</p></div></div></div>`;
      const draw = () => {
        const nq = A.norm(q.trim());
        let cells = '<div style="display:grid;grid-template-columns:34px repeat(16,1fr);gap:3px;font-family:var(--mono);font-size:11px">';
        cells += '<span></span>' + Array.from({ length: 16 }, (_, i) => `<span class="muted" style="text-align:center">${i.toString(16)}</span>`).join('');
        for (let r = 0; r < 8; r++) {
          cells += `<span class="muted">${(r * 16).toString(16).padStart(2, '0')}</span>`;
          for (let c = 0; c < 16; c++) {
            const a = r * 16 + c, key = '0x' + a.toString(16).padStart(2, '0');
            const dev = db[key], reservedA = a < 8 || a > 0x77;
            const match = nq && dev && (key.includes(nq) || dev.some((d) => A.norm(d.n).includes(nq)));
            const bg = sel === key ? 'var(--accent)' : match ? 'var(--warn)' : dev ? 'var(--accent-soft)' : 'var(--surface-2)';
            cells += `<button data-a="${key}" title="${esc(dev ? dev.map((d) => d.n).join(', ') : key)}" style="aspect-ratio:1;border:1px solid var(--line);border-radius:5px;background:${bg};color:${sel === key ? '#fff' : dev ? 'var(--accent-text)' : 'var(--text-3)'};font:inherit;cursor:${dev ? 'pointer' : 'default'};opacity:${reservedA ? 0.35 : 1};padding:0">${dev ? a.toString(16).padStart(2, '0') : '·'}</button>`;
          }
        }
        $('#i2-grid', el).innerHTML = cells + '</div>';
        let list = Object.entries(db);
        if (sel) list = list.filter(([a]) => a === sel);
        else if (nq) list = list.filter(([a, d]) => a.includes(nq) || d.some((x) => A.norm(x.n).includes(nq)));
        else list = list.filter(([a]) => ['0x3c', '0x76', '0x68', '0x27', '0x23', '0x40'].includes(a));
        list.sort((x, y) => parseInt(x[0], 16) - parseInt(y[0], 16));
        $('#i2-res', el).innerHTML = (!sel && !nq ? '<div class="small muted" style="margin-bottom:8px">Adresses les plus courantes :</div>' : '') + (list.length ? `<div class="statlist">${list.map(([a, d]) => `<div style="align-items:flex-start"><span class="badge accent mono">${a}</span><span style="text-align:right">${d.map((x) => x.id ? `<a href="#library?p=${esc(x.id)}">${esc(x.n)}</a>` : esc(x.n)).join('<br>')}</span></div>`).join('')}</div>` : '<div class="small muted">Aucun composant connu.</div>');
      };
      $('#i2-q', el).addEventListener('input', (e) => { q = e.target.value; sel = null; draw(); });
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; sel = sel === b.dataset.a ? null : b.dataset.a; draw(); });
      draw();
    },

    power(el) {
      let rows = store.get('tools.power', [['ESP32 actif + Wi-Fi', 120, 5], ['ESP32 deep-sleep (module nu)', 0.01, 95], ['BME280', 0.7, 5]]);
      const save = () => store.set('tools.power', rows);
      const draw = () => {
        const cap = store.get('tools.cap', 2500), eff = store.get('tools.eff', 85);
        const avg = rows.reduce((s, r) => s + Number(r[1] || 0) * Number(r[2] || 0) / 100, 0);
        const peak = rows.reduce((s, r) => s + (Number(r[2]) > 0 ? Number(r[1] || 0) : 0), 0);
        const h = (cap * eff / 100) / Math.max(1e-6, avg);
        el.innerHTML = `<div class="grid g-3"><div class="card span-2"><div class="card-h"><div class="grow"><h2>Budget énergétique</h2><div class="card-sub">Pour chaque élément : courant consommé et pourcentage du temps où il est actif.</div></div><button class="btn sm" id="pw-add">${icon('plus')}Ajouter</button></div>
          <div class="card-b"><div class="table-wrap"><table class="tbl"><thead><tr><th>Élément</th><th style="width:110px">Courant (mA)</th><th style="width:110px">Temps actif (%)</th><th style="width:90px">Moyenne</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr><td><input class="input sm" data-i="${i}" data-c="0" value="${esc(r[0])}" list="pw-presets"></td><td><input class="input sm" type="number" min="0" step="any" data-i="${i}" data-c="1" value="${esc(r[1])}"></td><td><input class="input sm" type="number" min="0" max="100" step="any" data-i="${i}" data-c="2" value="${esc(r[2])}"></td><td class="num small">${fmtNum(r[1] * r[2] / 100, 3)} mA</td><td><button class="btn sm icon ghost" data-del="${i}" aria-label="Supprimer">${icon('x')}</button></td></tr>`).join('')}</tbody></table></div>
          <datalist id="pw-presets">${POWER_PRESETS.map(([n]) => `<option value="${esc(n)}">`).join('')}</datalist><div class="hint" style="margin-top:8px">Astuce : choisissez un nom dans la liste pour remplir le courant automatiquement.</div></div></div>
          <div class="card pad stack" style="gap:12px"><div class="field"><label>Batterie (mAh)</label><input class="input" type="number" id="pw-cap" value="${cap}" min="10" step="50"></div>
            <div class="field"><label>Rendement du régulateur : <b>${eff} %</b></label><input type="range" id="pw-eff" min="50" max="100" value="${eff}"></div>
            <div><div class="small muted">Consommation moyenne</div><div class="calc-out">${fmtNum(avg, 2)} mA</div></div>
            <div><div class="small muted">Autonomie estimée</div><div class="calc-out" style="color:var(--ok)">${h > 48 ? fmtNum(h / 24, 1) + ' jours' : fmtNum(h, 1) + ' h'}</div></div>
            <div class="small">Pointe (tout actif) : <b>${fmtNum(peak, 0)} mA</b> ${peak > 500 ? '<span class="badge warn">alim. externe</span>' : ''}</div>
            <div class="hint">Une batterie Li-ion 18650 fait 2500 à 3500 mAh. Pour tenir des mois, visez une moyenne &lt; 1 mA (deep-sleep, module nu sans LED ni régulateur gourmand).</div></div></div>`;
        $('#pw-add', el).onclick = () => { rows.push(['Nouvel élément', 10, 100]); save(); draw(); };
        $('#pw-cap', el).onchange = (e) => { store.set('tools.cap', Number(e.target.value) || 2500); draw(); };
        $('#pw-eff', el).oninput = (e) => { store.set('tools.eff', Number(e.target.value)); draw(); };
      };
      el.onchange = (e) => {
        const t = e.target;
        if (t.dataset.i == null) return;
        const r = rows[Number(t.dataset.i)], c = Number(t.dataset.c);
        r[c] = c === 0 ? t.value : Number(t.value);
        if (c === 0) { const p = POWER_PRESETS.find((x) => x[0] === t.value); if (p) r[1] = p[1]; }
        save(); draw();
      };
      el.onclick = (e) => { const d = e.target.closest('[data-del]'); if (d) { rows.splice(Number(d.dataset.del), 1); save(); draw(); } };
      draw();
    },

    led(el) {
      form(el, `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>Résistance série d'une LED</h2>
        <div class="field"><label>Couleur</label><div class="chips">${LED_VF.map(([n, v, c], i) => `<button class="chip" data-vf="${v}"><span class="color-sw" style="background:${c}"></span>${n}</button>`).join('')}</div></div>
        <div class="form-grid"><div class="field"><label>Tension d'alimentation (V)</label><input class="input" data-k="vs" value="3.3"></div><div class="field"><label>Tension de seuil Vf (V)</label><input class="input" data-k="vf" id="led-vf" value="2.0"></div>
        <div class="field"><label>Courant (mA)</label><input class="input" data-k="i" value="10"></div><div class="field"><label>Nombre de LED en série</label><input class="input" data-k="n" value="1"></div></div></div>
        <div class="card pad" id="led-out"></div></div>`, (v, root) => {
        const vs = num(v.vs), vf = num(v.vf) * (num(v.n) || 1), i = num(v.i) / 1000;
        const out = $('#led-out', root);
        if (!(vs > vf)) { out.innerHTML = `<div class="banner warn">${icon('alert')}<div>La tension d'alimentation doit dépasser la somme des Vf (${fmtNum(vf, 2)} V).</div></div>`; return; }
        const r = (vs - vf) / i, e = nearestE(r, E12, true), ie = (vs - vf) / e, p = (vs - vf) * ie;
        out.innerHTML = `<div class="small muted">Valeur calculée</div><div class="calc-out">${fmtOhm(r)}</div><div class="divider"></div>
          <div class="small muted">Valeur normalisée E12 (au-dessus, plus sûre)</div><div class="calc-out" style="color:var(--ok)">${fmtOhm(e)}</div>
          <dl class="dl" style="margin-top:12px"><dt>Courant réel</dt><dd>${fmtNum(ie * 1000, 1)} mA</dd><dt>Puissance dissipée</dt><dd>${fmtNum(p * 1000, 1)} mW → résistance ${p > 0.2 ? '<b>1/2 W</b>' : '1/4 W'}</dd></dl>
          <p class="hint" style="margin-top:10px">Une broche ESP32 fournit au plus ~20 mA (40 mA absolu). Au-delà, passez par un transistor ou un MOSFET logique.</p>`;
      });
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-vf]'); if (b) { const i = $('#led-vf', el); i.value = b.dataset.vf; i.dispatchEvent(new Event('input', { bubbles: true })); } });
    },

    div(el) {
      form(el, `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>Pont diviseur de tension</h2><p class="small muted">Vout = Vin × R2 / (R1 + R2). Idéal pour mesurer une batterie ou adapter un signal 5 V vers 3,3 V.</p>
        <div class="form-grid"><div class="field"><label>Vin (V)</label><input class="input" data-k="vin" value="5"></div><div class="field"><label>Vout souhaitée (V)</label><input class="input" data-k="target" value="3.1"></div>
        <div class="field"><label>R1 (haut, Ω)</label><input class="input" data-k="r1" value="10000"></div><div class="field"><label>R2 (bas, Ω)</label><input class="input" data-k="r2" value="20000"></div></div>
        <svg viewBox="0 0 220 150" style="width:100%;max-width:280px;margin:auto;display:block;color:var(--text-2)"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M40 10v20M40 70v20M40 130v10M40 90h110"/><rect x="30" y="30" width="20" height="40" rx="3"/><rect x="30" y="90" width="20" height="40" rx="3"/><path d="M30 140h20"/></g><g fill="currentColor" font-size="12" font-family="sans-serif"><text x="58" y="54">R1</text><text x="58" y="114">R2</text><text x="48" y="14">Vin</text><text x="154" y="94">Vout → ADC</text><text x="56" y="146">GND</text></g></svg></div>
        <div class="card pad" id="dv-out"></div></div>`, (v, root) => {
        const vin = num(v.vin), r1 = num(v.r1), r2 = num(v.r2), t = num(v.target);
        const vout = vin * r2 / (r1 + r2), ia = vin / (r1 + r2) * 1e6;
        const r2s = t > 0 && t < vin ? nearestE(r1 * t / (vin - t), E24) : null;
        $('#dv-out', root).innerHTML = `<div class="small muted">Tension de sortie</div><div class="calc-out" style="color:${vout > 3.3 ? 'var(--bad)' : 'var(--ok)'}">${fmtNum(vout, 3)} V</div>
          ${vout > 3.3 ? `<div class="banner warn" style="margin:10px 0 0">${icon('alert')}<div>Dépasse 3,3 V : risque de détruire l'entrée de l'ESP32.</div></div>` : vout > 3.1 ? '<p class="small" style="color:var(--warn);margin-top:6px">L\'ADC de l\'ESP32 sature vers 3,1 V (atténuation 11 dB).</p>' : ''}
          <dl class="dl" style="margin-top:12px"><dt>Rapport</dt><dd>${fmtNum(r2 / (r1 + r2), 4)} (× ${fmtNum((r1 + r2) / r2, 3)} pour retrouver Vin)</dd><dt>Courant de fuite</dt><dd>${fmtNum(ia, 1)} µA ${ia > 500 ? '<span class="badge warn">élevé sur batterie</span>' : ''}</dd>
          ${r2s ? `<dt>R2 pour ${fmtNum(t, 2)} V</dt><dd><b>${fmtOhm(r2s)}</b> (E24) → ${fmtNum(vin * r2s / (r1 + r2s), 3)} V</dd>` : ''}</dl>
          <p class="hint" style="margin-top:10px">Dans le code : <code>float vin = analogReadMilliVolts(pin) / 1000.0 * ${fmtNum((r1 + r2) / r2, 4).replace(',', '.')};</code></p>`;
      });
    },

    color(el) {
      let bands = store.get('tools.bands', 4);
      const draw = () => {
        el.innerHTML = `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><div class="row between"><h2>Code couleur des résistances</h2><div class="seg" id="cc-n"><button data-n="4" class="${bands === 4 ? 'on' : ''}">4 bandes</button><button data-n="5" class="${bands === 5 ? 'on' : ''}">5 bandes</button></div></div>
          <div class="form-grid">${Array.from({ length: bands - 2 }, (_, i) => `<div class="field"><label>Chiffre ${i + 1}</label><select class="select" data-k="d${i}">${COLORS.map(([n], k) => `<option value="${k}" ${k === [1, 0, 0][i] ? 'selected' : ''}>${k} · ${n}</option>`).join('')}</select></div>`).join('')}
          <div class="field"><label>Multiplicateur</label><select class="select" data-k="m">${MULT.map(([m, n], k) => `<option value="${k}" ${k === 3 ? 'selected' : ''}>×${m >= 1e3 ? fmtNum(m / 1e3, 0) + 'k' : fmtNum(m, 2)} · ${n}</option>`).join('')}</select></div>
          <div class="field"><label>Tolérance</label><select class="select" data-k="t">${TOL.map(([t, n], k) => `<option value="${k}" ${k === (bands === 4 ? 2 : 0) ? 'selected' : ''}>${t} · ${n}</option>`).join('')}</select></div></div>
          <div class="divider"></div><h3>Et dans l'autre sens</h3><div class="field"><label>Valeur (ex. 4k7, 220, 1M)</label><input class="input" data-k="val" value="4k7"></div><div id="cc-rev"></div></div>
          <div class="card pad" id="cc-out"></div></div>`;
        const calc = () => {
          const v = {}; $$('[data-k]', el).forEach((i) => { v[i.dataset.k] = i.value; });
          const digits = Array.from({ length: bands - 2 }, (_, i) => Number(v['d' + i]));
          const mult = MULT[Number(v.m)], tol = TOL[Number(v.t)];
          const r = Number(digits.join('')) * mult[0];
          const cols = digits.map((d) => COLORS[d][1]).concat([colHex(mult[1]), tol[2]]);
          $('#cc-out', el).innerHTML = `<div class="bands" style="margin-bottom:16px">${cols.map((c) => `<i style="background:${c}"></i>`).join('')}</div><div class="calc-out">${fmtOhm(r)}</div><div class="small muted">${tol[0]} · plage ${fmtOhm(r * (1 - parseFloat(tol[0].replace(/[^0-9.]/g, '')) / 100))} à ${fmtOhm(r * (1 + parseFloat(tol[0].replace(/[^0-9.]/g, '')) / 100))}</div>`;
          const m = String(v.val || '').trim().toLowerCase().replace(',', '.').match(/^(\d*\.?\d*)\s*([rkm]?)(\d*)$/);
          let val = NaN;
          if (m) { const mul = m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1; val = parseFloat((m[1] || '0') + (m[3] ? '.' + m[3] : '')) * mul; }
          if (!(val > 0)) { $('#cc-rev', el).innerHTML = '<span class="small muted">Valeur invalide</span>'; return; }
          const n = bands - 2, exp = Math.floor(Math.log10(val)) - (n - 1), sig = Math.round(val / Math.pow(10, exp));
          const ds = String(sig).padStart(n, '0').slice(0, n).split('').map(Number), mi = MULT.findIndex((x) => Math.abs(Math.log10(x[0]) - exp) < 1e-9);
          $('#cc-rev', el).innerHTML = mi < 0 ? '<span class="small muted">Hors plage</span>' : `<div class="row wrap" style="margin-top:4px">${ds.map((d) => `<span class="badge outline"><span class="color-sw" style="background:${COLORS[d][1]}"></span>${COLORS[d][0]}</span>`).join('')}<span class="badge outline"><span class="color-sw" style="background:${colHex(MULT[mi][1])}"></span>${MULT[mi][1]}</span><span class="badge outline"><span class="color-sw" style="background:${bands === 4 ? '#c9a227' : '#7b3f1d'}"></span>${bands === 4 ? 'or' : 'marron'}</span></div>`;
        };
        el.oninput = calc; el.onchange = calc;
        $('#cc-n', el).onclick = (e) => { const b = e.target.closest('[data-n]'); if (b) { bands = Number(b.dataset.n); store.set('tools.bands', bands); draw(); } };
        calc();
      };
      draw();
    },

    pwm(el) {
      form(el, `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>PWM matériel (LEDC)</h2><p class="small muted">Horloge 80 MHz : fréquence × 2^résolution ≤ 80 000 000. Arduino-ESP32 3.x : <code>ledcAttach(broche, fréquence, bits)</code> puis <code>ledcWrite(broche, rapport)</code>.</p>
        <div class="form-grid"><div class="field"><label>Fréquence (Hz)</label><input class="input" data-k="f" value="5000"></div><div class="field"><label>Rapport cyclique (%)</label><input class="input" data-k="d" value="50"></div></div>
        <div class="field"><label>Usages typiques</label><div class="chips">${[['LED', 5000], ['Servo', 50], ['Ventilateur 4 fils', 25000], ['Moteur CC (L298N)', 1000], ['Buzzer passif (La 440)', 440]].map(([n, f]) => `<button class="chip" data-f="${f}">${n} · ${f} Hz</button>`).join('')}</div></div></div>
        <div class="card pad" id="pw-out"></div></div>`, (v, root) => {
        const f = num(v.f), d = A.clamp(num(v.d), 0, 100);
        const out = $('#pw-out', root);
        if (!(f > 0)) { out.innerHTML = '<span class="small muted">Fréquence invalide</span>'; return; }
        const bits = Math.min(20, Math.floor(Math.log2(80e6 / f)));
        if (bits < 1) { out.innerHTML = `<div class="banner warn">${icon('alert')}<div>Fréquence trop élevée (max 40 MHz à 1 bit).</div></div>`; return; }
        const use = Math.min(bits, 14), max = Math.pow(2, use) - 1, duty = Math.round(max * d / 100);
        const period = 1e6 / f;
        out.innerHTML = `<dl class="dl"><dt>Résolution maximale</dt><dd><b>${bits} bits</b> (${fmtNum(Math.pow(2, bits), 0)} pas)</dd><dt>Résolution conseillée</dt><dd>${use} bits → valeurs 0 à ${fmtNum(max, 0)}</dd><dt>Période</dt><dd>${period >= 1000 ? fmtNum(period / 1000, 2) + ' ms' : fmtNum(period, 2) + ' µs'}</dd><dt>Impulsion haute</dt><dd>${fmtNum(period * d / 100, 2)} µs</dd></dl>
          <svg viewBox="0 0 300 70" style="width:100%;margin:14px 0;color:var(--accent)"><path fill="none" stroke="currentColor" stroke-width="2" d="${[0, 1, 2].map((k) => { const x = 10 + k * 95, w = 95 * d / 100; return `M${x} 60V10H${x + w}V60H${x + 95}`; }).join('')}"/></svg>
          <div class="code"><pre style="padding:12px">ledcAttach(PIN, ${fmtNum(f, 0).replace(/\s/g, '')}, ${use});\nledcWrite(PIN, ${duty});  // ${fmtNum(d, 1)} %</pre></div>
          ${f === 50 ? '<p class="hint" style="margin-top:8px">Servo : 1 ms (0°) à 2 ms (180°) sur 20 ms → en 14 bits, ≈ 819 à 1638.</p>' : ''}`;
      });
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { const i = $('[data-k="f"]', el); i.value = b.dataset.f; i.dispatchEvent(new Event('input', { bubbles: true })); } });
    },

    adc(el) {
      form(el, `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>Convertisseur analogique (ADC 12 bits)</h2>
        <div class="form-grid"><div class="field"><label>Valeur brute (0-4095)</label><input class="input" data-k="raw" value="2048"></div><div class="field"><label>Atténuation</label><select class="select" data-k="att"><option value="3.1">11 dB (0-3,1 V) — défaut</option><option value="1.75">6 dB (0-1,75 V)</option><option value="1.25">2,5 dB (0-1,25 V)</option><option value="0.95">0 dB (0-0,95 V)</option></select></div>
        <div class="field"><label>Rapport du pont diviseur</label><input class="input" data-k="k" value="1"></div><div class="field"><label>Tension de référence capteur (V)</label><input class="input" data-k="vref" value="3.3"></div></div></div>
        <div class="card pad" id="ad-out"></div></div>`, (v, root) => {
        const raw = A.clamp(num(v.raw), 0, 4095), fs = num(v.att), k = num(v.k) || 1;
        const vpin = raw / 4095 * fs;
        $('#ad-out', root).innerHTML = `<div class="small muted">Tension sur la broche (approx.)</div><div class="calc-out">${fmtNum(vpin, 3)} V</div><div class="small muted" style="margin-top:10px">Tension mesurée (× ${fmtNum(k, 3)})</div><div class="calc-out" style="color:var(--ok)">${fmtNum(vpin * k, 3)} V</div>
          <dl class="dl" style="margin-top:12px"><dt>Pourcentage</dt><dd>${fmtNum(raw / 4095 * 100, 1)} %</dd><dt>Résolution</dt><dd>${fmtNum(fs / 4095 * 1000, 2)} mV / pas</dd><dt>Ratio capteur</dt><dd>${fmtNum(vpin / num(v.vref) * 100, 1)} % de ${esc(v.vref)} V</dd></dl>
          <p class="hint" style="margin-top:10px">Préférez <code>analogReadMilliVolts(pin)</code> : il applique la calibration d'usine (eFuse) et corrige la non-linéarité. Moyennez 8 à 16 lectures pour réduire le bruit.</p>`;
      });
    },

    tz(el) {
      el.innerHTML = `<div class="card"><div class="card-h"><div class="grow"><h2>Fuseaux horaires POSIX</h2><div class="card-sub">À utiliser avec <code>configTzTime(tz, "pool.ntp.org")</code> ou dans les réglages du MASTER. Heure d'été incluse.</div></div></div>
        <div class="card-b flush" style="margin-top:8px"><div class="table-wrap"><table class="tbl responsive"><thead><tr><th>Zone</th><th>Chaîne TZ</th><th></th></tr></thead><tbody>${TZ.map(([n, t]) => `<tr><td class="wide"><b>${esc(n)}</b></td><td data-l="TZ" class="mono small">${esc(t)}</td><td><button class="btn sm" data-act="copy" data-text="${esc(t)}">${icon('copy')}Copier</button></td></tr>`).join('')}</tbody></table></div></div></div>`;
    },

    num(el) {
      form(el, `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>Convertisseur de bases</h2><p class="small muted">Registres, masques, adresses : saisissez un nombre en décimal, 0x… (hexa) ou 0b… (binaire).</p>
        <div class="field"><label>Valeur</label><input class="input mono" data-k="v" value="0x3C"></div></div><div class="card pad" id="nm-out"></div></div>`, (v, root) => {
        const s = String(v.v).trim().toLowerCase().replace(/_/g, '');
        let n = NaN;
        if (/^0x[0-9a-f]+$/.test(s)) n = parseInt(s.slice(2), 16);
        else if (/^0b[01]+$/.test(s)) n = parseInt(s.slice(2), 2);
        else if (/^-?\d+$/.test(s)) n = parseInt(s, 10);
        const out = $('#nm-out', root);
        if (!isFinite(n) || n < 0 || n > 0xffffffff) { out.innerHTML = '<span class="small muted">Nombre non reconnu (0 à 4 294 967 295).</span>'; return; }
        const bin = n.toString(2).padStart(Math.max(8, Math.ceil(n.toString(2).length / 8) * 8), '0');
        out.innerHTML = `<dl class="dl"><dt>Décimal</dt><dd class="mono">${n}</dd><dt>Hexadécimal</dt><dd class="mono">0x${n.toString(16).toUpperCase().padStart(2, '0')}</dd><dt>Binaire</dt><dd class="mono">0b${bin.replace(/(.{4})(?=.)/g, '$1 ')}</dd><dt>Octal</dt><dd class="mono">0${n.toString(8)}</dd>${n < 128 ? `<dt>Adresse I2C 8 bits</dt><dd class="mono">écriture 0x${(n << 1).toString(16).toUpperCase()} · lecture 0x${((n << 1) | 1).toString(16).toUpperCase()}</dd>` : ''}${n >= 32 && n < 127 ? `<dt>Caractère ASCII</dt><dd class="mono">'${esc(String.fromCharCode(n))}'</dd>` : ''}</dl>
          <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-top:14px">${bin.slice(-8).split('').map((b, i) => `<div style="text-align:center"><div class="tiny muted">b${7 - i}</div><div style="padding:6px 0;border-radius:6px;background:${b === '1' ? 'var(--accent)' : 'var(--surface-3)'};color:${b === '1' ? '#fff' : 'var(--text-3)'};font-family:var(--mono)">${b}</div></div>`).join('')}</div>`;
      });
    }
  };
  A.commands.push({ title: 'Brochage de l\'ESP32', group: 'Outil', icon: 'pin', run: () => A.go('tools', { t: 'pins' }) }, { title: 'Adresses I2C', group: 'Outil', icon: 'search', run: () => A.go('tools', { t: 'i2c' }) }, { title: 'Autonomie sur batterie', group: 'Outil', icon: 'battery', run: () => A.go('tools', { t: 'power' }) }, { title: 'Résistance de LED', group: 'Outil', icon: 'zap', run: () => A.go('tools', { t: 'led' }) }, { title: 'Code couleur des résistances', group: 'Outil', icon: 'resistor', run: () => A.go('tools', { t: 'color' }) });
})();
/* ---- 42_netmon.js ---- */
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
/* ---- 43_link.js ---- */
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
/* ---- 44_boards.js ---- */
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
/* ---- 46_flash.js ---- */
/* Flash & montages : page « USB & Flash » (Arduino, ESP32, ESP32-S3, ESP32-C3 par câble) avec moniteur de flash,
 * flash d'un worker par Wi-Fi avec moniteur, aperçu du montage de chaque firmware, onglets Moniteur et GPIO
 * des workers, identification des adresses I2C. */
(function () {
  'use strict';
  const A = window.APP, LAB = window.LAB;
  const { $, $$, esc, icon, api, post, postJSON, toast, drawer, confirmBox, fmtBytes, fmtNum, fmtDur, store, download, S } = A;

  const BOARD_NAMES = { avr: 'Arduino Uno / Nano', esp32: 'ESP32 Dev Module', esp32s3: 'ESP32-S3', esp32c3: 'ESP32-C3' };
  const PROFILES = [['ATmega328P_Optiboot', 'Uno / Nano (bootloader récent) · 115200'], ['ATmega328P_Old', 'Nano « Old Bootloader » · 57600'], ['ATmega168P_STK500', 'ATmega168 (Diecimila, Nano 168) · 19200']];
  const sdUrl = (p) => '/api/sd/download?inline=1&path=' + encodeURIComponent(p);
  const espBin = (id, board) => `/sd/PROJECTS/LIBRARY/${id}/bin/${board}/${id}.bin`;

  /* ---------- styles scopés ---------- */
  (function style() {
    if (document.getElementById('fl-style')) return;
    const s = document.createElement('style');
    s.id = 'fl-style';
    s.textContent = `
      .montage{background:#fff;border:1px solid var(--line);border-radius:10px;overflow:auto;padding:6px}
      .montage svg,.montage img{display:block;width:100%;height:auto;max-width:980px;margin:auto}
      .fl-list{border:1px solid var(--line);border-radius:10px;max-height:280px;overflow:auto;margin-top:8px}
      .fl-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--line);cursor:pointer}
      .fl-item:last-child{border-bottom:0}
      .fl-item:hover{background:var(--surface-2)}
      .fl-item.on{background:color-mix(in srgb,var(--accent) 14%,transparent)}
      .fl-item .t{font-weight:600}
      .fl-log{font:12px/1.5 ui-monospace,Consolas,monospace;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:10px 12px;max-height:240px;overflow:auto;white-space:pre-wrap}
      .fl-steps{display:flex;gap:6px;flex-wrap:wrap}
      .fl-steps span{font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);color:var(--text-3)}
      .fl-steps span.done{color:var(--ok);border-color:var(--ok)}
      .fl-steps span.cur{color:var(--accent);border-color:var(--accent);font-weight:700}
      .gpio-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
      .gpio-grid button{font:600 13px var(--font);padding:8px 4px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--text);cursor:pointer}
      .gpio-grid button.adc{border-style:dashed}
      .gpio-grid button.on{background:var(--accent);border-color:var(--accent);color:#fff}
      .gpio-level{font-size:34px;font-weight:800;font-variant-numeric:tabular-nums}`;
    document.head.appendChild(s);
  })();

  /* ---------- contexte et montage d'un firmware ---------- */
  A.firmwareContext = function (path) {
    if (!path) return null;
    let m = /\/LIBRARY\/([^/]+)\/bin\/(esp32s3|esp32c3|esp32)\//.exec(path);
    if (m) return { kind: 'esp', id: m[1], board: m[2] };
    m = /(esp32s3|esp32c3|esp32)__([a-z0-9_]+?)(__bench)?\.ino\.bin$/.exec(path);
    if (m) return { kind: 'esp', id: m[2], board: m[1], bench: !!m[3] };
    m = /\/ARDUINO\/([^/]+)\/[^/]+\.hex$/i.exec(path);
    if (m) return { kind: 'avr', dir: path.replace(/\/[^/]+$/, ''), name: m[1] };
    if (/\.hex$/i.test(path)) return { kind: 'avr', dir: path.replace(/\/[^/]+$/, ''), name: null };
    if (/\.bin$/i.test(path)) return { kind: 'esp' };
    return null;
  };

  function mdToHtml(md) {
    const out = [];
    const lines = md.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^\s*\|/.test(l)) {
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
        i--;
        const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const body = rows.filter((r) => !/^\s*\|\s*-/.test(r));
        out.push(`<div class="table-wrap"><table class="tbl"><thead><tr>${cells(body[0]).map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${body.slice(1).map((r) => `<tr>${cells(r).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      } else if (/^#+\s/.test(l)) out.push(`<h3 style="margin:10px 0 6px">${esc(l.replace(/^#+\s*/, ''))}</h3>`);
      else if (/^!\[/.test(l) || !l.trim()) continue;
      else out.push(`<p class="small" style="margin:4px 0">${esc(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`);
    }
    return out.join('');
  }

  /* HTML du montage d'un firmware : schéma + tableau de câblage. */
  A.montageHtml = async function (ctx) {
    if (!ctx) return '';
    if (ctx.kind === 'esp') {
      const p = ctx.id && A.projectById ? A.projectById(ctx.id) : null;
      if (!p) return `<div class="banner">${icon('info')}<div>Firmware personnalisé : montage inconnu du catalogue.</div></div>`;
      if (p.kind === 'classic') return `<div class="banner">${icon('info')}<div>Projet système « ${esc(p.title)} » : aucun câblage externe.</div></div>`;
      try {
        const spec = JSON.parse(JSON.stringify(p.spec));
        spec.board = ctx.board || spec.board;
        const res = LAB.generate(spec);
        const m = LAB.montageSvg(res, { id: p.id, title: p.title });
        return `<div class="montage">${m.svg}</div><div style="margin-top:10px">${A.wiringTable(res)}</div>` +
          (res.warnings || []).map((w) => `<div class="banner warn" style="margin-top:8px">${icon('alert')}<div>${esc(w)}</div></div>`).join('');
      } catch (e) { return `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
    }
    if (ctx.kind === 'avr' && ctx.dir) {
      let md = '';
      if (!S.demo) {
        try { const r = await fetch(sdUrl(ctx.dir + '/MONTAGE.md'), { credentials: 'same-origin' }); if (r.ok) md = await r.text(); } catch (e) { /* absent */ }
      } else md = A.Demo && A.Demo.fileText ? A.Demo.fileText(ctx.dir + '/MONTAGE.md') : '';
      return `<div class="montage"><img src="${sdUrl(ctx.dir + '/montage.png')}" alt="Schéma de montage" onerror="this.parentNode.innerHTML='<div class=&quot;empty small&quot; style=&quot;padding:16px&quot;>Pas de montage.png dans ce dossier</div>'"></div>` +
        (md ? `<div style="margin-top:10px">${mdToHtml(md)}</div>` : '');
    }
    return '';
  };

  /* ---------- identification I2C (adresses → modules du catalogue) ---------- */
  A.i2cIdentify = function (text) {
    const found = String(text || '').match(/0x[0-9a-fA-F]{2}/g);
    if (!found || !LAB.MODULES) return '';
    const rows = [...new Set(found.map((a) => a.toLowerCase()))].map((a) => {
      const mods = LAB.MODULES.filter((m) => (m.addr || []).some((x) => String(x).toLowerCase() === a)).map((m) => m.name);
      return `<tr><td class="mono"><b>${a.toUpperCase().replace('0X', '0x')}</b></td><td class="small">${mods.length ? mods.slice(0, 5).map(esc).join(', ') : '<span class="muted">composant inconnu du catalogue</span>'}</td></tr>`;
    });
    return `<div class="card pad"><h3 style="margin-bottom:8px">Composants I2C détectés</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>Adresse</th><th>Probablement</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></div>`;
  };

  /* ---------- sélecteur de firmware ---------- */
  function espItems(board) {
    return (A.projects ? A.projects() : []).filter((p) => (p.boards || []).includes(board))
      .map((p) => ({ key: p.id, title: p.title, sub: p.kind === 'module' ? 'capteur / module' : p.kind === 'recipe' ? 'projet complet' : 'classique', path: espBin(p.id, board), ctx: { kind: 'esp', id: p.id, board } }));
  }
  async function avrItems() {
    const items = [];
    try {
      const r = await api('/api/sd/list?path=' + encodeURIComponent('/sd/PROJECTS/ARDUINO'));
      (r.items || []).filter((f) => f.type === 'd').forEach((f) => items.push({ key: f.name, title: f.name.replace(/^\d+_/, '').replace(/_/g, ' '), sub: 'capteurs/' + f.name, path: `/sd/PROJECTS/ARDUINO/${f.name}/${f.name}.hex`, ctx: { kind: 'avr', dir: '/sd/PROJECTS/ARDUINO/' + f.name, name: f.name } }));
    } catch (e) { /* dossier absent */ }
    for (const dir of ['/sd/FIRMWARE', '/sd/FIRMWARE/AVR']) {
      try {
        const r = await api('/api/sd/list?path=' + encodeURIComponent(dir));
        (r.items || []).filter((f) => f.type === 'f' && /\.hex$/i.test(f.name)).forEach((f) => items.push({ key: dir + f.name, title: f.name, sub: dir.replace('/sd/', ''), path: dir + '/' + f.name, ctx: { kind: 'avr', dir, name: null } }));
      } catch (e) { /* dossier absent */ }
    }
    return items.sort((a, b) => a.key.localeCompare(b.key, 'fr', { numeric: true }));
  }

  /* Liste filtrable ; onPick(item) appelé à la sélection. Renvoie { setItems, selected }. */
  function picker(box, onPick) {
    let items = [], sel = null;
    box.innerHTML = `<input class="input" placeholder="Rechercher (bme280, relais, lampe, 24_…)" data-q><div class="fl-list" data-l></div><div class="hint" data-h></div>`;
    const q = $('[data-q]', box), list = $('[data-l]', box), hint = $('[data-h]', box);
    const draw = () => {
      const n = A.norm(q.value);
      const shown = items.filter((it) => !n || A.norm(it.key + ' ' + it.title + ' ' + it.sub).includes(n)).slice(0, 120);
      list.innerHTML = shown.length ? shown.map((it) => `<div class="fl-item ${sel && sel.key === it.key ? 'on' : ''}" data-k="${esc(it.key)}"><div class="grow" style="min-width:0"><div class="t ellipsis">${esc(it.title)}</div><div class="small muted ellipsis mono">${esc(it.sub)}</div></div>${sel && sel.key === it.key ? icon('check') : ''}</div>`).join('')
        : `<div class="empty small" style="padding:16px">${icon('search')}<div>${items.length ? 'Aucun résultat' : 'Aucun firmware trouvé sur la microSD'}</div></div>`;
      hint.textContent = `${items.length} firmware(s) disponibles${shown.length < items.filter((it) => !n || A.norm(it.key + ' ' + it.title + ' ' + it.sub).includes(n)).length ? ' — affinez la recherche' : ''}`;
    };
    q.addEventListener('input', draw);
    list.addEventListener('click', (e) => { const r = e.target.closest('[data-k]'); if (!r) return; sel = items.find((it) => it.key === r.dataset.k); draw(); onPick(sel); });
    return {
      setItems(v) { items = v; sel = null; draw(); },
      selected: () => sel,
      pick(item) { if (!items.some((it) => it.key === item.key)) items = [item].concat(items); sel = item; q.value = ''; draw(); onPick(item); }
    };
  }

  /* Vérifie que le firmware existe sur la microSD (compilé ?) */
  async function fileExists(path) {
    if (S.demo) return { ok: true, size: 912384 };
    try {
      const dir = path.replace(/\/[^/]+$/, ''), name = path.split('/').pop();
      const r = await api('/api/sd/list?path=' + encodeURIComponent(dir));
      const f = (r.items || []).find((x) => x.name === name);
      return f ? { ok: true, size: f.size } : { ok: false };
    } catch (e) { return { ok: false }; }
  }

  /* ================================================================ */
  /* Page USB & Flash                                                 */
  /* ================================================================ */
  A.page({
    id: 'usb', title: 'USB & Flash', icon: 'usb', group: 'sys', admin: true,
    desc: 'Programmer une carte Arduino ou ESP32 par câble, moniteur de flash et moniteur série',
    render(el) {
      let board = store.get('fl.board', 'esp32');
      let chosen = null;
      let pos = 0, paused = false, stamps = store.get('usb.ts', false), buf = '';
      let flSince = 0, flTimer = null;

      el.innerHTML = `<div class="grid g-3">
        <div class="span-2 stack">
          <div class="card"><div class="card-h"><div class="grow"><h2>Programmer une carte par câble</h2><div class="card-sub">Carte branchée sur le port USB-OTG du MASTER · Arduino (.hex) ou ESP32 (.bin)</div></div><span id="us-badge"></span></div>
            <div class="card-b stack" style="gap:14px">
              <div class="field"><label>1. Type de carte</label><div class="seg" id="fl-board" style="flex-wrap:wrap">${Object.keys(BOARD_NAMES).map((b) => `<button data-b="${b}" class="${b === board ? 'on' : ''}">${esc(BOARD_NAMES[b])}</button>`).join('')}</div></div>
              <div class="field" id="fl-prof-w"><label>Bootloader Arduino</label><select class="select" id="fl-prof">${PROFILES.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></div>
              <div class="field"><label>2. Firmware</label><div id="fl-pick"></div></div>
              <div id="fl-sel"></div>
              <div id="fl-montage"></div>
              <div class="row wrap"><button class="btn primary" id="fl-go" disabled>${icon('upload')}Flasher la carte</button><span class="small muted">Le moniteur de flash s'ouvre automatiquement, puis la sortie série de la carte.</span></div>
            </div></div>
          <div class="card" id="fl-mon" hidden><div class="card-h"><div class="grow"><h2>Moniteur de flash</h2><div class="card-sub mono" id="fl-file"></div></div><span id="fl-state"></span></div>
            <div class="card-b stack" style="gap:10px">
              <div class="progress-row"><div class="meter" id="fl-meter"><i style="width:0"></i></div><span class="num" id="fl-pct" style="font-weight:700;min-width:48px;text-align:right">0 %</span></div>
              <div class="fl-steps" id="fl-steps"></div>
              <div class="fl-log" id="fl-log"></div><div id="fl-res"></div></div></div>
          <div class="card"><div class="card-h"><div class="grow"><h2>Moniteur série</h2><div class="card-sub" id="us-sub">Sortie de la carte branchée en USB</div></div>
            <select class="select sm" id="us-baud" style="width:auto">${[300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 460800, 921600].map((b) => `<option ${b === 115200 ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
            <div class="card-b"><div class="terminal" id="us-term" aria-live="polite"></div>
              <div class="row wrap" style="margin-top:10px"><input class="input grow mono" id="us-in" placeholder="Texte à envoyer…" style="flex:1;min-width:180px"><select class="select sm" id="us-eol" style="width:auto"><option value="\\n">LF</option><option value="\\r\\n">CR+LF</option><option value="\\r">CR</option><option value="">rien</option></select><button class="btn primary" id="us-send">${icon('play')}Envoyer</button></div>
              <div class="row wrap" style="margin-top:10px"><button class="btn sm" id="us-pause">${icon('stop')}Pause</button><button class="btn sm" id="us-clear">${icon('trash')}Effacer</button><button class="btn sm" id="us-save">${icon('download')}Enregistrer</button><label class="switch small"><input type="checkbox" id="us-ts" ${stamps ? 'checked' : ''}><span class="track"></span>Horodatage</label><span class="grow"></span><span class="small muted num" id="us-count"></span></div></div></div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-h"><h2 class="grow">Carte connectée</h2></div><div class="card-b"><dl class="dl" id="us-info"></dl></div></div>
          <div class="card pad small stack" style="gap:8px"><h3>Branchement</h3>
            <p>Reliez la carte au port <b>USB-OTG</b> du MASTER (câble OTG USB-C/micro-USB ↔ USB-A, ou hub OTG <b>alimenté</b>).</p>
            <p><b>Arduino Uno/Nano</b> : fichier <code>.hex</code> de <code>capteurs/</code>. Si « pas de réponse du bootloader », essayez le profil « Old Bootloader ».</p>
            <p><b>ESP32 / S3 / C3</b> : le MASTER passe la carte en mode téléchargement tout seul (lignes DTR/RTS). Si ça ne répond pas : maintenez <b>BOOT</b>, appuyez sur <b>EN/RST</b>, relâchez BOOT, puis relancez.</p>
            <p>Les firmwares ESP32 se trouvent dans <code>PROJECTS/LIBRARY/&lt;projet&gt;/bin/&lt;carte&gt;/</code> (créés par <code>scripts\\compile_all.bat</code>).</p></div>
        </div></div>`;

      /* ---- choix du firmware ---- */
      const pk = picker($('#fl-pick', el), async (it) => {
        chosen = it;
        const go = $('#fl-go', el);
        go.disabled = true;
        $('#fl-sel', el).innerHTML = `<div class="skel" style="height:20px"></div>`;
        const ex = await fileExists(it.path);
        $('#fl-sel', el).innerHTML = ex.ok ? `<div class="banner" style="margin:0">${icon('check')}<div><b>${esc(it.title)}</b> — <span class="mono small">${esc(it.path)}</span> (${fmtBytes(ex.size)})</div></div>`
          : `<div class="banner warn" style="margin:0">${icon('alert')}<div>Firmware pas encore compilé : <span class="mono small">${esc(it.path)}</span>. Lancez <code>scripts\\compile_all.bat</code> sur le PC puis recopiez <code>SD_CARD/</code> sur la microSD.</div></div>`;
        go.disabled = !ex.ok;
        $('#fl-montage', el).innerHTML = `<h3 style="margin:4px 0 8px">Montage</h3>` + (await A.montageHtml(it.ctx));
      });
      const loadList = async () => {
        $('#fl-prof-w', el).hidden = board !== 'avr';
        $('#fl-sel', el).innerHTML = '';
        $('#fl-montage', el).innerHTML = '';
        $('#fl-go', el).disabled = true;
        chosen = null;
        const items = board === 'avr' ? await avrItems() : espItems(board);
        pk.setItems(items);
        // Présélection depuis la page Fichiers ou la bibliothèque
        const pre = A.flashPreselect;
        if (pre && pre.board === board) {
          A.flashPreselect = null;
          pk.pick(items.find((it) => it.path === pre.path) || { key: pre.path, title: pre.path.split('/').pop(), sub: pre.path.replace('/sd/', ''), path: pre.path, ctx: pre.ctx });
        }
      };
      if (A.flashPreselect && A.flashPreselect.board) {
        board = A.flashPreselect.board;
        $$('#fl-board button', el).forEach((x) => x.classList.toggle('on', x.dataset.b === board));
      }
      $('#fl-board', el).addEventListener('click', (e) => {
        const b = e.target.closest('[data-b]');
        if (!b) return;
        board = b.dataset.b;
        store.set('fl.board', board);
        $$('#fl-board button', el).forEach((x) => x.classList.toggle('on', x === b));
        loadList();
      });
      loadList();

      /* ---- moniteur de flash ---- */
      const STEPS = { avr: ['synchronisation', 'écriture', 'vérification', 'terminé'], esp: ['connexion', 'préparation', 'écriture', 'vérification MD5', 'redémarrage', 'terminé'] };
      const drawSteps = (kind, step, done) => {
        const list = STEPS[kind] || [];
        let cur = list.findIndex((s) => (step || '').toLowerCase().includes(s.split(' ')[0]));
        if (done) cur = list.length - 1;
        $('#fl-steps', el).innerHTML = list.map((s, i) => `<span class="${i < cur || (done && i === cur) ? 'done' : i === cur ? 'cur' : ''}">${esc(s)}</span>`).join('');
      };
      const pollFlash = async () => {
        let r;
        try { r = await api('/api/usb/flash/status?since=' + flSince); } catch (e) { return; }
        const mon = $('#fl-mon', el);
        if (!r.kind) return;
        mon.hidden = false;
        $('#fl-file', el).textContent = r.file || '';
        const logBox = $('#fl-log', el);
        (r.log || []).forEach((l) => { logBox.textContent += l.text + '\n'; });
        if ((r.log || []).length) logBox.scrollTop = logBox.scrollHeight;
        flSince = r.last || flSince;
        const pct = Math.max(0, Math.min(100, r.progress || 0));
        $('#fl-meter i', el).style.width = pct + '%';
        $('#fl-meter', el).className = 'meter ' + (r.ok === false ? 'bad' : r.ok ? 'ok' : '');
        $('#fl-pct', el).textContent = pct + ' %';
        $('#fl-state', el).innerHTML = r.busy ? `<span class="badge accent"><span class="dot busy"></span>${esc(r.step || 'en cours')}</span>` : r.ok ? '<span class="badge ok">réussi</span>' : r.ok === false ? '<span class="badge bad">échec</span>' : '';
        drawSteps(r.kind, r.step, r.ok === true);
        if (!r.busy && r.ok !== null) {
          clearInterval(flTimer); flTimer = null;
          $('#fl-res', el).innerHTML = `<div class="banner ${r.ok ? '' : 'warn'}" style="margin:0">${icon(r.ok ? 'check' : 'alert')}<div>${esc(r.result)}</div></div>`;
          if (r.ok && r.baud) {
            $('#us-baud', el).value = String(r.baud);
            append(`\n──── ${(r.file || '').split('/').pop()} flashé — démarrage de la carte (${r.baud} bauds) ────\n`);
          }
          $('#fl-go', el).disabled = !chosen;
        }
      };
      const startMonitor = () => {
        flSince = 0;
        $('#fl-log', el).textContent = '';
        $('#fl-res', el).innerHTML = '';
        $('#fl-mon', el).hidden = false;
        $('#fl-mon', el).scrollIntoView({ behavior: 'smooth', block: 'start' });
        clearInterval(flTimer);
        flTimer = setInterval(pollFlash, 500);
        pollFlash();
      };
      $('#fl-go', el).onclick = async () => {
        if (!chosen) return;
        if (!(await confirmBox('Flasher la carte', `Écrire « ${chosen.title} » sur la carte ${BOARD_NAMES[board]} branchée au MASTER ?`, 'Flasher'))) return;
        $('#fl-go', el).disabled = true;
        try {
          await postJSON('/api/usb/flash', { kind: board === 'avr' ? 'avr' : 'esp', path: chosen.path, profile: $('#fl-prof', el).value });
          startMonitor();
        } catch (e) { toast(e.message, 'bad'); $('#fl-go', el).disabled = false; }
      };
      // Flash déjà en cours (page rouverte) : on raccroche le moniteur
      api('/api/usb/flash/status?since=0').then((r) => { if (r && r.busy) startMonitor(); }).catch(() => {});

      /* ---- moniteur série ---- */
      const term = $('#us-term', el);
      const append = (txt) => {
        if (!txt) return;
        if (stamps) { const t = new Date().toLocaleTimeString('fr-FR') + ' → '; txt = txt.replace(/(^|\n)(?=.)/g, (m) => m + t); }
        buf += txt;
        if (buf.length > 200000) buf = buf.slice(-150000);
        const atBottom = term.scrollHeight - term.scrollTop - term.clientHeight < 40;
        term.textContent = buf;
        if (atBottom) term.scrollTop = term.scrollHeight;
        $('#us-count', el).textContent = fmtBytes(buf.length) + ' affichés';
      };
      const info = (u) => {
        if (!u) return;
        $('#us-badge', el).innerHTML = u.flashing ? '<span class="badge warn"><span class="dot busy"></span>programmation</span>' : u.connected ? `<span class="badge ok">${esc(u.chip)} connectée</span>` : '<span class="badge">aucune carte</span>';
        $('#us-info', el).innerHTML = `<dt>Hôte USB</dt><dd>${u.host ? 'actif' : '<span style="color:var(--bad)">inactif</span>'}</dd><dt>Puce USB</dt><dd>${esc(u.chip || '—')}</dd><dt>VID:PID</dt><dd class="mono">${esc(u.vid_pid)}</dd><dt>Débit</dt><dd class="num">${u.baud} bauds</dd><dt>Octets reçus</dt><dd class="num">${fmtNum(u.rx_total, 0)}</dd>`;
        $('#us-sub', el).textContent = u.connected ? `${u.chip} · ${u.baud} bauds` : 'Branchez une carte sur le port USB-OTG du MASTER.';
        const bs = $('#us-baud', el);
        if (u.baud && document.activeElement !== bs && bs.value !== String(u.baud)) bs.value = String(u.baud);
      };
      let busy = false;
      const poll = async () => {
        if (busy || paused || document.hidden) return;
        busy = true;
        try { const r = await api('/api/usb/serial?since=' + pos); if (r) { if (r.pos < pos) append('\n--- tampon réinitialisé ---\n'); pos = r.pos; append(r.data); info(r.usb); } } catch (e) { /* réessai */ }
        busy = false;
      };
      const t = setInterval(poll, 400);
      poll();
      const send = async () => {
        const inp = $('#us-in', el), eol = $('#us-eol', el).value.replace('\\n', '\n').replace('\\r', '\r').replace('\\n', '\n');
        if (!inp.value && !eol) return;
        const r = await A.act(postJSON('/api/usb/serial', { data: inp.value + eol }));
        if (r) { const hist = store.get('usb.hist', []); if (inp.value) store.set('usb.hist', [inp.value].concat(hist.filter((h) => h !== inp.value)).slice(0, 20)); inp.value = ''; }
      };
      $('#us-send', el).onclick = send;
      let hi = -1;
      $('#us-in', el).addEventListener('keydown', (e) => {
        const hist = store.get('usb.hist', []);
        if (e.key === 'Enter') { hi = -1; send(); }
        else if (e.key === 'ArrowUp' && hist.length) { hi = Math.min(hist.length - 1, hi + 1); e.target.value = hist[hi]; e.preventDefault(); }
        else if (e.key === 'ArrowDown') { hi = Math.max(-1, hi - 1); e.target.value = hi >= 0 ? hist[hi] : ''; e.preventDefault(); }
      });
      $('#us-baud', el).onchange = (e) => A.act(postJSON('/api/usb/serial', { baud: Number(e.target.value) }), 'Débit : ' + e.target.value + ' bauds');
      $('#us-pause', el).onclick = (e) => { paused = !paused; e.currentTarget.innerHTML = paused ? icon('play') + 'Reprendre' : icon('stop') + 'Pause'; };
      $('#us-clear', el).onclick = () => { buf = ''; term.textContent = ''; };
      $('#us-save', el).onclick = () => download('serie-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.log', buf);
      $('#us-ts', el).onchange = (e) => { stamps = e.target.checked; store.set('usb.ts', stamps); };
      return () => { clearInterval(t); clearInterval(flTimer); };
    }
  });

  /* ================================================================ */
  /* Flash d'un worker par Wi-Fi, avec moniteur                        */
  /* ================================================================ */
  const chipBoard = (chip) => (/S3/i.test(chip || '') ? 'esp32s3' : /C3/i.test(chip || '') ? 'esp32c3' : 'esp32');

  A.flashWorker = async function (id, asProject) {
    const w = (S.state && (S.state.workers || []).find((x) => x.id === id)) || { id };
    let timer = null, since = 0, t0 = 0, sawFlash = false;
    const d = drawer((asProject ? 'Charger un projet sur ' : 'Mettre à jour ') + (w.label || 'W' + id), '<div class="skel"></div>', { sub: `Worker ${id} · Wi-Fi (OTA)`, onClose: () => clearInterval(timer) });
    let board = 'esp32';
    try { const info = await api('/api/worker/info?id=' + id); board = chipBoard(info.chip); } catch (e) { /* on garde ESP32 */ }
    let chosen = null;
    d.body.innerHTML = `<div class="stack" style="gap:12px">
      <div class="banner" style="margin:0">${icon('info')}<div>Carte détectée : <b>${esc(BOARD_NAMES[board])}</b>. ${asProject ? 'Le programme worker reste en réserve : bouton BOOT 3 s ou « Revenir au mode worker » pour le récupérer.' : 'Le worker télécharge le firmware, vérifie son empreinte SHA-256 puis redémarre.'}</div></div>
      <div id="wf-pick"></div><div id="wf-sel"></div><div id="wf-montage"></div>
      <button class="btn primary" id="wf-go" disabled>${icon('upload')}${asProject ? 'Charger ce projet' : 'Mettre à jour'}</button>
      <div class="card" id="wf-mon" hidden><div class="card-h"><h3 class="grow">Moniteur</h3><span id="wf-state"></span></div><div class="card-b stack" style="gap:10px">
        <div class="progress-row"><div class="meter" id="wf-meter"><i style="width:0"></i></div><span class="num" id="wf-pct" style="min-width:48px;text-align:right;font-weight:700">0 %</span></div>
        <div class="fl-log" id="wf-log"></div><div id="wf-res"></div></div></div></div>`;
    const pk = picker($('#wf-pick', d.body), async (it) => {
      chosen = it;
      $('#wf-go', d.body).disabled = true;
      const ex = await fileExists(it.path);
      $('#wf-sel', d.body).innerHTML = ex.ok ? `<div class="small mono muted">${esc(it.path)} · ${fmtBytes(ex.size)}</div>` : `<div class="banner warn" style="margin:0">${icon('alert')}<div>Pas encore compilé : lancez <code>scripts\\compile_all.bat</code>.</div></div>`;
      $('#wf-go', d.body).disabled = !ex.ok;
      $('#wf-montage', d.body).innerHTML = it.ctx && it.ctx.id ? `<h3 style="margin:4px 0 8px">Montage à réaliser sur le worker</h3>` + (await A.montageHtml(it.ctx)) : '';
    });
    if (asProject) pk.setItems(espItems(board));
    else {
      const files = [];
      for (const dir of ['/sd/FIRMWARE/WORKER', '/sd/FIRMWARE']) {
        try { const r = await api('/api/sd/list?path=' + encodeURIComponent(dir)); (r.items || []).filter((f) => f.type === 'f' && /worker.*\.bin$/i.test(f.name)).forEach((f) => files.push({ key: dir + '/' + f.name, title: f.name, sub: dir.replace('/sd/', '') + ' · ' + fmtBytes(f.size), path: dir + '/' + f.name, ctx: null })); } catch (e) { /* absent */ }
      }
      pk.setItems(files);
    }
    const logBox = () => $('#wf-log', d.body);
    const monitor = async () => {
      const cur = ((S.state && S.state.workers) || []).find((x) => x.id === id) || {};
      try {
        const r = await api(`/api/worker/log?id=${id}&since=${since}`);
        (r.lines || []).forEach((l) => { logBox().textContent += l.text + '\n'; });
        if ((r.lines || []).length) logBox().scrollTop = logBox().scrollHeight;
        since = r.last || since;
      } catch (e) { /* réessai */ }
      if (cur.state === 'FLASHING') sawFlash = true;
      const pct = cur.state === 'FLASHING' ? cur.progress || 0 : sawFlash ? 100 : 2;
      $('#wf-meter i', d.body).style.width = pct + '%';
      $('#wf-pct', d.body).textContent = pct + ' %';
      $('#wf-state', d.body).innerHTML = A.stateBadge ? A.stateBadge(cur.state || '?') : esc(cur.state || '');
      const elapsed = Date.now() - t0;
      const done = asProject ? cur.state === 'PROJECT' : sawFlash && cur.state === 'READY';
      if (done || elapsed > 180000 || (cur.state === 'ERROR' && sawFlash)) {
        clearInterval(timer); timer = null;
        const ok = done;
        $('#wf-meter', d.body).className = 'meter ' + (ok ? 'ok' : 'bad');
        $('#wf-res', d.body).innerHTML = `<div class="banner ${ok ? '' : 'warn'}" style="margin:0">${icon(ok ? 'check' : 'alert')}<div>${ok ? (asProject ? `Projet « ${esc(cur.job || chosen.title)} » en cours d'exécution sur W${id}.` : `W${id} a redémarré en v${esc(cur.version || '?')}.`) : `Pas de confirmation après ${fmtDur(elapsed)} : vérifiez que le firmware contient le « retour au mode worker » (projets compilés par ESP32 LAB 6.1) et que la carte est alimentée.`}</div></div>`;
      }
    };
    $('#wf-go', d.body).onclick = async () => {
      if (!chosen) return;
      $('#wf-go', d.body).disabled = true;
      try {
        await post('/api/worker/flash', { id, path: chosen.path, mode: asProject ? 'project' : 'worker' });
        $('#wf-mon', d.body).hidden = false;
        $('#wf-mon', d.body).scrollIntoView({ behavior: 'smooth' });
        logBox().textContent = `Envoi de ${chosen.path.split('/').pop()} à W${id}…\n`;
        t0 = Date.now();
        try { since = (await api(`/api/worker/log?id=${id}&since=999999999`)).last || 0; } catch (e) { since = 0; }
        timer = setInterval(monitor, 1000);
      } catch (e) { toast(e.message, 'bad'); $('#wf-go', d.body).disabled = false; }
    };
  };

  /* ================================================================ */
  /* Onglets du worker : Moniteur (journal en direct) et GPIO          */
  /* ================================================================ */
  A.workerLogPanel = function (box, id) {
    let since = 0, paused = false, text = '';
    box.innerHTML = `<div class="row wrap" style="gap:8px;margin-bottom:10px"><button class="btn sm" data-p>${icon('stop')}<span>Pause</span></button><button class="btn sm" data-c>${icon('trash')}Effacer</button><button class="btn sm" data-s>${icon('download')}Enregistrer</button><span class="grow"></span><span class="small muted">Journal envoyé par le worker (UDP 4212) : jobs, OTA, GPIO, erreurs</span></div><div class="terminal" data-t style="min-height:320px"></div>`;
    const term = $('[data-t]', box);
    const tick = async () => {
      if (paused) return;
      try {
        const r = await api(`/api/worker/log?id=${id}&since=${since}`);
        (r.lines || []).forEach((l) => { text += `${new Date(Date.now() - l.age_ms).toLocaleTimeString('fr-FR')}  ${l.text}\n`; });
        if ((r.lines || []).length) { term.textContent = text || ''; term.scrollTop = term.scrollHeight; }
        else if (!text) term.textContent = 'En attente de messages du worker… (lancez un job ou un check-up)';
        since = r.last || since;
      } catch (e) { term.textContent = 'Journal indisponible : ' + e.message; }
    };
    $('[data-p]', box).onclick = (e) => { paused = !paused; $('span', e.currentTarget).textContent = paused ? 'Reprendre' : 'Pause'; };
    $('[data-c]', box).onclick = () => { text = ''; term.textContent = ''; };
    $('[data-s]', box).onclick = () => download(`worker${id}-journal.log`, text);
    const t = setInterval(tick, 1000);
    tick();
    return () => clearInterval(t);
  };

  A.workerGpioPanel = function (box, id) {
    let pins = [], pin = null, timer = null, hist = [];
    box.innerHTML = '<div class="skel"></div>';
    const draw = (st) => {
      const p = pins.find((x) => x.pin === pin);
      box.innerHTML = `<div class="banner" style="margin:0 0 12px">${icon('alert')}<div>Contrôle direct des broches du worker. Ne mettez jamais en <b>sortie</b> une broche reliée à la sortie d'un autre composant. Broches en pointillé : entrée analogique (mesure en mV).</div></div>
        <div class="gpio-grid">${pins.map((x) => `<button data-pin="${x.pin}" class="${x.adc ? 'adc' : ''} ${x.pin === pin ? 'on' : ''}">GPIO${x.pin}</button>`).join('')}</div>
        ${p ? `<div class="grid g-2" style="margin-top:14px">
          <div class="card pad stack" style="gap:10px"><h3>GPIO${p.pin}</h3>
            <div class="btn-group"><button class="btn sm" data-m="in">Entrée</button><button class="btn sm" data-m="in_pullup">Pull-up</button><button class="btn sm" data-m="in_pulldown">Pull-down</button></div>
            <div class="btn-group"><button class="btn sm" data-m="out" data-v="1">Sortie HAUT</button><button class="btn sm" data-m="out" data-v="0">Sortie BAS</button></div>
            <div class="field"><label>PWM : fréquence (Hz) et rapport cyclique</label><div class="row" style="gap:8px"><input class="input sm" type="number" min="1" max="40000" value="1000" data-f style="width:110px"><input type="range" min="0" max="100" value="50" data-d style="flex:1"><b class="num" data-dv>50 %</b></div><button class="btn sm" data-m="pwm" style="margin-top:6px">Appliquer le PWM</button></div>
            <button class="btn sm ghost" data-m="release">Libérer la broche</button></div>
          <div class="card pad stack" style="gap:8px"><h3>Lecture en direct</h3>
            <div class="gpio-level" data-lv>${st ? (st.level ? 'HAUT' : 'BAS') : '—'}</div>
            ${p.adc ? `<div class="small muted">Tension : <b class="num" data-mv>${st && st.mv != null ? st.mv + ' mV' : '—'}</b></div><div data-sp>${hist.length > 1 ? A.spark(hist) : ''}</div>` : ''}
            <label class="switch small"><input type="checkbox" data-auto ${timer ? 'checked' : ''}><span class="track"></span>Actualiser toutes les 500 ms</label></div></div>` : '<p class="small muted" style="margin-top:12px">Choisissez une broche.</p>'}`;
    };
    const read = async () => {
      if (pin == null) return;
      try {
        const st = await api(`/api/worker/gpio?id=${id}&pin=${pin}`);
        if (st.mv != null) { hist.push(st.mv); if (hist.length > 120) hist.shift(); }
        const lv = $('[data-lv]', box);
        if (lv) { lv.textContent = st.level ? 'HAUT' : 'BAS'; const mv = $('[data-mv]', box); if (mv) mv.textContent = st.mv + ' mV'; const sp = $('[data-sp]', box); if (sp && hist.length > 1) sp.innerHTML = A.spark(hist); }
      } catch (e) { /* ignoré */ }
    };
    box.addEventListener('click', async (e) => {
      const pb = e.target.closest('[data-pin]');
      if (pb) { pin = Number(pb.dataset.pin); hist = []; draw(null); read(); return; }
      const mb = e.target.closest('[data-m]');
      if (!mb) return;
      if (!S.admin) { toast('Connexion administrateur requise', 'warn'); return; }
      const body = { id, pin, mode: mb.dataset.m };
      if (mb.dataset.v != null) body.value = Number(mb.dataset.v);
      if (mb.dataset.m === 'pwm') { body.freq = Number($('[data-f]', box).value) || 1000; body.duty = Number($('[data-d]', box).value); }
      try { const st = await postJSON('/api/worker/gpio', body); toast(`GPIO${pin} : ${mb.textContent.trim()}`, 'ok'); const lv = $('[data-lv]', box); if (lv && st) lv.textContent = st.level ? 'HAUT' : 'BAS'; }
      catch (err) { toast(err.message, 'bad'); }
    });
    box.addEventListener('input', (e) => { if (e.target.matches('[data-d]')) $('[data-dv]', box).textContent = e.target.value + ' %'; });
    box.addEventListener('change', (e) => { if (e.target.matches('[data-auto]')) { clearInterval(timer); timer = e.target.checked ? setInterval(read, 500) : null; } });
    api('/api/worker/gpio?id=' + id).then((r) => { pins = r.pins || []; draw(null); }).catch((e) => { box.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; });
    return () => clearInterval(timer);
  };
})();
/* ---- 47_flashpipe.js ---- */
/* Flash en un clic : projet du Studio ou de la bibliothèque → worker.
 *   1. choix du worker (carte détectée) et montage à vérifier ;
 *   2. firmware : déjà compilé sur la microSD du S3 (marche sans le Pi), sinon compilé par le Pi
 *      avec le temps prévu et la progression ;
 *   3. flash OTA autorisé par le S3, puis lecture du moniteur et verdict (Patricia sur le Pi, ou
 *      analyse locale du S3 si le Pi est absent). */
(function () {
  'use strict';
  const A = window.APP, LAB = window.LAB;
  const { $, esc, icon, toast, drawer, api, post, download, S } = A;
  const BOARD_NAMES = { esp32: 'ESP32', esp32s3: 'ESP32-S3', esp32c3: 'ESP32-C3' };
  const chipBoard = (chip) => (/S3/i.test(chip || '') ? 'esp32s3' : /C3/i.test(chip || '') ? 'esp32c3' : 'esp32');
  const espBin = (id, board) => `/sd/PROJECTS/LIBRARY/${id}/bin/${board}/${id}.bin`;
  const piReady = () => !!(A.piBase && A.piBase() && A.piToken && A.piToken());
  const piJ = (path, body) => A.piRequest(path, body === undefined ? undefined : { method: 'POST', body: JSON.stringify(body) });

  function mmss(s) {
    s = Math.max(0, Math.round(s));
    return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
  }
  A.fmtEta = mmss;

  async function sdHas(path) {
    if (S.demo) return true;
    try {
      const r = await api('/api/sd/list?path=' + encodeURIComponent(path.replace(/\/[^/]+$/, '')));
      return (r.items || []).some((x) => x.name === path.split('/').pop());
    } catch (e) { return false; }
  }

  /* Analyse locale du moniteur (sans le Pi) : mêmes repères que Patricia, en plus court. */
  const BAD = [[/Guru Meditation|abort\(\) was called|Backtrace:/i, 'le programme plante (Guru Meditation)'], [/Brownout detector/i, 'chute de tension (brownout) : alimentation trop faible'],
    [/non détecté|not found|Could not find|Failed to/i, 'un module n\'est pas détecté : vérifie le câblage'], [/rst:0x[0-9a-f]+[^\n]*\n[\s\S]*rst:0x[0-9a-f]+[^\n]*\n[\s\S]*rst:0x/i, 'redémarrages en boucle'],
    [/task_wdt|Task watchdog/i, 'chien de garde déclenché : une boucle bloque le programme']];
  A.localVerdict = function (text, expect) {
    const reasons = BAD.filter(([re]) => re.test(text)).map(([, why]) => why);
    const samples = (text.match(/^[A-Za-z_][\w.-]{0,30}:-?\d+(\.\d+)?(\t|$)/gm) || []).length;
    const missing = (expect || []).filter((k) => !new RegExp('(^|\\t)' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':', 'm').test(text));
    if (reasons.length) return { verdict: 'echec', reasons };
    if (samples >= 2 && !missing.length) return { verdict: 'ok', reasons: [`${samples} mesure(s) valides lues`] };
    if (samples >= 2) return { verdict: 'incertain', reasons: ['mesures absentes : ' + missing.join(', ')] };
    return { verdict: 'incertain', reasons: [text.trim() ? 'le programme écrit sur le port série mais aucune mesure reconnue' : 'aucune sortie série reçue'] };
  };

  /* Journal du worker (relayé par le S3) + port USB du S3 si une carte y est branchée. */
  A.readWorkerSerial = async function (worker, seconds, onTick) {
    let since = 0, text = '', usbPos = 0;
    try { const l = await api(`/api/worker/log?id=${encodeURIComponent(worker)}&since=999999999`); since = l.last || 0; } catch (e) { /* ignoré */ }
    try { if (S.admin) { const u = await api('/api/usb/serial?since=0'); usbPos = u.pos || 0; } } catch (e) { /* pas d'USB */ }
    const t0 = Date.now();
    let state = '';
    while (Date.now() - t0 < seconds * 1000) {
      await A.sleep(1500);
      try { const l = await api(`/api/worker/log?id=${encodeURIComponent(worker)}&since=${since}`); since = l.last || since; (l.lines || []).forEach((x) => { text += (x.text || '') + '\n'; }); } catch (e) { /* redémarrage */ }
      try { if (S.admin) { const u = await api('/api/usb/serial?since=' + usbPos); usbPos = u.pos || usbPos; if (u.data) text += u.data; } } catch (e) { /* ignoré */ }
      const w = ((S.state && S.state.workers) || []).find((x) => String(x.id) === String(worker));
      state = w ? w.state : state;
      if (onTick) onTick(Math.round((Date.now() - t0) / 1000), text, state);
    }
    return { text, state };
  };

  /* opts : { spec } (projet du Studio) ou { id } (projet de la bibliothèque), title, worker (facultatif), auto (enchaîne sans clic) */
  A.flashPipeline = async function (opts) {
    const lib = opts.id && A.projectById ? A.projectById(opts.id) : null;
    const baseSpec = opts.spec ? JSON.parse(JSON.stringify(opts.spec)) : lib && lib.spec ? JSON.parse(JSON.stringify(lib.spec)) : null;
    const title = opts.title || (lib && lib.title) || (baseSpec && baseSpec.title) || 'Projet';
    let cancelled = false;
    const d = drawer('Flasher « ' + title + ' »', '<div class="skel"></div>', { sub: 'Compilation, flash et vérification', onClose: () => { cancelled = true; } });
    const workers = ((S.state && S.state.workers) || []).filter((w) => w.state !== 'OFFLINE');
    let worker = opts.worker != null ? String(opts.worker) : workers[0] ? String(workers[0].id) : '';
    let board = (baseSpec && baseSpec.board) || 'esp32', res = null, source = null;
    const pid = lib ? lib.id : 'studio_' + LAB.sanitize(title).slice(0, 40);

    d.body.innerHTML = `<div class="stack fp">
      <ol class="fp-steps"><li data-s="1" class="on">Worker</li><li data-s="2">Montage</li><li data-s="3">Firmware</li><li data-s="4">Flash</li><li data-s="5">Vérification</li></ol>
      <div class="field"><label>Worker</label><select class="select" id="fp-w">${workers.map((w) => `<option value="${w.id}" ${String(w.id) === worker ? 'selected' : ''}>W${w.id}${w.label ? ' · ' + esc(w.label) : ''} · ${esc(w.state)}</option>`).join('') || '<option value="">Aucun worker en ligne</option>'}</select><div class="hint" id="fp-chip"></div></div>
      <div id="fp-montage"></div>
      <label class="switch"><input type="checkbox" id="fp-ready" ${opts.auto ? 'checked' : ''}><span class="track"></span>Le montage est câblé comme sur le schéma</label>
      <div id="fp-src" class="card pad small"></div>
      <button class="btn primary lg" id="fp-go" disabled>${icon('zap')}Compiler, flasher et vérifier</button>
      <div class="card" id="fp-run" hidden><div class="card-b stack" style="gap:10px">
        <div class="row between"><b id="fp-stage">…</b><span class="num muted" id="fp-time"></span></div>
        <div class="meter" id="fp-meter"><i style="width:0"></i></div>
        <pre class="fl-log" id="fp-log" style="max-height:220px"></pre><div id="fp-res"></div></div></div></div>`;
    const step = (n) => d.body.querySelectorAll('.fp-steps li').forEach((li) => { li.className = Number(li.dataset.s) < n ? 'done' : Number(li.dataset.s) === n ? 'on' : ''; });
    const stage = (t, pct, time) => { $('#fp-stage', d.body).textContent = t; if (pct != null) $('#fp-meter i', d.body).style.width = pct + '%'; $('#fp-time', d.body).textContent = time || ''; };
    const logBox = $('#fp-log', d.body);
    const goBtn = $('#fp-go', d.body);

    async function prepare() {
      goBtn.disabled = true;
      worker = $('#fp-w', d.body).value;
      if (!worker) { $('#fp-src', d.body).innerHTML = `${icon('alert')} Allume un worker : il apparaît ici dès qu'il rejoint le Wi-Fi du MASTER.`; return; }
      try { const info = await api('/api/worker/info?id=' + encodeURIComponent(worker)); board = chipBoard(info.chip); $('#fp-chip', d.body).textContent = `Carte détectée : ${BOARD_NAMES[board]}${info.chip ? ' (' + info.chip + ')' : ''}. Le code est adapté à cette carte.`; } catch (e) { $('#fp-chip', d.body).textContent = 'Carte non identifiée : ESP32 supposé.'; }
      if (cancelled) return;
      // montage pour la carte du worker
      if (baseSpec) {
        try {
          res = LAB.generate(Object.assign({}, baseSpec, { board }));
          const m = LAB.montageSvg ? LAB.montageSvg(res, { id: pid, title }) : null;
          $('#fp-montage', d.body).innerHTML = `<h3 style="margin:4px 0 8px">Montage à réaliser sur W${esc(worker)}</h3>${m ? `<div class="montage">${m.svg}</div>` : ''}<details style="margin-top:8px"><summary class="small">Tableau de câblage</summary>${A.wiringTable(res)}</details>` +
            (res.warnings || []).map((w) => `<div class="banner warn" style="margin-top:8px">${icon('alert')}<div>${esc(w)}</div></div>`).join('');
        } catch (e) { $('#fp-montage', d.body).innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; return; }
      } else if (lib) $('#fp-montage', d.body).innerHTML = await A.montageHtml({ kind: 'esp', id: lib.id, board });
      step(2);
      // source du firmware : microSD du S3 (projet de la bibliothèque déjà compilé) → Pi → rien
      source = null;
      const src = $('#fp-src', d.body);
      if (lib && !opts.spec && (await sdHas(espBin(lib.id, board)))) {
        source = { kind: 'sd', path: espBin(lib.id, board) };
        src.innerHTML = `${icon('sd')} <b>Firmware déjà compilé</b> sur la microSD du S3 : flash immédiat, le Pi n'est pas nécessaire.`;
      } else if (piReady()) {
        try {
          const est = await A.piRequest(`/api/v1/build/estimate?project=${encodeURIComponent(pid)}&board=${board}`);
          source = { kind: 'pi', est };
          const how = est.basis === 'cache' ? 'déjà dans le cache du Pi' : est.basis === 'project' ? 'd\'après la dernière compilation de ce projet' : est.basis === 'board' ? `d'après ${est.samples} compilation(s) ${BOARD_NAMES[board]}` : 'première compilation sur ce Pi : estimation prudente';
          src.innerHTML = `${icon('cpu')} <b>Nouveau firmware compilé par le Pi</b> · temps prévu <b>≈ ${mmss(est.total_s)}</b> <span class="muted">(${how}${est.ahead ? `, ${est.ahead} compilation(s) avant la tienne` : ''})</span>${est.arduino_cli ? '' : `<div class="banner warn" style="margin-top:8px">${icon('alert')}<div>arduino-cli n'est pas installé sur le Pi : lance <code>sudo bash pi/setup_arduino.sh</code>.</div></div>`}`;
        } catch (e) { src.innerHTML = `${icon('alert')} Pi injoignable (${esc(e.message)}).`; }
      }
      if (!source) {
        $('#fp-src', d.body).innerHTML = `<div class="banner warn" style="margin:0">${icon('alert')}<div>Ce projet n'est pas encore compilé et le Pi n'est pas connecté. Branche le Pi (écran Compagnon Pi), lance <code>scripts\\compile_all.bat</code> sur un PC, ou télécharge le code pour l'Arduino IDE.</div></div><button class="btn sm" id="fp-ino" style="margin-top:8px">${icon('download')}Code .ino</button>`;
        const b = $('#fp-ino', d.body); if (b && res) b.onclick = () => download(pid + '.ino', res.code);
      }
      goBtn.disabled = !source || !$('#fp-ready', d.body).checked;
    }

    async function compileOnPi() {
      const files = res ? { [pid + '.ino']: res.code, 'project.json': JSON.stringify({ id: pid, title, board, spec: Object.assign({}, baseSpec, { board }), generator: 'ESP32 LAB Studio' }, null, 1) } : null;
      const body = { project_id: pid, board, priority: 70 };
      if (files && !lib) body.files = files;
      const q = await piJ('/api/v1/build', body);
      const eta = source.est ? source.est.total_s : 300;
      const t0 = Date.now();
      for (;;) {
        if (cancelled) return null;
        await A.sleep(2000);
        let j; try { j = await A.piRequest('/api/v1/jobs/' + encodeURIComponent(q.id)); } catch (e) { continue; }
        const el = (Date.now() - t0) / 1000;
        const pct = j.status === 'success' ? 100 : Math.max(j.progress || 0, Math.min(95, Math.round(100 * el / Math.max(eta, 1))));
        stage(j.status === 'queued' || j.status === 'claimed' ? 'En attente dans la file du Pi' : `Compilation sur le Pi : ${j.stage || j.status}`, pct, `${mmss(el)} écoulées · reste ≈ ${mmss(Math.max(0, eta - el))}`);
        if (j.log) logBox.textContent = j.log.split('\n').slice(-12).join('\n');
        if (j.status === 'success') return { job: q.id, sha256: j.sha256, elapsed: el };
        if (j.status === 'failed' || j.status === 'canceled') {
          let diag = '';
          try { const r = await piJ('/api/v1/patricia/diagnose', { log: j.log || '', kind: 'compile' }); diag = (r.findings || []).map((f) => `<li><b>${esc(f.title)}</b> ${esc((f.fixes || [])[0] || f.explanation || '')}</li>`).join(''); } catch (e) { /* Patricia absente */ }
          throw new Error(`Compilation échouée${j.error ? ' : ' + j.error : ''}${diag ? `<ul class="small" style="margin:6px 0 0;padding-left:18px">${diag}</ul>` : ''}`);
        }
      }
    }

    async function run() {
      goBtn.disabled = true; $('#fp-w', d.body).disabled = true;
      $('#fp-run', d.body).hidden = false; $('#fp-res', d.body).innerHTML = '';
      $('#fp-run', d.body).scrollIntoView({ behavior: 'smooth' });
      const expect = res ? res.outs.filter((o) => o.module !== 'Variable').slice(0, 4).map((o) => o.key) : [];
      try {
        step(3);
        if (source.kind === 'sd') {
          stage('Firmware lu sur la microSD du S3', 30);
          await post('/api/worker/flash', { id: worker, path: source.path, mode: 'project' });
        } else {
          const b = await compileOnPi();
          if (!b) return;
          step(4); stage('Le S3 autorise l\'OTA, le worker télécharge le firmware…', 96, `compilé en ${mmss(b.elapsed)}`);
          const link = await A.piRequest('/api/v1/jobs/' + encodeURIComponent(b.job) + '/firmware-link');
          await post('/api/worker/flash/remote', { id: worker, url: link.url, sha256: b.sha256, mode: 'project' });
        }
        step(4);
        logBox.textContent = '';
        const secs = 25;
        const { text, state } = await A.readWorkerSerial(worker, secs, (s, t, st) => {
          stage(st === 'FLASHING' ? 'Flash du worker en cours' : `Lecture du moniteur de W${worker}`, Math.min(100, Math.round(100 * s / secs)), `${s}/${secs} s`);
          if (s > 3) step(5);
          logBox.textContent = t.split('\n').slice(-14).join('\n');
        });
        if (cancelled) return;
        step(6);
        let v = null;
        if (piReady()) { try { v = await piJ('/api/v1/patricia/verify', { log: text, expect: expect.map((k) => '(^|\\t)' + k + ':') }); } catch (e) { v = null; } }
        if (!v) v = A.localVerdict(text, expect);
        const ok = v.verdict === 'ok', fail = v.verdict === 'echec';
        $('#fp-meter', d.body).className = 'meter ' + (ok ? 'ok' : fail ? 'bad' : 'warn');
        stage(ok ? 'Ça fonctionne' : fail ? 'Échec' : 'Résultat incertain', 100, state ? 'worker ' + state : '');
        $('#fp-res', d.body).innerHTML = `<div class="banner ${ok ? '' : 'warn'}" style="margin:0">${icon(ok ? 'check' : 'alert')}<div><b>${ok ? `« ${esc(title)} » tourne sur W${esc(worker)}.` : fail ? 'Le moniteur montre un problème.' : 'Je n\'ai pas pu confirmer que tout marche.'}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${(v.reasons || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
          ${!text.trim() ? '<div class="hint">Aucune sortie reçue : active « Envoyer les mesures au MASTER » dans le Studio, ou branche la carte en USB au S3.</div>' : ''}</div></div>
          <div class="row wrap" style="margin-top:10px">${ok ? '' : `<button class="btn sm" id="fp-ask">${icon('sparkles')}Demander à Patricia</button>`}<a class="btn sm" href="#sensors">${icon('activity')}Capteurs en direct</a><a class="btn sm" href="#workers">${icon('cpu')}Workers</a></div>`;
        const ask = $('#fp-ask', d.body);
        if (ask) ask.onclick = () => { d.close(); A.go('assistant'); setTimeout(() => A.Patricia && A.Patricia.ask && A.Patricia.ask(`Le projet « ${title} » flashé sur W${worker} ne marche pas. Moniteur :\n${text.slice(-1500)}`), 400); };
        if (piReady() && !lib) piJ('/api/v1/patricia/notes', { text: `Flash de « ${title} » sur W${worker} (${BOARD_NAMES[board]}) : ${ok ? 'fonctionne' : fail ? 'échec' : 'incertain'}.`, project: pid, kind: 'journal' }).catch(() => {});
      } catch (e) {
        $('#fp-meter', d.body).className = 'meter bad';
        stage('Arrêté', null);
        $('#fp-res', d.body).innerHTML = `<div class="banner warn" style="margin:0">${icon('alert')}<div>${String(e.message || e).includes('<ul') ? e.message : esc(e.message || String(e))}</div></div>`;
        goBtn.disabled = false; $('#fp-w', d.body).disabled = false;
      }
    }

    $('#fp-w', d.body).onchange = prepare;
    $('#fp-ready', d.body).onchange = (e) => { goBtn.disabled = !source || !e.target.checked; if (e.target.checked) step(3); };
    goBtn.onclick = run;
    // opts.auto : lancé par Patricia en mode « agir directement » → enchaîne dès que le firmware a une source
    prepare().then(() => { if (opts.auto && !cancelled && source) { step(3); run(); } });
  };

  A.commands.push({ title: 'Flasher le projet du Studio sur un worker', group: 'Action', icon: 'zap', run: () => A.actions['st-flash'] && A.actions['st-flash']() });
})();
/* ---- 50_sys.js ---- */
/* Pages système : fichiers microSD, USB & Arduino, assistant, réglages. */
(function () {
  'use strict';
  const A = window.APP;
  const { $, $$, esc, icon, api, post, postJSON, act, toast, modal, confirmBox, drawer, fmtBytes, fmtDur, fmtNum, fmtClock, store, download, copyText, S } = A;

  const TEXT_EXT = /\.(ino|cpp|c|h|hpp|txt|md|json|csv|log|ini|yml|yaml|cfg|py|js|html|css|hex)$/i;
  const CODE_EXT = /\.(ino|cpp|c|h|hpp)$/i;
  const fileIcon = (it) => (it.type === 'd' ? 'folder' : CODE_EXT.test(it.name) ? 'code' : /\.bin$/i.test(it.name) ? 'chip' : /\.csv$/i.test(it.name) ? 'activity' : 'file');

  /* ================================================================ */
  /* Fichiers (microSD)                                               */
  /* ================================================================ */
  A.page({
    id: 'files', title: 'Fichiers', icon: 'folder', group: 'sys',
    desc: 'Explorateur de la microSD : projets, firmwares, rapports',
    render(el, q) {
      let path = (q && q.path) || store.get('files.path', '/sd');
      let data = null;
      A.setTopActions(S.admin ? `<button class="btn" data-fx="mkdir">${icon('plus')}<span class="lbl">Dossier</span></button><label class="btn primary" style="cursor:pointer">${icon('upload')}<span class="lbl">Envoyer</span><input type="file" id="fx-up" multiple hidden></label>` : '');
      el.innerHTML = `<div class="card"><div class="card-h"><div class="grow"><div class="crumbs-bar" id="fx-crumbs"></div></div><div class="hide-sm" id="fx-usage" style="min-width:180px"></div></div>
        <div class="card-b flush" style="margin-top:10px" id="fx-list"></div></div>
        ${S.admin ? `<div class="dropzone" id="fx-drop" style="margin-top:16px">${icon('upload')}<div>Glissez des fichiers ici pour les envoyer dans le dossier courant (8 Mo max par fichier).</div><div id="fx-prog" class="small"></div></div>` : `<div class="banner" style="margin-top:16px">${icon('info')}<div>Lecture seule : connectez-vous en administrateur pour envoyer, renommer ou supprimer.</div></div>`}`;
      const load = async () => {
        store.set('files.path', path);
        $('#fx-list', el).innerHTML = '<div style="padding:16px" class="stack"><div class="skel"></div><div class="skel" style="width:70%"></div></div>';
        try { data = await api('/api/sd/list?path=' + encodeURIComponent(path)); }
        catch (e) {
          data = null;
          $('#fx-list', el).innerHTML = `<div class="empty">${icon(e.status === 503 ? 'sd' : 'lock')}<h3>${esc(e.message)}</h3>${path !== '/sd' ? '<button class="btn sm" data-fx="root">Retour à la racine</button>' : ''}</div>`;
          if (e.status !== 503 && path !== '/sd') { path = '/sd'; }
          return;
        }
        draw();
      };
      const draw = () => {
        const parts = path.split('/').filter(Boolean);
        $('#fx-crumbs', el).innerHTML = parts.map((p, i) => `<button data-go="/${parts.slice(0, i + 1).join('/')}">${i === 0 ? icon('sd') + ' microSD' : esc(p)}</button>`).join(`<span class="muted">/</span>`);
        if (data.total) { const used = data.total - data.free; $('#fx-usage', el).innerHTML = `<div class="small muted" style="text-align:right;margin-bottom:4px">${fmtBytes(data.free)} libres sur ${fmtBytes(data.total)}</div><div class="meter ${used / data.total > 0.9 ? 'bad' : ''}"><i style="width:${(100 * used / data.total).toFixed(1)}%"></i></div>`; }
        const items = (data.items || []).slice().sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, 'fr', { numeric: true }) : a.type === 'd' ? -1 : 1));
        $('#fx-list', el).innerHTML = items.length ? `<div class="table-wrap"><table class="tbl responsive"><thead><tr><th>Nom</th><th>Taille</th><th class="hide-sm">Modifié</th><th></th></tr></thead><tbody>${path !== '/sd' ? `<tr class="click" data-go="${esc(path.replace(/\/[^/]+$/, '') || '/sd')}"><td class="wide"><span class="row">${icon('back')}<span class="muted">Dossier parent</span></span></td><td></td><td class="hide-sm"></td><td></td></tr>` : ''}${items.map((it) => {
          const full = path + '/' + it.name;
          return `<tr class="click" ${it.type === 'd' ? `data-go="${esc(full)}"` : `data-view="${esc(full)}"`}><td class="wide"><span class="row"><span class="icon-tile ${it.type === 'd' ? 'accent' : ''}" style="width:28px;height:28px">${icon(fileIcon(it))}</span><span class="ellipsis" style="font-weight:${it.type === 'd' ? 600 : 450}">${esc(it.name)}</span></span></td>
            <td data-l="Taille" class="num small">${it.type === 'd' ? '—' : fmtBytes(it.size)}</td><td data-l="Modifié" class="small muted hide-sm">${it.mtime ? esc(new Date(it.mtime * 1000).toLocaleString('fr-FR')) : ''}</td>
            <td style="text-align:right;white-space:nowrap">${it.type === 'f' ? `<a class="btn sm icon ghost" href="/api/sd/download?path=${encodeURIComponent(full)}" download title="Télécharger" data-stop>${icon('download')}</a>` : ''}${data.admin ? `<button class="btn sm icon ghost" data-ren="${esc(full)}" title="Renommer">${icon('edit')}</button><button class="btn sm icon ghost danger" data-del="${esc(full)}" data-dir="${it.type === 'd' ? 1 : 0}" title="Supprimer">${icon('trash')}</button>` : ''}</td></tr>`;
        }).join('')}</tbody></table></div>` : `<div class="empty">${icon('folder')}<div class="small">Dossier vide</div></div>`;
      };
      const upload = async (files) => {
        const prog = $('#fx-prog', el);
        for (const f of files) {
          const dst = path + '/' + f.name;
          try {
            await A.uploadFile('/api/sd/upload', f, { 'X-Path': encodeURIComponent(dst) }, (p) => { if (prog) prog.textContent = `${f.name} : ${Math.round(p * 100)} %`; });
            toast(`${f.name} envoyé`, 'ok');
          } catch (e) { toast(`${f.name} : ${e.message}`, 'bad'); }
        }
        if (prog) prog.textContent = '';
        load();
      };
      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-stop]')) { e.stopPropagation(); if (S.demo) { e.preventDefault(); toast('Téléchargement indisponible en démonstration', 'warn'); } return; }
        const del = e.target.closest('[data-del]');
        if (del) {
          e.stopPropagation();
          if (await confirmBox('Supprimer', `Supprimer « ${del.dataset.del} » ?${del.dataset.dir === '1' ? ' (le dossier doit être vide)' : ''}`, 'Supprimer', true)) { await act(post('/api/sd/delete', { path: del.dataset.del }), 'Supprimé'); load(); }
          return;
        }
        const ren = e.target.closest('[data-ren]');
        if (ren) {
          e.stopPropagation();
          const old = ren.dataset.ren, dir = old.replace(/\/[^/]+$/, ''), name = old.split('/').pop();
          const v = await modal({ title: 'Renommer', input: name, label: 'Nouveau nom', ok: 'Renommer' });
          if (v && v !== name) { await act(post('/api/sd/rename', { path: old, to: dir + '/' + v }), 'Renommé'); load(); }
          return;
        }
        const go = e.target.closest('[data-go]');
        if (go) { path = go.dataset.go; load(); return; }
        const view = e.target.closest('[data-view]');
        if (view) { viewFile(view.dataset.view); return; }
        const fx = e.target.closest('[data-fx]');
        if (fx && fx.dataset.fx === 'root') { path = '/sd'; load(); }
      });
      const top = $('#top-actions');
      if (top) {
        top.onclick = async (e) => {
          const b = e.target.closest('[data-fx="mkdir"]');
          if (!b) return;
          const v = await modal({ title: 'Nouveau dossier', input: '', label: 'Nom', placeholder: 'MON_DOSSIER', ok: 'Créer' });
          if (v) { await act(post('/api/sd/mkdir', { path: path + '/' + v }), 'Dossier créé'); load(); }
        };
        const up = $('#fx-up');
        if (up) up.onchange = (e) => { upload(Array.from(e.target.files)); e.target.value = ''; };
      }
      const dz = $('#fx-drop', el);
      if (dz) {
        ['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add('over'); }));
        ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
        dz.addEventListener('drop', (e) => upload(Array.from(e.dataTransfer.files)));
      }
      load();
      return () => { if (top) top.onclick = null; };
    }
  });

  async function viewFile(path) {
    const name = path.split('/').pop();
    const d = drawer(name, '<div class="skel"></div>', { sub: esc(path), actions: `<a class="btn sm" href="/api/sd/download?path=${encodeURIComponent(path)}" download>${icon('download')}Télécharger</a>` });
    if (/\.(png|jpe?g|svg)$/i.test(name)) {
      d.body.innerHTML = `<div class="montage"><img src="/api/sd/download?inline=1&path=${encodeURIComponent(path)}" alt="${esc(name)}"></div>`;
      return;
    }
    const ctx = A.firmwareContext ? A.firmwareContext(path) : null;
    if (ctx && /\.(bin|hex)$/i.test(name)) {
      const board = ctx.kind === 'avr' ? 'avr' : ctx.board || 'esp32';
      const label = ctx.kind === 'avr' ? 'Arduino Uno / Nano' : { esp32: 'ESP32 Dev Module', esp32s3: 'ESP32-S3', esp32c3: 'ESP32-C3' }[board];
      d.body.innerHTML = `<div class="banner" style="margin:0 0 12px">${icon('chip')}<div>Firmware <b>${esc(label)}</b>${ctx.id ? ` — projet <b>${esc(ctx.id)}</b>` : ''}${ctx.bench ? ' (variante banc fantôme)' : ''}</div></div>
        <div class="row wrap" style="margin-bottom:14px"><button class="btn primary" data-fl="usb" ${S.admin ? '' : 'disabled title="Connexion administrateur requise"'}>${icon('usb')}Flasher par câble</button>${ctx.kind === 'esp' ? `<button class="btn" data-fl="worker" ${S.admin ? '' : 'disabled'}>${icon('rocket')}Charger sur un worker…</button>` : ''}${ctx.id ? `<a class="btn" href="#library?p=${esc(ctx.id)}">${icon('book')}Fiche du projet</a>` : ''}</div>
        <h3 style="margin-bottom:8px">Montage</h3><div data-m><div class="skel"></div></div>`;
      $('[data-m]', d.body).innerHTML = await A.montageHtml(ctx);
      d.body.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-fl]');
        if (!b || b.disabled) return;
        if (b.dataset.fl === 'usb') { A.flashPreselect = { board, path, ctx }; d.close(); A.go('usb'); return; }
        const ws = ((S.state && S.state.workers) || []).filter((w) => w.state === 'READY');
        if (!ws.length) { toast('Aucun worker prêt', 'warn'); return; }
        const v = await modal({ title: 'Charger sur quel worker ?', html: `<select class="select" id="fw-w">${ws.map((w) => `<option value="${w.id}">W${w.id}${w.label ? ' — ' + esc(w.label) : ''}</option>`).join('')}</select>`, ok: 'Continuer' });
        if (v) { const id = Number(document.getElementById('fw-w').value); d.close(); A.flashWorker(id, true); }
      });
      return;
    }
    if (!TEXT_EXT.test(name)) { d.body.innerHTML = `<div class="empty">${icon('file')}<div class="small">Aperçu indisponible pour ce type de fichier.</div></div>`; return; }
    try {
      let text;
      if (S.demo) text = A.Demo.fileText(path);
      else {
        const r = await fetch('/api/sd/download?path=' + encodeURIComponent(path), { credentials: 'same-origin' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        text = await r.text();
      }
      if (text.length > 400000) text = text.slice(0, 400000) + '\n… (aperçu tronqué)';
      let extra = '';
      if (/\.csv$/i.test(name)) extra = csvChart(text);
      d.body.innerHTML = extra + (CODE_EXT.test(name) ? A.codeBlock(text, '70vh') : `<pre class="code" style="padding:12px 14px;white-space:pre-wrap;max-height:70vh">${esc(text)}</pre>`);
    } catch (e) { d.body.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
  }
  /* Graphique automatique des colonnes numériques d'un CSV (journaux de mesures). */
  function csvChart(text) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 3) return '';
    const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const head = lines[0].split(sep).map((h) => h.trim());
    const rows = lines.slice(1).map((l) => l.split(sep));
    const numCols = head.map((h, i) => i).filter((i) => rows.filter((r) => isFinite(parseFloat(r[i]))).length > rows.length * 0.8 && !/time|date|epoch|horodat|ms$/i.test(head[i]));
    if (!numCols.length) return '';
    const step = Math.max(1, Math.floor(rows.length / 400));
    const series = numCols.slice(0, 5).map((c, k) => ({ data: rows.filter((_, i) => i % step === 0).map((r) => parseFloat(r[c])), color: A.PALETTE[k] }));
    return `<div class="card pad" style="margin-bottom:14px"><h3 style="margin-bottom:8px">Aperçu graphique · ${rows.length} lignes</h3>${A.lineChart(series, { h: 200 })}<div class="legend" style="margin-top:6px">${numCols.slice(0, 5).map((c, k) => `<span><i style="background:${A.PALETTE[k]}"></i>${esc(head[c])}</span>`).join('')}</div></div>`;
  }
  A.viewFile = viewFile;

  /* La page « USB & Flash » (moniteur série + programmation Arduino/ESP32) est dans 46_flash.js. */

  /* La page « Patricia » (assistante) est dans 55_patricia.js ; elle réutilise catalogAnswer ci-dessous. */
  /* Réponses immédiates tirées du catalogue embarqué (fonctionne sans Internet). */
  A.catalogAnswer = catalogAnswer;
  function catalogAnswer(q) {
    const LAB = window.LAB, nq = A.norm(q);
    if (!LAB.MODULES) return null;
    const hit = LAB.MODULES.map((m) => {
      const names = [m.id, m.name].concat(m.name.split(/[\s/()]+/)).map(A.norm).filter((x) => x.length >= 4);
      return { m, s: names.filter((n) => nq.includes(n)).reduce((a, n) => a + n.length, 0) };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s)[0];
    if (!hit) return null;
    const m = hit.m, b = LAB.BOARDS.esp32;
    let res = null;
    try { res = LAB.generate({ board: 'esp32', title: m.name, modules: [{ id: m.id }] }); } catch (e) { /* ignoré */ }
    const lines = [`${m.name} — ${m.desc}`];
    if (res && res.wiring.length) lines.push('Câblage (ESP32) : ' + res.wiring.map((w) => `${w.pin} → ${w.to}`).join(', ') + '.');
    if (m.bus === 'i2c') lines.push(`Bus I2C : SDA ${b.i2c.sda}, SCL ${b.i2c.scl}${m.addr ? ', adresse ' + m.addr.join(' ou ') : ''}.`);
    if (m.libs && m.libs.length) lines.push('Bibliothèques : ' + m.libs.map((l) => `${l.name} ${l.ver}`).join(', ') + '.');
    (m.notes || []).slice(0, 3).forEach((n) => lines.push('• ' + n));
    if (/nan|erreur|marche pas|fonctionne pas|probl/.test(nq)) lines.push('• Vérifiez l\'alimentation (3V3 ou 5V selon le module), la masse commune et la broche de données ; testez avec le projet de la bibliothèque sans rien d\'autre.');
    lines.push(`Projet prêt à téléverser : #library?p=${m.id}`);
    return lines.join('\n');
  }

  /* ================================================================ */
  /* Réglages & système                                               */
  /* ================================================================ */
  const STABS = [['system', 'Système', 'cpu'], ['config', 'Configuration', 'settings'], ['update', 'Mises à jour', 'rocket'], ['network', 'Réseau', 'wifi'], ['logs', 'Journal', 'history'], ['prefs', 'Préférences', 'monitor'], ['about', 'À propos', 'info']];
  A.page({
    id: 'settings', title: 'Réglages', icon: 'settings', group: 'sys',
    desc: 'Système, configuration, mises à jour, journal',
    render(el, q) {
      let tab = (q && q.tab) || 'system';
      el.innerHTML = `<div class="tabs" id="se-tabs">${STABS.map(([k, n, i]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${icon(i)}${n}</button>`).join('')}</div><div class="tab-panel" id="se-body"></div>`;
      let body = $('#se-body', el), off = null;
      const show = () => {
        if (off) { off(); off = null; }
        const nb = body.cloneNode(false); body.replaceWith(nb); body = nb;
        off = SET[tab](body) || null;
      };
      $('#se-tabs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; $$('#se-tabs button', el).forEach((x) => x.classList.toggle('on', x === b)); show(); });
      show();
      return () => { if (off) off(); };
    }
  });
  const needAdmin = (el) => { el.innerHTML = `<div class="card"><div class="empty">${icon('lock')}<h3>Réservé à l'administrateur</h3><button class="btn primary" data-act="admin">${icon('unlock')}Se connecter</button></div></div>`; };

  const SET = {
    system(el) {
      el.innerHTML = '<div class="skel"></div>';
      api('/api/system/info').then((i) => {
        const m = (S.state && S.state.master) || {};
        el.innerHTML = `<div class="grid g-2"><div class="card pad"><h3 style="margin-bottom:10px">Carte MASTER</h3><dl class="dl">
          <dt>Version</dt><dd><b>${esc(i.version)}</b> « ${esc(i.codename)} »</dd><dt>ESP-IDF</dt><dd class="mono">${esc(i.idf)}</dd><dt>Puce</dt><dd>${esc(i.target)} rév. ${i.chip_revision} · ${i.cores} cœurs · ${m.cpu_mhz || 240} MHz</dd>
          <dt>Flash / PSRAM</dt><dd>${fmtBytes(i.flash_size)} / ${fmtBytes(i.psram_total)}</dd><dt>Variante</dt><dd>${esc(i.board_variant)}</dd><dt>MAC (AP)</dt><dd class="mono">${esc(i.ap_mac)}</dd>
          <dt>Dernier démarrage</dt><dd>${esc(i.reset_reason)}</dd><dt>En marche depuis</dt><dd>${fmtDur(i.uptime_ms)}</dd><dt>Portail captif</dt><dd>${i.captive_portal ? 'actif' : 'désactivé'}</dd>
          ${i.sd_total ? `<dt>microSD</dt><dd>${fmtBytes(i.sd_free)} libres / ${fmtBytes(i.sd_total)}</dd>` : '<dt>microSD</dt><dd>absente</dd>'}</dl></div>
          <div class="stack"><div class="card pad"><h3 style="margin-bottom:10px">Micrologiciel</h3><dl class="dl"><dt>Partition active</dt><dd class="mono">${esc(i.ota.running)}</dd><dt>Prochaine</dt><dd class="mono">${esc(i.ota.next)} (${fmtBytes(i.ota.slot_size)})</dd><dt>Compilé le</dt><dd>${esc(i.ota.build_date)} ${esc(i.ota.build_time)}</dd></dl></div>
          <div class="card pad"><h3 style="margin-bottom:10px">Actions</h3><div class="btn-group"><button class="btn" data-sx="identify">${icon('eye')}Faire clignoter la LED</button><button class="btn" data-sx="report" ${S.admin ? '' : 'disabled'}>${icon('save')}Rapport sur la microSD</button><button class="btn" data-sx="notify" ${S.admin ? '' : 'disabled'}>${icon('bell')}Tester les notifications</button><button class="btn danger" data-sx="reboot" ${S.admin ? '' : 'disabled'}>${icon('power')}Redémarrer</button></div></div></div></div>`;
      }).catch((e) => { el.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; });
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-sx]');
        if (!b || b.disabled) return;
        const k = b.dataset.sx;
        if (k === 'identify') act(post('/api/system/identify'), 'La LED du MASTER clignote');
        else if (k === 'report') act(post('/api/report/snapshot'), (r) => 'Rapport : ' + r.path);
        else if (k === 'notify') act(post('/api/notify/test'), (r) => `Notification envoyée (WhatsApp ${r.whatsapp || '—'}, webhook ${r.webhook || '—'})`);
        else if (k === 'reboot' && await confirmBox('Redémarrer le MASTER', 'Les workers se reconnecteront automatiquement ; la page se rechargera.', 'Redémarrer', true)) {
          const r = await act(post('/api/system/reboot'));
          if (r) { toast('Redémarrage…', 'warn'); setTimeout(() => location.reload(), 9000); }
        }
      });
    },

    config(el) {
      if (!S.admin) return needAdmin(el);
      el.innerHTML = '<div class="skel"></div>';
      api('/api/admin/config').then((c) => {
        const f = (k, label, extra) => `<div class="field ${extra && extra.full ? 'full' : ''}"><label>${label}</label><input class="input" data-c="${k}" value="${esc(c[k] != null ? c[k] : '')}" ${extra && extra.type ? `type="${extra.type}"` : ''} ${extra && extra.ph ? `placeholder="${esc(extra.ph)}"` : ''} autocomplete="off">${extra && extra.hint ? `<div class="hint">${extra.hint}</div>` : ''}</div>`;
        const secret = (k, label, isSet) => `<div class="field"><label>${label}</label><input class="input" data-c="${k}" type="password" placeholder="${isSet ? '•••••• (inchangé si vide)' : 'non défini'}" autocomplete="new-password"></div>`;
        el.innerHTML = `<form id="cf" class="stack">
          <div class="card"><div class="card-h"><h2>Point d'accès du laboratoire</h2></div><div class="card-b form-grid">${f('ap_ssid', 'Nom du réseau (SSID)')}${secret('ap_pass', 'Mot de passe (8 caractères min.)', true)}
            <div class="field"><label>Canal Wi-Fi</label><select class="select" data-c="ap_channel" data-num>${Array.from({ length: 13 }, (_, i) => `<option ${c.ap_channel === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select><div class="hint">1, 6 ou 11 conseillés — voir Réglages › Réseau.</div></div>${f('hostname', 'Nom d\'hôte (mDNS)', { hint: 'Accès par http://&lt;nom&gt;.local' })}
            <label class="switch full"><input type="checkbox" data-c="captive_portal" ${c.captive_portal ? 'checked' : ''}><span class="track"></span>Portail captif (le tableau de bord s'ouvre à la connexion au Wi-Fi)</label></div></div>
          <div class="card"><div class="card-h"><h2>Accès Internet (facultatif)</h2></div><div class="card-b form-grid">${f('sta_ssid', 'Réseau de la maison (SSID)')}${secret('sta_pass', 'Mot de passe', c.sta_pass_set)}${f('ntp_server', 'Serveur NTP', { ph: 'pool.ntp.org' })}${f('timezone', 'Fuseau horaire (POSIX)', { ph: 'CET-1CEST,M3.5.0,M10.5.0/3', hint: '<a href="#tools?t=tz">Liste des fuseaux</a>' })}</div></div>
          <div class="card"><div class="card-h"><h2>Administration</h2></div><div class="card-b form-grid">${secret('admin_pass', 'Nouveau mot de passe administrateur', true)}<div class="field"><label>Chemin de contrôle</label><input class="input mono" value="${esc(c.control_path)}" readonly><div class="hint">Généré à la première mise sous tension ; réinitialisation usine : BOOT 10 s.</div></div></div></div>
          <div class="card"><div class="card-h"><h2>Notifications</h2></div><div class="card-b form-grid">${f('whatsapp_phone', 'WhatsApp : votre numéro (format international)', { ph: '+33612345678' })}${secret('whatsapp_api', 'WhatsApp : clé API CallMeBot', c.whatsapp_configured)}
            <details class="full small" style="color:var(--text-2)"><summary style="cursor:pointer;font-weight:600">Obtenir la clé WhatsApp gratuite (CallMeBot) — 2 minutes</summary><ol style="margin:8px 0 0;padding-left:18px">
              <li>Enregistrez le contact <b>+34 644 78 13 70</b> dans votre téléphone.</li>
              <li>Envoyez-lui sur WhatsApp : <code>I allow callmebot to send me messages</code></li>
              <li>Vous recevez « API Activated… apikey: <b>123456</b> ». Copiez ce nombre dans « clé API ».</li>
              <li>Numéro : le vôtre, avec l'indicatif (<code>+33…</code> pour la France, <code>+32…</code> Belgique, <code>+225…</code> Côte d'Ivoire…).</li>
              <li>Le MASTER doit avoir Internet (carte « Accès Internet » ci-dessus). Enregistrez, puis <b>Réglages › Système › Tester les notifications</b>.</li></ol>
              <p style="margin:6px 0 0">Service gratuit pour usage personnel : messages vers <b>votre propre</b> numéro uniquement.</p></details>
            ${f('webhook_url', 'Webhook (facultatif) : URL complète du service', { full: true, ph: 'https://ntfy.sh/mon-labo-7f3a  ou  https://discord.com/api/webhooks/…', hint: 'Laissez vide si vous utilisez seulement WhatsApp. Le format du message s\'adapte au service reconnu dans l\'URL.' })}
            <details class="full small" style="color:var(--text-2)"><summary style="cursor:pointer;font-weight:600">Que mettre dans « Webhook » ? (exemples)</summary><ul style="margin:8px 0 0;padding-left:18px">
              <li><b>ntfy</b> (le plus simple, application gratuite Android/iOS) : installez « ntfy », abonnez-vous à un sujet inventé et difficile à deviner (ex. <code>mon-labo-7f3a</code>), puis mettez <code>https://ntfy.sh/mon-labo-7f3a</code>.</li>
              <li><b>Discord</b> : Paramètres du salon › Intégrations › Webhooks › Nouveau webhook › Copier l'URL (<code>https://discord.com/api/webhooks/…</code>).</li>
              <li><b>Telegram</b> : créez un bot avec @BotFather, puis <code>https://api.telegram.org/bot&lt;TOKEN&gt;/sendMessage?chat_id=&lt;VOTRE_ID&gt;</code>.</li>
              <li><b>Slack, Google Chat, Home Assistant, n8n, Node-RED</b> : l'URL « incoming webhook » du service (JSON <code>text</code> / <code>message</code>).</li></ul></details></div></div>
          <div class="card"><div class="card-h"><h2>Assistant IA en ligne (facultatif)</h2></div><div class="card-b form-grid">${f('ai_endpoint', 'URL compatible OpenAI (chat/completions)', { full: true, ph: 'https://api.exemple.com/v1/chat/completions' })}${secret('ai_key', 'Clé API', c.ai_key_set)}${f('ai_model', 'Modèle')}${f('search_endpoint', 'Recherche web (facultatif)', { full: true })}</div></div>
          <div class="card"><div class="card-h"><h2>Matériel & mises à jour</h2></div><div class="card-b form-grid">${f('board_variant', 'Variante de carte')}<div class="field"><label>GPIO de la LED RGB</label><input class="input" type="number" data-c="rgb_gpio" data-num value="${c.rgb_gpio}"></div>
            <div class="field"><label>GPIO du capteur DHT</label><input class="input" type="number" data-c="dht_gpio" data-num value="${c.dht_gpio}"></div><div class="field"><label>Type de capteur</label><select class="select" data-c="dht_type" data-num><option value="11" ${c.dht_type === 11 ? 'selected' : ''}>DHT11</option><option value="22" ${c.dht_type === 22 ? 'selected' : ''}>DHT22 / AM2302</option></select></div>
            ${f('github_repo', 'Dépôt GitHub des mises à jour', { full: true, ph: 'Prince223889/ESP32-box', hint: 'Format <code>utilisateur/depot</code>. Le MASTER lit la dernière <b>Release</b> et son fichier <code>*master*.bin</code>. Prioritaire sur le manifeste ci-dessous.' })}
            ${f('update_manifest', 'Manifeste JSON (facultatif, si pas de GitHub)', { full: true, ph: 'https://…/manifest.json' })}<label class="switch full"><input type="checkbox" data-c="auto_updates" ${c.auto_updates ? 'checked' : ''}><span class="track"></span>Vérifier automatiquement chaque jour (une alerte WhatsApp est envoyée ; l'installation attend votre approbation)</label></div></div>
          <div class="row" style="justify-content:flex-end;position:sticky;bottom:calc(var(--bottombar) * 0 + 12px)"><button class="btn primary" type="submit">${icon('save')}Enregistrer et redémarrer</button></div></form>`;
        $('#cf', el).addEventListener('submit', async (e) => {
          e.preventDefault();
          const out = {};
          $$('[data-c]', el).forEach((i) => {
            if (i.readOnly) return;
            const k = i.dataset.c;
            if (i.type === 'checkbox') out[k] = i.checked;
            else if (i.dataset.num != null) out[k] = Number(i.value);
            else if (i.type === 'password') { if (i.value) out[k] = i.value; }
            else out[k] = i.value.trim();
          });
          if (!(await confirmBox('Enregistrer la configuration', 'Le MASTER va redémarrer pour appliquer les réglages. Si vous changez le Wi-Fi, reconnectez-vous au nouveau réseau.', 'Enregistrer'))) return;
          const r = await act(A.postJSON('/api/admin/config', out));
          if (r && r.ok) { toast('Configuration enregistrée : redémarrage…', 'ok'); setTimeout(() => location.reload(), 10000); }
        });
      }).catch((e) => { el.innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(e.message)}</div></div>`; });
    },

    update(el) {
      if (!S.admin) return needAdmin(el);
      el.innerHTML = `<div class="grid g-2"><div class="card pad stack" style="gap:12px"><h2>Mise à jour par Internet</h2><p class="small muted">Le MASTER lit la dernière <b>Release</b> de votre dépôt GitHub (Réglages › Configuration), télécharge le fichier <code>*master*.bin</code> et l'installe après votre approbation. Le MASTER vérifie le SHA-256 publié par GitHub et l'intégrité de l'image avant activation ; en cas d'échec au démarrage, retour automatique à la version précédente.</p>
          <div class="row"><button class="btn" id="up-check">${icon('refresh')}Rechercher une mise à jour</button><button class="btn primary" id="up-go" hidden>${icon('download')}Installer maintenant</button></div><div id="up-res"></div></div>
        <div class="card pad stack" style="gap:12px"><h2>Envoyer un firmware (.bin)</h2><p class="small muted">Fichier <code>build/esp32_lab_master.bin</code> produit par <code>idf.py build</code>. L'image est vérifiée (en-tête, taille, empreinte) avant activation.</p>
          <label class="dropzone" style="cursor:pointer" id="up-drop">${icon('upload')}<div>Choisir ou déposer le fichier .bin</div><input type="file" id="up-file" accept=".bin" hidden></label><div class="meter" id="up-meter" hidden><i style="width:0"></i></div><div id="up-msg" class="small"></div></div></div>`;
      $('#up-check', el).onclick = async () => {
        $('#up-res', el).innerHTML = '<div class="skel"></div>';
        const r = await act(post('/api/update/check'));
        if (!r) { $('#up-res', el).innerHTML = ''; return; }
        $('#up-go', el).hidden = !r.available;
        const assets = (r.assets || '').split(';').filter(Boolean).map((a) => { const [n, u] = a.split('|'); return { n, u }; });
        const assetsHtml = assets.length ? `<div class="card pad" style="margin-top:10px"><h3 style="margin-bottom:6px">Autres firmwares de cette Release</h3><p class="small muted">Pour les workers ou d'autres cartes : téléchargez le .bin, puis Fichiers › envoyez-le sur la microSD (dossier FIRMWARE).</p><div class="statlist">${assets.map((a) => `<div><span class="mono small">${esc(a.n)}</span><a class="btn sm" href="${esc(a.u)}" target="_blank" rel="noopener">${icon('download')}Télécharger</a></div>`).join('')}</div></div>` : '';
        $('#up-res', el).innerHTML = (r.available
          ? `<div class="banner">${icon('rocket')}<div><b>Version ${esc(r.version)} disponible</b>${r.source === 'github' ? ' <span class="badge outline">GitHub</span>' : ''}<br><span class="small" style="white-space:pre-wrap">${esc((r.notes || '').slice(0, 400))}</span></div></div>`
          : `<div class="banner">${icon('check')}<div>${esc(r.reason || `À jour (${r.current || ''}${r.latest ? ', dernière : ' + r.latest : ''})`)}</div></div>`) + assetsHtml;
      };
      $('#up-go', el).onclick = async () => { if (await confirmBox('Installer la mise à jour', 'Le MASTER télécharge puis redémarre sur la nouvelle version.', 'Installer')) act(post('/api/update/approve'), 'Téléchargement lancé : redémarrage automatique à la fin'); };
      const send = async (file) => {
        if (!file) return;
        if (!/\.bin$/i.test(file.name)) { toast('Un fichier .bin est attendu', 'warn'); return; }
        if (!(await confirmBox('Installer ce firmware', `${file.name} (${fmtBytes(file.size)}) sera écrit dans la partition OTA libre, puis le MASTER redémarrera.`, 'Installer'))) return;
        const m = $('#up-meter', el); m.hidden = false;
        try {
          const r = await A.uploadFile('/api/ota/upload', file, { 'Content-Type': 'application/octet-stream' }, (p) => { $('i', m).style.width = (p * 100).toFixed(1) + '%'; $('#up-msg', el).textContent = `Envoi ${Math.round(p * 100)} %`; });
          $('#up-msg', el).textContent = r.message || 'Firmware installé : redémarrage…';
          toast('Firmware installé : redémarrage', 'ok');
          setTimeout(() => location.reload(), 12000);
        } catch (e) { $('#up-msg', el).textContent = e.message; toast(e.message, 'bad'); }
      };
      $('#up-file', el).onchange = (e) => send(e.target.files[0]);
      const dz = $('#up-drop', el);
      ['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
      dz.addEventListener('drop', (e) => send(e.dataTransfer.files[0]));
    },

    network(el) {
      const m = (S.state && S.state.master) || {};
      el.innerHTML = `<div class="grid g-2"><div class="card pad"><h3 style="margin-bottom:10px">État</h3><dl class="dl"><dt>Point d'accès</dt><dd><b>${esc(m.ap_ssid)}</b> · ${esc(m.ap_ip)}</dd><dt>Appareils</dt><dd>${m.ap_clients}</dd><dt>Internet</dt><dd>${m.internet ? `connecté · ${esc(m.sta_ip)} · ${m.sta_rssi} dBm` : 'non connecté'}</dd><dt>Accès</dt><dd><span class="mono">http://${esc(m.ap_ip)}</span> ou <span class="mono">http://${esc(m.hostname)}.local</span></dd></dl></div>
        <div class="card pad"><div class="row between" style="margin-bottom:10px"><h3>Réseaux Wi-Fi alentour</h3><button class="btn sm" id="nw-scan" ${S.admin ? '' : 'disabled title="Connexion administrateur requise"'}>${icon('radar')}Scanner</button></div><div id="nw-res" class="small muted">Le scan dure environ 3 secondes ; il sert à choisir le canal le moins encombré.</div></div></div>`;
      $('#nw-scan', el).onclick = async () => {
        const out = $('#nw-res', el);
        out.innerHTML = '<div class="skel"></div>';
        const s = await act(post('/api/wifi/scan'));
        if (!s) { out.innerHTML = ''; return; }
        let r = null;
        for (let i = 0; i < 10; i++) { await A.sleep(900); try { r = await api('/api/wifi/scan'); } catch (e) { r = null; } if (r && r.state === 'done') break; }
        const nets = (r && r.networks) || [];
        out.innerHTML = nets.length ? `<div class="statlist" style="margin-bottom:14px">${nets.sort((a, b) => b.rssi - a.rssi).slice(0, 15).map((n) => `<div><span><b>${esc(n.ssid || '(masqué)')}</b> <span class="muted">canal ${n.channel} · ${esc(n.auth)}</span></span>${A.rssiBars(n.rssi)}</div>`).join('')}</div>${A.channelChart(nets)}` : 'Aucun réseau trouvé.';
      };
    },

    logs(el) {
      let lv = 'all', qq = '';
      el.innerHTML = `<div class="card"><div class="card-h"><div class="grow"><h2>Journal d'événements</h2><div class="card-sub">Mémoire vive (96 derniers) — historique complet dans /sd/LOGS/events.csv</div></div><div class="seg" id="lg-lv"><button data-v="all" class="on">Tout</button><button data-v="W">Alertes</button><button data-v="E">Erreurs</button></div><button class="btn sm" id="lg-dl">${icon('download')}CSV</button></div>
        <div class="card-b" style="padding-bottom:0"><div class="input-icon">${icon('search')}<input class="input" id="lg-q" placeholder="Filtrer…"></div></div><div class="card-b flush" style="margin-top:10px" id="lg-list"></div></div>`;
      const draw = () => {
        const nq = A.norm(qq);
        const list = S.events.filter((e) => (lv === 'all' || e.lv === lv || (lv === 'W' && e.lv === 'E')) && (!nq || A.norm(e.src + ' ' + e.msg).includes(nq)));
        $('#lg-list', el).innerHTML = A.eventsHtml(list, 300);
      };
      $('#lg-lv', el).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; lv = b.dataset.v; $$('#lg-lv button', el).forEach((x) => x.classList.toggle('on', x === b)); draw(); };
      $('#lg-q', el).oninput = (e) => { qq = e.target.value; draw(); };
      $('#lg-dl', el).onclick = () => download('esp32-lab-journal.csv', 'seq;uptime_ms;epoch;niveau;source;message\n' + S.events.map((e) => [e.seq, e.t, e.epoch, e.lv, e.src, '"' + String(e.msg).replace(/"/g, '""') + '"'].join(';')).join('\n'), 'text/csv;charset=utf-8');
      A.pollEvents();
      draw();
      return A.onState(draw);
    },

    prefs(el) {
      const theme = store.get('theme', 'auto') || 'auto';
      el.innerHTML = `<div class="grid g-2"><div class="card pad stack" style="gap:14px"><h2>Affichage</h2><div class="field"><label>Thème</label><div class="seg" id="pf-theme">${[['auto', 'Système'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, n]) => `<button data-v="${k}" class="${theme === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
          <div class="field"><label>Notifications du navigateur (alertes capteurs)</label><button class="btn" id="pf-notif" style="align-self:flex-start">${icon('bell')}${'Notification' in window ? (Notification.permission === 'granted' ? 'Autorisées' : 'Autoriser') : 'Non prises en charge'}</button></div>
          <div class="field"><label>Données locales (favoris, projet du Studio, alertes, conversation)</label><button class="btn danger" id="pf-reset" style="align-self:flex-start">${icon('trash')}Tout effacer sur cet appareil</button></div></div>
        <div class="card pad"><h2 style="margin-bottom:10px">Raccourcis clavier</h2><div class="statlist">${[['Ctrl K ou /', 'Recherche et commandes'], ['1 … 9', 'Aller à la section n'], ['Échap', 'Fermer le panneau'], ['↑ / ↓ (moniteur série)', 'Historique des envois']].map(([k, d]) => `<div><span><kbd>${k}</kbd></span><span class="muted">${d}</span></div>`).join('')}</div>
          <h3 style="margin:16px 0 8px">Installer comme une application</h3><p class="small muted">Sur téléphone : menu du navigateur › « Ajouter à l'écran d'accueil ». Sur PC (Chrome, Edge) : icône d'installation dans la barre d'adresse.</p></div></div>`;
      $('#pf-theme', el).onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        const v = b.dataset.v;
        store.set('theme', v === 'auto' ? null : v);
        if (v === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v;
        $$('#pf-theme button', el).forEach((x) => x.classList.toggle('on', x === b));
      };
      $('#pf-notif', el).onclick = async (e) => { if ('Notification' in window) { const p = await Notification.requestPermission(); e.currentTarget.lastChild.textContent = p === 'granted' ? 'Autorisées' : 'Refusées'; } };
      $('#pf-reset', el).onclick = async () => {
        if (!(await confirmBox('Effacer les données locales', 'Favoris, projet en cours du Studio, alertes et conversation seront supprimés de ce navigateur.', 'Effacer', true))) return;
        try { Object.keys(localStorage).filter((k) => k.startsWith('lab.')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* stockage indisponible */ }
        toast('Données locales effacées', 'ok');
      };
    },

    about(el) {
      const LAB = window.LAB;
      el.innerHTML = `<div class="grid g-2"><div class="card pad"><div class="row" style="margin-bottom:12px"><div class="brand-mark" style="width:44px;height:44px">${icon('chip')}</div><div><h2>ESP32 LAB ${esc(LAB.VERSION || '')}</h2><div class="small muted">« NEXUS » — laboratoire ESP32 autonome</div></div></div>
        <dl class="dl"><dt>Catalogue</dt><dd>${(LAB.MODULES || []).length} modules, ${(LAB.RECIPES || []).length} projets complets, ${(LAB.CLASSICS || []).length} classiques</dd><dt>Cartes</dt><dd>${Object.values(LAB.BOARDS || {}).map((b) => esc(b.short)).join(', ')}</dd><dt>MASTER</dt><dd>ESP32-S3 N16R8 · ESP-IDF 6.1</dd><dt>Workers</dt><dd>Arduino-ESP32 3.3.x · jusqu'à 10</dd><dt>Interface</dt><dd>hors ligne, sans dépendance, PC & mobile</dd></dl></div>
        <div class="card pad small"><h3 style="margin-bottom:8px">Mode démonstration</h3><p class="muted">Ouvrez l'interface avec <code>?demo</code> pour la parcourir sans matériel (données simulées). Le fichier <code>index.html</code> fonctionne aussi hors de la carte.</p>
          <h3 style="margin:14px 0 8px">Protocole capteurs</h3><p class="muted">UDP port 4213 : <code>LAB|appareil|clé|valeur|unité</code> — publiez depuis n'importe quel microcontrôleur.</p><div class="row" style="margin-top:14px"><a class="btn" href="?demo#dash">${icon('eye')}Voir la démo</a></div></div></div>`;
    }
  };
})();
/* ---- 55_patricia.js ---- */
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
  const prefs = Object.assign({ speak: false, handsfree: false, voice: '', rate: 0.95, style: 'scientifique', direct: true }, store.get('patricia.prefs', {}));
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
    const ctx = { lab: st.master ? { master: st.master, workers: (st.workers || []).map((w) => ({ id: w.id, state: w.state, chip: w.chip, label: w.label, ip: w.ip, job: w.job, rssi: w.rssi, version: w.version })), worker_capacity: st.worker_capacity, jobs: st.jobs } : null, project: P.project || null };
    const spec = store.get('studio.spec', null);   // projet ouvert dans le Studio : « flash », « compile », « crée l'APK » le visent
    if (spec && (spec.modules || []).length) {
      let warnings = [];
      try { warnings = window.LAB.generate(spec).warnings || []; } catch (e) { warnings = [e.message]; }
      const clean = JSON.parse(JSON.stringify(spec)); if (clean.options) delete clean.options.wifi_pass;
      ctx.studio = { spec: clean, warnings: warnings.slice(0, 12) };
    }
    ctx.direct = !!prefs.direct;   // Patricia ne dit pas « confirme » quand l'interface agit d'elle-même
    return ctx;
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
    /* ---- synthèse : la voix la plus naturelle disponible ----
     * Classement des voix françaises : 3 = neuronales (Edge « Natural/Online », Apple « Premium/Enhanced »),
     * 2 = Google (Chrome, Android), 1 = voix locales classiques, 0 = eSpeak (très robotique). Voix féminine préférée
     * (une voix d'homme ne passe devant une voix de femme que si elle est d'une classe nettement plus naturelle).
     * Hauteur 1.0 partout (monter la hauteur rend la voix métallique) ; le style « complice » parle juste un peu plus lentement.
     * Le texte est nettoyé (markdown, émojis, code, liens, unités en mots) puis lu phrase par phrase (< 200 caractères) :
     * intonation plus naturelle et pas de coupure de Chrome après ~15 s. */
    FEMALE: /denise|eloise|vivienne|brigitte|c[eé]leste|coralie|jacqueline|jos[eé]phine|yvette|sylvie|charline|ariane|am[eé]lie|audrey|aur[eé]lie|julie|hortense|marie|virginie|l[eé]a\b|chantal|female|femme|google/i,
    MALE: /henri|r[eé]my|alain|claude|j[eé]r[oô]me|maurice|\byves\b|antoine|\bjean\b|thierry|g[eé]rard|fabrice|thomas|nicolas|\bdaniel\b|\bpaul\b|\bmale\b|homme/i,
    tier(name) { return /espeak|mbrola/i.test(name) ? 0 : /natural|neural|online|premium|enhanced|wavenet/i.test(name) ? 3 : /google/i.test(name) ? 2 : 1; },
    score(v) { const n = v.name || ''; return this.tier(n) * 10 + (this.FEMALE.test(n) ? 3 : this.MALE.test(n) ? -12 : 0) + (/^fr[-_]FR/i.test(v.lang) ? 1 : 0); },
    webVoices() { try { return window.speechSynthesis ? speechSynthesis.getVoices().filter((v) => /^fr/i.test(v.lang)).sort((a, b) => this.score(b) - this.score(a)) : []; } catch (e) { return []; } },
    /* getVoices() est vide au premier appel dans Chrome : on attend « voiceschanged » (1,5 s au plus). */
    voicesReady() {
      if (!window.speechSynthesis) return Promise.resolve([]);
      if (speechSynthesis.getVoices().length) return Promise.resolve(this.webVoices());
      return new Promise((res) => {
        const done = () => { clearTimeout(t); try { speechSynthesis.removeEventListener('voiceschanged', done); } catch (e) { /* ignoré */ } res(this.webVoices()); };
        const t = setTimeout(done, 1500);
        try { speechSynthesis.addEventListener('voiceschanged', done); } catch (e) { /* vieux navigateur : le délai suffit */ }
      });
    },
    /* Voix du téléphone (APK NEXUS récente), déjà classées par Android : [{name, label}]. */
    nativeVoices() { try { return window.NexusNative && window.NexusNative.voices ? JSON.parse(window.NexusNative.voices() || '[]') : []; } catch (e) { return []; } },
    hasNative() { const N = window.NexusNative; return !!(N && (N.speakWith || N.speak)); },
    /* Moteur à utiliser : { kind: 'piper' | 'native' | 'web' | null, voice }. Automatique = meilleure voix naturelle du
     * navigateur (Natural/Online/Google), sinon Piper sur le Pi, sinon la meilleure voix locale. */
    pick(list, noPiper) {
      if (prefs.voice === 'piper' && !noPiper) return { kind: 'piper' };
      if (this.hasNative()) return { kind: 'native' };
      const vs = list || this.webVoices();
      const v = (prefs.voice && vs.find((x) => x.name === prefs.voice)) || vs[0];
      if (v && (v.name === prefs.voice || this.tier(v.name) >= 2)) return { kind: 'web', voice: v };
      if (voiceCaps.tts && !noPiper) return { kind: 'piper' };
      return { kind: window.speechSynthesis ? 'web' : null, voice: v };
    },
    describe() {
      const e = this.pick();
      if (e.kind === 'piper') return 'Piper sur le Pi (siwis, hors ligne)';
      if (e.kind === 'native') return 'voix Android' + (prefs.voice ? ' · ' + prefs.voice : ' (meilleure voix française du téléphone)');
      if (e.kind === 'web') return e.voice ? e.voice.name + (this.tier(e.voice.name) >= 2 ? ' (naturelle)' : ' (voix locale)') : 'voix par défaut du navigateur';
      return 'aucune voix disponible ici';
    },
    /* Texte → phrases dites : sans markdown, émojis, blocs de code ni liens ; symboles et unités en mots. */
    spoken(text) {
      let t = String(text || '')
        .replace(/```[\s\S]*?```/g, ' (le code est affiché à l\'écran). ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/https?:\/\/\S+/g, ' le lien affiché ')
        .replace(/#library\?p=[a-z0-9_]+/gi, ' ')
        .replace(/→|->|⇒|=>/g, ' vers ').replace(/←|<-/g, ' depuis ').replace(/≈|~/g, ' environ ').replace(/±/g, ' plus ou moins ')
        .replace(/≥|>=/g, ' au moins ').replace(/≤|<=/g, ' au plus ').replace(/&/g, ' et ')
        .replace(/°\s?C\b/g, ' degrés').replace(/°/g, ' degrés').replace(/\s?%/g, ' pour cent')
        .replace(/\bW(\d+)\b/g, 'worker $1')
        .replace(/\b(\d)V(\d)\b/g, '$1,$2 volts')
        .replace(/(\d)\s?mA\b/g, '$1 milliampères').replace(/(\d)\s?mV\b/g, '$1 millivolts')
        .replace(/(\d)\s?V\b/g, '$1 volts').replace(/(\d)\s?A\b/g, '$1 ampères')
        .replace(/(\d)\s?kΩ/g, '$1 kilo-ohms').replace(/(\d)\s?Ω/g, '$1 ohms')
        .replace(/(\d)\s?ms\b/g, '$1 millisecondes').replace(/(\d)\s?MHz\b/g, '$1 mégahertz').replace(/(\d)\s?kHz\b/g, '$1 kilohertz')
        .replace(/(\d)\s?Ko\b/g, '$1 kilo-octets').replace(/(\d)\s?Mo\b/g, '$1 mégaoctets').replace(/(\d)\s?Go\b/g, '$1 gigaoctets')
        .replace(/(^|[^\d.])(\d+)\.(\d+)(?![.\d])/g, '$1$2,$3')
        .replace(/[*_#>|`•]+/g, ' ')
        .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, ' ');
      t = t.split(/\n+/).map((l) => l.replace(/^[\s-]+|\s+$/g, '')).filter(Boolean).map((l) => (/[.!?…:;,]$/.test(l) ? l : l + '.')).join(' ');
      return t.replace(/([.!?…])(\s*\.)+/g, '$1').replace(/\s+/g, ' ').trim().slice(0, 1500);
    },
    chunks(text, max) {
      max = max || 190;
      const out = []; let cur = '';
      text.replace(/([.!?…;:])\s+/g, '$1\n').split('\n').forEach((s) => {
        s = s.trim();
        while (s.length > max) {
          let cut = s.lastIndexOf(', ', max); if (cut < max / 3) cut = s.lastIndexOf(' ', max); if (cut < 1) cut = max;
          if (cur) { out.push(cur); cur = ''; }
          out.push(s.slice(0, cut + 1).trim()); s = s.slice(cut + 1).trim();
        }
        if (!s) return;
        if (cur && cur.length + 1 + s.length > max) { out.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s;
      });
      if (cur) out.push(cur);
      return out;
    },
    speaking: 0,
    audio: null, audioEnd: null,
    /* Coupe la parole en cours (navigateur, téléphone ou Pi). */
    hush() {
      this.speaking++;
      try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignoré */ }
      if (this.audio) { this.audio.pause(); this.audio = null; }
      if (this.audioEnd) this.audioEnd();
      try { if (window.NexusNative && window.NexusNative.stopSpeaking) window.NexusNative.stopSpeaking(); } catch (e) { /* ignoré */ }
      if (window.__nexusSpoken) window.__nexusSpoken();
    },
    /* Lit le texte et se résout quand Patricia a fini de parler. */
    async speak(text) {
      text = this.spoken(text);
      if (!text) return;
      const id = ++this.speaking;
      const rate = Math.max(0.5, Math.min(1.6, prefs.rate * (prefs.style === 'complice' ? 0.92 : 1)));
      const list = this.hasNative() || prefs.voice === 'piper' ? null : await this.voicesReady();
      if (id !== this.speaking) return;
      let e = this.pick(list);
      if (e.kind === 'piper') {
        try { return await this.piper(text, rate, id); } catch (err) { if (id !== this.speaking) return; e = this.pick(list, true); }
      }
      if (e.kind === 'native') return this.nativeSay(text, rate);
      if (e.kind === 'web') return this.webSay(this.chunks(text), rate, e.voice, id);
    },
    nativeSay(text, rate) {
      const N = window.NexusNative;
      if (window.__nexusSpoken) window.__nexusSpoken();
      return new Promise((res) => {
        // fin signalée par l'APK (__nexusSpoken) ; délai de secours pour les anciennes APK
        const t = setTimeout(done, Math.min(90000, 75 * text.length / rate) + 800);
        function done() { clearTimeout(t); if (window.__nexusSpoken === done) window.__nexusSpoken = null; res(); }
        window.__nexusSpoken = done;
        const name = prefs.voice && prefs.voice !== 'piper' ? prefs.voice : '';
        if (N.speakAs && name) N.speakAs(text, rate, 1.0, name);
        else if (N.speakWith) N.speakWith(text, rate, 1.0);
        else N.speak(text);
      });
    },
    webSay(parts, rate, voice, id) {
      try { speechSynthesis.cancel(); } catch (e) { /* ignoré */ }
      return new Promise((res) => {
        let i = 0;
        const next = () => {
          if (id !== this.speaking || i >= parts.length) return res();
          const u = new SpeechSynthesisUtterance(parts[i++]);
          u.lang = voice ? voice.lang : 'fr-FR'; if (voice) u.voice = voice;
          u.rate = rate; u.pitch = 1;
          let fired = false;
          const go = () => { if (fired) return; fired = true; clearTimeout(t); next(); };
          const t = setTimeout(go, 4000 + 120 * u.text.length / rate);   // Chrome oublie parfois « onend »
          u.onend = go; u.onerror = go;
          speechSynthesis.speak(u);
        };
        next();
      });
    },
    /* Voix du Pi : Piper découpe en phrases et marque une courte pause entre elles ; « rate » suit le curseur Débit. */
    piper(text, rate, id) {
      return fetch(A.piBase() + '/api/v1/patricia/tts', { method: 'POST', headers: { Authorization: 'Bearer ' + A.piToken(), 'Content-Type': 'application/json' }, body: JSON.stringify({ text, rate }) })
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .then((b) => new Promise((res) => {
          if (id !== this.speaking) return res();
          const url = URL.createObjectURL(b), a = new Audio(url);
          const end = () => { if (this.audioEnd === end) { this.audioEnd = null; this.audio = null; } URL.revokeObjectURL(url); res(); };
          this.audio = a; this.audioEnd = end;
          a.onended = end; a.onerror = end; a.play().catch(end);
        }));
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
      case 'boards': return `<div class="pa-card" data-boards><div class="pa-card-h">${icon('cpu')}<span class="grow">Cartes branchées</span><a class="btn sm ghost" href="#boards">${icon('chevron')}Détails</a></div><div class="pa-boards-body small muted">Inventaire…</div></div>`;
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
  const autoRun = (a) => prefs.direct && a.auto;
  async function runAction(el, a, log) {
    const row = el.closest('.pa-action');
    const status = (t, cls) => { row.innerHTML = `<div class="small ${cls || ''}">${t}</div>`; };
    let res;
    try { res = await piJSON(`/api/v1/patricia/actions/${a.id}/confirm`, {}, 300000); }
    catch (e) { status(esc(e.message), 'bad-text'); return; }
    if (!res.execute_in_ui) { status(`${icon('check')} Fait : ${esc(a.summary)}${res.result && res.result.id ? ' · job ' + esc(res.result.id) : ''}`); if (a.kind === 'build' && res.result && res.result.id) watchBuild(res.result.id, row, log); if (a.kind === 'github_create' && res.result && /^https:\/\/github\.com\//.test(res.result.url || '')) row.insertAdjacentHTML('beforeend', `<div class="small"><a href="${esc(res.result.url)}" target="_blank" rel="noopener">${esc(res.result.repo)}</a> · ${res.result.created ? 'dépôt créé' : 'existait déjà'}</div>`); if (a.kind === 'apply_fix' && res.result) row.insertAdjacentHTML('beforeend', `<div class="small">${(res.result.applied || []).length} correction(s) appliquée(s)${(res.result.changed_files || []).length ? ' dans ' + res.result.changed_files.map(esc).join(', ') : ''} · sauvegarde : <code>${esc(res.result.backup || '')}</code></div>`); if (/^fs_/.test(a.kind) && res.result) row.insertAdjacentHTML('beforeend', `<div class="small muted">${esc(res.result.trash ? 'Corbeille : ' + res.result.trash : res.result.path + (res.result.bytes != null ? ' · ' + res.result.bytes + ' octets' : ''))}</div>`); if (a.kind === 'github_push' && res.result && /^https:\/\/github\.com\//.test(res.result.url || '')) row.insertAdjacentHTML('beforeend', `<div class="small"><a href="${esc(res.result.url)}" target="_blank" rel="noopener">${esc(res.result.repo)}</a> · ${res.result.files} fichier(s) · ${res.result.created ? 'dépôt créé' : 'mis à jour'}</div>`); return; }
    const p = res.params || a.params;
    try {
      if (a.kind === 's3_job') { const r = await A.post('/api/job', { type: p.type, worker: p.worker || 0, priority: 60 }); status(`${icon('check')} Job ${esc(p.type)} n° ${r.id} envoyé au MASTER`); report(a.id, true, r); }
      else if (a.kind === 'open_page') { A.go(p.page, p.q || undefined); }
      else if (a.kind === 'apk') { await apkFlow(p, row, a); }
      else if (a.kind === 'save_project') { const card = log.querySelector('[data-gen]'); status('Enregistrement…'); const c = card && P._cards[card.dataset.gen]; if (c) { const res2 = window.LAB.generate({ board: c.board, title: c.title, modules: c.modules.map((id) => ({ id })) }); const id = await saveToPi(c, res2); status(id ? `${icon('check')} Enregistré : ${esc(id)}` : 'Échec'); report(a.id, !!id, { id }); } }
      else if (a.kind === 'flash') { await flashFlow(p, row, a, log); }
      else if (a.kind === 'flash_studio') { status(`${icon('zap')} Flash de « ${esc(p.title)} » sur le worker ${esc(p.worker)} : suis les étapes dans la fenêtre ouverte.`); A.flashPipeline({ spec: p.spec, title: p.title, worker: p.worker, auto: true }); report(a.id, true, { worker: p.worker }); }
      else if (a.kind === 'build_studio') { await buildStudioFlow(p, row, a, log); }
      else if (a.kind === 'verify') { await verifyFlow(p.worker, p.seconds || 20, row, a, log); }
    } catch (e) { status(esc(e.message)); report(a.id, false, { error: e.message }); }
  }
  /* APK créée par le Pi depuis un projet de la mémoire : lien direct + QR dans la conversation. */
  async function apkFlow(p, row, a) {
    if (!A.AppStudio) throw new Error('Studio APK non chargé');
    row.innerHTML = '<div class="small">Préparation de l\'application…</div>';
    const fromCat = p.catalog && A.projectById ? A.projectById(p.catalog) : null;
    const spec = p.spec || (fromCat && fromCat.spec) || { title: p.title, board: p.board || 'esp32', modules: (p.modules || []).map((id) => ({ id })) };
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
  /* Projet du Studio : enregistré sur le Pi (code généré + fiche), puis compilé ; une erreur part à Patricia. */
  async function buildStudioFlow(p, row, a, log) {
    const res = window.LAB.generate(p.spec);
    const id = A.norm(p.title || 'projet').replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'projet';
    row.innerHTML = '<div class="small">Enregistrement sur le Pi…</div>';
    await A.piSaveProject(id, { [id + '.ino']: res.code, 'project.json': JSON.stringify({ title: p.title, board: p.board, spec: p.spec, outs: res.outs, wiring: res.wiring, created_by: 'Patricia' }, null, 2) });
    const q = await piJSON('/api/v1/build', { project_id: id, board: p.board || res.board, priority: 70 });
    const j = await watchBuild(q.id, row, log);
    report(a.id, !!(j && j.status === 'success'), { project: id, job: q.id });
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
    $$('[data-boards]', m).forEach((box) => { if (A.boardsReport) A.boardsReport().then((rep) => { $('.pa-boards-body', box).className = 'pa-boards-body'; $('.pa-boards-body', box).innerHTML = A.boardsHtml(rep, true); }).catch((e) => { $('.pa-boards-body', box).textContent = e.message; }); });
    (r.actions || []).forEach((a) => {
      const row = m.querySelector(`[data-aid="${a.id}"]`);
      row.querySelector('[data-confirm]').onclick = (e) => runAction(e.target, a, log);
      row.querySelector('[data-cancel]').onclick = () => { piJSON(`/api/v1/patricia/actions/${a.id}/cancel`, {}).catch(() => {}); row.innerHTML = '<div class="small muted">Annulé.</div>'; };
      if (autoRun(a)) setTimeout(() => runAction(row.querySelector('[data-confirm]'), a, log), 50);   // réglage « Agir directement »
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
    try { const si = await A.api('/api/system/info'); if (si && si.usb) context.usb = si.usb; } catch (e) { /* MASTER injoignable */ }
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
        <li>${icon('phone')}Créer l'application Android de ton projet, avec lien et QR.</li>
        <li>${icon('folder')}Créer et ranger tes dossiers et fichiers, et les envoyer sur GitHub.</li>
        <li>${icon('search')}Analyser ton code et corriger les erreurs (copie de sauvegarde gardée).</li>
        <li>${icon('cpu')}Faire le bilan des cartes branchées en Wi-Fi et en USB.</li></ul>
        <p class="hint" style="margin-top:8px">« Flash » et « compile » partent directement ou après validation, selon Patricia → Réglages. L'arrêt d'urgence est immédiat.</p></div>
        <div class="card pad small"><h3 style="margin-bottom:8px">Essaie</h3><div class="chips" id="pa-try">${['Je veux faire une serre connectée avec un ESP32-S3', 'Quelles cartes sont branchées ?', 'Flash', 'Fais-moi une APK pour la serre', 'Analyse mon projet', 'Crée un dossier essais', 'Qui es-tu ?'].map((s) => `<button class="chip" data-say="${esc(s)}">${esc(s)}</button>`).join('')}</div></div></div></div>`;
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
      catch (e) { piOk = false; if (A.S.phone) { renderReply(log, m, { answer: 'Bonjour ! Je suis Patricia, en mode téléphone. Je réponds avec le catalogue embarqué, et si tu écris « note que … », je garde ta note sur le téléphone et je l\'envoie au box dès que tu le rejoins.', cards: [], actions: [], mode: 'téléphone', suggestions: ['Comment brancher un BME280 ?', 'Note que '] }); } else renderReply(log, m, { answer: 'Bonjour ! Je suis Patricia. Le Raspberry Pi n\'est pas joignable : je réponds avec le catalogue du MASTER en attendant. Configure le Pi dans « Compagnon Pi » pour la mémoire, l\'IA et le pilotage.', cards: [], actions: [], mode: 'MASTER seul', suggestions: ['Comment brancher un BME280 ?', 'État du labo'] }); }
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
      <div>Vosk (Pi) : <b>${voiceCaps.stt ? 'installé' : 'absent'}</b> · Piper (Pi) : <b id="ps-piper">${voiceCaps.tts ? 'installé' : 'absent'}</b></div>
      <label class="switch"><input type="checkbox" id="ps-speak" ${prefs.speak ? 'checked' : ''}><span class="track"></span>Voix activée (sinon Patricia écrit seulement)</label>
      <label class="field">Débit de la voix : <b id="ps-rate-v">${Math.round(prefs.rate * 100)} %</b><input type="range" id="ps-rate" min="0.7" max="1.2" step="0.02" value="${prefs.rate}"></label>
      <label class="field">Voix<select class="input" id="ps-voice"><option value="">Automatique (la plus naturelle)</option></select></label>
      <div class="row"><button class="btn sm" id="ps-test">${icon('volume')}Écouter</button><span class="muted" id="ps-voice-now"></span></div>
      <div class="hint">Les voix les plus humaines : « Natural » d'Edge sur PC, la voix Google sur Android ou Chrome, Piper (siwis) hors ligne sur le Pi.</div></div></div>
      <div class="card"><div class="card-h"><h2>Personnalité</h2></div><div class="card-b stack small">
      <div class="seg" id="ps-style"><button data-st="scientifique" class="${prefs.style !== 'complice' ? 'on' : ''}">Scientifique</button><button data-st="complice" class="${prefs.style === 'complice' ? 'on' : ''}">Complice</button></div>
      <div class="hint"><b>Scientifique</b> (par défaut) : pédagogue et neutre, elle explique pas à pas et te corrige. <b>Complice</b> : même rigueur, mais taquine et chaleureuse ; elle te pose de petites questions et redevient sérieuse dès qu'il s'agit de sécurité.</div></div></div>
      <div class="card"><div class="card-h"><h2 class="grow">Quand je dis « flash » ou « compile »</h2></div><div class="card-b stack small">
      <div class="seg" id="ps-direct"><button data-d="1" class="${prefs.direct ? 'on' : ''}">Patricia agit directement</button><button data-d="0" class="${prefs.direct ? '' : 'on'}">Patricia me demande de valider</button></div>
      <p class="hint">Agir directement : flash, compilation, APK, check-up, nouveaux dossiers et fichiers partent tout de suite. Restent toujours à valider : envoi sur GitHub, suppression ou remplacement d'un fichier, correction de ton code, déplacement des voitures.</p></div></div>
      <div class="card"><div class="card-h"><h2 class="grow">GitHub</h2><span class="badge" id="ps-gh-state">…</span></div><div class="card-b stack small">
      <div class="muted">Dis « envoie la serre sur GitHub » : Patricia crée le dépôt s'il n'existe pas et y dépose le projet, après ta confirmation. Le Pi a besoin d'Internet (Wi-Fi amont du S3).</div>
      <label class="field">Jeton GitHub (fine-grained : Administration + Contents en écriture)<input class="input" id="ps-gh-token" type="password" autocomplete="off" placeholder="github_pat_…"></label>
      <label class="field">Propriétaire (vide = ton compte ; ou une organisation)<input class="input" id="ps-gh-owner" placeholder=""></label>
      <label class="switch"><input type="checkbox" id="ps-gh-private" checked><span class="track"></span>Nouveaux dépôts privés</label>
      <div class="row"><button class="btn primary sm" id="ps-gh-save">${icon('save')}Enregistrer</button><button class="btn sm danger" id="ps-gh-del">${icon('trash')}Oublier le jeton</button></div>
      <div class="hint">Le jeton reste sur le Pi (fichier lisible par le seul service NEXUS) et n'est jamais renvoyé à l'interface.</div></div></div></div>`;
    const presets = { ollama: { ep: 'http://127.0.0.1:11434/v1/chat/completions', model: 'qwen2.5:1.5b' }, online: { ep: 'https://', model: '' }, local: { ep: '', model: '' } };
    try { const c = await pi('/api/v1/assistant/config'); $('#ps-ep', el).value = c.endpoint || ''; $('#ps-model', el).value = c.model || ''; $('#ps-state', el).textContent = c.endpoint ? 'IA configurée' + (c.key_set ? ' · clé enregistrée' : '') : 'Mode hors ligne'; }
    catch (e) { $('#ps-state', el).textContent = 'Pi injoignable : ' + e.message; }
    $('#ps-preset', el).onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b) return; const p = presets[b.dataset.p]; $('#ps-ep', el).value = p.ep; $('#ps-model', el).value = p.model; $$('#ps-preset button', el).forEach((x) => x.classList.toggle('on', x === b)); };
    $('#ps-save', el).onclick = async () => { try { const r = await piJSON('/api/v1/assistant/config', { endpoint: $('#ps-ep', el).value.trim(), model: $('#ps-model', el).value.trim(), key: $('#ps-key', el).value }); $('#ps-key', el).value = ''; $('#ps-state', el).textContent = r.endpoint ? 'IA enregistrée' : 'Mode hors ligne'; toast('Réglages de Patricia enregistrés', 'ok'); } catch (e) { toast(e.message, 'bad'); } };
    /* Liste des voix : celles du téléphone (APK) ou du navigateur, la plus naturelle d'abord, plus Piper si le Pi l'a. */
    const voiceNow = () => { const n = $('#ps-voice-now', el); if (n) n.textContent = 'Voix utilisée : ' + Voice.describe(); };
    const fillVoices = async () => {
      try { voiceCaps = Object.assign({}, voiceCaps, await pi('/api/v1/patricia/voice')); } catch (e) { /* Pi absent : pas de Piper */ }
      const sel = $('#ps-voice', el); if (!sel) return;
      const nat = Voice.nativeVoices();
      const list = nat.length ? nat.map((v) => ({ name: v.name, label: v.label || v.name }))
        : (await Voice.voicesReady()).map((v) => ({ name: v.name, label: v.name + ' (' + v.lang + (Voice.tier(v.name) >= 2 ? ', naturelle' : Voice.tier(v.name) ? '' : ', robotique') + ')' }));
      const opts = [{ name: '', label: 'Automatique (la plus naturelle)' }].concat(list, voiceCaps.tts || prefs.voice === 'piper' ? [{ name: 'piper', label: 'Voix du Pi (Piper, hors ligne)' }] : []);
      if (prefs.voice && !opts.some((o) => o.name === prefs.voice)) opts.push({ name: prefs.voice, label: prefs.voice + ' (absente ici → automatique)' });
      sel.innerHTML = opts.map((o) => `<option value="${esc(o.name)}" ${o.name === prefs.voice ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
      const pb = $('#ps-piper', el); if (pb) pb.textContent = voiceCaps.tts ? 'installé' : 'absent';
      voiceNow();
    };
    fillVoices();
    $('#ps-voice', el).onchange = (e) => { prefs.voice = e.target.value; savePrefs(); voiceNow(); };
    $('#ps-speak', el).onchange = (e) => { prefs.speak = e.target.checked; savePrefs(); if (!prefs.speak) Voice.hush(); };
    $('#ps-rate', el).oninput = (e) => { prefs.rate = Number(e.target.value); $('#ps-rate-v', el).textContent = Math.round(prefs.rate * 100) + ' %'; savePrefs(); };
    $('#ps-direct', el).onclick = (e) => { const b = e.target.closest('[data-d]'); if (!b) return; prefs.direct = b.dataset.d === '1'; savePrefs(); $$('#ps-direct button', el).forEach((x) => x.classList.toggle('on', x === b)); toast(prefs.direct ? 'Patricia agit directement' : 'Patricia demande de valider', 'ok'); };
    $('#ps-style', el).onclick = async (e) => {
      const b = e.target.closest('[data-st]'); if (!b) return;
      prefs.style = b.dataset.st; savePrefs();
      $$('#ps-style button', el).forEach((x) => x.classList.toggle('on', x === b));
      try { await piJSON('/api/v1/patricia/facts', { key: 'style de patricia', value: prefs.style }); toast(prefs.style === 'complice' ? 'Mode complice activé 😉' : 'Mode scientifique activé', 'ok'); }
      catch (err) { toast('Pi injoignable : le style sera appliqué à la prochaine connexion. ' + err.message, 'warn'); }
    };
    const ghShow = (g) => { const b = $('#ps-gh-state', el); b.textContent = g.configured ? 'connecté · ' + (g.owner || g.login) : 'non configuré'; b.className = 'badge ' + (g.configured ? 'ok' : ''); $('#ps-gh-owner', el).value = g.owner || ''; $('#ps-gh-private', el).checked = g.private !== false; };
    pi('/api/v1/patricia/github').then(ghShow).catch(() => { $('#ps-gh-state', el).textContent = 'Pi injoignable'; });
    $('#ps-gh-save', el).onclick = async () => { try { const tok = $('#ps-gh-token', el).value.trim(); ghShow(await piJSON('/api/v1/patricia/github', Object.assign({ owner: $('#ps-gh-owner', el).value.trim(), private: $('#ps-gh-private', el).checked }, tok ? { token: tok } : {}), 30000)); $('#ps-gh-token', el).value = ''; toast('GitHub enregistré', 'ok'); } catch (e) { toast(e.message, 'bad'); } };
    $('#ps-gh-del', el).onclick = async () => { try { ghShow(await piJSON('/api/v1/patricia/github', { delete: true })); toast('Jeton GitHub oublié', 'ok'); } catch (e) { toast(e.message, 'bad'); } };
    $('#ps-test', el).onclick = () => { Voice.hush(); Voice.speak(prefs.style === 'complice' ? 'Coucou, c\'est Patricia. Alors, tu me montres ce que tu as branché aujourd\'hui ?' : 'Bonjour, je suis Patricia, ton assistante de laboratoire. On construit quoi aujourd\'hui ?'); };
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
/* ---- 56_vehicles.js ---- */
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
/* ---- 57_appruntime.js ---- */
/* NEXUS App Runtime — moteur des applications du Studio APK.
 * Un seul fichier, sans dépendance, utilisé à l'identique par :
 *   - l'aperçu et le mode test du Studio APK (interface du MASTER),
 *   - l'APK Android (assets/player/runtime.js, copie synchronisée par scripts/sync_app_runtime.py),
 *   - l'appli web servie par le Pi (/apps/<id>/).
 * Ce que tu vois dans l'aperçu est donc exactement ce que fera l'application. */
(function () {
  'use strict';
  const R = (window.NexusAppRuntime = window.NexusAppRuntime || {});
  R.VERSION = '1.0.0';
  R.FORMAT = 'nexus-app/1';

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const num = (v, d) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  /* ------------------------------------------------------------------ catalogue des composants */
  // [clé, libellé, type d'éditeur, valeur par défaut]. Types : text, textarea, number, color, var, select:a=A|b=B, bool, actions
  const WIDTH = ['width', 'Largeur', 'select:full=Pleine|half=Moitié', 'full'];
  R.COMPONENTS = {
    title: { label: 'Titre', icon: 'T', group: 'Affichage', props: [['text', 'Texte', 'text', 'Mon application'], ['sub', 'Sous-titre', 'text', '']] },
    text: { label: 'Texte', icon: '¶', group: 'Affichage', props: [['text', 'Texte (mets {variable} pour afficher une valeur)', 'textarea', 'Bonjour !'], ['size', 'Taille', 'select:s=Petit|m=Moyen|l=Grand', 'm'], WIDTH] },
    value: { label: 'Valeur', icon: '42', group: 'Capteurs', props: [['label', 'Libellé', 'text', 'Température'], ['var', 'Variable', 'var', ''], ['unit', 'Unité', 'text', ''], ['decimals', 'Décimales', 'number', 1], ['warn', 'Orange au-dessus de', 'number', ''], ['alarm', 'Rouge au-dessus de', 'number', ''], ['width', 'Largeur', 'select:full=Pleine|half=Moitié', 'half']] },
    gauge: { label: 'Jauge', icon: '◔', group: 'Capteurs', props: [['label', 'Libellé', 'text', 'Humidité'], ['var', 'Variable', 'var', ''], ['min', 'Minimum', 'number', 0], ['max', 'Maximum', 'number', 100], ['unit', 'Unité', 'text', '%'], ['width', 'Largeur', 'select:full=Pleine|half=Moitié', 'half']] },
    chart: { label: 'Courbe', icon: '〽', group: 'Capteurs', props: [['label', 'Libellé', 'text', 'Évolution'], ['var', 'Variable', 'var', ''], ['points', 'Points affichés', 'number', 60], WIDTH] },
    led: { label: 'Voyant', icon: '●', group: 'Capteurs', props: [['label', 'Libellé', 'text', 'Alerte'], ['var', 'Variable', 'var', ''], ['op', 'S\'allume si', 'select:gt=est supérieure à|lt=est inférieure à|eq=est égale à|on=est vraie (1)', 'gt'], ['value', 'Valeur', 'text', '0'], ['color', 'Couleur', 'color', '#ef4444'], ['width', 'Largeur', 'select:full=Pleine|half=Moitié', 'half']] },
    button: { label: 'Bouton', icon: '▭', group: 'Commandes', props: [['text', 'Texte', 'text', 'Appuie'], ['color', 'Couleur', 'color', ''], ['style', 'Style', 'select:fill=Plein|outline=Contour', 'fill'], WIDTH, ['do', 'Quand on appuie', 'actions', []]] },
    switch: { label: 'Interrupteur', icon: '⏻', group: 'Commandes', props: [['label', 'Libellé', 'text', 'Lampe'], ['var', 'Variable (1 / 0)', 'var', ''], WIDTH, ['do', 'Quand on allume', 'actions', []], ['off', 'Quand on éteint', 'actions', []]] },
    slider: { label: 'Curseur', icon: '⇔', group: 'Commandes', props: [['label', 'Libellé', 'text', 'Vitesse'], ['var', 'Variable', 'var', ''], ['min', 'Minimum', 'number', 0], ['max', 'Maximum', 'number', 100], ['step', 'Pas', 'number', 1], WIDTH, ['do', 'Quand on relâche', 'actions', []]] },
    input: { label: 'Saisie', icon: '⌨', group: 'Commandes', props: [['label', 'Libellé', 'text', 'Message'], ['var', 'Variable', 'var', ''], ['placeholder', 'Indication', 'text', ''], ['kind', 'Type', 'select:text=Texte|number=Nombre', 'text'], WIDTH, ['do', 'Quand on valide', 'actions', []]] },
    joystick: { label: 'Joystick', icon: '✥', group: 'Commandes', props: [['var_x', 'Variable X (-100…100)', 'var', ''], ['var_y', 'Variable Y (-100…100)', 'var', ''], ['do', 'Quand il bouge (5 fois/s)', 'actions', []]] },
    image: { label: 'Image', icon: '🖼', group: 'Affichage', props: [['emoji', 'Emoji ou symbole', 'text', '🌱'], ['size', 'Taille (px)', 'number', 64], ['caption', 'Légende', 'text', ''], WIDTH] },
    link: { label: 'Lien', icon: '↗', group: 'Affichage', props: [['text', 'Texte', 'text', 'Ouvrir la page de l\'appareil'], ['url', 'Adresse', 'text', 'http://192.168.4.20/'], WIDTH] },
    spacer: { label: 'Espace', icon: '↕', group: 'Affichage', props: [['size', 'Hauteur (px)', 'number', 16]] }
  };
  R.ACTIONS = {
    set: { label: 'Mettre une variable à', fields: [['var', 'Variable', 'var'], ['value', 'Valeur ou calcul ({x} + 1)', 'text']] },
    toggle: { label: 'Inverser une variable (0 ↔ 1)', fields: [['var', 'Variable', 'var']] },
    http: { label: 'Envoyer une requête à un appareil', fields: [['method', 'Méthode', 'select:GET=GET|POST=POST'], ['url', 'Adresse ({variables} permises)', 'text'], ['body', 'Corps (POST)', 'text']] },
    job: { label: 'Lancer un job du MASTER', fields: [['type', 'Job', 'select:PING=Ping|SYSTEM_TEST=Check-up|I2C_SCAN=Scan I2C|WIFI_SCAN=Scan Wi-Fi|IDENTIFY=Faire clignoter|BENCHMARK=Benchmark|ADC_READ=Voltmètre|GPIO_TEST=Test des broches|ONEWIRE_SCAN=Scan 1-Wire|LOGIC_SAMPLE=Analyseur logique|PWM_GEN=Générateur PWM|SERVO_SWEEP=Balayage servo|TONE_TEST=Test buzzer'], ['worker', 'Worker (0 = auto)', 'number']] },
    goto: { label: 'Aller à l\'écran', fields: [['screen', 'Écran', 'screen']] },
    speak: { label: 'Dire à voix haute', fields: [['text', 'Texte ({variables} permises)', 'text']] },
    listen: { label: 'Écouter la voix dans une variable', fields: [['var', 'Variable', 'var']] },
    notify: { label: 'Afficher un message', fields: [['text', 'Message', 'text']] },
    vibrate: { label: 'Vibrer', fields: [['ms', 'Durée (ms)', 'number']] }
  };
  R.WHEN = {
    start: { label: 'Au démarrage' },
    timer: { label: 'Toutes les N secondes', fields: [['every', 'Secondes', 'number']] },
    above: { label: 'Quand une variable dépasse', fields: [['var', 'Variable', 'var'], ['value', 'Seuil', 'text']] },
    below: { label: 'Quand une variable passe sous', fields: [['var', 'Variable', 'var'], ['value', 'Seuil', 'text']] },
    equals: { label: 'Quand une variable devient égale à', fields: [['var', 'Variable', 'var'], ['value', 'Valeur', 'text']] },
    change: { label: 'Quand une variable change', fields: [['var', 'Variable', 'var']] },
    screen: { label: 'À l\'ouverture d\'un écran', fields: [['screen', 'Écran', 'screen']] }
  };

  R.blank = function (name) {
    return {
      format: R.FORMAT, id: '', name: name || 'Mon application', version: 1, icon: '📱', color: '#2f7cf6', theme: 'auto',
      s3: 'http://192.168.4.1', description: '', vars: [],
      screens: [{ id: 'accueil', title: 'Accueil', items: [{ id: 'c1', type: 'title', text: name || 'Mon application', sub: 'Créée avec NEXUS LAB' }] }],
      rules: []
    };
  };
  R.newItem = function (type, design) {
    const meta = R.COMPONENTS[type];
    const used = new Set();
    (design.screens || []).forEach((s) => (s.items || []).forEach((i) => used.add(i.id)));
    let n = 1;
    while (used.has('c' + n)) n++;
    const it = { id: 'c' + n, type };
    meta.props.forEach(([k, , kind, def]) => { it[k] = kind === 'actions' ? [] : def; });
    return it;
  };

  /* ------------------------------------------------------------------ calculs sûrs ({x} * 1.8 + 32) */
  function calc(src) {
    const s = String(src).replace(/\s+/g, '');
    let i = 0;
    const peek = () => s[i];
    function atom() {
      if (peek() === '(') { i++; const v = add(); if (s[i++] !== ')') throw 0; return v; }
      if (peek() === '-') { i++; return -atom(); }
      const m = /^\d+(?:\.\d+)?/.exec(s.slice(i));
      if (!m) throw 0;
      i += m[0].length;
      return parseFloat(m[0]);
    }
    function mul() { let v = atom(); while (peek() === '*' || peek() === '/' || peek() === '%') { const o = s[i++], r = atom(); v = o === '*' ? v * r : o === '/' ? v / r : v % r; } return v; }
    function add() { let v = mul(); while (peek() === '+' || peek() === '-') { const o = s[i++], r = mul(); v = o === '+' ? v + r : v - r; } return v; }
    const v = add();
    if (i !== s.length) throw 0;
    return v;
  }
  R.calc = calc;

  /* ------------------------------------------------------------------ réseau */
  function nativeNet() {
    const pending = {};
    let seq = 0;
    window.__nexusHttp = (id, status, text) => { const p = pending[id]; if (!p) return; delete pending[id]; status ? p.ok({ status, text }) : p.ko(new Error(text || 'réseau injoignable')); };
    return (method, url, body) => new Promise((ok, ko) => {
      const id = 'h' + (++seq);
      pending[id] = { ok, ko };
      setTimeout(() => { if (pending[id]) { delete pending[id]; ko(new Error('délai dépassé')); } }, 9000);
      window.NexusNative.http(id, method, url, body || '');
    });
  }
  function fetchNet(proxy) {
    return async (method, url, body) => {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
      try {
        const sameOrigin = !/^https?:/i.test(url) || url.indexOf(location.origin + '/') === 0;
        let r;
        if (proxy && !sameOrigin) {
          r = await fetch(proxy, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, url, body: body || '' }), signal: ctl.signal });
        } else {
          const opt = { method, signal: ctl.signal };
          if (body && method !== 'GET') { opt.body = body; opt.headers = { 'Content-Type': /^[[{]/.test(body.trim()) ? 'application/json' : 'application/x-www-form-urlencoded' }; }
          r = await fetch(url, opt);
        }
        return { status: r.status, text: await r.text() };
      } catch (e) {
        throw new Error(e.name === 'AbortError' ? 'délai dépassé' : 'injoignable (ou bloqué par le navigateur : teste dans l\'APK)');
      } finally { clearTimeout(t); }
    };
  }
  R.net = function (opts) {
    if (opts && typeof opts.net === 'function') return opts.net;
    if (window.NexusNative && window.NexusNative.player && window.NexusNative.player()) return nativeNet();
    return fetchNet(opts && opts.proxy);
  };

  /* ------------------------------------------------------------------ styles (injectés une seule fois) */
  const CSS = `
.nxa{--a:#2f7cf6;--bg:#f4f6fb;--card:#fff;--fg:#141b2b;--mut:#6a7487;--line:#e2e7f0;--ok:#16a34a;--warn:#f59e0b;--bad:#ef4444;
 font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--fg);background:var(--bg);display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;position:relative}
.nxa[data-theme=dark]{--bg:#0f1522;--card:#18212f;--fg:#e8edf6;--mut:#94a0b6;--line:#263246}
@media (prefers-color-scheme:dark){.nxa[data-theme=auto]{--bg:#0f1522;--card:#18212f;--fg:#e8edf6;--mut:#94a0b6;--line:#263246}}
.nxa *{box-sizing:border-box}
.nxa-top{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--a);color:#fff;flex:none}
.nxa-top b{font-size:17px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nxa-top .nxa-ic{font-size:22px;line-height:1}
.nxa-top button{background:rgba(255,255,255,.18);border:0;color:#fff;border-radius:10px;min-width:34px;height:34px;font-size:17px;cursor:pointer}
.nxa-dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.45);flex:none}
.nxa-dot.on{background:#6ff0a6;box-shadow:0 0 0 3px rgba(111,240,166,.25)}
.nxa-body{flex:1;overflow:auto;padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;align-content:start}
.nxa-item{grid-column:span 2;min-width:0}
.nxa-item.half{grid-column:span 1}
.nxa-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px}
.nxa-lbl{font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
.nxa-big{font-size:30px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}
.nxa-big small{font-size:14px;font-weight:500;color:var(--mut);margin-left:3px}
.nxa-big.warn{color:var(--warn)}.nxa-big.bad{color:var(--bad)}
.nxa-h1{font-size:24px;font-weight:750;margin:4px 2px 0}.nxa-h1+div{color:var(--mut);margin:2px 2px 4px}
.nxa-t{white-space:pre-wrap;margin:2px}.nxa-t.s{font-size:13px;color:var(--mut)}.nxa-t.l{font-size:19px;font-weight:600}
.nxa-btn{width:100%;min-height:50px;border-radius:14px;border:2px solid var(--bc,var(--a));background:var(--bc,var(--a));color:#fff;font:600 16px system-ui,sans-serif;cursor:pointer;touch-action:manipulation;transition:transform .08s}
.nxa-btn.outline{background:transparent;color:var(--bc,var(--a))}
.nxa-btn:active{transform:scale(.97)}
.nxa-row{display:flex;align-items:center;gap:10px}
.nxa-sw{margin-left:auto;width:54px;height:32px;border-radius:20px;background:var(--line);position:relative;border:0;cursor:pointer;flex:none;transition:background .15s}
.nxa-sw::after{content:"";position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .15s}
.nxa-sw.on{background:var(--a)}.nxa-sw.on::after{left:25px}
.nxa input[type=range]{width:100%;accent-color:var(--a)}
.nxa-in{display:flex;gap:6px}.nxa-in input{flex:1;min-width:0;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:10px;padding:10px;font:inherit}
.nxa-in button{border:0;background:var(--a);color:#fff;border-radius:10px;padding:0 14px;font:inherit;cursor:pointer}
.nxa-led{width:22px;height:22px;border-radius:50%;background:var(--line);margin-left:auto;flex:none;transition:all .2s}
.nxa-img{text-align:center}.nxa-img div{line-height:1.1}
.nxa-joy{width:180px;height:180px;margin:6px auto;border-radius:50%;background:radial-gradient(circle,var(--card) 0,var(--bg) 100%);border:2px solid var(--line);position:relative;touch-action:none}
.nxa-joy i{position:absolute;width:64px;height:64px;border-radius:50%;background:var(--a);left:58px;top:58px;box-shadow:0 4px 12px rgba(0,0,0,.25)}
.nxa-tabs{display:flex;background:var(--card);border-top:1px solid var(--line);flex:none}
.nxa-tabs button{flex:1;border:0;background:none;padding:10px 4px 12px;color:var(--mut);font:600 12px system-ui,sans-serif;cursor:pointer}
.nxa-tabs button.on{color:var(--a)}
.nxa-toast{position:absolute;left:50%;bottom:70px;transform:translateX(-50%);background:rgba(20,27,43,.92);color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;max-width:86%;text-align:center;pointer-events:none;animation:nxaf 2.6s forwards}
@keyframes nxaf{0%{opacity:0;transform:translate(-50%,8px)}10%,80%{opacity:1;transform:translate(-50%,0)}100%{opacity:0}}
.nxa-empty{grid-column:span 2;text-align:center;color:var(--mut);padding:40px 10px;border:2px dashed var(--line);border-radius:16px}
.nxa-sheet{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end}
.nxa-sheet>div{background:var(--card);width:100%;border-radius:18px 18px 0 0;padding:18px;display:grid;gap:10px}
.nxa-sheet input{border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:10px;padding:10px;font:inherit}
.nxa.design .nxa-item{cursor:pointer;position:relative;outline:2px dashed transparent;outline-offset:3px;border-radius:16px}
.nxa.design .nxa-item:hover{outline-color:rgba(127,140,160,.5)}
.nxa.design .nxa-item.sel{outline:2px solid var(--a)}
.nxa.design .nxa-item.drop{box-shadow:0 -4px 0 var(--a)}
.nxa.design .nxa-item *{pointer-events:none}
`;
  function injectCss() {
    if (document.getElementById('nxa-css')) return;
    const st = document.createElement('style');
    st.id = 'nxa-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ application */
  R.mount = function (root, design, opts) {
    opts = opts || {};
    injectCss();
    const design_ = JSON.parse(JSON.stringify(design));
    const D = design_, mode = opts.mode || 'run', live = mode === 'run';
    const net = R.net(opts);
    const vars = {}, hist = {}, meta = {}, timers = [], edges = {};
    const varDef = {};
    let screen = opts.screen && D.screens.some((s) => s.id === opts.screen) ? opts.screen : (D.screens[0] || {}).id;
    const back = [];
    let updaters = [], destroyed = false, online = false;
    const log = (msg, kind) => { if (opts.log) opts.log(msg, kind || 'info'); };
    let s3 = (opts.s3 != null ? opts.s3 : D.s3 || '').replace(/\/+$/, '');

    (D.vars || []).forEach((v) => {
      varDef[v.name] = v;
      vars[v.name] = v.type === 'number' ? num(v.default, 0) : v.type === 'bool' ? (v.default === true || v.default === 1 || v.default === '1' ? 1 : 0) : String(v.default == null ? '' : v.default);
      hist[v.name] = [];
    });
    if (opts.sample) Object.keys(opts.sample).forEach((k) => {
      if (!(k in vars)) return;
      vars[k] = opts.sample[k];
      // aperçu : une petite courbe plausible autour de la valeur d'exemple
      if (typeof vars[k] === 'number') for (let i = 0; i < 40; i++) hist[k].push(vars[k] * (1 + 0.04 * Math.sin(i / 4) + 0.015 * Math.sin(i * 1.7)));
    });

    function fmt(name, decimals) {
      const v = name in vars ? vars[name] : meta[name];
      if (v == null || v === '') return '—';
      if (typeof v === 'number') return decimals != null && decimals !== '' ? v.toFixed(Math.max(0, Math.min(6, num(decimals, 1)))) : String(Math.round(v * 1000) / 1000);
      return String(v);
    }
    const tpl = (s) => String(s == null ? '' : s).replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, k) => (k in vars || k in meta ? fmt(k) : m));
    function evalValue(s, name) {
      const t = tpl(s).trim();
      const def = varDef[name] || {};
      if (def.type !== 'text' && /^[\d\s.+\-*/%()]+$/.test(t)) { try { return calc(t); } catch (e) { /* texte */ } }
      if (def.type === 'bool') return /^(1|true|vrai|on|oui)$/i.test(t) ? 1 : 0;
      return def.type === 'number' && isFinite(parseFloat(t)) ? parseFloat(t) : t;
    }

    function setVar(name, value, quiet) {
      if (!(name in vars)) return;
      const def = varDef[name] || {};
      if (def.type === 'number' && typeof value !== 'number') { const n = parseFloat(value); value = isFinite(n) ? n : vars[name]; }
      const old = vars[name];
      vars[name] = value;
      if (typeof value === 'number') { const hh = hist[name]; hh.push(value); if (hh.length > 300) hh.shift(); }
      if (!quiet) refresh();
      if (old !== value && live) fireVar(name, old, value);
    }
    function refresh() { updaters.forEach((u) => { try { u(); } catch (e) { /* composant */ } }); }

    /* --- blocs « quand » */
    function fireVar(name, old, value) {
      (D.rules || []).forEach((r, i) => {
        const w = r.when;
        if (w.var !== name) return;
        let hit = false;
        if (w.type === 'change') hit = true;
        else {
          const th = evalValue(w.value, name);
          const cond = w.type === 'above' ? value > th : w.type === 'below' ? value < th : String(value) === String(th);
          hit = cond && !edges[i];
          edges[i] = cond;
        }
        if (hit) run(r.do, 'bloc « quand »');
      });
    }

    /* --- actions */
    async function run(list, where) {
      for (const a of list || []) {
        if (destroyed) return;
        try { await act(a); } catch (e) { log((where ? where + ' : ' : '') + (R.ACTIONS[a.a] || {}).label + ' — ' + e.message, 'bad'); }
      }
    }
    function toast(text) {
      if (window.NexusNative && window.NexusNative.toast && live && opts.native !== false) { window.NexusNative.toast(text); return; }
      const t = h(`<div class="nxa-toast">${esc(text)}</div>`);
      app.appendChild(t);
      setTimeout(() => t.remove(), 2700);
    }
    async function act(a) {
      if (!live) return;
      switch (a.a) {
        case 'set': setVar(a.var, evalValue(a.value, a.var)); break;
        case 'toggle': setVar(a.var, vars[a.var] && vars[a.var] !== '0' ? 0 : 1); break;
        case 'goto': go(a.screen, true); break;
        case 'notify': toast(tpl(a.text)); break;
        case 'vibrate':
          if (window.NexusNative && window.NexusNative.vibrate) window.NexusNative.vibrate(num(a.ms, 200));
          else if (navigator.vibrate) navigator.vibrate(num(a.ms, 200));
          break;
        case 'speak': {
          const text = tpl(a.text);
          if (window.NexusNative && window.NexusNative.speak) window.NexusNative.speak(text);
          else if (window.speechSynthesis) { const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; speechSynthesis.cancel(); speechSynthesis.speak(u); }
          break;
        }
        case 'listen': setVar(a.var, await listen()); break;
        case 'http': {
          const url = tpl(a.url), body = a.body ? tpl(a.body) : '';
          const r = await net(a.method || 'GET', url, body);
          log(`${a.method || 'GET'} ${url} → ${r.status}`, r.status < 400 ? 'ok' : 'bad');
          if (r.status >= 400) throw new Error('réponse ' + r.status);
          break;
        }
        case 'job': {
          const body = `type=${encodeURIComponent(a.type || 'PING')}&priority=50&worker=${num(a.worker, 0)}`;
          const r = await net('POST', s3 + '/api/job', body);
          if (r.status >= 400) throw new Error('le MASTER a refusé (' + r.status + ')');
          toast('Job ' + (a.type || 'PING') + ' envoyé');
          break;
        }
      }
    }
    function listen() {
      return new Promise((ok, ko) => {
        if (window.NexusNative && window.NexusNative.listen) {
          window.__nexusVoice = (good, text) => (good ? ok(text) : ko(new Error(text)));
          window.NexusNative.listen('fr-FR');
          return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { ko(new Error('reconnaissance vocale absente ici')); return; }
        const rec = new SR();
        rec.lang = 'fr-FR';
        rec.onresult = (e) => ok(e.results[0][0].transcript);
        rec.onerror = (e) => ko(new Error(e.error || 'micro'));
        rec.start();
      });
    }

    /* --- sources de données */
    async function pollFeeds() {
      const feedVars = (D.vars || []).filter((v) => v.source === 'feed');
      if (!feedVars.length || destroyed) return;
      try {
        const r = await net('GET', s3 + '/api/feeds');
        const feeds = JSON.parse(r.text);
        setOnline(true);
        feedVars.forEach((v) => {
          const [a, b] = v.feed.indexOf('/') > 0 ? v.feed.split('/') : [null, v.feed];
          const f = (Array.isArray(feeds) ? feeds : []).find((x) => x.key === b && (!a || x.source === a));
          if (f && f.age_ms < 120000) { meta[v.name + '_ip'] = f.ip; setVar(v.name, num(f.value, vars[v.name]), true); }
        });
        refresh();
      } catch (e) { setOnline(false); }
    }
    async function pollHttp(v) {
      try {
        const r = await net('GET', tpl(v.url));
        let val = r.text;
        try {
          let o = JSON.parse(r.text);
          if (v.path) v.path.split('.').forEach((k) => { o = o == null ? o : Array.isArray(o) && !/^\d+$/.test(k) ? o.find((x) => x && (x.label === k || x.key === k || x.name === k)) : o[k]; });
          val = o && typeof o === 'object' && 'value' in o ? o.value : o;
        } catch (e) { /* texte brut */ }
        setVar(v.name, typeof val === 'object' ? JSON.stringify(val) : val);
      } catch (e) { log(`${v.name} : ${e.message}`, 'bad'); }
    }
    function setOnline(on) { online = on; const d = app.querySelector('.nxa-dot'); if (d) d.classList.toggle('on', on); }

    /* --- rendu */
    const app = h(`<div class="nxa ${mode === 'design' ? 'design' : ''}" data-theme="${esc(D.theme || 'auto')}"></div>`);
    app.style.setProperty('--a', /^#[0-9a-f]{6}$/i.test(D.color || '') ? D.color : '#2f7cf6');
    root.innerHTML = '';
    root.appendChild(app);

    function go(id, push) {
      if (!D.screens.some((s) => s.id === id)) return;
      if (push && id !== screen) back.push(screen);
      screen = id;
      render();
      if (live) (D.rules || []).forEach((r) => { if (r.when.type === 'screen' && r.when.screen === id) run(r.do, 'ouverture d\'écran'); });
      if (opts.onScreen) opts.onScreen(id);
    }

    function render() {
      updaters = [];
      const scr = D.screens.find((s) => s.id === screen) || D.screens[0];
      if (!scr) { app.innerHTML = '<div class="nxa-body"><div class="nxa-empty">Aucun écran</div></div>'; return; }
      const multi = D.screens.length > 1;
      app.innerHTML = `<div class="nxa-top">${back.length && live ? '<button data-back aria-label="Retour">‹</button>' : `<span class="nxa-ic">${esc(D.icon || '📱')}</span>`}
        <b>${esc(multi ? scr.title : D.name)}</b><span class="nxa-dot${online ? ' on' : ''}" title="MASTER"></span>${live && opts.settings !== false ? '<button data-set aria-label="Réglages">⚙</button>' : ''}</div>
        <div class="nxa-body"></div>${multi ? `<nav class="nxa-tabs">${D.screens.map((s) => `<button data-tab="${esc(s.id)}" class="${s.id === scr.id ? 'on' : ''}">${esc(s.title)}</button>`).join('')}</nav>` : ''}`;
      const body = app.querySelector('.nxa-body');
      if (!scr.items.length) body.innerHTML = `<div class="nxa-empty">${mode === 'design' ? 'Glisse des composants ici depuis la palette' : 'Écran vide'}</div>`;
      scr.items.forEach((it) => {
        const wrap = h(`<div class="nxa-item ${it.width === 'half' ? 'half' : ''}" data-id="${esc(it.id)}"></div>`);
        if (mode === 'design') { wrap.draggable = true; if (opts.selected === it.id) wrap.classList.add('sel'); }
        try { build(it, wrap); } catch (e) { wrap.innerHTML = `<div class="nxa-card">⚠ ${esc(it.type)}</div>`; }
        body.appendChild(wrap);
      });
      app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { back.length = 0; go(b.dataset.tab, false); }));
      const bb = app.querySelector('[data-back]');
      if (bb) bb.onclick = () => goBack();
      const sb = app.querySelector('[data-set]');
      if (sb) sb.onclick = settings;
      refresh();
    }
    function goBack() { if (!back.length) return false; screen = back.pop(); render(); return true; }

    function build(it, wrap) {
      const card = (inner) => { wrap.innerHTML = `<div class="nxa-card">${inner}</div>`; return wrap.firstElementChild; };
      switch (it.type) {
        case 'title': {
          wrap.innerHTML = `<div class="nxa-h1"></div>${it.sub ? '<div></div>' : ''}`;
          const [t1, t2] = wrap.children;
          updaters.push(() => { t1.textContent = tpl(it.text); if (t2) t2.textContent = tpl(it.sub); });
          break;
        }
        case 'text': { wrap.innerHTML = `<div class="nxa-t ${esc(it.size || 'm')}"></div>`; const t = wrap.firstElementChild; updaters.push(() => { t.textContent = tpl(it.text); }); break; }
        case 'spacer': wrap.style.height = Math.max(0, Math.min(200, num(it.size, 16))) + 'px'; if (mode === 'design') wrap.style.outline = '1px dashed rgba(127,140,160,.35)'; break;
        case 'image': wrap.innerHTML = `<div class="nxa-img"><div style="font-size:${Math.max(16, Math.min(200, num(it.size, 64)))}px">${esc(it.emoji || '🖼')}</div>${it.caption ? `<div class="nxa-t s">${esc(it.caption)}</div>` : ''}</div>`; break;
        case 'link': { wrap.innerHTML = `<button class="nxa-btn outline">${esc(it.text || 'Ouvrir')} ↗</button>`; wrap.firstElementChild.onclick = () => { if (live) window.open(tpl(it.url), '_blank'); }; break; }
        case 'value': {
          const c = card(`<div class="nxa-lbl">${esc(it.label)}</div><div class="nxa-big"></div>`), big = c.lastElementChild;
          updaters.push(() => {
            const v = vars[it.var];
            big.innerHTML = `${esc(it.var ? fmt(it.var, it.decimals) : '—')}<small>${esc(it.unit || (varDef[it.var] || {}).unit || '')}</small>`;
            big.className = 'nxa-big' + (it.alarm !== '' && it.alarm != null && v > num(it.alarm, Infinity) ? ' bad' : it.warn !== '' && it.warn != null && v > num(it.warn, Infinity) ? ' warn' : '');
          });
          break;
        }
        case 'gauge': {
          const c = card(`<div class="nxa-lbl">${esc(it.label)}</div><svg viewBox="0 0 120 70" style="width:100%;max-height:120px"><path d="M10 64 A50 50 0 0 1 110 64" fill="none" stroke="var(--line)" stroke-width="11" stroke-linecap="round"/><path class="g" d="M10 64 A50 50 0 0 1 110 64" fill="none" stroke="var(--a)" stroke-width="11" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/><text x="60" y="60" text-anchor="middle" font-size="19" font-weight="700" fill="currentColor"></text></svg>`);
          const g = c.querySelector('.g'), tx = c.querySelector('text');
          updaters.push(() => {
            const mn = num(it.min, 0), mx = num(it.max, 100), v = num(vars[it.var], mn);
            const p = Math.max(0, Math.min(100, ((v - mn) / (mx - mn || 1)) * 100));
            g.setAttribute('stroke-dasharray', `${p} 100`);
            tx.textContent = fmt(it.var, 0) + (it.unit || '');
          });
          break;
        }
        case 'chart': {
          const c = card(`<div class="nxa-lbl">${esc(it.label)} <span style="float:right"></span></div><svg viewBox="0 0 300 90" preserveAspectRatio="none" style="width:100%;height:90px"><polyline fill="none" stroke="var(--a)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`);
          const pl = c.querySelector('polyline'), last = c.querySelector('span');
          updaters.push(() => {
            const pts = (hist[it.var] || []).slice(-Math.max(5, Math.min(300, num(it.points, 60))));
            last.textContent = it.var ? fmt(it.var) + ((varDef[it.var] || {}).unit || '') : '';
            if (pts.length < 2) { pl.setAttribute('points', ''); return; }
            const mn = Math.min(...pts), mx = Math.max(...pts), span = mx - mn || 1;
            pl.setAttribute('points', pts.map((v, i) => `${(i / (pts.length - 1)) * 300},${84 - ((v - mn) / span) * 78}`).join(' '));
          });
          break;
        }
        case 'led': {
          const c = card(`<div class="nxa-row"><span>${esc(it.label)}</span><i class="nxa-led"></i></div>`), led = c.querySelector('i');
          updaters.push(() => {
            const v = vars[it.var], th = evalValue(it.value, it.var);
            const on = it.op === 'gt' ? v > th : it.op === 'lt' ? v < th : it.op === 'eq' ? String(v) === String(th) : !!(v && v !== '0');
            led.style.background = on ? it.color || '#ef4444' : '';
            led.style.boxShadow = on ? `0 0 12px ${it.color || '#ef4444'}` : '';
          });
          break;
        }
        case 'button': {
          wrap.innerHTML = `<button class="nxa-btn ${it.style === 'outline' ? 'outline' : ''}">${esc(it.text || 'Bouton')}</button>`;
          const b = wrap.firstElementChild;
          if (it.color) b.style.setProperty('--bc', it.color);
          b.onclick = () => run(it.do, `« ${it.text} »`);
          updaters.push(() => { b.textContent = tpl(it.text || 'Bouton'); });
          break;
        }
        case 'switch': {
          const c = card(`<div class="nxa-row"><span>${esc(it.label)}</span><button class="nxa-sw" role="switch" aria-label="${esc(it.label)}"></button></div>`), sw = c.querySelector('button');
          sw.onclick = () => { if (!live) return; const on = !(vars[it.var] && vars[it.var] !== '0'); if (it.var) setVar(it.var, on ? 1 : 0); else sw.classList.toggle('on', on); run(on ? it.do : it.off, `« ${it.label} »`); };
          updaters.push(() => { if (it.var) sw.classList.toggle('on', !!(vars[it.var] && vars[it.var] !== '0')); });
          break;
        }
        case 'slider': {
          const c = card(`<div class="nxa-row"><span class="nxa-lbl" style="margin:0">${esc(it.label)}</span><b style="margin-left:auto"></b></div><input type="range" min="${num(it.min, 0)}" max="${num(it.max, 100)}" step="${num(it.step, 1)}">`);
          const r = c.querySelector('input'), out = c.querySelector('b');
          r.oninput = () => { if (it.var) setVar(it.var, parseFloat(r.value)); else out.textContent = r.value; };
          r.onchange = () => run(it.do, `« ${it.label} »`);
          updaters.push(() => { if (it.var) { if (document.activeElement !== r) r.value = num(vars[it.var], 0); out.textContent = fmt(it.var); } });
          break;
        }
        case 'input': {
          const c = card(`<div class="nxa-lbl">${esc(it.label)}</div><div class="nxa-in"><input type="${it.kind === 'number' ? 'number' : 'text'}" placeholder="${esc(it.placeholder || '')}"><button>OK</button></div>`);
          const inp = c.querySelector('input');
          const submit = () => { if (it.var) setVar(it.var, it.kind === 'number' ? num(inp.value, 0) : inp.value); run(it.do, `« ${it.label} »`); };
          c.querySelector('button').onclick = submit;
          inp.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
          break;
        }
        case 'joystick': {
          wrap.innerHTML = '<div class="nxa-card"><div class="nxa-joy"><i></i></div></div>';
          const pad = wrap.querySelector('.nxa-joy'), knob = pad.firstElementChild;
          let last = 0, active = false;
          const send = (x, y, force) => {
            if (it.var_x) setVar(it.var_x, Math.round(x * 100), true);
            if (it.var_y) setVar(it.var_y, Math.round(-y * 100), true);
            refresh();
            const t = Date.now();
            if (force || t - last > 200) { last = t; run(it.do, 'joystick'); }
          };
          const move = (e) => {
            if (!active || !live) return;
            const r = pad.getBoundingClientRect();
            let x = (e.clientX - r.left - r.width / 2) / (r.width / 2 - 32), y = (e.clientY - r.top - r.height / 2) / (r.height / 2 - 32);
            const d = Math.hypot(x, y);
            if (d > 1) { x /= d; y /= d; }
            knob.style.transform = `translate(${x * (r.width / 2 - 32)}px,${y * (r.height / 2 - 32)}px)`;
            send(x, y, false);
          };
          pad.onpointerdown = (e) => { active = true; pad.setPointerCapture(e.pointerId); move(e); };
          pad.onpointermove = move;
          pad.onpointerup = pad.onpointercancel = () => { if (!active) return; active = false; knob.style.transform = ''; send(0, 0, true); };
          break;
        }
      }
    }

    function settings() {
      const sh = h(`<div class="nxa-sheet"><div><b>Réglages</b><label class="nxa-lbl">Adresse du MASTER</label><input value="${esc(s3)}"><div class="nxa-t s">${esc(D.name)} · version ${esc(D.version)} · NEXUS LAB</div><button class="nxa-btn">Enregistrer</button></div></div>`);
      sh.onclick = (e) => { if (e.target === sh) sh.remove(); };
      sh.querySelector('button').onclick = () => {
        s3 = sh.querySelector('input').value.trim().replace(/\/+$/, '');
        try { localStorage.setItem('nxa.' + D.id + '.s3', s3); } catch (e) { /* stockage */ }
        sh.remove();
        pollFeeds();
      };
      app.appendChild(sh);
    }

    /* --- démarrage */
    if (live) {
      try { const saved = localStorage.getItem('nxa.' + D.id + '.s3'); if (saved && opts.s3 == null) s3 = saved; } catch (e) { /* stockage */ }
    }
    render();
    if (live) {
      if ((D.vars || []).some((v) => v.source === 'feed')) { pollFeeds(); timers.push(setInterval(pollFeeds, 2000)); }
      (D.vars || []).filter((v) => v.source === 'http').forEach((v) => { pollHttp(v); timers.push(setInterval(() => pollHttp(v), Math.max(1, num(v.every, 2)) * 1000)); });
      (D.rules || []).forEach((r) => {
        if (r.when.type === 'start') run(r.do, 'démarrage');
        if (r.when.type === 'timer') timers.push(setInterval(() => run(r.do, 'minuterie'), Math.max(1, num(r.when.every, 5)) * 1000));
        if (r.when.type === 'screen' && r.when.screen === screen) run(r.do, 'ouverture d\'écran');
      });
      if (opts.player) window.__nexusBack = goBack;
    }

    return {
      el: app,
      vars,
      get screen() { return screen; },
      go: (id) => go(id, false),
      set: setVar,
      select(id) { opts.selected = id; app.querySelectorAll('.nxa-item').forEach((w) => w.classList.toggle('sel', w.dataset.id === id)); },
      destroy() { destroyed = true; timers.forEach(clearInterval); if (window.__nexusBack === goBack) window.__nexusBack = null; root.innerHTML = ''; }
    };
  };

  /* ------------------------------------------------------------------ lecteur (APK et appli web) */
  R.boot = function (root) {
    const D = window.NEXUS_APP;
    if (!D) { root.innerHTML = '<p style="font:16px sans-serif;padding:20px;color:#fff">Application vide.</p>'; return; }
    document.title = D.name;
    if (window.NexusNative && window.NexusNative.barColor) window.NexusNative.barColor(D.color || '#2f7cf6');
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = D.color || '#2f7cf6';
    const web = !(window.NexusNative && window.NexusNative.player && window.NexusNative.player());
    R.app = R.mount(root, D, { mode: 'run', player: true, proxy: web && /\/apps\//.test(location.pathname) ? 'proxy' : null });
  };
})();
/* ---- 58_apkstudio.js ---- */
/* Studio APK : crée une application Android sans coder, à la manière de MIT App Inventor.
 * Écrans, composants glissés-déposés, variables reliées aux capteurs du labo, blocs « quand… alors… »,
 * test en direct, puis le Pi fabrique et signe l'APK (aucune compilation) et donne le lien direct + le QR.
 * Le rendu vient de 57_appruntime.js : l'aperçu est exactement l'application installée. */
(function () {
  'use strict';
  const A = window.APP, $ = A.$, $$ = A.$$, esc = A.esc, icon = A.icon, toast = A.toast, store = A.store;
  const R = window.NexusAppRuntime;
  const S = { D: null, sel: null, scr: null, tab: 'design', mode: 'design', inst: null, logs: [], feeds: [], status: null, last: null, el: null };

  /* ------------------------------------------------------------------ modèle */
  const slug = (t) => {
    const s = String(t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'app';
    return /^[a-z]/.test(s) ? s : ('a' + s).slice(0, 40);
  };
  const ident = (t, used) => {
    let base = String(t || 'v').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 28) || 'v';
    if (!/^[A-Za-z_]/.test(base)) base = 'v_' + base;
    let n = base, i = 2;
    while (used.has(n)) n = base + '_' + i++;
    used.add(n);
    return n;
  };
  function fix() {
    const D = S.D;
    D.vars = D.vars || []; D.rules = D.rules || [];
    if (!D.screens || !D.screens.length) D.screens = [{ id: 'accueil', title: 'Accueil', items: [] }];
    D.screens.forEach((s) => (s.items = s.items || []));
    if (!D.screens.some((s) => s.id === S.scr)) S.scr = D.screens[0].id;
    D.version = Math.max(1, parseInt(D.version, 10) || 1);
  }
  const save = () => store.set('apkstudio.design', S.D);
  function load() { S.D = store.get('apkstudio.design', null) || R.blank('Mon application'); fix(); }
  const screen = () => S.D.screens.find((s) => s.id === S.scr) || S.D.screens[0];
  function findItem(id) {
    for (let si = 0; si < S.D.screens.length; si++) {
      const i = S.D.screens[si].items.findIndex((x) => x.id === id);
      if (i >= 0) return { si, i, it: S.D.screens[si].items[i] };
    }
    return null;
  }
  const getP = (path) => path.reduce((o, k) => (o == null ? o : o[k]), S.D);
  function setP(path, v) { const o = getP(path.slice(0, -1)); if (o) o[path[path.length - 1]] = v; }

  /* ------------------------------------------------------------------ modèles d'applications */
  const TEMPLATES = {
    dashboard: { name: 'Tableau de bord', icon: '📊', desc: 'Température, humidité, jauge et courbe depuis le MASTER', make() {
      const d = R.blank('Mon tableau de bord'); d.icon = '📊';
      d.vars = [{ name: 'temp', source: 'feed', feed: 'temp', unit: '°C', type: 'number', default: 0 }, { name: 'hum', source: 'feed', feed: 'hum', unit: '%', type: 'number', default: 0 }];
      d.screens[0].items = [{ id: 'c1', type: 'title', text: 'Mon tableau de bord', sub: 'Mesures en direct du labo' },
        { id: 'c2', type: 'value', label: 'Température', var: 'temp', unit: '°C', decimals: 1, warn: 28, alarm: 35, width: 'half' },
        { id: 'c3', type: 'gauge', label: 'Humidité', var: 'hum', min: 0, max: 100, unit: '%', width: 'half' },
        { id: 'c4', type: 'chart', label: 'Température', var: 'temp', points: 60, width: 'full' }];
      d.rules = [{ when: { type: 'above', var: 'temp', value: '35' }, do: [{ a: 'notify', text: 'Alerte : {temp} °C' }, { a: 'vibrate', ms: 400 }] }];
      return d; } },
    remote: { name: 'Télécommande', icon: '🎛', desc: 'Boutons et interrupteurs qui commandent un appareil en HTTP', make() {
      const d = R.blank('Télécommande'); d.icon = '🎛';
      d.vars = [{ name: 'ip', source: 'local', type: 'text', default: '192.168.4.20' }, { name: 'lampe', source: 'local', type: 'bool', default: 0 }, { name: 'vitesse', source: 'local', type: 'number', default: 50 }];
      d.screens[0].items = [{ id: 'c1', type: 'title', text: 'Télécommande', sub: 'Appareil : {ip}' },
        { id: 'c2', type: 'switch', label: 'Lampe', var: 'lampe', width: 'full', do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?lampe=1' }], off: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?lampe=0' }] },
        { id: 'c3', type: 'slider', label: 'Vitesse', var: 'vitesse', min: 0, max: 100, step: 5, width: 'full', do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?vitesse={vitesse}' }] },
        { id: 'c4', type: 'button', text: 'Marche', color: '#16a34a', style: 'fill', width: 'half', do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?run=1' }, { a: 'vibrate', ms: 60 }] },
        { id: 'c5', type: 'button', text: 'Arrêt', color: '#ef4444', style: 'fill', width: 'half', do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?run=0' }, { a: 'vibrate', ms: 60 }] }];
      return d; } },
    car: { name: 'Manette de voiture', icon: '🏎', desc: 'Joystick qui envoie direction et vitesse à une voiture ESP32', make() {
      const d = R.blank('Ma voiture'); d.icon = '🏎'; d.color = '#ea580c';
      d.vars = [{ name: 'ip', source: 'local', type: 'text', default: '192.168.4.30' }, { name: 'x', source: 'local', type: 'number', default: 0 }, { name: 'y', source: 'local', type: 'number', default: 0 }];
      d.screens[0].items = [{ id: 'c1', type: 'title', text: 'Ma voiture', sub: 'Lâche le joystick pour arrêter' },
        { id: 'c2', type: 'joystick', var_x: 'x', var_y: 'y', do: [{ a: 'http', method: 'GET', url: 'http://{ip}/drive?x={x}&y={y}' }] },
        { id: 'c3', type: 'value', label: 'Avance', var: 'y', unit: '%', decimals: 0, width: 'half' },
        { id: 'c4', type: 'value', label: 'Virage', var: 'x', unit: '%', decimals: 0, width: 'half' },
        { id: 'c5', type: 'button', text: 'STOP', color: '#ef4444', width: 'full', do: [{ a: 'set', var: 'x', value: '0' }, { a: 'set', var: 'y', value: '0' }, { a: 'http', method: 'GET', url: 'http://{ip}/drive?x=0&y=0' }, { a: 'vibrate', ms: 200 }] }];
      return d; } },
    voice: { name: 'Commande vocale', icon: '🎙', desc: 'Parle à ton montage : « allume », « éteins »', make() {
      const d = R.blank('Commande vocale'); d.icon = '🎙'; d.color = '#9333ea';
      d.vars = [{ name: 'phrase', source: 'local', type: 'text', default: '' }, { name: 'ip', source: 'local', type: 'text', default: '192.168.4.20' }];
      d.screens[0].items = [{ id: 'c1', type: 'title', text: 'Commande vocale', sub: 'Dis « allume » ou « éteins »' },
        { id: 'c2', type: 'button', text: '🎙 Parler', width: 'full', do: [{ a: 'listen', var: 'phrase' }] },
        { id: 'c3', type: 'text', text: 'J\'ai compris : {phrase}', size: 'l', width: 'full' }];
      d.rules = [{ when: { type: 'equals', var: 'phrase', value: 'allume' }, do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?lampe=1' }, { a: 'speak', text: 'C\'est allumé' }] },
        { when: { type: 'equals', var: 'phrase', value: 'éteins' }, do: [{ a: 'http', method: 'GET', url: 'http://{ip}/set?lampe=0' }, { a: 'speak', text: 'C\'est éteint' }] }];
      return d; } },
    lab: { name: 'Contrôle du labo', icon: '🧪', desc: 'Lance check-up, scan I2C et clignotement sur les workers', make() {
      const d = R.blank('Mon labo'); d.icon = '🧪'; d.color = '#0891b2';
      d.vars = [{ name: 'worker', source: 'local', type: 'number', default: 0 }];
      d.screens[0].items = [{ id: 'c1', type: 'title', text: 'Mon labo', sub: 'Jobs du MASTER' },
        { id: 'c2', type: 'button', text: 'Check-up', width: 'half', do: [{ a: 'job', type: 'SYSTEM_TEST', worker: 0 }] },
        { id: 'c3', type: 'button', text: 'Scan I2C', width: 'half', do: [{ a: 'job', type: 'I2C_SCAN', worker: 0 }] },
        { id: 'c4', type: 'button', text: 'Faire clignoter', style: 'outline', width: 'full', do: [{ a: 'job', type: 'IDENTIFY', worker: 0 }] }];
      return d; } }
  };

  /* Application tirée d'un projet du Studio : une variable par mesure envoyée au MASTER. */
  function fromSpec(spec, name) {
    const g = window.LAB.generate(Object.assign({}, spec, { options: Object.assign({}, spec.options || {}, { master: true }) }));
    const d = R.blank(name || spec.title || 'Mon projet');
    d.name = String(name || spec.title || 'Mon projet').slice(0, 60);
    d.icon = '📟';
    d.description = `Mesures du montage « ${g.title} » (appareil ${g.device}).`;
    const used = new Set();
    d.vars = g.outs.slice(0, 24).map((o) => ({ name: ident(o.key, used), source: 'feed', feed: `${g.device}/${o.key}`, unit: o.unit, label: `${o.module} ${o.label}`, type: 'number', default: 0 }));
    const items = [{ id: 'c1', type: 'title', text: d.name, sub: g.boardName }];
    d.vars.forEach((v, i) => items.push({ id: 'c' + (i + 2), type: 'value', label: v.label, var: v.name, unit: v.unit, decimals: 1, width: 'half' }));
    d.vars.slice(0, 2).forEach((v, i) => items.push({ id: 'c' + (d.vars.length + 2 + i), type: 'chart', label: v.label, var: v.name, points: 60, width: 'full' }));
    if (!d.vars.length && !(g.controls || []).length) items.push({ id: 'c2', type: 'text', text: 'Ce projet n\'envoie pas de mesure : ajoute des boutons pour le commander.', size: 's' });
    d.screens[0].items = items;
    if (g.app && (g.controls || []).length) addControls(d, g, used, items.length + 2);
    return d;
  }
  /* Montage avec « Pilotage par application » : un interrupteur ou un curseur par actionneur et variable réglable,
   * qui appelle /set sur l'appareil (adresse connue grâce aux mesures reçues par le MASTER). */
  function addControls(d, g, used, n) {
    const feed = d.vars.find((v) => v.source === 'feed');
    let host = feed ? `{${feed.name}_ip}` : '';
    if (!host) { const ip = ident('ip_appareil', used); d.vars.push({ name: ip, source: 'local', type: 'text', default: '192.168.4.20', label: 'Adresse IP du montage' }); host = `{${ip}}`; }
    const set = (q) => [{ a: 'http', method: 'GET', url: `http://${host}/set?${q}` }];
    const items = [{ id: 'c' + n++, type: 'title', text: 'Commandes', sub: g.title }];
    if (!feed) items.push({ id: 'c' + n++, type: 'input', label: 'Adresse IP du montage', var: d.vars[d.vars.length - 1].name, width: 'full' });
    g.controls.forEach((c) => {
      if (c.var) {   // variable réglable : déjà suivie via le MASTER (var_<nom>), sinon variable locale
        let v = d.vars.find((x) => x.feed === `${g.device}/${c.key}`);
        if (!v) { v = { name: ident(c.key, used), source: 'local', type: 'number', default: 0, unit: c.set.unit || '' }; d.vars.push(v); }
        items.push({ id: 'c' + n++, type: 'slider', label: c.name, var: v.name, min: 0, max: 100, step: 0.5, width: 'full', do: set(`${c.key}={${v.name}}`) });
        return;
      }
      const v = { name: ident(c.key + '_cmd', used), source: 'local', type: 'number', default: 0, label: c.name };
      d.vars.push(v);
      if (c.set && c.set.min != null) {
        const span = Number(c.set.max) - Number(c.set.min);
        v.default = Number(c.set.min) <= 0 && Number(c.set.max) >= 0 ? 0 : Number(c.set.min);
        v.unit = c.set.unit || '';
        items.push({ id: 'c' + n++, type: 'slider', label: `${c.name} (${c.set.unit || ''})`.replace(' ()', ''), var: v.name, min: Number(c.set.min), max: Number(c.set.max), step: span > 200 ? Math.round(span / 100) : span > 20 ? 1 : 0.1, width: 'full', do: set(`${c.key}={${v.name}}`) });
      } else {
        items.push({ id: 'c' + n++, type: 'switch', label: c.name, var: v.name, width: 'full', do: set(`${c.key}=on`), off: set(`${c.key}=off`) });
      }
    });
    d.screens[0].title = 'Mesures';
    d.screens.push({ id: 'commandes', title: 'Commandes', items });
  }

  /* ------------------------------------------------------------------ Pi */
  const piReady = () => !!(A.piBase && A.piBase());
  const piJ = (path, body) => A.piRequest(path, { method: 'POST', body: JSON.stringify(body || {}) });
  async function testNet(method, url, body) {
    if (!/^https?:/i.test(url)) {   // MASTER : mêmes appels que le reste de l'interface (session, mode démo)
      const data = method === 'GET' ? await A.api(url) : await A.post(url, Object.fromEntries(new URLSearchParams(body || '')));
      return { status: 200, text: typeof data === 'string' ? data : JSON.stringify(data) };
    }
    if (!piReady()) {
      const r = await fetch(url, Object.assign({ method }, body && method !== 'GET' ? { body, headers: { 'Content-Type': /^[[{]/.test(body.trim()) ? 'application/json' : 'application/x-www-form-urlencoded' } } : {}));
      return { status: r.status, text: await r.text() };
    }
    const r = await fetch(A.piBase() + '/api/v1/appstudio/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + A.piToken() }, body: JSON.stringify({ method, url, body: body || '' }) });
    return { status: r.status, text: await r.text() };
  }
  async function publish(design, quiet) {
    if (!piReady()) throw new Error('Pi non configuré : ouvre « Compagnon Pi » et renseigne son adresse et son jeton.');
    const d = JSON.parse(JSON.stringify(design));
    d.id = d.id || slug(d.name);
    const saved = await piJ('/api/v1/appstudio/apps', { design: d });
    const res = await piJ(`/api/v1/appstudio/apps/${saved.id}/build`, {});
    res.id = saved.id;
    res.apk_url = A.piBase() + res.apk;
    res.web_url = A.piBase() + res.web;
    if (!quiet) toast(`APK prête : ${d.name} v${res.version}`, 'ok');
    return res;
  }
  async function qrUrl(res) {
    try { const blob = await A.piRequest(res.qr); return blob instanceof Blob ? URL.createObjectURL(blob) : ''; } catch (e) { return ''; }
  }
  A.AppStudio = { fromSpec, publish, qrUrl, slug, templates: TEMPLATES };

  /* ------------------------------------------------------------------ champs génériques */
  const P = (path) => esc(JSON.stringify(path));
  function field(kind, value, path, label) {
    const v = value == null ? '' : value;
    let inp;
    if (kind === 'textarea') inp = `<textarea class="textarea" rows="3" data-p="${P(path)}">${esc(v)}</textarea>`;
    else if (kind === 'number') inp = `<input class="input" type="number" step="any" data-num data-p="${P(path)}" value="${esc(v)}">`;
    else if (kind === 'color') inp = `<div class="row"><input type="color" data-p="${P(path)}" value="${esc(/^#[0-9a-f]{6}$/i.test(v) ? v : S.D.color || '#2f7cf6')}" style="width:48px;height:34px;border:0;background:none">${v ? `<button class="btn sm ghost" data-clear="${P(path)}">Par défaut</button>` : '<span class="hint">couleur du thème</span>'}</div>`;
    else if (kind === 'var') inp = `<select class="select" data-p="${P(path)}"><option value="">— choisir —</option>${S.D.vars.map((x) => `<option ${x.name === v ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}<option value="__new">＋ Nouvelle variable…</option></select>`;
    else if (kind === 'screen') inp = `<select class="select" data-p="${P(path)}">${S.D.screens.map((s) => `<option value="${esc(s.id)}" ${s.id === v ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select>`;
    else if (kind.startsWith('select:')) inp = `<select class="select" data-p="${P(path)}">${kind.slice(7).split('|').map((o) => { const j = o.indexOf('='); const k = o.slice(0, j), n = o.slice(j + 1); return `<option value="${esc(k)}" ${String(v) === k ? 'selected' : ''}>${esc(n)}</option>`; }).join('')}</select>`;
    else inp = `<input class="input" data-p="${P(path)}" value="${esc(v)}">`;
    return `<label class="field">${label ? `<span>${esc(label)}</span>` : ''}${inp}</label>`;
  }
  function actionsEditor(path, title) {
    const list = getP(path) || [];
    return `<div class="as-acts"><div class="as-acts-h">${esc(title)}</div>${list.map((a, i) => {
      const meta = R.ACTIONS[a.a] || R.ACTIONS.notify;
      return `<div class="as-act"><div class="row"><span class="as-n">${i + 1}</span><select class="select sm grow" data-p="${P(path.concat([i, 'a']))}" data-restruct>${Object.entries(R.ACTIONS).map(([k, m]) => `<option value="${k}" ${k === a.a ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select><button class="btn sm icon ghost" data-delact="${P(path)}" data-i="${i}" aria-label="Retirer">${icon('x')}</button></div>
        ${meta.fields.map(([k, lbl, kind]) => field(kind, a[k], path.concat([i, k]), lbl)).join('')}</div>`;
    }).join('')}<button class="btn sm" data-addact="${P(path)}">${icon('plus')}Ajouter une action</button></div>`;
  }

  /* ------------------------------------------------------------------ rendu de la page */
  function draw() {
    const el = S.el;
    if (!el) return;
    el.innerHTML = `<div class="as-head"><div class="as-app"><span class="as-ico" style="background:${esc(S.D.color)}">${esc(S.D.icon)}</span><div><b>${esc(S.D.name)}</b><div class="small muted">${S.D.screens.length} écran(s) · ${S.D.vars.length} variable(s) · ${S.D.rules.length} bloc(s) · v${S.D.version}</div></div></div>
      <div class="tabs" id="as-tabs">${[['design', 'Concevoir', 'phone'], ['vars', 'Variables', 'gauge'], ['rules', 'Blocs « quand »', 'zap'], ['settings', 'Application', 'settings'], ['publish', 'Publier', 'download']].map(([k, n, ic]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${icon(ic)}${n}</button>`).join('')}</div></div>
      <div id="as-body"></div>`;
    $$('#as-tabs button', el).forEach((b) => (b.onclick = () => { S.tab = b.dataset.tab; draw(); }));
    const body = $('#as-body', el);
    if (S.tab === 'design') drawDesign(body);
    else if (S.tab === 'vars') drawVars(body);
    else if (S.tab === 'rules') drawRules(body);
    else if (S.tab === 'settings') drawSettings(body);
    else drawPublish(body);
  }

  function drawDesign(body) {
    const groups = {};
    Object.entries(R.COMPONENTS).forEach(([k, c]) => (groups[c.group] = groups[c.group] || []).push([k, c]));
    body.innerHTML = `<div class="as-layout">
      <div class="card as-pal"><div class="card-h"><h2>Composants</h2></div><div class="card-b">${Object.entries(groups).map(([g, list]) => `<div class="as-g">${esc(g)}</div><div class="as-pal-list">${list.map(([k, c]) => `<button class="as-pi" draggable="true" data-add="${k}" title="Clique ou glisse dans le téléphone"><span>${esc(c.icon)}</span>${esc(c.label)}</button>`).join('')}</div>`).join('')}</div></div>
      <div class="as-center">
        <div class="row wrap as-scr">${S.D.screens.map((s) => `<button class="chip ${s.id === S.scr ? 'on' : ''}" data-scr="${esc(s.id)}">${esc(s.title)}</button>`).join('')}<button class="chip" data-scr-add>${icon('plus')}Écran</button><span class="grow"></span>
          <div class="seg" id="as-mode"><button data-m="design" class="${S.mode === 'design' ? 'on' : ''}">${icon('edit')}Concevoir</button><button data-m="run" class="${S.mode === 'run' ? 'on' : ''}">${icon('play')}Tester</button></div></div>
        <div class="as-phone"><div class="as-notch"></div><div class="as-screen" id="as-screen"></div></div>
        ${S.mode === 'run' ? `<div class="card as-log"><div class="card-h"><h2 class="grow">Journal du test</h2><span class="hint">${piReady() ? 'Requêtes relayées par le Pi' : 'Sans Pi : le navigateur peut bloquer les requêtes vers les appareils'}</span></div><div class="card-b small mono" id="as-log">${S.logs.map((l) => `<div class="${l.k === 'bad' ? 'bad-text' : ''}">${esc(l.m)}</div>`).join('') || '<span class="muted">Appuie sur les boutons du téléphone.</span>'}</div></div>` : ''}
      </div>
      <div class="card as-insp"><div class="card-h"><h2 class="grow">Propriétés</h2></div><div class="card-b" id="as-insp"></div></div></div>`;
    $$('[data-scr]', body).forEach((b) => (b.onclick = () => { S.scr = b.dataset.scr; S.sel = null; draw(); }));
    $('[data-scr-add]', body).onclick = addScreen;
    $$('#as-mode button', body).forEach((b) => (b.onclick = () => { S.mode = b.dataset.m; S.logs = []; draw(); }));
    $$('[data-add]', body).forEach((b) => {
      b.onclick = () => addItem(b.dataset.add);
      b.ondragstart = (e) => { e.dataTransfer.setData('text/x-nexus-add', b.dataset.add); e.dataTransfer.effectAllowed = 'copy'; };
    });
    preview();
    inspector();
  }

  function sample() {
    const out = {};
    S.D.vars.forEach((v) => {
      if (v.source === 'feed') {
        const [a, b] = v.feed && v.feed.indexOf('/') > 0 ? v.feed.split('/') : [null, v.feed];
        const f = S.feeds.find((x) => x.key === b && (!a || x.source === a));
        const typical = { '°C': 21.5, '%': 48, hPa: 1013, m: 120, lx: 350, ppm: 420, V: 3.7, cm: 25 };
        out[v.name] = f ? Number(f.value) : typical[v.unit] != null ? typical[v.unit] : 42;
      } else if (v.type === 'number' && !Number(v.default)) out[v.name] = 42;
    });
    return out;
  }
  function preview() {
    const host = $('#as-screen', S.el);
    if (!host) return;
    if (S.inst) S.inst.destroy();
    S.inst = R.mount(host, S.D, {
      mode: S.mode, screen: S.scr, selected: S.sel, sample: S.mode === 'design' ? sample() : null, s3: '', native: false, settings: false, net: testNet,
      log: (m, k) => { S.logs.push({ m, k }); S.logs = S.logs.slice(-40); const lg = $('#as-log', S.el); if (lg) { lg.innerHTML = S.logs.map((l) => `<div class="${l.k === 'bad' ? 'bad-text' : ''}">${esc(l.m)}</div>`).join(''); lg.scrollTop = 1e6; } },
      onScreen: (id) => { if (S.scr !== id) { S.scr = id; $$('[data-scr]', S.el).forEach((b) => b.classList.toggle('on', b.dataset.scr === id)); if (S.mode === 'design') { S.sel = null; inspector(); } } }
    });
    if (S.mode !== 'design') return;
    const app = S.inst.el;
    app.addEventListener('click', (e) => { const w = e.target.closest('.nxa-item'); if (!w) return; S.sel = w.dataset.id; S.inst.select(S.sel); inspector(); if (innerWidth < 760) { const b = $('#as-insp', S.el); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    let dragId = null;
    app.addEventListener('dragstart', (e) => { const w = e.target.closest('.nxa-item'); if (!w) return; dragId = w.dataset.id; e.dataTransfer.setData('text/x-nexus-move', dragId); e.dataTransfer.effectAllowed = 'move'; });
    app.addEventListener('dragover', (e) => { e.preventDefault(); $$('.nxa-item.drop', app).forEach((x) => x.classList.remove('drop')); const w = e.target.closest('.nxa-item'); if (w) w.classList.add('drop'); });
    app.addEventListener('dragleave', (e) => { if (!app.contains(e.relatedTarget)) $$('.nxa-item.drop', app).forEach((x) => x.classList.remove('drop')); });
    app.addEventListener('drop', (e) => {
      e.preventDefault();
      const w = e.target.closest('.nxa-item'), before = w ? w.dataset.id : null;
      const add = e.dataTransfer.getData('text/x-nexus-add'), move = e.dataTransfer.getData('text/x-nexus-move') || dragId;
      if (add) addItem(add, before);
      else if (move && move !== before) moveItem(move, before);
      dragId = null;
    });
  }
  function changed(restructure) {
    save();
    if (restructure) { draw(); return; }
    const head = $('.as-app', S.el);
    if (head) head.innerHTML = `<span class="as-ico" style="background:${esc(S.D.color)}">${esc(S.D.icon)}</span><div><b>${esc(S.D.name)}</b><div class="small muted">${S.D.screens.length} écran(s) · ${S.D.vars.length} variable(s) · ${S.D.rules.length} bloc(s) · v${S.D.version}</div></div>`;
    clearTimeout(changed.t);
    changed.t = setTimeout(preview, 180);
  }

  function addItem(type, before) {
    const it = R.newItem(type, S.D), list = screen().items;
    const i = before ? list.findIndex((x) => x.id === before) : -1;
    if (i >= 0) list.splice(i, 0, it); else list.push(it);
    if ((it.var === '' || it.var_x === '') && S.D.vars.length && type !== 'joystick') it.var = S.D.vars[0].name;
    S.sel = it.id;
    changed(true);
  }
  function moveItem(id, before) {
    const f = findItem(id);
    if (!f) return;
    const [it] = S.D.screens[f.si].items.splice(f.i, 1), list = screen().items;
    const i = before ? list.findIndex((x) => x.id === before) : -1;
    if (i >= 0) list.splice(i, 0, it); else list.push(it);
    changed(true);
  }
  async function addScreen() {
    const title = await A.modal({ title: 'Nouvel écran', input: 'Écran ' + (S.D.screens.length + 1), label: 'Nom de l\'écran', ok: 'Créer' });
    if (!title) return;
    const used = new Set(S.D.screens.map((s) => s.id));
    const id = ident(slug(title), used);
    S.D.screens.push({ id, title: String(title).slice(0, 60), items: [{ id: R.newItem('title', S.D).id, type: 'title', text: String(title).slice(0, 60), sub: '' }] });
    S.scr = id; S.sel = null;
    changed(true);
  }

  function inspector() {
    const box = $('#as-insp', S.el);
    if (!box) return;
    const f = S.sel && findItem(S.sel);
    if (!f) {
      const s = screen(), si = S.D.screens.indexOf(s);
      box.innerHTML = `<p class="small muted">Clique un composant du téléphone pour le régler, ou glisse-le pour le déplacer.</p>
        ${field('text', s.title, ['screens', si, 'title'], 'Nom de l\'écran')}
        <div class="row wrap">${si > 0 ? `<button class="btn sm" data-scr-left>${icon('back')}Avancer l'écran</button>` : ''}${S.D.screens.length > 1 ? `<button class="btn sm danger" data-scr-del>${icon('trash')}Supprimer l'écran</button>` : ''}</div>`;
      const left = $('[data-scr-left]', box);
      if (left) left.onclick = () => { S.D.screens.splice(si, 1); S.D.screens.splice(si - 1, 0, s); changed(true); };
      const del = $('[data-scr-del]', box);
      if (del) del.onclick = async () => { if (!(await A.confirmBox('Supprimer l\'écran', `« ${s.title} » et ses ${s.items.length} composant(s) seront supprimés.`, 'Supprimer', true))) return; S.D.screens.splice(si, 1); S.scr = S.D.screens[0].id; changed(true); };
      return;
    }
    const meta = R.COMPONENTS[f.it.type], base = ['screens', f.si, 'items', f.i];
    box.innerHTML = `<div class="row"><span class="as-badge">${esc(meta.icon)}</span><b class="grow">${esc(meta.label)}</b><span class="small muted mono">${esc(f.it.id)}</span></div>
      ${meta.props.map(([k, lbl, kind]) => (kind === 'actions' ? actionsEditor(base.concat([k]), lbl) : field(kind, f.it[k], base.concat([k]), lbl))).join('')}
      <div class="row wrap as-tools"><button class="btn sm" data-mv="-1">${icon('chevron')}Monter</button><button class="btn sm" data-mv="1">Descendre</button><button class="btn sm" data-dup>${icon('copy')}Dupliquer</button><button class="btn sm danger" data-del>${icon('trash')}Supprimer</button></div>`;
    $$('[data-mv]', box).forEach((b) => (b.onclick = () => { const list = S.D.screens[f.si].items, j = f.i + Number(b.dataset.mv); if (j < 0 || j >= list.length) return; list.splice(j, 0, list.splice(f.i, 1)[0]); changed(true); }));
    $('[data-dup]', box).onclick = () => { const c = JSON.parse(JSON.stringify(f.it)); c.id = R.newItem(f.it.type, S.D).id; S.D.screens[f.si].items.splice(f.i + 1, 0, c); S.sel = c.id; changed(true); };
    $('[data-del]', box).onclick = () => { S.D.screens[f.si].items.splice(f.i, 1); S.sel = null; changed(true); };
  }

  function drawVars(body) {
    body.innerHTML = `<div class="card"><div class="card-h"><h2 class="grow">Variables</h2><button class="btn sm" id="as-feeds">${icon('refresh')}Mesures du MASTER</button><button class="btn sm primary" id="as-addvar">${icon('plus')}Variable</button></div>
      <div class="card-b"><p class="hint">Une variable garde une valeur. Elle peut venir d'un capteur (mesure envoyée au MASTER par ton montage), d'une adresse HTTP d'un appareil (JSON), ou rester locale (réglée par un bouton, un curseur, la voix…). Utilise-la partout avec <code>{nom}</code>.</p>
      <datalist id="as-feedlist">${S.feeds.map((f) => `<option value="${esc(f.source + '/' + f.key)}">${esc(f.value + ' ' + (f.unit || ''))}</option>`).join('')}</datalist>
      ${S.D.vars.length ? '' : '<div class="empty">Aucune variable. Ajoute-en une, ou pars d\'un projet (onglet Application).</div>'}
      <div class="as-vars">${S.D.vars.map((v, i) => {
        const p = ['vars', i], live = v.source === 'feed' ? S.feeds.find((f) => (v.feed || '').endsWith('/' + f.key) ? (v.feed === f.source + '/' + f.key) : f.key === v.feed) : null;
        return `<div class="as-var card pad"><div class="row"><b class="mono grow">{${esc(v.name)}}</b>${live ? `<span class="badge ok">${esc(live.value)} ${esc(live.unit || '')}</span>` : ''}<button class="btn sm icon ghost" data-delvar="${i}" aria-label="Supprimer">${icon('trash')}</button></div>
          <div class="form-grid">${field('text', v.name, p.concat(['name']), 'Nom')}${field('select:local=Locale|feed=Capteur du MASTER|http=Adresse HTTP (JSON)', v.source, p.concat(['source']), 'Source')}
          ${field('select:number=Nombre|text=Texte|bool=Oui / non', v.type, p.concat(['type']), 'Type')}${field('text', v.unit, p.concat(['unit']), 'Unité')}
          ${v.source === 'feed' ? `<label class="field"><span>Mesure (appareil/clé)</span><input class="input" list="as-feedlist" data-p="${P(p.concat(['feed']))}" value="${esc(v.feed || '')}" placeholder="serre/temp"></label>` : ''}
          ${v.source === 'http' ? field('text', v.url, p.concat(['url']), 'Adresse (ex. http://192.168.4.23/api)') + field('text', v.path, p.concat(['path']), 'Chemin dans le JSON (ex. values.0)') + field('number', v.every || 2, p.concat(['every']), 'Toutes les N secondes') : ''}
          ${v.source === 'local' ? field('text', v.default, p.concat(['default']), 'Valeur de départ') : ''}</div>
          ${v.source === 'feed' ? '<div class="hint">L\'adresse IP de l\'appareil est aussi disponible : <code>{' + esc(v.name) + '_ip}</code>.</div>' : ''}</div>`;
      }).join('')}</div></div></div>`;
    $('#as-addvar', body).onclick = () => { const used = new Set(S.D.vars.map((v) => v.name)); S.D.vars.push({ name: ident('valeur', used), source: S.feeds.length ? 'feed' : 'local', feed: S.feeds.length ? S.feeds[0].source + '/' + S.feeds[0].key : '', type: 'number', unit: '', default: 0 }); changed(true); };
    $('#as-feeds', body).onclick = async () => { await loadFeeds(); draw(); toast(S.feeds.length ? `${S.feeds.length} mesure(s) reçue(s) par le MASTER` : 'Aucune mesure reçue : ton montage doit envoyer au MASTER (option du Studio).', S.feeds.length ? 'ok' : 'warn'); };
    $$('[data-delvar]', body).forEach((b) => (b.onclick = () => { S.D.vars.splice(Number(b.dataset.delvar), 1); changed(true); }));
  }

  function drawRules(body) {
    body.innerHTML = `<div class="card"><div class="card-h"><h2 class="grow">Blocs « quand… alors… »</h2><button class="btn sm primary" id="as-addrule">${icon('plus')}Bloc</button></div>
      <div class="card-b"><p class="hint">Comme les blocs d'App Inventor : choisis un événement, puis les actions à faire. Les seuils ne se déclenchent qu'au franchissement (pas en boucle).</p>
      ${S.D.rules.length ? '' : '<div class="empty">Aucun bloc. Exemple : quand {temp} dépasse 30, afficher « Trop chaud » et vibrer.</div>'}
      ${S.D.rules.map((r, i) => {
        const w = R.WHEN[r.when.type] || R.WHEN.start, p = ['rules', i];
        return `<div class="card pad as-rule"><div class="row"><span class="rule-kw">QUAND</span><select class="select sm grow" data-p="${P(p.concat(['when', 'type']))}" data-restruct>${Object.entries(R.WHEN).map(([k, m]) => `<option value="${k}" ${k === r.when.type ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select><button class="btn sm icon ghost" data-delrule="${i}" aria-label="Supprimer">${icon('trash')}</button></div>
          <div class="form-grid">${(w.fields || []).map(([k, lbl, kind]) => field(kind, r.when[k], p.concat(['when', k]), lbl)).join('')}</div>
          ${actionsEditor(p.concat(['do']), 'ALORS')}</div>`;
      }).join('')}</div></div>`;
    $('#as-addrule', body).onclick = () => { S.D.rules.push({ when: S.D.vars.length ? { type: 'above', var: S.D.vars[0].name, value: '30' } : { type: 'timer', every: 10 }, do: [{ a: 'notify', text: 'Bloc déclenché' }] }); changed(true); };
    $$('[data-delrule]', body).forEach((b) => (b.onclick = () => { S.D.rules.splice(Number(b.dataset.delrule), 1); changed(true); }));
  }

  function drawSettings(body) {
    body.innerHTML = `<div class="grid g-2"><div class="card"><div class="card-h"><h2>Application</h2></div><div class="card-b form-grid">
        ${field('text', S.D.name, ['name'], 'Nom affiché sur le téléphone')}${field('text', S.D.icon, ['icon'], 'Icône (emoji)')}
        ${field('color', S.D.color, ['color'], 'Couleur principale')}${field('select:auto=Selon le téléphone|light=Clair|dark=Sombre', S.D.theme, ['theme'], 'Thème')}
        ${field('text', S.D.s3, ['s3'], 'Adresse du MASTER')}${field('number', S.D.version, ['version'], 'Version (augmente à chaque APK)')}
        ${field('textarea', S.D.description, ['description'], 'Description')}
        <div class="hint">Identifiant Android : <code>local.nexus.apps.${esc(S.D.id || slug(S.D.name))}</code>${S.D.id ? ' (fixé : garde-le pour mettre à jour l\'appli installée)' : ''}</div></div></div>
      <div class="card"><div class="card-h"><h2>Partir de…</h2></div><div class="card-b">
        <div class="as-tpl">${Object.entries(TEMPLATES).map(([k, t]) => `<button class="as-tplb" data-tpl="${k}"><span>${esc(t.icon)}</span><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join('')}
        <button class="as-tplb" data-from-studio><span>🧩</span><b>Projet du Studio</b><small>Une valeur et une courbe par mesure du montage ouvert dans le Studio</small></button>
        <button class="as-tplb" data-tpl-blank><span>⬜</span><b>Vide</b><small>Un écran, rien d'autre</small></button></div>
        <div class="row wrap" style="margin-top:12px"><button class="btn sm" id="as-export">${icon('download')}Exporter (.json)</button><label class="btn sm">${icon('upload')}Importer<input type="file" accept=".json,application/json" id="as-import" hidden></label></div></div></div></div>`;
    $$('[data-tpl]', body).forEach((b) => (b.onclick = () => replace(TEMPLATES[b.dataset.tpl].make())));
    $('[data-tpl-blank]', body).onclick = () => replace(R.blank('Mon application'));
    $('[data-from-studio]', body).onclick = () => {
      const spec = store.get('studio.spec', null);
      if (!spec || !(spec.modules || []).length) { toast('Le Studio est vide : assemble d\'abord ton montage.', 'warn'); return; }
      try { replace(fromSpec(spec)); } catch (e) { toast(e.message, 'bad'); }
    };
    $('#as-export', body).onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S.D, null, 1)], { type: 'application/json' })); a.download = (S.D.id || slug(S.D.name)) + '.nexusapp.json'; a.click(); };
    $('#as-import', body).onchange = async (e) => { try { const d = JSON.parse(await e.target.files[0].text()); if (d.format !== R.FORMAT) throw new Error('Ce fichier n\'est pas une application NEXUS'); replace(d, true); } catch (err) { toast(err.message, 'bad'); } };
  }
  async function replace(d, keepId) {
    const used = (S.D.screens || []).some((s) => s.items.length > 1) || S.D.vars.length;
    if (used && !(await A.confirmBox('Remplacer l\'application ?', `« ${S.D.name} » sera remplacée dans l'éditeur (elle reste sur le Pi si tu l'as publiée).`, 'Remplacer'))) return;
    if (!keepId) delete d.id;
    S.D = d; S.sel = null; S.scr = null; fix(); S.tab = 'design';
    changed(true);
  }

  async function drawPublish(body) {
    body.innerHTML = `<div class="grid g-2"><div class="card"><div class="card-h"><h2 class="grow">Créer l'APK</h2><span class="badge" id="as-pistate">…</span></div><div class="card-b">
        <p>Le Pi assemble l'application dans l'APK NEXUS et la signe avec la clé du labo, <b>sans compiler</b> : quelques secondes, même sur le Raspberry Pi 4.</p>
        <button class="btn primary" id="as-build" style="width:100%;min-height:48px">${icon('rocket')}Créer l'APK de « ${esc(S.D.name)} »</button>
        <div id="as-result"></div>
        <p class="hint">Sur le téléphone : ouvre le lien ou scanne le QR, puis autorise l'installation depuis cette source. Une nouvelle version s'installe par-dessus l'ancienne (même clé, même identifiant).</p></div></div>
      <div class="card"><div class="card-h"><h2 class="grow">Mes applications sur le Pi</h2><button class="btn sm" id="as-reload">${icon('refresh')}</button></div><div class="card-b flush" id="as-apps"><div class="empty">…</div></div></div></div>`;
    $('#as-build', body).onclick = build;
    $('#as-reload', body).onclick = () => drawPublish(body);
    if (S.last) showResult(S.last);
    const st = $('#as-pistate', body), apps = $('#as-apps', body);
    if (!piReady()) { st.className = 'badge warn'; st.textContent = 'Pi non configuré'; apps.innerHTML = `<div class="empty">Renseigne l'adresse et le jeton du Pi dans <a href="#companion">Compagnon Pi</a>.</div>`; return; }
    try {
      S.status = await A.piRequest('/api/v1/appstudio');
      st.className = 'badge ' + (S.status.base.ok ? 'ok' : 'warn');
      st.textContent = S.status.base.ok ? 'Pi prêt · ' + S.status.signature : 'APK de base absente';
      if (!S.status.base.ok) {
        $('#as-result', body).innerHTML = `<div class="banner warn">${icon('alert')}<div>${esc(S.status.base.reason)}.<br>Une seule fois : construis l'APK NEXUS sur un PC (<code>scripts\\build_android.bat</code>), puis envoie-la ici. En attendant, l'<b>appli web</b> fonctionne déjà.
          <label class="btn sm" style="margin-top:8px">${icon('upload')}Envoyer app-debug.apk au Pi<input type="file" accept=".apk" id="as-base" hidden></label></div></div>`;
        $('#as-base', body).onchange = async (e) => {
          const f = e.target.files[0];
          if (!f) return;
          try {
            const r = await fetch(A.piBase() + '/api/v1/appstudio/base', { method: 'POST', headers: { Authorization: 'Bearer ' + A.piToken() }, body: f });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
            toast('APK NEXUS installée sur le Pi : le Studio APK est prêt', 'ok');
            drawPublish(body);
          } catch (err) { toast('Envoi refusé : ' + err.message, 'bad', 8000); }
        };
      }
      const list = (await A.piRequest('/api/v1/appstudio/apps')).items || [];
      apps.innerHTML = list.length ? list.map((a) => `<div class="list-item"><span class="as-ico sm" style="background:${esc(a.color)}">${esc(a.icon)}</span><div class="grow"><b>${esc(a.name)}</b><div class="small muted">v${esc(a.version)} · ${esc((a.updated || '').replace('T', ' '))}${a.last_build ? ' · APK prête' : ''}</div></div>
        <button class="btn sm" data-open="${esc(a.id)}">Ouvrir</button>${a.last_build ? `<a class="btn sm" href="${esc(A.piBase() + a.last_build.apk)}" download>${icon('download')}</a>` : ''}<a class="btn sm" href="${esc(A.piBase() + '/apps/' + a.id + '/')}" target="_blank" rel="noopener" title="Appli web">${icon('globe')}</a><button class="btn sm icon ghost" data-rm="${esc(a.id)}" aria-label="Supprimer">${icon('trash')}</button></div>`).join('') : '<div class="empty">Aucune application enregistrée sur le Pi.</div>';
      $$('[data-open]', apps).forEach((b) => (b.onclick = async () => { try { const d = await A.piRequest('/api/v1/appstudio/apps/' + b.dataset.open); delete d.last_build; replace(d, true); } catch (e) { toast(e.message, 'bad'); } }));
      $$('[data-rm]', apps).forEach((b) => (b.onclick = async () => { if (!(await A.confirmBox('Supprimer du Pi', 'La conception est supprimée ; les APK déjà installées continuent de fonctionner.', 'Supprimer', true))) return; try { await piJ(`/api/v1/appstudio/apps/${b.dataset.rm}/delete`); drawPublish(body); } catch (e) { toast(e.message, 'bad'); } }));
    } catch (e) { st.className = 'badge bad'; st.textContent = 'Pi injoignable'; apps.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }
  async function build() {
    const btn = $('#as-build', S.el);
    btn.disabled = true;
    btn.innerHTML = `${icon('refresh')}Fabrication sur le Pi…`;
    try {
      const res = await publish(S.D, true);
      S.D.id = res.id;
      S.D.version = res.version + 1;
      save();
      S.last = res;
      changed();
      showResult(res);
      toast('APK prête à installer', 'ok');
    } catch (e) {
      $('#as-result', S.el).innerHTML = `<div class="banner warn">${icon('alert')}<div><b>APK non créée.</b> ${esc(e.message)}</div></div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${icon('rocket')}Créer l'APK de « ${esc(S.D.name)} »`;
    }
  }
  async function showResult(res) {
    const box = $('#as-result', S.el);
    if (!box) return;
    box.innerHTML = `<div class="as-done"><div class="as-qr" id="as-qr"><span class="muted small">QR…</span></div><div class="grow">
      <b>${esc(res.package)}</b> · v${esc(res.version)} · ${(res.size / 1024).toFixed(0)} Ko · signature ${esc(res.signature)}
      <a class="btn primary" href="${esc(res.apk_url)}" download style="margin:8px 0;width:100%">${icon('download')}Télécharger l'APK</a>
      <div class="row"><input class="input sm mono grow" readonly value="${esc(res.apk_url)}" id="as-link"><button class="btn sm" id="as-copy">${icon('copy')}</button></div>
      <div class="small" style="margin-top:6px">Appli web (sans installer) : <a href="${esc(res.web_url)}" target="_blank" rel="noopener">${esc(res.web_url)}</a></div>
      <div class="tiny muted mono">SHA-256 ${esc(res.sha256.slice(0, 16))}…</div></div></div>`;
    $('#as-copy', box).onclick = () => { const i = $('#as-link', box); i.select(); try { navigator.clipboard.writeText(i.value); } catch (e) { document.execCommand('copy'); } toast('Lien copié', 'ok'); };
    const url = await qrUrl(res);
    const q = $('#as-qr', box);
    if (q) q.innerHTML = url ? `<img src="${url}" alt="QR de téléchargement">` : '<span class="small muted">QR indisponible (python3-qrcode absent sur le Pi)</span>';
  }

  async function loadFeeds() { try { const f = await A.api('/api/feeds'); S.feeds = Array.isArray(f) ? f : []; } catch (e) { S.feeds = []; } }

  /* ------------------------------------------------------------------ liaisons des champs */
  function bindFields(el) {
    const onEdit = (e) => {
      const t = e.target;
      if (!t.dataset || !t.dataset.p) return;
      const path = JSON.parse(t.dataset.p);
      let v = t.value;
      if (v === '__new') {
        const used = new Set(S.D.vars.map((x) => x.name));
        A.modal({ title: 'Nouvelle variable', input: ident('valeur', new Set(used)), label: 'Nom (lettres, chiffres, _)', ok: 'Créer' }).then((name) => {
          if (!name) { draw(); return; }
          const n = ident(name, used);
          S.D.vars.push({ name: n, source: 'local', type: 'number', default: 0, unit: '' });
          setP(path, n);
          changed(true);
        });
        return;
      }
      if ('num' in t.dataset) v = v === '' ? '' : Number(v);
      const last = path[path.length - 1];
      if (path[0] === 'vars' && last === 'name') { // renommer partout
        const old = getP(path);
        v = String(v).replace(/[^A-Za-z0-9_]/g, '_').slice(0, 32);
        if (!/^[A-Za-z_]/.test(v) || S.D.vars.some((x, i) => i !== path[1] && x.name === v)) { if (e.type === 'change') { toast('Nom invalide ou déjà pris', 'warn'); draw(); } return; }
        renameVar(old, v);
      }
      setP(path, v);
      if (path.length === 1 && last === 'name' && !S.D.id) { /* l'identifiant suit le nom tant qu'il n'est pas publié */ }
      const restruct = 'restruct' in t.dataset || (path[0] === 'vars' && last === 'source') || (path[0] === 'screens' && last === 'title');
      if (e.type === 'change' || !restruct) changed(restruct && e.type === 'change');
    };
    el.addEventListener('input', (e) => { if (e.target.tagName !== 'SELECT') onEdit(e); });
    el.addEventListener('change', onEdit);
    el.addEventListener('click', (e) => {
      const add = e.target.closest('[data-addact]'), del = e.target.closest('[data-delact]'), clr = e.target.closest('[data-clear]');
      if (add) { const list = getP(JSON.parse(add.dataset.addact)) || []; list.push({ a: 'notify', text: 'Bonjour' }); setP(JSON.parse(add.dataset.addact), list); changed(true); }
      if (del) { getP(JSON.parse(del.dataset.delact)).splice(Number(del.dataset.i), 1); changed(true); }
      if (clr) { setP(JSON.parse(clr.dataset.clear), ''); changed(true); }
    });
  }
  function renameVar(old, nu) {
    if (!old || old === nu) return;
    const re = new RegExp('\\{' + old + '(_ip)?\\}', 'g');
    const walk = (o) => {
      if (Array.isArray(o)) return o.forEach(walk);
      if (!o || typeof o !== 'object') return;
      Object.keys(o).forEach((k) => {
        if (typeof o[k] === 'string') { if (['var', 'var_x', 'var_y'].includes(k) && o[k] === old) o[k] = nu; else o[k] = o[k].replace(re, (m, ip) => '{' + nu + (ip || '') + '}'); } else walk(o[k]);
      });
    };
    walk(S.D.screens); walk(S.D.rules);
  }

  /* ------------------------------------------------------------------ page */
  A.page({
    id: 'apkstudio', title: 'Studio APK', short: 'APK', icon: 'phone', group: 'build', mobile: true,
    desc: 'Crée ton application Android sans coder : écrans, capteurs, blocs, lien direct',
    render(el, q) {
      if (!R) { el.innerHTML = '<div class="banner warn">Moteur d\'application absent.</div>'; return null; }
      S.el = el;
      if (!S.D) load();
      el.classList.add('as-page');
      bindFields(el);
      A.setTopActions(`<button class="btn" data-act="as-new">${icon('plus')}<span class="lbl">Nouvelle</span></button><button class="btn primary" data-act="as-publish">${icon('rocket')}<span class="lbl">Créer l'APK</span></button>`);
      draw();
      start(q);
      // nettoyage à la sortie de la page : le mode test interroge le MASTER toutes les 2 s
      return () => { if (S.inst) { S.inst.destroy(); S.inst = null; } S.el = null; };
    }
  });
  async function start(q) {
      await loadFeeds();
      if (q && q.studio) {
        const spec = store.get('apkstudio.fromStudio', null);
        if (spec) { try { S.D = fromSpec(spec, spec.title); S.sel = null; S.scr = null; fix(); save(); toast('Application préparée depuis le Studio', 'ok'); } catch (e) { toast('Projet non chargé : ' + e.message, 'warn'); } }
        history.replaceState(null, '', '#apkstudio');
      }
      if (q && q.p) {
        try {
          const p = A.projectById && A.projectById(q.p);
          let spec = p && p.spec;
          if (!spec && piReady()) { const r = await A.piRequest('/api/v1/patricia/memory'); const pp = (r.projects || []).find((x) => x.id === q.p); if (pp) spec = { title: pp.title, board: pp.board || 'esp32', modules: (pp.modules || []).map((id) => ({ id })) }; }
          if (spec) { S.D = fromSpec(spec, (p && p.title) || spec.title); S.sel = null; S.scr = null; fix(); save(); toast('Application préparée depuis le projet', 'ok'); }
        } catch (e) { toast('Projet non chargé : ' + e.message, 'warn'); }
        history.replaceState(null, '', '#apkstudio');
      }
      if (S.el) draw();
  }
  Object.assign(A.actions, {
    'as-new': () => { S.tab = 'settings'; draw(); },
    'as-publish': () => { S.tab = 'publish'; draw(); setTimeout(() => { const b = $('#as-build', S.el); if (b) b.click(); }, 50); }
  });
  A.commands.push({ title: 'Créer une application Android (Studio APK)', group: 'Action', icon: 'phone', run: () => A.go('apkstudio') });
})();
/* ---- 89_phone.js ---- */
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
  A.page({ id: 'phone', title: 'Téléphone', icon: 'phone', group: 'sys', desc: 'Travail hors ligne sur le téléphone et envoi au box', render });

  install();
  A.Phone.afterBoot = () => {
    if (offline) { setTimeout(() => toast('Mode téléphone : ton travail reste sur le téléphone et partira au box à la prochaine connexion.', 'ok', 7000), 500); return; }
    if (N && Outbox.list().length) setTimeout(() => sync(true), 2500);
  };
})();
/* ---- 90_demo.js ---- */
/* Mode démonstration : simule un MASTER complet (workers, jobs, capteurs, microSD, USB) quand l'API
 * est injoignable — aperçu hors carte, captures d'écran, formation. Aucune requête réseau. */
(function () {
  'use strict';
  const A = window.APP;
  const t0 = Date.now();
  const up = () => Date.now() - t0 + 3 * 3600e3 + 17 * 60e3;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let seq = 0, jobSeq = 0, serialBuf = '', serialTotal = 0;
  const serialAdd = (t) => { serialBuf += t; serialTotal += t.length; if (serialBuf.length > 8000) serialBuf = serialBuf.slice(-6000); };
  const events = [];
  const ev = (lv, src, msg) => { seq++; events.push({ seq, t: up(), epoch: Math.floor(Date.now() / 1000), lv, src, msg }); if (events.length > 96) events.shift(); };

  const workers = [
    { id: 1, label: 'Établi', mac: '24:6F:28:A1:10:01', ip: '192.168.4.11', state: 'READY', version: '6.0.0', job: '-', progress: 0, heap: 214000, heap_min: 188000, rssi: -48, cpu_mhz: 240, cores: 2, flash_size: 4194304, psram_size: 0, hb_count: 1830, last_result: 'SYSTEM_TEST OK : RAM 214 Ko, FS OK, Wi-Fi -48 dBm' },
    { id: 2, label: 'Serre', mac: '24:6F:28:A1:10:02', ip: '192.168.4.12', state: 'READY', version: '6.0.0', job: '-', progress: 0, heap: 198000, heap_min: 171000, rssi: -63, cpu_mhz: 240, cores: 2, flash_size: 4194304, psram_size: 0, hb_count: 1790, last_result: 'I2C_SCAN : 0x3C 0x76' },
    { id: 3, label: 'S3-bureau', mac: '34:85:18:7B:22:03', ip: '192.168.4.13', state: 'READY', version: '6.0.0', job: '-', progress: 0, heap: 318000, heap_min: 290000, rssi: -55, cpu_mhz: 240, cores: 2, flash_size: 16777216, psram_size: 8388608, hb_count: 1702, last_result: 'BENCHMARK : 1 482 000 ops/s' },
    { id: 4, label: '', mac: '24:6F:28:A1:10:04', ip: '192.168.4.14', state: 'PROJECT', version: '6.0.0', job: 'station_meteo', progress: 0, heap: 221000, heap_min: 200000, rssi: -71, cpu_mhz: 160, cores: 2, flash_size: 4194304, psram_size: 0, hb_count: 988, last_result: '' },
    { id: 5, label: 'Garage', mac: '24:6F:28:A1:10:05', ip: '192.168.4.15', state: 'OFFLINE', version: '5.2.0', job: '-', progress: 0, heap: 0, heap_min: 0, rssi: 0, cpu_mhz: 240, cores: 2, flash_size: 4194304, psram_size: 0, hb_count: 412, last_result: 'PING OK 12 ms', offSince: Date.now() - 42 * 60e3 }
  ];
  workers.forEach((w) => { w.uptime_ms = rnd(1, 6) * 3600e3; });
  const jobs = [];
  const feeds = {
    'serre/temp': { source: 'serre', key: 'temp', unit: '°C', v: 23.4, lo: 18, hi: 30, ip: '192.168.4.21' },
    'serre/hum': { source: 'serre', key: 'hum', unit: '%', v: 64, lo: 40, hi: 90, ip: '192.168.4.21' },
    'serre/sol': { source: 'serre', key: 'sol', unit: '%', v: 41, lo: 20, hi: 80, ip: '192.168.4.21' },
    'serre/lux': { source: 'serre', key: 'lux', unit: 'lx', v: 8200, lo: 50, hi: 30000, ip: '192.168.4.21' },
    'atelier/co2': { source: 'atelier', key: 'co2', unit: 'ppm', v: 760, lo: 420, hi: 1800, ip: '192.168.4.22' },
    'atelier/pm25': { source: 'atelier', key: 'pm25', unit: 'µg/m³', v: 9, lo: 1, hi: 60, ip: '192.168.4.22' },
    'atelier/courant': { source: 'atelier', key: 'courant', unit: 'A', v: 1.2, lo: 0, hi: 8, ip: '192.168.4.22' }
  };
  Object.values(feeds).forEach((f) => { f.count = 0; f.at = Date.now(); });
  const master = { temp: 22.8, humidity: 47 };
  let admin = true;

  const TREE = {
    '/sd': ['PROJECTS', 'FIRMWARE', 'REPORTS', 'LOGS', 'DATABASE', 'TESTS', 'CONFIG', 'INBOX'],
    '/sd/PROJECTS': ['LIBRARY', 'MY_PROJECTS', 'IMPORTED'],
    '/sd/PROJECTS/MY_PROJECTS': ['serre_auto', 'station_meteo'],
    '/sd/PROJECTS/MY_PROJECTS/serre_auto': [['serre_auto.ino', 6120], ['README.md', 1830], ['project.json', 612]],
    '/sd/PROJECTS/MY_PROJECTS/station_meteo': [['station_meteo.ino', 7410], ['README.md', 2104]],
    '/sd/PROJECTS/IMPORTED': [],
    '/sd/PROJECTS/LIBRARY': ['bme280', 'dht22', 'ds18b20', 'app_thermostat', 'classic_wifi_scan'],
    '/sd/FIRMWARE': [['worker_esp32.bin', 1043312], ['worker_esp32s3.bin', 1081456], ['blink_uno.hex', 2764], ['AVR', null]],
    '/sd/FIRMWARE/AVR': [['thermometre_nano.hex', 14322]],
    '/sd/REPORTS': [['rapport_2026-09-26_08h.json', 5421], ['rapport_2026-09-26_09h.json', 5398]],
    '/sd/LOGS': [['events.csv', 48211], ['jobs.csv', 12040], ['serre.csv', 18230]],
    '/sd/DATABASE': [['modules.json', 81234]],
    '/sd/TESTS': [], '/sd/CONFIG': [['lab.json', 820]], '/sd/INBOX': []
  };
  ['bme280', 'dht22', 'ds18b20', 'app_thermostat', 'classic_wifi_scan'].forEach((p) => { TREE['/sd/PROJECTS/LIBRARY/' + p] = [[p + '.ino', 4200], ['README.md', 1500], ['project.json', 400], ['MONTAGE.md', 700], ['montage.svg', 6200], ['bin', null]]; TREE['/sd/PROJECTS/LIBRARY/' + p + '/bin'] = ['esp32', 'esp32s3']; ['esp32', 'esp32s3'].forEach((b) => { TREE[`/sd/PROJECTS/LIBRARY/${p}/bin/${b}`] = [[p + '.bin', 912384], [p + '.bootloader.bin', 24992], [p + '.partitions.bin', 3072], ['boot_app0.bin', 8192], ['flash_args', 160]]; }); });
  TREE['/sd/PROJECTS'].push('ARDUINO');
  TREE['/sd/PROJECTS/ARDUINO'] = ['01_LED_Blink', '04_DHT11_Temperature_Humidite', '14_Module_Relais', '24_BME280_Meteo'];
  TREE['/sd/PROJECTS/ARDUINO'].forEach((d) => { TREE['/sd/PROJECTS/ARDUINO/' + d] = [[d + '.ino', 1488], [d + '.hex', 35138], ['MONTAGE.md', 473], ['montage.png', 35309]]; });
  TREE['/sd/FIRMWARE'].push(['worker_esp32_6.1.0.bin', 1229339]);

  /* Programmation USB simulée (aperçu) : mêmes étapes et messages que le MASTER réel. */
  let fl = { busy: false, kind: '', file: '', step: '', progress: 0, ok: null, result: '', chip: '', baud: 0, last: 0, log: [] };
  const flLog = (t) => { fl.last++; fl.log.push({ seq: fl.last, text: t }); if (fl.log.length > 64) fl.log.shift(); };
  function flashStart(b) {
    if (fl.busy) return fail(409, 'une programmation est déjà en cours');
    const esp = b.kind === 'esp';
    fl = { busy: true, kind: b.kind, file: b.path, step: '', progress: 0, ok: null, result: '', chip: '', baud: esp ? 115200 : 9600, last: 0, log: [] };
    const script = esp ? [[1, '» connexion (pont USB-série)', 'Mise en mode téléchargement (essai 1/8)…'], [3, 'Puce détectée : esp32 — firmware compilé pour esp32', 'Vitesse de transfert : 460800 bauds'], [4, '» préparation de la mémoire flash', 'Flash configurée : 4 Mo'],
      [8, 'Écriture de ' + b.path.split('/').pop().replace('.bin', '.bootloader.bin') + ' (24992 octets) à 0x01000', '  MD5 vérifié : 4f1c…'], [12, 'Écriture de boot_app0.bin (8192 octets) à 0x0E000', '» écriture de la mémoire flash'],
      [40, 'Écriture de ' + b.path.split('/').pop() + ' (912384 octets) à 0x10000', null], [70, null, null], [92, '  MD5 vérifié : 9a3e…', '» redémarrage de la carte']]
      : [[2, '» reset de la carte et synchronisation', 'Profil : ' + (b.profile || 'ATmega328P_Optiboot')], [5, '» écriture de la mémoire flash', null], [40, null, null], [70, '» vérification (relecture)', null], [95, null, null]];
    let i = 0;
    flLog((esp ? 'Programmation ESP32 : 4 fichier(s), 948640 octets' : 'Programmation Arduino : ' + b.path));
    const t = setInterval(() => {
      if (i < script.length) { const [p, a, c] = script[i++]; fl.progress = p; if (a) { flLog(a); if (a.startsWith('»')) fl.step = a.slice(2); } if (c) flLog(c); if (esp && p === 3) fl.chip = 'esp32'; return; }
      clearInterval(t);
      fl.busy = false; fl.ok = true; fl.progress = 100; fl.step = 'terminé';
      fl.result = esp ? 'firmware écrit et vérifié (MD5) sur esp32 — moniteur à 115200 bauds' : '35138 octets programmés et vérifiés (signature 1E950F) — moniteur réglé à 9600 bauds';
      flLog('✔ ' + fl.result);
      serialAdd(esp ? '\nets Jun  8 2016 00:22:57\nrst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)\n# ESP32 LAB — ' + b.path.split('/').pop() + '\n' : '\n[24] BME280 pret\nTemperature: 22.8 C  Humidite: 47.1 %  Pression: 1013.2 hPa\n');
      ev('S', 'usb', 'flash ' + b.kind + ' : ' + fl.result);
    }, 700);
    return ok({ ok: true });
  }
  const wlog = [];
  let wlogSeq = 0;
  setInterval(() => { const on = workers.filter((w) => w.state !== 'OFFLINE'); const w = on[Math.floor(Math.random() * on.length)]; if (!w) return; wlogSeq++; wlog.push({ seq: wlogSeq, id: w.id, t: Date.now(), text: ['PONG', 'JOB START SYSTEM_TEST', 'CPU=PASS FLASH=PASS WIFI=PASS FS=PASS HEAP=' + w.heap, 'I2C 0x3C 0x76', 'heartbeat ok rssi=' + w.rssi][wlogSeq % 5] }); if (wlog.length > 160) wlog.shift(); }, 1500);
  const gpioPins = [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39];
  const gpioAdc = [32, 33, 34, 35, 36, 39, 25, 26, 27, 12, 13, 14, 15, 2, 4];
  const gpioState = {};
  const listDir = (path) => {
    const items = TREE[path];
    if (!items) return null;
    return items.map((it) => (typeof it === 'string' ? { name: it, type: 'd', size: 0, mtime: 1790000000 } : it[1] == null ? { name: it[0], type: 'd', size: 0, mtime: 1790000000 } : { name: it[0], type: 'f', size: it[1], mtime: Math.floor(Date.now() / 1000) - Math.floor(rnd(60, 86400 * 6)) }));
  };

  function step() {
    const now = Date.now();
    master.temp = +(22.8 + Math.sin(now / 90000) * 0.8 + rnd(-0.1, 0.1)).toFixed(1);
    master.humidity = +(47 + Math.cos(now / 120000) * 3 + rnd(-0.4, 0.4)).toFixed(1);
    Object.values(feeds).forEach((f) => {
      const span = f.hi - f.lo;
      f.v = Math.min(f.hi, Math.max(f.lo, f.v + rnd(-0.02, 0.02) * span + (f.key === 'co2' ? Math.sin(now / 50000) * 6 : 0)));
      f.count++; f.at = now - rnd(0, 1500);
    });
    workers.forEach((w) => {
      if (w.state === 'OFFLINE') return;
      w.uptime_ms += 2000; w.hb_count++;
      w.heap = Math.round(w.heap + rnd(-1500, 1500)); w.rssi = Math.round(Math.max(-85, Math.min(-40, w.rssi + rnd(-1.5, 1.5))));
    });
    // progression des jobs
    jobs.forEach((j) => {
      if (j.status === 'QUEUED') {
        const w = workers.find((x) => x.state === 'READY' && (!j.target_worker || x.id === j.target_worker));
        if (w) { j.status = 'RUNNING'; j.worker = w.id; j.started_ms = up(); w.state = 'BUSY'; w.job = j.type; w.progress = 0; ev('I', 'jobs', `job #${j.id} ${j.type} → worker ${w.id}`); }
      } else if (j.status === 'RUNNING') {
        const w = workers.find((x) => x.id === j.worker);
        j.progress = Math.min(100, j.progress + Math.round(rnd(12, 35)));
        if (w) w.progress = j.progress;
        if (j.progress >= 100) {
          const fail = j.type === 'FS_TEST' && Math.random() < 0.3;
          j.status = fail ? 'FAILED' : 'SUCCESS'; j.finished_ms = up();
          j.result = fail ? 'FS_TEST : relecture différente à l\'octet 4096' : RESULTS[j.type](w);
          if (w) { w.state = 'READY'; w.job = '-'; w.progress = 0; w.last_result = j.result; }
          ev(fail ? 'W' : 'S', 'jobs', `job #${j.id} ${j.type} ${fail ? 'échoué' : 'réussi'} (worker ${j.worker})`);
        }
      }
    });
    if (Math.random() < 0.12) ev('I', ['wifi', 'telemetry', 'web', 'workers'][Math.floor(rnd(0, 4))], ['client Wi-Fi connecté', 'mesures serre reçues', 'session WebSocket ouverte', 'battement worker 3'][Math.floor(rnd(0, 4))]);
    // moniteur série simulé
    if (Math.random() < 0.8) serialAdd(`T=${(21 + rnd(0, 2)).toFixed(2)} C  H=${(45 + rnd(0, 4)).toFixed(1)} %  lux=${Math.round(rnd(300, 330))}\n`);
  }
  const RESULTS = {
    PING: () => `PING OK ${Math.round(rnd(4, 18))} ms`,
    SYSTEM_TEST: (w) => `SYSTEM_TEST OK : RAM ${Math.round((w ? w.heap : 200000) / 1024)} Ko, FS OK, Wi-Fi ${w ? w.rssi : -60} dBm`,
    BENCHMARK: (w) => `BENCHMARK : ${Math.round((w && w.cpu_mhz === 160 ? 980 : 1450) * rnd(0.97, 1.03))} 000 ops/s`,
    FS_TEST: () => 'FS_TEST OK : 8192 octets écrits et relus',
    MEM_TEST: () => 'MEM_TEST OK : 96 Ko testés, 0 erreur',
    I2C_SCAN: () => ['I2C_SCAN : 0x3C 0x76', 'I2C_SCAN : aucun périphérique', 'I2C_SCAN : 0x23 0x68'][Math.floor(rnd(0, 3))],
    WIFI_SCAN: () => `WIFI_SCAN : ${Math.round(rnd(4, 12))} réseaux`,
    IDENTIFY: () => 'IDENTIFY : LED clignotée 5 s',
    ADC_READ: () => `ADC mV N=6 32:${Math.round(rnd(1640, 1660))} 33:${Math.round(rnd(0, 12))} 34:${Math.round(rnd(3280, 3310))} 35:${Math.round(rnd(140, 900))} 36:0 39:0`,
    GPIO_TEST: () => ['GPIO_TEST PINS=17 FREE=15 GND=0 3V3=2 | 3V3: 21 22', 'GPIO_TEST PINS=17 FREE=17 GND=0 3V3=0', 'GPIO_TEST PINS=17 FREE=14 GND=1 3V3=2 | GND: 15 | 3V3: 21 22'][Math.floor(rnd(0, 3))],
    PWM_GEN: () => 'PWM GPIO=13 FREQ=1000Hz REAL=1000Hz DUTY=50% MS=10000',
    SERVO_SWEEP: () => 'SERVO GPIO=27 SWEEP=0-180-0 STEP=5deg PULSE=500-2500us',
    TONE_TEST: () => 'TONE GPIO=14 SWEEP=200-4000Hz STEPS=20',
    ONEWIRE_SCAN: () => ['ONEWIRE GPIO=32 FOUND=0', `ONEWIRE GPIO=32 FOUND=2 : 28FF641E8316034B=${rnd(20, 23).toFixed(1)}C 28AA1B3C05000012=${rnd(18, 21).toFixed(1)}C`][Math.floor(rnd(0, 2))],
    LOGIC_SAMPLE: () => `LOGIC RATE=20000Hz MS=1000 33:${Math.round(rnd(995, 1005))}Hz/50% 34:L 35:H 36:${Math.round(rnd(48, 52))}Hz/12%`,
    CHECKUP: () => 'SYSTEM_TEST OK'
  };

  function state() {
    const q = jobs.filter((j) => j.status === 'QUEUED').length, r = jobs.filter((j) => j.status === 'RUNNING').length;
    return {
      master: {
        version: '6.0.0', hostname: 'esp32-lab', ap_ssid: 'ESP32-LAB', ap_ip: '192.168.4.1', sta_ip: '192.168.1.42', internet: true, sta_rssi: -58, ap_clients: 6, time_synced: true,
        epoch: Math.floor(Date.now() / 1000), sd: true, usb_avr: true, led: 'ok', heap: Math.round(8120000 + rnd(-20000, 20000)), heap_min: 7950000, heap_internal: Math.round(186000 + Math.sin(Date.now() / 36000) * 5200 + rnd(-900, 900)),
        psram: 7930000, psram_total: 8388608, cpu_mhz: 240, uptime_ms: up(), temp: master.temp, humidity: master.humidity
      },
      jobs: { queued: q, running: r, success: jobs.filter((j) => j.status === 'SUCCESS').length + 41, failed: jobs.filter((j) => j.status === 'FAILED').length + 2 },
      worker_capacity: 10,
      workers: workers.map((w) => Object.assign(clone(w), { age_ms: w.state === 'OFFLINE' ? Date.now() - w.offSince : Math.round(rnd(100, 1900)) })),
      feeds: Object.values(feeds).map((f) => ({ source: f.source, key: f.key, value: +f.v.toFixed(f.v < 10 ? 2 : 1), unit: f.unit, ip: f.ip, age_ms: Date.now() - f.at, count: f.count })),
      event_seq: seq,
      events: [],
      netmon: nmState()
    };
  }
  const ok = (x) => Promise.resolve(x);
  const fail = (status, msg) => { const e = new Error(msg); e.status = status; return Promise.reject(e); };
  const body = (opts) => {
    if (!opts.body) return {};
    if (typeof opts.body === 'string') { try { return JSON.parse(opts.body); } catch (e) { const o = {}; new URLSearchParams(opts.body).forEach((v, k) => { o[k] = v; }); return o; } }
    return {};
  };
  function newJob(type, target, pr) {
    const id = ++jobSeq;
    jobs.push({ id, type, priority: Number(pr) || 50, worker: 0, target_worker: Number(target) || 0, retries: 0, status: 'QUEUED', progress: 0, result: '', created_ms: up(), started_ms: 0, finished_ms: 0 });
    if (jobs.length > 32) jobs.splice(0, jobs.length - 32);
    return id;
  }

  /* Banc fantôme simulé : le plan est rejoué sur une simulation du code généré (LAB.benchSim). */
  let bench = { running: false };
  function benchStart(b) {
    const ctx = Demo.benchContext;
    if (!ctx || !window.LAB.benchSim) return fail(400, 'plan de banc absent');
    if (bench.running) return fail(409, 'un banc est déjà en cours');
    const dut = workers.find((w) => w.id === Number(b.dut)), emu = workers.find((w) => w.id === Number(b.emu));
    if (!dut || !emu || dut === emu || dut.state !== 'READY' || emu.state !== 'READY') return fail(409, 'choisissez deux workers prêts');
    const plan = ctx.plan, sim = window.LAB.benchSim(plan, ctx.spec);
    const faultCh = ctx.fault ? plan.channels.find((c) => c.dir === 'out') : null;
    const fault = faultCh ? { fault: { n: faultCh.n, value: faultCh.kind === 'level' ? { level: 0 } : { duty: 0 } } } : null;
    const project = (b.plan && b.plan.project) || plan.title;
    bench = { running: true, project, bin: b.bin, dut: dut.id, emu: emu.id, steps: plan.steps.length, step: -1, passed: 0, failed: 0, phase: 'chargement du DUT', results: [], t0: Date.now() };
    emu.state = 'EMULATING'; emu.job = 'BENCH';
    dut.state = 'FLASHING'; dut.job = 'PROJET';
    ev('I', 'bench', `banc fantôme « ${project} » : DUT W${dut.id}, émulateur W${emu.id}`);
    let i = -1;
    const finish = (err) => {
      bench.running = false;
      bench.phase = 'terminé';
      bench.error = err || '';
      bench.verdict = err ? (bench.stop ? 'arrêté' : 'erreur') : bench.failed ? 'échec' : 'réussi';
      bench.report = `/sd/REPORTS/BENCH/${String(project).toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_demo.json`;
      bench.duration_ms = Date.now() - bench.t0;
      emu.state = 'READY'; emu.job = '-';
      dut.state = 'READY'; dut.job = '-';
      ev(bench.verdict === 'réussi' ? 'S' : 'W', 'bench', `Banc fantôme « ${project} » : ${bench.verdict} (${bench.passed} étape(s) réussie(s), ${bench.failed} en échec)`);
    };
    const tick = () => {
      if (!bench.running) return;
      if (i < 0) { dut.state = 'PROJECT'; dut.job = project; bench.phase = 'scénario'; }
      i++;
      if (bench.stop) { finish('arrêt demandé'); return; }
      if (i >= plan.steps.length) { finish(); return; }
      const s = plan.steps[i];
      const res = sim.step(s, fault);
      const obs = {}, feeds = {};
      Object.keys(res).forEach((k) => { if (k.startsWith('feed:')) feeds[k.slice(5)] = res[k]; else obs[k] = res[k]; });
      const checks = window.LAB.benchCheck(s, obs, feeds).map((c) => {
        const e = c.expect;
        if (e.feed) return { feed: e.feed, want: e.absent ? 'absente' : e.v, tol: e.tol, got: c.got, ok: c.ok, age_ms: 800 };
        return { n: e.n, what: e.level !== undefined ? 'niveau' : 'rapport cyclique', want: e.level !== undefined ? e.level : e.duty, tol: e.tol, got: c.got, ok: c.ok };
      });
      const okStep = checks.every((c) => c.ok);
      bench.results.push({ i, label: s.label, ok: okStep, checks });
      if (okStep) bench.passed++; else bench.failed++;
      bench.step = i;
      bench.label = s.label;
      setTimeout(tick, 900);
    };
    setTimeout(tick, 1500);
    return ok({ ok: true });
  }

  /* Wireshark du Labo simulé : anneau de trames synthétiques + métriques par worker. */
  let nm = { armed: false, seq: 0, frames: [], metric: {} };
  function nmPush(dir, proto, worker, ip, len, summary) {
    if (!nm.armed) return;
    nm.seq++;
    nm.frames.push({ seq: nm.seq, ts: Date.now(), dir, proto, worker, ip, len, summary });
    if (nm.frames.length > 128) nm.frames.shift();
  }
  function nmStep() {
    if (!nm.armed) return;
    const on = workers.filter((w) => w.state !== 'OFFLINE');
    on.forEach((w) => {
      const jitter = w.rssi < -70 ? 40 + Math.random() * 220 : Math.random() * 40;
      const m = (nm.metric[w.id] = nm.metric[w.id] || { rx: 0, loss: 0, jitter_ms: 0 });
      m.rx++; m.jitter_ms = m.jitter_ms * 0.8 + jitter * 0.2;
      if (w.rssi < -74 && Math.random() < 0.15) { m.loss++; return; }   // battement « perdu »
      nmPush('rx', 'HB', w.id, w.ip, 60, `état ${w.state} prog ${w.progress || 0} RAM ${Math.round(w.heap / 1024)}k`);
    });
    Object.values(feeds).forEach((f) => { if (Math.random() < 0.4) nmPush('rx', 'LAB', 0, f.ip, 24, `${f.source} ${f.key}=${f.v.toFixed(2)}${f.unit}`); });
    if (Math.random() < 0.1) { const w = on[Math.floor(Math.random() * on.length)]; if (w) nmPush('tx', 'HTTP', w.id, w.ip, 0, 'POST /api/job'); }
    if (Math.random() < 0.05) nmPush('tx', 'DISCOVER', 0, '192.168.4.255', 24, 'DISCOVER|ESP32-LAB|6.0.0');
  }
  setInterval(nmStep, 1000);
  function nmState() {
    let worst = 0; Object.values(nm.metric).forEach((m) => { if (m.jitter_ms > worst) worst = m.jitter_ms; });
    return { armed: nm.armed, total: nm.seq, worst_jitter: Math.round(worst) };
  }

  const Demo = {
    start() {
      ev('S', 'system', 'ESP32 LAB 6.0.0 démarré (démonstration)');
      ev('I', 'wifi', 'point d\'accès ESP32-LAB actif, canal 6');
      ev('I', 'storage', 'microSD 29,7 Go montée (FAT32)');
      ev('S', 'workers', 'worker 1 « Établi » en ligne');
      ev('S', 'workers', 'worker 2 « Serre » en ligne');
      ev('S', 'workers', 'worker 3 « S3-bureau » en ligne');
      ev('W', 'workers', 'worker 5 « Garage » hors ligne');
      ev('I', 'usb', 'carte CH340 détectée (1A86:7523)');
      ['SYSTEM_TEST', 'BENCHMARK', 'I2C_SCAN'].forEach((t, i) => newJob(t, i + 1));
      for (let i = 0; i < 40; i++) step();
      // historique simulé des 10 dernières minutes, pour des courbes parlantes dès l'ouverture
      const H = A.S.hist, now = Date.now();
      for (let i = 150; i > 0; i--) {
        const t = now - i * 4000;
        H.t.push(t); H.heap.push(Math.round(186000 + Math.sin(i / 9) * 5200 + rnd(-900, 900)));
        H.temp.push(+(22.8 + Math.sin(t / 90000) * 0.8).toFixed(1)); H.hum.push(+(47 + Math.cos(t / 120000) * 3).toFixed(1));
        H.workers.push(i > 110 ? 5 : 4); H.rssi.push(-58);
        Object.values(feeds).forEach((f) => { const k = f.source + '/' + f.key, span = f.hi - f.lo; (A.S.feedHist[k] = A.S.feedHist[k] || []).push([t, +(f.v + Math.sin(i / 11 + span) * span * 0.04).toFixed(2), -i]); });
      }
      A.refreshState();
      setInterval(() => { step(); A.refreshState(); }, 2000);
    },
    handle(path, opts) {
      opts = opts || {};
      const method = (opts.method || 'GET').toUpperCase();
      const url = new URL(path, 'http://demo.local');
      const p = url.pathname, q = (k) => url.searchParams.get(k), b = body(opts);
      if (p === '/api/session') return ok({ admin, version: '6.0.0' });
      if (p === '/api/feeds') return ok(state().feeds);
      if (p === '/api/link') { const h = Array.from({ length: 60 }, (_, i) => (i === 41 ? -1 : Math.round(rnd(9, 26) + (i % 17 === 0 ? 30 : 0)))); const okv = h.filter((v) => v >= 0); return ok({ pi: '192.168.4.2:8088', ok: true, rtt_ms: Math.round(okv.reduce((a, b) => a + b, 0) / okv.length), loss_pct: 2, min_ms: Math.min(...okv), max_ms: Math.max(...okv), jitter_ms: 5, samples: h.length, sent: 1420, lost: 3, period_s: 20, hello_age_s: 12, last_ok_age_s: 4, history: h }); }
      if (p === '/api/state') { const s = state(); s.events = events.filter((e) => e.seq > (A.S.lastSeq || 0)); return ok(s); }
      if (p === '/api/events') { const since = Number(q('since') || 0); return ok({ last: seq, events: events.filter((e) => e.seq > since) }); }
      if (p === '/api/logout') { admin = false; return ok({ ok: true }); }
      if (p === '/api/selftest') return ok({ ok: true, checks: [['Mémoire vive', true, '187 412 octets libres'], ['Fragmentation', true, 'plus grand bloc 110 592 octets'], ['PSRAM', true, '8192 Ko'], ['microSD', true, 'montée'], ['Internet (STA)', true, '192.168.1.42'], ['Heure (NTP)', true, 'synchronisée'], ['Capteur DHT', true, 'mesure valide'], ['Workers', true, '4 en ligne / 10'], ['Portail captif', true, 'actif'], ['USB hôte', true, 'carte connectée']].map(([name, o, detail]) => ({ name, ok: o, detail })) });
      if (p === '/api/system/info') return ok({ version: '6.0.0', codename: 'NEXUS', idf: 'v6.1', target: 'esp32s3', chip_revision: 2, cores: 2, flash_size: 16777216, psram_total: 8388608, ap_mac: 'DC:DA:0C:21:5E:F1', reset_reason: 'mise sous tension', board_variant: 'YD-ESP32-S3 N16R8', worker_capacity: 10, job_capacity: 32, captive_portal: true, uptime_ms: up(), sd_total: 31902400512, sd_free: 31211069440, ota: { running: 'ota_0', next: 'ota_1', slot_size: 4194304, app_version: '6.0.0', build_date: 'Sep 26 2026', build_time: '10:12:44', idf: 'v6.1', update_available: false, busy: false }, usb: { host: true, connected: true, chip: 'CH340', vid_pid: '1A86:7523', baud: 115200, flashing: false, rx_total: 18234 } });
      if (p === '/api/jobs') return ok(clone(jobs));
      if (p === '/api/job' && method === 'POST') { const id = newJob(String(b.type).toUpperCase(), b.worker, b.priority); return ok({ accepted: true, id, target_worker: Number(b.worker) || 0 }); }
      if (p === '/api/job/cancel') { const j = jobs.find((x) => x.id === Number(b.id)); if (j && (j.status === 'QUEUED' || j.status === 'RUNNING')) { const w = workers.find((x) => x.id === j.worker); if (w) { w.state = 'READY'; w.job = '-'; } j.status = 'CANCELLED'; return ok({ ok: true }); } return ok({ ok: false, error: 'job introuvable ou terminé' }); }
      if (p === '/api/jobs/cancel-all') { let n = 0; jobs.forEach((j) => { if (j.status === 'QUEUED' || j.status === 'RUNNING') { j.status = 'CANCELLED'; n++; } }); workers.forEach((w) => { if (w.state === 'BUSY') { w.state = 'READY'; w.job = '-'; } }); return ok({ ok: true, cancelled: n }); }
      if (p === '/api/jobs/clear') { const before = jobs.length; for (let i = jobs.length - 1; i >= 0; i--) if (!['QUEUED', 'RUNNING'].includes(jobs[i].status)) jobs.splice(i, 1); return ok({ ok: true, cleared: before - jobs.length }); }
      if (p.startsWith('/api/fleet/')) {
        const type = p === '/api/fleet/ping' ? 'PING' : p === '/api/fleet/benchmark' ? 'BENCHMARK' : String(b.type || '').toUpperCase();
        const on = workers.filter((w) => w.state !== 'OFFLINE' && w.state !== 'PROJECT');
        if (p === '/api/fleet/reboot') { on.forEach((w) => { w.uptime_ms = 0; }); ev('W', 'workers', `redémarrage de ${on.length} worker(s)`); return ok({ ok: true, accepted: on.length }); }
        on.forEach((w) => newJob(type, w.id, 60));
        return ok({ ok: true, type, accepted: on.length });
      }
      if (p === '/api/worker/discover') { ev('I', 'workers', 'découverte envoyée (broadcast 192.168.4.255:4211)'); return ok({ ok: true }); }
      if (p === '/api/worker/info') { const w = workers.find((x) => x.id === Number(q('id'))); if (!w || w.state === 'OFFLINE') return fail(503, 'worker injoignable'); return ok({ id: w.id, name: w.label || 'worker', fw: w.version, protocol: 3, chip: w.psram_size ? 'ESP32-S3' : 'ESP32', cores: w.cores, cpu_mhz: w.cpu_mhz, heap: w.heap, heap_min: w.heap_min, flash_size: w.flash_size, psram: w.psram_size, rssi: w.rssi, ip: w.ip, mac: w.mac, uptime_ms: w.uptime_ms, jobs_done: w.hb_count % 97, fs: { total: 1441792, used: 24576 }, i2c: { sda: 21, scl: 22 } }); }
      if (p === '/api/worker/scan') return ok({ state: 'done', networks: [['ESP32-LAB', -38, 6, 'WPA2'], ['Livebox-7A2C', -61, 1, 'WPA2'], ['Freebox-5E1B', -70, 11, 'WPA3'], ['iPhone de Léa', -76, 6, 'WPA2'], ['SFR_5A10', -81, 1, 'WPA2'], ['DIRECT-HP-Imprimante', -84, 11, 'WPA2']].map(([ssid, rssi, channel, auth]) => ({ ssid, rssi: rssi + Math.round(rnd(-3, 3)), channel, auth, bssid: 'AA:BB:CC:' + channel.toString(16).padStart(2, '0') + ':10:2F' })) });
      if (p === '/api/worker/label') { const w = workers.find((x) => x.id === Number(b.id)); if (w) w.label = b.label; return ok({ ok: true }); }
      if (p === '/api/worker/forget') { const i = workers.findIndex((x) => x.id === Number(b.id)); if (i >= 0 && workers[i].state !== 'OFFLINE') return fail(409, 'le worker est en ligne'); if (i >= 0) workers.splice(i, 1); return ok({ ok: true }); }
      if (p === '/api/worker/reboot') { const w = workers.find((x) => x.id === Number(b.id)); if (w) w.uptime_ms = 0; return ok({ ok: true }); }
      if (p === '/api/worker/home') { const w = workers.find((x) => x.id === Number(b.id)); if (w) { w.state = 'READY'; w.job = '-'; } return ok({ ok: true }); }
      if (p === '/api/worker/flash/remote') {   // démo : le worker « redémarre » sur le projet et écrit des mesures
        const w = workers.find((x) => x.id === Number(b.id));
        if (w) { w.state = 'FLASHING'; w.progress = 0; setTimeout(() => { w.state = 'PROJECT'; w.job = 'projet'; }, 2500); }
        let n = 0;
        const tick = setInterval(() => { if (++n > 14) return clearInterval(tick); wlogSeq++; wlog.push({ seq: wlogSeq, id: Number(b.id), t: Date.now(), text: n === 1 ? '# ESP32 LAB — projet chargé depuis le MASTER' : `dht22_temp:${(22 + Math.random()).toFixed(2)}\tdht22_hum:${(48 + Math.random() * 3).toFixed(2)}` }); }, 1500);
        ev('I', 'ota', `worker ${b.id} : OTA distante ${String(b.url).slice(0, 60)}`); return ok({ ok: true });
      }
      if (p === '/api/worker/flash') { if (b.mode === 'project') { const w = workers.find((x) => x.id === Number(b.id)); if (w) { w.state = 'PROJECT'; w.job = String(b.path).split('/').pop().replace(/\.ino\.bin$|\.bin$/i, ''); } } ev('I', 'ota', `worker ${b.id} : mise à jour ${b.path}`); return ok({ ok: true }); }
      if (p === '/api/sd/list') { const path = q('path') || '/sd'; const items = listDir(path); if (!items) return fail(404, 'dossier introuvable'); return ok({ path, admin, items, total: 31902400512, free: 31211069440 }); }
      if (p === '/api/sd/delete' || p === '/api/sd/rename' || p === '/api/sd/mkdir') {
        const dir = String(b.path).replace(/\/[^/]+$/, ''), name = String(b.path).split('/').pop();
        const list = TREE[dir];
        if (list) {
          const idx = list.findIndex((it) => (typeof it === 'string' ? it : it[0]) === name);
          if (p.endsWith('delete') && idx >= 0) list.splice(idx, 1);
          if (p.endsWith('rename') && idx >= 0) { const nn = String(b.to).split('/').pop(); if (typeof list[idx] === 'string') list[idx] = nn; else list[idx][0] = nn; }
          if (p.endsWith('mkdir')) { list.push(name); TREE[b.path] = []; }
        }
        return ok({ ok: true });
      }
      if (p === '/api/usb/serial' && method === 'GET') {
        const since = Number(q('since') || 0), keep = serialTotal - serialBuf.length;
        const data = since <= keep ? serialBuf.slice(-2000) : serialBuf.slice(serialBuf.length - (serialTotal - since));
        return ok({ pos: serialTotal, data, usb: { host: true, connected: true, chip: 'CH340', vid_pid: '1A86:7523', baud: fl.baud || 115200, flashing: fl.busy, rx_total: 18234 + serialTotal } });
      }
      if (p === '/api/usb/serial') { if (b.baud) fl.baud = Number(b.baud); if (b.data) serialAdd('> ' + b.data.replace(/\r?\n$/, '') + '\nOK\n'); return ok({ ok: true }); }
      if (p === '/api/avr/flash') return new Promise((res) => setTimeout(() => res({ ok: true, message: `${String(b.path).split('/').pop()} : 14 322 octets écrits et vérifiés (${b.profile})` }), 1800));
      if (p === '/api/agent/chat') { const qq = String(b.q || '').toLowerCase(); const st = state(); const acts = []; if (/check|benchmark|ping|scan i2c|identifie|voltm|tensions|test gpio|1-wire|onewire|ds18b20|analyseur logique/.test(qq)) { const t = /check/.test(qq) ? 'SYSTEM_TEST' : /benchmark/.test(qq) ? 'BENCHMARK' : /ping/.test(qq) ? 'PING' : /i2c/.test(qq) ? 'I2C_SCAN' : /identifie/.test(qq) ? 'IDENTIFY' : /voltm|tensions/.test(qq) ? 'ADC_READ' : /gpio/.test(qq) ? 'GPIO_TEST' : /1-wire|onewire|ds18b20/.test(qq) ? 'ONEWIRE_SCAN' : /analyseur logique/.test(qq) ? 'LOGIC_SAMPLE' : 'SYSTEM_TEST'; workers.filter((w) => w.state === 'READY').forEach((w) => newJob(t, w.id, 60)); acts.push(`${t} lancé sur 4 worker(s)`); } return ok({ answer: `ESP32 LAB 6.0.0 : ${st.workers.filter((w) => w.state !== 'OFFLINE').length}/10 workers en ligne, jobs en file ${st.jobs.queued}, en cours ${st.jobs.running} ; microSD OK ; Internet connecté ; ambiance ${master.temp} °C.`, mode: 'local', actions: acts }); }
      if (p === '/api/admin/config' && method === 'GET') return ok({ ok: true, ap_ssid: 'ESP32-LAB', ap_channel: 6, sta_ssid: 'Livebox-7A2C', hostname: 'esp32-lab', whatsapp_phone: '', webhook_url: '', ai_endpoint: '', ai_model: 'gpt-4o-mini', search_endpoint: '', update_manifest: '', github_repo: 'Prince223889/ESP32-box', ntp_server: 'pool.ntp.org', timezone: 'CET-1CEST,M3.5.0,M10.5.0/3', control_path: '/x-control-3f9a1c2e', board_variant: 'YD-ESP32-S3 N16R8', rgb_gpio: 48, dht_gpio: 4, dht_type: 11, auto_updates: false, captive_portal: true, sta_pass_set: true, whatsapp_configured: false, ai_key_set: false });
      if (p === '/api/admin/config') return ok({ ok: true, restart: false });
      if (p === '/api/update/check') return ok({ available: true, source: 'github', repo: 'Prince223889/ESP32-box', version: '6.2.0', notes: 'Démonstration : nouvelle Release GitHub.\n- Wireshark du Labo\n- Flash ESP32 par câble', assets: 'worker_esp32.bin|https://github.com/Prince223889/ESP32-box/releases/download/v6.2.0/worker_esp32.bin;worker_esp32s3.bin|https://github.com/Prince223889/ESP32-box/releases/download/v6.2.0/worker_esp32s3.bin' });
      if (p === '/api/wifi/scan' && method === 'POST') return ok({ ok: true });
      if (p === '/api/wifi/scan') return Demo.handle('/api/worker/scan?id=1');
      if (p === '/api/report/snapshot') return ok({ ok: true, path: '/sd/REPORTS/rapport_demo.json' });
      if (p === '/api/notify/test') return ok({ ok: false, reason: 'aucun canal configuré' });
      if (p === '/api/system/reboot') return ok({ ok: false, reason: 'désactivé en démonstration' });
      if (p === '/api/system/identify') return ok({ ok: true });
      if (p === '/api/update/approve') return ok({ ok: true, version: '6.2.0' });
      if (p === '/api/projects') return ok([]);
      if (p === '/api/netmon' && method === 'GET') {
        const since = Number(q('since') || 0);
        return ok({ armed: nm.armed, last: nm.seq,
          frames: nm.frames.filter((f) => f.seq > since).map((f) => ({ seq: f.seq, age_ms: Date.now() - f.ts, dir: f.dir, proto: f.proto, worker: f.worker || undefined, ip: f.ip, len: f.len, summary: f.summary })),
          metrics: Object.entries(nm.metric).map(([id, m]) => ({ worker: Number(id), jitter_ms: Math.round(m.jitter_ms), loss: m.loss, rx: m.rx, last_ms: 500 })) });
      }
      if (p === '/api/netmon/arm') { nm.armed = !!b.on; if (!nm.armed) { nm.frames = []; nm.metric = {}; nm.seq = 0; } return ok({ ok: true, armed: nm.armed }); }
      if (p === '/api/usb/flash') return flashStart(b);
      if (p === '/api/usb/flash/status') { const since = Number(q('since') || 0); return ok(Object.assign(clone(fl), { log: fl.log.filter((l) => l.seq > since), usb: { host: true, connected: true, chip: 'CP210x', vid_pid: '10C4:EA60', baud: fl.baud || 115200, flashing: fl.busy, rx_total: 18234 + serialTotal } })); }
      if (p === '/api/worker/log') { const id = Number(q('id') || 0), since = Number(q('since') || 0); return ok({ last: wlogSeq, lines: wlog.filter((l) => l.seq > since && (!id || l.id === id)).map((l) => ({ seq: l.seq, id: l.id, age_ms: Date.now() - l.t, text: l.text })) }); }
      if (p === '/api/worker/gpio' && method === 'GET') {
        if (!q('pin')) return ok({ chip: 'ESP32-D0WD-V3', pins: gpioPins.map((x) => ({ pin: x, adc: gpioAdc.includes(x) })) });
        const pin = Number(q('pin')), st = gpioState[pin] || { level: 0 };
        return ok({ pin, level: st.level, mv: gpioAdc.includes(pin) ? Math.round((st.level ? 3100 : 0) + (st.duty != null ? st.duty * 31 : 0) + rnd(0, 180)) : undefined, pwm: st.duty != null });
      }
      if (p === '/api/worker/gpio') { const pin = Number(b.pin); const st = (gpioState[pin] = gpioState[pin] || { level: 0 }); if (b.mode === 'out') { st.level = Number(b.value) ? 1 : 0; delete st.duty; } else if (b.mode === 'pwm') { st.duty = Number(b.duty); st.level = st.duty > 50 ? 1 : 0; } else if (b.mode === 'in_pullup') { st.level = 1; delete st.duty; } else { st.level = 0; delete st.duty; } wlogSeq++; wlog.push({ seq: wlogSeq, id: Number(b.id), t: Date.now(), text: `GPIO${pin} -> ${b.mode}` }); return ok({ pin, level: st.level, pwm: st.duty != null }); }
      if (p === '/api/bench/run') return benchStart(b);
      if (p === '/api/bench/status') return ok(clone(bench));
      if (p === '/api/bench/stop') { bench.stop = true; return ok({ ok: true }); }
      return fail(404, 'route inconnue (démo) : ' + p);
    },
    upload(url, file, headers, onProgress) {
      return new Promise((res) => {
        let p = 0;
        const t = setInterval(() => {
          p = Math.min(1, p + 0.25);
          if (onProgress) onProgress(p);
          if (p >= 1) {
            clearInterval(t);
            if (url === '/api/sd/upload') { const path = decodeURIComponent(headers['X-Path']); const dir = path.replace(/\/[^/]+$/, ''); (TREE[dir] = TREE[dir] || []).push([path.split('/').pop(), file.size || 0]); }
            res({ ok: true, path: '', sha256: '', message: 'démonstration : fichier non écrit' });
          }
        }, 150);
      });
    },
    fileText(path) {
      const name = path.split('/').pop();
      if (name === 'MONTAGE.md') return '# BME280 Station météo\n\nLit température, humidité et pression d\'un BME280 en I2C.\n\n| Arduino | Composant | Couleur fil |\n|---|---|---|\n| 3.3V | BME280 VCC | red |\n| GND | BME280 GND | black |\n| A4 | BME280 SDA | blue |\n| A5 | BME280 SCL | green |\n\nMoniteur série : 9600 bauds. Toujours câbler **carte débranchée**.';
      if (/\.csv$/i.test(name)) { const L = ['horodatage;temp;hum;sol']; for (let i = 0; i < 200; i++) L.push(`2026-09-26T${String(8 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00;${(21 + Math.sin(i / 20) * 2 + rnd(-0.2, 0.2)).toFixed(2)};${(60 + Math.cos(i / 25) * 6).toFixed(1)};${(45 - i / 12).toFixed(1)}`); return L.join('\n'); }
      if (/\.ino$/i.test(name)) { const id = name.replace(/\.ino$/, ''); const pj = A.projectById && A.projectById(id); if (pj) { try { return A.buildProject(pj, 'esp32').code; } catch (e) { /* repli */ } } return '// ' + name + '\nvoid setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n}\n'; }
      if (/\.json$/i.test(name)) return JSON.stringify({ demo: true, file: name, generated: new Date().toISOString() }, null, 2);
      return '# ' + name + '\n\nFichier de démonstration.\n';
    }
  };
  A.Demo = Demo;
})();
/* ---- 99_boot.js ---- */
/* Démarrage de l'application une fois le DOM prêt. */
(function () {
  'use strict';
  const start = () => window.APP.boot().catch((e) => {
    console.error(e);
    document.getElementById('app').innerHTML = '<p style="padding:24px;font-family:system-ui">Erreur au démarrage de l\'interface : ' + String(e && e.message || e) + '</p>';
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
