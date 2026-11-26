// Round robin of deck specs at a given AI level, compared with real tournament win rates.
// Used for the fair sim-vs-real check: the real win rates (engine REAL, 14 days to 2026-11-15) were earned with the
// pre-ban lists, so compare them with quant/results/preban_specs_2026-11.json, not the post-ban decks.
// Usage: node quant/field_specs.js specs.json --level L --pairs N [--out results.json] [--seed-base S]
'use strict';
const cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..');
function mb(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const loadRT = () => { const RT = require(path.join(ROOT, 'src/engine.js')); RT.loadCards(require(path.join(ROOT, 'src/cards.json'))); return RT; };
function ranks(a) { const o = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); o.forEach((x, k) => { r[x[1]] = k; }); return r; }
function pearson(a, b) { const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb2 = b.reduce((s, x) => s + x, 0) / n; let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb2); va += (a[i] - ma) ** 2; vb += (b[i] - mb2) ** 2; } return c / Math.sqrt(va * vb); }
const spearman = (a, b) => pearson(ranks(a), ranks(b));
if (process.argv[2] === '--worker') {
  const RT = loadRT();
  process.on('message', async ({ jobs, specs, level }) => {
    const D = {}; for (const k in specs) D[k] = RT.makeDeck(specs[k]);
    const out = [];
    for (const j of jobs) {
      const G = await RT.newGame(D[j.a], D[j.b], { maxTurns: 200, rnd: mb(j.seed), aiLevel: [level, level] });
      while (G.winner == null) { await RT.aiTurn(G, G.active); await RT.endTurn(G); }
      out.push([j.a, j.b, G.winner]);
    }
    process.send(out, () => process.exit(0));
  });
} else {
  const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const specs = JSON.parse(fs.readFileSync(args[0], 'utf8')), level = +arg('--level', '5'), N = +arg('--pairs', '8'), base = +arg('--seed-base', '1000'), outF = arg('--out', null);
  const ids = Object.keys(specs), jobs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = 0; k < N; k++) { const seed = base + k * 7919; jobs.push({ a: ids[i], b: ids[j], seed }, { a: ids[j], b: ids[i], seed }); }
  const W = os.cpus().length, ch = Array.from({ length: W }, () => []); jobs.forEach((j, i) => ch[i % W].push(j));
  const t0 = Date.now();
  Promise.all(ch.map(c => new Promise((res, rej) => { const w = cp.fork(__filename, ['--worker']); let g = null; w.on('message', m => { g = m; }); w.on('exit', e => e === 0 && g ? res(g) : rej(new Error('exit ' + e))); w.send({ jobs: c, specs, level }); })))
    .then(parts => {
      const RT = loadRT(), r = [].concat(...parts), wr = {}; ids.forEach(i => { wr[i] = { w: 0, n: 0 }; });
      r.forEach(([a, b, w]) => { wr[a].n++; wr[b].n++; if (w === 0) wr[a].w++; else if (w === 1) wr[b].w++; else { wr[a].w += 0.5; wr[b].w += 0.5; } });
      const rows = ids.map(i => ({ id: i, sim: wr[i].w / wr[i].n, real: RT.real(i) ? RT.real(i).wr : null, n: RT.real(i) ? RT.real(i).n : 0 })).filter(x => x.real != null);
      const big = rows.filter(x => x.n >= 500);
      const res = { level, pairs: N, games: jobs.length, seconds: (Date.now() - t0) / 1000,
        rho_all: spearman(rows.map(x => x.sim), rows.map(x => x.real)), rho_big: spearman(big.map(x => x.sim), big.map(x => x.real)), k_big: big.length,
        mae: rows.reduce((s, x) => s + Math.abs(x.sim - x.real), 0) / rows.length,
        mae_weighted: rows.reduce((s, x) => s + x.n * Math.abs(x.sim - x.real), 0) / rows.reduce((s, x) => s + x.n, 0),
        rows: rows.sort((a, b) => b.sim - a.sim) };
      console.log(`level ${level}: ${jobs.length} games in ${res.seconds.toFixed(0)}s | Spearman vs real: all ${res.rho_all.toFixed(2)}, n>=500 (k=${res.k_big}) ${res.rho_big.toFixed(2)} | MAE ${(100 * res.mae).toFixed(1)} pts (match-weighted ${(100 * res.mae_weighted).toFixed(1)})`);
      res.rows.forEach(x => console.log(`  ${x.id.padEnd(12)} sim ${(100 * x.sim).toFixed(1).padStart(5)}%  real ${(100 * x.real).toFixed(0).padStart(3)}% (n=${x.n})`));
      if (outF) fs.writeFileSync(outF, JSON.stringify(res, null, 1) + '\n');
    });
}
