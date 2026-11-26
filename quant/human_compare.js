// Human vs bot decisions: how often does the bot (the default AI level) make the move a human made in the same position?
// Input: one or more files exported from the game ("Export my decisions" on the end screen). Each human action was
// stored next to the action the bot would have taken from exactly that position, plus every prompt answered next to
// the bot's default answer.
// Usage: node quant/human_compare.js decisions.json [more.json ...] [--out report.json]
'use strict';
const fs = require('fs');
const args = process.argv.slice(2), outI = args.indexOf('--out'), out = outI >= 0 ? args[outI + 1] : null;
const files = args.filter((a, i) => !a.startsWith('--') && !(outI >= 0 && i === outI + 1));
if (!files.length) { console.log('usage: node quant/human_compare.js decisions.json [...] [--out report.json]'); process.exit(1); }
const games = [].concat(...files.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))));
const acts = [], asks = [];
games.forEach((g, gi) => (g.decisions || []).forEach(d => { d.game = gi; d.won = g.won; (d.k === 'action' ? acts : asks).push(d); }));
const valid = acts.filter(d => d.bot && d.bot.k !== 'error');
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
const rate = (xs, f) => ({ n: xs.length, same: xs.filter(f).length });
const group = (xs, key) => { const m = {}; xs.forEach(x => { const k = key(x); (m[k] = m[k] || []).push(x); }); return m; };
const say = a => !a ? '?' : a.k === 'end' ? 'end turn' : a.k === 'move' ? (a.dest === 'base' ? 'recall to base' : 'move/attack') : a.k === 'legend' ? 'legend' : a.k === 'hide' ? 'hide a card' : a.k === 'play' ? 'play a card' : a.k + ' ability';

const R = { games: games.length, wins: games.filter(g => g.won).length, actions: valid.length, prompts: asks.length };
R.agreement = { exact: rate(valid, d => d.same), sameKindAndCard: rate(valid, d => d.loose), sameKind: rate(valid, d => say(d.human) === say(d.bot)),
  prompts: rate(asks, d => JSON.stringify(d.human) === JSON.stringify(d.bot)) };
// by what the human did
R.byHumanAction = Object.entries(group(valid, d => say(d.human))).map(([k, xs]) => ({ action: k, n: xs.length, botSame: xs.filter(d => d.same).length,
  botInstead: Object.entries(group(xs.filter(d => !d.same), d => say(d.bot))).map(([b, ys]) => [b, ys.length]).sort((a, b) => b[1] - a[1]) })).sort((a, b) => b.n - a.n);
// tendencies: does the human end turns, attack or play cards more or less often than the bot would?
const share = (xs, who, kind) => xs.filter(d => say(d[who]) === kind).length / Math.max(1, xs.length);
R.tendencies = ['play a card', 'move/attack', 'end turn', 'recall to base', 'legend', 'hide a card'].map(k => ({ action: k, human: share(valid, 'human', k), bot: share(valid, 'bot', k) }));
// by game phase
R.byTurn = Object.entries(group(valid, d => d.turn <= 4 ? '1-4' : d.turn <= 8 ? '5-8' : d.turn <= 12 ? '9-12' : '13+')).map(([k, xs]) => ({ turns: k, n: xs.length, exact: xs.filter(d => d.same).length }));
R.byDeck = Object.entries(group(valid, d => d.deck)).map(([k, xs]) => ({ deck: k, n: xs.length, exact: xs.filter(d => d.same).length })).sort((a, b) => b.n - a.n);
// cards the human played that the bot wouldn't have (and vice versa)
const cardDiff = (who) => { const m = {}; valid.filter(d => !d.same && d[who] && d[who].card).forEach(d => { m[d[who].card] = (m[d[who].card] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10); };
R.humanPlaysBotDoesnt = cardDiff('human'); R.botPlaysHumanDoesnt = cardDiff('bot');
R.promptTypes = Object.entries(group(asks, d => d.title || d.type)).map(([k, xs]) => ({ prompt: k, n: xs.length, same: xs.filter(d => JSON.stringify(d.human) === JSON.stringify(d.bot)).length })).sort((a, b) => b.n - a.n).slice(0, 12);

console.log(`${R.games} games (${R.wins} won), ${R.actions} actions, ${R.prompts} prompts`);
console.log(`bot makes the same move: ${pct(R.agreement.exact.same, R.agreement.exact.n)} exact, ${pct(R.agreement.sameKindAndCard.same, R.agreement.sameKindAndCard.n)} same card, ${pct(R.agreement.sameKind.same, R.agreement.sameKind.n)} same kind of move; prompts ${pct(R.agreement.prompts.same, R.agreement.prompts.n)}`);
console.log('\nwhen the human...      n   bot agrees   bot would instead');
R.byHumanAction.forEach(r => console.log(`${r.action.padEnd(18)} ${String(r.n).padStart(5)}   ${pct(r.botSame, r.n).padStart(7)}     ${r.botInstead.slice(0, 3).map(([b, n]) => b + ' ' + n).join(', ')}`));
console.log('\nshare of moves         human    bot');
R.tendencies.forEach(t => console.log(`${t.action.padEnd(18)} ${(100 * t.human).toFixed(0).padStart(6)}% ${(100 * t.bot).toFixed(0).padStart(6)}%`));
console.log('\nby turn: ' + R.byTurn.map(t => `${t.turns}: ${pct(t.exact, t.n)} (${t.n})`).join(' | '));
console.log('by deck: ' + R.byDeck.map(t => `${t.deck}: ${pct(t.exact, t.n)} (${t.n})`).join(' | '));
console.log('\nhuman plays, bot would not: ' + R.humanPlaysBotDoesnt.map(([c, n]) => c + ' ' + n).join(', '));
console.log('bot would play, human did not: ' + R.botPlaysHumanDoesnt.map(([c, n]) => c + ' ' + n).join(', '));
console.log('\nprompts: ' + R.promptTypes.map(p => `${p.prompt} ${p.same}/${p.n}`).join(' | '));
if (out) fs.writeFileSync(out, JSON.stringify(R, null, 1) + '\n');
