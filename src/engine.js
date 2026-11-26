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
  // Tournament lists (riftbound.gg, Radiance, Oct-Nov 2026), made legal for the Nov 23 2026 bans ('post-ban':
  // banned cards swapped for the most-played legal cards of that legend; see quant/results/decklists_2026-11.md).
  var DECKS = [
    { id: "kennen", name: "Kennen", label: "LA Regional 27th · post-ban", legend: "Heart of the Tempest", champion: "Kennen, Storm of Shuriken", runes: { Chaos: 9, Order: 3 },
      bfs: ["Zaun Warrens", "Minefield", "Shadow Temple"],
      list: L("1 Kennen, Storm of Shuriken; 3 Lightning Rush; 3 Seal of Discord; 3 Shadow Order Disciple; 3 Tail-Cloaked Matriarch; 3 Traveling Merchant; 2 Fizz - Trickster; 2 Last Rites; 2 Star-Crossed; 2 Switcheroo; 2 Tornado Warrior; 1 Baron Nashor; 1 Existential Dread; 1 Ezreal, Prodigy; 1 Flash; 1 Gust; 1 Ride The Wind; 1 Salvage; 1 Shadows of the Past; 1 The Harrowing; 1 Tideturner; 1 Treasure Hunter; 3 Trifarian Captain") },
    { id: "leblanc", name: "LeBlanc", label: "LDXP Sacramento 12th of 755 · post-ban", legend: "LeBlanc - Deceiver", champion: "LeBlanc - Fragmented", runes: { Order: 8, Mind: 4 },
      bfs: ["Trifarian War Camp", "Windswept Hillock", "Seat of Power"],
      list: L("2 Watchful Sentry; 1 Thousand-Tailed Watcher; 1 Hidden Blade; 3 Soaring Scout; 3 Harnessed Dragon; 3 Karthus - Eternal; 3 Honest Broker; 1 Deathgrip; 3 Glasc Mixologist; 3 Ruined Rex; 3 Black Rose Dignitary; 1 LeBlanc - Fragmented; 3 Sacrifice; 3 Vi - Peacekeeper; 3 Rift Herald; 1 Mirror Image; 3 Stupefy") },
    { id: "rengar", name: "Rengar", label: "LDXP Sacramento 8th of 755 · post-ban", legend: "Rengar - Pridestalker", champion: "Rengar - Trophy Hunter", runes: { Body: 8, Fury: 4 },
      bfs: ["Rockfall Path", "Seat of Power", "Sigil of the Storm"],
      list: L("3 Noxus Hopeful; 3 Kai'Sa - Survivor; 2 First Mate; 3 Pit Rookie; 2 Sabotage; 2 Elnuk Herd; 1 Ferrous Forerunner; 3 Punch First; 3 Inferna; 2 Grim Apothecary; 2 Pyke - Dockside Butcher; 3 Kinkou Initiate; 3 Irresistible Faefolk; 2 Nidalee - Cat Form; 3 Thrill of the Hunt; 2 Rampage; 1 Rengar - Trophy Hunter") },
    { id: "irelia", name: "Irelia", label: "Convergence IV 2nd of 272 · post-ban", legend: "Irelia - Blade Dancer", champion: "Irelia - Fervent", runes: { Calm: 6, Chaos: 6 },
      bfs: ["Targon's Peak", "Sunken Temple", "Abandoned Hall"],
      list: L("2 Charm; 3 Defy; 1 En Garde; 3 Discipline; 1 Rebuke; 2 Ride The Wind; 3 Tideturner; 1 Battle Preparations; 1 Hunker Down; 3 Orianna - Exquisite; 1 Lonely Poro; 1 Not So Fast; 2 Guardian Angel; 1 Irelia - Fervent; 2 Boots of Swiftness; 2 Edge of Night; 3 Defiant Dance; 3 Scuttle Crab; 1 Star-Crossed; 2 Vex - Apathetic; 1 Twilight Shroud; 1 Gust Monk") },
    { id: "akali", name: "Akali", label: "Earlier tournament list · post-ban", legend: "Akali - Rogue Assassin", champion: "Akali, Silent", runes: { Calm: 6, Fury: 6 },
      bfs: ["Back-Alley Bar", "Sigil of the Storm", "Void Gate"],
      list: L("1 Akali, Silent; 2 Charm; 3 Defy; 3 Shuriken Flip; 2 Twilight Shroud; 3 Discipline; 3 Inferna; 3 Lonely Poro; 3 Mask of Foresight; 3 Mournful Witness; 2 Scuttle Crab; 2 Back Off; 3 Pendulum Blade; 1 Irelia - Fervent; 3 Kai'Sa - Survivor; 3 Falling Star") },
    { id: "jayce", name: "Jayce", label: "LDXP Sacramento 191st of 755 · post-ban", legend: "Jayce - Defender of Tomorrow", champion: "Jayce, Brilliant Inventor", runes: { Body: 7, Mind: 5 },
      bfs: ["Sigil of the Storm", "Forgotten Monument", "The Papertree"],
      list: L("3 Garbage Grabber; 1 Progress Day; 3 Promising Future; 2 Flurry of Blades; 3 Mobilize; 3 Catalyst of Aeons; 1 Sabotage; 1 Avalanche; 2 Rocket Barrage; 3 Bellows Breath; 2 Gutter Palace; 3 Elder Dragon; 3 Dredge Up; 3 Clairvoyance; 1 Jayce, Brilliant Inventor; 3 Platewyrm Egg; 3 Stupefy") },
    { id: "masteryi", name: "Master Yi", label: "Convergence IV 24th of 272 · post-ban", legend: "Master Yi - Wuju Bladesman", champion: "Master Yi - Tempered", runes: { Calm: 5, Body: 7 },
      bfs: ["Rockfall Path", "Seat of Power", "Sigil of the Storm"],
      list: L("3 Charm; 3 Defy; 3 En Garde; 3 Discipline; 3 First Mate; 3 Pit Rookie; 2 Sabotage; 3 Lonely Poro; 2 Irelia - Fervent; 3 Punch First; 3 Scuttle Crab; 1 Master Yi - Tempered; 1 Alpha Strike; 1 Twilight Shroud; 3 Rampage; 3 Rengar - Trophy Hunter") },
    { id: "azir", name: "Azir", label: "LDXP Sacramento 38th of 755", legend: "Azir - Emperor of the Sands", champion: "Azir - Sovereign", runes: { Calm: 7, Order: 5 },
      bfs: ["Trifarian War Camp", "Hall of Legends", "Seat of Power"],
      list: L("3 Defy; 3 Discipline; 3 Hidden Blade; 1 Battle Preparations; 3 Trifarian Captain; 3 Doran's Shield; 3 Brutalizer; 3 Eye of the Herald; 3 Guards!; 3 B.F. Sword; 1 Deathgrip; 1 Azir - Sovereign; 3 Arise!; 2 Back Off; 1 Vi - Peacekeeper; 3 Hand Hammer; 1 Kennen, Keeper of Balance") },
    { id: "vex", name: "Vex", label: "Convergence IV 9th of 272 · post-ban", legend: "Vex - Gloomist", champion: "Vex - Apathetic", runes: { Calm: 6, Chaos: 6 },
      bfs: ["Bandle Tree", "Startipped Peak", "Bandle Scouts' Academy"],
      list: L("1 Clockwork Keeper; 3 Defy; 3 Discipline; 1 Blitzcrank - Impassive; 1 Ember Monk; 1 Rebuke; 1 Seal of Discord; 1 Life from Stone; 1 Hunting Blind; 2 Gutter Guardian; 1 Bedeviling Stranger; 1 Sterak's Gage; 3 Boots of Swiftness; 1 Edge of Night; 3 Switcheroo; 1 Mutated Mouser; 1 Back Off; 2 Evelynn - Entrancing; 1 Kha'Zix - Mutating Horror; 1 Vex - Apathetic; 3 Steel Paws; 3 Astral Heron; 3 Tornado Warrior; 1 Gust Monk") },
    { id: "reksai", name: "Rek'Sai", label: "Singapore RQ 30th", legend: "Rek'sai - Void Burrower", champion: "Rek'Sai - Breacher", runes: { Fury: 7, Order: 5 },
      bfs: ["The Candlelit Sanctum", "Forbidding Waste", "Mystic Vortex"],
      list: L("1 Rek'Sai - Breacher; 3 Blood Rush; 3 Carrion Dredger; 3 Cull the Weak; 3 Faithful Manufactor; 3 Falling Star; 3 Honest Broker; 3 Imperial Decree; 3 Inferna; 3 Noxus Hopeful; 2 Cleave; 2 Escaped Grayback; 2 Legion Rearguard; 2 Noxian Emissary; 2 Void Rush; 1 Forge of the Future; 1 Salvage") },
    { id: "riven", name: "Riven", label: "LDXP Sacramento 1st of 755 · post-ban", legend: "Riven - The Exile", champion: "Riven - Deserter", runes: { Calm: 5, Chaos: 7 },
      bfs: ["Rakelstake", "Seat of Power", "Rockfall Path"],
      list: L("3 Defy; 3 Discipline; 2 Blitzcrank - Impassive; 3 Gust; 1 Rebuke; 3 Tideturner; 3 Battle Preparations; 1 Riven - Deserter; 2 Reckless Innovator; 3 Bedeviling Stranger; 3 Blade of the Exile; 1 Not So Fast; 2 Switcheroo; 3 Scuttle Crab; 1 Star-Crossed; 3 Astral Heron; 3 Vex - Apathetic") },
    { id: "evelynn", name: "Evelynn", label: "LDXP Sacramento 21st of 755", legend: "Evelynn - Agony's Embrace", champion: "Evelynn - Entrancing", runes: { Body: 4, Chaos: 8 },
      bfs: ["Startipped Peak", "Bandle Scouts' Academy", "Rakelstake"],
      list: L("2 Hold 'Em; 2 K'Sante - Courageous; 3 Gutter Guardian; 2 Boots of Swiftness; 2 Edge of Night; 2 Fizz - Trickster; 1 Switcheroo; 2 Ezreal, Prodigy; 3 Kinkou Initiate; 2 Star-Crossed; 1 Evelynn - Entrancing; 3 Pyke - Returned; 1 Baron Nashor; 2 Vex - Apathetic; 1 Onslaught; 2 Rampage; 3 Tornado Warrior; 3 Tail-Cloaked Matriarch; 1 Kharox; 2 Rengar - Trophy Hunter") },
    { id: "mordekaiser", name: "Mordekaiser", label: "LDXP Sacramento 89th of 755", legend: "Mordekaiser - Iron Revenant", champion: "Mordekaiser - Dominating", runes: { Order: 6, Fury: 6 },
      bfs: ["Zaun Warrens", "Ruined Monastery", "Minefield"],
      list: L("3 Noxus Hopeful; 3 Kai'Sa - Survivor; 2 Hidden Blade; 3 Vanguard Captain; 2 Imperial Decree; 3 Spectral Matron; 2 Shen - Kinkou; 2 Bilgewater Tracker; 3 Trifarian Captain; 1 Mordekaiser - Dominating; 3 Realm of Death; 3 Long Sword; 3 Honest Broker; 2 Xin Zhao - Vigilant; 3 Carrion Dredger; 2 Vi - Peacekeeper") },
    { id: "orianna", name: "Orianna", label: "LDXP Sacramento 132nd of 755 · post-ban", legend: "Orianna - Lady of Clockwork", champion: "Orianna - Exquisite", runes: { Calm: 5, Mind: 7 },
      bfs: ["Targon's Peak", "Veiled Temple", "Abandoned Hall"],
      list: L("3 Defy; 3 Discipline; 2 Blitzcrank - Impassive; 3 Stupefy; 3 Ravenbloom Student; 3 Thousand-Tailed Watcher; 3 Battle Preparations; 1 Orianna - Exquisite; 3 The Ball; 1 Not So Fast; 3 Cloth Armor; 1 Back Off; 3 Scuttle Crab; 2 Vilemaw; 3 Eclipse; 3 Astral Heron") },
    { id: "seraphine", name: "Seraphine", label: "LDXP Sacramento 106th of 755", legend: "Seraphine - Starry-Eyed Songstress", champion: "Seraphine - Inspiring", runes: { Order: 7, Mind: 5 },
      bfs: ["Vilemaw's Lair", "Void Gate", "Forbidding Waste"],
      list: L("3 Stupefy; 2 Thousand-Tailed Watcher; 3 Cull the Weak; 2 Faithful Manufactor; 2 Hidden Blade; 3 Vanguard Captain; 2 Imperial Decree; 2 Seal of Unity; 1 Seraphine - Inspiring; 3 Concert Poster; 3 Trifarian Captain; 1 Mordekaiser - Dominating; 3 Encore; 3 Bellows Breath; 2 Carrion Dredger; 2 Shadow's Call; 2 Vi - Peacekeeper; 1 Kennen, Keeper of Balance") },
    { id: "sett", name: "Sett", label: "Convergence IV 42nd of 272", legend: "Sett - The Boss", champion: "Sett - Brawler", runes: { Body: 8, Order: 4 },
      bfs: ["Grove of the God-Willow", "Monastery of Hirana", "Sunken Temple"],
      list: L("3 First Mate; 3 Pit Rookie; 1 Sett - Brawler; 3 Call to Glory; 1 Hidden Blade; 3 Fiora - Victorious; 3 Showstopper; 3 Pillaged Armory; 3 Graves - Blasting Through; 2 One-Two Punch; 3 Trifarian Captain; 3 Punch First; 2 Repulse; 3 Irresistible Faefolk; 3 Rampage; 1 Kennen, Keeper of Balance") },
    { id: "fiora", name: "Fiora", label: "Convergence IV 115th of 272", legend: "Fiora - Grand Duelist", champion: "Fiora - Worthy", runes: { Body: 7, Order: 5 },
      bfs: ["Packed Amphitheater", "Sunken Temple", "Risen Altar"],
      list: L("3 Pit Rookie; 2 Sett - Brawler; 1 Skystrike Squadron; 2 Portable Portal; 3 Trifarian Captain; 2 Mordekaiser - Dominating; 3 Punch First; 1 Fiora - Worthy; 3 Riposte; 3 Kinkou Initiate; 1 Repulse; 2 Poppy - Paragon; 3 Shepherd's Heirloom; 2 Sacrifice; 3 Rampage; 3 Kayle, Justified; 3 Rengar - Trophy Hunter") },
    { id: "volibear", name: "Volibear", label: "Convergence IV 116th of 272 · post-ban", legend: "Volibear - Relentless Storm", champion: "Volibear - Furious", runes: { Body: 7, Fury: 5 },
      bfs: ["Sigil of the Storm", "Sunken Temple", "The Papertree"],
      list: L("3 Sky Splitter; 2 Kadregrin the Infernal; 1 Volibear - Furious; 3 Mobilize; 2 Deadbloom Predator; 3 Stormbringer; 1 Avalanche; 1 Portable Portal; 2 Seraphic Wyvern; 3 Minotaur Reckoner; 1 Ferrous Forerunner; 3 Punch First; 1 Trinity Force; 3 Elder Dragon; 3 Platewyrm Egg; 3 Jayce, Hammer in Hand; 3 Rengar - Trophy Hunter; 2 Noxus Hopeful") },
    { id: "kaisa", name: "Kai'Sa", label: "Convergence IV 3rd of 272 · post-ban", legend: "Kai'Sa - Daughter of the Void", champion: "Kai'Sa - Survivor", runes: { Fury: 7, Mind: 5 },
      bfs: ["Void Gate", "Rockfall Path", "Frozen Fortress"],
      list: L("3 Hextech Ray; 3 Noxus Hopeful; 2 Void Seeker; 3 Falling Star; 3 Kai'Sa - Survivor; 1 Lecturing Yordle; 2 Smoke Screen; 3 Stupefy; 3 Watchful Sentry; 2 Singularity; 3 Thousand-Tailed Watcher; 3 Bilgewater Tracker; 2 The Empyrean; 3 Plundering Poro; 1 Perfect Execution; 3 Temporal Breach") },
    { id: "ezreal", name: "Ezreal", label: "Convergence IV 6th of 272", legend: "Ezreal - Prodigal Explorer", champion: "Ezreal - Prodigy", runes: { Chaos: 6, Mind: 6 },
      bfs: ["Sigil of the Storm", "Void Gate", "Frozen Fortress"],
      list: L("3 Stupefy; 1 Singularity; 2 Thousand-Tailed Watcher; 3 Gust; 3 Pack of Wonders; 2 Treasure Trove; 2 An Offer You Can't Refuse; 3 Wages of Pain; 3 Bellows Breath; 1 Hard Bargain; 3 Fizz - Trickster; 1 Ezreal - Prodigy; 3 Deadly Flourish; 2 Bewitching Spirit; 2 Star-Crossed; 3 The List; 3 Vex - Apathetic") },
    { id: "settkingpin", name: "Sett (Kingpin)", label: "Stuttgart Regional 23rd of 315", legend: "Sett - The Boss", champion: "Sett - Kingpin", runes: { Body: 7, Order: 5 },
      bfs: ["Monastery of Hirana", "Packed Amphitheater", "Valley of Idols"],
      list: L("1 Sett, Kingpin; 3 Irresistible Faefolk; 3 Pit Rookie; 3 Trifarian Captain; 3 First Mate; 3 Kinkou Initiate; 3 Fiora, Victorious; 3 Rengar, Trophy Hunter; 1 Vi, Peacekeeper; 2 Ruin Runner; 3 Punch First; 3 Showstopper; 3 Call to Glory; 3 Rampage; 3 Pillaged Armory") },
    { id: "ornn", name: "Ornn", label: "LDXP Sacramento 88th of 755", legend: "Ornn - Fire Below the Mountain", champion: "Ornn - Blacksmith", runes: { Calm: 9, Mind: 3 },
      bfs: ["Ornn's Forge", "Seat of Power", "Veiled Temple"],
      list: L("2 Charm; 3 Clockwork Keeper; 3 Defy; 1 Mask of Foresight; 3 Seal of Focus; 3 Pit Crew; 3 Brutalizer; 3 Poro Snax; 1 Guardian Angel; 3 Sterak's Gage; 1 Ornn - Blacksmith; 1 Aspiring Engineer; 2 Cloth Armor; 3 Scuttle Crab; 3 Sprite Fountain; 3 Patched Porobot; 1 Plaza Guardian; 1 Temporal Breach") },
    { id: "nasus", name: "Nasus", label: "LDXP Sacramento 41st of 755", legend: "Nasus - Curator of the Sands", champion: "Nasus, Guardian of Knowledge", runes: { Calm: 5, Mind: 7 },
      bfs: ["Ruined Monastery", "Rockfall Path", "Frozen Fortress"],
      list: L("3 Defy; 2 Find Your Center; 3 Discipline; 3 Stupefy; 3 Ravenbloom Student; 3 Thousand-Tailed Watcher; 1 Time Warp; 1 Unchecked Power; 3 Life from Stone; 1 Hush; 3 The Empyrean; 3 Lonely Poro; 3 Bellows Breath; 3 Scuttle Crab; 1 Sprite Burst; 1 Tomb-Raider Barbara; 1 Nasus, Guardian of Knowledge; 2 Temporal Breach") }
  ];

  // Real tournament results from riftbound.gg's meta snapshot (2026-11-15, 18526 matches over 14 days of Radiance):
  // win rate, sample size, tier, top-8 rate, and the head-to-head matchups the free data includes.
  var REAL = {"kennen":{"wr":0.55,"n":3704,"tier":"S","top8":0.0318,"mu":{"jayce":[0.7,126],"masteryi":[0.45,160]}},"leblanc":{"wr":0.46,"n":707,"tier":"D","top8":0.018,"mu":{"akali":[0.86,22],"riven":[0.26,179]}},"rengar":{"wr":0.49,"n":1390,"tier":"C","top8":0.0192,"mu":{"jayce":[0.29,57]}},"irelia":{"wr":0.45,"n":827,"tier":"D","top8":0.0306,"mu":{"evelynn":[0.73,12],"azir":[0.29,14]}},"akali":{"wr":0.41,"n":733,"tier":"D","top8":0.0054,"mu":{"leblanc":[0.14,22]}},"jayce":{"wr":0.56,"n":986,"tier":"S","top8":0.0182,"mu":{"masteryi":[0.8,51],"vex":[0.27,24]}},"masteryi":{"wr":0.51,"n":1135,"tier":"B","top8":0.0356,"mu":{"akali":[0.76,19],"jayce":[0.2,51]}},"azir":{"wr":0.45,"n":493,"tier":"D","top8":0.0276,"mu":{"vex":[0.21,16]}},"vex":{"wr":0.5,"n":864,"tier":"C","top8":0.0333,"mu":{"azir":[0.79,16],"reksai":[0.19,22]}},"reksai":{"wr":0.53,"n":1002,"tier":"A","top8":0.0281,"mu":{"vex":[0.81,22]}},"riven":{"wr":0.58,"n":6437,"tier":"S","top8":0.0348,"mu":{"leblanc":[0.74,179],"reksai":[0.44,286]}},"evelynn":{"wr":0.38,"n":394,"tier":"D","top8":0.0157,"mu":{"akali":[0.58,13],"masteryi":[0.18,12]}},"mordekaiser":{"wr":0.34,"n":262,"tier":null,"top8":0.0101,"mu":{"evelynn":[0.57,14],"kaisa":[0.18,30]}},"orianna":{"wr":0.36,"n":268,"tier":null,"top8":0.0244,"mu":{"kaisa":[0.37,40],"riven":[0.25,57]}},"seraphine":{"wr":0.37,"n":137,"tier":null,"top8":0,"mu":{"kennen":[0.46,13],"riven":[0,16]}},"sett":{"wr":0.52,"n":309,"tier":"A","top8":0.0513,"mu":{"rengar":[0.6,10],"jayce":[0.36,11]}},"fiora":{"wr":0.45,"n":159,"tier":null,"top8":0,"mu":{"kaisa":[0.43,23],"riven":[0.37,46]}},"volibear":{"wr":0.36,"n":151,"tier":null,"top8":0,"mu":{"kaisa":[0.56,28],"kennen":[0.2,23]}},"kaisa":{"wr":0.52,"n":4914,"tier":"B","top8":0.0295,"mu":{"azir":[0.36,93]}},"ezreal":{"wr":0.4,"n":139,"tier":null,"top8":0.0278,"mu":{}},"settkingpin":{"wr":0.52,"n":309,"tier":"A","top8":0.0513,"mu":{"rengar":[0.6,10],"jayce":[0.36,11]}},"ornn":{"wr":0.43,"n":500,"tier":"D","top8":0.0091,"mu":{}},"nasus":{"wr":0.42,"n":195,"tier":null,"top8":null,"mu":{}}};
  var REAL_DATE = '2026-11-15', REAL_MATCHES = 18526;

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
    pruneBannedFromPlans();
  }
  // Ban lists change: keep the researched plans' key cards, AI priorities and tips to legal cards, and say what was banned.
  function pruneBannedFromPlans() {
    var banned = CARDS.filter(function (c) { return c.banned; }).map(function (c) { return c.name; });
    var hits = function (txt) { return banned.filter(function (b) { return norm(txt).indexOf(norm(b)) >= 0; }); };
    Object.keys(PLANS).forEach(function (id) {
      var pl = PLANS[id], gone = {};
      pl.keys = (pl.keys || []).filter(function (k) { var h = hits(k); h.forEach(function (b) { gone[b] = 1; }); return !h.length; });
      pl.tips = (pl.tips || []).filter(function (t) { var h = hits(t); h.forEach(function (b) { gone[b] = 1; }); return !h.length; });
      if (pl.ai && pl.ai.key) Object.keys(pl.ai.key).forEach(function (k) { if (hits(k).length) { gone[k] = 1; delete pl.ai.key[k]; } });
      if (pl.ai) pl.ai.keyN = null;
      hits(pl.plan || '').forEach(function (b) { gone[b] = 1; });
      var g = Object.keys(gone);
      if (g.length && pl.plan.indexOf('Banned from') < 0) pl.plan += ' (Banned from Nov 23 2026: ' + g.join(', ') + '; the list replaces ' + (g.length > 1 ? 'them' : 'it') + '.)';
    });
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

  /* ---------------- custom decks: rules check, build, text import/export (Core Rules 103) ---------------- */
  var DOMAIN_LIST = ['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order'];
  function cardDomList(c) { return (c.domain || []).filter(function (d) { return DOMAIN_LIST.indexOf(d) >= 0; }); }
  // 103.2.b: a card is legal if all of its domains are in the legend's identity (no domain = any deck).
  function legalFor(c, legend) { var id = cardDomList(legend); return cardDomList(c).every(function (d) { return id.indexOf(d) >= 0; }); }
  function sharesTag(c, legend) { return (c.tags || []).some(function (t) { return (legend.tags || []).indexOf(t) >= 0; }); }
  // 103.3.a.2: champion units with a champion tag matching the legend
  function championsFor(legend) { return CARDS.filter(function (c) { return c.type === 'Unit' && c.supertype === 'Champion' && sharesTag(c, legend); }); }
  function deckPool(legend) {
    return CARDS.filter(function (c) {
      if (c.type === 'Legend' || c.type === 'Battlefield' || !legalFor(c, legend)) return false;
      return c.supertype !== 'Signature' || sharesTag(c, legend);
    });
  }
  function battlefieldPool(legend) { return CARDS.filter(function (c) { return c.type === 'Battlefield' && (!legend || legalFor(c, legend)); }); }
  function cardSimulated(c) { return c.P.lines.every(function (l) { return l.sim; }); }
  // Check a deck spec { legend, champion, runes: {Domain: n}, bfs: [names], list: [[n, name]] } against Core Rules 103.
  function validateDeck(spec) {
    var errors = [], warns = [], leg = spec.legend && findCard(spec.legend).c, total = 0, sig = 0, unsim = [], banned = [];
    if (!leg || leg.type !== 'Legend') errors.push('Choose a Champion Legend.');
    var champ = spec.champion && findCard(spec.champion).c;
    if (leg && (!champ || champ.type !== 'Unit' || champ.supertype !== 'Champion' || !sharesTag(champ, leg))) errors.push('Choose a Chosen Champion whose champion tag matches ' + (leg ? leg.name : 'the legend') + '.');
    var seen = {};
    (spec.list || []).forEach(function (e) {
      var c = findCard(e[1]).c;
      if (!c) { errors.push('Unknown card: ' + e[1] + '.'); return; }
      total += e[0]; seen[c.name] = (seen[c.name] || 0) + e[0];
      if (c.type === 'Legend' || c.type === 'Battlefield') errors.push(c.name + " can't be in the main deck.");
      if (leg && !legalFor(c, leg)) errors.push(c.name + ' (' + cardDomList(c).join('/') + ") is outside " + leg.name + "'s domains.");
      if (c.supertype === 'Signature') { sig += e[0]; if (leg && !sharesTag(c, leg)) errors.push(c.name + ' is a Signature card of another champion.'); }
      if (!cardSimulated(c) && unsim.indexOf(c.name) < 0) unsim.push(c.name);
      if (c.banned && banned.indexOf(c.name) < 0) banned.push(c.name);
    });
    Object.keys(seen).forEach(function (n) { if (seen[n] > 3) errors.push('At most 3 copies of ' + n + ' (you have ' + seen[n] + ').'); });
    if (champ && !seen[champ.name]) errors.push('The main deck must include your Chosen Champion, ' + champ.name + '.');
    if (total < 40) errors.push('The main deck needs at least 40 cards, champion included (' + total + ' now).');
    if (sig > 3) errors.push('At most 3 Signature cards (' + sig + ' now).');
    var runes = 0, idt = leg ? cardDomList(leg) : [];
    Object.keys(spec.runes || {}).forEach(function (d) { runes += spec.runes[d]; if (leg && spec.runes[d] && idt.indexOf(d) < 0) errors.push(d + ' runes are outside the legend\'s domains.'); });
    if (runes !== 12) errors.push('The rune deck needs exactly 12 runes (' + runes + ' now).');
    var bfs = (spec.bfs || []).map(function (n) { return findCard(n).c; });
    if (bfs.length !== 3 || bfs.some(function (b) { return !b || b.type !== 'Battlefield'; })) errors.push('Choose 3 battlefields.');
    if (bfs.filter(Boolean).some(function (b, i, a) { return a.indexOf(b) !== i; })) errors.push('Battlefields must have different names.');
    if (leg && !cardSimulated(leg) && unsim.indexOf(leg.name) < 0) unsim.unshift(leg.name);
    bfs.forEach(function (b) { if (b && !cardSimulated(b) && unsim.indexOf(b.name) < 0) unsim.push(b.name); });
    bfs.forEach(function (b) { if (b && b.banned && banned.indexOf(b.name) < 0) banned.push(b.name); });
    if (leg && leg.banned) banned.unshift(leg.name);
    // 103.3.e: banned cards are illegal in tournaments; allowed here for casual games, with a warning.
    if (banned.length) warns.push('Banned in tournament play: ' + banned.join(', ') + '.');
    if (unsim.length) warns.push(unsim.length + " card" + (unsim.length > 1 ? 's have' : ' has') + " text the simulator doesn't fully handle yet: " + unsim.join(', ') + '.');
    return { ok: !errors.length, errors: errors, warnings: warns, total: total, runes: runes, signature: sig, unsimulated: unsim, banned: banned };
  }
  function makeDeck(spec) {
    var d = { id: spec.id, name: spec.name || 'Custom deck', label: spec.label || 'Your deck', legend: spec.legend, champion: spec.champion,
      runes: Object.assign({}, spec.runes), bfs: (spec.bfs || []).slice(), list: (spec.list || []).map(function (e) { return [e[0], e[1]]; }), custom: true };
    if (spec.planId) d.planId = spec.planId;   // play with another deck's researched plan (tester decks)
    resolveDeck(d);
    return d;
  }
  // Text decklists: section headers (Legend, Champion, Main Deck, Battlefields, Runes, Sideboard) are optional;
  // lines are "3 Card Name", "3x Card Name" or "Card Name x3"; rune lines are "6 Fury Rune" or "6 Fury".
  function parseDeckText(text) {
    var spec = { name: '', legend: null, champion: null, runes: {}, bfs: [], list: [] }, unknown = [], section = null, mainSeen = {};
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var line = raw.replace(/\s+/g, ' ').trim();
      if (!line || /^(#|\/\/)/.test(line)) return;
      var hm = line.match(/^(legend|champion legend|chosen champion|champion|main ?deck|main|deck|battlefields?|runes?|rune deck|side ?board|sideboard|name|deck name)\s*:?\s*(.*)$/i);
      if (hm && (/:\s*/.test(line) || !hm[2])) {
        var h = hm[1].toLowerCase();
        section = /side/.test(h) ? 'side' : /rune/.test(h) ? 'runes' : /battle/.test(h) ? 'bfs' : /chosen|^champion$/.test(h) ? 'champion' : /legend/.test(h) ? 'legend' : /name/.test(h) ? 'name' : 'main';
        if (section === 'name') { spec.name = hm[2]; section = null; return; }
        if (!hm[2]) return;
        line = hm[2];
      }
      if (section === 'side') return;
      var m = line.match(/^(\d+)\s*x?\s+(.+)$/i) || line.match(/^(.+?)\s+x\s*(\d+)$/i), n = 1, name = line;
      if (m) { if (/^\d+$/.test(m[1])) { n = +m[1]; name = m[2]; } else { name = m[1]; n = +m[2]; } }
      name = name.replace(/\s*\[[A-Za-z0-9*-]+\]\s*$/, '').replace(/\s*\([A-Z0-9]{2,5}\)\s*[\w-]*$/, '').replace(/\s+[A-Z]{2,4}-\d{3}[a-z*]?$/, '').trim();
      var rd = name.match(/^(fury|calm|mind|body|chaos|order)( rune)?s?$/i);
      if (rd || section === 'runes') {
        var dom = rd ? rd[1][0].toUpperCase() + rd[1].slice(1).toLowerCase() : null;
        if (dom) spec.runes[dom] = (spec.runes[dom] || 0) + n; else unknown.push(line);
        return;
      }
      var c = findCard(name).c;
      if (!c) { unknown.push(line); return; }
      if (c.type === 'Legend') { spec.legend = c.name; return; }
      if (c.type === 'Battlefield') { for (var i = 0; i < n; i++) if (spec.bfs.indexOf(c.name) < 0) spec.bfs.push(c.name); return; }
      if (section === 'champion') { spec.champion = c.name; if (mainSeen.__champ !== c.name) { mainSeen.__champ = c.name; addMain(c.name, n); } return; }
      addMain(c.name, n);
    });
    function addMain(name, n) { var e = spec.list.filter(function (x) { return x[1] === name; })[0]; if (e) e[0] += n; else spec.list.push([n, name]); }
    // No champion section: pick the first champion unit in the list that matches the legend.
    var leg = spec.legend && findCard(spec.legend).c;
    if (!spec.champion && leg) { var ce = spec.list.filter(function (e) { var c = findCard(e[1]).c; return c && c.supertype === 'Champion' && sharesTag(c, leg); })[0]; if (ce) spec.champion = ce[1]; }
    if (!spec.name && leg) spec.name = leg.name.split(/ - |, /)[0] + ' (imported)';
    return { spec: spec, unknown: unknown };
  }
  function deckToText(spec) {
    var champ = spec.champion, rest = (spec.list || []).map(function (e) { return [e[1] === champ ? e[0] - 1 : e[0], e[1]]; }).filter(function (e) { return e[0] > 0; });
    var byType = function (t) { return rest.filter(function (e) { var c = findCard(e[1]).c; return c && c.type === t; }); };
    var out = ['Legend:', '1 ' + (spec.legend || ''), '', 'Champion:', '1 ' + (champ || ''), '', 'Main Deck:'];
    ['Unit', 'Spell', 'Gear'].forEach(function (t) { byType(t).forEach(function (e) { out.push(e[0] + ' ' + e[1]); }); });
    out.push('', 'Battlefields:'); (spec.bfs || []).forEach(function (b) { out.push('1 ' + b); });
    out.push('', 'Runes:'); Object.keys(spec.runes || {}).forEach(function (d) { if (spec.runes[d]) out.push(spec.runes[d] + ' ' + d + ' Rune'); });
    return out.join('\n');
  }
  // Canonical spec (official card names) for a built-in or custom deck.
  function specOf(d) {
    var cn = function (n) { var c = findCard(n).c; return c ? c.name : n; }, list = [];
    d.list.forEach(function (e) { var n = cn(e[1]), x = list.filter(function (y) { return y[1] === n; })[0]; if (x) x[0] += e[0]; else list.push([e[0], n]); });
    return { id: d.id, name: d.name, legend: cn(d.legend), champion: cn(d.champion), runes: Object.assign({}, d.runes), bfs: d.bfs.map(cn), list: list };
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
      // Equipment: "+N Might <ability>" — the Might is mightBonus; the ability belongs to the unit it's attached to
      // ("I"/"me" = the equipped unit), so parse it as unit text into hostTrig / grantKw.
      var hm = type === 'Gear' && t.match(/^\+(\d+) Might\b\s*(.*)$/i);
      if (hm) {
        var ht = hm[2].trim();
        if (!ht) { line.sim = true; return; }
        var sub = parseCard({ name: c.name, type: 'Unit', rich: '<p>' + ht + '</p>', plain: ht, tags: [] });
        if (sub.lines.length && sub.lines.every(function (l) { return l.sim; })) {
          P.hostTrig = P.hostTrig || {};
          Object.keys(sub.trig).forEach(function (ev) { P.hostTrig[ev] = (P.hostTrig[ev] || []).concat(sub.trig[ev]); });
          var hk = Object.assign({}, sub.kw); delete hk.entersready;
          if (Object.keys(hk).length) P.grantKw = Object.assign(P.grantKw || {}, hk);
          line.sim = true;
        }
        return;
      }
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
    // Nov 2026 decks: keywords while Mighty (Fiora, Victorious), chosen on becoming ready (Jayce, Hammer in Hand),
    // at three Empowers (Kayle, Justified), and Ganking from friendly gear here (Portable Portal)
    if (u.c.P.mightyKw && baseMight(u) >= 5) k = Object.assign({}, k, u.c.P.mightyKw);
    if (u.turnKw && u.G && u.turnKw.turn === u.G.turnNo) k = Object.assign({}, k, u.turnKw.kw);
    if (u.c.P.empKw && (u.empCount || 0) >= 3) k = Object.assign({}, k, u.c.P.empKw);
    if (u.G && u.loc !== 'base' && u.G.players[u.ctrl].gear.some(function (g) { return g.loc === u.loc && g.c.P.gankHere; })) k = Object.assign({}, k, { ganking: true });
    return u.kwx ? Object.assign({}, k, u.kwx) : k;
  }
  // Might without keyword-based parts (used to decide Mighty-only keywords without recursion)
  function baseMight(u) {
    return (u.mightOverride != null ? u.mightOverride : (u.c.might || 0)) + u.buff + u.temp + equipBonus(u) + (u.empowered && u.c.P.empoweredMight || 0) +
      (u.c.P.bonusMight && u.G ? u.c.P.bonusMight(u.G, u) : 0);
  }
  // Does this unit deal combat damage? (stunned units don't; Orianna, Exquisite needs a friendly gear at her location)
  function dealsDamage(u) {
    if (u.stun) return false;
    if (u.c.P.noCombatDamage) return false;   // Graves, Blasting Through deals his damage on attack/defend instead
    if (u.c.P.needsGearHere && u.G && !gearAtLoc(u.G, u.ctrl, u.loc)) return false;
    return true;
  }
  function gearAtLoc(G, pi, loc) {
    return G.players[pi].gear.some(function (g) { return (g.loc || 'base') === loc; }) ||
      G.units.some(function (v) { return v.ctrl === pi && v.loc === loc && (v.equips.length || v.animatedGear); });
  }
  function equipBonus(u) {
    var G = u.G;
    return u.equips.reduce(function (s, g) {
      var P = g.c.P, b = P.equipBonus || 0;
      if (P.freshBonus && G && g.attachTurn === G.turnNo) b += P.freshBonus;                       // Brutalizer
      if (P.levelBonus && G && G.players[u.ctrl].xp >= P.levelBonus.level) b += P.levelBonus.n;   // Soul Sword
      if (P.pairBonus && G && u.loc !== 'base' && unitsAt(G, u.loc, u.ctrl).length === 2) b += P.pairBonus;   // Hand Hammer
      return s + b;
    }, 0);
  }
  function might(u, role) {
    var k = kwOf(u);
    var m = (u.mightOverride != null ? u.mightOverride : (u.c.might || 0)) + u.buff + u.temp + equipBonus(u) + (u.empowered && u.c.P.empoweredMight || 0) + (u.G ? auraMight(u.G, u) : 0) +
      (u.c.P.bonusMight && u.G ? u.c.P.bonusMight(u.G, u) : 0);
    if (role === 'att') m += (k.assault || 0) + (u.tempAssault || 0);
    if (role === 'def') m += (k.shield || 0) + (u.combatShield || 0) + (u.G && u.loc !== 'base' ? u.G.players[u.ctrl].gear.reduce(function (s3, g) { return s3 + (g.loc === u.loc && g.c.P.shieldHere ? g.c.P.shieldHere : 0); }, 0) : 0);
    var G0 = u.G;
    if (G0 && u.loc !== 'base') {
      var bn = norm(G0.bfs[u.loc].c.name);
      if (bn === 'trifarianwarcamp') m += 1;
      if (bn === 'packedamphitheater' && u.c.supertype === 'Champion') m += 1;
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
    var G = { players: [], units: [], bfs: [], active: 0, playedThisTurn: 0, playedBy: [0, 0], turnNo: 0, log: [], winner: null, rnd: rnd, onLog: opts.onLog || null, maxTurns: opts.maxTurns || 0,
      aiLevel: opts.aiLevel || [AI_LEVEL, AI_LEVEL] };
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
    G.human = opts.human != null ? opts.human : -1;
    G.ask = opts.ask || null;
    if (opts.onCreate) opts.onCreate(G);
    G.first = Math.floor(rnd() * 2);
    for (var mp = 0; mp < 2; mp++) await mulligan(G, (G.first + mp) % 2);
    G.active = G.first;
    log(G, (G.first === 0 ? G.players[0].name + ' go' : G.players[1].name + ' goes') + ' first. Battlefields: ' + bfName(G, 0) + ' and ' + bfName(G, 1) + '.');
    // Per-player stats used for the post-game tips.
    G.stats = [0, 1].map(function () { return { unspent: 0, idle: 0, attacks: 0, attacksWon: 0, attacksBounced: 0, attacksLost: 0, conquerPts: 0, holdPts: 0, otherPts: 0, unitsLost: 0, played: 0, turns: 0, emptyBfTurns: 0, cardsLeft: 0 }; });
    await startTurn(G);
    return G;
  }

  // Mulligan: set aside up to 2 cards from the opening hand, draw that many, then put the set-aside cards on the bottom of the deck.
  async function mulligan(G, pi) {
    var p = G.players[pi], aside = [], opening = p.hand.map(function (c) { return c.c.name; });
    while (aside.length < 2) {
      var hand = p.hand.filter(function (c) { return aside.indexOf(c) < 0; });
      var k = await ask(G, pi, { type: 'choice', title: 'Mulligan', text: 'Pick a card to set aside and redraw (' + (2 - aside.length) + ' left). Set-aside cards go to the bottom of your deck.',
        options: hand.map(function (c) { return c.c.name + (c.c.type === 'Unit' ? ' (' + (c.c.energy || 0) + ' energy, ' + (c.c.might || 0) + ' Might)' : ' (' + (c.c.energy || 0) + ' energy)'); }),
        cards: hand.map(function (c) { return c.c.name; }), optional: true, skipLabel: aside.length ? 'Keep the rest' : 'Keep this hand', auto: aiMulliganPick(G, pi, hand) });
      if (k == null || !hand[k]) break;
      aside.push(hand[k]);
    }
    event(G, { t: 'mulligan', pi: pi, hand: opening, aside: aside.map(function (c) { return c.c.name; }) });   // for the post-game coach
    if (!aside.length) return;
    aside.forEach(function (c) { p.hand.splice(p.hand.indexOf(c), 1); });
    for (var i = 0; i < aside.length; i++) drawOne(G, pi, true);
    shuffle(aside, G.rnd).forEach(function (c) { p.deck.push(c); });
    log(G, p.name + ' mulligan' + (pi === 0 ? '' : 's') + ' ' + aside.length + ' card' + (aside.length > 1 ? 's' : '') + (pi === 0 ? ' (' + aside.map(function (c) { return c.c.name; }).join(', ') + ')' : '') + '.', pi);
  }
  // AI mulligan: keep the cards the deck guide says pros keep; send back the guide's "toss" cards, then expensive cards.
  function aiMulliganPick(G, pi, hand) {
    var A = aiOf(G, pi), keep = A.mullN || {}, toss = A.tossN || {}, best = null, bv = 0;
    hand.forEach(function (c, i) {
      var nm = norm(c.c.name), e = c.c.energy || 0, v = 0;
      if (keep[nm]) return;
      if (toss[nm]) v = 3 + e * 0.1;
      else if (e >= 5) v = 1 + e * 0.1;
      else if (Object.keys(keep).length && e >= 4) v = 0.5 + e * 0.1;
      if (v > bv) { bv = v; best = i; }
    });
    return best;
  }

  /* ---------------- resources ---------------- */
  function drawOne(G, pi, silent) {
    var p = G.players[pi];
    if (!p.deck.length) {
      p.deck = shuffle(p.trash.splice(0), G.rnd);
      log(G, p.name + ' burned out: trash shuffled into a new deck, ' + G.players[opp(pi)].name + ' scores 1.', pi);
      addPoints(G, opp(pi), 1, p.name + ' burned out');
      if (G.winner != null || !p.deck.length) return;
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
    // Seraphic Wyvern: channel that many runes plus 1 exhausted rune instead
    if (got && G.units.some(function (v) { return v.ctrl === pi && v.c.P.extraChannel && !v.dead; }) && p.runeDeck.length) { p.runes.push({ d: p.runeDeck.shift(), ex: true }); got++; log(G, 'Seraphic Wyvern: +1 rune channelled exhausted.', pi); }
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
  function poolPowerFor(p) { return (p.poolPower || 0) + (p.payingUnitOrGear ? (p.poolPowerUG || 0) : 0) + (p.payingSpell ? (p.poolPowerSpell || 0) : 0) + (p.payingGear ? (p.poolPowerGear || 0) : 0); }
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
    while (power > 0 && p.payingSpell && p.poolPowerSpell > 0) { p.poolPowerSpell--; power--; }
    while (power > 0 && p.payingGear && p.poolPowerGear > 0) { p.poolPowerGear--; power--; }
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
    if (from === 'hidden') { e = 0; pw = 0; }
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
    if (G.ask && G.human === pi && G.winner == null) {
      var ans = await G.ask(req, pi);
      if (G.recordHuman && req.type !== 'combat' && req.type !== 'info') recordDecision(G, pi, { k: 'ask', type: req.type, title: req.title || '', text: req.text || '',
        options: req.options || (req.cands ? req.cands.map(function (id) { var u = G.units.filter(function (x) { return x.uid === id; })[0]; return u ? u.c.name : String(id); }) : null),
        human: ans == null ? null : ans, bot: req.auto == null ? null : req.auto });
      return ans;
    }
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
    return p.runes.length + (p.poolPower || 0) + dom + (p.payingUnitOrGear ? (p.poolPowerUG || 0) : 0) + (p.payingSpell ? (p.poolPowerSpell || 0) : 0) + (p.payingGear ? (p.poolPowerGear || 0) : 0) + p.gear.filter(function (g) { return !g.ex && g.c.P.addPower; }).length;
  }
  function payAnyPower(G, pi, n, why) {
    var p = G.players[pi];
    for (var i = 0; i < n; i++) {
      if (p.payingUnitOrGear && p.poolPowerUG > 0) { p.poolPowerUG--; continue; }
      if (p.payingSpell && p.poolPowerSpell > 0) { p.poolPowerSpell--; continue; }
      if (p.payingGear && p.poolPowerGear > 0) { p.poolPowerGear--; continue; }
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
      label: 'Exhaust: on your turn, move a friendly unit in this showdown to base (and ready it if I\'m empowered)', energy: 0, exhaust: true, timing: 'action',
      req: function (G, pi) { return G.active !== pi ? 'Only on your turn.' : G.showdownAt == null ? 'Only during a showdown.' : null; },
      getEffs: function (G, pi, L) {
        var e = [{ op: 'tobase', t: { sel: 'friendly', where: 'here' } }];
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
      // AI: only worth it on your own turn outside combat, when the readied unit can still move.
      if (!(await confirm(G, pi, L.c.name, 'Exhaust Irelia and recycle 1 rune to ready ' + u.c.name + '?', u.ex && G.active === pi && G.showdownAt == null))) return;
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
    if (!(await confirm(G, pi, L.c.name, 'Discard a card and exhaust LeBlanc to play a ready Reflection at ' + bfName(G, loc) + ' that copies a unit there (it has Temporary)?', true))) return;
    // the player picks the discard (the AI defaults to its cheapest card)
    G.cardsHint = p.hand; var di = await choose(G, pi, L.c.name, 'Choose a card to discard', p.hand.map(function (x) { return x.c.name; }), false, p.hand.indexOf(worst));
    if (di != null && p.hand[di]) worst = p.hand[di];
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
    var hint = G.cardsHint; G.cardsHint = null;
    var cards = hint && hint.length === options.length ? hint.map(function (x) { return x && x.c ? x.c.name : null; }) : null;
    var r = await ask(G, pi, { type: 'choice', title: title, text: text, options: options, cards: cards, optional: !!optional, auto: auto == null ? (optional ? null : 0) : auto });
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
  async function playFree(G, pi, card, loc, title, paid) {
    var c = card.c, p = G.players[pi];
    var u = makeUnit(G, pi, c, card.iid, loc, !!c.P.kw.entersready, false);
    log(G, title + ': ' + p.name + ' play' + (pi === 0 ? '' : 's') + ' ' + c.name + ' to ' + locName(G, loc) + (paid ? '' : ' for free') + '.', pi);

    G.playedThisTurn++; G.playedBy[pi]++;
    var lsc = p.legend.c && p.legend.c.P.script;
    if (lsc && lsc.onPlayCard) lsc.onPlayCard(G, pi, 'elsewhere');
    await unitEntered(G, pi, u, 'elsewhere');
    await fireLegend(G, pi, 'playUnit', { loc: loc });
    await resolveEffects(G, pi, playEffects(c), { src: u, loc: loc, srcName: c.name });
    if (loc !== 'base' && !u.dead && G.winner == null) {
      var enemies = unitsAt(G, loc, opp(pi));
      if (enemies.length) await combat(G, pi, loc, [u], enemies);
      else if (G.bfs[loc].ctrl !== pi) await contest(G, pi, loc);
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
        G.cardsHint = units; k = await choose(G, pi, ctx.srcName, 'Top ' + e.n + ': ' + top.map(function (x) { return x.c.name; }).join(', ') + '. Reveal a unit and draw it?', units.map(function (x) { return x.c.name; }), true, v.indexOf(Math.max.apply(null, v)));
      }
      var got = k != null ? units[k] : null;
      if (got) { p.hand.push(got); log(G, (ctx.srcName || 'Effect') + ': ' + p.name + ' reveal' + (pi === 0 ? '' : 's') + ' and draw' + (pi === 0 ? '' : 's') + ' ' + got.c.name + '.', pi); }
      top.forEach(function (x) { if (x !== got) p.deck.push(x); });
    },
    fromHand: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi], units = p.hand.filter(function (x) { return x.c.type === 'Unit' && canPay(p, 0, x.c.power || 0, cardDomains(x.c)); });
      if (!units.length) return;
      var v = units.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); });
      G.cardsHint = units; var k = await choose(G, pi, ctx.srcName, 'Play a unit from your hand to your base, ignoring its Energy cost (you pay its power):', units.map(function (x) { return x.c.name; }), false, v.indexOf(Math.max.apply(null, v)));
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
      G.cardsHint = spells; var k = await choose(G, pi, ctx.srcName, 'Give a spell in your trash Flow (cast it again this turn from the Trash for its cost):', spells.map(function (x) { return x.c.name + ' (' + (x.c.energy || 0) + ' energy)'; }), false, v.indexOf(Math.max.apply(null, v)));
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
      G.cardsHint = spells; var k = await choose(G, pi, ctx.srcName, 'Play a spell (3 energy or less) from your trash for free (you pay its power)? It is recycled after.', spells.map(function (x) { return x.c.name; }), true, Math.max.apply(null, v) >= 1.5 ? v.indexOf(Math.max.apply(null, v)) : null);
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
      else { u.stun = 1; log(G, (ctx.srcName || 'Effect') + ' stuns ' + u.c.name + '.', pi); }
    },
    moveUnit: async function (G, pi, e, tg, ctx) { await moveChosen(G, pi, tg[0], ctx.srcName); if (e.ready && !tg[0].dead) { tg[0].ex = false; log(G, tg[0].c.name + ' readies.', pi); } },
    killGear: async function (G, pi, e, tg, ctx) {
      var all = [];
      G.players.forEach(function (pl) { pl.gear.forEach(function (g) { all.push({ g: g, pl: pl, host: null }); }); });
      G.units.forEach(function (u) { u.equips.forEach(function (g) { all.push({ g: g, pl: G.players[u.owner], host: u }); }); });
      if (!all.length) return;
      var auto = all.map(function (x) { return x.pl.pi !== pi; }).indexOf(true);
      G.cardsHint = all.map(function (q) { return q.g; }); var k = await choose(G, pi, ctx.srcName, 'Kill a gear?', all.map(function (x) { return x.g.c.name + (x.pl.pi === pi ? ' (yours)' : ' (AI)') + (x.host ? ' on ' + x.host.c.name : ''); }), true, auto < 0 ? null : auto);
      if (k == null) return;
      var x = all[k];
      if (x.host) x.host.equips.splice(x.host.equips.indexOf(x.g), 1); else x.pl.gear.splice(x.pl.gear.indexOf(x.g), 1);
      if (x.g.c.P.onLeave) await resolveEffects(G, x.pl.pi != null ? x.pl.pi : G.players.indexOf(x.pl), x.g.c.P.onLeave, { src: null, loc: null, srcName: x.g.c.name });
      x.pl.trash.push(x.g);
      log(G, (ctx.srcName || 'Effect') + ' kills ' + x.g.c.name + '.', pi);
    },
    recur: async function (G, pi, e, tg, ctx) {
      var p = G.players[pi];
      for (var n = 0; n < e.n; n++) {
        var units = p.trash.filter(function (x) { return x.c.type === 'Unit'; });
        if (!units.length) return;
        var best = units.map(function (x) { return x.c.energy || 0; }); var auto = best.indexOf(Math.max.apply(null, best));
        G.cardsHint = units; var k = await choose(G, pi, ctx.srcName, 'Return a unit from your trash to your hand (' + (n + 1) + ' of ' + e.n + ')', units.map(function (x) { return x.c.name; }), true, auto);
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
        if (e.full) { p.payingUnitOrGear = true; var ok = canPay(p, x.c.energy || 0, x.c.power || 0, cardDomains(x.c)); p.payingUnitOrGear = false; return ok; }
        return canPay(p, 0, x.c.power || 0, cardDomains(x.c));
      });
      if (!units.length) { log(G, (ctx.srcName || 'Effect') + ': no unit in your trash you can pay for.', pi); return; }
      var v = units.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); }); var auto = v.indexOf(Math.max.apply(null, v));
      G.cardsHint = units; var k = await choose(G, pi, ctx.srcName, e.free ? 'Play a unit from your trash to your base for free?' : e.full ? 'Play a unit from your trash? (you pay its full cost)' : 'Play a unit from your trash (you still pay its power):', units.map(function (x) { return x.c.name + ' (' + (x.c.might || 0) + ' Might)'; }), !!e.optional, auto);
      if (k == null) return;
      var card = units[k];
      if (e.full) { p.payingUnitOrGear = true; pay(G, pi, card.c.energy || 0, card.c.power || 0, cardDomains(card.c)); p.payingUnitOrGear = false; }
      else if (!e.free) pay(G, pi, 0, card.c.power || 0, cardDomains(card.c));
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
      G.cardsHint = non; var k = await choose(G, pi, ctx.srcName, 'Recycle a non-unit card from their hand:', non.map(function (x) { return x.c.name; }), false, auto);
      if (k == null) return;
      o.hand.splice(o.hand.indexOf(non[k]), 1); o.deck.push(non[k]);
      log(G, (ctx.srcName || 'Effect') + ' recycles ' + non[k].c.name + ' from ' + o.name + "'s hand.", pi);
    },
    thrill: async function (G, pi, e, tg, ctx) {
      var u = tg[0];
      G.cardsHint = G.bfs; var k = await choose(G, pi, ctx.srcName, 'Play ' + u.c.name + ' to which battlefield?', G.bfs.map(function (b) { return b.c.name; }), false,
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
      G.cardsHint = top; var k = await choose(G, pi, ctx.srcName, 'Choose a card to draw; the rest go to your trash.', top.map(function (x) { return x.c.name + ' (' + x.c.type + ')'; }), true, auto);
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
        G.cardsHint = ok; k = await choose(G, pi, ctx.srcName, 'Top 5: ' + top.map(function (x) { return x.c.name; }).join(', ') + '. Play a unit with Might ≤ ' + lim + ' for free?', ok.map(function (x) { return x.c.name + ' (' + (x.c.might || 0) + ' Might)'; }), true, v.indexOf(Math.max.apply(null, v)));
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
  // AI strength (4 = level 3 scored by the self-play model EVAL_MODEL instead of hand-set weights):
  // 0 = greedy card-by-card (frozen baseline), 1 = also scores gear/unit abilities and combo enablers,
  // 2 = also follows the deck guide's sequencing rules (guides.json ai.rules), 3 = also looks ahead: each step it tries
  // its best few plays (and "stop playing") on copies of the game, plays out the rest of the turn and the opponent's
  // reply with the level-2 AI, and picks the play whose line ends best.
  var AI_LEVEL = 7;
  function aiLvl(G, pi) { return G.aiLevel ? G.aiLevel[pi] : AI_LEVEL; }
  var OPS_VALUE = {
    lookDraw: function () { return 1.8; },
    recur: function (G, pi, e) { return Math.min(e.n, G.players[pi].trash.filter(function (x) { return x.c.type === 'Unit'; }).length) * 1.6; },
    reanimate: function (G, pi) { var u = G.players[pi].trash.filter(function (x) { return x.c.type === 'Unit'; }); return u.length ? Math.max.apply(null, u.map(function (x) { return (x.c.energy || 0) + (x.c.might || 0); })) : -5; },
    sabotage: function (G, pi) { return G.players[opp(pi)].hand.some(function (x) { return x.c.type !== 'Unit'; }) ? 1.5 : 0; },
    killGear: function (G, pi) { return G.players[opp(pi)].gear.length || G.units.some(function (u) { return u.ctrl !== pi && u.equips.length; }) ? 1.5 : 0; },
    drawIf: function (G, pi, e) { return 1.6 * e.n; },
    ctrlDraw: function (G, pi, e) { return -1.2 * e.n; },
    empowerSelf: function () { return 2; },
    kayleEmpower: function () { return 2.2; },
    spendBuffMight: function () { return 0; },   // keep the buff (Sett's legend saves buffed units); the AI spends it only as a last resort
    bounceOwn: function () { return 0; },
    forgeRecycle: function () { return 0.3; },
    listShrink: function (G, pi) { return G.units.some(function (u) { return u.ctrl !== pi && u.loc !== 'base'; }) ? 1.2 : 0; },
    // custom effects of the Nov 2026 cards (without these the AI scored their spells at 0 and never cast them)
    offer: function (G, pi) { return G.players[opp(pi)].gear.some(function (g) { return g.c.supertype !== 'Token'; }) || G.units.some(function (u) { return u.ctrl !== pi && u.equips.length; }) ? 2 : 0; },
    playerDiscard: function (G, pi) { return G.players[opp(pi)].hand.length ? 1.2 : 0; },
    nameTag: function () { return 0.5; },
    blink: function () { return 0.6; },
    empyrean: function () { return 3.2; },
    drawPerMighty: function (G, pi) { return 1.6 * unitsOf(G, pi).filter(function (u) { return might(u) >= 5; }).length; },
    splitDamage: function (G, pi, e) { return e.n / 2; },
    poppy: function (G, pi) { return G.players[opp(pi)].points >= WIN - 3 ? 2 : 0; },
    payStun: function (G, pi) { return energyAvail(G.players[pi]) >= 2 && G.units.some(function (u) { return u.ctrl !== pi; }) ? 1 : 0; },
    returnGearCost: function () { return -0.5; },
    payReadyHere: function () { return 0.4; },
    channelBoth: function () { return 0.5; },
    blastMight: function () { return 1; },
    shrinkOne: function (G) { return G.showdownAt != null ? 2 : 0.2; },
    spendBuffCost: function () { return 0; },
    spendBuffDraw: function () { return 0.8; },
    stormbringer: function (G, pi) {   // the best battlefield: enemy Might it would kill there
      var base = unitsAt(G, 'base', pi); if (!base.length) return 0;
      var n = Math.max.apply(null, base.map(function (u) { return might(u); }));
      return Math.max.apply(null, G.bfs.map(function (b, i) { return unitsAt(G, i, opp(pi)).reduce(function (s2, u) { return s2 + (might(u, 'def') - u.damage <= n ? unitValue(u) + 1 : 0); }, 0); })) + 1;
    },
    avalanche: function (G, pi, e) {
      var v = 0; unitsAt(G, 'base').forEach(function (u) { if (might(u, 'def') - u.damage <= e.n) v += (u.ctrl === pi ? -1 : 1) * (unitValue(u) + 1); });
      return v;
    }
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
    noxushopeful: { sim: [0], costMod: function (G, pi) { return G.playedBy[pi] > 0 ? -2 : 0; } },
    fizztrickster: { sim: [0], play: [{ op: 'fizz' }] },
    tornadowarrior: { sim: [1], hiddenFx: [{ op: 'empowerTemp', t: T('friendly', 'here'), opt: true }] },
    baronnashor: { sim: [1, 2], untargetable: 'always', auraOthers: 2 },
    tideturner: { sim: [1], play: [{ op: 'swapLoc', t: T('friendly', null, { other: true }), opt: true }] },
    treasurehunter: { sim: [0] },
    leblancfragmented: { sim: [1], deathknell: [{ op: 'draw', n: 1 }, { op: 'beginningDraw' }] },
    honestbroker: { sim: [0] },
    karthuseternal: { sim: [0], doubleDeathknell: true },
    guardianangel: { sim: [1], hostSave: true },
    brutalizer: { sim: [1], freshBonus: 2 },
    soulsword: { sim: [1], levelBonus: { level: 3, n: 1 } },
    handhammer: { sim: [1], pairBonus: 2 },
    lastrites: { sim: [1], hostTrig: { conquer: [{ effs: [{ op: 'reanimate', full: true, optional: true }] }], hold: [{ effs: [{ op: 'reanimate', full: true, optional: true }] }] } },
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
      var m = l.text.match(/^\[Flow\] (\d+) energy((?: (?:rainbow|fury|calm|mind|body|chaos|order) rune)*)$/);
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
    ['onExhausted', 'grantKw', 'equipAltExhaust', 'needsGearHere', 'secondDrawBonus', 'shieldHere', 'onGearMove', 'gearPlayFx', 'gearConquerFx', 'onGearExhaust', 'drawOnTripleExhaust', 'entersReadyIf', 'playToBf', 'costMod', 'cheaperExtras', 'lethalDamage', 'endOfTurn', 'entersExhausted', 'addEnergy', 'gutterWin', 'levelKw', 'heronDiscount', 'attachFromHidden', 'grantAccelerate', 'empoweredDeathknell', 'readyOnGear', 'untargetable', 'auraOthers', 'doubleDeathknell', 'onSecondCard', 'onChosenOrReady', 'goldOnEnemyDeath', 'stunNewUnits', 'ambushAnywhere', 'hostSave', 'freshBonus', 'levelBonus', 'pairBonus', 'hostTrig', 'mightyKw', 'empKw', 'bonusMight', 'noCombatDamage', 'gankHere', 'readyMighty', 'extraChannel', 'noMoveToBase', 'onBecomeReady', 'friendExhaustMight', 'onLeave', 'readyOnGearPlay', 'hiddenPlayMight', 'gearDeathknell', 'spellMight', 'banishSelf', 'channelOnEnemyDeathHere'].forEach(function (k) { if (sc[k]) c.P[k] = sc[k]; });
    if (sc.defendFx) (c.P.trig.defend = c.P.trig.defend || []).push({ effs: sc.defendFx });
    if (sc.bfhold) (c.P.trig.bfhold = c.P.trig.bfhold || []).push({ effs: sc.bfhold });
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
      if (k.minPower != null && (spell.c.power || 0) < k.minPower) return false;
      return true;
    });
    for (var i = 0; i < options.length; i++) {
      var card = options[i], what = spell ? spell.c.name : (ctx.srcName || 'that ability');
      var aiWants = pickedUnit ? unitValue(pickedUnit) >= 4 : ((spell.c.energy || 0) + (spell.c.power || 0) >= 3 ||
        ((spell.c.energy || 0) + (spell.c.power || 0) >= 2 && (spell.c.P.spell || []).some(function (e) { return isHarmful(e) && e.t && e.t.sel !== 'friendly'; })));
      var text = G.players[caster].name + (caster === 0 ? ' are' : ' is') + ' ' + (pickedUnit ? 'targeting your ' + pickedUnit.c.name + ' with ' + what : 'casting ' + what) + '. Counter it with ' + card.c.name + '?';
      if (!(await confirm(G, pi, 'Reaction', text, aiWants))) continue;
      var cost = cardCost(card.c, false);
      pay(G, pi, cost.energy, cost.power, cost.domains);
      p.hand.splice(p.hand.indexOf(card), 1); p.trash.push(card);
      ctx.reacted = true;
      log(G, p.name + ' counter' + (pi === 0 ? '' : 's') + ' ' + what + ' with ' + card.c.name + '.', pi);
      var tax = card.c.P.counter.tax, cp = G.players[caster];
      if (tax && energyAvail(cp) >= tax && (await confirm(G, caster, card.c.name, 'Pay ' + tax + ' energy so ' + what + ' is not countered?', true))) {
        pay(G, caster, tax, 0, []); log(G, cp.name + ' pay' + (caster === 0 ? '' : 's') + ' ' + tax + ' energy: ' + what + ' resolves.', caster); return false;
      }
      if (card.c.P.counter.toHand && spell) { ctx.countered = 'hand'; log(G, spell.c.name + ' returns to its owner\'s hand.', pi); }
      if (card.c.P.counter.predict) await OPS.predict(G, pi, {}, [], { srcName: card.c.name });
      if (card.c.P.counter.mightToFriendly && spell && unitsOf(G, pi).length) {
        var mine2 = unitsOf(G, pi), best2 = mine2.slice().sort(function (a, b) { return might(b) - might(a); })[0];
        var rid = await ask(G, pi, { type: 'target', title: card.c.name, text: 'Give a friendly unit +' + (spell.c.energy || 0) + ' Might this turn', cands: mine2.map(function (x) { return x.uid; }), optional: false, auto: best2.uid });
        var ru = mine2.filter(function (x) { return x.uid === rid; })[0] || best2; ru.temp += spell.c.energy || 0; log(G, card.c.name + ' gives ' + ru.c.name + ' +' + (spell.c.energy || 0) + ' Might this turn.', pi);
      }
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
    p.payingGear = true; var okPay = canPay(p, a.energy || 0, a.power || 0, a.domain ? [a.domain] : []); p.payingGear = false;
    if (!okPay) return { ok: false, why: 'Needs ' + (a.energy || 0) + ' energy' + (a.power ? ' and ' + a.power + ' ' + a.domain + ' power' : '') + '.' };
    if ((a.effs || []).some(function (e) { return e.selfOk; }) && !unitsOf(G, pi).length) return { ok: false, why: 'You need a friendly unit to kill.' };
    if (a.discard && !p.hand.length) return { ok: false, why: 'You need a card in hand to discard.' };
    if (a.recycleTrash && p.trash.length < a.recycleTrash) return { ok: false, why: 'Needs ' + a.recycleTrash + ' cards in your trash.' };
    return { ok: true };
  }
  async function useGear(G, pi, iid, idx) {
    if (idx == null) idx = 0;
    var chk = canUseGear(G, pi, iid, idx);
    if (!chk.ok) return chk;
    if (G.probe) probeHit(G, actDesc(G, 'gear', pi, [iid, idx]));
    var p = G.players[pi], g = p.gear.filter(function (x) { return x.iid === iid; })[0], a = g.c.P.gearActs[idx];
    p.payingGear = true; pay(G, pi, a.energy || 0, a.power || 0, a.domain ? [a.domain] : []); p.payingGear = false;
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
    if (G.probe) probeHit(G, actDesc(G, 'equip', pi, [g, hostUid]));
    var p = G.players[pi], ec = g.c.P.equipCost || { energy: 0, power: [], recycleTrash: 0 };
    var units = unitsOf(G, pi), best = units.slice().sort(function (a, b) { return a.equips.length - b.equips.length || might(b) - might(a); })[0];
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
    host.equips.push(g); g.attachTurn = G.turnNo;
    log(G, g.c.name + ' is equipped to ' + host.c.name + ' (+' + g.c.P.equipBonus + ' Might).', pi);
    return { ok: true };
  }
  // [Hidden]: pay 1 power of any domain to put the card face down at a battlefield you control. Play it from a later turn for 0 energy, even as a reaction.
  function hideSpots(G, pi, iid) {
    var p = G.players[pi], card = p.hand.filter(function (x) { return x.iid === iid; })[0];
    if (!card || !card.c.P.kw.hidden || G.active !== pi || G.winner != null) return [];
    if (!anyPowerAvail(p)) return [];
    return G.bfs.map(function (b, i) { return i; }).filter(function (i) { return G.bfs[i].ctrl === pi && p.hidden.filter(function (h) { return h.loc === i; }).length < (bfNorm(G, i) === 'bandletree' ? 2 : 1); });
  }
  function hideCard(G, pi, iid, bi) {
    if (hideSpots(G, pi, iid).indexOf(bi) < 0) return { ok: false, why: "You can't hide that card there." };
    if (G.probe) probeHit(G, actDesc(G, 'hide', pi, [iid, bi]));
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
      // Ambush: only to a battlefield where you have units (Rengar's units also where enemies are) (rule 822)
      if (c.type === 'Unit') {
        var ambOk = unitsAt(G, bi, pi).length > 0 || (c.P.ambushAnywhere && unitsAt(G, bi, opp(pi)).length > 0);
        if (c.P.kw.ambush && ambOk && bfNorm(G, bi) !== 'rockfallpath' && canPlay(G, pi, card.iid, false, { reaction: true }).ok) out.push({ card: card, kind: 'ambush' });
        return;
      }
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
        var tn = trickN(c);
        if (winning && c.P.spell.some(function (e) { return (e.op === 'tohand' || e.op === 'tobase' || e.op === 'kill') && e.t && e.t.sel !== 'enemy'; })) v = 0;
        if (tn > 0) v = !winning && trickFlips(G, pi, bi, trickBonus(G, pi)) ? Math.max(v, 1.5) + tn : 0;
        else if (!winning && c.P.spell.some(function (e) { return e.op === 'stun'; })) v += 2;
      }
      if (v >= 1.5 && (!best || v > best.v)) best = { v: v, i: i };
    });
    return best ? best.i : null;
  }
  // Would adding n Might to our strongest unit here win the fight (attacker) or hold it (defender)?
  function trickFlips(G, pi, bi, n) {
    var mine = unitsAt(G, bi, pi);
    if (!mine.length || n <= 0) return false;
    var host = mine.slice().sort(function (a, b) { return might(b) - might(a); })[0], atk = G.active === pi;
    host.temp += n;
    var out = fightOutcome(G, G.active, bi);
    host.temp -= n;
    return atk ? out.attackerWins : !out.attackerWins;
  }
  function fightOutcome(G, pi, bi) {
    var att = unitsAt(G, bi, pi), def = unitsAt(G, bi, opp(pi));
    var aD = att.reduce(function (s, u) { return s + (dealsDamage(u) ? might(u, 'att') : 0); }, 0), dD = def.reduce(function (s, u) { return s + (dealsDamage(u) ? might(u, 'def') : 0); }, 0);
    var aT = att.reduce(function (s, u) { return s + Math.max(1, might(u, 'att')); }, 0), dT = def.reduce(function (s, u) { return s + Math.max(1, might(u, 'def')); }, 0);
    return { attackerWins: aD >= dT && dD < aT, defenderHolds: aD < dT };
  }
  // Showdown: the player who contested the battlefield acts first, then players alternate until both pass in a row (rules 345-348).
  // Each may play Reaction or Action spells, Ambush units, face-down cards or legend abilities here.
  // nonCombat: units moved to (or played at) a battlefield with no enemy units; the opponent may still respond before it is conquered.
  async function showdown(G, attacker, bi, nonCombat, resume) {
    G.showdownAt = bi;
    var passes = resume ? resume.passes : 0, side = resume ? resume.side : attacker;
    for (var round = 0; round < 50 && passes < 2 && G.winner == null; round++) {
      if (!unitsAt(G, bi, attacker).length || (!nonCombat && !unitsAt(G, bi, opp(attacker)).length)) break;
      if (nonCombat && unitsAt(G, bi, opp(attacker)).length) break;
      var opts = showdownOptions(G, side, bi), pick = null;
      if (opts.length) {
        var out = nonCombat ? { attackerWins: true, defenderHolds: false } : fightOutcome(G, attacker, bi), winning = side === attacker ? out.attackerWins : out.defenderHolds;
        var labels = opts.map(function (o) { return o.kind === 'legend' ? 'Legend: ' + o.label : (o.kind === 'hidden' ? 'Hidden: ' : o.kind === 'ambush' ? 'Ambush: ' : '') + o.card.c.name + ' (' + cardCost(o.card.c, false, G, side, o.kind === 'hidden' ? 'hidden' : 'hand').energy + ' energy)'; });
        G.cardsHint = opts.map(function (o) { return o.card; });
        var aiPick = nonCombat && side === attacker ? null : aiShowdownPick(G, side, bi, opts, winning);
        if ((aiLvl(G, side) >= 5 || (G.recordHuman && G.human === side)) && !G.isClone && (G.human !== side || G.recordHuman) && !(nonCombat && side === attacker)) aiPick = await aiShowdownLookahead(G, side, attacker, bi, nonCombat, opts, passes, aiPick);
        pick = await choose(G, side, 'Showdown at ' + bfName(G, bi), nonCombat ? (side === attacker ? 'You moved in here. Play something before you take it?' : 'The opponent moved onto ' + bfName(G, bi) + '. Respond before they take it?')
          : (side === attacker ? 'You are attacking' : 'You are defending') + ' — play something before damage?', labels, true, aiPick);
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
    if (G.playedBy[pi] !== 2 || G.active !== pi) return;
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
      u.stun = 1; u.noMove = true;
      log(G, v.c.name + ' stuns ' + u.c.name + '; it can\'t move this turn.', v.ctrl);
    });
    // Volibear: when you play a Mighty unit, you may exhaust the legend to channel 1 rune exhausted
    var VL = pp.legend;
    if (!u.token && VL.c && VL.c.P.legendPlayMighty && !VL.exhausted && might(u) >= 5 && pp.runeDeck.length &&
        (await confirm(G, pi, VL.c.name, u.c.name + ' is Mighty: exhaust ' + shortLegend(VL.c) + ' to channel 1 rune exhausted?', true))) {
      VL.exhausted = true; channel(G, pi, 1, true); log(G, VL.c.name + ': channel 1 rune exhausted.', pi);
    }
    if (u.loc !== 'base' && bfNorm(G, u.loc) === 'valleyofidols' && !u.buff && energyAvail(pp) >= 1 &&
        (await confirm(G, pi, 'Valley of Idols', 'Pay 1 energy to buff ' + u.c.name + '?', true))) { pay(G, pi, 1, 0, []); u.buff = 1; log(G, 'Valley of Idols: ' + u.c.name + ' is buffed.', pi); }
    // Only the first non-token unit a player plays here each turn triggers it, even if nothing else is here to move.
    if (u.loc !== 'base' && bfNorm(G, u.loc) === 'starspring' && !u.token && !(G.starSpringUsed || {})[pi]) {
      G.starSpringUsed = G.starSpringUsed || {}; G.starSpringUsed[pi] = true;
      var others = unitsAt(G, u.loc, pi).filter(function (x) { return x !== u; });
      if (others.length) {
        var pick = await ask(G, pi, { type: 'target', title: 'Star Spring (battlefield)', text: 'The first time each turn you play a unit here, you may move another of your units here back to your base. Pick one, or skip.', cands: others.map(function (x) { return x.uid; }), optional: true, auto: null });
        var mv = others.filter(function (x) { return x.uid === pick; })[0];
        if (mv) { mv.loc = 'base'; updateControl(G); log(G, 'Star Spring: ' + mv.c.name + ' returns to base.', pi); }
      }
    }
  }
  // Abandoned Hall: after a player plays a spell, they may give a unit they control there +1 Might this turn.
  async function spellPlayedHooks(G, pi) {
    unitsOf(G, pi).forEach(function (u) { if (u.c.P.spellMight && !u.dead) { u.temp += u.c.P.spellMight; log(G, u.c.name + ' gets +' + u.c.P.spellMight + ' Might this turn (spell played).', pi); } });
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
    G.cardsHint = ok.map(function (q) { return q.g; }); var k = await choose(G, pi, 'Weaponmaster', 'Equip one of your Equipment to ' + u.c.name + ' for 1 power less?', ok.map(function (x) { return x.g.c.name + (x.host ? ' (from ' + x.host.c.name + ')' : ''); }), true, 0);
    if (k == null) return;
    var x = ok[k], ec2 = x.g.c.P.equipCost || { energy: 0, power: [] }, rest = ec2.power.slice(1);
    var d2 = rest.filter(function (d) { return d !== 'any'; });
    pay(G, pi, ec2.energy, d2.length, d2);
    payAnyPower(G, pi, rest.filter(function (d) { return d === 'any'; }).length, 'Weaponmaster');
    if (x.host) x.host.equips.splice(x.host.equips.indexOf(x.g), 1); else p.gear.splice(p.gear.indexOf(x.g), 1);
    u.equips.push(x.g); x.g.attachTurn = G.turnNo;
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
    G.playedThisTurn++; G.playedBy[pi]++;
    var lsc = p.legend.c && p.legend.c.P.script;
    if (lsc && lsc.onPlayCard) lsc.onPlayCard(G, pi, 'elsewhere');
    if (c.type === 'Unit') { G.playedThisTurn--; G.playedBy[pi]--; await playFree(G, pi, card, 'base', title, energyCost > 0 || (payPower && c.power > 0)); return true; }
    log(G, title + ': ' + p.name + ' play' + (pi === 0 ? '' : 's') + ' ' + c.name + '.', pi);
    if (c.type === 'Spell') {
      var sctx = { src: null, loc: null, srcName: c.name, spell: card, caster: pi };
      if (!(await reactTo(G, opp(pi), sctx, null))) { await resolveEffects(G, pi, c.P.spell, sctx); await fireLegend(G, pi, 'playSpell', {}); await spellPlayedHooks(G, pi); }
      if (sctx.countered === 'hand') p.hand.push(card); else if (c.P.banishSelf && !sctx.countered) log(G, c.name + ' is banished.', pi); else p.trash.push(card);
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
    // Show every revealed card; ones you can't pay for are greyed out with the reason.
    var v = top.map(function (x) { return playable.indexOf(x) < 0 ? -1 : (x.c.energy || 0) + (x.c.might || 0) + (x.c.type === 'Spell' ? evalEffects(G, pi, x.c.P.spell, { src: null, loc: null }).value : 0); });
    var best = playable.length ? v.indexOf(Math.max.apply(null, v)) : null, rec = rest === 'draw' ? 'draw' : 'recycle';
    var k = await ask(G, pi, { type: 'choice', title: title, optional: true, auto: best,
      text: (playable.length ? 'Play one of them' + (reduce ? ' for ' + reduce + ' energy less' : '') + ' (you pay its cost)? The rest are ' + (rec === 'draw' ? 'drawn' : 'recycled to the bottom of your deck') + '.'
        : "You can't pay for either card right now (" + energyAvail(p) + ' energy ready), so they are ' + (rec === 'draw' ? 'drawn' : 'recycled to the bottom of your deck') + '.'),
      options: top.map(function (x) { var e = Math.max(0, (x.c.energy || 0) - reduce); return x.c.name + ' (' + e + ' energy' + (x.c.power ? ' + ' + x.c.power + ' power' : '') + ')'; }),
      cards: top.map(function (x) { return x.c.name; }),
      disabled: top.map(function (x) { return playable.indexOf(x) < 0 ? (x.c.type === 'Battlefield' || x.c.type === 'Legend' || x.c.P.counter ? "Can't be played this way" : "Can't afford") : null; }),
      skipLabel: playable.length ? (rec === 'draw' ? 'Play nothing, draw them' : 'Play nothing') : (rec === 'draw' ? 'Draw them' : 'Recycle both') });
    var chosen = k != null && playable.indexOf(top[k]) >= 0 ? top[k] : null;
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
        G.cardsHint = ex; var k = await choose(G, pi, ctx.srcName, 'Ready a gear', ex.map(function (g) { return g.c.name; }), true, 0);
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
      G.cardsHint = top; var k = await choose(G, pi, ctx.srcName, 'Put one into your hand; the rest are recycled.', top.map(function (x) { return x.c.name + ' (' + x.c.type + ')'; }), false, v.indexOf(Math.max.apply(null, v)));
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
      G.cardsHint = all.map(function (q) { return q.x; }); var k = await choose(G, pi, ctx.srcName, 'Banish a card from any trash', all.map(function (a) { return a.x.c.name + (a.pl.pi === pi ? ' (yours)' : ' (AI)'); }), false, Math.max(0, all.map(function (a) { return a.pl.pi !== pi; }).indexOf(true)));
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
        var v = top.map(function (x) {
          var pc = cardCost(x.c, false, G, q, 'deck'), afford = !pc.power || anyPowerAvail(pl) >= pc.power;
          return (x.c.energy || 0) + (x.c.might || 0) + 2 * keyBonus(aiOf(G, q), x.c.name) - (afford ? 0 : 20) - (x.c.type === 'Battlefield' || x.c.type === 'Legend' || x.c.P.counter ? 50 : 0);
        });
        G.cardsHint = top; var k = await choose(G, q, ctx.srcName, 'Choose one of your top 5 to play for free (energy ignored); the rest are recycled.', top.map(function (x) { return x.c.name; }), false, v.indexOf(Math.max.apply(null, v)));
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
        G.cardsHint = all.map(function (q) { return q.x; }); var k = await choose(G, pi, ctx.srcName, 'Recycle a card from a trash (' + (i + 1) + ' of up to 4)', all.map(function (a) { return a.x.c.name + (a.pl.pi === pi ? ' (yours)' : ' (AI)'); }), true, auto < 0 ? null : auto);
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
    // Riven, Deserter: when another friendly unit becomes exhausted, +1 Might this turn
    G.units.filter(function (v) { return v.c.P.friendExhaustMight && !v.dead; }).forEach(function (v) {
      var n = units.filter(function (x) { return x !== v && x.ctrl === v.ctrl; }).length;
      if (n) { v.temp += n; log(G, v.c.name + ' gets +' + n + ' Might this turn.', v.ctrl); }
    });
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
    G.cardsHint = cands; var k = await choose(G, pi, p.legend.c.name, 'Pay 1 energy to turn a friendly gear into a unit (Might = its Energy cost)?', cands.map(function (g) { return g.c.name + ' (' + (g.c.energy || 0) + ' Might)'; }), true, (old && Math.max.apply(null, v) <= old.mightOverride) ? null : v.indexOf(Math.max.apply(null, v)));
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
      G.cardsHint = ok; var k = ok.length ? await choose(G, pi, ctx.srcName, 'Top ' + top.length + ': ' + top.map(function (x) { return x.c.name; }).join(', ') + '. Reveal one and draw it?', ok.map(function (x) { return x.c.name; }), true, v.indexOf(Math.max.apply(null, v))) : null;
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
      G.cardsHint = units; var k = await choose(G, pi, ctx.srcName, "Play a unit from the opponent's trash, ignoring its cost?", units.map(function (x) { return x.c.name; }), true, v.indexOf(Math.max.apply(null, v)));
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
      G.cardsHint = gs; var k = await choose(G, pi, ctx.srcName, 'Move which Deploy gear?', gs.map(function (g) { return g.c.name + ' (at ' + locName(G, g.loc) + ')'; }), false, 0);
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
    legionGate: async function (G, pi, e, tg, ctx) { if (G.playedBy[pi] < 2) { ctx.stop = true; log(G, (ctx.srcName || 'Effect') + ': no Legion (you haven\'t played another card this turn).', pi); } },
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
      effs: [], pay: async function (G, pi) {
        var p = G.players[pi], opts = p.trash.filter(function (x) { return x.c.type === 'Unit' || x.c.type === 'Gear'; });
        var t = opts.slice().sort(function (a, b) { return (a.c.energy || 0) - (b.c.energy || 0); })[0];   // AI: cheapest
        G.cardsHint = opts; var k = await choose(G, pi, 'Mordekaiser', 'Choose a unit or gear in your trash to banish', opts.map(function (x) { return x.c.name; }), false, opts.indexOf(t));
        if (k != null && opts[k]) t = opts[k];
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
    var aE = unitActEnergy(G, u, a);
    if (!canPay(p, aE, a.power, [a.domain])) return { ok: false, why: 'Needs ' + aE + ' energy' + (a.power ? ' and ' + a.power + ' ' + a.domain + ' power' : '') + '.' };
    if (a.killFriendly && unitsOf(G, pi).length < 2) return { ok: false, why: 'Needs another friendly unit to kill.' };
    return { ok: true };
  }
  function unitActEnergy(G, u, a) { return Math.max(0, a.energy - (a.empower && u.loc !== 'base' && bfNorm(G, u.loc) === 'risenaltar' ? 1 : 0)); }
  async function useUnit(G, pi, uid) {
    var chk = canUseUnit(G, pi, uid);
    if (!chk.ok) return chk;
    if (G.probe) probeHit(G, actDesc(G, 'unit', pi, [uid]));
    var u = G.units.filter(function (x) { return x.uid === uid; })[0], a = u.c.P.unitAct;
    pay(G, pi, unitActEnergy(G, u, a), a.power, [a.domain]); if (a.exhaust) await exhaustUnits(G, pi, [u]);
    if (a.exhaustFriendly) {   // Riven, Deserter: exhaust a friendly unit as the cost
      var rdy = unitsOf(G, pi).filter(function (x) { return !x.ex; }), cheap = rdy.slice().sort(function (x, y) { return unitValue(x) - unitValue(y); })[0];
      var eid = await ask(G, pi, { type: 'target', title: u.c.name, text: 'Exhaust a friendly unit to pay the cost', cands: rdy.map(function (x) { return x.uid; }), optional: false, auto: cheap.uid });
      await exhaustUnits(G, pi, [rdy.filter(function (x) { return x.uid === eid; })[0] || cheap]); u.actTurn = G.turnNo;
    }
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
    if (G.probe) probeHit(G, actDesc(G, 'flow', pi, [iid]));
    var p = G.players[pi], card = p.trash.filter(function (x) { return x.iid === iid; })[0], c = card.c, f = card.tempFlow || c.P.flow;
    card.tempFlow = null;
    pay(G, pi, f.energy, 0, []);
    payAnyPower(G, pi, f.power, 'Flow');
    p.trash.splice(p.trash.indexOf(card), 1);
    G.playedThisTurn++; G.playedBy[pi]++;
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
    G.playedThisTurn = 0; G.playedBy = [0, 0];
    log(G, '— Turn ' + G.turnNo + ': ' + p.name + ' —', pi);
    var readied = G.units.filter(function (u) { return u.ctrl === pi && u.ex; });
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
    // Frozen Fortress: at the start of each player's Beginning Phase, deal 1 to each unit here
    for (var ff = 0; ff < G.bfs.length; ff++) {
      if (bfNorm(G, ff) !== 'frozenfortress') continue;
      var here = unitsAt(G, ff);
      if (here.length) { here.forEach(function (u) { u.damage += 1; }); log(G, 'Frozen Fortress deals 1 to each unit there.', pi); await checkDeaths(G); }
    }
    for (var rd = 0; rd < readied.length; rd++) await becameReady(G, readied[rd]);
    var tgr = p.gear.filter(function (g) { return g.c.P.kw && g.c.P.kw.temporary && g.turn !== G.turnNo; });
    for (var tgi = 0; tgi < tgr.length && G.winner == null; tgi++) {
      p.gear.splice(p.gear.indexOf(tgr[tgi]), 1); p.trash.push({ iid: tgr[tgi].iid, c: tgr[tgi].c }); log(G, tgr[tgi].c.name + ' (Temporary) dies.', pi);
      if (tgr[tgi].c.P.gearDeathknell) await resolveEffects(G, pi, tgr[tgi].c.P.gearDeathknell, { src: null, loc: 'base', srcName: tgr[tgi].c.name });
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
    var ap = G.players[pi];
    var eot = ap.gear.filter(function (g) { return g.c.P.endOfTurn; });
    for (var gi = 0; gi < eot.length && G.winner == null; gi++) await resolveEffects(G, pi, eot[gi].c.P.endOfTurn, { src: null, loc: 'base', srcName: eot[gi].c.name });
    if (G.winner != null) return;
    G.units.forEach(function (u) {
      u.damage = 0; u.temp = 0; u.tempAssault = 0; u.shrouded = false; u.noMove = false; u.stun = 0;
      if (u.tempEmpowered) { u.empowered = false; u.tempEmpowered = false; }
    });
    G.players.forEach(function (pl) { pl.pool = 0; pl.poolPower = 0; pl.poolPowerUG = 0; pl.poolPowerSpell = 0; pl.poolPowerGear = 0; pl.poolDom = {}; });
    G.units.forEach(function (u) { u.lethal = false; u.damage = 0; });
    if (ap.readyRunesEOT) {
      var rr = ap.runes.filter(function (r) { return r.ex; }).slice(0, ap.readyRunesEOT);
      rr.forEach(function (r) { r.ex = false; });
      log(G, "Targon's Peak: " + ap.name + ' ready' + (pi === 0 ? '' : 'ies') + ' ' + rr.length + ' rune' + (rr.length === 1 ? '' : 's') + '.', pi);
      ap.readyRunesEOT = 0;
    }
    G.players.forEach(function (pl) { pl.trash.forEach(function (x) { x.tempFlow = null; }); });
    if (G.extraTurn === pi) { G.extraTurn = null; log(G, G.players[pi].name + ' take' + (pi === 0 ? '' : 's') + ' an extra turn.', pi); }
    else G.active = opp(pi);
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
    u.equips.forEach(function (g) { g.loc = 'base'; owner.gear.push(g); });
    if (u.equips.length && !G.quietRecall) log(G, u.equips.map(function (g) { return g.c.name; }).join(', ') + ' detach' + (u.equips.length > 1 ? '' : 'es') + ' and return' + (u.equips.length > 1 ? '' : 's') + ' to base.', u.owner);
    u.equips = [];
  }
  async function killUnit(G, u, reason) {
    if (G.units.indexOf(u) < 0) return;
    var owner = G.players[u.ctrl], SL = owner.legend;
    if (reason !== 'temporary' && !u.token && u.buff && SL.c && SL.c.P.settSave && !SL.exhausted && anyPowerAvail(owner) &&
        (await confirm(G, u.ctrl, SL.c.name, u.c.name + ' would die: pay 1 power and exhaust ' + shortLegend(SL.c) + ' to spend its buff and recall it exhausted instead?', true))) {
      payAnyPower(G, u.ctrl, 1, SL.c.name); SL.exhausted = true; u.buff = 0;
      leaveBonus(G, u); u.loc = 'base'; u.ex = true; u.damage = 0; u.lethal = false;
      log(G, SL.c.name + ': ' + u.c.name + ' spends its buff and is recalled exhausted instead of dying.', u.ctrl);
      updateControl(G);
      return;
    }
    var ga = reason !== 'temporary' && (u.equips || []).filter(function (g) { return g.c.P.hostSave; })[0];
    if (ga) {
      u.equips.splice(u.equips.indexOf(ga), 1); G.players[ga.owner != null ? ga.owner : u.owner].trash.push({ iid: ga.iid, c: ga.c });
      leaveBonus(G, u); u.loc = 'base'; u.ex = true; u.damage = 0; u.lethal = false;
      log(G, ga.c.name + ' is killed instead: ' + u.c.name + ' is healed, exhausted and recalled to base.', u.ctrl);
      updateControl(G);
      return;
    }
    var zh = reason !== 'temporary' && !u.token && owner.gear.filter(function (g) { return g.c.P.saveUnit; })[0];
    if (zh) {
      owner.gear.splice(owner.gear.indexOf(zh), 1); owner.trash.push(zh);
      u.loc = 'base'; u.ex = true; u.damage = 0;
      log(G, zh.c.name + ' breaks instead: ' + u.c.name + ' is recalled to base.', u.ctrl);
      updateControl(G);
      return;
    }
    var loc = u.loc, eqDK = (u.equips || []).filter(function (g) { return g.c.P.hostTrig && g.c.P.hostTrig.deathknell; });   // Sacred Shears
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
    for (var q = 0; q < eqDK.length; q++) for (var t3 = 0; t3 < times; t3++) {
      var dk = eqDK[q].c.P.hostTrig.deathknell;
      for (var r = 0; r < dk.length; r++) await resolveEffects(G, u.ctrl, dk[r].effs, { src: null, loc: loc, srcName: eqDK[q].c.name + ' (' + u.c.name + ')' });
    }
    if (u.flourish && u.flourish.turn === G.turnNo) addGold(G, u.flourish.pi, 1, 'Deadly Flourish');
    // Nasus, Guardian of Knowledge: once each turn, when an enemy unit dies here, channel 1 rune exhausted.
    G.units.forEach(function (v) {
      if (v.ctrl !== u.ctrl && v.loc === loc && v.c.P.channelOnEnemyDeathHere && v.nasusTurn !== G.turnNo && G.players[v.ctrl].runeDeck.length) {
        v.nasusTurn = G.turnNo; channel(G, v.ctrl, 1, true); log(G, v.c.name + ': an enemy died here, channel 1 rune exhausted.', v.ctrl);
      }
    });
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
    // abilities granted by attached Equipment ("When I conquer, ..." on the gear means the equipped unit)
    var eq = (u.equips || []).filter(function (g) { return g.c.P.hostTrig && g.c.P.hostTrig[ev]; });
    for (var i = 0; i < eq.length && !u.dead && G.winner == null; i++) {
      var list = eq[i].c.P.hostTrig[ev];
      for (var j = 0; j < list.length && G.winner == null; j++) await resolveEffects(G, u.ctrl, list[j].effs, { src: u, loc: u.loc, srcName: eq[i].c.name + ' (' + u.c.name + ')' });
    }
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
      if (ctx.fromHidden && ctx.loc != null && u.loc !== ctx.loc) return false;
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
    // Friendly-only bounce (Akali's legend, Flash): save the most valuable unit in the current showdown, else anywhere.
    if (isHarmful(e) && e.t && e.t.sel === 'friendly') {
      var inSd = friends.filter(function (u) { return G.showdownAt != null && u.loc === G.showdownAt; });
      return best(inSd.length ? inSd : friends, unitValue);
    }
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
    await resolveEffectsInner(G, pi, effs, ctx);
    await checkMighty(G);
  }
  async function resolveEffectsInner(G, pi, effs, ctx) {
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
          if (pick && pick.ctrl !== pi && (ctx.spell || (ctx.src && ctx.src.c && ctx.src.c.type === 'Unit'))) markEnemyChoice(G, pi);
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
      case 'stun': tg.forEach(function (u) { u.stun = 1; }); log(G, src + ' stuns ' + names + '.', pi); break;
      case 'buff': tg.forEach(function (u) { if (!u.buff) u.buff = 1; }); log(G, src + ' buffs ' + names + '.', pi); break;
      case 'might': tg.forEach(function (u) { u.temp += e.n; }); log(G, src + ' gives ' + names + ' ' + (e.n > 0 ? '+' : '') + e.n + ' Might this turn.', pi); break;
      case 'assault': tg.forEach(function (u) { u.tempAssault = (u.tempAssault || 0) + e.n; }); log(G, src + ' gives ' + names + ' Assault ' + e.n + ' this turn.', pi); break;
      case 'ready':
        var wasEx = tg.filter(function (u) { return u.ex; });
        tg.forEach(function (u) { u.ex = false; if (u.c.P.onChosenOrReady) { u.temp += 1; log(G, u.c.name + ' gets +1 Might this turn.', u.ctrl); } }); log(G, src + ' readies ' + names + '.', pi);
        for (var wr = 0; wr < wasEx.length; wr++) await becameReady(G, wasEx[wr]);
        break;
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
          G.cardsHint = p.hand; var di = await choose(G, pi, src, 'Choose a card to discard', p.hand.map(function (x) { return x.c.name; }), false, p.hand.indexOf(worst));
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
    var r = canPlayCheck(G, pi, iid, accel, opts); G.players[pi].payingUnitOrGear = false; G.players[pi].payingSpell = false; G.players[pi].payingGear = false; return r;
  }
  function canPlayCheck(G, pi, iid, accel, opts) {
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
    if (c.type === 'Unit' && opts.loc != null && opts.loc !== 'base' && !opts.reaction && opts.roost == null && f.from !== 'hidden' && G.bfs[opts.loc].ctrl !== pi)
      return { ok: false, why: 'Units are played to your base or to a battlefield you control.' };
    if (c.P.kw.deploy && !deploySpots(G, pi).length) return { ok: false, why: 'Deploy: play this only to a battlefield (you need one to play it to).' };
    if (opts.seraphine && !seraphineReady(G, pi)) return { ok: false, why: 'Seraphine needs to be ready and you need three ready friendly units.' };
    p.payingUnitOrGear = c.type === 'Unit' || c.type === 'Gear'; p.payingSpell = c.type === 'Spell'; p.payingGear = c.type === 'Gear';
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
    if (G.probe) probeHit(G, actDesc(G, 'play', pi, [iid, opts]));
    var p = G.players[pi], f = findInHand(p, iid), card = f.card, c = card.c;
    var cost = cardCost(c, opts.accel, G, pi, f.from);
    if (opts.seraphine) {
      cost.energy = Math.max(0, cost.energy - 2);
      p.legend.exhausted = true;
      var three = await pickUnits(G, pi, 'Seraphine', 'Exhaust a ready friendly unit', unitsOf(G, pi).filter(function (u) { return !u.ex; }), 3, function (left) { return left.slice().sort(function (a, b) { return unitValue(a) - unitValue(b); })[0]; });
      log(G, 'Seraphine: exhaust the legend and ' + three.map(function (u) { return u.c.name; }).join(', ') + ' to make ' + c.name + ' cost 2 less.', pi);
      await exhaustUnits(G, pi, three);
    }
    p.payingUnitOrGear = c.type === 'Unit' || c.type === 'Gear'; p.payingSpell = c.type === 'Spell'; p.payingGear = c.type === 'Gear';
    pay(G, pi, cost.energy, cost.power, cost.domains);
    p.payingUnitOrGear = false; p.payingGear = false;
    var NL = p.legend;
    if (NL.c && NL.c.P.nasusReady && !NL.exhausted && (c.type === 'Unit' || c.type === 'Gear') && (c.energy || 0) >= 7 && p.runes.some(function (r) { return r.ex; }) &&
        (await confirm(G, pi, NL.c.name, c.name + ' costs 7+ energy: exhaust ' + shortLegend(NL.c) + ' to ready up to 2 runes?', true))) {
      NL.exhausted = true; var nr = p.runes.filter(function (r) { return r.ex; }).slice(0, 2); nr.forEach(function (r) { r.ex = false; });
      log(G, NL.c.name + ': ready ' + nr.length + ' rune' + (nr.length === 1 ? '' : 's') + '.', pi);
    }
    var extraAny = extraAnyPower(G, pi, c, opts);
    payAnyPower(G, pi, extraAny, 'extra cost'); p.payingSpell = false;
    if (p.discountNext && p.discountNext.turn === G.turnNo) { p.discountNext = null; log(G, 'Astral Heron discount used on ' + c.name + '.', pi); }
    if (f.from === 'hand') p.hand.splice(p.hand.indexOf(card), 1);
    else if (f.from === 'hidden') {
      p.hidden.splice(p.hidden.indexOf(f.h), 1); log(G, p.name + ' reveal' + (pi === 0 ? '' : 's') + ' a hidden card at ' + bfName(G, f.loc) + ': ' + c.name + '.', pi);
      unitsOf(G, pi).filter(function (u) { return u.c.P.hiddenPlayMight; }).forEach(function (u) { u.temp += 2; log(G, u.c.name + ' gets +2 Might this turn.', pi); });
      if (p.legend.c && p.legend.c.P.faceDownDraw && p.legend.fdTurn !== G.turnNo) {
        p.legend.fdTurn = G.turnNo; drawOne(G, pi); log(G, p.legend.c.name + ': draw 1 for playing from face down.', pi);
        if (G.active !== pi) await applyEffect(G, pi, { op: 'discard', n: 1 }, [], { srcName: p.legend.c.name });
      }
    }
    else p.champion = null;
    G.playedThisTurn++; G.playedBy[pi]++;
    if (G.stats) G.stats[pi].played++;
    event(G, { t: 'play', pi: pi, name: c.name, type: c.type, energy: cost.energy, from: f.from, showdown: G.showdownAt != null || opts.showdown != null, own: G.active === pi });
    if (G.playedBy[pi] === 1 && G.active === pi && G.units.some(function (u) { return u.ctrl === pi && u.loc !== 'base' && u.c.P.heronDiscount; })) {
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
      var sctx = { src: null, loc: hereLoc, targets: opts.targets, srcName: c.name, spell: card, caster: pi, fromHand: f.from === 'hand', fromHidden: f.from === 'hidden' };
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
      if (sctx.countered === 'hand') p.hand.push(card); else if (c.P.banishSelf && !sctx.countered) log(G, c.name + ' is banished.', pi); else p.trash.push(card);
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
        p.gear.splice(p.gear.indexOf(gobj), 1); qu.equips.push(gobj); gobj.attachTurn = G.turnNo; log(G, c.name + ' attaches to ' + qu.c.name + ' (Quick-Draw).', pi);
      }
      if (firstGear) { var invs = unitsOf(G, pi).filter(function (u) { return u.c.P.readyOnGear; }); for (var ivi = 0; ivi < invs.length; ivi++) await readySomething(G, pi, invs[ivi]); }
      unitsOf(G, pi).filter(function (u) { return u.c.P.readyOnGearPlay && u.ex; }).forEach(function (u) { u.ex = false; log(G, u.c.name + ' readies (a gear was played).', pi); });
      if (f.from === 'hidden' && c.P.attachFromHidden) {
        var hostHere = unitsAt(G, f.loc, pi);
        if (hostHere.length) {
          var ahid = await ask(G, pi, { type: 'target', title: c.name, text: 'Attach to a unit you control here', cands: hostHere.map(function (u) { return u.uid; }), optional: false, auto: hostHere[0].uid });
          var ah = hostHere.filter(function (u) { return u.uid === ahid; })[0] || hostHere[0];
          p.gear.splice(p.gear.indexOf(gobj), 1); ah.equips.push(gobj); gobj.attachTurn = G.turnNo; log(G, c.name + ' attaches to ' + ah.c.name + ' from face down.', pi);
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
    if (chk.ok && G.probe) probeHit(G, actDesc(G, 'legend', pi, [idx]));
    if (!chk.ok) return chk;
    var p = G.players[pi], L = p.legend, a = legendActs(G, pi)[idx];
    var effs = actEffects(G, pi, a);
    pay(G, pi, a.energy || 0, 0, []);
    payAnyPower(G, pi, a.power || 0, L.c.name);
    if (a.exhaust) { L.exhausted = true; L.used[idx] = true; }
    log(G, p.name + ' use' + (pi === 0 ? '' : 's') + ' ' + L.c.name + ': ' + a.label + '.', pi);
    if (a.pay) await a.pay(G, pi, L);
    await resolveEffects(G, pi, effs, { src: null, loc: opts.showdown != null ? opts.showdown : null, targets: targets, srcName: L.c.name, showdown: opts.showdown });
    return { ok: true };
  }

  /* ---------------- movement & combat ---------------- */
  function canMove(G, u, dest) {
    if (G.winner != null || u.ctrl !== G.active || u.ex || u.dead || dest === u.loc || u.noMove) return false;
    if (dest === 'base' && G.units.some(function (v) { return v.c.P.noMoveToBase && !v.dead; })) return false;   // Minotaur Reckoner
    if (u.loc === 'base' || dest === 'base') return true;
    return !!kwOf(u).ganking || bfNorm(G, u.loc) === 'windswepthillock';
  }
  async function moveUnits(G, pi, uids, dest) {
    var movers = G.units.filter(function (u) { return uids.indexOf(u.uid) >= 0 && u.ctrl === pi && canMove(G, u, dest); });
    if (!movers.length) return { ok: false, why: 'No unit can move there.' };
    if (G.probe) probeHit(G, actDesc(G, 'move', pi, [movers.map(function (u) { return u.uid; }), dest]));
    movers.forEach(function (u) { leaveBonus(G, u); u.loc = dest; });
    await exhaustUnits(G, pi, movers);
    log(G, G.players[pi].name + ' move' + (pi === 0 ? '' : 's') + ' ' + movers.map(function (u) { return u.c.name; }).join(', ') + ' to ' + locName(G, dest) + '.', pi);
    updateControl(G);
    for (var i = 0; i < movers.length; i++) { await fireUnit(G, movers[i], 'move'); if (dest !== 'base') await fireUnit(G, movers[i], 'moveBf'); }
    if (dest !== 'base' && G.winner == null) {
      var here = movers.filter(function (u) { return !u.dead && u.loc === dest; });
      var enemies = unitsAt(G, dest, opp(pi));
      if (here.length && enemies.length) await combat(G, pi, dest, here, enemies);
      else if (here.length && G.bfs[dest].ctrl !== pi) await contest(G, pi, dest);
    }
    return { ok: true };
  }
  // Moving into a battlefield with no enemy units: a non-combat showdown, then the conquer if you still have units there
  // (or combat, if the opponent brought units in with Ambush).
  async function contest(G, pi, bi) {
    await showdown(G, pi, bi, true);
    if (G.winner != null) return;
    var mine = unitsAt(G, bi, pi), foes = unitsAt(G, bi, opp(pi));
    if (mine.length && foes.length) await combat(G, pi, bi, mine, foes);
    else if (mine.length && G.bfs[bi].ctrl !== pi) await conquer(G, pi, bi, mine);
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
    await combatResolve(G, pi, bi, report);
  }
  // Damage, deaths and the conquer after a combat's showdown (split out so the showdown lookahead can resume a copied fight).
  async function combatResolve(G, pi, bi, report) {
    var A = G.players[pi], D = G.players[opp(pi)], i;
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
      // Combat cleanup heals every surviving unit (468.1.a.1)
      att.concat(def).forEach(function (u) { if (dead.indexOf(u) < 0) { u.damage = 0; u.lethal = false; } });
      for (i = 0; i < dead.length; i++) {
        var SLd = G.players[dead[i].ctrl].legend;
        var saved = !dead[i].token && ((dead[i].equips || []).some(function (g) { return g.c.P.hostSave; }) || G.players[dead[i].ctrl].gear.some(function (g) { return g.c.P.saveUnit; }) ||
          (dead[i].buff && SLd.c && SLd.c.P.settSave && !SLd.exhausted));
        if (!saved) log(G, dead[i].c.name + ' dies.', dead[i].ctrl);
        await killUnit(G, dead[i]);
      }
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

  /* ---------------- deck game plans (guide text + AI behaviour) ---------------- */
  /* ---------------- Nov 2026 decks: Sett, Fiora, Volibear, Kai'Sa ---------------- */
  function shortLegend(c) { return c.name.split(/ - |, /)[0]; }
  // A unit "becomes Mighty" when it reaches 5+ Might (entering play with 5+ counts). Fiora's legend and Fiora, Worthy react.
  async function checkMighty(G) {
    if (G.mightyBusy || G.winner != null) return;
    G.mightyBusy = true;
    try {
      var fresh = G.units.filter(function (u) { var m = !u.dead && might(u) >= 5, was = u.wasMighty; u.wasMighty = m; return m && !was; });
      for (var i = 0; i < fresh.length && G.winner == null; i++) {
        var u = fresh[i], pi = u.ctrl, p = G.players[pi], L = p.legend;
        if (L.c && L.c.P.legendMighty && !L.exhausted && p.runeDeck.length &&
            (await confirm(G, pi, L.c.name, u.c.name + ' became Mighty: exhaust ' + shortLegend(L.c) + ' to channel 1 rune exhausted?', true))) {
          L.exhausted = true; channel(G, pi, 1, true); log(G, L.c.name + ': ' + u.c.name + ' became Mighty, channel 1 rune exhausted.', pi);
        }
        var worthy = G.units.filter(function (v) { return v.ctrl === pi && v.c.P.readyMighty && !v.dead; })[0];
        if (worthy && u.ex && !u.dead && canPay(p, 0, 1, ['Order']) && (await confirm(G, pi, worthy.c.name, u.c.name + ' became Mighty: pay 1 Order power to ready it?', true))) {
          pay(G, pi, 0, 1, ['Order']); u.ex = false; log(G, worthy.c.name + ': ' + u.c.name + ' readies.', pi);
        }
      }
    } finally { G.mightyBusy = false; }
  }
  // Jayce, Hammer in Hand: when I become ready, choose Assault 2, Deflect 2 or Ganking this turn.
  async function becameReady(G, u) {
    if (u.dead || !u.c.P.onBecomeReady) return;
    var modes = [['Assault 2', { assault: 2 }], ['Deflect 2', { deflect: true }], ['Ganking', { ganking: true }]];
    var auto = u.loc === 'base' ? 0 : 2;
    var k = await choose(G, u.ctrl, u.c.name, 'I became ready: choose one for this turn', modes.map(function (m) { return m[0]; }), false, auto);
    var m = modes[k == null ? auto : k];
    u.turnKw = { turn: G.turnNo, kw: m[1] }; log(G, u.c.name + ' gets ' + m[0] + ' this turn.', u.ctrl);
  }
  Object.assign(OPS, {
    spendBuffMight: async function (G, pi, e, tg, ctx) { var u = ctx.src; if (!u || !u.buff) return; u.buff = 0; u.temp += e.n; log(G, u.c.name + ' spends its buff: +' + e.n + ' Might this turn.', pi); },
    spendBuffCost: async function (G, pi, e, tg, ctx) {   // Call to Glory: its cost was waived by spending a buff
      var b = unitsOf(G, pi).filter(function (u) { return u.buff; }).sort(function (a, b2) { return might(a) - might(b2); });
      if (!b.length) return;
      var id = await ask(G, pi, { type: 'target', title: ctx.srcName, text: 'Spend a buff to play this for free', cands: b.map(function (u) { return u.uid; }), optional: false, auto: b[0].uid });
      var u = b.filter(function (x) { return x.uid === id; })[0] || b[0]; u.buff = 0; log(G, ctx.srcName + ': ' + u.c.name + "'s buff is spent instead of the cost.", pi);
    },
    blastMight: async function (G, pi, e, tg, ctx) {   // Graves: deal my Might to all enemy units here
      var u = ctx.src; if (!u || u.dead || u.loc === 'base') return;
      var n = might(u), foes = unitsAt(G, u.loc, opp(pi)); if (!foes.length) return;
      foes.forEach(function (f) { f.damage += n; }); log(G, u.c.name + ' deals ' + n + ' to all enemy units here.', pi); await checkDeaths(G);
    },
    payStun: async function (G, pi, e, tg, ctx) {   // Kennen, Keeper of Balance: may pay 2 energy to stun a unit
      var p = G.players[pi], foes = G.units.filter(function (u) { return u.ctrl !== pi && !u.dead; });
      if (!foes.length || energyAvail(p) < 2) return;
      var best = foes.slice().sort(function (a, b) { return might(b) - might(a); })[0];
      var id = await ask(G, pi, { type: 'target', title: ctx.srcName, text: 'Pay 2 energy to stun a unit?', cands: G.units.filter(function (u) { return !u.dead; }).map(function (u) { return u.uid; }), optional: true, auto: might(best) >= 3 ? best.uid : null });
      var t = G.units.filter(function (u) { return u.uid === id; })[0]; if (!t) return;
      pay(G, pi, 2, 0, []); t.stun = 1; log(G, ctx.srcName + ' stuns ' + t.c.name + '.', pi);
    },
    spendBuffDraw: async function (G, pi, e, tg, ctx) {   // Monastery of Hirana
      var b = unitsOf(G, pi).filter(function (u) { return u.buff; }); if (!b.length) return;
      if (!(await confirm(G, pi, ctx.srcName, 'Spend a buff to draw 1?', true))) return;
      var w = b.sort(function (a, b2) { return might(a) - might(b2); })[0]; w.buff = 0; drawOne(G, pi); log(G, ctx.srcName + ': ' + w.c.name + ' spends its buff, draw 1.', pi);
    },
    returnGearCost: async function (G, pi, e, tg, ctx) {   // Skystrike Squadron: the gear returned for its discount
      var p = G.players[pi], gs = p.gear.filter(function (g) { return g.c.supertype !== 'Token'; }); if (!gs.length) return;
      G.cardsHint = gs; var k = await choose(G, pi, ctx.srcName, 'Return a friendly gear to your hand (Skystrike Squadron cost 2 less)', gs.map(function (g) { return g.c.name; }), false, 0);
      var g = gs[k || 0]; p.gear.splice(p.gear.indexOf(g), 1); p.hand.push({ iid: g.iid, c: g.c }); log(G, g.c.name + ' returns to ' + p.name + "'s hand.", pi);
    },
    payReadyHere: async function (G, pi, e, tg, ctx) {   // Portable Portal
      var p = G.players[pi], loc = ctx.gearLoc != null ? ctx.gearLoc : ctx.loc; if (loc == null || loc === 'base') return;
      var ex = unitsAt(G, loc, pi).filter(function (u) { return u.ex; }); if (!ex.length || !canPay(p, 0, 1, [e.domain])) return;
      var id = await ask(G, pi, { type: 'target', title: ctx.srcName, text: 'Pay 1 ' + e.domain + ' power to ready a unit here?', cands: ex.map(function (u) { return u.uid; }), optional: true, auto: ex[0].uid });
      var u = ex.filter(function (x) { return x.uid === id; })[0]; if (!u) return;
      pay(G, pi, 0, 1, [e.domain]); u.ex = false; log(G, ctx.srcName + ' readies ' + u.c.name + '.', pi); await becameReady(G, u);
    },
    poppy: async function (G, pi, e, tg, ctx) {   // Poppy, Paragon
      var u = ctx.src; if (!u || u.dead) return;
      if (G.players[opp(pi)].points >= WIN - 3) { u.ex = false; gainXp(G, pi, 3, u.c.name); log(G, u.c.name + ' readies (opponent within 3 points of winning).', pi); }
    },
    kayleEmpower: async function (G, pi, e, tg, ctx) { var u = ctx.src; u.empCount = Math.min(3, (u.empCount || 0) + 1); u.empowered = true; log(G, '✦ ' + u.c.name + ' is empowered (' + u.empCount + '/3): +' + 2 * u.empCount + ' Might' + (u.empCount === 3 ? ', Deflect and Ganking' : '') + '.', pi); },
    drawPerMighty: async function (G, pi, e, tg, ctx) { var n = unitsOf(G, pi).filter(function (u) { return might(u) >= 5; }).length; for (var i = 0; i < n; i++) drawOne(G, pi); if (n) log(G, ctx.srcName + ': draw ' + n + ' (Mighty units).', pi); },
    splitDamage: async function (G, pi, e, tg, ctx) {   // Volibear, Furious: deal N split among enemy units here
      var u = ctx.src; if (!u || u.loc === 'base') return;
      for (var left = e.n; left > 0;) {
        var foes = unitsAt(G, u.loc, opp(pi)).filter(function (f) { return !f.dead && f.damage < might(f, 'def'); }); if (!foes.length) break;
        var kill = foes.filter(function (f) { return might(f, 'def') - f.damage <= left; }).sort(function (a, b) { return unitValue(b) - unitValue(a); })[0] || foes.sort(function (a, b) { return might(b) - might(a); })[0];
        var id = await ask(G, pi, { type: 'target', title: ctx.srcName, text: left + ' damage left to split: choose an enemy unit here', cands: foes.map(function (f) { return f.uid; }), optional: false, auto: kill.uid });
        var t = foes.filter(function (f) { return f.uid === id; })[0] || kill, need = Math.max(1, might(t, 'def') - t.damage);
        var amt = Math.min(left, need); t.damage += amt; left -= amt; log(G, ctx.srcName + ' deals ' + amt + ' to ' + t.c.name + '.', pi);
      }
      await checkDeaths(G);
    },
    stormbringer: async function (G, pi, e, tg, ctx) {
      var mine = unitsAt(G, 'base', pi); if (!mine.length) return;
      var big = mine.slice().sort(function (a, b) { return might(b) - might(a); })[0];
      var id = await ask(G, pi, { type: 'target', title: ctx.srcName, text: 'Choose a friendly unit in your base', cands: mine.map(function (u) { return u.uid; }), optional: false, auto: big.uid });
      var u = mine.filter(function (x) { return x.uid === id; })[0] || big, n = might(u);
      var bfs = G.bfs.map(function (b, i) { return i; }), score = bfs.map(function (i) { return unitsAt(G, i, opp(pi)).length; });
      var k = await choose(G, pi, ctx.srcName, 'Deal ' + n + ' to all enemy units at which battlefield (then ' + u.c.name + ' moves there)?', bfs.map(function (i) { return bfName(G, i) + ' (' + score[i] + ' enemy)'; }), false, score.indexOf(Math.max.apply(null, score)));
      var bi = bfs[k || 0]; unitsAt(G, bi, opp(pi)).forEach(function (f) { f.damage += n; });
      log(G, ctx.srcName + ' deals ' + n + ' to all enemy units at ' + bfName(G, bi) + '.', pi); await checkDeaths(G);
      if (!u.dead && G.winner == null) await effectMove(G, u, bi);
    },
    avalanche: async function (G, pi, e, tg, ctx) { var hit = unitsAt(G, 'base'); hit.forEach(function (u) { u.damage += e.n; }); log(G, ctx.srcName + ' deals ' + e.n + ' to every unit in a base.', pi); await checkDeaths(G); },
    channelBoth: async function (G, pi, e, tg, ctx) { [pi, opp(pi)].forEach(function (q) { channel(G, q, 1, true); }); log(G, ctx.srcName + ': each player channels 1 rune exhausted.', pi); },
    shrinkOne: async function (G, pi, e, tg, ctx) { tg.forEach(function (u) { var m = might(u), d = Math.min(e.n, Math.max(0, m - 1)); u.temp -= d; log(G, ctx.srcName + ' gives ' + u.c.name + ' -' + d + ' Might this turn (minimum 1).', pi); }); },
    empyrean: async function (G, pi, e, tg, ctx) {   // The Empyrean: show off a card, predict, draw 2
      var p = G.players[pi]; if (!p.hand.length) return;
      var hi = p.hand.slice().sort(function (a, b) { return (b.c.power || 0) - (a.c.power || 0); })[0];
      log(G, ctx.srcName + ': ' + p.name + ' show' + (pi === 0 ? '' : 's') + ' off ' + hi.c.name + '.', pi);
      if ((hi.c.power || 0) > 0) await OPS.predict(G, pi, {}, [], ctx);
      drawOne(G, pi); drawOne(G, pi); log(G, ctx.srcName + ': draw 2.', pi);
    },
    blink: async function (G, pi, e, tg, ctx) {   // Temporal Breach: banish a unit, its owner plays it again there for free
      var u = tg[0]; if (!u) return;
      var loc = u.loc, owner = u.owner; removeUnit(G, u); u.dead = true; updateControl(G);
      log(G, ctx.srcName + ' banishes ' + u.c.name + '.', pi);
      if (!u.token) await playFree(G, owner, { iid: u.iid, c: u.c }, loc, ctx.srcName);
    }
  });
  function markEnemyChoice(G, pi) {
    G.enemyChosen = G.enemyChosen || {};
    var e = G.enemyChosen[pi];
    if (!e || e.turn !== G.turnNo) e = G.enemyChosen[pi] = { turn: G.turnNo, n: 0 };
    e.n++;
  }
  Object.assign(OPS, {
    bounceOwn: async function (G, pi, e, tg, ctx) {   // Pack of Wonders: return another friendly gear, unit or hidden card to hand
      var p = G.players[pi], opts = [];
      unitsOf(G, pi).forEach(function (u) { if (!u.token) opts.push({ k: 'u', x: u, name: u.c.name + ' (unit)' }); });
      p.gear.forEach(function (g) { if (g !== ctx.gear && !g.token && g.c.supertype !== 'Token') opts.push({ k: 'g', x: g, name: g.c.name + ' (gear)' }); });
      p.hidden.forEach(function (h) { opts.push({ k: 'h', x: h, name: h.card.c.name + ' (hidden)' }); });
      if (!opts.length) return;
      var hurt = opts.map(function (o) { return o.k === 'u' && o.x.damage > 0 ? 1 : 0; }).indexOf(1);
      var k = await choose(G, pi, ctx.srcName, 'Return one of these to your hand?', opts.map(function (o) { return o.name; }), true, hurt >= 0 ? hurt : null);
      if (k == null) return;
      var o = opts[k];
      if (o.k === 'u') { removeUnit(G, o.x); o.x.dead = true; p.hand.push({ iid: o.x.iid, c: o.x.c }); updateControl(G); }
      else if (o.k === 'g') { p.gear.splice(p.gear.indexOf(o.x), 1); p.hand.push({ iid: o.x.iid, c: o.x.c }); if (o.x.c.P.onLeave) await resolveEffects(G, pi, o.x.c.P.onLeave, { src: null, loc: null, srcName: o.x.c.name }); }
      else { p.hidden.splice(p.hidden.indexOf(o.x), 1); p.hand.push(o.x.card); }
      log(G, ctx.srcName + ' returns ' + o.name.replace(/ \(.*\)$/, '') + ' to ' + p.name + "'s hand.", pi);
    },
    offer: async function (G, pi, e, tg, ctx) {   // An Offer You Can't Refuse: kill a gear, its controller gets a Gold
      var all = [];
      G.players.forEach(function (pl, q) { pl.gear.forEach(function (g) { all.push({ g: g, q: q, host: null }); }); });
      G.units.forEach(function (u) { u.equips.forEach(function (g) { all.push({ g: g, q: u.ctrl, host: u }); }); });
      if (!all.length) return;
      var auto = all.map(function (x) { return x.q !== pi && x.g.c.supertype !== 'Token'; }).indexOf(true);
      G.cardsHint = all.map(function (x) { return x.g; });
      var k = await choose(G, pi, ctx.srcName, 'Kill a gear (its controller gets a Gold token)', all.map(function (x) { return x.g.c.name + (x.q === pi ? ' (yours)' : ' (opponent)') + (x.host ? ' on ' + x.host.c.name : ''); }), false, auto < 0 ? 0 : auto);
      var x = all[k || 0];
      if (x.q !== pi) markEnemyChoice(G, pi);
      if (x.host) x.host.equips.splice(x.host.equips.indexOf(x.g), 1); else G.players[x.q].gear.splice(G.players[x.q].gear.indexOf(x.g), 1);
      if (!x.g.token && x.g.c.supertype !== 'Token') G.players[x.q].trash.push({ iid: x.g.iid, c: x.g.c });
      log(G, ctx.srcName + ' kills ' + x.g.c.name + '.', pi);
      if (x.g.c.P.onLeave) await resolveEffects(G, x.q, x.g.c.P.onLeave, { src: null, loc: null, srcName: x.g.c.name });
      addGold(G, x.q, 1, ctx.srcName);
    },
    playerDiscard: async function (G, pi, e, tg, ctx) {   // Bewitching Spirit: choose a player, they discard 1
      var k = await choose(G, pi, ctx.srcName, 'Choose a player to discard 1', ['Opponent', 'You'], false, 0);
      var q = k === 1 ? pi : opp(pi);
      if (G.players[q].hand.length) await applyEffect(G, q, { op: 'discard', n: 1 }, [], { srcName: ctx.srcName });
    },
    nameTag: async function (G, pi, e, tg, ctx) {   // The List: name a tag as you play it
      var p = G.players[pi], o = G.players[opp(pi)], g = p.gear.filter(function (x) { return ctx.card && x.iid === ctx.card.iid; })[0];
      if (!g) return;
      var count = {};
      G.units.filter(function (u) { return u.ctrl !== pi; }).concat(o.deckDef && o.deckDef.cards ? o.deckDef.cards.map(function (c) { return { c: c }; }) : []).forEach(function (u) { (u.c.tags || []).forEach(function (t) { count[t] = (count[t] || 0) + 1; }); });
      var tags = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; }).slice(0, 8);
      if (!tags.length) return;
      var k = await choose(G, pi, ctx.srcName, 'Name a tag', tags, false, 0);
      g.namedTag = tags[k || 0]; log(G, ctx.srcName + ' names ' + g.namedTag + '.', pi);
    },
    listShrink: async function (G, pi, e, tg, ctx) {
      var t = ctx.gear && ctx.gear.namedTag, cands = G.units.filter(function (u) { return !u.dead && (u.c.tags || []).indexOf(t) >= 0; });
      if (!cands.length) return;
      var best = cands.filter(function (u) { return u.ctrl !== pi; }).sort(function (a, b) { return might(b) - might(a); })[0] || cands[0];
      var id = await ask(G, pi, { type: 'target', title: ctx.srcName, text: 'Give a ' + t + ' unit -2 Might this turn', cands: cands.map(function (u) { return u.uid; }), optional: false, auto: best.uid });
      var u = cands.filter(function (x) { return x.uid === id; })[0] || best; u.temp -= 2; log(G, ctx.srcName + ' gives ' + u.c.name + ' -2 Might this turn.', pi);
    }
  });
  Object.assign(OPS, {
    payDraw: async function (G, pi, e, tg, ctx) {   // Clockwork Keeper: may pay 1 power as an extra cost to draw 1
      var p = G.players[pi]; if (!canPay(p, 0, 1, [e.domain])) return;
      if (!(await confirm(G, pi, ctx.srcName, 'Pay 1 ' + e.domain + ' power to draw 1?', p.runes.length >= 4))) return;
      pay(G, pi, 0, 1, [e.domain]); drawOne(G, pi); log(G, ctx.srcName + ': draw 1.', pi);
    },
    lookGear: async function (G, pi, e, tg, ctx) {   // Ornn, Blacksmith: look at the top N, may reveal a gear and draw it
      var p = G.players[pi], top = p.deck.splice(0, e.n), gs = top.filter(function (x) { return x.c.type === 'Gear'; }), k = null;
      if (gs.length) { G.cardsHint = gs; k = await choose(G, pi, ctx.srcName, 'Top ' + e.n + ': ' + top.map(function (x) { return x.c.name; }).join(', ') + '. Reveal a gear and draw it?', gs.map(function (x) { return x.c.name; }), true, 0); }
      var got = k != null ? gs[k] : null;
      if (got) { p.hand.push(got); log(G, ctx.srcName + ': ' + p.name + ' draw' + (pi === 0 ? '' : 's') + ' ' + got.c.name + '.', pi); }
      top.forEach(function (x) { if (x !== got) p.deck.push(x); });
    },
    recurGear: async function (G, pi, e, tg, ctx) {   // Aspiring Engineer: return a gear from your trash to your hand
      var p = G.players[pi], gs = p.trash.filter(function (x) { return x.c.type === 'Gear'; }); if (!gs.length) return;
      var v = gs.map(function (x) { return (x.c.energy || 0) + (x.c.power || 0); });
      G.cardsHint = gs; var k = await choose(G, pi, ctx.srcName, 'Return a gear from your trash to your hand', gs.map(function (x) { return x.c.name; }), false, v.indexOf(Math.max.apply(null, v)));
      var g = gs[k || 0]; p.trash.splice(p.trash.indexOf(g), 1); p.hand.push(g); log(G, ctx.srcName + ': ' + g.c.name + ' returns to ' + p.name + "'s hand.", pi);
    },
    exhaustCost: async function (G, pi, e, tg, ctx) {   // Life from Stone: exhaust a friendly unit as an additional cost
      var rdy = unitsOf(G, pi).filter(function (u) { return !u.ex; }); if (!rdy.length) return;
      var w = rdy.slice().sort(function (a, b) { return (a.loc === 'base' ? 0 : 1) - (b.loc === 'base' ? 0 : 1) || unitValue(a) - unitValue(b); })[0];
      var id = await ask(G, pi, { type: 'target', title: ctx.srcName, text: 'Exhaust a friendly unit to pay the cost', cands: rdy.map(function (u) { return u.uid; }), optional: false, auto: w.uid });
      await exhaustUnits(G, pi, [rdy.filter(function (u) { return u.uid === id; })[0] || w]);
    },
    khazix: async function (G, pi, e, tg, ctx) {   // Kha'Zix, Mutating Horror: an isolated enemy here -> +2 Might this turn, 2 XP
      var u = ctx.src; if (!u || u.loc === 'base') return;
      if (unitsAt(G, u.loc, opp(pi)).length === 1) { u.temp += 2; gainXp(G, pi, 2, u.c.name); log(G, u.c.name + ': an enemy is alone here, +2 Might this turn.', pi); }
    }
  });
  Object.assign(OPS_VALUE, {
    payDraw: function (G, pi) { return canPay(G.players[pi], 0, 1, ['Calm']) ? 1.2 : 0; },
    lookGear: function () { return 1.2; },
    recurGear: function (G, pi) { return G.players[pi].trash.some(function (x) { return x.c.type === 'Gear'; }) ? 1.5 : 0; },
    exhaustCost: function () { return -0.5; },
    khazix: function () { return 1; }
  });
  Object.assign(OPS, {
    extraTurn: async function (G, pi, e, tg, ctx) { G.extraTurn = pi; log(G, (ctx.srcName || 'Effect') + ': ' + G.players[pi].name + ' will take another turn after this one.', pi); },
    exhaustFriendly: async function (G, pi) { unitsOf(G, pi).forEach(function (u) { u.ex = true; }); },
    barbara: async function (G, pi, e, tg, ctx) {   // Tomb-Raider Barbara: with 7+ runes, disempower an Empowered enemy gear or kill one
      if (G.players[pi].runes.length < 7) return;
      var o = G.players[opp(pi)], all = o.gear.filter(function (g) { return !g.token; }).map(function (g) { return { g: g, host: null }; });
      G.units.forEach(function (u) { if (u.ctrl !== pi) u.equips.forEach(function (g) { all.push({ g: g, host: u }); }); });
      if (!all.length) return;
      var v = all.map(function (x) { return (x.g.c.energy || 0) + (x.g.c.power || 0) + (x.host ? 2 : 0); });
      G.cardsHint = all.map(function (x) { return x.g; });
      var k = await choose(G, pi, ctx.srcName, 'Choose an enemy gear: an Empowered one is disempowered, otherwise it is killed', all.map(function (x) { return x.g.c.name + (x.g.empowered ? ' (Empowered)' : '') + (x.host ? ' on ' + x.host.c.name : ''); }), false, v.indexOf(Math.max.apply(null, v)));
      var x = all[k || 0];
      if (x.g.empowered) { x.g.empowered = false; log(G, ctx.srcName + ' disempowers ' + x.g.c.name + '.', pi); return; }
      if (x.host) x.host.equips.splice(x.host.equips.indexOf(x.g), 1); else o.gear.splice(o.gear.indexOf(x.g), 1);
      if (x.g.c.P.onLeave) await resolveEffects(G, opp(pi), x.g.c.P.onLeave, { src: null, loc: null, srcName: x.g.c.name });
      o.trash.push({ iid: x.g.iid, c: x.g.c }); log(G, ctx.srcName + ' kills ' + x.g.c.name + '.', pi);
    }
  });
  Object.assign(OPS_VALUE, {
    extraTurn: function () { return 9; },
    exhaustFriendly: function (G, pi) { return -0.3 * unitsOf(G, pi).filter(function (u) { return !u.ex; }).length; },
    barbara: function (G, pi) { return G.players[pi].runes.length >= 7 && (G.players[opp(pi)].gear.some(function (g) { return !g.token; }) || G.units.some(function (u) { return u.ctrl !== pi && u.equips.length; })) ? 2 : 0; }
  });
  // Unchecked Power: 12 to every unit at a battlefield. Worth it when the enemy loses more there than we do.
  OPS_VALUE.dealAllBf = function (G, pi, e) {
    if (!e || e.n < 6) return 1;
    var v = 0; G.units.forEach(function (u) { if (u.loc !== 'base' && !u.dead && might(u) <= e.n) v += (u.ctrl === pi ? -1 : 1) * unitValue(u); });
    return v;
  };
  Object.assign(CARD_SCRIPTS, {
    // Sett
    settbrawler: { sim: 'all', play: [{ op: 'buff', t: { sel: 'self' } }], conquerFx: [{ op: 'buff', t: { sel: 'self' } }],
      unitAct: { label: 'Spend my buff: +4 Might this turn', energy: 0, power: 0, domain: 'Body', exhaust: false, req: function (G, u) { return u.buff ? null : 'Needs a buff to spend.'; }, effs: [{ op: 'spendBuffMight', n: 4 }] } },
    calltoglory: { sim: 'all', costMod: function (G, pi) { return G.units.some(function (u) { return u.ctrl === pi && u.buff; }) ? -99 : 0; }, effs: [{ op: 'spendBuffCost' }, { op: 'might', n: 3, t: T('any') }] },
    fioravictorious: { sim: 'all', mightyKw: { deflect: true, ganking: true, shield: 1 } },
    showstopper: { sim: 'all', effs: [{ op: 'buff', t: T('friendly', 'inbase') }, { op: 'moveUnit', t: { sel: 'it' } }] },
    pillagedarmory: { sim: 'all', gearPlayFx: [{ op: 'buff', t: T('friendly') }], gearConquerFx: [{ op: 'buff', t: T('friendly') }] },
    gravesblastingthrough: { sim: 'all', noCombatDamage: true, attackFx: [{ op: 'blastMight' }], defendFx: [{ op: 'blastMight' }] },
    repulse: { sim: 'all', counter: { targetsFriendly: true } },
    kennenkeeperofbalance: { sim: 'all', play: [{ op: 'payStun' }], attackFx: [{ op: 'payStun' }],
      bonusMight: function (G, u) { return u.loc !== 'base' && unitsAt(G, u.loc, opp(u.ctrl)).some(function (v) { return v.stun; }) ? 2 : 0; } },
    monasteryofhirana: { sim: 'all', bfconquer: [{ op: 'spendBuffDraw' }] },
    // Ornn
    clockworkkeeper: { sim: 'all', play: [{ op: 'payDraw', domain: 'Calm' }] },
    sealoffocus: { sim: 'all', addPower: 'Calm', gearActs: [{ label: 'Exhaust: add 1 Calm power now (it is also used automatically when you pay)', timing: 'reaction', run: function (G, pi) { var p = G.players[pi]; p.poolDom = p.poolDom || {}; p.poolDom.Calm = (p.poolDom.Calm || 0) + 1; log(G, 'Seal of Focus adds 1 Calm power (until end of turn).', pi); } }] },
    pitcrew: { sim: 'all', readyOnGearPlay: true },
    porosnax: { sim: 'all', gearActs: [{ label: '1 energy + 1 Calm power, exhaust, kill this: draw 1', energy: 1, power: 1, domain: 'Calm', killSelf: true, effs: [{ op: 'draw', n: 1 }] }] },
    ornnblacksmith: { sim: 'all', play: [{ op: 'lookGear', n: 4 }], holdFx: [{ op: 'lookGear', n: 4 }] },
    aspiringengineer: { sim: 'all', play: [{ op: 'recurGear' }] },
    spritefountain: { sim: 'all', gearPlayFx: [{ op: 'token', count: 1, ready: true, might: 3, name: 'Sprite', kw: { temporary: true }, here: false }],
      gearDeathknell: [{ op: 'token', count: 1, ready: true, might: 3, name: 'Sprite', kw: { temporary: true }, here: false }] },
    plazaguardian: { sim: 'all', costMod: function (G, pi) { var p = G.players[pi]; return -(p.gear.length + unitsOf(G, pi).reduce(function (s2, u) { return s2 + u.equips.length; }, 0)); } },
    // Vex
    embermonk: { sim: 'all', hiddenPlayMight: true },
    lifefromstone: { sim: 'all', requires: function (G, pi) { return unitsOf(G, pi).some(function (u) { return !u.ex; }) ? null : 'You need a ready friendly unit to exhaust.'; }, effs: [{ op: 'exhaustCost' }, { op: 'draw', n: 1 }, { op: 'channel', n: 1 }] },
    khazixmutatinghorror: { sim: 'all', attackFx: [{ op: 'khazix' }], defendFx: [{ op: 'khazix' }] },
    bandletree: { sim: 'all' },
    // Nasus
    findyourcenter: { sim: 'all', costMod: function (G, pi) { return G.players[opp(pi)].points >= 5 ? -2 : 0; }, effs: [{ op: 'draw', n: 1 }, { op: 'channel', n: 1 }] },
    ravenbloomstudent: { sim: 'all', spellMight: 1 },
    timewarp: { sim: 'all', effs: [{ op: 'extraTurn' }], banishSelf: true },
    uncheckedpower: { sim: 'all', effs: [{ op: 'exhaustFriendly' }, { op: 'dealAllBf', n: 12 }] },
    hush: { sim: 'all', counter: { minPower: 2 } },
    tombraiderbarbara: { sim: 'all', play: [{ op: 'barbara' }] },
    nasusguardianofknowledge: { sim: 'all', channelOnEnemyDeathHere: true },
    settkingpin: { sim: 'all', bonusMight: function (G, u) { return u.loc === 'base' ? 0 : unitsAt(G, u.loc, u.ctrl).filter(function (v) { return v.buff; }).length; } },
    valleyofidols: { sim: 'all' },
    // Ezreal
    packofwonders: { sim: 'all', gearActs: [{ label: 'Exhaust: return another friendly gear, unit or hidden card to your hand', effs: [{ op: 'bounceOwn' }] }] },
    treasuretrove: { sim: 'all', onLeave: [{ op: 'draw', n: 1 }, { op: 'channel', n: 1 }],
      gearActs: [{ label: '1 Chaos power, exhaust: kill this (draw 1 and channel 1 rune exhausted)', power: 1, domain: 'Chaos', killSelf: true, effs: [{ op: 'draw', n: 1 }, { op: 'channel', n: 1 }] }] },
    anofferyoucantrefuse: { sim: 'all', effs: [{ op: 'offer' }] },
    hardbargain: { sim: 'all', counter: { tax: 2 } },
    bewitchingspirit: { sim: 'all', play: [{ op: 'playerDiscard' }] },
    thelist: { sim: 'all', gearPlayFx: [{ op: 'nameTag' }],
      gearActs: [{ label: 'Exhaust: give a unit with the named tag -2 Might this turn', req: function (G, pi, g) { return !g.namedTag ? 'No tag named.' : !G.units.some(function (u) { return (u.c.tags || []).indexOf(g.namedTag) >= 0; }) ? 'No ' + g.namedTag + ' unit in play.' : null; }, effs: [{ op: 'listShrink' }] }] },
    // Fiora
    skystrikesquadron: { sim: 'all', costMod: function (G, pi) { return G.players[pi].gear.some(function (g) { return g.c.supertype !== 'Token'; }) ? -2 : 0; }, play: [{ op: 'returnGearCost' }] },
    portableportal: { sim: 'all', gearPlayFx: [{ op: 'payReadyHere', domain: 'Body' }], gankHere: true },
    fioraworthy: { sim: 'all', readyMighty: true },
    riposte: { sim: 'all', counter: { mightToFriendly: true } },
    rivendeserter: { sim: 'all', friendExhaustMight: true,
      unitAct: { label: 'Exhaust a friendly unit: ready a unit (once each turn)', energy: 0, power: 0, domain: 'Calm', exhaust: false, exhaustFriendly: true,
        req: function (G, u) { return u.actTurn === G.turnNo ? 'Already used this turn.' : !unitsOf(G, u.ctrl).some(function (x) { return !x.ex; }) ? 'No ready friendly unit to exhaust.' : !G.units.some(function (x) { return x.ex; }) ? 'No exhausted unit to ready.' : null; },
        effs: [{ op: 'ready', t: T('any') }] } },
    poppyparagon: { sim: 'all', play: [{ op: 'poppy' }] },
    kaylejustified: { sim: 'all', bonusMight: function (G, u) { return 2 * (u.empCount || 0); }, empKw: { deflect: true, ganking: true },
      unitAct: { label: 'Empower (3 energy; up to three times)', energy: 3, power: 0, domain: 'Order', exhaust: false, empower: true,
        req: function (G, u) { return (u.empCount || 0) >= 3 ? 'Already empowered three times.' : null; }, effs: [{ op: 'kayleEmpower' }] } },
    packedamphitheater: { sim: 'all' },
    risenaltar: { sim: 'all' },
    // Volibear
    skysplitter: { sim: 'all', costMod: function (G, pi) { return -unitsOf(G, pi).reduce(function (m, u) { return Math.max(m, might(u)); }, 0); } },
    kadregrintheinfernal: { sim: 'all', play: [{ op: 'drawPerMighty' }] },
    volibearfurious: { sim: 'all', attackFx: [{ op: 'splitDamage', n: 5 }] },
    stormbringer: { sim: 'all', effs: [{ op: 'stormbringer' }] },
    avalanche: { sim: 'all', effs: [{ op: 'avalanche', n: 3 }] },
    seraphicwyvern: { sim: 'all', extraChannel: true },
    minotaurreckoner: { sim: 'all', noMoveToBase: true },
    jaycehammerinhand: { sim: 'all', onBecomeReady: true },
    thepapertree: { sim: 'all', bfhold: [{ op: 'channelBoth' }] },
    // Kai'Sa
    smokescreen: { sim: 'all', effs: [{ op: 'shrinkOne', n: 4, t: T('any') }] },
    singularity: { sim: 'all', effs: [{ op: 'deal', n: 6, t: T('any'), opt: true }, { op: 'deal', n: 6, t: T('any', null, { notIt: true }), opt: true }] },
    theempyrean: { sim: 'all', play: [{ op: 'empyrean' }] },
    perfectexecution: { sim: [0], effs: [{ op: 'ready', t: T('any') }, { op: 'assault', n: 3, t: { sel: 'it' } }] },
    temporalbreach: { sim: 'all', effs: [{ op: 'blink', t: T('any') }] },
    frozenfortress: { sim: 'all' }
  });
  Object.assign(LEGEND_SCRIPTS, {
    setttheboss: { flags: { settSave: true }, on: { conquer: async function (G, pi) { var L = G.players[pi].legend; if (L.exhausted) { L.exhausted = false; log(G, L.c.name + ' readies (conquer).', pi); } } } },
    fioragrandduelist: { flags: { legendMighty: true } },
    ornnfirebelowthemountain: { acts: [{ label: 'Exhaust: add 1 power (any domain) for gear only (playing gear or gear abilities)', energy: 0, exhaust: true, timing: 'reaction', effs: [],
      pay: function (G, pi) { var p = G.players[pi]; p.poolPowerGear = (p.poolPowerGear || 0) + 1; log(G, 'Ornn adds 1 power for gear this turn.', pi); } }] },
    ezrealprodigalexplorer: { acts: [{ label: 'Exhaust: draw 1 (after choosing enemy units or gear twice this turn)', energy: 0, exhaust: true, timing: 'reaction', effs: [{ op: 'draw', n: 1 }],
      req: function (G, pi) { var e = G.enemyChosen && G.enemyChosen[pi]; return e && e.turn === G.turnNo && e.n >= 2 ? null : 'Choose enemy units or gear twice this turn with spells or unit abilities first.'; } }] },
    volibearrelentlessstorm: { flags: { legendPlayMighty: true } },
    nasuscuratorofthesands: { flags: { nasusReady: true } },
    kaisadaughterofthevoid: { acts: [{ label: 'Exhaust: add 1 power (any domain) for spells only', energy: 0, exhaust: true, timing: 'reaction', effs: [],
      pay: function (G, pi) { var p = G.players[pi]; p.poolPowerSpell = (p.poolPowerSpell || 0) + 1; log(G, "Kai'Sa adds 1 power for spells this turn.", pi); } }] }
  });

  // Researched from riftbound.gg legend guides and tier lists (Oct 2026). `ai` tunes how the computer plays the deck:
  // key: play-priority bonus per card; attack: 'aggro' | 'normal' | 'safe'; reserve: energy kept open for reactions;
  // holdLone: defend a battlefield with exactly one unit; reinforce: send spare units to defend held battlefields;
  // moveDraw: shuttle "when I move, draw" units; hideEager: hide Hidden cards often; equipAlways: play Equipment even
  // without units (Azir); seraphine: use Seraphine's discount.
  var PLANS = {
    kennen: { style: 'Value / off-tempo', source: 'riftbound.gg/kennen-heart-of-the-tempest-guide',
      plan: 'Keep the opponent at bay early while filling your trash, then drop cheap threats. Rhasa the Sunderer costs 1 less per card in your trash, Lightning Rush and Traveling Merchant dig and discard, and Last Rites, Fizz and Tail-Cloaked Matriarch replay cards from the trash. Kennen\'s legend gives a unit Assault 2 once you\'ve played something from outside your hand.',
      keys: ['Rhasa the Sunderer', 'Lightning Rush', 'Tail-Cloaked Matriarch', 'Switcheroo', 'Star-Crossed', 'Ride The Wind'],
      tips: ['Play cheap digging cards first; Rhasa gets cheaper with every card in your trash.', 'Play your champion from the champion zone or a face-down card to empower Kennen, then give an attacker Assault 2 in the showdown.', 'Save Switcheroo and Star-Crossed for the opponent\'s biggest unit.'],
      ai: { key: { 'Lightning Rush': 2, 'Traveling Merchant': 1.5, 'Tail-Cloaked Matriarch': 1.5 }, attack: 'normal', reserve: 2, hideEager: true, reinforce: true } },
    leblanc: { style: 'Deathknell synergy', source: 'riftbound.gg/leblanc-deceiver-guide',
      plan: 'Build around Deathknell: units that give value when they die. LeBlanc - Fragmented and Karthus (Deathknells trigger twice) are the engine; Baited Hook kills your own unit to pull a bigger one from the deck. Snowball the mid-game or out-value the opponent.',
      keys: ['Karthus - Eternal', 'LeBlanc - Fragmented', 'Baited Hook', 'Mirror Image', 'Ruined Rex', 'Glasc Mixologist'],
      tips: ['Get Karthus on the board before your big Deathknell units die.', 'Use Baited Hook on a unit whose Deathknell you want anyway.', 'Mirror Image can copy an enemy unit to fight the original.'],
      ai: { key: { 'Karthus - Eternal': 3, 'Ruined Rex': 1, 'Glasc Mixologist': 1 }, attack: 'aggro', reserve: 0, reinforce: true } },
    rengar: { style: 'Aggro', source: 'riftbound.gg/rengar-pridestalker-guide',
      plan: 'Seize the lead early and never give it back. Win the first showdowns with cheap units like Inferna (3 Might when attacking) and Irresistible Faefolk (drags a defender in), use Ambush to hide how much Might you really have, and keep drawing with Kai\'Sa, Kinkou Initiate and Nidalee.',
      keys: ['Inferna', 'Irresistible Faefolk', 'Pit Rookie', 'Kai\'Sa, Survivor', 'Punch First', 'Rengar, Trophy Hunter'],
      tips: ['Attack every turn early — Rengar has few comeback tools.', 'Play a unit before attacking: the legend gives +1 Might.', 'Hold Ambush units to surprise a defender or an attacker.'],
      ai: { key: { 'Inferna': 2, 'Irresistible Faefolk': 1.5, 'Pit Rookie': 1, 'Punch First': 1 }, attack: 'aggro', reserve: 0 } },
    irelia: { style: 'Tempo / value', source: 'riftbound.gg/irelia-blade-dancer-guide',
      plan: 'Control the pace while Irelia, Fervent dominates the board and Stellacorn Herder draws cards whenever it moves. Some lists add Astral Heron to hold battlefields late. Protect key units with Zhonya\'s Hourglass, Discipline, Defiant Dance and Defy; move them with Tideturner, Ride The Wind and Boots of Swiftness.',
      keys: ['Irelia, Fervent', 'Stellacorn Herder', 'Tideturner', 'Discipline', 'Defy', 'Zhonya\'s Hourglass'],
      tips: ['Keep 1–2 runes open for Defy or Discipline once your key units are out.', 'Move Stellacorn Herder back and forth to keep drawing.', 'Target your own exhausted units with spells to ready them through the legend.'],
      ai: { key: { 'Irelia, Fervent': 3, 'Tideturner': 1 }, attack: 'safe', reserve: 2, moveDraw: true, reinforce: true } },
    akali: { style: 'Value / protect', source: 'riftbound.gg/akali-rogue-assassin-guide',
      plan: 'Draw cards and keep key units alive. Use Shuriken Flip early so you don\'t fall behind, then land Stellacorn Herder and Irelia, Fervent when they\'re safe (bigger lists add Astral Heron to hold a battlefield). Defy, Discipline and Zhonya\'s Hourglass protect them; every removal they eat puts you further ahead.',
      keys: ['Stellacorn Herder', 'Irelia, Fervent', 'Shuriken Flip', 'Discipline', 'Defy', 'Zhonya\'s Hourglass'],
      tips: ['Don\'t fall behind on board early — Shuriken Flip is your catch-up tool.', 'Keep runes up to protect your must-remove units.', 'Akali\'s legend can pull a unit out of a losing showdown.'],
      ai: { key: { 'Irelia, Fervent': 2, 'Shuriken Flip': 1.5 }, attack: 'normal', reserve: 2, moveDraw: true, reinforce: true } },
    jayce: { style: 'Ramp / big threats', source: 'riftbound.gg/jayce-defender-of-tomorrow-guide',
      plan: 'Ramp and draw, then cheat big units into play. Dazzling Aurora (end of turn: play the top unit of your deck for free) and Promising Future put Elder Dragon on the board early to take a battlefield. Gutter Palace is a backup win condition in long games.',
      keys: ['Dazzling Aurora', 'Promising Future', 'Elder Dragon', 'Catalyst of Aeons', 'Mobilize', 'Platewyrm Egg'],
      tips: ['Ramp with Mobilize and Catalyst of Aeons early.', 'Land Dazzling Aurora as soon as you can — it wins long games.', 'Elder Dragon\'s damage kills anything it touches; aim it at their best units.'],
      ai: { key: { 'Promising Future': 3, 'Elder Dragon': 3, 'Catalyst of Aeons': 2, 'Mobilize': 1.5, 'Platewyrm Egg': 1.5 }, attack: 'normal', reserve: 0, reinforce: true } },
    masteryi: { style: 'Hold with a lone defender', source: 'riftbound.gg/master-yi-wuju-bladesman-guide',
      plan: 'Seize a battlefield early and hold it with a single unit: Master Yi gives a lone defender +2 Might, so cheap units like Lonely Poro and Scuttle Crab beat early attackers. The opponent either lets you score, or spends cards to break through. Then develop bigger threats like Ruin Runner and retake battlefields.',
      keys: ['Master Yi - Tempered', 'Lonely Poro', 'Scuttle Crab', 'Ruin Runner', 'Charm', 'Punch First'],
      tips: ['Defend each battlefield with exactly one unit to get the +2.', 'Play a 2-cost unit on turn 2 every game.', 'Charm can drag a unit into your defender or pull a defender away.'],
      ai: { key: { 'Master Yi - Tempered': 2, 'Ruin Runner': 2, 'Lonely Poro': 1, 'Scuttle Crab': 1 }, attack: 'normal', reserve: 1, holdLone: true } },
    azir: { style: 'Equipment → Sand Soldiers', source: 'riftbound.gg/azir-emperor-of-the-sands-guide',
      plan: 'Play cheap Equipment every turn so Azir\'s legend can make a Sand Soldier, and build a wide board while controlling the opponent with stuns and removal (Back Off, Hidden Blade). Late game, Arise! makes a Sand Soldier per Equipment, two of them ready to conquer immediately.',
      keys: ['Arise!', 'Guards!', 'Back Off', 'Hidden Blade', 'Discipline', 'Defy'],
      tips: ['Play an Equipment every turn, then use the legend for a Sand Soldier.', 'Save Arise! for when you control many Equipment.', 'Stun the attacker that threatens your Sand Soldiers.'],
      ai: { key: { 'Arise!': 3, 'Back Off': 1, 'Hidden Blade': 1 }, attack: 'normal', reserve: 1, equipAlways: true, reinforce: true } },
    vex: { style: 'Hold / control', source: 'riftbound.gg/vex-gloomist-guide',
      plan: 'Get set on a battlefield and control whatever the opponent sends at it. Vex, Apathetic stuns units played while she\'s on a battlefield; Astral Heron makes your support cards cheap. Use Back Off, Switcheroo and Star-Crossed on big attackers, and Boots of Swiftness or Ride The Wind to threaten the other battlefield.',
      keys: ['Vex - Apathetic', 'Astral Heron', 'Steel Paws', 'Back Off', 'Switcheroo', 'Star-Crossed'],
      tips: ['Holding draws a card each turn through the legend — keep units on your battlefield.', 'Get Vex, Apathetic onto a battlefield early.', 'Stun or bounce big attackers instead of trading.'],
      ai: { key: { 'Vex - Apathetic': 3, 'Astral Heron': 2, 'Back Off': 1 }, attack: 'safe', reserve: 2, reinforce: true } },
    reksai: { style: 'Aggro tokens', source: 'riftbound.gg tier list (heading to Radiance)',
      plan: 'A proactive deck that plays on its own turn: flood the board with tokens (Noxian Emissary, Forge of the Future), remove blockers cheaply (Cull the Weak, Imperial Decree), and conquer — Rek\'Sai\'s legend plays cards off the top of your deck every time you conquer. Strong when the opponent can\'t remove the tokens; predictable otherwise.',
      keys: ['Noxian Emissary', 'Forge of the Future', 'Void Rush', 'Cleave', 'Blood Rush', 'Rek\'Sai - Breacher'],
      tips: ['Conquer every turn you can — the legend refunds you in cards.', 'Assault spells (Cleave, Blood Rush) turn small tokens into attackers.', 'Cull the Weak is great when you have tokens and they don\'t.'],
      ai: { key: { 'Noxian Emissary': 1.5, 'Forge of the Future': 1.5, 'Void Rush': 2, 'Rek\'Sai - Breacher': 1.5 }, attack: 'aggro', reserve: 0, conquerReserve: 3 } },
    riven: { style: 'Hold / exhaust synergy', source: 'riftbound.gg/riven-the-exile-guide',
      plan: 'Units you play to battlefields you control enter ready, and Riven\'s cards reward exhausting your own units (Riven, Broken Blade buffs, stuns or readies itself; Reckless Innovator makes Gold or draws). Settle on one battlefield, stun attackers, and use Blade of the Exile (Ganking) or Charm to threaten the other.',
      keys: ['Riven - Broken Blade', 'Blade of the Exile', 'Reckless Innovator', 'Astral Heron', 'Stellacorn Herder', 'Blitzcrank - Impassive'],
      tips: ['Hold one battlefield and stun whatever attacks it.', 'Equip Blade of the Exile to Riven for +3 Might and Ganking.', 'Moving Stellacorn Herder draws a card each time.'],
      ai: { key: { 'Blade of the Exile': 2, 'Astral Heron': 2, 'Reckless Innovator': 1 }, attack: 'normal', reserve: 1, moveDraw: true, reinforce: true } },
    evelynn: { style: 'Hidden cards', source: 'riftbound.gg/evelynn-agonys-embrace-guide',
      plan: 'Hide cards on battlefields you hold and reveal them on your own turn: Evelynn\'s legend draws a card the first time each turn you play from face down. The opponent either attacks into a battlefield full of surprises or lets you hold and grow. Gold tokens (Pyke, Treasure Hunter, Gutter Guardian) pay for hiding.',
      keys: ['Evelynn - Entrancing', 'Pyke - Returned', 'Switcheroo', 'Gutter Guardian', 'Hold \'Em', 'Edge of Night'],
      tips: ['Hide a card every turn you can afford it.', 'Reveal hidden cards on your turn to draw from the legend.', 'Keep a hidden Switcheroo where the opponent wants to attack.'],
      ai: { key: { 'Evelynn - Entrancing': 1.5, 'Pyke - Returned': 1.5, 'Gutter Guardian': 1 }, attack: 'normal', reserve: 1, hideEager: true, reinforce: true } },
    mordekaiser: { style: 'Brute force', source: 'riftbound.gg/mordekaiser-iron-revenant-guide',
      plan: 'Win through big units. Mordekaiser\'s legend banishes units or gear from your trash to pay power for more units, so trade early units freely. Trifarian Captain and Spectral Matron dig and recur; Mordekaiser, Dominating and Brynhir Thundersong are the finishers.',
      keys: ['Mordekaiser - Dominating', 'Brynhir Thundersong', 'Trifarian Captain', 'Spectral Matron', 'Realm of Death', 'Vanguard Captain'],
      tips: ['Trade early units — they fuel the legend\'s power later.', 'Play Brynhir Thundersong before a big attack so they can\'t respond.', 'Mordekaiser, Dominating can discard to kill their best unit.'],
      ai: { key: { 'Mordekaiser - Dominating': 3, 'Trifarian Captain': 1.5, 'Spectral Matron': 1.5 }, attack: 'aggro', reserve: 0 } },
    orianna: { style: 'Gear into units', source: 'riftbound.gg/orianna-lady-of-clockwork-guide',
      plan: 'Play strong gear and turn the biggest one into a unit each turn with Orianna\'s legend (Might = its Energy cost). Orianna, Exquisite only deals damage with a gear nearby, so keep gear on her battlefield. Protect your gear from removal and hold a battlefield.',
      keys: ['The Ball', 'Hunting Blind', 'Resplendent Rostrum', 'Orianna - Exquisite', 'Command: Attack', 'Frigid Jewel'],
      tips: ['Turn your most expensive gear into a unit each turn.', 'Deploy The Ball or Hunting Blind where Orianna, Exquisite fights.', 'Expect gear removal — keep a counter if you can.'],
      ai: { key: { 'The Ball': 2.5, 'Hunting Blind': 2, 'Resplendent Rostrum': 2, 'Orianna - Exquisite': 1.5 }, attack: 'safe', reserve: 1, reinforce: true } },
    seraphine: { style: 'Token swarm', source: 'riftbound.gg/seraphine-starry-eyed-songstress-guide',
      plan: 'Flood the board with Recruit tokens and exhaust three units at once to trigger Seraphine: her legend makes a spell cost 2 less, and Seraphine, Inspiring draws when you exhaust three. Raucous Anthem is the finisher; Encore and Concert Poster keep the tokens coming.',
      keys: ['Seraphine - Inspiring', 'Encore', 'Concert Poster', 'Raucous Anthem', 'Vanguard Captain', 'Eclipse'],
      tips: ['Make tokens early; exhausting three at once is your engine.', 'Use the legend discount on your expensive spells.', 'Raucous Anthem with a wide board usually wins the game.'],
      ai: { key: { 'Seraphine - Inspiring': 2, 'Encore': 2, 'Raucous Anthem': 2, 'Concert Poster': 1 }, attack: 'normal', reserve: 0, seraphine: true } },
    sett: { style: "Aggro / Battlefield control (buffs)", source: "riftbound.gg/sett-the-boss-guide/",
      plan: "Body/Order buff aggro that scores at all costs: put +1 buffs on cheap units, make Fiora - Victorious Mighty early, then spend buffs for free pump (Call to Glory, Sett - Brawler) to win every showdown. The legend recalls a buffed unit that would die, and readies itself whenever you conquer, so trades always favour you.",
      keys: ["Fiora - Victorious", "Pit Rookie", "Pillaged Armory", "Showstopper", "Trifarian Captain", "Irresistible Faefolk"],
      tips: ["Turn 1: Trifarian Captain (dig for Pit Rookie / First Mate / Pillaged Armory) or Irresistible Faefolk.", "Turn 2: Pit Rookie buffing your turn-1 unit; or Pillaged Armory deployed at the battlefield you want plus Showstopper to buff a base unit and move it there.", "Turn 3: Fiora - Victorious, then buff her (Pit Rookie / Showstopper / Pillaged Armory) to 5 Might: Mighty gives Deflect, Ganking and Shield."],
      ai: { key: {"Fiora - Victorious": 4, "Pit Rookie": 3, "Pillaged Armory": 3, "Showstopper": 3, "Trifarian Captain": 2, "Irresistible Faefolk": 2}, attack: "aggro", reserve: 1 } },
    fiora: { style: "Midrange / Ramp (Mighty)", source: "riftbound.gg/fiora-grand-duelist-guide/",
      plan: "Body/Order Mighty midrange: every time a unit becomes Mighty (5+ Might) the legend channels a rune, so Pit Rookie buffs, Kayle - Justified empowers, Shepherd's Heirloom and Punch First double as ramp. Fiora - Worthy readies the newly Mighty unit to attack again; big Deflect bodies (Poppy, Rengar, Mordekaiser) close.",
      keys: ["Kayle - Justified", "Fiora - Worthy", "Pit Rookie", "Shepherd's Heirloom", "Rengar - Trophy Hunter", "Mordekaiser - Dominating"],
      tips: ["Turn 1: Trifarian Captain (find Pit Rookie, Kayle - Justified, Shepherd's Heirloom or Portable Portal) or Shepherd's Heirloom (gain 1 XP).", "Turn 2: Kayle - Justified or Kinkou Initiate; or Pit Rookie buffing a unit.", "Empower Kayle - Justified (3 energy, 2 at Risen Altar): +2 each, first empower makes her Mighty and channels a rune."],
      ai: { key: {"Kayle - Justified": 4, "Fiora - Worthy": 3, "Pit Rookie": 3, "Shepherd's Heirloom": 3, "Rengar - Trophy Hunter": 3, "Mordekaiser - Dominating": 3}, attack: "normal", reserve: 1, reinforce: true } },
    volibear: { style: "Ramp / Big units", source: "riftbound.gg/volibear-relentless-storm-guide/",
      plan: "Fury/Body ramp: every Mighty unit you play lets the legend channel an extra rune, so Jayce - Hammer in Hand (5 Might for 4) and Minotaur Reckoner snowball into Kadregrin, Volibear - Furious and Elder Dragon. Post-ban Dazzling Aurora is gone, so the deck wins by hard-casting fatties and clearing blockers with Stormbringer and Sky Splitter.",
      keys: ["Jayce - Hammer in Hand", "Elder Dragon", "Volibear - Furious", "Platewyrm Egg", "Mobilize", "Minotaur Reckoner"],
      tips: ["Turn 1: Mobilize (channel 1 rune exhausted) or Platewyrm Egg (empower it next turn for +2 energy per use).", "Turn 2: Jayce - Hammer in Hand (5 Might, Mighty) -> exhaust legend to channel a rune. Choose Ganking or Assault 2 when he readies.", "Minotaur Reckoner or Rengar - Trophy Hunter (each Mighty -> legend rune). Reckoner stops units moving back to base."],
      ai: { key: {"Jayce - Hammer in Hand": 4, "Elder Dragon": 4, "Volibear - Furious": 4, "Platewyrm Egg": 3, "Mobilize": 3, "Minotaur Reckoner": 3}, attack: "safe", reserve: 0 } },
    kaisa: { style: "Control / Removal", source: "riftbound.gg/?p=4894",
      plan: "Fury/Mind spell control, the top Riven counter in Radiance: kill every unit that reaches a battlefield with cheap damage (Hextech Ray, Falling Star, Void Seeker, Singularity), using the legend's free rune for spells. Then land Thousand-Tailed Watcher or The Empyrean to win the resource war. Brynhir Thundersong is banned from Nov 23.",
      keys: ["Thousand-Tailed Watcher", "Singularity", "Void Seeker", "Falling Star", "Hextech Ray", "The Empyrean"],
      tips: ["Turn 1: Watchful Sentry or Plundering Poro to take an empty battlefield; or hold Hextech Ray.", "Use Kai'Sa's legend every turn: it adds 1 any rune for a spell.", "Singularity: 6 damage to two units (two-for-one)."],
      ai: { key: {"Thousand-Tailed Watcher": 4, "Singularity": 3, "Void Seeker": 3, "Falling Star": 3, "Hextech Ray": 3, "The Empyrean": 3}, attack: "safe", reserve: 2, reinforce: true } },
    ezreal: { style: 'Gear / control', source: 'riftbound.gg (Convergence IV 6th of 272)',
      plan: 'Chaos/Mind control: answer threats with Stupefy, Gust, Star-Crossed, Singularity and An Offer You Can\'t Refuse, grind value with Treasure Trove and Pack of Wonders, and use Ezreal\'s legend to draw once you have chosen enemy units or gear twice in a turn. Vex, Apathetic and Thousand-Tailed Watcher hold the battlefields.',
      keys: ['Vex - Apathetic', 'Thousand-Tailed Watcher', 'The List', 'Treasure Trove', 'Pack of Wonders', 'Singularity'],
      tips: ['Target two enemy units or gear with spells in one turn, then exhaust Ezreal to draw.', 'Name the opponent\'s champion tag with The List.', 'Kill Treasure Trove yourself when you need the card and the rune.'],
      ai: { key: { 'Vex - Apathetic': 3, 'Thousand-Tailed Watcher': 3, 'The List': 2, 'Treasure Trove': 2, 'Fizz - Trickster': 1 }, attack: 'safe', reserve: 2, reinforce: true } },
    settkingpin: { style: 'Buff aggro (Kingpin)', source: 'riftwatch.gg (Stuttgart Regional 23rd of 315)',
      plan: 'Body/Order buff aggro built around Sett, Kingpin: every buffed friendly unit at his battlefield gives him +1 Might, and he has Tank. Buff cheap units with Pit Rookie, Pillaged Armory, Showstopper and Valley of Idols, push with Fiora, Victorious and Rengar, and let the legend save buffed units that would die.',
      keys: ['Sett - Kingpin', 'Fiora - Victorious', 'Pit Rookie', 'Pillaged Armory', 'Showstopper', 'Call to Glory'],
      tips: ['Stack buffed units on Sett, Kingpin\'s battlefield.', 'Pay 1 at Valley of Idols to buff units you play there.', 'Spend a buff to cast Call to Glory for free.'],
      ai: { key: { 'Sett - Kingpin': 3, 'Fiora - Victorious': 3, 'Pit Rookie': 2, 'Pillaged Armory': 2, 'Showstopper': 2 }, attack: 'aggro', reserve: 1 } },
    ornn: { style: 'Gear ramp', source: 'riftbound.gg (LDXP Sacramento 88th of 755)',
      plan: 'Calm/Mind gear deck: Ornn\'s legend adds power for gear, Seal of Focus and Poro Snax smooth mana and draw, Ornn, Blacksmith digs gear, Pit Crew readies when you play gear, and Plaza Guardian gets cheaper for every gear you control.',
      keys: ['Ornn - Blacksmith', 'Plaza Guardian', 'Pit Crew', 'Sprite Fountain', 'Aspiring Engineer', 'Poro Snax'],
      tips: ['Play gear every turn: it fuels Plaza Guardian and readies Pit Crew.', 'Use Ornn\'s legend to pay for gear or gear abilities.', 'Crack Poro Snax when you need a card.'],
      ai: { key: { 'Ornn - Blacksmith': 3, 'Plaza Guardian': 3, 'Pit Crew': 2, 'Sprite Fountain': 2 }, attack: 'normal', reserve: 1, reinforce: true } },
    nasus: { style: 'Calm/Mind control', source: 'riftbound.gg (LDXP Sacramento 41st of 755)',
      plan: 'Calm/Mind control: trade with cheap units and spells, ramp with Find Your Center and Life from Stone, then land The Empyrean (8 energy, the legend readies 2 runes) and win with Time Warp or a board wipe from Unchecked Power.',
      keys: ['The Empyrean', 'Nasus, Guardian of Knowledge', 'Time Warp', 'Unchecked Power', 'Find Your Center'],
      tips: ['The legend readies 2 runes whenever you play a 7+ energy unit or gear: The Empyrean effectively costs 6.', 'Keep Defy/Hush up for their key spell.', 'Unchecked Power exhausts your own units first: cast it when they have more at battlefields than you.'],
      ai: { key: { 'The Empyrean': 3, 'Nasus, Guardian of Knowledge': 2, 'Time Warp': 2 }, attack: 'normal', reserve: 2, reinforce: true } }
  };
  function keyBonus(A, name) {
    if (!A.key) return 0;
    if (!A.keyN) { A.keyN = {}; Object.keys(A.key).forEach(function (k) { A.keyN[norm(k)] = A.key[k]; }); }
    return A.keyN[norm(name)] || 0;
  }
  // Deck guides researched from pro play (src/guides.json): decision tree for the Guide screen + hints the AI follows.
  function loadGuides(gs) {
    Object.keys(gs || {}).forEach(function (id) {
      var pl = PLANS[id], g = gs[id];
      if (!pl || !g) return;
      pl.guide = g;
      var A = pl.ai, h = g.ai || {};
      A.key = A.key || {};
      Object.keys(h.priority || {}).forEach(function (k) { A.key[k] = Math.max(A.key[k] || 0, h.priority[k]); });
      A.keyN = null;
      A.holdN = {}; (h.holdForShowdown || g.holdFor || []).forEach(function (k) { A.holdN[norm(k)] = 1; });
      A.mullN = {}; ((g.mulligan && g.mulligan.keep) || h.mulliganKeep || []).forEach(function (k) { A.mullN[norm(k)] = 1; });
      A.tossN = {}; ((g.mulligan && g.mulligan.toss) || []).forEach(function (k) { A.tossN[norm(k)] = 1; });
      if (h.attack) A.attack = h.attack;
      if (h.reserveEnergy != null) A.reserve = h.reserveEnergy;
      A.rules = h.rules || [];
    });
  }
  function planOf(G, pi) { var d = G.players[pi].deckDef; return (d && (PLANS[d.planId] || PLANS[d.id])) || null; }
  function aiOf(G, pi) { var pl = planOf(G, pi); return (pl && pl.ai) || {}; }

  /* ---------------- AI ---------------- */
  function evalEffects(G, pi, effs, ctx) {
    var value = 0, good = true, targets = [];
    effs.forEach(function (e) {
      if (needsChoice(e)) {
        var cands = candidates(G, pi, e, ctx), u = autoChoose(G, pi, e, cands);
        if (!u) { targets.push(null); if (!e.opt && (isHarmful(e) || e.op === 'buff')) good = false; return; }
        targets.push(u.uid);
        ctx.it = u;
        if (u.ctrl === pi && isHarmful(e) && !e.selfOk) {
          if ((e.op === 'tohand' || e.op === 'tobase') && G.showdownAt != null && u.loc === G.showdownAt) { value += 0.5 * unitValue(u); return; }
          good = false; return;
        }
        if (e.op === 'moveUnit') {
          if (u.ctrl === pi) {
            var open = G.bfs.some(function (b, i) { return i !== u.loc && b.ctrl !== pi && !unitsAt(G, i, opp(pi)).length; });
            value += (open ? 3 : 0) + (e.ready && u.ex ? 1 : 0) + (moveDraws(u) ? 1.6 : 0);
          }
          return;
        }
        if (e.op === 'kill' && u.ctrl === pi) { value -= unitValue(u); return; }
        if (e.op === 'kill') value += unitValue(u) + 1;
        else if (e.op === 'deal') value += (might(u) - u.damage <= e.n) ? unitValue(u) + 1 : 0;
        else if (e.op === 'stun') value += u.loc !== 'base' && might(u) >= 3 ? 2 : 0.5;
        else if (e.op === 'tohand' || e.op === 'tobase') value += (u.loc !== 'base' && (G.bfs[u.loc].ctrl === u.ctrl || u.loc === G.showdownAt)) ? unitValue(u) : 0;
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
  // Combat tricks: Reaction/Action spells that only pump or protect a unit (Discipline, En Garde, Defiant Dance...).
  // The AI keeps these for showdowns, where they can flip a fight, instead of casting them in the main phase.
  function trickN(c) {
    if (c.type !== 'Spell' || !(c.P.kw.reaction || c.P.kw.action) || !c.P.spell.length) return 0;
    var n = 0, ok = c.P.spell.every(function (e) {
      if (e.op === 'might') { if (e.n > 0 && (e.t.sel === 'friendly' || e.t.sel === 'any')) n += e.n; return true; }
      if (e.op === 'engarde') { n += 2; return true; }
      if (e.op === 'shroud') { n += 1; return true; }
      return e.op === 'draw';
    });
    return ok ? n : 0;
  }
  function trickBonus(G, pi, energy) {
    var p = G.players[pi], left = energy == null ? energyAvail(p) : energy, tot = 0;
    p.hand.map(function (x) { return x; }).filter(function (x) { return trickN(x.c) > 0; })
      .sort(function (a, b) { return trickN(b.c) - trickN(a.c); }).forEach(function (x) {
        var cost = cardCost(x.c, false, G, pi, 'hand').energy;
        if (cost <= left && canPlay(G, pi, x.iid, false, { reaction: true }).ok) { left -= cost; tot += trickN(x.c); }
      });
    return tot;
  }
  function aiCardChoice(G, pi, card) {
    var c = card.c, A = aiOf(G, pi), p = G.players[pi], bonus = keyBonus(A, c.name), sera = false;
    if (!canPlay(G, pi, card.iid, false).ok) {
      // Seraphine: exhaust the legend and three units to make a spell affordable
      if (A.seraphine && c.type === 'Spell' && seraphineReady(G, pi) && canPlay(G, pi, card.iid, false, { seraphine: true }).ok) sera = true;
      else return null;
    }
    // Keep energy open for reactions (Defy, Discipline...) once the board is developed, unless this is a key card.
    if (A.reserve && !sera && !c.P.kw.reaction && unitsOf(G, pi).length >= 2 && bonus < 2.5 &&
        p.hand.some(function (x) { return x !== card && (x.c.P.counter || (x.c.type === 'Spell' && x.c.P.kw.reaction)); }) &&
        energyAvail(p) - cardCost(c, false, G, pi, 'hand').energy < A.reserve) return null;
    var hid = p.hidden.filter(function (h) { return h.card === card; })[0];
    // Rek'Sai: keep energy before attacking to pay for what the legend reveals on a conquer.
    if (A.conquerReserve && G.aiPreAttack && !p.legend.exhausted && G.units.some(function (u) { return u.ctrl === pi && u.loc === 'base' && !u.ex; }) &&
        energyAvail(p) - cardCost(c, false, G, pi, 'hand').energy < A.conquerReserve && bonus < 2.5) return null;
    var ctx = { src: null, loc: hid ? hid.loc : c.type === 'Unit' ? 'base' : null, fromHidden: !!hid, reserveRunes: c.power || 0 };
    if (aiLvl(G, pi) >= 1) bonus += aiSynergy(G, pi, c);
    if (aiLvl(G, pi) >= 2) { var rr = aiRules(G, pi, c); if (rr === null) return null; bonus += rr; }
    if (c.type === 'Unit') {
      var ev = evalEffects(G, pi, playEffects(c), ctx);
      var v = (c.energy || 0) + (c.might || 0) + (c.power || 0) * 0.5 + (ev.good ? Math.max(0, ev.value) : 0) + bonus;
      var accel = !!c.P.kw.accelerate && canPlay(G, pi, card.iid, true).ok;
      return { value: v, opts: { accel: accel, targets: ev.targets } };
    }
    if (c.type === 'Spell') {
      if (G.showdownAt == null && trickN(c) > 0) return null;
      // Reactions the guide says pros keep for the opponent's turn (holding Action-only cards measured worse: the AI rarely finds the showdown for them).
      if (G.showdownAt == null && A.holdN && A.holdN[norm(c.name)] && c.P.kw.reaction && !c.P.counter) return null;
      var es = evalEffects(G, pi, c.P.spell, ctx);
      if (!es.good || es.value + bonus < 1.5) return null;
      return { value: es.value + 0.5 + bonus, opts: { targets: es.targets, seraphine: sera } };
    }
    if (c.type === 'Gear') {
      if (c.P.equip) return unitsOf(G, pi).length || A.equipAlways ? { value: 2 + c.P.equipBonus + bonus, opts: {} } : null;
      var eg = evalEffects(G, pi, playEffects(c), { src: null, loc: 'base' });
      return { value: 0.5 + Math.max(0, eg.value) + bonus, opts: { targets: eg.targets } };
    }
    return null;
  }
  // Level 1+: equipping, gear abilities and unit abilities scored like cards so they compete for energy every step.
  function aiAbilityChoices(G, pi) {
    var p = G.players[pi], out = [], A = aiOf(G, pi);
    p.gear.filter(function (g) { return g.c.P.equip && canEquip(G, pi, g).ok; }).forEach(function (g) {
      out.push({ value: 2 + (g.c.P.equipBonus || 0) + (A.equipAlways ? 1 : 0) + keyBonus(A, g.c.name) * 0.5, run: function () { return equipGear(G, pi, g); }, what: 'equip ' + g.c.name, kind: 'ability',
        apply: function (H) { var hg = H.players[pi].gear.filter(function (x) { return x.iid === g.iid; })[0]; return hg ? equipGear(H, pi, hg) : { ok: false }; } });
    });
    p.gear.forEach(function (g) {
      (g.c.P.gearActs || []).forEach(function (a, idx) {
        if (!canUseGear(G, pi, g.iid, idx).ok || g.c.P.addPower) return;   // Seals pay automatically when needed
        if (a.selfOk || (a.effs || []).some(function (e) { return e.selfOk; })) return;
        var v;
        if (a.aiValue) v = a.aiValue(G, pi, g);
        else if (a.effs && a.effs.length) { var ev = evalEffects(G, pi, a.effs, { src: null, loc: g.loc != null ? g.loc : null, gear: g }); if (!ev.good) return; v = ev.value; }
        else v = 1.2;
        v -= 0.6 * (a.energy || 0) + 0.8 * (a.power || 0);
        if (a.discard) { if (p.hand.length < 4) return; v -= 1.2; }
        if (a.killSelf) v -= 0.5;
        out.push({ value: v, run: function () { return useGear(G, pi, g.iid, idx); }, what: g.c.name, kind: 'ability', apply: function (H) { return useGear(H, pi, g.iid, idx); } });
      });
    });
    G.units.forEach(function (u) {
      if (u.ctrl !== pi || !u.c.P.unitAct || !canUseUnit(G, pi, u.uid).ok) return;
      var a = u.c.P.unitAct;
      if (a.killFriendly && !unitsOf(G, pi).some(function (x) { return x !== u && x.token; })) return;
      var ev = evalEffects(G, pi, a.effs || [], { src: u, loc: u.loc });
      if (!ev.good) return;
      var v = ev.value - 0.6 * unitActEnergy(G, u, a) - 0.8 * (a.power || 0) - (a.killFriendly ? 1 : 0) - (a.exhaustFriendly ? 0.6 : 0);
      out.push({ value: v, run: function () { return useUnit(G, pi, u.uid); }, what: u.c.name, kind: 'ability', apply: function (H) { return useUnit(H, pi, u.uid); } });
    });
    return out;
  }
  // Level 2: sequencing rules from the deck guide (guides.json ai.rules):
  //   { type: 'hold', card, until: cond }        don't play card until cond holds
  //   { type: 'before', first: [..], then: [..] } play a 'first' card before any 'then' card while one is in hand
  //   { type: 'prefer', card, when: cond, bonus } extra priority when cond holds
  // cond keys (all must hold): units, gear, equipment, turn (your turn number), enemyUnits, enemyMight (biggest enemy
  // unit's Might), hand, trash, onBoard (card name), points, oppPoints, runes
  function aiCond(G, pi, w) {
    var p = G.players[pi], mine = unitsOf(G, pi), foes = G.units.filter(function (u) { return u.ctrl !== pi && !u.dead; });
    var myTurn = pi === G.first ? Math.ceil(G.turnNo / 2) : Math.floor(G.turnNo / 2);
    var eq = mine.reduce(function (s2, u) { return s2 + u.equips.length; }, 0) + p.gear.filter(function (g) { return g.c.P.equip; }).length;
    var chk = {
      units: function (n) { return mine.length >= n; }, gear: function (n) { return p.gear.filter(function (g) { return !g.token; }).length + eq - p.gear.filter(function (g) { return g.c.P.equip; }).length >= n; },
      equipment: function (n) { return eq >= n; }, turn: function (n) { return myTurn >= n; }, enemyUnits: function (n) { return foes.length >= n; },
      enemyMight: function (n) { return foes.some(function (u) { return might(u) >= n; }); }, hand: function (n) { return p.hand.length >= n; },
      trash: function (n) { return p.trash.length >= n; }, runes: function (n) { return p.runes.length >= n; },
      points: function (n) { return p.points >= n; }, oppPoints: function (n) { return G.players[opp(pi)].points >= n; },
      onBoard: function (nm) { return mine.some(function (u) { return norm(u.c.name) === norm(nm); }) || p.gear.some(function (g) { return norm(g.c.name) === norm(nm); }); }
    };
    return Object.keys(w || {}).every(function (k) { return !chk[k] || chk[k](w[k]); });
  }
  function aiRules(G, pi, c) {
    var rules = aiOf(G, pi).rules || [], p = G.players[pi], v = 0, n = norm(c.name);
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.type === 'hold' && norm(r.card) === n && !aiCond(G, pi, r.until)) return null;
      if (r.type === 'prefer' && norm(r.card) === n && aiCond(G, pi, r.when)) v += r.bonus || 2;
      if (r.type === 'before' && (r.then || []).some(function (x) { return norm(x) === n; })) {
        var first = p.hand.filter(function (x) { return (r.first || []).some(function (f) { return norm(f) === norm(x.c.name); }); })[0];
        if (first && !aiCond(G, pi, { onBoard: first.c.name })) v -= canPlay(G, pi, first.iid, false).ok ? 4 : 1;
      }
    }
    return v;
  }
  // Level 1+: combo enablers and engines are worth more than their immediate effect.
  function aiSynergy(G, pi, c) {
    var p = G.players[pi], v = 0, hand = p.hand.map(function (x) { return x.c; }), mine = unitsOf(G, pi);
    var isDK = function (x) { return x.P && x.P.trig && x.P.trig.deathknell; };
    if (c.P.doubleDeathknell) v += 0.8 * Math.min(4, hand.filter(isDK).length + mine.filter(function (u) { return isDK(u.c); }).length);
    if (isDK(c) && !c.P.doubleDeathknell && !mine.some(function (u) { return u.c.P.doubleDeathknell; })) {
      var k = p.hand.filter(function (x) { return x.c.P.doubleDeathknell; })[0];
      // wait for Karthus only when both fit this turn; otherwise play the better card now
      if (k && canPlay(G, pi, k.iid, false).ok && energyAvail(p) >= cardCost(k.c, false, G, pi, 'hand').energy + cardCost(c, false, G, pi, 'hand').energy) v -= 2.5;
    }
    if (c.P.equip) {
      if (p.legend.c && p.legend.c.P.sandWeaponmaster) v += 1;
      v += 0.5 * mine.filter(function (u) { return u.c.P.kw.weaponmaster; }).length;
    }
    var early = G.turnNo <= 8;
    if (c.type === 'Gear' && !c.P.equip && !c.P.kw.deploy && ((c.P.gearActs && !c.P.addPower) || c.P.addEnergy || c.P.onLeave)) v += early ? 1 : 0.4;
    if (c.type === 'Unit' && (c.might || 0) >= 5 && p.legend.c && (p.legend.c.P.legendMighty || p.legend.c.P.legendPlayMighty) && !p.legend.exhausted) v += 1;
    return v;
  }
  /* ---------- level 3: turn lookahead ---------- */
  // Copy the game for a what-if line: card definitions are shared (immutable), everything else is copied; every decision
  // in the copy is answered automatically and it has its own random generator, so the real game is untouched.
  function cloneGame(G, seed) {
    var seen = new Map();
    var cp = function (v, key) {
      if (v === null || typeof v !== 'object') return v;
      if (key === 'c' || key === 'deckDef' || key === 'legendCard' || key === 'championCard' || key === 'bfCards') return v;
      if (seen.has(v)) return seen.get(v);
      var o = Array.isArray(v) ? [] : {};
      seen.set(v, o);
      if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) o[i] = cp(v[i]); }
      else for (var k in v) {
        if (v === G && (k === 'log' || k === 'events' || k === 'onLog' || k === 'ask' || k === 'rnd')) continue;
        o[k] = cp(v[k], k);
      }
      return o;
    };
    var NG = cp(G);
    NG.log = []; NG.events = []; NG.onLog = null; NG.ask = null; NG.human = -1; NG.isClone = true; NG.mightyBusy = false;
    NG.rnd = (function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(seed);
    NG.aiLevel = [2, 2]; NG.probe = null; NG.recordHuman = false; NG.decisions = null;
    return NG;
  }
  // Position features (mine minus the opponent's unless named otherwise), used by the learned evaluation (level 4).
  var EVAL_FEATURES = ['ptsDiff', 'myPts2', 'oppPts2', 'bfDiff', 'boardValDiff', 'bfMightDiff', 'unitDiff', 'handDiff', 'runeDiff',
    'energyGearDiff', 'gearDiff', 'goldDiff', 'buffDiff', 'xpDiff', 'hiddenDiff', 'deckDiff', 'champDiff'];
  function evalFeatures(G, pi) {
    var o = opp(pi), me = G.players[pi], op = G.players[o];
    var side = function (q) {
      var pl = G.players[q], us = G.units.filter(function (u) { return u.ctrl === q && !u.dead; });
      return {
        bf: G.bfs.filter(function (b) { return b.ctrl === q; }).length,
        val: us.reduce(function (s2, u) { return s2 + unitValue(u); }, 0),
        bfm: us.filter(function (u) { return u.loc !== 'base'; }).reduce(function (s2, u) { return s2 + might(u); }, 0),
        units: us.length, hand: pl.hand.length, runes: pl.runes.length,
        eg: pl.gear.filter(function (g) { return g.c.P.addEnergy; }).reduce(function (s2, g) { return s2 + (g.empowered ? 2 : 1); }, 0),
        gear: pl.gear.filter(function (g) { return !g.token && g.c.supertype !== 'Token'; }).length + us.reduce(function (s2, u) { return s2 + u.equips.length; }, 0),
        gold: pl.gear.filter(function (g) { return g.c.P.consumed; }).length, buffs: us.filter(function (u) { return u.buff; }).length,
        xp: pl.xp || 0, hidden: pl.hidden.length, deck: pl.deck.length, champ: pl.champion ? 1 : 0
      };
    };
    var a = side(pi), b = side(o);
    return [me.points - op.points, me.points * me.points / 8, op.points * op.points / 8, a.bf - b.bf, a.val - b.val, a.bfm - b.bfm, a.units - b.units,
      a.hand - b.hand, a.runes - b.runes, a.eg - b.eg, a.gear - b.gear, a.gold - b.gold, a.buffs - b.buffs, a.xp - b.xp, a.hidden - b.hidden,
      Math.max(-10, Math.min(10, a.deck - b.deck)), a.champ - b.champ];
  }
  // Learned by self-play (quant/train_eval.js + quant/fit_eval.py): logistic win probability from evalFeatures.
  // EVAL_MODEL_START
  var EVAL_MODEL = {"names":["ptsDiff","myPts2","oppPts2","bfDiff","boardValDiff","bfMightDiff","unitDiff","handDiff","runeDiff","energyGearDiff","gearDiff","goldDiff","buffDiff","xpDiff","hiddenDiff","deckDiff","champDiff"],"b":-0.0,"w":[0.148,0.40674,-0.40674,-0.20618,0.10561,-0.01006,0.00325,0.1234,0.20567,0.12502,0.14283,0.15678,0.1798,0.00347,0.41925,0.01747,0.34399]};
  // EVAL_MODEL_END
  // How good is this position for pi (after the opponent's reply)? learned: use the self-play model (level 4).
  function evalState(G, pi, learned) {
    var o = opp(pi);
    if (G.winner === pi) return 1e4;
    if (G.winner === o) return -1e4;
    if (learned && EVAL_MODEL) {
      var f = evalFeatures(G, pi), z = EVAL_MODEL.b;
      for (var fi = 0; fi < f.length; fi++) z += EVAL_MODEL.w[fi] * f[fi];
      return 10 * z;   // logit scaled to the hand-tuned score's range
    }
    var me = G.players[pi], op = G.players[o], v = 12 * (me.points - op.points);
    G.bfs.forEach(function (b) { if (b.ctrl === pi) v += 3; else if (b.ctrl === o) v -= 3; });
    G.units.forEach(function (u) { if (u.dead) return; var w = unitValue(u) + (u.loc !== 'base' ? 0.5 : 0); v += u.ctrl === pi ? w : -w; });
    var eg = function (pl) { return pl.gear.filter(function (g) { return g.c.P.addEnergy; }).reduce(function (s2, g) { return s2 + (g.empowered ? 2 : 1); }, 0); };
    v += 1.0 * (me.hand.length - op.hand.length) + 0.8 * (me.runes.length - op.runes.length) + 0.8 * (eg(me) - eg(op)) +
      0.4 * (me.gear.filter(function (g) { return !g.token; }).length - op.gear.filter(function (g) { return !g.token; }).length);
    return v;
  }
  // Candidate first moves: the heuristic's best few cards and abilities, the legend, and "stop playing now".
  function aiCandidates(G, pi) {
    var p = G.players[pi], out = [];
    p.hand.concat(p.champion ? [p.champion] : [], p.hidden.map(function (h) { return h.card; })).forEach(function (card) {
      var ch = aiCardChoice(G, pi, card);
      if (ch) out.push({ value: ch.value, kind: 'card', iid: card.iid, opts: ch.opts, name: card.c.name });
    });
    out.sort(function (a, b) { return b.value - a.value; });
    out = out.slice(0, 4);
    aiAbilityChoices(G, pi).filter(function (a) { return a.value >= 0.5; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 2).forEach(function (a) { out.push(a); });
    legendActs(G, pi).forEach(function (a, idx) {
      if (!canUseLegend(G, pi, idx).ok) return;
      var le = actEffects(G, pi, a);
      if (!le.length || le.some(function (e) { return e.op === 'assault' || e.op === 'tobase'; })) return;
      var ev = evalEffects(G, pi, le, { src: null, loc: null });
      if (ev.good && ev.value >= 1) out.push({ value: ev.value, kind: 'legend', idx: idx, targets: ev.targets, name: 'legend' });
    });
    out.push({ value: 0, kind: 'stop', name: 'stop' });
    return out;
  }
  async function applyCandidate(G, pi, c) {
    if (c.kind === 'card') return playCard(G, pi, c.iid, c.opts);
    if (c.kind === 'legend') return useLegend(G, pi, c.idx, c.targets);
    if (c.kind === 'ability') return c.apply(G);
    return { ok: true };
  }
  // Play the candidate on a copy, finish the turn and the opponent's reply with the level-2 AI, and score the result.
  async function rollout(G, pi, c, seed, learned) {
    var H = cloneGame(G, seed), pre = !!G.aiPreAttack, noop = function () { return Promise.resolve(); };
    // Fair play: the AI can't see the opponent's hand or either deck order, so each line uses a random guess for them
    // (the opponent's hand is redealt from their unseen cards, both decks are shuffled).
    var oh = H.players[opp(pi)], unseen = oh.hand.concat(oh.deck);
    shuffle(unseen, H.rnd);
    oh.hand = unseen.slice(0, oh.hand.length); oh.deck = unseen.slice(oh.hand.length);
    shuffle(H.players[pi].deck, H.rnd);
    var r = await applyCandidate(H, pi, c);
    if (r && r.ok === false) return -Infinity;
    if (H.winner == null && c.kind !== 'stop') await aiPlayLoop(H, pi, noop);
    if (pre) {
      H.aiPreAttack = false;
      if (H.winner == null) await aiLegend(H, pi, noop);
      if (H.winner == null) await aiLoneDefenders(H, pi, noop);
      if (H.winner == null) await aiAttack(H, pi, noop);
      if (H.winner == null) await aiPlayLoop(H, pi, noop);
    }
    if (H.winner == null) await aiLegend(H, pi, noop, true);
    if (H.winner == null) await aiPosition(H, pi, noop);
    if (H.winner == null) await aiHide(H, pi, noop);
    if (H.winner == null) await endTurn(H);
    for (var guard = 0; guard < 3 && H.winner == null && H.active !== pi; guard++) { await aiTurn(H, H.active); if (H.winner == null) await endTurn(H); }
    return evalState(H, pi, learned);
  }
  var LOOK_SAMPLES = (typeof process !== 'undefined' && process.env && +process.env.RT_LOOK_SAMPLES) || 2;
  async function aiLookahead(G, pi) {
    var cands = aiCandidates(G, pi);
    if (cands.length <= 1) return cands[0];
    var best = null, bv = -Infinity;
    var crn = aiLvl(G, pi) >= 7, nS = crn ? Math.max(3, LOOK_SAMPLES) : LOOK_SAMPLES, base = (G.turnNo * 7919 + (G.lookSeed = (G.lookSeed || 0) + 1) * 15485863) | 0;
    for (var i = 0; i < cands.length; i++) {
      var v = 0;   // average over guesses of the hidden cards (level 7: the same guesses for every candidate)
      for (var sm = 0; sm < nS; sm++) v += await rollout(G, pi, cands[i], crn ? (base + sm * 31337) | 0 : (G.turnNo * 7919 + i * 104729 + sm * 31337 + (G.lookSeed = (G.lookSeed || 0) + 1)) | 0, aiLvl(G, pi) >= 4);
      v /= nS;
      if (v > bv + 0.25 || (best && best.kind === 'stop' && v > bv)) { bv = v; best = cands[i]; }
    }
    return best;
  }
  // Level 5: showdown lookahead. Reactive play (tricks, stuns, removal and Ambush in a fight) is where spell and combo decks
  // win games, and the level-2 heuristic plays it greedily. For each response (and passing), play it on a copy, let the rest of
  // the showdown, the fight, the rest of the turn and the next turn play out (level 2), and keep the best average result.
  var SD_SAMPLES = 2;
  function determinize(H, pi) {
    var oh = H.players[opp(pi)], unseen = oh.hand.concat(oh.deck);
    shuffle(unseen, H.rnd);
    oh.hand = unseen.slice(0, oh.hand.length); oh.deck = unseen.slice(oh.hand.length);
    shuffle(H.players[pi].deck, H.rnd);
  }
  async function finishTurnAndNext(H) {
    var noop = function () { return Promise.resolve(); }, a = H.active;
    if (H.winner == null) await aiPlayLoop(H, a, noop);
    if (H.winner == null) await aiLegend(H, a, noop, true);
    if (H.winner == null) await aiPosition(H, a, noop);
    if (H.winner == null) await aiHide(H, a, noop);
    if (H.winner == null) await endTurn(H);
    if (H.winner == null) { await aiTurn(H, H.active); if (H.winner == null) await endTurn(H); }
  }
  async function showdownRollout(G, side, attacker, bi, nonCombat, o, passes, seed) {
    var H = cloneGame(G, seed);
    determinize(H, side);
    if (o) {
      var r = o.kind === 'legend' ? await useLegend(H, side, o.idx, null, { showdown: bi })
        : await playCard(H, side, o.card.iid, { reaction: true, showdown: bi, loc: o.kind === 'ambush' ? bi : undefined });
      if (r && r.ok === false) return -Infinity;
    }
    if (H.winner == null) await showdown(H, attacker, bi, nonCombat, { side: opp(side), passes: o ? 0 : passes + 1 });
    if (H.winner == null) {
      if (nonCombat) {
        var mine = unitsAt(H, bi, attacker), foes = unitsAt(H, bi, opp(attacker));
        if (mine.length && foes.length) await combat(H, attacker, bi, mine, foes);
        else if (mine.length && H.bfs[bi].ctrl !== attacker) await conquer(H, attacker, bi, mine);
      } else await combatResolve(H, attacker, bi, H.combatReport || { played: [[], []] });
    }
    H.combatReport = null;
    await finishTurnAndNext(H);
    return evalState(H, side, true);
  }
  async function aiShowdownLookahead(G, side, attacker, bi, nonCombat, opts, passes, heur) {
    var idx = opts.map(function (_, i) { return i; });
    if (idx.length > 5) idx = (heur != null ? [heur] : []).concat(idx.filter(function (i) { return i !== heur; })).slice(0, 5);
    var cands = [null].concat(idx), vals = [];
    var saved = G.showdownAt, crn = aiLvl(G, side) >= 7, nS = crn ? 3 : SD_SAMPLES, base = (G.turnNo * 7919 + (G.lookSeed = (G.lookSeed || 0) + 1) * 15485863) | 0;
    for (var k = 0; k < cands.length; k++) {
      var v = 0, o = cands[k] == null ? null : opts[cands[k]];
      for (var sm = 0; sm < nS; sm++) v += await showdownRollout(G, side, attacker, bi, nonCombat, o, passes, crn ? (base + sm * 31337) | 0 : (G.turnNo * 7919 + k * 104729 + sm * 31337 + (G.lookSeed = (G.lookSeed || 0) + 1)) | 0);
      vals.push(v / nS);
    }
    G.showdownAt = saved;
    // keep the heuristic's choice unless another line is clearly better
    var hk = cands.indexOf(heur == null ? null : heur), best = hk, bv = vals[hk];
    for (var j = 0; j < cands.length; j++) if (vals[j] > bv + 0.25) { bv = vals[j]; best = j; }
    return cands[best];
  }
  async function aiPlayLoop(G, pi, wait) {
    for (var guard = 0; guard < 30 && G.winner == null; guard++) {
      var p = G.players[pi], best = null;
      if (aiLvl(G, pi) >= 3 && !G.isClone && G.showdownAt == null && G.active === pi) {
        var pick = await aiLookahead(G, pi);
        if (!pick || pick.kind === 'stop') return;
        var before3 = G.log.length, r3 = await applyCandidate(G, pi, pick);
        if ((r3 && r3.ok === false) || G.log.length === before3) return;
        await wait(); continue;
      }
      p.hand.concat(p.champion ? [p.champion] : [], p.hidden.map(function (h) { return h.card; })).forEach(function (card) {
        var ch = aiCardChoice(G, pi, card);
        if (ch && (!best || ch.value > best.value)) best = { value: ch.value, card: card, opts: ch.opts };
      });
      if (aiLvl(G, pi) >= 1) {
        var ab = aiAbilityChoices(G, pi).sort(function (a, b) { return b.value - a.value; })[0];
        if (ab && ab.value >= (best ? Math.max(1, best.value) : 0.5)) {
          var before = G.log.length; await ab.run(); await wait();
          if (G.log.length === before) return;   // nothing happened: stop rather than loop
          continue;
        }
      }
      // Legend abilities compete with cards for energy (e.g. Azir's Sand Soldier needs 1 energy after the Equipment).
      legendActs(G, pi).forEach(function (a, idx) {
        if (!canUseLegend(G, pi, idx).ok) return;
        var le = actEffects(G, pi, a);
        if (!le.length || le.some(function (e) { return e.op === 'assault' || e.op === 'tobase'; })) return;
        var ev = evalEffects(G, pi, le, { src: null, loc: null });
        if (ev.good && ev.value >= 1.5 && (!best || ev.value + 1 > best.value)) best = { value: ev.value + 1, legend: idx, targets: ev.targets };
      });
      if (best && best.legend != null) { await useLegend(G, pi, best.legend, best.targets); await wait(); continue; }
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
  function planAttack(G, pi, bi, avail, bonus, margin) {
    margin = margin || 0;
    var defs = unitsAt(G, bi, opp(pi));
    var need = defs.reduce(function (s, u) { return s + Math.max(1, might(u, 'def') - u.damage); }, 0);
    var dD = defs.reduce(function (s, u) { return s + (dealsDamage(u) ? might(u, 'def') : 0); }, 0);
    var best = null;
    subsets(avail, function (S) {
      var aD = S.reduce(function (s, u) { return s + might(u, 'att'); }, 0) + (bonus || 0);
      var tough = S.reduce(function (s, u) { return s + Math.max(1, might(u, 'att')); }, 0) + (bonus || 0);
      if (aD >= need && dD + margin < tough) {
        var cost = S.reduce(function (s, u) { return s + might(u, 'att'); }, 0) + S.length * 0.1;
        if (!best || cost < best.cost) best = { cost: cost, units: S };
      }
    });
    return best && best.units;
  }
  // Charm-style spells ("move an enemy unit"): pull one defender home if the attack then wins.
  function aiCharm(G, pi, bi, avail, margin) {
    var p = G.players[pi], defs = unitsAt(G, bi, opp(pi));
    var cards = p.hand.filter(function (x) { return x.c.type === 'Spell' && x.c.P.spell.length === 1 && x.c.P.spell[0].op === 'moveUnit' && x.c.P.spell[0].t.sel === 'enemy' && canPlay(G, pi, x.iid, false).ok; });
    if (!cards.length) return null;
    var cands = candidates(G, pi, cards[0].c.P.spell[0], {}).filter(function (u) { return u.loc === bi && !u.noMove; });
    for (var i = 0; i < cands.length; i++) {
      var d = cands[i]; d.loc = 'base';
      var S = defs.length > 1 ? planAttack(G, pi, bi, avail, 0, margin) : avail.length;
      d.loc = bi;
      if (S) return { card: cards[0], target: d.uid };
    }
    return null;
  }
  // Ways the AI can add attacking Might before moving: "+N Might this turn" spells, or an "Assault N" legend ability.
  function aiPumps(G, pi) {
    var p = G.players[pi], out = [];
    p.hand.forEach(function (card) {
      var c = card.c;
      if (c.type !== 'Spell' || !c.P.spell.length) return;
      var e = c.P.spell.filter(function (x) { return (x.op === 'might' && x.n > 0 || x.op === 'shroud') && (x.t.sel === 'any' || x.t.sel === 'friendly') && !x.t.where; })[0];
      if (e && canPlay(G, pi, card.iid, false).ok) out.push({ n: e.op === 'shroud' ? 1 : e.n, card: card });
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
      var A = aiOf(G, pi), oppEnergy = energyAvail(G.players[opp(pi)]);
      // 'safe' decks leave room for the opponent's tricks when they have energy up
      var margin = A.attack === 'safe' && oppEnergy > 0 ? 2 : A.attack === 'aggro' ? 0 : (oppEnergy > 1 ? 1 : 0);
      var S = planAttack(G, pi, bi, avail, 0, margin);
      if (!S && A.attack === 'aggro') {
        // aggro: take a trade that clears every defender even if nobody survives to conquer
        var needAll = enemies.reduce(function (s2, u) { return s2 + Math.max(1, might(u, 'def') - u.damage); }, 0);
        var allD = avail.reduce(function (s2, u) { return s2 + might(u, 'att'); }, 0);
        var lostV = avail.reduce(function (s2, u) { return s2 + unitValue(u); }, 0), killV = enemies.reduce(function (s2, u) { return s2 + unitValue(u); }, 0);
        if (allD >= needAll && killV >= lostV * 0.8) S = avail;
      }
      if (!S) {
        var ch = aiCharm(G, pi, bi, avail, margin);
        if (ch) {
          await playCard(G, pi, ch.card.iid, { targets: [ch.target] }); await wait();
          avail = avail.filter(function (u) { return !u.dead && u.loc === 'base' && !u.ex; });
          if (G.winner != null || !avail.length) continue;
          S = unitsAt(G, bi, opp(pi)).length ? planAttack(G, pi, bi, avail, 0, margin) : [avail.slice().sort(function (a, b) { return unitValue(a) - unitValue(b); })[0]];
        }
      }
      // Attack into a fight we lose on paper when tricks in hand (kept for the showdown) cover the gap.
      var tb = S ? 0 : trickBonus(G, pi);
      if (!S && tb > 0) S = planAttack(G, pi, bi, avail, tb, margin);
      if (!S) {
        var pump = aiPumps(G, pi).filter(function (q) { return !q.card || !trickN(q.card.c); })[0];
        if (pump) {
          S = planAttack(G, pi, bi, avail, pump.n);
          if (S) {
            var host = S.slice().sort(function (a, b) { return might(b) - might(a); })[0];
            if (pump.card) {
              var tq = pump.card.c.P.spell.filter(needsChoice).map(function (e) { return e.op === 'might' && e.n > 0 || e.op === 'shroud' ? host.uid : null; });
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
  // Level 6: attack search. Which units go where (and whether to attack at all) is the decision humans think hardest
  // about; the level-5 bot used a fixed rule. Candidate plans (the rule's own plan, no attack, and for each battlefield:
  // the cheapest winning group, a group with spare Might to play around tricks, everything, and an empty-battlefield grab
  // combined with the best attack elsewhere) are each played out on copies through the rest of the turn and the
  // opponent's reply (same guesses of hidden cards for every plan), and the best average result is used.
  var ENV = (typeof process !== 'undefined' && process.env) || {};
  var ATK_SAMPLES = +ENV.RT_ATK_SAMPLES || 6, ATK_HORIZON = ENV.RT_ATK_HORIZON != null ? +ENV.RT_ATK_HORIZON : 0, ATK_MARGIN = ENV.RT_ATK_MARGIN != null ? +ENV.RT_ATK_MARGIN : 0.5;
  function attackPlans(G, pi) {
    var avail = function (bi) { return unitsAt(G, 'base', pi).filter(function (u) { return !u.ex && !u.stun && canMove(G, u, bi); }); };
    var plans = [{ name: 'rule', rule: true }, { name: 'none', steps: [] }], seen = {};
    var add = function (name, steps) {
      steps = steps.filter(function (st) { return st.uids.length; });
      if (!steps.length) return;
      var key = steps.map(function (st) { return st.dest + ':' + st.uids.slice().sort().join(','); }).sort().join('|');
      if (seen[key]) return; seen[key] = 1; plans.push({ name: name, steps: steps });
    };
    var ids = function (us) { return us.map(function (u) { return u.uid; }); };
    var grab = [], fights = [];
    for (var bi = 0; bi < G.bfs.length; bi++) {
      if (G.bfs[bi].ctrl === pi) continue;
      var av = avail(bi); if (!av.length) continue;
      if (!unitsAt(G, bi, opp(pi)).length) {
        var weak = av.slice().sort(function (a, b) { return unitValue(a) - unitValue(b); })[0], strong = av.slice().sort(function (a, b) { return might(b, 'def') - might(a, 'def'); })[0];
        grab.push({ bi: bi, u: weak });
        add('grab-weak', [{ uids: [weak.uid], dest: bi }]); add('grab-strong', [{ uids: [strong.uid], dest: bi }]);
        continue;
      }
      var tight = planAttack(G, pi, bi, av, 0, 0), safe = planAttack(G, pi, bi, av, 0, 2) || planAttack(G, pi, bi, av, 0, 1);
      if (tight) { add('tight', [{ uids: ids(tight), dest: bi }]); fights.push({ bi: bi, units: tight }); }
      if (safe) add('safe', [{ uids: ids(safe), dest: bi }]);
      if (av.length > 1) add('all-in', [{ uids: ids(av), dest: bi }]);
    }
    // grab an empty battlefield with the weakest unit and fight elsewhere with the rest
    grab.forEach(function (g) {
      fights.forEach(function (f) {
        if (f.bi === g.bi) return;
        var rest = avail(f.bi).filter(function (u) { return u !== g.u; }), S = planAttack(G, pi, f.bi, rest, 0, 0);
        if (S) add('grab+fight', [{ uids: [g.u.uid], dest: g.bi }, { uids: ids(S), dest: f.bi }]);
      });
    });
    return plans.slice(0, 9);
  }
  async function applyAttackPlan(G, pi, plan, wait) {
    if (plan.rule) return aiAttack(G, pi, wait);
    for (var k = 0; k < plan.steps.length && G.winner == null; k++) {
      var st = plan.steps[k], uids = st.uids.filter(function (id) { return G.units.some(function (u) { return u.uid === id && u.ctrl === pi && u.loc === 'base' && !u.ex && !u.stun; }); });
      if (uids.length) { await moveUnits(G, pi, uids, st.dest); await wait(); }
    }
  }
  async function attackRollout(G, pi, plan, seed) {
    var H = cloneGame(G, seed), noop = function () { return Promise.resolve(); };
    determinize(H, pi);
    H.aiPreAttack = false;
    await applyAttackPlan(H, pi, plan, noop);
    if (H.winner == null) await finishTurnAndNext(H);
    for (var t = 0; t < ATK_HORIZON && H.winner == null; t++) { await aiTurn(H, H.active); if (H.winner == null) await endTurn(H); }
    return evalState(H, pi, true);
  }
  async function aiAttackSearch(G, pi, wait) {
    var plans = attackPlans(G, pi);
    if (plans.length <= 2 && !plans.some(function (p) { return p.steps && p.steps.length; })) return aiAttack(G, pi, wait);
    var base = (G.turnNo * 7919 + (G.lookSeed = (G.lookSeed || 0) + 1) * 104729) | 0, vals = [];
    for (var i = 0; i < plans.length; i++) {
      var v = 0;
      for (var sm = 0; sm < ATK_SAMPLES; sm++) v += await attackRollout(G, pi, plans[i], (base + sm * 31337) | 0);   // same guesses for every plan
      vals.push(v / ATK_SAMPLES);
    }
    var best = 0;   // the rule's plan unless another is clearly better
    for (var j = 1; j < plans.length; j++) if (vals[j] > vals[best] + ATK_MARGIN) best = j;
    G.lastAttackPlan = plans[best].name;
    return applyAttackPlan(G, pi, plans[best], wait);
  }
  async function aiLegend(G, pi, wait, late) {
    var acts = legendActs(G, pi);
    for (var i = 0; i < acts.length && G.winner == null; i++) {
      if (!canUseLegend(G, pi, i).ok) continue;
      var effs = actEffects(G, pi, acts[i]);
      if (effs.some(function (e) { return e.op === 'assault' || e.op === 'tobase'; })) continue; // used during attacks only
      var ev = evalEffects(G, pi, effs, { src: null, loc: null });
      var A = aiOf(G, pi), keep = A.reserve && G.players[pi].hand.some(function (x) { return x.c.P.counter || (x.c.type === 'Spell' && x.c.P.kw.reaction); }) ? A.reserve : 0;
      if (!effs.length && energyAvail(G.players[pi]) - (acts[i].energy || 0) < keep) continue;
      if ((!effs.length && late) || (effs.length && ev.good && ev.value >= 1.5)) { await useLegend(G, pi, i, ev.targets); await wait(); }
    }
  }
  /* ---------------- human vs bot decisions ---------------- */
  // While a human plays (G.recordHuman), every action they take is stored next to the action the bot (level 5) would
  // have taken in exactly the same position, plus every prompt answered (with the bot's default answer). Used to
  // measure how human-like the bot is and to tune it on real human play (quant/human_compare.js).
  var PROBE_STOP = { probe: true };
  function probeHit(G, desc) { G.probe.act = desc; throw PROBE_STOP; }
  function actDesc(G, kind, pi, a) {
    var p = G.players[pi], nm = function (uid) { var u = G.units.filter(function (x) { return x.uid === uid; })[0]; return u ? u.c.name : '?'; };
    var where = function (l) { return l == null || l === 'base' ? 'base' : bfName(G, l); };
    if (kind === 'play') { var f = findInHand(p, a[0]); return { k: 'play', card: f ? f.card.c.name : '?', loc: a[1] && a[1].loc != null ? where(a[1].loc) : null }; }
    if (kind === 'move') return { k: 'move', units: a[0].map(nm).sort(), dest: where(a[1]) };
    if (kind === 'gear') { var g = p.gear.filter(function (x) { return x.iid === a[0]; })[0]; if (!g) G.units.forEach(function (u) { u.equips.forEach(function (e) { if (e.iid === a[0]) g = e; }); }); return { k: 'gear', card: g ? g.c.name : '?', idx: a[1] || 0 }; }
    if (kind === 'equip') return { k: 'equip', card: a[0] && a[0].c ? a[0].c.name : '?' };
    if (kind === 'hide') { var h = p.hand.filter(function (x) { return x.iid === a[0]; })[0]; return { k: 'hide', card: h ? h.c.name : '?', loc: where(a[1]) }; }
    if (kind === 'unit') return { k: 'unit', card: nm(a[0]) };
    if (kind === 'flow') { var t = p.trash.filter(function (x) { return x.iid === a[0]; })[0]; return { k: 'flow', card: t ? t.c.name : '?' }; }
    if (kind === 'legend') return { k: 'legend', idx: a[0] };
    return { k: kind };
  }
  // What would the bot do next from this exact position? Plays the bot's turn on a copy and stops at its first action.
  async function botWouldDo(G, pi, level) {
    var H = cloneGame(G, (G.turnNo * 92821 + (G.decisions ? G.decisions.length : 0) * 68917) | 0);
    H.isClone = false; H.human = -1; H.aiLevel = [level || AI_LEVEL, level || AI_LEVEL]; H.probe = {};
    try { await aiTurn(H, pi); } catch (e) { if (e !== PROBE_STOP) return { k: 'error', msg: String(e && e.message || e) }; }
    return H.probe.act || { k: 'end' };
  }
  function decisionState(G, pi) {
    return { turn: G.turnNo, pts: [G.players[pi].points, G.players[opp(pi)].points],
      deck: G.players[pi].deckDef && G.players[pi].deckDef.id, vs: G.players[opp(pi)].deckDef && G.players[opp(pi)].deckDef.id,
      x: evalFeatures(G, pi).map(function (v) { return Math.round(v * 100) / 100; }) };
  }
  function recordDecision(G, pi, d, st) {
    if (!G.decisions) G.decisions = [];
    var s0 = st || decisionState(G, pi); for (var k in s0) d[k] = s0[k];
    G.decisions.push(d);
  }
  function sameAct(a, b) {
    if (!a || !b || a.k !== b.k) return false;
    if (a.k === 'move') return a.dest === b.dest && a.units.join('|') === b.units.join('|');
    if (a.k === 'play' || a.k === 'hide') return a.card === b.card && (a.loc || 'base') === (b.loc || 'base');
    if (a.k === 'legend') return a.idx === b.idx;
    if (a.k === 'end') return true;
    return a.card === b.card;
  }
  // Wrap the public action functions: when the human acts on their own turn, record their action and the bot's.
  function recorded(kind, fn) {
    return async function () {
      var args = Array.prototype.slice.call(arguments), G = args[0], pi = kind === 'end' ? G.active : args[1];
      if (G && G.recordHuman && !G.isClone && G.human === pi && G.active === pi && G.winner == null && G.showdownAt == null) {
        var human = kind === 'end' ? { k: 'end' } : actDesc(G, kind, pi, kind === 'equip' ? [args[2], args[3]] : args.slice(2));
        var bot = await botWouldDo(G, pi), st = decisionState(G, pi);
        var res = await fn.apply(null, args);
        if (!(res && res.ok === false)) recordDecision(G, pi, { k: 'action', human: human, bot: bot, same: sameAct(human, bot), loose: !!bot && human.k === bot.k && (human.card || '') === (bot.card || '') }, st);
        return res;
      }
      return fn.apply(null, args);
    };
  }
  function decisionSummary(G) {
    var ds = G.decisions || [], acts = ds.filter(function (d) { return d.k === 'action'; }), asks = ds.filter(function (d) { return d.k === 'ask' && d.bot !== undefined; });
    var eq = function (d) { return JSON.stringify(d.human) === JSON.stringify(d.bot); };
    return { actions: acts.length, sameAction: acts.filter(function (d) { return d.same; }).length, sameKindCard: acts.filter(function (d) { return d.loose; }).length,
      prompts: asks.length, samePrompt: asks.filter(eq).length };
  }

  async function aiTurn(G, pi, wait) {
    wait = wait || function () { return Promise.resolve(); };
    if (G.winner != null) return;
    G.aiPreAttack = true;
    await aiPlayLoop(G, pi, wait);
    G.aiPreAttack = false;
    if (G.winner == null) await aiLegend(G, pi, wait);
    if (G.winner == null) await aiLoneDefenders(G, pi, wait);
    if (G.winner == null) await (aiLvl(G, pi) >= 6 && !G.isClone ? aiAttackSearch(G, pi, wait) : aiAttack(G, pi, wait));
    if (G.winner == null) await aiPlayLoop(G, pi, wait);
    if (G.winner == null) await aiLegend(G, pi, wait, true);
    if (G.winner == null) await aiPosition(G, pi, wait);
    if (G.winner == null) await aiHide(G, pi, wait);
  }
  function moveDraws(u) { return (u.c.P.trig.move || []).concat(u.c.P.trig.moveBf || []).some(function (t) { return t.effs.some(function (e) { return e.op === 'draw'; }); }); }
  // Master Yi: a battlefield is defended by exactly one unit (it gets +2 Might alone); extras go back to base.
  async function aiLoneDefenders(G, pi, wait) {
    if (!aiOf(G, pi).holdLone) return;
    for (var bi = 0; bi < G.bfs.length; bi++) {
      var mine = unitsAt(G, bi, pi);
      if (mine.length < 2 || G.bfs[bi].ctrl !== pi) continue;
      var keep = mine.slice().sort(function (a, b) { return might(b, 'def') - might(a, 'def'); })[0];
      var extra = mine.filter(function (u) { return u !== keep && !u.ex; });
      if (extra.length) { await moveUnits(G, pi, extra.map(function (u) { return u.uid; }), 'base'); await wait(); }
    }
  }
  // After attacking: shuttle draw-on-move units and reinforce held battlefields the opponent can attack.
  async function aiPosition(G, pi, wait) {
    var A = aiOf(G, pi);
    if (A.moveDraw) {
      for (var bi = 0; bi < G.bfs.length; bi++) {
        var here = unitsAt(G, bi, pi), mv = here.filter(function (u) { return !u.ex && !u.stun && moveDraws(u); });
        if (mv.length && here.length > mv.length && G.bfs[bi].ctrl === pi) { await moveUnits(G, pi, [mv[0].uid], 'base'); await wait(); }
      }
    }
    if (!A.reinforce || A.holdLone) return;
    var enemyThreat = unitsAt(G, 'base', opp(pi)).reduce(function (s2, u) { return s2 + might(u, 'att'); }, 0);
    for (var b2 = 0; b2 < G.bfs.length && G.winner == null; b2++) {
      if (G.bfs[b2].ctrl !== pi) continue;
      var def = unitsAt(G, b2, pi).reduce(function (s2, u) { return s2 + might(u, 'def'); }, 0);
      var spare = unitsAt(G, 'base', pi).filter(function (u) { return !u.ex && !u.stun; }).sort(function (a, b) { return moveDraws(b) - moveDraws(a) || might(b, 'def') - might(a, 'def'); });
      var send = [];
      while (spare.length && def <= enemyThreat) { var u = spare.shift(); send.push(u); def += might(u, 'def'); }
      if (send.length) { await moveUnits(G, pi, send.map(function (x) { return x.uid; }), b2); await wait(); }
    }
  }
  // Hide one reactive card per turn when there are runes to spare.
  async function aiHide(G, pi, wait) {
    var p = G.players[pi], eager = aiOf(G, pi).hideEager;
    for (var n = 0; n < (eager ? 2 : 1); n++) {
      if (p.runes.length < (eager ? 3 : 5)) return;
      var cands = p.hand.filter(function (x) { return hideSpots(G, pi, x.iid).length; })
        .sort(function (a, b) { return (b.c.type === 'Spell') - (a.c.type === 'Spell') || (b.c.energy || 0) - (a.c.energy || 0); });
      if (!cands.length) return;
      hideCard(G, pi, cands[0].iid, hideSpots(G, pi, cands[0].iid)[0]);
      await wait();
    }
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
    var names = function (arr) {   // "Karthus ×2" when a unit and its Reflection both appear
      var u = [], k = {}; arr.forEach(function (n) { if (!k[n]) { k[n] = 0; u.push(n); } k[n]++; });
      u = u.map(function (n) { return n + (k[n] > 1 ? ' ×' + k[n] : ''); });
      return u.slice(0, 2).join(' and ') + (u.length > 2 ? ' +' + (u.length - 2) : '');
    };
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
    plan: function (id) { return PLANS[id] || null; }, loadGuides: loadGuides,
    validateDeck: validateDeck, makeDeck: makeDeck, parseDeckText: parseDeckText, deckToText: deckToText, specOf: specOf,
    championsFor: championsFor, deckPool: deckPool, battlefieldPool: battlefieldPool, legalFor: legalFor, cardSimulated: cardSimulated,
    findCard: function (n) { return findCard(n).c; }, DOMAIN_LIST: DOMAIN_LIST,
    // H5 ablation: the same card with its rules text removed (same cost, type, domains, Might, tags), no scripts.
    blankCard: function (c) {
      var b = Object.assign({}, c, { name: c.name + ' (blank)', rich: '', plain: '', mightBonus: c.mightBonus });
      b.P = parseCard(b);
      return b;
    },
    real: function (id) { return REAL[id] || null; }, REAL_DATE: REAL_DATE, REAL_MATCHES: REAL_MATCHES,
    reviewGame: reviewGame,
    levelCards: levelCards,
    gameTips: gameTips,
    WIN: WIN, DOMAIN_COLORS: DOMAIN_COLORS, DECKS: DECKS, FIXES: FIXES, norm: norm,
    loadCards: loadCards, cards: function () { return CARDS; }, parseCard: parseCard, richToLines: richToLines,
    evalFeatures: evalFeatures, EVAL_FEATURES: EVAL_FEATURES, killUnitForTest: killUnit, drawForTest: drawOne, leblancForTest: leblancTrigger, lookaheadForTest: aiLookahead, cloneForTest: cloneGame,
    botWouldDo: botWouldDo, decisionSummary: decisionSummary, sameAct: sameAct,
    newGame: newGame, endTurn: recorded('end', endTurn), playCard: recorded('play', playCard), canPlay: canPlay, targetSlots: targetSlots, ambushSpots: ambushSpots,
    empoweredList: function (G, pi) {
      var out = [], L = G.players[pi].legend;
      if (L.empowered) out.push(L.c.name);
      G.units.forEach(function (u) { if (u.ctrl === pi && u.empowered) out.push(u.c.name); });
      return out;
    },
    canUseGear: canUseGear, useGear: recorded('gear', useGear), seraphineReady: seraphineReady, deploySpots: deploySpots,  roostSpots: roostSpots, energyAvail: energyAvail, hideSpots: hideSpots, hideCard: recorded('hide', hideCard), canEquip: canEquip, equipGear: recorded('equip', equipGear), equipCostText: equipCostText, canUseUnit: canUseUnit, useUnit: recorded('unit', useUnit), canFlow: canFlow, playFlow: recorded('flow', playFlow), legendActs: legendActs, canUseLegend: canUseLegend, useLegend: recorded('legend', useLegend), canMove: canMove, moveUnits: recorded('move', moveUnits), unitsAt: unitsAt, might: might, kwOf: kwOf,
    equipBonus: equipBonus, describeEffect: describeEffect, cardCost: cardCost, aiTurn: aiTurn, deckCoverage: deckCoverage, cardDomains: cardDomains
  };
})();
if (typeof module !== 'undefined') {
  module.exports = RT;
  // Node (tests, harness): load the researched deck guides next to this file, if present.
  try { if (!process.env.RT_NO_GUIDES) RT.loadGuides(require('./guides.json')); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
}
