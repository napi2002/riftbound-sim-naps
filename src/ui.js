/* Rift Table mobile UI. */
'use strict';
(function () {
  var cardsEl = document.getElementById('rt-cards');
  RT.loadCards(JSON.parse(cardsEl.textContent));
  if (typeof globalThis !== 'undefined' && globalThis.RT_HEADLESS) return;

  var DC = RT.DOMAIN_COLORS;
  // Embedded card images (base64 WebP keyed by normalised card name), turned into local blob: URLs once.
  var IMG = {};
  try {
    var raw = JSON.parse(document.getElementById('rt-img').textContent || '{}');
    Object.keys(raw).forEach(function (k) {
      var bin = atob(raw[k]), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      IMG[k] = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
    });
  } catch (e) { IMG = {}; }
  function imgOf(c) { return c && c.supertype !== 'Token' ? IMG[RT.norm(c.name)] || null : null; }
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var store = {
    get: function (k) { try { return localStorage.getItem('rifttable.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('rifttable.' + k, v); } catch (e) { /* ignore */ } }
  };
  var S = { G: null, mine: store.get('mine') || 'irelia', ai: store.get('ai') || 'rengar', sel: [], targeting: null, busy: false, sheet: null, prompt: null };

  /* ---------- generated art ---------- */
  var artCache = {};
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function art(c, w, h) {
    var key = c.name + '|' + w + 'x' + h;
    if (artCache[key]) return artCache[key];
    var url = imgOf(c);
    if (url) {
      // Zoom into the illustration box of the card face so small views show art, not the card frame.
      // Box as fractions of card width: [left, top, width, height]. Portrait cards are 744x1039, battlefields 1039x744.
      var land = c.orientation === 'landscape' || c.type === 'Battlefield';
      var box = land ? [0.03, 0.11, 0.94, 0.43] : [0.05, 0.06, 0.9, 0.68];
      var W = Math.max(w / box[2], h / box[3]);
      var left = -(box[0] * W + (box[2] * W - w) / 2), top = -(box[1] * W + Math.max(0, box[3] * W - h) * 0.3);
      return (artCache[key] = '<span style="position:relative;display:block;width:100%;height:100%;overflow:hidden"><img src="' + url + '" alt="" style="position:absolute;width:' + W.toFixed(1) + 'px;max-width:none;left:' + left.toFixed(1) + 'px;top:' + top.toFixed(1) + 'px"></span>');
    }
    var doms = RT.cardDomains(c); if (!doms.length) doms = ['Colorless'];
    var c1 = DC[doms[0]], c2 = DC[doms[1] || doms[0]], seed = hash(c.name), r = seed;
    var rnd = function () { r = (Math.imul(r ^ (r >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return (r % 10000) / 10000; };
    var kind = seed % 5, s = '';
    s += '<rect width="' + w + '" height="' + h + '" fill="' + c1 + '"/>';
    s += '<polygon points="0,' + h + ' ' + w + ',' + (h * rnd() * 0.6) + ' ' + w + ',' + h + '" fill="' + c2 + '" opacity="' + (doms[1] ? 0.9 : 0.35) + '"/>';
    var W = 'rgba(255,255,255,', B = 'rgba(0,0,0,';
    if (kind === 0) { var step = 6 + Math.floor(rnd() * 8); for (var x = -h; x < w + h; x += step) s += '<line x1="' + x + '" y1="0" x2="' + (x + h) + '" y2="' + h + '" stroke="' + W + '.22)" stroke-width="' + (1 + rnd() * 2).toFixed(1) + '"/>'; }
    else if (kind === 1) { for (var i = 0; i < 14; i++) s += '<circle cx="' + (rnd() * w).toFixed(1) + '" cy="' + (rnd() * h).toFixed(1) + '" r="' + (2 + rnd() * Math.min(w, h) * 0.3).toFixed(1) + '" fill="' + (rnd() > 0.5 ? W : B) + (0.08 + rnd() * 0.18).toFixed(2) + ')"/>'; }
    else if (kind === 2) { var t = 10 + Math.floor(rnd() * 10); for (var y = 0; y < h + t; y += t) for (var x2 = 0; x2 < w + t; x2 += t) { var up = ((x2 + y) / t) % 2 === 0; s += '<polygon points="' + x2 + ',' + (up ? y + t : y) + ' ' + (x2 + t / 2) + ',' + (up ? y : y + t) + ' ' + (x2 + t) + ',' + (up ? y + t : y) + '" fill="' + (rnd() > 0.5 ? W : B) + (0.05 + rnd() * 0.15).toFixed(2) + ')"/>'; } }
    else if (kind === 3) { var cx = rnd() * w, cy = rnd() * h; for (var k = 1; k < 9; k++) s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (k * Math.max(w, h) / 7).toFixed(1) + '" fill="none" stroke="' + W + (0.1 + 0.03 * k).toFixed(2) + ')" stroke-width="' + (1 + rnd() * 3).toFixed(1) + '"/>'; }
    else { var st = 8 + Math.floor(rnd() * 8); for (var yy = -st; yy < h + st; yy += st) s += '<polyline points="0,' + yy + ' ' + w / 2 + ',' + (yy + st * 0.7) + ' ' + w + ',' + yy + '" fill="none" stroke="' + (rnd() > 0.4 ? W + '.25)' : B + '.18)') + '" stroke-width="' + (1.5 + rnd() * 2).toFixed(1) + '"/>'; }
    var glyph = { Unit: 'M0,-7 L6,4 L-6,4Z', Spell: 'M0,-7 L7,0 L0,7 L-7,0Z', Gear: 'M-6,-6 H6 V6 H-6Z', Legend: 'M0,-8 L2,-2 L8,-2 L3,2 L5,8 L0,4 L-5,8 L-3,2 L-8,-2 L-2,-2Z', Battlefield: 'M-8,5 L0,-7 L8,5Z' }[c.type];
    if (glyph) s += '<path transform="translate(' + (w / 2) + ',' + (h / 2) + ') scale(' + (Math.min(w, h) / 30).toFixed(2) + ')" d="' + glyph + '" fill="' + W + '.55)" stroke="' + B + '.25)" stroke-width="1"/>';
    return (artCache[key] = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + s + '</svg>');
  }
  function findHiddenOf(card) { return S.G.players[0].hidden.filter(function (h) { return h.card === card; })[0] || null; }
  function findMine(p, iid) {
    return p.hand.filter(function (x) { return x.iid === iid; })[0] || (p.champion && p.champion.iid === iid ? p.champion : null) ||
      (p.hidden.filter(function (h) { return h.card.iid === iid; })[0] || {}).card || null;
  }
  function hiddenChip(h, mine) {
    return mine ? '<button class="u mine hid" data-iid="' + h.card.iid + '" aria-label="Your hidden ' + esc(h.card.c.name) + '"><span class="art">' + art(h.card.c, 50, 58) + '</span><span class="nm">🂠 ' + esc(shortName(h.card.c.name)) + '</span></button>'
      : '<button class="u theirs hid back" data-facedown="1" aria-label="AI face-down card"><span class="nm">Face-down</span></button>';
  }
  function shortName(n) { return n.split(/ - |, /)[0]; }
  function deckById(id) { return RT.DECKS.filter(function (d) { return d.id === id; })[0] || RT.DECKS[0]; }

  /* ---------- menu ---------- */
  function renderMenu() {
    ['mine', 'ai'].forEach(function (side) {
      $('decks-' + side).innerHTML = RT.DECKS.map(function (d) {
        var doms = Object.keys(d.runes);
        return '<button class="deck" data-side="' + side + '" data-deck="' + d.id + '" aria-pressed="' + (S[side] === d.id) + '">' +
          '<span class="thumb">' + art(d.legendCard || { name: d.name, domain: doms, type: 'Legend' }, 40, 40) + '</span>' +
          '<span class="info"><span class="nm">' + esc(d.name) + '<span class="dots">' + doms.map(function (x) { return '<i style="background:' + DC[x] + '"></i>'; }).join('') + '</span></span>' +
          '<span class="lb">' + esc(d.label) + '</span>' +
          (d.fixes.length && side === 'mine' ? '<span class="fixnote">' + d.fixes.length + ' card' + (d.fixes.length > 1 ? 's' : '') + ' substituted (not in Riftcodex)</span>' : '') + '</span>' +
          '<span class="ct' + (d.found === d.total ? ' ok' : '') + '">' + d.found + '/' + d.total + ' found</span></button>';
      }).join('');
    });
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('.deck');
    if (b) { S[b.dataset.side] = b.dataset.deck; store.set(b.dataset.side, b.dataset.deck); renderMenu(); }
  });
  $('start').onclick = function () { startGame(); };
  var themes = ['auto', 'light', 'dark'];
  function applyTheme(t) { if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); $('theme').textContent = 'Theme: ' + t; }
  applyTheme(store.get('theme') || 'auto');
  $('theme').onclick = function () { var cur = store.get('theme') || 'auto'; var nx = themes[(themes.indexOf(cur) + 1) % 3]; store.set('theme', nx); applyTheme(nx); };

  /* ---------- game flow ---------- */
  async function startGame() {
    closeSheet(); $('end').classList.add('hidden');
    S.sel = []; S.targeting = null; S.prompt = null; S.busy = true;
    $('menu').classList.add('hidden'); $('game').classList.remove('hidden');
    S.G = null;
    var G = await RT.newGame(deckById(S.mine), deckById(S.ai), { human: 0, ask: askHuman });
    S.G = G; S.busy = false;
    render();
    if (G.active === 1) runAI();
  }
  // The engine calls this whenever you have a choice: confirm an optional effect or pick a target.
  function askHuman(req) {
    return new Promise(function (resolve) {
      S.prompt = { req: req, resolve: resolve };
      if (req.type !== 'target') promptSheet(req);
      render();
    });
  }
  function answer(v) {
    var P = S.prompt; if (!P) return;
    S.prompt = null; closeSheet();
    P.resolve(v);
  }
  function combatSheet(r) {
    var who = function (pi) { return pi === 0 ? 'You' : 'AI'; };
    var side = function (sd) {
      return '<div class="cside ' + (sd.pi === 0 ? 'me' : 'ai') + '"><div class="ch">' + (sd.role === 'att' ? '⚔ Attacking' : '🛡 Defending') + ' · ' + who(sd.pi) + '</div>' +
        sd.units.map(function (x) {
          return '<div class="crow' + (x.died ? ' died' : '') + '"><span class="cn">' + esc(x.name) + '</span><span class="cm">' + (x.stunned ? '⚡0' : x.might) + '</span>' +
            '<span class="ct">' + (x.taken ? '−' + x.taken : '') + '</span><span class="cd">' + (x.died ? '✝ died' : 'lives') + '</span></div>';
        }).join('') + '<div class="ctot">Total Might <b>' + sd.total + '</b></div></div>';
    };
    var pts = r.ptsAfter[0] !== r.ptsBefore[0] || r.ptsAfter[1] !== r.ptsBefore[1]
      ? '<div class="cpts">Points: You <b>' + r.ptsBefore[0] + (r.ptsAfter[0] !== r.ptsBefore[0] ? ' → ' + r.ptsAfter[0] : '') + '</b> · AI <b>' + r.ptsBefore[1] + (r.ptsAfter[1] !== r.ptsBefore[1] ? ' → ' + r.ptsAfter[1] : '') + '</b> (of ' + RT.WIN + ')</div>' : '';
    openSheet('<h2>⚔ Combat at ' + esc(r.bf) + '</h2><p style="margin:0 0 8px;color:var(--muted)">' + who(r.attacker) + ' attacked. Each side deals its total Might; damage goes to Tank units first, Backline last, then the weakest.</p>' +
      '<div class="cgrid">' + r.sides.map(side).join('') + '</div>' +
      '<div class="cres ' + (r.winner === 0 ? 'me' : r.winner === 1 ? 'ai' : '') + '">' + esc(r.result) + '</div>' + pts,
      '<button class="btn primary" data-ans="yes">Continue</button>');
  }
  function promptSheet(req) {
    if (req.type === 'combat') { combatSheet(req.report); return; }
    if (req.type === 'choice') {
      openSheet('<h2>' + esc(req.title) + '</h2><p style="font-size:16px;line-height:1.35">' + esc(req.text) + '</p>',
        req.options.map(function (o, i) { return '<button class="btn' + (i === req.auto ? ' primary' : '') + '" data-ans="opt' + i + '" style="flex-basis:100%">' + esc(o) + '</button>'; }).join('') +
        (req.optional ? '<button class="btn" data-ans="skip" style="flex-basis:100%">Skip</button>' : ''));
      return;
    }
    openSheet('<h2>' + esc(req.title) + '</h2><p style="font-size:16px;line-height:1.35">' + esc(req.text) + '</p>',
      '<button class="btn primary" data-ans="yes">Yes</button><button class="btn" data-ans="no">No</button>');
  }
  // Run a human action through the engine, blocking other input until it (and any prompts) finish.
  async function run(fn) {
    if (S.busy) return;
    S.busy = true; S.sel = []; render();
    var r;
    try { r = await fn(); } finally { S.busy = false; }
    if (r && r.ok === false) toast(r.why);
    afterAction();
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function runAI() {
    var G = S.G;
    S.busy = true; render();
    await sleep(600);
    await RT.aiTurn(G, 1, function () { render(); return sleep(800); });
    if (G !== S.G) return;
    if (G.winner == null) { await RT.endTurn(G); await sleep(300); }
    S.busy = false; render();
  }
  function afterAction() {
    S.sel = S.sel.filter(function (uid) { return S.G.units.some(function (u) { return u.uid === uid && !u.ex; }); });
    render();
  }
  async function endMyTurn() {
    if (S.busy || S.G.active !== 0 || S.G.winner != null) return;
    S.targeting = null;
    await run(function () { return RT.endTurn(S.G); });
    if (S.G.winner == null && S.G.active === 1) runAI();
  }

  /* ---------- rendering ---------- */
  function unitHtml(u, G) {
    var m = RT.might(u), base = (u.c.might || 0), k = RT.kwOf(u);
    var cls = 'u ' + (u.ctrl === 0 ? 'mine' : 'theirs') + (u.ex ? ' ex' : '') + (S.sel.indexOf(u.uid) >= 0 ? ' sel' : '');
    if (S.targeting && S.targeting.slots[S.targeting.i].cands.some(function (x) { return x.uid === u.uid; })) cls += ' target';
    if (S.prompt && S.prompt.req.type === 'target' && S.prompt.req.cands.indexOf(u.uid) >= 0) cls += ' target';
    var flags = [];
    if (u.stun) flags.push('⚡');
    if (u.buff) flags.push('★');
    if (u.equips.length) flags.push('⚔');
    if (k.tank) flags.push('T');
    if (u.empowered) { flags.push('✦'); cls += ' emp'; }
    if (u.ctrl === 0 && u.c.P.unitAct && G.active === 0 && RT.canUseUnit(G, 0, u.uid).ok) cls += ' can';
    return '<button class="' + cls + '" data-uid="' + u.uid + '" aria-label="' + esc(u.c.name) + '">' +
      '<span class="art">' + art(u.c, 50, 58) + '</span>' +
      '<span class="mt' + (m > base ? ' up' : m < base ? ' down' : '') + '">' + m + '</span>' +
      (u.damage ? '<span class="dm">-' + u.damage + '</span>' : '') +
      (flags.length ? '<span class="fl">' + flags.map(function (f) { return '<span>' + f + '</span>'; }).join('') + '</span>' : '') +
      '<span class="nm">' + esc(shortName(u.c.name)) + '</span></button>';
  }
  function gearHtml(g) { return '<button class="gear' + (g.ex ? ' ex' : '') + (S.G && S.G.players[0].gear.indexOf(g) >= 0 && g.c.P.gearAct && RT.canUseGear(S.G, 0, g.iid).ok ? ' can' : '') + '" data-gear="' + g.iid + '">' + esc(shortName(g.c.name)) + '</button>'; }
  function pips(n) { var s = ''; for (var i = 0; i < RT.WIN; i++) s += '<i class="' + (i < n ? 'on' : '') + '"></i>'; return '<span class="pips" aria-label="' + n + ' points">' + s + '</span>'; }
  function runesHtml(p, label) {
    return '<span class="lbl">' + label + '</span>' + p.runes.map(function (r) { return '<i class="' + (r.ex ? 'ex' : '') + '" style="--rc:' + DC[r.d] + '" title="' + r.d + '"></i>'; }).join('') +
      '<span class="lbl" style="margin-left:4px">' + p.runes.filter(function (r) { return !r.ex; }).length + ' ready</span>';
  }
  function stripHtml(p, pi, G) {
    return '<div class="strip ' + (pi === 0 ? 'me' : 'ai') + (G.active === pi ? ' active' : '') + '"><span class="who">' + esc(pi === 0 ? 'You · ' + shortName(p.legend.c.name) : 'AI · ' + p.legend.c.name) + '</span>' +
      pips(p.points) + '<b class="score">' + p.points + '<small>/' + RT.WIN + '</small></b><button class="stat empc' + (RT.empoweredList(G, pi).length ? ' on' : '') + '" data-emp="' + pi + '" aria-label="Empowered count">✦<b>' + RT.empoweredList(G, pi).length + '</b></button>' +
      '<span class="stat">XP <b>' + p.xp + '</b></span><span class="stat">✋<b>' + p.hand.length + '</b></span><span class="stat">▤<b>' + p.deck.length + '</b></span></div>';
  }
  // Pop up a short notice for log lines starting with ✦ (something became empowered) so it's hard to miss.
  var seenLog = 0;
  function flashNew(G) {
    if (seenLog > G.log.length) seenLog = 0;
    var fresh = G.log.slice(seenLog).filter(function (l) { return /^[✦★]/.test(l.t); });
    seenLog = G.log.length;
    if (!fresh.length) return;
    var el = $('toast');
    el.innerHTML = fresh.slice(-3).map(function (l) { return '<div>' + esc(l.t) + '</div>'; }).join('');
    var last = fresh[fresh.length - 1];
    el.className = 'show ' + (/^★/.test(last.t) ? 'pts ' : '') + 'p' + last.p;
    clearTimeout(flashNew.t);
    flashNew.t = setTimeout(function () { el.className = ''; }, 2600);
  }
  function empSheet(pi) {
    var G = S.G, list = RT.empoweredList(G, pi), L = G.players[pi].legend.c;
    var how = /Heart of the Tempest/.test(L.name) ? 'Kennen becomes empowered whenever you play a card from anywhere except your hand: your champion zone, a face-down (Hidden) card, Flow from the trash, or a unit played free from the trash or deck.'
      : /Rogue Assassin/.test(L.name) ? 'Akali empowers with her legend ability (3 energy + 1 power).' : '';
    openSheet('<h2>✦ Empowered (' + (pi === 0 ? 'you' : 'AI') + ')</h2>' +
      (list.length ? '<ul class="lines">' + list.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '<p style="color:var(--muted)">Nothing is empowered right now.</p>') +
      '<p style="font-size:14px;line-height:1.4">Empowered is an on/off state: a card is either empowered or not. ' + esc(how) + ' Mournful Witness empowers after a combat it was in (+2 Might), Tail-Cloaked Matriarch with its Empower ability, Tornado Warrior until end of turn.</p>',
      '<button class="btn" data-act="close">Close</button>');
  }
  function render() {
    var G = S.G; if (!G) return;
    var me = G.players[0], ai = G.players[1];
    var dests = destOptions();
    var h = '';
    h += stripHtml(ai, 1, G);
    h += '<div class="runes">' + runesHtml(ai, 'AI runes') + '</div>';
    h += '<div class="zone"><div class="zl"><span>AI base</span></div><div class="row">' + RT.unitsAt(G, 'base', 1).map(function (u) { return unitHtml(u, G); }).join('') + ai.gear.map(gearHtml).join('') + '</div></div>';
    h += '<div class="bfs">' + G.bfs.map(function (b, i) {
      var cls = 'bf' + (b.ctrl === 0 ? ' c0' : b.ctrl === 1 ? ' c1' : '') + (dests.indexOf(i) >= 0 ? ' dest' : '');
      return '<div class="' + cls + '" data-bf="' + i + '"><div class="bh"><span class="art">' + art(b.c, 22, 22) + '</span><span class="t">' + esc(b.c.name) + '</span>' +
        '<span class="own">' + (b.ctrl === 0 ? 'You' : b.ctrl === 1 ? 'AI' : 'Open') + '</span></div>' +
        '<div class="scored">' + [0, 1].filter(function (q) { return G.players[q].scored[i]; }).map(function (q) { return '<span class="sc p' + q + '">★ ' + (q === 0 ? 'You' : 'AI') + ' scored here</span>'; }).join('') +
        (b.ctrl != null && !G.players[b.ctrl].scored[i] ? '<span class="sc hint">' + (b.ctrl === 0 ? 'You' : 'AI') + ' score +1 if still held next turn</span>' : '') + '</div>' +
        '<div class="bfx">' + esc(b.c.P.lines.map(function (l) { return l.text; }).join(' ')) + '</div>' +
        '<div class="half">' + RT.unitsAt(G, i, 1).map(function (u) { return unitHtml(u, G); }).join('') + ai.hidden.filter(function (h) { return h.loc === i; }).map(function (h) { return hiddenChip(h, false); }).join('') + '</div>' +
        '<div class="half mine">' + RT.unitsAt(G, i, 0).map(function (u) { return unitHtml(u, G); }).join('') + me.hidden.filter(function (h) { return h.loc === i; }).map(function (h) { return hiddenChip(h, true); }).join('') + '</div></div>';
    }).join('') + '</div>';
    h += '<div class="zone' + (dests.indexOf('base') >= 0 ? ' dest' : '') + '" data-base="1"><div class="zl"><span>Your base</span></div><div class="row">' + RT.unitsAt(G, 'base', 0).map(function (u) { return unitHtml(u, G); }).join('') + me.gear.map(gearHtml).join('') + '</div></div>';
    h += '<div class="runes">' + runesHtml(me, 'Runes') + '</div>';
    var canLeg = RT.canUseLegend(G, 0).ok && !S.busy;
    var legState = [me.legend.exhausted ? 'exhausted' : '', me.legend.empowered ? '✦ EMPOWERED' : ''].filter(Boolean).join(' · ');
    h += '<div class="legrow"><button class="legbtn' + (me.legend.exhausted ? ' ex' : '') + (canLeg ? ' can' : '') + (me.legend.empowered ? ' emp' : '') + '" data-legend="0"><span class="art">' + art(me.legend.c, 30, 30) + '</span><span class="t"><b>' + esc(shortName(me.legend.c.name)) + '</b><small>Legend' + (legState ? ' · ' + legState : '') + '</small></span></button>' +
      (me.champion ? '<button class="champ" data-iid="' + me.champion.iid + '"><span class="art">' + art(me.champion.c, 30, 30) + '</span><span class="t"><b>' + esc(me.champion.c.name) + '</b><small>Champion · ' + me.champion.c.energy + ' energy</small></span></button>'
        : '<div class="champ empty"><span class="t"><b>Champion</b><small>played</small></span></div>') + '</div>';
    h += stripHtml(me, 0, G);
    var last = G.log[G.log.length - 1];
    h += '<div class="ticker" data-log="1">' + esc(last ? last.t : '') + '</div>';
    $('board').innerHTML = h;
    flashNew(G);
    // hand
    var hand = me.hand.map(function (card) {
      var c = card.c, can = G.active === 0 && !S.busy && RT.canPlay(G, 0, card.iid, false).ok;
      var pw = ''; for (var i = 0; i < (c.power || 0); i++) pw += '<i style="background:' + DC[RT.cardDomains(c)[0] || 'Colorless'] + '"></i>';
      return '<button class="card' + (can ? ' can' : '') + '" data-iid="' + card.iid + '"><div class="art">' + art(c, 84, 58) + '</div><span class="cost' + (RT.cardCost(c, false, G, 0).energy < (c.energy || 0) ? ' cheap' : '') + '">' + RT.cardCost(c, false, G, 0).energy + '</span><span class="pw">' + pw + '</span>' +
        '<div class="nm">' + esc(c.name) + '</div><div class="ty">' + esc(c.type) + '</div>' + (c.type === 'Unit' ? '<span class="mt">' + (c.might || 0) + '⚔</span>' : '') + '</button>';
    }).join('');
    $('hand').innerHTML = hand || '<div class="empty">No cards in hand</div>';
    renderActions();
    if (G.winner != null) showEnd();
  }
  function destOptions() {
    var G = S.G;
    if (!S.sel.length || S.targeting || S.prompt) return [];
    var units = G.units.filter(function (u) { return S.sel.indexOf(u.uid) >= 0; });
    return ['base', 0, 1].filter(function (d) { return units.length && units.every(function (u) { return RT.canMove(G, u, d); }); });
  }
  function renderActions() {
    var G = S.G, h = '';
    if (G.winner != null) h = '<span class="msg">Game over</span><button class="btn" data-act="log">Log</button><button class="btn primary" data-act="menu">Menu</button>';
    else if (S.prompt && S.prompt.req.type === 'target') {
      var rq = S.prompt.req;
      h = '<span class="msg"><b>' + esc(rq.title) + '</b><br>' + esc(rq.text) + ' — tap a glowing unit</span>' + (rq.optional ? '<button class="btn" data-ans="skip">Skip</button>' : '');
    } else if (S.prompt) {
      h = '<span class="msg">Waiting for your choice…</span><button class="btn primary" data-act="reprompt">Show</button>';
    } else if (S.targeting) {
      var slot = S.targeting.slots[S.targeting.i];
      h = '<span class="msg"><b>Choose a target</b><br>' + esc(RT.describeEffect(slot.e)) + '</span>' + (slot.e.opt ? '<button class="btn" data-act="skipslot">Skip</button>' : '') + '<button class="btn danger" data-act="cancel">Cancel</button>';
    } else if (S.busy || G.active !== 0) {
      h = '<span class="msg">' + (G.active === 0 ? 'Resolving…' : 'AI is playing…') + '</span><button class="btn" data-act="log">Log</button>';
    } else if (S.sel.length) {
      var d = destOptions();
      h = '<div class="scroll">' + (d.length ? d.map(function (x) { return '<button class="btn me" data-move="' + x + '">Move → ' + esc(x === 'base' ? 'Base' : shortName(G.bfs[x].c.name)) + '</button>'; }).join('') : '<span class="msg">No common destination</span>') + '</div>' +
        (S.sel.length === 1 && RT.canUseUnit(G, 0, S.sel[0]).ok ? '<button class="btn small primary" data-unitact="' + S.sel[0] + '">Ability</button>' : '') +
        (S.sel.length === 1 ? '<button class="btn small" data-act="info">Info</button>' : '') + '<button class="btn small" data-act="clear">✕</button>';
    } else {
      var flowable = G.players[0].trash.some(function (x) { return RT.canFlow(G, 0, x.iid).ok; });
      h = '<button class="btn" data-act="log">Log</button><button class="btn' + (flowable ? ' primary' : '') + '" data-act="trash">Trash ' + G.players[0].trash.length + '</button><span class="msg" style="text-align:center;color:var(--muted);font-size:13px">Tap units or gear to move or use them</span><button class="btn primary" data-act="end">End turn</button>';
    }
    $('actions').innerHTML = h;
  }

  /* ---------- sheets ---------- */
  function openSheet(body, foot) {
    S.sheet = true;
    $('sheet').innerHTML = '<div class="grab"></div><div class="body">' + body + '</div>' + (foot ? '<div class="foot">' + foot + '</div>' : '');
    $('sheet').classList.remove('hidden'); $('scrim').classList.remove('hidden');
  }
  function closeSheet() { S.sheet = null; $('sheet').classList.add('hidden'); $('scrim').classList.add('hidden'); }
  $('scrim').onclick = function () { if (!(S.prompt && S.prompt.req.type !== 'target')) closeSheet(); };
  function linesHtml(c) {
    if (!c.P.lines.length) return '<p style="color:var(--muted)">No rules text.</p>';
    return '<ul class="lines">' + c.P.lines.map(function (l) {
      return '<li class="' + (l.sim ? '' : 'no') + '"><span class="tag">' + (l.sim ? 'Simulated' : 'Not simulated') + '</span><br>' + esc(l.text) + '</li>';
    }).join('') + '</ul>';
  }
  function cardHead(c) {
    var doms = RT.cardDomains(c);
    return '<h2>' + esc(c.name) + '</h2><div class="chips"><span class="chip">' + esc(c.type + (c.supertype ? ' · ' + c.supertype : '')) + '</span>' +
      doms.map(function (d) { return '<span class="chip dom" style="--dc:' + DC[d] + '">' + d + '</span>'; }).join('') +
      (c.tags || []).slice(0, 3).map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' +
      (imgOf(c) ? '<div class="fullcard' + (c.type === 'Battlefield' ? ' land' : '') + '"><img src="' + imgOf(c) + '" alt="' + esc(c.name) + ' card"></div>' : '<div class="banner">' + art(c, 340, 70) + '</div>');
  }
  function cardSheet(card) {
    var G = S.G, c = card.c;
    var body = cardHead(c);
    if (c.type !== 'Legend' && c.type !== 'Battlefield') {
      var ec = RT.cardCost(c, false, G, 0, findHiddenOf(card) ? 'hidden' : 'hand').energy;
      body += '<div class="stats"><div><b>' + ec + (ec !== (c.energy || 0) ? ' <s style="font-size:13px;color:var(--muted)">' + (c.energy || 0) + '</s>' : '') + '</b><small>Energy</small></div><div><b>' + (c.power || 0) + '</b><small>Power</small></div><div><b>' +
        (c.type === 'Unit' ? (c.might || 0) : c.P.equip ? '+' + c.P.equipBonus : '–') + '</b><small>Might</small></div></div>';
    }
    body += linesHtml(c);
    if (c.P.equip) body += '<p style="font-size:13px;color:var(--muted)">Equipment: after playing it, pay its Equip cost (' + esc(RT.equipCostText(c)) + ') to attach it to a unit. The Might bonus is estimated from cost.</p>';
    if (findHiddenOf(card)) body += '<p style="font-size:13px;color:var(--muted)">Face down at ' + esc(S.G.bfs[findHiddenOf(card).loc].c.name) + '. Play it for 0 energy (you still pay power), on your turn or in a showdown there.</p>';
    var foot = '', chk = RT.canPlay(G, 0, card.iid, false);
    if (S.busy || G.active !== 0) chk = { ok: false, why: "Wait for your turn." };
    if (c.P.kw.hidden && !findHiddenOf(card) && !S.busy && G.active === 0) {
      var hs = RT.hideSpots(G, 0, card.iid);
      hs.forEach(function (bi) { foot += '<button class="btn" data-hide="' + card.iid + '" data-bf2="' + bi + '">Hide at ' + esc(shortName(G.bfs[bi].c.name)) + ' (1 power)</button>'; });
      if (!hs.length) foot += '<span class="why" style="color:var(--muted)">Hidden: you can hide this face down at a battlefield you control for 1 power, then play it later for 0 energy.</span>';
    }
    if (chk.ok) {
      var spots = RT.ambushSpots(G, 0, c);
      foot += '<button class="btn primary" data-play="' + card.iid + '">Play</button>';
      if (c.P.kw.accelerate && c.type === 'Unit') {
        var ac = RT.canPlay(G, 0, card.iid, true);
        foot += '<button class="btn me" data-play="' + card.iid + '" data-accel="1"' + (ac.ok ? '' : ' disabled') + '>Play ready (Accelerate)</button>';
        if (!ac.ok) foot += '<span class="why">Accelerate: ' + esc(ac.why) + '</span>';
      }
      spots.forEach(function (bi) { foot += '<button class="btn" data-play="' + card.iid + '" data-loc="' + bi + '">Ambush → ' + esc(shortName(G.bfs[bi].c.name)) + '</button>'; });
      var noSim = c.type === 'Spell' && !c.P.spell.length;
      if (noSim) foot += '<span class="why" style="color:var(--muted)">None of this spell is simulated: playing it only spends the card.</span>';
      var first = RT.targetSlots(G, 0, c, {}).filter(function (sl) { return !sl.e.opt; })[0];
      if (first && !first.cands.length) foot += '<span class="why" style="color:var(--muted)">No valid target right now (' + esc(RT.describeEffect(first.e)) + '), so that part will fizzle.</span>';
      else if (c.type === 'Spell' && c.P.spell.length) foot += '<span class="why" style="color:var(--muted)">You\'ll pick targets after tapping Play.</span>';
    } else {
      foot += '<span class="why">' + esc(chk.why) + '</span>';
      if (c.P.kw.accelerate && c.type === 'Unit') foot += '<button class="btn" disabled>Play ready (Accelerate)</button>';
      foot += '<button class="btn" disabled>Play</button>';
    }
    openSheet(body, foot + '<button class="btn" data-act="close">Close</button>');
  }
  function unitSheet(u) {
    var G = S.G, c = u.c, k = RT.kwOf(u);
    var body = cardHead(c) + '<div class="kv">' +
      '<span>Controller</span><span>' + (u.ctrl === 0 ? 'You' : 'AI') + '</span>' +
      '<span>Might</span><span>' + RT.might(u) + ' (base ' + (c.might || 0) + (u.buff ? ', +1 buff' : '') + (u.temp ? ', ' + (u.temp > 0 ? '+' : '') + u.temp + ' this turn' : '') + (u.equips.length ? ', +' + RT.equipBonus(u) + ' gear' : '') + ')</span>' +
      (k.assault ? '<span>Attacking</span><span>' + RT.might(u, 'att') + '</span>' : '') + (k.shield ? '<span>Defending</span><span>' + RT.might(u, 'def') + '</span>' : '') +
      '<span>Damage</span><span>' + u.damage + '</span>' +
      '<span>Status</span><span>' + [u.ex ? 'Exhausted' : 'Ready', u.stun ? 'Stunned' : '', u.token ? 'Token' : ''].filter(Boolean).join(' · ') + '</span>' +
      '<span>Location</span><span>' + (u.loc === 'base' ? 'Base' : esc(G.bfs[u.loc].c.name)) + '</span>' +
      (u.equips.length ? '<span>Gear</span><span>' + u.equips.map(function (g) { return esc(g.c.name) + ' (+' + g.c.P.equipBonus + ')'; }).join(', ') + '</span>' : '') +
      '</div>' + linesHtml(c);
    var foot = '';
    if (c.P.unitAct && u.ctrl === 0) {
      var chk = RT.canUseUnit(G, 0, u.uid); if (S.busy || S.prompt) chk = { ok: false, why: 'Wait for your turn.' };
      foot += '<button class="btn primary" data-unitact="' + u.uid + '"' + (chk.ok ? '' : ' disabled') + '>' + esc(c.P.unitAct.label) + '</button>';
      if (!chk.ok) foot += '<span class="why">' + esc(chk.why) + '</span>';
    }
    if (u.ctrl === 0 && !u.ex && G.active === 0 && !S.busy && !S.prompt && G.winner == null) foot += '<button class="btn me" data-selectu="' + u.uid + '">Select to move</button>';
    openSheet(body, foot + '<button class="btn" data-act="close">Close</button>');
  }
  function trashSheet() {
    var G = S.G, p = G.players[0];
    var rows = p.trash.slice().reverse().map(function (card) {
      var c = card.c, btn = '';
      if (c.P.flow) {
        var chk = RT.canFlow(G, 0, card.iid); if (S.busy || S.prompt) chk = { ok: false };
        btn = '<button class="btn small' + (chk.ok ? ' primary' : '') + '" data-flow="' + card.iid + '"' + (chk.ok ? '' : ' disabled') + '>Flow: ' + c.P.flow.energy + ' energy' + (c.P.flow.power ? ' + ' + c.P.flow.power + ' power' : '') + '</button>';
      }
      return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--line)"><span style="width:28px;height:28px;border-radius:6px;overflow:hidden;flex:none">' + art(c, 28, 28) + '</span>' +
        '<span style="flex:1;min-width:0"><b>' + esc(c.name) + '</b><br><small style="color:var(--muted)">' + esc(c.type) + '</small></span>' + btn + '</div>';
    }).join('');
    openSheet('<h2>Your trash (' + p.trash.length + ')</h2>' + (rows || '<p style="color:var(--muted)">Empty.</p>') +
      '<p style="font-size:13px;color:var(--muted)">Spells with Flow can be cast again from here, then they\'re banished.</p>', '<button class="btn" data-act="close">Close</button>');
  }
  function bfSheet(i) {
    var G = S.G, b = G.bfs[i];
    var body = cardHead(b.c) + '<div class="kv"><span>Controller</span><span>' + (b.ctrl === 0 ? 'You' : b.ctrl === 1 ? 'AI' : 'Nobody') + '</span>' +
      '<span>Your units</span><span>' + RT.unitsAt(G, i, 0).length + '</span><span>AI units</span><span>' + RT.unitsAt(G, i, 1).length + '</span></div>' + linesHtml(b.c);
    openSheet(body, '<button class="btn" data-act="close">Close</button>');
  }
  function legendSheet() {
    var G = S.G, L = G.players[0].legend;
    var body = cardHead(L.c) + linesHtml(L.c), foot = '';
    var acts = RT.legendActs(G, 0);
    body = body.replace('</h2>', L.empowered ? ' <span class="chip empchip">✦ Empowered</span></h2>' : (/Empower|empower/.test(L.c.plain || '') ? ' <span class="chip">Not empowered</span></h2>' : '</h2>'));
    acts.forEach(function (a, i) {
      var chk = RT.canUseLegend(G, 0, i); if (S.busy || S.prompt) chk = { ok: false, why: 'Wait for your turn.' };
      foot += '<button class="btn ' + (chk.ok ? 'primary' : '') + '" data-legact="' + i + '"' + (chk.ok ? '' : ' disabled') + '>' + esc(a.label) + '</button>';
      if (!chk.ok) foot += '<span class="why">' + esc(chk.why) + '</span>';
    });
    if (!acts.length) foot = '<span class="why" style="color:var(--muted)">' + (L.c.P.lines.some(function (l) { return l.sim; }) ? 'Triggered abilities ask you to confirm when they happen.' : 'No simulated abilities.') + '</span>';
    var ai = G.players[1].legend.c;
    body += '<h2 style="margin-top:14px;font-size:18px">AI legend: ' + esc(ai.name) + '</h2>' + linesHtml(ai);
    openSheet(body, foot + '<button class="btn" data-act="close">Close</button>');
  }
  function gearSheet(iid) {
    var G = S.G, g = null;
    G.players.forEach(function (p) { p.gear.forEach(function (x) { if (x.iid === iid) g = x; }); });
    if (!g) return;
    var foot = '';
    if (g.c.P.gearAct && G.players[0].gear.indexOf(g) >= 0) {
      var chk = RT.canUseGear(G, 0, iid); if (S.busy || S.prompt) chk = { ok: false, why: 'Wait for your turn.' };
      foot += '<button class="btn primary" data-gearact="' + iid + '"' + (chk.ok ? '' : ' disabled') + '>' + esc(g.c.P.gearAct.label) + '</button>';
      if (!chk.ok) foot += '<span class="why">' + esc(chk.why) + '</span>';
    }
    if (g.c.P.equip && G.players[0].gear.indexOf(g) >= 0) {
      var eq = RT.canEquip(G, 0, g); if (S.busy || S.prompt) eq = { ok: false, why: 'Wait for your turn.' };
      foot += '<button class="btn primary" data-equip="' + iid + '"' + (eq.ok ? '' : ' disabled') + '>Equip (' + esc(RT.equipCostText(g.c)) + ')</button>';
      if (!eq.ok) foot += '<span class="why">' + esc(eq.why) + '</span>';
    }
    if (g.c.P.addPower) foot += '<span class="why" style="color:var(--muted)">Used automatically when you pay ' + g.c.P.addPower + ' power, so you keep a rune.</span>';
    openSheet(cardHead(g.c) + (g.ex ? '<p class="chip">Exhausted</p>' : '') + linesHtml(g.c), foot + '<button class="btn" data-act="close">Close</button>');
  }
  function logSheet() {
    var G = S.G;
    var body = '<h2>Log</h2><div class="loglist">' + G.log.map(function (l) {
      if (/^— Turn/.test(l.t)) return '<div class="turn">' + esc(l.t) + '</div>';
      return '<div class="p' + l.p + '">' + esc(l.t) + '</div>';
    }).join('') + '</div>';
    openSheet(body, '<button class="btn" data-act="close">Close</button>');
    var b = document.querySelector('#sheet .body'); b.scrollTop = b.scrollHeight;
  }
  function showEnd() {
    var G = S.G, won = G.winner === 0;
    $('end').innerHTML = '<div class="box"><h2>' + (G.winner === -1 ? 'Draw' : won ? 'Victory' : 'Defeat') + '</h2><p>' + G.players[0].points + ' – ' + G.players[1].points + ' after ' + G.turnNo + ' turns</p>' +
      '<button class="btn primary" data-act="again">Play again</button><button class="btn" data-act="menu">Back to menu</button><button class="btn" data-act="log">View log</button></div>';
    $('end').classList.remove('hidden');
  }

  /* ---------- playing with targets ---------- */
  function beginPlay(iid, accel, loc) {
    var G = S.G, p = G.players[0];
    var card = findMine(p, iid);
    if (!card) return;
    closeSheet();
    run(function () { return RT.playCard(G, 0, iid, { accel: accel, loc: loc }); });
  }
  function beginLegend(idx) {
    var G = S.G;
    closeSheet();
    var slots = RT.targetSlots(G, 0, null, { act: idx });
    if (slots.some(function (s) { return s.cands.length; })) { S.sel = []; S.targeting = { kind: 'legend', act: idx, slots: slots, picks: [], i: 0 }; advanceTargeting(); render(); return; }
    run(function () { return RT.useLegend(G, 0, idx, []); });
  }
  // skip slots without candidates
  function advanceTargeting() {
    var T = S.targeting;
    while (T.i < T.slots.length && !T.slots[T.i].cands.length) { T.picks.push(null); T.i++; }
    if (T.i >= T.slots.length) finishTargeting();
  }
  function finishTargeting() {
    var T = S.targeting, G = S.G; S.targeting = null;
    run(function () { return T.kind === 'legend' ? RT.useLegend(G, 0, T.act, T.picks) : RT.playCard(G, 0, T.iid, { accel: T.accel, loc: T.loc, targets: T.picks }); });
  }
  function toast(msg) { if (S.G && msg) S.G.log.push({ t: msg, p: -1, turn: S.G.turnNo }); }

  /* ---------- input ---------- */
  document.addEventListener('click', function (ev) {
    var G = S.G; if (!G) return;
    var t = ev.target;
    var an = t.closest('[data-ans]');
    if (an) { var v = an.dataset.ans; answer(v === 'yes' ? true : v === 'no' ? false : v.indexOf('opt') === 0 ? +v.slice(3) : null); return; }
    if (S.prompt && S.prompt.req.type === 'target') {
      var pu = t.closest('[data-uid]');
      if (pu && S.prompt.req.cands.indexOf(+pu.dataset.uid) >= 0) answer(+pu.dataset.uid);
      else if (t.closest('[data-act=log]')) logSheet();
      return;
    }
    var act = t.closest('[data-act]');
    if (act) {
      var a = act.dataset.act;
      if (a === 'end') endMyTurn();
      else if (a === 'log') { $('end').classList.add('hidden'); logSheet(); }
      else if (a === 'cancel') { S.targeting = null; render(); }
      else if (a === 'trash') trashSheet();
      else if (a === 'skipslot' && S.targeting) { S.targeting.picks.push(null); S.targeting.i++; advanceTargeting(); if (S.targeting) render(); }
      else if (a === 'reprompt' && S.prompt) promptSheet(S.prompt.req);
      else if (a === 'clear') { S.sel = []; render(); }
      else if (a === 'close') closeSheet();
      else if (a === 'info') { var su = G.units.filter(function (u) { return u.uid === S.sel[0]; })[0]; if (su) unitSheet(su); }
      else if (a === 'close' || a === 'legend') closeSheet();
      else if (a === 'again') startGame();
      else if (a === 'menu') { S.G = null; closeSheet(); $('end').classList.add('hidden'); $('game').classList.add('hidden'); $('menu').classList.remove('hidden'); renderMenu(); }
      return;
    }
    var ua = t.closest('[data-unitact]');
    if (ua) { closeSheet(); var uid0 = +ua.dataset.unitact; run(function () { return RT.useUnit(G, 0, uid0); }); return; }
    var fl = t.closest('[data-flow]');
    if (fl) { closeSheet(); var fid = +fl.dataset.flow; run(function () { return RT.playFlow(G, 0, fid); }); return; }
    var su0 = t.closest('[data-selectu]');
    if (su0) { closeSheet(); S.sel = [+su0.dataset.selectu]; render(); return; }
    var hd = t.closest('[data-hide]');
    if (hd) { closeSheet(); var hiid = +hd.dataset.hide, hbi = +hd.dataset.bf2; run(function () { return Promise.resolve(RT.hideCard(G, 0, hiid, hbi)); }); return; }
    var eqb = t.closest('[data-equip]');
    if (eqb) { closeSheet(); var eg = G.players[0].gear.filter(function (x) { return x.iid === +eqb.dataset.equip; })[0]; if (eg) run(function () { return RT.equipGear(G, 0, eg); }); return; }
    if (t.closest('[data-facedown]')) { openSheet('<h2>Face-down card</h2><p>The AI has hidden a card here. It can play it for 0 energy, even during your attack.</p>', '<button class="btn" data-act="close">Close</button>'); return; }
    var ga = t.closest('[data-gearact]');
    if (ga) { closeSheet(); var gid = +ga.dataset.gearact; run(function () { return RT.useGear(G, 0, gid); }); return; }
    var la = t.closest('[data-legact]');
    if (la) { beginLegend(+la.dataset.legact); return; }
    if (S.prompt) return;
    var pl = t.closest('[data-play]');
    if (pl) { beginPlay(+pl.dataset.play, !!pl.dataset.accel, pl.dataset.loc != null ? +pl.dataset.loc : undefined); return; }
    var mv = t.closest('[data-move]');
    if (mv) {
      var dest = mv.dataset.move === 'base' ? 'base' : +mv.dataset.move;
      var uids = S.sel.slice(); S.sel = [];
      run(function () { return RT.moveUnits(G, 0, uids, dest); }); return;
    }
    if (t.closest('#sheet') || t.closest('#end')) return;
    var ue = t.closest('[data-uid]');
    if (ue) {
      var uid = +ue.dataset.uid, u = G.units.filter(function (x) { return x.uid === uid; })[0];
      if (!u) return;
      if (S.targeting) {
        var T = S.targeting;
        if (T.slots[T.i].cands.some(function (x) { return x.uid === uid; })) { T.picks.push(uid); T.i++; advanceTargeting(); if (S.targeting) render(); }
        return;
      }
      var movable = u.ctrl === 0 && G.active === 0 && !S.busy && !S.prompt && G.winner == null && !u.ex && ['base', 0, 1].some(function (d) { return RT.canMove(G, u, d); });
      if (movable) { var i = S.sel.indexOf(uid); if (i >= 0) S.sel.splice(i, 1); else S.sel.push(uid); render(); }
      else unitSheet(u);
      return;
    }
    if (S.targeting) return;
    var ce = t.closest('[data-iid]');
    if (ce) {
      var p = G.players[0], iid = +ce.dataset.iid;
      var card = findMine(p, iid);
      if (card) cardSheet(card);
      return;
    }
    var ge = t.closest('[data-gear]');
    if (ge) { gearSheet(+ge.dataset.gear); return; }
    var em = t.closest('[data-emp]');
    if (em) { empSheet(+em.dataset.emp); return; }
    if (t.closest('[data-legend]')) { legendSheet(); return; }
    if (t.closest('[data-log]')) { logSheet(); return; }
    var be = t.closest('[data-bf]');
    if (be) {
      var bi = +be.dataset.bf;
      if (S.sel.length && destOptions().indexOf(bi) >= 0) { var ids = S.sel.slice(); run(function () { return RT.moveUnits(G, 0, ids, bi); }); }
      else bfSheet(bi);
      return;
    }
    if (t.closest('[data-base]') && S.sel.length && destOptions().indexOf('base') >= 0) { var ib = S.sel.slice(); run(function () { return RT.moveUnits(G, 0, ib, 'base'); }); }
  });

  renderMenu();
})();
