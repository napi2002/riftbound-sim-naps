// Human-vs-bot decision recording: a scripted "human" plays through the public action functions with recording on;
// every action must be stored with the bot's alternative, and the bot probe must never fail or change the real game.
'use strict';
const RT = require('../src/engine.js'); RT.loadCards(require('../src/cards.json'));
function mb(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let fails = 0; const check = (name, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) fails++; };
async function play(record, seed) {
  const G = await RT.newGame(RT.DECKS.find(d => d.id === 'kennen'), RT.DECKS.find(d => d.id === 'volibear'), { maxTurns: 200, rnd: mb(seed), human: 0, ask: async req => (/^Showdown/.test(req.title || '') ? null : req.auto) });   // pass in showdowns: with recording on, the default offered there is the level-5 pick
  G.recordHuman = record;
  while (G.winner == null) {
    if (G.active === 0) {
      for (let g = 0; g < 10 && G.winner == null; g++) {
        const c = G.players[0].hand.filter(x => RT.canPlay(G, 0, x.iid, false).ok).sort((a, b) => (b.c.energy || 0) - (a.c.energy || 0))[0];
        if (!c) break; const r = await RT.playCard(G, 0, c.iid, {}); if (r && r.ok === false) break;
      }
      const rdy = G.units.filter(u => u.ctrl === 0 && u.loc === 'base' && !u.ex);
      if (rdy.length && G.winner == null) await RT.moveUnits(G, 0, rdy.map(u => u.uid), 0);
      if (G.winner == null) await RT.endTurn(G);
    } else { await RT.aiTurn(G, 1); if (G.winner == null) await RT.endTurn(G); }
  }
  return G;
}
(async () => {
  for (const seed of [7, 8, 9]) {
    const A = await play(true, seed), B = await play(false, seed);
    const acts = (A.decisions || []).filter(d => d.k === 'action');
    check(`seed ${seed}: actions recorded (${acts.length}) with the bot's move`, acts.length > 3 && acts.every(d => d.bot && d.bot.k && d.human && d.human.k));
    check(`seed ${seed}: the bot probe never errors`, acts.every(d => d.bot.k !== 'error'));
    check(`seed ${seed}: recording doesn't change the game (same winner, turns and log)`, A.winner === B.winner && A.turnNo === B.turnNo && A.log.length === B.log.length);
    check(`seed ${seed}: end-turn decisions are stamped with the turn they were made on`, acts.filter(d => d.human.k === 'end').every(d => d.turn % 2 === acts[0].turn % 2));
  }
  console.log(fails ? fails + ' FAILED' : 'all human-record checks OK'); process.exit(fails ? 1 : 0);
})();
