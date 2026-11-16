// AI A/B test: how much better does AI level X pilot each deck than level Y?
// For every deck d: d (level X) vs d (level Y) in the mirror, and d (level X) vs every other deck piloted at level Y,
// each with mirrored seats and shared seeds. The same games are also played with the deck at level Y (baseline), so
// the per-deck gain = WR(level X) - WR(level Y) is a paired comparison (common random numbers).
// Usage: node quant/ai_ab.js --x 1 --y 0 --pairs N [--decks a,b] [--workers W] [--seed-base S] [--out file.json]
'use strict';
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seedFor(base, k) { let h = (base ^ 0x9E3779B9) >>> 0; h = Math.imul(h ^ (k + 0x7F4A7C15), 0x85EBCA6B) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35) >>> 0; h ^= h >>> 16; return h >>> 0; }
function loadRT() { const RT = require(path.join(ROOT, 'src/engine.js')); RT.loadCards(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/cards.json'), 'utf8'))); return RT; }

function worker() {
  const RT = loadRT();
  process.on('message', async ({ jobs }) => {
    const out = [];
    for (const j of jobs) {
      const me = RT.DECKS.find(d => d.id === j.deck), op = RT.DECKS.find(d => d.id === j.opp);
      const A = j.seat === 0 ? me : op, B = j.seat === 0 ? op : me;
      const lv = j.seat === 0 ? [j.x, j.y] : [j.y, j.x];
      const G = await RT.newGame(A, B, { maxTurns: 200, rnd: mulberry32(j.seed), aiLevel: lv });
      while (G.winner == null) { await RT.aiTurn(G, G.active); await RT.endTurn(G); }
      out.push({ i: j.i, win: G.winner === j.seat ? 1 : 0, draw: G.winner !== 0 && G.winner !== 1 ? 1 : 0 });
    }
    process.send(out, () => process.exit(0));
  });
}
async function main() {
  const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const X = +arg('--x', '1'), Y = +arg('--y', '0'), N = +arg('--pairs', '20'), W = +arg('--workers', String(os.cpus().length)), base = +arg('--seed-base', '424242');
  const RT = loadRT(), ids = arg('--decks') ? arg('--decks').split(',') : RT.DECKS.map(d => d.id), all = RT.DECKS.map(d => d.id);
  const jobs = [];
  ids.forEach(d => all.forEach((o, oi) => { if (o === d) return; for (let k = 0; k < N; k++) for (const seat of [0, 1]) for (const lvl of [X, Y]) jobs.push({ i: jobs.length, deck: d, opp: o, seat, x: lvl, y: Y, base: lvl === Y, key: o + '|' + k + '|' + seat, seed: seedFor(base, k * 131 + oi) }); }));
  console.log(`AI level ${X} vs level ${Y}: ${ids.length} decks x ${all.length - 1} opponents x ${2 * N} games, each also played at level ${Y} (${jobs.length} games, ${W} workers)`);
  const t0 = Date.now(), chunks = Array.from({ length: W }, () => []); jobs.forEach((j, i) => chunks[i % W].push(j));
  const parts = await Promise.all(chunks.map(ch => new Promise((res, rej) => { const w = cp.fork(__filename, ['--worker']); let got = null; w.on('message', m => { got = m; }); w.on('exit', c => c === 0 && got ? res(got) : rej(new Error('worker exit ' + c))); w.send({ jobs: ch }); })));
  const res = new Map(); [].concat(...parts).forEach(r => res.set(r.i, r));
  const rows = ids.map(d => {
    const mine = jobs.filter(j => j.deck === d), byKey = {};
    mine.forEach(j => { const r = res.get(j.i); (byKey[j.key] = byKey[j.key] || {})[j.base ? 'b' : 'x'] = r.draw ? 0.5 : r.win; });
    const diffs = Object.values(byKey).map(v => v.x - v.b), n = diffs.length, m = diffs.reduce((s2, x) => s2 + x, 0) / n;
    const se = Math.sqrt(diffs.reduce((s2, x) => s2 + (x - m) * (x - m), 0) / (n - 1) / n);
    const wr = k => Object.values(byKey).reduce((s2, v) => s2 + v[k], 0) / n;
    return { deck: d, base: wr('b'), new: wr('x'), gain: m, se, n };
  });
  rows.sort((a, b) => b.gain - a.gain).forEach(r => console.log(`${r.deck.padEnd(12)} level ${Y} ${(100 * r.base).toFixed(1).padStart(5)}%  ->  level ${X} ${(100 * r.new).toFixed(1).padStart(5)}%   gain ${(r.gain >= 0 ? '+' : '') + (100 * r.gain).toFixed(1)} ± ${(100 * r.se).toFixed(1)}`));
  const mg = rows.reduce((s2, r) => s2 + r.gain, 0) / rows.length;
  console.log(`MEAN gain ${(mg >= 0 ? '+' : '') + (100 * mg).toFixed(1)} points  [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
  const out = arg('--out', null);
  if (out) fs.writeFileSync(out, JSON.stringify({ x: X, y: Y, pairs: N, seed_base: base, rows, mean_gain: mg }, null, 1) + '\n');
}
if (process.argv.includes('--worker')) worker(); else main();
