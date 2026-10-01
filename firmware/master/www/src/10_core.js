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
