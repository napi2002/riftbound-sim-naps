// Post-game Pro Coach: grades a finished game against the deck's researched pro guide (src/guides.json) using what
// actually happened (G.events, G.stats). Pure analysis, no game state is changed. Works in the browser (window.Coach)
// and in Node (module.exports) so it can be tested headless.
var Coach = (function () {
  'use strict';
  var norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
  var same = function (a, b) { return norm(a) === norm(b); };
  var short = function (s) { return String(s || '').split(/ - |, /)[0]; };
  var letter = function (x) { return x == null ? '–' : x >= 85 ? 'A' : x >= 72 ? 'B' : x >= 60 ? 'C' : x >= 45 ? 'D' : 'F'; };
  var clamp = function (x) { return Math.max(0, Math.min(100, Math.round(x))); };

  // Researched plan for a deck: its own (or planId's), else the plan of the tournament deck with the same legend.
  function planFor(RT, d) {
    var pl = RT.plan(d.planId || d.id);
    if (pl && pl.guide) return { id: d.planId || d.id, plan: pl, exact: !d.custom || !!d.planId };
    var twin = d.legendCard && RT.DECKS.filter(function (x) { return x.legendCard === d.legendCard; })[0];
    return twin && RT.plan(twin.id) && RT.plan(twin.id).guide ? { id: twin.id, plan: RT.plan(twin.id), exact: false } : null;
  }

  function analyse(RT, G, pi) {
    var o = 1 - pi, ev = G.events || [], me = G.players[pi], them = G.players[o];
    var st = (G.stats && G.stats[pi]) || {}, ost = (G.stats && G.stats[o]) || {};
    var own = function (t) { return pi === G.first ? Math.ceil(t / 2) : Math.floor(t / 2); };   // global turn -> your turn number
    var mine = planFor(RT, me.deckDef), theirs = planFor(RT, them.deckDef);
    var g = mine && mine.plan.guide, og = theirs && theirs.plan.guide;
    var deckNames = me.deckDef.cards.map(function (c) { return c.name; });
    var inDeck = function (n) { return deckNames.some(function (x) { return same(x, n); }); };
    var plays = ev.filter(function (e) { return e.t === 'play' && e.pi === pi; });
    var firstPlay = function (n) { return plays.filter(function (e) { return same(e.name, n); })[0]; };
    var ends = ev.filter(function (e) { return e.t === 'end' && e.pi === pi; });
    var R = { result: G.winner === pi ? 'win' : G.winner === o ? 'loss' : 'draw', score: [me.points, them.points], turns: own(G.turnNo),
      deck: me.deckDef.name, opp: them.deckDef.name, guide: g ? { id: mine.id, exact: mine.exact, archetype: g.archetype, summary: g.summary } : null,
      sections: [], grades: {}, drills: [] };

    // fit: how much of the researched build this list actually plays
    var keyList = g ? Object.keys((g.ai && g.ai.priority) || {}).concat((g.mulligan && g.mulligan.keep) || []) : [];
    keyList = keyList.filter(function (n, i) { return keyList.map(norm).indexOf(norm(n)) === i; });
    var fit = keyList.filter(inDeck).length;
    R.fit = { have: fit, of: keyList.length };
    R.offBuild = !!(g && keyList.length && fit < Math.ceil(keyList.length / 3));
    var offBuild = g && keyList.length && fit < Math.ceil(keyList.length / 3);
    var gs0 = offBuild ? null : g;   // build-specific advice (mulligan, combat tips, mistakes) only for the researched build

    // 1. Opening: mulligan vs the pro keep/toss lists, early board
    var mul = ev.filter(function (e) { return e.t === 'mulligan' && e.pi === pi; })[0], open = { items: [] }, os = 100;
    if (mul && gs0 && gs0.mulligan) {
      var keep = g.mulligan.keep || [], toss = g.mulligan.toss || [];
      var isK = function (n) { return keep.some(function (k) { return same(k, n); }); }, isT = function (n) { return toss.some(function (k) { return same(k, n); }); };
      var kept = mul.hand.filter(function (n) { return mul.aside.indexOf(n) < 0; });
      mul.aside.filter(isK).forEach(function (n) { os -= 25; open.items.push({ kind: 'bad', text: 'You sent back ' + n + ', a card pros keep in the opening hand.' }); });
      kept.filter(isT).forEach(function (n) { os -= 12; open.items.push({ kind: 'bad', text: 'You kept ' + n + '; the pro guide sends it back unless the rest of the hand is strong.' }); });
      var goodKeeps = kept.filter(isK);
      if (goodKeeps.length) open.items.push({ kind: 'good', text: 'Good keep: ' + goodKeeps.join(', ') + '.' });
      if (!mul.aside.length && kept.filter(isT).length >= 2) { os -= 10; open.items.push({ kind: 'bad', text: 'You kept a hand with ' + kept.filter(isT).length + ' cards pros would mulligan.' }); }
      open.note = g.mulligan.note;
    }
    var firstUnitTurn = plays.filter(function (e) { return e.type === 'Unit' && e.own; }).map(function (e) { return own(e.turn); })[0];
    if (firstUnitTurn == null || firstUnitTurn > 2) { os -= 20; open.items.push({ kind: 'bad', text: firstUnitTurn ? 'Your first unit came down on your turn ' + firstUnitTurn + '. A unit on turn 1–2 contests the battlefields before the opponent settles in.' : 'You never played a unit on your own turn.' }); }
    else open.items.push({ kind: 'good', text: 'Unit on the board by your turn ' + firstUnitTurn + '.' });
    R.grades.opening = clamp(os); open.title = 'Opening'; open.grade = R.grades.opening; R.sections.push(open);

    // 2. Game plan: when the guide's key cards came down vs the phase that calls for them
    var gp = { title: 'Game plan', items: [] };
    if (g && !offBuild) {
      var windows = (g.phases || []).map(function (ph) { var m = /(\d+)\s*-\s*(\d+)/.exec(ph.name); return { name: ph.name, lo: m ? +m[1] : 7, hi: m ? +m[2] : 99, text: (ph.steps || []).join(' ') + ' ' + ph.goal }; });
      var keys = Object.keys((g.ai && g.ai.priority) || {}).sort(function (a, b) { return g.ai.priority[b] - g.ai.priority[a]; }).filter(inDeck).slice(0, 4);
      var sc = [];
      keys.forEach(function (k) {
        var w = windows.filter(function (x) { return norm(x.text).indexOf(norm(short(k))) >= 0; })[0];
        var fp = firstPlay(k), castable = ends.filter(function (e) { return e.playable.some(function (n) { return same(n, k); }); })[0];
        if (fp) {
          var t = own(fp.turn), late = w ? t - w.hi : 0;
          if (castable && own(castable.turn) < t) { sc.push(55); gp.items.push({ kind: 'bad', text: k + ' was castable on your turn ' + own(castable.turn) + ' but you played it on turn ' + t + '. ' + (w ? 'Pros want it in "' + w.name + '".' : 'It is a top-priority card for this deck.') }); }
          else if (late > 0) { sc.push(85); gp.items.push({ kind: 'info', text: k + ' came down on your turn ' + t + ', after the "' + w.name + '" window. It was never castable earlier, so this was the draw, not a misplay; mulligan harder for it next time.' }); }
          else { sc.push(100); gp.items.push({ kind: 'good', text: k + ' on your turn ' + t + (w ? (t < w.lo ? ', ahead of the "' + w.name + '" plan' : ', inside the "' + w.name + '" window') : '') + '.' }); }
        } else if (castable) { sc.push(35); gp.items.push({ kind: 'bad', text: k + ' was castable from your turn ' + own(castable.turn) + ' but never played.' }); }
      });
      // reactions pros hold for showdowns
      (g.holdFor || []).forEach(function (h) {
        var nm = h.split(' - ')[0], why = h.split(' - ').slice(1).join(' - ');
        plays.filter(function (e) { return same(e.name, nm) && e.own && !e.showdown && e.from !== 'hidden'; }).slice(0, 1).forEach(function (e) {
          sc.push(60); gp.items.push({ kind: 'bad', text: 'You played ' + nm + ' on your main phase (turn ' + own(e.turn) + '). Pros hold it' + (why ? ': ' + why : ' for a showdown') + '.' });
        });
        plays.filter(function (e) { return same(e.name, nm) && e.showdown; }).slice(0, 1).forEach(function () { gp.items.push({ kind: 'good', text: 'Used ' + nm + ' in a showdown, as pros do.' }); });
      });
      R.grades.plan = sc.length ? clamp(sc.reduce(function (a, b) { return a + b; }, 0) / sc.length) : null;
      gp.phases = (g.phases || []).map(function (ph) { return { name: ph.name, goal: ph.goal }; });
    } else if (g) gp.items.push({ kind: 'info', text: 'Your list plays ' + fit + ' of the ' + keyList.length + ' key cards in the researched ' + short(me.deckDef.legendCard ? me.deckDef.legendCard.name : '') + ' build (' + g.archetype + '), so it follows a different plan. The checks below still apply.' });
    else gp.items.push({ kind: 'info', text: 'No researched pro guide for this legend yet.' });
    gp.grade = R.grades.plan; R.sections.push(gp);

    // 3. Board & scoring
    var bs = 100, board = { title: 'Board and scoring', items: [] };
    var myPts = (st.conquerPts || 0) + (st.holdPts || 0) + (st.otherPts || 0);
    board.items.push({ kind: 'info', text: 'You scored ' + (st.conquerPts || 0) + ' by conquering and ' + (st.holdPts || 0) + ' by holding; the AI ' + (ost.conquerPts || 0) + ' and ' + (ost.holdPts || 0) + '.' });
    if ((st.emptyBfTurns || 0) >= 2) { bs -= 10 * st.emptyBfTurns; board.items.push({ kind: 'bad', text: 'No units on any battlefield for ' + st.emptyBfTurns + ' of your turns. Every turn without a unit out is a turn you cannot score.' }); }
    if ((ost.holdPts || 0) >= 3) { bs -= 5 * ost.holdPts; board.items.push({ kind: 'bad', text: 'The AI scored ' + ost.holdPts + ' just by holding. Send even a small unit to contest its battlefield: a contested battlefield does not score for holding.' }); }
    if ((st.conquerPts || 0) > 0 && !(st.holdPts || 0)) { bs -= 15; board.items.push({ kind: 'bad', text: 'You conquered but never held. Leave a real defender behind so the battlefield scores again at your next turn.' }); }
    if ((st.holdPts || 0) >= 3) board.items.push({ kind: 'good', text: 'Strong board: ' + st.holdPts + ' points from holding.' });
    R.grades.board = clamp(bs); board.grade = R.grades.board; R.sections.push(board);

    // 4. Combat
    var cs = 100, combat = { title: 'Combat', items: [] }, att = st.attacks || 0, bad = (st.attacksLost || 0) + (st.attacksBounced || 0);
    if (att) {
      cs = 40 + 60 * (st.attacksWon || 0) / att;
      combat.items.push({ kind: bad ? 'info' : 'good', text: 'Your attacks: ' + (st.attacksWon || 0) + ' won, ' + (st.attacksBounced || 0) + ' bounced off, ' + (st.attacksLost || 0) + ' lost.' });
    } else { cs = 55; combat.items.push({ kind: 'bad', text: 'You never attacked. Battlefields are won by moving in; waiting lets the opponent set the pace.' }); }
    var rv = RT.reviewGame(G, pi);
    rv.moments.forEach(function (m) { combat.items.push({ kind: m.kind, turn: own(m.turn), text: m.text }); });
    if (gs0 && gs0.combat) combat.tips = gs0.combat.slice(0, 3);
    R.grades.combat = clamp(cs); combat.grade = R.grades.combat; R.sections.push(combat);

    // 5. Efficiency
    var es = 100, eff = { title: 'Efficiency', items: [] };
    if ((st.unspent || 0) >= 1) { es -= 15 * st.unspent; eff.items.push({ kind: 'bad', text: st.unspent + ' turn' + (st.unspent > 1 ? 's' : '') + ' ended with 2+ energy unspent while you had a playable card.' }); }
    if ((st.idle || 0) >= 2) { es -= 8 * st.idle; eff.items.push({ kind: 'bad', text: 'Ready units sat in base on ' + st.idle + ' turns. Units in base cannot score.' }); }
    var worst = ends.filter(function (e) { return e.unused >= 3 && e.playable.length; }).sort(function (a, b) { return b.unused - a.unused; })[0];
    if (worst) eff.items.push({ kind: 'bad', turn: own(worst.turn), text: 'Biggest waste: your turn ' + own(worst.turn) + ', ' + worst.unused + ' energy left with ' + worst.playable[0] + ' playable.' });
    if (es >= 95) eff.items.push({ kind: 'good', text: 'You used your energy and units every turn.' });
    R.grades.efficiency = clamp(es); eff.grade = R.grades.efficiency; R.sections.push(eff);

    // 6. Matchup
    var mu = { title: 'The matchup: ' + short(R.deck) + ' vs ' + short(R.opp), items: [] };
    var mp = g && theirs && (g.matchups || []).filter(function (m) { return m.vs === theirs.id; })[0];
    if (mp) mu.items.push({ kind: 'info', text: mp.plan });
    if (og) {
      mu.items.push({ kind: 'info', text: 'What the AI\'s deck wants: ' + og.summary });
      var their = og.matchups && mine && og.matchups.filter(function (m) { return m.vs === mine.id; })[0];
      if (their) mu.items.push({ kind: 'info', text: 'Its pro plan against you: ' + their.plan });
    }
    if (mu.items.length) R.sections.push(mu);

    // overall grade and the three things to drill
    var gs = ['opening', 'plan', 'board', 'combat', 'efficiency'].filter(function (k) { return R.grades[k] != null; });
    R.overall = clamp(gs.reduce(function (a, k) { return a + R.grades[k]; }, 0) / gs.length);
    var advice = {
      opening: gs0 && gs0.mulligan ? 'Mulligan to the pro keep list: ' + gs0.mulligan.note : 'Keep a hand with a 1–2 cost unit and send back expensive cards.',
      plan: gs0 && gs0.phases && gs0.phases[0] ? 'Follow the curve: ' + g.phases[0].goal + ' ' + (g.phases[0].steps || []).slice(0, 2).join(' ') : 'Play your key cards as soon as they are castable.',
      board: 'Keep at least one unit on a battlefield every turn, and contest the AI\'s battlefields early so it cannot score by holding.',
      combat: gs0 && gs0.combat && gs0.combat[0] ? 'Fight smarter: ' + gs0.combat[0] : 'Check the fight preview (⚔ vs 🛡) before you move, and keep a reaction ready for the showdown.',
      efficiency: 'Spend your energy every turn: play the most expensive card you can, then move ready units out of base.'
    };
    R.drills = gs.slice().sort(function (a, b) { return R.grades[a] - R.grades[b]; }).filter(function (k) { return R.grades[k] < 90; }).slice(0, 3).map(function (k) { return { area: k, text: advice[k] }; });
    if (gs0 && gs0.mistakes) R.mistakes = gs0.mistakes;

    // score race (cumulative points after each global turn)
    var race = [[0], [0]];
    for (var t = 1; t <= G.turnNo; t++) [pi, o].forEach(function (q, k) {
      var add = ev.filter(function (e) { return e.t === 'pts' && e.pi === q && e.turn === t; }).reduce(function (a, e) { return a + e.n; }, 0);
      race[k].push(race[k][race[k].length - 1] + add);
    });
    R.race = race;
    return R;
  }

  // HTML for the coach sheet; esc is the UI's HTML escaper.
  function chart(R) {
    var W = 320, H = 120, n = R.race[0].length - 1 || 1, max = 8, px = function (i) { return 28 + (W - 40) * i / n; }, py = function (v) { return H - 18 - (H - 30) * v / max; };
    var line = function (arr) { return arr.map(function (v, i) { return (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(v).toFixed(1); }).join(' '); };
    var grid = [0, 4, 8].map(function (v) { return '<line x1="28" x2="' + (W - 12) + '" y1="' + py(v) + '" y2="' + py(v) + '" class="cg"/><text x="20" y="' + (py(v) + 4) + '" class="ct" text-anchor="end">' + v + '</text>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="coachchart" role="img" aria-label="Score race">' + grid +
      '<path d="' + line(R.race[1]) + '" class="cl ai"/><path d="' + line(R.race[0]) + '" class="cl me"/>' +
      '<text x="' + (W - 12) + '" y="' + (H - 4) + '" class="ct" text-anchor="end">turns →</text></svg>' +
      '<div class="coachlegend"><span class="me">■ You</span><span class="ai">■ AI</span></div>';
  }
  function html(R, esc) {
    var label = { opening: 'Opening', plan: 'Game plan', board: 'Board', combat: 'Combat', efficiency: 'Efficiency' };
    var badge = function (x) { return '<span class="grade g' + letter(x) + '">' + letter(x) + '</span>'; };
    var item = function (it) { return '<li class="' + it.kind + '"><span class="ic">' + (it.kind === 'good' ? '✓' : it.kind === 'bad' ? '✗' : '•') + '</span><span>' + (it.turn ? '<b>T' + it.turn + '</b> ' : '') + esc(it.text) + '</span></li>'; };
    var out = '<div class="coach"><h2>Pro coach</h2><p class="coachhead">' + badge(R.overall) + ' <span>' + esc(R.result === 'win' ? 'Win' : R.result === 'loss' ? 'Loss' : 'Draw') + ' ' + R.score[0] + '–' + R.score[1] + ' in ' + R.turns + ' of your turns · ' + esc(short(R.deck)) + ' vs ' + esc(short(R.opp)) + '</span></p>' +
      (R.offBuild ? '<p class="coachsub">Your list is a different style from the researched ' + esc(R.guide.archetype) + ' build, so it is graded on fundamentals; matchup notes still use the pro guides.</p>'
        : R.guide ? '<p class="coachsub">Graded against the researched ' + esc(R.guide.archetype) + ' guide' + (R.guide.exact ? '' : ' for this legend') + '.</p>' : '') +
      '<div class="gradebar">' + Object.keys(label).filter(function (k) { return R.grades[k] != null; }).map(function (k) { return '<div>' + badge(R.grades[k]) + '<small>' + label[k] + '</small></div>'; }).join('') + '</div>' +
      chart(R) +
      (R.drills.length ? '<h3>Work on next game</h3><ol class="drills">' + R.drills.map(function (d) { return '<li><b>' + label[d.area] + ':</b> ' + esc(d.text) + '</li>'; }).join('') + '</ol>' : '<h3>Clean game</h3><p>No weak area stood out. Try a harder matchup.</p>');
    R.sections.forEach(function (s) {
      out += '<details' + (s.items.some(function (i) { return i.kind === 'bad'; }) ? ' open' : '') + '><summary>' + (s.grade != null ? badge(s.grade) + ' ' : '') + esc(s.title) + '</summary><ul class="coachlist">' + s.items.map(item).join('') + '</ul>' +
        (s.note ? '<p class="coachnote">Pro mulligan rule: ' + esc(s.note) + '</p>' : '') +
        (s.phases ? '<p class="coachnote">' + s.phases.map(function (p) { return '<b>' + esc(p.name) + ':</b> ' + esc(p.goal); }).join('<br>') + '</p>' : '') +
        (s.tips ? '<p class="coachnote"><b>Pro combat tips:</b><br>' + s.tips.map(esc).join('<br>') + '</p>' : '') + '</details>';
    });
    if (R.mistakes) out += '<details><summary>Common mistakes with this deck</summary><ul class="coachlist">' + R.mistakes.map(function (m) { return item({ kind: 'info', text: m }); }).join('') + '</ul></details>';
    return out + '</div>';
  }
  return { analyse: analyse, html: html, letter: letter };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Coach;
