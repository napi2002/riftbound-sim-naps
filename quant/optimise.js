// Meta-weighted deck optimiser (exploratory; not part of the pre-registered tests).
// For each legend, starts from its tournament list and hill-climbs over single-card swaps (any legal, fully
// simulated, non-banned card), rune splits and battlefields. A deck's score is its win rate against the 15
// tournament lists, weighted by their real meta share (quant/data/tidy/deck_week.csv, latest snapshot).
// Each round: screen M random moves on a few seeds, re-test the best few on fresh seeds against the current list
// (common random numbers), accept the best if it beats the current list by > 2 paired standard errors.
// Finally every optimised list is re-scored on a large fresh seed set (no selection on those seeds).
//
// Budget mode (--budget USD --prices quant/data/prices/<date>.json): the whole deck (legend, main deck, battlefields,
// runes) must cost at most USD at the snapshot's cheapest printing; unpriced cards are excluded. An over-budget
// tournament list is first repaired: each step screens cost-reducing swaps (biased towards expensive cards) and
// keeps the best-scoring one, until the list fits; then the usual search runs with every move kept within budget.
//
// Usage: node quant/optimise.js [--decks a,b] [--rounds R] [--moves M] [--screen N1] [--confirm N2] [--final N3] [--workers W]
//        [--budget USD --prices file]
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
const keyOf = s => JSON.stringify([s.runes, s.bfs, s.list.slice().sort((a, b) => a[1] < b[1] ? -1 : 1)]);

function worker() {
  const RT = loadRT(), cache = new Map();
  const deckFor = (spec) => { const k = keyOf(spec) + spec.id; if (!cache.has(k)) { if (cache.size > 400) cache.clear(); cache.set(k, RT.makeDeck(spec)); } return cache.get(k); };
  process.on('message', async ({ id, specs, jobs, maxTurns }) => {
    const out = [];
    for (const j of jobs) {
      const me = deckFor(specs[j.s]), op = RT.DECKS.find(d => d.id === j.opp);
      const A = j.seat === 0 ? me : op, B = j.seat === 0 ? op : me;
      const G = await RT.newGame(A, B, { maxTurns, rnd: mulberry32(j.seed) });
      while (G.winner == null) { await RT.aiTurn(G, G.active); await RT.endTurn(G); }
      out.push(G.winner === j.seat ? 1 : G.winner === 0 || G.winner === 1 ? 0 : 0.5);
    }
    process.send({ id, out });
  });
}

