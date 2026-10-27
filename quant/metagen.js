// From-scratch meta prediction (exploratory; not part of the pre-registered tests).
// Uses no tournament lists, no meta shares, no win rates and no researched deck guides. For every legend whose
// ability the engine simulates:
//   1. build a random legal deck (the Chosen Champion must carry the legend's champion tag: the data gives one Kennen
//      printing an extra 'Yordle' tag, which would otherwise allow any Yordle champion);
//       (fully simulated, non-banned cards; a champion unit is required by the rules,
//      so a legend whose champions are all unsimulated gets one anyway and is flagged);
//   2. co-evolve: each legend in turn hill-climbs its deck (single-copy and playset swaps, champion, runes,
//      battlefields) against the current decks of all legends, weighted 50/50 by the current Nash mix and uniform;
//   3. after each iteration, play the full matchup matrix and solve its Nash equilibrium (quant/analysis.py nash()).
// The final Nash mix is the predicted meta. Every deck is piloted by the same generic AI: researched plans are
// replaced by the mechanics flags a legend's ability needs (e.g. Seraphine's discount, Azir's Equipment).
//
// Usage: node quant/metagen.js [--iters 4] [--rounds1 40] [--rounds 15] [--moves 40] [--patience 4]
//        [--matrix 100] [--final 300] [--workers W] [--seed S] [--resume state.json]
'use strict';
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
process.env.RT_NO_GUIDES = '1';

const LEGENDS = ['Akali - Rogue Assassin', 'Azir - Emperor of the Sands', 'Draven - Glorious Executioner', "Evelynn - Agony's Embrace",
  'Heart of the Tempest', 'Irelia - Blade Dancer', 'Jayce - Defender of Tomorrow', 'LeBlanc - Deceiver', 'Lee Sin - Blind Monk',
  'Master Yi - Wuju Bladesman', 'Mordekaiser - Iron Revenant', 'Orianna - Lady of Clockwork', 'Pyke - Bloodharbor Ripper',
  "Rek'sai - Void Burrower", 'Rengar - Pridestalker', 'Riven - The Exile', 'Seraphine - Starry-Eyed Songstress', 'Vex - Gloomist',
  'Viktor - Herald of the Arcane'];
