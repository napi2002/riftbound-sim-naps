"""Research report written as a thesis, rendered into docs/report.html by tools/build_site.py.
Every number is computed from the committed simulation summaries in quant/data/sim/."""
import html, math, random

esc = html.escape

# ---------- references (cited as [n]) ----------
REFS = [
    ('riot', 'Riot Games (2026). <i>Riftbound Core Rules</i>, last updated 9 October 2026, effective 16 October 2026. Riftbound Rules Hub, playriftbound.com.'),
    ('dotgg', 'riftbound.gg / dotgg (2026). <i>Riftbound meta snapshot</i> (30-day rolling window, standard format), retrieved 27 October 2026 via api.dotgg.gg.'),
    ('riftcodex', 'Riftcodex (2026). <i>Riftbound card database API</i>, api.riftcodex.com, retrieved October 2026.'),
    ('metropolis', 'Metropolis, N., &amp; Ulam, S. (1949). The Monte Carlo method. <i>Journal of the American Statistical Association</i>, 44(247), 335–341.'),
    ('browne', 'Browne, C. B., Powley, E., Whitehouse, D., Lucas, S. M., Cowling, P. I., Rohlfshagen, P., Tavener, S., Perez, D., Samothrakis, S., &amp; Colton, S. (2012). A survey of Monte Carlo tree search methods. <i>IEEE Transactions on Computational Intelligence and AI in Games</i>, 4(1), 1–43.'),
    ('ward', 'Ward, C. D., &amp; Cowling, P. I. (2009). Monte Carlo search applied to card selection in Magic: The Gathering. <i>Proceedings of the IEEE Symposium on Computational Intelligence and Games (CIG)</i>, 9–16.'),
    ('ismcts', 'Cowling, P. I., Powley, E. J., &amp; Whitehouse, D. (2012). Information set Monte Carlo tree search. <i>IEEE Transactions on Computational Intelligence and AI in Games</i>, 4(2), 120–143.'),
    ('santos', 'Santos, A., Santos, P. A., &amp; Melo, F. S. (2017). Monte Carlo tree search experiments in Hearthstone. <i>Proceedings of the IEEE Conference on Computational Intelligence and Games (CIG)</i>, 272–279.'),
    ('hoover', 'Hoover, A. K., Togelius, J., Lee, S., &amp; de Mesentier Silva, F. (2020). The many AI challenges of Hearthstone. <i>KI – Künstliche Intelligenz</i>, 34(1), 33–43.'),
    ('fontaine', 'Fontaine, M. C., Lee, S., Soros, L. B., de Mesentier Silva, F., Togelius, J., &amp; Hoover, A. K. (2019). Mapping Hearthstone deck spaces through MAP-Elites with sliding boundaries. <i>Proceedings of the Genetic and Evolutionary Computation Conference (GECCO)</i>, 161–169.'),
    ('silva', 'de Mesentier Silva, F., Canaan, R., Lee, S., Fontaine, M. C., Togelius, J., &amp; Hoover, A. K. (2019). Evolving the Hearthstone meta. <i>Proceedings of the IEEE Conference on Games (CoG)</i>, 1–8.'),
    ('neumann', 'von Neumann, J. (1928). Zur Theorie der Gesellschaftsspiele. <i>Mathematische Annalen</i>, 100, 295–320.'),
    ('dantzig', 'Dantzig, G. B. (1951). A proof of the equivalence of the programming problem and the game problem. In T. C. Koopmans (Ed.), <i>Activity Analysis of Production and Allocation</i> (pp. 330–335). Wiley.'),
    ('taylor', 'Taylor, P. D., &amp; Jonker, L. B. (1978). Evolutionary stable strategies and game dynamics. <i>Mathematical Biosciences</i>, 40(1–2), 145–156.'),
    ('hofbauer', 'Hofbauer, J., &amp; Sigmund, K. (1998). <i>Evolutionary Games and Population Dynamics</i>. Cambridge University Press.'),
    ('balduzzi', 'Balduzzi, D., Tuyls, K., Pérolat, J., &amp; Graepel, T. (2018). Re-evaluating evaluation. <i>Advances in Neural Information Processing Systems (NeurIPS)</i>, 31.'),
    ('bt', 'Bradley, R. A., &amp; Terry, M. E. (1952). Rank analysis of incomplete block designs: I. The method of paired comparisons. <i>Biometrika</i>, 39(3/4), 324–345.'),
    ('elo', 'Elo, A. E. (1978). <i>The Rating of Chessplayers, Past and Present</i>. Arco.'),
    ('trueskill', 'Herbrich, R., Minka, T., &amp; Graepel, T. (2007). TrueSkill™: A Bayesian skill rating system. <i>Advances in Neural Information Processing Systems (NIPS)</i>, 19, 569–576.'),
    ('spearman', 'Spearman, C. (1904). The proof and measurement of association between two things. <i>The American Journal of Psychology</i>, 15(1), 72–101.'),
    ('kendall', 'Kendall, M. G. (1938). A new measure of rank correlation. <i>Biometrika</i>, 30(1/2), 81–93.'),
    ('good', 'Good, P. (2005). <i>Permutation, Parametric, and Bootstrap Tests of Hypotheses</i> (3rd ed.). Springer.'),
    ('efron', 'Efron, B. (1979). Bootstrap methods: Another look at the jackknife. <i>The Annals of Statistics</i>, 7(1), 1–26.'),
    ('efrontib', 'Efron, B., &amp; Tibshirani, R. J. (1993). <i>An Introduction to the Bootstrap</i>. Chapman &amp; Hall.'),
    ('kunsch', 'Künsch, H. R. (1989). The jackknife and the bootstrap for general stationary observations. <i>The Annals of Statistics</i>, 17(3), 1217–1241.'),
    ('wilson', 'Wilson, E. B. (1927). Probable inference, the law of succession, and statistical inference. <i>Journal of the American Statistical Association</i>, 22(158), 209–212.'),
    ('holm', 'Holm, S. (1979). A simple sequentially rejective multiple test procedure. <i>Scandinavian Journal of Statistics</i>, 6(2), 65–70.'),
    ('hammersley', 'Hammersley, J. M., &amp; Morton, K. W. (1956). A new Monte Carlo technique: Antithetic variates. <i>Mathematical Proceedings of the Cambridge Philosophical Society</i>, 52(3), 449–475.'),
    ('glasserman', 'Glasserman, P. (2003). <i>Monte Carlo Methods in Financial Engineering</i>. Springer.'),
    ('brier', 'Brier, G. W. (1950). Verification of forecasts expressed in terms of probability. <i>Monthly Weather Review</i>, 78(1), 1–3.'),
    ('mann', 'Mann, H. B. (1945). Nonparametric tests against trend. <i>Econometrica</i>, 13(3), 245–259.'),
    ('petersen', 'Petersen, M. A. (2009). Estimating standard errors in finance panel data sets: Comparing approaches. <i>The Review of Financial Studies</i>, 22(1), 435–480.'),
    ('gelman', 'Gelman, A., &amp; Hill, J. (2007). <i>Data Analysis Using Regression and Multilevel/Hierarchical Models</i>. Cambridge University Press.'),
    ('nosek', 'Nosek, B. A., Ebersole, C. R., DeHaven, A. C., &amp; Mellor, D. T. (2018). The preregistration revolution. <i>Proceedings of the National Academy of Sciences</i>, 115(11), 2600–2606.'),
    ('bailey', 'Bailey, D. H., Borwein, J. M., López de Prado, M., &amp; Zhu, Q. J. (2014). Pseudo-mathematics and financial charlatanism: The effects of backtest overfitting on out-of-sample performance. <i>Notices of the American Mathematical Society</i>, 61(5), 458–471.'),
    ('lopez', 'López de Prado, M. (2018). <i>Advances in Financial Machine Learning</i>. Wiley.'),
    ('derman', 'Derman, E. (1996). Model risk. <i>Risk</i>, 9(5), 34–37.'),
]
NUM = {k: i + 1 for i, (k, _) in enumerate(REFS)}
def cite(*keys):
    return '<span class="cite">[' + ', '.join(f'<a href="#ref-{k}">{NUM[k]}</a>' for k in keys) + ']</span>'

