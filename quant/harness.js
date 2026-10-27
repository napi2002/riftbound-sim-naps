// Seeded, mirrored round robin of the engine's AI-vs-AI games.
// For each deck pair (i<j) and each seed k = 1..N, play A-vs-B and B-vs-A with the SAME seed
// (seat 0 / seat 1 swapped). The seed feeds mulberry32, passed to newGame as opts.rnd, which is
// the engine's only randomness source. Seeds are shared across pairs (common random numbers).
//
// Usage: node quant/harness.js --pairs-per-matchup N [--decks a,b,c] [--workers W] [--seed-base S]
//                              [--max-turns T] [--out path.csv] [--check-determinism K]
// Writes quant/data/sim/<engine short sha>_<N>.csv, one row per game:
//   commit,seed,first,second,winner_deck,turns,seat0,seat1
//   first/second = the deck that took the first / second turn; seat0/seat1 = deckA/deckB as passed
//   to newGame; winner_deck = deck id, or 'draw' when the game hit the turn cap.
'use strict';
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const ENGINE = path.join(ROOT, 'src/engine.js'), CARDS = path.join(ROOT, 'src/cards.json');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// seed for the k-th seed pair: a hash of (base, k) so seeds are well spread
function seedFor(base, k) { return (mulberry32((base * 2654435761 + k * 40503) >>> 0)() * 4294967296) >>> 0; }

let RT = null;
function engine() {
  if (!RT) { RT = require(ENGINE); RT.loadCards(JSON.parse(fs.readFileSync(CARDS, 'utf8'))); }
  return RT;
}
async function playOne(idA, idB, seed, maxTurns, wantLog) {
  const R = engine();
  const dA = R.DECKS.find(d => d.id === idA), dB = R.DECKS.find(d => d.id === idB);
  const G = await R.newGame(dA, dB, { maxTurns, rnd: mulberry32(seed) });
  while (G.winner == null) { await R.aiTurn(G, G.active); await R.endTurn(G); }
  const ids = [idA, idB];
  const res = { seed, seat0: idA, seat1: idB, first: ids[G.first], second: ids[1 - G.first],
    winner_deck: G.winner === 0 || G.winner === 1 ? ids[G.winner] : 'draw', turns: G.turnNo };
  if (wantLog) res.log = G.log.map(l => l.t).join('\n');
  return res;
}

// ---------- worker mode ----------
if (process.argv[2] === '--worker') {
  process.on('message', async ({ jobs, maxTurns }) => {
    const out = [];
    for (const j of jobs) out.push(Object.assign({ idx: j.idx }, await playOne(j.a, j.b, j.seed, maxTurns, false)));
    process.send(out, () => process.exit(0));
  });
  return;
}

// ---------- stats ----------
function wilson(k, n, z = 1.96) {
  if (!n) return [NaN, NaN];
  const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [(c - h) / d, (c + h) / d];
}
function ranks(v) {
  const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length);
  for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2 + 1; i = j + 1; }
  return r;
}
function pearson(x, y) {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}
const spearman = (x, y) => pearson(ranks(x), ranks(y));
function permP(x, y, B = 20000) { // two-sided permutation p for Spearman, fixed RNG
  const r0 = Math.abs(spearman(x, y)), rx = ranks(x), ry = ranks(y).slice(), rnd = mulberry32(12345); let hit = 0;
  for (let b = 0; b < B; b++) { for (let i = ry.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ry[i], ry[j]] = [ry[j], ry[i]]; } if (Math.abs(pearson(rx, ry)) >= r0 - 1e-12) hit++; }
  return (hit + 1) / (B + 1);
}

function arg(name, def) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : def; }
function gitSha() {
  try {
    const sha = cp.execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = cp.execSync('git status --porcelain -- src/engine.js src/cards.json', { cwd: ROOT }).toString().trim();
    return dirty ? sha + '-dirty' : sha;
  } catch (e) { return 'nogit'; }
}

