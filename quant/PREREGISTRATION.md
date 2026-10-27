# Pre-registration: does the Riftbound simulator predict the real meta?

Status: **draft, not yet frozen.** Written 2026-10-27, before any holdout data exists.
Once the engine is frozen, the fields below are filled in, this file is committed, and from then on it is
changed only by appending dated amendments at the bottom (never by editing the sections above them).

| Field | Value |
|---|---|
| Engine freeze tag | `engine-freeze-v1` (TBD: created after the pending AI fix) |
| Freeze commit | TBD |
| Freeze date (UTC) | TBD (`FREEZE_TS`, unix seconds) |
| Holdout start | first snapshot with `sample.from >= FREEZE_TS` |
| Simulation budget | N = TBD seed pairs per matchup (mirrored, `quant/harness.js`), fixed before the first holdout snapshot is looked at |

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

## Amendments

(none yet)
