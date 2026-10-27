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
    ('386b181', 'Deck plans from guides'),
    ('f3d4c98', 'Irelia/Akali combat tricks'),
    ('1bf87b3', 'Pro decision trees'),
    ('0c7933c', 'Core Rules audit fixes'),
    ('8c7f23f', "Rek'Sai reserve energy"),
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
<nav><a href="play.html">Play</a><a href="report.html">Research report</a><a href="https://github.com/napi2002/sorrybot">Source</a></nav></div></header>
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
<div class="stat"><b>1,115</b><span>cards, effects parsed from their rules text</span></div>
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
rows_versions = ''.join(f'<tr><td><code>{c}</code></td><td>{esc(l)}</td><td>{r["spearman"]["all"]["rho"]:.2f} (p = {r["spearman"]["all"]["perm_p"]:.3f})</td><td>{r["spearman"]["n>1000"]["rho"]:.2f} (p = {r["spearman"]["n>1000"]["perm_p"]:.3f})</td><td>{r["first_player_wr"] * 100:.1f}%</td></tr>' for c, l, r in runs)
deck_cards = ''.join(f'<div class="deck{" hold" if d["reserve"] >= 2 else ""}"><b>{esc(d["name"])}</b><div class="meta">{esc(d["arch"])} · attacks: {esc(d["attack"])} · keeps {d["reserve"]} energy · research confidence: {esc(d["conf"] or "n/a")}</div><p>{esc(d["summary"])}</p></div>' for d in decks)
by_id = {d['id']: d for d in latest['per_deck']}
report = page('Pricing a card-game metagame with Monte Carlo simulation', 'Research report: validating a Riftbound game simulator against 45,836 tournament matches.', f'''
<section style="padding-top:36px">
<h1 style="font-size:clamp(26px,4.5vw,40px)">Pricing a card-game metagame with Monte Carlo simulation</h1>
<p class="lead" style="color:var(--muted);font-size:19px">Can a game engine with an AI player rank competitive decks the way real tournaments do, and can it forecast where the metagame moves next?</p>
<div class="note"><b>Status:</b> engine, AI, data pipeline and harness are built; results below are <b>in-sample</b> (the AI was tuned while measuring). The pre-registered confirmatory tests run on tournament data collected after the engine is frozen.</div>
</section>

<h2>1. Summary</h2>
<p>Rift Table simulates full games of Riftbound with a heuristic AI that follows researched pro game plans for 15 tournament decks. Playing every pair of decks 2,000 times (1,000 seed pairs with seats swapped) gives each deck a win rate against the field with a 95% interval of about ±0.6 points. Against {REAL_MATCHES:,} real matches from riftbound.gg, the simulator's deck ranking has Spearman ρ = {lt["all"]["rho"]:.2f} (p = {lt["all"]["perm_p"]:.3f}) across all decks.</p>
<p>The main finding so far is a <b>piloting gap</b>: simulated win rates spread from {min(d["wr"] for d in latest["per_deck"]) * 100:.0f}% to {max(d["wr"] for d in latest["per_deck"]) * 100:.0f}%, real ones only from {min(d["real_wr"] for d in latest["per_deck"]) * 100:.0f}% to {max(d["real_wr"] for d in latest["per_deck"]) * 100:.0f}%. Part of each simulated win rate measures how well the AI can pilot a deck, not only how strong the deck is: simple proactive plans are overrated, decks that depend on combat timing or slow engines are underrated.</p>

<h2>2. System</h2>
<div class="tablewrap"><table><tr><th>Component</th><th>What it is</th></tr>
<tr><td>Rules engine</td><td>Riftbound rules in JavaScript; 1,115 cards whose rules text is parsed into effect operations, with hand-written scripts for complex cards and legends. Audited against the official Core Rules (2026-10-09); <code>test/rules.js</code> covers the fixes.</td></tr>
<tr><td>AI policy</td><td>Heuristic player: card values, attack planning by Might, showdown tricks only when they flip a fight, reactions held for the opponent's turn, and a per-deck plan (priorities, mulligan, attack style, reserve energy) from researched guides.</td></tr>
<tr><td>Harness</td><td><code>quant/harness.js</code>: seeded mulberry32 RNG, mirrored seats, parallel workers; byte-identical results for the same seed; ~1,450 games/s on 4 cores.</td></tr>
<tr><td>Real data</td><td><code>quant/snapshot.py</code> archives the riftbound.gg meta snapshot (30-day window, {REAL_MATCHES:,} matches) unchanged with a SHA-256 manifest; <code>quant/tidy.py</code> builds deck, matchup and card tables.</td></tr>
</table></div>

<h2>3. Results so far (in-sample)</h2>
<div class="chart">{dumbbell(latest["per_deck"])}<div class="cap">Engine {latest["commit"]}, {latest["games"]:,} games; first player wins {latest["first_player_wr"] * 100:.1f}%. Real win rates: riftbound.gg snapshot {latest.get("real_date", "2026-10-27")}.</div></div>
<div class="chart">{progress(runs)}<div class="cap">Each point is a 210,000-game run. Fixing one deck often moves others: the Irelia/Akali change improved those two decks but lowered the established-deck correlation, which is why tuning has to stop before the holdout opens.</div></div>
<div class="tablewrap"><table><tr><th>Engine</th><th>Change</th><th>ρ all 15</th><th>ρ established</th><th>First player</th></tr>{rows_versions}</table></div>

<h2>4. How each deck plays</h2>
<p>Each deck's plan was researched from tournament reports, deck techs and guides and stored as a per-turn decision tree (shown in the game's Guide). The AI uses the plan's card priorities, mulligan, reactions to hold and attack style. Highlighted decks keep 2 energy open for reactions on the opponent's turn.</p>
<div class="decks">{deck_cards}</div>

<h2>5. Hypotheses</h2>
<p>Family-wise error is held at 5% with a Holm correction across the five primary tests. Thresholds are fixed in <code>quant/PREREGISTRATION.md</code> before the holdout opens.</p>
<div class="tablewrap"><table><tr><th>ID</th><th>Hypothesis</th><th>Test</th><th>Pass criterion</th></tr>
<tr><td>H1</td><td>A frozen simulator ranks deck strength like real win rates on unseen data</td><td>Spearman ρ, permutation p, bootstrap 95% CI</td><td>ρ ≥ 0.5 on established decks, CI lower bound &gt; 0</td></tr>
<tr><td>H2</td><td>Simulated matchups predict real head-to-head results better than one strength per deck</td><td>Match-weighted log-loss and Brier vs Bradley–Terry; paired bootstrap</td><td>Log-loss improvement with 95% CI above 0</td></tr>
<tr><td>H3</td><td>Decks that beat the current field gain play share next week (replicator dynamics)</td><td>Panel regression with deck fixed effects; walk-forward vs random walk</td><td>β &gt; 0 (p &lt; 0.05) and lower out-of-sample MAE</td></tr>
<tr><td>H4</td><td>The metagame is exploitable, and less so as a set ages</td><td>Nash equilibrium by linear programming; Mann–Kendall trend</td><td>Negative slope, p &lt; 0.05</td></tr>
<tr><td>H5</td><td>Card value from simulator ablation agrees with what pros play</td><td>Swap each card for a vanilla card; ≥ 2,000 games; correlate with inclusion</td><td>ρ &gt; 0, CI lower bound &gt; 0</td></tr></table></div>
<p>Field fitness for H3 and exploitability for H4:</p>
<p class="formula">f<sub>i</sub>(t) = Σ<sub>j</sub> s<sub>j</sub>(t) M<sub>ij</sub> &nbsp;&nbsp; Δs<sub>i</sub>(t+1) = α<sub>i</sub> + β (f<sub>i</sub>(t) − f̄(t)) + ε<sub>i,t</sub></p>
<p class="formula">expl(s) = max<sub>i</sub> (M s)<sub>i</sub> − sᵀ M s</p>

<h2>6. Data and leakage controls</h2>
<ul>
<li><b>Time-based holdout:</b> only matches with a window start after the engine-freeze tag are scored.</li>
<li><b>Point-in-time features:</b> each weekly feature uses only snapshots fetched on or before that week; raw responses are never overwritten.</li>
<li><b>Overlapping windows:</b> snapshots cover rolling 30-day windows, so tests use non-overlapping snapshots or block bootstrap.</li>
<li><b>Survivorship:</b> decks that leave the snapshot stay in the panel with share 0.</li>
<li><b>Reproducibility:</b> every simulated game is stored with the engine commit and its seed.</li>
</ul>

<h2>7. Method</h2>
<ul>
<li><b>Sample size from power:</b> ±3 points per pairing at 95% needs ~1,100 games; the harness plays 2,000 per pairing in about 2.5 minutes.</li>
<li><b>Variance reduction:</b> mirrored seed pairs (antithetic samples) cancel the first-player edge; common random numbers across engine versions.</li>
<li><b>Baselines:</b> coin flip, Bradley–Terry, the simulator, and a hierarchical blend that pools real head-to-head data toward the simulator.</li>
<li><b>Robustness:</b> H1 re-run with three AI strengths to measure how much the ranking depends on play quality.</li>
</ul>

<h2>8. Roadmap</h2>
<ul class="tl">
<li><b>0 · Freeze and pre-register</b> <small>— week 1</small><br>Tag the engine; start weekly snapshots.</li>
<li class="gate"><b>Gate: holdout opens</b><br><small>Only matches after the freeze date are scored.</small></li>
<li><b>1–2 · Data pipeline and simulator validation (H1, H2)</b> <small>— weeks 1–6</small></li>
<li><b>3 · Meta dynamics and card attribution (H3–H5)</b> <small>— weeks 6–12</small></li>
<li><b>4 · Write-up and release</b> <small>— weeks 12–14</small></li>
</ul>

<h2>9. Risks and limitations</h2>
<div class="tablewrap"><table><tr><th>Risk</th><th>Mitigation</th></tr>
<tr><td>AI skill differs by deck (the piloting gap)</td><td>Report per archetype, run three AI strengths, treat the gap as measured model error.</td></tr>
<tr><td>Overfitting the engine to real data</td><td>Frozen commit before the holdout; thresholds written first; tuning history in git.</td></tr>
<tr><td>Only 15 decks</td><td>Bootstrap CIs; lean on H2, which scores thousands of matches.</td></tr>
<tr><td>Thin matchup data in the free snapshot (~2 per deck)</td><td>H2/H4 reported as insufficient data if fewer than 20 holdout cells have ≥ 30 games.</td></tr>
<tr><td>Real win rates mix deck strength and pilot skill</td><td>Separate all-events and top-cut data; control for event type.</td></tr>
<tr><td>Unofficial data source</td><td>Raw responses archived with hashes; analysis runs from the archive.</td></tr>
</table></div>
<p>This project does not claim to predict single games or causal effects; H3 is a predictive association.</p>
''')

docs.mkdir(exist_ok=True)
(docs / 'index.html').write_text(index)
(docs / 'report.html').write_text(report)
shutil.copyfile(root / 'riftable.html', docs / 'play.html')
(docs / '.nojekyll').write_text('')
print('docs/: index.html, report.html, play.html,', len(list((docs / 'img').glob('*.webp'))), 'screenshots')
