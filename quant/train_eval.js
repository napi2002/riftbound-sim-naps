// Self-play data for the learned evaluation (AI level 4).
// Plays AI-vs-AI games across every pair of decks (mirrored seats) at a given AI level and records, at the start of
// every turn, the position features (RT.evalFeatures) from both players' point of view, labelled with who won.
// Usage: node quant/train_eval.js --level 2 --pairs N --out data.jsonl [--workers W] [--seed-base S]
'use strict';
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seedFor(base, k) { let h = (base ^ 0x9E3779B9) >>> 0; h = Math.imul(h ^ (k + 0x7F4A7C15), 0x85EBCA6B) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35) >>> 0; h ^= h >>> 16; return h >>> 0; }
function loadRT() { const RT = require(path.join(ROOT, 'src/engine.js')); RT.loadCards(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/cards.json'), 'utf8'))); return RT; }

function worker() {
  const RT = loadRT();
  process.on('message', async ({ jobs, level }) => {
    const rows = [];
    for (const j of jobs) {
      const A = RT.DECKS.find(d => d.id === j.a), B = RT.DECKS.find(d => d.id === j.b);
      const G = await RT.newGame(A, B, { maxTurns: 200, rnd: mulberry32(j.seed), aiLevel: [level, level] });
      const states = [];
      while (G.winner == null) {
        // start of the active player's turn (holds already scored): the point where the lookahead evaluates
        for (const q of [0, 1]) states.push({ q, t: G.turnNo, x: RT.evalFeatures(G, q) });
        await RT.aiTurn(G, G.active); await RT.endTurn(G);
      }
      if (G.winner !== 0 && G.winner !== 1) continue;
      states.forEach(s => rows.push(JSON.stringify({ g: j.i, t: s.t, me: s.q ? j.b : j.a, opp: s.q ? j.a : j.b, x: s.x.map(v => Math.round(v * 1000) / 1000), y: G.winner === s.q ? 1 : 0 })));
    }
    process.send(rows, () => process.exit(0));
  });
}
async function main() {
  const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const level = +arg('--level', '2'), N = +arg('--pairs', '5'), W = +arg('--workers', String(os.cpus().length)), base = +arg('--seed-base', '777001');
  const out = arg('--out', path.join(__dirname, 'data', 'selfplay_L' + level + '.jsonl'));
  const RT = loadRT(), ids = RT.DECKS.map(d => d.id), jobs = [];
  ids.forEach((a, ai) => ids.forEach((b, bi) => { if (a === b) return; for (let k = 0; k < N; k++) jobs.push({ i: jobs.length, a, b, seed: seedFor(base, (ai * 64 + bi) * 1000 + k) }); }));
  console.log(`self-play at AI level ${level}: ${jobs.length} games (${ids.length} decks, every ordered pair x ${N}), ${W} workers`);
  const t0 = Date.now(), chunks = Array.from({ length: W }, () => []); jobs.forEach((j, i) => chunks[i % W].push(j));
  const parts = await Promise.all(chunks.map(ch => new Promise((res, rej) => { const w = cp.fork(__filename, ['--worker']); let got = null; w.on('message', m => { got = m; }); w.on('exit', c => c === 0 && got ? res(got) : rej(new Error('worker exit ' + c))); w.send({ jobs: ch, level }); })));
  const rows = [].concat(...parts);
  fs.writeFileSync(out, rows.join('\n') + '\n');
  console.log(`${rows.length} positions from ${jobs.length} games in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${out}`);
}
if (process.argv.includes('--worker')) worker(); else main();
