// H5 card ablation (pre-registered in quant/PREREGISTRATION.md).
// For every engine deck d and every distinct main-deck card c in it, all copies of c are replaced by a blank copy
// (same cost, type, domains and Might, no rules text; RT.blankCard) and d plays the other 14 decks with mirrored
// seeds. delta-win = WR(d) - WR(d without c's text), both measured on the same seeds (common random numbers).
//
// Usage: node quant/ablation.js --pairs N [--decks a,b] [--workers W] [--seed-base S] [--out file.json]
// N seed pairs per opponent -> 14 * 2N games per (deck, card) and for each deck's baseline.
'use strict';
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seedFor(base, k) { let h = (base ^ 0x9E3779B9) >>> 0; h = Math.imul(h ^ (k + 0x7F4A7C15), 0x85EBCA6B) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35) >>> 0; h ^= h >>> 16; return h >>> 0; }

function loadRT() {
  const RT = require(path.join(ROOT, 'src/engine.js'));
  RT.loadCards(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/cards.json'), 'utf8')));
  return RT;
}
// The deck with every copy of `name` replaced by its blank copy.
function ablated(RT, deck, name) {
  if (!name) return deck;
  const c = deck.cards.find(x => x.name === name), b = RT.blankCard(c);
  const d = Object.assign({}, deck, { cards: deck.cards.map(x => x === c ? b : x) });
  if (deck.championCard === c) d.championCard = b;
  return d;
}

async function worker() {
  const RT = loadRT();
  process.on('message', async ({ jobs, maxTurns }) => {
    const out = [];
    for (const j of jobs) {
      const me = RT.DECKS.find(d => d.id === j.deck), op = RT.DECKS.find(d => d.id === j.opp);
      const mine = ablated(RT, me, j.card);
      const A = j.seat === 0 ? mine : op, B = j.seat === 0 ? op : mine;
      const G = await RT.newGame(A, B, { maxTurns, rnd: mulberry32(j.seed) });
      while (G.winner == null) { await RT.aiTurn(G, G.active); await RT.endTurn(G); }
      out.push({ i: j.i, win: G.winner === j.seat ? 1 : 0, draw: G.winner !== 0 && G.winner !== 1 ? 1 : 0 });
    }
    process.send(out, () => process.exit(0));   // exit only once the (large) message has been delivered
  });
}

async function main() {
  const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const N = parseInt(arg('--pairs', '0'), 10);
  if (!N) { console.error('usage: node quant/ablation.js --pairs N [--decks a,b] [--workers W]'); process.exit(1); }
  const W = parseInt(arg('--workers', String(os.cpus().length)), 10), base = parseInt(arg('--seed-base', '20261027'), 10), maxTurns = 200;
  const RT = loadRT();
  const ids = arg('--decks') ? arg('--decks').split(',') : RT.DECKS.map(d => d.id);
  let commit = 'unknown';
  try { commit = cp.execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); if (cp.execSync('git status --porcelain src/', { cwd: ROOT }).toString().trim()) commit += '-dirty'; } catch (e) { /* not a git checkout */ }
  // conditions: each deck's baseline (card = null) and one per distinct main-deck card
  const conds = [];
  for (const id of ids) {
    const d = RT.DECKS.find(x => x.id === id);
    conds.push({ deck: id, card: null });
    [...new Set(d.cards.map(c => c.name))].forEach(name => conds.push({ deck: id, card: name, copies: d.cards.filter(c => c.name === name).length }));
  }
  const jobs = [];
  conds.forEach((c, ci) => {
    RT.DECKS.filter(o => o.id !== c.deck).forEach(o => {
      for (let k = 0; k < N; k++) for (const seat of [0, 1]) jobs.push({ i: jobs.length, ci, deck: c.deck, card: c.card, opp: o.id, seat, seed: seedFor(base, k * 131 + RT.DECKS.indexOf(o)) });
    });
  });
  console.log(`${conds.length} conditions (${ids.length} baselines + ${conds.length - ids.length} ablated cards), ${jobs.length} games, ${W} workers, engine ${commit}`);
  const t0 = Date.now(), chunks = Array.from({ length: W }, () => []);
  jobs.forEach((j, i) => chunks[i % W].push(j));
  const parts = await Promise.all(chunks.map(ch => new Promise((res, rej) => {
    const w = cp.fork(__filename, ['--worker']); let got = null;
    w.on('message', m => { got = m; }); w.on('exit', c => c === 0 && got ? res(got) : rej(new Error('worker exit ' + c)));
    w.send({ jobs: ch, maxTurns });
  })));
  const res = new Map(); [].concat(...parts).forEach(r => res.set(r.i, r));
  const agg = conds.map(() => ({ w: 0, n: 0 }));
  jobs.forEach(j => { const r = res.get(j.i); if (r.draw) return; agg[j.ci].w += r.win; agg[j.ci].n++; });
  const baseWR = {}; conds.forEach((c, ci) => { if (!c.card) baseWR[c.deck] = agg[ci].w / agg[ci].n; });
  const rows = conds.map((c, ci) => c.card && { deck: c.deck, card: c.card, copies: c.copies, games: agg[ci].n, wr: agg[ci].w / agg[ci].n, base_wr: baseWR[c.deck], delta: baseWR[c.deck] - agg[ci].w / agg[ci].n }).filter(Boolean);
  const secs = (Date.now() - t0) / 1000;
  const out = arg('--out', path.join(__dirname, 'data/sim', `${commit}_ablation_${N}.json`));
  fs.writeFileSync(out, JSON.stringify({ commit, pairs_per_opponent: N, games_per_condition: 14 * 2 * N, seed_base: base, seconds: secs, baseline: baseWR, rows }, null, 1) + '\n');
  console.log(`done in ${secs.toFixed(0)}s (${(jobs.length / secs).toFixed(0)} games/s); wrote ${path.relative(ROOT, out)}`);
  rows.sort((a, b) => b.delta - a.delta).slice(0, 8).forEach(r => console.log(`  ${r.deck.padEnd(12)} ${r.card.padEnd(30)} delta ${(100 * r.delta).toFixed(1)} pts`));
}
if (process.argv.includes('--worker')) worker(); else main();