// Only what a legend's own ability needs to be used at all; no card priorities, attack style or reserve.
const MECH = { seraphine: { seraphine: true }, azir: { equipAlways: true }, kennen: { hideEager: true }, evelynn: { hideEager: true },
  irelia: { moveDraw: true }, masteryi: { holdLone: true }, reksai: { conquerReserve: 3 } };

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seedFor(base, k) { let h = (base ^ 0x9E3779B9) >>> 0; h = Math.imul(h ^ (k + 0x7F4A7C15), 0x85EBCA6B) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35) >>> 0; h ^= h >>> 16; return h >>> 0; }
function loadRT() {
  const RT = require(path.join(ROOT, 'src/engine.js'));
  RT.loadCards(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/cards.json'), 'utf8')));
  RT.DECKS.forEach(d => { const pl = RT.plan(d.id); if (pl) pl.ai = Object.assign({}, MECH[d.id] || {}); });
  return RT;
}
const keyOf = s => JSON.stringify([s.champion, s.runes, s.bfs, s.list.slice().sort((a, b) => a[1] < b[1] ? -1 : 1)]);

function worker() {
  const RT = loadRT(), cache = new Map();
  const deckFor = s => { const k = s.id + keyOf(s); if (!cache.has(k)) { if (cache.size > 600) cache.clear(); cache.set(k, RT.makeDeck(s)); } return cache.get(k); };
  process.on('message', async ({ id, specs, jobs }) => {
    const out = [];
    for (const j of jobs) {
      const me = deckFor(specs[j.a]), op = deckFor(specs[j.b]);
      const A = j.seat === 0 ? me : op, B = j.seat === 0 ? op : me;
      const G = await RT.newGame(A, B, { maxTurns: 200, rnd: mulberry32(j.seed) });
      while (G.winner == null) { await RT.aiTurn(G, G.active); await RT.endTurn(G); }
      out.push(G.winner === j.seat ? 1 : G.winner === 0 || G.winner === 1 ? 0 : 0.5);
    }
    process.send({ id, out });
  });
}

function nash(M) {
  const r = cp.spawnSync('python3', ['-c', 'import sys,json; sys.path.insert(0, sys.argv[1]); import analysis; x, v = analysis.nash(json.load(sys.stdin)); print(json.dumps([x, v]))', __dirname], { input: JSON.stringify(M) });
  if (r.status) throw new Error(r.stderr.toString());
  return JSON.parse(r.stdout.toString());
}

async function main() {
  const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const W = +arg('--workers', String(os.cpus().length)), ITERS = +arg('--iters', '4'), R1 = +arg('--rounds1', '40'), R = +arg('--rounds', '15');
  const M = +arg('--moves', '40'), P = +arg('--patience', '4'), N1 = 4, N2 = 24, NM = +arg('--matrix', '100'), NF = +arg('--final', '300');
  const RT = loadRT(), rng = mulberry32(+arg('--seed', '2027'));
  const sim = c => RT.cardSimulated(c) && !c.banned;
  const L = LEGENDS.map(n => {
    const leg = RT.findCard(n), d = RT.DECKS.find(x => x.legendCard === leg);
    const ctag = (leg.tags || []).filter(t => t !== 'Yordle'), champs = RT.championsFor(leg).filter(c => !c.banned && (c.tags || []).some(t => ctag.includes(t))), simChamps = champs.filter(sim);
    return { id: d ? d.id : n.split(/ - |,/)[0].toLowerCase().replace(/[^a-z]/g, ''), leg, doms: leg.domain.filter(x => RT.DOMAIN_LIST.includes(x)),
      pool: RT.deckPool(leg).filter(c => sim(c) && c.supertype !== 'Champion'), champs: simChamps.length ? simChamps : champs, champSim: simChamps.length > 0,
      bfPool: RT.battlefieldPool(leg).filter(sim) };
  });
  const out = path.join(__dirname, 'data/sim', `metagen_state.json`);

  // workers
  const ws = Array.from({ length: W }, () => cp.fork(__filename, ['--worker']));
  let nextId = 0, games = 0; const pending = new Map();
  ws.forEach(w => w.on('message', m => { const p = pending.get(m.id); pending.delete(m.id); p(m.out); }));
  const run = (specs, jobs) => {
    const ch = Array.from({ length: W }, () => []); jobs.forEach((j, i) => { j.ix = i; ch[i % W].push(j); });
    games += jobs.length;
    return Promise.all(ch.map((c, wi) => c.length ? new Promise(res => { const id = nextId++; pending.set(id, res); ws[wi].send({ id, specs, jobs: c }); }) : []))
      .then(parts => { const r = new Array(jobs.length); ch.forEach((c, wi) => c.forEach((j, k) => { r[j.ix] = parts[wi][k]; })); return r; });
  };

  // random legal deck
  const pick = a => a[Math.floor(rng() * a.length)];
  function randomDeck(l) {
    for (;;) {
      const champ = pick(l.champs), list = [[3, champ.name]], used = new Set([champ.name]);
      let total = 3, sig = 0;
      while (total < 40) {
        const units = l.pool.filter(c => c.type === 'Unit'), c = rng() < 0.6 && units.length ? pick(units) : pick(l.pool);
        if (used.has(c.name)) continue;
        const n = Math.min(c.supertype === 'Signature' ? Math.min(3, 3 - sig) : 3, 40 - total);
        if (n <= 0) continue;
        list.push([n, c.name]); used.add(c.name); total += n; if (c.supertype === 'Signature') sig += n;
      }
      const a = Math.round(6), runes = { [l.doms[0]]: a, [l.doms[1]]: 12 - a }, bfs = [];
      while (bfs.length < 3) { const b = pick(l.bfPool).name; if (!bfs.includes(b)) bfs.push(b); }
      const s = { id: l.id, name: l.leg.name, legend: l.leg.name, champion: champ.name, runes, bfs, list };
      if (RT.validateDeck(s).ok) return s;
    }
  }
  const clone = s => ({ id: s.id, name: s.name, legend: s.legend, champion: s.champion, runes: Object.assign({}, s.runes), bfs: s.bfs.slice(), list: s.list.map(e => [e[0], e[1]]) });
  function moves(s, l) {
    const res = [], seen = new Set([keyOf(s)]);
    for (let tries = 0; res.length < M && tries < M * 30; tries++) {
      const r = rng(), t = clone(s), have = {}; t.list.forEach(e => { have[e[1]] = e[0]; });
      if (r < 0.55 || r < 0.85) { // single-copy swap (55%) or playset swap (30%)
        const rem = pick(t.list), add = pick(l.pool); if (add.name === rem[1]) continue;
        const k = r < 0.55 ? 1 : rem[0];
        if (rem[1] === t.champion && rem[0] - k < 1) continue;
        if ((have[add.name] || 0) + k > 3) continue;
        rem[0] -= k; const e = t.list.find(x => x[1] === add.name); if (e) e[0] += k; else t.list.push([k, add.name]);
        t.list = t.list.filter(x => x[0] > 0);
      } else if (r < 0.9) { // champion
        const c = pick(l.champs); if (c.name === t.champion) continue;
        const e = t.list.find(x => x[1] === t.champion); e[1] = c.name; t.champion = c.name;
        const dup = t.list.filter(x => x[1] === c.name); if (dup.length > 1) { dup[0][0] += dup[1][0]; t.list.splice(t.list.indexOf(dup[1]), 1); }
      } else if (r < 0.96) { const [a, b] = rng() < 0.5 ? l.doms : [l.doms[1], l.doms[0]]; if (!t.runes[a]) continue; t.runes[a]--; t.runes[b] = (t.runes[b] || 0) + 1; }
      else { const i = Math.floor(rng() * 3), b = pick(l.bfPool); if (t.bfs.includes(b.name)) continue; t.bfs[i] = b.name; }
      if (!RT.validateDeck(t).ok) continue;
      const k = keyOf(t); if (seen.has(k)) continue; seen.add(k); res.push(t);
    }
    return res;
  }

  // scoring: specs[0..] vs the field (cur decks) weighted by wt; same seeds for every spec (common random numbers)
  async function score(cands, cur, wt, N, base) {
    const specs = cands.concat(cur), F = cands.length, jobs = [];
    cands.forEach((_, si) => cur.forEach((o, oi) => { if (wt[oi] <= 0) return; for (let k = 0; k < N; k++) for (const seat of [0, 1]) jobs.push({ a: si, b: F + oi, seat, seed: seedFor(base, k * 131 + oi), w: wt[oi] / (2 * N) }); }));
    const res = await run(specs, jobs);
    return cands.map((_, si) => { const g = []; let sc = 0; jobs.forEach((j, i) => { if (j.a === si) { const v = res[i] * j.w; g.push(v); sc += v; } }); return { score: sc, g }; });
  }
  const pse = (a, b) => { const d = a.g.map((x, i) => x - b.g[i]), n = d.length, m = d.reduce((s, x) => s + x, 0) / n; return Math.sqrt(n * d.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1)); };
  async function matrix(cur, N, base) {
    const k = cur.length, jobs = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) for (let n = 0; n < N; n++) for (const seat of [0, 1]) jobs.push({ a: i, b: j, seat, seed: seedFor(base, n * 977 + i * 31 + j) });
    const res = await run(cur, jobs), Mx = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => i === j ? 0.5 : 0));
    jobs.forEach((jb, x) => { Mx[jb.a][jb.b] += res[x] / (2 * N); });
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) Mx[j][i] = 1 - Mx[i][j];
    return Mx;
  }

  const t0 = Date.now(), el = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';
  let st = arg('--resume') ? JSON.parse(fs.readFileSync(arg('--resume'), 'utf8')) : null;
  let cur = st ? st.decks : L.map(randomDeck), wN = st ? st.nash : L.map(() => 1 / L.length), hist = st ? st.history : [], base = st ? st.base : 5000;
  const save = (extra) => fs.writeFileSync(out, JSON.stringify(Object.assign({ legends: L.map(l => ({ id: l.id, legend: l.leg.name, champion_simulated: l.champSim })), decks: cur, nash: wN, history: hist, base, games }, extra || {}), null, 1) + '\n');
  console.log(`${L.length} legends: ${L.map(l => l.id + (l.champSim ? '' : '*')).join(', ')}  (* champion unit not fully simulated)`);
  for (let it = hist.length; it < ITERS; it++) {
    const rounds = it === 0 ? R1 : R;
    for (let li = 0; li < L.length; li++) {
      const wt = cur.map((_, i) => 0.5 * wN[i] + 0.5 / L.length);
      let stale = 0, acc = 0;
      for (let r = 0; r < rounds && stale < P; r++) {
        const cand = moves(cur[li], L[li]);
        const sc = await score([cur[li], ...cand], cur, wt, N1, base++);
        const top = cand.map((c, i) => ({ c, v: sc[i + 1].score - sc[0].score })).sort((a, b) => b.v - a.v).slice(0, 4).filter(x => x.v > 0);
        if (!top.length) { stale++; continue; }
        const cf = await score([cur[li], ...top.map(x => x.c)], cur, wt, N2, base++);
        let best = null; top.forEach((x, i) => { const d = cf[i + 1].score - cf[0].score, se = pse(cf[i + 1], cf[0]); if (d > 2 * se && (!best || d > best.d)) best = { c: x.c, d }; });
        if (best) { cur[li] = best.c; acc++; stale = 0; } else stale++;
      }
      console.log(`  it${it + 1} ${L[li].id.padEnd(12)} ${acc} changes  [${el()}, ${games} games]`);
      save();
    }
    const Mx = await matrix(cur, NM, 70000000 + it * 1000000);
    const [x, v] = nash(Mx); wN = x;
    const avg = Mx.map(r => (r.reduce((s, y) => s + y, 0) - 0.5) / (r.length - 1));
    hist.push({ iter: it + 1, matrix: Mx, nash: x, value: v, avg });
    save();
    console.log(`iter ${it + 1}: Nash ${L.map((l, i) => [l.id, x[i]]).filter(p => p[1] > 0.005).sort((a, b) => b[1] - a[1]).map(p => `${p[0]} ${(100 * p[1]).toFixed(1)}%`).join(', ')}  [${el()}]`);
  }
  // final: fresh, larger matrix on the final decks
  const Mf = await matrix(cur, NF, 99000000), [xf, vf] = nash(Mf), avgF = Mf.map(r => (r.reduce((s, y) => s + y, 0) - 0.5) / (r.length - 1));
  const rows = L.map((l, i) => ({ id: l.id, legend: l.leg.name, champion_simulated: l.champSim, nash: xf[i], avg_wr: avgF[i], vs_nash: Mf[i].reduce((s, y, j) => s + y * xf[j], 0), deck: cur[i], text: RT.deckToText(cur[i]) }))
    .sort((a, b) => b.nash - a.nash || b.vs_nash - a.vs_nash);
  let commit = 'unknown'; try { commit = cp.execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch (e) { /* */ }
  const res = { commit, created: new Date().toISOString(), params: { ITERS, R1, R, M, P, N1, N2, NM, NF }, games, seconds: (Date.now() - t0) / 1000, ids: L.map(l => l.id), final_matrix: Mf, nash_value: vf, rows, history: hist };
  fs.mkdirSync(path.join(__dirname, 'predictions'), { recursive: true });
  const pf = path.join(__dirname, 'predictions', `meta_${res.created.slice(0, 10)}.json`);
  fs.writeFileSync(pf, JSON.stringify(res, null, 1) + '\n');
  console.log('\nPredicted meta (Nash mix of the final matrix):');
  rows.forEach(r => console.log(`  ${r.id.padEnd(12)} share ${(100 * r.nash).toFixed(1).padStart(5)}%  avg WR ${(100 * r.avg_wr).toFixed(1)}%  vs Nash field ${(100 * r.vs_nash).toFixed(1)}%`));
  console.log(`done: ${games} games in ${el()} -> ${path.relative(ROOT, pf)}`);
  ws.forEach(w => w.kill());
}
if (process.argv.includes('--worker')) worker(); else main();