# ---------- statistics ----------
def _rank(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); r = [0.0] * len(v); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and v[o[j + 1]] == v[o[i]]: j += 1
        for k in range(i, j + 1): r[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return r
def _pearson(a, b):
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    den = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return num / den if den else float('nan')
def _spearman(a, b): return _pearson(_rank(a), _rank(b))
def _kendall(a, b):
    n, s = len(a), 0
    for i in range(n):
        for j in range(i + 1, n): s += 1 if (a[i] - a[j]) * (b[i] - b[j]) > 0 else -1
    return s / (n * (n - 1) / 2)
def _sd(v): m = sum(v) / len(v); return math.sqrt(sum((x - m) ** 2 for x in v) / (len(v) - 1))
def stats(per_deck, B=10000, seed=1):
    sim = [d['wr'] for d in per_deck]; real = [d['real_wr'] for d in per_deck]
    rng = random.Random(seed); bs = []
    for _ in range(B):
        idx = [rng.randrange(len(sim)) for _ in sim]
        a = [sim[i] for i in idx]; b = [real[i] for i in idx]
        if len(set(a)) > 1 and len(set(b)) > 1: bs.append(_spearman(a, b))
    bs.sort()
    mx, my = sum(sim) / len(sim), sum(real) / len(real)
    slope = sum((x - mx) * (y - my) for x, y in zip(sim, real)) / sum((x - mx) ** 2 for x in sim)
    return {'n': len(sim), 'rho': _spearman(sim, real), 'lo': bs[int(.025 * len(bs))], 'hi': bs[int(.975 * len(bs)) - 1],
            'pearson': _pearson(sim, real), 'kendall': _kendall(sim, real), 'sd_sim': _sd(sim), 'sd_real': _sd(real),
            'mae': sum(abs(x - y) for x, y in zip(sim, real)) / len(sim), 'slope': slope, 'intercept': my - slope * mx}

# ---------- body ----------
def body(decks, runs, latest, dumbbell_svg, progress_svg, bench, matches):
    names = {d['id']: d['name'] for d in decks}
    plan = {d['id']: d for d in decks}
    pdk = latest['per_deck']
    S_all = stats(pdk); S_est = stats([d for d in pdk if d['real_n'] > 1000])
    sp = latest['spearman']
    first = latest['first_player_wr']; fci = latest['first_player_ci']
    gap = lambda d: (d['wr'] - d['real_wr']) * 100
    def group(key):
        g = {}
        for d in pdk: g.setdefault(plan[d['id']][key], []).append(gap(d))
        return g
    att, res = group('attack'), group('reserve')
    grp_rows = ''.join(f'<tr><td>Attack style: {esc(k)}</td><td>{len(v)}</td><td>{sum(v) / len(v):+.1f}</td><td>{esc(", ".join(names[d["id"]] for d in pdk if plan[d["id"]]["attack"] == k))}</td></tr>' for k, v in sorted(att.items(), key=lambda kv: -sum(kv[1]) / len(kv[1])))
    grp_rows += ''.join(f'<tr><td>Reserve energy: {k}</td><td>{len(v)}</td><td>{sum(v) / len(v):+.1f}</td><td>{esc(", ".join(names[d["id"]] for d in pdk if plan[d["id"]]["reserve"] == k))}</td></tr>' for k, v in sorted(res.items()))
    ver_rows = ''.join(f'<tr><td>{i + 1}</td><td><code>{c}</code></td><td>{esc(l)}</td><td>{r["spearman"]["all"]["rho"]:.2f}</td><td>{r["spearman"]["all"]["perm_p"]:.3f}</td><td>{r["spearman"]["n>1000"]["rho"]:.2f}</td><td>{r["spearman"]["n>1000"]["perm_p"]:.3f}</td><td>{r["first_player_wr"] * 100:.1f}%</td></tr>' for i, (c, l, r) in enumerate(runs))
    deck_rows = ''.join(
        f'<tr><td>{esc(names[d["id"]])}</td><td>{esc(plan[d["id"]]["arch"])}</td><td>{d["real_wr"] * 100:.0f}%</td><td>{d["real_n"]:,}</td><td>±{196 * math.sqrt(d["real_wr"] * (1 - d["real_wr"]) / d["real_n"]):.1f}</td>'
        f'<td>{d["wr"] * 100:.1f}%</td><td>[{d["ci"][0] * 100:.1f}, {d["ci"][1] * 100:.1f}]</td><td>{gap(d):+.0f}</td></tr>'
        for d in sorted(pdk, key=lambda d: -d['real_wr']))
    plan_rows = ''.join(f'<tr><td>{esc(d["name"])}</td><td>{esc(d["arch"])}</td><td>{esc(d["attack"])}</td><td>{d["reserve"]}</td><td>{d["sources"]}</td><td>{esc(d["conf"] or "n/a")}</td></tr>' for d in decks)
    smin = min(d['wr'] for d in pdk) * 100; smax = max(d['wr'] for d in pdk) * 100
    rmin = min(d['real_wr'] for d in pdk) * 100; rmax = max(d['real_wr'] for d in pdk) * 100
    toc = [('abstract', 'Abstract'), ('intro', '1. Introduction'), ('background', '2. Background and related work'), ('system', '3. System design'),
           ('method', '4. Methodology'), ('results', '5. Results'), ('discussion', '6. Discussion'), ('validity', '7. Threats to validity'),
           ('future', '8. Future work'), ('conclusion', '9. Conclusion'), ('references', 'References'), ('appendix', 'Appendices')]
    toc_html = '<nav class="toc"><b>Contents</b><ul>' + ''.join(f'<li><a href="#{a}">{t}</a></li>' for a, t in toc) + '</ul></nav>'
    refs_html = '<ol class="refs">' + ''.join(f'<li id="ref-{k}">{t}</li>' for k, t in REFS) + '</ol>'
    pc = lambda x: f'{x * 100:.1f}'
    return f'''
<article class="thesis">
<header class="titlepage">
<p class="kicker">Research report · working paper · October 2026</p>
<h1>Pricing a Card-Game Metagame with Monte Carlo Simulation</h1>
<p class="subtitle">Validating a rules-complete Riftbound simulator and heuristic AI against {matches:,} tournament matches</p>
<p class="author">napi2002 · <a href="https://github.com/napi2002/riftbound-sim-naps">github.com/napi2002/riftbound-sim-naps</a></p>
<div class="note"><b>Status.</b> All results in this report are <b>in-sample</b>: the AI was developed while its output was compared with the real data. They describe the model's current fit, not its predictive power. The confirmatory tests (Section 4.6) are pre-registered and will be run only on tournament data collected after the engine is frozen.</div>
</header>
{toc_html}

<section id="abstract"><h2>Abstract</h2>
<p class="abstract">Collectible card games produce metagames, populations of competing decks whose success depends on what everyone else plays, in a way that resembles a market of interacting assets. This report asks whether a Monte Carlo game simulator can price such a metagame: can a rules-complete engine with a heuristic AI rank decks the way real tournaments do, and can its pairwise matchups support forecasts of how the metagame moves? We implement the full rules of <i>Riftbound</i>, the League of Legends trading card game {cite('riot')}, parse 1,115 cards from their rules text, and attach to each of 15 tournament decks a game plan researched from pro sources. A seeded harness plays every pair of decks 2,000 times with mirrored seats ({latest["games"]:,} games) and compares the resulting win rates with {matches:,} matches from a public tournament database {cite('dotgg')}. In-sample, the simulated ranking agrees with the real one at Spearman ρ = {sp["all"]["rho"]:.2f} (permutation p = {sp["all"]["perm_p"]:.3f}; bootstrap 95% interval [{S_all["lo"]:.2f}, {S_all["hi"]:.2f}]). The dominant error is a <i>piloting gap</i>: simulated win rates are {S_all["sd_sim"] / S_all["sd_real"]:.1f} times more dispersed than real ones, aggressive decks are overrated by {sum(att.get("aggro", [0])) / max(1, len(att.get("aggro", [1]))):+.1f} points on average and reaction-heavy decks underrated by {sum(res.get(2, [0])) / max(1, len(res.get(2, [1]))):+.1f}, because part of every simulated number measures how well the AI pilots the deck. We describe the system, the pre-registered hypotheses (deck ranking, matchup prediction, replicator dynamics, exploitability and card attribution), the leakage controls borrowed from quantitative finance, and the model-development record that motivates freezing the engine before any out-of-sample test.</p>
<p class="keywords"><b>Keywords:</b> Monte Carlo simulation · collectible card games · game AI · metagame · rank correlation · replicator dynamics · Nash equilibrium · pre-registration · backtest overfitting · model risk</p>
</section>

<section id="intro"><h2>1. Introduction</h2>
<h3>1.1 Motivation</h3>
<p>Competitive card games are an unusually clean laboratory for questions that also arise in finance. A tournament metagame is a population of strategies (decks) whose payoffs depend on each other: a deck's win rate is its expected return against the current mix of opponents, the pairwise matchups form a payoff matrix, and players reallocate between decks as results come in, much as capital flows toward assets that have performed. The same three tasks that occupy a quantitative researcher appear here: <b>pricing</b> (what is each deck worth against the field?), <b>forecasting</b> (where will the field move next?) and <b>model validation</b> (can the pricing model be trusted outside the data it was built on?).</p>
<p>A simulator is attractive as a pricing model because real data are thin and lagging. A new card set changes the game overnight; real matchup data accumulate only over weeks, and most deck pairs are rarely observed. A simulator can, in principle, price any deck against any other on day one. The cost is model risk {cite('derman')}: the simulator is only as good as its rules implementation and, critically, its players.</p>
<h3>1.2 Research questions</h3>
<ol>
<li><b>RQ1 (pricing).</b> Does a simulator that plays both sides with the same heuristic AI rank decks in the same order as real tournament results?</li>
<li><b>RQ2 (structure).</b> Does the simulated matchup matrix carry information beyond a single strength number per deck?</li>
<li><b>RQ3 (dynamics).</b> Do real play shares move toward decks that the matchup matrix says beat the current field?</li>
<li><b>RQ4 (diagnosis).</b> Where the simulator is wrong, is the error random or does it have structure that points to its cause?</li>
</ol>
<h3>1.3 Contributions</h3>
<ul>
<li>A rules-complete, open-source Riftbound engine (JavaScript, no dependencies) with a rules-text parser, audited against the October 2026 Core Rules {cite('riot')} with regression tests.</li>
<li>A heuristic AI with per-deck game plans (mulligan, priorities, attack style, reactions to hold), researched from tournament reports and deck guides and stored as decision trees.</li>
<li>A deterministic, parallel simulation harness using antithetic seat pairs {cite('hammersley')} that runs about 1,450 games per second on four cores.</li>
<li>A data pipeline that archives public tournament statistics immutably with hashes, and a pre-registration of five hypotheses with explicit pass criteria {cite('nosek')}.</li>
<li>An in-sample analysis that identifies and quantifies the <i>piloting gap</i>, and a development record (Section 5.3) showing how single model changes move the whole ranking, the core argument for freezing before testing {cite('bailey', 'lopez')}.</li>
</ul>
<h3>1.4 Structure</h3>
<p>Section 2 reviews game AI, metagame theory, rating models and simulation methodology. Section 3 describes the system and Section 4 the methodology and hypotheses. Section 5 reports in-sample results, Section 6 discusses them, Section 7 lists threats to validity and Section 8 outlines the confirmatory programme.</p>
</section>

<section id="background"><h2>2. Background and related work</h2>
<h3>2.1 Riftbound</h3>
<p><i>Riftbound</i> is a two-player collectible card game published by Riot Games {cite('riot')}. Each player brings a legend, a chosen champion, a 40-card main deck, a 12-card rune deck and three battlefields, one of which is chosen at random for each player. Runes supply two resources: <i>energy</i> (by exhausting a rune) and <i>power</i> of a domain (by recycling it). Units are played to a player's base and moved to battlefields; a player scores by <i>conquering</i> a battlefield (taking control of it) and by <i>holding</i> it at the start of their turn. The first player to 8 points wins, with a special rule for the final point (Core Rules 473). Contested battlefields trigger a <i>showdown</i> in which players alternate playing Action and Reaction cards, Ambush units, face-down Hidden cards and legend abilities before combat damage is dealt. These features (hidden information, simultaneous resource and tempo decisions, interactive combat) place the game in the same family as Magic: The Gathering and Hearthstone.</p>
<h3>2.2 AI for collectible card games</h3>
<p>Monte Carlo methods {cite('metropolis')} dominate game-playing AI for games with large branching factors; Monte Carlo tree search (MCTS) is surveyed by Browne et al. {cite('browne')}. Card games add hidden information and stochastic draws, addressed by information-set MCTS {cite('ismcts')}. MCTS has been applied to card selection in Magic: The Gathering {cite('ward')} and to play in Hearthstone {cite('santos')}; Hoover et al. {cite('hoover')} review the many AI problems Hearthstone poses, including deck building and metagame modelling. Closest to this work, Fontaine et al. {cite('fontaine')} and de Mesentier Silva et al. {cite('silva')} use simulated play with fixed AI agents to map deck spaces and evolve metagames. A recurring observation in that line of work, and a central theme here, is that conclusions about decks are conditional on the agents that pilot them.</p>
<p>This project deliberately uses a fast heuristic policy rather than search. The research questions require hundreds of thousands of full games per model version; a heuristic that plays a game in under a millisecond makes properly powered experiments cheap, at the cost of play quality. Section 5.4 measures what that cost does to the results.</p>
<h3>2.3 Metagames as games</h3>
<p>With decks as pure strategies and the matchup matrix M (M<sub>ij</sub> = probability that deck i beats deck j) as payoffs, the metagame is a symmetric two-player constant-sum game. Its equilibrium mixed strategy exists by the minimax theorem {cite('neumann')} and can be computed by linear programming {cite('dantzig')}. Real metagames are rarely at equilibrium; the distance from it, measured as the gain available to the best response against the observed mix, is a natural measure of exploitability. Balduzzi et al. {cite('balduzzi')} argue that evaluation of agents (here, decks) against a population should account for this game-theoretic structure (Nash averaging) rather than average performance alone. Evolutionary game theory models how a population of strategies changes over time; the replicator dynamic {cite('taylor', 'hofbauer')} grows a strategy's share in proportion to its fitness advantage over the population mean, which is the basis of hypothesis H3.</p>
<h3>2.4 Rating models</h3>
<p>Paired-comparison models assign each competitor a latent strength. The Bradley–Terry model {cite('bt')} sets P(i beats j) = π<sub>i</sub> / (π<sub>i</sub> + π<sub>j</sub>); the Elo system {cite('elo')} and TrueSkill {cite('trueskill')} are its online and Bayesian relatives. A one-strength-per-deck model is the natural baseline for H2: if the simulator's full matrix cannot beat it, the simulator's matchup structure adds nothing. Hierarchical models {cite('gelman')} allow sparse real matchup data to be pooled toward a prior, here the simulator.</p>
<h3>2.5 Simulation methodology</h3>
<p>Two variance-reduction techniques from Monte Carlo practice are used. <i>Antithetic variates</i> {cite('hammersley')} pair each simulated game with a negatively correlated twin; playing the same seed with seats swapped cancels most of the first-player advantage. <i>Common random numbers</i> {cite('glasserman')} reuse the same seeds across model versions so that differences between versions are not drowned in sampling noise. Win-rate intervals use the Wilson score interval {cite('wilson')}.</p>
<h3>2.6 Overfitting, pre-registration and model risk</h3>
<p>Quantitative finance has documented how repeated testing of model variants against the same data produces backtests that do not survive out of sample {cite('bailey', 'lopez')}. The remedy adopted here is the one used in the empirical sciences: pre-register hypotheses, tests and pass criteria before seeing the evaluation data {cite('nosek')}, and evaluate on a time-based holdout. Derman's notion of model risk {cite('derman')} frames the piloting gap: a pricing model can be internally consistent yet systematically wrong because one of its components (here, the AI) is a poor stand-in for the real market participants.</p>
</section>

<section id="system"><h2>3. System design</h2>
<h3>3.1 Rules engine</h3>
<p>The engine (<code>src/engine.js</code>, about 3,400 lines) implements the turn structure of the Core Rules {cite('riot')}: awaken, score holds, channel two runes (three on the second player's first turn), draw, main phase and end of turn. It models resources, movement (including Ganking), showdowns, combat with Tank and Backline damage ordering, Hidden cards, Equipment, Deploy gear, tokens, burn-out and the final-point rule. All player decisions pass through a single asynchronous request interface (confirm, choose a target, choose an option), which the human interface answers by prompting and the AI answers automatically. This guarantees that the human and the AI play exactly the same game.</p>
<h3>3.2 Card parser and scripts</h3>
<p>Card data for 1,115 cards were merged from two public databases {cite('riftcodex', 'dotgg')}. Each card's rules text is split into abilities and parsed into typed effect operations (for example <code>deal</code>, <code>draw</code>, <code>stun</code>, <code>moveUnit</code>, <code>token</code>) with target selectors. Cards and legends whose text the generic parser cannot express receive hand-written scripts. For the 15 decks studied, every line of rules text is simulated except one (a single battlefield-dependent line on Baron Nashor).</p>
<h3>3.3 AI policy</h3>
<p>The AI is a one-ply heuristic player. It values each playable card from the evaluated effects of the card, plans attacks by comparing summed Might while respecting damage ordering, counts combat tricks held in hand when deciding whether an attack can win, and in a showdown plays a trick only when it changes the predicted outcome of the fight. It holds reactions and energy for the opponent's turn according to the deck plan, and chooses mulligans from the plan's keep and toss lists. Against simple baselines it wins {bench["random"]} of games against a uniformly random player and {bench["rush"]} against a rush bot that always attacks.</p>
<h3>3.4 Researched deck plans</h3>
<p>For each deck, a plan was researched from tournament coverage, deck techs and strategy guides, and stored (<code>src/guides.json</code>) as a summary, mulligan advice, a phase-by-phase plan, a per-turn yes/no decision tree, combat rules, cards to hold for the opponent's turn, matchup notes and sources with a confidence grade. The AI consumes the machine-readable part: card priorities, mulligan lists, reactions to hold, attack style (<i>aggro</i>: attack into even trades; <i>normal</i>: attack when winning on paper with one Might to spare; <i>safe</i>: require two Might spare while the opponent has energy available) and reserve energy. Table A3 lists the plans.</p>
<h3>3.5 Rules audit</h3>
<p>An audit against the official Core Rules (2026-10-09) found 21 discrepancies, of which the gameplay-relevant ones were fixed and covered by regression tests (<code>test/rules.js</code>): stun duration (rule 424.1.a.2), showdown order (345–347), the non-combat showdown when moving onto an empty battlefield (316.8.b.1, 348.2), cost and targeting of cards played face down (811.1.b, 811.1.d), Equipment recall (719.5), burn-out with an empty trash (432.3), combat-cleanup healing (468.1.a.1), mulligan order (115–117), Legion (812.1.b.1) and Ambush placement (822). Table A2 summarises them; the effect of the fixes on the results is visible in Section 5.3.</p>
<h3>3.6 Simulation harness</h3>
<p>The harness (<code>quant/harness.js</code>) plays a round robin of all 105 deck pairs. For each pair and each of N seeds it plays two games with the same seed and the decks' seats swapped. Randomness comes from a seeded 32-bit generator (mulberry32) injected into the engine, which has no other source of randomness and does not read the clock; two runs with the same seeds produce byte-identical game records. Games are distributed over worker processes. Each run writes one row per game (commit, seed, seats, winner, turns) and a JSON summary with per-deck Wilson intervals, the first-player rate and rank correlations with the real data.</p>
<h3>3.7 Data pipeline</h3>
<p>Real statistics come from the riftbound.gg meta snapshot {cite('dotgg')}: per-archetype win rates, match counts, tiers, card inclusion weights and a limited set of head-to-head matchups over a 30-day rolling window. The snapshot used here covers {matches:,} matches. <code>quant/snapshot.py</code> stores each response unchanged with a SHA-256 hash in an append-only manifest; <code>quant/tidy.py</code> derives deck, matchup and card tables, mapping archetype identifiers to the engine's decks. A scheduled workflow collects a snapshot every week, building the panel needed for H3 and H4.</p>
</section>

<section id="method"><h2>4. Methodology</h2>
<h3>4.1 Estimands</h3>
<p>For deck i, the <b>simulated field win rate</b> is its win rate against the other 14 decks with each opponent equally weighted, both seats included. The <b>real win rate</b> is the deck's win rate in the tournament database, which is measured against the field as it was actually played. The two differ in construction as well as in error: the real number weights opponents by their real play share. Section 7 returns to this.</p>
<h3>4.2 Simulation design and sample size</h3>
<p>With p near ½ the standard error of a pairing's win rate is about 0.5/√n. Holding each pairing to ±3 percentage points at 95% confidence requires n ≈ 1,100 games; the harness plays 2,000 per pairing (N = 1,000 seed pairs), so each deck's field win rate rests on 28,000 games and has a 95% interval of roughly ±0.6 points:</p>
<p class="formula">n ≥ (z<sub>0.975</sub> · 0.5 / ε)² = (1.96 · 0.5 / 0.03)² ≈ 1,067</p>
<p>Mirrored seeds act as antithetic pairs {cite('hammersley')}; the same seed list is used for every model version (common random numbers {cite('glasserman')}). The first-player advantage is estimated separately and treated as a nuisance parameter.</p>
<h3>4.3 Agreement measures</h3>
<p>The primary agreement measure is Spearman's rank correlation ρ {cite('spearman')} between simulated and real win rates, with Kendall's τ {cite('kendall')} and Pearson's r reported for robustness. Significance is assessed by a two-sided permutation test {cite('good')} (20,000 random relabellings of the real win rates) and uncertainty by a nonparametric bootstrap over decks {cite('efron', 'efrontib')}. Results are given for all 15 decks and for the 10 <i>established</i> decks with more than 1,000 real matches, whose real win rates have standard errors below one point.</p>
<h3>4.4 Hypotheses</h3>
<p>Five primary hypotheses were fixed in advance (<code>quant/PREREGISTRATION.md</code>).</p>
<div class="tablewrap"><table><caption>Table 1. Pre-registered hypotheses.</caption>
<tr><th>ID</th><th>Hypothesis (alternative)</th><th>Null</th><th>Test</th><th>Pass criterion</th></tr>
<tr><td>H1</td><td>A frozen simulator ranks deck strength like real win rates on unseen data.</td><td>ρ ≤ 0</td><td>Spearman ρ, permutation p, bootstrap CI {cite('spearman', 'good', 'efron')}</td><td>ρ ≥ 0.5 on established decks, CI lower bound &gt; 0</td></tr>
<tr><td>H2</td><td>The simulated matchup matrix predicts real head-to-head results better than one strength per deck.</td><td>Simulator log-loss ≥ Bradley–Terry</td><td>Match-weighted log-loss and Brier score {cite('brier')}; paired bootstrap; Bradley–Terry baseline {cite('bt')}</td><td>Improvement with 95% CI above 0</td></tr>
<tr><td>H3</td><td>Decks that beat the current field gain play share (replicator dynamics).</td><td>β = 0</td><td>Panel regression with deck fixed effects and clustered errors {cite('petersen')}; walk-forward against a random walk</td><td>β &gt; 0 (p &lt; 0.05) and lower out-of-sample MAE</td></tr>
<tr><td>H4</td><td>The observed metagame is exploitable, and less so as a set ages.</td><td>No trend</td><td>Equilibrium by linear programming {cite('neumann', 'dantzig')}; Mann–Kendall trend test {cite('mann')}</td><td>Negative slope, p &lt; 0.05</td></tr>
<tr><td>H5</td><td>Card value from simulator ablation agrees with what pros play.</td><td>ρ ≤ 0</td><td>Replace each card with a vanilla card of equal cost, ≥ 2,000 games; correlate Δwin with inclusion rate</td><td>ρ &gt; 0, CI lower bound &gt; 0</td></tr>
</table></div>
<p>For H3, the field fitness of deck i in week t and the share-change regression are</p>
<p class="formula">f<sub>i</sub>(t) = Σ<sub>j</sub> s<sub>j</sub>(t) M<sub>ij</sub>, &nbsp;&nbsp; Δs<sub>i</sub>(t+1) = α<sub>i</sub> + β · (f<sub>i</sub>(t) − f̄(t)) + ε<sub>i,t</sub></p>
<p>where s<sub>j</sub>(t) is deck j's share of play and f̄(t) = Σ<sub>i</sub> s<sub>i</sub>(t) f<sub>i</sub>(t) is the population mean fitness, the discrete analogue of the replicator equation {cite('taylor')}. For H4, exploitability of the observed mix s is</p>
<p class="formula">expl(s) = max<sub>i</sub> (M s)<sub>i</sub> − sᵀ M s</p>
<p>which is zero exactly when no single deck does better against the field than the field does against itself.</p>
<h3>4.5 Multiple testing</h3>
<p>The family-wise error rate across the five primary tests is held at 5% with Holm's step-down procedure {cite('holm')}. Everything outside Table 1, including all of Section 5, is exploratory.</p>
<h3>4.6 Holdout and leakage controls</h3>
<ul>
<li><b>Engine freeze.</b> A commit is tagged before the holdout opens; no AI or card changes are permitted for the confirmatory tests.</li>
<li><b>Time-based holdout.</b> Only snapshots whose window starts after the freeze are scored.</li>
<li><b>Point-in-time features.</b> Weekly features use only snapshots fetched on or before that week; raw responses are never overwritten.</li>
<li><b>Overlapping windows.</b> Consecutive weekly snapshots of a 30-day window share matches, so tests that need independent observations use non-overlapping snapshots or a block bootstrap {cite('kunsch')}.</li>
<li><b>Survivorship.</b> Decks that leave the snapshot remain in the panel with share zero.</li>
</ul>
</section>

<section id="results"><h2>5. Results (in-sample, exploratory)</h2>
<h3>5.1 Engine and harness validation</h3>
<ul>
<li><b>Determinism.</b> The same seed reproduces identical game logs; full result files from runs with different worker counts are byte-identical.</li>
<li><b>Coverage and stability.</b> All rules text of the 15 decks is simulated except one line; smoke tests of AI-vs-AI games finish with no crashes and no unfinished games, and the battlefield and rules regression suites pass.</li>
<li><b>Throughput.</b> The latest run played {latest["games"]:,} games in {latest["seconds"]:.0f} s ({latest["games"] / latest["seconds"]:,.0f} games/s) on four cores, with a mean game length of about 13.6 turns and no draws.</li>
<li><b>First-player advantage.</b> The first player won {pc(first)}% of games (95% CI [{pc(fci[0])}, {pc(fci[1])}]), a material edge that the mirrored design removes from the deck comparisons.</li>
<li><b>Baselines.</b> The AI beats a random player in {bench["random"]} and a rush bot in {bench["rush"]} of games, and itself in {bench["self"]} as player 0.</li>
</ul>
<h3>5.2 Deck ranking</h3>
<div class="chart">{dumbbell_svg}<div class="cap"><b>Figure 1.</b> Simulated field win rate (orange; {latest["games"]:,} games, engine <code>{latest["commit"]}</code>) against real tournament win rate (grey; {matches:,} matches {cite('dotgg')}), sorted by the simulation's error. The number on the right is the simulated minus real win rate in percentage points.</div></div>
<div class="tablewrap"><table><caption>Table 2. Agreement between simulated and real win rates.</caption>
<tr><th>Measure</th><th>All decks (n = {S_all["n"]})</th><th>Established decks (n = {S_est["n"]})</th></tr>
<tr><td>Spearman ρ</td><td>{S_all["rho"]:.3f}</td><td>{S_est["rho"]:.3f}</td></tr>
<tr><td>Permutation p (two-sided)</td><td>{sp["all"]["perm_p"]:.3f}</td><td>{sp["n>1000"]["perm_p"]:.3f}</td></tr>
<tr><td>Bootstrap 95% interval for ρ</td><td>[{S_all["lo"]:.2f}, {S_all["hi"]:.2f}]</td><td>[{S_est["lo"]:.2f}, {S_est["hi"]:.2f}]</td></tr>
<tr><td>Kendall τ</td><td>{S_all["kendall"]:.3f}</td><td>{S_est["kendall"]:.3f}</td></tr>
<tr><td>Pearson r</td><td>{S_all["pearson"]:.3f}</td><td>{S_est["pearson"]:.3f}</td></tr>
<tr><td>Mean absolute error (points)</td><td>{S_all["mae"] * 100:.1f}</td><td>{S_est["mae"] * 100:.1f}</td></tr>
<tr><td>Dispersion ratio sd(sim) / sd(real)</td><td>{S_all["sd_sim"] / S_all["sd_real"]:.2f}</td><td>{S_est["sd_sim"] / S_est["sd_real"]:.2f}</td></tr>
<tr><td>Calibration slope (real on sim)</td><td>{S_all["slope"]:.3f}</td><td>{S_est["slope"]:.3f}</td></tr>
</table></div>
<p>Across all 15 decks the simulated ranking is positively and significantly associated with the real one (ρ = {S_all["rho"]:.2f}, p = {sp["all"]["perm_p"]:.3f}), but the bootstrap interval [{S_all["lo"]:.2f}, {S_all["hi"]:.2f}] shows how little 15 points can pin down. On the 10 established decks the point estimate is similar (ρ = {S_est["rho"]:.2f}) but not significant; the real win rates of these decks lie within a narrow band ({min(d["real_wr"] for d in pdk if d["real_n"] > 1000) * 100:.0f}–{max(d["real_wr"] for d in pdk if d["real_n"] > 1000) * 100:.0f}%), so small simulated errors reorder them easily. The level of agreement is far weaker than the ordering: the mean absolute error is {S_all["mae"] * 100:.0f} points and the calibration slope of {S_all["slope"]:.2f} means a 10-point difference in simulated win rate corresponds to about {S_all["slope"] * 10:.0f} points in reality.</p>
<h3>5.3 Model development record</h3>
<div class="chart">{progress_svg}<div class="cap"><b>Figure 2.</b> Rank correlation with real win rates after each model change (each point a full {latest["games"]:,}-game run with the same seeds).</div></div>
<div class="tablewrap"><table><caption>Table 3. Engine versions and their in-sample fit.</caption>
<tr><th>#</th><th>Commit</th><th>Change</th><th>ρ (all)</th><th>p</th><th>ρ (est.)</th><th>p</th><th>First player</th></tr>{ver_rows}</table></div>
<p>The record makes the overfitting risk concrete. A change aimed at two decks (teaching the AI to use Irelia's and Akali's combat tricks) improved those decks by seven to nine points but moved others too and <i>lowered</i> the established-deck correlation from 0.63 to 0.47. Loading the researched plans raised the all-deck correlation from 0.41 to 0.57; correcting the rules, which is unambiguously right, lowered it slightly. A researcher who kept only changes that raised ρ would select for fit to this snapshot rather than for a better model {cite('bailey')}, which is why the confirmatory tests use a frozen engine and new data.</p>
<h3>5.4 The piloting gap</h3>
<p>The simulator's errors are not random. Simulated win rates range from {smin:.0f}% to {smax:.0f}%, real ones from {rmin:.0f}% to {rmax:.0f}%: the simulated spread is {S_all["sd_sim"] / S_all["sd_real"]:.1f} times wider. Grouping the errors by the AI plan of each deck shows a clear pattern (Table 4).</p>
<div class="tablewrap"><table><caption>Table 4. Mean simulation error (simulated − real, percentage points) by AI plan setting. n is small; descriptive only.</caption>
<tr><th>Group</th><th>Decks</th><th>Mean error</th><th>Members</th></tr>{grp_rows}</table></div>
<p>Decks the AI plays aggressively are overrated and decks whose plans keep energy open for reactions are underrated. The interpretation is that the simulated win rate of a deck measures the product of deck strength and how well the shared heuristic AI can pilot it. Proactive plans, which mostly require playing the best card and attacking, suit a one-ply heuristic; reactive plans depend on reading the opponent, sequencing tricks and timing, which the heuristic does poorly. Because both sides of every simulated game are played by the same AI, the gap does not cancel: a reactive deck facing an AI-piloted aggressive deck faces an opponent that plays close to its ceiling while it plays below its own. This is a textbook case of model risk {cite('derman')} and matches the agent-dependence noted in Hearthstone metagame studies {cite('fontaine', 'silva')}.</p>
</section>

<section id="discussion"><h2>6. Discussion</h2>
<p><b>What the simulator gets right.</b> With no access to the real results during play, a fast heuristic engine recovers a significant part of the real ordering of decks. Three of the four strongest real decks (Riven, Kennen, Rengar) are simulated above 50%, and the weakest real decks with small samples (Orianna, Seraphine) are simulated well below it. The notable exception is Irelia, the most-played deck and fourth-strongest in reality, which the simulator places in the bottom third; its plan relies on reactive combat timing (Section 5.4).</p>
<p><b>What it gets wrong, and why it matters.</b> As a pricing model, the simulator is badly calibrated: it exaggerates every difference between decks, and how much it exaggerates depends on play style. For RQ1 the answer is a qualified yes on ordering; for RQ4 the error has a clear, interpretable structure. For a quantitative researcher the second finding is the more useful one: a structured error can be modelled. A simple correction is to treat the simulator as a prior and shrink it toward real data with a hierarchical model {cite('gelman')}, the "blend" model proposed for H2; another is to estimate a piloting term per plan style and remove it.</p>
<p><b>Implications for the confirmatory tests.</b> H1's threshold (ρ ≥ 0.5 on established decks with a positive lower bound) is demanding given Table 2: the in-sample point estimate sits near the threshold and its interval includes zero. A failure of H1 would therefore not be surprising and would itself be informative about how much of the metagame a heuristic agent can capture. H2 is likely to be limited by data rather than by the model, since the free snapshot exposes only about two head-to-head pairings per deck.</p>
</section>

<section id="validity"><h2>7. Threats to validity</h2>
<div class="tablewrap"><table><caption>Table 5. Threats to validity and mitigations.</caption>
<tr><th>Type</th><th>Threat</th><th>Mitigation</th></tr>
<tr><td>Internal</td><td>AI skill differs by deck (Section 5.4), so simulated win rates confound deck and pilot.</td><td>Report by plan style; repeat H1 with weaker and stronger AI variants; treat the gap as measured model error.</td></tr>
<tr><td>Internal</td><td>Remaining rules simplifications: combat damage is assigned automatically, and only counterspells can respond to spells outside showdowns.</td><td>Documented in the audit; regression tests for every fixed rule; ablation of the remaining differences planned.</td></tr>
<tr><td>Construct</td><td>Simulated win rates are against a uniform field of 15 decks; real win rates are against the actual field mix, which includes 42 other archetypes.</td><td>Re-weight simulated matchups by real play shares (f<sub>i</sub> in Section 4.4) once share data are tidy; report both.</td></tr>
<tr><td>External</td><td>Real win rates mix deck strength with pilot skill and deck choice (strong players choose strong decks).</td><td>Separate all-events and top-cut data; control for event type.</td></tr>
<tr><td>Statistical</td><td>Only 15 decks: rank statistics have wide intervals (Table 2).</td><td>Bootstrap intervals; rely on H2, which scores thousands of matches.</td></tr>
<tr><td>Statistical</td><td>Small real samples for new decks (143–709 matches; standard errors up to 4 points).</td><td>Established-deck subset; inverse-variance weighting in sensitivity analyses.</td></tr>
<tr><td>Overfitting</td><td>Model changes were evaluated against the same snapshot (Section 5.3).</td><td>Pre-registration, engine freeze and time-based holdout {cite('nosek', 'bailey')}.</td></tr>
<tr><td>Data</td><td>The source is an unofficial third-party API that may change.</td><td>Raw responses archived with hashes; analysis runs from the archive.</td></tr>
</table></div>
</section>

<section id="future"><h2>8. Future work</h2>
<ol>
<li><b>Freeze and collect.</b> Tag the engine, open the holdout and accumulate weekly snapshots for at least 12 weeks.</li>
<li><b>Confirmatory tests.</b> Run H1–H5 exactly as pre-registered, with Holm correction {cite('holm')}, and report failures as results.</li>
<li><b>Field-share weighting.</b> Price each deck against the real field mix rather than a uniform field.</li>
<li><b>Stronger agents.</b> Replace the showdown heuristic with information-set MCTS {cite('ismcts')} on a budget, and measure how the piloting gap and ρ change with agent strength.</li>
<li><b>Equilibrium analysis.</b> Compute the simulator's Nash equilibrium and Nash-averaged deck values {cite('balduzzi')}, and compare them with the real distribution of play.</li>
</ol>
</section>

<section id="conclusion"><h2>9. Conclusion</h2>
<p>A rules-complete simulator with a fast heuristic AI recovers a statistically significant part of the real ranking of Riftbound decks (ρ = {S_all["rho"]:.2f} in-sample) but prices them poorly: its win rates are {S_all["sd_sim"] / S_all["sd_real"]:.1f} times too dispersed, and the error is explained largely by how well the shared AI can pilot each deck's plan. The development record shows that every model change moves the whole ranking, so in-sample fit is a weak guide to model quality. The contribution of this work is the infrastructure (engine, AI, deterministic harness, immutable data pipeline and pre-registration) that turns these observations into testable claims, and a clear diagnosis of the main model risk to test them against.</p>
</section>

<section id="references"><h2>References</h2>{refs_html}</section>

<section id="appendix"><h2>Appendices</h2>
<h3>Appendix A1. Per-deck results</h3>
<div class="tablewrap"><table><caption>Table A1. Real and simulated win rates. Real 95% margin from the binomial standard error; simulated interval is Wilson {cite('wilson')} over 28,000 games.</caption>
<tr><th>Deck</th><th>Archetype</th><th>Real</th><th>Matches</th><th>±95%</th><th>Simulated</th><th>95% CI</th><th>Error</th></tr>{deck_rows}</table></div>
<h3>Appendix A2. Rules corrected after the Core Rules audit</h3>
<div class="tablewrap"><table><caption>Table A2. Corrections, with Core Rules references {cite('riot')}.</caption>
<tr><th>Area</th><th>Before</th><th>After</th><th>Rule</th></tr>
<tr><td>Stun</td><td>Lasted into the next turn</td><td>Ends at the end of the turn it was applied</td><td>424.1.a.2</td></tr>
<tr><td>Showdown order</td><td>Defender acted first, max 6 actions</td><td>Contesting player first; alternate until both pass</td><td>345–347</td></tr>
<tr><td>Empty battlefield</td><td>Conquered immediately</td><td>Non-combat showdown first; opponent may respond</td><td>316.8.b.1, 348.2</td></tr>
<tr><td>Face-down cards</td><td>Power cost still paid; any target</td><td>No cost; targets only at that battlefield</td><td>811.1.b, 811.1.d</td></tr>
<tr><td>Equipment</td><td>Trashed with its unit</td><td>Detaches and returns to base</td><td>719.5, 459.1</td></tr>
<tr><td>Burn-out</td><td>No point if the trash was empty</td><td>Opponent scores every time</td><td>432.3</td></tr>
<tr><td>Combat cleanup</td><td>Survivors kept damage</td><td>All survivors healed</td><td>468.1.a.1</td></tr>
<tr><td>Mulligan</td><td>Before turn order</td><td>After turn order, in turn order; random return order</td><td>115–117, 417.5</td></tr>
<tr><td>Legion</td><td>Counted the opponent's cards</td><td>Counts only your own</td><td>812.1.b.1</td></tr>
<tr><td>Ambush</td><td>Any battlefield in a showdown</td><td>Only where you have units</td><td>822</td></tr>
</table></div>
<h3>Appendix A3. Deck plans used by the AI</h3>
<div class="tablewrap"><table><caption>Table A3. Researched plans: archetype, AI attack style, reserve energy, number of sources and research confidence.</caption>
<tr><th>Deck</th><th>Archetype</th><th>Attack</th><th>Reserve</th><th>Sources</th><th>Confidence</th></tr>{plan_rows}</table></div>
<h3>Appendix A4. Reproducibility</h3>
<pre>git clone https://github.com/napi2002/riftbound-sim-naps
cd riftbound-sim-naps
node test/rules.js &amp;&amp; node test/battlefields.js &amp;&amp; node test/sim.js 30
node quant/harness.js --pairs-per-matchup 1000      # reproduces Figure 1 and Table A1
node quant/harness.js --check-determinism 20
python3 tools/build_site.py                         # rebuilds this report from quant/data/sim/</pre>
<p>Each simulation summary in <code>quant/data/sim/</code> records the engine commit; the raw tournament snapshot and its SHA-256 hash are in <code>quant/data/raw/</code> and <code>quant/data/manifest.csv</code>.</p>
</section>
</article>
'''
