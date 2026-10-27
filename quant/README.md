# quant: does the simulator predict the real meta?

Step 0 of a research project that tests the engine in `src/engine.js` against real tournament results.
The hypotheses, tests and holdout rule are fixed in [PREREGISTRATION.md](PREREGISTRATION.md).

| File | What it does |
|---|---|
| `snapshot.py` | Fetches dotgg's meta snapshot (30-day rolling window) and saves it unchanged as `data/raw/<UTC time>_metasnapshot.json`, never overwriting. Appends fetch time, file, sha256, snapshot_id, window and match count to `data/manifest.csv`. `--getdecks-rq '<json>'` also saves a raw `getdecks` response. |
| `tidy.py` | Parses all raw snapshots into `data/tidy/deck_week.csv`, `matchup_week.csv` and `card_week.csv`, mapping archetype slugs to engine deck ids (`SLUG_TO_ENGINE`; the rest become `other` and are counted). |
| `harness.js` | Seeded, mirrored round robin: every deck pair plays A-vs-B and B-vs-A with the same seed (mulberry32 passed as `opts.rnd`). Writes one row per game to `data/sim/<engine sha>_<N>.csv` plus a `_summary.json`, and prints per-deck win rates with Wilson CIs, first-player win rate and Spearman vs the embedded real win rates. |
| `../.github/workflows/snapshot.yml` | Runs `snapshot.py` every Monday 06:17 UTC (default branch only) or on demand, and commits new files. |

```sh
python3 quant/snapshot.py                         # once a week (CI does this)
python3 quant/tidy.py                             # rebuild tidy CSVs (gitignored)
node quant/harness.js --pairs-per-matchup 1000    # ~2.5 min on 4 cores; CSV is gitignored
node quant/harness.js --check-determinism 20      # same seed twice -> identical game logs
```

Raw snapshots and the manifest are the source of truth and are committed. Tidy and sim CSVs are derived
and can be rebuilt; the sim summary JSON is small and is committed.
