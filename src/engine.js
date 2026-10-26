/* Rift Table engine: card parser, rules, AI. No DOM access except reading the embedded card JSON. */
'use strict';
var RT = (function () {
  var WIN = 8;
  var DOMAIN_COLORS = { Fury: '#d8413a', Calm: '#3a9d57', Mind: '#3b78d6', Body: '#e88a2a', Chaos: '#8a4bc8', Order: '#cfa22a', Colorless: '#8a8f98' };
  var norm = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); };

  /* ---------------- decks ---------------- */
  // Decklist names missing from Riftcodex, mapped to the closest real card. Currently none are needed.
  var FIXES = {};
  function L(s) { return s.split(';').map(function (x) { x = x.trim(); var i = x.indexOf(' '); return [+x.slice(0, i), x.slice(i + 1)]; }); }
  var DECKS = [
    { id: 'kennen', name: 'Kennen', label: 'LA Regional 27th', legend: 'Heart of the Tempest', champion: 'Kennen, Storm of Shuriken', runes: { Chaos: 9, Order: 3 },
      bfs: ['Zaun Warrens', 'Minefield', 'Shadow Temple'],
      list: L("1 Kennen, Storm of Shuriken; 3 Lightning Rush; 3 Rhasa the Sunderer; 3 Seal of Discord; 3 Shadow Order Disciple; 3 Tail-Cloaked Matriarch; 3 Traveling Merchant; 2 Fizz - Trickster; 2 Last Rites; 2 Star-Crossed; 2 Switcheroo; 2 Tornado Warrior; 1 Baron Nashor; 1 Existential Dread; 1 Ezreal, Prodigy; 1 Flash; 1 Gust; 1 Ride The Wind; 1 Salvage; 1 Shadows of the Past; 1 The Harrowing; 1 Tideturner; 1 Treasure Hunter") },
    { id: 'leblanc', name: 'LeBlanc', label: 'LA Regional 12th', legend: 'LeBlanc, Deceiver', champion: 'LeBlanc, Fragmented', runes: { Mind: 4, Order: 8 },
      bfs: ['Dusk Rose Lab', 'Star Spring', 'Windswept Hillock'],
      list: L('1 LeBlanc, Fragmented; 2 Honest Broker; 3 Soaring Scout; 2 Watchful Sentry; 3 Black Rose Dignitary; 3 Karthus, Eternal; 3 Glasc Mixologist; 3 Vi, Peacekeeper; 3 Ruined Rex; 1 Thousand-Tailed Watcher; 3 Harnessed Dragon; 3 Rift Herald; 3 Baited Hook; 3 Sacrifice; 1 Deathgrip; 1 Hidden Blade; 2 Mirror Image') },
    { id: 'rengar', name: 'Rengar', label: 'LA Regional 1st', legend: 'Rengar, Pridestalker', champion: 'Rengar, Trophy Hunter', runes: { Fury: 4, Body: 8 },
      bfs: ["Emperor's Dais", 'Seat of Power', 'Star Spring'],
      list: L("1 Rengar, Trophy Hunter; 3 Inferna; 3 Irresistible Faefolk; 3 Pit Rookie; 2 First Mate; 3 Grim Apothecary; 3 Kinkou Initiate; 2 Nidalee, Cat Form; 1 Pakaa Cub; 1 Pyke, Dockside Butcher; 3 Kai'Sa, Survivor; 3 Noxus Hopeful; 1 Darius, Trifarian; 1 Ferrous Forerunner; 3 Punch First; 3 Sabotage; 2 Thrill of the Hunt; 2 Rampage") },
    { id: 'irelia', name: 'Irelia', label: 'LA Regional 2nd', legend: 'Irelia, Blade Dancer', champion: 'Irelia, Fervent', runes: { Calm: 6, Chaos: 6 },
      bfs: ['Abandoned Hall', 'Sunken Temple', "Targon's Peak"],
      list: L("1 Irelia, Fervent; 3 Scuttle Crab; 3 Tideturner; 1 Pyke, Returned; 1 Akali, Silent; 3 Stellacorn Herder; 1 Vex, Apathetic; 1 Guardian Angel; 2 Zhonya's Hourglass; 2 Boots of Swiftness; 2 Charm; 3 Defiant Dance; 3 Defy; 2 En Garde; 1 Gust; 1 Twilight Shroud; 1 Abandon; 3 Discipline; 1 Flash; 1 Not So Fast; 2 Ride the Wind; 2 Star-Crossed") },
    { id: 'akali', name: 'Akali', label: 'Rogue Assassin', legend: 'Akali, Rogue Assassin', champion: 'Akali, Silent', runes: { Calm: 6, Fury: 6 },
      bfs: ['Back-Alley Bar', 'Star Spring', 'Void Gate'],
      list: L("1 Akali, Silent; 2 Charm; 3 Defy; 3 Shuriken Flip; 2 Twilight Shroud; 3 Discipline; 3 Inferna; 3 Lonely Poro; 3 Mask of Foresight; 3 Mournful Witness; 2 Scuttle Crab; 3 Zhonya's Hourglass; 2 Back Off; 3 Pendulum Blade; 3 Stellacorn Herder; 1 Irelia, Fervent") }
  ];

  /* ---------------- card data + parser ---------------- */
  var CARDS = [], BYNORM = {};
  function loadCards(arr) {
    CARDS = arr; BYNORM = {};
    arr.forEach(function (c) { BYNORM[norm(c.name)] = c; });
    arr.forEach(function (c) { c.P = parseCard(c); });
    DECKS.forEach(resolveDeck);
  }
  function findCard(name) {
    var c = BYNORM[norm(name)];
    if (c) return { c: c, fixed: null };
    if (FIXES[name] && BYNORM[norm(FIXES[name])]) return { c: BYNORM[norm(FIXES[name])], fixed: FIXES[name] };
    return { c: null, fixed: null };
  }
  function resolveDeck(d) {
    d.fixes = []; d.found = 0; d.total = 0; d.cards = [];
    var fixes = d.fixes;
    fixes.push = function (pair) { if (!fixes.some(function (f) { return f[0] === pair[0]; })) Array.prototype.push.call(fixes, pair); };
    var leg = findCard(d.legend), ch = findCard(d.champion);
    if (leg.fixed) d.fixes.push([d.legend, leg.fixed]);
    if (ch.fixed) d.fixes.push([d.champion, ch.fixed]);
    d.legendCard = leg.c; d.championCard = ch.c;
    d.bfCards = d.bfs.map(function (n) { var r = findCard(n); if (r.fixed) d.fixes.push([n, r.fixed]); return r.c; }).filter(Boolean);
    d.list.forEach(function (e) {
      d.total += e[0];
      var r = findCard(e[1]);
      if (r.fixed) d.fixes.push([e[1], r.fixed]);
      if (r.c) { d.found += e[0]; for (var i = 0; i < e[0]; i++) d.cards.push(r.c); }
    });
  }

  var KNOWN_KW = ['Assault', 'Shield', 'Tank', 'Ganking', 'Accelerate', 'Deflect', 'Backline', 'Hunt', 'Temporary', 'Ambush', 'Hidden', 'Reaction', 'Action', 'Equip'];
  var SKIP = /\b(if|unless|for each|instead|choose one|counter|copy|banish|reveal|look at|while|can't|costs?|recycle|from your trash|predict|spend)\b/i;

  function richToLines(rich) {
    var s = String(rich || '')
      .replace(/<\/p>\s*<p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<li>/gi, '\n').replace(/<[^>]+>/g, '')
      .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/:rb_might:/g, ' Might ').replace(/:rb_energy_(\d+):/g, ' $1 energy ').replace(/:rb_exhaust:/g, ' exhaust ')
      .replace(/:rb_rune_(\w+?):/g, function (m, x) { return ' ' + x + ' rune '; });
    return s.split('\n').map(function (l) { return l.replace(/[ \t]+/g, ' ').replace(/ ([,.:])/g, '$1').trim(); }).filter(Boolean);
  }
  function stripReminder(t) {
    var prev;
    do { prev = t; t = t.replace(/\s*\([^()]*\)/g, ''); } while (t !== prev);
    return t.replace(/\s+/g, ' ').trim();
  }

  var NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };
  function parseTarget(s) {
    var maxMight = null;
    s = s.replace(/ with (\d+) might or less/, function (m, n) { maxMight = +n; return ''; }).trim();
    s = s.replace(/^up to one /, 'an ');
    var t = null;
    if (s === 'me' || s === 'this') t = { sel: 'self' };
    else if (s === 'it') t = { sel: 'it' };
    else if (s === 'all enemy units here') t = { sel: 'allEnemyHere' };
    else if (s === 'your other units here') t = { sel: 'otherFriendlyHere' };
    else {
      var m = s.match(/^(an? enemy unit|(?:a|another) friendly unit|another unit|a unit)( at a battlefield| here)?$/);
      if (!m) return null;
      var sel = /enemy/.test(m[1]) ? 'enemy' : /friendly/.test(m[1]) ? 'friendly' : 'any';
      t = { sel: sel, where: m[2] ? (m[2].indexOf('here') >= 0 ? 'here' : 'bf') : null, other: /another/.test(m[1]) };
    }
    if (maxMight != null) t.maxMight = maxMight;
    return t;
  }
  function parseEffect(p) {
    var s = p.toLowerCase().replace(/\.$/, '').replace(/^(you may|then) /, '').trim(), m, t;
    if ((m = s.match(/^draw (\d+)$/))) return { op: 'draw', n: +m[1] };
    if ((m = s.match(/^deal (\d+) to (.+)$/)) && (t = parseTarget(m[2]))) return { op: 'deal', n: +m[1], t: t };
    if ((m = s.match(/^kill (.+)$/)) && (t = parseTarget(m[1]))) return { op: 'kill', t: t };
    if ((m = s.match(/^\[?stun\]? (.+)$/)) && (t = parseTarget(m[1]))) return { op: 'stun', t: t };
    if ((m = s.match(/^\[?buff\]? (.+)$/)) && (t = parseTarget(m[1]))) return { op: 'buff', t: t };
    if ((m = s.match(/^give (.+?) ([+-]\d+) might this turn$/)) && (t = parseTarget(m[1]))) return { op: 'might', n: +m[2], t: t };
    if ((m = s.match(/^ready (.+)$/)) && (t = parseTarget(m[1]))) return { op: 'ready', t: t };
    if ((m = s.match(/^(?:move|return) (.+?) to (?:its|their) (?:owner's |owners' )?base$/)) && (t = parseTarget(m[1]))) return { op: 'tobase', t: t };
    if ((m = s.match(/^return (.+?) to (?:its|their) owner'?s'? hands?$/)) && (t = parseTarget(m[1]))) return { op: 'tohand', t: t };
    if ((m = s.match(/^channel (\d+) runes? exhausted$/))) return { op: 'channel', n: +m[1] };
    if ((m = s.match(/^gain (\d+) xp$/))) return { op: 'xp', n: +m[1] };
    if ((m = s.match(/^play (a|an|one|two|three|four|\d+) (ready )?(\d+) might ([a-z' -]+?) unit tokens?(?: with \[(\w+)(?: (\d+))?\])?(?: (here|to your base|in your base))?$/))) {
      var kw = {};
      if (m[5]) kw[m[5].toLowerCase()] = m[6] ? +m[6] : true;
      return { op: 'token', count: NUMW[m[1]] || +m[1], ready: !!m[2], might: +m[3], name: m[4].replace(/\b\w/g, function (x) { return x.toUpperCase(); }), kw: kw, here: m[7] === 'here' };
    }
    if ((m = s.match(/^discard (\d+)$/))) return { op: 'discard', n: +m[1] };
    if ((m = s.match(/^score (\d+) points?$/))) return { op: 'score', n: +m[1] };
    return null;
  }
  var VERBS = '(?:draw|deal|kill|\\[?stun|\\[?buff|give|ready|move|return|channel|gain|play|discard|score)\\b';
  function parseEffects(s) {
    s = s.trim().replace(/\.$/, '');
    var parts = s.split(new RegExp('\\. |, then |,? and (?=' + VERBS + ')', 'i'));
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (!p) continue;
      var e = parseEffect(p);
      if (!e) return null;
      out.push(e);
    }
    return out.length ? out : null;
  }

  function parseCard(c) {
    var P = { lines: [], kw: {}, trig: {}, spell: [], legendAct: null, legendTrig: {}, equip: false, equipBonus: 0 };
    var type = c.type;
    var addTrig = function (ev, effs, once) { (P.trig[ev] = P.trig[ev] || []).push({ effs: effs, once: !!once }); };
    richToLines(c.rich).forEach(function (raw) {
      var t = stripReminder(raw);
      if (!t) return;
      var line = { text: t.replace(/\]\[>\]\s*/g, '] — '), sim: false };
      P.lines.push(line);
      var rest = t, m, kws = [];
      for (;;) {
        if ((m = rest.match(/^\[>\]\s*|^(?:—|-)\s+/))) { rest = rest.slice(m[0].length); continue; }
        m = rest.match(/^\[([A-Za-z-]+)(?: (\d+))?\]\s*/);
        if (!m || m[1] === 'Deathknell' || m[1] === 'Stun' || m[1] === 'Buff') break;
        if (KNOWN_KW.indexOf(m[1]) < 0) return; // unknown keyword: not simulated
        kws.push([m[1], m[2] ? +m[2] : null]);
        rest = rest.slice(m[0].length);
      }
      var applyKw = function () {
        kws.forEach(function (k) {
          var key = k[0].toLowerCase();
          if (key === 'assault' || key === 'shield' || key === 'hunt') P.kw[key] = (P.kw[key] || 0) + (k[1] || 1);
          else P.kw[key] = true;
          if (key === 'equip') P.equip = true;
        });
      };
      if (kws.some(function (k) { return k[0] === 'Equip'; })) { applyKw(); line.sim = true; return; } // rest is the equip cost
      rest = rest.trim();
      if (!rest) { applyKw(); line.sim = true; return; }
      if (SKIP.test(rest)) return;
      var effs;
      if (/^i enter ready\.?$/i.test(rest) && type === 'Unit') { applyKw(); P.kw.entersready = true; line.sim = true; return; }
      if (type === 'Spell') {
        if ((effs = parseEffects(rest))) { applyKw(); P.spell = P.spell.concat(effs); line.sim = true; }
        return;
      }
      if (type === 'Legend') {
        if ((m = rest.match(/^(?:(\d+) energy, )?exhaust: (.+)$/i)) && (effs = parseEffects(m[2]))) {
          applyKw(); P.legendAct = { energy: m[1] ? +m[1] : 0, effs: effs }; line.sim = true; return;
        }
        if ((m = rest.match(/^when you (or an ally hold|conquer or hold|conquer|hold|play a unit|play a spell|win a combat), (.+)$/i))) {
          var body = m[2], once = false, mm = body.match(/^you may exhaust me to (.+)$/i);
          if (mm) { body = mm[1]; once = true; }
          if ((effs = parseEffects(body))) {
            var ev = { 'or an ally hold': 'hold', 'conquer or hold': 'conquerOrHold', 'conquer': 'conquer', 'hold': 'hold', 'play a unit': 'playUnit', 'play a spell': 'playSpell', 'win a combat': 'winCombat' }[m[1].toLowerCase()];
            (P.legendTrig[ev] = P.legendTrig[ev] || []).push({ effs: effs, once: once });
            applyKw(); line.sim = true;
          }
        }
        return;
      }
      if (type === 'Battlefield') {
        if ((m = rest.match(/^when you (conquer|hold) here, (.+)$/i)) && (effs = parseEffects(m[2]))) { addTrig('bf' + m[1].toLowerCase(), effs); line.sim = true; }
        return;
      }
      // Units and gear
      if ((m = rest.match(/^\[Deathknell\]\s*(?:\[>\]|—|-)?\s*(.+)$/i))) {
        if ((effs = parseEffects(m[1]))) { applyKw(); addTrig('deathknell', effs); line.sim = true; }
        return;
      }
      if ((m = rest.match(/^when you play (?:me|this), (.+)$/i))) {
        if ((effs = parseEffects(m[1]))) { applyKw(); addTrig('play', effs); line.sim = true; }
        return;
      }
      if ((m = rest.match(/^when i (conquer or hold|conquer|hold|attack or defend|attack|defend|move to a battlefield|move), (.+)$/i))) {
        if ((effs = parseEffects(m[2]))) {
          var k = m[1].toLowerCase();
          if (k === 'conquer or hold') { addTrig('conquer', effs); addTrig('hold', effs); }
          else if (k === 'attack or defend') { addTrig('attack', effs); addTrig('defend', effs); }
          else addTrig({ 'move to a battlefield': 'moveBf' }[k] || k, effs);
          applyKw(); line.sim = true;
        }
      }
    });
    if (type === 'Gear' && (P.equip || (c.tags || []).indexOf('Equipment') >= 0)) {
      P.equip = true;
      // Riftcodex has no Might bonus for gear; estimate it from cost (Might attribute wins if present).
      P.equipBonus = c.might != null ? c.might : Math.max(1, Math.ceil((c.energy || 0) / 2));
    }
    return P;
  }

  /* ---------------- helpers ---------------- */
  var UID = 1;
  function shuffle(a, rnd) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function inst(c) { return { iid: UID++, c: c }; }
  function opp(pi) { return 1 - pi; }
  function kwOf(u) { var k = u.c.P ? u.c.P.kw : {}; return u.kwx ? Object.assign({}, k, u.kwx) : k; }
  function equipBonus(u) { return u.equips.reduce(function (s, g) { return s + (g.c.P.equipBonus || 0); }, 0); }
  function might(u, role) {
    var k = kwOf(u);
    var m = (u.c.might || 0) + u.buff + u.temp + equipBonus(u);
    if (role === 'att') m += (k.assault || 0);
    if (role === 'def') m += (k.shield || 0);
    return Math.max(0, m);
  }
  function unitValue(u) { return (u.c.energy || 0) + might(u) + (u.c.power || 0) * 0.5; }
  function cardDomains(c) { return (c.domain || []).filter(function (d) { return d !== 'Colorless'; }); }
  function unitsAt(G, loc, pi) { return G.units.filter(function (u) { return u.loc === loc && (pi == null || u.ctrl === pi); }); }
  function bfName(G, i) { return G.bfs[i].c.name; }
  function locName(G, loc) { return loc === 'base' ? 'base' : bfName(G, loc); }

  function log(G, msg, pi) {
    G.log.push({ t: msg, p: pi == null ? -1 : pi, turn: G.turnNo });
    if (G.onLog) G.onLog(msg, pi);
  }

  /* ---------------- game setup ---------------- */
  function newGame(deckA, deckB, opts) {
    opts = opts || {};
    var rnd = opts.rnd || Math.random;
    var G = { players: [], units: [], bfs: [], active: 0, turnNo: 0, log: [], winner: null, rnd: rnd, onLog: opts.onLog || null, maxTurns: opts.maxTurns || 0 };
    [deckA, deckB].forEach(function (d, pi) {
      var main = d.cards.slice();
      var ci = d.championCard ? main.indexOf(d.championCard) : -1;
      if (ci >= 0) main.splice(ci, 1);
      var runeDeck = [];
      Object.keys(d.runes).forEach(function (k) { for (var i = 0; i < d.runes[k]; i++) runeDeck.push(k); });
      var p = {
        pi: pi, name: (opts.names || ['You', 'AI'])[pi], deck: shuffle(main.map(inst), rnd), deckDef: d, hand: [], trash: [],
        runeDeck: shuffle(runeDeck, rnd), runes: [], points: 0, xp: 0, scored: {}, turns: 0,
        legend: { c: d.legendCard, exhausted: false, used: false }, champion: d.championCard ? inst(d.championCard) : null, gear: []
      };
      G.players.push(p);
    });
    G.bfs = [deckA, deckB].map(function (d) { return { c: d.bfCards[Math.floor(rnd() * d.bfCards.length)], ctrl: null }; });
    G.players.forEach(function (p) { for (var i = 0; i < 4; i++) drawOne(G, p.pi, true); });
    G.first = Math.floor(rnd() * 2);
    G.active = G.first;
    log(G, (G.first === 0 ? G.players[0].name + ' go' : G.players[1].name + ' goes') + ' first. Battlefields: ' + bfName(G, 0) + ' and ' + bfName(G, 1) + '.');
    startTurn(G);
    return G;
  }

  /* ---------------- resources ---------------- */
  function drawOne(G, pi, silent) {
    var p = G.players[pi];
    if (!p.deck.length) {
      if (!p.trash.length) { return; }
      p.deck = shuffle(p.trash.splice(0), G.rnd);
      log(G, p.name + ' burned out: trash shuffled into a new deck, ' + G.players[opp(pi)].name + ' scores 1.', pi);
      addPoints(G, opp(pi), 1);
      if (G.winner != null) return;
    }
    p.hand.push(p.deck.shift());
  }
  function draw(G, pi, n) {
    for (var i = 0; i < n && G.winner == null; i++) drawOne(G, pi);
    log(G, G.players[pi].name + ' draw' + (pi === 0 ? '' : 's') + ' ' + n + '.', pi);
  }
  function channel(G, pi, n, exhausted) {
    var p = G.players[pi], got = 0;
    for (var i = 0; i < n && p.runeDeck.length; i++) { p.runes.push({ d: p.runeDeck.shift(), ex: !!exhausted }); got++; }
    return got;
  }
  function recycleRune(p, r) { p.runes.splice(p.runes.indexOf(r), 1); p.runeDeck.push(r.d); }
  function canPay(p, energy, power, domains) {
    var ready = p.runes.filter(function (r) { return !r.ex; }).length;
    var match = p.runes.filter(function (r) { return domains.indexOf(r.d) >= 0; }).length;
    return ready >= energy && match >= power;
  }
  function pay(G, pi, energy, power, domains) {
    var p = G.players[pi];
    var isMatch = function (r) { return domains.indexOf(r.d) >= 0; };
    for (var i = 0; i < energy; i++) {
      var ready = p.runes.filter(function (r) { return !r.ex; });
      var exMatch = p.runes.filter(function (r) { return r.ex && isMatch(r); }).length;
      // exhaust matching runes first when they'll be recycled for power anyway
      ready.sort(function (a, b) { return exMatch < power ? (isMatch(b) - isMatch(a)) : (isMatch(a) - isMatch(b)); });
      ready[0].ex = true;
    }
    for (var j = 0; j < power; j++) {
      var cand = p.runes.filter(isMatch).sort(function (a, b) { return b.ex - a.ex; });
      recycleRune(p, cand[0]);
    }
  }
  function cardCost(c, accel) {
    var e = c.energy || 0, pw = c.power || 0;
    if (accel) { e += 1; pw += 1; }
    return { energy: e, power: pw, domains: cardDomains(c) };
  }

  /* ---------------- scoring ---------------- */
  function addPoints(G, pi, n) {
    if (G.winner != null) return;
    var p = G.players[pi];
    p.points = Math.min(WIN, p.points + n);
    if (p.points >= WIN) { G.winner = pi; log(G, p.name + (pi === 0 ? ' win' : ' wins') + '!', pi); }
  }
  function scoreBf(G, pi, bi, how) {
    var p = G.players[pi];
    if (p.scored[bi] || G.winner != null) return;
    p.scored[bi] = true;
    if (how === 'conquer' && p.points === WIN - 1) {
      var all = G.bfs.every(function (b, i) { return i === bi || p.scored[i]; });
      if (!all) { log(G, p.name + ' can\'t take the final point by conquering yet: draw 1 instead.', pi); drawOne(G, pi); return; }
    }
    log(G, p.name + ' score' + (pi === 0 ? '' : 's') + ' 1 for ' + (how === 'conquer' ? 'conquering ' : 'holding ') + bfName(G, bi) + '.', pi);
    addPoints(G, pi, 1);
  }

  /* ---------------- turn structure ---------------- */
  function startTurn(G) {
    var pi = G.active, p = G.players[pi];
    p.turns++; G.turnNo++;
    G.players.forEach(function (pl) { pl.scored = {}; });
    G.playedThisTurn = 0;
    log(G, '— Turn ' + G.turnNo + ': ' + p.name + ' —', pi);
    G.units.forEach(function (u) { if (u.ctrl === pi) u.ex = false; });
    p.runes.forEach(function (r) { r.ex = false; });
    p.gear.forEach(function (g) { g.ex = false; });
    p.legend.exhausted = false; p.legend.used = false;
    unitsOf(G, pi).filter(function (u) { return kwOf(u).temporary; }).forEach(function (u) { log(G, u.c.name + ' (Temporary) dies.', pi); killUnit(G, u); });
    checkDeaths(G);
    for (var bi = 0; bi < G.bfs.length && G.winner == null; bi++) {
      if (G.bfs[bi].ctrl !== pi) continue;
      scoreBf(G, pi, bi, 'hold');
      var here = unitsAt(G, bi, pi);
      here.forEach(function (u) {
        if (kwOf(u).hunt) { p.xp += kwOf(u).hunt; log(G, u.c.name + ' hunts: +' + kwOf(u).hunt + ' XP.', pi); }
        fireUnit(G, u, 'hold');
      });
      fireLegend(G, pi, 'hold', { loc: bi }); fireLegend(G, pi, 'conquerOrHold', { loc: bi });
      fireBf(G, pi, bi, 'bfhold');
    }
    if (G.winner != null) return;
    var n = (pi !== G.first && p.turns === 1) ? 3 : 2;
    var got = channel(G, pi, n, false);
    log(G, p.name + ' channel' + (pi === 0 ? '' : 's') + ' ' + got + ' rune' + (got === 1 ? '' : 's') + '.', pi);
    draw(G, pi, 1);
    G.phase = 'main';
  }
  function endTurn(G) {
    if (G.winner != null) return;
    var pi = G.active;
    G.units.forEach(function (u) {
      u.damage = 0; u.temp = 0;
      if (u.ctrl === pi && u.stun > 0) u.stun--;
    });
    G.active = opp(pi);
    if (G.maxTurns && G.turnNo >= G.maxTurns) { G.winner = -1; log(G, 'Turn limit reached.'); return; }
    startTurn(G);
  }

  /* ---------------- units ---------------- */
  function unitsOf(G, pi) { return G.units.filter(function (u) { return u.ctrl === pi; }); }
  function makeUnit(G, pi, card, iid, loc, ready, token) {
    var u = { uid: UID++, iid: iid, c: card, owner: pi, ctrl: pi, loc: loc, ex: !ready, damage: 0, buff: 0, temp: 0, stun: 0, equips: [], token: !!token };
    G.units.push(u);
    return u;
  }
  function tokenCard(e) {
    var kw = {};
    Object.keys(e.kw || {}).forEach(function (k) { kw[k] = e.kw[k]; });
    var text = Object.keys(kw).map(function (k) { return '[' + k[0].toUpperCase() + k.slice(1) + (kw[k] === true ? '' : ' ' + kw[k]) + ']'; }).join(' ');
    return { name: e.name, type: 'Unit', supertype: 'Token', domain: ['Colorless'], energy: 0, might: e.might, power: 0, rich: text, plain: text, tags: [], P: { lines: text ? [{ text: text, sim: true }] : [], kw: kw, trig: {}, spell: [], legendTrig: {} } };
  }
  function removeUnit(G, u) {
    var i = G.units.indexOf(u);
    if (i >= 0) G.units.splice(i, 1);
    var owner = G.players[u.owner];
    u.equips.forEach(function (g) { owner.trash.push(g); });
    u.equips = [];
  }
  function killUnit(G, u) {
    if (G.units.indexOf(u) < 0) return;
    var loc = u.loc;
    removeUnit(G, u);
    if (!u.token) G.players[u.owner].trash.push({ iid: u.iid, c: u.c });
    u.dead = true;
    fireTrig(G, u.ctrl, u.c, 'deathknell', { src: null, loc: loc, srcName: u.c.name });
    updateControl(G);
  }
  function checkDeaths(G) {
    var guard = 0;
    for (;;) {
      var dying = G.units.filter(function (u) { return u.damage > 0 && u.damage >= might(u); });
      if (!dying.length || guard++ > 50) break;
      dying.forEach(function (u) { log(G, u.c.name + ' dies.', u.ctrl); killUnit(G, u); });
    }
  }
  function updateControl(G) {
    G.bfs.forEach(function (b, i) {
      if (b.ctrl != null && !unitsAt(G, i, b.ctrl).length) b.ctrl = null;
    });
  }

  /* ---------------- triggers & effects ---------------- */
  function fireTrig(G, pi, card, ev, ctx) {
    var list = card.P && card.P.trig[ev];
    if (!list || G.winner != null) return;
    list.forEach(function (t) { resolveEffects(G, pi, t.effs, Object.assign({ srcName: card.name }, ctx)); });
  }
  function fireUnit(G, u, ev) {
    if (u.dead) return;
    fireTrig(G, u.ctrl, u.c, ev, { src: u, loc: u.loc, srcName: u.c.name });
  }
  function fireLegend(G, pi, ev, ctx) {
    var L = G.players[pi].legend, list = L.c && L.c.P.legendTrig[ev];
    if (!list || G.winner != null) return;
    list.forEach(function (t) {
      if (t.once) { if (L.exhausted) return; L.exhausted = true; }
      resolveEffects(G, pi, t.effs, Object.assign({ srcName: L.c.name }, ctx || {}));
    });
  }
  function fireBf(G, pi, bi, ev) { fireTrig(G, pi, G.bfs[bi].c, ev, { src: null, loc: bi, srcName: bfName(G, bi) }); }

  var HARMFUL = { deal: 1, kill: 1, stun: 1, tohand: 1, tobase: 1 };
  function isHarmful(e) { return !!HARMFUL[e.op] || (e.op === 'might' && e.n < 0); }
  function needsChoice(e) { return e.t && (e.t.sel === 'enemy' || e.t.sel === 'friendly' || e.t.sel === 'any'); }

  // Units a single-target effect may choose. ctx: {src, loc}
  function candidates(G, pi, e, ctx) {
    var t = e.t, p = G.players[pi];
    return G.units.filter(function (u) {
      if (u.dead) return false;
      if (t.sel === 'enemy' && u.ctrl === pi) return false;
      if (t.sel === 'friendly' && u.ctrl !== pi) return false;
      if (t.other && ctx.src && u === ctx.src) return false;
      if (t.other && ctx.excludeUid && u.uid === ctx.excludeUid) return false;
      if (t.where === 'bf' && u.loc === 'base') return false;
      if (t.where === 'here' && (ctx.loc == null || u.loc !== ctx.loc)) return false;
      if (t.maxMight != null && might(u) > t.maxMight) return false;
      if (u.ctrl !== pi && kwOf(u).deflect && p.runes.length - (ctx.reserveRunes || 0) < 1) return false;
      return true;
    });
  }
  // Heuristic target choice used by the AI and for automatic triggers.
  function autoChoose(G, pi, e, cands) {
    if (!cands.length) return null;
    var enemies = cands.filter(function (u) { return u.ctrl !== pi; });
    var friends = cands.filter(function (u) { return u.ctrl === pi; });
    var best = function (arr, f) { return arr.slice().sort(function (a, b) { return f(b) - f(a); })[0] || null; };
    if (isHarmful(e)) {
      if (!enemies.length) return null;
      if (e.op === 'deal') {
        var killable = enemies.filter(function (u) { return might(u) - u.damage <= e.n; });
        return killable.length ? best(killable, unitValue) : best(enemies, function (u) { return might(u); });
      }
      if (e.op === 'tohand' || e.op === 'tobase') {
        var atHeld = enemies.filter(function (u) { return u.loc !== 'base' && G.bfs[u.loc].ctrl === u.ctrl; });
        return best(atHeld.length ? atHeld : enemies, unitValue);
      }
      if (e.op === 'stun') return best(enemies, function (u) { return might(u) + (u.loc !== 'base' ? 3 : 0); });
      return best(enemies, unitValue);
    }
    if (!friends.length) return null;
    if (e.op === 'buff') { var nb = friends.filter(function (u) { return !u.buff; }); return best(nb.length ? nb : friends, function (u) { return might(u); }); }
    if (e.op === 'ready') { var exd = friends.filter(function (u) { return u.ex; }); return best(exd.length ? exd : friends, function (u) { return might(u); }); }
    return best(friends, function (u) { return might(u) + (u.loc !== 'base' ? 2 : 0) + (u.ex ? 0 : 1); });
  }

  function describeTarget(t) {
    if (!t) return '';
    var s = { self: 'this', it: 'it', allEnemyHere: 'all enemy units here', otherFriendlyHere: 'your other units here' }[t.sel];
    if (!s) s = (t.other ? 'another ' : (t.sel === 'enemy' ? 'an ' : 'a ')) + (t.sel === 'any' ? 'unit' : t.sel + ' unit') + (t.where === 'bf' ? ' at a battlefield' : t.where === 'here' ? ' here' : '');
    if (t.maxMight != null) s += ' (Might ≤ ' + t.maxMight + ')';
    return s;
  }
  function describeEffect(e) {
    var T = describeTarget(e.t);
    switch (e.op) {
      case 'draw': return 'Draw ' + e.n;
      case 'deal': return 'Deal ' + e.n + ' to ' + T;
      case 'kill': return 'Kill ' + T;
      case 'stun': return 'Stun ' + T;
      case 'buff': return 'Buff ' + T;
      case 'might': return 'Give ' + T + ' ' + (e.n > 0 ? '+' : '') + e.n + ' Might';
      case 'ready': return 'Ready ' + T;
      case 'tobase': return 'Return ' + T + ' to base';
      case 'tohand': return 'Return ' + T + ' to hand';
      case 'channel': return 'Channel ' + e.n + ' rune' + (e.n > 1 ? 's' : '');
      case 'xp': return 'Gain ' + e.n + ' XP';
      case 'token': return 'Play ' + e.count + '× ' + e.might + ' Might ' + e.name;
      case 'discard': return 'Discard ' + e.n;
      case 'score': return 'Score ' + e.n;
    }
    return e.op;
  }

  // Resolve a list of effects. ctx.targets is an optional queue of pre-chosen uids for single-target effects.
  function resolveEffects(G, pi, effs, ctx) {
    ctx = ctx || {};
    var p = G.players[pi], it = null, queue = (ctx.targets || []).slice();
    for (var i = 0; i < effs.length && G.winner == null; i++) {
      var e = effs[i], tg = [];
      if (e.t) {
        if (e.t.sel === 'self') { if (ctx.src && !ctx.src.dead) tg = [ctx.src]; }
        else if (e.t.sel === 'it') { if (it && !it.dead) tg = [it]; }
        else if (e.t.sel === 'allEnemyHere') tg = ctx.loc == null ? [] : unitsAt(G, ctx.loc, opp(pi));
        else if (e.t.sel === 'otherFriendlyHere') tg = ctx.loc == null ? [] : unitsAt(G, ctx.loc, pi).filter(function (u) { return u !== ctx.src; });
        else {
          var cands = candidates(G, pi, e, ctx), pick = null;
          if (queue.length) {
            var want = queue.shift();
            pick = cands.filter(function (u) { return u.uid === want; })[0] || null;
          } else pick = autoChoose(G, pi, e, cands);
          if (pick && pick.ctrl !== pi && kwOf(pick).deflect) {
            if (!p.runes.length) pick = null;
            else { recycleRune(p, p.runes.slice().sort(function (a, b) { return b.ex - a.ex; })[0]); log(G, p.name + ' recycle' + (pi === 0 ? '' : 's') + ' a rune to target ' + pick.c.name + ' (Deflect).', pi); }
          }
          if (pick) tg = [pick];
        }
        if (tg.length) it = tg[tg.length - 1];
        if (!tg.length) { log(G, (ctx.srcName || 'Effect') + ': ' + describeEffect(e) + ' — no target.', pi); continue; }
      }
      applyEffect(G, pi, e, tg, ctx);
      checkDeaths(G);
    }
  }
  function applyEffect(G, pi, e, tg, ctx) {
    var p = G.players[pi], src = ctx.srcName || 'Effect', names = tg.map(function (u) { return u.c.name; }).join(', ');
    switch (e.op) {
      case 'draw': log(G, src + ': draw ' + e.n + '.', pi); for (var i = 0; i < e.n; i++) drawOne(G, pi); break;
      case 'deal': tg.forEach(function (u) { u.damage += e.n; }); log(G, src + ' deals ' + e.n + ' to ' + names + '.', pi); break;
      case 'kill': log(G, src + ' kills ' + names + '.', pi); tg.forEach(function (u) { killUnit(G, u); }); break;
      case 'stun': tg.forEach(function (u) { u.stun = G.active === u.ctrl ? 2 : 1; }); log(G, src + ' stuns ' + names + '.', pi); break;
      case 'buff': tg.forEach(function (u) { if (!u.buff) u.buff = 1; }); log(G, src + ' buffs ' + names + '.', pi); break;
      case 'might': tg.forEach(function (u) { u.temp += e.n; }); log(G, src + ' gives ' + names + ' ' + (e.n > 0 ? '+' : '') + e.n + ' Might this turn.', pi); break;
      case 'ready': tg.forEach(function (u) { u.ex = false; }); log(G, src + ' readies ' + names + '.', pi); break;
      case 'tobase': tg.forEach(function (u) { u.loc = 'base'; }); updateControl(G); log(G, src + ' sends ' + names + ' to base.', pi); break;
      case 'tohand':
        tg.forEach(function (u) { removeUnit(G, u); if (!u.token) G.players[u.owner].hand.push({ iid: u.iid, c: u.c }); u.dead = true; });
        updateControl(G); log(G, src + ' returns ' + names + ' to hand.', pi); break;
      case 'channel': var got = channel(G, pi, e.n, true); log(G, src + ': channel ' + got + ' rune' + (got === 1 ? '' : 's') + ' exhausted.', pi); break;
      case 'xp': p.xp += e.n; log(G, src + ': +' + e.n + ' XP.', pi); break;
      case 'token':
        var loc = e.here && ctx.loc != null ? ctx.loc : 'base';
        for (var k = 0; k < e.count; k++) makeUnit(G, pi, tokenCard(e), UID++, loc, e.ready, true);
        log(G, src + ': ' + e.count + '× ' + e.might + ' Might ' + e.name + ' token' + (e.count > 1 ? 's' : '') + ' at ' + locName(G, loc) + '.', pi); break;
      case 'discard':
        for (var d = 0; d < e.n && p.hand.length; d++) {
          var worst = p.hand.slice().sort(function (a, b) { return (a.c.energy || 0) - (b.c.energy || 0); })[0];
          p.hand.splice(p.hand.indexOf(worst), 1); p.trash.push(worst);
          log(G, p.name + ' discard' + (pi === 0 ? '' : 's') + ' ' + worst.c.name + '.', pi);
        }
        break;
      case 'score': log(G, src + ': score ' + e.n + '.', pi); addPoints(G, pi, e.n); break;
    }
  }

  /* ---------------- playing cards ---------------- */
  function findInHand(p, iid) {
    for (var i = 0; i < p.hand.length; i++) if (p.hand[i].iid === iid) return { card: p.hand[i], from: 'hand', idx: i };
    if (p.champion && p.champion.iid === iid) return { card: p.champion, from: 'champion' };
    return null;
  }
  function playEffects(c) {
    if (c.type === 'Spell') return c.P.spell;
    return (c.P.trig.play || []).reduce(function (a, t) { return a.concat(t.effs); }, []);
  }
  function canPlay(G, pi, iid, accel) {
    if (G.winner != null) return { ok: false, why: 'The game is over.' };
    if (G.active !== pi) return { ok: false, why: "It's not your turn." };
    var p = G.players[pi], f = findInHand(p, iid);
    if (!f) return { ok: false, why: 'Card not found.' };
    var c = f.card.c;
    if (c.type === 'Battlefield' || c.type === 'Legend') return { ok: false, why: "This card can't be played." };
    if (accel && !(c.P.kw.accelerate && c.type === 'Unit')) return { ok: false, why: "This card doesn't have Accelerate." };
    var cost = cardCost(c, accel);
    var ready = p.runes.filter(function (r) { return !r.ex; }).length;
    if (ready < cost.energy) return { ok: false, why: 'Needs ' + cost.energy + ' energy; you have ' + ready + ' ready rune' + (ready === 1 ? '' : 's') + '.' };
    if (!canPay(p, cost.energy, cost.power, cost.domains)) return { ok: false, why: 'Needs ' + cost.power + ' ' + cost.domains.join('/') + ' power.' };
    return { ok: true };
  }
  // Single-target choices a play will ask for, in order. Returns [{e, cands}]
  function targetSlots(G, pi, c, opts) {
    opts = opts || {};
    var effs = opts.legend ? c.P.legendAct.effs : playEffects(c);
    var ctx = { src: null, loc: opts.loc != null ? opts.loc : (c.type === 'Unit' ? 'base' : null), reserveRunes: c.power || 0 };
    return effs.filter(needsChoice).map(function (e) { return { e: e, cands: candidates(G, pi, e, ctx) }; });
  }
  function ambushSpots(G, pi, c) {
    if (c.type !== 'Unit' || !c.P.kw.ambush) return [];
    return G.bfs.map(function (b, i) { return i; }).filter(function (i) { return unitsAt(G, i, pi).length > 0 && !unitsAt(G, i, opp(pi)).length; });
  }
  // opts: {accel, targets:[uid], loc:'base'|bfIndex}
  function playCard(G, pi, iid, opts) {
    opts = opts || {};
    var chk = canPlay(G, pi, iid, opts.accel);
    if (!chk.ok) return chk;
    var p = G.players[pi], f = findInHand(p, iid), card = f.card, c = card.c;
    var cost = cardCost(c, opts.accel);
    pay(G, pi, cost.energy, cost.power, cost.domains);
    if (f.from === 'hand') p.hand.splice(p.hand.indexOf(card), 1); else p.champion = null;
    G.playedThisTurn++;
    if (c.type === 'Unit') {
      var loc = opts.loc != null ? opts.loc : 'base';
      var u = makeUnit(G, pi, c, card.iid, loc, !!opts.accel || !!c.P.kw.entersready, false);
      log(G, p.name + ' play' + (pi === 0 ? '' : 's') + ' ' + c.name + (loc !== 'base' ? ' to ' + bfName(G, loc) : '') + (u.ex ? '' : ' (ready)') + '.', pi);
      var loose = p.gear.filter(function (g) { return g.c.P.equip; });
      loose.forEach(function (g) { p.gear.splice(p.gear.indexOf(g), 1); u.equips.push(g); log(G, g.c.name + ' attaches to ' + c.name + '.', pi); });
      fireLegend(G, pi, 'playUnit', { loc: loc });
      resolveEffects(G, pi, playEffects(c), { src: u, loc: loc, targets: opts.targets, srcName: c.name });
    } else if (c.type === 'Spell') {
      log(G, p.name + ' cast' + (pi === 0 ? '' : 's') + ' ' + c.name + '.', pi);
      resolveEffects(G, pi, c.P.spell, { src: null, loc: null, targets: opts.targets, srcName: c.name });
      p.trash.push(card);
      fireLegend(G, pi, 'playSpell', {});
    } else if (c.type === 'Gear') {
      log(G, p.name + ' play' + (pi === 0 ? '' : 's') + ' ' + c.name + '.', pi);
      if (c.P.equip) {
        var host = unitsOf(G, pi).sort(function (a, b) { return might(b) - might(a); })[0];
        if (host) { host.equips.push(card); log(G, c.name + ' attaches to ' + host.c.name + ' (+' + c.P.equipBonus + ' Might).', pi); }
        else p.gear.push({ iid: card.iid, c: c, ex: false });
      } else p.gear.push({ iid: card.iid, c: c, ex: false });
      resolveEffects(G, pi, playEffects(c), { src: null, loc: 'base', targets: opts.targets, srcName: c.name });
    }
    checkDeaths(G);
    return { ok: true };
  }
  function canUseLegend(G, pi) {
    var p = G.players[pi], L = p.legend;
    if (G.winner != null || G.active !== pi) return { ok: false, why: "It's not your turn." };
    if (!L.c || !L.c.P.legendAct) return { ok: false, why: 'This legend has no simulated activated ability.' };
    if (L.exhausted || L.used) return { ok: false, why: 'Your legend is exhausted.' };
    if (p.runes.filter(function (r) { return !r.ex; }).length < L.c.P.legendAct.energy) return { ok: false, why: 'Needs ' + L.c.P.legendAct.energy + ' energy.' };
    return { ok: true };
  }
  function useLegend(G, pi, targets) {
    var chk = canUseLegend(G, pi);
    if (!chk.ok) return chk;
    var p = G.players[pi], L = p.legend;
    pay(G, pi, L.c.P.legendAct.energy, 0, []);
    L.exhausted = true; L.used = true;
    log(G, p.name + ' activate' + (pi === 0 ? '' : 's') + ' ' + L.c.name + '.', pi);
    resolveEffects(G, pi, L.c.P.legendAct.effs, { src: null, loc: null, targets: targets, srcName: L.c.name });
    return { ok: true };
  }

  /* ---------------- movement & combat ---------------- */
  function canMove(G, u, dest) {
    if (G.winner != null || u.ctrl !== G.active || u.ex || u.dead || dest === u.loc) return false;
    if (u.loc === 'base' || dest === 'base') return true;
    return !!kwOf(u).ganking;
  }
  function moveUnits(G, pi, uids, dest) {
    var movers = G.units.filter(function (u) { return uids.indexOf(u.uid) >= 0 && u.ctrl === pi && canMove(G, u, dest); });
    if (!movers.length) return { ok: false, why: 'No unit can move there.' };
    movers.forEach(function (u) { u.ex = true; u.loc = dest; });
    log(G, G.players[pi].name + ' move' + (pi === 0 ? '' : 's') + ' ' + movers.map(function (u) { return u.c.name; }).join(', ') + ' to ' + locName(G, dest) + '.', pi);
    updateControl(G);
    movers.forEach(function (u) { fireUnit(G, u, 'move'); if (dest !== 'base') fireUnit(G, u, 'moveBf'); });
    if (dest !== 'base' && G.winner == null) {
      var here = movers.filter(function (u) { return !u.dead && u.loc === dest; });
      var enemies = unitsAt(G, dest, opp(pi));
      if (here.length && enemies.length) combat(G, pi, dest, here, enemies);
      else if (here.length && G.bfs[dest].ctrl !== pi) conquer(G, pi, dest, here);
    }
    return { ok: true };
  }
  function assignDamage(total, units, role) {
    var rank = function (u) { var k = kwOf(u); return k.tank ? 0 : k.backline ? 2 : 1; };
    var order = units.slice().sort(function (a, b) { return rank(a) - rank(b) || (might(a, role) - a.damage) - (might(b, role) - b.damage); });
    for (var i = 0; i < order.length && total > 0; i++) {
      var need = Math.max(1, might(order[i], role) - order[i].damage);
      var d = i === order.length - 1 ? total : Math.min(need, total);
      order[i].damage += d; total -= d;
    }
  }
  function combat(G, pi, bi, attackers, defenders) {
    var A = G.players[pi], D = G.players[opp(pi)];
    log(G, '⚔ Combat at ' + bfName(G, bi) + ': ' + attackers.map(function (u) { return u.c.name; }).join(', ') + ' vs ' + defenders.map(function (u) { return u.c.name; }).join(', ') + '.', pi);
    attackers.forEach(function (u) { fireUnit(G, u, 'attack'); });
    defenders.forEach(function (u) { fireUnit(G, u, 'defend'); });
    var att = unitsAt(G, bi, pi), def = unitsAt(G, bi, opp(pi));
    if (G.winner != null) return;
    if (att.length && def.length) {
      var aD = att.reduce(function (s, u) { return s + (u.stun ? 0 : might(u, 'att')); }, 0);
      var dD = def.reduce(function (s, u) { return s + (u.stun ? 0 : might(u, 'def')); }, 0);
      log(G, A.name + ' deal' + (pi === 0 ? '' : 's') + ' ' + aD + ', ' + D.name + ' deal' + (pi === 0 ? 's' : '') + ' ' + dD + '.', pi);
      assignDamage(aD, def, 'def'); assignDamage(dD, att, 'att');
      var dead = att.filter(function (u) { return u.damage > 0 && u.damage >= might(u, 'att'); })
        .concat(def.filter(function (u) { return u.damage > 0 && u.damage >= might(u, 'def'); }));
      // survivors keep damage below their non-combat Might so Assault/Shield ending doesn't kill them afterwards
      att.concat(def).forEach(function (u) { if (dead.indexOf(u) < 0) u.damage = Math.min(u.damage, Math.max(0, might(u) - 1)); });
      dead.forEach(function (u) { log(G, u.c.name + ' dies.', u.ctrl); killUnit(G, u); });
      checkDeaths(G);
    }
    if (G.winner != null) return;
    att = unitsAt(G, bi, pi); def = unitsAt(G, bi, opp(pi));
    if (att.length && !def.length) { fireLegend(G, pi, 'winCombat', { loc: bi }); conquer(G, pi, bi, att); }
    else if (att.length && def.length) {
      att.forEach(function (u) { u.loc = 'base'; });
      log(G, 'Both sides survive: attackers return to base.', pi);
    } else if (!att.length && def.length) { fireLegend(G, opp(pi), 'winCombat', { loc: bi }); log(G, D.name + ' hold' + (pi === 0 ? 's' : '') + ' ' + bfName(G, bi) + '.', opp(pi)); }
    updateControl(G);
  }
  function conquer(G, pi, bi, units) {
    var p = G.players[pi];
    G.bfs[bi].ctrl = pi;
    log(G, p.name + ' conquer' + (pi === 0 ? '' : 's') + ' ' + bfName(G, bi) + '.', pi);
    scoreBf(G, pi, bi, 'conquer');
    units.forEach(function (u) {
      if (u.dead || G.winner != null) return;
      if (kwOf(u).hunt) { p.xp += kwOf(u).hunt; log(G, u.c.name + ' hunts: +' + kwOf(u).hunt + ' XP.', pi); }
      fireUnit(G, u, 'conquer');
    });
    fireLegend(G, pi, 'conquer', { loc: bi }); fireLegend(G, pi, 'conquerOrHold', { loc: bi });
    fireBf(G, pi, bi, 'bfconquer');
    checkDeaths(G);
  }

  /* ---------------- AI ---------------- */
  function evalEffects(G, pi, effs, ctx) {
    var value = 0, good = true, targets = [];
    effs.forEach(function (e) {
      if (needsChoice(e)) {
        var cands = candidates(G, pi, e, ctx), u = autoChoose(G, pi, e, cands);
        if (!u) { if (isHarmful(e) || e.op === 'buff') good = false; return; }
        targets.push(u.uid);
        if (u.ctrl === pi && isHarmful(e)) { good = false; return; }
        if (e.op === 'kill') value += unitValue(u) + 1;
        else if (e.op === 'deal') value += (might(u) - u.damage <= e.n) ? unitValue(u) + 1 : 0;
        else if (e.op === 'stun') value += u.loc !== 'base' && might(u) >= 3 ? 2 : 0.5;
        else if (e.op === 'tohand' || e.op === 'tobase') value += (u.loc !== 'base' && G.bfs[u.loc].ctrl === u.ctrl) ? unitValue(u) : 0;
        else if (e.op === 'buff') value += u.buff ? 0 : 1.5;
        else if (e.op === 'might') value += e.n < 0 ? 0.3 : 0.2;
        else if (e.op === 'ready') value += u.ex ? 1 : 0;
        return;
      }
      if (e.op === 'draw') value += 1.6 * e.n;
      else if (e.op === 'channel') value += 1.5 * e.n;
      else if (e.op === 'xp') value += 0.3 * e.n;
      else if (e.op === 'token') value += e.count * (e.might + 0.5);
      else if (e.op === 'score') value += 10 * e.n;
      else if (e.op === 'discard') value -= 1.2 * e.n;
      else if (e.op === 'deal' || e.op === 'kill' || e.op === 'stun' || e.op === 'tobase' || e.op === 'tohand') {
        if (e.t.sel === 'allEnemyHere') value += 1;
      }
    });
    return { value: value, good: good, targets: targets };
  }
  function aiCardChoice(G, pi, card) {
    var c = card.c;
    if (!canPlay(G, pi, card.iid, false).ok) return null;
    var ctx = { src: null, loc: c.type === 'Unit' ? 'base' : null, reserveRunes: c.power || 0 };
    if (c.type === 'Unit') {
      var ev = evalEffects(G, pi, playEffects(c), ctx);
      var v = (c.energy || 0) + (c.might || 0) + (c.power || 0) * 0.5 + (ev.good ? Math.max(0, ev.value) : 0);
      var accel = !!c.P.kw.accelerate && canPlay(G, pi, card.iid, true).ok;
      return { value: v, opts: { accel: accel, targets: ev.targets } };
    }
    if (c.type === 'Spell') {
      var es = evalEffects(G, pi, c.P.spell, ctx);
      if (!es.good || es.value < 1.5) return null;
      return { value: es.value + 0.5, opts: { targets: es.targets } };
    }
    if (c.type === 'Gear') {
      if (c.P.equip) return unitsOf(G, pi).length ? { value: 2 + c.P.equipBonus, opts: {} } : null;
      var eg = evalEffects(G, pi, playEffects(c), { src: null, loc: 'base' });
      return { value: 0.5 + Math.max(0, eg.value), opts: { targets: eg.targets } };
    }
    return null;
  }
  async function aiPlayLoop(G, pi, wait) {
    for (var guard = 0; guard < 30 && G.winner == null; guard++) {
      var p = G.players[pi], best = null;
      p.hand.concat(p.champion ? [p.champion] : []).forEach(function (card) {
        var ch = aiCardChoice(G, pi, card);
        if (ch && (!best || ch.value > best.value)) best = { value: ch.value, card: card, opts: ch.opts };
      });
      if (!best) return;
      var r = playCard(G, pi, best.card.iid, best.opts);
      if (!r.ok) return;
      await wait();
    }
  }
  function subsets(arr, f) { var n = Math.min(arr.length, 12); for (var m = 1; m < (1 << n); m++) { var s = []; for (var i = 0; i < n; i++) if (m & (1 << i)) s.push(arr[i]); f(s); } }
  function planAttack(G, pi, bi, avail, bonus) {
    var defs = unitsAt(G, bi, opp(pi));
    var need = defs.reduce(function (s, u) { return s + Math.max(1, might(u, 'def') - u.damage); }, 0);
    var dD = defs.reduce(function (s, u) { return s + (u.stun ? 0 : might(u, 'def')); }, 0);
    var best = null;
    subsets(avail, function (S) {
      var aD = S.reduce(function (s, u) { return s + might(u, 'att'); }, 0) + (bonus || 0);
      var tough = S.reduce(function (s, u) { return s + Math.max(1, might(u, 'att')); }, 0) + (bonus || 0);
      if (aD >= need && dD < tough) {
        var cost = S.reduce(function (s, u) { return s + might(u, 'att'); }, 0) + S.length * 0.1;
        if (!best || cost < best.cost) best = { cost: cost, units: S };
      }
    });
    return best && best.units;
  }
  async function aiAttack(G, pi, wait) {
    for (var bi = 0; bi < G.bfs.length && G.winner == null; bi++) {
      if (G.bfs[bi].ctrl === pi) continue;
      var avail = unitsAt(G, 'base', pi).filter(function (u) { return !u.ex && !u.stun; });
      if (!avail.length) continue;
      var enemies = unitsAt(G, bi, opp(pi));
      if (!enemies.length) {
        var weakest = avail.slice().sort(function (a, b) { return unitValue(a) - unitValue(b); })[0];
        moveUnits(G, pi, [weakest.uid], bi); await wait(); continue;
      }
      var S = planAttack(G, pi, bi, avail, 0);
      if (!S) {
        // try a "+N Might this turn" spell from hand
        var p = G.players[pi], pump = null;
        p.hand.forEach(function (card) {
          var c = card.c;
          if (c.type !== 'Spell' || !c.P.spell.length) return;
          var e = c.P.spell.filter(function (x) { return x.op === 'might' && x.n > 0 && (x.t.sel === 'any' || x.t.sel === 'friendly') && !x.t.where; })[0];
          if (!e || !canPlay(G, pi, card.iid, false).ok) return;
          if (!pump || e.n > pump.n) pump = { card: card, n: e.n };
        });
        if (pump) {
          S = planAttack(G, pi, bi, avail, pump.n);
          if (S) {
            var host = S.slice().sort(function (a, b) { return might(b) - might(a); })[0];
            var tq = pump.card.c.P.spell.filter(needsChoice).map(function (e) { return e.op === 'might' && e.n > 0 ? host.uid : null; });
            playCard(G, pi, pump.card.iid, { targets: tq.filter(function (x) { return x != null; }) });
            await wait();
            if (host.dead || host.loc !== 'base') continue;
          }
        }
      }
      if (S) { moveUnits(G, pi, S.filter(function (u) { return !u.dead; }).map(function (u) { return u.uid; }), bi); await wait(); }
    }
  }
  async function aiTurn(G, pi, wait) {
    wait = wait || function () { return Promise.resolve(); };
    if (G.winner != null) return;
    await aiPlayLoop(G, pi, wait);
    if (G.winner == null && canUseLegend(G, pi).ok) {
      var ev = evalEffects(G, pi, G.players[pi].legend.c.P.legendAct.effs, { src: null, loc: null });
      if (ev.good && ev.value >= 1.5) { useLegend(G, pi, ev.targets); await wait(); }
    }
    if (G.winner == null) await aiAttack(G, pi, wait);
    if (G.winner == null) await aiPlayLoop(G, pi, wait);
  }

  /* ---------------- coverage stats ---------------- */
  function deckCoverage(d) {
    var sim = 0, total = 0;
    [d.legendCard].concat(d.bfCards, d.cards).forEach(function (c) {
      if (!c) return;
      c.P.lines.forEach(function (l) { total++; if (l.sim) sim++; });
    });
    return { sim: sim, total: total };
  }

  return {
    WIN: WIN, DOMAIN_COLORS: DOMAIN_COLORS, DECKS: DECKS, FIXES: FIXES, norm: norm,
    loadCards: loadCards, cards: function () { return CARDS; }, parseCard: parseCard, richToLines: richToLines,
    newGame: newGame, endTurn: endTurn, playCard: playCard, canPlay: canPlay, targetSlots: targetSlots, ambushSpots: ambushSpots,
    canUseLegend: canUseLegend, useLegend: useLegend, canMove: canMove, moveUnits: moveUnits, unitsAt: unitsAt, might: might, kwOf: kwOf,
    equipBonus: equipBonus, describeEffect: describeEffect, cardCost: cardCost, aiTurn: aiTurn, deckCoverage: deckCoverage, cardDomains: cardDomains
  };
})();
if (typeof module !== 'undefined') module.exports = RT;
