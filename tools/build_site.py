"""Build the public site in docs/ (GitHub Pages): landing page, research report and the playable game.
Usage: python3 tools/build_site.py   (run tools/build.py first so riftable.html is current)"""
import html, json, pathlib, shutil, subprocess

root = pathlib.Path(__file__).resolve().parent.parent
docs = root / 'docs'
sim = root / 'quant' / 'data' / 'sim'
esc = html.escape

# ---------- data ----------
decks = json.loads(subprocess.check_output(['node', '-e', """
const RT=require('./src/engine.js');
console.log(JSON.stringify(RT.DECKS.map(d=>{const p=RT.plan(d.id),g=p.guide||{};
  return {id:d.id,name:d.name,arch:g.archetype||p.style,attack:p.ai.attack,reserve:p.ai.reserve||0,conf:(g.confidence||'').split(/[ :;,-]/)[0],summary:g.summary||p.plan,sources:(g.sources||[]).length};})));
"""], cwd=root))
VERSIONS = [  # engine versions measured with quant/harness.js (1,000 mirrored seed pairs per matchup = 210,000 games)
    ('c5a7d1c', 'Deck plans from guides'),
    ('a297624', 'Irelia/Akali combat tricks'),
    ('81531d1', 'Pro decision trees'),
    ('27263a9', 'Core Rules audit fixes'),
    ('dc5a605', "Rek'Sai reserve energy"),
]
runs = [(c, label, json.loads((sim / f'{c}_1000_summary.json').read_text())) for c, label in VERSIONS]
latest = runs[-1][2]
names = {d['id']: d['name'] for d in decks}
meta = json.loads((root / 'quant' / 'data' / 'tidy' / 'snapshot_meta.json').read_text()) if (root / 'quant' / 'data' / 'tidy' / 'snapshot_meta.json').exists() else None
REAL_MATCHES = 45836

def pct(x): return f'{x * 100:.0f}%'

# ---------- charts (inline SVG, colours from the page's CSS variables) ----------
def dumbbell(per_deck):
    rows = sorted(per_deck, key=lambda d: -(d['wr'] - d['real_wr']))
    W, top, step, x0, x1 = 760, 70, 26, 130, 690
    H = top + step * len(rows) + 40
    X = lambda v: x0 + (v * 100 - 20) / 70 * (x1 - x0)
    out = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Simulated vs real win rate per deck">',
           '<text x="16" y="24" style="fill:var(--ink);font-weight:700;font-size:16px">Simulated vs real win rate against the 15-deck field</text>',
           '<circle cx="22" cy="44" r="5" style="fill:var(--muted)"/><text x="32" y="48" style="fill:var(--ink);font-size:13px">Real tournaments</text>',
           '<circle cx="172" cy="44" r="5" style="fill:var(--accent)"/><text x="182" y="48" style="fill:var(--ink);font-size:13px">Simulated, AI vs AI</text>',
           f'<text x="{W - 16}" y="48" text-anchor="end" style="fill:var(--muted);font-size:12px">sim − real</text>']
    for t in range(20, 100, 10):
        out.append(f'<line x1="{X(t / 100):.1f}" x2="{X(t / 100):.1f}" y1="{top - 12}" y2="{H - 34}" style="stroke:var(--line)" {"stroke-dasharray=\"4 3\"" if t == 50 else ""}/>')
        out.append(f'<text x="{X(t / 100):.1f}" y="{H - 16}" text-anchor="middle" style="fill:var(--muted);font-size:12px">{t}%</text>')
    for i, r in enumerate(rows):
        y = top + i * step
        a, b = sorted([r['real_wr'], r['wr']])
        gap = round((r['wr'] - r['real_wr']) * 100)
        out += [f'<text x="16" y="{y + 4}" style="fill:var(--ink);font-size:14px">{esc(names.get(r["id"], r["id"]))}</text>',
                f'<line x1="{X(a):.1f}" x2="{X(b):.1f}" y1="{y}" y2="{y}" style="stroke:var(--muted);stroke-width:2"/>',
                f'<circle cx="{X(r["real_wr"]):.1f}" cy="{y}" r="5" style="fill:var(--muted)"><title>real {pct(r["real_wr"])} over {r["real_n"]:,} matches</title></circle>',
                f'<circle cx="{X(r["wr"]):.1f}" cy="{y}" r="5" style="fill:var(--accent)"><title>simulated {r["wr"] * 100:.1f}% [{r["ci"][0] * 100:.1f}, {r["ci"][1] * 100:.1f}]</title></circle>',
                f'<text x="{W - 16}" y="{y + 4}" text-anchor="end" style="fill:{"var(--accent)" if gap > 0 else "var(--muted)"};font-size:13px;font-weight:700">{gap:+d}</text>']
    out.append('</svg>')
    return ''.join(out)