async function main() {
  const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const W = +arg('--workers', String(os.cpus().length)), R = +arg('--rounds', '20'), M = +arg('--moves', '40');
  const P = +arg('--patience', '3'), FROM = arg('--from', null), N1 = +arg('--screen', '4'), N2 = +arg('--confirm', '24'), N3 = +arg('--final', '100'), maxTurns = 200;
  const RT = loadRT(), rng = mulberry32(+arg('--seed', '7'));
  const BUDGET = arg('--budget') ? +arg('--budget') : null, PF = arg('--prices', null);
  const nm = n => n.toLowerCase().replace(/[^a-z0-9]/g, ''), PN = {};
  if (PF) { const P = JSON.parse(fs.readFileSync(PF, 'utf8')).prices; Object.keys(P).forEach(k => { PN[nm(k)] = P[k]; }); }
  const priceCache = {};
  // exact name, else the cheapest priced name containing it (e.g. 'Heart of the Tempest' -> 'Kennen - Heart of the Tempest')
  const price = n => { const k = nm(n); if (!(k in priceCache)) { let p = PN[k]; if (p == null) { const m = Object.keys(PN).filter(x => x.includes(k)).map(x => PN[x]); p = m.length ? Math.min(...m) : Infinity; } priceCache[k] = p; } return priceCache[k]; };
  const cost = s => price(s.legend) + s.list.reduce((t, e) => t + e[0] * price(e[1]), 0) + s.bfs.reduce((t, b) => t + price(b), 0) + Object.keys(s.runes).reduce((t, d) => t + s.runes[d] * price(d + ' Rune'), 0);
  const ids = arg('--decks') ? arg('--decks').split(',') : RT.DECKS.map(d => d.id);

  // meta weights: real share of each engine deck in the latest snapshot, renormalised over the 15
  const rows = fs.readFileSync(path.join(__dirname, 'data/tidy/deck_week.csv'), 'utf8').trim().split('\n').map(l => l.split(','));
  const h = rows[0], sidI = h.indexOf('snapshot_id'), engI = h.indexOf('engine_id'), shI = h.indexOf('share');
  const last = Math.max(...rows.slice(1).map(r => +r[sidI])), share = {};
  rows.slice(1).filter(r => +r[sidI] === last && r[engI] !== 'other').forEach(r => { share[r[engI]] = (share[r[engI]] || 0) + +r[shI]; });
  const tot = RT.DECKS.reduce((s, d) => s + (share[d.id] || 0), 0), wt = {};
  RT.DECKS.forEach(d => { wt[d.id] = (share[d.id] || 0) / tot; });
  const field = RT.DECKS.filter(d => wt[d.id] > 0);

  // persistent workers
  const ws = Array.from({ length: W }, () => cp.fork(__filename, ['--worker']));
  let nextId = 0; const pending = new Map();
  ws.forEach(w => w.on('message', m => { const p = pending.get(m.id); pending.delete(m.id); p(m.out); }));
  const runJobs = (specs, jobs) => {
    const chunks = Array.from({ length: W }, () => []); jobs.forEach((j, i) => { j.ix = i; chunks[i % W].push(j); });
    return Promise.all(chunks.map((ch, wi) => ch.length ? new Promise(res => { const id = nextId++; pending.set(id, res); ws[wi].send({ id, specs, jobs: ch, maxTurns }); }) : []))
      .then(parts => { const r = new Array(jobs.length); chunks.forEach((ch, wi) => ch.forEach((j, k) => { r[j.ix] = parts[wi][k]; })); return r; });
  };
  let games = 0;
  // Score many specs on the same seeds. Returns per spec { score, per-game weighted results } for paired comparisons.
  async function score(specList, N, base) {
    const jobs = [];
    specList.forEach((s, si) => field.forEach((o, oi) => { for (let k = 0; k < N; k++) for (const seat of [0, 1]) jobs.push({ s: si, opp: o.id, seat, seed: seedFor(base, k * 131 + oi), w: wt[o.id] / (2 * N) }); }));
    const res = await runJobs(specList, jobs); games += jobs.length;
    return specList.map((_, si) => {
      const g = []; let sc = 0;
      jobs.forEach((j, i) => { if (j.s === si) { const v = res[i] * j.w; g.push(v); sc += v; } });
      return { score: sc, g };
    });
  }
  const pairedSE = (a, b) => { const d = a.g.map((x, i) => x - b.g[i]); const n = d.length, m = d.reduce((s, x) => s + x, 0) / n; return Math.sqrt(n * d.reduce((s, x) => s + (x - m) * (x - m), 0) / (n - 1)); };

  // move generators
  const clone = s => ({ id: s.id, name: s.name, legend: s.legend, champion: s.champion, runes: Object.assign({}, s.runes), bfs: s.bfs.slice(), list: s.list.map(e => [e[0], e[1]]) });
  const pick = a => a[Math.floor(rng() * a.length)];
  function moves(s, pool, bfPool, doms, repair) {
    const out = [], have = {}; s.list.forEach(e => { have[e[1]] = e[0]; });
    const sig = s.list.reduce((t, e) => t + (RT.findCard(e[1]).supertype === 'Signature' ? e[0] : 0), 0);
    for (let tries = 0; out.length < M && tries < M * 20; tries++) {
      const r = rng(), t = clone(s);
      if (r < 0.85 || repair) { // swap one copy (repair: remove an expensive card, price-weighted)
        let rem = pick(t.list);
        if (repair) { const tw = t.list.reduce((a, e) => a + e[0] * price(e[1]), 0); let x = rng() * tw; rem = t.list.find(e => (x -= e[0] * price(e[1])) <= 0) || rem; }
        const add = pick(pool);
        if (add.name === rem[1] || (have[add.name] || 0) >= 3) continue;
        if (rem[1] === s.champion && rem[0] === 1) continue;
        if (add.supertype === 'Signature' && RT.findCard(rem[1]).supertype !== 'Signature' && sig >= 3) continue;
        rem[0]--; const e = t.list.find(x => x[1] === add.name); if (e) e[0]++; else t.list.push([1, add.name]);
        t.list = t.list.filter(x => x[0] > 0); t.desc = `-1 ${rem[1]}, +1 ${add.name}`;
      } else if (r < 0.93) { // rune split
        const [a, b] = rng() < 0.5 ? doms : [doms[1], doms[0]];
        if ((t.runes[a] || 0) < 1) continue; t.runes[a]--; t.runes[b] = (t.runes[b] || 0) + 1; t.desc = `rune ${a} -> ${b}`;
      } else { // battlefield
        const i = Math.floor(rng() * 3), b = pick(bfPool); if (t.bfs.includes(b.name)) continue;
        t.desc = `bf ${t.bfs[i]} -> ${b.name}`; t.bfs[i] = b.name;
      }
      if (!RT.validateDeck(t).ok) continue;
      if (BUDGET != null && (repair ? cost(t) >= cost(s) : cost(t) > BUDGET)) continue;
      const k = keyOf(t); if (out.some(o => keyOf(o) === k)) continue;
      out.push(t);
    }
    return out;
  }

  const t0 = Date.now(), results = [];
  let seedBase = 1000;
  console.log(`field: ${field.map(d => `${d.id} ${(100 * wt[d.id]).toFixed(1)}%`).join(', ')}`);
  for (const id of ids) {
    const d = RT.DECKS.find(x => x.id === id), leg = d.legendCard;
    const cnt = {}; d.cards.forEach(c => { cnt[c.name] = (cnt[c.name] || 0) + 1; });
    const s0 = { id: d.id, name: d.name, legend: leg.name, champion: d.championCard.name, runes: Object.assign({}, d.runes), bfs: d.bfCards.map(b => b.name), list: Object.keys(cnt).map(n => [cnt[n], n]) };
    const v0 = RT.validateDeck(s0); if (!v0.ok) console.log(`  ${id} tournament list fails the rules check: ${v0.errors.join(' ')}`);
    const pool = RT.deckPool(leg).filter(c => RT.cardSimulated(c) && !c.banned && (BUDGET == null || price(c.name) < Infinity));
    const bfPool = RT.battlefieldPool(leg).filter(c => RT.cardSimulated(c) && !c.banned);
    const doms = leg.domain.filter(x => RT.DOMAIN_LIST.includes(x));
    const prev = FROM && JSON.parse(fs.readFileSync(FROM, 'utf8')).results.find(x => x.id === id);
    let cur = prev ? prev.best : s0, log = prev ? prev.log.slice() : [], stale = 0;
    if (BUDGET != null && price(leg.name) + price(d.championCard.name) > BUDGET) { console.log(`  ${id}: legend + champion alone exceed the budget`); continue; }
    while (BUDGET != null && cost(cur) > BUDGET) { // repair: cheapest-first is not the goal; keep the best-scoring cost cut
      const cand = moves(cur, pool, bfPool, doms, true);
      if (!cand.length) { console.log(`  ${id}: cannot repair to budget`); break; }
      const sc = await score(cand, N1 * 2, seedBase++), bi = sc.reduce((b, x, i) => x.score > sc[b].score ? i : b, 0);
      log.push(`repair ${cand[bi].desc} ($${cost(cur).toFixed(0)} -> $${cost(cand[bi]).toFixed(0)})`); cur = cand[bi]; delete cur.desc;
    }
    if (BUDGET != null && cost(cur) > BUDGET) continue;
    for (let r = 0; r < R && stale < P; r++) {
      const cand = moves(cur, pool, bfPool, doms);
      const sc = await score([cur, ...cand], N1, seedBase++);
      const top = cand.map((c, i) => ({ c, v: sc[i + 1].score - sc[0].score })).sort((a, b) => b.v - a.v).slice(0, 4).filter(x => x.v > 0);
      if (!top.length) { stale++; continue; }
      const cf = await score([cur, ...top.map(x => x.c)], N2, seedBase++);
      let best = null;
      top.forEach((x, i) => { const dlt = cf[i + 1].score - cf[0].score, se = pairedSE(cf[i + 1], cf[0]); if (dlt > 2 * se && (!best || dlt > best.dlt)) best = { c: x.c, dlt, se }; });
      if (best) { const desc = best.c.desc; cur = best.c; delete cur.desc; log.push(`${desc || ''} (+${(100 * best.dlt).toFixed(1)} ± ${(100 * best.se).toFixed(1)})`); stale = 0; console.log(`  ${id} r${r}: ${log[log.length - 1]}`); }
      else stale++;
    }
    results.push({ id, start: s0, best: cur, log, start_cost: PF ? cost(s0) : null, best_cost: PF ? cost(cur) : null });
    console.log(`${id}: ${log.length} accepted changes  [${((Date.now() - t0) / 1000).toFixed(0)}s, ${games} games]`);
  }
  // fresh-seed final scoring: tournament list and optimised list per legend
  const finalBase = 90000000;
  for (const r of results) {
    const f = await score([r.start, r.best], N3, finalBase);
    r.start_score = f[0].score; r.best_score = f[1].score; r.gain_se = pairedSE(f[1], f[0]);
    // per-opponent win rate of the optimised list
    r.vs = {}; let i = 0; field.forEach(o => { let s = 0; for (let k = 0; k < 2 * N3; k++) s += f[1].g[i++] / (wt[o.id] / (2 * N3)); r.vs[o.id] = s / (2 * N3); });
    r.best.label = 'Optimised'; r.text = RT.deckToText(r.best);
    console.log(`${r.id.padEnd(12)} ${PF ? `$${r.start_cost.toFixed(0)} -> $${r.best_cost.toFixed(0)}  ` : ''}tournament ${(100 * r.start_score).toFixed(1)}  optimised ${(100 * r.best_score).toFixed(1)}  (gain ${(100 * (r.best_score - r.start_score)).toFixed(1)} ± ${(100 * r.gain_se).toFixed(1)})`);
  }
  let commit = 'unknown'; try { commit = cp.execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch (e) { /* */ }
  const out = path.join(__dirname, 'data/sim', `${commit}_optimise${FROM ? '_deep' : ''}${BUDGET != null ? '_budget' + BUDGET : ''}.json`);
  fs.writeFileSync(out, JSON.stringify({ commit, snapshot_id: last, weights: wt, params: { R, M, N1, N2, N3, BUDGET, prices: PF }, games, seconds: (Date.now() - t0) / 1000, results }, null, 1) + '\n');
  console.log(`done: ${games} games in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${path.relative(ROOT, out)}`);
  ws.forEach(w => w.kill());
}
if (process.argv.includes('--worker')) worker(); else main();
