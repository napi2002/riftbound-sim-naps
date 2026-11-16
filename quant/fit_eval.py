"""Fit the learned position evaluation (AI level 4) from self-play data (quant/train_eval.js output).

Logistic regression of "this player wins" on RT.evalFeatures, L2-regularised, fitted by Newton/IRLS on
standardised features. Every 5th game is held out. Compares against the hand-set level-3 score (calibrated with a
one-feature logistic fit) on the held-out games, then writes the model into src/engine.js (between the
EVAL_MODEL_START/END markers) and a report to quant/results/eval_model.json.
Usage: python3 quant/fit_eval.py data.jsonl [more.jsonl ...] [--no-write] [--lambda 1.0]
"""
import json, math, sys, pathlib, re
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
NAMES = ['ptsDiff', 'myPts2', 'oppPts2', 'bfDiff', 'boardValDiff', 'bfMightDiff', 'unitDiff', 'handDiff', 'runeDiff',
         'energyGearDiff', 'gearDiff', 'goldDiff', 'buffDiff', 'xpDiff', 'hiddenDiff', 'deckDiff', 'champDiff']

def load(paths):
    X, y, g = [], [], []
    for p in paths:
        for k, line in enumerate(open(p)):
            r = json.loads(line)
            X.append(r['x']); y.append(r['y']); g.append(hash((p, r['g'])) if len(paths) > 1 else r['g'])
    return np.array(X, float), np.array(y, float), np.array(g)

def fit(X, y, lam=1.0, iters=30):
    n, d = X.shape
    A = np.hstack([np.ones((n, 1)), X]); w = np.zeros(d + 1)
    R = lam * np.eye(d + 1); R[0, 0] = 0
    for _ in range(iters):
        z = A @ w; p = 1 / (1 + np.exp(-z))
        g = A.T @ (p - y) + R @ w
        H = (A * (p * (1 - p))[:, None]).T @ A + R
        step = np.linalg.solve(H, g); w -= step
        if np.abs(step).max() < 1e-8: break
    return w

def predict(w, X): return 1 / (1 + np.exp(-(w[0] + X @ w[1:])))
def logloss(p, y): p = np.clip(p, 1e-9, 1 - 1e-9); return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
def auc(p, y):
    o = np.argsort(p); r = np.empty(len(p)); r[o] = np.arange(1, len(p) + 1)
    pos = y == 1; n1, n0 = pos.sum(), (~pos).sum()
    return float((r[pos].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))

def hand_score(X):
    # the level-3 hand-set score expressed in these features (12 pts, 3 bf, unit value, +0.5 per unit at a battlefield ~ bfMight proxy, hand, 0.8 runes/energy gear, 0.4 gear)
    i = {n: k for k, n in enumerate(NAMES)}
    return 12 * X[:, i['ptsDiff']] + 3 * X[:, i['bfDiff']] + X[:, i['boardValDiff']] + X[:, i['handDiff']] + 0.8 * X[:, i['runeDiff']] + 0.8 * X[:, i['energyGearDiff']] + 0.4 * X[:, i['gearDiff']]

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    lam = float(sys.argv[sys.argv.index('--lambda') + 1]) if '--lambda' in sys.argv else 1.0
    if '--lambda' in sys.argv: args.remove(str(sys.argv[sys.argv.index('--lambda') + 1])) if str(sys.argv[sys.argv.index('--lambda') + 1]) in args else None
    X, y, g = load(args)
    test = (np.abs(g.astype(np.int64)) % 5) == 0
    mu, sd = X[~test].mean(0), X[~test].std(0); sd[sd == 0] = 1
    Z = (X - mu) / sd
    w = fit(Z[~test], y[~test], lam)
    pt = predict(w, Z[test])
    hs = hand_score(X); hsd = hs[~test].std() or 1
    wh = fit((hs[~test] / hsd)[:, None], y[~test], 0.0)
    ph = predict(wh, (hs[test] / hsd)[:, None])
    base = np.full(test.sum(), y[~test].mean())
    rep = {'positions': int(len(y)), 'train': int((~test).sum()), 'test': int(test.sum()), 'lambda': lam,
           'test_logloss': {'learned': logloss(pt, y[test]), 'hand_set_level3': logloss(ph, y[test]), 'no_information': logloss(base, y[test])},
           'test_auc': {'learned': auc(pt, y[test]), 'hand_set_level3': auc(ph, y[test])},
           'test_accuracy': {'learned': float(((pt > .5) == (y[test] == 1)).mean()), 'hand_set_level3': float(((ph > .5) == (y[test] == 1)).mean())}}
    raw = w[1:] / sd; b = float(w[0] - (w[1:] * mu / sd).sum())
    rep['coefficients_standardised'] = {n: round(float(c), 4) for n, c in zip(NAMES, w[1:])}
    rep['coefficients_raw'] = {n: round(float(c), 5) for n, c in zip(NAMES, raw)}
    rep['intercept_raw'] = round(b, 5)
    print(json.dumps({k: v for k, v in rep.items() if not k.startswith('coefficients')}, indent=1))
    for n, c in sorted(rep['coefficients_standardised'].items(), key=lambda x: -abs(x[1])): print('  %-15s %+.3f' % (n, c))
    if '--no-write' in sys.argv: return
    model = {'names': NAMES, 'b': rep['intercept_raw'], 'w': [rep['coefficients_raw'][n] for n in NAMES]}
    eng = ROOT / 'src' / 'engine.js'; s = eng.read_text()
    s = re.sub(r'(// EVAL_MODEL_START\n).*?(\n  // EVAL_MODEL_END)', lambda m: m.group(1) + '  var EVAL_MODEL = ' + json.dumps(model, separators=(',', ':')) + ';' + m.group(2), s, flags=re.S)
    eng.write_text(s)
    (ROOT / 'quant' / 'results' / 'eval_model.json').write_text(json.dumps(rep, indent=1) + '\n')
    print('model written to src/engine.js and quant/results/eval_model.json')

if __name__ == '__main__': main()