def progress(runs):
    W, H, x0, x1, y0, y1 = 760, 300, 110, 670, 250, 60
    X = lambda i: x0 + i * (x1 - x0) / (len(runs) - 1)
    Y = lambda v: y0 - (v - 0.3) / 0.4 * (y0 - y1)
    out = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Rank correlation with real win rates per engine version">',
           '<text x="16" y="24" style="fill:var(--ink);font-weight:700;font-size:16px">Rank correlation with real win rates, by engine version (in-sample)</text>',
           '<circle cx="22" cy="44" r="5" style="fill:var(--accent)"/><text x="32" y="48" style="fill:var(--ink);font-size:13px">All 15 decks</text>',
           '<circle cx="132" cy="44" r="5" style="fill:var(--me)"/><text x="142" y="48" style="fill:var(--ink);font-size:13px">10 established decks (&gt;1,000 real games)</text>']
    for v in (0.3, 0.4, 0.5, 0.6, 0.7):
        out.append(f'<line x1="{x0}" x2="{x1}" y1="{Y(v):.1f}" y2="{Y(v):.1f}" style="stroke:var(--line)"/><text x="{x0 - 8}" y="{Y(v) + 4:.1f}" text-anchor="end" style="fill:var(--muted);font-size:12px">{v:.1f}</text>')
    for key, col in (('all', 'var(--accent)'), ('n>1000', 'var(--me)')):
        pts = [(X(i), Y(r[2]['spearman'][key]['rho'])) for i, r in enumerate(runs)]
        out.append('<polyline fill="none" style="stroke:%s;stroke-width:2.5" points="%s"/>' % (col, ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)))
        for (x, y), r in zip(pts, runs):
            s = r[2]['spearman'][key]
            out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" style="fill:{col}"><title>ρ = {s["rho"]:.2f}, permutation p = {s["perm_p"]:.3f}</title></circle>'
                       f'<text x="{x:.1f}" y="{y - 9:.1f}" text-anchor="middle" style="fill:var(--ink);font-size:12px">{s["rho"]:.2f}</text>')
    for i, (c, label, _) in enumerate(runs):
        out.append(f'<text x="{X(i):.1f}" y="{H - 28}" text-anchor="middle" style="fill:var(--ink);font-size:12px">{esc(label)}</text>'
                   f'<text x="{X(i):.1f}" y="{H - 12}" text-anchor="middle" style="fill:var(--muted);font-size:11px">{c}</text>')
    out.append('</svg>')
    return ''.join(out)

# ---------- shared page frame ----------
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;500;600;700&family=Cinzel:wght@700;800;900&display=swap" rel="stylesheet">'
DISCLAIMER = ("Rift Table isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. "
              "Riot Games, Riftbound, League of Legends and all associated properties are trademarks or registered trademarks of Riot Games, Inc. Card images © Riot Games. "
              "Card data: Riftcodex and riftbound.gg; tournament statistics: riftbound.gg (dotgg).")
def page(title, desc, body):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(desc)}">{FONTS}<link rel="stylesheet" href="site.css"></head>
<body><header class="top"><div class="in"><a class="brand" href="index.html"><span>R</span>ift Table</a>
<nav><a href="play.html">Play</a><a href="report.html">Research report</a><a href="https://github.com/napi2002/riftbound-sim-naps">Source</a></nav></div></header>
<main>{body}</main><footer>{esc(DISCLAIMER)}</footer></body></html>
'''

# ---------- landing page ----------
lt = latest['spearman']
index = page('Rift Table — Riftbound simulator and AI', 'A mobile Riftbound card game against an AI, and a Monte Carlo study of the competitive metagame.', f'''
<section class="hero"><div>
<h1>Rift Table</h1>
<p class="lead">Play Riftbound, the League of Legends trading card game, against an AI on your phone, and see what 210,000 simulated games say about the real tournament metagame.</p>
<div class="btns"><a class="btn primary" href="play.html">Play in your browser</a><a class="btn" href="report.html">Read the research report</a></div>
</div><img class="phone" src="img/board.webp" alt="Rift Table game board on a phone"></section>

