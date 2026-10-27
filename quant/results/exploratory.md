# Exploratory results

Run 2026-10-27T12:32Z · engine `e4157fd` (engine-freeze-v1, frozen 2026-10-27T11:59:47Z) · 1 snapshot(s), 0 in the holdout · **exploratory: uses pre-freeze data, not Holm-corrected**

| Hypothesis | Status | Effect | p | Holm p | 95% CI | Pass |
|---|---|---|---|---|---|---|
| H1 deck ranking (Spearman ρ) | tested | 0.566 | 0.045 | — | [-0.157, 0.949] | — |
| H2 matchups vs Bradley–Terry (log-loss gain) | insufficient data: 16 matchup cells with n >= 30 between mapped decks (20 required) | | | | | |
| H3 replicator dynamics (β) | insufficient data: 1 weekly snapshots (6 needed for the panel, 8+ for the walk-forward test) | | | | | |
| H4 exploitability trend (MK S) | insufficient data: 1 non-overlapping snapshots in set RAD (4 needed) | | | | | |
| H5 card ablation vs inclusion (ρ) | tested | 0.043 | 0.304 | — | [-0.112, 0.190] | — |
