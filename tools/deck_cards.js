// Prints the names of every card used by the built-in decks (legends, champions, battlefields, main decks) as JSON.
const RT = require('../src/engine.js');
RT.loadCards(require('../src/cards.json'));
const names = new Set();
for (const d of RT.DECKS) [d.legendCard, d.championCard, ...d.bfCards, ...d.cards].forEach(c => c && names.add(c.name));
console.log(JSON.stringify([...names].sort()));
