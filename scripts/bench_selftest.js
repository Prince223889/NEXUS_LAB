#!/usr/bin/env node
/* ESP32 LAB — autotest du Banc fantôme (sans matériel).
 *
 *   node scripts/bench_selftest.js [--verbose] [--only id1,id2]
 *
 * Pour chaque projet complet (et chaque capteur seul) émulable, rejoue le scénario de LAB.benchPlan() sur une simulation du DUT
 * obtenue en transpilant la fonction lab_rules() du code réellement généré. Si l'oracle et le code généré
 * divergent (seuil, hystérésis, commande proportionnelle, actif bas…), le test échoue. */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'catalog', 'src');
fs.readdirSync(SRC).filter((f) => f.endsWith('.js')).sort()
  // eslint-disable-next-line no-new-func
  .forEach((f) => new Function(fs.readFileSync(path.join(SRC, f), 'utf8')).call(globalThis));
const LAB = globalThis.LAB;

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;

let tested = 0, failed = 0, skipped = 0;
const projects = (LAB.RECIPES || []).map((r) => ({ id: r.id, spec: { board: r.board || 'esp32', title: r.title, modules: r.modules, rules: r.rules || [], options: r.options || {} } }))
  .concat(LAB.MODULES.filter((m) => m.emu).map((m) => ({ id: m.id, spec: { board: 'esp32', title: `${m.name} — mesure et affichage série`, modules: [{ id: m.id }], rules: [], options: {} } })));
projects.forEach((r) => {
  if (only && !only.includes(r.id)) return;
  const spec = r.spec;
  let plan;
  try {
    plan = LAB.benchPlan(spec);
  } catch (e) {
    console.log(`ERREUR ${r.id} : ${e.message}`);
    failed++;
    return;
  }
  if (!plan.emulable) {
    skipped++;
    if (verbose) console.log(`-      ${r.id} : non émulable (${plan.reasons.concat(plan.skipped).join(' ; ')})`);
    return;
  }
  tested++;
  const sim = LAB.benchSim(plan, spec);
  const errors = [];
  // Cohérence du plan lui-même
  const pins = new Set();
  plan.channels.forEach((c) => {
    if (c.kind !== 'i2c' && pins.has(c.emu)) errors.push(`broche d'émulateur GPIO${c.emu} utilisée deux fois`);
    pins.add(c.emu);
  });
  plan.steps.forEach((s, k) => {
    s.set.forEach((x) => {
      const c = plan.channels[x.n];
      if (x.raw === undefined) return;
      if (c.kind === 'analog' && (x.raw < LAB.BENCH.mvMin || x.raw > LAB.BENCH.mvMax)) errors.push(`étape ${k + 1} : ${x.raw} mV hors plage DAC`);
      if (c.kind === 'i2c' && !/^[0-9a-f]{4}$/.test(x.raw)) errors.push(`étape ${k + 1} : registre I2C « ${x.raw} » invalide`);
    });
    // Rejeu sur la simulation du code généré
    const res = sim.step(s);
    const feeds = {};
    const obs = {};
    Object.keys(res).forEach((key) => { if (key.startsWith('feed:')) feeds[key.slice(5)] = res[key]; else obs[key] = res[key]; });
    LAB.benchCheck(s, obs, feeds).forEach((c) => {
      if (!c.ok) errors.push(`étape ${k + 1} « ${s.label} » : attendu ${JSON.stringify(c.expect)}, simulé ${JSON.stringify(c.got)}`);
    });
  });
  if (errors.length) {
    failed++;
    console.log(`ÉCHEC  ${r.id}`);
    errors.forEach((e) => console.log('       ' + e));
  } else {
    const d = Math.round(plan.duration_ms / 1000);
    console.log(`OK     ${r.id} : ${plan.steps.length} étapes, ${plan.channels.length} voies, ${plan.rules} règle(s) vérifiée(s), ~${d} s`);
    if (verbose) plan.steps.forEach((s) => console.log(`         · ${s.label}`));
  }
});
console.log(`\n${tested} projet(s) testé(s), ${failed} échec(s), ${skipped} non émulable(s).`);
process.exit(failed ? 1 : 0);
