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
      list: L("1 Akali, Silent; 2 Charm; 3 Defy; 3 Shuriken Flip; 2 Twilight Shroud; 3 Discipline; 3 Inferna; 3 Lonely Poro; 3 Mask of Foresight; 3 Mournful Witness; 2 Scuttle Crab; 3 Zhonya's Hourglass; 2 Back Off; 3 Pendulum Blade; 3 Stellacorn Herder; 1 Irelia, Fervent") },
    { id: 'jayce', name: "Jayce", label: 'Singapore RQ 35th', legend: "Jayce - Defender of Tomorrow", champion: "Jayce, Brilliant Inventor", runes: { Mind: 5, Body: 7 },
      bfs: ["Sigil of the Storm", "Forgotten Monument", "Dragon Roost"],
      list: L("1 Jayce, Brilliant Inventor; 3 Bellows Breath; 3 Catalyst of Aeons; 3 Clairvoyance; 3 Dazzling Aurora; 3 Dredge Up; 3 Elder Dragon; 3 Mobilize; 3 Platewyrm Egg; 3 Promising Future; 2 Flurry of Blades; 2 Garbage Grabber; 2 Sabotage; 2 Sprite Burst; 1 Deadly Flourish; 1 Downstage Dramatics; 1 Gutter Palace; 1 Rocket Barrage") },
    { id: 'masteryi', name: "Master Yi", label: 'Singapore RQ 3rd', legend: "Master Yi - Wuju Bladesman", champion: "Master Yi - Tempered", runes: { Calm: 5, Body: 7 },
      bfs: ["Grove of the God-Willow", "Emperor's Dais", "Star Spring"],
      list: L("1 Master Yi - Tempered; 3 Charm; 3 Defy; 3 Discipline; 3 First Mate; 3 Lonely Poro; 3 Pit Rookie; 3 Punch First; 3 Rengar, Trophy Hunter; 3 Scuttle Crab; 2 En Garde; 2 Rampage; 2 Ruin Runner; 2 Zhonya's Hourglass; 1 Alpha Strike; 1 Not So Fast; 1 Onslaught; 1 Sabotage") },
    { id: 'azir', name: "Azir", label: 'TCGArena $2K Showdown 1st', legend: "Azir - Emperor of the Sands", champion: "Azir - Sovereign", runes: { Calm: 6, Order: 6 },
      bfs: ["Trifarian War Camp", "Hall of Legends", "Ornn's Forge"],
      list: L("1 Azir - Sovereign; 3 Arise!; 3 B.F. Sword; 3 Brutalizer; 3 Defy; 3 Discipline; 3 Doran's Shield; 3 Eye of the Herald; 3 Guards!; 3 Hidden Blade; 3 Soul Sword; 2 Desert's Call; 2 Guardian Angel; 2 Sacrifice; 1 Back Off; 1 Charm; 1 Deathgrip") },
    { id: 'vex', name: "Vex", label: 'Shenyang Regional Open 5th', legend: "Vex - Gloomist", champion: "Vex - Apathetic", runes: { Calm: 5, Chaos: 7 },
      bfs: ["Fortified Position", "Targon's Peak", "Threshold of the Gray"],
      list: L("2 Vex - Apathetic; 3 Astral Heron; 3 Defy; 3 Discipline; 3 Stacked Deck; 3 Steel Paws; 3 Switcheroo; 3 Tornado Warrior; 2 Boots of Swiftness; 2 Evelynn - Entrancing; 1 Back Off; 1 Charm; 1 Edge of Night; 1 Gust; 1 Gust Monk; 1 Irelia - Fervent; 1 Mutated Mouser; 1 Rebuke; 1 Ride The Wind; 1 Scuttle Crab; 1 Star-Crossed; 1 Tideturner; 1 Zhonya's Hourglass") },
    { id: 'reksai', name: "Rek'Sai", label: 'Singapore RQ 30th', legend: "Rek'sai - Void Burrower", champion: "Rek'Sai - Breacher", runes: { Fury: 7, Order: 5 },
      bfs: ["The Candlelit Sanctum", "Forbidding Waste", "Mystic Vortex"],
      list: L("1 Rek'Sai - Breacher; 3 Blood Rush; 3 Carrion Dredger; 3 Cull the Weak; 3 Faithful Manufactor; 3 Falling Star; 3 Honest Broker; 3 Imperial Decree; 3 Inferna; 3 Noxus Hopeful; 2 Cleave; 2 Escaped Grayback; 2 Legion Rearguard; 2 Noxian Emissary; 2 Void Rush; 1 Forge of the Future; 1 Salvage") },
    { id: 'riven', name: "Riven", label: "Sacramento Showdown 25k 1st", legend: "Riven - The Exile", champion: "Riven - Broken Blade", runes: { Calm: 5, Chaos: 7 },
      bfs: ["Rakelstake", "Emperor's Dais", "Star Spring"],
      list: L("1 Riven - Broken Blade; 3 Astral Heron; 3 Blade of the Exile; 3 Defy; 3 Discipline; 3 Scuttle Crab; 3 Stellacorn Herder; 3 Tideturner; 3 Zhonya's Hourglass; 2 Battle Preparations; 2 Bedeviling Stranger; 2 Blitzcrank - Impassive; 2 Gust; 2 Reckless Innovator; 2 Switcheroo; 1 Not So Fast; 1 Rebuke; 1 Star-Crossed") },
    { id: 'evelynn', name: "Evelynn", label: "Sacramento Showdown 25k 21st", legend: "Evelynn - Agony's Embrace", champion: "Evelynn - Entrancing", runes: { Body: 4, Chaos: 8 },
      bfs: ["Startipped Peak", "Bandle Scouts' Academy", "Rakelstake"],
      list: L("1 Evelynn - Entrancing; 3 Gutter Guardian; 3 Kinkou Initiate; 3 Pyke - Returned; 3 Tail-Cloaked Matriarch; 3 Tornado Warrior; 2 Boots of Swiftness; 2 Edge of Night; 2 Ezreal - Prodigy; 2 Fizz - Trickster; 2 Hold 'Em; 2 K'Sante - Courageous; 2 Rampage; 2 Rengar - Trophy Hunter; 2 Star-Crossed; 2 Vex - Apathetic; 1 Baron Nashor; 1 Kharox; 1 Onslaught; 1 Switcheroo") },
    { id: 'mordekaiser', name: "Mordekaiser", label: "Sacramento Challenge 7th", legend: "Mordekaiser - Iron Revenant", champion: "Mordekaiser - Dominating", runes: { Order: 6, Fury: 6 },
      bfs: ["Zaun Warrens", "Ruined Monastery", "Minefield"],
      list: L("1 Mordekaiser - Dominating; 3 Carrion Dredger; 3 Kai'Sa - Survivor; 3 Realm of Death; 3 Trifarian Captain; 3 Vi - Peacekeeper; 2 Bilgewater Tracker; 2 Blast Corps Cadet; 2 Escaped Grayback; 2 Hidden Blade; 2 LeBlanc - Fragmented; 2 Long Sword; 2 Seal of Unity; 2 Spectral Matron; 2 Xin Zhao - Vigilant; 1 Brynhir Thundersong; 1 Darius - Trifarian; 1 Falling Star; 1 Ferrous Forerunner; 1 Honest Broker; 1 Vanguard Captain") },
    { id: 'orianna', name: "Orianna", label: "Sacramento Nexus Night 12th", legend: "Orianna - Lady of Clockwork", champion: "Orianna - Exquisite", runes: { Calm: 8, Mind: 4 },
      bfs: ["Ornn's Forge", "Rockfall Path", "Veiled Temple"],
      list: L("1 Orianna - Exquisite; 3 Defy; 3 Discipline; 3 Frigid Jewel; 3 Mask of Foresight; 3 Stupefy; 3 The Ball; 2 Akali - Silent; 2 Brutalizer; 2 Cloth Armor; 2 Command: Attack; 2 Consult the Past; 2 Hunting Blind; 2 Patched Porobot; 2 Plundering Poro; 2 Zhonya's Hourglass; 1 Resplendent Rostrum; 1 Thousand-Tailed Watcher; 1 Twilight Shroud") },
    { id: 'seraphine', name: "Seraphine", label: "Sacramento Nexus Night 25th", legend: "Seraphine - Starry-Eyed Songstress", champion: "Seraphine - Inspiring", runes: { Order: 6, Mind: 6 },
      bfs: ["Void Gate", "Black Rose Sanctum", "Forgotten Monument"],
      list: L("1 Seraphine - Inspiring; 3 Bellows Breath; 3 Carrion Dredger; 3 Concert Poster; 3 Encore; 3 Imperial Decree; 3 Trifarian Captain; 3 Vanguard Captain; 2 Eclipse; 2 Faithful Manufactor; 2 Hidden Blade; 2 Mordekaiser - Dominating; 2 Raucous Anthem; 2 Seal of Unity; 2 Shadow's Call; 2 Stupefy; 2 Thousand-Tailed Watcher") }
  ];

  // Real tournament results from riftbound.gg's meta snapshot (2026-10-27, 45836 matches over 30 days):
  // win rate, sample size, tier, top-8 rate, and the head-to-head matchups the free data includes.
  var REAL = {"kennen":{"wr":0.58,"n":6289,"tier":"S","top8":0.154,"mu":{"jayce":[0.82,441]}},"leblanc":{"wr":0.53,"n":6216,"tier":"A","top8":0.116,"mu":{"reksai":[0.67,263],"vex":[0.32,328]}},"rengar":{"wr":0.55,"n":5600,"tier":"S","top8":0.18,"mu":{"reksai":[0.64,232],"jayce":[0.38,340]}},"irelia":{"wr":0.56,"n":7224,"tier":"S","top8":0.163,"mu":{"reksai":[0.38,304]}},"akali":{"wr":0.48,"n":4108,"tier":"C","top8":0.098,"mu":{"reksai":[0.57,164],"jayce":[0.23,262]}},"jayce":{"wr":0.52,"n":4984,"tier":"B","top8":0.084,"mu":{"akali":[0.77,262],"kennen":[0.18,441]}},"masteryi":{"wr":0.53,"n":4571,"tier":"B","top8":0.138,"mu":{"jayce":[0.36,320]}},"azir":{"wr":0.51,"n":3831,"tier":"B","top8":0.129,"mu":{"jayce":[0.42,266]}},"vex":{"wr":0.53,"n":4011,"tier":"A","top8":0.17,"mu":{"kennen":[0.4,335]}},"reksai":{"wr":0.52,"n":3239,"tier":"C","top8":0.125,"mu":{"jayce":[0.71,215],"leblanc":[0.33,263]}},"riven":{"wr":0.62,"n":709,"tier":"S","top8":0.089,"mu":{"kennen":[0.45,102]}},"evelynn":{"wr":0.45,"n":219,"tier":null,"top8":0,"mu":{"seraphine":[0.6,10]}},"mordekaiser":{"wr":0.45,"n":185,"tier":null,"top8":0.062,"mu":{"akali":[0.64,11],"riven":[0.28,25]}},"orianna":{"wr":0.42,"n":170,"tier":null,"top8":0.031,"mu":{"evelynn":[0.42,12],"kennen":[0.11,10]}},"seraphine":{"wr":0.36,"n":143,"tier":null,"top8":0,"mu":{"evelynn":[0.4,10],"riven":[0.21,15]}}};
  var REAL_DATE = '2026-10-27', REAL_MATCHES = 45836;

  /* ---------------- card data + parser ---------------- */
  var CARDS = [], BYNORM = {};
  function loadCards(arr) {
    CARDS = arr; BYNORM = {};
    arr.forEach(function (c) { BYNORM[norm(c.name)] = c; });
    arr.forEach(function (c) {
      c.P = parseCard(c);
      applyCardScript(c);
      var sc = c.type === 'Legend' && LEGEND_SCRIPTS[norm(c.name)];
      if (sc) {
        c.P.script = sc;
        c.P.lines.forEach(function (l) { l.sim = true; });
        if (sc.acts) c.P.legendActs = sc.acts;
        if (sc.flags) Object.assign(c.P, sc.flags);
      }
    });
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

  var KNOWN_KW = ['Assault', 'Shield', 'Tank', 'Ganking', 'Accelerate', 'Deflect', 'Backline', 'Hunt', 'Temporary', 'Ambush', 'Hidden', 'Reaction', 'Action', 'Equip', 'Disarm', 'Quick-Draw', 'Deploy'];
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
    if ((m = s.match(/^channel (\d+) runes?$/))) return { op: 'channel', n: +m[1], ready: true };
    if ((m = s.match(/^gain (\d+) xp$/))) return { op: 'xp', n: +m[1] };
    if ((m = s.match(/^play (a|an|one|two|three|four|\d+) (ready )?(\d+) might ([a-z' -]+?) unit tokens?(?: with \[(\w+)(?: (\d+))?\])?(?: (here|to your base|in your base))?$/))) {
      var kw = {};
      if (m[5]) kw[m[5].toLowerCase()] = m[6] ? +m[6] : true;
      return { op: 'token', count: NUMW[m[1]] || +m[1], ready: !!m[2], might: +m[3], name: m[4].replace(/\b\w/g, function (x) { return x.toUpperCase(); }), kw: kw, here: m[7] === 'here' };
    }
    if ((m = s.match(/^discard (\d+)$/))) return { op: 'discard', n: +m[1] };
    if ((m = s.match(/^\[burn (\d+)\]$|^burn (\d+)$/))) return { op: 'burn', n: +(m[1] || m[2]) };
    if ((m = s.match(/^play (a|an|one|two|\d+) gold gear tokens? exhausted$/))) return { op: 'gold', n: NUMW[m[1]] || +m[1] };
    if ((m = s.match(/^score (\d+) points?$/))) return { op: 'score', n: +m[1] };
    return null;
  }
  var VERBS = '(?:draw|deal|kill|\\[?stun|\\[?buff|give|ready|move|return|channel|gain|play|discard|score)\\b';
  function parseEffects(s) {
    s = s.trim().replace(/\.$/, '');
    // "you may X to Y": X is an optional cost; Y only happens if you do X.
    var gm = s.match(/^you may (.+?) to (.+)$/i);
    if (gm) {
      var cost = parseEffects(gm[1]), rest = parseEffects(gm[2]);
      if (cost && rest) { cost[0].opt = true; cost[0].gate = true; return cost.concat(rest); }
    }
    var parts = s.split(new RegExp('\\. |, then |,? and (?=' + VERBS + ')', 'i'));
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (!p) continue;
      var e = parseEffect(p);
      if (!e) return null;
      if (/^(then )?you may /i.test(p)) e.opt = true;
      out.push(e);
    }
    return out.length ? out : null;
  }

  function parseCard(c) {
    var P = { lines: [], kw: {}, trig: {}, spell: [], legendActs: [], legendTrig: {}, equip: false, equipBonus: 0 };
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
          if (key === 'assault' || key === 'shield' || key === 'hunt' || key === 'disarm') P.kw[key] = (P.kw[key] || 0) + (k[1] || 1);
          else if (key === 'quick-draw') { P.kw.quickdraw = true; P.kw.reaction = true; }
          else P.kw[key] = true;
          if (key === 'equip') P.equip = true;
        });
      };
      if (kws.some(function (k) { return k[0] === 'Equip'; })) {
        applyKw(); line.sim = true;
        var ec = { energy: 0, power: [], recycleTrash: 0 }, em;
        if ((em = rest.match(/(\d+) energy/))) ec.energy = +em[1];
        (rest.match(/(\w+) rune/g) || []).forEach(function (x) { var d = x.split(' ')[0]; ec.power.push(d === 'rainbow' ? 'any' : d[0].toUpperCase() + d.slice(1)); });
        if ((em = rest.match(/recycle (\d+) cards? from your trash/i))) ec.recycleTrash = +em[1];
        P.equipCost = ec;
        return;
      } // rest is the equip cost
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
          applyKw(); P.legendActs.push({ label: describeEffects(effs), energy: m[1] ? +m[1] : 0, effs: effs, exhaust: true, timing: kws.some(function (k) { return k[0] === 'Reaction'; }) ? 'reaction' : kws.some(function (k) { return k[0] === 'Action'; }) ? 'action' : null }); line.sim = true; return;
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
      if ((m = rest.match(/^when i (conquer or hold|conquer|hold|attack or defend|attack|defend|move to a battlefield|move|win a combat), (.+)$/i))) {
        if ((effs = parseEffects(m[2]))) {
          var k = m[1].toLowerCase();
          if (k === 'conquer or hold') { addTrig('conquer', effs); addTrig('hold', effs); }
          else if (k === 'attack or defend') { addTrig('attack', effs); addTrig('defend', effs); }
          else addTrig({ 'move to a battlefield': 'moveBf', 'win a combat': 'winCombat' }[k] || k, effs);
          applyKw(); line.sim = true;
        }
      }
    });
    if (type === 'Gear' && (P.equip || (c.tags || []).indexOf('Equipment') >= 0)) {
      P.equip = true;
            // Real Might bonus from riftbound.gg when known; otherwise an estimate from cost.
      P.equipBonus = c.mightBonus != null ? c.mightBonus : c.might != null ? c.might : Math.max(1, Math.ceil((c.energy || 0) / 2));
      P.bonusEstimated = c.mightBonus == null;
    }
    return P;
  }

  /* ---------------- helpers ---------------- */
  var UID = 1;
  function shuffle(a, rnd) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function inst(c) { return { iid: UID++, c: c }; }
  function opp(pi) { return 1 - pi; }
  function kwOf(u) {
    var k = u.c.P ? u.c.P.kw : {};
    var lv = u.c.P && u.c.P.levelKw;
    if (lv && u.G && u.G.players[u.ctrl].xp >= lv.level) k = Object.assign({}, k, lv.kw);
    if (u.equips && u.equips.some(function (g) { return g.c.P.grantKw; })) { k = Object.assign({}, k); u.equips.forEach(function (g) { if (g.c.P.grantKw) Object.assign(k, g.c.P.grantKw); }); }
    return u.kwx ? Object.assign({}, k, u.kwx) : k;
  }
  // Does this unit deal combat damage? (stunned units don't; Orianna, Exquisite needs a friendly gear at her location)
  function dealsDamage(u) {
    if (u.stun) return false;
    if (u.c.P.needsGearHere && u.G && !gearAtLoc(u.G, u.ctrl, u.loc)) return false;
    return true;
  }
  function gearAtLoc(G, pi, loc) {
    return G.players[pi].gear.some(function (g) { return (g.loc || 'base') === loc; }) ||
      G.units.some(function (v) { return v.ctrl === pi && v.loc === loc && (v.equips.length || v.animatedGear); });
  }
  function equipBonus(u) { return u.equips.reduce(function (s, g) { return s + (g.c.P.equipBonus || 0); }, 0); }
  function might(u, role) {
    var k = kwOf(u);
    var m = (u.mightOverride != null ? u.mightOverride : (u.c.might || 0)) + u.buff + u.temp + equipBonus(u) + (u.empowered && u.c.P.empoweredMight || 0) + (u.G ? auraMight(u.G, u) : 0);
    if (role === 'att') m += (k.assault || 0) + (u.tempAssault || 0);
    if (role === 'def') m += (k.shield || 0) + (u.combatShield || 0) + (u.G && u.loc !== 'base' ? u.G.players[u.ctrl].gear.reduce(function (s3, g) { return s3 + (g.loc === u.loc && g.c.P.shieldHere ? g.c.P.shieldHere : 0); }, 0) : 0);
    var G0 = u.G;
    if (G0 && u.loc !== 'base') {
      var bn = norm(G0.bfs[u.loc].c.name);
      if (bn === 'trifarianwarcamp') m += 1;
      if (role === 'def' && unitsAt(G0, u.loc, u.ctrl).length === 1) {
        if (bn === 'forbiddingwaste') m -= 2;
        var lg = G0.players[u.ctrl].legend.c;
        if (lg && lg.P.defendAloneBonus) m += lg.P.defendAloneBonus;
      }
    }
    return Math.max(0, m);
  }
  function auraMight(G, u) {
    return G.units.reduce(function (s, v) { return s + (v !== u && v.ctrl === u.ctrl && v.c.P.auraOthers ? v.c.P.auraOthers : 0); }, 0);
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
  async function newGame(deckA, deckB, opts) {
    opts = opts || {};
    var rnd = opts.rnd || Math.random;
    var G = { players: [], units: [], bfs: [], active: 0, playedThisTurn: 0, turnNo: 0, log: [], winner: null, rnd: rnd, onLog: opts.onLog || null, maxTurns: opts.maxTurns || 0 };
    [deckA, deckB].forEach(function (d, pi) {
      var main = d.cards.slice();
      var ci = d.championCard ? main.indexOf(d.championCard) : -1;
      if (ci >= 0) main.splice(ci, 1);
      var runeDeck = [];
      Object.keys(d.runes).forEach(function (k) { for (var i = 0; i < d.runes[k]; i++) runeDeck.push(k); });
      var p = {
        pi: pi, name: (opts.names || ['You', 'AI'])[pi], deck: shuffle(main.map(inst), rnd), deckDef: d, hand: [], trash: [],
        runeDeck: shuffle(runeDeck, rnd), runes: [], points: 0, xp: 0, scored: {}, turns: 0,
        legend: { c: d.legendCard, exhausted: false, used: {}, empowered: false }, champion: d.championCard ? inst(d.championCard) : null, gear: [], hidden: [], readyRunesEOT: 0
      };
      G.players.push(p);
    });
    G.bfs = [deckA, deckB].map(function (d) { return { c: d.bfCards[Math.floor(rnd() * d.bfCards.length)], ctrl: null }; });
    G.players.forEach(function (p) { for (var i = 0; i < 4; i++) drawOne(G, p.pi, true); });
    G.first = Math.floor(rnd() * 2);
    G.active = G.first;
    log(G, (G.first === 0 ? G.players[0].name + ' go' : G.players[1].name + ' goes') + ' first. Battlefields: ' + bfName(G, 0) + ' and ' + bfName(G, 1) + '.');
    G.human = opts.human != null ? opts.human : -1;
    // Per-player stats used for the post-game tips.
    G.stats = [0, 1].map(function () { return { unspent: 0, idle: 0, attacks: 0, attacksWon: 0, attacksBounced: 0, attacksLost: 0, conquerPts: 0, holdPts: 0, otherPts: 0, unitsLost: 0, played: 0, turns: 0, emptyBfTurns: 0, cardsLeft: 0 }; });
    G.ask = opts.ask || null;
    await startTurn(G);
    return G;
  }

  /* ---------------- resources ---------------- */
  function drawOne(G, pi, silent) {
    var p = G.players[pi];
    if (!p.deck.length) {
      if (!p.trash.length) { return; }
      p.deck = shuffle(p.trash.splice(0), G.rnd);
      log(G, p.name + ' burned out: trash shuffled into a new deck, ' + G.players[opp(pi)].name + ' scores 1.', pi);
      addPoints(G, opp(pi), 1, p.name + ' burned out');
      if (G.winner != null) return;
    }
    p.hand.push(p.deck.shift());
    p.drawsTurn = (p.drawsTurn || 0) + 1;
    if (p.drawsTurn === 2 && p.gear.some(function (g) { return g.c.P.secondDrawBonus; })) p.jewelPending = (p.jewelPending || 0) + p.gear.filter(function (g) { return g.c.P.secondDrawBonus; }).length;
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
  // Ready gear that can [Add] power of one of these domains (Seal of Discord).
  function powerGear(p, domains) { return p.gear.filter(function (g) { return !g.ex && g.c.P.addPower && (g.c.P.addPower === 'any' || domains.indexOf(g.c.P.addPower) >= 0); }); }
  // Energy you can spend now: ready runes, energy [Add]ed this turn (pool), and ready energy gear (Platewyrm Egg).
  function energyGear(p) { return p.gear.filter(function (g) { return !g.ex && g.c.P.addEnergy; }); }
  function energyAvail(p) {
    return p.runes.filter(function (r) { return !r.ex; }).length + (p.pool || 0) +
      energyGear(p).reduce(function (s2, g) { return s2 + (g.empowered ? 2 : 1); }, 0);
  }
  function poolPowerFor(p) { return (p.poolPower || 0) + (p.payingUnitOrGear ? (p.poolPowerUG || 0) : 0); }
  function canPay(p, energy, power, domains) {
    var ready = energyAvail(p);
    var match = p.runes.filter(function (r) { return domains.indexOf(r.d) >= 0; }).length + powerGear(p, domains).length + poolPowerFor(p) +
      domains.reduce(function (s2, d) { return s2 + ((p.poolDom || {})[d] || 0); }, 0);
    return ready >= energy && match >= power;
  }
  function pay(G, pi, energy, power, domains) {
    var p = G.players[pi];
    var isMatch = function (r) { return domains.indexOf(r.d) >= 0; };
    while (power > 0 && p.payingUnitOrGear && p.poolPowerUG > 0) { p.poolPowerUG--; power--; }
    while (power > 0 && p.poolPower > 0) { p.poolPower--; power--; }
    domains.forEach(function (d) { while (power > 0 && p.poolDom && p.poolDom[d] > 0) { p.poolDom[d]--; power--; } });
    var seals = powerGear(p, domains);
    seals.sort(function (a, b) { return (a.c.P.addPower === 'any') - (b.c.P.addPower === 'any'); });
    while (power > 0 && seals.length) {
      var g = seals.shift(); power--;
      if (g.c.P.consumed) { p.gear.splice(p.gear.indexOf(g), 1); log(G, 'A Gold token is spent for 1 power.', pi); }
      else { g.ex = true; log(G, g.c.name + ' adds ' + g.c.P.addPower + ' power.', pi); }
    }
    while (energy > 0 && p.pool > 0) { p.pool--; energy--; }
    energyGear(p).forEach(function (g) {
      if (energy <= 0) return;
      var n = g.empowered ? 2 : 1; g.ex = true; energy = Math.max(0, energy - n);
      log(G, g.c.name + ' adds ' + n + ' energy.', pi);
    });
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
  var GOLD = { name: 'Gold', type: 'Gear', supertype: 'Token', domain: ['Colorless'], energy: 0, power: 0, rich: '', plain: '', tags: [],
    P: { lines: [{ text: 'Kill this, exhaust: add 1 power of any domain (used automatically when you pay).', sim: true }], kw: {}, trig: {}, spell: [], legendActs: [], legendTrig: {}, addPower: 'any', consumed: true } };
  // Energy cost after Legion and similar reductions. from === 'hidden' means played from face down (0 energy).
  function cardCost(c, accel, G, pi, from) {
    var e = c.energy || 0, pw = c.power || 0;
    if (G && c.P.costMod) e = Math.max(0, e + c.P.costMod(G, pi));
    if (G && c.type === 'Gear' && c.supertype !== 'Token' && G.players[pi].gearTurn !== G.turnNo &&
        G.bfs.some(function (b) { return b.ctrl === pi && norm(b.c.name) === 'ornnsforge'; })) e = Math.max(0, e - 1);
    var disc = G && G.players[pi].discountNext;
    if (disc && disc.turn === G.turnNo) { e = Math.max(0, e - disc.energy); pw = Math.max(0, pw - disc.power); }
    if (from === 'hidden') e = 0;
    if (accel) { e += 1; pw += 1; }
    return { energy: e, power: pw, domains: cardDomains(c) };
  }

  /* ---------------- scoring ---------------- */
  // Every point goes through here so the log (and the UI pop-up) can say who scored, why, and the new total.
  // Every XP gain goes through here: it logs the new total and announces Level thresholds reached.
  function levelCards(G, pi) {
    var d = G.players[pi].deckDef, seen = {}, out = [];
    (d ? d.cards.concat(d.championCard ? [d.championCard] : []) : []).forEach(function (c) { if (c.P.levelKw && !seen[c.name]) { seen[c.name] = 1; out.push({ name: c.name, level: c.P.levelKw.level, kw: Object.keys(c.P.levelKw.kw) }); } });
    return out.sort(function (a, b) { return a.level - b.level; });
  }
  function gainXp(G, pi, n, src) {
    var p = G.players[pi], before = p.xp;
    p.xp += n;
    log(G, '⬆ ' + p.name + ' +' + n + ' XP — ' + src + '  (total ' + p.xp + ' XP)', pi);
    levelCards(G, pi).forEach(function (lc) {
      if (before < lc.level && p.xp >= lc.level) log(G, '⬆ Level ' + lc.level + ' reached: ' + lc.name + ' now has ' + lc.kw.map(function (k) { return k[0].toUpperCase() + k.slice(1); }).join(' and ') + '.', pi);
    });
  }
  function addPoints(G, pi, n, why) {
    if (G.winner != null) return;
    var p = G.players[pi];
    p.points = Math.min(WIN, p.points + n);
    log(G, '★ ' + p.name + ' +' + n + ' point' + (n > 1 ? 's' : '') + (why ? ' — ' + why : '') + '  (' + p.points + '/' + WIN + ')', pi);
    event(G, { t: 'pts', pi: pi, n: n, why: why || '' });
    if (G.stats) { var st = G.stats[pi]; if (/^conquered/.test(why || '')) st.conquerPts += n; else if (/^held/.test(why || '')) st.holdPts += n; else st.otherPts += n; }
    if (p.points >= WIN) { G.winner = pi; log(G, p.name + (pi === 0 ? ' win' : ' wins') + '!', pi); }
  }
  function scoreBf(G, pi, bi, how) {
    var p = G.players[pi];
    if (p.scored[bi] || G.winner != null) return;
    if (norm(G.bfs[bi].c.name) === 'forgottenmonument' && p.turns < 3) { log(G, '★ Forgotten Monument: ' + p.name + " can't score here until their third turn.", pi); return; }
    p.scored[bi] = true;
    if (how === 'conquer' && p.points === WIN - 1) {
      var all = G.bfs.every(function (b, i) { return i === bi || p.scored[i]; });
      if (!all) { log(G, '★ ' + p.name + ' can\'t take the final point by conquering (the other battlefield isn\'t scored this turn): draw 1 instead.', pi); drawOne(G, pi); return; }
    }
    addPoints(G, pi, 1, (how === 'conquer' ? 'conquered ' : 'held ') + bfName(G, bi));
  }

  /* ---------------- decisions ---------------- */
  // Ask the human (if this player is the human and the UI provided G.ask); otherwise use the automatic answer.
  // req: {type:'confirm', title, text, auto} -> bool, or {type:'target', title, text, cands:[uid], optional, auto} -> uid|null
  async function ask(G, pi, req) {
    if (G.ask && G.human === pi && G.winner == null) return await G.ask(req, pi);
    return req.auto;
  }
  async function confirm(G, pi, title, text, auto) {
    return !!(await ask(G, pi, { type: 'confirm', title: title, text: text, auto: auto !== false }));
  }

  /* ---------------- scripted legends ---------------- */
  // Legends whose text the generic parser can't handle. Each one simulates its printed abilities.
  function anyRuneCount(p) { return p.runes.length; }
  function recycleAnyRune(p) { recycleRune(p, p.runes.slice().sort(function (a, b) { return b.ex - a.ex; })[0]); }
  // Power of any domain ("rainbow"): added power first, then Seal/Gold gear, then recycle runes.
  function anyPowerAvail(p) {
    var dom = Object.keys(p.poolDom || {}).reduce(function (s2, k) { return s2 + p.poolDom[k]; }, 0);
    return p.runes.length + (p.poolPower || 0) + dom + (p.payingUnitOrGear ? (p.poolPowerUG || 0) : 0) + p.gear.filter(function (g) { return !g.ex && g.c.P.addPower; }).length;
  }
  function payAnyPower(G, pi, n, why) {
    var p = G.players[pi];
    for (var i = 0; i < n; i++) {
      if (p.payingUnitOrGear && p.poolPowerUG > 0) { p.poolPowerUG--; continue; }
      if (p.poolPower > 0) { p.poolPower--; continue; }
      var dk = Object.keys(p.poolDom || {}).filter(function (k) { return p.poolDom[k] > 0; })[0];
      if (dk) { p.poolDom[dk]--; continue; }
      var g = p.gear.filter(function (x) { return !x.ex && x.c.P.addPower; }).sort(function (a, b) { return !!a.c.P.consumed - !!b.c.P.consumed; })[0];
      if (g) {
        if (g.c.P.consumed) { p.gear.splice(p.gear.indexOf(g), 1); log(G, 'A Gold token is spent for 1 power' + (why ? ' (' + why + ')' : '') + '.', pi); }
        else { g.ex = true; log(G, g.c.name + ' adds ' + g.c.P.addPower + ' power' + (why ? ' (' + why + ')' : '') + '.', pi); }
        continue;
      }
      if (p.runes.length) recycleAnyRune(p);
    }
  }
  var KENNEN = {
    // When you play a card from anywhere other than your hand (here: the champion zone), empower me.
    onPlayCard: function (G, pi, from) {
      var L = G.players[pi].legend;
      if (from === 'hand') return;
      if (!L.empowered) { L.empowered = true; log(G, '✦ ' + L.c.name + ' is empowered (you played a card from ' + ({ champion: 'your champion zone', hidden: 'face down', trash: 'your trash' }[from] || 'outside your hand') + ').', pi); }
      else log(G, L.c.name + ' is already empowered.', pi);
    },
    acts: [{
      label: 'Disempower me, exhaust: give a unit [Assault 2] this turn', energy: 0, exhaust: true, timing: 'action',
      req: function (G, pi, L) { return L.empowered ? null : 'Kennen must be empowered first (play a card from your champion zone).'; },
      effs: [{ op: 'assault', n: 2, t: { sel: 'friendly', where: null } }],
      pay: function (G, pi, L) { L.empowered = false; }
    }]
  };
  var AKALI = {
    acts: [{
      id: 'empower', label: 'Empower me (3 energy + 1 power)', energy: 3, power: 1, powerAny: true, exhaust: false,
      req: function (G, pi, L) { return L.empowered ? 'Already empowered.' : null; },
      effs: [], pay: function (G, pi, L) { L.empowered = true; log(G, '✦ ' + L.c.name + ' is empowered.', pi); }
    }, {
      label: 'Exhaust: move a friendly unit at a battlefield to base (and ready it if I\'m empowered)', energy: 0, exhaust: true, timing: 'action',
      req: function (G) { return null; },
      getEffs: function (G, pi, L) {
        var e = [{ op: 'tobase', t: { sel: 'friendly', where: 'bf' } }];
        if (L.empowered) e.push({ op: 'ready', t: { sel: 'it' } });
        return e;
      }
    }]
  };
  var IRELIA = {
    // When you choose a friendly unit, you may exhaust me and pay 1 power to ready it.
    onChoose: async function (G, pi, u) {
      var p = G.players[pi], L = p.legend;
      if (L.exhausted || !anyPowerAvail(p) || u.dead || u.ctrl !== pi) return;
      if (!(await confirm(G, pi, L.c.name, 'Exhaust Irelia and recycle 1 rune to ready ' + u.c.name + '?', u.ex))) return;
      L.exhausted = true; payAnyPower(G, pi, 1, L.c.name); u.ex = false;
      log(G, L.c.name + ': recycled a rune to ready ' + u.c.name + '.', pi);
    },
    // When you conquer, you may pay 1 energy to ready me.
    on: {
      conquer: async function (G, pi) {
        var p = G.players[pi], L = p.legend;
        if (!L.exhausted || !energyAvail(p) > 0) return;
        if (!(await confirm(G, pi, L.c.name, 'Pay 1 energy to ready Irelia?', true))) return;
        pay(G, pi, 1, 0, []); L.exhausted = false; log(G, L.c.name + ' readies.', pi);
      }
    }
  };
  async function leblancTrigger(G, pi, ctx) {
    var p = G.players[pi], L = p.legend, loc = ctx.loc;
    if (L.exhausted || !p.hand.length || loc == null) return;
    var others = unitsAt(G, loc);
    if (!others.length) return;
    var worst = p.hand.slice().sort(function (a, b) { return (a.c.energy || 0) - (b.c.energy || 0); })[0];
    var best = others.slice().sort(function (a, b) { return unitValue(b) - unitValue(a); })[0];
    if (!(await confirm(G, pi, L.c.name, 'Discard ' + worst.c.name + ' and exhaust LeBlanc to play a ready Reflection at ' + bfName(G, loc) + ' that copies a unit there (it has Temporary)?', true))) return;
    var pick = await ask(G, pi, { type: 'target', title: L.c.name, text: 'Choose a unit to copy', cands: others.map(function (u) { return u.uid; }), optional: false, auto: best.uid });
    var src = others.filter(function (u) { return u.uid === pick; })[0] || best;
    p.hand.splice(p.hand.indexOf(worst), 1); p.trash.push(worst);
    L.exhausted = true;
    var r = makeUnit(G, pi, src.c, UID++, loc, true, true);
    r.kwx = { temporary: true }; r.reflection = true;
    log(G, p.name + ' discard' + (pi === 0 ? '' : 's') + ' ' + worst.c.name + '; a Reflection of ' + src.c.name + ' appears at ' + bfName(G, loc) + '.', pi);
  }
  var LEBLANC = { on: { conquer: leblancTrigger, hold: leblancTrigger } };
  var JAYCE = {
    acts: [{
      label: 'Empower me (2 energy + 2 power)', energy: 2, power: 2, exhaust: false,
      req: function (G, pi, L) { return L.empowered ? 'Already empowered.' : null; },
      effs: [], pay: function (G, pi, L) { L.empowered = true; log(G, '✦ ' + L.c.name + ' is empowered.', pi); }
    }, {
      label: '1 energy, exhaust: ready a gear (2 gear if empowered)', energy: 1, exhaust: true,
      req: function (G, pi) { return G.players[pi].gear.some(function (g) { return g.ex && !g.token; }) ? null : 'You have no exhausted gear.'; },
      getEffs: function (G, pi, L) { return [{ op: 'readyGear', n: L.empowered ? 2 : 1 }]; }
    }]
  };
  var AZIR = {
    flags: { sandWeaponmaster: true },
    acts: [{
      label: '1 energy, exhaust: play a 2 Might Sand Soldier to your base', energy: 1, exhaust: true,
      req: function (G, pi) { return G.players[pi].equipTurn === G.turnNo ? null : 'Use only if you\'ve played an Equipment this turn.'; },
      effs: [{ op: 'token', count: 1, ready: false, might: 2, name: 'Sand Soldier', kw: {}, here: false }]
    }]
  };
  var MASTERYI = { flags: { defendAloneBonus: 2 } };
  var REKSAI = {
    on: {
      conquer: async function (G, pi) {
        var p = G.players[pi], L = p.legend;
        if (L.exhausted || !p.deck.length) return;
        if (!(await confirm(G, pi, L.c.name, "Exhaust Rek'Sai to reveal the top 2 cards of your deck and maybe play one?", true))) return;
        L.exhausted = true;
        await revealAndPlay(G, pi, 2, 0, L.c.name, 'recycle');
      }
    }
  };
  var LEGEND_SCRIPTS = {
    jaycedefenderoftomorrow: JAYCE, aziremperorofthesands: AZIR, masteryiwujubladesman: MASTERYI, reksaivoidburrower: REKSAI,
    heartofthetempest: KENNEN, yordlekennenheartofthetempest: KENNEN,
    akalirogueassassin: AKALI, rogueassassin: AKALI,
    ireliabladedancer: IRELIA,
    leblancdeceiver: LEBLANC
  };

  /* ---------------- scripted spells & gear ---------------- */
  async function choose(G, pi, title, text, options, optional, auto) {
    if (!options.length) return null;
    var r = await ask(G, pi, { type: 'choice', title: title, text: text, options: options, optional: !!optional, auto: auto == null ? (optional ? null : 0) : auto });
    return r == null ? null : r;
  }
  function destinations(G, u) {
    var d = [];
    if (u.loc !== 'base') d.push('base');
    G.bfs.forEach(function (b, i) { if (i !== u.loc) d.push(i); });
    return d;
  }
  // Move a unit by an effect (no exhaust). Arriving at a battlefield works like a normal move for its controller.
  async function effectMove(G, u, dest) {
    var pi = u.ctrl;
    leaveBonus(G, u);
    u.loc = dest;
    log(G, u.c.name + ' moves to ' + locName(G, dest) + '.', pi);
    updateControl(G);
    await fireUnit(G, u, 'move'); if (dest !== 'base') await fireUnit(G, u, 'moveBf');
    if (dest !== 'base' && !u.dead && G.winner == null) {
      var enemies = unitsAt(G, dest, opp(pi));
      if (enemies.length) await combat(G, pi, dest, [u], enemies);
      else if (G.bfs[dest].ctrl !== pi) await conquer(G, pi, dest, [u]);
    }
  }
  async function moveChosen(G, pi, u, title) {
    var ds = destinations(G, u);
    var auto = u.ctrl === pi ? ds.indexOf(ds.filter(function (d) { return d !== 'base' && G.bfs[d].ctrl !== pi && !unitsAt(G, d, opp(pi)).length; })[0]) : ds.indexOf('base');
    var k = await choose(G, pi, title, 'Move ' + u.c.name + ' to:', ds.map(function (d) { return d === 'base' ? (u.ctrl === pi ? 'Your base' : 'Its base') : bfName(G, d); }), false, auto < 0 ? 0 : auto);
    if (k == null) return;
    await effectMove(G, u, ds[k]);
  }
  function reflectionOf(G, pi, src, loc) {
    var r = makeUnit(G, pi, src.c, UID++, loc, true, true);
    r.kwx = { temporary: true }; r.reflection = true;
    return r;
  }
  async function playFree(G, pi, card, loc, title) {
    var c = card.c, p = G.players[pi];
    var u = makeUnit(G, pi, c, card.iid, loc, !!c.P.kw.entersready, false);
    log(G, title + ': ' + p.name + ' play' + (pi === 0 ? '' : 's') + ' ' + c.name + ' to ' + locName(G, loc) + ' for free.', pi);

    G.playedThisTurn++;
    var lsc = p.legend.c && p.legend.c.P.script;
    if (lsc && lsc.onPlayCard) lsc.onPlayCard(G, pi, 'elsewhere');
    await unitEntered(G, pi, u, 'elsewhere');
    await fireLegend(G, pi, 'playUnit', { loc: loc });
    await resolveEffects(G, pi, playEffects(c), { src: u, loc: loc, srcName: c.name });
    if (loc !== 'base' && !u.dead && G.winner == null) {
      var enemies = unitsAt(G, loc, opp(pi));
      if (enemies.length) await combat(G, pi, loc, [u], enemies);
      else if (G.bfs[loc].ctrl !== pi) await conquer(G, pi, loc, [u]);
    }
    return u;
  }
  var OPS = {
    mark: async function () {},
    burn: async function (G, pi, e, tg, ctx) { var n = burn(G, pi, e.n); log(G, (ctx.srcName || 'Effect') + ': ' + G.players[pi].name + ' burn' + (pi === 0 ? '' : 's') + ' ' + n + ' (top of deck to trash).', pi); },
    gold: async function (G, pi, e, tg, ctx) { addGold(G, pi, e.n || 1, ctx.srcName); },
    pull: async function (G, pi, e, tg, ctx) {
      var u = tg[0], dest = ctx.src ? ctx.src.loc : ctx.loc;
      if (!u || dest == null || dest === 'base') return;
      u.loc = dest; updateControl(G);
      log(G, (ctx.srcName || 'Effect') + ' pulls ' + u.c.name + ' to ' + bfName(G, dest) + '.', pi);
    },
    lookUnit: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], top = p.deck.splice(0, e.n), units = top.filter(function (x) { return x.c.type === 'Unit'; });
      var k = null;
      if (units.length) {
        var v = units.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); });
        k = await choose(G, pi, ctx.srcName, 'Top ' + e.n + ': ' + top.map(function (x) { return x.c.name; }).join(', ') + '. Reveal a unit and draw it?', units.map(function (x) { return x.c.name; }), true, v.indexOf(Math.max.apply(null, v)));
      }
      var got = k != null ? units[k] : null;
      if (got) { p.hand.push(got); log(G, (ctx.srcName || 'Effect') + ': ' + p.name + ' reveal' + (pi === 0 ? '' : 's') + ' and draw' + (pi === 0 ? '' : 's') + ' ' + got.c.name + '.', pi); }
      top.forEach(function (x) { if (x !== got) p.deck.push(x); });
    },
    fromHand: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], units = p.hand.filter(function (x) { return x.c.type === 'Unit' && canPay(p, 0, x.c.power || 0, cardDomains(x.c)); });
      if (!units.length) return;
      var v = units.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); });
      var k = await choose(G, pi, ctx.srcName, 'Play a unit from your hand to your base, ignoring its Energy cost (you pay its power):', units.map(function (x) { return x.c.name; }), false, v.indexOf(Math.max.apply(null, v)));
      if (k == null) return;
      var card = units[k];
      pay(G, pi, 0, card.c.power || 0, cardDomains(card.c));
      p.hand.splice(p.hand.indexOf(card), 1);
      await playFree(G, pi, card, 'base', ctx.srcName);
    },
    revealHand: async function (G, pi, e, tg, ctx) {
      var o = G.players[opp(pi)];
      log(G, (ctx.srcName || 'Effect') + ': ' + o.name + "'s hand is " + (o.hand.map(function (x) { return x.c.name; }).join(', ') || 'empty') +
        (o.hidden.length ? '; face-down: ' + o.hidden.map(function (h) { return h.card.c.name + ' at ' + bfName(G, h.loc); }).join(', ') : '') + '.', pi);
    },
    drawIfAlone: async function (G, pi, e, tg, ctx) { if (ctx.diedAlone) { drawOne(G, pi); log(G, (ctx.srcName || 'Effect') + ' died alone: draw 1.', pi); } },
    grantFlow: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], spells = p.trash.filter(function (x) { return x.c.type === 'Spell'; });
      if (!spells.length) return;
      var v = spells.map(function (x) { return x.c.energy || 0; });
      var k = await choose(G, pi, ctx.srcName, 'Give a spell in your trash Flow (cast it again this turn from the Trash for its cost):', spells.map(function (x) { return x.c.name + ' (' + (x.c.energy || 0) + ' energy)'; }), false, v.indexOf(Math.max.apply(null, v)));
      if (k == null) return;
      spells[k].tempFlow = { energy: spells[k].c.energy || 0, power: spells[k].c.power || 0 };
      log(G, (ctx.srcName || 'Effect') + ': ' + spells[k].c.name + ' gains Flow this turn.', pi);
    },
    shrinkAll: async function (G, pi, e) {
      G.units.filter(function (u) { return u.ctrl !== pi; }).forEach(function (u) { var m = might(u); var d = Math.min(e.n, Math.max(0, m - 1)); u.temp -= d; });
      log(G, 'Enemy units get -' + e.n + ' Might this turn (minimum 1).', pi);
    },
    drawIfMight: async function (G, pi, e, tg, ctx) {
      var tot = unitsOf(G, pi).filter(function (u) { return u !== ctx.src; }).reduce(function (s2, u) { return s2 + might(u); }, 0);
      if (tot >= e.n) { drawOne(G, pi); log(G, (ctx.srcName || 'Effect') + ': your other units have ' + tot + ' Might, draw 1.', pi); }
    },
    swapLoc: async function (G, pi, e, tg, ctx) {
      var me = ctx.src, u = tg[0];
      if (!me || !u || me === u) return;
      var a = me.loc; me.loc = u.loc; u.loc = a; updateControl(G);
      log(G, me.c.name + ' and ' + u.c.name + ' swap places.', pi);
    },
    fizz: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], spells = p.trash.filter(function (x) { return x.c.type === 'Spell' && (x.c.energy || 0) <= 3 && x.c.P.spell.length && !x.c.P.counter && canPay(p, 0, x.c.power || 0, cardDomains(x.c)); });
      if (!spells.length) return;
      var v = spells.map(function (x) { return evalEffects(G, pi, x.c.P.spell, { src: null, loc: null }).value; });
      var k = await choose(G, pi, ctx.srcName, 'Play a spell (3 energy or less) from your trash for free (you pay its power)? It is recycled after.', spells.map(function (x) { return x.c.name; }), true, Math.max.apply(null, v) >= 1.5 ? v.indexOf(Math.max.apply(null, v)) : null);
      if (k == null) return;
      var card = spells[k];
      pay(G, pi, 0, card.c.power || 0, cardDomains(card.c));
      p.trash.splice(p.trash.indexOf(card), 1);
      log(G, (ctx.srcName || 'Effect') + ': ' + p.name + ' cast' + (pi === 0 ? '' : 's') + ' ' + card.c.name + ' from the trash.', pi);
      var sc = p.legend.c && p.legend.c.P.script; if (sc && sc.onPlayCard) sc.onPlayCard(G, pi, 'trash');
      await resolveEffects(G, pi, card.c.P.spell, { src: null, loc: null, srcName: card.c.name, spell: card });
      p.deck.push(card);
    },
    empowerTemp: async function (G, pi, e, tg, ctx) { tg.forEach(function (u) { if (!u.empowered) { u.empowered = true; u.tempEmpowered = true; } }); log(G, '✦ ' + (ctx.srcName || 'Effect') + ' empowers ' + tg[0].c.name + ' until end of turn.', pi); },
    predict: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi];
      if (!p.deck.length) return;
      var top = p.deck[0];
      if (await confirm(G, pi, ctx.srcName || 'Predict', 'Predict: the top card of your deck is ' + top.c.name + '. Recycle it (put it on the bottom)?', (top.c.energy || 0) > 5)) { p.deck.push(p.deck.shift()); log(G, p.name + ' recycle' + (pi === 0 ? '' : 's') + ' the top card (Predict).', pi); }
    },
    seatDraw: async function (G, pi, e, tg, ctx) {
      var n = G.bfs.filter(function (b, i) { return b.ctrl === pi && i !== ctx.loc; }).length;
      for (var i = 0; i < n; i++) drawOne(G, pi);
      log(G, 'Seat of Power: draw ' + n + '.', pi);
    },
    dais: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], here = unitsAt(G, ctx.loc, pi);
      if (!here.length || !energyAvail(p) > 0) return;
      var wk = here.slice().sort(function (a, b) { return unitValue(a) - unitValue(b); })[0];
      var auto = here.length > 1 && might(wk) <= 2 ? wk.uid : null;
      var pick = await ask(G, pi, { type: 'target', title: "Emperor's Dais", text: 'Pay 1 energy to return a unit here to hand and play a 2 Might Sand Soldier here?', cands: here.map(function (x) { return x.uid; }), optional: true, auto: auto });
      var u = here.filter(function (x) { return x.uid === pick; })[0];
      if (!u) return;
      pay(G, pi, 1, 0, []);
      removeUnit(G, u); if (!u.token) p.hand.push({ iid: u.iid, c: u.c }); u.dead = true;
      makeUnit(G, pi, tokenCard({ name: 'Sand Soldier', might: 2, kw: {} }), UID++, ctx.loc, false, true);
      log(G, "Emperor's Dais: " + u.c.name + ' returns to hand; a 2 Might Sand Soldier takes its place.', pi);
    },
    sunken: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi];
      if (!unitsAt(G, ctx.loc, pi).some(function (u) { return might(u) >= 5; }) || !energyAvail(p) > 0) return;
      if (!(await confirm(G, pi, 'Sunken Temple', 'You conquered with a Mighty unit. Pay 1 energy to draw 1?', true))) return;
      pay(G, pi, 1, 0, []); drawOne(G, pi); log(G, 'Sunken Temple: draw 1.', pi);
    },
    targon: async function (G, pi) { G.players[pi].readyRunesEOT += 2; log(G, "Targon's Peak: 2 runes will ready at the end of this turn.", pi); },

    swapIt: async function (G, pi, e, tg, ctx) {
      var a = ctx.it, b = tg[0];
      if (!a || !b || a === b) return;
      var ma = might(a), mb = might(b);
      a.temp += mb - ma; b.temp += ma - mb;
      log(G, (ctx.srcName || 'Effect') + ' swaps the Might of ' + a.c.name + ' and ' + b.c.name + '.', pi);
    },
    dread: async function (G, pi, e, tg, ctx) {
      var u = tg[0];
      if (u.stun) { removeUnit(G, u); if (!u.token) G.players[u.owner].hand.push({ iid: u.iid, c: u.c }); u.dead = true; updateControl(G); log(G, u.c.name + ' was already stunned: returned to hand.', pi); }
      else { u.stun = G.active === u.ctrl ? 2 : 1; log(G, (ctx.srcName || 'Effect') + ' stuns ' + u.c.name + '.', pi); }
    },
    moveUnit: async function (G, pi, e, tg, ctx) { await moveChosen(G, pi, tg[0], ctx.srcName); if (e.ready && !tg[0].dead) { tg[0].ex = false; log(G, tg[0].c.name + ' readies.', pi); } },
    killGear: async function (G, pi, e, tg, ctx) {
      var all = [];
      G.players.forEach(function (pl) { pl.gear.forEach(function (g) { all.push({ g: g, pl: pl, host: null }); }); });
      G.units.forEach(function (u) { u.equips.forEach(function (g) { all.push({ g: g, pl: G.players[u.owner], host: u }); }); });
      if (!all.length) return;
      var auto = all.map(function (x) { return x.pl.pi !== pi; }).indexOf(true);
      var k = await choose(G, pi, ctx.srcName, 'Kill a gear?', all.map(function (x) { return x.g.c.name + (x.pl.pi === pi ? ' (yours)' : ' (AI)') + (x.host ? ' on ' + x.host.c.name : ''); }), true, auto < 0 ? null : auto);
      if (k == null) return;
      var x = all[k];
      if (x.host) x.host.equips.splice(x.host.equips.indexOf(x.g), 1); else x.pl.gear.splice(x.pl.gear.indexOf(x.g), 1);
      x.pl.trash.push(x.g);
      log(G, (ctx.srcName || 'Effect') + ' kills ' + x.g.c.name + '.', pi);
    },
    recur: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi];
      for (var n = 0; n < e.n; n++) {
        var units = p.trash.filter(function (x) { return x.c.type === 'Unit'; });
        if (!units.length) return;
        var best = units.map(function (x) { return x.c.energy || 0; }); var auto = best.indexOf(Math.max.apply(null, best));
        var k = await choose(G, pi, ctx.srcName, 'Return a unit from your trash to your hand (' + (n + 1) + ' of ' + e.n + ')', units.map(function (x) { return x.c.name; }), true, auto);
        if (k == null) return;
        p.trash.splice(p.trash.indexOf(units[k]), 1); p.hand.push(units[k]);
        log(G, (ctx.srcName || 'Effect') + ' returns ' + units[k].c.name + ' to hand.', pi);
      }
    },
    reanimate: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi];
      var units = p.trash.filter(function (x) {
        if (x.c.type !== 'Unit') return false;
        if (e.free) return (x.c.energy || 0) <= e.maxEnergy && (x.c.power || 0) <= e.maxPower;
        return canPay(p, 0, x.c.power || 0, cardDomains(x.c));
      });
      if (!units.length) { log(G, (ctx.srcName || 'Effect') + ': no unit in your trash you can pay for.', pi); return; }
      var v = units.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); }); var auto = v.indexOf(Math.max.apply(null, v));
      var k = await choose(G, pi, ctx.srcName, e.free ? 'Play a unit from your trash to your base for free?' : 'Play a unit from your trash (you still pay its power):', units.map(function (x) { return x.c.name + ' (' + (x.c.might || 0) + ' Might)'; }), !!e.optional, auto);
      if (k == null) return;
      var card = units[k];
      if (!e.free) pay(G, pi, 0, card.c.power || 0, cardDomains(card.c));
      p.trash.splice(p.trash.indexOf(card), 1);
      await playFree(G, pi, card, 'base', ctx.srcName);
    },
    mightOfKilled: async function (G, pi, e, tg, ctx) {
      var n = ctx.killedMight || 0;
      tg.forEach(function (u) { u.temp += n; });
      log(G, (ctx.srcName || 'Effect') + ' gives ' + tg[0].c.name + ' +' + n + ' Might this turn.', pi);
    },
    ctrlDraw: async function (G, pi, e, tg, ctx) {
      if (ctx.killedCtrl == null) return;
      for (var i = 0; i < e.n; i++) drawOne(G, ctx.killedCtrl);
      log(G, G.players[ctx.killedCtrl].name + ' draw' + (ctx.killedCtrl === 0 ? '' : 's') + ' ' + e.n + '.', ctx.killedCtrl);
    },
    reflect: async function (G, pi, e, tg, ctx) {
      var r = reflectionOf(G, pi, tg[0], 'base');
      log(G, (ctx.srcName || 'Effect') + ': a ready Reflection of ' + tg[0].c.name + ' appears in base (Temporary).', pi);
      return r;
    },
    sabotage: async function (G, pi, e, tg, ctx) {
      var o = G.players[opp(pi)];
      log(G, o.name + ' reveal' + (opp(pi) === 0 ? '' : 's') + ' their hand: ' + (o.hand.map(function (x) { return x.c.name; }).join(', ') || 'empty') + '.', pi);
      var non = o.hand.filter(function (x) { return x.c.type !== 'Unit'; });
      if (!non.length) return;
      var v = non.map(function (x) { return x.c.energy || 0; }); var auto = v.indexOf(Math.max.apply(null, v));
      var k = await choose(G, pi, ctx.srcName, 'Recycle a non-unit card from their hand:', non.map(function (x) { return x.c.name; }), false, auto);
      if (k == null) return;
      o.hand.splice(o.hand.indexOf(non[k]), 1); o.deck.push(non[k]);
      log(G, (ctx.srcName || 'Effect') + ' recycles ' + non[k].c.name + ' from ' + o.name + "'s hand.", pi);
    },
    thrill: async function (G, pi, e, tg, ctx) {
      var u = tg[0];
      var k = await choose(G, pi, ctx.srcName, 'Play ' + u.c.name + ' to which battlefield?', G.bfs.map(function (b) { return b.c.name; }), false,
        G.bfs.map(function (b, i) { return i; }).filter(function (i) { return G.bfs[i].ctrl !== pi; })[0] || 0);
      if (k == null) return;
      removeUnit(G, u); u.dead = true; updateControl(G);
      log(G, u.c.name + ' is banished and played again.', pi);
      if (u.token) return;
      await playFree(G, pi, { iid: u.iid, c: u.c }, k, ctx.srcName);
    },
    payBonus: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], u = ctx.it;
      var free = hasEzreal(G, pi);
      if (!u || u.dead || (!free && !canPay(p, 0, 1, [e.domain]))) return;
      if (!(await confirm(G, pi, ctx.srcName, (free ? 'Ezreal makes the extra cost free: give ' : 'Pay 1 ' + e.domain + ' power to give ') + u.c.name + ' +' + e.n + ' Might this turn?', true))) return;
      if (!free) pay(G, pi, 0, 1, [e.domain]); u.temp += e.n;
      log(G, (ctx.srcName || 'Effect') + ': paid extra, ' + u.c.name + ' gets +' + e.n + ' Might.', pi);
    },
    fight: async function (G, pi, e, tg, ctx) {
      var a = ctx.it, b = tg[0];
      if (!a || a.dead || !b) return;
      var ma = might(a) + voidBonus(G, b), mb = might(b) + voidBonus(G, a);
      b.damage += ma; a.damage += mb;
      log(G, a.c.name + ' and ' + b.c.name + ' deal ' + ma + ' and ' + mb + ' damage to each other' + (voidBonus(G, a) || voidBonus(G, b) ? ' (Void Gate +1)' : '') + '.', pi);
    },
    engarde: async function (G, pi, e, tg, ctx) {
      var u = tg[0], extra = unitsAt(G, u.loc, pi).length === 1 ? 1 : 0;
      u.temp += 1 + extra;
      log(G, (ctx.srcName || 'Effect') + ' gives ' + u.c.name + ' +' + (1 + extra) + ' Might this turn' + (extra ? ' (alone there)' : '') + '.', pi);
    },
    shroud: async function (G, pi, e, tg, ctx) {
      tg[0].temp += 1; tg[0].shrouded = true;
      log(G, (ctx.srcName || 'Effect') + ' gives ' + tg[0].c.name + ' +1 Might; enemies can\'t choose it this turn.', pi);
    },
    lookDraw: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], top = p.deck.splice(0, e.n);
      if (!top.length) return;
      var v = top.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); }); var auto = v.indexOf(Math.max.apply(null, v));
      var k = await choose(G, pi, ctx.srcName, 'Choose a card to draw; the rest go to your trash.', top.map(function (x) { return x.c.name + ' (' + x.c.type + ')'; }), true, auto);
      if (k != null) { p.hand.push(top[k]); top.splice(k, 1); }
      top.forEach(function (x) { p.trash.push(x); });
      log(G, (ctx.srcName || 'Effect') + ': ' + p.name + ' draw' + (pi === 0 ? '' : 's') + ' 1 and trash' + (pi === 0 ? '' : 'es') + ' ' + top.length + '.', pi);
    },
    hook: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], top = p.deck.splice(0, 5), lim = (ctx.killedMight || 0) + 1;
      var ok = top.filter(function (x) { return x.c.type === 'Unit' && (x.c.might || 0) <= lim; });
      var k = null;
      if (ok.length) {
        var v = ok.map(function (x) { return x.c.might || 0; });
        k = await choose(G, pi, ctx.srcName, 'Top 5: ' + top.map(function (x) { return x.c.name; }).join(', ') + '. Play a unit with Might ≤ ' + lim + ' for free?', ok.map(function (x) { return x.c.name + ' (' + (x.c.might || 0) + ' Might)'; }), true, v.indexOf(Math.max.apply(null, v)));
      }
      var chosen = k != null ? ok[k] : null;
      top.forEach(function (x) { if (x !== chosen) p.deck.push(x); });
      if (chosen) await playFree(G, pi, chosen, 'base', ctx.srcName);
      else log(G, (ctx.srcName || 'Effect') + ': nothing played; the cards are recycled.', pi);
    },
    empowerSelf: async function (G, pi, e, tg, ctx) { if (ctx.src) { ctx.src.empowered = true; log(G, '✦ ' + ctx.src.c.name + ' is empowered.', pi); } },
    extraCost: async function (G, pi, e, tg, ctx) {
      var u = ctx.src, p = G.players[pi];
      var free = hasEzreal(G, pi);
      if (!u || u.dead || (!free && !canPay(p, 0, 1, [e.domain]))) return;
      if (!(await confirm(G, pi, u.c.name, (free ? 'Ezreal makes the extra cost free: ' : 'Pay 1 ' + e.domain + ' power as an extra cost to ') + 'ready ' + u.c.name + ' and give it +2 Might this turn?', true))) return;
      if (!free) pay(G, pi, 0, 1, [e.domain]); u.ex = false; u.temp += 2;
      log(G, u.c.name + ': extra cost paid, ready with +2 Might.', pi);
    },
    beginningDraw: async function (G, pi) { if (G.phase === 'beginning' && G.active === pi) { drawOne(G, pi); log(G, 'It is the Beginning Phase: draw 1 more.', pi); } },
    drawIf: async function (G, pi, e) { for (var i = 0; i < e.n; i++) drawOne(G, pi); log(G, G.players[pi].name + ' draw' + (pi === 0 ? '' : 's') + ' ' + e.n + '.', pi); }
  };
  var OPS_VALUE = {
    lookDraw: function () { return 1.8; },
    recur: function (G, pi, e) { return Math.min(e.n, G.players[pi].trash.filter(function (x) { return x.c.type === 'Unit'; }).length) * 1.6; },
    reanimate: function (G, pi) { var u = G.players[pi].trash.filter(function (x) { return x.c.type === 'Unit'; }); return u.length ? Math.max.apply(null, u.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); })) : -5; },
    sabotage: function (G, pi) { return G.players[opp(pi)].hand.some(function (x) { return x.c.type !== 'Unit'; }) ? 1.5 : 0; },
    killGear: function (G, pi) { return G.players[opp(pi)].gear.length || G.units.some(function (u) { return u.ctrl !== pi && u.equips.length; }) ? 1.5 : 0; },
    drawIf: function (G, pi, e) { return 1.6 * e.n; },
    ctrlDraw: function (G, pi, e) { return -1.2 * e.n; }
  };
  function T(sel, where, extra) { var t = { sel: sel, where: where || null }; if (extra) Object.keys(extra).forEach(function (k) { t[k] = extra[k]; }); return t; }
  // Hand-written effects for cards whose text the generic parser can't read. sim: indexes of rules lines now simulated.
  var CARD_SCRIPTS = {
    lightningrush: { sim: [0], effs: [{ op: 'lookDraw', n: 3 }] },
    sealofdiscord: { sim: [0], addPower: 'Chaos', gearActs: [{ label: 'Exhaust: add 1 Chaos power now (it is also used automatically when you pay)', timing: 'reaction', run: function (G, pi) { var p = G.players[pi]; p.poolDom = p.poolDom || {}; p.poolDom.Chaos = (p.poolDom.Chaos || 0) + 1; log(G, 'Seal of Discord adds 1 Chaos power (until end of turn).', pi); } }] },
    starcrossed: { sim: [1], effs: [{ op: 'tohand', t: T('friendly') }, { op: 'tohand', t: T('enemy') }] },
    switcheroo: { sim: [2], effs: [{ op: 'mark', t: T('enemy', 'bf') }, { op: 'swapIt', t: T('friendly', 'itloc') }] },
    existentialdread: { sim: [2], effs: [{ op: 'dread', t: T('enemy', 'bf', { attacking: true }) }] },
    flash: { sim: [1], effs: [{ op: 'tobase', t: T('friendly', 'bf'), opt: true }, { op: 'tobase', t: T('friendly', 'bf'), opt: true }] },
    ridethewind: { sim: [1], effs: [{ op: 'moveUnit', t: T('friendly'), ready: true }] },
    salvage: { sim: [1], effs: [{ op: 'killGear' }, { op: 'draw', n: 1 }] },
    shadowsofthepast: { sim: [0], effs: [{ op: 'recur', n: 2 }] },
    theharrowing: { sim: [0], effs: [{ op: 'reanimate' }] },
    sacrifice: { sim: [1], requires: function (G, pi) { return unitsOf(G, pi).some(function (u) { return might(u) >= 5; }) ? null : 'Needs a friendly Mighty unit (5+ Might) to kill as the extra cost.'; },
      effs: [{ op: 'kill', t: T('friendly', null, { minMight: 5 }), selfOk: true }, { op: 'draw', n: 2 }, { op: 'channel', n: 1 }] },
    deathgrip: { sim: [1], requires: function (G, pi) { return unitsOf(G, pi).length >= 2 ? null : 'Needs two friendly units.'; },
      effs: [{ op: 'kill', t: T('friendly'), selfOk: true }, { op: 'mightOfKilled', t: T('friendly') }, { op: 'draw', n: 1 }] },
    hiddenblade: { sim: [2], effs: [{ op: 'kill', t: T('any', 'bf') }, { op: 'ctrlDraw', n: 2 }] },
    mirrorimage: { sim: [0], effs: [{ op: 'reflect', t: T('any') }] },
    sabotage: { sim: [0], effs: [{ op: 'sabotage' }] },
    thrillofthehunt: { sim: [1], effs: [{ op: 'thrill', t: T('friendly') }] },
    rampage: { sim: [0, 1], effs: [{ op: 'mark', t: T('friendly') }, { op: 'payBonus', n: 2, domain: 'Body' }, { op: 'fight', t: T('enemy') }] },
    zhonyashourglass: { sim: [1], saveUnit: true },
    charm: { sim: [0], effs: [{ op: 'moveUnit', t: T('enemy') }] },
    defiantdance: { sim: [1], effs: [{ op: 'might', n: 2, t: T('any') }, { op: 'might', n: -2, t: T('any', null, { notIt: true }) }] },
    engarde: { sim: [1], effs: [{ op: 'engarde', t: T('friendly') }] },
    twilightshroud: { sim: [0], effs: [{ op: 'shroud', t: T('friendly') }] },
    shurikenflip: { sim: [0], effs: [{ op: 'deal', n: 2, t: T('enemy', 'bf'), opt: true }, { op: 'moveUnit', t: T('friendly') }] },
    maskofforesight: { sim: [0], aloneBonus: 1 },
    backoff: { sim: [3], effs: null, extra: [{ op: 'drawIf', n: 1 }] },
    tailcloakedmatriarch: { sim: [0, 1], unitAct: { label: 'Empower (2 energy + 1 Chaos power)', energy: 2, power: 1, domain: 'Chaos', exhaust: false,
      req: function (G, u) { return u.empowered ? 'Already empowered.' : null; },
      effs: [{ op: 'empowerSelf' }, { op: 'reanimate', maxEnergy: 3, maxPower: 1, free: true, optional: true }] } },
    mournfulwitness: { sim: [0, 1], combatEnd: 'empower', empoweredMight: 2 },
    pykedocksidebutcher: { sim: [2, 3], play: [{ op: 'extraCost', domain: 'Fury' }] },
    baitedhook: { sim: [0], gearAct: { label: '1 energy + 1 Order power, exhaust: kill a friendly unit, then maybe play a unit from your top 5', energy: 1, power: 1, domain: 'Order',
      effs: [{ op: 'kill', t: T('friendly'), selfOk: true }, { op: 'hook' }] } },
    // ---- units ----
    kennenstormofshuriken: { sim: [0, 1], conquerFx: [{ op: 'grantFlow' }] },
    rhasathesunderer: { sim: [0], costMod: function (G, pi) { return -G.players[pi].trash.length; } },
    noxushopeful: { sim: [0], costMod: function (G, pi) { return G.playedThisTurn > 0 ? -2 : 0; } },
    fizztrickster: { sim: [0], play: [{ op: 'fizz' }] },
    tornadowarrior: { sim: [1], hiddenFx: [{ op: 'empowerTemp', t: T('friendly', 'here'), opt: true }] },
    baronnashor: { sim: [1, 2], untargetable: 'always', auraOthers: 2 },
    tideturner: { sim: [1], play: [{ op: 'swapLoc', t: T('friendly', null, { other: true }), opt: true }] },
    treasurehunter: { sim: [0] },
    leblancfragmented: { sim: [1], deathknell: [{ op: 'draw', n: 1 }, { op: 'beginningDraw' }] },
    honestbroker: { sim: [0] },
    karthuseternal: { sim: [0], doubleDeathknell: true },
    glascmixologist: { sim: [0], deathknell: [{ op: 'reanimate', maxEnergy: 3, maxPower: 1, free: true, optional: true }] },
    thousandtailedwatcher: { sim: [1], play: [{ op: 'shrinkAll', n: 3 }] },
    riftherald: { sim: [0, 1], moveBfFx: [{ op: 'lookUnit', n: 3 }], deathknell: [{ op: 'fromHand' }] },
    irresistiblefaefolk: { sim: [0], moveBfFx: [{ op: 'pull', t: T('enemy', null, { notHere: true }), opt: true }] },
    kinkouinitiate: { sim: [0], play: [{ op: 'drawIfMight', n: 5 }] },
    dariustrifarian: { sim: [0], onSecondCard: true },
    ireliafervent: { sim: [1], onChosenOrReady: true },
    scuttlecrab: { sim: [1], deathknell: [{ op: 'revealHand' }, { op: 'xp', n: 1 }] },
    pykereturned: { sim: [2], goldOnEnemyDeath: true },
    ezrealprodigy: { sim: [1], cheaperExtras: true },
    akalisilent: { sim: [0], untargetable: 'outOfCombat' },
    vexapathetic: { sim: [1], stunNewUnits: true },
    lonelyporo: { sim: [0], deathknell: [{ op: 'drawIfAlone' }] },
    rengartrophyhunter: { sim: [1], ambushAnywhere: true },
    // ---- battlefields ----
    seatofpower: { sim: [0], bfconquer: [{ op: 'seatDraw' }] },
    emperorsdais: { sim: [0], bfconquer: [{ op: 'dais' }] },
    sunkentemple: { sim: [0], bfconquer: [{ op: 'sunken' }] },
    targonspeak: { sim: [0], bfconquer: [{ op: 'targon' }] },
    minefield: { sim: [0], bfconquer: [{ op: 'burn', n: 2 }] },
    duskroselab: { sim: [0] }, starspring: { sim: [0] }, windswepthillock: { sim: [0] }, backalleybar: { sim: [0] }, voidgate: { sim: [0] }, abandonedhall: { sim: [0] },
    // Counters: offered as reactions when the opponent casts a spell.
    defy: { sim: [1], counter: { maxEnergy: 4, maxPower: 1 } },
    abandon: { sim: [1, 2], counter: { toHand: true, predict: true } },
    notsofast: { sim: [1], counter: { targetsFriendly: true } }
  };
  function applyCardScript(c) {
    // [Flow] N energy (+ rainbow runes): cast again from your trash, then banish. [Repeat] N energy: pay again to repeat.
    c.P.lines.forEach(function (l) {
      var m = l.text.match(/^\[Flow\] (\d+) energy((?: rainbow rune)*)$/);
      if (m && c.type === 'Spell') { c.P.flow = { energy: +m[1], power: (m[2].match(/rune/g) || []).length }; l.sim = true; }
      var r = l.text.match(/^\[Repeat\] (\d+) energy(?: (\w+) rune)?$/);
      if (r && c.type === 'Spell') { c.P.repeat = { energy: +r[1], power: r[2] ? 1 : 0, domain: r[2] ? r[2][0].toUpperCase() + r[2].slice(1) : null }; l.sim = true; }
    });
    var sc = CARD_SCRIPTS[norm(c.name)];
    if (!sc || c.type === 'Legend') return;
    if (sc.sim === 'all') sc.sim = c.P.lines.map(function (l, i) { return i; });
    (sc.sim || []).forEach(function (i) { if (c.P.lines[i]) c.P.lines[i].sim = true; });
    if (sc.effs) c.P.spell = sc.effs;
    if (sc.extra) c.P.spell = c.P.spell.concat(sc.extra);
    if (sc.requires) c.P.requires = sc.requires;
    if (sc.counter) c.P.counter = sc.counter;
    if (sc.addPower) c.P.addPower = sc.addPower;
    if (sc.saveUnit) c.P.saveUnit = true;
    if (sc.aloneBonus) c.P.aloneBonus = sc.aloneBonus;
    if (sc.gearAct) c.P.gearActs = [sc.gearAct];
    if (sc.gearActs) c.P.gearActs = sc.gearActs;
    if (sc.unitAct) c.P.unitAct = sc.unitAct;
    if (sc.empoweredMight) c.P.empoweredMight = sc.empoweredMight;
    if (sc.combatEnd) c.P.combatEnd = sc.combatEnd;
    if (sc.play) (c.P.trig.play = c.P.trig.play || []).push({ effs: sc.play });
    ['onExhausted', 'grantKw', 'equipAltExhaust', 'needsGearHere', 'secondDrawBonus', 'shieldHere', 'onGearMove', 'gearPlayFx', 'gearConquerFx', 'onGearExhaust', 'drawOnTripleExhaust', 'entersReadyIf', 'playToBf', 'costMod', 'cheaperExtras', 'lethalDamage', 'endOfTurn', 'entersExhausted', 'addEnergy', 'gutterWin', 'levelKw', 'heronDiscount', 'attachFromHidden', 'grantAccelerate', 'empoweredDeathknell', 'readyOnGear', 'untargetable', 'auraOthers', 'doubleDeathknell', 'onSecondCard', 'onChosenOrReady', 'goldOnEnemyDeath', 'stunNewUnits', 'ambushAnywhere'].forEach(function (k) { if (sc[k]) c.P[k] = sc[k]; });
    if (sc.deathknell) c.P.trig.deathknell = [{ effs: sc.deathknell }];
    if (sc.conquerFx) (c.P.trig.conquer = c.P.trig.conquer || []).push({ effs: sc.conquerFx });
    if (sc.moveBfFx) (c.P.trig.moveBf = c.P.trig.moveBf || []).push({ effs: sc.moveBfFx });
    if (sc.hiddenFx) c.P.trig.playHidden = [{ effs: sc.hiddenFx }];
    if (sc.attackFx) (c.P.trig.attack = c.P.trig.attack || []).push({ effs: sc.attackFx });
    if (sc.holdFx) (c.P.trig.hold = c.P.trig.hold || []).push({ effs: sc.holdFx });
    if (sc.bfconquer) (c.P.trig.bfconquer = c.P.trig.bfconquer || []).push({ effs: sc.bfconquer });
  }

  // Reaction window: may the opponent (pi) counter this spell or targeting? Returns true if countered.
  async function reactTo(G, pi, ctx, pickedUnit) {
    if (G.winner != null || ctx.reacted) return false;
    var p = G.players[pi], spell = ctx.spell, caster = opp(pi);
    var options = p.hand.filter(function (card) {
      var k = card.c.P.counter;
      if (!k) return false;
      var cost = cardCost(card.c, false);
      if (!canPay(p, cost.energy, cost.power, cost.domains)) return false;
      if (pickedUnit) return !!k.targetsFriendly && pickedUnit.ctrl === pi;
      if (!spell || k.targetsFriendly) return false;
      if (k.maxEnergy != null && ((spell.c.energy || 0) > k.maxEnergy || (spell.c.power || 0) > k.maxPower)) return false;
      return true;
    });
    for (var i = 0; i < options.length; i++) {
      var card = options[i], what = spell ? spell.c.name : (ctx.srcName || 'that ability');
      var aiWants = pickedUnit ? unitValue(pickedUnit) >= 4 : ((spell.c.energy || 0) + (spell.c.power || 0) >= 3);
      var text = G.players[caster].name + (caster === 0 ? ' are' : ' is') + ' ' + (pickedUnit ? 'targeting your ' + pickedUnit.c.name + ' with ' + what : 'casting ' + what) + '. Counter it with ' + card.c.name + '?';
      if (!(await confirm(G, pi, 'Reaction', text, aiWants))) continue;
      var cost = cardCost(card.c, false);
      pay(G, pi, cost.energy, cost.power, cost.domains);
      p.hand.splice(p.hand.indexOf(card), 1); p.trash.push(card);
      ctx.reacted = true;
      log(G, p.name + ' counter' + (pi === 0 ? '' : 's') + ' ' + what + ' with ' + card.c.name + '.', pi);
      if (card.c.P.counter.toHand && spell) { ctx.countered = 'hand'; log(G, spell.c.name + ' returns to its owner\'s hand.', pi); }
      if (card.c.P.counter.predict) await OPS.predict(G, pi, {}, [], { srcName: card.c.name });
      return true;
    }
    return false;
  }
  function canUseGear(G, pi, iid, idx) {
    var p = G.players[pi], g = p.gear.filter(function (x) { return x.iid === iid; })[0];
    if (!g || !g.c.P.gearActs) return { ok: false, why: 'This gear has no activated ability.' };
    if (idx == null) { for (var i = 0; i < g.c.P.gearActs.length; i++) if (canUseGear(G, pi, iid, i).ok) return { ok: true }; return { ok: false, why: 'No ability is usable right now.' }; }
    var a = g.c.P.gearActs[idx];
    if (G.winner != null || (G.active !== pi && a.timing !== 'reaction')) return { ok: false, why: "It's not your turn." };
    if (a.exhaust !== false && g.ex) return { ok: false, why: 'It is exhausted.' };
    if (a.req) { var w = a.req(G, pi, g); if (w) return { ok: false, why: w }; }
    if (!canPay(p, a.energy || 0, a.power || 0, a.domain ? [a.domain] : [])) return { ok: false, why: 'Needs ' + (a.energy || 0) + ' energy' + (a.power ? ' and ' + a.power + ' ' + a.domain + ' power' : '') + '.' };
    if ((a.effs || []).some(function (e) { return e.selfOk; }) && !unitsOf(G, pi).length) return { ok: false, why: 'You need a friendly unit to kill.' };
    if (a.discard && !p.hand.length) return { ok: false, why: 'You need a card in hand to discard.' };
    if (a.recycleTrash && p.trash.length < a.recycleTrash) return { ok: false, why: 'Needs ' + a.recycleTrash + ' cards in your trash.' };
    return { ok: true };
  }
  async function useGear(G, pi, iid, idx) {
    if (idx == null) idx = 0;
    var chk = canUseGear(G, pi, iid, idx);
    if (!chk.ok) return chk;
    var p = G.players[pi], g = p.gear.filter(function (x) { return x.iid === iid; })[0], a = g.c.P.gearActs[idx];
    pay(G, pi, a.energy || 0, a.power || 0, a.domain ? [a.domain] : []);
    if (a.exhaust !== false) { g.ex = true; if (g.c.P.onGearExhaust) await resolveEffects(G, pi, g.c.P.onGearExhaust, { src: null, loc: g.loc, srcName: g.c.name }); }
    if (a.recycleTrash) for (var r = 0; r < a.recycleTrash; r++) p.deck.push(p.trash.shift());
    if (a.discard) await applyEffect(G, pi, { op: 'discard', n: a.discard }, [], { srcName: g.c.name });
    if (a.killSelf) { p.gear.splice(p.gear.indexOf(g), 1); p.trash.push(g); }
    log(G, p.name + ' use' + (pi === 0 ? '' : 's') + ' ' + g.c.name + ': ' + a.label + '.', pi);
    if (a.run) a.run(G, pi, g);
    await resolveEffects(G, pi, a.effs || [], { src: null, loc: null, srcName: g.c.name, gear: g });
    return { ok: true };
  }


  /* ---------------- keywords: Burn, Hidden, Equip, showdowns ---------------- */
  // [Burn N]: put the top N cards of your Main Deck into your trash (an empty deck burns out as usual).
  function burn(G, pi, n) {
    var p = G.players[pi], done = 0;
    for (var i = 0; i < n && G.winner == null; i++) {
      if (!p.deck.length) {
        if (!p.trash.length) break;
        p.deck = shuffle(p.trash.splice(0), G.rnd);
        log(G, p.name + ' burned out: trash shuffled into a new deck, ' + G.players[opp(pi)].name + ' scores 1.', pi);
        addPoints(G, opp(pi), 1, p.name + ' burned out');
      }
      if (p.deck.length) { p.trash.push(p.deck.shift()); done++; }
    }
    return done;
  }
  function equipCostText(c) {
    var ec = c.P.equipCost || { energy: 0, power: [], recycleTrash: 0 }, parts = [];
    if (ec.energy) parts.push(ec.energy + ' energy');
    ec.power.forEach(function (d) { parts.push('1 ' + (d === 'any' ? 'any' : d) + ' power'); });
    if (ec.recycleTrash) parts.push('recycle ' + ec.recycleTrash + ' cards from your trash');
    return parts.join(' + ') || 'free';
  }
  function canEquip(G, pi, g) {
    var p = G.players[pi], ec = g.c.P.equipCost || { energy: 0, power: [], recycleTrash: 0 };
    if (!g.c.P.equip) return { ok: false, why: 'Not equipment.' };
    if (G.winner != null || G.active !== pi) return { ok: false, why: "It's not your turn." };
    if (!unitsOf(G, pi).length) return { ok: false, why: 'You have no unit to attach it to.' };
    if (energyAvail(p) < ec.energy) return { ok: false, why: 'Equip needs ' + equipCostText(g.c) + '.' };
    var needAny = ec.power.filter(function (d) { return d === 'any'; }).length, doms = ec.power.filter(function (d) { return d !== 'any'; });
    if (doms.length && !canPay(p, ec.energy, doms.length, doms)) return { ok: false, why: 'Equip needs ' + equipCostText(g.c) + '.' };
    if (needAny && anyPowerAvail(p) < needAny + doms.length && !canEquipAlt(G, pi, g)) return { ok: false, why: 'Equip needs ' + equipCostText(g.c) + (g.c.P.equipAltExhaust ? ' or another ready unit to exhaust' : '') + '.' };
    if (p.trash.length < ec.recycleTrash) return { ok: false, why: 'Equip needs ' + ec.recycleTrash + ' cards in your trash.' };
    return { ok: true };
  }
  function canEquipAlt(G, pi, g) { return g.c.P.equipAltExhaust && unitsOf(G, pi).filter(function (u) { return !u.ex; }).length >= 2;
  }
  async function equipGear(G, pi, g, hostUid) {
    var chk = canEquip(G, pi, g);
    if (!chk.ok) return chk;
    var p = G.players[pi], ec = g.c.P.equipCost || { energy: 0, power: [], recycleTrash: 0 };
    var units = unitsOf(G, pi), best = units.slice().sort(function (a, b) { return might(b) - might(a); })[0];
    var hid = hostUid != null ? hostUid : await ask(G, pi, { type: 'target', title: g.c.name, text: 'Attach to which unit? (+' + g.c.P.equipBonus + ' Might)', cands: units.map(function (u) { return u.uid; }), optional: false, auto: best.uid });
    var host = units.filter(function (u) { return u.uid === hid; })[0] || best;
    var doms = ec.power.filter(function (d) { return d !== 'any'; });
    var useAlt = false;
    if (canEquipAlt(G, pi, g)) {
      var anyOk = anyPowerAvail(p) >= ec.power.length;
      useAlt = !anyOk || (await confirm(G, pi, g.c.name, 'Exhaust a friendly unit instead of paying 1 power to equip?', false));
    }
    if (useAlt) {
      var ex = unitsOf(G, pi).filter(function (u) { return !u.ex && u !== host; });
      var eid = await ask(G, pi, { type: 'target', title: g.c.name, text: 'Exhaust a friendly unit to pay the Equip cost', cands: ex.map(function (u) { return u.uid; }), optional: false, auto: ex[0].uid });
      await exhaustUnits(G, pi, [ex.filter(function (u) { return u.uid === eid; })[0] || ex[0]]);
    } else {
      pay(G, pi, ec.energy, doms.length, doms);
      payAnyPower(G, pi, ec.power.filter(function (d) { return d === 'any'; }).length, 'Equip');
    }
    for (var i = 0; i < ec.recycleTrash; i++) p.deck.push(p.trash.shift());
    p.gear.splice(p.gear.indexOf(g), 1);
    host.equips.push(g);
    log(G, g.c.name + ' is equipped to ' + host.c.name + ' (+' + g.c.P.equipBonus + ' Might).', pi);
    return { ok: true };
  }
  // [Hidden]: pay 1 power of any domain to put the card face down at a battlefield you control. Play it from a later turn for 0 energy, even as a reaction.
  function hideSpots(G, pi, iid) {
    var p = G.players[pi], card = p.hand.filter(function (x) { return x.iid === iid; })[0];
    if (!card || !card.c.P.kw.hidden || G.active !== pi || G.winner != null) return [];
    if (!anyPowerAvail(p)) return [];
    return G.bfs.map(function (b, i) { return i; }).filter(function (i) { return G.bfs[i].ctrl === pi && !p.hidden.some(function (h) { return h.loc === i; }); });
  }
  function hideCard(G, pi, iid, bi) {
    if (hideSpots(G, pi, iid).indexOf(bi) < 0) return { ok: false, why: "You can't hide that card there." };
    var p = G.players[pi], card = p.hand.filter(function (x) { return x.iid === iid; })[0];
    payAnyPower(G, pi, 1, 'Hide');
    p.hand.splice(p.hand.indexOf(card), 1);
    p.hidden.push({ card: card, loc: bi, turn: G.turnNo });
    if (bfNorm(G, bi) === 'bandlescoutsacademy') addGold(G, pi, 1, "Bandle Scouts' Academy");
    log(G, p.name + ' hide' + (pi === 0 ? '' : 's') + ' a card face down at ' + bfName(G, bi) + (pi === 0 ? ' (' + card.c.name + ')' : '') + '.', pi);
    return { ok: true };
  }
  // Hidden cards at a battlefield you no longer control go to the trash.
  function checkHidden(G) {
    G.players.forEach(function (p) {
      p.hidden.slice().forEach(function (h) {
        if (G.bfs[h.loc].ctrl !== p.pi) { p.hidden.splice(p.hidden.indexOf(h), 1); p.trash.push(h.card); log(G, p.name + ' lost control of ' + bfName(G, h.loc) + ': the hidden ' + h.card.c.name + ' is trashed.', p.pi); }
      });
    });
  }
  // What a player could play right now in a showdown at battlefield bi (or as a reaction).
  function showdownOptions(G, pi, bi) {
    var p = G.players[pi], out = [];
    p.hand.forEach(function (card) {
      var c = card.c;
      if (c.P.counter) return;
      if (c.type === 'Unit') { if (c.P.kw.ambush && canPlay(G, pi, card.iid, false, { reaction: true }).ok) out.push({ card: card, kind: 'ambush' }); return; }
      if ((c.P.kw.reaction || c.P.kw.action) && c.P.spell.length && canPlay(G, pi, card.iid, false, { reaction: true }).ok) out.push({ card: card, kind: 'spell' });
    });
    p.hidden.forEach(function (h) {
      if (h.loc === bi && !h.card.c.P.counter && canPlay(G, pi, h.card.iid, false, { reaction: true }).ok) out.push({ card: h.card, kind: 'hidden' });
    });
    legendActs(G, pi).forEach(function (a, idx) {
      if (canUseLegend(G, pi, idx, { showdown: bi }).ok) out.push({ card: { c: p.legend.c }, kind: 'legend', idx: idx, label: a.label });
    });
    return out;
  }
  function aiShowdownPick(G, pi, bi, opts, winning) {
    var best = null;
    opts.forEach(function (o, i) {
      var c = o.card.c, v = 0;
      if (o.kind === 'legend') {
        var la = legendActs(G, pi)[o.idx], le = actEffects(G, pi, la);
        if (le.some(function (e) { return e.op === 'assault'; })) v = !winning && pi === G.active ? 3 : 0;
        else if (le.some(function (e) { return e.op === 'tobase'; })) v = !winning ? 2.5 : 0;
        if (v >= 1.5 && (!best || v > best.v)) best = { v: v, i: i };
        return;
      }
      if (o.kind === 'ambush' || (o.kind === 'hidden' && c.type === 'Unit')) v = winning ? 0 : (c.might || 0) + 1;
      else {
        var ev = evalEffects(G, pi, c.type === 'Spell' ? c.P.spell : playEffects(c), { src: null, loc: bi });
        v = ev.good ? ev.value : 0;
        if (!winning && c.P.spell.some(function (e) { return e.op === 'might' && e.n > 0 || e.op === 'stun'; })) v += 2;
        if (winning && c.P.spell.every(function (e) { return e.op === 'might'; })) v = 0;
      }
      if (v >= 1.5 && (!best || v > best.v)) best = { v: v, i: i };
    });
    return best ? best.i : null;
  }
  function fightOutcome(G, pi, bi) {
    var att = unitsAt(G, bi, pi), def = unitsAt(G, bi, opp(pi));
    var aD = att.reduce(function (s, u) { return s + (dealsDamage(u) ? might(u, 'att') : 0); }, 0), dD = def.reduce(function (s, u) { return s + (dealsDamage(u) ? might(u, 'def') : 0); }, 0);
    var aT = att.reduce(function (s, u) { return s + Math.max(1, might(u, 'att')); }, 0), dT = def.reduce(function (s, u) { return s + Math.max(1, might(u, 'def')); }, 0);
    return { attackerWins: aD >= dT && dD < aT, defenderHolds: aD < dT };
  }
  // Showdown before combat damage: the defender, then the attacker, may each play reactions, Action spells, Ambush units or hidden cards here.
  async function showdown(G, attacker, bi) {
    G.showdownAt = bi;
    var passes = 0, side = opp(attacker);
    for (var round = 0; round < 6 && passes < 2 && G.winner == null; round++) {
      if (!unitsAt(G, bi, attacker).length || !unitsAt(G, bi, opp(attacker)).length) break;
      var opts = showdownOptions(G, side, bi), pick = null;
      if (opts.length) {
        var out = fightOutcome(G, attacker, bi), winning = side === attacker ? out.attackerWins : out.defenderHolds;
        var labels = opts.map(function (o) { return o.kind === 'legend' ? 'Legend: ' + o.label : (o.kind === 'hidden' ? 'Hidden: ' : o.kind === 'ambush' ? 'Ambush: ' : '') + o.card.c.name + ' (' + cardCost(o.card.c, false, G, side, o.kind === 'hidden' ? 'hidden' : 'hand').energy + ' energy)'; });
        pick = await choose(G, side, 'Showdown at ' + bfName(G, bi), (side === attacker ? 'You are attacking' : 'You are defending') + ' — play something before damage?', labels, true, aiShowdownPick(G, side, bi, opts, winning));
      }
      if (pick == null) passes++;
      else {
        passes = 0;
        var o = opts[pick];
        log(G, G.players[side].name + ' respond' + (side === 0 ? '' : 's') + ' in the showdown at ' + bfName(G, bi) + '.', side);
        if (G.combatReport) G.combatReport.played[side].push(o.kind === 'legend' ? o.card.c.name + ' (legend)' : o.card.c.name);
        if (o.kind === 'legend') await useLegend(G, side, o.idx, null, { showdown: bi });
        else await playCard(G, side, o.card.iid, { reaction: true, showdown: bi, loc: o.kind === 'ambush' ? bi : undefined });
      }
      side = opp(side);
    }
    G.showdownAt = null;
  }
  // When a player plays their second card in a turn (Darius).
  async function secondCardTriggers(G, pi) {
    if (G.playedThisTurn !== 2 || G.active !== pi) return;
    var ds = unitsOf(G, pi).filter(function (u) { return u.c.P.onSecondCard; });
    for (var i = 0; i < ds.length; i++) { ds[i].temp += 2; ds[i].ex = false; log(G, ds[i].c.name + ': second card this turn, +2 Might and ready.', pi); }
  }
  // A unit was just played: Vex stuns it, Star Spring may send another unit home.
  async function unitEntered(G, pi, u, from) {
    var pp = G.players[pi], dm = cardDomains(u.c);
    // Rek'Sai, Breacher: friendly units played from anywhere other than a hand have Accelerate.
    if (from !== 'hand' && u.ex && !u.token && G.units.some(function (b) { return b.ctrl === pi && b.c.P.grantAccelerate; }) && canPay(pp, 1, 1, dm) &&
        (await confirm(G, pi, "Rek'Sai, Breacher", u.c.name + ' has Accelerate: pay 1 energy + 1 ' + dm.join('/') + ' power to have it enter ready?', true))) {
      pay(G, pi, 1, 1, dm); u.ex = false; log(G, u.c.name + ' accelerates and enters ready.', pi);
    }
    // Weaponmaster (Azir's Sand Soldiers): may equip one of your Equipment to it for 1 power less.
    if ((u.c.P.kw.weaponmaster || (u.c.name === 'Sand Soldier' && pp.legend.c && pp.legend.c.P.sandWeaponmaster)) && !u.dead) await weaponmaster(G, pi, u);
    G.units.filter(function (v) { return v.ctrl !== pi && v.loc !== 'base' && v.c.P.stunNewUnits; }).forEach(function (v) {
      u.stun = G.active === u.ctrl ? 2 : 1; u.noMove = true;
      log(G, v.c.name + ' stuns ' + u.c.name + '; it can\'t move this turn.', v.ctrl);
    });
    if (u.loc !== 'base' && bfNorm(G, u.loc) === 'starspring' && !u.token && !(G.starSpringUsed || {})[pi]) {
      var others = unitsAt(G, u.loc, pi).filter(function (x) { return x !== u; });
      if (others.length) {
        G.starSpringUsed = G.starSpringUsed || {}; G.starSpringUsed[pi] = true;
        var pick = await ask(G, pi, { type: 'target', title: 'Star Spring', text: 'Move another unit you control here to its base?', cands: others.map(function (x) { return x.uid; }), optional: true, auto: null });
        var mv = others.filter(function (x) { return x.uid === pick; })[0];
        if (mv) { mv.loc = 'base'; updateControl(G); log(G, 'Star Spring: ' + mv.c.name + ' returns to base.', pi); }
      }
    }
  }
  // Abandoned Hall: after a player plays a spell, they may give a unit they control there +1 Might this turn.
  async function spellPlayedHooks(G, pi) {
    for (var bi = 0; bi < G.bfs.length; bi++) {
      if (bfNorm(G, bi) !== 'abandonedhall') continue;
      var mine = unitsAt(G, bi, pi);
      if (!mine.length) continue;
      var pick = await ask(G, pi, { type: 'target', title: 'Abandoned Hall', text: 'Give a unit here +1 Might this turn?', cands: mine.map(function (x) { return x.uid; }), optional: true, auto: mine[0].uid });
      var u = mine.filter(function (x) { return x.uid === pick; })[0];
      if (u) { u.temp += 1; log(G, 'Abandoned Hall gives ' + u.c.name + ' +1 Might this turn.', pi); }
    }
  }
  function voidBonus(G, u) { return u.loc !== 'base' && bfNorm(G, u.loc) === 'voidgate' ? 1 : 0; }
  function aiGateOk(G, pi, e) { return e.op === 'burn' ? G.players[pi].deck.length > 8 : true; }
  function addGold(G, pi, n, src) {
    for (var i = 0; i < n; i++) G.players[pi].gear.push({ iid: UID++, c: GOLD, ex: true, token: true });
    log(G, (src ? src + ': ' : '') + G.players[pi].name + ' get' + (pi === 0 ? '' : 's') + ' ' + n + ' Gold token' + (n > 1 ? 's' : '') + ' (exhausted).', pi);
  }
  function hasEzreal(G, pi) { return G.units.some(function (u) { return u.ctrl === pi && u.c.P.cheaperExtras; }); }
  function bfNorm(G, bi) { return norm(G.bfs[bi].c.name); }
  async function weaponmaster(G, pi, u) {
    var p = G.players[pi], all = [];
    p.gear.forEach(function (g) { if (g.c.P.equip) all.push({ g: g, host: null }); });
    G.units.forEach(function (h) { if (h.ctrl === pi && h !== u) h.equips.forEach(function (g) { if (g.c.P.equip) all.push({ g: g, host: h }); }); });
    var ok = all.filter(function (x) {
      var ec = x.g.c.P.equipCost || { energy: 0, power: [] };
      var doms = ec.power.slice(1).filter(function (d) { return d !== 'any'; });
      return energyAvail(p) >= ec.energy && canPay(p, ec.energy, doms.length, doms);
    });
    if (!ok.length) return;
    var k = await choose(G, pi, 'Weaponmaster', 'Equip one of your Equipment to ' + u.c.name + ' for 1 power less?', ok.map(function (x) { return x.g.c.name + (x.host ? ' (from ' + x.host.c.name + ')' : ''); }), true, 0);
    if (k == null) return;
    var x = ok[k], ec2 = x.g.c.P.equipCost || { energy: 0, power: [] }, rest = ec2.power.slice(1);
    var d2 = rest.filter(function (d) { return d !== 'any'; });
    pay(G, pi, ec2.energy, d2.length, d2);
    payAnyPower(G, pi, rest.filter(function (d) { return d === 'any'; }).length, 'Weaponmaster');
    if (x.host) x.host.equips.splice(x.host.equips.indexOf(x.g), 1); else p.gear.splice(p.gear.indexOf(x.g), 1);
    u.equips.push(x.g);
    log(G, 'Weaponmaster: ' + x.g.c.name + ' is equipped to ' + u.c.name + '.', pi);
  }
  // Back-Alley Bar: a unit moving from here gets +1 Might this turn.
  function leaveBonus(G, u) {
    if (u.loc !== 'base' && bfNorm(G, u.loc) === 'backalleybar') { u.temp += 1; log(G, 'Back-Alley Bar: ' + u.c.name + ' gets +1 Might this turn.', u.ctrl); }
  }

  /* ---------------- second batch of meta decks: Jayce, Master Yi, Azir, Vex, Rek'Sai ---------------- */
  // Play a card from somewhere other than your hand (deck, trash, revealed cards), paying the given costs.
  async function castFrom(G, pi, card, energyCost, payPower, title) {
    var p = G.players[pi], c = card.c;
    if (payPower && !canPay(p, energyCost, c.power || 0, cardDomains(c))) return false;
    pay(G, pi, energyCost, payPower ? (c.power || 0) : 0, cardDomains(c));
    G.playedThisTurn++;
    var lsc = p.legend.c && p.legend.c.P.script;
    if (lsc && lsc.onPlayCard) lsc.onPlayCard(G, pi, 'elsewhere');
    if (c.type === 'Unit') { G.playedThisTurn--; await playFree(G, pi, card, 'base', title); return true; }
    log(G, title + ': ' + p.name + ' play' + (pi === 0 ? '' : 's') + ' ' + c.name + '.', pi);
    if (c.type === 'Spell') {
      var sctx = { src: null, loc: null, srcName: c.name, spell: card, caster: pi };
      if (!(await reactTo(G, opp(pi), sctx, null))) { await resolveEffects(G, pi, c.P.spell, sctx); await fireLegend(G, pi, 'playSpell', {}); await spellPlayedHooks(G, pi); }
      if (sctx.countered === 'hand') p.hand.push(card); else p.trash.push(card);
    } else if (c.type === 'Gear') {
      var g = { iid: card.iid, c: c, ex: !!c.P.entersExhausted };
      p.gear.push(g);
      if (c.P.equip && canEquip(G, pi, g).ok && (await confirm(G, pi, c.name, 'Pay the Equip cost (' + equipCostText(c) + ') to attach ' + c.name + ' now?', true))) await equipGear(G, pi, g);
      await resolveEffects(G, pi, playEffects(c), { src: null, loc: 'base', srcName: c.name });
    }
    await checkDeaths(G);
    return true;
  }
  // Reveal the top n cards; you may play one (energy reduced by `reduce`); the rest are recycled or drawn.
  async function revealAndPlay(G, pi, n, reduce, title, rest) {
    var p = G.players[pi], top = p.deck.splice(0, n);
    if (!top.length) return;
    log(G, title + ': revealed ' + top.map(function (x) { return x.c.name; }).join(', ') + '.', pi);
    var playable = top.filter(function (x) {
      var c = x.c; if (c.type === 'Battlefield' || c.type === 'Legend' || c.P.counter) return false;
      return canPay(p, Math.max(0, (c.energy || 0) - reduce), c.power || 0, cardDomains(c));
    });
    var v = playable.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0) + (x.c.type === 'Spell' ? evalEffects(G, pi, x.c.P.spell, { src: null, loc: null }).value : 0); });
    var k = playable.length ? await choose(G, pi, title, 'Play one of them' + (reduce ? ' for ' + reduce + ' energy less' : '') + '?', playable.map(function (x) { return x.c.name + ' (' + Math.max(0, (x.c.energy || 0) - reduce) + ' energy)'; }), true, v.indexOf(Math.max.apply(null, v))) : null;
    var chosen = k != null ? playable[k] : null;
    top.forEach(function (x) { if (x === chosen) return; if (rest === 'draw') p.hand.push(x); else p.deck.push(x); });
    if (rest === 'draw' && top.length > (chosen ? 1 : 0)) log(G, title + ': ' + p.name + ' draw' + (pi === 0 ? '' : 's') + ' the rest.', pi);
    if (chosen) await castFrom(G, pi, chosen, Math.max(0, (chosen.c.energy || 0) - reduce), true, title);
  }
  async function pickUnits(G, pi, title, text, cands, max, auto) {
    var picked = [];
    for (var i = 0; i < max; i++) {
      var left = cands.filter(function (u) { return picked.indexOf(u) < 0 && !u.dead; });
      if (!left.length) break;
      var a = auto(left, picked);
      var uid = await ask(G, pi, { type: 'target', title: title, text: text + ' (' + (i + 1) + ' of up to ' + max + ')', cands: left.map(function (u) { return u.uid; }), optional: true, auto: a ? a.uid : null });
      var u = left.filter(function (x) { return x.uid === uid; })[0];
      if (!u) break;
      picked.push(u);
    }
    return picked;
  }
  Object.assign(OPS, {
    readyGear: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi];
      for (var i = 0; i < e.n; i++) {
        var ex = p.gear.filter(function (g) { return g.ex && !g.token; });
        if (!ex.length) return;
        var k = await choose(G, pi, ctx.srcName, 'Ready a gear', ex.map(function (g) { return g.c.name; }), true, 0);
        if (k == null) return;
        ex[k].ex = false; log(G, (ctx.srcName || 'Effect') + ' readies ' + ex[k].c.name + '.', pi);
      }
    },
    multiDeal: async function (G, pi, e, tg, ctx) {
      var locs = ['base', 0, 1].filter(function (l) { return G.units.some(function (u) { return u.loc === l && (u.ctrl === pi || !u.shrouded); }); });
      if (!locs.length) return;
      var score = function (l) { return G.units.filter(function (u) { return u.loc === l && u.ctrl !== pi && might(u) - u.damage <= e.n; }).length * 3 + G.units.filter(function (u) { return u.loc === l && u.ctrl !== pi; }).length; };
      var sc = locs.map(score), li = await choose(G, pi, ctx.srcName, 'Deal ' + e.n + ' to up to ' + e.count + ' units at the same location. Choose the location:', locs.map(function (l) { return locName(G, l) === 'base' ? 'Bases' : locName(G, l); }), true, sc.indexOf(Math.max.apply(null, sc)));
      if (li == null) return;
      var cands = G.units.filter(function (u) { return u.loc === locs[li] && (u.ctrl === pi || (!u.shrouded && u.c.P.untargetable !== 'always')); });
      var picked = await pickUnits(G, pi, ctx.srcName, 'Deal ' + e.n, cands, e.count, function (left) { return left.filter(function (u) { return u.ctrl !== pi; }).sort(function (a, b) { return (might(a) - a.damage) - (might(b) - b.damage); })[0]; });
      picked.forEach(function (u) { var b = voidBonus(G, u); u.damage += e.n + b; if (u.ctrl !== pi && hasLethal(G, pi)) u.lethal = true; });
      if (picked.length) log(G, (ctx.srcName || 'Effect') + ' deals ' + e.n + ' to ' + picked.map(function (u) { return u.c.name; }).join(', ') + '.', pi);
    },
    channelOrDraw: async function (G, pi, e, tg, ctx) {
      var got = channel(G, pi, e.n, true);
      log(G, (ctx.srcName || 'Effect') + ': channel ' + got + ' rune' + (got === 1 ? '' : 's') + ' exhausted.', pi);
      if (got < e.n) { drawOne(G, pi); log(G, (ctx.srcName || 'Effect') + ": couldn't channel " + e.n + ', draw 1.', pi); }
    },
    predictN: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], top = p.deck.slice(0, e.n);
      if (!top.length) return;
      var keep = [], rec = [];
      for (var i = 0; i < top.length; i++) {
        var yes = await confirm(G, pi, ctx.srcName || 'Predict', 'Top ' + top.length + ': ' + top.map(function (x) { return x.c.name; }).join(', ') + '. Recycle ' + top[i].c.name + ' (put it on the bottom)?', (top[i].c.energy || 0) >= 6);
        (yes ? rec : keep).push(top[i]);
      }
      p.deck.splice(0, top.length);
      p.deck = keep.concat(p.deck, rec);
      log(G, (ctx.srcName || 'Predict') + ': ' + p.name + ' recycle' + (pi === 0 ? '' : 's') + ' ' + rec.length + ' of the top ' + top.length + '.', pi);
    },
    dealAllBf: async function (G, pi, e, tg, ctx) {
      var hit = G.units.filter(function (u) { return u.loc !== 'base'; });
      hit.forEach(function (u) { u.damage += e.n + voidBonus(G, u); if (u.ctrl !== pi && hasLethal(G, pi)) u.lethal = true; });
      log(G, (ctx.srcName || 'Effect') + ' deals ' + e.n + ' to all ' + hit.length + ' units at battlefields.', pi);
    },
    markFlourish: async function (G, pi, e, tg) { tg.forEach(function (u) { if (!u.dead) u.flourish = { pi: pi, turn: G.turnNo }; }); },
    modal: async function (G, pi, e, tg, ctx) {
      var vals = e.options.map(function (o) { var ev = evalEffects(G, pi, o.effs, { src: null, loc: null }); return ev.good ? ev.value : -1; });
      var k = await choose(G, pi, ctx.srcName, 'Choose one:', e.options.map(function (o) { return o.label; }), false, vals.indexOf(Math.max.apply(null, vals)));
      if (k == null) return;
      await resolveEffects(G, pi, e.options[k].effs, { src: ctx.src, loc: ctx.loc, srcName: ctx.srcName, noReact: ctx.noReact });
    },
    alphaStrike: async function (G, pi, e, tg, ctx) {
      var src = tg[0]; if (!src) return;
      var left = might(src), kills = 0;
      log(G, src.c.name + ' strikes for ' + left + ' damage split among enemy units at battlefields.', pi);
      while (left > 0) {
        var cands = G.units.filter(function (u) { return u.ctrl !== pi && u.loc !== 'base' && !u.dead && !u.shrouded && u.c.P.untargetable !== 'always'; });
        if (!cands.length) break;
        var killable = cands.filter(function (u) { return might(u) - u.damage <= left; }).sort(function (a, b) { return unitValue(b) - unitValue(a); });
        var a = killable[0] || cands.sort(function (x, y) { return (might(x) - x.damage) - (might(y) - y.damage); })[0];
        var uid = await ask(G, pi, { type: 'target', title: ctx.srcName, text: left + ' damage left: choose an enemy unit at a battlefield', cands: cands.map(function (u) { return u.uid; }), optional: true, auto: a.uid });
        var u = cands.filter(function (x) { return x.uid === uid; })[0];
        if (!u) break;
        var need = Math.max(1, might(u) - u.damage), d = Math.min(left, need);
        u.damage += d + voidBonus(G, u); left -= d;
        log(G, src.c.name + ' deals ' + d + ' to ' + u.c.name + '.', pi);
        if (u.damage >= might(u)) { kills++; }
      }
      await checkDeaths(G);
      if (kills) gainXp(G, pi, kills, ctx.srcName || 'Effect');
    },
    arise: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi];
      var n = p.gear.filter(function (g) { return g.c.P.equip; }).length + G.units.reduce(function (s2, u) { return s2 + (u.ctrl === pi ? u.equips.filter(function (g) { return g.c.P.equip; }).length : 0); }, 0);
      var made = [];
      for (var i = 0; i < n; i++) made.push(makeUnit(G, pi, tokenCard({ name: 'Sand Soldier', might: 2, kw: {} }), UID++, 'base', false, true));
      made.slice(0, 2).forEach(function (u) { u.ex = false; });
      log(G, (ctx.srcName || 'Effect') + ': ' + n + ' Sand Soldier' + (n === 1 ? '' : 's') + ' (one per Equipment you control), ' + Math.min(2, n) + ' ready.', pi);
      for (var j = 0; j < made.length; j++) await unitEntered(G, pi, made[j], 'token');
    },
    guards: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], loc = ctx.loc != null ? ctx.loc : 'base';
      var u = makeUnit(G, pi, tokenCard({ name: 'Sand Soldier', might: 2, kw: {} }), UID++, loc, false, true);
      log(G, (ctx.srcName || 'Effect') + ': a 2 Might Sand Soldier at ' + locName(G, loc) + '.', pi);
      if (canPay(p, 0, 1, ['Order']) && (await confirm(G, pi, ctx.srcName, 'Pay 1 Order power to ready the Sand Soldier?', loc !== 'base' || G.active === pi))) { pay(G, pi, 0, 1, ['Order']); u.ex = false; log(G, 'The Sand Soldier readies.', pi); }
      await unitEntered(G, pi, u, 'token');
    },
    lookPick: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], top = p.deck.splice(0, e.n);
      if (!top.length) return;
      var v = top.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); });
      var k = await choose(G, pi, ctx.srcName, 'Put one into your hand; the rest are recycled.', top.map(function (x) { return x.c.name + ' (' + x.c.type + ')'; }), false, v.indexOf(Math.max.apply(null, v)));
      if (k == null) k = 0;
      p.hand.push(top[k]); top.splice(k, 1); top.forEach(function (x) { p.deck.push(x); });
      log(G, (ctx.srcName || 'Effect') + ': ' + p.name + ' take' + (pi === 0 ? '' : 's') + ' 1 and recycle' + (pi === 0 ? '' : 's') + ' ' + top.length + '.', pi);
    },
    gustMonk: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], trashes = G.players.filter(function (pl) { return pl.trash.length; });
      if (!trashes.length || energyAvail(p) < 1) return;
      if (!(await confirm(G, pi, ctx.srcName, 'Pay 1 energy extra to banish a card from a trash and give a unit [Assault 2] this turn?', true))) return;
      pay(G, pi, 1, 0, []);
      var all = []; G.players.forEach(function (pl) { pl.trash.forEach(function (x) { all.push({ pl: pl, x: x }); }); });
      var k = await choose(G, pi, ctx.srcName, 'Banish a card from any trash', all.map(function (a) { return a.x.c.name + (a.pl.pi === pi ? ' (yours)' : ' (AI)'); }), false, Math.max(0, all.map(function (a) { return a.pl.pi !== pi; }).indexOf(true)));
      var b = all[k || 0]; b.pl.trash.splice(b.pl.trash.indexOf(b.x), 1);
      log(G, ctx.srcName + ' banishes ' + b.x.c.name + '.', pi);
      await resolveEffects(G, pi, [{ op: 'assault', n: 2, t: { sel: 'friendly', where: null } }], { src: ctx.src, loc: ctx.loc, srcName: ctx.srcName });
    },
    cull: async function (G, pi, e, tg, ctx) {
      var order = [pi, opp(pi)];
      for (var i = 0; i < 2; i++) {
        var q = order[i], mine = unitsOf(G, q);
        if (!mine.length) continue;
        var worst = mine.slice().sort(function (a, b) { return unitValue(a) - unitValue(b); })[0];
        var uid = await ask(G, q, { type: 'target', title: ctx.srcName, text: 'Kill one of your units', cands: mine.map(function (u) { return u.uid; }), optional: false, auto: worst.uid });
        var u = mine.filter(function (x) { return x.uid === uid; })[0] || worst;
        log(G, G.players[q].name + ' kill' + (q === 0 ? '' : 's') + ' ' + u.c.name + '.', q);
        await killUnit(G, u);
      }
    },
    decree: async function (G, pi, e, tg, ctx) { G.decreeTurn = G.turnNo; log(G, (ctx.srcName || 'Effect') + ': this turn, any unit that takes damage dies.', pi); },
    voidRush: async function (G, pi, e, tg, ctx) { await revealAndPlay(G, pi, 2, 2, ctx.srcName, 'draw'); },
    promisingFuture: async function (G, pi, e, tg, ctx) {
      var picks = [];
      for (var i = 0; i < 2; i++) {
        var q = i === 0 ? opp(pi) : pi, pl = G.players[q], top = pl.deck.splice(0, 5);
        if (!top.length) continue;
        var v = top.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); });
        var k = await choose(G, q, ctx.srcName, 'Choose one of your top 5 to play for free (energy ignored); the rest are recycled.', top.map(function (x) { return x.c.name; }), false, v.indexOf(Math.max.apply(null, v)));
        var ch = top[k || 0]; top.forEach(function (x) { if (x !== ch) pl.deck.push(x); });
        picks.push([q, ch]);
      }
      for (var j = 0; j < picks.length; j++) {
        var q2 = picks[j][0], card = picks[j][1];
        if (card.c.type === 'Battlefield' || card.c.type === 'Legend' || card.c.P.counter || !(await castFrom(G, q2, card, 0, true, ctx.srcName))) { G.players[q2].deck.push(card); log(G, card.c.name + " can't be played; it's recycled.", q2); }
      }
    },
    dragonPing: async function (G, pi, e, tg, ctx) {
      var locs = ['base', 0, 1];
      for (var i = 0; i < locs.length; i++) {
        var cands = G.units.filter(function (u) { return u.ctrl !== pi && u.loc === locs[i] && !u.shrouded && u.c.P.untargetable !== 'always'; });
        if (!cands.length) continue;
        var best = cands.slice().sort(function (a, b) { return unitValue(b) - unitValue(a); })[0];
        var uid = await ask(G, pi, { type: 'target', title: ctx.srcName, text: 'Deal 1 to up to one enemy unit at ' + (locs[i] === 'base' ? 'their base' : bfName(G, locs[i])), cands: cands.map(function (u) { return u.uid; }), optional: true, auto: best.uid });
        var u = cands.filter(function (x) { return x.uid === uid; })[0];
        if (u) { u.damage += 1 + voidBonus(G, u); if (hasLethal(G, pi)) u.lethal = true; log(G, ctx.srcName + ' deals 1 to ' + u.c.name + '.', pi); }
      }
    },
    moveTokensHere: async function (G, pi, e, tg, ctx) {
      var me = ctx.src; if (!me) return;
      var toks = G.units.filter(function (u) { return u.ctrl === pi && u.token && u.loc !== me.loc; });
      if (!toks.length) return;
      if (!(await confirm(G, pi, me.c.name, 'Move your ' + toks.length + ' token unit' + (toks.length > 1 ? 's' : '') + ' to ' + bfName(G, me.loc) + ' to join the attack?', true))) return;
      toks.forEach(function (u) { u.loc = me.loc; });
      updateControl(G);
      log(G, me.c.name + ' calls ' + toks.length + ' token unit' + (toks.length > 1 ? 's' : '') + ' to ' + bfName(G, me.loc) + '.', pi);
    },
    forgeRecycle: async function (G, pi, e, tg, ctx) {
      for (var i = 0; i < 4; i++) {
        var all = []; G.players.forEach(function (pl) { pl.trash.forEach(function (x) { all.push({ pl: pl, x: x }); }); });
        if (!all.length) return;
        var auto = all.map(function (a) { return a.pl.pi !== pi; }).indexOf(true);
        var k = await choose(G, pi, ctx.srcName, 'Recycle a card from a trash (' + (i + 1) + ' of up to 4)', all.map(function (a) { return a.x.c.name + (a.pl.pi === pi ? ' (yours)' : ' (AI)'); }), true, auto < 0 ? null : auto);
        if (k == null) return;
        var a = all[k]; a.pl.trash.splice(a.pl.trash.indexOf(a.x), 1); a.pl.deck.push(a.x);
        log(G, ctx.srcName + ' recycles ' + a.x.c.name + '.', pi);
      }
    },
    aurora: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], seen = [];
      while (p.deck.length) { var x = p.deck.shift(); if (x.c.type === 'Unit') { log(G, (ctx.srcName || 'Effect') + ': revealed ' + seen.length + ' card' + (seen.length === 1 ? '' : 's') + ' before ' + x.c.name + '.', pi); seen.forEach(function (y) { p.deck.push(y); }); await playFree(G, pi, x, 'base', ctx.srcName); return; } seen.push(x); }
      seen.forEach(function (y) { p.deck.push(y); });
    },
    sigil: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi]; if (!p.runes.length) return;
      var rs = p.runes.slice().sort(function (a, b) { return b.ex - a.ex; });
      var k = await choose(G, pi, 'Sigil of the Storm', 'Recycle one of your runes', rs.map(function (r) { return r.d + ' rune' + (r.ex ? ' (exhausted)' : ''); }), false, 0);
      recycleRune(p, rs[k || 0]); log(G, 'Sigil of the Storm: ' + p.name + ' recycle' + (pi === 0 ? '' : 's') + ' a rune.', pi);
    },
    hallReady: async function (G, pi) {
      var p = G.players[pi];
      if (!p.legend.exhausted || energyAvail(p) < 1) return;
      if (!(await confirm(G, pi, 'Hall of Legends', 'Pay 1 energy to ready your legend?', true))) return;
      pay(G, pi, 1, 0, []); p.legend.exhausted = false; p.legend.used = {}; log(G, 'Hall of Legends: ' + p.legend.c.name + ' readies.', pi);
    },
    readySomething: async function (G, pi, e, tg, ctx) { if (ctx.src) await readySomething(G, pi, ctx.src); },
    pullOwnTurn: async function (G, pi, e, tg, ctx) { if (G.active === pi) await OPS.pull(G, pi, e, tg, ctx); }
  });
  Object.assign(OPS_VALUE, {
    multiDeal: function () { return 2; }, channelOrDraw: function (G, pi, e) { return 1.5 * e.n; }, dealAllBf: function () { return 1; },
    modal: function () { return 2.5; }, arise: function (G, pi) { return 3; }, guards: function () { return 3; }, lookPick: function () { return 1.8; },
    cull: function (G, pi) { return unitsOf(G, opp(pi)).length && unitsOf(G, pi).length <= unitsOf(G, opp(pi)).length ? 2 : -2; }, decree: function () { return 0; },
    voidRush: function () { return 3; }, promisingFuture: function () { return 3; }, alphaStrike: function () { return 0; }
  });
  function T2(sel, where, extra) { return T(sel, where, extra); }
  var EMP = function (label, energy, power, domain, extra) { return Object.assign({ label: label, energy: energy, power: power, domain: domain, exhaust: false, req: function (G, u) { return u.empowered ? 'Already empowered.' : null; }, effs: [{ op: 'empowerSelf' }] }, extra || {}); };
  Object.assign(CARD_SCRIPTS, {
    // Jayce
    jaycebrilliantinventor: { sim: [0], play: [{ op: 'readySomething' }], readyOnGear: true },
    bellowsbreath: { sim: [2], effs: [{ op: 'multiDeal', n: 1, count: 3 }] },
    catalystofaeons: { sim: [0], effs: [{ op: 'channelOrDraw', n: 2 }] },
    mobilize: { sim: [0], effs: [{ op: 'channelOrDraw', n: 1 }] },
    clairvoyance: { sim: [1], effs: [{ op: 'predictN', n: 5 }, { op: 'draw', n: 2 }] },
    dazzlingaurora: { sim: [0], endOfTurn: [{ op: 'aurora' }] },
    elderdragon: { sim: [0, 1], lethalDamage: true, play: [{ op: 'dragonPing' }] },
    platewyrmegg: { sim: [0, 1, 2], entersExhausted: true, addEnergy: true, gearActs: [{ label: 'Empower (1 energy, exhaust)', energy: 1, req: function (G, pi, g) { return g.empowered ? 'Already empowered.' : null; }, run: function (G, pi, g) { g.empowered = true; log(G, '✦ Platewyrm Egg is empowered: it now adds 2 energy.', pi); } }] },
    promisingfuture: { sim: [0], effs: [{ op: 'promisingFuture' }] },
    flurryofblades: { sim: [1], effs: [{ op: 'dealAllBf', n: 1 }] },
    garbagegrabber: { sim: [0], gearActs: [{ label: 'Recycle 3 from your trash, 1 energy, exhaust: draw 1', energy: 1, recycleTrash: 3, effs: [{ op: 'draw', n: 1 }] }] },
    deadlyflourish: { sim: [0], effs: [{ op: 'deal', n: 3, t: T('enemy') }, { op: 'markFlourish', t: T('it') }] },
    gutterpalace: { sim: [0, 1], gutterWin: true, gearActs: [{ label: 'Discard 1, exhaust: play a 1 Might Bird token with [Deflect]', discard: 1, effs: [{ op: 'token', count: 1, ready: false, might: 1, name: 'Bird', kw: { deflect: true }, here: false }] }] },
    rocketbarrage: { sim: [1, 2, 3], effs: [{ op: 'modal', options: [{ label: 'Deal 4 to a unit in a base', effs: [{ op: 'deal', n: 4, t: T('enemy', 'inbase') }] }, { label: 'Kill a gear', effs: [{ op: 'killGear' }] }] }] },
    sigilofthestorm: { sim: [0], bfconquer: [{ op: 'sigil' }] },
    forgottenmonument: { sim: [0] }, dragonroost: { sim: [0] },
    // Master Yi
    masteryitempered: { sim: [1], levelKw: { level: 6, kw: { deflect: true, ganking: true } } },
    ruinrunner: { sim: [0], untargetable: 'always' },
    alphastrike: { sim: [1], effs: [{ op: 'alphaStrike', t: T('friendly') }] },
    // Azir
    trifarianwarcamp: { sim: [0] }, ornnsforge: { sim: [0] },
    halloflegends: { sim: [0], bfconquer: [{ op: 'hallReady' }] },
    azirsovereign: { sim: [1], attackFx: [{ op: 'moveTokensHere' }] },
    arise: { sim: [0], effs: [{ op: 'arise' }] },
    guards: { sim: [1], effs: [{ op: 'guards' }] },
    // Vex
    fortifiedposition: { sim: [0] }, thresholdofthegray: { sim: [0] },
    astralheron: { sim: [0], heronDiscount: true },
    stackeddeck: { sim: [1], effs: [{ op: 'lookPick', n: 3 }] },
    steelpaws: { sim: [1, 2], unitAct: EMP('Empower (7 energy)', 7, 0, 'Colorless'), empoweredMight: 7 },
    evelynnentrancing: { sim: [2], hiddenFx: [{ op: 'pullOwnTurn', t: T('enemy', null, { notHere: true }), opt: true }] },
    edgeofnight: { sim: [1], attachFromHidden: true },
    gustmonk: { sim: [0, 1], play: [{ op: 'gustMonk' }] },
    // Rek'Sai
    thecandlelitsanctum: { sim: [0], bfconquer: [{ op: 'predictN', n: 2 }] },
    forbiddingwaste: { sim: [0] }, mysticvortex: { sim: [0] },
    reksaibreacher: { sim: [2], grantAccelerate: true },
    bloodrush: { sim: [2], effs: [{ op: 'assault', n: 2, t: T('any') }] },
    culltheweak: { sim: [0], effs: [{ op: 'cull' }] },
    imperialdecree: { sim: [1], effs: [{ op: 'decree' }] },
    cleave: { sim: [1], effs: [{ op: 'assault', n: 3, t: T('any') }] },
    escapedgrayback: { sim: [0, 1], unitAct: EMP('Empower (kill another friendly unit)', 0, 0, 'Colorless', { killFriendly: true }), empoweredMight: 2 },
    noxianemissary: { sim: [0, 1], unitAct: EMP('Empower (1 energy + 1 Order power)', 1, 1, 'Order'), empoweredDeathknell: [{ op: 'token', count: 2, ready: false, might: 1, name: 'Recruit', kw: {}, here: false }] },
    voidrush: { sim: [0], effs: [{ op: 'voidRush' }] },
    forgeofthefuture: { sim: [0, 1], play: [{ op: 'token', count: 1, ready: false, might: 1, name: 'Recruit', kw: {}, here: false }], gearActs: [{ label: 'Kill this: recycle up to 4 cards from trashes', exhaust: false, killSelf: true, effs: [{ op: 'forgeRecycle' }] }] }
  });

  /* ---------------- Radiance: Riven, Evelynn, Mordekaiser, Orianna, Seraphine ---------------- */
  // Exhaust units as a group, then run "when I become exhausted" triggers (and Seraphine, Inspiring's draw for 3+).
  async function exhaustUnits(G, pi, units) {
    units.forEach(function (u) { u.ex = true; });
    for (var i = 0; i < units.length; i++) if (!units[i].dead && units[i].c.P.onExhausted) await units[i].c.P.onExhausted(G, units[i].ctrl, units[i]);
    if (units.length >= 3) {
      var ins = G.units.filter(function (u) { return u.ctrl === pi && u.c.P.drawOnTripleExhaust && u.inspTurn !== G.turnNo; })[0];
      if (ins && (await confirm(G, pi, ins.c.name, 'You exhausted ' + units.length + ' units at once. Draw 1?', true))) { ins.inspTurn = G.turnNo; drawOne(G, pi); log(G, ins.c.name + ': draw 1.', pi); }
    }
  }
  function deploySpots(G, pi) { return G.bfs.map(function (b, i) { return i; }); }
  function seraphineReady(G, pi) {
    var L = G.players[pi].legend;
    return L.c && L.c.P.seraphineDiscount && !L.exhausted && unitsOf(G, pi).filter(function (u) { return !u.ex; }).length >= 3;
  }
  // Rakelstake: the first time each player plays a unit or gear here each turn, they Predict.
  async function rakelstake(G, pi, loc) {
    if (loc === 'base' || bfNorm(G, loc) !== 'rakelstake') return;
    G.rakel = G.rakel || {};
    if (G.rakel[pi] === G.turnNo) return;
    G.rakel[pi] = G.turnNo;
    await OPS.predict(G, pi, {}, [], { srcName: 'Rakelstake' });
  }
  // Orianna: a friendly gear becomes a unit with Might equal to its Energy cost until another gear is chosen.
  async function animateGear(G, pi) {
    var p = G.players[pi];
    var old = G.units.filter(function (u) { return u.ctrl === pi && u.animatedGear; })[0];
    var cands = p.gear.filter(function (g) { return !g.token && (g.c.energy || 0) > 0; });
    if (!cands.length || energyAvail(p) < 1) return;
    var v = cands.map(function (g) { return g.c.energy || 0; });
    var k = await choose(G, pi, p.legend.c.name, 'Pay 1 energy to turn a friendly gear into a unit (Might = its Energy cost)?', cands.map(function (g) { return g.c.name + ' (' + (g.c.energy || 0) + ' Might)'; }), true, (old && Math.max.apply(null, v) <= old.mightOverride) ? null : v.indexOf(Math.max.apply(null, v)));
    if (k == null) return;
    pay(G, pi, 1, 0, []);
    if (old) { removeUnit(G, old); old.dead = true; p.gear.push(old.animatedGear); old.animatedGear.loc = old.loc === 'base' || !old.animatedGear.c.P.kw.deploy ? (old.animatedGear.c.P.kw.deploy ? old.loc : 'base') : old.loc; log(G, old.c.name + ' turns back into gear.', pi); }
    var g = cands[k];
    p.gear.splice(p.gear.indexOf(g), 1);
    var u = makeUnit(G, pi, g.c, g.iid, g.loc || 'base', !g.ex, false);
    u.animatedGear = g; u.mightOverride = g.c.energy || 0;
    log(G, p.legend.c.name + ': ' + g.c.name + ' becomes a ' + u.mightOverride + ' Might unit.', pi);
  }
  Object.assign(OPS, {
    showOff: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], can = e.what === 'hidden'
        ? p.hand.some(function (x) { return x.c.P.kw.hidden && x !== ctx.card; }) || p.hidden.length
        : p.hand.some(function (x) { return x.c.type === 'Gear'; }) || p.gear.length || G.units.some(function (u) { return u.ctrl === pi && u.equips.length; });
      ctx.showedOff = !!can && (await confirm(G, pi, ctx.srcName, 'Show Off ' + (e.what === 'hidden' ? 'a card with [Hidden]' : 'a gear') + ' for the bonus?', true));
      if (ctx.showedOff) log(G, (ctx.srcName || 'Effect') + ': ' + p.name + ' show' + (pi === 0 ? '' : 's') + ' off ' + (e.what === 'hidden' ? 'a Hidden card' : 'a gear') + '.', pi);
    },
    readyRunesIfShow: async function (G, pi, e, tg, ctx) {
      if (!ctx.showedOff) return;
      var rs = G.players[pi].runes.filter(function (r) { return r.ex; }).slice(0, e.n);
      rs.forEach(function (r) { r.ex = false; }); log(G, (ctx.srcName || 'Effect') + ': ready ' + rs.length + ' rune' + (rs.length === 1 ? '' : 's') + '.', pi);
    },
    addPowerIfShow: async function (G, pi, e, tg, ctx) { if (ctx.showedOff) { G.players[pi].poolPower = (G.players[pi].poolPower || 0) + 1; log(G, (ctx.srcName || 'Effect') + ': add 1 power of any domain.', pi); } },
    stranger: async function (G, pi, e, tg, ctx) {
      var bfs = G.bfs.map(function (b, i) { return i; }).filter(function (i) { return unitsAt(G, i).length >= 4 && unitsAt(G, i, opp(pi)).length; });
      if (!bfs.length) { log(G, (ctx.srcName || 'Effect') + ': no battlefield has 4 or more units.', pi); return; }
      var foes = G.units.filter(function (u) { return u.ctrl !== pi && bfs.indexOf(u.loc) >= 0 && !u.shrouded && u.c.P.untargetable !== 'always'; });
      if (!foes.length) return;
      var bst = foes.slice().sort(function (a, b) { return unitValue(b) - unitValue(a); })[0];
      var uid = await ask(G, pi, { type: 'target', title: ctx.srcName, text: 'Return an enemy unit at a battlefield with 4+ units to its owner\'s hand', cands: foes.map(function (u) { return u.uid; }), optional: true, auto: bst.uid });
      var u = foes.filter(function (x) { return x.uid === uid; })[0];
      if (u) await applyEffect(G, pi, { op: 'tohand' }, [u], ctx);
    },
    selfToHand: async function (G, pi, e, tg, ctx) { if (ctx.src && !ctx.src.dead) await applyEffect(G, pi, { op: 'tohand' }, [ctx.src], ctx); },
    pullToGear: async function (G, pi, e, tg, ctx) {
      var loc = ctx.gearLoc; if (loc == null || loc === 'base') return;
      var foes = G.units.filter(function (u) { return u.ctrl !== pi && u.loc !== loc && !u.shrouded && u.c.P.untargetable !== 'always'; });
      if (!foes.length) return;
      var w = foes.slice().sort(function (a, b) { return might(a) - might(b); })[0];
      var uid = await ask(G, pi, { type: 'target', title: ctx.srcName, text: 'Move an enemy unit to ' + bfName(G, loc) + '?', cands: foes.map(function (u) { return u.uid; }), optional: true, auto: w.uid });
      var u = foes.filter(function (x) { return x.uid === uid; })[0];
      if (u) { u.loc = loc; updateControl(G); log(G, (ctx.srcName || 'Effect') + ' moves ' + u.c.name + ' to ' + bfName(G, loc) + '.', pi); }
    },
    mordDiscardKill: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi]; if (!p.hand.length) return;
      var targets = G.units.filter(function (u) { return u !== ctx.src && !u.shrouded && (u.ctrl === pi || u.c.P.untargetable !== 'always'); });
      var gearT = []; G.players.forEach(function (pl) { pl.gear.forEach(function (g) { gearT.push({ g: g, pl: pl }); }); });
      if (!targets.length && !gearT.length) return;
      var foes = targets.filter(function (u) { return u.ctrl !== pi; }).sort(function (a, b) { return unitValue(b) - unitValue(a); });
      var labels = targets.map(function (u) { return u.c.name + (u.ctrl === pi ? ' (yours)' : ' (AI)') + ' — unit'; }).concat(gearT.map(function (x) { return x.g.c.name + (x.pl.pi === pi ? ' (yours)' : ' (AI)') + ' — gear'; }));
      var k = await choose(G, pi, ctx.srcName, 'Discard 1 to kill a unit or gear?', labels, true, foes.length && unitValue(foes[0]) >= 3 ? targets.indexOf(foes[0]) : null);
      if (k == null) return;
      await applyEffect(G, pi, { op: 'discard', n: 1 }, [], ctx);
      if (k < targets.length) { log(G, (ctx.srcName || 'Effect') + ' kills ' + targets[k].c.name + '.', pi); await killUnit(G, targets[k]); }
      else { var x = gearT[k - targets.length]; x.pl.gear.splice(x.pl.gear.indexOf(x.g), 1); x.pl.trash.push(x.g); log(G, (ctx.srcName || 'Effect') + ' kills ' + x.g.c.name + '.', pi); }
    },
    realm: async function (G, pi, e, tg, ctx) {
      var a = ctx.it, b = tg[0]; if (!a || !b || a.dead) return;
      a.temp -= 2; b.temp += 2;
      var ma = might(a) + voidBonus(G, b), mb = might(b) + voidBonus(G, a);
      b.damage += ma; a.damage += mb;
      log(G, (ctx.srcName || 'Effect') + ': ' + a.c.name + ' gets -2, ' + b.c.name + ' +2, and they deal ' + ma + ' and ' + mb + ' to each other.', pi);
    },
    tutorTop: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], top = p.deck.splice(0, e.n);
      var ok = top.filter(function (x) { return e.types.indexOf(x.c.type) >= 0 && (x.c.energy || 0) <= e.maxE && (x.c.power || 0) <= e.maxP; });
      var v = ok.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); });
      var k = ok.length ? await choose(G, pi, ctx.srcName, 'Top ' + top.length + ': ' + top.map(function (x) { return x.c.name; }).join(', ') + '. Reveal one and draw it?', ok.map(function (x) { return x.c.name; }), true, v.indexOf(Math.max.apply(null, v))) : null;
      var got = k != null ? ok[k] : null;
      if (got) { p.hand.push(got); log(G, (ctx.srcName || 'Effect') + ': draw ' + got.c.name + '.', pi); }
      top.forEach(function (x) { if (x !== got) p.deck.push(x); });
    },
    pingUpTo: async function (G, pi, e, tg, ctx) {
      var cands = G.units.filter(function (u) { return u !== ctx.src && (u.ctrl === pi || (!u.shrouded && u.c.P.untargetable !== 'always')); });
      var picked = await pickUnits(G, pi, ctx.srcName, 'Deal ' + e.n + ' to a unit', cands, e.count, function (left) { return left.filter(function (u) { return u.ctrl !== pi; }).sort(function (a, b) { return (might(a) - a.damage) - (might(b) - b.damage); })[0]; });
      picked.forEach(function (u) { u.damage += e.n + voidBonus(G, u); if (u.ctrl !== pi && hasLethal(G, pi)) u.lethal = true; });
      if (picked.length) log(G, (ctx.srcName || 'Effect') + ' deals ' + e.n + ' to ' + picked.map(function (u) { return u.c.name; }).join(', ') + '.', pi);
    },
    payThenDeal: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], free = hasEzreal(G, pi);
      if (!free && !canPay(p, e.energy, 1, [e.domain])) return;
      var foes = G.units.filter(function (u) { return u.loc !== 'base' && (u.ctrl === pi || (!u.shrouded && u.c.P.untargetable !== 'always')); });
      if (!foes.length) return;
      if (!(await confirm(G, pi, ctx.srcName, 'Pay ' + (free ? '(free with Ezreal) ' : e.energy + ' energy + 1 ' + e.domain + ' power ') + 'to deal ' + e.n + ' to a unit at a battlefield?', foes.some(function (u) { return u.ctrl !== pi; })))) return;
      if (!free) pay(G, pi, e.energy, 1, [e.domain]);
      await resolveEffects(G, pi, [{ op: 'deal', n: e.n, t: { sel: 'any', where: 'bf' } }], { src: ctx.src, loc: ctx.loc, srcName: ctx.srcName });
    },
    kharox: async function (G, pi, e, tg, ctx) {
      var o = G.players[opp(pi)], n = burn(G, opp(pi), 3);
      log(G, (ctx.srcName || 'Effect') + ': ' + o.name + ' burn' + (opp(pi) === 0 ? '' : 's') + ' ' + n + '.', pi);
      var units = o.trash.filter(function (x) { return x.c.type === 'Unit'; });
      if (!units.length) return;
      var v = units.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); });
      var k = await choose(G, pi, ctx.srcName, "Play a unit from the opponent's trash, ignoring its cost?", units.map(function (x) { return x.c.name; }), true, v.indexOf(Math.max.apply(null, v)));
      if (k == null) return;
      o.trash.splice(o.trash.indexOf(units[k]), 1);
      var u = await playFree(G, pi, units[k], 'base', ctx.srcName);
      if (u) u.owner = opp(pi);
    },
    raucous: async function (G, pi, e, tg, ctx) { unitsOf(G, pi).forEach(function (u) { u.ex = false; u.temp += 3; }); log(G, (ctx.srcName || 'Effect') + ': ready your units and give them +3 Might this turn.', pi); },
    shadowsCall: async function (G, pi, e, tg, ctx) { var u = tg[0]; u.kwx = Object.assign({}, u.kwx || {}, { temporary: true }); log(G, u.c.name + ' gains Temporary.', pi); },
    mightMin1: async function (G, pi, e, tg, ctx) { tg.forEach(function (u) { var d = Math.min(e.n, Math.max(0, might(u) - 1)); u.temp -= d; }); log(G, (ctx.srcName || 'Effect') + ' gives ' + tg[0].c.name + ' -' + e.n + ' Might this turn (minimum 1).', pi); },
    drawIfGear: async function (G, pi, e) { var n = G.players[pi].gear.length + G.units.reduce(function (s2, u) { return s2 + (u.ctrl === pi ? u.equips.length : 0); }, 0); if (n >= e.n) { drawOne(G, pi); log(G, 'You control ' + n + ' gear: draw 1.', pi); } },
    payRecruit: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi]; if (energyAvail(p) < 1) return;
      if (!(await confirm(G, pi, ctx.srcName, 'Pay 1 energy to play a 1 Might Recruit token to your base?', true))) return;
      pay(G, pi, 1, 0, []); makeUnit(G, pi, tokenCard({ name: 'Recruit', might: 1, kw: {} }), UID++, 'base', false, true); log(G, (ctx.srcName || 'Effect') + ': a 1 Might Recruit in base.', pi);
    },
    ballFx: async function (G, pi, e, tg, ctx) {
      var loc = ctx.gearLoc;
      var foes = loc != null && loc !== 'base' ? unitsAt(G, loc, opp(pi)) : [];
      var k = await choose(G, pi, ctx.srcName, 'Choose one:', ['Draw 1', 'Deal 2 to enemy units here' + (foes.length ? ' (' + foes.length + ')' : ' (none here)')], false, foes.length ? 1 : 0);
      if (k === 1) { foes.forEach(function (u) { u.damage += 2 + voidBonus(G, u); }); log(G, (ctx.srcName || 'Effect') + ' deals 2 to ' + foes.length + ' enemy unit' + (foes.length === 1 ? '' : 's') + ' here.', pi); }
      else { drawOne(G, pi); log(G, (ctx.srcName || 'Effect') + ': draw 1.', pi); }
    },
    moveDeploy: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], gs = p.gear.filter(function (g) { return g.c.P.kw.deploy; });
      if (!gs.length) { log(G, (ctx.srcName || 'Effect') + ': no Deploy gear to move.', pi); return; }
      var k = await choose(G, pi, ctx.srcName, 'Move which Deploy gear?', gs.map(function (g) { return g.c.name + ' (at ' + locName(G, g.loc) + ')'; }), false, 0);
      var g = gs[k || 0], ds = G.bfs.map(function (b, i) { return i; }).filter(function (i) { return i !== g.loc; });
      var d = await choose(G, pi, ctx.srcName, 'Move ' + g.c.name + ' to:', ds.map(function (i) { return bfName(G, i); }), false, 0);
      g.loc = ds[d || 0]; log(G, g.c.name + ' moves to ' + bfName(G, g.loc) + '.', pi);
      if (g.c.P.onGearMove) await resolveEffects(G, pi, g.c.P.onGearMove, { src: null, loc: g.loc, gearLoc: g.loc, srcName: g.c.name });
    },
    encore: async function (G, pi, e, tg, ctx) {
      var modes = [
        { label: 'Deal 2 to a unit', effs: [{ op: 'deal', n: 2, t: { sel: 'any', where: null } }] },
        { label: 'Play two 1 Might Recruit unit tokens', effs: [{ op: 'token', count: 2, ready: false, might: 1, name: 'Recruit', kw: {}, here: false }] },
        { label: 'Give up to two units each +1 Might this turn', effs: [{ op: 'might', n: 1, t: { sel: 'friendly', where: null }, opt: true }, { op: 'might', n: 1, t: { sel: 'friendly', where: null, notIt: true }, opt: true }] },
        { label: 'Look at the top 2: draw 1, recycle the other', effs: [{ op: 'lookPick', n: 2 }] }
      ];
      var vals = modes.map(function (m) { var ev = evalEffects(G, pi, m.effs, { src: null, loc: null }); return ev.good ? ev.value : -1; });
      for (var r = 0; r < 2 && modes.length; r++) {
        var k = await choose(G, pi, ctx.srcName, 'Choose two (' + (r + 1) + ' of 2):', modes.map(function (m) { return m.label; }), false, vals.indexOf(Math.max.apply(null, vals)));
        if (k == null) k = 0;
        var m = modes.splice(k, 1)[0]; vals.splice(k, 1);
        await resolveEffects(G, pi, m.effs, { src: null, loc: null, srcName: ctx.srcName, noReact: ctx.noReact });
      }
    },
    veiled: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], opts = [];
      p.gear.forEach(function (g) { if (g.ex) opts.push({ label: 'Ready ' + g.c.name, fn: function () { g.ex = false; } }); });
      G.units.forEach(function (u) { if (u.ctrl === pi) u.equips.forEach(function (g) { opts.push({ label: 'Detach ' + g.c.name + ' from ' + u.c.name + ' (to your base)', fn: function () { u.equips.splice(u.equips.indexOf(g), 1); g.ex = false; g.loc = 'base'; p.gear.push(g); } }); }); });
      if (!opts.length) return;
      var k = await choose(G, pi, 'Veiled Temple', 'Ready a friendly gear (Equipment may be detached)?', opts.map(function (o) { return o.label; }), true, 0);
      if (k == null) return;
      opts[k].fn(); log(G, 'Veiled Temple: ' + opts[k].label + '.', pi);
    },
    legionGate: async function (G, pi, e, tg, ctx) { if (G.playedThisTurn < 2) { ctx.stop = true; log(G, (ctx.srcName || 'Effect') + ': no Legion (you haven\'t played another card this turn).', pi); } },
    silence: async function (G, pi, e, tg, ctx) { G.silence = { pi: opp(pi), turn: G.turnNo }; log(G, (ctx.srcName || 'Effect') + ": the opponent can't play cards this turn.", pi); },
    rostrum: async function (G, pi, e, tg, ctx) { drawOne(G, pi); channel(G, pi, 1, true); log(G, (ctx.srcName || 'Effect') + ': draw 1 and channel 1 rune exhausted.', pi); }
  });
  Object.assign(OPS_VALUE, { stranger: function () { return 0.5; }, realm: function () { return 2; }, tutorTop: function () { return 1.6; }, pingUpTo: function () { return 1.5; },
    raucous: function (G, pi) { return unitsOf(G, pi).length * 2; }, encore: function () { return 3.5; }, moveDeploy: function () { return 0.5; }, showOff: function () { return 0; } });
  // Riven, Broken Blade: when exhausted, choose a mode not chosen this turn.
  async function rivenExhausted(G, pi, u) {
    if (u.rivenTurn !== G.turnNo) { u.rivenTurn = G.turnNo; u.rivenModes = {}; }
    var modes = [
      { k: 'buff', label: 'Buff me', ok: !u.buff, fn: async function () { u.buff = 1; log(G, u.c.name + ' buffs itself.', pi); } },
      { k: 'stun', label: 'Spend my buff to stun an enemy unit', ok: !!u.buff && G.units.some(function (v) { return v.ctrl !== pi; }), fn: async function () { u.buff = 0; await resolveEffects(G, pi, [{ op: 'stun', t: { sel: 'enemy', where: null } }], { src: u, loc: u.loc, srcName: u.c.name }); } },
      { k: 'ready', label: 'Spend my buff to ready me', ok: !!u.buff, fn: async function () { u.buff = 0; u.ex = false; log(G, u.c.name + ' spends its buff to ready.', pi); } }
    ].filter(function (m) { return m.ok && !u.rivenModes[m.k]; });
    if (!modes.length) return;
    var auto = modes.map(function (m) { return m.k; }).indexOf(u.loc === 'base' ? 'ready' : 'stun');
    var k = await choose(G, pi, u.c.name, 'I became exhausted — choose one:', modes.map(function (m) { return m.label; }), true, auto < 0 ? 0 : auto);
    if (k == null) return;
    u.rivenModes[modes[k].k] = true;
    await modes[k].fn();
  }
  async function innovatorExhausted(G, pi, u) {
    var p = G.players[pi], opts = ['Play a Gold gear token exhausted'];
    if (canPay(p, 0, 1, ['Chaos'])) opts.push('Pay 1 Chaos power to draw 1');
    var k = await choose(G, pi, u.c.name, 'I became exhausted — choose one:', opts, false, 0);
    if (k === 1) { pay(G, pi, 0, 1, ['Chaos']); drawOne(G, pi); log(G, u.c.name + ': draw 1.', pi); } else addGold(G, pi, 1, u.c.name);
  }
  var MORDEKAISER = {
    acts: [{
      label: 'Banish a unit or gear from your trash, exhaust: add 1 power (any domain) for units or gear', energy: 0, exhaust: true, timing: 'reaction',
      req: function (G, pi) { return G.players[pi].trash.some(function (x) { return x.c.type === 'Unit' || x.c.type === 'Gear'; }) ? null : 'You need a unit or gear in your trash.'; },
      effs: [], pay: function (G, pi) {
        var p = G.players[pi], t = p.trash.filter(function (x) { return x.c.type === 'Unit' || x.c.type === 'Gear'; }).sort(function (a, b) { return (a.c.energy || 0) - (b.c.energy || 0); })[0];
        p.trash.splice(p.trash.indexOf(t), 1); p.poolPowerUG = (p.poolPowerUG || 0) + 1;
        log(G, 'Mordekaiser banishes ' + t.c.name + ' from the trash: +1 power for units or gear this turn.', pi);
      }
    }]
  };
  var ORIANNA = { mainStart: animateGear };
  Object.assign(LEGEND_SCRIPTS, {
    riventheexile: { flags: { readyAtControlled: true } },
    evelynnagonysembrace: { flags: { faceDownDraw: true } },
    mordekaiserironrevenant: MORDEKAISER,
    oriannaladyofclockwork: ORIANNA,
    seraphinestarryeyedsongstress: { flags: { seraphineDiscount: true } }
  });
  Object.assign(CARD_SCRIPTS, {
    // battlefields
    rakelstake: { sim: [0] }, bandlescoutsacademy: { sim: [0] }, rockfallpath: { sim: [0] }, blackrosesanctum: { sim: [0] },
    veiledtemple: { sim: [0], bfconquer: [{ op: 'veiled' }] },
    // Riven
    rivenbrokenblade: { sim: [0, 1, 2, 3], onExhausted: rivenExhausted },
    bladeoftheexile: { sim: [0, 1], grantKw: { ganking: true }, equipAltExhaust: true },
    battlepreparations: { sim: [1, 2], effs: [{ op: 'showOff', what: 'gear' }, { op: 'might', n: 2, t: T('any') }, { op: 'readyRunesIfShow', n: 2 }] },
    bedevilingstranger: { sim: [1], play: [{ op: 'stranger' }] },
    blitzcrankimpassive: { sim: [1, 2], playToBf: [{ op: 'pull', t: T('enemy', null, { notHere: true }), opt: true }], holdFx: [{ op: 'selfToHand' }] },
    recklessinnovator: { sim: [1, 2, 3], onExhausted: innovatorExhausted },
    // Evelynn
    gutterguardian: { sim: [1, 2], play: [{ op: 'showOff', what: 'hidden' }, { op: 'addPowerIfShow' }] },
    holdem: { sim: [1], costMod: function (G, pi) { return G.players[pi].toBfTurn === G.turnNo ? -2 : 0; } },
    ksantecourageous: { sim: [2] },
    kharox: { sim: [0, 1], unitAct: EMP('Empower (6 energy + 2 Chaos power)', 6, 2, 'Chaos', { effs: [{ op: 'empowerSelf' }, { op: 'kharox' }] }) },
    // Mordekaiser
    mordekaiserdominating: { sim: [0], play: [{ op: 'mordDiscardKill' }], attackFx: [{ op: 'mordDiscardKill' }] },
    realmofdeath: { sim: [0], effs: [{ op: 'mark', t: T('enemy') }, { op: 'realm', t: T('friendly') }] },
    trifariancaptain: { sim: [0], play: [{ op: 'tutorTop', n: 4, types: ['Unit', 'Gear'], maxE: 3, maxP: 1 }] },
    bilgewatertracker: { sim: [0], play: [{ op: 'pingUpTo', n: 1, count: 2 }] },
    blastcorpscadet: { sim: [0, 1], play: [{ op: 'payThenDeal', energy: 1, domain: 'Fury', n: 2 }] },
    longsword: { sim: [0] }, clotharmor: { sim: [0] },
    sealofunity: { sim: [0], addPower: 'Order', gearActs: [{ label: 'Exhaust: add 1 Order power now (it is also used automatically when you pay)', timing: 'reaction', run: function (G, pi) { var p = G.players[pi]; p.poolDom = p.poolDom || {}; p.poolDom.Order = (p.poolDom.Order || 0) + 1; log(G, 'Seal of Unity adds 1 Order power (until end of turn).', pi); } }] },
    spectralmatron: { sim: [0], play: [{ op: 'reanimate', maxEnergy: 3, maxPower: 1, free: true, optional: true }] },
    xinzhaovigilant: { sim: [1], entersReadyIf: function (G, pi) { return unitsAt(G, 'base', pi).length >= 2; } },
    brynhirthundersong: { sim: [0], play: [{ op: 'silence' }] },
    vanguardcaptain: { sim: [0], play: [{ op: 'legionGate' }, { op: 'token', count: 2, ready: false, might: 1, name: 'Recruit', kw: {}, here: true }] },
    // Orianna
    oriannaexquisite: { sim: [1], needsGearHere: true },
    frigidjewel: { sim: [0], secondDrawBonus: true },
    stupefy: { sim: [1], effs: [{ op: 'mightMin1', n: 1, t: T('any') }, { op: 'draw', n: 1 }] },
    theball: { sim: [0, 2, 3, 4], gearPlayFx: [{ op: 'ballFx' }], onGearMove: [{ op: 'ballFx' }] },
    commandattack: { sim: [0, 1, 2], effs: [{ op: 'modal', options: [{ label: 'Move a friendly Deploy gear to a battlefield', effs: [{ op: 'moveDeploy' }] }, { label: 'Look at the top 5: reveal a gear and draw it', effs: [{ op: 'tutorTop', n: 5, types: ['Gear'], maxE: 99, maxP: 99 }] }] }] },
    huntingblind: { sim: [0, 1, 2], gearPlayFx: [{ op: 'pullToGear' }], shieldHere: 2 },
    patchedporobot: { sim: [0], play: [{ op: 'drawIfGear', n: 3 }] },
    resplendentrostrum: { sim: [0, 1], gearActs: [{ label: 'Exhaust: draw 1 and channel 1 rune exhausted', effs: [{ op: 'rostrum' }] }], onGearExhaust: [{ op: 'might', n: 3, t: T('friendly') }] },
    // Seraphine
    seraphineinspiring: { sim: [0, 1], drawOnTripleExhaust: true },
    concertposter: { sim: [0, 1], gearPlayFx: [{ op: 'payRecruit' }], gearConquerFx: [{ op: 'payRecruit' }] },
    encore: { sim: [0, 1, 2, 3, 4], effs: [{ op: 'encore' }] },
    eclipse: { sim: [2], effs: [{ op: 'might', n: -4, t: T('any') }, { op: 'predict' }] },
    raucousanthem: { sim: [0], effs: [{ op: 'raucous' }] },
    shadowscall: { sim: [0], effs: [{ op: 'shadowsCall', t: T('friendly', null, { noTemporary: true }) }, { op: 'draw', n: 2 }] }
  });

  /* ---------------- manual abilities: units and Flow ---------------- */
  function canUseUnit(G, pi, uid) {
    var u = G.units.filter(function (x) { return x.uid === uid; })[0], p = G.players[pi];
    if (!u || u.ctrl !== pi || !u.c.P.unitAct) return { ok: false, why: 'No activated ability.' };
    var a = u.c.P.unitAct;
    if (G.winner != null || G.active !== pi) return { ok: false, why: "It's not your turn." };
    if (a.exhaust && u.ex) return { ok: false, why: 'It is exhausted.' };
    if (a.req) { var w = a.req(G, u); if (w) return { ok: false, why: w }; }
    if (!canPay(p, a.energy, a.power, [a.domain])) return { ok: false, why: 'Needs ' + a.energy + ' energy' + (a.power ? ' and ' + a.power + ' ' + a.domain + ' power' : '') + '.' };
    if (a.killFriendly && unitsOf(G, pi).length < 2) return { ok: false, why: 'Needs another friendly unit to kill.' };
    return { ok: true };
  }
  async function useUnit(G, pi, uid) {
    var chk = canUseUnit(G, pi, uid);
    if (!chk.ok) return chk;
    var u = G.units.filter(function (x) { return x.uid === uid; })[0], a = u.c.P.unitAct;
    pay(G, pi, a.energy, a.power, [a.domain]); if (a.exhaust) await exhaustUnits(G, pi, [u]);
    if (a.killFriendly) {
      var others = unitsOf(G, pi).filter(function (x) { return x !== u; });
      var w = others.slice().sort(function (x, y) { return unitValue(x) - unitValue(y); })[0];
      var kid = await ask(G, pi, { type: 'target', title: u.c.name, text: 'Kill a friendly unit to pay the Empower cost', cands: others.map(function (x) { return x.uid; }), optional: false, auto: w.uid });
      var kv = others.filter(function (x) { return x.uid === kid; })[0] || w;
      log(G, u.c.name + ': ' + kv.c.name + ' is killed to pay the cost.', pi);
      await killUnit(G, kv);
    }
    log(G, G.players[pi].name + ' use' + (pi === 0 ? '' : 's') + ' ' + u.c.name + ': ' + a.label + '.', pi);
    await resolveEffects(G, pi, a.effs, { src: u, loc: u.loc, srcName: u.c.name });
    return { ok: true };
  }
  function canFlow(G, pi, iid) {
    var p = G.players[pi], card = p.trash.filter(function (x) { return x.iid === iid; })[0];
    if (!card || !(card.c.P.flow || card.tempFlow)) return { ok: false, why: 'This card has no Flow.' };
    if (G.winner != null || G.active !== pi) return { ok: false, why: "It's not your turn." };
    var f = card.tempFlow || card.c.P.flow;
    if (energyAvail(p) < f.energy || p.runes.length < f.power + (f.energy ? 0 : 0) && anyPowerAvail(p) < f.power) return { ok: false, why: 'Flow costs ' + f.energy + ' energy' + (f.power ? ' + ' + f.power + ' power' : '') + '.' };
    return { ok: true };
  }
  async function playFlow(G, pi, iid) {
    var chk = canFlow(G, pi, iid);
    if (!chk.ok) return chk;
    var p = G.players[pi], card = p.trash.filter(function (x) { return x.iid === iid; })[0], c = card.c, f = card.tempFlow || c.P.flow;
    card.tempFlow = null;
    pay(G, pi, f.energy, 0, []);
    payAnyPower(G, pi, f.power, 'Flow');
    p.trash.splice(p.trash.indexOf(card), 1);
    G.playedThisTurn++;
    log(G, p.name + ' cast' + (pi === 0 ? '' : 's') + ' ' + c.name + ' from the trash (Flow); it will be banished.', pi);
    var sc = p.legend.c && p.legend.c.P.script;
    if (sc && sc.onPlayCard) sc.onPlayCard(G, pi, 'trash');
    var sctx = { src: null, loc: null, srcName: c.name, spell: card, caster: pi };
    if (!(await reactTo(G, opp(pi), sctx, null))) { await resolveEffects(G, pi, c.P.spell, sctx); await fireLegend(G, pi, 'playSpell', {}); }
    if (sctx.countered === 'hand') p.hand.push(card);
    await checkDeaths(G);
    return { ok: true };
  }

  /* ---------------- turn structure ---------------- */
  async function startTurn(G) {
    var pi = G.active, p = G.players[pi];
    p.turns++; G.turnNo++;
    G.players.forEach(function (pl) { pl.scored = {}; pl.drawsTurn = 0; });
    G.playedThisTurn = 0;
    log(G, '— Turn ' + G.turnNo + ': ' + p.name + ' —', pi);
    G.units.forEach(function (u) { if (u.ctrl === pi) u.ex = false; });
    p.runes.forEach(function (r) { r.ex = false; });
    p.gear.forEach(function (g) { g.ex = false; });
    p.legend.exhausted = false; p.legend.used = {};
    G.phase = 'beginning'; G.starSpringUsed = {};
    if (p.gear.some(function (g) { return g.c.P.gutterWin; }) && p.hand.length === 4 && G.units.filter(function (u) { return u.ctrl === pi && u.loc !== 'base'; }).length === 4) {
      G.winner = pi; log(G, '★ Gutter Palace: exactly 4 cards in hand and 4 units at battlefields — ' + p.name + (pi === 0 ? ' win' : ' wins') + '!', pi); return;
    }
    for (var dl = 0; dl < G.bfs.length; dl++) {
      if (bfNorm(G, dl) !== 'duskroselab') continue;
      var mineHere = unitsAt(G, dl, pi);
      if (!mineHere.length) continue;
      var wk = mineHere.slice().sort(function (a, b) { return unitValue(a) - unitValue(b); })[0];
      var kp = await ask(G, pi, { type: 'target', title: 'Dusk Rose Lab', text: 'Kill a unit you control here to draw 1?', cands: mineHere.map(function (x) { return x.uid; }), optional: true, auto: wk.token || wk.reflection ? wk.uid : null });
      var kv = mineHere.filter(function (x) { return x.uid === kp; })[0];
      if (kv) { log(G, 'Dusk Rose Lab: ' + p.name + ' kill' + (pi === 0 ? '' : 's') + ' ' + kv.c.name + ' to draw 1.', pi); await killUnit(G, kv); drawOne(G, pi); }
    }
    var temps = unitsOf(G, pi).filter(function (u) { return kwOf(u).temporary; });
    for (var t = 0; t < temps.length; t++) { log(G, temps[t].c.name + ' (Temporary) dies.', pi); await killUnit(G, temps[t], 'temporary'); }
    await checkDeaths(G);
    for (var bi = 0; bi < G.bfs.length && G.winner == null; bi++) {
      if (G.bfs[bi].ctrl !== pi) continue;
      var op = G.players[opp(pi)];
      op.gear.filter(function (g) { return g.loc === bi; }).forEach(function (g) { op.gear.splice(op.gear.indexOf(g), 1); op.trash.push(g); log(G, g.c.name + ' (Deploy) is killed: ' + p.name + ' holds ' + bfName(G, bi) + '.', opp(pi)); });
      scoreBf(G, pi, bi, 'hold');
      var here = unitsAt(G, bi, pi);
      for (var i = 0; i < here.length; i++) {
        var u = here[i];
        if (kwOf(u).hunt) gainXp(G, pi, kwOf(u).hunt, u.c.name + ' (Hunt, hold)');
        await fireUnit(G, u, 'hold');
      }
      await fireLegend(G, pi, 'hold', { loc: bi });
      await fireLegend(G, pi, 'conquerOrHold', { loc: bi });
      await fireBf(G, pi, bi, 'bfhold');
    }
    if (G.winner != null) return;
    var n = (pi !== G.first && p.turns === 1) ? 3 : 2;
    var got = channel(G, pi, n, false);
    log(G, p.name + ' channel' + (pi === 0 ? '' : 's') + ' ' + got + ' rune' + (got === 1 ? '' : 's') + '.', pi);
    draw(G, pi, 1);
    G.phase = 'main';
    var ls = p.legend.c && p.legend.c.P.script;
    if (ls && ls.mainStart) await ls.mainStart(G, pi);
    await flushPending(G);
  }
  async function endTurn(G) {
    if (G.winner != null) return;
    var pi = G.active;
    if (G.stats) {
      var st = G.stats[pi], pl = G.players[pi];
      st.turns++;
      if (energyAvail(pl) >= 2 && pl.hand.some(function (x) { return canPlay(G, pi, x.iid, false).ok; })) st.unspent++;
      if (G.units.some(function (u) { return u.ctrl === pi && u.loc === 'base' && !u.ex && !u.stun; })) st.idle++;
      if (G.bfs.some(function (b, i) { return b.ctrl !== pi && !unitsAt(G, i, pi).length; }) && !G.units.some(function (u) { return u.ctrl === pi && u.loc !== 'base'; })) st.emptyBfTurns++;
      event(G, { t: 'end', pi: pi, unused: energyAvail(pl),
        playable: pl.hand.filter(function (x) { return canPlay(G, pi, x.iid, false).ok; }).sort(function (a, b) { return (b.c.energy || 0) - (a.c.energy || 0); }).map(function (x) { return x.c.name; }),
        idle: G.units.filter(function (u) { return u.ctrl === pi && u.loc === 'base' && !u.ex && !u.stun; }).map(function (u) { return u.c.name + ' (' + might(u) + ')'; }),
        oppHolds: G.bfs.map(function (b, i) { return b.ctrl === opp(pi) ? bfName(G, i) : null; }).filter(Boolean),
        oppDefenders: G.bfs.map(function (b, i) { return unitsAt(G, i, opp(pi)).reduce(function (s2, u) { return s2 + might(u, 'def'); }, 0); }) });
    }
    G.units.forEach(function (u) {
      u.damage = 0; u.temp = 0; u.tempAssault = 0; u.shrouded = false; u.noMove = false;
      if (u.tempEmpowered) { u.empowered = false; u.tempEmpowered = false; }
      if (u.ctrl === pi && u.stun > 0) u.stun--;
    });
    var ap = G.players[pi];
    var eot = ap.gear.filter(function (g) { return g.c.P.endOfTurn; });
    for (var gi = 0; gi < eot.length && G.winner == null; gi++) await resolveEffects(G, pi, eot[gi].c.P.endOfTurn, { src: null, loc: 'base', srcName: eot[gi].c.name });
    if (G.winner != null) return;
    G.players.forEach(function (pl) { pl.pool = 0; pl.poolPower = 0; pl.poolPowerUG = 0; pl.poolDom = {}; });
    G.units.forEach(function (u) { u.lethal = false; u.damage = 0; });
    if (ap.readyRunesEOT) {
      var rr = ap.runes.filter(function (r) { return r.ex; }).slice(0, ap.readyRunesEOT);
      rr.forEach(function (r) { r.ex = false; });
      log(G, "Targon's Peak: " + ap.name + ' ready' + (pi === 0 ? '' : 'ies') + ' ' + rr.length + ' rune' + (rr.length === 1 ? '' : 's') + '.', pi);
      ap.readyRunesEOT = 0;
    }
    G.players.forEach(function (pl) { pl.trash.forEach(function (x) { x.tempFlow = null; }); });
    G.active = opp(pi);
    if (G.maxTurns && G.turnNo >= G.maxTurns) { G.winner = -1; log(G, 'Turn limit reached.'); return; }
    await startTurn(G);
  }

  /* ---------------- units ---------------- */
  function unitsOf(G, pi) { return G.units.filter(function (u) { return u.ctrl === pi; }); }
  function makeUnit(G, pi, card, iid, loc, ready, token) {
    var u = { G: G, uid: UID++, iid: iid, c: card, owner: pi, ctrl: pi, loc: loc, ex: !ready, damage: 0, buff: 0, temp: 0, tempAssault: 0, stun: 0, equips: [], token: !!token };
    G.units.push(u);
    return u;
  }
  function tokenCard(e) {
    var kw = {};
    Object.keys(e.kw || {}).forEach(function (k) { kw[k] = e.kw[k]; });
    var text = Object.keys(kw).map(function (k) { return '[' + k[0].toUpperCase() + k.slice(1) + (kw[k] === true ? '' : ' ' + kw[k]) + ']'; }).join(' ');
    return { name: e.name, type: 'Unit', supertype: 'Token', domain: ['Colorless'], energy: 0, might: e.might, power: 0, rich: text, plain: text, tags: [], P: { lines: text ? [{ text: text, sim: true }] : [], kw: kw, trig: {}, spell: [], legendActs: [], legendTrig: {} } };
  }
  function removeUnit(G, u) {
    var i = G.units.indexOf(u);
    if (i >= 0) G.units.splice(i, 1);
    var owner = G.players[u.owner];
    u.equips.forEach(function (g) { owner.trash.push(g); });
    u.equips = [];
  }
  async function killUnit(G, u, reason) {
    if (G.units.indexOf(u) < 0) return;
    var owner = G.players[u.ctrl];
    var zh = reason !== 'temporary' && !u.token && owner.gear.filter(function (g) { return g.c.P.saveUnit; })[0];
    if (zh) {
      owner.gear.splice(owner.gear.indexOf(zh), 1); owner.trash.push(zh);
      u.loc = 'base'; u.ex = true; u.damage = 0;
      log(G, zh.c.name + ' breaks instead: ' + u.c.name + ' is recalled to base.', u.ctrl);
      updateControl(G);
      return;
    }
    var loc = u.loc;
    removeUnit(G, u);
    if (!u.token) G.players[u.owner].trash.push({ iid: u.iid, c: u.c });
    u.dead = true;
    if (G.stats) G.stats[u.ctrl].unitsLost++;
    if (!u.token && loc !== 'base' && bfNorm(G, loc) === 'blackrosesanctum' && (G.sanctum || {})[u.ctrl] !== G.turnNo) {
      G.sanctum = G.sanctum || {}; G.sanctum[u.ctrl] = G.turnNo;
      makeUnit(G, u.ctrl, tokenCard({ name: 'Recruit', might: 1, kw: {} }), UID++, 'base', false, true);
      log(G, 'Black Rose Sanctum: ' + G.players[u.ctrl].name + ' get' + (u.ctrl === 0 ? '' : 's') + ' a 1 Might Recruit in base.', u.ctrl);
    }
    if (!u.token) event(G, { t: 'died', pi: u.ctrl, name: u.c.name, cost: (u.c.energy || 0) + (u.c.power || 0), inCombat: !!G.combatReport });
    updateControl(G);
    var aloneDeath = loc === 'base' ? !unitsAt(G, 'base', u.ctrl).length : !unitsAt(G, loc, u.ctrl).length;
    // Karthus: your Deathknell effects trigger an additional time.
    var times = 1 + G.units.filter(function (v) { return v.ctrl === u.ctrl && v.c.P.doubleDeathknell; }).length;
    if (u.empowered && u.c.P.empoweredDeathknell) for (var t2 = 0; t2 < times; t2++) await resolveEffects(G, u.ctrl, u.c.P.empoweredDeathknell, { src: null, loc: loc, srcName: u.c.name });
    for (var t = 0; t < times && u.c.P.trig.deathknell; t++) {
      if (t) log(G, 'Karthus: ' + u.c.name + "'s Deathknell triggers again.", u.ctrl);
      await fireTrig(G, u.ctrl, u.c, 'deathknell', { src: null, loc: loc, srcName: u.c.name, diedAlone: aloneDeath });
    }
    if (u.flourish && u.flourish.turn === G.turnNo) addGold(G, u.flourish.pi, 1, 'Deadly Flourish');
    // Pyke, Returned: once each turn, when an enemy unit dies while Pyke is at a battlefield, play a Gold token.
    G.units.forEach(function (v) {
      if (v.ctrl !== u.ctrl && v.loc !== 'base' && v.c.P.goldOnEnemyDeath && v.goldTurn !== G.turnNo) {
        v.goldTurn = G.turnNo; addGold(G, v.ctrl, 1, v.c.name);
      }
    });
  }
  // Deferred triggers that were noticed inside synchronous code (draw-based ones like Frigid Jewel).
  async function flushPending(G) {
    for (var q = 0; q < 2; q++) {
      var p = G.players[q];
      while (p.jewelPending > 0) {
        p.jewelPending--;
        var mine = unitsOf(G, q);
        if (!mine.length) continue;
        var bst = mine.slice().sort(function (a, b) { return might(b) - might(a); })[0];
        var uid = await ask(G, q, { type: 'target', title: 'Frigid Jewel', text: 'Second card drawn this turn: give a friendly unit +2 Might this turn', cands: mine.map(function (u) { return u.uid; }), optional: false, auto: bst.uid });
        var u = mine.filter(function (x) { return x.uid === uid; })[0] || bst;
        u.temp += 2; log(G, 'Frigid Jewel gives ' + u.c.name + ' +2 Might this turn.', q);
      }
    }
  }
  async function checkDeaths(G) {
    await flushPending(G);
    for (var guard = 0; guard < 50; guard++) {
      var dying = G.units.filter(function (u) { return u.damage > 0 && (u.damage >= might(u) || u.lethal || G.decreeTurn === G.turnNo); });
      if (!dying.length) break;
      for (var i = 0; i < dying.length; i++) { log(G, dying[i].c.name + ' dies.', dying[i].ctrl); await killUnit(G, dying[i]); }
    }
  }
  function updateControl(G) {
    G.bfs.forEach(function (b, i) {
      if (b.ctrl != null && !unitsAt(G, i, b.ctrl).length) b.ctrl = null;
    });
    checkHidden(G);
  }

  /* ---------------- triggers & effects ---------------- */
  async function fireTrig(G, pi, card, ev, ctx) {
    var list = card.P && card.P.trig[ev];
    if (!list) return;
    for (var i = 0; i < list.length && G.winner == null; i++) await resolveEffects(G, pi, list[i].effs, Object.assign({ srcName: card.name }, ctx));
  }
  async function fireUnit(G, u, ev) {
    if (u.dead) return;
    await fireTrig(G, u.ctrl, u.c, ev, { src: u, loc: u.loc, srcName: u.c.name });
  }
  async function fireLegend(G, pi, ev, ctx) {
    var L = G.players[pi].legend;
    if (!L.c || G.winner != null) return;
    var list = L.c.P.legendTrig[ev] || [];
    for (var i = 0; i < list.length && G.winner == null; i++) {
      var t = list[i];
      if (t.once) {
        if (L.exhausted) continue;
        if (!(await confirm(G, pi, L.c.name, 'Exhaust ' + L.c.name + ' to: ' + describeEffects(t.effs) + '?', true))) continue;
        L.exhausted = true;
      }
      await resolveEffects(G, pi, t.effs, Object.assign({ srcName: L.c.name }, ctx || {}));
    }
    var sc = L.c.P.script;
    if (sc && sc.on && sc.on[ev]) await sc.on[ev](G, pi, ctx || {});
  }
  async function fireBf(G, pi, bi, ev) { await fireTrig(G, pi, G.bfs[bi].c, ev, { src: null, loc: bi, srcName: bfName(G, bi) }); }

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
      if (t.where === 'inbase' && u.loc !== 'base') return false;
      if (t.where === 'here' && (ctx.loc == null || u.loc !== ctx.loc)) return false;
      if (t.maxMight != null && might(u) > t.maxMight) return false;
      if (t.minMight != null && might(u) < t.minMight) return false;
      if (t.where === 'itloc' && (!ctx.it || u.loc !== ctx.it.loc)) return false;
      if (t.notHere && ctx.src && u.loc === ctx.src.loc) return false;
      if (t.noTemporary && kwOf(u).temporary) return false;
      if (t.notIt && ctx.it && u === ctx.it) return false;
      if (t.attacking && u.loc === 'base') return false;
      if (u.ctrl !== pi && u.shrouded) return false;
      if (u.ctrl !== pi && u.c.P.untargetable === 'always') return false;
      if (u.ctrl !== pi && u.c.P.untargetable === 'outOfCombat' && G.showdownAt !== u.loc) return false;
      if (u.ctrl !== pi && kwOf(u).deflect && anyPowerAvail(p) - (ctx.reserveRunes || 0) < 1) return false;
      return true;
    });
  }
  // Heuristic target choice used by the AI and as the suggested default.
  function autoChoose(G, pi, e, cands) {
    if (!cands.length) return null;
    var enemies = cands.filter(function (u) { return u.ctrl !== pi; });
    var friends = cands.filter(function (u) { return u.ctrl === pi; });
    var best = function (arr, f) { return arr.slice().sort(function (a, b) { return f(b) - f(a); })[0] || null; };
    if (e.selfOk) return friends.slice().sort(function (a, b) { return unitValue(a) - unitValue(b); })[0] || null;
    if (e.op === 'pull') return enemies.slice().sort(function (a, b) { return might(a) - might(b); })[0] || null;
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
    if (e.op === 'assault') { var rd = friends.filter(function (u) { return !u.ex && u.loc === 'base'; }); return best(rd.length ? rd : friends, function (u) { return might(u); }); }
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
      case 'assault': return 'Give ' + T + ' [Assault ' + e.n + '] this turn';
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
  function describeEffects(effs) { return effs.map(describeEffect).join(', then '); }

  // Resolve a list of effects. ctx.targets is an optional queue of pre-chosen uids (null = skip) for single-target effects.
  async function resolveEffects(G, pi, effs, ctx) {
    ctx = ctx || {};
    var p = G.players[pi], it = null, queue = ctx.targets ? ctx.targets.slice() : null, src = ctx.srcName || 'Effect';
    for (var i = 0; i < effs.length && G.winner == null && !ctx.countered && !ctx.stop; i++) {
      var e = effs[i], tg = [];
      ctx.it = it;
      var pre = needsChoice(e) && queue && queue.length;
      if (e.opt && !needsChoice(e) && !(await confirm(G, pi, src, (e.gate ? describeEffect(e) + ' to: ' + describeEffects(effs.slice(i + 1)) : describeEffect(e)) + '?', e.op !== 'discard' && (!e.gate || aiGateOk(G, pi, e))))) { log(G, src + ': declined.', pi); if (e.gate) break; continue; }
      if (e.t) {
        if (e.t.sel === 'self') { if (ctx.src && !ctx.src.dead) tg = [ctx.src]; }
        else if (e.t.sel === 'it') { if (it && !it.dead) tg = [it]; }
        else if (e.t.sel === 'allEnemyHere') tg = ctx.loc == null ? [] : unitsAt(G, ctx.loc, opp(pi));
        else if (e.t.sel === 'otherFriendlyHere') tg = ctx.loc == null ? [] : unitsAt(G, ctx.loc, pi).filter(function (u) { return u !== ctx.src; });
        else {
          var cands = candidates(G, pi, e, ctx), pick = null;
          if (pre) {
            var want = queue.shift();
            pick = cands.filter(function (u) { return u.uid === want; })[0] || null;
          } else if (cands.length) {
            var sug = autoChoose(G, pi, e, cands);
            var uid = await ask(G, pi, { type: 'target', title: src, text: describeEffect(e), cands: cands.map(function (u) { return u.uid; }), optional: !!e.opt || !sug, auto: sug ? sug.uid : null });
            pick = cands.filter(function (u) { return u.uid === uid && !u.dead; })[0] || null;
          }
          if (pick && pick.ctrl !== pi && kwOf(pick).deflect) {
            if (!anyPowerAvail(p)) pick = null;
            else { payAnyPower(G, pi, 1, 'Deflect'); log(G, p.name + ' pay' + (pi === 0 ? '' : 's') + ' 1 power to target ' + pick.c.name + ' (Deflect).', pi); }
          }
          if (pick) {
            tg = [pick];
            var sc = p.legend.c && p.legend.c.P.script;
            if (pick.ctrl === pi && sc && sc.onChoose) await sc.onChoose(G, pi, pick);
            if (pick.ctrl === pi && pick.c.P.onChosenOrReady) { pick.temp += 1; log(G, pick.c.name + ' is chosen: +1 Might this turn.', pi); }
            if (pick.ctrl !== pi && !ctx.noReact && await reactTo(G, opp(pi), ctx, pick)) { ctx.countered = true; break; }
          }
        }
        if (tg.length) it = tg[tg.length - 1];
        if (!tg.length) { log(G, src + ': ' + describeEffect(e) + ' — no target.', pi); event(G, { t: 'fizzle', pi: pi, src: src, what: describeEffect(e), spell: !!ctx.spell }); continue; }
      }
      await applyEffect(G, pi, e, tg, ctx);
      if (tg.length) it = tg[tg.length - 1];
      await checkDeaths(G);
    }
  }
  async function applyEffect(G, pi, e, tg, ctx) {
    var p = G.players[pi], src = ctx.srcName || 'Effect', names = tg.map(function (u) { return u.c.name; }).join(', ');
    switch (e.op) {
      case 'draw': log(G, src + ': draw ' + e.n + '.', pi); for (var i = 0; i < e.n; i++) drawOne(G, pi); break;
      case 'deal': tg.forEach(function (u) { var b = voidBonus(G, u); u.damage += e.n + b; if (u.ctrl !== pi && hasLethal(G, pi)) u.lethal = true; log(G, src + ' deals ' + (e.n + b) + ' to ' + u.c.name + (b ? ' (Void Gate +1)' : '') + '.', pi); }); break;
      case 'kill':
        log(G, src + ' kills ' + names + '.', pi);
        ctx.killedMight = tg.length ? might(tg[0]) : 0; ctx.killedCtrl = tg.length ? tg[0].ctrl : null;
        for (var k0 = 0; k0 < tg.length; k0++) await killUnit(G, tg[k0]);
        break;
      case 'stun': tg.forEach(function (u) { u.stun = G.active === u.ctrl ? 2 : 1; }); log(G, src + ' stuns ' + names + '.', pi); break;
      case 'buff': tg.forEach(function (u) { if (!u.buff) u.buff = 1; }); log(G, src + ' buffs ' + names + '.', pi); break;
      case 'might': tg.forEach(function (u) { u.temp += e.n; }); log(G, src + ' gives ' + names + ' ' + (e.n > 0 ? '+' : '') + e.n + ' Might this turn.', pi); break;
      case 'assault': tg.forEach(function (u) { u.tempAssault = (u.tempAssault || 0) + e.n; }); log(G, src + ' gives ' + names + ' Assault ' + e.n + ' this turn.', pi); break;
      case 'ready': tg.forEach(function (u) { u.ex = false; if (u.c.P.onChosenOrReady) { u.temp += 1; log(G, u.c.name + ' gets +1 Might this turn.', u.ctrl); } }); log(G, src + ' readies ' + names + '.', pi); break;
      case 'tobase': tg.forEach(function (u) { u.loc = 'base'; }); updateControl(G); log(G, src + ' sends ' + names + ' to base.', pi); break;
      case 'tohand':
        tg.forEach(function (u) { removeUnit(G, u); if (!u.token) G.players[u.owner].hand.push({ iid: u.iid, c: u.c }); u.dead = true; });
        updateControl(G); log(G, src + ' returns ' + names + ' to hand.', pi); break;
      case 'channel': var got = channel(G, pi, e.n, !e.ready); log(G, src + ': channel ' + got + ' rune' + (got === 1 ? '' : 's') + ' exhausted.', pi); break;
      case 'xp': gainXp(G, pi, e.n, src); break;
      case 'token':
        var loc = e.here && ctx.loc != null ? ctx.loc : 'base';
        for (var k = 0; k < e.count; k++) makeUnit(G, pi, tokenCard(e), UID++, loc, e.ready, true);
        log(G, src + ': ' + e.count + '× ' + e.might + ' Might ' + e.name + ' token' + (e.count > 1 ? 's' : '') + ' at ' + locName(G, loc) + '.', pi); break;
      case 'discard':
        for (var d = 0; d < e.n && p.hand.length; d++) {
          var worst = p.hand.slice().sort(function (a, b) { return (a.c.energy || 0) - (b.c.energy || 0); })[0];
          var di = await choose(G, pi, src, 'Choose a card to discard', p.hand.map(function (x) { return x.c.name; }), false, p.hand.indexOf(worst));
          if (di != null && p.hand[di]) worst = p.hand[di];
          p.hand.splice(p.hand.indexOf(worst), 1); p.trash.push(worst);
          log(G, p.name + ' discard' + (pi === 0 ? '' : 's') + ' ' + worst.c.name + '.', pi);
        }
        break;
      case 'score': addPoints(G, pi, e.n, src); break;
      default: if (OPS[e.op]) await OPS[e.op](G, pi, e, tg, ctx);
    }
  }

  /* ---------------- playing cards ---------------- */
  function findInHand(p, iid) {
    for (var i = 0; i < p.hand.length; i++) if (p.hand[i].iid === iid) return { card: p.hand[i], from: 'hand', idx: i };
    if (p.champion && p.champion.iid === iid) return { card: p.champion, from: 'champion' };
    for (var j = 0; j < p.hidden.length; j++) if (p.hidden[j].card.iid === iid) return { card: p.hidden[j].card, from: 'hidden', loc: p.hidden[j].loc, h: p.hidden[j] };
    return null;
  }
  function playEffects(c) {
    if (c.type === 'Spell') return c.P.spell;
    return (c.P.trig.play || []).reduce(function (a, t) { return a.concat(t.effs); }, []);
  }
  // opts.reaction: playing during the opponent's turn or a showdown (needs [Reaction], [Action] in a showdown, or a hidden card).
  function canPlay(G, pi, iid, accel, opts) {
    opts = opts || {};
    if (G.winner != null) return { ok: false, why: 'The game is over.' };
    var p = G.players[pi], f = findInHand(p, iid);
    if (!f) return { ok: false, why: 'Card not found.' };
    var c = f.card.c;
    if (f.from === 'hidden' && f.h.turn === G.turnNo) return { ok: false, why: 'You hid this card this turn; you can play it from a later turn on.' };
    if (G.active !== pi || opts.reaction) {
      var timing = f.from === 'hidden' || c.P.kw.reaction || (opts.reaction && (c.P.kw.action || c.P.kw.ambush));
      if (!opts.reaction || !timing) return { ok: false, why: "It's not your turn." };
    }
    if (c.type === 'Battlefield' || c.type === 'Legend') return { ok: false, why: "This card can't be played." };
    if (accel && !(c.P.kw.accelerate && c.type === 'Unit')) return { ok: false, why: "This card doesn't have Accelerate." };
    if (c.P.counter) return { ok: false, why: 'Counters are reactions: when the opponent casts a spell you can counter, you\'ll be asked whether to use this.' };
    if (c.P.requires) { var rw = c.P.requires(G, pi); if (rw) return { ok: false, why: rw }; }
    if (G.silence && G.silence.pi === pi && G.silence.turn === G.turnNo) return { ok: false, why: "Brynhir Thundersong: you can't play cards this turn." };
    var tloc = opts.loc != null ? opts.loc : opts.roost != null ? opts.roost : f.from === 'hidden' ? f.loc : opts.showdown;
    if (c.type === 'Unit' && tloc != null && tloc !== 'base' && bfNorm(G, tloc) === 'rockfallpath') return { ok: false, why: "Units can't be played to Rockfall Path." };
    if (c.P.kw.deploy && !deploySpots(G, pi).length) return { ok: false, why: 'Deploy: play this only to a battlefield (you need one to play it to).' };
    if (opts.seraphine && !seraphineReady(G, pi)) return { ok: false, why: 'Seraphine needs to be ready and you need three ready friendly units.' };
    p.payingUnitOrGear = c.type === 'Unit' || c.type === 'Gear';
    var cost = cardCost(c, accel, G, pi, f.from);
    if (opts.seraphine) cost.energy = Math.max(0, cost.energy - 2);
    var ready = energyAvail(p);
    if (ready < cost.energy) return { ok: false, why: 'Needs ' + cost.energy + ' energy; you have ' + ready + ' ready rune' + (ready === 1 ? '' : 's') + '.' };
    if (!canPay(p, cost.energy, cost.power, cost.domains)) return { ok: false, why: 'Needs ' + cost.power + ' ' + cost.domains.join('/') + ' power.' };
    var xa = extraAnyPower(G, pi, c, opts);
    if (xa && anyPowerAvail(p) - cost.power < xa) return { ok: false, why: 'Needs ' + xa + ' more power of any domain' + (opts.roost != null ? ' for Dragon Roost' : ' (Mystic Vortex)') + '.' };
    return { ok: true };
  }
  // Extra "rainbow" power some plays need: Mystic Vortex reactions in a showdown there, or a Dragon played to Dragon Roost.
  function extraAnyPower(G, pi, c, opts) {
    var n = 0;
    if (opts.showdown != null && norm(G.bfs[opts.showdown].c.name) === 'mysticvortex' && (c.P.kw.reaction || c.P.kw.hidden)) n += 1;
    if (opts.roost != null) n += 2;
    return n;
  }
  function roostSpots(G, pi, c) {
    if (c.type !== 'Unit' || (c.tags || []).indexOf('Dragon') < 0) return [];
    return G.bfs.map(function (b, i) { return i; }).filter(function (i) { return norm(G.bfs[i].c.name) === 'dragonroost'; });
  }
  function hasLethal(G, pi) { return G.units.some(function (u) { return u.ctrl === pi && u.c.P.lethalDamage; }); }
  // "Ready something besides me that's exhausted": a unit, gear, your legend or a rune.
  async function readySomething(G, pi, src) {
    var p = G.players[pi], opts2 = [];
    G.units.forEach(function (u) { if (u.ctrl === pi && u.ex && u !== src) opts2.push({ label: u.c.name + ' (unit)', fn: function () { u.ex = false; } }); });
    p.gear.forEach(function (g) { if (g.ex && !g.token) opts2.push({ label: g.c.name + ' (gear)', fn: function () { g.ex = false; } }); });
    if (p.legend.exhausted) opts2.push({ label: p.legend.c.name + ' (legend)', fn: function () { p.legend.exhausted = false; } });
    var exr = p.runes.filter(function (r) { return r.ex; })[0];
    if (exr) opts2.push({ label: 'A ' + exr.d + ' rune', fn: function () { exr.ex = false; } });
    if (!opts2.length) return;
    var k = await choose(G, pi, src.c.name, 'Ready something besides me that\'s exhausted?', opts2.map(function (o) { return o.label; }), true, exr ? opts2.length - 1 : 0);
    if (k == null) return;
    opts2[k].fn(); log(G, src.c.name + ' readies ' + opts2[k].label + '.', pi);
  }
  function legendActs(G, pi) { var L = G.players[pi].legend; return (L.c && L.c.P.legendActs) || []; }
  function actEffects(G, pi, act) { return act.getEffs ? act.getEffs(G, pi, G.players[pi].legend) : act.effs; }
  // Single-target choices a play will ask for, in order. Returns [{e, cands}]
  function targetSlots(G, pi, c, opts) {
    opts = opts || {};
    var effs = opts.act != null ? actEffects(G, pi, legendActs(G, pi)[opts.act]) : playEffects(c);
    var ctx = { src: null, loc: opts.loc != null ? opts.loc : (c && c.type === 'Unit' ? 'base' : null), reserveRunes: (c && c.power) || 0 };
    return effs.filter(needsChoice).map(function (e) { return { e: e, cands: candidates(G, pi, e, ctx) }; });
  }
  function ambushSpots(G, pi, c) {
    if (c.type !== 'Unit' || !c.P.kw.ambush) return [];
    return G.bfs.map(function (b, i) { return i; }).filter(function (i) {
      if (bfNorm(G, i) === 'rockfallpath') return false;
      if (c.P.ambushAnywhere && unitsAt(G, i, opp(pi)).length) return true; // Rengar: may be played where there are enemy units
      return unitsAt(G, i, pi).length > 0 && !unitsAt(G, i, opp(pi)).length;
    });
  }
  // opts: {accel, targets:[uid|null], loc:'base'|bfIndex}
  async function playCard(G, pi, iid, opts) {
    opts = opts || {};
    var chk = canPlay(G, pi, iid, opts.accel, opts);
    if (!chk.ok) return chk;
    var p = G.players[pi], f = findInHand(p, iid), card = f.card, c = card.c;
    var cost = cardCost(c, opts.accel, G, pi, f.from);
    if (opts.seraphine) {
      cost.energy = Math.max(0, cost.energy - 2);
      p.legend.exhausted = true;
      var three = await pickUnits(G, pi, 'Seraphine', 'Exhaust a ready friendly unit', unitsOf(G, pi).filter(function (u) { return !u.ex; }), 3, function (left) { return left.slice().sort(function (a, b) { return unitValue(a) - unitValue(b); })[0]; });
      log(G, 'Seraphine: exhaust the legend and ' + three.map(function (u) { return u.c.name; }).join(', ') + ' to make ' + c.name + ' cost 2 less.', pi);
      await exhaustUnits(G, pi, three);
    }
    p.payingUnitOrGear = c.type === 'Unit' || c.type === 'Gear';
    pay(G, pi, cost.energy, cost.power, cost.domains);
    p.payingUnitOrGear = false;
    var extraAny = extraAnyPower(G, pi, c, opts);
    payAnyPower(G, pi, extraAny, 'extra cost');
    if (p.discountNext && p.discountNext.turn === G.turnNo) { p.discountNext = null; log(G, 'Astral Heron discount used on ' + c.name + '.', pi); }
    if (f.from === 'hand') p.hand.splice(p.hand.indexOf(card), 1);
    else if (f.from === 'hidden') {
      p.hidden.splice(p.hidden.indexOf(f.h), 1); log(G, p.name + ' reveal' + (pi === 0 ? '' : 's') + ' a hidden card at ' + bfName(G, f.loc) + ': ' + c.name + '.', pi);
      if (p.legend.c && p.legend.c.P.faceDownDraw && p.legend.fdTurn !== G.turnNo) {
        p.legend.fdTurn = G.turnNo; drawOne(G, pi); log(G, p.legend.c.name + ': draw 1 for playing from face down.', pi);
        if (G.active !== pi) await applyEffect(G, pi, { op: 'discard', n: 1 }, [], { srcName: p.legend.c.name });
      }
    }
    else p.champion = null;
    G.playedThisTurn++;
    if (G.stats) G.stats[pi].played++;
    if (G.playedThisTurn === 1 && G.active === pi && G.units.some(function (u) { return u.ctrl === pi && u.loc !== 'base' && u.c.P.heronDiscount; })) {
      p.discountNext = { turn: G.turnNo, energy: 2, power: 2 };
      log(G, 'Astral Heron: your next card this turn costs 2 energy and 2 power less.', pi);
    }
    var firstGear = false;
    if (c.type === 'Gear' && c.supertype !== 'Token') { firstGear = p.gearTurn !== G.turnNo; p.gearTurn = G.turnNo; }
    if (c.type === 'Gear' && c.P.equip) p.equipTurn = G.turnNo;
    var sc = p.legend.c && p.legend.c.P.script;
    var hereLoc = f.from === 'hidden' ? f.loc : opts.showdown != null ? opts.showdown : null;
    await secondCardTriggers(G, pi);
    if (c.type === 'Unit') {
      var loc = opts.roost != null ? opts.roost : opts.loc != null ? opts.loc : hereLoc != null ? hereLoc : 'base';
      if (opts.roost != null) log(G, 'Dragon Roost: ' + c.name + ' is played to ' + bfName(G, loc) + '.', pi);
      var readyNow = !!opts.accel || !!c.P.kw.entersready || (c.P.entersReadyIf && c.P.entersReadyIf(G, pi)) ||
        (loc !== 'base' && G.bfs[loc].ctrl === pi && p.legend.c && p.legend.c.P.readyAtControlled);
      var u = makeUnit(G, pi, c, card.iid, loc, readyNow, false);
      if (loc !== 'base') { p.toBfTurn = G.turnNo; await rakelstake(G, pi, loc); }
      log(G, p.name + ' play' + (pi === 0 ? '' : 's') + ' ' + c.name + (loc !== 'base' ? ' to ' + bfName(G, loc) : '') + (u.ex ? '' : ' (ready)') + '.', pi);
      await unitEntered(G, pi, u, f.from);
      if (sc && sc.onPlayCard) sc.onPlayCard(G, pi, f.from);
      await fireLegend(G, pi, 'playUnit', { loc: loc });
      await resolveEffects(G, pi, playEffects(c), { src: u, loc: loc, targets: opts.targets, srcName: c.name, card: card });
      if (f.from === 'hidden') await fireTrig(G, pi, c, 'playHidden', { src: u, loc: loc, srcName: c.name });
      if (loc !== 'base' && c.P.playToBf && !u.dead) await resolveEffects(G, pi, c.P.playToBf, { src: u, loc: loc, srcName: c.name });
      // Played onto a battlefield with enemies outside a showdown (Rengar, Trophy Hunter): it attacks.
      if (loc !== 'base' && opts.showdown == null && !u.dead && G.winner == null && unitsAt(G, loc, opp(pi)).length) await combat(G, pi, loc, [u], unitsAt(G, loc, opp(pi)));
      else if (loc !== 'base' && !u.dead && G.bfs[loc].ctrl == null && !unitsAt(G, loc, opp(pi)).length) { G.bfs[loc].ctrl = pi; log(G, p.name + ' take' + (pi === 0 ? '' : 's') + ' control of ' + bfName(G, loc) + ' (played there, not a conquer).', pi); }
    } else if (c.type === 'Spell') {
      log(G, p.name + ' cast' + (pi === 0 ? '' : 's') + ' ' + c.name + '.', pi);
      if (sc && sc.onPlayCard) sc.onPlayCard(G, pi, f.from);
      var sctx = { src: null, loc: hereLoc, targets: opts.targets, srcName: c.name, spell: card, caster: pi, fromHand: f.from === 'hand' };
      if (await reactTo(G, opp(pi), sctx, null)) sctx.countered = true;
      else {
        await resolveEffects(G, pi, c.P.spell, sctx);
        var rp = c.P.repeat, rpE = rp && (rp.energy != null ? rp.energy : rp), rpP = rp && rp.power || 0, rpD = rp && rp.domain ? [rp.domain] : [];
        if (rp && !sctx.countered && G.winner == null && canPay(p, rpE, rpP, rpD) &&
            (await confirm(G, pi, c.name, 'Pay ' + rpE + ' energy' + (rpP ? ' + ' + rpP + ' ' + rp.domain + ' power' : '') + ' to repeat ' + c.name + '?', evalEffects(G, pi, c.P.spell, { src: null, loc: null }).value >= 1.5))) {
          pay(G, pi, rpE, rpP, rpD); log(G, p.name + ' repeat' + (pi === 0 ? '' : 's') + ' ' + c.name + '.', pi);
          await resolveEffects(G, pi, c.P.spell, { src: null, loc: null, srcName: c.name, noReact: true });
        }
      }
      if (sctx.countered === 'hand') p.hand.push(card); else p.trash.push(card);
      if (!sctx.countered) { await fireLegend(G, pi, 'playSpell', {}); await spellPlayedHooks(G, pi); }
    } else if (c.type === 'Gear') {
      log(G, p.name + ' play' + (pi === 0 ? '' : 's') + ' ' + c.name + '.', pi);
      if (sc && sc.onPlayCard) sc.onPlayCard(G, pi, f.from);
      var gobj = { iid: card.iid, c: c, ex: !!c.P.entersExhausted, loc: 'base' };
      if (c.P.kw.deploy) {
        var ds = deploySpots(G, pi);
        var dk = await choose(G, pi, c.name, 'Deploy to which battlefield?', ds.map(function (i) { return bfName(G, i); }), false, Math.max(0, ds.indexOf(ds.filter(function (i) { return G.bfs[i].ctrl === pi; })[0])));
        gobj.loc = ds[dk || 0]; log(G, c.name + ' is deployed to ' + bfName(G, gobj.loc) + '.', pi);
        p.toBfTurn = G.turnNo; await rakelstake(G, pi, gobj.loc);
      }
      p.gear.push(gobj);
      if (c.P.kw.quickdraw && unitsOf(G, pi).length) {
        var qh = unitsOf(G, pi).sort(function (a, b) { return might(b) - might(a); });
        var qid = await ask(G, pi, { type: 'target', title: c.name, text: 'Quick-Draw: attach to which unit? (+' + c.P.equipBonus + ' Might)', cands: qh.map(function (u) { return u.uid; }), optional: false, auto: qh[0].uid });
        var qu = qh.filter(function (u) { return u.uid === qid; })[0] || qh[0];
        p.gear.splice(p.gear.indexOf(gobj), 1); qu.equips.push(gobj); log(G, c.name + ' attaches to ' + qu.c.name + ' (Quick-Draw).', pi);
      }
      if (firstGear) { var invs = unitsOf(G, pi).filter(function (u) { return u.c.P.readyOnGear; }); for (var ivi = 0; ivi < invs.length; ivi++) await readySomething(G, pi, invs[ivi]); }
      if (f.from === 'hidden' && c.P.attachFromHidden) {
        var hostHere = unitsAt(G, f.loc, pi);
        if (hostHere.length) {
          var ahid = await ask(G, pi, { type: 'target', title: c.name, text: 'Attach to a unit you control here', cands: hostHere.map(function (u) { return u.uid; }), optional: false, auto: hostHere[0].uid });
          var ah = hostHere.filter(function (u) { return u.uid === ahid; })[0] || hostHere[0];
          p.gear.splice(p.gear.indexOf(gobj), 1); ah.equips.push(gobj); log(G, c.name + ' attaches to ' + ah.c.name + ' from face down.', pi);
        }
      }
      if (c.P.equip && p.gear.indexOf(gobj) >= 0 && canEquip(G, pi, gobj).ok && (await confirm(G, pi, c.name, 'Pay the Equip cost (' + equipCostText(c) + ') to attach ' + c.name + ' now?', true))) await equipGear(G, pi, gobj);
      await resolveEffects(G, pi, playEffects(c), { src: null, loc: 'base', targets: opts.targets, srcName: c.name });
      if (c.P.gearPlayFx) await resolveEffects(G, pi, c.P.gearPlayFx, { src: null, loc: gobj.loc, gearLoc: gobj.loc, srcName: c.name, card: card });
    }
    await checkDeaths(G);
    return { ok: true };
  }
  // opts.showdown: during a showdown (either player's turn) only [Action]/[Reaction] abilities can be used.
  function canUseLegend(G, pi, idx, opts) {
    opts = opts || {};
    var p = G.players[pi], L = p.legend, acts = legendActs(G, pi);
    if (G.winner != null) return { ok: false, why: 'The game is over.' };
    if (idx == null) {
      for (var i = 0; i < acts.length; i++) if (canUseLegend(G, pi, i, opts).ok) return { ok: true };
      return { ok: false, why: acts.length ? 'No ability is usable right now.' : 'This legend has no activated ability.' };
    }
    var a = acts[idx];
    if (!a) return { ok: false, why: 'No such ability.' };
    if ((G.active !== pi || opts.showdown != null) && !a.timing) return { ok: false, why: G.active !== pi ? "It's not your turn (this ability isn't an Action or Reaction)." : 'Only [Action] or [Reaction] abilities can be used in a showdown.' };
    if (G.active !== pi && a.timing === 'action' && opts.showdown == null) return { ok: false, why: '[Action] abilities can be used on your turn or in a showdown.' };
    if (a.exhaust && L.exhausted) return { ok: false, why: 'Your legend is exhausted.' };
    if (L.used[idx]) return { ok: false, why: 'Already used this turn.' };
    if (a.req) { var why = a.req(G, pi, L); if (why) return { ok: false, why: why }; }
    var ready = energyAvail(p);
    if (ready < (a.energy || 0)) return { ok: false, why: 'Needs ' + a.energy + ' energy.' };
    if (a.power && anyPowerAvail(p) < a.power) return { ok: false, why: 'Needs ' + a.power + ' power.' };
    return { ok: true };
  }
  async function useLegend(G, pi, idx, targets, opts) {
    opts = opts || {};
    var chk = canUseLegend(G, pi, idx, opts);
    if (!chk.ok) return chk;
    var p = G.players[pi], L = p.legend, a = legendActs(G, pi)[idx];
    var effs = actEffects(G, pi, a);
    pay(G, pi, a.energy || 0, 0, []);
    payAnyPower(G, pi, a.power || 0, L.c.name);
    if (a.exhaust) { L.exhausted = true; L.used[idx] = true; }
    log(G, p.name + ' use' + (pi === 0 ? '' : 's') + ' ' + L.c.name + ': ' + a.label + '.', pi);
    if (a.pay) a.pay(G, pi, L);
    await resolveEffects(G, pi, effs, { src: null, loc: opts.showdown != null ? opts.showdown : null, targets: targets, srcName: L.c.name, showdown: opts.showdown });
    return { ok: true };
  }

  /* ---------------- movement & combat ---------------- */
  function canMove(G, u, dest) {
    if (G.winner != null || u.ctrl !== G.active || u.ex || u.dead || dest === u.loc || u.noMove) return false;
    if (u.loc === 'base' || dest === 'base') return true;
    return !!kwOf(u).ganking || bfNorm(G, u.loc) === 'windswepthillock';
  }
  async function moveUnits(G, pi, uids, dest) {
    var movers = G.units.filter(function (u) { return uids.indexOf(u.uid) >= 0 && u.ctrl === pi && canMove(G, u, dest); });
    if (!movers.length) return { ok: false, why: 'No unit can move there.' };
    movers.forEach(function (u) { leaveBonus(G, u); u.loc = dest; });
    await exhaustUnits(G, pi, movers);
    log(G, G.players[pi].name + ' move' + (pi === 0 ? '' : 's') + ' ' + movers.map(function (u) { return u.c.name; }).join(', ') + ' to ' + locName(G, dest) + '.', pi);
    updateControl(G);
    for (var i = 0; i < movers.length; i++) { await fireUnit(G, movers[i], 'move'); if (dest !== 'base') await fireUnit(G, movers[i], 'moveBf'); }
    if (dest !== 'base' && G.winner == null) {
      var here = movers.filter(function (u) { return !u.dead && u.loc === dest; });
      var enemies = unitsAt(G, dest, opp(pi));
      if (here.length && enemies.length) await combat(G, pi, dest, here, enemies);
      else if (here.length && G.bfs[dest].ctrl !== pi) await conquer(G, pi, dest, here);
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
  async function combat(G, pi, bi, attackers, defenders) {
    var A = G.players[pi], D = G.players[opp(pi)], i;
    var rep0 = { bf: bfName(G, bi), attacker: pi, ptsBefore: [G.players[0].points, G.players[1].points], played: [[], []],
      couldPlay: [0, 1].map(function (q) { return showdownOptions(G, q, bi).filter(function (o) { return combatRelevant(o.card.c); }).map(function (o) { return o.card.c.name; }); }) };
    // Might snapshot at the start, used if the fight ends before damage (e.g. all defenders removed in the showdown).
    rep0.pre = [[attackers, pi, 'att'], [defenders, opp(pi), 'def']].map(function (sd) {
      var us = sd[0].map(function (u) { return { u: u, name: u.c.name, might: dealsDamage(u) ? might(u, sd[2]) : 0, stunned: !dealsDamage(u), taken: 0 }; });
      return { pi: sd[1], role: sd[2], total: us.reduce(function (s2, x) { return s2 + x.might; }, 0), units: us };
    });
    try { await combatInner(G, pi, bi, attackers, defenders, rep0); }
    finally {
      G.combatReport = null;
      if (rep0.result) {
        if (!rep0.sides) rep0.sides = rep0.pre;
        rep0.ptsAfter = [G.players[0].points, G.players[1].points];
        rep0.sides.forEach(function (sd) { sd.units.forEach(function (x) { x.died = !!x.u.dead; x.cost = (x.u.c.energy || 0) + (x.u.c.power || 0); delete x.u; }); });
        event(G, Object.assign({ t: 'combat' }, rep0));
        if (G.ask && G.human >= 0) await ask(G, G.human, { type: 'combat', report: rep0, auto: true });
      }
    }
  }
  // Cards worth mentioning as a missed showdown play: units (Ambush/hidden) or spells that change a fight.
  var FIGHT_OPS = { might: 1, assault: 1, stun: 1, deal: 1, kill: 1, tobase: 1, tohand: 1, dread: 1, swapIt: 1, fight: 1, engarde: 1, shroud: 1, buff: 1, multiDeal: 1, dealAllBf: 1 };
  function combatRelevant(c) {
    if (c.type === 'Unit') return true;
    return (c.P.spell || []).some(function (e) { return FIGHT_OPS[e.op] && !(e.op === 'might' && e.n < 0 && e.t && e.t.sel === 'friendly'); });
  }
  // Structured record of key moments, used for the post-game review.
  function event(G, e) { if (!G.events) G.events = []; e.turn = G.turnNo; e.active = G.active; G.events.push(e); }
  async function combatInner(G, pi, bi, attackers, defenders, report) {
    G.combatReport = report;
    var A = G.players[pi], D = G.players[opp(pi)], i;
    log(G, '⚔ Combat at ' + bfName(G, bi) + ': ' + attackers.map(function (u) { return u.c.name; }).join(', ') + ' vs ' + defenders.map(function (u) { return u.c.name; }).join(', ') + '.', pi);
    var bn = norm(G.bfs[bi].c.name);
    if (bn === 'thresholdofthegray') { A.pool = (A.pool || 0) + 1; D.pool = (D.pool || 0) + 1; log(G, 'Threshold of the Gray: both players add 1 energy.', pi); }
    for (i = 0; i < attackers.length; i++) {
      await fireUnit(G, attackers[i], 'attack');
      var dz = kwOf(attackers[i]).disarm;
      if (dz && !attackers[i].dead) {
        var foes = unitsAt(G, bi, opp(pi));
        if (foes.length) {
          var bestF = foes.slice().sort(function (a, b) { return might(b, 'def') - might(a, 'def'); })[0];
          var fid = await ask(G, pi, { type: 'target', title: attackers[i].c.name, text: 'Disarm: give an enemy unit here -' + dz + ' Might this turn', cands: foes.map(function (x) { return x.uid; }), optional: false, auto: bestF.uid });
          var fu = foes.filter(function (x) { return x.uid === fid; })[0] || bestF;
          fu.temp -= dz; log(G, attackers[i].c.name + ' disarms ' + fu.c.name + ': -' + dz + ' Might this turn.', pi);
        }
      }
    }
    for (i = 0; i < defenders.length; i++) await fireUnit(G, defenders[i], 'defend');
    if (bn === 'fortifiedposition') {
      var dfs = unitsAt(G, bi, opp(pi));
      if (dfs.length) {
        var fp = await ask(G, opp(pi), { type: 'target', title: 'Fortified Position', text: 'Choose a defending unit to gain [Shield 2] this combat', cands: dfs.map(function (x) { return x.uid; }), optional: false, auto: dfs.slice().sort(function (a, b) { return might(b) - might(a); })[0].uid });
        var fu = dfs.filter(function (x) { return x.uid === fp; })[0] || dfs[0];
        fu.combatShield = 2; log(G, 'Fortified Position: ' + fu.c.name + ' gains Shield 2 this combat.', opp(pi));
      }
    }
    [[attackers, pi], [defenders, opp(pi)]].forEach(function (side) {
      var alone = side[0].filter(function (u) { return !u.dead; });
      if (alone.length !== 1) return;
      G.players[side[1]].gear.forEach(function (g) {
        if (g.c.P.aloneBonus) { alone[0].temp += g.c.P.aloneBonus; log(G, g.c.name + ': ' + alone[0].c.name + ' fights alone, +' + g.c.P.aloneBonus + ' Might.', side[1]); }
      });
    });
    if (G.winner != null) return;
    await showdown(G, pi, bi);
    var att = unitsAt(G, bi, pi), def = unitsAt(G, bi, opp(pi));
    if (G.winner != null) return;
    if (att.length && def.length) {
      var aD = att.reduce(function (s, u) { return s + (dealsDamage(u) ? might(u, 'att') : 0); }, 0);
      var dD = def.reduce(function (s, u) { return s + (dealsDamage(u) ? might(u, 'def') : 0); }, 0);
      log(G, A.name + ' deal' + (pi === 0 ? '' : 's') + ' ' + aD + ', ' + D.name + ' deal' + (pi === 0 ? 's' : '') + ' ' + dD + '.', pi);
      report.sides = [[att, pi, 'att', aD], [def, opp(pi), 'def', dD]].map(function (sd) {
        return { pi: sd[1], role: sd[2], total: sd[3], units: sd[0].map(function (u) { return { u: u, name: u.c.name, might: dealsDamage(u) ? might(u, sd[2]) : 0, stunned: !dealsDamage(u), before: u.damage }; }) };
      });
      assignDamage(aD, def, 'def'); assignDamage(dD, att, 'att');
      [[def, pi], [att, opp(pi)]].forEach(function (sd) { if (hasLethal(G, sd[1])) sd[0].forEach(function (u) { if (u.damage > 0) u.lethal = true; }); });
      report.sides.forEach(function (sd) { sd.units.forEach(function (x) { x.taken = x.u.damage - x.before; }); });
      var dead = att.filter(function (u) { return u.damage > 0 && (u.damage >= might(u, 'att') || u.lethal || G.decreeTurn === G.turnNo); })
        .concat(def.filter(function (u) { return u.damage > 0 && (u.damage >= might(u, 'def') || u.lethal || G.decreeTurn === G.turnNo); }));
      // survivors keep damage below their non-combat Might so Assault/Shield ending doesn't kill them afterwards
      att.concat(def).forEach(function (u) { if (dead.indexOf(u) < 0) u.damage = Math.min(u.damage, Math.max(0, might(u) - 1)); });
      for (i = 0; i < dead.length; i++) { log(G, dead[i].c.name + ' dies.', dead[i].ctrl); await killUnit(G, dead[i]); }
      await checkDeaths(G);
    }
    if (G.winner != null) return;
    G.units.forEach(function (u) { u.combatShield = 0; });
    att = unitsAt(G, bi, pi); def = unitsAt(G, bi, opp(pi));
    att.concat(def).forEach(function (u) { if (u.c.P.combatEnd === 'empower' && !u.empowered) { u.empowered = true; log(G, '✦ ' + u.c.name + ' is empowered (+' + (u.c.P.empoweredMight || 0) + ' Might).', u.ctrl); } });
    var winners = att.length && !def.length ? att : !att.length && def.length ? def : [];
    for (i = 0; i < winners.length; i++) await fireUnit(G, winners[i], 'winCombat');
    att = unitsAt(G, bi, pi); def = unitsAt(G, bi, opp(pi));
    if (G.stats) { var cs = G.stats[pi]; cs.attacks++; if (att.length && !def.length) cs.attacksWon++; else if (att.length) cs.attacksBounced++; else cs.attacksLost++; }
    G.combatReport = null;
    if (att.length && !def.length) { report.result = A.name + (pi === 0 ? ' win' : ' wins') + ' and conquer' + (pi === 0 ? '' : 's') + ' ' + bfName(G, bi) + '.'; report.winner = pi; await fireLegend(G, pi, 'winCombat', { loc: bi }); await conquer(G, pi, bi, att); }
    else if (att.length && def.length) {
      att.forEach(function (u) { u.loc = 'base'; });
      report.result = 'Both sides survive: the attackers go back to base and ' + D.name + ' keep' + (pi === 0 ? 's' : '') + ' ' + bfName(G, bi) + '.'; report.winner = -1;
      log(G, 'Both sides survive: attackers return to base.', pi);
    } else if (!att.length && def.length) { report.result = D.name + ' defend' + (pi === 0 ? 's' : '') + ' ' + bfName(G, bi) + ': every attacker died.'; report.winner = opp(pi); await fireLegend(G, opp(pi), 'winCombat', { loc: bi }); log(G, D.name + ' hold' + (pi === 0 ? 's' : '') + ' ' + bfName(G, bi) + '.', opp(pi)); }
    else { report.result = 'Everyone died. ' + bfName(G, bi) + ' is now open.'; report.winner = -1; }
    updateControl(G);
  }
  async function conquer(G, pi, bi, units) {
    var p = G.players[pi];
    G.bfs[bi].ctrl = pi;
    checkHidden(G);
    log(G, p.name + ' conquer' + (pi === 0 ? '' : 's') + ' ' + bfName(G, bi) + '.', pi);
    scoreBf(G, pi, bi, 'conquer');
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.dead || G.winner != null) continue;
      if (kwOf(u).hunt) gainXp(G, pi, kwOf(u).hunt, u.c.name + ' (Hunt, conquer)');
      await fireUnit(G, u, 'conquer');
    }
    await fireLegend(G, pi, 'conquer', { loc: bi });
    await fireLegend(G, pi, 'conquerOrHold', { loc: bi });
    await fireBf(G, pi, bi, 'bfconquer');
    var cps = p.gear.filter(function (g) { return g.loc === bi && g.c.P.gearConquerFx; });
    for (var ci = 0; ci < cps.length; ci++) await resolveEffects(G, pi, cps[ci].c.P.gearConquerFx, { src: null, loc: bi, gearLoc: bi, srcName: cps[ci].c.name });
    await checkDeaths(G);
  }

  /* ---------------- AI ---------------- */
  function evalEffects(G, pi, effs, ctx) {
    var value = 0, good = true, targets = [];
    effs.forEach(function (e) {
      if (needsChoice(e)) {
        var cands = candidates(G, pi, e, ctx), u = autoChoose(G, pi, e, cands);
        if (!u) { targets.push(null); if (!e.opt && (isHarmful(e) || e.op === 'buff')) good = false; return; }
        targets.push(u.uid);
        ctx.it = u;
        if (u.ctrl === pi && isHarmful(e) && !e.selfOk) { good = false; return; }
        if (e.op === 'kill' && u.ctrl === pi) { value -= unitValue(u); return; }
        if (e.op === 'kill') value += unitValue(u) + 1;
        else if (e.op === 'deal') value += (might(u) - u.damage <= e.n) ? unitValue(u) + 1 : 0;
        else if (e.op === 'stun') value += u.loc !== 'base' && might(u) >= 3 ? 2 : 0.5;
        else if (e.op === 'tohand' || e.op === 'tobase') value += (u.loc !== 'base' && G.bfs[u.loc].ctrl === u.ctrl) ? unitValue(u) : 0;
        else if (e.op === 'buff') value += u.buff ? 0 : 1.5;
        else if (e.op === 'might') value += e.n < 0 ? 0.3 : 0.2;
        else if (e.op === 'ready') value += u.ex ? 1 : 0;
        return;
      }
      if (OPS_VALUE[e.op]) { value += OPS_VALUE[e.op](G, pi, e); return; }
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
      p.hand.concat(p.champion ? [p.champion] : [], p.hidden.map(function (h) { return h.card; })).forEach(function (card) {
        var ch = aiCardChoice(G, pi, card);
        if (ch && (!best || ch.value > best.value)) best = { value: ch.value, card: card, opts: ch.opts };
      });
      if (!best) {
        var did = false;
        var loose = p.gear.filter(function (g) { return g.c.P.equip && canEquip(G, pi, g).ok; })[0];
        if (loose) { await equipGear(G, pi, loose); did = true; }
        // simple gear use: empower an egg, draw with Garbage Grabber, make a Bird with Gutter Palace when the hand is big
        for (var gq = 0; gq < p.gear.length && !did; gq++) {
          var gg = p.gear[gq], acts = gg.c.P.gearActs || [];
          for (var ai2 = 0; ai2 < acts.length && !did; ai2++) {
            if (!canUseGear(G, pi, gg.iid, ai2).ok || acts[ai2].killSelf) continue;
            if (acts[ai2].discard && p.hand.length < 4) continue;
            if (acts[ai2].selfOk) continue;
            await useGear(G, pi, gg.iid, ai2); did = true;
          }
        }
        for (var ui = 0; ui < G.units.length && !did; ui++) {
          var uu = G.units[ui];
          if (uu.ctrl === pi && canUseUnit(G, pi, uu.uid).ok && (!uu.c.P.unitAct.killFriendly || unitsOf(G, pi).some(function (x) { return x !== uu && x.token; }))) { await useUnit(G, pi, uu.uid); did = true; }
        }
        for (var ti = 0; ti < p.trash.length && !did; ti++) {
          var tc = p.trash[ti];
          if (canFlow(G, pi, tc.iid).ok) {
            var fe = evalEffects(G, pi, tc.c.P.spell, { src: null, loc: null });
            if (fe.good && fe.value >= 1.5) { await playFlow(G, pi, tc.iid); did = true; }
          }
        }
        if (!did) return;
        await wait(); continue;
      }
      var r = await playCard(G, pi, best.card.iid, best.opts);
      if (!r.ok) return;
      await wait();
    }
  }
  function subsets(arr, f) { var n = Math.min(arr.length, 12); for (var m = 1; m < (1 << n); m++) { var s = []; for (var i = 0; i < n; i++) if (m & (1 << i)) s.push(arr[i]); f(s); } }
  function planAttack(G, pi, bi, avail, bonus) {
    var defs = unitsAt(G, bi, opp(pi));
    var need = defs.reduce(function (s, u) { return s + Math.max(1, might(u, 'def') - u.damage); }, 0);
    var dD = defs.reduce(function (s, u) { return s + (dealsDamage(u) ? might(u, 'def') : 0); }, 0);
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
  // Ways the AI can add attacking Might before moving: "+N Might this turn" spells, or an "Assault N" legend ability.
  function aiPumps(G, pi) {
    var p = G.players[pi], out = [];
    p.hand.forEach(function (card) {
      var c = card.c;
      if (c.type !== 'Spell' || !c.P.spell.length) return;
      var e = c.P.spell.filter(function (x) { return x.op === 'might' && x.n > 0 && (x.t.sel === 'any' || x.t.sel === 'friendly') && !x.t.where; })[0];
      if (e && canPlay(G, pi, card.iid, false).ok) out.push({ n: e.n, card: card });
    });
    legendActs(G, pi).forEach(function (a, idx) {
      var e = actEffects(G, pi, a).filter(function (x) { return x.op === 'assault'; })[0];
      if (e && canUseLegend(G, pi, idx).ok) out.push({ n: e.n, act: idx });
    });
    return out.sort(function (a, b) { return b.n - a.n; });
  }
  async function aiAttack(G, pi, wait) {
    for (var bi = 0; bi < G.bfs.length && G.winner == null; bi++) {
      if (G.bfs[bi].ctrl === pi) continue;
      var avail = unitsAt(G, 'base', pi).filter(function (u) { return !u.ex && !u.stun; });
      if (!avail.length) continue;
      var enemies = unitsAt(G, bi, opp(pi));
      if (!enemies.length) {
        var weakest = avail.slice().sort(function (a, b) { return unitValue(a) - unitValue(b); })[0];
        await moveUnits(G, pi, [weakest.uid], bi); await wait(); continue;
      }
      var S = planAttack(G, pi, bi, avail, 0);
      if (!S) {
        var pump = aiPumps(G, pi)[0];
        if (pump) {
          S = planAttack(G, pi, bi, avail, pump.n);
          if (S) {
            var host = S.slice().sort(function (a, b) { return might(b) - might(a); })[0];
            if (pump.card) {
              var tq = pump.card.c.P.spell.filter(needsChoice).map(function (e) { return e.op === 'might' && e.n > 0 ? host.uid : null; });
              await playCard(G, pi, pump.card.iid, { targets: tq });
            } else await useLegend(G, pi, pump.act, [host.uid]);
            await wait();
            if (host.dead || host.loc !== 'base') continue;
          }
        }
      }
      if (S) { await moveUnits(G, pi, S.filter(function (u) { return !u.dead; }).map(function (u) { return u.uid; }), bi); await wait(); }
    }
  }
  async function aiLegend(G, pi, wait) {
    var acts = legendActs(G, pi);
    for (var i = 0; i < acts.length && G.winner == null; i++) {
      if (!canUseLegend(G, pi, i).ok) continue;
      var effs = actEffects(G, pi, acts[i]);
      if (effs.some(function (e) { return e.op === 'assault' || e.op === 'tobase'; })) continue; // used during attacks only
      var ev = evalEffects(G, pi, effs, { src: null, loc: null });
      if (!effs.length || (ev.good && ev.value >= 1.5)) { await useLegend(G, pi, i, ev.targets); await wait(); }
    }
  }
  async function aiTurn(G, pi, wait) {
    wait = wait || function () { return Promise.resolve(); };
    if (G.winner != null) return;
    await aiPlayLoop(G, pi, wait);
    if (G.winner == null) await aiLegend(G, pi, wait);
    if (G.winner == null) await aiAttack(G, pi, wait);
    if (G.winner == null) await aiPlayLoop(G, pi, wait);
    if (G.winner == null) await aiLegend(G, pi, wait);
    if (G.winner == null) await aiHide(G, pi, wait);
  }
  // Hide one reactive card per turn when there are runes to spare.
  async function aiHide(G, pi, wait) {
    var p = G.players[pi];
    if (p.runes.length < 5) return;
    var cands = p.hand.filter(function (x) { return hideSpots(G, pi, x.iid).length; })
      .sort(function (a, b) { return (b.c.type === 'Spell') - (a.c.type === 'Spell') || (b.c.energy || 0) - (a.c.energy || 0); });
    if (!cands.length) return;
    hideCard(G, pi, cands[0].iid, hideSpots(G, pi, cands[0].iid)[0]);
    await wait();
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

  // Post-game review built from what actually happened (G.events): the few moments that mattered most, with turn numbers.
  function reviewGame(G, pi) {
    var ev = G.events || [], out = [], o = opp(pi), you = function (q) { return q === pi ? 'You' : 'The AI'; };
    var names = function (arr) { return arr.slice(0, 2).join(' and ') + (arr.length > 2 ? ' +' + (arr.length - 2) : ''); };
    ev.forEach(function (e) {
      if (e.t === 'combat') {
        var mine = e.sides.filter(function (sd) { return sd.pi === pi; })[0], theirs = e.sides.filter(function (sd) { return sd.pi === o; })[0];
        if (!mine || !theirs) return;
        var lost = mine.units.filter(function (x) { return x.died; }), killed = theirs.units.filter(function (x) { return x.died; });
        var lostCost = lost.reduce(function (s2, x) { return s2 + x.cost; }, 0), killCost = killed.reduce(function (s2, x) { return s2 + x.cost; }, 0);
        var skipped = (e.couldPlay[pi] || []).filter(function (n) { return (e.played[pi] || []).indexOf(n) < 0; });
        if (e.attacker === pi && e.winner !== pi) {
          var need = Math.max(0, theirs.units.reduce(function (s2, x) { return s2 + Math.max(1, x.might); }, 0) - mine.total);
          var lostAll = lost.length && lost.length === mine.units.length, killedAll = killed.length && killed.length === theirs.units.length;
          if (killedAll && lostAll && lostCost <= killCost) return; // an even or good trade isn't a mistake
          var txt = 'You attacked ' + e.bf + ' with ' + mine.total + ' Might into ' + theirs.total + ': ' +
            (killedAll && lostAll ? 'everything died, and you lost more than they did (' + names(lost.map(function (x) { return x.name; })) + ').' :
             lostAll ? 'you lost ' + names(lost.map(function (x) { return x.name; })) + '.' : 'both sides survived, so your units went back to base.') + ' ';
          var aiPlayed = e.played[o] || [];
          txt += aiPlayed.length ? 'The AI answered with ' + aiPlayed[0] + ' in the showdown — keep a trick or spare Might for that.'
            : skipped.length ? 'You could have played ' + skipped[0] + ' in the showdown.'
            : need ? 'You needed about ' + need + ' more Might to clear them.'
            : 'Their units had more total health than your damage once Tank/Shield applied — bring another unit.';
          out.push({ turn: e.turn, kind: 'bad', score: 3 + lostCost - killCost / 2, text: txt });
        } else if (e.attacker === o && e.winner === o) {
          var t2 = 'The AI took ' + e.bf + ' (' + theirs.total + ' vs your ' + mine.total + ' Might)' + (lost.length ? ', killing ' + names(lost.map(function (x) { return x.name; })) : '') + '. ';
          t2 += skipped.length ? skipped[0] + ' was playable in the showdown — use reactions when defending.' : 'Leave a stronger defender there, or retake it on your turn.';
          out.push({ turn: e.turn, kind: 'bad', score: 2 + lostCost + (e.ptsAfter[o] - e.ptsBefore[o]) * 2, text: t2 });
        } else if (e.attacker === pi && e.winner === pi) {
          out.push({ turn: e.turn, kind: 'good', score: 2 + killCost + (e.ptsAfter[pi] - e.ptsBefore[pi]) * 2, text: 'Good attack: you took ' + e.bf + ' with ' + mine.total + ' Might vs ' + theirs.total + (killed.length ? ', killing ' + names(killed.map(function (x) { return x.name; })) : '') + '.' });
        } else if (e.attacker === o && e.winner === pi && killed.length) {
          out.push({ turn: e.turn, kind: 'good', score: 2 + killCost, text: 'Good defence at ' + e.bf + ': ' + mine.total + ' vs ' + theirs.total + ', killing ' + names(killed.map(function (x) { return x.name; })) + '.' });
        }
      } else if (e.t === 'end' && e.pi === pi) {
        if (e.unused >= 3 && e.playable.length) out.push({ turn: e.turn, kind: 'bad', cat: 'unused', score: e.unused, text: 'You ended the turn with ' + e.unused + ' energy unused while ' + e.playable[0] + ' was playable.' });
        if (e.idle.length && e.oppHolds.length) out.push({ turn: e.turn, kind: 'bad', cat: 'idle', score: 3, text: names(e.idle) + ' stayed in base while the AI held ' + e.oppHolds.join(' and ') + ' — it scored again next turn.' });
      } else if (e.t === 'fizzle' && e.pi === pi && e.spell) {
        out.push({ turn: e.turn, kind: 'bad', score: 2, text: e.src + ' fizzled (' + e.what.toLowerCase() + ' had no target). Check targets before casting.' });
      }
    });
    // the AI's biggest scoring turn
    var byTurn = {};
    ev.forEach(function (e) { if (e.t === 'pts' && e.pi === o) { (byTurn[e.turn] = byTurn[e.turn] || []).push(e); } });
    Object.keys(byTurn).forEach(function (t) {
      var list = byTurn[t], n = list.reduce(function (s2, e) { return s2 + e.n; }, 0);
      if (n >= 2) out.push({ turn: +t, kind: 'bad', score: 2 + n, text: 'The AI scored ' + n + ' that turn (' + list.map(function (e) { return e.why; }).join(', ') + ').' });
    });
    var bad = out.filter(function (x) { return x.kind === 'bad'; }).sort(function (a, b) { return b.score - a.score; });
    var good = out.filter(function (x) { return x.kind === 'good'; }).sort(function (a, b) { return b.score - a.score; });
    var seenTurn = {}, seenCat = {}, picks = [];
    bad.forEach(function (x) {
      if (picks.length >= 3 || seenTurn[x.turn + x.text.slice(0, 12)] || (x.cat && seenCat[x.cat])) return;
      seenTurn[x.turn + x.text.slice(0, 12)] = 1; if (x.cat) seenCat[x.cat] = 1; picks.push(x);
    });
    if (good[0]) picks.push(good[0]);
    picks.sort(function (a, b) { return a.turn - b.turn; });
    var last = ev.filter(function (e) { return e.t === 'pts'; }).slice(-1)[0];
    var ending = G.winner === pi ? 'You won' : G.winner === o ? 'The AI won' : 'Draw';
    if (last && G.winner != null && G.winner >= 0) ending += ' on turn ' + last.turn + ' (' + (last.why || 'points') + ').';
    return { moments: picks, ending: ending };
  }

  // Two or three short, specific tips for the human player after a game.
  function gameTips(G, pi) {
    var st = G.stats && G.stats[pi], o = G.stats && G.stats[opp(pi)], tips = [];
    if (!st) return tips;
    var L = G.players[pi].legend.c ? G.players[pi].legend.c.name : '';
    if (st.attacksLost + st.attacksBounced >= 2) tips.push('Check the fight preview on Move buttons (⚔ your Might vs 🛡 theirs) — ' + (st.attacksLost + st.attacksBounced) + ' of your ' + st.attacks + ' attacks failed.');
    if (st.unspent >= 2) tips.push('Spend your energy: ' + st.unspent + ' turns ended with 2+ runes ready and a playable card in hand.');
    if (st.idle >= 3) tips.push('Move ready units out of base — they sat idle on ' + st.idle + ' turns. Units on battlefields score every turn.');
    if (o && o.holdPts >= 3) tips.push('The AI scored ' + o.holdPts + ' points just by holding. Contest its battlefields sooner, even with a weak unit, to stop the hold points.');
    if (st.holdPts === 0 && st.conquerPts > 0) tips.push("You conquered but never held: keep a defender on battlefields you take so they score again at your next turn.");
    if (st.emptyBfTurns >= 3) tips.push('You had no units on battlefields for ' + st.emptyBfTurns + ' turns. Early cheap units that go out and score win races.');
    if (st.unitsLost >= 8 && st.attacks <= 3) tips.push('You lost ' + st.unitsLost + ' units mostly on defence — trade on your terms by attacking first.');
    var legendTip = /Tempest/.test(L) ? 'Kennen: play cards from your champion zone, face down or the trash to empower the legend, then use it for Assault 2.'
      : /LeBlanc/.test(L) ? 'LeBlanc: conquer or hold with a strong unit there so the Reflection copies something big.'
      : /Rengar/.test(L) ? 'Rengar: play a unit before you attack — the legend gives +1 Might to an attacker.'
      : /Irelia/.test(L) ? 'Irelia: target your own exhausted units with spells to ready them through the legend.'
      : /Akali/.test(L) ? 'Akali: empower the legend early so its recall also readies the unit.'
      : /Jayce/.test(L) ? 'Jayce: Platewyrm Egg + the legend readying gear gives you extra energy every turn.'
      : /Master Yi/.test(L) ? 'Master Yi: defend with a single unit — it gets +2 Might when defending alone.'
      : /Azir/.test(L) ? 'Azir: play an Equipment first, then use the legend for Sand Soldiers that can grab it with Weaponmaster.'
      : /Vex/.test(L) ? 'Vex: holding battlefields draws you a card each time — keep units on them.'
      : /Rek/.test(L) ? "Rek'Sai: conquer to trigger the legend and play cards off the top of your deck for free tempo." : '';
    if (tips.length < 3 && legendTip) tips.push(legendTip);
    return tips.slice(0, 3);
  }

  return {
    real: function (id) { return REAL[id] || null; }, REAL_DATE: REAL_DATE, REAL_MATCHES: REAL_MATCHES,
    reviewGame: reviewGame,
    levelCards: levelCards,
    gameTips: gameTips,
    WIN: WIN, DOMAIN_COLORS: DOMAIN_COLORS, DECKS: DECKS, FIXES: FIXES, norm: norm,
    loadCards: loadCards, cards: function () { return CARDS; }, parseCard: parseCard, richToLines: richToLines,
    newGame: newGame, endTurn: endTurn, playCard: playCard, canPlay: canPlay, targetSlots: targetSlots, ambushSpots: ambushSpots,
    empoweredList: function (G, pi) {
      var out = [], L = G.players[pi].legend;
      if (L.empowered) out.push(L.c.name);
      G.units.forEach(function (u) { if (u.ctrl === pi && u.empowered) out.push(u.c.name); });
      return out;
    },
    canUseGear: canUseGear, useGear: useGear, seraphineReady: seraphineReady, deploySpots: deploySpots,  roostSpots: roostSpots, energyAvail: energyAvail, hideSpots: hideSpots, hideCard: hideCard, canEquip: canEquip, equipGear: equipGear, equipCostText: equipCostText, canUseUnit: canUseUnit, useUnit: useUnit, canFlow: canFlow, playFlow: playFlow, legendActs: legendActs, canUseLegend: canUseLegend, useLegend: useLegend, canMove: canMove, moveUnits: moveUnits, unitsAt: unitsAt, might: might, kwOf: kwOf,
    equipBonus: equipBonus, describeEffect: describeEffect, cardCost: cardCost, aiTurn: aiTurn, deckCoverage: deckCoverage, cardDomains: cardDomains
  };
})();
if (typeof module !== 'undefined') module.exports = RT;
