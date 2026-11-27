# Simulated tier list, Nov 27 2026 (post-ban decks, AI level 8)

Every deck against every other deck: 23 current tournament lists (Nov 23 2026 ban list applied), 40 games per matchup with seats mirrored and shared seeds, 10,120 games, AI level 8.

Since the previous run (same day):
- **Ornn's and Kai'Sa's legends now work.** Each adds 1 power per turn for gear (Ornn) or spells (Kai'Sa). The bot used to fire them at the end of its turn with nothing to pay for, so the power was wasted. They are now used automatically when paying, like a Seal, and Equip costs count as gear for Ornn. Ornn 33.6% -> 51.6%, Kai'Sa 53.3% -> 72.3%.
- **Azir** now uses the MFG's $2k Top 8 list (Nov 22: Soul Sword, Charm, Orianna). It scored +3.6 points vs the field over the LDXP Sacramento list. The card counts come from riftbound.zone's listing.
- **Azir, Sovereign:** the attack planner counts the tokens he calls in. No measurable change.
- **Temporal Breach / Rockfall Path:** units can't be played to Rockfall Path, so a unit banished there stays banished. The bot uses this as removal.

Tiers by average win rate vs the whole field: S 65%+, A 55-65%, B 45-55%, C 38-45%, D under 38%. Real win rates are riftbound.gg's 14 days to 2026-11-15, which is before the bans.

| Tier | Deck | Sim WR | 95% CI | Real WR (pre-ban) | Real matches |
|---|---|---|---|---|---|
| S | volibear | 77.2% | 74.3-79.8% | 36% | 151 |
| S | kaisa | 72.3% | 69.2-75.1% | 52% | 4914 |
| S | evelynn | 71.4% | 68.3-74.3% | 38% | 394 |
| S | settkingpin | 71.4% | 68.3-74.3% | 52% | 309 |
| S | rengar | 69.0% | 65.8-71.9% | 49% | 1390 |
| S | fiora | 66.9% | 63.8-70.0% | 45% | 159 |
| A | masteryi | 61.0% | 57.8-64.2% | 51% | 1135 |
| A | leblanc | 60.8% | 57.5-64.0% | 46% | 707 |
| A | sett | 58.1% | 54.8-61.3% | 52% | 309 |
| A | vex | 55.1% | 51.8-58.4% | 50% | 864 |
| B | nasus | 54.3% | 51.0-57.6% | 42% | 195 |
| B | ornn | 51.6% | 48.3-54.9% | 43% | 500 |
| B | mordekaiser | 46.0% | 42.8-49.3% | 34% | 262 |
| C | kennen | 44.9% | 41.6-48.2% | 55% | 3704 |
| C | reksai | 42.8% | 39.6-46.1% | 53% | 1002 |
| C | azir | 40.3% | 37.1-43.6% | 45% | 493 |
| C | riven | 38.1% | 34.9-41.3% | 58% | 6437 |
| D | orianna | 36.3% | 33.1-39.5% | 36% | 268 |
| D | irelia | 31.9% | 28.9-35.1% | 45% | 827 |
| D | seraphine | 29.3% | 26.4-32.4% | 37% | 137 |
| D | jayce | 26.6% | 23.8-29.6% | 56% | 986 |
| D | ezreal | 24.1% | 21.4-27.0% | 40% | 139 |
| D | akali | 20.7% | 18.1-23.5% | 41% | 733 |

Known bias (quant/results/ai_eval_2026-11.md): the sim overrates unit-heavy decks and underrates tempo and spell decks, so rank agreement with real results is weak.
