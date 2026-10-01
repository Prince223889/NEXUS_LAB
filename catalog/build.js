#!/usr/bin/env node
/* ESP32 LAB — construit la bibliothèque de projets à partir de catalog/src.
 *
 *   node catalog/build.js            → projets/LIBRARY, SD_CARD, www/catalog.js, catalog/catalog.json
 *   node catalog/build.js --sketches <dossier> [--board esp32]  → croquis bruts pour la compilation de test
 *   node catalog/build.js --sketches <dossier> --bench           → variantes « banc fantôme » (envoi au MASTER forcé)
 *
 * Aucune dépendance npm : Node.js 18 ou plus récent. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(__dirname, 'src');

const CLASSICS_DIR = path.join(__dirname, 'classics');

function load() {
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.js')).sort();
  for (const f of files) {
    const code = fs.readFileSync(path.join(SRC, f), 'utf8');
    // eslint-disable-next-line no-new-func
    new Function(code).call(globalThis);
  }
  const LAB = globalThis.LAB;
  // Classiques écrits à la main : métadonnées + fichier .ino
  const meta = JSON.parse(fs.readFileSync(path.join(CLASSICS_DIR, 'classics.json'), 'utf8'));
  LAB.CLASSICS = meta.map((c) => Object.assign({}, c, {
    libs: (c.libs || []).map((k) => { if (!LAB.LIBS[k]) throw new Error('bibliothèque inconnue ' + k); return LAB.LIBS[k]; }),
    code: fs.readFileSync(path.join(CLASSICS_DIR, c.id + '.ino'), 'utf8')
  }));
  return { LAB, files };
}

const CATS = {
  temp: { name: 'Température, humidité & pression', icon: 'thermo' },
  air: { name: 'Qualité de l\'air & CO₂', icon: 'wind' },
  gas: { name: 'Gaz (série MQ)', icon: 'flame' },
  weather: { name: 'Météo, sol & UV', icon: 'cloud' },
  water: { name: 'Eau & aquariophilie', icon: 'drop' },
  light: { name: 'Lumière, couleur & infrarouge', icon: 'sun' },
  distance: { name: 'Distance & présence', icon: 'radar' },
  motion: { name: 'Mouvement, orientation & vibrations', icon: 'compass' },
  input: { name: 'Boutons, claviers & commandes', icon: 'pointer' },
  bio: { name: 'Santé, son & biométrie', icon: 'heart' },
  power: { name: 'Courant, tension & énergie', icon: 'bolt' },
  id: { name: 'Identification, temps & position', icon: 'id' },
  act: { name: 'Actionneurs : LED, relais, son', icon: 'toggle' },
  motor: { name: 'Moteurs & servos', icon: 'cog' },
  io: { name: 'Extensions d\'E/S & convertisseurs', icon: 'chip' },
  display: { name: 'Afficheurs', icon: 'screen' },
  comm: { name: 'Communication & radio', icon: 'antenna' },
  app: { name: 'Projets complets', icon: 'star' },
  classic: { name: 'Classiques ESP32 (système & réseau)', icon: 'book' }
};

function mdTable(rows) {
  const out = ['| Module | Broche | Vers l\'ESP32 | Remarque |', '|---|---|---|---|'];
  rows.forEach((w) => out.push(`| ${w.name} | ${w.pin} | ${w.to} | ${w.note || ''} |`));
  return out.join('\n');
}

function readme(p, res) {
  const lines = [];
  lines.push(`# ${p.title}`);
  lines.push('');
  lines.push(p.desc || '');
  lines.push('');
  lines.push(`- **Catégorie** : ${CATS[p.cat] ? CATS[p.cat].name : p.cat}`);
  lines.push(`- **Carte de référence** : ${res.boardName} (Arduino IDE : cœur esp32 3.3.x)`);
  lines.push(`- **Difficulté** : ${'★'.repeat(p.difficulty || 1)}${'☆'.repeat(3 - (p.difficulty || 1))}`);
  lines.push(`- **Consommation estimée** : ${res.power.modules_mA} mA (pointe ${res.power.modules_peak_mA} mA) + carte ESP32`);
  lines.push('');
  lines.push('## Câblage');
  lines.push('');
  lines.push(mdTable(res.wiring));
  lines.push('');
  lines.push('## Bibliothèques');
  lines.push('');
  if (res.libs.length) res.libs.forEach((l) => lines.push(`- **${l.name}** ${l.ver} — https://github.com/${l.repo}`));
  else lines.push('Aucune : tout est inclus dans le cœur Arduino-ESP32.');
  lines.push('');
  if (res.outs.length) {
    lines.push('## Mesures publiées (moniteur et traceur série, 115200 bauds)');
    lines.push('');
    res.outs.forEach((o) => lines.push(`- \`${o.key}\` : ${o.label}${o.unit ? ' (' + o.unit + ')' : ''}`));
    lines.push('');
  }
  const notes = (p.notes || []).concat(res.warnings || []);
  if (notes.length) {
    lines.push('## Points d\'attention');
    lines.push('');
    notes.forEach((n) => lines.push(`- ${n}`));
    lines.push('');
  }
  lines.push('## Utilisation');
  lines.push('');
  lines.push(`1. Ouvrez \`${p.id}.ino\` dans l'IDE Arduino, carte **${res.boardName.includes('S3') ? 'ESP32S3 Dev Module' : 'ESP32 Dev Module'}**.`);
  lines.push('2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).');
  lines.push('3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.');
  lines.push('4. Outils > Traceur série affiche les courbes en direct.');
  lines.push('');
  lines.push('_Généré par ESP32 LAB Studio ' + globalThis.LAB.VERSION + ' — modifiable librement._');
  return lines.join('\n') + '\n';
}

function projectsFromModules(LAB) {
  return LAB.MODULES.map((m) => ({
    id: m.id,
    kind: 'module',
    cat: m.cat,
    title: m.name,
    desc: m.desc,
    tags: m.tags || [],
    difficulty: m.difficulty || 1,
    notes: m.notes || [],
    boards: m.boards || ['esp32', 'esp32s3', 'esp32c3'],
    spec: { board: (m.boards && !m.boards.includes('esp32')) ? m.boards[0] : 'esp32', title: `${m.name} — mesure et affichage série`, description: m.desc, modules: [{ id: m.id }] }
  }));
}

function projectsFromRecipes(LAB) {
  return (LAB.RECIPES || []).map((r) => ({
    id: r.id, kind: 'recipe', cat: 'app', title: r.title, desc: r.desc, tags: r.tags || [], difficulty: r.difficulty || 2,
    notes: r.notes || [], boards: r.boards || ['esp32', 'esp32s3'],
    spec: { board: r.board || 'esp32', title: r.title, description: r.desc, modules: r.modules, rules: r.rules || [], options: r.options || {} }
  }));
}

function projectsFromClassics(LAB) {
  return LAB.CLASSICS.map((c) => ({
    id: c.id, kind: 'classic', cat: 'classic', title: c.title, desc: c.desc, tags: c.tags, difficulty: c.difficulty,
    notes: [], boards: c.boards, code: c.code, libs: c.libs
  }));
}

/* Résultat équivalent à LAB.generate() pour un classique écrit à la main. */
function classicResult(LAB, p, board) {
  const b = LAB.BOARDS[board] || LAB.BOARDS.esp32;
  return { code: p.code, board: b.id, boardName: b.name, fqbn: b.fqbn, title: p.title, libs: p.libs, wiring: [], warnings: [],
    power: { modules_mA: 0, modules_peak_mA: 0 }, outs: [] };
}

