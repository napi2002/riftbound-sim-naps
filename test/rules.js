// Checks rules fixed after the Core Rules audit (rule numbers from the official Core Rules, 2026-10-09). Usage: node test/rules.js
'use strict';
const RT = require('../src/engine.js');
RT.loadCards(require('../src/cards.json'));
const card = n => { const c = RT.cards().find(x => x.name === n); if (!c) throw new Error('no card ' + n); return c; };
let fails = 0, iid = 600000;
const pass = async req => req.type === 'confirm' ? false : req.type === 'choice' ? (req.optional ? null : 0) : (req.auto != null ? req.auto : req.cands[0]);
function unit(G, pi, name, loc, ready = true) { const u = { G, uid: ++iid, iid: ++iid, c: card(name), owner: pi, ctrl: pi, loc, ex: !ready, damage: 0, buff: 0, temp: 0, tempAssault: 0, stun: 0, equips: [] }; G.units.push(u); return u; }
function check(name, ok, G) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) { fails++; if (G) console.log('   log: ' + G.log.slice(-12).map(l => l.t).join(' | ')); } }
async function fresh(opts) {
  const G = await RT.newGame(RT.DECKS[0], RT.DECKS[1], Object.assign({ human: 0, ask: pass }, opts || {}));
  G.active = 0; G.units.length = 0; G.log.length = 0;
  for (const p of G.players) { p.hand = []; p.hidden = []; p.runes = []; for (let i = 0; i < 8; i++) p.runes.push({ d: i % 2 ? 'Chaos' : 'Order', ex: false }); }
  return G;
}
(async () => {
  let G, u, p;
  // 424.1.a.2: a stun ends at the end of the turn it was applied
  G = await fresh(); u = unit(G, 1, 'Scuttle Crab', 'base'); u.stun = 1; await RT.endTurn(G);
  check('Stun ends at the end of the turn (424.1.a.2)', !u.stun, G);
  // 811.1.b / 356.1.b.1: playing from face down ignores the base Energy and Power cost
  const sw = card('Switcheroo'); G = await fresh();
  const hc = RT.cardCost(sw, false, G, 0, 'hidden');
  check('Hidden card from face down costs no energy and no power (811.1.b)', hc.energy === 0 && hc.power === 0, G);
  // 719.5 / 459.1: Equipment detaches and is recalled to base when its unit dies
  G = await fresh(); p = G.players[0]; u = unit(G, 0, 'Scuttle Crab', 'base');
  const eq = { iid: ++iid, c: card('Long Sword') }; u.equips.push(eq); u.damage = 9;
  const before = p.gear.length; await RT.killUnitForTest(G, u);
  check('Equipment returns to base when its unit dies (719.5)', p.gear.length === before + 1 && p.trash.indexOf(eq) < 0, G);
  // 432.3: burning out with an empty trash still gives the opponent 1 point
  G = await fresh(); p = G.players[0]; p.deck = []; p.trash = []; const pts = G.players[1].points; RT.drawForTest(G, 0);
  check('Burn Out with an empty trash scores 1 for the opponent (432.3)', G.players[1].points === pts + 1, G);
  // 345: the attacker acts first in a showdown
  G = await fresh(); const order = [];
  G.ask = async (req, pi) => { if (req.type === 'choice' && /Showdown/.test(req.title)) order.push(pi); return pass(req); };
  G.human = 0; G.players[0].hand = [{ iid: ++iid, c: card('Discipline') }];
  G.players[1].hidden = []; G.players[1].hand = [{ iid: ++iid, c: card('Discipline') }];
  unit(G, 0, 'Stellacorn Herder', 'base'); unit(G, 1, 'Scuttle Crab', 0); G.bfs[0].ctrl = 1;
  await RT.moveUnits(G, 0, [G.units[0].uid], 0);
  check('Attacker gets the first showdown action (345)', order[0] === 0, G);
  // 316.8.b.1 / 348.2: moving onto an empty battlefield opens a showdown the opponent can answer
  G = await fresh(); let asked = false;
  G.human = 1; G.ask = async (req, pi) => { if (pi === 1 && req.type === 'choice' && /Showdown/.test(req.title)) asked = true; return pass(req); };
  G.players[1].hand = [{ iid: ++iid, c: card('Gust') }]; u = unit(G, 0, 'Stellacorn Herder', 'base');
  await RT.moveUnits(G, 0, [u.uid], 0);
  check('Opponent may respond before an empty battlefield is conquered (348.2)', asked && G.bfs[0].ctrl === 0, G);
  // 812.1.b.1: Legion counts only your own cards
  G = await fresh(); G.playedBy = [0, 1];
  check("Legion ignores the opponent's cards (812.1.b.1)", RT.cardCost(card('Noxus Hopeful'), false, G, 0, 'hand').energy === (card('Noxus Hopeful').energy || 0), G);
  // Star Spring: only the first non-token unit a player plays there each turn may send another unit home
  const spring = async (pre) => {
    const G = await fresh(); let asks = 0;
    G.ask = async (req) => { if (/Star Spring/.test(req.title || '')) asks++; return pass(req); };
    G.bfs[0].c = card('Star Spring'); G.bfs[0].ctrl = 0;
    if (pre) unit(G, 0, 'Scuttle Crab', 0);
    for (const n of ['Lonely Poro', 'Scuttle Crab']) { const h = { iid: ++iid, c: card(n) }; G.players[0].hand.push(h); await RT.playCard(G, 0, h.iid, { loc: 0 }); }
    return { G, asks };
  };
  let sp = await spring(false);
  check('Star Spring: a second unit played the same turn does not trigger it', sp.asks === 0 && RT.unitsAt(sp.G, 0, 0).length === 2, sp.G);
  sp = await spring(true);
  check('Star Spring: the first unit played next to another unit offers the move once', sp.asks === 1, sp.G);
  // LeBlanc's legend: the player chooses which card to discard
  G = await fresh(); let lbAsked = null;
  G.ask = async (req) => { if (req.type === 'choice' && /discard/i.test(req.text || '')) { lbAsked = req.options.slice(); return req.options.indexOf('Ruined Rex'); } return req.type === 'confirm' ? true : pass(req); };
  G.players[0].legend.c = card('LeBlanc - Deceiver'); G.players[0].legend.exhausted = false;
  G.players[0].hand = [{ iid: ++iid, c: card('Soaring Scout') }, { iid: ++iid, c: card('Ruined Rex') }];
  unit(G, 0, 'Scuttle Crab', 0); G.bfs[0].ctrl = 0;
  await RT.leblancForTest(G, 0, { loc: 0 });
  check("LeBlanc legend asks which card to discard", lbAsked && lbAsked.length === 2 && G.players[0].trash.some(x => x.c.name === 'Ruined Rex') && G.players[0].hand.some(x => x.c.name === 'Soaring Scout'), G);
  // Mordekaiser's legend: the player picks the banished card; the power pays a unit's power cost (saving a rune)
  // and can't be spent on anything else, even right after the UI checked which cards are playable
  G = await fresh(); let mAsked = null; p = G.players[0];
  G.ask = async (req) => { if (req.type === 'choice' && /banish/i.test(req.text || '')) { mAsked = req.options.slice(); return req.options.indexOf('Vanguard Captain'); } return pass(req); };
  p.legend.c = card('Mordekaiser - Iron Revenant'); p.legend.exhausted = false;
  p.trash = [{ iid: ++iid, c: card('Carrion Dredger') }, { iid: ++iid, c: card('Vanguard Captain') }];
  p.runes = [0, 1, 2, 3, 4].map(() => ({ d: 'Order', ex: false }));
  const sm = { iid: ++iid, c: card('Spectral Matron') }; p.hand = [sm, { iid: ++iid, c: card('Hidden Blade') }];
  await RT.useLegend(G, 0, 0, []);
  RT.canPlay(G, 0, sm.iid, false);   // a UI check on a unit must not leave the unit/gear-only power spendable elsewhere
  G.bfs[0].ctrl = 0; RT.hideCard(G, 0, p.hand[1].iid, 0);
  const keptPool = p.poolPowerUG === 1, runesBefore = p.runes.length;
  await RT.playCard(G, 0, sm.iid, {});
  check("Mordekaiser legend: you pick the banish, its power is for units/gear only and pays Spectral Matron",
    mAsked && mAsked.length === 2 && !p.trash.some(x => x.c.name === 'Vanguard Captain') && keptPool && p.poolPowerUG === 0 && runesBefore - p.runes.length === 1, G);

  // Equipment abilities (text restored from riftbound.gg): Guardian Angel saves the unit, Brutalizer's fresh bonus
  G = await fresh(); u = unit(G, 0, 'Lonely Poro', 'base'); const ga = { iid: ++iid, c: card('Guardian Angel'), owner: 0, ex: false }; u.equips.push(ga);
  unit(G, 1, 'Mega-Mech', 0); G.bfs[0].ctrl = 1;
  await RT.moveUnits(G, 0, [u.uid], 0);
  check('Guardian Angel: the unit survives, healed, exhausted and recalled; the Angel is killed', !u.dead && u.loc === 'base' && u.ex && !u.damage && !u.equips.length && G.players[0].trash.some(x => x.c.name === 'Guardian Angel'), G);
  G = await fresh(); u = unit(G, 0, 'Lonely Poro', 'base'); const br = { iid: ++iid, c: card('Brutalizer'), owner: 0, ex: false, attachTurn: G.turnNo }; u.equips.push(br);
  const fresh3 = RT.might(u); br.attachTurn = G.turnNo - 1;
  check('Brutalizer: +2 more Might on the turn it was attached', fresh3 - RT.might(u) === 2, G);  console.log(fails ? fails + ' FAILED' : 'all rules checks OK');
  process.exit(fails ? 1 : 0);
})();
