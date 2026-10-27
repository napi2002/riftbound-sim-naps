"""Pre-registered analysis of H1-H5 (quant/PREREGISTRATION.md). Python standard library only.

Reads the frozen engine's simulation results (quant/freeze.json -> summary + ablation JSON) and the tidy real
data (quant/data/tidy/*.csv, built by quant/tidy.py), and writes quant/results/<mode>.json and .md.

  python3 quant/analysis.py                 # confirmatory: only holdout snapshots (window start >= freeze)
  python3 quant/analysis.py --exploratory   # same code on all snapshots, labelled exploratory (no Holm)

A test that lacks the data it needs is reported as "insufficient data" (never as a pass or a failure).
"""
import argparse, csv, json, math, os, random, datetime
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
B_PERM, B_BOOT = 20000, 10000

# ---------------------------------------------------------------- statistics
def rank(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); r = [0.0] * len(v); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and v[o[j + 1]] == v[o[i]]: j += 1
        for k in range(i, j + 1): r[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return r

def pearson(a, b):
    n = len(a); ma, mb = sum(a) / n, sum(b) / n
    sab = sum((x - ma) * (y - mb) for x, y in zip(a, b)); sa = sum((x - ma) ** 2 for x in a); sb = sum((y - mb) ** 2 for y in b)
    return sab / math.sqrt(sa * sb) if sa > 0 and sb > 0 else float('nan')

def spearman(a, b): return pearson(rank(a), rank(b))

def perm_p_greater(a, b, stat, B=B_PERM, seed=1):
    """One-sided permutation p-value for stat(a, b) >= observed, permuting b."""
    rng = random.Random(seed); obs = stat(a, b); b2 = list(b); hits = 0
    for _ in range(B):
        rng.shuffle(b2)
        if stat(a, b2) >= obs - 1e-12: hits += 1
    return (hits + 1) / (B + 1)

def bootstrap_ci(n, fn, B=B_BOOT, seed=2, alpha=0.05):
    rng = random.Random(seed); vals = []
    for _ in range(B):
        v = fn([rng.randrange(n) for _ in range(n)])
        if v == v: vals.append(v)
    vals.sort()
    return (vals[int(alpha / 2 * len(vals))], vals[min(len(vals) - 1, int((1 - alpha / 2) * len(vals)))]) if vals else (float('nan'), float('nan'))

def norm_sf(z): return 0.5 * math.erfc(z / math.sqrt(2))

def betacf(a, b, x):
    qab, qap, qam = a + b, a + 1, a - 1; c, d = 1.0, 1 - qab * x / qap
    d = 1 / (d if abs(d) > 1e-300 else 1e-300); h = d
    for m in range(1, 300):
        m2 = 2 * m; aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d; d = 1 / (d if abs(d) > 1e-300 else 1e-300); c = 1 + aa / c if abs(c) > 1e-300 else 1e300; h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d; d = 1 / (d if abs(d) > 1e-300 else 1e-300); c = 1 + aa / c if abs(c) > 1e-300 else 1e300; dl = d * c; h *= dl
        if abs(dl - 1) < 1e-12: break
    return h

def betainc(a, b, x):
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    lb = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log(1 - x)
    return math.exp(lb) * betacf(a, b, x) / a if x < (a + 1) / (a + b + 2) else 1 - math.exp(lb) * betacf(b, a, 1 - x) / b

def t_sf(t, df):
    """P(T > t) for Student's t with df degrees of freedom."""
    x = df / (df + t * t); p = 0.5 * betainc(df / 2, 0.5, x)
    return p if t > 0 else 1 - p

def mann_kendall(x):
    """Mann-Kendall S, variance (with ties) and one-sided p for a negative trend."""
    n = len(x); s = sum((1 if x[j] > x[i] else -1 if x[j] < x[i] else 0) for i in range(n) for j in range(i + 1, n))
    ties = defaultdict(int)
    for v in x: ties[v] += 1
    var = (n * (n - 1) * (2 * n + 5) - sum(t * (t - 1) * (2 * t + 5) for t in ties.values())) / 18
    z = (s + 1) / math.sqrt(var) if s < 0 else (s - 1) / math.sqrt(var) if s > 0 else 0.0
    return s, var, z, 1 - norm_sf(z)   # p for H1: S < 0 (decreasing)

def holm(pvals):
    """Holm step-down adjusted p-values for a dict name -> p (None = no test)."""
    items = sorted([(p, k) for k, p in pvals.items() if p is not None]); m = len(pvals); adj = {}; run = 0.0
    for i, (p, k) in enumerate(items):
        run = max(run, min(1.0, (m - i) * p)); adj[k] = run
    return adj

def simplex_max(c, A, b):
    """maximise c.x subject to A x <= b, x >= 0, b >= 0 (dense tableau, Bland's rule)."""
    m, n = len(A), len(c)
    T = [list(A[i]) + [1.0 if j == i else 0.0 for j in range(m)] + [b[i]] for i in range(m)] + [[-v for v in c] + [0.0] * m + [0.0]]
    basis = [n + i for i in range(m)]
    for _ in range(10000):
        col = next((j for j in range(n + m) if T[-1][j] < -1e-12), None)
        if col is None: break
        rows = [(T[i][-1] / T[i][col], i) for i in range(m) if T[i][col] > 1e-12]
        if not rows: raise ValueError('unbounded')
        _, r = min(rows, key=lambda t: (t[0], basis[t[1]]))
        pv = T[r][col]; T[r] = [v / pv for v in T[r]]
        for i in range(m + 1):
            if i != r and abs(T[i][col]) > 0: f = T[i][col]; T[i] = [a - f * bb for a, bb in zip(T[i], T[r])]
        basis[r] = col
    x = [0.0] * n
    for i, j in enumerate(basis):
        if j < n: x[j] = T[i][-1]
    return x, T[-1][-1]

def nash(M):
    """Maximin mixed strategy of the row player for win-probability matrix M (zero-sum on M - 0.5) by LP."""
    # Column player's LP on the positive payoff matrix A = M - 0.5 + shift: max sum y s.t. A y <= 1. In a symmetric
    # constant-sum game (M_ij + M_ji = 1) the column player's optimal mix is also the row player's.
    k = len(M); shift = 1.0
    P = [[M[i][j] - 0.5 + shift for j in range(k)] for i in range(k)]
    y, val = simplex_max([1.0] * k, P, [1.0] * k)
    tot = sum(y); x = [v / tot for v in y]
    return x, 1 / tot - shift + 0.5

# ---------------------------------------------------------------- data
def read_csv(name):
    p = os.path.join(DATA, 'tidy', name)
    return list(csv.DictReader(open(p))) if os.path.exists(p) else []

def load(exploratory):
    freeze = json.load(open(os.path.join(HERE, 'freeze.json')))
    summ = json.load(open(os.path.join(HERE, freeze['sim_summary'])))
    abl = json.load(open(os.path.join(HERE, freeze['ablation']))) if freeze.get('ablation') and os.path.exists(os.path.join(HERE, freeze['ablation'])) else None
    decks = read_csv('deck_week.csv'); mus = read_csv('matchup_week.csv'); cards = read_csv('card_week.csv')
    snaps = {}
    for r in decks:
        snaps.setdefault(r['snapshot_id'], {'id': r['snapshot_id'], 'from': int(r['window_from_unix']), 'to': int(r['window_to_unix']), 'set': r['set_code'], 'fetched': r['fetched_at']})
    order = sorted(snaps.values(), key=lambda s: (s['to'], s['id']))
    hold = [s for s in order if s['from'] >= freeze['freeze_ts']]
    use = order if exploratory else hold
    return freeze, summ, abl, decks, mus, cards, order, hold, use

def non_overlapping(snaps):
    """Greedy subset of snapshots whose 30-day windows don't overlap (so no match is counted twice)."""
    out, last_to = [], -1
    for s in snaps:
        if s['from'] >= last_to: out.append(s); last_to = s['to']
    return out

def sim_matrix(summ, ids):
    m = summ['matrix']
    return {a: {b: (m[a][b]['w'] + 1) / (m[a][b]['n'] + 2) for b in ids if b != a} for a in ids}   # Beta(1,1) shrinkage

# ---------------------------------------------------------------- hypotheses
def h1(summ, decks, snap):
    if not snap: return {'status': 'insufficient data', 'why': 'no holdout snapshot yet'}
    sim = {d['id']: d['wr'] for d in summ['per_deck']}
    rows = [r for r in decks if r['snapshot_id'] == snap['id'] and r['engine_id'] in sim and int(r['n']) > 1000]
    if len(rows) < 5: return {'status': 'insufficient data', 'why': f'{len(rows)} established decks in snapshot {snap["id"]}'}
    a = [sim[r['engine_id']] for r in rows]; b = [float(r['winrate']) for r in rows]
    rho = spearman(a, b); p = perm_p_greater(a, b, spearman)
    lo, hi = bootstrap_ci(len(a), lambda ix: spearman([a[i] for i in ix], [b[i] for i in ix]))
    return {'status': 'tested', 'snapshot': snap['id'], 'decks': len(a), 'rho': rho, 'p': p, 'ci95': [lo, hi],
            'threshold_met': rho >= 0.5 and lo > 0, 'per_deck': {r['engine_id']: [sim[r['engine_id']], float(r['winrate']), int(r['n'])] for r in rows}}

def fit_bt(decks, mus, snap_ids, ids):
    """Bradley-Terry strengths from real data in the given snapshots: matchup cells between mapped decks plus each
    deck's overall record against a virtual 'field' opponent of strength 1 (minorisation-maximisation)."""
    comps = []   # (i, j, wins_i, n)
    for r in mus:
        if r['snapshot_id'] in snap_ids and r['engine_id'] in ids and r['opp_engine_id'] in ids:
            n = int(r['n']); comps.append((r['engine_id'], r['opp_engine_id'], float(r['winrate']) * n, n))
    for r in decks:
        if r['snapshot_id'] in snap_ids and r['engine_id'] in ids:
            n = int(r['n']); comps.append((r['engine_id'], 'FIELD', float(r['winrate']) * n, n))
    s = {i: 1.0 for i in ids}; s['FIELD'] = 1.0
    for _ in range(500):
        new = {}
        for i in ids:
            w = sum(c[2] for c in comps if c[0] == i) + sum(c[3] - c[2] for c in comps if c[1] == i)
            den = sum(c[3] / (s[c[0]] + s[c[1]]) for c in comps if i in (c[0], c[1]))
            new[i] = max(w, 1e-6) / den if den else s[i]
        new['FIELD'] = 1.0; s = new
    return s

def h2(summ, decks, mus, freeze, order, use):
    ids = [d['id'] for d in summ['per_deck']]; S = sim_matrix(summ, ids)
    use_ids = {s['id'] for s in non_overlapping(use)}
    cells = [r for r in mus if r['snapshot_id'] in use_ids and r['engine_id'] in ids and r['opp_engine_id'] in ids and int(r['n']) >= 30]
    if len(cells) < 20: return {'status': 'insufficient data', 'why': f'{len(cells)} matchup cells with n >= 30 between mapped decks (20 required)'}
    pre = {s['id'] for s in order if s['to'] < freeze['freeze_ts']} or {s['id'] for s in order}
    bt = fit_bt(decks, mus, pre, ids)
    def ll(p, wr): p = min(max(p, 1e-6), 1 - 1e-6); return -(wr * math.log(p) + (1 - wr) * math.log(1 - p))
    rows = []
    for r in cells:
        a, b, wr, n = r['engine_id'], r['opp_engine_id'], float(r['winrate']), int(r['n'])
        pb = bt[a] / (bt[a] + bt[b]); ps = S[a][b]
        rows.append((n, ll(pb, wr) - ll(ps, wr), (pb - wr) ** 2 - (ps - wr) ** 2, ll(pb, wr), ll(ps, wr)))
    imp = lambda ix: sum(rows[i][0] * rows[i][1] for i in ix) / sum(rows[i][0] for i in ix)
    obs = imp(range(len(rows))); lo, hi = bootstrap_ci(len(rows), imp)
    rng = random.Random(3); bs = [imp([rng.randrange(len(rows)) for _ in rows]) for _ in range(B_BOOT)]
    p = (sum(1 for v in bs if v <= 0) + 1) / (B_BOOT + 1)
    W = sum(r[0] for r in rows)
    return {'status': 'tested', 'cells': len(rows), 'logloss_bt': sum(r[0] * r[3] for r in rows) / W, 'logloss_sim': sum(r[0] * r[4] for r in rows) / W,
            'improvement': obs, 'ci95': [lo, hi], 'p': p, 'brier_improvement': sum(r[0] * r[2] for r in rows) / W, 'threshold_met': lo > 0}

def shares(decks, snap_id, ids):
    rows = {r['engine_id']: float(r['share']) for r in decks if r['snapshot_id'] == snap_id and r['engine_id'] in ids}
    tot = sum(rows.values())
    return {i: rows.get(i, 0.0) / tot for i in ids} if tot > 0 else None

def h3(summ, decks, use):
    ids = [d['id'] for d in summ['per_deck']]; S = sim_matrix(summ, ids)
    sh = [(s, shares(decks, s['id'], ids)) for s in use]; sh = [x for x in sh if x[1]]
    if len(sh) < 6: return {'status': 'insufficient data', 'why': f'{len(sh)} weekly snapshots (6 needed for the panel, 8+ for the walk-forward test)'}
    def fit(rows):   # rows: (deck, x, y); deck fixed effects by demeaning; beta and alpha_d
        by = defaultdict(list)
        for d, x, y in rows: by[d].append((x, y))
        xs, ys, gs = [], [], []
        for d, v in by.items():
            mx = sum(a for a, _ in v) / len(v); my = sum(b for _, b in v) / len(v)
            for a, b in v: xs.append(a - mx); ys.append(b - my); gs.append(d)
        sxx = sum(x * x for x in xs); beta = sum(x * y for x, y in zip(xs, ys)) / sxx if sxx else 0.0
        alpha = {d: sum(b for _, b in v) / len(v) - beta * sum(a for a, _ in v) / len(v) for d, v in by.items()}
        res = defaultdict(float)
        for x, y, g in zip(xs, ys, gs): res[g] += x * (y - beta * x)
        G = len(by); n = len(xs); k = 1 + G
        se = math.sqrt(G / (G - 1) * (n - 1) / max(1, n - k) * sum(v * v for v in res.values())) / sxx if sxx and G > 1 else float('nan')
        return beta, alpha, se, G
    rows = []
    for (s0, a), (s1, b) in zip(sh, sh[1:]):
        # field fitness: expected win rate against the current mix of the other mapped decks
        fit_ = {i: sum(a[o] * S[i][o] for o in ids if o != i) / max(1e-9, sum(a[o] for o in ids if o != i)) for i in ids}
        fbar = sum(a[i] * fit_[i] for i in ids)
        for i in ids: rows.append((i, fit_[i] - fbar, b[i] - a[i], s1['id']))
    beta, alpha, se, G = fit([(d, x, y) for d, x, y, _ in rows])
    t = beta / se if se == se and se > 0 else float('nan'); p = t_sf(t, G - 1) if t == t else None
    out = {'status': 'tested', 'steps': len(sh) - 1, 'beta': beta, 'se_cluster': se, 't': t, 'p': p}
    steps = sorted({r[3] for r in rows}, key=lambda sid: [s['id'] for s, _ in sh].index(sid))
    if len(steps) >= 7:
        diffs = []
        for k in range(4, len(steps)):
            train = [r for r in rows if r[3] in steps[:k]]; test = [r for r in rows if r[3] == steps[k]]
            b2, a2, _, _ = fit([(d, x, y) for d, x, y, _ in train])
            e_m = sum(abs(y - (a2.get(d, 0) + b2 * x)) for d, x, y, _ in test) / len(test); e_rw = sum(abs(y) for _, _, y, _ in test) / len(test)
            diffs.append(e_rw - e_m)
        md = sum(diffs) / len(diffs); sd = math.sqrt(sum((d - md) ** 2 for d in diffs) / (len(diffs) - 1)) if len(diffs) > 1 else float('nan')
        out['walk_forward'] = {'weeks': len(diffs), 'mae_gain_vs_random_walk': md, 'dm_p': norm_sf(md / (sd / math.sqrt(len(diffs)))) if sd and sd == sd else None}
        out['threshold_met'] = beta > 0 and md > 0 and (out['walk_forward']['dm_p'] or 1) < 0.05
    else:
        out['walk_forward'] = 'insufficient data (fewer than 7 weekly steps)'; out['threshold_met'] = False
    return out

def h4(summ, decks, mus, use):
    ids = [d['id'] for d in summ['per_deck']]
    if not use: return {'status': 'insufficient data', 'why': 'no snapshots'}
    sets = defaultdict(list)
    for s in use: sets[s['set']].append(s)
    set_code, snaps = max(sets.items(), key=lambda kv: len(kv[1]))
    series = []
    for s in non_overlapping(snaps):
        bt = fit_bt(decks, mus, {s['id']}, ids)
        real = {(r['engine_id'], r['opp_engine_id']): float(r['winrate']) for r in mus if r['snapshot_id'] == s['id'] and r['engine_id'] in ids and r['opp_engine_id'] in ids}
        M = [[0.5 if a == b else (real.get((a, b), bt[a] / (bt[a] + bt[b])) + (1 - real.get((b, a), bt[b] / (bt[a] + bt[b])))) / 2 for b in ids] for a in ids]
        sv = shares(decks, s['id'], ids)
        if not sv: continue
        x = [sv[i] for i in ids]; Mx = [sum(M[i][j] * x[j] for j in range(len(ids))) for i in range(len(ids))]
        eq, val = nash(M)
        series.append({'snapshot': s['id'], 'exploitability': max(Mx) - sum(x[i] * Mx[i] for i in range(len(ids))), 'nash_value': val,
                       'filled_cells': sum(1 for a in ids for b in ids if a != b and (a, b) not in real), 'nash_support': {ids[i]: round(eq[i], 3) for i in range(len(ids)) if eq[i] > 1e-3}})
    if len(series) < 4: return {'status': 'insufficient data', 'why': f'{len(series)} non-overlapping snapshots in set {set_code} (4 needed)', 'series': series}
    s_, var, z, p = mann_kendall([v['exploitability'] for v in series])
    return {'status': 'tested', 'set': set_code, 'points': len(series), 'mk_s': s_, 'z': z, 'p': p, 'threshold_met': s_ < 0, 'series': series}

def h5(abl, cards, snap):
    if not abl: return {'status': 'insufficient data', 'why': 'no ablation results for the frozen engine'}
    if not snap: return {'status': 'insufficient data', 'why': 'no holdout snapshot yet'}
    norm = lambda n: ''.join(ch for ch in n.lower() if ch.isalnum())
    wt = {(r['engine_id'], norm(r['card_name'])): float(r['weight']) for r in cards if r['snapshot_id'] == snap['id']}
    pairs = [(r['deck'], r['delta'], wt[(r['deck'], norm(r['card']))]) for r in abl['rows'] if (r['deck'], norm(r['card'])) in wt]
    if len(pairs) < 30: return {'status': 'insufficient data', 'why': f'{len(pairs)} (deck, card) pairs with inclusion data'}
    a = [p[1] for p in pairs]; b = [p[2] for p in pairs]
    rho = spearman(a, b); p = perm_p_greater(a, b, spearman)
    groups = defaultdict(list)
    for i, pr in enumerate(pairs): groups[pr[0]].append(i)
    keys = sorted(groups); rng = random.Random(4); bs = []
    for _ in range(B_BOOT):
        ix = [i for g in (keys[rng.randrange(len(keys))] for _ in keys) for i in groups[g]]
        v = spearman([a[i] for i in ix], [b[i] for i in ix])
        if v == v: bs.append(v)
    bs.sort(); lo, hi = bs[int(.025 * len(bs))], bs[int(.975 * len(bs)) - 1]
    return {'status': 'tested', 'snapshot': snap['id'], 'pairs': len(pairs), 'decks': len(keys), 'rho': rho, 'p': p, 'ci95': [lo, hi], 'threshold_met': rho > 0 and lo > 0}

# ---------------------------------------------------------------- report
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--exploratory', action='store_true'); a = ap.parse_args()
    freeze, summ, abl, decks, mus, cards, order, hold, use = load(a.exploratory)
    first = use[0] if use else None
    if not a.exploratory:   # H1/H5: first holdout snapshot whose window lies entirely after the freeze
        first = next((s for s in hold if s['from'] >= freeze['freeze_ts']), None)
    R = {'H1': h1(summ, decks, first), 'H2': h2(summ, decks, mus, freeze, order, use), 'H3': h3(summ, decks, use),
         'H4': h4(summ, decks, mus, use), 'H5': h5(abl, cards, first)}
    adj = holm({k: (v.get('p') if v.get('status') == 'tested' else None) for k, v in R.items()}) if not a.exploratory else {}
    for k, v in R.items():
        if v.get('status') == 'tested' and not a.exploratory:
            v['p_holm'] = adj.get(k); v['pass'] = bool(v.get('threshold_met')) and v['p_holm'] is not None and v['p_holm'] < 0.05
    mode = 'exploratory' if a.exploratory else 'confirmatory'
    meta = {'mode': mode, 'run_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'engine': freeze['commit'], 'freeze_tag': freeze['tag'],
            'freeze_date': freeze['freeze_date'], 'snapshots_total': len(order), 'snapshots_holdout': len(hold), 'snapshots_used': [s['id'] for s in use]}
    os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
    json.dump({'meta': meta, 'results': R}, open(os.path.join(HERE, 'results', mode + '.json'), 'w'), indent=1, default=str)
    f = lambda x: f'{x:.3f}' if isinstance(x, float) else str(x)
    lines = [f'# {mode.capitalize()} results', '', f'Run {meta["run_at"]} · engine `{meta["engine"]}` ({meta["freeze_tag"]}, frozen {meta["freeze_date"]}) · '
             f'{len(order)} snapshot(s), {len(hold)} in the holdout' + (' · **exploratory: uses pre-freeze data, not Holm-corrected**' if a.exploratory else ''), '',
             '| Hypothesis | Status | Effect | p | Holm p | 95% CI | Pass |', '|---|---|---|---|---|---|---|']
    names = {'H1': 'H1 deck ranking (Spearman ρ)', 'H2': 'H2 matchups vs Bradley–Terry (log-loss gain)', 'H3': 'H3 replicator dynamics (β)', 'H4': 'H4 exploitability trend (MK S)', 'H5': 'H5 card ablation vs inclusion (ρ)'}
    eff = {'H1': 'rho', 'H2': 'improvement', 'H3': 'beta', 'H4': 'mk_s', 'H5': 'rho'}
    for k, v in R.items():
        if v['status'] != 'tested': lines.append(f'| {names[k]} | {v["status"]}: {v.get("why", "")} | | | | | |'); continue
        ci = v.get('ci95'); lines.append(f'| {names[k]} | tested | {f(v.get(eff[k]))} | {f(v.get("p"))} | {f(v.get("p_holm", "—"))} | {"[" + f(ci[0]) + ", " + f(ci[1]) + "]" if ci else "—"} | {"✓" if v.get("pass") else "✗" if not a.exploratory else "—"} |')
    open(os.path.join(HERE, 'results', mode + '.md'), 'w').write('\n'.join(lines) + '\n')
    print('\n'.join(lines))

if __name__ == '__main__':
    main()
