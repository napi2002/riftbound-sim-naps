# Pre-registration: does the Riftbound simulator predict the real meta?

Status: **frozen 2026-10-27 11:59:47 UTC.** Written 2026-10-27, before any holdout data exists.
Once the engine is frozen, the fields below are filled in, this file is committed, and from then on it is
changed only by appending dated amendments at the bottom (never by editing the sections above them).

| Field | Value |
|---|---|
| Engine freeze marker | branch `engine-freeze-v1` (the git proxy refused tag pushes; the commit hash below is the authoritative identifier) |
| Freeze commit | `e4157fd0a5c5f0563cc85a3aed31a3fa7bcc73c6` (engine, AI, deck lists, `quant/harness.js`, `quant/ablation.js`, `quant/analysis.py`) |
| Freeze date (UTC) | 2026-10-27T11:59:47Z (`FREEZE_TS` = 1793102387) |
| Holdout start | first snapshot with `sample.from >= FREEZE_TS` |
| Simulation budget | N = 1,000 seed pairs per matchup (210,000 games, `quant/harness.js`, seed base 20261027); H5 ablation 72 seed pairs per opponent (2,016 games per deck-card condition, `quant/ablation.js`) |
| Machine-readable | `quant/freeze.json` (read by `quant/analysis.py`) |

## Data

- Real: weekly fetches of `getmetasnapshot` (dotgg, Riftbound), saved unchanged in `quant/data/raw/` with a
  sha256 manifest (`quant/data/manifest.csv`), parsed by `quant/tidy.py`. Each snapshot is a 30-day rolling
  window, so consecutive snapshots overlap; tests that need independent observations use snapshots whose
  windows do not overlap (every 5th weekly snapshot) or block bootstraps over weeks, as stated per test.
- Sim: `quant/harness.js` round robin at the frozen engine: per-deck win rate (field = the 15 engine decks,
  uniform weights unless a test says otherwise) and the 15x15 matchup matrix.
- Deck identity: archetype slug -> engine deck via `SLUG_TO_ENGINE` in `quant/tidy.py`. Unmapped archetypes
  are "other" and excluded from deck-level tests (their share is reported).

## Holdout rule

Only snapshots with `sample.from >= FREEZE_TS` are confirmatory. Everything fitted or looked at earlier
(including the REAL table embedded in `src/engine.js`, the deck game plans tuned against it, and all
pre-freeze snapshots) is in-sample. No engine, AI, deck list or analysis-code change after the freeze may be
used for confirmatory results; a changed engine needs a new tag and a new holdout start.

## Primary hypotheses

Five primary tests, Holm-Bonferroni across them at family-wise alpha = 0.05. A hypothesis "passes" only if
its Holm-adjusted test rejects **and** its practical threshold is met.

### H1: sim ranks deck strength like the real meta
- Population: established decks = mapped engine decks with real n > 1000 in the holdout snapshot used.
- Statistic: Spearman rho between simulated win rate (vs the 15-deck field) and real win rate, using the
  first holdout snapshot whose window lies entirely after the freeze.
- H0: rho <= 0. Test: one-sided permutation test (20,000 permutations).
- Pass: rho >= 0.5, bootstrap (resample decks, 10,000) 95% CI lower bound > 0, Holm-adjusted p < 0.05.

### H2: the simulated matchup matrix beats a one-strength-per-deck model
- Data: holdout real matchup records (deck, opp, wins, n) between mapped decks.
- Model S: P(A beats B) = simulated matchup win rate (seat-averaged, shrunk toward 0.5 with a Beta(1,1) prior).
- Baseline BT: Bradley-Terry with one strength per deck, fitted on pre-freeze real data only.
- Statistic: match-weighted log-loss(BT) - log-loss(S) on holdout matches.
- H0: improvement <= 0. Test: paired bootstrap over matchup cells (10,000).
- Pass: 95% CI of the improvement entirely above 0, Holm-adjusted p < 0.05. Brier score and a calibration
  plot (deciles) are reported as secondary.
- Known risk: the free snapshot lists only ~2 matchups per archetype; if fewer than 20 holdout cells with
  n >= 30 exist by the analysis date, H2 is reported as "insufficient data", not as a failure.

### H3: share moves toward simulated fitness
- Model: share_{d,t+1} - share_{d,t} = beta * (fitness_{d,t} - mean fitness_t) + alpha_d + e, where
  fitness_{d,t} = sum_o share_{o,t} * simWR(d vs o) over mapped decks (shares renormalised over mapped decks).
- Weekly steps; standard errors clustered by deck.
- H0: beta <= 0. Pass: beta > 0 with Holm-adjusted one-sided p < 0.05 **and** walk-forward out-of-sample
  MAE of next-week share lower than the random walk (share_{t+1} = share_t), Diebold-Mariano style paired test.

