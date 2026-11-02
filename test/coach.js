// Pro coach smoke test: seeded AI-vs-AI games, the report has grades, drills, a score race and no crash. Usage: node test/coach.js
'use strict';
const RT = require('../src/engine.js'); RT.loadCards(require('../src/cards.json'));
const Coach = require('../src/coach.js');
function m(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
(async () => {
  let fails = 0;
  for (const [a, b, seed] of [['leblanc', 'kennen', 5], ['riven', 'masteryi', 9], ['azir', 'rengar', 3], ['seraphine', 'jayce', 7]]) {
    const G = await RT.newGame(RT.DECKS.find(d => d.id === a), RT.DECKS.find(d => d.id === b), { maxTurns: 200, rnd: m(seed) });
    while (G.winner == null) { await RT.aiTurn(G, G.active); await RT.endTurn(G); }
    const R = Coach.analyse(RT, G, 0), h = Coach.html(R, String);
    const ok = R.overall >= 0 && R.overall <= 100 && R.grades.opening != null && R.race[0].length === G.turnNo + 1 &&
      R.race[0][G.turnNo] === G.players[0].points && R.sections.length >= 4 && h.indexOf('Pro coach') >= 0;
    console.log((ok ? 'PASS ' : 'FAIL ') + a + ' vs ' + b + ': ' + Coach.letter(R.overall) + ' ' + JSON.stringify(R.grades));
    if (!ok) fails++;
  }
  console.log(fails ? fails + ' FAILED' : 'all coach checks OK');
  process.exit(fails ? 1 : 0);
})();