async function checkDeterminism(K, ids, base, maxTurns) {
  // same seed twice in this process, compared on the full game log
  let same = 0, diff = [];
  for (let k = 1; k <= K; k++) {
    const a = ids[(k - 1) % ids.length], b = ids[k % ids.length], s = seedFor(base, k);
    const r1 = await playOne(a, b, s, maxTurns, true), r2 = await playOne(a, b, s, maxTurns, true);
    if (r1.log === r2.log && r1.winner_deck === r2.winner_deck && r1.turns === r2.turns) same++; else diff.push(`${a} vs ${b} seed ${s}`);
  }
  console.log(`determinism (in-process, same seed twice, full log compared): ${same}/${K} identical` + (diff.length ? '; differ: ' + diff.join(', ') : ''));
  return diff.length === 0;
}

(async () => {
  const N = parseInt(arg('--pairs-per-matchup', '0'), 10);
  const R = engine();
  const ids = (arg('--decks', '') || R.DECKS.map(d => d.id).join(',')).split(',').map(s => s.trim()).filter(Boolean);
  for (const id of ids) if (!R.DECKS.find(d => d.id === id)) { console.error('unknown deck ' + id + '; known: ' + R.DECKS.map(d => d.id).join(',')); process.exit(1); }
  const base = parseInt(arg('--seed-base', '1'), 10), maxTurns = parseInt(arg('--max-turns', '200'), 10);
  const K = parseInt(arg('--check-determinism', '0'), 10);
  if (K) { const ok = await checkDeterminism(K, ids, base, maxTurns); if (!N) process.exit(ok ? 0 : 2); }
  if (!N) { console.error('usage: node quant/harness.js --pairs-per-matchup N [--decks a,b,c] [--workers W]'); process.exit(1); }

  const jobs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = 1; k <= N; k++) {
    const seed = seedFor(base, k);
    jobs.push({ idx: jobs.length, a: ids[i], b: ids[j], seed }, { idx: jobs.length + 1, a: ids[j], b: ids[i], seed });
  }
  const W = Math.max(1, Math.min(parseInt(arg('--workers', String(os.cpus().length)), 10), jobs.length));
  const commit = gitSha();
  const t0 = Date.now();
  console.log(`${ids.length} decks, ${jobs.length} games (${N} seed pairs x ${ids.length * (ids.length - 1) / 2} matchups x 2 seats), ${W} workers, engine ${commit}`);
  const chunks = Array.from({ length: W }, () => []);
  jobs.forEach((j, i) => chunks[i % W].push(j));
  const parts = await Promise.all(chunks.map(ch => new Promise((res, rej) => {
    const w = cp.fork(__filename, ['--worker']); let got = null;
    w.on('message', m => { got = m; }); w.on('exit', c => c === 0 && got ? res(got) : rej(new Error('worker exit ' + c)));
    w.send({ jobs: ch, maxTurns });
  })));
  const rows = [].concat(...parts).sort((a, b) => a.idx - b.idx);
  const secs = (Date.now() - t0) / 1000;

  const outDir = path.join(__dirname, 'data/sim'); fs.mkdirSync(outDir, { recursive: true });
  const out = arg('--out', path.join(outDir, `${commit}_${N}.csv`));
  fs.writeFileSync(out, 'commit,seed,first,second,winner_deck,turns,seat0,seat1\n' +
    rows.map(r => [commit, r.seed, r.first, r.second, r.winner_deck, r.turns, r.seat0, r.seat1].join(',')).join('\n') + '\n');

  // ---------- report ----------
  const st = {}; ids.forEach(id => st[id] = { w: 0, l: 0, d: 0 });
  let firstWins = 0, decided = 0, draws = 0, mirroredStarter = 0, pairs = 0, turns = 0;
  for (const r of rows) {
    turns += r.turns;
    if (r.winner_deck === 'draw') { draws++; st[r.seat0].d++; st[r.seat1].d++; continue; }
    decided++; if (r.winner_deck === r.first) firstWins++;
    const lo = r.winner_deck === r.seat0 ? r.seat1 : r.seat0; st[r.winner_deck].w++; st[lo].l++;
  }
  for (let i = 0; i + 1 < rows.length; i += 2) { pairs++; if (rows[i].first !== rows[i + 1].first) mirroredStarter++; }
  console.log(`done in ${secs.toFixed(1)}s (${(rows.length / secs).toFixed(0)} games/s); avg ${(turns / rows.length).toFixed(1)} turns; draws ${draws}; wrote ${path.relative(ROOT, out)}`);
  console.log(`mirrored pairs where the starting deck swapped: ${mirroredStarter}/${pairs}`);
  const [fl, fh] = wilson(firstWins, decided);
  console.log(`first-player win rate: ${(100 * firstWins / decided).toFixed(1)}% [${(100 * fl).toFixed(1)}, ${(100 * fh).toFixed(1)}] of ${decided} decided games`);
  console.log('\ndeck         sim WR   95% Wilson CI      W-L-D          real WR   real n');
  const table = ids.map(id => { const s = st[id], n = s.w + s.l; return { id, wr: s.w / n, ci: wilson(s.w, n), s, real: R.real(id) }; })
    .sort((a, b) => b.wr - a.wr);
  for (const t of table) console.log(`${t.id.padEnd(12)} ${(100 * t.wr).toFixed(1).padStart(5)}%  [${(100 * t.ci[0]).toFixed(1)}, ${(100 * t.ci[1]).toFixed(1)}]`.padEnd(39) +
    `${t.s.w}-${t.s.l}-${t.s.d}`.padEnd(15) + (t.real ? `${(100 * t.real.wr).toFixed(0)}%`.padStart(7) + String(t.real.n).padStart(9) : '   n/a'));
  const summary = { commit, N, decks: ids, games: rows.length, seconds: secs, draws, first_player_wr: firstWins / decided, first_player_ci: [fl, fh],
    real_date: R.REAL_DATE, per_deck: table.map(t => ({ id: t.id, wr: t.wr, ci: t.ci, w: t.s.w, l: t.s.l, d: t.s.d, real_wr: t.real && t.real.wr, real_n: t.real && t.real.n })), spearman: {} };
  // 15x15 matchup matrix (seat-averaged): wins of the row deck against the column deck, and games played.
  const mx = {}; ids.forEach(a => { mx[a] = {}; ids.forEach(b => { if (a !== b) mx[a][b] = { w: 0, n: 0 }; }); });
  for (const r of rows) {
    if (r.winner_deck === 'draw') continue;
    const a = r.seat0, b = r.seat1; mx[a][b].n++; mx[b][a].n++;
    if (r.winner_deck === a) mx[a][b].w++; else mx[b][a].w++;
  }
  summary.matrix = mx;
  for (const [label, minN] of [['all', 0], ['n>1000', 1000]]) {
    const sel = table.filter(t => t.real && t.real.n > minN);
    if (sel.length < 4) { console.log(`Spearman vs real (${label}): too few decks (${sel.length})`); continue; }
    const rho = spearman(sel.map(t => t.wr), sel.map(t => t.real.wr)), p = permP(sel.map(t => t.wr), sel.map(t => t.real.wr));
    summary.spearman[label] = { k: sel.length, rho, perm_p: p };
    console.log(`Spearman sim WR vs real WR (${label}, k=${sel.length}): rho=${rho.toFixed(3)}  permutation p=${p.toFixed(4)}  (real data as of ${R.REAL_DATE}; in-sample, exploratory)`);
  }
  fs.writeFileSync(out.replace(/\.csv$/, '_summary.json'), JSON.stringify(summary, null, 1) + '\n');
})();