### H4: the real meta becomes less exploitable within a set
- Payoff matrix: real matchup win rates for mapped decks (missing cells filled by the BT model, recorded).
- Statistic: exploitability of the real share vector = max over pure decks of the payoff against the field
  minus the Nash value (Nash by LP on the zero-sum matrix M - 0.5).
- Series: one value per non-overlapping snapshot within one set (set_code constant).
- H0: no monotone trend. Test: Mann-Kendall. Pass: negative trend, Holm-adjusted p < 0.05.

### H5: cards the sim says matter are the cards pros play
- Sim: card ablation delta-win = WR(deck) - WR(deck with all copies of card c replaced by a basic filler),
  per (deck, card), measured with mirrored seeds.
- Real: inclusion rate of card c in that archetype (`card_week.csv` weight) from the holdout snapshot.
- Statistic: Spearman rho over (deck, card) pairs. H0: rho <= 0.
- Pass: rho > 0, bootstrap (resample decks as clusters) 95% CI lower bound > 0, Holm-adjusted p < 0.05.

## What is exploratory

Everything not listed above: all pre-freeze comparisons (including the Spearman printed by `harness.js`
against the embedded REAL table), first-player advantage, turn counts, per-deck residuals, alternative
fields/weights, other similarity measures, subsets of decks, and any test run after looking at holdout data
that is not specified here. Exploratory results are labelled as such and are not Holm-corrected.

## Reporting

All five primary results are reported whether they pass or not, with effect sizes, CIs, raw and
Holm-adjusted p-values, the snapshot_ids and manifest sha256 used, and the engine commit.

## Specification details fixed at the freeze

Written at the freeze, before any holdout data existed; they make the tests above executable exactly as coded in
`quant/analysis.py` at the freeze commit.

- **Snapshots used.** H1 and H5 use the first holdout snapshot (window start >= `FREEZE_TS`). H2 and H4 use the
  greedy subset of holdout snapshots whose 30-day windows do not overlap, so no match is counted twice. H3 uses
  every weekly holdout snapshot.
- **H1.** One-sided permutation p (20,000 permutations of the real win rates, fixed RNG); at least 5 established
  decks are required.
- **H2.** Bradley-Terry baseline: one strength per mapped deck, fitted by minorisation-maximisation on pre-freeze
  real data, combining the listed matchup cells between mapped decks with each deck's overall record against a
  virtual "field" opponent of fixed strength 1 (the free snapshot lists too few cells to fit BT on cells alone).
  Simulator probabilities are (wins + 1) / (games + 2). The p-value is the share of 10,000 bootstrap improvements
  that are <= 0.
- **H3.** Shares are renormalised over mapped decks; field fitness excludes the deck itself; deck fixed effects by
  within-deck demeaning; cluster-robust standard error by deck (CR1) with a t reference on G - 1 degrees of freedom.
  At least 6 weekly snapshots are required. Walk-forward: start after 4 steps, refit each week, compare
  next-week MAE with the random walk (no change), one-sided Diebold-Mariano-style z test on weekly loss differences;
  it needs at least 7 steps.
- **H4.** Real matchup cells are symmetrised as (M_ab + 1 - M_ba) / 2; missing cells are filled from the snapshot's
  own BT fit and counted. Nash equilibrium by an exact simplex LP on M - 0.5. At least 4 non-overlapping
  snapshots in one set are required.
- **H5.** "Basic filler" = a blank copy of the card (same cost, type, domains and Might, no rules text;
  `RT.blankCard`); delta-win is measured on the same seeds as the unmodified deck. Inclusion rate = the
  `card_week.csv` weight for that archetype; at least 30 (deck, card) pairs are required. Cluster bootstrap over
  decks (10,000).
- **Holm.** m = 5: a hypothesis reported as "insufficient data" keeps its place in the family (treated as p = 1),
  which can only make the correction more conservative.

## Amendments

1. **2026-10-27, before any holdout data.** `quant/ablation.js` at the freeze commit exited each worker process
   before its result message was delivered, so the first ablation run failed with "worker exit 0". The fix
   (`process.send(out, () => process.exit(0))`) changes only how results are passed back; games, seeds,
   conditions and the measurement are unchanged, and `src/` (engine, AI, cards) is untouched. The baseline
   ablation was run with the fixed script on the frozen engine and is labelled with the engine commit `e4157fd`.
2. **2026-10-28, before any holdout data.** `parseDeckText` in `src/engine.js` (text deck import in the game UI)
   now also strips a trailing card code in square brackets, e.g. `3 Ruined Rex [UNL-067]`. It is not called during
   games; 120 seeded games give an identical fingerprint before and after the change, and the rules tests pass.
   Simulated rules, AI and card data are unchanged, so results labelled `e4157fd` remain the frozen baseline.
