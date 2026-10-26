// Headless check: loads riftable.html's scripts with a stubbed document/localStorage and plays AI-vs-AI games.
// Usage: node test/sim.js [games=30]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'riftable.html'), 'utf8');
const script = id => { const m = html.match(new RegExp('<script[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)</script>')); if (!m) throw new Error('missing ' + id); return m[1]; };
const el = () => ({ textContent: '', innerHTML: '', classList: { add() {}, remove() {} }, addEventListener() {}, set onclick(f) {} });
const cardsEl = el(); cardsEl.textContent = script('rt-cards');
const ctx = {
  RT_HEADLESS: true, console, setTimeout, Promise,
  document: { getElementById: id => (id === 'rt-cards' ? cardsEl : el()), addEventListener() {}, querySelector: () => el(), documentElement: el() },
  localStorage: { getItem: () => null, setItem() {} }
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(script('rt-engine') + '\n;globalThis.RT = RT;', ctx);
vm.runInContext(script('rt-ui'), ctx);
const RT = ctx.RT;

(async () => {
  const N = +(process.argv[2] || 30), MAX = 200;
  const wins = {}, results = [];
  let crashes = 0, unfinished = 0;
  for (let g = 0; g < N; g++) {
    const a = RT.DECKS[g % 5], b = RT.DECKS[Math.floor(g / 5 + g) % 5];
    let G;
    try {
      G = RT.newGame(a, b, { maxTurns: MAX, names: ['P1', 'P2'] });
      while (G.winner == null) { await RT.aiTurn(G, G.active); RT.endTurn(G); }
    } catch (e) { crashes++; console.error('CRASH', a.name, 'vs', b.name, e.stack); continue; }
    if (G.winner === -1) unfinished++;
    const w = G.winner === 0 ? a.name : G.winner === 1 ? b.name : 'none';
    wins[w] = (wins[w] || 0) + 1;
    results.push(`${String(g + 1).padStart(2)}. ${a.name.padEnd(8)} vs ${b.name.padEnd(8)} → ${w.padEnd(8)} ${G.players[0].points}-${G.players[1].points} in ${G.turnNo} turns`);
  }
  console.log(results.join('\n'));
  console.log('\nWins:', JSON.stringify(wins), '| crashes:', crashes, '| unfinished:', unfinished);
  console.log('\nDeck report:');
  for (const d of RT.DECKS) {
    const cov = RT.deckCoverage(d);
    const uniq = new Map();
    [d.legendCard, ...d.bfCards, ...d.cards].forEach(c => uniq.set(c.name, c));
    let us = 0, ut = 0; uniq.forEach(c => c.P.lines.forEach(l => { ut++; if (l.sim) us++; }));
    console.log(`  ${d.name.padEnd(8)} ${d.found}/${d.total} found | lines simulated: ${cov.sim}/${cov.total} (${Math.round(100 * cov.sim / cov.total)}%) across all copies, ${us}/${ut} (${Math.round(100 * us / ut)}%) unique`);
    d.fixes.forEach(f => console.log(`           ${f[0]} → ${f[1]}`));
  }
  if (crashes || unfinished) process.exit(1);
})();