<div class="stats">
<div class="stat"><b>1,099</b><span>cards, every set, effects parsed from their rules text</span></div>
<div class="stat"><b>15</b><span>tournament decks with researched pro game plans</span></div>
<div class="stat"><b>{REAL_MATCHES:,}</b><span>real tournament matches to validate against</span></div>
<div class="stat"><b>~1,450/s</b><span>simulated games on 4 cores, seeded and reproducible</span></div>
</div>

<h2>The game</h2>
<p>A single self-contained HTML file built for phones: no install, works offline after the first load. Every card effect resolves automatically, optional effects ask first, and the post-game review is built from what actually happened in your game.</p>
<div class="gallery">
<figure><img src="img/menu.webp" alt="Deck selection with real tournament win rates"><figcaption>15 decks with real tournament stats</figcaption></figure>
<figure><img src="img/mull.webp" alt="Mulligan showing the cards"><figcaption>Card choices show the cards</figcaption></figure>
<figure><img src="img/drag.webp" alt="Dragging a unit onto a battlefield"><figcaption>Drag units onto battlefields</figcaption></figure>
<figure><img src="img/guide.webp" alt="In-game guide with the matchup"><figcaption>Guide for the current matchup</figcaption></figure>
<figure><img src="img/tree.webp" alt="Decision tree for a deck"><figcaption>How pros play: decision trees</figcaption></figure>
</div>
<div class="cards">
<div class="card"><h3>Full rules</h3><p>Showdowns, Hidden, Ambush, Equip, Deploy, Legion, Level, Empower, burn-out and the final-point rule, checked against the October 2026 Core Rules with regression tests.</p></div>
<div class="card"><h3>An AI with a plan</h3><p>Each deck's AI follows a researched pro plan: mulligan, card priorities, attack style, which reactions to hold for your turn and when a trick actually flips a fight.</p></div>
<div class="card"><h3>Build or import decks</h3><p>Use the 15 suggested tournament decks or build your own from the full card pool, with a live Core Rules legality check, or paste a text decklist to import it.</p></div>
<div class="card"><h3>Learn as you play</h3><p>Combat reports, a clear points tracker, keyword badges, the matchup note for your opponent and a short review of the moments that decided the game.</p></div>
</div>

<h2>The research</h2>
<p>The project treats the metagame like a market: decks are assets, matchups are a payoff matrix and the simulator is a pricing model that has to be validated out of sample. Five pre-registered hypotheses test whether the simulator ranks decks like real tournaments, whether its matchups beat a Bradley–Terry baseline, and whether the metagame follows replicator dynamics.</p>
<div class="note">Latest in-sample result: Spearman ρ = <b>{lt["all"]["rho"]:.2f}</b> across all 15 decks (permutation p = {lt["all"]["perm_p"]:.3f}) and <b>{lt["n>1000"]["rho"]:.2f}</b> on the 10 established decks. The confirmatory test runs on matches played after the engine is frozen.</div>
<p><a class="btn" href="report.html">Read the report</a></p>

<h2>Run it yourself</h2>
<pre>python3 tools/build.py                               # assemble riftable.html
node test/sim.js 30 &amp;&amp; node test/rules.js            # smoke games and rules checks
node quant/harness.js --pairs-per-matchup 1000       # 210,000 seeded, mirrored games
python3 quant/snapshot.py                            # archive today's meta snapshot</pre>
''')

# ---------- report ----------
import sys; sys.path.insert(0, str(root / 'tools'))
from thesis import body as thesis_body
BENCH = {'random': '99%', 'rush': '77%', 'self': '50%'}   # node test/bench.js (150 games each)
report = page('Pricing a card-game metagame with Monte Carlo simulation', 'Research report: validating a Riftbound game simulator against 45,836 tournament matches.',
              thesis_body(decks, runs, latest, dumbbell(latest['per_deck']), progress(runs), BENCH, REAL_MATCHES))

docs.mkdir(exist_ok=True)
(docs / 'index.html').write_text(index)
(docs / 'report.html').write_text(report)
shutil.copyfile(root / 'riftable.html', docs / 'play.html')
(docs / '.nojekyll').write_text('')
print('docs/: index.html, report.html, play.html,', len(list((docs / 'img').glob('*.webp'))), 'screenshots')
