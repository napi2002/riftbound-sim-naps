// Sets up each battlefield used by the built-in decks and checks its effect happens. Usage: node test/battlefields.js
'use strict';
const RT = require('../src/engine.js');
RT.loadCards(require('../src/cards.json'));
const card = n => { const c = RT.cards().find(x => x.name === n); if (!c) throw new Error('no card ' + n); return c; };
let fails = 0, iid = 500000;
const yes = async req => req.type === 'confirm' ? true : req.type === 'choice' ? (req.auto != null ? req.auto : req.optional ? null : 0) : (req.auto != null ? req.auto : req.cands[0]);
async function setup(bfName) {
  const G = await RT.newGame(RT.DECKS[0], RT.DECKS[1], { human: 0, ask: yes });
  G.bfs[0] = { c: card(bfName), ctrl: null };
  G.active = 0; G.log.length = 0;
  for (const p of G.players) { p.runes = []; for (let i = 0; i < 8; i++) p.runes.push({ d: i % 2 ? 'Chaos' : 'Order', ex: false }); }
  return G;
}
function unit(G, pi, name, loc, ready = true) { const u = { G, uid: ++iid, iid: ++iid, c: card(name), owner: pi, ctrl: pi, loc, ex: !ready, damage: 0, buff: 0, temp: 0, tempAssault: 0, stun: 0, equips: [] }; G.units.push(u); return u; }
function check(name, ok, G) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) { fails++; console.log('   log: ' + G.log.map(l => l.t).join(' | ')); } }
const has = (G, re) => G.log.some(l => re.test(l.t));
(async () => {
  let G, u, p;
  G = await setup('Zaun Warrens'); p = G.players[0]; p.hand = [{ iid: 1, c: card('Gust') }]; u = unit(G, 0, 'Stellacorn Herder', 'base');
  const h0 = p.hand.length; await RT.moveUnits(G, 0, [u.uid], 0); check('Zaun Warrens: conquer -> discard 1, then draw 1', has(G, /You discard/) && has(G, /Zaun Warrens: draw 1/), G);
  G = await setup('Minefield'); p = G.players[0]; const d0 = p.deck.length, t0 = p.trash.length; u = unit(G, 0, 'Stellacorn Herder', 'base');
  await RT.moveUnits(G, 0, [u.uid], 0); check('Minefield: conquer -> top 2 of deck to trash', p.trash.length - t0 >= 2, G);
  G = await setup('Shadow Temple'); p = G.players[0]; unit(G, 0, 'Stellacorn Herder', 0); G.bfs[0].ctrl = 0; const tt = p.trash.length; G.active = 1; await RT.endTurn(G);
  check('Shadow Temple: hold -> Burn 3', p.trash.length - tt === 3, G);
  G = await setup('Dusk Rose Lab'); p = G.players[0]; const tok = unit(G, 0, 'Stellacorn Herder', 0); unit(G, 0, 'Tideturner', 0); G.bfs[0].ctrl = 0; G.active = 1; const hd = p.hand.length; await RT.endTurn(G);
  check('Dusk Rose Lab: start of turn -> may kill a unit here to draw 1', has(G, /Dusk Rose Lab: You kill/), G);
  G = await setup('Star Spring'); p = G.players[0]; const other = unit(G, 0, 'Tideturner', 0); G.bfs[0].ctrl = 0; p.hand.push({ iid: 77, c: card('Inferna') });
  await RT.playCard(G, 0, 77, { loc: 0 }); check('Star Spring: first unit played here -> may move another unit here to base', other.loc === 'base', G);
  G = await setup('Windswept Hillock'); u = unit(G, 0, 'Stellacorn Herder', 0); check('Windswept Hillock: units here have Ganking', RT.canMove(G, u, 1), G);
  G = await setup("Emperor's Dais"); p = G.players[0]; unit(G, 0, 'Tideturner', 'base'); u = unit(G, 0, 'Stellacorn Herder', 'base');
  await RT.moveUnits(G, 0, G.units.filter(x => x.ctrl === 0).map(x => x.uid), 0); check("Emperor's Dais: conquer -> pay 1, return a unit, play a 2 Might Sand Soldier", G.units.some(x => x.c.name === 'Sand Soldier' && x.loc === 0), G);
  G = await setup('Seat of Power'); p = G.players[0]; unit(G, 0, 'Tideturner', 1); G.bfs[1].ctrl = 0; u = unit(G, 0, 'Stellacorn Herder', 'base'); const hs = p.hand.length;
  await RT.moveUnits(G, 0, [u.uid], 0); check('Seat of Power: conquer -> draw 1 per other battlefield you control', has(G, /Seat of Power: draw 1/), G);
  G = await setup('Abandoned Hall'); p = G.players[0]; u = unit(G, 0, 'Stellacorn Herder', 0); p.hand.push({ iid: 78, c: card('Discipline') });
  await RT.playCard(G, 0, 78, {}); check('Abandoned Hall: you play a spell -> a unit here gets +1 Might', has(G, /Abandoned Hall gives/), G);
  G = await setup('Sunken Temple'); p = G.players[0]; u = unit(G, 0, 'Blitzcrank - Impassive', 'base');
  await RT.moveUnits(G, 0, [u.uid], 0); check('Sunken Temple: conquer with a Mighty unit -> pay 1 to draw 1', has(G, /Sunken Temple: draw 1/), G);
  G = await setup("Targon's Peak"); p = G.players[0]; u = unit(G, 0, 'Stellacorn Herder', 'base'); await RT.moveUnits(G, 0, [u.uid], 0);
  p.runes.forEach(r => r.ex = true); await RT.endTurn(G); check("Targon's Peak: conquer -> ready 2 runes at end of turn", p.runes.filter(r => !r.ex).length === 2, G);
  G = await setup('Back-Alley Bar'); u = unit(G, 0, 'Stellacorn Herder', 0); await RT.moveUnits(G, 0, [u.uid], 'base'); check('Back-Alley Bar: unit moving from here gets +1 Might', u.temp === 1, G);
  G = await setup('Void Gate'); p = G.players[0]; const foe = unit(G, 1, 'Black Rose Dignitary', 0); p.hand.push({ iid: 79, c: card('Shuriken Flip') });
  G.players[0].runes.push({ d: 'Fury', ex: false }, { d: 'Calm', ex: false }); await RT.playCard(G, 0, 79, {});
  check('Void Gate: spell damage to a unit here +1', has(G, /Void Gate \+1/), G);
  console.log(fails ? fails + ' FAILED' : 'all battlefields OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