function main() {
  const args = process.argv.slice(2);
  const { LAB } = load();
  const sketchDir = args.includes('--sketches') ? args[args.indexOf('--sketches') + 1] : null;
  const onlyBoard = args.includes('--board') ? args[args.indexOf('--board') + 1] : null;
  const filter = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
  const bench = args.includes('--bench');

  const projects = projectsFromModules(LAB).concat(projectsFromRecipes(LAB), projectsFromClassics(LAB));
  const ids = new Set();
  const errors = [];
  projects.forEach((p) => { if (ids.has(p.id)) errors.push('identifiant en double : ' + p.id); ids.add(p.id); });
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

  if (sketchDir) {
    fs.mkdirSync(sketchDir, { recursive: true });
    const list = [];
    projects.forEach((p) => {
      if (filter && !filter.includes(p.id)) return;
      const board = onlyBoard || (p.spec ? p.spec.board : p.boards[0]);
      if (onlyBoard && p.boards && !p.boards.includes(onlyBoard)) return;
      let res;
      if (bench) {
        if (p.kind === 'classic') return;
        const plan = LAB.benchPlan(Object.assign({}, p.spec, { board }));
        if (!plan.emulable) return;
        res = LAB.generate(Object.assign({}, p.spec, { board, options: Object.assign({}, p.spec.options, { master: true, home: true }) }));
      } else {
        res = p.kind === 'classic' ? classicResult(LAB, p, board) : LAB.generate(Object.assign({}, p.spec, { board }));
      }
      const name = `${board}__${p.id}${bench ? '__bench' : ''}`;
      const dir = path.join(sketchDir, name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, name + '.ino'), res.code);
      list.push({ id: p.id, name, dir, fqbn: res.fqbn, libs: res.libs.map((l) => l.name), warnings: res.warnings });
    });
    fs.writeFileSync(path.join(sketchDir, 'index.json'), JSON.stringify(list, null, 1));
    console.log(`${list.length} croquis écrits dans ${sketchDir}`);
    return;
  }

  // Sortie complète
  const libDir = path.join(ROOT, 'projects', 'LIBRARY');
  fs.mkdirSync(libDir, { recursive: true });
  // Nettoyage sans perdre les firmwares compilés (sous-dossier bin/ rempli par scripts/compile_all.py)
  const keep = new Set(projects.map((p) => p.id));
  fs.readdirSync(libDir).forEach((d) => {
    const full = path.join(libDir, d);
    if (!fs.statSync(full).isDirectory()) { fs.rmSync(full, { force: true }); return; }
    if (!keep.has(d)) { fs.rmSync(full, { recursive: true, force: true }); return; }
    fs.readdirSync(full).forEach((f) => { if (f !== 'bin') fs.rmSync(path.join(full, f), { recursive: true, force: true }); });
  });
  const index = [];
  let benches = 0, montages = 0;
  projects.forEach((p) => {
    const res = p.kind === 'classic' ? classicResult(LAB, p, p.boards[0]) : LAB.generate(p.spec);
    const dir = path.join(libDir, p.id);
    fs.mkdirSync(dir, { recursive: true });
    if (p.kind !== 'classic') {
      // Montage : un schéma par carte compatible (montage.svg = carte de référence) + MONTAGE.md
      (p.boards || [res.board]).forEach((b) => {
        let rb;
        try { rb = b === res.board ? res : LAB.generate(Object.assign({}, p.spec, { board: b })); } catch (e) { return; }
        const m = LAB.montageSvg(rb, { id: p.id, title: p.title });
        fs.writeFileSync(path.join(dir, `montage_${b}.svg`), m.svg + '\n');
        if (b === res.board) {
          fs.writeFileSync(path.join(dir, 'montage.svg'), m.svg + '\n');
          fs.writeFileSync(path.join(dir, 'MONTAGE.md'), LAB.montageMd(rb, { title: p.title, desc: p.desc }, m.rows, 'montage.svg'));
        }
        montages++;
      });
    }
    if (p.kind !== 'classic') {
      // Banc fantôme : plan de test matériel (le firmware se compile avec --sketches … --bench)
      const plan = LAB.benchPlan(p.spec);
      if (plan.emulable) {
        const out = Object.assign({}, plan, { bin: `/sd/FIRMWARE/WORKER/${plan.board}__${p.id}__bench.ino.bin` });
        delete out.code;
        fs.writeFileSync(path.join(dir, 'bench.json'), JSON.stringify(out, null, 1) + '\n');
        benches++;
      }
    }
    fs.writeFileSync(path.join(dir, p.id + '.ino'), res.code);
    fs.writeFileSync(path.join(dir, 'README.md'), readme(p, res));
    const meta = { id: p.id, title: p.title, category: p.cat, kind: p.kind, description: p.desc, tags: p.tags, difficulty: p.difficulty,
      board: res.board, boards: p.boards, fqbn: res.fqbn, libraries: res.libs, wiring: res.wiring, outputs: res.outs, power: res.power,
      notes: (p.notes || []).concat(res.warnings), generator: 'ESP32 LAB Studio ' + LAB.VERSION };
    fs.writeFileSync(path.join(dir, 'project.json'), JSON.stringify(meta, null, 2) + '\n');
    index.push({ id: p.id, title: p.title, cat: p.cat, kind: p.kind, tags: p.tags, difficulty: p.difficulty, boards: p.boards, libs: res.libs.map((l) => l.name) });
  });
  const summary = { version: LAB.VERSION, generated: new Date().toISOString().slice(0, 10), modules: LAB.MODULES.length, recipes: (LAB.RECIPES || []).length, classics: (LAB.CLASSICS || []).length, categories: CATS, projects: index };
  fs.writeFileSync(path.join(__dirname, 'catalog.json'), JSON.stringify(summary, null, 1) + '\n');

  // Paquet pour l'interface web du MASTER : sources + catégories
  const bundle = [
    '/* ESP32 LAB — bibliothèque embarquée (généré par catalog/build.js, ne pas modifier à la main) */'
  ];
  fs.readdirSync(SRC).filter((f) => f.endsWith('.js')).sort().forEach((f) => bundle.push(fs.readFileSync(path.join(SRC, f), 'utf8')));
  const classicsData = LAB.CLASSICS.map((c) => ({ id: c.id, title: c.title, desc: c.desc, tags: c.tags, boards: c.boards, difficulty: c.difficulty, libs: c.libs, code: c.code }));
  bundle.push(`(function(root){root.LAB=root.LAB||{};root.LAB.CATS=${JSON.stringify(CATS)};root.LAB.CLASSICS=${JSON.stringify(classicsData)};})(typeof globalThis!=='undefined'?globalThis:this);`);
  fs.writeFileSync(path.join(ROOT, 'firmware', 'master', 'www', 'catalog.js'), bundle.join('\n'));
  console.log(`${montages} schémas de montage (montage*.svg), ${benches} plans de banc fantôme (bench.json)`);
  console.log(`${projects.length} projets générés (${LAB.MODULES.length} modules, ${(LAB.RECIPES || []).length} projets complets, ${(LAB.CLASSICS || []).length} classiques)`);
}

main();
